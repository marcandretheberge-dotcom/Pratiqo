"use client";

import { Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

const SPEECH_EVENT_CANCEL = "yo-speech-cancel";

const SPEECH_LABELS = {
  listen: {
    fr: "Écouter",
    en: "Listen",
    es: "Escuchar",
  },
  playing: {
    fr: "Lecture...",
    en: "Playing...",
    es: "Reproduciendo...",
  },
  unavailable: {
    fr: "Audio non disponible sur cet appareil",
    en: "Audio unavailable on this device",
    es: "Audio no disponible en este dispositivo",
  },
} satisfies Record<string, YoLocalizedString>;

export const YO_SPANISH_SPEECH_LANG_PRIORITY = [
  "es-DO",
  "es-419",
  "es-US",
  "es-ES",
  "es",
] as const;

const PLACEHOLDER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\[palabra\]/gi, "la palabra"],
  [/\[mot\]/gi, "ce mot"],
  [/\[phrase\]/gi, "la frase"],
  [/\[nom\]/gi, "el nombre"],
  [/\[x\]/gi, "ce mot"],
  [/\{\{word\}\}/gi, "la palabra"],
  [/\{word\}/gi, "la palabra"],
];

function capitalizeFirstLetter(value: string): string {
  const firstLetterIndex = value.search(/\p{L}/u);
  if (firstLetterIndex < 0) return value;
  return (
    value.slice(0, firstLetterIndex) +
    value.charAt(firstLetterIndex).toLocaleUpperCase("es") +
    value.slice(firstLetterIndex + 1)
  );
}

function withTerminalPunctuation(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

export function sanitizeYoSpeechText(input: string): string {
  let text = input;
  for (const [pattern, replacement] of PLACEHOLDER_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.includes("/")) {
    return text
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => withTerminalPunctuation(capitalizeFirstLetter(part)))
      .join(" ");
  }

  return text;
}

function findSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  for (const lang of YO_SPANISH_SPEECH_LANG_PRIORITY) {
    const exact = voices.find((voice) => voice.lang === lang);
    if (exact) return exact;
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith("es"));
}

interface YoSpeechButtonProps {
  text: string;
  locale: YoLocale;
  label?: YoLocalizedString;
  className?: string;
  compact?: boolean;
}

export function YoSpeechButton({
  text,
  locale,
  label = SPEECH_LABELS.listen,
  className,
  compact = false,
}: YoSpeechButtonProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const spokenText = useMemo(() => sanitizeYoSpeechText(text), [text]);

  useEffect(() => {
    const hasSpeech =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
    setSupported(hasSpeech);

    const stopThisButton = () => setSpeaking(false);
    window.addEventListener(SPEECH_EVENT_CANCEL, stopThisButton);
    return () => window.removeEventListener(SPEECH_EVENT_CANCEL, stopThisButton);
  }, []);

  const disabled = !supported || spokenText.length === 0;
  const visibleLabel = disabled
    ? t(SPEECH_LABELS.unavailable, locale)
    : speaking
      ? t(SPEECH_LABELS.playing, locale)
      : t(label, locale);

  function handleClick() {
    if (disabled || typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    window.dispatchEvent(new Event(SPEECH_EVENT_CANCEL));
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = findSpanishVoice(synth.getVoices());
    utterance.lang = voice?.lang ?? "es-419";
    utterance.voice = voice ?? null;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`${visibleLabel}: ${spokenText || text}`}
      className={[
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2",
        disabled
          ? "cursor-not-allowed border-[#0B3040]/10 bg-white/55 text-[#0B3040]/45"
          : speaking
            ? "border-[#F4B400]/65 bg-[#FFF4D6] text-[#0B3040] shadow-[0_8px_18px_rgba(244,180,0,0.16)]"
            : "border-[#1D9E75]/20 bg-white text-[#0F6E56] shadow-[0_8px_18px_rgba(15,58,52,0.08)] hover:border-[#F4B400]/55 hover:bg-[#FFF4D6]",
        compact ? "px-2.5" : "",
        className ?? "",
      ].join(" ")}
    >
      {disabled ? (
        <VolumeX className="size-3.5" aria-hidden />
      ) : speaking ? (
        <Square className="size-3.5" aria-hidden />
      ) : (
        <Volume2 className="size-3.5" aria-hidden />
      )}
      <span>{visibleLabel}</span>
    </button>
  );
}
