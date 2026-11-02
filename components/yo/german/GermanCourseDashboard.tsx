"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Camera, RotateCcw } from "lucide-react";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { useItalianCourseProgress } from "../italian/course/useItalianCourseProgress";
import { getDueActivityIds } from "@/lib/yo/italian/course/courseProgress";
import {
  GERMAN_PROGRESS_KEY,
  germanCourseHref,
} from "@/lib/yo/german/courseLogic";
import { t } from "@/lib/yo/german/courseAuthoring";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { GermanCourseShell, button, outline, copy } from "./GermanCourseShared";

export function GermanCourseDashboard({
  locale,
  catalog,
  audioReady = false,
}: {
  locale: YoLocale;
  catalog: CourseCatalog;
  audioReady?: boolean;
}) {
  const state = useItalianCourseProgress(catalog, GERMAN_PROGRESS_KEY),
    c = copy[locale];
  const due = getDueActivityIds(state.progress, catalog);
  const dueUnit = catalog.units.find((u) => u.activityIds.includes(due[0]));
  const resume = state.progress.resume;
  const resumeHref = resume
    ? `${germanCourseHref(locale, resume.unitId)}&lesson=${resume.lessonId}${resume.activityId ? `&activity=${resume.activityId}` : ""}`
    : germanCourseHref(locale, "u01");
  return (
    <GermanCourseShell locale={locale}>
      <section className="grid gap-5 border-b border-emerald-100 pb-7 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="text-xs font-bold text-emerald-800">
            DEUTSCH ·{" "}
            {t("PREMIERS PAS", "FIRST STEPS", "PRIMEROS PASOS")[locale]}
          </p>
          <h1 className="mt-3 font-serif text-4xl text-emerald-950 sm:text-5xl">
            {
              t(
                "L’allemand, dans la vraie vie.",
                "German, in real life.",
                "Alemán, en la vida real.",
              )[locale]
            }
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            {
              t(
                "Une rencontre, un café, un train à prendre. Avec Yoppo, trouve les mots pour faire le prochain pas.",
                "A meeting, a coffee, a train to catch. With Yoppo, find the words for your next step.",
                "Un encuentro, un café, un tren por tomar. Con Yoppo, encuentra las palabras para dar el siguiente paso.",
              )[locale]
            }
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={resumeHref} className={button}>
              {resume ? c.resume : c.start}
              <ArrowRight size={17} aria-hidden />
            </Link>
            {dueUnit ? (
              <Link
                className={outline}
                href={`${germanCourseHref(locale, dueUnit.id)}&lesson=${dueUnit.lessons.find((l) => l.activityIds.includes(due[0]))?.id}&activity=${due[0]}`}
              >
                <RotateCcw size={16} aria-hidden />
                {c.review} · {due.length}
              </Link>
            ) : null}
            <CompanionAvatar
              visualId="travel"
              state="map"
              locale={locale}
              size="sm"
              compact
            />
          </div>
          <p className="mt-4 text-xs text-gray-600" role="status">
            {state.ready && !state.storageAvailable ? c.blocked : c.local}
          </p>
        </div>
        <div className="min-w-0 self-center">
          <Image
            src="/images/yo/german/berlin.webp"
            alt={
              t(
                "Porte de Brandebourg à Berlin",
                "Brandenburg Gate in Berlin",
                "Puerta de Brandeburgo en Berlín",
              )[locale]
            }
            width={1200}
            height={800}
            sizes="(max-width:768px) 100vw, 280px"
            className="h-auto w-full rounded-lg"
          />
          <p className="mt-2 text-xs text-gray-600">
            Pierre-Selim Huard ·{" "}
            <a
              href="https://commons.wikimedia.org/?curid=40351258"
              className="underline"
            >
              {c.source}
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline"
            >
              CC BY 4.0
            </a>
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
        <ol className="mt-5 grid gap-4 md:grid-cols-2">
          {catalog.units.map((unit) => {
            const done = unit.activityIds.filter(
              (id) => state.progress.activities[id]?.completed,
            ).length;
            return (
              <li key={unit.id} className="min-w-0">
                <Link
                  href={germanCourseHref(locale, unit.id)}
                  className="block h-full rounded-lg border border-gray-200 bg-white p-5 transition hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-700"
                >
                  <span className="text-xs font-bold text-emerald-700">
                    {String(unit.number).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">
                    {unit.title[locale]}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {unit.objectives.map((o) => o[locale]).join(" · ")}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-600">
                    <span>
                      {done}/{unit.activityIds.length} · {c.done}
                    </span>
                    <ArrowRight size={17} aria-hidden />
                  </div>
                  <progress
                    aria-label={unit.title[locale]}
                    value={done}
                    max={unit.activityIds.length}
                    className="mt-3 h-2 w-full accent-emerald-700"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="mt-8 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2">
        {catalog.assessments
          .filter((a) => a.id === "de1-final" || a.theme === "culture")
          .map((a) => (
            <Link
              key={a.id}
              href={germanCourseHref(
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
          ))}
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
