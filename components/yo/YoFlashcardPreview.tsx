"use client";

/**
 * YoFlashcardPreview — interactive flashcard deck with autoplay.
 *
 * Client component. Phase 1: NO real spaced-repetition state, NO Supabase
 * writes. The three rating buttons map to YoFlashcardQuality values
 * (0/3/5) so the same handler shape can later persist to
 * public.yo_flashcard_reviews under simplified SM-2 in Phase 2.
 *
 * What this version adds vs the original demo:
 *   - Autoplay (≈5 s per state) that walks front → back → next card.
 *   - Play / Pause control + Previous / Next manual controls.
 *   - Progress indicator "N / total" stays visible at all times.
 *   - Inline browser-native pronunciation button on the Spanish face.
 *   - Reduced-motion friendly: autoplay starts OFF when
 *     `prefers-reduced-motion: reduce` is set.
 *   - Any manual interaction (flip, rate, prev, next, audio) pauses
 *     autoplay so the learner can dwell on a card.
 *
 * Accessibility:
 *   - The card surface is a `<div role="button">` instead of `<button>`
 *     so we can nest the pronunciation `<button>` legally.
 *   - Keyboard: Enter or Space on the card flips it, just like a real
 *     button.
 *   - `aria-live="polite"` on the progress + feedback so screen readers
 *     get gentle updates as the deck advances.
 *
 * Pedagogical localization:
 *   - Every learner-language string is resolved through `t()`.
 *   - Spanish fronts stay plain with `lang="es"`.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCw,
  Sparkles,
} from "lucide-react";
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
import {
  YoSpanishAudioButton,
  type YoSpanishAudioContext,
} from "@/components/yo/YoSpanishAudioButton";

export interface YoFlashcardPreviewProps {
  cards: YoFlashcard[];
  locale: YoLocale;
  /**
   * BCP-47 tag forwarded to the Web Speech fallback when a card's
   * Spanish front has no pre-generated MP3. Defaults to "es-ES";
   * the RD module passes "es-DO".
   */
  speechLang?: string;
  /**
   * Optional lesson context. When set, every card prefers a
   * pre-generated MP3 via `YoSpanishAudioButton` resolved against this
   * context (so the RD deck can pick `dominican_republic` audio while
   * the intro deck picks `latin_american_neutral`). When omitted the
   * wrapper falls back to a text-only manifest lookup before Web
   * Speech.
   */
  audioContext?: YoSpanishAudioContext;
  /**
   * Optional audio button slot. When provided, replaces the default
   * `YoSpanishAudioButton` for every card front. Used by the
   * Dominican Republic premium modules (Module 2 / Module 3) so they
   * can keep their existing `YoSpeechButton` browser-only audio
   * implementation (no manifest, no MP3, no OpenAI) while still
   * getting the canonical RD-intro carousel layout.
   *
   * Receives the full `YoFlashcard` (not just the text) so call sites
   * can wire their own audio component directly against the card
   * shape without losing access to optional metadata (lang tags,
   * audio context, etc.).
   */
  audioRenderer?: (card: YoFlashcard) => ReactNode;
  /**
   * Optional override for the section heading. Defaults to
   * `YO_COPY.flash.title`. Used by the Dominican Republic modules so
   * each module surface keeps its own framing ("15 essential words",
   * "32 quick cards…") while the body uses the same canonical
   * carousel layout.
   */
  title?: string;
  /**
   * Optional override for the small caption shown next to the
   * heading. Defaults to `YO_COPY.flash.subtitle`.
   */
  subtitle?: string;
  /**
   * Optional element id for the section heading. Defaults to
   * `yo-flash-title`. Set per module so multiple `YoFlashcardPreview`
   * mounts on the same page (RD intro vs. modules) keep unique
   * `aria-labelledby` anchors.
   */
  headingId?: string;
  /**
   * Optional class name forwarded to the outermost `<section>`.
   * Used by callers that need to tag the section with a
   * `data-yo-module*-flashcard-*` attribute via a wrapping `<div>`.
   */
  sectionClassName?: string;
}

const TONE: Record<YoFlashcardQuality, string> = {
  0: "bg-[#fdecec] text-[#a23a3a] ring-[#f6c8c8]",
  3: "bg-teal-50 text-teal-800 ring-teal-100",
  5: "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]",
};

/** Autoplay dwell time per face (front then back). 5 s feels comfortable. */
const AUTOPLAY_INTERVAL_MS = 5000;

type DeckState =
  | { mode: "card"; isFlipped: boolean; lastRating: YoFlashcardQuality | null }
  | { mode: "complete" };

