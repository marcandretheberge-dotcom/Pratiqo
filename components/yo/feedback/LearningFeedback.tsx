"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { EFFECTS_KEY } from "@/lib/yo/adventureSound";
import { FeedbackPlayer, vibrateSuccess } from "@/lib/yo/feedback/feedbackPlayer";
import type { FeedbackCue } from "@/lib/yo/feedback/woodSound";
import type { YoLocale } from "@/lib/yo/types";
import { secondary } from "../italian/guided/copy";
export const HAPTICS_KEY = "yopratiqo.haptics.enabled";
type Options = { sound: boolean; haptics: boolean };
type Feedback = Options & {
  present: boolean; supported: boolean; stored: boolean;
  emit: (id: string, kind?: FeedbackCue) => void;
  set: (patch: Partial<Options>) => void; sample: () => void;
};
const Context = createContext<Feedback>({ present: false, sound: false, haptics: false, supported: false, stored: true, emit: () => {}, set: () => {}, sample: () => {} });
export const useLearningFeedback = () => useContext(Context);

/** Cosmetic feedback only. Never writes learning results, credits, access or personal information. */
export function LearningFeedbackProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<Options>({ sound: true, haptics: false });
  const [supported, setSupported] = useState(false), [stored, setStored] = useState(true);
  const latest = useRef(options), engine = useRef<FeedbackPlayer | null>(null), seen = useRef(new Set<string>());
  useEffect(() => {
    const player = new FeedbackPlayer(); engine.current = player;
    const restore = () => {
      let next = { sound: true, haptics: false };
      try { next = { sound: localStorage.getItem(EFFECTS_KEY) !== "true", haptics: localStorage.getItem(HAPTICS_KEY) === "true" }; setStored(true); }
      catch { setStored(false); }
      latest.current = next; setOptions(next);
      if (!next.sound) player.cancel();
      setSupported(typeof navigator.vibrate === "function");
    };
    const frame = requestAnimationFrame(restore);
    const storage = (event: StorageEvent) => { if (!event.key || event.key === EFFECTS_KEY || event.key === HAPTICS_KEY) restore(); };
    window.addEventListener("storage", storage);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("storage", storage); player.dispose(); engine.current = null; };
  }, []);
  const set = useCallback((patch: Partial<Options>) => {
    const next = { ...latest.current, ...patch }; latest.current = next; setOptions(next);
    if (!next.sound) engine.current?.cancel();
    if (!next.haptics && typeof navigator.vibrate === "function") { try { navigator.vibrate(0); } catch { /* Unsupported. */ } }
    try {
      localStorage.setItem(EFFECTS_KEY, String(!next.sound));
      localStorage.setItem(HAPTICS_KEY, String(next.haptics)); setStored(true);
    } catch { setStored(false); }
  }, []);
  const emit = useCallback((id: string, kind: FeedbackCue = "correct") => {
    if (seen.current.has(id)) return;
    seen.current.add(id);
    if (seen.current.size > 256) seen.current.delete(seen.current.values().next().value!);
    if (latest.current.sound) void engine.current?.play(kind);
    if (latest.current.haptics) vibrateSuccess(kind);
  }, []);
  const sample = useCallback(() => { if (latest.current.sound) void engine.current?.play(); }, []);
  return <Context.Provider value={{ ...options, present: true, supported, stored, set, emit, sample }}>{children}</Context.Provider>;
}

/** An event is accepted only once per checked item/turn; rendering/restoring drafts is silent. */
export function useAnswerFeedback() {
  const { emit } = useLearningFeedback(), instance = useId(), handled = useRef(new Set<string>());
  const [reaction, setReaction] = useState(0);
  function correct(item: string) {
    if (handled.current.has(item)) return;
    handled.current.add(item); setReaction(n => n + 1); emit(`${instance}:${item}`);
  }
  return { correct, reaction, clear: () => setReaction(0) };
}
export function YoppoAnswerReaction({ revision, locale }: { revision: number; locale: YoLocale }) {
  if (!revision) return null;
  return <div key={revision} aria-hidden="true" className="mt-3 flex items-center gap-2" data-yoppo-success={revision}>
    <span className="yo-success-entrance"><CompanionAvatar visualId="travel" state="celebrating" locale={locale} size="xs" compact /></span>
    <span className="text-lg font-bold text-emerald-800">✓</span>
    <style>{`@keyframes yo-success-appear{from{opacity:.25;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:no-preference){.yo-success-entrance{animation:yo-success-appear .28s ease-out}}`}</style>
  </div>;
}
export function FeedbackSettings({ locale, compact = false }: { locale: YoLocale; compact?: boolean }) {
  const feedback = useLearningFeedback();
  if (!feedback.present) return null;
  const c = {
    fr: { title: "Sons et vibrations", sound: "Sons de réussite", haptic: "Vibrations", sample: "Écouter le son bois doux", no: "Vibrations non disponibles dans ce navigateur.", voice: "Les prononciations du cours restent indépendantes.", session: "Réglages conservés seulement pour cette session.", on: "Activés", off: "Désactivés" },
    en: { title: "Sounds and vibrations", sound: "Success sounds", haptic: "Vibrations", sample: "Preview the soft wood sound", no: "Vibrations are unavailable in this browser.", voice: "Course pronunciation audio has separate controls.", session: "Settings last for this session only.", on: "On", off: "Off" },
    es: { title: "Sonidos y vibraciones", sound: "Sonidos de acierto", haptic: "Vibraciones", sample: "Escuchar el sonido de madera suave", no: "Las vibraciones no están disponibles en este navegador.", voice: "El audio del curso se controla por separado.", session: "Los ajustes duran solo esta sesión.", on: "Activados", off: "Desactivados" },
  }[locale];
  const controls = <div className="space-y-2" data-feedback-settings>
    <button type="button" role="switch" aria-label={c.sound} aria-checked={feedback.sound} className={`${secondary} w-full justify-between border border-stone-200`} onClick={() => feedback.set({ sound: !feedback.sound })}><span>{c.sound}</span><span>{feedback.sound ? c.on : c.off}</span></button>
    <button type="button" role="switch" aria-label={c.haptic} aria-checked={feedback.haptics && feedback.supported} disabled={!feedback.supported} className={`${secondary} w-full justify-between border border-stone-200 disabled:opacity-50`} onClick={() => feedback.set({ haptics: !feedback.haptics })}><span>{c.haptic}</span><span>{feedback.haptics && feedback.supported ? c.on : c.off}</span></button>
    {!feedback.supported ? <p className="text-xs text-stone-600">{c.no}</p> : null}
    <button type="button" className={`${secondary} underline disabled:opacity-50`} disabled={!feedback.sound} onClick={feedback.sample}>{c.sample}</button>
    <p className="text-xs text-stone-600">{c.voice}</p>
    {!feedback.stored ? <p role="status" className="text-xs text-amber-900">{c.session}</p> : null}
  </div>;
  return compact ? <details className="mb-5"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-emerald-900">{c.title}</summary>{controls}</details> : <section aria-label={c.title}><h3 className="mb-3 font-bold">{c.title}</h3>{controls}</section>;
}
