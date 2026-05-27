/**
 * Yo Pratiqo — shared TypeScript types.
 *
 * These types describe the data shape for the Yo Pratiqo Voyage MVP UI
 * (Phase 1). They are intentionally close to the future Supabase model so
 * the same component props can later be powered by real database rows
 * (yo_modules, yo_lessons, yo_quiz_questions, yo_flashcards, …) without
 * having to redesign the component API.
 *
 * No runtime values, no Supabase imports. Pure types only.
 */

// ─────────────────────────────────────────────────────────────────────────
// Enums (string unions kept narrow so the data file is self-validating)
// ─────────────────────────────────────────────────────────────────────────

export type YoProductLine = "voyage" | "musique" | "academique";

/** ISO 639-1 language code of the language being taught. */
export type YoTargetLanguage = "es" | "en" | "fr" | "pt";

/**
 * ISO 3166-1 alpha-2 destination country code.
 *
 * Kept open so future modules (Mexique = MX, Colombie = CO, …) can be added
 * without changing the union. DO = République dominicaine.
 */
export type YoDestinationCountry = string;

/** Common European Framework of Reference for Languages level. */
export type YoCefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Three-letter ISO 4217 currency code. */
export type YoCurrency = "CAD" | "USD" | "EUR" | "MXN";

/** Whether a lesson can be opened by the learner right now. */
export type YoLessonStatus = "available" | "free_preview" | "locked";

/**
 * Visual placeholder identifier. Phase 1 maps each hint to a code-based
 * SVG inside `components/yo/YoVisuals.tsx`. Phase 2 will pair each hint
 * with a real image at `/public/images/yo/voyage/do/<filename>` and the
 * `YoLessonCard.imagePath` / `YoFlashcard.imagePath` field will take
 * precedence over the placeholder.
 */
export type YoVisualHint =
  | "hero-tropical"
  | "dominican-map"
  | "history-colonial"
  | "food-bandera"
  | "conversation-bubbles"
  | "tropical-flashcard"
  | "unlock-stamp";

/**
 * Future Supabase yo_user_progress.lesson_state values. Not used in Phase 1
 * (the UI is read-only) but baked in so component props stay stable.
 */
export type YoLessonProgressState =
  | "not_started"
  | "in_progress"
  | "completed"
  | "mastered";

// ─────────────────────────────────────────────────────────────────────────
// Cards inside a single lesson
// ─────────────────────────────────────────────────────────────────────────

/**
 * Bilingual phrase row used on the "Tes premières phrases utiles" card.
 *
 * `target` is in the language being taught (e.g. "Buenos días" in Spanish),
 * `translation` is in the learner's UI language (French for the Quebec MVP).
 */
export interface YoPhraseRow {
  target: string;
  translation: string;
  audioUrl?: string | null;
}

/**
 * Hero card type — drives the visual treatment of a YoLessonCard.
 *
 * "phrases" = card 4 in the Intro (renders a phrase list)
 * "media"   = future audio/video-led card
 * "text"    = default text-with-CTA card (cards 1-3 in the Intro)
 */
export type YoLessonCardKind = "text" | "phrases" | "media";

/**
 * A single card inside a YoLesson (the "Où on s'en va ?" / "Petite histoire"
 * style mini-modules on the Intro page). Future Supabase row:
 *   yo_lessons.cards jsonb[] — same shape.
 */
