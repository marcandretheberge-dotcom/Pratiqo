import type { Teacher, TeacherDisciplineDisplay } from "../types";
import { resolveTeacherPublicPhoto, readTeacherPhotoFromRecord } from "@/lib/teacherPhoto";
import { normalizeLessonDurationMinutes } from "@/lib/pricing/lessonDuration";
import { normalizeAvailableFromDate } from "@/lib/teachers/availabilityStartDate";
import { displayTeacherMarketplaceCategory, getDisciplineById } from "./disciplines";
import { resolveDisciplineId } from "./taxonomy/disciplines";

/** One row from `teacher_disciplines` (same teacher_id may appear in ordered list). */
export type TeacherDisciplineRow = {
  teacher_id: string;
  discipline_id: string;
  specialite: string | null;
};

export type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string;
  discipline: string;
  category: string;
  rating: number;
  reviews: number;
  price_per_lesson: number;
  monthly_subscription: number | null;
  bio: string;
  image_url: string | null;
  profile_photo_url?: string | null;
  availability: unknown;
  location: unknown;
  is_verified: boolean;
  teaching_mode: string;
  languages: string[] | null;
  levels: string[] | null;
  home_lesson_enabled?: boolean | null;
  home_lesson_price?: number | string | null;
  home_lesson_radius_km?: number | null;
  home_lesson_min_duration?: number | null;
  default_lesson_duration_minutes?: number | null;
  available_from_date?: string | null;
  home_lesson_requires_confirmation?: boolean | null;
  home_lesson_force_2h_over_20km?: boolean | null;
  intro_session_enabled?: boolean | null;
  intro_session_duration_minutes?: number | null;
  intro_session_price_cents?: number | null;
  intro_session_discount_percent?: number | null;
  verification_level?: number | null;
  identity_verified?: boolean | null;
  identity_verified_manually?: boolean | null;
  diploma_verified?: boolean | null;
  phone_verified?: boolean | null;
  verified_experience_active?: boolean | null;
  verification_notes?: string | null;
  video_url?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  currency?: string | null;
  city?: string | null;
  region?: string | null;
  identity_status?: string | null;
  stripe_identity_status?: string | null;
  diploma_url?: string | null;
  location_verification_status?: string | null;
  cv_summary?: string | null;
  cv_verification_status?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLaunchEligibleTeacherRow(row: Pick<TeacherRow, "id" | "user_id">): boolean {
  return UUID_RE.test(row.id) && typeof row.user_id === "string" && UUID_RE.test(row.user_id);
}

