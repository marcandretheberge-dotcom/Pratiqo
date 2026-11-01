/**
 * YoPratiqo hub.
 *
 * Public, self-contained product entry point for the YoPratiqo learning
 * pillar inside Cours Pratiqo Inc. The nav links here instead of
 * deep-linking to a single discipline so YoPratiqo can grow into a
 * serious product surface.
 *
 * Information architecture (canonical):
 *   YoPratiqo
 *     → Langues          (live)
 *     → Musique          (planned, placeholder only)
 *     → Soutien scolaire (planned, placeholder only)
 *
 * Francisation is NOT a fourth top-level discipline. It lives as a
 * sub-program under Langues → Français québécois / Francisation, and is
 * surfaced on this page as a small "Programme en vedette" shortcut
 * (subordinate to the three families above) so newcomers landing on the
 * YoPratiqo home can jump straight to the existing Quebec French
 * landing page.
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
} from "lucide-react";
import { YoAppHeroCard } from "@/components/yo/YoAppHeroCard";
import { YoAppLandingShell } from "@/components/yo/YoAppLandingShell";
import { YoAppValueStrip } from "@/components/yo/YoAppValueStrip";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { YoLanguageQuickStart } from "@/components/yo/YoLanguageQuickStart";
import { YoLanguageSelector } from "@/components/yo/YoLanguageSelector";
import { YoPublicCompanionOnboardingCard } from "@/components/yo/YoPublicCompanionOnboardingCard";
import { SITE_URL } from "@/lib/seo/site";
import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { formatYoPrice, getYoLocale, t } from "@/lib/yo/localize";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo | Apprends à ton rythme — langues, musique, soutien scolaire",
  description:
    "Explore YoPratiqo, la gamme Pratiqo qui te permet d’apprendre à ton rythme les mêmes disciplines que tu peux pratiquer avec un vrai professeur Pratiqo.",
  alternates: {
    canonical: `${SITE_URL}/yo`,
  },
  openGraph: {
    title: "YoPratiqo",
    description:
      "Apprends à ton rythme : langues, musique et soutien scolaire — la même qualité Pratiqo, version autonome.",
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
    fr: "YoPratiqo te permet d’apprendre à ton rythme les mêmes disciplines que tu peux aussi pratiquer avec un vrai professeur Pratiqo : langues, musique et soutien scolaire.",
    en: "YoPratiqo helps you learn at your own pace in the same disciplines you can also practice with a real Pratiqo teacher: languages, music, and academic support.",
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
    fr: "Commence par une discipline. La méthode YoPratiqo grandit avec toi.",
    en: "Start with one discipline. The YoPratiqo method grows with you.",
  },
  finalBody: {
    fr: "Langues est ouvert aujourd’hui (cinq parcours d’introduction). Musique et Soutien scolaire suivent quand chaque programme est prêt à enseigner sérieusement.",
    en: "Languages is open today (five intro paths). Music and Academic support come next, when each program is ready to teach seriously.",
  },
  finalCta: {
    fr: "Découvrir les langues",
    en: "Discover the languages",
  },
  // ── Featured-program shortcut (Francisation) ─────────────────────────
  // Francisation is intentionally NOT a fourth top-level discipline. It
  // lives under Langues → Français québécois / Francisation. This pill
  // surfaces it as a smaller, subordinate shortcut so newcomers can
  // jump straight to the existing landing page without us inventing a
  // competing IA branch.
  featuredProgramEyebrow: {
    fr: "Programme en vedette",
    en: "Featured program",
  },
  featuredProgramTitle: {
    fr: "Français québécois / Francisation",
    en: "Quebec French / Francization",
  },
  featuredProgramBody: {
    fr: "Sous Langues : repères de francisation, intro gratuite, et un module premium en préparation pour le travail au Québec.",
    en: "Under Languages: francization landmarks, free intro, and a premium workplace-French module in preparation.",
  },
  featuredProgramCta: {
    fr: "Voir Français québécois",
    en: "See Quebec French",
  },
  twelveMonthAccessLabel: {
    fr: "Accès 12 mois",
    en: "12-month access",
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

/**
 * YoPratiqo top-level disciplines.
 *
 * Canonical IA: Langues, Musique, Soutien scolaire. Francisation is
 * NOT a fourth family — it lives under Langues → Français québécois /
 * Francisation and is rendered as a separate "Featured program"
 * shortcut, not as a peer to these three families.
 *
 * Musique and Soutien scolaire are placeholders. They render with no
 * `href` (no fake routes) until each program is built.
 */
