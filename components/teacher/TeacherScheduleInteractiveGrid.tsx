"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Save } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { formatLocalISODate } from "@/lib/slots";
import { isScheduleEditLockedByNotice, type ScheduleLockPeriod } from "@/lib/scheduleLockout";
import {
  intervalsForDaypart,
  replaceDaypartIntervals,
  slotLabelToDaypart,
  formatWeeklyScheduleCellTitle,
  type ScheduleDaypart,
} from "@/lib/schedule/dayparts";
import {
  cellConfiguredCountKey,
  cellOverflowCountKey,
  formatCellIntervalDisplay,
} from "@/lib/schedule/cellDisplay";
import { applyScheduleCellCopy, type ScheduleCellCopyTarget } from "@/lib/schedule/copyScheduleIntervals";
import { stableScheduleSnapshot } from "@/lib/schedule/scheduleSaveState";
import { scheduleSaveStatusFrom } from "@/lib/schedule/scheduleSaveState";
import { isTeacherScheduleStickySaveEnabled } from "@/lib/schedule/scheduleSaveFlags";
import { SCHEDULE_CONFIGURE_PRECISION_EVENT } from "@/lib/schedule/precisionScheduleBanner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { TeacherScheduleSaveBar } from "@/components/teacher/TeacherScheduleSaveBar";
import {
  TeacherScheduleCellEditor,
  cellEditorShellClass,
} from "@/components/teacher/TeacherScheduleCellEditor";
import type { WeeklyIntervalInput } from "@/lib/schedule/weeklyIntervals";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const SLOTS = ["Matin", "Après-midi", "Soir"] as const;

const DAY_TKEY: Record<(typeof DAYS)[number], TranslationKey> = {
  Lun: "mon",
  Mar: "tue",
  Mer: "wed",
  Jeu: "thu",
  Ven: "fri",
  Sam: "sat",
  Dim: "sun",
};

const SLOT_TKEY: Record<(typeof SLOTS)[number], TranslationKey> = {
  Matin: "morning",
  "Après-midi": "afternoon",
  Soir: "evening",
};

const SLOT_PERIOD: Record<(typeof SLOTS)[number], ScheduleLockPeriod> = {
  Matin: "matin",
  "Après-midi": "apresmidi",
  Soir: "soir",
};

