import type { Teacher } from "@/types";
import { isFounderTeacher } from "@/lib/teachers/founderTeachers";
import { isPlaceholderDisciplineLabel } from "@/lib/teacherMapper";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";

/**
 * Ranking-only helpers for public teacher search.
 * Visibility gates are unchanged — incomplete / no-photo teachers stay discoverable.
 */

const PLACEHOLDER_PHOTO_RE = /picsum\.photos|placehold\.co|via\.placeholder|dummyimage\.com/i;
const PLACEHOLDER_BIO_RE =
  /^(n\/?a|na|none|null|undefined|todo|tbd|bio|description|à\s*compléter|a\s*completer|coming\s*soon|\.+|-+)$/i;

/** True when the listing photo is a real avatar (not empty / stock placeholder). */
export function teacherHasUsableProfilePhoto(imageUrl: string | null | undefined): boolean {
  const raw = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!raw) return false;
  if (PLACEHOLDER_PHOTO_RE.test(raw)) return false;
  return true;
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
 * Hard quality bucket used before founder boost.
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
 * 0–100 ranking completeness. Photo/bio are also hard sort keys above this score.
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

function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Exact/name-specific match may waive the photo/bio quality hard rule. */
export function teacherMatchesExactNameQuery(teacher: Teacher, searchQuery: string | null | undefined): boolean {
  const q = foldName(searchQuery ?? "");
  if (!q || q.length < 2) return false;
  const name = foldName(teacher.name ?? "");
  if (!name) return false;
  return name === q || name.startsWith(`${q} `) || name.endsWith(` ${q}`) || name.includes(` ${q} `);
}

/**
 * Deterministic quality ordering for public search (relevance mode).
 *
 * Order: exact name → photo+bio tier → founder → completeness → rate → availability → id.
 * Founder never outranks a higher photo/bio quality tier.
 */
export function compareTeachersBySearchQuality(
  a: Teacher,
  b: Teacher,
  opts?: { searchQuery?: string | null; isFounder?: (teacherId: string) => boolean },
): number {
  const q = opts?.searchQuery ?? null;
  const aExact = teacherMatchesExactNameQuery(a, q);
  const bExact = teacherMatchesExactNameQuery(b, q);
  if (aExact !== bExact) return aExact ? -1 : 1;

  // Among peers (both exact or both non-exact), quality tier wins before founder.
  if (aExact === bExact) {
    const aTier = teacherSearchQualityTier(a);
    const bTier = teacherSearchQualityTier(b);
    if (aTier !== bTier) return bTier - aTier;
  }

  const aFounder = teacherIsFounderForRanking(a, opts?.isFounder);
  const bFounder = teacherIsFounderForRanking(b, opts?.isFounder);
  if (aFounder !== bFounder) return aFounder ? -1 : 1;

  const aScore = computeTeacherProfileCompletenessScore(a);
  const bScore = computeTeacherProfileCompletenessScore(b);
  if (bScore !== aScore) return bScore - aScore;

  const aRate = teacherHasUsableRate(a.pricePerLesson);
  const bRate = teacherHasUsableRate(b.pricePerLesson);
  if (aRate !== bRate) return aRate ? -1 : 1;

  const aAvail = teacherHasAvailability(a.availability);
  const bAvail = teacherHasAvailability(b.availability);
  if (aAvail !== bAvail) return aAvail ? -1 : 1;

  return String(a.id).localeCompare(String(b.id));
}
