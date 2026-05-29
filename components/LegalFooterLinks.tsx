"use client";

/**
 * LegalFooterLinks — locale-aware legal nav used in page footers.
 * Renders: Terms · Privacy · Cancellation · Code of Conduct · Contact.
 *
 * Hrefs point to the canonical /legal/* routes. Legacy top-level paths
 * (/cgu, /confidentialite, /annulation, /code-de-conduite) still resolve
 * via 308 redirects in next.config.ts but should not be linked from the UI.
 */

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

export function LegalFooterLinks() {
  const { locale, t } = useLocale();
  const teacherTermsLabel =
    locale === "en"
      ? "Teacher Terms"
      : locale === "es"
        ? "Condiciones profesores"
        : "Conditions professeurs";

  const paymentsLabel =
    locale === "en"
      ? "Payments & Refunds"
      : locale === "es"
        ? "Pagos y reembolsos"
        : "Paiements et remboursements";

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
      <Link href="/legal/code-de-conduite" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerCodeOfConduct")}
      </Link>
      <Link href="/legal/conditions-professeurs" className="hover:text-[#2C2C2A] hover:underline">
        {teacherTermsLabel}
      </Link>
      <Link href="/legal/teacher-pro" className="hover:text-[#2C2C2A] hover:underline">
        Teacher Pro
      </Link>
      <Link href="/legal/paiements-remboursements" className="hover:text-[#2C2C2A] hover:underline">
        {paymentsLabel}
      </Link>
      <Link href="/contact" className="hover:text-[#2C2C2A] hover:underline">
        {t("footerContact")}
      </Link>
    </>
  );
}
