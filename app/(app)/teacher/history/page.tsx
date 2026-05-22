"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { localeToBcp47 } from "@/lib/i18n/types";
import type { TranslationKey } from "@/lib/translations";

/**
 * History rows show the actual booking_payments amount, always settled in CAD.
 * The viewer's display-currency selector does not convert these numbers —
 * teacher history is an accounting screen.
 */
const ACCOUNTING_CURRENCY = "CAD";

type HistoryTab = "completed" | "cancelled" | "payments";

type BookingRow = {
  id: string;
  student_id: string | null;
  slot_date: string | null;
  date: string | null;
  time_slot: string | null;
  time: string | null;
  status: string;
  price: number | string | null;
};

type PaymentRow = {
  booking_id: string;
  payment_status: string | null;
  transfer_status: string | null;
  failure_reason: string | null;
  amount_cents: number | null;
  teacher_net_cents: number | null;
  currency: string | null;
};

type StudentRow = { id: string; name: string | null };

type Row = {
  booking: BookingRow;
  payment: PaymentRow | null;
  student: StudentRow | null;
};

const CANCELLED_STATUSES = ["cancelled", "cancelled_conflict", "declined", "refunded"] as const;
const TERMINAL_STATUSES = ["completed", ...CANCELLED_STATUSES] as const;

function statusInfo(
  status: string,
  t: (key: TranslationKey) => string,
): { label: string; cls: string } {
  switch (status) {
    case "completed":
      return { label: t("bookingStatusCompleted"), cls: "bg-teal-50 text-teal-700" };
    case "cancelled":
      return { label: t("bookingStatusCancelled"), cls: "bg-slate-100 text-slate-600" };
    case "cancelled_conflict":
      return { label: t("bookingStatusCancelledConflict"), cls: "bg-slate-100 text-slate-600" };
    case "declined":
      return { label: t("bookingStatusDeclined"), cls: "bg-rose-50 text-rose-700" };
    case "refunded":
      return { label: t("bookingStatusRefunded"), cls: "bg-blue-50 text-blue-700" };
    default:
      return { label: status, cls: "bg-slate-100 text-slate-500" };
  }
}

function paymentPillInfo(
  status: string | null,
  t: (key: TranslationKey) => string,
): { label: string; cls: string } {
  if (status === "paid") return { label: t("paymentStatusPaid"), cls: "bg-teal-50 text-teal-700" };
  if (status === "refunded" || status === "partially_refunded")
    return { label: t("paymentStatusRefunded"), cls: "bg-slate-100 text-slate-600" };
  if (status === "failed")
    return { label: t("paymentStatusFailed"), cls: "bg-rose-50 text-rose-700" };
  return { label: t("paymentStatusPending"), cls: "bg-amber-50 text-amber-800" };
}

function transferPillInfo(
  status: string | null,
  t: (key: TranslationKey) => string,
): { label: string; cls: string } {
  if (status === "transferred")
    return { label: t("transferStatusTransferred"), cls: "bg-teal-50 text-teal-700" };
  if (status === "failed")
    return { label: t("transferStatusFailed"), cls: "bg-rose-50 text-rose-700" };
  if (status === "reversed")
    return { label: t("transferStatusReversed"), cls: "bg-amber-50 text-amber-800" };
  return { label: t("transferStatusNotReady"), cls: "bg-slate-100 text-slate-600" };
}

