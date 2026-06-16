// Regression suite for fix/wire-founder-promo-commission.
//
// What this pins:
//   - calculateBookingAmounts uses the precedence-aware effective fee:
//     paid Pro > active founder promo > standard tier table.
//   - calculateBookingPaymentAmounts and getPlatformFeeRate (in
//     lib/payments/amounts.ts) propagate the optional founderPromo
//     snapshot to the underlying calculator.
//   - When no `founderPromo` is supplied, behavior is byte-identical to
//     the legacy plan-only path — every existing test that didn't know
//     about founder promos must keep producing the same numbers.
//   - The Stripe checkout route loads the active founder promo via the
//     existing service-role admin client and feeds it into
//     calculateBookingAmounts BEFORE freezing the result into Stripe
//     session metadata. The webhook still reads pre-pinned metadata —
//     we explicitly DO NOT change webhook behavior.
//   - The booking-success idempotent fallback applies the same lookup
//     for receipt-row consistency.
//   - Volume / tier behavior is untouched for both standard and paid
//     Pro teachers (sanity assertions on bps thresholds).
//   - No Stripe API surface change (no new Stripe SDK call shapes).
//   - No profiles.plan / subscription_status writes are introduced.
//   - No service-role key references in client code.
//   - admin_founder_promotions migration 080 stays deny-by-default RLS.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  calculateBookingAmounts,
  getEffectivePlatformFeeBasisPoints,
  getPlatformFeeBasisPoints,
  resolveEffectiveCommissionSource,
  type EffectivePlatformFeeRateInput,
} from "@/lib/payments/commission";
import {
  calculateBookingPaymentAmounts,
  getPlatformFeeRate,
  getPlatformFeeRatePlanOnly,
} from "@/lib/payments/amounts";
import {
  FOUNDER_PROMO_DEFAULT_RATE_BPS,
  type FounderPromoSnapshot,
} from "@/lib/payments/founderPromo";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const READ = (relPath: string) => readFileSync(join(process.cwd(), relPath), "utf8");

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[^"'\n]*?\/\/[^\n]*$/gm, (line) => line.replace(/\/\/[^\n]*$/, ""))
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

const ACTIVE_PROMO: FounderPromoSnapshot = {
  startedAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-07-01T00:00:00.000Z",
  commissionRateBps: 500,
  endedEarlyAt: null,
};
const NOW_DURING = new Date("2026-04-01T00:00:00.000Z");
const NOW_AFTER = new Date("2026-08-01T00:00:00.000Z");

const EXPIRED_PROMO: FounderPromoSnapshot = {
  startedAt: "2025-01-01T00:00:00.000Z",
  endsAt: "2025-07-01T00:00:00.000Z",
  commissionRateBps: 500,
  endedEarlyAt: null,
};
const ENDED_EARLY_PROMO: FounderPromoSnapshot = {
  startedAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-07-01T00:00:00.000Z",
  commissionRateBps: 500,
  endedEarlyAt: "2026-02-15T00:00:00.000Z",
};

// ── calculateBookingAmounts: precedence ─────────────────────────────────────

test("standard teacher (no Pro, no founder promo) → free-plan bronze tier (1500 bps)", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "free",
  });
  assert.equal(a.feeBasisPoints, 1500);
  assert.equal(a.feeRate, 0.15);
  assert.equal(a.platformFeeCents, 1500);
  assert.equal(a.teacherNetCents, 8500);
});

test("paid Membre Pro teacher → pro-plan bronze tier (500 bps)", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "pro",
  });
  assert.equal(a.feeBasisPoints, 500);
  assert.equal(a.feeRate, 0.05);
  assert.equal(a.platformFeeCents, 500);
});

test("active founder promo on free-plan teacher → 500 bps (was 1500 bps)", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "free",
    founderPromo: ACTIVE_PROMO,
    now: NOW_DURING,
  });
  assert.equal(a.feeBasisPoints, 500);
  assert.equal(a.platformFeeCents, 500);
  assert.equal(a.teacherNetCents, 9500);
});

