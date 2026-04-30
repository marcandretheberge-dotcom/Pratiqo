"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageSquare, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { CreditsWidget } from "@/components/CreditsWidget";
import { ConfirmCancelBookingDialog } from "@/components/ConfirmCancelBookingDialog";
import { STUDENT_CANCEL_STATUSES, isBookingLessonDateOnOrAfterToday, isLateCancellation } from "@/lib/bookingCancellation";
import { postCancelBooking } from "@/lib/bookingCancellationClient";

type BookingRow = {
  id: string;
  teacher_id: string;
  status: string;
  date: string | null;
  time: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  teaching_mode?: string | null;
};

type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  image_url: string | null;
};

type BookingWithTeacher = {
  bookingId: string;
  teacherId: string;
  teacherUserId: string | null;
  teacherName: string;
  discipline: string;
  avatarUrl: string | null;
  date: string;
  time: string;
  durationMinutes: number | null;
  price: number | null;
  teachingMode: string | null;
  status: string;
};

function sortKey(b: { date: string; time: string }) {
  return `${b.date}#${b.time}`.replaceAll("h", ":");
}

export function StudentDashboard() {
  const { user } = useAuth();
  const { t, formatPrice } = useLocale();

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<BookingWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<{ teacherId: string; name: string; discipline: string; avatarUrl: string | null; lessons: number; teacherUserId: string | null }[]>(
    [],
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [localFlash, setLocalFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, teacher_id, status, date, time, duration_minutes, price, teaching_mode")
        .eq("student_id", user.id)
        .in("status", [...STUDENT_CANCEL_STATUSES])
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      const rows = (bookings || []) as unknown as BookingRow[];
      const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_id)));
      const teacherMap = new Map<string, TeacherRow>();

      await Promise.all(
        teacherIds.map(async (tid) => {
          const { data } = await supabase.from("teachers").select("id, user_id, name, discipline, image_url").eq("id", tid).maybeSingle();
          if (data) teacherMap.set(tid, data as unknown as TeacherRow);
        }),
      );

      const upcomingList: BookingWithTeacher[] = rows
        .filter((r) => r.date && r.time)
        .map((r) => {
          const tr = teacherMap.get(r.teacher_id);
          return {
            bookingId: r.id,
            teacherId: r.teacher_id,
            teacherUserId: tr?.user_id ?? null,
            teacherName: (tr?.name ?? t("teacher")).toString(),
            discipline: (tr?.discipline ?? "").toString(),
            avatarUrl: tr?.image_url ?? null,
            date: String(r.date || ""),
            time: String(r.time || ""),
            durationMinutes: typeof r.duration_minutes === "number" ? r.duration_minutes : null,
            price: typeof r.price === "number" ? r.price : r.price != null ? Number(r.price) : null,
            teachingMode: r.teaching_mode ?? null,
            status: r.status,
          };
        })
        .filter((row) =>
          isBookingLessonDateOnOrAfterToday({
            slot_date: row.date,
            date: row.date,
            time_slot: row.time,
            time: row.time,
          }),
        )
        .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

      const teacherCounts = new Map<string, { lessons: number; row: TeacherRow | undefined }>();
      for (const r of rows) {
        if (r.status !== "confirmed" && r.status !== "booked") continue;
        const cur = teacherCounts.get(r.teacher_id) ?? { lessons: 0, row: teacherMap.get(r.teacher_id) };
        cur.lessons += 1;
        teacherCounts.set(r.teacher_id, cur);
      }

      const teachersList = Array.from(teacherCounts.entries()).map(([teacherId, v]) => ({
        teacherId,
        name: (v.row?.name ?? t("teacher")).toString(),
        discipline: (v.row?.discipline ?? "").toString(),
        avatarUrl: v.row?.image_url ?? null,
        teacherUserId: v.row?.user_id ?? null,
        lessons: v.lessons,
      }));

      if (!cancelled) {
        setUpcoming(upcomingList);
        setTeachers(teachersList);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, t, reloadKey]);

  const nextLesson = upcoming[0] ?? null;
  const cancelIsLate = useMemo(() => {
    if (!cancelBookingId) return false;
    const b = upcoming.find((x) => x.bookingId === cancelBookingId);
    if (!b) return false;
    return isLateCancellation({ slot_date: b.date, date: b.date, time_slot: b.time, time: b.time });
  }, [cancelBookingId, upcoming]);

  const executeStudentCancel = async (payload: { reason: string; message: string }) => {
    if (!cancelBookingId || !user?.id) return;
    setCancelBusy(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));
      const res = await postCancelBooking(cancelBookingId, {
        accessToken: token,
        reason: payload.reason || undefined,
        message: payload.message || undefined,
      });
      if ("error" in res) throw new Error(res.error);
      setCancelBookingId(null);
      setLocalFlash(t("classCancelled"));
      setReloadKey((k) => k + 1);
      window.setTimeout(() => setLocalFlash(null), 4000);
    } catch {
      setLocalFlash(t("anErrorOccurred"));
      window.setTimeout(() => setLocalFlash(null), 4000);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {localFlash ? (
        <div className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
          {localFlash}
        </div>
      ) : null}
      {/* NEXT LESSON */}
      <section
        className="rounded-3xl p-6 text-white shadow-[0_24px_80px_rgba(15,110,86,0.20)]"
        style={{ background: "#0F6E56" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">{t("studentNextLesson")}</p>
        {loading ? (
          <div className="mt-4 h-12 rounded-2xl bg-white/10" />
        ) : nextLesson ? (
          <div className="mt-3 space-y-2">
            <div className="text-lg font-bold leading-tight text-white">
              {nextLesson.teacherName}{" "}
              {nextLesson.discipline ? <span className="font-semibold text-white/95">· {nextLesson.discipline}</span> : null}
            </div>
            <div className="text-sm text-white/95 flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} className="text-white shrink-0 opacity-95" />
                {nextLesson.date} · {nextLesson.time}
              </span>
              {nextLesson.durationMinutes ? <span>{nextLesson.durationMinutes} min</span> : null}
              {nextLesson.price != null ? <span>{formatPrice(nextLesson.price)}</span> : null}
              {nextLesson.teachingMode ? <span className="text-white/90">{nextLesson.teachingMode}</span> : null}
            </div>
            {(STUDENT_CANCEL_STATUSES as readonly string[]).includes(nextLesson.status) ? (
              <button
                type="button"
                onClick={() => setCancelBookingId(nextLesson.bookingId)}
                disabled={cancelBusy}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border-2 border-white/95 bg-transparent px-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60"
              >
                {t("cancelClass")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-white/90">
              {t("studentNoLesson")} · {t("studentFindTeacher")}
            </p>
            <Link
              href="/student/search"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-[#0F6E56]"
            >
              <Search size={16} className="mr-2" />
              {t("studentFindTeacher")}
            </Link>
          </div>
        )}
      </section>

      {/* UPCOMING */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{t("studentUpcoming")}</h2>
        {loading ? (
          <div className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 text-sm text-slate-600">
            …
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--p-border-light)] bg-white p-6 text-sm text-slate-700">
            {t("studentNoLesson")}
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 8).map((b) => (
              <li key={b.bookingId} className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 shadow-sm space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center font-bold text-xs">
                        {(b.teacherName || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {b.teacherName}{" "}
                          {b.discipline ? <span className="font-medium text-slate-600">· {b.discipline}</span> : null}
                        </p>
                        <p className="text-xs font-medium text-slate-600">
                          {b.date} · {b.time} {b.price != null ? `· ${formatPrice(b.price)}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  {b.teacherUserId ? (
                    <Link
                      href={`/messages?peer=${encodeURIComponent(b.teacherUserId)}`}
                      className="inline-flex min-h-[44px] sm:min-h-9 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--p-border-light)] px-4 text-xs font-bold text-[#1D9E75] hover:bg-[rgba(29,158,117,0.06)]"
                    >
                      <MessageSquare size={16} />
                      Message
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelBookingId(b.bookingId)}
                    disabled={cancelBusy}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-rose-600/90 bg-white px-3 text-xs font-bold uppercase tracking-wide text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {t("cancelClass")}
                  </button>
                  <Link
                    href="/legal/annulation"
                    className="block text-center text-[11px] font-bold text-[#1D9E75] hover:underline"
                  >
                    {t("viewCancellationPolicy")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CREDITS — shown only when student has at least one teacher */}
      {!loading && teachers.length > 0 && (
        <CreditsWidget
          teachers={teachers.map((x) => ({ teacherId: x.teacherId, name: x.name }))}
        />
      )}

      {/* MY TEACHERS */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{t("studentMyTeachers")}</h2>
        {loading ? null : teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--p-border-light)] bg-white p-6 text-sm text-slate-700">
            {t("studentMyTeachers")}
          </div>
        ) : (
          <ul className="space-y-2">
            {teachers.map((x) => (
              <li key={x.teacherId} className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#F1EFE8] flex items-center justify-center text-sm font-bold text-[#2C2C2A]">
                      {(x.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {x.name}{" "}
                        {x.discipline ? <span className="font-medium text-slate-600">· {x.discipline}</span> : null}
                      </p>
                      <p className="text-xs font-medium text-slate-600">{x.lessons} cours</p>
                    </div>
                  </div>
                  <Link
                    href={`/teacher/profile/${x.teacherId}`}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold",
                      "bg-[#1D9E75] text-white hover:brightness-[0.98]",
                    )}
                  >
                    <UserRound size={16} />
                    {t("studentBook")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmCancelBookingDialog
        open={Boolean(cancelBookingId)}
        onClose={() => {
          if (!cancelBusy) setCancelBookingId(null);
        }}
        onConfirm={async (payload) => {
          await executeStudentCancel(payload);
        }}
        busy={cancelBusy}
        role="student"
        isLate={cancelIsLate}
      />
    </div>
  );
}

