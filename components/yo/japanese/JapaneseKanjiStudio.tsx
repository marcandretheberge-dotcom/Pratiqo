"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getJapaneseKanji } from "@/lib/yo/japaneseKanji";
import type { JapaneseKanjiCard } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";

const COPY = {
  fr: {
    title: "Atelier kanji", choose: "Choisir un kanji", empty: "Aucun kanji à pratiquer dans cette unité.",
    draw: "Tracer", observe: "Observer et rappeler", grid: "Grille de tracé", hint: "Trace avec un doigt, un stylet ou la souris. Tu peux aussi pratiquer au clavier avec « Observer et rappeler ».",
    show: "Afficher le modèle", hide: "Masquer le modèle", replay: "Rejouer les traits", pause: "Arrêter l’animation", previous: "Trait précédent", next: "Trait suivant", all: "Tous les traits", stroke: "Traits du modèle", ink: "Traits dessinés", undo: "Annuler le dernier trait", clear: "Effacer mon tracé",
    memory: "Une image pour mémoriser", memoryNote: "Un aide-mémoire personnel, pas une explication de l’origine du caractère.",
    contextual: "Un mot en contexte", readingNote: "La lecture montrée est celle de ce mot; un kanji peut avoir d’autres lectures.",
    recall: "Masquer pour me rappeler", compare: "Comparer au modèle", recallHint: "Rappelle-toi l’ordre des traits, décris-le à voix haute ou trace sur papier. Affiche ensuite le modèle pour comparer.",
    observeHint: "Parcours les traits un par un ou rejoue-les. Puis cache le modèle et essaie de te rappeler leur ordre.",
    compared: "Tu peux comparer ton rappel au modèle, puis noter ta pratique.",
    record: "J’ai pratiqué ce kanji", recorded: "Pratique notée pour cette séance.",
    honest: "Cette pratique ne note pas la calligraphie et ne mesure pas la maîtrise du kanji.",
    source: "Traits : KanjiVG, Ulrich Apel ·", original: "SVG source", reduced: "Mouvement réduit : modèle complet affiché, étapes manuelles disponibles.",
  },
  en: {
    title: "Kanji studio", choose: "Choose a kanji", empty: "No kanji to practise in this unit.",
    draw: "Draw", observe: "Observe and recall", grid: "Drawing grid", hint: "Draw with a finger, stylus or mouse. You can also practise with a keyboard using “Observe and recall”.",
    show: "Show model", hide: "Hide model", replay: "Replay strokes", pause: "Stop animation", previous: "Previous stroke", next: "Next stroke", all: "All strokes", stroke: "Model strokes", ink: "Drawn strokes", undo: "Undo last stroke", clear: "Clear my drawing",
    memory: "A picture to remember", memoryNote: "A personal memory aid, not an explanation of the character’s historical origin.",
    contextual: "A word in context", readingNote: "The reading shown belongs to this word; a kanji can have other readings.",
    recall: "Hide and recall", compare: "Compare with model", recallHint: "Recall the stroke order, describe it aloud or draw on paper. Then reveal the model to compare.",
    observeHint: "Step through the strokes or replay them. Then hide the model and try to recall their order.",
    compared: "Compare what you recalled with the model, then record your practice.",
    record: "I practised this kanji", recorded: "Practice recorded for this session.",
    honest: "This practice does not grade calligraphy or measure kanji mastery.",
    source: "Strokes: KanjiVG, Ulrich Apel ·", original: "Source SVG", reduced: "Reduced motion: full model shown, manual steps available.",
  },
  es: {
    title: "Taller de kanji", choose: "Elegir un kanji", empty: "No hay kanji para practicar en esta unidad.",
    draw: "Trazar", observe: "Observar y recordar", grid: "Cuadrícula de trazado", hint: "Traza con un dedo, un lápiz digital o el ratón. También puedes practicar con el teclado en «Observar y recordar».",
    show: "Mostrar el modelo", hide: "Ocultar el modelo", replay: "Repetir los trazos", pause: "Detener la animación", previous: "Trazo anterior", next: "Trazo siguiente", all: "Todos los trazos", stroke: "Trazos del modelo", ink: "Trazos dibujados", undo: "Deshacer el último trazo", clear: "Borrar mi dibujo",
    memory: "Una imagen para recordar", memoryNote: "Una ayuda personal para recordar, no una explicación del origen histórico del carácter.",
    contextual: "Una palabra en contexto", readingNote: "La lectura mostrada corresponde a esta palabra; un kanji puede tener otras lecturas.",
    recall: "Ocultar y recordar", compare: "Comparar con el modelo", recallHint: "Recuerda el orden de los trazos, descríbelo en voz alta o dibuja en papel. Después muestra el modelo para comparar.",
    observeHint: "Recorre los trazos uno a uno o repítelos. Después oculta el modelo e intenta recordar su orden.",
    compared: "Compara lo que recuerdas con el modelo y registra tu práctica.",
    record: "He practicado este kanji", recorded: "Práctica registrada para esta sesión.",
    honest: "Esta práctica no califica la caligrafía ni mide el dominio del kanji.",
    source: "Trazos: KanjiVG, Ulrich Apel ·", original: "SVG original", reduced: "Movimiento reducido: modelo completo visible y pasos manuales disponibles.",
  },
} as const;

