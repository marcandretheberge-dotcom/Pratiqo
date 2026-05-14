import assert from "node:assert/strict";
import { createConfirmBookingAndNotify, type BookingWebhookDeps } from "@/lib/stripeWebhook/bookings";

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const originalConsole = {
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

type Filter = { column: string; value: unknown };

class FakeQuery {
  private filters: Filter[] = [];
  private op: "select" | "update" | "insert" = "select";
  private selectFields = "";
  private selectOptions: Record<string, unknown> | undefined;
  private patch: Record<string, unknown> | undefined;

  constructor(
    private readonly admin: FakeAdmin,
    private readonly table: string,
  ) {}

  select(fields: string, options?: Record<string, unknown>) {
    this.selectFields = fields;
    this.selectOptions = options;
    if (this.op === "update") return this.executeUpdateSelect();
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.patch = patch;
    return this;
  }

  insert(rows: unknown) {
    this.op = "insert";
    this.admin.inserts.push({ table: this.table, rows });
    return Promise.resolve({ error: this.admin.insertError ?? null });
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column: `neq:${column}`, value });
    return this;
  }

  in(column: string, value: unknown) {
    this.filters.push({ column: `in:${column}`, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column: `is:${column}`, value });
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.admin.maybeSingle(this.table, this.selectFields, this.filters));
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute() {
    if (this.op === "update") {
      this.admin.updates.push({ table: this.table, patch: this.patch ?? {}, filters: this.filters });
      return Promise.resolve({ error: this.admin.updateError ?? null });
    }

    if (this.selectOptions?.head) {
      return Promise.resolve({ count: this.admin.confirmedBookingCount, error: null });
    }

    return Promise.resolve({ data: [], error: null });
  }

  private executeUpdateSelect() {
    this.admin.updates.push({ table: this.table, patch: this.patch ?? {}, filters: this.filters });
    const isConfirmUpdate =
      this.table === "bookings" &&
      this.patch?.status === "confirmed" &&
      this.filters.some((f) => f.column === "status" && f.value === "pending_payment");
    return Promise.resolve({
      data: isConfirmUpdate ? this.admin.confirmUpdateRows : [],
      error: this.admin.updateError ?? null,
    });
  }
}

class FakeAdmin {
  inserts: Array<{ table: string; rows: unknown }> = [];
  updates: Array<{ table: string; patch: Record<string, unknown>; filters: Filter[] }> = [];
  insertError: unknown = null;
  updateError: unknown = null;
  confirmedBookingCount = 1;
  confirmUpdateRows: Array<{ id: string }> = [{ id: "booking_1" }];

  booking: Record<string, unknown> = baseBooking();
  currentBooking: Record<string, unknown> | null = null;
  otherConfirmed: Record<string, unknown> | null = null;
  teacher: Record<string, unknown> | null = {
    user_id: "teacher_user_1",
    name: "Teacher",
    discipline: "Music",
  };
  studentProfile: Record<string, unknown> | null = {
    name: "Student",
    email: "student@example.test",
    companion_type: null,
  };
  teacherProfile: Record<string, unknown> | null = {
    email: "teacher@example.test",
    plan: "free",
  };

  from(table: string) {
    return new FakeQuery(this, table);
  }

  maybeSingle(table: string, fields: string, filters: Filter[]) {
    if (table === "bookings" && fields.startsWith("id, teacher_id")) {
      return { data: this.booking, error: null };
    }

    if (table === "bookings" && fields === "id" && filters.some((f) => f.column === "status" && f.value === "confirmed")) {
      return { data: this.otherConfirmed, error: null };
    }

    if (table === "bookings" && fields === "status, stripe_payment_intent_id") {
      return { data: this.currentBooking, error: null };
    }

    if (table === "teachers") {
      return { data: this.teacher, error: null };
    }

    if (table === "profiles" && fields === "name, email, companion_type") {
      return { data: this.studentProfile, error: null };
    }

    if (table === "profiles" && fields === "email, plan") {
      return { data: this.teacherProfile, error: null };
    }

    return { data: null, error: null };
  }
}

