"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { DAILY_EXERCISE_TARGET, italianTodayNavigation, learningDayKey } from "@/lib/yo/daily/today";
import type { DailyKind, DailySummary } from "@/lib/yo/daily/contract";
import { answerItalianDaily, fetchItalianToday, onItalianTodayAccountChange, saveItalianDailyGoal } from "@/lib/yo/srs/srsClientSync";
import type { YoLocale } from "@/lib/yo/types";

type Props = {
  catalog: CourseCatalog;
  progress: CourseProgress;
  locale: YoLocale;
  startUnitId: string;
  onConfigure: () => void;
};
type Words = (fr: string, en: string, es: string) => string;

export function ItalianToday({ catalog, progress, locale, startUnitId, onConfigure }: Props) {
  const [clock, setClock] = useState(0);
  const [account, setAccount] = useState<{ summary: DailySummary; owner: string } | null>(null);
  const summary = account?.summary;
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setClock(Date.now());
      void fetchItalianToday(request.signal).then(value => {
        if (!request.signal.aborted) setAccount(value);
      });
    };
    refreshRef.current = refresh;
    const initial = window.requestAnimationFrame(refresh);
    let accountFrame = 0;
    const unsubscribe = onItalianTodayAccountChange(() => {
      // Leave the Supabase auth callback before reading the new session.
      controller?.abort();
      setAccount(null);
      window.cancelAnimationFrame(accountFrame);
      accountFrame = window.requestAnimationFrame(refresh);
    });
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.cancelAnimationFrame(initial);
      window.cancelAnimationFrame(accountFrame);
      window.clearInterval(heartbeat);
      unsubscribe();
      controller?.abort();
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const words: Words = (...labels) => labels[{ fr: 0, en: 1, es: 2 }[locale]];
  const nav = italianTodayNavigation(catalog, progress, locale, startUnitId, clock);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = clock ? learningDayKey(clock, localZone) : null;
  const localExercises = localDate ? Object.values(progress.activities).filter(item =>
    item.lastAt <= clock && learningDayKey(item.lastAt, localZone) === localDate
  ).length : 0;
  const refresh = () => refreshRef.current();

  return (
    <main lang={locale} className="min-h-[70vh] bg-stone-50 px-5 py-12 text-stone-950">
      <section aria-labelledby="yo-today-title" className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 sm:p-9">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-800">YoPratiqo · {words("Italien", "Italian", "Italiano")}</p>
        <h1 id="yo-today-title" className="mt-2 text-4xl font-semibold tracking-tight">{words("Aujourd’hui", "Today", "Hoy")}</h1>
        <p className="mt-3 text-stone-600">{words("Un peu d’italien, à ton rythme.", "A little Italian, at your pace.", "Un poco de italiano, a tu ritmo.")}</p>
        <Link className="mt-7 block rounded-2xl bg-teal-900 p-4 text-center font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-900" href={nav.continueHref}>
          {words("Continuer", "Continue", "Continuar")}
        </Link>
        <div className="mt-4 rounded-2xl border border-stone-200 p-4">
          {nav.reviewHref ? <Link className="font-medium text-teal-900 underline underline-offset-4" href={nav.reviewHref}>
            {words("À réviser", "Ready to review", "Para repasar")} · {nav.due}
          </Link> : <p>{words("Aucune révision due pour l’instant", "No reviews due yet", "No hay repasos pendientes")}</p>}
          <p className="mt-2 text-sm text-stone-700">
            {summary ? <>
              {summary.exercises} {words("exercices distincts", "distinct exercises", "ejercicios distintos")} · {summary.xpToday} XP
            </> : <>
              {localExercises}/{DAILY_EXERCISE_TARGET} {words("exercices suggérés · sur cet appareil", "suggested exercises · on this device", "ejercicios sugeridos · en este dispositivo")}
            </>}
          </p>
        </div>
        {summary && account ? <>
          <DailyCards key={`${account.owner}:${summary.today}`} owner={account.owner} summary={summary} locale={locale} words={words} onRefresh={refresh}/>
          <DailyGoal key={account.owner} owner={account.owner} summary={summary} words={words} onRefresh={refresh}/>
          <details className="mt-3 rounded-2xl border border-stone-200 p-4">
            <summary className="cursor-pointer font-medium">
              {words("Ma collection", "My collection", "Mi colección")} · {summary.earned.length}/{summary.catalogueSize}
            </summary>
            {summary.earned.length ? <ul className="mt-2 space-y-1 text-sm">
              {summary.earned.map(item => <li key={item.id}>{item.title[locale]}</li>)}
            </ul> : <p className="mt-2 text-sm text-stone-600">{words("Réussis une mission pour gagner ton premier souvenir.", "Complete a mission to earn your first souvenir.", "Completa una misión para ganar tu primer recuerdo.")}</p>}
          </details>
        </> : <p className="mt-4 text-sm text-stone-600">
          {words("Les défis et la collection sont disponibles avec un compte connecté lorsque la synchronisation est activée.", "Challenges and your collection are available with a signed-in account when sync is enabled.", "Los retos y la colección están disponibles con una sesión iniciada cuando se activa la sincronización.")}
        </p>}
        <button type="button" onClick={onConfigure} className="mt-5 text-sm text-stone-600 underline underline-offset-4">
          {words("Ajuster mon parcours", "Adjust my journey", "Ajustar mi recorrido")}
        </button>
      </section>
    </main>
  );
}

function useSubmitSignal() {
  const pendingRef = useRef<AbortController | null>(null);
  useEffect(() => () => { pendingRef.current?.abort(); }, []);
  return pendingRef;
}

