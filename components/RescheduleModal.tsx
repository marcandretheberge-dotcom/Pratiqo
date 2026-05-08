"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, MessageSquare, X } from "lucide-react";
import { formatLocalISODate } from "@/lib/slots";
import { cn } from "@/lib/utils";

export type RescheduleModalBooking = {
  id: string;
  slotDate: string;
  timeSlot?: string | null;
  price: number;
  otherPartyName: string;
  otherPartyId: string;
  durationMinutes?: number | null;
};

export type RescheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  booking: RescheduleModalBooking;
  userRole: "student" | "teacher";
  currentUserName: string;
  onCancelLesson: () => void;
};

/** Local lesson start from YYYY-MM-DD + optional "14h30" slot label. */
export function parseLessonStart(slotDate: string, timeSlot?: string | null): Date | null {
  const raw = slotDate?.trim() ?? "";
  const parts = raw.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const t = (timeSlot || "9h00").trim();
  const m = /^(\d{1,2})h(\d{2})$/.exec(t);
  let hh = 9;
  let mm = 0;
  if (m) {
    hh = Number(m[1]);
    mm = Number(m[2]);
  } else {
    const colon = /^(\d{1,2}):(\d{2})/.exec(t);
    if (colon) {
      hh = Number(colon[1]);
      mm = Number(colon[2]);
    }
  }
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
}

/** Lowercase phrasing for inside email drafts ("aujourd'hui à 18h", "demain à 14h", "vendredi 8 mai à 14h"). */
export function formatLessonDay(slotDate: string, timeSlot?: string | null): string {
  const start = parseLessonStart(slotDate, timeSlot);
  if (!start || Number.isNaN(start.getTime())) return "à une date à confirmer";

  const ymd = formatLocalISODate(start);
  const todayStr = formatLocalISODate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalISODate(tomorrow);

  const hh = start.getHours();
  const mm = start.getMinutes();
  const clock = mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, "0")}`;

  if (ymd === todayStr) return `aujourd'hui à ${clock}`;
  if (ymd === tomorrowStr) return `demain à ${clock}`;

  const dtf = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" });
  const datePart = dtf.format(start);
  return `${datePart} à ${clock}`;
}

/** Title case weekday for modal header ("Vendredi 8 mai à 14h"). */
function formatDisplayLessonLong(slotDate: string, timeSlot?: string | null): string {
  const start = parseLessonStart(slotDate, timeSlot);
  if (!start || Number.isNaN(start.getTime())) return "—";
  const hh = start.getHours();
  const mm = start.getMinutes();
  const clock = mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, "0")}`;
  const dtf = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" });
  const datePart = dtf.format(start);
  const cap = datePart.charAt(0).toLocaleUpperCase("fr-CA") + datePart.slice(1);
  return `${cap} à ${clock}`;
}

export function generateRescheduleDraft({
  booking,
  userRole,
  currentUserName,
}: {
  booking: RescheduleModalBooking;
  userRole: "student" | "teacher";
  currentUserName: string;
}): string {
  const when = formatLessonDay(booking.slotDate, booking.timeSlot);
  const name = booking.otherPartyName;
  if (userRole === "student") {
    return `Bonjour ${name},

Je dois malheureusement reprogrammer notre cours prévu ${when}. Pourrions-nous trouver un autre créneau qui vous conviendrait ?

Je suis disponible :
- 
- 
- 

Merci de votre compréhension !
${currentUserName}`;
  }
  return `Bonjour ${name},

Je dois malheureusement reprogrammer notre cours prévu ${when}. Voici quelques créneaux disponibles que je vous propose :

- 
- 
- 

