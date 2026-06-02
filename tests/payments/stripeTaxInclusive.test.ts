import assert from "node:assert/strict";
import { calculateBookingAmounts } from "@/lib/payments/commission";
import {
  buildStripeTaxCheckoutParams,
  canIssueLessonPaymentReceipt,
  finalizeLessonPaymentLedger,
  isSalesTaxEnabled,
  isStripeTaxInclusiveEnabled,
  metadataIndicatesStripeTaxPending,
  parseStripeCheckoutTaxBreakdown,
  paymentTaxBlocksPayout,
  resolveLessonPaymentTaxMode,
  shouldDeferLessonPaymentFinalization,
  shouldDeferPaymentIntentLedgerFinalizationFromMetadata,
  shouldFinalizeStripeTaxFromCheckoutSessionMetadata,
} from "@/lib/payments/tax";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const originalEnv = { ...process.env };

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function restoreEnv() {
  process.env = { ...originalEnv };
}

test("flag off: checkout tax params disabled and legacy amounts unchanged", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "false";
  assert.equal(isSalesTaxEnabled(), false);
  assert.equal(isStripeTaxInclusiveEnabled(), false);
  const params = buildStripeTaxCheckoutParams();
  assert.equal(params.enabled, false);
  assert.equal(params.automaticTax, undefined);
  assert.equal(params.lineItemTaxBehavior, undefined);
  assert.equal(params.metadata.tax_behavior, "not_collected");

  const amounts = calculateBookingAmounts({ subtotalCents: 2500, taxTotalCents: 0, teacherPlan: "free" });
  assert.equal(amounts.amountCents, 2500);
  assert.equal(amounts.subtotalCents, 2500);
  assert.equal(amounts.platformFeeCents, 375);
});

test("flag on: checkout params include automatic_tax and inclusive tax behavior", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "true";
  process.env.PRATIQO_TAX_MODE = "stripe_tax_inclusive";
  process.env.STRIPE_TAX_CODE_PRIVATE_LESSONS = "txcd_123";
  const params = buildStripeTaxCheckoutParams();
  assert.equal(params.enabled, true);
  assert.deepEqual(params.automaticTax, { enabled: true });
  assert.equal(params.lineItemTaxBehavior, "inclusive");
  assert.equal(params.taxCode, "txcd_123");
  assert.equal(params.metadata.tax_mode, "stripe_tax_inclusive");
  assert.equal(params.metadata.tax_status, "pending");
});

test("credits reduce final amount before Stripe Tax (commission uses pre-tax subtotal after webhook)", () => {
  const grossCents = 2500;
  const creditCents = 500;
  const finalCents = grossCents - creditCents;
  assert.equal(finalCents, 2000);

  const breakdown = parseStripeCheckoutTaxBreakdown({
    id: "cs_test",
    amount_total: 2000,
    amount_subtotal: 1740,
    total_details: { amount_tax: 260 },
  } as never);

  assert.equal(breakdown.ok, true);
  if (!breakdown.ok) return;
  assert.equal(breakdown.amountCents, 2000);
  assert.equal(breakdown.subtotalCents, 1740);
  assert.equal(breakdown.taxTotalCents, 260);

  const amounts = calculateBookingAmounts({
    subtotalCents: breakdown.subtotalCents,
    taxTotalCents: breakdown.taxTotalCents,
    teacherPlan: "free",
  });
  assert.equal(amounts.platformFeeCents, 261);
  assert.notEqual(amounts.platformFeeCents, Math.floor((2000 * 1500) / 10000));
});

test("webhook stores totals from Checkout Session and platform fee uses subtotal", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "true";
  process.env.PRATIQO_TAX_MODE = "stripe_tax_inclusive";

  const sessionMd = { tax_mode: "stripe_tax_inclusive", tax_status: "pending" };
  const session = {
    id: "cs_1",
    metadata: sessionMd,
    amount_total: 2300,
    amount_subtotal: 2000,
    total_details: { amount_tax: 300 },
  } as never;

  const ledger = finalizeLessonPaymentLedger({
    checkoutSession: session,
    piMetadata: { loyalty_tier: "bronze", ...sessionMd },
    teacherPlan: "free",
  });

  assert.equal(ledger.ok, true);
  if (!ledger.ok) return;
  assert.equal(ledger.amountCents, 2300);
  assert.equal(ledger.subtotalCents, 2000);
  assert.equal(ledger.taxTotalCents, 300);
  assert.equal(ledger.platformFeeCents, 300);
  assert.equal(ledger.teacherNetCents, 1700);
  assert.equal(ledger.taxStatus, "calculated");
});

test("missing tax data when enabled fails safely without commission on tax-inclusive total", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "true";
  process.env.PRATIQO_TAX_MODE = "stripe_tax_inclusive";

  const sessionMd = { tax_mode: "stripe_tax_inclusive", tax_status: "pending" };
  const ledger = finalizeLessonPaymentLedger({
    checkoutSession: {
      id: "cs_bad",
      metadata: sessionMd,
      amount_total: 2300,
      amount_subtotal: null,
      total_details: { amount_tax: null },
    } as never,
    piMetadata: sessionMd,
    teacherPlan: "free",
  });

  assert.equal(ledger.ok, false);
  if (ledger.ok) return;
  assert.equal(ledger.taxStatus, "failed");
  assert.equal(ledger.platformFeeCents, 0);
  assert.equal(ledger.teacherNetCents, 0);
});

test("rollback: PI metadata defers ledger even when env flag is disabled", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "false";
  assert.equal(isStripeTaxInclusiveEnabled(), false);
  const md = { tax_mode: "stripe_tax_inclusive", tax_status: "pending" };
  assert.equal(shouldDeferPaymentIntentLedgerFinalizationFromMetadata(md), true);
  assert.equal(shouldDeferLessonPaymentFinalization(md), true);
});

