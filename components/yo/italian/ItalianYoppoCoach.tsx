"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, EyeOff, Lightbulb, Minus, RotateCcw, Sparkles } from "lucide-react";

import { useCourseLanguage } from "./ItalianAudioProvider";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { YoLocale } from "@/lib/yo/types";

type Localized = Record<YoLocale, string>;
export type ItalianYoppoAction = "hint" | "explain" | "retry" | "review" | "challenge";
export interface ItalianYoppoCoachProps {
  locale: YoLocale;
  contextId: string;
  message: Localized;
  hint: Localized;
  hint2?: Localized;
  explanation: Localized;
  visualState?: CompanionVisualState;
  example?: { it: string; meaning: Localized };
  /** Optional recorded-audio control supplied by the lesson; no voice generation here. */
  exampleAudio?: ReactNode;
  onAction?: (action: ItalianYoppoAction) => void;
  canRetry?: boolean;
  reviewCount?: number;
  completedCount?: number;
  totalCount?: number;
}

type Point = { x: number; y: number };
type Viewport = { left: number; top: number; width: number; height: number };
type Support = { context: string; message: string; level: 1 | 2; kind: "hint" | "explain" | "example" };
type Drag = { id: number; start: Point; origin: Point; moved: boolean };
const PREFERENCES_KEY = "yopratiqo:italian:yoppo-preferences:v1";
const SIZE = 88;
const EDGE = 12;
const BOTTOM = 104;

const COPY = {
  fr: {
    open: "Ouvrir Yoppo", minimize: "Réduire Yoppo", hide: "Masquer Yoppo", restore: "Retrouver Yoppo",
    title: "On joue ensemble ?", subtitle: "Yoppo · ton compagnon italien", hint: "Un indice", hint2: "Un autre indice", explain: "Explique-moi", example: "Un exemple",
    firstHint: "Une petite piste", nextHint: "Regarde ce détail", explanation: "On comprend ensemble", exampleTitle: "À toi de t’en inspirer", back: "Revenir à la mission",
    hintBeforeExplanation: "Commence par un indice pour chercher toi-même.", retry: "Je réessaie", review: "Mes révisions", challenge: "Défie-moi !", challengeDetail: "Un petit défi à ton rythme",
    progress: "Étapes réussies", position: "Déplacer Yoppo", reset: "Replacer Yoppo", left: "Déplacer Yoppo à gauche", right: "Déplacer Yoppo à droite", up: "Déplacer Yoppo vers le haut", down: "Déplacer Yoppo vers le bas",
    keyboard: "Fais glisser Yoppo. Au clavier : flèches pour le déplacer, Maj + flèche pour aller plus loin, Début pour le replacer, Échap pour réduire l’aide.", meaning: "Sens", support: "Aide progressive",
  },
  en: {
    open: "Open Yoppo", minimize: "Minimize Yoppo", hide: "Hide Yoppo", restore: "Bring Yoppo back",
    title: "Shall we play?", subtitle: "Yoppo · your Italian companion", hint: "A hint", hint2: "Another hint", explain: "Explain it", example: "An example",
    firstHint: "A little clue", nextHint: "Notice this detail", explanation: "Let’s work it out", exampleTitle: "Something to build on", back: "Back to the mission",
    hintBeforeExplanation: "Start with a hint and try to work it out.", retry: "Try again", review: "My review", challenge: "Challenge me!", challengeDetail: "A little challenge at your pace",
    progress: "Steps completed", position: "Move Yoppo", reset: "Reset Yoppo’s position", left: "Move Yoppo left", right: "Move Yoppo right", up: "Move Yoppo up", down: "Move Yoppo down",
    keyboard: "Drag Yoppo. With the keyboard: arrows to move, Shift + arrow to move farther, Home to reset and Escape to minimize help.", meaning: "Meaning", support: "Step-by-step help",
  },
  es: {
    open: "Abrir a Yoppo", minimize: "Minimizar a Yoppo", hide: "Ocultar a Yoppo", restore: "Recuperar a Yoppo",
    title: "¿Jugamos juntos?", subtitle: "Yoppo · tu compañero de italiano", hint: "Una pista", hint2: "Otra pista", explain: "Explícamelo", example: "Un ejemplo",
    firstHint: "Una pequeña pista", nextHint: "Fíjate en este detalle", explanation: "Vamos a entenderlo", exampleTitle: "Un ejemplo para inspirarte", back: "Volver a la misión",
    hintBeforeExplanation: "Empieza con una pista e intenta resolverlo.", retry: "Lo intento de nuevo", review: "Mis repasos", challenge: "¡Ponme a prueba!", challengeDetail: "Un pequeño reto a tu ritmo",
    progress: "Etapas superadas", position: "Mover a Yoppo", reset: "Restablecer la posición de Yoppo", left: "Mover a Yoppo a la izquierda", right: "Mover a Yoppo a la derecha", up: "Mover a Yoppo hacia arriba", down: "Mover a Yoppo hacia abajo",
    keyboard: "Arrastra a Yoppo. Con el teclado: flechas para moverlo, Mayús + flecha para avanzar más, Inicio para restablecer y Escape para minimizar la ayuda.", meaning: "Significado", support: "Ayuda progresiva",
  },
} as const;

