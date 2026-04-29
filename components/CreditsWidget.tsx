"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, Gift, Star, Users, Zap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage } from "@/lib/companions";
import { COMPANION_MILESTONE_AMOUNTS, REFERRAL_YEARLY_CAP } from "@/lib/credits";

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

type TeacherOption = { teacherId: string; name: string };

type ReviewState = {
  teacherId: string;
  teacherName: string;
  rating: number;
  body: string;
  status: "idle" | "submitting" | "done" | "already" | "error";
};

const MILESTONES = [
  { stageIndex: 1, amount: 5, threshold: 6 },
  { stageIndex: 2, amount: 10, threshold: 16 },
  { stageIndex: 3, amount: 15, threshold: 31 },
  { stageIndex: 4, amount: 25, threshold: 51 },
];

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

export function CreditsWidget({
  teachers,
  lessonCount,
  companionType,
}: {
  teachers?: TeacherOption[];
  lessonCount?: number;
  companionType?: CompanionType | null;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const loadCredits = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/credits", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) setData(await res.json() as CreditsData);
    } catch { /* silent */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadCredits(); }, [loadCredits]);

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
    const { data: { session } } = await supabase.auth.getSession();
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

  // Determine next companion milestone
  const nextMilestone = MILESTONES.find((m) => lessonsCt < m.threshold);
  const lessonsToNext = nextMilestone ? nextMilestone.threshold - lessonsCt : 0;

  return (
    <div className="rounded-3xl border border-[var(--p-border-light)] bg-white overflow-hidden shadow-sm">
      {/* Balance header */}
      <div
        className="px-5 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #0F6E56, #1D9E75)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t("creditsTitle")}</p>
        <p className="mt-1 text-4xl font-bold">
          ${loading ? "—" : balance.toFixed(2)}
        </p>
        <p className="mt-1 text-[12px] text-white/80">{t("creditsBalance")}</p>
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* How to earn */}
        <div className="rounded-2xl bg-[#F9F8F5] border border-[var(--p-border-light)] p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("creditsHowToEarn")}</p>

          {/* Companion milestones */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-[var(--p-text)]">{t("creditsEvolution")}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 ml-5">
              {MILESTONES.map((m) => {
                const earned = lessonsCt >= m.threshold;
                const isCurrent = nextMilestone?.stageIndex === m.stageIndex;
                const companionStage = companionType
                  ? COMPANIONS[companionType].stages[m.stageIndex]
                  : null;
                const stageName = companionStage?.emoji ?? `Étape ${m.stageIndex + 1}`;
                return (
                  <div
                    key={m.stageIndex}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold",
                      earned
                        ? "bg-[#E1F5EE] text-[#0F6E56]"
                        : isCurrent
                          ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                          : "bg-white text-[var(--p-text-muted)] border border-[var(--p-border-light)]",
                    )}
                  >
                    {earned ? (
                      <Check size={11} className="text-[#1D9E75] shrink-0" />
                    ) : (
                      <span className="text-base leading-none">{stageName}</span>
                    )}
                    <span>+${m.amount}</span>
                    {isCurrent && !earned && (
                      <span className="ml-auto text-[10px] text-amber-600">{lessonsToNext} cours</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review */}
          <div className="flex items-start gap-2">
            <Star size={14} className="text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[var(--p-text)]">{t("creditsReview")}</p>
              <p className="text-[11px] text-[var(--p-text-muted)]">{t("creditsReviewDesc")}</p>
            </div>
          </div>

          {/* Referral */}
          <div className="flex items-start gap-2">
            <Users size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[var(--p-text)]">{t("creditsReferral")}</p>
              <p className="text-[11px] text-[var(--p-text-muted)]">{t("creditsReferralBoth")}</p>
            </div>
          </div>
        </div>

        {/* Referral link */}
        {data?.referralCode ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
              {t("creditsReferralLink")}
            </p>
            <p className="text-xs text-[var(--p-text-muted)]">{t("creditsReferralDesc")}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-[var(--p-border-light)] bg-[#F9F8F5] px-3 py-2 overflow-hidden">
                <span className="font-mono text-sm font-bold text-[#1D9E75] tracking-widest">
                  {data.referralCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void copyReferral()}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shrink-0 transition-all",
                  copied
                    ? "bg-[#1D9E75] text-white"
                    : "border border-[#1D9E75] text-[#1D9E75] hover:bg-[rgba(29,158,117,0.06)]",
                )}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? t("creditsReferralCopied") : t("creditsReferralCopy")}
              </button>
            </div>
            {/* Yearly cap progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[var(--p-text-muted)] font-medium">
                <span>{t("creditsReferralYearlyCap")}</span>
                <span>{yearTotal.toFixed(0)} $ / {yearCap} $</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E8E6DF] overflow-hidden">
                <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${yearPct}%` }} />
              </div>
            </div>
          </div>
        ) : null}

        {/* Leave a review */}
        {teachers && teachers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
              {t("creditsLeaveReview")}
            </p>
            {review ? (
              <div className="rounded-2xl border border-[var(--p-border-light)] bg-[#F9F8F5] p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--p-text)]">{review.teacherName}</p>
                {review.status === "done" ? (
                  <p className="text-sm font-bold text-[#1D9E75]">{t("creditsReviewSuccess")}</p>
                ) : review.status === "already" ? (
                  <p className="text-sm text-[var(--p-text-muted)]">{t("creditsReviewAlready")}</p>
                ) : review.status === "error" ? (
                  <p className="text-sm text-rose-500">{t("creditsReviewError")}</p>
                ) : (
                  <>
                    <StarRating
                      value={review.rating}
                      onChange={(v) => setReview((r) => r && { ...r, rating: v })}
                    />
                    <textarea
                      value={review.body}
                      onChange={(e) => setReview((r) => r && { ...r, body: e.target.value })}
                      placeholder={t("creditsReviewOptional")}
                      rows={2}
                      className="w-full rounded-xl border border-[var(--p-border-light)] bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void submitReview()}
                        disabled={review.rating < 1 || review.status === "submitting"}
                        className={cn(
                          "flex-1 h-8 rounded-xl text-xs font-bold text-white bg-[#1D9E75] transition-all",
                          (review.rating < 1 || review.status === "submitting") && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {review.status === "submitting" ? "…" : t("creditsReviewSubmit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReview(null)}
                        className="px-3 h-8 rounded-xl text-xs font-semibold text-[var(--p-text-muted)] border border-[var(--p-border-light)]"
                      >
                        {t("creditsReviewCancel")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {teachers.map((tc) => (
                  <li key={tc.teacherId} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--p-border-light)] bg-[#F9F8F5] px-3 py-2">
                    <span className="text-xs font-medium text-[var(--p-text)] truncate">{tc.name}</span>
                    <button
                      type="button"
                      onClick={() => setReview({ teacherId: tc.teacherId, teacherName: tc.name, rating: 0, body: "", status: "idle" })}
                      className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold text-purple-600 border border-purple-200 hover:bg-purple-50 transition-all"
                    >
                      <Star size={11} />
                      +1 $
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {/* Transaction history */}
        {!loading && data && data.transactions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
              {t("creditsHistory")}
            </p>
            <ul className="space-y-1.5">
              {data.transactions.slice(0, 6).map((tx) => (
                <li key={tx.id} className="flex items-center gap-2 text-xs">
                  {Number(tx.amount) > 0 ? (
                    <Gift size={13} className="text-[#1D9E75] shrink-0" />
                  ) : (
                    <span className="w-[13px] shrink-0 text-center text-[#6B6A65]">−</span>
                  )}
                  <span className="flex-1 text-[var(--p-text-muted)] truncate">
                    {typeLabel(tx.type, t)} — {tx.description}
                  </span>
                  <span className={cn("shrink-0 font-bold", Number(tx.amount) > 0 ? "text-[#1D9E75]" : "text-[var(--p-text-muted)]")}>
                    {Number(tx.amount) > 0 ? "+" : ""}${Math.abs(Number(tx.amount)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : !loading && data?.transactions.length === 0 ? (
          <p className="text-xs text-[var(--p-text-muted)] italic">{t("creditsNoHistory")}</p>
        ) : null}
      </div>
    </div>
  );
}
