import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vocabularyArtwork, artworkPath, withApprovedArtwork } from "@/lib/yo/personalized/approvedVocabulary";
import { firstMeetingVisuals, firstMeetingUnit } from "@/lib/yo/personalized/firstMeeting";
import { moduleVisuals } from "@/lib/yo/personalized/courseData";
import { VocabularyScene } from "@/components/yo/personalized/VocabularyScene";
import { freshVocabulary, parseVocabulary } from "@/components/yo/personalized/VisualVocabulary";
const approved = moduleVisuals(firstMeetingUnit);
let count = 0;
function test(name: string, run: () => void) { run(); count++; console.log(`PASS ${name}`); }
test("six bounded individual assets match the exact approved binary blobs", () => {
  let total = 0;
  for (const key of Object.keys(vocabularyArtwork) as (keyof typeof vocabularyArtwork)[]) {
    const a = vocabularyArtwork[key], bytes = readFileSync(`public${artworkPath(key)}`);
    assert.equal(bytes.subarray(4,12).toString(), "ftypavif");
    assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), a.sha);
    assert.ok(a.width >= 339 && a.height >= 236 && a.width > a.height);
    assert.ok(bytes.length < 12000); total += bytes.length;
  }
  assert.ok(total < 55000);
  assert.equal(readdirSync("public/images/yo/vocabulary/v1").filter(f => /\.(png|jpe?g|avif|webp)$/.test(f)).length,6);
});
test("legacy artwork projection remains intact without changing any target or audio text", () => {
  for (const [id, words] of Object.entries(firstMeetingVisuals)) {
    assert.equal(approved[id].length, words.length);
    words.forEach((word, i) => {
      const actual = approved[id][i];
      assert.deepEqual([actual.id, actual.it, actual.meaning, actual.correctId], [word.id, word.it, word.meaning, word.correctId]);
      assert.deepEqual(actual.choices.map(c=>c.id),word.choices.map(c=>c.id));
      assert.equal(actual.choices.length,4);
      assert.equal(actual.choices.filter(c=>c.id===actual.correctId).length,1);
      assert.ok(actual.choices.every(c=>c.artwork && vocabularyArtwork[c.artwork]));
    });
  }
});
test("presentation projection does not mutate the curriculum", () => {
  const source = JSON.stringify(firstMeetingVisuals);
  withApprovedArtwork(firstMeetingVisuals);
  assert.equal(JSON.stringify(firstMeetingVisuals), source);
  assert.ok(Object.values(firstMeetingVisuals).flat().every(w=>w.choices.every(c=>!c.artwork)));
});
test("feeling alternatives do not include a second smiling traveller or a mismatched sleeping scene", () => {
  const word = approved["it2-u01-l1"].find(w=>w.id==="well")!;
  assert.deepEqual(new Set(word.choices.map(c=>c.artwork)),new Set(["well","unsure","tired","coffee"]));
  const old = word.choices.find(c=>c.id==="asleep")!;
  assert.match(old.alt.fr,/café/);assert.equal(old.label,"");
  assert.ok(!Object.values(approved).flat().some(w=>w.correctId==="asleep"));
});
test("archived nationality, city, name and age facts remain explicit for legacy compatibility", () => {
  for(const word of Object.values(approved).flat()) for(const p of word.choices) {
    if(p.kind!=="profile" && p.kind!=="age") continue;
    assert.ok(p.label); assert.ok(p.caption);
    for(const locale of ["fr","en","es"] as const) {
      const html=renderToStaticMarkup(<VocabularyScene picture={p} locale={locale}/>);
      assert.ok(html.includes(p.label));assert.ok(html.includes("<img"));
      assert.doesNotMatch(html,/data:image|<svg[^>]*viewBox="0 0 200 150"/);
    }
  }
});
test("existing in-progress vocabulary selections survive the art upgrade", () => {
  for(const [id,words] of Object.entries(approved)) {
    const draft={...freshVocabulary(words.length),answer:{selected:words[0].id,checked:true,correct:true,heard:true,transcript:false}};
    assert.deepEqual(parseVocabulary(JSON.stringify(draft),words),draft,id);
    assert.equal(parseVocabulary(JSON.stringify({...draft,done:true}),words)?.done,true);
  }
});
test("active preparation no longer renders legacy captioned portraits", () => {
  const scene=readFileSync("components/yo/personalized/VocabularyScene.tsx","utf8");
  const player=readFileSync("components/yo/personalized/VisualVocabulary.tsx","utf8");
  assert.match(scene,/from "next\/image"/);
  assert.match(scene,/onError=/);assert.match(scene,/Image indisponible/);
  assert.doesNotMatch(scene,/correctId|response\.correct|recordActivity|fetch\(/);
  assert.doesNotMatch(player,/<VocabularyScene|<img/);
  assert.match(player,/<RecallQuestion/);
});
console.log(`${count} approved-artwork checks passed`);
