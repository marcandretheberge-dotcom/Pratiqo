/**
 * YoPratiqo — Espagnol · Pays · République dominicaine · Découvrir
 *
 * Long-form discovery sub-route for the RD A1 course. Hosts the
 * legacy long-form `<RepubliqueDominicaineContent />` (free intro
 * experience, detailed sections, dictionary, flashcards, quiz,
 * unlock card, feature strip, printables) that used to live
 * directly below the app-like Course Home.
 *
 * Why it lives here
 * -----------------
 *   The Course Home one level up
 *   (`app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx`)
 *   is now a no-scroll YoAppShell screen. Per the
 *   `feat/yopratiqo-no-scroll-app-shell-flow` brief, long-form
 *   content that must stay reachable is moved behind a
 *   lower-priority route. The Course Home exposes a clearly
 *   labeled "Découvrir le cours" / "Discover this course" /
 *   "Descubrir el curso" link that opens this page.
 *
 *   No deep links break — anyone arriving via the legacy
 *   `#yo-intro-experience` anchor is still served the same DOM
 *   here (the anchor is owned by `RepubliqueDominicaineContent`).
 *
 * App-mode chrome
 * ---------------
 *   - sticky `<YoCourseAppHeader />` with a back-link to the
 *     Course Home and a real FR/EN/ES `<YoLanguageSelector />`,
 *   - the long-form content scrolls inside its own page (this
 *     route is intentionally allowed to body-scroll because it
 *     IS the discovery surface — the no-scroll Course Home above
 *     is the primary path).
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Stripe, no Supabase write, no payment
 *     math, no checkout, no migrations, no RLS edits, no audio
 *     generation, no AI summary, no raw quiz exposure. The
 *     `<RepubliqueDominicaineContent />` composer is unchanged.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, getYoLocale } from "@/lib/yo/localize";
import { RepubliqueDominicaineContent } from "@/components/yo/RepubliqueDominicaineContent";
import { YoCourseAppHeader } from "@/components/yo/YoCourseAppHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — Découvrir République dominicaine A1",
  description:
    "Tout le contenu détaillé du parcours République dominicaine A1 : intro libre, dictionnaire, flashcards, quiz, imprimables.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine/decouvrir`,
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoRdDecouvrirPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;

  const backHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/espagnol/pays/republique-dominicaine/decouvrir",
    locale === "fr" ? "en" : "fr",
  );

  return (
    <div
      data-testid="yo-rd-decouvrir"
      data-yo-rd-decouvrir="true"
      className="min-h-[100dvh] bg-[#F4EFE6] text-[#172642]"
    >
      <YoCourseAppHeader
        locale={locale}
        backHref={backHref}
        toggleHref={toggleHref}
      />
      {/* The long-form composer below is the single source of truth
          for the rich educational content (free intro experience,
          dictionary, flashcards, quiz, unlock card, feature strip,
          printables). The duplicate marketing hero and legacy
          lesson-path are opted out — the Course Home one level up
          renders its own focused hero / path. */}
      <div id="yo-intro-experience" className="scroll-mt-20">
        <RepubliqueDominicaineContent
          locale={locale}
          omitHero
          omitLessonPath
        />
      </div>
    </div>
  );
}
