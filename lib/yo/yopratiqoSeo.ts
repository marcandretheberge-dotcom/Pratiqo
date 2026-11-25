import type { Metadata } from "next";
import type { YoLocale } from "./types";

import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, t } from "./localize";
import { getYoPublicLanguages, isYoPublicLanguageIndexable, yoPublicCatalog } from "./publicCatalog";
import {
  isYoHubIndexable,
  isYoIntroPageIndexable,
  isYoPremiumModuleIndexable,
  type YoPratiqoModuleSlug,
  type YoPratiqoPageType,
} from "@/lib/yo/yopratiqoProductConfig";

export function buildYoCatalogItemList(locale: YoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: getYoPublicLanguages().map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: t(item.name, locale),
      url: SITE_URL + buildYoLocaleHref(item.landingRoute, item.presentationLocales.includes(locale) ? locale : "fr"),
    })),
  };
}

export type YoPratiqoSeoLocale = "fr" | "en";

export type YoPratiqoSeoRouteId =
  | "hub"
  | "germanLanding"
  | "portugueseLanding"
  | "mandarinLanding"
  | "languageHub"
  | "englishLanding"
  | "frenchQuebecLanding"
  | "spanishLanding"
  | "japaneseLanding"
  | "italianLanding"
  | "spanishIntro"
  | "frenchQuebecIntro"
  | "italianIntro"
  | "englishIntro"
  | "japaneseIntro"
  | "frenchQuebecModuleOne";

export type YoPratiqoSeoCopy = {
  title: string;
  description: string;
};

export type YoPratiqoSeoEntry = {
  route: string;
  defaultLocale: YoPratiqoSeoLocale;
  copy: Record<YoPratiqoSeoLocale, YoPratiqoSeoCopy> & Partial<Record<"es", YoPratiqoSeoCopy>>;
  /**
   * Page taxonomy used by `buildYoPratiqoMetadata` to decide robots
   * `index/follow` (and by Course schema gating). Hub + landing pages
   * are indexable today; intro pages stay noindex until the lesson
   * surface is ready for public ranking; future premium shells stay
   * noindex until the entire premium surface is launch-ready.
   */
  pageType: YoPratiqoPageType;
  /**
   * Slug of the language module this entry belongs to. Required for
   * landing/intro entries, omitted for the hub. Drives both indexing
   * and Course schema decisions per-module.
   */
  slug?: YoPratiqoModuleSlug | "allemand" | "portugais-bresil" | "mandarin";
  /**
   * Stable id of the future premium module this entry represents.
   * Required for `pageType: "future_premium"` entries; ignored
   * everywhere else.
   */
  premiumModuleId?: string;
  image?: string;
};

const DEFAULT_OG_IMAGE = `${SITE_URL}/branding/pratiqo-logo.png`;

function publishedLanding(slug: "allemand" | "portugais-bresil" | "mandarin"): YoPratiqoSeoEntry {
  const course = yoPublicCatalog.find((entry) => entry.slug === slug)!;
  return {
    route: course.landingRoute, defaultLocale: "fr", pageType: "landing", slug,
    copy: {
      fr: { title: `${course.name.fr} avec Yoppo | YoPratiqo`, description: course.description.fr },
      en: { title: `${course.name.en} with Yoppo | YoPratiqo`, description: course.description.en },
      es: { title: `${course.name.es} con Yoppo | YoPratiqo`, description: course.description.es! },
    },
  };
}

