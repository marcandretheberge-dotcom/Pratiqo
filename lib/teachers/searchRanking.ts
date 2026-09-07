import type { Teacher } from "@/types";
import { isFounderTeacher } from "@/lib/teachers/founderTeachers";
import { isPlaceholderDisciplineLabel } from "@/lib/teacherMapper";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import { getTeacherPhotoQualityKind } from "@/lib/teacherPhoto";
import { resolveDisciplineId, resolveDisciplineSearchIntent } from "@/lib/taxonomy/disciplines";

/**
 * Ranking-only helpers for public teacher search.
 * Visibility gates are unchanged — incomplete / no-photo teachers stay discoverable.
 */

const PLACEHOLDER_BIO_RE =
  /^(n\/?a|na|none|null|undefined|todo|tbd|bio|description|à\s*compléter|a\s*completer|coming\s*soon|\.+|-+)$/i;

export type TeacherSearchScoreBreakdown = {
  total: number;
  searchMatchScore: number;
  proximityScore: number;
  trustScore: number;
  photoScore: number;
  bioScore: number;
  completenessScore: number;
  readinessScore: number;
  founderScore: number;
  ratingScore: number;
  tieBreakerScore: number;
};

export type TeacherSearchScoreContext = {
  searchQuery?: string | null;
  distanceKm?: number | null;
  /** When true, proximity is ignored / near-zero (online search). */
  onlineSearch?: boolean;
  /** User has selected a location / geo context. */
  hasLocationContext?: boolean;
  isFounder?: (teacherId: string) => boolean;
};

/** True when the listing photo is not empty / stock placeholder. */
export function teacherHasUsableProfilePhoto(imageUrl: string | null | undefined): boolean {
  const kind = getTeacherPhotoQualityKind(imageUrl);
  return kind === "uploaded" || kind === "google_oauth" || kind === "other_external";
}

export function teacherHasUsableRate(pricePerLesson: number | null | undefined): boolean {
  const n = Number(pricePerLesson);
  return Number.isFinite(n) && n >= MIN_LESSON_PRICE_DOLLARS;
}

export function teacherHasAvailability(availability: unknown): boolean {
  return Array.isArray(availability) && availability.length > 0;
}

/** Meaningful public bio for ranking (not blank / placeholder fluff). */
export function teacherHasMeaningfulBio(bio: string | null | undefined): boolean {
  const raw = String(bio ?? "").trim();
  if (raw.length < 30) return false;
  if (PLACEHOLDER_BIO_RE.test(raw)) return false;
  return true;
}

/** @deprecated Prefer teacherHasMeaningfulBio — kept for older call sites. */
export function teacherHasBio(bio: string | null | undefined): boolean {
  return teacherHasMeaningfulBio(bio);
}

export function teacherHasLocationSignal(teacher: Pick<Teacher, "city" | "region" | "teachingMode" | "location">): boolean {
  if (teacher.teachingMode === "online" || teacher.teachingMode === "both" || teacher.teachingMode === "all") {
    return true;
  }
  if (String(teacher.city ?? "").trim()) return true;
  if (String(teacher.region ?? "").trim()) return true;
  const lat = teacher.location?.lat;
  const lng = teacher.location?.lng;
  return typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
}

export function teacherHasDisciplineSignal(teacher: Pick<Teacher, "discipline" | "category" | "disciplineDisplay">): boolean {
  if (teacher.disciplineDisplay && teacher.disciplineDisplay.length > 0) {
    return teacher.disciplineDisplay.some((row) => !isPlaceholderDisciplineLabel(row.label));
  }
  return !isPlaceholderDisciplineLabel(teacher.discipline);
}

/**
 * Legacy quality bucket (kept for tests / diagnostics).
 * 3 = photo + bio, 2 = photo only, 1 = bio only, 0 = neither.
 */
export function teacherSearchQualityTier(teacher: Teacher): number {
  const photo = teacherHasUsableProfilePhoto(teacher.imageUrl);
  const bio = teacherHasMeaningfulBio(teacher.bio);
  if (photo && bio) return 3;
  if (photo) return 2;
  if (bio) return 1;
  return 0;
}

/**
 * 0–100 ranking completeness component (scaled into weighted score).
 */
export function computeTeacherProfileCompletenessScore(teacher: Teacher): number {
  let score = 0;
  if (teacherHasUsableProfilePhoto(teacher.imageUrl)) score += 25;
  if (teacherHasDisciplineSignal(teacher)) score += 20;
  if (teacherHasUsableRate(teacher.pricePerLesson)) score += 15;
  if (teacherHasAvailability(teacher.availability)) score += 15;
  if (teacherHasMeaningfulBio(teacher.bio)) score += 15;
  if (teacherHasLocationSignal(teacher)) score += 10;
  return score;
}

