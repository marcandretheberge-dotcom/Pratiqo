/**
 * YoPratiqo — shared TypeScript types.
 *
 * These types describe the data shape for the YoPratiqo Voyage-section MVP UI
 * (Phase 1). They are intentionally close to the future Supabase model so
 * the same component props can later be powered by real database rows
 * (yo_modules, yo_lessons, yo_quiz_questions, yo_flashcards, …) without
 * having to redesign the component API.
 *
 * Bilingual support: every user-facing copy field carries both French
 * ("fr", default for Quebec launch) AND English ("en", for English-
 * speaking Canada). Spanish phrases — the language being TAUGHT — stay
 * as plain strings on purpose: they are not translated, only rendered
 * with `lang="es"` for accessibility and proper text-to-speech behaviour.
 *
 * No runtime values, no Supabase imports. Pure types only.
 */

// ─────────────────────────────────────────────────────────────────────────
// Localization primitives
// ─────────────────────────────────────────────────────────────────────────

/**
 * Locales currently shipped on the Yo surface.
 *
 * - "fr" — the original Quebec-first surface, default for all Yo data
 *          authored before locale widening.
 * - "en" — Canadian English UI for newcomers / Anglo-Canadian learners.
 * - "es" — added when Yo content needs to address Spanish-speaking
 *          learners (e.g. the Quebec French / Francisation module
 *          where many learners arrive from Latin America). Components
 *          that haven't been authored with `es` strings will fall
 *          back to FR via the `t()` helper, so widening the union is
 *          backward-compatible: existing FR/EN data keeps working.
 */
export type YoLocale = "fr" | "en" | "es";

/**
 * A user-facing string available in FR / EN / ES.
 *
 * `es` is intentionally optional so the type stays backward-compatible
 * with every Yo data file authored before Spanish was a Yo locale.
 * The `t()` helper handles the fallback chain (`value[locale] ??
 * value.fr`), so a component that asks for the ES form on a non-ES
 * record gets the FR form back — never `undefined`.
 *
 * NOTE: only widen `YoLocale` when the *UI* gains a new locale.
 * Spanish phrases that are simply being TAUGHT (e.g. inside Spanish
 * intro modules) keep using plain strings rendered with `lang="es"`.
 */
export interface YoLocalizedString {
  fr: string;
  en: string;
  es?: string;
}

/**
 * Alias for longer/markdown-like body fields. Same shape as
 * `YoLocalizedString` — kept separate so the data file reads more clearly
 * when distinguishing a label ("Vocabulary") from a paragraph.
 */
export type YoLocalizedText = YoLocalizedString;

// ─────────────────────────────────────────────────────────────────────────
// Enums (string unions kept narrow so the data file is self-validating)
// ─────────────────────────────────────────────────────────────────────────

export type YoProductLine = "voyage" | "musique" | "academique";

/** ISO 639-1 language code of the language being taught. */
export type YoTargetLanguage =
  | "es"
  | "en"
  | "fr"
  | "pt"
  | "it"
  | "de"
  | "zh"
  | "ja";

/**
 * ISO 3166-1 alpha-2 destination country code.
 *
 * Kept open so future modules (Mexique = MX, Colombie = CO, …) can be added
 * without changing the union. DO = République dominicaine / Dominican Republic.
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
 * `target` is in the language being taught (Spanish — stays as a plain
 * string for `lang="es"`). `translation` is in the learner's UI language
 * and is therefore localized (FR/EN).
 */
export interface YoPhraseRow {
  target: string;
  translation: YoLocalizedString;
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
  title: YoLocalizedString;
  description?: YoLocalizedString;
  ctaLabel?: YoLocalizedString;
  /** Optional anchor or path; "#" is acceptable in Phase 1. Not localized. */
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
   * undefined on purpose — no real images exist yet. Not localized.
   */
  imagePath?: string | null;
  /** Localized alt text for the image slot when `imagePath` is populated. */
  imageAlt?: YoLocalizedString;
}

// ─────────────────────────────────────────────────────────────────────────
// Lessons + lesson path
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single lesson in a module (Intro, Arrivée et hôtel / Arrival and hotel,
 * …). Future row: public.yo_lessons.
 */
