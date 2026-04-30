"use client";

/**
 * LegalFooterLinks — locale-aware legal nav used in page footers.
 * Renders: Terms · Privacy · Cancellation
 */

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

export function LegalFooterLinks() {
  const { t } = useLocale();
  return (
    <>
      <Link href="/legal/cgu" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerTerms")}
      </Link>
      <Link href="/legal/confidentialite" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerPrivacy")}
      </Link>
      <Link href="/legal/annulation" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerCancellation")}
      </Link>
    </>
  );
}
