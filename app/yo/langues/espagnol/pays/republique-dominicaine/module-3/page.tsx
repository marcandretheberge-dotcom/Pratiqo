/**
 * YoPratiqo — Espagnol · République dominicaine · Module 3
 * Food, ordering, payment and culture
 *
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-3
 *
 * Premium app-like lesson deck (same shape as Module 2). No
 * checkout, no Stripe, no Supabase write from this page, no
 * MP3s, no AI summary. The surface is a one-screen-at-a-time
 * deck powered by `<YoLessonDeck />`. The legacy long-scroll
 * renderer remains available via `mode="long-scroll"` for any
 * consumer that still needs it (the existing curriculum,
 * premium, and quiz-UX tests still exercise that path).
 *
 * Locale behaviour:
 *   ?lang=en → English
 *   ?lang=es → Spanish
 *   anything else (or absent) → French (Quebec default)
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";
import { DominicanRepublicModule3Content } from "@/components/yo/DominicanRepublicModule3Content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Module 3 — Manger, commander et payer comme un local",
  description:
    "Module 3 — Plats dominicains, boissons, phrases de commande, paiement, colmado, musique, lieux culturels et defi culture dominicaine.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-3`,
  },
  openGraph: {
    title: "YoPratiqo · Module 3 — Culture alimentaire dominicaine",
    description:
      "Manger, commander et payer comme un local avec des phrases utiles et des reperes culturels dominicains.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-3`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoEspagnolRepubliqueDominicaineModule3Page({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  // The deck renders its own app-style top bar (one back arrow
  // back to the country course home + FR/EN toggle), so we no
  // longer pass a 5-level breadcrumb here. The legacy long-
  // scroll mode keeps working when other surfaces opt in via
  // `mode="long-scroll"` and pass a breadcrumb of their own.
  return <DominicanRepublicModule3Content locale={locale} mode="deck" />;
}
