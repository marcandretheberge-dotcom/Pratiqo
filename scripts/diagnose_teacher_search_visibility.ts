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
  price_per_lesson: number | string | null;
  teaching_mode: string | null;
  city: string | null;
  region: string | null;
  location: unknown;
  is_public: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_status: string | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
};

type PublicTeacherRow = {
  id: string;
  user_id: string | null;
};

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
        "id, user_id, name, discipline, category, price_per_lesson, teaching_mode, city, region, location, is_public, is_demo, deactivated_at, deleted_at, identity_status, identity_verified, stripe_identity_failed_reason",
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

  const reasonBreakdown = new Map<string, number>();
  for (const row of rows) {
    for (const code of row.diagnosis.reasonCodes) increment(reasonBreakdown, code);
  }

  const launchReturnedCount = publicRows.filter((row) =>
    isLaunchEligibleTeacherRow({ id: row.id, user_id: row.user_id }),
  ).length;

  const summary = {
    adminTeachers: profiles.length,
    onboardingCompletedTeachers: profiles.filter((row) => row.teacher_onboarding_complete === true).length,
    searchEligibleTeachers: rows.filter((row) => row.diagnosis.visibleInSearch).length,
    searchReturnedTeachers: launchReturnedCount,
    reasonBreakdown: Object.fromEntries([...reasonBreakdown.entries()].sort()),
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
          visibleInSearch: diagnosis.visibleInSearch,
          reasonCodes: diagnosis.reasonCodes,
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
