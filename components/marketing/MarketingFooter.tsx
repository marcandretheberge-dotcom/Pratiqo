"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { useLocale } from "@/lib/locale-context";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";

/**
 * Canonical public marketing footer — product links, legal, contact.
 */
export function MarketingFooter() {
  const { t, locale } = useLocale();
  const homeHref = withLocaleHref("/", locale);

  const productLinks = [
    { href: withLocaleHref("/trouver-un-prof", locale), label: t("findTeacher") },
    { href: withLocaleHref("/become-teacher", locale), label: t("becomeTeacher") },
    { href: withLocaleHref("/tarifs", locale), label: t("navPricing") },
    { href: withLocaleHref("/blog", locale), label: t("navResources") },
  ] as const;

  return (
    <footer className="mt-auto border-t border-[#E8E6DF] bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link href={homeHref} className="inline-flex items-center" aria-label={t("navHome")}>
              <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
              {t("landingEyebrowLocal")}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Pratiqo</p>
            <ul className="mt-3 space-y-2 text-sm">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-medium text-teal-700 hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 text-sm text-neutral-700 sm:items-start">
            <LegalFooterLinks />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-[#E8E6DF] pt-6 text-xs text-neutral-600">
          <span>© 2026 Pratiqo inc.</span>
          <span className="text-[#D3D1C7]" aria-hidden>
            ·
          </span>
          <a href="mailto:info@pratiqo.ca" className="text-teal-700 hover:underline">
            info@pratiqo.ca
          </a>
          <span className="text-[#D3D1C7]" aria-hidden>
            ·
          </span>
          <span>
            <span className="text-neutral-600">{t("footerContact")}: </span>
            <a href="mailto:support@pratiqo.ca" className="text-teal-700 hover:underline">
              support@pratiqo.ca
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
