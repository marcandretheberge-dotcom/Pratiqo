import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import {
  portugueseCourseUnits as units,
  portugueseCatalog as catalog,
  portugueseFinal,
  portugueseCultureFinal,
} from "@/lib/yo/portuguese/courseData";
import {
  portugueseAudioPaths,
  portugueseUnitSpeech,
} from "@/lib/yo/portuguese/courseAudio.server";
import { portugueseCourseAudio } from "@/lib/yo/audio/portugueseCourseAudio";
import { portuguesePublishedAudio } from "@/lib/yo/portuguese/courseAudioPublished";
import {
  matchesPortugueseAnswer,
  PORTUGUESE_PROGRESS_KEY,
  portugueseCourseHref,
} from "@/lib/yo/portuguese/courseLogic";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import {
  ITALIAN_COURSE_PROGRESS_KEY,
  emptyCourseProgress,
  recordCourseActivity,
  getDueActivityIds,
} from "@/lib/yo/italian/course/courseProgress";
import { assessmentSpeech } from "@/lib/yo/italian/course/courseSpeech";
import {
  checkItalianCafe,
  checkItalianMap,
} from "@/lib/yo/italian/italianModuleLogic";
import {
  preflightManifest,
  validateMp3,
} from "@/scripts/generate-yopratiqo-audio";

const lessons = units.flatMap((u) => u.lessons);
const practice = lessons.flatMap((l) => l.activities);
const assessments = [
  ...units.map((u) => u.quiz),
  portugueseFinal,
  portugueseCultureFinal,
];
const unique = (values: string[]) =>
  assert.equal(new Set(values).size, values.length);
const localized = (value: { fr: string; en: string; es: string }) => {
  for (const locale of ["fr", "en", "es"] as const)
    assert.ok(value[locale]?.trim());
};

test("Brazilian course has eight units, 24 lessons, 148 practices and two distinct finals", () => {
  assert.equal(units.length, 8);
  assert.equal(lessons.length, 24);
  assert.equal(practice.length, 148);
  assert.equal(portugueseFinal.questions.length, 16);
  assert.equal(portugueseCultureFinal.questions.length, 8);
  unique([
    ...practice.map((a) => a.id),
    ...assessments.flatMap((a) => a.questions.map((q) => q.id)),
  ]);
  for (const lesson of lessons) {
    assert.equal(lesson.vocabulary.length, 4);
    localized(lesson.title);
    localized(lesson.grammar.body);
    localized(lesson.pronunciation.body);
    localized(lesson.reading.meaning);
    for (const word of lesson.vocabulary) localized(word.meaning);
    for (const kind of ["match", "order", "choice", "listen", "type"])
      assert.ok(lesson.activities.some((a) => a.kind === kind));
    assert.ok(lesson.activities.some((a) => a.id === lesson.readingActivityId));
    assert.equal(
      lesson.activities.filter((a) => a.kind === "type" && a.listeningText)
        .length,
      1,
    );
  }
  for (const unit of units) {
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.production.rubric.length, 3);
  }
});

test("questions have distinct choices, a single correct target and localized feedback", () => {
  for (const a of [...practice, ...assessments.flatMap((x) => x.questions)]) {
    localized(a.prompt);
    localized(a.title);
    localized(a.explanation);
    if ("options" in a) {
      unique(a.options.map((o) => o.id));
      assert.equal(
        a.options.filter((o) => o.id === a.correctId).length,
        1,
        a.id,
      );
      for (const locale of ["fr", "en", "es"] as const)
        unique(a.options.map((o) => o.it ?? o.label![locale]));
      for (const o of a.options) localized(o.feedback);
    }
    if (a.kind === "type")
      assert.ok(matchesPortugueseAnswer(a.model, a.accepted), a.id);
  }
});

test("Portuguese accents retain meaning and Unicode equivalents are accepted", () => {
  assert.ok(matchesPortugueseAnswer("  BOM DIA! ", ["Bom dia."]));
  assert.ok(matchesPortugueseAnswer("na\u0303o", ["não"]));
  for (const [wrong, right] of [
    ["nao", "não"],
    ["avo", "avó"],
    ["avô", "avó"],
    ["e", "é"],
    ["voce", "você"],
  ])
    assert.equal(matchesPortugueseAnswer(wrong, [right]), false);
});

