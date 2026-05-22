"use client";

import { useLocale } from "@/lib/locale-context";
import type { Currency } from "@/lib/geoLocale";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  amount?: number;
  amountCents?: number;
  /** Legacy prop kept so older callers do not break; interpreted as CAD/main launch currency. */
  priceUSD?: number;
  sourceCurrency?: Currency | string | null;
  perHour?: boolean;
  primaryClassName?: string;
  secondaryClassName?: string;
  showOriginal?: boolean;
  className?: string;
}

export function PriceDisplay({
  amount,
  amountCents,
  priceUSD,
  sourceCurrency = "CAD",
  perHour = false,
  primaryClassName = "font-bold text-teal-700",
  secondaryClassName = "text-[10px] font-semibold text-slate-500",
  showOriginal = true,
  className,
}: PriceDisplayProps) {
  const { t, formatDisplayPrice } = useLocale();
  const value =
    typeof amountCents === "number"
      ? amountCents / 100
      : typeof amount === "number"
        ? amount
        : Number(priceUSD ?? 0);

  const display = formatDisplayPrice(value, sourceCurrency);
  const primary = display.approximate
    ? t("priceApproximate").replace("{price}", display.primary)
    : display.primary;
  const original = t("priceOriginal").replace("{price}", display.original);

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5", className)}>
      <span className={primaryClassName}>{primary}</span>
      {perHour ? <span className="text-xs font-normal text-slate-500">/h</span> : null}
      {showOriginal && display.approximate ? (
        <span className={secondaryClassName}>{original}</span>
      ) : null}
    </span>
  );
}
