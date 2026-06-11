/**
 * YoPratiqo · Espagnol · République dominicaine · Intro (free)
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/intro
 *
 * App-like no-scroll swipe lesson deck for the free Dominican
 * Republic intro. Replaces the in-page `#yo-intro-experience`
 * scroll anchor as the primary entry point into the learning path:
 *
 *   Course Home → Intro deck → Module 2 → Module 3 → Module 4 → Module 5
 *
 * The composition is owned by
 * `<DominicanRepublicIntroContent>` (server component). This route
 * just resolves `?lang=`, sets metadata, and mounts it. Indexation
 * stays opt-out via `robots: { index: false, follow: false }`,
 * matching every other RD module route.
 *
 * Privacy / safety profile
 * ------------------------
 *   - No Stripe / paid checkout. Paid YoPratiqo is OFF in
 *     `lib/yo/yopratiqoProductConfig.ts`.
 *   - No Supabase write, no migrations, no RLS edits, no MP3 /
 *     OpenAI scripts, no AI summary, no raw quiz fields.
 *   - No mark-completed persistence on the final screen — the
 *     audited `dominicanRdModuleProgressPayload(...)` helper does
 *     not currently cover an `intro` / `module-1` row, so we do
 *     NOT fake one. The final screen directs to Module 2.
 *   - BookingModal consent + `<YoStudentCompanionCard>` untouched.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";
import { DominicanRepublicIntroContent } from "@/components/yo/DominicanRepublicIntroContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Intro · Espagnol République dominicaine A1",
  description:
    "Intro gratuite : premières phrases utiles, culture dominicaine, dictionnaire de poche, flashcards et mini-quiz. Format app, sans défilement infini.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/intro`,
  },
  openGraph: {
    title: "YoPratiqo · Intro République dominicaine A1",
    description:
      "Premières phrases utiles, culture locale, flashcards et mini-quiz au format app.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/intro`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoEspagnolRepubliqueDominicaineIntroPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  return <DominicanRepublicIntroContent locale={locale} />;
}
