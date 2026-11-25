"use client";
import { AdventureProgress } from "../journey/AdventureProgress";

import Link from "next/link";
import type { JourneyUnit } from "@/lib/yo/learningJourney";
import { japaneseJourney, canEnterFoundationStep } from "@/lib/yo/foundationJourney";
import { CourseJourneyGate } from "../journey/CourseJourney";
import { FoundationJourneyAdvance } from "../journey/FoundationJourneyAdvance";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookmarkPlus, CheckCircle2, Compass, GraduationCap, RotateCcw } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { JapaneseActivity, JapaneseChoiceActivity, JapaneseCourseSource, JapaneseCourseUnit, JapaneseLocalized } from "@/lib/yo/japaneseCourseTypes";
import { JAPANESE_COURSE_PATH, japaneseUnitProgress, recordJapaneseResult } from "@/lib/yo/japaneseCourseProgress";
import { buildYoLocaleHref, htmlLangFor } from "@/lib/yo/localize";
import { JapaneseCourseHeader } from "./JapaneseCourseHeader";
import { JapaneseYoppoCoach } from "./JapaneseYoppoCoach";
import { JapaneseKanjiStudio } from "./JapaneseKanjiStudio";
import { JapaneseActivityPanel, initialJapaneseActivityState, type JapaneseActivityState } from "./JapaneseActivityPanel";
import { JapaneseDialoguePanel, JapaneseKanaLab, JapaneseVocabularyLab, JapaneseWritingLab } from "./JapaneseStudyPanels";
import { JapanesePhraseView } from "./JapanesePhraseView";
import { useJapaneseCourseProgress } from "./useJapaneseCourseProgress";

const L = (fr: string, en: string, es: string): JapaneseLocalized => ({ fr, en, es });
const C = {
  module: L("Module", "Module", "Módulo"),
  foundations: L("Fondations", "Foundations", "Fundamentos"),
  mission: L("La mission", "Your mission", "Tu misión"),
  dialogue: L("Entre dans la scène", "Enter the scene", "Entra en la escena"),
  vocabulary: L("Laboratoire de mots", "Word lab", "Laboratorio de palabras"),
  kana: L("Laboratoire de kana", "Kana lab", "Laboratorio de kana"),
  kanji: L("Atelier de kanji", "Kanji studio", "Taller de kanji"),
  grammar: L("Construis le sens", "Build meaning", "Construye significado"),
  culture: L("Carnet interculturel", "Intercultural journal", "Diario intercultural"),
  writing: L("Atelier d’écriture", "Writing studio", "Taller de escritura"),
  summary: L("Bilan du module", "Module review", "Balance del módulo"),
  previous: L("Précédent", "Previous", "Anterior"), next: L("Suivant", "Next", "Siguiente"),
  path: L("Le parcours", "Course map", "Mapa del curso"),
  step: L("Étape", "Step", "Paso"),
  practices: L("Exercices réussis", "Exercises completed", "Ejercicios completados"),
  independent: L("sans aide affichée", "without displayed help", "sin ayuda mostrada"),
  review: L("À revoir", "Review", "Para repasar"),
  reviewAction: L("Reprendre les exercices à revoir", "Revisit review items", "Volver a los ejercicios para repasar"),
  objective: L("Objectifs de cette étape", "Your learning goals", "Tus objetivos"),
  romanization: L("Aide en rōmaji", "Rōmaji support", "Ayuda en rōmaji"),
  audio: L("Audio de pratique : voix générée par IA. La transcription reste accessible.", "Practice audio uses an AI-generated voice. Transcripts remain accessible.", "Audio de práctica con voz generada por IA. La transcripción sigue accesible."),
  local: L("Progression conservée sur cet appareil.", "Progress is saved on this device.", "El progreso se guarda en este dispositivo."),
  noStorage: L("La sauvegarde locale est indisponible. Tu peux poursuivre cette séance.", "Local saving is unavailable. You can continue this session.", "El guardado local no está disponible. Puedes continuar esta sesión."),
  complete: L("Les exercices du module sont terminés.", "You have completed this module’s exercises.", "Has completado los ejercicios del módulo."),
  pending: L("Reviens aux exercices restants pour terminer ton bilan.", "Return to the remaining exercises to finish your review.", "Vuelve a los ejercicios pendientes para completar el balance."),
  self: L("Mon autoévaluation", "My self-assessment", "Mi autoevaluación"),
  selfNote: L("Ces cases expriment ton ressenti. Les exercices vérifiés sont comptés séparément.", "These checkboxes reflect your confidence. Checked exercises are counted separately.", "Estas casillas reflejan tu confianza. Los ejercicios verificados se cuentan por separado."),
  academic: L("Un parcours de fondation structuré, sans crédit universitaire ni équivalence JLPT. La pratique orale et l’écriture libre gagnent à être accompagnées par un professeur.", "A structured foundation course, without university credit or JLPT equivalence. Spoken practice and free writing benefit from teacher feedback.", "Un curso de fundamentos estructurado, sin créditos universitarios ni equivalencia JLPT. La práctica oral y la escritura libre se enriquecen con un profesor."),
  hint: L("Repère l’objectif, puis essaie avec les mots de cette scène.", "Notice the goal, then try with words from this scene.", "Observa el objetivo y prueba con las palabras de esta escena."),
  teacher: L("Pratiquer avec un professeur", "Practice with a teacher", "Practicar con un profesor"),
  nextModule: L("Module suivant", "Next module", "Módulo siguiente"),
  final: L("Mission de synthèse", "Final synthesis", "Misión de síntesis"),
  remaining: L("Exercices restants", "Remaining exercises", "Ejercicios pendientes"),
  note: L("Mes observations (pour cette séance)", "My observations (this session)", "Mis observaciones (esta sesión)"),
  sources: L("Pour approfondir", "Explore further", "Para profundizar"),
  roleplay: L("Jeu de rôle guidé", "Guided roleplay", "Juego de rol guiado"),
  saved: L("Ajouter à mes révisions", "Add to review", "Añadir al repaso"),
  listeningAid: L("Le rōmaji est une aide de lecture. Essaie progressivement de le masquer.", "Rōmaji is a reading aid. Try gradually hiding it.", "El rōmaji ayuda a leer. Intenta ocultarlo progresivamente."),
};