function viewportNow(): Viewport {
  const visual = window.visualViewport;
  return { left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0, width: visual?.width || window.innerWidth, height: visual?.height || window.innerHeight };
}

function clamp(point: Point, viewport: Viewport): Point {
  const minX = viewport.left + EDGE;
  const minY = viewport.top + EDGE;
  return {
    x: Math.max(minX, Math.min(point.x, Math.max(minX, viewport.left + viewport.width - SIZE - EDGE))),
    y: Math.max(minY, Math.min(point.y, Math.max(minY, viewport.top + viewport.height - SIZE - BOTTOM - EDGE))),
  };
}

function home(viewport: Viewport): Point {
  return clamp({ x: viewport.left + viewport.width, y: viewport.top + viewport.height }, viewport);
}

function readPreferences(): { point: Point | null; hidden: boolean } {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { point: null, hidden: false };
    const value = raw as Record<string, unknown>;
    if (value.version !== 1) return { point: null, hidden: false };
    const valid = typeof value.x === "number" && Number.isFinite(value.x) && typeof value.y === "number" && Number.isFinite(value.y);
    return { point: valid ? { x: value.x as number, y: value.y as number } : null, hidden: value.hidden === true };
  } catch { return { point: null, hidden: false }; }
}

function remember(point: Point, hidden: boolean) {
  try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, x: point.x, y: point.y, hidden })); }
  catch { /* Storage is optional; all controls keep working. No answers or lesson text are saved here. */ }
}

function panelStyle(point: Point, viewport: Viewport): CSSProperties {
  const width = Math.min(360, Math.max(160, viewport.width - EDGE * 2));
  const left = Math.max(viewport.left + EDGE, Math.min(point.x + SIZE - width, viewport.left + viewport.width - width - EDGE));
  const above = point.y - viewport.top - EDGE * 2;
  const below = viewport.top + viewport.height - BOTTOM - point.y - SIZE - EDGE * 2;
  const maxHeight = Math.max(80, Math.min(560, viewport.height - BOTTOM - EDGE * 2));
  if (Math.max(above, below) < 220) return { left, top: viewport.top + EDGE, width, maxHeight };
  return above >= below
    ? { left, top: point.y - EDGE, transform: "translateY(-100%)", width, maxHeight: Math.min(maxHeight, above) }
    : { left, top: point.y + SIZE + EDGE, width, maxHeight: Math.min(maxHeight, below) };
}

