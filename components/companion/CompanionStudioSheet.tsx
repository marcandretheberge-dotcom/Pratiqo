"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import {
  getCompanionEvolutionSummary,
  getLocalizedFamilyName,
  getLocalizedStageName,
  type CompanionFamily,
} from "@/lib/companion/evolution";
import { CompanionArtwork } from "@/components/companion/CompanionArtwork";
import { CompanionEvolutionCarousel } from "@/components/companion/CompanionEvolutionCarousel";
import { CompanionFamilyPicker } from "@/components/companion/CompanionFamilyPicker";
import { CompanionProgressBar } from "@/components/companion/CompanionProgressBar";

export function CompanionStudioSheet({
  open,
  onOpenChange,
  family,
  onFamilyChange,
  lessonCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  family: CompanionFamily;
  onFamilyChange: (family: CompanionFamily) => void;
  lessonCount: number;
}) {
  const { t, locale } = useLocale();
  const summary = getCompanionEvolutionSummary(family, lessonCount);
  const familyName = getLocalizedFamilyName(summary.family, locale);
  const stageName = getLocalizedStageName(summary.currentStage, locale);
  const nextStageName = summary.nextStage ? getLocalizedStageName(summary.nextStage, locale) : null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        aria-label={t("companionStudioClose")}
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-studio-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] border border-white/70 bg-[#FFFCF5] p-5 shadow-[0_-24px_80px_rgba(15,23,42,0.22)] sm:max-w-xl sm:rounded-[32px] sm:p-6"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={t("companionStudioClose")}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <X size={18} />
        </button>

        <div className="pr-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0F6E56]">
            {t("companionStudioEyebrow")}
          </p>
          <h2 id="companion-studio-title" className="mt-2 text-2xl font-bold text-slate-950">
            {t("companionStudioTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("companionStudioSubtitle")}</p>
        </div>

        <div className="mt-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F6E56] via-[#1D9E75] to-[#F6C177] p-5 text-white shadow-[0_22px_60px_rgba(29,158,117,0.24)]">
          <div className="flex items-start gap-4">
            <CompanionArtwork
              src={summary.currentStage.imageSrc}
              alt={stageName}
              size="lg"
              accent={summary.family.accent}
              className="border-white/30 bg-white/15"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                {t("companionStudioCurrentStage")}
              </p>
              <h3 className="mt-1 text-2xl font-bold leading-tight">{stageName}</h3>
              <p className="mt-1 text-sm font-semibold text-white/85">{familyName}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
              <p className="text-[11px] font-semibold text-white/75">{t("companionStudioLessonsCompleted")}</p>
              <p className="mt-1 text-2xl font-bold">{summary.lessonsCompleted}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
              <p className="text-[11px] font-semibold text-white/75">{t("companionStudioRemaining")}</p>
              <p className="mt-1 text-2xl font-bold">{summary.lessonsRemaining}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-white/85">
              <span>{t("companionStudioProgressLabel")}</span>
              <span>{summary.progressPercent}%</span>
            </div>
            <CompanionProgressBar value={summary.progressPercent} label={t("companionStudioProgressLabel")} tone="light" />
            <p className="mt-2 text-xs text-white/85">
              {nextStageName
                ? t("companionStudioNextCopy").replace("{stage}", nextStageName)
                : t("companionStudioMaxMessage")}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <CompanionFamilyPicker selectedFamily={family} lessonCount={lessonCount} onSelect={onFamilyChange} />
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-950">{t("companionStudioEvolutionPath")}</h3>
            <p className="mt-1 text-xs text-slate-600">{t("companionStudioEvolutionHint")}</p>
          </div>
          <CompanionEvolutionCarousel stages={summary.stages} accent={summary.family.accent} />
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-100 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">{t("companionStudioChangeReassurance")}</p>
          <Link
            href="/student/choose-companion"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(29,158,117,0.22)] transition hover:bg-[#168563] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          >
            {t("companionStudioChange")}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
