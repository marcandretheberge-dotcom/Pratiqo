"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
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
  { id: "platine",label: "Platine", emoji: "💎", min: 30000, max: Infinity, freeCommission: 7,  proCommission: 3.5, ristourneBonus: 1,   accent: "#50BEB2" },
];

function tierFromAnnualVolume(volume: number): Tier {
  return TIERS.find((t) => volume >= t.min && volume < t.max) ?? TIERS[0]!;
}

function formatCad(amount: number): string {
  return new Intl.NumberFormat("fr", {
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
  const [businessWaitlistOpen, setBusinessWaitlistOpen] = useState(false);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistOrganization, setWaitlistOrganization] = useState("");
  const [waitlistRole, setWaitlistRole] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "success" | "error">("idle");

  const submitBusinessWaitlist = async () => {
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistStatus("error");
      return;
    }
    setWaitlistBusy(true);
    setWaitlistStatus("idle");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          feature: "business_plan",
          name: waitlistName.trim() || undefined,
          organization: waitlistOrganization.trim() || undefined,
          role: waitlistRole.trim() || undefined,
          message: waitlistMessage.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) throw new Error(payload.error || t("businessWaitlistError"));
      setWaitlistStatus("success");
      setWaitlistName("");
      setWaitlistEmail("");
      setWaitlistOrganization("");
      setWaitlistRole("");
      setWaitlistMessage("");
    } catch {
      setWaitlistStatus("error");
    } finally {
      setWaitlistBusy(false);
    }
  };

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
            <PratiqoLogo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitcher variant="dark" compact />
            <Link
              href="/login?role=teacher"
              className="text-sm font-semibold text-white/85 hover:text-white underline underline-offset-4"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────── */}
      <section className="bg-[#2C2C2A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-block mb-4 px-3 py-1 rounded-full bg-teal-600/20 text-[#7FE0C3] text-xs font-bold uppercase tracking-widest">
              {t("btHeroBadge")}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              {t("btHeroH1")}
            </h1>
            <p className="text-3xl sm:text-4xl font-bold text-white/60 mt-1">
              {t("btHeroH1Sub")}
            </p>
            <p className="mt-5 text-white/75 text-base sm:text-lg leading-relaxed max-w-xl">
              {t("btHeroSub")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?role=teacher"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-teal-600 px-7 text-sm font-bold text-white hover:brightness-105"
              >
                {t("startFree")}
              </Link>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                {t("btHeroCtaSecondary")}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <span>{t("btHeroStats1")}</span>
              <span className="text-white/20">·</span>
              <span>{t("btHeroStats2")}</span>
              <span className="text-white/20">·</span>
              <span>{t("btHeroStats3")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{t("btPlansTitle")}</h2>
          <p className="mt-2 text-white/60 text-sm">
            {t("btPlansSub")}
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* FREE */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{t("btPlanFreeLabel")}</p>
                <p className="mt-1 text-3xl font-bold">{t("btPlanFreePrice")}</p>
                <p className="text-xs text-white/50 mt-0.5">{t("btPlanFreeForever")}</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  t("btPlanFreeF1"),
                  t("btPlanFreeF2"),
                  t("btPlanFreeF3"),
                  t("btPlanFreeF4"),
                  t("btPlanFreeF5"),
                  t("btPlanFreeF6"),
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
                {t("btPlanFreeBtn")}
              </Link>
            </div>

            {/* PRO */}
            <div className="rounded-3xl border-2 border-teal-500 bg-teal-600/8 p-6 flex flex-col gap-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {t("btPlanProRecommended")}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7FE0C3]">{t("btPlanProLabel")}</p>
                <p className="mt-1 text-3xl font-bold text-white">{t("btPlanProPrice")}<span className="text-lg font-normal text-white/60">{t("btPlanProMonth")}</span></p>
                <p className="text-xs text-white/50 mt-0.5">{t("btPlanProAnnualPrice")}</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  t("btPlanProF1"),
                  t("btPlanProF2"),
                  t("btPlanProF3"),
                  t("btPlanProF4"),
                  t("btPlanProF5"),
                  t("btPlanProF6"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/90">
                    <CheckCircle2 size={15} className="text-teal-700 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=teacher"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-teal-600 text-sm font-bold text-white hover:brightness-105 transition-all"
              >
                {t("joinFree")}
              </Link>
            </div>

            {/* ENTERPRISE */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{t("btPlanEntLabel")}</p>
                <p className="mt-1 text-3xl font-bold">{t("btPlanEntPrice")}<span className="text-lg font-normal text-white/60">{t("btPlanEntYear")}</span></p>
                <p className="text-xs text-amber-400/80 font-semibold mt-0.5">{t("btPlanEntPhase")}</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  t("btPlanEntF1"),
                  t("btPlanEntF2"),
                  t("btPlanEntF3"),
                  t("btPlanEntF4"),
                  t("btPlanEntF5"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckCircle2 size={15} className="text-white/25 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setBusinessWaitlistOpen((open) => !open);
                  setWaitlistStatus("idle");
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 text-sm font-semibold text-white/60 hover:text-white/90 transition-colors"
              >
                {t("joinBusinessWaitlist")}
              </button>
              {businessWaitlistOpen ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-white">{t("businessWaitlistTitle")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{t("businessWaitlistSubtitle")}</p>
                  </div>
                  <div className="grid gap-2">
                    <input
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder={t("waitlistName")}
                      className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-teal-500"
                    />
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder={t("waitlistEmail")}
                      className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-teal-500"
                    />
                    <input
                      value={waitlistOrganization}
                      onChange={(e) => setWaitlistOrganization(e.target.value)}
                      placeholder={t("waitlistOrganization")}
                      className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-teal-500"
                    />
                    <input
                      value={waitlistRole}
                      onChange={(e) => setWaitlistRole(e.target.value)}
                      placeholder={t("waitlistRole")}
                      className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-teal-500"
                    />
                    <textarea
                      value={waitlistMessage}
                      onChange={(e) => setWaitlistMessage(e.target.value)}
                      placeholder={t("waitlistMessage")}
                      rows={3}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-teal-500"
                    />
                    <button
                      type="button"
                      disabled={waitlistBusy || !waitlistEmail.trim()}
                      onClick={() => void submitBusinessWaitlist()}
                      className="h-10 rounded-xl bg-teal-600 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
                    >
                      {waitlistBusy ? "..." : t("businessPlanWaitlist")}
                    </button>
                    {waitlistStatus === "success" ? (
                      <p className="rounded-xl border border-teal-500/30 bg-teal-600/10 px-3 py-2 text-xs font-semibold text-[#B7F5DE]">
                        {t("businessWaitlistSuccess")}
                      </p>
                    ) : null}
                    {waitlistStatus === "error" ? (
                      <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
                        {t("businessWaitlistError")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </section>

      {/* ── CALCULATOR ─────────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">{t("btCalcTitle")}</h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                {t("btCalcSub")}
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
                  {t("btCalcPlanFree")}
                </button>
                <button
                  type="button"
                  onClick={() => setCalcPlan("pro")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    calcPlan === "pro" ? "bg-teal-600 text-white shadow" : "text-white/60 hover:text-white/90",
                  )}
                >
                  {t("btCalcPlanPro")}
                </button>
              </div>

              <div className="mt-4 space-y-6">
                <SliderRow label={t("btCalcStudentsLabel")} value={students} min={1} max={20} onChange={setStudents} />
                <SliderRow label={t("btCalcAvgPriceLabel")} value={avgPrice} min={20} max={150} onChange={setAvgPrice} />
                <SliderRow label={t("btCalcCoursesWeekLabel")} value={coursesPerWeek} min={1} max={20} onChange={setCoursesPerWeek} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{t("btCalcFidelityLabel")}</p>
                  <p className="mt-2 text-2xl font-bold" style={{ color: calc.tier.accent }}>
                    {calc.tier.emoji} {calc.tier.label}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Commission {calc.commissionRate}%
                    {calc.tier.ristourneBonus > 0 && calcPlan === "pro" ? ` · +${calc.tier.ristourneBonus}% ristourne bonus` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{t("btCalcMonthlyGrossLabel")}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatCad(calc.monthlyGross)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Metric label={t("btCalcAnnualGrossLabel")} value={formatCad(calc.annualGross)} />
                <Metric label={`${t("btCalcCommissionLabel")} (${calc.commissionRate}%)`} value={`— ${formatCad(calc.annualCommission)}`} negative />
                {calcPlan === "pro" ? (
                  <Metric label={t("btCalcSubscriptionLabel")} value={`— ${formatCad(PRO_ANNUAL)}`} negative />
                ) : null}
                {calcPlan === "pro" && calc.annualRistourneEst > 0 ? (
                  <Metric label={t("btCalcRistourneLabel")} value={`+ ${formatCad(calc.annualRistourneEst)}`} accent />
                ) : null}
                <Metric label={t("btCalcNetLabel")} value={formatCad(calc.annualNet)} accentStrong />
              </div>

              <Link
                href="/login?role=teacher"
                className="inline-flex w-full h-12 items-center justify-center rounded-2xl bg-teal-600 text-sm font-bold text-white hover:brightness-105"
              >
                {t("joinFree")}
              </Link>
              <p className="text-xs text-white/40 text-center">
                {t("btCalcDisclaimer")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMISSION DÉGRESSIVE ──────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">{t("btCommTitle")}</h2>
            <p className="mt-3 text-white/65 text-sm max-w-2xl leading-relaxed">
              {t("btCommSub")}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 text-[11px] uppercase tracking-widest font-bold text-white/40 px-6 py-3 bg-white/5">
              <span>{t("btCommColLevel")}</span>
              <span>{t("btCommColVolume")}</span>
              <span className="text-center">{t("btCommColFree")}</span>
              <span className="text-center">{t("btCommColPro")}</span>
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

          <div className="rounded-3xl border border-teal-500/25 bg-teal-600/8 p-6 sm:p-8">
            <p className="text-sm font-bold text-[#7FE0C3]">{t("btRistourneTitle")}</p>
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              {t("btRistourneBody")}
            </p>
            <p className="mt-3 text-xs text-white/40">
              {t("btRistourneDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{t("btHowTitle")}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard step="1" title={t("btHowStep1Title")} desc={t("btHowStep1Desc")} />
            <StepCard step="2" title={t("btHowStep2Title")} desc={t("btHowStep2Desc")} />
            <StepCard step="3" title={t("btHowStep3Title")} desc={t("btHowStep3Desc")} />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{t("btTestimonialsTitle")}</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold">{t("btFaqTitle")}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FaqItem q={t("btFaq1Q")} a={t("btFaq1A")} />
            <FaqItem q={t("btFaq2Q")} a={t("btFaq2A")} />
            <FaqItem q={t("btFaq3Q")} a={t("btFaq3A")} />
            <FaqItem q={t("btFaq4Q")} a={t("btFaq4A")} />
            <FaqItem q={t("btFaq5Q")} a={t("btFaq5A")} />
            <FaqItem q={t("btFaq6Q")} a={t("btFaq6A")} />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────── */}
      <section className="bg-teal-600 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">{t("btFinalH2")}</h2>
            <p className="mt-2 text-white/85">{t("btFinalSub")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Link
              href="/login?role=teacher"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-bold text-teal-700 hover:bg-white/95"
            >
              {t("btFinalCta")}
            </Link>
            <Link
              href="/student/search"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 text-sm font-semibold text-white hover:bg-white/15"
            >
              {t("btFinalCtaSecondary")}
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
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-teal-500" />
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/35">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, accentStrong, negative }: { label: string; value: string; accent?: boolean; accentStrong?: boolean; negative?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-white/8 bg-black/15 p-4", accentStrong && "bg-teal-600/12 border-teal-500/25")}>
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
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-600 text-sm font-extrabold">{step}</div>
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
