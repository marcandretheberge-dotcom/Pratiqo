import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { oauthNextPathForPreAuthIntent, resolveLoginOAuthNextPath } from "@/lib/auth/preAuthOnboardingIntent";
import { isTeacherProfileComplete } from "@/lib/teacherOnboarding";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("student companion guard waits for hydrated profile before redirecting", () => {
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /profileHydrated/);
  assert.match(
    shell,
    /profileHydrated && profile\?\.companion_chosen === false && pathname !== "\/student\/choose-companion"/,
  );
});

test("choose-companion merges server profile after companion save without blocking on refresh failure", () => {
  const page = read("app/(app)/student/choose-companion/page.tsx");
  assert.match(page, /mergeAuthProfile/);
  assert.match(page, /router\.replace\("\/dashboard"\)/);
  assert.match(page, /saveError/);
  assert.doesNotMatch(page, /setSaveError\(t\("companionProfileSyncError"\)\)/);
  assert.doesNotMatch(page, /window\.location\.assign\("\/dashboard"\)/);
});

test("companion API upserts profile server-side as canonical source of truth", () => {
  const route = read("app/api/companion/route.ts");
  assert.match(route, /getSupabaseAdmin/);
  assert.match(route, /\.upsert\(/);
  assert.match(route, /companion_chosen: true/);
  assert.match(route, /profile:/);
});

test("AuthProvider exposes profile hydration, refreshProfile, and mergeAuthProfile", () => {
  const src = read("components/AuthProvider.tsx");
  assert.match(src, /profileHydrated/);
  assert.match(src, /refreshProfile/);
  assert.match(src, /mergeAuthProfile/);
  assert.doesNotMatch(src, /companion_chosen: false/);
});

test("teacher OAuth default destination is dashboard not forced onboarding", () => {
  assert.equal(oauthNextPathForPreAuthIntent("teacher"), "/dashboard");
  assert.equal(resolveLoginOAuthNextPath(null, null, "teacher"), "/dashboard");
});

test("incomplete teachers route to dashboard instead of onboarding trap", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }),
    "/dashboard",
  );
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/dashboard",
  );
});

test("shared ensureTeacherProfileRow helper creates minimal teacher rows idempotently", () => {
  const lib = read("lib/teachers/ensureTeacherProfileRow.ts");
  assert.match(lib, /ensureTeacherProfileRow/);
  assert.match(lib, /is_public: false/);
  assert.match(lib, /user_id: userId/);
});

test("teacher profile ensure API is available for authenticated teachers", () => {
  const route = read("app/api/teacher/profile/ensure/route.ts");
  assert.match(route, /ensureTeacherProfileRow/);
  assert.match(route, /role !== "teacher"/);
});

test("auth callback ensures teacher row after teacher OAuth profile upsert", () => {
  const route = read("app/auth/callback/route.ts");
  assert.match(route, /ensureTeacherProfileRow/);
});

test("teacher verification ensures missing teacher row instead of support dead-end", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /fetchEnsureTeacherProfile/);
  assert.match(page, /verificationNoTeacherRowSetup/);
  assert.doesNotMatch(page, /verificationNoTeacherRow"\)/);
});

test("profile completion CTAs route to teacher verification not public preview", () => {
  const dashboard = read("components/Dashboard.tsx");
  assert.match(dashboard, /TeacherSearchVisibilityBanner ctaHref="\/teacher\/verification"/);
  assert.match(dashboard, /TeacherProfileCompletenessCard percent=\{completenessPct\} ctaHref="\/teacher\/verification"/);
  const banner = read("components/teacher/TeacherSearchVisibilityBanner.tsx");
  assert.match(banner, /\/teacher\/verification/);
});

test("connexion waits for hydrated profile before showing role choice again", () => {
  const page = read("app/connexion/page.tsx");
  assert.match(page, /profileHydrated/);
  assert.match(page, /!profileHydrated/);
});

test("teacher dashboard no longer hard-redirects incomplete profiles to onboarding", () => {
  const page = read("app/(app)/dashboard/page.tsx");
  assert.doesNotMatch(page, /\/onboarding\/teacher/);
  assert.doesNotMatch(page, /shouldRedirectToOnboarding/);
});

test("AuthenticatedShell sends teachers on student paths to dashboard", () => {
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /teacher-student-path/);
  assert.match(shell, /redirect: "\/dashboard"/);
});

test("incomplete teacher profiles stay ineligible for marketplace completeness checks", () => {
  assert.equal(
    isTeacherProfileComplete({
      name: "",
      category: "music",
      discipline: "piano",
      city: "Montreal",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      teaching_mode: "both",
      price_per_lesson: 50,
      availability: [{ day: "monday", slots: ["09h00"] }],
    }),
    false,
  );
  assert.equal(
    isTeacherProfileComplete({
      name: "Marie",
      category: "music",
      discipline: "piano",
      city: "Montreal",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      teaching_mode: "both",
      price_per_lesson: 50,
      availability: [{ day: "monday", slots: ["09h00"] }],
    }),
    true,
  );
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:onboardingStability] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
