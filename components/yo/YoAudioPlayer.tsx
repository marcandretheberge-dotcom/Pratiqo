"use client";

/**
 * YoAudioPlayer — minimal client island that plays a pre-generated MP3
 * from Supabase Storage.
 *
 * Why a dedicated component:
 *   - Sits inside server-rendered lesson cards (vocabulary lists,
 *     reading helper, dialogue scenarios). Must be a small client island.
 *   - Replaces (only where a manifest entry exists) the browser-native
 *     `YoPronunciationButton`, which uses `SpeechSynthesis` and depends
 *     on the OS having a Spanish voice installed. The pre-generated
 *     pipeline gives us a consistent voice across platforms.
 *   - Falls back gracefully when:
 *       (a) the public URL cannot be built — `NEXT_PUBLIC_SUPABASE_URL`
 *           missing (tests, local dev without .env);
 *       (b) the MP3 returns 404 — the requested item has not been
 *           generated yet by `scripts/generate-yopratiqo-audio.ts`;
 *       (c) the browser cannot decode the asset — disabled, a11y label
 *           updated, parent UI keeps rendering.
 *
 * Security contract:
 *   - NEVER imports any server-only secret env var. Browser bundles
 *     must never see them. The OpenAI API key in particular is read
 *     ONLY by `scripts/generate-yopratiqo-audio.ts`, never here.
 *   - NEVER imports `lib/supabaseAdmin.ts` or any service-role client.
 *   - Reads only the public anon URL via `buildPublicAudioUrl`.
 *   - Uses the standard `<audio>` element — no third-party SDKs.
 *
 * Pedagogical contract:
 *   - NO autoplay. The user must press the button.
 *   - Pressing again while playing acts as a stop (matches the existing
 *     `YoPronunciationButton` behaviour so the two surfaces feel
 *     identical to learners).
 *   - `preload="metadata"` keeps initial network use small while still
 *     showing duration / readiness in screen-reader output.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { cn } from "@/lib/utils";

export interface YoAudioPlayerProps {
  /**
   * Supabase Storage object path inside the bucket (the value of
   * `YoAudioItem.storagePath`). Must end in `.mp3`.
   */
  storagePath: string;
  /**
   * Optional human-readable label for screen readers — typically the
   * Spanish word or phrase being played.
   */
  label?: string;
  /**
   * Override the rendered ARIA label entirely. Defaults to
   * `"Listen — <label>"` (or simply `"Listen"` when no label is given).
   */
  ariaLabel?: string;
  /** Optional bucket override. Defaults to the manifest default. */
  bucket?: string;
  /** Optional cache-bust token forwarded to `buildPublicAudioUrl`. */
  version?: string;
  /** Visual size; matches `YoPronunciationButton` so they swap cleanly. */
  size?: "xs" | "sm";
  className?: string;
}

type PlaybackState = "idle" | "loading" | "playing" | "error";

export function YoAudioPlayer({
  storagePath,
  label,
  ariaLabel,
  bucket,
  version,
  size = "xs",
  className,
}: YoAudioPlayerProps) {
  const [state, setState] = useState<PlaybackState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = useMemo(
    () => buildPublicAudioUrl(storagePath, { bucket, version }),
    [storagePath, bucket, version],
  );

  // Lazily construct the underlying Audio element so SSR is not
  // affected by `new Audio(...)` (which references DOM globals).
  // `preload="metadata"` is set explicitly per the Phase 1 contract.
  useEffect(() => {
    if (!audioUrl) return;
    if (typeof window === "undefined") return;

    const el = new window.Audio(audioUrl);
    el.preload = "metadata";
    el.crossOrigin = "anonymous";
    audioRef.current = el;

    const onPlay = () => setState("playing");
    const onPause = () => setState((s) => (s === "playing" ? "idle" : s));
    const onEnded = () => setState("idle");
    const onError = () => setState("error");
    const onWaiting = () => setState("loading");

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.addEventListener("waiting", onWaiting);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      el.removeEventListener("waiting", onWaiting);
      try {
        el.pause();
      } catch {
        /* ignore — cleanup-only */
      }
      audioRef.current = null;
    };
  }, [audioUrl]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Same UX rule as YoPronunciationButton: this button often lives
      // inside a clickable card; stop propagation so the parent's
      // flip / select handler does not fire.
      event.stopPropagation();

      const el = audioRef.current;
      if (!el || !audioUrl) return;

      if (state === "playing") {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
        setState("idle");
        return;
      }

      setState("loading");
      const playPromise = el.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => setState("error"));
      }
    },
    [audioUrl, state],
  );

  // SSR / no-URL / error: render an inert, low-emphasis placeholder so
  // the layout stays stable. Surfaced as `aria-hidden` for non-error
  // cases (we don't want screen readers to announce a play button that
  // would never work) and as a labelled, disabled button for the
  // explicit error case so users get feedback if the MP3 404s.
  if (!audioUrl) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full opacity-0",
          size === "xs" ? "size-6" : "size-8",
          className,
        )}
        data-yo-audio-state="unavailable"
      />
    );
  }

  const computedAriaLabel =
    ariaLabel ?? (label ? `Listen — ${label}` : "Listen");

  if (state === "error") {
    return (
      <button
        type="button"
        disabled
        aria-label={`${computedAriaLabel} (audio unavailable)`}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-[#9CA3AF] ring-1 ring-[#E5E7EB]",
          size === "xs" ? "size-6 p-1" : "size-8 p-1.5",
          className,
        )}
        data-yo-audio-state="error"
      >
        <VolumeX aria-hidden className="size-3.5 sm:size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        state === "playing"
          ? `Stop — ${label ?? "audio"}`
          : computedAriaLabel
      }
      aria-pressed={state === "playing"}
      aria-busy={state === "loading"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-[#0F6E56] ring-1 ring-teal-200 shadow-[0_1px_2px_rgba(15,58,52,0.06)] transition hover:bg-[#FFF4D6] hover:text-[#7a4a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-1 focus-visible:ring-offset-white",
        size === "xs" ? "size-6 p-1" : "size-8 p-1.5",
        state === "playing" && "bg-[#FFF4D6] text-[#7a4a00] ring-[#F4B400]",
        className,
      )}
      data-yo-audio-state={state}
    >
      {state === "loading" || state === "playing" ? (
        <Loader2
          aria-hidden
          className={cn("size-3.5 sm:size-4", state === "loading" && "animate-spin")}
        />
      ) : (
        <Volume2 aria-hidden className="size-3.5 sm:size-4" />
      )}
    </button>
  );
}
