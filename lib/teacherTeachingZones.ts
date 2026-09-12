import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher, TeacherTeachingZone, TeacherTeachingZoneKind } from "@/types";
import { haversineDistance } from "@/lib/geo";

export type TeacherTeachingZonePublicRow = {
  id: string;
  teacher_id: string;
  label_public: string;
  city: string;
  region: string | null;
  country_code: string;
  lat_public: number | null;
  lng_public: number | null;
  radius_km: number | null;
  zone_kind: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
  availability_note_public: string | null;
  supports_at_teacher_place: boolean | null;
  supports_at_student_place: boolean | null;
  supports_public_place: boolean | null;
};

export const TEACHING_ZONE_KINDS = [
  "primary_base",
  "work_study_city",
  "weekend_city",
  "service_area",
  "temporary",
] as const satisfies readonly TeacherTeachingZoneKind[];

const TEACHING_ZONE_KIND_SET = new Set<string>(TEACHING_ZONE_KINDS);

function cleanString(value: unknown, max = 120): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanNullableString(value: unknown, max = 120): string | null {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function cleanNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCountryCode(value: unknown): string {
  const cc = cleanString(value, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : "CA";
}

export function mapTeacherTeachingZoneRow(row: TeacherTeachingZonePublicRow): TeacherTeachingZone {
  const zoneKind = TEACHING_ZONE_KIND_SET.has(String(row.zone_kind ?? ""))
    ? (row.zone_kind as TeacherTeachingZoneKind)
    : "service_area";
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    labelPublic: cleanString(row.label_public),
    city: cleanString(row.city),
    region: cleanNullableString(row.region, 80),
    countryCode: normalizeCountryCode(row.country_code),
    lat: cleanNumber(row.lat_public),
    lng: cleanNumber(row.lng_public),
    radiusKm: Math.max(1, Math.min(100, Math.round(Number(row.radius_km ?? 10)))),
    zoneKind,
    isPrimary: row.is_primary === true,
    isActive: true,
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    availabilityNotePublic: cleanNullableString(row.availability_note_public, 160),
    supportsAtTeacherPlace: row.supports_at_teacher_place === true,
    supportsAtStudentPlace: row.supports_at_student_place !== false,
    supportsPublicPlace: row.supports_public_place === true,
  };
}

export function sortTeachingZones(zones: TeacherTeachingZone[]): TeacherTeachingZone[] {
  return [...zones].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.labelPublic.localeCompare(b.labelPublic);
  });
}

export function attachTeachingZonesToTeachers(
  teachers: Teacher[],
  rows: TeacherTeachingZonePublicRow[],
): Teacher[] {
  if (teachers.length === 0 || rows.length === 0) return teachers;
  const byTeacher = new Map<string, TeacherTeachingZone[]>();
  for (const row of rows) {
    let zone: TeacherTeachingZone;
    try {
      zone = mapTeacherTeachingZoneRow(row);
    } catch {
      continue;
    }
    if (!zone.teacherId || !zone.labelPublic || !zone.city) continue;
    const current = byTeacher.get(zone.teacherId) ?? [];
    current.push(zone);
    byTeacher.set(zone.teacherId, current);
  }
  return teachers.map((teacher) => {
    const zones = byTeacher.get(teacher.id);
    if (!zones?.length) return teacher;
    return { ...teacher, teachingZones: sortTeachingZones(zones) };
  });
}

type SupabaseLike = Pick<SupabaseClient, "from">;

function warnTeacherZonesUnavailable(context: string, error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown } | null | undefined;
  console.warn("[teacher-zones] public zones unavailable; continuing with legacy teacher locations", {
    context,
    code: typeof candidate?.code === "string" ? candidate.code : undefined,
    message: String(candidate?.message ?? error ?? "").slice(0, 180),
  });
}

