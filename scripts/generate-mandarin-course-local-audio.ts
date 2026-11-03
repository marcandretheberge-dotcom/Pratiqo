/**
 * Mandarin recordings bundled with the course, never uploaded by this command.
 * Offline by default. Generation requires --generate and OPENAI_API_KEY.
 * Reuses the existing speech request, cache and MP3 validation implementation.
 */
import { mkdir, open, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mandarinCourseAudio } from "../lib/yo/audio/mandarinCourseAudio";
import {
  cacheRecording,
  preflightManifest,
  readCachedRecording,
  resolveSpeechRequest,
  sha256,
  validateMp3,
  type ResolvedConfig,
} from "./generate-yopratiqo-audio";

const root = process.cwd();
const cacheDir = resolve(root, ".cache/mandarin-local-audio");
const cfg: ResolvedConfig = {
  openAiApiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
  supabaseUrl: "",
  serviceRoleKey: "",
  bucket: "",
  cacheDir,
  // Fixed per-character pricing makes the authorized spending cap enforceable.
  model: "tts-1-hd",
  voiceOverride: "alloy",
};
const budgetMicroUsd = 3_000_000;
const microUsdPerCharacter = 30;
const ledgerPath = resolve(cacheDir, "budget.json");
type Ledger = { reservedMicroUsd: number; requests: number };
async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--generate", "--verify"].includes(arg)) ||
    args.length > 1
  )
    throw new Error(
      "Use --generate, --verify, or no argument for an offline estimate.",
    );
  preflightManifest(mandarinCourseAudio);
  const projectedMicroUsd = mandarinCourseAudio.reduce(
    (sum, item) =>
      sum + Buffer.byteLength(item.text, "utf8") * microUsdPerCharacter,
    0,
  );
  console.log(
    JSON.stringify({
      recordings: mandarinCourseAudio.length,
      model: cfg.model,
      conservativeUsd: projectedMicroUsd / 1e6,
      budgetUsd: 3,
    }),
  );
  if (!args.length) process.exit(0);
  if (projectedMicroUsd > budgetMicroUsd)
    throw new Error("The recording plan exceeds the authorized budget.");
  if (args[0] === "--generate" && !cfg.openAiApiKey)
    throw new Error("OPENAI_API_KEY is missing; no request made.");
  await mkdir(cacheDir, { recursive: true });
  const lockPath = resolve(cacheDir, "generation.lock");
  const lock = await open(lockPath, "wx");
  await lock.close();
  let generated = 0,
    totalSeconds = 0;
  try {
    let ledger: Ledger = { reservedMicroUsd: 0, requests: 0 };
    try {
      ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (
      !Number.isSafeInteger(ledger.reservedMicroUsd) ||
      ledger.reservedMicroUsd < 0 ||
      !Number.isSafeInteger(ledger.requests) ||
      ledger.requests < 0
    )
      throw new Error("Invalid budget ledger; stop for review.");
    const paths: Record<string, string> = {};
    const evidence: Array<{ path: string; sha256: string; seconds: number }> =
      [];
    for (const [index, item] of mandarinCourseAudio.entries()) {
      const request = resolveSpeechRequest(cfg, item);
      const publicPath = "/audio/" + item.storagePath;
      const path = resolve(root, "public", publicPath.slice(1));
      let bytes: Uint8Array | undefined;
      try {
        bytes = await readFile(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      let cached = await readCachedRecording(cacheDir, request);
      if (!bytes && args[0] === "--verify")
        throw new Error("A required recording is missing: " + item.id);
      if (!bytes && !cached) {
        // Reserve before sending. A timeout also consumes budget; no hidden retries.
        const cost =
          Buffer.byteLength(request.input, "utf8") * microUsdPerCharacter;
        if (ledger.reservedMicroUsd + cost > budgetMicroUsd)
          throw new Error("Authorized budget exhausted; no request made.");
        ledger = {
          reservedMicroUsd: ledger.reservedMicroUsd + cost,
          requests: ledger.requests + 1,
        };
        await writeFile(ledgerPath + ".tmp", JSON.stringify(ledger), {
          mode: 0o600,
        });
        await rename(ledgerPath + ".tmp", ledgerPath);
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(90_000),
          headers: {
            Authorization: "Bearer " + cfg.openAiApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });
        if (!response.ok)
          throw new Error(
            "Speech generation failed: HTTP " +
              response.status +
              ". No automatic retry.",
          );
        const recording = new Uint8Array(await response.arrayBuffer());
        const validation = validateMp3(
          recording,
          response.headers.get("content-type") ?? "",
        );
        if (validation.durationSeconds <= 0.2)
          throw new Error(
            "Speech response is too short; not cached or published. No automatic retry.",
          );
        cached = await cacheRecording(
          cacheDir,
          request,
          recording,
          new Date().toISOString(),
        );
        generated++;
      }
      if (!bytes) {
        bytes = cached!.bytes;
        if (validateMp3(bytes).durationSeconds <= 0.2)
          throw new Error(
            "Cached speech is too short; inspect it before generating a retake.",
          );
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes, { flag: "wx" });
      }
      const details = validateMp3(bytes);
      if (details.durationSeconds <= 0.2)
        throw new Error("Existing speech is too short; no overwrite allowed.");
      if (cached && sha256(bytes) !== cached.metadata.sha256)
        throw new Error(
          "Existing recording differs from cache; no overwrite allowed.",
        );
      totalSeconds += details.durationSeconds;
      paths[item.text] = publicPath;
      evidence.push({
        path: publicPath,
        sha256: sha256(bytes),
        seconds: Number(details.durationSeconds.toFixed(3)),
      });
      if ((index + 1) % 25 === 0)
        console.log("Validated recordings: " + (index + 1));
    }
    if (args[0] === "--generate") {
      await writeFile(
        resolve(root, "lib/yo/mandarin/audioPaths.json"),
        JSON.stringify(paths, null, 2) + "\n",
      );
      await writeFile(
        resolve(cacheDir, "verification.json"),
        JSON.stringify(evidence, null, 2),
      );
    }
    console.log(
      JSON.stringify({
        verified: evidence.length,
        generated,
        durationMinutes: totalSeconds / 60,
        reservedUsdUpperBound: ledger.reservedMicroUsd / 1e6,
        uploaded: 0,
      }),
    );
  } finally {
    await rm(lockPath);
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Local audio preparation failed.",
  );
  process.exitCode = 1;
});
