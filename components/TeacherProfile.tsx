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

export type TeacherBookKind = "standard" | "home";

function normalizeMarketPlan(p: string | null | undefined): "free" | "pro" | "enterprise" {
  const raw = String(p || "free").toLowerCase();
  if (raw === "enterprise") return "enterprise";
  if (raw === "pro") return "pro";
  return "free";
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

  // Check whether this student has a confirmed booking with the teacher
  useEffect(() => {
    if (!user?.id || !teacher.id) return;
    let cancelled = false;
    void getSupabaseClient()
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .in("status", ["confirmed", "booked"])
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setHasBooking((data?.length ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, teacher.id]);

  const handleStartChat = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour envoyer un message.");
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
      ? "En studio / En ligne"
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
      modes.push({ icon: <Users size={14} />, label: "Présentiel" });
    if (["online", "both", "all"].includes(teacher.teachingMode))
      modes.push({ icon: <Video size={14} />, label: "En ligne" });
    if (homeConfigured)
      modes.push({ icon: <Home size={14} />, label: "À domicile" });
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
                  {/* Circle photo */}
                  <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white shadow-lg shrink-0 ring-2 ring-[rgba(29,158,117,0.25)]">
                    <img
                      src={teacher.imageUrl}
                      className="w-full h-full object-cover"
                      alt={teacher.name}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2.5 py-0.5 bg-[#0F6E56] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        {teacher.category}
                      </span>
                      <PlanBadge plan={displayPlan} />
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-900 leading-tight">{teacher.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Star size={13} fill="currentColor" className="text-amber-400" />
                        <span className="text-sm font-semibold text-slate-700">{teacher.rating}</span>
                        <span className="text-xs text-slate-600 ml-0.5">(24 avis)</span>
                      </div>
                      <span className="text-slate-300 text-xs">·</span>
                      <VerificationBadge level={verificationLevel} size="sm" showLabel />
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                      <MapPin size={11} className="text-[#1D9E75] shrink-0" />
                      {displayDistanceKm !== null ? `${displayDistanceKm.toFixed(1)} km · ` : ""}
                      {["both", "all"].includes(teacher.teachingMode)
                        ? "Hybride"
                        : teacher.teachingMode === "online"
                          ? "En ligne"
                          : "Présentiel"}
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">À propos</p>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {teacher.bio ||
                      `${teacher.name} est un(e) expert(e) en ${teacher.discipline.toLowerCase()}. Sa méthode d'enseignement repose sur la pratique immédiate et l'adaptation aux objectifs de chaque élève.`}
                  </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <QuickStat icon={<Clock className="text-indigo-500" size={15} />} label="Cours d'essai" value="45 min" />
                  <QuickStat
                    icon={<Globe className="text-emerald-500" size={15} />}
                    label="Langues"
                    value={teacher.languages.join(", ") || "—"}
                  />
                  <QuickStat
                    icon={<Users className="text-rose-500" size={15} />}
                    label="Niveaux"
                    value={teacher.levels.length > 2 ? "Tous niveaux" : (teacher.levels[0] ?? "—")}
                  />
                  <QuickStat
                    icon={<CreditCard className="text-teal-500" size={15} />}
                    label="Tarif"
                    value={formatPrice(Number(teacher.pricePerLesson))}
                  />
                </div>

                {/* Teaching modes */}
                {teachingModes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Options de cours</p>
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
                      Réserver maintenant
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
