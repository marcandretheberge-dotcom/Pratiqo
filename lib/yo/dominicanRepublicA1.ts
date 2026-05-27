/**
 * Yo Pratiqo Voyage — Espagnol République dominicaine A1
 *
 * Hardcoded MVP content for Phase 1. Shaped exactly like the future Supabase
 * rows in yo_modules / yo_lessons / yo_quiz_questions / yo_flashcards so the
 * same `YoIntroPageData` object can later be returned by a server route
 * powered by the database. No Supabase imports here on purpose.
 *
 * Locked product decisions baked into this file:
 *   - price_cents = 2499  ($24.99 CAD)
 *   - currency    = "CAD"
 *   - cefr_level  = "A1"  (kid/family-friendly content only)
 *   - product_line = "voyage"
 *
 * A1 content rule: NO slang/vulgar/ambiguous expressions. B1+ may later add
 * "à reconnaître mais ne pas utiliser" content, but the data exported here
 * must stay travel-, food-, and politeness-focused.
 */

import type {
  YoFlashcard,
  YoFeature,
  YoIntroPageData,
  YoLesson,
  YoLessonCard,
  YoLessonPathStep,
  YoModule,
  YoQuizQuestion,
} from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────────
// Intro lesson — cards
// ─────────────────────────────────────────────────────────────────────────

