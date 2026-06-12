"use client";

/**
 * YoReadingPreview — guided reading + comprehension quiz.
 *
 * Renders three sub-blocks:
 *   1. A short A1-safe Spanish text (split into paragraphs) with an
 *      audio button next to each paragraph so the learner can replay
 *      the text line by line. Each paragraph maps 1:1 to a manifest
 *      MP3, so playback is fast and never cuts off mid-sentence.
 *   2. A bilingual vocabulary helper box (Spanish target → FR + EN gloss
 *      side-by-side, plus a per-row pronunciation button).
 *   3. A small comprehension quiz with feedback after each answer.
 *
 * Audio policy (UX decision):
 *   - NO section-level / full-text pronunciation button. Concatenating
 *     every body line into one Web-Speech utterance was slow to start,
 *     blocked the page, and frequently cut off mid-paragraph. The
 *     fast, reliable surface is the per-paragraph YoSpanishAudioButton
 *     which resolves to a pre-generated MP3.
 *   - Per-paragraph + per-vocabulary buttons stay. They prefer the
 *     manifest MP3 and only fall back to Web Speech for items that
 *     are not yet covered (which today is none for the intro reading).
 *
 * This component is intentionally a single client island so:
 *   - the audio buttons can use `window.speechSynthesis` safely,
 *   - the quiz can manage selection / feedback state, and
 *   - server pages stay clean: they just pass `section` as a prop.
 *
 * No persistence, no Supabase, no API calls. A1-safe / kid-friendly.
 */

