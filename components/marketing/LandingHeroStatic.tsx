import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { LandingHeadline } from "./LandingHeadline";

/**
 * Server-rendered hero copy so the main H1 is in the initial HTML (faster LCP than client-only).
 * Parent must pass `locale` from await getLocale() in an async Server Component.
 */
export function LandingHeroStatic({ locale }: { locale: Locale }) {
  return (
    <div suppressHydrationWarning>
      <LandingHeadline title={t(locale, "landingNeighborhoodHeadline")} accent={t(locale, "landingHomepageHeadlineAccent")} />
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 sm:text-base">
        {t(locale, "landingHomepageIntro")}
      </p>
    </div>
  );
}
