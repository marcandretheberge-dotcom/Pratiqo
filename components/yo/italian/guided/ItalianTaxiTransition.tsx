"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Play, ArrowRight } from "lucide-react";
import { useLearningFeedback } from "../../feedback/LearningFeedback";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import type { YoLocale } from "@/lib/yo/types";
import { primary, secondary } from "./copy";

export const ITALIAN_TAXI_CLIP = "/companion/travel/animations/yoppo-taxi-approved.mp4";

/** Optional transition into u08's transport mission. Playback never awards progress. */
export function ItalianTaxiTransition({ locale, onContinue }: { locale: YoLocale; onContinue: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const feedback = useLearningFeedback();
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(Boolean(reduce));
  const c = {
    fr: { title: "En route avec Yoppo", translation: "À la gare, s'il vous plaît.", skip: "Passer la vidéo", play: "Lire la vidéo", unavailable: "La vidéo ne peut pas être lue. Ta mission reste accessible." },
    en: { title: "On the way with Yoppo", translation: "To the station, please.", skip: "Skip video", play: "Play video", unavailable: "The video could not play. Your mission is still available." },
    es: { title: "En camino con Yoppo", translation: "A la estación, por favor.", skip: "Saltar el vídeo", play: "Reproducir vídeo", unavailable: "No se puede reproducir el vídeo. Tu misión sigue disponible." },
  }[locale];
  const rejected = useCallback((error: unknown) => {
    setPaused(true);
    // Mobile autoplay policy is not a broken clip: keep a user-initiated Play action.
    if (!(error instanceof DOMException && error.name === "NotAllowedError")) setFailed(true);
  }, []);

  function play() {
    const player = video.current;
    if (!player) return;
    stopLessonAudio();
    window.dispatchEvent(new Event("yo-arrival-playback-start"));
    setPaused(false);
    try { Promise.resolve(player.play()).catch(rejected); }
    catch (error) { rejected(error); }
  }
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    player.muted = !feedback.sound || feedback.volume === 0;
    player.volume = feedback.volume;
  }, [feedback.sound, feedback.volume]);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (reduce) player.pause();
    else {
      stopLessonAudio();
      window.dispatchEvent(new Event("yo-arrival-playback-start"));
      // Promise boundary handles both a rejected play and an older browser throwing.
      void Promise.resolve().then(() => player.play()).catch(rejected);
    }
    return () => player.pause();
  }, [reduce, rejected]);
  useEffect(() => {
    const stop = () => { video.current?.pause(); setPaused(true); };
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    window.addEventListener("yo-audio-stop", stop);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", stop); window.removeEventListener("yo-audio-stop", stop); };
  }, []);

  return <section data-yoppo-taxi-transition className="py-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{c.title}</h2>
      <button type="button" className={secondary} onClick={() => { video.current?.pause(); onContinue(); }}>{c.skip}<ArrowRight size={17} aria-hidden/></button>
    </div>
    {!failed ? <video ref={video} src={ITALIAN_TAXI_CLIP} playsInline preload="metadata" muted={!feedback.sound || feedback.volume === 0}
      poster="/companion/travel/animations/yoppo-taxi-approved.jpg" aria-label={c.title}
      className="aspect-video w-full rounded-lg bg-stone-100 object-contain" onEnded={onContinue}
      onError={() => { setFailed(true); setPaused(true); }}/>
      : <p role="status" className="my-8 text-sm">{c.unavailable}</p>}
    <p lang="it" className="mt-5 text-center text-xl font-bold">Alla stazione, per favore.</p>
    <p className="mt-2 text-center text-base">{c.translation}</p>
    {!failed && (paused || reduce) ? <button type="button" className={`${primary} mt-4`} onClick={play}><Play size={17} aria-hidden/>{c.play}</button> : null}
  </section>;
}
