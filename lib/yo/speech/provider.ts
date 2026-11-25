import WebSocket from "ws";
import {
  parseSpeechFeedback, SPEECH_MODEL, SPEECH_OUTPUT_TOKEN_CAP, SPEECH_SAMPLE_RATE,
  SPEECH_TRANSCRIPTION_MODEL, SPEECH_VOICE, type SpeechFeedback, type SpeechTurn,
} from "./contract";
import { conversationPrompt, feedbackPrompt } from "./prompts";

export type SpeechProviderResult = {
  transcript: string; reply: string; audio: string; feedback: SpeechFeedback | null; usageMicroUsd: number;
};
export type SpeechSocketFactory = (url: string, options: WebSocket.ClientOptions) => WebSocket;
const defaultSocket: SpeechSocketFactory = (url, options) => new WebSocket(url, options);
const MAX_AUDIO_BYTES = 768_000;

/** Conservative accounting: cached tokens are charged at the uncached rate. */
export function responseCostMicroUsd(usage: unknown): number {
  if (!usage || typeof usage !== "object") throw new Error("usage_missing");
  const u = usage as Record<string, unknown>;
  const i = u.input_token_details as Record<string, unknown> | undefined;
  const o = u.output_token_details as Record<string, unknown> | undefined;
  const count = (v: unknown) => {
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new Error("usage_invalid");
    return v;
  };
  const input = count(u.input_tokens), output = count(u.output_tokens);
  const audioIn = count(i?.audio_tokens), textIn = count(i?.text_tokens);
  const audioOut = count(o?.audio_tokens), textOut = count(o?.text_tokens);
  if (audioIn + textIn !== input || audioOut + textOut > output || output > SPEECH_OUTPUT_TOKEN_CAP
    || textIn > 14_048 || audioIn > 278) throw new Error("usage_bound");
  // Any non-classified output (including reasoning) is charged at the highest rate.
  return audioIn * 32 + textIn * 4 + audioOut * 64 + textOut * 24 + (output - audioOut - textOut) * 64;
}