const productLines = [
  {
    status: "available" as const,
    title: { fr: "Langues", en: "Languages" },
    body: {
      fr: "Cinq parcours d’introduction immersifs : espagnol, français québécois, italien, anglais et japonais.",
      en: "Five immersive intro paths: Spanish, Quebec French, Italian, English, and Japanese.",
    },
    href: "/yo/langues",
  },
  {
    status: "planned" as const,
    title: { fr: "Musique", en: "Music" },
    body: {
      fr: "Théorie, rythme, écoute et pratique entre les cours. Bientôt disponible.",
      en: "Theory, rhythm, listening, and practice between lessons. Coming soon.",
    },
    href: null,
  },
  {
    status: "planned" as const,
    title: { fr: "Soutien scolaire", en: "Academic support" },
    body: {
      fr: "Révisions courtes et exercices ciblés entre les séances avec un prof. Bientôt disponible.",
      en: "Short reviews and targeted exercises between sessions with a teacher. Coming soon.",
    },
    href: null,
  },
];

export default async function YoHubPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const yoModule = dominicanRepublicA1.module;
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  // Primary path: nudge users into the new IA tree.
  const languesHref = `/yo/langues${langSuffix}`;
  // Featured shortcut: keep the existing RD destination one click away,
  // but route it through the canonical IA path so breadcrumbs work.
  const courseHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  // Featured PROGRAM shortcut (Francisation). Subordinate to the three
  // top-level families — Francisation is a sub-program of Langues, not
  // a fourth IA branch.
  const francisationHref = `/yo/langues/francais-quebec${langSuffix}`;

  return (
    <div className="min-h-[100dvh] bg-[#f5f8f7] text-[#172642]">
      {/* The direct language list replaces the redundant mobile header shortcut. */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/yo" aria-label="YoPratiqo" className="shrink-0">
            <YoPratiqoLogo size="sm" priority={false} />
          </Link>
          <nav aria-label="YoPratiqo" className="flex items-center gap-2">
            <YoLanguageSelector locale={locale} pathname="/yo" />
            <Link
              href={languesHref}
              className="hidden items-center rounded-full border border-[#13A085]/30 bg-[#E3F1EB] px-4 py-2 text-sm font-bold text-[#172642] shadow-[0_1px_0_rgba(19,160,133,0.18)] transition hover:bg-[#d8ecdf] sm:inline-flex"
            >
              {t(HUB_COPY.navCtaLangues, locale)}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
          <h1 className="mb-4 text-sm font-semibold text-emerald-900">YoPratiqo</h1>
          <YoLanguageQuickStart locale={locale} />
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-900 underline underline-offset-4">
            {{fr: "Retour à Pratiqo", en: "Back to Pratiqo", es: "Volver a Pratiqo"}[locale]}
          </Link>
        </div>
        <details className="border-t border-emerald-100">
          <summary className="mx-auto max-w-5xl cursor-pointer px-5 py-5 text-sm font-semibold text-emerald-900">
            {{fr: "Découvrir YoPratiqo", en: "About YoPratiqo", es: "Descubrir YoPratiqo"}[locale]}
          </summary>
        {/*
         * App-like onboarding screen. Below `lg`: mobile-first,
         * narrow column, warm cream background, premium serif
         * headline + teal script accent + navy brush quote — see
         * YoAppHeroCard for the full composition. At `lg+`: the
         * shell lays the hero + value strip out next to the
         * featured RD course card (passed as `visual`) so the
         * desktop hero reads as headline+CTA-left /
         * visual-card-right instead of a narrow phone mockup
         * stretched onto a wide monitor. The existing marketing
         * sections below remain unchanged in structure (pillars,
         * disciplines, companion onboarding, final CTA) and are
         * now read as the "browse further" surface beneath the
         * onboarding hero.
         */}
        <YoAppLandingShell
          visual={
            <div className="relative" id="yo-featured-course">
              <div className="absolute -inset-3 rounded-[2rem] bg-[#13A085]/12 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-[2rem] border border-[#E7DFCF] bg-white shadow-[0_18px_46px_rgba(23,38,66,0.08)]">
                {yoModule.heroImagePath ? (
                  <Image
                    src={yoModule.heroImagePath}
                    alt={t(yoModule.heroImageAlt ?? yoModule.destinationLabel, locale)}
                    width={1500}
                    height={900}
                    priority={false}
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : null}
                <div className="border-t border-[#E7DFCF] bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#13A085]">
                        {t(HUB_COPY.featuredEyebrow, locale)}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#172642]">
                        {t(HUB_COPY.featuredTitle, locale)}
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-[#E7DFCF] bg-[#FBF7EE] px-4 py-2 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#566073]">
                        {t(HUB_COPY.priceLabel, locale)}
                      </p>
                      <p className="text-lg font-black text-[#172642]">
                        {formatYoPrice(yoModule.priceCents, locale, yoModule.currency)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#566073]">
                    {t(HUB_COPY.featuredBody, locale)}
                  </p>
                  <Link
                    href={courseHref}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#13A085] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16B597]"
                  >
                    {t(HUB_COPY.featuredCta, locale)}
                    <span aria-hidden>→</span>
                  </Link>
                  {/* Trust strip: 12-month access + 30-day money-back guarantee. */}
                  <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#E7DFCF] bg-[#FBF7EE] px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F1EB] px-3 py-1 text-xs font-semibold text-[#172642]">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {t(HUB_COPY.twelveMonthAccessLabel, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F1EB] px-3 py-1 text-xs font-semibold text-[#172642]">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {t(HUB_COPY.moneyBackLabel, locale)}
                      </span>
                    </div>
                    <Link
                      href="/legal/yo-remboursement"
                      className="text-[11px] font-medium text-[#566073] underline-offset-2 hover:underline"
                    >
                      {t(HUB_COPY.legalLinkLabel, locale)}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <YoAppHeroCard locale={locale} headingLevel="h2" />
          <YoAppValueStrip locale={locale} />
        </YoAppLandingShell>

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
                {locale === "fr" ? "Méthode" : "Method"}
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

            {/* Featured PROGRAM shortcut (Francisation).
                Sub-callout, intentionally smaller than the three
                top-level family cards above. Francisation is NOT a
                fourth top-level discipline — it's a sub-program under
                Langues → Français québécois / Francisation. */}
            <Link
              href={francisationHref}
              className="mt-6 flex flex-col gap-1.5 rounded-2xl border border-[#0F6E56]/15 bg-white/80 px-4 py-3 text-sm shadow-[0_2px_8px_rgba(15,110,86,0.06)] transition hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#F4B400]/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                  {t(HUB_COPY.featuredProgramEyebrow, locale)}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F6E56]">
                    {t(HUB_COPY.featuredProgramTitle, locale)}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-[#0F6E56]/72">
                    {t(HUB_COPY.featuredProgramBody, locale)}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F6E56]">
                {t(HUB_COPY.featuredProgramCta, locale)} <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        </section>

        {/*
         * Public bridge explainer. Replaces the legacy pair of
         * teaser + consent-section components which together rendered
         * a misleading "Bientôt" consent checkbox with fake demo
         * data and no companion image. Real consent now lives
         * exclusively in BookingModal via the booking-time consent
         * surface, and real student-side companion state lives on
         * /student/progress. This card is honest about that split
         * and surfaces auth-aware CTAs to bridge to both.
         */}
        <YoPublicCompanionOnboardingCard locale={locale} />

        <section className="bg-[#0F6E56] px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/15 bg-white/8 p-6 shadow-[0_20px_60px_rgba(3,42,33,0.24)] sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#FFF4D6]">
                <Globe2 className="size-3.5" aria-hidden />
                {locale === "fr" ? "Langues" : "Languages"}
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
                href={languesHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FFF4D6] px-5 py-3 text-sm font-black text-[#0F6E56] transition hover:bg-[#ffefbd]"
              >
                <BookOpenCheck className="size-4" aria-hidden />
                {t(HUB_COPY.finalCta, locale)}
              </Link>
              {/* The featured Spanish RD course already exposes its
                  price up top. The bottom CTA points to the Langues
                  hub so it reads as a discipline-level entry point,
                  not a single-course upsell. `courseHref` and
                  `yoModule` stay imported so the hero featured-course
                  card keeps working. */}
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#FFF4D6]/72">
                {locale === "fr"
                  ? "Cinq parcours d’introduction"
                  : "Five intro paths"}
              </p>
            </div>
          </div>
        </section>
        </details>
      </main>
    </div>
  );
}
