/**
 * lib/yo/lessonDeckTypes.ts
 *
 * Type model for the YoPratiqo lesson-deck system. The deck
 * presents a module as a sequence of focused, app-like screens
 * rather than one long-scroll page. The types here are the
 * single source of truth — the deck client component, the screen
 * frame, and any future per-module deck composer all consume
 * this shape.
 *
 * Privacy / safety profile
 * ------------------------
 *   • The model carries display-only data (titles, body, helper
 *     text, ReactNodes). It does NOT carry raw quiz answers,
 *     selected options, attempt logs, keystrokes, audio
 *     attempts, or any user-identifying data.
 *   • The optional `companion_stage` string used by the existing
 *     `dominicanRdModuleProgressPayload(...)` helper is unchanged
 *     and not duplicated here — completion persistence stays
 *     fully owned by `<YoMarkModuleCompletedButton>` and
 *     `/api/yo/progress`.
 */

import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { YoLocale } from "@/lib/yo/types";

/**
 * Pedagogical kind of a lesson screen. Used to drive
 * companion-state defaults and per-screen iconography. Adding a
 * new kind here is intentionally cheap — fall through cases pick
 * sensible defaults.
 */
export type YoLessonDeckScreenKind =
  | "mission"
  | "phrase"
  | "dialogue"
  | "culture"
  | "practice"
  | "quiz"
  | "summary"
  | "completion";

/**
 * Companion visual state for a screen. Reuses the eight states
 * already defined in `lib/companion/companionVisuals.ts` so the
 * deck never invents a state outside the manifest.
 */
export type YoLessonDeckCompanionState = CompanionVisualState;

/**
 * One screen in the deck.
 *
 * `content` is the server-rendered, locale-resolved JSX that the
 * page passed in. The deck client component does not introspect
 * it — it only mounts every screen in the DOM and toggles
 * visibility on the active one, so client widgets nested inside
 * (audio buttons, flashcard carousel, completion button) keep
 * their internal state when the learner navigates back and forth.
 */
export interface YoLessonDeckScreen {
  /** Stable per-deck slug, e.g. "mission" / "phrases" / "completion". */
  id: string;
  /** Pedagogical category of this screen. */
  kind: YoLessonDeckScreenKind;
  /** Localized eyebrow line above the title (e.g. "Mission · 1/9"). */
  eyebrow?: string;
  /** Localized headline for the screen. */
  title: string;
  /** Optional one-paragraph body under the title. */
  body?: string;
  /** Optional helper sentence for the companion coach bubble. */
  helperText?: string;
  /** Companion visual state for this screen (`map` / `confused` / etc.). */
  companionState: YoLessonDeckCompanionState;
  /**
   * Localized "primary action" label for the bottom-of-card CTA,
   * if the screen wants to override the deck's default
   * "Suivant / Next / Siguiente" button.
   */
  ctaLabel?: string;
  /** The actual lesson content — server-rendered React. */
  content: React.ReactNode;
}

/**
 * Localized labels for the deck's chrome (header, nav, progress
 * announcement). Centralized so every consumer of the deck uses
 * the same FR / EN / ES strings.
 */
export interface YoLessonDeckChromeLabels {
  /** Sticky-header back-arrow label. */
  back: string;
  /** Bottom-nav previous-step label. */
  prev: string;
  /** Bottom-nav next-step label (used until the last screen). */
  next: string;
  /** Bottom-nav label on the last screen. */
  finish: string;
  /** Screen-reader announcement template, e.g. "Étape 3 sur 9". */
  progressAnnouncement: (current: number, total: number) => string;
  /** "FR / EN / ES" toggle label. */
  toggleLanguage: string;
}

export const YO_LESSON_DECK_CHROME: Record<YoLocale, YoLessonDeckChromeLabels> = {
  fr: {
    back: "Retour",
    prev: "Précédent",
    next: "Suivant",
    finish: "Terminer",
    progressAnnouncement: (current, total) => `Étape ${current} sur ${total}`,
    toggleLanguage: "View in English",
  },
  en: {
    back: "Back",
    prev: "Previous",
    next: "Next",
    finish: "Finish",
    progressAnnouncement: (current, total) => `Step ${current} of ${total}`,
    toggleLanguage: "Voir en français",
  },
  es: {
    back: "Atrás",
    prev: "Anterior",
    next: "Siguiente",
    finish: "Terminar",
    progressAnnouncement: (current, total) => `Paso ${current} de ${total}`,
    toggleLanguage: "Voir en français",
  },
};