/** A fresh, server-owned socket permits exactly one audio reply and one text feedback response. */
export async function runSpeechTurn(turn: SpeechTurn, key: string, signal: AbortSignal, socketFactory = defaultSocket): Promise<SpeechProviderResult> {
  if (signal.aborted) throw new Error("aborted");
  const instructions = conversationPrompt(turn);
  return new Promise((resolve, reject) => {
    const socket = socketFactory(`wss://api.openai.com/v1/realtime?model=${SPEECH_MODEL}`, {
      headers: { Authorization: `Bearer ${key}` }, followRedirects: false, handshakeTimeout: 10_000, maxPayload: 1_100_000,
    });
    let settled = false, configured = false, committed = false, audioDone = false, feedbackStarted = false;
    let itemId = "", transcript = "", reply = "", feedbackText = "", audioSize = 0, cost = 0;
    let audioResponseId = "", feedbackResponseId = "";
    const audio: Buffer[] = [];
    const transcriptEvents = new Map<string, string>();
    // A reservation is never released on uncertainty, including abort/timeout/provider failures.
    const timer = setTimeout(() => finish(new Error("provider_timeout")), 42_000);
    const abort = () => finish(new Error("aborted"));
    signal.addEventListener("abort", abort, { once: true });
    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      socket.terminate();
      if (error) return reject(error);
      // Duration pricing is bounded from validated PCM rather than trusting client duration.
      cost += Math.ceil((Buffer.from(turn.audio, "base64").length / (SPEECH_SAMPLE_RATE * 2)) * 75);
      resolve({ transcript, reply, audio: Buffer.concat(audio).toString("base64"), feedback: parseSpeechFeedback(feedbackText, transcript), usageMicroUsd: cost });
    }
    function send(event: object) { if (!settled) socket.send(JSON.stringify(event)); }
    function maybeFeedback() {
      if (!audioDone || !transcript || feedbackStarted || settled) return;
      feedbackStarted = true;
      send({ type: "response.create", response: {
        conversation: "none", input: [], output_modalities: ["text"],
        instructions: feedbackPrompt(turn, transcript), max_output_tokens: SPEECH_OUTPUT_TOKEN_CAP,
        tools: [], tool_choice: "none", reasoning: { effort: "minimal" },
      } });
    }
    socket.on("error", () => finish(new Error("provider_unavailable")));
    socket.on("close", () => { if (!settled) finish(new Error("provider_closed")); });
    socket.on("message", (raw) => {
      if (settled) return;
      try {
        const event = JSON.parse(raw.toString());
        if (event.type === "error") return finish(new Error("provider_error"));
        if (event.type === "session.created") {
          if (event.session?.model !== SPEECH_MODEL) return finish(new Error("model_mismatch"));
          send({ type: "session.update", session: {
            type: "realtime", model: SPEECH_MODEL, instructions: "You are Yoppo, a bounded language practice partner.",
            max_output_tokens: SPEECH_OUTPUT_TOKEN_CAP, tools: [], tool_choice: "none", reasoning: { effort: "minimal" },
            audio: {
              input: { format: { type: "audio/pcm", rate: SPEECH_SAMPLE_RATE }, turn_detection: null,
                transcription: { model: SPEECH_TRANSCRIPTION_MODEL, languages: [turn.language] } },
              output: { format: { type: "audio/pcm", rate: SPEECH_SAMPLE_RATE }, voice: SPEECH_VOICE },
            },
          } });
        } else if (event.type === "session.updated" && !configured) {
          if (event.session?.audio?.input?.turn_detection !== null || event.session?.max_output_tokens !== SPEECH_OUTPUT_TOKEN_CAP
            || event.session?.audio?.input?.format?.type !== "audio/pcm" || event.session?.audio?.input?.format?.rate !== SPEECH_SAMPLE_RATE) return finish(new Error("automatic_turns_forbidden"));
          configured = true;
          send({ type: "input_audio_buffer.append", audio: turn.audio });
          send({ type: "input_audio_buffer.commit" });
        } else if (event.type === "input_audio_buffer.committed" && configured && !committed) {
          if (typeof event.item_id !== "string" || !event.item_id) return finish(new Error("missing_item"));
          committed = true; itemId = event.item_id;
          transcript = transcriptEvents.get(itemId) ?? "";
          send({ type: "response.create", response: {
            output_modalities: ["audio"], instructions, max_output_tokens: SPEECH_OUTPUT_TOKEN_CAP,
            audio: { output: { format: { type: "audio/pcm", rate: SPEECH_SAMPLE_RATE }, voice: SPEECH_VOICE } },
            tools: [], tool_choice: "none", reasoning: { effort: "minimal" },
          } });
        } else if (event.type === "conversation.item.input_audio_transcription.completed") {
          if (typeof event.item_id !== "string" || typeof event.transcript !== "string" || event.transcript.length > 1_500) return finish(new Error("transcript_invalid"));
          transcriptEvents.set(event.item_id, event.transcript.trim());
          if (transcriptEvents.size > 1) return finish(new Error("unexpected_input"));
          if (event.item_id === itemId) { transcript = event.transcript.trim(); if (!transcript) return finish(new Error("speech_not_heard")); }
          maybeFeedback();
        } else if (event.type === "conversation.item.input_audio_transcription.failed") {
          return finish(new Error("transcription_failed"));
        } else if (event.type === "response.created") {
          if (!committed || typeof event.response?.id !== "string") return finish(new Error("unexpected_response"));
          if (!audioResponseId && !feedbackStarted) audioResponseId = event.response.id;
          else if (feedbackStarted && !feedbackResponseId) feedbackResponseId = event.response.id;
          else return finish(new Error("extra_response"));
        } else if (event.type === "response.output_audio.delta" && event.response_id === audioResponseId && !audioDone) {
          if (typeof event.delta !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(event.delta)) return finish(new Error("audio_invalid"));
          const bytes = Buffer.from(event.delta, "base64"); audioSize += bytes.length;
          if (audioSize > MAX_AUDIO_BYTES) return finish(new Error("audio_bound"));
          audio.push(bytes);
        } else if (event.type === "response.output_audio_transcript.done" && event.response_id === audioResponseId && !audioDone) {
          if (typeof event.transcript !== "string" || event.transcript.length > 1_500) return finish(new Error("reply_invalid"));
          reply = event.transcript.trim();
        } else if (event.type === "response.output_text.delta" && feedbackStarted && event.response_id === feedbackResponseId) {
          if (typeof event.delta !== "string") return finish(new Error("feedback_invalid"));
          feedbackText += event.delta;
          if (feedbackText.length > 4_000) return finish(new Error("feedback_bound"));
        } else if (event.type === "response.done") {
          const response = event.response;
          const feedbackCapped = response?.id === feedbackResponseId && response?.status === "incomplete" && response?.status_details?.reason === "max_output_tokens";
          if (response?.status !== "completed" && !feedbackCapped) return finish(new Error("response_incomplete"));
          if (response.id === feedbackResponseId && response.usage?.input_token_details?.audio_tokens !== 0) return finish(new Error("usage_bound"));
          cost += responseCostMicroUsd(response.usage);
          if (response.id === audioResponseId && !audioDone) {
            if (!audioSize || audioSize % 2 || !reply) return finish(new Error("reply_missing"));
            audioDone = true; maybeFeedback();
          } else if (response.id === feedbackResponseId && feedbackStarted) { if (feedbackCapped) feedbackText = ""; finish(); }
          else finish(new Error("unexpected_done"));
        }
      } catch (error) {
        finish(error instanceof Error && ["usage_missing", "usage_invalid", "usage_bound"].includes(error.message) ? error : new Error("provider_protocol"));
      }
    });
  });
}
