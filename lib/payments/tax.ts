import type Stripe from "stripe";
import { calculateBookingAmounts } from "@/lib/payments/commission";
import type { BookingPaymentTaxBehavior } from "@/lib/payments/types";

export type TaxMode = "stripe_tax_inclusive";

export type TaxStatus = "not_collected" | "pending" | "calculated" | "failed";

export type StripeCheckoutTaxBreakdownResult =
  | {
      ok: true;
      amountCents: number;
      subtotalCents: number;
      taxTotalCents: number;
      taxBehavior: "stripe_tax_inclusive";
      taxStatus: "calculated";
      taxSnapshot: Record<string, unknown>;
      gstCents: number;
      qstCents: number;
    }
  | {
      ok: false;
      reason: string;
      taxSnapshot: Record<string, unknown>;
    };

export type StripeBillingAddressCollection = "required" | "auto";

export type StripeTaxCheckoutParams = {
  enabled: boolean;
  automaticTax?: { enabled: true };
  billingAddressCollection?: StripeBillingAddressCollection;
  lineItemTaxBehavior?: "inclusive";
  taxCode?: string;
  metadata: Record<string, string>;
};

function parseEnvBool(value: string | undefined | null): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isSalesTaxEnabled(): boolean {
  return parseEnvBool(process.env.PRATIQO_COLLECT_SALES_TAX);
}

export function getTaxMode(): TaxMode | null {
  if (!isSalesTaxEnabled()) return null;
  const mode = String(process.env.PRATIQO_TAX_MODE ?? "stripe_tax_inclusive").trim();
  return mode === "stripe_tax_inclusive" ? "stripe_tax_inclusive" : null;
}

export function isStripeTaxInclusiveEnabled(): boolean {
  return getTaxMode() === "stripe_tax_inclusive";
}

export function buildStripeTaxCheckoutParams(): StripeTaxCheckoutParams {
  if (!isStripeTaxInclusiveEnabled()) {
    return {
      enabled: false,
      metadata: {
        tax_behavior: "not_collected",
        tax_status: "not_collected",
      },
    };
  }

  const taxCode = process.env.STRIPE_TAX_CODE_PRIVATE_LESSONS?.trim() || undefined;
  const billingPref = String(process.env.PRATIQO_TAX_BILLING_ADDRESS_COLLECTION ?? "required")
    .trim()
    .toLowerCase();
  const billingAddressCollection: StripeBillingAddressCollection =
    billingPref === "auto" ? "auto" : "required";

  return {
    enabled: true,
    automaticTax: { enabled: true },
    billingAddressCollection,
    lineItemTaxBehavior: "inclusive",
    taxCode,
    metadata: {
      tax_mode: "stripe_tax_inclusive",
      tax_behavior: "stripe_tax_inclusive",
      tax_status: "pending",
    },
  };
}

function safeCents(value: number | null | undefined): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? (value as number) : 0));
}

function taxRateLabel(rate: Stripe.TaxRate | string | null | undefined): string {
  if (!rate) return "";
  if (typeof rate === "string") return rate;
  return rate.display_name ?? rate.description ?? rate.id ?? "";
}

function sumTaxesByLabel(
  lineItems: Stripe.LineItem[] | undefined,
  matchers: Array<(label: string) => boolean>,
): number {
  if (!lineItems?.length) return 0;
  let total = 0;
  for (const item of lineItems) {
    for (const tax of item.taxes ?? []) {
      const label = taxRateLabel(tax.rate).toLowerCase();
      if (matchers.some((match) => match(label))) {
        total += safeCents(tax.amount);
      }
    }
  }
  return total;
}

