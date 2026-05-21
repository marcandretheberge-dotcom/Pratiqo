import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  findBookingPaymentForStripeEvent,
  handleStripeChargeDisputeCreated,
  handleStripeTransferFailed,
  transferFailureReason,
} from "@/lib/payments/webhookRiskEvents";
import { paymentBlocksAutoComplete } from "@/lib/bookings/completeBooking";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

type PaymentRow = {
  id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  payment_status: string;
  transfer_status: string;
  failure_reason?: string | null;
  metadata?: Record<string, unknown>;
};

class FakeAdmin {
  payments = new Map<string, PaymentRow>();
  supportCases: Array<Record<string, unknown>> = [];
  transferUpdates: Array<{ bookingId: string; reason: string }> = [];
  disputeUpdates: Array<{ bookingId: string; disputeId: string }> = [];

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

class FakeQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private op: "select" | "update" | "insert" = "select";
  private patch: Record<string, unknown> | null = null;
  private insertRow: Record<string, unknown> | null = null;

  constructor(
    private readonly admin: FakeAdmin,
    private readonly table: string,
  ) {}

  select(fields: string) {
    void fields;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.patch = patch;
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.op = "insert";
    this.insertRow = row;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  in(column: string, values: unknown) {
    this.filters.push({ column: `in:${column}`, value: values });
    return this;
  }

  limit() {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.runAwaited()).then(onfulfilled, onrejected);
  }

  maybeSingle() {
    return Promise.resolve(this.runMaybeSingle());
  }

  private runAwaited() {
    if (this.op === "update" || this.op === "insert") {
      return this.runMaybeSingle();
    }
    if (this.op === "select") {
      return this.runSelect();
    }
    return { data: null, error: null };
  }

  private runSelect() {
    if (this.table === "support_cases") {
      const bookingId = this.filters.find((f) => f.column === "booking_id")?.value as string | undefined;
      const open = this.admin.supportCases.filter(
        (c) =>
          (!bookingId || c.booking_id === bookingId) &&
          c.payout_hold === true &&
          ["new", "waiting_other_party", "under_review"].includes(String(c.status)),
      );
      return { data: open, error: null };
    }

    if (this.table === "booking_payments") {
      const row = this.findPayment();
      return { data: row ? [row] : [], error: null };
    }

    return { data: [], error: null };
  }

  private runMaybeSingle() {
    if (this.table === "booking_payments" && this.op === "select") {
      const row = this.findPayment();
      return { data: row, error: null };
    }

    if (this.table === "support_cases" && this.op === "select") {
      const { data } = this.runSelect();
      const rows = Array.isArray(data) ? data : [];
      return { data: rows[0] ?? null, error: null };
    }

    if (this.table === "booking_payments" && this.op === "update") {
      const row = this.findPayment();
      if (!row || !this.patch) return { data: null, error: null };
      if (this.patch.transfer_status === "failed") {
        this.admin.transferUpdates.push({
          bookingId: row.booking_id,
          reason: String(this.patch.failure_reason ?? ""),
        });
        row.transfer_status = "failed";
        row.failure_reason = this.patch.failure_reason as string;
      }
      if (this.patch.payment_status === "disputed") {
        this.admin.disputeUpdates.push({
          bookingId: row.booking_id,
          disputeId: String((this.patch.metadata as Record<string, unknown>)?.stripe_dispute_id ?? ""),
        });
        row.payment_status = "disputed";
        row.metadata = this.patch.metadata as Record<string, unknown>;
      }
      return { data: row, error: null };
    }

    if (this.table === "support_cases" && this.op === "insert" && this.insertRow) {
      this.admin.supportCases.push(this.insertRow);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  private findPayment(): PaymentRow | null {
    for (const row of this.admin.payments.values()) {
      if (this.filters.every((filter) => row[filter.column as keyof PaymentRow] === filter.value)) {
        return row;
      }
    }
    return null;
  }
}

test("transferFailureReason prefers Stripe failure message", () => {
  const reason = transferFailureReason(
    {
      id: "tr_1",
      failure_message: "Insufficient funds",
      failure_code: "insufficient_funds",
    } as unknown as Stripe.Transfer,
    "evt_1",
  );
  assert.equal(reason, "Insufficient funds");
});

test("handleStripeTransferFailed marks booking payment failed", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_1", {
    id: "pay_1",
    booking_id: "bk_1",
    teacher_id: "t1",
    student_id: "s1",
    stripe_payment_intent_id: "pi_1",
    stripe_charge_id: "ch_1",
    stripe_transfer_id: "tr_1",
    payment_status: "paid",
    transfer_status: "not_ready",
  });

  const result = await handleStripeTransferFailed(
    admin as unknown as SupabaseClient,
    {
      id: "tr_1",
      metadata: { booking_id: "bk_1" },
      failure_message: "Account restricted",
    } as unknown as Stripe.Transfer,
    "evt_tf_1",
  );

