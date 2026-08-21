"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import {
  resolvePreciseScheduleUiStatus,
  type PreciseScheduleUiStatus,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import { dispatchConfigurePrecision } from "@/lib/schedule/precisionScheduleBanner";
import { cn } from "@/lib/utils";

type Props = {
  scheduleMode: TeacherScheduleMode;
  preciseIntervalCount: number;
  preciseBookingUiEnabled: boolean;
  onActivated?: (next: {
    scheduleMode: TeacherScheduleMode;
    preciseScheduleActivatedAt: string | null;
  }) => void;
  onConfigure?: () => void;
};

/**
 * Teacher-facing schedule precision status (general / ready / active).
 */
export function TeacherScheduleStatus({
  scheduleMode,
  preciseIntervalCount,
  preciseBookingUiEnabled,
  onActivated,
  onConfigure,
}: Props) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status: PreciseScheduleUiStatus = resolvePreciseScheduleUiStatus({
    scheduleMode,
    preciseIntervalCount,
    preciseBookingUiEnabled,
  });

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure();
      return;
    }
    dispatchConfigurePrecision();
    document
      .querySelector('[data-testid="teacher-schedule-interactive-grid"]')
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("teacher-weekly-intervals-editor")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleActivate = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError(t("schedulePreciseActivateAuthError"));
        return;
      }
      const res = await fetch("/api/teacher/schedule/activate-precise", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        scheduleMode?: TeacherScheduleMode;
        preciseScheduleActivatedAt?: string | null;
      };
      if (!res.ok) {
        if (body.error === "no_precise_intervals") {
          setError(t("schedulePreciseActivateNeedIntervals"));
        } else if (
          body.error === "invalid_precise_intervals" ||
          body.error === "overlapping_precise_intervals"
        ) {
          setError(t("schedulePreciseActivateInvalidIntervals"));
        } else if (body.error === "precise_schedule_disabled") {
          setError(t("schedulePreciseActivateDisabled"));
        } else {
          setError(t("schedulePreciseActivateError"));
        }
        return;
      }
      onActivated?.({
        scheduleMode: body.scheduleMode === "precise_intervals" ? "precise_intervals" : "legacy_blocks",
        preciseScheduleActivatedAt: body.preciseScheduleActivatedAt ?? null,
      });
    } catch {
      setError(t("schedulePreciseActivateError"));
    } finally {
      setBusy(false);
    }
  };

  const tone =
    status === "active"
      ? "border-teal-200 bg-teal-50/80"
      : status === "ready"
        ? "border-sky-200 bg-sky-50/80"
        : "border-slate-200 bg-white";

  return (
    <section
      className={cn("rounded-2xl border p-4 shadow-sm sm:p-5", tone)}
      data-testid="teacher-schedule-status"
      data-status={status}
      aria-labelledby="teacher-schedule-status-title"
      role="region"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          {status === "active" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
          ) : (
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          )}
          <div>
            <h2 id="teacher-schedule-status-title" className="text-sm font-bold text-slate-900">
              {status === "active"
                ? t("schedulePreciseActiveTitle")
                : status === "ready"
                  ? t("schedulePreciseReadyTitle")
                  : t("schedulePrecisionCompactTitle")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-700">
              {status === "active"
                ? t("schedulePreciseActiveBody")
                : status === "ready"
                  ? t("schedulePreciseReadyBody")
                  : t("schedulePrecisionInfoBody")}
            </p>
            {error ? (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11rem]">
          {status === "general" ? (
            <button
              type="button"
              onClick={handleConfigure}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800"
              data-testid="teacher-schedule-status-configure"
            >
              {t("schedulePrecisionCta")}
            </button>
          ) : null}
          {status === "ready" ? (
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60"
              data-testid="teacher-schedule-status-activate"
            >
              {busy ? t("saving") : t("schedulePreciseActivateCta")}
            </button>
          ) : null}
          {status === "active" ? (
            <button
              type="button"
              onClick={handleConfigure}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-200 bg-white px-3 text-xs font-bold text-teal-900 hover:bg-teal-50"
              data-testid="teacher-schedule-status-edit"
            >
              {t("schedulePreciseEditHours")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
