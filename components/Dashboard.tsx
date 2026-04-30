"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Flame, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { authDisplayName } from "../lib/authDisplay";
import type { StudentProfile } from "../types";
import { AssignmentHub } from "./AssignmentHub";
import { useRouter } from "next/navigation";
import { formatLocalISODate, slotStartMinutes } from "../lib/slots";
import { cn } from "../lib/utils";
import { useLocale } from "../lib/locale-context";
import { localeToBcp47 } from "@/lib/i18n/types";
import { TeacherDashboardStats } from "@/components/dashboard/teacher/TeacherDashboardStats";
import { TeacherProfileCompletenessCard } from "@/components/dashboard/teacher/TeacherProfileCompletenessCard";
import { TeacherRequestCard } from "@/components/dashboard/teacher/TeacherRequestCard";
import { TeacherScheduleCard } from "@/components/dashboard/teacher/TeacherScheduleCard";
import { ConfirmCancelBookingDialog } from "@/components/ConfirmCancelBookingDialog";
import {
  STUDENT_CANCEL_STATUSES,
  isBookingLessonDateOnOrAfterToday,
  isLateCancellation,
} from "@/lib/bookingCancellation";
import { postCancelBooking } from "@/lib/bookingCancellationClient";

interface BookingWithTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  status: string;
  studentLevel?: string;
  teachingMode?: string;
  slotDate?: string | null;
  timeSlot?: string | null;
}

function bookingSortKey(b: { slot_date?: string | null; date?: string | null; time_slot?: string | null; time?: string | null }) {
  const d = String(b.slot_date || b.date || "");
  const t = String(b.time_slot || b.time || "00h00");
  const mins = slotStartMinutes(t);
  return `${d}#${String(mins).padStart(5, "0")}`;
}

