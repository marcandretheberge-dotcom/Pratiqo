import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOnboardingRoleChoicePath,
  isOnboardingRoleChoicePath,
  needsOnboardingRoleChoice,
  ONBOARDING_ROLE_CHOICE_PATH,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { resolveLoginOAuthNextPath } from "@/lib/auth/teacherOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("needsOnboardingRoleChoice is true for new students without confirmed role", () => {
  assert.equal(
    needsOnboardingRoleChoice({
      role: "student",
      companion_chosen: false,
      teacher_onboarding_complete: false,
      dashboard: {},
    }),
    true,
  );
});

test("needsOnboardingRoleChoice is false after explicit role confirmation", () => {
  assert.equal(
    needsOnboardingRoleChoice({
      role: "student",
      companion_chosen: false,
      dashboard: { onboarding_role_confirmed: true },
    }),
    false,
  );
});

test("resolveLoginOAuthNextPath routes teacher intent to role-choice screen", () => {
  assert.equal(resolveLoginOAuthNextPath("teacher", null), "/onboarding/choose-role?intent=teacher");
});

test("resolvePostAuthRedirect sends unconfirmed students to role-choice before companion", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: false, dashboard: {} }),
    ONBOARDING_ROLE_CHOICE_PATH,
  );
});

test("resolvePostAuthRedirect sends confirmed students without companion to chooser", () => {
  assert.equal(
    resolvePostAuthRedirect("student", {
      companion_chosen: false,
      dashboard: { onboarding_role_confirmed: true },
    }),
    "/student/choose-companion",
  );
});

test("resolvePostAuthRedirect still sends incomplete teachers to teacher onboarding", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }),
    "/onboarding/teacher",
  );
});

test("teacher-intent OAuth next resolves to emphasized role-choice path", () => {
  assert.equal(buildOnboardingRoleChoicePath(true), "/onboarding/choose-role?intent=teacher");
});

test("choose-role page exists and calls select-role for both paths", () => {
  const src = read("app/(app)/onboarding/choose-role/page.tsx");
  assert.match(src, /onboardingRoleChoiceHeading/);
  assert.match(src, /chooseRole\("teacher"\)/);
  assert.match(src, /chooseRole\("student"\)/);
  assert.match(src, /\/api\/onboarding\/select-role/);
});

test("auth callback no longer auto-assigns teacher role from OAuth intent", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /signUpRoleParam:\s*null/);
});

test("login page no longer auto-upgrades student to teacher before role choice", () => {
  const src = read("app/login/page.tsx");
  assert.doesNotMatch(src, /body: JSON\.stringify\(\{ role: "teacher" \}\)/);
});

test("AuthenticatedShell keeps unconfirmed students on role-choice instead of companion", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /needsOnboardingRoleChoice/);
  assert.match(src, /isOnboardingRoleChoicePath/);
  assert.match(
    src,
    /needsRoleChoice[\s\S]*?if \(!isOnboardingRoleChoicePath\(pathname\)\)[\s\S]*?return;/,
  );
  assert.match(
    src,
    /if \(profile\?\.companion_chosen === false && pathname !== "\/student\/choose-companion"\)/,
  );
});

test("choose-role page does not auto-call select-role on mount", () => {
  const src = read("app/(app)/onboarding/choose-role/page.tsx");
  const useEffectBlocks = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
  for (const block of useEffectBlocks) {
    assert.doesNotMatch(block, /\/api\/onboarding\/select-role/);
  }
  assert.match(src, /chooseRole\("student"\)/);
  assert.match(src, /chooseRole\("teacher"\)/);
});

test("resolveProfileDashboardFromAuth reads spread onboarding_role_confirmed", () => {
  assert.deepEqual(resolveProfileDashboardFromAuth({ onboarding_role_confirmed: true }), {
    onboarding_role_confirmed: true,
  });
});

test("isOnboardingRoleChoicePath matches choose-role route", () => {
  assert.equal(isOnboardingRoleChoicePath("/onboarding/choose-role"), true);
  assert.equal(isOnboardingRoleChoicePath("/student/choose-companion"), false);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:onboardingRoleChoice] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
