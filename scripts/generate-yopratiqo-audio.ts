/**
 * YoPratiqo — pre-generated audio pipeline (server / local only).
 *
 * Reads `lib/yo/audio/audioManifest.ts`, asks OpenAI's text-to-speech
 * endpoint to produce an MP3 for every item that does not already
 * exist in the Supabase Storage `yopratiqo-audio` bucket, and uploads
 * the result. Idempotent — re-runs are cheap because existing objects
 * are skipped via a HEAD-style `list` probe.
 *
 * SECURITY (re-affirmed in code, not just docs):
 *   - This file is invoked by `npm run generate:yopratiqo-audio` and
 *     `tsx scripts/generate-yopratiqo-audio.ts`. It NEVER ships in the
 *     browser bundle. It is not imported by any `app/`, `components/`,
 *     or `lib/yo/audio/audioUrl.ts` module (those are what the client
 *     touches).
 *   - Reads `OPENAI_API_KEY` (server-only, must NEVER appear in
 *     `NEXT_PUBLIC_*`) and `SUPABASE_SERVICE_ROLE_KEY` (server-only).
 *     Both are loaded from `.env.local` via `dotenv`, the same way the
 *     other server scripts in this repo do.
 *   - Exits non-zero on missing config so accidental CI runs without
 *     credentials surface immediately.
 *
 * MODEL / VOICE:
 *   The defaults below match OpenAI's documented TTS API
 *   (`POST /v1/audio/speech`). Override at runtime via env if needed:
 *
 *     - `YOPRATIQO_TTS_MODEL`  (default: `gpt-4o-mini-tts`)
 *     - `YOPRATIQO_TTS_VOICE`  (default: `alloy`)
 *     - `YOPRATIQO_AUDIO_BUCKET` (default: `yopratiqo-audio`)
 *
 *   Both `tts-1` / `tts-1-hd` and `gpt-4o-mini-tts` accept the same
 *   `voice` set: `alloy | echo | fable | onyx | nova | shimmer` plus
 *   newer steerable voices. We use `alloy` because it sounds natural
 *   for short Spanish vocabulary and is documented as broadly stable.
 *
 * USAGE:
 *
 *     # Dry run (default — show what *would* happen, no network calls):
 *     tsx scripts/generate-yopratiqo-audio.ts --dry-run
 *
 *     # Real run — generate missing MP3s + upload to the bucket:
 *     OPENAI_API_KEY=sk-... \
 *     NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co \
 *     SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *       tsx scripts/generate-yopratiqo-audio.ts
 *
 *     # Re-generate even when the object exists (force overwrite):
 *     tsx scripts/generate-yopratiqo-audio.ts --force
 *
 * EXIT CODES:
 *   0  success (or dry-run finished cleanly)
 *   1  fatal config error (missing env, bad bucket, network failure
 *      during a non-dry run)
 */

import "dotenv/config";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  YOPRATIQO_AUDIO_BUCKET_DEFAULT,
  YOPRATIQO_AUDIO_MANIFEST,
  type YoAudioItem,
} from "../lib/yo/audio/audioManifest";

// ─────────────────────────────────────────────────────────────────────
// Constants — keep TTS model + voice in one place so a future tweak is
// a single-line change.
// ─────────────────────────────────────────────────────────────────────

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts" as const;
const DEFAULT_TTS_VOICE = "alloy" as const;
const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech" as const;
const RESPONSE_FORMAT = "mp3" as const;
const CONTENT_TYPE = "audio/mpeg" as const;

// ─────────────────────────────────────────────────────────────────────
// CLI flag parsing (zero-deps)
// ─────────────────────────────────────────────────────────────────────

interface CliOptions {
  dryRun: boolean;
  force: boolean;
}

function parseCli(argv: readonly string[]): CliOptions {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const force = argv.includes("--force") || argv.includes("-f");
  return { dryRun, force };
}

// ─────────────────────────────────────────────────────────────────────
// Tiny structured logger (TAP-ish so it slots into existing scripts)
// ─────────────────────────────────────────────────────────────────────

const log = {
  info: (msg: string) => console.log(`[yo-audio] ${msg}`),
  ok: (msg: string) => console.log(`ok - ${msg}`),
  skip: (msg: string) => console.log(`skip - ${msg}`),
  error: (msg: string) => console.error(`not ok - ${msg}`),
};

