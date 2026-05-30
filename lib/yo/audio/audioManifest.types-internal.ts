/**
 * Internal types + pure path helpers shared between the audio manifest
 * aggregator (`audioManifest.ts`) and the per-module data files
 * (`spanishIntroAudio.ts`, `spanishVoyageDominicanAudio.ts`).
 *
 * Why this split exists:
 *
 *   The aggregator's job is to compose data from each module file
 *   into one constant. The data files cannot import from the
 *   aggregator without creating a circular import (data → aggregator
 *   → data), so any value they need (item shape, slug builder, path
 *   builders) lives here instead.
 *
 *   Consumers OUTSIDE the audio manifest (the generator script, the
 *   AudioPlayer, tests) MUST import from `@/lib/yo/audio/audioManifest`,
 *   not from this file. This file is treated as a private
 *   implementation detail.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking / Membre
 * Pro logic in this file. Pure types + pure helpers.
 */

import type { YoTargetLanguage } from "@/lib/yo/types";
import type { YoAudioAccentProfileId } from "@/lib/yo/audio/accentProfiles";

// ─────────────────────────────────────────────────────────────────────
// Bucket + base path constants
// ─────────────────────────────────────────────────────────────────────

export const YOPRATIQO_AUDIO_BUCKET_DEFAULT = "yopratiqo-audio" as const;
export const YOPRATIQO_AUDIO_ROOT_PREFIX = "yo" as const;

// ─────────────────────────────────────────────────────────────────────
// Item shape
// ─────────────────────────────────────────────────────────────────────

export type YoAudioItemType =
  | "word"
  | "phrase"
  | "dialogue"
  | "instruction"
  | "sentence";

export interface YoAudioItem {
  id: string;
  targetLanguage: YoTargetLanguage;
  moduleId: string;
  lessonId: string;
  type: YoAudioItemType;
  text: string;
  storagePath: string;
  accentProfile: YoAudioAccentProfileId;
  ttsInstructions?: string;
  voiceHint?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────

export function buildAudioSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildLegacyStoragePath(input: {
  targetLanguage: YoTargetLanguage;
  moduleId: string;
  lessonId: string;
  type: YoAudioItemType;
  slug: string;
}): string {
  const { targetLanguage, moduleId, lessonId, type, slug } = input;
  return `${YOPRATIQO_AUDIO_ROOT_PREFIX}/${targetLanguage}/${moduleId}/${lessonId}/${type}/${slug}.mp3`;
}

export function buildStoragePath(input: {
  targetLanguage: YoTargetLanguage;
  moduleId: string;
  lessonId: string;
  type: YoAudioItemType;
  slug: string;
  accentSegment: string;
}): string {
  const { targetLanguage, moduleId, lessonId, type, slug, accentSegment } =
    input;
  return `${YOPRATIQO_AUDIO_ROOT_PREFIX}/${targetLanguage}/${moduleId}/${lessonId}/${accentSegment}/${type}/${slug}.mp3`;
}