test("paid Pro + active founder promo → still uses Pro path (paid Pro precedence)", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "pro",
    founderPromo: ACTIVE_PROMO,
    now: NOW_DURING,
  });
  // Pro bronze = 500 bps, equal to the founder promo here, but the
  // selector must still report `paid_pro`. Use platine to disambiguate
  // (pro platine = 350 bps, founder promo = 500 bps).
  const aPlatine = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "pro",
    annualVolumeCents: 5_000_000,
    founderPromo: ACTIVE_PROMO,
    now: NOW_DURING,
  });
  assert.equal(a.feeBasisPoints, 500);
  assert.equal(aPlatine.feeBasisPoints, 350);
  const src = resolveEffectiveCommissionSource({
    teacherPlan: "pro",
    annualVolumeCents: 5_000_000,
    founderPromo: ACTIVE_PROMO,
    now: NOW_DURING,
  });
  assert.equal(src, "paid_pro");
});

test("expired founder promo does NOT apply", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "free",
    founderPromo: EXPIRED_PROMO,
    now: NOW_AFTER,
  });
  assert.equal(a.feeBasisPoints, 1500);
});

test("ended-early founder promo does NOT apply", () => {
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "free",
    founderPromo: ENDED_EARLY_PROMO,
    now: NOW_DURING,
  });
  assert.equal(a.feeBasisPoints, 1500);
});

// ── Volume tier preservation ───────────────────────────────────────────────

test("free-plan volume tiers untouched: bronze=1500, argent=1400, or=1300, platine=1200", () => {
  const tiers: Array<[number, number]> = [
    [0, 1500],
    [600_000, 1400],
    [2_000_000, 1300],
    [4_000_000, 1200],
  ];
  for (const [vol, expectedBps] of tiers) {
    const a = calculateBookingAmounts({
      subtotalCents: 10_000,
      teacherPlan: "free",
      annualVolumeCents: vol,
    });
    assert.equal(a.feeBasisPoints, expectedBps, `free@${vol} should be ${expectedBps}`);
  }
});

test("pro-plan volume tiers untouched: bronze=500, argent=450, or=400, platine=350", () => {
  const tiers: Array<[number, number]> = [
    [0, 500],
    [600_000, 450],
    [2_000_000, 400],
    [4_000_000, 350],
  ];
  for (const [vol, expectedBps] of tiers) {
    const a = calculateBookingAmounts({
      subtotalCents: 10_000,
      teacherPlan: "pro",
      annualVolumeCents: vol,
    });
    assert.equal(a.feeBasisPoints, expectedBps, `pro@${vol} should be ${expectedBps}`);
  }
});

test("founder promo on free plan: volume tier table is bypassed (always uses promo bps)", () => {
  // Even at platine volume on free plan (= 1200 bps), the active founder
  // promo replaces it with 500 bps.
  const a = calculateBookingAmounts({
    subtotalCents: 10_000,
    teacherPlan: "free",
    annualVolumeCents: 5_000_000,
    founderPromo: ACTIVE_PROMO,
    now: NOW_DURING,
  });
  assert.equal(a.feeBasisPoints, 500);
});

// ── Backward compatibility: no founderPromo => identical to today ──────────

test("calculateBookingAmounts without founderPromo is byte-identical to legacy path", () => {
  for (const plan of ["free", "pro", "business", "enterprise"]) {
    for (const vol of [0, 600_000, 2_000_000, 4_000_000]) {
      const legacy = getPlatformFeeBasisPoints({
        teacherPlan: plan,
        annualVolumeCents: vol,
      });
      const a = calculateBookingAmounts({
        subtotalCents: 10_000,
        teacherPlan: plan,
        annualVolumeCents: vol,
      });
      assert.equal(a.feeBasisPoints, legacy, `parity broke for plan=${plan} vol=${vol}`);
    }
  }
});

test("getPlatformFeeRate without founderPromo equals the legacy plan-only helper", () => {
  for (const plan of ["free", "pro", "business", "enterprise"]) {
    const a = getPlatformFeeRate(plan, "individual");
    const b = getPlatformFeeRatePlanOnly(plan, "individual");
    assert.equal(a, b, `plan=${plan} drifted from legacy plan-only path`);
  }
});

// ── lib/payments/amounts wrapper propagation ────────────────────────────────

