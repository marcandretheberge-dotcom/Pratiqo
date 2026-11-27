"use client";

import Image from "next/image";
import { useRef, useState, type RefObject } from "react";
import { BookOpen, BriefcaseBusiness, Check, Compass, Leaf, MessageCircle, MessagesSquare, Pause, Plane, Play, RotateCcw, Users } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { useMapReducedMotion } from "../journey/map/useMapReducedMotion";
import { JournalMotion, journalPoster, type Gesture } from "./JournalMotion";

type Entry = { number: number; label: string };
export type WelcomeStep = "experience" | "goal" | "interests" | "time" | "pace" | "choice" | "check" | "result";
const motionLabels = {
  fr: { pause: "Mettre Yoppo en pause", play: "Relancer l’animation de Yoppo", loading: "Yoppo prépare ton parcours…" },
  en: { pause: "Pause Yoppo", play: "Resume Yoppo’s animation", loading: "Yoppo is preparing your journey…" },
  es: { pause: "Pausar a Yoppo", play: "Reanudar la animación de Yoppo", loading: "Yoppo prepara tu recorrido…" },
};
const blank: Entry = { number: 0, label: "" };

export function useYoppoJournal() {
  const [entry, setEntry] = useState(blank);
  return {
    entry,
    write(label: string) { setEntry(previous => ({ number: previous.number + 1, label })); },
    clear() { setEntry(previous => previous.label ? { ...previous, label: "" } : previous); },
  };
}

function JournalScene({ entry = blank, finished, locale, interactive = false }: {
  entry?: Entry; finished?: boolean; locale: YoLocale; interactive?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const sheets = useRef(new Map<string, Promise<HTMLImageElement>>());
  const reduceMotion = useMapReducedMotion();
  const copy = motionLabels[locale];
  const gesture: Gesture = finished ? "celebrate" : entry.label ? "write" : "listen";
  const allowMotion = interactive && !reduceMotion;

  return <div className="yj-scene" data-paused={paused || undefined}>
    <div className="yj-figure" aria-hidden="true" data-journal-figure>
      <Image src={journalPoster} width={960} height={400} unoptimized alt="" loading="eager" fetchPriority="high" draggable={false}/>
      {allowMotion && <JournalMotion key={gesture + entry.number} gesture={gesture}
        paused={paused} cache={sheets}/>}
    </div>
    {entry.label && <span aria-hidden="true" key={entry.number} className="yj-receipt"><Check size={14} strokeWidth={2.5}/>{entry.label}</span>}
    {allowMotion && <button type="button" className="yj-motion" aria-label={paused ? copy.play : copy.pause}
      onClick={() => setPaused(value => !value)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>}
  </div>;
}

export function YoppoWelcomeGuide({ title, language, locale, step, entry, headingRef }: {
  title: string; language: string; locale: YoLocale; step: WelcomeStep; entry: Entry; headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const progress = step === "experience" ? 1 : step === "goal" ? 2 : step === "interests" ? 3 : 4;
  const done = step === "result";
  const stepLabel = { fr: "Étape", en: "Step", es: "Paso" }[locale];
  return <header className="yj-header">
    <div className="yj-mast"><span><BookOpen size={16} strokeWidth={1.7}/> Yoppo <i aria-hidden="true">/</i> {language}</span>
      <span className="yj-progress" role="img" aria-label={`${stepLabel} ${progress} / 4`}>
        {[1, 2, 3, 4].map(n => <i key={n} data-current={n <= progress || undefined}/>)}
      </span>
    </div>
    <JournalScene locale={locale} entry={entry} finished={done} interactive/>
    <h1 tabIndex={-1} ref={headingRef} className="yj-heading">{title}</h1>
  </header>;
}

export function YoppoWelcomeLoading({ locale }: { locale: YoLocale }) {
  return <main lang={locale} className="yj-welcome yj-loading">
    <div className="yj-page"><JournalScene locale={locale}/><p role="status">{motionLabels[locale].loading}</p></div>
  </main>;
}


const choiceIcons = {
  new: Leaf, words: MessageCircle, some: MessageCircle, confident: MessagesSquare,
  conversation: MessagesSquare, rusty: RotateCcw, unsure: Compass, travel: Plane,
  family: Users, work: BriefcaseBusiness, thorough: BookOpen,
};
export function JournalChoice({ kind, label, onPick }: {
  kind: keyof typeof choiceIcons; label: string; onPick: () => void;
}) {
  const Icon = choiceIcons[kind];
  return <button className="yj-option" type="button" onClick={onPick}>
    <span className="yj-option-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.7}/></span>{label}
  </button>;
}
