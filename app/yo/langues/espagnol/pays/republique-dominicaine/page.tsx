/**
 * YoPratiqo — Espagnol · Pays · République dominicaine A1 (Course Home)
 *
 * Canonical position of the RD A1 course inside the YoPratiqo IA:
 *
 *   YoPratiqo → Langues → Espagnol → République dominicaine
 *
 * No-scroll app-style Course Home. Replaces the previous Course Home
 * that mounted the full long-form `<RepubliqueDominicaineContent />`
 * below the app primitives (which made the page a long vertical
 * scroll). The primary view now fits one viewport on every common
 * device size and surfaces five focused affordances:
 *
 *   1. `<YoCourseAppHeader />`       app top bar — single back link
 *                                    to /yo/langues/espagnol, compact
 *                                    YoPratiqo brand mark, real
 *                                    FR/EN/ES language selector.
 *   2. `<YoCourseHero />`            rounded country hero, primary
 *                                    CTA into the Intro deck +
 *                                    secondary "skip to Module 2".
 *   3. `<YoCoursePath />`            5-step roadmap pointing at the
 *                                    real module routes.
 *   4. `<YoCourseCompanionPanel />`  Yoppo, the YoPratiqo companion,
 *                                    with auth-aware progress CTA.
 *   5. "Discover this course" link   secondary entry-point to the
 *                                    long-form discovery sub-route
 *                                    at `/decouvrir` so the legacy
 *                                    educational content (free intro
 *                                    experience, dictionary,
 *                                    flashcards, quiz, unlock card,
 *                                    feature strip, printables) is
 *                                    still one tap away — just no
 *                                    longer in the primary scrolled
 *                                    body.
 *
 * Desktop additionally uses a `<YoDesktopAppWorkspace />` pattern
 * (left rail = Yoppo + path overview, center = hero + roadmap +
 * companion) so the surface no longer feels like a stretched phone
 * on lg+ viewports.
 *
 * Locale: ?lang=en → English, ?lang=es → Spanish, default → French.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No Supabase write, no Stripe, no payment
 *     math, no checkout, no marketplace, no audio generation, no
 *     RLS edits, no migrations, no AI summary, no raw quiz
 *     exposure. The booking-time consent surface and the
 *     `<YoStudentCompanionCard />` are NOT touched.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ChevronRight } from "lucide-react";

import { SITE_URL } from "@/lib/seo/site";
import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { buildYoLocaleHref, getYoLocale, t } from "@/lib/yo/localize";
import { YoCourseAppHeader } from "@/components/yo/YoCourseAppHeader";
import { YoCourseCompanionPanel } from "@/components/yo/YoCourseCompanionPanel";
import { YoCourseHero } from "@/components/yo/YoCourseHero";
import { YoCoursePath, type YoCoursePathStep } from "@/components/yo/YoCoursePath";
import { YoAppShell as _YoAppShell, YoAppShellScroller as _YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoDesktopAppWorkspace as _YoDesktopAppWorkspace } from "@/components/yo/YoDesktopAppWorkspace";
import { YoAdaptiveShell } from "@/components/yo/YoAdaptiveShell";
import { YoAppBottomBar } from "@/components/yo/YoAppBottomBar";

void _YoAppShell;
void _YoAppShellScroller;
void _YoDesktopAppWorkspace;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Espagnol République dominicaine A1",
  description:
    "Apprends à vraiment parler sur place avec culture, expressions locales et missions réelles. Parcours République dominicaine A1, $24,99 CAD.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
  },
  openGraph: {
    title: "YoPratiqo — République dominicaine A1",
    description:
      "Espagnol pratique, culture dominicaine et expressions locales. $24,99 CAD.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

/**
 * Static per-locale copy for the Course Home roadmap. Mirrors the
 * source data in `lib/yo/dominicanRepublicA1.ts` (where the 5 module
 * routes + titles + statuses live) but renders shorter, app-style
 * outcomes specifically tuned for the roadmap cards.
 */
const ROADMAP_BASE: ReadonlyArray<
  Omit<YoCoursePathStep, "ctaLabel" | "title" | "outcome">
  & { id: "intro" | "module-2" | "module-3" | "module-4" | "module-5" }
> = [
  {
    id: "intro",
    position: 1,
    level: "A1",
    status: "next",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  },
  {
    id: "module-2",
    position: 2,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  },
  {
    id: "module-3",
    position: 3,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  },
  {
    id: "module-4",
    position: 4,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  },
  {
    id: "module-5",
    position: 5,
    level: "A2",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  },
];

