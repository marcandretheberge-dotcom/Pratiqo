// Explicit, reproducible asset acquisition. Never runs in the browser or during build.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../public/images/yo/mandarin/", import.meta.url);
const files = {
  park: "File:Chaoyang Park, Beijing 12.jpg",
  market: "File:Wuhan - HUST - fruit market 4148.jpg",
  cafe: "File:Slow Life in A Tea House 01 edited.jpg",
  station: "File:Beijing West train station 01 edit.jpg",
  street: "File:Shangye Street - Chengdu, China - DSC05295.jpg",
  tea: "File:Cup of tea image.jpg",
  apple: "File:Red Apple.jpg",
  noodles: "File:Taiwanese beef noodles.jpg",
};
const plain = (value) => value.replace(/<[^>]*>/g, "");
await mkdir(root, { recursive: true });
const query = new URL("https://commons.wikimedia.org/w/api.php");
query.search = new URLSearchParams({
  action: "query",
  titles: Object.values(files).join("|"),
  prop: "imageinfo",
  iiprop: "url|extmetadata",
  iiurlwidth: "1200",
  format: "json",
});
const response = await fetch(query);
if (!response.ok) throw Error(`Commons HTTP ${response.status}`);
const pages = Object.values((await response.json()).query.pages);
const assets = {};
for (const [id, title] of Object.entries(files)) {
  const item = pages.find((page) => page.title === title)?.imageinfo?.[0];
  if (!item) throw Error(`Missing licensed source: ${title}`);
  const metadata = item.extmetadata;
  const license = metadata.LicenseShortName?.value;
  if (!/^(CC0|CC BY(?:-SA)? [234]\.0)$/.test(license))
    throw Error(`Review license for ${id}`);
  const image = await fetch(item.thumburl ?? item.url);
  if (!image.ok) throw Error(`Image HTTP ${image.status}: ${id}`);
  const { data, info } = await sharp(Buffer.from(await image.arrayBuffer()))
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${id}.webp`, root), data, { flag: "wx" });
  assets[id] = {
    src: `/images/yo/mandarin/${id}.webp`,
    width: info.width,
    height: info.height,
    credit: plain(metadata.Artist?.value ?? "Wikimedia Commons"),
    license,
    licenseUrl: metadata.LicenseUrl?.value,
    source: item.descriptionurl,
    acquired: new Date().toISOString().slice(0, 10),
    adaptation: "Resized and encoded as WebP; no content altered.",
  };
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
await writeFile(
  new URL("../lib/yo/mandarin/imageAssets.json", import.meta.url),
  JSON.stringify(assets, null, 2) + "\n",
  { flag: "wx" },
);
console.log(`Acquired ${Object.keys(assets).length} licensed photographs.`);
