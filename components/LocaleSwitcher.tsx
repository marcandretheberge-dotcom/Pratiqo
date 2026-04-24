"use client";

import { useLocale } from "../lib/locale-context";
import type { Locale } from "../lib/i18n";

const OPTIONS: { locale: Locale; flag: string; label: string }[] = [
  { locale: "fr-CA", flag: "🇨🇦", label: "Français (Canada)" },
  { locale: "fr-FR", flag: "🇫🇷", label: "Français (France)" },
  { locale: "en-CA", flag: "🇨🇦", label: "English" },
  { locale: "es", flag: "🇪🇸", label: "Español" },
];

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/50 mb-1.5 px-1">
        {t("localeSwitcherLabel")}
      </label>
      <select
        value={locale}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "fr-CA" || v === "fr-FR" || v === "en-CA" || v === "es") setLocale(v);
        }}
        className="w-full rounded-md border border-white/15 bg-[#252524] text-white text-xs font-medium px-2 py-1.5 outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
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
