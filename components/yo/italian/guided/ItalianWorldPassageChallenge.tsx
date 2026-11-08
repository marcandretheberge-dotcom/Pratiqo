"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Compass, LockKeyhole, Music2, RotateCcw, Sparkles } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { emptyGame, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { evaluateItalianWorldPassage, ITALIAN_PASSAGE_MIN_CORRECT, type ItalianPassageAnswer, type ItalianWorldPassage } from "@/lib/yo/italian/worldPassage";
import { useLearningFeedback } from "../../feedback/LearningFeedback";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { GuidedGame } from "./GuidedGame";
import { primary, secondary } from "./copy";

type Props = {
  passage: ItalianWorldPassage;
  locale: YoLocale;
  targetCity: string;
  onTravel: (unitId: string) => boolean;
};

const COPY = {
  fr: {
    title: "La Flûte des horizons · passage secret",
    subtitle: "Tu connais déjà les bases de ce monde ? Prouve-le pour rejoindre une ville plus avancée.",
    purpose: "Ce raccourci ne valide aucun module. Tu étudieras et passeras les défis de la nouvelle ville normalement.",
    rule: "Cinq questions de placement tirées des quatre villes de ce monde. Quatre réponses justes sur cinq, sans aide, ouvrent le passage. Aucune écriture obligatoire.",
    reveal: "Tenter le passage secret", question: "Épreuve de passage", start: "Commencer l'épreuve", next: "Question suivante",
    finish: "Découvrir le résultat", ready: "La flûte résonne !", notReady: "Le portail attend encore.",
    success: "Tu peux commencer à apprendre dans le monde suivant. Aucun ancien tampon ni Pass n'est accordé.",
    failure: "Reprends les missions de ce monde pour mieux préparer ton prochain essai.",
    travel: "Traverser le portail", retry: "Réessayer les cinq questions", leave: "Revenir à la carte",
    savedError: "Impossible de conserver ton nouveau point de départ sur cet appareil. Le portail reste fermé.",
    privacy: "Vérification pédagogique facultative : les réponses ne sont pas enregistrées et ne donnent aucun crédit.",
    help: "Les indices et les transcriptions comptent comme aide pour cette épreuve.",
  },
  en: {
    title: "Flute of Horizons · secret passage",
    subtitle: "Already know the basics of this world? Show what you know to reach an advanced city.",
    purpose: "This shortcut does not complete any module. You will study and pass the new city's challenges normally.",
    rule: "Five placement questions covering this world's four cities. Four out of five correct without help opens the passage. No required writing.",
    reveal: "Try the secret passage", question: "Passage challenge", start: "Start the challenge", next: "Next question",
    finish: "See the result", ready: "The flute rings out!", notReady: "The portal isn't ready yet.",
    success: "You may begin learning in the next world. No previous stamps or Passes are awarded.",
    failure: "Review this world's missions before your next attempt.",
    travel: "Enter the portal", retry: "Retry five questions", leave: "Return to the map",
    savedError: "Your new starting point could not be saved on this device. The portal remains closed.",
    privacy: "Optional learning check: answers aren't stored and no credits are awarded.",
    help: "Hints and transcripts count as help in this challenge.",
  },
  es: {
    title: "Flauta de los horizontes · pasaje secreto",
    subtitle: "¿Ya conoces las bases de este mundo? Demuéstralo para llegar a una ciudad más avanzada.",
    purpose: "Este atajo no completa ningún módulo. Estudiarás y superarás los retos de la nueva ciudad normalmente.",
    rule: "Cinco preguntas de nivel sobre las cuatro ciudades de este mundo. Cuatro de cinco correctas sin ayuda abren el pasaje. No hay escritura obligatoria.",
    reveal: "Probar el pasaje secreto", question: "Prueba de paso", start: "Empezar la prueba", next: "Pregunta siguiente",
    finish: "Ver resultado", ready: "¡La flauta resuena!", notReady: "El portal aún espera.",
    success: "Puedes empezar a aprender en el mundo siguiente. No ganas sellos ni Passes anteriores.",
    failure: "Repasa las misiones de este mundo antes de volver a intentarlo.",
    travel: "Cruzar el portal", retry: "Repetir cinco preguntas", leave: "Volver al mapa",
    savedError: "No se pudo guardar tu nuevo punto de partida en este dispositivo. El portal sigue cerrado.",
    privacy: "Prueba voluntaria: no se guardan las respuestas ni se obtienen créditos.",
    help: "Las pistas y transcripciones cuentan como ayuda en esta prueba.",
  },
} as const;

