/**
 * Shared SEO landing shell for the Phase 1 YoPratiqo Spanish acquisition pages
 * (six pages under `/fr/*` and `/en/*`).
 *
 * Architecture:
 *   - Pure server component. No `use client`, no `force-dynamic`, no cookies.
 *     The page is statically rendered so Google sees the final HTML.
 *   - All content comes from `lib/seo/yopratiqoSpanishSeoPages.ts`.
 *   - JSON-LD: BreadcrumbList, Course (provider = legal entity), FAQPage.
 *   - Visual identity matches existing marketing landings (teal hero,
 *     warm-gold YoPratiqo accent card on the primary CTA).
 *
 * What this component intentionally does NOT do:
 *   - No newsletter / waitlist form (no backend lead capture in this task).
 *   - No locale cookie reading — locale is decided by URL prefix.
 *   - No links to YoPratiqo product routes other than the primary CTA, to
 *     keep the page focused on a single conversion path.
 */

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, MessageCircle } from "lucide-react";

import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { SITE_URL } from "@/lib/seo/site";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import type { YoSpanishSeoPage } from "@/lib/seo/yopratiqoSpanishSeoPages";

interface Props {
  page: YoSpanishSeoPage;
}

/**
 * Course JSON-LD with the legal entity as provider.
 * Conservative claims only: no accreditation, no certification, no guaranteed outcome.
 */
function CourseJsonLd({ page }: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: page.courseJsonLd.name,
    description: page.courseJsonLd.description,
    inLanguage: page.courseJsonLd.inLanguage,
    educationalLevel: page.courseJsonLd.educationalLevel,
    isAccessibleForFree: page.primaryCta.href.includes("/intro"),
    url: `${SITE_URL}${page.path}`,
    provider: {
      "@type": "Organization",
      // Legal entity — must match the value used in metadata copyright + legal docs.
      name: "Cours Pratiqo Inc.",
      // Public brand surface — what users actually see.
      alternateName: "Pratiqo",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

export function YopratiqoSeoLandingPage({ page }: Props) {
  const isEn = page.locale === "en";
  const homeHref = isEn ? "/?lang=en" : "/";

  return (
    <>
      <BreadcrumbSchema items={page.breadcrumb.map((b) => ({ name: b.name, href: b.href }))} />
      <FAQSchema items={page.faq.map((f) => ({ question: f.question, answer: f.answer }))} />
      <CourseJsonLd page={page} />

      <div lang={page.locale} className="min-h-[100dvh] bg-[#FAFAF8]">
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 h-14 flex items-center justify-between bg-white border-b border-[#D3D1C7] px-4 sm:px-6">
          <Link
            href={homeHref}
            className="text-lg font-black tracking-tight text-teal-700"
            aria-label="Pratiqo"
          >
            Pratiqo
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={page.alternatePath}
              hrefLang={page.alternateLocale}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              {page.langSwitchLabel}
            </Link>
            <Link
              href={page.primaryCta.href}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:brightness-105"
            >
              {isEn ? "YoPratiqo" : "YoPratiqo"}
            </Link>
          </div>
        </header>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-14 sm:py-20 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-5">
              <BookOpenCheck size={12} aria-hidden />
              {page.heroEyebrow}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              {page.h1}
            </h1>
            <div className="mt-5 space-y-4 text-base sm:text-lg text-white/85 max-w-2xl">
              {page.heroParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* YoPratiqo accent card — warm gold, primary CTA */}
            <div className="mt-8 rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-5 sm:p-6 text-[#2C2C2A] shadow-lg max-w-xl">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-[#F4B400]/20 p-2">
                  <BookOpenCheck size={20} className="text-[#8B6A00]" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold tracking-tight">YoPratiqo</p>
                  <p className="mt-1 text-sm text-[#4A4845] leading-relaxed">
                    {isEn
                      ? "Self-paced. Start in your browser, no install."
                      : "À ton rythme. Commence dans ton navigateur, sans installation."}
                  </p>
                  <Link
                    href={page.primaryCta.href}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-2xl bg-[#F4B400] px-5 text-sm font-bold text-[#2C2C2A] hover:brightness-95"
                  >
                    {page.primaryCta.label} <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>

            {/* Secondary teacher CTA — neutral, on a different visual track */}
            <div className="mt-4">
              <Link
                href={page.teacherCta.href}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/10 border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/15"
              >
                <GraduationCap size={16} aria-hidden />
                {page.teacherCta.label}
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTIONS ───────────────────────────────────────────────────── */}
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-10 sm:space-y-12">
            {page.sections.map((section, i) => (
              <article key={i} className="border-b border-[#E8E6DF] pb-8 last:border-b-0 last:pb-0">
                <h2 className="text-xl sm:text-2xl font-bold text-[#2C2C2A] mb-3 leading-snug">
                  {section.heading}
                </h2>
                <p className="text-[15px] sm:text-base text-[#4A4845] leading-relaxed">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── BRIDGE STRIP — "self-paced, then a real teacher" ───────────── */}
        <section className="bg-white border-t border-b border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF8E1] p-5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpenCheck size={18} className="text-[#8B6A00]" aria-hidden />
                <p className="font-bold text-sm text-[#2C2C2A]">YoPratiqo</p>
              </div>
              <p className="text-sm text-[#4A4845] leading-relaxed">
                {isEn
                  ? "Self-paced introduction, vocabulary, pronunciation, quizzes, and flashcards — for when you want to start on your own."
                  : "Introduction à ton rythme, vocabulaire, prononciation, quiz et flashcards — pour commencer en autonomie."}
              </p>
              <Link
                href={page.primaryCta.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#8B6A00] hover:underline"
              >
                {page.primaryCta.label} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            <div className="rounded-2xl border border-teal-700/30 bg-teal-50/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle size={18} className="text-teal-700" aria-hidden />
                <p className="font-bold text-sm text-[#2C2C2A]">Pratiqo</p>
              </div>
              <p className="text-sm text-[#4A4845] leading-relaxed">
                {isEn
                  ? "Practice with a real teacher when you want to actually speak, correct your accent, and build conversation confidence."
                  : "Pratique avec un vrai professeur quand tu veux parler, corriger ton accent et bâtir ta confiance à l’oral."}
              </p>
              <Link
                href={page.teacherCta.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline"
              >
                {page.teacherCta.label} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section className="py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C2C2A] mb-6">
              {isEn ? "Frequently asked questions" : "Questions fréquentes"}
            </h2>
            <div className="space-y-4">
              {page.faq.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E8E6DF] bg-white p-5">
                  <p className="font-semibold text-sm text-[#2C2C2A] mb-2">{item.question}</p>
                  <p className="text-sm text-[#6B6760] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA STRIP ────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-3">{page.finalCtaHeading}</h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">{page.finalCtaBody}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Link
                href={page.primaryCta.href}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#F4B400] px-6 text-sm font-bold text-[#2C2C2A] hover:brightness-95 shadow"
              >
                {page.primaryCta.label} <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href={page.teacherCta.href}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
              >
                <CheckCircle2 size={16} aria-hidden />
                {page.teacherCta.label}
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[#6B6760]">
            <Link href="/legal/cgu" className="hover:underline">
              {isEn ? "Terms" : "CGU"}
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/legal/confidentialite" className="hover:underline">
              {isEn ? "Privacy" : "Confidentialité"}
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link
              href={page.alternatePath}
              hrefLang={page.alternateLocale}
              className="hover:underline"
            >
              {page.langSwitchLabel}
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">
              Pratiqo
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>{page.footerLegalSuffix}</span>
          </div>
        </footer>
      </div>
    </>
  );
}
