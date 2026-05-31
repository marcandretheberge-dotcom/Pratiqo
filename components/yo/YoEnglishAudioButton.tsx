"use client";

/**
 * YoEnglishAudioButton — single audio surface for English lesson UI.
 *
 * Mirror of `YoSpanishAudioButton`, `YoFrenchAudioButton`, and
 * `YoItalianAudioButton`, with English defaults baked in
 * (`speechLang="en-CA"`, `accentProfile="canadian_english"`). All
 * four wrappers delegate to the same primitives:
 *
 *   - `findAudioItemForContext` (language-agnostic manifest lookup)
 *   - `<YoAudioPlayer>` for pre-generated MP3s
 *   - `<YoPronunciationButton>` (Web Speech) as a graceful fallback
 *
 * Why a parallel wrapper instead of one shared component:
 *
 *   - English survival-words callsites stay short and obviously
 *     typed for English lessons. A single shared
 *     `YoTargetAudioButton` would either expose less context-friendly
 *     defaults or force every callsite to declare the language. The
 *     four-wrapper pattern (Spanish / Quebec French / Italian /
 *     English) is consistent across the four open YoPratiqo
 *     languages.
 *   - The lookup primitive is the same, so a future refactor can
 *     unify them without changing on-page behaviour.
 *
 * Security contract:
 *   - 100% client-side. NEVER imports any server-only secret.
 *   - Reads only the public `NEXT_PUBLIC_SUPABASE_URL` (via
 *     `YoAudioPlayer`) when a manifest entry exists.
 *   - NEVER calls OpenAI or any TTS endpoint at runtime. All
 *     pre-generated MP3s come from
 *     `scripts/generate-yopratiqo-audio.ts`, which runs offline.
 *
 * Pedagogical contract:
 *   - When the manifest does not cover an item, the lesson does not
 *     break — Web Speech keeps the page usable.
 *   - The Web-Speech fallback uses BCP-47 `en-CA` so the on-device
 *     voice resolves to a Canadian-English voice when one is
 *     installed (Safari, Edge, recent Chrome usually ship one).
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
 * Lesson context used by `YoEnglishAudioButton` to disambiguate a
 * piece of English text when the manifest holds multiple accent
 * variants of the same word/phrase. Same shape as the Spanish /
 * French / Italian counterparts so the four systems can share
 * consumers down the line.
 */
export interface YoEnglishAudioContext {
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  accentProfile?: YoAudioAccentProfileId;
  /** BCP-47 hint forwarded to the Web Speech fallback. */
  speechLang?: string;
}

export interface YoEnglishAudioButtonProps {
  /** English target text rendered in the lesson UI. */
  text: string;
  /** UI locale — only used by the Web Speech fallback's ARIA label. */
  locale: YoLocale;
  /**
   * Optional context — when supplied, the wrapper picks the correct
   * accent variant for the current module instead of the first
   * matching MP3 it finds. Most callsites only need `moduleId` +
   * `accentProfile`.
   */
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  /** Accent profile preferred for this lesson (default `canadian_english`). */
  accentProfile?: YoAudioAccentProfileId;
  /**
   * BCP-47 tag forwarded to `YoPronunciationButton`'s Web Speech
   * fallback. Defaults to `"en-CA"` so the on-device voice is a
   * Canadian-English voice when one is installed.
   */
  speechLang?: string;
  /** Override the Web-Speech ARIA label. */
  label?: YoLocalizedString;
  /** Visual size (matches both inner components). */
  size?: "xs" | "sm";
  className?: string;
}

export function YoEnglishAudioButton({
  text,
  locale,
  moduleId,
  lessonId,
  type,
  accentProfile = "canadian_english",
  speechLang = "en-CA",
  label,
  size = "xs",
  className,
}: YoEnglishAudioButtonProps) {
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
