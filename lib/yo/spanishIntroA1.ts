/**
 * Yo Pratiqo — Espagnol · Intro globale A1
 *
 * Hardcoded content for `/yo/langues/espagnol/intro`. Designed to sit
 * above the country modules in the new YoPratiqo information
 * architecture: a friendly, university-inspired tour of Spanish as a
 * world language before the learner picks a destination.
 *
 * Bilingual contract (same as the RD data file):
 *   - every learner-language string carries both FR and EN via
 *     `lstr(fr, en)`
 *   - Spanish target phrases are plain strings so they keep `lang="es"`
 *
 * A1 safety rule: kid/family-friendly only. No vulgar slang, no graphic
 * history, no political sloganeering. Numbers ("around 500 million
 * speakers") are intentionally rounded for an A1 audience.
 *
 * No Supabase, no Stripe, no payment math, no migrations. This file is
 * the single source of truth consumed by the intro page.
 */

import { lstr } from "@/lib/yo/localize";
import type {
  YoFlashcard,
  YoLocalizedString,
  YoQuizQuestion,
} from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────
// 1) Spanish in the world
// ─────────────────────────────────────────────────────────────────────

export interface SpanishStat {
  id: string;
  value: YoLocalizedString;
  label: YoLocalizedString;
}

const worldStats: SpanishStat[] = [
  {
    id: "stat_speakers",
    value: lstr("~500 M", "~500 M"),
    label: lstr("personnes parlent espagnol", "people speak Spanish"),
  },
  {
    id: "stat_countries",
    value: lstr("20+", "20+"),
    label: lstr(
      "pays où l’espagnol est officiel",
      "countries where Spanish is official",
    ),
  },
  {
    id: "stat_rank",
    value: lstr("2e / 3e", "2nd / 3rd"),
    label: lstr(
      "langue la plus parlée au monde",
      "most-spoken language in the world",
    ),
  },
  {
    id: "stat_continents",
    value: lstr("4", "4"),
    label: lstr(
      "continents qui parlent espagnol",
      "continents that speak Spanish",
    ),
  },
];

const worldIntro: YoLocalizedString = lstr(
  "L’espagnol n’est pas une seule voix : c’est une famille de voix qui s’étend de l’Europe à l’Afrique, en passant par tout un continent américain. Apprendre l’espagnol, c’est ouvrir une porte vers un demi-milliard de personnes.",
  "Spanish is not one voice — it is a family of voices stretching from Europe to Africa to a whole American continent. Learning Spanish opens a door to half a billion people.",
);

// ─────────────────────────────────────────────────────────────────────
// 2) Origin of the language
// ─────────────────────────────────────────────────────────────────────

export interface SpanishOriginStep {
  id: string;
  era: YoLocalizedString;
  description: YoLocalizedString;
}