export const yopratiqoSeoEntries = {
  hub: {
    route: "/yo", defaultLocale: "fr", pageType: "hub",
    copy: {
      fr: { title: "YoPratiqo — Choisir une langue et pratiquer avec Yoppo", description: "Explore les langues de YoPratiqo : introductions gratuites et parcours avec Yoppo, dialogues, écoute, jeux de pratique et découvertes culturelles." },
      en: { title: "YoPratiqo — Choose a language and practise with Yoppo", description: "Explore YoPratiqo languages: free introductions and courses with Yoppo, dialogues, listening, practice games and cultural discoveries." },
    },
  },
  germanLanding: publishedLanding("allemand"),
  portugueseLanding: publishedLanding("portugais-bresil"),
  mandarinLanding: publishedLanding("mandarin"),
  languageHub: {
    route: "/yo/langues",
    defaultLocale: "fr",
    pageType: "hub",
    copy: {
      fr: {
        title:
          "YoPratiqo — Apprendre avec des modules interactifs et de vrais professeurs",
        description:
          "Choisis ta langue et commence directement : introductions gratuites et parcours YoPratiqo avec Yoppo, dialogues, écoute et jeux de pratique.",
      },
      en: {
        title: "YoPratiqo — Learn with interactive modules and real teachers",
        description:
          "Choose a language and start directly: free introductions and YoPratiqo courses with Yoppo, dialogues, listening and practice games.",
      },
      es: { title: "Idiomas con Yoppo — Catálogo YoPratiqo", description: "Elige tu idioma y empieza directamente: introducciones gratuitas y cursos YoPratiqo con Yoppo, diálogos, escucha y juegos de práctica." },
    },
  },
  englishLanding: {
    route: "/yo/langues/anglais",
    defaultLocale: "fr",
    pageType: "landing",
    slug: "anglais",
    copy: {
      fr: {
        title: "Anglais avec YoPratiqo — confiance à l’oral et pratique réelle",
        description:
          "Découvrez une intro d’anglais pour francophones du Québec et du Canada : phrases utiles, confiance à l’oral et pont vers un vrai professeur.",
      },
      en: {
        title: "English with YoPratiqo — speaking confidence and real practice",
        description:
          "Explore an English intro for Quebec francophones and Canadian learners: useful phrases, speaking confidence, and a bridge to a real teacher.",
      },
    },
  },
  frenchQuebecLanding: {
    route: "/yo/langues/francais-quebec",
    defaultLocale: "fr",
    pageType: "landing",
    slug: "francais-quebec",
    copy: {
      fr: {
        title: "Français québécois avec YoPratiqo — francisation, culture et pratique",
        description:
          "Préparez votre français québécois avec une intro culturelle : mots du quotidien, repères de francisation, contexte local et pratique avec un professeur.",
      },
      en: {
        title: "Quebec French with YoPratiqo — francization, culture and practice",
        description:
          "Prepare for Quebec French with a cultural intro: daily words, francization landmarks, local context, and practice with a real teacher.",
      },
    },
  },
  spanishLanding: {
    route: "/yo/langues/espagnol",
    defaultLocale: "fr",
    pageType: "landing",
    slug: "espagnol",
    copy: {
      fr: {
        title: "Espagnol avec YoPratiqo — voyage, culture et premières conversations",
        description:
          "Commencez l’espagnol avec une intro immersive : premiers mots, culture, phrases de voyage, audio et pont vers un vrai professeur.",
      },
      en: {
        title: "Spanish with YoPratiqo — travel, culture and first conversations",
        description:
          "Start Spanish with an immersive intro: first words, culture, travel phrases, audio, and a bridge to real teacher practice.",
      },
      es: { title: "Español con YoPratiqo — viajes, cultura y primeras conversaciones", description: "Empieza el español con una introducción inmersiva: primeras palabras, cultura, frases de viaje, audio y práctica con un profesor." },
    },
  },
  japaneseLanding: {
    route: "/yo/langues/japonais",
    defaultLocale: "fr",
    pageType: "landing",
    slug: "japonais",
    copy: {
      fr: {
        title: "Japonais avec Yoppo | YoPratiqo — 8 modules",
        description:
          "Un parcours de fondation en huit modules : dialogues guidés, 92 kana, 40 kanji en contexte, culture, écriture et révisions avec Yoppo.",
      },
      en: {
        title: "Japanese with Yoppo | YoPratiqo — 8 modules",
        description:
          "An eight-module foundation course: guided dialogues, 92 kana, 40 kanji in context, culture, writing and review with Yoppo.",
      },
      es: {
        title: "Japonés con Yoppo | YoPratiqo — 8 módulos",
        description:
          "Un curso de fundamentos en ocho módulos: diálogos guiados, 92 kana, 40 kanji en contexto, cultura, escritura y repaso con Yoppo.",
      },
    },
  },
  italianLanding: {
    route: "/yo/langues/italien",
    defaultLocale: "fr",
    pageType: "landing",
    slug: "italien",
    copy: {
      fr: {
        title: "Italien avec Yoppo — 12 unités de pratique | YoPratiqo",
        description:
          "Découvre La vie en italien : douze unités avec Yoppo, dialogues, écoute, jeux, lectures, projets et quiz culturel en images. Introduction également disponible.",
      },
      en: {
        title: "Italian with Yoppo — 12 practice units | YoPratiqo",
        description:
          "Explore Life in Italian: twelve units with Yoppo, dialogues, listening, games, readings, projects and a picture-based culture quiz. Introduction also available.",
      },
    },
  },
  spanishIntro: {
    route: "/yo/langues/espagnol/intro",
    defaultLocale: "fr",
    pageType: "intro",
    slug: "espagnol",
    copy: {
      fr: {
        title: "Intro espagnol — Premiers mots, culture et voyage | YoPratiqo",
        description:
          "Commencez l’espagnol avec une intro interactive YoPratiqo : premiers mots, phrases utiles, culture et audio, puis pratique avec un vrai professeur.",
      },
      en: {
        title: "Spanish Intro — First words, culture and travel | YoPratiqo",
        description:
          "Start Spanish with an interactive YoPratiqo intro: first words, useful phrases, culture, audio, and a bridge to real teacher practice.",
      },
    },
  },
  frenchQuebecIntro: {
    route: "/yo/langues/francais-quebec/intro",
    defaultLocale: "en",
    pageType: "intro",
    slug: "francais-quebec",
    copy: {
      fr: {
        title: "Francisation Québec — Intro au français québécois | YoPratiqo",
        description:
          "Découvrez le français québécois, la culture locale, les mots essentiels et les repères de francisation avant de pratiquer avec un professeur.",
      },
      en: {
        title: "Quebec French Intro — Francization and local culture | YoPratiqo",
        description:
          "Learn the basics of Quebec French, local culture, essential words, and francization landmarks before practicing with a real teacher.",
      },
    },
  },
  italianIntro: {
    route: "/yo/langues/italien/intro",
    defaultLocale: "fr",
    pageType: "intro",
    slug: "italien",
    copy: {
      fr: {
        title: "Intro italien — Culture, voyage et premiers mots | YoPratiqo",
        description:
          "Découvrez l’italien avec une intro interactive : premiers mots, culture, régions, phrases utiles et audio pour commencer avec confiance.",
      },
      en: {
        title: "Italian Intro — Culture, travel and first words | YoPratiqo",
        description:
          "Discover Italian with an interactive intro: first words, culture, regions, useful phrases, and audio to start with confidence.",
      },
    },
  },
  englishIntro: {
    route: "/yo/langues/anglais/intro",
    defaultLocale: "fr",
    pageType: "intro",
    slug: "anglais",
    copy: {
      fr: {
        title: "Intro anglais — Débloquer ta confiance à l’oral | YoPratiqo",
        description:
          "Une intro d’anglais pensée pour les Québécois faux-débutants : confiance, phrases utiles, faux amis, anglais canadien et pratique réelle.",
      },
      en: {
        title: "English Intro — Build speaking confidence | YoPratiqo",
        description:
          "An English intro for French-speaking Quebec learners: confidence, useful phrases, false friends, Canadian English, and real practice.",
      },
    },
  },
  japaneseIntro: {
    route: "/yo/langues/japonais/intro",
    defaultLocale: "fr",
    pageType: "intro",
    slug: "japonais",
    copy: {
      fr: {
        title: "Intro japonais — Hiragana, culture et premiers mots | YoPratiqo",
        description:
          "Commencez le japonais avec une intro rassurante : hiragana, katakana, kanji, politesse, culture, audio et premiers mots essentiels.",
      },
      en: {
        title: "Japanese Intro — Hiragana, culture and first words | YoPratiqo",
        description:
          "Start Japanese with a reassuring intro to hiragana, katakana, kanji, politesse, culture, audio, and essential first words.",
      },
    },
  },
  // ── Future premium module shell (Quebec French, workplace survival)
  //
  // Internal/future-ready content surface. Stays noindex until the
  // entire premium product surface is launch-ready (gated through the
  // central `premiumModulesEnabled` + per-module `publicLaunchEnabled`
  // flags). The module shell intentionally exposes NO Course JSON-LD
  // and NO sitemap entry — see `app/sitemap.ts` and the gate inside
  // `lib/yo/yopratiqoProductConfig.ts`.
  frenchQuebecModuleOne: {
    route: "/yo/langues/francais-quebec/module-1",
    defaultLocale: "fr",
    pageType: "future_premium",
    slug: "francais-quebec",
    premiumModuleId: "fr-quebec-workplace-survival-1",
    copy: {
      fr: {
        title:
          "Français québécois au travail — Survie quotidienne (bientôt disponible) | YoPratiqo",
        description:
          "Aperçu du futur module YoPratiqo pour mieux comprendre le français québécois au travail. Préparation éducative — pas de garantie de fluidité, d’examen ou d’immigration.",
      },
      en: {
        title:
          "Quebec French at Work — Daily-Life Survival (coming soon) | YoPratiqo",
        description:
          "Preview of an upcoming YoPratiqo module focused on understanding everyday Quebec French at work. Educational preparation — no fluency, exam, or immigration guarantee.",
      },
    },
  },
} as const satisfies Record<YoPratiqoSeoRouteId, YoPratiqoSeoEntry>;

