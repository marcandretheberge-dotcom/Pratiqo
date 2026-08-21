"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import {
  dispatchConfigurePrecision,
  readPrecisionBannerSnoozed,
  resolvePrecisionBannerState,
  writePrecisionBannerSnooze,
  type PrecisionBannerVariant,
} from "@/lib/schedule/precisionScheduleBanner";
import { cn } from "@/lib/utils";

type Props = {
  /** Count of broad Matin/Après-midi/Soir availability blocks. */
  broadBlockCount: number;
  preciseIntervalCount: number;
  configuredDayCount?: number;
  intervalsServerEnabled?: boolean;
  intervalsUiEnabled?: boolean;
  interactiveCellsUiEnabled?: boolean;
  /** Prefer scrolling / opening the precision editor. */
  onConfigure?: () => void;
};

/**
 * Teacher-friendly precision schedule banner.
 */
export function TeacherSchedulePrecisionBanner({
  broadBlockCount,
  preciseIntervalCount,
  configuredDayCount,
  intervalsServerEnabled,
  intervalsUiEnabled,
  interactiveCellsUiEnabled,
  onConfigure,
}: Props) {
  const { t } = useLocale();
  const [snoozed, setSnoozed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    setSnoozed(readPrecisionBannerSnoozed());
  }, []);

  const state = resolvePrecisionBannerState({
    legacyBlockCount: broadBlockCount,
    preciseIntervalCount,
    configuredDayCount,
    intervalsServerEnabled,
    intervalsUiEnabled,
    interactiveCellsUiEnabled,
    snoozed,
  });

  const handleConfigure = useCallback(() => {
    setHintVisible(true);
    if (onConfigure) {
      onConfigure();
      return;
    }
    dispatchConfigurePrecision();
    const targets = [
      "teacher-schedule-interactive-grid",
      "teacher-weekly-intervals-editor",
      "teacher-schedule-availability-scroll",
    ];
    for (const id of targets) {
      const el = document.getElementById(id) ?? document.querySelector(`[data-testid="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  }, [onConfigure]);

  const handleSnooze = () => {
    writePrecisionBannerSnooze();
    setSnoozed(true);
  };

  if (state.variant === "hidden" && !state.showCompactReminder) {
    return null;
  }

  const isWarning = state.variant === "warning";

  return (
    <div className="space-y-3" data-testid="teacher-schedule-precision-banner-root">
      {state.showLargeBanner ? (
        <section
          className={cn(
            "rounded-2xl border p-4 shadow-sm sm:p-5",
            isWarning
              ? "border-amber-300 bg-amber-50"
              : "border-teal-200 bg-teal-50/80",
          )}
          data-testid="teacher-schedule-precision-banner"
          data-variant={state.variant as PrecisionBannerVariant}
          aria-labelledby="teacher-schedule-precision-banner-title"
          role="region"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-start gap-2">
                <Clock3
                  className={cn("mt-0.5 h-5 w-5 shrink-0", isWarning ? "text-amber-800" : "text-teal-800")}
                  aria-hidden
                />
                <div>
                  <h2
                    id="teacher-schedule-precision-banner-title"
                    className={cn(
                      "text-sm font-bold",
                      isWarning ? "text-amber-950" : "text-teal-950",
                    )}
                  >
                    {isWarning ? t("schedulePrecisionWarningTitle") : t("schedulePrecisionInfoTitle")}
                  </h2>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-5",
                      isWarning ? "text-amber-900" : "text-teal-900",
                    )}
                  >
                    {isWarning ? t("schedulePrecisionWarningBody") : t("schedulePrecisionInfoBody")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-5 font-medium",
                      isWarning ? "text-amber-950" : "text-teal-950",
                    )}
                  >
                    {isWarning ? t("schedulePrecisionWarningAction") : t("schedulePrecisionInfoAction")}
                  </p>
                  {state.configuredDayCount >= 0 && preciseIntervalCount === 0 ? (
                    <p
                      className={cn(
                        "mt-2 text-[11px] font-semibold",
                        isWarning ? "text-amber-900" : "text-teal-800",
                      )}
                      data-testid="teacher-schedule-precision-progress"
                    >
                      {t("schedulePrecisionProgressZero")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12rem] sm:flex-col sm:items-stretch">
              <button
                type="button"
                onClick={handleConfigure}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                data-testid="teacher-schedule-precision-banner-cta"
              >
                {t("schedulePrecisionCta")}
              </button>
              {!isWarning ? (
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                  data-testid="teacher-schedule-precision-banner-snooze"
                >
                  {t("schedulePrecisionSnooze")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-white/80 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                  data-testid="teacher-schedule-precision-banner-snooze"
                >
                  {t("schedulePrecisionSnooze")}
                </button>
              )}
            </div>
          </div>
          {hintVisible ? (
            <p
              className="mt-3 text-xs font-medium text-slate-700"
              data-testid="teacher-schedule-precision-hint"
              role="status"
            >
              {t("schedulePrecisionClickHint")}
            </p>
          ) : null}
        </section>
      ) : null}

      {state.showCompactReminder ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          data-testid="teacher-schedule-precision-compact"
          role="status"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">{t("schedulePrecisionCompactTitle")}</p>
            <p className="text-[11px] leading-4 text-slate-600">{t("schedulePrecisionCompactBody")}</p>
          </div>
          <button
            type="button"
            onClick={handleConfigure}
            className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800"
            data-testid="teacher-schedule-precision-compact-cta"
          >
            {t("schedulePrecisionCompactCta")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
