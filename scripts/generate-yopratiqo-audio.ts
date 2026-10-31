/**
 * YoPratiqo pre-generated MP3s: OpenAI Speech API -> Supabase Storage.
 * Server/local only; never import this script from the application.
 *
 * Examples (use node --import tsx when the tsx CLI cannot open its IPC socket):
 *   node --import tsx scripts/generate-yopratiqo-audio.ts --module japanese-foundations --dry-run
 *   node --import tsx scripts/generate-yopratiqo-audio.ts --module japanese-foundations --limit 3
 *   node --import tsx scripts/generate-yopratiqo-audio.ts --module japanese-foundations --verify-only
 *
 * An invocation without flags retains the existing live whole-manifest behavior.
 * --dry-run is genuinely offline: no SDK, .env files, credentials, disk writes,
 * network or uploads. --verify-only needs only NEXT_PUBLIC_SUPABASE_URL.
 * Live generation needs OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY as well.
 * Neither secret may ever be mirrored into a NEXT_PUBLIC_* variable.
 *
 * The cache (default .cache/yopratiqo-audio) stores each validated MP3 and its
 * request/content hashes BEFORE upload. A failed upload resumes from that file.
 * --force permits overwriting storage; it still reuses a matching cached request.
 * Change the manifest version/path and generation request to revise recordings.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  YOPRATIQO_AUDIO_BUCKET_DEFAULT,
  YOPRATIQO_AUDIO_MANIFEST,
  type YoAudioItem,
} from "../lib/yo/audio/audioManifest";
import { getYoAudioAccentProfile } from "../lib/yo/audio/accentProfiles";

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "alloy";
const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const CONTENT_TYPE = "audio/mpeg";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_ATTEMPTS = 3;

export interface CliOptions {
  dryRun: boolean;
  force: boolean;
  verifyOnly: boolean;
  help: boolean;
  moduleId?: string;
  limit?: number;
  cacheDir?: string;
}

export function parseCli(argv: readonly string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, force: false, verifyOnly: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run" || arg === "-n") opts.dryRun = true;
    else if (arg === "--force" || arg === "-f") opts.force = true;
    else if (arg === "--verify-only") opts.verifyOnly = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (["--module", "--limit", "--cache-dir"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new AudioPipelineError(`${arg} requires a value.`);
      if (arg === "--module") {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new AudioPipelineError("Invalid module id.");
        opts.moduleId = value;
      } else if (arg === "--limit") {
        if (!/^[1-9][0-9]*$/.test(value) || Number(value) > 10000) {
          throw new AudioPipelineError("--limit must be an integer from 1 to 10000.");
        }
        opts.limit = Number(value);
      } else opts.cacheDir = value;
    } else throw new AudioPipelineError(`Unknown option: ${arg.split("=")[0]}`);
  }
  if (opts.dryRun && opts.verifyOnly) throw new AudioPipelineError("Choose --dry-run or --verify-only.");
  if (opts.verifyOnly && opts.force) throw new AudioPipelineError("--verify-only cannot overwrite files.");
  return opts;
}

export class AudioPipelineError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AudioPipelineError";
  }
}

export interface ResolvedConfig {
  openAiApiKey: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  model: string;
  voiceOverride?: string;
  cacheDir: string;
}

export function resolveConfig(
  opts: CliOptions,
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd = process.cwd(),
): ResolvedConfig {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ?? "";
  const openAiApiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!opts.dryRun) {
    if (!supabaseUrl) throw new AudioPipelineError("NEXT_PUBLIC_SUPABASE_URL is required.");
    let url: URL;
    try { url = new URL(supabaseUrl); } catch { throw new AudioPipelineError("Invalid Supabase URL."); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
        url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new AudioPipelineError("Supabase URL must be an HTTPS origin (HTTP is allowed only for localhost).");
    }
    if (!opts.verifyOnly && !serviceRoleKey) throw new AudioPipelineError("SUPABASE_SERVICE_ROLE_KEY is required for upload; never expose it to the browser.");
    if (!opts.verifyOnly && !openAiApiKey) throw new AudioPipelineError("OPENAI_API_KEY is required for generation. Use --dry-run for an offline plan.");
  }
  const bucket = env.YOPRATIQO_AUDIO_BUCKET?.trim() || YOPRATIQO_AUDIO_BUCKET_DEFAULT;
  const model = env.YOPRATIQO_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voiceOverride = env.YOPRATIQO_TTS_VOICE?.trim() || undefined;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(bucket)) throw new AudioPipelineError("Invalid bucket name.");
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(model) || (voiceOverride && !/^[a-zA-Z0-9._-]{1,120}$/.test(voiceOverride))) {
    throw new AudioPipelineError("Invalid TTS model or voice identifier.");
  }
  return {
    openAiApiKey, supabaseUrl, serviceRoleKey, bucket, model, voiceOverride,
    cacheDir: resolve(cwd, opts.cacheDir || env.YOPRATIQO_AUDIO_CACHE_DIR || ".cache/yopratiqo-audio"),
  };
}

export function preflightManifest(items: readonly YoAudioItem[]): void {
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) throw new AudioPipelineError("Manifest contains an empty or duplicate id.");
    if (!/^yo\/[a-z0-9/_-]+\.mp3$/.test(item.storagePath) || item.storagePath.split("/").includes("..") || paths.has(item.storagePath)) {
      throw new AudioPipelineError(`Manifest contains an unsafe or duplicate MP3 path for ${item.id}.`);
    }
    const spoken = resolveSpokenText(item);
    if (!spoken.trim() || spoken.length > 4096) throw new AudioPipelineError(`Invalid speech input length for ${item.id}.`);
    getYoAudioAccentProfile(item.accentProfile);
    ids.add(item.id);
    paths.add(item.storagePath);
  }
}

export function selectItems(items: readonly YoAudioItem[], opts: CliOptions): YoAudioItem[] {
  preflightManifest(items);
  const selected = items.filter((item) => !opts.moduleId || item.moduleId === opts.moduleId);
  if (!selected.length) throw new AudioPipelineError("No manifest items match the requested module.");
  return opts.limit ? selected.slice(0, opts.limit) : selected;
}

export function modelSupportsInstructions(model: string): boolean {
  return /^gpt-(?:4o|5)(?:-[a-z0-9]+)*-tts(?:-\d{4}-\d{2}-\d{2})?$/i.test(model);
}

export function resolveSpokenText(item: YoAudioItem): string {
  return item.spokenText?.trim() || item.text;
}

export function appendPronunciationHint(instructions: string, hint: string | undefined): string {
  return hint?.trim() ? `${instructions}\n\nPronunciation note for this exact item: ${hint.trim()}` : instructions;
}

export function resolveSpeechRequest(cfg: ResolvedConfig, item: YoAudioItem) {
  const profile = getYoAudioAccentProfile(item.accentProfile);
  const voice = cfg.voiceOverride || profile.defaultVoice || DEFAULT_TTS_VOICE;
  const request: { model: string; input: string; voice: string; response_format: "mp3"; instructions?: string } = {
    model: cfg.model,
    input: resolveSpokenText(item),
    voice,
    response_format: "mp3",
  };
  if (modelSupportsInstructions(cfg.model)) {
    request.instructions = appendPronunciationHint(item.ttsInstructions ?? profile.ttsInstructions, item.pronunciationHint);
  }
  return request;
}

type SpeechRequest = ReturnType<typeof resolveSpeechRequest>;
export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Structural MP3 validation, not a human pronunciation or full decode assessment. */
export function validateMp3(bytes: Uint8Array, contentType = CONTENT_TYPE): { frames: number; durationSeconds: number } {
  if (!/^audio\/(?:mpeg|mp3)(?:\s*;|$)/i.test(contentType)) throw new AudioPipelineError("Expected an audio/mpeg response.");
  if (bytes.byteLength < 256 || bytes.byteLength > MAX_AUDIO_BYTES) throw new AudioPipelineError("MP3 byte length is outside the allowed range.");
  let offset = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    if ([bytes[6], bytes[7], bytes[8], bytes[9]].some((byte) => byte > 0x7f)) throw new AudioPipelineError("Invalid MP3 ID3 header.");
    offset = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]);
    if (bytes[3] === 4 && (bytes[5] & 0x10)) offset += 10;
    if (offset > bytes.length) throw new AudioPipelineError("Truncated MP3 ID3 tag.");
  }
  // ID3v1 is an optional, exactly 128-byte trailing tag. Arbitrary trailing
  // padding, broken frame headers and partial frames are not valid audio.
  let audioEnd = bytes.length;
  const tagStart = bytes.length - 128;
  if (tagStart >= offset && bytes[tagStart] === 0x54 && bytes[tagStart + 1] === 0x41 && bytes[tagStart + 2] === 0x47) {
    audioEnd = tagStart;
  }
  let frames = 0;
  let durationSeconds = 0;
  while (offset < audioEnd) {
    if (offset + 4 > audioEnd) throw new AudioPipelineError("Truncated MP3 frame header.");
    const version = (bytes[offset + 1] >> 3) & 3;
    const layer = (bytes[offset + 1] >> 1) & 3;
    const bitRateIndex = bytes[offset + 2] >> 4;
    const rateIndex = (bytes[offset + 2] >> 2) & 3;
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0 || version === 1 || layer !== 1 || bitRateIndex === 0 || bitRateIndex === 15 || rateIndex === 3) {
      throw new AudioPipelineError("Invalid MPEG Layer III frame header or unsupported trailing data.");
    }
    const bitRates = version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const sampleRate = [44100, 48000, 32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const frameBytes = Math.floor((version === 3 ? 144 : 72) * bitRates[bitRateIndex] * 1000 / sampleRate) + ((bytes[offset + 2] >> 1) & 1);
    if (offset + frameBytes > audioEnd) throw new AudioPipelineError("Truncated MP3 frame.");
    frames += 1;
    durationSeconds += (version === 3 ? 1152 : 576) / sampleRate;
    offset += frameBytes;
  }
  if (frames < 2) throw new AudioPipelineError("MP3 does not contain consecutive complete MPEG Layer III frames.");
  return { frames, durationSeconds };
}

