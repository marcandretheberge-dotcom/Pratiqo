"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { useCookieConsent } from "@/components/privacy/CookieConsentProvider";
import { useLocale } from "@/lib/locale-context";

export function CookiePreferencesModal() {
  const { t } = useLocale();
  const titleId = useId();
  const { preferencesOpen, closePreferences, consent, savePreferences } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [diagnostics, setDiagnostics] = useState(true);

  useEffect(() => {
    if (!preferencesOpen) return;
    setAnalytics(consent?.analytics ?? false);
    setDiagnostics(consent?.diagnostics ?? true);
  }, [consent, preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreferences();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePreferences, preferencesOpen]);

  if (!preferencesOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E8E4DC] bg-[#FFFCF7] p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-[#2C2C2A]">
            {t("cookiePreferencesTitle")}
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label={t("bookingClose")}
            className="rounded-lg p-1 text-[#5C5A56] hover:bg-[#F7F3EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#E8E4DC] bg-white p-4">
            <p className="text-sm font-medium text-[#2C2C2A]">{t("cookieNecessaryLabel")}</p>
            <p className="mt-1 text-sm text-[#5C5A56]">{t("cookieNecessaryDescription")}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DC] bg-white p-4">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#CFC8BC] text-[#2C2C2A] focus:ring-[#2C2C2A]"
            />
            <span>
              <span className="block text-sm font-medium text-[#2C2C2A]">{t("cookieAnalyticsLabel")}</span>
              <span className="mt-1 block text-sm text-[#5C5A56]">{t("cookieAnalyticsDescription")}</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DC] bg-white p-4">
            <input
              type="checkbox"
              checked={diagnostics}
              onChange={(event) => setDiagnostics(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#CFC8BC] text-[#2C2C2A] focus:ring-[#2C2C2A]"
            />
            <span>
              <span className="block text-sm font-medium text-[#2C2C2A]">{t("cookieDiagnosticsLabel")}</span>
              <span className="mt-1 block text-sm text-[#5C5A56]">{t("cookieDiagnosticsDescription")}</span>
            </span>
          </label>

          <p className="text-xs leading-relaxed text-[#5C5A56]">{t("cookiePreferencesContact")}</p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-xl border border-[#D8D2C8] px-4 py-2.5 text-sm font-medium text-[#2C2C2A] hover:bg-[#F7F3EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => savePreferences(analytics, diagnostics)}
            className="rounded-xl bg-[#2C2C2A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f1f1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            {t("cookiePreferencesSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
