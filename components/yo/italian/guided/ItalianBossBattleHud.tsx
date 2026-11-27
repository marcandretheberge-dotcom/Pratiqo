"use client";

import { Check, Target, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";

/** A compact view of existing quiz evidence. This component never scores or unlocks anything. */
export function ItalianBossBattleHud({ locale, correct, answered, total, assisted, passPercent, answers = [] }: {
  locale: YoLocale; correct: number; answered: number; total: number; assisted: boolean; passPercent: number;
  answers?: ReadonlyArray<{ correct: boolean; assisted: boolean }>;
}) {
  const required = Math.ceil(total * passPercent / 100);
  const c = {
    fr: { title: "Ta progression dans le défi", question: "Question", target: "Objectif", correct: "réussie", wrong: "à revoir", pending: "à venir", current: "en cours", helped: "Une aide a été utilisée. Tu pourras rejouer sans aide pour gagner le tampon." },
    en: { title: "Your challenge progress", question: "Question", target: "Goal", correct: "correct", wrong: "to review", pending: "up next", current: "in progress", helped: "You used help. You can replay without assistance to earn the stamp." },
    es: { title: "Tu progreso en el desafío", question: "Pregunta", target: "Objetivo", correct: "correcta", wrong: "por repasar", pending: "pendiente", current: "en curso", helped: "Has usado una ayuda. Puedes repetir sin ayuda para ganar el sello." },
  }[locale];
  const safeCorrect = Math.max(0, Math.min(total, Math.floor(correct)));
  const progress = Math.max(0, Math.min(total, answered));
  return <section className="yo-challenge-progress" data-yoppo-boss-battle data-boss-stones-lit={safeCorrect} aria-label={c.title}>
    <div className="yo-challenge-progress-labels">
      <span>{c.question} {Math.min(progress + 1, total)}<span className="yo-challenge-progress-total"> / {total}</span></span>
      <span><Target size={16} aria-hidden/>{c.target} {required}/{total}</span>
    </div>
    <ol className="yo-challenge-steps" aria-label={c.title}>
      {Array.from({ length: total }, (_, index) => {
        const answer = answers[index];
        const state = answer ? answer.correct ? "correct" : "review" : index < progress ? "answered" : index === progress ? "current" : "pending";
        return <li key={index} data-state={state} aria-current={state === "current" ? "step" : undefined}>
          <span className="sr-only">{c.question} {index + 1}: {answer ? answer.correct ? c.correct : c.wrong : state === "current" ? c.current : c.pending}</span>
          {answer ? answer.correct ? <Check size={16} aria-hidden/> : <X size={16} aria-hidden/> : <span aria-hidden>{index + 1}</span>}
        </li>;
      })}
    </ol>
    {assisted ? <p className="yo-challenge-assistance-note">{c.helped}</p> : null}
  </section>;
}
