"use client";

import { useCallback, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Volume2, Square } from "lucide-react";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { getItalianBolognaAudioItem } from "@/lib/yo/audio/italianBolognaAudio";
import type { YoLocale } from "@/lib/yo/types";
import { useCourseLanguage, useItalianAudioPath } from "./ItalianAudioProvider";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

import { beginLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";

const copy = {
  fr: { play: "Écouter", stop: "Arrêter", slow: "Ralentir", unavailable: "Cet enregistrement est indisponible. Utilise la transcription.", failed: "La lecture a été interrompue ou n’a pas démarré. Réessaie ou lis la transcription." },
  en: { play: "Listen", stop: "Stop", slow: "Slow down", unavailable: "This recording is unavailable. Use the transcript.", failed: "Playback was interrupted or did not start. Try again or use the transcript." },
  es: { play: "Escuchar", stop: "Detener", slow: "Más lento", unavailable: "Esta grabación no está disponible. Usa la transcripción.", failed: "La reproducción se interrumpió o no comenzó. Reintenta o lee la transcripción." },
};

type AudioSession = { audio: HTMLAudioElement; dispose: () => void };
type PlaybackState = "idle" | "loading" | "playing";
export const ITALIAN_MODULE_AUDIO_STOP_EVENT = "yo-italian-audio-stop";
const BUFFER_TIMEOUT_MS = 15000;

/** Learner-triggered OpenAI recordings from public Supabase Storage; no runtime TTS or secrets. */
export interface ItalianModuleAudioProps {
  text: string;
  locale: YoLocale;
  onListen?: () => void;
  /** Generic label for listening questions: do not put the answer in an accessible name. */
  label?: string;
  autoPlay?: boolean;
}

export function ItalianModuleAudio({ text, locale, onListen, label, autoPlay = false }: ItalianModuleAudioProps) {
  const coursePath = useItalianAudioPath(text);
  const language = useCourseLanguage();
  const [state, setState] = useState<PlaybackState>("idle");
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<"unavailable" | "failed" | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const session = useRef<AudioSession | null>(null);
  const latestOnListen = useRef(onListen);
  useLayoutEffect(() => { latestOnListen.current = onListen; }, [onListen]);

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

  useLayoutEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setError(null); });
    const visibility = () => { if (document.visibilityState !== "visible") stop(); };
    window.addEventListener(ITALIAN_MODULE_AUDIO_STOP_EVENT, stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      window.removeEventListener(ITALIAN_MODULE_AUDIO_STOP_EVENT, stop);
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, [text, coursePath, stop]);

  function play(automatic = false) {
    if (session.current) { stop(); return; }
    setError(null); setNeedsTap(false);
    const item = language === "it" ? getItalianBolognaAudioItem(text) : undefined;
    const storagePath = coursePath ?? item?.storagePath;
    const bundledGerman = language === "de" && storagePath &&
      /^\/audio\/yo\/de\/german-course-foundations\/v1\/german-standard\/sentence\/[a-z0-9-]+\.mp3$/.test(storagePath);
    const bundledPortuguese = language === "pt-BR" && storagePath &&
      /^\/audio\/yo\/pt-br\/portuguese-course-foundations\/v1\/brazilian-portuguese\/sentence\/[a-z0-9-]+\.mp3$/.test(storagePath);
    const url = bundledGerman || bundledPortuguese ? storagePath : storagePath && buildPublicAudioUrl(storagePath);
    if (!url || typeof window.Audio !== "function") { setError("unavailable"); return; }

    stopLessonAudio();
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
    const releaseAudio = beginLessonAudio();
    const active: AudioSession = { audio, dispose: () => {
      releaseAudio();
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
    const fail = (blocked = false) => { if (!isCurrent()) return; stop(); if (blocked || automatic) setNeedsTap(true); else setError("failed"); };
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
    try { void audio.play()?.catch(error => fail(error instanceof Error && error.name === "NotAllowedError")); }
    catch (error) { fail(error instanceof Error && error.name === "NotAllowedError"); }
  }

  const startAutomatic = useEffectEvent(() => play(true));
  useLayoutEffect(() => {
    if (!autoPlay) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) startAutomatic(); });
    return () => { cancelled = true; };
  }, [text, coursePath, autoPlay]);
  const active = state !== "idle";
  return <span ref={root} className="inline-flex max-w-full flex-wrap items-center gap-2 align-middle" data-no-deck-swipe data-no-deck-tap>
    <button type="button" onClick={(event) => { event.stopPropagation(); play(false); }} aria-label={(active ? copy[locale].stop : copy[locale].play) + " : " + (label ?? text)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {state === "loading" ? <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden /> : active ? <Square size={13} aria-hidden /> : <Volume2 size={15} aria-hidden />}{active ? copy[locale].stop : copy[locale].play}
    </button>
    <button type="button" aria-pressed={slow} onClick={(event) => { event.stopPropagation(); stop(); setSlow(!slow); }}
      className="min-h-11 rounded-full px-2 text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2">
      {slow ? "0.78×" : "1×"} · {copy[locale].slow}
    </button>
    {needsTap ? <span role="status" className="basis-full text-xs font-medium text-amber-900" data-audio-tap-required>{{fr:"Lecture automatique bloquée. Touche Écouter pour entendre la phrase.",en:"Autoplay was blocked. Tap Listen to hear the phrase.",es:"La reproducción automática está bloqueada. Toca Escuchar para escuchar la frase."}[locale]}</span> : null}
    {error ? <span role="status" className="basis-full text-xs text-amber-900">{copy[locale][error]}</span> : null}
  </span>;
}
