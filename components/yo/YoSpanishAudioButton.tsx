"use client";

/**
 * YoSpanishAudioButton — single audio surface for Spanish lesson UI.
 *
 * Why a wrapper:
 *   - Lesson code today decides per-call between `YoAudioPlayer`
 *     (pre-generated MP3 from Supabase Storage) and
 *     `YoPronunciationButton` (browser-native Web Speech). That's
 *     fine for a handful of items, but it forces every callsite to
 *     reimplement the manifest lookup and the fallback.
 *   - With the Phase 2 manifest covering vocabulary + dialogue +
 *     reading vocabulary across two accent profiles, that lookup
 *     becomes contextual: the same Spanish text can resolve to
 *     different MP3s depending on which module the learner is in. The
 *     wrapper centralises that decision and exposes a single, simple
 *     prop surface so a callsite only has to declare its lesson
 *     context once.
 *
 * Behaviour:
 *   1. Run `findAudioItemForContext({ moduleId, lessonId, type, text,
 *      accentProfile })`.
 *   2. If a manifest entry resolves → render `<YoAudioPlayer>` with
 *      the matching `storagePath`.
 *   3. Otherwise → render `<YoPronunciationButton>` so the learner
 *      always gets *some* pronunciation cue (Web Speech, on-device).
 *
 * Security contract:
 *   - 100 % client-side. Never imports any server-only secret.
 *   - Reads only the public `NEXT_PUBLIC_SUPABASE_URL` (via
 *     `YoAudioPlayer`) when a manifest entry exists.
 *   - Browser bundle sees no manifest mutation logic — the audio
 *     manifest is pure data the client just reads.
 *
 * Pedagogical contract:
 *   - NEVER calls OpenAI or any TTS endpoint at runtime. All
 *     pre-generated MP3s come from
 *     `scripts/generate-yopratiqo-audio.ts`, which runs offline.
 *   - When the manifest does not cover an item, the page does not
 *     break — Web Speech keeps the lesson usable.
 */

import { useMemo } from "react";
import { YoAudioPlayer } from "@/components/yo/YoAudioPlayer";
import { YoPronunciationButton } from "@/components/yo/YoPronunciationButton";
import {
  findAudioItemForContext,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest";
import type { YoAudioAccentProfileId } from "@/lib/yo/audio/accentProfiles";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

/**
 * Lesson context used by `YoSpanishAudioButton` to disambiguate a
 * piece of Spanish text when the manifest holds multiple accent
 * variants of the same word/phrase. Passed as a single object so
 * parent components (`YoFlashcardPreview`, `YoReadingPreview`, …)
 * can declare their context once and forward it down.
 */
export interface YoSpanishAudioContext {
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  accentProfile?: YoAudioAccentProfileId;
  /** BCP-47 hint forwarded to the Web Speech fallback. */
  speechLang?: string;
}

export interface YoSpanishAudioButtonProps {
  /** Spanish target text rendered in the lesson UI. */
  text: string;
  /** UI locale — only used by the Web Speech fallback's ARIA label. */
  locale: YoLocale;
  /**
   * Optional context — when supplied, the wrapper picks the correct
   * accent variant for the current module instead of the first
   * matching MP3 it finds. Keep this simple: most callsites only need
   * `moduleId` + `accentProfile`.
   */
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  /** Accent profile preferred for this lesson. */
  accentProfile?: YoAudioAccentProfileId;
  /**
   * BCP-47 tag forwarded to `YoPronunciationButton`'s Web Speech
   * fallback. Matches the existing prop name there. Defaults to the
   * pan-Hispanic `"es-ES"` so the on-device voice is friendly even
   * without an explicit module hint.
   */
  speechLang?: string;
  /** Override the Web-Speech ARIA label. */
  label?: YoLocalizedString;
  /** Visual size (matches both inner components). */
  size?: "xs" | "sm";
  className?: string;
}

export function YoSpanishAudioButton({
  text,
  locale,
  moduleId,
  lessonId,
  type,
  accentProfile,
  speechLang = "es-ES",
  label,
  size = "xs",
  className,
}: YoSpanishAudioButtonProps) {
  const item = useMemo(
    () =>
      findAudioItemForContext({
        text,
        moduleId,
        lessonId,
        type,
        accentProfile,
      }),
    [text, moduleId, lessonId, type, accentProfile],
  );

  if (item) {
    return (
      <YoAudioPlayer
        storagePath={item.storagePath}
        label={item.text}
        size={size}
        className={className}
      />
    );
  }

  return (
    <YoPronunciationButton
      text={text}
      locale={locale}
      speechLang={speechLang}
      label={label}
      size={size}
      className={className}
    />
  );
}
