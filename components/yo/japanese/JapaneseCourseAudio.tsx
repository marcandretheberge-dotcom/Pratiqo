"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Volume2, Square } from "lucide-react";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { getJapaneseFoundationAudioItem } from "@/lib/yo/audio/japaneseFoundationAudio";
import type { YoLocale } from "@/lib/yo/types";

const copy = {
  fr: { play: "Écouter", stop: "Arrêter", slow: "Ralentir", aiVoice: "Voix IA", unavailable: "Cet enregistrement est indisponible. Utilise la transcription.", failed: "La lecture a été interrompue ou n’a pas démarré. Réessaie ou lis la transcription." },
  en: { play: "Listen", stop: "Stop", slow: "Slow down", aiVoice: "AI voice", unavailable: "This recording is unavailable. Use the transcript.", failed: "Playback was interrupted or did not start. Try again or use the transcript." },
  es: { play: "Escuchar", stop: "Detener", slow: "Más lento", aiVoice: "Voz IA", unavailable: "Esta grabación no está disponible. Usa la transcripción.", failed: "La reproducción se interrumpió o no comenzó. Reintenta o lee la transcripción." },
};

type AudioSession = { audio: HTMLAudioElement; dispose: () => void };
type PlaybackState = "idle" | "loading" | "playing";
const AUDIO_STOP_EVENT = "yo-japanese-audio-stop";
const BUFFER_TIMEOUT_MS = 15000;

/** Learner-triggered OpenAI recordings from public Supabase Storage; no runtime TTS or secrets. */
export function JapaneseCourseAudio({ text, locale, onListen, label }: { text: string; locale: YoLocale; onListen?: () => void; label?: string }) {
  const [state, setState] = useState<PlaybackState>("idle");
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<"unavailable" | "failed" | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const session = useRef<AudioSession | null>(null);
  const latestOnListen = useRef(onListen);
  latestOnListen.current = onListen;

  const stop = useCallback(() => {
    const active = session.current;
    if (!active) return;
    // Invalidate before pause/load: their events and a late play() rejection must be inert.
    session.current = null;
    active.dispose();
    try { active.audio.pause(); active.audio.currentTime = 0; } catch { /* cleanup only */ }
    active.audio.removeAttribute("src");
    try { active.audio.load(); } catch { /* cleanup only */ }
    setState("idle");
  }, []);

  useEffect(() => {
    setError(null);
    const visibility = () => { if (document.visibilityState !== "visible") stop(); };
    window.addEventListener(AUDIO_STOP_EVENT, stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener(AUDIO_STOP_EVENT, stop);
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, [text, stop]);

  function play() {
    if (session.current) { stop(); return; }
    setError(null);
    const item = getJapaneseFoundationAudioItem(text);
    const url = item && buildPublicAudioUrl(item.storagePath);
    if (!url || typeof window.Audio !== "function") { setError("unavailable"); return; }

    window.dispatchEvent(new Event(AUDIO_STOP_EVENT));
    let audio: HTMLAudioElement;
    try { audio = new window.Audio(url); }
    catch { setError("failed"); return; }
    // Construct on click only: hidden study panels do not download their recordings.
    audio.preload = "none";
    audio.playbackRate = slow ? 0.78 : 1;
    audio.preservesPitch = true;
    let heard = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;
    const active: AudioSession = { audio, dispose: () => {
      clearTimeout(timer);
      observer?.disconnect();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("stalled", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onEnded);
      audio.removeEventListener("error", onError);
    } };
    const isCurrent = () => session.current === active;
    const fail = () => { if (!isCurrent()) return; stop(); setError("failed"); };
    const armTimeout = () => { clearTimeout(timer); timer = setTimeout(fail, BUFFER_TIMEOUT_MS); };
    const onPlaying = () => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      setState("playing");
      // The play event fires before sound is available; only playing counts as listening.
      if (!heard) { heard = true; latestOnListen.current?.(); }
    };
    const onWaiting = () => { if (!isCurrent()) return; setState("loading"); armTimeout(); };
    const onEnded = () => { if (isCurrent()) stop(); };
    const onError = () => fail();
    session.current = active;
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("stalled", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onEnded);
    audio.addEventListener("error", onError);

    // Study panels stay mounted to preserve drafts. Stop if an ancestor becomes hidden.
    if (typeof MutationObserver !== "undefined" && root.current) {
      observer = new MutationObserver(() => {
        if (root.current?.closest("[hidden], [inert], [aria-hidden='true']")) stop();
      });
      for (let ancestor: Element | null = root.current; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
      }
    }
    setState("loading");
    armTimeout();
    try { void audio.play()?.catch(fail); }
    catch { fail(); }
  }

  const active = state !== "idle";
  return <span ref={root} className="inline-flex max-w-full flex-wrap items-center gap-2 align-middle" data-no-deck-swipe data-no-deck-tap>
    <button type="button" onClick={(event) => { event.stopPropagation(); play(); }} aria-label={(active ? copy[locale].stop : copy[locale].play) + " : " + (label ?? text)}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {state === "loading" ? <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden /> : active ? <Square size={13} aria-hidden /> : <Volume2 size={15} aria-hidden />}{active ? copy[locale].stop : copy[locale].play}
    </button>
    <button type="button" aria-pressed={slow} onClick={(event) => { event.stopPropagation(); stop(); setSlow(!slow); }}
      className="min-h-9 rounded-full px-2 text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2">
      {slow ? "0.78×" : "1×"} · {copy[locale].slow}
    </button>
    <span className="text-[10px] text-slate-500">{copy[locale].aiVoice}</span>
    {error ? <span role="status" className="basis-full text-xs text-amber-900">{copy[locale][error]}</span> : null}
  </span>;
}