const introCards: YoLessonCard[] = [
  {
    id: "intro_card_geography",
    kind: "text",
    title: "Où on s’en va ?",
    description:
      "Découvre la République dominicaine : ses régions, ses villes et ses trésors.",
    ctaLabel: "Explorer la carte",
    ctaHref: "#geography",
    iconHint: "map",
  },
  {
    id: "intro_card_history",
    kind: "text",
    title: "Petite histoire en 3 minutes",
    description: "Un peu d’histoire, de culture et de fierté dominicaine.",
    ctaLabel: "Écouter",
    ctaHref: "#history",
    iconHint: "book",
  },
  {
    id: "intro_card_food",
    kind: "text",
    title: "Bouffer comme un local",
    description: "Saveurs, plats typiques et expressions de la table.",
    ctaLabel: "Voir et apprendre",
    ctaHref: "#food",
    iconHint: "utensils",
  },
  {
    id: "intro_card_first_phrases",
    kind: "phrases",
    title: "Tes premières phrases utiles",
    iconHint: "message-circle",
    phrases: [
      { target: "Buenos días", translation: "Bonjour" },
      { target: "Buenas tardes", translation: "Bon après-midi" },
      { target: "Buenas noches", translation: "Bonsoir / Bonne nuit" },
      { target: "Mucho gusto", translation: "Ravi de vous rencontrer" },
      { target: "Hasta luego", translation: "À plus tard" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Lessons (only the Intro is "free_preview"; the rest are locked teasers)
// ─────────────────────────────────────────────────────────────────────────

const lessons: YoLesson[] = [
  {
    id: "voyage_es_do_intro",
    position: 1,
    title: "Intro",
    subtitle:
      "Géographie, culture, premières phrases et expressions du quotidien.",
    status: "free_preview",
    estimatedMinutes: 12,
    cards: introCards,
  },
  {
    id: "voyage_es_do_arrival",
    position: 2,
    title: "Arrivée et hôtel",
    subtitle: "Passer la douane, prendre un taxi, parler à la réception.",
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_food",
    position: 3,
    title: "Manger et commander",
    subtitle: "Lire un menu, commander, payer, demander l’addition.",
    status: "locked",
    estimatedMinutes: 20,
    cards: [],
  },
  {
    id: "voyage_es_do_navigation",
    position: 4,
    title: "Bouger et demander de l’aide",
    subtitle: "Demander son chemin, prendre le bus, gérer un imprévu.",
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_conversation",
    position: 5,
    title: "Conversations naturelles",
    subtitle: "Petits échanges du quotidien, politesse et accent dominicain.",
    status: "locked",
    estimatedMinutes: 22,
    cards: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Lesson path (compact view used on the page above the Intro cards)
// ─────────────────────────────────────────────────────────────────────────

const lessonPath: YoLessonPathStep[] = lessons.map((lesson) => ({
  id: lesson.id,
  position: lesson.position,
  title: lesson.title,
  ctaLabel: lesson.status === "free_preview" ? "Commencer" : "Verrouillé",
  status: lesson.status,
}));

// ─────────────────────────────────────────────────────────────────────────
// Flashcard sample for the preview component.
// A1 = friendly Dominican expressions only (no vulgar / no slang ambiguity).
// ─────────────────────────────────────────────────────────────────────────

const flashcardSample: YoFlashcard = {
  id: "voyage_es_do_flash_que_lo_que",
  front: "¿Qué lo qué?",
  back: "Quoi de neuf ?",
  hint:
    "Salutation typique en République dominicaine, entre amis ou en famille.",
  tag: "salutations",
};

// ─────────────────────────────────────────────────────────────────────────
// Quiz sample for the preview component.
// ─────────────────────────────────────────────────────────────────────────

const quizSample: YoQuizQuestion = {
  id: "voyage_es_do_quiz_capital",
  prompt: "La capitale de la République dominicaine s’appelle…",
  options: [
    { id: "a", label: "Santiago" },
    { id: "b", label: "Punta Cana" },
    { id: "c", label: "Saint-Domingue" },
  ],
  correctOptionId: "c",
  explanation:
    "La capitale est Saint-Domingue (Santo Domingo). Santiago est la 2e ville et Punta Cana est une zone touristique de l’Est.",
};

// ─────────────────────────────────────────────────────────────────────────
// Marketing features
// ─────────────────────────────────────────────────────────────────────────

const unlockFeatures: YoFeature[] = [
  { id: "unlock_modules", label: "5 modules complets", icon: "layers" },
  { id: "unlock_missions", label: "Missions réelles", icon: "compass" },
  {
    id: "unlock_quiz_audio",
    label: "Quiz + Flashcards + Audio",
    icon: "headphones",
  },
  {
    id: "unlock_expressions",
    label: "Expressions locales dominicaines",
    icon: "sparkles",
  },
  {
    id: "unlock_smart_review",
    label: "Révision intelligente",
    icon: "shield-check",
  },
  { id: "unlock_lifetime", label: "Accès à vie", icon: "infinity" },
];

const bottomFeatures: YoFeature[] = [
  { id: "feat_native_audio", label: "Audio par des natifs", icon: "headphones" },
  {
    id: "feat_smart_flashcards",
    label: "Flashcards intelligentes",
    icon: "layers",
  },
  { id: "feat_daily_missions", label: "Missions du quotidien", icon: "compass" },
  {
    id: "feat_real_teachers",
    label: "Professeurs réels sur Pratiqo",
    icon: "graduation-cap",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Module
// ─────────────────────────────────────────────────────────────────────────

const module_: YoModule = {
  id: "voyage_es_do",
  productLine: "voyage",
  targetLanguage: "es",
  destinationCountry: "DO",
  destinationLabelFr: "République dominicaine",
  cefrLevel: "A1",
  priceCents: 2499,
  currency: "CAD",
  freeLessonsCount: 1,
  productLabel: "Yo Pratiqo Voyage",
  heroTitle: "Espagnol pratique — République dominicaine",
  heroSubtitle:
    "Apprends à vraiment parler sur place, avec culture, expressions locales et missions réelles.",
  lessons,
};

// ─────────────────────────────────────────────────────────────────────────
// Public export consumed by the page
// ─────────────────────────────────────────────────────────────────────────

export const dominicanRepublicA1: YoIntroPageData = {
  module: module_,
  lessonPath,
  flashcardSample,
  quizSample,
  unlockFeatures,
  bottomFeatures,
};

/**
 * Formatted price string used directly in UI. Hardcoded to the locked
 * MVP price decision: $24,99 CAD (Quebec French formatting — comma decimal).
 */
export const dominicanRepublicA1PriceLabel = "$24,99 CAD";