export function teacherIsFounderForRanking(
  teacher: Teacher,
  isFounder?: (teacherId: string) => boolean,
): boolean {
  if (isFounder) return isFounder(teacher.id);
  return isFounderTeacher(teacher.id);
}

function foldAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Exact/name-specific match (preserved for callers / diagnostics). */
export function teacherMatchesExactNameQuery(teacher: Teacher, searchQuery: string | null | undefined): boolean {
  const q = foldAscii(searchQuery ?? "");
  if (!q || q.length < 2) return false;
  const name = foldAscii(teacher.name ?? "");
  if (!name) return false;
  return name === q || name.startsWith(`${q} `) || name.endsWith(` ${q}`) || name.includes(` ${q} `);
}

export function computeTeacherPhotoScore(imageUrl: string | null | undefined): number {
  switch (getTeacherPhotoQualityKind(imageUrl)) {
    case "uploaded":
      return 90;
    case "google_oauth":
      return 45;
    case "other_external":
      return 35;
    default:
      return 0;
  }
}

export function computeTeacherBioScore(bio: string | null | undefined): number {
  const raw = String(bio ?? "").trim();
  if (!raw || PLACEHOLDER_BIO_RE.test(raw)) return 0;
  if (raw.length < 30) return 10;
  if (raw.length < 100) return 45;
  if (raw.length < 300) return 70;
  return 90;
}

export function computeTeacherTrustScore(teacher: Teacher): number {
  let score = 0;
  if (teacher.identityVerified === true) score += 85;
  if (teacher.diplomaVerified === true) score += 80;
  if (teacher.verifiedExperience === true) score += 70;
  const level = Number(teacher.verificationLevel ?? 0);
  if (Number.isFinite(level)) {
    if (level >= 3) score += 60;
    else if (level === 2) score += 40;
    else if (level === 1) score += 20;
  }
  return Math.min(220, score);
}

export function computeTeacherProximityScore(
  distanceKm: number | null | undefined,
  opts?: { onlineSearch?: boolean; hasLocationContext?: boolean },
): number {
  if (opts?.onlineSearch) return 0;
  if (typeof distanceKm === "number" && Number.isFinite(distanceKm) && distanceKm >= 0) {
    if (distanceKm <= 5) return 180;
    if (distanceKm <= 15) return 145;
    if (distanceKm <= 30) return 110;
    if (distanceKm <= 50) return 70;
    if (distanceKm <= 100) return 35;
    return 0;
  }
  // Soft nudge when user has a location but teacher coords are unknown — avoid over-penalizing.
  if (opts?.hasLocationContext) return 10;
  return 0;
}

export function computeTeacherSearchMatchScore(
  teacher: Teacher,
  searchQuery: string | null | undefined,
): number {
  const q = foldAscii(searchQuery ?? "");
  if (!q || q.length < 2) return 0;

  // Exact name must outrank a fully-built peer without a name match
  // (trust+photo+bio+completeness can exceed ~350).
  if (teacherMatchesExactNameQuery(teacher, searchQuery)) return 400;

  const name = foldAscii(teacher.name ?? "");
  if (name && (name.includes(q) || q.includes(name))) return 280;

  const intent = resolveDisciplineSearchIntent(searchQuery);
  const disciplineIds = new Set<string>();
  const labels: string[] = [];

  if (!isPlaceholderDisciplineLabel(teacher.discipline)) {
    labels.push(foldAscii(teacher.discipline));
    const id = resolveDisciplineId(teacher.discipline);
    if (id) disciplineIds.add(id);
  }
  for (const row of teacher.disciplineDisplay ?? []) {
    labels.push(foldAscii(row.label));
    if (row.specialite) labels.push(foldAscii(row.specialite));
    const id = resolveDisciplineId(row.disciplineId) ?? foldAscii(row.disciplineId);
    if (id) disciplineIds.add(id);
  }
  for (const ad of teacher.additionalDisciplines ?? []) {
    if (ad.specialite) labels.push(foldAscii(ad.specialite));
    const id = resolveDisciplineId(ad.disciplineId) ?? foldAscii(ad.disciplineId);
    if (id) disciplineIds.add(id);
  }

  // Exact specialty / primary id match outranks parent-group expansion.
  if (intent.primaryId && disciplineIds.has(intent.primaryId)) return 250;
  if (labels.some((l) => l === q)) return 250;
  // Parent intent (e.g. coach_sportif) matching a child specialty.
  if (
    intent.expandedIds.size > 0 &&
    [...disciplineIds].some((id) => intent.expandedIds.has(id))
  ) {
    return 170;
  }
  if (labels.some((l) => l.includes(q) || q.includes(l))) return 180;

  const city = foldAscii(String(teacher.city ?? ""));
  const region = foldAscii(String(teacher.region ?? ""));
  const bio = foldAscii(String(teacher.bio ?? ""));
  if ((city && city.includes(q)) || (region && region.includes(q))) return 80;
  if (bio && bio.includes(q) && q.length >= 4) return 40;

  return 0;
}

