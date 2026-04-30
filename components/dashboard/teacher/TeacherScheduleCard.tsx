"use client";

import Link from "next/link";
import { Calendar, MessageCircle } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

/** Same UUID shape as `/messages` `peer` param (student auth user id). */
const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  studentName?: string;
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
  cancelBusy,
}: {
  items: Row[];
  emptyHint: string;
  /** i18n key for the card heading (default: generic schedule). */
  titleKey?: "upcomingScheduleTitle" | "upcomingConfirmedClasses";
  /** Confirmed/booked lessons only — opens parent cancel modal. */
  onRequestCancelClass?: (bookingId: string) => void;
  /** While the cancel API runs, disables cancel buttons on all rows. */
  cancelBusy?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{t(titleKey)}</h3>
          <p className="text-xs text-slate-600">{t("scheduleCardSubtitle")}</p>
        </div>
        <Calendar size={16} className="shrink-0 text-[#00694c]" />
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-600">
          <p>{emptyHint}</p>
          <Link
            href="/teacher/schedule"
            className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-[#00694c] hover:underline"
          >
            {t("tabAvailability")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => {
            const peer = typeof b.studentUserId === "string" ? b.studentUserId.trim() : "";
            const canMessage = peer.length > 0 && PEER_UUID_RE.test(peer);
            return (
              <li key={b.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-900">{b.studentName}</span>
                  <span className="shrink-0 text-[11px] font-bold uppercase text-[#00694c]">
                    {b.time_slot || b.time}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-600">{b.slot_date || b.date}</p>
                {canMessage ? (
                  <Link
                    href={`/messages?peer=${encodeURIComponent(peer)}`}
                    className="mt-2 inline-flex w-full min-h-[40px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#00694c] shadow-sm transition-colors hover:border-[#00694c]/40 hover:bg-[#00694c]/[0.06]"
                  >
                    <MessageCircle size={14} className="shrink-0 opacity-90" aria-hidden />
                    {t("messageStudent")}
                  </Link>
                ) : null}
                {onRequestCancelClass ? (
                  <button
                    type="button"
                    onClick={() => onRequestCancelClass(b.id)}
                    disabled={Boolean(cancelBusy)}
                    className="mt-2 inline-flex w-full min-h-[44px] items-center justify-center rounded-lg border-2 border-rose-600/90 bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
                  >
                    {t("cancelClass")}
                  </button>
                ) : null}
                {onRequestCancelClass ? (
                  <Link
                    href="/legal/annulation"
                    className="mt-1 block text-center text-[11px] font-semibold uppercase tracking-wide text-[#00694c]/80 hover:underline"
                  >
                    {t("viewCancellationPolicy")}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
