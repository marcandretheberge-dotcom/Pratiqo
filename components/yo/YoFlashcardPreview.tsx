"use client";

/**
 * YoFlashcardPreview — interactive flashcard deck.
 *
 * Client component. Phase 1: NO real spaced-repetition state, NO Supabase
 * writes, NO timers. The three rating buttons map to YoFlashcardQuality
 * values (0/3/5) so the same handler shape can later persist to
 * public.yo_flashcard_reviews under simplified SM-2 in Phase 2.
 *
 * Flow:
 *   1. Show card N / total.
 *   2. User flips → reveal back + hint.
 *   3. User rates Hard / Good / Easy → feedback.
 *   4. "Next card" advances; at the end show completion + Restart.
 *
 * Localized: every learner-language string on a card is resolved with
 * `t()`; every UI chrome string comes from `YO_COPY.flash` so FR/EN swap
 * automatically with the `locale` prop. Spanish fronts stay plain with
 * `lang="es"`.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, RotateCw, Sparkles } from "lucide-react";
import type {
  YoFlashcard,
  YoFlashcardQuality,
  YoLocale,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";
import { YoImageVisual } from "@/components/yo/YoImageVisual";
import { YoExpressionLocaleBadge } from "@/components/yo/YoVisuals";

export interface YoFlashcardPreviewProps {
  cards: YoFlashcard[];
  locale: YoLocale;
}

const TONE: Record<YoFlashcardQuality, string> = {
  0: "bg-[#fdecec] text-[#a23a3a] ring-[#f6c8c8]",
  3: "bg-teal-50 text-teal-800 ring-teal-100",
  5: "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]",
};

type DeckState =
  | { mode: "card"; isFlipped: boolean; lastRating: YoFlashcardQuality | null }
  | { mode: "complete" };

export function YoFlashcardPreview({
  cards,
  locale,
}: YoFlashcardPreviewProps) {
  const total = cards.length;
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<DeckState>({
    mode: "card",
    isFlipped: false,
    lastRating: null,
  });

  const handleFlip = useCallback(() => {
    setState((prev) => {
      if (prev.mode !== "card") return prev;
      return { ...prev, isFlipped: !prev.isFlipped };
    });
  }, []);

  const handleRate = useCallback((quality: YoFlashcardQuality) => {
    setState((prev) => {
      if (prev.mode !== "card") return prev;
      return { mode: "card", isFlipped: true, lastRating: quality };
    });
  }, []);

  const handleNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setState({ mode: "complete" });
        return i;
      }
      setState({ mode: "card", isFlipped: false, lastRating: null });
      return i + 1;
    });
  }, [total]);

  const handleResetCurrent = useCallback(() => {
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, []);

  if (total === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="yo-flash-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id="yo-flash-title"
          className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          {t(YO_COPY.flash.title, locale)}
        </h2>
        <p className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
          {t(YO_COPY.flash.subtitle, locale)}
        </p>
      </div>

      {state.mode === "complete" ? (
        <CompletionPanel
          total={total}
          onRestart={handleRestart}
          locale={locale}
        />
      ) : (
        <DeckCard
          card={cards[index]!}
          index={index}
          total={total}
          state={state}
          onFlip={handleFlip}
          onRate={handleRate}
          onNext={handleNext}
          onResetCurrent={handleResetCurrent}
          locale={locale}
        />
      )}
    </section>
  );
}

interface DeckCardProps {
  card: YoFlashcard;
  index: number;
  total: number;
  state: Extract<DeckState, { mode: "card" }>;
  onFlip: () => void;
  onRate: (quality: YoFlashcardQuality) => void;
  onNext: () => void;
  onResetCurrent: () => void;
  locale: YoLocale;
}

function DeckCard({
  card,
  index,
  total,
  state,
  onFlip,
  onRate,
  onNext,
  onResetCurrent,
  locale,
}: DeckCardProps) {
  const isLast = index === total - 1;
  const progressLabel = t(YO_COPY.flash.progressLabel, locale);
  const faceLabel = state.isFlipped
    ? t(YO_COPY.flash.cardFaceBack, locale)
    : t(YO_COPY.flash.cardFaceFront, locale);
  const tag = card.tag ? t(card.tag, locale) : null;
  const flipHint = t(YO_COPY.flash.flipHint, locale);
  const flipCta = t(YO_COPY.flash.flipCta, locale);
  const back = t(card.back, locale);
  const hint = card.hint ? t(card.hint, locale) : null;
  const flipAria = state.isFlipped
    ? `${t(YO_COPY.flash.flipPressedAriaToFront, locale)} ${card.front}`
    : `${t(YO_COPY.flash.flipPressedAriaToBack, locale)} ${card.front}`;

  const ratingPrompt = t(YO_COPY.flash.ratingPrompt, locale);
  const ratingLabels: Record<YoFlashcardQuality, string> = {
    0: t(YO_COPY.flash.ratingHard, locale),
    3: t(YO_COPY.flash.ratingGood, locale),
    5: t(YO_COPY.flash.ratingEasy, locale),
  };
  const feedbackCopy: Record<YoFlashcardQuality, string> = {
    0: t(YO_COPY.flash.feedbackHard, locale),
    3: t(YO_COPY.flash.feedbackGood, locale),
    5: t(YO_COPY.flash.feedbackEasy, locale),
  };
  const idleHint = t(YO_COPY.flash.idleHint, locale);
  const nextLabel = isLast
    ? t(YO_COPY.flash.finish, locale)
    : t(YO_COPY.flash.next, locale);
  const retryLabel = t(YO_COPY.flash.retryCard, locale);

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p
            className="text-xs font-medium uppercase tracking-[0.14em] text-teal-700/80"
            aria-live="polite"
          >
            {progressLabel} {index + 1} / {total}
          </p>
          <ProgressBar current={index + 1} total={total} locale={locale} />
        </div>

        <button
          type="button"
          onClick={onFlip}
          aria-pressed={state.isFlipped}
          aria-label={flipAria}
          className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-teal-100 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,58,52,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[340px] sm:p-8"
        >
          <YoImageVisual
            imagePath={card.imagePath}
            alt={card.imageAlt ?? card.back}
            locale={locale}
            fallbackKind={card.visualHint ?? "tropical-flashcard"}
            variant="flashcard"
            className="rounded-none border-0 shadow-none"
          />
          <div
            aria-hidden
            className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.64)_0%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.9)_100%)]"
          />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-label text-teal-700/80">
                {faceLabel}
                {tag ? ` · ${tag}` : ""}
              </span>
              {card.isLocalExpression ? (
                <YoExpressionLocaleBadge locale={locale} />
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-teal-700/70 opacity-0 transition group-hover:opacity-100">
              <RotateCw className="size-3.5" aria-hidden />
              {flipHint}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            {state.isFlipped ? (
              <>
                <p className="text-3xl font-medium leading-tight tracking-tight text-[#1a3a32] sm:text-4xl">
                  {back}
                </p>
                {hint ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {hint}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p
                  className="text-3xl font-medium leading-tight tracking-tight text-[#1a3a32] sm:text-4xl"
                  lang="es"
                >
                  {card.front}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {flipCta}
                </p>
              </>
            )}
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-3xl border border-teal-100 bg-[var(--color-base-cream)] p-4 sm:p-5">
        <p className="ds-label text-teal-700/90">{ratingPrompt}</p>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <RatingButton
            quality={0}
            label={ratingLabels[0]}
            onRate={onRate}
            selected={state.lastRating === 0}
          />
          <RatingButton
            quality={3}
            label={ratingLabels[3]}
            onRate={onRate}
            selected={state.lastRating === 3}
          />
          <RatingButton
            quality={5}
            label={ratingLabels[5]}
            onRate={onRate}
            selected={state.lastRating === 5}
          />
        </div>

        {state.lastRating !== null ? (
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "mt-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ring-1",
              TONE[state.lastRating],
            )}
          >
            <Sparkles aria-hidden className="size-3.5" />
            {feedbackCopy[state.lastRating]}
          </p>
        ) : (
          <p className="mt-1 text-xs leading-snug text-[var(--color-text-secondary)]">
            {idleHint}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onNext}
            disabled={state.lastRating === null}
            className={cn(
              "ds-btn-primary inline-flex w-full items-center justify-center gap-2 text-center text-sm transition sm:text-base",
              state.lastRating === null && "cursor-not-allowed opacity-50",
            )}
          >
            {nextLabel}
            <span aria-hidden>→</span>
          </button>
          {state.lastRating !== null ? (
            <button
              type="button"
              onClick={onResetCurrent}
              className="self-center text-xs font-medium text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
  locale: YoLocale;
}

function ProgressBar({ current, total, locale }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);
  const ariaLabel = `${t(YO_COPY.flash.progressAria, locale)} : ${current} / ${total}`;
  return (
    <div
      className="h-1.5 w-32 overflow-hidden rounded-full bg-teal-50 ring-1 ring-teal-100 sm:w-44"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface RatingButtonProps {
  quality: YoFlashcardQuality;
  label: string;
  onRate: (quality: YoFlashcardQuality) => void;
  selected: boolean;
}

function RatingButton({ quality, label, onRate, selected }: RatingButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onRate(quality)}
      aria-pressed={selected}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
        selected
          ? "bg-teal-700 text-white shadow-sm"
          : "bg-white text-teal-800 ring-1 ring-teal-100 hover:bg-teal-50",
      )}
    >
      {label}
    </button>
  );
}

interface CompletionPanelProps {
  total: number;
  onRestart: () => void;
  locale: YoLocale;
}

function CompletionPanel({ total, onRestart, locale }: CompletionPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-4 rounded-3xl border border-teal-100 bg-gradient-to-br from-[#e6f4ec] via-white to-[var(--color-base-cream)] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
        <CheckCircle2 aria-hidden className="size-4 text-teal-700" />
        {total} {t(YO_COPY.flash.completionChip, locale)}
      </span>
      <p className="text-xl font-medium text-[#1a3a32] sm:text-2xl">
        {t(YO_COPY.flash.completionTitle, locale)}
      </p>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {t(YO_COPY.flash.completionBody, locale)}
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm sm:text-base"
      >
        {t(YO_COPY.flash.restart, locale)}
        <span aria-hidden>↺</span>
      </button>
    </div>
  );
}
