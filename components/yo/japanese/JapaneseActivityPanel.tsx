"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lightbulb, RotateCcw, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { JapaneseActivity, JapaneseChoice } from "@/lib/yo/japaneseCourseTypes";
import { checkJapaneseAnswer, type JapaneseAnswer } from "@/lib/yo/japaneseCourseProgress";
import { JapaneseCourseAudio } from "./JapaneseCourseAudio";

export interface JapaneseActivityState {
  answer: JapaneseAnswer;
  checked: boolean;
  correct: boolean;
  assisted: boolean;
  showHint: boolean;
  showTranscript: boolean;
  matchLeft: string | null;
  revision: number;
}
export function initialJapaneseActivityState(activity: JapaneseActivity, revision = 0): JapaneseActivityState {
  return { answer: activity.kind === "build" ? [] : activity.kind === "match" ? {} : "", checked: false, correct: false, assisted: false, showHint: false, showTranscript: false, matchLeft: null, revision };
}
const COPY = {
  fr: { check: "Vérifier", retry: "Réessayer", hint: "Un indice avec Yoppo", correct: "Bien joué.", incorrect: "Une autre tentative ?", assisted: "Réussi avec aide", independent: "Réussi dans cet exercice", transcript: "Lire la transcription", hide: "Masquer la transcription", listen: "Écoute le message, puis choisis.", answer: "Ta réponse", kana: "Réponds en kana.", romaji: "Kana ou rōmaji accepté.", build: "Compose la phrase", bank: "Mots disponibles", undo: "Annuler le dernier mot", clear: "Recommencer la phrase", left: "Choisis un mot japonais, puis son sens.", chosen: "Sélectionné", paired: "Associé", model: "Modèle", feedback: "Retour", reading: "Lecture" },
  en: { check: "Check", retry: "Try again", hint: "A hint from Yoppo", correct: "Well done.", incorrect: "Try another approach?", assisted: "Completed with help", independent: "Correct in this exercise", transcript: "Read the transcript", hide: "Hide the transcript", listen: "Listen to the message, then choose.", answer: "Your answer", kana: "Answer in kana.", romaji: "Kana or rōmaji accepted.", build: "Build the sentence", bank: "Available words", undo: "Undo last word", clear: "Restart sentence", left: "Choose a Japanese word, then its meaning.", chosen: "Selected", paired: "Paired", model: "Model", feedback: "Feedback", reading: "Reading" },
  es: { check: "Verificar", retry: "Reintentar", hint: "Una pista de Yoppo", correct: "Bien hecho.", incorrect: "¿Otro intento?", assisted: "Completado con ayuda", independent: "Correcto en este ejercicio", transcript: "Leer la transcripción", hide: "Ocultar transcripción", listen: "Escucha el mensaje y elige.", answer: "Tu respuesta", kana: "Responde en kana.", romaji: "Se acepta kana o rōmaji.", build: "Construye la frase", bank: "Palabras disponibles", undo: "Deshacer última palabra", clear: "Reiniciar frase", left: "Elige una palabra japonesa y después su significado.", chosen: "Seleccionado", paired: "Asociado", model: "Modelo", feedback: "Comentarios", reading: "Lectura" },
};
const button = "min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-800 transition hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-default disabled:opacity-80";
const AUDIO_LABEL = { fr: "le message de l’exercice", en: "the exercise message", es: "el mensaje del ejercicio" };
const REMOVE_WORD = { fr: "Retirer le mot", en: "Remove word", es: "Quitar palabra" };
type FocusTarget = { kind: "feedback" | "question" | "build" | "check" } | { kind: "bank" | "match"; id: string };

