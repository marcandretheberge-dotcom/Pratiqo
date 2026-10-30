"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";

const copy = {
  fr: { play: "Écouter", stop: "Arrêter", slow: "Ralentir", noVoice: "Aucune voix japonaise disponible sur cet appareil. Utilise la transcription.", failed: "La lecture n’a pas démarré. Réessaie ou lis la transcription." },
  en: { play: "Listen", stop: "Stop", slow: "Slow down", noVoice: "No Japanese voice is available on this device. Use the transcript.", failed: "Playback did not start. Try again or use the transcript." },
  es: { play: "Escuchar", stop: "Detener", slow: "Más lento", noVoice: "No hay voz japonesa disponible en este dispositivo. Usa la transcripción.", failed: "La reproducción no comenzó. Reintenta o lee la transcripción." },
};

/** Device speech only, explicitly learner-triggered. Never falls back to a non-Japanese voice. */
export function JapaneseCourseAudio({ text, locale, onListen, label }: { text: string; locale: YoLocale; onListen?: () => void; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const stop = () => {
      if (!utterance.current) return;
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current.onstart = null;
      utterance.current = null;
      if (timeout.current) clearTimeout(timeout.current);
      window.speechSynthesis?.cancel();
      setPlaying(false);
    };
    const otherPlayer = () => stop();
    const visibility = () => { if (document.visibilityState !== "visible") stop(); };
    window.addEventListener("yo-japanese-audio-stop", otherPlayer);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("yo-japanese-audio-stop", otherPlayer);
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, [text]);

  function play() {
    if (playing) {
      window.dispatchEvent(new Event("yo-japanese-audio-stop"));
      return;
    }
    setError("");
    const speech = window.speechSynthesis;
    if (!speech || typeof window.SpeechSynthesisUtterance !== "function") { setError(copy[locale].noVoice); return; }
    let voices: SpeechSynthesisVoice[];
    try { voices = speech.getVoices().filter((voice) => /^ja(?:-|$)/i.test(voice.lang)); }
    catch { setError(copy[locale].failed); return; }
    if (!voices.length) { setError(copy[locale].noVoice); return; }
    window.dispatchEvent(new Event("yo-japanese-audio-stop"));
    speech.cancel();
    const next = new window.SpeechSynthesisUtterance(text);
    next.voice = voices.find((voice) => voice.localService) ?? voices[0];
    next.lang = "ja-JP";
    next.rate = slow ? 0.78 : 1;
    utterance.current = next;
    const finish = () => {
      if (utterance.current !== next) return;
      if (timeout.current) clearTimeout(timeout.current);
      utterance.current = null;
      setPlaying(false);
    };
    next.onend = finish;
    next.onerror = (event) => {
      if (utterance.current !== next) return;
      if (event.error !== "canceled" && event.error !== "interrupted") setError(copy[locale].failed);
      finish();
    };
    next.onstart = () => { if (utterance.current !== next) return; if (timeout.current) clearTimeout(timeout.current); onListen?.(); };
    setPlaying(true);
    timeout.current = setTimeout(() => {
      if (utterance.current === next) { speech.cancel(); finish(); setError(copy[locale].failed); }
    }, 8000);
    try { speech.speak(next); }
    catch { finish(); setError(copy[locale].failed); }
  }

  return <span className="inline-flex max-w-full flex-wrap items-center gap-2 align-middle" data-no-deck-swipe data-no-deck-tap>
    <button type="button" onClick={play} aria-label={(playing ? copy[locale].stop : copy[locale].play) + " : " + (label ?? text)}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {playing ? <Square size={13} aria-hidden /> : <Volume2 size={15} aria-hidden />}{playing ? copy[locale].stop : copy[locale].play}
    </button>
    <button type="button" aria-pressed={slow} onClick={() => { if (playing) window.dispatchEvent(new Event("yo-japanese-audio-stop")); setSlow(!slow); }}
      className="min-h-9 rounded-full px-2 text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2">
      {slow ? "0.78×" : "1×"} · {copy[locale].slow}
    </button>
    {error ? <span role="status" className="basis-full text-xs text-amber-900">{error}</span> : null}
  </span>;
}
