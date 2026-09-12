import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only relation: safe-public projection over `teachers`. See migration
 * 070_teachers_public_read_isolation.sql. Stripe Connect/Identity internals,
 * diploma_url, phone_verified, identity_status, stripe_identity_status, and
 * the location/cv verification workflow enums are intentionally NOT exposed.
 * The view also filters out failed Stripe Identity verifications inside its
 * WHERE clause, and `location` has its `private` JSON sub-object stripped.
 *
 * Use this constant for any browser-side or pre-booking read of teacher data.
 */
export const TEACHERS_PUBLIC_TABLE = "teachers_public";
export const TEACHER_TEACHING_ZONES_PUBLIC_TABLE = "teacher_teaching_zones_public";

/**
 * Shared column list for public teacher listings (search, landing, Explore).
 * Keep in sync with {@link teacherRowToTeacher} / {@link Teacher} and with the
 * column set of public.teachers_public (migrations 070 + 071). Migration 071
 * adds profile_photo_url (from active profiles.photo_url).
 *
 * Sensitive workflow fields are intentionally excluded: phone_verified,
 * identity_status, stripe_identity_status, diploma_url, location_verification_*,
 * cv_verification_status, identity_verified_manually, identity_verified_manually_at/by,
 * and identity_manual_verification_note. Public trust signals rely on the
 * collapsed identity_verified boolean (Stripe Identity OR admin-manual) and
 * diploma_verified (set server-side by Stripe webhook / admin review).
 */
export const TEACHERS_LIST_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, profile_photo_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, default_lesson_duration_minutes, available_from_date, intro_session_enabled, intro_session_duration_minutes, intro_session_price_cents, intro_session_discount_percent, verification_level, identity_verified, diploma_verified, verified_experience_active, video_url, cv_summary, country_code, timezone, currency, city, region";

export const TEACHER_TEACHING_ZONES_PUBLIC_SELECT =
  "id, teacher_id, label_public, city, region, country_code, lat_public, lng_public, radius_km, zone_kind, is_primary, sort_order, availability_note_public, supports_at_teacher_place, supports_at_student_place, supports_public_place";

/**
 * Legacy compatibility select kept as an alias so existing call sites that
 * fall back to it after a column-mismatch error keep compiling. With the
 * D1 hardening (migration 070) the public view exposes a single, narrow
 * safe-public column set, so this list is now identical to TEACHERS_LIST_SELECT.
 *
 * @deprecated Use {@link TEACHERS_LIST_SELECT} directly. This alias only
 * exists to avoid touching pre-existing two-tier fallback call sites.
 */
export const TEACHERS_LIST_SELECT_LEGACY_PUBLIC = TEACHERS_LIST_SELECT;

/** Public listing fields used by TeacherQuiz matching (alignment with {@link teacherRowToTeacher} / {@link Teacher}). */
export const TEACHER_QUIZ_SELECT = TEACHERS_LIST_SELECT;

export type TeacherCredentialInsert = {
  teacher_id: string;
  type: "degree" | "certificate" | "license" | "experience" | "portfolio";
  title: string;
  institution_name?: string | null;
  country?: string | null;
  issued_year?: number | null;
  verification_method?: string | null;
  public_label?: string | null;
};

type SupabaseClientLike = Pick<SupabaseClient, "from">;

export function getTeacherIdentityVerification(supabase: SupabaseClientLike, teacherId: string) {
  // Identity verification currently lives on `teachers` (Stripe Identity + admin-manual columns).
  return supabase
    .from("teachers")
    .select("id, user_id, identity_verified, identity_verified_manually, identity_status, stripe_identity_status, stripe_identity_verified_at, country_code")
    .eq("id", teacherId)
    .maybeSingle();
}

export function getTeacherCredentials(supabase: SupabaseClientLike, teacherId: string) {
  return supabase
    .from("teacher_credentials")
    .select("id, teacher_id, type, title, institution_name, country, issued_year, verification_status, verification_method, confidence_level, public_label, verified_at, expires_at, created_at, updated_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
}

export function createTeacherCredential(supabase: SupabaseClientLike, input: TeacherCredentialInsert) {
  return supabase.from("teacher_credentials").insert(input).select("*").maybeSingle();
}

export function getPublicTeacherCredentials(supabase: SupabaseClientLike, teacherId: string) {
  return supabase
    .from("teacher_credentials_public")
    .select("id, teacher_id, type, public_label, institution_name, country, issued_year, verification_method, confidence_level, verified_at, expires_at")
    .eq("teacher_id", teacherId)
    .order("verified_at", { ascending: false });
}
