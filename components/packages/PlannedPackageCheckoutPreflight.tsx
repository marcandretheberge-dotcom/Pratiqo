"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isPlannedPackageCheckoutPreflightUiEnabled,
  plannedPackagePreflightBlockerLabel,
  type PlannedPackageCheckoutPreflightResult,
} from "@/lib/offers/plannedPackageCheckoutPreflight";
import { PlannedPackagePendingOrderPanel } from "@/components/packages/PlannedPackagePendingOrder";
import { isPlannedPackageTemporaryHoldsUiEnabled } from "@/lib/offers/plannedPackageTemporaryHolds";

type Props = {
  draftId: string;
  teacherProfileHref?: string;
  onEditSessions?: () => void;
};

export function PlannedPackageCheckoutPreflight({
  draftId,
  teacherProfileHref,
  onEditSessions,
}: Props) {
  const { t, locale } = useLocale();
  const enabled = isPlannedPackageCheckoutPreflightUiEnabled();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlannedPackageCheckoutPreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setError(t("plannedPackagePreflightDraftNotFound"));
        return;
      }
      const res = await fetch(
        `/api/planned-packages/session-drafts/${encodeURIComponent(draftId)}/checkout-preflight`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = (await res.json().catch(() => ({}))) as
        | PlannedPackageCheckoutPreflightResult
        | { error?: string };
      if (!res.ok || !("draftId" in json)) {
        setError(t("plannedPackagePreflightPaidNotEnabled"));
        setResult(null);
        return;
      }
      setResult(json);
    } catch {
      setError(t("plannedPackagePreflightPaidNotEnabled"));
    } finally {
      setLoading(false);
    }
  }, [draftId, enabled, t]);

  useEffect(() => {
    void run();
  }, [run]);

  if (!enabled) return null;

  const localeTag = locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA";
  const sessionsValid = result?.sessions.every((s) => s.valid) ?? false;
  const hasInvalidSessions = result != null && !sessionsValid;

  return (
    <section
      className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      data-testid="planned-package-checkout-preflight"
    >
      <h3 className="text-sm font-bold text-slate-900">{t("plannedPackagePreflightTitle")}</h3>

      {loading ? (
        <p className="text-sm text-slate-600" data-testid="planned-package-preflight-loading">
          {t("plannedPackagePreflightChecking")}
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {result && !loading ? (
        <>
          <div className="text-sm text-slate-800">
            <p className="font-semibold">{result.package.title}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {result.package.sessionCount} · {result.package.durationMinutes} min ·{" "}
              {new Intl.NumberFormat(localeTag, {
                style: "currency",
                currency: result.package.currency || "CAD",
              }).format(result.package.priceCents / 100)}
            </p>
          </div>

          <ul className="space-y-1.5 text-sm">
            {result.sessions.map((s) => (
              <li
                key={`${s.sessionIndex}-${s.startsAt}`}
                className={s.valid ? "text-teal-800" : "text-rose-700"}
                data-testid={`planned-package-preflight-session-${s.sessionIndex}`}
                data-valid={s.valid ? "true" : "false"}
              >
                {new Date(s.startsAt).toLocaleString(localeTag)}
                {!s.valid ? ` — ${t("plannedPackagePreflightSessionUnavailable")}` : null}
              </li>
            ))}
          </ul>

          {sessionsValid ? (
            <p className="text-sm font-medium text-teal-800">{t("plannedPackagePreflightSessionsOk")}</p>
          ) : null}
          {hasInvalidSessions ? (
            <>
              <p className="text-sm font-medium text-rose-800">
                {t("plannedPackagePreflightSessionsInvalid")}
              </p>
              <p className="text-xs text-slate-600">{t("plannedPackagePreflightChooseOther")}</p>
            </>
          ) : null}

          {result.blockers.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-950" data-testid="planned-package-preflight-blockers">
              {[...new Set(result.blockers.map((b) => plannedPackagePreflightBlockerLabel(b, t)))].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}

          <p className="text-xs leading-relaxed text-slate-600">{t("plannedPackageNotReservedYet")}</p>
          <p className="text-xs leading-relaxed text-slate-600">{t("plannedPackageAvailabilityRecheck")}</p>

          {sessionsValid && isPlannedPackageTemporaryHoldsUiEnabled() ? (
            <PlannedPackagePendingOrderPanel
              draftId={draftId}
              onEditSessions={onEditSessions}
            />
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
              data-testid="planned-package-preflight-payment-coming-soon"
            >
              {t("plannedPackagePaymentComingSoon")}
            </button>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void run()}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-900"
              data-testid="planned-package-preflight-rerun"
            >
              {t("plannedPackagePreflightRerun")}
            </button>
            {onEditSessions ? (
              <button
                type="button"
                onClick={onEditSessions}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
              >
                {t("plannedPackagePreflightEditSessions")}
              </button>
            ) : null}
            {teacherProfileHref ? (
              <a
                href={teacherProfileHref}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
              >
                {t("plannedPackagePreflightBackToProfile")}
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
