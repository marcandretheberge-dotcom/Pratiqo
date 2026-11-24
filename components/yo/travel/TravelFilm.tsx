"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Pause, Play } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { filmForLeg, type TravelLeg } from "@/lib/yo/travelCinema";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useMapReducedMotion } from "../journey/map/useMapReducedMotion";
import { useLearningFeedback } from "../feedback/LearningFeedback";

const labels = {
  fr: { flight: "En avion", train: "En train", car: "En voiture", taxi: "En taxi", skip: "Passer", play: "Lire le film", pause: "Mettre en pause", next: "Continuer", error: "Le film est indisponible. Ton voyage peut continuer." },
  en: { flight: "By plane", train: "By train", car: "By car", taxi: "By taxi", skip: "Skip", play: "Play film", pause: "Pause", next: "Continue", error: "The film is unavailable. You can continue your journey." },
  es: { flight: "En avión", train: "En tren", car: "En coche", taxi: "En taxi", skip: "Saltar", play: "Reproducir el vídeo", pause: "Pausar", next: "Continuar", error: "El vídeo no está disponible. Puedes continuar el viaje." },
};

export function TravelFilm({ leg, locale, onArrival }: { leg: TravelLeg; locale: YoLocale; onArrival: () => void }) {
  const video = useRef<HTMLVideoElement>(null), title = useRef<HTMLHeadingElement>(null);
  const reduce = useMapReducedMotion();
  const { sound, volume } = useLearningFeedback();
  const [playing, setPlaying] = useState(false), [failed, setFailed] = useState(false);
  const done = useRef(false);
  const copy = labels[locale], film = filmForLeg(leg);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    if (video.current && !video.current.paused) video.current.pause();
    onArrival();
  };
  const play = useCallback((byGesture: boolean) => {
    const player = video.current;
    if (!player || done.current) return;
    stopLessonAudio();
    window.dispatchEvent(new Event("yo-arrival-playback-start"));
    player.muted = !sound || !volume;
    player.volume = volume;
    void Promise.resolve().then(() => {
      if (video.current === player && !done.current && !document.hidden) return player.play();
    }).catch(async () => {
      if (!byGesture && !player.muted && video.current === player && !done.current && !document.hidden) {
        player.muted = true;
        try { await player.play(); return; } catch { /* Show manual playback. */ }
      }
      // Autoplay and power-saving policies can require a tap on mobile.
      if (video.current === player && player.paused) setPlaying(false);
    });
  }, [sound, volume]);
  const initialPlay = useRef(play);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (!reduce) initialPlay.current(false);
    else if (!player.paused) player.pause();
    const hidden = () => { if (document.hidden) player.pause(); };
    const pause = () => player.pause();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pause);
      if (!player.paused) player.pause();
    };
  }, [reduce]);
  return <Dialog.Root open onOpenChange={open => { if (!open) finish(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="yo-film-shade"/>
      <Dialog.Content className="yo-film" data-travel-film={leg.mode} aria-describedby={undefined}
        onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus(); }}>
        <div className="yo-film-screen">
          <video ref={video} src={film.src} poster={film.poster} muted playsInline preload={reduce ? "none" : "auto"}
            aria-label={copy[leg.mode] + " · " + leg.to.city}
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={finish} onError={() => { setFailed(true); setPlaying(false); }}/>
          <button type="button" className="yo-film-skip" onClick={finish}>{copy.skip}<ArrowRight size={16} aria-hidden/></button>
        </div>
        <div className="yo-film-caption">
          <div><p>{copy[leg.mode]}</p><Dialog.Title ref={title} tabIndex={-1}>
            {leg.from && <>{leg.from.city}<span aria-hidden> → </span><span className="sr-only">, </span></>}{leg.to.city}
          </Dialog.Title></div>
          {failed ? <button type="button" className="yo-film-continue" onClick={finish}>{copy.next}</button>
            : <button type="button" className="yo-film-control" aria-label={playing ? copy.pause : copy.play}
                onClick={() => { if (playing) video.current?.pause(); else play(true); }}>
                {playing ? <Pause size={20} aria-hidden/> : <Play size={20} aria-hidden/>}
              </button>}
        </div>
        {failed && <p role="status" className="yo-film-error">{copy.error}</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
