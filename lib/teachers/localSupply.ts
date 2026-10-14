import type { TeacherTeachingZone } from "@/types";
import { haversineDistance } from "@/lib/geo";
import { getTeachingZoneCoords } from "@/lib/teacherTeachingZones";

const normalize = (value: string | null | undefined) => (value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Local inventory is a declared place or travel area, never a generic proximity radius. */
export function hasDeclaredLocalSupply(
  teacher: { city?: string | null; teaching_mode?: string | null; teachingZones?: TeacherTeachingZone[] },
  city: { name: string; lat: number; lng: number },
): boolean {
  if (!["person", "in_person", "in-person", "home", "both", "all"].includes(normalize(teacher.teaching_mode))) return false;
  const zones = (teacher.teachingZones ?? []).filter((zone) => zone.isActive && zone.countryCode === "CA");
  if (zones.length > 0) {
    return zones.some((zone) => {
      if (!zone.supportsAtTeacherPlace && !zone.supportsAtStudentPlace && !zone.supportsPublicPlace) return false;
      if (normalize(zone.city) === normalize(city.name)) return true;
      const coords = getTeachingZoneCoords(zone);
      return zone.supportsAtStudentPlace && coords !== null &&
        haversineDistance(city.lat, city.lng, coords.lat, coords.lng) <= zone.radiusKm;
    });
  }
  return normalize(teacher.city) === normalize(city.name);
}
