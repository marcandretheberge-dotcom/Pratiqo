"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import {
  buildTimeOptionsForDaypart,
  daypartDefaultInterval,
  suggestNextDaypartInterval,
  validateDaypartIntervals,
  type ScheduleDaypart,
} from "@/lib/schedule/dayparts";
import type { ScheduleCellCopyTarget } from "@/lib/schedule/copyScheduleIntervals";
import type { WeeklyIntervalInput } from "@/lib/schedule/weeklyIntervals";
import { cn } from "@/lib/utils";

type DraftInterval = { localId: string; startTime: string; endTime: string };

function newLocalId(): string {
  return `iv-${Math.random().toString(36).slice(2, 10)}`;
}

type Props = {
  open: boolean;
  title: string;
  dayOfWeek: number;
  daypart: ScheduleDaypart;
  initialIntervals: WeeklyIntervalInput[];
  onClose: () => void;
  onApply: (intervals: WeeklyIntervalInput[]) => void;
  /** Weekly recurring copy targets — updates local draft only (no immediate save). */
  onCopy?: (intervals: WeeklyIntervalInput[], target: ScheduleCellCopyTarget) => void;
  sameWeekdayCopyLabel: string;
};

const ERROR_KEY: Record<string, TranslationKey> = {
  end_before_or_equal_start: "weeklyIntervalsEndAfterStart",
  overnight_not_allowed: "weeklyIntervalsEndAfterStart",
  overlapping_intervals: "weeklyIntervalsOverlap",
  duplicate_interval: "weeklyIntervalsOverlap",
  outside_daypart: "scheduleCellOutsideDaypart",
  invalid_time: "scheduleCellTimesRequired",
  empty_when_enabled: "scheduleCellEmptyWhenEnabled",
};

/**
 * Modal editor for precise intervals inside one Matin/Après-midi/Soir cell.
 * Weekly/recurring scope only — title must not include a calendar date.
 */
