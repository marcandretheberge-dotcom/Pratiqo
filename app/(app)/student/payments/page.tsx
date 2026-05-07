"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, CreditCard, Loader2, ReceiptText } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { useLocale } from "../../../../lib/locale-context";

type BookingRow = {
  id: string;
  teacher_id: string | null;
  status: string | null;
  date: string | null;
  time: string | null;
  slot_date: string | null;
  time_slot: string | null;
  price: number | string | null;
  created_at: string | null;
};

type PaymentRow = {
  booking_id: string;
  amount_cents: number | null;
  currency: string | null;
  payment_status: string | null;
  transfer_status: string | null;
  paid_at: string | null;
};

type TeacherRow = {
  id: string;
  name: string | null;
  discipline: string | null;
};

type PaymentItem = {
  booking: BookingRow;
  payment: PaymentRow | null;
  teacher: TeacherRow | null;
};

function paymentStatusKey(status: string | null | undefined): "paymentStatusPaid" | "paymentStatusPending" | "paymentStatusRefunded" {
  if (status === "paid") return "paymentStatusPaid";
  if (status === "refunded") return "paymentStatusRefunded";
  return "paymentStatusPending";
}

function fallbackAmountCents(booking: BookingRow): number {
  const dollars = Number(booking.price ?? 0);
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0;
}

export default function StudentPaymentsPage() {
  const { user, profile } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentItem[]>([]);

  useEffect(() => {
    if (profile?.role === "teacher") {
      router.replace("/dashboard");
    }
  }, [profile?.role, router]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseClient();

    const load = async () => {
      setLoading(true);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, teacher_id, status, date, time, slot_date, time_slot, price, created_at")
        .eq("student_id", user.id)
        .in("status", ["pending_payment", "confirmed", "completed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (cancelled) return;

      const bookingRows = ((bookings ?? []) as BookingRow[]).filter((row) => row.id);
      if (!bookingRows.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const bookingIds = bookingRows.map((row) => row.id);
      const teacherIds = Array.from(new Set(bookingRows.map((row) => row.teacher_id).filter(Boolean))) as string[];

      const [{ data: payments }, { data: teachers }] = await Promise.all([
        supabase
          .from("booking_payments")
          .select("booking_id, amount_cents, currency, payment_status, transfer_status, paid_at")
          .in("booking_id", bookingIds),
        teacherIds.length
          ? supabase.from("teachers").select("id, name, discipline").in("id", teacherIds)
          : Promise.resolve({ data: [] as TeacherRow[] }),
      ]);

      if (cancelled) return;

      const paymentByBooking = new Map<string, PaymentRow>(
        ((payments ?? []) as PaymentRow[]).map((payment) => [payment.booking_id, payment]),
      );
      const teacherById = new Map<string, TeacherRow>(
        ((teachers ?? []) as TeacherRow[]).map((teacher) => [teacher.id, teacher]),
      );

      setItems(
        bookingRows.map((booking) => ({
          booking,
          payment: paymentByBooking.get(booking.id) ?? null,
          teacher: booking.teacher_id ? teacherById.get(booking.teacher_id) ?? null : null,
        })),
      );
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "fr" ? "fr-CA" : locale === "es" ? "es-UY" : "en-CA", {
        style: "currency",
        currency: "CAD",
      }),
    [locale],
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">{t("bookingLoginAlert")}</p>
          <Link href="/login?next=/student/payments" className="mt-4 inline-flex rounded-2xl bg-[#1D9E75] px-5 py-3 text-sm font-bold text-white">
            {t("signIn")}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <section className="rounded-3xl bg-[#0F6E56] p-6 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <CreditCard size={24} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{t("profilePayments")}</p>
            <h1 className="mt-1 text-2xl font-bold">{t("studentPaymentsTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/82">{t("studentPaymentsSubtitle")}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--p-border-light)] bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#1D9E75]" />
            {t("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E1F5EE] text-[#0F6E56]">
              <ReceiptText size={26} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{t("studentPaymentsEmpty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--p-border-light)]">
            {items.map(({ booking, payment, teacher }) => {
              const date = booking.slot_date || booking.date || "";
              const time = booking.time_slot || booking.time || "";
              const amountCents = payment?.amount_cents ?? fallbackAmountCents(booking);
              const currency = (payment?.currency || "cad").toUpperCase();
              const amount = formatter.format(amountCents / 100).replace("CA$", "$");
              return (
                <article key={booking.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{teacher?.name ?? t("bookingFallbackTeacherName")}</p>
                      <span className="rounded-full bg-[#E1F5EE] px-2.5 py-1 text-[11px] font-bold text-[#0F6E56]">
                        {t(paymentStatusKey(payment?.payment_status))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {teacher?.discipline ?? t("bookingFallbackDiscipline")}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Calendar size={13} />
                      {[date, time].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-[#0F6E56]">{amount}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{currency}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--p-border-light)] text-slate-500 hover:bg-slate-50"
                      aria-label={t("bookingViewMyLessons")}
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="px-2 text-xs text-slate-500">
        {t("stripePortalUnavailable")}
      </p>
    </div>
  );
}
