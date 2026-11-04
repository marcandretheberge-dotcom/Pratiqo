"use client";

import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, RotateCcw } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import type { LearningJourney as Journey } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { CourseCulturePhoto } from "../italian/course/CourseCulturePhoto";
import { journeyCopy } from "./journeyCopy";

type Props = { catalog: CourseCatalog; progress: CourseProgress; locale: YoLocale; ready: boolean; href: (unitId?: string) => string };
const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

export function CourseJourney({ catalog, progress, locale, ready, href }: Props) {
  const journey = buildCourseJourney(catalog, progress);
  return <LearningJourney journey={journey} locale={locale} ready={ready} href={href} />;
}

export function LearningJourney({ journey, locale, ready, href, copy }: {
  journey: Journey; locale: YoLocale; ready: boolean; href: (unitId?: string) => string;
  copy?: Partial<(typeof journeyCopy)["en"]>;
}) {
  const c = { ...journeyCopy[locale], ...copy };
  return <section aria-label={c.title} className="my-8 min-w-0">
    <div className="border-b border-emerald-200 pb-5">
      <h2 className="text-2xl font-bold text-emerald-950">{c.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">{c.rule}</p>
      <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{ready ? `${journey.passedCount}/${journey.steps.length} · ${c.checkpoints}` : c.loading}</p>
    </div>
    <ol className="relative mx-auto mt-6 max-w-4xl">
      {journey.steps.map((step, index) => {
        const current = ready && step.unit.id === journey.current?.unit.id;
        const open = ready && step.unlocked;
        return <li key={step.unit.id} data-journey-unit={step.unit.id} data-unlocked={open} aria-current={current ? "step" : undefined} className="relative grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-3 pb-8 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-5">
          <div className="relative flex flex-col items-center">
            {index < journey.steps.length - 1 ? <div aria-hidden className={`absolute bottom-[-2rem] top-14 w-1 ${step.passed ? "bg-emerald-500" : "bg-gray-200"}`} /> : null}
            <span aria-label={`${step.unit.number}. ${step.passed ? c.passed : open ? c.enter : c.locked}`} className={`relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 text-lg font-bold ${step.passed ? "border-emerald-700 bg-emerald-700 text-white" : current ? "border-emerald-700 bg-white text-emerald-900" : "border-gray-300 bg-white text-gray-600"}`}>
              {step.passed ? <Check aria-hidden /> : open ? step.unit.number : <LockKeyhole size={19} aria-hidden />}
            </span>
            {current ? <div className="relative z-10 mt-2 motion-safe:animate-[fadeIn_300ms_ease-out]" data-yoppo-position={step.unit.id}><CompanionAvatar visualId="travel" state="map" locale={locale} size="xs" compact /></div> : null}
          </div>
          <article className={`min-w-0 rounded-lg border p-4 sm:p-6 ${current ? "border-emerald-600 bg-emerald-50" : "border-gray-200 bg-white"}`}>
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div className="min-w-0">
                <p className={`text-xs font-bold ${current ? "text-emerald-800" : "text-gray-600"}`}>{current ? c.here : step.passed ? c.passed : open ? c.enter : c.locked}</p>
                <h3 className="mt-2 break-words text-xl font-bold text-gray-900">{step.unit.title[locale]}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-700">{step.unit.objectives[0]?.[locale] ?? step.unit.subtitle[locale]}</p>
                {step.unit.objectives.length > 1 ? <details className="mt-2 text-sm text-gray-700"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{c.goals}</summary><ul className="list-disc space-y-2 pl-5">{step.unit.objectives.slice(1).map((goal, i) => <li key={i}>{goal[locale]}</li>)}</ul></details> : null}
              </div>
              {step.unit.photo ? <div className="hidden sm:block"><CourseCulturePhoto photo={step.unit.photo} locale={locale} compact /></div> : null}
            </div>
            {ready && open ? <>
              <p className="mt-4 text-xs leading-6 text-gray-600">{c.practice} : {step.practiced}/{step.unit.activityIds.length} · {c.independent} : {step.independent}</p>
              <Link href={href(step.unit.id)} className={`${action} mt-4`}>{step.passed ? <RotateCcw size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}{step.passed ? c.replay : c.enter}</Link>
            </> : null}
          </article>
        </li>;
      })}
    </ol>
    <p className="text-xs leading-6 text-gray-600">{c.proof} {c.review}</p>
  </section>;
}

export function CourseJourneyGate({ locale, ready, href }: Pick<Props, "locale" | "ready"> & { href: string }) {
  const c = journeyCopy[locale];
  return <main lang={locale} className="mx-auto min-h-[60vh] max-w-xl px-5 py-12 text-gray-900">
    <CompanionAvatar visualId="travel" state="map" locale={locale} size="md" compact />
    <h1 className="mt-5 text-2xl font-bold">{ready ? c.lockedTitle : c.loading}</h1>
    {ready ? <p className="mt-4 text-base leading-7">{c.lockedBody}</p> : null}
    <Link className={`${action} mt-6`} href={href}>{c.back}<ArrowRight size={17} aria-hidden /></Link>
  </main>;
}

export function CourseJourneyAdvance({ catalog, progress, locale, href, unitId }: Omit<Props, "ready"> & { unitId: string }) {
  const c = journeyCopy[locale];
  const { steps } = buildCourseJourney(catalog, progress);
  const index = steps.findIndex(step => step.unit.id === unitId);
  if (index < 0 || !steps[index].passed) return null;
  const next = steps[index + 1];
  return <section className="my-6 border-y border-emerald-200 py-5" aria-label={c.next}>
    <div className="flex items-center gap-4"><CompanionAvatar visualId="travel" state="celebrating" locale={locale} size="sm" compact /><p className="font-bold text-emerald-900">{next?.unlocked ? c.unlocked : c.passed}</p></div>
    <p className="mt-3 text-sm leading-6 text-gray-700">{c.proof}</p>
    <Link href={next?.unlocked ? href(next.unit.id) : href()} className={`${action} mt-4`}>{next?.unlocked ? `${c.next} · ${next.unit.title[locale]}` : c.map}<ArrowRight size={17} aria-hidden /></Link>
  </section>;
}
