"use client";

import { useLocale } from "@/lib/locale-context";
import {
  COMPANION_FAMILIES,
  getCompanionEvolutionSummary,
  getLocalizedFamilyName,
  getLocalizedStageName,
  type CompanionFamily,
} from "@/lib/companion/evolution";
import { CompanionArtwork } from "@/components/companion/CompanionArtwork";
import { cn } from "@/lib/utils";

const FAMILY_IDS: CompanionFamily[] = ["forest", "music", "language"];

export function CompanionFamilyPicker({
  selectedFamily,
  lessonCount,
  onSelect,
}: {
  selectedFamily: CompanionFamily;
  lessonCount: number;
  onSelect: (family: CompanionFamily) => void;
}) {
  const { t, locale } = useLocale();

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-950">{t("companionStudioFamilyPickerTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("companionStudioFamilyPickerHint")}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {FAMILY_IDS.map((familyId) => {
          const summary = getCompanionEvolutionSummary(familyId, lessonCount);
          const family = COMPANION_FAMILIES[familyId];
          const selected = familyId === selectedFamily;
          const familyName = getLocalizedFamilyName(family, locale);
          const stageName = getLocalizedStageName(summary.currentStage, locale);

          return (
            <button
              key={familyId}
              type="button"
              aria-pressed={selected}
              aria-label={t(selected ? "companionStudioSelectedFamily" : "companionStudioSelectFamily").replace(
                "{family}",
                familyName,
              )}
              onClick={() => onSelect(familyId)}
              className={cn(
                "min-w-0 rounded-2xl border p-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2",
                selected
                  ? "border-[#1D9E75] bg-[#E9F8F1] shadow-[0_12px_30px_rgba(29,158,117,0.14)]"
                  : "border-slate-200 bg-[#FFFCF5] hover:border-emerald-200",
              )}
            >
              <CompanionArtwork
                src={summary.currentStage.imageSrc}
                alt={stageName}
                size="sm"
                accent={family.accent}
                className="mx-auto"
              />
              <span className="mt-2 block truncate text-xs font-bold text-slate-950">{familyName}</span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">{stageName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
