import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type WebSocket from "ws";
import { conversationPrompt, feedbackPrompt } from "../../lib/yo/speech/prompts";
import { SPEECH_LANGUAGES, SPEECH_SCENARIOS } from "../../lib/yo/speech/catalog";
import { parseSpeechFeedback, parseSpeechTurn, SPEECH_CONSENT_VERSION, SPEECH_MAX_PROMPT_BYTES, type SpeechTurn } from "../../lib/yo/speech/contract";
import { responseCostMicroUsd, runSpeechTurn, type SpeechSocketFactory } from "../../lib/yo/speech/provider";
import { encodePcm24k, pcmWavBlob } from "../../lib/yo/speech/recorder";

const turn: SpeechTurn = { requestId: "00000000-0000-4000-8000-000000000001", language: "it", scenarioId: "cafe", locale: "fr", consent: SPEECH_CONSENT_VERSION, rememberCorrections: false, audio: Buffer.alloc(4_800, 8).toString("base64"), history: [] };
const usage = (audio = false) => ({ input_tokens: audio ? 101 : 200, output_tokens: 100,
  input_token_details: { audio_tokens: audio ? 1 : 0, text_tokens: audio ? 100 : 200 },
  output_token_details: { audio_tokens: audio ? 95 : 0, text_tokens: audio ? 5 : 100 } });

class FakeSocket extends EventEmitter {
  sent: { type: string; response?: Record<string, unknown> }[] = [];
  terminated = false;
  constructor(private mode: "normal" | "abort" | "automatic" | "extra" | "capped" | "wrong-model" | "expensive" = "normal") { super(); }
  emitEvent(event: object) { this.emit("message", Buffer.from(JSON.stringify(event))); }
  terminate() { this.terminated = true; }
  send(raw: string) {
    const event = JSON.parse(raw); this.sent.push(event);
    queueMicrotask(() => {
      if (this.terminated) return;
      if (event.type === "session.update") this.emitEvent({ type: "session.updated", session: { ...event.session,
        audio: { ...event.session.audio, input: { ...event.session.audio.input, turn_detection: this.mode === "automatic" ? { type: "server_vad" } : null } } } });
      if (event.type === "input_audio_buffer.append") {
        // Real transcription and commit events can arrive in either order.
        this.emitEvent({ type: "conversation.item.input_audio_transcription.completed", item_id: "user-1", transcript: "Io vuole un caffè." });
      }
      if (event.type === "input_audio_buffer.commit") this.emitEvent({ type: "input_audio_buffer.committed", item_id: "user-1" });
      if (event.type === "response.create") {
        const voice = event.response.output_modalities[0] === "audio", id = voice ? "voice-1" : "feedback-1";
        this.emitEvent({ type: "response.created", response: { id } });
        if (this.mode === "extra") { this.emitEvent({ type: "response.created", response: { id: "rogue-2" } }); return; }
        if (voice) {
          this.emitEvent({ type: "response.output_audio.delta", response_id: "unrelated", delta: Buffer.alloc(100, 9).toString("base64") });
          this.emitEvent({ type: "response.output_audio.delta", response_id: id, delta: Buffer.alloc(100, 1).toString("base64") });
          this.emitEvent({ type: "response.output_audio_transcript.done", response_id: id, transcript: "Certo! Vuole anche un cornetto?" });
        } else this.emitEvent({ type: "response.output_text.delta", response_id: id, delta: JSON.stringify({ message: "Une petite correction utile.", correction: { heard: "Io vuole", better: "Io voglio", hint: "Avec io, on emploie voglio." } }) });
        this.emitEvent({ type: "response.done", response: { id, status: !voice && this.mode === "capped" ? "incomplete" : "completed",
          status_details: !voice && this.mode === "capped" ? { reason: "max_output_tokens" } : null,
          usage: this.mode === "expensive" ? { ...usage(voice), output_tokens: 5_000 } : usage(voice) } });
      }
    });
  }
  open() {
    if (this.mode !== "abort") this.emitEvent({ type: "session.created", session: { model: this.mode === "wrong-model" ? "unbounded-model" : "gpt-realtime-2.1" } });
  }
}

