"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { JapaneseCourseUnit } from "@/lib/yo/japaneseCourseTypes";
import { getJapaneseKana, kanaDistractors, japaneseKana } from "@/lib/yo/japaneseKana";
import { JapaneseCourseAudio } from "./JapaneseCourseAudio";
import { JapanesePhraseView } from "./JapanesePhraseView";

const COPY = {
  fr: { next: "Suivant", prev: "Précédent", reveal: "Révéler le sens", hide: "Masquer le sens", again: "À reprendre", recall: "Je m’en souviens", reviewed: "Cartes revues", restart: "Recommencer", line: "Réplique", practice: "Se tester", study: "Explorer", check: "Vérifier", correct: "Bonne lecture.", wrong: "Écoute et compare.", choose: "Quel son correspond à ce kana ?", kana: "Kana du module", all: "Tableau des 92 kana de base", close: "Fermer le tableau", recallNote: "Ton appréciation personnelle guide la pile de cartes. Elle n’est pas une note.", done: "Toutes les cartes de cette séance ont été revues.", write: "Ton brouillon", model: "Voir un modèle", self: "Autoévaluation de ton texte", private: "Brouillon de cette séance, non envoyé. Compare ton texte au modèle ou travaille-le avec un professeur.", basics: "Au-delà du tableau", soundNote: "が/ガ ajoute un dakuten à か/カ ; ぱ/パ utilise un handakuten. きゃ/キャ combine un kana et un petit ゃ/ャ. Le petit っ/ッ marque une consonne doublée ; les voyelles longues changent les mots (おばさん / おばあさん). は et へ se lisent wa et e comme particules ; を se lit généralement o.", writingDone: "J’ai comparé mon texte", confidence: "Pratique personnelle" },
  en: { next: "Next", prev: "Previous", reveal: "Reveal meaning", hide: "Hide meaning", again: "Practice again", recall: "I remember it", reviewed: "Cards reviewed", restart: "Restart", line: "Line", practice: "Test yourself", study: "Explore", check: "Check", correct: "Correct reading.", wrong: "Listen and compare.", choose: "Which sound matches this kana?", kana: "This module’s kana", all: "Chart of all 92 basic kana", close: "Close chart", recallNote: "Your self-rating guides the card pile. It is not an assessment score.", done: "You have reviewed every card in this session.", write: "Your draft", model: "See a model", self: "Self-assess your text", private: "Session draft, not sent anywhere. Compare it with the model or work on it with a teacher.", basics: "Beyond the chart", soundNote: "が/ガ adds a dakuten to か/カ; ぱ/パ uses a handakuten. きゃ/キャ combines a kana and a small ゃ/ャ. Small っ/ッ marks a doubled consonant; long vowels change words (おばさん / おばあさん). は and へ are read wa and e as particles; を is usually read o.", writingDone: "I compared my text", confidence: "Personal practice" },
  es: { next: "Siguiente", prev: "Anterior", reveal: "Revelar significado", hide: "Ocultar significado", again: "Volver a practicar", recall: "Lo recuerdo", reviewed: "Tarjetas revisadas", restart: "Reiniciar", line: "Intervención", practice: "Ponte a prueba", study: "Explorar", check: "Verificar", correct: "Lectura correcta.", wrong: "Escucha y compara.", choose: "¿Qué sonido corresponde a este kana?", kana: "Kana del módulo", all: "Tabla de los 92 kana básicos", close: "Cerrar tabla", recallNote: "Tu autoevaluación organiza las tarjetas. No es una nota.", done: "Has revisado todas las tarjetas de esta sesión.", write: "Tu borrador", model: "Ver un modelo", self: "Autoevaluar tu texto", private: "Borrador de esta sesión, no se envía. Compáralo con el modelo o revísalo con un profesor.", basics: "Más allá de la tabla", soundNote: "が/ガ añade dakuten a か/カ; ぱ/パ usa handakuten. きゃ/キャ combina un kana y un ゃ/ャ pequeño. っ/ッ pequeño marca una consonante doble; las vocales largas cambian palabras (おばさん / おばあさん). は y へ se leen wa y e como partículas; を suele leerse o.", writingDone: "Comparé mi texto", confidence: "Práctica personal" },
};
const pill = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40";
const PRACTICE_COPY = {
  fr: { retry: "Réessayer ce kana", count: "Kana réussis dans cette séance", note: "Entraînement sans note : tu peux consulter le tableau. Ce compteur ne mesure pas une mémorisation sans aide.", hideModel: "Masquer le modèle" },
  en: { retry: "Try this kana again", count: "Kana answered correctly this session", note: "Ungraded practice: you can consult the chart. This count does not measure unaided recall.", hideModel: "Hide the model" },
  es: { retry: "Reintentar este kana", count: "Kana respondidos correctamente en esta sesión", note: "Práctica sin nota: puedes consultar la tabla. Este contador no mide el recuerdo sin ayuda.", hideModel: "Ocultar el modelo" },
};
function focusVisible(element: HTMLElement | null) {
  if (element && !element.closest('[hidden], [inert], [aria-hidden="true"]') && document.visibilityState !== "hidden") element.focus();
}

