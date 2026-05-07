import {
  calculateBookingAmounts,
  getPlatformFeeRate as getPlatformFeeRateFromInput,
  normalizeTeacherPaymentPlan,
  type BookingPaymentType,
  type TeacherPaymentPlan,
} from "@/lib/payments/commission";

export type TeacherPlanForPayments = TeacherPaymentPlan;
export type BookingPaymentKind = BookingPaymentType;

export type BookingPaymentAmounts = {
  amountCents: number;
  platformFeeCents: number;
  teacherNetCents: number;
  commissionRate: number;
};

export { normalizeTeacherPaymentPlan };

export function getPlatformFeeRate(
  plan: string | null | undefined,
  kind: BookingPaymentKind = "individual",
): number {
  return getPlatformFeeRateFromInput({ teacherPlan: plan, bookingType: kind });
}

export function dollarsToCents(value: number | string | null | undefined): number {
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function calculateBookingPaymentAmounts(
  amountCents: number,
  plan: string | null | undefined,
  kind: BookingPaymentKind = "individual",
): BookingPaymentAmounts {
  const amounts = calculateBookingAmounts({
    priceCents: amountCents,
    teacherPlan: plan,
    bookingType: kind,
  });
  return {
    amountCents: amounts.amountCents,
    platformFeeCents: amounts.platformFeeCents,
    teacherNetCents: amounts.teacherNetCents,
    commissionRate: amounts.feeRate,
  };
}

export function transferGroupForBooking(bookingId: string): string {
  return `booking_${bookingId}`;
}
