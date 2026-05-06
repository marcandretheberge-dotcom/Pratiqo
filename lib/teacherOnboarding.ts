import type { TeacherRow } from "@/lib/teacherMapper";

export type TeacherOnboardingField =
  | "name"
  | "category"
  | "discipline"
  | "city"
  | "region"
  | "country_code"
  | "timezone"
  | "teaching_mode"
  | "price_per_lesson"
  | "availability";

function nonEmptyString(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return v.trim().length > 0 && v.trim() !== "—";
}

function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

export function getTeacherOnboardingMissingFields(
  teacher: Partial<Pick<
    TeacherRow,
    | "name"
    | "category"
    | "discipline"
    | "city"
    | "region"
    | "country_code"
    | "timezone"
    | "teaching_mode"
    | "price_per_lesson"
    | "availability"
  >> | null
    | undefined,
): TeacherOnboardingField[] {
  const t = teacher ?? {};
  const missing: TeacherOnboardingField[] = [];

  if (!nonEmptyString(t.name)) missing.push("name");
  if (!nonEmptyString(t.category)) missing.push("category");
  if (!nonEmptyString(t.discipline)) missing.push("discipline");

  if (!nonEmptyString(t.city)) missing.push("city");
  if (!nonEmptyString(t.region)) missing.push("region");
  if (!nonEmptyString(t.country_code)) missing.push("country_code");
  if (!nonEmptyString(t.timezone)) missing.push("timezone");

  if (!nonEmptyString(t.teaching_mode)) missing.push("teaching_mode");
  if (!(typeof t.price_per_lesson === "number" ? t.price_per_lesson > 0 : Number(t.price_per_lesson) > 0)) {
    missing.push("price_per_lesson");
  }

  if (!nonEmptyArray(t.availability)) missing.push("availability");

  return missing;
}

export function isTeacherProfileComplete(
  teacher: Parameters<typeof getTeacherOnboardingMissingFields>[0],
): boolean {
  return getTeacherOnboardingMissingFields(teacher).length === 0;
}

