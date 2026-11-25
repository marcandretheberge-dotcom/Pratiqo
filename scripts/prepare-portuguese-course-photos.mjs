import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";
const photos = [
  ["rio", "Sugarloaf Mountain - Rio de Janeiro.jpg"],
  ["salvador", "Pelourinho-Salvador.jpg"],
  ["brasilia", "Congresso Nacional, Brasilia.jpg"],
  ["iguacu", "Iguazu Cataratas2.jpg"],
];
await mkdir("public/images/yo/portuguese-br", { recursive: true });
for (const [name, title] of photos) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const file = title.replaceAll(" ", "_"),
    hash = createHash("md5").update(file).digest("hex");
  const path = `${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(file)}`;
  const response = await fetch(
    `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/1280px-${encodeURIComponent(file)}`,
    {
      headers: {
        "User-Agent":
          "PratiqoLearningAssets/1.0 (licensed educational photography)",
      },
    },
  );
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new Error(`Photo ${name}: HTTP ${response.status}`);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(`public/images/yo/portuguese-br/${name}.webp`, data, {
    flag: "wx",
  });
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
