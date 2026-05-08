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
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, intro_session_enabled, intro_session_duration_minutes, intro_session_price_cents, intro_session_discount_percent, verification_level, identity_verified, diploma_verified, phone_verified, identity_status, stripe_identity_status, diploma_url, location_verification_status, cv_summary, cv_verification_status, country_code, timezone, currency, city, region";

/** Public listing fields used by TeacherQuiz matching (alignment with {@link teacherRowToTeacher} / {@link Teacher}). */
export const TEACHER_QUIZ_SELECT = TEACHERS_LIST_SELECT;
