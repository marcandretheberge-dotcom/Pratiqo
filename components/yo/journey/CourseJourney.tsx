"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import type { LearningJourney as Journey } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { journeyCopy } from "./journeyCopy";
import { adventureWorld } from "@/lib/yo/adventure";
import { journeyMap } from "@/lib/yo/worldMap";
import { WorldJourneyMap } from "./map/WorldJourneyMap";
import { CourseAdventure } from "./AdventureProgress";

type Props = { catalog: CourseCatalog; progress: CourseProgress; locale: YoLocale; ready: boolean; href: (unitId?: string) => string };
const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

export function CourseJourney({ catalog, progress, locale, ready, href }: Props) {
  const journey = buildCourseJourney(catalog, progress);
  return <><CourseAdventure catalog={catalog} progress={progress} locale={locale} ready={ready} href={href()} /><LearningJourney journey={journey} locale={locale} ready={ready} href={href} /></>;
}

export function LearningJourney({ journey, locale, ready, href, copy }: {
  journey: Journey; locale: YoLocale; ready: boolean; href: (unitId?: string) => string;
  copy?: Partial<(typeof journeyCopy)["en"]>;
}) {
  const c = { ...journeyCopy[locale], ...copy };
  const world = adventureWorld(href());
  const model = journeyMap(journey, world, href().split("?")[0]);
  return <section aria-label={c.title} className="my-8 min-w-0">
    <WorldJourneyMap model={model} locale={locale} ready={ready} href={id => href(id)}/>
    <details className="mt-4 text-sm leading-6 text-gray-700"><summary className="min-h-11 cursor-pointer py-3">{c.goals}</summary><p>{c.rule}</p><p>{c.proof} {c.review}</p></details>
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
