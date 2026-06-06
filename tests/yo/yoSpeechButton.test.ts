/**
 * YoSpeechButton regression tests.
 *
 * Pure/static tests. No browser, no audio playback, no OpenAI, no MP3s.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  sanitizeYoSpeechText,
  YO_SPANISH_SPEECH_LANG_PRIORITY,
} from "@/components/yo/YoSpeechButton";

const REPO_ROOT = process.cwd();
const COMPONENT_FILE = "components/yo/YoSpeechButton.tsx";

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

test("component is an isolated client boundary for browser speech", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.startsWith('"use client";'));
  assert.ok(src.includes("speechSynthesis"));
  assert.ok(src.includes("SpeechSynthesisUtterance"));
  assert.ok(src.includes("synth.cancel()"));
  assert.ok(src.includes("synth.speak(utterance)"));
});

test("Spanish voice priority starts with Dominican/Latin American options", () => {
  assert.deepEqual(YO_SPANISH_SPEECH_LANG_PRIORITY.slice(0, 5), [
    "es-DO",
    "es-419",
    "es-US",
    "es-ES",
    "es",
  ]);
});

test("sanitizeYoSpeechText removes placeholders", () => {
  assert.equal(
    sanitizeYoSpeechText("Excuse-moi, t'as dit quoi pour [X] ?"),
    "Excuse-moi, t'as dit quoi pour ce mot?",
  );
  assert.equal(
    sanitizeYoSpeechText("Comment on dit [mot] ?"),
    "Comment on dit ce mot?",
  );
  assert.equal(
    sanitizeYoSpeechText("Repite [palabra], por favor."),
    "Repite la palabra, por favor.",
  );
  assert.equal(sanitizeYoSpeechText("Diga {word}, por favor."), "Diga la palabra, por favor.");
  assert.equal(sanitizeYoSpeechText("Diga {{word}}, por favor."), "Diga la palabra, por favor.");
});

test("sanitizeYoSpeechText converts slash variants into separate phrases", () => {
  assert.equal(sanitizeYoSpeechText("Tiens / Tenez"), "Tiens. Tenez.");
  assert.equal(
    sanitizeYoSpeechText("Para comer aquí / para llevar"),
    "Para comer aquí. Para llevar.",
  );
});

test("component does not import OpenAI, MP3, server secrets, or audio generator code", () => {
  const src = read(COMPONENT_FILE);
  for (const forbidden of [
    "openai",
    "OPENAI_API_KEY",
    ".mp3",
    "generate-yopratiqo-audio",
    "storagePath",
    "audioUrl",
    "fetch(",
  ]) {
    assert.ok(!src.includes(forbidden), `Forbidden token found: ${forbidden}`);
  }
});

test("unavailable state is represented without throwing on unsupported devices", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.includes("Audio unavailable on this device"));
  assert.ok(src.includes("disabled={disabled}"));
  assert.ok(src.includes("VolumeX"));
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoSpeechButton\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  fail  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed - ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
