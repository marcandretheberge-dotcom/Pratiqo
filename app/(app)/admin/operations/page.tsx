"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Flag,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { localeToBcp47, type TranslationKey } from "@/lib/i18n/types";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type OperationsPayload = {
  summary: {
    supportCases: number;
    payoutHolds: number;
    reviewReports: number;
    deletionRequests: number;
    payoutFailures: number;
    pendingDiplomas: number;
    pendingCredentials: number;
  };
  supportCases: Array<{
    id: string;
    bookingId: string | null;
    category: string;
    status: string;
    priority: string;
    role: string;
    requestedResolution: string | null;
    payoutHold: boolean;
    createdAt: string;
    description: string;
    openedByName: string | null;
    studentName: string | null;
    teacherName: string | null;
    nextStep: string;
  }>;
  reviewReports: Array<{
    id: string;
    reviewId: string;
    reason: string;
    details: string | null;
    createdAt: string;
    teacherName: string | null;
    reporterName: string | null;
    rating: number | null;
    reviewBody: string | null;
    moderationStatus: string | null;
    isFlagged: boolean;
    nextStep: string;
  }>;
  deletionRequests: Array<{
    userId: string;
    name: string;
    email: string | null;
    role: string | null;
    deletionRequestedAt: string | null;
    deactivatedAt: string | null;
    isActive: boolean;
    nextStep: string;
  }>;
  payoutFailures: Array<{
    bookingId: string;
    teacherName: string | null;
    studentName: string | null;
    amountCents: number;
    currency: string;
    paymentStatus: string | null;
    transferStatus: string | null;
    refundStatus: string | null;
    failedAt: string | null;
    failureReason: string | null;
    nextStep: string;
  }>;
  verification: {
    pendingDiplomas: number;
    pendingCredentials: number;
  };
};

const emptyPayload: OperationsPayload = {
  summary: {
    supportCases: 0,
    payoutHolds: 0,
    reviewReports: 0,
    deletionRequests: 0,
    payoutFailures: 0,
    pendingDiplomas: 0,
    pendingCredentials: 0,
  },
  supportCases: [],
  reviewReports: [],
  deletionRequests: [],
  payoutFailures: [],
  verification: { pendingDiplomas: 0, pendingCredentials: 0 },
};

type Translator = (key: TranslationKey) => string;

const SUPPORT_CATEGORY_KEYS: Record<string, TranslationKey> = {
  teacher_no_show: "supportCategoryTeacherNoShow",
  student_no_show: "supportCategoryStudentNoShow",
  late_cancellation: "supportCategoryLateCancellation",
  lesson_too_short: "supportCategoryLessonTooShort",
  technical_issue: "supportCategoryTechnicalIssue",
  wrong_address_or_location: "supportCategoryWrongAddress",
  refund_request: "supportCategoryRefundRequest",
  payment_or_receipt_issue: "supportCategoryPaymentIssue",
  inappropriate_behavior: "supportCategoryInappropriateBehavior",
  other: "supportCategoryOther",
};

function labelFromKey(value: string | null | undefined, map: Record<string, TranslationKey>, t: Translator) {
  if (!value) return "-";
  const key = map[value];
  return key ? t(key) : value;
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Math.max(0, cents) / 100);
}

function shortText(value: string | null | undefined, max = 160) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === "urgent") return "border-red-200 bg-red-50 text-red-800";
  if (p === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusPill(status: string | null | undefined) {
  const value = String(status ?? "-");
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
      {value}
    </span>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Icon size={20} />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#2C2C2A]">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm font-semibold text-slate-500">
      <CheckCircle2 size={26} className="mx-auto mb-2 text-teal-400" />
      {text}
    </div>
  );
}

