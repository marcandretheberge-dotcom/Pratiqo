/**
 * Read-only relation: same row shape as `teachers` but `location` JSON excludes `private`
 * (see migration 031). Use for any browser-side listing or profile read that must not
 * expose exact address / private coordinates over the wire.
 */
export const TEACHERS_PUBLIC_TABLE = "teachers_public";

/**
 * Shared column lists for public teacher listings (search, landing, Explore).
 * Keep in sync with {@link teacherRowToTeacher} / {@link Teacher}.
 */
export const TEACHERS_LIST_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, intro_session_enabled, intro_session_duration_minutes, intro_session_price_cents, intro_session_discount_percent, verification_level, identity_verified, diploma_verified, diploma_pending, phone_verified, identity_status, stripe_identity_status, location_verification_status, cv_summary, cv_verification_status, country_code, timezone, currency, city, region";

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

export function getTeacherIdentityVerification(supabase: { from: (t: string) => any }, teacherId: string) {
  // Identity verification currently lives on `teachers` (Stripe Identity columns).
  return supabase
    .from("teachers")
    .select("id, user_id, identity_verified, identity_status, stripe_identity_status, stripe_identity_verified_at, country_code")
    .eq("id", teacherId)
    .maybeSingle();
}

export function getTeacherCredentials(supabase: { from: (t: string) => any }, teacherId: string) {
  return supabase
    .from("teacher_credentials")
    .select("id, teacher_id, type, title, institution_name, country, issued_year, verification_status, verification_method, confidence_level, public_label, verified_at, expires_at, created_at, updated_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
}

export function createTeacherCredential(supabase: { from: (t: string) => any }, input: TeacherCredentialInsert) {
  return supabase.from("teacher_credentials").insert(input).select("*").maybeSingle();
}

export function getPublicTeacherCredentials(supabase: { from: (t: string) => any }, teacherId: string) {
  return supabase
    .from("teacher_credentials_public")
    .select("id, teacher_id, type, public_label, institution_name, country, issued_year, verification_method, confidence_level, verified_at, expires_at")
    .eq("teacher_id", teacherId)
    .order("verified_at", { ascending: false });
}
