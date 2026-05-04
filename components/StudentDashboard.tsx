"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MessageSquare, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { authDisplayName } from "@/lib/authDisplay";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { CreditsWidget } from "@/components/CreditsWidget";
import { ConfirmCancelBookingDialog } from "@/components/ConfirmCancelBookingDialog";
import { RescheduleModal, type RescheduleModalBooking } from "@/components/RescheduleModal";
import { STUDENT_CANCEL_STATUSES, isBookingLessonDateOnOrAfterToday, isLateCancellation } from "@/lib/bookingCancellation";
import { postCancelBooking } from "@/lib/bookingCancellationClient";
import type { TranslationKey } from "@/lib/translations";

const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function messagesHrefForTeacherUser(teacherUserId: string | null | undefined): string {
  const peer = typeof teacherUserId === "string" ? teacherUserId.trim() : "";
  return peer && PEER_UUID_RE.test(peer) ? `/messages?peer=${encodeURIComponent(peer)}` : "/messages";
}

function formatTeachingModeLabel(mode: string | null, t: (key: TranslationKey) => string): string | null {
  if (!mode) return null;
  const m = mode.toLowerCase().trim();
  if (m === "online") return t("online");
  if (m === "domicile" || m === "person" || m === "in_person" || m === "at_home") return t("inPerson");
  if (m === "hybrid" || m === "both") return t("teachingFormatHybrid");
  return mode;
}

