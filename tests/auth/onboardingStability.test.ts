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

test("choose-companion refreshes profile before leaving the page", () => {
  const page = read("app/(app)/student/choose-companion/page.tsx");
  assert.match(page, /refreshProfile/);
  assert.match(page, /router\.replace\("\/dashboard"\)/);
  assert.match(page, /saveError/);
  assert.match(page, /companionSaveError/);
  assert.doesNotMatch(page, /window\.location\.assign\("\/dashboard"\)/);
});

test("AuthProvider exposes profile hydration and refreshProfile", () => {
  const src = read("components/AuthProvider.tsx");
  assert.match(src, /profileHydrated/);
  assert.match(src, /refreshProfile/);
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

test("teacher onboarding complete API creates missing teacher row instead of 404", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.doesNotMatch(route, /Teacher profile not found/);
  assert.match(route, /\.from\("teachers"\)\s*\.insert/);
});

test("teacher dashboard no longer hard-redirects incomplete profiles to onboarding", () => {
  const page = read("app/(app)/dashboard/page.tsx");
  assert.doesNotMatch(page, /\/onboarding\/teacher/);
  assert.doesNotMatch(page, /shouldRedirectToOnboarding/);
});

test("teacher dashboard shows search visibility banner when profile incomplete", () => {
  const dashboard = read("components/Dashboard.tsx");
  assert.match(dashboard, /TeacherSearchVisibilityBanner/);
  assert.match(dashboard, /showSearchVisibilityBanner/);
});

test("AuthenticatedShell sends teachers on student paths to dashboard", () => {
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /teacher-student-path/);
  assert.match(shell, /redirect: "\/dashboard"/);
  assert.doesNotMatch(shell, /teacher_onboarding_complete \? "\/dashboard" : "\/onboarding\/teacher"/);
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