function DailyCards({ owner, summary, locale, words, onRefresh }: { owner: string; summary: DailySummary; locale: YoLocale; words: Words; onRefresh: () => void }) {
  return <div className="mt-4 space-y-3">
    <ChallengeCard kind="mission" owner={owner} summary={summary} locale={locale} words={words} onRefresh={onRefresh}/>
    <ChallengeCard kind="trivia" owner={owner} summary={summary} locale={locale} words={words} onRefresh={onRefresh}/>
  </div>;
}

function ChallengeCard({ kind, owner, summary, locale, words, onRefresh }: { owner: string; kind: DailyKind; summary: DailySummary; locale: YoLocale; words: Words; onRefresh: () => void }) {
  const challenge = summary.daily[kind];
  const pendingRef = useSubmitSignal();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"wrong" | "error" | "expired" | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const completed = challenge.completed || solution !== null;
  const label = kind === "mission"
    ? words("Mission du jour", "Mission of the day", "Misión del día")
    : words("Question du jour", "Trivia of the day", "Pregunta del día");

  async function answer(choice: number) {
    if (pendingRef.current || completed) return;
    const request = new AbortController();
    pendingRef.current = request;
    setFeedback(null);
    setBusy(true);
    const { value, status } = await answerItalianDaily({ day: summary.today, kind, itemId: challenge.id, choice }, request.signal, owner);
    if (request.signal.aborted) return;
    pendingRef.current = null;
    setBusy(false);
    if (value?.correct) {
      setSolution(value.explanation[locale]);
      onRefresh();
    } else if (value) setFeedback("wrong");
    else if (status === 409) { setFeedback("expired"); onRefresh(); }
    else setFeedback("error");
  }
  return <details className="rounded-2xl border border-stone-200 p-4">
    <summary className="cursor-pointer font-medium">{label}{completed && ` · ${words("Réussi", "Completed", "Completado")}`}</summary>
    {challenge.title && <p className="mt-2 text-sm text-teal-900">{challenge.title[locale]}</p>}
    {kind === "mission" && <p className="mt-2 text-sm text-stone-600">{words("Quelle phrase italienne correspond à cette traduction ?", "Which Italian phrase matches this translation?", "¿Qué frase italiana corresponde a esta traducción?")}</p>}
    <p className="mt-2 font-medium">{challenge.prompt[locale]}</p>
    {!completed && <ul className="mt-2 space-y-2" aria-busy={busy}>{challenge.choices.map((choice, index) =>
      <li key={index}><button type="button" disabled={busy} onClick={() => void answer(index)} lang={typeof choice === "string" ? "it" : undefined}
        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-left enabled:hover:bg-teal-50 disabled:opacity-60">
        {typeof choice === "string" ? choice : choice[locale]}
      </button></li>)}</ul>}
    <p className="mt-2 text-sm text-stone-700" role="status">
      {completed
        ? (kind === "mission" ? words("Bonne réponse. Souvenir ajouté à ta collection.", "Correct. This souvenir is in your collection.", "Correcto. El recuerdo está en tu colección.") : solution ?? challenge.explanation?.[locale])
        : feedback === "wrong" ? words("Pas tout à fait. Réessaie !", "Not quite. Try again!", "Casi. ¡Inténtalo de nuevo!")
        : feedback === "expired" ? words("Le défi a changé. Actualise et réessaie.", "The challenge changed. Refresh and try again.", "El reto cambió. Actualiza e inténtalo de nuevo.")
        : feedback === "error" ? words("La réponse n’a pas été confirmée. Réessaie.", "Your answer wasn’t confirmed. Try again.", "No se confirmó tu respuesta. Inténtalo de nuevo.") : ""}
    </p>
  </details>;
}

function DailyGoal({ owner, summary, words, onRefresh }: { owner: string; summary: DailySummary; words: Words; onRefresh: () => void }) {
  const id = useId();
  const pendingRef = useSubmitSignal();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  async function save(goal: number | null) {
    if (pendingRef.current) return;
    const request = new AbortController();
    pendingRef.current = request;
    setMessage(null);
    setBusy(true);
    const result = await saveItalianDailyGoal(goal, request.signal, owner);
    if (request.signal.aborted) return;
    pendingRef.current = null;
    setBusy(false);
    if (result.value) { setMessage("saved"); onRefresh(); }
    else setMessage("error");
  }
  return <details className="mt-3 rounded-2xl border border-stone-200 p-4">
    <summary className="cursor-pointer font-medium">
      {words("Objectif (facultatif)", "Goal (optional)", "Meta (opcional)")}
      {summary.goal !== null && ` · ${summary.exercises}/${summary.goal}`}
    </summary>
    <form className="mt-2 space-y-2 text-sm" onSubmit={event => {
      event.preventDefault();
      const draft = new FormData(event.currentTarget).get("target");
      if (typeof draft === "string" && draft !== "") void save(Number(draft));
    }}>
      <label htmlFor={id}>{words("Exercices distincts par jour", "Distinct exercises per day", "Ejercicios distintos por día")}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input key={summary.goal ?? "none"} id={id} name="target" type="number" required min={1} max={50} defaultValue={summary.goal ?? ""} className="w-20 rounded border border-stone-300 p-2"/>
        <button type="submit" disabled={busy} className="rounded border border-stone-300 px-3 py-2">{words("Enregistrer", "Save", "Guardar")}</button>
        {summary.goal !== null && <button type="button" disabled={busy} onClick={() => void save(null)} className="px-3 py-2 underline">{words("Retirer", "Remove", "Quitar")}</button>}
      </div>
      {message && <p role="status">{message === "saved"
        ? words("Objectif mis à jour.", "Goal updated.", "Meta actualizada.")
        : words("Objectif non enregistré. Réessaie.", "Goal not saved. Try again.", "No se guardó la meta. Inténtalo de nuevo.")}</p>}
    </form>
  </details>;
}
