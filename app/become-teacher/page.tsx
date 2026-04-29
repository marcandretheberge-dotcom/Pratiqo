"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import Logo from "../../components/ui/Logo";
import { useLocale } from "../../lib/locale-context";

type TierId = "bronze" | "argent" | "or" | "platine";
type Plan = "free" | "pro";

type Tier = {
  id: TierId;
  label: string;
  emoji: string;
  min: number;
  max: number;
  freeCommission: number;
  proCommission: number;
  ristourneBonus: number;
  accent: string;
};

const TIERS: Tier[] = [
  { id: "bronze", label: "Bronze",  emoji: "🥉", min: 0,     max: 5000,    freeCommission: 10, proCommission: 5,   ristourneBonus: 0,   accent: "#CD7F32" },
  { id: "argent", label: "Argent",  emoji: "🥈", min: 5000,  max: 15000,   freeCommission: 9,  proCommission: 4.5, ristourneBonus: 0,   accent: "#B0B0B0" },
  { id: "or",     label: "Or",      emoji: "🥇", min: 15000, max: 30000,   freeCommission: 8,  proCommission: 4,   ristourneBonus: 0.5, accent: "#FFD700" },
  { id: "platine",label: "Platine", emoji: "💎", min: 30000, max: Infinity, freeCommission: 7,  proCommission: 3.5, ristourneBonus: 1,   accent: "#1D9E75" },
];

function tierFromAnnualVolume(volume: number): Tier {
  return TIERS.find((t) => volume >= t.min && volume < t.max) ?? TIERS[0]!;
}

