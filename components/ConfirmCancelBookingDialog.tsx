"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import {
  STUDENT_CANCEL_REASONS,
  TEACHER_CANCEL_REASONS,
  type CancellerRole,
  type StudentCancelReason,
  type TeacherCancelReason,
} from "@/lib/bookingCancellation";
import type { TranslationKey } from "@/lib/i18n/types";

type AnyReason = StudentCancelReason | TeacherCancelReason;

const REASON_LABEL_KEY: Record<AnyReason, TranslationKey> = {
  schedule_conflict: "cancelReason_scheduleConflict",
  illness: "cancelReason_illness",
  family_emergency: "cancelReason_familyEmergency",
  no_longer_needed: "cancelReason_noLongerNeeded",
  found_other: "cancelReason_foundOther",
  tech_or_logistics: "cancelReason_techOrLogistics",
  student_unresponsive: "cancelReason_studentUnresponsive",
  other: "cancelReason_other",
};

export type ConfirmCancelPayload = {
  reason: string;
  message: string;
  /**
   * True when the late-cancellation warning was shown AND the user opted
   * into requesting an exceptional review. The server uses this flag to
   * open a `support_cases` row with `category=late_cancellation`. Setting
   * this to true does NOT promise a refund.
   */
  exceptionalReview?: boolean;
};

export function ConfirmCancelBookingDialog({
  open,
  onClose,
  onConfirm,
  busy,
  role,
  isLate,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Resolved by the parent against the cancel API. Returning success closes the dialog;
   * throwing surfaces the error in the host page's flash UI.
   */
  onConfirm: (payload: ConfirmCancelPayload) => Promise<void>;
  busy?: boolean;
  /** Drives reason list, required-state, and warning copy. Defaults to student. */
  role?: CancellerRole;
  /** True when the lesson is closer than 24h — show the late-cancellation warning. */
  isLate?: boolean;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const messageId = useId();
  const reviewId = useId();
  const [reason, setReason] = useState<AnyReason | "">("");
  const [message, setMessage] = useState("");
  const [exceptionalReview, setExceptionalReview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const effectiveRole: CancellerRole = role ?? "student";
  const reasonRequired = effectiveRole === "teacher";
  const showExceptionalReview = effectiveRole === "student" && Boolean(isLate);

  const reasonOptions = useMemo<readonly AnyReason[]>(
    () => (effectiveRole === "teacher" ? TEACHER_CANCEL_REASONS : STUDENT_CANCEL_REASONS),
    [effectiveRole],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setReason("");
      setMessage("");
      setExceptionalReview(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const confirmDisabled = Boolean(busy) || (reasonRequired && !reason);

  const node = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("bookingClose")}
        onClick={() => (!busy ? onClose() : null)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "relative z-[201] w-full max-w-[460px] rounded-3xl border border-[var(--p-border-light)] bg-white p-5 shadow-xl",
          "max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto",
        )}
      >
        <button
          type="button"
          onClick={() => (!busy ? onClose() : null)}
          disabled={busy}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          aria-label={t("bookingClose")}
        >
          <X size={18} />
        </button>
        <h2 id={titleId} className="text-lg font-bold text-slate-900 pr-10">
          {t("cancelClassTitle")}
        </h2>
        <p id={descId} className="mt-2 text-sm text-slate-600 leading-relaxed">
          {t("cancelClassBody")}
        </p>

        {isLate ? (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span className="leading-relaxed">{t("lateCancellationWarning")}</span>
          </div>
        ) : null}

        {showExceptionalReview ? (
          <label
            htmlFor={reviewId}
            data-testid="cancel-exceptional-review-checkbox-label"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 py-2 text-[13px] text-slate-800"
          >
            <input
              id={reviewId}
              data-testid="cancel-exceptional-review-checkbox"
              type="checkbox"
              checked={exceptionalReview}
              disabled={busy}
              onChange={(e) => setExceptionalReview(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="leading-relaxed">
              <span className="block font-semibold text-slate-900">
                {t("lateCancellationRequestReviewLabel")}
              </span>
              <span className="mt-1 block text-slate-600">
                {t("lateCancellationRequestReviewHelp")}
              </span>
            </span>
          </label>
        ) : null}

        <label htmlFor={reasonId} className="mt-4 block">
          <span className="text-xs font-semibold text-slate-700">
            {reasonRequired ? t("cancellationReasonRequired") : t("cancellationReasonOptional")}
          </span>
          <select
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value as AnyReason | "")}
            disabled={busy}
            required={reasonRequired}
            className={cn(
              "mt-1 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 py-2 text-sm outline-none focus:border-teal-500",
              "min-h-[44px]",
            )}
          >
            <option value="">{t("cancellationReasonPlaceholder")}</option>
            {reasonOptions.map((slug) => (
              <option key={slug} value={slug}>
                {t(REASON_LABEL_KEY[slug])}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor={messageId} className="mt-3 block">
          <span className="text-xs font-semibold text-slate-700">{t("cancellationMessageOptional")}</span>
          <textarea
            id={messageId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={2000}
            placeholder={t("cancellationMessagePlaceholder")}
            className={cn(
              "mt-1 w-full resize-y rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 py-2 text-sm outline-none focus:border-teal-500",
              "min-h-[88px]",
            )}
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center rounded-2xl border border-[var(--p-border-light)] px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            {t("keepClass")}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={async () => {
              await onConfirm({
                reason: reason || "",
                message: message.trim(),
                exceptionalReview: showExceptionalReview ? exceptionalReview : false,
              });
            }}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl border-2 border-rose-600 bg-white px-4 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("confirmCancelClass")}
          </button>
        </div>
        <p className="mt-4 border-t border-[var(--p-border-light)] pt-3 text-center">
          <Link
            href="/legal/annulation"
            className="text-xs font-semibold text-teal-700 hover:underline"
            onClick={() => (!busy ? onClose() : null)}
          >
            {t("viewCancellationPolicy")}
          </Link>
        </p>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