async function main() {
  assert.ok(parseSpeechTurn(turn));
  assert.equal(parseSpeechTurn({ ...turn, userId: "other-account" }), null);
  assert.equal(parseSpeechTurn({ ...turn, consent: false }), null);
  assert.equal(parseSpeechTurn({ ...turn, scenarioId: "arbitrary" }), null);
  assert.equal(parseSpeechTurn({ ...turn, history: Array(7).fill({ role: "user", text: "one" }) }), null);
  assert.equal(parseSpeechFeedback(JSON.stringify({ message: "Wrong", correction: { heard: "...", better: "Ciao", hint: "Invented" } }), "un caffè"), null);
  assert.equal(parseSpeechFeedback(JSON.stringify({ message: "Wrong", correction: { heard: "un caffè", better: "test@example.com", hint: "Private" } }), "un caffè"), null);
  assert.equal(parseSpeechFeedback(JSON.stringify({ message: "Wrong", correction: { heard: "absent", better: "Ciao", hint: "Invented" } }), "un caffè"), null);
  assert.equal(SPEECH_LANGUAGES.es.locale, "es-419", "shared Spanish speech must not force the Dominican locale onto other course destinations");
  for (const scenarioId of Object.keys(SPEECH_SCENARIOS) as SpeechTurn["scenarioId"][]) {
    assert.doesNotMatch(conversationPrompt({ ...turn, language: "es", scenarioId }), /Dominican|Montevideo|Uruguay|es-DO/i, "the shared voice prompt must not impose a country on a generic scenario");
  }
  for (const language of Object.keys(SPEECH_LANGUAGES) as SpeechTurn["language"][]) for (const scenarioId of Object.keys(SPEECH_SCENARIOS) as SpeechTurn["scenarioId"][]) {
    const sample = { ...turn, language, scenarioId };
    assert.ok(Buffer.byteLength(conversationPrompt(sample)) <= SPEECH_MAX_PROMPT_BYTES);
    assert.ok(Buffer.byteLength(feedbackPrompt(sample, "test")) <= SPEECH_MAX_PROMPT_BYTES);
  }
  // At most two bounded prompts; one audio input; both output caps conservatively priced as audio.
  const conservativeMaximum = 2 * (12_000 + 2_048) * 4 + (150 + 128) * 32 + 2 * 256 * 64 + 15 * 75;
  assert.equal(conservativeMaximum, 155_173); assert.ok(conservativeMaximum < 200_000);
  assert.throws(() => responseCostMicroUsd({ ...usage(), output_tokens: 257 }), /usage_bound/);
  assert.throws(() => responseCostMicroUsd(null), /usage_missing/);

  const encoded = encodePcm24k(new Float32Array(48_000).fill(0.25), 48_000);
  assert.equal(Buffer.from(encoded, "base64").length, 48_000);
  const wav = Buffer.from(await pcmWavBlob(encoded).arrayBuffer());
  assert.equal(wav.toString("ascii", 0, 4), "RIFF"); assert.equal(wav.readUInt32LE(24), 24_000); assert.equal(wav.readUInt32LE(40), 48_000);

  async function exercise(mode: ConstructorParameters<typeof FakeSocket>[0]) {
    const socket = new FakeSocket(mode), controller = new AbortController();
    const factory: SpeechSocketFactory = (url, options) => {
      assert.equal(url, "wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1");
      assert.equal(options.followRedirects, false); assert.equal(options.headers?.Authorization, "Bearer test-key");
      queueMicrotask(() => socket.open()); return socket as unknown as WebSocket;
    };
    const promise = runSpeechTurn(turn, "test-key", controller.signal, factory);
    if (mode === "abort") { controller.abort(); await assert.rejects(promise, /aborted/); }
    else if (mode === "automatic") await assert.rejects(promise, /automatic_turns_forbidden/);
    else if (mode === "extra") await assert.rejects(promise, /extra_response/);
    else if (mode === "wrong-model") await assert.rejects(promise, /model_mismatch/);
    else if (mode === "expensive") await assert.rejects(promise, /usage_bound/);
    else {
      const result = await promise;
      assert.equal(result.transcript, "Io vuole un caffè.");
      assert.deepEqual(Buffer.from(result.audio, "base64"), Buffer.alloc(100, 1), "unrelated response audio never leaks into the reply");
      assert.equal(result.usageMicroUsd, responseCostMicroUsd(usage(true)) + responseCostMicroUsd(usage()) + 8);
      assert.equal(result.feedback?.correction?.better ?? null, mode === "capped" ? null : "Io voglio");
      const responses = socket.sent.filter((event) => event.type === "response.create");
      assert.equal(responses.length, 2);
      assert.equal(responses[1].response?.conversation, "none"); assert.deepEqual(responses[1].response?.input, []);
      assert.ok(responses.every((event) => event.response?.max_output_tokens === 256 && event.response?.tool_choice === "none"));
    }
    assert.equal(socket.terminated, true);
  }
  for (const mode of ["normal", "capped", "abort", "automatic", "extra", "wrong-model", "expensive"] as const) await exercise(mode);
  console.log("Speech provider: all eight languages/five scenarios, consent validation, grounded feedback, PCM/WAV, two-response bounds, out-of-order transcription, cancellation and cost guard passed");
}
void main();
