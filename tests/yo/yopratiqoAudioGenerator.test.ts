import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { YoAudioItem } from "@/lib/yo/audio/audioManifest";
import {
  AudioPipelineError, boundedFetch, cacheRecording, modelSupportsInstructions,
  parseCli, readCachedRecording, resolveConfig, resolveSpeechRequest,
  runAudioPipeline, selectItems, sha256, storageErrorStatus, validateMp3,
  type RuntimeDependencies, type StorageAdapter,
} from "../../scripts/generate-yopratiqo-audio";

const item: YoAudioItem = {
  id: "jp-audio-test", targetLanguage: "ja", moduleId: "japanese-foundations", lessonId: "v1",
  type: "word", text: "日本語", spokenText: "にほんご", pronunciationHint: "Read にほんご once.",
  storagePath: "yo/ja/japanese-foundations/v1/japanese-standard/word/nihongo.mp3",
  accentProfile: "japanese_standard",
};
const other: YoAudioItem = { ...item, id: "jp-intro-test", moduleId: "japanese-intro", storagePath: "yo/ja/japanese-intro/intro/japanese-standard/word/nihongo.mp3" };
const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", OPENAI_API_KEY: "test-openai-secret", SUPABASE_SERVICE_ROLE_KEY: "test-storage-secret" };
function mp3(seed = 0) {
  // Three complete MPEG1 Layer III frames: 128 kbps, 44.1 kHz, 417 bytes/frame.
  const bytes = new Uint8Array(417 * 3).fill(seed);
  for (let i = 0; i < 3; i += 1) bytes.set([0xff, 0xfb, 0x90, 0], i * 417);
  return bytes;
}
function response(bytes = mp3()) { return new Response(bytes, { headers: { "content-type": "audio/mpeg" } }); }
function dependencies(extra: Partial<RuntimeDependencies> = {}): RuntimeDependencies {
  return {
    fetch: async () => { throw new Error("Unexpected network call"); },
    sleep: async () => undefined, log: () => undefined, timeoutMs: 1000,
    now: () => "2026-10-30T20:00:00.000Z", ...extra,
  };
}
async function temporary(fn: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "yo-audio-generator-test-"));
  try { await fn(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

void test("CLI selects an exact module and a positive bounded canary; no flags preserves live mode", () => {
  assert.equal(parseCli([]).dryRun, false);
  const opts = parseCli(["--module", "japanese-foundations", "--limit", "1"]);
  assert.deepEqual(selectItems([other, item], opts), [item]);
  assert.throws(() => parseCli(["--limit", "0"]), /--limit/);
  assert.throws(() => parseCli(["--limit", "1.5"]), /--limit/);
  assert.throws(() => parseCli(["--limit", "10001"]), /--limit/);
  assert.throws(() => parseCli(["--modul", "japanese-foundations"]), /Unknown option/);
  assert.throws(() => parseCli(["--module"]), /requires a value/);
  assert.throws(() => parseCli(["--verify-only", "--force"]), /cannot overwrite/);
  assert.throws(() => parseCli(["--verify-only", "--dry-run"]), /Choose/);
  assert.throws(() => selectItems([item], { ...opts, moduleId: "japanese" }), /No manifest/);
});

void test("offline dry run needs no env, SDK, network, cache or upload", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--dry-run", "--module", "japanese-foundations"]);
    const logs: string[] = [];
    const cfg = resolveConfig(opts, {}, directory);
    const summary = await runAudioPipeline([item, other], opts, cfg, dependencies({
      storageFactory: async () => { throw new Error("SDK must not load"); }, log: (line) => logs.push(line),
    }));
    assert.equal(summary.selected, 1);
    assert.equal(summary.generated, 0);
    assert.deepEqual(await readdir(directory), []);
    assert.match(logs.join("\n"), /storage presence and generation costs are not checked/);
  });
});

