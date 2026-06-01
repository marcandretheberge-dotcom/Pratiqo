import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";
import type { YoPratiqoModuleSlug } from "@/lib/yo/yopratiqoProductConfig";

export type YoPratiqoLandingContent = {
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  audience: YoLocalizedString;
  learnBullets: readonly YoLocalizedString[];
  whyBullets: readonly YoLocalizedString[];
  introCardTitle: YoLocalizedString;
  introCardBody: YoLocalizedString;
  teacherCardTitle: YoLocalizedString;
  teacherCardBody: YoLocalizedString;
  schemaName: string;
  schemaDescription: string;
  teaches: readonly string[];
  about: readonly string[];
};

export const yopratiqoLandingContent = {
  anglais: {
    heroTitle: lstr(
      "Anglais pratique pour parler avec plus d’aisance.",
      "Practical English for more ease when speaking.",
    ),
    heroSubtitle: lstr(
      "Une intro claire pour les francophones du Québec et les apprenants canadiens qui veulent mieux se débrouiller au travail et dans les vraies conversations.",
      "A clear intro for Quebec francophones and Canadian learners who want more confidence at work and in real conversations.",
    ),
    audience: lstr(
      "Pour les faux débutants qui comprennent déjà un peu l’anglais, mais bloquent quand vient le temps de parler.",
      "For false beginners who understand some English already, but freeze when it is time to speak.",
    ),
    learnBullets: [
      lstr("reprendre confiance avec des phrases simples", "regain confidence with simple phrases"),
      lstr("repérer les faux amis utiles", "spot useful false friends"),
      lstr("comprendre quelques nuances d’anglais canadien", "understand a few Canadian English nuances"),
      lstr("préparer une pratique orale avec un professeur", "prepare for speaking practice with a teacher"),
    ],
    whyBullets: [
      lstr("un parcours autonome avant la pratique réelle", "a self-paced path before real practice"),
      lstr("des situations concrètes au lieu de listes abstraites", "concrete situations instead of abstract lists"),
      lstr("un pont clair vers un professeur Pratiqo", "a clear bridge to a Pratiqo teacher"),
    ],
    introCardTitle: lstr("Commencer l’intro gratuite", "Start the free intro"),
    introCardBody: lstr(
      "Travaille les premiers repères, des phrases utiles et une façon plus calme d’entrer dans une conversation.",
      "Work on first landmarks, useful phrases, and a calmer way to enter a conversation.",
    ),
    teacherCardTitle: lstr("Pratiquer avec un professeur d’anglais", "Practice with an English teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo English Intro",
    schemaDescription: "A free self-paced English intro connected to teacher practice.",
    teaches: ["English first phrases", "Canadian English context", "speaking confidence"],
    about: ["English learning", "self-paced language preparation"],
  },
  "francais-quebec": {
    heroTitle: lstr(
      "Français québécois et repères de francisation.",
      "Quebec French and francization landmarks.",
    ),
    heroSubtitle: lstr(
      "Comprends les mots du quotidien, la culture locale, le français du travail et les bases utiles avant de pratiquer avec un professeur.",
      "Understand daily words, local culture, workplace French, and useful basics before practicing with a teacher.",
    ),
    audience: lstr(
      "Pour les nouveaux arrivants, étudiants et travailleurs qui veulent comprendre le français tel qu’il se parle au Québec.",
      "For newcomers, students, and workers who want to understand French as it is used in Quebec.",
    ),
    learnBullets: [
      lstr("situer le français québécois dans la vie quotidienne", "place Quebec French in daily life"),
      lstr("reconnaître des mots de travail et de services", "recognize workplace and service words"),
      lstr("comprendre des repères culturels locaux", "understand local cultural landmarks"),
      lstr("préparer des questions pour un professeur", "prepare questions for a teacher"),
    ],
    whyBullets: [
      lstr("une intro culturelle, pas un raccourci administratif", "a cultural intro, not an administrative shortcut"),
      lstr("des exemples pour vivre, étudier ou travailler au Canada", "examples for living, studying, or working in Canada"),
      lstr("un pont vers un vrai professeur de français", "a bridge to a real French teacher"),
    ],
    introCardTitle: lstr("Découvrir l’intro gratuite", "Open the free intro"),
    introCardBody: lstr(
      "Explore les mots essentiels, la culture locale et des repères de francisation utiles pour mieux te situer.",
      "Explore essential words, local culture, and francization landmarks that help you find your footing.",
    ),
    teacherCardTitle: lstr("Trouver un professeur de français", "Find a French teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Quebec French Intro",
    schemaDescription: "A free self-paced Quebec French intro connected to teacher practice.",
    teaches: ["Quebec French basics", "francization landmarks", "local culture"],
    about: ["Quebec French", "francization preparation"],
  },
  espagnol: {
    heroTitle: lstr(
      "Espagnol pour voyager, comprendre et oser parler.",
      "Spanish for travel, culture, and first real conversations.",
    ),
    heroSubtitle: lstr(
      "Commence par les mots utiles, les sons, les gestes culturels et les situations qui reviennent vraiment quand on voyage.",
      "Start with useful words, sounds, cultural cues, and situations that actually come up while travelling.",
    ),
    audience: lstr(
      "Pour les voyageurs et débutants qui veulent comprendre plus qu’une liste de mots avant leur première conversation.",
      "For travellers and beginners who want more than a word list before their first conversation.",
    ),
    learnBullets: [
      lstr("saluer et te présenter simplement", "greet people and introduce yourself simply"),
      lstr("utiliser des phrases de voyage utiles", "use useful travel phrases"),
      lstr("comprendre la culture derrière la langue", "understand the culture behind the language"),
      lstr("préparer une première conversation guidée", "prepare for a first guided conversation"),
    ],
    whyBullets: [
      lstr("la langue dans son contexte culturel", "language inside its cultural context"),
      lstr("des modules par pays quand ils sont prêts", "country modules when they are ready"),
      lstr("un passage naturel vers la pratique avec professeur", "a natural path toward teacher practice"),
    ],
    introCardTitle: lstr("Commencer l’intro espagnol", "Start the Spanish intro"),
    introCardBody: lstr(
      "Apprends les premiers mots, les sons, les nuances régionales et les phrases qui ouvrent une conversation.",
      "Learn first words, sounds, regional nuance, and phrases that open a conversation.",
    ),
    teacherCardTitle: lstr("Trouver un professeur d’espagnol", "Find a Spanish teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Spanish Intro",
    schemaDescription: "A free self-paced Spanish intro connected to teacher practice.",
    teaches: ["Spanish first words", "travel phrases", "cultural context"],
    about: ["Spanish learning", "travel Spanish"],
  },
  japonais: {
    heroTitle: lstr(
      "Japonais sans panique : écritures, politesse et culture.",
      "Japanese without panic: scripts, politeness, and culture.",
    ),
    heroSubtitle: lstr(
      "Une intro rassurante pour découvrir hiragana, katakana, kanji, les salutations et les codes culturels qui changent tout.",
      "A reassuring intro to hiragana, katakana, kanji, greetings, and the cultural codes that change everything.",
    ),
    audience: lstr(
      "Pour les débutants curieux qui veulent entrer dans le japonais avec des repères solides avant de mémoriser.",
      "For curious beginners who want solid landmarks before memorizing Japanese.",
    ),
    learnBullets: [
      lstr("distinguer hiragana, katakana et kanji", "tell hiragana, katakana, and kanji apart"),
      lstr("utiliser des salutations polies", "use polite greetings"),
      lstr("comprendre les premiers codes culturels", "understand first cultural codes"),
      lstr("choisir quoi pratiquer avec un professeur", "choose what to practice with a teacher"),
    ],
    whyBullets: [
      lstr("une progression calme pour une langue complexe", "a calm progression for a complex language"),
      lstr("des repères culturels avant la mémorisation", "cultural landmarks before memorization"),
      lstr("un pont vers une pratique orale guidée", "a bridge to guided speaking practice"),
    ],
    introCardTitle: lstr("Entrer dans l’intro japonais", "Enter the Japanese intro"),
    introCardBody: lstr(
      "Découvre les systèmes d’écriture, les salutations, la politesse et les premières phrases utiles.",
      "Discover writing systems, greetings, politeness, and first useful phrases.",
    ),
    teacherCardTitle: lstr("Trouver un professeur de japonais", "Find a Japanese teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Japanese Intro",
    schemaDescription: "A free self-paced Japanese intro connected to teacher practice.",
    teaches: ["Japanese first words", "writing systems", "politeness"],
    about: ["Japanese learning", "Japanese culture"],
  },
  italien: {
    heroTitle: lstr(
      "Italien pour voyager, comprendre les régions et parler avec aisance.",
      "Italian for travel, regions, and confident first phrases.",
    ),
    heroSubtitle: lstr(
      "Découvre les premiers mots, la culture, les régions, les gestes utiles et les phrases qui rendent un échange plus naturel.",
      "Discover first words, culture, regions, useful cues, and phrases that make an exchange feel more natural.",
    ),
    audience: lstr(
      "Pour les voyageurs et débutants qui veulent une base culturelle avant de pratiquer l’oral.",
      "For travellers and beginners who want cultural grounding before speaking practice.",
    ),
    learnBullets: [
      lstr("saluer et commander simplement", "greet people and order simply"),
      lstr("comprendre quelques repères culturels italiens", "understand a few Italian cultural landmarks"),
      lstr("situer les régions et les accents avec nuance", "situate regions and accents with nuance"),
      lstr("préparer une pratique orale guidée", "prepare for guided speaking practice"),
    ],
    whyBullets: [
      lstr("une approche voyage et culture", "a travel-and-culture approach"),
      lstr("des phrases utiles avant la grammaire lourde", "useful phrases before heavy grammar"),
      lstr("un pont vers un vrai professeur d’italien", "a bridge to a real Italian teacher"),
    ],
    introCardTitle: lstr("Commencer l’intro italien", "Start the Italian intro"),
    introCardBody: lstr(
      "Travaille les premiers mots, les situations de voyage et les repères culturels qui donnent du contexte.",
      "Work on first words, travel situations, and cultural landmarks that give context.",
    ),
    teacherCardTitle: lstr("Trouver un professeur d’italien", "Find an Italian teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Italian Intro",
    schemaDescription: "A free self-paced Italian intro connected to teacher practice.",
    teaches: ["Italian first phrases", "travel Italian", "cultural context"],
    about: ["Italian learning", "Italian culture"],
  },
} as const satisfies Record<YoPratiqoModuleSlug, YoPratiqoLandingContent>;

/**
 * YoPratiqo top-level product families (canonical IA).
 *
 * The YoPratiqo home page renders these three disciplines as the
 * top-level taxonomy. Francisation is intentionally NOT a fourth
 * top-level discipline — it lives UNDER Langues → Français québécois /
 * Francisation and is surfaced as a featured-program shortcut, not as
 * a peer family.
 *
 * Rules:
 *   - Order is meaningful (Langues first; live first, planned after).
 *   - "available" families MUST have an `href` to a real route.
 *   - "planned" families MUST have `href: null` (no fake routes).
 *   - Adding a fourth family requires explicit IA review.
 *
 * The `id` keys mirror the YoProductLine taxonomy used internally
 * (`voyage` is intentionally absent here — that historical token is
 * an internal config key for legacy data, not a top-level family).
 *
 * Tests in `tests/yo/yopratiqoInformationArchitecture.test.ts` import
 * this constant to assert the IA stays exactly three families.
 */
export type YoProductFamilyId = "langues" | "musique" | "soutien-scolaire";

export type YoProductFamilyStatus = "available" | "planned";

export interface YoProductFamily {
  readonly id: YoProductFamilyId;
  readonly status: YoProductFamilyStatus;
  readonly title: YoLocalizedString;
  readonly href: string | null;
}

export const YO_PRODUCT_FAMILIES: readonly YoProductFamily[] = [
  {
    id: "langues",
    status: "available",
    title: lstr("Langues", "Languages"),
    href: "/yo/langues",
  },
  {
    id: "musique",
    status: "planned",
    title: lstr("Musique", "Music"),
    href: null,
  },
  {
    id: "soutien-scolaire",
    status: "planned",
    title: lstr("Soutien scolaire", "Academic support"),
    href: null,
  },
] as const;
