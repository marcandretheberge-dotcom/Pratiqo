/**
 * YoPratiqo — legacy Voyage route for the Dominican Republic course.
 *
 * The canonical URL for the Dominican Republic A1 course is now
 * `/yo/langues/espagnol/pays/republique-dominicaine` (the new
 * YoPratiqo information architecture: YoPratiqo → Langues →
 * Espagnol → République dominicaine). The original
 * `/yo/voyage/republique-dominicaine` URL is preserved for back-
 * compat with older shared links / marketing references, but
 * permanently forwards the learner to the canonical Course Home.
 *
 * The long-form cultural discovery copy that used to live on
 * this route is now mounted as a sub-route at
 * `/yo/langues/espagnol/pays/republique-dominicaine/decouvrir`
 * (linked from the Course Home's "Details" step) — that's where
 * `RepubliqueDominicaineContent` is rendered today.
 *
 * Why a redirect instead of a stretched-mobile page
 * -------------------------------------------------
 * The old long-scroll route was the last remaining
 * `min-h-[100dvh]` body-scroll surface in the `/yo` IA. By
 * redirecting it we cut a stretched-mobile experience entirely
 * and route every learner into the new step-shell Course Home
 * (button-driven Back/Next chrome on phones, three-pane
 * product workspace on desktop).
 *
 * Locale propagation
 * ------------------
 * The `?lang=` query string is preserved so the canonical
 * Course Home renders the same language the learner originally
 * requested.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Supabase, no Stripe, no payment
 *     math, no checkout, no marketplace. No fake claims.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SITE_URL } from "@/lib/seo/site";
import { getYoLocale } from "@/lib/yo/localize";

export const dynamic = "force-dynamic";

// Keep the canonical URL pointing at the new IA so crawlers
// pick up the move. `robots.index: false` is preserved as a
// belt-and-suspenders signal — the redirect itself is the
// primary instruction to search engines.
export const metadata: Metadata = {
  title: "YoPratiqo — Espagnol République dominicaine A1",
  description:
    "Ce parcours a déménagé. Tu seras redirigé·e vers l’espace République dominicaine de YoPratiqo.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoVoyageRepubliqueDominicainePage({
  searchParams,
}: PageProps) {
  const resolved = await searchParams;
  const locale = getYoLocale(resolved.lang);
  // Preserve the user-facing locale so the destination Course
  // Home renders in the same language they originally requested.
  // `redirect()` from `next/navigation` ships a 307 by default;
  // explicitly use a permanent redirect so crawlers update their
  // canonical references.
  const target =
    locale === "fr"
      ? "/yo/langues/espagnol/pays/republique-dominicaine"
      : `/yo/langues/espagnol/pays/republique-dominicaine?lang=${locale}`;
  redirect(target);
}
