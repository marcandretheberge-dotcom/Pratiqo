/**
 * YoPratiqo · Espagnol · République dominicaine · Module 4
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-4
 *
 * Premium "Getting around and exploring" module (A1+ → early A2 bridge).
 * Server-rendered. No checkout, no Stripe, no Supabase, no audio files,
 * no Course schema/indexation change. Indexation is opted out via
 * `robots: { index: false, follow: false }` like Modules 2 and 3.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale, lstr } from "@/lib/yo/localize";
import { DominicanRepublicModule4Content } from "@/components/yo/DominicanRepublicModule4Content";
import type { YoBreadcrumbItem } from "@/components/yo/YoBreadcrumb";

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

function suffixFor(locale: "fr" | "en" | "es"): string {
  return locale === "fr" ? "" : `?lang=${locale}`;
}

export default async function YoEspagnolRepubliqueDominicaineModule4Page({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = suffixFor(locale);

  const breadcrumb: YoBreadcrumbItem[] = [
    { label: lstr("YoPratiqo", "YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
    {
      label: lstr("Langues", "Languages", "Idiomas"),
      href: `/yo/langues${langSuffix}`,
    },
    {
      label: lstr("Espagnol", "Spanish", "Español"),
      href: `/yo/langues/espagnol${langSuffix}`,
    },
    {
      label: lstr(
        "République dominicaine",
        "Dominican Republic",
        "República Dominicana",
      ),
      href: `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`,
    },
    {
      label: lstr("Module 4", "Module 4", "Módulo 4"),
    },
  ];

  return (
    <DominicanRepublicModule4Content locale={locale} breadcrumb={breadcrumb} />
  );
}
