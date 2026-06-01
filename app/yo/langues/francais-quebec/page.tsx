import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
import { YoUpcomingModuleCard } from "@/components/yo/YoUpcomingModuleCard";
import { getYoLocale } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import { yopratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";

export const dynamic = "force-dynamic";

// Locale-aware destination for the (noindex) Quebec French / Francisation
// workplace module shell. The three literals are intentional: the spec
// requires explicit `?lang=fr|en|es` (even for the default FR locale) so
// the URL always reads as a fully-qualified locale URL that the language
// switcher inside the shell can mirror back. We keep all three forms in
// the source — never compose them via `?lang=${locale}` only — so the
// discoverability test can pin each literal independently.
const MODULE_HREF_BY_LOCALE: Record<YoLocale, string> = {
  fr: "/yo/langues/francais-quebec/module-1?lang=fr",
  en: "/yo/langues/francais-quebec/module-1?lang=en",
  es: "/yo/langues/francais-quebec/module-1?lang=es",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("frenchQuebecLanding", params.lang);
}

export default async function YoFrenchQuebecLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const moduleHref = MODULE_HREF_BY_LOCALE[locale];

  return (
    <>
      <YoLanguageLandingPage
        locale={locale}
        moduleConfig={getYoPratiqoModuleBySlug("francais-quebec")}
        content={yopratiqoLandingContent["francais-quebec"]}
      />
      {/*
       * Upcoming-module entry-point. Rendered as a sibling section so the
       * shared YoLanguageLandingPage stays untouched and no other module's
       * hub picks up this Quebec-specific pitch by accident. The teacher
       * search link is intentionally omitted here because the landing
       * page above already exposes one in both the hero and the teacher
       * bridge card.
       */}
      <section
        aria-label={
          locale === "es"
            ? "Módulo próximamente"
            : locale === "en"
              ? "Upcoming module"
              : "Module à venir"
        }
        className="bg-[#FAFCFB] text-[#0F6E56]"
      >
        <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <YoUpcomingModuleCard locale={locale} href={moduleHref} />
        </div>
      </section>
    </>
  );
}
