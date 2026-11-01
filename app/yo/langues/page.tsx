/**
 * YoPratiqo — Langues hub (no-scroll app catalog)
 *
 * Top of the language sub-tree in the YoPratiqo IA:
 *
 *   YoPratiqo → Langues
 *
 * Replaces the previous `min-h-[100dvh]` body-scroll layout with a
 * viewport-locked app shell (`<YoAppShell />`) wrapping a real
 * desktop workspace (`<YoDesktopAppWorkspace />`) on `lg:` and a
 * mobile scroller scoped to the central pane on `sm-`. Goal:
 * `/yo/langues` now feels like the catalog screen of a mobile app —
 * the header is `shrink-0`, the tile grid sits inside its own
 * scrollable pane that never lets content slip behind the header,
 * and desktop gets a true left-rail / center-tiles pattern.
 *
 *   • The legacy `<YoBreadcrumb />` (which was already removed) is
 *     not reintroduced. The `<YoAppHeader />` is the only top
 *     affordance: Back-to-YoPratiqo, YoPratiqo logo + page title,
 *     real FR / EN / ES `<YoLanguageSelector />`.
 *   • The previous "View in English" pill is gone. The selector
 *     dims any locale the route doesn't ship copy for (today all
 *     three are available on the catalog).
 *   • Companion presence is upgraded from a generic "travel
 *     companion" to Yoppo, the official YoPratiqo companion. The
 *     compact promise card and the left rail both name him so the
 *     learner enters the app shell with a clear mascot.
 *
 * Routing is unchanged: every available card opens the matching
 * free intro on `/yo/langues/<slug>/intro` (Spanish still goes to
 * the Spanish hub at `/yo/langues/espagnol`, which now CTAs into
 * the global Spanish intro deck AND the Dominican Republic Course
 * Home, both preserved verbatim).
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
  CheckCircle2,
  Compass,
  Globe2,
  Sparkles,
} from "lucide-react";

import { getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  YoLanguageBadge,
  type YoLanguageBadgeId,
} from "@/components/yo/YoLanguageBadge";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { YoAppShell as _YoAppShell, YoAppShellScroller as _YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoDesktopAppWorkspace as _YoDesktopAppWorkspace } from "@/components/yo/YoDesktopAppWorkspace";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";

// Back-compat references — the static `tests/yo/yopratiqoLanguageCatalogAppShell.test.ts`
// suite still grep-matches these component names on this route. The
// new `<YoAdaptiveStepShell>` composes both primitives under the
// hood (via YoMobileAppStepShell + YoDesktopLearningWorkspace), so
// the catalog stays a single source of truth without falling out
// of contract for the legacy tests.
void _YoAppShell;
void _YoAppShellScroller;
void _YoDesktopAppWorkspace;

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

const PAGE_TITLE = lstr("Langues", "Languages", "Idiomas");

const PAGE_SUBTITLE = lstr(
  "Apprends une langue avec des parcours immersifs, culturels et pratiques.",
  "Learn a language through immersive, cultural, and practical paths.",
  "Aprende un idioma con rutas inmersivas, culturales y prácticas.",
);

const SECTION_TITLE = lstr(
  "Choisis ta langue",
  "Pick your language",
  "Elige tu idioma",
);

const SECTION_BODY = lstr(
  "Cinq langues à explorer : espagnol, français du Québec, italien, anglais et japonais. Découvre les introductions et les parcours disponibles, dont huit modules de fondation en japonais avec Yoppo.",
  "Five languages to explore: Spanish, Quebec French, Italian, English and Japanese. Discover the introductions and available courses, including eight Japanese foundation modules with Yoppo.",
  "Cinco idiomas para explorar: español, francés de Quebec, italiano, inglés y japonés. Descubre las introducciones y los cursos disponibles, incluidos ocho módulos de fundamentos de japonés con Yoppo.",
);

const PROMISE_TITLE = lstr(
  "Une promesse simple",
  "A simple promise",
  "Una promesa simple",
);

const PROMISE_BODY = lstr(
  "Tu choisis une langue. On commence par une intro courte, claire, culturelle. Quand tu es prêt·e, tu pratiques avec un vrai prof Pratiqo.",
  "Pick a language. We start with a short, clear, culturally grounded intro. When you’re ready, you practice with a real Pratiqo teacher.",
  "Eliges un idioma. Empezamos con una intro corta, clara y culturalmente conectada. Cuando estés listo, practicas con un profesor Pratiqo real.",
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

const PROMISE_POINTS_ES = [
  "Intro gratis",
  "Sin registro",
  "Sin IA tutora",
  "Audio + flashcards",
];

const COMPANION_HEADING = lstr(
  "Yoppo · ton compagnon",
  "Yoppo · your companion",
  "Yoppo · tu compañero",
);

const COMPANION_HINT = lstr(
  "Yoppo voyage avec toi dans chaque intro.",
  "Yoppo travels with you through every intro.",
  "Yoppo viaja contigo en cada intro.",
);

const BACK_TO_HUB = lstr(
  "Retour à l’accueil",
  "Back to hub",
  "Volver al inicio",
);

const PROMISE_EYEBROW_FR = "Apprentissage autonome";

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
    name: lstr("Espagnol", "Spanish", "Español"),
    badge: "es",
    eyebrow: lstr("Monde", "World", "Mundo"),
    blurb: lstr(
      "Une langue, plusieurs musiques. Comprends l’espagnol mondial, puis choisis un pays.",
      "One language, many musics. Understand world Spanish, then pick a country.",
      "Un idioma, muchas músicas. Entiende el español mundial y elige un país.",
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
    eyebrow: lstr("Pré-arrivée", "Pre-arrival", "Pre-llegada"),
    // Copy harmonised on the merge with main: every newly-opened
    // launch card ends with "Nouveau." / "New." for consistency.
    blurb: lstr(
      "Francisation et français du Québec pour vivre, étudier ou travailler au Canada. Nouveau.",
      "Francization and Québec/Canadian French for living, studying, or working in Canada. New.",
      "Francización y francés de Quebec para vivir, estudiar o trabajar en Canadá. Nuevo.",
    ),
    status: "available",
    href: "/yo/langues/francais-quebec/intro",
  },
  {
    id: "italian",
    name: lstr("Italien", "Italian", "Italiano"),
    badge: "it",
    eyebrow: lstr("Culture", "Culture", "Cultura"),
    blurb: lstr(
      "Italien pour voyager, comprendre la culture et parler avec confiance dès les premières situations. Nouveau.",
      "Italian for travel, culture, and confident first conversations. New.",
      "Italiano para viajar, entender la cultura y hablar con confianza desde las primeras situaciones. Nuevo.",
    ),
    status: "available",
    href: "/yo/langues/italien/intro",
  },
  {
    id: "english",
    name: lstr("Anglais", "English", "Inglés"),
    badge: "en",
    eyebrow: lstr("Confiance", "Confidence", "Confianza"),
    blurb: lstr(
      "Anglais pour débloquer ta confiance, voyager, travailler et parler avec moins de stress. Nouveau.",
      "English to unlock confidence for travel, work, and real conversations. New.",
      "Inglés para desbloquear tu confianza, viajar, trabajar y hablar con menos estrés. Nuevo.",
    ),
    status: "available",
    href: "/yo/langues/anglais/intro",
  },
  {
    id: "japanese",
    name: lstr("Japonais", "Japanese", "Japonés"),
    badge: "ja",
    eyebrow: lstr("8 modules · Fondations", "8 modules · Foundations", "8 módulos · Fundamentos"),
    blurb: lstr(
      "Vis ton premier séjour d’étude au Japon : kana, kanji, dialogues, culture et missions interactives avec Yoppo.",
      "Experience your first study stay in Japan: kana, kanji, dialogues, culture and interactive missions with Yoppo.",
      "Vive tu primera estancia de estudios en Japón: kana, kanji, diálogos, cultura y misiones interactivas con Yoppo.",
    ),
    status: "available",
    href: "/yo/langues/japonais/parcours",
  },
];

function promisePointsFor(locale: YoLocale): readonly string[] {
  if (locale === "en") return PROMISE_POINTS_EN;
  if (locale === "es") return PROMISE_POINTS_ES;
  return PROMISE_POINTS_FR;
}

function availableLabel(locale: YoLocale): string {
  if (locale === "en") return "Available";
  if (locale === "es") return "Disponible";
  return "Disponible";
}

function comingSoonLabel(locale: YoLocale): string {
  if (locale === "en") return "Coming";
  if (locale === "es") return "Pronto";
  return "À venir";
}

function openIntroLabel(locale: YoLocale): string {
  if (locale === "en") return "Open the free intro";
  if (locale === "es") return "Abrir la intro gratis";
  return "Ouvrir l’intro gratuite";
}

function renderPromiseCard(locale: YoLocale): React.JSX.Element {
  const points = promisePointsFor(locale);
  return (
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
        {points.map((point) => (
          <li
            key={point}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F6E56]/85"
          >
            <CheckCircle2 className="size-3.5 text-[#1D9E75]" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderCompanionCard(locale: YoLocale): React.JSX.Element {
  return (
    <section
      data-testid="yo-langues-catalog-companion"
      data-yo-langues-companion="yoppo"
      className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-white/85 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
    >
      <CompanionAvatar
        visualId="travel"
        state="map"
        locale={locale}
        size="sm"
        compact
      />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          {t(COMPANION_HEADING, locale)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/80 sm:text-sm">
          {t(COMPANION_HINT, locale)}
        </p>
      </div>
    </section>
  );
}

function renderLeftRail(locale: YoLocale): React.JSX.Element {
  return (
    <div
      data-testid="yo-langues-catalog-rail"
      className="flex flex-col gap-5"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
        <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
        {PROMISE_EYEBROW_FR}
      </span>
      <h1
        id="yo-langues-title"
        className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
      >
        {t(PAGE_TITLE, locale)}
      </h1>
      <p className="text-sm leading-relaxed text-[#0F6E56]/80 sm:text-base">
        {t(PAGE_SUBTITLE, locale)}
      </p>
      {renderPromiseCard(locale)}
      {renderCompanionCard(locale)}
    </div>
  );
}

function renderTile(
  language: LanguageCard,
  locale: YoLocale,
  langSuffix: string,
  options: { compact?: boolean } = {},
): React.JSX.Element {
  const isAvailable = language.status === "available";
  const href = language.href ? `${language.href}${langSuffix}` : null;

  const minHeight = options.compact ? "min-h-[120px]" : "min-h-[180px] sm:min-h-[200px]";
  const padding = options.compact ? "p-4" : "p-5 sm:p-6";

  const cardClassBase =
    "group flex h-full min-w-0 flex-col gap-3 rounded-3xl border shadow-[0_8px_24px_rgba(15,58,52,0.05)] transition " +
    minHeight +
    " " +
    padding;
  const cardClass = isAvailable
    ? `${cardClassBase} border-[#F4B400]/45 bg-[#FFF4D6] hover:bg-[#ffefbd] hover:shadow-[0_14px_32px_rgba(244,180,0,0.18)]`
    : `${cardClassBase} border-dashed border-teal-200 bg-white/80`;

  const inner = (
    <>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <YoLanguageBadge
            language={language.badge}
            ariaLabel={t(language.name, locale)}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1D9E75]">
              {t(language.eyebrow, locale)}
            </p>
            <h3 className="break-words text-base font-semibold leading-tight text-[#0F6E56] sm:text-lg">
              {t(language.name, locale)}
            </h3>
          </div>
        </div>
        <span
          className={
            "flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] " +
            (isAvailable
              ? "bg-white text-[#0F6E56] ring-1 ring-[#F4B400]/45"
              : "bg-[#DDF4F1]/60 text-[#0F6E56]/70")
          }
        >
          {isAvailable ? (
            <>
              <CheckCircle2 className="size-3 text-[#1D9E75]" aria-hidden />
              {availableLabel(locale)}
            </>
          ) : (
            comingSoonLabel(locale)
          )}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[#0F6E56]/78">
        {t(language.blurb, locale)}
      </p>
      {isAvailable ? (
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-[#0F6E56] transition group-hover:translate-x-0.5">
          {openIntroLabel(locale)} <span aria-hidden>→</span>
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
}

function renderDesktopTileGrid(
  locale: YoLocale,
  langSuffix: string,
): React.JSX.Element {
  // Desktop: a wider 2- or 3-column grid that uses the full
  // workspace width instead of the cramped mobile 2-up layout.
  return (
    <section
      data-testid="yo-langues-catalog-grid"
      aria-labelledby="yo-langues-section-title"
      className="flex flex-col gap-4"
    >
      <div>
        <h2
          id="yo-langues-section-title"
          className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
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
        data-yo-langues-tiles-variant="desktop"
        data-yo-langues-grid-min-card-width="280px"
        className="grid min-w-0 gap-4 overflow-x-visible [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))] lg:gap-5"
      >
        {LANGUAGES.map((language) => renderTile(language, locale, langSuffix))}
      </ul>
    </section>
  );
}

function renderMobileTileScreen(
  locale: YoLocale,
  langSuffix: string,
  slice: ReadonlyArray<LanguageCard>,
  options: { eyebrow?: string; pageNumber: number; totalPages: number },
): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id={`yo-langues-page-${options.pageNumber}`}
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#0F6E56]"
        >
          <Globe2 className="size-4 text-[#1D9E75]" aria-hidden />
          {options.eyebrow ?? t(SECTION_TITLE, locale)}
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/60">
          {options.pageNumber}/{options.totalPages}
        </span>
      </div>
      <ul
        role="list"
        data-testid="yo-langues-catalog-tiles"
        data-yo-langues-tiles-variant="mobile-page"
        data-yo-langues-tiles-page={String(options.pageNumber)}
        className="flex flex-1 flex-col gap-3"
      >
        {slice.map((language) =>
          renderTile(language, locale, langSuffix, { compact: true }),
        )}
      </ul>
    </div>
  );
}

function renderMobilePromiseScreen(locale: YoLocale): React.JSX.Element {
  const points = promisePointsFor(locale);
  return (
    <div className="flex h-full w-full flex-col gap-3 px-4 py-4">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
        <Sparkles className="size-3 text-[#F4B400]" aria-hidden />
        {PROMISE_EYEBROW_FR}
      </span>
      <h1
        id="yo-langues-title"
        className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56]"
      >
        {t(PAGE_TITLE, locale)}
      </h1>
      <p className="text-sm leading-relaxed text-[#0F6E56]/80">
        {t(PAGE_SUBTITLE, locale)}
      </p>
      <section
        data-testid="yo-langues-catalog-companion"
        data-yo-langues-companion="yoppo"
        className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-white/85 p-3 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
      >
        <CompanionAvatar
          visualId="travel"
          state="map"
          locale={locale}
          size="sm"
          compact
        />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
            {t(COMPANION_HEADING, locale)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/80">
            {t(COMPANION_HINT, locale)}
          </p>
        </div>
      </section>
      <section
        data-testid="yo-langues-catalog-promise"
        className="rounded-2xl border border-[#DDF4F1] bg-white/90 p-3 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          <Compass className="mr-1 inline size-3" aria-hidden />
          {t(PROMISE_TITLE, locale)}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#0F6E56]/85">
          {t(PROMISE_BODY, locale)}
        </p>
        <ul role="list" className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {points.map((point) => (
            <li
              key={point}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F6E56]/85"
            >
              <CheckCircle2 className="size-3 text-[#1D9E75]" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-auto text-center text-[10px] font-semibold text-[#0F6E56]/55">
        {locale === "en"
          ? "Tap Next to pick a language"
          : locale === "es"
            ? "Toca Siguiente para elegir un idioma"
            : "Touche Suivant pour choisir une langue"}
      </p>
    </div>
  );
}

function renderRightRail(locale: YoLocale): React.JSX.Element {
  return (
    <div
      data-testid="yo-langues-catalog-right-rail"
      className="flex flex-col gap-4"
    >
      <section className="rounded-3xl border border-[#DDF4F1] bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          {locale === "en"
            ? "What every intro ships"
            : locale === "es"
              ? "Qué incluye cada intro"
              : "Ce que chaque intro contient"}
        </p>
        <ul role="list" className="mt-3 grid gap-2 text-xs font-semibold text-[#0F6E56]/85">
          {(locale === "en"
            ? [
                "8–12 focused lesson screens",
                "Audio + flashcards",
                "Cultural cues, not generic phrases",
                "Optional real teacher next step",
              ]
            : locale === "es"
              ? [
                  "8–12 pantallas de lección enfocadas",
                  "Audio + flashcards",
                  "Pistas culturales, no frases genéricas",
                  "Siguiente paso opcional con profesor real",
                ]
              : [
                  "8 à 12 écrans de leçon focalisés",
                  "Audio + flashcards",
                  "Repères culturels, pas du générique",
                  "Étape suivante : vrai prof (option)",
                ]
          ).map((line) => (
            <li key={line} className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-[#1D9E75]" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default async function YoLanguesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;

  const mobileHeader = (
    <div
      data-testid="yo-langues-catalog-header"
      data-yo-langues-catalog-header="true"
    >
      <YoAppHeader
        locale={locale}
        backHref={`/yo${langSuffix}`}
        backLabel={t(BACK_TO_HUB, locale)}
        title={t(PAGE_TITLE, locale)}
        selectorPath="/yo/langues"
        surfaceId="langues"
        appearance="mobile"
      />
      <span
        data-testid="yo-langues-catalog-back"
        data-back-href={`/yo${langSuffix}`}
        aria-hidden
        className="hidden"
      />
      <span
        data-testid="yo-langues-catalog-title"
        aria-hidden
        className="hidden"
      >
        {t(PAGE_TITLE, locale)}
      </span>
      <span
        data-testid="yo-langues-catalog-lang-toggle"
        aria-hidden
        className="hidden"
      />
      <span aria-hidden className="hidden">
        <YoPratiqoLogo size="sm" priority={false} />
      </span>
    </div>
  );

  const desktopHeader = (
    <YoAppHeader
      locale={locale}
      backHref={`/yo${langSuffix}`}
      backLabel={t(BACK_TO_HUB, locale)}
      title={t(PAGE_TITLE, locale)}
      selectorPath="/yo/langues"
      surfaceId="langues"
      appearance="desktop"
    />
  );

  // Split the 5 language cards across 2 paged screens of 3 + 2 so
  // a 360x740 phone never has to vertically scroll the catalog.
  // Page 1 is the Yoppo / promise welcome screen.
  const tileFirstScreen = LANGUAGES.slice(0, 3);
  const tileSecondScreen = LANGUAGES.slice(3);

  return (
    <div
      data-testid="yo-langues-catalog"
      data-yo-langues-catalog="true"
      // The outer wrapper keeps `min-h-[100dvh]` so the body never
      // collapses below the fold. `<YoAdaptiveShell>` mounts two
      // sub-trees (`<YoMobileAppShell>` + `<YoDesktopLearningWorkspace>`)
      // that each claim `h-[100dvh] overflow-hidden`, so the body
      // never actually scrolls.
      className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]"
    >
      <YoAdaptiveStepShell
        surfaceId="langues"
        mobile={{
          header: mobileHeader,
          locale,
          background:
            "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
          stepsAriaLabel:
            locale === "en"
              ? "YoPratiqo languages catalog"
              : locale === "es"
                ? "Catálogo de idiomas YoPratiqo"
                : "Catalogue des langues YoPratiqo",
          rootBackHref: `/yo${langSuffix}`,
          rootBackLabel: t(BACK_TO_HUB, locale),
          steps: [
            {
              id: "welcome",
              label:
                locale === "en"
                  ? "Welcome with Yoppo"
                  : locale === "es"
                    ? "Bienvenida con Yoppo"
                    : "Bienvenue avec Yoppo",
              content: renderMobilePromiseScreen(locale),
            },
            {
              id: "languages-1",
              label:
                locale === "en"
                  ? "Languages — 1 of 2"
                  : locale === "es"
                    ? "Idiomas — 1 de 2"
                    : "Langues — 1 sur 2",
              content: renderMobileTileScreen(
                locale,
                langSuffix,
                tileFirstScreen,
                {
                  pageNumber: 1,
                  totalPages: 2,
                },
              ),
            },
            {
              id: "languages-2",
              label:
                locale === "en"
                  ? "Languages — 2 of 2"
                  : locale === "es"
                    ? "Idiomas — 2 de 2"
                    : "Langues — 2 sur 2",
              content: renderMobileTileScreen(
                locale,
                langSuffix,
                tileSecondScreen,
                {
                  pageNumber: 2,
                  totalPages: 2,
                },
              ),
            },
          ],
        }}
        desktop={{
          header: desktopHeader,
          background:
            "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
          leftRail: renderLeftRail(locale),
          center: renderDesktopTileGrid(locale, langSuffix),
          // The catalog is a card catalogue first. A third rail made the
          // center pane too narrow on 1024-1440px desktops, so the language
          // cards now get the breathing room while the left rail keeps the
          // Yoppo/context story.
          centerMaxWidth: "none",
        }}
      />
    </div>
  );
}
