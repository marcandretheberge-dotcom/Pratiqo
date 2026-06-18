// Regression suite for feat/admin-users-role-management.
//
// What this pins:
//   - The /admin layout enforces requireAdminPage server-side (the real
//     security boundary for the new /admin/users surface).
//   - The new /api/admin/users route handler:
//       * uses requireAdminApi() before doing any work,
//       * exposes only GET + PATCH (no DELETE / POST that could escape
//         our model),
//       * validates target role against ADMIN_ASSIGNABLE_ROLES,
//       * refuses self-mutation (the brief's explicit "admin cannot
//         remove their own admin role" rule, plus self-promotion drift),
//       * writes to admin_role_change_audit via insertAdminRoleChangeAudit,
//       * never accepts a role outside ADMIN_ASSIGNABLE_ROLES,
//       * does not import Stripe / messaging / YoPratiqo modules.
//   - The /admin/users page:
//       * mounts under app/(app)/admin/* so the layout's
//         requireAdminPage runs first,
//       * does not expose service-role keys,
//       * provides a search input + role select + locked self row,
//       * is reachable from /admin (dashboard link added).
//   - The shared landing header + neutral surfaces NEVER embed
//     ?role=teacher — only explicit teacher-recruitment pages do.
//   - The /api/onboarding/select-role route still rejects "admin".
//   - The role allowlist is exactly { student, teacher, admin } — no
//     drift toward "owner" / "super" / arbitrary strings.
//   - The new audit migration 079 is append-only, RLS-enabled with no
//     SELECT/UPDATE/DELETE policies, and indexed for forensic lookups.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMIN_ASSIGNABLE_ROLES,
  isAssignableRole,
  type ProfileRole,
} from "@/lib/auth/admin";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const READ = (relPath: string) => readFileSync(join(process.cwd(), relPath), "utf8");

// ── Role allowlist contract ─────────────────────────────────────────────────

test("ADMIN_ASSIGNABLE_ROLES is exactly { student, teacher, admin }", () => {
  const sorted = Array.from(ADMIN_ASSIGNABLE_ROLES).slice().sort();
  assert.deepEqual(sorted, ["admin", "student", "teacher"]);
});

test("isAssignableRole accepts the three known roles and rejects anything else", () => {
  for (const r of ["student", "teacher", "admin"] as const) {
    assert.equal(isAssignableRole(r), true, `${r} must be accepted`);
  }
  for (const bad of [
    "owner",
    "super",
    "moderator",
    "ADMIN",
    "Student",
    "",
    null,
    undefined,
    123,
    {},
    [],
    { role: "admin" },
  ]) {
    assert.equal(isAssignableRole(bad as unknown), false, `${JSON.stringify(bad)} must be rejected`);
  }
});

// ── API route guardrails (source-scan) ──────────────────────────────────────

const apiRoute = READ("app/api/admin/users/route.ts");

test("/api/admin/users uses requireAdminApi() before any DB work", () => {
  assert.match(apiRoute, /import\s*\{[^}]*requireAdminApi[^}]*\}\s*from\s*"@\/lib\/auth\/admin"/);
  // Both handlers must guard.
  const getBlock = apiRoute.slice(apiRoute.indexOf("export async function GET"));
  const patchBlock = apiRoute.slice(apiRoute.indexOf("export async function PATCH"));
  assert.ok(getBlock.length > 0, "GET handler must exist");
  assert.ok(patchBlock.length > 0, "PATCH handler must exist");
  assert.match(getBlock, /await\s+requireAdminApi\(\s*req\s*\)/);
  assert.match(patchBlock, /await\s+requireAdminApi\(\s*req\s*\)/);
});

test("/api/admin/users only exports GET and PATCH (no DELETE/POST surface)", () => {
  const exports = Array.from(apiRoute.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)).map(
    (m) => m[1],
  );
  assert.deepEqual(exports.slice().sort(), ["GET", "PATCH"]);
});

test("PATCH validates role with isAssignableRole and refuses self-mutation", () => {
  const patchBlock = apiRoute.slice(apiRoute.indexOf("export async function PATCH"));
  assert.match(patchBlock, /isAssignableRole\(\s*body\.role\s*\)/);
  // Self-mutation guard must compare targetId against the authenticated admin id.
  assert.match(patchBlock, /targetId\s*===\s*adminUser\.id/);
  assert.match(patchBlock, /status:\s*400/);
});

