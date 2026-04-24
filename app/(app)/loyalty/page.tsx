"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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

export default function LoyaltyPage() {
  const [netProfit, setNetProfit] = useState(1_000_000);
  const [eligibleTeachers, setEligibleTeachers] = useState(12);
  const [totalEligibleVolume, setTotalEligibleVolume] = useState(500_000);
  const [teacherVolume, setTeacherVolume] = useState(50_000);

  const poolTheoretical = useMemo(() => netProfit * RISTOURNE_RATE, [netProfit]);
  const poolEffective = useMemo(() => calculateRistournePool(netProfit), [netProfit]);
  const activated = useMemo(() => isRistourneActivated(eligibleTeachers), [eligibleTeachers]);
  const teacherAmount = useMemo(
    () => calculateTeacherRistourne(teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers),
    [teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers],
  );
  const teacherUncapped = useMemo(
    () => calculateTeacherRistourneUncapped(teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers),
    [teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers],
  );
  const hitsCap = useMemo(
    () => teacherRistourneHitsPerProfCap(teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers),
    [teacherVolume, totalEligibleVolume, netProfit, eligibleTeachers],
  );
  const belowMinPayout = activated && teacherAmount > 0 && teacherAmount < RISTOURNE_PER_PROF_MIN;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">Programme professeurs</p>
        <h1 className="text-3xl font-bold text-[var(--p-text)] tracking-tight">Fidélité & ristourne annuelle</h1>
        <p className="mt-3 text-sm text-[var(--p-text-muted)] leading-relaxed">
          Transparence sur le pool de ristourne et les protections financières. Les montants sont indicatifs (CAD).
        </p>
        <Link
          href="/loyalty/rapport"
          className="inline-block mt-4 text-sm font-semibold text-[#1D9E75] hover:underline"
        >
          Voir le rapport détaillé →
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[var(--p-text)]">Protections financières</h2>
        <ul className="text-sm text-[var(--p-text-muted)] space-y-2 list-disc pl-5">
          <li>
            <strong className="text-[var(--p-text)]">Pool maximum :</strong> MIN(profits nets × 5 %, 150 000 $)
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Plafond par prof :</strong> 10 000 $
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Minimum 10 profs éligibles requis</strong> pour activer la
            ristourne
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Minimum 25 $</strong> par prof pour déclencher un versement (sinon
            report, voir CGU)
          </li>
        </ul>
        {!activated ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 font-medium"
          >
            Pool reporté à l&apos;année suivante : moins de {RISTOURNE_MIN_ELIGIBLE_TEACHERS} professeurs éligibles.
          </div>
        ) : null}
      </section>

      <section id="calculateur" className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[var(--p-text)]">Calculateur</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-semibold text-[var(--p-text)]">Profits nets Pratiqo (CAD)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={netProfit}
              onChange={(e) => setNetProfit(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-[var(--p-text)]">Professeurs éligibles</span>
            <input
              type="number"
              min={0}
              step={1}
              value={eligibleTeachers}
              onChange={(e) => setEligibleTeachers(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-[var(--p-text)]">Volume total éligible (CAD)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={totalEligibleVolume}
              onChange={(e) => setTotalEligibleVolume(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-[var(--p-text)]">Volume du prof concerné (CAD)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={teacherVolume}
              onChange={(e) => setTeacherVolume(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {eligibleTeachers < RISTOURNE_MIN_ELIGIBLE_TEACHERS ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-1"
          >
            <p className="font-bold">Ristourne non activée — minimum {RISTOURNE_MIN_ELIGIBLE_TEACHERS} profs requis</p>
            <p>Pool reporté à l&apos;année suivante.</p>
          </div>
        ) : null}

        <div className="rounded-xl bg-[#E1F5EE] border border-[rgba(29,158,117,0.35)] p-4 text-sm space-y-2">
          <p>
            <strong className="text-[var(--p-text)]">Pool théorique (5 %) :</strong>{" "}
            {formatCadWhole(poolTheoretical)}
          </p>
          <p>
            <strong className="text-[var(--p-text)]">Pool effectif :</strong> MIN({formatCadWhole(poolTheoretical)},{" "}
            {formatCadWhole(RISTOURNE_POOL_MAX)}) = <span className="text-[#0f6e56] font-bold">{formatCadWhole(poolEffective)}</span>
          </p>
          <p>
            <strong className="text-[var(--p-text)]">Ristourne activée :</strong> {activated ? "Oui" : "Non"}
          </p>
          <p>
            <strong className="text-[var(--p-text)]">Part du prof (plafonnée à {formatCadWhole(RISTOURNE_PER_PROF_MAX)}):</strong>{" "}
            <span className="font-bold text-[#0f6e56]">{formatCadWhole(teacherAmount)}</span>
            {hitsCap ? (
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-[#1D9E75]">
                (plafond {formatCadWhole(RISTOURNE_PER_PROF_MAX)} atteint — brut {formatCadWhole(teacherUncapped)})
              </span>
            ) : null}
          </p>
          {belowMinPayout ? (
            <p className="text-amber-900 font-medium text-xs">
              Montant calculé sous {formatCadWhole(RISTOURNE_PER_PROF_MIN)} : versement reporté à l&apos;année suivante
              (CGU).
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
