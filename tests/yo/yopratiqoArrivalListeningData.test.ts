import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { arrivalListeningScenes } from "@/lib/yo/dominicanArrivalListening";
import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";
import type { YoLocalizedString } from "@/lib/yo/types";

function localized(value: YoLocalizedString, context: string): void {
  for (const locale of ["fr", "en", "es"] as const) {
    assert.ok(value[locale]?.trim(), `${context}: missing ${locale}`);
  }
}

const allAudioSources = new Set<string>();
let questionCount = 0;
let roleplayCount = 0;
for (const scene of Object.values(arrivalListeningScenes)) {
  const canonical = scene.id === "airport"
    ? dominicanRepublicHotelAirport.airportDialogue
    : dominicanRepublicHotelAirport.hotelDialogue;
  assert.deepEqual(scene.lines.map((line) => line.target), canonical.lines.map((line) => line.target));
  const spoken = [...scene.lines, ...scene.practiceLines];
  const byId = new Map(spoken.map((line) => [line.id, line]));
  assert.equal(byId.size, spoken.length, "Spoken line IDs must be unique within a scene");
  for (const value of [scene.title, scene.scenario, scene.goal]) localized(value, scene.id);
  assert.equal(typeof scene.audioReady, "boolean");

  for (const line of spoken) {
    localized(line.speaker, line.id);
    localized(line.translation, line.id);
    assert.ok(line.speechText.trim());
    assert.doesNotMatch(line.speechText, /\[[^\]]+\]/, "Spoken text must not contain a template placeholder");
    assert.match(line.audioSrc, /^\/audio\/yo\/es\/do\/module-2\/arrival-v1\/[a-z0-9-]+\.mp3$/);
    assert.ok(!allAudioSources.has(line.audioSrc), "A different spoken line must not reuse the same recording path");
    allAudioSources.add(line.audioSrc);
    if (scene.audioReady) {
      const asset = path.join(process.cwd(), "public", line.audioSrc.slice(1));
      assert.ok(existsSync(asset) && statSync(asset).size > 0, `Ready scene is missing recording: ${line.id}`);
    }
  }

  for (const question of scene.questions) {
    questionCount += 1;
    localized(question.prompt, question.id);
    localized(question.feedback, question.id);
    const optionIds = question.options.map((option) => option.id);
    assert.equal(new Set(optionIds).size, optionIds.length, "Question option IDs must be unique");
    assert.equal(optionIds.filter((id) => id === question.correctOptionId).length, 1);
    assert.ok(question.options.every((option) => option.target.trim()));
    assert.ok(byId.has(question.replayLineId), `Question replay is missing: ${question.id}`);
    assert.equal(byId.get(question.replayLineId)?.isLearner, false, "Listening answers come from the employee's lines");
  }

  for (const turn of scene.roleplay) {
    roleplayCount += 1;
    localized(turn.instruction, turn.id);
    assert.ok(turn.modelLineIds.length > 0, "Each roleplay needs a model response");
    for (const id of turn.promptLineIds) {
      assert.ok(byId.has(id), `Missing roleplay prompt: ${id}`);
      assert.equal(byId.get(id)?.isLearner, false, "The employee prompts the traveller");
    }
    for (const id of turn.modelLineIds) {
      assert.ok(byId.has(id), `Missing model response: ${id}`);
      assert.equal(byId.get(id)?.isLearner, true, "The learner models the traveller's response");
    }
  }

  for (const phrase of scene.phrases) {
    localized(phrase.translation, phrase.id);
    const recording = spoken.find((line) => line.audioSrc === phrase.audioSrc);
    assert.equal(phrase.target, recording?.target, "Phrase text must match its recording, not a shortened excerpt");
  }
  console.log(`ok - ${scene.id}: canonical transcript, complete locales, valid listening and roleplay references`);
}

assert.equal(questionCount, 3);
assert.equal(roleplayCount, 8);
assert.equal(allAudioSources.size, 14);
const hotel = arrivalListeningScenes.hotel;
assert.ok(!hotel.lines.some((line) => line.id === "hotel-repeat"), "Practice-only repetition model must not leak into the original transcript");
assert.equal(hotel.lines.find((line) => line.id === "hotel-07")?.target, "Su habitación es la 204.");
assert.equal(hotel.lines.find((line) => line.id === "hotel-07")?.speechText, "Su habitación es la doscientos cuatro.");
console.log("ok - 3 listening checks, 8 roleplay turns, and 14 distinct recording paths; number speech matches the transcript");
