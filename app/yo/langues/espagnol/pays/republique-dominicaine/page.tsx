/**
 * Yo Pratiqo — Espagnol · Pays · République dominicaine A1
 *
 * Canonical position of the RD A1 module inside the new YoPratiqo
 * information architecture:
 *
 *   YoPratiqo → Langues → Espagnol → République dominicaine
 *
 * Renders the same composition as the legacy
 * `/yo/voyage/republique-dominicaine` page (via
 * `RepubliqueDominicaineContent`) so there is no content drift between
 * the two URLs. Adds a breadcrumb on top so users can navigate back up
 * the IA tree.
 *
 * Locale behaviour:
 *   ?lang=en → English
 *   anything else (or absent) → French
 *
 * No Supabase, no Stripe, no payment math, no checkout, no marketplace.
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale, lstr } from "@/lib/yo/localize";
import { RepubliqueDominicaineContent } from "@/components/yo/RepubliqueDominicaineContent";
import type { YoBreadcrumbItem } from "@/components/yo/YoBreadcrumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "Yo Pratiqo — Espagnol République dominicaine A1",
  description:
    "Apprends l’espagnol dominicain avec culture, expressions locales et missions réelles. Niveau A1 débutant, $24,99 CAD, accès à vie.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
  },
  openGraph: {
    title: "Yo Pratiqo — République dominicaine A1",
    description:
      "Espagnol pratique, culture dominicaine et expressions locales. $24,99 CAD, accès à vie.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoEspagnolRepubliqueDominicainePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  // Breadcrumb routes follow the canonical FR-default rule: FR uses the
  // bare path, EN appends `?lang=en` so the trail keeps the user in the
  // same language while clicking back up.
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
      // Current page — no href.
    },
  ];

  return (
    <RepubliqueDominicaineContent locale={locale} breadcrumb={breadcrumb} />
  );
}
