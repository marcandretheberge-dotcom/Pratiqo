/**
 * YoPratiqo — Espagnol (Spanish hub)
 *
 * Sits one level below /yo/langues in the IA:
 *
 *   YoPratiqo → Langues → Espagnol
 *
 * Sections:
 *   1. Featured intro      → /yo/langues/espagnol/intro
 *   2. Available countries → /yo/langues/espagnol/pays/*  + coming-soon
 *   3. Teacher bridge      → /trouver-un-prof
 *
 * Locale behaviour: French default, English via `?lang=en`. The featured
 * intro card carries the locale through to the next route. Available
 * country routes do the same.
 *
 * No Supabase, no Stripe, no payment math, no checkout, no marketplace.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Compass,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { SITE_URL } from "@/lib/seo/site";
import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import {
  buildYoLocaleHref,
  formatYoPrice,
  getYoLocale,
  lstr,
  t,
} from "@/lib/yo/localize";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — Espagnol · parcours immersifs A1",
  description:
    "Comprends l’espagnol comme langue mondiale, puis explore les pays où elle se parle.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol`,
  },
  openGraph: {
    title: "YoPratiqo — Espagnol",
    description:
      "L’espagnol comme langue mondiale + parcours par pays + pont vers un vrai professeur Pratiqo.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_TITLE = lstr("Espagnol", "Spanish");

const PAGE_SUBTITLE = lstr(
  "Comprends la langue espagnole dans le monde, puis explore les pays où elle se parle.",
  "Understand Spanish as a world language, then explore the countries where it is spoken.",
);

const FEATURED_EYEBROW = lstr(
  "Commence ici · intro gratuite",
  "Start here · free intro",
);

const FEATURED_TITLE = lstr("Intro globale — El Español", "Global intro — El Español");

const FEATURED_BODY = lstr(
  "Avant de choisir un pays, découvre l’origine de l’espagnol, les pays hispanophones, les grandes variations et les mots universels.",
  "Before choosing a country, discover the origin of Spanish, Spanish-speaking countries, major variations, and universal words.",
);

const FEATURED_CTA = lstr("Commencer l’intro", "Start intro");

const COUNTRIES_EYEBROW = lstr("Pays disponibles", "Available countries");
const COUNTRIES_TITLE = lstr(
  "Choisis un pays pour aller plus loin",
  "Pick a country to go deeper",
);
const COUNTRIES_BODY = lstr(
  "Chaque module enseigne l’espagnol vivant d’un pays précis : vocabulaire local, culture et missions concrètes.",
  "Each module teaches the living Spanish of a specific country: local vocabulary, culture, and concrete missions.",
);

const TEACHER_EYEBROW = lstr("Pont vers un professeur", "Bridge to a teacher");
const TEACHER_TITLE = lstr(
  "Tu veux valider avec un vrai professeur ?",
  "Want to validate with a real teacher?",
);
const TEACHER_BODY = lstr(
  "Pratique avec un professeur d’espagnol Pratiqo — local d’ici ou natif du pays que tu veux visiter.",
  "Practice with a Pratiqo Spanish teacher — local to you or native to the country you want to visit.",
);
const TEACHER_CTA = lstr(
  "Trouver un prof d’espagnol",
  "Find a Spanish teacher",
);

// HUB_COPY-style trust labels — keep the literal FR/EN strings here only,
// never inline in JSX, so the trust strip stays fully localized via t(...).
const lifetimeAccessLabel = lstr("Accès à vie", "Lifetime access");
const moneyBackLabel = lstr(
  "30 jours satisfait ou remboursé",
  "30-day money-back",
);
const legalLinkLabel = lstr("Voir les conditions", "See the terms");

const COMING_SOON_COUNTRIES: { id: string; label: { fr: string; en: string } }[] = [
  { id: "mx", label: { fr: "Mexique", en: "Mexico" } },
  { id: "uy", label: { fr: "Uruguay", en: "Uruguay" } },
  { id: "es", label: { fr: "Espagne", en: "Spain" } },
  { id: "co", label: { fr: "Colombie", en: "Colombia" } },
];

export default async function YoLanguesEspagnolPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/espagnol",
    locale === "fr" ? "en" : "fr",
  );

  const rdModule = dominicanRepublicA1.module;
  const rdHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const introHref = `/yo/langues/espagnol/intro${langSuffix}`;

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            {
              label: lstr("Langues", "Languages"),
              href: `/yo/langues${langSuffix}`,
            },
            { label: lstr("Espagnol", "Spanish") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-spanish-hub-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(244,180,0,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(221,244,241,0.85),transparent_32%),linear-gradient(180deg,#fffbf0_0%,#fff4d6_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {locale === "fr" ? "Famille de parcours" : "Family of courses"}
              </span>
              <Link
                href={toggleHref}
                className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
              >
                {locale === "fr" ? "View in English" : "Voir en français"}
              </Link>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
              YoPratiqo · {locale === "fr" ? "Langues" : "Languages"}
            </p>
            <h1
              id="yo-spanish-hub-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Featured intro */}
        <section
          aria-labelledby="yo-spanish-featured-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <div className="overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] shadow-[0_8px_24px_rgba(15,58,52,0.07)]">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
              <div className="p-6 sm:p-8">
                <span className="ds-label text-[#8a5a17]">
                  {t(FEATURED_EYEBROW, locale)}
                </span>
                <h2
                  id="yo-spanish-featured-title"
                  className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.75rem]"
                >
                  {t(FEATURED_TITLE, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(FEATURED_BODY, locale)}
                </p>
                <Link
                  href={introHref}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  {t(FEATURED_CTA, locale)}
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="relative min-h-[200px] bg-[radial-gradient(circle_at_50%_50%,rgba(244,180,0,0.18),transparent_60%),linear-gradient(135deg,#0F6E56_0%,#1D9E75_55%,#F4B400_100%)] p-6 text-white sm:min-h-[260px] sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/80">
                  {locale === "fr" ? "Mots universels" : "Universal words"}
                </p>
                <p
                  className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                  lang="es"
                >
                  Hola · Gracias · ¿Cómo estás?
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/85">
                  {locale === "fr"
                    ? "Les mots qui fonctionnent dans tous les pays hispanophones."
                    : "Words that work in every Spanish-speaking country."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2) Available countries */}
        <section
          aria-labelledby="yo-spanish-countries-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(COUNTRIES_EYEBROW, locale)}
          </span>
          <h2
            id="yo-spanish-countries-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {t(COUNTRIES_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(COUNTRIES_BODY, locale)}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* RD — available */}
            <Link
              href={rdHref}
              className="group overflow-hidden rounded-3xl border border-[#F4B400]/45 bg-white shadow-[0_8px_24px_rgba(15,58,52,0.07)] transition hover:shadow-[0_12px_36px_rgba(15,58,52,0.12)]"
            >
              {rdModule.heroImagePath ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={rdModule.heroImagePath}
                    alt={t(
                      rdModule.heroImageAlt ?? rdModule.destinationLabel,
                      locale,
                    )}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              ) : null}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
                      {locale === "fr" ? "Disponible" : "Available"}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#0F6E56]">
                      {t(rdModule.destinationLabel, locale)}
                    </h3>
                  </div>
                  <span className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] px-3 py-1.5 text-xs font-black text-[#0F6E56]">
                    {formatYoPrice(
                      rdModule.priceCents,
                      locale,
                      rdModule.currency,
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/72">
                  {locale === "fr"
                    ? "Espagnol A1 · Voyage · Culture · Expressions locales"
                    : "Spanish A1 · Travel · Culture · Local expressions"}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0F6E56] underline-offset-2 group-hover:underline">
                  {locale === "fr"
                    ? "Voir le parcours"
                    : "View the course"}{" "}
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>

            {/* Coming-soon cards */}
            <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {COMING_SOON_COUNTRIES.map((country) => (
                <li
                  key={country.id}
                  aria-disabled="true"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-teal-200 bg-white/70 p-4"
                >
                  <span className="text-base font-semibold text-[#0F6E56]/80">
                    {country.label[locale]}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {locale === "fr" ? "À venir" : "Coming"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust strip: lifetime access + 30-day money-back guarantee.
              Sits right under the available-countries grid (closest to the
              priced RD card) so the buyer sees the promise next to the buy. */}
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-[#DDF4F1] bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t(lifetimeAccessLabel, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t(moneyBackLabel, locale)}
              </span>
            </div>
            <Link
              href="/legal/yo-remboursement"
              className="text-xs font-medium text-[#0F6E56]/75 underline-offset-2 hover:underline"
            >
              {t(legalLinkLabel, locale)}
            </Link>
          </div>
        </section>

        {/* 3) Teacher bridge */}
        <section
          aria-labelledby="yo-spanish-teacher-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-52 rounded-full bg-[#F4B400]/20 blur-3xl"
            />
            <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <span className="ds-label text-[#8a5a17]">
                  {t(TEACHER_EYEBROW, locale)}
                </span>
                <h2
                  id="yo-spanish-teacher-title"
                  className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
                >
                  <GraduationCap
                    className="size-5 text-[#0F6E56]"
                    aria-hidden
                  />
                  {t(TEACHER_TITLE, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(TEACHER_BODY, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href="/trouver-un-prof"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {t(TEACHER_CTA, locale)}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
