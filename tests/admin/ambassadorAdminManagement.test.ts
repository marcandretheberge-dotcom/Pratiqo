import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ADMIN_COMMAND_CENTER_MODULES } from "@/lib/admin/overview";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

function exists(path: string): boolean {
  return existsSync(join(process.cwd(), path));
}

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

function changedFiles(): string[] {
  const output = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
  return output ? output.split(/\r?\n/) : [];
}

const migration095 = read("supabase/migrations/095_ambassador_membership_admin.sql");
const migrationUserIdentity = read(
  "supabase/migrations/20261031180000_ambassador_user_identity.sql",
);
const adminLib = read("lib/admin/ambassadors.ts");
const auditLib = read("lib/admin/auditLog.ts");
const referralRoute = read("app/r/[code]/route.ts");
const adminListRoute = read("app/api/admin/ambassadors/route.ts");
const adminDetailRoute = read("app/api/admin/ambassadors/[id]/route.ts");
const adminLinksRoute = read("app/api/admin/ambassadors/[id]/links/route.ts");
const adminLinkRoute = read("app/api/admin/ambassador-links/[id]/route.ts");
const adminRewardRoute = read("app/api/admin/ambassador-rewards/[id]/mark-paid/route.ts");
const adminPage = read("app/(app)/admin/ambassadors/page.tsx");
const adminDetailPage = read("components/admin/AmbassadorAdminDetailClient.tsx");
const adminUserDetail = read("app/(app)/admin/users/[id]/page.tsx");
const adminDoc = read("docs/AMBASSADOR_ADMIN_MANAGEMENT.md");

test("migration 095 creates explicit ambassador membership separate from links", () => {
  assert.match(migration095, /CREATE TABLE IF NOT EXISTS public\.ambassadors/);
  assert.match(migration095, /teacher_id text NOT NULL UNIQUE REFERENCES public\.teachers\(id\)/);
  assert.match(migration095, /status text NOT NULL DEFAULT 'active'/);
  assert.match(migration095, /status IN \('invited', 'active', 'paused', 'revoked'\)/);
  assert.match(migration095, /COMMENT ON TABLE public\.ambassadors IS[\s\S]*Separate from Founding Teacher status/);
  assert.match(migration095, /ADD COLUMN IF NOT EXISTS ambassador_id uuid REFERENCES public\.ambassadors\(id\)/);
  assert.match(migration095, /Backfilled from existing ambassador links/);
  assert.match(migration095, /UPDATE public\.ambassador_links al[\s\S]*AND al\.ambassador_id IS NULL/);
});

test("existing teachers are activated without account or teacher recreation", () => {
  assert.match(migration095, /admin_activate_ambassador/);
  assert.match(migration095, /FROM public\.teachers t[\s\S]*LEFT JOIN public\.profiles p/);
  assert.match(migration095, /v_teacher\.role IS DISTINCT FROM 'teacher'/);
  assert.match(migration095, /ON CONFLICT \(teacher_id\) DO UPDATE/);
  assert.doesNotMatch(migration095, /INSERT INTO public\.teachers/);
  assert.doesNotMatch(migration095, /INSERT INTO public\.profiles/);
  assert.match(adminUserDetail, /data-testid="admin-user-ambassador-card"/);
  assert.match(adminUserDetail, /Activer comme ambassadeur/);
});

