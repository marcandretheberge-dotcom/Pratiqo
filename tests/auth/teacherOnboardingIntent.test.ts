import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProfileRoleOnAuth } from "@/lib/auth/admin";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import {
  buildTeacherSignupLoginHref,
  hasTeacherOnboardingIntent,
  parsePublicSignUpRoleParam,
  resolveLoginOAuthNextPath,
  resolveSignUpRoleParam,
} from "@/lib/auth/teacherOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("parsePublicSignUpRoleParam only honors teacher", () => {
  assert.equal(parsePublicSignUpRoleParam("teacher"), "teacher");
  assert.equal(parsePublicSignUpRoleParam("admin"), null);
  assert.equal(parsePublicSignUpRoleParam("owner"), null);
  assert.equal(parsePublicSignUpRoleParam(null), null);
});

test("hasTeacherOnboardingIntent detects role=teacher and safe teacher next paths", () => {
  assert.equal(hasTeacherOnboardingIntent("teacher", null), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/onboarding/teacher"), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/onboarding/teacher?vertical=musique"), true);
  assert.equal(hasTeacherOnboardingIntent("admin", "/onboarding/teacher"), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/dashboard"), false);
  assert.equal(hasTeacherOnboardingIntent(null, "//evil.com/onboarding/teacher"), false);
});

test("resolveLoginOAuthNextPath defaults teacher intent to role-choice screen", () => {
  assert.equal(resolveLoginOAuthNextPath("teacher", null), "/onboarding/choose-role?intent=teacher");
  assert.equal(
    resolveLoginOAuthNextPath(null, "/onboarding/choose-role?intent=teacher"),
    "/onboarding/choose-role?intent=teacher",
  );
  assert.equal(resolveLoginOAuthNextPath(null, null), "/dashboard");
  assert.equal(
    resolveLoginOAuthNextPath("teacher", "/onboarding/choose-role?intent=teacher&vertical=langues"),
    "/onboarding/choose-role?intent=teacher&vertical=langues",
  );
});

test("resolveSignUpRoleParam maps teacher intent for OAuth callback", () => {
  assert.equal(resolveSignUpRoleParam("teacher", null), "teacher");
  assert.equal(resolveSignUpRoleParam(null, "/onboarding/teacher"), "teacher");
  assert.equal(resolveSignUpRoleParam("admin", null), null);
  assert.equal(resolveSignUpRoleParam(null, "/dashboard"), null);
});

test("resolveProfileRoleOnAuth upgrades existing student when teacher intent is present", () => {
  assert.equal(
    resolveProfileRoleOnAuth({
      existingRole: "student",
      signUpRoleParam: "teacher",
      email: "tutor@example.com",
      adminLoginEmails: [],
    }),
    "teacher",
  );
});

test("resolvePostAuthRedirect keeps incomplete teachers on teacher onboarding", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }, "/dashboard"),
    "/onboarding/teacher",
  );
});

test("buildTeacherSignupLoginHref preserves role=teacher and next role-choice path", () => {
  const href = buildTeacherSignupLoginHref();
  assert.match(href, /^\/login\?/);
  const params = new URLSearchParams(href.slice("/login?".length));
  assert.equal(params.get("role"), "teacher");
  assert.equal(params.get("next"), "/onboarding/choose-role?intent=teacher");
});

test("devenir-professeur CTA uses shared teacher signup login href builder", () => {
  const src = read("app/devenir-professeur/page.tsx");
  assert.match(src, /buildTeacherSignupLoginHref/);
});

test("become-teacher CTAs use shared teacher signup login href builder", () => {
  const src = read("app/become-teacher/page.tsx");
  assert.match(src, /TEACHER_SIGNUP_LOGIN_HREF/);
  assert.doesNotMatch(src, /href="\/login\?role=teacher"/);
});

test("login page resolves post-auth redirect for teacher intent (not raw /dashboard)", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /resolvePostAuthRedirect/);
  assert.match(src, /hasTeacherOnboardingIntent/);
  assert.match(src, /resolveLoginOAuthNextPath/);
  assert.doesNotMatch(src, /body: JSON\.stringify\(\{ role: "teacher" \}\)/);
  assert.doesNotMatch(src, /router\.replace\(next\)/);
});

test("auth callback resolves teacher intent from role, safe teacher next, or pending cookies", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveAuthCallbackParams/);
  assert.match(src, /hasTeacherOnboardingIntent/);
  assert.match(src, /signUpRoleParam:\s*null/);
});

test("teacher onboarding page sends students to role-choice instead of auto-upgrading", () => {
  const src = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(src, /buildOnboardingRoleChoicePath/);
  assert.doesNotMatch(src, /\/api\/onboarding\/select-role/);
});

test("unsafe external next paths are rejected", () => {
  assert.equal(sanitizeRelativeRedirectPath("https://evil.com"), null);
  assert.equal(resolveLoginOAuthNextPath(null, "https://evil.com"), "/dashboard");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:teacherOnboardingIntent] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
