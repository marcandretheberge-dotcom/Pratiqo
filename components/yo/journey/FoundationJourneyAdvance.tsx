"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { foundationJourneyCopy } from "@/lib/yo/foundationJourney";
import { journeyCopy } from "./journeyCopy";

export function FoundationJourneyAdvance({ journey, unitId, locale, href, finalOpen }: {
  journey: LearningJourney; unitId: string; locale: YoLocale; href: (id?: string) => string; finalOpen: boolean;
}) {
  const c = { ...journeyCopy[locale], ...foundationJourneyCopy[locale] };
  const index = journey.steps.findIndex(step => step.unit.id === unitId);
  const step = journey.steps[index];
  const next = journey.steps[index + 1];
  const destination = next?.unlocked ? next.unit.id : step?.passed && finalOpen ? "bilan" : undefined;
  return <section className="border-y border-emerald-200 py-5" aria-label={c.next}>
    <div className="flex items-center gap-3">
      <CompanionAvatar visualId="travel" state={step?.passed ? "celebrating" : "map"} locale={locale} size="sm" compact />
      <p className="font-semibold text-emerald-900">{step?.passed ? c.unlocked : c.pending}</p>
    </div>
    <p className="mt-3 text-sm leading-6 text-gray-700">{c.proof}</p>
    <Link href={href(destination)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white">
      {destination ? c.next : c.map}<ArrowRight size={16} aria-hidden />
    </Link>
  </section>;
}
