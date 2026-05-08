"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { cn } from "../../../../lib/utils";
import { formatLocalISODate } from "../../../../lib/slots";
import { useLocale } from "../../../../lib/locale-context";
import { localeToBcp47 } from "../../../../lib/i18n/types";
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
  const { locale, t } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const subtab = useMemo<ScheduleTab>(() => {
    const raw = (searchParams.get("tab") || "today").toLowerCase();
    if (raw === "week" || raw === "semaine") return "week";
    if (raw === "dispo" || raw === "availability" || raw === "disponibilites") return "dispo";
    return "today";
  }, [searchParams]);

  const setSubtab = (next: ScheduleTab) => {
    const q = next === "today" ? "today" : next === "week" ? "week" : "dispo";
    router.replace(`${pathname}?tab=${q}`, { scroll: false });
  };

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherDiscipline, setTeacherDiscipline] = useState("—");
  const [availability, setAvailability] = useState<string[]>([]);
  const [teachingMode, setTeachingMode] = useState<string>("both");
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

  const todayIso = formatLocalISODate(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);
  const selectedDateIso = useMemo(
    () => formatLocalISODate(weekDays[selectedDayIndex] ?? weekAnchor),
    [weekDays, selectedDayIndex, weekAnchor],
  );

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const { data: trow } = await supabase
      .from("teachers")
      .select("id, availability, home_lesson_min_duration, teaching_mode")
      .eq("user_id", user.id)
      .maybeSingle();
    const tid = (trow as { id?: string } | null)?.id ?? null;
    setTeacherId(tid);
    setTeachingMode(String((trow as { teaching_mode?: string })?.teaching_mode || "both"));
    if (!tid) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const avail = (trow as { availability?: unknown }).availability;
    setAvailability(Array.isArray(avail) ? (avail as string[]) : []);

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
  }, [user?.id, weekAnchor, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const activeBooking = (b: BookingRow) => !["cancelled", "cancelled_conflict"].includes(b.status);

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

  const saveAll = async () => {
    if (!user?.id) return;
    setSaving(true);
    setFlash(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("teachers")
        .update({ availability, teaching_mode: teachingMode })
        .eq("user_id", user.id);
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
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">{t("scheduleTeacherLabel")}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2C2C2A]">{t("schedulePageTitle")}</h1>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full max-w-md">
        {(
          [
            ["today", "tabToday"],
            ["week", "tabWeek"],
            ["dispo", "tabAvailability"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubtab(key)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              subtab === key ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {flash ? (
        <p className={cn("text-sm", flash.kind === "err" ? "text-rose-600" : "text-teal-800")}>{flash.text}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-700" size={36} />
        </div>
      ) : !teacherId ? (
        <p className="text-sm text-slate-500">{t("noTeacherProfile")}</p>
      ) : subtab === "today" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                      "rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3",
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
                        className="h-10 px-5 rounded-full bg-teal-600 text-white text-sm font-semibold"
                        onClick={() => router.push("/messages")}
                      >
                        Démarrer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="h-10 px-5 rounded-full border border-slate-300 bg-white text-sm font-semibold text-[#2C2C2A]"
                        onClick={() => router.push("/messages")}
                      >
                        Message
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
          <div className="grid grid-cols-7 gap-2">
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
                    "flex flex-col items-center rounded-xl border py-2 px-1 text-center transition-colors",
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-sm font-bold text-[#2C2C2A]">{selectedDateIso}</p>
            {selectedDayBookings.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun cours ce jour-là.</p>
            ) : (
              <ul className="space-y-2">
                {selectedDayBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("gridWeeklyTitle")}</p>
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
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] grid grid-cols-[120px_repeat(7,1fr)] gap-2">
                <div />
                {DAYS.map((d, di) => (
                  <div key={d} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">
                    {t(DAY_TKEY[d])}{" "}
                    <span className="block font-normal text-slate-600 normal-case">
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
                            locked ? "border-[#F5C478] bg-[#FAEEDA] cursor-not-allowed" : "",
                            !locked && on ? "border-teal-500 bg-teal-500/15" : "",
                            !locked && !on ? "border-slate-200 bg-slate-100 hover:border-slate-300" : "",
                          )}
                          title={locked ? t("titleCellBooked") : on ? t("titleCellAvailable") : t("titleCellUnavailable")}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

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
                        "h-10 px-4 rounded-full text-sm font-semibold border transition-colors",
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
              <p className="text-sm font-bold text-[#2C2C2A]">{t("blockException")}</p>
              <div className="flex flex-wrap items-end gap-3">
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                />
                <select
                  value={blockPeriod}
                  onChange={(e) => setBlockPeriod(e.target.value as typeof blockPeriod)}
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm min-w-[10rem]"
                >
                  <option value="matin">{t("morning")}</option>
                  <option value="apresmidi">{t("afternoon")}</option>
                  <option value="soir">{t("evening")}</option>
                  <option value="all">{t("periodAllDay")}</option>
                </select>
                <button
                  type="button"
                  disabled={saving || !blockDate}
                  onClick={() => void addBlocked()}
                  className="h-11 px-5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {t("blockButton")}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAll()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-teal-600 text-white text-sm font-semibold hover:brightness-[0.98] disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? t("savingDots") : t("saveAvailability")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-20 flex justify-center">
          <Loader2 className="animate-spin text-teal-700" size={32} />
        </div>
      }
    >
      <TeacherScheduleInner />
    </Suspense>
  );
}
