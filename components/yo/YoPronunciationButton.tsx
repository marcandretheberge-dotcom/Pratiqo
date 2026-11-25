"use client";

/**
 * YoPronunciationButton — browser-native Spanish pronunciation MVP.
 *
 * Why a dedicated component:
 *   - Lives inside Server components (vocab table, reading helper,
 *     dictionary), so it must be a small client island.
 *   - Wraps the SpeechSynthesis API in an SSR-safe shell: we render a
 *     disabled placeholder on the server and only flip to interactive
 *     after `useEffect` confirms the browser supports it.
 *   - Centralizes the "find the best Spanish voice" logic so every caller
 *     gets the same regional preference behavior.
 *
 * Pedagogical contract:
 *   - NO autoplay. The user must press the button.
 *   - Cancels any in-flight utterance before starting a new one (avoids
 *     overlapping audio when a learner clicks rapidly through a list).
 *   - When pressed again while playing, it acts as a stop.
 *
 * Security / privacy:
 *   - 100 % client side. Nothing is sent over the network.
 *   - No persistence, no logging, no analytics from this file.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";
import { cn } from "@/lib/utils";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

export interface YoPronunciationButtonProps {
  /** Spanish target text to be pronounced. */
  text: string;
  /** UI locale (only used for ARIA labels). */
  locale: YoLocale;
  /**
   * BCP-47 tag passed to SpeechSynthesis (default "es-ES"). Country
   * modules can prefer "es-DO", "es-MX", … the browser will pick the
   * closest installed voice if the exact tag has no match.
   */
  speechLang?: string;
  /** Override the default ARIA label. */
  label?: YoLocalizedString;
  /** Visual size — `xs` fits inside dense lists, `sm` for standalone use. */
  size?: "xs" | "sm";
  /** Optional className for additional styling tweaks. */
  className?: string;
}

/**
 * Pick the best Spanish voice given a preferred BCP-47 tag.
 *
 * Browsers ship a different voice set per platform (es-ES on macOS,
 * es-MX on Chrome desktop, etc.). We try the exact tag first, then any
 * voice whose lang starts with the same primary language ("es-…"), then
 * fall back to the system default.
 */
function pickBestVoice(
  preferred: string,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const normalized = preferred.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === normalized);
  if (exact) return exact;
  const primary = normalized.split("-")[0] ?? normalized;
  return voices.find((v) => v.lang.toLowerCase().startsWith(`${primary}-`))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(primary));
}

export function YoPronunciationButton({
  text,
  locale,
  speechLang = "es-ES",
  label,
  size = "xs",
  className,
}: YoPronunciationButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") {
      return;
    }
    setIsSupported(true);

    const updateVoices = () => {
      voicesRef.current = synth.getVoices();
    };
    const stop = () => { synth.cancel(); setIsPlaying(false); };
    const visibility = () => { if (document.visibilityState !== "visible") stop(); };
    window.addEventListener("yo-speech-cancel", stop);
    document.addEventListener("visibilitychange", visibility);
    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);
    return () => {
      window.removeEventListener("yo-speech-cancel", stop);
      document.removeEventListener("visibilitychange", visibility);
      synth.removeEventListener?.("voiceschanged", updateVoices);
      // Cancel any in-flight utterance on unmount to avoid a ghost voice
      // continuing after the learner navigates away.
      try {
        synth.cancel();
      } catch {
        // Some browsers throw on cancel() if the queue is empty; ignore.
      }
    };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Common case: this button often lives inside a clickable card
      // (e.g. flashcard surface). Stop propagation so the parent's flip
      // / select handler does not fire when the learner just wants audio.
      event.stopPropagation();
      if (!isSupported) return;
      const synth = window.speechSynthesis;
      if (!synth) return;

      if (isPlaying) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        setIsPlaying(false);
        return;
      }

      try {
        synth.cancel();
      } catch {
        /* ignore */
      }

      stopLessonAudio();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      utterance.rate = 0.95;
      utterance.pitch = 1;
      const voice = pickBestVoice(speechLang, voicesRef.current);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      try {
        synth.speak(utterance);
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    },
    [isPlaying, isSupported, speechLang, text],
  );

  // SSR / unsupported: render an inert placeholder so the layout stays
  // stable. `aria-hidden` keeps the placeholder out of screen-readers
  // until the client confirms support.
  if (!isSupported) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full opacity-0",
          size === "xs" ? "size-6" : "size-8",
          className,
        )}
      />
    );
  }

  const ariaLabel = isPlaying
    ? `${t(YO_COPY.pronunciation.stopLabel, locale)} : ${text}`
    : `${t(label ?? YO_COPY.pronunciation.listenLabel, locale)} : ${text}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={isPlaying}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-[#0F6E56] ring-1 ring-teal-200 shadow-[0_1px_2px_rgba(15,58,52,0.06)] transition hover:bg-[#FFF4D6] hover:text-[#7a4a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-1 focus-visible:ring-offset-white",
        size === "xs" ? "size-6 p-1" : "size-8 p-1.5",
        isPlaying && "bg-[#FFF4D6] text-[#7a4a00] ring-[#F4B400]",
        className,
      )}
    >
      {isPlaying ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin sm:size-4" />
      ) : (
        <Volume2 aria-hidden className="size-3.5 sm:size-4" />
      )}
    </button>
  );
}

