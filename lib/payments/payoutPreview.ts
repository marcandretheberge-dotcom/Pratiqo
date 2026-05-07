import { calculateBookingAmounts, type BookingPaymentType, type LoyaltyTier } from "@/lib/payments/commission";
import { localeToBcp47, type Locale } from "@/lib/i18n/types";

export type TeacherPayoutPreviewInput = {
  grossAmount: number | string | null | undefined;
  currency?: string | null;
  teacherPlan?: string | null;
  annualVolumeCents?: number | null;
  loyaltyTier?: string | null;
  bookingType?: BookingPaymentType;
  locale?: Locale | string | null;
};

export type TeacherPayoutPreview = {
  grossCents: number;
  commissionCents: number;
  teacherNetCents: number;
  feeRate: number;
  feePercent: number;
  formattedGross: string;
  formattedCommission: string;
  formattedTeacherNet: string;
  tier: LoyaltyTier;
  isPlanKnown: boolean;
  plan: string;
};

function amountToCents(amount: number | string | null | undefined): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

function formatCents(cents: number, currency: string, locale: Locale | string | null | undefined): string {
  return new Intl.NumberFormat(localeToBcp47(locale), {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function getTeacherPayoutPreview(input: TeacherPayoutPreviewInput): TeacherPayoutPreview {
  const grossCents = amountToCents(input.grossAmount);
  const currency = String(input.currency || "CAD").toUpperCase();
  const isPlanKnown = Boolean(input.teacherPlan && String(input.teacherPlan).trim());
  const plan = isPlanKnown ? String(input.teacherPlan).trim().toLowerCase() : "free";
  const amounts = calculateBookingAmounts({
    priceCents: grossCents,
    teacherPlan: plan,
    bookingType: input.bookingType ?? "individual",
    annualVolumeCents: input.annualVolumeCents ?? null,
    loyaltyTier: input.loyaltyTier ?? null,
  });

  return {
    grossCents: amounts.amountCents,
    commissionCents: amounts.platformFeeCents,
    teacherNetCents: amounts.teacherNetCents,
    feeRate: amounts.feeRate,
    feePercent: amounts.feeRate * 100,
    formattedGross: formatCents(amounts.amountCents, currency, input.locale),
    formattedCommission: formatCents(amounts.platformFeeCents, currency, input.locale),
    formattedTeacherNet: formatCents(amounts.teacherNetCents, currency, input.locale),
    tier: amounts.loyaltyTier,
    isPlanKnown,
    plan: amounts.teacherPlan,
  };
}
