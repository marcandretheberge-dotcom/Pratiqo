/** Current eight-language recording workflow. Offline by default; a live batch
 * needs --generate, an explicit capped budget, server credentials and FFmpeg.
 * Existing course recordings are never replaced. */
import { mkdir, open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { getYoAudioAccentProfile } from "../lib/yo/audio/accentProfiles";
import type { PremiumPublishedRecording } from "../lib/yo/audio/premiumPublished";
import { buildPremiumAudioPlan, type PremiumRecordingItem } from "./lib/premiumAudioPlan";
import { buildPremiumAudioIndex } from "./lib/premiumAudioIndex";
import { resolveConfig, sha256, validateMp3 } from "./generate-yopratiqo-audio";
import {
  COURSE_RECORDING_MODEL, COURSE_RECORDING_VOICE, courseRecordingRequest,
  courseRecordingReservation, recordCourseScript, recordingUsageUpperBound,
  validateCourseRecording, encodeCourseMp3,
  type CourseRecording, type CourseRecordingInput,
} from "./lib/realtimeCourseRecording";

export type RecordingScope = "introductions" | "italian-current" | "interests" | "all";
export type RecordingOptions = { scope: RecordingScope; generate: boolean; budgetMicroUsd?: number; limit?: number };
export function parsePremiumRecordingOptions(args: readonly string[]): RecordingOptions {
  if (args.includes("--generate") && args.includes("--dry-run")) throw new Error("Choose generation or an offline plan, not both.");
  const options: RecordingOptions = { scope: "all", generate: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--generate") options.generate = true;
    else if (arg === "--dry-run") options.generate = false;
    else if (["--scope", "--budget-usd", "--limit"].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      if (arg === "--scope") {
        if (!["introductions", "italian-current", "interests", "all"].includes(value)) throw new Error("Unknown recording scope.");
        options.scope = value as RecordingScope;
      } else if (arg === "--budget-usd") {
        if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 10) throw new Error("Recording budget must be greater than zero and at most $10 USD.");
        options.budgetMicroUsd = Math.round(Number(value) * 1e6);
      } else {
        if (!/^[1-9]\d*$/.test(value) || Number(value) > 1000) throw new Error("Recording limit must be 1–1000.");
        options.limit = Number(value);
      }
    } else throw new Error(`Unknown recording option: ${arg.split("=")[0]}`);
  }
  if (options.generate && !options.budgetMicroUsd) throw new Error("Live recording requires an explicit --budget-usd ceiling.");
  return options;
}

export type RecordingLedger = { reservedMicroUsd: number; requests: number };
export function reserveRecordingCost(ledger: RecordingLedger, amount: number, ceiling: number): RecordingLedger {
  if (![ledger.reservedMicroUsd, ledger.requests, amount, ceiling].every(Number.isSafeInteger)
    || ledger.reservedMicroUsd < 0 || ledger.requests < 0 || amount <= 0 || ceiling <= 0 || ceiling > 10_000_000) throw new Error("Invalid recording budget ledger.");
  if (ledger.reservedMicroUsd + amount > ceiling) throw new Error("Recording budget exhausted; no provider request made.");
  return { reservedMicroUsd: ledger.reservedMicroUsd + amount, requests: ledger.requests + 1 };
}

export function scriptForItem(item: PremiumRecordingItem): CourseRecordingInput {
  return {
    text: item.spokenText?.trim() || item.text,
    instructions: `Speak in locale ${item.locale}. ` + (item.ttsInstructions || getYoAudioAccentProfile(item.accentProfile).ttsInstructions)
      + (item.pronunciationHint ? ` Pronunciation guidance: ${item.pronunciationHint}` : ""),
  };
}

