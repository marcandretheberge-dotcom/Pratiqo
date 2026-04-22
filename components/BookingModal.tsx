"use client";

import React, { useState } from "react";
import { Calendar, CheckCircle2, ChevronRight, Clock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
}

export function BookingModal({ teacher, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"info" | "preferences" | "calendar" | "slots">("info");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [preferredMode, setPreferredMode] = useState<"online" | "person">(
    teacher.teachingMode === "both" ? "person" : (teacher.teachingMode as "online" | "person"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const days = ["Lun 20", "Mar 21", "Mer 22", "Jeu 23", "Ven 24", "Sam 25"];
  const times = ["09:00", "10:30", "14:00", "15:30", "17:00", "18:30"];

  const handleConfirmAndPay = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour réserver.");
      return;
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
        teaching_mode: preferredMode,
        status: "pending_payment",
        price: teacher.pricePerLesson,
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
          amount: teacher.pricePerLesson,
          booking_details: { booking_id: bookingId },
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            Fermer
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === "info" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{teacher.bio}</p>
              <button
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
              {teacher.teachingMode === "both" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Mode</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreferredMode("person")}
                      className={cn(
                        "flex-1 py-2 rounded-xl border text-xs font-bold",
                        preferredMode === "person" ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]" : "border-slate-200",
                      )}
                    >
                      Présentiel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredMode("online")}
                      className={cn(
                        "flex-1 py-2 rounded-xl border text-xs font-bold",
                        preferredMode === "online" ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]" : "border-slate-200",
                      )}
                    >
                      En ligne
                    </button>
                  </div>
                </div>
              )}
              <button
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
                disabled={!selectedTime || isSubmitting}
                onClick={handleConfirmAndPay}
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
                    Payer et confirmer
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