function baseBooking() {
  return {
    id: "booking_1",
    teacher_id: "teacher_1",
    student_id: "student_1",
    status: "pending_payment",
    date: "2026-06-01",
    time: "10:00",
    slot_date: "2026-06-01",
    time_slot: "10:00",
    credits_applied: 0,
    price: 100,
    duration_minutes: 60,
    teaching_mode: "online",
    stripe_payment_intent_id: null,
  };
}

function createHarness(admin = new FakeAdmin()) {
  const calls = {
    refunds: [] as string[],
    ledger: [] as unknown[],
    captured: [] as unknown[],
    studentEmails: [] as unknown[],
    teacherEmails: [] as unknown[],
    credits: [] as unknown[],
  };

  const deps: BookingWebhookDeps = {
    getSupabaseAdmin: () => admin as never,
    refundPaymentIntent: async (paymentIntentId) => {
      calls.refunds.push(paymentIntentId);
    },
    retrievePaymentIntentChargeId: async () => "ch_1",
    upsertPaidBookingPayment: async (_admin, update) => {
      calls.ledger.push(update);
    },
    captureException: ((e: unknown) => {
      calls.captured.push(e);
    }) as BookingWebhookDeps["captureException"],
    getPlatformFeeRate: () => 0.1,
    deductCredits: async (...args) => {
      calls.credits.push(args);
      return { ok: true };
    },
    awardCredit: async () => ({ awarded: true, newBalance: 0 }),
    sendBookingConfirmedStudent: async (payload) => {
      calls.studentEmails.push(payload);
    },
    sendBookingConfirmedTeacher: async (payload) => {
      calls.teacherEmails.push(payload);
    },
    sendCompanionEvolution: async () => undefined,
    getCompanionStage: () => companionStage(),
  };

  return {
    admin,
    calls,
    confirmBookingAndNotify: createConfirmBookingAndNotify(deps),
  };
}

test("refunds an already-confirmed booking when the incoming payment intent differs", async () => {
  const { admin, calls, confirmBookingAndNotify } = createHarness();
  admin.booking = {
    ...baseBooking(),
    status: "confirmed",
    stripe_payment_intent_id: "pi_existing",
  };

  await confirmBookingAndNotify("booking_1", "pi_incoming");

  assert.deepEqual(calls.refunds, ["pi_incoming"]);
  assert.equal(calls.ledger.length, 0);
  assert.equal(admin.inserts.length, 0);
});

test("refunds and marks conflict when another confirmed booking owns the slot", async () => {
  const { admin, calls, confirmBookingAndNotify } = createHarness();
  admin.otherConfirmed = { id: "booking_2" };

  await confirmBookingAndNotify("booking_1", "pi_1");

  assert.deepEqual(calls.refunds, ["pi_1"]);
  assert.equal(calls.ledger.length, 0);
  assert(admin.updates.some((u) => u.table === "bookings" && u.patch.status === "cancelled_conflict"));
});

test("tolerates concurrent duplicate delivery without refunding or sending confirmations", async () => {
  const { admin, calls, confirmBookingAndNotify } = createHarness();
  admin.confirmUpdateRows = [];
  admin.currentBooking = { status: "confirmed", stripe_payment_intent_id: "pi_1" };

  await confirmBookingAndNotify("booking_1", "pi_1");

  assert.equal(calls.refunds.length, 0);
  assert.equal(calls.ledger.length, 1);
  assert.equal(admin.inserts.length, 0);
  assert.equal(calls.studentEmails.length, 0);
  assert.equal(calls.teacherEmails.length, 0);
});

