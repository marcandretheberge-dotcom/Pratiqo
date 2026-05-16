"use client";

import { useState, useEffect } from "react";
import { useLocale } from "../lib/locale-context";
import type { Locale } from "../lib/i18n/types";
import { cn } from "../lib/utils";
import { Globe } from "lucide-react";

const OPTIONS: { locale: Locale; flag: string; label: string; code: string }[] = [
  { locale: "fr", flag: "🇨🇦", label: "Français", code: "FR" },
  { locale: "en", flag: "🇺🇸", label: "English", code: "EN" },
  { locale: "es", flag: "🇪🇸", label: "Español", code: "ES" },
];

export function LocaleSwitcher({
  variant = "dark",
  compact = false,
  size = "default",
}: {
  variant?: "dark" | "light";
  compact?: boolean;
  size?: "default" | "sm";
}) {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const light = variant === "light";
  const current = OPTIONS.find((o) => o.locale === locale);
  const showCode = !compact;

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
        aria-haspopup="listbox"
        aria-label="Language"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex shrink-0 items-center rounded-lg transition-all",
          size === "sm" ? "gap-1 px-2 py-1.5 text-xs" : "gap-2 px-3 py-2 text-sm",
          light
            ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            : "border border-white/20 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <Globe size={size === "sm" ? 14 : 16} aria-hidden />
        {showCode ? <span className="font-semibold tabular-nums">{current?.code}</span> : null}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-1 w-48 rounded-lg shadow-lg border z-50",
            light
              ? "border-slate-200 bg-white"
              : "border-white/20 bg-slate-900",
          )}
        >
          {OPTIONS.map((option) => (
            <button
              key={option.locale}
              onClick={() => {
                setLocale(option.locale);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 transition-all first:rounded-t-lg last:rounded-b-lg",
                locale === option.locale
                  ? light
                    ? "bg-[#50BEB2]/15 text-[#2D7B72]"
                    : "bg-white/15 text-white"
                  : light
                    ? "text-slate-700 hover:bg-slate-50"
                    : "text-slate-300 hover:bg-white/10",
              )}
            >
              <span className="text-xl">{option.flag}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs opacity-60">{option.code}</p>
              </div>
              {locale === option.locale && (
                <div className="h-2 w-2 rounded-full bg-[#409A8E]" />
              )}
            </button>
          ))}
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
