import type { Teacher } from "@/types";

export type LandingFormatFilter = "all" | "online" | "in_person" | "hybrid";

export function teacherMatchesLandingFormatFilter(
  teacher: Teacher,
  filter: LandingFormatFilter,
): boolean {
  if (filter === "all") return true;
  const m = teacher.teachingMode;
  if (filter === "online") return m === "online";
  if (filter === "in_person") return m === "person" || m === "home";
  if (filter === "hybrid") return m === "both" || m === "all";
  return true;
}

export function teacherHasMapCoords(t: Teacher): boolean {
  const lat = t?.location?.lat;
  const lng = t?.location?.lng;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}
