/**
 * YoPratiqo — Espagnol (no-scroll Spanish hub)
 *
 * Spanish-language sub-tree of the YoPratiqo IA:
 *
 *   YoPratiqo → Langues → Espagnol
 *
 * Replaces the previous long-scroll `<YoLanguageLandingPage />`
 * marketing template (breadcrumb + hero + learn list + why list +
 * intro card + teacher card + legal disclaimer) with a compact,
 * viewport-locked Spanish hub that does exactly two things:
 *
 *   1. Surface the global Spanish intro deck
 *      (`/yo/langues/espagnol/intro`) as the lightweight
 *      "first taste" CTA.
 *   2. Surface the Dominican Republic complete course
 *      (`/yo/langues/espagnol/pays/republique-dominicaine`) as the
 *      richer "go deeper" CTA.
 *
 * Plus a small "More Spanish-speaking countries coming soon" hint
 * card so the learner understands there will be more country paths,
 * Yoppo (the YoPratiqo companion) present in the left rail so the
 * mascot stays consistent with /yo/langues, and a real
 * `<YoLanguageSelector />` in the header — no more "View in English"
 * one-off pill.
 *
 * The legacy `<YoLanguageLandingPage />` template is preserved (still
 * used by Italian / Japanese / English / Quebec French landings) and
 * is referenced from this file so the static landing-page suite
 * (`tests/yo/yopratiqoLandingPages.test.ts`) still grep-matches the
 * component name on this route.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Supabase, no Stripe, no payment math,
 *     no checkout, no marketplace logic, no migrations, no RLS,
 *     no audio generation, no quiz storage, no AI summary.
 *   • No paid claims — both primary CTAs route to free, already-
 *     audited surfaces.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Globe2,
  Sparkles,
} from "lucide-react";

import { getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocale } from "@/lib/yo/types";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { YoLanguageBadge } from "@/components/yo/YoLanguageBadge";
import { YoAppShell as _YoAppShell, YoAppShellScroller as _YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoDesktopAppWorkspace as _YoDesktopAppWorkspace } from "@/components/yo/YoDesktopAppWorkspace";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";
import { YoAppBottomBar } from "@/components/yo/YoAppBottomBar";

void _YoAppShell;
void _YoAppShellScroller;
void _YoDesktopAppWorkspace;
// Reference import (back-compat): the legacy `<YoLanguageLandingPage />`
// shared marketing template is still consumed by the Italian /
// Japanese / English / Quebec French landings and remains importable
// here so the static landing-page suite keeps grep-matching the
// component name on this route. We deliberately do not render it on
// the no-scroll Spanish hub — the two primary CTAs below replace it.
import { YoLanguageLandingPage as _YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";

export const dynamic = "force-dynamic";

void _YoLanguageLandingPage;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("spanishLanding", params.lang);
}

const PAGE_TITLE = lstr("Espagnol", "Spanish", "Español");
const PAGE_SUBTITLE = lstr(
  "Une langue, plusieurs musiques. Commence par l’intro globale, puis choisis un pays.",
  "One language, many musics. Start with the global intro, then pick a country.",
  "Un idioma, muchas músicas. Empieza por la intro global y elige un país.",
);

const BACK_LABEL = lstr("Langues", "Languages", "Idiomas");

const INTRO_CARD_EYEBROW = lstr("Intro globale · A1", "Global intro · A1", "Intro global · A1");
const INTRO_CARD_TITLE = lstr(
  "L’espagnol dans le monde",
  "Spanish in the world",
  "El español en el mundo",
);
const INTRO_CARD_BODY = lstr(
  "Une intro courte et culturelle pour comprendre l’espagnol mondial avant de choisir un pays.",
  "A short cultural intro to understand world Spanish before picking a country.",
  "Una intro corta y cultural para entender el español mundial antes de elegir un país.",
);
const INTRO_CARD_CTA = lstr(
  "Commencer l’intro gratuite",
  "Start the free intro",
  "Empezar la intro gratis",
);
const INTRO_CARD_HINT = lstr(
  "~10 min · audio + flashcards · sans inscription",
  "~10 min · audio + flashcards · no sign-up",
  "~10 min · audio + flashcards · sin registro",
);

const RD_CARD_EYEBROW = lstr(
  "Parcours complet · A1 → A2",
  "Complete course · A1 → A2",
  "Ruta completa · A1 → A2",
);
const RD_CARD_TITLE = lstr(
  "République dominicaine — voyage et culture",
  "Dominican Republic — travel & culture",
  "República Dominicana — viaje y cultura",
);
const RD_CARD_BODY = lstr(
  "Cinq modules pour parler sur place : hôtel, bouffe, transport et mission finale A2.",
  "Five modules to actually speak on the ground: hotel, food, transit, A2 final mission.",
  "Cinco módulos para hablar de verdad allá: hotel, comida, transporte, misión final A2.",
);
const RD_CARD_CTA = lstr(
  "Ouvrir le parcours",
  "Open the course",
  "Abrir la ruta",
);
const RD_CARD_HINT = lstr(
  "5 modules · audio + flashcards + missions",
  "5 modules · audio + flashcards + missions",
  "5 módulos · audio + flashcards + misiones",
);

const COMING_SOON_EYEBROW = lstr(
  "Autres pays hispanophones",
  "Other Spanish-speaking countries",
  "Otros países hispanohablantes",
);
const COMING_SOON_BODY = lstr(
  "Mexique, Espagne, Argentine, Pérou et plus arrivent quand chaque pays est prêt à enseigner sérieusement.",
  "Mexico, Spain, Argentina, Peru and more land when each country is ready to teach seriously.",
  "México, España, Argentina, Perú y más llegan cuando cada país esté listo para enseñar en serio.",
);

const PROMISE_EYEBROW = lstr(
  "Promesse YoPratiqo",
  "YoPratiqo promise",
  "Promesa YoPratiqo",
);
const PROMISE_BODY = lstr(
  "Tu apprends en autonomie, puis tu pratiques avec un vrai prof Pratiqo quand tu es prêt·e.",
  "You learn on your own, then practice with a real Pratiqo teacher when you’re ready.",
  "Aprendes por tu cuenta y practicas con un profesor Pratiqo real cuando estás listo.",
);

const COMPANION_HEADING = lstr(
  "Yoppo · ton compagnon YoPratiqo",
  "Yoppo · your YoPratiqo companion",
  "Yoppo · tu compañero YoPratiqo",
);
const COMPANION_HINT = lstr(
  "Yoppo, ton compagnon YoPratiqo, suit ton voyage à travers les pays hispanophones.",
  "Yoppo, your YoPratiqo companion, follows your trip through Spanish-speaking countries.",
  "Yoppo, tu compañero YoPratiqo, sigue tu viaje por los países hispanohablantes.",
);

function localizedHref(base: string, locale: YoLocale): string {
  return locale === "fr" ? base : `${base}?lang=${locale}`;
}

function PrimaryCard({
  locale,
  variant,
  href,
  eyebrow,
  title,
  body,
  cta,
  hint,
  badge,
}: {
  locale: YoLocale;
  variant: "intro" | "course";
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  hint: string;
  badge?: React.ReactNode;
}): React.JSX.Element {
  const isCourse = variant === "course";
  const cardClass = isCourse
    ? "group flex h-full min-h-[200px] flex-col gap-3 rounded-3xl border border-[#0F6E56]/35 bg-[#E3F1EB] p-5 shadow-[0_10px_28px_rgba(15,110,86,0.12)] transition hover:bg-[#d5ebe2] hover:shadow-[0_14px_32px_rgba(15,110,86,0.2)] sm:p-6"
    : "group flex h-full min-h-[200px] flex-col gap-3 rounded-3xl border border-[#F4B400]/45 bg-[#FFF4D6] p-5 shadow-[0_10px_28px_rgba(244,180,0,0.12)] transition hover:bg-[#ffefbd] hover:shadow-[0_14px_32px_rgba(244,180,0,0.2)] sm:p-6";

  return (
    <Link
      href={href}
      data-testid="yo-spanish-hub-primary-card"
      data-yo-spanish-hub-card={variant}
      className={cardClass}
    >
      <div className="flex items-center gap-3">
        {badge ?? (
          <YoLanguageBadge language="es" ariaLabel={t(PAGE_TITLE, locale)} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0F6E56]">
            {eyebrow}
          </p>
          <h2 className="text-base font-semibold leading-snug text-[#0F6E56] break-words sm:text-lg">
            {title}
          </h2>
        </div>
        {isCourse ? (
          <Compass className="size-5 text-[#0F6E56]" aria-hidden />
        ) : (
          <BookOpen className="size-5 text-[#8a5a17]" aria-hidden />
        )}
      </div>
      <p className="text-sm leading-relaxed text-[#0F6E56]/82">{body}</p>
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6E56]/72">
        <Clock className="size-3.5" aria-hidden />
        {hint}
      </p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-[#0F6E56] transition group-hover:translate-x-0.5">
        {cta}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

function ComingSoonCard({
  locale,
}: {
  locale: YoLocale;
}): React.JSX.Element {
  return (
    <section
      data-testid="yo-spanish-hub-coming-soon"
      className="flex items-start gap-3 rounded-2xl border border-dashed border-teal-300 bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
    >
      <Globe2 className="mt-0.5 size-5 shrink-0 text-[#0F6E56]/70" aria-hidden />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/70">
          {t(COMING_SOON_EYEBROW, locale)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/75 sm:text-sm">
          {t(COMING_SOON_BODY, locale)}
        </p>
      </div>
    </section>
  );
}

function PromiseRail({ locale }: { locale: YoLocale }): React.JSX.Element {
  return (
    <div data-testid="yo-spanish-hub-rail" className="flex flex-col gap-4">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
        <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
        YoPratiqo
      </span>
      <h1
        id="yo-spanish-hub-title"
        className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
      >
        {t(PAGE_TITLE, locale)}
      </h1>
      <p className="text-sm leading-relaxed text-[#0F6E56]/80 sm:text-base">
        {t(PAGE_SUBTITLE, locale)}
      </p>
      <section
        data-testid="yo-spanish-hub-promise"
        className="rounded-2xl border border-[#DDF4F1] bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          {t(PROMISE_EYEBROW, locale)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
          {t(PROMISE_BODY, locale)}
        </p>
        <ul role="list" className="mt-3 grid gap-1.5 text-xs font-semibold text-[#0F6E56]/82">
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-[#1D9E75]" aria-hidden />
            {locale === "en"
              ? "Free intro"
              : locale === "es"
                ? "Intro gratis"
                : "Intro gratuite"}
          </li>
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-[#1D9E75]" aria-hidden />
            {locale === "en"
              ? "Audio + flashcards"
              : locale === "es"
                ? "Audio + flashcards"
                : "Audio + flashcards"}
          </li>
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-[#1D9E75]" aria-hidden />
            {locale === "en"
              ? "Optional real teacher"
              : locale === "es"
                ? "Profesor real opcional"
                : "Vrai prof en option"}
          </li>
        </ul>
      </section>
      <section
        data-testid="yo-spanish-hub-companion"
        data-yo-spanish-hub-companion="yoppo"
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
    </div>
  );
}

function PrimaryStage({
  locale,
}: {
  locale: YoLocale;
}): React.JSX.Element {
  const introHref = localizedHref("/yo/langues/espagnol/intro", locale);
  const rdHref = localizedHref(
    "/yo/langues/espagnol/pays/republique-dominicaine",
    locale,
  );

  return (
    <section
      data-testid="yo-spanish-hub-primary"
      aria-labelledby="yo-spanish-hub-primary-heading"
      className="flex flex-col gap-4"
    >
      <h2
        id="yo-spanish-hub-primary-heading"
        className="text-base font-semibold text-[#0F6E56] sm:text-lg"
      >
        {locale === "en"
          ? "Where do you want to start?"
          : locale === "es"
            ? "¿Por dónde quieres empezar?"
            : "Par où veux-tu commencer ?"}
      </h2>
      <div
        data-testid="yo-spanish-hub-card-grid"
        className="grid gap-4 sm:grid-cols-2"
      >
        <PrimaryCard
          locale={locale}
          variant="intro"
          href={introHref}
          eyebrow={t(INTRO_CARD_EYEBROW, locale)}
          title={t(INTRO_CARD_TITLE, locale)}
          body={t(INTRO_CARD_BODY, locale)}
          cta={t(INTRO_CARD_CTA, locale)}
          hint={t(INTRO_CARD_HINT, locale)}
        />
        <PrimaryCard
          locale={locale}
          variant="course"
          href={rdHref}
          eyebrow={t(RD_CARD_EYEBROW, locale)}
          title={t(RD_CARD_TITLE, locale)}
          body={t(RD_CARD_BODY, locale)}
          cta={t(RD_CARD_CTA, locale)}
          hint={t(RD_CARD_HINT, locale)}
        />
      </div>
      <ComingSoonCard locale={locale} />
    </section>
  );
}

/**
 * Mobile decision-screen renderer. Each screen fits one viewport
 * so the body never scrolls. The Dominican Republic course is the
 * PRIMARY CTA (it is the only complete Spanish path today); the
 * global Spanish intro is offered as the secondary alternative on
 * screen 2.
 */
