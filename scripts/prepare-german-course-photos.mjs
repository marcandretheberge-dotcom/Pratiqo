import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";

// Exact licensed source files; no generated landmarks, crop or remote runtime dependency.
const photos = [
  ["berlin", "8/80/Berlin_-_0266_-_16052015_-_Brandenburger_Tor.jpg"],
  ["cologne", "0/03/Cologne_cathedrale_vue_sud.jpg"],
  ["rhine", "9/98/Bacharach_2025.jpg"],
  ["hamburg", "3/34/Hamburg%2C_Speicherstadt%2C_Block_P_--_2016_--_3330-6.jpg"],
];
await mkdir("public/images/yo/german", { recursive: true });
for (const [name, path] of photos) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const file = path.split("/").at(-1);
  const url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/1280px-${file}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "PratiqoLearningAssets/1.0 (licensed educational photography)",
    },
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new Error(`Photo ${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(`public/images/yo/german/${name}.webp`, data);
  console.log(
    JSON.stringify({
      name,
      width: info.width,
      height: info.height,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    }),
  );
}