test("ambassador identity is user-first and teacher participation is optional", () => {
  assert.match(migrationUserIdentity, /ADD COLUMN IF NOT EXISTS user_id uuid/);
  assert.match(migrationUserIdentity, /ALTER COLUMN user_id SET NOT NULL/);
  assert.match(migrationUserIdentity, /idx_ambassadors_user_unique/);
  assert.match(migrationUserIdentity, /ALTER COLUMN teacher_id DROP NOT NULL/);
  assert.match(migrationUserIdentity, /admin_activate_ambassador_user/);
  assert.match(
    migrationUserIdentity,
    /CREATE OR REPLACE FUNCTION public\.admin_activate_ambassador\([\s\S]*RETURN public\.admin_activate_ambassador_user/,
  );
  assert.match(migrationUserIdentity, /p_user_identifier text/);
  assert.match(migrationUserIdentity, /lower\(p\.email\) = lower\(v_identifier\)/);
  assert.match(migrationUserIdentity, /a\.user_id AS ambassador_user_id/);
  assert.match(migrationUserIdentity, /LEFT JOIN public\.teachers t ON t\.id = a\.teacher_id/);
  assert.match(migrationUserIdentity, /FROM public\.ambassadors a\s+WHERE a\.id = v_link\.ambassador_id/);
  assert.doesNotMatch(migrationUserIdentity, /INSERT INTO public\.profiles/);
  assert.doesNotMatch(migrationUserIdentity, /INSERT INTO public\.teachers/);
  assert.match(adminLib, /admin_activate_ambassador_user/);
  assert.match(adminPage, /courriel, son UUID utilisateur ou son Teacher ID/);
});

test("new referral tracking requires active link and active ambassador membership", () => {
  assert.match(referralRoute, /\.from\("ambassador_links"\)/);
  assert.match(referralRoute, /\.eq\("active", true\)/);
  assert.match(referralRoute, /\.from\("ambassadors"\)/);
  assert.match(referralRoute, /\.eq\("status", "active"\)/);
  assert.match(referralRoute, /if \(!membershipResult\.data\) return NextResponse\.redirect/);
  assert.match(migration095, /Paused or revoked memberships block new tracking|Only active memberships may issue new referral sessions/);
});

test("migration exposes admin-only overview and keeps browser roles revoked", () => {
  assert.match(migration095, /CREATE OR REPLACE VIEW public\.ambassador_admin_overview/);
  assert.match(migration095, /ambassador_reward_economics/);
  assert.match(migration095, /membership_unique_fee_rollup/);
  assert.match(migration095, /UNION\s+SELECT ambassador_id, booking_id, gross_platform_fee_cents, net_platform_contribution_cents/);
  assert.match(migration095, /unique_realized_platform_fee_cents/);
  assert.match(migration095, /net_contribution_after_ambassador_cost_cents/);
  assert.match(migration095, /ALTER TABLE IF EXISTS public\.ambassadors ENABLE ROW LEVEL SECURITY/);
  assert.match(migration095, /REVOKE ALL ON public\.ambassadors FROM anon, authenticated/);
  assert.match(migration095, /REVOKE ALL ON public\.ambassador_admin_overview FROM anon, authenticated/);
  assert.match(migration095, /GRANT ALL ON public\.ambassadors TO service_role/);
  assert.match(migration095, /GRANT SELECT ON public\.ambassador_admin_overview TO service_role/);
});

test("admin RPCs are SECURITY DEFINER with safe search_path and no public execution", () => {
  for (const fn of [
    "admin_activate_ambassador",
    "admin_set_ambassador_status",
    "admin_create_ambassador_link",
    "admin_update_ambassador_link",
    "admin_mark_ambassador_reward_paid",
  ]) {
    const fnStart = migration095.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}`);
    assert.ok(fnStart >= 0, `${fn} exists`);
    const fnBody = migration095.slice(fnStart, migration095.indexOf("$$;", fnStart) + 3);
    assert.match(fnBody, /SECURITY DEFINER/);
    assert.match(fnBody, /SET search_path = public/);
    assert.match(fnBody, /ADMIN_ACTOR_REQUIRED/);
    assert.match(migration095, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(`));
    assert.match(migration095, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(`));
  }
});

test("admin audit actions cover membership, links and manual reward payment", () => {
  for (const action of [
    "ambassador.activated",
    "ambassador.paused",
    "ambassador.reactivated",
    "ambassador.revoked",
    "ambassador_link.created",
    "ambassador_link.updated",
    "ambassador_reward.marked_paid",
  ]) {
    assert.match(migration095, new RegExp(action.replace(".", "\\.")));
    assert.match(auditLib, new RegExp(action.replace(".", "\\.")));
  }
  assert.match(auditLib, /"ambassador_link"/);
  assert.match(auditLib, /"ambassador_reward"/);
});

test("manual mark-paid records ledger state only and does not create payouts", () => {
  assert.match(migration095, /admin_mark_ambassador_reward_paid/);
  assert.match(migration095, /status = 'paid'/);
  assert.match(migration095, /paid_at = now\(\)/);
  assert.match(migration095, /manual_payout_note/);
  const cleaned = stripCommentsAndStrings(`${migration095}\n${adminLib}\n${adminRewardRoute}`);
  assert.doesNotMatch(cleaned, /stripe|checkout|transfer|payment_intent|connect/i);
});

test("admin routes are admin-gated route handlers and do not import restricted systems", () => {
  for (const [label, src] of [
    ["list", adminListRoute],
    ["detail", adminDetailRoute],
    ["create link", adminLinksRoute],
    ["update link", adminLinkRoute],
    ["mark paid", adminRewardRoute],
  ] as const) {
    assert.match(src, /export const runtime = "nodejs"/, `${label} route uses node runtime`);
    assert.match(src, /await requireAdminApi\(req\)/, `${label} route gates with requireAdminApi`);
    const cleaned = stripCommentsAndStrings(src);
    assert.doesNotMatch(cleaned, /from\s+"stripe"|@\/lib\/payments|@\/lib\/yo|@\/components\/yo|@\/lib\/email|@\/lib\/messages/);
  }
});

test("admin UI surfaces exist and stay client-safe", () => {
  assert.ok(exists("app/(app)/admin/ambassadors/page.tsx"));
  assert.ok(exists("app/(app)/admin/ambassadors/[id]/page.tsx"));
  assert.ok(exists("components/admin/AmbassadorAdminDetailClient.tsx"));
  assert.match(adminPage, /"use client"/);
  assert.match(adminDetailPage, /"use client"/);
  assert.match(adminPage, /\/api\/admin\/ambassadors/);
  assert.match(adminDetailPage, /\/api\/admin\/ambassador-rewards\/\$\{encodeURIComponent\(reward\.id\)\}\/mark-paid/);
  assert.doesNotMatch(stripCommentsAndStrings(`${adminPage}\n${adminDetailPage}`), /getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/);
});

test("command center links to ambassador management", () => {
  const ambassadorModule = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "ambassadors");
  assert.ok(ambassadorModule);
  assert.equal(ambassadorModule!.status, "ready");
  assert.equal(ambassadorModule!.href, "/admin/ambassadors");
});

test("ambassador admin docs document deferred economic-acquisition scope", () => {
  assert.match(adminDoc, /new-account eligibility/i);
  assert.match(adminDoc, /new economic acquisition/i);
  assert.match(adminDoc, /deferred/i);
  assert.match(adminDoc, /20261031180000_ambassador_user_identity\.sql/);
  assert.match(adminDoc, /teacher profile is optional|teacher profile.*optional/i);
});

test("package ambassador script includes admin management regression", () => {
  const pkg = read("package.json");
  assert.match(pkg, /tests\/admin\/ambassadorAdminManagement\.test\.ts/);
});

test("ambassador admin PR stays away from restricted systems", () => {
  const forbidden = [
    /^app\/api\/stripe\//,
    /^app\/api\/bookings\//,
    /^app\/api\/group-sessions\//,
    /^lib\/payments\//,
    /^lib\/config\/membrePro\.ts$/,
    /^app\/yo\//,
    /^lib\/yo\//,
    /^public\/.*\.mp3$/i,
    /^scripts\/generate-yopratiqo-audio\.ts$/,
  ];
  for (const file of changedFiles()) {
    assert.equal(
      forbidden.some((pattern) => pattern.test(file)),
      false,
      `restricted system touched by ambassador admin PR: ${file}`,
    );
  }
});

async function run(): Promise<void> {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[admin:ambassadors] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
