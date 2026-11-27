"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Captions, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CinemaFilmAsset, MissionCinemaKind, TravelMode } from "@/lib/yo/travelCinema";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useMapReducedMotion } from "../journey/map/useMapReducedMotion";
import { useCinemaSound } from "./useCinemaSound";
import { clearCinemaPlayback, readCinemaPlayback, saveCinemaPlayback } from "./cinemaPlayback";

const labels = {
  fr: { skip: "Passer", play: "Lire le film", pause: "Mettre en pause", next: "Continuer", sound: "Activer le son du film", mute: "Couper le son du film", captions: "Sous-titres descriptifs", unavailable: "Le film est indisponible. Tu peux continuer.", offline: "Hors connexion. Tu peux continuer sans le film.", slow: "Le film prend du temps à charger. Tu peux continuer.", tap: "Touche Lecture pour lancer le film.", still: "Tu peux lire le film ou continuer à ton rythme." },
  en: { skip: "Skip", play: "Play film", pause: "Pause", next: "Continue", sound: "Turn film sound on", mute: "Mute film", captions: "Descriptive captions", unavailable: "The film is unavailable. You can continue.", offline: "You are offline. You can continue without the film.", slow: "The film is taking a while to load. You can continue.", tap: "Tap Play to start the film.", still: "Play the film or continue at your own pace." },
  es: { skip: "Saltar", play: "Reproducir el vídeo", pause: "Pausar", next: "Continuar", sound: "Activar el sonido del vídeo", mute: "Silenciar el vídeo", captions: "Subtítulos descriptivos", unavailable: "El vídeo no está disponible. Puedes continuar.", offline: "Sin conexión. Puedes continuar sin el vídeo.", slow: "El vídeo tarda en cargar. Puedes continuar.", tap: "Toca Reproducir para iniciar el vídeo.", still: "Puedes reproducir el vídeo o continuar a tu ritmo." },
};

type Connection = { saveData?: boolean; addEventListener?: (name: string, callback: () => void) => void; removeEventListener?: (name: string, callback: () => void) => void };
function connection() { return (navigator as Navigator & { connection?: Connection }).connection; }
function networkSnapshot() { return navigator.onLine === false ? "offline" : connection()?.saveData ? "save-data" : "online"; }
function subscribeNetwork(changed: () => void) {
  window.addEventListener("online", changed); window.addEventListener("offline", changed);
  const value = connection(); value?.addEventListener?.("change", changed);
  return () => { window.removeEventListener("online", changed); window.removeEventListener("offline", changed); value?.removeEventListener?.("change", changed); };
}

type Props = {
  id: string; film: CinemaFilmAsset; locale: YoLocale; eyebrow: string; title: string; caption: string;
  travelMode?: TravelMode; missionKind?: MissionCinemaKind; onFinish: () => void;
};

