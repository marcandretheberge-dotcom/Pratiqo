import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildPremiumAudioPlan } from "../../scripts/lib/premiumAudioPlan";
import { introCourses } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

test("the recording plan is deterministic and contains only real unresolved curriculum strings", () => {
  const plan = buildPremiumAudioPlan("all");
  assert.deepEqual(plan, buildPremiumAudioPlan("all"));
  assert.equal(new Set(plan.items.map(item => item.storagePath)).size, plan.items.length);
  assert.equal(plan.coverage.reduce((total, row) => total + row.missing, 0), plan.items.length);
  assert.ok(plan.coverage.every(row => row.total === row.recorded + row.missing));
  assert.deepEqual(new Set(plan.coverage.map(row => row.language)), new Set(["en", "fr", "es", "de", "pt", "ja", "zh", "it"]));
  for (const item of plan.items) {
    const profile = getYoAudioAccentProfile(item.accentProfile);
    assert.equal(item.ttsInstructions, profile.ttsInstructions);
    const hash = createHash("sha256").update(item.text).digest("hex").slice(0, 16);
    assert.equal(item.storagePath, `yo/${item.targetLanguage}/premium-gap-fill/v1/${profile.pathSlug}/sentence/${hash}.mp3`);
    assert.equal(item.spokenText, item.text);
    if (item.locale === "it-IT") assert.equal(courseAudioPaths([item.text])[item.text], undefined);
    else {
      const course = introCourses.find(course => course.speechLocale === item.locale);
      assert.ok(course, item.locale);
      assert.ok(course.phrases.some(phrase => phrase.text === item.text));
      assert.equal(introAudioPaths(course)[item.text], undefined);
    }
  }
});

test("scopes keep introductions and the current Italian route isolated", () => {
  const intros = buildPremiumAudioPlan("introductions"), italian = buildPremiumAudioPlan("italian-current");
  assert.equal(intros.coverage.length, 7);
  assert.equal(italian.coverage.length, 1);
  assert.ok(intros.items.every(item => item.targetLanguage !== "it"));
  assert.ok(italian.items.every(item => item.locale === "it-IT" && item.accentProfile === "italian_standard"));
  assert.deepEqual(buildPremiumAudioPlan("all").items, [...intros.items, ...italian.items]);
});
