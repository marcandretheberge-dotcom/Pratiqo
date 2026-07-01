"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";

type YoAudioFeedbackKind =
  | "correct"
  | "incorrect"
  | "step-complete"
  | "intro-complete";

type YoAudioFeedbackContextValue = {
  isUnlocked: boolean;
  isMuted: boolean;
  unlock: () => Promise<void>;
  toggleMuted: () => void;
  playFeedback: (kind: YoAudioFeedbackKind) => Promise<void>;
};

const STORAGE_KEY = "yopratiqo.audio.muted";

const YoAudioFeedbackContext = createContext<YoAudioFeedbackContextValue>({
  isUnlocked: false,
  isMuted: false,
  unlock: async () => undefined,
  toggleMuted: () => undefined,
  playFeedback: async () => undefined,
});

const LABELS: Record<YoLocale, { soundOn: string; soundOff: string }> = {
  fr: {
    soundOn: "Audio active",
    soundOff: "Audio coupe",
  },
  en: {
    soundOn: "Audio on",
    soundOff: "Audio off",
  },
  es: {
    soundOn: "Audio activo",
    soundOff: "Audio apagado",
  },
};

const TONES: Record<
  YoAudioFeedbackKind,
  { frequency: number; durationMs: number; type: OscillatorType }
> = {
  correct: { frequency: 880, durationMs: 110, type: "sine" },
  incorrect: { frequency: 196, durationMs: 150, type: "triangle" },
  "step-complete": { frequency: 1046, durationMs: 170, type: "sine" },
  "intro-complete": { frequency: 1318, durationMs: 240, type: "sine" },
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const safariWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? safariWindow.webkitAudioContext;
}

export function useYoAudioFeedback(): YoAudioFeedbackContextValue {
  return useContext(YoAudioFeedbackContext);
}

export interface YoAudioFeedbackProviderProps {
  locale: YoLocale;
  children: ReactNode;
}

export function YoAudioFeedbackProvider({
  locale,
  children,
}: YoAudioFeedbackProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    try {
      setIsMuted(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* localStorage can be unavailable in private contexts */
    }
  }, []);

  const unlock = useCallback(async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume().catch(() => undefined);
      }
      setIsUnlocked(true);
      return;
    }

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    setIsUnlocked(true);
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  }, []);

  const playFeedback = useCallback(
    async (kind: YoAudioFeedbackKind) => {
      if (isMuted) return;
      await unlock();
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const tone = TONES[kind];
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = tone.durationMs / 1000;

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    },
    [isMuted, unlock],
  );

  const value = useMemo(
    () => ({
      isUnlocked,
      isMuted,
      unlock,
      toggleMuted,
      playFeedback,
    }),
    [isMuted, isUnlocked, playFeedback, toggleMuted, unlock],
  );

  const labels = LABELS[locale];

  return (
    <YoAudioFeedbackContext.Provider value={value}>
      <div
        className="relative h-full"
        onPointerDownCapture={() => {
          void unlock();
        }}
      >
        {children}
        <div
          data-yo-audio-feedback-toggle-lane="content"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-full max-w-[960px] justify-end px-4 sm:px-6"
        >
          <button
            type="button"
            data-no-deck-swipe="true"
            data-no-deck-tap="true"
            data-yo-audio-feedback-toggle="true"
            aria-pressed={!isMuted}
            aria-label={isMuted ? labels.soundOff : labels.soundOn}
            onClick={(event) => {
              event.stopPropagation();
              void unlock();
              toggleMuted();
            }}
            className={cn(
              // The fixed lane is capped to the lesson content width; the
            // inside the `relative h-full` wrapper above — the
              // button itself stays inline so it cannot float off the viewport
            // header height and drifted off-screen / collided with
              // edge on wide desktops or collide with the bottom navigation.
            // bottom-right, clear of the bottom nav bar (which is
            // roughly 4.5rem tall including its safe-area padding),
            // so it never overlaps content or floats off-screen.
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold shadow-[0_12px_28px_rgba(23,38,66,0.12)] backdrop-blur-md transition",
            isMuted
              ? "border-[#E7DFCF] bg-white/90 text-[#566073]"
              : "border-[#13A085]/30 bg-[#DDF4F1]/95 text-[#0F6E56]",
            )}
          >
          {isMuted ? (
            <VolumeX className="size-4" aria-hidden />
          ) : (
            <Volume2 className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {isMuted ? labels.soundOff : labels.soundOn}
          </span>
          </button>
        </div>
      </div>
    </YoAudioFeedbackContext.Provider>
  );
}