export function teacherRowToTeacher(row: TeacherRow): Teacher {
  const loc = typeof row.location === "object" && row.location !== null ? (row.location as Record<string, unknown>) : {};
  const publicLoc = typeof loc.public === "object" && loc.public !== null ? (loc.public as Record<string, unknown>) : null;
  const latCandidate =
    (publicLoc && typeof publicLoc.lat === "number" ? publicLoc.lat : undefined) ??
    (typeof loc.lat === "number" ? loc.lat : undefined) ??
    (publicLoc && typeof publicLoc.latitude === "number" ? publicLoc.latitude : undefined);
  const lngCandidate =
    (publicLoc && typeof publicLoc.lng === "number" ? publicLoc.lng : undefined) ??
    (typeof loc.lng === "number" ? loc.lng : undefined) ??
    (publicLoc && typeof publicLoc.longitude === "number" ? publicLoc.longitude : undefined);
  const neighborhoodCandidate =
    (publicLoc && typeof publicLoc.city === "string" ? publicLoc.city : undefined) ??
    (typeof loc.neighborhood === "string" ? loc.neighborhood : undefined);
  const addressCandidate = typeof loc.address === "string" ? loc.address : undefined;
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    discipline: row.discipline,
    category: row.category as Teacher["category"],
    rating: row.rating,
    reviews: row.reviews,
    distance: 0,
    pricePerLesson: Number(row.price_per_lesson),
    monthlySubscription: row.monthly_subscription != null ? Number(row.monthly_subscription) : undefined,
    bio: row.bio,
    imageUrl: resolveTeacherPublicPhoto(
      row.profile_photo_url,
      readTeacherPhotoFromRecord(row as unknown as Record<string, unknown>) || row.image_url,
    ),
    availability: Array.isArray(row.availability) ? (row.availability as string[]) : [],
    location: {
      lat: Number(latCandidate ?? 0),
      lng: Number(lngCandidate ?? 0),
      neighborhood: neighborhoodCandidate,
      address: addressCandidate,
    },
    isVerified: row.is_verified,
    teachingMode: row.teaching_mode as Teacher["teachingMode"],
    languages: row.languages ?? [],
    levels: row.levels ?? [],
    homeLessonEnabled: Boolean(row.home_lesson_enabled),
    homeLessonPrice: (() => {
      if (row.home_lesson_price == null || row.home_lesson_price === "") return undefined;
      const n = Number(row.home_lesson_price);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    homeLessonRadiusKm: row.home_lesson_radius_km ?? 25,
    homeLessonMinDuration: row.home_lesson_min_duration ?? 60,
    defaultLessonDurationMinutes: normalizeLessonDurationMinutes(row.default_lesson_duration_minutes),
    availableFromDate: normalizeAvailableFromDate(row.available_from_date),
    homeLessonRequiresConfirmation: row.home_lesson_requires_confirmation ?? true,
    homeLessonForce2hOver20km: Boolean(row.home_lesson_force_2h_over_20km),
    introSessionEnabled: row.intro_session_enabled === true,
    introSessionDurationMinutes:
      typeof row.intro_session_duration_minutes === "number" && Number.isFinite(row.intro_session_duration_minutes)
        ? Math.max(15, Math.round(row.intro_session_duration_minutes))
        : undefined,
    introSessionPriceCents:
      typeof row.intro_session_price_cents === "number" && Number.isFinite(row.intro_session_price_cents)
        ? Math.max(0, Math.round(row.intro_session_price_cents))
        : null,
    introSessionDiscountPercent:
      typeof row.intro_session_discount_percent === "number" && Number.isFinite(row.intro_session_discount_percent)
        ? Math.max(0, Math.min(95, Math.round(row.intro_session_discount_percent)))
        : undefined,
    verificationLevel: row.verification_level ?? undefined,
    identityVerified: Boolean(row.identity_verified),
    diplomaVerified: Boolean(row.diploma_verified),
    phoneVerified: Boolean(row.phone_verified),
    verifiedExperience: Boolean(row.verified_experience_active),
    identityStatus: row.identity_status ?? null,
    stripeIdentityStatus: row.stripe_identity_status ?? null,
    diplomaUrl: row.diploma_url ?? null,
    locationVerificationStatus: row.location_verification_status ?? null,
    cvSummary: row.cv_summary ?? null,
    cvVerificationStatus: row.cv_verification_status ?? null,
    videoUrl: row.video_url ?? null,
    additionalDisciplines: undefined,
    disciplineDisplay: undefined,
    countryCode: row.country_code ?? undefined,
    timezone: row.timezone ?? undefined,
    currency: row.currency ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
  };
}

export function isPlaceholderDisciplineLabel(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  return !trimmed || trimmed === "—" || trimmed === "-" || trimmed === "–";
}

function foldDisplayKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rowDisplayLabel(row: TeacherDisciplineRow): string {
  const spec = String(row.specialite ?? "").trim();
  if (!isPlaceholderDisciplineLabel(spec)) return spec;
  const meta = getDisciplineById(row.discipline_id);
  if (meta?.label) return meta.label;
  const raw = String(row.discipline_id ?? "").trim();
  return isPlaceholderDisciplineLabel(raw) ? "Autre" : raw;
}

export function buildTeacherDisciplineDisplay(rowsOrdered: TeacherDisciplineRow[]): TeacherDisciplineDisplay[] {
  const out: TeacherDisciplineDisplay[] = [];
  const seen = new Set<string>();
  for (const row of rowsOrdered) {
    const resolved = resolveDisciplineId(row.discipline_id) ?? String(row.discipline_id ?? "").trim();
    const specRaw = String(row.specialite ?? "").trim();
    const spec = isPlaceholderDisciplineLabel(specRaw) ? "" : specRaw;
    const label = rowDisplayLabel(row);
    const key = foldDisplayKey(label) || foldDisplayKey(resolved);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      disciplineId: resolved || "autre",
      label,
      specialite: spec,
    });
  }
  return out;
}

function legacyDisciplineFallback(teacher: Teacher): TeacherDisciplineDisplay[] {
  if (!isPlaceholderDisciplineLabel(teacher.discipline)) {
    return [
      {
        disciplineId: resolveDisciplineId(teacher.discipline) ?? "legacy",
        label: teacher.discipline.trim(),
        specialite: "",
      },
    ];
  }
  const categoryLabel = displayTeacherMarketplaceCategory(String(teacher.category ?? ""));
  if (!isPlaceholderDisciplineLabel(categoryLabel) && categoryLabel !== "Autre") {
    return [
      {
        disciplineId: resolveDisciplineId(categoryLabel) ?? String(teacher.category ?? "autre"),
        label: categoryLabel,
        specialite: "",
      },
    ];
  }
  return [{ disciplineId: "autre", label: "Autre", specialite: "" }];
}

/**
 * Display-only discipline label: capitalize the first visible character.
 * Does not title-case every word (French labels like "Aide aux devoirs").
 */
export function formatTeacherDisciplineLabel(label: string): string {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return trimmed;
  const graphemes = Array.from(trimmed);
  const first = graphemes[0];
  if (!first) return trimmed;
  if (first !== first.toLocaleLowerCase("fr-CA")) return trimmed;
  return first.toLocaleUpperCase("fr-CA") + graphemes.slice(1).join("");
}