test("calculateBookingPaymentAmounts forwards founderPromo to the inner calculator", () => {
  const a = calculateBookingPaymentAmounts(10_000, "free", "individual", 0);
  assert.equal(a.commissionRate, 0.15);
  const b = calculateBookingPaymentAmounts(
    10_000,
    "free",
    "individual",
    0,
    ACTIVE_PROMO,
  );
  // The wrapper does not pass `now`, so we rely on the snapshot being
  // active *at the test runtime*. Construct one whose window covers
  // "today" so the assertion is stable in CI.
  const todayPromo: FounderPromoSnapshot = {
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    commissionRateBps: 500,
    endedEarlyAt: null,
  };
  const c = calculateBookingPaymentAmounts(
    10_000,
    "free",
    "individual",
    0,
    todayPromo,
  );
  assert.equal(c.commissionRate, 0.05);
  // `b` uses ACTIVE_PROMO whose dates are 2026-01..07; whether that's
  // active depends on test clock. We don't pin its result here; we
  // only pin behavior with a guaranteed-current window via `todayPromo`.
  assert.ok(b.commissionRate === 0.05 || b.commissionRate === 0.15);
});

test("getPlatformFeeRate(plan, kind, founderPromo) honors the snapshot", () => {
  const todayPromo: FounderPromoSnapshot = {
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    commissionRateBps: FOUNDER_PROMO_DEFAULT_RATE_BPS,
    endedEarlyAt: null,
  };
  assert.equal(getPlatformFeeRate("free", "individual", todayPromo), 0.05);
  // Paid Pro precedence: even with an active promo, Pro path wins.
  assert.equal(getPlatformFeeRate("pro", "individual", todayPromo), 0.05);
});

// ── Stripe checkout route wiring (source-scan) ─────────────────────────────

const CHECKOUT_ROUTE = READ("app/api/stripe/checkout/route.ts");

test("Stripe checkout imports the founder-promo loader from the admin server lib", () => {
  assert.match(
    CHECKOUT_ROUTE,
    /import\s*\{[^}]*loadActiveFounderPromo[^}]*\}\s*from\s*["']@\/lib\/admin\/founderPromo["']/,
  );
  assert.match(
    CHECKOUT_ROUTE,
    /import\s*\{[^}]*rowToSnapshot[^}]*\}\s*from\s*["']@\/lib\/admin\/founderPromo["']/,
  );
});

test("Stripe checkout calls loadActiveFounderPromo BEFORE calculateBookingAmounts", () => {
  const code = stripCommentsAndStrings(CHECKOUT_ROUTE);
  const promoIdx = code.indexOf("loadActiveFounderPromo(admin");
  const calcIdx = code.indexOf("calculateBookingAmounts({");
  assert.ok(promoIdx > 0, "loadActiveFounderPromo call missing");
  assert.ok(calcIdx > 0, "calculateBookingAmounts call missing");
  assert.ok(
    promoIdx < calcIdx,
    "founder-promo lookup must run BEFORE the amount calculator so the snapshot can be passed in",
  );
});

test("Stripe checkout passes founderPromo into calculateBookingAmounts", () => {
  const code = stripCommentsAndStrings(CHECKOUT_ROUTE);
  // Find the calculateBookingAmounts({ ... }) call body.
  const callMatch = code.match(/calculateBookingAmounts\(\{([\s\S]*?)\}\)/);
  assert.ok(callMatch, "calculateBookingAmounts call not found");
  const body = callMatch[1];
  assert.match(body, /founderPromo:\s*founderPromoSnapshot/);
});

