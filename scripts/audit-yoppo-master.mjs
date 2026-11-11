import sharp from "sharp";

const source = "public/companion/travel/companion-travel-idle.png";
const image = sharp(source).ensureAlpha();
const metadata = await image.metadata();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

let minX = info.width, minY = info.height, maxX = -1, maxY = -1, visible = 0;
const buckets = new Map();
const semanticBuckets = new Map();

const regionBoxes = {
  eyeLeft: { x: 160, y: 155, width: 78, height: 88 },
  eyeRight: { x: 258, y: 155, width: 82, height: 90 },
  mouth: { x: 208, y: 218, width: 90, height: 62 },
  backpack: { x: 322, y: 245, width: 110, height: 175 },
  buckle: { x: 380, y: 250, width: 44, height: 72 },
  chestEmblem: { x: 205, y: 292, width: 100, height: 78 },
  innerEarLeft: { x: 140, y: 120, width: 62, height: 78 },
  innerEarRight: { x: 332, y: 122, width: 70, height: 84 },
};

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

function regionPalette(box, limit = 8) {
  const local = new Map();
  const maxX = Math.min(info.width, box.x + box.width);
  const maxY = Math.min(info.height, box.y + box.height);
  for (let y = box.y; y < maxY; y++) {
    for (let x = box.x; x < maxX; x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 180) continue;
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const prev = local.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
      const weight = a / 255;
      prev.weight += weight;
      prev.r += r * weight; prev.g += g * weight; prev.b += b * weight;
      local.set(key, prev);
    }
  }
  return [...local.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(item => ({
      hex: hex({
        r: Math.round(item.r / item.weight),
        g: Math.round(item.g / item.weight),
        b: Math.round(item.b / item.weight),
      }),
      weight: Math.round(item.weight),
    }));
}

const regionPalettes = Object.fromEntries(
  Object.entries(regionBoxes).map(([name, box]) => [name, regionPalette(box)])
);

const result = {
  source,
  width: metadata.width,
  height: metadata.height,
  hasAlpha: metadata.hasAlpha,
  visibleBounds: { minX, minY, maxX, maxY },
  visiblePixels: visible,
  paletteCandidates: selected.map(c => ({ hex: hex(c), weight: Math.round(c.weight) })),
  semanticPalette,
  regionPalettes,
};

console.log("YOPPO_MASTER_AUDIT=" + JSON.stringify(result));
