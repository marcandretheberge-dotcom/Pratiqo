import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { measureRenderedComponents } from "./yoppo-component-metrics";
import {
  YOPPO_ARTBOARD_CONTRACT,
  YOPPO_COMPONENT_TOLERANCES,
  YOPPO_OVERLAY_ACCEPTANCE,
} from "@/lib/companion/yoppoRigContract";

type ComponentName = keyof typeof YOPPO_COMPONENT_TOLERANCES;
type Bounds = { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
type CanonicalRegion = {
  valid: boolean;
  touchesRoiEdge: Record<string, boolean>;
  artboardBounds: Bounds;
  artboardCentroid: { x: number; y: number };
};
type GeometryAudit = { valid: boolean; regions: Record<ComponentName, CanonicalRegion> };
type ComponentMetric = {
  centroidDistancePx: number | null; widthRelError: number | null; heightRelError: number | null;
  rendered: ReturnType<typeof measureRenderedComponents>["components"][ComponentName];
  canonical: { bounds: Bounds; centroid: { x: number; y: number } };
  tolerance: { centroidMaxPx: number; widthRelMax: number; heightRelMax: number }; pass: boolean;
};

async function main() {
const renderedPath = process.argv[2] ?? "/tmp/yoppo-master-neutral.png";
const geometryPath = process.argv[3] ?? "/tmp/yoppo-canonical-geometry.json";
const referencePath = "public/companion/travel/companion-travel-idle.png";
const provenancePath = process.argv[4];
const outputDir = process.argv[5] ?? "/tmp/yoppo-master-evidence";

if (!fs.existsSync(geometryPath)) {
  throw new Error("Canonical geometry audit is required before overlay comparison: " + geometryPath);
}

const geometry = JSON.parse(fs.readFileSync(geometryPath, "utf8")) as GeometryAudit;
if (geometry.valid !== true) {
  throw new Error("Canonical geometry audit is invalid; comparison is prohibited");
}
const regions = Object.entries(geometry.regions ?? {});
if (regions.length !== Object.keys(YOPPO_COMPONENT_TOLERANCES).length ||
    Object.keys(YOPPO_COMPONENT_TOLERANCES).some(name => !Object.hasOwn(geometry.regions, name))) {
  throw new Error("Canonical geometry audit is incomplete: expected all 14 measured component regions");
}
const edgeClipped = regions
  .filter(([, value]) => value.valid !== true || Object.values(value?.touchesRoiEdge ?? {}).some(Boolean))
  .map(([name]) => name);
if (edgeClipped.length) {
  throw new Error("Canonical geometry measurements still touch ROI edges: " + edgeClipped.join(", "));
}

const size = YOPPO_ARTBOARD_CONTRACT.width;
if (!provenancePath) throw new Error("Independent rendered labels and provenance are required");
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
const sha = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if (sha(renderedPath)!==provenance.renderSha256 || sha(provenance.labelsPath)!==provenance.labelsSha256 || sha("rive/yoppo-master/scene.rml")!==provenance.sourceSha256) throw new Error("Render/labels provenance mismatch");

async function raw(path: string) {
  return sharp(path).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const referenceResized = await sharp(referencePath)
  .toColourspace("srgb")
  .resize({
    width: Math.round(500 * YOPPO_ARTBOARD_CONTRACT.reconstructionScale),
    height: Math.round(500 * YOPPO_ARTBOARD_CONTRACT.reconstructionScale),
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  })
  .png()
  .toBuffer();

const referenceCanvas = await sharp({
  create: {
    width: size,
    height: YOPPO_ARTBOARD_CONTRACT.height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{
    input: referenceResized,
    left: YOPPO_ARTBOARD_CONTRACT.referenceOverlayX,
    top: YOPPO_ARTBOARD_CONTRACT.referenceOverlayY,
  }])
  .png()
  .toBuffer();

const rendered = await raw(renderedPath);
const reference = await sharp(referenceCanvas).raw().toBuffer({ resolveWithObject: true });
const labels = await raw(provenance.labelsPath);

if (rendered.info.width !== size || rendered.info.height !== YOPPO_ARTBOARD_CONTRACT.height) {
  throw new Error(`Rive render must be ${size}x${YOPPO_ARTBOARD_CONTRACT.height}, got ${rendered.info.width}x${rendered.info.height}`);
}

const independentlyMeasured = measureRenderedComponents(rendered, labels);

let intersection = 0;
let union = 0;
let renderCount = 0;
let referenceCount = 0;
let renderX = 0, renderY = 0, referenceX = 0, referenceY = 0;
let renderGround = -1, referenceGround = -1;
let rgbError = 0, rgbSamples = 0;

for (let y = 0; y < rendered.info.height; y++) {
  for (let x = 0; x < rendered.info.width; x++) {
    const i = (y * rendered.info.width + x) * 4;
    const ra = rendered.data[i + 3];
    const fa = reference.data[i + 3];
    const rv = ra >= 32;
    const fv = fa >= 32;
    if (rv || fv) union++;
    if (rv && fv) intersection++;
    if (rv) {
      renderCount++;
      renderX += x; renderY += y;
      renderGround = y;
    }
    if (fv) {
      referenceCount++;
      referenceX += x; referenceY += y;
      referenceGround = y;
    }
    if (ra >= 180 && fa >= 180) {
      rgbError += Math.abs(rendered.data[i] - reference.data[i]);
      rgbError += Math.abs(rendered.data[i + 1] - reference.data[i + 1]);
      rgbError += Math.abs(rendered.data[i + 2] - reference.data[i + 2]);
      rgbSamples += 3;
    }
  }
}

const silhouetteIoU = union ? intersection / union : 0;
const renderCentroid = { x: renderX / Math.max(1, renderCount), y: renderY / Math.max(1, renderCount) };
const referenceCentroid = { x: referenceX / Math.max(1, referenceCount), y: referenceY / Math.max(1, referenceCount) };
const centroidDistance = Math.hypot(
  renderCentroid.x - referenceCentroid.x,
  renderCentroid.y - referenceCentroid.y,
);
const groundContactDelta = Math.abs(renderGround - referenceGround);
const overlapRgbMae = rgbSamples ? rgbError / rgbSamples : 255;

const componentMetrics = Object.fromEntries(
  Object.entries(geometry.regions).map(([name,canonical])=>{
    const tolerance=(YOPPO_COMPONENT_TOLERANCES as Record<string,{centroidMaxPx:number;widthRelMax:number;heightRelMax:number}>)[name];
    if(!tolerance) throw new Error("Missing frozen component tolerance: "+name);
    const measured=independentlyMeasured.components[name as ComponentName];
    if(!measured) return [name, {centroidDistancePx:null,widthRelError:null,heightRelError:null,rendered:null,canonical:{bounds:canonical.artboardBounds,centroid:canonical.artboardCentroid},tolerance,pass:false}];
    const componentCentroidDistance=Math.hypot(
      measured.centroid.x-canonical.artboardCentroid.x,
      measured.centroid.y-canonical.artboardCentroid.y,
    );
    const widthRelError=Math.abs(measured.bounds.width-canonical.artboardBounds.width)/canonical.artboardBounds.width;
    const heightRelError=Math.abs(measured.bounds.height-canonical.artboardBounds.height)/canonical.artboardBounds.height;
    return [name,{
      centroidDistancePx:Number(componentCentroidDistance.toFixed(2)),
      widthRelError:Number(widthRelError.toFixed(4)),
      heightRelError:Number(heightRelError.toFixed(4)),
      rendered:measured,
      canonical:{bounds:canonical.artboardBounds,centroid:canonical.artboardCentroid},
      tolerance,
      pass:
        componentCentroidDistance<=tolerance.centroidMaxPx &&
        widthRelError<=tolerance.widthRelMax &&
        heightRelError<=tolerance.heightRelMax,
    }];
  })
) as Record<ComponentName, ComponentMetric>;

const metrics = {
  silhouetteIoU: Number(silhouetteIoU.toFixed(4)),
  centroidDistancePx: Number(centroidDistance.toFixed(2)),
  groundContactDeltaPx: groundContactDelta,
  overlapRgbMae: Number(overlapRgbMae.toFixed(2)),
  renderCentroid,
  referenceCentroid,
  renderGround,
  referenceGround,
  thresholds: YOPPO_OVERLAY_ACCEPTANCE,
  unassignedLabelPixels: independentlyMeasured.unassignedVisiblePixels,
  components: componentMetrics,
};

console.log("YOPPO_MASTER_COMPARE=" + JSON.stringify(metrics));
fs.mkdirSync(outputDir, {recursive:true});
fs.writeFileSync(path.join(outputDir,"metrics.json"),JSON.stringify(metrics,null,2)+"\n");

// sharp has no composite opacity option. Apply opacity only to the review copy,
// after calculating metrics from the unchanged straight-alpha source pixels.
const overlayPixels = Buffer.from(rendered.data);
for (let i=3;i<overlayPixels.length;i+=4) overlayPixels[i]=Math.round(overlayPixels[i]*0.5);
const overlayRender = await sharp(overlayPixels, {raw:{width:size,height:YOPPO_ARTBOARD_CONTRACT.height,channels:4}}).png().toBuffer();
const overlay = await sharp(referenceCanvas)
  .composite([{ input: overlayRender, blend: "over" }])
  .png()
  .toBuffer();
await sharp(overlay).toFile(path.join(outputDir,"overlay.png"));
const neutral = {r:244,g:240,b:232,alpha:1};
const sideBySide=await sharp({create:{width:size*2,height:size+48,channels:4,background:neutral}})
  .composite([
    {input:referenceCanvas,left:0,top:48},
    {input:await sharp(renderedPath).png().toBuffer(),left:size,top:48},
    {input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="48"><text x="24" y="30" font-family="Arial" font-size="20" fill="#222">CANONICAL PNG</text><text x="1048" y="30" font-family="Arial" font-size="20" fill="#222">RIVE - VISUAL REVIEW PENDING HUMAN REVIEW</text></svg>`),left:0,top:0},
  ]).png().toBuffer();
for (const percent of [100,50,25]) await sharp(sideBySide).resize({width:Math.round(size*2*percent/100),kernel:sharp.kernel.lanczos3}).png().toFile(path.join(outputDir,`side-by-side-${percent}.png`));

const failures:string[] = [];
for(const [name,value] of Object.entries(componentMetrics)){
  if(!value.pass) {
    failures.push(
      `component ${name} centroid=${value.centroidDistancePx}px widthErr=${value.widthRelError} heightErr=${value.heightRelError}`
    );
  }
}
if (silhouetteIoU < YOPPO_OVERLAY_ACCEPTANCE.silhouetteIoUMin) failures.push(`IoU ${silhouetteIoU.toFixed(3)}`);
if (centroidDistance > YOPPO_OVERLAY_ACCEPTANCE.centroidDistanceMaxPx) failures.push(`centroid ${centroidDistance.toFixed(1)}px`);
if (groundContactDelta > YOPPO_OVERLAY_ACCEPTANCE.groundContactDeltaMaxPx) failures.push(`ground ${groundContactDelta}px`);
if (overlapRgbMae > YOPPO_OVERLAY_ACCEPTANCE.overlapRgbMaeMax) failures.push(`RGB MAE ${overlapRgbMae.toFixed(1)}`);

if (failures.length) {
  throw new Error("Yoppo neutral master overlay gate failed: " + failures.join(", "));
}
}

main().catch(error => {
  console.error(error);
  process.exitCode=1;
});
