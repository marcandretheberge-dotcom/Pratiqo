"use client";

/**
 * PriceDisplay — locale-aware price rendering with "Local First" dual pricing.
 *
 * Default (all markets):
 *   <PriceDisplay priceUSD={25} />        → "CA$ 25"  (or MX$ / US$ etc.)
 *   <PriceDisplay priceUSD={25} perHour /> → "CA$ 25 /h"
 *
 * Uruguay (currency === "UYU"):
 *   <PriceDisplay priceUSD={25} />        → "$U 1.000  (US$ 25)  ℹ"
 *   <PriceDisplay priceUSD={25} perHour /> → "$U 1.000  (US$ 25)  /h  ℹ"
 *
 * The UYU amount is derived from the USD price using UYU_USD_RATE (env-
 * configurable). Teachers always enter/store their rate in USD; the UYU
 * figure is calculated on the fly for local parents.
 *
 * Visual hierarchy:
 *   Primary (UYU): emerald green, bold
 *   Secondary (USD): slate-400, normal weight, parentheses
 *   /h suffix: slate-500, small
 *   Info tooltip: slate-400, shows exchange-rate note on hover
 */

import { Info } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { UYU_USD_RATE } from "@/lib/geoLocale";

interface PriceDisplayProps {
  /** Price as stored in DB — always USD for all markets. */
  priceUSD: number;
  /** Append " /h" suffix. */
  perHour?: boolean;
  /** Override the primary text colour class (default: text-[#1D9E75]). */
  primaryClassName?: string;
}

export function PriceDisplay({
  priceUSD,
  perHour = false,
  primaryClassName = "font-bold text-[#1D9E75]",
}: PriceDisplayProps) {
  const { formatPrice, formatDualPrice } = useLocale();

  const dual = formatDualPrice(priceUSD);

  if (dual) {
    // dual = "$U 1.000 (US$ 25)" — split on the opening parenthesis
    const parenIdx = dual.indexOf(" (");
    const primary = parenIdx !== -1 ? dual.slice(0, parenIdx) : dual;
    const secondary = parenIdx !== -1 ? dual.slice(parenIdx + 1) : null; // "(US$ 25)"

    return (
      <span className="inline-flex items-baseline gap-1.5">
        <span className={primaryClassName}>{primary}</span>
        {secondary ? (
          <span className="text-slate-400 text-sm font-normal">{secondary}</span>
        ) : null}
        {perHour ? <span className="text-slate-500 text-xs font-normal">/h</span> : null}
        {/* Exchange-rate info tooltip */}
        <span
          className="relative inline-flex items-center self-center group"
          aria-label={`Tipo de cambio referencial: 1 USD = ${UYU_USD_RATE} $U`}
        >
          <Info
            size={12}
            className="text-slate-400 cursor-help"
            aria-hidden="true"
          />
          {/* Tooltip bubble */}
          <span
            role="tooltip"
            className={[
              "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5",
              "w-max max-w-[220px] rounded-lg bg-slate-800 px-2.5 py-1.5",
              "text-[11px] leading-snug text-white shadow-md",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              "whitespace-nowrap z-50",
            ].join(" ")}
          >
            Tipo de cambio referencial:
            <br />
            1 USD = {UYU_USD_RATE} $U
          </span>
        </span>
      </span>
    );
  }

  // Single-currency path (all markets except UY)
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={primaryClassName}>{formatPrice(priceUSD)}</span>
      {perHour ? <span className="text-slate-500 text-xs font-normal">/h</span> : null}
    </span>
  );
}
