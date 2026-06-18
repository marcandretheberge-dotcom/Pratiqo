import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProfileRoleOnAuth } from "@/lib/auth/admin";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import {
  parsePublicPreAuthIntent,
  primaryRoleForPreAuthIntent,
  resolveLoginOAuthNextPath,
  resolveOAuthProfilePatch,
} from "@/lib/auth/preAuthOnboardingIntent";
import {
  buildTeacherSignupLoginHref,
  hasTeacherOnboardingIntent,
  parsePublicSignUpRoleParam,
  resolveSignUpRoleParam,
} from "@/lib/auth/teacherOnboardingIntent";
import { resolveAuthCallbackParams } from "@/lib/auth/pendingOnboardingIntent";
import { buildOAuthCallbackUrl } from "@/lib/auth/oauthCallback";

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

test("parsePublicPreAuthIntent rejects admin intent", () => {
  assert.equal(parsePublicPreAuthIntent("admin"), null);
  assert.equal(parsePublicPreAuthIntent("teacher"), "teacher");
});

test("hasTeacherOnboardingIntent detects role=teacher and safe teacher next paths", () => {
  assert.equal(hasTeacherOnboardingIntent("teacher", null), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/onboarding/teacher"), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/onboarding/teacher?vertical=musique"), true);
  assert.equal(hasTeacherOnboardingIntent(null, "/dashboard"), false);
  assert.equal(hasTeacherOnboardingIntent(null, "//evil.com/onboarding/teacher"), false);
});

test("resolveLoginOAuthNextPath routes teacher intent to teacher onboarding", () => {
  assert.equal(resolveLoginOAuthNextPath(null, null, "teacher"), "/onboarding/teacher");
  assert.equal(
    resolveLoginOAuthNextPath(null, "/onboarding/teacher?vertical=langues", "teacher"),
    "/onboarding/teacher?vertical=langues",
  );
});

test("resolveLoginOAuthNextPath routes learner intent to companion", () => {
  assert.equal(resolveLoginOAuthNextPath(null, null, "learner"), "/student/choose-companion");
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

test("resolveOAuthProfilePatch upgrades student to teacher on teacher intent", () => {
  assert.equal(
    resolveOAuthProfilePatch({ intent: "teacher", existingRole: "student", existingDashboard: {} })?.role,
    "teacher",
  );
});

test("resolvePostAuthRedirect keeps incomplete teachers on teacher onboarding", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }, "/dashboard"),
    "/onboarding/teacher",
  );
});

test("buildTeacherSignupLoginHref routes to connexion with teacher emphasis", () => {
  const href = buildTeacherSignupLoginHref();
  assert.match(href, /^\/connexion\?/);
  const params = new URLSearchParams(href.slice("/connexion?".length));
  assert.equal(params.get("intent"), "teacher");
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

test("login page requires pre-auth intent before Google OAuth", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /parsePublicPreAuthIntent/);
  assert.match(src, /loginWithGoogle\(oauthNext, \{/);
  assert.doesNotMatch(src, /body: JSON\.stringify\(\{ role: "teacher" \}\)/);
});

test("auth callback resolves pre-auth intent and applies profile patch", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveAuthCallbackParams/);
  assert.match(src, /resolveOAuthProfilePatch/);
  assert.match(src, /pendingOnboardingIntentClearCookieHeaders/);
  assert.match(src, /preAuthIntentConsumed/);
});

test("resolveAuthCallbackParams falls back to pending teacher cookies when query params are stripped", () => {
  const params = resolveAuthCallbackParams(new URL("https://www.pratiqo.ca/auth/callback?code=abc"), {
    get(name: string) {
      if (name === "pratiqo_pte") return { value: "1" };
      if (name === "pratiqo_pte_next") return { value: encodeURIComponent("/onboarding/teacher") };
      return undefined;
    },
  });
  assert.equal(params.intent, "teacher");
  assert.equal(params.next, "/onboarding/teacher");
});

test("resolveAuthCallbackParams preserves teacher vertical from legacy choose-role next", () => {
  const params = resolveAuthCallbackParams(
    new URL("https://www.pratiqo.ca/auth/callback?intent=teacher&next=%2Fonboarding%2Fchoose-role%3Fintent%3Dteacher%26vertical%3Dmusique"),
    { get() { return undefined; } },
  );
  assert.equal(params.intent, "teacher");
  assert.equal(params.next, "/onboarding/teacher?vertical=musique");
});

test("buildOAuthCallbackUrl includes intent query param", () => {
  const url = buildOAuthCallbackUrl("https://www.pratiqo.ca", {
    intent: "teacher",
    next: "/onboarding/teacher",
  });
  assert.match(url, /intent=teacher/);
  assert.match(url, /next=%2Fonboarding%2Fteacher/);
});

test("teacher onboarding page sends students to role-choice fallback", () => {
  const src = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(src, /buildOnboardingRoleChoicePath/);
  assert.doesNotMatch(src, /\/api\/onboarding\/select-role/);
});

test("unsafe external next paths are rejected", () => {
  assert.equal(sanitizeRelativeRedirectPath("https://evil.com"), null);
  assert.equal(resolveLoginOAuthNextPath(null, "https://evil.com", "learner"), "/student/choose-companion");
});

test("existing teacher is not downgraded on learner intent", () => {
  assert.equal(primaryRoleForPreAuthIntent("learner", "teacher"), "teacher");
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