export function Dashboard() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const role = authProfile?.role as string | undefined;
  const isTeacherRole = role === "teacher";
  const isStudentRole = role === "student";

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([]);
  const [teacherBookings, setTeacherBookings] = useState<any[]>([]);
  const [teacherMeta, setTeacherMeta] = useState<{
    discipline: string;
    hourlyRate: number;
    bio: string;
    teacherImageUrl: string | null;
    profilePhotoUrl: string | null;
    disciplineCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // id → "accepting" | "declining"
  const [bookingAction, setBookingAction] = useState<Record<string, "accepting" | "declining">>({});
  const [actionFlash, setActionFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [cancelBooking, setCancelBooking] = useState<{ id: string; side: "student" | "teacher" } | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const teacherDash = useMemo(() => {
    if (!isTeacherRole) return null;
    const today = formatLocalISODate(new Date());
    const activeStatuses = ["confirmed", "booked"];
    const confirmedUpcoming = teacherBookings
      .filter((b) => activeStatuses.includes(b.status))
      .filter((b) => {
        const d = String(b.slot_date || b.date || "");
        return d >= today;
      })
      .sort((a, b) => bookingSortKey(a).localeCompare(bookingSortKey(b)));
    const todayList = teacherBookings
      .filter((b) => activeStatuses.includes(b.status) || b.status === "pending_payment")
      .filter((b) => String(b.slot_date || b.date || "") === today)
      .sort((a, b) => bookingSortKey(a).localeCompare(bookingSortKey(b)));
    const pendingList = teacherBookings.filter((b) =>
      ["pending", "pending_teacher", "pending_payment"].includes(b.status),
    );
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = teacherBookings
      .filter((b) => {
        if (!["confirmed", "booked"].includes(b.status)) return false;
        if (!b.created_at) return false;
        const c = new Date(b.created_at as string);
        if (Number.isNaN(c.getTime())) return false;
        return c.getFullYear() === monthStart.getFullYear() && c.getMonth() === monthStart.getMonth();
      })
      .reduce((s, b) => s + (Number(b.price) || 0), 0);
    const distinctStudents = new Set(
      teacherBookings.filter((b) => activeStatuses.includes(b.status)).map((b) => String(b.student_id)),
    ).size;
    const coursesTodayCount = todayList.filter((b) => activeStatuses.includes(b.status)).length;
    return {
      confirmedUpcoming,
      todayList,
      pendingList,
      today,
      monthRevenue,
      distinctStudents,
      coursesTodayCount,
    };
  }, [isTeacherRole, teacherBookings]);

  const showFlash = (kind: "ok" | "err", text: string) => {
    setActionFlash({ kind, text });
    setTimeout(() => setActionFlash(null), 4000);
  };

  const studentSidebarBookings = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          (STUDENT_CANCEL_STATUSES as readonly string[]).includes(b.status) &&
          isBookingLessonDateOnOrAfterToday({
            slot_date: b.slotDate ?? b.date,
            date: b.date,
            time_slot: b.timeSlot ?? b.time,
            time: b.time,
          }),
      )
      .sort((a, z) =>
        bookingSortKey({
          slot_date: a.slotDate,
          date: a.date,
          time_slot: a.timeSlot,
          time: a.time,
        }).localeCompare(
          bookingSortKey({
            slot_date: z.slotDate,
            date: z.date,
            time_slot: z.timeSlot,
            time: z.time,
          }),
        ),
      )
      .slice(0, 3);
  }, [bookings]);

  const cancelLessonRow = useMemo(() => {
    if (!cancelBooking) return null;
    if (cancelBooking.side === "student") {
      const row = bookings.find((b) => b.id === cancelBooking.id);
      if (!row) return null;
      return {
        slot_date: row.slotDate ?? row.date ?? null,
        date: row.date ?? null,
        time_slot: row.timeSlot ?? row.time ?? null,
        time: row.time ?? null,
      };
    }
    const row = teacherBookings.find((b) => String(b.id) === cancelBooking.id);
    if (!row) return null;
    return {
      slot_date: (row.slot_date as string | null | undefined) ?? null,
      date: (row.date as string | null | undefined) ?? null,
      time_slot: (row.time_slot as string | null | undefined) ?? null,
      time: (row.time as string | null | undefined) ?? null,
    };
  }, [cancelBooking, bookings, teacherBookings]);

  const cancelIsLate = cancelLessonRow ? isLateCancellation(cancelLessonRow) : false;

  const runConfirmedCancelFromDialog = async ({
    reason,
    message,
  }: {
    reason: string;
    message: string;
  }) => {
    if (!cancelBooking) return;
    setCancelBusy(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));
      const res = await postCancelBooking(cancelBooking.id, {
        accessToken: token,
        reason: reason || undefined,
        message: message || undefined,
      });
      if ("error" in res) throw new Error(res.error);
      if (cancelBooking.side === "student") {
        setBookings((prev) => prev.filter((x) => x.id !== cancelBooking.id));
      } else {
        setTeacherBookings((prev) => prev.filter((x) => String(x.id) !== cancelBooking.id));
      }
      setCancelBooking(null);
      showFlash("ok", t("classCancelled"));
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setCancelBusy(false);
    }
  };

  const cancelTeacherBooking = async (id: string) => {
    if (!confirm(t("declineBookingConfirm"))) return;
    setBookingAction((prev) => ({ ...prev, [id]: "declining" }));
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      // Optimistic: remove from list immediately
      setTeacherBookings((prev) => prev.filter((b) => b.id !== id));
      showFlash("ok", t("bookingDeclined"));
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setBookingAction((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const acceptTeacherBooking = async (id: string) => {
    const prevRow = teacherBookings.find((b) => b.id === id);
    const previousStatus = (prevRow?.status as string) || "pending_teacher";
    setBookingAction((prev) => ({ ...prev, [id]: "accepting" }));
    // Optimistic update: move to confirmed right away
    setTeacherBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "confirmed" } : b)),
    );
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/bookings/${id}/accept`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? t("anErrorOccurred"));
      }
      showFlash("ok", t("classAcceptedCanMessage"));
    } catch (e) {
      // Roll back on failure
      setTeacherBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: previousStatus } : b)),
      );
      showFlash("err", e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setBookingAction((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user || authLoading) return;
    if (!isTeacherRole && !isStudentRole) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    const loadProfile = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (cancelled || error) return;
      if (data) {
        const dash =
          typeof data.dashboard === "object" && data.dashboard !== null
            ? (data.dashboard as Record<string, unknown>)
            : {};
        if (dash.streak !== undefined) {
          setProfile({
            id: data.id,
            name: data.name || authDisplayName(user),
            email: data.email || user.email || "",
            activeSubscriptions: (dash.activeSubscriptions as StudentProfile["activeSubscriptions"]) || [],
            progress: (dash.progress as StudentProfile["progress"]) || {},
            badges: (dash.badges as StudentProfile["badges"]) || [],
            streak: Number(dash.streak) || 1,
            milestones: (dash.milestones as StudentProfile["milestones"]) || [],
          });
        } else {
          const newProfile: StudentProfile = {
            id: user.id,
            name: authDisplayName(user),
            email: user.email || "",
            activeSubscriptions: [],
            progress: {},
            badges: [{ id: "1", icon: "🔥", name: "Première Pratique", date: new Date().toISOString() }],
            streak: 1,
            milestones: [
              { id: "1", title: "Première session", completed: true },
              { id: "2", title: "5 leçons complétées", completed: false },
              { id: "3", title: "Maître de discipline", completed: false },
              { id: "4", title: "Série de 30 jours", completed: false },
            ],
          };
          await supabase
            .from("profiles")
            .update({
              dashboard: {
                activeSubscriptions: newProfile.activeSubscriptions,
                progress: newProfile.progress,
                badges: newProfile.badges,
                streak: newProfile.streak,
                milestones: newProfile.milestones,
              },
            })
            .eq("id", user.id);
          setProfile(newProfile);
        }
      }
    };

    const loadStudentBookings = async () => {
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      const list: BookingWithTeacher[] = [];
      for (const row of rows || []) {
        const tid = row.teacher_id as string;
        const { data: trow } = await supabase.from("teachers").select("name").eq("id", tid).maybeSingle();
        list.push({
          id: row.id as string,
          teacherId: tid,
          teacherName: (trow?.name as string) || "?",
          date: (row.date as string) || "",
          time: (row.time as string) || "",
          status: row.status as string,
          studentLevel: row.student_level as string | undefined,
          teachingMode: row.teaching_mode as string | undefined,
          slotDate: (row.slot_date as string | null) ?? null,
          timeSlot: (row.time_slot as string | null) ?? null,
        });
      }
      setBookings(list);
    };

    const loadTeacherBookings = async () => {
      const { data: myProf } = await supabase.from("profiles").select("photo_url").eq("id", user.id).maybeSingle();
      const profilePhotoUrlRaw = (myProf as { photo_url?: string | null } | null)?.photo_url ?? null;

      const { data: t } = await supabase
        .from("teachers")
        .select("id, discipline, price_per_lesson, bio, image_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!t?.id) {
        setTeacherBookings([]);
        setTeacherMeta(null);
        return;
      }
      const row = t as {
        id: string;
        discipline?: string;
        price_per_lesson?: number;
        bio?: string | null;
        image_url?: string | null;
      };
      const { data: drows } = await supabase.from("teacher_disciplines").select("id").eq("teacher_id", row.id);
      const img = row.image_url != null ? String(row.image_url).trim() : "";
      const pPhoto = profilePhotoUrlRaw != null ? String(profilePhotoUrlRaw).trim() : "";

      setTeacherMeta({
        discipline: String(row.discipline || "—"),
        hourlyRate: Number(row.price_per_lesson) || 0,
        bio: String(row.bio || "").trim(),
        teacherImageUrl: img ? img : null,
        profilePhotoUrl: pPhoto ? pPhoto : null,
        disciplineCount: drows?.length ?? 0,
      });
      const teacherSlug = row.id;
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("teacher_id", teacherSlug)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      const list: any[] = [];
      for (const row of rows || []) {
        const sid = row.student_id as string;
        const { data: prow } = await supabase.from("profiles").select("name, photo_url").eq("id", sid).maybeSingle();
        list.push({
          id: row.id,
          ...row,
          studentName: (prow?.name as string) || "?",
          studentPhotoUrl: (prow?.photo_url as string) || null,
        });
      }
      setTeacherBookings(list);
    };

    const refreshAll = async () => {
      try {
        if (isStudentRole) {
          await loadProfile();
          await loadStudentBookings();
        } else if (isTeacherRole) {
          await loadTeacherBookings();
        }
    } catch (e) {
      void e;
    } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refreshAll();

    const ch = supabase
      .channel(`dashboard:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          if (isStudentRole) void loadProfile();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        if (isStudentRole) void loadStudentBookings();
        if (isTeacherRole) void loadTeacherBookings();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user, authLoading, isTeacherRole, isStudentRole]);

  if (!user || authLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center">
        <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{t("loadingAccount")}</h2>
      </div>
    );
  }

  if (!isTeacherRole && !isStudentRole) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <p className="text-slate-600 font-medium">{t("configuringProfile")}</p>
        <p className="text-sm text-slate-600">{t("redirectingEnroll")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center">
        <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{t("dashboardInitializing")}</h2>
      </div>
    );
  }

  if (isTeacherRole && teacherDash) {
    const { confirmedUpcoming, pendingList, monthRevenue, distinctStudents, coursesTodayCount } = teacherDash;
    const displayName = authProfile?.name || authDisplayName(user);
    const dateLocale = localeToBcp47(locale);
    const todayLabel = new Date().toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const fmtMoney = (n: number) =>
      new Intl.NumberFormat(dateLocale, { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

    const completenessChecks = teacherMeta
      ? [
          Boolean(teacherMeta.profilePhotoUrl || teacherMeta.teacherImageUrl),
          teacherMeta.bio.trim().length >= 20,
          teacherMeta.hourlyRate > 0,
          teacherMeta.disciplineCount >= 1,
        ]
      : [false, false, false, false];
    const completenessPct = Math.round(
      (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100,
    );

    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-6 pb-12">
        <header className="space-y-1">
          <p className="text-xs font-medium capitalize text-slate-600">{todayLabel}</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t("greeting")} {displayName}
          </h1>
          <p className="text-sm text-slate-600">{t("dashboardTeacherSubtitle")}</p>
        </header>

        <TeacherDashboardStats
          items={[
            { labelKey: "lessonsToday", value: coursesTodayCount },
            { labelKey: "activeStudentsLabel", value: distinctStudents },
            { labelKey: "thisMonthLabel", value: fmtMoney(monthRevenue) },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#00694c]">{t("pendingRequests")}</p>
              {actionFlash ? (
                <p
                  className={cn(
                    "mb-3 rounded-xl px-3 py-2 text-sm font-medium",
                    actionFlash.kind === "ok" ? "bg-[rgba(0,105,76,0.08)] text-[#004d38]" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {actionFlash.text}
                </p>
              ) : null}
              {pendingList.length === 0 ? (
                <p className="text-sm text-slate-600">{t("noPending")}</p>
              ) : (
                <ul className="space-y-3">
                  {pendingList.map((b) => (
                    <TeacherRequestCard
                      key={b.id as string}
                      booking={b}
                      disciplineLabel={teacherMeta?.discipline ?? "—"}
                      action={bookingAction[b.id as string]}
                      onAccept={() => void acceptTeacherBooking(b.id as string)}
                      onDecline={() => void cancelTeacherBooking(b.id as string)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <TeacherScheduleCard
              titleKey="upcomingConfirmedClasses"
              items={confirmedUpcoming.map((b) => ({
                id: b.id as string,
                studentName: b.studentName as string | undefined,
                studentUserId: (b.student_id as string | undefined) ?? null,
                slot_date: b.slot_date as string | null | undefined,
                date: b.date as string | null | undefined,
                time_slot: b.time_slot as string | null | undefined,
                time: b.time as string | null | undefined,
              }))}
              emptyHint={t("dashboardNoLessonsWeek")}
              onRequestCancelClass={(bookingId) => setCancelBooking({ id: bookingId, side: "teacher" })}
              cancelBusy={cancelBusy}
            />

        <ConfirmCancelBookingDialog
          open={cancelBooking?.side === "teacher"}
          onClose={() => {
            if (!cancelBusy) setCancelBooking(null);
          }}
          onConfirm={async (payload) => {
            await runConfirmedCancelFromDialog(payload);
          }}
          busy={cancelBusy}
          role="teacher"
          isLate={cancelBooking?.side === "teacher" ? cancelIsLate : false}
        />

            <AssignmentHub mode="teacher" />
          </div>

          <div className="space-y-6 lg:col-span-1">
            <TeacherProfileCompletenessCard percent={completenessPct} ctaHref="/teacher/my-profile" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="ds-label text-slate-600">{t("dashboardStudentSpace")}</p>
          <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-slate-900">{t("dashboard")}</h2>
          <p className="text-[14px] text-slate-600 mt-1">{t("dashboardStudentSubtitle")}</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-6 rounded-3xl text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame size={24} className="animate-pulse" />
                  <span className="text-3xl font-bold">{profile?.streak || 1}</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{t("dashboardStreakTitle")}</h4>
                  <p className="text-xs opacity-80 font-medium">{t("dashboardStreakEncourage")}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Réservations</h4>
                  <p className="text-3xl font-bold text-brand-primary">{bookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-brand-primary">
                  <Calendar size={24} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push("/student/search")}
                  className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
                >
                  {t("findTeacher")}
                </button>
              </div>
            </div>
          </div>

          <AssignmentHub mode="student" />
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Ma semaine</h3>
              <Calendar size={14} className="text-slate-600" />
            </div>
            <div className="space-y-3">
              {studentSidebarBookings.length > 0 ? (
                studentSidebarBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-primary transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-900">{b.teacherName}</span>
                      <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter">{b.time}</span>
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{b.date}</p>
                    <button
                      type="button"
                      onClick={() => setCancelBooking({ id: b.id, side: "student" })}
                      disabled={cancelBusy}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-rose-600/90 bg-white px-3 text-[10px] font-bold uppercase tracking-wide text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {t("cancelClass")}
                    </button>
                    <Link
                      href="/legal/annulation"
                      className="block text-center text-[9px] font-bold uppercase tracking-wide text-brand-primary hover:underline"
                    >
                      {t("viewCancellationPolicy")}
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">{t("dashboardNoLessonsWeek")}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/student/search")}
                    className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
                  >
                    {t("dashboardFindMentor")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-teal-900 rounded-3xl p-6 text-white space-y-4">
            <ShieldCheck size={32} className="text-teal-400" />
            <h4 className="font-bold text-lg leading-tight">{t("dashboardSecurityTitle")}</h4>
            <p className="text-xs opacity-80 leading-relaxed">{t("dashboardSecurityBlurb")}</p>
          </div>
        </div>
      </div>

      <ConfirmCancelBookingDialog
        open={cancelBooking?.side === "student"}
        onClose={() => {
          if (!cancelBusy) setCancelBooking(null);
        }}
        onConfirm={async (payload) => {
          await runConfirmedCancelFromDialog(payload);
        }}
        busy={cancelBusy}
        role="student"
        isLate={cancelBooking?.side === "student" ? cancelIsLate : false}
      />
    </div>
  );
}

