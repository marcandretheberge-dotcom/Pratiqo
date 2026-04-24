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

type LoyaltyTab = "fidelite" | "ristourne" | "calculateur" | "rapport";

type TierDef = {
  id: "bronze" | "argent" | "or" | "platine";
  label: string;
  min: number;
  max: number;
  circle: string;
  cashbackPct: number;
  commissionPct: number;
};

const TIERS: TierDef[] = [
  { id: "bronze", label: "Bronze", min: 0, max: 5000, circle: "#CD7F32", cashbackPct: 1, commissionPct: 10 },
  { id: "argent", label: "Argent", min: 5000, max: 15000, circle: "#C0C0C0", cashbackPct: 2, commissionPct: 8 },
  { id: "or", label: "Or", min: 15000, max: 30000, circle: "#FFD700", cashbackPct: 3, commissionPct: 6 },
  { id: "platine", label: "Platine", min: 30000, max: Infinity, circle: "#1D9E75", cashbackPct: 5, commissionPct: 3 },
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

function nextTierProgress(volume: number): { nextLabel: string; remaining: number; pct: number } {
  const v = Math.max(0, volume);
  if (v < 5000) return { nextLabel: "Argent", remaining: Math.max(0, 5000 - v), pct: Math.min(100, (v / 5000) * 100) };
  if (v < 15000) return { nextLabel: "Or", remaining: Math.max(0, 15000 - v), pct: Math.min(100, ((v - 5000) / 10000) * 100) };
  if (v < 30000)
    return { nextLabel: "Platine", remaining: Math.max(0, 30000 - v), pct: Math.min(100, ((v - 15000) / 15000) * 100) };
  return { nextLabel: "Platine", remaining: 0, pct: 100 };
}

type ProfileLoyaltyRow = {
  loyalty_tier: string | null;
  loyalty_annual_volume: number | string | null;
  loyalty_cashback_earned: number | string | null;
  ristourne_months_active: number | string | null;
  plan: string | null;
  active_student_count: number | string | null;
};

const TAB_LABELS: { id: LoyaltyTab; label: string }[] = [
  { id: "fidelite", label: "Fidélité" },
  { id: "ristourne", label: "Ristourne" },
  { id: "calculateur", label: "Calculateur" },
  { id: "rapport", label: "Rapport" },
];

/** Estimation réseau (illustrative) pour l’onglet Ristourne. */
const ESTIMATE_TOTAL_ELIGIBLE_VOLUME = 1_500_000;
const ESTIMATE_NET_PROFIT = 900_000;
const ESTIMATE_ELIGIBLE_TEACHERS = 45;

export default function LoyaltyPage() {
  const { user } = useAuth();
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

  return (
    <div className="max-w-5xl mx-auto pb-12 text-[var(--p-text)]">
      <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-[999px] bg-[var(--p-surface-muted)] border border-[var(--p-border-light)] w-fit max-w-full">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-[#1D9E75] text-white shadow-sm"
                : "text-[var(--p-text-muted)] hover:text-[var(--p-text)] bg-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fidelite" && (
        <div className="space-y-8">
          <div
            className="rounded-3xl p-8 sm:p-10 text-white shadow-xl overflow-hidden relative"
            style={{ backgroundColor: "#0F6E56" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Ton niveau actuel</p>
            {loading ? (
              <p className="mt-4 text-white/80 text-sm">Chargement…</p>
            ) : !user ? (
              <p className="mt-4 text-white/90 text-sm">Connecte-toi pour voir ton niveau fidélité.</p>
            ) : (
              <>
                <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">{displayTier.label}</h2>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-white/70">Volume annuel (cette année)</p>
                    <p className="text-2xl font-bold mt-1">{formatCadWhole(volume)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">Cashback accumulé</p>
                    <p className="text-2xl font-bold mt-1">{formatCadWhole(cashbackEarned)}</p>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="flex justify-between text-xs font-medium text-white/80 mb-2">
                    <span>Progression vers {progress.nextLabel}</span>
                    <span>{formatCadWhole(progress.remaining)} restants</span>
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
            {TIERS.map((t) => {
              const active = t.id === displayTier.id;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-2xl border-2 p-5 bg-[var(--p-surface)] transition-shadow",
                    active ? "border-[#1D9E75] shadow-[0_12px_40px_rgba(29,158,117,0.15)]" : "border-[var(--p-border-light)]",
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full shrink-0 border-2 border-white/40 shadow-inner"
                      style={{ backgroundColor: t.circle }}
                    />
                    <div>
                      <p className="text-lg font-bold">{t.label}</p>
                      <p className="text-[11px] text-[var(--p-text-muted)] font-medium">
                        {t.max === Infinity
                          ? `${formatCadWhole(t.min)}+`
                          : `${formatCadWhole(t.min)} – ${formatCadWhole(t.max)}`}
                      </p>
                    </div>
                  </div>
                  <ul className="text-sm text-[var(--p-text-muted)] space-y-1">
                    <li>
                      <strong className="text-[var(--p-text)]">{t.cashbackPct}%</strong> cashback
                    </li>
                    <li>
                      <strong className="text-[var(--p-text)]">{t.commissionPct}%</strong> commission plateforme
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Cashback gagné", value: formatCadWhole(user ? cashbackEarned : 0) },
              { label: "Volume annuel", value: formatCadWhole(user ? volume : 0) },
              { label: "Transactions", value: "—" },
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
        </div>
      )}

      {tab === "ristourne" && (
        <div className="space-y-6">
          <div
            className="rounded-2xl border border-[rgba(29,158,117,0.35)] px-5 py-4 text-sm leading-relaxed"
            style={{ backgroundColor: "var(--p-light-teal-bg)", color: "var(--p-dark-teal)" }}
          >
            <strong className="text-[var(--p-dark-teal)]">Ristourne annuelle :</strong> jusqu&apos;à{" "}
            <strong>{RISTOURNE_RATE * 100}%</strong> des profits nets de Pratiqo sont mis en pool et redistribués aux
            professeurs éligibles, selon leur volume, avec des plafonds de protection (
            <a href="/legal/cgu#ristourne-5bis-6" className="underline font-semibold">
              CGU 5bis.6
            </a>
            ).
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--p-text)]">Conditions d&apos;éligibilité</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                {checklist.proOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>
                  Plan Pro actif ({plan === "pro" ? monthsCapped : 0}/12 mois)
                  {!checklist.proOk ? (
                    <span className="block text-xs text-[var(--p-text-muted)] mt-0.5">Passe au plan Pro pour cumuler.</span>
                  ) : null}
                </span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.studentsOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>Au moins 1 élève actif / mois (indicateur : {activeStudents} élève(s) actif(s))</span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.cguOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>Aucune violation des CGU</span>
              </li>
              <li className="flex items-start gap-3">
                {checklist.volOk ? (
                  <Check className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                ) : (
                  <X className="text-rose-500 shrink-0 mt-0.5" size={18} />
                )}
                <span>Volume minimum {formatCadWhole(1000)}</span>
              </li>
            </ul>

            <div className="pt-2">
              <div className="flex justify-between text-xs font-semibold text-[var(--p-text-muted)] mb-2">
                <span>Progression annuelle (mois)</span>
                <span>
                  {monthsCapped}/12 complétés
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
              <p className="font-bold">Conditions non remplies</p>
              <p className="text-[var(--p-text-muted)]">
                Complète toutes les cases pour être éligible à la ristourne. Le pool peut être reporté si le quorum
                global n&apos;est pas atteint (voir calculateur).
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border border-[rgba(29,158,117,0.45)] px-5 py-4 text-sm font-medium"
              style={{ backgroundColor: "var(--p-light-teal-bg)", color: "var(--p-dark-teal)" }}
            >
              Tu remplis les conditions personnelles d&apos;éligibilité. La distribution finale dépend aussi du pool
              global et du nombre de profs éligibles (min. {RISTOURNE_MIN_ELIGIBLE_TEACHERS}).
            </div>
          )}

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface-muted)] p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
              Ristourne estimée (illustratif)
            </p>
            <p className="text-3xl font-bold text-[#1D9E75] mt-2">{formatCadWhole(estimateRistourne)}</p>
            <p className="text-xs text-[var(--p-text-muted)] mt-2 max-w-xl">
              Basé sur ton volume ({formatCadWhole(volume)}), un pool réseau indicatif et {ESTIMATE_ELIGIBLE_TEACHERS}{" "}
              profs éligibles. Les montants réels seront communiqués après clôture annuelle.
            </p>
          </div>
        </div>
      )}

      {tab === "calculateur" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <SliderBlock
              label="Ton volume annuel"
              min={0}
              max={50_000}
              step={500}
              value={calcVolume}
              onChange={setCalcVolume}
              format={(v) => formatCadWhole(v)}
            />
            <SliderBlock
              label="Profits nets estimés Pratiqo"
              min={10_000}
              max={500_000}
              step={5000}
              value={calcNetProfit}
              onChange={setCalcNetProfit}
              format={(v) => formatCadWhole(v)}
            />
            <SliderBlock
              label="Nombre de profs éligibles"
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
            <h3 className="text-lg font-bold">Résultats</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">Cashback fidélité</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcCashback)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">Ristourne annuelle (part estimée)</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcRistourne)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">Total gains (estimé)</dt>
                <dd className="text-xl font-bold mt-1">{formatCadWhole(calcCashback + calcRistourne)}</dd>
              </div>
              <div>
                <dt className="text-[var(--p-text-muted)] font-medium">Niveau atteint</dt>
                <dd className="text-xl font-bold mt-1">{calcTier.label}</dd>
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
                Ristourne non activée — minimum {RISTOURNE_MIN_ELIGIBLE_TEACHERS} profs requis. Pool reporté à
                l&apos;année suivante.
              </div>
            ) : null}
            <div className="rounded-xl border border-[var(--p-border-light)] bg-[var(--p-surface-muted)] px-4 py-3 text-sm text-[var(--p-text)]">
              <strong>Pool effectif :</strong> MIN({formatCadWhole(poolTheoretical)}, {formatCadWhole(RISTOURNE_POOL_MAX)}) ={" "}
              <strong className="text-[#1D9E75]">{formatCadWhole(poolEffective)}</strong>
            </div>
            {hitsCap ? (
              <div className="rounded-xl border-l-4 border-amber-500 bg-[var(--p-watch-bg)] px-4 py-3 text-sm text-[var(--p-text)]">
                Plafond par professeur atteint ({formatCadWhole(RISTOURNE_PER_PROF_MAX)}). Brut calculé :{" "}
                {formatCadWhole(calcUncapped)}.
              </div>
            ) : null}
            {belowMin ? (
              <div className="rounded-xl border border-amber-200 bg-[var(--p-watch-bg)] px-4 py-3 text-xs text-[var(--p-text-muted)]">
                Part inférieure à {formatCadWhole(RISTOURNE_PER_PROF_MIN)} : versement reporté (CGU).
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === "rapport" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">Rapport annuel</p>
            <h3 className="text-2xl font-bold mt-2 text-[var(--p-text)]">Rapport disponible en janvier 2027</h3>
            <p className="text-sm text-[var(--p-text-muted)] mt-3 max-w-md mx-auto">
              Les agrégats définitifs, le pool redistribué et la liste des professeurs éligibles seront publiés après la
              clôture de l&apos;exercice.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6">
            <h4 className="text-sm font-bold text-[var(--p-text)] mb-4">Contenu prévu du rapport</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--p-text-muted)]">
              <li>Revenus totaux</li>
              <li>Coûts d&apos;exploitation</li>
              <li>Profits nets redistribuables</li>
              <li>Ristourne totale distribuée</li>
              <li>Nombre de profs éligibles</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-6">
            <h4 className="text-sm font-bold text-[var(--p-text)] mb-3">Règles de protection financière</h4>
            <ul className="space-y-2 text-sm text-[var(--p-text-muted)]">
              <li>
                <strong className="text-[var(--p-text)]">Pool max :</strong> {formatCadWhole(RISTOURNE_POOL_MAX)}/an
              </li>
              <li>
                <strong className="text-[var(--p-text)]">Plafond / prof :</strong> {formatCadWhole(RISTOURNE_PER_PROF_MAX)}
              </li>
              <li>
                <strong className="text-[var(--p-text)]">Minimum</strong> {RISTOURNE_MIN_ELIGIBLE_TEACHERS} profs
                éligibles pour activer la ristourne
              </li>
              <li>
                <strong className="text-[var(--p-text)]">Report</strong> si les conditions ne sont pas remplies (voir CGU)
              </li>
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
