import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { inspectCaptureAlpha, requireTransparentRiveCapture } from "./yoppo-capture-alpha";

async function main() {
  const input=process.argv[2],output=process.argv[3];
  if(!input||!output) throw new Error("Provide the captured PNG and diagnostic JSON output paths");
  const pixels=await sharp(input).toColourspace("srgb").ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=inspectCaptureAlpha(pixels);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({input,...alpha},null,2)+"\n");
  requireTransparentRiveCapture(pixels);
  console.log("Rive transparent capture preflight: PASS");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