export default function AdminOperationsPage() {
  const { user, profile } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";
  const intlLocale = localeToBcp47(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OperationsPayload>(emptyPayload);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const load = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession();
      const token = sessionData.session?.access_token ?? "";
      const res = await fetch("/api/admin/operations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<OperationsPayload> & { error?: string };
      if (!res.ok) throw new Error(t("adminOperationsLoadError"));
      setData({
        ...emptyPayload,
        ...json,
        summary: { ...emptyPayload.summary, ...(json.summary ?? {}) },
        verification: { ...emptyPayload.verification, ...(json.verification ?? {}) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminServerError"));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, t, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalOpen = useMemo(
    () =>
      data.summary.supportCases +
      data.summary.reviewReports +
      data.summary.deletionRequests +
      data.summary.payoutFailures +
      data.summary.pendingDiplomas +
      data.summary.pendingCredentials,
    [data.summary],
  );

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <ClipboardList size={26} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{t("adminSpaceLabel")}</p>
                <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">{t("adminOperationsTitle")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {t("adminOperationsSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                {t("adminRefresh")}
              </button>
              <Link
                href="/admin/credentials"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
              >
                <FileCheck2 size={15} />
                {t("adminNavCredentials")}
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <AlertTriangle size={16} className="mr-2 inline-block" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm font-semibold text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            {t("adminLoadingOperations")}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                [t("adminTotalOpen"), totalOpen],
                [t("adminSupport"), data.summary.supportCases],
                [t("adminPayoutHolds"), data.summary.payoutHolds],
                [t("adminFlaggedReviews"), data.summary.reviewReports],
                [t("adminDeletionRequests"), data.summary.deletionRequests],
                [t("adminPayoutFailures"), data.summary.payoutFailures],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black text-[#2C2C2A]">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title={t("adminSupportResolution")} count={data.supportCases.length} icon={ShieldAlert}>
                {data.supportCases.length === 0 ? (
                  <EmptyState text={t("adminNoOpenSupportCases")} />
                ) : (
                  <ul className="space-y-3">
                    {data.supportCases.map((c) => (
                      <li key={c.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", priorityClass(c.priority))}>
                            {c.priority}
                          </span>
                          {statusPill(c.status)}
                          {c.payoutHold ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800">
                              {t("adminPayoutBlocked")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-bold text-[#2C2C2A]">
                          {labelFromKey(c.category, SUPPORT_CATEGORY_KEYS, t)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(c.createdAt, intlLocale)} · {t("adminOpenedBy")} {c.openedByName ?? "-"} · {t("adminTeacher")}: {c.teacherName ?? "-"} · {t("adminStudent")}: {c.studentName ?? "-"}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">{shortText(c.description)}</p>
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          {t("adminNextAction")}: {t(c.payoutHold ? "adminNextStepReviewBeforePayout" : "adminNextStepAssignSupport")}
                        </p>
                        {c.bookingId ? <p className="mt-2 text-[11px] text-slate-400">{t("adminBooking")}: {c.bookingId}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={t("adminFlaggedReviewsTitle")} count={data.reviewReports.length} icon={Flag}>
                {data.reviewReports.length === 0 ? (
                  <EmptyState text={t("adminNoFlaggedReviews")} />
                ) : (
                  <ul className="space-y-3">
                    {data.reviewReports.map((r) => (
                      <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            {r.reason}
                          </span>
                          {statusPill(r.moderationStatus)}
                          {r.isFlagged ? statusPill("flagged") : null}
                        </div>
                        <p className="mt-3 text-sm font-bold text-[#2C2C2A]">
                          {t("adminReview")} {r.rating ? `${r.rating}/5` : ""} · {r.teacherName ?? t("adminUnknownTeacher")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(r.createdAt, intlLocale)} · {t("adminReportedBy")} {r.reporterName ?? "-"}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">{shortText(r.reviewBody)}</p>
                        {r.details ? <p className="mt-2 text-xs text-slate-500">{t("adminReportDetails")}: {shortText(r.details, 120)}</p> : null}
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          {t("adminNextAction")}: {t("adminNextStepReviewFlaggedReview")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={t("adminAccountDeletionTitle")} count={data.deletionRequests.length} icon={Trash2}>
                {data.deletionRequests.length === 0 ? (
                  <EmptyState text={t("adminNoDeletionRequests")} />
                ) : (
                  <ul className="space-y-3">
                    {data.deletionRequests.map((d) => (
                      <li key={d.userId} className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm font-bold text-[#2C2C2A]">{d.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {d.email ?? "-"} · {d.role ?? "-"} · {t("adminDeletionRequestedAt")}: {formatDate(d.deletionRequestedAt, intlLocale)}
                        </p>
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          {t("adminNextAction")}: {t("adminNextStepDeletionReview")}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">User: {d.userId}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={t("adminPaymentsToReconcile")} count={data.payoutFailures.length} icon={CreditCard}>
                {data.payoutFailures.length === 0 ? (
                  <EmptyState text={t("adminNoFailedPayouts")} />
                ) : (
                  <ul className="space-y-3">
                    {data.payoutFailures.map((p) => (
                      <li key={p.bookingId} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusPill(`payment: ${p.paymentStatus ?? "-"}`)}
                          {statusPill(`transfer: ${p.transferStatus ?? "-"}`)}
                          {statusPill(`refund: ${p.refundStatus ?? "-"}`)}
                        </div>
                        <p className="mt-3 text-sm font-bold text-[#2C2C2A]">
                          {formatMoney(p.amountCents, p.currency, intlLocale)} · {t("adminTeacher")}: {p.teacherName ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t("adminStudent")}: {p.studentName ?? "-"} · {t("adminFailedAt")}: {formatDate(p.failedAt, intlLocale)}
                        </p>
                        {p.failureReason ? <p className="mt-2 text-sm text-rose-700">{shortText(p.failureReason)}</p> : null}
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
                          {t("adminNextAction")}: {t(p.transferStatus === "failed" ? "adminNextStepSyncStripePayout" : "adminNextStepReconcileRefund")}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">{t("adminBooking")}: {p.bookingId}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section
              title={t("adminVerificationTeachers")}
              count={data.verification.pendingDiplomas + data.verification.pendingCredentials}
              icon={FileCheck2}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-bold text-[#2C2C2A]">
                    {data.verification.pendingDiplomas} {t("adminDiplomas")} · {data.verification.pendingCredentials} {t("adminQualifications")}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("adminVerificationDescription")}
                  </p>
                </div>
                <Link
                  href="/admin/credentials"
                  className="inline-flex h-10 items-center rounded-full bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
                >
                  {t("adminOpenVerificationQueue")}
                </Link>
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