/** Column index 0=Mon … 6=Sun → JS dayOfWeek (0=Sun). */
function columnToDayOfWeek(columnIndex: number): number {
  return columnIndex === 6 ? 0 : columnIndex + 1;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

type BookingLite = {
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
  status: string;
};

type Props = {
  bookings: BookingLite[];
  onDirtyChange?: (dirty: boolean) => void;
  onPreciseIntervalCountChange?: (count: number) => void;
};

/**
 * Interactive Matin/Après-midi/Soir grid with precise interval modal editor.
 * Persists via /api/teacher/weekly-intervals (same source of truth as PR 17A).
 */
export function TeacherScheduleInteractiveGrid({
  bookings,
  onDirtyChange,
  onPreciseIntervalCountChange,
}: Props) {
  const { t, locale } = useLocale();
  const stickyEnabled = isTeacherScheduleStickySaveEnabled();
  const dateLocale = locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA";

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [intervals, setIntervals] = useState<WeeklyIntervalInput[]>([]);
  const [baseline, setBaseline] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const [editor, setEditor] = useState<{
    dayOfWeek: number;
    daypart: ScheduleDaypart;
    columnIndex: number;
    slot: (typeof SLOTS)[number];
    title: string;
  } | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);

  const formatDayMonthLabel = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short" })
        .format(date)
        .replace(/\.$/, "")
        .toUpperCase(),
    [dateLocale],
  );

  const weekRangeLabel = useMemo(
    () => `${formatDayMonthLabel(weekAnchor)} – ${formatDayMonthLabel(addDays(weekAnchor, 6))}`,
    [formatDayMonthLabel, weekAnchor],
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const applyLoaded = useCallback(
    (next: WeeklyIntervalInput[]) => {
      setIntervals(next);
      setBaseline(stableScheduleSnapshot(next));
      setDirty(false);
      onDirtyChange?.(false);
      onPreciseIntervalCountChange?.(next.length);
      setFlashOk(false);
      setSaveError(false);
    },
    [onDirtyChange, onPreciseIntervalCountChange],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/teacher/weekly-intervals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { intervals?: WeeklyIntervalInput[]; error?: string };
      if (!res.ok) throw new Error(json.error || "load_failed");
      applyLoaded(Array.isArray(json.intervals) ? json.intervals : []);
    } catch {
      setErrorKey("weeklyIntervalsLoadError");
    } finally {
      setLoading(false);
    }
  }, [applyLoaded, getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const nextDirty = stableScheduleSnapshot(intervals) !== baseline && baseline !== "";
    setDirty(nextDirty);
    onDirtyChange?.(nextDirty);
    onPreciseIntervalCountChange?.(intervals.length);
  }, [intervals, baseline, onDirtyChange, onPreciseIntervalCountChange]);

  useUnsavedChangesWarning(dirty, stickyEnabled);

  const activeBooking = (b: BookingLite) => !["cancelled", "cancelled_conflict", "completed"].includes(b.status);

  const cellHasBooking = (dayColumnIndex: number, slotFr: (typeof SLOTS)[number]): boolean => {
    const iso = formatLocalISODate(weekDays[dayColumnIndex] ?? weekAnchor);
    const period = SLOT_PERIOD[slotFr];
    return bookings.some((b) => {
      const ds = (b.slot_date || b.date) as string | null;
      if (ds !== iso) return false;
      if (!activeBooking(b)) return false;
      const ts = b.time_slot || b.time;
      if (!ts) return false;
      const m = ts.match(/^(\d{1,2})h/);
      if (!m) return false;
      const h = Number(m[1]);
      if (period === "matin") return h >= 8 && h < 12;
      if (period === "apresmidi") return h >= 12 && h < 17;
      return h >= 17 && h < 21;
    });
  };

  const cellLockedByNotice = (dayColumnIndex: number, slotFr: (typeof SLOTS)[number]): boolean => {
    const iso = formatLocalISODate(weekDays[dayColumnIndex] ?? weekAnchor);
    return isScheduleEditLockedByNotice(iso, SLOT_PERIOD[slotFr]);
  };

  const openCell = (columnIndex: number, slot: (typeof SLOTS)[number]) => {
    const booked = cellHasBooking(columnIndex, slot);
    const notice = cellLockedByNotice(columnIndex, slot);
    if (booked || notice) {
      setLockedMessage(t("scheduleCellLockedReadonly"));
      return;
    }
    setLockedMessage(null);
    const dayOfWeek = columnToDayOfWeek(columnIndex);
    const daypart = slotLabelToDaypart(slot);
    const fullDayKeys: TranslationKey[] = [
      "dayMonday",
      "dayTuesday",
      "dayWednesday",
      "dayThursday",
      "dayFriday",
      "daySaturday",
      "daySunday",
    ];
    const dayName = t(fullDayKeys[columnIndex]!);
    const partName = t(SLOT_TKEY[slot]);
    setEditor({
      dayOfWeek,
      daypart,
      columnIndex,
      slot,
      // Weekly recurring scope — never include a calendar date here.
      title: formatWeeklyScheduleCellTitle(dayName, partName, t("scheduleCellWeeklyScope")),
    });
  };

  const openFirstEditableCell = useCallback(() => {
    for (let di = 0; di < DAYS.length; di++) {
      for (const s of SLOTS) {
        if (cellHasBooking(di, s) || cellLockedByNotice(di, s)) continue;
        openCell(di, s);
        return;
      }
    }
  }, [weekDays, weekAnchor, bookings, t, dateLocale]);

  useEffect(() => {
    const onConfigure = () => openFirstEditableCell();
    window.addEventListener(SCHEDULE_CONFIGURE_PRECISION_EVENT, onConfigure);
    return () => window.removeEventListener(SCHEDULE_CONFIGURE_PRECISION_EVENT, onConfigure);
  }, [openFirstEditableCell]);

  const editorIntervals = editor
    ? intervalsForDaypart(intervals, editor.dayOfWeek, editor.daypart)
    : [];

  const weekdayCopyLabel = useMemo(() => {
    if (!editor) return "";
    const fullDayKeys: TranslationKey[] = [
      "dayMonday",
      "dayTuesday",
      "dayWednesday",
      "dayThursday",
      "dayFriday",
      "daySaturday",
      "daySunday",
    ];
    const dayName = t(fullDayKeys[editor.columnIndex]!).toLowerCase();
    return t("scheduleCellCopySameWeekdayOption").replace("{day}", dayName);
  }, [editor, t]);

  const handleApply = (cellIntervals: WeeklyIntervalInput[]) => {
    if (!editor) return;
    setIntervals((prev) => replaceDaypartIntervals(prev, editor.dayOfWeek, editor.daypart, cellIntervals));
    setEditor(null);
    setFlashOk(false);
    setSaveError(false);
  };

  const handleCopy = (cellIntervals: WeeklyIntervalInput[], target: ScheduleCellCopyTarget) => {
    if (!editor) return;
    setIntervals((prev) =>
      applyScheduleCellCopy({
        all: prev,
        sourceDayOfWeek: editor.dayOfWeek,
        daypart: editor.daypart,
        cellIntervals,
        target,
      }),
    );
    setEditor(null);
    setFlashOk(false);
    setSaveError(false);
  };

  const save = async (): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) return false;
    setSaving(true);
    setErrorKey(null);
    setSaveError(false);
    try {
      const res = await fetch("/api/teacher/weekly-intervals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intervals }),
      });
      const json = (await res.json().catch(() => ({}))) as { intervals?: WeeklyIntervalInput[]; error?: string };
      if (!res.ok) {
        setErrorKey(
          json.error === "weekly_intervals_disabled"
            ? "schedulePreciseDisabledTitle"
            : "weeklyIntervalsSaveError",
        );
        setSaveError(true);
        return false;
      }
      applyLoaded(Array.isArray(json.intervals) ? json.intervals : intervals);
      setFlashOk(true);
      return true;
    } catch {
      setErrorKey("weeklyIntervalsSaveError");
      setSaveError(true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    void load();
  };

  const saveStatus = scheduleSaveStatusFrom({
    dirty,
    saving,
    error: saveError,
    justSaved: flashOk,
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="teacher-schedule-interactive-grid">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("gridWeeklyTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{t("scheduleCellGridHelper")}</p>
            <p className="mt-1 text-xs leading-5 font-semibold text-amber-900">{t("scheduleLockedNotice")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{t("weeklyIntervalsTeacherChooses")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              <ChevronLeft size={15} />
              {t("weekNavPrev")}
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor(startOfWeekMonday(new Date()))}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100 sm:flex-none"
            >
              {t("weekToday")}
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              {t("weekNavNext")}
              <ChevronRight size={15} />
            </button>
            <span className="w-full text-center text-xs font-bold uppercase tracking-wide text-slate-500 sm:ml-auto sm:w-auto sm:text-left">
              {weekRangeLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-[#2C2C2A]">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-dashed border-slate-300 bg-white" /> {t("scheduleCellLegendAdd")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-teal-400 bg-teal-50" /> {t("legendAvailable")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#FAEEDA] border border-[#F5C478]" /> {t("legendBooked")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-50 opacity-60" /> {t("legendLockedNotice")}
          </span>
        </div>

        <div className="-mx-1 overflow-x-auto px-1" data-testid="teacher-schedule-interactive-scroll">
          <div className="min-w-[640px] grid grid-cols-[120px_repeat(7,1fr)] gap-2">
            <div />
            {DAYS.map((d, di) => (
              <div key={d} className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {t(DAY_TKEY[d])}{" "}
                <span className="block font-semibold text-slate-600">
                  {weekDays[di] ? formatDayMonthLabel(weekDays[di]!) : ""}
                </span>
              </div>
            ))}
            {SLOTS.map((s) => (
              <React.Fragment key={s}>
                <div className="text-sm font-semibold text-slate-700">{t(SLOT_TKEY[s])}</div>
                {DAYS.map((d, di) => {
                  const dayOfWeek = columnToDayOfWeek(di);
                  const daypart = slotLabelToDaypart(s);
                  const cellIv = intervalsForDaypart(intervals, dayOfWeek, daypart);
                  const display = formatCellIntervalDisplay(cellIv);
                  const booked = cellHasBooking(di, s);
                  const notice = cellLockedByNotice(di, s);
                  const locked = booked || notice;
                  const dayName = t(DAY_TKEY[d]);
                  const partName = t(SLOT_TKEY[s]);
                  const aria =
                    locked
                      ? t("scheduleCellLockedReadonly")
                      : display.lines.length === 0
                        ? t("scheduleCellAddAria").replace("{day}", dayName).replace("{part}", partName)
                        : `${dayName} ${partName}: ${display.lines.join(", ")}`;
                  const titleAttr =
                    display.lines.length > 0
                      ? display.lines.join("\n")
                      : locked
                        ? t("scheduleCellLockedReadonly")
                        : t("scheduleCellAdd");
                  return (
                    <button
                      key={`${d}-${s}`}
                      type="button"
                      onClick={() => openCell(di, s)}
                      className={cellEditorShellClass(locked, display.lines.length > 0, booked)}
                      aria-label={aria}
                      title={titleAttr}
                      data-testid={`teacher-schedule-cell-${d}-${SLOT_PERIOD[s]}`}
                      data-configured={display.lines.length > 0 ? "true" : undefined}
                    >
                      {display.lines.length === 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500">
                          <Plus size={12} aria-hidden />
                          {t("scheduleCellAdd")}
                        </span>
                      ) : (
                        <span className="flex w-full flex-col items-center gap-0.5 px-0.5">
                          {display.visible.map((line) => (
                            <span
                              key={line}
                              className="max-w-full truncate rounded-md bg-teal-100/90 px-1 py-0.5 text-[10px] font-bold leading-tight text-teal-900 sm:text-[11px]"
                              data-testid="teacher-schedule-cell-time-pill"
                            >
                              {line}
                            </span>
                          ))}
                          {display.overflow > 0 ? (
                            <span
                              className="rounded-md bg-teal-50 px-1 py-0.5 text-[9px] font-semibold text-teal-800"
                              data-testid="teacher-schedule-cell-overflow"
                            >
                              {t(cellOverflowCountKey(display.overflow)).replace(
                                "{count}",
                                String(display.overflow),
                              )}
                            </span>
                          ) : null}
                        </span>
                      )}
                      {display.lines.length > 1 ? (
                        <span className="sr-only">
                          {t(cellConfiguredCountKey(display.lines.length)).replace(
                            "{count}",
                            String(display.lines.length),
                          )}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {lockedMessage ? (
          <p className="text-xs font-medium text-amber-900" role="status" data-testid="teacher-schedule-cell-locked-msg">
            {lockedMessage}
          </p>
        ) : null}

        {errorKey ? (
          <p className="text-xs font-medium text-red-700" data-testid="teacher-schedule-interactive-error">
            {t(errorKey)}
          </p>
        ) : null}

        {!stickyEnabled ? (
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-600 px-8 text-sm font-semibold text-white hover:brightness-[0.98] disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? t("scheduleSaveSaving") : t("scheduleSaveCta")}
          </button>
        ) : null}
      </div>

      {stickyEnabled ? (
        <TeacherScheduleSaveBar
          status={saveStatus}
          dirty={dirty}
          saving={saving}
          onSave={() => void save()}
          onDiscard={discard}
          testId="teacher-schedule-interactive-save-bar"
        />
      ) : null}

      <TeacherScheduleCellEditor
        open={editor != null}
        title={editor?.title ?? ""}
        dayOfWeek={editor?.dayOfWeek ?? 1}
        daypart={editor?.daypart ?? "matin"}
        initialIntervals={editorIntervals}
        onClose={() => setEditor(null)}
        onApply={handleApply}
        onCopy={handleCopy}
        sameWeekdayCopyLabel={weekdayCopyLabel}
      />
    </div>
  );
}