const ROADMAP_COPY = {
  fr: {
    intro: {
      title: "Intro",
      outcome: "Premières phrases utiles, culture et expressions du quotidien.",
      cta: "Commencer",
    },
    module2: {
      title: "Hôtel & aéroport",
      outcome: "Passer la douane, prendre un taxi, faire le check-in.",
      cta: "Ouvrir",
    },
    module3: {
      title: "Bouffe & culture locale",
      outcome: "Lire un menu, commander, payer, demander l’addition.",
      cta: "Ouvrir",
    },
    module4: {
      title: "Se déplacer & explorer",
      outcome: "Demander son chemin, prendre la guagua, raconter ta journée.",
      cta: "Ouvrir",
    },
    module5: {
      title: "Mission finale A2",
      outcome: "Capstone voyage : résoudre les imprévus et clore ton parcours.",
      cta: "Mission finale",
    },
  },
  en: {
    intro: {
      title: "Intro",
      outcome: "First useful phrases, culture, and everyday expressions.",
      cta: "Start",
    },
    module2: {
      title: "Hotel & airport",
      outcome: "Customs, taxi, hotel check-in, the first 30 minutes on the ground.",
      cta: "Open",
    },
    module3: {
      title: "Food & local culture",
      outcome: "Reading a menu, ordering, paying, asking for the bill.",
      cta: "Open",
    },
    module4: {
      title: "Get around & explore",
      outcome: "Asking directions, taking the guagua, telling your day.",
      cta: "Open",
    },
    module5: {
      title: "Final A2 mission",
      outcome: "Travel capstone: handle the unexpected and close your trip.",
      cta: "Final mission",
    },
  },
  es: {
    intro: {
      title: "Intro",
      outcome: "Primeras frases útiles, cultura y expresiones del día a día.",
      cta: "Empezar",
    },
    module2: {
      title: "Hotel y aeropuerto",
      outcome: "Aduana, taxi, check-in en el hotel, los primeros 30 minutos.",
      cta: "Abrir",
    },
    module3: {
      title: "Comida y cultura local",
      outcome: "Leer un menú, pedir, pagar, pedir la cuenta.",
      cta: "Abrir",
    },
    module4: {
      title: "Moverte y explorar",
      outcome: "Pedir direcciones, tomar la guagua, contar tu día.",
      cta: "Abrir",
    },
    module5: {
      title: "Misión final A2",
      outcome: "Capstone de viaje: resolver imprevistos y cerrar tu trayecto.",
      cta: "Misión final",
    },
  },
} as const;

const DISCOVER_COPY = {
  fr: {
    label: "Découvrir le cours",
    hint: "Contenu détaillé : intro libre, dictionnaire, flashcards, quiz, imprimables.",
  },
  en: {
    label: "Discover this course",
    hint: "Long-form details: free intro, dictionary, flashcards, quiz, printables.",
  },
  es: {
    label: "Descubrir el curso",
    hint: "Contenido detallado: intro libre, diccionario, flashcards, cuestionarios, imprimibles.",
  },
} as const;

function buildRoadmap(locale: "fr" | "en" | "es"): YoCoursePathStep[] {
  const copy = ROADMAP_COPY[locale];
  return ROADMAP_BASE.map((step) => {
    const c =
      step.id === "intro"
        ? copy.intro
        : step.id === "module-2"
          ? copy.module2
          : step.id === "module-3"
            ? copy.module3
            : step.id === "module-4"
              ? copy.module4
              : copy.module5;
    return {
      position: step.position,
      title: c.title,
      outcome: c.outcome,
      level: step.level,
      status: step.status,
      ctaLabel: c.cta,
      href: step.href,
    };
  });
}

