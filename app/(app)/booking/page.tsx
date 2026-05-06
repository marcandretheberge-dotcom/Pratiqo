"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Teacher } from "../../../types";
import { getSupabaseClient } from "../../../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../../../lib/teacherMapper";
import { TEACHERS_PUBLIC_TABLE } from "../../../lib/supabase/queries";
import { TEACHERS } from "../../../constants";
import { BookingModal } from "../../../components/BookingModal";
import { cn } from "../../../lib/utils";
import { useLocale } from "../../../lib/locale-context";
import { useSearchParams } from "next/navigation";

export default function BookingPage() {
  const { t } = useLocale();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase.from(TEACHERS_PUBLIC_TABLE).select("*").order("id");
      if (error || !data?.length) {
        setTeachers(TEACHERS);
        return;
      }
      setTeachers(data.map((r) => teacherRowToTeacher(r as TeacherRow)));
    };

    void load();

    const channel = supabase
      .channel("booking-page-teachers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const paymentState = searchParams.get("payment");
  const banner = useMemo(() => {
    if (paymentState === "success") return { kind: "success" as const, text: t("paymentSuccess") };
    if (paymentState === "cancel") return { kind: "error" as const, text: t("paymentCancelled") };
    return null;
  }, [paymentState]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ds-label text-[var(--p-text-subtle)]">{t("bookPageLabel")}</p>
            <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">{t("bookPageTitle")}</h2>
            <p className="text-[14px] text-[var(--p-text-muted)]">
              {t("bookPageSubtitle")}
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={cn(
              "p-4 rounded-2xl border text-sm font-semibold",
              banner.kind === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-rose-50 border-rose-100 text-rose-800",
            )}
          >
            {banner.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <button
              key={teacher.id}
              onClick={() => setBookingTeacher(teacher)}
              className="text-left ds-card p-5 hover:shadow-[0_22px_70px_rgba(15,110,86,0.12)] transition-all"
            >
              <div className="flex items-center gap-4">
                <img
                  src={teacher.imageUrl}
                  alt={teacher.name}
                  className="w-14 h-14 rounded-[14px] object-cover border border-[var(--p-light-teal-bg)]"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <span className="ds-pill">{teacher.category}</span>
                  <p className="text-[16px] font-medium text-[var(--p-text)] truncate mt-2">{teacher.name}</p>
                  <p className="text-[13px] text-[var(--p-text-muted)] truncate">{teacher.discipline}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--p-light-teal-bg)] flex items-center justify-between">
                <span className="text-[18px] font-medium text-[var(--p-text)]">${teacher.pricePerLesson}</span>
                <span className="ds-btn-primary text-sm h-9 px-5 flex items-center">{t("bookCta")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {bookingTeacher && (
        <BookingModal teacher={bookingTeacher} onClose={() => setBookingTeacher(null)} />
      )}
    </>
  );
}
