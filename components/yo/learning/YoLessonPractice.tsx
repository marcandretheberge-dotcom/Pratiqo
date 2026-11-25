"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { SpeechLanguage, SpeechScenarioId } from "@/lib/yo/speech/catalog";
import { L } from "@/lib/yo/shared/types";
import { MissionFilm } from "../travel/MissionFilm";
import { YoSpeechPractice } from "../speech/YoSpeechPractice";

/** Optional enrichment for existing preview lessons with no assessed completion ledger. */
export function YoLessonPractice({ id, title, detail, language, locale, scenarioId }: {
  id: string; title: string; detail?: string; language: SpeechLanguage; locale: YoLocale; scenarioId: SpeechScenarioId;
}) {
  const [filmOpen, setFilmOpen] = useState(false);
  return <section className="mt-6" data-no-deck-swipe data-no-deck-tap>
    <button type="button" onClick={() => setFilmOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      <Play size={17} aria-hidden/>{L("Préparer la mission avec Yoppo", "Prepare the mission with Yoppo", "Preparar la misión con Yoppo")[locale]}
    </button>
    {!filmOpen && <YoSpeechPractice language={language} locale={locale} scenarioId={scenarioId}/>}
    {filmOpen && <MissionFilm scene={{ id: `${language}:${id}:preview`, kind: "mission-start", title, detail }} locale={locale} onContinue={() => setFilmOpen(false)}/>}
  </section>;
}