Si aucun ne vous convient, n'hésitez pas à m'en proposer d'autres. Merci de votre compréhension !
${currentUserName}`;
}

export function RescheduleModal({
  isOpen,
  onClose,
  booking,
  userRole,
  currentUserName,
  onCancelLesson,
}: RescheduleModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const lessonStart = parseLessonStart(booking.slotDate, booking.timeSlot);
  const hoursUntil =
    lessonStart && !Number.isNaN(lessonStart.getTime())
      ? (lessonStart.getTime() - Date.now()) / (1000 * 60 * 60)
      : NaN;

  const priceFmt = new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(Number(booking.price) || 0);

  const handleSendMessage = () => {
    const draft = generateRescheduleDraft({ booking, userRole, currentUserName });
    const peer = booking.otherPartyId.trim();
    const q = new URLSearchParams();
    if (peer) q.set("peer", peer);
    q.set("draft", draft);
    router.push(`/messages?${q.toString()}`);
    onClose();
  };

  const lessonLineCaseA = formatDisplayLessonLong(booking.slotDate, booking.timeSlot);
  const lessonLineCaseB = formatLessonDay(booking.slotDate, booking.timeSlot);
  const capCaseB = lessonLineCaseB.charAt(0).toLocaleUpperCase("fr-CA") + lessonLineCaseB.slice(1);

  const node = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "relative z-[201] w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-6",
          "max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <h2 id={titleId} className="pr-10 text-lg font-bold tracking-tight text-slate-900">
          Reprogrammer ce cours
        </h2>

        {Number.isNaN(hoursUntil) || !lessonStart ? (
          <div id={descId} className="mt-4 space-y-4">
            <p className="text-sm text-slate-700">Impossible de lire la date de ce cours.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              Fermer
            </button>
          </div>
        ) : hoursUntil < 0 ? (
          <div id={descId} className="mt-4 space-y-5">
            <p className="text-sm leading-relaxed text-slate-700">
              Ce cours est déjà passé. Vous ne pouvez plus le reprogrammer.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              Fermer
            </button>
          </div>
        ) : hoursUntil > 24 ? (
          <div id={descId} className="mt-4 space-y-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Cours :</span> {lessonLineCaseA} — {priceFmt} — avec{" "}
              <span className="font-semibold text-slate-900">{booking.otherPartyName}</span>
            </p>
            <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
              <p>Vous êtes à plus de 24h du cours.</p>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">1️⃣ Annuler et rebooker</p>
              <p className="text-[13px] leading-relaxed">
                Annulez ce cours (remboursement 100%) puis choisissez un nouveau créneau qui vous convient.
              </p>
              <button
                type="button"
                onClick={() => {
                  onCancelLesson();
                }}
                className="w-full rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Annuler ce cours
              </button>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                2️⃣ S&apos;entendre avec {booking.otherPartyName}
              </p>
              <p className="text-[13px] leading-relaxed">
                Discutez ensemble pour convenir d&apos;un autre créneau, sans frais supplémentaire.
              </p>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                💬 Envoyer un message
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Garder le cours
            </button>
          </div>
        ) : (
          <div id={descId} className="mt-4 space-y-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Cours :</span> {capCaseB} — {priceFmt} — avec{" "}
              <span className="font-semibold text-slate-900">{booking.otherPartyName}</span>
            </p>
            <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <p>⚠️ Il reste moins de 24h avant votre cours.</p>
            </div>
            <p className="text-[13px] leading-relaxed">
              Selon notre politique, l&apos;annulation à ce stade ne donne pas droit au remboursement automatique.
            </p>
            <div className="space-y-3 rounded-2xl border-2 border-teal-500/40 bg-emerald-50/50 p-4">
              <p className="text-[13px] font-semibold leading-relaxed text-slate-900">
                Solution recommandée : envoyez un message à {booking.otherPartyName}. Si vous vous entendez sur un
                nouveau créneau, contactez ensuite{" "}
                <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
                  support@pratiqo.ca
                </a>{" "}
                avec la date confirmée pour qu&apos;on mette votre réservation à jour.
              </p>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                💬 Envoyer un message à {booking.otherPartyName}
              </button>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => onCancelLesson()}
                className="self-start text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              >
                Annuler quand même
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200/90 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Garder le cours
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
