"use client";

import { LegalFooterLinks } from "@/components/LegalFooterLinks";

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[#E8E6DF]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-700">
        <LegalFooterLinks />
        <span className="text-[#D3D1C7]">·</span>
        <span>© 2026 Pratiqo inc.</span>
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
