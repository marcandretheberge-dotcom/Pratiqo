import assert from "node:assert/strict";
import { buildPraktikosLoop, PRAKTIKOS_WORD_POOL, PRAKTIKOS_WORDS_PER_LOOP, PRAKTIKOS_BRAND_LINES } from "@/lib/cafe/praktikosSequence";
const lines = ["Une racine. Mille langues.", "Le plaisir de pratiquer.", "Pas besoin de parler parfaitement.", "Viens pratiquer."];
assert.deepEqual(PRAKTIKOS_BRAND_LINES.map(cue => cue.text), lines);
const visited = new Set<string>();
for (let cycle = 0; cycle < 3; cycle++) {
  const sequence = buildPraktikosLoop(cycle * PRAKTIKOS_WORDS_PER_LOOP);
  const words = sequence.filter(cue => cue.kind === "word");
  assert.equal(words.length, 6);
  assert.deepEqual(sequence.slice(6).map(cue => cue.text), lines);
  assert.equal(new Set(words.map(cue => cue.lang)).size, 6);
  for (const word of words) {
    assert.ok(word.language && word.lang && !/\s/.test(word.text));
    visited.add(word.lang);
  }
}
assert.equal(visited.size, PRAKTIKOS_WORD_POOL.length);
assert.equal(PRAKTIKOS_WORD_POOL.find(word => word.text === "Praktikoj")?.lang, "sq");
assert.equal(PRAKTIKOS_WORD_POOL.find(word => word.lang === "nb")?.text, "Praktisere");
assert.deepEqual(buildPraktikosLoop(Number.NaN), buildPraktikosLoop(0));
assert.equal(buildPraktikosLoop(-1)[0].text, PRAKTIKOS_WORD_POOL.at(-1)?.text);
console.log("praktikosSequence: subset rotation, exact brand lines, language tags and safe seeds passed");
