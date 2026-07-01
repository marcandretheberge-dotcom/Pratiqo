import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  guardAuthRedirectPath,
  resolveOAuthCallbackRedirect,
} from "@/lib/auth/oauthCallbackRedirect";
import { resolveOAuthRedirectOriginFromHost } from "@/lib/auth/oauthCallback";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

const STUDENT_CONSENT = {
  student_onboarding_consent_completed_at: "2026-06-20T00:00:00.000Z",
  student_onboarding_consent_version: "student_onboarding_consent_v1_2026_06",
};

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("first Google callback with teacher intent redirects to /onboarding/teacher, not /", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: "teacher",
    next: "/onboarding/teacher",
    role: "teacher",
    profile: { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
  });
  assert.equal(path, "/onboarding/teacher");
  assert.notEqual(path, "/");
});

test("first Google callback with student intent redirects to companion chooser, not /", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: "learner",
    next: "/student/choose-companion",
    role: "student",
    profile: { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
  });
  assert.equal(path, "/student/choose-companion");
  assert.notEqual(path, "/");
});

test("missing profile read with teacher intent still resolves onboarding, not /", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: "teacher",
    next: "/onboarding/teacher",
    role: "teacher",
    profile: null,
  });
  assert.equal(path, "/onboarding/teacher");
  assert.notEqual(path, "/");
});

test("missing profile read with learner intent still resolves companion chooser, not /", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: "learner",
    next: "/student/choose-companion",
    role: "student",
    profile: null,
  });
  assert.equal(path, "/student/choose-companion");
});

test("guardAuthRedirectPath never returns landing for intent flows", () => {
  assert.equal(guardAuthRedirectPath("/", "teacher"), "/onboarding/teacher");
  assert.equal(guardAuthRedirectPath("/", "learner"), "/student/choose-companion");
  assert.equal(guardAuthRedirectPath("/", null), "/dashboard");
});

test("unsafe next is rejected for intent teacher callback redirect", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: "teacher",
    next: "https://evil.com",
    role: "teacher",
    profile: { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
  });
  assert.equal(path, "/onboarding/teacher");
  assert.equal(sanitizeRelativeRedirectPath("https://evil.com"), null);
});

test("existing user without onboarding intent goes to dashboard", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: null,
    next: "/dashboard",
    role: "student",
    profile: { companion_chosen: true, dashboard: { onboarding_role_confirmed: true }, ...STUDENT_CONSENT },
  });
  assert.equal(path, "/dashboard");
  assert.notEqual(path, "/");
});

test("existing teacher with completed onboarding goes to dashboard when no intent", () => {
  const path = resolveOAuthCallbackRedirect({
    intent: null,
    next: "/dashboard",
    role: "teacher",
    profile: { teacher_onboarding_complete: true, dashboard: { onboarding_role_confirmed: true } },
  });
  assert.equal(path, "/dashboard");
});

test("preview origin is preserved for OAuth callback URL construction", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "pratiqo-git-fix-auth.vercel.app",
    "https://pratiqo-git-fix-auth.vercel.app",
    "https://www.pratiqo.ca",
  );
  assert.equal(origin, "https://pratiqo-git-fix-auth.vercel.app");
});

test("production origin is preserved for OAuth callback URL construction", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "www.pratiqo.ca",
    "https://www.pratiqo.ca",
    "https://www.pratiqo.ca",
  );
  assert.equal(origin, "https://www.pratiqo.ca");
});

test("auth callback uses resolveOAuthCallbackRedirect directly instead of login handoff", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveOAuthCallbackRedirect/);
  assert.doesNotMatch(src, /buildLoginHrefAfterOAuth/);
  assert.match(src, /stage:\s*"ingress"/);
  assert.match(src, /pendingIntentCookie/);
  assert.match(src, /requestUrl\.origin/);
  assert.match(src, /pendingOnboardingIntentClearCookieHeaders/);
});

test("auth callback clears pending intent cookies only after final redirect is chosen", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(
    src,
    /NextResponse\.redirect\(new URL\(redirectPath, requestUrl\.origin\)\)[\s\S]*pendingOnboardingIntentClearCookieHeaders/,
  );
});

test("AuthenticatedShell allows onboarding/teacher before pending-intent dashboard redirect", () => {
  const src = read("components/AuthenticatedShell.tsx");
  const onboardingGuard = src.indexOf('pathname.startsWith("/onboarding/teacher")');
  const pendingIntentGuard = src.indexOf("teacher-pending-intent-dashboard");
  assert.ok(onboardingGuard > -1 && pendingIntentGuard > -1);
  assert.ok(onboardingGuard < pendingIntentGuard);
});

test("AuthProvider unblocks UI when session exists before profile hydration", () => {
  const src = read("components/AuthProvider.tsx");
  assert.match(src, /setLoading\(false\)/);
  assert.match(src, /void syncProfile\(u\)/);
  assert.doesNotMatch(src, /await syncProfile\(u\)[\s\S]*setLoading\(false\)/);
  assert.doesNotMatch(src, /\{!loading && children\}/);
});

test("auth flow tracing is enabled on preview via shouldTraceAuthFlow", () => {
  const src = read("lib/auth/authFlowDiagnostics.ts");
  assert.match(src, /shouldTraceAuthFlow/);
  assert.match(src, /VERCEL_ENV === "preview"/);
});

test("resolvePostAuthRedirect baseline still rejects open redirects for existing users", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: true, ...STUDENT_CONSENT }, "https://evil.com"),
    "/dashboard",
  );
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:deterministicGoogleCallback] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