test("rollback: checkout session metadata finalizes tax when env flag is disabled", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "false";
  const sessionMd = { tax_mode: "stripe_tax_inclusive", tax_status: "pending" };
  assert.equal(shouldFinalizeStripeTaxFromCheckoutSessionMetadata(sessionMd), true);
  assert.equal(
    resolveLessonPaymentTaxMode({
      piMetadata: sessionMd,
      checkoutSession: {
        id: "cs_rollback",
        metadata: sessionMd,
        amount_total: 2300,
        amount_subtotal: 2000,
        total_details: { amount_tax: 300 },
      } as never,
    }),
    "stripe_tax_inclusive",
  );

  const ledger = finalizeLessonPaymentLedger({
    checkoutSession: {
      id: "cs_rollback",
      metadata: sessionMd,
      amount_total: 2300,
      amount_subtotal: 2000,
      total_details: { amount_tax: 300 },
    } as never,
    piMetadata: sessionMd,
    teacherPlan: "free",
  });
  assert.equal(ledger.ok, true);
  if (!ledger.ok) return;
  assert.equal(ledger.taxStatus, "calculated");
  assert.equal(ledger.subtotalCents, 2000);
  assert.equal(ledger.taxTotalCents, 300);
});

test("env on without tax metadata finalizes as not_collected (no env fallback on webhook path)", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "true";
  process.env.PRATIQO_TAX_MODE = "stripe_tax_inclusive";
  assert.equal(isStripeTaxInclusiveEnabled(), true);

  const ledger = finalizeLessonPaymentLedger({
    checkoutSession: {
      id: "cs_legacy",
      metadata: { booking_id: "bk_legacy" },
      amount_total: 2500,
    } as never,
    piMetadata: { booking_id: "bk_legacy", amount_cents: "2500", platform_fee_cents: "250", teacher_net_cents: "2250" },
    amountCentsFromStripe: 2500,
    teacherPlan: "free",
  });

  assert.equal(ledger.ok, true);
  if (!ledger.ok) return;
  assert.equal(ledger.taxBehavior, "not_collected");
  assert.equal(ledger.taxStatus, "not_collected");
  assert.equal(ledger.taxTotalCents, 0);
  assert.equal(ledger.subtotalCents, 2500);
  assert.equal(ledger.amountCents, 2500);
});

test("rollback: legacy session without tax metadata stays not_collected when env is off", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "false";
  assert.equal(shouldFinalizeStripeTaxFromCheckoutSessionMetadata({ booking_id: "bk_1" }), false);
  assert.equal(
    resolveLessonPaymentTaxMode({ piMetadata: { booking_id: "bk_1", amount_cents: "2500" } }),
    "not_collected",
  );
  const ledger = finalizeLessonPaymentLedger({
    piMetadata: { booking_id: "bk_1", amount_cents: "2500", platform_fee_cents: "250", teacher_net_cents: "2250" },
    amountCentsFromStripe: 2500,
    teacherPlan: "free",
  });
  assert.equal(ledger.ok, true);
  if (!ledger.ok) return;
  assert.equal(ledger.taxBehavior, "not_collected");
  assert.equal(ledger.taxStatus, "not_collected");
});

test("success fallback defers when tax_mode is stripe_tax_inclusive in metadata", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "false";
  assert.equal(
    shouldDeferLessonPaymentFinalization({ tax_mode: "stripe_tax_inclusive", tax_status: "pending" }),
    true,
  );
  assert.equal(canIssueLessonPaymentReceipt({ tax_behavior: "stripe_tax_inclusive", tax_status: "pending" }), false);
  assert.equal(canIssueLessonPaymentReceipt({ tax_behavior: "stripe_tax_inclusive", tax_status: "calculated" }), true);
});

test("payout blocks tax_status pending and failed; allows calculated and not_collected", () => {
  assert.equal(
    paymentTaxBlocksPayout({ tax_behavior: "stripe_tax_inclusive", tax_status: "pending" }).blocked,
    true,
  );
  assert.equal(
    paymentTaxBlocksPayout({ tax_behavior: "stripe_tax_inclusive", tax_status: "failed" }).blocked,
    true,
  );
  assert.equal(
    paymentTaxBlocksPayout({ tax_behavior: "stripe_tax_inclusive", tax_status: "calculated" }).blocked,
    false,
  );
  assert.equal(paymentTaxBlocksPayout({ tax_behavior: "not_collected", tax_status: "not_collected" }).blocked, false);
  assert.equal(metadataIndicatesStripeTaxPending({ tax_status: "pending" }), true);
});

test("idempotent finalize with same session yields same commission math", () => {
  restoreEnv();
  process.env.PRATIQO_COLLECT_SALES_TAX = "true";
  process.env.PRATIQO_TAX_MODE = "stripe_tax_inclusive";
  const sessionMd = { tax_mode: "stripe_tax_inclusive", tax_status: "pending" };
  const session = {
    id: "cs_idem",
    metadata: sessionMd,
    amount_total: 2000,
    amount_subtotal: 1740,
    total_details: { amount_tax: 260 },
  } as never;
  const first = finalizeLessonPaymentLedger({
    checkoutSession: session,
    piMetadata: sessionMd,
    teacherPlan: "free",
  });
  const second = finalizeLessonPaymentLedger({
    checkoutSession: session,
    piMetadata: sessionMd,
    teacherPlan: "free",
  });
  assert.deepEqual(first, second);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  restoreEnv();
  console.log(`[payments:stripeTaxInclusive] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
