import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { firstMeetingGrammar } from "@/lib/yo/pedagogy/firstMeetingGrammar";
import { LanguageExplanation, explanationParagraphs } from "@/components/yo/learning/LanguageExplanation";
import { personalizedItalianUnits } from "@/lib/yo/personalized/courseData";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
let count = 0;
function test(name: string, run: () => void) { run(); count++; console.log(`PASS ${name}`); }
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
for (const locale of ["fr", "en", "es"] as const) {
  for (const lesson of personalizedItalianUnits[0].lessons) {
    test(`${locale}: ${lesson.id} teaches with headings, translated examples and an optional deeper section`, () => {
      const guide = firstMeetingGrammar[lesson.id]; assert.ok(guide);
      const html = renderToStaticMarkup(<LanguageExplanation lesson={lesson} locale={locale}/>);
      const doc = new JSDOM(html).window.document;
      assert.equal(doc.querySelectorAll("[data-language-concept]").length, guide.sections.length + guide.more.length);
      assert.equal(doc.querySelectorAll("details").length, 1);
      assert.equal(doc.querySelectorAll("details[open]").length, 0);
      assert.equal(doc.querySelectorAll("input,textarea,button").length, 0);
      assert.equal(doc.querySelector("h2")?.textContent, guide.title[locale]);
      assert.ok(doc.querySelector("aside")?.textContent.includes(guide.remember[locale]));
      for (const block of [...guide.sections, ...guide.more]) {
        assert.ok(block.title[locale].trim()); assert.ok(block.explanation[locale].length < 330);
        for (const ex of block.examples) {
          assert.ok(ex.meaning[locale].trim());
          assert.ok([...doc.querySelectorAll('dt[lang="it"]')].some((dt: unknown) => (dt as Element).textContent === ex.text));
        }
      }
      assert.doesNotMatch(html, /Voix IA|AI voice|Préférences sur cet appareil|J’ai compris|I understand/);
    });
  }
  test(`${locale}: every later lesson preserves all explanation sentences and every example`, () => {
    for (const unit of personalizedItalianUnits.slice(1)) for (const lesson of unit.lessons) {
      const original = lesson.grammar.body[locale];
      assert.equal(normalize(explanationParagraphs(original, locale).join(" ")), normalize(original));
      const doc = new JSDOM(renderToStaticMarkup(<LanguageExplanation lesson={lesson} locale={locale}/>)).window.document;
      assert.equal(normalize([...doc.querySelectorAll("[data-preserved-explanation] > p")].map((p: unknown) => (p as Element).textContent).join(" ")), normalize(original));
      assert.equal(doc.querySelectorAll("dt").length, lesson.grammar.examples.length);
    }
  });
}
test("age explanation makes the French/Spanish connection without giving English learners a false equivalence", () => {
  const lead = firstMeetingGrammar["it2-u01-l3"].introduction;
  assert.match(lead.fr, /comme en français/); assert.match(lead.en, /not “be”/); assert.match(lead.es, /Como en español/);
});
test("the renderer cannot award progress or add a navigation/AI service", () => {
  const file = readFileSync("components/yo/learning/LanguageExplanation.tsx", "utf8");
  assert.doesNotMatch(file, /fetch\(|\.rpc\(|localStorage|recordActivity|recordAssessment|dangerouslySetInnerHTML|onContinue/);
  const player = readFileSync("components/yo/italian/guided/GuidedItalianCourse.tsx", "utf8");
  assert.match(player, /step.stage === "language" \? <LanguageExplanation lesson=\{lesson\} locale=\{locale\}/);
});
test("a browser without sentence segmentation still receives the complete explanation", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter")!;
  try {
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true });
    assert.deepEqual(explanationParagraphs("Une phrase. Une autre.\n\nUn exemple.", "fr"), ["Une phrase. Une autre.", "Un exemple."]);
  } finally { Object.defineProperty(Intl, "Segmenter", descriptor); }
});
console.log(`${count} readable-language checks passed`);
