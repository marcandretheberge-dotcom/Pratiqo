"use client";

/**
 * YoItalianAudioButton — single audio surface for Italian lesson UI.
 *
 * Mirror of `YoSpanishAudioButton` and `YoFrenchAudioButton`, with
 * Italian defaults baked in (`speechLang="it-IT"`,
 * `accentProfile="italian_standard"`). All three components delegate
 * to the same primitives:
 *
 *   - `findAudioItemForContext` (language-agnostic manifest lookup)
 *   - `<YoAudioPlayer>` for pre-generated MP3s
 *   - `<YoPronunciationButton>` (Web Speech) as a graceful fallback
 *
 * Why a parallel wrapper instead of one shared component:
 *
 *   - Italian survival-words callsites stay short and obviously typed
 *     for Italian lessons. A single shared `YoTargetAudioButton`
 *     would either expose less context-friendly defaults or force
 *     every callsite to declare the language. The triple-wrapper
 *     pattern (Spanish / French / Italian) is consistent across the
 *     three open YoPratiqo languages.
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
 *   - The Web-Speech fallback uses BCP-47 `it-IT` so the on-device
 *     voice resolves to a standard Italian voice when one is
 *     installed (Safari, Edge, recent Chrome ship one).
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
 * Lesson context used by `YoItalianAudioButton` to disambiguate a
 * piece of Italian text when the manifest holds multiple accent
 * variants of the same word/phrase. Same shape as the Spanish /
 * French counterparts so the three systems can share consumers down
 * the line.
 */
export interface YoItalianAudioContext {
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  accentProfile?: YoAudioAccentProfileId;
  /** BCP-47 hint forwarded to the Web Speech fallback. */
  speechLang?: string;
}

export interface YoItalianAudioButtonProps {
  /** Italian target text rendered in the lesson UI. */
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
  /** Accent profile preferred for this lesson (default `italian_standard`). */
  accentProfile?: YoAudioAccentProfileId;
  /**
   * BCP-47 tag forwarded to `YoPronunciationButton`'s Web Speech
   * fallback. Defaults to `"it-IT"` so the on-device voice is a
   * standard Italian voice when one is installed.
   */
  speechLang?: string;
  /** Override the Web-Speech ARIA label. */
  label?: YoLocalizedString;
  /** Visual size (matches both inner components). */
  size?: "xs" | "sm";
  className?: string;
}

export function YoItalianAudioButton({
  text,
  locale,
  moduleId,
  lessonId,
  type,
  accentProfile = "italian_standard",
  speechLang = "it-IT",
  label,
  size = "xs",
  className,
}: YoItalianAudioButtonProps) {
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