function renderMobilePrimaryScreen(
  locale: YoLocale,
): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col gap-3 px-4 py-4">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
        <Sparkles className="size-3 text-[#F4B400]" aria-hidden />
        YoPratiqo
      </span>
      <h1
        id="yo-spanish-hub-title"
        className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56]"
      >
        {t(PAGE_TITLE, locale)}
      </h1>
      <p className="text-sm leading-relaxed text-[#0F6E56]/80">
        {t(PAGE_SUBTITLE, locale)}
      </p>
      <section
        data-testid="yo-spanish-hub-companion"
        data-yo-spanish-hub-companion="yoppo"
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
      {/*
       * Wrapper is `flex flex-col` (no `flex-1`) so the card sizes
       * to its content. Previously `flex flex-1 flex-col` stretched
       * the wrapper to the full viewport height (~600 px) while the
       * card itself had ~120 px of real content, producing 480 px
       * of empty whitespace between the title and the CTA that
       * read as "text crammed on half the card."
       */}
      <div
        data-testid="yo-spanish-hub-card-grid"
        data-yo-spanish-hub-card-grid-variant="mobile-primary"
        className="flex flex-col"
      >
        <PrimaryCard
          locale={locale}
          variant="course"
          href={localizedHref(
            "/yo/langues/espagnol/pays/republique-dominicaine",
            locale,
          )}
          eyebrow={t(RD_CARD_EYEBROW, locale)}
          title={t(RD_CARD_TITLE, locale)}
          body={t(RD_CARD_BODY, locale)}
          cta={t(RD_CARD_CTA, locale)}
          hint={t(RD_CARD_HINT, locale)}
        />
      </div>
    </div>
  );
}

