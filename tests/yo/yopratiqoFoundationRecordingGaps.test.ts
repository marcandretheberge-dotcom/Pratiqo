import assert from "node:assert/strict";
import { getJapaneseFoundationAudioItem } from "../../lib/yo/audio/japaneseFoundationAudio";
import mandarinAudio from "../../lib/yo/mandarin/audioPaths.json";
import { foundationRecordingGaps } from "../../scripts/plan-yo-foundation-recording-gaps";

const gaps = foundationRecordingGaps();
assert.deepEqual(gaps.map(group => group.language), ["de", "pt-BR", "ja", "zh-Hans"]);
for (const group of gaps) {
  assert.equal(group.total, group.registered + group.missing.length);
  assert.ok(group.registered > 0);
  assert.equal(new Set(group.missing.map(item => item.text)).size, group.missing.length);
  assert.ok(group.missing.every((item, index) => item.text === item.text.normalize("NFC").trim() &&
    item.firstUnit >= (group.missing[index - 1]?.firstUnit ?? 1) &&
    item.firstUnit === Math.min(...item.uses.map(use => use.unit))));
  assert.ok(group.missing.every(item => !("path" in item) && !("voice" in item)));
}
const japaneseSample = "すみません。このかばんはいくらですか。";
assert.equal(gaps[2].missing.some(item => item.text === japaneseSample), !getJapaneseFoundationAudioItem(japaneseSample));
const mandarinSample = "你每天几点起床？";
assert.equal(gaps[3].missing.some(item => item.text === mandarinSample), !Object.hasOwn(mandarinAudio, mandarinSample));
console.log("Foundation priority recording queue: four languages, exact published coverage, stable early-unit ordering, and no invented paths.");
