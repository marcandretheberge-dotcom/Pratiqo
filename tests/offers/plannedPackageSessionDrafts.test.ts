/**
 * Planned package session drafts — Phase 1 scheduling draft (no payment).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUsePlannedPackageSessionDrafts,
  hasDuplicateSessionStarts,
  isPlannedPackageSessionDraftsEnabled,
  isPlannedPackageSessionDraftsUiEnabled,
  parseDraftSessionStarts,
  sessionsOverlap,
} from "@/lib/offers/plannedPackageSessionDrafts";
import {
  assertPlannedPackagePublishAllowed,
  canPubliclyPurchasePlannedPackage,
  canShowPlannedPackageOnPublicProfile,
} from "@/lib/offers/plannedPackages";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";
import { parseStartsAtToBookingSlot } from "@/lib/offers/validatePlannedPackageDraftSessions";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetFlags() {
  delete process.env.ENABLE_PLANNED_PACKAGES;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES;
  delete process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS;
  delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
}

test("session draft flags default OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageSessionDraftsEnabled(), false);
  assert.equal(isPlannedPackageSessionDraftsUiEnabled(), false);
  assert.equal(canUsePlannedPackageSessionDrafts(), false);
});

test("session draft flow requires both planned packages and drafts flags", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  assert.equal(canUsePlannedPackageSessionDrafts(), false);
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  assert.equal(canUsePlannedPackageSessionDrafts(), true);
});

test("UI flag OFF hides session draft CTA helper path", () => {
  resetFlags();
  assert.equal(isPlannedPackageSessionDraftsUiEnabled(), false);
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES = "true";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  assert.equal(isPlannedPackageSessionDraftsUiEnabled(), true);
});

test("public profile may show planned packages for draft preview only when drafts ON", () => {
  resetFlags();
  assert.equal(canShowPlannedPackageOnPublicProfile(), false);
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  assert.equal(canShowPlannedPackageOnPublicProfile(), true);
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
});

test("publish allowed for draft preview when session drafts ON; purchase still blocked", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  assert.equal(assertPlannedPackagePublishAllowed("package").ok, true);
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
});

test("parseDraftSessionStarts validates payload", () => {
  assert.equal(parseDraftSessionStarts(null).ok, false);
  const ok = parseDraftSessionStarts({
    sessions: [{ startsAt: "2026-09-01T22:00:00.000Z" }, { startsAt: "2026-09-08T22:00:00.000Z" }],
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.startsAt.length, 2);
});

test("duplicate and overlap helpers", () => {
  assert.equal(hasDuplicateSessionStarts(["a", "a"]), true);
  assert.equal(hasDuplicateSessionStarts(["a", "b"]), false);
  assert.equal(
    sessionsOverlap(["2026-09-01T18:00:00.000Z", "2026-09-01T18:30:00.000Z"], 60),
    true,
  );
  assert.equal(
    sessionsOverlap(["2026-09-01T18:00:00.000Z", "2026-09-01T19:00:00.000Z"], 60),
    false,
  );
});

test("parseStartsAtToBookingSlot maps to local date + slot label", () => {
  const parsed = parseStartsAtToBookingSlot("2026-09-01T18:00:00", 60);
  assert.ok(parsed);
  assert.match(parsed!.slotDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(parsed!.timeSlot, /^\d{1,2}h\d{2}$/);
  assert.ok(parsed!.endsAtIso > parsed!.startsAtIso);
});

test("draft API routes exist and require auth + flags; no Stripe/bookings/entitlements", () => {
  const createRoute = read("app/api/planned-packages/session-drafts/route.ts");
  const getRoute = read("app/api/planned-packages/session-drafts/[draftId]/route.ts");
  const cancelRoute = read("app/api/planned-packages/session-drafts/[draftId]/cancel/route.ts");
  const service = read("lib/offers/createPlannedPackageSessionDraft.ts");
  const validate = read("lib/offers/validatePlannedPackageDraftSessions.ts");

  assert.match(createRoute, /unauthenticated/);
  assert.match(createRoute, /canUsePlannedPackageSessionDrafts/);
  assert.match(createRoute, /createPlannedPackageSessionDraft/);
  assert.match(getRoute, /loadOwnedPlannedPackageSessionDraft/);
  assert.match(cancelRoute, /cancelOwnedPlannedPackageSessionDraft/);

  assert.match(service, /invalid_session_count/);
  assert.match(service, /duplicate_session_time/);
  assert.match(service, /offer_not_available_for_package_draft/);
  assert.match(service, /price_cents_snapshot/);
  assert.match(service, /title_snapshot/);
  assert.match(service, /session_count/);
  assert.doesNotMatch(service, /from\("@stripe\/stripe-js"\)/);
  assert.doesNotMatch(service, /new Stripe\(/);
  assert.doesNotMatch(service, /stripe\.checkout/i);
  assert.doesNotMatch(service, /from\("bookings"\)\.insert/);
  assert.doesNotMatch(service, /package_entitlements/);
  assert.doesNotMatch(service, /package_redemptions/);

  assert.match(validate, /canBookTeacherOnDate/);
  assert.match(validate, /applyDateExceptionToBooking/);
  assert.match(validate, /rejectIfOutsideWeeklyIntervals/);
});

test("migration defines drafts + items with RLS and no anon writes", () => {
  const mig = read("supabase/migrations/114_planned_package_session_drafts.sql");
  assert.match(mig, /planned_package_session_drafts/);
  assert.match(mig, /planned_package_session_draft_items/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.match(mig, /student_id = auth\.uid\(\)/);
  assert.match(mig, /GRANT SELECT/);
  assert.match(mig, /service_role/);
  assert.match(mig, /teacher_id text/);
});

test("learner UI gated and shows no live purchase CTA", () => {
  const ui = read("components/packages/PlannedPackageSessionSelector.tsx");
  const card = read("components/teacher/PublicTeacherOfferCard.tsx");
  assert.match(ui, /plannedPackageNotReservedYet/);
  assert.match(ui, /plannedPackageAvailabilityRecheck/);
  assert.match(ui, /plannedPackagePaymentComingSoon/);
  assert.match(ui, /disabled/);
  assert.doesNotMatch(ui, /Acheter maintenant/);
  assert.doesNotMatch(ui, /checkout\.stripe/i);
  assert.match(card, /shouldShowPlannedPackageSessionDraftCta/);
  assert.match(card, /plannedPackageChooseSessions/);
});

test("admin readiness shows draft layer and keeps legal/checkout blocked", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageSessionDraftSchemaPresent, true);
  assert.equal(readiness.checks.plannedPackageSessionDraftNoPayment, true);
  assert.equal(readiness.checks.plannedPackageSessionDraftNoBookings, true);
  assert.equal(readiness.checks.plannedPackageSessionDraftNoEntitlements, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewMarkedRequired, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
  assert.equal(readiness.flags.plannedPackageSessionDrafts, false);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Schéma brouillon de séances présent/);
  assert.match(page, /Checkout forfait toujours bloqué/);
  assert.doesNotMatch(page, /type=\"checkbox\"/);
});

test("PR does not enable package flags or touch Stripe/commission/payout/refund/entitlement mutations", () => {
  resetFlags();
  assert.equal(process.env.ENABLE_PLANNED_PACKAGES, undefined);
  assert.equal(process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS, undefined);
  assert.equal(process.env.PACKAGE_LEGAL_REVIEW_COMPLETED, undefined);

  const create = read("lib/offers/createPlannedPackageSessionDraft.ts");
  assert.doesNotMatch(create, /commission/i);
  assert.doesNotMatch(create, /payout/i);
  assert.doesNotMatch(create, /refund calculator/i);
  assert.doesNotMatch(create, /PaymentIntent/);
  assert.doesNotMatch(create, /checkout\.sessions/i);
  assert.doesNotMatch(create, /new Stripe\(/);

  // Unsafe marketplace copy guard
  const fr = read("lib/i18n/locales/fr.json");
  assert.doesNotMatch(fr, /Forfait Pratiqo/);
  assert.match(fr, /Forfait proposé par le professeur/);
});