  assert.equal(result.ok, true);
  assert.equal(admin.transferUpdates.length, 1);
  assert.match(admin.transferUpdates[0].reason, /Account restricted/);
});

test("handleStripeTransferFailed is idempotent when already failed", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_1", {
    id: "pay_1",
    booking_id: "bk_1",
    teacher_id: "t1",
    student_id: "s1",
    stripe_payment_intent_id: "pi_1",
    stripe_charge_id: "ch_1",
    stripe_transfer_id: "tr_1",
    payment_status: "paid",
    transfer_status: "failed",
  });

  const result = await handleStripeTransferFailed(
    admin as unknown as SupabaseClient,
    { id: "tr_1", metadata: { booking_id: "bk_1" } } as unknown as Stripe.Transfer,
    "evt_tf_2",
  );

  assert.equal(result.skipped, "already_failed");
  assert.equal(admin.transferUpdates.length, 0);
});

test("handleStripeChargeDisputeCreated flags payment and opens payout hold case", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_2", {
    id: "pay_2",
    booking_id: "bk_2",
    teacher_id: "t2",
    student_id: "s2",
    stripe_payment_intent_id: "pi_2",
    stripe_charge_id: "ch_2",
    stripe_transfer_id: null,
    payment_status: "paid",
    transfer_status: "not_ready",
  });

  const result = await handleStripeChargeDisputeCreated(
    admin as unknown as SupabaseClient,
    {
      id: "dp_1",
      charge: "ch_2",
      payment_intent: "pi_2",
      reason: "fraudulent",
    } as Stripe.Dispute,
    "evt_dp_1",
  );

  assert.equal(result.ok, true);
  assert.equal(admin.disputeUpdates.length, 1);
  assert.equal(admin.transferUpdates.length, 1);
  assert.equal(admin.supportCases.length, 1);
  assert.equal(admin.supportCases[0].payout_hold, true);
});

test("dispute retry completes payout hold and support case when already disputed", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_2", {
    id: "pay_2",
    booking_id: "bk_2",
    teacher_id: "t2",
    student_id: "s2",
    stripe_payment_intent_id: "pi_2",
    stripe_charge_id: "ch_2",
    stripe_transfer_id: null,
    payment_status: "disputed",
    transfer_status: "not_ready",
  });

  const result = await handleStripeChargeDisputeCreated(
    admin as unknown as SupabaseClient,
    { id: "dp_2", charge: "ch_2", reason: "fraudulent" } as Stripe.Dispute,
    "evt_dp_2",
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, "already_disputed");
  assert.equal(admin.disputeUpdates.length, 0);
  assert.equal(admin.transferUpdates.length, 1);
  assert.equal(admin.supportCases.length, 1);
});

test("dispute retry is idempotent when hold and support case already exist", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_2", {
    id: "pay_2",
    booking_id: "bk_2",
    teacher_id: "t2",
    student_id: "s2",
    stripe_payment_intent_id: "pi_2",
    stripe_charge_id: "ch_2",
    stripe_transfer_id: null,
    payment_status: "disputed",
    transfer_status: "failed",
  });
  admin.supportCases.push({
    booking_id: "bk_2",
    payout_hold: true,
    status: "new",
  });

  const result = await handleStripeChargeDisputeCreated(
    admin as unknown as SupabaseClient,
    { id: "dp_2", charge: "ch_2", reason: "fraudulent" } as Stripe.Dispute,
    "evt_dp_3",
  );

  assert.equal(result.skipped, "already_disputed");
  assert.equal(admin.disputeUpdates.length, 0);
  assert.equal(admin.transferUpdates.length, 0);
  assert.equal(admin.supportCases.length, 1);
});

test("paymentBlocksAutoComplete blocks disputed payments", () => {
  assert.equal(
    paymentBlocksAutoComplete({
      id: "pay_3",
      booking_id: "bk_3",
      stripe_payment_intent_id: "pi_3",
      stripe_charge_id: "ch_3",
      stripe_transfer_id: null,
      amount_cents: 1000,
      platform_fee_cents: 100,
      teacher_net_cents: 900,
      currency: "cad",
      payment_status: "disputed",
      transfer_status: "not_ready",
    }),
    true,
  );
});

test("findBookingPaymentForStripeEvent resolves by charge id", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_4", {
    id: "pay_4",
    booking_id: "bk_4",
    teacher_id: "t4",
    student_id: "s4",
    stripe_payment_intent_id: "pi_4",
    stripe_charge_id: "ch_4",
    stripe_transfer_id: null,
    payment_status: "paid",
    transfer_status: "not_ready",
  });

  const row = await findBookingPaymentForStripeEvent(admin as unknown as SupabaseClient, {
    chargeId: "ch_4",
  });
  assert.equal(row?.booking_id, "bk_4");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[payments:riskWebhook] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
