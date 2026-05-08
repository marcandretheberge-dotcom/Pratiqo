"use client";

import { useLocale } from "../lib/locale-context";
import type { Locale } from "../lib/i18n/types";
import { cn } from "../lib/utils";

const OPTIONS: { locale: Locale; flag: string; label: string }[] = [
  { locale: "fr", flag: "🇨🇦", label: "Français" },
  { locale: "en", flag: "🇨🇦", label: "English" },
  { locale: "es", flag: "🇪🇸", label: "Español" },
];

export function LocaleSwitcher({
  variant = "dark",
  compact = false,
}: {
  variant?: "dark" | "light";
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  const light = variant === "light";

  return (
    <div
      className={cn(
        "rounded-lg px-2 py-2",
        light ? "border border-[#E8E6DF] bg-white" : "rounded-lg border border-white/10 bg-white/5",
      )}
    >
      {!compact ? (
        <label
          className={cn(
            "mb-1.5 block px-1 text-[10px] font-semibold uppercase tracking-wide",
            light ? "text-slate-600" : "text-white/70",
          )}
        >
          {t("localeSwitcherLabel")}
        </label>
      ) : null}
      <select
        value={locale}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "fr" || v === "en" || v === "es") setLocale(v);
        }}
        className={cn(
          "w-full cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium outline-none focus:ring-1",
          light
            ? "border-[#E8E6DF] bg-white text-[#2C2C2A] focus:ring-teal-500/30"
            : "border-white/15 bg-[#252524] text-white focus:ring-white/30",
          compact && "py-1 text-[11px]",
        )}
        aria-label={t("localeSwitcherLabel")}
      >
        {OPTIONS.map((o) => (
          <option key={o.locale} value={o.locale}>
            {o.flag} {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
