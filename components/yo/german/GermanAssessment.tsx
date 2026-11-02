"use client";
import { useCourseExperience } from "./CourseExperience";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CourseAssessment } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianGame } from "../italian/ItalianGames";
import { ITALIAN_MODULE_AUDIO_STOP_EVENT } from "../italian/ItalianModuleAudio";
import { CourseCulturePhoto } from "../italian/course/CourseCulturePhoto";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { t } from "@/lib/yo/german/courseAuthoring";
import { button, outline, copy } from "./GermanCourseShared";

export function GermanAssessment({
  assessment,
  locale,
  onComplete,
}: {
  assessment: CourseAssessment;
  locale: YoLocale;
  onComplete: (
    id: string,
    correct: number,
    total: number,
    assisted: boolean,
  ) => void;
}) {
  const experience = useCourseExperience();
  const [started, setStarted] = useState(false),
    [index, setIndex] = useState(0),
    [first, setFirst] = useState<boolean | null>(null),
    [score, setScore] = useState(0),
    [done, setDone] = useState(false),
    [epoch, setEpoch] = useState(0);
  const attempted = useRef(false),
    assisted = useRef(false),
    saved = useRef(false);
  const [resultAssisted, setResultAssisted] = useState(false);
  const c = copy[locale],
    question = assessment.questions[index];
  function stop() {
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
  }
  function attempt(correct: boolean) {
    if (attempted.current) return;
    attempted.current = true;
    setFirst(correct);
    if (correct) setScore((s) => s + 1);
  }
  function next() {
    if (!attempted.current || saved.current) return;
    attempted.current = false;
    stop();
    if (index + 1 === assessment.questions.length) {
      saved.current = true;
      setResultAssisted(assisted.current);
      onComplete(
        assessment.id,
        score,
        assessment.questions.length,
        assisted.current,
      );
      setDone(true);
    } else {
      setFirst(null);
      setIndex((i) => i + 1);
    }
  }
  function restart() {
    stop();
    attempted.current = false;
    assisted.current = false;
    saved.current = false;
    setIndex(0);
    setFirst(null);
    setScore(0);
    setDone(false);
    setEpoch((e) => e + 1);
  }
  if (!started)
    return (
      <section className="py-5">
        <CompanionAvatar
          visualId="travel"
          state="map"
          locale={locale}
          size="sm"
          compact
        />
        <h2 className="mt-3 font-serif text-3xl">{assessment.title[locale]}</h2>
        <p className="mt-4 max-w-xl leading-relaxed text-gray-600">
          {assessment.description[locale]}
        </p>
        <p className="mt-3 text-sm">
          {
            t(
              "La première réponse vérifiée compte. Les erreurs sont expliquées, puis tu peux recommencer.",
              "Your first checked answer counts. Mistakes are explained; you can try again afterwards.",
              "Cuenta la primera respuesta comprobada. Se explican los errores y luego puedes repetir.",
            )[locale]
          }
        </p>
        <button
          type="button"
          className={`${button} mt-6`}
          onClick={() => setStarted(true)}
        >
          {c.start}
        </button>
      </section>
    );
  if (done)
    return (
      <section className="py-5" aria-live="polite">
        <CompanionAvatar
          visualId="travel"
          state="celebrating"
          locale={locale}
          size="sm"
          compact
        />
        <h2 className="mt-4 text-3xl font-bold">
          {score}/{assessment.questions.length}
        </h2>
        <p className="mt-3">
          {resultAssisted ? c.assisted : c.independent} ·{" "}
          {Math.round((score / assessment.questions.length) * 100)}%
        </p>
        <p className="mt-4 text-sm text-gray-600">
          {
            t(
              "Les réponses à revoir sont une piste de pratique, pas un échec. Objectif de ce bilan : 80 %.",
              "Missed answers are a practice guide, not a failure. This checkpoint’s target: 80%.",
              "Los errores orientan tu práctica, no son un fracaso. Objetivo de este repaso: 80 %.",
            )[locale]
          }
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={button} onClick={restart}>
            {c.replay}
          </button>
          <Link className={outline} href={experience.href(locale)}>
            {c.course}
          </Link>
          {assessment.id === experience.finalId ? (
            <Link
              className={outline}
              href={experience.href(locale, "culture")}
            >
              {
                t(
                  "La finale culturelle",
                  "The culture finale",
                  "La final cultural",
                )[locale]
              }
            </Link>
          ) : null}
        </div>
      </section>
    );
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <CompanionAvatar
          visualId="travel"
          state={first === true ? "celebrating" : "map"}
          locale={locale}
          size="xs"
          compact
        />
        <p className="text-sm font-bold">
          {index + 1}/{assessment.questions.length} · {assessment.title[locale]}
        </p>
      </div>
      <div
        className={
          question.photo ? "grid min-w-0 gap-6 lg:grid-cols-2" : "max-w-2xl"
        }
      >
        {question.photo ? (
          <CourseCulturePhoto
            photo={question.photo}
            locale={locale}
            reveal={first !== null}
            onSource={() => {
              if (!attempted.current) assisted.current = true;
            }}
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="mb-5 text-xl font-bold">{question.prompt[locale]}</h2>
          <ItalianGame
            key={`${question.id}-${epoch}`}
            activity={question}
            locale={locale}
            onAttempt={attempt}
            onHelp={() => {
              if (!attempted.current) assisted.current = true;
            }}
          />
          {first !== null ? (
            <div className="mt-5 border-t border-gray-200 pt-4" role="status">
              {question.kind === "type" ||
              !question.options.every(
                (option) =>
                  option.feedback[locale] === question.explanation[locale],
              ) ? (
                <p className="text-sm leading-relaxed">
                  {question.explanation[locale]}
                </p>
              ) : null}
              {question.kind === "type" ? (
                <p className="mt-2 font-bold" lang={experience.language}>
                  {question.model}
                </p>
              ) : null}
              {question.taughtInUnitId ? (
                <Link
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-emerald-800 underline"
                  href={experience.href(locale, question.taughtInUnitId)}
                >
                  {c.review}
                </Link>
              ) : null}
              <button
                type="button"
                className={`${button} mt-4 w-full`}
                onClick={next}
              >
                {c.next}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
