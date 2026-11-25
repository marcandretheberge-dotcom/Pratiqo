"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import { JournalChoice, useYoppoJournal, YoppoWelcomeGuide, YoppoWelcomeLoading } from "../onboarding/YoppoJournal";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { checkGuided, emptyGame, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { experienceOptions, goalOptions, weeklyOptions, placementRecommendation, type LearningProfile } from "@/lib/yo/personalized/profile";
import { GuidedGame } from "../italian/guided/GuidedGame";
import { primary, secondary } from "../italian/guided/copy";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { FeedbackSettings } from "../feedback/LearningFeedback";
import { InterestChoices } from "../interests/InterestChoices";
import { interestLabels, writeInterestPreferences } from "@/lib/yo/interests/preferences";

import { createItalianWelcomeStore, type ItalianWelcomeDraft, type ItalianWelcomeScreen as Screen, type PlacementCheck } from "@/lib/yo/onboarding/draftAdapters";
import { sameDraft } from "@/lib/yo/onboarding/draftStore";
import { useOnboardingDraft } from "../onboarding/useOnboardingDraft";
import { OnboardingDraftNotice } from "../onboarding/OnboardingDraftNotice";
export type { PlacementCheck } from "@/lib/yo/onboarding/draftAdapters";
type Props = {
  locale: YoLocale; catalog: CourseCatalog; checks: PlacementCheck[];
  audioPaths: Record<string, string>; initial?: LearningProfile | null;
  onComplete: (profile: LearningProfile) => void; onCancel?: () => void;
};

