"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import Logo from "../../components/ui/Logo";
import { useLocale } from "../../lib/locale-context";

type TierId = "bronze" | "argent" | "or" | "platine";

type Tier = {
  id: TierId;
  label: string;
  min: number;
  max: number;
  cashbackPct: number;
  commissionPct: number;
  accent: string;
};

const TIERS: Tier[] = [
  { id: "bronze", label: "Bronze", min: 0, max: 5000, cashbackPct: 1, commissionPct: 10, accent: "#CD7F32" },
  { id: "argent", label: "Argent", min: 5000, max: 15000, cashbackPct: 2, commissionPct: 8, accent: "#C0C0C0" },
  { id: "or", label: "Or", min: 15000, max: 30000, cashbackPct: 3, commissionPct: 6, accent: "#FFD700" },
  { id: "platine", label: "Platine", min: 30000, max: Infinity, cashbackPct: 5, commissionPct: 3, accent: "#1D9E75" },
];

function tierFromAnnualVolume(volume: number): Tier {
  const v = Math.max(0, volume);
  return TIERS.find((t) => v >= t.min && v < t.max) ?? TIERS[0]!;
}

function formatCad(amount: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    Math.max(0, amount),
  );
}

export default function BecomeTeacherPage() {
  const { t } = useLocale();
  const [students, setStudents] = useState(6);
  const [avgPrice, setAvgPrice] = useState(55);
  const [coursesPerWeek, setCoursesPerWeek] = useState(6);

  const calc = useMemo(() => {
    const annualGross = students * avgPrice * coursesPerWeek * 52;
    const tier = tierFromAnnualVolume(annualGross);
    const annualCommission = annualGross * (tier.commissionPct / 100);
    const annualCashback = annualGross * (tier.cashbackPct / 100);
    // Ristourne: estimation simple (placeholder) — 5% des profits nets redistribués.
    // Ici on affiche une heuristique conservatrice (ex: 1.5% du volume) pour un ordre de grandeur.
    const annualRistourneEst = annualGross * 0.015;
    const annualNetEst = annualGross - annualCommission + annualCashback + annualRistourneEst;
    const monthlyGross = annualGross / 12;
    return {
      tier,
      annualGross,
      monthlyGross,
      annualCommission,
      annualCashback,
      annualRistourneEst,
      annualNetEst,
    };
  }, [students, avgPrice, coursesPerWeek]);

  return (
    <div className="min-h-[100dvh] bg-[#0f0f0f] text-white">
      {/* HERO */}
      <header className="bg-[#2C2C2A] border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" variant="light" />
          </Link>
          <Link href="/login?role=teacher" className="text-sm font-semibold text-white/85 hover:text-white underline underline-offset-4">
            {t("signIn")}
          </Link>
        </div>
      </header>

      <section className="bg-[#2C2C2A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">Enseigne ce que tu aimes.</h1>
            <p className="mt-5 text-white/80 text-base sm:text-lg leading-relaxed">
              La seule plateforme qui te paie un cashback sur chaque cours ET partage ses profits avec toi.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?role=teacher"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1D9E75] px-7 text-sm font-bold text-white hover:brightness-105"
              >
                {t("startFree")}
              </Link>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Voir la plateforme
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-widest text-white/70">
              <span>2 400+ profs</span>
              <span className="text-white/25">·</span>
              <span>Paiements automatiques</span>
              <span className="text-white/25">·</span>
              <span>Zéro paperasse</span>
            </div>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">Combien peux-tu gagner?</h2>
              <p className="text-white/70 text-sm sm:text-base max-w-xl">
                Ajuste les curseurs pour obtenir une estimation. La commission baisse avec ton niveau Fidélité.
              </p>

              <div className="mt-6 space-y-6">
                <SliderRow
                  label="Nombre d'élèves"
                  value={students}
                  min={1}
                  max={20}
                  onChange={setStudents}
                />
                <SliderRow
                  label="Prix moyen par cours ($)"
                  value={avgPrice}
                  min={20}
                  max={150}
                  onChange={setAvgPrice}
                />
                <SliderRow
                  label="Cours par semaine"
                  value={coursesPerWeek}
                  min={1}
                  max={20}
                  onChange={setCoursesPerWeek}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Niveau fidélité estimé</p>
                  <p className="mt-2 text-2xl font-bold">
                    <span style={{ color: calc.tier.accent }}>{calc.tier.label}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    Commission {calc.tier.commissionPct}% · Cashback {calc.tier.cashbackPct}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Revenu mensuel brut</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatCad(calc.monthlyGross)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Metric label="Revenu mensuel brut" value={formatCad(calc.monthlyGross)} />
                <Metric label="Revenu annuel brut" value={formatCad(calc.annualGross)} />
                <Metric label={`Commission Pratiqo (${calc.tier.commissionPct}%)`} value={`- ${formatCad(calc.annualCommission)}`} />
                <Metric label={`Cashback gagné (${calc.tier.cashbackPct}%)`} value={`+ ${formatCad(calc.annualCashback)}`} accent />
                <Metric label="Ristourne estimée" value={`+ ${formatCad(calc.annualRistourneEst)}`} accent />
                <Metric label="Revenu net annuel estimé" value={formatCad(calc.annualNetEst)} accentStrong />
              </div>

              <div className="pt-2">
                <Link
                  href="/login?role=teacher"
                  className="inline-flex w-full h-12 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-bold text-white hover:brightness-105"
                >
                  {t("joinFree")}
                </Link>
                <p className="mt-2 text-xs text-white/55 text-center">
                  Estimations à titre indicatif. La ristourne dépend des profits nets annuels de Pratiqo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">Comment ça marche</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step="1"
              title="Crée ton profil en 5 minutes"
              desc="Photo, discipline, tarif, disponibilités."
            />
            <StepCard
              step="2"
              title="Les élèves te trouvent"
              desc="Géolocalisation, recherche, réservation automatique."
            />
            <StepCard
              step="3"
              title="Reçois tes paiements"
              desc="Virement automatique, cashback, ristourne."
            />
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 space-y-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Programmes</h2>
            <p className="mt-3 text-white/70 text-sm sm:text-base max-w-2xl">
              Plus tu enseignes, plus tes avantages augmentent: cashback plus élevé et commission plus basse.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-sm font-bold">{t("benefitLoyalty").replace("Bronze → Platine", "").trim()} — Bronze → Platine</p>
            </div>
            <div className="grid grid-cols-4 text-[11px] uppercase tracking-widest font-bold text-white/60 px-6 py-3">
              <span>Niveau</span>
              <span>Volume annuel</span>
              <span>Cashback</span>
              <span>Commission</span>
            </div>
            {TIERS.map((t) => (
              <div key={t.id} className="grid grid-cols-4 px-6 py-4 border-t border-white/10 text-sm">
                <span className="font-semibold" style={{ color: t.accent }}>
                  {t.label}
                </span>
                <span className="text-white/80">
                  {t.max === Infinity ? `${formatCad(t.min)}+` : `${formatCad(t.min)}–${formatCad(t.max)}`}
                </span>
                <span className="text-white/80">{t.cashbackPct}%</span>
                <span className="text-white/80">{t.commissionPct}%</span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="text-sm font-bold">Ristourne annuelle — 5% des profits nets</p>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Chaque année, Pratiqo redistribue une partie de ses profits nets aux profs fidèles. Exemple: si Pratiqo
              réalise 900 000$ de profits nets, le pool de ristourne est de 45 000$. Ton montant dépend de ton volume de
              cours par rapport au volume total éligible.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">Témoignages</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Testimonial name="Sophie M." meta="Piano" quote="J'ai doublé mes élèves en 3 mois." />
            <Testimonial name="Karim L." meta="Judo" quote="Les paiements automatiques m'ont sauvé la vie." />
            <Testimonial name="Elena R." meta="Danse" quote="La ristourne c'est une surprise chaque janvier." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">FAQ</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FaqItem
              q="Est-ce vraiment gratuit?"
              a="Oui, jusqu'à 5 élèves. Commission de 10% seulement quand tu gagnes."
            />
            <FaqItem
              q="Comment fonctionne le cashback?"
              a="Tu gagnes un pourcentage sur chaque transaction selon ton niveau Fidélité."
            />
            <FaqItem
              q="C'est quoi la ristourne?"
              a="5% des profits nets de Pratiqo redistribués aux profs fidèles de l'année."
            />
            <FaqItem
              q="Puis-je offrir des cours à domicile?"
              a="Oui! Tu fixes ton rayon et ton tarif majoré."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#1D9E75] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Prêt à rejoindre les meilleurs profs?</h2>
            <p className="mt-2 text-white/90">Crée ton compte, publie ton profil, commence à enseigner.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/login?role=teacher"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-bold text-[#0F6E56] hover:bg-white/95"
            >
              Rejoindre gratuitement
            </Link>
            <Link
              href="/student/search"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 text-sm font-semibold text-white hover:bg-white/15"
            >
              Voir les profs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/90">{label}</p>
        <span className="text-xs font-bold text-white/70">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#1D9E75]"
      />
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  accentStrong,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentStrong?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/15 p-4", accentStrong && "bg-[#1D9E75]/15 border-[#1D9E75]/25")}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</p>
      <p className={cn("mt-2 text-lg font-bold", accentStrong ? "text-[#B8F5DC]" : accent ? "text-[#7FE0C3]" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-extrabold">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{desc}</p>
    </div>
  );
}

function Testimonial({ name, meta, quote }: { name: string; meta: string; quote: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-white/85 leading-relaxed">“{quote}”</p>
      <p className="mt-4 text-sm font-bold text-white">{name}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/55">{meta}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="font-bold">{q}</p>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{a}</p>
    </div>
  );
}

