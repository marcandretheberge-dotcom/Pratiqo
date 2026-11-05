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
 *       (c) the browser cannot decode the asset — retry available, a11y label
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
 *   - `preload="none"` avoids loading every hidden lesson recording.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { cn } from "@/lib/utils";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

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
  const root = useRef<HTMLButtonElement | null>(null);
  const requested = useRef(false);
  const attempt = useRef(0);
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioUrl = useMemo(
    () => buildPublicAudioUrl(storagePath, { bucket, version }),
    [storagePath, bucket, version],
  );

  // Lazily construct the underlying Audio element so SSR is not
  // affected by `new Audio(...)` (which references DOM globals).
  // Hidden lesson screens must not prefetch every recording.
  useEffect(() => {
    if (!audioUrl) return;
    if (typeof window === "undefined") return;

    const el = new window.Audio(audioUrl);
    el.preload = "none";
    el.crossOrigin = "anonymous";
    audioRef.current = el;

    setState("idle");
    const clearBuffer = () => { if (bufferTimer.current) clearTimeout(bufferTimer.current); };
    const stop = () => { requested.current = false; attempt.current++; clearBuffer(); try { el.pause(); el.currentTime = 0; } catch { /* Media may not have loaded yet. */ } setState("idle"); };
    const onPlay = () => { if (!requested.current) { el.pause(); return; } clearBuffer(); setState("playing"); };
    const onPause = () => { clearBuffer(); setState(s => s === "error" ? s : "idle"); };
    const onEnded = () => { requested.current = false; clearBuffer(); setState("idle"); };
    const onError = () => { if (!requested.current) return; stop(); setState("error"); };
    const onWaiting = () => {
      if (!requested.current) return;
      clearBuffer(); setState("loading");
      bufferTimer.current = setTimeout(() => { stop(); setState("error"); }, 15000);
    };
    const onVisibility = () => { if (document.visibilityState !== "visible") stop(); };
    window.addEventListener("yo-audio-stop", stop);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      if (root.current?.closest("[hidden], [inert], [aria-hidden='true']")) stop();
    });
    for (let ancestor: Element | null = root.current; ancestor; ancestor = ancestor.parentElement) {
      observer?.observe(ancestor, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
    }

    el.addEventListener("playing", onPlay);
    el.addEventListener("loadstart", onWaiting);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.addEventListener("waiting", onWaiting);

    return () => {
      attempt.current++;
      requested.current = false;
      observer?.disconnect();
      clearBuffer();
      window.removeEventListener("yo-audio-stop", stop);
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("playing", onPlay);
      el.removeEventListener("loadstart", onWaiting);
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

      if (state === "playing" || state === "loading") {
        requested.current = false;
        attempt.current++;
        if (bufferTimer.current) clearTimeout(bufferTimer.current);
        try {
          el.pause();
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
        setState("idle");
        return;
      }

      stopLessonAudio();
      requested.current = true;
      const currentAttempt = ++attempt.current;
      const failed = () => {
        if (currentAttempt !== attempt.current || audioRef.current !== el) return;
        if (bufferTimer.current) clearTimeout(bufferTimer.current);
        requested.current = false;
        setState("error");
      };
      if (state === "error") el.load();
      setState("loading");
      bufferTimer.current = setTimeout(() => { if (currentAttempt === attempt.current) { el.pause(); failed(); } }, 15000);
      try { void el.play()?.catch(failed); } catch { failed(); }
    },
    [audioUrl, state],
  );

  // No URL means no working control; a failed recording remains retryable.
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
        ref={root}
        type="button"
        onClick={handleClick}
        aria-label={`${computedAriaLabel} (retry audio)`}
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
      ref={root}
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