export function TeacherScheduleCellEditor({
  open,
  title,
  dayOfWeek,
  daypart,
  initialIntervals,
  onClose,
  onApply,
  onCopy,
  sameWeekdayCopyLabel,
}: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const errorId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const copyMenuRef = useRef<HTMLDivElement | null>(null);
  const timeOptions = useMemo(() => buildTimeOptionsForDaypart(daypart), [daypart]);
  const defaults = daypartDefaultInterval(daypart);

  const [enabled, setEnabled] = useState(true);
  const [drafts, setDrafts] = useState<DraftInterval[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopyOpen(false);
    if (initialIntervals.length > 0) {
      setEnabled(true);
      setDrafts(
        initialIntervals.map((iv) => ({
          localId: newLocalId(),
          startTime: iv.startTime,
          endTime: iv.endTime,
        })),
      );
    } else {
      setEnabled(true);
      setDrafts([
        {
          localId: newLocalId(),
          startTime: defaults.startTime,
          endTime: defaults.endTime,
        },
      ]);
    }
  }, [open, initialIntervals, defaults.startTime, defaults.endTime]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (copyOpen) {
          setCopyOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, copyOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button,input,select")?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!copyOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!copyMenuRef.current?.contains(e.target as Node)) setCopyOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [copyOpen]);

  const liveValidation = useMemo(() => {
    return validateDaypartIntervals({
      dayOfWeek,
      daypart,
      enabled,
      intervals: enabled
        ? drafts.map((d) => ({ startTime: d.startTime, endTime: d.endTime }))
        : [],
    });
  }, [dayOfWeek, daypart, enabled, drafts]);

  const errorKey: TranslationKey | null = liveValidation.ok
    ? null
    : (ERROR_KEY[liveValidation.error] ?? "weeklyIntervalsInvalidRange");
  const canApply = liveValidation.ok;

  if (!open) return null;

  const handleApply = () => {
    if (!liveValidation.ok) return;
    onApply(liveValidation.intervals);
  };

  const handleCopyTarget = (target: ScheduleCellCopyTarget) => {
    if (!liveValidation.ok || !onCopy) return;
    setCopyOpen(false);
    onCopy(liveValidation.intervals, target);
  };

  const addInterval = () => {
    setDrafts((prev) => {
      const suggested = suggestNextDaypartInterval(
        daypart,
        prev.map((d) => ({ startTime: d.startTime, endTime: d.endTime })),
      );
      if (suggested) {
        return [
          ...prev,
          {
            localId: newLocalId(),
            startTime: suggested.startTime,
            endTime: suggested.endTime,
          },
        ];
      }
      // No safe default — leave empty-ish by reusing daypart start/end edges for teacher to edit.
      const opts = buildTimeOptionsForDaypart(daypart);
      const start = opts[0] ?? defaults.startTime;
      const end = opts[Math.min(2, opts.length - 1)] ?? defaults.endTime;
      return [...prev, { localId: newLocalId(), startTime: start, endTime: end }];
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      data-testid="teacher-schedule-cell-editor-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={errorKey ? errorId : undefined}
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
        data-testid="teacher-schedule-cell-editor"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p id={titleId} className="text-sm font-bold text-[#2C2C2A]" data-testid="teacher-schedule-cell-editor-title">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{t("scheduleCellWeeklySubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            aria-label={t("bannerDismiss")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (e.target.checked && drafts.length === 0) {
                  setDrafts([
                    {
                      localId: newLocalId(),
                      startTime: defaults.startTime,
                      endTime: defaults.endTime,
                    },
                  ]);
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
              data-testid="teacher-schedule-cell-enable"
            />
            <span className="text-sm font-semibold text-slate-800">{t("scheduleCellEnableSlot")}</span>
          </label>

          {enabled ? (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                {t("scheduleCellPreciseRanges")}
              </p>
              {drafts.map((d) => (
                <div
                  key={d.localId}
                  className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3"
                  data-testid="teacher-schedule-cell-interval-row"
                >
                  <label className="min-w-[7rem] flex-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                    {t("weeklyIntervalsFrom")}
                    <select
                      value={d.startTime}
                      onChange={(e) => {
                        setDrafts((prev) =>
                          prev.map((x) =>
                            x.localId === d.localId ? { ...x, startTime: e.target.value } : x,
                          ),
                        );
                      }}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold"
                      aria-invalid={errorKey != null}
                    >
                      {timeOptions.map((opt) => (
                        <option key={`s-${opt}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-[7rem] flex-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                    {t("weeklyIntervalsTo")}
                    <select
                      value={d.endTime}
                      onChange={(e) => {
                        setDrafts((prev) =>
                          prev.map((x) =>
                            x.localId === d.localId ? { ...x, endTime: e.target.value } : x,
                          ),
                        );
                      }}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold"
                      aria-invalid={errorKey != null}
                    >
                      {timeOptions.map((opt) => (
                        <option key={`e-${opt}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((x) => x.localId !== d.localId))}
                    className="inline-flex h-11 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    aria-label={t("weeklyIntervalsRemove")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addInterval}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100"
                data-testid="teacher-schedule-cell-add-interval"
              >
                <Plus size={14} />
                {t("scheduleCellAddInterval")}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-600">{t("scheduleCellCountNone")}</p>
          )}

          {errorKey ? (
            <p
              id={errorId}
              className="text-xs font-medium text-red-700"
              data-testid="teacher-schedule-cell-editor-error"
              role="alert"
            >
              {t(errorKey)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          {onCopy ? (
            <div className="relative" ref={copyMenuRef}>
              <button
                type="button"
                onClick={() => setCopyOpen((v) => !v)}
                disabled={!canApply}
                aria-haspopup="menu"
                aria-expanded={copyOpen}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                data-testid="teacher-schedule-cell-copy-menu"
              >
                {t("scheduleCellCopyTo")}
                <ChevronDown size={16} aria-hidden />
              </button>
              {copyOpen ? (
                <ul
                  role="menu"
                  className="absolute bottom-full left-0 z-10 mb-1 min-w-[14rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  data-testid="teacher-schedule-cell-copy-menu-list"
                >
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-teal-50"
                      onClick={() => handleCopyTarget("same_weekday")}
                      data-testid="teacher-schedule-cell-copy-same-weekday"
                    >
                      {sameWeekdayCopyLabel}
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-teal-50"
                      onClick={() => handleCopyTarget("weekdays")}
                      data-testid="teacher-schedule-cell-copy-weekdays"
                    >
                      {t("scheduleCellCopyWeekdays")}
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-teal-50"
                      onClick={() => handleCopyTarget("every_day")}
                      data-testid="teacher-schedule-cell-copy-every-day"
                    >
                      {t("scheduleCellCopyEveryDay")}
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
              data-testid="teacher-schedule-cell-cancel"
            >
              {t("scheduleCellCancel")}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              data-testid="teacher-schedule-cell-apply"
              aria-disabled={!canApply}
            >
              {t("scheduleCellApply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeacherScheduleCellEditorBusy() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

export function cellEditorShellClass(locked: boolean, hasIntervals: boolean, booked: boolean) {
  return cn(
    "flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
    booked && "cursor-not-allowed border-[#F5C478] bg-[#FAEEDA]",
    locked && !booked && "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55",
    !locked && !hasIntervals && "border-dashed border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/40",
    !locked && hasIntervals && "border-teal-400 bg-teal-50 hover:bg-teal-100/70",
  );
}
