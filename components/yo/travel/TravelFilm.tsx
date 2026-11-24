"use client";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { filmForLeg, type TravelLeg } from "@/lib/yo/travelCinema";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useMapReducedMotion } from "../journey/map/useMapReducedMotion";
import { useLearningFeedback } from "../feedback/LearningFeedback";

const labels = {
  fr: { flight: "En avion", train: "En train", car: "En voiture", taxi: "En taxi", skip: "Passer", play: "Lire le film", pause: "Mettre en pause", next: "Continuer", sound: "Activer le son du film", mute: "Couper le son du film", error: "Le film est indisponible. Ton voyage peut continuer." },
  en: { flight: "By plane", train: "By train", car: "By car", taxi: "By taxi", skip: "Skip", play: "Play film", pause: "Pause", next: "Continue", sound: "Turn film sound on", mute: "Mute film", error: "The film is unavailable. You can continue your journey." },
  es: { flight: "En avión", train: "En tren", car: "En coche", taxi: "En taxi", skip: "Saltar", play: "Reproducir el vídeo", pause: "Pausar", next: "Continuar", sound: "Activar el sonido del vídeo", mute: "Silenciar el vídeo", error: "El vídeo no está disponible. Puedes continuar el viaje." },
};

export function TravelFilm({ leg, locale, onArrival }: { leg: TravelLeg; locale: YoLocale; onArrival: () => void }) {
  const [player, setPlayer] = useState<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [audible, setAudible] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const done = useRef(false);
  const reduce = useMapReducedMotion();
  const { sound, volume } = useLearningFeedback();
  const copy = labels[locale], film = filmForLeg(leg);
  const canUseSound = sound && volume > 0;
  const muted = !canUseSound || !audible;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    player?.pause();
    onArrival();
  };

  useEffect(() => { if (player) player.volume = volume; }, [player, volume]);
  useEffect(() => {
    if (!player) return;
    // The dialog's portal mounts after its owner. Start only once the video is attached.
    if (reduce || document.hidden) player.pause();
    else void player.play().catch(() => { /* A browser can require a tap. */ });
    const pause = () => player.pause();
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pause);
      pause();
    };
  }, [player, reduce]);

  return <Dialog.Root open onOpenChange={open => { if (!open) finish(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="yo-film-shade"/>
      <Dialog.Content className="yo-film" data-travel-film={leg.mode} aria-describedby={undefined}
        onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus(); }}>
        <div className="yo-film-screen">
          <video ref={setPlayer} src={film.src} poster={film.poster} autoPlay={!reduce} muted={muted} playsInline preload={reduce ? "none" : "auto"}
            aria-label={copy[leg.mode] + " · " + leg.to.city}
            onPlay={() => { stopLessonAudio(); window.dispatchEvent(new Event("yo-arrival-playback-start")); }}
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={finish} onError={() => { setFailed(true); setPlaying(false); }}/>
          <button type="button" className="yo-film-skip" onClick={finish}>{copy.skip}<ArrowRight size={16} aria-hidden/></button>
        </div>
        <div className="yo-film-caption">
          <div><p>{copy[leg.mode]}</p><Dialog.Title ref={title} tabIndex={-1}>
            {leg.from && <>{leg.from.city}<span aria-hidden> → </span><span className="sr-only">, </span></>}{leg.to.city}
          </Dialog.Title></div>
          {failed ? <button type="button" className="yo-film-continue" onClick={finish}>{copy.next}</button>
            : <div className="yo-film-controls">
                {canUseSound && <button type="button" className="yo-film-control" aria-label={muted ? copy.sound : copy.mute}
                  onClick={() => { if (player) player.muted = !muted; setAudible(muted); }}>
                  {muted ? <VolumeX size={18} aria-hidden/> : <Volume2 size={18} aria-hidden/>}
                </button>}
                <button type="button" className="yo-film-control" aria-label={playing ? copy.pause : copy.play}
                  onClick={() => { if (playing) player?.pause(); else void player?.play().catch(() => { if (player.error) setFailed(true); }); }}>
                  {playing ? <Pause size={20} aria-hidden/> : <Play size={20} aria-hidden/>}
                </button>
              </div>}
        </div>
        {failed && <p role="status" className="yo-film-error">{copy.error}</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
