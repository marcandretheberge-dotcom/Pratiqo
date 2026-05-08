"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import {
  isSupportCaseCategory,
  supportCategoryLabelKey,
  supportStatusLabelKey,
  type SupportCaseCategory,
} from "@/lib/supportCases";

type SupportCaseRow = {
  id: string;
  booking_id: string | null;
  category: string;
  status: string;
  description: string;
  created_at: string;
  payout_hold?: boolean | null;
};

type BookingSummary = {
  id: string;
  date?: string | null;
  time?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
  teacherName?: string | null;
  studentName?: string | null;
};

export default function ResolutionCenterPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<SupportCaseRow[]>([]);
  const [bookings, setBookings] = useState<Map<string, BookingSummary>>(new Map());

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("support_cases")
        .select("id, booking_id, category, status, description, created_at, payout_hold")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as SupportCaseRow[];
      const bookingIds = Array.from(new Set(rows.map((row) => row.booking_id).filter(Boolean))) as string[];
      const bookingMap = new Map<string, BookingSummary>();
      if (bookingIds.length) {
        const { data: bookingRows } = await supabase
          .from("bookings")
          .select("id, date, time, slot_date, time_slot, teacher_id, student_id")
          .in("id", bookingIds);
        for (const booking of (bookingRows ?? []) as Array<{
          id: string;
          date?: string | null;
          time?: string | null;
          slot_date?: string | null;
          time_slot?: string | null;
          teacher_id?: string | null;
          student_id?: string | null;
        }>) {
          bookingMap.set(booking.id, {
            id: booking.id,
            date: booking.slot_date ?? booking.date ?? null,
            time: booking.time_slot ?? booking.time ?? null,
            teacher_id: booking.teacher_id ?? null,
            student_id: booking.student_id ?? null,
          });
        }

        await Promise.all(
          Array.from(bookingMap.values()).map(async (booking) => {
            if (booking.teacher_id) {
              const { data: teacher } = await supabase
                .from("teachers")
                .select("name")
                .eq("id", booking.teacher_id)
                .maybeSingle();
              booking.teacherName = (teacher as { name?: string | null } | null)?.name ?? null;
            }
            if (booking.student_id) {
              const { data: student } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", booking.student_id)
                .maybeSingle();
              booking.studentName = (student as { name?: string | null } | null)?.name ?? null;
            }
          }),
        );
      }
      if (!cancelled) {
        setCases(rows);
        setBookings(bookingMap);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="rounded-3xl bg-[#0F6E56] p-6 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white">
          <ArrowLeft size={16} />
          {t("dashboard")}
        </Link>
        <h1 className="text-2xl font-bold">{t("resolutionCenterTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/82">{t("resolutionCenterSubtitle")}</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-[#DCEAE3] bg-white p-12 text-sm font-semibold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-[#0F6E56]" />
          {t("loading")}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DCEAE3] bg-white p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-[#0F6E56]" />
          <p className="mt-3 text-sm font-semibold text-slate-700">{t("supportCaseNoCases")}</p>
          <Link href="/dashboard" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#0F6E56] px-5 text-sm font-bold text-white">
            {t("dashboard")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => {
            const booking = item.booking_id ? bookings.get(item.booking_id) : null;
            const category = isSupportCaseCategory(item.category) ? item.category : ("other" as SupportCaseCategory);
            return (
              <li key={item.id} className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0F6E56]">
                      {t(supportCategoryLabelKey(category))}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{item.description}</p>
                    {booking ? (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {[booking.teacherName, booking.studentName, booking.date, booking.time].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {item.payout_hold ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700">{t("payoutHeldDueToSupportCase")}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <span className="rounded-full bg-[#F3FAF6] px-3 py-1 text-xs font-bold text-[#0F6E56]">
                      {t(supportStatusLabelKey(item.status))}
                    </span>
                    <Link href={`/resolution/${item.id}`} className="text-xs font-bold text-[#0F6E56] hover:underline">
                      {t("supportCaseViewDetails")}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