export interface YoLessonCard {
  id: string;
  kind: YoLessonCardKind;
  title: string;
  description?: string;
  ctaLabel?: string;
  /** Optional anchor or path; "#" is acceptable in Phase 1. */
  ctaHref?: string;
  phrases?: YoPhraseRow[];
  /** Optional icon hint (lucide-react icon name). Renderer maps to an icon. */
  iconHint?:
    | "map"
    | "book"
    | "utensils"
    | "music"
    | "languages"
    | "message-circle"
    | "compass"
    | "sparkles";
  /**
   * Optional code-based visual placeholder identifier. Phase 1 renders an
   * inline SVG (see components/yo/YoVisuals.tsx); Phase 2 will swap to the
   * real image at `imagePath` when present.
   */
  visualHint?: YoVisualHint;
  /**
   * Optional future-Supabase / future-CMS image asset path, e.g.
   * "/images/yo/voyage/do/map-dominican-republic.svg". When set in Phase 2
   * the renderer must prefer this over `visualHint`. Phase 1 leaves this
   * undefined on purpose — no real images exist yet.
   */
  imagePath?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Lessons + lesson path
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single lesson in a module (Intro, Arrivée et hôtel, …). Future row:
 *   public.yo_lessons.
 */
export interface YoLesson {
  id: string;
  /** 1-based position inside its module. */
  position: number;
  /** Display title in the learner's UI language. */
  title: string;
  /** Short subtitle / one-line hook. */
  subtitle?: string;
  status: YoLessonStatus;
  /** Estimated minutes for completion (Phase 1: optional). */
  estimatedMinutes?: number;
  /** Cards rendered when the lesson is opened. */
  cards: YoLessonCard[];
}

/**
 * Compact representation of a lesson used by the lesson path
 * (numbered roadmap on the page). Pulled out so the path doesn't need to
 * embed full card payloads.
 */
export interface YoLessonPathStep {
  id: string;
  position: number;
  title: string;
  ctaLabel: string;
  status: YoLessonStatus;
}

// ─────────────────────────────────────────────────────────────────────────
// Module (the unit a learner buys)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Top-level Yo Pratiqo Voyage product. Future row:
 *   public.yo_modules.
 *
 * NOTE on pricing — the MVP price is $24.99 CAD = 2499 cents. The product
 * decision is locked in here so a future migration writing the DB row reads
 * the same number from this type's defaults.
 */
export interface YoModule {
  /** Stable slug, e.g. "voyage_es_do". */
  id: string;
  productLine: YoProductLine;
  targetLanguage: YoTargetLanguage;
  destinationCountry: YoDestinationCountry;
  destinationLabelFr: string;
  cefrLevel: YoCefrLevel;
  priceCents: number;
  currency: YoCurrency;
  freeLessonsCount: number;
  /** Marketing title rendered in the hero. */
  heroTitle: string;
  /** Marketing one-liner under the hero title. */
  heroSubtitle: string;
  /** Small label that sits above the hero (e.g. "Yo Pratiqo Voyage"). */
  productLabel: string;
  /**
   * Optional code-based hero visual identifier. Defaults to
   * "hero-tropical" in Phase 1; in Phase 2 a real photo at
   * `/images/yo/voyage/do/hero-dominican-republic.webp` will take over via
   * `heroImagePath`.
   */
  heroVisualHint?: YoVisualHint;
  /** Optional future hero image path. Phase 1: null. */
  heroImagePath?: string | null;
  /** Lessons in display order. */
  lessons: YoLesson[];
}

// ─────────────────────────────────────────────────────────────────────────
// Flashcards
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single flashcard, shape-compatible with simplified SM-2 once we
 * persist `intervalDays`, `easeFactor`, `repetitions`, `nextReviewAt`
 * server-side (Phase 2). Phase 1 renders only `front`/`back`/`hint`.
 *
 * Future row: public.yo_flashcards (front, back, hint, …) plus
 *             public.yo_flashcard_reviews per user.
 */
export interface YoFlashcard {
  id: string;
  front: string;
  back: string;
  /** Optional UI hint shown when the card is flipped. */
  hint?: string;
  /** Optional category tag, e.g. "salutations", "table". */
  tag?: string;
  /**
   * When true, the flashcard preview shows an "Expression locale" badge
   * (i.e. a Dominican Republic-specific expression). Marketing accent
   * only — no UX behaviour depends on it.
   */
  isLocalExpression?: boolean;
  /**
   * Optional code-based visual placeholder identifier — drives the
   * background motif rendered behind the flashcard front. Same Phase 1 /
   * Phase 2 swap contract as `YoLessonCard.visualHint`.
   */
  visualHint?: YoVisualHint;
  /**
   * Optional future image asset path
   * (e.g. "/images/yo/voyage/do/flashcard-tropical-bg.webp"). Phase 1: null.
   */
  imagePath?: string | null;
}

/**
 * Simplified SM-2 quality buckets. Only used in Phase 2; declared here so
 * the YoFlashcardPreview component can already type its button handlers.
 *   0 = Difficile, 3 = Correct, 5 = Facile.
 */
export type YoFlashcardQuality = 0 | 3 | 5;

// ─────────────────────────────────────────────────────────────────────────
// Quiz
// ─────────────────────────────────────────────────────────────────────────

/** Single multiple-choice option. */
export interface YoQuizOption {
  id: string;
  label: string;
}

/**
 * A single multiple-choice quiz question. Future rows:
 *   public.yo_quiz_questions (question, options jsonb, correct_option_id)
 *   public.yo_quiz_attempts  (user, question, picked, was_correct, at).
 */
export interface YoQuizQuestion {
  id: string;
  prompt: string;
  options: YoQuizOption[];
  /** Must match one of `options[i].id`. */
  correctOptionId: string;
  /** Gentle-correction copy used when the learner picks the wrong option. */
  explanation?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Marketing features (used by the unlock card and feature strip)
// ─────────────────────────────────────────────────────────────────────────

/** Lucide icon hint understood by feature-rendering components. */
export type YoFeatureIcon =
  | "headphones"
  | "layers"
  | "compass"
  | "graduation-cap"
  | "sparkles"
  | "shield-check"
  | "infinity";

export interface YoFeature {
  id: string;
  label: string;
  icon?: YoFeatureIcon;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregate type returned by lib/yo/dominicanRepublicA1.ts
// ─────────────────────────────────────────────────────────────────────────

/**
 * Everything the page needs in a single deterministic object. Future-shape
 * note: when this comes from Supabase, the same object can be produced by
 * a single server route or by joining yo_modules + yo_lessons +
 * yo_flashcards + yo_quiz_questions in one Edge Function.
 */
export interface YoIntroPageData {
  module: YoModule;
  /** Numbered path rendered above the Intro cards. */
  lessonPath: YoLessonPathStep[];
  /** Curated marquee flashcard for the preview component. */
  flashcardSample: YoFlashcard;
  /** Curated marquee question for the quiz preview component. */
  quizSample: YoQuizQuestion;
  /** Cards rendered on the unlock CTA (5+ items). */
  unlockFeatures: YoFeature[];
  /** Smaller marketing strip at the bottom (4 items). */
  bottomFeatures: YoFeature[];
}
