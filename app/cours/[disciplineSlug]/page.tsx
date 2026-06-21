import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Search, UserPlus } from "lucide-react";

import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { getLocale } from "@/lib/i18n/server";
import {
  SUBJECT_LANDING_PAGES,
  buildSubjectLandingMetadata,
  buildSubjectSearchHref,
  getSubjectLandingPageBySlug,
} from "@/lib/seo/subjectLandingPages";

export function generateStaticParams() {
  return SUBJECT_LANDING_PAGES.map((page) => ({ disciplineSlug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ disciplineSlug: string }>;
}): Promise<Metadata> {
  const { disciplineSlug } = await params;
  const page = getSubjectLandingPageBySlug(disciplineSlug);
  if (!page) return { title: "Cours particuliers | Pratiqo" };

  const locale = await getLocale();
  return buildSubjectLandingMetadata(page, locale);
}

export default async function SubjectLandingPage({
  params,
}: {
  params: Promise<{ disciplineSlug: string }>;
}) {
  const { disciplineSlug } = await params;
  const page = getSubjectLandingPageBySlug(disciplineSlug);
  if (!page) notFound();

  const locale = await getLocale();
  const content = page.content[locale];
  const searchHref = buildSubjectSearchHref(page);
  const signupHref = locale === "fr" ? "/devenir-enseignant" : "/become-teacher";

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Trouver un prof", href: "/trouver-un-prof" },
          { name: content.label, href: `/cours/${page.slug}` },
        ]}
      />

      <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#1a1f1d]">
        <header className="sticky top-0 z-50 border-b border-[#D3D1C7] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link href="/" className="text-lg font-black tracking-tight text-teal-700">
              Pratiqo
            </Link>
            <nav className="flex items-center gap-3 text-sm font-semibold">
              <Link href="/trouver-un-prof" className="text-teal-700 hover:underline">
                Trouver un prof
              </Link>
              <Link
                href={signupHref}
                className="hidden rounded-xl border border-[#DCEAE3] px-3 py-2 text-[#2C2C2A] hover:border-teal-500 sm:inline-flex"
              >
                Enseigner
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="border-b border-[#DCEAE3] bg-gradient-to-b from-[#EAF7F2] to-white px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                  {content.label}
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[#10251F] sm:text-5xl">
                  {content.h1}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#4A5560] sm:text-lg">
                  {content.intro}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={searchHref}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
                  >
                    <Search size={16} aria-hidden />
                    {content.searchCta}
                  </Link>
                  <Link
                    href={signupHref}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#BFDCD4] bg-white px-6 text-sm font-bold text-teal-800 transition hover:border-teal-500"
                  >
                    <UserPlus size={16} aria-hidden />
                    {content.teacherCta}
                  </Link>
                </div>
              </div>

              <aside className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-[0_24px_70px_rgba(15,110,86,0.10)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <BookOpen size={22} aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#10251F]">{content.whyTitle}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#5C6670]">
                      {content.emptyState}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="px-4 py-12 sm:px-6 lg:py-14">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-[#E8E6DF] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-[#10251F]">{content.learnTitle}</h2>
                <ul className="mt-5 space-y-3">
                  {content.learnItems.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#4A5560]">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-[#E8E6DF] bg-[#F8FBF8] p-6 shadow-sm">
                <h2 className="text-xl font-black text-[#10251F]">{content.whyTitle}</h2>
                <ul className="mt-5 space-y-3">
                  {content.whyItems.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#4A5560]">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F6C96E]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>

          <section className="border-y border-[#DCEAE3] bg-white px-4 py-10 sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-3xl bg-[#0F6E56] p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">{content.teacherCta}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                  {content.teacherRecruitment}
                </p>
              </div>
              <Link
                href={signupHref}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-teal-800 transition hover:brightness-95"
              >
                {content.teacherCta}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#E8E6DF] bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4 py-5 text-xs text-[#6B6760] sm:px-6">
            <LegalFooterLinks />
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">
              Pratiqo
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Cours Pratiqo Inc.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
