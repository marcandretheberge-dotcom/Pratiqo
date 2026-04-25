"use client";

import React from "react";
import type { Locale } from "@/lib/i18n";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage, getLessonsToNextStage, getNextStage, getProgressPercent } from "@/lib/companions";
import { useLocale } from "@/lib/locale-context";

export function CompanionWidget({
  companionType,
  lessonCount,
  locale,
}: {
  companionType: CompanionType;
  lessonCount: number;
  locale: Locale;
}) {
  const { t } = useLocale();
  const companion = COMPANIONS[companionType];
  const stage = getCompanionStage(companionType, lessonCount);
  const percent = getProgressPercent(companionType, lessonCount);
  const next = getNextStage(companionType, lessonCount);
  const remaining = getLessonsToNextStage(companionType, lessonCount);

  const stageName = locale === "en-CA" ? stage.nameEn : locale === "es" ? stage.nameEs : stage.name;

  const gradient =
    companionType === "phoenix"
      ? "linear-gradient(135deg, rgba(255,136,0,0.10) 0%, rgba(255,59,48,0.06) 100%)"
      : companionType === "forest"
        ? "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(34,197,94,0.06) 100%)"
        : companionType === "dragon"
          ? "linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(99,102,241,0.06) 100%)"
          : "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(14,165,233,0.06) 100%)";

  return (
    <div
      className="w-[200px] rounded-2xl border border-[#E8E6DF] p-4 text-center"
      style={{ background: gradient }}
    >
      <div className="text-[48px] leading-none">{stage.emoji}</div>
      <div className="mt-2 text-sm font-semibold text-[#2C2C2A]">{stageName}</div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-black/5 overflow-hidden">
        <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-2 text-[11px] text-[#6B6A64]">
        {next ? (
          <>
            {remaining} {remaining === 1 ? t("lesson") : t("lessons")} {t("companionProgress")}
          </>
        ) : (
          <>{t("companionMaxLevel")}</>
        )}
      </div>
    </div>
  );
}

