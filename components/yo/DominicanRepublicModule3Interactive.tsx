"use client";

import { CheckCircle2, Printer, Trophy } from "lucide-react";

import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import type { Dom3GameRound } from "@/lib/yo/dominicanRepublicFoodCulture";
import { useMemo, useState } from "react";

interface PrintSheetsButtonProps {
  label: YoLocalizedString;
  locale: YoLocale;
}

export function DominicanRepublicModule3PrintButton({
  label,
  locale,
}: PrintSheetsButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2 print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {t(label, locale)}
    </button>
  );
}

interface CultureChallengeProps {
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
  successMessage: YoLocalizedString;
  rounds: Dom3GameRound[];
  locale: YoLocale;
}

const LABEL_STOP = {
  fr: "Étape",
  en: "Stop",
  es: "Parada",
};

const LABEL_SCORE = {
  fr: "Score",
  en: "Score",
  es: "Puntuación",
};

const LABEL_NEXT = {
  fr: "Prochaine étape",
  en: "Next stop",
  es: "Siguiente parada",
};

const LABEL_RESTART = {
  fr: "Recommencer",
  en: "Restart",
  es: "Reiniciar",
};

function localLabel(
  locale: YoLocale,
  values: Record<YoLocale, string>,
): string {
  return values[locale] ?? values.fr;
}

export function DominicanRepublicCultureChallenge({
  title,
  subtitle,
  successMessage,
  rounds,
  locale,
}: CultureChallengeProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentRound = rounds[roundIndex];
  const selected = currentRound ? answers[currentRound.id] : undefined;
  const isCorrect = currentRound
    ? selected === currentRound.correctOptionId
    : false;

  const score = useMemo(
    () =>
      rounds.reduce(
        (total, round) =>
          answers[round.id] === round.correctOptionId ? total + 1 : total,
        0,
      ),
    [answers, rounds],
  );

  if (!currentRound) {
    return null;
  }

  const isLastRound = roundIndex === rounds.length - 1;
  const completed = Object.keys(answers).length === rounds.length;

  return (
    <section
      aria-labelledby="yo-do-m3-game-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module3-final-game
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/40 bg-gradient-to-br from-[#0F6E56] via-[#0d604d] to-[#082f2a] p-5 text-white shadow-[0_18px_44px_rgba(15,58,52,0.2)] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#F4B400]/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.14em] text-white/85">
              <Trophy className="size-4 text-[#F4B400]" aria-hidden />
              {localLabel(locale, LABEL_SCORE)} {score}/{rounds.length}
            </span>
            <span className="rounded-full bg-[#F4B400]/20 px-3 py-1 text-xs font-bold text-[#FFF4D6]">
              {localLabel(locale, LABEL_STOP)} {currentRound.stop}/{rounds.length}
            </span>
          </div>

          <h2
            id="yo-do-m3-game-title"
            className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t(title, locale)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[0.95rem]">
            {t(subtitle, locale)}
          </p>

          <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-sm font-semibold leading-relaxed text-white">
              {t(currentRound.scenario, locale)}
            </p>

            <div className="mt-4 grid gap-2">
              {currentRound.options.map((option) => {
                const optionSelected = selected === option.id;
                const optionCorrect =
                  option.id === currentRound.correctOptionId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentRound.id]: option.id,
                      }))
                    }
                    className={[
                      "rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F6E56]",
                      optionSelected
                        ? optionCorrect
                          ? "border-[#F4B400] bg-[#F4B400]/25"
                          : "border-white/40 bg-white/20"
                        : "border-white/15 bg-white/10 hover:bg-white/15",
                    ].join(" ")}
                  >
                    <span className="block text-base font-black" lang="es">
                      {option.target}
                    </span>
                    <span className="mt-1 block text-xs text-white/75">
                      {t(option.translation, locale)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected ? (
              <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm leading-relaxed text-white/85">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={[
                      "mt-0.5 size-4 shrink-0",
                      isCorrect ? "text-[#F4B400]" : "text-white/60",
                    ].join(" ")}
                    aria-hidden
                  />
                  <p>{t(currentRound.feedback, locale)}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 gap-1" aria-hidden>
              {rounds.map((round, index) => (
                <span
                  key={round.id}
                  className={[
                    "h-2 flex-1 rounded-full",
                    index <= roundIndex ? "bg-[#F4B400]" : "bg-white/20",
                  ].join(" ")}
                />
              ))}
            </div>
            {completed ? (
              <button
                type="button"
                onClick={() => {
                  setRoundIndex(0);
                  setAnswers({});
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#0F6E56] transition hover:bg-[#FFF4D6]"
              >
                {localLabel(locale, LABEL_RESTART)}
              </button>
            ) : (
              <button
                type="button"
                disabled={!selected}
                onClick={() =>
                  setRoundIndex((prev) =>
                    isLastRound ? prev : Math.min(prev + 1, rounds.length - 1),
                  )
                }
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#0F6E56] transition hover:bg-[#FFF4D6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {localLabel(locale, LABEL_NEXT)}
              </button>
            )}
          </div>

          {completed ? (
            <p className="mt-4 rounded-2xl bg-[#F4B400]/20 p-3 text-sm font-semibold text-[#FFF4D6]">
              {t(successMessage, locale)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
