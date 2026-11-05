"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseLesson, CoursePhrase, CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import { CourseCultureEncounter } from "./CourseCulturePhoto";
import { ItalianModuleAudio, ITALIAN_MODULE_AUDIO_STOP_EVENT } from "../ItalianModuleAudio";
import { C, courseButton, courseOutline } from "./CourseShared";

const COPY = {
  fr: { steps: ["Ta mission", "La scène", "Les mots", "La langue", "Les sons", "À toi"], reveal: "Vérifier le sens", again: "À revoir", recalled: "Retrouvé", complete: "Tu as retrouvé toutes les expressions de cette série.", restart: "Recommencer", direction: "Sens du rappel", recognize: "Comprendre l’italien", produce: "Retrouver l’italien", remember: "Essaie de retrouver la réponse avant de la dévoiler.", self: "Autoévaluation, sans points. Les jeux vérifieront ce que tu retiens.", together: "Yoppo · un pas ensemble", translation: "Voir la traduction", hide: "Masquer la traduction", scene: "Écoute la scène. Que comprends-tu sans traduction ?", echo: "Écoute, puis répète à voix haute. Compare avec l’enregistrement.", start: "Entrer dans la mission" },
  en: { steps: ["Your mission", "The scene", "Words", "Language", "Sounds", "Your turn"], reveal: "Check the meaning", again: "Review again", recalled: "Recalled", complete: "You recalled every expression in this round.", restart: "Start again", direction: "Recall direction", recognize: "Understand Italian", produce: "Recall the Italian", remember: "Try to recall the answer before revealing it.", self: "Self-assessment, without points. The games will check what you remember.", together: "Yoppo · one step together", translation: "Show translation", hide: "Hide translation", scene: "Listen to the scene. What can you understand without a translation?", echo: "Listen, then repeat aloud. Compare with the recording.", start: "Enter the mission" },
  es: { steps: ["Tu misión", "La escena", "Palabras", "La lengua", "Sonidos", "Tu turno"], reveal: "Comprobar el sentido", again: "Repasar", recalled: "Recordado", complete: "Has recordado todas las expresiones de esta ronda.", restart: "Empezar de nuevo", direction: "Dirección del repaso", recognize: "Entender el italiano", produce: "Recordar el italiano", remember: "Intenta recordar la respuesta antes de mostrarla.", self: "Autoevaluación, sin puntos. Los juegos comprobarán lo que recuerdas.", together: "Yoppo · un paso juntos", translation: "Ver traducción", hide: "Ocultar traducción", scene: "Escucha la escena. ¿Qué entiendes sin traducción?", echo: "Escucha y repite en voz alta. Compara con la grabación.", start: "Entrar en la misión" },
};

export function ItalianRecallCards({ phrases, locale }: { phrases: CoursePhrase[]; locale: YoLocale }) {
  const copy = COPY[locale];
  const [queue, setQueue] = useState(() => phrases.map((_, index) => index));
  const [revealed, setRevealed] = useState(false);
  const [produce, setProduce] = useState(false);
  const revealedRef = useRef(false);
  const phrase = phrases[queue[0]];
  function reset(direction = produce) {
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
    setProduce(direction); setQueue(phrases.map((_, i) => i)); setRevealed(false); revealedRef.current = false;
  }
  function answer(remembered: boolean) {
    if (!revealedRef.current) return;
    revealedRef.current = false;
    setQueue(items => remembered ? items.slice(1) : [...items.slice(1), items[0]]);
    setRevealed(false);
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
  }
  return <div>
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={copy.direction}>
      <button type="button" aria-pressed={!produce} onClick={() => reset(false)} className={!produce ? courseButton : courseOutline}>{copy.recognize}</button>
      <button type="button" aria-pressed={produce} onClick={() => reset(true)} className={produce ? courseButton : courseOutline}>{copy.produce}</button>
    </div>
    <p className="text-sm text-gray-600">{copy.remember}</p>
    <div className="mt-5 min-h-64" aria-live="polite">
      {phrase ? <>
        <p className="text-xs font-semibold text-emerald-800">{phrases.length - queue.length}/{phrases.length}</p>
        <p lang={produce ? locale : "it"} className="my-6 break-words font-serif text-3xl leading-relaxed">{produce ? phrase.meaning[locale] : phrase.it}</p>
        {!produce || revealed ? <ItalianModuleAudio text={phrase.it} locale={locale} /> : null}
        {revealed ? <>
          <p lang={produce ? "it" : locale} className="mt-5 text-xl text-emerald-900">{produce ? phrase.it : phrase.meaning[locale]}</p>
          {phrase.note ? <p className="mt-2 text-sm">{phrase.note[locale]}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => answer(false)} className={courseOutline}><RotateCcw size={16} aria-hidden />{copy.again}</button><button type="button" onClick={() => answer(true)} className={courseButton}><Check size={16} aria-hidden />{copy.recalled}</button></div>
        </> : <button type="button" onClick={() => { setRevealed(true); revealedRef.current = true; }} className={`${courseOutline} mt-5`}>{copy.reveal}</button>}
      </> : <><p className="py-6 text-xl text-emerald-900">{copy.complete}</p><button type="button" onClick={() => reset()} className={courseOutline}><RotateCcw size={16} aria-hidden />{copy.restart}</button></>}
    </div>
    <p className="mt-4 text-xs text-gray-600">{copy.self}</p>
  </div>;
}

