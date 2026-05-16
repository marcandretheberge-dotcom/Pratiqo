"use client";

import { MapPin } from "lucide-react";
import { LandingTeacherCardSkeleton } from "@/components/marketing/LandingTeacherCardSkeleton";
import type { TeacherSearchRow } from "@/lib/teacherSearchEngine";
import { useLocale } from "@/lib/locale-context";
import { TeacherResultCard } from "./TeacherResultCard";

export function MarketplaceResultsGrid({
  loading,
  rows,
  onOpenTeacher,
  onResetFilters,
  highlightedTeacherId = null,
  onHoverTeacher,
  resultAnchorPrefix,
  layout = "default",
}: {
  loading: boolean;
  rows: TeacherSearchRow[];
  onOpenTeacher: (teacher: TeacherSearchRow["teacher"]) => void;
  onResetFilters: () => void;
  highlightedTeacherId?: string | null;
  onHoverTeacher?: (id: string | null) => void;
  /** When set, each card is wrapped with `id="{prefix}-{teacherId}"` for scroll targeting. */
  resultAnchorPrefix?: string;
  /** Single-column stack for mobile bottom sheet. */
  layout?: "default" | "stack";
}) {
  const { t } = useLocale();

  const gridClass =
    layout === "stack"
      ? "grid grid-cols-1 gap-3"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2";

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: layout === "stack" ? 4 : 6 }).map((_, i) => (
          <LandingTeacherCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#DCEAE3] bg-white p-8 text-center shadow-[0_12px_40px_rgba(44,44,42,0.05)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <MapPin size={22} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#2C2C2A]">{t("noTeachersFound")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#6B6A65]">
          {t("studentSearchEmptyHint")}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800"
        >
          {t("studentSearchResetFilters")}
        </button>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {rows.map(({ teacher, distanceKm }) => {
        const card = (
          <TeacherResultCard
            teacher={teacher}
            distanceKm={distanceKm}
            isHighlighted={highlightedTeacherId === teacher.id}
            onHoverChange={onHoverTeacher}
            onOpen={() => onOpenTeacher(teacher)}
          />
        );
        if (!resultAnchorPrefix) {
          return <div key={teacher.id}>{card}</div>;
        }
        return (
          <div key={teacher.id} id={`${resultAnchorPrefix}-${teacher.id}`}>
            {card}
          </div>
        );
      })}
    </div>
  );
}
