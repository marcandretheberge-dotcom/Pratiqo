import type { Teacher } from "@/types";
import { CITIES, type City } from "@/lib/cities";
import { resolveDisciplineId } from "@/lib/taxonomy/disciplines";
import { hasDeclaredLocalSupply } from "@/lib/teachers/localSupply";
import { compareTeachersBySearchQuality } from "@/lib/teachers/searchRanking";
import { normalizeTeacherSubjectIds } from "@/lib/taxonomy/teacherSubjectNormalization";
import { parseLearnerAvailability, type LearnerAvailability } from "@/lib/learnerAvailability";

export type LearnerDemandInput = {
  subject: string;
  city: string;
  region?: string | null;
  countryCode?: string | null;
  acceptsOnline: boolean;
  requestedFormat?: "in_person" | "online";
  email: string;
  locale?: string | null;
  source?: string | null;
  availabilityPreference?: LearnerAvailability;
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

function allowsOnlineLessons(teacher: Teacher): boolean {
  return teacher.teachingMode === "online" || teacher.teachingMode === "both" || teacher.teachingMode === "all";
}

function teacherSearchUrl(subject: string, teacherId: string, city: string, online: boolean, availability?: LearnerAvailability): string {
  const params = new URLSearchParams({ q: subject, openTeacher: teacherId, source: "learner_finder" });
  params.set("city", city);
  params.set("format", online ? "online" : "in_person");
  params.set("availability", parseLearnerAvailability(availability));
  return `/student/search?${params.toString()}`;
}

export function matchLearnerDemand(
  teachers: Teacher[],
  input: Pick<LearnerDemandInput, "subject" | "city" | "acceptsOnline" | "requestedFormat" | "availabilityPreference">,
): LearnerDemandMatch {
  const wanted = resolveDisciplineId(input.subject);
  // Unknown/free-text needs remain actionable waitlist requests, not guessed matches.
  const uniqueTeachers = [...new Map(teachers.map(teacher => [teacher.id, teacher])).values()];
  const subjectMatches = uniqueTeachers.filter((teacher) =>
    (teacher.bookingAction === "book" || teacher.bookingAction === "request" ||
      (teacher.bookingAction == null && teacher.bookingReady === true)) && wanted !== null &&
    normalizeTeacherSubjectIds([
      { discipline_id: teacher.discipline },
      ...(teacher.disciplineDisplay ?? []).map(row => ({ discipline_id: row.disciplineId, specialite: row.specialite })),
      ...(teacher.additionalDisciplines ?? []).map(row => ({ discipline_id: row.disciplineId, specialite: row.specialite })),
    ]).includes(wanted));
  const resolvedCity = findLearnerDemandCity(input.city);
  const localMatches = subjectMatches.filter(
    (teacher) => hasDeclaredLocalSupply({ ...teacher, teaching_mode: teacher.teachingMode },
      resolvedCity ?? { name: input.city, lat: Number.NaN, lng: Number.NaN }),
  ).sort((a, b) => compareTeachersBySearchQuality(a, b));

  if (input.requestedFormat !== "online" && localMatches.length > 0) {
    const primary = localMatches[0];
    return {
      outcome: "local_match",
      matchCount: localMatches.length,
      searchUrl: teacherSearchUrl(wanted!, primary.id, resolvedCity?.name ?? "", false, input.availabilityPreference),
      primaryTeacherId: primary.id,
    };
  }

  if (input.requestedFormat === "online" || input.acceptsOnline) {
    const onlineMatches = subjectMatches.filter(allowsOnlineLessons)
      .sort((a, b) => compareTeachersBySearchQuality(a, b, { onlineSearch: true }));
    if (onlineMatches.length > 0) {
      const primary = onlineMatches[0];
      return {
        outcome: "online_match",
        matchCount: onlineMatches.length,
        searchUrl: teacherSearchUrl(wanted!, primary.id, resolvedCity?.name ?? "", true, input.availabilityPreference),
        primaryTeacherId: primary.id,
      };
    }
  }

  return { outcome: "waitlist", matchCount: 0, searchUrl: null, primaryTeacherId: null };
}

export function buildTeacherRecruitShareUrl(subject: string, city: string): string {
  // Share links must not echo unrestricted learner text into URLs or analytics referrers.
  const params = new URLSearchParams({ matiere: resolveDisciplineId(subject) ?? "", ville: findLearnerDemandCity(city)?.name ?? "", source: "learner_waitlist" });
  return `/devenir-professeur?${params.toString()}`;
}
