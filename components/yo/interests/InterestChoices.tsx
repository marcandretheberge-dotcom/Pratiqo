"use client";
import { Check, Music2, Palette, Landmark, Trophy, Utensils, Trees } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { interestIds, interestLabels, toggleInterest, type InterestId } from "@/lib/yo/interests/preferences";
const icons = { music: Music2, art: Palette, history: Landmark, sport: Trophy, food: Utensils, nature: Trees };
export function InterestChoices({ locale, value, onChange }: { locale: YoLocale; value: InterestId[]; onChange: (next: InterestId[]) => void }) {
  const copy = {
    fr: { legend: "Tes centres d’intérêt", hint: "Jusqu’à trois choix pour tes prochaines escales. Tu peux les changer plus tard.", any: "Surprends-moi" },
    en: { legend: "Your interests", hint: "Choose up to three for your next stops. You can change them later.", any: "Surprise me" },
    es: { legend: "Tus intereses", hint: "Elige hasta tres para tus próximas paradas. Puedes cambiarlos después.", any: "Sorpréndeme" },
  }[locale];
  return <fieldset className="min-w-0 max-w-full" data-interest-choices>
    <legend className="sr-only">{copy.legend}</legend>
    <p className="mb-4 text-sm leading-6 text-stone-600">{copy.hint}</p>
    <div className="grid grid-cols-2 gap-3">{interestIds.map(id => {
      const selected = value.includes(id), Icon = icons[id];
      return <button key={id} type="button" aria-pressed={selected} disabled={!selected && value.length >= 3}
        className={`flex min-h-16 min-w-0 items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left font-semibold outline-offset-4 disabled:opacity-45 ${selected ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-white text-stone-800"}`}
        onClick={() => onChange(toggleInterest(value, id))}>
        <Icon size={20} aria-hidden className="shrink-0"/><span className="min-w-0 flex-1 break-words">{interestLabels[id][locale]}</span>{selected && <Check size={17} aria-hidden className="shrink-0"/>}
      </button>;
    })}</div>
    <button type="button" aria-pressed={!value.length} className="mt-3 min-h-11 px-2 text-sm text-emerald-800 underline underline-offset-4" onClick={() => onChange([])}>{copy.any}</button>
  </fieldset>;
}
