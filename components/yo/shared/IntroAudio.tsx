"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { beginLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { L } from "@/lib/yo/shared/types";
import { selectIntroVoice } from "@/lib/yo/shared/releaseChoices";

/** One cancellable playback session. Recordings first; a matching device voice is the fallback.
 * A buffer stall, failed play, hidden page or unmount always releases the pronunciation lock.
 * Neither a play request nor a failed recording counts as listening. */
export function IntroAudio({ text, speechLocale, path, locale, onListen, autoPlay = false, label }: {
  text: string; speechLocale: string; path?: string; locale: YoLocale; onListen?: () => void; autoPlay?: boolean; label?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle"), [failed, setFailed] = useState(false), [slow, setSlow] = useState(false);
  const cleanup = useRef<(() => void) | null>(null), heard = useRef(onListen), button = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  useEffect(() => { heard.current = onListen; }, [onListen]);
  const stop = useCallback(() => {
    generation.current++;
    const dispose = cleanup.current; cleanup.current = null;
    dispose?.(); setState("idle");
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener("yo-audio-stop", stop); window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("yo-audio-stop", stop); window.removeEventListener("pagehide", stop); document.removeEventListener("visibilitychange", hide); stop(); };
  }, [stop, text, speechLocale, path]);
  useEffect(() => { if (!autoPlay) return; const frame = requestAnimationFrame(() => button.current?.click()); return () => cancelAnimationFrame(frame); }, [text, autoPlay]);
  function play() {
    if (cleanup.current) { stop(); return; }
    stopLessonAudio(); setFailed(false); setState("loading"); const run = generation.current;
    const release = beginLessonAudio();
    let timer: ReturnType<typeof setTimeout> | undefined, mediaCleanup: (() => void) | undefined, voiceCleanup: (() => void) | undefined;
    let disposed = false, counted = false, usingVoice = false;
    const current = () => !disposed && run === generation.current;
    cleanup.current = () => { disposed = true; clearTimeout(timer); mediaCleanup?.(); voiceCleanup?.(); release(); };
    const fail = () => { if (current()) { stop(); setFailed(true); } };
    const ready = () => {
      if (!current()) return;
      clearTimeout(timer); setState("playing");
      if (!counted) { counted = true; heard.current?.(); }
    };
    const end = () => { if (current()) stop(); };
    const arm = (callback: () => void, delay = 12000) => { clearTimeout(timer); timer = setTimeout(callback, delay); };
    const deviceVoice = () => {
      if (!current() || usingVoice) return;
      usingVoice = true; mediaCleanup?.(); mediaCleanup = undefined; setState("loading");
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") { fail(); return; }
      let utterance: SpeechSynthesisUtterance | undefined;
      const speak = () => {
        if (!current() || utterance) return;
        try {
          const voice = selectIntroVoice(synth.getVoices(), speechLocale);
          if (!voice) return;
          utterance = new SpeechSynthesisUtterance(text); utterance.lang = speechLocale; utterance.voice = voice; utterance.rate = slow ? .66 : .85;
          utterance.onstart = ready; utterance.onend = end; utterance.onerror = fail;
          arm(fail); synth.speak(utterance);
        } catch { fail(); }
      };
      voiceCleanup = () => { synth.removeEventListener("voiceschanged", speak); if (utterance) { utterance.onstart = null; utterance.onend = null; utterance.onerror = null; try { synth.cancel(); } catch { /* cleanup */ } } };
      synth.addEventListener("voiceschanged", speak); arm(fail, 1800); speak();
    };
    const url = path?.startsWith("/audio/yo/") ? path : path ? buildPublicAudioUrl(path) : null;
    if (!url) { deviceVoice(); return; }
    try {
      const audio = new window.Audio(url);
      audio.preload = "none"; audio.playbackRate = slow ? .78 : 1; audio.preservesPitch = true;
      const waiting = () => { if (current() && !usingVoice) { setState("loading"); arm(deviceVoice); } };
      const mediaError = () => { if (current() && !usingVoice) deviceVoice(); };
      mediaCleanup = () => {
        audio.removeEventListener("playing", ready); audio.removeEventListener("ended", end); audio.removeEventListener("error", mediaError);
        audio.removeEventListener("waiting", waiting); audio.removeEventListener("stalled", waiting); audio.removeEventListener("pause", end);
        try { audio.pause(); audio.removeAttribute("src"); audio.load(); } catch { /* cleanup */ }
      };
      audio.addEventListener("playing", ready); audio.addEventListener("ended", end); audio.addEventListener("error", mediaError);
      audio.addEventListener("waiting", waiting); audio.addEventListener("stalled", waiting); audio.addEventListener("pause", end);
      arm(deviceVoice);
      void audio.play().catch(error => {
        if (!current() || usingVoice) return;
        if (error instanceof Error && error.name === "NotAllowedError") fail(); else deviceVoice();
      });
    } catch { deviceVoice(); }
  }
  const active = state !== "idle";
  const say = (fr: string, en: string, es: string) => L(fr, en, es)[locale];
  const action = active ? say("Arrêter", "Stop", "Detener") : say("Écouter", "Listen", "Escuchar");
  return <div className="flex flex-wrap items-center gap-2" data-pronunciation-state={state}>
    <button ref={button} type="button" onClick={play} aria-label={label ? `${action} : ${label}` : say("Écouter le message", "Listen to the message", "Escuchar el mensaje")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-950">{state === "loading" ? <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden/> : active ? <Square size={17} aria-hidden/> : <Volume2 size={20} aria-hidden/>}{action}</button>
    <button type="button" aria-pressed={slow} onClick={() => { stop(); setSlow(!slow); }} className="min-h-11 px-2 text-sm text-slate-600 underline decoration-dotted underline-offset-4">{slow ? "0.78×" : "1×"} · {say("Ralentir", "Slow down", "Más lento")}</button>
    {failed && <p role="status" className="basis-full text-sm text-amber-900">{say("Audio indisponible ici. Tu peux réessayer ou lire le message.", "Audio is unavailable here. Try again or read the message.", "Audio no disponible aquí. Puedes reintentar o leer el mensaje.")}</p>}
  </div>;
}