void test("verify-only requires the public URL, while live requires both server secrets", () => {
  const verify = parseCli(["--verify-only"]);
  assert.equal(resolveConfig(verify, { NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL }).serviceRoleKey, "");
  assert.throws(() => resolveConfig(verify, {}), /NEXT_PUBLIC_SUPABASE_URL/);
  assert.throws(() => resolveConfig(parseCli([]), { NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL }), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.throws(() => resolveConfig(parseCli([]), { NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: "test" }), /OPENAI_API_KEY/);
  assert.throws(() => resolveConfig(verify, { NEXT_PUBLIC_SUPABASE_URL: "https://secret@example.com" }), /HTTPS origin/);
  assert.throws(() => resolveConfig(verify, { NEXT_PUBLIC_SUPABASE_URL: "https://example.com/path" }), /HTTPS origin/);
});

void test("generation keeps pronunciation overrides, dated model instructions and profile voice", () => {
  const cfg = resolveConfig(parseCli(["--dry-run"]), { YOPRATIQO_TTS_MODEL: "gpt-4o-mini-tts-2025-12-15" });
  const request = resolveSpeechRequest(cfg, item);
  assert.equal(request.input, "にほんご");
  assert.equal(request.response_format, "mp3");
  assert.match(request.instructions || "", /Read にほんご once/);
  assert.ok(request.voice);
  assert.equal(modelSupportsInstructions("gpt-4o-mini-tts-2025-12-15"), true);
  assert.equal(modelSupportsInstructions("tts-1-hd"), false);
  assert.equal(resolveSpeechRequest({ ...cfg, model: "tts-1" }, item).instructions, undefined);
  assert.equal(resolveSpeechRequest({ ...cfg, voiceOverride: "coral" }, item).voice, "coral");
});

void test("manifest preflight rejects duplicate paths, traversal, empty speech and oversized text", () => {
  const opts = parseCli([]);
  assert.throws(() => selectItems([item, { ...item, id: "different" }], opts), /duplicate MP3/);
  assert.throws(() => selectItems([{ ...item, storagePath: "yo/ja/../../escape.mp3" }], opts), /unsafe/);
  assert.throws(() => selectItems([{ ...item, spokenText: undefined, text: "" }], opts), /speech input/);
  assert.throws(() => selectItems([{ ...item, spokenText: "あ".repeat(4097) }], opts), /speech input/);
});

void test("MP3 validation rejects JSON, mislabeled payloads and incomplete audio frames", () => {
  assert.equal(validateMp3(mp3()).frames, 3);
  assert.throws(() => validateMp3(mp3(), "application/json"), /audio\/mpeg/);
  assert.throws(() => validateMp3(new Uint8Array(900).fill(1)), /MPEG Layer III/);
  assert.throws(() => validateMp3(mp3().slice(0, -10)), /Truncated/);
  assert.throws(() => validateMp3(new Uint8Array(5 * 1024 * 1024 + 1)), /byte length/);
});

void test("bounded network retries only explicit 429 and 5xx, honoring a bounded delay", async () => {
  let calls = 0;
  const waits: number[] = [];
  const network = boundedFetch(dependencies({
    fetch: async () => ++calls < 3 ? new Response("hidden error", { status: calls === 1 ? 429 : 503, headers: { "retry-after": "900" } }) : response(),
    sleep: async (ms) => { waits.push(ms); },
  }));
  assert.equal((await network("https://example.com")).status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [10000, 10000]);
  calls = 0;
  const unauthorized = boundedFetch(dependencies({ fetch: async () => { calls += 1; return new Response("secret", { status: 401 }); } }));
  assert.equal((await unauthorized("https://example.com")).status, 401);
  assert.equal(calls, 1);
});

void test("network timeouts abort once without repeating a possibly charged speech request", async () => {
  let calls = 0;
  const network = boundedFetch(dependencies({ timeoutMs: 5, fetch: async (_input, init) => {
    calls += 1;
    return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("secret")), { once: true }));
  } }));
  await assert.rejects(() => network("https://api.openai.com/v1/audio/speech"), /timed out/);
  assert.equal(calls, 1);
});

void test("cache persists request/content hashes, checks integrity, and separates changed instructions", async () => {
  await temporary(async (directory) => {
    const request = resolveSpeechRequest(resolveConfig(parseCli(["--dry-run"]), {}), item);
    const recording = await cacheRecording(directory, request, mp3(), "2026-10-30");
    assert.equal(recording.metadata.sha256, sha256(mp3()));
    assert.deepEqual((await readCachedRecording(directory, request))?.bytes, mp3());
    assert.equal(await readCachedRecording(directory, { ...request, instructions: "different" }), null);
    await writeFile(join(directory, "recordings", recording.metadata.requestHash, "audio.mp3"), mp3(9));
    await assert.rejects(() => readCachedRecording(directory, request), /hash mismatch/);
  });
});

