import fs from "node:fs";
import sharp from "sharp";
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

async function main() {
const renderedPath = process.argv[2] ?? "/tmp/yoppo-master-neutral.png";
const geometryPath = process.argv[3] ?? "/tmp/yoppo-canonical-geometry.json";
const referencePath = "public/companion/travel/companion-travel-idle.png";

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

if (rendered.info.width !== size || rendered.info.height !== YOPPO_ARTBOARD_CONTRACT.height) {
  throw new Error(`Rive render must be ${size}x${YOPPO_ARTBOARD_CONTRACT.height}, got ${rendered.info.width}x${rendered.info.height}`);
}

const cream = (r:number,g:number,b:number,a:number) =>
  a>=120 && r>=175 && g>=155 && b>=130 && Math.max(r,g,b)-Math.min(r,g,b)<105;
const teal = (r:number,g:number,b:number,a:number) =>
  a>=120 && g>=85 && b>=75 && g>r+28 && b>r+20;
const brown = (r:number,g:number,b:number,a:number) =>
  a>=120 && r>=65 && r>g+18 && g>=25 && g<170 && b<135;
const ink = (r:number,g:number,b:number,a:number) =>
  a>=120 && r<90 && g<105 && b<110;
const creamOrTeal = (r:number,g:number,b:number,a:number) => cream(r,g,b,a)||teal(r,g,b,a);
const pack = (r:number,g:number,b:number,a:number) => brown(r,g,b,a)||teal(r,g,b,a);

const classifiers: Record<string,(r:number,g:number,b:number,a:number)=>boolean> = {
  headCream: cream,
  spikes: teal,
  earLeft: (r,g,b,a)=>teal(r,g,b,a)||ink(r,g,b,a),
  earRight: (r,g,b,a)=>teal(r,g,b,a)||ink(r,g,b,a),
  eyeLeft: (r,g,b,a)=>teal(r,g,b,a)||ink(r,g,b,a),
  eyeRight: (r,g,b,a)=>teal(r,g,b,a)||ink(r,g,b,a),
  torso: creamOrTeal,
  armLeft: creamOrTeal,
  armRight: creamOrTeal,
  footLeft: teal,
  footRight: teal,
  backpack: pack,
  mouthInk: ink,
  chestEmblem: teal,
};

function measureRenderedRegion(name:string, canonical:CanonicalRegion) {
  const classifier=classifiers[name];
  if(!classifier) throw new Error("No render classifier for component "+name);

  // Keep the rendered search local to the canonical feature so same-color neighbors
  // cannot dominate a component measurement.
  const pad=10;
  const cb=canonical.artboardBounds;
  const minX=Math.max(0,Math.floor(cb.minX-pad));
  const minY=Math.max(0,Math.floor(cb.minY-pad));
  const maxX=Math.min(rendered.info.width-1,Math.ceil(cb.maxX+pad));
  const maxY=Math.min(rendered.info.height-1,Math.ceil(cb.maxY+pad));

  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,count=0,sx=0,sy=0;
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const i=(y*rendered.info.width+x)*4;
      const r=rendered.data[i],g=rendered.data[i+1],b=rendered.data[i+2],a=rendered.data[i+3];
      if(!classifier(r,g,b,a)) continue;
      count++; sx+=x; sy+=y;
      x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y);
    }
  }
  if(!count) throw new Error("Rendered component has no classified pixels: "+name);
  return {
    pixelCount:count,
    bounds:{minX:x0,minY:y0,maxX:x1,maxY:y1,width:x1-x0+1,height:y1-y0+1},
    centroid:{x:sx/count,y:sy/count},
  };
}

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
    const measured=measureRenderedRegion(name,canonical);
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
);

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
  components: componentMetrics,
};

console.log("YOPPO_MASTER_COMPARE=" + JSON.stringify(metrics));

// sharp has no composite opacity option. Apply opacity only to the review copy,
// after calculating metrics from the unchanged straight-alpha source pixels.
const overlayPixels = Buffer.from(rendered.data);
for (let i=3;i<overlayPixels.length;i+=4) overlayPixels[i]=Math.round(overlayPixels[i]*0.5);
const overlayRender = await sharp(overlayPixels, {raw:{width:size,height:YOPPO_ARTBOARD_CONTRACT.height,channels:4}}).png().toBuffer();
const overlay = await sharp(referenceCanvas)
  .composite([{ input: overlayRender, blend: "over" }])
  .png()
  .toBuffer();
await sharp(overlay).toFile("/tmp/yoppo-master-overlay.png");

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
