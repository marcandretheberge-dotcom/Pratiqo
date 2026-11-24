"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { DAILY_EXERCISE_TARGET, italianTodayNavigation, learningDayKey } from "@/lib/yo/daily/today";
import { fetchItalianToday } from "@/lib/yo/srs/srsClientSync";
import type { YoLocale } from "@/lib/yo/types";

type Props = {
  catalog: CourseCatalog;
  progress: CourseProgress;
  locale: YoLocale;
  startUnitId: string;
  onConfigure: () => void;
};

export function ItalianToday({ catalog, progress, locale, startUnitId, onConfigure }: Props) {
  const [clock, setClock] = useState(0);
  const [summary, setSummary] = useState<{ exercises: number; streak: number } | null>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setClock(Date.now());
      void fetchItalianToday(request.signal).then(value => {
        if (!request.signal.aborted) setSummary(value);
      });
    };
    const initialRefresh = window.requestAnimationFrame(refresh);
    // A back-navigation from an exercise must not show stale daily totals.
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.cancelAnimationFrame(initialRefresh);
      controller?.abort();
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const words = (...labels: [string, string, string]) => labels[{fr: 0, en: 1, es: 2}[locale]];
  const nav = italianTodayNavigation(catalog, progress, locale, startUnitId, clock);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = clock ? learningDayKey(clock, localZone) : null;
  const exercises = summary?.exercises ?? (localDate
    ? Object.values(progress.activities).filter(item =>
      item.lastAt <= clock && learningDayKey(item.lastAt, localZone) === localDate
    ).length : 0);

  return (
    <main lang={locale} className="min-h-[70vh] bg-stone-50 px-5 py-12 text-stone-950">
      <section aria-labelledby="yo-today-title" className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 sm:p-9">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-800">YoPratiqo · {words("Italien", "Italian", "Italiano")}</p>
        <h1 id="yo-today-title" className="mt-2 text-4xl font-semibold tracking-tight">{words("Aujourd’hui", "Today", "Hoy")}</h1>
        <p className="mt-3 text-stone-600">{words("Reprends ton parcours, un exercice à la fois.", "Pick up your journey, one exercise at a time.", "Retoma tu recorrido, un ejercicio a la vez.")}</p>
        <Link className="mt-7 block rounded-2xl bg-teal-900 p-4 text-center font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-900" href={nav.continueHref}>
          {words("Continuer", "Continue", "Continuar")}
        </Link>
        <div className="mt-4 rounded-2xl border border-stone-200 p-4">
          {nav.reviewHref ? <Link className="font-medium text-teal-900 underline underline-offset-4" href={nav.reviewHref}>
            {words("À réviser", "Ready to review", "Para repasar")} · {nav.due}
          </Link> : <p>{words("Aucune révision due pour l’instant", "No reviews due yet", "No hay repasos pendientes")}</p>}
          <p className="mt-2 text-sm text-stone-600">
            {words("Objectif du jour", "Daily goal", "Meta diaria")} · {exercises}/{DAILY_EXERCISE_TARGET} {words("exercices", "exercises", "ejercicios")}
            {!summary ? ` · ${words("sur cet appareil", "on this device", "en este dispositivo")}` : ""}
          </p>
          {summary ? <p className="mt-2 text-sm text-stone-600">
            {words("Série", "Streak", "Racha")} · {summary.streak} {words(summary.streak > 1 ? "jours" : "jour", summary.streak > 1 ? "days" : "day", summary.streak > 1 ? "días" : "día")}
          </p> : null}
        </div>
        <button type="button" onClick={onConfigure} className="mt-5 text-sm text-stone-600 underline underline-offset-4">
          {words("Ajuster mon parcours", "Adjust my journey", "Ajustar mi recorrido")}
        </button>
      </section>
    </main>
  );
}
