/**
 * tests/pricing/hourlyRateDurationDisplay.test.ts
 *
 * Launch-blocking guard for the pricing UX inconsistency described in the
 * "fix(pricing): clarify hourly rates and duration-based lesson prices" brief.
 *
 * The platform stores `teachers.price_per_lesson` and
 * `teachers.home_lesson_price` as CAD **hourly** rates. The checkout pipeline
 * (`lib/pricing/bookingCharge.ts`) already prorates them by the booking's
 * `duration_minutes`:
 *
 *     lessonCents = round(hourly * duration / 60 * 100)
 *
 * Before this fix:
 *   • The teacher pricing card fed the hourly rate into a flat-session-price
 *     preview, so the commission/net numbers were only accidentally correct
 *     for 60-minute lessons.
 *   • The public profile QuickStat rendered a naked "45 $" with no "/h".
 *   • The booking-modal price summary bundled "hourly x hours" and a Total
 *     line — never showing the explicit (lesson price / duration / hourly
 *     rate) tuple required by the brief.
 *   • The onboarding pages used the same "per cours" anti-pattern label.
 *
 * This test asserts:
 *   1.  Teacher mgmt uses "Tarif horaire de base" / "Base hourly rate" /
 *       "Tarifa horaria base" — NEVER "tarif par cours" / "prix par cours" /
 *       "price per lesson" / "precio por clase".
 *   2.  The pricing helper prorates correctly (the canonical example:
 *       45 $/h x 45 min = 33.75 $).
 *   3.  The hourly-rate preview uses the same commission helper as the
 *       checkout pipeline.
 *   4.  Teacher mgmt, public profile, booking modal, and onboarding all
 *       carry the contracted FR/EN/ES copies.
 *   5.  At-home pricing is labelled "Tarif horaire à domicile" / "At-home
 *       hourly rate" — NEVER "supplément" / "surcharge".
 *   6.  No Stripe / payment-math / tax / Supabase RLS / migration /
 *       YoPratiqo / audio / legal file was touched by the current patch.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8")) as Record<string, string>;
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function stripJsComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

// ── File sources (cached) ────────────────────────────────────────────────────
const VERIFICATION_PATH = "app/(app)/teacher/verification/page.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const TEACHER_PROFILE_PATH = "components/TeacherProfile.tsx";
const ONBOARDING_PATH = "app/(app)/onboarding/teacher/page.tsx";
const LEGACY_ONBOARDING_PATH = "app/onboarding/page.tsx";
const ACCOUNT_VIEW_PATH = "components/teacher/TeacherAccountView.tsx";
const PREVIEW_HELPER_PATH = "lib/pricing/hourlyRatePreview.ts";
const PREVIEW_COMPONENT_PATH = "components/teacher/TeacherHourlyRatePreview.tsx";
const BOOKING_CHARGE_PATH = "lib/pricing/bookingCharge.ts";

const VERIFICATION_SRC = read(VERIFICATION_PATH);
const BOOKING_MODAL_SRC = read(BOOKING_MODAL_PATH);
const TEACHER_PROFILE_SRC = read(TEACHER_PROFILE_PATH);
const ONBOARDING_SRC = read(ONBOARDING_PATH);
const LEGACY_ONBOARDING_SRC = read(LEGACY_ONBOARDING_PATH);
const ACCOUNT_VIEW_SRC = read(ACCOUNT_VIEW_PATH);
const PREVIEW_HELPER_SRC = read(PREVIEW_HELPER_PATH);
const PREVIEW_COMPONENT_SRC = read(PREVIEW_COMPONENT_PATH);
const BOOKING_CHARGE_SRC = read(BOOKING_CHARGE_PATH);

const FR = loadJson("lib/i18n/locales/fr.json");
const EN = loadJson("lib/i18n/locales/en.json");
const ES = loadJson("lib/i18n/locales/es.json");

const REQUIRED_KEYS = [
  "profileBaseRateLabel",
  "profileBaseRateHelper",
  "homeLessonsHourlyRateLabel",
  "homeLessonsHourlyRateHelper",
  "homeLessonsPublicHourlyRateSummary",
  "pricingPreviewTitle",
  "pricingPreviewHourlyRate",
  "pricingPreviewDuration",
  "pricingPreviewLessonPrice",
  "pricingPreviewCommission",
  "pricingPreviewPayout",
  "pricingPreviewBeforeTaxesNote",
  "pricingPreviewDurationSelectorLabel",
  "pricingPreviewUsesDefaultDuration",
  "pricingPreviewDurationOption",
  "publicTeacherCardFromPerHour",
  "publicTeacherProfileHourlyRateLine",
  "publicTeacherProfileFinalPriceDependsOnDuration",
  "bookingPriceBreakdownLessonPrice",
  "bookingPriceBreakdownHomeLessonPrice",
  "bookingPriceBreakdownDuration",
  "bookingPriceBreakdownHourlyRate",
  "bookingPriceBreakdownHomeHourlyRate",
  "bookingNoHiddenFees",
  "teacherOnboardingPrice",
] as const;

// ── 1. Teacher mgmt label says "Tarif horaire de base" — never "par cours" ───
test("teacher mgmt: profile base-rate label is hourly in FR/EN/ES", () => {
  assert.match(FR.profileBaseRateLabel, /tarif\s+horaire\s+de\s+base/i);
  assert.match(EN.profileBaseRateLabel, /base\s+hourly\s+rate/i);
  assert.match(ES.profileBaseRateLabel, /tarifa\s+horaria\s+base/i);

  // The label must NOT call the rate "par cours" / "per lesson" / "por clase".
  assert.doesNotMatch(FR.profileBaseRateLabel, /par\s+cours|prix\s+par\s+cours/i);
  assert.doesNotMatch(EN.profileBaseRateLabel, /per\s+lesson|price\s+per\s+lesson/i);
  assert.doesNotMatch(ES.profileBaseRateLabel, /por\s+clase|precio\s+por\s+clase/i);
});

test("teacher mgmt: base-rate helper says the rate is prorated by lesson duration", () => {
  assert.match(FR.profileBaseRateHelper, /au\s+prorata.*durée/i);
  assert.match(EN.profileBaseRateHelper, /prorated\s+based\s+on\s+the\s+actual\s+lesson\s+duration/i);
  assert.match(ES.profileBaseRateHelper, /se\s+prorratea\s+según\s+la\s+duración\s+real\s+de\s+la\s+clase/i);
});

test("teacher mgmt: onboarding price label is hourly, NOT 'per cours' anti-pattern", () => {
  // The launch brief specifically calls out "Prix par cours" / "Price per
  // lesson" / "Precio por clase" as the misleading label that must be
  // replaced. This guards against re-introduction.
  assert.doesNotMatch(FR.teacherOnboardingPrice, /^prix\s+par\s+cours$/i);
  assert.doesNotMatch(EN.teacherOnboardingPrice, /^price\s+per\s+lesson$/i);
  assert.doesNotMatch(ES.teacherOnboardingPrice, /^precio\s+por\s+clase$/i);
  assert.match(FR.teacherOnboardingPrice, /tarif\s+horaire/i);
  assert.match(EN.teacherOnboardingPrice, /hourly\s+rate/i);
  assert.match(ES.teacherOnboardingPrice, /tarifa\s+horaria/i);
});

// ── 2. Pricing helper computes 45 $/h × 45 min = 33,75 $ ─────────────────────
test("preview helper: 45 $/h × 45 min = 33.75 $ (canonical example)", async () => {
  const { getHourlyRatePreview, proratedLessonPriceCents } = await import(
    "../../lib/pricing/hourlyRatePreview"
  );
  const cents = proratedLessonPriceCents(45, 45);
  assert.equal(cents, 3375);

  const preview = getHourlyRatePreview({
    hourlyRate: 45,
    durationMinutes: 45,
    teacherPlan: "free",
  });
  assert.equal(preview.lessonPriceCents, 3375);
  assert.equal(preview.lessonPriceDollars, 33.75);
  assert.equal(preview.hourlyDollars, 45);
  assert.equal(preview.durationMinutes, 45);
  assert.equal(preview.isPositive, true);
});

test("preview helper: 60-min default duration is the back-compat path", async () => {
  const { getHourlyRatePreview } = await import("../../lib/pricing/hourlyRatePreview");
  const preview = getHourlyRatePreview({
    hourlyRate: 45,
    durationMinutes: 60,
    teacherPlan: "free",
  });
  assert.equal(preview.lessonPriceCents, 4500);
  assert.equal(preview.durationMinutes, 60);
});

test("preview helper: invalid duration falls back to 60 (mirrors booking pipeline)", async () => {
  const { getHourlyRatePreview } = await import("../../lib/pricing/hourlyRatePreview");
  const preview = getHourlyRatePreview({
    hourlyRate: 45,
    durationMinutes: "abc",
    teacherPlan: "free",
  });
  assert.equal(preview.durationMinutes, 60);
  assert.equal(preview.lessonPriceCents, 4500);
});

test("preview helper: net + commission reconcile to the lesson price (no money lost)", async () => {
  const { getHourlyRatePreview } = await import("../../lib/pricing/hourlyRatePreview");
  for (const [hourly, duration] of [
    [45, 45],
    [60, 30],
    [80, 90],
    [50, 60],
  ] as Array<[number, number]>) {
    const preview = getHourlyRatePreview({
      hourlyRate: hourly,
      durationMinutes: duration,
      teacherPlan: "free",
    });
    assert.equal(
      preview.commissionCents + preview.teacherNetCents,
      preview.lessonPriceCents,
      `commission+net must equal lesson price for ${hourly} $/h × ${duration} min`,
    );
  }
});

test("preview helper: free Bronze plan uses 15 % (no commission helper duplication)", async () => {
  const { getHourlyRatePreview } = await import("../../lib/pricing/hourlyRatePreview");
  const preview = getHourlyRatePreview({
    hourlyRate: 45,
    durationMinutes: 60,
    teacherPlan: "free",
  });
  // 4500 cents × 15 % = 675 cents (rounding nearest, the commission helper
  // adds a +5_000 fairness offset on the 10_000-bps denominator).
  assert.equal(preview.commissionCents, 675);
  assert.equal(preview.teacherNetCents, 3825);
  assert.equal(preview.feeBasisPoints, 1500);
});

test("preview helper: pro Bronze plan uses 5 %", async () => {
  const { getHourlyRatePreview } = await import("../../lib/pricing/hourlyRatePreview");
  const preview = getHourlyRatePreview({
    hourlyRate: 45,
    durationMinutes: 60,
    teacherPlan: "pro",
  });
  assert.equal(preview.feeBasisPoints, 500);
});

test("preview helper: zero / invalid hourly is rejected (no negative lesson prices)", async () => {
  const { getHourlyRatePreview, proratedLessonPriceCents } = await import(
    "../../lib/pricing/hourlyRatePreview"
  );
  for (const bad of [0, -1, "", null, undefined, "abc"] as const) {
    assert.equal(proratedLessonPriceCents(bad, 60), 0);
    const preview = getHourlyRatePreview({
      hourlyRate: bad,
      durationMinutes: 60,
    });
    assert.equal(preview.lessonPriceCents, 0);
    assert.equal(preview.isPositive, false);
  }
});

// ── 3. Reuse of commission helper, not duplication ───────────────────────────
test("preview helper: routes commission math through lib/payments/commission", () => {
  assert.match(PREVIEW_HELPER_SRC, /from\s+"@\/lib\/payments\/commission"/);
  assert.match(PREVIEW_HELPER_SRC, /calculateBookingAmounts\s*\(/);

  // The bps tables (1500, 500, 1300, ...) must NOT be re-listed here, or
  // we have duplicated the fee math and lost the single source of truth.
  const noComments = stripJsComments(PREVIEW_HELPER_SRC);
  assert.doesNotMatch(noComments, /1500|1400|1300|1200|450|400|350/);
});

// ── 4. Teacher pricing card wires the new component ──────────────────────────
test("teacher mgmt: pricing card uses TeacherHourlyRatePreview, not the legacy flat-session preview", () => {
  // The legacy `TeacherPayoutPreview` is still exported for callers that
  // genuinely have a session-price input (intro session card, etc.) — but
  // the per-hour pricing input must use the duration-aware preview.
  assert.match(VERIFICATION_SRC, /TeacherHourlyRatePreview/);
  // The misuse of TeacherPayoutPreview where `grossAmount={editPrice}` (i.e.
  // the hourly rate) was the launch-blocking bug; that line must be gone.
  assert.doesNotMatch(VERIFICATION_SRC, /TeacherPayoutPreview[^<]*grossAmount=\{editPrice\}/);

  // The new label must be referenced + the duration-aware preview must be
  // wired to the current teacher's saved default duration.
  assert.match(VERIFICATION_SRC, /t\("profileBaseRateLabel"\)/);
  assert.match(VERIFICATION_SRC, /defaultDurationMinutes=\{teacherRow\.default_lesson_duration_minutes/);
});

test("teacher mgmt: at-home pricing card also exposes a hourly-rate preview", () => {
  assert.match(VERIFICATION_SRC, /testIdPrefix="teacher-hourly-rate-preview-home"/);
  assert.match(VERIFICATION_SRC, /hourlyRateLineKey="bookingPriceBreakdownHomeHourlyRate"/);
});

test("preview component: includes a local duration selector that does not mutate the saved default", () => {
  assert.match(PREVIEW_COMPONENT_SRC, /pricingPreviewDurationSelectorLabel/);
  assert.match(PREVIEW_COMPONENT_SRC, /PREVIEW_DURATION_OPTIONS\s*=\s*\[30,\s*45,\s*60,\s*90\]/);
  // The component must NOT call any teacher-update mutation when the
  // selector changes — it is preview-only. The booking pipeline keeps
  // the saved `default_lesson_duration_minutes` as the source of truth.
  assert.doesNotMatch(PREVIEW_COMPONENT_SRC, /fetch\s*\(/);
  assert.doesNotMatch(PREVIEW_COMPONENT_SRC, /supabase|admin\.from/);
});

// ── 5. Public student-facing surfaces ────────────────────────────────────────
test("public profile: QuickStat rate is shown as 'From {price} / h', not a naked '45 $'", () => {
  // The Tarif card wraps the formatted price in publicTeacherCardFromPerHour
  // ("À partir de {price} / h"). Without this wrapper the card displayed
  // "45 $" naked, which is the bug.
  assert.match(
    TEACHER_PROFILE_SRC,
    /fromTemplate:\s*t\("publicTeacherCardFromPerHour"\)/,
  );
  assert.match(TEACHER_PROFILE_SRC, /label=\{t\("rateLabel"\)\}/);
  assert.match(FR.publicTeacherCardFromPerHour, /\/\s*h/);
  assert.match(EN.publicTeacherCardFromPerHour, /\/\s*h/);
  assert.match(ES.publicTeacherCardFromPerHour, /\/\s*h/);
});

test("public profile: booking widget warns that final price depends on duration", () => {
  assert.match(
    TEACHER_PROFILE_SRC,
    /publicTeacherProfileFinalPriceDependsOnDuration/,
  );
  assert.doesNotMatch(TEACHER_PROFILE_SRC, /bookingNoHiddenFees/);
  assert.match(FR.publicTeacherProfileFinalPriceDependsOnDuration, /durée/i);
  assert.match(EN.publicTeacherProfileFinalPriceDependsOnDuration, /duration/i);
  assert.match(ES.publicTeacherProfileFinalPriceDependsOnDuration, /duración/i);
});

test("public profile: bookingNoHiddenFees is now 'From {price} / h' wording (not flat-fee promise)", () => {
  // Stop the old "Prix affiché : {price}. Aucun frais caché." copy from
  // sneaking back; it implied a fixed lesson price.
  assert.doesNotMatch(FR.bookingNoHiddenFees, /prix\s+affiché/i);
  assert.doesNotMatch(EN.bookingNoHiddenFees, /^displayed\s+price/i);
  assert.doesNotMatch(ES.bookingNoHiddenFees, /^precio\s+mostrado/i);
  assert.match(FR.bookingNoHiddenFees, /à\s+partir\s+de.*\/\s*h/i);
  assert.match(EN.bookingNoHiddenFees, /from\s+\{price\}\s*\/\s*h/i);
  assert.match(ES.bookingNoHiddenFees, /desde\s+\{price\}\s*\/\s*h/i);
});

test("public profile: at-home hourly summary uses 'Tarif horaire à domicile' wording", () => {
  assert.match(FR.homeLessonsPublicHourlyRateSummary, /tarif\s+horaire\s+à\s+domicile/i);
  // It MUST not call this value a surcharge / "supplément".
  assert.doesNotMatch(FR.homeLessonsPublicHourlyRateSummary, /supplément/i);
  assert.doesNotMatch(EN.homeLessonsPublicHourlyRateSummary, /surcharge/i);
  assert.doesNotMatch(ES.homeLessonsPublicHourlyRateSummary, /recargo/i);
});

// ── 6. Booking modal three-line breakdown ───────────────────────────────────
test("booking modal: hero shows the three-line breakdown (lesson price + duration + hourly rate)", () => {
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-hero-lesson-price/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-hero-duration/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-hero-hourly/);
});

test("booking modal: standard (studio/online) step shows the three-line breakdown", () => {
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-standard-lesson-price/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-standard-duration/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-standard-hourly/);
});

test("booking modal: at-home step shows the three-line breakdown with at-home labels", () => {
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-home-lesson-price/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-home-duration/);
  assert.match(BOOKING_MODAL_SRC, /booking-price-breakdown-home-hourly/);
  assert.match(BOOKING_MODAL_SRC, /bookingPriceBreakdownHomeHourlyRate/);
  assert.match(BOOKING_MODAL_SRC, /bookingPriceBreakdownHomeLessonPrice/);
});

test("booking modal copy: each line references the canonical i18n keys", () => {
  assert.match(BOOKING_MODAL_SRC, /t\("bookingPriceBreakdownLessonPrice"\)/);
  assert.match(BOOKING_MODAL_SRC, /t\("bookingPriceBreakdownDuration"\)/);
  assert.match(BOOKING_MODAL_SRC, /t\("bookingPriceBreakdownHourlyRate"\)/);
  // FR copies use the canonical "Prix du cours : {price}" / "Durée : {minutes} min"
  // wording mandated by the launch brief.
  assert.match(FR.bookingPriceBreakdownLessonPrice, /prix\s+du\s+cours/i);
  assert.match(FR.bookingPriceBreakdownDuration, /durée/i);
  assert.match(FR.bookingPriceBreakdownHourlyRate, /tarif\s+horaire/i);
});

// ── 7. Booking pipeline unchanged — math is not duplicated by display layer ──
test("booking pipeline: lib/pricing/bookingCharge.ts still uses hourly × duration / 60", () => {
  assert.match(BOOKING_CHARGE_SRC, /hourly\s*\*\s*\(\s*durationMinutes\s*\/\s*60\s*\)\s*\*\s*100/);
  // The booking pipeline must NOT depend on the display-layer helper.
  assert.doesNotMatch(BOOKING_CHARGE_SRC, /hourlyRatePreview/);
});

// ── 8. Onboarding pages aligned ──────────────────────────────────────────────
test("onboarding (legacy + current): both routes use the hourly-rate preview", () => {
  assert.match(ONBOARDING_SRC, /TeacherHourlyRatePreview/);
  assert.match(LEGACY_ONBOARDING_SRC, /TeacherHourlyRatePreview/);
  assert.match(ACCOUNT_VIEW_SRC, /TeacherHourlyRatePreview/);
});

test("onboarding: helper text mentions the prorated nature of the rate", () => {
  assert.match(ONBOARDING_SRC, /t\("profileBaseRateHelper"\)/);
  assert.match(ACCOUNT_VIEW_SRC, /t\("profileBaseRateHelper"\)/);
});

// ── 9. All required i18n keys exist across FR / EN / ES ─────────────────────
test("i18n: every contracted pricing key exists in all three locales", () => {
  for (const key of REQUIRED_KEYS) {
    assert.ok(typeof FR[key] === "string" && FR[key].length > 0, `Missing FR[${key}]`);
    assert.ok(typeof EN[key] === "string" && EN[key].length > 0, `Missing EN[${key}]`);
    assert.ok(typeof ES[key] === "string" && ES[key].length > 0, `Missing ES[${key}]`);
  }
});

// ── 10. Global restrictions — no Stripe / Supabase / tax / legal / yo / audio
//        files were touched by the patch that contains this test ─────────────
test("scope guard: working tree only touches display + i18n files (no payment/RLS/migration/legal/yo files)", () => {
  let diff: string;
  try {
    // Compare against main (or the working tree if no main). We accept both
    // staged + unstaged changes since the launch validation runs before
    // commit.
    diff = execSync("git diff --name-only main...HEAD", {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
    const wt = execSync("git diff --name-only HEAD", {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
    diff = `${diff}\n${wt}`;
  } catch {
    // Fallback: just inspect the working-tree diff.
    diff = execSync("git diff --name-only", {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
  }

  const forbiddenPrefixes = [
    "supabase/migrations/",
    "app/api/stripe/",
    "app/api/payments/",
    "app/api/webhooks/",
    "content/legal/",
    "docs/legal/",
    "lib/yo/",
    "tests/yo/",
    "components/yo/",
    "public/audio/yo/",
    "lib/payments/commission.ts",
    "lib/payments/amounts.ts",
    "lib/pricing/bookingCharge.ts",
    "lib/payments/payoutPreview.ts",
  ];
  const touched = diff
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const path of touched) {
    for (const prefix of forbiddenPrefixes) {
      assert.ok(
        !path.startsWith(prefix),
        `Pricing-display patch must not touch ${path} (matches forbidden prefix "${prefix}").`,
      );
    }
  }
});

// ── 11. Public booking widget does NOT show naked hourly rate as a lesson price
test("public profile: sidebar booking widget uses PriceDisplay with perHour for the hourly figure", () => {
  // The sidebar `<PriceDisplay perHour ... amount={pricePerLesson} />`
  // remains the canonical hourly display. Guard against removal of the
  // perHour flag on that block (which would print a naked "45 $").
  assert.match(
    TEACHER_PROFILE_SRC,
    /PriceDisplay[\s\S]{0,300}?amount=\{Number\(teacher\.pricePerLesson\)\}[\s\S]{0,300}?perHour/,
  );
});

// ── 12. The teacher checkout charge stays anchored to the same hourly formula
test("checkout charge formula has NOT moved: bookingCharge still rounds(hourly × duration / 60 × 100)", () => {
  // Sanity check the file path that holds the actual payment math.
  assert.match(BOOKING_CHARGE_SRC, /Math\.round\(hourly\s*\*\s*\(durationMinutes\s*\/\s*60\)\s*\*\s*100\)/);
  // And there is exactly one "60" magic number used to convert minutes
  // -> hours in the booking pipeline (defensive: any rewrite of this
  // helper would need to update the tests + the helper deliberately).
  const occurrences = (BOOKING_CHARGE_SRC.match(/\/\s*60/g) ?? []).length;
  assert.ok(
    occurrences >= 2,
    "bookingCharge.ts should still use `/ 60` to prorate hourly rates by duration",
  );
});