async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, "utf8")); }
async function atomicJson(path: string, value: unknown) {
  await writeFile(path + ".tmp", JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(path + ".tmp", path);
}
function missingFile(error: unknown) { return (error as NodeJS.ErrnoException).code === "ENOENT"; }

type Config = { root: string; cache: string; supabaseUrl: string; serviceRoleKey: string; bucket: string; apiKey: string; ffmpeg: string; budgetMicroUsd: number };
type SourceEvidence = { requestHash: string; pcmHash: string; transcript: string; usage: unknown };
type Dependencies = {
  record: (input: CourseRecordingInput, key: string) => Promise<CourseRecording>;
  encode: (recording: CourseRecording, ffmpeg: string) => Uint8Array;
  fetch: typeof fetch;
  now: () => string;
};

export async function runPremiumRecordingBatch(items: readonly PremiumRecordingItem[], config: Config, overrides: Partial<Dependencies> = {}) {
  if (!config.apiKey || !config.serviceRoleKey) throw new Error("Recording and storage server credentials are required; no request made.");
  const deps: Dependencies = { record: recordCourseScript, encode: encodeCourseMp3, fetch, now: () => new Date().toISOString(), ...overrides };
  const origin = new URL(config.supabaseUrl);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/"
    || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))
    || !/^[a-z0-9][a-z0-9._-]*$/.test(config.bucket)) throw new Error("Invalid recording storage configuration.");
  for (const item of items) {
    if (!/^yo\/[a-z0-9/_-]+\.mp3$/.test(item.storagePath) || item.storagePath.includes("..")) throw new Error("Unsafe recording storage path.");
    courseRecordingRequest(scriptForItem(item));
  }
  if (!overrides.encode && spawnSync(config.ffmpeg, ["-version"], { windowsHide: true, timeout: 10_000, stdio: "ignore" }).status !== 0) throw new Error("FFmpeg is unavailable; no provider request made.");
  await mkdir(config.cache, { recursive: true, mode: 0o700 });
  const lockPath = resolve(config.cache, "generation.lock");
  const lock = await open(lockPath, "wx", 0o600);
  await lock.close();
  const registryPath = resolve(config.root, "lib/yo/audio/premiumPublished.json");
  const ledgerPath = resolve(config.cache, "budget.json");
  let generated = 0, verified = 0;
  try {
    let ledger: RecordingLedger;
    try { ledger = await readJson<RecordingLedger>(ledgerPath); }
    catch (error) {
      if (!missingFile(error)) throw error;
      if ((await readdir(config.cache)).some((name) => name !== "generation.lock")) throw new Error("Recording ledger missing from a nonempty cache; spending history must be restored.");
      ledger = { reservedMicroUsd: 0, requests: 0 };
      await atomicJson(ledgerPath, ledger);
    }
    if (![ledger.reservedMicroUsd, ledger.requests].every(Number.isSafeInteger) || ledger.reservedMicroUsd < 0 || ledger.requests < 0) throw new Error("Invalid recording spending history; stop for review.");
    const registry = await readJson<PremiumPublishedRecording[]>(registryPath);
    if (!Array.isArray(registry)) throw new Error("Invalid published recording registry.");
    for (const item of items) {
      const input = scriptForItem(item);
      const requestHash = sha256(JSON.stringify({ model: COURSE_RECORDING_MODEL, voice: COURSE_RECORDING_VOICE, request: courseRecordingRequest(input) }));
      const prefix = resolve(config.cache, requestHash);
      let evidence: SourceEvidence | undefined;
      try { evidence = await readJson<SourceEvidence>(prefix + ".json"); }
      catch (error) { if (!missingFile(error)) throw error; }
      if (!evidence) {
        const reservation = courseRecordingReservation(input);
        const nextLedger = reserveRecordingCost(ledger, reservation, config.budgetMicroUsd);
        const marker = await open(prefix + ".attempt", "wx", 0o600).catch(() => { throw new Error("An earlier recording attempt needs review; no automatic paid retry."); });
        await marker.close();
        ledger = nextLedger;
        await atomicJson(ledgerPath, ledger);
        const recording = await deps.record(input, config.apiKey);
        validateCourseRecording(input, recording);
        const charge = recordingUsageUpperBound(recording.usage);
        if (charge > reservation) throw new Error("Provider usage exceeded the conservative reservation; stop for budget review.");
        ledger = { ...ledger, reservedMicroUsd: ledger.reservedMicroUsd - (reservation - charge) };
        await atomicJson(ledgerPath, ledger);
        await writeFile(prefix + ".pcm", recording.pcm, { flag: "wx", mode: 0o600 });
        evidence = { requestHash, pcmHash: sha256(recording.pcm), transcript: recording.transcript, usage: recording.usage };
        await atomicJson(prefix + ".json", evidence);
        generated++;
      }
      const pcm = await readFile(prefix + ".pcm");
      if (evidence.requestHash !== requestHash || evidence.pcmHash !== sha256(pcm)) throw new Error("Cached course recording failed integrity checks.");
      const recording = { pcm, transcript: evidence.transcript, usage: evidence.usage };
      validateCourseRecording(input, recording);
      if (recordingUsageUpperBound(evidence.usage) > courseRecordingReservation(input)) throw new Error("Cached recording usage exceeds its authorized reservation.");
      const bytes = deps.encode(recording, config.ffmpeg);
      const duration = validateMp3(bytes).durationSeconds;
      const hash = sha256(bytes);
      await writeFile(prefix + ".mp3", bytes, { mode: 0o600 });
      const path = item.storagePath.split("/").map(encodeURIComponent).join("/");
      const upload = await deps.fetch(`${origin.origin}/storage/v1/object/${config.bucket}/${path}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${config.serviceRoleKey}`, apikey: config.serviceRoleKey, "Content-Type": "audio/mpeg", "x-upsert": "false" },
        body: new Uint8Array(bytes),
      });
      if (!upload.ok && ![400, 409].includes(upload.status)) throw new Error(`Recording upload failed (HTTP ${upload.status}); source cached, no generation retry.`);
      const publicAudio = await deps.fetch(`${origin.origin}/storage/v1/object/public/${config.bucket}/${path}`, { redirect: "error", signal: AbortSignal.timeout(30_000) });
      if (!publicAudio.ok) throw new Error(`Public recording verification failed (HTTP ${publicAudio.status}).`);
      const served = new Uint8Array(await publicAudio.arrayBuffer());
      validateMp3(served, publicAudio.headers.get("Content-Type") || "");
      if (sha256(served) !== hash) throw new Error("Public audio differs from the validated recording; no registry publication.");
      const published: PremiumPublishedRecording = {
        locale: item.locale, text: item.text.normalize("NFC").trim(), storagePath: item.storagePath,
        model: COURSE_RECORDING_MODEL, voice: COURSE_RECORDING_VOICE, sha256: hash, requestHash,
        seconds: duration, verifiedAt: deps.now(),
      };
      const prior = registry.find((entry) => entry.locale === published.locale && entry.text === published.text);
      if (prior && (prior.sha256 !== hash || prior.storagePath !== item.storagePath)) throw new Error("A published recording already exists; create a reviewed new version instead of replacing it.");
      if (!prior) registry.push(published);
      registry.sort((a, b) => a.locale.localeCompare(b.locale) || a.text.localeCompare(b.text));
      await atomicJson(registryPath, registry);
      await atomicJson(resolve(config.root, "lib/yo/audio/premiumIndex.json"), buildPremiumAudioIndex(registry));
      verified++;
    }
    return { generated, verified, cumulativeUsdUpperBound: ledger.reservedMicroUsd / 1e6, requests: ledger.requests };
  } finally { await rm(lockPath, { force: true }); }
}

