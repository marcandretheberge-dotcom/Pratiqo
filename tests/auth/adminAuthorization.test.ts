import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isAdminProfile,
  isAllowlistedAdminEmail,
  parseAdminLoginEmails,
  resolvePostAuthRedirect,
  resolveProfileRoleOnAuth,
  sanitizeAdminRedirectPath,
  sanitizeRelativeRedirectPath,
} from "@/lib/auth/admin";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("parseAdminLoginEmails trims, lowercases, and splits separators", () => {
  const parsed = parseAdminLoginEmails(" Admin@Pratiqo.ca , TEACHER@x.com;\nother@y.com ");
  assert.deepEqual(parsed, ["admin@pratiqo.ca", "teacher@x.com", "other@y.com"]);
});

test("isAllowlistedAdminEmail is case-insensitive", () => {
  const list = parseAdminLoginEmails("ops@pratiqo.ca");
  assert.equal(isAllowlistedAdminEmail("OPS@Pratiqo.ca", list), true);
  assert.equal(isAllowlistedAdminEmail("not-listed@pratiqo.ca", list), false);
});

test("resolveProfileRoleOnAuth preserves existing admin over student signup param", () => {
  const role = resolveProfileRoleOnAuth({
    existingRole: "admin",
    signUpRoleParam: "teacher",
    email: "user@example.com",
    adminLoginEmails: [],
  });
  assert.equal(role, "admin");
});

test("resolveProfileRoleOnAuth assigns admin from allowlist", () => {
  const role = resolveProfileRoleOnAuth({
    existingRole: "student",
    signUpRoleParam: null,
    email: "ops@pratiqo.ca",
    adminLoginEmails: ["ops@pratiqo.ca"],
  });
  assert.equal(role, "admin");
});

test("resolveProfileRoleOnAuth does not assign admin without allowlist or existing admin", () => {
  const role = resolveProfileRoleOnAuth({
    existingRole: "student",
    signUpRoleParam: null,
    email: "user@example.com",
    adminLoginEmails: ["ops@pratiqo.ca"],
  });
  assert.equal(role, "student");
});

test("resolvePostAuthRedirect sends admins to /admin", () => {
  assert.equal(resolvePostAuthRedirect("admin", { companion_chosen: true }), "/admin");
  assert.equal(
    resolvePostAuthRedirect("admin", { companion_chosen: true }, "/admin/credentials"),
    "/admin/credentials",
  );
});

test("sanitizeRelativeRedirectPath rejects open redirects", () => {
  assert.equal(sanitizeRelativeRedirectPath("//evil.com"), null);
  assert.equal(sanitizeRelativeRedirectPath("https://evil.com"), null);
  assert.equal(sanitizeRelativeRedirectPath("/dashboard"), "/dashboard");
});

test("sanitizeAdminRedirectPath only allows /admin routes", () => {
  assert.equal(sanitizeAdminRedirectPath("/admin/credentials"), "/admin/credentials");
  assert.equal(sanitizeAdminRedirectPath("/dashboard"), null);
  assert.equal(sanitizeAdminRedirectPath("//evil.com"), null);
});

test("resolvePostAuthRedirect ignores unsafe admin next paths", () => {
  assert.equal(
    resolvePostAuthRedirect("admin", { companion_chosen: true }, "//evil.com"),
    "/admin",
  );
  assert.equal(
    resolvePostAuthRedirect("admin", { companion_chosen: true }, "/dashboard"),
    "/admin",
  );
});

test("resolvePostAuthRedirect keeps teachers off companion flow", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: true, companion_chosen: false }),
    "/dashboard",
  );
});

test("resolvePostAuthRedirect sends students without companion to role-choice when unconfirmed", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: false, dashboard: {} }, "/dashboard"),
    "/onboarding/choose-role",
  );
});

test("resolvePostAuthRedirect sends confirmed students without companion to chooser", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
      "/dashboard",
    ),
    "/student/choose-companion",
  );
});

test("resolvePostAuthRedirect keeps students with companion on safe next path", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: true }, "/student/search"),
    "/student/search",
  );
});

test("isAdminProfile is the admin authorization predicate", () => {
  assert.equal(isAdminProfile({ role: "admin" }), true);
  assert.equal(isAdminProfile({ role: "student" }), false);
  assert.equal(isAdminProfile(null), false);
});

