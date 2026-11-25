"use client";
import { useCourseExperience } from "./CourseExperience";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CourseAssessment } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianGame } from "../italian/ItalianGames";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { assessmentDraftContext, assessmentDraftToken, assessmentDraftScore, assessmentDraftAssisted, createAssessmentDraftStore, type AssessmentDraftContext } from "@/lib/yo/foundations/assessmentDraft";
import { CourseCulturePhoto } from "../italian/course/CourseCulturePhoto";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { t } from "@/lib/yo/german/courseAuthoring";
import { button, outline, copy } from "./GermanCourseShared";

interface GermanAssessmentProps {
  resultAction?: ReactNode;
  assessment: CourseAssessment;
  locale: YoLocale;
  resetAt?: number | null;
  onComplete: (
    id: string,
    correct: number,
    total: number,
    assisted: boolean,
  ) => void;
}

export function GermanAssessment(props: GermanAssessmentProps) {
  const experience = useCourseExperience();
  const context = assessmentDraftContext(experience.progressKey, props.assessment, props.resetAt ?? 0);
  return <GermanAssessmentSession key={`${context.key}:${context.resetAt}:${context.revision}`} {...props} context={context} />;
}

const serverSnapshot = () => null;

function GermanAssessmentSession({ assessment, locale, onComplete, resultAction, context }: GermanAssessmentProps & { context: AssessmentDraftContext }) {
  const experience = useCourseExperience();
  const [store] = useState(() => createAssessmentDraftStore(context));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; stopLessonAudio(); };
  }, []);
  if (!snapshot) return <section data-course-assessment={assessment.id} data-assessment-index={0} data-assessment-started="false" data-assessment-done="false" aria-busy="true" className="py-5">{t("Reprise du bilan…", "Loading your checkpoint…", "Cargando tu balance…")[locale]}</section>;
  const { draft, storageError } = snapshot;
  const { started, index, done } = draft;
  const first = draft.results[index]?.correct ?? null;
  const score = assessmentDraftScore(draft), resultAssisted = assessmentDraftAssisted(draft);
  const token = assessmentDraftToken(draft), c = copy[locale], question = assessment.questions[index];
  const storageMessage = storageError ? <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{t(
    "Le bilan continue sur cette page, mais sa reprise ne peut pas être enregistrée dans ce navigateur. Garde cette page ouverte pour conserver cette tentative.",
    "The checkpoint continues on this page, but this browser cannot save its resume state. Keep the page open to retain this attempt.",
    "El balance continúa en esta página, pero este navegador no puede guardar su reanudación. Mantén la página abierta para conservar este intento.",
  )[locale]}</p> : null;
  function attempt(correct: boolean) {
    if (live.current) store.attempt(token, correct);
  }
  function next() {
    if (!live.current) return;
    stopLessonAudio();
    const result = store.next(token);
    if (result) onComplete(assessment.id, result.correct, result.total, result.assisted);
  }
  function restart() {
    if (!live.current) return;
    stopLessonAudio();
    store.restart();
  }
  if (!started)
    return (
      <section className="py-5" data-course-assessment={assessment.id} data-assessment-index={index} data-assessment-started={started} data-assessment-done={done}>
        {storageMessage}
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
          onClick={() => { stopLessonAudio(); store.start(); }}
        >
          {c.start}
        </button>
      </section>
    );
  if (done)
    return (
      <section className="py-5" aria-live="polite" data-course-assessment={assessment.id} data-assessment-index={index} data-assessment-started={started} data-assessment-done={done}>
        {storageMessage}
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
        {resultAction}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={button} onClick={restart}>
            {c.replay}
          </button>
          <Link prefetch={false} className={outline} href={experience.href(locale)}>
            {c.course}
          </Link>
          {experience.hasCultureFinal && (assessment.id === experience.finalId || ("legacyFinalId" in experience && assessment.id === experience.legacyFinalId)) ? (
            <Link
            prefetch={false}
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
    <section data-course-assessment={assessment.id} data-assessment-index={index} data-assessment-started={started} data-assessment-done={done}>
      {storageMessage}
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
              if (live.current) store.help(token);
            }}
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="mb-5 text-xl font-bold">{question.prompt[locale]}</h2>
          <ItalianGame
            key={`${question.id}-${draft.run}`}
            activity={question}
            locale={locale}
            onAttempt={attempt}
            onHelp={() => {
              if (live.current) store.help(token);
            }}
            typedDraft={question.kind === "type" ? { value: draft.typedText?.value ?? "", initialFeedback: first,
              onCheck: (correct, renderedText) => live.current && store.attempt(token, correct, renderedText),
              onChange: value => { if (live.current) store.text(token, value); } } : undefined}
          />
          {first !== null ? (
            <div className="mt-5 border-t border-gray-200 pt-4" role="status">
              <p className="mb-3 text-sm font-semibold">{first ? t("Première réponse vérifiée conservée : correcte.", "First checked answer kept: correct.", "Primera respuesta comprobada conservada: correcta.")[locale] : t("Première réponse vérifiée conservée : à revoir.", "First checked answer kept: review needed.", "Primera respuesta comprobada conservada: por revisar.")[locale]}</p>
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
            prefetch={false}
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
