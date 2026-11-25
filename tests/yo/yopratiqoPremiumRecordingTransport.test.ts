import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type WebSocket from "ws";
import {
  COURSE_RECORDING_MODEL, COURSE_RECORDING_VOICE, RECORDING_OUTPUT_TOKEN_CAP,
  courseRecordingRequest, courseRecordingReservation, recordingTranscriptMatches,
  recordingUsageUpperBound, recordCourseScript, validateCourseRecording,
  type CourseRecordingInput,
} from "../../scripts/lib/realtimeCourseRecording";

const input = { text: "Bonjour, Yoppo !", instructions: "Speak in Canadian French, slowly and naturally." };
const usage = { input_tokens: 120, output_tokens: 180, input_token_details: { audio_tokens: 0, image_tokens: 0 } };
const testKey = "test-private-recording-key";
function tone(seconds = 0.5): Buffer {
  const samples = Math.round(seconds * 24_000), pcm = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index++) pcm.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * 440 * index / 24_000)), index * 2);
  return pcm;
}
class Socket extends EventEmitter {
  sent: Array<{ type: string; response: ReturnType<typeof courseRecordingRequest>["response"] }> = [];
  closed = 0;
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.closed++; this.emit("close"); }
  terminate() { this.closed++; this.emit("close"); }
  event(value: unknown) { this.emit("message", Buffer.from(JSON.stringify(value))); }
}
function recording(script: CourseRecordingInput = input) {
  const socket = new Socket(); let connections = 0;
  const result = recordCourseScript(script, testKey, (url, options) => {
    connections++;
    assert.equal(url, `wss://api.openai.com/v1/realtime?model=${COURSE_RECORDING_MODEL}`);
    assert.equal(options.headers?.Authorization, `Bearer ${testKey}`);
    assert.equal(options.followRedirects, false);
    return socket as unknown as WebSocket;
  });
  const session = () => socket.event({ type: "session.created", session: { model: COURSE_RECORDING_MODEL } });
  const created = (id = "response-1") => socket.event({ type: "response.created", response: { id, status: "in_progress" } });
  const audio = (bytes: Buffer, id = "response-1") => socket.event({ type: "response.output_audio.delta", response_id: id, item_id: "item-1", output_index: 0, content_index: 0, delta: bytes.toString("base64") });
  const transcript = (text = script.text, id = "response-1") => socket.event({ type: "response.output_audio_transcript.done", response_id: id, item_id: "item-1", output_index: 0, content_index: 0, transcript: text });
  const done = (id = "response-1", status = "completed") => socket.event({ type: "response.done", response: { id, status, usage } });
  return { socket, result, session, created, audio, transcript, done, connections: () => connections };
}
function isSafeError(error: unknown) {
  return error instanceof Error && !error.message.includes(testKey) && !error.message.includes("provider-private-detail");
}

test("recording waits for the approved model and sends one bounded context-free request", async () => {
  const run = recording();
  assert.equal(run.socket.sent.length, 0, "opening a socket alone must not start generation");
  run.session(); run.session(); run.created();
  const bytes = tone();
  // A stream may divide the byte payload at arbitrary boundaries.
  run.audio(bytes.subarray(0, 3001)); run.audio(bytes.subarray(3001, 7123)); run.audio(bytes.subarray(7123));
  run.transcript("BONJOUR YOPPO."); run.done();
  const result = await run.result;
  assert.deepEqual(result.pcm, bytes); assert.equal(result.transcript, "BONJOUR YOPPO.");
  assert.deepEqual(result.usage, usage);
  assert.equal(run.connections(), 1); assert.equal(run.socket.sent.length, 1);
  const request = run.socket.sent[0];
  assert.equal(request.type, "response.create");
  assert.deepEqual(request.response.input, []); assert.equal(request.response.conversation, "none");
  assert.deepEqual(request.response.tools, []); assert.equal(request.response.tool_choice, "none");
  assert.deepEqual(request.response.output_modalities, ["audio"]);
  assert.equal(request.response.audio.output.voice, COURSE_RECORDING_VOICE);
  assert.deepEqual(request.response.audio.output.format, { type: "audio/pcm", rate: 24000 });
  assert.equal(request.response.max_output_tokens, RECORDING_OUTPUT_TOKEN_CAP);
  assert.deepEqual(request.response.reasoning, { effort: "minimal" });
  assert.ok(Number.isInteger(request.response.max_output_tokens) && request.response.max_output_tokens <= 1024);
  assert.ok(request.response.instructions.endsWith("SCRIPT:\n" + input.text));
});

test("missing credentials and invalid scripts cannot open a provider connection", async () => {
  let connections = 0;
  const factory = () => { connections++; throw new Error("The provider must not be reached"); };
  await assert.rejects(recordCourseScript(input, "", factory), /required/);
  for (const script of [{ ...input, text: "" }, { ...input, text: "x".repeat(1501) }, { ...input, instructions: "" }, { ...input, instructions: "x".repeat(4501) }]) {
    await assert.rejects(async () => recordCourseScript(script, testKey, factory));
  }
  assert.equal(connections, 0);
});

