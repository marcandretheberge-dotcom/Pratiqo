"use client";

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  Award,
  Globe,
  Home,
  MapPin,
  MessageSquare,
  Shield,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { formatApproxDistanceKm } from "@/lib/studentLocation";
import { formatTeachingZoneLabel, getTeacherMapCoords, sortTeachingZones } from "@/lib/teacherTeachingZones";
import { TeacherMap } from "./TeacherMap";
import { getTeacherProfileDisciplineChips } from "@/lib/teacherMapper";
import {
  getTeacherAvailabilitySummary,
  getTeacherDefaultLessonDurationLabel,
  getTeacherDisciplineSummary,
  getTeacherDiscoveryLessonLabel,
  getTeacherLevelLabels,
  getTeacherPrimaryPriceLabel,
  getTeacherProfileInBriefCardIds,
  getTeacherPublicFormatLabels,
  getTeacherSpokenLanguageLabels,
  PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS,
  PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS,
  PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS,
} from "@/lib/teachers/display";
import { useLocale } from "../lib/locale-context";
import { t as translate, type TranslationKey } from "@/lib/translations";
import type { Locale } from "@/lib/i18n/types";
import { teacherBookingActionKey } from "@/lib/teachers/bookingCapability";
import { formatLocalISODate } from "@/lib/slots";
import { getAvailableFromBadge } from "@/lib/teachers/availabilityStartDate";
import type { TeacherCredential } from "../lib/teacherTrust";
import { getPublicTeacherCredentials } from "@/lib/supabase/queries";
import { getEmbedUrl } from "../lib/videoEmbed";
import { TeacherAvatar } from "./TeacherAvatar";
import { calculateIntroSessionPriceCents } from "@/lib/introSession";
import { PriceDisplay } from "@/components/PriceDisplay";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import { parseTeacherProfileBio } from "@/lib/teachers/profileBio";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { TeacherCardIdentityCheck } from "@/components/teachers/TeacherCardIdentityCheck";
import { TeacherProfileBio } from "@/components/teachers/TeacherProfileBio";
import {
  hasPublicTeacherReviews,
  hasVerifiedDiplomaEvidence,
  isPublicTeacherIdentityVerified,
} from "@/lib/teachers/badges";
import { PublicTeacherOffersSection } from "@/components/teacher/PublicTeacherOffersSection";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";
import { isBookingOfferSelectionEnabled } from "@/lib/offers/bookingOfferSelection";

export type TeacherBookKind = "standard" | "home";

export type TeacherBookContext = {
  selectedOfferId?: string | null;
  publicOffers?: PublicTeacherOfferDto[];
};

function normalizeMarketPlan(p: string | null | undefined): "free" | "pro" | "enterprise" {
  const raw = String(p || "free").toLowerCase();
  if (raw === "enterprise") return "enterprise";
  if (raw === "pro") return "pro";
  return "free";
}

type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  student_id: string;
  teacher_reply?: string | null;
  teacher_reply_created_at?: string | null;
  teacher_reply_updated_at?: string | null;
};

type ReportStatus = "idle" | "submitting" | "success" | "already" | "error";

function formatReviewerName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Élève";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const subscribeToHydration = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

interface TeacherProfileProps {
  teacher: Teacher;
  onClose: () => void;
  onBook: (kind: TeacherBookKind, context?: TeacherBookContext) => void;
  /** Opens messaging with this teacher (requires `teacher.userId`). */
  onSendMessage?: () => void;
  distanceKm?: number | null;
  /** Plan loaded by the profile page — avoids a double-fetch */
  embeddedPlan?: { plan: string | null; loading: boolean };
  /** Google Studio map (Enterprise only, on /teacher/profile/[id] page). */
  showGoogleStudioMap?: boolean;
  /** Reveals exact address on the studio map when true. */
  studioMapHasConfirmedBooking?: boolean;
  /** SEO public profile page headline (/professeurs/[slug]). */
  pageHeadline?: string;
  initialLocale?: Locale;
}

