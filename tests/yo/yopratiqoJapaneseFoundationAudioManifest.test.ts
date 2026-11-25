import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { japaneseCourseUnits, japaneseFinalAssessment } from "../../lib/yo/japaneseCourse";
import type { JapaneseActivity, JapaneseChoiceActivity, JapanesePhrase } from "../../lib/yo/japaneseCourseTypes";
import { japaneseKana } from "../../lib/yo/japaneseKana";
import { japaneseKanjiCards } from "../../lib/yo/japaneseKanji";
import { YOPRATIQO_AUDIO_MANIFEST } from "../../lib/yo/audio/audioManifest";
import { japaneseIntroAudio } from "../../lib/yo/audio/japaneseIntroAudio";
import {
  getJapaneseFoundationAudioItem,
  japaneseFoundationAudio,
  JAPANESE_FOUNDATION_AUDIO_MODULE_ID,
  JAPANESE_FOUNDATION_AUDIO_VERSION,
} from "../../lib/yo/audio/japaneseFoundationAudio";

type SpokenReference = Pick<JapanesePhrase, "ja" | "kana">;
const allActivities = [...japaneseCourseUnits.flatMap((unit) => unit.activities), ...japaneseFinalAssessment];
const readingKey = (value: string) => value.trim().replace(/。+$/u, "");

function activityPhrases(activity: JapaneseActivity): SpokenReference[] {
  if (activity.kind === "build") return [activity.phrase];
  if (activity.kind === "match") return activity.pairs.map((pair) => pair.phrase);
  if (activity.kind === "reading") return [{ ja: activity.stimulus, kana: activity.answer }];
  return activity.stimulus ? [activity.stimulus] : [];
}

function covered(phrase: SpokenReference) {
  const item = getJapaneseFoundationAudioItem(phrase.ja);
  assert.ok(item, `No recorded audio for ${phrase.ja}`);
  assert.ok(item.pronunciationHint?.includes(readingKey(phrase.kana)), `Wrong reading guide for ${phrase.ja}`);
  if (item.type === "word") assert.equal(readingKey(item.spokenText!), readingKey(phrase.kana), phrase.ja);
  const digest = createHash("sha256").update(readingKey(phrase.kana)).digest("hex").slice(0, 12);
  assert.ok(item.storagePath.endsWith(`-${digest}.mp3`), `${phrase.ja}: recording identity must follow its intended reading`);
  return item;
}

test("the registry contains unique, immutable-version paths in the existing Japanese bucket hierarchy", () => {
  assert.equal(japaneseFoundationAudio.length, 206);
  assert.equal(JAPANESE_FOUNDATION_AUDIO_MODULE_ID, "japanese-foundations");
  assert.equal(JAPANESE_FOUNDATION_AUDIO_VERSION, "v1");
  assert.equal(new Set(japaneseFoundationAudio.map((item) => item.id)).size, japaneseFoundationAudio.length);
  assert.equal(new Set(japaneseFoundationAudio.map((item) => item.storagePath)).size, japaneseFoundationAudio.length);
  for (const item of japaneseFoundationAudio) {
    assert.equal(item.targetLanguage, "ja");
    assert.equal(item.moduleId, JAPANESE_FOUNDATION_AUDIO_MODULE_ID);
    assert.equal(item.lessonId, JAPANESE_FOUNDATION_AUDIO_VERSION);
    assert.equal(item.accentProfile, "japanese_standard");
    assert.match(item.storagePath, /^yo\/ja\/japanese-foundations\/v1\/japanese-standard\/(word|sentence)\/[a-z0-9-]+-[0-9a-f]{12}\.mp3$/u);
    assert.ok(item.spokenText?.trim());
    assert.match(item.ttsInstructions!, /Read the supplied input exactly once/u);
  }
});

test("every dialogue, vocabulary card, grammar model and writing model resolves to its intended recording", () => {
  for (const unit of japaneseCourseUnits) {
    for (const phrase of [...unit.dialogue, ...unit.vocabulary, ...unit.grammar.map((point) => point.example), unit.writing.model]) covered(phrase);
  }
});

test("every listening stimulus in all eight modules and the final assessment has a registered recording", () => {
  const listening = allActivities.filter((activity): activity is JapaneseChoiceActivity => activity.kind === "listening");
  assert.equal(listening.length, 9);
  for (const activity of listening) {
    assert.ok(activity.stimulus);
    covered(activity.stimulus);
  }
});

test("Yoppo examples, roleplay partner lines and all checked phrase models are covered", () => {
  for (const activity of allActivities) activityPhrases(activity).forEach(covered);
  for (const unit of japaneseCourseUnits) unit.roleplay.turns.forEach((turn) => covered(turn.line));
});

