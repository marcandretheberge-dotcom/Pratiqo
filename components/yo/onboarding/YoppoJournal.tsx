"use client";

import Image from "next/image";
import { useId, useState, type RefObject } from "react";
import { BookOpen, BriefcaseBusiness, Check, Compass, Leaf, MessageCircle, MessagesSquare, Pause, Plane, Play, RotateCcw, Users } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";

const atlas = "/companion/travel/journal/yoppo-journal.webp";
type Entry = { number: number; label: string };
export type WelcomeStep = "experience" | "goal" | "time" | "pace" | "choice" | "check" | "result";
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

function JournalFigure({ entry, finished = false }: { entry: Entry; finished?: boolean }) {
  const uid = useId();
  return <div className="yj-figure" aria-hidden="true" data-journal-figure>
    <div className="yj-character" key={entry.number} data-gesture={entry.label ? "write" : "listen"} data-finished={finished || undefined}>
      <span className="yj-body">
        <Image src={atlas} width={864} height={864} alt="" unoptimized loading="eager" fetchPriority="high" draggable={false} />
      </span>
      <div className="yj-face-position"><div className="yj-face-attention"><div className="yj-face">
        <svg viewBox="168 12 610 576" preserveAspectRatio="none" className="yj-eyes" focusable="false">
          <defs>
            <clipPath id={uid + "-whites"}>
              <path d="M292 380C296 347 319 327 348 335C373 339 391 357 388 389C385 422 364 436 337 432C306 431 288 413 292 380Z M526 390C532 356 552 341 578 351C607 356 625 375 621 408C619 438 599 452 571 449C538 448 519 424 526 390Z"/>
            </clipPath>
            <clipPath id={uid + "-irises"}>
              <ellipse cx="348" cy="387.5" rx="41.5" ry="47" transform="rotate(13 348 387.5)"/>
              <ellipse cx="565.5" cy="402" rx="41.5" ry="48" transform="rotate(-9 565.5 402)"/>
            </clipPath>
            <clipPath id={uid + "-eyes"}>
              <path d="M281 374C284 294 392 304 394 384C396 450 294 461 282 399Z M520 389C520 313 624 316 632 389C640 464 545 480 522 420Z"/>
            </clipPath>
            <linearGradient id={uid + "-lid"} x2=".2" y2="1">
              <stop stopColor="#fff3dd"/><stop offset="1" stopColor="#f6dfbd"/>
            </linearGradient>
          </defs>
          <g clipPath={`url(#${uid}-whites)`}>
            <path fill="#fff9ed" d="M282 325h350v132H282z"/>
            <g className="yj-gaze-cue"><g className="yj-gaze">
              <g clipPath={`url(#${uid}-irises)`}><image href={atlas} width="1254" height="1254"/></g>
            </g></g>
          </g>
          <g clipPath={`url(#${uid}-eyes)`}><g className="yj-lids">
            <path d="M272 300H642V455Q601 468 518 459L402 448Q330 454 272 441Z" fill={`url(#${uid}-lid)`}/>
            <path d="M289 389Q335 420 384 386M528 402Q571 432 622 400" fill="none" stroke="#604c3c" strokeWidth="6" strokeLinecap="round"/>
          </g></g>
        </svg>
      </div></div></div>
      <svg className="yj-ink" viewBox="0 0 400 484" fill="none" strokeLinecap="round" focusable="false">
        <path d="M109 293q10-1 18-3m-15 11 17-3" stroke="#ba9b64" strokeWidth="1.2" />
        <path className="yj-ink-stroke" d="M148 307l4-4 1 6 5-7 1 5 5-5 2 3 6-4 3 1 5-3" pathLength="1" stroke="#286c64" strokeWidth="2.2"/>
      </svg>
      <div className="yj-arm-position"><div className="yj-arm-attention"><span className="yj-writing-paw"/></div></div>
    </div>
  </div>;
}

function FieldScenery() {
  return <svg className="yj-scenery" viewBox="0 0 560 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <g fill="none" stroke="#78a999" strokeWidth="1" opacity=".42">
      <path d="M-32 118c36-32 60-33 89-27s43 23 77 13 59-39 90-36M-27 128c39-35 62-34 92-26s44 20 76 9 58-36 87-34M-24 139c41-37 68-36 96-28s43 17 74 5 55-30 78-29"/>
      <path d="M372 99c36-10 44-53 83-62s68-5 120-44M377 107c43-12 43-53 84-61s70-6 122-44M388 113c43-16 42-49 80-56s71-11 121-44"/>
    </g>
    <path d="M-9 164c55 10 76-36 105-28s18 34 0 30 0-44 42-43m268 6c34-5 33-43 71-34" fill="none" stroke="#9a7e4a" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" opacity=".63"/>
    <circle cx="478" cy="95" r="3.5" fill="#f6e4b9" stroke="#9a7e4a" strokeWidth="1.4"/>
  </svg>;
}

function JournalScene({ entry = blank, finished, locale, interactive = false }: {
  entry?: Entry; finished?: boolean; locale: YoLocale; interactive?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const copy = motionLabels[locale];
  return <div className="yj-scene" data-paused={paused || undefined}>
    <FieldScenery/>
    <JournalFigure entry={entry} finished={finished}/>
    {entry.label && <span aria-hidden="true" key={entry.number} className="yj-receipt"><Check size={14} strokeWidth={2.5}/>{entry.label}</span>}
    {interactive && <button type="button" className="yj-motion" aria-label={paused ? copy.play : copy.pause}
      onClick={() => setPaused(!paused)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>}
  </div>;
}

export function YoppoWelcomeGuide({ title, language, locale, step, entry, headingRef }: {
  title: string; language: string; locale: YoLocale; step: WelcomeStep; entry: Entry; headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const progress = step === "experience" ? 1 : step === "goal" ? 2 : 3;
  const done = step === "result";
  const stepLabel = { fr: "Étape", en: "Step", es: "Paso" }[locale];
  return <header className="yj-header">
    <div className="yj-mast"><span><BookOpen size={16} strokeWidth={1.7}/> Yoppo <i aria-hidden="true">/</i> {language}</span>
      <span className="yj-progress" role="img" aria-label={`${stepLabel} ${progress} / 3`}>
        {[1, 2, 3].map(n => <i key={n} data-current={n <= progress || undefined}/>)}
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