export function JapaneseActivityPanel({ activity, locale, state, onChange, onResult, showRomaji = false }: {
  activity: JapaneseActivity; locale: YoLocale; state: JapaneseActivityState;
  onChange: (state: JapaneseActivityState) => void;
  onResult: (correct: boolean, assisted: boolean) => void;
  showRomaji?: boolean;
}) {
  const c = COPY[locale];
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const buildRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const bankRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const matchRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const composing = useRef(false);
  const ignoreImeSubmit = useRef(false);
  const submittedAttempt = useRef<string | null>(null);
  const attemptId = `${activity.id}:${state.revision}`;
  const choiceRomajiVisible = showRomaji && "choices" in activity && activity.choices.some((choice) => Boolean(choice.romaji));
  const focusRequest = useRef<FocusTarget | null>(null);
  const [focusTicket, setFocusTicket] = useState(0);
  const [pairAnnouncement, setPairAnnouncement] = useState<{ attempt: string; word: string; meaning: string } | null>(null);
  function requestFocus(target: FocusTarget) { focusRequest.current = target; setFocusTicket((current) => current + 1); }
  useEffect(() => {
    const target = focusRequest.current; focusRequest.current = null;
    if (!target) return;
    const element = target.kind === "feedback" ? feedbackRef.current : target.kind === "question" ? questionRef.current :
      target.kind === "build" ? buildRef.current : target.kind === "check" ? checkRef.current :
      target.kind === "bank" ? bankRefs.current[target.id] : target.kind === "match" ? matchRefs.current[target.id] : null;
    if (element && !element.closest('[hidden], [inert], [aria-hidden="true"]') && document.visibilityState !== "hidden") element.focus();
  }, [focusTicket]);
  useEffect(() => { if (!state.checked) submittedAttempt.current = null; }, [activity.id, state.revision, state.checked]);
  useEffect(() => { composing.current = false; ignoreImeSubmit.current = false; }, [activity.id, state.revision]);
  useEffect(() => {
    // Once an answer aid is seen, hiding it cannot make this attempt unaided.
    if (choiceRomajiVisible && !state.checked && !state.assisted) onChange({ ...state, assisted: true });
  }, [choiceRomajiVisible, onChange, state]);
  const change = (patch: Partial<JapaneseActivityState>) => onChange({ ...state, ...patch });
  const selected = typeof state.answer === "string" ? state.answer : "";
  const order = Array.isArray(state.answer) ? state.answer : [];
  const pairs = typeof state.answer === "object" && !Array.isArray(state.answer) ? state.answer : {};
  const ready = activity.kind === "build" ? order.length === activity.answerOrder.length :
    activity.kind === "match" ? activity.pairs.every((pair) => pairs[pair.id]) : selected.trim().length > 0;
  const selectedChoice = "choices" in activity ? activity.choices.find((choice) => choice.id === selected) : undefined;

  function check() {
    if (!ready || state.checked || composing.current || submittedAttempt.current === attemptId) return;
    submittedAttempt.current = attemptId;
    const correct = checkJapaneseAnswer(activity, state.answer);
    const assisted = state.assisted || choiceRomajiVisible;
    requestFocus({ kind: "feedback" });
    change({ checked: true, correct, assisted });
    onResult(correct, assisted);
  }
  function retry() {
    requestFocus({ kind: "question" });
    onChange(initialJapaneseActivityState(activity, state.revision + 1));
  }
  function choiceText(choice: JapaneseChoice) {
    return <>
      {choice.ja ? <span lang="ja" className="block text-base">{choice.ja}</span> : <span>{choice.label?.[locale]}</span>}
      {showRomaji && choice.romaji ? <span lang="ja-Latn" className="mt-1 block text-xs text-slate-500">{choice.romaji}</span> : null}
    </>;
  }
  return <section aria-label={activity.title[locale]} className="space-y-5" data-japanese-activity={activity.id} data-no-deck-swipe data-no-deck-tap>
    <p ref={questionRef} tabIndex={-1} className="text-lg leading-relaxed text-slate-800 focus:outline-none">{activity.prompt[locale]}</p>
    {activity.kind === "listening" && activity.stimulus ? <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
      <p className="mb-3 text-sm font-medium text-indigo-900">{c.listen}</p>
      <JapaneseCourseAudio text={activity.stimulus.ja} locale={locale} label={AUDIO_LABEL[locale]} />
      <button type="button" className="mt-3 block min-h-9 text-sm text-indigo-800 underline underline-offset-4" onClick={() => change({ showTranscript: !state.showTranscript, assisted: state.checked ? state.assisted : true })}>{state.showTranscript ? c.hide : c.transcript}</button>
      {state.showTranscript ? <p lang="ja" className="mt-3 text-xl leading-relaxed">{activity.stimulus.ja}</p> : null}
    </div> : null}
    {(activity.kind === "choice" || activity.kind === "culture") && activity.stimulus ? <p lang="ja" className="rounded-2xl bg-slate-50 p-4 text-xl leading-relaxed">{activity.stimulus.ja}</p> : null}
    {"choices" in activity ? <div className="grid gap-3" role="group" aria-label={c.answer}>
      {activity.choices.map((choice) => <button key={choice.id} type="button" disabled={state.checked} aria-pressed={selected === choice.id} onClick={() => change({ answer: choice.id })}
        className={button + (selected === choice.id ? " border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100" : "")}>{choiceText(choice)}</button>)}
    </div> : null}
    {activity.kind === "reading" ? <form onSubmit={(event) => { event.preventDefault(); if (!composing.current && !ignoreImeSubmit.current) check(); }} className="space-y-3">
      <p lang="ja" className="rounded-2xl bg-slate-50 p-5 text-center text-4xl font-medium">{activity.stimulus}</p>
      <label className="block text-sm font-semibold">
        {c.reading} <span className="font-normal text-slate-500">· {activity.acceptsRomaji ? c.romaji : c.kana}</span>
        <input lang="ja" value={selected} onChange={(event) => change({ answer: event.target.value })} disabled={state.checked} maxLength={100} autoComplete="off" autoCapitalize="off" spellCheck={false}
          onCompositionStart={() => { composing.current = true; ignoreImeSubmit.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") { if (!composing.current) ignoreImeSubmit.current = false; return; }
            // Safari may finish composition before the Enter keydown but still reports the IME key code.
            if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) { ignoreImeSubmit.current = true; return; }
            ignoreImeSubmit.current = false;
            event.preventDefault();
            check();
          }}
          className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-xl focus:outline focus:outline-2 focus:outline-indigo-500" />
      </label>
    </form> : null}
    {activity.kind === "build" ? <div className="space-y-4">
      <p className="text-sm text-slate-600">{activity.phrase.meaning[locale]}</p>
      <div ref={buildRef} tabIndex={-1} role="group" aria-label={c.build} className="flex min-h-20 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-3 focus:outline-none">
        {order.map((id, index) => <button key={id} type="button" disabled={state.checked} className={button + " !border-indigo-200 !px-3 !py-2"} onClick={() => { requestFocus({ kind: "bank", id }); change({ answer: order.filter((_, i) => i !== index) }); }}><span className="sr-only">{REMOVE_WORD[locale]} </span><span lang="ja">{activity.tokens.find((token) => token.id === id)?.text}</span><X size={12} className="ml-1 inline" aria-hidden /></button>)}
        {!order.length ? <span className="self-center text-sm text-slate-400">{c.build}</span> : null}
      </div>
      <div role="group" aria-label={c.bank} className="flex flex-wrap gap-2">
        {activity.tokens.map((token) => <button ref={(element) => { bankRefs.current[token.id] = element; }} key={token.id} type="button" lang="ja" className={button + " !px-3 !py-2"} disabled={state.checked || order.includes(token.id)} onClick={() => {
          const nextOrder = [...order, token.id];
          const nextToken = activity.tokens.find((item) => !nextOrder.includes(item.id));
          requestFocus(nextOrder.length === activity.answerOrder.length ? { kind: "check" } : nextToken ? { kind: "bank", id: nextToken.id } : { kind: "build" });
          change({ answer: nextOrder });
        }}>{token.text}</button>)}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <button type="button" disabled={state.checked || !order.length} className="min-h-9 underline disabled:opacity-40" onClick={() => { requestFocus({ kind: "bank", id: order[order.length - 1] }); change({ answer: order.slice(0, -1) }); }}>{c.undo}</button>
        <button type="button" disabled={state.checked || !order.length} className="min-h-9 underline disabled:opacity-40" onClick={() => { if (activity.tokens[0]) requestFocus({ kind: "bank", id: activity.tokens[0].id }); change({ answer: [] }); }}>{c.clear}</button>
      </div>
    </div> : null}
    {activity.kind === "match" ? <div className="space-y-3">
      <p className="text-sm text-slate-600">{c.left}</p>
      <p role="status" aria-live="polite" className="sr-only">{pairAnnouncement?.attempt === attemptId ? <>{c.paired} : <span lang="ja">{pairAnnouncement.word}</span> → {pairAnnouncement.meaning}</> : ""}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">{activity.pairs.map((pair, index) => <button ref={(element) => { matchRefs.current[pair.id] = element; }} key={pair.id} type="button" disabled={state.checked} aria-pressed={state.matchLeft === pair.id}
          onClick={() => change({ matchLeft: state.matchLeft === pair.id ? null : pair.id })}
          className={button + (state.matchLeft === pair.id ? " border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100" : "")}>
          <span className="mr-2 text-xs font-bold text-indigo-500">{index + 1}</span><span lang="ja">{pair.phrase.ja}</span>
          {pairs[pair.id] ? <span className="mt-1 block text-xs text-slate-500">{c.paired} · {activity.pairs.find((right) => right.id === pairs[pair.id])?.phrase.meaning[locale]}</span> : null}
        </button>)}</div>
        <div className="grid gap-2">{[...activity.pairs].reverse().map((pair) => {
          const owner = activity.pairs.findIndex((left) => pairs[left.id] === pair.id);
          return <button key={pair.id} type="button" disabled={state.checked || !state.matchLeft} className={button}
            onClick={() => {
              if (!state.matchLeft) return;
              const next = { ...pairs };
              for (const left of Object.keys(next)) if (next[left] === pair.id) delete next[left];
              next[state.matchLeft] = pair.id;
              const matched = activity.pairs.find((left) => left.id === state.matchLeft);
              setPairAnnouncement({ attempt: attemptId, word: matched?.phrase.ja ?? "", meaning: pair.phrase.meaning[locale] });
              const nextLeft = activity.pairs.find((left) => !next[left.id]);
              requestFocus(nextLeft ? { kind: "match", id: nextLeft.id } : { kind: "check" });
              change({ answer: next, matchLeft: null });
            }}>{owner >= 0 ? <span className="mr-2 text-xs font-bold text-indigo-500">{owner + 1}</span> : null}{pair.phrase.meaning[locale]}</button>;
        })}</div>
      </div>
    </div> : null}
    {!state.checked ? <div className="flex flex-wrap items-center justify-between gap-3">
      <button ref={checkRef} type="button" disabled={!ready} onClick={check} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-700 px-6 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"><Check size={17} aria-hidden />{c.check}</button>
      <button type="button" onClick={() => change({ showHint: !state.showHint, assisted: true })} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-indigo-800 underline underline-offset-4"><Lightbulb size={16} aria-hidden />{c.hint}</button>
    </div> : null}
    {state.showHint ? <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{activity.hint[locale]}</aside> : null}
    {state.checked ? <div className={"space-y-3 rounded-2xl border p-5 " + (state.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <h3 ref={feedbackRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">{state.correct ? c.correct : c.incorrect}</h3>
      {state.correct ? <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{state.assisted ? c.assisted : c.independent}</p> : null}
      {selectedChoice ? <p className="text-sm leading-relaxed">{selectedChoice.feedback[locale]}</p> : null}
      <p className="text-sm leading-relaxed">{activity.explanation[locale]}</p>
      {activity.kind === "reading" ? <p lang="ja" className="text-xl">{activity.answer}</p> : null}
      {activity.kind === "build" ? <p lang="ja" className="text-xl">{activity.phrase.ja}</p> : null}
      <button type="button" onClick={retry} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-current px-4 text-sm font-semibold"><RotateCcw size={14} aria-hidden />{c.retry}</button>
    </div> : null}
  </section>;
}
