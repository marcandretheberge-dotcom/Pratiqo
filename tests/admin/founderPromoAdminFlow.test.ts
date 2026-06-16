// Regression suite for feat/admin-profile-founder-promo.
//
// What this pins:
//   - Effective-commission precedence: paid Pro > founder promo > standard.
//   - Founder promo activation defaults: 6 months, 500 bps (5 %).
//   - Founder promo lifecycle: dynamic expiry (no cron), early termination,
//     and the helper never marks `profiles.plan = "pro"`.
//   - Migration 080 (`admin_founder_promotions`) is RLS-enabled, has zero
//     JWT policies, exposes the right columns and indexes, and acts as
//     both source of truth and audit trail.
//   - The new admin API routes (`/api/admin/users/:id` and
//     `/api/admin/users/:id/founder-promo`) all gate behind
//     `requireAdminApi` and never import Stripe / messaging / YoPratiqo.
//   - The detail page mounts under `/admin/(app)/admin/...` so the layout
//     `requireAdminPage()` runs first.
//   - `/devenir-professeur` swapped the legacy "0 % commission" /
//     "100 % de tes revenus" copy for the canonical 5 % / 6 months wording.
//   - Membre Pro pricing is still 29,99 $ CAD/month + taxes where mentioned.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeFounderPromoEndDate,
  FOUNDER_PROMO_DEFAULT_DURATION_MONTHS,
  FOUNDER_PROMO_DEFAULT_RATE_BPS,
  isFounderPromoCurrentlyActive,
  type FounderPromoSnapshot,
} from "@/lib/payments/founderPromo";
import {
  getEffectivePlatformFeeBasisPoints,
  getEffectivePlatformFeeRate,
  getPlatformFeeBasisPoints,
  resolveEffectiveCommissionSource,
} from "@/lib/payments/commission";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const READ = (relPath: string) => readFileSync(join(process.cwd(), relPath), "utf8");

/**
 * Strips JS/TS line comments, block comments, and string literals from
 * source so that "doesNotMatch" assertions can target real code without
 * tripping over docs that intentionally mention forbidden terms (e.g.
 * comments that document what the module DOESN'T touch).
 */
