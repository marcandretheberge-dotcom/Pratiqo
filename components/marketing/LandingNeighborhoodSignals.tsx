"use client";

import { MapPin, Shield, Sparkles, Users } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

/**
 * Static neighborhood/trust chips for the landing teacher listing.
 * These are not filters: they do not open menus and must not look like dropdowns.
 */
export function LandingNeighborhoodSignals({ className }: { className?: string }) {
  const { t } = useLocale();
  const chips: { key: "neighborhoodChipArea" | "neighborhoodChipVerifiedLocal" | "neighborhoodChipFormats" | "neighborhoodChipNearYou"; icon: typeof MapPin }[] = [
    { key: "neighborhoodChipArea", icon: Sparkles },
    { key: "neighborhoodChipVerifiedLocal", icon: Shield },
    { key: "neighborhoodChipFormats", icon: Users },
    { key: "neighborhoodChipNearYou", icon: MapPin },
  ];

  return (
    <div className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {chips.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="inline-flex cursor-default select-none items-center gap-1.5 rounded-full border border-[#E8E6DF] bg-[#FAFCFB] px-3 py-1.5 text-[12px] font-medium text-slate-600"
          >
            <Icon size={13} className="shrink-0 text-teal-700" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
