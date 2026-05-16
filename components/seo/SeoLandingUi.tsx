import Link from "next/link";
import { BookOpen, MapPin, ShieldCheck } from "lucide-react";
import { withLocale } from "@/lib/i18n/routing";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import { tFormat } from "@/lib/i18n/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { getCoursePagePath } from "@/lib/seo/seo-data";
import { seoCourseLinkLabel, seoSubjectLinkLabel } from "@/lib/seo/seoLandingI18n";

export type SeoBreadcrumbItem = { label: string; href: string };

export function SeoBreadcrumbBar({ locale, items }: { locale: Locale; items: SeoBreadcrumbItem[] }) {
  return (
    <nav
      aria-label={t(locale, "seoLandingBreadcrumbAria")}
      className="border-b border-[#E8E6DF] bg-white px-4 py-2 sm:px-6"
    >
      <ol className="mx-auto flex max-w-5xl flex-wrap items-center gap-1.5 text-xs text-[#6B6760]">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden className="text-[#D3D1C7]">/</span> : null}
            {i === items.length - 1 ? (
              <span className="font-semibold text-[#2C2C2A]">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-teal-700">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type SeoHeroShellProps = {
  locale: Locale;
  regionLabel: string;
  title: string;
  intro: string;
  trustChips: string[];
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  reassurance?: string;
};

export function SeoHeroShell({
  locale,
  regionLabel,
  title,
  intro,
  trustChips,
  primaryCta,
  secondaryCta,
  reassurance,
}: SeoHeroShellProps) {
  const reassuranceText = reassurance ?? t(locale, "seoLandingNoSubscriptionRequired");
  return (
    <section className="bg-teal-700 px-4 py-10 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <MapPin size={12} aria-hidden />
          {regionLabel}
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/85">{intro}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
          {trustChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/95"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="mx-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href={primaryCta.href}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 shadow hover:brightness-95 sm:w-auto"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
          >
            {secondaryCta.label}
          </Link>
        </div>
        <p className="mt-3 text-xs text-white/75">{reassuranceText}</p>
      </div>
    </section>
  );
}

export function SeoHowPratiqoWorks({ locale }: { locale: Locale }) {
  const steps = [
    {
      n: "1",
      title: t(locale, "seoLandingCompareProfilesTitle"),
      desc: t(locale, "seoLandingCompareProfilesText"),
    },
    {
      n: "2",
      title: t(locale, "seoLandingBookSimplyTitle"),
      desc: t(locale, "seoLandingBookSimplyText"),
    },
    {
      n: "3",
      title: t(locale, "seoLandingLearnWithConfidenceTitle"),
      desc: t(locale, "seoLandingLearnWithConfidenceText"),
    },
  ] as const;

  return (
    <section className="border-t border-[#E8E6DF] bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-lg font-bold text-[#2C2C2A] sm:text-xl">
          {t(locale, "seoLandingHowItWorksTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#6B6760]">
          {t(locale, "seoLandingHowItWorksSubtitle")}
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-700">
                {step.n}
              </div>
              <p className="text-sm font-bold text-[#2C2C2A]">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6B6760]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SeoTransparencyBlock({ locale }: { locale: Locale }) {
  const points = [
    t(locale, "seoLandingTransparencyPoint1"),
    t(locale, "seoLandingTransparencyPoint2"),
    t(locale, "seoLandingTransparencyPoint3"),
    t(locale, "seoLandingTransparencyPoint4"),
    t(locale, "seoLandingTransparencyPoint5"),
  ] as const;

  return (
    <section className="border-t border-[#E8E6DF] bg-[#FAFAF8] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-700" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-[#2C2C2A]">{t(locale, "seoLandingTransparencyTitle")}</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#2C2C2A]">
              {points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

type NearbyCityLink = { slug: string; name: string };
type RelatedSubjectLink = { slug: string; label: string };

export function SeoCourseCityEmptyState({
  locale,
  cityName,
  subjectLabel,
  disciplineName,
  disciplineSlug,
  citySlug,
  nearbyCities,
  relatedSubjects,
}: {
  locale: Locale;
  cityName: string;
  subjectLabel: string;
  disciplineName: string;
  disciplineSlug: string;
  citySlug: string;
  nearbyCities: NearbyCityLink[];
  relatedSubjects: RelatedSubjectLink[];
}) {
  const becomeTeacherHref = withLocaleHref("/become-teacher", locale);
  const searchHref = withLocaleHref("/trouver-un-prof", locale);

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-10">
      <BookOpen size={36} className="mx-auto mb-3 text-[#D3D1C7]" aria-hidden />
      <h2 className="text-center text-base font-bold text-[#2C2C2A] sm:text-lg">
        {t(locale, "seoLandingNoTeacherTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-[#6B6760]">
        {tFormat(locale, "seoLandingNoTeacherText", { subject: subjectLabel, city: cityName })}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {nearbyCities.length > 0 ? (
          <Link
            href={`#seo-discovery`}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:brightness-105 sm:w-auto"
          >
            {t(locale, "seoLandingExploreNearbyCities")}
          </Link>
        ) : null}
        {relatedSubjects.length > 0 ? (
          <Link
            href={`#seo-discovery`}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#D3D1C7] px-5 text-sm font-semibold text-[#2C2C2A] hover:border-teal-500 sm:w-auto"
          >
            {tFormat(locale, "seoLandingExploreOtherSubjects", { city: cityName })}
          </Link>
        ) : null}
        <Link
          href={becomeTeacherHref}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-teal-700/30 bg-teal-50 px-5 text-sm font-semibold text-teal-800 hover:bg-teal-100 sm:w-auto"
        >
          {t(locale, "becomeTeacher")}
        </Link>
      </div>

      {nearbyCities.length > 0 || relatedSubjects.length > 0 ? (
        <div className="mt-8 grid gap-6 border-t border-[#F1EFE8] pt-6 sm:grid-cols-2">
          {nearbyCities.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                {t(locale, "seoLandingNearbyCities")}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {nearbyCities.slice(0, 5).map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={withLocale(getCoursePagePath(disciplineSlug, c.slug), locale)}
                      className="font-semibold text-teal-700 hover:underline"
                    >
                      {seoCourseLinkLabel(locale, disciplineName.toLowerCase(), c.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {relatedSubjects.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                {tFormat(locale, "seoLandingOtherSubjectsInCity", { city: cityName })}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {relatedSubjects.slice(0, 5).map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={withLocale(getCoursePagePath(s.slug, citySlug), locale)}
                      className="font-semibold text-teal-700 hover:underline"
                    >
                      {seoCourseLinkLabel(
                        locale,
                        seoSubjectLinkLabel(locale, s.slug, s.label),
                        cityName,
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 rounded-xl bg-[#FAFCFB] px-4 py-3 text-center text-xs leading-relaxed text-[#6B6760]">
        {tFormat(locale, "seoLandingTeacherRecruitmentNote", { subject: subjectLabel, city: cityName })}{" "}
        <Link href={becomeTeacherHref} className="font-semibold text-teal-700 hover:underline">
          {t(locale, "seoLandingCreateProfile")}
        </Link>
        {" · "}
        <Link href={searchHref} className="font-semibold text-teal-700 hover:underline">
          {t(locale, "seoLandingBrowsePratiqo")}
        </Link>
      </p>
    </div>
  );
}

export function SeoTutorCityEmptyState({
  locale,
  cityName,
  nearbyCities,
  subjectQuickLinks,
}: {
  locale: Locale;
  cityName: string;
  nearbyCities: NearbyCityLink[];
  subjectQuickLinks: { slug: string; label: string }[];
}) {
  const becomeTeacherHref = withLocaleHref("/become-teacher", locale);
  const searchHref = withLocaleHref("/trouver-un-prof", locale);

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-10">
      <h2 className="text-center text-base font-bold text-[#2C2C2A] sm:text-lg">
        {tFormat(locale, "seoLandingNetworkBuildingTitle", { city: cityName })}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-[#6B6760]">
        {t(locale, "seoLandingNetworkBuildingText")}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {subjectQuickLinks.length > 0 ? (
          <Link
            href="#matieres-populaires"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:brightness-105 sm:w-auto"
          >
            {t(locale, "seoLandingSeePopularSubjects")}
          </Link>
        ) : null}
        <Link
          href={becomeTeacherHref}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#D3D1C7] px-5 text-sm font-semibold text-[#2C2C2A] hover:border-teal-500 sm:w-auto"
        >
          {t(locale, "becomeTeacher")}
        </Link>
        {nearbyCities.length > 0 ? (
          <Link
            href="#villes-voisines"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-teal-700/30 bg-teal-50 px-5 text-sm font-semibold text-teal-800 hover:bg-teal-100 sm:w-auto"
          >
            {t(locale, "seoLandingExploreNearbyCitiesShort")}
          </Link>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-[#6B6760]">
        <Link href={searchHref} className="font-semibold text-teal-700 hover:underline">
          {t(locale, "seoLandingOpenPratiqoSearch")}
        </Link>
      </p>
    </div>
  );
}

type UsefulPageLink = { href: string; label: string };

export function SeoDiscoveryGrid({
  id,
  columns,
}: {
  id?: string;
  columns: { title: string; links: UsefulPageLink[] }[];
}) {
  return (
    <section id={id} className="border-t border-[#E8E6DF] bg-[#FAFAF8] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#6B6760]">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-teal-700 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SeoTeacherRatingBadge({
  locale,
  rating,
  reviews,
}: {
  locale: Locale;
  rating: number;
  reviews: number;
}) {
  if (reviews <= 0) {
    return (
      <span className="shrink-0 rounded-lg border border-[#E8E6DF] bg-[#FAFCFB] px-2 py-1 text-[10px] font-semibold text-[#6B6760]">
        {t(locale, "seoLandingTeacherBadgeNew")}
      </span>
    );
  }
  return (
    <span className="shrink-0 flex items-center gap-0.5 rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A]">
      <span className="text-amber-400" aria-hidden>
        ★
      </span>
      {rating.toFixed(1)}
    </span>
  );
}