export function resolveYoPratiqoSeoLocale(
  input: string | string[] | undefined,
  fallback: YoPratiqoSeoLocale,
): YoPratiqoSeoLocale {
  const raw = Array.isArray(input) ? input[0] : input;
  const normalized = raw?.trim().toLowerCase();
  return normalized === "en" || normalized === "fr" ? normalized : fallback;
}

/**
 * Centralised gate for "is this route currently indexable?".
 *
 * Hub + landing pages are governed by the new route-aware product
 * config flags (`hubIndexingEnabled`, `landingPageIndexingEnabled`).
 * Intro pages stay noindex until both `introPageIndexingEnabled` AND
 * the per-module `indexable` flag are flipped on. Future premium
 * module shells stay noindex until the entire premium surface is
 * launch-ready (`premiumModulesEnabled` + per-module
 * `publicLaunchEnabled` + `indexable`).
 */
export function isYoPratiqoRouteIndexable(
  routeId: YoPratiqoSeoRouteId,
): boolean {
  const entry: YoPratiqoSeoEntry = yopratiqoSeoEntries[routeId];
  switch (entry.pageType) {
    case "hub":
      return isYoHubIndexable();
    case "landing":
      return entry.slug ? isYoPublicLanguageIndexable(entry.slug) : false;
    case "intro":
      return entry.slug ? isYoIntroPageIndexable(entry.slug) : false;
    case "future_premium":
      return entry.premiumModuleId
        ? isYoPremiumModuleIndexable(entry.premiumModuleId)
        : false;
    default:
      return false;
  }
}