function stripCommentsAndStrings(src: string): string {
  return src
    // /* … */ block comments (non-greedy, multi-line)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // // line comments
    .replace(/^[^"'\n]*?\/\/[^\n]*$/gm, (line) => line.replace(/\/\/[^\n]*$/, ""))
    // template / single / double strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

// ── Defaults contract ───────────────────────────────────────────────────────

test("Founder promo defaults: 6 months, 500 bps (5 %)", () => {
  assert.equal(FOUNDER_PROMO_DEFAULT_DURATION_MONTHS, 6);
  assert.equal(FOUNDER_PROMO_DEFAULT_RATE_BPS, 500);
});

test("computeFounderPromoEndDate adds calendar months (UTC), not 30-day windows", () => {
  // Jan 15 2026 + 6 months => Jul 15 2026. Done in UTC to avoid DST drift.
  const start = new Date("2026-01-15T12:00:00.000Z");
  const end = computeFounderPromoEndDate(start, 6);
  assert.equal(end.toISOString().slice(0, 10), "2026-07-15");
});

test("computeFounderPromoEndDate clamps negative or non-finite months to 0 added", () => {
  const start = new Date("2026-01-15T12:00:00.000Z");
  const sameMonth = computeFounderPromoEndDate(start, -3);
  assert.equal(sameMonth.toISOString().slice(0, 10), "2026-01-15");
});

// ── Snapshot helper ─────────────────────────────────────────────────────────

test("isFounderPromoCurrentlyActive returns false on null snapshot", () => {
  assert.equal(isFounderPromoCurrentlyActive(null), false);
});

test("isFounderPromoCurrentlyActive: active when start <= now < end and no early end", () => {
  const now = new Date("2026-04-01T00:00:00.000Z");
  const snap: FounderPromoSnapshot = {
    startedAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-07-01T00:00:00.000Z",
    commissionRateBps: 500,
    endedEarlyAt: null,
  };
  assert.equal(isFounderPromoCurrentlyActive(snap, now), true);
});

test("isFounderPromoCurrentlyActive: false after natural ends_at", () => {
  const now = new Date("2026-08-01T00:00:00.000Z");
  const snap: FounderPromoSnapshot = {
    startedAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-07-01T00:00:00.000Z",
    commissionRateBps: 500,
    endedEarlyAt: null,
  };
  assert.equal(isFounderPromoCurrentlyActive(snap, now), false);
});

test("isFounderPromoCurrentlyActive: false when ended_early_at <= now", () => {
  const now = new Date("2026-04-01T00:00:00.000Z");
  const snap: FounderPromoSnapshot = {
    startedAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-07-01T00:00:00.000Z",
    commissionRateBps: 500,
    endedEarlyAt: "2026-03-15T00:00:00.000Z",
  };
  assert.equal(isFounderPromoCurrentlyActive(snap, now), false);
});

test("isFounderPromoCurrentlyActive: false when promo is in the future", () => {
  const now = new Date("2025-12-01T00:00:00.000Z");
  const snap: FounderPromoSnapshot = {
    startedAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-07-01T00:00:00.000Z",
    commissionRateBps: 500,
    endedEarlyAt: null,
  };
  assert.equal(isFounderPromoCurrentlyActive(snap, now), false);
});

// ── Effective commission precedence ────────────────────────────────────────

const ACTIVE_SNAP: FounderPromoSnapshot = {
  startedAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-07-01T00:00:00.000Z",
  commissionRateBps: 500,
  endedEarlyAt: null,
};
const NOW_DURING = new Date("2026-04-01T00:00:00.000Z");
const NOW_AFTER = new Date("2026-08-01T00:00:00.000Z");

test("Precedence: paid Membre Pro always wins over founder promo", () => {
  // Even with an active founder promo for the same teacher, the paid Pro
  // path (PRO_PLAN_BPS) must be returned. Bronze tier => 500 bps for both,
  // so we use platine to make the precedence behaviour observable: paid Pro
  // platine = 350 bps (lower) while founder promo = 500 bps.
  const bps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: "pro",
    annualVolumeCents: 5_000_000,
    founderPromo: ACTIVE_SNAP,
    now: NOW_DURING,
  });
  assert.equal(bps, 350);
  const source = resolveEffectiveCommissionSource({
    teacherPlan: "pro",
    annualVolumeCents: 5_000_000,
    founderPromo: ACTIVE_SNAP,
    now: NOW_DURING,
  });
  assert.equal(source, "paid_pro");
});

test("Precedence: active founder promo applies when teacher is on free plan", () => {
  // Free plan + active founder promo => 500 bps (5 %), NOT 1500 bps standard.
  const bps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: "free",
    founderPromo: ACTIVE_SNAP,
    now: NOW_DURING,
  });
  assert.equal(bps, 500);
  const source = resolveEffectiveCommissionSource({
    teacherPlan: "free",
    founderPromo: ACTIVE_SNAP,
    now: NOW_DURING,
  });
  assert.equal(source, "founder_promo");
});

test("Precedence: expired founder promo falls back to standard rules", () => {
  const bps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: "free",
    founderPromo: ACTIVE_SNAP,
    now: NOW_AFTER,
  });
  // Standard bronze tier on free plan = 1500 bps (15 %).
  assert.equal(bps, 1500);
  assert.equal(
    resolveEffectiveCommissionSource({
      teacherPlan: "free",
      founderPromo: ACTIVE_SNAP,
      now: NOW_AFTER,
    }),
    "standard",
  );
});

test("Precedence: no founder promo at all -> standard rules untouched", () => {
  const standard = getPlatformFeeBasisPoints({
    teacherPlan: "free",
    annualVolumeCents: 1_000_000,
  });
  const effective = getEffectivePlatformFeeBasisPoints({
    teacherPlan: "free",
    annualVolumeCents: 1_000_000,
  });
  assert.equal(effective, standard);
  assert.equal(
    resolveEffectiveCommissionSource({
      teacherPlan: "free",
      annualVolumeCents: 1_000_000,
    }),
    "standard",
  );
});

