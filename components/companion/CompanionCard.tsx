"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { CompanionType } from "@/lib/companions";
import { useLocale } from "@/lib/locale-context";
import {
  getCompanionEvolutionSummary,
  getLocalizedFamilyName,
  getLocalizedStageName,
  resolveCompanionFamily,
  type CompanionFamily,
} from "@/lib/companion/evolution";
import { CompanionArtwork } from "@/components/companion/CompanionArtwork";
import { CompanionProgressBar } from "@/components/companion/CompanionProgressBar";
import { CompanionStudioSheet } from "@/components/companion/CompanionStudioSheet";
import { cn } from "@/lib/utils";

export function CompanionCard({
  companionType,
  companionChosen,
  lessonCount,
  loading = false,
  variant = "profile",
}: {
  companionType: CompanionType | CompanionFamily | string | null;
  companionChosen: boolean;
  lessonCount: number;
  loading?: boolean;
  variant?: "profile" | "progress";
}) {
  const { t, locale } = useLocale();
  const [studioOpen, setStudioOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<CompanionFamily | null>(null);
  const hasCompanion = companionChosen && companionType;

  if (loading) {
    return <div className={cn("animate-pulse rounded-2xl bg-white/40", variant === "profile" ? "h-24" : "h-20")} />;
  }

  if (!hasCompanion) {
    return (
      <Link
        href="/student/choose-companion"
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm font-bold text-[#0F6E56] transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2",
          variant === "profile" && "border-white/25 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        {t("companionNoCompanion")}
        <ChevronRight size={18} aria-hidden />
      </Link>
    );
  }

  const activeFamily = selectedFamily ?? resolveCompanionFamily(companionType);
  const summary = getCompanionEvolutionSummary(activeFamily, lessonCount);
  const stageName = getLocalizedStageName(summary.currentStage, locale);
  const familyName = getLocalizedFamilyName(summary.family, locale);
  const remainingLabel =
    summary.lessonsRemaining > 0
      ? `${summary.lessonsRemaining} ${t("companionMoreLessons")}`
      : t("companionMaxLevel");

  return (
    <>
      <button
        type="button"
        onClick={() => setStudioOpen(true)}
        aria-label={t("companionStudioOpen")}
        className={cn(
          "group flex w-full items-center gap-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2",
          variant === "profile"
            ? "rounded-3xl p-4 text-white"
            : "mt-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm hover:border-[#1D9E75]/40",
        )}
      >
        <CompanionArtwork
          emoji={summary.currentStage.emoji}
          alt={stageName}
          size="sm"
          accent={summary.family.accent}
          className={variant === "profile" ? "border-white/30 bg-white/15" : undefined}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-bold", variant === "profile" ? "text-white" : "text-slate-950")}>
            {stageName}
          </span>
          <span className={cn("block truncate text-xs", variant === "profile" ? "text-white/80" : "text-slate-600")}>
            {familyName}
          </span>
          <span className="mt-2 block">
            <CompanionProgressBar
              value={summary.progressPercent}
              label={t("companionStudioProgressLabel")}
              tone={variant === "profile" ? "light" : "teal"}
            />
          </span>
          <span className={cn("mt-2 block text-[11px]", variant === "profile" ? "text-white/85" : "text-slate-600")}>
            {remainingLabel}
          </span>
        </span>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition group-hover:translate-x-0.5",
            variant === "profile" ? "bg-white/15 text-white" : "bg-emerald-50 text-[#0F6E56]",
          )}
          aria-hidden
        >
          <ChevronRight size={18} />
        </span>
      </button>
      <CompanionStudioSheet
        open={studioOpen}
        onOpenChange={setStudioOpen}
        family={activeFamily}
        onFamilyChange={setSelectedFamily}
        lessonCount={lessonCount}
      />
    </>
  );
}
