/**
 * YoPratiqo hub.
 *
 * Public, self-contained product entry point for the YoPratiqo learning
 * pillar inside Pratiqo Inc. The nav intentionally links here instead of
 * deep-linking to a single section (Voyage / Langues / Musique / …) so
 * YoPratiqo can grow into a serious product surface.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Compass,
  Globe2,
  Headphones,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { SITE_URL } from "@/lib/seo/site";
import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { buildYoLocaleHref, formatYoPrice, getYoLocale, t } from "@/lib/yo/localize";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo | Apprends à ton rythme — langues, musique, voyage",
  description:
    "Explore YoPratiqo, la gamme Pratiqo qui te permet d’apprendre à ton rythme les mêmes disciplines que tu peux pratiquer avec un vrai professeur Pratiqo.",
  alternates: {
    canonical: `${SITE_URL}/yo`,
  },
  openGraph: {
    title: "YoPratiqo",
    description:
      "Apprends à ton rythme : langues, musique, soutien scolaire, francisation et voyage — la même qualité Pratiqo, version autonome.",
    type: "website",
    url: `${SITE_URL}/yo`,
    locale: "fr_CA",
  },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const HUB_COPY = {
  badge: {
    fr: "Nouveau pilier Pratiqo",
    en: "New Pratiqo pillar",
  },
  navCta: {
    fr: "Voir le parcours",
    en: "View the course",
  },
  languageToggle: {
    fr: "View in English",
    en: "Voir en français",
  },
  title: {
    fr: "YoPratiqo te permet d’apprendre à ton rythme.",
    en: "YoPratiqo lets you learn at your own pace.",
  },
  subtitle: {
    fr: "YoPratiqo te permet d’apprendre à ton rythme les mêmes disciplines que tu peux aussi pratiquer avec un vrai professeur Pratiqo. La section Voyage t’aide à te préparer pour des situations réelles avant de partir.",
    en: "YoPratiqo helps you learn at your own pace in the same disciplines you can also practice with a real Pratiqo teacher. The Travel section helps you prepare for real situations before you go.",
  },
  heroPrimary: {
    fr: "Choisir une langue",
    en: "Choose a language",
  },
  heroSecondary: {
    fr: "Explorer le produit",
    en: "Explore the product",
  },
  navCtaLangues: {
    fr: "Voir les langues",
    en: "Browse languages",
  },
  featuredCta: {
    fr: "Voir le parcours",
    en: "View the course",
  },
  featuredEyebrow: {
    fr: "Premier parcours disponible",
    en: "First course available",
  },
  featuredTitle: {
    fr: "Espagnol République dominicaine A1",
    en: "Dominican Republic Spanish A1",
  },
  featuredBody: {
    fr: "Une intro gratuite avec culture, phrases utiles, quiz et flashcards. Le parcours complet reste simple, concret et conçu pour être utilisé sur place.",
    en: "A free intro with culture, useful phrases, quiz, and flashcards. The full path stays simple, concrete, and made to use on-site.",
  },
  priceLabel: {
    fr: "Paiement unique",
    en: "One-time payment",
  },
  productTitle: {
    fr: "Une famille de parcours en autonomie, pas une petite fonctionnalité.",
    en: "A family of self-paced courses, not a small feature.",
  },
  productBody: {
    fr: "YoPratiqo garde le sérieux de Pratiqo et ajoute une couche plus immersive : visuels, contexte, répétition active et missions concrètes. Les mêmes disciplines, mais en autonomie.",
    en: "YoPratiqo keeps Pratiqo’s seriousness and adds a more immersive layer: visuals, context, active recall, and concrete missions. The same disciplines, on your own.",
  },
  sectionsTitle: {
    fr: "Ce que YoPratiqo apporte",
    en: "What YoPratiqo brings",
  },
  finalTitle: {
    fr: "Commence par une section. La méthode YoPratiqo grandit avec toi.",
    en: "Start with one section. The YoPratiqo method grows with you.",
  },
  finalBody: {
    fr: "La section Voyage est ouverte aujourd’hui. Les sections Langues, Musique, Soutien scolaire et Francisation suivent.",
    en: "The Travel section is open today. The Languages, Music, Academic support, and Francisation sections come next.",
  },
  finalCta: {
    fr: "Découvrir le parcours",
    en: "Discover the course",
  },
  lifetimeAccessLabel: {
    fr: "Accès à vie",
    en: "Lifetime access",
  },
  moneyBackLabel: {
    fr: "30 jours satisfait ou remboursé",
    en: "30-day money-back",
  },
  legalLinkLabel: {
    fr: "Voir les conditions",
    en: "See the terms",
  },
};

const pillars = [
  {
    icon: Compass,
    title: { fr: "Contexte réel", en: "Real context" },
    body: {
      fr: "On apprend pour une situation précise, pas dans le vide.",
      en: "You learn for a precise situation, not in a vacuum.",
    },
  },
  {
    icon: Brain,
    title: { fr: "Quiz actifs", en: "Active quizzes" },
    body: {
      fr: "Des questions courtes pour retenir sans lourdeur.",
      en: "Short questions that help memory without feeling heavy.",
    },
  },
  {
    icon: Layers,
    title: { fr: "Flashcards utiles", en: "Useful flashcards" },
    body: {
      fr: "Du vocabulaire prêt pour le moment où tu en as besoin.",
      en: "Vocabulary ready for the moment you need it.",
    },
  },
  {
    icon: Headphones,
    title: { fr: "Audio à venir", en: "Audio coming soon" },
    body: {
      fr: "La structure est prête pour des voix natives et des pratiques guidées.",
      en: "The structure is ready for native voices and guided practice.",
    },
  },
];

const productLines = [
  {
    status: "available" as const,
    title: { fr: "Langues", en: "Languages" },
    body: {
      fr: "Des parcours de langue immersifs, organisés par langue puis par pays.",
      en: "Immersive language paths, organized by language then by country.",
    },
    href: "/yo/langues",
  },
  {
    status: "available" as const,
    title: { fr: "Voyage", en: "Travel" },
    body: {
      fr: "Section de YoPratiqo pour te préparer à parler sur place, avec culture et expressions locales.",
      en: "The YoPratiqo section that helps you prepare to speak on-site, with culture and local expressions.",
    },
    href: "/yo/langues/espagnol",
  },
  {
    status: "planned" as const,
    title: { fr: "Musique", en: "Music" },
    body: {
      fr: "Théorie, rythme, écoute et pratique entre les cours.",
      en: "Theory, rhythm, listening, and practice between lessons.",
    },
    href: null,
  },
  {
    status: "planned" as const,
    title: { fr: "Soutien scolaire", en: "Academic support" },
    body: {
      fr: "Révisions courtes et exercices ciblés entre les séances avec un prof.",
      en: "Short reviews and targeted exercises between sessions with a teacher.",
    },
    href: null,
  },
  {
    status: "planned" as const,
    title: { fr: "Francisation", en: "Francisation" },
    body: {
      fr: "Apprendre le français au Québec, à ton rythme, avant et entre les cours.",
      en: "Learn French in Quebec at your own pace, before and between lessons.",
    },
    href: null,
  },
];

export default async function YoHubPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const yoModule = dominicanRepublicA1.module;
  const langSuffix = locale === "en" ? "?lang=en" : "";
  // Primary path: nudge users into the new IA tree.
  const languesHref = `/yo/langues${langSuffix}`;
  // Featured shortcut: keep the existing RD destination one click away,
  // but route it through the canonical IA path so breadcrumbs work.
  const courseHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref = buildYoLocaleHref("/yo", locale === "fr" ? "en" : "fr");

  return (
    <div className="min-h-[100dvh] bg-[#fffbf0] text-[#0F6E56]">
      <header className="sticky top-0 z-50 border-b border-[#F4B400]/25 bg-[#fffbf0]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Pratiqo" className="shrink-0">
            <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
          </Link>
          <nav aria-label="YoPratiqo" className="flex items-center gap-2">
            <Link
              href={toggleHref}
              className="hidden rounded-full border border-[#DDF4F1] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white sm:inline-flex"
            >
              {t(HUB_COPY.languageToggle, locale)}
            </Link>
            <Link
              href={languesHref}
              className="inline-flex items-center rounded-full border border-[#F4B400]/55 bg-[#FFF4D6] px-4 py-2 text-sm font-bold text-[#0F6E56] shadow-[0_1px_0_rgba(244,180,0,0.18)] transition hover:bg-[#ffefbd]"
            >
              {t(HUB_COPY.navCtaLangues, locale)}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(244,180,0,0.22),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(221,244,241,0.95),transparent_32%),linear-gradient(180deg,#fffbf0_0%,#fff4d6_52%,#ddf4f1_100%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-9 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
            <div className="flex flex-col gap-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {t(HUB_COPY.badge, locale)}
              </div>
              <div className="space-y-4">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">YoPratiqo</p>
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight text-[#0F6E56] sm:text-5xl lg:text-6xl">
                  {t(HUB_COPY.title, locale)}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
                  {t(HUB_COPY.subtitle, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={languesHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  {t(HUB_COPY.heroPrimary, locale)}
                  <span aria-hidden>→</span>
                </Link>
                <a
                  href="#yo-product"
                  className="inline-flex items-center justify-center rounded-full border border-[#0F6E56]/20 bg-white/70 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-white"
                >
                  {t(HUB_COPY.heroSecondary, locale)}
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-[#F4B400]/20 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_65px_rgba(15,110,86,0.18)]">
                {yoModule.heroImagePath ? (
                  <Image
                    src={yoModule.heroImagePath}
                    alt={t(yoModule.heroImageAlt ?? yoModule.destinationLabel, locale)}
                    width={1500}
                    height={900}
                    priority
                    sizes="(min-width: 1024px) 48vw, 100vw"
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : null}
                <div className="border-t border-[#DDF4F1] bg-white/95 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                        {t(HUB_COPY.featuredEyebrow, locale)}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0F6E56]">
                        {t(HUB_COPY.featuredTitle, locale)}
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] px-4 py-2 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/62">
                        {t(HUB_COPY.priceLabel, locale)}
                      </p>
                      <p className="text-lg font-black text-[#0F6E56]">
                        {formatYoPrice(yoModule.priceCents, locale, yoModule.currency)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#0F6E56]/74">
                    {t(HUB_COPY.featuredBody, locale)}
                  </p>
                  <Link
                    href={courseHref}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5b47]"
                  >
                    {t(HUB_COPY.featuredCta, locale)}
                    <span aria-hidden>→</span>
                  </Link>
                  {/* Trust strip: lifetime access + 30-day money-back guarantee.
                      Both labels and the link text come from HUB_COPY so no
                      locale-specific copy is hardcoded in JSX. */}
                  <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#DDF4F1] bg-white/80 px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {t(HUB_COPY.lifetimeAccessLabel, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {t(HUB_COPY.moneyBackLabel, locale)}
                      </span>
                    </div>
                    <Link
                      href="/legal/yo-remboursement"
                      className="text-[11px] font-medium text-[#0F6E56]/75 underline-offset-2 hover:underline"
                    >
                      {t(HUB_COPY.legalLinkLabel, locale)}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="yo-product" className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="max-w-xl">
                <h2 className="text-3xl font-semibold tracking-tight text-[#0F6E56] sm:text-4xl">
                  {t(HUB_COPY.productTitle, locale)}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#0F6E56]/72">
                  {t(HUB_COPY.productBody, locale)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <article key={pillar.title.fr} className="rounded-3xl border border-[#DDF4F1] bg-[#F8FFFD] p-5 shadow-[0_1px_2px_rgba(15,110,86,0.04)]">
                      <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#DDF4F1] text-[#0F6E56]">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <h3 className="text-base font-bold text-[#0F6E56]">{t(pillar.title, locale)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/70">{t(pillar.body, locale)}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#DDF4F1] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0F6E56] sm:text-3xl">
                {t(HUB_COPY.sectionsTitle, locale)}
              </h2>
              <span className="rounded-full border border-[#F4B400]/50 bg-[#FFF4D6] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                YoPratiqo
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {productLines.map((line) => {
                const isAvailable = line.status === "available";
                const href = line.href
                  ? `${line.href}${langSuffix}`
                  : null;
                const articleClass = cn(
                  "flex h-full flex-col rounded-3xl border p-5 shadow-[0_8px_26px_rgba(15,110,86,0.08)] transition",
                  isAvailable
                    ? "border-[#F4B400]/45 bg-[#FFF4D6] hover:bg-[#ffefbd]"
                    : "border-white/80 bg-white/82",
                );
                const inner = (
                  <>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className={cn("flex size-11 items-center justify-center rounded-2xl", isAvailable ? "bg-[#F4B400]/25 text-[#0F6E56]" : "bg-[#DDF4F1] text-[#0F6E56]/70")}>
                        {isAvailable ? <CheckCircle2 className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/60">
                        {isAvailable ? (locale === "fr" ? "Disponible" : "Available") : (locale === "fr" ? "À venir" : "Coming")}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F6E56]">{t(line.title, locale)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/72">{t(line.body, locale)}</p>
                    {href ? (
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-bold text-[#0F6E56]">
                        {locale === "fr" ? "Ouvrir" : "Open"} <span aria-hidden>→</span>
                      </span>
                    ) : null}
                  </>
                );
                return href ? (
                  <Link key={line.title.fr} href={href} className={articleClass}>
                    {inner}
                  </Link>
                ) : (
                  <article key={line.title.fr} className={articleClass} aria-disabled="true">
                    {inner}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#0F6E56] px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/15 bg-white/8 p-6 shadow-[0_20px_60px_rgba(3,42,33,0.24)] sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#FFF4D6]">
                <Globe2 className="size-3.5" aria-hidden />
                {locale === "fr"
                  ? "YoPratiqo · section Voyage"
                  : "YoPratiqo · Travel section"}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t(HUB_COPY.finalTitle, locale)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/78 sm:text-base">
                {t(HUB_COPY.finalBody, locale)}
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                href={courseHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FFF4D6] px-5 py-3 text-sm font-black text-[#0F6E56] transition hover:bg-[#ffefbd]"
              >
                <BookOpenCheck className="size-4" aria-hidden />
                {t(HUB_COPY.finalCta, locale)}
              </Link>
              <p className="text-sm font-bold text-[#FFF4D6]">
                {formatYoPrice(yoModule.priceCents, locale, yoModule.currency)}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
