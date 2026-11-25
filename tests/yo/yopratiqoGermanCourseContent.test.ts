import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import {
  germanCourseUnits,
  germanCatalog,
  germanFinal,
  germanCultureFinal,
} from "@/lib/yo/german/courseData";
import { germanCultureStops } from "@/lib/yo/german/courseCulture";
import { germanCourseAudio } from "@/lib/yo/audio/germanCourseAudio";
import { germanUnitSpeech } from "@/lib/yo/german/courseAudio.server";
import {
  germanCourseHref,
  matchesGermanAnswer,
  normalizeGermanAnswer,
  GERMAN_PROGRESS_KEY,
} from "@/lib/yo/german/courseLogic";
import {
  checkItalianCafe,
  checkItalianMap,
} from "@/lib/yo/italian/italianModuleLogic";
import {
  ITALIAN_COURSE_PROGRESS_KEY,
  emptyCourseProgress,
  recordCourseActivity,
  recordCourseAssessment,
  getDueActivityIds,
  resetCourseProgress,
  mergeCourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import { preflightManifest } from "@/scripts/generate-yopratiqo-audio";

const lessons = germanCourseUnits.flatMap((u) => u.lessons);
const practice = lessons.flatMap((l) => l.activities);
const assessments = [
  ...germanCourseUnits.map((u) => u.quiz),
  germanFinal,
  germanCultureFinal,
];
const ids = (values: string[]) =>
  assert.equal(new Set(values).size, values.length);
const text = (value: { fr: string; en: string; es: string }) => {
  for (const locale of ["fr", "en", "es"] as const)
    assert.ok(value[locale]?.trim());
};

test("eight original units contain 24 lessons, varied practice and separate cumulative finals", () => {
  assert.equal(germanCourseUnits.length, 8);
  assert.equal(lessons.length, 24);
  assert.equal(practice.length, 148);
  ids([
    ...practice.map((a) => a.id),
    ...assessments.flatMap((a) => a.questions.map((q) => q.id)),
  ]);
  for (const unit of germanCourseUnits) {
    assert.equal(unit.lessons.length, 3);
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.production.rubric.length, 3);
    text(unit.title);
    text(unit.production.prompt);
  }
  for (const lesson of lessons) {
    text(lesson.grammar.body);
    text(lesson.pronunciation.body);
    text(lesson.reading.meaning);
    assert.equal(lesson.vocabulary.length, 4);
    for (const word of lesson.vocabulary) {
      assert.ok(word.it);
      text(word.meaning);
    }
    for (const kind of ["match", "order", "choice", "listen", "type"])
      assert.ok(
        lesson.activities.some((a) => a.kind === kind),
        lesson.id + kind,
      );
    assert.ok(lesson.activities.some((a) => a.id === lesson.readingActivityId));
    assert.equal(
      lesson.activities.filter((a) => a.kind === "type" && a.listeningText)
        .length,
      1,
    );
  }
  assert.equal(germanFinal.questions.length, 16);
  assert.equal(germanCultureFinal.questions.length, 8);
});

test("all questions have unique answer options, exactly one target and localized feedback", () => {
  for (const a of [...practice, ...assessments.flatMap((x) => x.questions)]) {
    text(a.title);
    text(a.prompt);
    text(a.explanation);
    if ("options" in a) {
      ids(a.options.map((o) => o.id));
      assert.equal(
        a.options.filter((o) => o.id === a.correctId).length,
        1,
        a.id,
      );
      for (const locale of ["fr", "en", "es"] as const)
        ids(a.options.map((o) => o.it ?? o.label![locale]));
      for (const o of a.options) text(o.feedback);
    }
    if (a.kind === "type")
      assert.ok(matchesGermanAnswer(a.model, a.accepted), a.id);
  }
  assert.ok(
    new Set(
      practice.flatMap((a) =>
        "options" in a
          ? [a.options.findIndex((o) => o.id === a.correctId)]
          : [],
      ),
    ).size > 1,
  );
});

test("German spelling preserves meaningful umlauts and sharp s but accepts punctuation and Unicode equivalence", () => {
  assert.ok(matchesGermanAnswer("  GUTEN TAG! ", ["Guten Tag."]));
  assert.ok(matchesGermanAnswer("scho\u0308n", ["schön"]));
  assert.equal(matchesGermanAnswer("schon", ["schön"]), false);
  assert.equal(matchesGermanAnswer("wurde", ["würde"]), false);
  assert.equal(matchesGermanAnswer("Masse", ["Maße"]), false);
  assert.equal(normalizeGermanAnswer("ä"), "ä");
});