export async function main(args = process.argv.slice(2)) {
  const options = parsePremiumRecordingOptions(args);
  const plan = buildPremiumAudioPlan(options.scope);
  const selected = options.limit ? plan.items.slice(0, options.limit) : plan.items;
  console.log(JSON.stringify({ mode: options.generate ? "generate" : "offline-plan", model: COURSE_RECORDING_MODEL, voice: COURSE_RECORDING_VOICE, coverage: plan.coverage, missingRecordings: plan.items.length, selected: selected.length, maximumPerRequestUsd: selected.length ? Math.max(...selected.map((item) => courseRecordingReservation(scriptForItem(item)))) / 1e6 : 0 }));
  if (!options.generate || !selected.length) return;
  const { loadEnvConfig } = await import("@next/env");
  loadEnvConfig(process.cwd(), false, { info: () => undefined, error: () => undefined });
  const cfg = resolveConfig({ dryRun: false, force: false, verifyOnly: false, help: false });
  const result = await runPremiumRecordingBatch(selected, {
    root: process.cwd(), cache: resolve(process.cwd(), ".cache/yo-premium-recordings"),
    supabaseUrl: cfg.supabaseUrl, serviceRoleKey: cfg.serviceRoleKey, bucket: cfg.bucket,
    apiKey: cfg.openAiApiKey, ffmpeg: process.env.FFMPEG_PATH || "ffmpeg", budgetMicroUsd: options.budgetMicroUsd!,
  });
  console.log(JSON.stringify(result));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error("Premium recording stopped. Check the explicit budget, server credentials, local encoder and cached validation evidence. No automatic paid retry."); process.exitCode = 1; });
}
