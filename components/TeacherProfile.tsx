"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Clock,
  CreditCard,
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
import { haversineDistance } from "../lib/geo";
import { PlanBadge } from "./PlanBadge";
import { TeacherMap } from "./TeacherMap";
import { VerificationBadge } from "./VerificationBadge";
import { getAllDisciplines, getDisciplineById } from "../lib/disciplines";
import { useLocale } from "../lib/locale-context";
import {
  getVerificationLevel,
  nextLevelRequirementKeys,
  nextVerificationLevel,
  verificationLevelTitleKey,
} from "../lib/verification";
import { getEmbedUrl } from "../lib/videoEmbed";
import { VerifiedBadge } from "./VerifiedBadge";
import { TeacherAvatar } from "./TeacherAvatar";

export type TeacherBookKind = "standard" | "home";

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
};

type ReportStatus = "idle" | "submitting" | "success" | "already" | "error";

function formatReviewerName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Élève";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface TeacherProfileProps {
  teacher: Teacher;
  onClose: () => void;
  onBook: (kind: TeacherBookKind) => void;
  /** Opens messaging with this teacher (requires `teacher.userId`). */
  onSendMessage?: () => void;
  distanceKm?: number | null;
  /** Plan loaded by the profile page — avoids a double-fetch */
  embeddedPlan?: { plan: string | null; loading: boolean };
  /** Google Studio map (Enterprise only, on /teacher/profile/[id] page). */
  showGoogleStudioMap?: boolean;
  /** Reveals exact address on the studio map when true. */
  studioMapHasConfirmedBooking?: boolean;
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
}: TeacherProfileProps) {
  const { user } = useAuth();
  const { t, formatPrice } = useLocale();
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

  // Check whether this student has a confirmed booking with the teacher
  useEffect(() => {
    if (!user?.id || !teacher.id) return;
    let cancelled = false;
    void getSupabaseClient()
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .in("status", ["confirmed"])
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

  const handleStartChat = async () => {
    if (!user) {
      alert(t("loginToMessage"));
      return;
    }
    if (teacher.userId) {
      router.push(`/messages?peer=${encodeURIComponent(teacher.userId)}`);
      onClose();
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const chatId = [user.id, teacher.id].sort().join("_");
      const { data: existing } = await supabase.from("chats").select("id").eq("id", chatId).maybeSingle();
      if (!existing) {
        await supabase.from("chats").insert({
          id: chatId,
          participant_ids: [user.id, teacher.id],
          last_message: "",
        });
      }
      router.push("/messages");
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
    const lat = teacher.location?.lat;
    const lng = teacher.location?.lng;
    return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  }, [teacher.location?.lat, teacher.location?.lng]);

  const showEnterpriseStudioMap =
    Boolean(showGoogleStudioMap) && displayPlan === "enterprise" && studioMapCoordsOk;

  const computedDistanceKm = useMemo(() => {
    if (!geo) return null;
    const lat = teacher.location?.lat;
    const lng = teacher.location?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) return null;
    return haversineDistance(geo.lat, geo.lng, lat, lng);
  }, [geo, teacher.location?.lat, teacher.location?.lng]);

  const displayDistanceKm = distanceKm !== undefined ? distanceKm : computedDistanceKm;

  const verificationLevel = useMemo(
    () =>
      getVerificationLevel({
        plan: displayPlan,
        identity_verified: teacher.identityVerified,
        diploma_verified: teacher.diplomaVerified,
        is_verified: teacher.isVerified,
        verification_level: teacher.verificationLevel ?? null,
      }),
    [displayPlan, teacher.identityVerified, teacher.diplomaVerified, teacher.isVerified, teacher.verificationLevel],
  );

  const nextLevel = nextVerificationLevel(verificationLevel);
  const nextReqKeys = nextLevel
    ? nextLevelRequirementKeys(verificationLevel, {
        plan: displayPlan,
        identity_verified: teacher.identityVerified,
        diploma_verified: teacher.diplomaVerified,
      })
    : [];

  const homeConfigured =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;
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

  const disciplineChips = useMemo(() => {
    const primaryEmoji = getAllDisciplines().find((d) => d.label === teacher.category)?.emoji ?? "✨";
    const out: string[] = [`${primaryEmoji} ${teacher.discipline}`.trim()];
    for (const ad of teacher.additionalDisciplines ?? []) {
      const d = getDisciplineById(ad.disciplineId);
      const em = d?.emoji ?? "✨";
      const spec = ad.specialite?.trim() || d?.label || "";
      if (spec) out.push(`${em} ${spec}`);
    }
    return out;
  }, [teacher.category, teacher.discipline, teacher.additionalDisciplines]);

  const teachingModes = useMemo(() => {
    const modes: { icon: React.ReactNode; label: string }[] = [];
    if (["person", "both", "all"].includes(teacher.teachingMode))
      modes.push({ icon: <Users size={14} />, label: t("filterInPerson") });
    if (["online", "both", "all"].includes(teacher.teachingMode))
      modes.push({ icon: <Video size={14} />, label: t("filterOnline") });
    if (homeConfigured)
      modes.push({ icon: <Home size={14} />, label: t("modeHome") });
    return modes;
  }, [teacher.teachingMode, homeConfigured]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl z-10 border border-slate-200 flex flex-col"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-slate-800 transition-all"
        >
          <X size={18} />
        </button>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 lg:p-8">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">

              {/* ── LEFT COLUMN ─────────────────────── */}
              <div className="lg:col-span-3 space-y-6">

                {/* Compact header */}
                <div className="flex items-start gap-4 pr-12">
                  <TeacherAvatar
                    name={teacher.name}
                    category={teacher.category}
                    imageUrl={teacher.imageUrl}
                    size={96}
                    ringClassName="border-2 border-white shadow-lg ring-2 ring-[rgba(29,158,117,0.25)]"
                  />

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2.5 py-0.5 bg-[#0F6E56] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        {teacher.category}
                      </span>
                      <PlanBadge plan={displayPlan} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl lg:text-2xl font-bold text-slate-900 leading-tight">{teacher.name}</h2>
                      <VerifiedBadge
                        verified={teacher.isVerified || Boolean(teacher.identityVerified)}
                        size="sm"
                      />
                      {Boolean(teacher.identityVerified) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-semibold">
                          <Shield size={11} /> Identité vérifiée
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Star size={13} fill="currentColor" className="text-amber-400" />
                        <span className="text-sm font-semibold text-slate-700">{teacher.rating}</span>
                        <span className="text-xs text-slate-600 ml-0.5">({reviews.length} avis)</span>
                      </div>
                      <span className="text-slate-300 text-xs">·</span>
                      <VerificationBadge level={verificationLevel} size="sm" showLabel />
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                      <MapPin size={11} className="text-[#1D9E75] shrink-0" />
                      {displayDistanceKm !== null ? `${displayDistanceKm.toFixed(1)} km · ` : ""}
                      {["both", "all"].includes(teacher.teachingMode)
                        ? t("modeHybrid")
                        : teacher.teachingMode === "online"
                          ? "En ligne"
                          : t("filterInPerson")}
                    </p>
                  </div>
                </div>

                {/* Discipline chips */}
                {disciplineChips.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {disciplineChips.map((text, i) => (
                      <span
                        key={`${text}-${i}`}
                        className="inline-flex items-center rounded-full border border-[rgba(29,158,117,0.35)] bg-[rgba(29,158,117,0.1)] px-3 py-1 text-xs font-semibold text-[#0f6d52]"
                      >
                        {text}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Bio */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t("aboutSection")}</p>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {teacher.bio ||
                      `${teacher.name} est un(e) expert(e) en ${teacher.discipline.toLowerCase()}. Sa méthode d'enseignement repose sur la pratique immédiate et l'adaptation aux objectifs de chaque élève.`}
                  </p>
                </div>

                {/* Intro video — only rendered when teacher.videoUrl is a valid YT/Vimeo URL */}
                <TeacherVideoEmbed videoUrl={teacher.videoUrl} />

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <QuickStat icon={<Clock className="text-indigo-500" size={15} />} label={t("trialLesson")} value={t("trialLessonDuration")} />
                  <QuickStat
                    icon={<Globe className="text-emerald-500" size={15} />}
                    label={t("languagesLabel")}
                    value={teacher.languages.join(", ") || "—"}
                  />
                  <QuickStat
                    icon={<Users className="text-rose-500" size={15} />}
                    label={t("levelsLabel")}
                    value={teacher.levels.length > 2 ? t("allLevels") : (teacher.levels[0] ?? "—")}
                  />
                  <QuickStat
                    icon={<CreditCard className="text-teal-500" size={15} />}
                    label={t("rateLabel")}
                    value={formatPrice(Number(teacher.pricePerLesson))}
                  />
                </div>

                {/* Teaching modes */}
                {teachingModes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t("coursesOptionsSection")}</p>
                    <div className="flex flex-wrap gap-2">
                      {teachingModes.map((m) => (
                        <div
                          key={String(m.label)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgba(29,158,117,0.3)] bg-[rgba(29,158,117,0.06)] text-[#0f6e56] text-xs font-semibold"
                        >
                          {m.icon}
                          {m.label}
                        </div>
                      ))}
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

                {/* Next verification level */}
                {nextLevel ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("verificationNextLevel")}</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {t("verificationNextTierLabel")} : {t(verificationLevelTitleKey(nextLevel))}
                    </p>
                    <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                      {nextReqKeys.map((key) => (
                        <li key={key}>{t(key)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* ── Reviews ────────────────────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Avis des élèves
                  </p>
                  {reviews.length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-1">{t("reviewsEmptyState")}</p>
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
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatPrice(Number(teacher.pricePerLesson))}
                        <span className="text-sm font-normal text-slate-600 ml-1">/ heure</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{standardLabel}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBook("standard")}
                      className="w-full h-11 rounded-2xl text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#0F6E56" }}
                    >
                      {t("bookNow")}
                      <ChevronRight size={15} />
                    </button>

                    {homeConfigured ? (
                      homeNeedsGeo ? (
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                              <Home size={13} className="text-[#1D9E75]" />
                              À domicile
                            </div>
                            <span className="font-bold text-sm text-slate-900">
                              {formatPrice(Number(teacher.homeLessonPrice))}
                              <span className="text-xs text-slate-600 font-normal ml-0.5">/h</span>
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-[rgba(29,158,117,0.12)] px-2 py-0.5 text-[9px] font-bold uppercase text-[#0f6e56]">
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
                          onClick={() => onBook("home")}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left text-sm transition-all",
                            homeDisabled
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                              : "border-slate-200 bg-slate-50/80 hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.04)]",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                              <Home size={13} className={homeDisabled ? "text-slate-300" : "text-[#1D9E75]"} />
                              À domicile
                            </div>
                            <span className="font-bold text-sm text-slate-900">
                              {formatPrice(Number(teacher.homeLessonPrice))}
                              <span className="text-xs text-slate-600 font-normal ml-0.5">/h</span>
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-[rgba(29,158,117,0.12)] px-2 py-0.5 text-[9px] font-bold uppercase text-[#0f6e56]">
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

                  {/* Verification level */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                      Niveau de confiance
                    </p>
                    <VerificationBadge level={verificationLevel} size="lg" showLabel />
                  </div>

                  {/* Message: locked until first booking */}
                  {user && teacher.userId ? (
                    hasBooking ? (
                      <button
                        type="button"
                        onClick={handleMessage}
                        className="w-full py-3 rounded-2xl text-sm font-bold border-2 border-[#1D9E75] text-[#0f6e56] bg-[#E1F5EE] hover:bg-[rgba(29,158,117,0.18)] transition-colors flex items-center justify-center gap-2"
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
        <div className="lg:hidden flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => onBook("standard")}
            className="w-full h-11 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
            style={{ backgroundColor: "#0F6E56" }}
          >
            Réserver — {formatPrice(Number(teacher.pricePerLesson))}/h
          </button>
        </div>

      </motion.div>

      {/* ── Report modal overlay ─────────────────────────────── */}
      {reportTarget ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/50">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">{t("reviewReportTitle")}</h3>

            {reportStatus === "success" ? (
              <p className="text-sm font-semibold text-[#0F6E56]">{t("reviewReportSuccess")}</p>
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
                        className="accent-[#0F6E56]"
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
                    className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
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
                      "flex-1 min-h-[36px] rounded-xl bg-[#0F6E56] text-xs font-semibold text-white transition-all",
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

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <p className="text-xs font-bold text-slate-900 truncate">{value}</p>
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