test("PATCH writes a row to admin_role_change_audit on successful change", () => {
  const patchBlock = apiRoute.slice(apiRoute.indexOf("export async function PATCH"));
  assert.match(patchBlock, /insertAdminRoleChangeAudit\s*\(/);
  // The audit call must reference both actor + target ids — pin the wiring
  // so a future refactor doesn't accidentally swap them.
  assert.match(patchBlock, /actorId:\s*adminUser\.id/);
  assert.match(patchBlock, /targetId:\s*targetRow\.id/);
  assert.match(patchBlock, /previousRole/);
  assert.match(patchBlock, /newRole:\s*nextRole/);
});

test("/api/admin/users does not import payment / messaging / YoPratiqo modules", () => {
  for (const forbidden of [
    /from\s+["']stripe["']/,
    /@\/lib\/stripe/,
    /@\/lib\/email/,
    /@\/lib\/messages/,
    /@\/lib\/yo/,
    /@\/components\/yo/,
  ]) {
    assert.doesNotMatch(apiRoute, forbidden, `forbidden import present: ${forbidden}`);
  }
});

test("/api/admin/users runtime is nodejs (service-role client requires it)", () => {
  assert.match(apiRoute, /export\s+const\s+runtime\s*=\s*["']nodejs["']/);
});

test("/api/admin/users does not embed the Supabase service-role key", () => {
  // The service-role key lives in SUPABASE_SERVICE_ROLE_KEY and must only
  // be read by getSupabaseAdmin() server-side. The route should never
  // reference NEXT_PUBLIC_SUPABASE_SERVICE or hard-code the key string.
  assert.doesNotMatch(apiRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(apiRoute, /service_role/i);
});

// ── Page guardrails ─────────────────────────────────────────────────────────

const pageSource = READ("app/(app)/admin/users/page.tsx");

test("/admin/users page lives under app/(app)/admin so the layout guard runs", () => {
  // Layout file must call requireAdminPage — this is the actual security
  // boundary; the page's client-side isAdmin check is UX only.
  const layout = READ("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);
});

test("/admin/users page never imports getSupabaseAdmin (no service-role on client)", () => {
  assert.doesNotMatch(pageSource, /getSupabaseAdmin/);
  assert.doesNotMatch(pageSource, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("/admin/users page forwards Bearer token to /api/admin/users", () => {
  assert.match(pageSource, /Authorization:\s*`Bearer\s+\$\{token\}`/);
  assert.match(pageSource, /\/api\/admin\/users/);
});

test("/admin/users page renders a role <select> and a search input with stable testids", () => {
  assert.match(pageSource, /data-testid="admin-users-search-input"/);
  assert.match(pageSource, /data-testid="admin-users-table"/);
  assert.match(pageSource, /data-testid="admin-users-row"/);
  assert.match(pageSource, /data-testid="admin-users-role-select"/);
});

test("/admin/users page locks the self-row from role mutation", () => {
  // Both pieces must be present: the is_self check that hides the select
  // AND the early return inside changeRole() when target.is_self is true.
  assert.match(pageSource, /target\.is_self/);
  assert.match(pageSource, /u\.is_self/);
});

test("/admin/users page is reachable from the /admin dashboard", () => {
  const dashboard = READ("app/(app)/admin/page.tsx");
  assert.match(dashboard, /href="\/admin\/users"/);
});

// ── Onboarding / header role-intent neutrality ──────────────────────────────

test("LandingHeader does not propagate role=teacher (header neutrality)", () => {
  const header = READ("components/marketing/LandingHeader.tsx");
  assert.doesNotMatch(header, /role=teacher/);
  assert.match(header, /loginHref|resolveLoginHrefWithPendingTeacherIntent/);
});

test("Bridge / neutral marketing surfaces use /login (no ?role= taint)", () => {
  for (const rel of [
    "components/blog/BlogPublicHeader.tsx",
    "components/marketing/MarketplaceFinalCta.tsx",
  ]) {
    const src = READ(rel);
    assert.doesNotMatch(src, /role=teacher/, `${rel} must not carry role=teacher`);
    assert.doesNotMatch(src, /role=admin/, `${rel} must not carry role=admin`);
  }
});

test("OAuth callback applies pre-auth intent and never grants admin from URL params", () => {
  const adminLib = READ("lib/auth/admin.ts");
  assert.match(adminLib, /signUpRoleParam\s*===\s*"teacher"/);
  assert.doesNotMatch(adminLib, /signUpRoleParam\s*===\s*"admin"/);
  const callback = READ("app/auth/callback/route.ts");
  assert.match(callback, /resolveAuthCallbackParams/);
  assert.match(callback, /resolveOAuthProfilePatch/);
  assert.match(callback, /signUpRoleParam:\s*null/);
});

test("/api/onboarding/select-role still rejects admin role from client callers", () => {
  const route = READ("app/api/onboarding/select-role/route.ts");
  // The parseRole() helper restricts to student | teacher; an admin string
  // must NOT be accepted, and an existing admin profile must NOT be
  // demoted through this endpoint.
  assert.match(route, /value\s*===\s*"student"\s*\|\|\s*value\s*===\s*"teacher"/);
  assert.match(route, /profile\?\.role\s*===\s*"admin"/);
  assert.match(route, /status:\s*403/);
});

test("Login page only accepts public pre-auth intents (no admin branch)", () => {
  const login = READ("app/login/page.tsx");
  assert.match(login, /parsePublicPreAuthIntent/);
  assert.doesNotMatch(login, /roleParam\s*===\s*"admin"/);
  assert.doesNotMatch(login, /searchParams\.get\("role"\)\s*===\s*"admin"/);
});

// ── Audit table migration ───────────────────────────────────────────────────

test("Migration 079 creates admin_role_change_audit as append-only", () => {
  const sql = READ("supabase/migrations/079_admin_role_change_audit.sql");
  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.admin_role_change_audit/i);
  // Required columns for forensic completeness.
  for (const col of [
    /actor_id\s+uuid\s+not\s+null/,
    /target_id\s+uuid\s+not\s+null/,
    /previous_role\s+text/,
    /new_role\s+text\s+not\s+null/,
    /actor_email\s+text/,
    /target_email\s+text/,
    /source\s+text\s+not\s+null/,
  ]) {
    assert.match(sql, col, `audit column missing: ${col}`);
  }
});

test("Migration 079 enables RLS with NO read/write policies (service-role only)", () => {
  const sql = READ("supabase/migrations/079_admin_role_change_audit.sql");
  assert.match(sql, /alter\s+table\s+public\.admin_role_change_audit\s+enable\s+row\s+level\s+security/i);
  // No policies should be created — table is deny-by-default for JWT
  // callers. If we ever add one, this test fires loud.
  assert.doesNotMatch(
    sql,
    /create\s+policy/i,
    "audit table must have zero policies (deny-by-default for non-service callers)",
  );
});

test("Migration 079 indexes target + actor for forensic queries", () => {
  const sql = READ("supabase/migrations/079_admin_role_change_audit.sql");
  assert.match(sql, /admin_role_change_audit_target_idx/);
  assert.match(sql, /admin_role_change_audit_actor_idx/);
});

// ── insertAdminRoleChangeAudit shape ────────────────────────────────────────

test("insertAdminRoleChangeAudit writes the audit columns we expect", () => {
  const adminLib = READ("lib/auth/admin.ts");
  const helperStart = adminLib.indexOf("export async function insertAdminRoleChangeAudit");
  assert.ok(helperStart >= 0, "helper must exist");
  const helperBlock = adminLib.slice(helperStart, helperStart + 2000);
  for (const col of [
    /actor_id:\s*input\.actorId/,
    /actor_email:\s*input\.actorEmail/,
    /target_id:\s*input\.targetId/,
    /target_email:\s*input\.targetEmail/,
    /previous_role:\s*input\.previousRole/,
    /new_role:\s*input\.newRole/,
    /source:\s*input\.source\s*\?\?\s*"admin\/users"/,
  ]) {
    assert.match(helperBlock, col, `helper insert column missing: ${col}`);
  }
  // The helper must NEVER throw — audit failures cannot block role
  // changes. Pin the try/catch shape.
  assert.match(helperBlock, /try\s*\{/);
  assert.match(helperBlock, /catch\s*\(/);
});

// ── Audit doc presence ──────────────────────────────────────────────────────

test("docs/AUTH_ROLE_ONBOARDING_AUDIT.md exists and covers role + header + admin tab", () => {
  const doc = READ("docs/AUTH_ROLE_ONBOARDING_AUDIT.md");
  for (const required of [
    /Role source of truth/i,
    /How each role is assigned/i,
    /Header.*neutrality/i,
    /\/admin\/users/,
    /admin_role_change_audit/,
    /Migration 061/i,
    /Migration 079/i,
    /Metrics.*analytics/i,
  ]) {
    assert.match(doc, required, `audit doc missing section: ${required}`);
  }
});

// ── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:adminUsersRoleManagement] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
