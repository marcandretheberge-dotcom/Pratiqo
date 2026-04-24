"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Save, Trash2 } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { cn } from "../../../../lib/utils";
import {
  blockedPeriodsFromRows,
  dayShortKeyForISODate,
  formatLocalISODate,
  generateSlots,
  weeklyAvailabilityFromTeacherRows,
} from "../../../../lib/slots";
import { defaultLessonDurationMinutes } from "../../../../lib/teacherSlotQueries";
import { useLocale } from "../../../../lib/locale-context";
import { localeToBcp47 } from "../../../../lib/i18n";
import type { TranslationKey } from "../../../../lib/translations";

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

type Tab = "cours" | "dispo";

type BookingRow = {
  id: string;
  slot_date: string | null;
  time_slot: string | null;
  date: string | null;
  time: string | null;
  status: string;
  student_id: string;
  studentName?: string;
};

function TeacherScheduleInner() {
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("cours");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(60);
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
  const [blockReason, setBlockReason] = useState("");
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  }, [weekAnchor]);

  const selectedDateIso = useMemo(() => formatLocalISODate(weekDays[selectedDayIndex] ?? weekAnchor), [weekDays, selectedDayIndex, weekAnchor]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const { data: trow } = await supabase.from("teachers").select("id, availability, home_lesson_min_duration").eq("user_id", user.id).maybeSingle();
    const tid = (trow as { id?: string } | null)?.id ?? null;
    setTeacherId(tid);
    if (!tid) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const avail = (trow as { availability?: unknown }).availability;
    setAvailability(Array.isArray(avail) ? (avail as string[]) : []);
    setDurationMin(defaultLessonDurationMinutes((trow as { home_lesson_min_duration?: number | null }).home_lesson_min_duration));

    const from = formatLocalISODate(weekAnchor);
    const to = formatLocalISODate(addDays(weekAnchor, 13));

    const [{ data: bdata }, { data: bl }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, slot_date, time_slot, date, time, status, student_id")
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
  }, [user?.id, weekAnchor, t]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dispo" || t === "availability") setTab("dispo");
    if (t === "cours") setTab("cours");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const weeklyAvail = useMemo(() => weeklyAvailabilityFromTeacherRows(availability), [availability]);

  const bookedSlotsForDay = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      const ds = (b.slot_date || b.date) as string | null;
      if (ds !== selectedDateIso) continue;
      if (b.status === "cancelled" || b.status === "cancelled_conflict") continue;
      const ts = b.time_slot || b.time;
      if (ts) set.add(ts);
    }
    return Array.from(set);
  }, [bookings, selectedDateIso]);

  const blockedForSelectedDay = useMemo(() => {
    const rows = blockedRows.filter((r) => r.blocked_date === selectedDateIso);
    return blockedPeriodsFromRows(rows.map((r) => ({ period: r.period })));
  }, [blockedRows, selectedDateIso]);

  const freeSlotsForDay = useMemo(() => {
    const dayKey = dayShortKeyForISODate(selectedDateIso);
    const dayAvail = weeklyAvail[dayKey] || { matin: false, apresmidi: false, soir: false };
    return generateSlots(dayAvail, durationMin, selectedDateIso, bookedSlotsForDay, blockedForSelectedDay);
  }, [weeklyAvail, selectedDateIso, durationMin, bookedSlotsForDay, blockedForSelectedDay]);

  const dayBookings = useMemo(() => {
    return bookings.filter((b) => {
      const ds = (b.slot_date || b.date) as string | null;
      return ds === selectedDateIso && !["cancelled", "cancelled_conflict"].includes(b.status);
    });
  }, [bookings, selectedDateIso]);

  const toggleAvail = (d: string, s: string) => {
    const key = `${d} ${s}`;
    setAvailability((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const cellHasBooking = (dayColumnIndex: number, slotFr: string): boolean => {
    const iso = formatLocalISODate(weekDays[dayColumnIndex] ?? weekAnchor);
    const period =
      slotFr === "Matin" ? "matin" : slotFr === "Après-midi" ? "apresmidi" : slotFr === "Soir" ? "soir" : null;
    if (!period) return false;
    return bookings.some((b) => {
      const ds = (b.slot_date || b.date) as string | null;
      if (ds !== iso) return false;
      if (["cancelled", "cancelled_conflict"].includes(b.status)) return false;
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

  const saveAvailability = async () => {
    if (!user?.id) return;
    setSaving(true);
    setFlash(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("teachers").update({ availability }).eq("user_id", user.id);
      if (error) throw error;
      setFlash({ kind: "ok", text: t("availabilitySaved") });
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : t("errorGeneric") });
    } finally {
      setSaving(false);
    }
  };

  const addBlocked = async () => {
    if (!teacherId || !blockDate) return;
    setSaving(true);
    setFlash(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("blocked_slots").insert({
        teacher_id: teacherId,
        blocked_date: blockDate,
        period: blockPeriod,
        reason: blockReason.trim() || null,
      });
      if (error) throw error;
      setBlockReason("");
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : t("errorGeneric") });
    } finally {
      setSaving(false);
    }
  };

  const removeBlocked = async (id: string) => {
    const supabase = getSupabaseClient();
    await supabase.from("blocked_slots").delete().eq("id", id);
    await load();
  };

  const cancelBooking = async (id: string) => {
    if (!confirm(t("cancelCourseConfirm"))) return;
    const supabase = getSupabaseClient();
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    await load();
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-sm text-slate-500">
        {t("loginToSchedule")}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">{t("scheduleTeacherLabel")}</p>
        <h1 className="text-3xl font-bold text-[var(--p-text)]">{t("schedulePageTitle")}</h1>
        <p className="text-sm text-[var(--p-text-muted)] mt-2">{t("schedulePageSubtitle")}</p>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setTab("cours")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
            tab === "cours" ? "bg-[#1D9E75] text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {t("tabMyCourses")}
        </button>
        <button
          type="button"
          onClick={() => setTab("dispo")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
            tab === "dispo" ? "bg-[#1D9E75] text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {t("tabAvailabilityNav")}
        </button>
      </div>

      {flash ? (
        <p className={cn("text-sm", flash.kind === "err" ? "text-rose-600" : "text-[#085041]")}>{flash.text}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#1D9E75]" size={36} />
        </div>
      ) : !teacherId ? (
        <p className="text-sm text-slate-500">{t("noTeacherProfile")}</p>
      ) : tab === "cours" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft size={18} /> {t("weekNav")}
            </button>
            <p className="text-sm font-semibold text-slate-700">
              {formatLocalISODate(weekAnchor)} → {formatLocalISODate(addDays(weekAnchor, 6))}
            </p>
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("weekNav")} <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {weekDays.map((dt, i) => {
              const iso = formatLocalISODate(dt);
              const label = dt.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric" });
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDayIndex(i)}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-xs font-bold transition-colors",
                    selectedDayIndex === i ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]" : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 capitalize">{selectedDateIso}</h2>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t("reservationsTitle")}</p>
              {dayBookings.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noBookingsThatDay")}</p>
              ) : (
                <ul className="space-y-2">
                  {dayBookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgba(29,158,117,0.25)] bg-[rgba(29,158,117,0.06)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{b.studentName}</p>
                        <p className="text-xs text-slate-600">
                          {b.time_slot || b.time} · {b.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void cancelBooking(b.id)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        {t("cancel")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t("freeSlotsTitle")} ({durationMin} {t("freeSlotsMinSuffix")})
              </p>
              {freeSlotsForDay.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noFreeSlotsDetail")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {freeSlotsForDay.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500">{t("blockHintToTab")}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
            <p className="text-sm text-slate-600">
              {t("weekOf")} {formatLocalISODate(weekAnchor)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, -7))}
                className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, 7))}
                className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                →
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{t("gridWeeklyTitle")}</p>
            <p className="text-sm text-slate-600 mb-4">{t("gridCombinedLegend")}</p>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] grid grid-cols-[120px_repeat(7,1fr)] gap-2">
                <div />
                {DAYS.map((d, di) => (
                  <div key={d} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">
                    {t(DAY_TKEY[d])}{" "}
                    <span className="block font-normal text-slate-400 normal-case">
                      {weekDays[di] ? weekDays[di].getDate() : ""}/{weekDays[di] ? weekDays[di].getMonth() + 1 : ""}
                    </span>
                  </div>
                ))}
                {SLOTS.map((s) => (
                  <React.Fragment key={s}>
                    <div className="text-sm font-semibold text-slate-700">{t(SLOT_TKEY[s])}</div>
                    {DAYS.map((d, di) => {
                      const key = `${d} ${s}`;
                      const on = availability.includes(key);
                      const locked = cellHasBooking(di, s);
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && toggleAvail(d, s)}
                          className={cn(
                            "h-11 rounded-xl border transition-colors",
                            locked ? "border-amber-300 bg-amber-50 cursor-not-allowed" : "",
                            !locked && on ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)]" : "",
                            !locked && !on ? "border-slate-200 bg-white hover:border-slate-300" : "",
                          )}
                          title={locked ? t("titleCellBooked") : on ? t("titleCellAvailable") : t("titleCellUnavailable")}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAvailability()}
              className="mt-5 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#1D9E75] text-white text-sm font-semibold hover:brightness-[0.98] disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? t("savingDots") : t("save")}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-bold text-slate-800">{t("blockExceptionalTitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <select
                value={blockPeriod}
                onChange={(e) => setBlockPeriod(e.target.value as typeof blockPeriod)}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="matin">{t("morning")}</option>
                <option value="apresmidi">{t("afternoon")}</option>
                <option value="soir">{t("evening")}</option>
                <option value="all">{t("periodAllDay")}</option>
              </select>
              <input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={saving || !blockDate}
              onClick={() => void addBlocked()}
              className="h-10 px-4 rounded-full border border-[#1D9E75] text-[#0f6e56] text-sm font-semibold hover:bg-[#e1f5ee] disabled:opacity-50"
            >
              {t("blockAction")}
            </button>

            {blockedRows.length > 0 ? (
              <ul className="space-y-2 pt-2">
                {blockedRows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm border border-slate-100 rounded-xl px-3 py-2">
                    <span>
                      {r.blocked_date} —{" "}
                      {r.period === "all"
                        ? t("periodAllDay")
                        : r.period === "matin"
                          ? t("morning")
                          : r.period === "apresmidi"
                            ? t("afternoon")
                            : r.period === "soir"
                              ? t("evening")
                              : r.period || "—"}
                    </span>
                    <button type="button" onClick={() => void removeBlocked(r.id)} className="text-rose-600 p-1" aria-label={t("deleteAria")}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherSchedulePage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto py-20 flex justify-center"><Loader2 className="animate-spin text-[#1D9E75]" size={32} /></div>}>
      <TeacherScheduleInner />
    </Suspense>
  );
}
