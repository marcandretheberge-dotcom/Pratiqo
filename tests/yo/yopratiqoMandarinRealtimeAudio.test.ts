import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { test } from "node:test";
import type WebSocket from "ws";
import { mandarinCourseAudio } from "../../lib/yo/audio/mandarinCourseAudio";
import { isRegisteredMandarinAudioAddition } from "../helpers/mandarinAudioScope";
import {
  MODEL,
  VOICE,
  BUDGET_MICRO_USD,
  recordingRequest,
  exactTranscript,
  requestReservation,
  reserveBudget,
  usageUpperBound,
  validateRecording,
  acquireGenerationLock,
  record,
} from "../../scripts/generate-mandarin-course-local-audio";

const usage = {
  input_tokens: 85,
  output_tokens: 116,
  input_token_details: { audio_tokens: 0, image_tokens: 0 },
};
test("audio scope allows only registered additions and never replacement of original files", () => {
  for (const { storagePath } of mandarinCourseAudio) {
    const file = `public/audio/${storagePath}`;
    for (const version of [file, file.replace("/v2/", "/v1/")]) {
      assert.equal(isRegisteredMandarinAudioAddition(version, new Set()), true);
      assert.equal(
        isRegisteredMandarinAudioAddition(version, new Set([version])),
        false,
      );
    }
  }
  for (const file of [
    "public/audio/yo/zh/unregistered.mp3",
    "public/audio/yo/zh/mandarin-foundations/v2/mandarin-standard/sentence/0000000000000000.mp3",
    "public/audio/yo/it/replacement.mp3",
    "public/audio/yo/zh/reference-tones/tone-5.mp3",
    "app/api/stripe/route.ts",
  ]) {
    assert.equal(isRegisteredMandarinAudioAddition(file, new Set()), false);
  }
});
function pcm() {
  const bytes = Buffer.alloc(48000);
  bytes.writeInt16LE(2000);
  return bytes;
}
class FakeSocket extends EventEmitter {
  sent: string[] = [];
  send(value: string) {
    this.sent.push(value);
  }
  close() {
    this.emit("close");
  }
  terminate() {
    this.emit("close");
  }
  event(value: unknown) {
    this.emit("message", Buffer.from(JSON.stringify(value)));
  }
}
function factory(socket: FakeSocket) {
  return (url: string, options: WebSocket.ClientOptions) => {
    assert.equal(url, `wss://api.openai.com/v1/realtime?model=${MODEL}`);
    assert.equal(options.followRedirects, false);
    assert.equal(options.headers?.Authorization, "Bearer fake-test-key");
    return socket as unknown as WebSocket;
  };
}
test("the chosen model uses Marin, exact scripts, no context, tools or unlimited output", () => {
  const request = recordingRequest("你好！").response;
  assert.equal(VOICE, "marin");
  assert.equal(request.audio.output.voice, VOICE);
  assert.equal(request.audio.output.format.rate, 24000);
  assert.equal(request.max_output_tokens, 512);
  assert.deepEqual(request.input, []);
  assert.deepEqual(request.tools, []);
  assert.equal(request.conversation, "none");
  assert.ok(request.instructions.endsWith("SCRIPT:\n你好！"));
  assert.throws(() => recordingRequest(""));
});
test("transcript matching ignores punctuation, not extra words, changed characters or numbers", () => {
  assert.equal(exactTranscript("你好！", "你 好。"), true);
  for (const text of ["你好，很高兴见到你。", "你号", "你好你好", "Hello", ""])
    assert.equal(exactTranscript("你好！", text), false);
  assert.equal(exactTranscript("一二三", "123"), false);
});
test("cumulative budget includes historical spend; reservations reject invalid/excess amounts", () => {
  const ledger = { requests: 176, reservedMicroUsd: 750210 };
  const reservation = requestReservation("你好！");
  assert.ok(reservation > usageUpperBound(usage));
  assert.deepEqual(reserveBudget(ledger, reservation), {
    requests: 177,
    reservedMicroUsd: 750210 + reservation,
  });
  assert.equal(ledger.reservedMicroUsd, 750210);
  assert.throws(
    () => reserveBudget(ledger, BUDGET_MICRO_USD),
    /budget exhausted/,
  );
  assert.throws(() => reserveBudget(ledger, -1), /Invalid/);
  assert.throws(
    () => reserveBudget({ requests: 1, reservedMicroUsd: NaN }, 1),
    /Invalid/,
  );
});
test("settlement conservatively charges all output including reasoning at audio rate", () => {
  assert.equal(usageUpperBound(usage), 85 * 4 + 116 * 64);
  for (const invalid of [
    undefined,
    {},
    { ...usage, output_tokens: 513 },
    { ...usage, input_token_details: { audio_tokens: 1, image_tokens: 0 } },
  ])
    assert.throws(() => usageUpperBound(invalid), /accounting/);
});
test("silence, empty PCM, partial samples and changed wording cannot enter the course", () => {
  assert.equal(
    validateRecording("你好！", { pcm: pcm(), transcript: "你好", usage }),
    1,
  );
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.alloc(48000),
    Buffer.alloc(48001),
  ])
    assert.throws(() =>
      validateRecording("你好！", { pcm: bytes, transcript: "你好", usage }),
    );
  assert.throws(
    () =>
      validateRecording("你好！", { pcm: pcm(), transcript: "Hello", usage }),
    /Transcript/,
  );
});
test("a completed Realtime response collects actual PCM and sends exactly one request", async () => {
  const socket = new FakeSocket();
  const result = record("你好！", "fake-test-key", factory(socket));
  socket.event({ type: "session.created", session: { model: MODEL } });
  socket.event({ type: "session.created", session: { model: MODEL } });
  socket.event({
    type: "response.output_audio.delta",
    delta: pcm().toString("base64"),
  });
  socket.event({
    type: "response.output_audio_transcript.done",
    transcript: "你好！",
  });
  socket.event({
    type: "response.done",
    response: { status: "completed", usage },
  });
  assert.deepEqual(await result, { pcm: pcm(), transcript: "你好！", usage });
  assert.equal(socket.sent.length, 1);
});
test("failed/truncated responses, wrong model and socket failures do not retry or leak API messages", async () => {
  const events = [
    { type: "response.done", response: { status: "incomplete" } },
    { type: "session.created", session: { model: "other-model" } },
    { type: "error", error: { message: "fake-test-key" } },
  ];
  for (const event of events) {
    const socket = new FakeSocket();
    const result = record("你好！", "fake-test-key", factory(socket));
    socket.event(event);
    await assert.rejects(
      result,
      (error) =>
        error instanceof Error && !error.message.includes("fake-test-key"),
    );
    assert.equal(socket.sent.length, 0);
  }
  const socket = new FakeSocket(),
    result = record("你好！", "fake-test-key", factory(socket));
  socket.close();
  await assert.rejects(result, /before completion/);
});
test("generation shares an exclusive lock with the original budget ledger", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mandarin-audio-"));
  try {
    const unlock = await acquireGenerationLock(directory);
    await assert.rejects(acquireGenerationLock(directory), { code: "EEXIST" });
    await unlock();
    await (
      await acquireGenerationLock(directory)
    )();
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep));
    assert.ok(directory.includes("mandarin-audio-"));
    await rm(directory, { recursive: true });
  }
});
