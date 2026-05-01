"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MessageCircle, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

/** Same UUID shape as `/messages` `peer` param (student auth user id). */
const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TeacherScheduleRow = {
  id: string;
  studentName?: string;
  studentPhotoUrl?: string | null;
  /** `bookings.student_id` → profile/auth user UUID for messaging. */
  studentUserId?: string | null;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
};

export function TeacherScheduleCard({
  items,
  emptyHint,
  titleKey = "upcomingScheduleTitle",
  onRequestCancelClass,
  onOpenReschedule,
  cancelBusy,
}: {
  items: TeacherScheduleRow[];
  emptyHint: string;
  /** i18n key for the card heading (default: generic schedule). */
  titleKey?: "upcomingScheduleTitle" | "upcomingConfirmedClasses";
  /** Confirmed/booked lessons only — opens parent cancel modal. */
  onRequestCancelClass?: (bookingId: string) => void;
  /** Opens “change class” flow (modal → message / cancel). */
  onOpenReschedule?: (bookingId: string) => void;
  /** While the cancel API runs, disables actions. */
  cancelBusy?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const relationshipMode = Boolean(onRequestCancelClass && onOpenReschedule);

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-[0_8px_40px_rgba(44,44,42,0.06)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#526056]">{t(titleKey)}</h3>
          <p className="mt-0.5 text-xs text-[#6B6760]">{t("scheduleCardSubtitle")}</p>
        </div>
        <Calendar size={18} className="shrink-0 text-[#0F6E56]" aria-hidden />
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#6B6760]">
          <p>{emptyHint}</p>
          <Link
            href="/teacher/schedule"
            className="mt-4 inline-block text-xs font-semibold text-[#0F6E56] underline-offset-2 hover:underline"
          >
            {t("tabAvailability")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((b) => {
            const peer = typeof b.studentUserId === "string" ? b.studentUserId.trim() : "";
            const canMessage = peer.length > 0 && PEER_UUID_RE.test(peer);
            const messagesHref = canMessage ? `/messages?peer=${encodeURIComponent(peer)}` : "/messages";
            const photoUrl = b.studentPhotoUrl?.trim();

            return (
              <li
                key={b.id}
                className="rounded-2xl border border-[#F1EFE8] bg-white p-4 sm:p-5"
              >
                <div className="flex gap-3 sm:gap-4">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-full border border-[#0F6E56]/20 object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#1D9E75,#0f6e56)" }}
                      aria-hidden
                    >
                      {(b.studentName || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#2C2C2A]">{b.studentName}</p>
                    <p className="mt-0.5 text-sm text-[#6B6760]">{b.slot_date || b.date}</p>
                    <p className="mt-0.5 text-sm font-medium text-[#0F6E56]">{b.time_slot || b.time}</p>
                  </div>
                </div>

                {relationshipMode ? (
                  <div className="mt-4 flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(messagesHref)}
                      disabled={Boolean(cancelBusy) || !canMessage}
                      className={cn(
                        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition",
                        "bg-[#0F6E56] hover:bg-[#0c5a47] disabled:cursor-not-allowed disabled:opacity-45",
                        "sm:h-11 sm:min-h-0 sm:w-auto sm:flex-1 sm:min-w-[160px] sm:py-0",
                      )}
                    >
                      <MessageCircle className="h-[18px] w-[18px] shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
                      {t("messageStudent")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReschedule?.(b.id)}
                      disabled={Boolean(cancelBusy)}
                      className={cn(
                        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#0F6E56]/35 bg-white px-4 py-3 text-sm font-semibold text-[#0F6E56] transition hover:bg-[#0F6E56]/[0.06] disabled:opacity-50",
                        "sm:h-11 sm:min-h-0 sm:w-auto sm:flex-1 sm:min-w-[160px] sm:py-0",
                      )}
                    >
                      <CalendarClock className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                      {t("rescheduleClass")}
                    </button>
                  </div>
                ) : canMessage ? (
                  <button
                    type="button"
                    onClick={() => router.push(messagesHref)}
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47] sm:min-h-0 sm:h-11 sm:py-0"
                  >
                    <MessageCircle className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                    {t("messageStudent")}
                  </button>
                ) : null}

                {relationshipMode ? (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[#F1EFE8] pt-3">
                    <Link
                      href="/legal/annulation"
                      className="text-xs font-medium text-[#0F6E56]/85 underline-offset-2 hover:underline"
                    >
                      {t("viewCancellationPolicy")}
                    </Link>
                    {onRequestCancelClass ? (
                      <button
                        type="button"
                        onClick={() => onRequestCancelClass(b.id)}
                        disabled={Boolean(cancelBusy)}
                        className="self-start text-left text-xs font-medium text-rose-700/70 underline-offset-2 transition hover:text-rose-800 hover:underline disabled:opacity-50"
                      >
                        {t("cancelThisClass")}
                      </button>
                    ) : null}
                  </div>
                ) : onRequestCancelClass ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onRequestCancelClass(b.id)}
                      disabled={Boolean(cancelBusy)}
                      className="mt-3 text-left text-xs font-medium text-rose-700/70 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {t("cancelThisClass")}
                    </button>
                    <Link
                      href="/legal/annulation"
                      className="mt-1 inline-block text-xs font-medium text-[#0F6E56]/80 hover:underline"
                    >
                      {t("viewCancellationPolicy")}
                    </Link>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