test("culture quiz tests taught knowledge with real, credited local photos", async () => {
  for (const q of portugueseCultureFinal.questions) {
    const stop = units.find((u) => u.id === q.taughtInUnitId)?.cultureStop;
    assert.ok(stop);
    assert.deepEqual(q.explanation, stop.body);
    if (q.photo) {
      assert.match(q.photo.src, /^\/images\/yo\/portuguese-br\//);
      assert.ok(
        q.photo.author &&
          q.photo.license &&
          q.photo.licenseUrl &&
          q.photo.sourceUrl,
      );
      const image = await sharp("public" + q.photo.src).metadata();
      assert.equal(image.width, q.photo.width);
      assert.equal(image.height, q.photo.height);
      localized(q.photo.alt);
    }
  }
});

test("all course speech is recorded once, with complete MP3s and unit-scoped payloads", () => {
  preflightManifest(portugueseCourseAudio);
  assert.equal(
    Object.keys(portuguesePublishedAudio).length,
    portugueseCourseAudio.length,
  );
  let duration = 0;
  for (const item of portugueseCourseAudio) {
    assert.equal(item.targetLanguage, "pt");
    assert.equal(item.accentProfile, "brazilian_portuguese");
    assert.match(item.storagePath, /^yo\/pt-br\//);
    assert.equal(
      portuguesePublishedAudio[item.text],
      "/audio/" + item.storagePath,
    );
    const seconds = validateMp3(
      readFileSync("public/audio/" + item.storagePath),
    ).durationSeconds;
    assert.ok(seconds > 0.2, `Speech is too short: ${item.id}`);
    duration += seconds;
  }
  assert.ok(duration > 0);
  for (const content of [...units, ...assessments]) {
    const texts =
      "lessons" in content
        ? portugueseUnitSpeech(content)
        : assessmentSpeech(content);
    assert.deepEqual(
      Object.keys(portugueseAudioPaths(content)).sort(),
      [...new Set(texts)].sort(),
    );
  }
  console.log(
    `Verified ${portugueseCourseAudio.length} Portuguese MP3s, ${(duration / 60).toFixed(2)} minutes`,
  );
});

test("dialogue, cafe budget and map reuse strict engines without awarding wrong actions", () => {
  assert.equal(practice.filter((a) => a.kind === "dialogue").length, 2);
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

test("progress and spaced review remain separate from German and Italian", () => {
  unique([
    PORTUGUESE_PROGRESS_KEY,
    GERMAN_PROGRESS_KEY,
    ITALIAN_COURSE_PROGRESS_KEY,
  ]);
  const now = Date.UTC(2026, 10, 1),
    id = practice[0].id;
  let state = recordCourseActivity(
    emptyCourseProgress(),
    catalog,
    id,
    true,
    true,
    now,
  );
  assert.equal(state.activities[id].independent, false);
  state = recordCourseActivity(state, catalog, id, true, false, now + 1);
  assert.equal(state.activities[id].independent, true);
  assert.deepEqual(getDueActivityIds(state, catalog, now), []);
  assert.ok(getDueActivityIds(state, catalog, now + 2 * 86400000).includes(id));
});

test("routes preserve locale, isolate client data and expose the Brazilian course in language selection", () => {
  for (const locale of ["fr", "en", "es"] as const)
    assert.equal(
      portugueseCourseHref(locale, "u01"),
      `/yo/langues/portugais-bresil/parcours/u01?lang=${locale}`,
    );
  assert.deepEqual(JSON.parse(JSON.stringify(units)), units);
  assert.match(
    readFileSync(
      "app/yo/langues/portugais-bresil/parcours/[unitId]/page.tsx",
      "utf8",
    ),
    /notFound\(/,
  );
  assert.match(
    readFileSync("lib/yo/publicCatalog.ts", "utf8"),
    /portugais-bresil\/parcours/,
  );
  for (const name of [
    "GermanCourseDashboard",
    "GermanCourseUnit",
    "GermanCourseFinal",
    "GermanAssessment",
  ]) {
    assert.doesNotMatch(
      readFileSync(`components/yo/german/${name}.tsx`, "utf8"),
      /from ["'].*(?:courseData|portugueseCourseAudio|courseAudioPublished)["']/,
    );
  }
});