export function buildYoPratiqoMetadata(
  routeId: YoPratiqoSeoRouteId,
  lang?: string | string[],
): Metadata {
  const entry: YoPratiqoSeoEntry = yopratiqoSeoEntries[routeId];
  const locale = resolveYoPratiqoPageLocale(routeId, lang);
  const copy = entry.copy[locale] ?? entry.copy[entry.defaultLocale];
  const canonical = isYoPratiqoRouteIndexable(routeId)
    ? `${SITE_URL}${buildYoLocaleHref(entry.route, locale)}`
    : `${SITE_URL}${entry.route}`;
  const image = entry.image ?? DEFAULT_OG_IMAGE;
  const indexable = isYoPratiqoRouteIndexable(routeId);

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical,
      ...(indexable ? { languages: getYoPratiqoLanguageAlternates(routeId) } : {}),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: "Pratiqo",
      type: "website",
      url: canonical,
      locale: locale === "fr" ? "fr_CA" : locale === "es" ? "es_ES" : "en_CA",
      images: [
        {
          url: image,
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [image],
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
  };
}

/** Resolve only translations actually authored for this public page. */
export function resolveYoPratiqoPageLocale(
  routeId: YoPratiqoSeoRouteId,
  input?: string | string[],
): YoLocale {
  const entry: YoPratiqoSeoEntry = yopratiqoSeoEntries[routeId];
  const requested = (Array.isArray(input) ? input[0] : input)?.trim().toLowerCase();
  if (requested === "es" && entry.copy.es) return "es";
  return resolveYoPratiqoSeoLocale(input, entry.defaultLocale);
}

export function getYoPratiqoLanguageAlternates(routeId: YoPratiqoSeoRouteId): Record<string, string> {
  if (!isYoPratiqoRouteIndexable(routeId)) return {};
  const entry: YoPratiqoSeoEntry = yopratiqoSeoEntries[routeId];
  return Object.fromEntries((["fr", "en", ...(entry.copy.es ? ["es"] : [])] as YoLocale[]).map(locale => [
    locale === "fr" ? "fr-CA" : locale === "en" ? "en-CA" : "es",
    `${SITE_URL}${buildYoLocaleHref(entry.route, locale)}`,
  ]));
}