test("migration 061 blocks client admin role escalation without current_user bypass", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/061_profiles_role_guard.sql"),
    "utf8",
  );
  assert.match(sql, /profiles_guard_role_escalation/);
  assert.match(sql, /NEW\.role = 'admin'/);
  assert.match(sql, /jwt_role = 'service_role'/);
  assert.match(sql, /SECURITY INVOKER/);
  assert.doesNotMatch(sql, /current_user\s+IN/i);
  assert.doesNotMatch(sql, /supabase_admin/i);
});

test("migration 061 SQL logic blocks self-promotion to admin for non-service callers", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/061_profiles_role_guard.sql"),
    "utf8",
  );
  assert.match(sql, /IF jwt_role = 'service_role' THEN[\s\S]*RETURN NEW;/);
  assert.match(sql, /ELSIF NEW\.role = 'admin' AND OLD\.role IS DISTINCT FROM 'admin' THEN/);
  assert.match(sql, /NEW\.role := OLD\.role;/);
});

// ── Mobile email-link / OAuth `next` preservation regression tests ──────────
// Background: students opening a reward email ("Voir mon compagnon" →
// /student/progress) on mobile had to complete Google OAuth and were landing
// on /dashboard instead of the linked destination. Root cause: the login page
// hard-coded /dashboard when forwarding into Google OAuth. These tests pin
// the contract that `resolvePostAuthRedirect` + `sanitizeRelativeRedirectPath`
// must honour so the regression cannot return silently.

test("resolvePostAuthRedirect preserves /student/progress for students with companion (email-link flow)", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: true }, "/student/progress"),
    "/student/progress",
  );
});

test("resolvePostAuthRedirect funnels unconfirmed students to role-choice even when next is /student/progress", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: false, dashboard: {} }, "/student/progress"),
    "/onboarding/choose-role",
  );
});

test("resolvePostAuthRedirect rejects open-redirect next for students and falls back to /dashboard", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: true }, "https://evil.com"),
    "/dashboard",
  );
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: true }, "//evil.com"),
    "/dashboard",
  );
});

test("resolvePostAuthRedirect rejects open-redirect next for teachers and falls back to /dashboard", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: true, companion_chosen: true },
      "https://evil.com",
    ),
    "/dashboard",
  );
});

test("resolvePostAuthRedirect sends incomplete teachers to dashboard", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, companion_chosen: true },
      "/student/progress",
    ),
    "/dashboard",
  );
});

test("sanitizeRelativeRedirectPath preserves /student/progress query/hash payloads", () => {
  assert.equal(
    sanitizeRelativeRedirectPath("/student/progress?from=email"),
    "/student/progress?from=email",
  );
  assert.equal(
    sanitizeRelativeRedirectPath("/student/progress#milestones"),
    "/student/progress#milestones",
  );
});

test("sanitizeRelativeRedirectPath rejects javascript: and data: schemes", () => {
  assert.equal(sanitizeRelativeRedirectPath("javascript:alert(1)"), null);
  assert.equal(sanitizeRelativeRedirectPath("data:text/html,evil"), null);
});

test("login page forwards sanitized `next` (not hard-coded /dashboard) into Google OAuth", () => {
  const source = readFileSync(join(process.cwd(), "app/login/page.tsx"), "utf8");
  assert.match(
    source,
    /loginWithGoogle\(\s*oauthNext,\s*\{/,
    "login must forward `oauthNext` and pre-auth intent options to loginWithGoogle",
  );
  assert.match(
    source,
    /intent:\s*preAuthIntent/,
    "login must pass pre-auth intent into loginWithGoogle",
  );
  assert.doesNotMatch(
    source,
    /loginWithGoogle\(\s*"\/dashboard"\s*,/,
    "login page must not hard-code /dashboard when starting OAuth",
  );
  assert.match(
    source,
    /resolveLoginOAuthNextPath/,
    "login page must derive OAuth next from pre-auth intent",
  );
});

test("companion-evolution email CTA points to /student/progress", () => {
  // The email template is the trigger for this entire mobile redirect bug:
  // if the CTA URL ever drifts we want loud test failure rather than a
  // silent UX regression.
  const source = readFileSync(join(process.cwd(), "lib/email/templates/welcome.ts"), "utf8");
  assert.match(source, /ctaText:\s*copy\.ctaText/);
  assert.match(source, /const ctaUrl = `\$\{base\}\/student\/progress`/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:adminAuthorization] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
