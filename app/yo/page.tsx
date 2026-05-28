/**
 * Yo Pratiqo hub.
 *
 * Public, self-contained product entry point for the Yo Pratiqo learning
 * pillar. The nav intentionally links here instead of deep-linking to a
 * single Voyage module so Yo can grow into a serious product surface.
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
  title: "Yo Pratiqo | Parcours immersifs, quiz et flashcards",
  description:
    "Explore Yo Pratiqo, la nouvelle gamme de parcours immersifs Pratiqo pour apprendre avec des quiz, flashcards, missions et contexte culturel.",
  alternates: {
    canonical: `${SITE_URL}/yo`,
  },
  openGraph: {
    title: "Yo Pratiqo",
    description: "Parcours immersifs, quiz, flashcards et apprentissage utile dans la vraie vie.",
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
    fr: "Yo Pratiqo transforme l'apprentissage en expérience immersive.",
    en: "Yo Pratiqo turns learning into an immersive experience.",
  },
  subtitle: {
    fr: "Des parcours courts, visuels et pratiques pour apprendre avant de voyager, parler ou pratiquer dans la vraie vie.",
    en: "Short, visual, practical paths to learn before travelling, speaking, or practicing in real life.",
  },
  heroPrimary: {
    fr: "Commencer avec Yo Voyage",
    en: "Start with Yo Voyage",
  },
  heroSecondary: {
    fr: "Explorer le produit",
    en: "Explore the product",
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
    fr: "Accès à vie",
    en: "Lifetime access",
  },
  productTitle: {
    fr: "Une sous-marque d'apprentissage, pas une petite fonctionnalité.",
    en: "A learning sub-brand, not a small feature.",
  },
  productBody: {
    fr: "Yo Pratiqo garde le sérieux de Pratiqo, mais ajoute une couche plus immersive: visuels, contexte, répétition active et missions concrètes.",
    en: "Yo Pratiqo keeps Pratiqo's seriousness, then adds a more immersive layer: visuals, context, active recall, and concrete missions.",
  },
  sectionsTitle: {
    fr: "Ce que Yo apporte",
    en: "What Yo adds",
  },
  finalTitle: {
    fr: "Commence par une destination. La méthode peut ensuite grandir.",
    en: "Start with one destination. The method can grow from there.",
  },
  finalBody: {
    fr: "Voyage aujourd'hui, puis langues, musique et apprentissages spécialisés demain.",
    en: "Travel today, then languages, music, and specialized learning paths tomorrow.",
  },
  finalCta: {
    fr: "Découvrir le parcours",
    en: "Discover the course",
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
    status: "available",
    title: { fr: "Yo Voyage", en: "Yo Travel" },
    body: {
      fr: "Se préparer à parler sur place avec culture et expressions locales.",
      en: "Prepare to speak on-site with culture and local expressions.",
    },
  },
  {
    status: "planned",
    title: { fr: "Yo Langues", en: "Yo Languages" },
    body: {
      fr: "Des parcours de langue plus profonds, reliés aux professeurs Pratiqo.",
      en: "Deeper language paths connected to Pratiqo teachers.",
    },
  },
  {
    status: "planned",
    title: { fr: "Yo Musique", en: "Yo Music" },
    body: {
      fr: "Théorie, rythme, écoute et pratique entre les cours.",
      en: "Theory, rhythm, listening, and practice between lessons.",
    },
  },
];

export default async function YoHubPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const yoModule = dominicanRepublicA1.module;
  const courseHref =
    locale === "en" ? "/yo/voyage/republique-dominicaine?lang=en" : "/yo/voyage/republique-dominicaine";
  const toggleHref = buildYoLocaleHref("/yo", locale === "fr" ? "en" : "fr");

  return (
    <div className="min-h-[100dvh] bg-[#fffbf0] text-[#0F6E56]">
      <header className="sticky top-0 z-50 border-b border-[#F4B400]/25 bg-[#fffbf0]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Pratiqo" className="shrink-0">
            <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
          </Link>
          <nav aria-label="Yo Pratiqo" className="flex items-center gap-2">
            <Link
              href={toggleHref}
              className="hidden rounded-full border border-[#DDF4F1] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white sm:inline-flex"
            >
              {t(HUB_COPY.languageToggle, locale)}
            </Link>
            <Link
              href={courseHref}
              className="inline-flex items-center rounded-full border border-[#F4B400]/55 bg-[#FFF4D6] px-4 py-2 text-sm font-bold text-[#0F6E56] shadow-[0_1px_0_rgba(244,180,0,0.18)] transition hover:bg-[#ffefbd]"
            >
              {t(HUB_COPY.navCta, locale)}
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
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">Yo Pratiqo</p>
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight text-[#0F6E56] sm:text-5xl lg:text-6xl">
                  {t(HUB_COPY.title, locale)}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
                  {t(HUB_COPY.subtitle, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={courseHref}
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
                Yo Pratiqo
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {productLines.map((line) => {
                const isAvailable = line.status === "available";
                return (
                  <article
                    key={line.title.fr}
                    className={cn(
                      "rounded-3xl border p-5 shadow-[0_8px_26px_rgba(15,110,86,0.08)]",
                      isAvailable
                        ? "border-[#F4B400]/45 bg-[#FFF4D6]"
                        : "border-white/80 bg-white/82",
                    )}
                  >
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
                Yo Pratiqo Voyage
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