/** A skippable presentation surface. It never reads or changes learning, rewards, or access. */
export function CinemaPlayer({ id, film, locale, eyebrow, title, caption, travelMode, missionKind, onFinish }: Props) {
  const [player, setPlayer] = useState<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [failure, setFailure] = useState<"unavailable" | "slow" | null>(null);
  const [tapRequired, setTapRequired] = useState(false), [audible, setAudible] = useState(true), [captions, setCaptions] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null), returnFocus = useRef<HTMLElement | null>(null), media = useRef<HTMLVideoElement | null>(null), done = useRef(false), attempted = useRef(false), savedSecond = useRef(-1);
  const reduce = useMapReducedMotion(), network = useSyncExternalStore(subscribeNetwork, networkSnapshot, () => "online");
  const { ready: soundReady, sound, volume } = useCinemaSound();
  const copy = labels[locale], offline = network === "offline", canUseSound = soundReady && sound && volume > 0;
  const muted = !canUseSound || !audible, playable = Boolean(film.src) && !offline;
  const attachPlayer = useCallback((element: HTMLVideoElement | null) => { media.current = element; setPlayer(element); }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    player?.pause();
    clearCinemaPlayback(id);
    onFinish();
  }, [id, player, onFinish]);

  const play = useCallback(() => {
    if (!player || !film.src || !soundReady || network === "offline" || done.current) return;
    attempted.current = true;
    stopLessonAudio();
    setFailure(null); setTapRequired(false); setPhase("loading");
    try {
      void player.play().catch(() => {
        if (done.current) return;
        setPhase("paused");
        if (player.error) setFailure("unavailable"); else setTapRequired(true);
      });
    } catch { setPhase("paused"); setTapRequired(true); }
  }, [player, film.src, network, soundReady]);

  useEffect(() => {
    stopLessonAudio();
    window.dispatchEvent(new Event("yo-cinema-open"));
    return () => { window.dispatchEvent(new Event("yo-cinema-close")); };
  }, []);
  useEffect(() => { if (media.current) media.current.volume = volume; }, [player, volume]);
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    if (!soundReady || reduce || network !== "online" || document.hidden) player.pause();
    else queueMicrotask(() => { if (!cancelled && !attempted.current) play(); });
    const pause = () => player.pause();
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", onVisibility); window.addEventListener("pagehide", pause);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", pause);
      if (!done.current && film.src) saveCinemaPlayback(id, film.src, player.currentTime);
      pause();
    };
  }, [id, player, film.src, reduce, network, play, soundReady]);
  useEffect(() => {
    if (phase !== "loading") return;
    const timeout = window.setTimeout(() => { setFailure("slow"); setPhase("paused"); player?.pause(); }, 8000);
    return () => window.clearTimeout(timeout);
  }, [phase, player]);

  function restorePosition(element: HTMLVideoElement) {
    if (!film.src || !Number.isFinite(element.duration)) return;
    const saved = readCinemaPlayback(id, film.src);
    if (saved > 0) { try { element.currentTime = Math.min(saved, Math.max(0, element.duration - 0.2)); } catch { /* Seeking can be unavailable on a slow connection. */ } }
  }
  const notice = !film.src ? null : offline ? copy.offline : failure ? copy[failure] : tapRequired ? copy.tap : reduce || network === "save-data" ? copy.still : null;

  return <Dialog.Root open onOpenChange={open => { if (!open) finish(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="yo-film-shade"/>
      <Dialog.Content className="yo-film" data-travel-film={travelMode} data-mission-film={missionKind} data-cinema-id={id}
        onOpenAutoFocus={event => { event.preventDefault(); returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; heading.current?.focus(); }}
        onCloseAutoFocus={event => { if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus({ preventScroll: true }); } }}>
        <div className="yo-film-screen" style={{ aspectRatio: film.aspectRatio ?? 3 / 2 }}>
          <video ref={attachPlayer} src={playable ? film.src! : undefined} poster={film.poster} muted={muted} playsInline preload={reduce || network !== "online" ? "none" : "metadata"}
            aria-label={`${eyebrow} · ${title}`}
            onPlay={() => { stopLessonAudio(); window.dispatchEvent(new Event("yo-arrival-playback-start")); }}
            onLoadedMetadata={event => restorePosition(event.currentTarget)}
            onPlaying={() => { setPhase("playing"); setFailure(null); setTapRequired(false); }} onPause={() => setPhase("paused")}
            onWaiting={() => { if (!player?.paused) setPhase("loading"); }} onStalled={() => { if (!player?.paused) setPhase("loading"); }}
            onTimeUpdate={() => { if (!done.current && player && film.src && Math.floor(player.currentTime) !== savedSecond.current) { savedSecond.current = Math.floor(player.currentTime); saveCinemaPlayback(id, film.src, player.currentTime); } }}
            onEnded={finish} onError={() => { setFailure("unavailable"); setPhase("paused"); }}/>
          <button type="button" className="yo-film-skip" onClick={finish}>{copy.skip}<ArrowRight size={16} aria-hidden/></button>
          <Dialog.Description data-cinema-caption className={captions ? "yo-film-subtitles" : "sr-only"}>{caption}</Dialog.Description>
        </div>
        <div className="yo-film-caption">
          <div className="yo-film-heading"><p>{eyebrow}</p><Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title></div>
          <div className="yo-film-controls">
            <button type="button" className="yo-film-control" aria-label={copy.captions} aria-pressed={captions} onClick={() => setCaptions(value => !value)}><Captions size={19} aria-hidden/></button>
            {playable && canUseSound && <button type="button" className="yo-film-control" aria-label={muted ? copy.sound : copy.mute} onClick={() => setAudible(muted)}>{muted ? <VolumeX size={18} aria-hidden/> : <Volume2 size={18} aria-hidden/>}</button>}
            {playable && <button type="button" className="yo-film-control" aria-label={phase === "playing" ? copy.pause : copy.play} onClick={() => { if (phase === "playing") player?.pause(); else play(); }}>{phase === "playing" ? <Pause size={20} aria-hidden/> : <Play size={20} aria-hidden/>}</button>}
          </div>
        </div>
        {notice && <p role="status" className="yo-film-error">{notice}</p>}
        <div className="yo-film-footer"><button type="button" className="yo-film-continue" onClick={finish}>{copy.next}<ArrowRight size={16} aria-hidden/></button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