function formatCad(amount: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

const PRO_ANNUAL = 29.99 * 12; // 359.88

export default function BecomeTeacherPage() {
  const { t } = useLocale();
  const [students, setStudents] = useState(6);
  const [avgPrice, setAvgPrice] = useState(55);
  const [coursesPerWeek, setCoursesPerWeek] = useState(6);
  const [calcPlan, setCalcPlan] = useState<Plan>("pro");

  const calc = useMemo(() => {
    const annualGross = students * avgPrice * coursesPerWeek * 52;
    const tier = tierFromAnnualVolume(annualGross);
    const commissionRate = calcPlan === "pro" ? tier.proCommission : tier.freeCommission;
    const annualCommission = annualGross * (commissionRate / 100);
    const proFee = calcPlan === "pro" ? PRO_ANNUAL : 0;
    const ristourneEstPct = tier.ristourneBonus > 0 ? 0.01 + tier.ristourneBonus / 100 : 0.005;
    const annualRistourneEst = calcPlan === "pro" ? annualGross * ristourneEstPct : 0;
    const annualNet = annualGross - annualCommission - proFee + annualRistourneEst;
    const monthlyGross = annualGross / 12;
    return { tier, annualGross, monthlyGross, annualCommission, commissionRate, proFee, annualRistourneEst, annualNet };
  }, [students, avgPrice, coursesPerWeek, calcPlan]);

  return (
    <div className="min-h-[100dvh] bg-[#0f0f0f] text-white">

      {/* ── HEADER ─────────────────────────────── */}
      <header className="bg-[#2C2C2A] border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" variant="light" />
          </Link>
          <Link
            href="/login?role=teacher"
            className="text-sm font-semibold text-white/85 hover:text-white underline underline-offset-4"
          >
            {t("signIn")}
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────── */}
      <section className="bg-[#2C2C2A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-block mb-4 px-3 py-1 rounded-full bg-[#1D9E75]/20 text-[#7FE0C3] text-xs font-bold uppercase tracking-widest">
              Travailleur autonome · Québec & Canada
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              Enseigne sur Pratiqo.
            </h1>
            <p className="text-3xl sm:text-4xl font-bold text-white/60 mt-1">
              Pas un employé. Un partenaire.
            </p>
            <p className="mt-5 text-white/75 text-base sm:text-lg leading-relaxed max-w-xl">
              Fixe tes propres tarifs, horaires et méthodes. Pratiqo s&apos;occupe des paiements, des réservations et de ta visibilité.
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
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <span>2 400+ profs</span>
              <span className="text-white/20">·</span>
              <span>Paiements automatiques</span>
              <span className="text-white/20">·</span>
              <span>Aucune exclusivité</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">Plans disponibles</h2>
          <p className="mt-2 text-white/60 text-sm">
            Commence gratuitement. Passe au Pro quand tu es prêt.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* FREE */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Gratuit</p>
                <p className="mt-1 text-3xl font-bold">0 $</p>
                <p className="text-xs text-white/50 mt-0.5">Pour toujours</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "10% commission par cours",
                  "Maximum 5 élèves actifs",
                  "Profil public géolocalisé",
                  "Wizard d'onboarding",
                  "Gestion des disponibilités",
                  "Paiements Stripe automatiques",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/75">
                    <CheckCircle2 size={15} className="text-white/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=teacher"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 text-sm font-semibold text-white/90 hover:bg-white/5 transition-colors"
              >
                Commencer
              </Link>
            </div>

            {/* PRO */}
            <div className="rounded-3xl border-2 border-[#1D9E75] bg-[#1D9E75]/8 p-6 flex flex-col gap-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#1D9E75] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Recommandé
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7FE0C3]">Pro</p>
                <p className="mt-1 text-3xl font-bold text-white">29,99 $<span className="text-lg font-normal text-white/60">/mois</span></p>
                <p className="text-xs text-white/50 mt-0.5">359,88 $/an</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "5% commission par cours",
                  "Élèves illimités",
                  "Commission dégressive Bronze→Platine",
                  "Ristourne annuelle 5% des profits nets",
                  "Support prioritaire",
                  "Badge Pro visible",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/90">
                    <CheckCircle2 size={15} className="text-[#1D9E75] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=teacher"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-bold text-white hover:brightness-105 transition-all"
              >
                {t("joinFree")}
              </Link>
            </div>

            {/* ENTERPRISE */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Entreprise</p>
                <p className="mt-1 text-3xl font-bold">399 $<span className="text-lg font-normal text-white/60">/an</span></p>
                <p className="text-xs text-amber-400/80 font-semibold mt-0.5">Phase 2 — Liste d&apos;attente</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "Multi-profs sous un compte",
                  "Tableau de bord central",
                  "Statistiques avancées",
                  "Carte studio Google Maps",
                  "Facturation groupée",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckCircle2 size={15} className="text-white/25 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/waitlist"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 text-sm font-semibold text-white/60 hover:text-white/90 transition-colors"
              >
                Rejoindre la liste
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── CALCULATOR ─────────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">Combien peux-tu gagner?</h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                Ajuste les curseurs. La commission baisse automatiquement selon ton volume annuel (programme fidélité).
              </p>

              {/* Plan toggle */}
              <div className="inline-flex rounded-xl bg-white/8 border border-white/10 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setCalcPlan("free")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    calcPlan === "free" ? "bg-white text-[#0f0f0f] shadow" : "text-white/60 hover:text-white/90",
                  )}
                >
                  Plan Gratuit
                </button>
                <button
                  type="button"
                  onClick={() => setCalcPlan("pro")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    calcPlan === "pro" ? "bg-[#1D9E75] text-white shadow" : "text-white/60 hover:text-white/90",
                  )}
                >
                  Plan Pro
                </button>
              </div>

              <div className="mt-4 space-y-6">
                <SliderRow label="Nombre d'élèves" value={students} min={1} max={20} onChange={setStudents} />
                <SliderRow label="Prix moyen par cours ($)" value={avgPrice} min={20} max={150} onChange={setAvgPrice} />
                <SliderRow label="Cours par semaine" value={coursesPerWeek} min={1} max={20} onChange={setCoursesPerWeek} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Niveau fidélité estimé</p>
                  <p className="mt-2 text-2xl font-bold" style={{ color: calc.tier.accent }}>
                    {calc.tier.emoji} {calc.tier.label}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Commission {calc.commissionRate}%
                    {calc.tier.ristourneBonus > 0 && calcPlan === "pro" ? ` · +${calc.tier.ristourneBonus}% ristourne bonus` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Mensuel brut</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatCad(calc.monthlyGross)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Metric label="Revenu annuel brut" value={formatCad(calc.annualGross)} />
                <Metric label={`Commission Pratiqo (${calc.commissionRate}%)`} value={`— ${formatCad(calc.annualCommission)}`} negative />
                {calcPlan === "pro" ? (
                  <Metric label="Abonnement Pro" value={`— ${formatCad(PRO_ANNUAL)}`} negative />
                ) : null}
                {calcPlan === "pro" && calc.annualRistourneEst > 0 ? (
                  <Metric label="Ristourne estimée" value={`+ ${formatCad(calc.annualRistourneEst)}`} accent />
                ) : null}
                <Metric label="Revenu net estimé" value={formatCad(calc.annualNet)} accentStrong />
              </div>

              <Link
                href="/login?role=teacher"
                className="inline-flex w-full h-12 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-bold text-white hover:brightness-105"
              >
                {t("joinFree")}
              </Link>
              <p className="text-xs text-white/40 text-center">
                Estimations indicatives. Ristourne conditionnelle aux profits nets annuels de Pratiqo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMISSION DÉGRESSIVE ──────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Commission dégressive</h2>
            <p className="mt-3 text-white/65 text-sm max-w-2xl leading-relaxed">
              Plus tu enseignes, moins tu paies. La commission s&apos;ajuste en temps réel selon ton volume cumulé annuel.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 text-[11px] uppercase tracking-widest font-bold text-white/40 px-6 py-3 bg-white/5">
              <span>Niveau</span>
              <span>Volume annuel</span>
              <span className="text-center">Gratuit</span>
              <span className="text-center">Pro</span>
            </div>
            {TIERS.map((tier) => (
              <div key={tier.id} className="grid grid-cols-4 px-6 py-4 border-t border-white/8 text-sm hover:bg-white/3 transition-colors">
                <span className="font-bold" style={{ color: tier.accent }}>
                  {tier.emoji} {tier.label}
                </span>
                <span className="text-white/70">
                  {tier.max === Infinity
                    ? `${formatCad(tier.min)} +`
                    : `${formatCad(tier.min)} – ${formatCad(tier.max)}`}
                </span>
                <span className="text-center text-white/70">{tier.freeCommission}%</span>
                <span className="text-center font-semibold" style={{ color: tier.accent }}>
                  {tier.proCommission}%
                  {tier.ristourneBonus > 0 ? (
                    <span className="ml-1 text-[10px] text-[#7FE0C3]">+{tier.ristourneBonus}% rist.</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-[#1D9E75]/25 bg-[#1D9E75]/8 p-6 sm:p-8">
            <p className="text-sm font-bold text-[#7FE0C3]">Ristourne annuelle — 5% des profits nets de Pratiqo</p>
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Chaque année en janvier, Pratiqo redistribue 5% de ses profits nets aux professeurs Pro éligibles.
              Le pool est plafonné à 150 000 $ et activé si au moins 10 profs sont éligibles.
              Chaque prof reçoit au maximum 10 000 $ selon son volume relatif.
            </p>
            <p className="mt-3 text-xs text-white/40">
              Pratiqo ne garantit aucun revenu minimum. Tu es travailleur autonome — tes gains dépendent de ton activité.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">Comment ça marche</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard step="1" title="Crée ton profil en 5 minutes" desc="Photo, disciplines, tarif, disponibilités. Wizard intégré." />
            <StepCard step="2" title="Les élèves te trouvent" desc="Géolocalisation, recherche intelligente, réservation automatique." />
            <StepCard step="3" title="Reçois tes paiements" desc="Virement automatique via Stripe dans les 7 jours ouvrables." />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">Témoignages</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Testimonial name="Sophie M." meta="Piano" quote="J'ai doublé mes élèves en 3 mois. La visibilité est incroyable." />
            <Testimonial name="Karim L." meta="Judo" quote="Les paiements automatiques m'ont sauvé des heures de gestion." />
            <Testimonial name="Elena R." meta="Danse" quote="La commission dégressive m'a vraiment motivée à développer ma clientèle." />
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">FAQ</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FaqItem q="Est-ce vraiment gratuit?" a="Oui. Jusqu'à 5 élèves, aucun abonnement. Commission de 10% uniquement quand tu gagnes." />
            <FaqItem q="Comment fonctionne la commission dégressive?" a="Ta commission baisse automatiquement selon ton volume annuel: 10%→9%→8%→7% (Gratuit) ou 5%→4.5%→4%→3.5% (Pro)." />
            <FaqItem q="C'est quoi la ristourne?" a="5% des profits nets annuels de Pratiqo redistribués aux profs Pro actifs. Plafond 10 000$/prof. Payée en janvier." />
            <FaqItem q="Suis-je employé de Pratiqo?" a="Non. Tu es travailleur autonome. Pratiqo agit uniquement comme intermédiaire technologique. Tu fixes tes tarifs et horaires." />
            <FaqItem q="Puis-je enseigner sur d'autres plateformes?" a="Oui. Aucune exclusivité n'est exigée. Tu restes libre." />
            <FaqItem q="Puis-je offrir des cours à domicile?" a="Oui. Tu fixes ton rayon de déplacement (5-50 km) et ton tarif majoré." />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────── */}
      <section className="bg-[#1D9E75] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Prêt à rejoindre les meilleurs profs?</h2>
            <p className="mt-2 text-white/85">Crée ton compte, publie ton profil, commence à enseigner.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/85">{label}</p>
        <span className="text-xs font-bold text-white/60">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#1D9E75]" />
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/35">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, accentStrong, negative }: { label: string; value: string; accent?: boolean; accentStrong?: boolean; negative?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-white/8 bg-black/15 p-4", accentStrong && "bg-[#1D9E75]/12 border-[#1D9E75]/25")}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      <p className={cn("mt-2 text-lg font-bold", accentStrong ? "text-[#B8F5DC]" : accent ? "text-[#7FE0C3]" : negative ? "text-rose-400" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1D9E75] text-sm font-extrabold">{step}</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">{desc}</p>
    </div>
  );
}

function Testimonial({ name, meta, quote }: { name: string; meta: string; quote: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-white/80 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 text-sm font-bold text-white">{name}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">{meta}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="font-bold text-sm">{q}</p>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">{a}</p>
    </div>
  );
}
