import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { sendLessonPaymentReceipt } from "@/lib/email";
import { resolveEmailLocaleForUser, type EmailLocale } from "@/lib/email/locale";
import { formatEmailLessonScheduleLabels } from "@/lib/email/formatSchedule";
import { formatCurrencyCents, formatDate } from "@/lib/formatters";
import { localeToBcp47 } from "@/lib/i18n/types";
import { canIssueLessonPaymentReceipt, isCalculatedStripeTaxPayment } from "@/lib/payments/tax";
import type { BookingPaymentTaxBehavior } from "@/lib/payments/types";

type JsonRecord = Record<string, unknown>;

export type LessonReceiptTaxBehavior = BookingPaymentTaxBehavior;

export type LessonPaymentReceiptResult =
  | {
      ok: true;
      receiptNumber: string;
      stripeReceiptUrl: string | null;
      emailSent: boolean;
      taxBehavior: LessonReceiptTaxBehavior;
    }
  | {
      ok: false;
      reason: "payment_not_found" | "payment_not_paid" | "booking_not_found" | "tax_not_calculated";
    };

type StripeReceiptInfo = {
  receiptUrl: string | null;
  invoiceUrl: string | null;
  receiptAvailableAt: string | null;
};

export type StripeReceiptResolver = (chargeId: string) => Promise<StripeReceiptInfo>;

type BookingPaymentReceiptRow = {
  id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  amount_cents: number | null;
  currency: string | null;
  payment_status: string | null;
  paid_at: string | null;
  stripe_charge_id: string | null;
  stripe_receipt_url?: string | null;
  stripe_invoice_url?: string | null;
  receipt_available_at?: string | null;
  receipt_number?: string | null;
  receipt_issued_at?: string | null;
  receipt_email_sent_at?: string | null;
  tax_behavior?: string | null;
  tax_status?: string | null;
  subtotal_cents?: number | null;
  tax_total_cents?: number | null;
  gst_cents?: number | null;
  qst_cents?: number | null;
  buyer_country_code?: string | null;
  buyer_region?: string | null;
  tax_snapshot?: JsonRecord | null;
};

type BookingReceiptRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  date: string | null;
  time: string | null;
  slot_date: string | null;
  time_slot: string | null;
  duration_minutes: number | string | null;
  teaching_mode: string | null;
};

type TeacherReceiptRow = {
  name?: string | null;
  discipline?: string | null;
};

type StudentReceiptProfile = {
  name?: string | null;
  email?: string | null;
  country_code?: string | null;
  region?: string | null;
};

function invoiceUrlFromCharge(charge: Stripe.Charge): string | null {
  const invoice = (charge as unknown as { invoice?: string | Stripe.Invoice | null }).invoice;
  if (invoice && typeof invoice === "object") {
    return (invoice as Stripe.Invoice).hosted_invoice_url ?? null;
  }
  return null;
}

export async function retrieveStripeChargeReceipt(chargeId: string): Promise<StripeReceiptInfo> {
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["invoice"] });
  return {
    receiptUrl: charge.receipt_url ?? null,
    invoiceUrl: invoiceUrlFromCharge(charge),
    receiptAvailableAt:
      typeof charge.created === "number"
        ? new Date(charge.created * 1000).toISOString()
        : new Date().toISOString(),
  };
}

export function generateLessonReceiptNumber(paymentId: string, issuedAt: string | Date): string {
  const date = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
  const year = Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear();
  const suffix = paymentId.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
  return `PRQ-${year}-${suffix || "LESSON"}`;
}

export function buildLessonReceiptTaxSnapshot(issuedAt: string): JsonRecord {
  return {
    tax_behavior: "not_collected",
    tax_status: "not_collected",
    tax_total_cents: 0,
    gst_cents: 0,
    qst_cents: 0,
    sales_tax_collected: false,
    issued_at: issuedAt,
    note: "Sales tax not collected at this time.",
  };
}

function mergeReceiptIssuedIntoTaxSnapshot(
  existing: JsonRecord | null | undefined,
  issuedAt: string,
): JsonRecord {
  return {
    ...(existing ?? {}),
    receipt_issued_at: issuedAt,
  };
}

