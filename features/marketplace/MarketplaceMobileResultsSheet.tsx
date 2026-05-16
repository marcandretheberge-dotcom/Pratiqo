"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import type { TeacherSearchRow } from "@/lib/teacherSearchEngine";
import { useLocale } from "@/lib/locale-context";
import { MarketplaceResultsGrid } from "./MarketplaceResultsGrid";

const SNAP_POINTS = ["148px", 0.48, 0.9] as const;
const DEFAULT_SNAP = SNAP_POINTS[0];

export function MarketplaceMobileResultsSheet({
  resultCount,
  loading,
  rows,
  highlightedTeacherId,
  onOpenTeacher,
  onResetFilters,
  onHoverTeacher,
}: {
  resultCount: number;
  loading: boolean;
  rows: TeacherSearchRow[];
  highlightedTeacherId?: string | null;
  onOpenTeacher: (teacher: TeacherSearchRow["teacher"]) => void;
  onResetFilters: () => void;
  onHoverTeacher?: (id: string | null) => void;
}) {
  const { t } = useLocale();
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(DEFAULT_SNAP);

  useEffect(() => {
    if (!highlightedTeacherId) return;
    queueMicrotask(() => {
      setActiveSnapPoint(SNAP_POINTS[1]);
    });
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`marketplace-mobile-result-${highlightedTeacherId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightedTeacherId]);

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
      handleOnly={false}
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[45] flex max-h-[min(92dvh,900px)] flex-col rounded-t-[26px] border border-b-0 border-[#DCEAE3] bg-[#FAFCFB] shadow-[0_-16px_56px_rgba(44,44,42,0.14)] outline-none"
          aria-describedby={undefined}
        >
          <Drawer.Title className="sr-only">{t("searchResults")}</Drawer.Title>
          <Drawer.Handle
            aria-hidden
            className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[#C9C5BA]"
          />
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="shrink-0 text-sm font-semibold text-[#2C2C2A]">
              {resultCount} {t("searchResults")}
            </p>
            <div
              className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]"
              data-vaul-no-drag
            >
              <MarketplaceResultsGrid
                loading={loading}
                rows={rows}
                highlightedTeacherId={highlightedTeacherId}
                onOpenTeacher={onOpenTeacher}
                onResetFilters={onResetFilters}
                onHoverTeacher={onHoverTeacher}
                resultAnchorPrefix="marketplace-mobile-result"
                layout="stack"
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