export function parseStripeCheckoutTaxBreakdown(
  session: Stripe.Checkout.Session,
  lineItems?: Stripe.LineItem[] | null,
): StripeCheckoutTaxBreakdownResult {
  const amountCents = safeCents(session.amount_total);
  const subtotalFromSession = session.amount_subtotal;
  const taxFromDetails = session.total_details?.amount_tax;

  const taxSnapshot: Record<string, unknown> = {
    source: "checkout.session.completed",
    stripe_checkout_session_id: session.id,
    amount_total: amountCents,
    amount_subtotal: subtotalFromSession,
    amount_tax: taxFromDetails ?? null,
    total_details: session.total_details ?? null,
    automatic_tax: session.automatic_tax ?? null,
    customer_details: session.customer_details
      ? {
          address: session.customer_details.address ?? null,
          tax_exempt: session.customer_details.tax_exempt ?? null,
          tax_ids: session.customer_details.tax_ids ?? null,
        }
      : null,
    line_item_taxes: (lineItems ?? []).map((item) => ({
      id: item.id,
      amount_subtotal: item.amount_subtotal,
      amount_total: item.amount_total,
      taxes: (item.taxes ?? []).map((tax) => ({
        amount: tax.amount,
        rate: taxRateLabel(tax.rate),
        taxability_reason: tax.taxability_reason,
        taxable_amount: tax.taxable_amount,
      })),
    })),
  };

  if (amountCents <= 0) {
    return { ok: false, reason: "checkout session amount_total missing", taxSnapshot };
  }

  if (subtotalFromSession == null) {
    return { ok: false, reason: "checkout session amount_subtotal missing", taxSnapshot };
  }

  if (taxFromDetails == null) {
    return { ok: false, reason: "checkout session total_details.amount_tax missing", taxSnapshot };
  }

  const subtotalCents = safeCents(subtotalFromSession);
  const taxTotalCents = safeCents(taxFromDetails);

  if (subtotalCents <= 0) {
    return { ok: false, reason: "checkout session amount_subtotal invalid", taxSnapshot };
  }

  if (subtotalCents + taxTotalCents !== amountCents) {
    return {
      ok: false,
      reason: `tax breakdown mismatch: subtotal (${subtotalCents}) + tax (${taxTotalCents}) != total (${amountCents})`,
      taxSnapshot,
    };
  }

  const gstCents = sumTaxesByLabel(lineItems ?? undefined, [
    (label) => label.includes("gst") || label.includes("tps"),
  ]);
  const qstCents = sumTaxesByLabel(lineItems ?? undefined, [
    (label) => label.includes("qst") || label.includes("tvq"),
  ]);

  return {
    ok: true,
    amountCents,
    subtotalCents,
    taxTotalCents,
    taxBehavior: "stripe_tax_inclusive",
    taxStatus: "calculated",
    taxSnapshot,
    gstCents,
    qstCents,
  };
}

export function assertTaxReadyForFinalize(breakdown: StripeCheckoutTaxBreakdownResult): void {
  if (!breakdown.ok) {
    throw new Error(`Tax breakdown not ready: ${breakdown.reason}`);
  }
}

export function defaultTaxBehaviorForCheckout(): BookingPaymentTaxBehavior {
  return isStripeTaxInclusiveEnabled() ? "stripe_tax_inclusive" : "not_collected";
}

export function defaultTaxStatusForCheckout(): TaxStatus {
  return isStripeTaxInclusiveEnabled() ? "pending" : "not_collected";
}

export type StripeMetadataMap = Record<string, string>;

