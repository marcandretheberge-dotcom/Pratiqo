"use client";

import { Check, Lock } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getLocalizedStageName, type CompanionEvolutionStage } from "@/lib/companion/evolution";
import { CompanionArtwork } from "@/components/companion/CompanionArtwork";
import { cn } from "@/lib/utils";

export function CompanionEvolutionCarousel({
  stages,
  accent = "#1D9E75",
}: {
  stages: CompanionEvolutionStage[];
  accent?: string;
}) {
  const { t, locale } = useLocale();

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {stages.map((stage) => {
          const name = getLocalizedStageName(stage, locale);
          const statusLabel = stage.isCurrent
            ? t("companionStudioCurrent")
            : stage.isUnlocked
              ? t("companionStudioUnlocked")
              : t("companionStudioLockedUntil").replace("{count}", String(stage.unlockAt));

          return (
            <div
              key={`${stage.name}-${stage.unlockAt}`}
              className={cn(
                "w-40 shrink-0 rounded-2xl border p-3 transition-colors",
                stage.isCurrent
                  ? "border-[#1D9E75] bg-[#E9F8F1] shadow-[0_14px_40px_rgba(29,158,117,0.16)]"
                  : stage.isUnlocked
                    ? "border-emerald-100 bg-white"
                    : "border-slate-200 bg-slate-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <CompanionArtwork src={stage.imageSrc} alt={name} size="sm" locked={!stage.isUnlocked} accent={accent} />
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    stage.isUnlocked ? "bg-[#1D9E75] text-white" : "bg-slate-200 text-slate-500",
                  )}
                  aria-hidden
                >
                  {stage.isUnlocked ? <Check size={14} /> : <Lock size={13} />}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-950">{name}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {stage.unlockAt === 0 ? t("companionStudioStartStage") : `${stage.unlockAt} ${t("profileLessons").toLowerCase()}`}
              </p>
              <p className={cn("mt-2 text-[11px] font-bold", stage.isCurrent ? "text-[#0F6E56]" : "text-slate-500")}>
                {statusLabel}
              </p>
              {!stage.isUnlocked ? (
                <p className="mt-1 text-[10px] font-semibold text-slate-500">{t("companionStudioLockedState")}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
