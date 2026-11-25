"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { RecallChoice, RecallWord } from "@/lib/yo/learning/vocabularyPractice";
import { useAnswerFeedback, YoppoAnswerReaction } from "../feedback/LearningFeedback";
import { primary, secondary } from "../italian/guided/copy";
import { acceptPracticeTap, PracticeAdvanceStatus, usePracticeAdvance } from "./PracticeAdvance";
export type RecallDraft = { selected: string | null; checked: boolean; correct: boolean; heard: boolean; transcript: boolean };
export const freshRecall = (): RecallDraft => ({ selected: null, checked: false, correct: false, heard: false, transcript: false });
function AudioSlot({ render, onListen }: { render: (onListen: () => void) => ReactNode; onListen: () => void }) { return <>{render(onListen)}</>; }
/** Listening-to-meaning/number recall, not labelled portraits masquerading as image recognition. */
export function RecallQuestion({ token, word, choices, locale, targetLanguage, value, onChange, onNext, audio, paused = false }: {
  token: string; word: RecallWord; choices: RecallChoice[]; locale: YoLocale; targetLanguage: string;
  value: RecallDraft; onChange: (next: RecallDraft) => void; onNext: () => void;
  audio: (onListen: () => void) => ReactNode; paused?: boolean;
}) {
  const current = useRef(value), feedback = useAnswerFeedback(), heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { current.current = value; }, [value]);
  const flow = usePracticeAdvance({ token, correct: value.checked && value.correct, paused, onNext });
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];
  function edit(patch: Partial<RecallDraft>) { const d = { ...current.current, ...patch }; current.current = d; onChange(d); }
  function choose(id: string, detail: number) {
    const d = current.current;
    if (!acceptPracticeTap(detail) || (d.checked && d.correct) || (!d.heard && !d.transcript)) return;
    const correct = id === word.id;
    edit({ selected: id, checked: true, correct });
    if (correct) { feedback.correct(token); flow.arm(); }
  }
  return <section data-vocabulary-recall={word.id}>
    <h2 ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold leading-relaxed outline-none">{word.number ? say("Quel âge entends-tu ?", "Which age do you hear?", "¿Qué edad escuchas?") : say("Écoute. Quel est le sens ?", "Listen. What does it mean?", "Escucha. ¿Qué significa?")}</h2>
    <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
      <AudioSlot render={audio} onListen={() => edit({ heard: true })}/>
      {value.transcript && <p lang={targetLanguage} className="mt-3 text-xl font-semibold">{word.text}{word.reading && <span className="mt-1 block text-sm font-normal">{word.reading}</span>}</p>}
      {!value.transcript && !value.correct && <button type="button" className={`${secondary} mt-2`} onClick={() => edit({ transcript: true })}>{say("Lire plutôt qu’écouter", "Read instead of listen", "Leer en vez de escuchar")}</button>}
    </div>
    <div role="group" aria-label={say("Réponses", "Answers", "Respuestas")} className="grid gap-3">
      {choices.map(choice => {
        const selected = value.selected === choice.id;
        return <button type="button" key={choice.id} disabled={value.correct || (!value.heard && !value.transcript)}
          aria-pressed={selected} data-answer-id={choice.id}
          className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 ${selected && value.checked ? value.correct ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-red-700 bg-red-50 text-red-950" : "border-stone-200 bg-white text-stone-800"}`}
          onClick={e => choose(choice.id, e.detail)}><span>{choice.label[locale]}</span>{selected && value.checked && (value.correct ? <Check size={20} aria-hidden/> : <X size={20} aria-hidden/>)}</button>;
      })}
    </div>
    <div role="status" aria-live="polite" aria-atomic="true" className="mt-4">
      {value.checked && <p className={`font-bold ${value.correct ? "text-emerald-900" : "text-red-800"}`}>{value.correct ? say("Bien joué !", "Well done!", "¡Bien hecho!") : say("Pas tout à fait. Essaie une autre réponse.", "Not quite. Try another answer.", "No del todo. Prueba otra respuesta.")}</p>}
    </div>
    <YoppoAnswerReaction revision={value.correct ? feedback.reaction : 0} locale={locale}/>
    <PracticeAdvanceStatus flow={flow} locale={locale}/>
    {value.correct && !flow.pending && <button type="button" className={`${primary} mt-5 w-full`} onClick={flow.next}>{say("Continuer", "Continue", "Continuar")}</button>}
  </section>;
}
