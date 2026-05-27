"use client";

/**
 * YoQuizPreview — single-question quiz demo.
 *
 * Client component. Phase 1: NO server persistence, NO i18n hookup yet.
 * The question shape (`YoQuizQuestion`) is identical to the future
 * public.yo_quiz_questions row, so once Supabase is wired in Phase 2 this
 * component does not need a prop change.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { YoQuizOption, YoQuizQuestion } from "@/lib/yo/types";
import { cn } from "@/lib/utils";

export interface YoQuizPreviewProps {
  question: YoQuizQuestion;
}

type AnswerState =
  | { kind: "idle" }
  | { kind: "answered"; pickedId: string; isCorrect: boolean };

export function YoQuizPreview({ question }: YoQuizPreviewProps) {
  const [state, setState] = useState<AnswerState>({ kind: "idle" });

  const handlePick = useCallback(
    (option: YoQuizOption) => {
      if (state.kind === "answered") return;
      setState({
        kind: "answered",
        pickedId: option.id,
        isCorrect: option.id === question.correctOptionId,
      });
    },
    [question.correctOptionId, state.kind],
  );

  const handleReset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

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
        <p className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
          Démo · 7 questions par lesson dans le programme complet
        </p>
      </div>

      <div className="ds-card flex flex-col gap-5 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-7">
        <p className="text-lg font-medium leading-snug text-[#1a3a32] sm:text-xl">
          {question.prompt}
        </p>

        <ul role="list" className="grid gap-2 sm:gap-3">
          {question.options.map((option) => {
            const isAnswered = state.kind === "answered";
            const isPicked = isAnswered && state.pickedId === option.id;
            const isCorrectOption = option.id === question.correctOptionId;

            // Reveal the right answer only once the learner has answered.
            const showAsCorrect = isAnswered && isCorrectOption;
            const showAsWrong = isAnswered && isPicked && !isCorrectOption;

            return (
              <li key={option.id} className="list-none">
                <button
                  type="button"
                  onClick={() => handlePick(option)}
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

        {state.kind === "answered" ? (
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
                ? "Exact ! Tu peux dire « Voy a Santo Domingo »."
                : "Pas tout à fait, mais l’erreur est instructive."}
            </p>
            {question.explanation ? (
              <p className="text-[0.85rem] leading-relaxed">
                {question.explanation}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleReset}
              className="self-start text-xs font-medium text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Réessayer
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
