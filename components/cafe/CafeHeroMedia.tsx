"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CafeLocale } from "@/lib/cafe/copy";
import { CAFE_HERO_POSTER_SRC, CAFE_WORLD_VIDEO_SRC } from "@/lib/cafe/heroMedia";
import styles from "./CafeHeroMedia.module.css";

type DataConnection = EventTarget & { saveData?: boolean; effectiveType?: string };
type MediaNavigator = Navigator & { connection?: DataConnection };
const REDUCED_MOTION = 1;
const SAVE_DATA = 2;
const HIDDEN = 4;
const COPY = {
  fr: { play: "Lire la vidéo", pause: "Mettre en pause", playLabel: "Lire la vidéo des cafés du monde", pauseLabel: "Mettre la vidéo des cafés du monde en pause", fallback: "La vidéo n’est pas disponible. Une photo du café est affichée." },
  en: { play: "Play video", pause: "Pause video", playLabel: "Play the cafés around the world video", pauseLabel: "Pause the cafés around the world video", fallback: "The video is unavailable. A café photo is shown." },
  es: { play: "Reproducir vídeo", pause: "Pausar vídeo", playLabel: "Reproducir el vídeo de cafés del mundo", pauseLabel: "Pausar el vídeo de cafés del mundo", fallback: "El vídeo no está disponible. Se muestra una foto del café." },
} as const;

function mediaEnvironment(): number {
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? REDUCED_MOTION : 0;
  const connection = (navigator as MediaNavigator).connection;
  const saving = connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g";
  return motion | (saving ? SAVE_DATA : 0) | (document.hidden ? HIDDEN : 0);
}

function subscribeMediaEnvironment(update: () => void) {
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const connection = (navigator as MediaNavigator).connection;
  if (motion?.addEventListener) motion.addEventListener("change", update);
  else motion?.addListener(update);
  connection?.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    if (motion?.removeEventListener) motion.removeEventListener("change", update);
    else motion?.removeListener(update);
    connection?.removeEventListener("change", update);
    document.removeEventListener("visibilitychange", update);
  };
}

const serverMediaEnvironment = () => REDUCED_MOTION | SAVE_DATA | HIDDEN;

/** Silent decorative footage. No player, request or control is mounted until real media is enabled. */
export function CafeHeroMedia({ locale, videoSrc = null, className = "" }: { locale: CafeLocale; videoSrc?: string | null; className?: string }) {
  const availableSource = videoSrc === CAFE_WORLD_VIDEO_SRC ? videoSrc : null;
  return <div className={`${styles.frame} ${className}`} data-cafe-hero={availableSource ? "video-enabled" : "photo"}>
    {availableSource && <AmbientCafeVideo key={availableSource} src={availableSource} locale={locale} />}
  </div>;
}

function AmbientCafeVideo({ src, locale }: { src: string; locale: CafeLocale }) {
  const copy = COPY[locale];
  const id = useId();
  const player = useRef<HTMLVideoElement>(null);
  const generation = useRef(0);
  const wantsPlayback = useRef(false);
  const [intent, setIntent] = useState<"auto" | "play" | "pause">("auto");
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(true);
  const environment = useSyncExternalStore(subscribeMediaEnvironment, mediaEnvironment, serverMediaEnvironment);
  const restricted = Boolean(environment & (REDUCED_MOTION | SAVE_DATA));
  // Under reduced motion / data saving, even the src is absent until an explicit Play action.
  const loadSource = !failed && (!restricted || intent === "play");
  const shouldPlay = loadSource && inView && !(environment & HIDDEN) && intent !== "pause";
  useLayoutEffect(() => { wantsPlayback.current = shouldPlay; }, [shouldPlay]);

  const play = useCallback((element: HTMLVideoElement) => {
    const ticket = ++generation.current;
    element.muted = true;
    element.defaultMuted = true;
    // StrictMode replays effect cleanup; restore the committed local source before retrying playback.
    if (element.getAttribute("src") !== src) element.setAttribute("src", src);
    try {
      void element.play()?.catch((error: unknown) => {
        if (generation.current !== ticket) return;
        setPlaying(false);
        // Autoplay rejection leaves a working explicit Play control; codec/network errors use the photo.
        if (error instanceof Error && error.name === "NotSupportedError") setFailed(true);
      });
    } catch { setPlaying(false); }
  }, [src]);

  useEffect(() => {
    const element = player.current;
    if (!element || failed) return;
    if (shouldPlay) play(element);
    else { generation.current += 1; element.pause(); }
    return () => { generation.current += 1; element.pause(); };
  }, [shouldPlay, failed, play]);

  useEffect(() => {
    const element = player.current;
    if (!element) return;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      setInView(Boolean(entry?.isIntersecting));
    }, { threshold: 0.1 });
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, []);

  if (failed) return <span className={styles.srOnly} role="status">{copy.fallback}</span>;
  return <>
    <video
      ref={player} id={id} className={`${styles.video} ${shown && loadSource ? styles.visible : ""}`}
      src={loadSource ? src : undefined} poster={CAFE_HERO_POSTER_SRC}
      muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1}
      disablePictureInPicture disableRemotePlayback
      onPlaying={() => {
        if (!wantsPlayback.current) { player.current?.pause(); return; }
        setShown(true); setPlaying(true);
      }}
      onPause={() => setPlaying(false)}
      onError={() => { generation.current += 1; setFailed(true); }}
    />
    <div className={`${styles.shade} ${shown && loadSource ? styles.visible : ""}`} aria-hidden="true" />
    <button type="button" className={styles.control} aria-controls={id} aria-label={playing ? copy.pauseLabel : copy.playLabel} onClick={() => {
      const element = player.current;
      if (!element) return;
      if (playing) {
        wantsPlayback.current = false; generation.current += 1; setIntent("pause"); element.pause();
      } else {
        setIntent("play"); wantsPlayback.current = true;
        // Attach media within the user's click when their preferences previously kept src absent.
        if (!element.getAttribute("src")) element.setAttribute("src", src);
        play(element);
      }
    }}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">{playing ? <path d="M4 3h3v10H4zm5 0h3v10H9z" fill="currentColor" /> : <path d="m5 2 9 6-9 6z" fill="currentColor" />}</svg>
      <span>{playing ? copy.pause : copy.play}</span>
    </button>
  </>;
}
