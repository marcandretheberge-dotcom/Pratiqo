import type { Teacher } from "@/types";
import type { MapBounds } from "@/components/SearchMapView";
import { buildTeacherSearchRows, type TeacherSearchRow } from "@/lib/teacherSearchEngine";
import { getTeacherMapCoords, getTeachingZoneCoords } from "@/lib/teacherTeachingZones";
import { getTeacherPublicFormatIds } from "@/lib/teachers/display";

export function teachersInLandingMapArea(teachers: Teacher[], bounds: MapBounds): TeacherSearchRow[] {
  const { ne, sw } = bounds;
  const contains = (coords: { lat: number; lng: number } | null) => coords != null &&
    coords.lat >= sw.lat && coords.lat <= ne.lat &&
    (ne.lng < sw.lng ? coords.lng >= sw.lng || coords.lng <= ne.lng : coords.lng >= sw.lng && coords.lng <= ne.lng);
  const center = { lat: (ne.lat + sw.lat) / 2, lng: (ne.lng + sw.lng + (ne.lng < sw.lng ? 360 : 0)) / 2 };
  if (center.lng > 180) center.lng -= 360;
  return teachers.flatMap((teacher) => {
    if (!getTeacherPublicFormatIds(teacher).some((format) => format !== "online")) return [];
    // A previously selected city must not hide another real teaching zone in this area.
    const activeZones = teacher.teachingZones?.filter((zone) => zone.isActive) ?? [];
    const zones = activeZones.filter((zone) => contains(getTeachingZoneCoords(zone)));
    if (activeZones.some((zone) => getTeachingZoneCoords(zone) != null) && !zones.length) return [];
    const row = buildTeacherSearchRows([{ ...teacher, matchedTeachingZone: undefined, teachingZones: zones }], { geo: center })[0];
    if (!contains(getTeacherMapCoords(row.teacher))) return [];
    // The map centre can rank results, but is not the learner's location.
    return [{ ...row, teacher: { ...row.teacher, distance: 0, teachingZones: teacher.teachingZones } }];
  });
}
