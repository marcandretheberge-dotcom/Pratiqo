/**
 * YoPratiqo — Espagnol République dominicaine A1 (legacy Voyage-section route)
 *
 * Original product URL for the RD module. Kept alive on purpose so any
 * earlier shared link, marketing draft or external mention continues to
 * resolve. The shared composition lives in
 * `components/yo/RepubliqueDominicaineContent.tsx` and is reused by the
 * new information architecture at
 * `/yo/langues/espagnol/pays/republique-dominicaine`.
 *
 * Locale behaviour:
 *   /yo/voyage/republique-dominicaine            → French (default)
 *   /yo/voyage/republique-dominicaine?lang=en    → English
 *   /yo/voyage/republique-dominicaine?lang=fr    → French (explicit)
 *
 * No Supabase, no Stripe, no payment math, no checkout, no marketplace.
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";
import { RepubliqueDominicaineContent } from "@/components/yo/RepubliqueDominicaineContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Espagnol République dominicaine A1",
  description:
    "Apprends à vraiment parler sur place avec culture, expressions locales et missions réelles. Niveau A1 débutant, $24,99 CAD.",
  alternates: {
    canonical: `${SITE_URL}/yo/voyage/republique-dominicaine`,
  },
  openGraph: {
    title: "YoPratiqo — République dominicaine A1",
    description:
      "Espagnol pratique, culture dominicaine et expressions locales. $24,99 CAD.",
    type: "website",
    url: `${SITE_URL}/yo/voyage/republique-dominicaine`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoVoyageRepubliqueDominicainePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  // Legacy route: no breadcrumb (this URL pre-dates the
  // YoPratiqo → Langues → Espagnol → République dominicaine IA).
  return <RepubliqueDominicaineContent locale={locale} />;
}
