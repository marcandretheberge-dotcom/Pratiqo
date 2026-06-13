"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Printer, RotateCw, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type YoChoiceOption = {
  id: string;
  label: string;
  helper?: string;
};

export type YoChoiceCardProps = {
  prompt: string;
  options: readonly YoChoiceOption[];
  correctOptionId: string;
  correctFeedback: string;
  incorrectFeedback: string;
  className?: string;
};

export function YoChoiceCard({
  prompt,
  options,
  correctOptionId,
  correctFeedback,
  incorrectFeedback,
  className,
}: YoChoiceCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isCorrect = selectedId === correctOptionId;
  return (
    <section
      data-yo-choice-card="true"
      className={cn("max-w-full overflow-x-hidden rounded-[28px] border border-[#D8ECE6] bg-white p-4 shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5", className)}
    >
      <p className="text-base font-bold leading-snug text-[#0F6E56]">{prompt}</p>
      <div className="mt-4 grid min-w-0 gap-2">
        {options.map((option) => {
          const active = option.id === selectedId;
          const good = active && option.id === correctOptionId;
          const bad = active && option.id !== correctOptionId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              className={cn(
                "min-w-0 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]",
                active ? "border-[#0F6E56] bg-[#DDF4F1]" : "border-[#D8ECE6] bg-[#F8FCFB] hover:bg-[#EEF8F5]",
                good && "border-[#1D9E75] bg-[#DDF4F1]",
                bad && "border-[#F26B5E] bg-[#FFF4D6]",
              )}
            >
              <span className="block text-sm font-extrabold leading-snug text-[#0F6E56]">{option.label}</span>
              {option.helper ? (
                <span className="mt-1 block text-xs leading-snug text-[#0F6E56]/70">{option.helper}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {selectedId ? (
        <p
          role="status"
          className={cn(
            "mt-4 flex items-start gap-2 rounded-2xl px-3 py-2 text-sm font-semibold leading-snug",
            isCorrect ? "bg-[#DDF4F1] text-[#0F6E56]" : "bg-[#FFF4D6] text-[#6b4b0e]",
          )}
        >
          {isCorrect ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {isCorrect ? correctFeedback : incorrectFeedback}
        </p>
      ) : null}
    </section>
  );
}

export type YoOneQuestionQuizQuestion = {
  id: string;
  prompt: string;
  options: readonly YoChoiceOption[];
  correctOptionId: string;
};

export function YoOneQuestionQuiz({
  questions,
  correctFeedback,
  incorrectFeedback,
  previousLabel,
  nextLabel,
}: {
  questions: readonly YoOneQuestionQuizQuestion[];
  correctFeedback: string;
  incorrectFeedback: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const question = questions[index];

  return (
    <section data-yo-one-question-quiz="true" className="max-w-full overflow-x-hidden">
      <YoChoiceCard
        prompt={`${index + 1}. ${question.prompt}`}
        options={question.options}
        correctOptionId={question.correctOptionId}
        correctFeedback={correctFeedback}
        incorrectFeedback={incorrectFeedback}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          className="min-h-11 rounded-full border border-[#D8ECE6] bg-white px-4 text-sm font-extrabold text-[#0F6E56] disabled:opacity-40"
        >
          {previousLabel}
        </button>
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/60">
          {index + 1}/{questions.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
          disabled={index === questions.length - 1}
          className="min-h-11 rounded-full bg-[#0F6E56] px-4 text-sm font-extrabold text-white disabled:bg-[#D8ECE6] disabled:text-[#0F6E56]"
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}

export type YoPairMatchItem = {
  id: string;
  left: string;
  right: string;
};

export function YoPairMatchGame({
  title,
  items,
  feedback,
  className,
}: {
  title: string;
  items: readonly YoPairMatchItem[];
  feedback: string;
  className?: string;
}) {
  return (
    <section
      data-yo-pair-match-game="true"
      className={cn("max-w-full overflow-x-hidden rounded-[28px] border border-[#D8ECE6] bg-white p-4 shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5", className)}
    >
      <p className="text-base font-bold text-[#0F6E56]">{title}</p>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,0.9fr)] items-center gap-2 rounded-2xl border border-[#D8ECE6] bg-[#F8FCFB] px-3 py-3 text-left transition hover:bg-[#EEF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
          >
            <span className="min-w-0 text-sm font-extrabold leading-snug text-[#0F6E56]">{item.left}</span>
            <span aria-hidden className="text-[#F4B400]">→</span>
            <span className="min-w-0 text-xs font-semibold leading-snug text-[#0F6E56]/75">{item.right}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-[#DDF4F1] px-3 py-2 text-sm font-semibold text-[#0F6E56]">{feedback}</p>
    </section>
  );
}

export type YoGoodAvoidItem = {
  id: string;
  text: string;
  answer: "good" | "avoid";
  feedback: string;
};

export function YoGoodAvoidGame({
  title,
  items,
  goodLabel,
  avoidLabel,
}: {
  title: string;
  items: readonly YoGoodAvoidItem[];
  goodLabel: string;
  avoidLabel: string;
}) {
  const [answers, setAnswers] = useState<Record<string, "good" | "avoid">>({});
  return (
    <section data-yo-good-avoid-game="true" className="max-w-full overflow-x-hidden rounded-[28px] border border-[#D8ECE6] bg-white p-4 shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5">
      <p className="text-base font-bold text-[#0F6E56]">{title}</p>
      <div className="mt-4 grid gap-2">
        {items.map((item) => {
          const picked = answers[item.id];
          const isCorrect = picked === item.answer;
          return (
            <article key={item.id} className="rounded-2xl border border-[#D8ECE6] bg-[#F8FCFB] p-3">
              <p className="text-sm font-extrabold text-[#0F6E56]" lang="fr-CA">{item.text}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["good", "avoid"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: value }))}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]",
                      picked === value ? "border-[#0F6E56] bg-[#DDF4F1] text-[#0F6E56]" : "border-[#D8ECE6] bg-white text-[#0F6E56]/75",
                    )}
                  >
                    {value === "good" ? goodLabel : avoidLabel}
                  </button>
                ))}
              </div>
              {picked ? (
                <p className={cn("mt-2 text-xs font-semibold leading-snug", isCorrect ? "text-[#0F6E56]" : "text-[#9A4A37]")}>
                  {item.feedback}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export type YoFixedFlashcard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
};

export function YoFixedFlashcardDeck({
  cards,
  flipLabel,
  previousLabel,
  nextLabel,
}: {
  cards: readonly YoFixedFlashcard[];
  flipLabel: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  const dots = useMemo(() => cards.map((c) => c.id), [cards]);

  function go(delta: number) {
    setIndex((current) => Math.min(cards.length - 1, Math.max(0, current + delta)));
    setFlipped(false);
  }

  return (
    <section data-yo-fixed-flashcard-deck="true" className="flex max-w-full flex-col overflow-x-hidden rounded-[28px] border border-[#D8ECE6] bg-white p-4 shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5">
      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/60">
        <span>{index + 1}/{cards.length}</span>
        <div className="flex gap-1" aria-hidden>
          {dots.map((id, dotIndex) => (
            <span key={id} className={cn("size-1.5 rounded-full", dotIndex === index ? "bg-[#0F6E56]" : "bg-[#D8ECE6]")} />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="mt-4 min-h-44 rounded-[24px] border border-[#D8ECE6] bg-[#FFF4D6] px-4 py-6 text-center transition hover:bg-[#FFEFBD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
      >
        <span className="block text-2xl font-black leading-tight text-[#0F6E56]" lang="fr-CA">
          {flipped ? card.back : card.front}
        </span>
        {card.hint && !flipped ? (
          <span className="mt-3 block text-sm font-semibold text-[#0F6E56]/70">{card.hint}</span>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/60">
          <RotateCw className="size-3.5" aria-hidden />
          {flipLabel}
        </span>
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-full border border-[#D8ECE6] bg-white px-4 py-3 text-sm font-extrabold text-[#0F6E56] disabled:opacity-40"
        >
          {previousLabel}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === cards.length - 1}
          className="rounded-full bg-[#0F6E56] px-4 py-3 text-sm font-extrabold text-white disabled:bg-[#D8ECE6] disabled:text-[#0F6E56]"
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}

export function YoMiniScenarioCard({
  lines,
  prompt,
  children,
}: {
  lines: readonly { speaker: string; text: string }[];
  prompt: string;
  children?: React.ReactNode;
}) {
  return (
    <section data-yo-mini-scenario-card="true" className="max-w-full overflow-x-hidden rounded-[28px] border border-[#D8ECE6] bg-white p-4 shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5">
      <div className="grid gap-2">
        {lines.map((line, index) => (
          <p key={`${line.speaker}-${index}`} className="rounded-2xl bg-[#F8FCFB] px-3 py-2 text-sm leading-snug text-[#0F6E56]">
            <span className="font-black">{line.speaker}: </span>
            <span lang="fr-CA">{line.text}</span>
          </p>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-[#0F6E56]">{prompt}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function YoPrintableResourceCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <article data-yo-printable-resource-card="true" className="rounded-[28px] border border-[#F4B400]/45 bg-[#FFF4D6] p-4 text-[#5a3f0f] shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5">
      <p className="text-lg font-black leading-tight">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5a3f0f]/80">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-4 text-sm font-extrabold text-white transition hover:bg-[#0b5b47]"
      >
        <Printer className="size-4" aria-hidden />
        {cta}
      </Link>
    </article>
  );
}

export function YoPrintButton({ label }: { label: string }) {
  return (
    <button
      data-yo-print-action="true"
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,110,86,0.18)] print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
