import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoundationHome } from "@/components/yo/foundations/FoundationRoutes";
import { CourseAudioCoverageNotice } from "@/components/yo/german/CourseAudioCoverageNotice";
import { foundationContent } from "@/lib/yo/foundations/catalog.server";
import type { NewFoundationLanguage } from "@/lib/yo/foundations/experience";
import { foundationAudioCoverage, foundationAudioPaths, foundationPhrasePaths, foundationPlaybackTexts } from "@/lib/yo/foundations/audio.server";
import { distinctSpeech } from "@/lib/yo/italian/course/courseSpeech";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import { publishedPremiumAudioPath } from "@/lib/yo/audio/premiumPublished";
import provenance from "../../docs/product/yopratiqo-premium-recordings-provenance.json";

Object.defineProperty(globalThis, "React", { value: React, configurable: true, writable: true });
const cases: readonly { language: NewFoundationLanguage; locale: string; total: number; recorded: number; missing: number }[] = [
  { language: "en", locale: "en-CA", total: 423, recorded: 420, missing: 3 },
  { language: "es", locale: "es-MX", total: 354, recorded: 347, missing: 7 },
  { language: "fr-CA", locale: "fr-CA", total: 430, recorded: 429, missing: 1 },
];

test("foundation coverage counts playable texts and keeps every unresolved source unavailable", () => {
  for (const { language, locale, total, recorded, missing } of cases) {
    const { units, final } = foundationContent(language);
    const contents = [...units, final], texts = distinctSpeech(contents.flatMap(foundationPlaybackTexts));
    assert.deepEqual(foundationAudioCoverage(language, contents), { total, recorded, missing });
    const paths = foundationPhrasePaths(language, texts), absent = texts.filter(text => !paths[text]);
    const held = provenance.unpublishedSources.filter(item => item.locale === locale).map(item => item.text);
    assert.deepEqual(new Set(absent), new Set(held), language);
    for (const text of absent) assert.equal(publishedPremiumAudioPath(locale, text), undefined, text);
    const actualPlayerPaths = Object.assign({}, ...contents.map(content => foundationAudioPaths(language, content)));
    assert.deepEqual(actualPlayerPaths, paths, "home coverage and actual player paths agree");
  }
});

test("written choices and wrong alternatives cannot create invented recording gaps", () => {
  const original = foundationContent("en").units[0];
  const written = original.quiz.questions.find(question => question.kind === "choice");
  assert.ok(written && written.kind === "choice");
  const changed: CourseUnit = {
    ...original,
    quiz: { ...original.quiz, questions: [{ ...written, stimulus: "WRITTEN_ONLY_SCENARIO", options: written.options.map(option => ({ ...option, it: `WRITTEN_ONLY_OPTION_${option.id}` })) }] },
    production: { ...original.production, model: "WRITTEN_ONLY_PRODUCTION" },
  };
  assert.deepEqual(foundationPlaybackTexts(changed), foundationPlaybackTexts(original));
  const first = original.lessons[0];
  const withNewAudio: CourseUnit = { ...changed, lessons: [{ ...first, grammar: { ...first.grammar, examples: [...first.grammar.examples, { ...first.grammar.examples[0], it: "A new real audio example that has no recording." }] } }, ...original.lessons.slice(1)] };
  const before = foundationAudioCoverage("en", [changed]), after = foundationAudioCoverage("en", [withNewAudio]);
  assert.equal(after.total, before.total + 1);
  assert.equal(after.recorded, before.recorded);
  assert.equal(after.missing, before.missing + 1, "a real new audio control must create a visible gap");
});

test("each actual foundation home receives measured coverage instead of a fixed unavailable flag", async () => {
  for (const { language, total, recorded, missing } of cases) {
    const home = await FoundationHome({ language, searchParams: Promise.resolve({ lang: "en" }) });
    assert.deepEqual(home.props.audioCoverage, { total, recorded, missing });
    assert.equal(home.props.audioReady, missing === 0);
  }
});

test("coverage copy gives recorded and remaining counts in all three interface languages", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const partial = renderToStaticMarkup(<CourseAudioCoverageNotice locale={locale} coverage={{ total: 430, recorded: 429, missing: 1 }}/>);
    assert.match(partial, /429/);
    assert.match(partial, /430/);
    assert.match(partial, /1 /);
    assert.doesNotMatch(partial, /ElevenLabs|Scribe|ASR|native|natif|nativo|certif/i);
    const complete = renderToStaticMarkup(<CourseAudioCoverageNotice locale={locale} coverage={{ total: 430, recorded: 430, missing: 0 }}/>);
    assert.match(complete, /430/);
    assert.doesNotMatch(complete, /restent|still need|Faltan/);
  }
});
