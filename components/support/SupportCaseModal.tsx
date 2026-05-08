"use client";

import { useEffect, useState } from "react";
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
  const [category, setCategory] = useState<SupportCaseCategory>("technical_issue");
  const [requestedResolution, setRequestedResolution] = useState<RequestedResolution>("information_only");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

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

  const close = () => {
    setError(null);
    setSuccessId(null);
    setDescription("");
    setEvidenceUrl("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="support-case-modal-title">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0F6E56]">
              {t("resolutionCenterTitle")}
            </p>
            <h2 id="support-case-modal-title" className="mt-1 text-lg font-bold text-slate-900">{t("reportProblem")}</h2>
          </div>
          <button type="button" onClick={close} aria-label={t("accessibilityCloseDialog")} className="rounded-full p-2 text-slate-500 hover:bg-slate-50">
            <X size={18} />
          </button>
        </div>

        {successId ? (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 text-sm text-slate-700">
              <p className="font-bold text-[#0F6E56]">{t("supportCaseSubmitted")}</p>
              <p className="mt-1 text-xs">#{successId.slice(0, 8)}</p>
            </div>
            <button type="button" onClick={close} className="h-11 w-full rounded-2xl bg-[#0F6E56] text-sm font-bold text-white">
              {t("supportCaseViewDetails")}
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              {t("supportCaseDisclaimer")}
            </p>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseCategory")}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportCaseCategory)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1D9E75]"
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
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1D9E75]"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("supportCaseEvidence")}</span>
              <input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1D9E75]"
              />
            </label>

            {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={close} className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700">
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={submitting || !bookingId || description.trim().length < 10}
                onClick={() => void submit()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("supportCaseSubmit" as TranslationKey)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