export function ItalianOnboarding({ locale, catalog, checks, audioPaths, initial, onComplete, onCancel }: Props) {
  const say = (fr: string, en: string, es: string) => t(fr, en, es)[locale];
  const journal = useYoppoJournal();
  const store = useMemo(() => createItalianWelcomeStore(catalog, checks, initial), [catalog, checks, initial]);
  const snapshot = useOnboardingDraft(store);
  const { screen, experience, interests, minutes, custom, customText, pickerOpen, answers, game, start, mode } = snapshot.state;
  const acceptedSnapshot = useRef(snapshot);
  useLayoutEffect(() => { acceptedSnapshot.current = snapshot; }, [snapshot]);
  const guide = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);

  // Focus the title without scrolling Yoppo out of view, including after a long mobile step.
  useLayoutEffect(() => {
    if (!snapshot.ready) return;
    const frame = requestAnimationFrame(() => {
      guide.current?.scrollIntoView({ block: "start", behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [snapshot.ready, screen, answers.length]);

  const parsedCustom = /^\d+$/.test(customText.trim()) ? Number(customText) : NaN;
  const resolvedMinutes = custom ? parsedCustom : minutes;
  const validPace = resolvedMinutes !== null && Number.isInteger(resolvedMinutes) &&
    resolvedMinutes >= (custom ? 15 : 0) && resolvedMinutes <= 1200;
  const selected = catalog.units.find(u => u.id === start) ?? catalog.units[0];
  const experienceLabels = [say("Je pars de zéro", "I’m starting from zero", "Empiezo de cero"), say("Je connais quelques mots", "I know a few words", "Conozco algunas palabras"), say("Je peux échanger simplement", "I can have simple conversations", "Puedo conversar de forma sencilla"), say("J’ai des bases, mais je suis rouillé", "I have a background, but I’m rusty", "Tengo una base, pero me falta práctica"), say("Je ne sais pas où commencer", "I’m not sure where to start", "No sé por dónde empezar")];
  const goalLabels = [say("Voyager", "Travel", "Viajar"), say("Famille et amis", "Family and friends", "Familia y amistades"), say("Travail ou études", "Work or studies", "Trabajo o estudios"), say("Conversations du quotidien", "Everyday conversation", "Conversaciones cotidianas"), say("Apprendre en profondeur", "Learn the language thoroughly", "Aprender a fondo")];
  const titles: Record<Screen, string> = {
    experience: say("Ciao ! Tu connais déjà un peu l’italien ?", "Ciao! Know a little Italian already?", "¡Ciao! ¿Ya sabes un poco de italiano?"),
    goal: say("Qu’est-ce qui te donne envie d’apprendre ?", "What makes you want to learn?", "¿Qué te anima a aprender?"),
    interests: say("Qu’est-ce qui t’intéresse ?", "What do you enjoy?", "¿Qué te interesa?"),
    time: say("Quel rythme te convient ?", "What pace suits you?", "¿Qué ritmo te viene bien?"),
    choice: say("On trouve ton point de départ ?", "Shall we find your starting point?", "¿Buscamos tu punto de partida?"),
    check: say("Voyons ce que tu connais déjà.", "Let’s see what you already know.", "Veamos lo que ya sabes."),
    result: mode === "check" ? say("Je te propose de commencer ici !", "I suggest starting here!", "¡Te propongo empezar aquí!") : say("On y va ensemble !", "Let’s get started together!", "¡Vamos a empezar juntos!"),
  };
  const paceLabel = (n: number) => n === 0 ? say("À mon rythme", "At my pace", "A mi ritmo") :
    `${n % 60 === 0 ? `${n / 60} h` : `${n} min`} / ${say("semaine", "week", "semana")}`;
  function change(patch: Partial<ItalianWelcomeDraft>) {
    const accepted = store.update(snapshot.token, current => ({ ...current, ...patch }));
    if (accepted) acceptedSnapshot.current = store.getSnapshot();
    return accepted;
  }
  function go(next: Screen, patch: Partial<ItalianWelcomeDraft> = {}) { stopLessonAudio(); return change({ ...patch, screen: next }); }
  function showResult(openPicker = false, patch: Partial<ItalianWelcomeDraft> = {}) { return go("result", { ...patch, pickerOpen: openPicker }); }
  function nextAnswer() {
    const accepted = store.update(snapshot.token, current => {
      if (current.screen !== "check" || !current.game.complete || current.answers.length >= checks.length) return null;
      const next = [...current.answers, { unitId: checks[current.answers.length].unitId, correct: current.game.feedback === true, assisted: current.game.assisted }];
      const weak = next.length % 3 === 0 && next.slice(-3).filter(answer => answer.correct && !answer.assisted).length < 2;
      const rec = placementRecommendation(next);
      return { ...current, answers: next, game: emptyGame(), ...(weak || next.length === checks.length ? {
        start: rec.startUnitId, reviews: rec.reviewUnitIds, mode: "check" as const, screen: "result" as const, pickerOpen: false,
      } : {}) };
    });
    if (accepted) { stopLessonAudio(); journal.write(`${say("Question", "Question", "Pregunta")} ${answers.length + 1}`); }
  }
  function changeGame(next: GameDraft, before: GameDraft) {
    const accepted = store.update(acceptedSnapshot.current.token, current => {
      if (current.screen !== "check" || current.answers.length !== answers.length || current.game.complete || !sameDraft(current.game, before)) return null;
      const assisted = current.game.assisted || next.assisted || next.transcript;
      if (next.complete && next.feedback !== checkGuided(checks[answers.length].activity, next)) return null;
      return { ...current, game: { ...next, assisted } };
    });
    if (!accepted) return null;
    acceptedSnapshot.current = store.getSnapshot(); return accepted.game;
  }
  function restartCheck() { journal.clear(); return go("check", { answers: [], game: emptyGame(), pickerOpen: false }); }
  function finish() {
    const accepted = store.consume(snapshot.token); if (!accepted || accepted.screen !== "result") return;
    stopLessonAudio(); writeInterestPreferences("it", accepted.interests);
    const amount = accepted.custom ? Number(accepted.customText) : accepted.minutes;
    onComplete({ version: 1, language: "it", experience: accepted.experience, goal: accepted.goal,
      weeklyMinutes: amount !== null && Number.isInteger(amount) && amount >= (accepted.custom ? 15 : 0) && amount <= 1200 ? amount : 0,
      startUnitId: accepted.start, placement: accepted.mode, reviewUnitIds: accepted.reviews, updatedAt: Date.now(), interests: accepted.interests });
  }
  function skip() { journal.clear(); showResult(true, { mode: "manual", ...(!validPace ? { minutes: 0, custom: false } : {}) }); }
  const backScreen: Record<Exclude<Screen, "experience" | "check">, Screen> = { goal: "experience", interests: "goal", time: "interests", choice: "time", result: experience === "new" ? "time" : "choice" };

  if (!snapshot.ready) return <YoppoWelcomeLoading locale={locale}/>;
  return <ItalianAudioProvider paths={audioPaths}>
    <main lang={locale} data-yoppo-onboarding data-onboarding-step={screen} className="yj-welcome">
      <div className="yj-page">
        <div ref={guide} data-yoppo-guide className="scroll-mt-3">
          <YoppoWelcomeGuide title={titles[screen]} language="Italiano" locale={locale} step={screen} entry={journal.entry} headingRef={heading}/>
        </div>

        <OnboardingDraftNotice snapshot={snapshot} locale={locale}/>

        {screen === "experience" && <div className="yj-options">{experienceOptions.map((v, i) =>
          <JournalChoice key={v} kind={v} label={experienceLabels[i]} onPick={() => {
            if (go("goal", { experience: v })) journal.write(experienceLabels[i]);
          }}/>
        )}</div>}
        {screen === "goal" && <div className="yj-options">{goalOptions.map((v, i) =>
          <JournalChoice key={v} kind={v} label={goalLabels[i]} onPick={() => {
            if (go("interests", { goal: v })) journal.write(goalLabels[i]);
          }}/>
        )}</div>}

        {screen === "interests" && <><InterestChoices locale={locale} value={interests} onChange={next => {
          if (change({ interests: next })) journal.write(next.map(id => interestLabels[id][locale]).join(" · ") || say("Surprends-moi", "Surprise me", "Sorpréndeme"));
        }}/><button type="button" className={`${primary} mt-5 w-full`} onClick={() => go("time")}>{say("Continuer", "Continue", "Continuar")}</button></>}

        {screen === "time" && <>
          <p className="mb-4 text-sm leading-6 text-stone-600">{say("Choisis ce qui te convient. Tu pourras changer plus tard.", "Choose what works for you. You can change it later.", "Elige lo que te venga bien. Puedes cambiarlo después.")}</p>
          <fieldset>
            <legend className="sr-only">{say("Ton rythme par semaine", "Your weekly pace", "Tu ritmo semanal")}</legend>
            <div className="grid grid-cols-2 gap-3">{weeklyOptions.map(n => {
              const checked = minutes === n && !custom;
              return <label key={n} data-pace-choice={n} className={`cursor-pointer ${n === 0 ? "col-span-2" : ""}`}>
                <input type="radio" name="weekly-pace" value={n} checked={checked} aria-label={paceLabel(n)} className="peer sr-only"
                  onChange={() => { if (change({ minutes: n, custom: false })) journal.write(paceLabel(n)); }} />
                <span data-pace-selected={checked} className={`flex min-h-16 items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 font-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-emerald-800 ${checked ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-white text-stone-800"}`}>
                  <span>{n === 0 ? paceLabel(0) : <>{n < 60 ? `${n} min` : `${n / 60} h`}<span className="mt-0.5 block text-xs font-normal">{say("par semaine", "per week", "por semana")}</span></>}</span>
                  <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300"}`}>{checked && <Check size={16} strokeWidth={3} />}</span>
                </span>
              </label>;
            })}</div>
          </fieldset>
          <button type="button" className={`${secondary} mt-2`} aria-expanded={custom} aria-controls="custom-weekly-pace" onClick={() => {
            change({ custom: !custom,
              customText: !custom && !customText && minutes !== null && minutes > 0 ? String(minutes) : customText,
              minutes: custom && !weeklyOptions.some(n => n === minutes) ? null : minutes });
          }}>{say("Choisir une autre durée", "Choose another duration", "Elegir otra duración")}</button>
          {custom && <div id="custom-weekly-pace" className="mt-2 rounded-2xl border border-emerald-200 bg-white p-4">
            <label htmlFor="custom-pace-input" className="block text-sm font-semibold">{say("Minutes par semaine", "Minutes per week", "Minutos por semana")}</label>
            <input id="custom-pace-input" type="number" inputMode="numeric" min={15} max={1200} step={1} value={customText} maxLength={16} onChange={e => change({ customText: e.target.value.slice(0, 16) })}
              aria-describedby="custom-pace-help" aria-invalid={customText !== "" && !validPace} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white p-3 text-base" />
            <p id="custom-pace-help" className="mt-2 text-xs text-stone-600">{say("De 15 à 1 200 minutes.", "Between 15 and 1,200 minutes.", "Entre 15 y 1200 minutos.")}</p>
          </div>}
          <button type="button" className={`${primary} mt-5 w-full`} disabled={!validPace} onClick={() => {
            if (!validPace) return;
            if (custom && resolvedMinutes !== null) journal.write(paceLabel(resolvedMinutes));
            if (experience === "new") showResult(false, { minutes: resolvedMinutes, start: initial?.startUnitId ?? "u01", mode: initial?.placement ?? "beginner" });
            else go("choice", { minutes: resolvedMinutes });
          }}>{say("Continuer", "Continue", "Continuar")}</button>
        </>}

        {screen === "choice" && <>
          <p className="mb-5 text-base leading-7">{say("Quelques questions, et je te propose une mission adaptée à tes bases.", "A few questions will help me suggest a mission that fits what you know.", "Unas preguntas me ayudarán a proponerte una misión adecuada.")}</p>
          <button type="button" className={`${primary} w-full`} onClick={restartCheck}>{say("Trouver mon point de départ", "Find my starting point", "Encontrar mi punto de partida")}</button>
          <button type="button" className={`${secondary} mt-3 w-full`} onClick={() => { journal.clear(); showResult(true, { mode: "manual" }); }}>{say("Choisir moi-même", "Choose for myself", "Elegir por mi cuenta")}</button>
        </>}
        {screen === "check" && <section className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold">{say("Question", "Question", "Pregunta")} {answers.length + 1} · {say("9 au maximum", "at most 9", "9 como máximo")}</p>
          <GuidedGame key={`${answers.length}:${snapshot.changedElsewhere ? snapshot.token : "local"}`} activity={checks[answers.length].activity} locale={locale} value={game} onChange={changeGame} onAttempt={() => {}} onContinue={nextAnswer} assessment paused={snapshot.invalidated || snapshot.consumed} />
          <button type="button" className={`${secondary} mt-3`} onClick={() => { const rec = placementRecommendation(answers); showResult(true, { start: rec.startUnitId, reviews: rec.reviewUnitIds, mode: "manual" }); }}>{say("Arrêter et choisir", "Stop and choose", "Parar y elegir")}</button>
        </section>}

        {screen === "result" && <section data-onboarding-recommendation className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{say("Ta première mission", "Your first mission", "Tu primera misión")}</p>
          <h2 className="mt-2 text-xl font-bold leading-snug">{selected.title[locale]}</h2>
          <p className="mt-3 text-base leading-7">{selected.objectives[0]?.[locale]}</p>
          <p data-pace-summary className="mt-4 text-sm text-stone-600">{paceLabel(validPace ? resolvedMinutes! : 0)}</p>
          <button type="button" className={`${primary} mt-5 w-full`} onClick={finish}>{say("Commencer ici", "Start here", "Empezar aquí")}</button>
          <button type="button" className={`${secondary} mt-2 w-full`} aria-expanded={pickerOpen} aria-controls="starting-mission-picker" onClick={() => change({ pickerOpen: !pickerOpen })}>{say("Changer de mission", "Change mission", "Cambiar de misión")}</button>
          {pickerOpen && <div id="starting-mission-picker" className="mt-3 border-t border-stone-200 pt-4">
            <label className="block text-sm font-semibold">{say("Choisir un autre module", "Choose a different module", "Elegir otro módulo")}
              <select className="mt-2 min-h-12 w-full min-w-0 max-w-full rounded-xl border border-stone-300 bg-white px-3 text-base" value={start} onChange={e => change({ start: e.target.value, mode: "manual" })}>{catalog.units.map(u => <option key={u.id} value={u.id}>{u.number}. {u.title[locale]}</option>)}</select>
            </label>
          </div>}
        </section>}

        {(screen === "check" || screen === "result" && answers.length > 0) && <button type="button" className={`${secondary} mt-3 w-full`} onClick={restartCheck}>{say("Recommencer ce questionnaire", "Start this check again", "Reiniciar este cuestionario")}</button>}
        <footer className="mt-5 border-t border-stone-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-1">
            {screen !== "experience" && screen !== "check" && <button type="button" className={secondary} onClick={() => { journal.clear(); go(backScreen[screen]); }}>{say("Retour", "Back", "Volver")}</button>}
            {onCancel ? <button type="button" className={secondary} onClick={() => { if (store.consume(snapshot.token)) { stopLessonAudio(); onCancel(); } }}>{say("Garder mon parcours actuel", "Keep my current journey", "Conservar mi recorrido actual")}</button> : screen !== "result" && screen !== "check" && <button type="button" className={secondary} onClick={skip}>{say("Passer", "Skip", "Omitir")}</button>}
          </div>
          <FeedbackSettings locale={locale} compact />
        </footer>
      </div>
    </main>
  </ItalianAudioProvider>;
}
