"use client";

import type { Teacher } from "@/types";
import { TeacherListingCard } from "@/components/teachers/TeacherListingCard";

export function LandingTeacherListingCard({
  teacher,
  geo,
  onOpen,
  isHighlighted,
  onHoverChange,
}: {
  teacher: Teacher;
  /** @deprecated Price formatting now happens inside the card via `TeacherPriceTag`. */
  formatPrice?: (n: number) => string;
  geo: { lat: number; lng: number } | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  return (
    <TeacherListingCard
      teacher={teacher}
      variant="landing"
      geo={geo}
      onOpen={onOpen}
      isHighlighted={isHighlighted}
      onHoverChange={onHoverChange}
    />
  );
}
