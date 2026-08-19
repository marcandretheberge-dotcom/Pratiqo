/**
 * Admin manual teacher identity verification.
 *
 * Source-scan + helper contract. Does not hit Stripe, checkout, or teacher_offers.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROUTE = read("app/api/admin/teachers/[teacherId]/identity-verification/route.ts");
const MIGRATION = read("supabase/migrations/097_admin_manual_teacher_identity_verification.sql");
const CARD = read("components/admin/TeacherIdentityVerificationCard.tsx");
const PAGE = read("app/(app)/admin/users/[id]/page.tsx");
const PROFILE = read("components/TeacherProfile.tsx");
const SEARCH = read("app/(app)/student/search/page.tsx");
const BOOKING = read("components/BookingModal.tsx");
const QUERIES = read("lib/supabase/queries.ts");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const SEARCH_CARD = SEARCH.slice(SEARCH.indexOf("function TeacherCard({"));

test("non-admin cannot manually verify teacher identity", () => {
  assert.match(ROUTE, /requireAdminApi\(req\)/);
  const requireIdx = ROUTE.indexOf("await requireAdminApi(req)");
  const updateIdx = ROUTE.indexOf('.from("teachers")');
  assert.ok(requireIdx >= 0 && updateIdx > requireIdx);
});

test("admin can manually verify and clear identity verification", () => {
  assert.match(ROUTE, /verify_manually/);
  assert.match(ROUTE, /clear_manual_verification/);
  assert.match(ROUTE, /identity_verified_manually: verifying/);
  assert.match(ROUTE, /identity_verified_manually_by: verifying \? actor\.id : null/);
});

test("API never modifies stripe_identity_status", () => {
  const updateBlock = ROUTE.match(/\.update\(\{[\s\S]*?\}\)/)?.[0] ?? "";
  assert.doesNotMatch(updateBlock, /stripe_identity_status/);
  assert.doesNotMatch(updateBlock, /stripe_identity_session_id/);
  assert.doesNotMatch(updateBlock, /identity_verified:/);
  assert.doesNotMatch(ROUTE, /from\s+["']stripe["']/);
  assert.doesNotMatch(ROUTE, /from\s+["']@stripe\//);
});

test("client-supplied admin id is ignored", () => {
  assert.match(ROUTE, /void body\.actorId/);
  assert.match(ROUTE, /void body\.adminId/);
  assert.match(ROUTE, /actor\.id/);
  assert.doesNotMatch(ROUTE, /body\.actorId\s*\?\?/);
});

test("manual verification note is sanitized", () => {
  assert.match(ROUTE, /sanitizeManualIdentityVerificationNote\(body\.note\)/);
});

test("manual verification note is not exposed publicly", () => {
  const listSelect = QUERIES.match(/TEACHERS_LIST_SELECT\s*=\s*"([^"]+)"/)?.[1] ?? "";
  assert.doesNotMatch(listSelect, /identity_manual_verification_note/);
  assert.doesNotMatch(listSelect, /identity_verified_manually_by/);
  assert.doesNotMatch(listSelect, /identity_verified_manually_at/);
  assert.match(listSelect, /identity_verified_manually/);
  assert.doesNotMatch(MIGRATION, /t\.identity_manual_verification_note/);
  assert.doesNotMatch(PROFILE, /identityManualVerificationNote|identity_manual_verification_note/);
  assert.doesNotMatch(SEARCH_CARD, /identity_manual_verification_note/);
  assert.match(MIGRATION, /identity_verified_manually\s+boolean/);
  assert.doesNotMatch(
    MIGRATION.match(/CREATE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i)?.[0] ?? "",
    /identity_verified_manually_by/,
  );
});

test("search card checkmark uses the canonical helper including manual verification", () => {
  assert.match(SEARCH_CARD, /isPublicTeacherIdentityVerified\(/);
  assert.match(SEARCH_CARD, /identityVerifiedManually:\s*teacher\.identityVerifiedManually/);
});

test("booking caution uses effective identity including manual verification", () => {
  assert.match(BOOKING, /identityVerifiedManually:\s*teacher\.identityVerifiedManually/);
  assert.match(BOOKING, /!teacherIdentityVerified && !identityCautionAcknowledged/);
  assert.match(BOOKING, /payableAmountCents/);
  assert.doesNotMatch(BOOKING, /from ["']@\/lib\/offers/);
});

test("public TeacherProfile does not expose admin note or admin verifier", () => {
  assert.doesNotMatch(PROFILE, /identity_verified_manually_by/);
  assert.doesNotMatch(PROFILE, /identity_manual_verification_note/);
  assert.match(PROFILE, /identityVerifiedManually:\s*teacher\.identityVerifiedManually/);
  assert.match(PROFILE, /teacherBadgeIdentityVerified/);
  assert.match(PROFILE, /teacherTrustIdentityNotVerifiedTitle/);
});

test("admin UI shows Stripe status, manual status, and effective public status", () => {
  assert.match(PAGE, /<TeacherIdentityVerificationCard/);
  assert.match(CARD, /data-testid="admin-identity-stripe-status"/);
  assert.match(CARD, /data-testid="admin-identity-manual-status"/);
  assert.match(CARD, /data-testid="admin-identity-effective-status"/);
  assert.match(CARD, /Marquer l’identité comme vérifiée manuellement/);
  assert.match(CARD, /window\.confirm/);
  assert.match(CARD, /Note interne/);
});

test("migration pins manual fields and does not fake Stripe Identity", () => {
  assert.match(MIGRATION, /identity_verified_manually boolean NOT NULL DEFAULT false/i);
  assert.match(MIGRATION, /NEW\.identity_verified_manually := false/);
  assert.match(MIGRATION, /NEW\.identity_verified_manually := OLD\.identity_verified_manually/);
  assert.doesNotMatch(MIGRATION, /NEW\.stripe_identity_status := 'verified'/);
});

test("audit log records verify and clear without document payloads", () => {
  assert.match(ROUTE, /admin_manual_identity_verify/);
  assert.match(ROUTE, /admin_manual_identity_clear/);
  assert.match(ROUTE, /previous_manual_verified/);
  assert.match(ROUTE, /new_manual_verified/);
  assert.doesNotMatch(ROUTE, /document|passport|driver_license|id_front/i);
});

test("no Stripe/payment/checkout math files changed by this surface", () => {
  assert.doesNotMatch(ROUTE, /payableAmountCents|computeBookingCharge|commission/);
  assert.doesNotMatch(CARD, /from ["']@\/lib\/payments/);
  assert.doesNotMatch(CARD, /from ["']@\/lib\/offers/);
});

test("this contract is wired into npm run test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/admin\/manualTeacherIdentityVerification\.test\.ts/,
  );
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[admin:manualTeacherIdentityVerification] ${passed} tests passed`);
}
