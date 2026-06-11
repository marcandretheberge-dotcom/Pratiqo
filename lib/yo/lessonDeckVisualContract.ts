/**
 * lib/yo/lessonDeckVisualContract.ts
 *
 * Single source of truth for the YoPratiqo Dominican Republic
 * lesson-deck visual contract. Every shell component
 * (`YoLessonDeck`, `YoLessonDeckHeader`, `YoLessonDeckNav`,
 * `YoLessonDeckScreen`, `YoLessonCompanionCoach`) imports its
 * canonical class strings + palette tokens from this file so
 * Intro + Modules 2 / 3 / 4 / 5 inherit the same premium app
 * look without each shell file hand-rolling its own colors,
 * paddings, radii, or content widths.
 *
 * Design intent
 * -------------
 *   • One mobile-app frame. Header, progress strip, stage, and
 *     bottom nav all share the same `DECK_CONTENT_MAX_WIDTH_CLASS`
 *     (`max-w-[640px]`) so the inner column of the deck is one
 *     consistent width from header to nav — no more "the nav is
 *     narrower than the content above it" drift.
 *   • One palette. Cream (`#F4EFE6`), warm-cream (`#FBF7EE`),
 *     navy (`#172642`), teal (`#13A085` + `#16B597` hover), and
 *     warm border (`#E7DFCF`) are the only colors used by the
 *     deck chrome. Per-screen content can still use richer
 *     accents (e.g. the warm-yellow `#FFF4D6` completion stamp),
 *     but the chrome stays calm.
 *   • One rhythm. Card radius is `rounded-[2rem]`, card padding
 *     is `p-5 sm:p-6`, card shadow is a soft 18 / 0.07 navy.
 *     Header / nav use `pb-[max(env(safe-area-inset-bottom),...)]`
 *     so iPhone home-indicator inset is honored everywhere.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure constants module. No runtime side effects, no API
 *     calls, no Supabase, no payment library, no Stripe import,
 *     no MP3 / OpenAI / audio-gen reference, no quiz storage,
 *     no analytics. Safe to import from server or client
 *     components.
 *
 * Not in scope
 * ------------
 *   • This file does NOT define educational copy, CTAs, quiz
 *     payloads, progress payloads, or any per-module content.
 *     Those stay in the per-module composer files.
 *   • This file does NOT introduce a new design system. It
 *     consolidates classes that were already in use across the
 *     deck shell.
 */

/* eslint-disable */
// ─── Palette tokens (deck chrome only) ──────────────────────────────────
//
// Hex literals — duplicated as plain strings so consumers can use
// them inside inline `style={{ ... }}` props or `cn(...)`
// template literals without depending on Tailwind's arbitrary-
// value parser at the call site.
export const DECK_PALETTE = {
  /** Page-background warm cream (the deck stage gradient base). */
  cream: "#F4EFE6",
  /** Lighter warm cream used in the stage gradient mid-stop. */
  creamSoft: "#FBF7EE",
  /** Navy used for primary text + active progress dot. */
  navy: "#172642",
  /** Muted navy used for body copy. */
  navyMuted: "#566073",
  /** Teal primary (Next button, eyebrow accent, completed dot). */
  teal: "#13A085",
  /** Teal hover (Next button hover). */
  tealHover: "#16B597",
  /** Cream border / divider color. */
  border: "#E7DFCF",
} as const;

// ─── Width tokens ───────────────────────────────────────────────────────
//
// The deck has a single content column that the header, the
// progress strip, the stage, and the nav all share. Keeping
// them aligned avoids the "narrow nav under wide content" feel
// the deck had before this polish pass.

/** Pixel width of the deck's content column on every breakpoint. */
export const DECK_CONTENT_MAX_WIDTH_PX = 640;

/** Tailwind class for `DECK_CONTENT_MAX_WIDTH_PX`. */
export const DECK_CONTENT_MAX_WIDTH_CLASS = "max-w-[640px]";

// ─── Shared class strings ───────────────────────────────────────────────
//
// Each constant is the full `className` string consumers should
// pass to the corresponding wrapper. Consumers may extend with
// `cn(...)` but must not replace these — that keeps the deck
// chrome consistent across all 5 surfaces.

/**
 * Root viewport-locked container for the deck. `h-[100dvh]` +
 * `overflow-hidden` + warm-cream gradient. The deck client
 * component composes this with `cn()` so per-route classes can
 * still extend it.
 */
export const DECK_ROOT_CLASSES =
  "relative flex h-[100dvh] flex-col overflow-hidden bg-[linear-gradient(180deg,#F4EFE6_0%,#FBF7EE_55%,#F4EFE6_100%)] overscroll-contain";

/**
 * App-style top bar wrapper. Sits at the top of the deck flex
 * column, `shrink-0`, with a thin bottom border so the header
 * always reads as separate from the stage.
 */
