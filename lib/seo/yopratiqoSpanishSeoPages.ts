/**
 * Phase 1 SEO acquisition pages for YoPratiqo Spanish.
 *
 * These are *acquisition* pages indexed for Google — they live under /fr and
 * /en and link into the YoPratiqo product (under /yo) or the teacher search
 * (/trouver-un-prof). They are not the product/app routes themselves.
 *
 * Brand rules (also enforced by lint search in CI):
 *   - Visible product brand: YoPratiqo (one word). Do not split into two
 *     words and do not introduce sub-brands like the travel section as a
 *     standalone product name.
 *   - Public marketplace brand: Pratiqo.
 *   - Legal / structured-data provider: Cours Pratiqo Inc.
 *
 * Each page is paired across FR ↔ EN via `alternatePath`, so the page.tsx
 * components can emit reciprocal hreflang alternates without hardcoding.
 *
 * Copy decisions Marc-André made (do not soften without consultation):
 *   - No "lifetime access" / "accès à vie" claims.
 *   - No guaranteed teacher availability or fluency outcome.
 *   - No fake testimonials, no unsupported statistics.
 *   - No tourist-only content (hotel/excursion landing pages live elsewhere).
 */

import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo/site";
import type { FAQItem } from "@/lib/seo/types";

export type YoSpanishSeoLocale = "fr" | "en";

export type YoSpanishSeoSlug =
  | "apprendre-espagnol"
  | "learn-spanish"
  | "espagnol-voyage"
  | "spanish-for-travel"
  | "espagnol-republique-dominicaine"
  | "dominican-republic-spanish";

export interface YoSpanishSeoCta {
  /** Visible button label. */
  label: string;
  /** Internal href — must point to a real route in this repo. */
  href: string;
}

export interface YoSpanishSeoSection {
  /** H2 inside the page body. */
  heading: string;
  /** Paragraph body — kept short for mobile readability. */
  body: string;
}

export interface YoSpanishSeoPage {
  /** ISO locale prefix segment (`fr` or `en`). */
  locale: YoSpanishSeoLocale;
  /** Slug under the locale prefix (no leading slash). */
  slug: YoSpanishSeoSlug;
  /** Canonical absolute path on this site, e.g. `/fr/apprendre-espagnol`. */
  path: string;
  /** Counterpart locale path, used for hreflang alternates. */
  alternatePath: string;
  /** Counterpart locale code, used for the in-page language switcher anchor. */
  alternateLocale: YoSpanishSeoLocale;

  // ── Metadata (consumed by each page.tsx Metadata export) ───────────────
  title: string;
  description: string;
  keywords: readonly string[];
  ogTitle: string;
  ogDescription: string;
  /** OpenGraph locale tag, e.g. `fr_CA` or `en_CA`. */
  ogLocale: string;

  // ── Content ────────────────────────────────────────────────────────────
  heroEyebrow: string;
  h1: string;
  /** Two short paragraphs above the fold. */
  heroParagraphs: readonly [string, string];
  sections: readonly [YoSpanishSeoSection, YoSpanishSeoSection, YoSpanishSeoSection, YoSpanishSeoSection];
  /** Primary YoPratiqo CTA — leads into the product. */
  primaryCta: YoSpanishSeoCta;
  /** Teacher CTA — leads to /trouver-un-prof (no Spanish-only filter exists yet). */
  teacherCta: YoSpanishSeoCta;
  finalCtaHeading: string;
  finalCtaBody: string;
  /** Short FAQ — optional, but adds 4 conservative Q&As for FAQPage schema. */
  faq: readonly FAQItem[];

  // ── Breadcrumb (rendered as JSON-LD) ───────────────────────────────────
  breadcrumb: ReadonlyArray<{ name: string; href: string }>;

  // ── Course JSON-LD payload (provider must be the legal entity) ─────────
  courseJsonLd: {
    /** Visible course name in structured data — uses the public brand. */
    name: string;
    /** One-paragraph course description, conservative claims only. */
    description: string;
    /** ISO 639 language tag of the course content (always `es` here). */
    inLanguage: "es";
    /** Schema.org educationalLevel — kept generic. */
    educationalLevel: "Beginner" | "A1";
  };

