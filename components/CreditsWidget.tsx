"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronRight, Copy, Gift, Star, Users, Zap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage } from "@/lib/companions";
import { REFERRAL_YEARLY_CAP } from "@/lib/credits";

type Tx = {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  status?: string;
};

type CreditsData = {
  balance: number;
  referralCode: string | null;
  referralYearlyTotal: number;
  referralYearlyCap: number;
  transactions: Tx[];
};

export type CreditsTeacherOption = {
  teacherId: string;
  name: string;
  discipline?: string | null;
  imageUrl?: string | null;
};

type ReviewState = {
  teacherId: string;
  teacherName: string;
  teacherDiscipline?: string | null;
  rating: number;
  body: string;
  status: "idle" | "submitting" | "done" | "already" | "error";
};

const MILESTONES = [
  { stageIndex: 1, amount: 5, threshold: 6 },
  { stageIndex: 2, amount: 10, threshold: 16 },
  { stageIndex: 3, amount: 15, threshold: 31 },
  { stageIndex: 4, amount: 25, threshold: 51 },
] as const;

const TRACK_MAX = MILESTONES[MILESTONES.length - 1].threshold;

function typeLabel(type: string, t: (k: TranslationKey) => string): string {
  const map: Record<string, TranslationKey> = {
    companion_evolution: "creditsTypeEvolution",
    referral: "creditsTypeReferral",
    referee_bonus: "creditsTypeRefereeBonus",
    review: "creditsTypeReview",
    credit_used: "creditsTypeUsed",
  };
  const key = map[type];
  return key ? t(key) : type;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={cn(
            "text-xl leading-none transition-colors",
            (hovered || value) >= n ? "text-amber-400" : "text-[#D3D1C7]",
            onChange ? "cursor-pointer" : "cursor-default",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function TeacherAvatarRow({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const initials = (name || "?").slice(0, 2).toUpperCase();
  if (url) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-100 bg-slate-50">
        <Image src={url} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-[11px] font-bold text-[#0F6E56]">
      {initials}
    </div>
  );
}

export function CreditsWidget({
  teachers,
  lessonCount,
  companionType,
  layout = "default",
}: {
  teachers?: CreditsTeacherOption[];
  lessonCount?: number;
  companionType?: CompanionType | null;
  /** `progress` = 2-column desktop grid for /student/progress */
  layout?: "default" | "progress";
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const loadCredits = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/credits", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) setData((await res.json()) as CreditsData);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  const copyReferral = async () => {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/login?ref=${data.referralCode}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitReview = async () => {
    if (!review || review.rating < 1 || review.status === "submitting") return;
    setReview((r) => r && { ...r, status: "submitting" });
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ teacherId: review.teacherId, rating: review.rating, body: review.body }),
    });
    if (res.ok) {
      setReview((r) => r && { ...r, status: "done" });
      void loadCredits();
    } else if (res.status === 409) {
      setReview((r) => r && { ...r, status: "already" });
    } else {
      setReview((r) => r && { ...r, status: "error" });
    }
  };

  if (!user) return null;

  const balance = data?.balance ?? 0;
  const lessonsCt = lessonCount ?? 0;
  const yearTotal = data?.referralYearlyTotal ?? 0;
  const yearCap = data?.referralYearlyCap ?? REFERRAL_YEARLY_CAP;
  const yearPct = Math.min(100, Math.round((yearTotal / yearCap) * 100));
  const nextMilestone = MILESTONES.find((m) => lessonsCt < m.threshold);
  const lessonsToNext = nextMilestone ? nextMilestone.threshold - lessonsCt : 0;
  const trackFillPct = Math.min(100, (lessonsCt / TRACK_MAX) * 100);

  const balanceCard = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">{t("creditsTitle")}</p>
        <p className="text-lg font-bold tabular-nums text-[#0F6E56]">${loading ? "—" : balance.toFixed(2)}</p>
      </div>
      <p className="max-w-[12rem] text-right text-[11px] leading-snug text-slate-500">{t("creditsBalance")}</p>
    </div>
  );

  const milestoneCard = (
    <section
      className="rounded-3xl border border-white/15 p-5 text-white shadow-[0_20px_50px_rgba(15,110,86,0.2)] sm:p-6"
      style={{ background: "#0F6E56" }}
    >
      <h2 className="text-sm font-semibold leading-tight text-white">{t("creditsEvolution")}</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/85">{t("creditsMilestoneDescription")}</p>
      <p className="mt-3 text-xs font-medium text-white/95">
        {t("coursesCompleted").replace("{count}", String(lessonsCt))}
      </p>
      {nextMilestone && lessonsToNext > 0 ? (
        <p className="mt-0.5 text-[11px] text-white/75">
          {lessonsToNext} {t("companionMoreLessons")}
        </p>
      ) : !nextMilestone ? (
        <p className="mt-0.5 text-[11px] text-white/80">{t("companionMaxLevel")}</p>
      ) : null}

      <div className="relative mt-5">
        <div className="absolute left-0 right-0 top-[9px] h-px rounded-full bg-white/25" />
        <div
          className="absolute left-0 top-[9px] h-px rounded-full bg-amber-200/95 transition-all duration-500"
          style={{ width: `${trackFillPct}%` }}
        />
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {MILESTONES.map((m) => {
            const earned = lessonsCt >= m.threshold;
            const isNext = nextMilestone?.stageIndex === m.stageIndex && !earned;
            const companionStage = companionType ? COMPANIONS[companionType].stages[m.stageIndex] : null;
            const emoji = companionStage?.emoji ?? "·";
            return (
              <div key={m.stageIndex} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "relative z-[1] flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                    earned
                      ? "border-white/40 bg-white text-[#0F6E56]"
                      : isNext
                        ? "border-amber-200 bg-amber-100/90 text-amber-900"
                        : "border-white/35 bg-white/10 text-white/90",
                  )}
                >
                  {earned ? <Check size={12} strokeWidth={3} /> : <span className="leading-none">{emoji}</span>}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-white">+${m.amount}</p>
                <p className="text-[10px] font-medium tabular-nums text-white/75">{m.threshold}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const howToEarnCard = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">{t("creditsHowToEarn")}</h2>
      <ul className="mt-4 space-y-0 divide-y divide-slate-100">
        <li className="flex items-start gap-3 py-3 first:pt-0">
          <Star size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">{t("creditsReview")}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{t("creditsReviewDescriptionShort")}</p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
        </li>
        <li className="flex items-start gap-3 py-3">
          <Users size={16} className="mt-0.5 shrink-0 text-[#1D9E75]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">{t("creditsReferral")}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{t("creditsReferralDescriptionShort")}</p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
        </li>
        <li className="flex items-start gap-3 py-3 last:pb-0">
          <Zap size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">{t("creditsEvolution")}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{t("creditsEarnEvolution")}</p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
        </li>
      </ul>
    </div>
  );

  const referralCard =
    data?.referralCode != null && data.referralCode !== "" ? (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t("creditsReferralLink")}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{t("creditsReferralDesc")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-h-[40px] flex-1 rounded-xl border border-slate-200/90 bg-[#F9FAF8] px-3 py-2.5">
            <span className="font-mono text-sm font-semibold tracking-widest text-[#0F6E56]">{data.referralCode}</span>
          </div>
          <button
            type="button"
            onClick={() => void copyReferral()}
            className={cn(
              "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-all sm:min-w-[96px]",
              copied ? "bg-[#0F6E56] text-white" : "border border-[#0F6E56]/40 text-[#0F6E56] hover:bg-[#0F6E56]/[0.06]",
            )}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("creditsReferralCopied") : t("creditsReferralCopy")}
          </button>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-600">
            <span>{t("creditsReferralCapLabel")}</span>
            <span className="tabular-nums text-slate-800">
              {yearTotal.toFixed(0)} $ / {yearCap} $
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-200/80">
            <div className="h-full rounded-full bg-[#1D9E75]/85 transition-all" style={{ width: `${yearPct}%` }} />
          </div>
        </div>
      </div>
    ) : null;

  const reviewBlock = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t("creditsLeaveReview")}</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">{t("creditsReviewDescriptionShort")}</p>
        </div>
      </div>
      {review ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold text-slate-900">{review.teacherName}</p>
          {review.teacherDiscipline ? <p className="text-[11px] text-slate-600">{review.teacherDiscipline}</p> : null}
          {review.status === "done" ? (
            <p className="text-sm font-semibold text-[#0F6E56]">{t("creditsReviewSuccess")}</p>
          ) : review.status === "already" ? (
            <p className="text-sm text-slate-700">{t("creditsReviewAlready")}</p>
          ) : review.status === "error" ? (
            <p className="text-sm text-rose-500">{t("creditsReviewError")}</p>
          ) : (
            <>
              <StarRating value={review.rating} onChange={(v) => setReview((r) => r && { ...r, rating: v })} />
              <textarea
                value={review.body}
                onChange={(e) => setReview((r) => r && { ...r, body: e.target.value })}
                placeholder={t("creditsReviewOptional")}
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitReview()}
                  disabled={review.rating < 1 || review.status === "submitting"}
                  className={cn(
                    "min-h-[36px] flex-1 rounded-xl bg-[#0F6E56] text-xs font-semibold text-white transition-all",
                    (review.rating < 1 || review.status === "submitting") && "cursor-not-allowed opacity-50",
                  )}
                >
                  {review.status === "submitting" ? "…" : t("creditsReviewSubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => setReview(null)}
                  className="min-h-[36px] rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("creditsReviewCancel")}
                </button>
              </div>
            </>
          )}
        </div>
      ) : teachers && teachers.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {teachers.map((tc) => (
            <li
              key={tc.teacherId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <TeacherAvatarRow name={tc.name} imageUrl={tc.imageUrl} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{tc.name}</p>
                  {tc.discipline ? <p className="truncate text-[11px] text-slate-600">{tc.discipline}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setReview({
                    teacherId: tc.teacherId,
                    teacherName: tc.name,
                    teacherDiscipline: tc.discipline ?? null,
                    rating: 0,
                    body: "",
                    status: "idle",
                  })
                }
                className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80 transition hover:bg-amber-100/90"
              >
                {t("creditsReviewRewardBadge")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{t("creditsReviewEmptyState")}</p>
      )}
    </div>
  );

  const historyBlock =
    !loading && data && data.transactions.length > 0 ? (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t("creditsHistory")}</h2>
        <ul className="mt-3 space-y-2">
          {data.transactions.slice(0, 6).map((tx) => (
            <li key={tx.id} className="flex items-center gap-2 text-xs">
              {Number(tx.amount) > 0 ? (
                <Gift size={13} className="shrink-0 text-[#1D9E75]" />
              ) : (
                <span className="w-[13px] shrink-0 text-center font-bold text-slate-500">−</span>
              )}
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {typeLabel(tx.type, t)} — {tx.description}
              </span>
              <span className={cn("shrink-0 font-semibold tabular-nums", Number(tx.amount) > 0 ? "text-[#0F6E56]" : "text-slate-700")}>
                {Number(tx.amount) > 0 ? "+" : ""}${Math.abs(Number(tx.amount)).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : !loading && data?.transactions.length === 0 ? (
      <p className="text-center text-[11px] font-medium text-slate-600">{t("creditsNoHistory")}</p>
    ) : null;

  const topRow =
    layout === "progress" ? (
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {milestoneCard}
        {howToEarnCard}
      </div>
    ) : (
      <div className="space-y-4">
        {milestoneCard}
        {howToEarnCard}
      </div>
    );

  const secondRow =
    layout === "progress" ? (
      <div
        className={cn(
          "grid gap-4 lg:gap-6",
          referralCard && reviewBlock ? "lg:grid-cols-2" : "lg:grid-cols-1",
        )}
      >
        {referralCard}
        {reviewBlock}
      </div>
    ) : (
      <div className="space-y-4">
        {referralCard}
        {reviewBlock}
      </div>
    );

  return (
    <div className="space-y-4">
      {balanceCard}
      {topRow}
      {secondRow}
      {historyBlock}
    </div>
  );
}