function canStudentCancelBooking(status: string): boolean {
  return (STUDENT_CANCEL_STATUSES as readonly string[]).includes(status);
}

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const { t, formatPrice } = useLocale();

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<BookingWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<{ teacherId: string; name: string; discipline: string; avatarUrl: string | null; lessons: number; teacherUserId: string | null }[]>(
    [],
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
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
        if (r.status !== "confirmed") continue;
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
  const nextLessonModeLabel = useMemo(
    () => formatTeachingModeLabel(nextLesson?.teachingMode ?? null, t),
    [nextLesson?.teachingMode, t],
  );
  const restUpcoming = useMemo(() => upcoming.slice(1), [upcoming]);

  const rescheduleBooking = useMemo(
    () => upcoming.find((x) => x.bookingId === rescheduleBookingId) ?? null,
    [upcoming, rescheduleBookingId],
  );
  const studentReschedulePayload = useMemo((): RescheduleModalBooking | null => {
    if (!rescheduleBooking) return null;
    return {
      id: rescheduleBooking.bookingId,
      slotDate: rescheduleBooking.date,
      timeSlot: rescheduleBooking.time,
      price: Number(rescheduleBooking.price ?? 0),
      otherPartyName: rescheduleBooking.teacherName,
      otherPartyId: rescheduleBooking.teacherUserId ?? "",
      durationMinutes: rescheduleBooking.durationMinutes,
    };
  }, [rescheduleBooking]);

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

  const openRescheduleFor = (bookingId: string) => setRescheduleBookingId(bookingId);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 bg-[#F3FAF6] pb-16 px-4 sm:px-6 lg:rounded-3xl lg:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("studentTabLessons")}</h1>
      </header>

      {localFlash ? (
        <div className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
          {localFlash}
        </div>
      ) : null}

      {/* NEXT CLASS — hero */}
      <section
        className="rounded-3xl p-5 text-white shadow-[0_24px_80px_rgba(15,110,86,0.22)] sm:p-6"
        style={{ background: "#0F6E56" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">{t("studentNextClass")}</p>
        {loading ? (
          <div className="mt-4 h-12 rounded-2xl bg-white/10" />
        ) : nextLesson ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex flex-1 gap-3">
                {nextLesson.avatarUrl?.trim() ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30">
                    <Image
                      src={nextLesson.avatarUrl.trim()}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/25">
                    {(nextLesson.teacherName || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight text-white">
                    {nextLesson.teacherName}
                    {nextLesson.discipline ? (
                      <span className="font-semibold text-white/95"> · {nextLesson.discipline}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} className="shrink-0 opacity-95" />
                      {nextLesson.date} · {nextLesson.time}
                    </span>
                    {nextLesson.durationMinutes ? <span>{nextLesson.durationMinutes} min</span> : null}
                    {nextLesson.price != null ? <span>{formatPrice(nextLesson.price)}</span> : null}
                    {nextLessonModeLabel ? <span className="text-white/85">{nextLessonModeLabel}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/15 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  href={messagesHrefForTeacherUser(nextLesson.teacherUserId)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#0F6E56] shadow-sm transition hover:bg-white/95",
                    "sm:flex-none sm:min-w-[160px]",
                  )}
                >
                  <MessageSquare size={18} className="shrink-0" />
                  {t("messageTeacher")}
                </Link>
                <button
                  type="button"
                  onClick={() => openRescheduleFor(nextLesson.bookingId)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl border-2 border-white/85 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10",
                    "sm:flex-none sm:min-w-[160px]",
                  )}
                >
                  {t("rescheduleClass")}
                </button>
              </div>
              <Link
                href="/legal/annulation"
                className="text-xs font-medium text-white/90 underline-offset-4 transition hover:underline"
              >
                {t("viewCancellationPolicy")}
              </Link>
              {canStudentCancelBooking(nextLesson.status) ? (
                <button
                  type="button"
                  onClick={() => setCancelBookingId(nextLesson.bookingId)}
                  disabled={cancelBusy}
                  className="self-start bg-transparent text-left text-xs font-medium text-rose-200 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
                >
                  {t("cancelClass")}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-white/90">
              {t("studentNoLesson")} · {t("studentFindTeacher")}
            </p>
            <Link
              href="/student/search"
              className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-[#0F6E56]"
            >
              <Search size={16} className="mr-2" />
              {t("studentFindTeacher")}
            </Link>
          </div>
        )}
      </section>

      {/* UPCOMING */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{t("studentUpcomingClasses")}</h2>
        {loading ? (
          <div className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 text-sm text-slate-600">…</div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white p-6 text-sm text-slate-700 shadow-sm">
            {t("studentNoLesson")}
          </div>
        ) : (
          <>
            {restUpcoming.length === 0 && nextLesson ? (
              <p className="text-sm text-slate-600">{t("studentUpcomingNoMore")}</p>
            ) : null}
            {restUpcoming.length > 0 ? (
              <ul className="space-y-3">
                {restUpcoming.map((b) => {
                  const modeLabel = formatTeachingModeLabel(b.teachingMode, t);
                  const msgHref = messagesHrefForTeacherUser(b.teacherUserId);
                  return (
                    <li
                      key={b.bookingId}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:rounded-3xl sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
                        <div className="flex min-w-0 flex-1 gap-3">
                          {b.avatarUrl?.trim() ? (
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-100">
                              <Image
                                src={b.avatarUrl.trim()}
                                alt=""
                                width={44}
                                height={44}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-xs font-bold text-[#0F6E56]">
                              {(b.teacherName || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                              {b.teacherName}
                              {b.discipline ? <span className="font-medium text-slate-600"> · {b.discipline}</span> : null}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {b.date} · {b.time}
                              {b.durationMinutes != null ? ` · ${b.durationMinutes} min` : ""}
                              {modeLabel ? ` · ${modeLabel}` : ""}
                              {b.price != null ? ` · ${formatPrice(b.price)}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 lg:w-[min(100%,280px)] lg:shrink-0 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-6 lg:pt-0">
                          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                            <Link
                              href={msgHref}
                              className={cn(
                                "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47]",
                              )}
                            >
                              <MessageSquare size={18} className="shrink-0" />
                              {t("messageTeacher")}
                            </Link>
                            <button
                              type="button"
                              onClick={() => openRescheduleFor(b.bookingId)}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#0F6E56]/35 bg-white px-4 text-sm font-semibold text-[#0F6E56] transition hover:bg-[#0F6E56]/[0.06]"
                            >
                              {t("rescheduleClass")}
                            </button>
                          </div>
                          <Link
                            href="/legal/annulation"
                            className="text-center text-xs font-medium text-[#0F6E56]/80 underline-offset-4 hover:underline lg:text-left"
                          >
                            {t("viewCancellationPolicy")}
                          </Link>
                          {canStudentCancelBooking(b.status) ? (
                            <button
                              type="button"
                              onClick={() => setCancelBookingId(b.bookingId)}
                              disabled={cancelBusy}
                              className="text-center text-xs font-medium text-rose-500 underline-offset-4 transition hover:text-rose-600 hover:underline disabled:opacity-50 lg:text-left"
                            >
                              {t("cancelClass")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}
      </section>

      {!loading && teachers.length > 0 && (
        <CreditsWidget
          teachers={teachers.map((x) => ({
            teacherId: x.teacherId,
            name: x.name,
            discipline: x.discipline,
            imageUrl: x.avatarUrl,
          }))}
        />
      )}

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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1EFE8] text-sm font-bold text-[#2C2C2A]">
                      {(x.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {x.name}
                        {x.discipline ? <span className="font-medium text-slate-600"> · {x.discipline}</span> : null}
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        {x.lessons} cours
                      </p>
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

      {studentReschedulePayload ? (
        <RescheduleModal
          isOpen
          onClose={() => setRescheduleBookingId(null)}
          booking={studentReschedulePayload}
          userRole="student"
          currentUserName={String(profile?.name || (user ? authDisplayName(user) : "") || "")}
          onCancelLesson={() => {
            if (rescheduleBookingId) setCancelBookingId(rescheduleBookingId);
            setRescheduleBookingId(null);
          }}
        />
      ) : null}

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
