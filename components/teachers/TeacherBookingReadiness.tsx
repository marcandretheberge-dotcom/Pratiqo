"use client";

import type { Teacher } from "@/types";
import { useLocale } from "@/lib/locale-context";

export function TeacherBookingReadiness({ teacher }: { teacher: Teacher }) {
  const { t } = useLocale();
  return (
    <span className="text-xs leading-relaxed" data-booking-ready={String(teacher.bookingReady ?? "unknown")}>
      {t(teacher.bookingReady === true ? "teacherBookingReady" :
        teacher.bookingReady === false ? "teacherBookingUnavailable" : "teacherBookingUnknown")}
    </span>
  );
}
