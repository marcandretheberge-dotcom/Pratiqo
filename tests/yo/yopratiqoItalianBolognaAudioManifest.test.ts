import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { activities, grammarTips, vocabulary } from "../../lib/yo/italian/italianModuleData";
import { YOPRATIQO_AUDIO_MANIFEST } from "../../lib/yo/audio/audioManifest";
import { italianIntroAudio } from "../../lib/yo/audio/italianIntroAudio";
import {
  getItalianBolognaAudioItem,
  italianBolognaAudio,
  italianBolognaReusedAudio,
  ITALIAN_BOLOGNA_AUDIO_MODULE_ID,
  ITALIAN_BOLOGNA_AUDIO_VERSION,
} from "../../lib/yo/audio/italianBolognaAudio";
import { parseCli, resolveConfig, runAudioPipeline } from "../../scripts/generate-yopratiqo-audio";

function covered(text: string) {
  const item = getItalianBolognaAudioItem(text);
  assert.ok(item, `Missing prerecorded-audio plan for: ${text}`);
  assert.equal(item.text, text.normalize("NFC").trim());
  assert.equal(item.targetLanguage, "it");
  assert.equal(item.accentProfile, "italian_standard");
  return item;
}

test("new Italian plans have unique versioned paths and content-based identities", () => {
  assert.equal(italianBolognaAudio.length, 48);
  assert.equal(ITALIAN_BOLOGNA_AUDIO_MODULE_ID, "italian-bologna-a1");
  assert.equal(ITALIAN_BOLOGNA_AUDIO_VERSION, "v1");
  assert.equal(new Set(italianBolognaAudio.map(item => item.id)).size, italianBolognaAudio.length);
  assert.equal(new Set(italianBolognaAudio.map(item => item.storagePath)).size, italianBolognaAudio.length);
  assert.equal(new Set(italianBolognaAudio.map(item => item.text)).size, italianBolognaAudio.length);
  for (const item of italianBolognaAudio) {
    assert.equal(item.moduleId, ITALIAN_BOLOGNA_AUDIO_MODULE_ID);
    assert.equal(item.lessonId, ITALIAN_BOLOGNA_AUDIO_VERSION);
    assert.equal(item.spokenText, item.text);
    assert.match(item.storagePath, /^yo\/it\/italian-bologna-a1\/v1\/italian-standard\/(word|phrase|sentence|dialogue|instruction)\/[a-z0-9-]+-[0-9a-f]{12}\.mp3$/u);
    const hash = createHash("sha256").update(item.text).digest("hex").slice(0, 12);
    assert.ok(item.storagePath.endsWith(`-${hash}.mp3`), item.id);
    assert.match(item.ttsInstructions!, /Read the supplied Italian input exactly once/u);
  }
});

test("all vocabulary and grammar examples resolve to a standard-Italian recording", () => {
  assert.equal(vocabulary.length, 24);
  vocabulary.forEach(item => covered(item.it));
  grammarTips.forEach(tip => tip.examples.forEach(example => covered(example.it)));
});

test("both listening stimuli, typing models, complete ordering phrases and the café request are covered", () => {
  const listening = activities.filter(activity => activity.kind === "listen");
  assert.equal(listening.length, 2);
  for (const activity of activities) {
    if (activity.kind === "listen") { assert.ok(activity.stimulus); covered(activity.stimulus); }
    if (activity.kind === "order") covered(activity.it);
    if (activity.kind === "type") covered(activity.model);
    if (activity.kind === "cafe") {
      covered(activity.orderText);
      activity.menu.forEach(item => covered(item.it));
    }
  }
});

test("Yoppo dialogue lines, Italian responses, associations and map directions are covered", () => {
  for (const activity of activities) {
    if (activity.kind === "dialogue") {
      for (const turn of activity.turns) {
        covered(turn.line);
        turn.options.forEach(option => { if (option.it) covered(option.it); });
      }
    }
    if (activity.kind === "match") activity.pairs.forEach(pair => covered(pair.it));
    if (activity.kind === "map") activity.instructions.forEach(covered);
    if ("options" in activity) activity.options.forEach(option => { if (option.it) covered(option.it); });
  }
});

