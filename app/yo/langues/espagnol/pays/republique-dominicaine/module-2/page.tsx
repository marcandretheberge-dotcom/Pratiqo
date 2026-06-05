/**
 * YoPratiqo — Espagnol · République dominicaine · Module 2
 * À l'hôtel et à l'aéroport
 *
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-2
 *
 * Premium interactive module — the quality template for all subsequent
 * paid YoPratiqo modules. No checkout, no Stripe, no Supabase, no audio.
 *
 * Locale behaviour:
 *   ?lang=en → English
 *   anything else (or absent) → French (Quebec default)
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale, lstr } from "@/lib/yo/localize";
import { DominicanRepublicModule2Content } from "@/components/yo/DominicanRepublicModule2Content";
import type { YoBreadcrumbItem } from "@/components/yo/YoBreadcrumb";

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

  const langSuffix = locale === "en" ? "?lang=en" : "";

  const breadcrumb: YoBreadcrumbItem[] = [
    { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
    {
      label: lstr("Langues", "Languages"),
      href: `/yo/langues${langSuffix}`,
    },
    {
      label: lstr("Espagnol", "Spanish"),
      href: `/yo/langues/espagnol${langSuffix}`,
    },
    {
      label: lstr("République dominicaine", "Dominican Republic"),
      href: `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`,
    },
    {
      label: lstr("Module 2", "Module 2"),
      // Current page — no href.
    },
  ];

  return (
    <DominicanRepublicModule2Content locale={locale} breadcrumb={breadcrumb} />
  );
}
