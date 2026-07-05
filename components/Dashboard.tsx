"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, CreditCard, Flame, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { authDisplayName } from "../lib/authDisplay";
import type { StudentProfile } from "../types";
import { AssignmentHub } from "./AssignmentHub";
import { useRouter } from "next/navigation";
import { formatLocalISODate, slotStartMinutes } from "../lib/slots";
import { cn } from "../lib/utils";
import { useLocale } from "../lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { localeToBcp47 } from "@/lib/i18n/types";
import { TeacherDashboardStats } from "@/components/dashboard/teacher/TeacherDashboardStats";
import { TeacherProfileCompletenessCard } from "@/components/dashboard/teacher/TeacherProfileCompletenessCard";
import { TeacherSearchVisibilityBanner } from "@/components/teacher/TeacherSearchVisibilityBanner";
import { TeacherProfileSetupChecklist } from "@/components/teacher/TeacherProfileSetupChecklist";
import { TeacherProfileVisibilityCard } from "@/components/teacher/TeacherProfileVisibilityCard";
import { TeacherSeoReadinessCard } from "@/components/teacher/TeacherSeoReadinessCard";
import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import { TEACHER_SETUP_PATH } from "@/lib/auth/teacherLoginRouting";
import { buildTeacherSetupChecklist } from "@/lib/teachers/teacherSetupProgress";
import { TeacherRequestCard } from "@/components/dashboard/teacher/TeacherRequestCard";
import { TeacherScheduleCard } from "@/components/dashboard/teacher/TeacherScheduleCard";
import { RescheduleModal, type RescheduleModalBooking } from "@/components/RescheduleModal";
import { TeacherScheduleChangeHelperPanel } from "@/components/dashboard/teacher/TeacherScheduleChangeHelperPanel";
import { ConfirmCancelBookingDialog } from "@/components/ConfirmCancelBookingDialog";
import {
  STUDENT_CANCEL_STATUSES,
  isBookingLessonDateOnOrAfterToday,
  isLateCancellation,
} from "@/lib/bookingCancellation";
import { postCancelBooking } from "@/lib/bookingCancellationClient";
import {
  bookingLifecycleRank,
  getBookingLifecycleState,
  isBookingVisibleForTeacher,
} from "@/lib/bookingLifecycle";
import { formatAccountingDisplay } from "@/lib/currency/format";

interface BookingWithTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  learnerName?: string | null;
  date: string;
  time: string;
  status: string;
  studentLevel?: string;
  teachingMode?: string;
  slotDate?: string | null;
  timeSlot?: string | null;
}

type TeacherBookingRow = {
  id: string;
  status: string;
  student_id: string;
  learner_profile_id?: string | null;
  studentName?: string;
  studentPhotoUrl?: string | null;
  learnerContext?: LearnerContext | null;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
  price?: number | string | null;
  created_at?: string | null;
  duration_minutes?: number | string | null;
  teaching_mode?: string | null;
  student_address?: string | null;
  completion_outcome?: string | null;
  completed_at?: string | null;
};

type LearnerContext = {
  displayName: string;
  contextType: "academic" | "language" | "music" | "general" | null;
  schoolLevel: string | null;
  gradeLevel: string | null;
  academicProgram: string | null;
  academicProgramLabel: string | null;
  academicProgramUnsure: boolean;
  targetLanguage: string | null;
  currentLevel: string | null;
  instrument: string | null;
  practiceFrequency: string | null;
  examDate: string | null;
  currentGradePercent: number | null;
  learningGoals: string[];
  subjectStruggles: string[];
  explanationPreference: string | null;
  notesForTeacher: string | null;
};

const TEACHER_MSG_PEER_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function messagesHrefForStudentId(studentId: string | null | undefined): string {
  const p = typeof studentId === "string" ? studentId.trim() : "";
  if (!p || !TEACHER_MSG_PEER_RE.test(p)) return "/messages";
  return `/messages?peer=${encodeURIComponent(p)}`;
}

