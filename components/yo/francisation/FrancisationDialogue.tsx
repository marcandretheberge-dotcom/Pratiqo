"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import type { FrancisationClip } from "@/lib/yo/francisation/audio";

/** Published recordings only. Loading this component never starts playback. */
export function FrancisationDialogue({ clips, title }: { clips: readonly FrancisationClip[]; title: string }) {
  const players = useRef<(HTMLAudioElement | null)[]>([]);
  const activeIndex = useRef(0);
  const continuous = useRef(false);
  const request = useRef(0);
  const mounted = useRef(true);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    // Ref callbacks clear the live array before passive unmount cleanup runs.
    const audioElements = players.current.slice();
    function stop() {
      request.current += 1;
      continuous.current = false;
      audioElements.forEach(player => player?.pause());
      if (mounted.current) setPlaying(false);
    }
    function hide() { if (document.hidden) stop(); }
    window.addEventListener("yo-audio-stop", stop);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      window.removeEventListener("yo-audio-stop", stop);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hide);
      stop();
    };
  }, []);

  function pause() {
    request.current += 1;
    continuous.current = false;
    players.current.forEach(player => player?.pause());
    setPlaying(false);
  }

  async function playAt(next: number, all: boolean, restart = true) {
    const player = players.current[next];
    if (!player || !clips[next]) return;
    const generation = ++request.current;
    continuous.current = all;
    activeIndex.current = next;
    players.current.forEach((other, i) => { if (i !== next) other?.pause(); });
    setIndex(next);
    setFinished(false);
    setMessage("");
    if (restart) player.currentTime = 0;
    try {
      await player.play();
      if (!mounted.current || generation !== request.current) return;
      setPlaying(true);
    } catch {
      if (!mounted.current || generation !== request.current) return;
      continuous.current = false;
      setPlaying(false);
      setMessage("Appuie sur Lecture pour écouter cette réplique. Tu peux aussi lire le dialogue.");
    }
  }

  function ended(endedIndex: number) {
    if (endedIndex !== activeIndex.current || !mounted.current || !players.current[endedIndex]?.ended) return;
    if (continuous.current && endedIndex + 1 < clips.length) {
      void playAt(endedIndex + 1, true);
      return;
    }
    continuous.current = false;
    setPlaying(false);
    setFinished(endedIndex === clips.length - 1);
  }

  return <section aria-label={title} className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
    <div className="flex items-center gap-2 text-emerald-950"><Headphones size={20} aria-hidden/><h2 className="font-bold">{title}</h2></div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        onClick={() => playing ? pause() : void playAt(finished ? 0 : index, true, finished)}>
        {playing ? <Pause size={18} aria-hidden/> : <Play size={18} aria-hidden/>}
        {playing ? "Pause" : finished ? "Réécouter le dialogue" : "Écouter le dialogue"}
      </button>
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100"
        onClick={() => void playAt(0, true)}><RotateCcw size={16} aria-hidden/>Depuis le début</button>
    </div>
    {clips.map((clip, i) => <audio key={clip.id} ref={player => { players.current[i] = player; }}
      controls preload="none" src={clip.src} aria-label={`Enregistrement : ${clip.speaker}, réplique ${i + 1}`}
      className={i === index ? "block h-10 w-full max-w-full" : "hidden"}
      onPlay={event => {
        if (!mounted.current || i !== activeIndex.current || event.currentTarget.paused) {
          event.currentTarget.pause();
          return;
        }
        activeIndex.current = i;
        setIndex(i);
        players.current.forEach((other, otherIndex) => { if (otherIndex !== i) other?.pause(); });
        setPlaying(true);
        setFinished(false);
        setMessage("");
      }}
      onPause={event => { if (i === activeIndex.current && mounted.current && event.currentTarget.paused) setPlaying(false); }}
      onEnded={() => ended(i)}
      onError={() => {
        if (i !== activeIndex.current || !mounted.current) return;
        continuous.current = false;
        setPlaying(false);
        setMessage("Cet enregistrement est indisponible. Tu peux continuer avec la transcription ci-dessous.");
      }}/>) }
    {message && <p role="status" className="text-sm text-emerald-950">{message}</p>}
    <p className="text-xs text-emerald-900">Transcription synchronisée · Réplique {index + 1} sur {clips.length}</p>
    <ol className="space-y-2" aria-label="Transcription du dialogue">
      {clips.map((clip, i) => <li key={clip.id} aria-current={i === index ? "step" : undefined}
        className={`flex items-start gap-2 rounded-xl border p-3 ${i === index ? "border-emerald-600 bg-white" : "border-transparent"}`}>
        <button type="button" aria-label={`Écouter la réplique ${i + 1} de ${clip.speaker}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-emerald-900 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          onClick={() => void playAt(i, false)}><Volume2 size={18} aria-hidden/></button>
        <div className="min-w-0"><p className="text-sm font-bold text-emerald-950">{clip.speaker}</p><p className="break-words">{clip.text}</p></div>
      </li>)}
    </ol>
    <p className="text-xs text-emerald-900">Voix de synthèse en français canadien. Tu peux réécouter chaque réplique à ton rythme.</p>
  </section>;
}
