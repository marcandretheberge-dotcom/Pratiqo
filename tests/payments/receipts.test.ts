import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildLessonReceiptTaxSnapshot,
  generateLessonReceiptNumber,
  issueLessonPaymentReceipt,
} from "@/lib/payments/receipts";
import { buildLessonPaymentReceiptEmail } from "@/lib/email/templates/booking";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

type Row = Record<string, unknown>;

class FakeAdmin {
  payments = new Map<string, Row>();
  bookings = new Map<string, Row>();
  teachers = new Map<string, Row>();
  profiles = new Map<string, Row>();

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

class FakeQuery {
  private filters: Array<{ column: string; value: unknown; op: "eq" | "is" }> = [];
  private operation: "select" | "update" = "select";
  private patch: Row = {};

  constructor(
    private readonly admin: FakeAdmin,
    private readonly table: string,
  ) {}

  select(_fields: string) {
    void _fields;
    return this;
  }

  update(patch: Row) {
    this.operation = "update";
    this.patch = patch;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, op: "eq" });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, value, op: "is" });
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.runMaybeSingle());
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run() {
    if (this.operation === "update") return this.runUpdate();
    return { data: [], error: null };
  }

  private runMaybeSingle() {
    if (this.operation === "update") return this.runUpdate();
    return { data: this.findRow(), error: null };
  }

  private runUpdate() {
    const row = this.findRow();
    if (row) Object.assign(row, this.patch);
    return { data: row, error: null };
  }

  private findRow(): Row | null {
    const rows =
      this.table === "booking_payments"
        ? this.admin.payments
        : this.table === "bookings"
          ? this.admin.bookings
          : this.table === "teachers"
            ? this.admin.teachers
            : this.table === "profiles"
              ? this.admin.profiles
              : new Map<string, Row>();

    for (const row of rows.values()) {
      if (
        this.filters.every((filter) => {
          if (filter.op === "is") return (row[filter.column] ?? null) === filter.value;
          return row[filter.column] === filter.value;
        })
      ) {
        return row;
      }
    }
    return null;
  }
}

test("generateLessonReceiptNumber is stable for a payment id and year", () => {
  assert.equal(
    generateLessonReceiptNumber("2d9316b7-b916-4ceb-a916-8122e0c4f548", "2026-05-18T10:00:00.000Z"),
    "PRQ-2026-2D9316B7B916",
  );
});

test("buildLessonReceiptTaxSnapshot records not_collected with zero tax", () => {
  const snapshot = buildLessonReceiptTaxSnapshot("2026-05-18T10:00:00.000Z");
  assert.equal(snapshot.tax_behavior, "not_collected");
  assert.equal(snapshot.tax_total_cents, 0);
  assert.equal(snapshot.gst_cents, 0);
  assert.equal(snapshot.qst_cents, 0);
  assert.equal(snapshot.sales_tax_collected, false);
});

test("issueLessonPaymentReceipt persists Stripe receipt URL and is idempotent", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_1", {
    id: "2d9316b7-b916-4ceb-a916-8122e0c4f548",
    booking_id: "bk_1",
    teacher_id: "teacher_1",
    student_id: "student_1",
    amount_cents: 7500,
    currency: "cad",
    payment_status: "paid",
    paid_at: "2026-05-18T10:00:00.000Z",
    stripe_charge_id: "ch_1",
    stripe_receipt_url: null,
    receipt_number: null,
    receipt_issued_at: null,
    receipt_email_sent_at: null,
  });
  admin.bookings.set("bk_1", {
    id: "bk_1",
    teacher_id: "teacher_1",
    student_id: "student_1",
    slot_date: "2026-05-20",
    time_slot: "18:00",
    date: null,
    time: null,
    duration_minutes: 60,
    teaching_mode: "online",
  });
  admin.teachers.set("teacher_1", {
    id: "teacher_1",
    name: "Ada",
    discipline: "Piano",
  });
  admin.profiles.set("student_1", {
    id: "student_1",
    name: "Sam",
    email: "sam@example.com",
    country_code: "CA",
    region: "QC",
  });

  let resolverCalls = 0;
  const first = await issueLessonPaymentReceipt(admin as unknown as SupabaseClient, {
    bookingId: "bk_1",
    sendEmail: false,
    stripeReceiptResolver: async () => {
      resolverCalls += 1;
      return {
        receiptUrl: "https://pay.stripe.com/receipts/test",
        invoiceUrl: null,
        receiptAvailableAt: "2026-05-18T10:01:00.000Z",
      };
    },
  });

  const row = admin.payments.get("bk_1")!;
  assert.equal(first.ok, true);
  assert.equal(row.stripe_receipt_url, "https://pay.stripe.com/receipts/test");
  assert.equal(row.receipt_number, "PRQ-2026-2D9316B7B916");
  assert.equal(row.tax_behavior, "not_collected");
  assert.equal(row.tax_total_cents, 0);
  assert.equal(row.gst_cents, 0);
  assert.equal(row.qst_cents, 0);
  assert.equal(row.buyer_country_code, "CA");
  assert.equal(row.buyer_region, "QC");
  assert.equal(resolverCalls, 1);

  const second = await issueLessonPaymentReceipt(admin as unknown as SupabaseClient, {
    bookingId: "bk_1",
    sendEmail: false,
    stripeReceiptResolver: async () => {
      resolverCalls += 1;
      throw new Error("should not fetch again");
    },
  });

  assert.equal(second.ok, true);
  assert.equal(admin.payments.get("bk_1")!.receipt_number, "PRQ-2026-2D9316B7B916");
  assert.equal(resolverCalls, 1);
});

