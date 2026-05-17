"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import type { Currency } from "@/lib/geoLocale";
import { cn } from "@/lib/utils";
import { useAnchoredFixedMenu } from "@/lib/useAnchoredFixedMenu";
import { Coins } from "lucide-react";

/**
 * The five currencies promoted on the marketplace per the Phase 1 launch plan.
 * Other ISO codes still work (we keep the rate table broader), but only these
 * surface in the user-facing switcher to keep the menu tight.
 */
const PROMOTED: { code: Currency; label: string; flag: string }[] = [
  { code: "CAD", label: "CAD", flag: "🇨🇦" },
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "EUR", label: "EUR", flag: "🇪🇺" },
  { code: "MXN", label: "MXN", flag: "🇲🇽" },
  { code: "UYU", label: "UYU", flag: "🇺🇾" },
];

export function CurrencySwitcher({
  variant = "light",
  size = "default",
}: {
  variant?: "dark" | "light";
  size?: "default" | "sm";
}) {
  const { currency, setCurrency } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuPosition = useAnchoredFixedMenu(isOpen, anchorRef);
  const light = variant === "light";

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Currency"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "flex shrink-0 items-center rounded-lg transition-all",
          size === "sm" ? "gap-1 px-2 py-1.5 text-xs" : "gap-1.5 px-2.5 py-2 text-xs",
          light
            ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            : "border border-white/20 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <Coins size={size === "sm" ? 12 : 14} aria-hidden />
        <span className="font-semibold tabular-nums">{currency}</span>
      </button>

      {isOpen && menuPosition ? (
        <div
          data-header-selector-menu
          role="listbox"
          className={cn(
            "fixed z-[120] w-44 rounded-lg border shadow-lg",
            light ? "border-slate-200 bg-white" : "border-white/20 bg-slate-900",
          )}
          style={{ top: menuPosition.top, right: menuPosition.right }}
        >
          {PROMOTED.map((opt) => {
            const active = currency === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setCurrency(opt.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-all first:rounded-t-lg last:rounded-b-lg",
                  active
                    ? light
                      ? "bg-[#50BEB2]/15 text-[#2D7B72]"
                      : "bg-white/15 text-white"
                    : light
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-300 hover:bg-white/10",
                )}
              >
                <span className="text-base leading-none">{opt.flag}</span>
                <span className="font-semibold">{opt.label}</span>
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#409A8E]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[110]" aria-hidden onClick={() => setIsOpen(false)} />
      ) : null}
    </div>
  );
}