test("exact wording preserves accents, script, numbers and negation across languages", () => {
  for (const [expected, actual] of [
    ["Ça va !", "Ça va."], ["Per favore, un caffè.", "PER FAVORE UN CAFFÈ!"],
    ["こんにちは。", "こんにちは！"], ["请问，车站在哪儿？", "请问车站在哪儿"],
  ]) assert.equal(recordingTranscriptMatches(expected, actual), true);
  for (const [expected, actual] of [
    ["Ça va", "Ca va"], ["Un caffè", "Un caffè, grazie"], ["一二三", "123"],
    ["I cannot go", "I can go"], ["¿Dónde está?", "Where is it?"], ["Hallo", "Hallo Hallo"], ["...", "..."],
  ]) assert.equal(recordingTranscriptMatches(expected, actual), false, `${expected} must not match ${actual}`);
});

test("valid PCM needs real duration and amplitude before it can enter an encoding step", () => {
  assert.equal(validateCourseRecording(input, { pcm: tone(), transcript: input.text, usage }), 0.5);
  for (const pcm of [Buffer.alloc(0), tone(0.2), Buffer.alloc(24_000), Buffer.alloc(24_001), tone(40.1)]) {
    assert.throws(() => validateCourseRecording(input, { pcm, transcript: input.text, usage }));
  }
  assert.throws(() => validateCourseRecording(input, { pcm: tone(), transcript: "Bonjour, voici la traduction.", usage }), /transcript/i);
});

test("usage settlement includes unknown output token types and rejects unbounded or unexpected modalities", () => {
  const amount = recordingUsageUpperBound(usage), reserved = courseRecordingReservation(input);
  assert.equal(amount, 120 * 4 + 180 * 64);
  assert.ok(reserved > amount && reserved < 200_000);
  for (const bad of [undefined, {}, { ...usage, output_tokens: Infinity }, { ...usage, input_tokens: -1 },
    { ...usage, input_tokens: 0.5 }, { ...usage, output_tokens: RECORDING_OUTPUT_TOKEN_CAP + 1 },
    { ...usage, input_token_details: { audio_tokens: 1, image_tokens: 0 } },
    { ...usage, input_token_details: { audio_tokens: 0, image_tokens: 1 } }]) {
    assert.throws(() => recordingUsageUpperBound(bad));
  }
  assert.ok(courseRecordingReservation({ ...input, text: "你好".repeat(500) }) > reserved, "the reserve accounts for multibyte script bytes");
});

test("provider, protocol and connection failures settle once and never retry or expose provider details", async () => {
  const failures: Array<(run: ReturnType<typeof recording>) => void> = [
    (run) => run.socket.event({ type: "session.created", session: { model: "unapproved-model" } }),
    (run) => { run.session(); run.socket.event({ type: "error", error: { message: testKey + ": provider-private-detail", code: "rate_limit_exceeded" } }); },
    (run) => { run.session(); run.socket.emit("error", new Error(testKey)); },
    (run) => { run.session(); run.socket.emit("close"); },
    (run) => { run.session(); run.socket.emit("message", Buffer.from("{not-json")); },
    (run) => { run.session(); run.created(); run.audio(tone()); run.transcript(); run.done("response-1", "incomplete"); },
    (run) => { run.session(); run.created(); run.audio(tone()); run.transcript("Additional invented words"); run.done(); },
    (run) => { run.session(); run.created(); run.socket.event({ type: "response.output_audio.delta", response_id: "response-1", item_id: "item-1", output_index: 0, content_index: 0, delta: "invalid-base64$" }); },
    (run) => { run.session(); run.created(); run.audio(Buffer.alloc(1_920_002)); },
  ];
  for (const fail of failures) {
    const run = recording(); fail(run);
    await assert.rejects(run.result, isSafeError);
    const sent = run.socket.sent.length;
    run.session(); run.created(); run.audio(tone()); run.transcript(); run.done();
    await Promise.resolve();
    assert.equal(run.connections(), 1); assert.equal(run.socket.sent.length, sent);
    assert.ok(run.socket.closed >= 1);
  }
});

test("an unexpected response cannot contribute PCM, replace the transcript or complete the requested response", async () => {
  const variations: Array<(run: ReturnType<typeof recording>) => void> = [
    (run) => { run.created(); run.created("response-2"); run.audio(tone()); run.transcript(); run.done(); },
    (run) => { run.created(); run.audio(tone(), "response-2"); run.transcript(); run.done(); },
    (run) => { run.created(); run.audio(tone()); run.transcript(input.text, "response-2"); run.done(); },
    (run) => { run.created(); run.audio(tone()); run.transcript(); run.done("response-2"); },
    (run) => { run.audio(tone()); run.transcript(); run.done(); },
  ];
  for (const unexpected of variations) {
    const run = recording(); run.session(); unexpected(run);
    await assert.rejects(run.result, isSafeError);
    assert.equal(run.connections(), 1); assert.equal(run.socket.sent.length, 1);
  }
});
