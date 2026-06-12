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
 *   is the no-scroll app surface (3 button-driven steps on
 *   mobile, 3-pane workspace on desktop). Long-form content that
 *   must stay reachable is moved behind this lower-priority
 *   route. The Course Home exposes a clearly labelled "Découvrir
 *   le cours" / "Discover this course" / "Descubrir el curso"
 *   link that opens this page.
 *
 *   No deep links break — anyone arriving via the legacy
 *   `#yo-intro-experience` anchor is still served the same DOM
 *   here (the anchor is owned by `RepubliqueDominicaineContent`).
 *
 * Shell strategy
 * --------------
 *   • Mobile (`<lg`) — the discovery content is mounted as a
 *     SINGLE step inside `<YoMobileAppStepShell>`. The step
 *     navigator gives the learner a permanent bottom chrome
 *     with a clear "Continue · Course Home" Done button, so
 *     they're never stranded at the bottom of the long-form
 *     content with no way back. The step's stage uses its own
 *     `overflow-y-auto` so the natural long-form scroll inside
 *     the discovery surface still works — only the document
 *     body stays locked.
 *   • Desktop (`lg:`) — this is intentionally the one
 *     learner-facing route where vertical reading is the
 *     desired pattern (discovery / culture / dictionary / quiz
 *     all reward a continuous read). The desktop sub-tree
 *     therefore keeps the legacy long-form layout, with the
 *     same `<YoCourseAppHeader>` chrome the Course Home above
 *     uses.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Stripe, no auth-backend write, no
 *     payment math, no checkout, no migrations, no RLS edits,
 *     no audio generation, no AI summary, no raw quiz
 *     exposure. The `<RepubliqueDominicaineContent />` composer
 *     is unchanged.
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { RepubliqueDominicaineContent } from "@/components/yo/RepubliqueDominicaineContent";
import { YoCourseAppHeader } from "@/components/yo/YoCourseAppHeader";
import { YoMobileAppStepShell } from "@/components/yo/YoMobileAppStepShell";

const DISCOVER_LABEL = lstr(
  "Découvrir le cours",
  "Discover the course",
  "Descubrir el curso",
);
const BACK_TO_COURSE = lstr(
  "Retour au cours",
  "Back to course",
  "Volver al curso",
);
const CONTINUE_COURSE = lstr(
  "Continuer · Accueil du cours",
  "Continue · Course Home",
  "Continuar · Inicio del curso",
);

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

  const longFormBody = (
    <div id="yo-intro-experience" className="scroll-mt-20">
      <RepubliqueDominicaineContent
        locale={locale}
        omitHero
        omitLessonPath
      />
    </div>
  );

  return (
    <div
      data-testid="yo-rd-decouvrir"
      data-yo-rd-decouvrir="true"
      className="text-[#172642]"
    >
      {/* Mobile (<lg): single-step app shell. The step's stage
          scrolls the discovery content while the bottom chrome
          stays pinned, so the learner always has a clear
          "Continue · Course Home" exit one tap away. */}
      <YoMobileAppStepShell
        surfaceId="rd-decouvrir"
        locale={locale}
        background="bg-[#F4EFE6]"
        header={
          <YoCourseAppHeader
            locale={locale}
            backHref={backHref}
            toggleHref={toggleHref}
          />
        }
        rootBackHref={backHref}
        rootBackLabel={t(BACK_TO_COURSE, locale)}
        lastStepNextHref={backHref}
        lastStepNextLabel={t(CONTINUE_COURSE, locale)}
        stepsAriaLabel={t(DISCOVER_LABEL, locale)}
        steps={[
          {
            id: "discovery",
            label: t(DISCOVER_LABEL, locale),
            // The single mobile step renders the full long-form
            // body inside the step navigator's scrollable stage.
            // A future iteration may split this into 3 steps
            // (Why this country / Culture deep-dive / Continue
            // learning), but that requires a per-section opt-in
            // API on `<RepubliqueDominicaineContent />` and is
            // deferred so the audio + quiz composers stay
            // untouched in this pass.
            content: longFormBody,
          },
        ]}
      />

      {/* Desktop (lg+): long-form discovery surface. This is the
          one learner-facing route where vertical reading is the
          intended UX, so we keep the legacy layout instead of
          forcing it into a workspace grid. */}
      <div className="hidden min-h-[100dvh] bg-[#F4EFE6] lg:block">
        <YoCourseAppHeader
          locale={locale}
          backHref={backHref}
          toggleHref={toggleHref}
        />
        {longFormBody}
      </div>
    </div>
  );
}