test("tax-inclusive receipt preserves calculated tax fields and email shows breakdown", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_tax", {
    id: "pay_tax_1",
    booking_id: "bk_tax",
    teacher_id: "teacher_1",
    student_id: "student_1",
    amount_cents: 2300,
    subtotal_cents: 2000,
    currency: "cad",
    payment_status: "paid",
    paid_at: "2026-05-18T10:00:00.000Z",
    stripe_charge_id: "ch_tax",
    stripe_receipt_url: "https://pay.stripe.com/receipts/tax",
    receipt_number: "PRQ-2026-TAX",
    receipt_issued_at: "2026-05-18T10:00:00.000Z",
    receipt_email_sent_at: null,
    tax_behavior: "stripe_tax_inclusive",
    tax_status: "calculated",
    tax_total_cents: 300,
    gst_cents: 100,
    qst_cents: 200,
    tax_snapshot: { source: "checkout.session.completed", amount_tax: 300 },
  });
  admin.bookings.set("bk_tax", {
    id: "bk_tax",
    teacher_id: "teacher_1",
    student_id: "student_1",
    slot_date: "2026-05-20",
    time_slot: "18:00",
    duration_minutes: 60,
    teaching_mode: "online",
  });
  admin.teachers.set("teacher_1", { id: "teacher_1", name: "Ada", discipline: "Piano" });
  admin.profiles.set("student_1", {
    id: "student_1",
    name: "Sam",
    email: "sam@example.com",
    country_code: "CA",
    region: "QC",
  });

  const result = await issueLessonPaymentReceipt(admin as unknown as SupabaseClient, {
    bookingId: "bk_tax",
    sendEmail: false,
  });

  const row = admin.payments.get("bk_tax")!;
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.taxBehavior, "stripe_tax_inclusive");
  assert.equal(row.tax_behavior, "stripe_tax_inclusive");
  assert.equal(row.tax_status, "calculated");
  assert.equal(row.tax_total_cents, 300);
  assert.equal(row.gst_cents, 100);
  assert.equal(row.qst_cents, 200);
  assert.equal((row.tax_snapshot as { amount_tax?: number }).amount_tax, 300);

  const email = buildLessonPaymentReceiptEmail({
    email: "sam@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-TAX",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano",
    teacherName: "Ada",
    amountPaid: "$23.00",
    currency: "CAD",
    locale: "en",
    taxBehavior: "stripe_tax_inclusive",
    subtotalBeforeTax: "$20.00",
    gstAmount: "$1.00",
    qstAmount: "$2.00",
    taxTotalAmount: "$3.00",
  });
  assert.match(email.html, /Subtotal before tax/);
  assert.match(email.html, /Tax included/);
  assert.doesNotMatch(email.html, /Sales tax not collected/);
});