export function JapaneseDialoguePanel({ unit, locale, showRomaji }: { unit: JapaneseCourseUnit; locale: YoLocale; showRomaji: boolean }) {
  const [index, setIndex] = useState(0);
  const [meaning, setMeaning] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);
  const requested = useRef(false);
  const line = unit.dialogue[index];
  useEffect(() => { if (requested.current) { requested.current = false; focusVisible(lineRef.current); } }, [index]);
  function move(delta: number) { requested.current = true; window.dispatchEvent(new Event("yo-japanese-audio-stop")); setIndex((current) => Math.max(0, Math.min(unit.dialogue.length - 1, current + delta))); setMeaning(false); }
  return <section className="space-y-5">
    <p className="text-sm leading-relaxed text-slate-600">{unit.setting[locale]}</p>
    <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
      <div ref={lineRef} tabIndex={-1} className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-5 py-3 focus:outline-none"><span className="text-sm font-semibold text-indigo-900">{line.speaker[locale]}</span><span className="text-xs text-indigo-600">{COPY[locale].line} {index + 1} / {unit.dialogue.length}</span></div>
      <div className="space-y-4 p-5 sm:p-8">
        <JapanesePhraseView phrase={line} locale={locale} showRomaji={showRomaji} showMeaning={meaning} large />
        <button type="button" className="min-h-9 text-sm font-medium text-indigo-700 underline underline-offset-4" aria-expanded={meaning} onClick={() => setMeaning(!meaning)}>{meaning ? COPY[locale].hide : COPY[locale].reveal}</button>
      </div>
    </div>
    <div className="flex justify-between gap-3">
      <button type="button" className={pill} disabled={index === 0} onClick={() => move(-1)}><ChevronLeft size={16} aria-hidden />{COPY[locale].prev}</button>
      <button type="button" className={pill} disabled={index === unit.dialogue.length - 1} onClick={() => move(1)}>{COPY[locale].next}<ChevronRight size={16} aria-hidden /></button>
    </div>
  </section>;
}