test("Effective commission rate matches bps / 10_000", () => {
  const rate = getEffectivePlatformFeeRate({
    teacherPlan: "free",
    founderPromo: ACTIVE_SNAP,
    now: NOW_DURING,
  });
  assert.equal(rate, 0.05);
});

test("Founder promo rate is clamped to [0, 10000] bps", () => {
  const wild: FounderPromoSnapshot = {
    startedAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-07-01T00:00:00.000Z",
    commissionRateBps: 99_999,
    endedEarlyAt: null,
  };
  const bps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: "free",
    founderPromo: wild,
    now: NOW_DURING,
  });
  assert.equal(bps, 10_000);
});

// ── Migration 080 ───────────────────────────────────────────────────────────

const MIGRATION_080 = READ("supabase/migrations/080_admin_founder_promotions.sql");

test("Migration 080 creates admin_founder_promotions with the required columns", () => {
  assert.match(
    MIGRATION_080,
    /create\s+table\s+if\s+not\s+exists\s+public\.admin_founder_promotions/i,
  );
  for (const col of [
    /teacher_id\s+uuid\s+not\s+null/,
    /started_at\s+timestamptz\s+not\s+null/,
    /ends_at\s+timestamptz\s+not\s+null/,
    /commission_rate_bps\s+integer\s+not\s+null/,
    /created_by\s+uuid\s+not\s+null/,
    /ended_early_at\s+timestamptz/,
    /ended_early_by\s+uuid/,
  ]) {
    assert.match(MIGRATION_080, col, `column missing: ${col}`);
  }
});

test("Migration 080 enables RLS with ZERO policies (service-role only)", () => {
  assert.match(
    MIGRATION_080,
    /alter\s+table\s+public\.admin_founder_promotions\s+enable\s+row\s+level\s+security/i,
  );
  assert.doesNotMatch(
    MIGRATION_080,
    /create\s+policy/i,
    "founder-promo table must have zero JWT policies (deny-by-default)",
  );
});

test("Migration 080 has indexes for active-lookup and history-lookup", () => {
  assert.match(
    MIGRATION_080,
    /admin_founder_promotions_teacher_active_idx[\s\S]+where\s+ended_early_at\s+is\s+null/i,
  );
  assert.match(MIGRATION_080, /admin_founder_promotions_teacher_history_idx/);
});

test("Migration 080 bounds commission_rate_bps via CHECK constraint", () => {
  assert.match(MIGRATION_080, /check\s*\(\s*commission_rate_bps\s+between\s+0\s+and\s+10000\s*\)/i);
});

// ── Server helper guardrails ────────────────────────────────────────────────

const FOUNDER_HELPER = READ("lib/admin/founderPromo.ts");

