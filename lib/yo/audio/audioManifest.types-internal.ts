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
 *   Registry consumers (the generator script and manifest tests) use
 *   `@/lib/yo/audio/audioManifest`. The low-level public URL helper may
 *   import the bucket constant here without loading all recording data.
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
  /**
   * Text shown in the lesson UI and used for contextual lookup.
   * Keep this byte-for-byte aligned with visible lesson content.
   */
  text: string;
  /**
   * Optional TTS-only input. Use when visible text contains slash
   * variants, placeholders, or short homographs that need extra
   * spoken context. Never changes visible lesson copy or storagePath.
   */
  spokenText?: string;
  /**
   * Per-item direction appended to the accent profile instructions
   * during offline generation. Useful for words that look English.
   */
  pronunciationHint?: string;
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