function lessonDescription(booking: BookingReceiptRow, teacher: TeacherReceiptRow | null, locale: EmailLocale): string {
  const schedule = formatEmailLessonScheduleLabels(
    {
      slot_date: booking.slot_date,
      date: booking.date,
      time_slot: booking.time_slot,
      time: booking.time,
    },
    locale,
  );
  const discipline = teacher?.discipline?.trim() || "Private lesson";
  const duration = Number(booking.duration_minutes ?? 60);
  const parts = [
    discipline,
    Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)} min` : null,
    schedule.dateLabel,
    schedule.timeLabel,
  ].filter(Boolean);
  return parts.join(" · ");
}

function shouldSet<T>(existing: T | null | undefined, next: T | null | undefined): next is T {
  return (existing === null || typeof existing === "undefined" || existing === "") && next !== null && typeof next !== "undefined";
}

export async function issueLessonPaymentReceipt(
  admin: SupabaseClient,
  params: {
    bookingId: string;
    stripeChargeId?: string | null;
    sendEmail?: boolean;
    stripeReceiptResolver?: StripeReceiptResolver;
  },
): Promise<LessonPaymentReceiptResult> {
  const { data: paymentData, error: paymentErr } = await admin
    .from("booking_payments")
    .select(
      "id, booking_id, teacher_id, student_id, amount_cents, subtotal_cents, currency, payment_status, paid_at, stripe_charge_id, stripe_receipt_url, stripe_invoice_url, receipt_available_at, receipt_number, receipt_issued_at, receipt_email_sent_at, tax_behavior, tax_status, tax_total_cents, gst_cents, qst_cents, buyer_country_code, buyer_region, tax_snapshot",
    )
    .eq("booking_id", params.bookingId)
    .maybeSingle();

  if (paymentErr) {
    throw new Error(`Failed to fetch booking payment for receipt: ${paymentErr.message}`);
  }

  const payment = paymentData as BookingPaymentReceiptRow | null;
  if (!payment) return { ok: false, reason: "payment_not_found" };
  if (payment.payment_status !== "paid") return { ok: false, reason: "payment_not_paid" };
  if (!canIssueLessonPaymentReceipt(payment)) {
    return { ok: false, reason: "tax_not_calculated" };
  }

  const taxBehavior: LessonReceiptTaxBehavior = isCalculatedStripeTaxPayment(payment)
    ? "stripe_tax_inclusive"
    : "not_collected";

  const [{ data: bookingData, error: bookingErr }, { data: teacherData }, { data: studentData }] = await Promise.all([
    admin
      .from("bookings")
      .select("id, teacher_id, student_id, date, time, slot_date, time_slot, duration_minutes, teaching_mode")
      .eq("id", params.bookingId)
      .maybeSingle(),
    admin.from("teachers").select("name, discipline").eq("id", payment.teacher_id).maybeSingle(),
    admin.from("profiles").select("name, email, country_code, region").eq("id", payment.student_id).maybeSingle(),
  ]);

  if (bookingErr) {
    throw new Error(`Failed to fetch booking for receipt: ${bookingErr.message}`);
  }

  const booking = bookingData as BookingReceiptRow | null;
  if (!booking) return { ok: false, reason: "booking_not_found" };

  const teacher = teacherData as TeacherReceiptRow | null;
  const student = studentData as StudentReceiptProfile | null;
  const now = new Date().toISOString();
  const issuedAt = payment.receipt_issued_at ?? payment.paid_at ?? now;
  const receiptNumber = payment.receipt_number ?? generateLessonReceiptNumber(payment.id, issuedAt);
  const chargeId = params.stripeChargeId ?? payment.stripe_charge_id ?? null;
  let stripeInfo: StripeReceiptInfo = {
    receiptUrl: payment.stripe_receipt_url ?? null,
    invoiceUrl: payment.stripe_invoice_url ?? null,
    receiptAvailableAt: payment.receipt_available_at ?? null,
  };

  if (chargeId && (!stripeInfo.receiptUrl || !stripeInfo.receiptAvailableAt)) {
    try {
      stripeInfo = await (params.stripeReceiptResolver ?? retrieveStripeChargeReceipt)(chargeId);
    } catch (error) {
      console.warn("[payments/receipts] Stripe receipt lookup failed", {
        bookingId: params.bookingId,
        chargeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const update: Record<string, unknown> = {
    updated_at: now,
  };

  if (isCalculatedStripeTaxPayment(payment)) {
    update.tax_snapshot = mergeReceiptIssuedIntoTaxSnapshot(payment.tax_snapshot, issuedAt);
  } else {
    update.tax_behavior = "not_collected";
    update.tax_status = "not_collected";
    update.tax_total_cents = 0;
    update.gst_cents = 0;
    update.qst_cents = 0;
    update.tax_snapshot = buildLessonReceiptTaxSnapshot(issuedAt);
  }

  if (shouldSet(payment.receipt_number, receiptNumber)) update.receipt_number = receiptNumber;
  if (shouldSet(payment.receipt_issued_at, issuedAt)) update.receipt_issued_at = issuedAt;
  if (shouldSet(payment.stripe_receipt_url, stripeInfo.receiptUrl)) update.stripe_receipt_url = stripeInfo.receiptUrl;
  if (shouldSet(payment.stripe_invoice_url, stripeInfo.invoiceUrl)) update.stripe_invoice_url = stripeInfo.invoiceUrl;
  if (shouldSet(payment.receipt_available_at, stripeInfo.receiptAvailableAt)) {
    update.receipt_available_at = stripeInfo.receiptAvailableAt;
  }
  if (shouldSet(payment.buyer_country_code, student?.country_code ?? null)) {
    update.buyer_country_code = String(student?.country_code).toUpperCase();
  }
  if (shouldSet(payment.buyer_region, student?.region ?? null)) {
    update.buyer_region = student?.region ?? null;
  }

  const { error: updateErr } = await admin
    .from("booking_payments")
    .update(update)
    .eq("booking_id", params.bookingId);

  if (updateErr) {
    throw new Error(`Failed to update booking receipt fields: ${updateErr.message}`);
  }

  let emailSent = false;
  if (params.sendEmail !== false && student?.email && !payment.receipt_email_sent_at) {
    const locale = await resolveEmailLocaleForUser(admin, payment.student_id);
    const bcp47 = localeToBcp47(locale);
    const currency = (payment.currency ?? "cad").toUpperCase();
    const amountCents = Number(payment.amount_cents ?? 0);
    emailSent = await sendLessonPaymentReceipt({
      email: student.email,
      studentName: student.name?.trim() || "Student",
      receiptNumber,
      paymentDate: formatDate(payment.paid_at ?? issuedAt, bcp47),
      lessonDescription: lessonDescription(booking, teacher, locale),
      teacherName: teacher?.name?.trim() || "Teacher",
      amountPaid: formatCurrencyCents(amountCents, currency, bcp47),
      currency: payment.currency ?? "cad",
      stripeReceiptUrl: stripeInfo.receiptUrl,
      locale,
      taxBehavior,
      ...(taxBehavior === "stripe_tax_inclusive"
        ? {
            subtotalBeforeTax: formatCurrencyCents(
              Number(payment.subtotal_cents ?? amountCents),
              currency,
              bcp47,
            ),
            gstAmount: formatCurrencyCents(Number(payment.gst_cents ?? 0), currency, bcp47),
            qstAmount: formatCurrencyCents(Number(payment.qst_cents ?? 0), currency, bcp47),
            taxTotalAmount: formatCurrencyCents(Number(payment.tax_total_cents ?? 0), currency, bcp47),
          }
        : {}),
    });

    if (emailSent) {
      const { error: emailMarkErr } = await admin
        .from("booking_payments")
        .update({ receipt_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("booking_id", params.bookingId)
        .is("receipt_email_sent_at", null);
      if (emailMarkErr) {
        console.warn("[payments/receipts] receipt email sent but marker update failed", emailMarkErr.message);
      }
    }
  }

  return {
    ok: true,
    receiptNumber,
    stripeReceiptUrl: stripeInfo.receiptUrl ?? null,
    emailSent,
    taxBehavior,
  };
}