export function normalizeStripeMetadata(
  metadata: Stripe.Metadata | Stripe.MetadataParam | StripeMetadataMap | null | undefined,
): StripeMetadataMap {
  if (!metadata || typeof metadata !== "object") return {};
  const out: StripeMetadataMap = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

export function isStripeTaxInclusiveMetadata(
  metadata: Stripe.Metadata | Stripe.MetadataParam | StripeMetadataMap | null | undefined,
): boolean {
  const md = normalizeStripeMetadata(metadata);
  return md.tax_mode === "stripe_tax_inclusive" || md.tax_behavior === "stripe_tax_inclusive";
}

export function metadataIndicatesStripeTaxPending(metadata: StripeMetadataMap | null | undefined): boolean {
  if (!metadata) return false;
  return metadata.tax_mode === "stripe_tax_inclusive" || metadata.tax_status === "pending";
}

/** payment_intent.succeeded: defer ledger until checkout.session.completed (metadata-driven). */
export function shouldDeferPaymentIntentLedgerFinalizationFromMetadata(
  metadata: Stripe.Metadata | Stripe.MetadataParam | StripeMetadataMap | null | undefined,
): boolean {
  const md = normalizeStripeMetadata(metadata);
  return md.tax_mode === "stripe_tax_inclusive" || md.tax_status === "pending";
}

/** checkout.session.completed: expand Stripe Tax when session was created tax-inclusive. */
export function shouldFinalizeStripeTaxFromCheckoutSessionMetadata(
  metadata: Stripe.Metadata | Stripe.MetadataParam | StripeMetadataMap | null | undefined,
): boolean {
  const md = normalizeStripeMetadata(metadata);
  return md.tax_mode === "stripe_tax_inclusive";
}

export type LessonPaymentTaxMode = TaxMode | "not_collected";

export function resolveLessonPaymentTaxMode(input: {
  piMetadata?: Stripe.MetadataParam | StripeMetadataMap | null;
  checkoutSession?: Stripe.Checkout.Session | null;
  /** Checkout route only; webhooks should omit so rollback stays metadata-driven. */
  allowEnvFallback?: boolean;
}): LessonPaymentTaxMode {
  const sessionMd = input.checkoutSession
    ? normalizeStripeMetadata(input.checkoutSession.metadata)
    : {};
  const piMd = normalizeStripeMetadata(input.piMetadata);

  if (isStripeTaxInclusiveMetadata(sessionMd) || isStripeTaxInclusiveMetadata(piMd)) {
    return "stripe_tax_inclusive";
  }
  if (metadataIndicatesStripeTaxPending(sessionMd) || metadataIndicatesStripeTaxPending(piMd)) {
    return "stripe_tax_inclusive";
  }
  if (input.allowEnvFallback && isStripeTaxInclusiveEnabled()) {
    return "stripe_tax_inclusive";
  }
  return "not_collected";
}

/** Checkout metadata or env flag: defer ledger/receipt until webhook tax breakdown. */
export function shouldDeferLessonPaymentFinalization(
  metadata?: Stripe.MetadataParam | StripeMetadataMap | null,
): boolean {
  if (shouldDeferPaymentIntentLedgerFinalizationFromMetadata(metadata)) return true;
  if (isStripeTaxInclusiveEnabled()) return true;
  return false;
}

export function isCalculatedStripeTaxPayment(payment: {
  tax_behavior?: string | null;
  tax_status?: string | null;
}): boolean {
  return (
    String(payment.tax_behavior ?? "") === "stripe_tax_inclusive" &&
    String(payment.tax_status ?? "") === "calculated"
  );
}

/** Block receipt email/overwrite while Stripe Tax breakdown is pending or failed. */
export function canIssueLessonPaymentReceipt(payment: {
  tax_behavior?: string | null;
  tax_status?: string | null;
}): boolean {
  const behavior = String(payment.tax_behavior ?? "");
  if (behavior !== "stripe_tax_inclusive") return true;
  return isCalculatedStripeTaxPayment(payment);
}

export type PaymentTaxPayoutBlock = { blocked: true; reason: string } | { blocked: false };

/** Block Connect transfer until Stripe Tax is calculated on the payment row. */
export function paymentTaxBlocksPayout(payment: {
  tax_behavior?: string | null;
  tax_status?: string | null;
}): PaymentTaxPayoutBlock {
  if (String(payment.tax_behavior ?? "") !== "stripe_tax_inclusive") {
    return { blocked: false };
  }
  if (isCalculatedStripeTaxPayment(payment)) {
    return { blocked: false };
  }
  const status = String(payment.tax_status ?? "pending");
  if (status === "failed") {
    return {
      blocked: true,
      reason: "Stripe Tax breakdown failed — teacher payout blocked pending admin review",
    };
  }
  return {
    blocked: true,
    reason: "Stripe Tax breakdown pending — teacher payout blocked until checkout webhook finalizes tax",
  };
}

export type LessonPaymentLedgerFinalizeInput = {
  checkoutSession?: Stripe.Checkout.Session | null;
  lineItems?: Stripe.LineItem[] | null;
  piMetadata?: Record<string, string> | null;
  amountCentsFromStripe?: number | null;
  bookingPriceDollars?: number | string | null;
  teacherPlan?: string | null;
  loyaltyTier?: string | null;
  annualVolumeCents?: number | null;
  /** Default false — webhooks must finalize from Stripe metadata only. */
  allowEnvFallback?: boolean;
};

export type LessonPaymentLedgerFinalizeResult =
  | {
      ok: true;
      amountCents: number;
      subtotalCents: number;
      taxTotalCents: number;
      platformFeeCents: number;
      teacherNetCents: number;
      taxBehavior: BookingPaymentTaxBehavior;
      taxStatus: TaxStatus;
      taxSnapshot: Record<string, unknown>;
      gstCents: number;
      qstCents: number;
    }
  | {
      ok: false;
      reason: string;
      amountCents: number;
      subtotalCents: number;
      taxTotalCents: number;
      platformFeeCents: number;
      teacherNetCents: number;
      taxBehavior: BookingPaymentTaxBehavior;
      taxStatus: "failed";
      taxSnapshot: Record<string, unknown>;
      gstCents: number;
      qstCents: number;
    };

function resolveLegacyAmountCents(input: LessonPaymentLedgerFinalizeInput): number {
  const md = input.piMetadata ?? {};
  const fromStripe = input.amountCentsFromStripe;
  if (typeof fromStripe === "number" && Number.isFinite(fromStripe)) {
    return Math.max(0, Math.round(fromStripe));
  }
  const fromMetadata = Number(md.amount_cents ?? md.payment_amount_cents ?? NaN);
  if (Number.isFinite(fromMetadata)) return Math.max(0, Math.round(fromMetadata));
  const bookingPrice = Number(input.bookingPriceDollars ?? 0);
  if (Number.isFinite(bookingPrice) && bookingPrice > 0) return Math.round(bookingPrice * 100);
  return 0;
}

export function finalizeLessonPaymentLedger(
  input: LessonPaymentLedgerFinalizeInput,
): LessonPaymentLedgerFinalizeResult {
  const commissionInput = {
    teacherPlan: input.teacherPlan ?? "free",
    bookingType: "individual" as const,
    loyaltyTier: input.loyaltyTier ?? input.piMetadata?.loyalty_tier ?? null,
    annualVolumeCents: input.annualVolumeCents ?? null,
  };

  const taxMode = resolveLessonPaymentTaxMode({
    piMetadata: input.piMetadata,
    checkoutSession: input.checkoutSession,
    allowEnvFallback: input.allowEnvFallback ?? false,
  });

  if (taxMode === "stripe_tax_inclusive") {
    if (!input.checkoutSession) {
      const amountCents = resolveLegacyAmountCents(input);
      return {
        ok: false,
        reason: "checkout.session required for Stripe Tax finalization",
        amountCents,
        subtotalCents: amountCents,
        taxTotalCents: 0,
        platformFeeCents: 0,
        teacherNetCents: 0,
        taxBehavior: "stripe_tax_inclusive",
        taxStatus: "failed",
        taxSnapshot: { source: "webhook", error: "missing_checkout_session" },
        gstCents: 0,
        qstCents: 0,
      };
    }

    const breakdown = parseStripeCheckoutTaxBreakdown(input.checkoutSession, input.lineItems);
    if (!breakdown.ok) {
      console.error("[payments/tax] Stripe Tax breakdown incomplete:", breakdown.reason);
      const amountCents = safeCents(input.checkoutSession.amount_total ?? resolveLegacyAmountCents(input));
      return {
        ok: false,
        reason: breakdown.reason,
        amountCents,
        subtotalCents: amountCents,
        taxTotalCents: 0,
        platformFeeCents: 0,
        teacherNetCents: 0,
        taxBehavior: "stripe_tax_inclusive",
        taxStatus: "failed",
        taxSnapshot: breakdown.taxSnapshot,
        gstCents: 0,
        qstCents: 0,
      };
    }

    const amounts = calculateBookingAmounts({
      subtotalCents: breakdown.subtotalCents,
      taxTotalCents: breakdown.taxTotalCents,
      ...commissionInput,
    });

    return {
      ok: true,
      amountCents: breakdown.amountCents,
      subtotalCents: breakdown.subtotalCents,
      taxTotalCents: breakdown.taxTotalCents,
      platformFeeCents: amounts.platformFeeCents,
      teacherNetCents: amounts.teacherNetCents,
      taxBehavior: breakdown.taxBehavior,
      taxStatus: breakdown.taxStatus,
      taxSnapshot: breakdown.taxSnapshot,
      gstCents: breakdown.gstCents,
      qstCents: breakdown.qstCents,
    };
  }

  const amountCents = resolveLegacyAmountCents(input);
  const taxTotalCents = 0;
  const subtotalFromMetadata = Number(input.piMetadata?.subtotal_cents ?? NaN);
  const subtotalCents = Number.isFinite(subtotalFromMetadata)
    ? Math.max(0, Math.round(subtotalFromMetadata))
    : amountCents;

  const platformFeeFromMetadata = Number(input.piMetadata?.platform_fee_cents ?? NaN);
  const teacherNetFromMetadata = Number(input.piMetadata?.teacher_net_cents ?? NaN);
  let platformFeeCents: number;
  let teacherNetCents: number;

  if (Number.isFinite(platformFeeFromMetadata) && Number.isFinite(teacherNetFromMetadata)) {
    platformFeeCents = Math.max(0, Math.round(platformFeeFromMetadata));
    teacherNetCents = Math.max(0, Math.round(teacherNetFromMetadata));
  } else {
    const amounts = calculateBookingAmounts({
      subtotalCents,
      taxTotalCents,
      ...commissionInput,
    });
    platformFeeCents = amounts.platformFeeCents;
    teacherNetCents = amounts.teacherNetCents;
  }

  return {
    ok: true,
    amountCents,
    subtotalCents,
    taxTotalCents,
    platformFeeCents,
    teacherNetCents,
    taxBehavior: "not_collected",
    taxStatus: "not_collected",
    taxSnapshot: {
      tax_behavior: "not_collected",
      tax_status: "not_collected",
      amount_cents: amountCents,
      subtotal_cents: subtotalCents,
    },
    gstCents: 0,
    qstCents: 0,
  };
}
