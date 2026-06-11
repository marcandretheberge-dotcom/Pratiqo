/**
 * lib/yo/languageIntroDecks.ts
 *
 * Shared per-language metadata for the app-shell language intro
 * decks. Each entry tells the page-level deck composer:
 *
 *   - which Languages-hub label to use for the deck header
 *   - which audio profile + speech BCP-47 tag drives the per-page
 *     audio buttons (so the deck composer can show consistent
 *     `<lang>` tagging in its content)
 *   - which canonical intro route owns this language (so the
 *     catalog test + the QA doc can verify the link target)
 *
 * The entries are pure data — no React, no Supabase, no Stripe,
 * no payment library, no quiz storage. The deck wires this into
 * `<YoLessonDeck />` per page.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure data module. No persistence, no API calls, no
 *     telemetry, no client-only references. Safe to import from
 *     both server and client components, and from any test.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

export type YoLanguageIntroId =
  | "espagnol-global"
  | "francais-quebec"
  | "italien"
  | "japonais"
  | "anglais";

/**
 * Per-language deck metadata. Keep this list aligned with the
 * five cards rendered by `app/yo/langues/page.tsx`.
 *
 *   - `route`         is the canonical intro path the catalog
 *                     points to, and the back-arrow target the
 *                     deck header should `Link` to (always
 *                     `/yo/langues`).
 *   - `moduleLabel`   is shown by the deck header next to the
 *                     `<YoPratiqoLogo>`.
 *   - `accentProfile` mirrors the `accentProfile` already used
 *                     by the audio button on the existing intro
 *                     page. We do NOT change audio behavior.
 *   - `speechLang`    is the BCP-47 tag for browser TTS fallback.
 *   - `targetLangTag` is the HTML `lang="…"` value the deck
 *                     content uses when rendering target-language
 *                     vocab.
 */
export interface YoLanguageIntroDeckMeta {
  id: YoLanguageIntroId;
  /** Path-only canonical intro route (no `?lang=` suffix). */
  route: string;
  /** Compact label for the deck header. */
  moduleLabel: YoLocalizedString;
  /**
   * Where the back arrow points. Always the Languages hub today,
   * so the learner always lands back in a discoverable place
   * instead of bouncing all the way to `/yo`.
   */
  backRoute: string;
  /** Audio manifest accent profile (matches existing per-page wiring). */
  accentProfile: string;
  /** Browser TTS fallback BCP-47. */
  speechLang: string;
  /** HTML `lang="…"` value used for target-language text. */
  targetLangTag: string;
  /** Optional teacher-search query string fragment. */
  teacherSearchQuery: string;
}

export const YO_LANGUAGE_INTRO_DECK_META: readonly YoLanguageIntroDeckMeta[] = [
  {
    id: "espagnol-global",
    route: "/yo/langues/espagnol/intro",
    moduleLabel: lstr(
      "Intro · Espagnol",
      "Intro · Spanish",
      "Intro · Español",
    ),
    backRoute: "/yo/langues",
    accentProfile: "latin_american_neutral",
    speechLang: "es-ES",
    targetLangTag: "es",
    teacherSearchQuery: "espagnol",
  },
  {
    id: "francais-quebec",
    route: "/yo/langues/francais-quebec/intro",
    moduleLabel: lstr(
      "Intro · Français QC",
      "Intro · Quebec French",
      "Intro · Francés QC",
    ),
    backRoute: "/yo/langues",
    accentProfile: "quebec_french",
    speechLang: "fr-CA",
    targetLangTag: "fr-CA",
    teacherSearchQuery: "francais",
  },
  {
    id: "italien",
    route: "/yo/langues/italien/intro",
    moduleLabel: lstr("Intro · Italien", "Intro · Italian", "Intro · Italiano"),
    backRoute: "/yo/langues",
    accentProfile: "italian_standard",
    speechLang: "it-IT",
    targetLangTag: "it",
    teacherSearchQuery: "italien",
  },
  {
    id: "japonais",
    route: "/yo/langues/japonais/intro",
    moduleLabel: lstr("Intro · Japonais", "Intro · Japanese", "Intro · Japonés"),
    backRoute: "/yo/langues",
    accentProfile: "japanese_standard",
    speechLang: "ja-JP",
    targetLangTag: "ja",
    teacherSearchQuery: "japonais",
  },
  {
    id: "anglais",
    route: "/yo/langues/anglais/intro",
    moduleLabel: lstr("Intro · Anglais", "Intro · English", "Intro · Inglés"),
    backRoute: "/yo/langues",
    accentProfile: "canadian_english",
    speechLang: "en-CA",
    targetLangTag: "en",
    teacherSearchQuery: "anglais",
  },
] as const;

export function getYoLanguageIntroDeckMeta(
  id: YoLanguageIntroId,
): YoLanguageIntroDeckMeta {
  const meta = YO_LANGUAGE_INTRO_DECK_META.find((entry) => entry.id === id);
  if (!meta) {
    throw new Error(`Unknown YoPratiqo language intro id: ${id}`);
  }
  return meta;
}
