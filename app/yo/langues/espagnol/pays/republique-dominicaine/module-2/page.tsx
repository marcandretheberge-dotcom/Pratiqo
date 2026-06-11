/**
 * YoPratiqo — Espagnol · République dominicaine · Module 2
 * À l'hôtel et à l'aéroport
 *
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-2
 *
 * Premium app-like lesson deck — the polished reference for all
 * subsequent paid YoPratiqo modules. No checkout, no payment
 * library, no Supabase write from this page, no MP3s. The
 * surface is now a one-screen-at-a-time deck powered by
 * `<YoLessonDeck />`. The legacy long-scroll renderer remains
 * available via `mode="long-scroll"` for any consumer that still
 * needs it.
 *
 * Locale behaviour:
 *   ?lang=en → English
 *   ?lang=es → Spanish
 *   anything else (or absent) → French (Quebec default)
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";
import { DominicanRepublicModule2Content } from "@/components/yo/DominicanRepublicModule2Content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — À l'hôtel et à l'aéroport · République dominicaine",
  description:
    "Module 2 — Arriver, s'orienter, faire le check-in et gérer les premiers imprévus en espagnol dominicain. 15 phrases, 2 dialogues, flashcards et mini-mission.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-2`,
  },
  openGraph: {
    title: "YoPratiqo · Module 2 — À l'hôtel et à l'aéroport",
    description:
      "Espagnol pratique pour le voyage en République dominicaine. Aéroport, taxi, check-in, wifi.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-2`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoEspagnolRepubliqueDominicaineModule2Page({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  // The deck renders its own app-style top bar (one back arrow
  // back to the country course home + FR/EN toggle), so we no
  // longer pass a 5-level breadcrumb here. The legacy long-
  // scroll mode keeps working when other surfaces opt in via
  // `mode="long-scroll"` and pass a breadcrumb of their own.
  return <DominicanRepublicModule2Content locale={locale} mode="deck" />;
}