function DiscoverLink({
  href,
  locale,
}: {
  href: string;
  locale: "fr" | "en" | "es";
}): React.JSX.Element {
  const copy = DISCOVER_COPY[locale];
  return (
    <Link
      data-testid="yo-course-home-discover-link"
      data-yo-course-discover="true"
      href={href}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E7DFCF] bg-white/85 p-4 shadow-[0_1px_2px_rgba(23,38,66,0.04)] transition hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-[#13A085]" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#172642]">{copy.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#566073]">{copy.hint}</p>
        </div>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-[#172642]/55 transition group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export default async function YoEspagnolRepubliqueDominicainePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;

  const { module } = dominicanRepublicA1;
  const heroImageAlt = t(module.heroImageAlt ?? module.destinationLabel, locale);

  // Back nav points one step up the canonical IA — to the
  // Spanish-language hub — so the user can fan back out to other
  // Spanish countries / the global Spanish intro quickly.
  const backHref = `/yo/langues/espagnol${langSuffix}`;
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/espagnol/pays/republique-dominicaine",
    locale === "fr" ? "en" : "fr",
  );
  const discoverHref = `/yo/langues/espagnol/pays/republique-dominicaine/decouvrir${langSuffix}`;

  const roadmap = buildRoadmap(locale);

  const heroBlock = (
    <YoCourseHero
      locale={locale}
      heroImagePath={module.heroImagePath ?? "/images/yo/app/hero.png"}
      heroImageAlt={heroImageAlt}
    />
  );
  const pathBlock = <YoCoursePath locale={locale} steps={roadmap} />;
  const companionBlock = <YoCourseCompanionPanel locale={locale} />;
  const discoverBlock = <DiscoverLink href={discoverHref} locale={locale} />;

  // Mobile mounts the same building blocks (preserves audit-tested
  // visual + a11y contracts) but lays them out as 3 paged screens:
  //
  //   Screen 1 — hero + primary CTA + Yoppo
  //   Screen 2 — path / roadmap
  //   Screen 3 — companion details + discover link
  //
  // so a 360x740 phone never has to vertically scroll the Course
  // Home. The intro deck CTA stays on screen 1 as the obvious
  // primary affordance.
  const introHref = `/yo/langues/espagnol/pays/republique-dominicaine/intro${langSuffix}`;
  const startLabel = locale === "en" ? "Start the intro" : locale === "es" ? "Empezar la intro" : "Commencer l’intro";
  const startHint = locale === "en"
    ? "Free intro · ~10 min · audio + flashcards"
    : locale === "es"
      ? "Intro gratis · ~10 min · audio + flashcards"
      : "Intro gratuite · ~10 min · audio + flashcards";

  const mobileHeroScreen = (
    <div className="flex h-full w-full flex-col gap-4 px-4 py-4">
      <div className="flex-1">{heroBlock}</div>
      <div className="shrink-0">{companionBlock}</div>
    </div>
  );
  const mobilePathScreen = (
    <div className="flex h-full w-full flex-col gap-4 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/70">
        {locale === "en"
          ? "Your path · Intro → Modules 2-5"
          : locale === "es"
            ? "Tu ruta · Intro → Módulos 2-5"
            : "Ton parcours · Intro → Modules 2-5"}
      </p>
      <div className="flex-1">{pathBlock}</div>
    </div>
  );
  const mobileDetailsScreen = (
    <div className="flex h-full w-full flex-col gap-4 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/70">
        {locale === "en"
          ? "Want more details?"
          : locale === "es"
            ? "¿Quieres más detalles?"
            : "Plus de détails ?"}
      </p>
      {discoverBlock}
      <section className="rounded-3xl border border-[#DDF4F1] bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          {locale === "en"
            ? "Teacher bridge"
            : locale === "es"
              ? "Puente con profesores"
              : "Pont vers les profs"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
          {locale === "en"
            ? "Practice on your own here; when you're ready, book a real Pratiqo teacher — no auto-routing, no recording, no data forwarding."
            : locale === "es"
              ? "Practica por tu cuenta aquí; cuando estés listo, reserva un profesor Pratiqo real — sin enrutado automático, sin grabación, sin envío de datos."
              : "Tu pratiques en autonomie ici ; quand tu es prêt·e, réserve un vrai prof Pratiqo — pas d’auto-routage, pas d’enregistrement, pas de transfert de données."}
        </p>
      </section>
    </div>
  );

  return (
    <YoAdaptiveShell
      surfaceId="rd-course-home"
      mobile={{
        header: (
          <YoCourseAppHeader
            locale={locale}
            backHref={backHref}
            toggleHref={toggleHref}
          />
        ),
        background: "bg-[#F4EFE6]",
        pagerAriaLabel:
          locale === "en"
            ? "Dominican Republic course home screens"
            : locale === "es"
              ? "Pantallas del curso de República Dominicana"
              : "Écrans de la République dominicaine",
        screens: [
          {
            id: "hero",
            label:
              locale === "en"
                ? "Course identity"
                : locale === "es"
                  ? "Identidad del curso"
                  : "Identité du cours",
            content: mobileHeroScreen,
          },
          {
            id: "path",
            label:
              locale === "en"
                ? "Path"
                : locale === "es"
                  ? "Ruta"
                  : "Parcours",
            content: mobilePathScreen,
          },
          {
            id: "details",
            label:
              locale === "en"
                ? "Details"
                : locale === "es"
                  ? "Detalles"
                  : "Détails",
            content: mobileDetailsScreen,
          },
        ],
        bottom: (
          <YoAppBottomBar
            surfaceId="rd-course-home"
            primaryHref={introHref}
            primaryLabel={startLabel}
            hint={startHint}
          />
        ),
      }}
      desktop={{
        header: (
          <YoCourseAppHeader
            locale={locale}
            backHref={backHref}
            toggleHref={toggleHref}
          />
        ),
        background: "bg-[#F4EFE6]",
        leftRail: (
          <div className="flex flex-col gap-4">
            {companionBlock}
            {discoverBlock}
          </div>
        ),
        center: (
          <div className="flex flex-col gap-5">
            {heroBlock}
            {pathBlock}
          </div>
        ),
        rightRail: (
          <div className="flex flex-col gap-4">
            <section className="rounded-3xl border border-[#DDF4F1] bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                {locale === "en"
                  ? "Teacher bridge"
                  : locale === "es"
                    ? "Puente con profesores"
                    : "Pont vers les profs"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
                {locale === "en"
                  ? "Practice solo here; when you're ready, book a real Pratiqo teacher — no auto-routing, no recording, no data forwarding."
                  : locale === "es"
                    ? "Practica solo aquí; cuando estés listo, reserva un profesor Pratiqo real — sin enrutado automático, sin grabación, sin envío de datos."
                    : "Pratique en autonomie ici ; quand tu es prêt·e, réserve un vrai prof Pratiqo — pas d’auto-routage, pas d’enregistrement, pas de transfert de données."}
              </p>
            </section>
          </div>
        ),
      }}
    />
  );
}
