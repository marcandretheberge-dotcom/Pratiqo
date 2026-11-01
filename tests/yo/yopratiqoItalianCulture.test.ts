import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { italianCultureFinal, italianCulturePhotos } from "@/lib/yo/italian/course/courseCulture";
import { courseAssessments, italianCourseCatalog, italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { emptyCourseProgress, parseCourseProgress, recordCourseAssessment, serializeCourseProgress } from "@/lib/yo/italian/course/courseProgress";

test("final cultural challenge follows the language final and is registered in the existing catalog", () => {
  assert.equal(courseAssessments.at(-2)?.id, "it1-final");
  assert.equal(courseAssessments.at(-1), italianCultureFinal);
  assert.equal(italianCultureFinal.questions.length, 10);
  assert.equal(italianCultureFinal.questions.filter(q => q.photo).length, 4);
  assert.equal(italianCourseCatalog.assessments.find(a => a.id === italianCultureFinal.id)?.questionCount, 10);
  assert.deepEqual(italianCultureFinal.unitIds, italianCourseUnits.map(unit => unit.id));
});

test("every cultural answer is taught before the finale, outside answers and hints", () => {
  const anchors = ["Bologna", "Firenze", "Venezia", "Roma", "portici", "Arno", "vaporetto", "amphitheatre", "Al banco", "Quadrilatero"];
  for (const [i, question] of italianCultureFinal.questions.entries()) {
    const unit = italianCourseUnits.find(u => u.id === question.taughtInUnitId);
    assert.ok(unit, question.id);
    const taught = JSON.stringify({ culture: unit.culture, stop: unit.cultureStop, vocabulary: unit.lessons.map(l => l.vocabulary), grammar: unit.lessons.map(l => l.grammar) });
    assert.ok(taught.includes(anchors[i]), `${question.id}: ${anchors[i]} is taught`);
    if (question.photo) assert.deepEqual(question.photo, unit.cultureStop?.photo);
  }
});

test("landmark photographs are local, licensed, correctly dimensioned and lightweight", async () => {
  let total = 0;
  for (const photo of Object.values(italianCulturePhotos)) {
    assert.match(photo.src, /^\/images\/yo\/italian\/culture\/[a-z-]+\.webp$/);
    const buffer = readFileSync(`public${photo.src}`);
    total += buffer.length;
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.width, photo.width);
    assert.equal(metadata.height, photo.height);
    assert.equal(metadata.format, "webp");
    assert.equal(new URL(photo.sourceUrl).hostname, "commons.wikimedia.org");
    assert.equal(new URL(photo.licenseUrl).hostname, "creativecommons.org");
    assert.ok(photo.author);
    for (const locale of ["fr", "en", "es"] as const) {
      assert.ok(photo.alt[locale].length > 30);
      assert.doesNotMatch(photo.alt[locale], /Bologna|Bologne|Bolonia|Firenze|Florence|Florencia|Venice|Venise|Venezia|Venecia|Rome|Roma|Colosse|Colisée|Coliseo/i);
    }
  }
  assert.ok(total < 400_000, `four photos total ${total} bytes`);
});

test("cultural score survives reload without replacing language scores or old progress", () => {
  const now = Date.now();
  const previous = recordCourseAssessment(emptyCourseProgress(), italianCourseCatalog, "it1-final", 6, 8, false, now);
  const next = recordCourseAssessment(previous, italianCourseCatalog, italianCultureFinal.id, 8, 10, false, now);
  const reloaded = parseCourseProgress(serializeCourseProgress(next), italianCourseCatalog, now);
  assert.equal(reloaded.assessments[italianCultureFinal.id].bestIndependent, 80);
  assert.deepEqual(reloaded.assessments["it1-final"], previous.assessments["it1-final"]);
  assert.deepEqual(parseCourseProgress(serializeCourseProgress(previous), italianCourseCatalog, now), previous);
  assert.equal(recordCourseAssessment(previous, italianCourseCatalog, italianCultureFinal.id, 4, 5, false, now).assessments[italianCultureFinal.id], undefined);
});
