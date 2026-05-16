"use client";

import type { Teacher } from "@/types";
import { TeacherListingCard } from "@/components/teachers/TeacherListingCard";

export function TeacherResultCard({
  teacher,
  distanceKm,
  onOpen,
  isHighlighted = false,
  onHoverChange,
}: {
  teacher: Teacher;
  distanceKm: number | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  return (
    <TeacherListingCard
      teacher={teacher}
      variant="search"
      distanceKm={distanceKm}
      onOpen={onOpen}
      isHighlighted={isHighlighted}
      onHoverChange={onHoverChange}
    />
  );
}
