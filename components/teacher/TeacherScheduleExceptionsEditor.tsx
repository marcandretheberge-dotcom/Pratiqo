"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Save, Trash2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { formatLocalISODate } from "@/lib/slots";
import {
  WEEKLY_INTERVAL_STEP_MINUTES,
  type ScheduleExceptionType,
} from "@/lib/schedule/dateExceptions";
import { isTeacherScheduleStickySaveEnabled } from "@/lib/schedule/scheduleSaveFlags";
import { stableScheduleSnapshot } from "@/lib/schedule/scheduleSaveState";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { cn } from "@/lib/utils";

type ExceptionDto = {
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

type Mode = "regular" | "unavailable_full_day" | "available_custom_hours";

function buildTimeOptions(): string[] {
  const out: string[] = [];
  for (let m = 0; m <= 24 * 60 - WEEKLY_INTERVAL_STEP_MINUTES; m += WEEKLY_INTERVAL_STEP_MINUTES) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return out;
}

const TIME_OPTIONS = buildTimeOptions();

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday-first weekday index 0..6 for a JS Date. */
function mondayFirstIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function TeacherScheduleExceptionsEditor({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  const { t, locale } = useLocale();
  const stickyEnabled = isTeacherScheduleStickySaveEnabled();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [exceptions, setExceptions] = useState<ExceptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("regular");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "deleted">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [panelBaseline, setPanelBaseline] = useState("");
  const [dirty, setDirty] = useState(false);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const monthLabel = useMemo(() => {
    return monthAnchor.toLocaleDateString(locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA", {
      month: "long",
      year: "numeric",
    });
  }, [monthAnchor, locale]);

  const range = useMemo(() => {
    const from = formatLocalISODate(monthAnchor);
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), daysInMonth(monthAnchor));
    const to = formatLocalISODate(last);
    return { from, to };
  }, [monthAnchor]);

  const byDate = useMemo(() => {
    const map = new Map<string, ExceptionDto>();
    for (const ex of exceptions) map.set(ex.exceptionDate, ex);
    return map;
  }, [exceptions]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(
        `/api/teacher/schedule-exceptions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = (await res.json().catch(() => ({}))) as { exceptions?: ExceptionDto[]; error?: string };
      if (!res.ok) throw new Error(json.error || "load_failed");
      setExceptions(Array.isArray(json.exceptions) ? json.exceptions : []);
    } catch {
      setErrorText(t("scheduleExceptionsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, range.from, range.to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDate = (iso: string) => {
    setSelectedDate(iso);
    setSaveState("idle");
    setErrorText(null);
    const existing = byDate.get(iso);
    let nextMode: Mode = "regular";
    let nextStart = "09:00";
    let nextEnd = "12:00";
    let nextNote = "";
    if (existing?.exceptionType === "unavailable_full_day") {
      nextMode = "unavailable_full_day";
      nextNote = existing.note || "";
    } else if (existing?.exceptionType === "available_custom_hours") {
      nextMode = "available_custom_hours";
      nextStart = existing.startTime || "09:00";
      nextEnd = existing.endTime || "12:00";
      nextNote = existing.note || "";
    }
    setMode(nextMode);
    setStartTime(nextStart);
    setEndTime(nextEnd);
    setNote(nextNote);
    setPanelBaseline(
      stableScheduleSnapshot({
        mode: nextMode,
        startTime: nextStart,
        endTime: nextEnd,
        note: nextNote,
      }),
    );
    setDirty(false);
    onDirtyChange?.(false);
  };

  useEffect(() => {
    if (!selectedDate || !panelBaseline) {
      setDirty(false);
      onDirtyChange?.(false);
      return;
    }
    const next = stableScheduleSnapshot({
      mode,
      startTime,
      endTime,
      note,
    });
    const nextDirty = next !== panelBaseline;
    setDirty(nextDirty);
    onDirtyChange?.(nextDirty);
  }, [selectedDate, panelBaseline, mode, startTime, endTime, note, onDirtyChange]);

  useUnsavedChangesWarning(dirty, stickyEnabled);

  const save = async () => {
    if (!selectedDate) return;
    const token = await getAccessToken();
    if (!token) return;

    if (mode === "regular") {
      setSaveState("saving");
      try {
        const res = await fetch("/api/teacher/schedule-exceptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ exceptionDate: selectedDate }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setErrorText(json.error || t("scheduleExceptionsSaveError"));
          setSaveState("error");
          return;
        }
        setSaveState("deleted");
        setPanelBaseline(
          stableScheduleSnapshot({
            mode: "regular",
            startTime: "09:00",
            endTime: "12:00",
            note: "",
          }),
        );
        setMode("regular");
        setNote("");
        setDirty(false);
        onDirtyChange?.(false);
        await load();
      } catch {
        setErrorText(t("scheduleExceptionsSaveError"));
        setSaveState("error");
      }
      return;
    }

    setSaveState("saving");
    setErrorText(null);
    try {
      const res = await fetch("/api/teacher/schedule-exceptions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exceptionDate: selectedDate,
          exceptionType: mode,
          startTime: mode === "available_custom_hours" ? startTime : null,
          endTime: mode === "available_custom_hours" ? endTime : null,
          note: note.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const map: Record<string, string> = {
          end_before_or_equal_start: t("weeklyIntervalsEndAfterStart"),
          overnight_not_allowed: t("weeklyIntervalsEndAfterStart"),
          invalid_time_range: t("weeklyIntervalsInvalidRange"),
          custom_hours_require_times: t("weeklyIntervalsInvalidRange"),
        };
        setErrorText(map[json.error ?? ""] || t("scheduleExceptionsSaveError"));
        setSaveState("error");
        return;
      }
      setSaveState("saved");
      setPanelBaseline(
        stableScheduleSnapshot({
          mode,
          startTime,
          endTime,
          note,
        }),
      );
      setDirty(false);
      onDirtyChange?.(false);
      await load();
    } catch {
      setErrorText(t("scheduleExceptionsSaveError"));
      setSaveState("error");
    }
  };

  const cells = useMemo(() => {
    const total = daysInMonth(monthAnchor);
    const pad = mondayFirstIndex(monthAnchor);
    const today = formatLocalISODate(new Date());
    const out: Array<{ iso: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < pad; i++) out.push({ iso: null, dayNum: null });
    for (let d = 1; d <= total; d++) {
      const dt = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), d);
      const iso = formatLocalISODate(dt);
      out.push({ iso, dayNum: d });
    }
    return { out, today };
  }, [monthAnchor]);

  const upcoming = useMemo(() => {
    const today = formatLocalISODate(new Date());
    return [...exceptions]
      .filter((ex) => ex.exceptionDate >= today)
      .sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate))
      .slice(0, 8);
  }, [exceptions]);

  return (
    <div className="space-y-4" data-testid="teacher-schedule-exceptions-editor">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-bold text-[#2C2C2A]">{t("scheduleExceptionsTitle")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t("scheduleExceptionsHelper")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("weeklyIntervalsTeacherChooses")}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
            aria-label={t("weekNavPrev")}
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-[10rem] text-center text-sm font-bold capitalize text-slate-800">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
            aria-label={t("weekNavNext")}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1" data-testid="teacher-schedule-exceptions-calendar">
              {cells.out.map((cell, idx) => {
                if (!cell.iso) return <div key={`pad-${idx}`} className="h-11" />;
                const ex = byDate.get(cell.iso);
                const selected = selectedDate === cell.iso;
                const isPast = cell.iso < cells.today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={isPast}
                    onClick={() => openDate(cell.iso!)}
                    className={cn(
                      "relative flex h-11 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                      isPast && "cursor-not-allowed opacity-40",
                      selected && "border-teal-500 bg-teal-50 text-teal-900",
                      !selected && !isPast && "border-slate-100 bg-slate-50 hover:border-slate-300",
                    )}
                    data-testid={`schedule-exception-day-${cell.iso}`}
                  >
                    {cell.dayNum}
                    {ex?.exceptionType === "unavailable_full_day" ? (
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" title={t("scheduleExceptionsDayBlocked")} />
                    ) : null}
                    {ex?.exceptionType === "available_custom_hours" ? (
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" title={t("scheduleExceptionsHoursAdjusted")} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedDate ? (
        <div
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          data-testid="teacher-schedule-exception-panel"
        >
          <p className="text-sm font-bold text-[#2C2C2A]">
            {selectedDate} — {t("scheduleExceptionsChooseMode")}
          </p>
          <div className="space-y-2">
            {(
              [
                ["regular", "scheduleExceptionsModeRegular"],
                ["unavailable_full_day", "scheduleExceptionsModeBlockDay"],
                ["available_custom_hours", "scheduleExceptionsModeCustomHours"],
              ] as const
            ).map(([value, key]) => (
              <label key={value} className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="exception-mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {t(key)}
              </label>
            ))}
          </div>

          {mode === "regular" ? (
            <p className="text-xs text-slate-600">{t("scheduleExceptionsModeRegularHelp")}</p>
          ) : null}

          {mode === "available_custom_hours" ? (
            <div className="flex flex-wrap gap-3">
              <label className="text-xs font-semibold text-slate-600">
                {t("weeklyIntervalsFrom")}
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-sm font-semibold"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                {t("weeklyIntervalsTo")}
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-sm font-semibold"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <label className="block text-xs font-semibold text-slate-600">
            {t("scheduleExceptionsPrivateNote")}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("scheduleExceptionsPrivateNoteHint")}
            />
            <span className="mt-1 block font-normal text-slate-500">{t("scheduleExceptionsPrivateNotePrivacy")}</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saveState === "saving"}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
              data-testid="teacher-schedule-exception-save"
            >
              {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
              {mode === "regular" ? t("scheduleExceptionsDelete") : t("scheduleExceptionsSave")}
            </button>
            {byDate.has(selectedDate) && mode !== "regular" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("regular");
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
              >
                <Trash2 size={14} />
                {t("scheduleExceptionsClearToRegular")}
              </button>
            ) : null}
          </div>

          {saveState === "saved" ? (
            <p className="text-xs font-medium text-teal-700">{t("scheduleExceptionsSaved")}</p>
          ) : null}
          {saveState === "deleted" ? (
            <p className="text-xs font-medium text-teal-700">{t("scheduleExceptionsDeleted")}</p>
          ) : null}
          {errorText ? <p className="text-xs font-medium text-red-700">{errorText}</p> : null}
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="teacher-schedule-exceptions-upcoming">
          <p className="text-sm font-bold text-[#2C2C2A]">{t("scheduleExceptionsUpcoming")}</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {upcoming.map((ex) => (
              <li key={ex.exceptionDate}>
                {ex.exceptionDate} —{" "}
                {ex.exceptionType === "unavailable_full_day"
                  ? t("scheduleExceptionsDayBlocked")
                  : `${ex.startTime}–${ex.endTime} (${t("scheduleExceptionsHoursAdjusted")})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
