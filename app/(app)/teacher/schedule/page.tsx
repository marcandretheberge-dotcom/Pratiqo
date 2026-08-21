"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { cn } from "../../../../lib/utils";
import { formatLocalISODate } from "../../../../lib/slots";
import { useLocale } from "../../../../lib/locale-context";
import { localeToBcp47 } from "../../../../lib/i18n/types";
import type { TranslationKey } from "../../../../lib/translations";
import { isScheduleEditLockedByNotice, type ScheduleLockPeriod } from "../../../../lib/scheduleLockout";
import { AppListSkeleton } from "@/components/loading/AppSkeletons";
import {
  DEFAULT_LESSON_DURATION_MINUTES,
  LESSON_DURATION_OPTIONS,
  formatLessonDurationLabel,
  normalizeLessonDurationMinutes,
} from "../../../../lib/pricing/lessonDuration";
import {
  formatAvailableFromDisplayDate,
  normalizeAvailableFromDate,
} from "@/lib/teachers/availabilityStartDate";
import { isTeacherScheduleIntervalsUiEnabled, isTeacherScheduleIntervalsEnabled } from "@/lib/schedule/weeklyIntervals";
import { buildScheduleIntervalMigrationState } from "@/lib/schedule/scheduleIntervalMigration";
import { TeacherWeeklyIntervalsEditor } from "@/components/teacher/TeacherWeeklyIntervalsEditor";
import { TeacherScheduleIntervalMigrationModal } from "@/components/teacher/TeacherScheduleIntervalMigrationModal";
import { TeacherScheduleExceptionsEditor } from "@/components/teacher/TeacherScheduleExceptionsEditor";
import { TeacherScheduleInteractiveGrid } from "@/components/teacher/TeacherScheduleInteractiveGrid";
import { TeacherSchedulePrecisionBanner } from "@/components/teacher/TeacherSchedulePrecisionBanner";
import { TeacherScheduleStatus } from "@/components/teacher/TeacherScheduleStatus";
import { TeacherAvailabilityPreview } from "@/components/teacher/TeacherAvailabilityPreview";
import { isTeacherScheduleExceptionsUiEnabled } from "@/lib/schedule/dateExceptions";
import { isTeacherScheduleInteractiveCellsUiEnabled } from "@/lib/schedule/interactiveCells";
import { dispatchConfigurePrecision } from "@/lib/schedule/precisionScheduleBanner";
import {
  isTeacherPreciseScheduleBookingUiEnabled,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import { loadCurrentTeacherForSchedule } from "@/lib/teachers/currentTeacher";
import {
  isTeacherScheduleStickySaveEnabled,
} from "@/lib/schedule/scheduleSaveFlags";
import { scheduleSaveStatusFrom, stableScheduleSnapshot } from "@/lib/schedule/scheduleSaveState";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import {
  TeacherScheduleSaveBar,
  TeacherScheduleSaveStatusBadge,
} from "@/components/teacher/TeacherScheduleSaveBar";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const SLOTS = ["Matin", "Après-midi", "Soir"] as const;
const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 45, 60] as const;
const MAX_BUFFER_MINUTES = 240;

function clampBufferMinutes(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_BUFFER_MINUTES, Math.round(n));
}

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

type ScheduleTab = "today" | "week" | "dispo";