export function YoFlashcardPreview({
  cards,
  locale,
  speechLang = "es-ES",
  audioContext,
  audioRenderer,
  title,
  subtitle,
  headingId = "yo-flash-title",
  sectionClassName,
}: YoFlashcardPreviewProps) {
  const total = cards.length;
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<DeckState>({
    mode: "card",
    isFlipped: false,
    lastRating: null,
  });
  // Default OFF. We enable on mount if reduced motion is NOT requested.
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(media.matches);
    if (!media.matches) {
      setIsAutoplay(true);
    }
    const onChange = (event: MediaQueryListEvent) => {
      setIsReducedMotion(event.matches);
      if (event.matches) {
        setIsAutoplay(false);
      }
    };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const pauseAutoplay = useCallback(() => {
    setIsAutoplay(false);
  }, []);

  const handleFlip = useCallback(() => {
    pauseAutoplay();
    setState((prev) => {
      if (prev.mode !== "card") return prev;
      return { ...prev, isFlipped: !prev.isFlipped };
    });
  }, [pauseAutoplay]);

  const handleCardKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleFlip();
      }
    },
    [handleFlip],
  );

  const handleRate = useCallback(
    (quality: YoFlashcardQuality) => {
      pauseAutoplay();
      setState((prev) => {
        if (prev.mode !== "card") return prev;
        return { mode: "card", isFlipped: true, lastRating: quality };
      });
    },
    [pauseAutoplay],
  );

  const handleNext = useCallback(() => {
    pauseAutoplay();
    setIndex((i) => {
      if (i >= total - 1) {
        setState({ mode: "complete" });
        return i;
      }
      setState({ mode: "card", isFlipped: false, lastRating: null });
      return i + 1;
    });
  }, [pauseAutoplay, total]);

  const handlePrev = useCallback(() => {
    pauseAutoplay();
    setIndex((i) => {
      if (i <= 0) return i;
      setState({ mode: "card", isFlipped: false, lastRating: null });
      return i - 1;
    });
  }, [pauseAutoplay]);

  const handleResetCurrent = useCallback(() => {
    pauseAutoplay();
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, [pauseAutoplay]);

  const handleRestart = useCallback(() => {
    pauseAutoplay();
    setIndex(0);
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, [pauseAutoplay]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay((prev) => !prev);
  }, []);

  // Autoplay tick: front (5s) → flip to back (5s) → next card. Stops at
  // the last card (no auto-loop). Manual interaction always pauses.
  const autoTickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoTickRef.current) {
      clearTimeout(autoTickRef.current);
      autoTickRef.current = null;
    }
    if (!isAutoplay) return;
    if (state.mode !== "card") return;

    autoTickRef.current = setTimeout(() => {
      if (!state.isFlipped) {
        setState((prev) =>
          prev.mode === "card" && !prev.isFlipped
            ? { ...prev, isFlipped: true }
            : prev,
        );
        return;
      }
      // Already flipped → advance, but stop autoplay when we reach the end.
      setIndex((i) => {
        if (i >= total - 1) {
          setState({ mode: "complete" });
          setIsAutoplay(false);
          return i;
        }
        setState({ mode: "card", isFlipped: false, lastRating: null });
        return i + 1;
      });
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      if (autoTickRef.current) {
        clearTimeout(autoTickRef.current);
        autoTickRef.current = null;
      }
    };
  }, [isAutoplay, state, total]);

  if (total === 0) {
    return null;
  }

  const resolvedTitle = title ?? t(YO_COPY.flash.title, locale);
  const resolvedSubtitle = subtitle ?? t(YO_COPY.flash.subtitle, locale);
  const sectionClasses = [
    "mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14",
    sectionClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-labelledby={headingId} className={sectionClasses}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id={headingId}
          className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          {resolvedTitle}
        </h2>
        <p className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
          {resolvedSubtitle}
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
          isAutoplay={isAutoplay}
          isReducedMotion={isReducedMotion}
          onFlip={handleFlip}
          onCardKey={handleCardKey}
          onRate={handleRate}
          onNext={handleNext}
          onPrev={handlePrev}
          onResetCurrent={handleResetCurrent}
          onToggleAutoplay={toggleAutoplay}
          locale={locale}
          speechLang={speechLang}
          audioContext={audioContext}
          audioRenderer={audioRenderer}
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
  isAutoplay: boolean;
  isReducedMotion: boolean;
  onFlip: () => void;
  onCardKey: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onRate: (quality: YoFlashcardQuality) => void;
  onNext: () => void;
  onPrev: () => void;
  onResetCurrent: () => void;
  onToggleAutoplay: () => void;
  locale: YoLocale;
  speechLang: string;
  audioContext?: YoSpanishAudioContext;
  audioRenderer?: (card: YoFlashcard) => ReactNode;
}

