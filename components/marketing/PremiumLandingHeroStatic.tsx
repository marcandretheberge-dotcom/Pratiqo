import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

/**
 * Server-rendered homepage hero copy (H1 in initial HTML for SEO and LCP).
 */
export function PremiumLandingHeroStatic({ locale }: { locale: Locale }) {
  return (
    <div suppressHydrationWarning className="text-center lg:text-left">
      <p className="inline-flex items-center rounded-full border border-teal-700/15 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800 shadow-sm backdrop-blur-sm">
        {t(locale, "landingPremiumPill")}
      </p>
      <h1 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-[#142235] sm:text-4xl lg:mt-5 lg:text-[2.65rem] lg:leading-[1.08]">
        {t(locale, "landingPremiumH1")}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#5E6B78] sm:text-base lg:mx-0 lg:max-w-lg">
        {t(locale, "landingPremiumSubtitle")}
      </p>
    </div>
  );
}