void test("generation is checkpointed before upload and failed uploads resume without a second OpenAI call", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--module", "japanese-foundations", "--cache-dir", directory]);
    const cfg = resolveConfig(opts, env);
    let generated = 0;
    let uploadAttempts = 0;
    const storage: StorageAdapter = {
      exists: async () => false,
      upload: async (_path, bytes, upsert) => {
        uploadAttempts += 1;
        assert.equal(upsert, false);
        assert.deepEqual((await readCachedRecording(directory, resolveSpeechRequest(cfg, item)))?.bytes, bytes);
        if (uploadAttempts === 1) throw new AudioPipelineError("Storage upload failed (HTTP 503).", 503);
        return "uploaded";
      },
    };
    const deps = dependencies({ storageFactory: async () => storage, fetch: async (url, init) => {
      if (String(url).includes("api.openai.com")) {
        generated += 1;
        assert.equal(init?.method, "POST");
        assert.equal((JSON.parse(String(init?.body)) as { input: string }).input, "にほんご");
      }
      return response();
    } });
    const first = await runAudioPipeline([item, other], opts, cfg, deps);
    assert.equal(first.failed, 1);
    assert.equal(first.generated, 1);
    const second = await runAudioPipeline([item, other], opts, cfg, deps);
    assert.equal(second.failed, 0);
    assert.equal(second.cached, 1);
    assert.equal(second.uploaded, 1);
    assert.equal(second.verified, 1);
    assert.equal(generated, 1);
    const audit = await readFile(join(directory, "runs.jsonl"), "utf8");
    assert.match(audit, /uploaded-and-verified/);
    assert.ok(!audit.includes(env.OPENAI_API_KEY));
    assert.ok(!audit.includes(env.SUPABASE_SERVICE_ROLE_KEY));
  });
});

void test("existing storage objects are verified and skipped, with no generation or overwrite", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--cache-dir", directory]);
    const summary = await runAudioPipeline([item], opts, resolveConfig(opts, env), dependencies({
      storageFactory: async () => ({ exists: async () => true, upload: async () => { throw new Error("Unexpected upload"); } }),
      fetch: async (url) => { assert.ok(!String(url).includes("api.openai.com")); return response(); },
    }));
    assert.equal(summary.skipped, 1);
    assert.equal(summary.verified, 1);
    assert.equal(summary.generated, 0);
  });
});

void test("verify-only reads public MP3s without server credentials or loading the Storage SDK", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--verify-only", "--cache-dir", directory]);
    const cfg = resolveConfig(opts, { NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL });
    const summary = await runAudioPipeline([item], opts, cfg, dependencies({
      storageFactory: async () => { throw new Error("Must not load SDK"); },
      fetch: async (url, init) => {
        assert.equal(String(url), `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/yopratiqo-audio/${item.storagePath}`);
        assert.equal(init?.method, "GET");
        assert.equal(init?.headers, undefined);
        return response();
      },
    }));
    assert.equal(summary.verified, 1);
    assert.equal(summary.generated, 0);
    assert.equal(summary.uploaded, 0);
    assert.match(await readFile(join(directory, "runs.jsonl"), "utf8"), /existing-recording-unattributed/);
  });
});

void test("force is required for an overwrite and a matching cached generation is still reused", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--force", "--cache-dir", directory]);
    const cfg = resolveConfig(opts, env);
    await cacheRecording(directory, resolveSpeechRequest(cfg, item), mp3(), "2026-10-30");
    const summary = await runAudioPipeline([item], opts, cfg, dependencies({
      storageFactory: async () => ({ exists: async () => true, upload: async (_path, _bytes, upsert) => { assert.equal(upsert, true); return "uploaded"; } }),
      fetch: async (url) => { assert.ok(!String(url).includes("api.openai.com")); return response(); },
    }));
    assert.equal(summary.cached, 1);
    assert.equal(summary.uploaded, 1);
    assert.equal(summary.generated, 0);
  });
});

void test("a concurrent storage collision is never overwritten and must match the generated file", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--cache-dir", directory]);
    const cfg = resolveConfig(opts, env);
    const summary = await runAudioPipeline([item], opts, cfg, dependencies({
      storageFactory: async () => ({ exists: async () => false, upload: async (_path, _bytes, upsert) => { assert.equal(upsert, false); return "already-exists"; } }),
      fetch: async (url) => response(String(url).includes("api.openai.com") ? mp3() : mp3(3)),
    }));
    assert.equal(summary.failed, 1);
    assert.equal(summary.uploaded, 0);
    assert.equal(summary.verified, 0);
  });
});

