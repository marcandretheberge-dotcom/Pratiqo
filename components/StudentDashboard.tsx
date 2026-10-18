"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CalendarDays, MessageSquare, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { StudentLearningProject } from "@/components/student/StudentLearningProject";
import { authDisplayName } from "@/lib/authDisplay";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { CreditsWidget } from "@/components/CreditsWidget";
import { ConfirmCancelBookingDialog } from "@/components/ConfirmCancelBookingDialog";
import { RescheduleModal, type RescheduleModalBooking } from "@/components/RescheduleModal";
import { STUDENT_CANCEL_STATUSES, isBookingLessonDateOnOrAfterToday, isLateCancellation, bookingLessonStartDate } from "@/lib/bookingCancellation";
import { postCancelBooking } from "@/lib/bookingCancellationClient";
import type { TranslationKey } from "@/lib/translations";
import { localeToBcp47 } from "@/lib/i18n/types";
import {
  bookingWallTimeRangeToUtc,
  formatBookingTimeForBothZones,
  getBrowserTimeZone,
} from "@/lib/timezones";
import { SupportCaseModal } from "@/components/support/SupportCaseModal";
import { compareBookingsByStartAsc } from "@/lib/bookings/sort";
import { AppListSkeleton } from "@/components/loading/AppSkeletons";
import { isOfferPolicyEnforcementUiEnabled } from "@/lib/offers/offerPolicyEnforcement";
import {
  evaluatePackageCancellationPolicy,
  packageCancelPolicyUiHintFromEvaluation,
  type PackageCancelPolicyUiHint,
} from "@/lib/offers/cancellationPolicyEvaluation";

const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BookingRow = {
  id: string;
  teacher_id: string;
  learner_profile_id?: string | null;
  status: string;
  date: string | null;
  time: string | null;
  slot_date?: string | null;
  time_slot?: string | null;
  created_at?: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  teaching_mode?: string | null;
  meeting_url?: string | null;
  booking_payment_source?: string | null;
  package_redemption_id?: string | null;
  teacher_offer_cancellation_preference_snapshot?: string | null;
};

type LearnerRow = {
  id: string;
  display_name: string | null;
};

