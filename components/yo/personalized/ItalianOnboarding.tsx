"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog, CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { emptyGame, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { experienceOptions, goalOptions, weeklyOptions, placementRecommendation, type LearningProfile, type PlacementAnswer } from "@/lib/yo/personalized/profile";
import { GuidedGame } from "../italian/guided/GuidedGame";
import { primary, secondary } from "../italian/guided/copy";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { FeedbackSettings } from "../feedback/LearningFeedback";

export type PlacementCheck = { unitId: string; activity: CourseQuestion };
type Screen = "experience" | "goal" | "time" | "choice" | "check" | "result";
type Props = {
  locale: YoLocale; catalog: CourseCatalog; checks: PlacementCheck[];
  audioPaths: Record<string, string>; initial?: LearningProfile | null;
  onComplete: (profile: LearningProfile) => void; onCancel?: () => void;
};

export function ItalianOnboarding({ locale, catalog, checks, audioPaths, initial, onComplete, onCancel }: Props) {
  const say = (fr: string, en: string, es: string) => t(fr, en, es)[locale];
  const [screen, setScreen] = useState<Screen>("experience");
  const [experience, setExperience] = useState<LearningProfile["experience"]>(initial?.experience ?? "new");
  const [goal, setGoal] = useState<LearningProfile["goal"]>(initial?.goal ?? "thorough");
  // A new learner chooses a pace explicitly. Zero means the deliberate "at my pace" choice.
  const [minutes, setMinutes] = useState<number | null>(initial?.weeklyMinutes ?? null);
  const [custom, setCustom] = useState(Boolean(initial && !weeklyOptions.some(n => n === initial.weeklyMinutes)));
  const [customText, setCustomText] = useState(initial ? String(initial.weeklyMinutes) : "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [game, setGame] = useState<GameDraft>(emptyGame);
  const [start, setStart] = useState(initial?.startUnitId ?? "u01");
  const [mode, setMode] = useState<LearningProfile["placement"]>(initial?.placement ?? "manual");
  const [reviews, setReviews] = useState<string[]>(initial?.reviewUnitIds ?? []);
  const last = useRef({ answers, game });
  useLayoutEffect(() => { last.current = { answers, game }; }, [answers, game]);
  const guide = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);

  // Focus the title without scrolling Yoppo out of view, including after a long mobile step.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      guide.current?.scrollIntoView({ block: "start", behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [screen, answers.length]);

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
    time: say("Quel rythme te convient ?", "What pace suits you?", "¿Qué ritmo te viene bien?"),
    choice: say("On trouve ton point de départ ?", "Shall we find your starting point?", "¿Buscamos tu punto de partida?"),
    check: say("Voyons ce que tu connais déjà.", "Let’s see what you already know.", "Veamos lo que ya sabes."),
    result: mode === "check" ? say("Je te propose de commencer ici !", "I suggest starting here!", "¡Te propongo empezar aquí!") : say("On y va ensemble !", "Let’s get started together!", "¡Vamos a empezar juntos!"),
  };
  const paceLabel = (n: number) => n === 0 ? say("À mon rythme", "At my pace", "A mi ritmo") :
    `${n % 60 === 0 ? `${n / 60} h` : `${n} min`} / ${say("semaine", "week", "semana")}`;
  function go(next: Screen) { stopLessonAudio(); setScreen(next); }
  function showResult(openPicker = false) { setPickerOpen(openPicker); go("result"); }
  function nextAnswer() {
    const s = last.current;
    if (!s.game.complete || s.answers.length >= checks.length) return;
    const next = [...s.answers, { unitId: checks[s.answers.length].unitId, correct: s.game.feedback === true, assisted: s.game.assisted }];
    last.current = { answers: next, game: emptyGame() }; setAnswers(next); setGame(emptyGame());
    const weak = next.length % 3 === 0 && next.slice(-3).filter(a => a.correct && !a.assisted).length < 2;
    if (weak || next.length === checks.length) {
      const rec = placementRecommendation(next);
      setStart(rec.startUnitId); setReviews(rec.reviewUnitIds); setMode("check"); showResult();
    }
  }
  function finish() {
    stopLessonAudio();
    onComplete({ version: 1, language: "it", experience, goal, weeklyMinutes: validPace ? resolvedMinutes! : 0,
      startUnitId: selected.id, placement: mode, reviewUnitIds: reviews, updatedAt: Date.now() });
  }
  function skip() {
    if (!validPace) { setMinutes(0); setCustom(false); }
    setMode("manual"); showResult(true);
  }
  const optionStyle = "min-h-14 w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-left font-semibold hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4";
  const backScreen: Record<Exclude<Screen, "experience" | "check">, Screen> = { goal: "experience", time: "goal", choice: "time", result: experience === "new" ? "time" : "choice" };

  return <ItalianAudioProvider paths={audioPaths}>
    <main lang={locale} data-yoppo-onboarding data-onboarding-step={screen} className="min-h-screen bg-[#fbf9f3] px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] text-stone-800 sm:pt-8">
      <div className="mx-auto max-w-xl">
        <div ref={guide} data-yoppo-guide className="mb-6 flex scroll-mt-5 items-center gap-3">
          <CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="md" compact className="shrink-0" />
          <div className="min-w-0 flex-1 rounded-3xl rounded-bl-md border border-emerald-100 bg-white p-4">
            <p className="text-xs font-bold tracking-wide text-emerald-800">Yoppo · Italiano</p>
            <h1 ref={heading} tabIndex={-1} className="mt-1 text-xl font-bold leading-snug outline-none">{titles[screen]}</h1>
          </div>
        </div>

        {screen === "experience" && <div className="grid gap-3">{experienceOptions.map((v, i) =>
          <button key={v} type="button" className={optionStyle} onClick={() => { setExperience(v); go("goal"); }}>{experienceLabels[i]}</button>
        )}</div>}
        {screen === "goal" && <div className="grid gap-3">{goalOptions.map((v, i) =>
          <button key={v} type="button" className={optionStyle} onClick={() => { setGoal(v); go("time"); }}>{goalLabels[i]}</button>
        )}</div>}

        {screen === "time" && <>
          <p className="mb-4 text-sm leading-6 text-stone-600">{say("Choisis ce qui te convient. Tu pourras changer plus tard.", "Choose what works for you. You can change it later.", "Elige lo que te venga bien. Puedes cambiarlo después.")}</p>
          <fieldset>
            <legend className="sr-only">{say("Ton rythme par semaine", "Your weekly pace", "Tu ritmo semanal")}</legend>
            <div className="grid grid-cols-2 gap-3">{weeklyOptions.map(n => {
              const checked = minutes === n && !custom;
              return <label key={n} data-pace-choice={n} className={`cursor-pointer ${n === 0 ? "col-span-2" : ""}`}>
                <input type="radio" name="weekly-pace" value={n} checked={checked} aria-label={paceLabel(n)} className="peer sr-only"
                  onChange={() => { setMinutes(n); setCustom(false); }} />
                <span data-pace-selected={checked} className={`flex min-h-16 items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 font-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-emerald-800 ${checked ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-white text-stone-800"}`}>
                  <span>{n === 0 ? paceLabel(0) : <>{n < 60 ? `${n} min` : `${n / 60} h`}<span className="mt-0.5 block text-xs font-normal">{say("par semaine", "per week", "por semana")}</span></>}</span>
                  <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300"}`}>{checked && <Check size={16} strokeWidth={3} />}</span>
                </span>
              </label>;
            })}</div>
          </fieldset>
          <button type="button" className={`${secondary} mt-2`} aria-expanded={custom} aria-controls="custom-weekly-pace" onClick={() => {
            if (!custom && !customText && minutes !== null && minutes > 0) setCustomText(String(minutes));
            if (custom && !weeklyOptions.some(n => n === minutes)) setMinutes(null);
            setCustom(!custom);
          }}>{say("Choisir une autre durée", "Choose another duration", "Elegir otra duración")}</button>
          {custom && <div id="custom-weekly-pace" className="mt-2 rounded-2xl border border-emerald-200 bg-white p-4">
            <label htmlFor="custom-pace-input" className="block text-sm font-semibold">{say("Minutes par semaine", "Minutes per week", "Minutos por semana")}</label>
            <input id="custom-pace-input" type="number" inputMode="numeric" min={15} max={1200} step={1} value={customText} onChange={e => setCustomText(e.target.value)}
              aria-describedby="custom-pace-help" aria-invalid={customText !== "" && !validPace} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white p-3 text-base" />
            <p id="custom-pace-help" className="mt-2 text-xs text-stone-600">{say("De 15 à 1 200 minutes.", "Between 15 and 1,200 minutes.", "Entre 15 y 1200 minutos.")}</p>
          </div>}
          <button type="button" className={`${primary} mt-5 w-full`} disabled={!validPace} onClick={() => {
            if (!validPace) return;
            setMinutes(resolvedMinutes);
            if (experience === "new") { setStart(initial?.startUnitId ?? "u01"); setMode(initial?.placement ?? "beginner"); showResult(); }
            else go("choice");
          }}>{say("Continuer", "Continue", "Continuar")}</button>
        </>}

        {screen === "choice" && <>
          <p className="mb-5 text-base leading-7">{say("Quelques questions, et je te propose une mission adaptée à tes bases.", "A few questions will help me suggest a mission that fits what you know.", "Unas preguntas me ayudarán a proponerte una misión adecuada.")}</p>
          <button type="button" className={`${primary} w-full`} onClick={() => { setAnswers([]); setGame(emptyGame()); go("check"); }}>{say("Trouver mon point de départ", "Find my starting point", "Encontrar mi punto de partida")}</button>
          <button type="button" className={`${secondary} mt-3 w-full`} onClick={() => { setMode("manual"); showResult(true); }}>{say("Choisir moi-même", "Choose for myself", "Elegir por mi cuenta")}</button>
        </>}
        {screen === "check" && <section className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold">{say("Question", "Question", "Pregunta")} {answers.length + 1} · {say("9 au maximum", "at most 9", "9 como máximo")}</p>
          <GuidedGame key={answers.length} activity={checks[answers.length].activity} locale={locale} value={game} onChange={g => { last.current = { ...last.current, game: g }; setGame(g); }} onAttempt={() => {}} onContinue={nextAnswer} assessment />
          <button type="button" className={`${secondary} mt-3`} onClick={() => { const rec = placementRecommendation(answers); setStart(rec.startUnitId); setReviews(rec.reviewUnitIds); setMode("manual"); showResult(true); }}>{say("Arrêter et choisir", "Stop and choose", "Parar y elegir")}</button>
        </section>}

        {screen === "result" && <section data-onboarding-recommendation className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{say("Ta première mission", "Your first mission", "Tu primera misión")}</p>
          <h2 className="mt-2 text-xl font-bold leading-snug">{selected.title[locale]}</h2>
          <p className="mt-3 text-base leading-7">{selected.objectives[0]?.[locale]}</p>
          <p data-pace-summary className="mt-4 text-sm text-stone-600">{paceLabel(validPace ? resolvedMinutes! : 0)}</p>
          <button type="button" className={`${primary} mt-5 w-full`} onClick={finish}>{say("Commencer ici", "Start here", "Empezar aquí")}</button>
          <button type="button" className={`${secondary} mt-2 w-full`} aria-expanded={pickerOpen} aria-controls="starting-mission-picker" onClick={() => setPickerOpen(!pickerOpen)}>{say("Changer de mission", "Change mission", "Cambiar de misión")}</button>
          {pickerOpen && <div id="starting-mission-picker" className="mt-3 border-t border-stone-200 pt-4">
            <label className="block text-sm font-semibold">{say("Choisir un autre module", "Choose a different module", "Elegir otro módulo")}
              <select className="mt-2 min-h-12 w-full min-w-0 max-w-full rounded-xl border border-stone-300 bg-white px-3 text-base" value={start} onChange={e => { setStart(e.target.value); setMode("manual"); }}>{catalog.units.map(u => <option key={u.id} value={u.id}>{u.number}. {u.title[locale]}</option>)}</select>
            </label>
          </div>}
        </section>}

        <footer className="mt-5 border-t border-stone-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-1">
            {screen !== "experience" && screen !== "check" && <button type="button" className={secondary} onClick={() => go(backScreen[screen])}>{say("Retour", "Back", "Volver")}</button>}
            {onCancel ? <button type="button" className={secondary} onClick={() => { stopLessonAudio(); onCancel(); }}>{say("Garder mon parcours actuel", "Keep my current journey", "Conservar mi recorrido actual")}</button> : screen !== "result" && screen !== "check" && <button type="button" className={secondary} onClick={skip}>{say("Passer", "Skip", "Omitir")}</button>}
          </div>
          <FeedbackSettings locale={locale} compact />
        </footer>
      </div>
    </main>
  </ItalianAudioProvider>;
}
