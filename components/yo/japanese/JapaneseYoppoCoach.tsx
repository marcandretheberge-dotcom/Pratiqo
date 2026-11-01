"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EyeOff, Lightbulb, Minus, RotateCcw } from "lucide-react";

import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { JapaneseCourseAudio } from "@/components/yo/japanese/JapaneseCourseAudio";
import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { JapaneseLocalized } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";

export interface JapaneseYoppoCoachProps {
  locale: YoLocale;
  contextId: string;
  message: JapaneseLocalized;
  hint: JapaneseLocalized;
  explanation: JapaneseLocalized;
  visualState?: CompanionVisualState;
  example?: { ja: string; kana: string; romaji: string; meaning: JapaneseLocalized };
  onAction?: (action: "hint" | "explain" | "example" | "retry" | "review") => void;
  canRetry?: boolean;
  reviewCount?: number;
}

type Point = { x: number; y: number };
type Viewport = { left: number; top: number; width: number; height: number };
type Reveal = { contextId: string; message: string; kind: "hint" | "explain" | "example" };
type Drag = { id: number; start: Point; origin: Point; moved: boolean };

// This preference stores only the mascot's position and hidden state, never lesson content.
const PREFERENCES_KEY = "yopratiqo:japanese:yoppo-preferences:v1";
const AVATAR_SIZE = 88;
const EDGE = 12;
const BOTTOM_SPACE = 112;

const COPY = {
  fr: {
    open: "Ouvrir l’aide de Yoppo", close: "Réduire l’aide de Yoppo", hide: "Masquer Yoppo", restore: "Afficher Yoppo",
    title: "Un coup de main ?", subtitle: "Yoppo, ton compagnon YoPratiqo", hint: "Un indice", explain: "Explique-moi", example: "Un exemple",
    hintTitle: "Voici un indice", explainTitle: "Regarde ce détail", exampleTitle: "Un exemple pour t’aider", back: "Revenir à la consigne",
    retry: "Réessayer", review: "Réviser", position: "Déplacer Yoppo", reset: "Replacer Yoppo", left: "Déplacer à gauche", right: "Déplacer à droite",
    up: "Déplacer vers le haut", down: "Déplacer vers le bas", keyboard: "Fais glisser Yoppo. Au clavier : les flèches le déplacent, Maj + flèche va plus loin et Début le replace.",
    translations: "Sens", reading: "Lecture", romaji: "Rōmaji",
  },
  en: {
    open: "Open Yoppo’s help", close: "Minimize Yoppo’s help", hide: "Hide Yoppo", restore: "Show Yoppo",
    title: "Need a hand?", subtitle: "Yoppo, your YoPratiqo companion", hint: "A hint", explain: "Explain it", example: "An example",
    hintTitle: "Here is a hint", explainTitle: "Notice this detail", exampleTitle: "An example to help", back: "Back to the task",
    retry: "Try again", review: "Review", position: "Move Yoppo", reset: "Reset Yoppo’s position", left: "Move left", right: "Move right",
    up: "Move up", down: "Move down", keyboard: "Drag Yoppo. With the keyboard: arrow keys move, Shift + arrow moves farther, and Home resets the position.",
    translations: "Meaning", reading: "Reading", romaji: "Rōmaji",
  },
  es: {
    open: "Abrir la ayuda de Yoppo", close: "Minimizar la ayuda de Yoppo", hide: "Ocultar a Yoppo", restore: "Mostrar a Yoppo",
    title: "¿Necesitas una mano?", subtitle: "Yoppo, tu compañero YoPratiqo", hint: "Una pista", explain: "Explícamelo", example: "Un ejemplo",
    hintTitle: "Aquí tienes una pista", explainTitle: "Fíjate en este detalle", exampleTitle: "Un ejemplo para ayudarte", back: "Volver a la consigna",
    retry: "Intentarlo de nuevo", review: "Repasar", position: "Mover a Yoppo", reset: "Restablecer la posición de Yoppo", left: "Mover a la izquierda", right: "Mover a la derecha",
    up: "Mover hacia arriba", down: "Mover hacia abajo", keyboard: "Arrastra a Yoppo. Con el teclado: las flechas lo mueven, Mayús + flecha avanza más e Inicio restablece su posición.",
    translations: "Significado", reading: "Lectura", romaji: "Rōmaji",
  },
} as const;

function viewportNow(): Viewport {
  const visual = window.visualViewport;
  return {
    left: visual?.offsetLeft ?? 0,
    top: visual?.offsetTop ?? 0,
    width: visual?.width || window.innerWidth,
    height: visual?.height || window.innerHeight,
  };
}

