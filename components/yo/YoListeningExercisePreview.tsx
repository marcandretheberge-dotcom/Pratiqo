"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Headphones, XCircle } from "lucide-react";

import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";
import { useYoAudioFeedback } from "@/components/yo/YoAudioFeedbackProvider";
import { YoYoppoReward } from "@/components/yo/YoYoppoReward";
import { cn } from "@/lib/utils";
import { t } from "@/lib/yo/localize";
import type { YoAudioAccentProfileId } from "@/lib/yo/audio/accentProfiles";
import type { YoAudioItemType } from "@/lib/yo/audio/audioManifest";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type YoListeningExerciseOption = {
  id: string;
  label: YoLocalizedString;
};

export type YoListeningExerciseItem = {
  id: string;
  audioText: string;
  prompt: YoLocalizedString;
  options: YoListeningExerciseOption[];
  correctOptionId: string;
  explanation?: YoLocalizedString;
  audioContext?: {
    moduleId?: string;
    lessonId?: string;
    type?: YoAudioItemType;
    accentProfile?: YoAudioAccentProfileId;
    speechLang?: string;
  };
};

export type YoListeningExerciseData = {
  id: string;
  title: YoLocalizedString;
  subtitle?: YoLocalizedString;
  items: YoListeningExerciseItem[];
};

export interface YoListeningExercisePreviewProps {
  data: YoListeningExerciseData;
  locale: YoLocale;
}

type ListeningState =
  | {
      mode: "question";
      pickedOptionId: string | null;
      isCorrect: boolean | null;
    }
  | { mode: "complete"; correctCount: number };

export function YoListeningExercisePreview({
  data,
  locale,
}: YoListeningExercisePreviewProps) {
  const { playFeedback } = useYoAudioFeedback();
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [state, setState] = useState<ListeningState>({
    mode: "question",
    pickedOptionId: null,
    isCorrect: null,
  });

  const total = data.items.length;
  const item = data.items[index];

  const handlePick = useCallback(
    (option: YoListeningExerciseOption) => {
      setState((prev) => {
        if (prev.mode !== "question" || prev.pickedOptionId !== null) {
          return prev;
        }
        const current = data.items[index];
        if (!current) return prev;
        const isCorrect = option.id === current.correctOptionId;
        if (isCorrect) {
          setCorrectCount((value) => value + 1);
        }
        void playFeedback(isCorrect ? "correct" : "incorrect");
        return {
          mode: "question",
          pickedOptionId: option.id,
          isCorrect,
        };
      });
    },
    [data.items, index, playFeedback],
  );

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      const finalCorrect =
        state.mode === "question" && state.isCorrect
          ? correctCount
          : correctCount;
      setState({ mode: "complete", correctCount: finalCorrect });
      void playFeedback("step-complete");
      return;
    }
    setIndex((value) => value + 1);
    setState({ mode: "question", pickedOptionId: null, isCorrect: null });
  }, [correctCount, index, playFeedback, state, total]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setCorrectCount(0);
    setState({ mode: "question", pickedOptionId: null, isCorrect: null });
  }, []);

  if (total === 0 || !item) return null;

  if (state.mode === "complete") {
    return (
      <section
        aria-labelledby={`${data.id}-title`}
        className="mx-auto flex w-full max-w-xl flex-col gap-4 px-2"
      >
        <YoYoppoReward show locale={locale} variant="step" />
        <div className="rounded-[1.75rem] border border-teal-100 bg-white p-5 shadow-[0_14px_34px_rgba(23,38,66,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#13A085]">
            {state.correctCount} / {total}
          </p>
          <h3
            id={`${data.id}-title`}
            className="mt-2 text-xl font-semibold tracking-tight text-[#172642]"
          >
            {t(data.title, locale)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#566073]">
            {locale === "en"
              ? "Listening demo complete."
              : locale === "es"
                ? "Demo de escucha terminada."
                : "Demo d'ecoute terminee."}
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-4 rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
          >
            {locale === "en" ? "Restart" : locale === "es" ? "Reiniciar" : "Recommencer"}
          </button>
        </div>
      </section>
    );
  }

  const picked = state.pickedOptionId;
  const isAnswered = picked !== null;

  return (
    <section
      aria-labelledby={`${data.id}-title`}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 px-2"
    >
      <div>
        <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#13A085]">
          <Headphones className="size-3.5" aria-hidden />
          {locale === "en" ? "Listening" : locale === "es" ? "Escucha" : "Ecoute"}
        </p>
        <h3
          id={`${data.id}-title`}
          className="mt-1 text-xl font-semibold tracking-tight text-[#172642]"
        >
          {t(data.title, locale)}
        </h3>
        {data.subtitle ? (
          <p className="mt-1 text-sm leading-relaxed text-[#566073]">
            {t(data.subtitle, locale)}
          </p>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-[#E7DFCF] bg-white p-4 shadow-[0_14px_34px_rgba(23,38,66,0.08)]">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF7EE] px-4 py-3">
          <p className="text-sm font-bold text-[#172642]">
            {t(item.prompt, locale)}
          </p>
          <YoSpanishAudioButton
            text={item.audioText}
            locale={locale}
            moduleId={item.audioContext?.moduleId}
            lessonId={item.audioContext?.lessonId}
            type={item.audioContext?.type}
            accentProfile={item.audioContext?.accentProfile}
            speechLang={item.audioContext?.speechLang ?? "es-DO"}
            size="sm"
          />
        </div>

        <ul role="list" className="mt-4 grid gap-2">
          {item.options.map((option, optionIndex) => {
            const isPicked = picked === option.id;
            const isCorrect = option.id === item.correctOptionId;
            const showCorrect = isAnswered && isCorrect;
            const showWrong = isAnswered && isPicked && !isCorrect;
            const optionLetter = String.fromCharCode(
              "A".charCodeAt(0) + optionIndex,
            );

            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => handlePick(option)}
                  disabled={isAnswered}
                  aria-pressed={isPicked}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]",
                    !isAnswered &&
                      "border-teal-100 bg-white text-[#172642] hover:bg-teal-50",
                    showCorrect &&
                      "border-[#bfe1cd] bg-[#e6f4ec] text-[#1f6a45]",
                    showWrong &&
                      "border-[#f6c8c8] bg-[#fdecec] text-[#a23a3a]",
                    isAnswered &&
                      !showCorrect &&
                      !showWrong &&
                      "border-teal-100 bg-white text-[#172642]/60",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-teal-50 text-xs text-teal-700">
                      {optionLetter}
                    </span>
                    {t(option.label, locale)}
                  </span>
                  {showCorrect ? (
                    <CheckCircle2 className="size-5" aria-hidden />
                  ) : showWrong ? (
                    <XCircle className="size-5" aria-hidden />
                  ) : null}
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
                "rounded-2xl px-4 py-3 text-sm font-medium ring-1",
                state.isCorrect
                  ? "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]"
                  : "bg-[#fff8ef] text-[#8a5a17] ring-[#f3dcb4]",
              )}
            >
              {item.explanation ? t(item.explanation, locale) : null}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="self-end rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
            >
              {index >= total - 1
                ? locale === "en"
                  ? "Finish"
                  : locale === "es"
                    ? "Terminar"
                    : "Terminer"
                : locale === "en"
                  ? "Next"
                  : locale === "es"
                    ? "Siguiente"
                    : "Suivant"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
