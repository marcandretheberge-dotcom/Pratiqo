import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

/**
 * Server-rendered hero copy so the main H1 is in the initial HTML (faster LCP than client-only).
 * Parent must pass `locale` from await getLocale() in an async Server Component.
 */
export function LandingHeroStatic({ locale }: { locale: Locale }) {
  return (
    <div suppressHydrationWarning>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800">{t(locale, "landingEyebrowLocal")}</p>
      <p className="mt-3 text-[15px] font-semibold text-teal-700 lg:hidden">{t(locale, "landingMobileNearYou")}</p>
      <p className="mt-1 text-sm leading-snug text-neutral-700 lg:hidden">{t(locale, "landingMobileCornerHint")}</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1a1f1d] sm:text-3xl lg:mt-2 lg:text-[2.15rem] lg:leading-[1.12]">
        {t(locale, "landingNeighborhoodHeadline")}
      </h1>
      <p className="mx-auto mt-3 hidden max-w-2xl text-[15px] leading-relaxed text-neutral-700 sm:text-base lg:block">
        {t(locale, "teacherGridCornerLesson")}
      </p>
    </div>
  );
}
