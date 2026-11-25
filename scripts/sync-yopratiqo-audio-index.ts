/** Offline only: regenerate the compact player index after a reviewed publication. */
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPremiumAudioIndex } from "./lib/premiumAudioIndex";

async function main() {
  const directory = resolve("lib/yo/audio");
  const records = JSON.parse(await readFile(resolve(directory, "premiumPublished.json"), "utf8"));
  if (!Array.isArray(records)) throw new Error("Expected a recording registry.");
  const path = resolve(directory, "premiumIndex.json");
  await writeFile(path + ".tmp", JSON.stringify(buildPremiumAudioIndex(records)) + "\n");
  await rename(path + ".tmp", path);
  console.log(`Indexed ${records.length} published recordings without provider calls.`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
