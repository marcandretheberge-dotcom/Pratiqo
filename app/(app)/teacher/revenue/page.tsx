"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleDollarSign, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { formatAccountingDisplay } from "@/lib/currency/format";

/**
 * Accounting currency for all teacher money on Pratiqo.
 * Stripe charges, the booking_payments ledger, the platform commission,
 * teacher payouts, and tax reporting are all calculated and settled in CAD.
 * The viewer's selected display currency only powers the optional
 * "≈ {currency} {amount}" secondary line — it never replaces the CAD truth.
 */
const ACCOUNTING_CURRENCY = "CAD";

type TeacherRow = { id: string };

type BookingRow = {
  id: string;
  student_id: string | null;
  date: string | null;
  time: string | null;
  slot_date: string | null;
  time_slot: string | null;
  status: string | null;
  created_at: string | null;
};

type BookingPaymentRow = {
  booking_id: string;
  amount_cents: number | null;
  platform_fee_cents: number | null;
  teacher_net_cents: number | null;
  currency: string | null;
  payment_status: string | null;
  transfer_status: string | null;
  paid_at: string | null;
  stripe_transfer_id: string | null;
};

type StudentRow = { id: string; name: string | null };

type TxRow = {
  booking: BookingRow;
  payment: BookingPaymentRow | null;
  student: StudentRow | null;
};