function clampPosition(point: Point, viewport: Viewport): Point {
  const minX = viewport.left + EDGE;
  const minY = viewport.top + EDGE;
  return {
    x: Math.max(minX, Math.min(point.x, Math.max(minX, viewport.left + viewport.width - AVATAR_SIZE - EDGE))),
    y: Math.max(minY, Math.min(point.y, Math.max(minY, viewport.top + viewport.height - AVATAR_SIZE - BOTTOM_SPACE - EDGE))),
  };
}

function initialPosition(viewport: Viewport): Point {
  return clampPosition({ x: viewport.left + viewport.width, y: viewport.top + viewport.height }, viewport);
}

function readPreferences(): { position: Point | null; hidden: boolean } {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { position: null, hidden: false };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { position: null, hidden: false };
    const pref = value as Record<string, unknown>;
    if (pref.version !== 1) return { position: null, hidden: false };
    const validPoint = typeof pref.x === "number" && Number.isFinite(pref.x) && typeof pref.y === "number" && Number.isFinite(pref.y);
    return { position: validPoint ? { x: pref.x as number, y: pref.y as number } : null, hidden: pref.hidden === true };
  } catch {
    return { position: null, hidden: false };
  }
}

function remember(position: Point, hidden: boolean) {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, x: position.x, y: position.y, hidden }));
  } catch {
    // Practice and movement remain available when browser storage is disabled or full.
  }
}

function panelPosition(position: Point, viewport: Viewport): CSSProperties {
  const width = Math.min(352, Math.max(160, viewport.width - EDGE * 2));
  const left = Math.max(viewport.left + EDGE, Math.min(position.x + AVATAR_SIZE - width, viewport.left + viewport.width - width - EDGE));
  const above = position.y - viewport.top - EDGE * 2;
  const below = viewport.top + viewport.height - BOTTOM_SPACE - position.y - AVATAR_SIZE - EDGE * 2;
  const maxHeight = Math.max(96, Math.min(496, viewport.height - BOTTOM_SPACE - EDGE * 2));
  if (Math.max(above, below) < 200) {
    return { left, top: viewport.top + EDGE, width, maxHeight };
  }
  return above >= below
    ? { left, top: position.y - EDGE, transform: "translateY(-100%)", width, maxHeight: Math.min(maxHeight, above) }
    : { left, top: position.y + AVATAR_SIZE + EDGE, width, maxHeight: Math.min(maxHeight, below) };
}

