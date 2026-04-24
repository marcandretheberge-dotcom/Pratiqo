"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Globe,
  Home,
  MapPin,
  MessageSquare,
  ShieldCheck,
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
  /** Ouvre la messagerie avec ce professeur (nécessite `teacher.userId`). */
  onSendMessage?: () => void;
  distanceKm?: number | null;
  /**
   * Plan chargé par la page profil (`/teacher/profile/[id]`) — évite un double fetch
   * et pilote la carte Google (réservée Entreprise).
   */
  embeddedPlan?: { plan: string | null; loading: boolean };
  /**
   * Carte Google « Studio » uniquement sur la fiche `/teacher/profile/[id]`, pas dans la modale Recherche.
   */
  showGoogleStudioMap?: boolean;
}

export function TeacherProfile({
  teacher,
  onClose,
  onBook,
  onSendMessage,
  distanceKm,
  embeddedPlan,
  showGoogleStudioMap,
}: TeacherProfileProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("free");

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

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Permission denied or unavailable: keep badge hidden (geo stays null).
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (embeddedPlan !== undefined) return;
    const load = async () => {
      if (!teacher.id) return;
      const res = await fetch(`/api/teachers/plan?teacherId=${encodeURIComponent(teacher.id)}`);
      const json = (await res.json()) as { plan?: string };
      setPlan(normalizeMarketPlan(json.plan));
    };

    void load();
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
    ) {
      return null;
    }
    return haversineDistance(geo.lat, geo.lng, lat, lng);
  }, [geo, teacher.location?.lat, teacher.location?.lng]);

  const displayDistanceKm = distanceKm !== undefined ? distanceKm : computedDistanceKm;

  const homeConfigured =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;
  const radiusKm = teacher.homeLessonRadiusKm ?? 25;
  const outOfHomeZone =
    homeConfigured && displayDistanceKm !== null && displayDistanceKm > radiusKm;
  const homeNeedsGeo = homeConfigured && displayDistanceKm === null;
  const homeDisabled = !homeConfigured || outOfHomeZone || homeNeedsGeo;

  const standardLabel =
    teacher.teachingMode === "both"
      ? "En studio / En ligne"
      : teacher.teachingMode === "online"
        ? "En ligne"
        : "En studio";

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden relative shadow-2xl z-10 border border-slate-200 flex flex-col"
      >
        <div className="relative h-48 sm:h-64 flex-shrink-0">
          <img
            src={teacher.imageUrl}
            className="w-full h-full object-cover blur-3xl opacity-20"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition-all z-20"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col sm:flex-row items-end gap-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl relative flex-shrink-0">
              <img
                src={teacher.imageUrl}
                className="w-full h-full object-cover"
                alt={teacher.name}
                referrerPolicy="no-referrer"
              />
              {teacher.isVerified && (
                <div className="absolute top-2 left-2 bg-white rounded-lg p-1.5 shadow-md text-blue-500">
                  <ShieldCheck size={18} fill="currentColor" className="text-blue-50" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2 pb-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {teacher.category}
                </span>
                <PlanBadge plan={displayPlan} />
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm">{teacher.rating}</span>
                  <span className="text-slate-400 font-medium text-xs">(24 avis)</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">{teacher.name}</h2>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <MapPin size={16} className="text-brand-primary" />
                {displayDistanceKm !== null ? `${displayDistanceKm.toFixed(1)} km de vous • ` : null}
                {teacher.teachingMode === "both"
                  ? "Hybride"
                  : teacher.teachingMode === "online"
                    ? "En ligne"
                    : "Présentiel"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickStat icon={<Clock className="text-indigo-500" />} label="Cours d'essai" value="45 min" />
            <QuickStat icon={<Globe className="text-emerald-500" />} label="Langues" value={teacher.languages.join(", ")} />
            <QuickStat
              icon={<Users className="text-rose-500" />}
              label="Niveaux"
              value={teacher.levels.length > 2 ? "Tous niveaux" : teacher.levels[0]}
            />
            <QuickStat icon={<CreditCard className="text-teal-500" />} label="Tarif" value={`$${teacher.pricePerLesson}`} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">
              À propos
            </h3>
            <p className="text-slate-600 leading-relaxed font-medium">
              {teacher.name} est un(e) expert(e) passionné(e) par {teacher.discipline.toLowerCase()}.
              Avec plus de 8 ans d&apos;expérience, sa méthode d&apos;enseignement repose sur la pratique
              immédiate et l&apos;adaptation aux objectifs spécifiques de chaque élève.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">
                Spécialisations
              </h3>
              <div className="flex flex-wrap gap-2">
                {teacher.discipline.split(", ").map((d) => (
                  <span
                    key={d}
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">
                Ce que vous apprendrez
              </h3>
              <ul className="space-y-2">
                {["Bases fondamentales", "Perfectionnement technique", "Interprétation & Style", "Confiance & Expression"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <CheckCircle2 size={14} className="text-teal-500" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          {showEnterpriseStudioMap ? (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">
                Studio sur la carte
              </h3>
              <TeacherMap
                context="teacher_profile"
                teacherPlan={displayPlan}
                lat={teacher.location.lat}
                lng={teacher.location.lng}
                title="Localisation"
                className="space-y-2"
              />
            </div>
          ) : null}

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-slate-900">Options de cours</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Marketplace hybride</p>
            </div>
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white transition-all",
                  teacher.teachingMode === "online" || teacher.teachingMode === "both"
                    ? "border-brand-primary text-brand-primary"
                    : "opacity-30 border-slate-200",
                )}
              >
                <Video size={24} />
                <span className="text-[10px] font-bold uppercase">En ligne</span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white transition-all",
                  teacher.teachingMode === "person" || teacher.teachingMode === "both"
                    ? "border-brand-primary text-brand-primary"
                    : "opacity-30 border-slate-200",
                )}
              >
                <Users size={24} />
                <span className="text-[10px] font-bold uppercase">Présentiel</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={handleStartChat}
            className="p-4 bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-brand-primary rounded-2xl transition-all border border-transparent hover:border-teal-100 sm:self-center shrink-0"
          >
            <MessageSquare size={24} />
          </button>
          <div
            className={cn(
              "flex-1 grid gap-3 min-w-0",
              homeConfigured ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
            )}
          >
            <button
              type="button"
              onClick={() => onBook("standard")}
              className="text-left rounded-2xl border border-slate-200 bg-slate-50/80 p-4 hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.06)] transition-all group flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {standardLabel}
                </span>
                <Users size={18} className="text-slate-400 group-hover:text-[#1D9E75]" />
              </div>
              <p className="text-lg font-bold text-slate-900">${teacher.pricePerLesson}</p>
              <p className="text-[11px] text-slate-500">par heure · tarif studio ou visio</p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1D9E75]">
                Réserver <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {homeConfigured ? (
              <button
                type="button"
                disabled={homeDisabled}
                onClick={() => onBook("home")}
                className={cn(
                  "text-left rounded-2xl border p-4 transition-all flex flex-col gap-2",
                  homeDisabled
                    ? "border-slate-100 bg-slate-50 opacity-70 cursor-not-allowed"
                    : "border-slate-200 bg-slate-50/80 hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.06)] group",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">À domicile</span>
                  <Home size={18} className={homeDisabled ? "text-slate-300" : "text-slate-400 group-hover:text-[#1D9E75]"} />
                </div>
                <p className="text-lg font-bold text-slate-900">${Number(teacher.homeLessonPrice).toFixed(2)}</p>
                <p className="text-[11px] text-slate-500">par heure</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[rgba(29,158,117,0.15)] text-[#0f6e56]">
                    Déplacement inclus
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[rgba(29,158,117,0.15)] text-[#0f6e56]">
                    Rayon {radiusKm} km
                  </span>
                  {teacher.homeLessonRequiresConfirmation ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-100">
                      Confirmation requise
                    </span>
                  ) : null}
                </div>
                {outOfHomeZone ? (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">Hors de la zone de déplacement</p>
                ) : homeNeedsGeo ? (
                  <p className="text-[11px] font-semibold text-amber-700 mt-1">
                    Activez la localisation pour vérifier la zone
                  </p>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1D9E75]">
                    Réserver <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </button>
            ) : null}
          </div>
          {user && teacher.userId && onSendMessage ? (
            <button
              type="button"
              onClick={() => onSendMessage()}
              className="w-full py-3.5 rounded-2xl text-sm font-bold border-2 border-[#1D9E75] text-[#0f6e56] bg-[#E1F5EE] hover:bg-[rgba(29,158,117,0.18)] transition-colors"
            >
              Envoyer un message
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="text-xs font-bold text-slate-900 truncate">{value}</p>
    </div>
  );
}

