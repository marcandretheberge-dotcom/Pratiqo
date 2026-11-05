"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { EFFECTS_KEY, listenForAdventureInterruptions, playAdventureSound, prepareAdventureSound, stopAdventureSound } from "@/lib/yo/adventureSound";
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

const STORAGE_KEY = EFFECTS_KEY;

const YoAudioFeedbackContext = createContext<YoAudioFeedbackContextValue>({
  isUnlocked: false,
  isMuted: false,
  unlock: async () => undefined,
  toggleMuted: () => undefined,
  playFeedback: async () => undefined,
});

const LABELS: Record<YoLocale, { soundOn: string; soundOff: string }> = {
  fr: {
    soundOn: "Effets sonores activés",
    soundOff: "Effets sonores coupés",
  },
  en: {
    soundOn: "Sound effects on",
    soundOff: "Sound effects off",
  },
  es: {
    soundOn: "Efectos de sonido activos",
    soundOff: "Efectos de sonido desactivados",
  },
};

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

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    try {
      setIsMuted(window.localStorage.getItem(STORAGE_KEY) !== "false");
    } catch {
      /* localStorage can be unavailable in private contexts */
    }
  }, []);

  useEffect(() => listenForAdventureInterruptions(), []);
  const unlock = useCallback(async () => {
    setIsUnlocked(await prepareAdventureSound());
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      if (next) stopAdventureSound();
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
      const mapping = { correct: "correct", incorrect: "retry", "step-complete": "checkpoint", "intro-complete": "unlock" } as const;
      await playAdventureSound(mapping[kind]);
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
