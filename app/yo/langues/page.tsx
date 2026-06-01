/**
 * YoPratiqo — Langues hub
 *
 * Top of the language sub-tree in the new YoPratiqo IA:
 *
 *   YoPratiqo → Langues
 *
 * Renders five language cards. All five are now open:
 *   - Spanish → /yo/langues/espagnol (Latin-American flavoured intro)
 *   - Français du Québec → /yo/langues/francais-quebec/intro
 *     (English-first pre-arrival orientation for international
 *     learners moving to Quebec).
 *   - Italian → /yo/langues/italien/intro (premium FR-default
 *     orientation: standard Italian, regions, first words, audio).
 *   - English → /yo/langues/anglais/intro (FR-default
 *     confidence-building module for Quebec francophone false
 *     beginners — those who studied English at school but freeze
 *     when they need to speak).
 *   - Japanese → /yo/langues/japonais/intro (FR-default cultural
 *     orientation: writing systems, sound, politeness, cultural
 *     codes, audio). Pratiqo's first non-Latin-script module.
 *
 * Locale behaviour: French default, English via `?lang=en`. The
 * available cards carry the locale through to the next route.
 *
 * No Supabase, no Stripe, no payment math, no checkout, no marketplace.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Globe2, Lock, Sparkles } from "lucide-react";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocalizedString } from "@/lib/yo/types";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import {
  YoLanguageBadge,
  type YoLanguageBadgeId,
} from "@/components/yo/YoLanguageBadge";

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

const SECTION_TITLE = lstr(
  "Choisis ta langue",
  "Pick your language",
);

const SECTION_BODY = lstr(
  "Cinq parcours d’introduction gratuits sont disponibles : espagnol, français du Québec, italien, anglais et japonais. Chaque langue commence par une intro premium ; la suite arrive quand chaque parcours est prêt à enseigner sérieusement.",
  "Five free intro modules are now available: Spanish, Quebec French, Italian, English, and Japanese. Every language starts with a premium intro; the rest arrives when each course is ready to teach seriously.",
);

interface LanguageCard {
  id: string;
  name: YoLocalizedString;
  /**
   * Visual badge id. We render a CSS-painted swatch via
   * `<YoLanguageBadge>` rather than a Unicode regional-indicator
   * emoji, because Windows desktop ships no color flag glyphs and
   * would degrade to a bare two-letter code (looks broken).
   */
  badge: YoLanguageBadgeId;
  blurb: YoLocalizedString;
  status: "available" | "coming_soon";
  href: string | null;
}