void test("authentication failure stops the batch without exposing remote error bodies or keys", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--cache-dir", directory]);
    const logs: string[] = [];
    let calls = 0;
    const summary = await runAudioPipeline([item, other], opts, resolveConfig(opts, env), dependencies({
      log: (line) => logs.push(line),
      storageFactory: async () => ({ exists: async () => false, upload: async () => { throw new Error("Unexpected upload"); } }),
      fetch: async () => { calls += 1; return new Response(`secret ${env.OPENAI_API_KEY}`, { status: 401 }); },
    }));
    assert.equal(summary.failed, 1);
    assert.equal(summary.generated, 0);
    assert.equal(calls, 1);
    assert.match(logs.join("\n"), /authentication\/authorization/);
    assert.ok(!logs.join("\n").includes(env.OPENAI_API_KEY));
    assert.ok(!logs.join("\n").includes(env.SUPABASE_SERVICE_ROLE_KEY));
    assert.ok(!(await readdir(directory)).includes("generation.lock"));
  });
});

void test("MP3 validation requires full frame coverage and only permits a complete final ID3v1 tag", () => {
  for (const tailLength of [1, 2, 3, 4, 100]) {
    const corrupt = new Uint8Array(mp3().length + tailLength).fill(123);
    corrupt.set(mp3());
    assert.throws(() => validateMp3(corrupt), /Truncated|Invalid MPEG/);
  }
  const truncatedHeader = new Uint8Array(mp3().length + 3);
  truncatedHeader.set(mp3());
  truncatedHeader.set([0xff, 0xfb, 0x90], mp3().length);
  assert.throws(() => validateMp3(truncatedHeader), /Truncated MP3 frame header/);
  const tagged = new Uint8Array(mp3().length + 128);
  tagged.set(mp3());
  tagged.set([0x54, 0x41, 0x47], mp3().length);
  assert.equal(validateMp3(tagged).frames, 3);
  assert.throws(() => validateMp3(tagged.slice(0, -1)), /Invalid MPEG/);
});

void test("Storage HTTP status takes precedence over semantic SDK error codes", async () => {
  const { StorageApiError } = await import("@supabase/storage-js");
  assert.equal(storageErrorStatus(new StorageApiError("Access denied", 403, "AccessDenied")), 403);
  assert.equal(storageErrorStatus(new StorageApiError("Already exists", 409, "ResourceAlreadyExists")), 409);
  assert.equal(storageErrorStatus({ status: 401, statusCode: "500" }), 401);
  assert.equal(storageErrorStatus({ status: NaN, statusCode: "403" }), 403);
  assert.equal(storageErrorStatus({ statusCode: "409" }), 409);
  assert.equal(storageErrorStatus({ statusCode: "AccessDenied" }), undefined);
  assert.equal(storageErrorStatus({ status: null }), undefined);
});

void test("real Storage SDK semantic AccessDenied errors stop after one item", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--cache-dir", directory]);
    let calls = 0;
    const summary = await runAudioPipeline([item, other], opts, resolveConfig(opts, env), dependencies({
      fetch: async (url) => {
        calls += 1;
        assert.ok(String(url).includes("/storage/v1/object/list/"));
        return new Response(JSON.stringify({ statusCode: "AccessDenied", message: "Access denied", error: "AccessDenied" }), { status: 403, headers: { "content-type": "application/json" } });
      },
    }));
    assert.equal(summary.failed, 1);
    assert.equal(summary.generated, 0);
    assert.equal(calls, 1);
  });
});

void test("real Storage SDK semantic collision verifies matching bytes without overwriting", async () => {
  await temporary(async (directory) => {
    const opts = parseCli(["--cache-dir", directory]);
    const cfg = resolveConfig(opts, env);
    await cacheRecording(directory, resolveSpeechRequest(cfg, item), mp3(), "2026-10-30");
    let uploads = 0;
    const summary = await runAudioPipeline([item], opts, cfg, dependencies({
      fetch: async (url, init) => {
        const path = String(url);
        if (path.includes("/object/list/")) return new Response("[]", { headers: { "content-type": "application/json" } });
        if (path.includes("/object/public/")) return response();
        assert.ok(path.includes("/storage/v1/object/yopratiqo-audio/"));
        assert.equal(init?.method, "POST");
        assert.equal(new Headers(init?.headers).get("x-upsert"), "false");
        uploads += 1;
        return new Response(JSON.stringify({ statusCode: "ResourceAlreadyExists", message: "Already exists", error: "ResourceAlreadyExists" }), { status: 409, headers: { "content-type": "application/json" } });
      },
    }));
    assert.equal(summary.failed, 0);
    assert.equal(summary.generated, 0);
    assert.equal(summary.uploaded, 0);
    assert.equal(summary.verified, 1);
    assert.equal(uploads, 1);
  });
});
