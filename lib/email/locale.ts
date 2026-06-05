import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLocale, type Locale } from "@/lib/i18n/types";

export type EmailLocale = Locale;

export const EMAIL_FALLBACK_LOCALE: EmailLocale = "fr";

export type ResolveEmailLocaleInput = {
  profileLocale?: string | null;
  profileLanguage?: string | null;
  preferredLocale?: string | null;
  bookingLocale?: string | null;
  authUserLocale?: string | null;
  countryCode?: string | null;
  region?: string | null;
};

export function normalizeEmailLocale(value: string | null | undefined): EmailLocale | null {
  if (!value?.trim()) return null;
  return normalizeLocale(value);
}

/**
 * Infer an email locale from a (countryCode, region) pair.
 *
 * Contract for the Québec-first launch:
 *   • QC / Québec / Quebec  → fr (explicit Québec signal)
 *   • Ontario / ON          → en (explicit non-Québec Canadian signal)
 *   • UY                    → es (active Latin-American market)
 *   • US                    → en (clearly outside Québec)
 *   • CA without province   → null (let the platform fallback decide; the
 *                                   `EMAIL_FALLBACK_LOCALE` is `fr` because
 *                                   Pratiqo is Québec-first)
 *
 * IMPORTANT: We must NOT default `country === "CA"` to `"en"` here. Many
 * Québec users have `country_code = "CA"` but an empty / city-shaped / not
 * yet normalized region. That was the launch-blocking bug: reminder emails
 * went out in English to Quebec teachers and students whose region wasn't
 * literally `"QC"` / `"Quebec"`. Now ambiguous CA falls through and the
 * platform fallback (fr) takes over.
 */
export function inferEmailLocaleFromRegion(input: {
  countryCode?: string | null;
  region?: string | null;
}): EmailLocale | null {
  const country = String(input.countryCode ?? "")
    .trim()
    .toUpperCase();
  const regionRaw = String(input.region ?? "").trim();
  const region = regionRaw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (country === "UY") return "es";

  if (
    region === "qc" ||
    region === "quebec" ||
    region.includes("quebec")
  ) {
    return "fr";
  }

  if (region === "on" || region === "ontario") return "en";

  if (country === "US") return "en";

  return null;
}

export function resolveEmailLocale(input: ResolveEmailLocaleInput = {}): EmailLocale {
  const explicit =
    normalizeEmailLocale(input.profileLocale) ??
    normalizeEmailLocale(input.preferredLocale) ??
    normalizeEmailLocale(input.profileLanguage) ??
    normalizeEmailLocale(input.authUserLocale) ??
    normalizeEmailLocale(input.bookingLocale);

  if (explicit) return explicit;

  const inferred = inferEmailLocaleFromRegion({
    countryCode: input.countryCode,
    region: input.region,
  });
  if (inferred) return inferred;

  return EMAIL_FALLBACK_LOCALE;
}

export function resolveEmailLocaleFromOptional(locale?: EmailLocale): EmailLocale {
  if (locale) return locale;
  return EMAIL_FALLBACK_LOCALE;
}

const LOCALE_KEY_CANDIDATES = [
  "locale",
  "preferred_locale",
  "language",
  "preferred_language",
  "user_locale",
] as const;

