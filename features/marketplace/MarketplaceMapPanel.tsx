"use client";

import dynamic from "next/dynamic";
import { MapPin, X } from "lucide-react";
import type { Teacher } from "@/types";
import type { MapBounds } from "@/components/SearchMapView";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";

const SearchMapView = dynamic(
  () => import("@/components/SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => <MarketplaceMapLoadingBlock map />,
  },
);

function MarketplaceMapLoadingBlock({ map = false }: { map?: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-[#6B6A65]",
        map ? "min-h-[480px] border border-[#E8E6DF]" : "p-8",
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      <p>{map ? t("loadingMap") : t("loading")}</p>
    </div>
  );
}

export function MarketplaceMapPanel({
  loading,
  teachers,
  geo,
  selectedTeacher,
  highlightedTeacherId = null,
  mapBounds,
  onTeacherSelect,
  onCloseSelected,
  onViewProfile,
  onBoundsSearch,
  onBoundsFilterCleared,
  mapHeight = "min(680px, calc(100dvh - 8rem))",
  className,
}: {
  loading: boolean;
  teachers: Teacher[];
  geo: { lat: number; lng: number } | null;
  selectedTeacher: Teacher | null;
  highlightedTeacherId?: string | null;
  mapBounds: MapBounds | null;
  onTeacherSelect: (teacher: Teacher) => void;
  onCloseSelected: () => void;
  onViewProfile: (teacher: Teacher) => void;
  onBoundsSearch: (bounds: MapBounds) => void;
  onBoundsFilterCleared: () => void;
  mapHeight?: string;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <div className={cn("overflow-hidden rounded-[28px] border border-[#DCEAE3] bg-white p-2 shadow-[0_18px_60px_rgba(44,44,42,0.08)]", className)}>
      {loading ? (
        <div className="flex min-h-[480px] items-center justify-center rounded-[22px] bg-[#F8FBF8] text-sm font-semibold text-teal-700">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          {t("loading")}
        </div>
      ) : (
        <>
          {mapBounds ? (
            <div className="mb-2 flex justify-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-teal-600/25 bg-teal-50/95 px-3 py-1.5 text-[11px] font-semibold text-teal-900 shadow-sm sm:text-xs">
                <MapPin size={12} className="shrink-0 text-teal-700" aria-hidden />
                <span className="truncate">{t("mapBoundsFilterActiveLabel")}</span>
                <button
                  type="button"
                  onClick={onBoundsFilterCleared}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800 ring-1 ring-teal-700/15 hover:bg-white"
                  aria-label={t("mapBoundsClearFilterAria")}
                >
                  <X size={12} strokeWidth={2.5} aria-hidden />
                  <span className="hidden sm:inline">{t("mapBoundsClearFilter")}</span>
                </button>
              </div>
            </div>
          ) : null}
          <SearchMapView
            teachers={teachers}
            userLat={geo?.lat ?? null}
            userLng={geo?.lng ?? null}
            selectedTeacher={selectedTeacher}
            onTeacherSelect={onTeacherSelect}
            onCloseSelected={onCloseSelected}
            onViewProfile={onViewProfile}
            onBoundsSearch={onBoundsSearch}
            boundsFilterActive={!!mapBounds}
            onBoundsFilterCleared={onBoundsFilterCleared}
            highlightedTeacherId={highlightedTeacherId}
            mapHeight={mapHeight}
          />
        </>
      )}
    </div>
  );
}