export interface YoLesson {
  id: string;
  /** 1-based position inside its module. */
  position: number;
  /** Display title in the learner's UI language. */
  title: YoLocalizedString;
  /** Short subtitle / one-line hook. */
  subtitle?: YoLocalizedString;
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
  title: YoLocalizedString;
  ctaLabel: YoLocalizedString;
  status: YoLessonStatus;
  /** Optional real route for available lessons. Locked lessons must omit this. */
  href?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Module (the unit a learner buys)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Top-level YoPratiqo Voyage-section module. Future row:
 *   public.yo_modules.
 *
 * NOTE on pricing — the MVP price is 2499 cents formatted as
 * "$24,99 CAD" (FR) / "$24.99 CAD" (EN). The number is locked here so a
 * future migration writing the DB row reads the same source of truth.
 * Use `formatYoPrice(priceCents, locale)` from `lib/yo/localize.ts` to
 * render the price in either UI language.
 */
export interface YoModule {
  /** Stable slug, e.g. "voyage_es_do". */
  id: string;
  productLine: YoProductLine;
  targetLanguage: YoTargetLanguage;
  destinationCountry: YoDestinationCountry;
  /** Localized destination label, e.g. {fr:"République dominicaine", en:"Dominican Republic"}. */
  destinationLabel: YoLocalizedString;
  cefrLevel: YoCefrLevel;
  priceCents: number;
  currency: YoCurrency;
  freeLessonsCount: number;
  /** Marketing title rendered in the hero. */
  heroTitle: YoLocalizedString;
  /** Marketing one-liner under the hero title. */
  heroSubtitle: YoLocalizedString;
  /**
   * Small label that sits above the hero. Localized so the brand can read
   * the same in both languages but stay typed consistently — e.g.
   * "YoPratiqo · Voyage" (FR) / "YoPratiqo · Travel" (EN) for the MVP brand.
   */
  productLabel: YoLocalizedString;
  /**
   * Optional code-based hero visual identifier. Defaults to
   * "hero-tropical" in Phase 1; in Phase 2 a real photo at
   * `/images/yo/voyage/do/hero-dominican-republic.webp` will take over via
   * `heroImagePath`.
   */
  heroVisualHint?: YoVisualHint;
  /** Optional future hero image path. Phase 1: null. */
  heroImagePath?: string | null;
  /** Localized alt text for the hero image slot. */
  heroImageAlt?: YoLocalizedString;
  /** Optional culture image used by the purchase/unlock travel card. */
  cultureImagePath?: string | null;
  /** Localized alt text for the culture image slot. */
  cultureImageAlt?: YoLocalizedString;
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
 * `front` is Spanish — stays as a plain string; `back` and `hint` are
 * learner-language and therefore localized.
 *
 * Future row: public.yo_flashcards (front, back, hint, …) plus
 *             public.yo_flashcard_reviews per user.
 */
export interface YoFlashcard {
  id: string;
  front: string;
  back: YoLocalizedString;
  /** Optional UI hint shown when the card is flipped. */
  hint?: YoLocalizedString;
  /** Optional category tag, e.g. "salutations" / "greetings". */
  tag?: YoLocalizedString;
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
  /** Localized alt text for the image slot when `imagePath` is populated. */
  imageAlt?: YoLocalizedString;
}

/**
 * Simplified SM-2 quality buckets. Only used in Phase 2; declared here so
 * the YoFlashcardPreview component can already type its button handlers.
 *   0 = Difficile / Hard, 3 = Correct / Good, 5 = Facile / Easy.
 */
export type YoFlashcardQuality = 0 | 3 | 5;

// ─────────────────────────────────────────────────────────────────────────
// Quiz
// ─────────────────────────────────────────────────────────────────────────

/** Single multiple-choice option. */
export interface YoQuizOption {
  id: string;
  label: YoLocalizedString;
}

/**
 * A single multiple-choice quiz question. Future rows:
 *   public.yo_quiz_questions (question, options jsonb, correct_option_id)
 *   public.yo_quiz_attempts  (user, question, picked, was_correct, at).
 */
export interface YoQuizQuestion {
  id: string;
  prompt: YoLocalizedString;
  options: YoQuizOption[];
  /** Must match one of `options[i].id`. */
  correctOptionId: string;
  /** Gentle-correction copy used when the learner picks the wrong option. */
  explanation?: YoLocalizedString;
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
  label: YoLocalizedString;
  icon?: YoFeatureIcon;
}

// ─────────────────────────────────────────────────────────────────────────
// Detailed Intro sections (real learning content, revealed by the
// progressive-disclosure orchestrator `YoIntroExperience`).
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single bilingual vocabulary / phrase row. Future Supabase row:
 *   public.yo_lesson_vocabulary (target, translation, audio_url, …).
 *
 * `target` is Spanish — stays as plain string; `translation` is the
 * learner-language gloss and therefore localized.
 */
export interface YoVocabularyItem {
  /** Spanish (taught language). Not localized. */
  target: string;
  /** Learner-language gloss (FR/EN). */
  translation: YoLocalizedString;
  /** Future audio source. Phase 1: null. Not localized. */
  audioUrl?: string | null;
}

/** A named bullet list — e.g. "Assiette typique" / "Typical plate". */
export interface YoBulletGroup {
  heading?: YoLocalizedString;
  items: YoVocabularyItem[];
}

/** Timeline entry used by the history mini-lesson. */
export interface YoTimelineEntry {
  /**
   * Free-form year label. Localized because labels like "Aujourd'hui" /
   * "Today" differ between languages; numeric years simply hold the same
   * value in both keys.
   */
  year: YoLocalizedString;
  description: YoLocalizedString;
}

/** A label-only bullet (the geography card's three zones, for instance). */
export interface YoSimpleBullet {
  label: YoLocalizedString;
  description?: YoLocalizedString;
}

/**
 * One line in a learner-facing dialogue scenario.
 * `speakerKind` drives the visual treatment (host vs. self bubble).
 *
 * `target` (the spoken Spanish) stays plain; `speakerLabel` and the
 * optional `translation` gloss are learner-language.
 */
export interface YoDialogueLine {
  speakerLabel: YoLocalizedString;
  speakerKind: "host" | "self";
  /** Spanish line spoken by the speaker. Not localized. */
  target: string;
  /** Optional gloss; Phase 1 omits this for natural immersion. */
  translation?: YoLocalizedString;
}

export interface YoDialogueScenarioData {
  title: YoLocalizedString;
  lines: YoDialogueLine[];
}

/** Mini-mission: pick-one practice prompt, no scoring. */
export interface YoMiniMission {
  title?: YoLocalizedString;
  intro: YoLocalizedString;
  /** Options are Spanish phrases the learner picks from — not localized. */
  options: string[];
}

/**
 * A single Dominican Republic expression in the pocket dictionary.
 * A1 rule: NO vulgar / mature / ambiguous slang. B1+ may later add
 * "à reconnaître mais ne pas utiliser" entries; the Phase 1 list is
 * intentionally kept kid/family-friendly.
 */
export interface YoDominicanExpression {
  id: string;
  /** Spanish — not localized. */
  target: string;
  translation: YoLocalizedString;
  /** Optional small tag e.g. "table" / "table", "salutations" / "greetings". */
  category?: YoLocalizedString;
}

/**
 * Detailed content for one of the four Intro cards. Each card's `id`
 * matches a section here, and the orchestrator opens the matching panel
 * when the card's CTA is pressed. Future Supabase row:
 *   public.yo_lesson_sections (lesson_id, position, content jsonb).
 */
export interface YoIntroDetailedSection {
  /** Matches the parent YoLessonCard.id (e.g. "intro_card_geography"). */
  id: string;
  /** Optional emoji rendered alongside the panel title. Not translated. */
  emoji?: string;
  title: YoLocalizedString;
  /** Lead paragraph rendered at the top of the panel. */
  intro?: YoLocalizedString;
  /** Optional intro line shown right before `bullets`. */
  sectionLeadIn?: YoLocalizedString;
  /** Three-zones-style bullets (label + optional description). */
  bullets?: YoSimpleBullet[];
  /** Optional highlight callout (e.g. "La Bandera Dominicana"). */
  highlightTitle?: YoLocalizedString;
  highlightBody?: YoLocalizedString;
  /** Multi-group bullet lists (typical plate, drinks, …). */
  bulletGroups?: YoBulletGroup[];
  /** Intro line for `practicalPhrases`. */
  practicalPhrasesIntro?: YoLocalizedString;
  /** Inline-callout phrases (e.g. "Soy de Quebec."). */
  practicalPhrases?: YoVocabularyItem[];
  /** Closing vocabulary table for the section. */
  vocabulary?: YoVocabularyItem[];
  /** History-style timeline entries. */
  timeline?: YoTimelineEntry[];
  /** Short pedagogical note shown after the timeline. */
  learningNote?: YoLocalizedString;
  /** Optional mini practice mission. */
  miniMission?: YoMiniMission;
  /** Optional learner dialogue scenario. */
  dialogue?: YoDialogueScenarioData;
  /** Reuse the section's hero placeholder visual at the top of the panel. */
  visualHint?: YoVisualHint;
  /** Optional real image path for the section's visual header. */
  imagePath?: string | null;
  /** Localized alt text for the section image slot. */
  imageAlt?: YoLocalizedString;
  /**
   * When set, render an "Audio bientôt disponible" / "Audio coming soon"
   * chip. Phase 1 never pretends real audio exists.
   */
  audioComingSoonLabel?: YoLocalizedString | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Guided reading (short text + vocabulary helper + comprehension quiz)
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single Spanish vocabulary row that powers the reading helper box.
 *
 * `target` is the Spanish term/phrase (rendered with `lang="es"`).
 * `translation` is the learner-language gloss in both FR and EN — for the
 * helper box we render BOTH languages side-by-side so a learner reading
 * the page in either UI can still see the cross-language anchor.
 */
export interface YoReadingVocabularyItem {
  target: string;
  translation: YoLocalizedString;
}

/**
 * One guided-reading section. The Spanish `body` is a short A1-safe text
 * (70–100 words). `bodyLines` is the same text split into paragraphs so
 * the renderer can keep the visual rhythm without parsing the string.
 *
 * `speechLang` lets a reading attached to a specific country (e.g. RD)
 * prefer a regional voice ("es-DO") while keeping a sensible global
 * default ("es-ES").
 *
 * Future Supabase row: public.yo_reading_sections (body jsonb, locale,
 *                                                  speech_lang, …).
 */
export interface YoReadingSection {
  id: string;
  /** Eyebrow chip (e.g. "Lecture guidée"). */
  eyebrow: YoLocalizedString;
  /** Localized title (e.g. "Mi primer texto en español"). */
  title: YoLocalizedString;
  /** Optional one-line subtitle / pedagogical hint. */
  subtitle?: YoLocalizedString;
  /** Spanish paragraphs of the reading text. Each rendered with `lang="es"`. */
  bodyLines: string[];
  /** Vocabulary helper box rows. */
  vocabulary: YoReadingVocabularyItem[];
  /** Comprehension questions (multiple choice, with feedback). */
  questions: YoQuizQuestion[];
  /**
   * BCP-47 tag used by SpeechSynthesis. Defaults to "es-ES" if undefined.
   * Country modules can pick "es-DO", "es-MX", "es-CO", …
   */
  speechLang?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// YoPratiqo Coach (deterministic recommendation MVP)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Identifier for a self-reported difficulty axis. Kept as a closed union
 * so the deterministic recommendation table (`YoCoachOption.recommendation`)
 * stays type-safe.
 */
export type YoCoachDifficulty =
  | "pronunciation"
  | "vocabulary"
  | "comprehension"
  | "culture"
  | "unsure";

/**
 * One option in the YoPratiqo Coach question. Each option carries its own
 * deterministic recommendation so the runtime stays a pure lookup — no
 * conditional logic, no network call.
 *
 * Phase 2: a server route will be able to replace `recommendation` with
 * an AI-generated string given a small prompt + the learner's signals.
 * The shape stays identical so the swap is invisible to the UI.
 */
export interface YoCoachOption {
  id: YoCoachDifficulty;
  label: YoLocalizedString;
  /** What YoPratiqo Coach suggests once this option is picked. */
  recommendation: YoLocalizedString;
}

// ─────────────────────────────────────────────────────────────────────────
// Intro progress strip
// ─────────────────────────────────────────────────────────────────────────

/** Single chip in the intro-progress strip. */
export interface YoIntroProgressStat {
  id: string;
  /** Numeric or short token — not localized (numbers are universal). */
  value: number | string;
  label: YoLocalizedString;
}

/** Compact value-prop strip rendered above the four intro cards. */
export interface YoIntroProgressStats {
  title: YoLocalizedString;
  description: YoLocalizedString;
  stats: YoIntroProgressStat[];
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
  /** Detailed lesson content, keyed by intro-card id. */
  detailedSections: YoIntroDetailedSection[];
  /** A1-safe Dominican expressions pocket dictionary. */
  dominicanDictionary: YoDominicanExpression[];
  /** Flashcard deck used by YoFlashcardPreview (12+ cards). */
  flashcardDeck: YoFlashcard[];
  /** Full quiz used by YoQuizPreview (5 questions). */
  quizQuestions: YoQuizQuestion[];
  /** Compact value-prop strip shown above the cards. */
  introProgress: YoIntroProgressStats;
  /** Cards rendered on the unlock CTA (5+ items). */
  unlockFeatures: YoFeature[];
  /** Smaller marketing strip at the bottom (4 items). */
  bottomFeatures: YoFeature[];

  /**
   * Legacy aliases — kept so any external consumer that imported a single
   * sample card or question keeps working. They always point to the first
   * element of `flashcardDeck` / `quizQuestions`.
   */
  flashcardSample: YoFlashcard;
  quizSample: YoQuizQuestion;
}