export const DECK_HEADER_CLASSES =
  "relative z-40 shrink-0 border-b border-[#E7DFCF] bg-[#F4EFE6]/92 backdrop-blur-md";

/**
 * Inner flex row for the header. Aligned to the deck content
 * column so the back button / logo / language toggle never
 * float wider than the stage below.
 */
export const DECK_HEADER_ROW_CLASSES =
  "mx-auto flex h-14 w-full items-center justify-between gap-3 px-3 sm:h-16 sm:px-6";

/**
 * Compact progress strip wrapper. Aligned to the deck content
 * column.
 */
export const DECK_PROGRESS_STRIP_CLASSES =
  "mx-auto flex w-full shrink-0 items-center gap-3 px-4 pt-3 sm:px-6";

/**
 * Stage container. `flex-1 min-h-0` so it consumes the
 * remaining viewport between header / progress and nav.
 * `relative` so the screen hosts can `absolute inset-0`.
 */
export const DECK_STAGE_CLASSES =
  "relative mx-auto flex w-full min-h-0 flex-1 px-4 pt-3 sm:px-6";

/**
 * One screen host inside the stage. Absolute-positioned so all
 * screens share the same box; the per-card scroll fallback is
 * scoped to this host (`overflow-y-auto overscroll-contain`)
 * so a single long screen stays usable without leaking scroll
 * up to the document.
 */
export const DECK_SCREEN_HOST_CLASSES =
  "absolute inset-0 px-1 pb-3 overflow-y-auto overscroll-contain";

/**
 * Bottom Back / Next bar wrapper. `shrink-0`, `relative` so
 * the soft fade overlay on top of it can be `absolute`,
 * `pb-[max(env(safe-area-inset-bottom),0.5rem)]` so the iPhone
 * home indicator does not crowd the buttons.
 */
export const DECK_NAV_CLASSES =
  "relative z-30 shrink-0 border-t border-[#E7DFCF] bg-[#F4EFE6]/96 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur-md";

/**
 * Inner flex row for the nav. Aligned to the deck content
 * column so the buttons live directly under the stage they
 * navigate.
 */
export const DECK_NAV_ROW_CLASSES =
  "mx-auto flex w-full items-center justify-between gap-3";

/**
 * Back / Previous button. Soft outline + white background +
 * navy text — clearly secondary to the primary Next button.
 */
export const DECK_NAV_PREV_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#E7DFCF] bg-white px-5 py-3 text-sm font-bold text-[#172642] shadow-[0_10px_24px_rgba(23,38,66,0.06)] transition";

/**
 * Next / Finish button. Strong teal + white text + soft teal
 * glow shadow — the primary deck action.
 */
export const DECK_NAV_NEXT_BUTTON_CLASSES =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#13A085] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(19,160,133,0.28)] transition";

/**
 * Per-screen card. White surface with the same warm border
 * and same soft navy shadow used elsewhere in YoPratiqo so
 * every screen reads like one app card.
 */
export const DECK_SCREEN_CARD_CLASSES =
  "flex w-full flex-col gap-4 rounded-[2rem] border border-[#E7DFCF] bg-white p-5 shadow-[0_18px_46px_rgba(23,38,66,0.07)] sm:p-6";

/**
 * Per-screen eyebrow line. Tiny, black uppercase teal —
 * canonical YoPratiqo eyebrow treatment.
 */
export const DECK_SCREEN_EYEBROW_CLASSES =
  "text-[10px] font-black uppercase tracking-[0.16em] text-[#13A085]";

/**
 * Per-screen title. Editorial serif (via the
 * `--yo-app-display` CSS var) at app-card size — readable on
 * a 390 px viewport without dominating.
 */
export const DECK_SCREEN_TITLE_CLASSES =
  "font-[var(--yo-app-display)] text-[22px] font-semibold leading-tight tracking-tight text-[#172642] sm:text-2xl";

/**
 * Per-screen body paragraph under the title.
 */
export const DECK_SCREEN_BODY_CLASSES =
  "text-sm leading-relaxed text-[#566073]";

/**
 * Companion coach helper bubble. Tiny rounded warm-cream
 * speech bubble — the same shape on every screen, so the
 * companion always feels like one consistent character.
 */
export const DECK_COMPANION_BUBBLE_CLASSES =
  "flex-1 rounded-2xl border border-[#E7DFCF] bg-[#FBF7EE] px-3 py-2 text-xs leading-relaxed text-[#566073] sm:text-sm";

/**
 * Soft fade overlay anchored above the bottom nav so the
 * stage content fades into the nav surface instead of butting
 * against a hard border.
 */
export const DECK_NAV_TOP_FADE_CLASSES =
  "pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#F4EFE6] to-transparent";
