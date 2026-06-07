/**
 * YoPratiqo · Espagnol · République dominicaine · Module 5 (A2 capstone)
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-5
 *
 * Premium A2 capstone module: "Imprévus, conversations rapides et
 * mission finale A2". Server-rendered. No checkout, no Stripe, no
 * Supabase, no MP3 files, no Course schema/indexation change.
 * Indexation is opted out via `robots: { index: false, follow: false }`
 * like Modules 2, 3, and 4.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale, lstr } from "@/lib/yo/localize";
import { DominicanRepublicModule5Content } from "@/components/yo/DominicanRepublicModule5Content";
import type { YoBreadcrumbItem } from "@/components/yo/YoBreadcrumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Module 5 — Imprévus, conversations rapides et mission finale A2 (République dominicaine)",
  description:
    "Module 5 — Capstone A2 voyage : gérer les imprévus, comprendre l'espagnol dominicain rapide, lire des messages pratiques, écrire des messages polis et terminer ton voyage avec une mission finale.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-5`,
  },
  openGraph: {
    title:
      "YoPratiqo · Module 5 — Imprévus, conversations rapides et mission finale A2",
    description:
      "Capstone A2 voyage : résoudre les imprévus, comprendre l'espagnol rapide et terminer ton voyage en République dominicaine.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/module-5`,
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

export default async function YoEspagnolRepubliqueDominicaineModule5Page({
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
      label: lstr("Module 5", "Module 5", "Módulo 5"),
    },
  ];

  return (
    <DominicanRepublicModule5Content locale={locale} breadcrumb={breadcrumb} />
  );
}
