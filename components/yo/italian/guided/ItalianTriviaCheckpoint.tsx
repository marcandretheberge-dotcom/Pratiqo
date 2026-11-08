"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Flame, Flag, Gamepad2, Headphones, LockKeyhole, RotateCcw, Trophy } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import {
  ITALIAN_TRIVIA_COUNT, ITALIAN_TRIVIA_PASS, buildItalianTrivia, canPlayItalianTrivia,
  readTriviaSouvenir, triviaSouvenirAfterRound, triviaSouvenirKey, type ItalianTriviaSouvenir,
} from "@/lib/yo/italian/trivia";
import { useLearningFeedback } from "../../feedback/LearningFeedback";
import { LearningAudio } from "../../personalized/LearningAudio";

type Answer = { correct: boolean; assisted: boolean };
type Phase = "intro" | "playing" | "result";
const surface = "rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

/** Optional halfway quiz; canonical course progress and challenge gating remain untouched.
 * Its local souvenir is cosmetic only and cannot unlock cities or spend Passes. */
export function ItalianTriviaCheckpoint({ unit, locale, progress }: {
  unit: CourseUnit; locale: YoLocale; progress: CourseProgress;
}) {
  const enabled = canPlayItalianTrivia(unit, progress);
  const questions = useMemo(() => buildItalianTrivia(unit), [unit]);
  const feedback = useLearningFeedback();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [souvenir, setSouvenir] = useState<ItalianTriviaSouvenir | null>(null);
  const [run, setRun] = useState(0);
  const [stored, setStored] = useState(true);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const savedKey = triviaSouvenirKey(unit.id);
  const c = {
    fr: {
      title: "Halte Trivia avec Yoppo", introduction: "Cinq questions inédites sur les deux premières missions. Écoute, reconnais et retrouve les expressions pour continuer à progresser.",
      locked: "Termine d'abord la première moitié des missions pour découvrir le checkpoint.", play: "Jouer au Trivia", replay: "Rejouer",
      challenge: "Défi", word: "Vocabulaire", hearing: "À l'oreille", use: "En situation",
      show: "Lire l'expression (avec aide)", heard: "Écoute l'expression ou révèle-la avant de répondre.",
      success: "Bien joué !", wrong: "Bonne occasion de réviser.", correct: "La bonne réponse :",
      next: "Question suivante", finish: "Voir mon résultat", exit: "Retour aux missions",
      prize: "Médaille Trivia", won: "Médaille gagnée !", almost: "Revois ces expressions et rejoue.",
      scored: "réponses correctes (une aide empêche la médaille)", required: "4 bonnes réponses sur 5 sans aide pour la médaille.",
      reminder: "Ce jeu aide à mémoriser, mais ne remplace pas le défi final de la ville et n'attribue aucun Yoppo Pass.",
      noSave: "La médaille n'a pas pu être enregistrée sur cet appareil.",
    },
    en: {
      title: "Yoppo's Trivia checkpoint", introduction: "Five original questions on the first two missions. Listen, recognise and recall expressions to keep progressing.",
      locked: "Finish the first half of the missions to reach this checkpoint.", play: "Play Trivia", replay: "Play again",
      challenge: "Challenge", word: "Words", hearing: "Listen", use: "In context",
      show: "Reveal expression (assisted)", heard: "Listen to the expression or reveal it before answering.",
      success: "Well done!", wrong: "Good opportunity to review.", correct: "Correct answer:",
      next: "Next question", finish: "See my score", exit: "Back to missions",
      prize: "Trivia medal", won: "Medal earned!", almost: "Review these expressions and play again.",
      scored: "correct answers (help prevents earning the medal)", required: "4 out of 5 correct without help earns the medal.",
      reminder: "This game helps recall, but it does not replace a city's final challenge or grant Yoppo Passes.",
      noSave: "This medal could not be saved on this device.",
    },
    es: {
      title: "Checkpoint Trivia de Yoppo", introduction: "Cinco preguntas originales sobre las dos primeras misiones. Escucha, reconoce y recuerda expresiones para seguir avanzando.",
      locked: "Termina primero la mitad de las misiones para llegar a este checkpoint.", play: "Jugar al Trivia", replay: "Volver a jugar",
      challenge: "Desafío", word: "Vocabulario", hearing: "Escucha", use: "En contexto",
      show: "Mostrar expresión (con ayuda)", heard: "Escucha o revela la expresión antes de responder.",
      success: "¡Muy bien!", wrong: "Una buena ocasión para repasar.", correct: "Respuesta correcta:",
      next: "Pregunta siguiente", finish: "Ver resultado", exit: "Volver a las misiones",
      prize: "Medalla Trivia", won: "¡Medalla conseguida!", almost: "Repasa estas expresiones y vuelve a jugar.",
      scored: "respuestas correctas (la ayuda impide ganar la medalla)", required: "4 de 5 respuestas correctas sin ayuda dan la medalla.",
      reminder: "Este juego ayuda a recordar, pero no sustituye el reto final de la ciudad ni otorga Yoppo Passes.",
      noSave: "No se pudo guardar la medalla en este dispositivo.",
    },
  }[locale];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setSouvenir(readTriviaSouvenir(localStorage.getItem(savedKey), unit.id, progress.resetAt)); setStored(true); }
      catch { setSouvenir(null); setStored(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [savedKey, unit.id, progress.resetAt]);
  useEffect(() => {
    if (phase !== "playing") return;
    const frame = requestAnimationFrame(() => questionHeading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [phase, index]);

  const question = questions[index];
  const correct = selected !== null && selected === question?.correctOptionId;
  const canRespond = !question?.audioText || heard || revealed;
  const won = answers.length === ITALIAN_TRIVIA_COUNT && !answers.some(a => a.assisted) && answers.filter(a => a.correct).length >= ITALIAN_TRIVIA_PASS;
  const earnedEarlier = (souvenir?.bestCorrect ?? 0) >= ITALIAN_TRIVIA_PASS;
  let streak = 0;
  for (const entry of answers) streak = entry.correct && !entry.assisted ? streak + 1 : 0;

  function start() {
    if (!enabled || questions.length !== ITALIAN_TRIVIA_COUNT) return;
    setPhase("playing"); setIndex(0); setAnswers([]); setSelected(null); setRevealed(false); setHeard(false); setRun(value => value + 1);
    feedback.step();
  }
  function answer(id: string) {
    if (!enabled || selected !== null || !canRespond || !question?.options.some(item => item.id === id)) return;
    const success = id === question.correctOptionId;
    setSelected(id);
    setAnswers(previous => [...previous, { correct: success, assisted: revealed }]);
    if (success) feedback.emit(`trivia:${unit.id}:${run}:${question.id}`, "correct");
  }
  function advance() {
    if (selected === null || answers.length !== index + 1) return;
    if (index + 1 < questions.length) {
      setIndex(index + 1); setSelected(null); setHeard(false); setRevealed(false);
      return;
    }
    const updated = triviaSouvenirAfterRound(souvenir, unit.id, progress.resetAt, answers);
    if (updated) {
      setSouvenir(updated);
      try { localStorage.setItem(savedKey, JSON.stringify(updated)); setStored(true); }
      catch { setStored(false); }
      if ((souvenir?.bestCorrect ?? 0) < ITALIAN_TRIVIA_PASS && updated.bestCorrect >= ITALIAN_TRIVIA_PASS) {
        feedback.emit(`trivia:medal:${unit.id}:${progress.resetAt}:${run}`, "stamp");
      }
    }
    setPhase("result");
  }

  return <section className="min-w-0 rounded-3xl border-2 border-[#d7c79a] bg-[#fff8e5] p-4 sm:p-5" data-yoppo-trivia={unit.id} data-trivia-eligible={enabled}>
    <div className="flex items-start gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-200 text-amber-950">
        {earnedEarlier ? <Trophy size={24} aria-hidden /> : enabled ? <Gamepad2 size={24} aria-hidden /> : <LockKeyhole size={22} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-900">{c.challenge} · {ITALIAN_TRIVIA_COUNT} questions</p>
        <h3 className="mt-1 text-lg font-black text-stone-900">{c.title}</h3>
        {phase === "intro" ? <p className="mt-2 text-sm leading-6 text-stone-700">{enabled ? c.introduction : c.locked}</p> : null}
      </div>
    </div>
    {phase === "intro" ? <>
      {earnedEarlier ? <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-amber-900"><Trophy size={16} aria-hidden />{c.won}</p> : null}
      <p className="mt-3 text-xs leading-5 text-stone-600">{c.required}</p>
      <p className="mt-2 text-xs leading-5 text-stone-600">{c.reminder}</p>
      {enabled && questions.length === ITALIAN_TRIVIA_COUNT ? <button type="button" className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900" onClick={start}>{earnedEarlier ? c.replay : c.play}<ArrowRight size={17} aria-hidden /></button> : null}
    </> : null}
    {phase === "playing" && question ? <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-5 flex items-center gap-4">
        <div key={question.id} className="yo-trivia-wheel relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-amber-200 bg-white shadow-sm" data-yoppo-trivia-wheel aria-hidden="true">
          <div className="absolute inset-0" style={{ background: "conic-gradient(#f5c56d 0deg 120deg, #a3d0aa 120deg 240deg, #9dbde3 240deg 360deg)" }} />
          <div className="relative grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-emerald-900 text-white"><Gamepad2 size={19} /></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">{c.title}</p>
          <p className="mt-1 text-sm font-semibold text-stone-800">{question.mode === "listening" ? c.hearing : question.mode === "expression" ? c.use : c.word}</p>
          {streak > 1 ? <p className="mt-2 flex items-center gap-1 text-sm font-bold text-orange-800"><Flame size={16} aria-hidden />{streak} {locale === "fr" ? "réussites de suite" : locale === "es" ? "aciertos seguidos" : "correct in a row"}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-emerald-900">
        <span className="flex items-center gap-2">{question.mode === "listening" ? <Headphones size={17} aria-hidden /> : <Flag size={17} aria-hidden />}{question.mode === "listening" ? c.hearing : question.mode === "expression" ? c.use : c.word}</span>
        <span>{index + 1} / {questions.length}</span>
      </div>
      <div role="progressbar" aria-label={c.title} aria-valuenow={index} aria-valuemin={0} aria-valuemax={questions.length} className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${index / questions.length * 100}%` }} /></div>
      <h4 ref={questionHeading} tabIndex={-1} className="mt-5 text-lg font-bold leading-7 text-stone-900 outline-none">{question.prompt[locale]}</h4>
      {question.audioText ? <div className="mt-4 rounded-xl bg-emerald-50 p-3">
        <LearningAudio text={question.audioText} locale={locale} label={c.hearing} onListen={() => setHeard(true)}/>
        {!heard && !revealed ? <p className="mt-2 text-xs text-stone-600">{c.heard}</p> : null}
        <button type="button" disabled={selected !== null} className="mt-2 min-h-11 text-sm font-semibold text-emerald-800 underline disabled:opacity-50" onClick={() => setRevealed(true)}>{c.show}</button>
        {revealed ? <p lang="it" className="mt-2 text-lg font-bold">{question.audioText}</p> : null}
      </div> : null}
      <div role="group" aria-label={c.play} className="mt-5 grid gap-2 sm:grid-cols-2">
        {question.options.map((option, i) => <button key={option.id} type="button" disabled={!canRespond || selected !== null}
          aria-pressed={selected === option.id} onClick={() => answer(option.id)}
          className={`${surface} ${selected === option.id ? correct ? "border-emerald-700 bg-emerald-50" : "border-orange-700 bg-orange-50" : "hover:border-emerald-700"}`}>
          <span className="mr-2 text-xs text-emerald-800">{String.fromCharCode(65 + i)}.</span>
          <span lang={question.mode === "expression" ? "it" : locale}>{option.label[locale]}</span>
        </button>)}
      </div>
      {selected !== null ? <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-bold text-emerald-900">{correct ? <CheckCircle2 size={18} aria-hidden /> : <RotateCcw size={18} aria-hidden />}{correct ? c.success : c.wrong}</p>
        <p className="mt-2 text-sm">{c.correct} {question.options.find(item => item.id === question.correctOptionId)?.label[locale]}</p>
        <p lang="it" className="mt-2 text-sm">{question.explanation[locale]}</p>
        <button type="button" onClick={advance} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white">{index + 1 === questions.length ? c.finish : c.next}<ArrowRight size={16} aria-hidden /></button>
      </div> : null}
      <button type="button" className="mt-4 min-h-11 text-sm font-semibold text-stone-600 underline" onClick={() => setPhase("intro")}>{c.exit}</button>
    </div> : null}
    {phase === "result" ? <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5" role="status">
      <div className="flex items-center gap-3"><CompanionAvatar visualId="travel" state={won ? "celebrating" : "teacher_ready"} size="sm" locale={locale} compact />
        <div><p className="text-2xl font-bold text-emerald-900">{answers.filter(a => a.correct).length} / {ITALIAN_TRIVIA_COUNT}</p><p className="text-sm text-stone-700">{won ? c.won : c.almost}</p></div>
      </div>
      <p className="mt-3 text-xs text-stone-600">{c.scored}</p>
      <p className="mt-4 text-xs leading-5 text-stone-600">{c.reminder}</p>
      {!stored ? <p className="mt-2 text-xs text-orange-800">{c.noSave}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white" onClick={start}>{c.replay}</button><button type="button" className={surface} onClick={() => setPhase("intro")}>{c.exit}</button></div>
    </div> : null}
    <style>{`@keyframes yo-trivia-wheel-pop{from{transform:rotate(-300deg) scale(.85);opacity:.6}to{transform:rotate(0) scale(1);opacity:1}}@media(prefers-reduced-motion:no-preference){.yo-trivia-wheel{animation:yo-trivia-wheel-pop .6s ease-out}}`}</style>
  </section>;
}
