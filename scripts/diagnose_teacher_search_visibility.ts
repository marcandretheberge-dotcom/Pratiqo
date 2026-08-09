import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { diagnoseTeacherSearchVisibility } from "../lib/teachers/searchVisibilityDiagnostics";
import { isLaunchEligibleTeacherRow } from "../lib/teacherMapper";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  teacher_onboarding_complete: boolean | null;
  is_active: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  anonymized_at: string | null;
  created_at: string | null;
};

type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  category: string | null;
  bio: string | null;
  availability: unknown;
  price_per_lesson: number | string | null;
  teaching_mode: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  location: unknown;
  is_public: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_status: string | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
  intro_session_enabled: boolean | null;
  intro_session_price_cents: number | string | null;
};

type PublicTeacherRow = {
  id: string;
  user_id: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasBaseRate(value: number | string | null | undefined): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function hasSubject(teacher: TeacherRow | null, disciplineCount: number): boolean {
  return (
    disciplineCount > 0 ||
    hasText(teacher?.discipline) ||
    hasText(teacher?.category)
  );
}

function isOnlineCapable(teachingMode: string | null | undefined): boolean {
  const mode = String(teachingMode ?? "").trim().toLowerCase();
  return mode === "online" || mode === "both" || mode === "all";
}

function hasSafePublicLocation(teacher: TeacherRow | null): boolean {
  if (!teacher) return false;
  if (hasText(teacher.city) && hasText(teacher.region)) return true;
  const location =
    typeof teacher.location === "object" && teacher.location !== null
      ? (teacher.location as Record<string, unknown>)
      : null;
  const publicLocation =
    typeof location?.public === "object" && location.public !== null
      ? (location.public as Record<string, unknown>)
      : null;
  return Boolean(
    (typeof publicLocation?.lat === "number" && typeof publicLocation?.lng === "number") ||
      (typeof publicLocation?.latitude === "number" && typeof publicLocation?.longitude === "number"),
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function main() {
  loadEnvLocal();

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const [profilesResult, teachersResult, publicResult, disciplinesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, name, role, teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at, created_at",
      )
      .eq("role", "teacher")
      .order("created_at", { ascending: false }),
    supabase
      .from("teachers")
      .select(
        "id, user_id, name, discipline, category, bio, availability, price_per_lesson, teaching_mode, city, region, country_code, location, is_public, is_demo, deactivated_at, deleted_at, identity_status, identity_verified, stripe_identity_failed_reason, intro_session_enabled, intro_session_price_cents",
      ),
    supabase.from("teachers_public").select("id, user_id"),
    supabase.from("teacher_disciplines").select("teacher_id"),
  ]);

  if (profilesResult.error) throw new Error(`profiles query failed: ${profilesResult.error.message}`);
  if (teachersResult.error) throw new Error(`teachers query failed: ${teachersResult.error.message}`);
  if (publicResult.error) throw new Error(`teachers_public query failed: ${publicResult.error.message}`);
  if (disciplinesResult.error) throw new Error(`teacher_disciplines query failed: ${disciplinesResult.error.message}`);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const teachers = (teachersResult.data ?? []) as TeacherRow[];
  const publicRows = (publicResult.data ?? []) as PublicTeacherRow[];

  const teacherByUserId = new Map<string, TeacherRow>();
  for (const teacher of teachers) {
    if (teacher.user_id) teacherByUserId.set(teacher.user_id, teacher);
  }

  const publicTeacherIds = new Set(publicRows.map((row) => row.id));
  const disciplineCountByTeacherId = new Map<string, number>();
  for (const row of (disciplinesResult.data ?? []) as Array<{ teacher_id?: string | null }>) {
    if (row.teacher_id) increment(disciplineCountByTeacherId, row.teacher_id);
  }

  const rows = profiles.map((profile) => {
    const teacher = teacherByUserId.get(profile.id) ?? null;
    const diagnosis = diagnoseTeacherSearchVisibility({
      profile,
      teacher,
      disciplineCount: teacher?.id ? disciplineCountByTeacherId.get(teacher.id) ?? 0 : 0,
      inTeachersPublicView: teacher?.id ? publicTeacherIds.has(teacher.id) : false,
    });
    return { profile, teacher, diagnosis };
  });

  const blockerBreakdown = new Map<string, number>();
  const warningBreakdown = new Map<string, number>();
  const totalByCountry = new Map<string, number>();
  const visibleByCountry = new Map<string, number>();
  const hiddenByCountry = new Map<string, number>();
  let hiddenUnsupportedCountry = 0;
  let hiddenMissingCountry = 0;
  let onlineOnlyHiddenUnsupportedCountry = 0;
  let inPersonHiddenUnsupportedCountry = 0;

  for (const row of rows) {
    const country = row.teacher?.country_code?.trim().toUpperCase() || "MISSING";
    increment(totalByCountry, country);
    if (row.diagnosis.visibleInSearch) {
      increment(visibleByCountry, country);
    } else {
      increment(hiddenByCountry, country);
    }
    if (row.diagnosis.blockingReasonCodes.includes("BLOCKER_UNSUPPORTED_COUNTRY")) {
      hiddenUnsupportedCountry += 1;
      const teachingMode = String(row.teacher?.teaching_mode ?? "").trim().toLowerCase();
      if (teachingMode === "online") onlineOnlyHiddenUnsupportedCountry += 1;
      if (!isOnlineCapable(teachingMode)) inPersonHiddenUnsupportedCountry += 1;
    }
    if (row.diagnosis.blockingReasonCodes.includes("BLOCKER_MISSING_PUBLIC_DATA") && !row.teacher?.country_code) {
      hiddenMissingCountry += 1;
    }
    for (const code of row.diagnosis.blockingReasonCodes) increment(blockerBreakdown, code);
    for (const code of row.diagnosis.warningReasonCodes) increment(warningBreakdown, code);
  }

  const launchReturnedCount = publicRows.filter((row) =>
    isLaunchEligibleTeacherRow({ id: row.id, user_id: row.user_id }),
  ).length;

  const summary = {
    adminTeachers: profiles.length,
    onboardingCompletedTeachers: profiles.filter((row) => row.teacher_onboarding_complete === true).length,
    searchEligibleTeachers: rows.filter((row) => row.diagnosis.visibleInSearch).length,
    searchReturnedTeachers: launchReturnedCount,
    blockerReasonBreakdown: Object.fromEntries([...blockerBreakdown.entries()].sort()),
    warningReasonBreakdown: Object.fromEntries([...warningBreakdown.entries()].sort()),
    countrySummary: {
      totalTeachersByCountryCode: Object.fromEntries([...totalByCountry.entries()].sort()),
      visibleTeachersByCountryCode: Object.fromEntries([...visibleByCountry.entries()].sort()),
      hiddenTeachersByCountryCode: Object.fromEntries([...hiddenByCountry.entries()].sort()),
      hiddenBecauseUnsupportedCountry: hiddenUnsupportedCountry,
      hiddenBecauseMissingCountry: hiddenMissingCountry,
      onlineOnlyTeachersHiddenBecauseUnsupportedCountry: onlineOnlyHiddenUnsupportedCountry,
      inPersonTeachersHiddenBecauseUnsupportedCountry: inPersonHiddenUnsupportedCountry,
    },
  };

  console.log(JSON.stringify({ summary }, null, 2));
  console.log(
    JSON.stringify(
      {
        teachers: rows.map(({ profile, teacher, diagnosis }) => ({
          profileId: profile.id,
          teacherId: teacher?.id ?? null,
          email: profile.email,
          displayName: teacher?.name ?? profile.name,
          onboardingComplete: profile.teacher_onboarding_complete === true,
          isPublic: teacher?.is_public ?? null,
          countryCode: teacher?.country_code ?? null,
          teachingMode: teacher?.teaching_mode ?? null,
          hasBaseRate: hasBaseRate(teacher?.price_per_lesson),
          hasSubject: hasSubject(
            teacher,
            teacher?.id ? disciplineCountByTeacherId.get(teacher.id) ?? 0 : 0,
          ),
          hasBio: hasText(teacher?.bio),
          hasSafePublicLocation: hasSafePublicLocation(teacher),
          inTeachersPublic: teacher?.id ? publicTeacherIds.has(teacher.id) : false,
          visibleInSearch: diagnosis.visibleInSearch,
          blockingReasonCodes: diagnosis.blockingReasonCodes,
          warningReasonCodes: diagnosis.warningReasonCodes,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
