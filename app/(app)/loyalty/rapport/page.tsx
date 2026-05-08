import type { Metadata } from "next";
import Link from "next/link";
import {
  RISTOURNE_CUMULATIVE_POOL_MAX,
  RISTOURNE_MIN_ELIGIBLE_TEACHERS,
  RISTOURNE_PER_PROF_MAX,
  RISTOURNE_PER_PROF_MIN,
  RISTOURNE_POOL_MAX,
  RISTOURNE_RATE,
  formatCadWhole,
} from "../../../../lib/loyalty";

export const metadata: Metadata = {
  title: "Rapport ristourne | Pratiqo",
  description: "Règles et protections du programme de ristourne Pratiqo.",
};

export default function LoyaltyRapportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <Link href="/loyalty" className="text-sm font-semibold text-teal-700 hover:underline">
          ← Fidélité & calculateur
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-[var(--p-text)] tracking-tight">Rapport — programme de ristourne</h1>
        <p className="mt-3 text-sm text-[var(--p-text-muted)]">
          Synthèse des règles applicables au pool annuel et aux versements aux professeurs éligibles.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[var(--p-text)] border-l-4 border-teal-500 pl-3">
          Règles de protection financière
        </h2>
        <ul className="text-sm text-[var(--p-text-muted)] space-y-3 list-disc pl-5">
          <li>
            <strong className="text-[var(--p-text)]">Pool maximum :</strong> {formatCadWhole(RISTOURNE_POOL_MAX)} par
            année civile (plafond du montant redistribué), calculé comme MIN(profits nets × {RISTOURNE_RATE * 100} %,{" "}
            {formatCadWhole(RISTOURNE_POOL_MAX)}).
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Plafond par prof :</strong> {formatCadWhole(RISTOURNE_PER_PROF_MAX)}{" "}
            maximum ; versement minimum {formatCadWhole(RISTOURNE_PER_PROF_MIN)} (sinon report d&apos;année en année,
            voir CGU).
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Minimum {RISTOURNE_MIN_ELIGIBLE_TEACHERS} profs éligibles</strong>{" "}
            requis pour activer la ristourne sur l&apos;exercice.
          </li>
          <li>
            <strong className="text-[var(--p-text)]">Report possible :</strong> si les conditions ne sont pas remplies
            (moins de 10 profs éligibles, etc.), le pool est conservé par Pratiqo et reporté à l&apos;année suivante, avec
            un plafond cumulatif de {formatCadWhole(RISTOURNE_CUMULATIVE_POOL_MAX)} (pool reporté + pool courant, voir
            CGU section 5bis.6).
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-sm text-[var(--p-text-muted)] space-y-3">
        <p>
          Les montants et pourcentages sont donnés à titre indicatif. Les conditions définitives de versement figurent
          dans les{" "}
          <Link href="/legal/cgu#ristourne-5bis-6" className="text-teal-700 font-semibold hover:underline">
            CGU (section 5bis.6)
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
