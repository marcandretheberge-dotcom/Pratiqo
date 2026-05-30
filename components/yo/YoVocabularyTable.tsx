/**
 * YoVocabularyTable — bilingual vocabulary list (Spanish → learner UI lang).
 *
 * Pure presentational component (no client state). Renders an accessible
 * description list where each row pairs the target Spanish term
 * (`lang="es"`) with its translation in the learner's UI language.
 *
 * Used by `YoIntroSectionPanel` for the closing vocab box of each
 * section and for "phrases pratiques" inline blocks.
 */

import type {
  YoLocale,
  YoLocalizedString,
  YoVocabularyItem,
} from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import {
  YoSpanishAudioButton,
  type YoSpanishAudioContext,
} from "@/components/yo/YoSpanishAudioButton";

export interface YoVocabularyTableProps {
  items: YoVocabularyItem[];
  /** Optional localized heading rendered above the list. */
  heading?: YoLocalizedString;
  /** Visual variant. `cream` is the default; `plain` removes the bg/border. */
  variant?: "cream" | "plain";
  /** Optional id forwarded for aria-labelledby relationships. */
  id?: string;
  locale: YoLocale;
  /**
   * Opt-in audio buttons. Off by default so this component stays a pure
   * server-rendered list everywhere it is used today; callers that want
   * audio (Spanish intro vocab, reading helper, dictionary) flip this
   * on explicitly. When on, the component prefers a pre-generated MP3
   * via `YoSpanishAudioButton` (with `audioContext` to pick the right
   * accent variant) and falls back to Web Speech otherwise.
   */
  enableAudio?: boolean;
  /**
   * BCP-47 tag forwarded to the Web Speech fallback when `enableAudio`
   * is true. Defaults to "es-ES" — country modules can prefer "es-DO",
   * "es-MX", … Mirrored on `audioContext.speechLang` if both are set.
   */
  speechLang?: string;
  /**
   * Optional lesson context forwarded to `YoSpanishAudioButton` so the
   * pre-generated lookup picks the correct accent variant for this
   * module. Without it, the wrapper still works (text-only lookup),
   * but module-specific accent matching is skipped.
   */
  audioContext?: YoSpanishAudioContext;
}

export function YoVocabularyTable({
  items,
  heading,
  variant = "cream",
  id,
  locale,
  enableAudio = false,
  speechLang = "es-ES",
  audioContext,
}: YoVocabularyTableProps) {
  if (items.length === 0) {
    return null;
  }
  const headingId = id ? `${id}-heading` : undefined;
  const containerClass =
    variant === "plain"
      ? "flex flex-col gap-1"
      : "rounded-2xl bg-[var(--color-base-cream)] p-4 ring-1 ring-teal-100/70";

  return (
    <div className={containerClass} aria-labelledby={headingId}>
      {heading ? (
        <p
          id={headingId}
          className="ds-label mb-2 text-teal-700/90"
        >
          {t(heading, locale)}
        </p>
      ) : null}
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {items.map((item) => {
          const translation = t(item.translation, locale);
          return (
            <div
              key={`${item.target}-${translation}`}
              className="flex flex-col gap-0 sm:contents"
            >
              <dt
                className="flex items-center gap-2 text-[0.95rem] font-medium text-[#1a3a32]"
                lang="es"
              >
                <span>{item.target}</span>
                {enableAudio ? (
                  <YoSpanishAudioButton
                    text={item.target}
                    locale={locale}
                    moduleId={audioContext?.moduleId}
                    lessonId={audioContext?.lessonId}
                    type={audioContext?.type}
                    accentProfile={audioContext?.accentProfile}
                    speechLang={audioContext?.speechLang ?? speechLang}
                    size="xs"
                  />
                ) : null}
              </dt>
              <dd className="text-sm text-[var(--color-text-secondary)] sm:text-[0.95rem]">
                {translation}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
