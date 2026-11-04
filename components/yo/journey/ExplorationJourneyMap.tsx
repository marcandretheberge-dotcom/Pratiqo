"use client";

import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { Map, ArrowRight } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { useRef } from "react";

const copy = {
  fr: { map: "Mon parcours avec Yoppo", here: "On est ici", visited: "Explorée", next: "À explorer", note: "Les étapes explorées sont des repères, pas des compétences validées.", storage: "Reprise non enregistrée sur cet appareil." },
  en: { map: "My journey with Yoppo", here: "We are here", visited: "Explored", next: "To explore", note: "Explored steps are bookmarks, not verified skills.", storage: "Your place cannot be saved on this device." },
  es: { map: "Mi recorrido con Yoppo", here: "Estamos aquí", visited: "Explorada", next: "Por explorar", note: "Las etapas exploradas son marcadores, no habilidades verificadas.", storage: "No se puede guardar tu lugar en este dispositivo." },
};

export function ExplorationJourneyMap({ locale, screens, index, visited, ready, stored, move }: {
  locale: YoLocale; screens: { id: string; title: string }[]; index: number; visited: string[];
  ready: boolean; stored: boolean; move: (index: number) => void;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  const c = copy[locale];
  return <details ref={panel} className="relative shrink-0 normal-case tracking-normal">
    <summary aria-label={c.map} title={c.map} className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-emerald-900">
      <CompanionAvatar visualId="travel" state="map" locale={locale} size="xs" compact />
      <Map size={18} aria-hidden />
    </summary>
    <section aria-label={c.map} className="fixed inset-x-4 top-32 z-50 mt-2 max-h-[60dvh] overflow-y-auto rounded-lg border border-emerald-200 bg-white p-4 text-gray-900 shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:w-80">
      <h2 className="text-base font-bold">{c.map}</h2>
      <ol className="mt-3 space-y-1">
        {screens.map((screen, i) => <li key={screen.id} aria-current={i === index ? "step" : undefined}>
          <button type="button" disabled={!ready} onClick={() => { move(i); if (panel.current) panel.current.open = false; }}
            className={`flex min-h-11 w-full items-center gap-2 rounded-lg p-2 text-left text-sm ${i === index ? "bg-emerald-50 font-bold text-emerald-900" : "hover:bg-gray-50"}`}>
            <span className="grid h-12 w-12 shrink-0 place-items-center" data-yoppo-exploration={i === index ? screen.id : undefined}>{i === index ? <CompanionAvatar visualId="travel" state="map" locale={locale} size="xs" compact /> : i + 1}</span>
            <span className="min-w-0 flex-1 break-words">{screen.title}<span className="block text-xs font-normal text-gray-600">{i === index ? c.here : visited.includes(screen.id) ? c.visited : c.next}</span></span>
            {i === index ? <ArrowRight size={16} aria-hidden /> : null}
          </button>
        </li>)}
      </ol>
      <p className="mt-3 text-xs font-normal leading-5 text-gray-600">{c.note}</p>
      {!stored ? <p role="status" className="mt-2 text-xs text-amber-900">{c.storage}</p> : null}
    </section>
  </details>;
}
