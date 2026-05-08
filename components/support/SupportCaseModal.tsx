"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import {
  REQUESTED_RESOLUTIONS,
  SUPPORT_CASE_CATEGORIES,
  requestedResolutionLabelKey,
  supportCategoryLabelKey,
  type RequestedResolution,
  type SupportCaseCategory,
} from "@/lib/supportCases";

export function SupportCaseModal({
  open,
  bookingId,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  bookingId: string | null;
  onClose: () => void;
  onSubmitted?: (caseId: string) => void;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const disclaimerId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const [category, setCategory] = useState<SupportCaseCategory>("technical_issue");
  const [requestedResolution, setRequestedResolution] = useState<RequestedResolution>("information_only");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const close = useCallback(() => {
    setError(null);
    setSuccessId(null);
    setDescription("");
    setEvidenceUrl("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || successId) return;
    const tId = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(tId);
  }, [open, successId]);

  if (!open) return null;

  const submit = async () => {
    if (!bookingId || description.trim().length < 10) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));
      const res = await fetch("/api/support/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          category,
          description,
          requested_resolution: requestedResolution,
          evidence_url: evidenceUrl.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { case_id?: string; error?: string };
      if (!res.ok || !payload.case_id) throw new Error(payload.error || t("anErrorOccurred"));
      setSuccessId(payload.case_id);
      onSubmitted?.(payload.case_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={successId ? undefined : disclaimerId}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-48px)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">{t("resolutionCenterTitle")}</p>
            <h2 id={titleId} className="mt-1 text-lg font-bold text-slate-900">
              {t("reportProblem")}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("accessibilityCloseDialog")}
            className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {successId ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">
              <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 text-sm text-slate-700">
                <p className="font-bold text-teal-700">{t("supportCaseSubmitted")}</p>
                <p className="mt-1 text-xs">#{successId.slice(0, 8)}</p>
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-5 pt-4">
              <button type="button" onClick={close} className="h-11 w-full rounded-2xl bg-teal-700 text-sm font-bold text-white">
                {t("supportCaseViewDetails")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5">
              <p
                id={disclaimerId}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
              >
                <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />
                {t("supportCaseDisclaimer")}
              </p>

              <div className="mt-4 space-y-4 pb-1">
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseCategory")}</span>
                  <select
                    ref={firstFieldRef}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportCaseCategory)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                  >
                    {SUPPORT_CASE_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {t(supportCategoryLabelKey(item))}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseRequestedResolution")}</span>
                  <select
                    value={requestedResolution}
                    onChange={(e) => setRequestedResolution(e.target.value as RequestedResolution)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                  >
                    {REQUESTED_RESOLUTIONS.map((item) => (
                      <option key={item} value={item}>
                        {t(requestedResolutionLabelKey(item))}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseDescription")}</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseEvidence")}</span>
                  <input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>

                {error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)]">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={close} className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700">
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  disabled={submitting || !bookingId || description.trim().length < 10}
                  onClick={() => void submit()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {t("supportCaseSubmit" as TranslationKey)}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
