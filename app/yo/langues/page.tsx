/**
 * YoPratiqo — Langues hub (premium app catalog)
 *
 * Top of the language sub-tree in the YoPratiqo IA:
 *
 *   YoPratiqo → Langues
 *
 * The legacy page used `YoBreadcrumb` as primary navigation and a
 * single grid of cards under a wide hero. The new design follows
 * the all-language-intros app-shell brief:
 *
 *   - The breadcrumb is replaced by an app-style header that
 *     pairs a Back-to-YoPratiqo arrow with the `<YoPratiqoLogo>`
 *     and a compact title, mirroring the deck-header rhythm of
 *     the actual intro routes downstream.
 *   - On `lg:` viewports the layout splits into a sticky product-
 *     promise rail on the left and a premium tile grid on the
 *     right, so desktop no longer feels like stretched mobile.
 *   - On `sm:` the existing two-column grid is preserved.
 *
 * Routing is unchanged: five language cards each open the
 * matching free intro on `/yo/langues/<slug>/intro` (Spanish
 * still routes to the country-funnel landing at
 * `/yo/langues/espagnol`, which CTAs into the Spanish intro deck
 * and the Dominican Republic course home — preserved verbatim).
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Supabase, no Stripe, no payment math,
 *     no checkout, no marketplace logic, no migrations, no RLS.
 *   • No paid claims — every "Disponible" badge corresponds to a
 *     free intro that actually exists at the linked route.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Globe2,
  Sparkles,
} from "lucide-react";

import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocalizedString } from "@/lib/yo/types";
import {
  YoLanguageBadge,
  type YoLanguageBadgeId,
} from "@/components/yo/YoLanguageBadge";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("languageHub", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_TITLE = lstr("Langues", "Languages");

const PAGE_SUBTITLE = lstr(
  "Apprends une langue avec des parcours immersifs, culturels et pratiques.",
  "Learn a language through immersive, cultural, and practical paths.",
);

const SECTION_TITLE = lstr("Choisis ta langue", "Pick your language");

const SECTION_BODY = lstr(
  "Cinq parcours d’introduction gratuits sont disponibles : espagnol, français du Québec, italien, anglais et japonais. Chaque langue commence par une intro premium ; la suite arrive quand chaque parcours est prêt à enseigner sérieusement.",
  "Five free intro modules are now available: Spanish, Quebec French, Italian, English, and Japanese. Every language starts with a premium intro; the rest arrives when each course is ready to teach seriously.",
);

const PROMISE_TITLE = lstr(
  "Une promesse simple",
  "A simple promise",
);

const PROMISE_BODY = lstr(
  "Tu choisis une langue. On commence par une intro courte, claire, culturelle. Quand tu es prêt·e, tu pratiques avec un vrai prof Pratiqo.",
  "Pick a language. We start with a short, clear, culturally grounded intro. When you’re ready, you practice with a real Pratiqo teacher.",
);

const PROMISE_POINTS_FR = [
  "Intro gratuite",
  "Sans inscription",
  "Pas d’IA tutrice",
  "Audio + flashcards",
];

const PROMISE_POINTS_EN = [
  "Free intro",
  "No sign-up required",
  "No AI tutor",
  "Audio + flashcards",
];

const COMPANION_HINT = lstr(
  "Ton compagnon de voyage t’accompagne dans chaque intro.",
  "Your travel companion follows you through every intro.",
);

const BACK_TO_YOPRATIQO = lstr(
  "Retour à YoPratiqo",
  "Back to YoPratiqo",
);

interface LanguageCard {
  id: string;
  name: YoLocalizedString;
  /**
   * Visual badge id rendered as a CSS-painted swatch via
   * `<YoLanguageBadge>` (Windows desktop ships no color flag
   * glyphs, so Unicode regional-indicator emojis would degrade
   * to a bare two-letter code).
   */
  badge: YoLanguageBadgeId;
  blurb: YoLocalizedString;
  status: "available" | "coming_soon";
  href: string | null;
  /** Short eyebrow string rendered above the language name on the tile. */
  eyebrow: YoLocalizedString;
}

