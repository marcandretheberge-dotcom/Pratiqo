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