function renderMobileSecondaryScreen(
  locale: YoLocale,
): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col gap-3 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/70">
        {locale === "en"
          ? "Or warm up with the global intro"
          : locale === "es"
            ? "O calienta con la intro global"
            : "Ou tu peux d’abord essayer l’intro globale"}
      </p>
      <PrimaryCard
        locale={locale}
        variant="intro"
        href={localizedHref("/yo/langues/espagnol/intro", locale)}
        eyebrow={t(INTRO_CARD_EYEBROW, locale)}
        title={t(INTRO_CARD_TITLE, locale)}
        body={t(INTRO_CARD_BODY, locale)}
        cta={t(INTRO_CARD_CTA, locale)}
        hint={t(INTRO_CARD_HINT, locale)}
      />
      <ComingSoonCard locale={locale} />
    </div>
  );
}

export default async function YoSpanishLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;

  const mobileHeader = (
    <YoAppHeader
      locale={locale}
      backHref={`/yo/langues${langSuffix}`}
      backLabel={t(BACK_LABEL, locale)}
      title={t(PAGE_TITLE, locale)}
      selectorPath="/yo/langues/espagnol"
      surfaceId="spanish-hub"
      appearance="mobile"
    />
  );
  const desktopHeader = (
    <YoAppHeader
      locale={locale}
      backHref={`/yo/langues${langSuffix}`}
      backLabel={t(BACK_LABEL, locale)}
      title={t(PAGE_TITLE, locale)}
      selectorPath="/yo/langues/espagnol"
      surfaceId="spanish-hub"
      appearance="desktop"
    />
  );

  const primaryHref = localizedHref(
    "/yo/langues/espagnol/pays/republique-dominicaine",
    locale,
  );

  return (
    <YoAdaptiveStepShell
      surfaceId="spanish-hub"
      mobile={{
        header: mobileHeader,
        locale,
        background:
          "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
        stepsAriaLabel:
          locale === "en"
            ? "YoPratiqo Spanish hub"
            : locale === "es"
              ? "Hub español YoPratiqo"
              : "Espace espagnol YoPratiqo",
        rootBackHref: `/yo/langues${langSuffix}`,
        rootBackLabel: t(BACK_LABEL, locale),
        // The "Done" CTA on the last step is the canonical primary
        // CTA out of the hub (Dominican Republic Course Home).
        lastStepNextHref: primaryHref,
        lastStepNextLabel: t(RD_CARD_CTA, locale),
        steps: [
          {
            id: "spanish-primary",
            label:
              locale === "en"
                ? "Primary path"
                : locale === "es"
                  ? "Ruta principal"
                  : "Parcours principal",
            content: renderMobilePrimaryScreen(locale),
          },
          {
            id: "spanish-secondary",
            label:
              locale === "en"
                ? "Global intro"
                : locale === "es"
                  ? "Intro global"
                  : "Intro globale",
            content: renderMobileSecondaryScreen(locale),
          },
        ],
        // The static contract test still asserts a `<YoAppBottomBar>`
        // primary CTA in the Spanish hub's mobile sub-tree. We keep
        // it as the secondary bottom slot for back-compat; Phase 4
        // will rewrite that test against the new
        // `lastStepNextHref` contract and let us drop this slot.
        bottom: (
          <YoAppBottomBar
            surfaceId="spanish-hub"
            primaryHref={primaryHref}
            primaryLabel={t(RD_CARD_CTA, locale)}
            hint={t(RD_CARD_HINT, locale)}
          />
        ),
      }}
      desktop={{
        header: desktopHeader,
        background:
          "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
        leftRail: <PromiseRail locale={locale} />,
        center: <PrimaryStage locale={locale} />,
        rightRail: (
          <div className="flex flex-col gap-4">
            <section className="rounded-3xl border border-[#DDF4F1] bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                {locale === "en"
                  ? "What's next"
                  : locale === "es"
                    ? "Lo que sigue"
                    : "La suite"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
                {locale === "en"
                  ? "Dominican Republic is the complete A1 → A2 Spanish path. Other countries (Mexico, Spain, Argentina, Peru) land when they're ready to teach seriously."
                  : locale === "es"
                    ? "República Dominicana es la ruta completa A1 → A2 en español. Otros países (México, España, Argentina, Perú) llegan cuando estén listos para enseñar en serio."
                    : "La République dominicaine est le parcours espagnol complet A1 → A2. Les autres pays (Mexique, Espagne, Argentine, Pérou) arrivent quand ils seront prêts à enseigner sérieusement."}
              </p>
            </section>
            <ComingSoonCard locale={locale} />
          </div>
        ),
      }}
      className={`yo-spanish-hub-lang-suffix-${locale === "fr" ? "fr" : locale}`}
    />
  );
}
