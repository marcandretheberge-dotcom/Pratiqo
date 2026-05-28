"use client";

import Link from "next/link";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { useLocale } from "@/lib/locale-context";

export function LandingFooter() {
  const { t } = useLocale();
  return (
    <footer className="bg-white border-t border-[#E8E6DF]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-700">
        <LegalFooterLinks />
        <span className="text-[#D3D1C7]">·</span>
        <Link href="/blog" className="text-teal-700 hover:underline">
          {t("navResources")}
        </Link>
        <span className="text-[#D3D1C7]">·</span>
        <span>© 2026 Cours Pratiqo Inc.</span>
        <span className="text-[#D3D1C7]">·</span>
        <a href="mailto:info@pratiqo.ca" className="text-teal-700 hover:underline">
          info@pratiqo.ca
        </a>
        <span className="text-[#D3D1C7]">·</span>
        <span>
          <span className="text-neutral-700">Aide&nbsp;: </span>
          <a href="mailto:support@pratiqo.ca" className="text-teal-700 hover:underline">
            support@pratiqo.ca
          </a>
        </span>
      </div>
    </footer>
  );
}
