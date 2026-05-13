"use client";

/**
 * LegalFooterLinks — locale-aware legal nav used in page footers.
 * Renders: Terms · Privacy · Cancellation
 */

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";

export function LegalFooterLinks() {
  const { t, locale } = useLocale();
  return (
    <>
      <Link href={withLocaleHref("/cgu", locale)} className="hover:text-[#2C2C2A] hover:underline">
        {t("footerTerms")}
      </Link>
      <Link href={withLocaleHref("/confidentialite", locale)} className="hover:text-[#2C2C2A] hover:underline">
        {t("footerPrivacy")}
      </Link>
      <Link href={withLocaleHref("/annulation", locale)} className="hover:text-[#2C2C2A] hover:underline">
        {t("footerCancellation")}
      </Link>
      <Link href={withLocaleHref("/contact", locale)} className="hover:text-[#2C2C2A] hover:underline">
        {t("footerContact")}
      </Link>
    </>
  );
}