export function computeTeacherReadinessScore(teacher: Teacher): number {
  let score = 0;
  if (teacherHasUsableRate(teacher.pricePerLesson)) score += 20;
  if (teacherHasAvailability(teacher.availability)) score += 20;
  if (Number(teacher.reviews ?? 0) > 0) score += 10;
  return Math.min(50, score);
}

export function computeTeacherRatingScore(teacher: Teacher): number {
  const reviews = Number(teacher.reviews ?? 0);
  const rating = Number(teacher.rating ?? 0);
  if (!Number.isFinite(reviews) || reviews < 3) return 0;
  if (!Number.isFinite(rating) || rating <= 0) return 0;
  // Cap so a few reviews cannot dominate trust/distance.
  const reviewWeight = Math.min(1, reviews / 10);
  return Math.min(40, Math.round(rating * 6 * reviewWeight));
}

export function computeTeacherFounderScore(
  teacher: Teacher,
  isFounder?: (teacherId: string) => boolean,
): number {
  return teacherIsFounderForRanking(teacher, isFounder) ? 25 : 0;
}

/**
 * Weighted public search score. Visibility is unchanged — this is ranking only.
 */
export function computeTeacherSearchScore(
  teacher: Teacher,
  ctx: TeacherSearchScoreContext = {},
): TeacherSearchScoreBreakdown {
  const searchMatchScore = computeTeacherSearchMatchScore(teacher, ctx.searchQuery);
  const proximityScore = computeTeacherProximityScore(ctx.distanceKm, {
    onlineSearch: ctx.onlineSearch,
    hasLocationContext: ctx.hasLocationContext,
  });
  const trustScore = computeTeacherTrustScore(teacher);
  const photoScore = computeTeacherPhotoScore(teacher.imageUrl);
  const bioScore = computeTeacherBioScore(teacher.bio);
  const completenessRaw = computeTeacherProfileCompletenessScore(teacher);
  const completenessScore = Math.round((completenessRaw / 100) * 80);
  const readinessScore = computeTeacherReadinessScore(teacher);
  const founderScore = computeTeacherFounderScore(teacher, ctx.isFounder);
  const ratingScore = computeTeacherRatingScore(teacher);
  // Tiny deterministic nudge from id hash — never dominates; UUID localeCompare is final only.
  const tieBreakerScore = 0;

  const total =
    searchMatchScore +
    proximityScore +
    trustScore +
    photoScore +
    bioScore +
    completenessScore +
    readinessScore +
    founderScore +
    ratingScore +
    tieBreakerScore;

  return {
    total,
    searchMatchScore,
    proximityScore,
    trustScore,
    photoScore,
    bioScore,
    completenessScore,
    readinessScore,
    founderScore,
    ratingScore,
    tieBreakerScore,
  };
}

/**
 * Deterministic quality ordering for public search (relevance mode).
 * Higher weighted score first; UUID is final tie-breaker only.
 */
export function compareTeachersBySearchQuality(
  a: Teacher,
  b: Teacher,
  opts?: TeacherSearchScoreContext & {
    distanceKmA?: number | null;
    distanceKmB?: number | null;
  },
): number {
  const scoreA = computeTeacherSearchScore(a, {
    searchQuery: opts?.searchQuery,
    distanceKm: opts?.distanceKmA ?? opts?.distanceKm,
    onlineSearch: opts?.onlineSearch,
    hasLocationContext: opts?.hasLocationContext,
    isFounder: opts?.isFounder,
  });
  const scoreB = computeTeacherSearchScore(b, {
    searchQuery: opts?.searchQuery,
    distanceKm: opts?.distanceKmB ?? opts?.distanceKm,
    onlineSearch: opts?.onlineSearch,
    hasLocationContext: opts?.hasLocationContext,
    isFounder: opts?.isFounder,
  });
  if (scoreB.total !== scoreA.total) return scoreB.total - scoreA.total;
  return String(a.id).localeCompare(String(b.id));
}