export default function TeacherHistoryPage() {
  const { user, profile } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();

  const isTeacher = (profile?.role as string | undefined) === "teacher";

  const [tab, setTab] = useState<HistoryTab>("completed");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  // Pin currencyDisplay: "code" so accounting amounts always read "CAD 45.50"
  // — never the ambiguous "$" or the viewer's display-currency symbol.
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(localeToBcp47(locale), {
        style: "currency",
        currency: ACCOUNTING_CURRENCY,
        currencyDisplay: "code",
      }),
    [locale],
  );

  // Redirect non-teachers — middleware handles the unauthenticated case since
  // /teacher/* is in the protected path list; this covers the wrong-role case.
  useEffect(() => {
    if (!user) return;
    if (!isTeacher) router.replace("/dashboard");
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

      // Always resolve teacher by authenticated user ID — never accept a client-provided teacher ID.
      const { data: trow } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const teacherId = (trow as { id?: string } | null)?.id ?? null;

      if (!teacherId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      // Load only terminal-status bookings for this teacher.
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, student_id, slot_date, date, time_slot, time, status, price")
        .eq("teacher_id", teacherId)
        .in("status", [...TERMINAL_STATUSES])
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      const bookingRows = ((bookings ?? []) as BookingRow[]).filter((b) => Boolean(b.id));

      if (!bookingRows.length) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const bookingIds = bookingRows.map((b) => b.id);
      const studentIds = Array.from(
        new Set(bookingRows.map((b) => b.student_id).filter(Boolean)),
      ) as string[];

      const [{ data: payments }, { data: students }] = await Promise.all([
        supabase
          .from("booking_payments")
          .select(
            "booking_id, payment_status, transfer_status, failure_reason, amount_cents, teacher_net_cents, currency",
          )
          .in("booking_id", bookingIds),
        studentIds.length
          ? supabase.from("profiles").select("id, name").in("id", studentIds)
          : Promise.resolve({ data: [] as StudentRow[] }),
      ]);

      if (cancelled) return;

      const paymentMap = new Map<string, PaymentRow>(
        ((payments ?? []) as PaymentRow[]).map((p) => [p.booking_id, p]),
      );
      const studentMap = new Map<string, StudentRow>(
        ((students ?? []) as StudentRow[]).map((s) => [s.id, s]),
      );

      const merged: Row[] = bookingRows.map((b) => ({
        booking: b,
        payment: paymentMap.get(b.id) ?? null,
        student: b.student_id ? studentMap.get(b.student_id) ?? null : null,
      }));

      if (!cancelled) {
        setRows(merged);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, user?.id]);

  const completedRows = useMemo(
    () => rows.filter((r) => r.booking.status === "completed"),
    [rows],
  );

  const cancelledRows = useMemo(
    () => rows.filter((r) => (CANCELLED_STATUSES as readonly string[]).includes(r.booking.status)),
    [rows],
  );

  const paymentIssueRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.payment?.transfer_status === "failed" ||
          Boolean(r.payment?.failure_reason),
      ),
    [rows],
  );

  const tabItems: { key: HistoryTab; labelKey: TranslationKey; count: number }[] = [
    { key: "completed", labelKey: "teacherHistoryTabCompleted", count: completedRows.length },
    { key: "cancelled", labelKey: "teacherHistoryTabCancelled", count: cancelledRows.length },
    {
      key: "payments",
      labelKey: "teacherHistoryTabPayments",
      count: paymentIssueRows.length,
    },
  ];

  const activeRows =
    tab === "completed"
      ? completedRows
      : tab === "cancelled"
        ? cancelledRows
        : paymentIssueRows;

  if (!user) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6 pb-10">

        {/* Page header */}
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <History size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {t("teacherSpaceLabel")}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">
                {t("teacherHistoryTitle")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {t("teacherHistorySubtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabItems.map(({ key, labelKey, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                tab === key
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <span className="truncate">{t(labelKey)}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                    tab === key
                      ? "bg-white/20 text-white"
                      : key === "payments"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <section className="rounded-3xl border border-[#DCEAE3] bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14 text-sm font-semibold text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
              {t("loading")}
            </div>
          ) : activeRows.length === 0 ? (
            <div className="py-14 text-center">
              <History size={32} className="mx-auto mb-4 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">{t("teacherHistoryEmpty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#EEF4F1]">
              {activeRows.map((r) => {
                const b = r.booking;
                const p = r.payment;
                const date = b.slot_date || b.date || "";
                const time = b.time_slot || b.time || "";
                const dateLabel = [date, time].filter(Boolean).join(" · ") || "—";

                // Prefer payment amount_cents; fall back to booking price (stored as dollars).
                // Output is always CAD-labelled (e.g. "CAD 45.50"), never "$".
                const priceDisplay =
                  p?.amount_cents != null && p.amount_cents > 0
                    ? fmt.format(p.amount_cents / 100).replace(/\s+/g, " ").trim()
                    : b.price != null && Number(b.price) > 0
                      ? fmt.format(Number(b.price)).replace(/\s+/g, " ").trim()
                      : null;

                const si = statusInfo(b.status, t);

                return (
                  <li
                    key={b.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Date + status pill */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{dateLabel}</p>
                        {/* Show status pill on cancelled tab (distinguishes cancelled/declined/refunded);
                            completed tab is uniform, payments tab shows transfer status instead */}
                        {tab === "cancelled" && (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                              si.cls,
                            )}
                          >
                            {si.label}
                          </span>
                        )}
                      </div>

                      {/* Student name */}
                      <p className="mt-0.5 text-sm text-slate-600">
                        {r.student?.name || "—"}
                      </p>

                      {/* Payment / transfer pills — only on payment issues tab */}
                      {tab === "payments" && p ? (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              const pay = paymentPillInfo(p.payment_status, t);
                              const tr = transferPillInfo(p.transfer_status, t);
                              return (
                                <>
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                                      pay.cls,
                                    )}
                                  >
                                    {pay.label}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                                      tr.cls,
                                    )}
                                  >
                                    {tr.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          {/* Failure reason: collapsed, visually secondary */}
                          {p.failure_reason ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer select-none text-xs font-semibold text-slate-400 hover:text-slate-600">
                                {t("teacherHistoryErrorDetails")}
                              </summary>
                              <p className="mt-1 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {p.failure_reason}
                              </p>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Price */}
                    {priceDisplay ? (
                      <p className="shrink-0 text-sm font-bold text-teal-700 sm:pt-0.5">
                        {priceDisplay}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
          >
            ← {t("teacherHistoryBackToDashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}
