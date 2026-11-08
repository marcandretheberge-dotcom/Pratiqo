"use client";

import Link from "../../learning/LessonLink";
import { Fragment, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, BookOpen, Check, HelpCircle, LockKeyhole, MapPin, Stamp, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog, CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import { italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { getDueActivityIds } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";
import { listenForAdventureInterruptions } from "@/lib/yo/adventureSound";
import { FeedbackSettings, useLearningFeedback } from "../../feedback/LearningFeedback";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { GUIDED_KEY, TOUR_KEY, emptyGame, initialGuided, parseGuided, guidedSteps, guidedPassed, guidedPoints, lessonDone, type GuidedState, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { guidedMissionOrder, nextGuidedMissionStep, followingGuidedMissionStep, restoreGuidedMissionDraft } from "@/lib/yo/italian/course/guidedMissionOrder";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import { ItalianWorldNavigator } from "./ItalianWorldNavigator";
import { ItalianTriviaCheckpoint } from "./ItalianTriviaCheckpoint";
import { useItalianCourseProgress } from "../course/useItalianCourseProgress";
import { ItalianAudioProvider } from "../ItalianAudioProvider";
import { ItalianCityArrival } from "./ItalianCityArrival";
import { ItalianCityBossGate } from "./ItalianCityBossGate";
import { ItalianBossBattleHud } from "./ItalianBossBattleHud";
import { GuidedGame } from "./GuidedGame";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { placementAllowsReview, weeklyRhythm, type LearningProfile } from "@/lib/yo/personalized/profile";
import type { VisualWord, WordBankEntry } from "@/lib/yo/personalized/types";
import { VisualVocabulary } from "../../personalized/VisualVocabulary";
import { LearningAudio } from "../../personalized/LearningAudio";
import { guidedCopy, primary, secondary } from "./copy";
import { LanguageExplanation } from "../../learning/LanguageExplanation";

const EMPTY_VISUALS: Record<string, VisualWord[]> = {};
type Props = { profile?: LearningProfile; onConfigure?: () => void; progressKey?: string; wordBank?: WordBankEntry[]; visualWords?: Record<string, VisualWord[]>; unit: CourseUnit; catalog: CourseCatalog; locale: YoLocale; audioPaths: Record<string, string>; initialLessonId?: string; initialActivityId?: string };

/** Reference pilot. Learning evidence stays in the existing store; this store holds UI drafts only. */
export function GuidedItalianCourse({ unit, catalog, locale, audioPaths, initialLessonId, initialActivityId, profile, onConfigure, progressKey, wordBank, visualWords = EMPTY_VISUALS }: Props) {
  const city = italianWorldForUnit(unit.id)?.cities.find(item => item.unitId === unit.id)?.name;
  const stamp = unit.id === "u01" ? guidedCopy[locale].stamp
    : city ? t(`Tampon de ${city}`, `${city} stamp`, `Sello de ${city}`)[locale]
    : `${guidedCopy[locale].unit} ${unit.number}`;
  const minimumScore = Math.ceil(unit.quiz.questions.length * unit.quiz.passPercent / 100);
  const stampRule = unit.quiz.questions.length === 5 ? guidedCopy[locale].stampRule
    : t(`Réussis au moins ${minimumScore} questions sur ${unit.quiz.questions.length} sans indice pour gagner ton tampon.`, `Answer at least ${minimumScore} of ${unit.quiz.questions.length} correctly without hints to earn your stamp.`, `Acierta al menos ${minimumScore} de ${unit.quiz.questions.length} sin pistas para ganar tu sello.`)[locale];
  const c = { ...guidedCopy[locale], stamp, stampRule }, learning = useItalianCourseProgress(catalog, progressKey), { progress, ready, recordActivity, recordAssessment, setResume } = learning;
  const steps = guidedSteps(unit, Object.keys(visualWords));
  const order = guidedMissionOrder(steps);
  const uiKey = progressKey ? `yo.italian.guided.v2.${unit.id}` : GUIDED_KEY;
  const say = (fr: string, en: string, es: string) => t(fr,en,es)[locale];
  const bankHref = `/yo/langues/italien/parcours/${unit.id}/vocabulaire?lang=${locale}`;
  const rhythm = profile ? weeklyRhythm(profile.weeklyMinutes) : null;
  const [ui, setUi] = useState<GuidedState>(() => initialGuided());
  const current = useRef(ui);
  useLayoutEffect(() => { current.current = ui; }, [ui]);
  const loadedReset = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false), [storageAvailable, setStorageAvailable] = useState(true);
  const [overlay, setOverlay] = useState<"notebook" | "tools" | null>(null), [tour, setTour] = useState<number | null>(null);
  const [notebookMeanings, setNotebookMeanings] = useState(true);
  const feedback = useLearningFeedback();
  const pendingUnlock = useRef(false);
  const [translation, setTranslation] = useState(false), [hint, setHint] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), primaryAction = useRef<HTMLButtonElement>(null);
  const routeRequest = useRef("");
  const step = steps[ui.step], lesson = unit.lessons[step.lesson], exercise = step.activity;
  const passed = guidedPassed(unit, progress), done = unit.lessons.filter(l => lessonDone(l, progress)).length;
  const next = nextGuidedMissionStep(steps, order, ui, progress);
  const challengeMode = ui.view === "challenge", question = unit.quiz.questions[ui.quizIndex];
  const completedAnswers = ui.answers.filter(a => a.correct).length, resultHelp = ui.answers.some(a => a.assisted);
  const resultPassed = ui.answers.length === unit.quiz.questions.length && !resultHelp && completedAnswers / unit.quiz.questions.length * 100 >= unit.quiz.passPercent;
  const nextUnit = catalog.units[catalog.units.findIndex(u => u.id === unit.id) + 1];
  const journey = buildCourseJourney(catalog, progress);
  const placedReview = (id: string) => placementAllowsReview(profile ?? null, id, catalog.units.map(u=>u.id));
  const allowed = !profile || placedReview(unit.id) || Boolean(journey.steps.find(s=>s.unit.id===unit.id)?.unlocked);
  const due = getDueActivityIds(progress, catalog).filter(id => steps.some(s => s.id === id));
  const missionSteps = order.map(index => steps[index]).filter(s => s.lesson === step.lesson), position = missionSteps.findIndex(s => s.id === step.id);
  const phrases = unit.lessons.filter((l, i) => ui.seen.some(id => id.startsWith(l.id)) || l.activities.some(a => progress.activities[a.id]) || (ui.view === "mission" && i === step.lesson)).flatMap(l => l.vocabulary);
  const notebookWords = wordBank ?? [...new Map(phrases.map(p => [p.it, p])).values()];

  function commit(nextState: GuidedState) {
    current.current = nextState; setUi(nextState);
    try { localStorage.setItem(uiKey, JSON.stringify(nextState)); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  }
  function focus() { requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }); }
  function stop() { stopLessonAudio(); setTranslation(false); setHint(false); }
  function move(index: number) {
    if (index < 0 || index >= steps.length) return;
    // A direct exercise link must not bypass the vocabulary prerequisite.
    const preparation = steps.findIndex(s => s.lesson === steps[index].lesson && s.stage === "prepare");
    if (preparation >= 0 && !current.current.seen.includes(steps[preparation].id)) index = preparation;
    const fromMap = current.current.view === "map";
    stop(); const destination = steps[index];
    commit({ ...current.current, view: "mission", resumeView: "mission", step: index, game: emptyGame() });
    setResume(unit.id, unit.lessons[destination.lesson].id, destination.activity?.id); focus();
    if (fromMap) feedback.step();
  }
  function beginMission() {
    finishTour();
    const s = current.current;
    if (s.resumeView === "challenge" && !s.submitted) { commit({ ...s, view: "challenge" }); focus(); return; }
    if (s.resumeView === "mission") { commit({ ...s, view: "mission" }); focus(); feedback.step(); return; }
    if (next < 0) { commit({ ...s, view: "challenge-intro" }); focus(); return; }
    move(next);
  }
  function finishTour() { setTour(null); try { localStorage.setItem(TOUR_KEY, "seen"); } catch { /* Guidance remains usable without storage. */ } }
  function leave() {
    stop(); setOverlay(null);
    const s = current.current;
    commit({ ...s, view: "map", resumeView: s.view === "mission" || s.view === "challenge" ? s.view : s.resumeView }); focus();
    if (s.view === "result" && pendingUnlock.current && nextUnit && journey.steps.some(item=>item.unit.id===nextUnit.id&&item.unlocked)) {
      pendingUnlock.current=false; feedback.emit(`unlock:${unit.id}:${s.runStartedAt}`, "unlock");
    }
  }
  function advance() {
    const s = current.current;
    if (step.activity && !s.game.complete) return;
    const seen = !step.activity ? [...new Set([...s.seen, step.id])] : s.seen;
    commit({ ...s, seen });
    const following = followingGuidedMissionStep(order, s.step);
    if (following < 0) { stop(); commit({ ...current.current, view: "challenge-intro", resumeView: null, game: emptyGame() }); focus(); }
    else move(following);
    if ((following < 0 || steps[following].lesson !== step.lesson) && lessonDone(lesson, progress))
      feedback.emit(`mission:${unit.id}:${lesson.id}`, "mission");
  }
  function startChallenge() {
    stop(); commit({ ...current.current, view: "challenge", resumeView: "challenge", quizIndex: 0, game: emptyGame(), answers: [], runStartedAt: Math.max(Date.now(), (progress.assessments[unit.quiz.id]?.last.completedAt ?? 0) + 1), submitted: false }); focus();
  }
  function nextQuestion() {
    const s = current.current;
    if (!s.game.complete || s.answers.length !== s.quizIndex || s.submitted) return;
    stop(); const answers = [...s.answers, { correct: s.game.feedback === true, assisted: s.game.assisted }];
    if (answers.length === unit.quiz.questions.length) {
      const correct = answers.filter(a => a.correct).length, assisted = answers.some(a => a.assisted);
      // A restored result must not re-submit or duplicate points. Canonical best results remain monotonic.
      const previous = progress.assessments[unit.quiz.id];
      if (!previous || previous.last.completedAt < s.runStartedAt) recordAssessment(unit.quiz.id, correct, answers.length, assisted);
      commit({ ...s, view: "result", resumeView: null, answers, submitted: true, game: emptyGame() });
      if (!assisted && correct / answers.length * 100 >= unit.quiz.passPercent) {
        pendingUnlock.current = !passed && Boolean(nextUnit);
        feedback.emit(`stamp:${unit.id}:${s.runStartedAt}`, "stamp");
      }
    } else commit({ ...s, quizIndex: s.quizIndex + 1, answers, game: emptyGame() });
    focus();
  }
  function updateGame(game: GameDraft) { commit({ ...current.current, game }); }
  function openNotebook() {
    if (challengeMode) return;
    stopLessonAudio();
    if (ui.view === "mission" && exercise && !ui.game.complete) updateGame({ ...current.current.game, assisted: true });
    setOverlay("notebook");
  }
  useEffect(() => listenForAdventureInterruptions(), []);
  useEffect(() => {
    if (!ready || loadedReset.current === progress.resetAt) return;
    const frame = requestAnimationFrame(() => {
    loadedReset.current = progress.resetAt;
    let nextState = initialGuided(progress.resetAt);
    try {
      const saved = localStorage.getItem(uiKey);
      if (saved) {
        const guided = guidedSteps(unit, Object.keys(visualWords));
        nextState = restoreGuidedMissionDraft(parseGuided(saved, unit, progress.resetAt, Object.keys(visualWords)), guided, guidedMissionOrder(guided));
      }
      setTour(localStorage.getItem(TOUR_KEY) === "seen" ? null : 0);
    } catch { setStorageAvailable(false); setTour(0); }
    // Opening the course always returns to its map; the action resumes the exact unfinished draft.
    if (nextState.view === "mission" || nextState.view === "challenge") nextState = { ...nextState, resumeView: nextState.view, view: "map" };
    current.current = nextState; setUi(nextState); setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, progress.resetAt, unit, uiKey, visualWords]);
  const followIncomingRoute = useEffectEvent(() => {
    if (!loaded || !initialLessonId) return;
    const request = `${initialLessonId}/${initialActivityId ?? ""}`;
    if (routeRequest.current === request) return;
    routeRequest.current = request;
    const at = steps.findIndex(s => unit.lessons[s.lesson].id === initialLessonId && (initialActivityId ? s.id === initialActivityId : (s.stage === (Object.keys(visualWords).includes(initialLessonId) ? "prepare" : "words"))));
    if (at >= 0) {
      finishTour();
      const saved = current.current;
      if (saved.resumeView === "mission" && (saved.step === at || (!initialActivityId && steps[saved.step].lesson === steps[at].lesson))) { commit({ ...saved, view: "mission" }); focus(); }
      else move(at);
    }
  });
  useEffect(() => { const frame = requestAnimationFrame(() => followIncomingRoute()); return () => cancelAnimationFrame(frame); }, [loaded, initialLessonId, initialActivityId]);

  if (ready && loaded && !allowed) return <main lang={locale} className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">{c.locked}</h1><p className="my-4">{say("Tu connais déjà ces notions ? Change ton point de départ avec Yoppo, sans gagner de tampon ni dépenser de Pass.","Already know these topics? Change your starting point with Yoppo, without earning stamps or spending a Pass.","¿Ya conoces estos temas? Cambia tu inicio con Yoppo sin ganar sellos ni gastar Pass.")}</p><button type="button" className={primary} onClick={onConfigure}>{say("Choisir mon départ","Choose my start","Elegir mi inicio")}</button><Link className={`${secondary} mt-4`} href={italianCourseHref(locale)}>{c.home}</Link></main>;
  if (!ready || !loaded) return <main lang={locale} className="mx-auto max-w-xl p-10"><p role="status">{c.loading}</p></main>;
  const teacherUrl = getYoPratiqoModuleBySlug("italien")?.teacherSearchUrl ?? "/trouver-un-prof?q=italien";
  return <ItalianAudioProvider paths={audioPaths}><div lang={locale} className="min-h-screen bg-[#fbf9f3] text-stone-800" data-guided-italian>
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      {ui.view === "map" ? <Link href={`/yo/langues${locale !== "fr" ? `?lang=${locale}` : ""}`} className="text-lg font-black text-emerald-900">Yo<span className="text-orange-700">Pratiqo</span></Link> : <button type="button" onClick={leave} className={secondary} aria-label={c.leave}><X size={21} aria-hidden /><span className="hidden sm:inline">{c.home}</span></button>}
      <span className="text-sm font-bold text-emerald-900">Italiano · A1</span>
      <div className="flex gap-1"><button type="button" className={`${secondary} ${tour === 1 ? "ring-4 ring-orange-300" : ""}`} onClick={openNotebook} disabled={challengeMode} title={challengeMode ? c.noHints : c.notebook} aria-label={c.notebook}><BookOpen size={21} aria-hidden /><span className="hidden sm:inline">{c.notebook}</span></button><button type="button" className={secondary} onClick={() => { stopLessonAudio(); setOverlay("tools"); }} aria-label={c.help}><HelpCircle size={21} aria-hidden /></button></div>
    </div></header>
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      {(!learning.storageAvailable || !storageAvailable) ? <p role="status" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{c.unsaved}</p> : null}
      {ui.view === "map" ? <>
        {tour !== null ? <aside aria-label={c.tourTitle} className="mb-6 flex items-start gap-4 rounded-3xl border-2 border-emerald-700 bg-white p-5 shadow-sm"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="sm" compact /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-emerald-700">YOPPO · {tour + 1}/3</p><h2 className="mt-1 font-bold">{c.tourTitle}</h2><p className="mt-2 text-sm leading-6">{[c.tourPath, wordBank ? say("Ton Carnet contient déjà tous les mots et verbes du module. Tu peux aussi l’imprimer.","Your notebook already contains the module’s words and verbs. You can print it too.","Tu cuaderno ya contiene las palabras y los verbos del módulo. También puedes imprimirlo.") : c.tourWords, c.tourStart][tour]}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={primary} onClick={() => { if (tour < 2) setTour(tour + 1); else beginMission(); }}>{tour === 2 ? c.start : c.next}</button><button type="button" className={secondary} onClick={finishTour}>{c.skip}</button></div></div></aside> : null}
        <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`order-2 md:order-1 ${tour === 0 ? "rounded-3xl ring-4 ring-orange-300" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-800">{progressKey ? `${c.unit} ${unit.number} · Italiano` : c.preview}</p><h1 ref={heading} tabIndex={-1} className="mt-2 text-3xl font-black tracking-tight outline-none sm:text-4xl">{unit.id === "u01" ? "Ciao, Bologna." : unit.title[locale]}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">{unit.subtitle[locale]}</p>{wordBank ? <Link href={bankHref} className={`${secondary} mt-3 underline`} target="_blank" rel="noopener">{say("Voir / imprimer tous les mots et verbes", "View / print all words and verbs", "Ver / imprimir palabras y verbos")}</Link> : null}
            <div className="my-6 max-w-xl"><ItalianCityArrival unitId={unit.id} locale={locale} mastered={passed}/></div>
            <ol className="relative mx-auto max-w-md space-y-3 pb-4">
              {unit.lessons.map((item, i) => { const complete = lessonDone(item, progress), at = order.find(index => steps[index].lesson === i) ?? -1, available = Boolean(profile && profile.experience !== "new" && placedReview(unit.id)) || i === 0 || lessonDone(unit.lessons[i - 1], progress) || item.activities.some(a => progress.activities[a.id]); const active = next >= 0 && steps[next].lesson === i; return <Fragment key={item.id}><li className={`relative flex items-center gap-4 ${i % 2 ? "ml-7 sm:ml-12" : "mr-7 sm:mr-12"}`}>
                {i < unit.lessons.length - 1 ? <div aria-hidden className="absolute left-7 top-14 h-20 border-l-4 border-dotted border-emerald-200" /> : null}
                <button type="button" disabled={!available} aria-label={`${c.mission} ${i + 1} · ${item.title[locale]}${complete ? ` · ${c.completeMission}` : ""}`} aria-current={active ? "step" : undefined} className={`relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full border-b-4 font-black focus-visible:outline-4 focus-visible:outline-offset-4 ${complete ? "border-emerald-900 bg-emerald-700 text-white" : active ? "border-orange-900 bg-orange-200 text-emerald-950" : "border-stone-300 bg-stone-100 text-stone-500"}`} onClick={() => { finishTour(); move(at); }}>{complete ? <Check aria-hidden /> : available ? i + 1 : <LockKeyhole size={20} aria-hidden />}</button>
                <div className="min-w-0 py-4"><p className="text-xs font-bold text-emerald-700">{c.mission} {i + 1}</p><p className="mt-1 text-sm font-bold">{item.title[locale]}</p>{active ? <div className="mt-1"><CompanionAvatar visualId="travel" state="map" locale={locale} size="xs" compact /></div> : null}</div>
              </li>{i === Math.ceil(unit.lessons.length / 2) - 1 ? <li className="my-5 list-none"><ItalianTriviaCheckpoint unit={unit} locale={locale} progress={progress} /></li> : null}</Fragment>; })}
              <li className="relative flex items-center gap-4"><span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 ${passed ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"}`}><Stamp aria-hidden /></span><div><p className="font-bold">{c.challenge}</p><p className="mt-1 text-sm">{passed ? c.stampDone : `${minimumScore} / ${unit.quiz.questions.length}`}</p></div></li>
            </ol>
          </section>
          <aside className="order-1 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 md:order-2 md:sticky md:top-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800"><MapPin size={16} aria-hidden />{passed ? c.stamp : c.remaining}</p><h2 className="mt-3 text-xl font-bold">{passed ? c.stampDone : ui.resumeView === "challenge" ? c.challenge : next < 0 ? c.challenge : unit.lessons[steps[ui.resumeView === "mission" ? ui.step : next].lesson].title[locale]}</h2>
            <p className="mt-3 text-sm leading-6">{c.stampRule}</p><p className="mt-4 text-sm font-semibold">{done}/{unit.lessons.length} {c.progress}</p>
            {passed && nextUnit ? <Link href={italianCourseHref(locale, nextUnit.id)} className={`${primary} mt-5 hidden w-full md:inline-flex`}>{c.nextUnit}<ArrowRight size={18} aria-hidden /></Link> : <button ref={primaryAction} type="button" className={`${primary} mt-5 hidden w-full md:inline-flex ${tour === 2 ? "ring-4 ring-orange-300 ring-offset-4" : ""}`} onClick={beginMission}>{ui.resumeView === "challenge" ? c.challenge : next < 0 && !ui.resumeView ? c.begin : ui.resumeView ? c.resume : c.start}<ArrowRight size={18} aria-hidden /></button>}
            <p className="mt-4 text-sm font-bold text-emerald-800">{guidedPoints(unit, progress)} {c.points}</p><p className="mt-3 text-xs text-stone-500">{learning.storageAvailable && storageAvailable ? c.saved : c.unsaved}</p>
            {passed ? <button type="button" className={`${secondary} mt-3`} onClick={() => move(0)}>{c.practice}</button> : <button type="button" className="mt-5 min-h-11 text-left text-xs text-stone-600 underline" onClick={() => { finishTour(); stop(); commit({ ...current.current, view: "challenge-intro", resumeView: null, game: emptyGame() }); focus(); }}>{c.finalShortcut}</button>}
          </aside>
        </div>
        <div className="mb-5 md:hidden" data-yoppo-primary-mobile>
          {passed && nextUnit ? <Link href={italianCourseHref(locale, nextUnit.id)} className={`${primary} w-full`} aria-label={`${say("Depuis la carte : ", "From the map: ", "Desde el mapa: ")}${c.nextUnit}`}>{c.nextUnit}<ArrowRight size={18} aria-hidden /></Link>
            : passed ? <button type="button" className={`${primary} w-full`} aria-label={`${say("Depuis la carte : ", "From the map: ", "Desde el mapa: ")}${c.practice}`} onClick={() => move(0)}>{c.practice}<ArrowRight size={18} aria-hidden /></button>
              : <button type="button" className={`${primary} w-full`} aria-label={`${say("Depuis la carte : ", "From the map: ", "Desde el mapa: ")}${ui.resumeView === "challenge" ? c.challenge : next < 0 && !ui.resumeView ? c.begin : ui.resumeView ? c.resume : c.start}`} onClick={beginMission}>{ui.resumeView === "challenge" ? c.challenge : next < 0 && !ui.resumeView ? c.begin : ui.resumeView ? c.resume : c.start}<ArrowRight size={18} aria-hidden /></button>}
        </div>
        <ItalianWorldNavigator journey={journey} locale={locale} currentUnitId={unit.id} hrefForUnit={id => italianCourseHref(locale,id)} canReview={placedReview} />
      </> : null}

      {ui.view === "mission" ? <div className="mx-auto max-w-2xl">
        <div className="mb-6"><p className="text-sm font-bold text-emerald-800">{c.mission} {step.lesson + 1} · {c.step} {position + 1}/{missionSteps.length}</p><div role="progressbar" aria-label={`${c.mission} ${step.lesson + 1}`} aria-valuenow={position} aria-valuemin={0} aria-valuemax={missionSteps.length} className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${position / missionSteps.length * 100}%` }} /></div></div>
        <h1 ref={heading} tabIndex={-1} className="mb-5 text-2xl font-bold outline-none">{step.stage === "prepare" ? say("Préparer : ","Prepare: ","Preparar: ") : ""}{lesson.title[locale]}</h1>
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-8">
          {step.stage === "prepare" ? <VisualVocabulary key={lesson.id} words={visualWords[lesson.id]} lessonId={lesson.id} locale={locale} experienced={profile?.experience !== "new"} resetAt={progress.resetAt} paused={overlay!==null} onReady={advance}/> : !exercise ? <>
            <div className="mb-5 flex items-start gap-3"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="xs" compact /><p className="pt-2 text-sm leading-6">{lesson.goal[locale]}</p></div>
            {step.stage === "scene" ? <><p className="mb-4 text-xs font-bold uppercase text-emerald-800">{c.scene}</p><LearningAudio text={lesson.reading.it} locale={locale} /><p lang="it" className="my-5 whitespace-pre-line text-xl leading-9">{lesson.reading.it}</p><button className={secondary} type="button" aria-expanded={translation} onClick={() => setTranslation(!translation)}>{c.translation}</button>{translation ? <p className="mt-3 text-sm leading-7">{lesson.reading.meaning[locale]}</p> : null}</> : null}
            {step.stage === "words" ? <><h2 className="mb-5 text-xl font-bold">{c.notebook}</h2><div className="space-y-4">{lesson.vocabulary.slice(0,8).map(p => <div key={p.it} className="border-b border-stone-100 pb-4"><p lang="it" className="text-lg font-semibold">{p.it}</p><p className="my-2 text-sm text-stone-600">{p.meaning[locale]}</p><LearningAudio text={p.it} locale={locale} /></div>)}</div><p className="mt-4 text-sm text-stone-600">{say("Ces premières expressions t’aident à démarrer. Tous les mots et verbes sont dans ton carnet.", "These first expressions get you started. Your notebook contains the complete word and verb list.", "Estas primeras expresiones te ayudan a empezar. El cuaderno contiene todas las palabras y los verbos.")}</p><Link href={bankHref} target="_blank" rel="noopener" className={`${secondary} mt-2 underline`}>{say("Voir / imprimer la fiche complète", "View / print the full study sheet", "Ver / imprimir la ficha completa")}</Link></> : null}
            {step.stage === "language" ? <LanguageExplanation lesson={lesson} locale={locale}/> : null}
            {step.stage === "sounds" ? <><h2 className="mb-4 text-xl font-bold">{c.pronunciation}</h2><p className="text-base leading-7">{lesson.pronunciation.body[locale]}</p><div className="mt-5 space-y-4">{lesson.pronunciation.practice.map(text => <div key={text}><p lang="it" className="mb-2 text-lg font-semibold">{text}</p><LearningAudio text={text} locale={locale} /></div>)}</div></> : null}
            <button type="button" className={`${primary} mt-7 w-full`} onClick={advance}>{c.next}<ArrowRight size={18} aria-hidden /></button>
          </> : <>
            {exercise.id === lesson.readingActivityId ? <div className="mb-6 rounded-2xl bg-emerald-50 p-4"><p lang="it" className="text-base leading-7">{lesson.reading.it}</p></div> : null}
            <GuidedGame key={exercise.id} activity={exercise} locale={locale} paused={overlay!==null} value={ui.game} onChange={updateGame} onAttempt={(correct, assisted) => { recordActivity(exercise.id, correct, assisted); }} onContinue={advance} />
            {!ui.game.complete ? <><button type="button" className={`${secondary} mt-3`} onClick={() => { setHint(true); updateGame({ ...current.current.game, assisted: true }); }}>{c.hint}</button>{hint ? <aside className="mt-2 rounded-2xl bg-emerald-50 p-4"><p className="text-sm leading-6">{exercise.hint[locale]}</p><p className="mt-2 text-xs">{c.hintUsed}</p></aside> : null}</> : null}
          </>}
        </div>
      </div> : null}
      {ui.view === "challenge-intro" ? <section className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"><CompanionAvatar visualId="travel" state="teacher_ready" size="sm" locale={locale} compact /><div className="mt-5"><ItalianCityBossGate unitId={unit.id} locale={locale} variant="challenge"/></div><h1 ref={heading} tabIndex={-1} className="mt-5 text-3xl font-bold outline-none">{c.challenge}</h1><p className="mt-4 text-lg font-semibold">{c.stampRule}</p><p className="mt-4 text-sm leading-7">{unit.quiz.mission?.briefing[locale] ?? unit.quiz.description[locale]}</p><p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-7">{c.finalRule}</p><button type="button" className={`${primary} mt-6 w-full`} onClick={startChallenge}>{c.begin}</button><button type="button" className={`${secondary} mt-3 w-full`} onClick={() => move(next >= 0 ? next : 0)}>{c.practice}</button></section> : null}
      {challengeMode ? <section className="mx-auto max-w-2xl"><p className="mb-3 text-sm font-bold text-emerald-800">{c.challenge} · {ui.quizIndex + 1}/{unit.quiz.questions.length}</p><h1 ref={heading} tabIndex={-1} className="mb-5 text-2xl font-bold outline-none">{unit.quiz.mission?.scenes[question.id]?.title[locale] ?? c.challenge}</h1><ItalianBossBattleHud locale={locale} correct={ui.answers.filter(answer=>answer.correct).length} answered={ui.answers.length} total={unit.quiz.questions.length} assisted={ui.answers.some(answer=>answer.assisted)} passPercent={unit.quiz.passPercent}/><div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-8">{unit.quiz.mission?.scenes[question.id] ? <p className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm leading-7">{unit.quiz.mission.scenes[question.id].setting[locale].replace("Écris une demande polie", "Construis une demande polie avec les mots").replace("Write a polite request", "Build a polite request with the words").replace("Escribe una petición cortés", "Construye una petición cortés con las palabras")}</p> : null}<GuidedGame key={`${ui.runStartedAt}:${question.id}`} activity={question} locale={locale} paused={overlay!==null} value={ui.game} onChange={updateGame} onAttempt={() => {}} onContinue={nextQuestion} assessment continueLabel={ui.quizIndex === unit.quiz.questions.length - 1 ? c.result : c.next} /></div><p className="mt-3 text-xs text-stone-600">{c.noHints}</p></section> : null}
      {ui.view === "result" ? <section className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-6 text-center sm:p-8"><div className="flex justify-center"><CompanionAvatar visualId="travel" state={resultPassed ? "celebrating" : "teacher_ready"} size="md" locale={locale} compact /></div>{resultPassed && passed?<div className="mt-5"><ItalianCityBossGate unitId={unit.id} locale={locale} variant="victory"/></div>:null}<h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">{resultPassed ? c.passed : resultHelp ? c.helped : c.missed}</h1><p className="mt-5 text-4xl font-black text-emerald-800">{completedAnswers}/{unit.quiz.questions.length}</p>{resultPassed ? <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl border-2 border-emerald-700 p-4 font-bold motion-safe:animate-[fadeIn_300ms_ease-out]"><Stamp aria-hidden />{c.stamp}</p> : null}{resultPassed ? <section className="mt-6 rounded-2xl bg-emerald-50 p-5 text-left" data-yoppo-city-achievements>
        <h2 className="text-lg font-bold text-emerald-950">{say("Ce que tu sais maintenant pratiquer", "What you can now practise", "Lo que ya puedes practicar")}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{unit.objectives.map((goal,index) => <li key={index}>{goal[locale]}</li>)}</ul>
        <p className="mt-4 text-sm text-stone-700">{say("Continue d'étudier ces expressions et révise-les dans ton carnet pour les retenir longtemps.", "Keep studying these expressions and review them in your notebook for long-term memory.", "Sigue estudiando estas expresiones y repásalas en tu cuaderno para recordarlas.")}</p>
        <div className="mt-3 flex flex-wrap gap-2"><Link href={`/yo/langues/italien/parcours/${unit.id}/bilan?lang=${locale}`} target="_blank" rel="noopener" className={`${secondary} underline`}>{say("Imprimer mon bilan", "Print my achievements", "Imprimir mis logros")}</Link><Link href={bankHref} target="_blank" rel="noopener" className={`${secondary} underline`}>{say("Imprimer mes mots", "Print my vocabulary", "Imprimir mis palabras")}</Link></div>
      </section> : null}<p className="mt-5 text-sm leading-6 text-stone-600">{c.finishNotice}</p>{resultPassed ? <button type="button" className={`${primary} mt-6 w-full`} onClick={leave}>{c.map}<ArrowRight size={18} aria-hidden /></button> : <><button type="button" className={`${primary} mt-6 w-full`} onClick={() => move(0)}>{c.practice}</button><button type="button" className={`${secondary} mt-3 w-full`} onClick={startChallenge}>{c.retry}</button></>}</section> : null}
    </main>
    <Dialog.Root open={overlay !== null} onOpenChange={open => { if (!open) { stopLessonAudio(); setOverlay(null); } }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[#fbf9f3] p-5 shadow-xl sm:p-7" aria-describedby={undefined}><div className="flex items-start justify-between gap-4"><Dialog.Title className="text-xl font-bold text-emerald-950">{overlay === "notebook" ? c.notebook : c.tools}</Dialog.Title><Dialog.Close className={secondary} aria-label={c.close}><X size={21} aria-hidden /></Dialog.Close></div>
      {overlay === "notebook" ? <><p className="my-4 text-sm leading-6">{wordBank ? say("Toute la banque du module, disponible dès le début. Ouvre-la librement pendant la pratique.","The whole module bank, available from the beginning. Use it freely during practice.","Todo el banco del módulo, disponible desde el principio. Úsalo durante la práctica.") : c.learnedWords}</p>{wordBank ? <Link href={bankHref} target="_blank" rel="noopener" className={`${secondary} underline`}>{say("Imprimer la banque complète","Print the complete bank","Imprimir el banco completo")}</Link> : null}<button type="button" className={secondary} aria-pressed={notebookMeanings} onClick={() => setNotebookMeanings(!notebookMeanings)}>{notebookMeanings ? {fr:"Masquer les traductions",en:"Hide translations",es:"Ocultar traducciones"}[locale] : c.translation}</button>{!notebookWords.length ? <p className="py-6 text-sm">{c.emptyNotebook}</p> : notebookWords.map(p => <div key={p.it} className="border-b border-stone-200 py-4"><p lang="it" className="font-bold">{p.it}</p>{notebookMeanings ? <p className="my-2 text-sm">{p.meaning[locale]}</p> : null}<LearningAudio text={p.it} locale={locale} /></div>)}</> : <div className="mt-5 space-y-6">
        {onConfigure ? <section><h3 className="font-bold">{say("Mon départ et mon rythme","My starting point and pace","Mi inicio y mi ritmo")}</h3><p className="mt-2 text-sm">{rhythm ? `${rhythm.sessions} × ${rhythm.minutes} min / ${say("semaine","week","semana")}` : say("À mon rythme","At my pace","A mi ritmo")}</p><button type="button" className={`${secondary} mt-2`} onClick={()=>{stopLessonAudio();setOverlay(null);onConfigure();}}>{say("Ajuster avec Yoppo","Adjust with Yoppo","Ajustar con Yoppo")}</button>{profile?.reviewUnitIds.map(id=><Link className={`${secondary} block underline`} key={id} href={italianCourseHref(locale,id)}>{say("Réviser : ","Review: ","Repasar: ")}{catalog.units.find(u=>u.id===id)?.title[locale]}</Link>)}</section> : null}
        <FeedbackSettings locale={locale}/>
        <section><h3 className="font-bold">{c.stamp}</h3><p className="mt-2 text-sm leading-6">{c.stampRule}</p><p className="mt-2 text-sm leading-6">{c.pointsRule}</p></section>
        <section><h3 className="font-bold">{c.pass}</h3><p className="mt-2 text-sm leading-6">{c.passBody}</p></section>
        <section><h3 className="font-bold">{c.match}</h3><p className="mt-2 text-sm leading-6">{c.matchBody}</p><Link href={`${teacherUrl}${locale !== "fr" ? `&lang=${locale}` : ""}`} className={`${secondary} mt-2 underline`}>{c.teacher}<ArrowRight size={16} aria-hidden /></Link></section>
        {due.length && !challengeMode ? <button type="button" className={secondary} onClick={() => { setOverlay(null); move(steps.findIndex(s => s.id === due[0])); }}>{c.practice} ({due.length})</button> : null}
        <button type="button" className={secondary} onClick={() => { setOverlay(null); leave(); setTour(0); }}>{c.showTour}</button>
        <nav aria-label="Interface" className="flex gap-3">{(["fr", "en", "es"] as const).map(lang => <Link key={lang} href={italianCourseHref(lang, unit.id)} aria-current={locale === lang ? "page" : undefined} className={secondary}>{lang.toUpperCase()}</Link>)}</nav>
      </div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div></ItalianAudioProvider>;
}
