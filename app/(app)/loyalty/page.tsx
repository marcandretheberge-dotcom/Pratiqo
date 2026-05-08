"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import {
  formatCadWhole,
} from "../../../lib/loyalty";
import { useLocale } from "../../../lib/locale-context";
import type { TranslationKey } from "../../../lib/translations";

type TierId = "bronze" | "argent" | "or" | "platine";

type TierDef = {
  id: TierId;
  min: number;
  max: number;
  circle: string;
  freeCommissionPct: number;
  proCommissionPct: number;
};

const TIER_I18N: Record<TierId, TranslationKey> = {
  bronze: "tierBronze",
  argent: "tierSilver",
  or: "tierGold",
  platine: "tierPlatinum",
};

const TIERS: TierDef[] = [
  { id: "bronze", min: 0, max: 5000, circle: "#CD7F32", freeCommissionPct: 10, proCommissionPct: 5 },
  { id: "argent", min: 5000, max: 15000, circle: "#C0C0C0", freeCommissionPct: 9, proCommissionPct: 4.5 },
  { id: "or", min: 15000, max: 30000, circle: "#FFD700", freeCommissionPct: 8, proCommissionPct: 4 },
  { id: "platine", min: 30000, max: Infinity, circle: "var(--palette-teal-500)", freeCommissionPct: 7, proCommissionPct: 3.5 },
];

function tierFromVolume(volume: number): TierDef {
  const v = Math.max(0, volume);
  for (const t of TIERS) {
    if (v >= t.min && v < t.max) return t;
  }
  return TIERS[TIERS.length - 1]!;
}

function normalizeTierId(raw: string | null | undefined): TierDef["id"] {
  const s = (raw || "bronze").toLowerCase();
  if (s === "argent" || s === "silver") return "argent";
  if (s === "or" || s === "gold") return "or";
  if (s === "platine" || s === "platinum") return "platine";
  return "bronze";
}

function tierById(id: TierDef["id"]): TierDef {
  return TIERS.find((t) => t.id === id) ?? TIERS[0]!;
}

function nextTierProgress(volume: number): { nextTierId: TierId | null; remaining: number; pct: number } {
  const v = Math.max(0, volume);
  if (v < 5000) return { nextTierId: "argent", remaining: Math.max(0, 5000 - v), pct: Math.min(100, (v / 5000) * 100) };
  if (v < 15000) return { nextTierId: "or", remaining: Math.max(0, 15000 - v), pct: Math.min(100, ((v - 5000) / 10000) * 100) };
  if (v < 30000)
    return { nextTierId: "platine", remaining: Math.max(0, 30000 - v), pct: Math.min(100, ((v - 15000) / 15000) * 100) };
  return { nextTierId: null, remaining: 0, pct: 100 };
}