test("eight exact intro recordings are reused without adding duplicate requests or changing their paths", () => {
  const expected = ["Buongiorno", "Ciao", "Grazie", "Prego", "Scusi", "Vorrei", "Per favore", "Quanto costa?"];
  assert.equal(italianBolognaReusedAudio.length, expected.length);
  for (const text of expected) {
    const original = italianIntroAudio.find(item => item.text === text);
    assert.ok(original, text);
    assert.equal(covered(text), original);
    assert.ok(!italianBolognaAudio.some(item => item.text === text));
    assert.equal(YOPRATIQO_AUDIO_MANIFEST.filter(item => item.id === original.id).length, 1);
  }
  assert.equal(italianIntroAudio.length, 32);
});

test("lookup normalizes Unicode and whitespace while retaining punctuation, accents and private-text boundaries", () => {
  assert.equal(covered("Un caffè."), getItalianBolognaAudioItem("  Un caffè.\n".normalize("NFD")));
  assert.notEqual(getItalianBolognaAudioItem("Un caffè."), getItalianBolognaAudioItem("Un caffè"));
  assert.equal(getItalianBolognaAudioItem("Un caffe."), undefined);
  assert.equal(getItalianBolognaAudioItem(""), undefined);
  assert.equal(getItalianBolognaAudioItem("  "), undefined);
  assert.equal(getItalianBolognaAudioItem("My private typed draft"), undefined);
  assert.equal(getItalianBolognaAudioItem("l’accento"), undefined, "unrelated intro content must not become an implicit module target");
});

test("the global generator registry includes new Italian plans exactly once and preserves intro entries", () => {
  assert.deepEqual(YOPRATIQO_AUDIO_MANIFEST.filter(item => item.moduleId === ITALIAN_BOLOGNA_AUDIO_MODULE_ID), italianBolognaAudio);
  assert.deepEqual(YOPRATIQO_AUDIO_MANIFEST.filter(item => item.moduleId === "italian-intro"), italianIntroAudio);
  assert.equal(new Set(YOPRATIQO_AUDIO_MANIFEST.map(item => item.id)).size, YOPRATIQO_AUDIO_MANIFEST.length);
  assert.equal(new Set(YOPRATIQO_AUDIO_MANIFEST.map(item => item.storagePath)).size, YOPRATIQO_AUDIO_MANIFEST.length);
});

test("the module dry run selects only the 48 new requests and performs no network operation", async () => {
  const options = parseCli(["--module", ITALIAN_BOLOGNA_AUDIO_MODULE_ID, "--dry-run"]);
  const config = resolveConfig(options, {});
  let calls = 0;
  const lines: string[] = [];
  const summary = await runAudioPipeline(YOPRATIQO_AUDIO_MANIFEST, options, config, {
    fetch: (async () => { calls += 1; throw new Error("An offline plan must not fetch"); }) as typeof fetch,
    log: line => lines.push(line),
  });
  assert.equal(calls, 0);
  assert.equal(summary.selected, 48);
  assert.equal(summary.generated, 0);
  assert.equal(summary.uploaded, 0);
  assert.equal(summary.verified, 0);
  assert.equal(summary.failed, 0);
  assert.equal(lines.filter(line => line.startsWith("would generate ")).length, 48);
});

test("the client audio path has no full-course dependency, runtime synthesis, service keys or OpenAI calls", () => {
  const manifest = readFileSync(new URL("../../lib/yo/audio/italianBolognaAudio.ts", import.meta.url), "utf8");
  const player = readFileSync(new URL("../../components/yo/italian/ItalianModuleAudio.tsx", import.meta.url), "utf8");
  const urlHelper = readFileSync(new URL("../../lib/yo/audio/audioUrl.ts", import.meta.url), "utf8");
  assert.doesNotMatch(manifest, /from\s+["'][^"']*(?:italianModuleData|supabase-js)["']/u);
  assert.doesNotMatch(manifest + player, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|api\.openai\.com|speechSynthesis|SpeechSynthesisUtterance/u);
  assert.doesNotMatch(urlHelper, /from\s+["'][^"']*\/audioManifest["']/u);
});