export interface RuntimeDependencies {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  timeoutMs: number;
  now: () => string;
  storageFactory?: (cfg: ResolvedConfig, network: typeof fetch) => Promise<StorageAdapter>;
}

export interface StorageAdapter {
  exists: (path: string) => Promise<boolean>;
  upload: (path: string, bytes: Uint8Array, upsert: boolean) => Promise<"uploaded" | "already-exists">;
}

function defaults(overrides: Partial<RuntimeDependencies>): RuntimeDependencies {
  return {
    fetch: globalThis.fetch,
    sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    log: (message) => console.log(`[yo-audio] ${message}`),
    timeoutMs: 30000,
    now: () => new Date().toISOString(),
    ...overrides,
  };
}

/** Read responses within a timeout and size bound, retry only explicit 429/5xx.
 * A transport timeout may follow a charged TTS request; do not blindly repeat it.
 * Raw remote error bodies, request headers and credentials are never logged.
 */
export function boundedFetch(deps: RuntimeDependencies): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
      let response: Response;
      let bytes: Uint8Array;
      try {
        response = await deps.fetch(input, { ...init, signal: controller.signal, redirect: "error" });
        if (Number(response.headers.get("content-length")) > MAX_AUDIO_BYTES) throw new AudioPipelineError("Response exceeds the maximum byte size.");
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (reader) {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > MAX_AUDIO_BYTES) {
              await reader.cancel();
              throw new AudioPipelineError("Response exceeds the maximum byte size.");
            }
            chunks.push(chunk.value);
          }
        }
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      } catch (error) {
        if (error instanceof AudioPipelineError) throw error;
        throw new AudioPipelineError(controller.signal.aborted ? "Request timed out; check the cache and provider before retrying generation." : "Network request failed; no automatic retry of an uncertain request.");
      } finally { clearTimeout(timer); }
      if ((response.status === 429 || response.status >= 500) && attempt + 1 < MAX_REQUEST_ATTEMPTS) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 500 * 2 ** attempt;
        await deps.sleep(delay);
        continue;
      }
      return new Response([204, 205, 304].includes(response.status) ? null : new Uint8Array(bytes).buffer, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
    }
    throw new AudioPipelineError("Request retry limit exhausted.");
  };
}

