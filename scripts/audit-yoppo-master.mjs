import sharp from "sharp";

const source = "public/companion/travel/companion-travel-idle.png";
const image = sharp(source).ensureAlpha();
const metadata = await image.metadata();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

let minX = info.width, minY = info.height, maxX = -1, maxY = -1, visible = 0;
const buckets = new Map();

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 32) continue;
    visible++;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    if (a < 180) continue;
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const prev = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    const weight = a / 255;
    prev.weight += weight;
    prev.r += r * weight; prev.g += g * weight; prev.b += b * weight;
    buckets.set(key, prev);
  }
}

const candidates = [...buckets.values()]
  .sort((a, b) => b.weight - a.weight)
  .map(v => ({
    weight: v.weight,
    r: Math.round(v.r / v.weight),
    g: Math.round(v.g / v.weight),
    b: Math.round(v.b / v.weight),
  }));

const selected = [];
for (const color of candidates) {
  if (selected.length >= 14) break;
  const distinct = selected.every(other => {
    const dr = color.r - other.r, dg = color.g - other.g, db = color.b - other.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) >= 34;
  });
  if (distinct) selected.push(color);
}

const hex = ({ r, g, b }) => "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("").toUpperCase();

const result = {
  source,
  width: metadata.width,
  height: metadata.height,
  hasAlpha: metadata.hasAlpha,
  visibleBounds: { minX, minY, maxX, maxY },
  visiblePixels: visible,
  paletteCandidates: selected.map(c => ({ hex: hex(c), weight: Math.round(c.weight) })),
};

console.log("YOPPO_MASTER_AUDIT=" + JSON.stringify(result));
