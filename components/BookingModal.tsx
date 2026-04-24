"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
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
import { formatLocalISODate, periodForSlot } from "../lib/slots";

export type BookingInitialLessonKind = "standard" | "home";

type StoredTeachingMode = "person" | "online" | "domicile";

type Step = "info" | "preferences" | "pickDate" | "pickSlot" | "confirm";

function defaultTeachingMode(teacher: Teacher, initial: BookingInitialLessonKind): StoredTeachingMode {
  if (initial === "home") return "domicile";
  if (teacher.teachingMode === "online") return "online";
  if (teacher.teachingMode === "person") return "person";
  return "person";
}

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
  initialLessonKind?: BookingInitialLessonKind;
}

export function BookingModal({ teacher, onClose, initialLessonKind = "standard" }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("info");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [teachingMode, setTeachingMode] = useState<StoredTeachingMode>(() =>
    defaultTeachingMode(teacher, initialLessonKind),
  );
  const [studentAddress, setStudentAddress] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [availableDays, setAvailableDays] = useState<Record<string, number>>({});
  const [slots, setSlots] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const todayIso = useMemo(() => formatLocalISODate(new Date()), []);

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

  const lessonMinutes = useMemo(() => {
    if (teachingMode !== "domicile") return 60;
    let h = (teacher.homeLessonMinDuration ?? 60) / 60;
    if (teacher.homeLessonForce2hOver20km && distanceKm !== null && distanceKm > 20) {
      h = Math.max(h, 2);
    }
    return Math.round(h * 60);
  }, [teachingMode, teacher.homeLessonMinDuration, teacher.homeLessonForce2hOver20km, distanceKm]);

  const lessonHours = lessonMinutes / 60;
  const hourlyRate = teachingMode === "domicile" ? Number(teacher.homeLessonPrice ?? 0) : teacher.pricePerLesson;
  const totalPrice = Math.round(lessonHours * hourlyRate * 100) / 100;

  const homeAvailable =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;

  const showStudio = teacher.teachingMode === "person" || teacher.teachingMode === "both";
  const showOnline = teacher.teachingMode === "online" || teacher.teachingMode === "both";

  const loadAvailableDays = useCallback(async () => {
    setLoadingDays(true);
    setDaysError(null);
    try {
      const q = new URLSearchParams({ weeks: "4", duration: String(lessonMinutes) });
      const res = await fetch(`/api/teachers/${encodeURIComponent(teacher.id)}/available-days?${q.toString()}`);
      const body = (await res.json().catch(() => ({}))) as {
        days?: Record<string, number>;
        durationMinutes?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "Impossible de charger les dates.");
      setAvailableDays(body.days ?? {});
      if (typeof body.durationMinutes === "number") setDurationMinutes(body.durationMinutes);
    } catch (e) {
      setDaysError(e instanceof Error ? e.message : "Erreur");
      setAvailableDays({});
    } finally {
      setLoadingDays(false);
    }
  }, [teacher.id, lessonMinutes]);

  const loadSlotsForDate = useCallback(
    async (dateIso: string) => {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const q = new URLSearchParams({ date: dateIso, duration: String(lessonMinutes) });
        const res = await fetch(`/api/teachers/${encodeURIComponent(teacher.id)}/slots?${q.toString()}`);
        const body = (await res.json().catch(() => ({}))) as {
          slots?: string[];
          durationMinutes?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || "Impossible de charger les créneaux.");
        setSlots(body.slots ?? []);
        if (typeof body.durationMinutes === "number") setDurationMinutes(body.durationMinutes);
      } catch (e) {
        setSlotsError(e instanceof Error ? e.message : "Erreur");
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [teacher.id, lessonMinutes],
  );

  useEffect(() => {
    setTeachingMode(defaultTeachingMode(teacher, initialLessonKind));
    setStudentAddress("");
    setStep("info");
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedLevel(null);
    setCheckoutError(null);
    setAvailableDays({});
    setSlots([]);
    setDaysError(null);
    setSlotsError(null);
  }, [teacher.id, initialLessonKind]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (step === "pickDate") void loadAvailableDays();
  }, [step, loadAvailableDays]);

  useEffect(() => {
    if (step === "pickSlot" && selectedDate) void loadSlotsForDate(selectedDate);
  }, [step, selectedDate, loadSlotsForDate]);

  const calendarCells = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const cells: { iso: string; label: string; count: number; disabled: boolean }[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = formatLocalISODate(d);
      const count = availableDays[iso] ?? 0;
      const disabled = iso < todayIso || count === 0;
      const label = d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
      cells.push({ iso, label, count, disabled });
    }
    return cells;
  }, [availableDays, todayIso]);

  const slotsByPeriod = useMemo(() => {
    const groups: { key: "matin" | "apresmidi" | "soir"; label: string; emoji: string; items: string[] }[] = [
      { key: "matin", label: "Matin", emoji: "🌅", items: [] },
      { key: "apresmidi", label: "Après-midi", emoji: "☀️", items: [] },
      { key: "soir", label: "Soir", emoji: "🌙", items: [] },
    ];
    for (const s of slots) {
      const p = periodForSlot(s);
      const g = groups.find((x) => x.key === p);
      if (g) g.items.push(s);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [slots]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [selectedDate]);

  const handleConfirmAndPay = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour réserver.");
      return;
    }
    if (!selectedDate || !selectedSlot) {
      setCheckoutError("Choisis une date et un créneau.");
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
        time: selectedSlot,
        slot_date: selectedDate,
        time_slot: selectedSlot,
        student_level: selectedLevel,
        teaching_mode: modeForDb,
        status: "pending_payment",
        price: totalPrice,
        student_address: modeForDb === "domicile" ? addressTrim : null,
      };

      const { data: inserted, error: insErr } = await supabase.from("bookings").insert(bookingData).select("id").single();
      if (insErr) {
        if ((insErr as { code?: string }).code === "23505") {
          setCheckoutError("Ce créneau vient d'être réservé.");
          return;
        }
        throw insErr;
      }
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

      if (res.status === 409) {
        setCheckoutError(payload.error || "Ce créneau vient d'être réservé.");
        return;
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  Retour
                </button>
                <button
                  type="button"
                  disabled={!selectedLevel}
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setStep("pickDate");
                  }}
                  className="flex-[2] ds-btn-primary h-11 rounded-2xl text-sm font-semibold disabled:opacity-50"
                >
                  Choisir un créneau
                </button>
              </div>
            </div>
          )}

          {step === "pickDate" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={16} /> Date
              </p>
              <p className="text-xs text-slate-500">Les 4 prochaines semaines — uniquement les jours avec places libres.</p>
              {daysError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{daysError}</div>
              ) : null}
              {loadingDays ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-[#1D9E75]" size={28} />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {calendarCells.map((cell) => (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={cell.disabled}
                      onClick={() => {
                        setSelectedDate(cell.iso);
                        setSelectedSlot(null);
                        setStep("pickSlot");
                      }}
                      className={cn(
                        "py-2.5 px-2 rounded-xl border text-left text-xs font-semibold transition-colors",
                        cell.disabled
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                          : selectedDate === cell.iso
                            ? "border-[#1D9E75] bg-[#e1f5ee] text-[#0f6e56]"
                            : "border-slate-200 hover:border-[#1D9E75]/50",
                      )}
                    >
                      <span className="block capitalize">{cell.label}</span>
                      {!cell.disabled ? (
                        <span className="text-[10px] font-bold text-[#1D9E75]">{cell.count} dispo</span>
                      ) : cell.iso < todayIso ? (
                        <span className="text-[10px] text-slate-400">Passé</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Complet</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="w-full h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                <ChevronLeft className="inline mr-1" size={16} />
                Retour
              </button>
            </div>
          )}

          {step === "pickSlot" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock size={16} /> Heure
              </p>
              {selectedDate ? (
                <p className="text-xs text-slate-500 capitalize">{formattedSelectedDate}</p>
              ) : null}
              {slotsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{slotsError}</div>
              ) : null}
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-[#1D9E75]" size={28} />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun créneau libre ce jour-là. Choisis une autre date.</p>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {slotsByPeriod.map((g) => (
                    <div key={g.key}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {g.emoji} {g.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.items.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSelectedSlot(s);
                              setStep("confirm");
                            }}
                            className={cn(
                              "py-2.5 rounded-xl border text-xs font-bold transition-colors",
                              selectedSlot === s
                                ? "border-[#1D9E75] bg-[#1D9E75] text-white"
                                : "border-slate-200 hover:border-[#1D9E75]/40",
                            )}
                          >
                            {s} · {durationMinutes} min
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pickDate")}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  Date
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-900">Récapitulatif</p>
              <div className="rounded-2xl border border-[rgba(29,158,117,0.35)] bg-[rgba(29,158,117,0.06)] p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Date</span>
                  <span className="font-semibold text-slate-900 text-right capitalize">{formattedSelectedDate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Heure</span>
                  <span className="font-semibold text-slate-900">{selectedSlot}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Durée</span>
                  <span className="font-semibold text-slate-900">{durationMinutes} min</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Montant</span>
                  <span className="font-bold text-[#1D9E75]">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ce créneau sera réservé exclusivement pour toi après paiement réussi.
              </p>
              {teachingMode === "domicile" ? (
                <div className="rounded-xl border border-[rgba(29,158,117,0.25)] bg-[rgba(29,158,117,0.06)] px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold text-[#0f6e56]">À domicile</span>
                  {lessonHours > 1 ? (
                    <span className="block mt-1">Durée facturée : {lessonHours} h (politique distance du professeur).</span>
                  ) : null}
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pickSlot")}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  Créneau
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmAndPay()}
                  className="flex-[2] h-11 rounded-2xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-md transition hover:opacity-95"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Redirection…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Payer ${totalPrice.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