test("admin/founderPromo helper does not import Stripe or YoPratiqo modules", () => {
  assert.doesNotMatch(FOUNDER_HELPER, /from\s+["'][^"']*stripe[^"']*["']/i);
  assert.doesNotMatch(FOUNDER_HELPER, /from\s+["'][^"']*yopratiqo[^"']*["']/i);
  assert.doesNotMatch(FOUNDER_HELPER, /from\s+["'][^"']*yo\/[^"']*["']/i);
});

test("admin/founderPromo helper never updates profiles.plan or subscription_status (code, not docs)", () => {
  // The whole point of the founder promo: it must NOT impersonate a paid
  // Stripe Pro subscription. Strip comments + strings first so the doc
  // comments that explicitly document this boundary aren't false-positives.
  const code = stripCommentsAndStrings(FOUNDER_HELPER);
  assert.doesNotMatch(code, /profiles[\s\S]{0,200}\.update[\s\S]{0,200}plan/i);
  assert.doesNotMatch(code, /subscription_status/);
  assert.doesNotMatch(code, /stripe_subscription_id/);
});

test("activateFounderPromo defaults to 6 months / 500 bps", () => {
  // Source-scan the helper body for the exact default constants so a
  // well-meaning copy-paste change is caught at CI time, not in production.
  assert.match(
    FOUNDER_HELPER,
    /FOUNDER_PROMO_DEFAULT_DURATION_MONTHS/,
  );
  assert.match(FOUNDER_HELPER, /FOUNDER_PROMO_DEFAULT_RATE_BPS/);
});

// ── API route guardrails ────────────────────────────────────────────────────

const DETAIL_API = READ("app/api/admin/users/[id]/route.ts");
const PROMO_API = READ("app/api/admin/users/[id]/founder-promo/route.ts");

test("Detail API requires admin auth before any DB work", () => {
  assert.match(DETAIL_API, /requireAdminApi\(req\)/);
  // Both verbs must hit the guard.
  const getIdx = DETAIL_API.indexOf("export async function GET");
  const patchIdx = DETAIL_API.indexOf("export async function PATCH");
  assert.ok(getIdx >= 0 && patchIdx >= 0);
  assert.match(DETAIL_API.slice(getIdx, getIdx + 400), /requireAdminApi/);
  assert.match(DETAIL_API.slice(patchIdx, patchIdx + 400), /requireAdminApi/);
});

test("Detail API PATCH only allows the `name` field (everything else is rejected)", () => {
  assert.match(DETAIL_API, /SAFE_PATCH_FIELDS\s*=\s*new\s+Set<string>\(\["name"\]\)/);
  assert.match(DETAIL_API, /Champs non éditables ici/);
});

test("Detail API never selects Stripe customer/subscription IDs (code, not docs)", () => {
  const code = stripCommentsAndStrings(DETAIL_API);
  assert.doesNotMatch(code, /stripe_customer_id/);
  assert.doesNotMatch(code, /stripe_subscription_id/);
});

test("Detail API does not import Stripe / messaging / YoPratiqo modules", () => {
  assert.doesNotMatch(DETAIL_API, /from\s+["'][^"']*stripe[^"']*["']/i);
  assert.doesNotMatch(DETAIL_API, /from\s+["'][^"']*messaging[^"']*["']/i);
  assert.doesNotMatch(DETAIL_API, /from\s+["'][^"']*yopratiqo[^"']*["']/i);
});

test("Founder-promo API gates POST and DELETE behind requireAdminApi", () => {
  assert.match(PROMO_API, /requireAdminApi\(req\)/);
  for (const verb of ["POST", "DELETE"]) {
    const idx = PROMO_API.indexOf(`export async function ${verb}`);
    assert.ok(idx >= 0, `${verb} handler missing`);
    assert.match(PROMO_API.slice(idx, idx + 600), /requireAdminApi/);
  }
});

test("Founder-promo API verifies the target is a teacher before activating", () => {
  assert.match(PROMO_API, /role\s*!==\s*"teacher"/);
  assert.match(PROMO_API, /ne s'applique qu'aux enseignants/);
});

test("Founder-promo API refuses to stack a second active promo", () => {
  assert.match(PROMO_API, /loadActiveFounderPromo/);
  assert.match(PROMO_API, /Une promotion fondateur est déjà active/);
  assert.match(PROMO_API, /status:\s*409/);
});

test("Founder-promo API never touches profiles.plan / subscription_status (code, not docs)", () => {
  const code = stripCommentsAndStrings(PROMO_API);
  assert.doesNotMatch(code, /profiles[\s\S]{0,200}\.update[\s\S]{0,200}plan/i);
  assert.doesNotMatch(code, /subscription_status/);
  assert.doesNotMatch(code, /stripe_subscription_id/);
  assert.doesNotMatch(PROMO_API, /from\s+["'][^"']*stripe[^"']*["']/i);
});

// ── Page mount guardrails ──────────────────────────────────────────────────

const DETAIL_PAGE = READ("app/(app)/admin/users/[id]/page.tsx");

test("/admin/users/[id] mounts inside (app)/admin so the layout requireAdminPage runs", () => {
  // The mere presence of the file under app/(app)/admin guarantees the
  // layout's `requireAdminPage()` runs first. We additionally assert the
  // page never tries to render a Supabase service-role key client-side
  // (no NEXT_PUBLIC service-role leakage).
  assert.doesNotMatch(DETAIL_PAGE, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(DETAIL_PAGE, /getSupabaseAdmin\(\)/);
});

test("/admin/users/[id] does not import Stripe SDKs or webhook code", () => {
  assert.doesNotMatch(DETAIL_PAGE, /from\s+["'][^"']*stripe[^"']*["']/i);
});

test("/admin/users/[id] surfaces the three precedence labels for admin clarity", () => {
  for (const label of ["Membre Pro payé", "Promotion fondateur", "Taux standard"]) {
    assert.ok(
      DETAIL_PAGE.includes(label),
      `detail page should mention "${label}" so admin sees which precedence branch applies`,
    );
  }
});

// ── Founder-promo card client island ────────────────────────────────────────

const PROMO_CARD = READ("components/admin/FounderPromoCard.tsx");

test("Founder promo card calls the dedicated API and triggers a router refresh", () => {
  assert.match(PROMO_CARD, /\/api\/admin\/users\/\$\{teacherId\}\/founder-promo/);
  assert.match(PROMO_CARD, /method:\s*"POST"/);
  assert.match(PROMO_CARD, /method:\s*"DELETE"/);
  assert.match(PROMO_CARD, /router\.refresh\(\)/);
});

test("Founder promo card warns admin that activation does NOT mark Membre Pro paid", () => {
  // Defense-in-depth: the UX wording must reinforce the boundary in
  // BOTH the visible JSX (rendered as <strong>N&apos;active pas</strong>)
  // AND the confirm() dialog string ("n'active PAS").
  assert.match(PROMO_CARD, /N&apos;active pas/);
  assert.match(PROMO_CARD, /n'active PAS/);
  assert.match(PROMO_CARD, /Membre Pro/);
});

// ── Devenir-professeur copy ─────────────────────────────────────────────────

const DEVENIR_PAGE = READ("app/devenir-professeur/page.tsx");

test("/devenir-professeur uses the canonical 5 % / 6 months founder offer wording", () => {
  assert.match(
    DEVENIR_PAGE,
    /5\s?% de commission pendant 6 mois pour les professeurs fondateurs/,
  );
});

test("/devenir-professeur no longer claims 0 % commission or 100 % revenue retention", () => {
  assert.doesNotMatch(DEVENIR_PAGE, /0\s?% de commission/i);
  assert.doesNotMatch(DEVENIR_PAGE, /0\s?% commission/i);
  assert.doesNotMatch(DEVENIR_PAGE, /100\s?% de tes revenus/i);
  assert.doesNotMatch(DEVENIR_PAGE, /garde 100\s?%/i);
  assert.doesNotMatch(DEVENIR_PAGE, /gratuit à vie/i);
});

test("/devenir-professeur explains the post-promo fallback (standard rate or Membre Pro)", () => {
  assert.match(
    DEVENIR_PAGE,
    /taux standard[\s\S]{0,200}sauf si tu choisis Membre Pro/i,
  );
});

// ── Membre Pro pricing remains 29,99 $ CAD/month + taxes where mentioned ───

const MEMBRE_PRO_CONFIG = READ("lib/config/membrePro.ts");

test("Membre Pro pricing constant is still 29.99 CAD / month", () => {
  assert.match(MEMBRE_PRO_CONFIG, /proMonthlyPriceCad:\s*29\.99/);
  assert.match(MEMBRE_PRO_CONFIG, /proMonthlyPriceCadDisplay/);
  assert.match(MEMBRE_PRO_CONFIG, /fr:\s*"29,99"/);
});

// ── Run ────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[admin:founderPromoAdminFlow] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
