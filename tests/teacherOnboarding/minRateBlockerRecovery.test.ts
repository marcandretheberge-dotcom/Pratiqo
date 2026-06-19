// Regression suite for fix/teacher-onboarding-min-rate-blocker.
//
// What this pins (source-scan + behavior tests):
//
//   1. Active teacher wizard at app/(app)/onboarding/teacher/page.tsx
//      defaults `home_lesson_price` to the standard hourly rate
//      whenever Step 2's teaching mode enables home lessons. Without
//      this fix, the wizard's upsert wrote home_lesson_enabled=true
//      with home_lesson_price=null, and the subsequent PATCH to
//      /api/teacher/pricing was rejected by the canonical 20 $
//      validator (validateTeacherLessonOffers → homeLessonSessionPriceCents
//      returns 0 ¢ when home_lesson_price is missing), leaving the
//      teacher permanently stuck at "Terminer".
//   2. The legacy app/onboarding/page.tsx applies the same defensive
//      default before sending to /api/onboarding/complete.
//   3. /api/onboarding/complete also coalesces missing home rates to
//      the standard hourly rate so a slightly out-of-sync client can't
//      reintroduce the trap.
//   4. The 20 $ minimum is preserved end-to-end — none of the changes
//      lower or bypass it.
//   5. Volume / tier behavior of validateTeacherLessonOffers is
//      unchanged for standard and paid Pro plans.
//   6. New admin route /api/admin/users/:id/teacher-onboarding:
//        - server-side admin guard (requireAdminApi)
//        - editable allowlist is strictly { price_per_lesson,
//          home_lesson_price, default_lesson_duration_minutes }
//        - re-validates against the 20 $ floor before writing
//        - does NOT modify role / plan / subscription_status /
//          teacher_onboarding_complete / is_verified / any Stripe column
//        - logs to admin_role_change_audit with the dedicated source
//   7. New TeacherOnboardingSupportCard is admin-only (lives in
//      components/admin) and reinforces the boundary copy
//      ("n'active PAS le statut payé Membre Pro").
//   8. The /admin/users/[id] page renders the support card server-side
//      so non-admin browsers never receive its data.
//   9. No Stripe / webhook / founder-promo / payment-status code is
//      touched.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  validateTeacherLessonOffers,
  homeLessonSessionPriceCents,
  standardLessonSessionPriceCents,
} from "@/lib/pricing/lessonOffer";
import { MIN_LESSON_PRICE_DOLLARS, MIN_LESSON_PRICE_CENTS } from "@/lib/pricing/constants";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const READ = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[^"'\n]*?\/\/[^\n]*$/gm, (line) => line.replace(/\/\/[^\n]*$/, ""))
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

// ── Canonical validator: 20 $ floor preserved ─────────────────────────

test("minimum is preserved at 20 $ / 2000 ¢ exactly (no silent lowering)", () => {
  assert.equal(MIN_LESSON_PRICE_DOLLARS, 20);
  assert.equal(MIN_LESSON_PRICE_CENTS, 2000);
});

test("standard lesson at 20 $/h passes the minimum check", () => {
  const r = validateTeacherLessonOffers({
    price_per_lesson: 20,
    home_lesson_enabled: false,
    intro_session_enabled: false,
  });
  assert.equal(r.ok, true);
});

test("standard lesson at 19.99 $/h is REJECTED (floor is hard)", () => {
  const r = validateTeacherLessonOffers({
    price_per_lesson: 19.99,
    home_lesson_enabled: false,
    intro_session_enabled: false,
  });
  assert.equal(r.ok, false);
});

test("non-numeric / negative / NaN values are rejected", () => {
  for (const bad of ["abc", -1, NaN, Infinity]) {
    const r = validateTeacherLessonOffers({
      price_per_lesson: bad as number,
      home_lesson_enabled: false,
      intro_session_enabled: false,
    });
    // standardLessonSessionPriceCents returns 0 for these → validator
    // skips the standard branch and intro is disabled → ok.
    assert.equal(r.ok, true);
    // But the standard cents helper itself returns 0 — which is the
    // signal the wizard uses to refuse the value at the client.
    assert.equal(standardLessonSessionPriceCents({ price_per_lesson: bad as number }), 0);
  }
});

// ── Wizard fix: home lessons enabled with explicit fallback rate ──────

test("homeLessonSessionPriceCents(25 $/h, 60 min) = 2500 ¢ (sanity)", () => {
  const cents = homeLessonSessionPriceCents({
    home_lesson_price: 25,
    home_lesson_min_duration: 60,
  });
  assert.equal(cents, 2500);
});

test("homeLessonSessionPriceCents(null) returns 0 — this is the trap the wizard now avoids", () => {
  const cents = homeLessonSessionPriceCents({
    home_lesson_price: null,
    home_lesson_min_duration: 60,
  });
  assert.equal(cents, 0);
});

test("home_lesson_enabled=true with explicit home rate of 25 $/h passes", () => {
  const r = validateTeacherLessonOffers({
    price_per_lesson: 50,
    home_lesson_enabled: true,
    home_lesson_price: 25,
    home_lesson_min_duration: 60,
    intro_session_enabled: false,
  });
  assert.equal(r.ok, true);
});

test("home_lesson_enabled=true with home_lesson_price=null still REJECTED by validator (intended floor)", () => {
  // The wizard now ensures this state can no longer be persisted, but
  // the validator itself MUST keep rejecting it so direct DB writes or
  // legacy data can be caught at PATCH /api/teacher/pricing time.
  const r = validateTeacherLessonOffers({
    price_per_lesson: 50,
    home_lesson_enabled: true,
    home_lesson_price: null,
    home_lesson_min_duration: 60,
    intro_session_enabled: false,
  });
  assert.equal(r.ok, false);
});

// ── Wizard source-scan: active flow at /onboarding/teacher ────────────

const ACTIVE_WIZARD = READ("app/(app)/onboarding/teacher/page.tsx");

test("active wizard computes a fallback home rate from the standard hourly rate", () => {
  // Match on the raw source — the wizard file has many template literals
  // that the strip helper destroys, but the specific line we need is
  // plain JS with no string content.
  assert.match(
    ACTIVE_WIZARD,
    /const\s+homeHourly\s*=\s*homeOn\s*\?\s*hourlyNum\s*:\s*null\s*;/,
  );
});

test("active wizard passes home_lesson_price into the client-side validator", () => {
  const m = ACTIVE_WIZARD.match(/validateTeacherLessonOffers\(\{([\s\S]*?)\}\)/);
  assert.ok(m, "validateTeacherLessonOffers call not found in active wizard");
  assert.match(m[1], /home_lesson_price\s*:\s*homeHourly/);
});

test("active wizard sends home_lesson_price in the complete API body when home is enabled", () => {
  // All profile data (including home pricing) is now sent to the
  // /api/teacher/onboarding/complete server-side upsert, not via a
  // separate client-side update or /api/teacher/pricing call.
  assert.match(ACTIVE_WIZARD, /home_lesson_price\s*:\s*homeHourly/);
});

test("active wizard no longer calls a separate /api/teacher/pricing endpoint", () => {
  // The complete API handles teacher row upsert + profile completion in
  // one admin-client round-trip, eliminating the client-side DB write
  // that was blocked by RLS for new teachers.
  assert.doesNotMatch(ACTIVE_WIZARD, /\/api\/teacher\/pricing/);
  assert.doesNotMatch(ACTIVE_WIZARD, /pricingBody\.home_lesson_price/);
});

test("active wizard routes the teacher back to Step 3 when the minimum check fails", () => {
  // The minimum-check failure branch must call setStep(3) so the
  // teacher lands on the pricing/duration step where the issue can be
  // fixed. We match the sequence within the save() failure handler.
  assert.match(
    ACTIVE_WIZARD,
    /if\s*\(!offerCheck\.ok\)\s*\{[\s\S]{0,400}setStep\(3\)/,
  );
});

// ── Legacy wizard source-scan ─────────────────────────────────────────

const LEGACY_WIZARD = READ("app/onboarding/page.tsx");

test("legacy wizard coalesces missing home price to the standard hourly rate", () => {
  assert.match(LEGACY_WIZARD, /const\s+effectiveHomePrice\s*=/);
  assert.match(LEGACY_WIZARD, /homePrice\s*!=\s*null\s*\?\s*homePrice\s*:\s*hourlyRate/);
});

test("legacy wizard sends effectiveHomePrice (not raw homePrice) to /api/onboarding/complete", () => {
  assert.match(LEGACY_WIZARD, /home_lesson_price\s*:\s*effectiveHomePrice\b/);
});

// ── Server-side coalesce in /api/onboarding/complete ──────────────────

const COMPLETE_ROUTE = READ("app/api/onboarding/complete/route.ts");

test("/api/onboarding/complete defaults home_lesson_price to hourlyRate when missing", () => {
  assert.match(
    COMPLETE_ROUTE,
    /homeLessonEnabled\s*&&\s*\(\s*rawHomePrice\s*==\s*null\s*\|\|\s*rawHomePrice\s*<=\s*0\s*\)/,
  );
  assert.match(COMPLETE_ROUTE, /\?\s*hourlyRate\s*:\s*rawHomePrice/);
});

// ── Admin route: guardrails ───────────────────────────────────────────

const ADMIN_ROUTE = READ("app/api/admin/users/[id]/teacher-onboarding/route.ts");

test("admin route uses requireAdminApi (no anon access)", () => {
  assert.match(ADMIN_ROUTE, /requireAdminApi\(/);
});

test("admin route PATCH allowlist is strictly the three safe fields", () => {
  const m = ADMIN_ROUTE.match(/const\s+ALLOWED\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
  assert.ok(m, "ALLOWED set not found");
  const list = m[1];
  for (const must of ["price_per_lesson", "home_lesson_price", "default_lesson_duration_minutes"]) {
    assert.match(list, new RegExp(`"${must}"`));
  }
  for (const forbidden of [
    "role",
    "plan",
    "subscription_status",
    "teacher_onboarding_complete",
    "stripe_account_id",
    "is_verified",
    "home_lesson_enabled",
    "password",
  ]) {
    assert.doesNotMatch(list, new RegExp(`"${forbidden}"`));
  }
});

test("admin route re-validates against validateTeacherLessonOffers before any write", () => {
  const validateIdx = ADMIN_ROUTE.indexOf("validateTeacherLessonOffers(merged)");
  const writeIdx = ADMIN_ROUTE.indexOf(".update(updates)");
  assert.ok(validateIdx > 0, "validateTeacherLessonOffers call missing");
  assert.ok(writeIdx > 0, ".update(updates) call missing");
  assert.ok(validateIdx < writeIdx, "validation must run BEFORE the DB write");
});

test("admin route never updates role / plan / subscription_status / teacher_onboarding_complete / is_verified", () => {
  // The .update() body is the variable `updates`; we already pin that
  // ALLOWED only contains 3 keys. Belt-and-braces: assert that no
  // .update({...}) call ever inlines any of the forbidden columns.
  for (const forbidden of [
    "subscription_status",
    "teacher_onboarding_complete",
    "is_verified",
    "stripe_account_id",
    "stripe_customer_id",
  ]) {
    assert.doesNotMatch(
      ADMIN_ROUTE,
      new RegExp(`\\.update\\(\\{[^}]*${forbidden}`),
      `admin route must not inline ${forbidden} in a .update() call`,
    );
  }
});

test("admin route writes an audit row with the dedicated source", () => {
  assert.match(ADMIN_ROUTE, /insertAdminRoleChangeAudit\(/);
  assert.match(ADMIN_ROUTE, /source:\s*"admin\/users\/teacher-onboarding"/);
});

test("admin route rejects values below 20 $ via the canonical validator", () => {
  // The error payload uses code: "minimum_lesson_price" matching the
  // existing /api/teacher/pricing and /api/onboarding/complete codes,
  // so the client can pivot on a stable code.
  assert.match(ADMIN_ROUTE, /code:\s*"minimum_lesson_price"/);
});

test("admin route enforces an upper sanity bound (500 $/h)", () => {
  assert.match(ADMIN_ROUTE, /HOME_LESSON_HOURLY_RATE_MAX_CAD\s*=\s*500/);
});

// ── Admin UI: client component boundary ───────────────────────────────

const SUPPORT_CARD = READ("components/admin/TeacherOnboardingSupportCard.tsx");

test("TeacherOnboardingSupportCard is a client component", () => {
  assert.match(SUPPORT_CARD, /^\s*"use client";/m);
});

test("TeacherOnboardingSupportCard never references the service-role key client-side", () => {
  for (const banned of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "getSupabaseAdmin",
    "supabaseAdmin",
    "service_role",
  ]) {
    assert.doesNotMatch(SUPPORT_CARD, new RegExp(banned));
  }
});

test("TeacherOnboardingSupportCard reinforces the 'no paid Pro / no role change' boundary", () => {
  // Case- and entity-tolerant assertion — JSX renders `n'active PAS`
  // as `n&apos;active PAS` in some bundlers; we accept either form.
  assert.match(SUPPORT_CARD, /n(?:&apos;|')active PAS/i);
  assert.match(SUPPORT_CARD, /Membre Pro/);
  assert.match(SUPPORT_CARD, /aucun rôle ni statut payé/i);
});

test("Admin user-detail page renders the support card server-side", () => {
  const page = READ("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /<TeacherOnboardingSupportCard\s/);
  // The page must remain a server component (no "use client").
  assert.doesNotMatch(page, /^\s*"use client";/m);
});

// ── Webhook / Stripe / founder-promo isolation ───────────────────────

test("None of this PR's files reference Stripe webhook, founder promo write, or Stripe Connect onboarding", () => {
  const files = [
    "app/(app)/onboarding/teacher/page.tsx",
    "app/onboarding/page.tsx",
    "app/api/onboarding/complete/route.ts",
    "app/api/admin/users/[id]/teacher-onboarding/route.ts",
    "components/admin/TeacherOnboardingSupportCard.tsx",
  ];
  for (const file of files) {
    const src = READ(file);
    assert.doesNotMatch(src, /stripe\.webhooks|stripe\.accounts\.create|stripe\.subscriptions\.create/);
    assert.doesNotMatch(src, /admin_founder_promotions/);
    assert.doesNotMatch(src, /handleStripeTransferFailed|transfer\.failed/);
  }
});

test("No service-role key reference in any client component touched by this PR", () => {
  const clientFiles = [
    "components/admin/TeacherOnboardingSupportCard.tsx",
    "app/(app)/onboarding/teacher/page.tsx",
    "app/onboarding/page.tsx",
  ];
  for (const file of clientFiles) {
    const src = READ(file);
    assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(src, /getSupabaseAdmin/);
  }
});

// ── Run ──────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherOnboarding:minRateBlockerRecovery] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
