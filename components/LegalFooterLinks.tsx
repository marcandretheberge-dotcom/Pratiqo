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
      <Link href="/cgu" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerTerms")}
      </Link>
      <Link href="/confidentialite" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerPrivacy")}
      </Link>
      <Link href="/annulation" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerCancellation")}
      </Link>
      <Link href="/contact" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerContact")}
      </Link>
    </>
  );
}
