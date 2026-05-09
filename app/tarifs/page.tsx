"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  CircleDot,
  Lightbulb,
  Shield,
  Sparkles,
} from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/** Volume tiers match published model; cell percentages come from i18n for locale formatting. */
const COMMISSION_ROWS: Array<{
  tierKey: "pricingPageTierBronze" | "pricingPageTierSilver" | "pricingPageTierGold" | "pricingPageTierPlatinum";
  volKey: "pricingPageVolBronze" | "pricingPageVolSilver" | "pricingPageVolGold" | "pricingPageVolPlatinum";
  freePctKey: "pricingPagePctFreeBronze" | "pricingPagePctFreeSilver" | "pricingPagePctFreeGold" | "pricingPagePctFreePlatinum";
  proPctKey: "pricingPagePctProBronze" | "pricingPagePctProSilver" | "pricingPagePctProGold" | "pricingPagePctProPlatinum";
}> = [
  {
    tierKey: "pricingPageTierBronze",
    volKey: "pricingPageVolBronze",
    freePctKey: "pricingPagePctFreeBronze",
    proPctKey: "pricingPagePctProBronze",
  },
  {
    tierKey: "pricingPageTierSilver",
    volKey: "pricingPageVolSilver",
    freePctKey: "pricingPagePctFreeSilver",
    proPctKey: "pricingPagePctProSilver",
  },
  {
    tierKey: "pricingPageTierGold",
    volKey: "pricingPageVolGold",
    freePctKey: "pricingPagePctFreeGold",
    proPctKey: "pricingPagePctProGold",
  },
  {
    tierKey: "pricingPageTierPlatinum",
    volKey: "pricingPageVolPlatinum",
    freePctKey: "pricingPagePctFreePlatinum",
    proPctKey: "pricingPagePctProPlatinum",
  },
];

/* Reference (canonical model): 10 % 9 % 8 % 7 % | 5 % 4,5 % 4 % 3,5 % | 29,99 $ | 5 000 15 000 30 000 $ */
const CMP_ROW_KEYS = [
  {
    label: "pricingCmpR01Label",
    pratiqo: "pricingCmpR01Pratiqo",
    directories: "pricingCmpR01Directories",
    global: "pricingCmpR01Global",
    agencies: "pricingCmpR01Agencies",
  },
  {
    label: "pricingCmpR02Label",
    pratiqo: "pricingCmpR02Pratiqo",
    directories: "pricingCmpR02Directories",
    global: "pricingCmpR02Global",
    agencies: "pricingCmpR02Agencies",
  },
  {
    label: "pricingCmpR03Label",
    pratiqo: "pricingCmpR03Pratiqo",
    directories: "pricingCmpR03Directories",
    global: "pricingCmpR03Global",
    agencies: "pricingCmpR03Agencies",
  },
  {
    label: "pricingCmpR04Label",
    pratiqo: "pricingCmpR04Pratiqo",
    directories: "pricingCmpR04Directories",
    global: "pricingCmpR04Global",
    agencies: "pricingCmpR04Agencies",
  },
  {
    label: "pricingCmpR05Label",
    pratiqo: "pricingCmpR05Pratiqo",
    directories: "pricingCmpR05Directories",
    global: "pricingCmpR05Global",
    agencies: "pricingCmpR05Agencies",
  },
  {
    label: "pricingCmpR06Label",
    pratiqo: "pricingCmpR06Pratiqo",
    directories: "pricingCmpR06Directories",
    global: "pricingCmpR06Global",
    agencies: "pricingCmpR06Agencies",
  },
  {
    label: "pricingCmpR07Label",
    pratiqo: "pricingCmpR07Pratiqo",
    directories: "pricingCmpR07Directories",
    global: "pricingCmpR07Global",
    agencies: "pricingCmpR07Agencies",
  },
  {
    label: "pricingCmpR08Label",
    pratiqo: "pricingCmpR08Pratiqo",
    directories: "pricingCmpR08Directories",
    global: "pricingCmpR08Global",
    agencies: "pricingCmpR08Agencies",
  },
  {
    label: "pricingCmpR09Label",
    pratiqo: "pricingCmpR09Pratiqo",
    directories: "pricingCmpR09Directories",
    global: "pricingCmpR09Global",
    agencies: "pricingCmpR09Agencies",
  },
  {
    label: "pricingCmpR10Label",
    pratiqo: "pricingCmpR10Pratiqo",
    directories: "pricingCmpR10Directories",
    global: "pricingCmpR10Global",
    agencies: "pricingCmpR10Agencies",
  },
] as const;

