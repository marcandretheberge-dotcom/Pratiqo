"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CreditCard, ExternalLink, Loader2, ReceiptText } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { useLocale } from "../../../../lib/locale-context";
import type { TranslationKey } from "@/lib/translations";

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
  refunded_at?: string | null;
  refund_status?: string | null;
  stripe_receipt_url?: string | null;
  receipt_number?: string | null;
  receipt_issued_at?: string | null;
  tax_behavior?: "not_collected" | string | null;
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

function paymentStatusKey(
  status: string | null | undefined,
): "paymentStatusPaid" | "paymentStatusPending" | "paymentStatusRefunded" | "paymentStatusFailed" {
  if (status === "paid") return "paymentStatusPaid";
  if (status === "refunded" || status === "partially_refunded") return "paymentStatusRefunded";
  if (status === "failed" || status === "cancelled" || status === "disputed") return "paymentStatusFailed";
  return "paymentStatusPending";
}

function fallbackAmountCents(booking: BookingRow): number {
  const dollars = Number(booking.price ?? 0);
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0;
}

function renderReceiptAction(
  payment: PaymentRow | null,
  isPaid: boolean,
  t: (key: TranslationKey) => string,
) {
  const receiptUrl = payment?.stripe_receipt_url?.trim() ?? "";
  const receiptNumber = payment?.receipt_number?.trim() ?? "";

  if (receiptUrl) {
    return (
      <a
        href={receiptUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#1D9E75]/35 bg-[#F3FAF6] px-4 text-xs font-bold text-[#1D9E75] transition hover:border-[#1D9E75]/55 hover:bg-teal-50"
      >
        <ReceiptText size={16} aria-hidden />
        {t("studentPaymentsViewReceipt")}
        <ExternalLink size={14} className="opacity-70" aria-hidden />
      </a>
    );
  }

  if (receiptNumber) {
    return (
      <div className="min-w-[9.5rem] rounded-2xl border border-[#DCEAE3] bg-slate-50/90 px-3 py-2.5 text-right">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("studentPaymentsPratiqoReceipt")}</p>
        <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800">{receiptNumber}</p>
      </div>
    );
  }

  if (isPaid) {
    return (
      <span className="inline-flex min-h-10 max-w-[12rem] items-center justify-center rounded-full border border-amber-100 bg-amber-50 px-3 text-center text-xs font-semibold leading-snug text-amber-900">
        {t("studentPaymentsPratiqoReceiptPending")}
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-500">
      {t("studentPaymentsReceiptUnavailable")}
    </span>
  );
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
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
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
          .select(
            "booking_id, amount_cents, currency, payment_status, transfer_status, paid_at, refunded_at, refund_status, stripe_receipt_url, receipt_number, receipt_issued_at, tax_behavior",
          )
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
          <Link href="/login?next=/student/payments" className="mt-4 inline-flex rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white">
            {t("signIn")}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <Link
          href="/profile"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DCEAE3] bg-white px-4 text-sm font-semibold text-[#1D9E75] shadow-sm transition hover:border-[#1D9E75]/35 hover:bg-[#F3FAF6]"
        >
          <ArrowLeft size={18} aria-hidden />
          {t("studentPaymentsBackToProfile")}
        </Link>
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <CreditCard size={24} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{t("profilePayments")}</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">{t("studentPaymentsTitle")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t("studentPaymentsSubtitle")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
            {t("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ReceiptText size={26} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{t("studentPaymentsEmpty")}</p>
          </div>
        ) : (
          <div className="space-y-3 p-1">
            {items.map(({ booking, payment, teacher }) => {
              const date = booking.slot_date || booking.date || "";
              const time = booking.time_slot || booking.time || "";
              const amountCents = payment?.amount_cents ?? fallbackAmountCents(booking);
              const currency = (payment?.currency || "cad").toUpperCase();
              const amount = formatter.format(amountCents / 100).replace("CA$", "$");
              const statusKey = paymentStatusKey(payment?.payment_status);
              const isPaid = statusKey === "paymentStatusPaid";
              const isRefunded = statusKey === "paymentStatusRefunded";
              const isFailed = statusKey === "paymentStatusFailed";
              return (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-[#DCEAE3] bg-[#FAFCFB] p-4 shadow-[0_2px_12px_rgba(29,158,117,0.06)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{teacher?.name ?? t("bookingFallbackTeacherName")}</p>
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                          isPaid ? "bg-teal-50 text-[#1D9E75]" : "",
                          isRefunded ? "bg-slate-100 text-slate-700" : "",
                          isFailed ? "bg-rose-50 text-rose-700" : "",
                          !isPaid && !isRefunded && !isFailed ? "bg-amber-50 text-amber-800" : "",
                        ].join(" ")}
                      >
                          {t(statusKey)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {teacher?.discipline ?? t("bookingFallbackDiscipline")}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Calendar size={13} />
                        {[date, time].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {payment?.tax_behavior === "not_collected" ? (
                        <p className="mt-2 text-xs text-slate-400">{t("studentPaymentsTaxNotCollected")}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-stretch gap-3 sm:items-end sm:shrink-0">
                      <div className="text-left sm:text-right">
                        <p
                          className={[
                            "text-lg font-bold tabular-nums",
                            isFailed ? "text-rose-700" : isRefunded ? "text-slate-700" : "text-[#1D9E75]",
                          ].join(" ")}
                        >
                          {amount}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{currency}</p>
                      </div>
                      {renderReceiptAction(payment, isPaid, t)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