test("real photo locations and final knowledge were explicitly taught and credited", () => {
  assert.equal(Object.keys(germanCultureStops).length, 4);
  for (const q of germanCultureFinal.questions) {
    const unit = germanCourseUnits.find((u) => u.id === q.taughtInUnitId);
    assert.ok(unit?.cultureStop);
    assert.deepEqual(q.explanation, unit.cultureStop.body);
    if (q.photo) {
      assert.ok(existsSync("public" + q.photo.src));
      assert.ok(
        q.photo.author &&
          q.photo.license &&
          q.photo.licenseUrl &&
          q.photo.sourceUrl,
      );
      assert.ok(q.photo.width > 0 && q.photo.height > 0);
      text(q.photo.alt);
    }
  }
});

test("all spoken course material is covered by one deduplicated German-only audio plan", () => {
  preflightManifest(germanCourseAudio);
  const spoken = new Set(germanCourseAudio.map((a) => a.text));
  for (const unit of germanCourseUnits)
    for (const value of germanUnitSpeech(unit))
      assert.ok(spoken.has(value), value);
  assert.ok(
    germanCourseAudio.every(
      (a) => a.targetLanguage === "de" && a.accentProfile === "german_standard",
    ),
  );
  assert.ok(germanCourseAudio.every((a) => a.storagePath.startsWith("yo/de/")));
  assert.ok(
    (germanCourseAudio.reduce((sum, a) => sum + Buffer.byteLength(a.text), 0) *
      30) /
      1e6 <
      3,
  );
});

test("budgets and directions reuse the proven engines without rewarding a wrong route", () => {
  for (const a of practice) {
    if (a.kind === "cafe") {
      assert.ok(
        checkItalianCafe(
          a,
          Object.fromEntries(a.order.map((o) => [o.itemId, o.quantity])),
        ),
      );
      assert.equal(checkItalianCafe(a, {}), false);
    }
    if (a.kind === "map") {
      assert.ok(checkItalianMap(a, a.path));
      assert.equal(checkItalianMap(a, []), false);
    }
  }
});

test("progress is German-only; assisted work, spaced review, assessment and reset stay distinct", () => {
  assert.notEqual(GERMAN_PROGRESS_KEY, ITALIAN_COURSE_PROGRESS_KEY);
  const now = Date.UTC(2026, 10, 1),
    id = practice[0].id;
  let state = recordCourseActivity(
    emptyCourseProgress(),
    germanCatalog,
    id,
    true,
    true,
    now,
  );
  assert.equal(state.activities[id].independent, false);
  state = recordCourseActivity(state, germanCatalog, id, true, false, now + 1);
  assert.equal(state.activities[id].independent, true);
  assert.deepEqual(getDueActivityIds(state, germanCatalog, now), []);
  assert.ok(
    getDueActivityIds(state, germanCatalog, now + 2 * 86400000).includes(id),
  );
  state = recordCourseAssessment(
    state,
    germanCatalog,
    germanFinal.id,
    12,
    16,
    false,
    now + 2,
  );
  assert.equal(state.assessments[germanFinal.id].bestIndependent, 75);
  assert.deepEqual(
    mergeCourseProgress(state, resetCourseProgress(state, now + 3)).activities,
    {},
  );
});

test("course links keep locales and only serializable lesson data crosses the route boundary", () => {
  for (const locale of ["fr", "en", "es"] as const)
    assert.equal(
      germanCourseHref(locale, "u01"),
      "/yo/langues/allemand/parcours/u01?lang=" + locale,
    );
  const cloned = JSON.parse(
    JSON.stringify({
      germanCourseUnits,
      germanCatalog,
      germanFinal,
      germanCultureFinal,
    }),
  );
  assert.deepEqual(cloned.germanCourseUnits, germanCourseUnits);
  const route = readFileSync(
    "app/yo/langues/allemand/parcours/[unitId]/page.tsx",
    "utf8",
  );
  assert.match(route, /notFound\(/);
  assert.doesNotMatch(route, /use client/);
  for (const file of [
    "GermanCourseUnit",
    "GermanCourseDashboard",
    "GermanCourseFinal",
    "GermanAssessment",
  ]) {
    const client = readFileSync(
      "components/yo/german/" + file + ".tsx",
      "utf8",
    );
    assert.doesNotMatch(
      client,
      /from ["'].*(?:courseData|germanCourseAudio|courseAudioPublished)["']/,
    );
  }
});