function failFatal(msg: string): never {
  log.error(`FATAL: ${msg}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────
// Env validation
// ─────────────────────────────────────────────────────────────────────

interface ResolvedConfig {
  openAiApiKey: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  model: string;
  voice: string;
}

function resolveConfig(opts: CliOptions): ResolvedConfig {
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket =
    process.env.YOPRATIQO_AUDIO_BUCKET?.trim() ||
    YOPRATIQO_AUDIO_BUCKET_DEFAULT;
  const model = process.env.YOPRATIQO_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voice = process.env.YOPRATIQO_TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;

  if (!supabaseUrl) {
    failFatal(
      "NEXT_PUBLIC_SUPABASE_URL is required (set in .env.local). The script needs it to upload via the Supabase REST API.",
    );
  }
  if (!serviceRoleKey) {
    failFatal(
      "SUPABASE_SERVICE_ROLE_KEY is required (set in .env.local). NEVER expose this key to the browser.",
    );
  }

  // OpenAI is only required when we actually call the API. Allow a dry
  // run without it so contributors can preview manifest plans without
  // ever needing a real key.
  if (!opts.dryRun && !openAiApiKey) {
    failFatal(
      "OPENAI_API_KEY is required for a real run (set in .env.local). Run with --dry-run to preview the plan without an API key.",
    );
  }

  return {
    openAiApiKey: openAiApiKey ?? "",
    supabaseUrl,
    serviceRoleKey,
    bucket,
    model,
    voice,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Manifest pre-flight: catch slug collisions / bad paths up front so a
// half-failed batch upload does not corrupt the bucket.
// ─────────────────────────────────────────────────────────────────────

function preflightManifest(items: readonly YoAudioItem[]): void {
  const ids = new Map<string, YoAudioItem>();
  const paths = new Map<string, YoAudioItem>();

  for (const item of items) {
    if (!item.storagePath.endsWith(".mp3")) {
      failFatal(`Manifest item ${item.id} storagePath does not end in .mp3 (${item.storagePath})`);
    }
    if (/\s/.test(item.storagePath)) {
      failFatal(`Manifest item ${item.id} storagePath contains whitespace (${item.storagePath})`);
    }
    if (item.storagePath !== item.storagePath.toLowerCase()) {
      failFatal(`Manifest item ${item.id} storagePath must be lowercase (${item.storagePath})`);
    }
    const existingId = ids.get(item.id);
    if (existingId) {
      failFatal(`Manifest duplicate id "${item.id}" — collision between texts ${JSON.stringify(existingId.text)} and ${JSON.stringify(item.text)}`);
    }
    const existingPath = paths.get(item.storagePath);
    if (existingPath) {
      failFatal(`Manifest duplicate storagePath "${item.storagePath}" — collision between ids ${existingPath.id} and ${item.id}`);
    }
    ids.set(item.id, item);
    paths.set(item.storagePath, item);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Supabase Storage helpers (service-role key — server-only)
// ─────────────────────────────────────────────────────────────────────

function makeSupabaseAdmin(cfg: ResolvedConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function objectExists(
  supabase: SupabaseClient,
  bucket: string,
  storagePath: string,
): Promise<boolean> {
  // Supabase Storage v2 exposes `list(prefix)`; we list the file's parent
  // and look for the matching name. This avoids depending on the
  // signed/public download API for an existence check.
  const lastSlash = storagePath.lastIndexOf("/");
  const prefix = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { search: fileName, limit: 100 });
  if (error) {
    // A missing folder surfaces as 404-ish; treat as "does not exist"
    // so the script can still upload it. Any other error is fatal so
    // we don't silently skip real failures.
    if (/not\s*found/i.test(error.message)) return false;
    throw new Error(`Supabase storage list failed for ${storagePath}: ${error.message}`);
  }
  return Boolean(data?.some((row) => row.name === fileName));
}

async function uploadMp3(
  supabase: SupabaseClient,
  bucket: string,
  storagePath: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, new Uint8Array(buffer), {
      contentType: CONTENT_TYPE,
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });
  if (error) {
    throw new Error(`Supabase storage upload failed for ${storagePath}: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// OpenAI TTS call — direct fetch against the documented REST endpoint.
// We avoid pulling the openai SDK as a dep because nothing else in the
// repo needs it and the API surface here is just one POST.
// ─────────────────────────────────────────────────────────────────────

async function generateMp3(
  cfg: ResolvedConfig,
  item: YoAudioItem,
): Promise<ArrayBuffer> {
  const res = await fetch(OPENAI_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      input: item.text,
      voice: cfg.voice,
      response_format: RESPONSE_FORMAT,
    }),
  });
  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new Error(
      `OpenAI TTS failed for ${item.id} (${res.status} ${res.statusText}): ${detail}`,
    );
  }
  return res.arrayBuffer();
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 600);
  } catch {
    return "(could not read response body)";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseCli(process.argv.slice(2));
  const cfg = resolveConfig(opts);

  preflightManifest(YOPRATIQO_AUDIO_MANIFEST);

  log.info(
    `bucket=${cfg.bucket} model=${cfg.model} voice=${cfg.voice} items=${
      YOPRATIQO_AUDIO_MANIFEST.length
    } mode=${opts.dryRun ? "dry-run" : "live"}${opts.force ? " force=on" : ""}`,
  );

  const supabase = makeSupabaseAdmin(cfg);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    let exists = false;
    try {
      exists = await objectExists(supabase, cfg.bucket, item.storagePath);
    } catch (err) {
      if (opts.dryRun) {
        // Dry run is allowed to lose its bucket connection (e.g. tests
        // running with placeholder env values). Treat as missing.
        exists = false;
      } else {
        log.error(`exists-check failed: ${item.id} :: ${(err as Error).message}`);
        failed += 1;
        continue;
      }
    }

    if (exists && !opts.force) {
      log.skip(`exists ${item.id} → ${item.storagePath}`);
      skipped += 1;
      continue;
    }

    if (opts.dryRun) {
      log.info(
        `would generate ${item.id} (${item.type}, "${item.text}") → ${item.storagePath}`,
      );
      generated += 1;
      continue;
    }

    try {
      const mp3 = await generateMp3(cfg, item);
      await uploadMp3(supabase, cfg.bucket, item.storagePath, mp3);
      log.ok(`generated ${item.id} → ${item.storagePath} (${mp3.byteLength} bytes)`);
      generated += 1;
    } catch (err) {
      log.error(`${item.id} :: ${(err as Error).message}`);
      failed += 1;
    }
  }

  log.info(
    `summary: generated=${generated} skipped=${skipped} failed=${failed} total=${YOPRATIQO_AUDIO_MANIFEST.length}`,
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  log.error(`unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