const originTimeline: SpanishOriginStep[] = [
  {
    id: "origin_latin",
    era: lstr("Antiquité", "Antiquity"),
    description: lstr(
      "Les soldats et marchands romains apportent le latin populaire dans la péninsule ibérique.",
      "Roman soldiers and merchants bring everyday Latin to the Iberian Peninsula.",
    ),
  },
  {
    id: "origin_castilian",
    era: lstr("Moyen Âge", "Middle Ages"),
    description: lstr(
      "Le latin se transforme lentement en castillan, une langue née dans le nord de l’Espagne, autour de la Castille.",
      "Latin slowly turns into Castilian, a language born in northern Spain, around the kingdom of Castile.",
    ),
  },
  {
    id: "origin_court",
    era: lstr("XIIIe siècle", "13th century"),
    description: lstr(
      "Le roi Alphonse X « le Sage » fait écrire l’histoire, le droit et la science en castillan. La langue devient officielle.",
      "King Alfonso X “the Wise” has history, law, and science written in Castilian. The language becomes official.",
    ),
  },
  {
    id: "origin_americas",
    era: lstr("XVe–XVIe siècles", "15th–16th centuries"),
    description: lstr(
      "L’espagnol traverse l’Atlantique avec les voyages européens et rencontre des dizaines de langues autochtones, ce qui enrichira son vocabulaire pour toujours.",
      "Spanish crosses the Atlantic with European voyages and meets dozens of Indigenous languages, which will enrich its vocabulary forever.",
    ),
  },
  {
    id: "origin_today",
    era: lstr("Aujourd’hui", "Today"),
    description: lstr(
      "L’espagnol moderne reste une langue romane, proche du français et de l’italien, mais avec sa propre musique sur chaque continent.",
      "Modern Spanish is still a Romance language, close to French and Italian, but with its own music on every continent.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 3) Spanish-speaking countries
// ─────────────────────────────────────────────────────────────────────

export interface SpanishRegion {
  id: string;
  region: YoLocalizedString;
  countries: YoLocalizedString;
  note: YoLocalizedString;
}

const regions: SpanishRegion[] = [
  {
    id: "region_europe",
    region: lstr("Europe", "Europe"),
    countries: lstr("Espagne", "Spain"),
    note: lstr(
      "Le pays d’origine. On y parle aussi le catalan, le galicien et le basque selon la région.",
      "The country of origin. Catalan, Galician, and Basque are also spoken depending on the region.",
    ),
  },
  {
    id: "region_north_america",
    region: lstr("Amérique du Nord", "North America"),
    countries: lstr("Mexique", "Mexico"),
    note: lstr(
      "Le plus grand pays hispanophone par sa population, avec des accents très variés du nord au sud.",
      "The largest Spanish-speaking country by population, with accents that vary widely from north to south.",
    ),
  },
  {
    id: "region_central_america",
    region: lstr("Amérique centrale", "Central America"),
    countries: lstr(
      "Guatemala, Honduras, Salvador, Nicaragua, Costa Rica, Panama",
      "Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panama",
    ),
    note: lstr(
      "Petits pays, parlers chaleureux, fortes traditions culturelles.",
      "Small countries, warm dialects, strong cultural traditions.",
    ),
  },
  {
    id: "region_caribbean",
    region: lstr("Caraïbes", "Caribbean"),
    countries: lstr(
      "Cuba, République dominicaine, Porto Rico",
      "Cuba, Dominican Republic, Puerto Rico",
    ),
    note: lstr(
      "Rythme rapide, voyelles musicales et beaucoup d’expressions locales — c’est la zone de Yo Pratiqo Voyage.",
      "Fast rhythm, musical vowels, and many local expressions — this is Yo Pratiqo Voyage's home zone.",
    ),
  },
  {
    id: "region_south_america",
    region: lstr("Amérique du Sud", "South America"),
    countries: lstr(
      "Colombie, Venezuela, Équateur, Pérou, Bolivie, Chili, Argentine, Uruguay, Paraguay",
      "Colombia, Venezuela, Ecuador, Peru, Bolivia, Chile, Argentina, Uruguay, Paraguay",
    ),
    note: lstr(
      "Le Brésil n’est pas hispanophone : on y parle portugais. À garder en tête sur une carte.",
      "Brazil is not Spanish-speaking — Portuguese is the language there. Worth keeping in mind on a map.",
    ),
  },
  {
    id: "region_africa",
    region: lstr("Afrique", "Africa"),
    countries: lstr("Guinée équatoriale", "Equatorial Guinea"),
    note: lstr(
      "L’espagnol y est une langue officielle, héritée d’une histoire coloniale plus tardive.",
      "Spanish is an official language there, inherited from a later colonial history.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4) Why Spanish changes by country
// ─────────────────────────────────────────────────────────────────────

export interface SpanishVariation {
  id: string;
  title: YoLocalizedString;
  body: YoLocalizedString;
  /** Plain Spanish — rendered with `lang="es"`. */
  example?: string;
}

const variations: SpanishVariation[] = [
  {
    id: "variation_tu_vos_usted",
    title: lstr("Tú, vos, usted", "Tú, vos, usted"),
    body: lstr(
      "Certains pays disent « tú », d’autres « vos », d’autres encore préfèrent « usted » par politesse. Tous veulent dire « toi ».",
      "Some countries say “tú,” others say “vos,” and others prefer “usted” to be polite. All of them mean “you.”",
    ),
    example: "¿Cómo estás? · ¿Cómo está?",
  },
  {
    id: "variation_accent",
    title: lstr("L’accent change", "The accent changes"),
    body: lstr(
      "L’espagnol des Caraïbes sonne rapide et chantant. Celui d’Espagne marque davantage le « s » et le « th ». Celui des Andes est plus lent et clair.",
      "Caribbean Spanish sounds fast and musical. Spanish from Spain emphasizes the “s” and the “th.” Andean Spanish is slower and clearer.",
    ),
  },
  {
    id: "variation_vocab",
    title: lstr("Le vocabulaire varie", "Vocabulary varies"),
    body: lstr(
      "Un mot courant dans un pays peut être inconnu dans un autre. Exemple : « guagua » veut dire « autobus » en République dominicaine et à Cuba, mais « bébé » au Chili.",
      "A common word in one country can be unknown in another. For example, “guagua” means “bus” in the Dominican Republic and Cuba, but “baby” in Chile.",
    ),
    example: "la guagua",
  },
  {
    id: "variation_register",
    title: lstr("La politesse aussi", "Politeness too"),
    body: lstr(
      "Dans certains pays, on tutoie facilement. Dans d’autres, on garde le « usted » longtemps. Un professeur Pratiqo peut t’expliquer ce qui se fait sur place.",
      "In some countries, people switch to first names quickly. In others, “usted” stays the norm for a long time. A Pratiqo teacher can explain what's done where you're going.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 5) Universal first words (pan-Hispanic, A1-safe)
// ─────────────────────────────────────────────────────────────────────

export interface SpanishUniversalWord {
  /** Plain Spanish — rendered with `lang="es"`. */
  target: string;
  translation: YoLocalizedString;
  hint?: YoLocalizedString;
}

const universalWords: SpanishUniversalWord[] = [
  {
    target: "Hola",
    translation: lstr("Bonjour / Salut", "Hello / Hi"),
    hint: lstr(
      "Le mot le plus universel. Marche partout, du Mexique à l’Espagne.",
      "The most universal word. Works everywhere, from Mexico to Spain.",
    ),
  },
  {
    target: "Gracias",
    translation: lstr("Merci", "Thank you"),
  },
  {
    target: "Por favor",
    translation: lstr("S’il vous plaît", "Please"),
  },
  {
    target: "Sí / No",
    translation: lstr("Oui / Non", "Yes / No"),
  },
  {
    target: "Buenos días",
    translation: lstr("Bonjour le matin", "Good morning"),
  },
  {
    target: "Buenas tardes",
    translation: lstr("Bon après-midi", "Good afternoon"),
  },
  {
    target: "¿Cómo estás?",
    translation: lstr("Comment vas-tu ?", "How are you?"),
    hint: lstr(
      "Phrase universelle pour saluer.",
      "Universal greeting phrase.",
    ),
  },
  {
    target: "Me llamo…",
    translation: lstr("Je m’appelle…", "My name is…"),
  },
  {
    target: "Mucho gusto",
    translation: lstr("Enchanté", "Nice to meet you"),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 6) Quiz (5 questions, A1-friendly, pan-Hispanic)
// ─────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "spanish_quiz_countries",
    prompt: lstr(
      "Combien de pays ont l’espagnol comme langue officielle ?",
      "How many countries have Spanish as an official language?",
    ),
    options: [
      { id: "a", label: lstr("Environ 20", "About 20") },
      { id: "b", label: lstr("Seulement 3", "Only 3") },
      { id: "c", label: lstr("Plus de 80", "More than 80") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "Environ 20 pays utilisent l’espagnol comme langue officielle. Cela inclut l’Espagne, presque toute l’Amérique latine et la Guinée équatoriale.",
      "Around 20 countries use Spanish as an official language. That includes Spain, nearly all of Latin America, and Equatorial Guinea.",
    ),
  },
  {
    id: "spanish_quiz_brazil",
    prompt: lstr(
      "Au Brésil, quelle est la langue officielle ?",
      "What is the official language of Brazil?",
    ),
    options: [
      { id: "a", label: lstr("Le portugais", "Portuguese") },
      { id: "b", label: lstr("L’espagnol", "Spanish") },
      { id: "c", label: lstr("Le français", "French") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "Le Brésil est entouré de pays hispanophones, mais sa langue officielle est le portugais. Astuce de carte utile à connaître.",
      "Brazil is surrounded by Spanish-speaking countries, but its official language is Portuguese. A useful map tip to know.",
    ),
  },
  {
    id: "spanish_quiz_origin",
    prompt: lstr(
      "L’espagnol vient surtout de quelle langue ancienne ?",
      "Spanish mostly comes from which ancient language?",
    ),
    options: [
      { id: "a", label: lstr("Le latin", "Latin") },
      { id: "b", label: lstr("Le grec ancien", "Ancient Greek") },
      { id: "c", label: lstr("L’arabe", "Arabic") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "L’espagnol descend du latin parlé par les Romains dans la péninsule ibérique. L’arabe a laissé du vocabulaire, mais la structure de la langue reste romane.",
      "Spanish descends from the Latin spoken by Romans on the Iberian Peninsula. Arabic left vocabulary behind, but the structure of the language is still Romance.",
    ),
  },
  {
    id: "spanish_quiz_greeting",
    prompt: lstr(
      "Quelle est la salutation la plus universelle en espagnol ?",
      "Which is the most universal Spanish greeting?",
    ),
    options: [
      { id: "a", label: lstr("Hola", "Hola") },
      { id: "b", label: lstr("¡Tato!", "¡Tato!") },
      { id: "c", label: lstr("Buenas guaguas", "Buenas guaguas") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Hola » fonctionne dans tous les pays hispanophones. « ¡Tato! » est une expression dominicaine locale, et « buenas guaguas » n’existe pas.",
      "“Hola” works in every Spanish-speaking country. “¡Tato!” is a local Dominican expression, and “buenas guaguas” isn't a real phrase.",
    ),
  },
  {
    id: "spanish_quiz_variation",
    prompt: lstr(
      "Pourquoi l’espagnol change-t-il selon le pays ?",
      "Why does Spanish change from one country to another?",
    ),
    options: [
      {
        id: "a",
        label: lstr(
          "Chaque pays a son accent, son vocabulaire et son histoire propre",
          "Each country has its own accent, vocabulary, and history",
        ),
      },
      {
        id: "b",
        label: lstr(
          "Parce que ce n’est pas vraiment la même langue",
          "Because it isn't really the same language",
        ),
      },
      {
        id: "c",
        label: lstr(
          "Parce que personne ne se comprend",
          "Because no one understands each other",
        ),
      },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "C’est bien la même langue partout — les hispanophones se comprennent sans problème. Mais chaque pays apporte son rythme, ses mots et ses expressions.",
      "It is the same language everywhere — Spanish speakers understand each other fine. But each country brings its own rhythm, words, and expressions.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 7) Flashcards (universal first words, pan-Hispanic)
// ─────────────────────────────────────────────────────────────────────

const flashcards: YoFlashcard[] = [
  {
    id: "spanish_flash_hola",
    front: "Hola",
    back: lstr("Bonjour / Salut", "Hello / Hi"),
    hint: lstr(
      "Marche dans tous les pays hispanophones.",
      "Works in every Spanish-speaking country.",
    ),
    tag: lstr("salutations", "greetings"),
  },
  {
    id: "spanish_flash_gracias",
    front: "Gracias",
    back: lstr("Merci", "Thank you"),
    tag: lstr("politesse", "politeness"),
  },
  {
    id: "spanish_flash_por_favor",
    front: "Por favor",
    back: lstr("S’il vous plaît", "Please"),
    tag: lstr("politesse", "politeness"),
  },
  {
    id: "spanish_flash_si_no",
    front: "Sí / No",
    back: lstr("Oui / Non", "Yes / No"),
    tag: lstr("essentiels", "essentials"),
  },
  {
    id: "spanish_flash_buenos_dias",
    front: "Buenos días",
    back: lstr("Bonjour le matin", "Good morning"),
    tag: lstr("salutations", "greetings"),
  },
  {
    id: "spanish_flash_buenas_tardes",
    front: "Buenas tardes",
    back: lstr("Bon après-midi", "Good afternoon"),
    tag: lstr("salutations", "greetings"),
  },
  {
    id: "spanish_flash_como_estas",
    front: "¿Cómo estás?",
    back: lstr("Comment vas-tu ?", "How are you?"),
    tag: lstr("conversation", "conversation"),
  },
  {
    id: "spanish_flash_me_llamo",
    front: "Me llamo…",
    back: lstr("Je m’appelle…", "My name is…"),
    tag: lstr("présentation", "introductions"),
  },
  {
    id: "spanish_flash_mucho_gusto",
    front: "Mucho gusto",
    back: lstr("Enchanté", "Nice to meet you"),
    tag: lstr("présentation", "introductions"),
  },
  {
    id: "spanish_flash_adios",
    front: "Adiós",
    back: lstr("Au revoir", "Goodbye"),
    tag: lstr("au revoir", "goodbyes"),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 8) Destinations (cards on the "Choose your destination" section)
// ─────────────────────────────────────────────────────────────────────

export interface SpanishDestination {
  id: string;
  name: YoLocalizedString;
  flavor: YoLocalizedString;
  status: "available" | "coming_soon";
  href?: string;
}

const destinations: SpanishDestination[] = [
  {
    id: "destination_do",
    name: lstr("République dominicaine", "Dominican Republic"),
    flavor: lstr(
      "A1 voyage · culture · expressions locales · $24,99 CAD",
      "A1 travel · culture · local expressions · $24.99 CAD",
    ),
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine",
  },
  {
    id: "destination_mx",
    name: lstr("Mexique", "Mexico"),
    flavor: lstr("À venir", "Coming soon"),
    status: "coming_soon",
  },
  {
    id: "destination_uy",
    name: lstr("Uruguay", "Uruguay"),
    flavor: lstr("À venir", "Coming soon"),
    status: "coming_soon",
  },
  {
    id: "destination_es",
    name: lstr("Espagne", "Spain"),
    flavor: lstr("À venir", "Coming soon"),
    status: "coming_soon",
  },
  {
    id: "destination_co",
    name: lstr("Colombie", "Colombia"),
    flavor: lstr("À venir", "Coming soon"),
    status: "coming_soon",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Public export consumed by the intro page
// ─────────────────────────────────────────────────────────────────────

export const spanishIntroA1 = {
  worldIntro,
  worldStats,
  originTimeline,
  regions,
  variations,
  universalWords,
  quizQuestions,
  flashcards,
  destinations,
};

export type SpanishIntroA1Data = typeof spanishIntroA1;
