/**
 * YoDominicanDictionary — pocket dictionary of Dominican Republic
 * expressions, filtered for A1.
 *
 * Composed of:
 *   - A server-rendered grid (this file)
 *   - Optional inline audio buttons via `YoSpanishAudioButton`. Those
 *     are CLIENT components, so the moment we render them this file
 *     becomes a partial client island. We keep the wrapper opt-in via
 *     the `audioContext` prop so callers without audio (e.g. legacy
 *     marketing pages) keep their server-only behaviour.
 *
 * The data layer (lib/yo/dominicanRepublicA1.ts) is responsible for
 * keeping the list A1-safe: no vulgar/mature/ambiguous slang. Future
 * B1+ entries will live in a separate dataset.
 */

import { Sparkles } from "lucide-react";
import type {
  YoDominicanExpression,
  YoLocale,
  YoLocalizedString,
} from "@/lib/yo/types";
import { DominicanFlagPin } from "@/components/yo/YoVisuals";
import {
  YoSpanishAudioButton,
  type YoSpanishAudioContext,
} from "@/components/yo/YoSpanishAudioButton";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoDominicanDictionaryProps {
  expressions: YoDominicanExpression[];
  locale: YoLocale;
  /** Optional override for the section heading. */
  title?: YoLocalizedString;
  /** Optional override for the subtitle. */
  subtitle?: YoLocalizedString;
  /**
   * Optional audio context. When set, every expression gets a
   * `YoSpanishAudioButton` so learners can hear the Dominican
   * pronunciation. When omitted, the dictionary stays a pure
   * presentational list (Phase 1 behaviour).
   */
  audioContext?: YoSpanishAudioContext;
}

export function YoDominicanDictionary({
  expressions,
  locale,
  title,
  subtitle,
  audioContext,
}: YoDominicanDictionaryProps) {
  const resolvedTitle = t(title ?? YO_COPY.dictionary.title, locale);
  const resolvedSubtitle = t(
    subtitle ?? YO_COPY.dictionary.subtitle,
    locale,
  );
  const safetyChip = t(YO_COPY.dictionary.safetyChip, locale);
  const ariaConnector = t(
    YO_COPY.dictionary.expressionAriaConnector,
    locale,
  );

  return (
    <section
      aria-labelledby="yo-dictionary-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2
            id="yo-dictionary-title"
            className="flex items-center gap-2 text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
          >
            {resolvedTitle}
            <span aria-hidden className="inline-flex items-center">
              <DominicanFlagPin className="h-3 w-[18px]" />
            </span>
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {resolvedSubtitle}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#fff4e2] px-3 py-1 text-xs font-medium text-[#8a5a17] ring-1 ring-[#f3dcb4]">
          <Sparkles aria-hidden className="size-3.5" />
          {safetyChip}
        </p>
      </div>

      <ul
        role="list"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
      >
        {expressions.map((entry) => {
          const translation = t(entry.translation, locale);
          return (
            <li key={entry.id} className="list-none">
              <article
                className="ds-card flex h-full flex-col gap-1 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:border-teal-200 hover:shadow-[0_8px_24px_rgba(15,58,52,0.06)]"
                aria-label={`${entry.target} ${ariaConnector} ${translation}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    lang="es"
                    className="text-base font-semibold leading-tight tracking-tight text-[#1a3a32] sm:text-[1.05rem]"
                  >
                    {entry.target}
                  </p>
                  {audioContext ? (
                    <YoSpanishAudioButton
                      text={entry.target}
                      locale={locale}
                      moduleId={audioContext.moduleId}
                      lessonId={audioContext.lessonId}
                      type={audioContext.type ?? "phrase"}
                      accentProfile={audioContext.accentProfile}
                      speechLang={audioContext.speechLang}
                      size="xs"
                    />
                  ) : null}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {translation}
                </p>
                {entry.category ? (
                  <p className="mt-1 inline-flex w-fit items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-700">
                    {t(entry.category, locale)}
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
