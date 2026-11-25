import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePremiumRecordingOptions, reserveRecordingCost, runPremiumRecordingBatch } from "../../scripts/generate-yopratiqo-premium-recordings";
import type { PremiumRecordingItem } from "../../scripts/lib/premiumAudioPlan";

const item: PremiumRecordingItem = {
  id: "premium-en-hello", locale: "en-CA", targetLanguage: "en", moduleId: "premium-gap-fill", lessonId: "v1",
  type: "sentence", text: "Hello!", accentProfile: "canadian_english", storagePath: "yo/en/premium-gap-fill/v1/canadian-english/sentence/hello.mp3",
};
function pcm() { const bytes = Buffer.alloc(48000); for (let i = 0; i < 24000; i++) bytes.writeInt16LE(Math.round(Math.sin(i * Math.PI / 40) * 2000), i * 2); return bytes; }
function mp3(seed = 0) { const bytes = new Uint8Array(417 * 38).fill(seed); for (let i = 0; i < 38; i++) bytes.set([0xff, 0xfb, 0x90, 0], i * 417); return bytes; }
const source = () => ({ pcm: pcm(), transcript: "Hello!", usage: { input_tokens: 80, output_tokens: 60, input_token_details: { audio_tokens: 0, image_tokens: 0 } } });
async function sandbox(fn: (config: Parameters<typeof runPremiumRecordingBatch>[1]) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "yo-premium-recording-"));
  await mkdir(join(root, "lib/yo/audio"), { recursive: true });
  await writeFile(join(root, "lib/yo/audio/premiumPublished.json"), "[]\n");
  try { await fn({ root, cache: join(root, "cache"), supabaseUrl: "https://example.supabase.co", bucket: "yopratiqo-audio", serviceRoleKey: "fake-storage-key", apiKey: "fake-provider-key", ffmpeg: "unused-test-encoder", budgetMicroUsd: 1_000_000 }); }
  finally { await rm(root, { recursive: true, force: true }); }
}
const network: typeof fetch = async (_url, init) => init?.method === "POST" ? new Response("{}", { status: 200 }) : new Response(mp3(), { headers: { "Content-Type": "audio/mpeg" } });
const registry = async (root: string) => JSON.parse(await readFile(join(root, "lib/yo/audio/premiumPublished.json"), "utf8"));

test("recording CLI is offline unless explicitly generated within a fixed ceiling", () => {
  assert.equal(parsePremiumRecordingOptions([]).generate, false);
  assert.throws(() => parsePremiumRecordingOptions(["--generate"]), /explicit/);
  assert.throws(() => parsePremiumRecordingOptions(["--generate", "--dry-run", "--budget-usd", "1"]), /not both/);
  for (const amount of ["0", "-1", "NaN", "10.01", "100", "1e2"]) assert.throws(() => parsePremiumRecordingOptions(["--budget-usd", amount]));
  assert.equal(parsePremiumRecordingOptions(["--generate", "--budget-usd", "2.50", "--limit", "1"]).budgetMicroUsd, 2_500_000);
  assert.throws(() => reserveRecordingCost({ reservedMicroUsd: 999_999, requests: 10 }, 2, 1_000_000), /exhausted/);
  assert.throws(() => reserveRecordingCost({ reservedMicroUsd: NaN, requests: 10 }, 2, 1_000_000), /Invalid/);
});

test("publication requires the exact public MP3 and resuming reuses the paid source", async () => sandbox(async (config) => {
  let recordings = 0;
  const deps = { record: async () => { recordings++; return source(); }, encode: () => mp3(), fetch: network };
  const first = await runPremiumRecordingBatch([item], config, deps);
  assert.equal(first.generated, 1); assert.equal(first.verified, 1);
  const proof = (await registry(config.root))[0];
  assert.equal(proof.text, item.text); assert.equal(proof.locale, item.locale); assert.equal(proof.model, "gpt-realtime-2.1");
  assert.match(proof.sha256, /^[a-f0-9]{64}$/);
  const resumed = await runPremiumRecordingBatch([item], config, { ...deps, fetch: async (_url, init) => init?.method === "POST" ? new Response("exists", { status: 409 }) : network(_url, init) });
  assert.equal(recordings, 1); assert.equal(resumed.generated, 0); assert.equal(resumed.requests, first.requests);
  assert.equal((await registry(config.root)).length, 1);
}));

test("failed upload preserves the paid recording but never publishes a broken path", async () => sandbox(async (config) => {
  let recordings = 0;
  const deps = { record: async () => { recordings++; return source(); }, encode: () => mp3(), fetch: network };
  await assert.rejects(runPremiumRecordingBatch([item], config, { ...deps, fetch: async () => new Response("unavailable", { status: 503 }) }), /upload failed/);
  assert.deepEqual(await registry(config.root), []);
  const result = await runPremiumRecordingBatch([item], config, deps);
  assert.equal(recordings, 1); assert.equal(result.generated, 0); assert.equal(result.verified, 1);
}));

test("a mismatched public object is not accepted or overwritten", async () => sandbox(async (config) => {
  await assert.rejects(runPremiumRecordingBatch([item], config, {
    record: async () => source(), encode: () => mp3(),
    fetch: async (_url, init) => init?.method === "POST" ? new Response("exists", { status: 409 }) : new Response(mp3(1), { headers: { "Content-Type": "audio/mpeg" } }),
  }), /differs/);
  assert.deepEqual(await registry(config.root), []);
}));

test("unknown provider failure permanently retains reservation and cannot silently retry", async () => sandbox(async (config) => {
  let calls = 0;
  const deps = { record: async () => { calls++; throw new Error("Simulated provider timeout"); }, encode: () => mp3(), fetch: network };
  await assert.rejects(runPremiumRecordingBatch([item], config, deps), /timeout/);
  const ledger = JSON.parse(await readFile(join(config.cache, "budget.json"), "utf8"));
  assert.ok(ledger.reservedMicroUsd > 0); assert.equal(ledger.requests, 1);
  await assert.rejects(runPremiumRecordingBatch([item], config, deps), /earlier recording attempt/);
  assert.equal(calls, 1); assert.deepEqual(await registry(config.root), []);
}));

test("budget exhaustion occurs before an attempt marker or provider call", async () => sandbox(async (config) => {
  let calls = 0;
  const deps = { record: async () => { calls++; return source(); }, encode: () => mp3(), fetch: network };
  await assert.rejects(runPremiumRecordingBatch([item], { ...config, budgetMicroUsd: 1 }, deps), /budget exhausted/);
  assert.equal(calls, 0);
  assert.deepEqual(await readdir(config.cache), ["budget.json"]);
  await runPremiumRecordingBatch([item], config, deps);
  assert.equal(calls, 1);
}));

test("missing historical ledger and invalid storage paths fail without a paid call", async () => sandbox(async (config) => {
  let calls = 0;
  const deps = { record: async () => { calls++; return source(); }, encode: () => mp3(), fetch: network };
  await assert.rejects(runPremiumRecordingBatch([{ ...item, storagePath: "yo/../../replace.mp3" }], config, deps), /Unsafe/);
  await mkdir(config.cache, { recursive: true });
  await writeFile(join(config.cache, "old-attempt"), "must not reset");
  await assert.rejects(runPremiumRecordingBatch([item], config, deps), /history must be restored/);
  assert.equal(calls, 0);
}));
