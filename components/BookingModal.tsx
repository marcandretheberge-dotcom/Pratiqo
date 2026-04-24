"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Loader2,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { haversineDistance } from "../lib/geo";

export type BookingInitialLessonKind = "standard" | "home";

type StoredTeachingMode = "person" | "online" | "domicile";

function defaultTeachingMode(teacher: Teacher, initial: BookingInitialLessonKind): StoredTeachingMode {
  if (initial === "home") return "domicile";
  if (teacher.teachingMode === "online") return "online";
  if (teacher.teachingMode === "person") return "person";
  return "person";
}

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
  /** Depuis la fiche prof : cours classique ou à domicile. */
  initialLessonKind?: BookingInitialLessonKind;
}

export function BookingModal({ teacher, onClose, initialLessonKind = "standard" }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"info" | "preferences" | "calendar" | "slots">("info");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [teachingMode, setTeachingMode] = useState<StoredTeachingMode>(() =>
    defaultTeachingMode(teacher, initialLessonKind),
  );
  const [studentAddress, setStudentAddress] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    setTeachingMode(defaultTeachingMode(teacher, initialLessonKind));
    setStudentAddress("");
    setStep("info");
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedLevel(null);
    setCheckoutError(null);
  }, [teacher.id, initialLessonKind]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  const distanceKm = useMemo(() => {
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

  const lessonHours = useMemo(() => {
    if (teachingMode !== "domicile") return 1;
    let h = (teacher.homeLessonMinDuration ?? 60) / 60;
    if (teacher.homeLessonForce2hOver20km && distanceKm !== null && distanceKm > 20) {
      h = Math.max(h, 2);
    }
    return h;
  }, [teachingMode, teacher.homeLessonMinDuration, teacher.homeLessonForce2hOver20km, distanceKm]);

  const hourlyRate = teachingMode === "domicile" ? Number(teacher.homeLessonPrice ?? 0) : teacher.pricePerLesson;
  const totalPrice = Math.round(lessonHours * hourlyRate * 100) / 100;

  const homeAvailable =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;

  const showStudio = teacher.teachingMode === "person" || teacher.teachingMode === "both";
  const showOnline = teacher.teachingMode === "online" || teacher.teachingMode === "both";

  const days = ["Lun 20", "Mar 21", "Mer 22", "Jeu 23", "Ven 24", "Sam 25"];
  const times = ["09:00", "10:30", "14:00", "15:30", "17:00", "18:30"];

  const handleConfirmAndPay = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour réserver.");
      return;
    }

    const modeForDb: "person" | "online" | "domicile" =
      teachingMode === "domicile" ? "domicile" : teachingMode;
    const addressTrim = studentAddress.trim();

    if (modeForDb === "domicile") {
      if (!homeAvailable) {
        setCheckoutError("Cours à domicile non disponible pour ce professeur.");
        return;
      }
      if (!addressTrim) {
        setCheckoutError("Indiquez l’adresse du cours à domicile.");
        return;
      }
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    let redirecting = false;
    try {
      const supabase = getSupabaseClient();
      const bookingData = {
        teacher_id: teacher.id,
        student_id: user.id,
        date: selectedDate,
        time: selectedTime,
        student_level: selectedLevel,
        teaching_mode: modeForDb,
        status: "pending_payment",
        price: totalPrice,
        student_address: modeForDb === "domicile" ? addressTrim : null,
      };

      const { data: inserted, error: insErr } = await supabase.from("bookings").insert(bookingData).select("id").single();
      if (insErr) throw insErr;
      const bookingId = inserted?.id as string;
      if (!bookingId) throw new Error("Missing booking id after insert.");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Session expirée. Reconnectez-vous.");
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teacher_id: teacher.id,
          amount: totalPrice,
          booking_details: { booking_id: bookingId },
          teaching_mode: modeForDb,
          student_address: modeForDb === "domicile" ? addressTrim : "",
        }),
      });

      const raw = await res.text();
      let payload: { url?: string; error?: string; stripeCode?: string | null; stripeType?: string };
      try {
        payload = raw ? (JSON.parse(raw) as typeof payload) : {};
      } catch {
        payload = { error: raw || `Erreur HTTP ${res.status}` };
      }

      if (!res.ok) {
        const parts = [
          payload.error || "Échec du paiement Stripe.",
          payload.stripeCode ? `(${payload.stripeCode})` : null,
        ].filter(Boolean);
        throw new Error(parts.join(" "));
      }

      const url = payload.url;
      if (!url) throw new Error("URL de paiement manquante (réponse Stripe invalide).");

      redirecting = true;
      window.location.assign(url);
    } catch (error) {
      console.error("Booking / checkout error", error);
      const msg = error instanceof Error ? error.message : "Une erreur est survenue.";
      setCheckoutError(msg);
    } finally {
      if (!redirecting) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#1D9E75" }}>
              Réservation
            </p>
            <h3 className="text-xl font-bold text-slate-900">{teacher.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            Fermer
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === "info" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{teacher.bio}</p>
              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="w-full ds-btn-primary h-12 rounded-2xl text-sm font-semibold"
              >
                Continuer <ChevronRight className="inline ml-1" size={16} />
              </button>
            </div>
          )}

          {step === "preferences" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800">Votre niveau</p>
              <div className="flex flex-wrap gap-2">
                {teacher.levels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border",
                      selectedLevel === lvl ? "text-white border-transparent" : "border-slate-200 text-slate-600",
                    )}
                    style={
                      selectedLevel === lvl
                        ? { backgroundColor: "#1D9E75", borderColor: "#1D9E75" }
                        : undefined
                    }
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Lieu du cours</p>
                <div className="flex flex-wrap gap-2">
                  {showStudio ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("person")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "person"
                          ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]"
                          : "border-slate-200",
                      )}
                    >
                      <Users size={14} /> En studio
                    </button>
                  ) : null}
                  {showOnline ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("online")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "online"
                          ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]"
                          : "border-slate-200",
                      )}
                    >
                      <Video size={14} /> En ligne
                    </button>
                  ) : null}
                  {homeAvailable ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("domicile")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "domicile"
                          ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]"
                          : "border-slate-200",
                      )}
                    >
                      <Home size={14} /> À domicile
                    </button>
                  ) : null}
                </div>
              </div>

              {teachingMode === "domicile" ? (
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#1D9E75]" />
                    Adresse du cours
                  </label>
                  <textarea
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    rows={3}
                    placeholder="Numéro, rue, ville…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] outline-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      ${hourlyRate.toFixed(0)} / h × {lessonHours === 1 ? "1 h" : `${lessonHours} h`}
                    </span>
                    <span className="font-bold text-[#1D9E75]">Total : ${totalPrice.toFixed(2)}</span>
                  </div>
                  {teacher.homeLessonRequiresConfirmation ? (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                      Ce professeur confirmera manuellement votre demande à domicile après le paiement.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Tarif : <strong className="text-slate-800">${teacher.pricePerLesson}</strong> / heure
                </p>
              )}

              <button
                type="button"
                disabled={!selectedLevel}
                onClick={() => setStep("calendar")}
                className="w-full ds-btn-primary h-12 rounded-2xl text-sm font-semibold disabled:opacity-50"
              >
                Choisir un créneau
              </button>
            </div>
          )}

          {step === "calendar" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={16} /> Date
              </p>
              <div className="grid grid-cols-3 gap-2">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      "py-2 rounded-xl border text-xs font-bold",
                      selectedDate === d ? "border-[#1D9E75] bg-[#e1f5ee]" : "border-slate-200",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!selectedDate}
                onClick={() => setStep("slots")}
                className="w-full ds-btn-primary h-12 rounded-2xl text-sm font-semibold disabled:opacity-50"
              >
                Heures
              </button>
            </div>
          )}

          {step === "slots" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock size={16} /> Créneau
              </p>
              <p className="text-xs text-slate-500">
                Vous serez redirigé vers Stripe pour payer. Commission plateforme : 12&nbsp;%.
              </p>
              {teachingMode === "domicile" ? (
                <div className="rounded-xl border border-[rgba(29,158,117,0.25)] bg-[rgba(29,158,117,0.06)] px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold text-[#0f6e56]">À domicile</span>
                  {lessonHours > 1 ? (
                    <span className="block mt-1">Durée facturée : {lessonHours} h (politique distance du professeur).</span>
                  ) : null}
                  <span className="block mt-1 font-bold text-slate-900">Montant : ${totalPrice.toFixed(2)}</span>
                </div>
              ) : null}
              {checkoutError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {checkoutError}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      "py-2 rounded-xl border text-xs font-bold",
                      selectedTime === t ? "border-[#1D9E75] bg-[#e1f5ee]" : "border-slate-200",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!selectedTime || isSubmitting}
                onClick={() => void handleConfirmAndPay()}
                className="w-full h-12 rounded-2xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-md transition hover:opacity-95"
                style={{ backgroundColor: "#1D9E75" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Redirection vers Stripe…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Payer ${totalPrice.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
