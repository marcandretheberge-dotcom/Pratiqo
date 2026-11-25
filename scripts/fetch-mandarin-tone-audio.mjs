// Native-speaker reference recordings, not generated tone assessments.
import { mkdir, writeFile, access } from "node:fs/promises";
const titles = [
  "File:Zh-shū.ogg",
  "File:Zh-má.ogg",
  "File:Zh-mǎ.ogg",
  "File:Zh-mà.ogg",
];
const query = new URL("https://commons.wikimedia.org/w/api.php");
query.search = new URLSearchParams({
  action: "query",
  titles: titles.join("|"),
  prop: "videoinfo",
  viprop: "url|derivatives|extmetadata",
  format: "json",
});
const response = await fetch(query);
if (!response.ok) throw Error("Commons unavailable");
const pages = Object.values((await response.json()).query.pages);
const root = new URL("../public/audio/yo/zh/reference-tones/", import.meta.url);
await mkdir(root, { recursive: true });
const manifest = {};
for (const [index, title] of titles.entries()) {
  const item = pages.find((page) => page.title === title)?.videoinfo?.[0];
  const mp3 = item?.derivatives?.find((file) => file.type === "audio/mpeg");
  const meta = item?.extmetadata;
  if (
    !mp3 ||
    !meta?.Artist?.value ||
    !/^CC BY/.test(meta.LicenseShortName?.value ?? "")
  )
    throw Error("Missing reference or license: " + title);
  const target = new URL(`tone-${index + 1}.mp3`, root);
  const exists = await access(target).then(
    () => true,
    () => false,
  );
  if (!exists) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const audio = await fetch(mp3.src);
    if (!audio.ok) throw Error(`Audio HTTP ${audio.status}: ${title}`);
    const buffer = Buffer.from(await audio.arrayBuffer());
    if (buffer.length < 1000) throw Error("Truncated recording");
    await writeFile(target, buffer, { flag: "wx" });
  }
  manifest[String(index + 1)] = {
    src: `/audio/yo/zh/reference-tones/tone-${index + 1}.mp3`,
    source: item.descriptionurl,
    credit: meta.Artist.value.replace(/<[^>]*>/g, ""),
    license: meta.LicenseShortName.value,
    licenseUrl: meta.LicenseUrl.value,
    description: meta.ImageDescription.value.replace(/<[^>]*>/g, ""),
    verifiedAt: "2026-11-03",
    adaptation: "Wikimedia MP3 transcode; recording unchanged.",
  };
}
await writeFile(
  new URL("../lib/yo/mandarin/toneAssets.json", import.meta.url),
  JSON.stringify(manifest, null, 2) + "\n",
  { flag: "wx" },
);
console.log("Four licensed native tone recordings acquired.");