test("tax-inclusive receipt is skipped while tax_status is pending", async () => {
  const admin = new FakeAdmin();
  admin.payments.set("bk_pending", {
    id: "pay_pending",
    booking_id: "bk_pending",
    teacher_id: "teacher_1",
    student_id: "student_1",
    amount_cents: 2300,
    currency: "cad",
    payment_status: "paid",
    paid_at: "2026-05-18T10:00:00.000Z",
    tax_behavior: "stripe_tax_inclusive",
    tax_status: "pending",
    tax_total_cents: 0,
  });
  admin.bookings.set("bk_pending", {
    id: "bk_pending",
    teacher_id: "teacher_1",
    student_id: "student_1",
    slot_date: "2026-05-20",
    time_slot: "18:00",
    duration_minutes: 60,
    teaching_mode: "online",
  });
  admin.teachers.set("teacher_1", { id: "teacher_1", name: "Ada", discipline: "Piano" });
  admin.profiles.set("student_1", { id: "student_1", name: "Sam", email: "sam@example.com" });

  const result = await issueLessonPaymentReceipt(admin as unknown as SupabaseClient, {
    bookingId: "bk_pending",
    sendEmail: false,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "tax_not_calculated");
});

test("receipt emails include localized no-tax-collected disclaimer", () => {
  const base = {
    email: "student@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-ABC",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano · 60 min",
    teacherName: "Ada",
    amountPaid: "$75.00",
    currency: "CAD",
    stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
  };

  assert.match(buildLessonPaymentReceiptEmail({ ...base, locale: "fr" }).html, /Taxes de vente non perçues/);
  assert.match(buildLessonPaymentReceiptEmail({ ...base, locale: "en" }).html, /Sales tax not collected/);
  assert.match(buildLessonPaymentReceiptEmail({ ...base, locale: "es" }).html, /Impuestos sobre ventas no cobrados/);
});

test("receipt email footer includes localized 'service provided by' marketplace line", () => {
  const base = {
    email: "student@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-ABC",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano · 60 min",
    teacherName: "Ada Lovelace",
    amountPaid: "$75.00",
    currency: "CAD",
    stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
  };

  assert.match(
    buildLessonPaymentReceiptEmail({ ...base, locale: "fr" }).html,
    /Service fourni par Ada Lovelace, paiement traité par Cours Pratiqo Inc\./,
  );
  assert.match(
    buildLessonPaymentReceiptEmail({ ...base, locale: "en" }).html,
    /Service provided by Ada Lovelace, payment processed by Cours Pratiqo Inc\./,
  );
  assert.match(
    buildLessonPaymentReceiptEmail({ ...base, locale: "es" }).html,
    /Servicio prestado por Ada Lovelace, pago procesado por Cours Pratiqo Inc\./,
  );
});

test("receipt email falls back to /student/payments CTA when Stripe receipt URL is missing", () => {
  const base = {
    email: "student@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-ABC",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano · 60 min",
    teacherName: "Ada",
    amountPaid: "$75.00",
    currency: "CAD",
  };

  // When Stripe has a hosted receipt URL, the CTA goes to Stripe and the
  // fallback CTA / fallback URL must NOT appear.
  const withStripe = buildLessonPaymentReceiptEmail({
    ...base,
    stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
    locale: "en",
  });
  assert.match(withStripe.html, /https:\/\/pay\.stripe\.com\/receipts\/test/);
  assert.match(withStripe.html, /Open Stripe receipt/);
  assert.doesNotMatch(withStripe.html, /View my payments and receipts/);

  // When there is no Stripe receipt URL yet, the email must still have a CTA
  // pointing to the in-app vault so it's never dead-end.
  const withoutStripe = buildLessonPaymentReceiptEmail({
    ...base,
    stripeReceiptUrl: null,
    locale: "en",
  });
  assert.match(withoutStripe.html, /\/student\/payments/);
  assert.match(withoutStripe.html, /View my payments and receipts/);

  // Same fallback works in FR + ES.
  assert.match(
    buildLessonPaymentReceiptEmail({ ...base, stripeReceiptUrl: null, locale: "fr" }).html,
    /Voir mes paiements et reçus/,
  );
  assert.match(
    buildLessonPaymentReceiptEmail({ ...base, stripeReceiptUrl: null, locale: "es" }).html,
    /Ver mis pagos y recibos/,
  );
});

// Pratiqo issues a "payment receipt", never a "tax receipt". This guard
// blocks any future copy edit that would imply tax-deductibility, Revenu
// Québec recognition, or fiscal receipt status — none of which apply to a
// regular non-incorporated student/parent paying for music lessons today.
test("receipt email never claims to be a tax receipt or deductible", () => {
  const base = {
    email: "student@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-ABC",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano · 60 min",
    teacherName: "Ada",
    amountPaid: "$75.00",
    currency: "CAD",
  };

  const FORBIDDEN_FRAGMENTS = [
    /tax receipt/i,
    /reçu fiscal/i,
    /recibo fiscal/i,
    /\bdeductible\b/i,
    /\bdéductible\b/i,
    /\bdeducible\b/i,
    /Revenu Québec/i,
    /\$1 review/i,
  ];

  for (const locale of ["fr", "en", "es"] as const) {
    for (const stripeReceiptUrl of [
      "https://pay.stripe.com/receipts/test",
      null,
    ] as const) {
      const html = buildLessonPaymentReceiptEmail({
        ...base,
        stripeReceiptUrl,
        locale,
      }).html;
      for (const pattern of FORBIDDEN_FRAGMENTS) {
        assert.doesNotMatch(
          html,
          pattern,
          `receipt email [${locale}, stripeUrl=${String(Boolean(stripeReceiptUrl))}] must not contain ${pattern}`,
        );
      }
    }
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[payments:receipts] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
