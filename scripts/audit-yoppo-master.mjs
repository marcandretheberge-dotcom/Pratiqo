import sharp from "sharp";

const source = "public/companion/travel/companion-travel-idle.png";
const image = sharp(source).ensureAlpha();
const metadata = await image.metadata();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

let minX = info.width, minY = info.height, maxX = -1, maxY = -1, visible = 0;
const buckets = new Map();
const semanticBuckets = new Map();

function semanticKind(r, g, b) {
  if (r > 235 && g > 220 && b > 190) return "cream";
  if (r > 185 && g > 105 && b > 105 && b > 105 && r - g > 20 && Math.abs(g - b) < 45) return "blush";
  if (r < 90 && g > 105 && b > 95 && Math.abs(g - b) < 80) return "teal";
  if (r > 75 && r > g + 20 && g > 30 && g < 150 && b < 105) return "brown";
  if (r < 55 && g < 65 && b < 70) return "ink";
  return null;
}

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

    const semantic = semanticKind(r, g, b);
    if (semantic) {
      const semanticKey = `${semantic}:${key}`;
      const item = semanticBuckets.get(semanticKey) ?? { kind: semantic, weight: 0, r: 0, g: 0, b: 0 };
      item.weight += weight;
      item.r += r * weight; item.g += g * weight; item.b += b * weight;
      semanticBuckets.set(semanticKey, item);
    }
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

const semanticPalette = {};
for (const kind of ["cream", "teal", "brown", "blush", "ink"]) {
  const best = [...semanticBuckets.values()]
    .filter(item => item.kind === kind)
    .sort((a, b) => b.weight - a.weight)[0];
  if (best) {
    semanticPalette[kind] = {
      hex: hex({
        r: Math.round(best.r / best.weight),
        g: Math.round(best.g / best.weight),
        b: Math.round(best.b / best.weight),
      }),
      weight: Math.round(best.weight),
    };
  }
}

const result = {
  source,
  width: metadata.width,
  height: metadata.height,
  hasAlpha: metadata.hasAlpha,
  visibleBounds: { minX, minY, maxX, maxY },
  visiblePixels: visible,
  paletteCandidates: selected.map(c => ({ hex: hex(c), weight: Math.round(c.weight) })),
  semanticPalette,
};

console.log("YOPPO_MASTER_AUDIT=" + JSON.stringify(result));