const LANGUAGES: LanguageCard[] = [
  {
    id: "spanish",
    name: lstr("Espagnol", "Spanish"),
    badge: "es",
    eyebrow: lstr("Monde", "World"),
    blurb: lstr(
      "Une langue, plusieurs musiques. Comprends l’espagnol mondial, puis choisis un pays.",
      "One language, many musics. Understand world Spanish, then pick a country.",
    ),
    status: "available",
    href: "/yo/langues/espagnol",
  },
  {
    id: "french",
    // Launch scope is intentionally narrow: francisation + Québec /
    // Canadian French. We are not yet supporting Parisian, African,
    // or other global French variants — the badge is the Quebec
    // fleurdelisé to match. The first open module is a free
    // English-first pre-arrival intro for international learners.
    //
    // Canonical card label triple — keeps the IA story consistent:
    // Francisation lives UNDER Langues → Français québécois /
    // Francisation, never as a peer top-level discipline. The same
    // canonical FR/EN/ES strings are pinned by the IA test suite so
    // a future contributor can't quietly reframe the program.
    name: lstr(
      "Français québécois / Francisation",
      "Quebec French / Francization",
      "Francés quebequense / Francización",
    ),
    badge: "fr-ca",
    eyebrow: lstr("Pré-arrivée", "Pre-arrival"),
    // Copy harmonised on the merge with main: every newly-opened
    // launch card ends with "Nouveau." / "New." for consistency.
    blurb: lstr(
      "Francisation et français du Québec pour vivre, étudier ou travailler au Canada. Nouveau.",
      "Francization and Québec/Canadian French for living, studying, or working in Canada. New.",
    ),
    status: "available",
    href: "/yo/langues/francais-quebec/intro",
  },
  {
    id: "italian",
    name: lstr("Italien", "Italian"),
    badge: "it",
    eyebrow: lstr("Culture", "Culture"),
    blurb: lstr(
      "Italien pour voyager, comprendre la culture et parler avec confiance dès les premières situations. Nouveau.",
      "Italian for travel, culture, and confident first conversations. New.",
    ),
    status: "available",
    href: "/yo/langues/italien/intro",
  },
  {
    id: "english",
    name: lstr("Anglais", "English"),
    badge: "en",
    eyebrow: lstr("Confiance", "Confidence"),
    blurb: lstr(
      "Anglais pour débloquer ta confiance, voyager, travailler et parler avec moins de stress. Nouveau.",
      "English to unlock confidence for travel, work, and real conversations. New.",
    ),
    status: "available",
    href: "/yo/langues/anglais/intro",
  },
  {
    id: "japanese",
    name: lstr("Japonais", "Japanese"),
    badge: "ja",
    eyebrow: lstr("Découverte", "Discovery"),
    blurb: lstr(
      "Japonais pour voyager, comprendre la culture et découvrir les bases de l’écriture sans paniquer. Nouveau.",
      "Japanese for travel, culture, and understanding the writing system without panic. New.",
    ),
    status: "available",
    href: "/yo/langues/japonais/intro",
  },
];

