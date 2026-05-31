"use client";

/**
 * YoJapaneseAudioButton — single audio surface for Japanese lesson UI.
 *
 * Mirror of `YoSpanishAudioButton`, `YoFrenchAudioButton`,
 * `YoItalianAudioButton`, and `YoEnglishAudioButton`, with Japanese
 * defaults baked in (`speechLang="ja-JP"`,
 * `accentProfile="japanese_standard"`). All five wrappers delegate
 * to the same primitives:
 *
 *   - `findAudioItemForContext` (language-agnostic manifest lookup)
 *   - `<YoAudioPlayer>` for pre-generated MP3s
 *   - `<YoPronunciationButton>` (Web Speech) as a graceful fallback
 *
 * Why a parallel wrapper:
 *   - Lesson callsites stay obvious about which language they're in.
 *   - The lookup primitive is shared, so a future refactor can unify
 *     all five into a single `YoTargetAudioButton` without changing
 *     any rendering behaviour.
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
 *   - The Web-Speech fallback uses BCP-47 `ja-JP` so the on-device
 *     voice resolves to a Japanese voice when one is installed
 *     (Safari, Edge, recent Chrome typically ship one).
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

export interface YoJapaneseAudioContext {
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  accentProfile?: YoAudioAccentProfileId;
  /** BCP-47 hint forwarded to the Web Speech fallback. */
  speechLang?: string;
}

export interface YoJapaneseAudioButtonProps {
  /** Japanese target text rendered in the lesson UI. */
  text: string;
  /** UI locale — only used by the Web Speech fallback's ARIA label. */
  locale: YoLocale;
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  /** Accent profile preferred for this lesson (default `japanese_standard`). */
  accentProfile?: YoAudioAccentProfileId;
  /**
   * BCP-47 tag forwarded to `YoPronunciationButton`'s Web Speech
   * fallback. Defaults to `"ja-JP"` so the on-device voice is a
   * Japanese voice when one is installed.
   */
  speechLang?: string;
  /** Override the Web-Speech ARIA label. */
  label?: YoLocalizedString;
  /** Visual size (matches both inner components). */
  size?: "xs" | "sm";
  className?: string;
}

export function YoJapaneseAudioButton({
  text,
  locale,
  moduleId,
  lessonId,
  type,
  accentProfile = "japanese_standard",
  speechLang = "ja-JP",
  label,
  size = "xs",
  className,
}: YoJapaneseAudioButtonProps) {
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
