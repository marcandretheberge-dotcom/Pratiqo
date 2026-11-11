import fs from "node:fs";
import sharp from "sharp";
import {
  YOPPO_ARTBOARD_CONTRACT,
  YOPPO_OVERLAY_ACCEPTANCE,
} from "@/lib/companion/yoppoRigContract";

const renderedPath = process.argv[2] ?? "/tmp/yoppo-master-neutral.png";
const geometryPath = process.argv[3] ?? "/tmp/yoppo-canonical-geometry.json";
const referencePath = "public/companion/travel/companion-travel-idle.png";

if (!fs.existsSync(geometryPath)) {
  throw new Error("Canonical geometry audit is required before overlay comparison: " + geometryPath);
}
const geometry = JSON.parse(fs.readFileSync(geometryPath, "utf8"));
const regions = Object.entries(geometry.regions ?? {});
if (regions.length < 10) {
  throw new Error("Canonical geometry audit is incomplete: expected measured component regions");
}
const edgeClipped = regions
  .filter(([, value]: any) => Object.values(value?.touchesRoiEdge ?? {}).some(Boolean))
  .map(([name]) => name);
if (edgeClipped.length) {
  throw new Error("Canonical geometry measurements touch ROI edges; widen ROIs before comparison: " + edgeClipped.join(", "));
}
const size = YOPPO_ARTBOARD_CONTRACT.width;

async function raw(path: string) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const referenceResized = await sharp(referencePath)
  .resize({
    width: Math.round(500 * YOPPO_ARTBOARD_CONTRACT.reconstructionScale),
    height: Math.round(500 * YOPPO_ARTBOARD_CONTRACT.reconstructionScale),
    fit: "fill",
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
};

console.log("YOPPO_MASTER_COMPARE=" + JSON.stringify(metrics));

const overlay = await sharp(referenceCanvas)
  .composite([{ input: await sharp(renderedPath).png().toBuffer(), blend: "over", opacity: 0.5 }])
  .png()
  .toBuffer();
await sharp(overlay).toFile("/tmp/yoppo-master-overlay.png");

const failures = [];
if (silhouetteIoU < YOPPO_OVERLAY_ACCEPTANCE.silhouetteIoUMin) failures.push(`IoU ${silhouetteIoU.toFixed(3)}`);
if (centroidDistance > YOPPO_OVERLAY_ACCEPTANCE.centroidDistanceMaxPx) failures.push(`centroid ${centroidDistance.toFixed(1)}px`);
if (groundContactDelta > YOPPO_OVERLAY_ACCEPTANCE.groundContactDeltaMaxPx) failures.push(`ground ${groundContactDelta}px`);
if (overlapRgbMae > YOPPO_OVERLAY_ACCEPTANCE.overlapRgbMaeMax) failures.push(`RGB MAE ${overlapRgbMae.toFixed(1)}`);

if (failures.length) {
  throw new Error("Yoppo neutral master overlay gate failed: " + failures.join(", "));
}
