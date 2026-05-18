import { z } from "zod";

export const paymentProviderSchema = z.literal("stripe");
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const bookingPaymentStatusSchema = z.enum([
  "unpaid",
  "requires_action",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
  "disputed",
]);
export type BookingPaymentStatus = z.infer<typeof bookingPaymentStatusSchema>;

export const bookingTransferStatusSchema = z.enum([
  "not_ready",
  "ready",
  "transferred",
  "failed",
  "reversed",
  "not_required",
]);
export type BookingTransferStatus = z.infer<typeof bookingTransferStatusSchema>;

export const bookingPaymentRefundStatusSchema = z.enum([
  "not_required",
  "pending",
  "pending_review",
  "refunded",
  "partially_refunded",
  "failed",
  "rejected",
]);
export type BookingPaymentRefundStatus = z.infer<typeof bookingPaymentRefundStatusSchema>;

export const bookingPaymentTaxBehaviorSchema = z.literal("not_collected");
export type BookingPaymentTaxBehavior = z.infer<typeof bookingPaymentTaxBehaviorSchema>;

export const bookingPaymentRowSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  teacher_id: z.string().min(1),
  student_id: z.string().uuid(),
  provider: paymentProviderSchema.default("stripe"),
  stripe_checkout_session_id: z.string().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_charge_id: z.string().nullable(),
  stripe_transfer_id: z.string().nullable(),
  stripe_refund_id: z.string().nullable(),
  stripe_transfer_reversal_id: z.string().nullable(),
  transfer_group: z.string().nullable(),
  amount_cents: z.number().int().nonnegative(),
  subtotal_cents: z.number().int().nonnegative().default(0),
  platform_fee_cents: z.number().int().nonnegative(),
  teacher_net_cents: z.number().int().nonnegative(),
  refunded_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  payment_status: bookingPaymentStatusSchema,
  transfer_status: bookingTransferStatusSchema,
  refund_status: bookingPaymentRefundStatusSchema,
  paid_at: z.string().nullable(),
  ready_for_transfer_at: z.string().nullable(),
  transfer_created_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  failed_at: z.string().nullable(),
  failure_reason: z.string().nullable(),
  stripe_receipt_url: z.string().nullable().optional(),
  stripe_invoice_url: z.string().nullable().optional(),
  receipt_available_at: z.string().nullable().optional(),
  receipt_number: z.string().nullable().optional(),
  receipt_issued_at: z.string().nullable().optional(),
  receipt_email_sent_at: z.string().nullable().optional(),
  tax_behavior: bookingPaymentTaxBehaviorSchema.default("not_collected"),
  tax_total_cents: z.number().int().nonnegative().default(0),
  gst_cents: z.number().int().nonnegative().default(0),
  qst_cents: z.number().int().nonnegative().default(0),
  buyer_country_code: z.string().nullable().optional(),
  buyer_region: z.string().nullable().optional(),
  tax_snapshot: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BookingPaymentRow = z.infer<typeof bookingPaymentRowSchema>;

export const teacherConnectStatusSchema = z.object({
  stripe_account_id: z.string().nullable().optional(),
  stripe_connect_onboarding_complete: z.boolean().default(false),
  stripe_connect_charges_enabled: z.boolean().default(false),
  stripe_connect_payouts_enabled: z.boolean().default(false),
  stripe_connect_requirements_due: z.array(z.string()).default([]),
  stripe_connect_disabled_reason: z.string().nullable().optional(),
  stripe_connect_last_synced_at: z.string().nullable().optional(),
});
export type TeacherConnectStatus = z.infer<typeof teacherConnectStatusSchema>;
