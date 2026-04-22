import type { Teacher } from "../types";

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
  image_url: string;
  availability: unknown;
  location: unknown;
  is_verified: boolean;
  teaching_mode: string;
  languages: string[] | null;
  levels: string[] | null;
};

export function teacherRowToTeacher(row: TeacherRow): Teacher {
  const loc = (row.location || {}) as { lat?: number; lng?: number };
  return {
    id: row.id,
    name: row.name,
    discipline: row.discipline,
    category: row.category as Teacher["category"],
    rating: row.rating,
    reviews: row.reviews,
    distance: 0,
    pricePerLesson: Number(row.price_per_lesson),
    monthlySubscription: row.monthly_subscription != null ? Number(row.monthly_subscription) : undefined,
    bio: row.bio,
    imageUrl: row.image_url,
    availability: Array.isArray(row.availability) ? (row.availability as string[]) : [],
    location: { lat: Number(loc.lat ?? 0), lng: Number(loc.lng ?? 0) },
    isVerified: row.is_verified,
    teachingMode: row.teaching_mode as Teacher["teachingMode"],
    languages: row.languages ?? [],
    levels: row.levels ?? [],
  };
}

export function teacherToRow(t: Teacher): Record<string, unknown> {
  return {
    id: t.id,
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
  };
}