/** storage-js separates HTTP status from semantic statusCode (e.g. AccessDenied). */
export function storageErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const fields = error as { status?: unknown; statusCode?: unknown };
  for (const value of [fields.status, fields.statusCode]) {
    const numeric = typeof value === "number" ? value : typeof value === "string" && /^\d{3}$/.test(value) ? Number(value) : NaN;
    if (Number.isInteger(numeric) && numeric >= 100 && numeric <= 599) return numeric;
  }
  return undefined;
}

async function makeSupabaseStorage(cfg: ResolvedConfig, network: typeof fetch): Promise<StorageAdapter> {
  // Dynamic import keeps an offline plan usable without this installed SDK.
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: network },
  });
  const bucket = supabase.storage.from(cfg.bucket);
  return {
    async exists(storagePath) {
      const lastSlash = storagePath.lastIndexOf("/");
      const name = storagePath.slice(lastSlash + 1);
      const { data, error } = await bucket.list(storagePath.slice(0, lastSlash), { search: name, limit: 100 });
      if (error) throw new AudioPipelineError(`Storage listing failed (HTTP ${storageErrorStatus(error) || "unknown"}).`, storageErrorStatus(error));
      return Boolean(data?.some((row) => row.name === name));
    },
    async upload(storagePath, bytes, upsert) {
      const { error } = await bucket.upload(storagePath, bytes, {
        contentType: CONTENT_TYPE,
        upsert,
        cacheControl: "31536000",
      });
      if (error && storageErrorStatus(error) === 409 && !upsert) return "already-exists";
      if (error) throw new AudioPipelineError(`Storage upload failed (HTTP ${storageErrorStatus(error) || "unknown"}).`, storageErrorStatus(error));
      return "uploaded";
    },
  };
}

