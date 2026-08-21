"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  validateWeeklyIntervalSet,
  WEEKLY_INTERVAL_STEP_MINUTES,
  type WeeklyIntervalInput,
} from "@/lib/schedule/weeklyIntervals";
import {
  isTeacherScheduleAutosaveEnabled,
  isTeacherScheduleStickySaveEnabled,
  SCHEDULE_AUTOSAVE_DEBOUNCE_MS,
} from "@/lib/schedule/scheduleSaveFlags";
import { scheduleSaveStatusFrom } from "@/lib/schedule/scheduleSaveState";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { TeacherScheduleSaveBar } from "@/components/teacher/TeacherScheduleSaveBar";

/** Display order Mon→Sun; dayOfWeek still uses JS Sunday=0. */
const DAY_ORDER: Array<{ dayOfWeek: number; labelKey: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" }> = [
  { dayOfWeek: 1, labelKey: "mon" },
  { dayOfWeek: 2, labelKey: "tue" },
  { dayOfWeek: 3, labelKey: "wed" },
  { dayOfWeek: 4, labelKey: "thu" },
  { dayOfWeek: 5, labelKey: "fri" },
  { dayOfWeek: 6, labelKey: "sat" },
  { dayOfWeek: 0, labelKey: "sun" },
];

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

type LocalInterval = { localId: string; startTime: string; endTime: string };

function newLocalId(): string {
  return `iv-${Math.random().toString(36).slice(2, 10)}`;
}

type Props = {
  /** True when teacher still has legacy Matin/Après-midi/Soir cells and no intervals yet. */
  hasLegacyBlocks: boolean;
  /** Notifies parent when saved/loaded precise interval count changes (for migration banner). */
  onPreciseIntervalCountChange?: (count: number) => void;
  /** Notifies parent when unsaved interval edits change (page-level save coordination). */
  onDirtyChange?: (dirty: boolean) => void;
};

