import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  attemptStripeBookingRefund,
  buildBookingRefundIdempotencyKey,
  type StripeRefundsClient,
} from "@/lib/payments/refunds";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

type PaymentRow = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  stripe_transfer_id: string | null;
  amount_cents: number;
  refunded_cents: number;
  currency: string;
  payment_status: string;
  transfer_status: string;
  refund_status: string;
  refunded_at: string | null;
  metadata: Record<string, unknown> | null;
};

function paymentRow(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: "bp_1",
    booking_id: "bk_1",
    stripe_payment_intent_id: "pi_1",
    stripe_charge_id: "ch_1",
    stripe_refund_id: null,
    stripe_transfer_id: null,
    amount_cents: 4500,
    refunded_cents: 0,
    currency: "cad",
    payment_status: "paid",
    transfer_status: "not_ready",
    refund_status: "not_required",
    refunded_at: null,
    metadata: null,
    ...overrides,
  };
}

function fakeAdmin(row: PaymentRow | null) {
  const updates: Array<Record<string, unknown>> = [];
  return {
    updates,
    from(table: string) {
      assert.equal(table, "booking_payments");
      return {
        select() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, "booking_id");
              assert.equal(value, "bk_1");
              return {
                async maybeSingle() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          return {
            async eq(column: string, value: string) {
              assert.equal(column, "id");
              assert.equal(value, row?.id ?? "bp_1");
              return { error: null };
            },
          };
        },
      };
    },
  };
}

function fakeStripe(refundId = "re_1"): StripeRefundsClient & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    refunds: {
      async create(params, options) {
        calls.push({ params, options });
        return {
          id: refundId,
          status: "succeeded",
        } as never;
      },
    },
  };
}

test("disputed paid booking returns manual_review_required without calling Stripe", async () => {
  const admin = fakeAdmin(paymentRow({ payment_status: "disputed" }));
  const stripe = fakeStripe();

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student" },
    stripe,
  );

  assert.deepEqual(result, { kind: "manual_review_required", reason: "disputed" });
  assert.equal(stripe.calls.length, 0);
});

test("paid ledger row missing payment_intent returns manual_review_required", async () => {
  const admin = fakeAdmin(paymentRow({ stripe_payment_intent_id: null }));
  const stripe = fakeStripe();

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student" },
    stripe,
  );

  assert.deepEqual(result, {
    kind: "manual_review_required",
    reason: "missing_payment_reference",
  });
  assert.equal(stripe.calls.length, 0);
});

test("unpaid row with no Stripe evidence can still return no_payment", async () => {
  const admin = fakeAdmin(
    paymentRow({
      payment_status: "unpaid",
      stripe_payment_intent_id: null,
      stripe_charge_id: null,
      stripe_refund_id: null,
    }),
  );
  const stripe = fakeStripe();

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student" },
    stripe,
  );

  assert.deepEqual(result, { kind: "no_payment", reason: "not_paid" });
  assert.equal(stripe.calls.length, 0);
});

test("unpaid row with Stripe evidence is ambiguous and goes to manual review", async () => {
  const admin = fakeAdmin(paymentRow({ payment_status: "requires_action" }));
  const stripe = fakeStripe();

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student" },
    stripe,
  );

  assert.deepEqual(result, {
    kind: "manual_review_required",
    reason: "ambiguous_payment_state",
  });
  assert.equal(stripe.calls.length, 0);
});

test("duplicate refund handling remains idempotent when refund is already recorded", async () => {
  const admin = fakeAdmin(
    paymentRow({
      stripe_refund_id: "re_existing",
      refunded_cents: 4500,
      refund_status: "refunded",
      payment_status: "refunded",
    }),
  );
  const stripe = fakeStripe();

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student" },
    stripe,
  );

  assert.deepEqual(result, {
    kind: "already_refunded",
    stripeRefundId: "re_existing",
    amountCents: 4500,
  });
  assert.equal(stripe.calls.length, 0);
});

test("safe refund path is idempotent and records Stripe refund metadata", async () => {
  const admin = fakeAdmin(paymentRow());
  const stripe = fakeStripe("re_created");

  const result = await attemptStripeBookingRefund(
    admin as never,
    { bookingId: "bk_1", actor: "student", cancellationReason: "schedule_conflict" },
    stripe,
  );

  assert.equal(result.kind, "refunded");
  assert.equal(stripe.calls.length, 1);
  assert.equal(
    (stripe.calls[0] as { options: { idempotencyKey: string } }).options.idempotencyKey,
    buildBookingRefundIdempotencyKey("bk_1"),
  );
  assert.equal(admin.updates.length, 1);
  assert.equal(admin.updates[0].refund_status, "refunded");
  assert.equal(admin.updates[0].stripe_refund_id, "re_created");
  assert.equal(admin.updates[0].payment_status, "refunded");
});

test("cancel route escalates paid-looking missing ledger/payment data to manual review", () => {
  const route = read("app/api/bookings/[id]/cancel/route.ts");

  assert.match(route, /bookingLooksPaidOrAmbiguous/);
  assert.match(route, /no_payment:\$\{refundOutcome\.reason\}/);
  assert.match(route, /await escalateToManualReview\(\s*"missing_payment_data"/);
});

test("user-facing copy does not say nothing to refund for manual review states", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    assert.match(dict.cancelOutcomeManualReviewTitle, /manual|manuelle|manual/i);
    assert.doesNotMatch(
      `${dict.cancelOutcomeManualReviewTitle}\n${dict.cancelOutcomeManualReviewBody}`,
      /nothing to refund|rien (à|a) rembourser|nada que reembolsar/i,
    );
  }
});

test("patch stays outside explicitly restricted systems", () => {
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const forbidden = [
    /^supabase\//,
    /^content\/legal\//,
    /^app\/\(app\)\/legal\//,
    /^app\/yo\//,
    /^lib\/yo\//,
    /^public\/audio\//,
    /^public\/.*\.mp3$/i,
    /^scripts\/.*openai/i,
    /^app\/sitemap\.ts$/,
    /^app\/robots\.ts$/,
    /^lib\/seo\//,
    /^lib\/config\/membrePro\.ts$/,
  ];

  for (const file of changed) {
    assert.ok(
      !forbidden.some((re) => re.test(file)),
      `restricted file changed by booking refund patch: ${file}`,
    );
  }
});

async function main(): Promise<void> {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  if (process.exitCode !== 1) {
    console.log(`[payments:bookingCancellationRefunds] ${passed} tests passed`);
  }
}

void main();