type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  image_url: string | null;
  timezone: string | null;
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
  startIso: string | null;
  endIso: string | null;
  teacherTimeZone: string | null;
  durationMinutes: number | null;
  price: number | null;
  teachingMode: string | null;
  status: string;
  learnerName: string | null;
  meetingUrl: string | null;
  slotDate: string | null;
  timeSlot: string | null;
  createdAt: string | null;
  bookingPaymentSource: string | null;
  packageRedemptionId: string | null;
  cancellationPreferenceSnapshot: string | null;
};

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
  const { t, formatPrice, locale } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<BookingWithTeacher[]>([]);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [teachers, setTeachers] = useState<{ teacherId: string; name: string; discipline: string; avatarUrl: string | null; lessons: number; teacherUserId: string | null }[]>(
    [],
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [localFlash, setLocalFlash] = useState<string | null>(null);
  const [supportBookingId, setSupportBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, teacher_id, learner_profile_id, status, date, time, slot_date, time_slot, created_at, duration_minutes, price, teaching_mode, meeting_url, booking_payment_source, package_redemption_id, teacher_offer_cancellation_preference_snapshot")
        .eq("student_id", user.id)
        .in("status", [...STUDENT_CANCEL_STATUSES])
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      const rows = (bookings || []) as unknown as BookingRow[];
      const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_id)));
      const learnerIds = Array.from(new Set(rows.map((r) => r.learner_profile_id).filter(Boolean))) as string[];
      const teacherMap = new Map<string, TeacherRow>();
      const learnerMap = new Map<string, LearnerRow>();

      await Promise.all([
        ...teacherIds.map(async (tid) => {
          const { data } = await supabase.from("teachers").select("id, user_id, name, discipline, image_url, timezone").eq("id", tid).maybeSingle();
          if (data) teacherMap.set(tid, data as unknown as TeacherRow);
        }),
        learnerIds.length
          ? supabase
              .from("learner_profiles")
              .select("id, display_name")
              .in("id", learnerIds)
              .then(({ data }) => {
                for (const row of (data ?? []) as LearnerRow[]) learnerMap.set(row.id, row);
              })
          : Promise.resolve(),
      ]);

      // Hero + upcoming list: confirmed lessons only — pending_payment is not a scheduled class.
      const upcomingList: BookingWithTeacher[] = rows
        .filter((r) => r.status === "confirmed" && (r.slot_date || r.date) && (r.time_slot || r.time))
        .map((r) => {
          const tr = teacherMap.get(r.teacher_id);
          const lessonDate = String(r.slot_date || r.date || "");
          const lessonTime = String(r.time_slot || r.time || "");
          const range =
            lessonDate && lessonTime
              ? bookingWallTimeRangeToUtc({
                  dateIso: lessonDate,
                  slot: lessonTime,
                  durationMinutes: r.duration_minutes,
                  timeZone: tr?.timezone,
                })
              : null;
          return {
            bookingId: r.id,
            teacherId: r.teacher_id,
            teacherUserId: tr?.user_id ?? null,
            teacherName: (tr?.name ?? t("teacher")).toString(),
            discipline: (tr?.discipline ?? "").toString(),
            avatarUrl: tr?.image_url ?? null,
            date: lessonDate,
            time: lessonTime,
            startIso: range?.start.toISOString() ?? null,
            endIso: range?.end.toISOString() ?? null,
            teacherTimeZone: tr?.timezone ?? null,
            durationMinutes: typeof r.duration_minutes === "number" ? r.duration_minutes : null,
            price: typeof r.price === "number" ? r.price : r.price != null ? Number(r.price) : null,
            teachingMode: r.teaching_mode ?? null,
            status: r.status,
            learnerName: r.learner_profile_id ? learnerMap.get(r.learner_profile_id)?.display_name ?? null : null,
            meetingUrl: typeof r.meeting_url === "string" && r.meeting_url.trim() ? r.meeting_url.trim() : null,
            slotDate: r.slot_date ?? null,
            timeSlot: r.time_slot ?? null,
            createdAt: r.created_at ?? null,
            bookingPaymentSource: r.booking_payment_source ?? null,
            packageRedemptionId: r.package_redemption_id ?? null,
            cancellationPreferenceSnapshot: r.teacher_offer_cancellation_preference_snapshot ?? null,
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
        .sort((a, b) =>
          compareBookingsByStartAsc(
            {
              id: a.bookingId,
              slot_date: a.slotDate,
              date: a.date,
              time_slot: a.timeSlot,
              time: a.time,
              created_at: a.createdAt,
            },
            {
              id: b.bookingId,
              slot_date: b.slotDate,
              date: b.date,
              time_slot: b.timeSlot,
              time: b.time,
              created_at: b.createdAt,
            },
          ),
        );

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
        setPendingPaymentCount(rows.filter((r) => r.status === "pending_payment").length);
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
  const timeLabelFor = (booking: BookingWithTeacher) => {
    if (!booking.startIso || !booking.endIso) return `${booking.date} · ${booking.time}`;
    const labels = formatBookingTimeForBothZones({
      startIso: booking.startIso,
      endIso: booking.endIso,
      userTimeZone: browserTimeZone,
      teacherTimeZone: booking.teacherTimeZone,
      locale: dateLocale,
    });
    return labels.userLabel;
  };
  const teacherTimeLabelFor = (booking: BookingWithTeacher) => {
    if (!booking.startIso || !booking.endIso) return null;
    const labels = formatBookingTimeForBothZones({
      startIso: booking.startIso,
      endIso: booking.endIso,
      userTimeZone: browserTimeZone,
      teacherTimeZone: booking.teacherTimeZone,
      locale: dateLocale,
    });
    return labels.showTeacherTime ? labels.teacherLabel : null;
  };
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

  const cancelPackagePolicyHint = useMemo((): PackageCancelPolicyUiHint => {
    if (!isOfferPolicyEnforcementUiEnabled() || !cancelBookingId) return null;
    const b = upcoming.find((x) => x.bookingId === cancelBookingId);
    if (!b) return null;
    const isPackage =
      b.bookingPaymentSource === "package_credit" ||
      (typeof b.packageRedemptionId === "string" && b.packageRedemptionId.trim().length > 0);
    if (!isPackage) return null;
    const evaluation = evaluatePackageCancellationPolicy({
      bookingStartAt: bookingLessonStartDate({
        slot_date: b.date,
        date: b.date,
        time_slot: b.time,
        time: b.time,
      }),
      cancellationRequestedAt: new Date(),
      policyCodeSnapshot: b.cancellationPreferenceSnapshot,
      bookingPaymentSource: b.bookingPaymentSource,
      redemptionStatus: null,
      bookingStatus: b.status,
      hasPackageRedemption: Boolean(b.packageRedemptionId),
    });
    return packageCancelPolicyUiHintFromEvaluation(evaluation);
  }, [cancelBookingId, upcoming]);

  const executeStudentCancel = async (payload: {
    reason: string;
    message: string;
    exceptionalReview?: boolean;
  }) => {
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
        exceptionalReview: payload.exceptionalReview === true,
      });
      if ("error" in res) throw new Error(res.error);
      setCancelBookingId(null);
      // Surface an honest outcome flash so the user never sees "Cours annulé."
      // alone when they were told elsewhere a refund would happen. The API
      // returns `copy_key` (e.g. cancelOutcomeRefundExecuted) and the client
      // dictionary holds the matching <key>Title strings.
      const flashKey: TranslationKey =
        res.copy_key ? (`${res.copy_key}Title` as TranslationKey) : "classCancelled";
      setLocalFlash(t(flashKey));
      setReloadKey((k) => k + 1);
      window.setTimeout(() => setLocalFlash(null), 5000);
    } catch {
      setLocalFlash(t("anErrorOccurred"));
      window.setTimeout(() => setLocalFlash(null), 4000);
    } finally {
      setCancelBusy(false);
    }
  };

  const openRescheduleFor = (bookingId: string) => setRescheduleBookingId(bookingId);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 bg-[#F3FAF6] px-0 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-8 sm:px-6 lg:rounded-3xl lg:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("studentTabLessons")}</h1>
      </header>

      {localFlash ? (
        <div className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
          {localFlash}
        </div>
      ) : null}

      {!loading && pendingPaymentCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <p className="font-medium leading-relaxed">{t("studentPendingPaymentBanner")}</p>
          <Link href="/student/payments" className="mt-2 inline-flex font-semibold text-teal-700 hover:underline">
            {t("studentPendingPaymentLink")}
          </Link>
        </div>
      ) : null}

      {/* NEXT CLASS — hero */}
      <StudentLearningProject />
      <section
        className="rounded-[1.75rem] p-5 text-white shadow-[0_18px_50px_rgba(15,110,86,0.18)] sm:rounded-3xl sm:p-6 sm:shadow-[0_24px_80px_rgba(15,110,86,0.22)]"
        style={{ background: "var(--palette-teal-700)" }}
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
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/90">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} className="shrink-0 opacity-95" />
                      {timeLabelFor(nextLesson)}
                    </span>
                    {nextLesson.durationMinutes ? <span>{nextLesson.durationMinutes} min</span> : null}
                    {nextLesson.price != null ? <span>{formatPrice(nextLesson.price)}</span> : null}
                    {nextLessonModeLabel ? <span className="text-white/85">{nextLessonModeLabel}</span> : null}
                  </div>
                  {nextLesson.learnerName ? (
                    <p className="mt-2 text-sm font-semibold text-white/90">
                      {t("studentCourseForLearner")} : {nextLesson.learnerName}
                    </p>
                  ) : null}
                  {teacherTimeLabelFor(nextLesson) ? (
                    <p className="mt-1 text-xs text-white/80">
                      {t("teacherLocalTime")} : {teacherTimeLabelFor(nextLesson)}
                    </p>
                  ) : null}
                  {String(nextLesson.teachingMode || "").toLowerCase() === "online" ? (
                    nextLesson.meetingUrl ? (
                      <div className="mt-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">{t("onlineLessonLink")}</p>
                        <a
                          href={nextLesson.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex font-semibold text-white underline-offset-4 hover:underline"
                        >
                          {t("joinCall")}
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-white/85">{t("onlineLessonLinkPending")}</p>
                    )
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/15 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  href={messagesHrefForTeacherUser(nextLesson.teacherUserId)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-white/95",
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
                <button
                  type="button"
                  onClick={() => setSupportBookingId(nextLesson.bookingId)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/70 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10",
                    "sm:flex-none sm:min-w-[160px]",
                  )}
                >
                  <AlertTriangle size={17} className="shrink-0" />
                  {t("reportProblem")}
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
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-teal-700 sm:w-auto"
            >
              <Search size={16} className="mr-2" />
              {t("studentFindTeacher")}
            </Link>
          </div>
        )}
      </section>

      {/* UPCOMING */}
      {(loading || nextLesson || upcoming.length > 0) && (
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{t("studentUpcomingClasses")}</h2>
        {loading ? (
          <AppListSkeleton count={2} />
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white p-5 text-sm text-slate-700 shadow-sm sm:p-6">
            {t("studentUpcomingNoMore")}
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
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                              {(b.teacherName || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                              {b.teacherName}
                              {b.discipline ? <span className="font-medium text-slate-600"> · {b.discipline}</span> : null}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {timeLabelFor(b)}
                              {b.durationMinutes != null ? ` · ${b.durationMinutes} min` : ""}
                              {modeLabel ? ` · ${modeLabel}` : ""}
                              {b.price != null ? ` · ${formatPrice(b.price)}` : ""}
                            </p>
                            {teacherTimeLabelFor(b) ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {t("teacherLocalTime")} : {teacherTimeLabelFor(b)}
                              </p>
                            ) : null}
                            {b.learnerName ? (
                              <p className="mt-1 text-xs font-semibold text-teal-700">
                                {t("studentCourseForLearner")} : {b.learnerName}
                              </p>
                            ) : null}

                            {String(b.teachingMode || "").toLowerCase() === "online" ? (
                              b.meetingUrl ? (
                                <div className="mt-2 rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-2 text-xs">
                                  <p className="font-bold uppercase tracking-widest text-teal-700">{t("onlineLessonLink")}</p>
                                  <a
                                    href={b.meetingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-2 font-semibold text-teal-700 hover:underline"
                                  >
                                    {t("joinCall")}
                                  </a>
                                </div>
                              ) : (
                                <p className="mt-2 text-xs font-semibold text-slate-600">
                                  {t("onlineLessonLinkPending")}
                                </p>
                              )
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 lg:w-[min(100%,280px)] lg:shrink-0 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-6 lg:pt-0">
                          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                            <Link
                              href={msgHref}
                              className={cn(
                                "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800",
                              )}
                            >
                              <MessageSquare size={18} className="shrink-0" />
                              {t("messageTeacher")}
                            </Link>
                            <button
                              type="button"
                              onClick={() => openRescheduleFor(b.bookingId)}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-teal-700/35 bg-white px-4 text-sm font-semibold text-teal-700 transition hover:bg-teal-700/[0.06]"
                            >
                              {t("rescheduleClass")}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSupportBookingId(b.bookingId)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            <AlertTriangle size={17} className="shrink-0" />
                            {t("reportProblem")}
                          </button>
                          <Link
                            href="/legal/annulation"
                            className="text-center text-xs font-medium text-teal-700/80 underline-offset-4 hover:underline lg:text-left"
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
      )}

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
        {loading ? (
          <AppListSkeleton count={2} />
        ) : teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--p-border-light)] bg-white p-5 text-sm text-slate-700 sm:p-6">
            <p>{t("studentMyTeachersEmpty")}</p>
            <Link
              href="/student/search"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white hover:brightness-[0.98]"
            >
              <Search size={16} className="mr-2" />
              {t("studentFindTeacher")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {teachers.map((x) => (
              <li key={x.teacherId} className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        {t("studentLessonCount").replace("{count}", String(x.lessons))}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/student/search?openTeacher=${encodeURIComponent(x.teacherId)}`}
                    className={cn(
                      "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold sm:h-9 sm:min-h-0 sm:w-auto sm:rounded-full",
                      "bg-teal-600 text-white hover:brightness-[0.98]",
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
        packagePolicyHint={cancelPackagePolicyHint}
      />
      <SupportCaseModal
        open={Boolean(supportBookingId)}
        bookingId={supportBookingId}
        onClose={() => setSupportBookingId(null)}
        onSubmitted={(caseId) => {
          setLocalFlash(`${t("supportCaseSubmitted")} #${caseId.slice(0, 8)}`);
          window.setTimeout(() => setLocalFlash(null), 4000);
        }}
      />
    </div>
  );
}

