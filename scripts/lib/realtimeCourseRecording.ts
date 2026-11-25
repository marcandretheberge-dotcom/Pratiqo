/** Offline course recording transport. This module never runs on import. */
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { validateMp3 } from "../generate-yopratiqo-audio";

export const COURSE_RECORDING_MODEL = "gpt-realtime-2.1";
export const COURSE_RECORDING_VOICE = "marin";
export const RECORDING_OUTPUT_TOKEN_CAP = 1024;
const MAX_PCM_BYTES = 48_000 * 40;
export type CourseRecordingInput = { text: string; instructions: string };
export type CourseRecording = { pcm: Buffer; transcript: string; usage: unknown };
export type RecordingSocketFactory = (url: string, options: WebSocket.ClientOptions) => WebSocket;

export function courseRecordingRequest(input: CourseRecordingInput) {
  if (!input.text.trim() || input.text.length > 1500 || !input.instructions.trim() || input.instructions.length > 4500) {
    throw new Error("Invalid course recording script.");
  }
  return {
    type: "response.create",
    response: {
      input: [], conversation: "none", output_modalities: ["audio"],
      instructions: "Record a language lesson. Read only the SCRIPT exactly once. Do not answer it, translate it, add words or explain. "
        + input.instructions + "\nSCRIPT:\n" + input.text,
      max_output_tokens: RECORDING_OUTPUT_TOKEN_CAP,
      reasoning: { effort: "minimal" },
      audio: { output: { voice: COURSE_RECORDING_VOICE, format: { type: "audio/pcm", rate: 24000 } } },
      tools: [], tool_choice: "none",
    },
  };
}