export interface CachedRecording {
  bytes: Uint8Array;
  metadata: {
    version: 1;
    requestHash: string;
    sha256: string;
    bytes: number;
    createdAt: string;
    request: SpeechRequest;
  };
}

function requestHash(request: SpeechRequest): string { return sha256(JSON.stringify(request)); }

export async function readCachedRecording(cacheDir: string, request: SpeechRequest): Promise<CachedRecording | null> {
  const hash = requestHash(request);
  const directory = join(cacheDir, "recordings", hash);
  try { await stat(directory); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new AudioPipelineError("Cannot inspect the local recording cache.");
  }
  try {
    const bytes = new Uint8Array(await readFile(join(directory, "audio.mp3")));
    const metadata = JSON.parse(await readFile(join(directory, "metadata.json"), "utf8")) as CachedRecording["metadata"];
    validateMp3(bytes);
    if (metadata.version !== 1 || metadata.requestHash !== hash || requestHash(metadata.request) !== hash || metadata.sha256 !== sha256(bytes) || metadata.bytes !== bytes.length) {
      throw new Error("cache mismatch");
    }
    return { bytes, metadata };
  } catch { throw new AudioPipelineError("Recording cache is incomplete or has a hash mismatch; inspect it before regenerating."); }
}

async function writeDurableFile(path: string, bytes: Uint8Array | string): Promise<void> {
  const file = await open(path, "wx", 0o600);
  try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
}

