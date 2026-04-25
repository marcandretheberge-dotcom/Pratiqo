"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { cn } from "../../../lib/utils";
import {
  RISTOURNE_MIN_ELIGIBLE_TEACHERS,
  RISTOURNE_PER_PROF_MAX,
  RISTOURNE_PER_PROF_MIN,
  RISTOURNE_POOL_MAX,
  RISTOURNE_RATE,
  calculateRistournePool,
  calculateTeacherRistourne,
  calculateTeacherRistourneUncapped,
  formatCadWhole,
  isRistourneActivated,
  teacherRistourneHitsPerProfCap,
} from "../../../lib/loyalty";
import { useLocale } from "../../../lib/locale-context";
import type { TranslationKey } from "../../../lib/translations";

type LoyaltyTab = "fidelite" | "ristourne" | "calculateur" | "rapport";

type TierId = "bronze" | "argent" | "or" | "platine";

type TierDef = {
  id: TierId;
  min: number;
  max: number;
  circle: string;
  cashbackPct: number;
  commissionPct: number;
};

const TIER_I18N: Record<TierId, TranslationKey> = {
  bronze: "tierBronze",
  argent: "tierSilver",
  or: "tierGold",
  platine: "tierPlatinum",
};

const TIERS: TierDef[] = [
  { id: "bronze", min: 0, max: 5000, circle: "#CD7F32", cashbackPct: 1, commissionPct: 10 },
  { id: "argent", min: 5000, max: 15000, circle: "#C0C0C0", cashbackPct: 2, commissionPct: 8 },
  { id: "or", min: 15000, max: 30000, circle: "#FFD700", cashbackPct: 3, commissionPct: 6 },
  { id: "platine", min: 30000, max: Infinity, circle: "#1D9E75", cashbackPct: 5, commissionPct: 3 },
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

const TAB_KEYS: { id: LoyaltyTab; labelKey: TranslationKey }[] = [
  { id: "fidelite", labelKey: "loyaltyFidelity" },
  { id: "ristourne", labelKey: "loyaltyRistourneTab" },
  { id: "calculateur", labelKey: "loyaltyCalculator" },
  { id: "rapport", labelKey: "loyaltyReport" },
];

/** Estimation réseau (illustrative) pour l’onglet Ristourne. */
const ESTIMATE_TOTAL_ELIGIBLE_VOLUME = 1_500_000;
const ESTIMATE_NET_PROFIT = 900_000;
const ESTIMATE_ELIGIBLE_TEACHERS = 45;

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [tab, setTab] = useState<LoyaltyTab>("fidelite");
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProfileLoyaltyRow | null>(null);

  const [calcVolume, setCalcVolume] = useState(20_000);
  const [calcNetProfit, setCalcNetProfit] = useState(250_000);
  const [calcEligibleProfs, setCalcEligibleProfs] = useState(25);

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
  const cashbackEarned = Number(row?.loyalty_cashback_earned ?? 0);
  const monthsRaw = Math.max(0, Math.floor(Number(row?.ristourne_months_active ?? 0)));
  const monthsCapped = Math.min(monthsRaw, 12);
  const plan = (row?.plan || "free").toLowerCase();
  const activeStudents = Math.max(0, Math.floor(Number(row?.active_student_count ?? 0)));
  const tierId = normalizeTierId(row?.loyalty_tier);
  const displayTier = tierById(tierId);
  const progress = nextTierProgress(volume);

  const checklist = useMemo(() => {
    const proOk = plan === "pro";
    const studentsOk = activeStudents >= 1;
    const cguOk = true;
    const volOk = volume >= 1000;
    return {
      proOk,
      studentsOk,
      cguOk,
      volOk,
      allOk: proOk && studentsOk && cguOk && volOk,
    };
  }, [plan, activeStudents, volume]);

  const estimateRistourne = useMemo(
    () =>
      calculateTeacherRistourne(
        volume,
        ESTIMATE_TOTAL_ELIGIBLE_VOLUME,
        ESTIMATE_NET_PROFIT,
        ESTIMATE_ELIGIBLE_TEACHERS,
      ),
    [volume],
  );

  const calcTier = useMemo(() => tierFromVolume(calcVolume), [calcVolume]);
  const calcCashback = calcVolume * (calcTier.cashbackPct / 100);
  const totalEligibleVolModel = Math.max(calcVolume * calcEligibleProfs, 1);
  const calcRistourne = calculateTeacherRistourne(
    calcVolume,
    totalEligibleVolModel,
    calcNetProfit,
    calcEligibleProfs,
  );
  const poolTheoretical = calcNetProfit * RISTOURNE_RATE;
  const poolEffective = calculateRistournePool(calcNetProfit);
  const ristourneActivated = isRistourneActivated(calcEligibleProfs);
  const calcUncapped = calculateTeacherRistourneUncapped(
    calcVolume,
    totalEligibleVolModel,
    calcNetProfit,
    calcEligibleProfs,
  );
  const hitsCap = teacherRistourneHitsPerProfCap(
    calcVolume,
    totalEligibleVolModel,
    calcNetProfit,
    calcEligibleProfs,
  );
  const belowMin = ristourneActivated && calcRistourne > 0 && calcRistourne < RISTOURNE_PER_PROF_MIN;

  const nextTierName = (id: TierId | null) => (id ? t(TIER_I18N[id]) : t("tierPlatinum"));

  return (
    <div className="max-w-5xl mx-auto pb-12 text-[var(--p-text)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--p-text)] mb-6">{t("loyaltyTitle")}</h1>
      <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-[999px] bg-[var(--p-surface-muted)] border border-[var(--p-border-light)] w-fit max-w-full">
        {TAB_KEYS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            onClick={() => setTab(tabDef.id)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
              tab === tabDef.id
                ? "bg-[#1D9E75] text-white shadow-sm"
                : "text-[var(--p-text-muted)] hover:text-[var(--p-text)] bg-transparent",
            )}
          >
            {t(tabDef.labelKey)}
          </button>
        ))}
      </div>

      {tab === "fidelite" && (
        <div className="space-y-8">
          <div
            className="rounded-3xl p-8 sm:p-10 text-white shadow-xl overflow-hidden relative"
            style={{ backgroundColor: "#0F6E56" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">{t("loyaltyCurrentLevel")}</p>
            {loading ? (
              <p className="mt-4 text-white/80 text-sm">{t("loading")}</p>
            ) : !user ? (
              <p className="mt-4 text-white/90 text-sm">{t("loyaltyLoginPrompt")}</p>
            ) : (
              <>
                <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">{t(TIER_I18N[displayTier.id])}</h2>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-white/70">
                      {t("loyaltyAnnualVolume")} {t("loyaltyAnnualVolumeYearNote")}
                    </p>
                    <p className="text-2xl font-bold mt-1">{formatCadWhole(volume)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">{t("loyaltyCashbackAccumulated")}</p>
                    <p className="text-2xl font-bold mt-1">{formatCadWhole(cashbackEarned)}</p>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="flex justify-between text-xs font-medium text-white/80 mb-2">
                    <span>
                      {t("loyaltyProgressToward")} {nextTierName(progress.nextTierId)}
                    </span>
                    <span>
                      {formatCadWhole(progress.remaining)} {t("loyaltyNextTier")} {nextTierName(progress.nextTierId)}
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
                    active ? "border-[#1D9E75] shadow-[0_12px_40px_rgba(29,158,117,0.15)]" : "border-[var(--p-border-light)]",
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
                  <ul className="text-sm text-[var(--p-text-muted)] space-y-1">
                    <li>
                      <strong className="text-[var(--p-text)]">
                        {t("loyaltyTierCashbackLine").replace("{pct}", String(tier.cashbackPct))}
                      </strong>
                    </li>
                    <li>
                      <strong className="text-[var(--p-text)]">
                        {t("loyaltyTierCommissionLine").replace("{pct}", String(tier.commissionPct))}
                      </strong>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { labelKey: "loyaltyCashback" as const, value: formatCadWhole(user ? cashbackEarned : 0) },
              { labelKey: "loyaltyAnnualVolume" as const, value: formatCadWhole(user ? volume : 0) },
              { labelKey: "loyaltyTransactions" as const, value: "—" },
            ].map((s) => (
              <div
                key={s.labelKey}
                className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] px-5 py-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t(s.labelKey)}</p>
                <p className="text-xl font-bold mt-2 text-[var(--p-text)]">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "ristourne" && (
        <div className="space-y-6">
          <div
            className="rounded-2xl border border-[rgba(29,158,117,0.35)] px-5 py-4 text-sm leading-relaxed"
            style={{ backgroundColor: "var(--p-light-teal-bg)", color: "var(--p-dark-teal)" }}
          >
            <strong className="text-[var(--p-dark-teal)]">{t("loyaltyRistourne")}:</strong> {t("loyaltyRistourneUpTo")}{" "}
            <strong>{RISTOURNE_RATE * 100}%</strong> {t("loyaltyRistourneCguMid")}
            <a href="/legal/cgu#ristourne-5bis-6" className="underline font-semibold">
              {t("loyaltyCguLink")}
            </a>
            {t("loyaltyRistourneCguEnd")}
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--p-text)]">{t("loyaltyEligibilityTitle")}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                {checklist.proOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>
                  {t("loyaltyPlanProLine").replace("{months}", String(plan === "pro" ? monthsCapped : 0))}
                  {!checklist.proOk ? (
                    <span className="block text-xs text-[var(--p-text-muted)] mt-0.5">{t("loyaltyUpgradeProHint")}</span>
                  ) : null}
                </span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.studentsOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>{t("loyaltyActiveStudentsLine").replace("{n}", String(activeStudents))}</span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.cguOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>{t("loyaltyCguCleanLine")}</span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.volOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>{t("loyaltyMinVolumeLine").replace("{amount}", formatCadWhole(1000))}</span>
              </li>
            </ul>

            <div className="pt-2">
              <div className="flex justify-between text-xs font-semibold text-[var(--p-text-muted)] mb-2">
                <span>{t("loyaltyProgressYearTitle")}</span>
                <span>
                  {monthsCapped}/12 {t("loyaltyProgressYearSuffix")}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--color-background-secondary)] overflow-hidden border border-[var(--p-border-light)]">
                <div
                  className="h-full rounded-full bg-[#1D9E75] transition-all"
                  style={{ width: `${(monthsCapped / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {!checklist.allOk ? (
            <div
              className="rounded-2xl border-l-4 px-5 py-4 text-sm space-y-1"
              style={{
                borderLeftColor: "var(--p-watch-border)",
                backgroundColor: "var(--p-watch-bg)",
                color: "var(--p-text)",
              }}
            >
              <p className="font-bold">{t("loyaltyConditionsUnmetTitle")}</p>
              <p className="text-[var(--p-text-muted)]">{t("loyaltyConditionsUnmetBody")}</p>
            </div>
          ) : (
            <div
              className="rounded-2xl border border-[rgba(29,158,117,0.45)] px-5 py-4 text-sm font-medium space-y-2"
              style={{ backgroundColor: "var(--p-light-teal-bg)", color: "var(--p-dark-teal)" }}
            >
              <p className="font-bold">{t("loyaltyEligible")}</p>
              <p>{t("loyaltyEligibleBody").replace("{min}", String(RISTOURNE_MIN_ELIGIBLE_TEACHERS))}</p>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface-muted)] p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("loyaltyEstimateTitle")}</p>
            <p className="text-3xl font-bold text-[#1D9E75] mt-2">{formatCadWhole(estimateRistourne)}</p>
            <p className="text-xs text-[var(--p-text-muted)] mt-2 max-w-xl">
              {t("loyaltyEstimateFoot")
                .replace("{volume}", formatCadWhole(volume))
                .replace("{teachers}", String(ESTIMATE_ELIGIBLE_TEACHERS))}
            </p>
          </div>
        </div>
      )}

      {tab === "calculateur" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <SliderBlock
              label={t("loyaltyCalcYourVolume")}
              min={0}
              max={50_000}
              step={500}
              value={calcVolume}
              onChange={setCalcVolume}
              format={(v) => formatCadWhole(v)}
            />
            <SliderBlock
              label={t("loyaltyCalcNetProfit")}
              min={10_000}
              max={500_000}
              step={5000}
              value={calcNetProfit}
              onChange={setCalcNetProfit}
              format={(v) => formatCadWhole(v)}
            />
            <SliderBlock
              label={t("loyaltyCalcEligibleTeachers")}
              min={1}
              max={500}
              step={1}
              value={calcEligibleProfs}
              onChange={setCalcEligibleProfs}
              format={(v) => String(v)}
            />
          </div>

          <div
            className="rounded-3xl border border-[rgba(29,158,117,0.4)] p-6 sm:p-8 space-y-4 text-[var(--p-dark-teal)]"
            style={{ backgroundColor: "var(--p-light-teal-bg)" }}
          >
            <h3 className="text-lg font-bold">{t("loyaltyResultsTitle")}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">{t("loyaltyResultCashbackFidelity")}</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcCashback)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">{t("loyaltyResultRistourneAnnual")}</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcRistourne)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">{t("loyaltyResultTotalGains")}</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcCashback + calcRistourne)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">{t("loyaltyResultTierReached")}</dt>
                <dd className="text-xl font-bold mt-1">{t(TIER_I18N[calcTier.id])}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            {calcEligibleProfs < RISTOURNE_MIN_ELIGIBLE_TEACHERS ? (
              <div
                className="rounded-xl border-l-4 px-4 py-3 text-sm font-semibold"
                style={{
                  borderLeftColor: "var(--p-watch-border)",
                  backgroundColor: "var(--p-watch-bg)",
                  color: "var(--p-text)",
                }}
              >
                {t("loyaltyRistourneNotActivated").replace("{min}", String(RISTOURNE_MIN_ELIGIBLE_TEACHERS))}
              </div>
            ) : null}
            <div className="rounded-xl border border-[var(--p-border-light)] bg-[var(--p-surface-muted)] px-4 py-3 text-sm text-[var(--p-text)]">
              <strong>{t("loyaltyPoolEffectiveLine")}</strong>{" "}
              {t("loyaltyPoolEffectiveFormula")
                .replace("{a}", formatCadWhole(poolTheoretical))
                .replace("{b}", formatCadWhole(RISTOURNE_POOL_MAX))}{" "}
              <strong className="text-[#1D9E75]">{formatCadWhole(poolEffective)}</strong>
            </div>
            {hitsCap ? (
              <div className="rounded-xl border-l-4 border-amber-500 bg-[var(--p-watch-bg)] px-4 py-3 text-sm text-[var(--p-text)]">
                {t("loyaltyCapHitLine")
                  .replace("{cap}", formatCadWhole(RISTOURNE_PER_PROF_MAX))
                  .replace("{raw}", formatCadWhole(calcUncapped))}
              </div>
            ) : null}
            {belowMin ? (
              <div className="rounded-xl border border-amber-200 bg-[var(--p-watch-bg)] px-4 py-3 text-xs text-[var(--p-text-muted)]">
                {t("loyaltyBelowMinLine").replace("{min}", formatCadWhole(RISTOURNE_PER_PROF_MIN))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === "rapport" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("loyaltyReportAnnualTitle")}</p>
            <h3 className="text-2xl font-bold mt-2 text-[var(--p-text)]">{t("loyaltyReportAvailableTitle")}</h3>
            <p className="text-sm text-[var(--p-text-muted)] mt-3 max-w-md mx-auto">{t("loyaltyReportAvailableBody")}</p>
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6">
            <h4 className="text-sm font-bold text-[var(--p-text)] mb-4">{t("loyaltyReportPlannedTitle")}</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--p-text-muted)]">
              <li>{t("loyaltyReportPlannedItem1")}</li>
              <li>{t("loyaltyReportPlannedItem2")}</li>
              <li>{t("loyaltyReportPlannedItem3")}</li>
              <li>{t("loyaltyReportPlannedItem4")}</li>
              <li>{t("loyaltyReportPlannedItem5")}</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-6">
            <h4 className="text-sm font-bold text-[var(--p-text)] mb-3">{t("loyaltyFinanceRulesTitle")}</h4>
            <ul className="space-y-2 text-sm text-[var(--p-text-muted)]">
              <li>
                <strong className="text-[var(--p-text)]">{t("loyaltyRulePoolMax")}</strong> {formatCadWhole(RISTOURNE_POOL_MAX)}/an
              </li>
              <li>
                <strong className="text-[var(--p-text)]">{t("loyaltyRuleCapProf")}</strong> {formatCadWhole(RISTOURNE_PER_PROF_MAX)}
              </li>
              <li>{t("loyaltyRuleMinProfs").replace("{min}", String(RISTOURNE_MIN_ELIGIBLE_TEACHERS))}</li>
              <li>{t("loyaltyRuleDefer")}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderBlock({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <label className="block rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-5">
      <div className="flex justify-between items-baseline gap-4 mb-3">
        <span className="text-sm font-bold text-[var(--p-text)]">{label}</span>
        <span className="text-lg font-bold text-[#1D9E75] tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full accent-[#1D9E75] bg-[var(--color-background-secondary)]"
      />
      <div className="flex justify-between text-[10px] text-[var(--p-text-subtle)] mt-2 font-medium uppercase tracking-wide">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </label>
  );
}
