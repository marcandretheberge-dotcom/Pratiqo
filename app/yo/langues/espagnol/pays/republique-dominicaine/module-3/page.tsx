/**
 * YoPratiqo - Espagnol - Republique dominicaine - Module 3
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-3
 *
 * Premium food and culture module. No checkout, no Stripe, no Supabase,
 * no audio files, no Course schema/indexation change.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale, lstr } from "@/lib/yo/localize";
import { DominicanRepublicModule3Content } from "@/components/yo/DominicanRepublicModule3Content";
import type { YoBreadcrumbItem } from "@/components/yo/YoBreadcrumb";

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

function suffixFor(locale: "fr" | "en" | "es"): string {
  return locale === "fr" ? "" : `?lang=${locale}`;
}

export default async function YoEspagnolRepubliqueDominicaineModule3Page({
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
      label: lstr("Republique dominicaine", "Dominican Republic", "República Dominicana"),
      href: `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`,
    },
    {
      label: lstr("Module 3", "Module 3", "Módulo 3"),
    },
  ];

  return (
    <DominicanRepublicModule3Content locale={locale} breadcrumb={breadcrumb} />
  );
}