function readLocaleFromRecord(record: Record<string, unknown> | undefined | null): string | null {
  if (!record) return null;
  for (const key of LOCALE_KEY_CANDIDATES) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function readAuthUserLocale(metadata: Record<string, unknown> | undefined): string | null {
  return readLocaleFromRecord(metadata);
}

type ProfileLocaleRow = {
  country_code?: string | null;
  region?: string | null;
  locale?: string | null;
  language?: string | null;
  preferred_locale?: string | null;
  preferred_language?: string | null;
  dashboard?: Record<string, unknown> | null;
};

/**
 * Defensively load a profile row with every known locale-bearing column.
 *
 * The `profiles` table started life with no top-level locale columns
 * (see `supabase/migrations/000_pratiqo_schema.sql`), but the on-disk
 * normalization migration `020_normalize_locale_codes.sql` documents the
 * contract: when any of `locale`, `language`, `preferred_locale`,
 * `preferred_language`, `user_locale` (or the same keys inside JSONB columns
 * like `dashboard`) exist, they store 2-letter codes.
 *
 * We try the rich SELECT first and silently fall back to the minimal SELECT
 * (`country_code, region`) when the rich one fails (e.g. column doesn't yet
 * exist in this environment). This keeps the helper safe across schema
 * variations without adding a migration.
 */
async function loadProfileForLocale(
  admin: SupabaseClient,
  userId: string,
): Promise<ProfileLocaleRow | null> {
  const RICH_COLUMNS =
    "country_code, region, locale, language, preferred_locale, preferred_language, dashboard";
  try {
    const { data, error } = await admin
      .from("profiles")
      .select(RICH_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ProfileLocaleRow | null;
  } catch {
    const { data } = await admin
      .from("profiles")
      .select("country_code, region")
      .eq("id", userId)
      .maybeSingle();
    return (data ?? null) as ProfileLocaleRow | null;
  }
}

/**
 * Resolve the email locale for a generic user (student or any non-teacher
 * recipient). Priority:
 *   1. Auth user metadata (`locale` / `preferred_locale` / `language` / …)
 *   2. Explicit profile column (`profiles.locale` / `language` / `preferred_*`)
 *      if present
 *   3. Locale stored inside `profiles.dashboard` JSONB
 *   4. Province / country inference (QC → fr, ON → en, UY → es, US → en)
 *   5. Platform fallback (`EMAIL_FALLBACK_LOCALE` = `fr` for Québec launch)
 *
 * Step 4 intentionally does NOT default `country === "CA"` to `"en"` —
 * that catch-all was the launch-blocking bug. See `inferEmailLocaleFromRegion`.
 */
export async function resolveEmailLocaleForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<EmailLocale> {
  const profile = await loadProfileForLocale(admin, userId);

  let authUserLocale: string | null = null;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    authUserLocale = readAuthUserLocale(
      (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
    );
  } catch {
    authUserLocale = null;
  }

  const profileColumnLocale =
    profile?.locale ?? profile?.preferred_locale ?? null;
  const profileColumnLanguage =
    profile?.language ?? profile?.preferred_language ?? null;
  const dashboardLocale = readLocaleFromRecord(
    (profile?.dashboard ?? null) as Record<string, unknown> | null,
  );

  return resolveEmailLocale({
    profileLocale: profileColumnLocale,
    preferredLocale: dashboardLocale,
    profileLanguage: profileColumnLanguage,
    authUserLocale,
    countryCode: profile?.country_code ?? null,
    region: profile?.region ?? null,
  });
}

type TeacherLocaleRow = {
  country_code?: string | null;
  region?: string | null;
};

/**
 * Resolve the email locale for a TEACHER recipient.
 *
 * Per the launch contract the resolution order is:
 *   1. Teacher's stored locale preference (auth metadata + profile column)
 *   2. Linked user profile preferred locale (JSONB / dashboard)
 *   3. Region inference using whichever signal is more reliable: the
 *      `teachers` row (populated by /api/teacher/location/verify) is often
 *      richer than the `profiles` row, so we consult both and let
 *      `inferEmailLocaleFromRegion` pick the QC/ON/US signal from either.
 *   4. Platform fallback (`fr` for Québec-first launch).
 *
 * The student counterpart (`resolveEmailLocaleForUser`) deliberately does
 * NOT consult the teachers table — student locale is resolved purely from
 * student-owned data so a French teacher never silently translates a
 * student's reminder into French.
 */
export async function resolveEmailLocaleForTeacher(
  admin: SupabaseClient,
  teacherUserId: string,
): Promise<EmailLocale> {
  const profile = await loadProfileForLocale(admin, teacherUserId);

  let authUserLocale: string | null = null;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(teacherUserId);
    authUserLocale = readAuthUserLocale(
      (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
    );
  } catch {
    authUserLocale = null;
  }

  let teacherRow: TeacherLocaleRow | null = null;
  try {
    const { data } = await admin
      .from("teachers")
      .select("country_code, region")
      .eq("user_id", teacherUserId)
      .maybeSingle();
    teacherRow = (data ?? null) as TeacherLocaleRow | null;
  } catch {
    teacherRow = null;
  }

  const profileColumnLocale =
    profile?.locale ?? profile?.preferred_locale ?? null;
  const profileColumnLanguage =
    profile?.language ?? profile?.preferred_language ?? null;
  const dashboardLocale = readLocaleFromRecord(
    (profile?.dashboard ?? null) as Record<string, unknown> | null,
  );

  // Prefer the teacher-row region when present: the address-verify card
  // (/api/teacher/location/verify) keeps it normalized to canonical
  // province codes, whereas profiles.region can be empty or stale.
  const region =
    (teacherRow?.region && String(teacherRow.region).trim()) ||
    (profile?.region && String(profile.region).trim()) ||
    null;
  const countryCode =
    (teacherRow?.country_code && String(teacherRow.country_code).trim()) ||
    (profile?.country_code && String(profile.country_code).trim()) ||
    null;

  return resolveEmailLocale({
    profileLocale: profileColumnLocale,
    preferredLocale: dashboardLocale,
    profileLanguage: profileColumnLanguage,
    authUserLocale,
    countryCode,
    region,
  });
}

/**
 * Convenience alias so callers reading the code at the reminder send site
 * make their intent explicit. Behaves identically to
 * `resolveEmailLocaleForUser` today; if a separate student-specific
 * resolution path is ever needed we can specialise it here without
 * rewriting every caller.
 */
export async function resolveEmailLocaleForStudent(
  admin: SupabaseClient,
  studentUserId: string,
): Promise<EmailLocale> {
  return resolveEmailLocaleForUser(admin, studentUserId);
}
