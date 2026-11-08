import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { introCourses } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import shared from "@/lib/yo/shared/common.json";

const expected: Record<string, { name: string; target: string; old: string; reading?: string }> = {
  anglais: { name: "Emily", target: "My name is Emily.", old: "My name is Nina." },
  "francais-quebec": { name: "Émilie", target: "Je m’appelle Émilie.", old: "Je m’appelle Nina." },
  espagnol: { name: "Lucía", target: "Me llamo Lucía.", old: "Me llamo Nina." },
  allemand: { name: "Lena", target: "Ich heiße Lena.", old: "Ich heiße Nora." },
  "portugais-bresil": { name: "Beatriz", target: "Eu me chamo Beatriz.", old: "Eu me chamo Ana." },
  japonais: { name: "Haruka", target: "はるかです。", old: "アンナです。", reading: "Haruka desu." },
  mandarin: { name: "Lín Yuè", target: "我叫林悦。", old: "我叫安娜。", reading: "Wǒ jiào Lín Yuè." },
};
const locales = ["fr", "en", "es"] as const;
let checks = 0;
function test(name: string, fn: () => void) { fn(); checks++; console.log(`PASS ${name}`); }

for (const c of introCourses) {
  const cast = expected[c.slug];
  test(`${c.slug}: character is consistent in speech text, translation, tiles, images and bank`, () => {
    const name = c.phrases.find(p => p.id === "name")!;
    assert.equal(name.text, cast.target);
    assert.equal(name.reading, cast.reading);
    for (const locale of locales) assert.ok(name.meaning[locale].includes(cast.name));
    assert.equal(name.parts!.join("").replace(/\s/g, ""), name.text.replace(/\s/g, ""));
    const picture = c.missions[0].visuals[0];
    const correct = picture.pictures.find(p => p.id === picture.answer)!;
    assert.ok(correct.label.includes(cast.name));
    assert.equal(new Set(picture.pictures.map(p => p.label)).size, 4);
    for (const locale of locales) assert.ok(correct.alt[locale].includes(cast.name));
    assert.ok(c.glossary.some(g => g.text.includes(cast.name)));
    assert.ok(c.missions[0].goal.en.includes(cast.name));
    assert.ok(!JSON.stringify(c).includes(cast.old));
    assert.ok(!Object.hasOwn(introAudioPaths(c), cast.old), "old spoken name must not resolve for the new lesson");
    assert.ok(!("missionCopy" in c), "authoring overrides must not be redundantly sent to the player");
  });
  test(`${c.slug}: nine contextual prompts and all mission titles/goals translated`, () => {
    let changed = 0;
    for (const [i, m] of c.missions.entries()) {
      for (const locale of locales) {
        assert.ok(m.title[locale].trim()); assert.ok(m.goal[locale].trim());
      }
      for (const [j, e] of m.practice.entries()) {
        const old = shared.flow[i].practice[j];
        if (JSON.stringify(e.prompt) !== JSON.stringify(old.prompt)) {
          changed++;
          for (const locale of locales) {
            assert.ok(e.prompt[locale].trim().length > 15);
            assert.ok(e.prompt[locale].length < 220, "keep the mobile question short");
          }
        }
      }
    }
    assert.equal(changed, 9);
  });
  test(`${c.slug}: exercise IDs, order and answer semantics remain compatible with saved drafts`, () => {
    const phrases = new Map(c.phrases.map(p => [p.id, p]));
    for (const [i, m] of c.missions.entries()) {
      assert.equal(m.id, shared.flow[i].id);
      assert.deepEqual(m.phrases, shared.flow[i].phrases);
      for (const [j, e] of m.practice.entries()) {
        const old = shared.flow[i].practice[j];
        assert.deepEqual({ ...e, prompt: old.prompt }, old);
        assert.ok(phrases.has(e.answer));
        if (e.kind === "order") {
          const answer = phrases.get(e.answer)!;
          assert.equal(answer.parts!.join("").replace(/\s/g, ""), answer.text.replace(/\s/g, ""));
        } else assert.equal(e.options.filter(o => o === e.answer).length, 1);
      }
    }
    const finalPositions = [[0, 0], [0, 4], [1, 0], [1, 3], [2, 1], [2, 2]];
    for (const [n, [m, q]] of finalPositions.entries()) {
      assert.deepEqual(c.final[n].prompt, c.missions[m].practice[q].prompt);
      assert.equal(c.final[n].answer, c.missions[m].practice[q].answer);
    }
  });
}

test("all seven casts and scenarios differ; localization is not a single repeated question set", () => {
  for (const locale of locales) {
    for (let m = 0; m < 3; m++) {
      assert.equal(new Set(introCourses.map(c => c.missions[m].title[locale])).size, 7);
      for (const index of m === 0 ? [0, 1, 2] : [0, 1, 3]) {
        assert.equal(new Set(introCourses.map(c => c.missions[m].practice[index].prompt[locale])).size, 7);
      }
    }
  }
  assert.equal(new Set(introCourses.map(c => c.missions[0].visuals[0].pictures.map(p => p.label).join("|"))).size, 7);
});
test("authored per-language question keys point to real exercises and have all translations", () => {
  for (const c of introCourses) {
    const raw = JSON.parse(readFileSync(`lib/yo/shared/content/${c.slug}.json`, "utf8"));
    for (const m of c.missions) {
      const copy = raw.missionCopy[m.id];
      assert.equal(Object.keys(copy.prompts).length, 3);
      for (const [id, prompt] of Object.entries(copy.prompts)) {
        assert.ok(m.practice.some(e => e.id === id));
        assert.deepEqual(Object.keys(prompt as object).sort(), [...locales].sort());
      }
    }
  }
});
console.log(`${checks} character/localization checks passed`);