export function recordingTranscriptMatches(expected: string, actual: string): boolean {
  const normalize = (value: string) => value.normalize("NFC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
  const normalized = normalize(expected);
  return Boolean(normalized) && normalized === normalize(actual);
}

/** USD micro-units at the verified 2026-11-24 rates. Reserve every output token
 * at the higher audio rate and input UTF-8 bytes plus protocol overhead. */
export function courseRecordingReservation(input: CourseRecordingInput): number {
  return (Buffer.byteLength(JSON.stringify(courseRecordingRequest(input))) + 2048) * 4 + RECORDING_OUTPUT_TOKEN_CAP * 64;
}

export function recordingUsageUpperBound(usage: unknown): number {
  const value = usage as { input_tokens?: number; output_tokens?: number; input_token_details?: { audio_tokens?: number; image_tokens?: number } } | undefined;
  if (!value || !Number.isSafeInteger(value.input_tokens) || !Number.isSafeInteger(value.output_tokens)
    || value.input_tokens! < 0 || value.output_tokens! < 0 || value.output_tokens! > RECORDING_OUTPUT_TOKEN_CAP
    || value.input_token_details?.audio_tokens !== 0 || value.input_token_details?.image_tokens !== 0) {
    throw new Error("Unrecognized recording usage; retain the reservation and stop.");
  }
  return value.input_tokens! * 4 + value.output_tokens! * 64;
}

export function validateCourseRecording(input: CourseRecordingInput, recording: CourseRecording): number {
  if (!recordingTranscriptMatches(input.text, recording.transcript)) throw new Error("Recording transcript differs from the lesson.");
  const seconds = recording.pcm.length / 48_000;
  if (recording.pcm.length % 2 || seconds < 0.25 || recording.pcm.length > MAX_PCM_BYTES) throw new Error("Invalid recording duration.");
  let peak = 0;
  for (let i = 0; i < recording.pcm.length; i += 2) peak = Math.max(peak, Math.abs(recording.pcm.readInt16LE(i)));
  if (peak < 128) throw new Error("Silent recording rejected.");
  return seconds;
}

export function recordCourseScript(input: CourseRecordingInput, apiKey: string,
  socketFactory: RecordingSocketFactory = (url, options) => new WebSocket(url, options),
): Promise<CourseRecording> {
  const request = courseRecordingRequest(input);
  if (!apiKey.trim()) return Promise.reject(new Error("OPENAI_API_KEY is required; no request made."));
  return new Promise((resolve, reject) => {
    const socket = socketFactory(`wss://api.openai.com/v1/realtime?model=${COURSE_RECORDING_MODEL}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, followRedirects: false, handshakeTimeout: 20_000,
    });
    let done = false, sent = false, size = 0, transcript = "", transcriptReceived = false;
    let responseId: string | null = null, itemId: string | null = null;
    const chunks: Buffer[] = [];
    const finish = (error?: Error, value?: CourseRecording) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve(value!);
    };
    const timer = setTimeout(() => { finish(new Error("Recording timed out; no automatic retry.")); socket.terminate(); }, 90_000);
    socket.on("error", () => finish(new Error("Recording connection failed; no automatic retry.")));
    socket.on("close", () => { if (!done) finish(new Error("Recording connection closed before completion.")); });
    socket.on("message", (raw) => {
      if (done) return;
      try {
        if (raw.toString().length > 6 * 1024 * 1024) throw new Error("Oversized recording event.");
        const event = JSON.parse(raw.toString());
        if (event.type === "session.created" && !sent) {
          if (event.session?.model !== COURSE_RECORDING_MODEL) throw new Error("Unexpected recording model.");
          sent = true;
          socket.send(JSON.stringify(request));
        }
        if (event.type === "error") throw new Error("Recording provider rejected the request; no automatic retry.");
        if (event.type === "response.created") {
          if (!sent || responseId || typeof event.response?.id !== "string" || !event.response.id || event.response.id.length > 200) throw new Error("Unexpected recording response.");
          responseId = event.response.id;
        }
        if (event.type === "response.output_audio.delta" || event.type === "response.output_audio_transcript.done") {
          if (!responseId || event.response_id !== responseId || event.output_index !== 0 || event.content_index !== 0
            || typeof event.item_id !== "string" || !event.item_id || (itemId && event.item_id !== itemId)) throw new Error("Recording output belongs to another response or item.");
          itemId = event.item_id;
        }
        if (event.type === "response.output_audio.delta") {
          if (!sent || typeof event.delta !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.delta)) throw new Error("Invalid recording audio event.");
          const bytes = Buffer.from(event.delta, "base64");
          size += bytes.length;
          if (size > MAX_PCM_BYTES) throw new Error("Recording output exceeded the size limit.");
          chunks.push(bytes);
        }
        if (event.type === "response.output_audio_transcript.done") {
          if (transcriptReceived || typeof event.transcript !== "string" || event.transcript.length > 3000) throw new Error("Invalid recording transcript.");
          transcript = event.transcript;
          transcriptReceived = true;
        }
        if (event.type === "response.done") {
          if (!sent || !responseId || event.response?.id !== responseId || event.response?.status !== "completed") throw new Error("Incomplete or unrelated recording rejected.");
          const recording = { pcm: Buffer.concat(chunks), transcript, usage: event.response.usage };
          validateCourseRecording(input, recording);
          finish(undefined, recording);
        }
      } catch (error) {
        finish(error instanceof SyntaxError ? new Error("Invalid recording event.") : error instanceof Error ? error : new Error("Invalid recording response."));
      }
    });
  });
}

export function encodeCourseMp3(recording: CourseRecording, ffmpeg: string): Uint8Array {
  const encoded = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "96k", "-f", "mp3", "pipe:1"], {
    input: recording.pcm, maxBuffer: 5 * 1024 * 1024, timeout: 30_000, windowsHide: true,
  });
  if (encoded.status !== 0) throw new Error("MP3 encoding failed; the validated source remains cached.");
  if (Math.abs(validateMp3(encoded.stdout).durationSeconds - recording.pcm.length / 48_000) > 0.3) throw new Error("MP3 duration mismatch.");
  return new Uint8Array(encoded.stdout);
}
