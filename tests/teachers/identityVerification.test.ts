/**
 * Canonical identity helper + admin manual verification sanitizer.
 */

import assert from "node:assert/strict";
import {
  describeStripeIdentityStatus,
  getTeacherIdentityVerificationSource,
  isStripeTeacherIdentityVerified,
  isTeacherIdentityVerified,
  sanitizeManualIdentityVerificationNote,
} from "@/lib/teachers/identity";
import { isPublicTeacherIdentityVerified } from "@/lib/teachers/badges";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("canonical helper returns verified for Stripe verified", () => {
  assert.equal(isTeacherIdentityVerified({ stripeIdentityStatus: "verified" }), true);
  assert.equal(getTeacherIdentityVerificationSource({ stripeIdentityStatus: "verified" }), "stripe_identity");
  assert.equal(isStripeTeacherIdentityVerified({ identityVerified: true }), true);
});

test("canonical helper returns verified for manual admin verified", () => {
  assert.equal(
    isTeacherIdentityVerified({
      identityVerified: false,
      identityStatus: "none",
      stripeIdentityStatus: null,
      identityVerifiedManually: true,
    }),
    true,
  );
  assert.equal(
    getTeacherIdentityVerificationSource({ identityVerifiedManually: true }),
    "admin_manual",
  );
});

test("canonical helper prefers Stripe source when both are verified", () => {
  assert.equal(
    getTeacherIdentityVerificationSource({
      stripeIdentityStatus: "verified",
      identityVerifiedManually: true,
    }),
    "stripe_identity",
  );
});

test("canonical helper returns not verified when neither Stripe nor manual is verified", () => {
  assert.equal(
    isTeacherIdentityVerified({
      identityVerified: false,
      identityStatus: "pending",
      stripeIdentityStatus: "requires_input",
      identityVerifiedManually: false,
    }),
    false,
  );
  assert.equal(getTeacherIdentityVerificationSource({ identityVerifiedManually: false }), "none");
});

test("public badge helper delegates to the canonical helper including manual verification", () => {
  assert.equal(isPublicTeacherIdentityVerified({ identityVerifiedManually: true }), true);
  assert.equal(isPublicTeacherIdentityVerified({ stripeIdentityStatus: "verified" }), true);
  assert.equal(isPublicTeacherIdentityVerified({}), false);
});

test("Stripe status labels stay human-readable", () => {
  assert.equal(describeStripeIdentityStatus("verified"), "verified");
  assert.equal(describeStripeIdentityStatus("requires_input"), "requires_input");
  assert.equal(describeStripeIdentityStatus(null), "not_started");
});

test("manual verification note is sanitized", () => {
  assert.equal(sanitizeManualIdentityVerificationNote("  Known in person.  "), "Known in person.");
  assert.equal(sanitizeManualIdentityVerificationNote("<script>alert(1)</script>"), null);
  assert.equal(sanitizeManualIdentityVerificationNote("javascript:alert(1)"), null);
  assert.equal(sanitizeManualIdentityVerificationNote("<b>ok</b> teacher"), null);
  const long = "x".repeat(600);
  assert.equal(sanitizeManualIdentityVerificationNote(long)?.length, 500);
  assert.equal(sanitizeManualIdentityVerificationNote(123), null);
  assert.equal(sanitizeManualIdentityVerificationNote("   "), null);
});

async function main() {
  let passed = 0;
  const failed: Array<{ name: string; err: unknown }> = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`  ok  ${name}`);
    } catch (err) {
      failed.push({ name, err });
      console.log(`  FAIL ${name}`);
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
  if (failed.length > 0) {
    for (const { name, err } of failed) {
      console.error(`\n--- ${name} ---`);
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
