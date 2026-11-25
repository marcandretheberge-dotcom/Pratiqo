import type { YoLocale } from "@/lib/yo/types";
import { isSpeechLanguage, isSpeechScenario, type SpeechLanguage, type SpeechScenarioId } from "./catalog";

export const SPEECH_CONSENT_VERSION = "yo-voice-2026-11-24";
export const SPEECH_SAMPLE_RATE = 24_000;
export const SPEECH_MAX_INPUT_SECONDS = 15;
export const SPEECH_MAX_PCM_BYTES = SPEECH_SAMPLE_RATE * 2 * SPEECH_MAX_INPUT_SECONDS;
export const SPEECH_MAX_BODY_BYTES = 1_000_000;
export const SPEECH_RESERVED_MICRO_USD = 200_000;
export const SPEECH_RESERVED_MILLISECONDS = 30_000;
export const SPEECH_OUTPUT_TOKEN_CAP = 256;
export const SPEECH_MAX_PROMPT_BYTES = 12_000;
export const SPEECH_MODEL = "gpt-realtime-2.1";
export const SPEECH_TRANSCRIPTION_MODEL = "gpt-transcribe";
export const SPEECH_VOICE = "marin";

export type SpeechHistory = { role: "user" | "assistant"; text: string }[];
export type SpeechTurn = {
  requestId: string;
  language: SpeechLanguage;
  scenarioId: SpeechScenarioId;
  locale: YoLocale;
  consent: typeof SPEECH_CONSENT_VERSION;
  rememberCorrections: boolean;
  audio: string;
  history: SpeechHistory;
};
export type SpeechCorrection = { heard: string; better: string; hint: string };
export type SpeechFeedback = { message: string; correction: SpeechCorrection | null };
export type SpeechTurnResult = {
  requestId: string;
  transcript: string;
  reply: string;
  audio: string;
  feedback: SpeechFeedback | null;
  reviewSaved: boolean;
};
export type SpeechStatus = { available: boolean; reason?: "disabled" | "unavailable" | "trial_complete" | "pilot_complete"; remainingSeconds?: number };
export type SpeechReviewItem = { id: string; target: string; hint: string; locale: YoLocale; dueAt: number; revision: string };

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function parseSpeechTurn(value: unknown): SpeechTurn | null {
  if (!object(value) || Object.keys(value).sort().join(",") !== "audio,consent,history,language,locale,rememberCorrections,requestId,scenarioId") return null;
  if (!isUuid(value.requestId) || !isSpeechLanguage(value.language) || !isSpeechScenario(value.scenarioId)
    || !["fr", "en", "es"].includes(String(value.locale)) || value.consent !== SPEECH_CONSENT_VERSION
    || typeof value.rememberCorrections !== "boolean" || typeof value.audio !== "string"
    || value.audio.length < 6_400 || value.audio.length > Math.ceil(SPEECH_MAX_PCM_BYTES / 3) * 4
    || value.audio.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.audio)
    || !Array.isArray(value.history) || value.history.length > 6) return null;
  let historyLength = 0;
  for (const item of value.history) {
    if (!object(item) || Object.keys(item).sort().join(",") !== "role,text"
      || (item.role !== "user" && item.role !== "assistant") || typeof item.text !== "string"
      || item.text.length > 700 || !item.text.trim()) return null;
    historyLength += new TextEncoder().encode(item.text).length;
  }
  if (historyLength > 4_000) return null;
  return value as SpeechTurn;
}

export const normalizeSpeechText = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
const safePhrase = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max
  && !/(?:https?:|www\.|@|\d[\d\s()+-]{6,}\d|[\u0000-\u001f])/i.test(value);

/** AI feedback is advisory. Only a short correction grounded in the transcript may enter review. */
export function parseSpeechFeedback(raw: string, transcript: string): SpeechFeedback | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || Object.keys(value).sort().join(",") !== "correction,message" || !safePhrase(value.message, 320)) return null;
    if (value.correction === null) return { message: value.message, correction: null };
    const c = value.correction;
    if (!object(c) || Object.keys(c).sort().join(",") !== "better,heard,hint" || !safePhrase(c.heard, 160)
      || !safePhrase(c.better, 160) || !safePhrase(c.hint, 240)
      || !normalizeSpeechText(c.heard) || !normalizeSpeechText(c.better)
      || !normalizeSpeechText(transcript).includes(normalizeSpeechText(c.heard))
      || normalizeSpeechText(c.heard) === normalizeSpeechText(c.better)) return null;
    return { message: value.message, correction: { heard: c.heard, better: c.better, hint: c.hint } };
  } catch { return null; }
}
