import type { Teacher } from "../types";

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
  home_lesson_requires_confirmation?: boolean | null;
  home_lesson_force_2h_over_20km?: boolean | null;
  verification_level?: number | null;
  identity_verified?: boolean | null;
  diploma_verified?: boolean | null;
  phone_verified?: boolean | null;
  verification_notes?: string | null;
  video_url?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  currency?: string | null;
  city?: string | null;
  region?: string | null;
};

export function teacherRowToTeacher(row: TeacherRow): Teacher {
  const loc = (row.location || {}) as { lat?: number; lng?: number; neighborhood?: string; address?: string };
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
    imageUrl: row.image_url ?? "",
    availability: Array.isArray(row.availability) ? (row.availability as string[]) : [],
    location: {
      lat: Number(loc.lat ?? 0),
      lng: Number(loc.lng ?? 0),
      neighborhood: loc.neighborhood,
      address: loc.address,
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
    homeLessonRequiresConfirmation: row.home_lesson_requires_confirmation ?? true,
    homeLessonForce2hOver20km: Boolean(row.home_lesson_force_2h_over_20km),
    verificationLevel: row.verification_level ?? undefined,
    identityVerified: Boolean(row.identity_verified),
    diplomaVerified: Boolean(row.diploma_verified),
    phoneVerified: Boolean(row.phone_verified),
    videoUrl: row.video_url ?? null,
    additionalDisciplines: undefined,
    countryCode: row.country_code ?? undefined,
    timezone: row.timezone ?? undefined,
    currency: row.currency ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
  };
}

/** Rows must be ordered by `created_at` asc (primary = first row). Adds `additionalDisciplines` from remaining rows. */
export function applyAdditionalDisciplines(teacher: Teacher, rowsOrdered: TeacherDisciplineRow[]): Teacher {
  if (rowsOrdered.length <= 1) {
    return { ...teacher, additionalDisciplines: undefined };
  }
  const additional = rowsOrdered.slice(1).map((r) => ({
    disciplineId: r.discipline_id,
    specialite: String(r.specialite ?? "").trim(),
  }));
  return { ...teacher, additionalDisciplines: additional };
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
    country_code: t.countryCode ?? null,
    timezone: t.timezone ?? null,
    currency: t.currency ?? null,
    city: t.city ?? null,
    region: t.region ?? null,
  };
}