export default async function YoLanguesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues",
    locale === "fr" ? "en" : "fr",
  );
  const promisePoints = locale === "en" ? PROMISE_POINTS_EN : PROMISE_POINTS_FR;

  return (
    <div
      data-testid="yo-langues-catalog"
      data-yo-langues-catalog="true"
      className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]"
    >
      {/* App-style header. Mirrors the deck-header rhythm so the
          catalog feels like part of the same product as the intros
          downstream. No `YoBreadcrumb` here — back-arrow + logo +
          language toggle are the three affordances. */}
      <header
        data-testid="yo-langues-catalog-header"
        className="sticky top-0 z-30 border-b border-[#E7DFCF]/70 bg-[#FAFCFB]/95 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            data-testid="yo-langues-catalog-back"
            href={`/yo${langSuffix}`}
            aria-label={t(BACK_TO_YOPRATIQO, locale)}
            className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white sm:px-3"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">
              {t(BACK_TO_YOPRATIQO, locale)}
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden sm:inline-flex">
              <YoPratiqoLogo size="sm" priority={false} />
            </span>
            <span
              data-testid="yo-langues-catalog-title"
              className="truncate text-sm font-semibold text-[#172642] sm:text-[15px]"
            >
              {t(PAGE_TITLE, locale)}
            </span>
          </div>
          <Link
            data-testid="yo-langues-catalog-lang-toggle"
            href={toggleHref}
            className="inline-flex items-center rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-xs font-bold text-[#172642] transition hover:bg-white sm:px-3"
          >
            {locale === "fr" ? "View in English" : "Voir en français"}
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex flex-col pb-20">
        {/* Responsive two-pane layout. Mobile + sm stacks; lg
            splits into a sticky product-promise rail on the left
            and the language-card grid on the right so desktop
            stops feeling like stretched mobile. */}
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 pt-8 pb-12 sm:px-8 sm:pt-10 lg:grid-cols-[1fr,1.6fr] lg:gap-10 lg:pt-12">
          {/* Left rail: product promise + companion. */}
          <aside
            data-testid="yo-langues-catalog-rail"
            className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start"
          >
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
              <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
              YoPratiqo
            </span>
            <h1
              id="yo-langues-title"
              className="text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
            <section
              data-testid="yo-langues-catalog-promise"
              className="rounded-3xl border border-[#DDF4F1] bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                <Compass className="mr-1 inline size-3.5" aria-hidden />
                {t(PROMISE_TITLE, locale)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85">
                {t(PROMISE_BODY, locale)}
              </p>
              <ul role="list" className="mt-3 grid gap-2">
                {promisePoints.map((point) => (
                  <li
                    key={point}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F6E56]/85"
                  >
                    <CheckCircle2
                      className="size-3.5 text-[#1D9E75]"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section
              data-testid="yo-langues-catalog-companion"
              className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
            >
              <CompanionAvatar
                visualId="travel"
                state="map"
                locale={locale}
                size="sm"
                compact
              />
              <p className="text-xs leading-relaxed text-[#0F6E56]/80 sm:text-sm">
                {t(COMPANION_HINT, locale)}
              </p>
            </section>
          </aside>

          {/* Right pane: premium language tile grid. Mobile = 1
              column; sm = 2; lg = 2 (we keep the cards comfortable
              and tall — no four-up cram). */}
          <section
            data-testid="yo-langues-catalog-grid"
            aria-labelledby="yo-langues-section-title"
            className="flex flex-col gap-4"
          >
            <div>
              <h2
                id="yo-langues-section-title"
                className="flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
              >
                <Globe2 className="size-5 text-[#1D9E75]" aria-hidden />
                {t(SECTION_TITLE, locale)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78">
                {t(SECTION_BODY, locale)}
              </p>
            </div>
            <ul
              role="list"
              data-testid="yo-langues-catalog-tiles"
              className="grid gap-4 sm:grid-cols-2"
            >
              {LANGUAGES.map((language) => {
                const isAvailable = language.status === "available";
                const href = language.href
                  ? `${language.href}${langSuffix}`
                  : null;

                const cardClassBase =
                  "group flex h-full min-h-[180px] flex-col gap-3 rounded-3xl border p-5 shadow-[0_8px_24px_rgba(15,58,52,0.05)] transition sm:min-h-[200px] sm:p-6";
                const cardClass = isAvailable
                  ? `${cardClassBase} border-[#F4B400]/45 bg-[#FFF4D6] hover:bg-[#ffefbd] hover:shadow-[0_14px_32px_rgba(244,180,0,0.18)]`
                  : `${cardClassBase} border-dashed border-teal-200 bg-white/80`;

                const inner = (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <YoLanguageBadge
                          language={language.badge}
                          ariaLabel={t(language.name, locale)}
                        />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                            {t(language.eyebrow, locale)}
                          </p>
                          <h3 className="text-base font-semibold text-[#0F6E56] sm:text-lg">
                            {t(language.name, locale)}
                          </h3>
                        </div>
                      </div>
                      <span
                        className={
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] " +
                          (isAvailable
                            ? "bg-white text-[#0F6E56] ring-1 ring-[#F4B400]/45"
                            : "bg-[#DDF4F1]/60 text-[#0F6E56]/70")
                        }
                      >
                        {isAvailable ? (
                          <>
                            <CheckCircle2
                              className="size-3 text-[#1D9E75]"
                              aria-hidden
                            />
                            {locale === "fr" ? "Disponible" : "Available"}
                          </>
                        ) : (
                          locale === "fr" ? "À venir" : "Coming"
                        )}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#0F6E56]/78">
                      {t(language.blurb, locale)}
                    </p>
                    {isAvailable ? (
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-[#0F6E56] transition group-hover:translate-x-0.5">
                        {locale === "fr"
                          ? "Ouvrir l’intro gratuite"
                          : "Open the free intro"}{" "}
                        <span aria-hidden>→</span>
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li key={language.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={cardClass}
                        data-yo-langues-card-id={language.id}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div
                        className={cardClass}
                        data-yo-langues-card-id={language.id}
                        aria-disabled="true"
                      >
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
