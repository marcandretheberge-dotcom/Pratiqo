"use client";
import { useCourseExperience } from "./CourseExperience";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  RotateCcw,
} from "lucide-react";
import type {
  CourseCatalog,
  CourseLesson,
  CourseUnit,
} from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/german/courseAuthoring";
import { getDueActivityIds } from "@/lib/yo/italian/course/courseProgress";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import {
  ItalianModuleAudio,
  ITALIAN_MODULE_AUDIO_STOP_EVENT,
} from "../italian/ItalianModuleAudio";
import { ItalianGame } from "../italian/ItalianGames";
import { ItalianYoppoCoach } from "../italian/ItalianYoppoCoach";
import { CourseCulturePhoto } from "../italian/course/CourseCulturePhoto";
import { useItalianCourseProgress } from "../italian/course/useItalianCourseProgress";
import { GermanAssessment } from "./GermanAssessment";
import { GermanCourseShell, button, outline, copy } from "./GermanCourseShared";
import { CourseJourneyGate, CourseJourneyAdvance } from "../journey/CourseJourney";
import { buildCourseJourney } from "@/lib/yo/courseJourney";

function RecallCards({
  lesson,
  locale,
  onHelp,
}: {
  lesson: CourseLesson;
  locale: YoLocale;
  onHelp: () => void;
}) {
  const experience = useCourseExperience();
  const [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [reverse, setReverse] = useState(false),
    [queue, setQueue] = useState(() => lesson.vocabulary.map((_, i) => i));
  const word = lesson.vocabulary[queue[index]],
    c = copy[locale];
  function next(again: boolean) {
    if (again) setQueue((q) => [...q, queue[index]]);
    setIndex((i) => i + 1);
    setRevealed(false);
  }
  if (!word)
    return (
      <div className="py-6">
        <p className="text-sm">
          {
            t(
              "Toutes les cartes ont été revues. Passe maintenant aux exercices pour vérifier le rappel sans modèle.",
              "All cards reviewed. Try the exercises next to check recall without a model.",
              "Has repasado todas las tarjetas. Prueba los ejercicios para comprobar el recuerdo sin modelo.",
            )[locale]
          }
        </p>
        <button
          type="button"
          className={`${outline} mt-4`}
          onClick={() => {
            setQueue(lesson.vocabulary.map((_, i) => i));
            setIndex(0);
            setRevealed(false);
          }}
        >
          {c.replay}
        </button>
      </div>
    );
  return (
    <div className="py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold">
          {index + 1}/{queue.length}
        </p>
        <button
          type="button"
          className={outline}
          aria-pressed={reverse}
          onClick={() => {
            setReverse(!reverse);
            setRevealed(false);
          }}
        >
          <RotateCcw size={16} aria-hidden />
          {reverse
            ? experience.name + " → " + locale.toUpperCase()
            : locale.toUpperCase() + " → " + experience.name}
        </button>
      </div>
      <div className="flex min-h-48 flex-col justify-center rounded-lg border border-emerald-200 bg-white p-6">
        <p
          lang={reverse ? experience.language : locale}
          className="text-2xl font-semibold leading-relaxed"
        >
          {reverse ? word.it : word.meaning[locale]}
        </p>
        {revealed ? (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p
              lang={reverse ? locale : experience.language}
              className="text-xl text-emerald-900"
            >
              {reverse ? word.meaning[locale] : word.it}
            </p>
            <div className="mt-3">
              <ItalianModuleAudio text={word.it} locale={locale} />
            </div>
          </div>
        ) : null}
      </div>
      {!revealed ? (
        <button
          type="button"
          className={`${button} mt-4`}
          onClick={() => {
            onHelp();
            setRevealed(true);
          }}
        >
          {t("Retourner la carte", "Turn the card", "Girar la tarjeta")[locale]}
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={outline} onClick={() => next(true)}>
            {t("À revoir encore", "Review again", "Repasar otra vez")[locale]}
          </button>
          <button type="button" className={button} onClick={() => next(false)}>
            {t("Je l’avais retrouvée", "I recalled it", "Lo recordaba")[locale]}
          </button>
        </div>
      )}
    </div>
  );
}

function Workshop({
  unit,
  locale,
  done,
  onDone,
}: {
  unit: CourseUnit;
  locale: YoLocale;
  done: boolean;
  onDone: (done: boolean) => void;
}) {
  const experience = useCourseExperience();
  const key = `yopratiqo:${experience.draftPrefix}-draft:${unit.production.id}:v1`,
    [draft, setDraft] = useState(""),
    [ready, setReady] = useState(false),
    [stored, setStored] = useState(true),
    [model, setModel] = useState(false),
    [checks, setChecks] = useState<boolean[]>(
      unit.production.rubric.map(() => false),
    );
  useEffect(() => {
    try {
      setDraft((window.localStorage.getItem(key) ?? "").slice(0, 4000));
    } catch {
      setStored(false);
    }
    setReady(true);
  }, [key]);
  function edit(value: string) {
    setDraft(value);
    try {
      window.localStorage.setItem(key, value);
      setStored(true);
    } catch {
      setStored(false);
    }
    if (done) onDone(false);
  }
  return (
    <section className="max-w-2xl">
      <p className="mt-4 text-sm leading-relaxed">
        {unit.production.prompt[locale]}
      </p>
      <label htmlFor="german-draft" className="mt-5 block text-sm font-bold">
        {copy[locale].write}
      </label>
      <textarea
        id="german-draft"
        lang={experience.language}
        rows={7}
        maxLength={4000}
        disabled={!ready}
        value={draft}
        onChange={(e) => edit(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-4 text-base"
      />
      <p role="status" className="mt-2 text-xs text-gray-600">
        {stored
          ? t(
              "Brouillon sur cet appareil seulement. Ne saisis pas d’informations personnelles.",
              "Draft on this device only. Do not enter personal information.",
              "Borrador solo en este dispositivo. No escribas información personal.",
            )[locale]
          : copy[locale].blocked}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={outline}
          aria-expanded={model}
          onClick={() => setModel(!model)}
        >
          {copy[locale].model}
        </button>
        <button
          type="button"
          className={outline}
          disabled={!draft}
          onClick={() => {
            if (
              window.confirm(
                t(
                  "Effacer ce brouillon ?",
                  "Clear this draft?",
                  "¿Borrar este borrador?",
                )[locale],
              )
            )
              edit("");
          }}
        >
          {
            t("Effacer le brouillon", "Clear the draft", "Borrar el borrador")[
              locale
            ]
          }
        </button>
      </div>
      {model ? (
        <p
          lang={experience.language}
          className="mt-4 whitespace-pre-line rounded-lg bg-emerald-50 p-4"
        >
          {unit.production.model}
        </p>
      ) : null}
      <fieldset className="mt-6 space-y-3">
        <legend className="mb-3 font-bold">{copy[locale].self}</legend>
        {unit.production.rubric.map((item, i) => (
          <label key={i} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={(e) => {
                setChecks((v) =>
                  v.map((x, j) => (j === i ? e.target.checked : x)),
                );
                if (!e.target.checked && done) onDone(false);
              }}
              className="h-5 w-5 shrink-0 accent-emerald-700"
            />
            {item[locale]}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className={`${button} mt-5`}
        disabled={!draft.trim() || !checks.every(Boolean) || done}
        onClick={() => onDone(true)}
      >
        <Check size={17} aria-hidden />
        {done
          ? t("Relu", "Reviewed", "Revisado")[locale]
          : t("J’ai relu ma scène", "I reviewed my scene", "Revisé mi escena")[
              locale
            ]}
      </button>
    </section>
  );
}

type UnitProps = {
  unit: CourseUnit;
  catalog: CourseCatalog;
  locale: YoLocale;
  audioPaths: Record<string, string>;
  initialLessonId?: string;
  initialActivityId?: string;
};
export function GermanCourseUnit(props: UnitProps) {
  const experience = useCourseExperience();
  const state = useItalianCourseProgress(props.catalog, experience.progressKey);
  const step = buildCourseJourney(props.catalog, state.progress).steps.find(item => item.unit.id === props.unit.id);
  if (!state.ready || !step?.unlocked) return <CourseJourneyGate locale={props.locale} ready={state.ready} href={experience.href(props.locale)} />;
  return (
    <GermanUnitSession
      key={props.unit.id + "-" + state.progress.resetAt}
      {...props}
      state={state}
    />
  );
}
function GermanUnitSession({
  unit,
  catalog,
  locale,
  audioPaths,
  initialLessonId,
  initialActivityId,
  state,
}: UnitProps & { state: ReturnType<typeof useItalianCourseProgress> }) {
  const experience = useCourseExperience();
  const c = copy[locale];
  const initialLesson = Math.max(
    0,
    unit.lessons.findIndex((l) => l.id === initialLessonId),
  );
  const initialActivity = unit.lessons[initialLesson].activities.findIndex(
    (a) => a.id === initialActivityId,
  );
  const [lessonIndex, setLessonIndex] = useState(initialLesson),
    [activityIndex, setActivityIndex] = useState(Math.max(0, initialActivity)),
    [view, setView] = useState<"learn" | "practice" | "quiz" | "write">(
      initialActivity >= 0 ? "practice" : "learn",
    ),
    [study, setStudy] = useState(0),
    [epoch, setEpoch] = useState(0),
    [solved, setSolved] = useState(false),
    [resultAssisted, setResultAssisted] = useState(false),
    [wrong, setWrong] = useState(false);
  const assisted = useRef(false),
    answered = useRef(false),
    advancing = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  const lesson = unit.lessons[lessonIndex],
    activity = lesson.activities[activityIndex];
  const all = unit.lessons.flatMap((l) => l.activities.map((a) => a.id)),
    completed = all.filter(
      (id) => state.progress.activities[id]?.completed,
    ).length;
  const due = getDueActivityIds(state.progress, catalog).filter((id) =>
    all.includes(id),
  );
  const { ready, setResume } = state;
  useEffect(() => {
    if (ready && (view === "learn" || view === "practice"))
      setResume(
        unit.id,
        lesson.id,
        view === "practice" ? activity.id : undefined,
      );
  }, [ready, view, unit.id, lesson.id, activity.id, setResume]);
  function fresh() {
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
    assisted.current = false;
    answered.current = false;
    setSolved(false);
    setWrong(false);
    setResultAssisted(false);
    setEpoch((e) => e + 1);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function navigate(next: typeof view) {
    fresh();
    setView(next);
  }
  function chooseLesson(i: number) {
    fresh();
    setLessonIndex(i);
    setActivityIndex(0);
    setStudy(0);
    setView("learn");
  }
  function help() {
    if (!answered.current) assisted.current = true;
  }
  function attempt(correct: boolean) {
    if (answered.current) return;
    state.recordActivity(activity.id, correct, assisted.current);
    setWrong(!correct);
    if (correct) {
      answered.current = true;
      setSolved(true);
      setResultAssisted(assisted.current);
    } else assisted.current = true;
  }
  function nextActivity() {
    if (advancing.current) return;
    advancing.current = true;
    requestAnimationFrame(() => {
      advancing.current = false;
    });
    fresh();
    if (activityIndex + 1 < lesson.activities.length)
      setActivityIndex((i) => i + 1);
    else if (lessonIndex + 1 < unit.lessons.length)
      chooseLesson(lessonIndex + 1);
    else setView("quiz");
  }
  function review() {
    const id = due[0];
    if (!id) return;
    const li = unit.lessons.findIndex((l) =>
      l.activities.some((a) => a.id === id),
    );
    fresh();
    setLessonIndex(li);
    setActivityIndex(unit.lessons[li].activities.findIndex((a) => a.id === id));
    setView("practice");
  }
  const panels = [
    t("La mission", "The mission", "La misión"),
    t("Les mots", "The words", "Las palabras"),
    t("Le déclic", "The pattern", "La pauta"),
    t("Les sons", "The sounds", "Los sonidos"),
    t("La scène", "The scene", "La escena"),
    t("À voix haute", "Out loud", "En voz alta"),
  ];
  return (
    <ItalianAudioProvider paths={audioPaths} language={experience.language}>
      <GermanCourseShell locale={locale} unit={unit.id}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-800">
              {experience.name.toLocaleUpperCase()} · {String(unit.number).padStart(2, "0")}
            </p>
            <h1 className="mt-2 font-serif text-4xl text-emerald-950">
              {unit.title[locale]}
            </h1>
          </div>
          <p className="text-xs text-gray-600">
            {completed}/{all.length} · {c.done}
          </p>
        </div>
        {!Object.keys(audioPaths).length ? (
          <p
            role="status"
            className="mb-5 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm"
          >
            {c.audio}
          </p>
        ) : null}
        <p role="status" className="mb-5 text-xs text-gray-600">
          {state.ready && !state.storageAvailable ? c.blocked : c.local}
        </p>
        <div className="grid min-w-0 gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <nav
              aria-label={t("Leçons", "Lessons", "Lecciones")[locale]}
              className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
            >
              {unit.lessons.map((l, i) => (
                <button
                  type="button"
                  key={l.id}
                  className={`min-h-16 min-w-40 rounded-lg border p-3 text-left text-sm font-semibold lg:min-w-0 ${lessonIndex === i ? "border-emerald-800 bg-emerald-800 text-white" : "border-gray-200 bg-white"}`}
                  aria-current={lessonIndex === i ? "step" : undefined}
                  onClick={() => chooseLesson(i)}
                >
                  {i + 1}. {l.title[locale]}
                </button>
              ))}
            </nav>
            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
              <button
                type="button"
                className={outline}
                onClick={() => navigate("quiz")}
              >
                {c.quiz}
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => navigate("write")}
              >
                {c.write}
              </button>
              {due.length ? (
                <button type="button" className={outline} onClick={review}>
                  {c.review} · {due.length}
                </button>
              ) : null}
            </div>
          </aside>
          <div className="min-w-0">
            <h2
              ref={heading}
              tabIndex={-1}
              className="mb-4 text-2xl font-bold outline-none"
            >
              {view === "quiz"
                ? unit.quiz.title[locale]
                : view === "write"
                  ? unit.production.title[locale]
                  : lesson.title[locale]}
            </h2>
            {view === "learn" || view === "practice" ? (
              <nav
                className="mb-5 flex flex-wrap gap-2"
                aria-label={lesson.title[locale]}
              >
                <button
                  type="button"
                  aria-pressed={view === "learn"}
                  className={view === "learn" ? button : outline}
                  onClick={() => navigate("learn")}
                >
                  <BookOpen size={17} aria-hidden />
                  {c.learn}
                </button>
                <button
                  type="button"
                  aria-pressed={view === "practice"}
                  className={view === "practice" ? button : outline}
                  onClick={() => navigate("practice")}
                >
                  {c.practice}
                </button>
              </nav>
            ) : null}
            {view === "learn" ? (
              <section key={lesson.id}>
                <nav aria-label={c.learn} className="mb-5 flex flex-wrap gap-2">
                  {panels.map((title, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-current={study === i ? "step" : undefined}
                      className={`min-h-11 rounded-lg px-3 text-xs font-bold ${study === i ? "bg-emerald-100 text-emerald-950" : "bg-white text-gray-700"}`}
                      onClick={() => {
                        window.dispatchEvent(
                          new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT),
                        );
                        setStudy(i);
                      }}
                    >
                      {i + 1}. {title[locale]}
                    </button>
                  ))}
                </nav>
                {study === 0 ? (
                  <div>
                    <p className="text-lg leading-relaxed">
                      {lesson.goal[locale]}
                    </p>
                    {lessonIndex === 0 && unit.cultureStop ? (
                      <>
                        <CourseCulturePhoto
                          photo={unit.cultureStop.photo}
                          locale={locale}
                        />
                        <h3 className="mt-4 text-xl font-bold">
                          {unit.cultureStop.title[locale]}
                        </h3>
                        <p className="mt-3 text-sm leading-7">
                          {unit.cultureStop.body[locale]}
                        </p>
                        <p className="mt-3 text-sm font-bold text-emerald-800">
                          {unit.cultureStop.observation[locale]}
                        </p>
                        <p lang={experience.language} className="mt-4 text-lg">
                          {unit.cultureStop.phrase.it}
                        </p>
                        <ItalianModuleAudio
                          text={unit.cultureStop.phrase.it}
                          locale={locale}
                        />
                        <a
                          href={unit.cultureStop.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 block min-h-11 text-xs underline"
                        >
                          {unit.cultureStop.source.publisher} ·{" "}
                          {unit.cultureStop.source.title}
                        </a>
                      </>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-gray-600">
                        {lesson.speaking.prompt[locale]}
                      </p>
                    )}
                  </div>
                ) : null}
                {study === 1 ? (
                  <RecallCards lesson={lesson} locale={locale} onHelp={help} />
                ) : null}
                {study === 2 ? (
                  <div>
                    <p className="text-base leading-8">
                      {lesson.grammar.body[locale]}
                    </p>
                    {lesson.grammar.examples.map((word) => (
                      <div
                        key={word.it}
                        className="mt-4 border-l-4 border-emerald-300 bg-white p-4"
                      >
                        <p lang={experience.language} className="text-xl font-semibold">
                          {word.it}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          {word.meaning[locale]}
                        </p>
                        <div className="mt-3">
                          <ItalianModuleAudio text={word.it} locale={locale} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {study === 3 ? (
                  <div>
                    <p className="leading-8">
                      {lesson.pronunciation.body[locale]}
                    </p>
                    {lesson.pronunciation.practice.map((text) => (
                      <div
                        key={text}
                        className="mt-4 border-b border-gray-200 py-3"
                      >
                        <p lang={experience.language} className="mb-3 text-xl">
                          {text}
                        </p>
                        <ItalianModuleAudio text={text} locale={locale} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {study === 4 ? (
                  <div>
                    <p lang={experience.language} className="text-xl leading-9">
                      {lesson.reading.it}
                    </p>
                    <div className="mt-4">
                      <ItalianModuleAudio
                        text={lesson.reading.it}
                        locale={locale}
                      />
                    </div>
                    <details className="mt-4">
                      <summary className="min-h-11 cursor-pointer text-sm font-bold">
                        {
                          t(
                            "Voir le sens",
                            "See the meaning",
                            "Ver el significado",
                          )[locale]
                        }
                      </summary>
                      <p className="mt-2 text-sm leading-7">
                        {lesson.reading.meaning[locale]}
                      </p>
                    </details>
                  </div>
                ) : null}
                {study === 5 ? (
                  <div>
                    <p className="leading-8">
                      {lesson.speaking.prompt[locale]}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {lesson.speaking.checklist.map((text, i) => (
                        <li key={i} className="text-sm">
                          {text[locale]}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-gray-600">{c.self}</p>
                  </div>
                ) : null}
                <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className={outline}
                    disabled={study === 0}
                    onClick={() => {
                      window.dispatchEvent(
                        new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT),
                      );
                      setStudy((s) => s - 1);
                    }}
                  >
                    <ArrowLeft size={16} aria-hidden />
                    {c.previous}
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      window.dispatchEvent(
                        new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT),
                      );
                      if (study < 5) setStudy((s) => Math.min(5, s + 1));
                      else navigate("practice");
                    }}
                  >
                    {study === 5 ? c.practice : c.next}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </section>
            ) : null}
            {view === "practice" ? (
              <section>
                <p className="mb-3 text-xs font-bold text-emerald-700">
                  {activityIndex + 1}/{lesson.activities.length}
                </p>
                {activity.id === lesson.readingActivityId ? (
                  <p
                    lang={experience.language}
                    className="mb-5 rounded-lg border border-emerald-200 bg-white p-5 text-lg leading-8"
                  >
                    {lesson.reading.it}
                  </p>
                ) : null}
                <h3 className="text-xl font-bold">{activity.title[locale]}</h3>
                <p className="my-4 leading-relaxed">
                  {activity.prompt[locale]}
                </p>
                <ItalianGame
                  key={`${activity.id}-${epoch}`}
                  activity={activity}
                  locale={locale}
                  onAttempt={attempt}
                  onHelp={help}
                />
                {solved ? (
                  <p
                    role="status"
                    className="mt-5 text-sm font-bold text-emerald-800"
                  >
                    {resultAssisted ? c.assisted : c.independent}
                  </p>
                ) : null}
                <nav
                  className="mt-6 flex flex-wrap justify-between gap-3"
                  aria-label={c.practice}
                >
                  <button
                    type="button"
                    disabled={activityIndex === 0}
                    className={outline}
                    onClick={() => {
                      fresh();
                      setActivityIndex((i) => i - 1);
                    }}
                  >
                    {c.previous}
                  </button>
                  <button type="button" className={outline} onClick={fresh}>
                    <RotateCcw size={16} aria-hidden />
                    {c.replay}
                  </button>
                  <button
                    type="button"
                    disabled={!solved}
                    className={button}
                    onClick={nextActivity}
                  >
                    {c.next}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </nav>
                <button
                  type="button"
                  className="mt-4 min-h-11 text-sm underline text-gray-600"
                  onClick={nextActivity}
                >
                  {
                    t(
                      "Passer sans valider",
                      "Skip without credit",
                      "Saltar sin validar",
                    )[locale]
                  }
                </button>
              </section>
            ) : null}
            {view === "quiz" ? (
              <GermanAssessment
                key={`${unit.quiz.id}-${epoch}-${state.progress.resetAt}`}
                assessment={unit.quiz}
                locale={locale}
                onComplete={state.recordAssessment}
                resultAction={<CourseJourneyAdvance locale={locale} catalog={catalog} progress={state.progress} unitId={unit.id} href={id => experience.href(locale, id)} />}
              />
            ) : null}
            {view === "write" ? (
              <Workshop
                unit={unit}
                locale={locale}
                done={Boolean(state.progress.productions[unit.production.id])}
                onDone={(done) =>
                  state.markProduction(unit.production.id, done)
                }
              />
            ) : null}
            <Link className={`${outline} mt-8`} href={experience.href(locale)}>
              <ArrowLeft size={16} aria-hidden />
              {c.course}
            </Link>
          </div>
        </div>
        {view !== "quiz" ? (
          <ItalianYoppoCoach
            locale={locale}
            contextId={`${unit.id}-${lesson.id}-${view}-${activity.id}-${epoch}`}
            message={view === "practice" ? activity.prompt : lesson.goal}
            hint={view === "practice" ? activity.hint : lesson.grammar.body}
            hint2={view === "practice" ? activity.hint2 : undefined}
            explanation={
              view === "practice" ? activity.explanation : lesson.grammar.body
            }
            example={lesson.vocabulary[0]}
            exampleAudio={
              <ItalianModuleAudio
                text={lesson.vocabulary[0].it}
                locale={locale}
              />
            }
            visualState={solved ? "celebrating" : wrong ? "confused" : "map"}
            completedCount={completed}
            totalCount={all.length}
            reviewCount={due.length}
            canRetry={view === "practice"}
            onAction={(action) => {
              if (action === "hint" || action === "explain") help();
              if (action === "retry") fresh();
              if (action === "review") review();
              if (action === "challenge") {
                fresh();
                setActivityIndex(lesson.activities.length - 1);
                setView("practice");
              }
            }}
          />
        ) : null}
      </GermanCourseShell>
    </ItalianAudioProvider>
  );
}