function uniqueDisciplineLabels(labels: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    if (isPlaceholderDisciplineLabel(label)) continue;
    const display = formatTeacherDisciplineLabel(label);
    const key = foldDisplayKey(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(display);
  }
  return unique.length > 0 ? unique : ["Autre"];
}

/** Ordered marketplace labels for cards, search, and profile surfaces. */
export function getTeacherDisciplineDisplayLabels(
  teacher: Teacher,
  opts?: { limit?: number },
): string[] {
  const labels =
    teacher.disciplineDisplay && teacher.disciplineDisplay.length > 0
      ? teacher.disciplineDisplay.map((d) => d.label)
      : legacyDisciplineFallback(teacher).map((d) => d.label);
  const unique = uniqueDisciplineLabels(labels);
  if (typeof opts?.limit === "number" && opts.limit >= 0) {
    return unique.slice(0, opts.limit);
  }
  return unique;
}

export type TeacherDisciplineChip = {
  disciplineId: string;
  emoji: string;
  label: string;
};

/** Full chip list for profile modal — one chip per selected discipline. */
export function getTeacherProfileDisciplineChips(teacher: Teacher): TeacherDisciplineChip[] {
  const rows =
    teacher.disciplineDisplay && teacher.disciplineDisplay.length > 0
      ? teacher.disciplineDisplay
      : legacyDisciplineFallback(teacher);
  const chips: TeacherDisciplineChip[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (isPlaceholderDisciplineLabel(row.label)) continue;
    const key = foldDisplayKey(row.label) || foldDisplayKey(row.disciplineId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const meta = getDisciplineById(row.disciplineId);
    chips.push({
      disciplineId: row.disciplineId,
      emoji: meta?.emoji ?? "✨",
      label: formatTeacherDisciplineLabel(row.label),
    });
  }
  if (chips.length > 0) return chips;
  return [{ disciplineId: "autre", emoji: "✨", label: "Autre" }];
}

export function formatTeacherCardDisciplines(teacher: Teacher, maxVisible = 3): string {
  const unique = getTeacherDisciplineDisplayLabels(teacher);
  if (unique.length === 0) return "Autre";
  const shown = unique.slice(0, maxVisible);
  const extra = unique.length - shown.length;
  return extra > 0 ? `${shown.join(" · ")} +${extra}` : shown.join(" · ");
}

/** Rows must be ordered by `sort_order`, then `created_at` asc. Uses every row, including the first. */
export function applyAdditionalDisciplines(teacher: Teacher, rowsOrdered: TeacherDisciplineRow[]): Teacher {
  const disciplineDisplay =
    rowsOrdered.length > 0 ? buildTeacherDisciplineDisplay(rowsOrdered) : legacyDisciplineFallback(teacher);
  const additional =
    disciplineDisplay.length > 1
      ? disciplineDisplay.slice(1).map((d) => ({
          disciplineId: d.disciplineId,
          specialite: d.specialite,
        }))
      : undefined;
  return {
    ...teacher,
    disciplineDisplay,
    discipline: disciplineDisplay[0]?.label ?? "Autre",
    additionalDisciplines: additional,
  };
}

export function teacherToRow(t: Teacher): Record<string, unknown> {
  return {
    id: t.id,
    user_id: t.userId ?? null,
    name: t.name,
    discipline: t.discipline,
    category: t.category,
    rating: t.rating,
    reviews: t.reviews,
    price_per_lesson: t.pricePerLesson,
    monthly_subscription: t.monthlySubscription ?? null,
    bio: t.bio,
    image_url: t.imageUrl,
    availability: t.availability,
    location: t.location,
    is_verified: t.isVerified,
    teaching_mode: t.teachingMode,
    languages: t.languages,
    levels: t.levels,
    home_lesson_enabled: t.homeLessonEnabled ?? false,
    home_lesson_price: t.homeLessonPrice ?? null,
    home_lesson_radius_km: t.homeLessonRadiusKm ?? 25,
    home_lesson_min_duration: t.homeLessonMinDuration ?? 60,
    home_lesson_requires_confirmation: t.homeLessonRequiresConfirmation ?? true,
    home_lesson_force_2h_over_20km: t.homeLessonForce2hOver20km ?? false,
    verification_level: t.verificationLevel ?? null,
    identity_verified: t.identityVerified ?? false,
    diploma_verified: t.diplomaVerified ?? false,
    phone_verified: t.phoneVerified ?? false,
    identity_status: t.identityStatus ?? null,
    stripe_identity_status: t.stripeIdentityStatus ?? null,
    diploma_url: t.diplomaUrl ?? null,
    location_verification_status: t.locationVerificationStatus ?? "missing",
    cv_summary: t.cvSummary ?? null,
    cv_verification_status: t.cvVerificationStatus ?? "missing",
    country_code: t.countryCode ?? null,
    timezone: t.timezone ?? null,
    currency: t.currency ?? null,
    city: t.city ?? null,
    region: t.region ?? null,
  };
}