export async function fetchTeacherTeachingZonesForTeachers(
  supabase: SupabaseLike,
  teacherIds: string[],
): Promise<TeacherTeachingZonePublicRow[]> {
  const ids = Array.from(new Set(teacherIds.map((id) => String(id).trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("teacher_teaching_zones_public")
    .select(
      "id, teacher_id, label_public, city, region, country_code, lat_public, lng_public, radius_km, zone_kind, is_primary, sort_order, availability_note_public, supports_at_teacher_place, supports_at_student_place, supports_public_place",
    )
    .in("teacher_id", ids)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) {
    warnTeacherZonesUnavailable("fetch", error);
    return [];
  }
  return (data ?? []) as TeacherTeachingZonePublicRow[];
}

export async function attachPublicTeachingZones(
  supabase: SupabaseLike,
  teachers: Teacher[],
): Promise<Teacher[]> {
  if (teachers.length === 0) return teachers;
  try {
    const rows = await fetchTeacherTeachingZonesForTeachers(
      supabase,
      teachers.map((teacher) => teacher.id),
    );
    return attachTeachingZonesToTeachers(teachers, rows);
  } catch (error) {
    warnTeacherZonesUnavailable("attach", error);
    return teachers;
  }
}

export function getPrimaryTeachingZone(teacher: Teacher): TeacherTeachingZone | null {
  const zones = sortTeachingZones((teacher.teachingZones ?? []).filter((zone) => zone.isActive));
  return zones.find((zone) => zone.isPrimary) ?? zones[0] ?? null;
}

export function getTeachingZoneCoords(zone: TeacherTeachingZone | null | undefined): { lat: number; lng: number } | null {
  if (!zone) return null;
  if (
    typeof zone.lat === "number" &&
    typeof zone.lng === "number" &&
    Number.isFinite(zone.lat) &&
    Number.isFinite(zone.lng) &&
    !(zone.lat === 0 && zone.lng === 0)
  ) {
    return { lat: zone.lat, lng: zone.lng };
  }
  return null;
}

function foldLocationToken(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function teachingZoneMatchesLocationText(
  zone: TeacherTeachingZone,
  location: { city?: string | null; region?: string | null } | null | undefined,
): boolean {
  return teachingZoneLocationTextScore(zone, location) > 0;
}

function teachingZoneLocationTextScore(
  zone: TeacherTeachingZone,
  location: { city?: string | null; region?: string | null } | null | undefined,
): number {
  if (!location) return 0;
  const city = foldLocationToken(location.city);
  const region = foldLocationToken(location.region);
  if (!city && !region) return 0;
  const zoneCity = foldLocationToken(zone.city);
  const zoneRegion = foldLocationToken(zone.region);
  const zoneLabel = foldLocationToken(zone.labelPublic);
  if (city && (zoneCity === city || zoneCity.includes(city) || city.includes(zoneCity))) return 3;
  if (city && zoneLabel.includes(city)) return 2;
  if (region && zoneRegion && zoneRegion === region) return 1;
  return 0;
}

export function getBestMatchingTeachingZone(
  teacher: Teacher,
  opts: {
    geo?: { lat: number; lng: number } | null;
    locationText?: { city?: string | null; region?: string | null } | null;
  } = {},
): { zone: TeacherTeachingZone | null; distanceKm: number | null; textMatched: boolean } {
  const zones = sortTeachingZones((teacher.teachingZones ?? []).filter((zone) => zone.isActive));
  if (zones.length === 0) return { zone: null, distanceKm: null, textMatched: false };

  let best: { zone: TeacherTeachingZone; distanceKm: number | null; textMatched: boolean; textScore: number } | null =
    null;
  for (const zone of zones) {
    const coords = getTeachingZoneCoords(zone);
    const distanceKm = opts.geo && coords ? haversineDistance(opts.geo.lat, opts.geo.lng, coords.lat, coords.lng) : null;
    const textScore = teachingZoneLocationTextScore(zone, opts.locationText);
    const textMatched = textScore > 0;
    if (!best) {
      best = { zone, distanceKm, textMatched, textScore };
      continue;
    }
    if (distanceKm != null && (best.distanceKm == null || distanceKm < best.distanceKm)) {
      best = { zone, distanceKm, textMatched, textScore };
      continue;
    }
    if (best.distanceKm == null && textScore > best.textScore) {
      best = { zone, distanceKm, textMatched, textScore };
    }
  }

  return best ?? { zone: getPrimaryTeachingZone(teacher), distanceKm: null, textMatched: false };
}

export function getTeacherMapCoords(teacher: Teacher): { lat: number; lng: number } | null {
  const matchedCoords = getTeachingZoneCoords(teacher.matchedTeachingZone);
  if (matchedCoords) return matchedCoords;
  const primaryCoords = getTeachingZoneCoords(getPrimaryTeachingZone(teacher));
  if (primaryCoords) return primaryCoords;
  const lat = teacher.location?.lat;
  const lng = teacher.location?.lng;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  ) {
    return { lat, lng };
  }
  return null;
}

export function formatTeachingZoneLabel(zone: TeacherTeachingZone | null | undefined): string | null {
  if (!zone) return null;
  const label = cleanString(zone.labelPublic);
  if (label) return label;
  const city = cleanString(zone.city);
  const region = cleanNullableString(zone.region, 80);
  return city ? `${city}${region ? `, ${region}` : ""}` : null;
}
