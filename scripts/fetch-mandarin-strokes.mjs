import { mkdir, writeFile } from "node:fs/promises";
const revision = "68d10a4b21150cae5e1ebbd223eed289cf32d90c";
const base = `https://raw.githubusercontent.com/chanind/hanzi-writer-data/${revision}/`;
const root = new URL("../public/yo/mandarin-strokes/", import.meta.url);
await mkdir(root, { recursive: true });
for (const character of ["人", "三", "口", "女", "上", "日", "本", "中"]) {
  const response = await fetch(
    base + "data/" + encodeURIComponent(character) + ".json",
  );
  if (!response.ok) throw Error(`Stroke source HTTP ${response.status}`);
  const data = await response.json();
  if (
    !Array.isArray(data.strokes) ||
    !data.strokes.every(
      (stroke) => typeof stroke === "string" && /^[Mm]/.test(stroke),
    )
  )
    throw Error("Invalid source geometry");
  await writeFile(
    new URL(`${character.codePointAt(0).toString(16)}.json`, root),
    JSON.stringify({
      strokes: data.strokes,
      medians: data.medians,
      source: base + "data/" + encodeURIComponent(character) + ".json",
      revision,
    }) + "\n",
    { flag: "wx" },
  );
}
const license = await fetch(base + "ARPHICPL.TXT");
if (!license.ok) throw Error("Missing data license");
await writeFile(
  new URL("LICENSE.txt", root),
  (await license.text()).replace(/[ \t]+$/gm, ""),
  {
    flag: "wx",
  },
);
console.log(
  "8 Chinese stroke datasets acquired with pinned provenance and license.",
);
