import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildPremiumAudioPlan } from "../../scripts/lib/premiumAudioPlan";
import { introCourses } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";
import { interestCorpus } from "@/lib/yo/interests/content";
import { interestAudioPath } from "@/lib/yo/interests/audio";

test("the recording plan is deterministic and contains only real unresolved curriculum strings", () => {
  const plan = buildPremiumAudioPlan("all");
  assert.deepEqual(plan, buildPremiumAudioPlan("all"));
  assert.equal(new Set(plan.items.map(item => item.storagePath)).size, plan.items.length);
  assert.ok(plan.coverage.reduce((total, row) => total + row.missing, 0) >= plan.items.length);
  assert.ok(plan.coverage.every(row => row.total === row.recorded + row.missing));
  assert.deepEqual(new Set(plan.coverage.map(row => row.language)), new Set(["en", "fr", "es", "de", "pt", "ja", "zh", "it"]));
  for (const item of plan.items) {
    const profile = getYoAudioAccentProfile(item.accentProfile);
    assert.equal(item.ttsInstructions, profile.ttsInstructions);
    const hash = createHash("sha256").update(item.text).digest("hex").slice(0, 16);
    assert.equal(item.storagePath, `yo/${item.targetLanguage}/premium-gap-fill/v1/${profile.pathSlug}/sentence/${hash}.mp3`);
    assert.equal(item.spokenText, item.text);
    const corpus = Object.values(interestCorpus).find(c => c.speechLocale === item.locale);
    const interestTexts = corpus ? [...Object.values(corpus.venues).map(v => v.question.text), ...Object.values(corpus.directions).map(d => d.text), corpus.exit.text, corpus.thanks.text, corpus.repeat.text] : [];
    if (interestTexts.includes(item.text)) assert.equal(interestAudioPath(item.locale, item.text), undefined);
    else if (item.locale === "it-IT") assert.equal(courseAudioPaths([item.text])[item.text], undefined);
    else {
      const course = introCourses.find(course => course.speechLocale === item.locale);
      assert.ok(course, item.locale);
      assert.ok(course.phrases.some(phrase => phrase.text === item.text));
      assert.equal(introAudioPaths(course)[item.text], undefined);
    }
  }
});

test("scopes keep introductions, the current Italian route and interest practice isolated", () => {
  const intros = buildPremiumAudioPlan("introductions"), italian = buildPremiumAudioPlan("italian-current");
  assert.equal(intros.coverage.length, 7);
  assert.equal(italian.coverage.length, 1);
  assert.ok(intros.items.every(item => item.targetLanguage !== "it"));
  assert.ok(italian.items.every(item => item.locale === "it-IT" && item.accentProfile === "italian_standard"));
  const interests = buildPremiumAudioPlan("interests");
  assert.equal(interests.coverage.length, 8);
  assert.equal(interests.coverage.reduce((n, row) => n + row.total, 0), 96);
  assert.equal(interests.coverage.reduce((n, row) => n + row.recorded, 0), 2);
  const expected = [...new Map([...intros.items, ...italian.items, ...interests.items].map(item => [`${item.locale}:${item.text}`, item])).values()];
  assert.deepEqual(buildPremiumAudioPlan("all").items, expected);
});