export function TeacherWeeklyIntervalsEditor({
  hasLegacyBlocks,
  onPreciseIntervalCountChange,
  onDirtyChange,
}: Props) {
  const { t } = useLocale();
  const stickyEnabled = isTeacherScheduleStickySaveEnabled();
  const autosaveEnabled = isTeacherScheduleAutosaveEnabled();
  const [byDay, setByDay] = useState<Record<number, LocalInterval[]>>(() => {
    const init: Record<number, LocalInterval[]> = {};
    for (const d of DAY_ORDER) init[d.dayOfWeek] = [];
    return init;
  });
  const [dayEnabled, setDayEnabled] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const d of DAY_ORDER) init[d.dayOfWeek] = false;
    return init;
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [dirty, setDirty] = useState(false);
  const [baseline, setBaseline] = useState("");
  const [autosaveFlash, setAutosaveFlash] = useState(false);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const applyLoaded = useCallback((intervals: WeeklyIntervalInput[]) => {
    const nextByDay: Record<number, LocalInterval[]> = {};
    const nextEnabled: Record<number, boolean> = {};
    for (const d of DAY_ORDER) {
      nextByDay[d.dayOfWeek] = [];
      nextEnabled[d.dayOfWeek] = false;
    }
    for (const iv of intervals) {
      nextByDay[iv.dayOfWeek] = nextByDay[iv.dayOfWeek] ?? [];
      nextByDay[iv.dayOfWeek]!.push({
        localId: newLocalId(),
        startTime: iv.startTime,
        endTime: iv.endTime,
      });
      nextEnabled[iv.dayOfWeek] = true;
    }
    setByDay(nextByDay);
    setDayEnabled(nextEnabled);
    const payload = JSON.stringify(
      intervals
        .map((iv) => ({ dayOfWeek: iv.dayOfWeek, startTime: iv.startTime, endTime: iv.endTime }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
    );
    setBaseline(payload);
    setDirty(false);
    onPreciseIntervalCountChange?.(intervals.length);
  }, [onPreciseIntervalCountChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        const res = await fetch("/api/teacher/weekly-intervals", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = (await res.json().catch(() => ({}))) as { intervals?: WeeklyIntervalInput[] };
        if (cancelled) return;
        applyLoaded(Array.isArray(json.intervals) ? json.intervals : []);
      } catch {
        if (!cancelled) setErrorKey("weeklyIntervalsLoadError");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, applyLoaded]);

  const currentPayload = useMemo((): WeeklyIntervalInput[] => {
    const out: WeeklyIntervalInput[] = [];
    for (const d of DAY_ORDER) {
      if (!dayEnabled[d.dayOfWeek]) continue;
      for (const iv of byDay[d.dayOfWeek] ?? []) {
        out.push({ dayOfWeek: d.dayOfWeek, startTime: iv.startTime, endTime: iv.endTime });
      }
    }
    return out;
  }, [byDay, dayEnabled]);

  useEffect(() => {
    const serialized = JSON.stringify(
      [...currentPayload].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
      ),
    );
    const nextDirty = serialized !== baseline;
    setDirty(nextDirty);
    onDirtyChange?.(nextDirty);
  }, [currentPayload, baseline, onDirtyChange]);

  useUnsavedChangesWarning(dirty, stickyEnabled);

  const markChanged = () => {
    setSaveState("idle");
    setErrorKey(null);
    setAutosaveFlash(false);
  };

  const toggleDay = (dayOfWeek: number, enabled: boolean) => {
    markChanged();
    setDayEnabled((prev) => ({ ...prev, [dayOfWeek]: enabled }));
    if (enabled) {
      setByDay((prev) => {
        const list = prev[dayOfWeek] ?? [];
        if (list.length > 0) return prev;
        return {
          ...prev,
          [dayOfWeek]: [{ localId: newLocalId(), startTime: "09:00", endTime: "11:00" }],
        };
      });
    }
  };

  const addInterval = (dayOfWeek: number) => {
    markChanged();
    setByDay((prev) => ({
      ...prev,
      [dayOfWeek]: [...(prev[dayOfWeek] ?? []), { localId: newLocalId(), startTime: "14:00", endTime: "16:00" }],
    }));
    setDayEnabled((prev) => ({ ...prev, [dayOfWeek]: true }));
  };

  const removeInterval = (dayOfWeek: number, localId: string) => {
    markChanged();
    setByDay((prev) => {
      const next = (prev[dayOfWeek] ?? []).filter((iv) => iv.localId !== localId);
      return { ...prev, [dayOfWeek]: next };
    });
  };

  const updateInterval = (
    dayOfWeek: number,
    localId: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    markChanged();
    setByDay((prev) => ({
      ...prev,
      [dayOfWeek]: (prev[dayOfWeek] ?? []).map((iv) =>
        iv.localId === localId ? { ...iv, [field]: value } : iv,
      ),
    }));
  };

  const save = async (opts?: { fromAutosave?: boolean }): Promise<boolean> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;
    const validated = validateWeeklyIntervalSet(currentPayload);
    if (!validated.ok) {
      if (opts?.fromAutosave) return false;
      const map: Partial<Record<string, TranslationKey>> = {
        end_before_or_equal_start: "weeklyIntervalsEndAfterStart",
        overnight_not_allowed: "weeklyIntervalsEndAfterStart",
        overlapping_intervals: "weeklyIntervalsOverlap",
        duplicate_interval: "weeklyIntervalsOverlap",
        invalid_time: "weeklyIntervalsInvalidRange",
        invalid_day: "weeklyIntervalsInvalidRange",
        not_quarter_hour: "weeklyIntervalsInvalidRange",
      };
      setErrorKey(map[validated.error] ?? "weeklyIntervalsInvalidRange");
      setSaveState("error");
      return false;
    }

    setSaveState("saving");
    setErrorKey(null);
    try {
      const res = await fetch("/api/teacher/weekly-intervals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intervals: validated.intervals.map((iv) => ({
            dayOfWeek: iv.dayOfWeek,
            startTime: iv.startTime,
            endTime: iv.endTime,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; intervals?: WeeklyIntervalInput[] };
      if (!res.ok) {
        const map: Partial<Record<string, TranslationKey>> = {
          overlapping_intervals: "weeklyIntervalsOverlap",
          end_before_or_equal_start: "weeklyIntervalsEndAfterStart",
          overnight_not_allowed: "weeklyIntervalsEndAfterStart",
          weekly_intervals_disabled: "weeklyIntervalsDisabled",
        };
        setErrorKey(map[json.error ?? ""] ?? "weeklyIntervalsSaveError");
        setSaveState("error");
        return false;
      }
      applyLoaded(Array.isArray(json.intervals) ? json.intervals : validated.intervals);
      setSaveState("saved");
      if (opts?.fromAutosave) setAutosaveFlash(true);
      return true;
    } catch {
      setErrorKey("weeklyIntervalsSaveError");
      setSaveState("error");
      return false;
    }
  };

  const discard = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) return;
    setSaveState("idle");
    setErrorKey(null);
    try {
      const res = await fetch("/api/teacher/weekly-intervals", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json().catch(() => ({}))) as { intervals?: WeeklyIntervalInput[] };
      applyLoaded(Array.isArray(json.intervals) ? json.intervals : []);
    } catch {
      setErrorKey("weeklyIntervalsLoadError");
    }
  };

  useEffect(() => {
    if (!autosaveEnabled || !dirty || loading) return;
    const validated = validateWeeklyIntervalSet(currentPayload);
    if (!validated.ok) return;
    const timer = window.setTimeout(() => {
      void save({ fromAutosave: true });
    }, SCHEDULE_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on dirty payload only
  }, [autosaveEnabled, dirty, loading, currentPayload]);

  const saveStatus = scheduleSaveStatusFrom({
    dirty,
    saving: saveState === "saving",
    error: saveState === "error",
    justSaved: saveState === "saved",
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
    <div
      id="teacher-weekly-intervals-editor"
      className={cn("space-y-4", stickyEnabled && "pb-24")}
      data-testid="teacher-weekly-intervals-editor"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-bold text-[#2C2C2A]">{t("weeklyIntervalsTitle")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t("weeklyIntervalsHelper")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t("weeklyIntervalsTeacherChooses")}</p>
        {hasLegacyBlocks && currentPayload.length === 0 ? (
          <p
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
            data-testid="teacher-weekly-intervals-legacy-prompt"
          >
            {t("weeklyIntervalsLegacyPrompt")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {DAY_ORDER.map(({ dayOfWeek, labelKey }) => {
          const enabled = Boolean(dayEnabled[dayOfWeek]);
          const intervals = byDay[dayOfWeek] ?? [];
          return (
            <div
              key={dayOfWeek}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              data-testid={`weekly-interval-day-${dayOfWeek}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-bold text-[#2C2C2A]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => toggleDay(dayOfWeek, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                    data-testid={`weekly-interval-day-toggle-${dayOfWeek}`}
                  />
                  {t(labelKey)}
                </label>
                {!enabled ? (
                  <span className="text-xs font-medium text-slate-500">{t("weeklyIntervalsDayUnavailable")}</span>
                ) : null}
              </div>

              {enabled ? (
                <div className="mt-3 space-y-2">
                  {intervals.map((iv) => (
                    <div
                      key={iv.localId}
                      className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2"
                      data-testid={`weekly-interval-row-${dayOfWeek}-${iv.localId}`}
                    >
                      <label className="text-xs font-semibold text-slate-600">
                        {t("weeklyIntervalsFrom")}
                        <select
                          value={iv.startTime}
                          onChange={(e) => updateInterval(dayOfWeek, iv.localId, "startTime", e.target.value)}
                          className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold"
                          data-testid={`weekly-interval-start-${dayOfWeek}`}
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
                          value={iv.endTime}
                          onChange={(e) => updateInterval(dayOfWeek, iv.localId, "endTime", e.target.value)}
                          className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold"
                          data-testid={`weekly-interval-end-${dayOfWeek}`}
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeInterval(dayOfWeek, iv.localId)}
                        className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        aria-label={t("weeklyIntervalsRemove")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addInterval(dayOfWeek)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100"
                    data-testid={`weekly-interval-add-${dayOfWeek}`}
                  >
                    <Plus size={14} />
                    {t("weeklyIntervalsAddRange")}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {stickyEnabled ? (
        <TeacherScheduleSaveBar
          status={saveStatus}
          dirty={dirty}
          saving={saveState === "saving"}
          onSave={() => void save()}
          onDiscard={() => void discard()}
          autosaveActive={autosaveEnabled && (saveState === "saving" || autosaveFlash)}
          testId="teacher-weekly-intervals-save-bar"
        />
      ) : (
        <div
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur"
          data-testid="teacher-weekly-intervals-save-bar"
        >
          <p className="text-xs font-medium text-slate-600">
            {dirty ? t("weeklyIntervalsUnsaved") : saveState === "saved" ? t("weeklyIntervalsSaved") : "\u00a0"}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveState === "saving" || !dirty}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            data-testid="teacher-weekly-intervals-save"
          >
            {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            {t("weeklyIntervalsSave")}
          </button>
        </div>
      )}

      {autosaveFlash && !dirty ? (
        <p className="text-xs font-medium text-teal-700" data-testid="teacher-weekly-intervals-autosaved">
          {t("scheduleSaveAutosaved")}
        </p>
      ) : null}

      {errorKey ? (
        <p className="text-xs font-medium text-red-700" data-testid="teacher-weekly-intervals-error">
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
}