export function JapaneseVocabularyLab({ unit, locale, showRomaji }: { unit: JapaneseCourseUnit; locale: YoLocale; showRomaji: boolean }) {
  const [queue, setQueue] = useState(() => unit.vocabulary.map((_, index) => index));
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const revealRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const focusRequested = useRef(false);
  const item = unit.vocabulary[queue[0] ?? 0];
  const c = COPY[locale];
  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    focusVisible(queue.length ? revealRef.current : doneRef.current);
  }, [queue, flipped]);
  function rate(remembered: boolean) {
    if (!flipped || !queue.length) return;
    focusRequested.current = true;
    setReviewed((current) => current.includes(item.id) ? current : [...current, item.id]);
    setQueue((current) => remembered ? current.slice(1) : [...current.slice(1), current[0]]);
    setFlipped(false);
    window.dispatchEvent(new Event("yo-japanese-audio-stop"));
  }
  return <section className="space-y-4">
    <div className="flex justify-between text-sm text-slate-600"><span>{c.confidence}</span><span>{c.reviewed} {reviewed.length} / {unit.vocabulary.length}</span></div>
    {queue.length ? <>
      <div className="space-y-5 rounded-3xl border border-indigo-100 bg-white p-6 text-center shadow-sm">
        <JapanesePhraseView phrase={item} locale={locale} showReading={flipped} showMeaning={flipped} showRomaji={flipped && showRomaji} large />
        <button ref={revealRef} type="button" className={pill + " !border-indigo-300 !text-indigo-900"} onClick={() => setFlipped(!flipped)} aria-expanded={flipped}>{flipped ? c.hide : c.reveal}</button>
      </div>
      {flipped ? <div className="grid grid-cols-2 gap-3"><button type="button" className={pill} onClick={() => rate(false)}>{c.again}</button><button type="button" className={pill + " !bg-indigo-700 !text-white"} onClick={() => rate(true)}>{c.recall}</button></div> : null}
    </> : <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><p ref={doneRef} role="status" tabIndex={-1} className="focus:outline-none">{c.done}</p><button type="button" className={pill + " mt-4"} onClick={() => { focusRequested.current = true; setQueue(unit.vocabulary.map((_, index) => index)); setReviewed([]); setFlipped(false); }}><RotateCcw size={15} aria-hidden />{c.restart}</button></div>}
    <p className="text-xs leading-relaxed text-slate-500">{c.recallNote}</p>
  </section>;
}

