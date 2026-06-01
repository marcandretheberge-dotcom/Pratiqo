import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";

export type YoPratiqoSeoLocale = "fr" | "en";

export type YoPratiqoSeoRouteId =
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
  | "japaneseIntro";

export type YoPratiqoSeoCopy = {
  title: string;
  description: string;
};

export type YoPratiqoSeoEntry = {
  route: string;
  defaultLocale: YoPratiqoSeoLocale;
  copy: Record<YoPratiqoSeoLocale, YoPratiqoSeoCopy>;
  image?: string;
};

const DEFAULT_OG_IMAGE = `${SITE_URL}/branding/pratiqo-logo.png`;

export const yopratiqoSeoEntries = {
  languageHub: {
    route: "/yo/langues",
    defaultLocale: "fr",
    copy: {
      fr: {
        title:
          "YoPratiqo — Apprendre avec des modules interactifs et de vrais professeurs",
        description:
          "Découvrez les intros gratuites YoPratiqo en espagnol, anglais, français québécois, italien et japonais, puis pratiquez avec un vrai professeur sur Pratiqo.",
      },
      en: {
        title: "YoPratiqo — Learn with interactive modules and real teachers",
        description:
          "Explore free YoPratiqo intros in Spanish, English, Quebec French, Italian, and Japanese, then practice with a real teacher on Pratiqo.",
      },
    },
  },
  englishLanding: {
    route: "/yo/langues/anglais",
    defaultLocale: "fr",
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
    },
  },
  japaneseLanding: {
    route: "/yo/langues/japonais",
    defaultLocale: "fr",
    copy: {
      fr: {
        title: "Japonais avec YoPratiqo — hiragana, culture et premiers mots",
        description:
          "Découvrez le japonais avec une intro rassurante : hiragana, katakana, kanji, politesse, culture, audio et premières phrases utiles.",
      },
      en: {
        title: "Japanese with YoPratiqo — hiragana, culture and first words",
        description:
          "Discover Japanese with a reassuring intro: hiragana, katakana, kanji, politeness, culture, audio, and first useful phrases.",
      },
    },
  },
  italianLanding: {
    route: "/yo/langues/italien",
    defaultLocale: "fr",
    copy: {
      fr: {
        title: "Italien avec YoPratiqo — voyage, culture et premières phrases",
        description:
          "Découvrez l’italien avec une intro culturelle : premiers mots, régions, phrases utiles, audio et pratique guidée avec un professeur.",
      },
      en: {
        title: "Italian with YoPratiqo — travel, culture and first phrases",
        description:
          "Discover Italian with a cultural intro: first words, regions, useful phrases, audio, and guided practice with a teacher.",
      },
    },
  },
  spanishIntro: {
    route: "/yo/langues/espagnol/intro",
    defaultLocale: "fr",
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
    copy: {
      fr: {
        title: "Intro japonais — Hiragana, culture et premiers mots | YoPratiqo",
        description:
          "Commencez le japonais avec une intro rassurante : hiragana, katakana, kanji, politesse, culture, audio et premiers mots essentiels.",
      },
      en: {
        title: "Japanese Intro — Hiragana, culture and first words | YoPratiqo",
        description:
          "Start Japanese with a reassuring intro to hiragana, katakana, kanji, politeness, culture, audio, and essential first words.",
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

export function buildYoPratiqoMetadata(
  routeId: YoPratiqoSeoRouteId,
  lang?: string | string[],
): Metadata {
  const entry: YoPratiqoSeoEntry = yopratiqoSeoEntries[routeId];
  const locale = resolveYoPratiqoSeoLocale(lang, entry.defaultLocale);
  const copy = entry.copy[locale];
  const canonical = `${SITE_URL}${entry.route}`;
  const image = entry.image ?? DEFAULT_OG_IMAGE;
  const indexable = yopratiqoProductConfig.moduleIndexingEnabled;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: "Pratiqo",
      type: "website",
      url: canonical,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
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
