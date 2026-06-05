"use client";

import { useState, useEffect } from "react";
import { useLocale } from "../lib/locale-context";
import type { Locale } from "../lib/i18n/types";
import type { Currency } from "../lib/geoLocale";
import { getSupabaseClient } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Check, Globe } from "lucide-react";

/**
 * Best-effort persist the chosen UI locale to `auth.users.user_metadata`
 * so server-side senders (booking reminders, welcome emails, etc.) pick it
 * up. Silent on failure: the cookie + localStorage write already happened
 * in `LocaleProvider.setLocale`, so the UI stays consistent even if the
 * user is logged out or the network fails.
 */
async function persistLocaleToServer(locale: Locale) {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/user/locale", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ locale }),
    });
  } catch {
    /* best effort — don't surface to the user */
  }
}

type FlagCountry = "CA" | "US" | "ES";

const OPTIONS: { locale: Locale; flagCountry: FlagCountry; label: string; code: string }[] = [
  { locale: "fr", flagCountry: "CA", label: "Français", code: "FR" },
  { locale: "en", flagCountry: "US", label: "English", code: "EN" },
  { locale: "es", flagCountry: "ES", label: "Español", code: "ES" },
];

const CURRENCY_OPTIONS: { currency: Currency; label: string; symbol: string }[] = [
  { currency: "CAD", label: "CAD", symbol: "$" },
  { currency: "USD", label: "USD", symbol: "$" },
  { currency: "UYU", label: "UYU", symbol: "$" },
  { currency: "MXN", label: "MXN", symbol: "$" },
  { currency: "EUR", label: "EUR", symbol: "€" },
  { currency: "COP", label: "COP", symbol: "$" },
  { currency: "ARS", label: "ARS", symbol: "$" },
  { currency: "CLP", label: "CLP", symbol: "$" },
  { currency: "PEN", label: "PEN", symbol: "S/" },
];

/**
 * Cross-platform flag badge.
 *
 * Why inline SVG instead of an emoji: regional-indicator flag emojis (e.g.
 * 🇨🇦) render as actual flags on macOS/iOS/Android because those platforms ship
 * fonts with flag glyphs. Windows desktop fonts do NOT, so the same emoji
 * falls back to its underlying regional-indicator letter pair — "CA", "US",
 * "ES" — which looked like a broken selector. These minimal SVGs render
 * identically everywhere with no extra assets.
 */
function FlagBadge({ country, size = 20 }: { country: FlagCountry; size?: number }) {
  const height = Math.round(size * (2 / 3));
  const common = {
    width: size,
    height,
    viewBox: "0 0 30 20",
    role: "img" as const,
    "aria-hidden": true,
    style: {
      display: "inline-block",
      borderRadius: 3,
      boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.08)",
      overflow: "hidden" as const,
      flex: "0 0 auto" as const,
    },
  };

  if (country === "CA") {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#FFFFFF" />
        <rect x="0" width="7.5" height="20" fill="#D52B1E" />
        <rect x="22.5" width="7.5" height="20" fill="#D52B1E" />
        {/* Stylized maple-leaf glyph */}
        <path
          d="M15 4 L15.7 6.6 L18 6.2 L17.1 8.3 L19 9 L17.1 9.7 L18 11.8 L15.7 11.4 L15 14 L14.3 11.4 L12 11.8 L12.9 9.7 L11 9 L12.9 8.3 L12 6.2 L14.3 6.6 Z"
          fill="#D52B1E"
        />
      </svg>
    );
  }

  if (country === "US") {
    return (
      <svg {...common}>
        {/* 13 stripes alternating red/white */}
        {Array.from({ length: 13 }).map((_, i) => (
          <rect
            key={i}
            x="0"
            y={(i * 20) / 13}
            width="30"
            height={20 / 13}
            fill={i % 2 === 0 ? "#B22234" : "#FFFFFF"}
          />
        ))}
        {/* Blue canton */}
        <rect x="0" y="0" width="12" height={20 * (7 / 13)} fill="#3C3B6E" />
        {/* Simplified star pattern: three dots */}
        <circle cx="3.5" cy="3" r="0.6" fill="#FFFFFF" />
        <circle cx="6" cy="3" r="0.6" fill="#FFFFFF" />
        <circle cx="8.5" cy="3" r="0.6" fill="#FFFFFF" />
        <circle cx="4.75" cy="5.5" r="0.6" fill="#FFFFFF" />
        <circle cx="7.25" cy="5.5" r="0.6" fill="#FFFFFF" />
        <circle cx="3.5" cy="8" r="0.6" fill="#FFFFFF" />
        <circle cx="6" cy="8" r="0.6" fill="#FFFFFF" />
        <circle cx="8.5" cy="8" r="0.6" fill="#FFFFFF" />
      </svg>
    );
  }

  // ES
  return (
    <svg {...common}>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </svg>
  );
}

export function LocaleSwitcher({
  variant = "dark",
  compact = false,
}: {
  variant?: "dark" | "light";
  compact?: boolean;
}) {
  const { locale, setLocale, currency, setCurrency, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const light = variant === "light";
  const current = OPTIONS.find((o) => o.locale === locale);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Button */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${t("localeLanguageLabel")} ${current?.code ?? locale}, ${t("localeCurrencyLabel")} ${currency}`}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 transition-all",
          light
            ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            : "border border-white/20 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <Globe size={16} />
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{currency}</span>
        <span className={cn("h-3 w-px", light ? "bg-slate-200" : "bg-white/25")} aria-hidden />
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{current?.code}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-1 w-56 overflow-hidden rounded-xl shadow-lg border z-50",
            light
              ? "border-slate-200 bg-white"
              : "border-white/20 bg-slate-900",
          )}
          role="menu"
        >
          <div className="p-2">
            <p
              className={cn(
                "px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest",
                light ? "text-slate-500" : "text-slate-400",
              )}
            >
              {t("localeLanguageLabel")}
            </p>
            {OPTIONS.map((option) => (
              <button
                key={option.locale}
                type="button"
                role="menuitemradio"
                aria-checked={locale === option.locale}
                onClick={() => {
                  setLocale(option.locale);
                  void persistLocaleToServer(option.locale);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left flex items-center gap-3 transition-all",
                  locale === option.locale
                    ? light
                      ? "bg-[#50BEB2]/15 text-[#2D7B72]"
                      : "bg-white/15 text-white"
                    : light
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-300 hover:bg-white/10",
                )}
              >
                <FlagBadge country={option.flagCountry} size={22} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs opacity-60">{option.code}</p>
                </div>
                {locale === option.locale ? <Check size={16} className="text-[#409A8E]" aria-hidden /> : null}
              </button>
            ))}
          </div>

          <div className={cn("border-t p-2", light ? "border-slate-100" : "border-white/10")}>
            <p
              className={cn(
                "px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest",
                light ? "text-slate-500" : "text-slate-400",
              )}
            >
              {t("localeCurrencyLabel")}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {CURRENCY_OPTIONS.map((option) => (
                <button
                  key={option.currency}
                  type="button"
                  role="menuitemradio"
                  aria-checked={currency === option.currency}
                  aria-label={`${t("localeCurrencyLabel")} ${option.label}`}
                  onClick={() => {
                    setCurrency(option.currency);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-1 rounded-lg px-2 text-xs font-bold transition-all",
                    currency === option.currency
                      ? light
                        ? "bg-[#50BEB2]/15 text-[#2D7B72]"
                        : "bg-white/15 text-white"
                      : light
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-300 hover:bg-white/10",
                  )}
                >
                  <span>{option.label}</span>
                  <span className="opacity-60">{option.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