const LANGUAGES: LanguageCard[] = [
  {
    id: "spanish",
    name: lstr("Espagnol", "Spanish"),
    badge: "es",
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
    name: lstr("Français du Québec", "Quebec French"),
    badge: "fr-ca",
    // Copy harmonised on the merge with main: every newly-opened
    // launch card ends with "Nouveau." / "New." for consistency.
    // Tests still guard the francisation-only scope (no "Paris",
    // no "Afrique", no "world French") and the FR/EN equivalents
    // still mention francisation, Québec, and Canada.
    blurb: lstr(
      "Francisation et français du Québec pour vivre, étudier ou travailler au Canada. Nouveau.",
      "Francization and Québec/Canadian French for living, studying, or working in Canada. New.",
    ),
    status: "available",
    href: "/yo/langues/francais-quebec/intro",
  },
  {
    id: "italian",
    // Launch scope: standard Italian for travel, culture, and
    // confident first conversations. Regional variants (Tuscan,
    // Sicilian, Roman, Neapolitan, …) are intentionally OUT OF
    // SCOPE — the audio manifest ships ONE accent profile per
    // language until each regional course is designed and
    // validated by a native speaker. The badge is the Italian
    // tricolour. Italian (`it`) was the third open language at
    // launch.
    name: lstr("Italien", "Italian"),
    badge: "it",
    blurb: lstr(
      "Italien pour voyager, comprendre la culture et parler avec confiance dès les premières situations. Nouveau.",
      "Italian for travel, culture, and confident first conversations. New.",
    ),
    status: "available",
    href: "/yo/langues/italien/intro",
  },
  {
    id: "english",
    // Launch scope: a confidence-building module for Quebec
    // francophone false beginners. The flag stays the standard
    // English-language UK badge — Canadian English is covered
    // INSIDE the module content. Other English variants
    // (American, British, Australian, Indian, etc.) are
    // discussed in the lesson but the audio ships ONE accent
    // profile (canadian_english) until each regional variant is
    // designed and validated separately.
    name: lstr("Anglais", "English"),
    badge: "en",
    blurb: lstr(
      "Anglais pour débloquer ta confiance, voyager, travailler et parler avec moins de stress. Nouveau.",
      "English to unlock confidence for travel, work, and real conversations. New.",
    ),
    status: "available",
    href: "/yo/langues/anglais/intro",
  },
  {
    id: "japanese",
    // Launch scope: an FR-default cultural orientation built around
    // the three writing systems (hiragana / katakana / kanji), SOV
    // grammar, polite-form basics, and the cultural codes that
    // surprise newcomers (shoes, no tipping, quiet trains, two-hand
    // exchange, indirect "no"). The audio manifest ships ONE TTS
    // accent profile (`japanese_standard`) — regional variants
    // (Kansai-ben, etc.) are intentionally OUT OF SCOPE until each
    // is designed and validated by a native speaker.
    name: lstr("Japonais", "Japanese"),
    badge: "ja",
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

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            { label: lstr("Langues", "Languages") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-langues-title"
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
                YoPratiqo
              </span>
              <Link
                href={toggleHref}
                className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
              >
                {locale === "fr" ? "View in English" : "Voir en français"}
              </Link>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
              {locale === "fr" ? "Famille de parcours" : "Family of courses"}
            </p>
            <h1
              id="yo-langues-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* Language cards */}
        <section
          aria-labelledby="yo-langues-section-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <h2
            id="yo-langues-section-title"
            className="flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Globe2 className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(SECTION_BODY, locale)}
          </p>

          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-2">
            {LANGUAGES.map((language) => {
              const isAvailable = language.status === "available";
              const href = language.href
                ? `${language.href}${langSuffix}`
                : null;

              const cardClassBase =
                "flex h-full flex-col gap-3 rounded-3xl border p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition sm:p-6";
              const cardClass = isAvailable
                ? `${cardClassBase} border-[#F4B400]/45 bg-[#FFF4D6] hover:bg-[#ffefbd]`
                : `${cardClassBase} border-dashed border-teal-200 bg-white/80`;

              const inner = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <YoLanguageBadge
                        language={language.badge}
                        ariaLabel={t(language.name, locale)}
                      />
                      <h3 className="text-lg font-semibold text-[#0F6E56] sm:text-xl">
                        {t(language.name, locale)}
                      </h3>
                    </div>
                    <span
                      className={
                        "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] " +
                        (isAvailable
                          ? "bg-white text-[#0F6E56] ring-1 ring-[#F4B400]/45"
                          : "bg-[#DDF4F1]/60 text-[#0F6E56]/70")
                      }
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2
                            className="size-3.5 text-[#1D9E75]"
                            aria-hidden
                          />
                          {locale === "fr" ? "Disponible" : "Available"}
                        </>
                      ) : (
                        <>
                          <Lock
                            className="size-3.5 text-[#0F6E56]/55"
                            aria-hidden
                          />
                          {locale === "fr" ? "À venir" : "Coming"}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#0F6E56]/75">
                    {t(language.blurb, locale)}
                  </p>
                  {isAvailable ? (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-[#0F6E56]">
                      {locale === "fr" ? "Ouvrir le parcours" : "Open the course"}{" "}
                      <span aria-hidden>→</span>
                    </span>
                  ) : null}
                </>
              );

              return (
                <li key={language.id}>
                  {href ? (
                    <Link href={href} className={cardClass}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cardClass} aria-disabled="true">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
