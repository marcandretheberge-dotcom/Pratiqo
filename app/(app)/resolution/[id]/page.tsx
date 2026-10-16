"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isRequestedResolution,
  isSupportCaseCategory,
  requestedResolutionLabelKey,
  supportCategoryLabelKey,
  supportStatusLabelKey,
  type RequestedResolution,
  type SupportCaseCategory,
} from "@/lib/supportCases";
import type { TranslationKey } from "@/lib/translations";

type SupportCaseDetail = {
  id: string;
  booking_id: string | null;
  category: string;
  status: string;
  role: string;
  requested_resolution: string | null;
  description: string;
  evidence_urls: string[] | null;
  payout_hold?: boolean | null;
  created_at: string;
  resolved_at?: string | null;
};

type BookingSummary = {
  id: string;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  teacherName?: string | null;
  studentName?: string | null;
};

function nextStepKey(status: string): TranslationKey {
  if (status === "waiting_other_party") return "supportNextStepWaitingOtherParty";
  if (status === "under_review") return "supportNextStepUnderReview";
  if (status === "resolved" || status === "refunded" || status === "credited") return "supportNextStepResolved";
  if (status === "closed") return "supportNextStepClosed";
  return "supportNextStepNew";
}

export default function ResolutionCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [supportCase, setSupportCase] = useState<SupportCaseDetail | null>(null);
  const [booking, setBooking] = useState<BookingSummary | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("support_cases")
        .select(
          "id, booking_id, category, status, role, requested_resolution, description, evidence_urls, payout_hold, created_at, resolved_at",
        )
        .eq("id", id)
        .maybeSingle();
      const row = data as SupportCaseDetail | null;
      let bookingSummary: BookingSummary | null = null;

      if (row?.booking_id) {
        const { data: bookingRow } = await supabase
          .from("bookings")
          .select("id, date, time, slot_date, time_slot, status, teacher_id, student_id")
          .eq("id", row.booking_id)
          .maybeSingle();
        const bookingData = bookingRow as
          | {
              id: string;
              date?: string | null;
              time?: string | null;
              slot_date?: string | null;
              time_slot?: string | null;
              status?: string | null;
              teacher_id?: string | null;
              student_id?: string | null;
            }
          | null;

        if (bookingData) {
          bookingSummary = {
            id: bookingData.id,
            date: bookingData.slot_date ?? bookingData.date ?? null,
            time: bookingData.time_slot ?? bookingData.time ?? null,
            status: bookingData.status ?? null,
          };

          if (bookingData.teacher_id) {
            const { data: teacher } = await supabase
              .from("teachers")
              .select("name")
              .eq("id", bookingData.teacher_id)
              .maybeSingle();
            bookingSummary.teacherName = (teacher as { name?: string | null } | null)?.name ?? null;
          }

          if (bookingData.student_id) {
            const { data: student } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", bookingData.student_id)
              .maybeSingle();
            bookingSummary.studentName = (student as { name?: string | null } | null)?.name ?? null;
          }
        }
      }

      if (!cancelled) {
        setSupportCase(row);
        setBooking(bookingSummary);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center gap-3 text-sm font-semibold text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        {t("loading")}
      </div>
    );
  }

  if (!supportCase) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#DCEAE3] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">{t("supportCaseNoCases")}</p>
        <Link href="/resolution" className="mt-5 inline-flex h-11 items-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white">
          {t("resolutionCenterTitle")}
        </Link>
      </div>
    );
  }

  const category = isSupportCaseCategory(supportCase.category) ? supportCase.category : ("other" as SupportCaseCategory);
  const requestedResolution = isRequestedResolution(supportCase.requested_resolution)
    ? supportCase.requested_resolution
    : ("other" as RequestedResolution);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <Link href="/resolution" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline">
        <ArrowLeft size={16} />
        {t("supportCaseBackToResolution")}
      </Link>

      <article className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{t("resolutionCenterTitle")}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{t(supportCategoryLabelKey(category))}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("supportCaseOpenedOn")} {new Date(supportCase.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#F3FAF6] px-3 py-1 text-xs font-bold text-teal-700">
            {t(supportStatusLabelKey(supportCase.status))}
          </span>
        </div>

        {supportCase.payout_hold ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t("payoutHeldDueToSupportCase")}</p>
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F8FBF9] p-4">
            <dt className="text-xs font-bold uppercase text-slate-500">{t("supportCaseRequestedResolution")}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{t(requestedResolutionLabelKey(requestedResolution))}</dd>
          </div>
          {booking ? (
            <div className="rounded-2xl bg-[#F8FBF9] p-4">
              <dt className="text-xs font-bold uppercase text-slate-500">{t("supportCaseRelatedBooking")}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {[booking.teacherName, booking.studentName, booking.date, booking.time].filter(Boolean).join(" - ")}
              </dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-slate-900">{t("supportCaseDescription")}</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700">
            {supportCase.description}
          </p>
        </section>

        {supportCase.evidence_urls?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-slate-900">{t("supportCaseEvidence")}</h2>
            <ul className="mt-2 space-y-2">
              {supportCase.evidence_urls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-teal-700 hover:underline">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <aside className="rounded-3xl border border-[#DCEAE3] bg-[#F3FAF6] p-5">
        <h2 className="text-sm font-bold text-slate-900">{t("supportCaseNextStep")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t(nextStepKey(supportCase.status))}</p>
      </aside>
    </div>
  );
}