  // ── Footer / language switcher copy ────────────────────────────────────
  /** Localized "View in English" / "Voir en français" anchor label. */
  langSwitchLabel: string;
  /** Localized footer copyright suffix (legal entity, not brand). */
  footerLegalSuffix: string;
  /** Localized "Home" breadcrumb word — unused if breadcrumb already passes a label. */
  homeLabel: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Page registry
// ──────────────────────────────────────────────────────────────────────────

/** ⚠ Keep paired entries (`alternatePath`, `alternateLocale`) in sync if you rename slugs. */
export const YO_SPANISH_SEO_PAGES: Record<YoSpanishSeoSlug, YoSpanishSeoPage> = {
  // ════════════════════════════════════════════════════════════════════════
  // 1) FR — Apprendre l'espagnol
  // ════════════════════════════════════════════════════════════════════════
  "apprendre-espagnol": {
    locale: "fr",
    slug: "apprendre-espagnol",
    path: "/fr/apprendre-espagnol",
    alternatePath: "/en/learn-spanish",
    alternateLocale: "en",
    title: "Apprendre l’espagnol au Canada | YoPratiqo",
    description:
      "Commence l’espagnol avec YoPratiqo : intro gratuite, quiz, flashcards, prononciation et lien vers de vrais professeurs Pratiqo.",
    keywords: [
      "apprendre l'espagnol",
      "cours d'espagnol en ligne",
      "espagnol débutant",
      "apprendre espagnol Québec",
      "apprendre espagnol Canada",
      "YoPratiqo espagnol",
    ],
    ogTitle: "Apprendre l’espagnol avec YoPratiqo",
    ogDescription:
      "Intro gratuite, quiz, flashcards et prononciation — puis pratique avec un professeur Pratiqo quand tu veux passer à la conversation réelle.",
    ogLocale: "fr_CA",

    heroEyebrow: "Apprendre — Espagnol",
    h1: "Apprendre l’espagnol avec YoPratiqo",
    heroParagraphs: [
      "L’espagnol n’est pas seulement une langue de voyage. C’est une langue mondiale, parlée par des centaines de millions de personnes, avec des accents, des cultures et des expressions qui changent d’un pays à l’autre.",
      "Avec YoPratiqo, tu commences à ton rythme : intro guidée, mots essentiels, quiz, flashcards et prononciation. Puis, quand tu veux parler pour vrai, tu peux pratiquer avec un professeur Pratiqo.",
    ],
    sections: [
      {
        heading: "Pourquoi apprendre l’espagnol?",
        body: "L’espagnol est utile pour voyager, travailler, découvrir d’autres cultures et communiquer avec des communautés partout dans le monde.",
      },
      {
        heading: "Ce que tu apprends avec YoPratiqo",
        body: "Tu découvres les bases : salutations, mots fréquents, phrases utiles, prononciation, compréhension écrite et premiers réflexes de conversation.",
      },
      {
        heading: "Pourquoi YoPratiqo enseigne par pays",
        body: "L’espagnol de la République dominicaine, du Mexique, de l’Uruguay ou de l’Espagne n’a pas toujours les mêmes mots, accents et expressions. YoPratiqo t’aide à comprendre cette réalité dès le début.",
      },
      {
        heading: "Apprendre seul, puis pratiquer avec un vrai professeur",
        body: "YoPratiqo t’aide à te préparer. Un professeur Pratiqo t’aide à corriger, parler, pratiquer et gagner confiance.",
      },
    ],
    primaryCta: {
      label: "Commencer l’intro gratuite à l’espagnol",
      href: "/yo/langues/espagnol/intro",
    },
    teacherCta: {
      label: "Trouver un professeur d’espagnol",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Prêt·e à dire tes premiers mots?",
    finalCtaBody:
      "Commence par l’intro YoPratiqo. Quand tu veux passer à la conversation, un professeur Pratiqo prend le relais.",
    faq: [
      {
        question: "Faut-il déjà parler espagnol pour commencer?",
        answer:
          "Non. L’intro YoPratiqo est conçue pour partir de zéro : salutations, mots fréquents, prononciation et premiers échanges simples.",
      },
      {
        question: "YoPratiqo remplace-t-il un vrai professeur?",
        answer:
          "Non. YoPratiqo est conçu pour la préparation autonome. Pour parler, corriger l’accent et progresser en conversation réelle, un professeur Pratiqo reste plus efficace.",
      },
      {
        question: "Pourquoi enseigner par pays plutôt qu’un espagnol générique?",
        answer:
          "L’espagnol parlé en République dominicaine, au Mexique ou en Espagne n’a pas exactement le même vocabulaire, les mêmes accents ni les mêmes expressions. Apprendre par pays aide à mieux comprendre les vraies conversations sur place.",
      },
      {
        question: "Combien coûte l’intro?",
        answer:
          "L’intro à l’espagnol de YoPratiqo est gratuite. Les parcours par pays sont des achats individuels et restent indépendants des cours avec un professeur Pratiqo.",
      },
    ],
    breadcrumb: [
      { name: "Accueil", href: "/" },
      { name: "Apprendre l’espagnol", href: "/fr/apprendre-espagnol" },
    ],
    courseJsonLd: {
      name: "Apprendre l’espagnol avec YoPratiqo",
      description:
        "Parcours d’introduction à l’espagnol avec YoPratiqo : phrases essentielles, prononciation, quiz et flashcards. Conçu pour débuter à son rythme.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "View in English",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Accueil",
  },

  // ════════════════════════════════════════════════════════════════════════
  // 2) EN — Learn Spanish
  // ════════════════════════════════════════════════════════════════════════
  "learn-spanish": {
    locale: "en",
    slug: "learn-spanish",
    path: "/en/learn-spanish",
    alternatePath: "/fr/apprendre-espagnol",
    alternateLocale: "fr",
    title: "Learn Spanish in Canada | YoPratiqo",
    description:
      "Start learning Spanish with YoPratiqo: free intro, quizzes, flashcards, pronunciation practice, and real Pratiqo teachers.",
    keywords: [
      "learn Spanish",
      "Spanish for beginners",
      "online Spanish course",
      "learn Spanish Canada",
      "Spanish lessons Quebec",
      "YoPratiqo Spanish",
    ],
    ogTitle: "Learn Spanish with YoPratiqo",
    ogDescription:
      "Free intro, quizzes, flashcards, and pronunciation — then practice with a Pratiqo teacher when you’re ready for real conversation.",
    ogLocale: "en_CA",

    heroEyebrow: "Learn — Spanish",
    h1: "Learn Spanish with YoPratiqo",
    heroParagraphs: [
      "Spanish is not only a travel language. It is a world language spoken by hundreds of millions of people, with accents, cultures, and expressions that change from country to country.",
      "With YoPratiqo, you start at your own pace: guided intro, essential words, quizzes, flashcards, and pronunciation practice. Then, when you want to truly speak, you can practice with a Pratiqo teacher.",
    ],
    sections: [
      {
        heading: "Why learn Spanish?",
        body: "Spanish is useful for travel, work, culture, and communication with communities around the world.",
      },
      {
        heading: "What you learn with YoPratiqo",
        body: "You build the basics: greetings, frequent words, useful phrases, pronunciation, reading comprehension, and first conversation reflexes.",
      },
      {
        heading: "Why YoPratiqo teaches by country",
        body: "Spanish in the Dominican Republic, Mexico, Uruguay, or Spain does not always use the same words, accents, and expressions. YoPratiqo helps you understand that from the beginning.",
      },
      {
        heading: "Learn on your own, then practice with a real teacher",
        body: "YoPratiqo helps you prepare. A Pratiqo teacher helps you correct, speak, practice, and gain confidence.",
      },
    ],
    primaryCta: {
      label: "Start the free Spanish intro",
      href: "/yo/langues/espagnol/intro?lang=en",
    },
    teacherCta: {
      label: "Find a Spanish teacher",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Ready to say your first words?",
    finalCtaBody:
      "Start with the YoPratiqo intro. When you want to move into conversation, a Pratiqo teacher takes over.",
    faq: [
      {
        question: "Do I need any Spanish to start?",
        answer:
          "No. The YoPratiqo intro is designed for absolute beginners: greetings, frequent words, pronunciation, and first simple exchanges.",
      },
      {
        question: "Does YoPratiqo replace a real teacher?",
        answer:
          "No. YoPratiqo is designed for self-paced preparation. To actually speak, correct your accent, and progress in real conversation, a Pratiqo teacher remains more effective.",
      },
      {
        question: "Why teach by country instead of a generic Spanish?",
        answer:
          "Spanish in the Dominican Republic, Mexico, or Spain does not always use the same vocabulary, accents, or expressions. Learning by country helps you understand real conversations on the ground.",
      },
      {
        question: "How much does the intro cost?",
        answer:
          "The YoPratiqo Spanish intro is free. Country paths are individual purchases and stay independent from lessons with a Pratiqo teacher.",
      },
    ],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Learn Spanish", href: "/en/learn-spanish" },
    ],
    courseJsonLd: {
      name: "Learn Spanish with YoPratiqo",
      description:
        "Spanish primer with YoPratiqo: essential phrases, pronunciation, quizzes, and flashcards. Designed to start from scratch at your own pace.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "Voir en français",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Home",
  },

  // ════════════════════════════════════════════════════════════════════════
  // 3) FR — Espagnol pour voyager
  // ════════════════════════════════════════════════════════════════════════
  "espagnol-voyage": {
    locale: "fr",
    slug: "espagnol-voyage",
    path: "/fr/espagnol-voyage",
    alternatePath: "/en/spanish-for-travel",
    alternateLocale: "en",
    title: "Espagnol pour voyager | Phrases utiles avec YoPratiqo",
    description:
      "Prépare ton voyage avec l’espagnol essentiel : hôtel, restaurant, transport, plage, urgences simples, quiz et prononciation.",
    keywords: [
      "espagnol pour voyager",
      "phrases espagnoles voyage",
      "espagnol de voyage",
      "vocabulaire espagnol voyage",
      "espagnol vacances",
      "YoPratiqo voyage",
    ],
    ogTitle: "Espagnol pour voyager — phrases utiles | YoPratiqo",
    ogDescription:
      "Les vraies phrases utiles pour ton voyage : hôtel, restaurant, transport, plage. YoPratiqo t’aide à parler dans des situations concrètes.",
    ogLocale: "fr_CA",

    heroEyebrow: "Voyage — Espagnol",
    h1: "Espagnol pour voyager : les bases avant de partir",
    heroParagraphs: [
      "Tu n’as pas besoin de parler parfaitement espagnol pour voyager avec plus de confiance. Mais quelques phrases bien choisies peuvent changer ton expérience : saluer, demander un prix, commander, expliquer un problème ou remercier quelqu’un.",
      "YoPratiqo t’aide à apprendre l’espagnol utile pour les vraies situations de voyage, avec des phrases simples, de la prononciation, des quiz et des parcours par pays.",
    ],
    sections: [
      {
        heading: "Les situations les plus utiles",
        body: "À l’aéroport, à l’hôtel, au restaurant, en taxi, à la plage et dans les petits commerces, les mêmes besoins reviennent souvent : comprendre, demander, remercier, payer et se faire aider.",
      },
      {
        heading: "Les phrases de survie",
        body: "Hola. Gracias. Por favor. No entiendo. ¿Cuánto cuesta? ¿Dónde está...? Quiero... Ces phrases simples te donnent déjà une base pratique.",
      },
      {
        heading: "Pourquoi apprendre selon le pays?",
        body: "Un mot peut changer selon la destination. En République dominicaine, par exemple, « guagua » peut désigner un autobus ou un minibus. YoPratiqo t’aide à apprendre le vocabulaire local, pas seulement l’espagnol générique.",
      },
      {
        heading: "Le pont vers un vrai professeur",
        body: "L’app t’aide à pratiquer seul. Mais si tu veux parler avec plus d’aisance avant ton départ, un professeur peut simuler des situations réelles avec toi.",
      },
    ],
    primaryCta: {
      label: "Commencer l’espagnol voyage",
      href: "/yo/langues/espagnol/intro",
    },
    teacherCta: {
      label: "Trouver un professeur d’espagnol",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Pars avec les bons mots en tête",
    finalCtaBody:
      "Commence par l’intro YoPratiqo, puis va vers le parcours du pays qui t’intéresse. Quand tu veux pratiquer à l’oral avant le départ, un professeur Pratiqo peut t’aider.",
    faq: [
      {
        question: "Combien de temps faut-il pour apprendre l’espagnol de voyage?",
        answer:
          "Cela dépend du temps que tu y consacres. Quelques heures réparties sur deux semaines suffisent souvent pour mémoriser les phrases-clés d’hôtel, de restaurant et de transport.",
      },
      {
        question: "Faut-il acheter le parcours pour commencer?",
        answer:
          "Non. L’intro YoPratiqo est gratuite. Les parcours par pays sont des achats individuels, et ne sont pas requis pour pratiquer avec un professeur Pratiqo.",
      },
      {
        question: "Mes phrases vont-elles fonctionner partout en Amérique latine?",
        answer:
          "Les bases (Hola, Gracias, ¿Cuánto cuesta?, etc.) fonctionnent dans tous les pays hispanophones. Certains mots locaux changent selon la destination — c’est pour ça que YoPratiqo propose des parcours par pays.",
      },
      {
        question: "Et si je veux pratiquer à l’oral avant de partir?",
        answer:
          "Tu peux contacter un professeur d’espagnol via Pratiqo. Il pourra simuler des dialogues d’hôtel, de restaurant ou de taxi avant ton départ.",
      },
    ],
    breadcrumb: [
      { name: "Accueil", href: "/" },
      { name: "Espagnol pour voyager", href: "/fr/espagnol-voyage" },
    ],
    courseJsonLd: {
      name: "Espagnol pour voyager — YoPratiqo",
      description:
        "Phrases d’espagnol utiles pour les situations de voyage (hôtel, restaurant, transport, plage). Niveau débutant, parcours par pays optionnel.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "View in English",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Accueil",
  },

  // ════════════════════════════════════════════════════════════════════════
  // 4) EN — Spanish for Travel
  // ════════════════════════════════════════════════════════════════════════
  "spanish-for-travel": {
    locale: "en",
    slug: "spanish-for-travel",
    path: "/en/spanish-for-travel",
    alternatePath: "/fr/espagnol-voyage",
    alternateLocale: "fr",
    title: "Spanish for Travel | Useful Phrases with YoPratiqo",
    description:
      "Prepare for your trip with essential Spanish for hotels, restaurants, transport, beaches, simple emergencies, quizzes, and pronunciation.",
    keywords: [
      "Spanish for travel",
      "travel Spanish phrases",
      "Spanish vacation phrases",
      "Spanish for vacation",
      "Spanish phrases for tourists",
      "YoPratiqo travel",
    ],
    ogTitle: "Spanish for travel — useful phrases | YoPratiqo",
    ogDescription:
      "Real travel phrases: hotel, restaurant, transport, beach. YoPratiqo helps you speak in concrete situations on the ground.",
    ogLocale: "en_CA",

    heroEyebrow: "Travel — Spanish",
    h1: "Spanish for travel: the basics before you go",
    heroParagraphs: [
      "You do not need perfect Spanish to travel with more confidence. But a few well-chosen phrases can change your experience: greeting someone, asking for a price, ordering food, explaining a problem, or saying thank you.",
      "YoPratiqo helps you learn Spanish for real travel situations, with simple phrases, pronunciation, quizzes, and country-based learning paths.",
    ],
    sections: [
      {
        heading: "The most useful situations",
        body: "At the airport, hotel, restaurant, in a taxi, at the beach, and in small shops, the same needs come back often: understanding, asking, thanking, paying, and getting help.",
      },
      {
        heading: "Survival phrases",
        body: "Hola. Gracias. Por favor. No entiendo. ¿Cuánto cuesta? ¿Dónde está...? Quiero... These simple phrases already give you a practical base.",
      },
      {
        heading: "Why learn by country?",
        body: "A word can change depending on where you go. In the Dominican Republic, for example, “guagua” can refer to a bus or minibus. YoPratiqo helps you learn local vocabulary, not only generic Spanish.",
      },
      {
        heading: "The bridge to a real teacher",
        body: "The app helps you practice on your own. But if you want to speak more comfortably before your trip, a teacher can simulate real situations with you.",
      },
    ],
    primaryCta: {
      label: "Start travel Spanish",
      href: "/yo/langues/espagnol/intro?lang=en",
    },
    teacherCta: {
      label: "Find a Spanish teacher",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Leave with the right words in mind",
    finalCtaBody:
      "Start with the YoPratiqo intro, then move on to the country path that fits your trip. When you want to practice speaking before leaving, a Pratiqo teacher can help.",
    faq: [
      {
        question: "How long does it take to learn travel Spanish?",
        answer:
          "It depends on how much time you put in. A few hours spread over two weeks is often enough to memorize the key phrases for hotel, restaurant, and transport situations.",
      },
      {
        question: "Do I need to buy the path to start?",
        answer:
          "No. The YoPratiqo intro is free. Country paths are individual purchases and are not required to practice with a Pratiqo teacher.",
      },
      {
        question: "Will my phrases work anywhere in Latin America?",
        answer:
          "The basics (Hola, Gracias, ¿Cuánto cuesta?, …) work in every Spanish-speaking country. Some local words change by destination — that is why YoPratiqo offers country-specific paths.",
      },
      {
        question: "What if I want to practice speaking before I leave?",
        answer:
          "You can reach a Spanish teacher via Pratiqo. They can simulate hotel, restaurant, and taxi dialogues before your trip.",
      },
    ],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Spanish for travel", href: "/en/spanish-for-travel" },
    ],
    courseJsonLd: {
      name: "Spanish for travel — YoPratiqo",
      description:
        "Useful Spanish phrases for travel situations (hotel, restaurant, transport, beach). Beginner level, optional country paths.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "Voir en français",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Home",
  },

  // ════════════════════════════════════════════════════════════════════════
  // 5) FR — Espagnol République dominicaine
  // ════════════════════════════════════════════════════════════════════════
  "espagnol-republique-dominicaine": {
    locale: "fr",
    slug: "espagnol-republique-dominicaine",
    path: "/fr/espagnol-republique-dominicaine",
    alternatePath: "/en/dominican-republic-spanish",
    alternateLocale: "en",
    title: "Espagnol République dominicaine | Expressions et voyage",
    description:
      "Apprends les bases de l’espagnol dominicain : phrases utiles, culture, expressions locales, quiz, flashcards et prononciation.",
    keywords: [
      "espagnol république dominicaine",
      "espagnol dominicain",
      "expressions espagnol dominicain",
      "vocabulaire république dominicaine",
      "voyage république dominicaine espagnol",
      "YoPratiqo République dominicaine",
    ],
    ogTitle: "Espagnol République dominicaine — voyage et culture | YoPratiqo",
    ogDescription:
      "Phrases utiles, expressions locales et culture dominicaine. YoPratiqo — section Voyage te prépare avant ton départ.",
    ogLocale: "fr_CA",

    heroEyebrow: "Voyage — République dominicaine",
    h1: "Espagnol République dominicaine : parle mieux avant ton voyage",
    heroParagraphs: [
      "La République dominicaine n’est pas seulement une destination soleil. C’est un pays avec son histoire, sa musique, sa nourriture, son rythme et ses expressions.",
      "Avec YoPratiqo — section Voyage, tu apprends les bases utiles pour comprendre et parler dans des situations simples : hôtel, restaurant, transport, plage, salutations et expressions dominicaines fréquentes.",
    ],
    sections: [
      {
        heading: "Pourquoi l’espagnol dominicain est différent",
        body: "Comme partout dans le monde hispanophone, la République dominicaine a ses propres usages. Certains mots, sons et expressions peuvent surprendre si tu as seulement appris l’espagnol standard.",
      },
      {
        heading: "Expressions utiles à connaître",
        body: "« ¿Qué lo qué? » peut être utilisé comme salutation familière. « Un chin » signifie un peu. « Guagua » peut désigner un autobus ou un minibus. Ces mots ne remplacent pas l’espagnol standard, mais ils t’aident à mieux comprendre la vraie vie.",
      },
      {
        heading: "Ce que tu vas pratiquer",
        body: "Tu apprendras à saluer, te présenter, demander de l’aide, commander, comprendre quelques mots locaux et reconnaître les situations courantes.",
      },
      {
        heading: "Pratiquer avec un professeur",
        body: "Tu veux aller plus loin? Un professeur d’espagnol peut t’aider à pratiquer les dialogues avant ton voyage et à corriger ta prononciation.",
      },
    ],
    primaryCta: {
      label: "Commencer le parcours République dominicaine A1",
      href: "/yo/langues/espagnol/pays/republique-dominicaine",
    },
    teacherCta: {
      label: "Trouver un professeur d’espagnol",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Sois prêt·e avant Punta Cana ou Las Terrenas",
    finalCtaBody:
      "Le parcours République dominicaine A1 te donne les bases utiles. Si tu veux pratiquer à l’oral avec quelqu’un, un professeur Pratiqo peut prendre la suite.",
    faq: [
      {
        question: "L’espagnol dominicain est-il très différent de l’espagnol standard?",
        answer:
          "La grammaire reste très proche, mais l’accent, le débit et certaines expressions changent. Le parcours République dominicaine te donne les repères pour comprendre la vraie vie sur place.",
      },
      {
        question: "Le parcours est-il adapté à un voyage tout-inclus?",
        answer:
          "Oui. Le contenu vise les situations courantes : hôtel, restaurant, plage, transport, petits commerces, et inclut quelques expressions locales que tu entendras autour de toi.",
      },
      {
        question: "Faut-il déjà parler espagnol pour suivre ce parcours?",
        answer:
          "Non. Le parcours est de niveau A1 et part de zéro. L’intro globale à l’espagnol est gratuite et reste un bon point de départ avant d’acheter le parcours pays.",
      },
      {
        question: "Et si je préfère pratiquer avec un humain?",
        answer:
          "Tu peux contacter un professeur d’espagnol via Pratiqo, en parallèle ou à la place du parcours, selon ton style d’apprentissage.",
      },
    ],
    breadcrumb: [
      { name: "Accueil", href: "/" },
      { name: "Espagnol République dominicaine", href: "/fr/espagnol-republique-dominicaine" },
    ],
    courseJsonLd: {
      name: "Espagnol République dominicaine A1 — YoPratiqo",
      description:
        "Parcours débutant centré sur l’espagnol parlé en République dominicaine : expressions locales, situations de voyage, prononciation.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "View in English",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Accueil",
  },

  // ════════════════════════════════════════════════════════════════════════
  // 6) EN — Dominican Republic Spanish
  // ════════════════════════════════════════════════════════════════════════
  "dominican-republic-spanish": {
    locale: "en",
    slug: "dominican-republic-spanish",
    path: "/en/dominican-republic-spanish",
    alternatePath: "/fr/espagnol-republique-dominicaine",
    alternateLocale: "fr",
    title: "Dominican Republic Spanish | Travel Phrases and Culture",
    description:
      "Learn the basics of Dominican Spanish: useful phrases, culture, local expressions, quizzes, flashcards, and pronunciation.",
    keywords: [
      "Dominican Republic Spanish",
      "Dominican Spanish",
      "Spanish for Punta Cana",
      "Spanish for Dominican Republic",
      "Dominican expressions Spanish",
      "YoPratiqo Dominican Republic",
    ],
    ogTitle: "Dominican Republic Spanish — travel and culture | YoPratiqo",
    ogDescription:
      "Useful phrases, local expressions, and Dominican culture. YoPratiqo’s Travel section prepares you before you go.",
    ogLocale: "en_CA",

    heroEyebrow: "Travel — Dominican Republic",
    h1: "Dominican Republic Spanish: speak better before your trip",
    heroParagraphs: [
      "The Dominican Republic is not only a sunny destination. It is a country with its own history, music, food, rhythm, and expressions.",
      "With YoPratiqo’s Travel section, you learn the useful basics for simple real-life situations: hotel, restaurant, transport, beach, greetings, and common Dominican expressions.",
    ],
    sections: [
      {
        heading: "Why Dominican Spanish is different",
        body: "Like everywhere in the Spanish-speaking world, the Dominican Republic has its own usage. Some words, sounds, and expressions may surprise you if you have only learned standard Spanish.",
      },
      {
        heading: "Useful expressions to know",
        body: "“¿Qué lo qué?” can be used as a casual greeting. “Un chin” means a little. “Guagua” can refer to a bus or minibus. These words do not replace standard Spanish, but they help you understand real life better.",
      },
      {
        heading: "What you will practice",
        body: "You will learn how to greet people, introduce yourself, ask for help, order, understand a few local words, and recognize common travel situations.",
      },
      {
        heading: "Practice with a teacher",
        body: "Want to go further? A Spanish teacher can help you practice dialogues before your trip and correct your pronunciation.",
      },
    ],
    primaryCta: {
      label: "Start the Dominican Republic A1 path",
      href: "/yo/langues/espagnol/pays/republique-dominicaine?lang=en",
    },
    teacherCta: {
      label: "Find a Spanish teacher",
      href: "/trouver-un-prof",
    },
    finalCtaHeading: "Be ready before Punta Cana or Las Terrenas",
    finalCtaBody:
      "The Dominican Republic A1 path gives you the useful basics. When you want to practice speaking with a person, a Pratiqo teacher can take over.",
    faq: [
      {
        question: "Is Dominican Spanish very different from standard Spanish?",
        answer:
          "Grammar stays close, but accent, pace, and certain expressions differ. The Dominican Republic path gives you the reference points to understand real life on site.",
      },
      {
        question: "Is the path useful for an all-inclusive trip?",
        answer:
          "Yes. Content targets common situations: hotel, restaurant, beach, transport, small shops — and includes a few local expressions you will hear around you.",
      },
      {
        question: "Do I need any Spanish to take this path?",
        answer:
          "No. The path is at A1 level and starts from scratch. The free Spanish intro is a good starting point before buying the country path.",
      },
      {
        question: "What if I prefer to practice with a person?",
        answer:
          "You can reach a Spanish teacher via Pratiqo, in parallel or instead of the path, depending on your learning style.",
      },
    ],
    breadcrumb: [
      { name: "Home", href: "/" },
      { name: "Dominican Republic Spanish", href: "/en/dominican-republic-spanish" },
    ],
    courseJsonLd: {
      name: "Dominican Republic Spanish A1 — YoPratiqo",
      description:
        "Beginner path focused on Spanish as spoken in the Dominican Republic: local expressions, travel situations, pronunciation.",
      inLanguage: "es",
      educationalLevel: "A1",
    },
    langSwitchLabel: "Voir en français",
    footerLegalSuffix: "© 2026 Cours Pratiqo Inc.",
    homeLabel: "Home",
  },
};

/** Convenience helper for a typed lookup. */
export function getYoSpanishSeoPage(slug: YoSpanishSeoSlug): YoSpanishSeoPage {
  return YO_SPANISH_SEO_PAGES[slug];
}

/** All page paths — consumed by sitemap.ts. */
export const YO_SPANISH_SEO_PATHS = Object.values(YO_SPANISH_SEO_PAGES).map((p) => p.path);

/**
 * Build the Next.js `Metadata` object for one of the six SEO pages.
 *
 * Why the `languages` map always lists both fr-CA and en-CA: each FR page
 * has exactly one EN counterpart (and vice-versa), so we can emit reciprocal
 * hreflang alternates without runtime lookups. `x-default` is set to the FR
 * version of the pair, matching the project's primary market (Quebec).
 */
export function buildYoSpanishSeoMetadata(slug: YoSpanishSeoSlug): Metadata {
  const page = YO_SPANISH_SEO_PAGES[slug];

  const frPath = page.locale === "fr" ? page.path : page.alternatePath;
  const enPath = page.locale === "en" ? page.path : page.alternatePath;

  return {
    title: page.title,
    description: page.description,
    keywords: [...page.keywords],
    alternates: {
      canonical: `${SITE_URL}${page.path}`,
      languages: {
        "fr-CA": `${SITE_URL}${frPath}`,
        "en-CA": `${SITE_URL}${enPath}`,
        "x-default": `${SITE_URL}${frPath}`,
      },
    },
    openGraph: {
      title: page.ogTitle,
      description: page.ogDescription,
      url: `${SITE_URL}${page.path}`,
      siteName: "Pratiqo",
      locale: page.ogLocale,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.ogTitle,
      description: page.ogDescription,
      images: ["/og-image.png"],
    },
  };
}