/** Local, learner-controlled help. The lesson owns evaluation and all essential feedback. */
export function JapaneseYoppoCoach({
  locale, contextId, message, hint, explanation, visualState = "idle", example, onAction, canRetry = false, reviewCount = 0,
}: JapaneseYoppoCoachProps) {
  const copy = COPY[locale];
  const panelId = useId();
  const headingId = useId();
  const instructionsId = useId();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const positionRef = useRef(position);
  const viewportRef = useRef<Viewport | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const clickTimer = useRef<number | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusTarget = useRef<"avatar" | "restore" | "heading" | null>(null);
  const messageKey = [message.fr, message.en, message.es].join("\u0000");
  const activeReveal = reveal?.contextId === contextId && reveal.message === messageKey ? reveal.kind : null;

  useEffect(() => {
    const currentViewport = viewportNow();
    const preferences = readPreferences();
    const currentPosition = clampPosition(preferences.position ?? initialPosition(currentViewport), currentViewport);
    viewportRef.current = currentViewport;
    positionRef.current = currentPosition;
    setViewport(currentViewport);
    setPosition(currentPosition);
    setHidden(preferences.hidden);

    const handleResize = () => {
      const nextViewport = viewportNow();
      const nextPosition = clampPosition(positionRef.current, nextViewport);
      viewportRef.current = nextViewport;
      positionRef.current = nextPosition;
      setViewport(nextViewport);
      setPosition(nextPosition);
      dragRef.current = null;
    };
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", handleResize);
    visualViewport?.addEventListener("resize", handleResize);
    visualViewport?.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      visualViewport?.removeEventListener("resize", handleResize);
      visualViewport?.removeEventListener("scroll", handleResize);
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    };
  }, []);

  useEffect(() => { setReveal(null); }, [contextId]);

  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === "heading") headingRef.current?.focus();
    if (target === "avatar") avatarRef.current?.focus();
    if (target === "restore") restoreRef.current?.focus();
  }, [expanded, hidden]);

  function move(point: Point, persist = true) {
    if (!viewportRef.current) return;
    const next = clampPosition(point, viewportRef.current);
    positionRef.current = next;
    setPosition(next);
    if (persist) remember(next, hidden);
  }

  function resetPosition() {
    if (viewportRef.current) move(initialPosition(viewportRef.current));
  }

  function moveBy(x: number, y: number) {
    move({ x: positionRef.current.x + x, y: positionRef.current.y + y });
  }

  function minimize() {
    focusTarget.current = "avatar";
    setExpanded(false);
  }

  function open() {
    focusTarget.current = "heading";
    setHidden(false);
    setExpanded(true);
    remember(positionRef.current, false);
  }

  function hide() {
    focusTarget.current = "restore";
    setHidden(true);
    setExpanded(false);
    remember(positionRef.current, true);
  }

  function show(kind: "hint" | "explain" | "example") {
    // Notify the lesson before revealing support so an assisted attempt cannot count as independent recall.
    onAction?.(kind);
    setReveal({ contextId, message: messageKey, kind });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    dragRef.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: positionRef.current, moved: false };
    suppressClick.current = false;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture may be unavailable on an older input device. */ }
  }

  function drag(event: PointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.id !== event.pointerId) return;
    const x = event.clientX - active.start.x;
    const y = event.clientY - active.start.y;
    if (!active.moved && Math.hypot(x, y) < 5) return;
    active.moved = true;
    move({ x: active.origin.x + x, y: active.origin.y + y }, false);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const active = dragRef.current;
    if (!active || active.id !== event.pointerId) return;
    dragRef.current = null;
    suppressClick.current = active.moved && !cancelled;
    if (active.moved) remember(positionRef.current, hidden);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* The browser may have released capture already. */ }
    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => { suppressClick.current = false; clickTimer.current = null; }, 0);
  }

  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>) {
    const distance = event.shiftKey ? 40 : 12;
    const deltas: Record<string, Point> = {
      ArrowLeft: { x: -distance, y: 0 }, ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance }, ArrowDown: { x: 0, y: distance },
    };
    const delta = deltas[event.key];
    if (delta) { event.preventDefault(); moveBy(delta.x, delta.y); }
    else if (event.key === "Home") { event.preventDefault(); resetPosition(); }
    else if (event.key === "Escape" && expanded) { event.preventDefault(); minimize(); }
  }

  if (!viewport) return null;

  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#CFDBD4] bg-white px-3 py-2 text-sm font-semibold text-[#173A32] transition hover:bg-[#ECF4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64] focus-visible:ring-offset-2";
  const reaction = ["celebrating", "level_up", "badge_unlocked"].includes(visualState);
  const supportTitle = activeReveal === "hint" ? copy.hintTitle : activeReveal === "explain" ? copy.explainTitle : copy.exampleTitle;

  return createPortal(
    <>
      <style>{`
        @keyframes japanese-yoppo-cheer { 0%,100% { transform:translateY(0) rotate(0); } 40% { transform:translateY(-6px) rotate(-4deg); } 70% { transform:translateY(-2px) rotate(3deg); } }
        .japanese-yoppo-reaction { animation:japanese-yoppo-cheer 520ms ease-out 1; }
        @media (prefers-reduced-motion:reduce) { .japanese-yoppo-reaction { animation:none; } }
      `}</style>
      {hidden ? (
        <button
          ref={restoreRef} type="button" onClick={open}
          className={`${buttonClass} fixed z-[65] shadow-sm`}
          style={{ left: Math.max(viewport.left + EDGE, viewport.left + viewport.width - 168), top: Math.max(viewport.top + EDGE, viewport.top + viewport.height - BOTTOM_SPACE - 44) }}
        >{copy.restore}</button>
      ) : (
        <div className="fixed z-[65] h-[88px] w-[88px]" style={{ left: position.x, top: position.y }} data-testid="japanese-yoppo-position">
          <button
            ref={avatarRef} type="button" aria-label={expanded ? copy.close : copy.open} aria-expanded={expanded} aria-controls={panelId} aria-describedby={instructionsId}
            className="flex h-[88px] w-[88px] cursor-grab touch-none select-none items-center justify-center rounded-full bg-transparent p-0 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64] focus-visible:ring-offset-2"
            onPointerDown={startDrag} onPointerMove={drag} onPointerUp={(event) => endDrag(event)} onPointerCancel={(event) => endDrag(event, true)} onKeyDown={keyboardMove}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (expanded) minimize(); else open(); }}
          >
            <span key={visualState} className={reaction ? "pointer-events-none japanese-yoppo-reaction" : "pointer-events-none"}>
              <CompanionAvatar visualId="travel" state={visualState} locale={locale} size="md" compact label="" />
            </span>
          </button>
          <span id={instructionsId} className="sr-only">{copy.keyboard}</span>
        </div>
      )}
      {!hidden && expanded ? (
        <section
          id={panelId} aria-labelledby={headingId}
          className="fixed z-[66] overflow-y-auto overscroll-contain rounded-2xl border border-[#D8E1D7] bg-[#FFFEF9] text-[#183A32] shadow-[0_18px_60px_rgba(21,48,38,0.2)]"
          style={panelPosition(position, viewport)}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); minimize(); } }}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-[#E4E9DF] bg-[#FFFEF9] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#5C6F63]">{copy.subtitle}</p>
              <h2 ref={headingRef} id={headingId} tabIndex={-1} className="mt-1 text-lg font-semibold outline-none">{copy.title}</h2>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label={copy.close} onClick={minimize} className="flex size-11 items-center justify-center rounded-xl hover:bg-[#ECF4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64]"><Minus className="size-4" aria-hidden /></button>
              <button type="button" aria-label={copy.hide} onClick={hide} className="flex size-11 items-center justify-center rounded-xl hover:bg-[#ECF4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64]"><EyeOff className="size-4" aria-hidden /></button>
            </div>
          </header>
          <div className="space-y-4 p-4">
            <div role="status" aria-live="polite" aria-atomic="true" className="text-sm leading-relaxed">
              {activeReveal ? (
                <div className="space-y-2 rounded-xl bg-[#EEF4E9] p-3">
                  <p className="font-semibold">{supportTitle}</p>
                  {activeReveal === "example" && example ? (
                    <div className="space-y-2">
                      <p lang="ja" className="text-xl leading-relaxed">{example.ja}</p>
                      {example.kana && example.kana !== example.ja ? <p lang="ja"><span className="sr-only">{copy.reading}: </span>{example.kana}</p> : null}
                      {example.romaji ? <p><span className="sr-only">{copy.romaji}: </span>{example.romaji}</p> : null}
                      <p><span className="sr-only">{copy.translations}: </span>{example.meaning[locale]}</p>
                    </div>
                  ) : <p>{activeReveal === "hint" ? hint[locale] : explanation[locale]}</p>}
                </div>
              ) : <p>{message[locale]}</p>}
            </div>
            {activeReveal === "example" && example ? <JapaneseCourseAudio text={example.ja} locale={locale} /> : null}
            {activeReveal ? <button type="button" onClick={() => setReveal(null)} className="text-sm font-semibold text-[#28664F] underline decoration-[#A4BCA8] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64]">{copy.back}</button> : null}
            <div className="flex flex-wrap gap-2">
              {hint[locale].trim() ? <button type="button" onClick={() => show("hint")} className={buttonClass}><Lightbulb className="size-4" aria-hidden />{copy.hint}</button> : null}
              {explanation[locale].trim() ? <button type="button" onClick={() => show("explain")} className={buttonClass}>{copy.explain}</button> : null}
              {example ? <button type="button" onClick={() => show("example")} className={buttonClass}>{copy.example}</button> : null}
              {canRetry && onAction ? <button type="button" onClick={() => { setReveal(null); onAction("retry"); }} className={buttonClass}><RotateCcw className="size-4" aria-hidden />{copy.retry}</button> : null}
              {reviewCount > 0 && onAction ? <button type="button" onClick={() => onAction("review")} className={buttonClass}>{copy.review} ({reviewCount})</button> : null}
            </div>
            <details className="border-t border-[#E4E9DF] pt-3 text-xs text-[#5C6F63]">
              <summary className="cursor-pointer rounded-sm py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147D64]">{copy.position}</summary>
              <p className="mt-2 leading-relaxed">{copy.keyboard}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" aria-label={copy.left} onClick={() => moveBy(-32, 0)} className={buttonClass}><ArrowLeft className="size-4" aria-hidden /></button>
                <button type="button" aria-label={copy.right} onClick={() => moveBy(32, 0)} className={buttonClass}><ArrowRight className="size-4" aria-hidden /></button>
                <button type="button" aria-label={copy.up} onClick={() => moveBy(0, -32)} className={buttonClass}><ArrowUp className="size-4" aria-hidden /></button>
                <button type="button" aria-label={copy.down} onClick={() => moveBy(0, 32)} className={buttonClass}><ArrowDown className="size-4" aria-hidden /></button>
                <button type="button" onClick={resetPosition} className={buttonClass}>{copy.reset}</button>
              </div>
            </details>
          </div>
        </section>
      ) : null}
    </>,
    document.body,
  );
}

export default JapaneseYoppoCoach;