test("all forty kanji use contextual word readings rather than guessing an isolated kanji reading", () => {
  assert.equal(japaneseKanjiCards.length, 40);
  for (const card of japaneseKanjiCards) covered(card.word);
  const expectedReadings = { "四時": "よじ", "中": "なか", "家": "いえ", "今日": "きょう", "明日": "あした", "人": "ひと", "米": "こめ", "来ます": "きます", "来ました": "きました", "木": "き" };
  for (const [text, reading] of Object.entries(expectedReadings)) assert.equal(getJapaneseFoundationAudioItem(text)?.spokenText, reading, text);
});

test("the 92 basic kana share 45 pronunciation recordings without losing kana contrasts", () => {
  const paths = new Set<string>();
  for (const kana of japaneseKana) {
    const hiragana = kana.script === "katakana" ? String.fromCharCode(kana.character.charCodeAt(0) - 0x60) : kana.character;
    const expected = hiragana === "を" ? "お" : hiragana;
    const item = covered({ ja: kana.character, kana: expected });
    paths.add(item.storagePath);
    assert.equal(item, getJapaneseFoundationAudioItem(expected));
  }
  assert.equal(paths.size, 45);
  assert.notEqual(getJapaneseFoundationAudioItem("は"), getJapaneseFoundationAudioItem("わ"));
  assert.notEqual(getJapaneseFoundationAudioItem("へ"), getJapaneseFoundationAudioItem("え"));
  assert.notEqual(getJapaneseFoundationAudioItem("つ"), getJapaneseFoundationAudioItem("す"));
  assert.match(getJapaneseFoundationAudioItem("は")!.pronunciationHint!, /Pronounce ha/u);
  assert.match(getJapaneseFoundationAudioItem("へ")!.pronunciationHint!, /Pronounce he/u);
  assert.match(getJapaneseFoundationAudioItem("ん")!.pronunciationHint!, /without adding a vowel/u);
});

test("repeated content and equivalent spellings reuse one file instead of generating duplicate clips", () => {
  const groups = new Map<string, Set<string>>();
  const phrases: SpokenReference[] = japaneseCourseUnits.flatMap((unit) => [
    ...unit.dialogue, ...unit.vocabulary, ...unit.grammar.map((point) => point.example),
    ...unit.roleplay.turns.map((turn) => turn.line), unit.writing.model,
  ]);
  phrases.push(...allActivities.flatMap(activityPhrases), ...japaneseKanjiCards.map((card) => card.word));
  for (const phrase of phrases) {
    const key = readingKey(phrase.kana);
    const group = groups.get(key) ?? new Set<string>();
    group.add(covered(phrase).storagePath);
    groups.set(key, group);
  }
  for (const [reading, paths] of groups) assert.equal(paths.size, 1, reading);
  assert.equal(getJapaneseFoundationAudioItem("こんにちは"), getJapaneseFoundationAudioItem("こんにちは。"));
  assert.equal(getJapaneseFoundationAudioItem("木"), getJapaneseFoundationAudioItem("き"));
});

test("lookup handles Unicode composition and surrounding whitespace but never invents free-form recordings", () => {
  assert.equal(getJapaneseFoundationAudioItem("  学生 \n"), getJapaneseFoundationAudioItem("学生"));
  assert.equal(getJapaneseFoundationAudioItem("ご飯".normalize("NFD")), getJapaneseFoundationAudioItem("ご飯"));
  assert.equal(getJapaneseFoundationAudioItem(""), undefined);
  assert.equal(getJapaneseFoundationAudioItem("  "), undefined);
  assert.equal(getJapaneseFoundationAudioItem("My private writing draft"), undefined);
  assert.equal(getJapaneseFoundationAudioItem("読んでいない新しい文章です。"), undefined);
  assert.notEqual(getJapaneseFoundationAudioItem("飲みます"), getJapaneseFoundationAudioItem("コーヒーは飲みません。"));
});

test("the existing generator sees every foundation item exactly once and preserves the intro registry", () => {
  const globalItems = YOPRATIQO_AUDIO_MANIFEST.filter((item) => item.moduleId === JAPANESE_FOUNDATION_AUDIO_MODULE_ID);
  assert.deepEqual(globalItems, japaneseFoundationAudio);
  assert.equal(new Set(YOPRATIQO_AUDIO_MANIFEST.map((item) => item.id)).size, YOPRATIQO_AUDIO_MANIFEST.length);
  assert.equal(new Set(YOPRATIQO_AUDIO_MANIFEST.map((item) => item.storagePath)).size, YOPRATIQO_AUDIO_MANIFEST.length);
  assert.equal(japaneseIntroAudio.length, 36);
  assert.deepEqual(YOPRATIQO_AUDIO_MANIFEST.filter((item) => item.moduleId === "japanese-intro"), japaneseIntroAudio);
});

test("the client lookup remains compact static data with no whole-course or secret dependency", () => {
  const source = readFileSync(new URL("../../lib/yo/audio/japaneseFoundationAudio.ts", import.meta.url), "utf8");
  assert.ok(Buffer.byteLength(source) < 40_000);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:japaneseCourse|japaneseKanji|supabase-js)["']/u);
  assert.doesNotMatch(source, /process\.env|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|api\.openai\.com|\bfetch\(/u);
});
