"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { spanishRegionalPractice } from "@/lib/yo/spanishRegionalPractice";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

export function SpanishRegionalPractice({ locale }: { locale: YoLocale }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const item = spanishRegionalPractice[index];
  const answer = answers[item.id];
  const button = "min-h-11 rounded-lg border border-teal-200 px-4 py-3 text-sm font-semibold disabled:opacity-50";
  return <section className="mt-6 space-y-4 border-t border-teal-100 pt-5" data-no-deck-swipe>
    <h3 className="text-lg font-bold">{t(lstr("Un mot, plusieurs contextes", "One word, different contexts", "Una palabra, distintos contextos"), locale)}</h3>
    <p className="text-sm leading-relaxed">{t(lstr("Observe la situation avant de choisir le sens. Ces exemples écrits ne représentent pas tous les usages ni tous les accents d’une région.", "Read the situation before choosing the meaning. These written examples do not represent every usage or accent in a region.", "Observa la situación antes de elegir el sentido. Estos ejemplos escritos no representan todos los usos ni acentos de una región."), locale)}</p>
    <p className="text-xs font-semibold text-teal-800">{index + 1}/{spanishRegionalPractice.length} · {t(item.region, locale)}</p>
    <p lang="es" className="text-xl leading-relaxed">{item.scene}</p>
    <p>{t(lstr("Que signifie ici", "What does this mean here", "¿Qué significa aquí"), locale)} <strong lang="es">{item.term}</strong> ?</p>
    <div className="grid gap-2">{item.choices.map(choice => <button key={choice} type="button" lang="es" className={`${button} text-left ${answer === choice ? "bg-teal-50 ring-2 ring-teal-700" : "bg-white"}`} aria-pressed={answer === choice} disabled={Boolean(answer)} onClick={() => setAnswers(values => ({ ...values, [item.id]: choice }))}>{choice}</button>)}</div>
    {answer ? <div role="status" className="space-y-3 border-l-4 border-teal-600 pl-4">
      <p className="font-semibold">{answer === item.answer ? t(lstr("Oui, dans cette situation.", "Yes, in this situation.", "Sí, en esta situación."), locale) : t(lstr("Regarde les indices de la scène.", "Look at the clues in the scene.", "Fíjate en las pistas de la escena."), locale)}</p>
      <p className="text-sm leading-relaxed">{t(item.explanation, locale)}</p>
      <a href={item.source} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline">RAE / ASALE</a>
      <button type="button" className={`${button} flex items-center gap-2`} onClick={() => setAnswers(values => { const next = { ...values }; delete next[item.id]; return next; })}><RotateCcw size={16} aria-hidden />{t(lstr("Réessayer", "Try again", "Reintentar"), locale)}</button>
    </div> : null}
    <nav className="flex justify-between gap-3" aria-label={t(lstr("Exemples régionaux", "Regional examples", "Ejemplos regionales"), locale)}>
      <button type="button" className={button} disabled={index === 0} onClick={() => setIndex(i => i - 1)} aria-label={t(lstr("Exemple précédent", "Previous example", "Ejemplo anterior"), locale)}><ArrowLeft size={18} aria-hidden /></button>
      <button type="button" className={button} disabled={index === spanishRegionalPractice.length - 1} onClick={() => setIndex(i => i + 1)} aria-label={t(lstr("Exemple suivant", "Next example", "Ejemplo siguiente"), locale)}><ArrowRight size={18} aria-hidden /></button>
    </nav>
  </section>;
}
