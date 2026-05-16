"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  ChevronRight,
  CircleDot,
  Headphones,
  MapPinned,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

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

const WHY_CARDS = [
  { titleKey: "pricingWhyCard1Title" as const, bodyKey: "pricingWhyCard1Body" as const, emphasize: false },
  { titleKey: "pricingWhyCard2Title" as const, bodyKey: "pricingWhyCard2Body" as const, emphasize: false },
  { titleKey: "pricingWhyCard3Title" as const, bodyKey: "pricingWhyCard3Body" as const, emphasize: false },
  { titleKey: "pricingWhyCard4Title" as const, bodyKey: "pricingWhyCard4Body" as const, emphasize: true },
] as const;

const WHY_CHIPS = [
  "pricingWhyChip1",
  "pricingWhyChip2",
  "pricingWhyChip3",
  "pricingWhyChip4",
  "pricingWhyChip5",
] as const;

function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

const VALUE_ICONS = [Wallet, Receipt, MapPinned, BarChart3, Headphones, Sparkles] as const;

export default function TarifsPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const upgradeHref = user ? "/upgrade" : "/login?next=/upgrade";

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
      { question: t("pricingPageFaq9Q"), answer: t("pricingPageFaq9A") },
    ],
    [t],
  );

  const applyHref = teacherSignupHref(locale);
  const studentSearchHref = "/student/search";

  const heroChips = [
    t("pricingPageHeroChip1"),
    t("pricingPageHeroChip2"),
    t("pricingPageHeroChip3"),
    t("pricingPageHeroChip4"),
  ];

  const studentBullets = [
    t("pricingPageStudentBullet1"),
    t("pricingPageStudentBullet2"),
    t("pricingPageStudentBullet3"),
    t("pricingPageStudentBullet4"),
    t("pricingPageStudentBullet5"),
  ];

  const freeBullets = [
    t("pricingPagePlanFreeBullet1"),
    t("pricingPagePlanFreeBullet2"),
    t("pricingPagePlanFreeBullet3"),
    t("pricingPagePlanFreeBullet4"),
    t("pricingPagePlanFreeBullet5"),
    t("pricingPagePlanFreeBullet6"),
  ];

  const proBullets = [
    t("pricingPagePlanProBullet1"),
    t("pricingPagePlanProBullet2"),
    t("pricingPagePlanProBullet3"),
    t("pricingPagePlanProBullet4"),
    t("pricingPagePlanProBullet5"),
    t("pricingPagePlanProBullet6"),
  ];

  const bizBullets = [
    t("pricingPagePlanBizBullet1"),
    t("pricingPagePlanBizBullet2"),
    t("pricingPagePlanBizBullet3"),
    t("pricingPagePlanBizBullet4"),
    t("pricingPagePlanBizBullet5"),
  ];

  const revenueBullets = [
    t("pricingPageRevenueBullet1"),
    t("pricingPageRevenueBullet2"),
    t("pricingPageRevenueBullet3"),
    t("pricingPageRevenueBullet4"),
  ];

  const valueCards = [
    { Icon: VALUE_ICONS[0]!, title: t("pricingPageValueCard1Title"), desc: t("pricingPageValueCard1Desc") },
    { Icon: VALUE_ICONS[1]!, title: t("pricingPageValueCard2Title"), desc: t("pricingPageValueCard2Desc") },
    { Icon: VALUE_ICONS[2]!, title: t("pricingPageValueCard3Title"), desc: t("pricingPageValueCard3Desc") },
    { Icon: VALUE_ICONS[3]!, title: t("pricingPageValueCard4Title"), desc: t("pricingPageValueCard4Desc") },
    { Icon: VALUE_ICONS[4]!, title: t("pricingPageValueCard5Title"), desc: t("pricingPageValueCard5Desc") },
    { Icon: VALUE_ICONS[5]!, title: t("pricingPageValueCard6Title"), desc: t("pricingPageValueCard6Desc") },
  ];

  const whyChips = WHY_CHIPS.map((k) => t(k));

  return (
    <>
      <FAQSchema items={faqItems} />

      <div className="mx-auto max-w-5xl px-4 pb-28 pt-12 sm:px-6 sm:pt-16">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-[#2C2C2C] sm:text-4xl sm:leading-tight md:text-[2.35rem]">
            {t("pricingPageHeroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#6B6B6B] sm:text-lg">
            {t("pricingPageHeroSubtitle")}
          </p>

          <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2 sm:gap-2.5">
            {heroChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full border border-[#E4E1D8] bg-white px-3.5 py-2 text-xs font-semibold text-[#2D7B72] shadow-sm sm:text-[13px]"
              >
                <Check className="mr-2 h-3.5 w-3.5 shrink-0 text-[#409A8E]" aria-hidden />
                {chip}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-12 flex max-w-md flex-col gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href={studentSearchHref}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-[#409A8E] px-8 py-3 text-center text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#36837a] sm:flex-none"
            >
              {t("pricingPageCtaFindTeacher")}
            </Link>
            <Link
              href={applyHref}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border-2 border-[#409A8E]/40 bg-white px-8 py-3 text-center text-sm font-semibold text-[#2D7B72] transition-colors hover:bg-[#50BEB2]/10 sm:flex-none"
            >
              {t("pricingPageCtaBecomeTeacher")}
            </Link>
          </div>
        </section>

        {/* Students */}
        <section className="mx-auto mt-24 max-w-2xl">
          <h2 className="mb-8 text-center text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">
            {t("pricingPageStudentTitle")}
          </h2>
          <div className="overflow-hidden rounded-3xl border border-[#E8E6DE] bg-white shadow-[0_16px_48px_rgba(44,44,44,0.07)]">
            <div className="border-b border-[#F0EFE8] bg-gradient-to-br from-[#50BEB2]/12 via-white to-[#FAFAF8] px-8 py-10 sm:px-11">
              <p className="text-center text-3xl font-bold tabular-nums tracking-tight text-[#2D7B72] sm:text-4xl">
                {t("pricingPageStudentHighlight")}
              </p>
            </div>
            <ul className="space-y-4 px-8 py-9 sm:px-11">
              {studentBullets.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] leading-snug text-[#2C2C2C] sm:text-base">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#409A8E]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#F5F4EF] bg-[#FFFEFB] px-8 py-6 sm:px-11">
              <p className="text-center text-sm leading-relaxed text-[#6B6B6B]">{t("pricingPageStudentTrustNote")}</p>
            </div>
          </div>
        </section>

        {/* Teachers */}
        <section className="mt-28">
          <h2 className="mx-auto max-w-2xl text-center text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl md:text-3xl">
            {t("pricingPageSectionTeachersTitle")}
          </h2>

          <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-7">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-[#E6E4DC] bg-white p-8 shadow-sm ring-1 ring-black/[0.02]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">{t("pricingPagePlanFreeAudience")}</p>
              <h3 className="mt-3 text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanFreeName")}</h3>
              <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-[#2D7B72]">{t("pricingPagePlanFreePrice")}</p>
              <div className="mt-6 space-y-1">
                <p className="text-lg font-semibold text-[#2C2C2C]">{t("pricingPagePlanFreeCommissionShort")}</p>
                <p className="text-sm text-[#6B6B6B]">{t("pricingPagePlanFreeCommissionSub")}</p>
              </div>
              <p className="mt-6 text-sm italic leading-relaxed text-[#5C5C5C]">{t("pricingPagePlanFreeBestFor")}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {freeBullets.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-[#2C2C2C]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#409A8E]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={applyHref}
                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#409A8E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#36837a]"
              >
                {t("pricingPagePlanFreeCta")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-3xl border-2 border-[#50BEB2]/50 bg-white p-8 shadow-[0_24px_56px_rgba(64,154,142,0.14)] lg:-translate-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C2410C]">{t("pricingPagePlanProAudience")}</p>
              <h3 className="mt-3 text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanProName")}</h3>
              <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-[#2D7B72]">{t("pricingPagePlanProPrice")}</p>
              <div className="mt-6 space-y-1">
                <p className="text-lg font-semibold text-[#2C2C2C]">{t("pricingPagePlanProCommissionShort")}</p>
                <p className="text-sm text-[#6B6B6B]">{t("pricingPagePlanProCommissionSub")}</p>
              </div>
              <p className="mt-6 text-sm italic leading-relaxed text-[#5C5C5C]">{t("pricingPagePlanProBestFor")}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {proBullets.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-[#2C2C2C]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#409A8E]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={upgradeHref}
                prefetch={false}
                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#FF6B35] px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#e85f2d]"
              >
                {t("pricingPagePlanProCta")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Business */}
            <div className="flex flex-col rounded-3xl border border-[#E8E6DE] bg-[#FFFEFB] p-8 shadow-sm ring-1 ring-black/[0.02]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">{t("pricingPagePlanBizAudience")}</p>
              <h3 className="mt-3 text-lg font-bold text-[#2C2C2C]">{t("pricingPagePlanBizName")}</h3>
              <div className="mt-6 space-y-1">
                <p className="text-2xl font-bold tabular-nums text-[#2D7B72]">{t("pricingPagePlanBizPrice")}</p>
                <p className="text-sm font-semibold text-[#2C2C2C]">{t("pricingPagePlanBizCommissionShort")}</p>
              </div>
              <p className="mt-6 text-sm italic leading-relaxed text-[#5C5C5C]">{t("pricingPagePlanBizBestFor")}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {bizBullets.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-[#2C2C2C]">
                    <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-[#50BEB2]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-[#409A8E] bg-white px-4 py-3 text-sm font-semibold text-[#2D7B72] transition-colors hover:bg-[#50BEB2]/10"
              >
                {t("pricingPagePlanBizCta")}
              </Link>
            </div>
          </div>
        </section>

        {/* Why Pratiqo — narrative cards */}
        <section className="mx-auto mt-28 max-w-5xl">
          <h2 className="mx-auto max-w-2xl text-center text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl md:text-3xl">
            {t("pricingWhySectionTitle")}
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {WHY_CARDS.map((card) => (
              <div
                key={card.titleKey}
                className={cn(
                  "flex flex-col rounded-3xl border p-7 sm:p-8",
                  card.emphasize
                    ? "border-[#50BEB2]/45 bg-gradient-to-br from-white to-[#50BEB2]/10 shadow-md ring-1 ring-[#50BEB2]/20"
                    : "border-[#E8E6DE] bg-white shadow-sm",
                )}
              >
                <h3 className="text-lg font-bold text-[#2C2C2C]">{t(card.titleKey)}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[#6B6B6B]">{t(card.bodyKey)}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm font-semibold text-[#2C2C2C]">{t("pricingWhyCombineLead")}</p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {whyChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#D9D6CC] bg-white px-4 py-2 text-xs font-semibold text-[#2D7B72] shadow-sm sm:text-[13px]"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        {/* Commission tiers */}
        <section className="mx-auto mt-28 max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">{t("pricingPageCommissionTitle")}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#6B6B6B] sm:text-base">{t("pricingPageCommissionSubtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMMISSION_ROWS.map((row) => (
              <div
                key={row.tierKey}
                className="flex flex-col rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-sm"
              >
                <p className="text-xl font-bold text-[#2C2C2C]">{t(row.tierKey)}</p>
                <p className="mt-2 text-sm leading-snug text-[#6B6B6B]">{t(row.volKey)}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-[#FAFAF8] px-3 py-1.5 text-sm font-semibold text-[#2C2C2C] ring-1 ring-[#E8E6DE]">
                    <span className="text-[#2D7B72]">{t("pricingPageCommissionPillFree")}</span>
                    <span className="mx-1.5 text-[#C4C4C4]" aria-hidden>
                      ·
                    </span>
                    {t(row.freePctKey)}
                  </span>
                  <span className="inline-flex rounded-full bg-[#50BEB2]/12 px-3 py-1.5 text-sm font-semibold text-[#2C2C2C] ring-1 ring-[#50BEB2]/25">
                    <span className="text-[#2D7B72]">{t("pricingPageCommissionPillPro")}</span>
                    <span className="mx-1.5 text-[#7EB8B0]" aria-hidden>
                      ·
                    </span>
                    {t(row.proPctKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-[#6B6B6B]">{t("pricingPageCommissionFootnote")}</p>
        </section>

        {/* Break-even */}
        <section className="mx-auto mt-20 max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-[#E8E6DE] bg-white shadow-[0_12px_40px_rgba(44,44,44,0.06)]">
            <div className="border-b border-[#F0EFE8] bg-gradient-to-r from-[#50BEB2]/10 to-transparent px-8 py-9 sm:px-10">
              <h2 className="text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-[1.35rem]">{t("pricingPageBreakevenTitle")}</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[#6B6B6B]">{t("pricingPageBreakevenLead")}</p>
            </div>
            <div className="space-y-4 px-8 py-8 sm:px-10">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#EFECE4] bg-[#FFFEFB] px-4 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">1</p>
                  <p className="mt-2 text-sm font-semibold text-[#2C2C2C]">{t("pricingPageBreakevenStep1")}</p>
                </div>
                <div className="rounded-2xl border border-[#EFECE4] bg-[#FFFEFB] px-4 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">2</p>
                  <p className="mt-2 text-sm font-semibold text-[#2C2C2C]">{t("pricingPageBreakevenStep2")}</p>
                </div>
                <div className="rounded-2xl border border-[#50BEB2]/30 bg-[#50BEB2]/8 px-4 py-4 text-center sm:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2D7B72]">3</p>
                  <p className="mt-2 text-sm font-semibold text-[#2C2C2C]">{t("pricingPageBreakevenStep3")}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#D9E8E5] bg-gradient-to-br from-[#FAFAF8] to-white px-6 py-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">{t("pricingPageBreakevenFormulaLabel")}</p>
                <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-[#2D7B72] sm:text-2xl">{t("pricingPageBreakevenFormula")}</p>
              </div>
            </div>
            <div className="border-t border-[#F5F4EF] bg-[#FFFEFB] px-8 py-5 sm:px-10">
              <p className="text-center text-xs leading-relaxed text-[#6B6B6B]">{t("pricingPageBreakevenDisclaimer")}</p>
            </div>
          </div>
        </section>

        {/* Value of commission */}
        <section className="mx-auto mt-28 max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl md:text-3xl">{t("pricingPageValueTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {valueCards.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#50BEB2]/15 text-[#2D7B72]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-[#2C2C2C]">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B6B6B]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Revenue */}
        <section className="mx-auto mt-24 max-w-2xl rounded-3xl border border-[#E8E6DE] bg-[#FFFEFB] px-8 py-10 sm:px-11">
          <h2 className="text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">{t("pricingPageRevenueTitle")}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[#6B6B6B]">{t("pricingPageRevenueLead")}</p>
          <ul className="mt-8 space-y-3">
            {revenueBullets.map((line) => (
              <li key={line} className="flex gap-3 text-[15px] text-[#2C2C2C]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#50BEB2]" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Helpful guides (internal linking) */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">
            {t("seoHelpfulGuidesTitle")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E8E6DE] bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#2D7B72]">
                {t("seoPricingGuidesStudentsTitle")}
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/blog/comment-choisir-tuteur-enfant-quebec"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkChoixTuteur")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/combien-coute-tuteur-prive-quebec"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkCombienCouteTuteur")}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#E8E6DE] bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#2D7B72]">
                {t("seoPricingGuidesTeachersTitle")}
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/blog/combien-charger-cours-prive-quebec"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkCombienCharger")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/creer-profil-professeur-attirer-eleves"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkCreerProfil")}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#E8E6DE] bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#2D7B72]">
                {t("seoPricingGuidesFreelancersTitle")}
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/blog/donner-cours-prives-side-hustle-etudiants"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkSideHustleStudent")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/emplois-temps-partiel-bien-payes-etudiants-universitaires"
                    className="text-sm font-semibold text-[#0F6E56] hover:underline"
                  >
                    {t("seoGuideLinkEmploisEtudiants")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-28 max-w-2xl">
          <h2 className="text-center text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl md:text-3xl">{t("pricingPageFaqSectionTitle")}</h2>
          <div className="mt-10 space-y-4">
            {faqItems.map((item, idx) => (
              <article key={`faq-${idx}`} className="rounded-2xl border border-[#E8E6DE] bg-white px-6 py-6 shadow-sm">
                <h3 className="font-semibold text-[#2C2C2C]">{item.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-28 max-w-xl rounded-3xl border border-[#E8E6DE] bg-gradient-to-br from-white to-[#FAFAF8] px-8 py-12 text-center shadow-md sm:px-10">
          <h2 className="text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">{t("pricingPageFinalTitle")}</h2>
          <div className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href={studentSearchHref}
              className={cn(
                "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors sm:flex-none sm:min-w-[200px]",
                "bg-[#409A8E] hover:bg-[#36837a]",
              )}
            >
              {t("pricingPageFinalCtaFind")}
            </Link>
            <Link
              href={applyHref}
              className={cn(
                "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border-2 border-[#409A8E] bg-white px-6 py-3 text-sm font-semibold text-[#2D7B72] transition-colors sm:flex-none sm:min-w-[200px]",
                "hover:bg-[#50BEB2]/10",
              )}
            >
              {t("pricingPageFinalCtaTeach")}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
