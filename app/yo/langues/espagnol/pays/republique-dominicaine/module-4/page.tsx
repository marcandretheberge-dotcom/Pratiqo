/**
 * YoPratiqo · Espagnol · République dominicaine · Module 4
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-4
 *
 * Premium "Getting around and exploring" module (A1+ → early A2 bridge).
 *
 * Server-rendered shell that opts the learner into the no-scroll swipe
 * lesson deck (same pattern as Modules 2 and 3). The deck owns the
 * primary navigation surface, so this route does NOT render the legacy
 * top breadcrumb chain — the deck header has its own back arrow that
 * points to the country course home.
 *
 * Safety profile (unchanged from the long-scroll version):
 *   - No checkout, no Stripe, no Supabase write, no audio files,
 *     no Course schema / indexation change.
 *   - Indexation stays opted out via `robots: { index: false, follow: false }`.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";
import { DominicanRepublicModule4Content } from "@/components/yo/DominicanRepublicModule4Content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Module 4 — Se déplacer et explorer en République dominicaine",
  description:
    "Module 4 — Demander son chemin, prendre la guagua ou un taxi, comprendre les directions, raconter une excursion. Lectures espagnoles courtes et phrases utiles au passé.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-4`,
  },
  openGraph: {
    title: "YoPratiqo · Module 4 — Se déplacer et explorer",
    description:
      "Bouger en République dominicaine, demander son chemin et raconter une petite aventure en espagnol (A1+ vers A2).",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-4`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoEspagnolRepubliqueDominicaineModule4Page({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  return <DominicanRepublicModule4Content locale={locale} mode="deck" />;
}
