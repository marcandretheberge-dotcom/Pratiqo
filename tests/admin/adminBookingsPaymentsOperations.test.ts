/**
 * Admin bookings + payments operations (read-only).
 *
 * Pins:
 *   - /admin/bookings and /admin/payments mount under requireAdminPage layout
 *   - list APIs gate behind requireAdminApi
 *   - responses never include Stripe secrets / client secrets / metadata dumps
 *   - Non disponible when optional fields missing
 *   - needs-attention labels from helpers
 *   - command center links Réservations/Paiements to the new routes
 *   - checkout / webhook / booking transition / commission math untouched
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import {
  ADMIN_OPS_FORBIDDEN_RESPONSE_KEYS,
  ADMIN_OPS_UNAVAILABLE,
  computeBookingAttention,
  computePaymentAttention,
  mapAttentionLabel,
  shortAdminId,
} from "@/lib/admin/bookingPaymentOperations";
import { ADMIN_COMMAND_CENTER_MODULES } from "@/lib/admin/overview";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("admin layout still requires requireAdminPage for bookings and payments pages", () => {
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);
  assert.ok(existsSync(join(ROOT, "app/(app)/admin/bookings/page.tsx")));
  assert.ok(existsSync(join(ROOT, "app/(app)/admin/payments/page.tsx")));
});

test("admin bookings API requires requireAdminApi and is GET-only read-only", () => {
  const route = read("app/api/admin/bookings/route.ts");
  assert.match(route, /requireAdminApi\(/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /listAdminBookings/);
  assert.match(route, /readOnly:\s*true/);
  assert.doesNotMatch(route, /\.update\(|\.insert\(|\.delete\(/);
  assert.doesNotMatch(route, /transfer\.create|checkout\.sessions\.create|stripe\.refunds/i);
});

test("admin payments API requires requireAdminApi and is GET-only read-only", () => {
  const route = read("app/api/admin/payments/route.ts");
  assert.match(route, /requireAdminApi\(/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /listAdminPayments/);
  assert.match(route, /readOnly:\s*true/);
  assert.doesNotMatch(route, /\.update\(|\.insert\(|\.delete\(/);
  assert.doesNotMatch(route, /transfer\.create|checkout\.sessions\.create|stripe\.refunds/i);
});

test("admin ops helpers forbid Stripe secrets and metadata dumps in responses", () => {
  assert.ok(ADMIN_OPS_FORBIDDEN_RESPONSE_KEYS.includes("client_secret"));
  assert.ok(ADMIN_OPS_FORBIDDEN_RESPONSE_KEYS.includes("metadata"));
  const lib = read("lib/admin/bookingPaymentOperations.ts");
  const bookingSelect =
    lib.match(/const BOOKING_SELECT\s*=\s*\n?\s*"([^"]+)"/)?.[1] ??
    lib.match(/const BOOKING_SELECT\s*=\s*\n?\s*"([^"]+)"\s*\+/)?.[1] ??
    "";
  const paymentSelect = lib.match(/const PAYMENT_SELECT\s*=\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
  assert.ok(bookingSelect.length > 0 || lib.includes("ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT"), "BOOKING_SELECT missing");
  assert.ok(paymentSelect.length > 0, "PAYMENT_SELECT missing");
  assert.doesNotMatch(bookingSelect, /client_secret|raw|payload/i);
  assert.match(lib, /ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT/);
  assert.doesNotMatch(paymentSelect, /client_secret|raw|payload/i);
  assert.match(paymentSelect, /metadata/);
  assert.match(paymentSelect, /stripe_payment_intent_id/);
  assert.match(paymentSelect, /stripe_checkout_session_id/);
  const bookingsRoute = read("app/api/admin/bookings/route.ts");
  const paymentsRoute = read("app/api/admin/payments/route.ts");
  for (const src of [bookingsRoute, paymentsRoute]) {
    assert.doesNotMatch(src, /STRIPE_SECRET|webhook_secret|sk_live|sk_test/i);
  }
});

test("bookings and payments pages render summary cards and Non disponible", () => {
  const bookings = read("app/(app)/admin/bookings/page.tsx");
  const payments = read("app/(app)/admin/payments/page.tsx");
  assert.match(bookings, /Réservations/);
  assert.match(bookings, /Suivre les demandes, cours confirmés/);
  assert.match(bookings, /Total/);
  assert.match(bookings, /À surveiller/);
  assert.match(bookings, /ADMIN_OPS_UNAVAILABLE|Non disponible/);
  assert.match(payments, /Paiements/);
  assert.match(payments, /Suivre les paiements, crédits, commissions/);
  assert.match(payments, /Commission plateforme/);
  assert.match(payments, /ADMIN_OPS_UNAVAILABLE|Non disponible/);
  assert.equal(ADMIN_OPS_UNAVAILABLE, "Non disponible");
});

test("needs-attention labels are computed correctly", () => {
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const booking = computeBookingAttention({
    status: "pending_payment",
    createdAt: old,
    student: { id: "s1", name: "A", email: "a@x.com" },
    teacher: { id: "t1", name: "B", email: "b@x.com" },
    teacherStripeIncomplete: true,
    paymentStatus: "failed",
    transferStatus: "failed",
    refundStatus: "pending",
  });
  assert.ok(booking.codes.includes("booking_pending_long"));
  assert.ok(booking.codes.includes("payment_failed"));
  assert.ok(booking.codes.includes("teacher_stripe_incomplete"));
  assert.ok(booking.codes.includes("refund_attention"));
  assert.ok(booking.codes.includes("payout_failed"));
  assert.ok(booking.labels.includes("Problème paiement"));
  assert.ok(booking.labels.includes("Stripe prof incomplet"));
  assert.ok(booking.labels.includes("Réservation en attente"));

  const payment = computePaymentAttention({
    paymentStatus: "paid",
    transferStatus: "failed",
    refundStatus: null,
    createdAt: old,
    student: null,
    teacher: { id: "t1", name: "B", email: "b@x.com" },
    teacherStripeIncomplete: true,
  });
  assert.ok(payment.codes.includes("missing_party"));
  assert.ok(payment.codes.includes("teacher_stripe_incomplete"));
  assert.ok(payment.codes.includes("payout_failed"));
  assert.ok(payment.labels.includes("Données incohérentes"));
  assert.equal(mapAttentionLabel("payment_failed"), "Problème paiement");
  assert.equal(shortAdminId("abcdef12-3456"), "abcdef12");
});

test("command center links Réservations to /admin/bookings and Paiements to /admin/payments", () => {
  const bookings = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "bookings");
  const payments = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "payments");
  assert.equal(bookings?.href, "/admin/bookings");
  assert.equal(bookings?.status, "ready");
  assert.equal(payments?.href, "/admin/payments");
  assert.equal(payments?.status, "ready");
});

test("public/student/teacher APIs do not expose admin booking/payment operations helpers", () => {
  const publicRoots = [
    "app/api/teachers",
    "app/api/search",
    "app/api/student",
    "app/api/teacher",
    "app/api/bookings",
    "app/api/stripe",
  ];
  const offenders: string[] = [];
  function walk(dir: string) {
    if (!existsSync(join(ROOT, dir))) return;
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = join(dir, name).split(sep).join("/");
      const st = statSync(join(ROOT, rel));
      if (st.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) continue;
      const src = read(rel);
      if (
        src.includes("listAdminBookings") ||
        src.includes("listAdminPayments") ||
        src.includes("bookingPaymentOperations")
      ) {
        offenders.push(rel);
      }
    }
  }
  for (const root of publicRoots) walk(root);
  assert.deepEqual(offenders, [], `admin ops leaked: ${offenders.join(", ")}`);
});

test("checkout/payment math and webhook files are unchanged by this feature", () => {
  // Structural pin: ops module must not import payment amount / webhook writers.
  const lib = read("lib/admin/bookingPaymentOperations.ts");
  assert.doesNotMatch(lib, /from\s+"@\/lib\/payments\//);
  assert.doesNotMatch(lib, /from\s+"@\/lib\/pricing\//);
  assert.doesNotMatch(lib, /computeBookingAmounts|calculateBookingAmounts|getPlatformFeeRate/);

  for (const rel of [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/amounts.ts",
    "lib/payments/commission.ts",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(
      src,
      /listAdminBookings|listAdminPayments|bookingPaymentOperations/,
    );
  }
});

test("booking cancel/transition routes are not modified by admin ops pages", () => {
  const cancel = read("app/api/bookings/[id]/cancel/route.ts");
  assert.doesNotMatch(cancel, /listAdminBookings|bookingPaymentOperations/);
  const bookingsPage = read("app/(app)/admin/bookings/page.tsx");
  const paymentsPage = read("app/(app)/admin/payments/page.tsx");
  for (const page of [bookingsPage, paymentsPage]) {
    assert.doesNotMatch(page, /fetch\([^)]*\/cancel|method:\s*["']POST["']/);
    assert.doesNotMatch(page, /rembourser|annuler la réservation|retry.?payout/i);
  }
});

test("sitemap and public SEO surfaces do not reference admin bookings/payments APIs", () => {
  const candidates = [
    "app/sitemap.ts",
    "app/robots.ts",
    "app/(marketing)",
  ];
  for (const rel of candidates) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    const st = statSync(full);
    if (st.isFile()) {
      const src = read(rel);
      assert.doesNotMatch(src, /\/api\/admin\/bookings|\/api\/admin\/payments/);
      continue;
    }
    // shallow check of marketing pages
    for (const name of readdirSync(full)) {
      const child = join(rel, name).split(sep).join("/");
      if (!child.endsWith(".ts") && !child.endsWith(".tsx")) continue;
      const src = read(child);
      assert.doesNotMatch(src, /\/api\/admin\/bookings|\/api\/admin\/payments/);
    }
  }
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[admin:bookings-payments-ops] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