type Stage = { id: string; title: JapaneseLocalized; kind: string; activity?: JapaneseActivity };

function buildStages(unit: JapaneseCourseUnit, final: boolean): Stage[] {
  const stages: Stage[] = [{ id: "mission", title: C.mission, kind: "mission" }];
  if (!final) {
    stages.push({ id: "dialogue", title: C.dialogue, kind: "dialogue" }, { id: "vocabulary", title: C.vocabulary, kind: "vocabulary" }, { id: "kana", title: C.kana, kind: "kana" }, { id: "kanji", title: C.kanji, kind: "kanji" }, { id: "grammar", title: C.grammar, kind: "grammar" });
  }
  stages.push(...unit.activities.map((activity) => ({ id: activity.id, title: activity.title, kind: "activity", activity })));
  if (!final) {
    for (const turn of unit.roleplay.turns) {
      const activity: JapaneseChoiceActivity = {
        id: turn.id, kind: "choice", title: unit.roleplay.title, prompt: turn.goal, hint: turn.hint,
        explanation: turn.choices.find((choice) => choice.id === turn.answerId)!.feedback,
        skill: "reading", stimulus: turn.line, choices: turn.choices, answerId: turn.answerId,
      };
      stages.push({ id: turn.id, title: C.roleplay, kind: "roleplay", activity });
    }
    stages.push({ id: "culture-journal", title: C.culture, kind: "culture" }, { id: "writing", title: C.writing, kind: "writing" });
  }
  stages.push({ id: "summary", title: C.summary, kind: "summary" });
  return stages;
}