export function ItalianStudyJourney({ lesson, locale, onPractice, culture, cultureStop }: { lesson: CourseLesson; locale: YoLocale; onPractice: () => void; culture?: CourseUnit["culture"]; cultureStop?: CourseUnit["cultureStop"] }) {
  const copy = COPY[locale], shared = C[locale];
  const [step, setStep] = useState(0), [translation, setTranslation] = useState(false);
  const [recallMode, setRecallMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(() => lesson.speaking.checklist.map(() => false));
  // Encounter language in context before isolated vocabulary and explanation.
  const stage = [0, 4, 1, 2, 3, 5][step];
  const heading = useRef<HTMLHeadingElement>(null);
  function move(next: number) {
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
    setStep(next); setTranslation(false);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "nearest" }); });
  }
  const note = stage === 1 ? copy.remember : stage === 3 ? copy.echo : stage === 4 ? copy.scene : lesson.goal[locale];
  return <section data-testid="italian-study-journey" className="min-w-0">
    <nav aria-label={shared.learn} className="mb-5 flex gap-2 overflow-x-auto pb-2">
      {copy.steps.map((label, index) => <button type="button" key={label} onClick={() => move(index)} aria-current={step === index ? "step" : undefined} className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${step === index ? "border-emerald-800 bg-emerald-800 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-emerald-50"}`}>{index + 1}. {label}</button>)}
    </nav>
    <div className="mb-6 flex items-center gap-3 border-b border-emerald-100 pb-4"><CompanionAvatar visualId="travel" state="map" size="sm" locale={locale} compact /><div className="min-w-0"><p className="text-xs font-bold text-emerald-800">{copy.together}</p><p className="mt-1 text-sm leading-relaxed text-gray-700">{note}</p></div></div>
    <h3 ref={heading} tabIndex={-1} className="mb-5 break-words font-serif text-2xl outline-none">{stage === 0 ? lesson.title[locale] : copy.steps[step]}</h3>
    <div className="min-h-64">
      {stage === 0 ? <><p lang="it" className="my-6 font-serif text-3xl text-emerald-800">{lesson.vocabulary[0].it}</p><ItalianModuleAudio text={lesson.vocabulary[0].it} locale={locale} />{cultureStop ? <CourseCultureEncounter stop={cultureStop} locale={locale} /> : culture ? <section className="mt-7 border-t border-emerald-100 pt-5"><h4 className="font-serif text-xl">{culture.title[locale]}</h4><p className="mt-3 text-sm leading-7">{culture.body[locale]}</p></section> : null}</> : null}
      <div hidden={stage !== 1}>
        <div className="mb-5 flex flex-wrap gap-3">
          <button type="button" aria-pressed={!recallMode} className={!recallMode ? courseButton : courseOutline} onClick={() => setRecallMode(false)}>{locale === "fr" ? "Mon carnet de mots" : locale === "es" ? "Mi cuaderno de palabras" : "My word notebook"}</button>
          <button type="button" aria-pressed={recallMode} className={recallMode ? courseButton : courseOutline} onClick={() => setRecallMode(true)}>{locale === "fr" ? "M’entraîner de mémoire" : locale === "es" ? "Practicar de memoria" : "Practise from memory"}</button>
        </div>
        <div hidden={!recallMode}><ItalianRecallCards key={lesson.id} phrases={lesson.vocabulary} locale={locale} /></div><div hidden={recallMode}>
          <button type="button" aria-expanded={translation} className={`${courseOutline} mb-4`} onClick={() => setTranslation(!translation)}>{translation ? copy.hide : copy.translation}</button>
          <div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="w-full text-left"><thead className="bg-emerald-50"><tr><th scope="col" className="px-4 py-3">Italiano</th>{translation ? <th scope="col" className="px-4 py-3">{locale === "fr" ? "Français" : locale === "es" ? "Español" : "English"}</th> : null}</tr></thead><tbody>
            {lesson.vocabulary.map((phrase, index) => <tr key={index} className="border-t border-emerald-100"><td className="px-4 py-4"><p lang="it" className="mb-2 text-lg font-semibold">{phrase.it}</p><ItalianModuleAudio text={phrase.it} locale={locale} /></td>{translation ? <td className="px-4 py-4 text-sm leading-relaxed">{phrase.meaning[locale]}{phrase.note ? <p className="mt-2 text-gray-600">{phrase.note[locale]}</p> : null}</td> : null}</tr>)}
          </tbody></table></div>
        </div>
      </div>
      {stage === 2 ? <><h4 className="text-lg font-bold">{lesson.grammar.title[locale]}</h4><p className="mt-4 whitespace-pre-line text-sm leading-7">{lesson.grammar.body[locale]}</p><div className="mt-5 space-y-4">{lesson.grammar.examples.map((example, index) => <div key={index} className="border-l-2 border-emerald-400 pl-4"><p lang="it" className="text-lg font-semibold">{example.it}</p><p className="my-2 text-sm text-gray-600">{example.meaning[locale]}</p><ItalianModuleAudio text={example.it} locale={locale} /></div>)}</div></> : null}
      {stage === 3 ? <><p className="text-sm leading-7">{lesson.pronunciation.body[locale]}</p><div className="mt-5 grid gap-5 sm:grid-cols-2">{lesson.pronunciation.practice.map(text => <div key={text}><p lang="it" className="mb-3 text-xl font-semibold">{text}</p><ItalianModuleAudio text={text} locale={locale} /></div>)}</div><p className="mt-5 text-xs text-gray-600">{shared.oralPrivacy}</p></> : null}
      {stage === 4 ? <><ItalianModuleAudio text={lesson.reading.it} locale={locale} /><p lang="it" className="my-6 whitespace-pre-line font-serif text-2xl leading-relaxed">{lesson.reading.it}</p><button type="button" aria-expanded={translation} onClick={() => setTranslation(!translation)} className={courseOutline}>{translation ? copy.hide : copy.translation}</button>{translation ? <p className="mt-5 whitespace-pre-line text-sm leading-7">{lesson.reading.meaning[locale]}</p> : null}</> : null}
      {stage === 5 ? <><p className="text-base leading-7">{lesson.speaking.prompt[locale]}</p><label htmlFor={`${lesson.id}-rehearsal`} className="mt-5 block text-sm font-semibold">{locale === "fr" ? "Mon essai en italien" : locale === "es" ? "Mi intento en italiano" : "My attempt in Italian"}</label><textarea id={`${lesson.id}-rehearsal`} lang="it" value={draft} onChange={event => setDraft(event.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-lg border border-emerald-200 bg-white p-3 text-base" /><p className="mt-2 text-xs text-gray-600">{shared.draftNotice}</p><fieldset className="mt-5"><legend className="text-sm font-bold">{shared.selfCheck}</legend>{lesson.speaking.checklist.map((item, index) => <label key={index} className="mt-3 flex min-h-12 items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={checks[index]} onChange={event => setChecks(values => values.map((value, i) => i === index ? event.target.checked : value))} className="mt-1 size-5 shrink-0 accent-emerald-800" />{item[locale]}</label>)}</fieldset><p className="mt-5 text-xs text-gray-600">{shared.oralPrivacy}</p></> : null}
    </div>
    <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-gray-200 pt-5"><button type="button" onClick={() => move(step - 1)} disabled={step === 0} className={`${courseOutline} disabled:opacity-40`}><ArrowLeft size={16} aria-hidden />{shared.previous}</button><button type="button" onClick={() => step === copy.steps.length - 1 ? onPractice() : move(step + 1)} className={courseButton}>{stage === 0 ? copy.start : step === copy.steps.length - 1 ? shared.practice : shared.next}<ArrowRight size={16} aria-hidden /></button></div>
  </section>;
}

