import type { Teacher } from "@/types";
import type { StudentSavedLocation } from "@/lib/studentLocation";

/** Profile row fragments used for prioritizing marketplace results (students). */
export type StudentLocationPrefs = {
  country_code: string | null;
  timezone: string | null;
  currency: string | null;
  city: string | null;
  region: string | null;
  preferred_learning_format: string | null;
  student_location?: StudentSavedLocation | null;
};

export type TeacherLocationMatchFields = {
  teachingMode?: string | null;
  homeLessonEnabled?: boolean | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  location?: { neighborhood?: string | undefined };
  teachingZones?: Array<{ city?: string | null; region?: string | null; labelPublic?: string | null }>;
};

export function normalizeLocationToken(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function teacherCityLabel(t: TeacherLocationMatchFields): string | null {
  const c = String(t.city ?? "").trim();
  if (c) return c;
  const n = String(t.location?.neighborhood ?? "").trim();
  return n || null;
}

function teachingZoneLocationAffinity(t: TeacherLocationMatchFields, prefs: StudentLocationPrefs): number {
  const zones = Array.isArray(t.teachingZones) ? t.teachingZones : [];
  if (zones.length === 0) return 0;
  const prefCity = normalizeLocationToken(prefs.city);
  const prefRegion = normalizeLocationToken(prefs.region);
  let score = 0;
  for (const zone of zones) {
    const city = normalizeLocationToken(zone.city);
    const region = normalizeLocationToken(zone.region);
    const label = normalizeLocationToken(zone.labelPublic);
    if (prefRegion && region && prefRegion === region) score = Math.max(score, 18);
    if (
      prefCity &&
      ((city && (prefCity === city || city.includes(prefCity) || prefCity.includes(city))) ||
        (label && label.includes(prefCity)))
    ) {
      score = Math.max(score, 30);
    }
  }
  return score;
}

function teachingModeAllowsOnline(mode: string | null | undefined): boolean {
  const m = normalizeLocationToken(mode ?? "");
  return m === "online" || m === "both" || m === "all" || m === "hybrid";
}

function teachingModeAllowsPersonOrHome(mode: string | null | undefined): boolean {
  const m = normalizeLocationToken(mode ?? "");
  return m === "person" || m === "both" || m === "all" || m === "hybrid" || m === "home";
}

function learningFormatAffinity(t: TeacherLocationMatchFields, pref: string): number {
  const p = normalizeLocationToken(pref);
  if (!p || p === "no_preference") return 0;

  const mode = normalizeLocationToken(t.teachingMode ?? "");
  const hl = Boolean(t.homeLessonEnabled);
  const onlineOk = teachingModeAllowsOnline(mode);
  const personOk = teachingModeAllowsPersonOrHome(mode);

  if (p === "online") return onlineOk ? 10 : 0;
  if (p === "at_home") {
    if (mode === "home" || mode === "all" || hl) return 12;
    return 0;
  }
  if (p === "in_person") {
    if (mode === "online") return 0;
    return personOk ? 10 : 0;
  }
  if (p === "hybrid") {
    if (mode === "both" || mode === "all") return 12;
    if (onlineOk && personOk) return 10;
    return 0;
  }
  return 0;
}

/**
 * Positive score used as a tie-break (same pool of teachers — never hides results).
 * For `online` format pref, geographic boosts are minimized.
 */
export function teacherStudentPrefScore(t: TeacherLocationMatchFields, prefs: StudentLocationPrefs | null | undefined): number {
  if (!prefs) return 0;

  let score = 0;
  const prefFmt = prefs.preferred_learning_format ?? "";
  score += learningFormatAffinity(t, prefFmt);

  const onlineHeavy = normalizeLocationToken(prefFmt) === "online";

  const pc = String(prefs.country_code ?? "").trim().toUpperCase();
  const tc = String(t.countryCode ?? "").trim().toUpperCase();
  if (pc && tc && pc === tc) score += onlineHeavy ? 2 : 12;

  if (!onlineHeavy) {
    const zoneScore = teachingZoneLocationAffinity(t, prefs);
    if (zoneScore > 0) {
      score += zoneScore;
    } else {
      const pr = normalizeLocationToken(prefs.region);
      const tr = normalizeLocationToken(t.region);
      if (pr && tr && pr === tr) score += 18;

      const pcity = normalizeLocationToken(prefs.city);
      const tCity = normalizeLocationToken(teacherCityLabel(t));
      if (pcity && tCity && (pcity === tCity || tCity.includes(pcity) || pcity.includes(tCity))) score += 30;
    }
  }

  const pTz = String(prefs.timezone ?? "").trim();
  const tTz = String(t.timezone ?? "").trim();
  if (pTz && tTz && pTz === tTz) score += 4;

  return score;
}

export function teacherPrefCompareStudents(
  teacherA: Teacher,
  teacherB: Teacher,
  prefs: StudentLocationPrefs | null | undefined,
): number {
  if (!prefs) return 0;
  const sb = teacherStudentPrefScore(teacherB, prefs);
  const sa = teacherStudentPrefScore(teacherA, prefs);
  return sb !== sa ? sb - sa : 0;
}

/** Raw row from quiz select (snake_case + jsonb location). */
export type QuizTeacherMatchRow = {
  teaching_mode?: string | null;
  home_lesson_enabled?: boolean | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  location?: unknown;
};

export function teacherStudentPrefScoreFromQuizRow(row: QuizTeacherMatchRow, prefs: StudentLocationPrefs | null): number {
  return teacherStudentPrefScore(
    {
      teachingMode: row.teaching_mode,
      homeLessonEnabled: row.home_lesson_enabled,
      countryCode: row.country_code,
      city: row.city,
      region: row.region,
      timezone: row.timezone,
      location: (row.location ?? {}) as { neighborhood?: string },
    },
    prefs,
  );
}
