import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import {
  mandarinUnits,
  mandarinFinal,
  getMandarinUnit,
} from "@/lib/yo/mandarin/course";
import {
  checkAnswer,
  evaluate,
  initialAttempt,
  emptyProgress,
  parseProgress,
  MANDARIN_PROGRESS_KEY,
} from "@/lib/yo/mandarin/progress";
import type { Exercise, Answer } from "@/lib/yo/mandarin/types";
import {
  BreakSession,
  nextQuestion,
  readTriviaHistory,
} from "@/lib/yo/companion/breakPolicy";
import { pictureMatching, practiceBuild } from "@/lib/yo/mandarin/activities";
import { yoppoTrivia, triviaCategories } from "@/lib/yo/companion/trivia";
import { mandarinCourseAudio } from "@/lib/yo/audio/mandarinCourseAudio";
import paths from "@/lib/yo/mandarin/audioPaths.json";
import images from "@/lib/yo/mandarin/imageAssets.json";
import tones from "@/lib/yo/mandarin/toneAssets.json";
import {
  exactTranscript,
  recordingRequest,
} from "@/scripts/generate-mandarin-course-local-audio";
import {
  preflightManifest,
  validateMp3,
} from "@/scripts/generate-yopratiqo-audio";

const units = [...mandarinUnits, mandarinFinal];
export function correctAnswer(exercise: Exercise): Answer {
  return exercise.kind === "write"
    ? exercise.accepted[0]
    : exercise.kind === "match"
      ? Object.fromEntries(exercise.pairs.map((_, i) => [String(i), String(i)]))
      : exercise.answer;
}
test("eight original scene-led Mandarin modules and a distinct practical mission serialize safely", () => {
  assert.equal(mandarinUnits.length, 8);
  assert.equal(mandarinFinal.exercises.length, 8);
  assert.equal(getMandarinUnit("not-a-unit"), undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(units)), units);
  const ids = units.flatMap((unit) => unit.exercises.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const unit of mandarinUnits) {
    assert.ok(unit.dialogue.length >= 6);
    assert.ok(unit.vocabulary.length >= 8);
    assert.ok(unit.grammar.length >= 2);
    assert.ok(unit.exercises.some((item) => item.kind === "roleplay"));
    assert.ok(unit.exercises.some((item) => item.kind === "listen"));
    assert.ok(unit.exercises.some((item) => item.kind === "tone"));
    for (const exercise of unit.exercises)
      if (exercise.kind === "build") {
        assert.equal(
          exercise.answer.join(""),
          exercise.model.hanzi.replace(/[。，！？]/g, ""),
        );
      }
    if (unit.number > 1)
      assert.ok(unit.exercises.some((item) => item.id.endsWith("retrieval")));
    for (const phrase of [...unit.dialogue, ...unit.vocabulary]) {
      assert.match(phrase.hanzi, /[\u3400-\u9fff]/);
      assert.ok(phrase.pinyin);
      for (const locale of ["fr", "en", "es"] as const)
        assert.ok(phrase.meaning[locale]);
    }
  }
});
test("every answer can be checked, wrong input fails and audio cannot be bypassed", () => {
  for (const exercise of units.flatMap((unit) => unit.exercises)) {
    const answer = correctAnswer(exercise);
    assert.equal(checkAnswer(exercise, answer), true, exercise.id);
    assert.equal(checkAnswer(exercise, "wrong"), false, exercise.id);
    const attempt = { ...initialAttempt(exercise), answer };
    if (exercise.kind === "listen" || exercise.kind === "tone")
      assert.equal(evaluate(exercise, attempt), null);
    assert.deepEqual(evaluate(exercise, { ...attempt, heard: true }), {
      passed: true,
      independent: true,
      attempts: 1,
      review: false,
    });
    assert.equal(
      evaluate(exercise, { ...attempt, heard: true, assisted: true })
        ?.independent,
      false,
    );
    assert.equal(
      evaluate(exercise, { ...attempt, checked: true, heard: true }),
      null,
    );
  }
});
test("drafts, assistance and exact steps survive refresh; malformed/foreign versions do not", () => {
  const state = emptyProgress(),
    exercise = mandarinUnits[0].exercises[3];
  state.unit = "u03";
  state.steps.u03 = 8;
  state.drafts[exercise.id] = {
    ...initialAttempt(exercise),
    answer: "Nǐ hǎo",
    assisted: true,
    heard: true,
    hint: true,
  };
  state.trivia = 10;
  const restored = parseProgress(JSON.stringify(state));
  assert.equal(restored.steps.u03, 8);
  assert.equal(restored.drafts[exercise.id].answer, "Nǐ hǎo");
  assert.equal(restored.drafts[exercise.id].assisted, true);
  assert.equal(restored.drafts[exercise.id].heard, false);
  assert.deepEqual(restored.results, {});
  assert.deepEqual(parseProgress("{broken"), emptyProgress());
  assert.deepEqual(parseProgress('{"version":99}'), emptyProgress());
  assert.notEqual(MANDARIN_PROGRESS_KEY, "yopratiqo:japanese-foundations:v1");
});
test("return policy counts only active break time and waits for explanation/audio completion", () => {
  let now = 0;
  const session = new BreakSession(() => now);
  session.start();
  session.visible(true);
  now += 60_000;
  session.visible(false);
  now += 600_000;
  session.visible(true);
  assert.notEqual(session.afterExplanation(false), "return");
  now += 120_000;
  session.tick();
  assert.notEqual(session.afterExplanation(true), "return");
  assert.equal(session.afterExplanation(false), "return");
  session.oneMore();
  assert.notEqual(session.afterExplanation(false), "return");
  session.questionCompleted();
  assert.equal(session.afterExplanation(false), "return");
  session.returnToLesson();
  assert.equal(session.phase, "lesson");
});
test("three completed questions invite return; exactly one extra, configurable policy", () => {
  const session = new BreakSession(() => 0);
  session.start();
  for (let i = 0; i < 2; i++) {
    session.questionCompleted();
    assert.equal(session.afterExplanation(false), "break");
  }
  session.questionCompleted();
  assert.equal(session.afterExplanation(false), "return");
  session.oneMore();
  assert.equal(session.afterExplanation(false), "break");
  session.questionCompleted();
  assert.equal(session.afterExplanation(false), "return");
});
test("60 localized sourced questions; balanced categories; no repeats before pool exhaustion", () => {
  assert.equal(yoppoTrivia.length, 60);
  const ids = yoppoTrivia.map((item) => item.id);
  assert.equal(new Set(ids).size, 60);
  for (const category of Object.keys(triviaCategories))
    assert.equal(
      yoppoTrivia.filter((item) => item.category === category).length,
      12,
    );
  for (const question of yoppoTrivia) {
    assert.equal(
      question.choices.filter((choice) => choice.id === question.answer).length,
      1,
    );
    assert.match(question.source, /^https:\/\//);
    assert.match(question.verifiedAt, /^2026-11-0[23]$/);
    for (const locale of ["fr", "en", "es"] as const) {
      assert.ok(question.question[locale] && question.explanation[locale]);
      assert.doesNotMatch(
        question.question[locale],
        /^(Son |Sa |Ses |Leur |Ces |Its |Their |These |Su |Sus |Estos )/,
        question.id + " must identify its subject in a random round",
      );
      assert.equal(
        new Set(question.choices.map((choice) => choice.label[locale])).size,
        3,
      );
    }
  }
  let seen: string[] = [],
    previous = "";
  for (let i = 0; i < 60; i++) {
    const next = nextQuestion(ids, seen, previous, () => 0);
    assert.ok(next.id && !seen.includes(next.id));
    seen = next.seen;
    previous = next.id!;
  }
  assert.notEqual(nextQuestion(ids, seen, previous, () => 0).id, previous);
  assert.deepEqual(readTriviaHistory(JSON.stringify(seen), ids), seen);
  assert.deepEqual(readTriviaHistory("{broken", ids), []);
  assert.deepEqual(readTriviaHistory('["unknown",3,null]', ids), []);
});
test("standalone picture and sentence games have actual matching controls and coherent models", () => {
  assert.equal(pictureMatching.kind, "match");
  if (pictureMatching.kind === "match")
    assert.ok(
      pictureMatching.pairs.every(
        (pair) => pair.image && existsSync("public" + pair.image),
      ),
    );
  assert.equal(
    checkAnswer(pictureMatching, correctAnswer(pictureMatching)),
    true,
  );
  assert.equal(practiceBuild.kind, "build");
  if (practiceBuild.kind === "build")
    assert.equal(
      practiceBuild.answer.join(""),
      practiceBuild.model.hanzi.replace(/[。，！？]/g, ""),
    );
});
test("all shipped speech and native tone assets are real validated MP3s", () => {
  assert.doesNotThrow(() => preflightManifest(mandarinCourseAudio));
  for (const item of mandarinCourseAudio) {
    const src = (paths as Record<string, string>)[item.text];
    assert.ok(src, item.text);
    assert.ok(
      validateMp3(readFileSync("public" + src)).durationSeconds > 0.2,
      item.id,
    );
  }
  for (const tone of Object.values(tones)) {
    assert.match(tone.credit, /\S/);
    assert.match(tone.license, /^CC BY/);
    assert.ok(
      validateMp3(readFileSync("public" + tone.src)).durationSeconds > 0.2,
    );
  }
});
test("every course clip uses the requested model and voice with exact scripts and verified bytes", () => {
  const evidence = JSON.parse(
    readFileSync("lib/yo/mandarin/audioProvenance.json", "utf8"),
  );
  assert.equal(Object.keys(evidence).length, mandarinCourseAudio.length);
  assert.equal(Object.keys(paths).length, mandarinCourseAudio.length);
  const hash = (value: Buffer | string) =>
    createHash("sha256").update(value).digest("hex");
  for (const item of mandarinCourseAudio) {
    const src = (paths as Record<string, string>)[item.text];
    assert.equal(src, "/audio/" + item.storagePath);
    assert.match(src, /\/mandarin-foundations\/v2\//);
    const proof = evidence[item.text],
      bytes = readFileSync("public" + src);
    assert.equal(proof.model, "gpt-realtime-2.1");
    assert.equal(proof.voice, "marin");
    assert.equal(proof.text, item.text);
    assert.equal(exactTranscript(item.text, proof.transcript), true, item.id);
    assert.equal(
      proof.requestHash,
      hash(JSON.stringify(recordingRequest(item.text))),
    );
    assert.equal(proof.sha256, hash(bytes));
    assert.equal(proof.seconds, validateMp3(bytes).durationSeconds);
    const original = "public" + src.replace("/v2/", "/v1/");
    assert.ok(existsSync(original), "Retain original recording for rollback");
  }
  const originals = execFileSync(
    "git",
    [
      "ls-tree",
      "-r",
      "--name-only",
      "HEAD",
      "--",
      "public/audio/yo/zh/mandarin-foundations/v1",
      "public/audio/yo/zh/reference-tones",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const file of originals) {
    const before = execFileSync("git", ["show", `HEAD:${file}`]);
    assert.equal(
      hash(readFileSync(file)),
      hash(before),
      file + " must not be overwritten",
    );
  }
});
test("licensed image dimensions and Chinese source strokes exist locally", async () => {
  for (const image of Object.values(images)) {
    const metadata = await sharp(readFileSync("public" + image.src)).metadata();
    assert.equal(metadata.width, image.width);
    assert.equal(metadata.height, image.height);
    assert.ok(image.credit && image.license && image.source);
  }
  for (const unit of mandarinUnits) {
    const data = JSON.parse(
      readFileSync(
        `public/yo/mandarin-strokes/${unit.character.codePointAt(0)!.toString(16)}.json`,
        "utf8",
      ),
    );
    assert.ok(
      data.strokes.length > 0 && data.medians.length === data.strokes.length,
    );
  }
  assert.ok(existsSync("public/yo/mandarin-strokes/LICENSE.txt"));
});
