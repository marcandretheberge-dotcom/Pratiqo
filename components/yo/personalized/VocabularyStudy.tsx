"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { LearningAudio } from "./LearningAudio";
import { primary } from "../italian/guided/copy";

type Phrase = { it: string; meaning: Record<YoLocale, string> };

/** A study cursor only. Completing these cards never awards learning evidence. */
export function VocabularyStudy({ phrases, locale, title, onComplete, completeLabel, storageKey }: {
  phrases: Phrase[]; locale: YoLocale; title: string; onComplete: () => void; completeLabel: string; storageKey: string;
}) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = Number(localStorage.getItem(storageKey));
        if (Number.isInteger(stored) && stored >= 0 && stored < phrases.length) setAt(stored);
      } catch { /* Study remains available when browser storage is unavailable. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, phrases.length]);
  const heading = useRef<HTMLParagraphElement>(null);
  const index = Math.min(at, Math.max(0, phrases.length - 1));
  const phrase = phrases[index];
  const copy = {
    fr: { expression: "Expression", next: "Expression suivante", previous: "Expression précédente", instruction: "Écoute, puis répète à ton rythme." },
    en: { expression: "Expression", next: "Next expression", previous: "Previous expression", instruction: "Listen, then repeat at your own pace." },
    es: { expression: "Expresión", next: "Siguiente expresión", previous: "Expresión anterior", instruction: "Escucha y repite a tu ritmo." },
  }[locale];
  function move(next: number) {
    stopLessonAudio();
    setAt(next);
    try { localStorage.setItem(storageKey, String(next)); } catch { /* No learning evidence is lost. */ }
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <section data-vocabulary-study className="yo-vocabulary-study">
    <h2 className="yo-study-title">{title}</h2>
    {phrase ? <>
      <p className="yo-study-instruction">{copy.instruction}</p>
      <div className="yo-expression-card">
        <p className="yo-expression-count">{copy.expression} {index + 1} / {phrases.length}</p>
        <p ref={heading} tabIndex={-1} lang="it" className="yo-expression-text">{phrase.it}</p>
        <p className="yo-expression-meaning">{phrase.meaning[locale]}</p>
        <div className="yo-study-audio"><LearningAudio key={phrase.it} text={phrase.it} locale={locale}/></div>
      </div>
      <div className="yo-study-navigation">
        <button type="button" className="yo-icon-button" disabled={index === 0} onClick={() => move(index - 1)} aria-label={copy.previous}><ArrowLeft size={20} aria-hidden/></button>
        <p aria-live="polite">{index + 1} / {phrases.length}</p>
        <button type="button" className={primary} onClick={() => { if (index + 1 < phrases.length) move(index + 1); else { stopLessonAudio(); onComplete(); } }}>{index + 1 < phrases.length ? copy.next : completeLabel}<ArrowRight size={18} aria-hidden/></button>
      </div>
    </> : <button type="button" className={primary} onClick={onComplete}>{completeLabel}</button>}
  </section>;
}
