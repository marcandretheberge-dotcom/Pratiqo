"use client";

import type { Teacher } from "@/types";
import { useLocale } from "@/lib/locale-context";
import { teacherBookingActionKey } from "@/lib/teachers/bookingCapability";

export function TeacherBookingReadiness({ teacher }: { teacher: Teacher }) {
  const { t } = useLocale();
  return (
    <span className="text-xs leading-relaxed" data-booking-ready={String(teacher.bookingReady ?? "unknown")}>
      {t(teacherBookingActionKey(teacher.bookingAction))}
    </span>
  );
}
