"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { localeToBcp47 } from "@/lib/i18n/types";
import type { TranslationKey } from "@/lib/translations";
import {
  AVAILABILITY_PREVIEW_DAY_OPTIONS,
  AVAILABILITY_PREVIEW_DURATION_OPTIONS,
  isTeacherAvailabilityPreviewUiEnabled,
  type AvailabilityPreviewDay,
  type BookableDayBlockedReason,
} from "@/lib/bookings/availabilityPreview";
import { formatLessonDurationLabel } from "@/lib/pricing/lessonDuration";
import { cn } from "@/lib/utils";

type Props = {
  guidedSetup?: boolean;
  defaultDurationMinutes: number;
  scheduleDirty: boolean;
  onRequestSave?: () => void;
};

type PreviewResponse = {
  startDate: string;
  daysRequested: number;
  durationMinutes: number;
  days: AvailabilityPreviewDay[];
  paymentReadiness: { ready: boolean; reason: string | null };
  error?: string;
};

const REASON_KEY: Record<BookableDayBlockedReason, TranslationKey> = {
  before_available_from: "availabilityPreviewReasonBeforeStart",
  outside_precise_hours: "availabilityPreviewReasonOutsideHours",
  precise_not_active: "availabilityPreviewReasonPreciseInactive",
  already_booked: "availabilityPreviewReasonAlreadyBooked",
  locked_next_24h: "availabilityPreviewReasonLocked24h",
  exception_blocked: "availabilityPreviewReasonException",
  no_availability: "availabilityPreviewReasonNoAvailability",
};

function formatDayLabel(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * Read-only “what learners can book” preview on Horaire.
 */
export function TeacherAvailabilityPreview({
  guidedSetup = false,
  defaultDurationMinutes,
  scheduleDirty,
  onRequestSave,
}: Props) {
  const { t, locale } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const uiEnabled = guidedSetup || isTeacherAvailabilityPreviewUiEnabled();

  const [durationMinutes, setDurationMinutes] = useState(() => {
    const d = Math.round(defaultDurationMinutes);
    return (AVAILABILITY_PREVIEW_DURATION_OPTIONS as readonly number[]).includes(d) ? d : 60;
  });
  const [daysHorizon, setDaysHorizon] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  useEffect(() => {
    const d = Math.round(defaultDurationMinutes);
    if ((AVAILABILITY_PREVIEW_DURATION_OPTIONS as readonly number[]).includes(d)) {
      setDurationMinutes(d);
    }
  }, [defaultDurationMinutes]);

  const loadPreview = useCallback(async () => {
    if (!uiEnabled || scheduleDirty) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError(t("availabilityPreviewLoadError"));
        setPreview(null);
        return;
      }
      const params = new URLSearchParams({
        days: String(daysHorizon),
        durationMinutes: String(durationMinutes),
      });
      if (guidedSetup) params.set("flow", "teacher-setup");
      const res = await fetch(`/api/teacher/schedule/availability-preview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as PreviewResponse;
      if (!res.ok) {
        setError(t("availabilityPreviewLoadError"));
        setPreview(null);
        return;
      }
      setPreview(body);
    } catch {
      setError(t("availabilityPreviewLoadError"));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [uiEnabled, scheduleDirty, daysHorizon, durationMinutes, t, guidedSetup]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (!uiEnabled) return null;

  const totalSlots = preview?.days.reduce((n, d) => n + d.slots.length, 0) ?? 0;
  const paymentWarning =
    preview && !preview.paymentReadiness.ready ? t("availabilityPreviewPaymentWarning") : null;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="teacher-availability-preview"
      aria-labelledby="teacher-availability-preview-title"
      role="region"
    >
      <div className="flex items-start gap-2">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="teacher-availability-preview-title" className="text-sm font-bold text-slate-900">
            {t("availabilityPreviewTitle")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("availabilityPreviewSubtitle")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-700">
          <span className="mb-1 block">{t("availabilityPreviewDurationLabel")}</span>
          <select
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            data-testid="teacher-availability-preview-duration"
            disabled={scheduleDirty}
          >
            {AVAILABILITY_PREVIEW_DURATION_OPTIONS.map((mins) => (
              <option key={mins} value={mins}>
                {formatLessonDurationLabel(mins, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          <span className="mb-1 block">{t("availabilityPreviewRangeLabel")}</span>
          <select
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            value={daysHorizon}
            onChange={(e) => setDaysHorizon(Number(e.target.value))}
            data-testid="teacher-availability-preview-range"
            disabled={scheduleDirty}
          >
            {AVAILABILITY_PREVIEW_DAY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {t(
                  n === 7
                    ? "availabilityPreviewRange7"
                    : n === 30
                      ? "availabilityPreviewRange30"
                      : "availabilityPreviewRange14",
                )}
              </option>
            ))}
          </select>
        </label>
      </div>

      {scheduleDirty ? (
        <div
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
          role="status"
          data-testid="teacher-availability-preview-dirty"
        >
          <p className="text-xs font-medium text-amber-950">{t("availabilityPreviewDirtyMessage")}</p>
          {onRequestSave ? (
            <button
              type="button"
              onClick={onRequestSave}
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800"
              data-testid="teacher-availability-preview-save"
            >
              {t("availabilityPreviewDirtyCta")}
            </button>
          ) : null}
        </div>
      ) : null}

      {!scheduleDirty && paymentWarning ? (
        <p
          className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950"
          role="status"
          data-testid="teacher-availability-preview-payment"
        >
          {paymentWarning}
        </p>
      ) : null}

      {!scheduleDirty && error ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="alert">
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadPreview()}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} aria-hidden />
            {t("availabilityPreviewRetry")}
          </button>
        </div>
      ) : null}

      {!scheduleDirty && loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("loading")}
        </div>
      ) : null}

      {!scheduleDirty && !loading && preview ? (
        <div className="mt-4 space-y-3" data-testid="teacher-availability-preview-days">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("availabilityPreviewUpcoming")}
          </p>
          {totalSlots === 0 ? (
            <p className="text-sm text-slate-700">
              {t("availabilityPreviewEmptyHorizon").replace("{count}", String(preview.daysRequested))}
            </p>
          ) : null}
          <ul className="space-y-2">
            {preview.days.map((day) => (
              <li
                key={day.date}
                className={cn(
                  "rounded-xl border px-3 py-2",
                  day.bookable ? "border-teal-100 bg-teal-50/40" : "border-slate-100 bg-slate-50/60",
                )}
              >
                <p className="text-xs font-bold capitalize text-slate-900">
                  {formatDayLabel(day.date, dateLocale)}
                </p>
                {day.bookable ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("availabilityPreviewUpcoming")}>
                    {day.slots.map((slot) => (
                      <li key={`${day.date}-${slot.timeSlot}`}>
                        <span
                          className="inline-flex rounded-lg border border-teal-200 bg-white px-2 py-1 text-xs font-semibold text-teal-900"
                          data-testid="teacher-availability-preview-slot"
                        >
                          {slot.start}–{slot.end}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-slate-700">{t("availabilityPreviewNoSlots")}</p>
                    {day.blockedReasons.map((reason) => (
                      <p key={reason} className="text-xs text-slate-600">
                        {t(REASON_KEY[reason])}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
