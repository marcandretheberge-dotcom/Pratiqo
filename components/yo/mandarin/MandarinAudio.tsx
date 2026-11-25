"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import audioPaths from "@/lib/yo/mandarin/audioPaths.json";
import toneAssets from "@/lib/yo/mandarin/toneAssets.json";
import { L } from "@/lib/yo/mandarin/types";
import type { YoLocale } from "@/lib/yo/types";

export const MANDARIN_AUDIO_STOP = "yo-mandarin-audio-stop";
export function stopMandarinAudio() {
  window.dispatchEvent(new Event(MANDARIN_AUDIO_STOP));
}
export function MandarinAudio({
  text,
  locale,
  label,
  tone,
  onHeard,
  onPlaying,
}: {
  text: string;
  locale: YoLocale;
  label?: string;
  tone?: keyof typeof toneAssets;
  onHeard?: () => void;
  onPlaying?: (playing: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const callbacks = useRef({ onHeard, onPlaying });
  callbacks.current = { onHeard, onPlaying };
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const current = audio.current;
    audio.current = null;
    if (current) {
      current.onended =
        current.onerror =
        current.onplaying =
        current.onwaiting =
          null;
      current.pause();
      current.removeAttribute("src");
      current.load();
    }
    setPlaying(false);
    callbacks.current.onPlaying?.(false);
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState !== "visible") stop();
    };
    window.addEventListener(MANDARIN_AUDIO_STOP, stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener(MANDARIN_AUDIO_STOP, stop);
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, [stop, text]);
  function play() {
    if (audio.current) {
      stop();
      return;
    }
    stopMandarinAudio();
    setFailed(false);
    const path = tone
      ? toneAssets[tone].src
      : (audioPaths as Record<string, string>)[text];
    if (!path) {
      setFailed(true);
      return;
    }
    let current: HTMLAudioElement;
    try {
      current = new Audio(path);
    } catch {
      setFailed(true);
      return;
    }
    audio.current = current;
    current.preload = "none";
    current.playbackRate = slow ? 0.8 : 1;
    current.preservesPitch = true;
    const fail = () => {
      if (audio.current !== current) return;
      stop();
      setFailed(true);
    };
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(fail, 15000);
    };
    current.onplaying = () => {
      if (audio.current !== current) return;
      if (timer.current) clearTimeout(timer.current);
      setPlaying(true);
      callbacks.current.onPlaying?.(true);
    };
    // Complete playback, not a click or a loading event, is the listening prerequisite.
    current.onended = () => {
      if (audio.current !== current) return;
      callbacks.current.onHeard?.();
      stop();
    };
    current.onerror = fail;
    current.onwaiting = arm;
    arm();
    try {
      void current.play().catch(fail);
    } catch {
      fail();
    }
  }
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={play}
        aria-label={`${L("Écouter", "Listen", "Escuchar")[locale]} : ${label ?? text}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal-700 px-3 text-sm text-teal-950"
      >
        {playing ? <Square size={16} /> : <Volume2 size={18} />}
        {L("Écouter", "Listen", "Escuchar")[locale]}
      </button>
      <button
        type="button"
        aria-pressed={slow}
        onClick={() => {
          stop();
          setSlow(!slow);
        }}
        className="min-h-11 px-2 text-sm underline"
      >
        {slow ? "0.8×" : "1×"}
      </button>
      <span className="text-xs text-gray-600">
        {tone
          ? L("Voix enregistrée", "Recorded voice", "Voz grabada")[locale]
          : L("Voix IA", "AI voice", "Voz IA")[locale]}
      </span>
      {failed && (
        <span role="status" className="basis-full text-sm text-red-800">
          {
            L(
              "Audio indisponible. Réessaie plus tard ; l’écoute n’est pas validée.",
              "Audio unavailable. Try later; listening has not been validated.",
              "Audio no disponible. Reintenta más tarde; la escucha no está validada.",
            )[locale]
          }
        </span>
      )}
    </span>
  );
}
