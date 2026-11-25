"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { lessonAudioIsBusy, subscribeLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";
import { secondary } from "../italian/guided/copy";

export const AUTO_NEXT_KEY = "yo.practice.auto-next.v1";
export const ANSWER_PAUSE_MS = 1200;
const changeEvent = "yo-practice-pace-change";
let memoryPreference = true;
let inputBlockedUntil = 0;
function snapshot() {
  try { return localStorage.getItem(AUTO_NEXT_KEY) !== "off"; } catch { return memoryPreference; }
}
function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(changeEvent, listener); window.removeEventListener("storage", listener); };
}
export function setAutomaticNext(enabled: boolean) {
  memoryPreference = enabled;
  try { localStorage.setItem(AUTO_NEXT_KEY, enabled ? "on" : "off"); } catch { /* Session preference still works. */ }
  window.dispatchEvent(new Event(changeEvent));
}
/** Discard the trailing tap of a double-tap, including after a question transition. */
export function acceptPracticeTap(detail = 1) { return detail < 2 && Date.now() >= inputBlockedUntil; }

/** Only a new, explicitly accepted correct answer arms a timer. Restoring state is silent/manual.
 * Every interruption restarts the full pause. No timers survive step changes or unmounts.
 * The callback is idempotent, so simultaneous keyboard/timer events cannot advance twice. */
export function usePracticeAdvance({ token, correct, paused = false, onNext }: {
  token: string; correct: boolean; paused?: boolean; onNext: () => void;
}) {
  const automatic = useSyncExternalStore(subscribe, snapshot, () => true);
  const [armed, setArmed] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const latest = useRef({ token, correct, paused, onNext });
  const consumed = useRef<string | null>(null);
  useLayoutEffect(() => { latest.current = { token, correct, paused, onNext }; }, [token, correct, paused, onNext]);
  useEffect(() => {
    const audio = () => setBusy(lessonAudioIsBusy());
    const visibility = () => setHidden(document.hidden);
    audio(); visibility();
    const unsubscribe = subscribeLessonAudio(audio);
    document.addEventListener("visibilitychange", visibility);
    return () => { unsubscribe(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const next = useCallback(() => {
    const now = latest.current;
    if (now.paused || consumed.current === now.token) return;
    consumed.current = now.token;
    inputBlockedUntil = Date.now() + 300;
    setArmed(null);
    now.onNext();
  }, []);
  const pending = automatic && armed === token && correct && !held;
  useEffect(() => {
    if (!pending || paused || busy || hidden) return;
    const scheduledToken = token;
    const timer = setTimeout(() => {
      // Recheck synchronous audio/visibility state, not just the last React render.
      if (latest.current.token !== scheduledToken || latest.current.paused || !latest.current.correct ||
          document.hidden || lessonAudioIsBusy()) return;
      next();
    }, ANSWER_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [pending, token, paused, busy, hidden, next]);
  return {
    automatic, pending, waiting: pending && (paused || busy || hidden),
    arm: () => { consumed.current = null; setHeld(false); setArmed(token); },
    hold: () => { setHeld(true); setArmed(null); },
    next,
  };
}
const copy = {
  fr: { setting: "Question suivante automatique", on: "Activée", off: "Désactivée", next: "La suite arrive…", wait: "On termine l’écoute…", pause: "Rester ici", notice: "Touche une réponse pour la vérifier. Si elle est juste, on passe à la suite. Tu peux désactiver ce rythme dans les outils." },
  en: { setting: "Automatic next question", on: "On", off: "Off", next: "Next question coming…", wait: "Finishing the audio…", pause: "Stay here", notice: "Tap an answer to check it. Correct answers move on automatically. You can turn this off in your tools." },
  es: { setting: "Siguiente pregunta automática", on: "Activada", off: "Desactivada", next: "Vamos a la siguiente…", wait: "Terminamos de escuchar…", pause: "Quedarme aquí", notice: "Toca una respuesta para comprobarla. Si aciertas, pasamos a la siguiente. Puedes desactivarlo en las herramientas." },
};
export function PracticeAdvanceSettings({ locale }: { locale: YoLocale }) {
  const automatic = useSyncExternalStore(subscribe, snapshot, () => true), c = copy[locale];
  return <button type="button" role="switch" aria-checked={automatic} aria-label={c.setting}
    className={`${secondary} w-full justify-between border border-stone-200`}
    onClick={() => setAutomaticNext(!automatic)}><span>{c.setting}</span><span>{automatic ? c.on : c.off}</span></button>;
}
export function PracticeAdvanceNotice({ locale }: { locale: YoLocale }) {
  return <p className="my-4 text-sm leading-6 text-stone-600" data-tap-guide>{copy[locale].notice}</p>;
}
export function PracticeAdvanceStatus({ flow, locale }: { flow: ReturnType<typeof usePracticeAdvance>; locale: YoLocale }) {
  if (!flow.pending) return null;
  const c = copy[locale];
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-900" data-auto-next>
    <span>{flow.waiting ? c.wait : c.next}</span><button type="button" className={`${secondary} underline`} onClick={flow.hold}>{c.pause}</button>
  </div>;
}