/** Voluntary placement only. Does not write or bypass the canonical assessment ledger. */
export function ItalianWorldPassageChallenge({ passage, locale, targetCity, onTravel }: Props) {
  const c = COPY[locale];
  const feedback = useLearningFeedback();
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [game, setGame] = useState<GameDraft>(() => emptyGame());
  const [answers, setAnswers] = useState<ItalianPassageAnswer[]>([]);
  const [run, setRun] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = passage.questions[index];
  const result = evaluateItalianWorldPassage(passage, answers);

  useEffect(() => {
    if (phase === "intro") return;
    const frame = requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [phase, index]);

  function start() {
    if (passage.questions.length !== 5) return;
    stopLessonAudio(); setPhase("playing"); setIndex(0); setGame(emptyGame()); setAnswers([]);
    setSaveError(false); setRun(value => value + 1);
    feedback.step();
  }
  function recordAttempt(correct: boolean, assisted: boolean) {
    setAnswers(previous => previous.length !== index ? previous :
      [...previous, { questionId: question.id, correct, assisted }]);
  }
  function continueChallenge() {
    if (!game.complete || answers.length !== index + 1 ||
      answers[index]?.questionId !== question.id) return;
    stopLessonAudio();
    if (index + 1 === passage.questions.length) {
      setPhase("result");
      if (evaluateItalianWorldPassage(passage, answers).passed)
        feedback.emit(`italian-passage:${passage.id}:${run}`, "unlock");
    } else { setIndex(value => value + 1); setGame(emptyGame()); }
  }
  function leave() {
    stopLessonAudio(); setPhase("intro"); setGame(emptyGame()); setAnswers([]);
    setSaveError(false);
  }
  function enter() {
    if (!result.passed) return;
    stopLessonAudio();
    if (!onTravel(passage.targetUnitId)) setSaveError(true);
  }

  return <section data-yoppo-secret-passage={passage.id} className="my-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
    {phase === "intro" ? <details>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 font-bold text-emerald-950">
        <Music2 size={22} aria-hidden className="shrink-0 text-amber-800" />
        <span className="min-w-0 flex-1">{c.reveal}</span><Compass size={18} aria-hidden />
      </summary>
      <div className="mt-3">
        <h2 className="text-xl font-black text-emerald-950">{c.title}</h2>
        <p className="mt-2 text-sm leading-6">{c.subtitle} <strong>{targetCity}</strong>.</p>
        <p className="mt-3 text-sm leading-6 text-stone-700">{c.rule}</p>
        <p className="mt-2 text-xs leading-5 text-stone-600">{c.purpose} {c.privacy}</p>
        <button type="button" onClick={start} className={`${primary} mt-4 w-full sm:w-auto`}>{c.start}<ArrowRight size={18} aria-hidden /></button>
      </div>
    </details> : null}
    {phase === "playing" && question ? <div data-yoppo-secret-question={question.id}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="text-lg font-black text-emerald-950 outline-none">{c.question}</h2>
        <span className="text-sm font-bold">{index + 1}/{passage.questions.length}</span>
      </div>
      <div role="progressbar" aria-label={c.question} aria-valuenow={index} aria-valuemin={0} aria-valuemax={passage.questions.length}
        className="mb-4 h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-emerald-700" style={{ width: `${index / passage.questions.length * 100}%` }}/>
      </div>
      <div className="rounded-xl bg-white p-4 sm:p-5">
        <GuidedGame key={`${passage.id}:${run}:${question.id}`} activity={question} locale={locale}
          value={game} onChange={setGame} onAttempt={recordAttempt} onContinue={continueChallenge}
          assessment continueLabel={index + 1 === passage.questions.length ? c.finish : c.next}/>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-600">{c.help}</p>
      <button type="button" onClick={leave} className={`${secondary} mt-3`}>{c.leave}</button>
    </div> : null}
    {phase === "result" ? <div data-yoppo-secret-result={result.passed ? "passed" : "review"}>
      <div className="flex items-center gap-3 text-amber-900">
        {result.passed ? <Sparkles size={29} aria-hidden /> : <LockKeyhole size={29} aria-hidden />}
        <h2 ref={heading} tabIndex={-1} className="text-xl font-black outline-none">{result.passed ? c.ready : c.notReady}</h2>
      </div>
      <p className="mt-3 text-3xl font-black">{result.correct}/{passage.questions.length}</p>
      <p className="mt-2 text-sm leading-6">{result.passed ? c.success : c.failure}</p>
      {result.assisted ? <p className="mt-2 text-sm font-bold text-amber-900">{c.help}</p> : null}
      {result.passed ? <div className="yo-world-passage-portal relative mt-5 overflow-hidden rounded-2xl bg-emerald-950 p-6 text-center text-amber-50" data-portal-qualified>
        <div className="yo-world-passage-ring mx-auto grid h-28 w-28 place-items-center rounded-full border-8 border-amber-300 bg-emerald-800 shadow-lg">
          <Music2 size={48} aria-hidden />
        </div>
        <p className="mt-4 text-lg font-bold">{targetCity}</p>
        <button type="button" onClick={enter} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 py-3 font-black text-emerald-950">
          {c.travel}<ArrowRight size={18} aria-hidden />
        </button>
      </div> : <button type="button" onClick={start} className={`${primary} mt-4`}><RotateCcw size={18} aria-hidden />{c.retry}</button>}
      {saveError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{c.savedError}</p> : null}
      <button type="button" onClick={leave} className={`${secondary} mt-3`}>{c.leave}</button>
    </div> : null}
    <style>{`@keyframes yoppo-world-portal{0%{transform:scale(.8) rotate(-20deg);opacity:.5}55%{transform:scale(1.08) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0)}}@media(prefers-reduced-motion:no-preference){.yo-world-passage-ring{animation:yoppo-world-portal .9s ease-out}}`}</style>
  </section>;
}