function DeckCard({
  card,
  index,
  total,
  state,
  isAutoplay,
  isReducedMotion,
  onFlip,
  onCardKey,
  onRate,
  onNext,
  onPrev,
  onResetCurrent,
  onToggleAutoplay,
  locale,
  speechLang,
  audioContext,
  audioRenderer,
}: DeckCardProps) {
  const isLast = index === total - 1;
  const isFirst = index === 0;
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
  const ratingLabels: Record<YoFlashcardQuality, string> = useMemo(
    () => ({
      0: t(YO_COPY.flash.ratingHard, locale),
      3: t(YO_COPY.flash.ratingGood, locale),
      5: t(YO_COPY.flash.ratingEasy, locale),
    }),
    [locale],
  );
  const feedbackCopy: Record<YoFlashcardQuality, string> = useMemo(
    () => ({
      0: t(YO_COPY.flash.feedbackHard, locale),
      3: t(YO_COPY.flash.feedbackGood, locale),
      5: t(YO_COPY.flash.feedbackEasy, locale),
    }),
    [locale],
  );
  const idleHint = t(YO_COPY.flash.idleHint, locale);
  const nextLabel = isLast
    ? t(YO_COPY.flash.finish, locale)
    : t(YO_COPY.flash.next, locale);
  const retryLabel = t(YO_COPY.flash.retryCard, locale);
  const previousLabel = t(YO_COPY.flashAutoplay.previous, locale);
  const playLabel = t(YO_COPY.flashAutoplay.play, locale);
  const pauseLabel = t(YO_COPY.flashAutoplay.pause, locale);
  const playAria = t(YO_COPY.flashAutoplay.playAria, locale);
  const pauseAria = t(YO_COPY.flashAutoplay.pauseAria, locale);
  const reducedMotionNote = t(YO_COPY.flashAutoplay.reducedMotionNote, locale);

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className="text-xs font-medium uppercase tracking-[0.14em] text-teal-700/80"
            aria-live="polite"
          >
            {progressLabel} {index + 1} / {total}
          </p>
          <ProgressBar current={index + 1} total={total} locale={locale} />
        </div>

        {/* Card surface — a div with role=button so we can nest the
            pronunciation button without invalid <button> nesting. */}
        <div
          role="button"
          tabIndex={0}
          onClick={onFlip}
          onKeyDown={onCardKey}
          aria-pressed={state.isFlipped}
          aria-label={flipAria}
          className="group relative flex min-h-[280px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-teal-100 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,58,52,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[340px] sm:p-8"
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
                <div className="flex items-start gap-3">
                  <p
                    className="text-3xl font-medium leading-tight tracking-tight text-[#1a3a32] sm:text-4xl"
                    lang="es"
                  >
                    {card.front}
                  </p>
                  {audioRenderer ? (
                    <span className="mt-1 inline-flex">{audioRenderer(card)}</span>
                  ) : (
                    <YoSpanishAudioButton
                      text={card.front}
                      locale={locale}
                      moduleId={audioContext?.moduleId}
                      lessonId={audioContext?.lessonId}
                      type={audioContext?.type}
                      accentProfile={audioContext?.accentProfile}
                      speechLang={audioContext?.speechLang ?? speechLang}
                      size="sm"
                      className="mt-1"
                    />
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {flipCta}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Carousel controls — Prev / Play-Pause / Next */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-100 bg-white/85 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={isFirst}
              aria-label={previousLabel}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-sm",
                isFirst
                  ? "cursor-not-allowed bg-white text-teal-700/40 ring-1 ring-teal-100"
                  : "bg-white text-teal-800 ring-1 ring-teal-100 hover:bg-teal-50",
              )}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{previousLabel}</span>
            </button>
            <button
              type="button"
              onClick={onToggleAutoplay}
              aria-pressed={isAutoplay}
              aria-label={isAutoplay ? pauseAria : playAria}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-sm",
                isAutoplay
                  ? "bg-[#0F6E56] text-white hover:bg-[#0b5b47]"
                  : "bg-white text-teal-800 ring-1 ring-teal-100 hover:bg-teal-50",
              )}
            >
              {isAutoplay ? (
                <Pause className="size-3.5" aria-hidden />
              ) : (
                <Play className="size-3.5" aria-hidden />
              )}
              <span>{isAutoplay ? pauseLabel : playLabel}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onNext}
            aria-label={t(YO_COPY.flashAutoplay.nextNeutral, locale)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-sm"
          >
            <span className="hidden sm:inline">
              {t(YO_COPY.flashAutoplay.nextNeutral, locale)}
            </span>
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
        {isReducedMotion ? (
          <p className="text-xs text-[var(--color-text-secondary)]">
            {reducedMotionNote}
          </p>
        ) : null}
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
