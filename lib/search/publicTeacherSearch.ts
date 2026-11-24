import { CITIES } from "@/lib/cities";
import { normalizePlaceQuery } from "@/lib/search/canadianPlaces";
import { getDisciplineLabel, getExpandedDisciplineSearchIds } from "@/lib/taxonomy/disciplines";
import { hasDeclaredLocalSupply } from "@/lib/teachers/localSupply";
import type { RawDiscoveryTeacher } from "@/lib/seo/localTeacherDiscoveryPages";

const formats = ["all", "online", "in_person", "hybrid", "at_home"] as const;
export type PublicSearchFormat = (typeof formats)[number];
type QueryValue = string | string[] | undefined;
export function publicSearchFilters(params: Record<string, QueryValue>) {
  const first = (value: QueryValue) => (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 150) ?? "";
  const format = formats.find(value => value === first(params.format)) ?? "all";
  return { q: first(params.q), place: first(params.place), format };
}

export function filterPublicTeachers(rows: RawDiscoveryTeacher[], filters: ReturnType<typeof publicSearchFilters>) {
  const query = normalizePlaceQuery(filters.q);
  const subjectIds = getExpandedDisciplineSearchIds(filters.q);
  const [name, province] = filters.place.split(",").map(value => normalizePlaceQuery(value));
  const city = name ? CITIES.find(item => normalizePlaceQuery(item.name) === name &&
    (!province || normalizePlaceQuery(item.province ?? "") === province)) : undefined;

  return rows.filter(row => {
    const mode = row.teaching_mode ?? "";
    const hybrid = mode === "both" || mode === "all";
    const online = hybrid || mode === "online";
    const inPerson = hybrid || ["person", "home", "in_person", "in-person"].includes(mode);
    if (filters.format === "online" && !online) return false;
    if (filters.format === "hybrid" && !hybrid) return false;
    if (filters.format === "in_person" && !inPerson) return false;
    if (filters.format === "at_home" && mode !== "home" && mode !== "all" &&
      !row.teachingZones?.some(zone => zone.isActive && zone.supportsAtStudentPlace)) return false;
    if (name && filters.format !== "online" && (!city || !hasDeclaredLocalSupply(row, city))) return false;
    if (!query) return true;

    const ids = [row.discipline ?? "", ...(row.disciplineIds ?? [])];
    if (ids.some(id => subjectIds.has(id))) return true;
    return [row.name, row.category, ...ids, ...ids.flatMap(id => ["fr", "en", "es"].map(lang => getDisciplineLabel(id, lang)))]
      .some(label => typeof label === "string" && normalizePlaceQuery(label).includes(query));
  });
}