import { useCallback, useState } from "react";
import { BookOpenCheck, CheckCircle2, Languages, XCircle } from "lucide-react";
import type {
  YoLocale,
  YoQuizOption,
  YoQuizQuestion,
  YoReadingSection,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";
import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";
import { useYoAudioFeedback } from "@/components/yo/YoAudioFeedbackProvider";
import { YoYoppoReward } from "@/components/yo/YoYoppoReward";

export interface YoReadingPreviewProps {
  section: YoReadingSection;
  locale: YoLocale;
  enableAudioFeedback?: boolean;
}

type ReadingQuizState =
  | {
      mode: "question";
      pickedOptionId: string | null;
      isCorrect: boolean | null;
    }
  | { mode: "complete"; correctCount: number };

export function YoReadingPreview({
  section,
  locale,
  enableAudioFeedback = false,
}: YoReadingPreviewProps) {
  const speechLang = section.speechLang ?? "es-ES";
  const total = section.questions.length;
  const { playFeedback } = useYoAudioFeedback();
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<ReadingQuizState>({
    mode: "question",
    pickedOptionId: null,
    isCorrect: null,
  });
  const [correctCount, setCorrectCount] = useState(0);

  const handlePick = useCallback(
    (option: YoQuizOption) => {
      const question = section.questions[index];
      if (!question) return;
      const isCorrect = option.id === question.correctOptionId;
      if (enableAudioFeedback) {
        void playFeedback(isCorrect ? "correct" : "incorrect");
      }
      setState((prev) => {
        if (prev.mode !== "question") return prev;
        if (prev.pickedOptionId !== null) return prev;
        if (isCorrect) {
          setCorrectCount((c) => c + 1);
        }
        return {
          mode: "question",
          pickedOptionId: option.id,
          isCorrect,
        };
      });
    },
    [enableAudioFeedback, index, playFeedback, section.questions],
  );

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      setState({ mode: "complete", correctCount });
      if (enableAudioFeedback) {
        void playFeedback("step-complete");
      }
      return;
    }
    setIndex((i) => i + 1);
    setState({ mode: "question", pickedOptionId: null, isCorrect: null });
  }, [correctCount, enableAudioFeedback, index, playFeedback, total]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setCorrectCount(0);
    setState({ mode: "question", pickedOptionId: null, isCorrect: null });
  }, []);

  return (
    <section
      aria-labelledby={`yo-reading-${section.id}-title`}
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <span className="ds-label text-[#1D9E75]">
        {t(section.eyebrow, locale)}
      </span>
      <h2
        id={`yo-reading-${section.id}-title`}
        className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
        lang="es"
      >
        <BookOpenCheck className="size-5 text-[#1D9E75]" aria-hidden />
        {t(section.title, locale)}
      </h2>
      {section.subtitle ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
          {t(section.subtitle, locale)}
        </p>
      ) : null}

      {/* Reading text */}
      <article
        className="mt-5 grid gap-3 rounded-3xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-7"
        lang="es"
      >
        {section.bodyLines.map((line, lineIndex) => (
          <div
            key={`reading-${section.id}-line-${lineIndex}`}
            className="flex items-start gap-3"
          >
            <p className="flex-1 text-base leading-relaxed text-[#1a3a32] sm:text-lg">
              {line}
            </p>
            <YoSpanishAudioButton
              text={line}
              locale={locale}
              moduleId="intro-a1"
              lessonId="reading-first-text"
              type="sentence"
              accentProfile="latin_american_neutral"
              speechLang={speechLang}
              size="xs"
              className="mt-1"
            />
          </div>
        ))}
      </article>

      {/* Vocabulary helper box */}
      <div
        className="mt-4 rounded-3xl border border-[#F4B400]/35 bg-[#FFF9E2] p-4 sm:p-5"
        aria-labelledby={`yo-reading-${section.id}-vocab`}
      >
        <p
          id={`yo-reading-${section.id}-vocab`}
          className="ds-label flex items-center gap-1.5 text-[#7a4a00]"
        >
          <Languages className="size-3.5" aria-hidden />
          {t(YO_COPY.reading.vocabHeading, locale)}
        </p>
        <ul role="list" className="mt-3 grid gap-2 sm:grid-cols-2">
          {section.vocabulary.map((item) => (
            <li
              key={item.target}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[#F4B400]/30"
            >
              <span className="font-semibold text-[#0F6E56]" lang="es">
                {item.target}
              </span>
              <YoSpanishAudioButton
                text={item.target}
                locale={locale}
                moduleId="intro-a1"
                lessonId="reading-first-text"
                type="word"
                accentProfile="latin_american_neutral"
                speechLang={speechLang}
                size="xs"
              />
              <span aria-hidden className="text-[#0F6E56]/40">
                =
              </span>
              <span className="text-sm text-[#1a3a32]">
                <span className="font-medium">{item.translation.fr}</span>
                <span aria-hidden className="px-1 text-[#0F6E56]/40">
                  ·
                </span>
                <span className="text-[#1a3a32]/85">{item.translation.en}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Comprehension quiz */}
      <ReadingQuiz
        section={section}
        index={index}
        state={state}
        onPick={handlePick}
        onNext={handleNext}
        onRestart={handleRestart}
        locale={locale}
        enableAudioFeedback={enableAudioFeedback}
      />
    </section>
  );
}

interface ReadingQuizProps {
  section: YoReadingSection;
  index: number;
  state: ReadingQuizState;
  onPick: (option: YoQuizOption) => void;
  onNext: () => void;
  onRestart: () => void;
  locale: YoLocale;
  enableAudioFeedback: boolean;
}

function ReadingQuiz({
  section,
  index,
  state,
  onPick,
  onNext,
  onRestart,
  locale,
  enableAudioFeedback,
}: ReadingQuizProps) {
  const total = section.questions.length;
  if (state.mode === "complete") {
    const pct = Math.round((state.correctCount / total) * 100);
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-5 flex flex-col gap-3 rounded-3xl border border-teal-100 bg-gradient-to-br from-[#e6f4ec] via-white to-[#DDF4F1] p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-6"
      >
        <YoYoppoReward
          show={enableAudioFeedback}
          locale={locale}
          variant="step"
        />
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
          <CheckCircle2 className="size-4 text-teal-700" aria-hidden />
          {state.correctCount} / {total} · {pct}%
        </span>
        <p className="text-lg font-medium text-[#1a3a32] sm:text-xl">
          {t(YO_COPY.reading.completionTitle, locale)}
        </p>
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {t(YO_COPY.reading.completionBody, locale)}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="self-start rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2"
        >
          {t(YO_COPY.reading.restartQuiz, locale)}
        </button>
      </div>
    );
  }

  const question = section.questions[index];
  if (!question) return null;
  const picked = state.pickedOptionId;
  const isAnswered = picked !== null;
  const isLast = index === total - 1;

  return (
    <div className="mt-5 rounded-3xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="ds-label text-[#1D9E75]">
          {t(YO_COPY.reading.quizHeading, locale)}
        </p>
        <p
          className="text-xs font-medium uppercase tracking-[0.14em] text-[#0F6E56]/70"
          aria-live="polite"
        >
          {index + 1} / {total}
        </p>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {t(YO_COPY.reading.quizIntro, locale)}
      </p>
      <p className="mt-4 text-base font-medium leading-relaxed text-[#1a3a32] sm:text-lg">
        {t(question.prompt, locale)}
      </p>

      <ul role="list" className="mt-4 grid gap-2">
        {question.options.map((option) => {
          const isThisPicked = picked === option.id;
          const isCorrect = option.id === question.correctOptionId;
          const showState = isAnswered;
          const className = cn(
            "w-full rounded-2xl px-4 py-3 text-left text-sm leading-relaxed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2 sm:text-base",
            !showState && "bg-white text-[#1a3a32] ring-1 ring-teal-100 hover:bg-teal-50",
            showState && isCorrect && "bg-[#e6f4ec] text-[#1f6a45] ring-1 ring-[#bfe1cd]",
            showState && isThisPicked && !isCorrect && "bg-[#fdecec] text-[#a23a3a] ring-1 ring-[#f6c8c8]",
            showState && !isCorrect && !isThisPicked && "bg-white text-[#1a3a32]/70 ring-1 ring-teal-100/70",
          );
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onPick(option)}
                disabled={isAnswered}
                aria-pressed={isThisPicked}
                className={className}
              >
                {t(option.label, locale)}
              </button>
            </li>
          );
        })}
      </ul>

      {isAnswered ? (
        <div className="mt-4 flex flex-col gap-3">
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-start gap-2 rounded-2xl px-3 py-3 text-sm leading-relaxed ring-1",
              state.isCorrect
                ? "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]"
                : "bg-[#fdecec] text-[#a23a3a] ring-[#f6c8c8]",
            )}
          >
            {state.isCorrect ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            ) : (
              <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              <strong className="mr-1.5 font-semibold">
                {state.isCorrect
                  ? t(YO_COPY.reading.correctChip, locale)
                  : t(YO_COPY.reading.incorrectChip, locale)}
              </strong>
              {question.explanation ? t(question.explanation, locale) : null}
            </span>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="self-end rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2"
          >
            {isLast
              ? t(YO_COPY.reading.finishQuiz, locale)
              : t(YO_COPY.reading.nextQuestion, locale)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