/** A floating, learner-controlled companion. The lesson owns assessment and progress. */
export function ItalianYoppoCoach({
  locale, contextId, message, hint, hint2, explanation, visualState = "idle", example, exampleAudio, onAction,
  canRetry = false, reviewCount = 0, completedCount = 0, totalCount = 0,
}: ItalianYoppoCoachProps) {
  const language = useCourseLanguage();
  const copy = language === "de" ? { ...COPY[locale], subtitle: { fr: "Yoppo · ton compagnon allemand", en: "Yoppo · your German companion", es: "Yoppo · tu compañero de alemán" }[locale] } : COPY[locale];
  const panelId = useId();
  const headingId = useId();
  const instructionsId = useId();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [support, setSupport] = useState<Support | null>(null);
  const [wave, setWave] = useState(0);
  const pointRef = useRef(point);
  const viewportRef = useRef<Viewport | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusTarget = useRef<"avatar" | "restore" | "heading" | null>(null);
  const messageKey = `${message.fr}\u0000${message.en}\u0000${message.es}`;
  const activeSupport = support?.context === contextId && support.message === messageKey ? support : null;
  const hasHint = hint[locale].trim().length > 0;
  const canExplain = !hasHint || activeSupport !== null;

  useEffect(() => {
    const view = viewportNow();
    const pref = readPreferences();
    const initial = clamp(pref.point ?? home(view), view);
    viewportRef.current = view;
    pointRef.current = initial;
    setViewport(view);
    setPoint(initial);
    setHidden(pref.hidden);
    const resize = () => {
      const nextView = viewportNow();
      const nextPoint = clamp(pointRef.current, nextView);
      viewportRef.current = nextView;
      pointRef.current = nextPoint;
      setViewport(nextView);
      setPoint(nextPoint);
      dragRef.current = null;
    };
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", resize);
    visualViewport?.addEventListener("resize", resize);
    visualViewport?.addEventListener("scroll", resize);
    return () => {
      window.removeEventListener("resize", resize);
      visualViewport?.removeEventListener("resize", resize);
      visualViewport?.removeEventListener("scroll", resize);
      if (suppressTimer.current !== null) clearTimeout(suppressTimer.current);
    };
  }, []);

  // Revisiting an earlier activity must not resurrect its previously revealed answer.
  useEffect(() => { setSupport(null); }, [contextId, messageKey]);

  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === "heading") headingRef.current?.focus();
    if (target === "avatar") avatarRef.current?.focus();
    if (target === "restore") restoreRef.current?.focus();
  }, [expanded, hidden]);

  function move(next: Point, persist = true) {
    if (!viewportRef.current) return;
    const bounded = clamp(next, viewportRef.current);
    pointRef.current = bounded;
    setPoint(bounded);
    if (persist) remember(bounded, hidden);
  }
  function moveBy(x: number, y: number) { move({ x: pointRef.current.x + x, y: pointRef.current.y + y }); }
  function resetPosition() { if (viewportRef.current) move(home(viewportRef.current)); }
  function minimize() { focusTarget.current = "avatar"; setExpanded(false); }
  function open() {
    focusTarget.current = "heading";
    setWave((value) => value + 1);
    setHidden(false);
    setExpanded(true);
    remember(pointRef.current, false);
  }
  function hide() {
    focusTarget.current = "restore";
    setHidden(true);
    setExpanded(false);
    remember(pointRef.current, true);
  }
  function show(kind: Support["kind"]) {
    // Mark the attempt assisted before showing any hint, explanation or example.
    onAction?.(kind === "hint" ? "hint" : "explain");
    const level = kind === "hint" && activeSupport && hint2?.[locale].trim() ? 2 : activeSupport?.level ?? 1;
    setSupport({ context: contextId, message: messageKey, kind, level });
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    dragRef.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: pointRef.current, moved: false };
    suppressClick.current = false;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Older devices may not support capture. */ }
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.id !== event.pointerId) return;
    const x = event.clientX - current.start.x;
    const y = event.clientY - current.start.y;
    if (!current.moved && Math.hypot(x, y) < 5) return;
    current.moved = true;
    move({ x: current.origin.x + x, y: current.origin.y + y }, false);
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.id !== event.pointerId) return;
    dragRef.current = null;
    suppressClick.current = current.moved;
    if (current.moved) remember(pointRef.current, hidden);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    if (suppressTimer.current !== null) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => { suppressClick.current = false; suppressTimer.current = null; }, 0);
  }
  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 40 : 12;
    const deltas: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const delta = deltas[event.key];
    if (delta) { event.preventDefault(); moveBy(delta.x, delta.y); }
    else if (event.key === "Home") { event.preventDefault(); resetPosition(); }
    else if (event.key === "Escape" && expanded) { event.preventDefault(); minimize(); }
  }
  if (!viewport) return null;

  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D5DDD1] bg-white px-3 py-2 text-sm font-semibold text-[#254D41] transition hover:bg-[#EDF3E8] disabled:cursor-default disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E] focus-visible:ring-offset-2";
  const reaction = ["celebrating", "level_up", "badge_unlocked"].includes(visualState);
  const supportTitle = activeSupport?.kind === "hint" ? (activeSupport.level === 2 ? copy.nextHint : copy.firstHint) : activeSupport?.kind === "explain" ? copy.explanation : copy.exampleTitle;
  const validTotal = Number.isFinite(totalCount) ? Math.max(0, Math.floor(totalCount)) : 0;
  const validCompleted = Number.isFinite(completedCount) ? Math.max(0, Math.min(validTotal, Math.floor(completedCount))) : 0;

  return createPortal(<>
    <style>{`
      @keyframes italian-yoppo-wave { 0%,100% { transform:rotate(0) translateY(0); } 25% { transform:rotate(-9deg) translateY(-3px); } 65% { transform:rotate(7deg) translateY(-5px); } }
      @keyframes italian-yoppo-cheer { 0%,100% { transform:translateY(0); } 38% { transform:translateY(-10px) rotate(-5deg); } 70% { transform:translateY(-3px) rotate(4deg); } }
      .italian-yoppo-wave { animation:italian-yoppo-wave 550ms ease-out 1; }
      .italian-yoppo-cheer { animation:italian-yoppo-cheer 650ms ease-out 1; }
      @media (prefers-reduced-motion:reduce) { .italian-yoppo-wave,.italian-yoppo-cheer { animation:none; } }
    `}</style>
    {hidden ? <button ref={restoreRef} type="button" onClick={open} className={`${buttonClass} fixed z-[80] shadow-sm`}
      style={{ left: Math.max(viewport.left + EDGE, viewport.left + viewport.width - 182), top: Math.max(viewport.top + EDGE, viewport.top + viewport.height - BOTTOM - 44) }}>{copy.restore}</button>
      : <div className="fixed z-[80] h-[88px] w-[88px]" style={{ left: point.x, top: point.y }} data-testid="italian-yoppo-position">
        <button ref={avatarRef} type="button" aria-label={expanded ? copy.minimize : copy.open} aria-expanded={expanded} aria-controls={panelId} aria-describedby={instructionsId}
          className="relative flex h-[88px] w-[88px] cursor-grab touch-none select-none items-center justify-center rounded-full bg-transparent p-0 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E] focus-visible:ring-offset-2"
          onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={keyboardMove}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (expanded) minimize(); else open(); }}>
          <span key={`${contextId}:${visualState}:${wave}`} className={`pointer-events-none ${reaction ? "italian-yoppo-cheer" : wave > 0 ? "italian-yoppo-wave" : ""}`}>
            <CompanionAvatar visualId="travel" state={visualState} locale={locale} size="md" compact label="" />
          </span>
          <span aria-hidden className="pointer-events-none absolute -bottom-1 rounded-full border border-[#DED8C9] bg-[#FFFCF4] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#70442F] shadow-sm">Yoppo</span>
        </button>
        <span id={instructionsId} className="sr-only">{copy.keyboard}</span>
      </div>}
    {!hidden && expanded ? <section id={panelId} aria-labelledby={headingId} className="fixed z-[81] overflow-y-auto overscroll-contain rounded-[1.5rem] border border-[#DDD7C7] bg-[#FFFCF4] text-[#28483C] shadow-[0_20px_70px_rgba(69,49,29,0.22)]" style={panelStyle(point, viewport)}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); minimize(); } }}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-1 border-b border-[#E7DFCF] bg-[#FFFCF4] px-4 py-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8B513C]">{copy.subtitle}</p><h2 ref={headingRef} id={headingId} tabIndex={-1} className="mt-1 text-lg font-bold outline-none">{copy.title}</h2></div>
        <div className="flex shrink-0"><button type="button" aria-label={copy.minimize} onClick={minimize} className="flex size-11 items-center justify-center rounded-xl hover:bg-[#EEE8DB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E]"><Minus size={18} aria-hidden /></button><button type="button" aria-label={copy.hide} onClick={hide} className="flex size-11 items-center justify-center rounded-xl hover:bg-[#EEE8DB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E]"><EyeOff size={17} aria-hidden /></button></div>
      </header>
      <div className="space-y-4 p-4">
        {validTotal > 0 ? <div className="space-y-1.5"><div className="flex items-center justify-between gap-2 text-xs"><span>{copy.progress}</span><strong>{validCompleted} / {validTotal}</strong></div><progress aria-label={copy.progress} max={validTotal} value={validCompleted} className="h-2 w-full overflow-hidden rounded-full accent-[#426C48]" /></div> : null}
        <div role="status" aria-live="polite" aria-atomic="true" className="text-sm leading-relaxed">
          {activeSupport ? <div className="space-y-2 rounded-xl border border-[#D7DFCD] bg-[#F0F3E6] p-3"><p className="font-bold">{supportTitle}</p>{activeSupport.kind === "example" && example
            ? <><p lang={language} className="text-lg font-semibold">{example.it}</p><p><span className="sr-only">{copy.meaning}: </span>{example.meaning[locale]}</p></>
            : <p>{activeSupport.kind === "hint" ? (activeSupport.level === 2 && hint2 ? hint2[locale] : hint[locale]) : explanation[locale]}</p>}</div>
            : <p>{message[locale]}</p>}
        </div>
        {activeSupport?.kind === "example" && example ? exampleAudio : null}
        {activeSupport ? <button type="button" onClick={() => setSupport(null)} className="min-h-11 text-sm font-semibold text-[#4A6642] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E]">{copy.back}</button> : null}
        <div aria-label={copy.support} className="flex flex-wrap gap-2">
          {hasHint ? <button type="button" onClick={() => show("hint")} className={buttonClass}><Lightbulb size={17} aria-hidden />{activeSupport && hint2?.[locale].trim() ? copy.hint2 : copy.hint}</button> : null}
          {explanation[locale].trim() ? <button type="button" onClick={() => show("explain")} disabled={!canExplain} className={buttonClass}><BookOpen size={16} aria-hidden />{copy.explain}</button> : null}
          {example ? <button type="button" onClick={() => show("example")} disabled={!canExplain} className={buttonClass}>{copy.example}</button> : null}
        </div>
        {!canExplain ? <p className="text-xs leading-relaxed text-[#696B57]">{copy.hintBeforeExplanation}</p> : null}
        {onAction ? <div className="space-y-2 border-t border-[#E7DFCF] pt-3">
          <button type="button" onClick={() => { setSupport(null); minimize(); onAction("challenge"); }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[#A55035] px-3 py-2.5 text-left text-white shadow-sm hover:bg-[#8D412B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E] focus-visible:ring-offset-2"><span><span className="block text-sm font-bold">{copy.challenge}</span><span className="text-xs text-[#FFF2DB]">{copy.challengeDetail}</span></span><Sparkles size={20} aria-hidden /></button>
          <div className="flex flex-wrap gap-2">{canRetry ? <button type="button" onClick={() => { setSupport(null); onAction("retry"); }} className={buttonClass}><RotateCcw size={16} aria-hidden />{copy.retry}</button> : null}{reviewCount > 0 ? <button type="button" onClick={() => { setSupport(null); minimize(); onAction("review"); }} className={buttonClass}>{copy.review} ({reviewCount})</button> : null}</div>
        </div> : null}
        <details className="border-t border-[#E7DFCF] pt-2 text-xs text-[#696B57]"><summary className="flex min-h-11 cursor-pointer items-center rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A482E]">{copy.position}</summary><p className="leading-relaxed">{copy.keyboard}</p><div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" aria-label={copy.left} onClick={() => moveBy(-32, 0)} className={buttonClass}><ArrowLeft size={17} aria-hidden /></button><button type="button" aria-label={copy.right} onClick={() => moveBy(32, 0)} className={buttonClass}><ArrowRight size={17} aria-hidden /></button><button type="button" aria-label={copy.up} onClick={() => moveBy(0, -32)} className={buttonClass}><ArrowUp size={17} aria-hidden /></button><button type="button" aria-label={copy.down} onClick={() => moveBy(0, 32)} className={buttonClass}><ArrowDown size={17} aria-hidden /></button><button type="button" onClick={resetPosition} className={buttonClass}>{copy.reset}</button>
        </div></details>
      </div>
    </section> : null}
  </>, document.body);
}

export default ItalianYoppoCoach;
