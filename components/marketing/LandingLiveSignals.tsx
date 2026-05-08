"use client";

import { Activity, BadgeCheck, MapPin } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

const ICONS = [Activity, MapPin, BadgeCheck] as const;

export function LandingLiveSignals({ className }: { className?: string }) {
  const { t } = useLocale();
  const signals = ["liveSignalBooked", "liveSignalAvailable", "liveSignalVerified"] as const;

  return (
    <div
      className={cn(
        "rounded-3xl border border-[#EBE8DF] bg-[#F8F6F0]/90 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm sm:px-6",
        className,
      )}
    >
      <ul className="mx-auto grid max-w-[1100px] gap-4 sm:grid-cols-3 lg:gap-6">
        {signals.map((key, idx) => {
          const Icon = ICONS[idx]!;
          return (
            <li
              key={key}
              className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F6F1] text-teal-800">
                <Icon size={17} aria-hidden strokeWidth={2} />
              </span>
              <p className="text-[13px] leading-snug text-[#374038]">{t(key)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
