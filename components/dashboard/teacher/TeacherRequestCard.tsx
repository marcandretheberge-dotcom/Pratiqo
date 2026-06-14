"use client";

import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";

type PendingBooking = {
  id: string;
  studentName?: string;
  status?: string;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
};

/**
 * Renders a teacher-side "incoming request" card with a hard-red
 * "Refuser" button.
 *
 * IMPORTANT — production guard:
 * This component must ONLY ever be rendered for bookings that
 * genuinely require manual teacher approval (a future "pending" or
 * "pending_teacher" status). It must NEVER be rendered for
 * "pending_payment" (the student is mid-Stripe-Checkout — the teacher
 * has nothing to approve and a "Refuser" mid-flow would corrupt the
 * booking) or for "confirmed"/"completed" rows (those have their own
 * proper cancellation flow inside `TeacherScheduleCard`).
 *
 * The visibility guard lives in `components/Dashboard.tsx`'s
 * `pendingList` filter — see migration 030_cleanup_booked_status.sql
 * for the schema rationale and `tests/bookings/teacherConfirmedBookingActionVisibility.test.ts`
 * for the regression coverage.
 */
export function TeacherRequestCard({
  booking,
  disciplineLabel,
  action,
  onDecline,
}: {
  booking: PendingBooking;
  disciplineLabel: string;
  action?: "declining";
  onDecline: () => void;
}) {
  const { t } = useLocale();
  const isDeclining = action === "declining";
  const isBusy = Boolean(action);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,var(--palette-teal-500))" }}
        >
          {(booking.studentName || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{booking.studentName}</p>
          <p className="text-xs text-slate-600">{disciplineLabel}</p>
          <p className="text-xs text-slate-600">
            {booking.slot_date || booking.date} · {booking.time_slot || booking.time}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={onDecline}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full border-2 border-[#ba1a1a] bg-white px-4 text-xs font-bold text-[#ba1a1a] transition-colors",
            isBusy
              ? "cursor-not-allowed border-slate-200 text-slate-400"
              : "hover:bg-[#ffdad6]",
          )}
        >
          {isDeclining ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          {t("declineButton")}
        </button>
      </div>
    </li>
  );
}