export function JapaneseCoursePlayer({ unit, locale, sources, journeyUnits, finalIds, completionAction, final = false }: {
  unit: JapaneseCourseUnit; locale: YoLocale; sources: JapaneseCourseSource[]; journeyUnits: JourneyUnit[]; finalIds: string[]; completionAction?: ReactNode; final?: boolean;
}) {
  const { progress, update, ready, storageAvailable } = useJapaneseCourseProgress();
  const journey = japaneseJourney(journeyUnits, progress);
  const finalStarted = progress.lastUnit === "bilan" || Boolean(progress.lastSteps.bilan) || finalIds.some(id => Boolean(progress.results[id]));
  const allowed = canEnterFoundationStep(journey, unit.slug, finalStarted);
  const finalOpen = canEnterFoundationStep(journey, "bilan", finalStarted);
  const href = (id?: string) => buildYoLocaleHref(JAPANESE_COURSE_PATH + (id ? "/" + id : ""), locale);
  const stages = useMemo(() => buildStages(unit, final), [unit, final]);
  const [index, setIndex] = useState(0);
  const [activityStates, setActivityStates] = useState<Record<string, JapaneseActivityState>>({});
  const [showRomaji, setShowRomaji] = useState(false);
  const [selfChecks, setSelfChecks] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");
  const resumeLoaded = useRef(false);
  const focusRequested = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const stage = stages[index] ?? stages[0];
  const currentActivity = stage.activity;
  const currentState = currentActivity ? activityStates[currentActivity.id] ?? initialJapaneseActivityState(currentActivity) : undefined;
  const counts = japaneseUnitProgress(unit, progress);
  const reviewStages = stages.filter((item) => item.activity && progress.results[item.id]?.needsReview);
  const uncompleted = stages.filter((item) => item.activity && !progress.results[item.id]?.passed);

  useEffect(() => {
    if (!ready || !allowed || resumeLoaded.current) return;
    resumeLoaded.current = true;
    const saved = stages.findIndex((item) => item.id === progress.lastSteps[unit.slug]);
    if (saved >= 0) setIndex(saved);
  }, [ready, allowed, progress.lastSteps, stages, unit.slug]);
  useEffect(() => {
    if (!ready || !allowed || !resumeLoaded.current) return;
    update((current) => current.lastUnit === unit.slug && current.lastSteps[unit.slug] === stage.id ? current : { ...current, lastUnit: unit.slug, lastSteps: { ...current.lastSteps, [unit.slug]: stage.id } });
  }, [ready, allowed, stage.id, unit.slug, update]);
  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    heading.current?.focus();
    pane.current?.scrollTo?.({ top: 0 });
  }, [index]);
  function go(next: number) {
    if (next < 0 || next >= stages.length || next === index) return;
    window.dispatchEvent(new Event("yo-japanese-audio-stop"));
    focusRequested.current = true;
    setIndex(next);
  }
  function changeActivity(next: JapaneseActivityState) {
    if (!currentActivity) return;
    setActivityStates((current) => ({ ...current, [currentActivity.id]: next }));
  }
  function result(correct: boolean, assisted: boolean) {
    if (currentActivity) update((current) => recordJapaneseResult(current, currentActivity.id, correct, assisted));
  }
  function bookmark() {
    if (!currentActivity) return;
    update((current) => ({ ...current, results: { ...current.results, [currentActivity.id]: { passed: current.results[currentActivity.id]?.passed ?? false, independent: current.results[currentActivity.id]?.independent ?? false, attempts: current.results[currentActivity.id]?.attempts ?? 0, needsReview: true } } }));
  }
  function coachAction(action: "hint" | "explain" | "example" | "retry" | "review") {
    if (action === "review") {
      const target = reviewStages[0] ?? uncompleted[0];
      if (target) go(stages.findIndex((item) => item.id === target.id));
      return;
    }
    if (!currentActivity || !currentState) return;
    if (action === "retry") {
      changeActivity(initialJapaneseActivityState(currentActivity, currentState.revision + 1));
      heading.current?.focus();
    } else changeActivity({ ...currentState, assisted: currentState.checked ? currentState.assisted : true, showHint: action === "hint" ? true : currentState.showHint });
  }
  const studyCoach = (() => {
    const example = unit.grammar[0]?.example;
    switch (stage.kind) {
      case "dialogue": return {
        message: unit.setting,
        hint: L("Écoute une réplique, puis dis-la à voix haute avant de lire son sens.", "Listen to one line, then say it aloud before revealing its meaning.", "Escucha una intervención y repítela en voz alta antes de revelar su significado."),
        explanation: L("Observe qui parle et ce que chaque personne veut obtenir. Avance réplique par réplique, puis rejoue la scène en prenant un rôle.", "Notice who is speaking and what each person wants. Go line by line, then replay the scene taking one role.", "Observa quién habla y qué quiere cada persona. Avanza intervención por intervención y representa después uno de los papeles."), example: undefined,
      };
      case "vocabulary": return {
        message: L("Essaie de retrouver le sens avant de retourner la carte.", "Try to recall the meaning before turning the card over.", "Intenta recordar el significado antes de dar la vuelta a la tarjeta."),
        hint: L("Lis le mot, écoute-le et imagine un endroit où tu pourrais l’utiliser.", "Read the word, listen and picture a situation where you could use it.", "Lee la palabra, escúchala e imagina una situación en la que podrías usarla."),
        explanation: L("Les mots à retravailler reviennent dans la pile. Ta réponse indique ton ressenti : elle ne change pas le score des exercices vérifiés.", "Words you want to practise again return to the stack. Your rating is a self-assessment and does not change checked exercise results.", "Las palabras que quieras repasar vuelven a la pila. Tu valoración es una autoevaluación y no cambia los ejercicios verificados."), example: undefined,
      };
      case "kana": return {
        message: L("Observe les signes du module, puis essaie le rappel sans modèle.", "Explore this module’s characters, then try recalling them without a model.", "Observa los signos del módulo y prueba a recordarlos sin modelo."),
        hint: L("Compare les signes qui se ressemblent. Isole un détail de forme avant de répondre.", "Compare similar-looking characters. Notice one detail of the shape before answering.", "Compara los signos parecidos y observa un detalle de su forma antes de responder."),
        explanation: L("Le mode exploration montre les lectures. Le rappel permet de vérifier une réponse et de réessayer. Le tableau rassemble les 92 kana de base du parcours.", "Explore mode shows readings. Recall mode lets you check an answer and retry. The chart gathers the course’s 92 basic kana.", "La exploración muestra las lecturas. El modo de recuerdo permite comprobar una respuesta y reintentarlo. La tabla reúne los 92 kana básicos del curso."), example: undefined,
      };
      case "kanji": return {
        message: L("Observe, cache le modèle, trace de mémoire, puis compare.", "Observe, hide the model, draw from memory, then compare.", "Observa, oculta el modelo, traza de memoria y compara."),
        hint: L("Utilise le pas à pas pour repérer le début et la direction de chaque trait.", "Use manual stepping to notice where each stroke starts and its direction.", "Usa el avance paso a paso para observar dónde empieza cada trazo y su dirección."),
        explanation: L("Le modèle suit les traits KanjiVG dans leur ordre d’origine. Tu peux annuler un trait, effacer ou revoir le modèle. Sans dessiner, le mode observer–rappeler–comparer propose aussi une pratique au clavier.", "The model follows KanjiVG strokes in their source order. You can undo a stroke, clear the drawing or inspect the model again. Observe–recall–compare also offers keyboard practice without drawing.", "El modelo sigue los trazos de KanjiVG en su orden original. Puedes deshacer un trazo, borrar o volver al modelo. Observar–recordar–comparar permite practicar también con el teclado sin dibujar."), example: undefined,
      };
      case "culture": return { message: unit.culture.reflection, hint: unit.culture.title, explanation: unit.culture.note, example: undefined };
      case "writing": return { message: unit.writing.prompt, hint: unit.writing.checklist[0] ?? C.hint, explanation: L("Écris d’abord ta propre version. Compare-la ensuite au modèle et à la liste de vérification; garde tes questions pour un échange avec un professeur.", "Write your own version first. Then compare it with the model and checklist; keep your questions for a conversation with a teacher.", "Escribe primero tu propia versión. Compárala después con el modelo y la lista de verificación; guarda tus preguntas para hablar con un profesor."), example: unit.writing.model };
      case "summary": return { message: counts.complete ? C.complete : C.pending, hint: C.reviewAction, explanation: C.selfNote, example: undefined };
      default: return { message: unit.goals[0], hint: C.hint, explanation: unit.grammar[0]?.explanation ?? unit.subtitle, example };
    }
  })();
  const feedbackChoice = currentActivity && "choices" in currentActivity && currentState && typeof currentState.answer === "string" ? currentActivity.choices.find((item) => item.id === currentState.answer) : undefined;
  const coachMessage = currentState?.checked ? (feedbackChoice?.feedback ?? currentActivity!.explanation) : currentActivity?.prompt ?? studyCoach.message;
  const coachExample = currentActivity?.kind === "build" ? currentActivity.phrase : currentActivity && "stimulus" in currentActivity && typeof currentActivity.stimulus === "object" ? currentActivity.stimulus : currentActivity ? undefined : studyCoach.example;
  const studyPanels: Array<{ id: string; content: ReactNode }> = final ? [] : [
    { id: "dialogue", content: <JapaneseDialoguePanel unit={unit} locale={locale} showRomaji={showRomaji} /> },
    { id: "vocabulary", content: <JapaneseVocabularyLab unit={unit} locale={locale} showRomaji={showRomaji} /> },
    { id: "kana", content: <JapaneseKanaLab characters={unit.kana} locale={locale} /> },
    { id: "kanji", content: <JapaneseKanjiStudio characters={unit.kanji} locale={locale} onPractice={(character) => update((current) => current.practicedKanji.includes(character) ? current : { ...current, practicedKanji: [...current.practicedKanji, character] })} /> },
    { id: "writing", content: <JapaneseWritingLab unit={unit} locale={locale} showRomaji={showRomaji} /> },
  ];

  if (!ready || !allowed) return <CourseJourneyGate locale={locale} ready={ready} href={href()} />;
  return <div lang={htmlLangFor(locale)} className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f5ef] text-slate-800" data-japanese-course-player={unit.id}>
    <JapaneseCourseHeader locale={locale} pathname={JAPANESE_COURSE_PATH + "/" + unit.slug} backHref={JAPANESE_COURSE_PATH} title={(final ? C.final[locale] : "日本語 · " + String(unit.number).padStart(2, "0"))} />
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white/60 xl:flex">
        <div className="border-b border-slate-200 p-5"><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">日本語 · {C.foundations[locale]}</p><h2 className="mt-2 text-lg font-semibold">{unit.title[locale]}</h2><p className="mt-2 text-xs text-slate-500">{counts.passed}/{counts.total} · {C.practices[locale]}</p></div>
        <nav aria-label={C.step[locale]} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {stages.map((item, stepIndex) => <button key={item.id} type="button" onClick={() => go(stepIndex)} aria-current={stage.id === item.id ? "step" : undefined} className={"flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs leading-relaxed focus-visible:outline focus-visible:outline-2 " + (stage.id === item.id ? "bg-indigo-700 font-semibold text-white" : "text-slate-600 hover:bg-indigo-50")}>
            {progress.results[item.id]?.passed ? <CheckCircle2 size={13} className="shrink-0" aria-hidden /> : <span className="w-3 shrink-0 text-[10px] opacity-60">{stepIndex + 1}</span>}{item.title[locale]}
          </button>)}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/50 px-4 py-2 sm:px-8">
          <label className="min-w-0 text-xs text-slate-500 xl:hidden"><span className="sr-only">{C.step[locale]}</span><select aria-label={C.step[locale]} value={index} onChange={(event) => go(Number(event.target.value))} className="min-h-9 max-w-[52vw] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">{stages.map((item, i) => <option key={item.id} value={i}>{i + 1}. {item.title[locale]}</option>)}</select></label>
          <span className="hidden text-xs font-medium text-slate-500 xl:inline">{C.step[locale]} {index + 1} / {stages.length}</span>
          <label className="flex min-h-9 items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={showRomaji} onChange={(event) => setShowRomaji(event.target.checked)} className="accent-indigo-700" />{C.romanization[locale]}</label>
        </div>
        <div ref={pane} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-7" data-japanese-stage-pane>
          <div className="mx-auto max-w-3xl pb-24 sm:pb-20">
            <AdventureProgress journey={journey} world="japanese" locale={locale} ready={ready} finalPassed={finalIds.length > 0 && finalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent)} />
            <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">{final ? C.final[locale] : C.module[locale] + " " + String(unit.number).padStart(2, "0")} · {unit.title[locale]}</p><h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 outline-none sm:text-3xl">{stage.title[locale]}</h1></div>
            {stage.kind === "mission" ? <div className="space-y-5">
              <div className="relative overflow-hidden rounded-3xl bg-[#25285b] p-6 text-white sm:p-8"><div className="pointer-events-none absolute -right-5 -top-8 h-44 w-44 rounded-full border-[28px] border-white/5" aria-hidden /><Compass size={26} className="mb-6 text-[#f2b2a2]" aria-hidden /><p className="max-w-xl text-xl leading-relaxed">{unit.subtitle[locale]}</p><p className="mt-4 text-sm leading-relaxed text-indigo-100">{unit.setting[locale]}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">{unit.goals.map((goal, i) => <div key={i} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed"><span className="font-semibold text-indigo-500">0{i + 1}</span>{goal[locale]}</div>)}</div>
              <p className="text-xs leading-relaxed text-slate-500">{C.audio[locale]}</p>
              {showRomaji ? <p className="text-xs text-indigo-700">{C.listeningAid[locale]}</p> : null}
            </div> : null}
            {studyPanels.map((panel) => <div key={panel.id} hidden={stage.id !== panel.id} inert={stage.id !== panel.id} aria-hidden={stage.id !== panel.id}>{panel.content}</div>)}
            {stage.kind === "grammar" ? <div className="space-y-5">{unit.grammar.map((point, i) => <article key={point.id} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-indigo-500">0{i + 1}</p><h2 className="mt-2 text-xl font-semibold">{point.title[locale]}</h2><p className="my-4 text-sm leading-relaxed text-slate-600">{point.explanation[locale]}</p><div className="border-t border-slate-100 pt-4"><JapanesePhraseView phrase={point.example} locale={locale} showRomaji={showRomaji} /></div></article>)}</div> : null}
            {currentActivity && currentState ? <div>
              {stage.kind === "roleplay" ? <p className="mb-5 rounded-2xl bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">{unit.roleplay.context[locale]}</p> : null}
              <JapaneseActivityPanel key={currentActivity.id} activity={currentActivity} locale={locale} state={currentState} onChange={changeActivity} onResult={result} showRomaji={showRomaji} />
              <button type="button" onClick={bookmark} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs font-medium text-slate-600 underline underline-offset-4"><BookmarkPlus size={14} aria-hidden />{C.saved[locale]}{progress.results[currentActivity.id]?.needsReview ? " ✓" : ""}</button>
            </div> : null}
            {stage.kind === "culture" ? <div className="space-y-5">
              <article className="rounded-3xl border border-[#ead9bc] bg-[#fffaf0] p-5 sm:p-7"><h2 className="text-xl font-semibold">{unit.culture.title[locale]}</h2><p className="mt-4 text-sm leading-relaxed">{unit.culture.note[locale]}</p></article>
              <p className="text-base leading-relaxed">{unit.culture.reflection[locale]}</p>
              <label className="block text-xs font-semibold text-slate-600">{C.note[locale]}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1200} rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base font-normal focus:outline focus:outline-2 focus:outline-indigo-500" /></label>
              <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm"><summary className="cursor-pointer font-semibold">{C.sources[locale]}</summary><ul className="mt-3 space-y-3">{sources.filter((source) => unit.culture.sourceIds.includes(source.id)).map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-800 underline">{source.title}</a><p className="mt-1 text-xs text-slate-500">{source.purpose[locale]}</p></li>)}</ul></details>
            </div> : null}
            {stage.kind === "summary" ? <div className="space-y-5">
              <div className="rounded-3xl border border-indigo-100 bg-white p-6"><GraduationCap size={27} className="mb-4 text-indigo-600" aria-hidden /><h2 className="text-xl font-semibold">{counts.complete ? C.complete[locale] : C.pending[locale]}</h2><p className="mt-3 text-lg font-semibold text-indigo-700">{counts.passed} / {counts.total} · {C.practices[locale]}</p><p className="mt-1 text-sm text-slate-600">{counts.independent} {C.independent[locale]} · {counts.review} {C.review[locale].toLowerCase()}</p></div>
              {uncompleted.length ? <div><h3 className="mb-3 text-sm font-semibold">{C.remaining[locale]}</h3><div className="flex flex-wrap gap-2">{uncompleted.map((item) => <button key={item.id} onClick={() => go(stages.findIndex((s) => s.id === item.id))} className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs text-indigo-900">{item.title[locale]}</button>)}</div></div> : null}
              {reviewStages.length ? <button onClick={() => coachAction("review")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-300 bg-indigo-50 px-5 text-sm font-semibold text-indigo-900"><RotateCcw size={15} aria-hidden />{C.reviewAction[locale]}</button> : null}
              {!final ? <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-2 font-semibold">{C.self[locale]}</legend>{unit.canDos.map((item, i) => <label key={i} className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-4 accent-indigo-700" checked={!!selfChecks[i]} onChange={(event) => setSelfChecks((current) => ({ ...current, [i]: event.target.checked }))} />{item[locale]}</label>)}<p className="text-xs text-slate-500">{C.selfNote[locale]}</p></fieldset> : null}
              {counts.complete && completionAction ? <div className="rounded-2xl border border-slate-200 bg-white p-5">{completionAction}</div> : null}
              {final ? <Link href={href()} className="inline-flex min-h-11 items-center gap-2 text-indigo-800 underline">{C.path[locale]}</Link> : <FoundationJourneyAdvance journey={journey} unitId={unit.slug} locale={locale} href={href} finalOpen={finalOpen} />}
              <Link href={"/trouver-un-prof?q=japonais" + (locale === "fr" ? "" : "&lang=" + locale)} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold">{C.teacher[locale]}</Link>
              <p className="text-xs leading-relaxed text-slate-500">{C.academic[locale]}</p>
            </div> : null}
          </div>
        </div>
      </div>
      <aside className="hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white/40 p-5 2xl:flex">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{C.objective[locale]}</h2><ul className="space-y-4">{unit.goals.map((goal, i) => <li key={i} className="text-sm leading-relaxed text-slate-600">{goal[locale]}</li>)}</ul>
        {!final ? <div className="border-t border-slate-200 pt-4"><p className="text-xs font-medium text-slate-500">KANJI</p><p lang="ja" className="mt-3 text-2xl tracking-[0.25em] text-indigo-900">{unit.kanji.join("")}</p></div> : null}
      </aside>
    </div>
    <footer className="z-30 shrink-0 border-t border-slate-200 bg-[#fbf8f1] px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><button type="button" aria-label={C.previous[locale]} onClick={() => go(index - 1)} disabled={index === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold disabled:opacity-30"><ArrowLeft size={16} aria-hidden /><span className="hidden sm:inline">{C.previous[locale]}</span></button>
        <div className="min-w-0 flex-1 px-2 text-center"><p className="text-[11px] text-slate-500">{index + 1}/{stages.length} · {counts.passed}/{counts.total} {C.practices[locale].toLowerCase()}</p><div className="mx-auto mt-1.5 h-1 max-w-48 overflow-hidden rounded-full bg-slate-200" aria-hidden><div className="h-full rounded-full bg-indigo-600 transition-[width] motion-reduce:transition-none" style={{ width: ((index + 1) / stages.length * 100) + "%" }} /></div><p className="mt-1 hidden text-[9px] text-slate-400 sm:block">{storageAvailable ? C.local[locale] : C.noStorage[locale]}</p></div>
        {index < stages.length - 1 ? <button type="button" onClick={() => go(index + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-700 px-5 text-sm font-semibold text-white">{C.next[locale]}<ArrowRight size={16} aria-hidden /></button> : <Link href={buildYoLocaleHref(JAPANESE_COURSE_PATH, locale)} className="inline-flex min-h-11 items-center rounded-full bg-indigo-700 px-5 text-sm font-semibold text-white">{C.path[locale]}</Link>}
      </div>
      {!storageAvailable ? <p role="status" className="mt-1 text-center text-xs text-amber-900">{C.noStorage[locale]}</p> : null}
    </footer>
    <JapaneseYoppoCoach locale={locale} contextId={unit.id + ":" + stage.id + ":" + (currentState?.revision ?? 0)} message={coachMessage} hint={currentActivity?.hint ?? studyCoach.hint} explanation={currentActivity?.explanation ?? studyCoach.explanation} example={coachExample} visualState={stage.kind === "summary" && counts.complete && counts.independent === counts.total ? final ? "badge_unlocked" : "level_up" : currentState?.checked ? currentState.correct ? "celebrating" : "confused" : stage.kind === "mission" ? "map" : "idle"} onAction={coachAction} canRetry={!!currentState?.checked} reviewCount={reviewStages.length} />
  </div>;
}