test("Stripe checkout does NOT introduce new Stripe API calls (no new stripe.* surface)", () => {
  // Source-scan smell test: this PR shouldn't add ANY new `stripe.<x>(`
  // call shapes that weren't already in the file. We check that no new
  // Stripe SDK methods were used by comparing against a known whitelist
  // present in the route at PR #192 time.
  const used = new Set<string>();
  for (const m of CHECKOUT_ROUTE.matchAll(/\bstripe\.([a-zA-Z]+)(?:\.[a-zA-Z]+)?\(/g)) {
    used.add(m[1]);
  }
  const allowed = new Set(["checkout", "products", "prices"]);
  for (const u of used) {
    assert.ok(allowed.has(u), `new stripe.${u}(...) usage detected — payment surface change must be a separate PR`);
  }
});

test("Stripe checkout never writes profiles.plan or subscription_status", () => {
  const code = stripCommentsAndStrings(CHECKOUT_ROUTE);
  // No `.update({...plan...})` on profiles.
  assert.doesNotMatch(code, /profiles[\s\S]{0,300}\.update\(\{[^}]*\bplan\b/);
  assert.doesNotMatch(code, /profiles[\s\S]{0,300}\.update\(\{[^}]*subscription_status/);
});

test("Stripe checkout pins commission_source + founder_promo_id into Stripe metadata", () => {
  // Forensic breadcrumbs let admins reconstruct which precedence branch
  // produced the pinned commission without a re-read of the founder
  // promo table.
  assert.match(CHECKOUT_ROUTE, /commission_source:\s*founderPromoApplied/);
  assert.match(CHECKOUT_ROUTE, /founder_promo_id:\s*founderPromoApplied/);
});

// ── Booking-success idempotent fallback wiring ─────────────────────────────

const BOOKING_SUCCESS = READ("app/(app)/booking/success/page.tsx");

test("Booking-success fallback imports the founder-promo loader", () => {
  assert.match(
    BOOKING_SUCCESS,
    /import\s*\{[^}]*loadActiveFounderPromo[^}]*\}\s*from\s*["']@\/lib\/admin\/founderPromo["']/,
  );
});

test("Booking-success fallback passes founderPromo snapshot into getPlatformFeeRate", () => {
  const code = stripCommentsAndStrings(BOOKING_SUCCESS);
  // Match: getPlatformFeeRate(plan, "individual", founderPromoSnapshot)
  // (the third positional arg is the founder-promo snapshot).
  assert.match(
    code,
    /getPlatformFeeRate\(\s*plan\s*,\s*""\s*,\s*founderPromoSnapshot\s*\)/,
  );
});

// ── Webhook isolation ──────────────────────────────────────────────────────

test("Stripe webhook does NOT call loadActiveFounderPromo (metadata-driven, frozen at checkout)", () => {
  const webhook = READ("app/api/stripe/webhook/route.ts");
  // The webhook must not perform a founder-promo lookup. The commission
  // is already pinned in the Stripe session metadata at checkout time;
  // re-querying here would defeat the freeze and could change the
  // settlement amount if the promo expired between checkout and capture.
  assert.doesNotMatch(webhook, /loadActiveFounderPromo/);
  assert.doesNotMatch(webhook, /admin_founder_promotions/);
});

// ── Migration 080 RLS still deny-by-default (sanity) ───────────────────────

test("Migration 080 (admin_founder_promotions) keeps RLS deny-by-default", () => {
  const sql = READ("supabase/migrations/080_admin_founder_promotions.sql");
  assert.match(sql, /enable\s+row\s+level\s+security/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
});

// ── Client-side surface: no service-role key leakage ───────────────────────

test("Founder-promo helper is not imported from any client component", () => {
  // The brief: "Do not fetch founder promo data in client components."
  // We accept imports only in server contexts: API routes, server
  // components / server pages, or other server helpers. As a structural
  // proxy, every importer must NOT contain "use client".
  const importers = [
    "app/api/stripe/checkout/route.ts",
    "app/(app)/booking/success/page.tsx",
    "app/api/admin/users/[id]/route.ts",
    "app/api/admin/users/[id]/founder-promo/route.ts",
    "app/(app)/admin/users/[id]/page.tsx",
  ];
  for (const file of importers) {
    const src = READ(file);
    assert.match(src, /loadActiveFounderPromo|loadFounderPromoHistory|activateFounderPromo|endFounderPromoEarly/);
    assert.doesNotMatch(
      src,
      /^\s*"use client"/m,
      `${file} must remain server-only because it imports the founder-promo helper`,
    );
  }
});

// ── Effective helper sanity (unchanged from PR #192 but re-pinned here) ────

test("getEffectivePlatformFeeBasisPoints clamps a malformed promo rate to [0, 10000]", () => {
  const wild: FounderPromoSnapshot = {
    startedAt: "2020-01-01T00:00:00.000Z",
    endsAt: "2099-01-01T00:00:00.000Z",
    commissionRateBps: 99_999,
    endedEarlyAt: null,
  };
  const input: EffectivePlatformFeeRateInput = {
    teacherPlan: "free",
    founderPromo: wild,
  };
  assert.equal(getEffectivePlatformFeeBasisPoints(input), 10_000);
});

// ── Run ────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[payments:founderPromoLiveCommission] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
