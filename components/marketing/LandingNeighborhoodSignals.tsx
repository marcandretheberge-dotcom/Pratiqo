"use client";

import { MapPin, Shield, Sparkles, Users } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

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
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E0E5E1] bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#3d4a42] shadow-sm"
          >
            <Icon size={13} className="shrink-0 text-teal-700" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