export function TeacherProfile({
  teacher,
  onClose,
  onBook,
  onSendMessage,
  distanceKm,
  embeddedPlan,
  showGoogleStudioMap,
  studioMapHasConfirmedBooking,
  pageHeadline,
  initialLocale,
}: TeacherProfileProps) {
  const { user } = useAuth();
  const { t: contextTranslate, formatDisplayPrice, locale: contextLocale } = useLocale();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrationSnapshot, serverHydrationSnapshot);
  // Public SSR uses the request locale; interactive language changes remain context-owned.
  const locale = !hydrated && initialLocale ? initialLocale : contextLocale;
  const t = useCallback((key: TranslationKey) => !hydrated && initialLocale
    ? translate(key, initialLocale) : contextTranslate(key), [hydrated, initialLocale, contextTranslate]);
  const router = useRouter();
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("free");
  const [hasBooking, setHasBooking] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Map<string, string>>(new Map());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySavingId, setReplySavingId] = useState<string | null>(null);
  const [replyErrorId, setReplyErrorId] = useState<string | null>(null);
  const [publicOffers, setPublicOffers] = useState<PublicTeacherOfferDto[]>([]);

  // Check whether this student has a confirmed booking with the teacher
  useEffect(() => {
    if (!user?.id || !teacher.id) return;
    let cancelled = false;
    void getSupabaseClient()
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .in("status", ["confirmed", "completed"])
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setHasBooking((data?.length ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, teacher.id]);

  // Fetch reviews + reviewer display names; reset when teacher changes
  useEffect(() => {
    if (!teacher.id) return;
    setPublicOffers([]);
    setReviews([]);
    setReviewerNames(new Map());
    setReportTarget(null);
    setReportReason("");
    setReportDetails("");
    setReportStatus("idle");
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/reviews?teacherId=${encodeURIComponent(teacher.id)}`).catch(() => null);
      if (!res?.ok || cancelled) return;
      const json = (await res.json().catch(() => null)) as { reviews?: ReviewRow[] } | null;
      const rows = json?.reviews ?? [];
      if (cancelled) return;
      setReviews(rows);
      setReplyDrafts(Object.fromEntries(rows.map((r) => [r.id, r.teacher_reply ?? ""])));
      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      if (!studentIds.length) return;
      const { data: profiles } = await getSupabaseClient()
        .from("profiles")
        .select("id, name")
        .in("id", studentIds);
      if (cancelled) return;
      setReviewerNames(
        new Map((profiles ?? []).map((p) => [p.id as string, (p.name as string | null) ?? ""])),
      );
    };
    void load();
    return () => { cancelled = true; };
  }, [teacher.id]);

  const closeReport = () => {
    setReportTarget(null);
    setReportReason("");
    setReportDetails("");
    setReportStatus("idle");
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason || reportStatus === "submitting") return;
    setReportStatus("submitting");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          reviewId: reportTarget,
          reason: reportReason,
          details: reportDetails.trim().slice(0, 500),
        }),
      });
      if (res.ok) {
        setReportStatus("success");
        const captured = reportTarget;
        setReportedIds((prev) => new Set([...prev, captured]));
        setReviews((prev) => prev.filter((review) => review.id !== captured));
        setTimeout(closeReport, 3000);
      } else if (res.status === 409) {
        setReportStatus("already");
      } else {
        setReportStatus("error");
      }
    } catch {
      setReportStatus("error");
    }
  };

  const submitReply = async (reviewId: string) => {
    const reply = (replyDrafts[reviewId] ?? "").trim();
    if (!reply || replySavingId) return;
    setReplySavingId(reviewId);
    setReplyErrorId(null);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ reply }),
      });
      const json = (await res.json().catch(() => null)) as { review?: Partial<ReviewRow> } | null;
      if (!res.ok || !json?.review) {
        setReplyErrorId(reviewId);
        return;
      }
      setReviews((prev) => prev.map((row) => (
        row.id === reviewId
          ? {
            ...row,
            teacher_reply: json.review?.teacher_reply ?? reply,
            teacher_reply_created_at: json.review?.teacher_reply_created_at ?? row.teacher_reply_created_at ?? new Date().toISOString(),
            teacher_reply_updated_at: json.review?.teacher_reply_updated_at ?? new Date().toISOString(),
          }
          : row
      )));
    } catch {
      setReplyErrorId(reviewId);
    } finally {
      setReplySavingId(null);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      alert(t("loginToMessage"));
      return;
    }
    try {
      const peerId = teacher.userId?.trim();
      router.push(peerId ? `/messages?peer=${encodeURIComponent(peerId)}` : "/messages");
      onClose();
    } catch (error) {
      console.error("Chat error", error);
    }
  };

  const handleMessage = () => {
    if (onSendMessage) {
      onSendMessage();
    } else {
      void handleStartChat();
    }
  };

  const requestGeo = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (embeddedPlan !== undefined) return;
    if (!teacher.id) return;
    void fetch(`/api/teachers/plan?teacherId=${encodeURIComponent(teacher.id)}`)
      .then((r) => r.json())
      .then((json: { plan?: string }) => setPlan(normalizeMarketPlan(json.plan)));
  }, [teacher.id, embeddedPlan]);

  const displayPlan = useMemo(() => {
    if (embeddedPlan !== undefined) {
      return embeddedPlan.loading ? "free" : normalizeMarketPlan(embeddedPlan.plan);
    }
    return plan;
  }, [embeddedPlan, plan]);

  const studioMapCoordsOk = useMemo(() => {
    const coords = getTeacherMapCoords(teacher);
    const lat = coords?.lat;
    const lng = coords?.lng;
    return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  }, [teacher]);

  const showEnterpriseStudioMap =
    Boolean(showGoogleStudioMap) && displayPlan === "enterprise" && studioMapCoordsOk;

  const computedDistanceKm = useMemo(() => {
    if (!geo) return null;
    const coords = getTeacherMapCoords(teacher);
    const lat = coords?.lat;
    const lng = coords?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) return null;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat - geo.lat);
    const dLng = toRad(lng - geo.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(geo.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [geo, teacher]);

  const displayDistanceKm = distanceKm !== undefined ? distanceKm : computedDistanceKm;

  // Mask personal contact info from the rendered bio. The stored
  // `teachers.bio` row is never mutated — sanitization is presentation-only.
  // The notice below the bio is shown only when at least one mask hit, so
  // most teachers see no notice at all.
  const sanitizedBio = useMemo(
    () => sanitizePublicTeacherBio(teacher.bio, locale),
    [teacher.bio, locale],
  );
  const bioBlocks = useMemo(
    () => parseTeacherProfileBio(sanitizedBio.content),
    [sanitizedBio.content],
  );

  // Public display name: first name + last-name initial. Stored
  // `teacher.name` is unchanged; this is presentation-only and only used
  // on the public profile (receipts/admin/emails continue to show the
  // full name via `teacher.name`).
  const publicName = useMemo(() => formatPublicTeacherDisplayName(teacher.name), [teacher.name]);

  const [publicCredentials, setPublicCredentials] = useState<TeacherCredential[]>([]);
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data, error } = await getPublicTeacherCredentials(supabase, teacher.id);
      if (cancelled) return;
      if (error) return;
      const rows = (data ?? []) as Array<{
        id: string;
        teacher_id: string;
        type: string;
        public_label: string | null;
        institution_name: string | null;
        country: string | null;
        issued_year: number | null;
        verification_method: string | null;
        confidence_level: string | null;
        verified_at: string | null;
        expires_at: string | null;
      }>;
      setPublicCredentials(
        rows.map((r) => ({
          id: r.id,
          teacherId: r.teacher_id,
          type: r.type as TeacherCredential["type"],
          title: r.public_label || "",
          institutionName: r.institution_name,
          country: r.country,
          issuedYear: r.issued_year,
          verificationStatus: "verified",
          verificationMethod: (r.verification_method as TeacherCredential["verificationMethod"]) ?? null,
          confidenceLevel: (r.confidence_level as TeacherCredential["confidenceLevel"]) ?? null,
          publicLabel: r.public_label,
          verifiedAt: r.verified_at,
          expiresAt: r.expires_at,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher.id]);

  const displayReviewCount = Math.max(Number(teacher.reviews ?? 0), reviews.length);
  const hasReviews = hasPublicTeacherReviews({ rating: teacher.rating, reviewCount: displayReviewCount });

  const openBooking = useCallback(
    (kind: TeacherBookKind, context?: TeacherBookContext) => {
      onBook(kind, {
        ...context,
        publicOffers: context?.publicOffers ?? publicOffers,
      });
    },
    [onBook, publicOffers],
  );

  const handlePrimaryAction = () => {
    if (teacher.bookingAction === "contact") return handleMessage();
    if (teacher.bookingAction === "waitlist") return router.push(`/trouver-mon-prof?${new URLSearchParams({ subject: teacher.discipline, city: teacher.city ?? "" })}`);
    openBooking("standard");
  };

  const handlePrepareOfferBooking = useCallback(
    (offerId: string) => {
      if (!isBookingOfferSelectionEnabled()) return;
      openBooking("standard", { selectedOfferId: offerId });
    },
    [openBooking],
  );

  const badgeInput = useMemo(
    () => ({
      teacherId: teacher.id,
      identityVerified: teacher.identityVerified,
      diplomaVerified: teacher.diplomaVerified,
      verifiedExperience: teacher.verifiedExperience ?? null,
      credentials: publicCredentials,
      profilePlan: displayPlan,
      reviewCount: displayReviewCount,
    }),
    [
      displayPlan,
      displayReviewCount,
      publicCredentials,
      teacher.diplomaVerified,
      teacher.id,
      teacher.identityVerified,
      teacher.verifiedExperience,
    ],
  );
  const identityVerifiedForTrustBox = isPublicTeacherIdentityVerified(badgeInput);
  const diplomaVerifiedForTrustBox = hasVerifiedDiplomaEvidence(badgeInput);
  const experienceVerifiedForTrustBox = badgeInput.verifiedExperience === true;

  const homeConfigured =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;
  const standardOriginalPrice = formatDisplayPrice(Number(teacher.pricePerLesson), teacher.currency ?? "CAD").original;
  const radiusKm = teacher.homeLessonRadiusKm ?? 25;
  const outOfHomeZone = homeConfigured && displayDistanceKm !== null && displayDistanceKm > radiusKm;
  const homeNeedsGeo = homeConfigured && displayDistanceKm === null;
  const homeDisabled = !homeConfigured || outOfHomeZone || homeNeedsGeo;

  const standardLabel =
    teacher.teachingMode === "both"
      ? t("modeStudioOnline")
      : teacher.teachingMode === "online"
        ? "En ligne"
        : "En studio";

  const isTeacherOwner = Boolean(user?.id && teacher.userId && user.id === teacher.userId);

  const disciplineChips = useMemo(
    () => getTeacherProfileDisciplineChips(teacher),
    [teacher],
  );
  const teachingModes = useMemo(() => {
    const modes: { icon: React.ReactNode; label: string }[] = [];
    if (["person", "both", "all"].includes(teacher.teachingMode))
      modes.push({ icon: <Users size={14} className="shrink-0 text-slate-500" aria-hidden />, label: t("filterInPerson") });
    if (["online", "both", "all"].includes(teacher.teachingMode))
      modes.push({ icon: <Video size={14} className="shrink-0 text-slate-500" aria-hidden />, label: t("filterOnline") });
    if (homeConfigured)
      modes.push({ icon: <Home size={14} className="shrink-0 text-slate-500" aria-hidden />, label: t("modeHome") });
    return modes;
  }, [teacher.teachingMode, homeConfigured, t]);
  const publicTeachingZones = useMemo(
    () => sortTeachingZones((teacher.teachingZones ?? []).filter((zone) => zone.isActive)),
    [teacher.teachingZones],
  );
  const summaryCardIds = useMemo(
    () =>
      getTeacherProfileInBriefCardIds(teacher, {
        hasDisciplineChips: disciplineChips.length > 0,
        hasCourseOptions: teachingModes.length > 0,
      }),
    [disciplineChips.length, teacher, teachingModes.length],
  );
  const desktopSummaryCardIds = useMemo(
    () => summaryCardIds.filter((id) => id !== "rate"),
    [summaryCardIds],
  );
  const formatLabels = useMemo(
    () =>
      getTeacherPublicFormatLabels(teacher, {
        online: t("filterOnline"),
        inPerson: t("filterInPerson"),
        home: t("modeHome"),
      }),
    [teacher, t],
  );
  const spokenLanguages = useMemo(() => getTeacherSpokenLanguageLabels(teacher), [teacher]);
  const levelLabels = useMemo(() => getTeacherLevelLabels(teacher), [teacher]);
  const availabilitySummary = useMemo(
    () => getTeacherAvailabilitySummary(teacher, Number.POSITIVE_INFINITY),
    [teacher],
  );
  const discoveryLabel = useMemo(() => getTeacherDiscoveryLessonLabel(teacher), [teacher]);
  const durationLabel = useMemo(() => getTeacherDefaultLessonDurationLabel(teacher), [teacher]);
  const rateSummary = useMemo(
    () =>
      getTeacherPrimaryPriceLabel(teacher, {
        formattedPrice: standardOriginalPrice,
        fromTemplate: t("publicTeacherCardFromPerHour"),
      }),
    [teacher, standardOriginalPrice, t],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-profile-modal-title"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        className="relative z-10 flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white shadow-2xl sm:max-h-[min(90dvh,calc(100dvh-2rem))] sm:rounded-[32px]"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("accessibilityCloseDialog")}
          className="absolute right-4 top-4 z-20 min-h-11 min-w-11 rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-md backdrop-blur-md transition-all hover:text-slate-800 sm:right-5 sm:top-5 sm:min-h-0 sm:min-w-0"
        >
          <X size={18} />
        </button>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">

              {/* ── LEFT COLUMN ─────────────────────── */}
              <div className="lg:col-span-3 space-y-6">
                {pageHeadline ? (
                  <h1 className="pr-12 text-2xl font-bold leading-tight text-slate-900 lg:text-3xl">
                    {pageHeadline}
                  </h1>
                ) : null}

                {/* Compact header — larger photo for face evaluation. Nested
                    lightbox skipped: this dialog already closes on Escape. */}
                <div className="flex items-start gap-3 pr-12 sm:gap-4">
                  <TeacherAvatar
                    name={teacher.name}
                    category={teacher.category}
                    imageUrl={teacher.imageUrl}
                    size={112}
                    className="!h-28 !w-28 sm:!h-32 sm:!w-32"
                    ringClassName="border-2 border-white shadow-lg ring-2 ring-teal-500/25"
                  />

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <h2 id="teacher-profile-modal-title" className="truncate text-lg font-bold leading-tight text-slate-900 sm:text-xl lg:text-2xl">{publicName}</h2>
                      <TeacherCardIdentityCheck
                        verified={identityVerifiedForTrustBox}
                        label={t("teacherBadgeIdentityVerified")}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {hasReviews ? (
                        <div className="flex items-center gap-1">
                          <Star size={13} fill="currentColor" className="text-amber-400" aria-hidden />
                          <span className="text-sm font-semibold text-slate-700">{Number(teacher.rating).toFixed(1)}</span>
                          <span className="ml-0.5 text-xs text-slate-600">
                            ({displayReviewCount} {t("bookingReviewsShort")})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-600">{t("teacherNoReviewsYet")}</span>
                      )}
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin size={11} className="shrink-0 text-slate-400" aria-hidden />
                      {displayDistanceKm !== null ? `${t("studentApproxDistanceFromYou").replace("{distance}", formatApproxDistanceKm(displayDistanceKm))} · ` : ""}
                      {["both", "all"].includes(teacher.teachingMode)
                        ? t("modeHybrid")
                        : teacher.teachingMode === "online"
                          ? "En ligne"
                          : t("filterInPerson")}
                    </p>
                  </div>
                </div>

                {/* Full selected disciplines — visible before the bio */}
                {disciplineChips.length > 0 ? (
                  <div
                    data-testid="teacher-profile-discipline-chips"
                    className="flex flex-wrap gap-2"
                  >
                    {disciplineChips.map((chip) => (
                      <span
                        key={`${chip.disciplineId}-${chip.label}`}
                        className={PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS}
                      >
                        {chip.emoji} {chip.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Bio — rendered through sanitizePublicTeacherBio so personal
                    contact details are masked before the first lesson. The
                    stored bio is never mutated. */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t("aboutSection")}</p>
                  <TeacherProfileBio
                    blocks={bioBlocks}
                    fallback={`${publicName} est un(e) expert(e) en ${teacher.discipline.toLowerCase()}. Sa méthode d'enseignement repose sur la pratique immédiate et l'adaptation aux objectifs de chaque élève.`}
                  />
                  {sanitizedBio.masked ? (
                    <p className="text-[11px] leading-snug text-slate-500">
                      {t("teacherBioContactHiddenNotice")}
                    </p>
                  ) : null}
                </div>

                {/* Intro video — only rendered when teacher.videoUrl is a valid YT/Vimeo URL */}
                <TeacherVideoEmbed videoUrl={teacher.videoUrl} />

                {summaryCardIds.length > 0 ? (
                  <div
                    data-testid="teacher-profile-summary"
                    className={cn("space-y-2", desktopSummaryCardIds.length === 0 && "lg:hidden")}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {t("inBriefSection")}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {summaryCardIds.includes("disciplines") ? (
                        <QuickStat
                          testId="teacher-profile-summary-disciplines"
                          icon={<Users className="text-slate-500" size={15} />}
                          label={t("disciplinesLabel")}
                          value={getTeacherDisciplineSummary(teacher, { limit: 99 })}
                        />
                      ) : null}
                      {summaryCardIds.includes("formats") ? (
                        <QuickStat
                          testId="teacher-profile-summary-formats"
                          icon={<Video className="text-slate-500" size={15} />}
                          label={t("formatsLabel")}
                          value={formatLabels.join(" · ")}
                        />
                      ) : null}
                      {summaryCardIds.includes("availability") && availabilitySummary ? (
                        <QuickStat
                          testId="teacher-profile-summary-availability"
                          icon={<Clock className="text-slate-500" size={15} />}
                          label={t("availabilityShortLabel")}
                          value={availabilitySummary}
                        />
                      ) : null}
                      {summaryCardIds.includes("rate") && rateSummary ? (
                        <div className="lg:hidden">
                          <QuickStat
                            testId="teacher-profile-summary-rate"
                            icon={<CreditCard className="text-slate-500" size={15} />}
                            label={t("rateLabel")}
                            value={rateSummary}
                          />
                        </div>
                      ) : null}
                      {summaryCardIds.includes("duration") && durationLabel ? (
                        <QuickStat
                          testId="teacher-profile-summary-duration"
                          icon={<Clock className="text-slate-500" size={15} />}
                          label={t("lessonDurationLabel")}
                          value={durationLabel}
                        />
                      ) : null}
                      {summaryCardIds.includes("discovery") && discoveryLabel ? (
                        <QuickStat
                          testId="teacher-profile-summary-discovery"
                          icon={<Clock className="text-slate-500" size={15} />}
                          label={t("discoveryLessonLabel")}
                          value={discoveryLabel}
                        />
                      ) : null}
                      {summaryCardIds.includes("languages") ? (
                        <QuickStat
                          testId="teacher-profile-summary-languages"
                          icon={<Globe className="text-slate-500" size={15} />}
                          label={t("spokenLanguagesLabel")}
                          value={spokenLanguages.join(", ")}
                        />
                      ) : null}
                      {summaryCardIds.includes("levels") ? (
                        <QuickStat
                          testId="teacher-profile-summary-levels"
                          icon={<Users className="text-slate-500" size={15} />}
                          label={t("levelsLabel")}
                          value={levelLabels.join(" · ")}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Teaching modes */}
                {teachingModes.length > 0 ? (
                  <div data-testid="teacher-profile-course-options" className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t("coursesOptionsSection")}</p>
                    <div className="flex flex-wrap gap-2">
                      {teachingModes.map((m) => (
                        <div
                          key={String(m.label)}
                          className={PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS}
                        >
                          {m.icon}
                          {m.label}
                        </div>
                      ))}
                    </div>
                    {/* Home-lesson public summary — only when the teacher has
                        actually enabled the option AND set a valid hourly home
                        rate (gated by `homeConfigured`, same gate as booking).
                        We deliberately never expose the exact address: only the
                        max travel radius (already public on teachers_public)
                        and the hourly rate that students would be charged. */}
                    {homeConfigured ? (
                      <div
                        className="mt-1 space-y-0.5 text-[11px] text-slate-600"
                        data-testid="teacher-profile-home-lessons-summary"
                      >
                        <p className="font-semibold text-slate-700">{t("homeLessonsPublicHeader")}</p>
                        <p>
                          {t("homeLessonsPublicRadiusSummary").replace("{km}", String(radiusKm))}
                        </p>
                        <p>
                          {t("homeLessonsPublicHourlyRateSummary").replace(
                            "{price}",
                            String(Number(teacher.homeLessonPrice ?? 0)),
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {publicTeachingZones.length > 0 ? (
                  <div data-testid="teacher-profile-teaching-zones" className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {t("teachingZonesPublicTitle")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {publicTeachingZones.map((zone) => {
                        const label = formatTeachingZoneLabel(zone);
                        if (!label) return null;
                        return (
                          <div
                            key={zone.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                          >
                            <p className="flex items-center gap-1.5 font-bold text-slate-900">
                              <MapPin size={13} className="shrink-0 text-teal-700" aria-hidden />
                              <span>{label}</span>
                              {zone.isPrimary ? (
                                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                  {t("teachingZonesPrimary")}
                                </span>
                              ) : null}
                            </p>
                            {zone.availabilityNotePublic ? (
                              <p className="mt-1 leading-relaxed text-slate-600">{zone.availabilityNotePublic}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Enterprise studio map */}
                {showEnterpriseStudioMap ? (
                  <TeacherMap
                    teacher={teacher}
                    isBooked={Boolean(studioMapHasConfirmedBooking)}
                    isEnterprise={displayPlan === "enterprise"}
                  />
                ) : null}

                <PublicTeacherOffersSection
                  teacherId={teacher.id}
                  onOffersLoaded={setPublicOffers}
                  onPrepareBooking={handlePrepareOfferBooking}
                />

                {/* ── Reviews ────────────────────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Avis des élèves
                  </p>
                  {reviews.length === 0 ? (
                    <div
                      data-testid="teacher-profile-reviews-empty"
                      role="status"
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                    >
                      <Star size={18} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
                      <p className="text-sm leading-relaxed text-slate-500">{t("reviewsEmptyState")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {reviews.map((review) => {
                        const displayName = formatReviewerName(reviewerNames.get(review.student_id) ?? "");
                        const isOwn = user?.id === review.student_id;
                        const alreadyReported = reportedIds.has(review.id);
                        return (
                          <li key={review.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <StarDisplay rating={review.rating} />
                              <span className="text-[11px] font-semibold text-slate-700">{displayName}</span>
                              <span className="text-[11px] text-slate-400 ml-auto">
                                {new Date(review.created_at).toLocaleDateString("fr-CA", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {review.body ? (
                              <p className="text-xs italic text-slate-700 leading-relaxed">{review.body}</p>
                            ) : null}
                            {review.teacher_reply ? (
                              <div className="mt-3 rounded-xl border border-teal-500/20 bg-teal-50/70 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
                                  Reponse du professeur
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-700">{review.teacher_reply}</p>
                              </div>
                            ) : null}
                            {isTeacherOwner ? (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={replyDrafts[review.id] ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value.slice(0, 1000);
                                    setReplyDrafts((prev) => ({ ...prev, [review.id]: value }));
                                    if (replyErrorId === review.id) setReplyErrorId(null);
                                  }}
                                  rows={2}
                                  placeholder="Repondre publiquement a cet avis..."
                                  className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                                {replyErrorId === review.id ? (
                                  <p className="text-[11px] text-rose-600">La reponse n&apos;a pas pu etre enregistree.</p>
                                ) : null}
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => void submitReply(review.id)}
                                    disabled={
                                      replySavingId === review.id ||
                                      !(replyDrafts[review.id] ?? "").trim() ||
                                      (replyDrafts[review.id] ?? "").trim() === (review.teacher_reply ?? "").trim()
                                    }
                                    className="min-h-[32px] rounded-xl bg-teal-700 px-3 text-[11px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {replySavingId === review.id
                                      ? "..."
                                      : review.teacher_reply
                                        ? "Modifier la reponse"
                                        : "Repondre publiquement"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                            {!isOwn ? (
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  disabled={alreadyReported}
                                  onClick={() => setReportTarget(review.id)}
                                  className="text-[11px] text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-default transition-colors"
                                >
                                  {alreadyReported ? `✓ ${t("reviewReportButton")}` : t("reviewReportButton")}
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN (sticky sidebar) ────── */}
              <div className="lg:col-span-2 mt-6 lg:mt-0">
                <div className="lg:sticky lg:top-0 space-y-4">

                  {/* Booking widget */}
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        <PriceDisplay
                          amount={Number(teacher.pricePerLesson)}
                          sourceCurrency={teacher.currency ?? "CAD"}
                          perHour
                          primaryClassName="font-bold text-slate-900"
                          secondaryClassName="block w-full text-xs font-semibold text-slate-500"
                        />
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">{standardLabel}</p>
                      <p
                        className="mt-2 text-[11px] text-slate-600"
                        data-testid="teacher-profile-final-price-depends-on-duration"
                      >
                        {t("publicTeacherProfileFinalPriceDependsOnDuration")}
                      </p>
                    </div>

                    {teacher.introSessionEnabled ? (
                      <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 space-y-2">
                        <p className="text-sm font-extrabold text-slate-900">
                          {t("introSessionPublicLabel").replace("{n}", String(teacher.introSessionDurationMinutes ?? 45))}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-600">{t("introSessionPublicDescription")}</p>
                        {(() => {
                          const dur = teacher.introSessionDurationMinutes ?? 45;
                          const discount = teacher.introSessionDiscountPercent ?? 50;
                          const override = teacher.introSessionPriceCents;
                          const cents = calculateIntroSessionPriceCents({
                            hourlyPrice: teacher.pricePerLesson,
                            durationMinutes: dur,
                            discountPercent: discount,
                            explicitPriceCents: override ?? null,
                          });
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-700">
                                {t("introSessionPrice")} :{" "}
                                <PriceDisplay
                                  amount={cents / 100}
                                  sourceCurrency={teacher.currency ?? "CAD"}
                                  primaryClassName="font-extrabold text-teal-700"
                                  secondaryClassName="block text-[10px] font-semibold text-slate-500"
                                />
                              </span>
                              <span className="font-semibold text-slate-600">
                                {t("regularLesson")} :{" "}
                                <PriceDisplay
                                  amount={Number(teacher.pricePerLesson)}
                                  sourceCurrency={teacher.currency ?? "CAD"}
                                  perHour
                                  primaryClassName="font-semibold text-slate-700"
                                  secondaryClassName="block text-[10px] font-semibold text-slate-500"
                                />
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    {(() => {
                      const todayIso = formatLocalISODate(new Date());
                      const badge = getAvailableFromBadge(teacher.availableFromDate, locale, todayIso);
                      if (!badge) return null;
                      const title =
                        badge.kind === "month"
                          ? t("availableFromBadgeMonth").replace("{month}", badge.monthLabel)
                          : t("availableFromBadgeDay")
                              .replace("{day}", String(badge.day))
                              .replace("{month}", badge.monthLabel);
                      const hint =
                        badge.kind === "month"
                          ? t("availableFromProfileHintMonth")
                          : t("availableFromProfileHintDay");
                      return (
                        <div
                          className="rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-3 text-left"
                          data-testid="teacher-profile-available-from"
                        >
                          <p className="text-sm font-bold text-teal-900">{title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-teal-800/90">{hint}</p>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      data-booking-action={teacher.bookingAction ?? "unknown"}
                      className="w-full h-11 rounded-2xl text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                      style={{ backgroundColor: "var(--palette-teal-700)" }}
                    >
                      {t(teacherBookingActionKey(teacher.bookingAction))}
                      <ChevronRight size={15} />
                    </button>

                    {homeConfigured ? (
                      homeNeedsGeo ? (
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                              <Home size={13} className="text-teal-700" />
                              À domicile
                            </div>
                            <span className="font-bold text-sm text-slate-900">
                              <PriceDisplay
                                amount={Number(teacher.homeLessonPrice)}
                                sourceCurrency={teacher.currency ?? "CAD"}
                                perHour
                                primaryClassName="font-bold text-slate-900"
                                secondaryClassName="block text-[9px] font-semibold text-slate-500"
                              />
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-teal-700">
                              Rayon {radiusKm} km
                            </span>
                            {teacher.homeLessonRequiresConfirmation ? (
                              <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                                Confirmation requise
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={requestGeo}
                            className="mt-1.5 w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            Activer la localisation pour vérifier la zone
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={homeDisabled}
                          onClick={() => openBooking("home")}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left text-sm transition-all",
                            homeDisabled
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                              : "border-slate-200 bg-slate-50/80 hover:border-teal-500 hover:bg-teal-500/10",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                              <Home size={13} className={homeDisabled ? "text-slate-300" : "text-teal-700"} />
                              À domicile
                            </div>
                            <span className="font-bold text-sm text-slate-900">
                            <PriceDisplay
                              amount={Number(teacher.homeLessonPrice)}
                              sourceCurrency={teacher.currency ?? "CAD"}
                              perHour
                              primaryClassName="font-bold text-slate-900"
                              secondaryClassName="block text-[9px] font-semibold text-slate-500"
                            />
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-teal-700">
                              Rayon {radiusKm} km
                            </span>
                            {teacher.homeLessonRequiresConfirmation ? (
                              <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                                Confirmation requise
                              </span>
                            ) : null}
                          </div>
                          {outOfHomeZone ? (
                            <p className="mt-1.5 text-[11px] font-semibold text-rose-600">Hors de la zone de déplacement</p>
                          ) : null}
                        </button>
                      )
                    ) : null}
                  </div>

                  {/* Public trust card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="teacher-profile-trust-box">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        <Shield size={16} aria-hidden />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{t("teacherTrustTitle")}</h3>
                    </div>
                    <ul className="mt-3 space-y-2.5">
                      {identityVerifiedForTrustBox ? (
                        <li className="flex gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50">
                            <CheckCircle2 size={15} className="text-teal-700" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-slate-900">{t("teacherBadgeIdentityVerified")}</span>
                            <span className="block text-[11px] leading-relaxed text-slate-600">{t("teacherTrustIdentityVerifiedDescription")}</span>
                          </span>
                        </li>
                      ) : (
                        <li className="flex gap-2.5" data-testid="teacher-profile-identity-unverified">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <Shield size={15} className="text-slate-600" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-slate-900">{t("teacherTrustIdentityNotVerifiedTitle")}</span>
                            <span className="block text-[11px] leading-relaxed text-slate-600">{t("teacherTrustIdentityNotVerifiedDescription")}</span>
                          </span>
                        </li>
                      )}
                      {experienceVerifiedForTrustBox ? (
                        <li className="flex gap-2.5" data-testid="teacher-profile-trust-experience">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50">
                            <Award size={15} className="text-teal-700" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-slate-900">{t("teacherBadgeVerifiedExperience")}</span>
                            <span className="block text-[11px] leading-relaxed text-slate-600">{t("teacherBadgeVerifiedExperienceDescription")}</span>
                          </span>
                        </li>
                      ) : null}
                      {diplomaVerifiedForTrustBox ? (
                        <li className="flex gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50">
                            <FileCheck2 size={15} className="text-teal-700" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-slate-900">{t("teacherBadgeDiplomaVerified")}</span>
                            <span className="block text-[11px] leading-relaxed text-slate-600">{t("trustDiplomaVerifiedDescription")}</span>
                          </span>
                        </li>
                      ) : null}
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50">
                          <CreditCard size={15} className="text-teal-700" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-slate-900">{t("teacherTrustPaymentProtected")}</span>
                          <span className="block text-[11px] leading-relaxed text-slate-600">{t("teacherTrustPaymentProtectedDescription")}</span>
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50">
                          <Shield size={15} className="text-teal-700" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-slate-900">{t("teacherTrustContactProtected")}</span>
                          <span className="block text-[11px] leading-relaxed text-slate-600">{t("teacherTrustContactProtectedDescription")}</span>
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Message: locked until first booking */}
                  {user && teacher.userId ? (
                    hasBooking ? (
                      <button
                        type="button"
                        onClick={handleMessage}
                        className="w-full py-3 rounded-2xl text-sm font-bold border-2 border-teal-500 text-teal-700 bg-teal-50 hover:bg-teal-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={15} />
                        Envoyer un message
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-sm shrink-0">🔒</span>
                        <p className="text-xs text-slate-600 leading-snug">
                          La messagerie sera disponible après ta première réservation
                        </p>
                      </div>
                    )
                  ) : null}

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Mobile sticky footer (hidden on lg+) ─── */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={handlePrimaryAction}
            data-booking-action={teacher.bookingAction ?? "unknown"}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ backgroundColor: "var(--palette-teal-700)" }}
          >
            {t(teacherBookingActionKey(teacher.bookingAction))}{" · "}
            <PriceDisplay
              amount={Number(teacher.pricePerLesson)}
              sourceCurrency={teacher.currency ?? "CAD"}
              perHour
              primaryClassName="font-semibold text-white"
              secondaryClassName="hidden"
              showOriginal={false}
            />
          </button>
        </div>

      </motion.div>

      {/* ── Report modal overlay ─────────────────────────────── */}
      {reportTarget ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/50">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">{t("reviewReportTitle")}</h3>

            {reportStatus === "success" ? (
              <p className="text-sm font-semibold text-teal-700">{t("reviewReportSuccess")}</p>
            ) : (
              <>
                <fieldset className="space-y-2">
                  {(
                    [
                      { value: "inappropriate", label: t("reviewReportReasonInappropriate") },
                      { value: "fake",          label: t("reviewReportReasonFake") },
                      { value: "harassment",    label: t("reviewReportReasonHarassment") },
                      { value: "spam",          label: t("reviewReportReasonSpam") },
                      { value: "other",         label: t("reviewReportReasonOther") },
                    ] as const
                  ).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="report-reason"
                        value={value}
                        checked={reportReason === value}
                        onChange={() => setReportReason(value)}
                        className="accent-teal-700"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </fieldset>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    {t("reviewReportDetailsLabel")}
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value.slice(0, 500))}
                    rows={2}
                    placeholder="…"
                    className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {reportStatus === "already" ? (
                  <p className="text-xs text-amber-700">{t("reviewReportAlreadySent")}</p>
                ) : reportStatus === "error" ? (
                  <p className="text-xs text-rose-600">Erreur, réessayez.</p>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void submitReport()}
                    disabled={!reportReason || reportStatus === "submitting"}
                    className={cn(
                      "flex-1 min-h-[36px] rounded-xl bg-teal-700 text-xs font-semibold text-white transition-all",
                      (!reportReason || reportStatus === "submitting") && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {reportStatus === "submitting" ? "…" : t("reviewReportSubmit")}
                  </button>
                  <button
                    type="button"
                    onClick={closeReport}
                    className="min-h-[36px] rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t("reviewReportCancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

    </div>
  );
}

function TeacherVideoEmbed({ videoUrl }: { videoUrl?: string | null }) {
  const embedUrl = getEmbedUrl(videoUrl);
  const { t } = useLocale();
  if (!embedUrl) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        {t("videoPresentation")}
      </p>
      {/* 16:9 responsive wrapper */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
           style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          title={t("videoPresentationTitle")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full rounded-2xl"
        />
      </div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5"
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <p className={PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS}>{value}</p>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn("text-sm leading-none", n <= rating ? "text-amber-400" : "text-slate-200")}
        >
          ★
        </span>
      ))}
    </div>
  );
}
