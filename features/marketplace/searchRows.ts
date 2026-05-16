import type { MapBounds } from "@/components/SearchMapView";
import type { TeacherSearchRow } from "@/lib/teacherSearchEngine";

function lngWithinBounds(lng: number, bounds: MapBounds) {
  const { ne, sw } = bounds;
  return ne.lng < sw.lng ? lng >= sw.lng || lng <= ne.lng : lng >= sw.lng && lng <= ne.lng;
}

export function applyMapBoundsFilter<T extends TeacherSearchRow>(rows: T[], bounds: MapBounds | null): T[] {
  if (!bounds) return rows;

  return rows.filter(({ teacher }) => {
    const lat = teacher.location?.lat;
    const lng = teacher.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") return false;
    return lat >= bounds.sw.lat && lat <= bounds.ne.lat && lngWithinBounds(lng, bounds);
  });
}