function cents(n: number | null | undefined): number {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

function paymentStatusKey(status: string | null | undefined) {
  if (status === "paid") return "paymentStatusPaid";
  if (status === "refunded" || status === "partially_refunded") return "paymentStatusRefunded";
  if (status === "disputed") return "paymentStatusDisputed";
  if (status === "failed" || status === "cancelled") return "paymentStatusFailed";
  return "paymentStatusPending";
}

function transferStatusKey(status: string | null | undefined) {
  if (status === "ready") return "transferStatusReady";
  if (status === "transferred") return "transferStatusTransferred";
  if (status === "failed") return "transferStatusFailed";
  if (status === "reversed") return "transferStatusReversed";
  return "transferStatusNotReady";
}

function classStatusPill(kind: "good" | "warn" | "bad" | "muted"): string {
  if (kind === "good") return "bg-teal-50 text-teal-700";
  if (kind === "warn") return "bg-amber-50 text-amber-800";
  if (kind === "bad") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function paymentPillKind(status: string | null | undefined): "good" | "warn" | "bad" | "muted" {
  if (status === "paid") return "good";
  if (status === "refunded" || status === "partially_refunded") return "muted";
  if (status === "disputed") return "warn";
  if (status === "failed" || status === "cancelled") return "bad";
  return "warn";
}

function transferPillKind(status: string | null | undefined): "good" | "warn" | "bad" | "muted" {
  if (status === "transferred") return "good";
  if (status === "ready") return "warn";
  if (status === "failed") return "bad";
  if (status === "reversed") return "muted";
  return "warn";
}

export default function TeacherRevenuePage() {
  const { user, profile } = useAuth();
  const { t, locale, currency: displayCurrency } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxRow[]>([]);

  const isTeacher = (profile?.role as string | undefined) === "teacher";

  useEffect(() => {
    if (!user) return;
    if (!isTeacher) {
      router.replace("/dashboard");
    }
  }, [isTeacher, router, user]);

  useEffect(() => {
    if (!user?.id || !isTeacher) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseClient();

    const load = async () => {
      setLoading(true);

      const { data: trow } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      const teacherId = (trow as TeacherRow | null)?.id ?? null;
      if (!teacherId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      // Fetch recent bookings and join payment ledger + student names client-side.
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, student_id, date, time, slot_date, time_slot, status, created_at")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(80);

      if (cancelled) return;
      const bookingRows = ((bookings ?? []) as BookingRow[]).filter((b) => Boolean(b.id));
      if (!bookingRows.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const bookingIds = bookingRows.map((b) => b.id);
      const studentIds = Array.from(new Set(bookingRows.map((b) => b.student_id).filter(Boolean))) as string[];

      const [{ data: payments }, { data: students }] = await Promise.all([
        supabase
          .from("booking_payments")
          .select(
            "booking_id, amount_cents, platform_fee_cents, teacher_net_cents, currency, payment_status, transfer_status, paid_at, stripe_transfer_id",
          )
          .in("booking_id", bookingIds),
        studentIds.length
          ? supabase.from("profiles").select("id, name").in("id", studentIds)
          : Promise.resolve({ data: [] as StudentRow[] }),
      ]);

      if (cancelled) return;

      const paymentByBooking = new Map<string, BookingPaymentRow>(
        ((payments ?? []) as BookingPaymentRow[]).map((p) => [p.booking_id, p]),
      );
      const studentById = new Map<string, StudentRow>(((students ?? []) as StudentRow[]).map((s) => [s.id, s]));

      const merged: TxRow[] = bookingRows.map((b) => ({
        booking: b,
        payment: paymentByBooking.get(b.id) ?? null,
        student: b.student_id ? studentById.get(b.student_id) ?? null : null,
      }));

      setRows(merged);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, user?.id]);

  // Renders an accounting amount as "CAD 45.50" (never "$" / "CA$") plus an
  // optional "≈ EUR 32.85" secondary when the viewer picked a non-CAD currency.
  // Conversion is informational only; the CAD value remains the source of truth.
  const formatAccounting = useMemo(
    () => (amount: number) =>
      formatAccountingDisplay({
        amount,
        sourceCurrency: ACCOUNTING_CURRENCY,
        displayCurrency,
        locale,
      }),
    [displayCurrency, locale],
  );

  const accountingNotice = t("teacherAccountingCurrencyNotice").replace(
    "{currency}",
    ACCOUNTING_CURRENCY,
  );

  const summary = useMemo(() => {
    const paidRows = rows.filter((r) => r.payment?.payment_status === "paid");
    const netEstimatedCents = paidRows.reduce((s, r) => s + cents(r.payment?.teacher_net_cents), 0);
    const pendingPayoutCents = paidRows
      .filter((r) => (r.payment?.transfer_status ?? "not_ready") !== "transferred")
      .reduce((s, r) => s + cents(r.payment?.teacher_net_cents), 0);
    const paidOutCents = paidRows
      .filter((r) => r.payment?.transfer_status === "transferred")
      .reduce((s, r) => s + cents(r.payment?.teacher_net_cents), 0);
    const needsReviewCount = paidRows.filter((r) => r.payment?.transfer_status === "failed").length;
    return { netEstimatedCents, pendingPayoutCents, paidOutCents, needsReviewCount };
  }, [rows]);

  if (!user) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <CircleDollarSign size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{t("teacherSpaceLabel")}</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">{t("teacherRevenueTitle")}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{t("teacherRevenueSubtitle")}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMoneyCard
            title={t("teacherRevenueNetEstimated")}
            display={formatAccounting(summary.netEstimatedCents / 100)}
            icon={<CheckCircle2 size={18} />}
          />
          <SummaryMoneyCard
            title={t("teacherRevenuePendingPayout")}
            display={formatAccounting(summary.pendingPayoutCents / 100)}
          />
          <SummaryMoneyCard
            title={t("teacherRevenuePaidOut")}
            display={formatAccounting(summary.paidOutCents / 100)}
          />
          <SummaryCard
            title={t("teacherRevenueNeedsReview")}
            value={String(summary.needsReviewCount)}
            tone="warn"
            icon={<AlertTriangle size={18} />}
          />
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm space-y-2">
          <p className="text-sm leading-relaxed text-slate-700">{t("teacherRevenueInfo")}</p>
          <p className="text-xs font-semibold leading-relaxed text-teal-700">{accountingNotice}</p>
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm font-semibold text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
              {t("loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <CircleDollarSign size={26} />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">{t("teacherRevenueEmpty")}</p>
              <Link
                href="/dashboard"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-6 text-sm font-bold text-white hover:bg-[#128061]"
              >
                {t("teacherRevenueViewDashboard")}
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-3">{t("teacherRevenueLessonDate")}</th>
                      <th className="px-3 py-3">{t("teacherRevenueStudent")}</th>
                      <th className="px-3 py-3">{t("teacherRevenueGrossAmount")}</th>
                      <th className="px-3 py-3">{t("teacherRevenuePratiqoCommission")}</th>
                      <th className="px-3 py-3">{t("teacherRevenueTeacherNet")}</th>
                      <th className="px-3 py-3">{t("teacherRevenuePaymentStatus")}</th>
                      <th className="px-3 py-3">{t("teacherRevenueTransferStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF4F1]">
                    {rows.map((r) => {
                      const b = r.booking;
                      const p = r.payment;
                      const date = b.slot_date || b.date || "";
                      const time = b.time_slot || b.time || "";
                      const gross = formatAccounting(cents(p?.amount_cents) / 100).primary;
                      const fee = formatAccounting(cents(p?.platform_fee_cents) / 100).primary;
                      const net = formatAccounting(cents(p?.teacher_net_cents) / 100).primary;
                      const payKey = paymentStatusKey(p?.payment_status);
                      const trKey = transferStatusKey(p?.transfer_status);
                      return (
                        <tr key={b.id} className="align-top">
                          <td className="px-3 py-3 font-semibold text-slate-800">
                            {[date, time].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{r.student?.name || "—"}</td>
                          <td className="px-3 py-3 font-bold text-slate-900">{gross}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{fee}</td>
                          <td className="px-3 py-3 font-bold text-teal-700">{net}</td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                classStatusPill(paymentPillKind(p?.payment_status)),
                              )}
                            >
                              {t(payKey)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                classStatusPill(transferPillKind(p?.transfer_status)),
                              )}
                              title={p?.stripe_transfer_id ? `Stripe: ${p.stripe_transfer_id}` : undefined}
                            >
                              {t(trKey)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {rows.map((r) => {
                  const b = r.booking;
                  const p = r.payment;
                  const date = b.slot_date || b.date || "";
                  const time = b.time_slot || b.time || "";
                  const gross = formatAccounting(cents(p?.amount_cents) / 100).primary;
                  const fee = formatAccounting(cents(p?.platform_fee_cents) / 100).primary;
                  const net = formatAccounting(cents(p?.teacher_net_cents) / 100).primary;
                  const payKey = paymentStatusKey(p?.payment_status);
                  const trKey = transferStatusKey(p?.transfer_status);
                  return (
                    <article key={b.id} className="rounded-3xl border border-[#DCEAE3] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{[date, time].filter(Boolean).join(" · ") || "—"}</p>
                          <p className="mt-1 text-sm text-slate-600">{r.student?.name || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-teal-700">{net}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t("teacherRevenueTeacherNet")}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-[#F3FAF6] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("teacherRevenueGrossAmount")}</p>
                          <p className="mt-1 font-bold text-slate-900">{gross}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("teacherRevenuePratiqoCommission")}</p>
                          <p className="mt-1 font-bold text-slate-800">{fee}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", classStatusPill(paymentPillKind(p?.payment_status)))}>
                          {t(payKey)}
                        </span>
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", classStatusPill(transferPillKind(p?.transfer_status)))}>
                          {t(trKey)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  tone = "ok",
  icon,
}: {
  title: string;
  value: string;
  tone?: "ok" | "warn";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={cn("text-2xl font-extrabold", tone === "warn" ? "text-rose-700" : "text-teal-700")}>{value}</p>
        {icon ? (
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", tone === "warn" ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700")}>
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryMoneyCard({
  title,
  display,
  icon,
}: {
  title: string;
  display: ReturnType<typeof formatAccountingDisplay>;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-teal-700 tabular-nums">{display.primary}</p>
          {display.approx ? (
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500 tabular-nums">
              ≈ {display.approx}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shrink-0">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

