import type { Teacher } from "@/types";
import { CITIES, type City } from "@/lib/cities";
import { haversineDistance } from "@/lib/geo";
import { filterTeacherPool } from "@/lib/teacherSearchEngine";

export type LearnerDemandInput = {
  subject: string;
  city: string;
  region?: string | null;
  countryCode?: string | null;
  acceptsOnline: boolean;
  email: string;
  locale?: string | null;
  source?: string | null;
};

export type LearnerDemandOutcome = "local_match" | "online_match" | "waitlist";

export type LearnerDemandMatch = {
  outcome: LearnerDemandOutcome;
  matchCount: number;
  searchUrl: string | null;
  primaryTeacherId: string | null;
};

export function foldLearnerDemandText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLearnerEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function findLearnerDemandCity(city: string): City | null {
  const wanted = foldLearnerDemandText(city);
  if (!wanted) return null;
  return (
    CITIES.find((candidate) => foldLearnerDemandText(candidate.name) === wanted) ??
    CITIES.find((candidate) => {
      const label = `${candidate.name}, ${candidate.province ?? ""}`;
      return foldLearnerDemandText(label) === wanted;
    }) ??
    null
  );
}

function allowsLocalLessons(teacher: Teacher): boolean {
  return (
    teacher.teachingMode === "person" ||
    teacher.teachingMode === "both" ||
    teacher.teachingMode === "home" ||
    teacher.teachingMode === "all" ||
    Boolean(teacher.homeLessonEnabled)
  );
}

function allowsOnlineLessons(teacher: Teacher): boolean {
  return teacher.teachingMode === "online" || teacher.teachingMode === "both" || teacher.teachingMode === "all";
}

function teacherIsNearCity(teacher: Teacher, city: string, resolvedCity: City | null): boolean {
  const exactCityMatch = foldLearnerDemandText(teacher.city) === foldLearnerDemandText(city);
  if (exactCityMatch) return true;
  if (!resolvedCity) return false;

  const lat = teacher.location?.lat;
  const lng = teacher.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return false;
  return haversineDistance(resolvedCity.lat, resolvedCity.lng, lat, lng) <= 25;
}

function teacherSearchUrl(subject: string, teacherId: string): string {
  const params = new URLSearchParams({ q: subject, openTeacher: teacherId, source: "learner_finder" });
  return `/student/search?${params.toString()}`;
}

export function matchLearnerDemand(
  teachers: Teacher[],
  input: Pick<LearnerDemandInput, "subject" | "city" | "acceptsOnline">,
): LearnerDemandMatch {
  const subjectMatches = filterTeacherPool(teachers, { searchQuery: input.subject });
  const resolvedCity = findLearnerDemandCity(input.city);
  const localMatches = subjectMatches.filter(
    (teacher) => allowsLocalLessons(teacher) && teacherIsNearCity(teacher, input.city, resolvedCity),
  );

  if (localMatches.length > 0) {
    const primary = localMatches[0];
    return {
      outcome: "local_match",
      matchCount: localMatches.length,
      searchUrl: teacherSearchUrl(input.subject, primary.id),
      primaryTeacherId: primary.id,
    };
  }

  if (input.acceptsOnline) {
    const onlineMatches = subjectMatches.filter(allowsOnlineLessons);
    if (onlineMatches.length > 0) {
      const primary = onlineMatches[0];
      return {
        outcome: "online_match",
        matchCount: onlineMatches.length,
        searchUrl: teacherSearchUrl(input.subject, primary.id),
        primaryTeacherId: primary.id,
      };
    }
  }

  return { outcome: "waitlist", matchCount: 0, searchUrl: null, primaryTeacherId: null };
}

export function buildTeacherRecruitShareUrl(subject: string, city: string): string {
  const params = new URLSearchParams({ matiere: subject, ville: city, source: "learner_waitlist" });
  return `/devenir-professeur?${params.toString()}`;
}
