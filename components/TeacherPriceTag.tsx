"use client";

/**
 * TeacherPriceTag — renders a teacher's price in their NATIVE currency, with
 * an optional faint approximation in the viewer's chosen display currency.
 *
 * The native currency is the source of truth for billing (Stripe charges in
 * that currency). The approximation is purely UX — a "≈ US$18/h" hint so a
 * US visitor browsing a Canadian teacher grasps the order of magnitude.
 *
 * Use this for marketplace surfaces (cards, profile headers, listing rows).
 * For Uruguay's bespoke dual-pricing strategy (UYU primary + USD secondary
 * in parentheses) keep using `<PriceDisplay />` — that flow is preserved
 * separately to avoid regressing the local-first messaging.
 */

import type { Currency } from "@/lib/geoLocale";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

type TeacherPriceTagProps = {
  /** Amount as stored — in `teacherCurrency`. */
  amount: number;
  /** Teacher's native currency. When omitted, viewer currency is used. */
  teacherCurrency?: Currency | null;
  /** Append "/h" suffix after the primary amount. */
  perHour?: boolean;
  /** Override the primary text colour/typography. */
  primaryClassName?: string;
  /** Override the approximation text colour/typography. */
  approxClassName?: string;
  /** Hide the approximation even when it would normally show. */
  hideApproximation?: boolean;
};

export function TeacherPriceTag({
  amount,
  teacherCurrency,
  perHour = false,
  primaryClassName = "font-bold text-teal-700",
  approxClassName = "text-[11px] font-normal text-slate-400",
  hideApproximation = false,
}: TeacherPriceTagProps) {
  const { formatTeacherPrice } = useLocale();
  const parts = formatTeacherPrice(amount, teacherCurrency ?? null);

  const showApprox = !hideApproximation && parts.approximation;

  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={primaryClassName}>
        {parts.primary}
        {perHour ? <span className="ml-0.5 text-slate-500 text-xs font-normal">/h</span> : null}
      </span>
      {showApprox ? (
        <span
          className={cn(approxClassName, "whitespace-nowrap")}
          title={parts.isApproximate ? "Approximate — billing happens in the teacher's currency" : undefined}
        >
          {parts.approximation}
        </span>
      ) : null}
    </span>
  );
}
