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
const MIGRATION097 = read("supabase/migrations/097_admin_manual_teacher_identity_verification.sql");
const MIGRATION098 = read("supabase/migrations/098_hide_manual_identity_source_from_public_projection.sql");
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

test("manual verification note and source fields are not exposed publicly", () => {
  const listSelect = QUERIES.match(/TEACHERS_LIST_SELECT\s*=\s*"([^"]+)"/)?.[1] ?? "";
  assert.doesNotMatch(listSelect, /identity_manual_verification_note/);
  assert.doesNotMatch(listSelect, /identity_verified_manually_by/);
  assert.doesNotMatch(listSelect, /identity_verified_manually_at/);
  assert.doesNotMatch(listSelect, /identity_verified_manually/);
  assert.doesNotMatch(MIGRATION097, /t\.identity_manual_verification_note/);
  assert.doesNotMatch(PROFILE, /identityManualVerificationNote|identity_manual_verification_note/);
  assert.doesNotMatch(SEARCH_CARD, /identity_manual_verification_note/);
  assert.doesNotMatch(
    MIGRATION098.match(/RETURNS TABLE \([\s\S]*?\)/)?.[0] ?? "",
    /identity_verified_manually/,
  );
});

test("search card checkmark uses collapsed public identityVerified only", () => {
  assert.match(SEARCH_CARD, /isPublicTeacherIdentityVerified\(/);
  assert.match(SEARCH_CARD, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(SEARCH_CARD, /identityVerifiedManually/);
});

test("booking caution uses collapsed public identityVerified only", () => {
  assert.match(BOOKING, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(BOOKING, /identityVerifiedManually/);
  assert.match(BOOKING, /!teacherIdentityVerified && !identityCautionAcknowledged/);
  assert.match(BOOKING, /payableAmountCents/);
});

test("public TeacherProfile does not expose admin note, verifier, or manual source", () => {
  assert.doesNotMatch(PROFILE, /identity_verified_manually_by/);
  assert.doesNotMatch(PROFILE, /identity_manual_verification_note/);
  assert.doesNotMatch(PROFILE, /identityVerifiedManually/);
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

test("migration 097 pins manual fields on teachers table and does not fake Stripe Identity", () => {
  assert.match(MIGRATION097, /identity_verified_manually boolean NOT NULL DEFAULT false/i);
  assert.match(MIGRATION097, /NEW\.identity_verified_manually := false/);
  assert.match(MIGRATION097, /NEW\.identity_verified_manually := OLD\.identity_verified_manually/);
  assert.doesNotMatch(MIGRATION097, /NEW\.stripe_identity_status := 'verified'/);
});

test("migration 098 collapses manual verification into public identity_verified", () => {
  const fnBlock = MIGRATION098.match(/CREATE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i)?.[0] ?? "";
  assert.match(
    fnBlock,
    /COALESCE\(t\.identity_verified,\s*false\)\s+OR COALESCE\(t\.identity_verified_manually,\s*false\)/,
  );
  assert.doesNotMatch(fnBlock.match(/RETURNS TABLE \([\s\S]*?\)/)?.[0] ?? "", /identity_verified_manually/);
});

test("migration 098 drops and restores teacher_offers public-read policy around teachers_public rebuild", () => {
  const dropViewIdx = MIGRATION098.indexOf("DROP VIEW IF EXISTS public.teachers_public");
  const firstPolicyDropIdx = MIGRATION098.indexOf('DROP POLICY IF EXISTS "teacher_offers_select_published_public"');
  const recreatePolicyIdx = MIGRATION098.lastIndexOf('CREATE POLICY "teacher_offers_select_published_public"');
  assert.ok(firstPolicyDropIdx >= 0 && dropViewIdx > firstPolicyDropIdx);
  assert.ok(recreatePolicyIdx > dropViewIdx);
  assert.match(MIGRATION098, /FROM public\.teachers_public tp/);
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
