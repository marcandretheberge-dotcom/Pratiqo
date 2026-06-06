"use client";

import { CheckCircle2, Eye, Printer, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import type {
  Dom4GameRound,
  Dom4QuizQuestion,
  Dom4ReadingText,
} from "@/lib/yo/dominicanRepublicExplore";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";

interface PrintSheetsButtonProps {
  label: YoLocalizedString;
  locale: YoLocale;
}

/**
 * Triggers the browser print dialog. No PDF generation, no MP3, no
 * server call — purely client-side window.print().
 */
export function DominicanRepublicModule4PrintButton({
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

// ─── Practice quiz · reveal-only translations ────────────────────────────

const QUIZ_LABELS = {
  check: { fr: "Vérifier", en: "Check", es: "Verificar" },
  next: { fr: "Question suivante", en: "Next question", es: "Pregunta siguiente" },
  restart: { fr: "Recommencer", en: "Restart", es: "Reiniciar" },
  score: { fr: "Score", en: "Score", es: "Puntuación" },
  question: { fr: "Question", en: "Question", es: "Pregunta" },
  yourAnswer: { fr: "Ton choix", en: "Your choice", es: "Tu elección" },
  correctAnswer: { fr: "Réponse correcte", en: "Correct answer", es: "Respuesta correcta" },
  explanation: { fr: "Explication", en: "Explanation", es: "Explicación" },
  done: {
    fr: "Tu as terminé le quiz d'exploration.",
    en: "You finished the exploration quiz.",
    es: "Terminaste el cuestionario de exploración.",
  },
};

interface QuizSectionProps {
  questions: Dom4QuizQuestion[];
  locale: YoLocale;
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
  eyebrow: YoLocalizedString;
}

function pickLabel(locale: YoLocale, dict: Record<YoLocale, string>): string {
  return dict[locale] ?? dict.fr;
}

export function DominicanRepublicModule4Quiz({
  questions,
  locale,
  title,
  subtitle,
  eyebrow,
}: QuizSectionProps) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const current = questions[index];
  if (!current) return null;

  const isRevealed = Boolean(revealed[current.id]);
  const pickedId = picks[current.id];
  const pickedOption = current.options.find((o) => o.id === pickedId);
  const correctOption = current.options.find(
    (o) => o.id === current.correctOptionId,
  );
  const isCorrect = pickedId === current.correctOptionId;

  const score = useMemo(
    () =>
      questions.reduce(
        (acc, q) => (picks[q.id] === q.correctOptionId ? acc + 1 : acc),
        0,
      ),
    [picks, questions],
  );

  const completed = Object.keys(revealed).length === questions.length;
  const isLast = index === questions.length - 1;

  return (
    <section
      aria-labelledby="yo-do-m4-quiz-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-quiz
    >
      <div className="mb-5">
        <p className="flex items-center gap-2 text-[0.74rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          <Eye className="size-4 text-[#1D9E75]" aria-hidden />
          {t(eyebrow, locale)}
        </p>
        <h2
          id="yo-do-m4-quiz-title"
          className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
        >
          {t(title, locale)}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/70">
          {t(subtitle, locale)}
        </p>
      </div>

      <div className="rounded-3xl border border-[#0F6E56]/15 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#0F6E56]/10 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
            {pickLabel(locale, QUIZ_LABELS.question)} {index + 1}/{questions.length}
          </span>
          <span className="rounded-full bg-[#F4B400]/20 px-3 py-1 text-xs font-bold text-[#8a5a17]">
            {pickLabel(locale, QUIZ_LABELS.score)} {score}/{questions.length}
          </span>
        </div>

        <p className="mt-4 text-base font-semibold leading-relaxed text-[#0B3040]">
          {t(current.prompt, locale)}
        </p>

        <div className="mt-4 grid gap-2">
          {current.options.map((option) => {
            const optionPicked = pickedId === option.id;
            const optionCorrect = option.id === current.correctOptionId;
            const showAsCorrect = isRevealed && optionCorrect;
            const showAsWrongPick =
              isRevealed && optionPicked && !optionCorrect;
            return (
              <button
                key={option.id}
                type="button"
                disabled={isRevealed}
                onClick={() =>
                  setPicks((prev) => ({ ...prev, [current.id]: option.id }))
                }
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2",
                  showAsCorrect
                    ? "border-[#0F6E56] bg-[#DDF4F1]"
                    : showAsWrongPick
                      ? "border-[#F26B5E] bg-[#FDECE9]"
                      : optionPicked
                        ? "border-[#F4B400] bg-[#FFF4D6]"
                        : "border-[#0F6E56]/15 bg-white hover:bg-[#F4FBF9]",
                  isRevealed ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <span
                  className="block text-base font-black text-[#0B3040]"
                  lang="es"
                  data-yo-module4-quiz-choice-label
                >
                  {option.target}
                </span>
                {/*
                  Translations are intentionally hidden until the learner
                  presses "Check". The Spanish-only choice forces real
                  comprehension instead of pattern-matching the gloss.
                */}
                {isRevealed ? (
                  <span className="mt-1 block text-xs font-semibold text-[#0F6E56]/70">
                    {t(option.translation, locale)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {isRevealed ? (
            completed && isLast ? (
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setPicks({});
                  setRevealed({});
                }}
                className="rounded-full bg-[#0F6E56] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0b5b47]"
              >
                {pickLabel(locale, QUIZ_LABELS.restart)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setIndex((prev) => Math.min(prev + 1, questions.length - 1))
                }
                disabled={isLast}
                className="rounded-full bg-[#0F6E56] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0b5b47] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pickLabel(locale, QUIZ_LABELS.next)}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={!pickedId}
              onClick={() =>
                setRevealed((prev) => ({ ...prev, [current.id]: true }))
              }
              className="rounded-full bg-[#0F6E56] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0b5b47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pickLabel(locale, QUIZ_LABELS.check)}
            </button>
          )}
          <div className="flex flex-1 gap-1" aria-hidden>
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={[
                  "h-2 flex-1 rounded-full",
                  i <= index ? "bg-[#0F6E56]" : "bg-[#0F6E56]/15",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {isRevealed && correctOption ? (
          <div
            className="mt-5 rounded-2xl border border-[#0F6E56]/15 bg-[#F4FBF9] p-4"
            data-yo-module4-quiz-feedback
          >
            <div className="flex items-start gap-2">
              <CheckCircle2
                className={[
                  "mt-0.5 size-4 shrink-0",
                  isCorrect ? "text-[#0F6E56]" : "text-[#F26B5E]",
                ].join(" ")}
                aria-hidden
              />
              <div>
                {pickedOption && !isCorrect ? (
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/60">
                    {pickLabel(locale, QUIZ_LABELS.yourAnswer)}:{" "}
                    <span lang="es">{pickedOption.target}</span>
                  </p>
                ) : null}
                <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]">
                  {pickLabel(locale, QUIZ_LABELS.correctAnswer)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <p className="text-base font-black text-[#0B3040]" lang="es">
                    {correctOption.target}
                  </p>
                  <YoSpeechButton text={correctOption.target} locale={locale} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#0F6E56]/80">
                  {t(correctOption.translation, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/80">
                  <span className="font-black uppercase tracking-[0.12em] text-[0.65rem] text-[#0F6E56]/70">
                    {pickLabel(locale, QUIZ_LABELS.explanation)} ·{" "}
                  </span>
                  {t(current.explanation, locale)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Reading comprehension · revealable answers ──────────────────────────

const READING_LABELS = {
  reveal: { fr: "Voir la réponse", en: "Show answer", es: "Ver respuesta" },
  hide: { fr: "Masquer la réponse", en: "Hide answer", es: "Ocultar respuesta" },
};

interface ReadingCompProps {
  reading: Dom4ReadingText;
  locale: YoLocale;
}

export function DominicanRepublicModule4ReadingQuestions({
  reading,
  locale,
}: ReadingCompProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <ul className="mt-4 space-y-3" data-yo-module4-reading-questions={reading.id}>
      {reading.questions.map((q, i) => {
        const isOpen = Boolean(open[q.id]);
        return (
          <li
            key={q.id}
            className="rounded-2xl border border-[#0F6E56]/15 bg-white/85 p-4"
          >
            <p className="text-sm font-semibold leading-relaxed text-[#0B3040]">
              <span className="mr-1 font-black text-[#0F6E56]/80">
                {i + 1}.
              </span>
              {t(q.prompt, locale)}
            </p>
            <button
              type="button"
              onClick={() =>
                setOpen((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/20 bg-[#F4FBF9] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56] transition hover:bg-[#DDF4F1]"
            >
              <Eye className="size-3.5" aria-hidden />
              {pickLabel(locale, isOpen ? READING_LABELS.hide : READING_LABELS.reveal)}
            </button>
            {isOpen ? (
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85">
                {t(q.answer, locale)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Final game · Dominican explorer challenge ──────────────────────────

const GAME_LABELS = {
  stop: { fr: "Étape", en: "Stop", es: "Parada" },
  score: { fr: "Score", en: "Score", es: "Puntuación" },
  next: { fr: "Prochaine étape", en: "Next stop", es: "Siguiente parada" },
  restart: { fr: "Recommencer", en: "Restart", es: "Reiniciar" },
  yourAnswer: { fr: "Ton choix", en: "Your choice", es: "Tu elección" },
  usefulAnswer: { fr: "Réponse utile", en: "Useful answer", es: "Respuesta útil" },
};

interface ExplorerChallengeProps {
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
  successMessage: YoLocalizedString;
  rounds: Dom4GameRound[];
  locale: YoLocale;
}

export function DominicanRepublicExplorerChallenge({
  title,
  subtitle,
  successMessage,
  rounds,
  locale,
}: ExplorerChallengeProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentRound = rounds[roundIndex];
  const selected = currentRound ? answers[currentRound.id] : undefined;
  const isCorrect = currentRound
    ? selected === currentRound.correctOptionId
    : false;
  const selectedOption = currentRound?.options.find((o) => o.id === selected);
  const correctOption = currentRound?.options.find(
    (o) => o.id === currentRound.correctOptionId,
  );

  const score = useMemo(
    () =>
      rounds.reduce(
        (total, round) =>
          answers[round.id] === round.correctOptionId ? total + 1 : total,
        0,
      ),
    [answers, rounds],
  );

  if (!currentRound) return null;

  const isLastRound = roundIndex === rounds.length - 1;
  const completed = Object.keys(answers).length === rounds.length;

  return (
    <section
      aria-labelledby="yo-do-m4-game-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-final-game
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/40 bg-[linear-gradient(135deg,#0B3040_0%,#123D4E_45%,#0F6E56_100%)] p-5 text-white shadow-[0_18px_44px_rgba(15,58,52,0.2)] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#F4B400]/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.14em] text-white/85">
              <Trophy className="size-4 text-[#F4B400]" aria-hidden />
              {pickLabel(locale, GAME_LABELS.score)} {score}/{rounds.length}
            </span>
            <span className="rounded-full bg-[#F4B400]/20 px-3 py-1 text-xs font-bold text-[#FFF4D6]">
              {pickLabel(locale, GAME_LABELS.stop)} {currentRound.stop}/{rounds.length}
            </span>
          </div>

          <h2
            id="yo-do-m4-game-title"
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
                const optionCorrect = option.id === currentRound.correctOptionId;
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
                    <span
                      className="block text-base font-black"
                      lang="es"
                      data-yo-module4-game-choice-label
                    >
                      {option.target}
                    </span>
                    {/*
                      Translations are hidden until the learner picks an
                      answer; the post-pick reveal block below is the only
                      place where the gloss appears.
                    */}
                  </button>
                );
              })}
            </div>

            {selected && correctOption ? (
              <div
                className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm leading-relaxed text-white/85"
                data-yo-module4-game-feedback
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={[
                      "mt-0.5 size-4 shrink-0",
                      isCorrect ? "text-[#F4B400]" : "text-white/60",
                    ].join(" ")}
                    aria-hidden
                  />
                  <div>
                    {selectedOption && !isCorrect ? (
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-white/60">
                        {pickLabel(locale, GAME_LABELS.yourAnswer)}:{" "}
                        <span lang="es">{selectedOption.target}</span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#F4B400]">
                      {pickLabel(locale, GAME_LABELS.usefulAnswer)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="text-base font-black text-white" lang="es">
                        {correctOption.target}
                      </p>
                      <YoSpeechButton text={correctOption.target} locale={locale} compact />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-white/78">
                      {t(correctOption.translation, locale)}
                    </p>
                    <p className="mt-2">{t(currentRound.feedback, locale)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 gap-1" aria-hidden>
              {rounds.map((round, idx) => (
                <span
                  key={round.id}
                  className={[
                    "h-2 flex-1 rounded-full",
                    idx <= roundIndex ? "bg-[#F4B400]" : "bg-white/20",
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
                {pickLabel(locale, GAME_LABELS.restart)}
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
                {pickLabel(locale, GAME_LABELS.next)}
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