export async function cacheRecording(cacheDir: string, request: SpeechRequest, bytes: Uint8Array, createdAt: string): Promise<CachedRecording> {
  validateMp3(bytes);
  const hash = requestHash(request);
  const parent = join(cacheDir, "recordings");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const temporary = join(parent, `.pending-${randomUUID()}`);
  await mkdir(temporary, { mode: 0o700 });
  const metadata: CachedRecording["metadata"] = { version: 1, requestHash: hash, sha256: sha256(bytes), bytes: bytes.length, createdAt, request };
  try {
    await writeDurableFile(join(temporary, "audio.mp3"), bytes);
    await writeDurableFile(join(temporary, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
    await rename(temporary, join(parent, hash));
  } finally { await rm(temporary, { recursive: true, force: true }); }
  return { bytes, metadata };
}

export function publicAudioUrl(cfg: ResolvedConfig, item: YoAudioItem): string {
  return `${cfg.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${item.storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

async function verifyPublic(cfg: ResolvedConfig, item: YoAudioItem, network: typeof fetch, expectedSha?: string) {
  const response = await network(publicAudioUrl(cfg, item), { method: "GET" });
  if (!response.ok) throw new AudioPipelineError(`Public audio is unavailable (HTTP ${response.status}).`, response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const details = validateMp3(bytes, response.headers.get("content-type") || "");
  const hash = sha256(bytes);
  if (expectedSha && expectedSha !== hash) throw new AudioPipelineError("Public audio hash does not match the cached generated recording; no overwrite attempted.");
  return { bytes: bytes.length, sha256: hash, durationSeconds: Number(details.durationSeconds.toFixed(3)) };
}

async function appendAudit(cacheDir: string, record: Record<string, unknown>): Promise<void> {
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });
  const file = await open(join(cacheDir, "runs.jsonl"), "a", 0o600);
  try { await file.writeFile(JSON.stringify(record) + "\n"); await file.sync(); } finally { await file.close(); }
}

function safeError(error: unknown): string {
  return error instanceof AudioPipelineError ? error.message : "Local operation failed; inspect the cache and configuration.";
}

export interface RunSummary { selected: number; generated: number; cached: number; uploaded: number; skipped: number; verified: number; failed: number; }

export async function runAudioPipeline(
  manifest: readonly YoAudioItem[], opts: CliOptions, cfg: ResolvedConfig,
  overrides: Partial<RuntimeDependencies> = {},
): Promise<RunSummary> {
  const deps = defaults(overrides);
  const items = selectItems(manifest, opts);
  const summary: RunSummary = { selected: items.length, generated: 0, cached: 0, uploaded: 0, skipped: 0, verified: 0, failed: 0 };
  const mode = opts.dryRun ? "dry-run" : opts.verifyOnly ? "verify-only" : "live";
  deps.log(`mode=${mode} module=${opts.moduleId || "all"} bucket=${cfg.bucket} selected=${items.length}`);
  if (opts.dryRun) {
    let characters = 0;
    for (const item of items) {
      const request = resolveSpeechRequest(cfg, item);
      characters += request.input.length;
      deps.log(`would generate ${item.id} lang=${item.targetLanguage} accent=${item.accentProfile} model=${request.model} voice=${request.voice} inputCharacters=${request.input.length} -> ${item.storagePath}`);
    }
    deps.log(`offline plan: ${items.length} items, ${characters} input characters; storage presence and generation costs are not checked.`);
    return summary;
  }

  const network = boundedFetch(deps);
  let releaseLock: (() => Promise<void>) | undefined;
  try {
    let storage: StorageAdapter | undefined;
    if (!opts.verifyOnly) {
      await mkdir(cfg.cacheDir, { recursive: true, mode: 0o700 });
      const lockPath = join(cfg.cacheDir, "generation.lock");
      let lock;
      try { lock = await open(lockPath, "wx", 0o600); }
      catch { throw new AudioPipelineError("The recording cache is locked or unwritable. Confirm no generator is running before removing generation.lock."); }
      releaseLock = () => rm(lockPath, { force: true });
      try { await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: deps.now() })); }
      finally { await lock.close(); }
      storage = await (deps.storageFactory || makeSupabaseStorage)(cfg, network);
    }

    for (const item of items) {
      const request = resolveSpeechRequest(cfg, item);
      try {
        let cached = await readCachedRecording(cfg.cacheDir, request);
        if (opts.verifyOnly || (!opts.force && await storage!.exists(item.storagePath))) {
          const verified = await verifyPublic(cfg, item, network, cached?.metadata.sha256);
          summary.verified += 1;
          if (!opts.verifyOnly) summary.skipped += 1;
          await appendAudit(cfg.cacheDir, { at: deps.now(), mode, id: item.id, bucket: cfg.bucket, path: item.storagePath, status: "verified", provenance: cached ? "matching-cached-generation" : "existing-recording-unattributed", ...verified });
          deps.log(`verified ${item.id} bytes=${verified.bytes} sha256=${verified.sha256}`);
          continue;
        }
        if (cached) summary.cached += 1;
        else {
          const response = await network(OPENAI_TTS_ENDPOINT, {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.openAiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(request),
          });
          if (!response.ok) throw new AudioPipelineError(`OpenAI speech generation failed (HTTP ${response.status}).`, response.status);
          const bytes = new Uint8Array(await response.arrayBuffer());
          validateMp3(bytes, response.headers.get("content-type") || "");
          cached = await cacheRecording(cfg.cacheDir, request, bytes, deps.now());
          summary.generated += 1;
          deps.log(`generated ${item.id} lang=${item.targetLanguage} accent=${item.accentProfile} model=${request.model} voice=${request.voice} bytes=${bytes.length}; cached before upload`);
        }
        const uploaded = await storage!.upload(item.storagePath, cached.bytes, opts.force);
        if (uploaded === "uploaded") summary.uploaded += 1;
        const verified = await verifyPublic(cfg, item, network, cached.metadata.sha256);
        summary.verified += 1;
        await appendAudit(cfg.cacheDir, { at: deps.now(), mode, id: item.id, bucket: cfg.bucket, path: item.storagePath, status: uploaded === "uploaded" ? "uploaded-and-verified" : "concurrent-upload-verified", requestHash: cached.metadata.requestHash, model: request.model, voice: request.voice, ...verified });
        deps.log(`verified ${item.id} bytes=${verified.bytes} sha256=${verified.sha256}`);
      } catch (error) {
        summary.failed += 1;
        deps.log(`failed ${item.id}: ${safeError(error)}`);
        await appendAudit(cfg.cacheDir, { at: deps.now(), mode, id: item.id, bucket: cfg.bucket, path: item.storagePath, status: "failed", error: safeError(error) });
        if (error instanceof AudioPipelineError && [401, 403].includes(error.status || 0)) {
          deps.log("Stopped: authentication/authorization failed; no further items attempted.");
          break;
        }
      }
    }
  } finally { if (releaseLock) await releaseLock(); }
  deps.log(`summary ${JSON.stringify(summary)}`);
  return summary;
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv.slice(2));
  if (opts.help) {
    console.log("Usage: generate-yopratiqo-audio.ts [--module ID] [--limit N] [--dry-run | --verify-only] [--force] [--cache-dir PATH]\nNo flags: generate all missing manifest entries. --force permits overwrite using the matching cached request.\n--dry-run: offline plan, no credentials or network. --verify-only: public MP3 GET and hash checks, no generation/upload.\nCache: YOPRATIQO_AUDIO_CACHE_DIR or .cache/yopratiqo-audio. Never commit this cache or .env files.");
    return;
  }
  if (!opts.dryRun) {
    const { loadEnvConfig } = await import("@next/env");
    loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", { info: () => undefined, error: () => undefined });
  }
  const summary = await runAudioPipeline(YOPRATIQO_AUDIO_MANIFEST, opts, resolveConfig(opts));
  if (summary.failed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(`[yo-audio] ${safeError(error)}`); process.exitCode = 1; });
}