type ProfileLoyaltyRow = {
  loyalty_tier: string | null;
  loyalty_annual_volume: number | string | null;
  loyalty_cashback_earned: number | string | null;
  ristourne_months_active: number | string | null;
  plan: string | null;
  active_student_count: number | string | null;
};

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProfileLoyaltyRow | null>(null);

  // (Ancien contenu retiré.)

  const load = useCallback(async () => {
    if (!user?.id) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("loyalty_tier, loyalty_annual_volume, loyalty_cashback_earned, ristourne_months_active, plan, active_student_count")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[loyalty] profile fetch", error.message);
      setRow(null);
    } else {
      setRow((data as ProfileLoyaltyRow) ?? null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const volume = Number(row?.loyalty_annual_volume ?? 0);
  const plan = (row?.plan || "free").toLowerCase();
  const tierId = normalizeTierId(row?.loyalty_tier);
  const displayTier = tierById(tierId);
  const progress = nextTierProgress(volume);

  const nextTierName = (id: TierId | null) => (id ? t(TIER_I18N[id]) : t("tierPlatinum"));

  const currentCommissionPct = useMemo(() => {
    if (!user) return null;
    return plan === "pro" ? displayTier.proCommissionPct : displayTier.freeCommissionPct;
  }, [user, plan, displayTier]);

  return (
    <div className="max-w-5xl mx-auto pb-12 text-[var(--p-text)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--p-text)] mb-6">{t("loyaltyTitle")}</h1>
      <div className="space-y-8">
          <div
            className="rounded-3xl p-8 sm:p-10 text-white shadow-xl overflow-hidden relative"
            style={{ backgroundColor: "var(--palette-teal-700)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">{t("loyaltyCurrentLevel")}</p>
            {loading ? (
              <p className="mt-4 text-white/80 text-sm">{t("loading")}</p>
            ) : !user ? (
              <p className="mt-4 text-white/90 text-sm">{t("loyaltyLoginPrompt")}</p>
            ) : (
              <>
                <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">{t(TIER_I18N[displayTier.id])}</h2>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-medium text-white/70">
                      {t("loyaltyAnnualVolume")} {t("loyaltyAnnualVolumeYearNote")}
                    </p>
                    <p className="text-2xl font-bold mt-1">{formatCadWhole(volume)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">{t("loyaltyCurrentTier")}</p>
                    <p className="text-2xl font-bold mt-1">{t(TIER_I18N[displayTier.id])}</p>
                    <p className="mt-2 text-xs text-white/75">{plan === "pro" ? t("loyaltyPlanProShort") : t("loyaltyPlanFreeShort")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">{t("loyaltyCurrentCommission")}</p>
                    <p className="text-2xl font-bold mt-1">
                      {currentCommissionPct != null ? `${String(currentCommissionPct).replace(".", ",")} %` : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="flex justify-between text-xs font-medium text-white/80 mb-2">
                    <span>
                      {t("loyaltyProgressToNext")}
                    </span>
                    <span>
                      {progress.nextTierId
                        ? `${formatCadWhole(progress.remaining)} ${t("loyaltyNextTier")} ${nextTierName(progress.nextTierId)}`
                        : t("loyaltyTopTier")}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-black/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/90 transition-all duration-500"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {TIERS.map((tier) => {
              const active = tier.id === displayTier.id;
              return (
                <div
                  key={tier.id}
                  className={cn(
                    "rounded-2xl border-2 p-5 bg-[var(--p-surface)] transition-shadow",
                    active ? "border-teal-500 shadow-[0_12px_40px_rgb(80_190_178/0.15)]" : "border-[var(--p-border-light)]",
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full shrink-0 border-2 border-white/40 shadow-inner"
                      style={{ backgroundColor: tier.circle }}
                    />
                    <div>
                      <p className="text-lg font-bold">{t(TIER_I18N[tier.id])}</p>
                      <p className="text-[11px] text-[var(--p-text-muted)] font-medium">
                        {tier.max === Infinity
                          ? `${formatCadWhole(tier.min)}+`
                          : `${formatCadWhole(tier.min)} – ${formatCadWhole(tier.max)}`}
                      </p>
                    </div>
                  </div>
                  <ul className="text-sm text-[var(--p-text-muted)] space-y-1.5">
                    <li className="flex items-baseline justify-between gap-3">
                      <span>{t("loyaltyAnnualVolumeLabel")}</span>
                      <strong className="text-[var(--p-text)]">
                        {tier.max === Infinity
                          ? `${formatCadWhole(tier.min)}+`
                          : `${formatCadWhole(tier.min)} – ${formatCadWhole(tier.max)}`}
                      </strong>
                    </li>
                    <li className="flex items-baseline justify-between gap-3">
                      <span>{t("loyaltyPlanFreeShort")}</span>
                      <strong className="text-[var(--p-text)]">{String(tier.freeCommissionPct).replace(".", ",")} %</strong>
                    </li>
                    <li className="flex items-baseline justify-between gap-3">
                      <span>{t("loyaltyPlanProShort")}</span>
                      <strong className="text-[var(--p-text)]">
                        {String(tier.proCommissionPct).replace(".", ",")} %
                      </strong>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: t("loyaltyAnnualVolume"), value: formatCadWhole(user ? volume : 0) },
              { label: t("loyaltyCurrentTier"), value: t(TIER_I18N[displayTier.id]) },
              {
                label: t("loyaltyCurrentCommission"),
                value: user
                  ? currentCommissionPct != null
                    ? `${String(currentCommissionPct).replace(".", ",")} %`
                    : "—"
                  : `${t("loyaltyPlanFreeShort")}: ${String(displayTier.freeCommissionPct).replace(".", ",")} % · ${t("loyaltyPlanProShort")}: ${String(displayTier.proCommissionPct).replace(".", ",")} %`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] px-5 py-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{s.label}</p>
                <p className="text-xl font-bold mt-2 text-[var(--p-text)]">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-[var(--p-text)]">{t("loyaltyFeesTitle")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("loyaltyForStudents")}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--p-text-muted)]">
                  <li>{t("loyaltyStudentsFreePlatform")}</li>
                  <li>{t("loyaltyStudentsNoHiddenFee")}</li>
                  <li>{t("loyaltyStudentsPayShownAmount")}</li>
                  <li>{t("loyaltyStudentsPratiqoPaidByTeacherCommission")}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("loyaltyTeacherFreePlan")}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--p-text-muted)]">
                  <li>{t("loyaltyFreeNoSubscription")}</li>
                  <li>{t("loyaltyFreeUpTo5Students")}</li>
                  <li>{t("loyaltyFreeCommission10")}</li>
                  <li>{t("loyaltyFreeBasics")}</li>
                  <li>{t("loyaltyFreeOver5Clarification")}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("loyaltyTeacherProPlan")}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--p-text-muted)]">
                  <li>{t("loyaltyProPrice")}</li>
                  <li>{t("loyaltyProUnlimited")}</li>
                  <li>{t("loyaltyProCommission5")}</li>
                  <li>{t("loyaltyProFeatures")}</li>
                  <li>{t("loyaltyProBilledStripe")}</li>
                  <li>{t("loyaltyProCancelAnytime")}</li>
                  <li>{t("loyaltyProCancelEndOfPeriod")}</li>
                  <li>{t("loyaltyProNoProrataRefund")}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 sm:p-8 space-y-3">
            <h3 className="text-lg font-bold text-[var(--p-text)]">{t("loyaltyHowTitle")}</h3>
            <p className="text-sm text-[var(--p-text-muted)] leading-relaxed">{t("loyaltyHowBody")}</p>
            <p className="text-sm text-[var(--p-text-muted)] leading-relaxed">{t("loyaltyNoCashbackBody")}</p>
          </div>
      </div>
    </div>
  );
}
