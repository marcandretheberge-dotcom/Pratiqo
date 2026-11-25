"use client";
import { useCourseExperience } from "./CourseExperience";
import Link from "next/link";
import { CourseCulturePhoto } from "../italian/course/CourseCulturePhoto";
import { ArrowRight, BookOpen, Camera, RotateCcw } from "lucide-react";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { useItalianCourseProgress } from "../italian/course/useItalianCourseProgress";
import { getDueActivityIds } from "@/lib/yo/italian/course/courseProgress";
import { t } from "@/lib/yo/german/courseAuthoring";
import { GermanCourseShell, outline, copy } from "./GermanCourseShared";
import { CourseJourney } from "../journey/CourseJourney";
import { canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import { journeyCopy } from "../journey/journeyCopy";

export function GermanCourseDashboard({
  locale,
  catalog,
  audioReady = false,
}: {
  locale: YoLocale;
  catalog: CourseCatalog;
  audioReady?: boolean;
}) {
  const experience = useCourseExperience();
  const state = useItalianCourseProgress(catalog, experience.progressKey),
    c = copy[locale];
  const due = getDueActivityIds(state.progress, catalog);
  const dueUnit = catalog.units.find((u) => u.activityIds.includes(due[0]));
  const resume = state.progress.resume;
  const photo = catalog.units.find(unit => unit.photo)?.photo;
  const courseHref = (id?: string) => id && resume?.unitId === id
    ? `${experience.href(locale, id)}&lesson=${resume.lessonId}${resume.activityId ? `&activity=${resume.activityId}` : ""}`
    : experience.href(locale, id);
  return (
    <GermanCourseShell locale={locale}>
      <section className="border-b border-emerald-100 pb-4">
        <div>
          <p className="text-xs font-bold text-emerald-800">
            {experience.name.toUpperCase()} ·{" "}
            {t("PREMIERS PAS", "FIRST STEPS", "PRIMEROS PASOS")[locale]}
          </p>
          <h1 className="mt-3 font-serif text-3xl text-emerald-950">
            {experience.title[locale]}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            {experience.description[locale]}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {dueUnit ? (
              <Link
                className={outline}
                href={`${experience.href(locale, dueUnit.id)}&lesson=${dueUnit.lessons.find((l) => l.activityIds.includes(due[0]))?.id}&activity=${due[0]}`}
              >
                <RotateCcw size={16} aria-hidden />
                {c.review} · {due.length}
              </Link>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-gray-600" role="status">
            {state.ready && !state.storageAvailable ? c.blocked : c.local}
          </p>
        </div>
      </section>
      {!audioReady ? (
        <p
          role="status"
          className="my-5 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950"
        >
          {c.audio}
        </p>
      ) : null}
      <section className="mt-7">
        <h2 className="text-xl font-bold">{c.course}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {catalog.units.length} {t("étapes", "stops", "etapas")[locale]} ·{" "}
          {catalog.units.reduce((n, u) => n + u.lessons.length, 0)}{" "}
          {t("leçons", "lessons", "lecciones")[locale]} ·{" "}
          {catalog.units.reduce((n, u) => n + u.activityIds.length, 0)}{" "}
          {t("activités", "activities", "actividades")[locale]}
        </p>
        <CourseJourney locale={locale} catalog={catalog} progress={state.progress} ready={state.ready} href={courseHref} />
      </section>
      {photo ? <div className="my-6 max-w-md"><CourseCulturePhoto photo={photo} locale={locale} /></div> : null}
      <section className="mt-8 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2">
        {catalog.assessments
          .filter((a) => a.id === experience.finalId || a.theme === "culture")
          .map((a) => state.ready && canEnterCourseAssessment(catalog, state.progress, a.id) ? (
            <Link
              key={a.id}
              href={experience.href(
                locale,
                a.theme === "culture" ? "culture" : "final",
              )}
              className="flex min-w-0 items-center gap-4 rounded-lg border border-emerald-200 bg-white p-5"
            >
              {a.theme === "culture" ? (
                <Camera className="shrink-0 text-rose-700" aria-hidden />
              ) : (
                <BookOpen className="shrink-0 text-emerald-700" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block font-bold">{a.title[locale]}</span>
                <span className="mt-1 block text-xs text-gray-600">
                  {a.questionCount}{" "}
                  {
                    t(
                      "questions · à ton rythme",
                      "questions · at your pace",
                      "preguntas · a tu ritmo",
                    )[locale]
                  }
                  {state.progress.assessments[a.id]
                    ? ` · ${state.progress.assessments[a.id].last.correct}/${a.questionCount}`
                    : ""}
                </span>
              </span>
              <ArrowRight size={17} className="ml-auto shrink-0" aria-hidden />
            </Link>
          ) : <div key={a.id} className="border-b border-gray-200 p-5"><h3 className="font-bold">{a.title[locale]}</h3><p className="mt-2 text-sm">{journeyCopy[locale].pending}</p></div>)}
      </section>
      <button
        type="button"
        className="mt-8 min-h-11 text-xs text-gray-600 underline"
        onClick={() => {
          if (window.confirm(c.confirm)) state.reset();
        }}
      >
        {c.reset}
      </button>
    </GermanCourseShell>
  );
}
