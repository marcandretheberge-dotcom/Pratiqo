"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { beginLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { L } from "@/lib/yo/shared/types";
import { selectIntroVoice } from "@/lib/yo/shared/releaseChoices";

/** Recordings first, correct-language device speech second. Failures never masquerade as listening. */
export function IntroAudio({ text, speechLocale, path, locale, onListen, autoPlay = false }: {
  text: string; speechLocale: string; path?: string; locale: YoLocale; onListen?: () => void; autoPlay?: boolean;
}) {
  const [playing, setPlaying] = useState(false), [failed, setFailed] = useState(false);
  const cleanup = useRef<(() => void) | null>(null), heard = useRef(onListen), button = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  useEffect(() => { heard.current = onListen; }, [onListen]);
  const stop = useCallback(() => { generation.current++; cleanup.current?.(); cleanup.current = null; setPlaying(false); }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener("yo-audio-stop", stop); document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("yo-audio-stop", stop); document.removeEventListener("visibilitychange", hide); stop(); };
  }, [stop, text]);
  useEffect(() => { if (!autoPlay) return; const frame = requestAnimationFrame(() => button.current?.click()); return () => cancelAnimationFrame(frame); }, [text, autoPlay]);
  function play() {
    if (playing) { stop(); return; }
    stopLessonAudio(); setFailed(false); const run = generation.current;
    const release = beginLessonAudio(); let timer: ReturnType<typeof setTimeout>;
    const fail = () => { if (run === generation.current) { stop(); setFailed(true); } };
    const ready = () => { if (run === generation.current) { clearTimeout(timer); setPlaying(true); heard.current?.(); } };
    const end = () => { if (run === generation.current) stop(); };
    const url = path?.startsWith("/audio/yo/") ? path : path ? buildPublicAudioUrl(path) : null;
    if (url) {
      const a = new Audio(url);
      a.addEventListener("playing", ready); a.addEventListener("ended", end); a.addEventListener("error", fail);
      cleanup.current = () => { clearTimeout(timer); a.removeEventListener("playing", ready); a.removeEventListener("ended", end); a.removeEventListener("error", fail); a.pause(); a.removeAttribute("src"); a.load(); release(); };
      timer = setTimeout(fail, 12000); void a.play().catch(fail); return;
    }
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { release(); setFailed(true); return; }
    let speech: SpeechSynthesisUtterance | null = null;
    const speak = () => {
      if (run !== generation.current || speech) return;
      const voice = selectIntroVoice(synth.getVoices(), speechLocale);
      if (!voice) return;
      speech = new SpeechSynthesisUtterance(text); speech.lang = speechLocale; speech.voice = voice; speech.rate = .85;
      speech.onstart = ready; speech.onend = end; speech.onerror = fail;
      try { synth.speak(speech); } catch { fail(); }
    };
    cleanup.current = () => { clearTimeout(timer); synth.removeEventListener("voiceschanged", speak); if (speech) { speech.onstart = null; speech.onend = null; speech.onerror = null; synth.cancel(); } release(); };
    synth.addEventListener("voiceschanged", speak); timer = setTimeout(fail, 12000); speak();
    if (!speech) { clearTimeout(timer); timer = setTimeout(fail, 1800); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    <button ref={button} type="button" onClick={play} aria-label={L("Écouter le message", "Listen to the message", "Escuchar el mensaje")[locale]} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-950">{playing ? <Square size={17} aria-hidden /> : <Volume2 size={20} aria-hidden />}{playing ? L("Arrêter", "Stop", "Detener")[locale] : L("Écouter", "Listen", "Escuchar")[locale]}</button>
    {failed && <p role="status" className="text-sm text-amber-900">{L("Audio indisponible ici. Tu peux lire le message.", "Audio is unavailable here. You can read the message.", "Audio no disponible aquí. Puedes leer el mensaje.")[locale]}</p>}
  </div>;
}