const button = "min-h-11 rounded-xl border border-[#D9D4C9] bg-white px-3 py-2 text-sm font-semibold text-[#172642] transition hover:bg-[#E3F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13A085] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";
type Point = { x: number; y: number };
type InkStroke = Point[];

function inkPath(points: InkStroke): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + (points.length === 1 ? " l0.01,0.01" : "");
}

export interface JapaneseKanjiStudioProps {
  characters: string[];
  locale: YoLocale;
  onPractice?: (character: string) => void;
}

/** Source strokes are verified KanjiVG geometry; learner ink never leaves local component state. */
export function JapaneseKanjiStudio({ characters, locale, onPractice }: JapaneseKanjiStudioProps) {
  const copy = COPY[locale];
  const cards = useMemo(() => [...new Set(characters)].map(getJapaneseKanji).filter((item): item is JapaneseKanjiCard => Boolean(item)), [characters]);
  const [chosen, setChosen] = useState(characters[0] ?? "");
  const current = cards.find((item) => item.character === chosen) ?? cards[0];
  const titleId = useId();
  if (!current) return <p role="status" className="rounded-2xl bg-white p-4 text-[#566073]">{copy.empty}</p>;

  return (
    <section aria-labelledby={titleId} data-japanese-kanji-studio="true" data-no-deck-swipe="true" data-no-deck-tap="true" className="w-full min-w-0 rounded-3xl border border-[#E7DFCF] bg-[#FBF7EE] p-4 text-[#172642] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="text-lg font-bold">{copy.title}</h3>
        <div role="group" aria-label={copy.choose} className="flex max-w-full flex-wrap gap-2">
          {cards.map((item) => (
            <button key={item.character} type="button" aria-pressed={current.character === item.character} onClick={() => setChosen(item.character)} className={`${button} min-w-11 px-2 text-xl ${current.character === item.character ? "border-[#13A085] bg-[#E3F1EB]" : ""}`}>
              <span lang="ja">{item.character}</span>
            </button>
          ))}
        </div>
      </div>
      <KanjiPractice key={current.character} card={current} locale={locale} onPractice={onPractice} />
    </section>
  );
}