function startOfWeekMonday(from: Date): Date {
  const x = new Date(from);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type BookingRow = {
  id: string;
  slot_date: string | null;
  time_slot: string | null;
  date: string | null;
  time: string | null;
  status: string;
  student_id: string;
  teaching_mode?: string | null;
  price?: number | null;
  studentName?: string;
};

function slotStartApprox(ts: string | null | undefined): number {
  if (!ts) return 9999;
  const m = /^(\d{1,2})h(\d{2})/.exec(ts.trim());
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const m2 = /^(\d{1,2}):(\d{2})/.exec(ts.trim());
  if (m2) return Number(m2[1]) * 60 + Number(m2[2]);
  return 9999;
}

function TeacherScheduleInner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { locale, t } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Horaire is now the availability editor. The today/week branches are kept
  // only for backwards-compatible bookmark URLs (?tab=today, ?tab=week); the
  // segmented tab UI was removed because both views duplicate the teacher
  // dashboard (TeacherDashboardStats + TeacherScheduleCard).
  const subtab = useMemo<ScheduleTab>(() => {
    const raw = (searchParams.get("tab") || "").toLowerCase();
    if (raw === "today" || raw === "aujourdhui") return "today";
    if (raw === "week" || raw === "semaine") return "week";
    return "dispo";
  }, [searchParams]);

  useEffect(() => {
    const raw = (searchParams.get("tab") || "").toLowerCase();
    if (raw === "today" || raw === "aujourdhui" || raw === "week" || raw === "semaine") {
      router.replace("/teacher/schedule?tab=dispo", { scroll: false });
    }
  }, [searchParams, router]);

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherLookupState, setTeacherLookupState] = useState<"pending" | "found" | "missing" | "error">(
    "pending",
  );
  const [teacherDiscipline, setTeacherDiscipline] = useState("—");
  const [availability, setAvailability] = useState<string[]>([]);
  const [preciseIntervalCount, setPreciseIntervalCount] = useState(0);
  const [scheduleMode, setScheduleMode] = useState<TeacherScheduleMode>("legacy_blocks");
  const preciseBookingUi = isTeacherPreciseScheduleBookingUiEnabled();
  const [teachingMode, setTeachingMode] = useState<string>("both");
  const [bufferBefore, setBufferBefore] = useState<number>(0);
  const [bufferAfter, setBufferAfter] = useState<number>(0);
  const [defaultLessonDuration, setDefaultLessonDuration] = useState<number>(DEFAULT_LESSON_DURATION_MINUTES);
  const [savedLessonDuration, setSavedLessonDuration] = useState<number>(DEFAULT_LESSON_DURATION_MINUTES);
  const [durationSaveState, setDurationSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [availableFromDate, setAvailableFromDate] = useState<string>("");
  const [savedAvailableFromDate, setSavedAvailableFromDate] = useState<string | null>(null);
  const [availableFromSaveState, setAvailableFromSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const w = startOfWeekMonday(new Date());
    const today = formatLocalISODate(new Date());
    for (let i = 0; i < 7; i++) {
      if (formatLocalISODate(addDays(w, i)) === today) return i;
    }
    return 0;
  });
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [blockedRows, setBlockedRows] = useState<{ id: string; blocked_date: string; period: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockPeriod, setBlockPeriod] = useState<"matin" | "apresmidi" | "soir" | "all">("matin");
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [settingsBaseline, setSettingsBaseline] = useState("");
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [intervalsDirty, setIntervalsDirty] = useState(false);
  const [exceptionsDirty, setExceptionsDirty] = useState(false);
  const stickyEnabled = isTeacherScheduleStickySaveEnabled();
  const pageDirty = settingsDirty || intervalsDirty || exceptionsDirty;

  useUnsavedChangesWarning(pageDirty, stickyEnabled);

  const todayIso = formatLocalISODate(new Date());
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
  const resetToThisWeek = useCallback(() => {
    const now = new Date();
    setWeekAnchor(startOfWeekMonday(now));
    setSelectedDayIndex((now.getDay() + 6) % 7);
  }, []);
  const selectedDateIso = useMemo(
    () => formatLocalISODate(weekDays[selectedDayIndex] ?? weekAnchor),
    [weekDays, selectedDayIndex, weekAnchor],
  );
  const selectedDateLabel = useMemo(
    () =>
      (weekDays[selectedDayIndex] ?? weekAnchor).toLocaleDateString(dateLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [dateLocale, selectedDayIndex, weekAnchor, weekDays],
  );

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setTeacherLookupState("pending");
      return;
    }
    setLoading(true);
    setTeacherLookupState("pending");
    const supabase = getSupabaseClient();
    const resolved = await loadCurrentTeacherForSchedule(supabase, userId);
    if (!resolved.ok) {
      setTeacherId(null);
      setBookings([]);
      setTeacherLookupState(resolved.reason === "query_error" ? "error" : "missing");
      setLoading(false);
      return;
    }

    const trow = resolved.teacher;
    const tid = trow.id;
    setTeacherId(tid);
    setTeacherLookupState("found");
    setScheduleMode(trow.scheduleMode);
    setTeachingMode(String(trow.teaching_mode || "both"));
    setBufferBefore(clampBufferMinutes(trow.booking_buffer_before_minutes));
    setBufferAfter(clampBufferMinutes(trow.booking_buffer_after_minutes));
    const loadedDuration = normalizeLessonDurationMinutes(trow.default_lesson_duration_minutes);
    setDefaultLessonDuration(loadedDuration);
    setSavedLessonDuration(loadedDuration);
    const loadedAvailableFrom = normalizeAvailableFromDate(trow.available_from_date);
    setAvailableFromDate(loadedAvailableFrom ?? "");
    setSavedAvailableFromDate(loadedAvailableFrom);

    const avail = trow.availability;
    const availArr = Array.isArray(avail) ? (avail as string[]) : [];
    setAvailability(availArr);
    const mode = String(trow.teaching_mode || "both");
    const before = clampBufferMinutes(trow.booking_buffer_before_minutes);
    const after = clampBufferMinutes(trow.booking_buffer_after_minutes);
    setSettingsBaseline(
      stableScheduleSnapshot({
        availability: [...availArr].sort(),
        teachingMode: mode,
        bufferBefore: before,
        bufferAfter: after,
        defaultLessonDuration: loadedDuration,
        availableFromDate: loadedAvailableFrom ?? "",
      }),
    );
    setSettingsDirty(false);

    const from = formatLocalISODate(weekAnchor);
    const to = formatLocalISODate(addDays(weekAnchor, 13));

    const [{ data: bdata }, { data: bl }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, slot_date, time_slot, date, time, status, student_id, teaching_mode, price")
        .eq("teacher_id", tid)
        .gte("slot_date", from)
        .lte("slot_date", to)
        .order("slot_date", { ascending: true }),
      supabase.from("blocked_slots").select("id, blocked_date, period").eq("teacher_id", tid).gte("blocked_date", from).lte("blocked_date", to),
    ]);

    const rows = (bdata || []) as BookingRow[];
    const withNames: BookingRow[] = [];
    for (const r of rows) {
      const { data: p } = await supabase.from("profiles").select("name").eq("id", r.student_id).maybeSingle();
      withNames.push({ ...r, studentName: (p?.name as string) || t("studentDefaultName") });
    }
    setBookings(withNames);
    setBlockedRows((bl || []) as { id: string; blocked_date: string; period: string | null }[]);
    setLoading(false);
  }, [userId, weekAnchor, t]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const activeBooking = (b: BookingRow) => !["cancelled", "cancelled_conflict", "completed"].includes(b.status);

  const bookingsForDay = useCallback(
    (iso: string) =>
      bookings
        .filter((b) => (b.slot_date || b.date) === iso && activeBooking(b))
        .sort((a, b) => slotStartApprox(a.time_slot || a.time) - slotStartApprox(b.time_slot || b.time)),
    [bookings],
  );

  const todayBookings = useMemo(() => bookingsForDay(todayIso), [bookingsForDay, todayIso]);
  const selectedDayBookings = useMemo(() => bookingsForDay(selectedDateIso), [bookingsForDay, selectedDateIso]);

  const todayRevenue = useMemo(
    () => todayBookings.reduce((s, b) => s + (Number(b.price) || 0), 0),
    [todayBookings],
  );

  const countForDay = useCallback((iso: string) => bookingsForDay(iso).length, [bookingsForDay]);

  const toggleAvail = (d: string, s: string) => {
    const key = `${d} ${s}`;
    setAvailability((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const cellLockedByNotice = (dayColumnIndex: number, slotFr: (typeof SLOTS)[number]): boolean => {
    const iso = formatLocalISODate(weekDays[dayColumnIndex] ?? weekAnchor);
    return isScheduleEditLockedByNotice(iso, SLOT_PERIOD[slotFr]);
  };

  const cellHasBooking = (dayColumnIndex: number, slotFr: string): boolean => {
    const iso = formatLocalISODate(weekDays[dayColumnIndex] ?? weekAnchor);
    const period =
      slotFr === "Matin" ? "matin" : slotFr === "Après-midi" ? "apresmidi" : slotFr === "Soir" ? "soir" : null;
    if (!period) return false;
    return bookings.some((b) => {
      const ds = (b.slot_date || b.date) as string | null;
      if (ds !== iso) return false;
      if (!activeBooking(b)) return false;
      const ts = b.time_slot || b.time;
      if (!ts) return false;
      const p =
        ts.includes("h") && /^(\d{1,2})h/.test(ts)
          ? (() => {
              const h = Number(ts.match(/^(\d{1,2})h/)?.[1]);
              if (h >= 8 && h < 12) return "matin";
              if (h >= 12 && h < 17) return "apresmidi";
              if (h >= 17 && h < 21) return "soir";
              return null;
            })()
          : null;
      return p === period;
    });
  };

  const saveLessonDuration = useCallback(
    async (nextRaw: number, opts?: { forcePersist?: boolean }) => {
      const next = normalizeLessonDurationMinutes(nextRaw);
      if (next === savedLessonDuration && !opts?.forcePersist) return true;

      // Sticky save mode: keep local edits dirty until coordinated save.
      if (stickyEnabled && !opts?.forcePersist) {
        setDefaultLessonDuration(next);
        setDurationSaveState("idle");
        return true;
      }

      const previous = savedLessonDuration;
      setDefaultLessonDuration(next);
      setDurationSaveState("saving");

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error(t("lessonDurationSaveError"));

        const res = await fetch("/api/teacher/lesson-duration", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ defaultLessonDurationMinutes: next }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          defaultLessonDurationMinutes?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || t("lessonDurationSaveError"));

        const saved = normalizeLessonDurationMinutes(body.defaultLessonDurationMinutes ?? next);
        setSavedLessonDuration(saved);
        setDefaultLessonDuration(saved);
        setDurationSaveState("saved");
        return true;
      } catch {
        setDefaultLessonDuration(previous);
        setDurationSaveState("error");
        return false;
      }
    },
    [savedLessonDuration, stickyEnabled, t],
  );

  const saveAvailableFromDate = useCallback(
    async (nextRaw: string | null, opts?: { forcePersist?: boolean }) => {
      const next = nextRaw === null || nextRaw.trim() === "" ? null : normalizeAvailableFromDate(nextRaw);
      if (next === savedAvailableFromDate && !opts?.forcePersist) {
        setAvailableFromDate(next ?? "");
        return true;
      }

      if (stickyEnabled && !opts?.forcePersist) {
        setAvailableFromDate(next ?? "");
        setAvailableFromSaveState("idle");
        return true;
      }

      const previous = savedAvailableFromDate;
      setAvailableFromDate(next ?? "");
      setAvailableFromSaveState("saving");

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error(t("availableFromSaveError"));

        const res = await fetch("/api/teacher/available-from", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ availableFromDate: next }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          availableFromDate?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : t("availableFromSaveError"));

        const saved = normalizeAvailableFromDate(body.availableFromDate) ?? null;
        setSavedAvailableFromDate(saved);
        setAvailableFromDate(saved ?? "");
        setAvailableFromSaveState("saved");
        return true;
      } catch {
        setSavedAvailableFromDate(previous);
        setAvailableFromDate(previous ?? "");
        setAvailableFromSaveState("error");
        return false;
      }
    },
    [savedAvailableFromDate, stickyEnabled, t],
  );

  const saveAll = async (): Promise<boolean> => {
    if (!userId) return false;
    setSaving(true);
    setFlash(null);
    try {
      const supabase = getSupabaseClient();
      const nextBefore = clampBufferMinutes(bufferBefore);
      const nextAfter = clampBufferMinutes(bufferAfter);
      const { error } = await supabase
        .from("teachers")
        .update({
          availability,
          teaching_mode: teachingMode,
          booking_buffer_before_minutes: nextBefore,
          booking_buffer_after_minutes: nextAfter,
        })
        .eq("user_id", userId);
      if (error) throw error;

      let durationOk = true;
      let availableFromOk = true;
      if (defaultLessonDuration !== savedLessonDuration) {
        durationOk = await saveLessonDuration(defaultLessonDuration, { forcePersist: true });
      }
      if ((availableFromDate || "") !== (savedAvailableFromDate ?? "")) {
        availableFromOk = await saveAvailableFromDate(availableFromDate || null, { forcePersist: true });
      }
      if (!durationOk || !availableFromOk) {
        setFlash({ kind: "err", text: t("scheduleSavePartialError") });
        return false;
      }

      setSettingsBaseline(
        stableScheduleSnapshot({
          availability: [...availability].sort(),
          teachingMode,
          bufferBefore: nextBefore,
          bufferAfter: nextAfter,
          defaultLessonDuration,
          availableFromDate: availableFromDate || "",
        }),
      );
      setSettingsDirty(false);
      setFlash({ kind: "ok", text: t("availabilitySaved") });
      return true;
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : t("errorGeneric") });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discardSettings = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settingsBaseline) return;
    const next = stableScheduleSnapshot({
      availability: [...availability].sort(),
      teachingMode,
      bufferBefore: clampBufferMinutes(bufferBefore),
      bufferAfter: clampBufferMinutes(bufferAfter),
      defaultLessonDuration,
      availableFromDate: availableFromDate || "",
    });
    setSettingsDirty(next !== settingsBaseline);
  }, [
    availability,
    teachingMode,
    bufferBefore,
    bufferAfter,
    defaultLessonDuration,
    availableFromDate,
    settingsBaseline,
  ]);

  const settingsSaveStatus = scheduleSaveStatusFrom({
    dirty: settingsDirty,
    saving,
    error: flash?.kind === "err",
    justSaved: flash?.kind === "ok",
  });

  const pageSaveStatus = scheduleSaveStatusFrom({
    dirty: pageDirty,
    saving,
    error: flash?.kind === "err",
    justSaved: !pageDirty && flash?.kind === "ok",
  });

  const addBlocked = async () => {
    if (!teacherId || !blockDate) return;
    if (isScheduleEditLockedByNotice(blockDate, blockPeriod)) {
      setFlash({ kind: "err", text: t("scheduleLockedNotice") });
      return;
    }
    setSaving(true);
    setFlash(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("blocked_slots").insert({
        teacher_id: teacherId,
        blocked_date: blockDate,
        period: blockPeriod,
        start_time: null,
        end_time: null,
        reason: null,
      });
      if (error) throw error;
      setBlockDate("");
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : t("errorGeneric") });
    } finally {
      setSaving(false);
    }
  };

  const formatLabel = (b: BookingRow) => {
    return b.teaching_mode === "domicile" ? t("homeVisit") : b.teaching_mode === "online" ? t("online") : t("inPerson");
  };

  const chipsPerson = teachingMode === "person" || teachingMode === "both" || teachingMode === "all";
  const chipsOnline = teachingMode === "online" || teachingMode === "both" || teachingMode === "all";
  const chipsHome = teachingMode === "home" || teachingMode === "all";

  const encodeFormats = (p: boolean, o: boolean, h: boolean) => {
    const n = (p ? 1 : 0) + (o ? 1 : 0) + (h ? 1 : 0);
    if (n === 0) return "both";
    if (n === 3) return "all";
    if (p && o && !h) return "both";
    if (p && !o && !h) return "person";
    if (!p && o && !h) return "online";
    if (!p && !o && h) return "home";
    return "all";
  };

  const toggleFormat = (key: "person" | "online" | "home") => {
    const p = key === "person" ? !chipsPerson : chipsPerson;
    const o = key === "online" ? !chipsOnline : chipsOnline;
    const h = key === "home" ? !chipsHome : chipsHome;
    setTeachingMode(encodeFormats(p, o, h));
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-sm text-slate-500">
        {t("loginToSchedule")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-5xl space-y-5",
        stickyEnabled ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-[calc(6rem+env(safe-area-inset-bottom))]",
        "sm:pb-10",
      )}
      data-testid="teacher-schedule-page"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">{t("scheduleTeacherLabel")}</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2C2C2A]">{t("schedulePageTitle")}</h1>
          {stickyEnabled ? <TeacherScheduleSaveStatusBadge status={pageSaveStatus} /> : null}
        </div>
        <p className="text-sm text-slate-600">{t("schedulePageSubtitle")}</p>
      </div>

      {flash ? (
        <p className={cn("text-sm", flash.kind === "err" ? "text-rose-600" : "text-teal-800")}>{flash.text}</p>
      ) : null}

      {loading || teacherLookupState === "pending" ? (
        <div className="space-y-3" data-testid="teacher-schedule-loading">
          <AppListSkeleton count={3} />
          <p className="text-sm text-slate-500">{t("scheduleLoadingTeacher")}</p>
        </div>
      ) : teacherLookupState === "error" ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3"
          data-testid="teacher-schedule-load-error"
          role="alert"
        >
          <p className="text-sm font-bold text-amber-950">{t("scheduleLoadErrorTitle")}</p>
          <p className="text-sm text-amber-900">{t("scheduleLoadErrorBody")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
          >
            {t("scheduleLoadErrorRetry")}
          </button>
        </div>
      ) : !teacherId || teacherLookupState === "missing" ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm"
          data-testid="teacher-schedule-no-profile"
        >
          <p className="text-sm font-bold text-[#2C2C2A]">{t("scheduleNoTeacherTitle")}</p>
          <p className="text-sm text-slate-600">{t("scheduleNoTeacherBody")}</p>
          <a
            href="/teacher/my-profile"
            className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
          >
            {t("scheduleNoTeacherCta")}
          </a>
        </div>
      ) : subtab === "today" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-[#2C2C2A] capitalize">
              {new Date(todayIso + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {todayBookings.length} {t("lessons")} ·{" "}
              {new Intl.NumberFormat(dateLocale, { style: "currency", currency: "CAD" }).format(todayRevenue)}
            </p>
          </div>
          {todayBookings.length === 0 ? (
            <p className="text-center text-slate-500 py-12">{t("scheduleNoClassesToday")}</p>
          ) : (
            <ul className="space-y-3">
              {todayBookings.map((b, idx) => {
                const now = new Date();
                const mins = now.getHours() * 60 + now.getMinutes();
                const sm = slotStartApprox(b.time_slot || b.time);
                const isCurrentOrNext =
                  b.status === "confirmed" && sm >= mins - 30 && sm <= mins + 90;
                const isFirst = idx === 0;
                const boldTeal = isCurrentOrNext;
                return (
                  <li
                    key={b.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                      isFirst ? "border-teal-500 bg-teal-500/15" : "border-slate-200 bg-slate-100",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                          isFirst ? "bg-teal-600" : "bg-slate-400",
                        )}
                      >
                        {(b.studentName || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-base font-bold", boldTeal ? "text-teal-700" : "text-[#2C2C2A]")}>
                          {b.time_slot || b.time}
                        </p>
                        <p className="text-sm font-semibold text-[#2C2C2A] truncate">{b.studentName}</p>
                        <p className="text-xs text-slate-600">
                          {teacherDiscipline} · {formatLabel(b)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Intl.NumberFormat(dateLocale, { style: "currency", currency: "CAD" }).format(Number(b.price) || 0)}
                        </p>
                      </div>
                    </div>
                    {idx === 0 ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-semibold text-white sm:w-auto"
                        onClick={() => router.push("/messages")}
                      >
                        {t("startLesson")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-[#2C2C2A] sm:w-auto"
                        onClick={() => router.push("/messages")}
                      >
                        {t("messageStudent")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : subtab === "week" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft size={18} /> {t("weekNav")}
            </button>
            <p className="text-sm font-semibold text-slate-700">
              {weekRangeLabel}
            </p>
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("weekNav")} <ChevronRight size={18} />
            </button>
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="grid min-w-[520px] grid-cols-7 gap-2">
            {weekDays.map((dt, i) => {
              const iso = formatLocalISODate(dt);
              const c = countForDay(iso);
              const label = dt.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric" });
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDayIndex(i)}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-colors",
                    selectedDayIndex === i ? "border-teal-500 bg-teal-600 text-white" : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="text-[10px] font-bold uppercase leading-tight">{label}</span>
                  <span className={cn("text-lg font-bold mt-0.5", selectedDayIndex === i ? "text-white" : "text-[#2C2C2A]")}>{c}</span>
                  <span className={cn("text-[9px]", selectedDayIndex === i ? "text-white/80" : "text-slate-500")}>
                    {t("lessonCountSuffix")}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-bold text-[#2C2C2A] capitalize">{selectedDateLabel}</p>
            {selectedDayBookings.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun cours ce jour-là.</p>
            ) : (
              <ul className="space-y-2">
                {selectedDayBookings.map((b) => (
                  <li key={b.id} className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="text-sm font-bold text-teal-700">{b.time_slot || b.time}</span>
                    <span className="text-sm font-semibold truncate">{b.studentName}</span>
                    <span className="text-xs text-slate-500 shrink-0">{formatLabel(b)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            data-testid="teacher-schedule-lesson-duration-card"
          >
            <div>
              <p className="text-sm font-bold text-[#2C2C2A]">{t("lessonDurationTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("lessonDurationDescription")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {stickyEnabled ? t("scheduleSaveStickyDurationHelp") : t("lessonDurationAutosaveHelp")}
              </p>
            </div>
            <label className="block max-w-xs sm:max-w-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                {t("lessonDurationLabel")}
              </span>
              <select
                value={defaultLessonDuration}
                onChange={(e) => void saveLessonDuration(Number(e.target.value))}
                disabled={durationSaveState === "saving"}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#2C2C2A] disabled:opacity-60"
                data-testid="teacher-schedule-lesson-duration-select"
              >
                {LESSON_DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatLessonDurationLabel(minutes, t)}
                  </option>
                ))}
              </select>
            </label>
            {durationSaveState === "saving" ? (
              <p
                className="text-xs font-medium text-slate-600"
                data-testid="teacher-schedule-lesson-duration-saving"
              >
                {t("lessonDurationSaving")}
              </p>
            ) : null}
            {durationSaveState === "saved" ? (
              <p
                className="text-xs font-medium text-teal-700"
                data-testid="teacher-schedule-lesson-duration-saved"
              >
                {t("lessonDurationSaved")}
              </p>
            ) : null}
            {durationSaveState === "error" ? (
              <p
                className="text-xs font-medium text-red-700"
                data-testid="teacher-schedule-lesson-duration-error"
              >
                {t("lessonDurationSaveError")}
              </p>
            ) : null}
          </div>
          <div
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            data-testid="teacher-schedule-available-from-card"
          >
            <div>
              <p className="text-sm font-bold text-[#2C2C2A]">{t("availableFromLessonStartDate")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("availableFromHelper")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("availableFromFutureHint")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("availableFromVisibilityNote")}</p>
            </div>
            <label className="block max-w-xs sm:max-w-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                {t("availableFromLabel")}
              </span>
              <input
                type="date"
                value={availableFromDate}
                min={todayIso}
                onChange={(e) => void saveAvailableFromDate(e.target.value || null)}
                disabled={availableFromSaveState === "saving"}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#2C2C2A] disabled:opacity-60"
                data-testid="teacher-schedule-available-from-input"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveAvailableFromDate(null)}
              disabled={availableFromSaveState === "saving" || savedAvailableFromDate == null}
              className="text-xs font-semibold text-teal-800 underline disabled:opacity-40"
              data-testid="teacher-schedule-available-from-clear"
            >
              {t("availableFromClear")}
            </button>
            {savedAvailableFromDate ? (
              <p className="text-xs font-medium text-slate-700" data-testid="teacher-schedule-available-from-summary">
                {formatAvailableFromDisplayDate(savedAvailableFromDate, locale)}
              </p>
            ) : null}
            {availableFromSaveState === "saving" ? (
              <p className="text-xs font-medium text-slate-600">{t("lessonDurationSaving")}</p>
            ) : null}
            {availableFromSaveState === "saved" ? (
              <p className="text-xs font-medium text-teal-700" data-testid="teacher-schedule-available-from-saved">
                {t("availableFromSaved")}
              </p>
            ) : null}
            {availableFromSaveState === "error" ? (
              <p className="text-xs font-medium text-red-700">{t("availableFromSaveError")}</p>
            ) : null}
          </div>
          {preciseBookingUi ? (
            <TeacherScheduleStatus
              scheduleMode={scheduleMode}
              preciseIntervalCount={preciseIntervalCount}
              preciseBookingUiEnabled={preciseBookingUi}
              onActivated={({ scheduleMode: next }) => setScheduleMode(next)}
              onConfigure={() => {
                if (isTeacherScheduleInteractiveCellsUiEnabled()) {
                  document
                    .querySelector('[data-testid="teacher-schedule-interactive-grid"]')
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  dispatchConfigurePrecision();
                  return;
                }
                if (isTeacherScheduleIntervalsUiEnabled()) {
                  document.getElementById("teacher-weekly-intervals-editor")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  return;
                }
                document
                  .querySelector('[data-testid="teacher-schedule-availability-scroll"]')
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ) : (
            <TeacherSchedulePrecisionBanner
              broadBlockCount={availability.length}
              preciseIntervalCount={preciseIntervalCount}
              configuredDayCount={preciseIntervalCount > 0 ? Math.min(7, preciseIntervalCount) : 0}
              intervalsServerEnabled={isTeacherScheduleIntervalsEnabled()}
              intervalsUiEnabled={isTeacherScheduleIntervalsUiEnabled()}
              interactiveCellsUiEnabled={isTeacherScheduleInteractiveCellsUiEnabled()}
              onConfigure={() => {
                if (isTeacherScheduleInteractiveCellsUiEnabled()) {
                  document
                    .querySelector('[data-testid="teacher-schedule-interactive-grid"]')
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  dispatchConfigurePrecision();
                  return;
                }
                if (isTeacherScheduleIntervalsUiEnabled()) {
                  document.getElementById("teacher-weekly-intervals-editor")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  return;
                }
                document
                  .querySelector('[data-testid="teacher-schedule-availability-scroll"]')
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          )}

          {isTeacherScheduleInteractiveCellsUiEnabled() ? (
            <TeacherScheduleInteractiveGrid
              bookings={bookings}
              onDirtyChange={setIntervalsDirty}
              onPreciseIntervalCountChange={setPreciseIntervalCount}
            />
          ) : (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              data-testid="teacher-schedule-precise-disabled"
              role="status"
            >
              <p className="text-sm font-bold text-amber-950">{t("schedulePreciseDisabledTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-amber-900">{t("schedulePreciseDisabledBody")}</p>
            </div>
          )}

          {!isTeacherScheduleInteractiveCellsUiEnabled() && isTeacherScheduleIntervalsUiEnabled() ? (
            <>
              <TeacherWeeklyIntervalsEditor
                hasLegacyBlocks={availability.length > 0}
                onPreciseIntervalCountChange={setPreciseIntervalCount}
                onDirtyChange={setIntervalsDirty}
              />
              <TeacherScheduleIntervalMigrationModal
                state={buildScheduleIntervalMigrationState({
                  legacyBlockCount: availability.length,
                  preciseIntervalCount,
                })}
                onConfigure={() => {
                  document.getElementById("teacher-weekly-intervals-editor")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              />
            </>
          ) : null}

          {isTeacherScheduleExceptionsUiEnabled() ? (
            <TeacherScheduleExceptionsEditor
              onDirtyChange={setExceptionsDirty}
              scheduleMode={scheduleMode}
            />
          ) : null}

          <TeacherAvailabilityPreview
            defaultDurationMinutes={defaultLessonDuration}
            scheduleDirty={pageDirty}
            onRequestSave={() => {
              const sticky = document.querySelector(
                '[data-testid="teacher-schedule-settings-save-bar-save"], [data-testid="teacher-weekly-intervals-save"], [data-testid="teacher-schedule-interactive-save"]',
              );
              if (sticky instanceof HTMLElement) {
                sticky.scrollIntoView({ behavior: "smooth", block: "center" });
                sticky.focus?.();
                return;
              }
              void saveAll();
            }}
          />

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {!isTeacherScheduleIntervalsUiEnabled() && !isTeacherScheduleInteractiveCellsUiEnabled() ? (
              <>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("gridWeeklyTitle")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{t("availabilityRecurringHint")}</p>
                <p className="mt-1 text-xs leading-5 font-semibold text-amber-900">{t("scheduleLockedNotice")}</p>
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
                  onClick={resetToThisWeek}
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
                <span className="h-3 w-3 rounded-sm bg-teal-600" /> {t("legendAvailable")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-slate-200 border border-slate-300" /> {t("legendClosed")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#FAEEDA] border border-[#F5C478]" /> {t("legendBooked")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-50 opacity-60" /> {t("legendLockedNotice")}
              </span>
            </div>
            <div className="-mx-1 overflow-x-auto px-1" data-testid="teacher-schedule-availability-scroll">
              <div className="min-w-[560px] grid grid-cols-[120px_repeat(7,1fr)] gap-2">
                <div />
                {DAYS.map((d, di) => (
                  <div key={d} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">
                    {t(DAY_TKEY[d])}{" "}
                    <span className="block font-semibold text-slate-600">
                      {weekDays[di] ? formatDayMonthLabel(weekDays[di]) : ""}
                    </span>
                  </div>
                ))}
                {SLOTS.map((s) => (
                  <React.Fragment key={s}>
                    <div className="text-sm font-semibold text-slate-700">{t(SLOT_TKEY[s])}</div>
                    {DAYS.map((d, di) => {
                      const key = `${d} ${s}`;
                      const on = availability.includes(key);
                      const lockedByBooking = cellHasBooking(di, s);
                      const lockedByNotice = cellLockedByNotice(di, s);
                      const locked = lockedByBooking || lockedByNotice;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && toggleAvail(d, s)}
                          className={cn(
                            "h-12 rounded-xl border transition-colors",
                            lockedByBooking ? "border-[#F5C478] bg-[#FAEEDA] cursor-not-allowed" : "",
                            lockedByNotice && !lockedByBooking ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55" : "",
                            !locked && on ? "border-teal-500 bg-teal-500/15" : "",
                            !locked && !on ? "border-slate-200 bg-slate-100 hover:bg-slate-100 hover:border-slate-300" : "",
                          )}
                          title={lockedByBooking ? t("titleCellBooked") : lockedByNotice ? t("scheduleLockedCellLabel") : on ? t("titleCellAvailable") : t("titleCellUnavailable")}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
              </>
            ) : null}

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-sm font-bold text-[#2C2C2A]">{t("teachingFormat")}</p>
              <div className="flex flex-wrap gap-2">
                {(["inPerson", "online", "homeVisit"] as const).map((labelKey, i) => {
                  const keys = ["person", "online", "home"] as const;
                  const on = keys[i] === "person" ? chipsPerson : keys[i] === "online" ? chipsOnline : chipsHome;
                  return (
                    <button
                      key={labelKey}
                      type="button"
                      onClick={() => toggleFormat(keys[i])}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                        on ? "border-teal-500 bg-teal-500/15 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-600",
                      )}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-[#2C2C2A]">{t("bufferSectionTitle")}</p>
                <p className="text-xs text-slate-600 mt-1">{t("bufferSectionHelp")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-600">{t("bufferBeforeLabel")}</span>
                  <select
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(clampBufferMinutes(e.target.value))}
                    className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    {BUFFER_OPTIONS.map((m) => (
                      <option key={`before-${m}`} value={m}>
                        {m === 0 ? t("bufferNone") : `${m} min`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-600">{t("bufferAfterLabel")}</span>
                  <select
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(clampBufferMinutes(e.target.value))}
                    className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    {BUFFER_OPTIONS.map((m) => (
                      <option key={`after-${m}`} value={m}>
                        {m === 0 ? t("bufferNone") : `${m} min`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-sm font-bold text-[#2C2C2A]">{t("blockException")}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <input
                  type="date"
                  value={blockDate}
                  min={todayIso}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm sm:w-auto"
                />
                <select
                  value={blockPeriod}
                  onChange={(e) => setBlockPeriod(e.target.value as typeof blockPeriod)}
                  className="h-12 w-full min-w-[10rem] rounded-xl border border-slate-200 px-3 text-sm sm:w-auto"
                >
                  <option value="matin">{t("morning")}</option>
                  <option value="apresmidi">{t("afternoon")}</option>
                  <option value="soir">{t("evening")}</option>
                  <option value="all">{t("periodAllDay")}</option>
                </select>
                <button
                  type="button"
                  disabled={saving || !blockDate || isScheduleEditLockedByNotice(blockDate, blockPeriod)}
                  onClick={() => void addBlocked()}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                  title={blockDate && isScheduleEditLockedByNotice(blockDate, blockPeriod) ? t("scheduleLockedCellLabel") : undefined}
                >
                  {t("blockButton")}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={saving || (stickyEnabled && !settingsDirty)}
              onClick={() => void saveAll()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-8 text-sm font-semibold text-white hover:brightness-[0.98] disabled:opacity-60 sm:w-auto"
              data-testid="teacher-schedule-settings-save"
            >
              <Save size={18} />
              {saving ? t("savingDots") : t("saveAvailability")}
            </button>
          </div>
        </div>
      )}

      {stickyEnabled && settingsDirty ? (
        <TeacherScheduleSaveBar
          status={settingsSaveStatus}
          dirty={settingsDirty}
          saving={saving}
          onSave={() => void saveAll()}
          onDiscard={discardSettings}
          testId="teacher-schedule-settings-save-bar"
        />
      ) : null}
    </div>
  );
}

export default function TeacherSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-5xl justify-center py-20 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-10">
          <Loader2 className="animate-spin text-teal-700" size={32} />
        </div>
      }
    >
      <TeacherScheduleInner />
    </Suspense>
  );
}
