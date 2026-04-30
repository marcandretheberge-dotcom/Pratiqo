"use client";

import { BadgeCheck, Clock, LayoutTemplate } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

export function LandingHeroTrustStrip({ className }: { className?: string }) {
  const { t } = useLocale();
  const rows: { title: TranslationKey; body: TranslationKey; icon: typeof BadgeCheck }[] = [
    { title: "landingTrustStripVerifiedTitle", body: "landingTrustStripVerifiedBody", icon: BadgeCheck },
    { title: "landingTrustStripAvailableTitle", body: "landingTrustStripAvailableBody", icon: Clock },
    { title: "landingTrustStripFormatsTitle", body: "landingTrustStripFormatsBody", icon: LayoutTemplate },
  ];

  return (
    <div className={cn("w-full rounded-3xl border border-[#DCF0E8] bg-white/95 px-4 py-5 shadow-[0_6px_24px_rgba(15,110,86,0.06)] backdrop-blur-sm sm:px-6 md:py-6", className)}>
      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-5">
        {rows.map(({ title, body, icon: Icon }) => (
          <li key={title} className="flex gap-3 text-center sm:flex-col sm:items-center sm:text-center md:gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl bg-[#E9F6F1] text-[#0F6E56] shadow-sm sm:self-center md:h-11 md:w-11">
              <Icon size={22} strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 text-left sm:text-center">
              <span className="block text-[13px] font-bold tracking-tight text-[#1a1f1d]">{t(title)}</span>
              <span className="mt-1 block text-[12px] leading-snug text-[#526056]">{t(body)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