test("stops notifications and emails when ledger upsert fails", async () => {
  const failing = new Error("ledger failed");
  const depsFailure = createHarness();
  const failingConfirm = createConfirmBookingAndNotify({
    ...({
      getSupabaseAdmin: () => depsFailure.admin as never,
      refundPaymentIntent: async (paymentIntentId: string) => {
        depsFailure.calls.refunds.push(paymentIntentId);
      },
      retrievePaymentIntentChargeId: async () => "ch_1",
      upsertPaidBookingPayment: async () => {
        throw failing;
      },
      captureException: ((e: unknown) => {
        depsFailure.calls.captured.push(e);
      }) as BookingWebhookDeps["captureException"],
      getPlatformFeeRate: () => 0.1,
      deductCredits: async () => ({ ok: true }),
      awardCredit: async () => ({ awarded: true, newBalance: 0 }),
      sendBookingConfirmedStudent: async (payload: unknown) => {
        depsFailure.calls.studentEmails.push(payload);
      },
      sendBookingConfirmedTeacher: async (payload: unknown) => {
        depsFailure.calls.teacherEmails.push(payload);
      },
      sendCompanionEvolution: async () => undefined,
      getCompanionStage: () => companionStage(),
    } satisfies BookingWebhookDeps),
  });

  await failingConfirm("booking_1", "pi_1");

  assert.equal(depsFailure.calls.captured[0], failing);
  assert.equal(depsFailure.admin.inserts.length, 0);
  assert.equal(depsFailure.calls.studentEmails.length, 0);
  assert.equal(depsFailure.calls.teacherEmails.length, 0);
});

test("deducts credits after a successful first confirmation", async () => {
  const { admin, calls, confirmBookingAndNotify } = createHarness();

  await confirmBookingAndNotify("booking_1", "pi_1", { credits_applied: "2" });

  assert.deepEqual(calls.credits, [["student_1", 2, "booking_1"]]);
  assert(admin.updates.some((u) => u.table === "bookings" && u.patch.credits_applied === 2));
  assert.equal(calls.studentEmails.length, 1);
  assert.equal(calls.teacherEmails.length, 1);
});

test("does not deduct credits again for duplicate confirmed deliveries", async () => {
  const { admin, calls, confirmBookingAndNotify } = createHarness();
  admin.booking = {
    ...baseBooking(),
    status: "confirmed",
    stripe_payment_intent_id: "pi_1",
    credits_applied: 2,
  };

  await confirmBookingAndNotify("booking_1", "pi_1", { credits_applied: "2" });

  assert.equal(calls.refunds.length, 0);
  assert.equal(calls.ledger.length, 1);
  assert.equal(calls.credits.length, 0);
  assert.equal(calls.studentEmails.length, 0);
  assert.equal(calls.teacherEmails.length, 0);
});

test("preserves Stripe amount and checkout session details in the ledger", async () => {
  const { calls, confirmBookingAndNotify } = createHarness();

  await confirmBookingAndNotify(
    "booking_1",
    "pi_1",
    {
      amount_cents: "12500",
      platform_fee_cents: "1875",
      teacher_net_cents: "10625",
      transfer_group: "booking_booking_1",
    },
    {
      checkoutSessionId: "cs_1",
      stripeChargeId: "ch_from_session",
      currency: "usd",
    },
  );

  assert.equal(calls.ledger.length, 1);
  assert.deepEqual(calls.ledger[0], {
    bookingId: "booking_1",
    teacherId: "teacher_1",
    studentId: "student_1",
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    stripeChargeId: "ch_from_session",
    amountCents: 12500,
    platformFeeCents: 1875,
    teacherNetCents: 10625,
    currency: "usd",
    transferGroup: "booking_booking_1",
    metadata: {
      amount_cents: "12500",
      platform_fee_cents: "1875",
      teacher_net_cents: "10625",
      transfer_group: "booking_booking_1",
      webhook_source: "checkout.session.completed",
    },
  });
});

async function run() {
  console.info = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;

  for (const { name, fn } of tests) {
    try {
      await fn();
      originalConsole.info(`[payments:test] ok - ${name}`);
    } catch (error) {
      originalConsole.error(`[payments:test] fail - ${name}`);
      originalConsole.error(error);
      process.exitCode = 1;
      break;
    }
  }

  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

function companionStage() {
  return {
    name: "Seed",
    nameEn: "Seed",
    nameEs: "Seed",
    emoji: "*",
    minLessons: 0,
    maxLessons: 999,
  };
}

void run();