export function JapaneseKanaLab({ characters, locale }: { characters: string[]; locale: YoLocale }) {
  const [index, setIndex] = useState(0);
  const [practice, setPractice] = useState(false);
  const [chart, setChart] = useState(false);
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const feedback = useRef<HTMLParagraphElement>(null);
  const question = useRef<HTMLParagraphElement>(null);
  const characterRef = useRef<HTMLParagraphElement>(null);
  const requested = useRef<"feedback" | "question" | null>(null);
  const [focusTicket, setFocusTicket] = useState(0);
  const character = characters[index];
  const item = getJapaneseKana(character);
  const c = COPY[locale];
  const p = PRACTICE_COPY[locale];
  function requestFocus(target: "feedback" | "question") { requested.current = target; setFocusTicket((current) => current + 1); }
  useEffect(() => {
    const target = requested.current; requested.current = null;
    if (target) focusVisible(target === "feedback" ? feedback.current : practice ? question.current : characterRef.current);
  }, [focusTicket, practice]);
  function retry() { requestFocus("question"); setSelected(""); setChecked(false); window.dispatchEvent(new Event("yo-japanese-audio-stop")); }
  function move(delta: number) { requestFocus("question"); setIndex((current) => Math.max(0, Math.min(characters.length - 1, current + delta))); setSelected(""); setChecked(false); window.dispatchEvent(new Event("yo-japanese-audio-stop")); }
  return <section className="space-y-4" data-no-deck-swipe data-no-deck-tap>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex rounded-full bg-slate-100 p-1"><button type="button" aria-pressed={!practice} className={pill + (!practice ? " !bg-indigo-700 !text-white" : " !border-transparent !bg-transparent")} onClick={() => { setPractice(false); retry(); }}>{c.study}</button><button type="button" aria-pressed={practice} className={pill + (practice ? " !bg-indigo-700 !text-white" : " !border-transparent !bg-transparent")} onClick={() => { setPractice(true); retry(); }}>{c.practice}</button></div>
      <span className="text-sm text-slate-500">{index + 1} / {characters.length}</span>
    </div>
    <div className="rounded-3xl border border-indigo-100 bg-white p-5 text-center shadow-sm">
      <p ref={characterRef} tabIndex={-1} lang="ja" className="text-8xl leading-tight text-slate-900 focus:outline-none">{character}</p>
      {!practice || checked ? <p lang="ja-Latn" className="my-3 text-xl font-medium text-indigo-700">{item?.romaji}</p> : null}
      {!practice || checked ? <JapaneseCourseAudio text={character === "を" || character === "ヲ" ? "お" : character} locale={locale} /> : null}
    </div>
    {practice ? <div className="space-y-3">
      <p ref={question} tabIndex={-1} className="text-sm font-medium focus:outline-none">{c.choose}</p>
      <div className="grid grid-cols-4 gap-2">{kanaDistractors(character).map((answer) => <button key={answer} type="button" className={pill + (selected === answer ? " !border-indigo-500 !bg-indigo-50" : "")} disabled={checked} aria-pressed={selected === answer} onClick={() => setSelected(answer)}>{answer}</button>)}</div>
      {!checked ? <button type="button" className={pill + " !bg-indigo-700 !text-white"} disabled={!selected} onClick={() => { requestFocus("feedback"); setChecked(true); if (selected === item?.romaji) setHits((current) => current.includes(character) ? current : [...current, character]); }}>{c.check}</button> : <div className="space-y-3"><p ref={feedback} tabIndex={-1} className="rounded-xl bg-indigo-50 p-3 text-sm focus:outline-none">{selected === item?.romaji ? c.correct : c.wrong} <span lang="ja">{character}</span> → {item?.romaji}. {p.count} : {hits.length} / {characters.length}</p><button type="button" onClick={retry} className={pill}><RotateCcw size={15} aria-hidden />{p.retry}</button></div>}
      <p className="text-xs leading-relaxed text-slate-500">{p.note}</p>
    </div> : null}
    <div className="flex justify-between"><button className={pill} disabled={index === 0} onClick={() => move(-1)}>{c.prev}</button><button className={pill} disabled={index === characters.length - 1} onClick={() => move(1)}>{c.next}</button></div>
    <button type="button" className="min-h-10 text-sm text-indigo-800 underline underline-offset-4" onClick={() => setChart(!chart)} aria-expanded={chart}>{chart ? c.close : c.all}</button>
    {chart ? <div className="space-y-4 rounded-2xl bg-slate-50 p-4">{(["hiragana", "katakana"] as const).map((script) => <div key={script}><h3 className="mb-3 text-sm font-semibold capitalize">{script}</h3><div className="grid grid-cols-5 gap-1">{japaneseKana.filter((kana) => kana.script === script).map((kana) => <div key={kana.character} className="rounded-lg bg-white p-2 text-center"><span lang="ja" className="block text-xl">{kana.character}</span><span className="text-xs text-slate-500">{kana.romaji}</span></div>)}</div></div>)}</div> : null}
    <details className="rounded-xl border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-medium">{c.basics}</summary><p className="mt-3 leading-relaxed text-slate-600">{c.soundNote}</p></details>
  </section>;
}

export function JapaneseWritingLab({ unit, locale, showRomaji }: { unit: JapaneseCourseUnit; locale: YoLocale; showRomaji: boolean }) {
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([]);
  const c = COPY[locale];
  return <section className="space-y-4">
    <p className="text-base leading-relaxed">{unit.writing.prompt[locale]}</p>
    <label className="block text-sm font-semibold">{c.write}<textarea lang="ja" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} rows={4} className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white p-4 text-lg font-normal leading-relaxed focus:outline focus:outline-2 focus:outline-indigo-500" /></label>
    <p className="text-xs text-slate-500">{c.private}</p>
    <button type="button" onClick={() => setModel(!model)} aria-expanded={model} className={pill}>{model ? PRACTICE_COPY[locale].hideModel : c.model}</button>
    {model ? <div className="rounded-2xl bg-indigo-50 p-4"><JapanesePhraseView phrase={unit.writing.model} locale={locale} showRomaji={showRomaji} /></div> : null}
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><legend className="px-2 text-sm font-semibold">{c.self}</legend>
      {unit.writing.checklist.map((item, index) => <label key={index} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={!!checks[index]} onChange={(event) => setChecks((current) => { const next = [...current]; next[index] = event.target.checked; return next; })} className="mt-1 size-4 accent-indigo-700" />{item[locale]}</label>)}
    </fieldset>
  </section>;
}