function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

export default function TarifsPage() {
  const { t, locale } = useLocale();

  const faqItems = useMemo(
    () => [
      { question: t("pricingPageFaq1Q"), answer: t("pricingPageFaq1A") },
      { question: t("pricingPageFaq2Q"), answer: t("pricingPageFaq2A") },
      { question: t("pricingPageFaq3Q"), answer: t("pricingPageFaq3A") },
      { question: t("pricingPageFaq4Q"), answer: t("pricingPageFaq4A") },
      { question: t("pricingPageFaq5Q"), answer: t("pricingPageFaq5A") },
      { question: t("pricingPageFaq6Q"), answer: t("pricingPageFaq6A") },
      { question: t("pricingPageFaq7Q"), answer: t("pricingPageFaq7A") },
      { question: t("pricingPageFaq8Q"), answer: t("pricingPageFaq8A") },
    ],
    [t],
  );

  const applyHref = teacherSignupHref(locale);

  const freeFeatures = [
    t("pricingPagePlanFreeFeature1"),
    t("pricingPagePlanFreeFeature2"),
    t("pricingPagePlanFreeFeature3"),
    t("pricingPagePlanFreeFeature4"),
    t("pricingPagePlanFreeFeature5"),
  ].filter(Boolean);

  const proBullets = [
    t("pricingPagePlanProBullet1"),
    t("pricingPagePlanProBullet2"),
    t("pricingPagePlanProBullet3"),
    t("pricingPagePlanProBullet4"),
    t("pricingPagePlanProBullet5"),
    t("pricingPagePlanProBullet6"),
  ].filter(Boolean);

  const bizBullets = [
    t("pricingPagePlanBizBullet1"),
    t("pricingPagePlanBizBullet2"),
    t("pricingPagePlanBizBullet3"),
    t("pricingPagePlanBizBullet4"),
    t("pricingPagePlanBizBullet5"),
  ].filter(Boolean);

  const revenueBullets = [
    t("pricingPageRevenueBullet1"),
    t("pricingPageRevenueBullet2"),
    t("pricingPageRevenueBullet3"),
    t("pricingPageRevenueBullet4"),
  ];

  const studentBullets = [
    t("pricingPageStudentBullet1"),
    t("pricingPageStudentBullet2"),
    t("pricingPageStudentBullet3"),
    t("pricingPageStudentBullet4"),
    t("pricingPageStudentBullet5"),
    t("pricingPageStudentBullet6"),
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#2C2C2C]">
      <FAQSchema items={faqItems} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E8E6DE] bg-[#FAFAF8]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label={t("navHome")}>
            <span className="md:hidden">
              <PratiqoLogo variant="icon" size="md" priority={false} fetchPriority="low" loading="lazy" />
            </span>
            <span className="hidden md:block">
              <PratiqoLogo variant="full" size="md" priority={false} fetchPriority="low" loading="lazy" />
            </span>
          </Link>

          <nav className="hidden flex-wrap items-center justify-end gap-x-1 gap-y-2 md:flex" aria-label="Main">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6B6B6B] transition-colors hover:bg-black/[0.03] hover:text-[#2D7B72]"
            >
              {t("navHome")}
            </Link>
            <Link
              href={applyHref}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6B6B6B] transition-colors hover:bg-black/[0.03] hover:text-[#2D7B72]"
            >
              {t("becomeTeacher")}
            </Link>
            <span
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#2D7B72]"
              aria-current="page"
            >
              {t("navPricing")}
            </span>
            <LocaleSwitcher variant="light" compact />
            <Link
              href="/login"
              className="ml-2 rounded-xl border border-[#409A8E]/35 px-3 py-1.5 text-xs font-semibold text-[#2D7B72] transition-colors hover:bg-[#50BEB2]/10"
            >
              {t("signIn")}
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <LocaleSwitcher variant="light" compact />
            <Link
              href="/login"
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#2D7B72]"
            >
              {t("signIn")}
            </Link>
          </div>
          </div>
          <nav
            className="flex justify-center gap-4 border-t border-[#E8E6DE] px-4 py-2.5 text-[11px] font-semibold md:hidden"
            aria-label="Mobile main"
          >
            <Link href="/" className="text-[#6B6B6B]">
              {t("navHome")}
            </Link>
            <Link href={teacherSignupHref(locale)} className="text-[#6B6B6B]">
              {t("becomeTeacher")}
            </Link>
            <span className="text-[#2D7B72]" aria-current="page">
              {t("navPricing")}
            </span>
          </nav>
        </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#50BEB2]/35 bg-white px-4 py-1 text-xs font-semibold text-[#2D7B72] shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#409A8E]" aria-hidden />
            Pratiqo
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-[#2C2C2C] sm:text-4xl md:text-[2.35rem] md:leading-tight">
            {t("pricingPageHeroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6B6B6B] sm:text-lg">
            {t("pricingPageHeroSubtitle")}
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#50BEB2]/40 bg-white/80 px-4 py-2 text-sm font-medium text-[#2D7B72]">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            {t("pricingPageHeroTrustNote")}
          </p>
        </section>

        {/* Student card */}
        <section className="mx-auto mt-14 max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-[#E8E6DE] bg-white shadow-[0_8px_30px_rgba(45,123,114,0.06)]">
            <div className="border-b border-[#F0EFE8] bg-gradient-to-r from-[#50BEB2]/12 via-white to-[#FF6B35]/8 px-6 py-5 sm:px-8">
              <h2 className="text-xl font-bold text-[#2C2C2C]">{t("pricingPageStudentTitle")}</h2>
              <p className="mt-2 text-lg font-semibold text-[#2D7B72]">{t("pricingPageStudentHighlight")}</p>
            </div>
            <ul className="space-y-3 px-6 py-6 sm:px-8">
              {studentBullets.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] leading-snug text-[#2C2C2C]">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#409A8E]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#F5F4EF] bg-[#FFFEFB] px-6 py-4 sm:px-8">
              <p className="text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPageStudentTrustNote")}</p>
            </div>
          </div>
        </section>

        {/* Teacher plans */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold text-[#2C2C2C]">{t("pricingPageSectionTeachersTitle")}</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanFreeName")}</h3>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[#2D7B72]">{t("pricingPagePlanFreePrice")}</p>
              <p className="mt-3 text-sm font-medium text-[#6B6B6B]">{t("pricingPagePlanFreeCommission")}</p>
              <p className="mt-2 text-sm text-[#6B6B6B]">{t("pricingPagePlanFreeStudents")}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#2C2C2C]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#409A8E]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={applyHref}
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#409A8E] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#36837a]"
              >
                {t("pricingPagePlanFreeCta")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-3xl border-2 border-[#50BEB2]/55 bg-white p-6 shadow-[0_12px_40px_rgba(64,154,142,0.18)] lg:-translate-y-1">
              <div className="absolute right-4 top-4 rounded-full bg-[#FF6B35] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Pro
              </div>
              <h3 className="text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanProName")}</h3>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[#2D7B72]">{t("pricingPagePlanProPrice")}</p>
              <p className="mt-3 text-sm font-medium text-[#6B6B6B]">{t("pricingPagePlanProCommission")}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {proBullets.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#2C2C2C]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#409A8E]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/upgrade"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#FF6B35] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e85f2d]"
              >
                {t("pricingPagePlanProCta")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Business */}
            <div className="flex flex-col rounded-3xl border border-[#E8E6DE] bg-[#FFFEFB] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanBizName")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPagePlanBizLead")}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {bizBullets.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#2C2C2C]">
                    <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-[#50BEB2]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#409A8E] bg-white px-4 py-3 text-center text-sm font-semibold text-[#2D7B72] transition-colors hover:bg-[#50BEB2]/10"
              >
                {t("pricingPagePlanBizCta")}
              </Link>
            </div>
          </div>
        </section>

        {/* Commission table */}
        <section className="mt-20 overflow-hidden rounded-3xl border border-[#E8E6DE] bg-white shadow-sm">
          <div className="border-b border-[#F0EFE8] px-6 py-6 sm:px-8">
            <h2 className="text-xl font-bold text-[#2C2C2C]">{t("pricingPageCommissionTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPageCommissionSubtitle")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#ECEAE4] bg-[#FAFAF8]">
                  <th className="px-4 py-3 font-semibold text-[#2C2C2C] sm:px-6">{t("pricingPageCommissionColTier")}</th>
                  <th className="px-4 py-3 font-semibold text-[#2C2C2C] sm:px-6">{t("pricingPageCommissionColVolume")}</th>
                  <th className="px-4 py-3 font-semibold text-[#2D7B72] sm:px-6">{t("pricingPageCommissionColFree")}</th>
                  <th className="px-4 py-3 font-semibold text-[#2D7B72] sm:px-6">{t("pricingPageCommissionColPro")}</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_ROWS.map((row) => (
                  <tr key={row.tierKey} className="border-b border-[#F5F4EF] last:border-0">
                    <td className="px-4 py-3.5 font-medium text-[#2C2C2C] sm:px-6">{t(row.tierKey)}</td>
                    <td className="px-4 py-3.5 text-[#6B6B6B] sm:px-6">{t(row.volKey)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-[#2C2C2C] sm:px-6">{t(row.freePctKey)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-[#2C2C2C] sm:px-6">{t(row.proPctKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Break-even */}
        <section className="mx-auto mt-16 max-w-3xl rounded-3xl border border-[#50BEB2]/25 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex gap-3">
            <Lightbulb className="mt-0.5 h-6 w-6 shrink-0 text-[#FF6B35]" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-[#2C2C2C]">{t("pricingPageBreakevenTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPageBreakevenLead")}</p>
              <div className="mt-5 rounded-2xl border border-[#E8E6DE] bg-[#FAFAF8] px-4 py-4 font-mono text-sm text-[#2C2C2C]">
                <p>{t("pricingPageBreakevenMath1")}</p>
                <p className="mt-2">{t("pricingPageBreakevenMath2")}</p>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#6B6B6B]">{t("pricingPageBreakevenDisclaimer")}</p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold text-[#2C2C2C]">{t("pricingPageCompareTitle")}</h2>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-[#E8E6DE] bg-white shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#ECEAE4] bg-[#FAFAF8]">
                  <th className="min-w-[160px] px-3 py-3 font-semibold text-[#2C2C2C] sm:px-4" />
                  <th className="min-w-[140px] px-3 py-3 font-semibold text-[#2D7B72] sm:px-4">{t("pricingPageCompareColPratiqo")}</th>
                  <th className="min-w-[140px] px-3 py-3 font-semibold text-[#6B6B6B] sm:px-4">{t("pricingPageCompareColDirectories")}</th>
                  <th className="min-w-[140px] px-3 py-3 font-semibold text-[#6B6B6B] sm:px-4">{t("pricingPageCompareColGlobal")}</th>
                  <th className="min-w-[140px] px-3 py-3 font-semibold text-[#6B6B6B] sm:px-4">{t("pricingPageCompareColAgencies")}</th>
                </tr>
              </thead>
              <tbody>
                {CMP_ROW_KEYS.map((row) => (
                  <tr key={row.label} className="border-b border-[#F5F4EF] last:border-0">
                    <td className="align-top px-3 py-3 font-medium text-[#2C2C2C] sm:px-4">{t(row.label)}</td>
                    <td className="align-top px-3 py-3 text-[#2C2C2C] sm:px-4">{t(row.pratiqo)}</td>
                    <td className="align-top px-3 py-3 text-[#6B6B6B] sm:px-4">{t(row.directories)}</td>
                    <td className="align-top px-3 py-3 text-[#6B6B6B] sm:px-4">{t(row.global)}</td>
                    <td className="align-top px-3 py-3 text-[#6B6B6B] sm:px-4">{t(row.agencies)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Revenue model */}
        <section className="mx-auto mt-16 max-w-3xl rounded-3xl border border-[#E8E6DE] bg-[#FFFEFB] px-6 py-8 sm:px-10">
          <h2 className="text-xl font-bold text-[#2C2C2C]">{t("pricingPageRevenueTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPageRevenueLead")}</p>
          <ul className="mt-5 space-y-2">
            {revenueBullets.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-[#2C2C2C]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#50BEB2]" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-[#2C2C2C]">{t("pricingPageFaqSectionTitle")}</h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((item, idx) => (
              <article
                key={idx}
                className="rounded-2xl border border-[#E8E6DE] bg-white px-5 py-5 shadow-sm"
              >
                <h3 className="font-semibold text-[#2C2C2C]">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-4 text-center">
          <Link
            href={applyHref}
            className={cn(
              "inline-flex items-center justify-center rounded-2xl px-8 py-3 text-sm font-semibold text-white shadow-md transition-colors",
              "bg-[#409A8E] hover:bg-[#36837a]",
            )}
          >
            {t("pricingPagePlanFreeCta")}
          </Link>
          <Link href="/" className="text-sm font-medium text-[#2D7B72] underline-offset-4 hover:underline">
            {t("navHome")}
          </Link>
        </section>
      </main>
    </div>
  );
}