function bookingSortKey(b: { slot_date?: string | null; date?: string | null; time_slot?: string | null; time?: string | null }) {
  const d = String(b.slot_date || b.date || "");
  const t = String(b.time_slot || b.time || "00h00");
  const mins = slotStartMinutes(t);
  return `${d}#${String(mins).padStart(5, "0")}`;
}

export function Dashboard() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const { t, locale, currency: displayCurrency } = useLocale();
  const router = useRouter();
  const role = authProfile?.role as string | undefined;
  const isTeacherRole = role === "teacher";
  const isStudentRole = role === "student";

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([]);
  const [teacherBookings, setTeacherBookings] = useState<TeacherBookingRow[]>([]);
  const [teacherMeta, setTeacherMeta] = useState<{
    id: string;
    name: string;
    discipline: string;
    hourlyRate: number;
    bio: string;
    teacherImageUrl: string | null;
    profilePhotoUrl: string | null;
    disciplineCount: number;
    timezone: string | null;
    city: string;
    region: string;
    availabilityCount: number;
    is_public: boolean | null;
    is_demo: boolean | null;
    deactivated_at: string | null;
    deleted_at: string | null;
    identity_verification_failed: boolean;
    country_code: string | null;
    profile_is_active: boolean | null;
    profile_deactivated_at: string | null;
    profile_deleted_at: string | null;
    profile_anonymized_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // id → "accepting" | "declining"
  const [bookingAction, setBookingAction] = useState<Record<string, "declining">>({});
  const [actionFlash, setActionFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [cancelBooking, setCancelBooking] = useState<{ id: string; side: "student" | "teacher" } | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [rescheduleModalBookingId, setRescheduleModalBookingId] = useState<string | null>(null);

  const teacherRescheduleBooking = useMemo((): RescheduleModalBooking | null => {
    if (!rescheduleModalBookingId) return null;
    const row = teacherBookings.find((x) => String(x.id) === rescheduleModalBookingId);
    if (!row) return null;
    return {
      id: String(row.id),
      slotDate: String(row.slot_date || row.date || ""),
      timeSlot: (row.time_slot || row.time) as string | null | undefined,
      price: Number(row.price) || 0,
      otherPartyName: String(row.studentName || "?"),
      otherPartyId: String(row.student_id || ""),
      durationMinutes:
        typeof row.duration_minutes === "number"
          ? row.duration_minutes
          : row.duration_minutes != null
            ? Number(row.duration_minutes)
            : null,
    };
  }, [rescheduleModalBookingId, teacherBookings]);

  const teacherDash = useMemo(() => {
    if (!isTeacherRole) return null;
    const today = formatLocalISODate(new Date());
    const activeStatuses = ["confirmed"];
    const needsReviewCutoff = new Date();
    needsReviewCutoff.setDate(needsReviewCutoff.getDate() - 14);
    const needsReviewCutoffIso = formatLocalISODate(needsReviewCutoff);
    const confirmedUpcoming = teacherBookings
      .filter((b) => activeStatuses.includes(b.status))
      .filter((b) => isBookingVisibleForTeacher(b))
      .filter((b) => {
        const state = getBookingLifecycleState(b);
        if (state === "ready") return true;
        if (state === "needs_review") {
          // Only surface pending reviews for lessons from the last 14 days; older ones are stale
          const d = String(b.slot_date || b.date || "");
          return d >= needsReviewCutoffIso;
        }
        const d = String(b.slot_date || b.date || "");
        return d >= today;
      })
      .sort((a, b) => {
        const ar = bookingLifecycleRank(getBookingLifecycleState(a));
        const br = bookingLifecycleRank(getBookingLifecycleState(b));
        if (ar !== br) return ar - br;
        return bookingSortKey(a).localeCompare(bookingSortKey(b));
      });
    const todayList = teacherBookings
      .filter((b) => activeStatuses.includes(b.status) || b.status === "pending_payment")
      .filter((b) => String(b.slot_date || b.date || "") === today)
      .sort((a, b) => bookingSortKey(a).localeCompare(bookingSortKey(b)));
    // P0.4 — confirmed/paid bookings must never show a "Refuser" CTA.
    //
    // Migration `030_cleanup_booked_status.sql` collapsed the legacy
    // teacher-approval statuses ("pending", "pending_teacher") into
    // the automated "pending_payment" status and added a CHECK
    // constraint locking the enum to:
    //   pending_payment | confirmed | completed | cancelled |
    //   cancelled_conflict
    // → there is no genuine manual-request state in the data model
    // today. A "pending_payment" row means the student is mid-Stripe-
    // Checkout: the teacher has nothing to approve, and a manual
    // "Refuser" mid-flow would corrupt the booking while Stripe's
    // webhook is still in flight. Production QA reported the exact
    // confusion this was causing: a top-of-dashboard "Refuser" CTA
    // appearing alongside the bottom-of-dashboard "Annuler ce cours"
    // CTA on the same student, both pointing at automated/paid
    // bookings.
    //
    // We intentionally KEEP the dead-code "pending"/"pending_teacher"
    // entries in this filter so that, if a future product change re-
    // introduces a real manual-approval flow, the dashboard's
    // pending-requests section will already be wired up. "pending_payment"
    // is the QA bug — we drop it. The Stripe webhook flips successful
    // payments to "confirmed", and those rows then surface in the
    // confirmed-upcoming card below, where the proper cancellation
    // flow handles them.
    const pendingList = teacherBookings.filter((b) =>
      ["pending", "pending_teacher"].includes(b.status as string),
    );
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = teacherBookings
      .filter((b) => {
        if (b.status !== "confirmed") return false;
        if (!b.created_at) return false;
        const c = new Date(b.created_at as string);
        if (Number.isNaN(c.getTime())) return false;
        return c.getFullYear() === monthStart.getFullYear() && c.getMonth() === monthStart.getMonth();
      })
      .reduce((s, b) => s + (Number(b.price) || 0), 0);
    const distinctStudents = new Set(
      teacherBookings.filter((b) => activeStatuses.includes(b.status)).map((b) => String(b.student_id)),
    ).size;
    const coursesTodayCount = todayList.filter((b) => {
      if (!activeStatuses.includes(b.status)) return false;
      return getBookingLifecycleState(b) !== "completed";
    }).length;
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
    exceptionalReview,
  }: {
    reason: string;
    message: string;
    exceptionalReview?: boolean;
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
        exceptionalReview: exceptionalReview === true,
      });
      if ("error" in res) throw new Error(res.error);
      if (cancelBooking.side === "student") {
        setBookings((prev) => prev.filter((x) => x.id !== cancelBooking.id));
      } else {
        setTeacherBookings((prev) => prev.filter((x) => String(x.id) !== cancelBooking.id));
      }
      setCancelBooking(null);
      // The API returns `copy_key` so the flash shows the honest outcome
      // ("manual review", "refund", "no automatic refund", …) instead of a
      // generic "Class cancelled." We fall back to the legacy key when an
      // older API revision does not yet return a discriminator.
      const flashKey: TranslationKey =
        res.copy_key ? (`${res.copy_key}Title` as TranslationKey) : "classCancelled";
      showFlash("ok", t(flashKey));
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));
      const res = await fetch(`/api/bookings/${encodeURIComponent(id)}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "teacher_declined" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || t("anErrorOccurred"));
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

  const markTeacherBookingCompleted = async (
    id: string,
    outcome: "held" | "absent" | "technical_issue",
  ) => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error(t("bookingSessionExpired"));
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outcome }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string; completed_at?: string };
    if (!res.ok) {
      // 502 originates from Stripe; don't surface raw payment errors to the teacher
      const msg = res.status === 502 ? t("anErrorOccurred") : (payload.error || t("anErrorOccurred"));
      throw new Error(msg);
    }
    // Remove from active list immediately — "completed" is already excluded by confirmedUpcoming
    // (activeStatuses = ["confirmed"]). Realtime will re-sync the row as completed.
    setTeacherBookings((prev) => prev.filter((b) => String(b.id) !== id));
    showFlash("ok", t("bookingCompletionSuccess"));
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
      const learnerIds = Array.from(
        new Set(
          ((rows || []) as { learner_profile_id?: string | null }[])
            .map((r) => r.learner_profile_id)
            .filter(Boolean),
        ),
      ) as string[];
      const learnerMap = new Map<string, string>();
      if (learnerIds.length) {
        const { data: learners } = await supabase
          .from("learner_profiles")
          .select("id, display_name")
          .in("id", learnerIds);
        for (const learner of (learners || []) as { id: string; display_name?: string | null }[]) {
          learnerMap.set(learner.id, learner.display_name || "");
        }
      }
      const list: BookingWithTeacher[] = [];
      for (const row of rows || []) {
        const tid = row.teacher_id as string;
        const learnerId = (row as { learner_profile_id?: string | null }).learner_profile_id ?? null;
        const { data: trow } = await supabase.from("teachers").select("name").eq("id", tid).maybeSingle();
        list.push({
          id: row.id as string,
          teacherId: tid,
          teacherName: (trow?.name as string) || "?",
          learnerName: learnerId ? learnerMap.get(learnerId) ?? null : null,
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
      const { data: myProf } = await supabase
        .from("profiles")
        .select("photo_url, is_active, deactivated_at, deleted_at, anonymized_at")
        .eq("id", user.id)
        .maybeSingle();
      const profileRow = myProf as {
        photo_url?: string | null;
        is_active?: boolean | null;
        deactivated_at?: string | null;
        deleted_at?: string | null;
        anonymized_at?: string | null;
      } | null;
      const profilePhotoUrlRaw = profileRow?.photo_url ?? null;

      const { data: t } = await supabase
        .from("teachers")
        .select(
          "id, name, discipline, price_per_lesson, bio, image_url, timezone, city, region, availability, is_public, is_demo, deactivated_at, deleted_at, identity_verified, stripe_identity_failed_reason, country_code",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (!t?.id) {
        setTeacherBookings([]);
        setTeacherMeta(null);
        return;
      }
      const row = t as {
        id: string;
        name?: string | null;
        discipline?: string;
        price_per_lesson?: number;
        bio?: string | null;
        image_url?: string | null;
        timezone?: string | null;
        city?: string | null;
        region?: string | null;
        availability?: unknown[] | null;
        is_public?: boolean | null;
        is_demo?: boolean | null;
        deactivated_at?: string | null;
        deleted_at?: string | null;
        identity_verified?: boolean | null;
        stripe_identity_failed_reason?: string | null;
        country_code?: string | null;
      };
      const { data: drows } = await supabase.from("teacher_disciplines").select("id").eq("teacher_id", row.id);
      const img = row.image_url != null ? String(row.image_url).trim() : "";
      const pPhoto = profilePhotoUrlRaw != null ? String(profilePhotoUrlRaw).trim() : "";

      setTeacherMeta({
        id: row.id,
        name: String(row.name || authProfile?.name || "").trim(),
        discipline: String(row.discipline || "—"),
        hourlyRate: Number(row.price_per_lesson) || 0,
        bio: String(row.bio || "").trim(),
        teacherImageUrl: img ? img : null,
        profilePhotoUrl: pPhoto ? pPhoto : null,
        disciplineCount: drows?.length ?? 0,
        timezone: row.timezone ?? null,
        city: String(row.city || "").trim(),
        region: String(row.region || "").trim(),
        availabilityCount: Array.isArray(row.availability) ? row.availability.length : 0,
        is_public: row.is_public ?? false,
        is_demo: row.is_demo ?? false,
        deactivated_at: row.deactivated_at ?? null,
        deleted_at: row.deleted_at ?? null,
        identity_verification_failed: isIdentityVerificationFailed({
          identity_verified: row.identity_verified,
          stripe_identity_failed_reason: row.stripe_identity_failed_reason,
        }),
        country_code: row.country_code ?? null,
        profile_is_active: profileRow?.is_active ?? true,
        profile_deactivated_at: profileRow?.deactivated_at ?? null,
        profile_deleted_at: profileRow?.deleted_at ?? null,
        profile_anonymized_at: profileRow?.anonymized_at ?? null,
      });
      const teacherSlug = row.id;
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("teacher_id", teacherSlug)
        .in("status", ["confirmed", "pending", "pending_teacher", "pending_payment"])
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      const learnerIds = Array.from(
        new Set(
          ((rows || []) as { learner_profile_id?: string | null }[])
            .map((r) => r.learner_profile_id)
            .filter(Boolean),
        ),
      ) as string[];
      const learnerMap = new Map<string, LearnerContext>();
      if (learnerIds.length) {
        const { data: learnerRows } = await supabase
          .from("learner_profiles")
          .select("id, display_name, context_type, school_level, grade_level, academic_program, academic_program_label, academic_program_unsure, target_language, current_level, instrument, practice_frequency, exam_date, current_grade_percent, learning_goals, subject_struggles, explanation_preference, notes_for_teacher")
          .in("id", learnerIds);
        for (const learner of (learnerRows || []) as {
          id: string;
          display_name?: string | null;
          context_type?: "academic" | "language" | "music" | "general" | null;
          school_level?: string | null;
          grade_level?: string | null;
          academic_program?: string | null;
          academic_program_label?: string | null;
          academic_program_unsure?: boolean | null;
          target_language?: string | null;
          current_level?: string | null;
          instrument?: string | null;
          practice_frequency?: string | null;
          exam_date?: string | null;
          current_grade_percent?: number | string | null;
          learning_goals?: string[] | null;
          subject_struggles?: string[] | null;
          explanation_preference?: string | null;
          notes_for_teacher?: string | null;
        }[]) {
          learnerMap.set(learner.id, {
            displayName: learner.display_name || "?",
            contextType: learner.context_type ?? null,
            schoolLevel: learner.school_level ?? null,
            gradeLevel: learner.grade_level ?? null,
            academicProgram: learner.academic_program ?? null,
            academicProgramLabel: learner.academic_program_label ?? null,
            academicProgramUnsure: Boolean(learner.academic_program_unsure),
            targetLanguage: learner.target_language ?? null,
            currentLevel: learner.current_level ?? null,
            instrument: learner.instrument ?? null,
            practiceFrequency: learner.practice_frequency ?? null,
            examDate: learner.exam_date ?? null,
            currentGradePercent:
              learner.current_grade_percent != null && Number.isFinite(Number(learner.current_grade_percent))
                ? Number(learner.current_grade_percent)
                : null,
            learningGoals: Array.isArray(learner.learning_goals) ? learner.learning_goals : [],
            subjectStruggles: Array.isArray(learner.subject_struggles) ? learner.subject_struggles : [],
            explanationPreference: learner.explanation_preference ?? null,
            notesForTeacher: learner.notes_for_teacher ?? null,
          });
        }
      }
      const list: TeacherBookingRow[] = [];
      for (const row of rows || []) {
        const sid = row.student_id as string;
        const learnerId = (row as { learner_profile_id?: string | null }).learner_profile_id ?? null;
        const { data: prow } = await supabase.from("profiles").select("name, photo_url").eq("id", sid).maybeSingle();
        list.push({
          ...(row as Omit<TeacherBookingRow, "studentName" | "studentPhotoUrl">),
          id: String(row.id),
          status: String(row.status || ""),
          student_id: sid,
          studentName: (prow?.name as string) || "?",
          studentPhotoUrl: (prow?.photo_url as string) || null,
          learner_profile_id: learnerId,
          learnerContext: learnerId ? learnerMap.get(learnerId) ?? null : null,
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
      <div className="min-h-[calc(100dvh-200px)] flex flex-col items-center justify-center p-12 text-center">
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
      <div className="min-h-[calc(100dvh-200px)] flex flex-col items-center justify-center p-12 text-center">
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
      timeZone: teacherMeta?.timezone || undefined,
    });
    // Accounting helper: primary is always CAD (the actual revenue currency);
    // approx is an informational "≈ EUR 314" string when the viewer picked a
    // non-CAD display currency. We do not replace the CAD figure.
    const teacherAccountingCurrency = "CAD";
    const fmtAccounting = (n: number) =>
      formatAccountingDisplay({
        amount: n,
        sourceCurrency: teacherAccountingCurrency,
        displayCurrency,
        locale,
      });
    const monthRevenueDisplay = fmtAccounting(monthRevenue);

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
    const showSearchVisibilityBanner =
      authProfile?.teacher_onboarding_complete !== true || completenessPct < 100 || !teacherMeta;
    const setupChecklistItems = teacherMeta
      ? buildTeacherSetupChecklist({
          name: teacherMeta.name || authProfile?.name,
          bio: teacherMeta.bio,
          disciplineCount: teacherMeta.disciplineCount,
          pricePerLesson: teacherMeta.hourlyRate,
          availabilityCount: teacherMeta.availabilityCount,
          city: teacherMeta.city,
          region: teacherMeta.region,
        })
      : buildTeacherSetupChecklist({});

    const firstConfirmed = confirmedUpcoming[0] as { id?: string; student_id?: string | null } | undefined;
    const firstMessagesHref = messagesHrefForStudentId(firstConfirmed?.student_id ?? null);

    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-5 overflow-hidden bg-[#F3FAF6] pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-8 sm:px-6 lg:rounded-3xl lg:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" data-testid="teacher-dashboard-mobile-safe">
        <header className="space-y-1 rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-teal-900/5 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
          <p className="text-xs font-medium capitalize text-slate-600">{todayLabel}</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t("greeting")} {displayName}
          </h1>
          <p className="text-sm text-slate-600">{t("dashboardTeacherSubtitle")}</p>
        </header>

        {teacherMeta ? (
          <>
          <TeacherProfileVisibilityCard
            teacher={{
              id: teacherMeta.id,
              user_id: user?.id,
              name: teacherMeta.name || authProfile?.name,
              bio: teacherMeta.bio,
              disciplineCount: teacherMeta.disciplineCount,
              price_per_lesson: teacherMeta.hourlyRate,
              availability: Array.from({ length: teacherMeta.availabilityCount }),
              city: teacherMeta.city,
              region: teacherMeta.region,
              country_code: teacherMeta.country_code,
              is_public: teacherMeta.is_public,
              is_demo: teacherMeta.is_demo,
              deactivated_at: teacherMeta.deactivated_at,
              deleted_at: teacherMeta.deleted_at,
              identity_verification_failed: teacherMeta.identity_verification_failed,
              profile_is_active: teacherMeta.profile_is_active,
              profile_deactivated_at: teacherMeta.profile_deactivated_at,
              profile_deleted_at: teacherMeta.profile_deleted_at,
              profile_anonymized_at: teacherMeta.profile_anonymized_at,
            }}
            profileRole={role}
            onVisibilityChange={(nextPublic) =>
              setTeacherMeta((prev) => (prev ? { ...prev, is_public: nextPublic } : prev))
            }
          />
          <TeacherSeoReadinessCard />
          </>
        ) : (
          <>
            <TeacherSearchVisibilityBanner ctaHref={TEACHER_SETUP_PATH} />
            <TeacherProfileSetupChecklist items={setupChecklistItems} ctaHref={TEACHER_SETUP_PATH} />
          </>
        )}

        <TeacherDashboardStats
          items={[
            { labelKey: "lessonsToday", value: coursesTodayCount },
            { labelKey: "activeStudentsLabel", value: distinctStudents },
            {
              labelKey: "thisMonthLabel",
              value: monthRevenueDisplay.primary,
              approx: monthRevenueDisplay.approx ? `≈ ${monthRevenueDisplay.approx}` : null,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-5">
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
                      onDecline={() => void cancelTeacherBooking(b.id as string)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div
              className={
                confirmedUpcoming.length > 0
                  ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start lg:gap-8"
                  : "grid gap-6"
              }
            >
              <TeacherScheduleCard
                titleKey="upcomingConfirmedClasses"
                items={confirmedUpcoming.map((b) => ({
                  id: b.id as string,
                  studentName: b.studentName as string | undefined,
                  studentPhotoUrl: (b.studentPhotoUrl as string | null | undefined) ?? null,
                  studentUserId: (b.student_id as string | undefined) ?? null,
                  learnerContext: b.learnerContext ?? null,
                  slot_date: b.slot_date as string | null | undefined,
                  date: b.date as string | null | undefined,
                  time_slot: b.time_slot as string | null | undefined,
                  time: b.time as string | null | undefined,
                  status: b.status as string | null | undefined,
                  teachingMode: b.teaching_mode as string | null | undefined,
                  durationMinutes:
                    typeof b.duration_minutes === "number"
                      ? b.duration_minutes
                      : b.duration_minutes != null
                        ? Number(b.duration_minutes)
                        : null,
                  studentAddress: b.student_address as string | null | undefined,
                  meetingUrl: (b as { meeting_url?: string | null }).meeting_url ?? null,
                }))}
                emptyHint={t("dashboardNoLessonsWeek")}
                onRequestCancelClass={(bookingId) => setCancelBooking({ id: bookingId, side: "teacher" })}
                onOpenReschedule={(bookingId) => setRescheduleModalBookingId(bookingId)}
                onMarkCompleted={markTeacherBookingCompleted}
                cancelBusy={cancelBusy}
                timeZone={teacherMeta?.timezone ?? null}
              />
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-400">
                <span>{t("completedCoursesInHistory")}</span>
                <Link
                  href="/teacher/history"
                  className="inline-flex min-h-10 items-center rounded-full px-2 font-semibold text-teal-700 underline-offset-2 hover:underline"
                >
                  {t("viewHistory")}
                </Link>
              </div>
              {confirmedUpcoming.length > 0 ? (
                <div className="hidden min-w-0 lg:block">
                  <TeacherScheduleChangeHelperPanel
                    messagesHref={firstMessagesHref}
                    onOpenRescheduleModal={() => {
                      const id = firstConfirmed?.id;
                      if (id) setRescheduleModalBookingId(String(id));
                    }}
                    onRequestCancelThisClass={() => {
                      const id = firstConfirmed?.id;
                      if (id) setCancelBooking({ id: String(id), side: "teacher" });
                    }}
                    cancelBusy={cancelBusy}
                  />
                </div>
              ) : null}
            </div>

            {teacherRescheduleBooking ? (
              <RescheduleModal
                isOpen
                onClose={() => setRescheduleModalBookingId(null)}
                booking={teacherRescheduleBooking}
                userRole="teacher"
                currentUserName={String(authProfile?.name || authDisplayName(user) || "")}
                onCancelLesson={() => {
                  const id = teacherRescheduleBooking.id;
                  setRescheduleModalBookingId(null);
                  setCancelBooking({ id, side: "teacher" });
                }}
              />
            ) : null}

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
            <TeacherProfileCompletenessCard percent={completenessPct} ctaHref={TEACHER_SETUP_PATH} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-12">
      <section className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0 lg:flex-row lg:items-center">
        <div>
          <p className="ds-label text-slate-600">{t("dashboardStudentSpace")}</p>
          <h2 className="text-[28px] sm:text-[40px] leading-[1.1] text-slate-900">{t("dashboard")}</h2>
          <p className="text-[14px] text-slate-600 mt-1">{t("dashboardStudentSubtitle")}</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-5 sm:p-6 rounded-3xl text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
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

            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative">
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

            {/* Discoverability tile for the student payment vault. Uses the
                existing dashboard tile style; intentionally restrained so it
                doesn't compete with the streak / bookings cards above. */}
            <Link
              href="/student/payments"
              className="sm:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-4 overflow-hidden relative hover:border-brand-primary/50 hover:shadow-md transition group sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-brand-primary shrink-0">
                  <CreditCard size={24} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900">{t("studentPaymentsAndReceiptsLabel")}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{t("studentPaymentsSubtitle")}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest group-hover:underline shrink-0 ml-3">
                {t("studentPaymentsViewReceiptFallback")}
              </span>
            </Link>
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
                    {b.learnerName ? (
                      <p className="text-[10px] font-semibold text-teal-700">
                        {t("studentCourseForLearner")} : {b.learnerName}
                      </p>
                    ) : null}
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

