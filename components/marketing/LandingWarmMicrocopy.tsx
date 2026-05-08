"use client";

import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function LandingWarmMicrocopy({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div className={cn("space-y-2 text-center lg:text-left", className)}>
      <p className="text-[13px] leading-relaxed text-neutral-700/95 italic">{t("landingWarmLinePiano")}</p>
      <p className="text-[13px] font-medium leading-relaxed text-[#3d5348]">{t("landingWarmLineCommunity")}</p>
    </div>
  );
}
