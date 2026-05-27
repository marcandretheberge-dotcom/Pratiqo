"use client";

/**
 * YoQuizPreview — multi-question quiz flow.
 *
 * Client component. Phase 1: NO server persistence, NO i18n hookup yet.
 * Each `YoQuizQuestion` shape is identical to the future
 * public.yo_quiz_questions row, so once Supabase is wired in Phase 2 this
 * component does not need a prop change — only the data source moves.
 *
 * Flow:
 *   1. Show question N / total.
 *   2. User picks an option → reveal correct answer + explanation.
 *   3. "Question suivante" advances; at the end show score + Recommencer.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { YoQuizOption, YoQuizQuestion } from "@/lib/yo/types";
import { cn } from "@/lib/utils";

export interface YoQuizPreviewProps {
  questions: YoQuizQuestion[];
}

type AnswerLog = {
  questionId: string;
  pickedOptionId: string;
  isCorrect: boolean;
};

type QuizState =
  | { mode: "question"; pickedOptionId: string | null; isCorrect: boolean | null }
  | { mode: "complete" };

export function YoQuizPreview({ questions }: YoQuizPreviewProps) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<QuizState>({
    mode: "question",
    pickedOptionId: null,
    isCorrect: null,
  });
  const [history, setHistory] = useState<AnswerLog[]>([]);

  const handlePick = useCallback(
    (option: YoQuizOption) => {
      setState((prev) => {
        if (prev.mode !== "question") return prev;
        if (prev.pickedOptionId !== null) return prev;
        const question = questions[index];
        if (!question) return prev;
        const isCorrect = option.id === question.correctOptionId;
        setHistory((h) => [
          ...h,
          {
            questionId: question.id,
            pickedOptionId: option.id,
            isCorrect,
          },
        ]);
        return {
          mode: "question",
          pickedOptionId: option.id,
          isCorrect,
        };
      });
    },
    [index, questions],
  );

  const handleNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setState({ mode: "complete" });
        return i;
      }
      setState({
        mode: "question",
        pickedOptionId: null,
        isCorrect: null,
      });
      return i + 1;
    });
  }, [total]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setState({ mode: "question", pickedOptionId: null, isCorrect: null });
    setHistory([]);
  }, []);

  if (total === 0) {
    return null;
  }

  const correctCount = history.filter((entry) => entry.isCorrect).length;

  return (
    <section
      aria-labelledby="yo-quiz-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id="yo-quiz-title"
          className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          Quiz éclair
        </h2>
        <p
          className="text-xs font-medium uppercase tracking-[0.14em] text-teal-700/80"
          aria-live="polite"
        >
          {state.mode === "complete"
            ? `Score · ${correctCount} / ${total}`
            : `Question ${index + 1} / ${total}`}
        </p>
      </div>

      {state.mode === "complete" ? (
        <CompletionPanel
          correct={correctCount}
          total={total}
          onRestart={handleRestart}
        />
      ) : (
        <QuestionCard
          question={questions[index]!}
          index={index}
          total={total}
          state={state}
          onPick={handlePick}
          onNext={handleNext}
        />
      )}
    </section>
  );
}

interface QuestionCardProps {
  question: YoQuizQuestion;
  index: number;
  total: number;
  state: Extract<QuizState, { mode: "question" }>;
  onPick: (option: YoQuizOption) => void;
  onNext: () => void;
}

function QuestionCard({
  question,
  index,
  total,
  state,
  onPick,
  onNext,
}: QuestionCardProps) {
  const isAnswered = state.pickedOptionId !== null;
  const isLast = index === total - 1;

  return (
    <div className="ds-card flex flex-col gap-5 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-7">
      <ProgressBar current={index + 1} total={total} />

      <p className="text-lg font-medium leading-snug text-[#1a3a32] sm:text-xl">
        {question.prompt}
      </p>

      <ul role="list" className="grid gap-2 sm:gap-3">
        {question.options.map((option) => {
          const isPicked = isAnswered && state.pickedOptionId === option.id;
          const isCorrectOption = option.id === question.correctOptionId;
          const showAsCorrect = isAnswered && isCorrectOption;
          const showAsWrong = isAnswered && isPicked && !isCorrectOption;

          return (
            <li key={option.id} className="list-none">
              <button
                type="button"
                onClick={() => onPick(option)}
                disabled={isAnswered}
                aria-pressed={isPicked}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-base",
                  !isAnswered &&
                    "border-teal-100 bg-white text-[#1a3a32] hover:border-teal-300 hover:bg-teal-50/50",
                  showAsCorrect &&
                    "border-[#bfe1cd] bg-[#e6f4ec] text-[#1f6a45]",
                  showAsWrong &&
                    "border-[#f6c8c8] bg-[#fdecec] text-[#a23a3a]",
                  isAnswered &&
                    !showAsCorrect &&
                    !showAsWrong &&
                    "border-teal-100/70 bg-white text-[#1a3a32]/70",
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                      !isAnswered &&
                        "bg-teal-50 text-teal-700 group-hover:bg-teal-100",
                      showAsCorrect && "bg-[#bfe1cd] text-[#1f6a45]",
                      showAsWrong && "bg-[#f6c8c8] text-[#a23a3a]",
                      isAnswered &&
                        !showAsCorrect &&
                        !showAsWrong &&
                        "bg-teal-50 text-teal-700/70",
                    )}
                  >
                    {option.id.toUpperCase()}
                  </span>
                  <span>{option.label}</span>
                </span>

                {showAsCorrect ? (
                  <CheckCircle2 aria-hidden className="size-5" />
                ) : showAsWrong ? (
                  <XCircle aria-hidden className="size-5" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {isAnswered ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm ring-1",
            state.isCorrect
              ? "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]"
              : "bg-[#fff8ef] text-[#8a5a17] ring-[#f3dcb4]",
          )}
        >
          <p className="font-medium">
            {state.isCorrect
              ? "Exact !"
              : "Pas tout à fait, mais l’erreur est instructive."}
          </p>
          {question.explanation ? (
            <p className="text-[0.85rem] leading-relaxed">
              {question.explanation}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-700 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-sm"
          >
            {isLast ? "Voir mon score" : "Question suivante"}
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-teal-50 ring-1 ring-teal-100"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Progression quiz : ${current} sur ${total}`}
    >
      <div
        className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface CompletionPanelProps {
  correct: number;
  total: number;
  onRestart: () => void;
}

function CompletionPanel({ correct, total, onRestart }: CompletionPanelProps) {
  const pct = Math.round((correct / total) * 100);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-4 rounded-3xl border border-teal-100 bg-gradient-to-br from-[#e6f4ec] via-white to-[var(--color-base-cream)] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
        <CheckCircle2 aria-hidden className="size-4 text-teal-700" />
        Quiz terminé
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-semibold tracking-tight text-[#1a3a32] sm:text-4xl">
          {correct} <span className="text-[#1a3a32]/40">/ {total}</span>
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {pct}% de bonnes réponses
        </p>
      </div>
      <p className="max-w-xl text-base font-medium text-[#1a3a32]">
        Tu es prêt pour la prochaine étape.
      </p>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Le programme complet contient des quiz beaucoup plus longs, par
        lesson, avec rappel des questions où tu as buté.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm sm:text-base"
      >
        Recommencer le quiz
        <span aria-hidden>↺</span>
      </button>
    </div>
  );
}
