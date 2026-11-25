"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, ArrowUp, Compass, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { interestIds, interestLabels, interestLanguage, parseInterests, readInterestPreferences, writeInterestPreferences, type InterestId, type InterestLanguage } from "@/lib/yo/interests/preferences";
import { correctRecall, directionMeaning, directions, interestCorpus, practiceDirections, practiceOptions } from "@/lib/yo/interests/content";
import { emptyInterestProgress, interestProgressKey, interestReviewId, newInterestSession, parseInterestProgress, type InterestProgress, type InterestSession } from "@/lib/yo/interests/session";
import { recordReviewAttempt } from "@/lib/yo/review/store";
import { useReviewQueue } from "../review/useReviewQueue";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { interestAudioPath } from "@/lib/yo/interests/audio";
import { IntroAudio } from "../shared/IntroAudio";
import { InterestChoices } from "./InterestChoices";
import { primary, secondary } from "../italian/guided/copy";
import { useMissionCinema } from "../travel/useMissionCinema";
import { MissionFilm } from "../travel/MissionFilm";

type Props = { language: string; locale: YoLocale; interests?: InterestId[]; city?: string };
const reviewIds = interestIds.flatMap(id => [2, 3, 4, 5].map(step => interestReviewId(id, step)));
export function InterestPracticeCard(props: Props) {
  const language = interestLanguage(props.language);
  return language ? <InterestPractice key={language} {...props} language={language}/> : null;
}
function InterestPractice({ language, locale, interests, city }: Omit<Props, "language"> & { language: InterestLanguage }) {
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];
  const [preferences, setPreferences] = useState(() => parseInterests(interests));
  const [progress, setProgress] = useState<InterestProgress>(emptyInterestProgress);
  const latest = useRef(progress);
  const [ready, setReady] = useState(false), [saved, setSaved] = useState(true), [editing, setEditing] = useState(false), [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(""), [feedback, setFeedback] = useState<boolean | null>(null), [showAnswer, setShowAnswer] = useState(false), [meanings, setMeanings] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null), returnFocus = useRef<HTMLElement | null>(null);
  const { scene, present, finish } = useMissionCinema(`interest:${language}`, { active: open });
  const review = useReviewQueue(language, reviewIds);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const next = parseInterestProgress(localStorage.getItem(interestProgressKey(language)), language);
        latest.current = next; setProgress(next);
        const stored = readInterestPreferences(language); if (stored !== null) setPreferences(stored);
      } catch { setSaved(false); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [language]);
  const session = progress.session, activeStep = progress.session?.step;
  useEffect(() => {
    // The uppermost cinema dialog owns focus until it has been dismissed.
    if (!open || scene || activeStep === undefined) return;
    const frame = requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, scene, activeStep]);
  function save(next: InterestProgress) {
    latest.current = next; setProgress(next);
    try { localStorage.setItem(interestProgressKey(language), JSON.stringify(next)); setSaved(true); }
    catch { setSaved(false); }
  }
  function update(next: InterestSession) { save({ ...latest.current, session: next }); }
  const corpus = interestCorpus[language];
  const choices = preferences.length ? preferences : [...interestIds];
  const total = Object.values(progress.attempts).reduce((sum, n) => sum + (n ?? 0), 0);
  const nextInterest = choices[total % choices.length];
  function start(interest: InterestId, resume = false) {
    if (!open) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stopLessonAudio(); setSelected(""); setFeedback(null); setShowAnswer(false);
    const previous = latest.current.session;
    const next = resume && previous && previous.step < 6 ? previous : newInterestSession(language, interest, latest.current.attempts[interest] ?? 0);
    update(next); setOpen(true);
    present({ id: `${next.runId}:start`, kind: "mission-start", title: interestLabels[next.interest][locale], detail: say("Trouve ton chemin avec Yoppo.", "Find your way with Yoppo.", "Encuentra el camino con Yoppo.") });
  }
  function close(value: boolean) { stopLessonAudio(); setOpen(value); }
  function advance() {
    const current = latest.current.session; if (!current) return;
    if (current.step >= 2 && current.step <= 5 && feedback !== true) return;
    stopLessonAudio(); setSelected(""); setFeedback(null); setShowAnswer(false);
    const next = { ...current, step: Math.min(6, current.step + 1) };
    if (next.step === 6) {
      save({ ...latest.current, session: next, attempts: { ...latest.current.attempts, [next.interest]: Math.min(1000000, next.attempt + 1) } });
      present({ id: `${next.runId}:success`, kind: "mission-success", title: say("Tu as trouvé ton chemin !", "You found your way!", "¡Encontraste el camino!"), detail: interestLabels[next.interest][locale] });
    } else update(next);
  }
  function check() {
    const current = latest.current.session;
    if (!current || current.step < 2 || current.step > 5 || !selected.trim() || feedback !== null) return;
    const path = practiceDirections(current.interest, current.attempt);
    const correct = current.step === 2 ? selected === current.interest : current.step === 3 ? selected === path.first : current.step === 4 ? correctRecall(selected, corpus.venues[current.interest].noun) : selected === path.transfer;
    const index = current.step - 2;
    const helped = current.assisted[index] || showAnswer;
    const assisted = current.assisted.map((v, i) => i === index ? v || !correct || showAnswer : v);
    const outcomes = current.correct.map((v, i) => i === index ? correct && !helped : v);
    update({ ...current, assisted, correct: outcomes }); setFeedback(correct);
    recordReviewAttempt({ language, itemId: interestReviewId(current.interest, current.step), correct, assisted: helped,
      attemptId: `${current.runId}:${current.step}:${correct ? "correct" : "miss"}:${helped ? "helped" : "independent"}` });
  }
  function reveal() {
    const current = latest.current.session; if (!current || current.step < 2 || current.step > 5) return;
    update({ ...current, assisted: current.assisted.map((v, i) => i === current.step - 2 ? true : v) }); setShowAnswer(true);
    recordReviewAttempt({ language, itemId: interestReviewId(current.interest, current.step), correct: false, assisted: true, attemptId: `${current.runId}:${current.step}:reveal` });
  }
  const v = session ? corpus.venues[session.interest] : corpus.venues[nextInterest];
  const path = session ? practiceDirections(session.interest, session.attempt) : practiceDirections(nextInterest, 0);
  const nounMeaning = v.meaning[locale];
  const questionMeaning = say(`Demande où se trouve ${nounMeaning}.`, `Ask where ${nounMeaning} is.`, `Pregunta dónde está ${nounMeaning}.`);
  function phrase(text: string, reading?: string, meaning?: string) {
    return <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p lang={language} className="text-lg font-semibold leading-8">{text}</p>
      {reading && <p className="mt-1 text-sm text-stone-600">{reading}</p>}
      {meanings && meaning && <p className="my-2 text-sm leading-6 text-stone-600">{meaning}</p>}
      <IntroAudio text={text} speechLocale={corpus.speechLocale} path={interestAudioPath(corpus.speechLocale, text)} locale={locale}/>
    </div>;
  }
  const choiceClass = (value: string) => `flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base leading-7 ${selected === value ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"}`;
  function directionChoices() { return <div className="mt-5 space-y-3">{directions.map(id => {
    const Icon = { left: ArrowLeft, right: ArrowRight, straight: ArrowUp }[id];
    return <button type="button" key={id} aria-pressed={selected === id} disabled={feedback !== null} className={choiceClass(id)} onClick={() => setSelected(id)}><Icon aria-hidden size={22}/>{directionMeaning[id][locale]}</button>;
  })}</div>; }
  const resume = Boolean(session && session.step < 6);
  return <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-5 text-stone-800" data-interest-practice={language}>
    <div className="flex items-start gap-3"><Compass className="mt-1 shrink-0 text-emerald-800" size={22} aria-hidden/><div>
      <h2 className="text-lg font-bold">{say("Une escale qui te ressemble", "A stop inspired by you", "Una parada a tu medida")}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">{say("Dialogue, orientation et rappel · environ 4 minutes", "Dialogue, directions and recall · about 4 minutes", "Diálogo, orientación y recuerdo · unos 4 minutos")}{city ? ` · ${city}` : ""}</p>
    </div></div>
    <button type="button" disabled={!ready} className={`${secondary} mt-4 w-full border border-emerald-300 bg-emerald-50`} onClick={() => start(resume ? session!.interest : nextInterest, resume)}>
      {resume ? say("Reprendre mon escale", "Resume my stop", "Retomar mi parada") : `${say("Explorer", "Explore", "Explorar")} · ${interestLabels[nextInterest][locale]}`}<ArrowRight size={18} aria-hidden/>
    </button>
    {review.dueIds.length > 0 && !resume && <button type="button" className={`${secondary} mt-2 w-full underline`} onClick={() => {
      const id = interestIds.find(id => review.dueIds.some(item => item.startsWith(`interest:${id}:`)));
      if (id) start(id);
    }}>{say("Revoir mes difficultés", "Review my difficult items", "Repasar mis dificultades")} · {review.dueIds.length}</button>}
    {review.dueIds.length > 0 && resume && <p className="mt-3 text-xs text-stone-500">{say("Tes révisions t’attendent après cette escale.", "Your reviews are waiting after this stop.", "Tus repasos te esperan después de esta parada.")}</p>}
    {review.pending > 0 && !review.dueIds.length && <p className="mt-3 text-xs text-stone-500">{say("Tes difficultés reviendront dans les prochaines révisions.", "Your difficult items will return in upcoming reviews.", "Tus dificultades volverán en los próximos repasos.")}</p>}
    <button type="button" className={`${secondary} mt-2 text-sm underline`} aria-expanded={editing} onClick={() => setEditing(!editing)}>{say("Mes centres d’intérêt", "My interests", "Mis intereses")}</button>
    {editing && <div className="mt-3 border-t pt-4"><InterestChoices locale={locale} value={preferences} onChange={next => { setPreferences(next); setSaved(writeInterestPreferences(language, next)); }}/>
      <p className="mt-2 text-xs leading-5 text-stone-600">{say("Le choix modifie tes prochaines escales; une escale commencée garde sa place.", "Your choice changes upcoming stops; an unfinished stop keeps its place.", "Tu elección cambia las próximas paradas; una parada empezada conserva su lugar.")}</p></div>}
    {(!saved || review.ready && !review.persistent) && <p role="status" className="mt-3 text-sm text-amber-900">{say("La sauvegarde est indisponible. Garde cette page ouverte pour continuer.", "Saving is unavailable. Keep this page open to continue.", "No se puede guardar. Mantén esta página abierta para continuar.")}</p>}
    <Dialog.Root open={open && !scene} onOpenChange={close}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50"/>
      <Dialog.Content aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); if (!open && !scene && returnFocus.current?.isConnected) returnFocus.current.focus(); }} className="fixed inset-x-0 bottom-0 top-0 z-50 overflow-y-auto bg-[#fbf9f3] p-4 sm:inset-6 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:p-7" onKeyDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3"><Dialog.Title className="text-sm font-bold text-emerald-800">Yoppo · {session ? interestLabels[session.interest][locale] : ""}</Dialog.Title><Dialog.Close className={secondary} aria-label={say("Fermer et garder ma place", "Close and save my place", "Cerrar y guardar mi lugar")}><X size={22}/></Dialog.Close></div>
        {session && <div className="mx-auto mt-3 max-w-xl" data-interest-step={session.step}>
          <p className="text-xs font-semibold text-stone-500">{Math.min(session.step + 1, 6)} / 6 · {say("Pratique libre", "Open practice", "Práctica libre")}</p>
          <h2 ref={heading} tabIndex={-1} className="mb-5 mt-3 text-2xl font-bold leading-snug outline-none">{
            session.step === 0 ? say("Trouve le lieu qui t’intéresse", "Find the place you want to visit", "Encuentra el lugar que te interesa") :
            session.step === 1 ? say("Une vraie petite conversation", "A short, useful conversation", "Una conversación breve y útil") :
            session.step === 2 ? questionMeaning : session.step === 3 ? say("Quelle direction suivre ?", "Which way should you go?", "¿Qué dirección debes seguir?") :
            session.step === 4 ? say("Retrouve le mot de mémoire", "Recall the word from memory", "Recuerda la palabra") :
            session.step === 5 ? say("Un nouveau trajet : la sortie", "A new route: the exit", "Un recorrido nuevo: la salida") : say("Tu as trouvé ton chemin !", "You found your way!", "¡Encontraste el camino!")}</h2>
          {session.step <= 1 && <><p className="mb-4 text-sm leading-6">{say("Écoute si tu le souhaites, puis essaie de répondre sans regarder. La voix de ton appareil sert d’aperçu lorsque disponible.", "Listen if you like, then try answering without looking. A device voice preview is available where supported.", "Escucha si quieres y después intenta responder sin mirar. Puedes usar la voz de tu dispositivo si está disponible.")}</p>
            <button type="button" className={`${secondary} mb-3 text-sm underline`} aria-pressed={!meanings} onClick={() => setMeanings(!meanings)}>{meanings ? say("Masquer les traductions", "Hide translations", "Ocultar traducciones") : say("Afficher les traductions", "Show translations", "Mostrar traducciones")}</button>
            <div className="space-y-3">{phrase(v.question.text, v.question.reading, questionMeaning)}
              {session.step === 0 ? <>{directions.map(id => <div key={id}>{phrase(corpus.directions[id].text, corpus.directions[id].reading, directionMeaning[id][locale])}</div>)}{phrase(corpus.exit.text, corpus.exit.reading, say("Demande où est la sortie.", "Ask where the exit is.", "Pregunta dónde está la salida."))}</> : <>{phrase(corpus.directions[path.first].text, corpus.directions[path.first].reading, directionMeaning[path.first][locale])}{phrase(corpus.thanks.text, corpus.thanks.reading, say("Remercie la personne.", "Thank the person.", "Da las gracias."))}{phrase(corpus.repeat.text, corpus.repeat.reading, say("Demande de répéter si tu en as besoin.", "Ask them to repeat if you need to.", "Pide que repita si lo necesitas."))}</>}
            </div><button type="button" className={`${primary} mt-5 w-full`} onClick={advance}>{say("Continuer", "Continue", "Continuar")}</button></>}
          {session.step === 2 && <div className="space-y-3">{practiceOptions(session.interest, session.attempt).map(id => <button type="button" key={id} lang={language} aria-pressed={selected === id} disabled={feedback !== null} className={choiceClass(id)} onClick={() => setSelected(id)}>{corpus.venues[id].question.text}</button>)}</div>}
          {(session.step === 3 || session.step === 5) && <>{session.step === 5 && <p lang={language} className="mb-4 text-lg font-semibold">{corpus.exit.text}</p>}
            {phrase(corpus.directions[session.step === 3 ? path.first : path.transfer].text, corpus.directions[session.step === 3 ? path.first : path.transfer].reading)}{directionChoices()}</>}
          {session.step === 4 && <label className="block text-base leading-7">{nounMeaning}<input autoComplete="off" spellCheck={false} lang={language} aria-label={say("Le mot de mémoire", "Word from memory", "Palabra de memoria")} value={selected} disabled={feedback !== null} onChange={event => setSelected(event.target.value.slice(0, 160))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); check(); } }} className="mt-3 min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-white p-3 text-xl"/>
            <span className="mt-2 block text-xs text-stone-500">{say("Écris le nom sans article. Les accents comptent. Tu peux afficher le modèle.", "Write the noun without its article. Accents matter. You can reveal the model.", "Escribe el nombre sin artículo. Los acentos cuentan. Puedes ver el modelo.")}</span></label>}
          {session.step >= 2 && session.step <= 5 && <>
            {showAnswer && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-base" data-interest-model>{session.step === 2 ? v.question.text : session.step === 4 ? v.noun : directionMeaning[session.step === 3 ? path.first : path.transfer][locale]}</p>}
            {feedback !== null && <div role="status" className={`mt-4 rounded-2xl p-4 leading-7 ${feedback ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>
              <p className="font-bold">{feedback ? say("Bien joué !", "Well done!", "¡Bien hecho!") : say("Regarde ce qui change.", "Notice the difference.", "Fíjate en la diferencia.")}</p>
              <p>{session.step === 2 ? `${v.question.text} — ${nounMeaning}` : session.step === 4 ? v.noun : `${corpus.directions[session.step === 3 ? path.first : path.transfer].text} — ${directionMeaning[session.step === 3 ? path.first : path.transfer][locale]}`}</p>
              {!feedback && <p className="mt-2 text-sm">{say("Cette difficulté reviendra en révision. Réessaie maintenant avec le modèle.", "This will return in review. Try again now using the model.", "Esta dificultad volverá en el repaso. Prueba otra vez con el modelo.")}</p>}
            </div>}
            {feedback === true ? <button type="button" className={`${primary} mt-5 w-full`} onClick={advance}>{say("Continuer", "Continue", "Continuar")}</button> : feedback === false ? <button type="button" className={`${primary} mt-5 w-full`} onClick={() => { setFeedback(null); setSelected(""); setShowAnswer(true); }}>{say("Réessayer", "Try again", "Reintentar")}</button> : <button type="button" disabled={!selected.trim()} className={`${primary} mt-5 w-full`} onClick={check}>{say("Vérifier", "Check", "Comprobar")}</button>}
            {feedback === null && <button type="button" className={`${secondary} mt-2 w-full text-sm underline`} onClick={reveal}>{say("Afficher le modèle", "Show the model", "Mostrar el modelo")}</button>}
          </>}
          {session.step === 6 && <><p className="text-lg leading-8">{say("Tu as demandé ton chemin, compris une direction et retrouvé un mot. Les questions faites avec aide restent à revoir.", "You asked for directions, understood a route and recalled a word. Questions completed with help stay in review.", "Preguntaste por el camino, comprendiste una dirección y recordaste una palabra. Las preguntas resueltas con ayuda quedan para repasar.")}</p>
            <p className="mt-4 text-sm text-stone-600">{session.correct.filter(Boolean).length}/4 {say("réponses sans aide", "answers without help", "respuestas sin ayuda")}</p>
            <button type="button" className={`${primary} mt-5 w-full`} onClick={() => close(false)}>{say("Continuer mon parcours", "Continue my journey", "Continuar mi recorrido")}</button>
            <button type="button" className={`${secondary} mt-2 w-full underline`} onClick={() => start(session.interest)}>{say("Essayer un autre trajet", "Try another route", "Probar otro recorrido")}</button></>}
          <p className="mt-6 text-xs leading-5 text-stone-500">{say("Reprise et révisions sur cet appareil. Cette pratique ne modifie pas les bilans de ton cours.", "Resume and reviews are saved on this device. This practice does not change your course assessments.", "El progreso y los repasos se guardan en este dispositivo. Esta práctica no cambia las evaluaciones del curso.")}</p>
        </div>}
      </Dialog.Content></Dialog.Portal></Dialog.Root>
    {scene && <MissionFilm scene={scene} locale={locale} onContinue={finish}/>}
  </section>;
}