function KanjiPractice({ card, locale, onPractice }: { card: JapaneseKanjiCard; locale: YoLocale; onPractice?: (character: string) => void }) {
  const copy = COPY[locale];
  const hintId = useId();
  const [mode, setMode] = useState<"draw" | "observe">("draw");
  const [modelVisible, setModelVisible] = useState(true);
  const [visibleStrokes, setVisibleStrokes] = useState(card.strokes.length);
  const [playing, setPlaying] = useState(false);
  const [replayRun, setReplayRun] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionNote, setMotionNote] = useState(false);
  const [ink, setInk] = useState<InkStroke[]>([]);
  const [draft, setDraft] = useState<InkStroke>([]);
  const [recallPhase, setRecallPhase] = useState<"observe" | "recall" | "compared">("observe");
  const [recorded, setRecorded] = useState(false);
  const activePointer = useRef<{ id: number; points: InkStroke } | null>(null);
  const surfaceRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (reducedMotion) {
      setPlaying(false);
      setVisibleStrokes(card.strokes.length);
      setMotionNote(true);
      return;
    }
    const timer = window.setTimeout(() => {
      if (document.hidden || surfaceRef.current?.closest("[hidden], [inert], [aria-hidden='true']")) {
        setPlaying(false);
      } else if (visibleStrokes >= card.strokes.length) {
        setPlaying(false);
      } else {
        setVisibleStrokes((count) => count + 1);
      }
    }, 760);
    return () => window.clearTimeout(timer);
  }, [playing, reducedMotion, visibleStrokes, card.strokes.length]);

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, []);

  function position(event: ReactPointerEvent<SVGSVGElement>): Point | null {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    return {
      x: Math.min(108, Math.max(1, (event.clientX - bounds.left) / bounds.width * 109)),
      y: Math.min(108, Math.max(1, (event.clientY - bounds.top) / bounds.height * 109)),
    };
  }

  function startStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (mode !== "draw" || activePointer.current || event.button !== 0 || event.isPrimary === false) return;
    const point = position(event);
    if (!point) return;
    event.preventDefault();
    setPlaying(false);
    activePointer.current = { id: event.pointerId, points: [point] };
    setDraft([point]);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveStroke(event: ReactPointerEvent<SVGSVGElement>) {
    const active = activePointer.current;
    if (!active || active.id !== event.pointerId) return;
    const point = position(event);
    if (!point || active.points.length >= 1500) return;
    const previous = active.points[active.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.35) return;
    event.preventDefault();
    active.points = [...active.points, point];
    setDraft(active.points);
  }

  function finishStroke(event: ReactPointerEvent<SVGSVGElement>) {
    const active = activePointer.current;
    if (!active || active.id !== event.pointerId) return;
    const end = position(event);
    const points = end && active.points.length < 1500 ? [...active.points, end] : active.points;
    activePointer.current = null;
    setInk((previous) => [...previous, points]);
    setDraft([]);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function cancelStroke(event?: ReactPointerEvent<SVGSVGElement>) {
    if (event && activePointer.current?.id !== event.pointerId) return;
    const id = activePointer.current?.id;
    activePointer.current = null;
    setDraft([]);
    if (id !== undefined && surfaceRef.current?.hasPointerCapture?.(id)) surfaceRef.current.releasePointerCapture(id);
  }

  function step(delta: number) {
    setPlaying(false);
    setMotionNote(false);
    setModelVisible(true);
    setVisibleStrokes((count) => Math.max(0, Math.min(card.strokes.length, count + delta)));
  }

  function replay() {
    setModelVisible(true);
    setMotionNote(reducedMotion);
    setReplayRun((run) => run + 1);
    setVisibleStrokes(reducedMotion ? card.strokes.length : 1);
    setPlaying(!reducedMotion);
  }

  function changeMode(next: "draw" | "observe") {
    cancelStroke();
    setMode(next);
    setPlaying(false);
    setModelVisible(true);
    setRecallPhase("observe");
  }

  const canRecord = ink.length > 0 || recallPhase === "compared";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span lang="ja" className="text-5xl leading-none">{card.character}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{card.meaning[locale]}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#566073]">{copy.contextual}</p>
          <p className="mt-1 text-lg"><ruby lang="ja">{card.word.ja}<rt className="text-xs">{card.word.kana}</rt></ruby> <span className="text-sm text-[#566073]">{card.word.romaji}</span></p>
          <p className="text-sm text-[#566073]">{card.word.meaning[locale]}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-[#566073]">{copy.readingNote}</p>
      <div role="group" aria-label={copy.title} className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={mode === "draw"} className={`${button} ${mode === "draw" ? "border-[#13A085] bg-[#E3F1EB]" : ""}`} onClick={() => changeMode("draw")}>{copy.draw}</button>
        <button type="button" aria-pressed={mode === "observe"} className={`${button} ${mode === "observe" ? "border-[#13A085] bg-[#E3F1EB]" : ""}`} onClick={() => changeMode("observe")}>{copy.observe}</button>
      </div>
      <p id={hintId} className="text-sm leading-relaxed text-[#566073]">{mode === "draw" ? copy.hint : recallPhase === "recall" ? copy.recallHint : recallPhase === "compared" ? copy.compared : copy.observeHint}</p>
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
        <div className="min-w-0">
          <svg ref={surfaceRef} role="img" aria-label={`${copy.grid} · ${card.character}`} aria-describedby={hintId} viewBox="0 0 109 109" data-kanji-grid={card.character} data-mode={mode} className="mx-auto block aspect-square w-full max-w-[300px] rounded-2xl border border-[#D9D4C9] bg-white" style={{ touchAction: mode === "draw" ? "none" : "auto", cursor: mode === "draw" ? "crosshair" : "default" }} onPointerDown={startStroke} onPointerMove={moveStroke} onPointerUp={finishStroke} onPointerCancel={cancelStroke} onLostPointerCapture={cancelStroke}>
            <path d="M54.5,0V109 M0,54.5H109 M0,0L109,109 M109,0L0,109" stroke="#E7DFCF" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
            {modelVisible ? <g data-kanji-model="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <g opacity="0.13" stroke="#172642" strokeWidth="3">{card.strokes.map((d, index) => <path key={`ghost-${index}`} d={d} />)}</g>
              {card.strokes.slice(0, visibleStrokes).map((d, index) => <path key={`${replayRun}-${index}`} data-kanji-model-stroke={index + 1} d={d} pathLength={1} stroke={index === visibleStrokes - 1 ? "#B05231" : "#172642"} strokeWidth="2.7" style={playing && !reducedMotion && index === visibleStrokes - 1 ? { strokeDasharray: 1, animation: "yoJapaneseKanjiStroke 680ms ease-out both" } : undefined} />)}
            </g> : null}
            <g data-kanji-ink="true" fill="none" stroke="#008675" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{ink.map((points, index) => <path key={index} data-kanji-ink-stroke={index + 1} d={inkPath(points)} />)}{draft.length ? <path data-kanji-draft="true" d={inkPath(draft)} /> : null}</g>
          </svg>
          <p className="mt-2 text-center text-xs text-[#566073]" aria-live="polite" aria-atomic="true">{copy.stroke} : {modelVisible ? visibleStrokes : 0}/{card.strokes.length} · {copy.ink} : {ink.length}</p>
        </div>
        <div className="min-w-0 space-y-2">
          <button type="button" className={`${button} w-full`} onClick={() => { setPlaying(false); setModelVisible((value) => !value); }}>{modelVisible ? copy.hide : copy.show}</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={button} onClick={() => step(-1)} disabled={visibleStrokes === 0}>{copy.previous}</button>
            <button type="button" className={button} onClick={() => step(1)} disabled={visibleStrokes === card.strokes.length}>{copy.next}</button>
          </div>
          <button type="button" className={`${button} w-full`} onClick={playing ? () => setPlaying(false) : replay}>{playing ? copy.pause : copy.replay}</button>
          <button type="button" className={`${button} w-full`} onClick={() => { setPlaying(false); setModelVisible(true); setVisibleStrokes(card.strokes.length); }}>{copy.all}</button>
          {mode === "draw" ? <div className="grid grid-cols-2 gap-2">
            <button type="button" className={button} disabled={ink.length === 0} onClick={() => { cancelStroke(); setInk((previous) => previous.slice(0, -1)); }}>{copy.undo}</button>
            <button type="button" className={button} disabled={ink.length === 0 && draft.length === 0} onClick={() => { cancelStroke(); setInk([]); }}>{copy.clear}</button>
          </div> : <button type="button" className={`${button} w-full border-[#13A085]`} onClick={() => { setPlaying(false); if (recallPhase === "recall") { setRecallPhase("compared"); setModelVisible(true); setVisibleStrokes(card.strokes.length); } else { setRecallPhase("recall"); setModelVisible(false); } }}>{recallPhase === "recall" ? copy.compare : copy.recall}</button>}
          {motionNote ? <p role="status" className="text-xs leading-relaxed text-[#566073]">{copy.reduced}</p> : null}
        </div>
      </div>
      <details className="rounded-2xl border border-[#E7DFCF] bg-white px-4 py-3">
        <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13A085]">{copy.memory}</summary>
        <p className="mt-2 text-sm leading-relaxed">{card.mnemonic[locale]}</p>
        <p className="mt-2 text-xs text-[#566073]">{copy.memoryNote}</p>
      </details>
      <button type="button" className={`${button} w-full border-[#13A085] bg-[#E3F1EB]`} disabled={!canRecord || recorded} onClick={() => { if (!canRecord || recorded) return; setRecorded(true); onPractice?.(card.character); }}>{recorded ? copy.recorded : copy.record}</button>
      {recorded ? <p role="status" className="text-sm text-[#0F6E56]">{copy.recorded}</p> : null}
      <p className="text-xs leading-relaxed text-[#566073]">{copy.honest}</p>
      <p className="flex flex-wrap gap-x-1 text-[11px] leading-relaxed text-[#566073]">{copy.source} <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">KanjiVG</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY-SA 3.0</a> · <a href={card.sourceFile} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{copy.original}</a></p>
      <style>{"@keyframes yoJapaneseKanjiStroke { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } } @media (prefers-reduced-motion: reduce) { [data-kanji-model-stroke] { animation: none !important; } }"}</style>
    </div>
  );
}
