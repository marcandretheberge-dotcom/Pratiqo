import type { Teacher } from "@/types";
import { haversineDistance } from "@/lib/geo";
import { teacherMatchesExploreCategory, teacherMatchesExploreSearch } from "@/lib/teacherDisciplines";
import type { TeacherSearchCriteria, TeacherSearchFormat } from "@/lib/teacherSearchCriteria";
import { teacherStudentPrefScore } from "@/lib/studentLocationSearch";
import { teacherMatchesAvailabilityWindow } from "@/lib/slots";

function foldAscii(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function teacherAllowsFormat(teacher: Teacher, format: TeacherSearchFormat | null | undefined): boolean {
  const f = format ?? "no_preference";
  if (f === "no_preference") return true;
  if (f === "online") return teacher.teachingMode === "online" || teacher.teachingMode === "both" || teacher.teachingMode === "all";
  if (f === "hybrid") return teacher.teachingMode === "both" || teacher.teachingMode === "all";
  if (f === "at_home") return teacher.teachingMode === "home" || teacher.teachingMode === "all" || Boolean(teacher.homeLessonEnabled);
  // in_person
  return teacher.teachingMode === "person" || teacher.teachingMode === "home" || teacher.teachingMode === "both" || teacher.teachingMode === "all";
}

function teacherMatchesQuizCategory(teacher: Teacher, category: string | null | undefined): boolean {
  if (!category) return true;
  const c = foldAscii(category);
  const tc = foldAscii(String(teacher.category ?? ""));
  const td = foldAscii(String(teacher.discipline ?? ""));
  if (c === "music") return tc.includes("musique") || td.includes("piano") || td.includes("guit") || td.includes("viol");
  if (c === "languages") return tc.includes("lang") || td.includes("anglais") || td.includes("english") || td.includes("franc") || td.includes("espagn");
  if (c === "academic") return tc.includes("scol") || td.includes("math") || td.includes("science") || td.includes("chim") || td.includes("phys");
  return true;
}

function teacherMatchesSubject(teacher: Teacher, subject: string | null | undefined): boolean {
  const s = foldAscii(subject ?? "");
  if (!s) return true;
  return foldAscii(teacher.discipline).includes(s) || foldAscii(teacher.name).includes(s);
}

const QUIZ_CATEGORY_SLUGS = new Set(["music", "languages", "academic"]);

function teacherMatchesLanguage(teacher: Teacher, language: string | null | undefined): boolean {
  const lang = foldAscii(language ?? "");
  if (!lang) return true;
  const langs = (teacher.languages ?? []).map((x) => foldAscii(String(x)));
  return langs.some((l) => l.includes(lang) || lang.includes(l));
}

function teacherMatchesLevel(teacher: Teacher, level: string | null | undefined): boolean {
  const lv = foldAscii(level ?? "");
  if (!lv) return true;
  const levels = (teacher.levels ?? []).map((x) => foldAscii(String(x)));
  return levels.some((l) => l.includes(lv) || lv.includes(l));
}


export type TeacherSearchRow = {
  teacher: Teacher;
  /** null when geo not available or teacher has no coords. */
  distanceKm: number | null;
};

export function filterTeacherPool(teachers: Teacher[], criteria: TeacherSearchCriteria): Teacher[] {
  const q = (criteria.searchQuery ?? "").trim();
  const cat = criteria.category;

  return teachers.filter((t) => {
    if (criteria.verifiedOnly && !t.isVerified) return false;
    if (typeof criteria.minRating === "number" && Number.isFinite(criteria.minRating) && (t.rating ?? 0) < criteria.minRating) {
      return false;
    }
    if (typeof criteria.maxPrice === "number" && Number.isFinite(criteria.maxPrice) && (t.pricePerLesson ?? 0) > criteria.maxPrice) {
      return false;
    }
    if (!teacherAllowsFormat(t, criteria.format)) return false;

    if (cat && cat !== "All") {
      const catStr = String(cat);
      if (QUIZ_CATEGORY_SLUGS.has(catStr)) {
        if (!teacherMatchesQuizCategory(t, catStr)) return false;
      } else if (!teacherMatchesExploreCategory(t, catStr)) {
        return false;
      }
    }

    if (criteria.subject && !teacherMatchesSubject(t, criteria.subject)) return false;
    if (q && !teacherMatchesExploreSearch(t, q)) return false;
    if (criteria.language && !teacherMatchesLanguage(t, criteria.language)) return false;
    if (criteria.level && !teacherMatchesLevel(t, criteria.level)) return false;
    if (
      (criteria.availabilityDay || criteria.availabilityPeriod) &&
      !teacherMatchesAvailabilityWindow(t.availability, criteria.availabilityDay, criteria.availabilityPeriod)
    ) {
      return false;
    }
    // teacherPreference is intentionally not used for matching until profile fields exist.
    return true;
  });
}

export function buildTeacherSearchRows(
  teachers: Teacher[],
  opts: { geo: { lat: number; lng: number } | null },
): TeacherSearchRow[] {
  const { geo } = opts;
  return teachers.map((tt) => ({
    teacher: tt,
    distanceKm:
      geo && typeof tt.location?.lat === "number" && typeof tt.location?.lng === "number"
        ? haversineDistance(geo.lat, geo.lng, tt.location.lat, tt.location.lng)
        : null,
  }));
}

export function applyRadiusFilter(
  rows: TeacherSearchRow[],
  radius: 5 | 10 | 25 | 50 | "all" | "online" | null | undefined,
): TeacherSearchRow[] {
  if (!radius || radius === "all") return rows;
  if (radius === "online") {
    return rows.filter((x) => x.teacher.teachingMode === "online" || x.teacher.teachingMode === "both" || x.teacher.teachingMode === "all");
  }
  return rows.filter((x) => x.distanceKm != null && x.distanceKm <= radius);
}

export function sortRows(
  rows: TeacherSearchRow[],
  opts: {
    sortMode: "relevance" | "nearest" | "trusted";
    studentPrefs?: {
      country_code: string | null;
      timezone: string | null;
      currency: string | null;
      city: string | null;
      region: string | null;
      preferred_learning_format: string | null;
    } | null;
  },
): TeacherSearchRow[] {
  const prefs = opts.studentPrefs ?? null;
  const mode = opts.sortMode;
  const scorePref = (t: Teacher) => teacherStudentPrefScore(t, prefs);

  const cmp = (a: TeacherSearchRow, b: TeacherSearchRow) => {
    if (mode === "nearest") {
      if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    }
    if (mode === "trusted") {
      const va = a.teacher.verificationLevel ?? 0;
      const vb = b.teacher.verificationLevel ?? 0;
      if (vb !== va) return vb - va;
    }
    const pd = scorePref(b.teacher) - scorePref(a.teacher);
    if (pd !== 0) return pd;
    return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
  };

  return [...rows].sort(cmp);
}

