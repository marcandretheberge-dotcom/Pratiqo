/**
 * YoPratiqo — Spanish intro audio manifest (latin_american_neutral).
 *
 * Powers the audio buttons on `/yo/langues/espagnol/intro`. Items here
 * use a NEUTRAL Latin American accent so the same MP3 can be reused
 * across modules whose content overlaps with the universal-words
 * vocabulary (e.g. "Buenos días" rendered inside the Dominican
 * Republic module also resolves here — we only generate a regional
 * variant when the wording is itself country-specific).
 *
 * Backward compatibility:
 *   The 5 word entries and 2 phrase entries that were uploaded in
 *   Phase 1 keep their LEGACY storage paths (no accent segment).
 *   New entries added in this file follow the same legacy layout for
 *   the `intro-a1/universal-words` lesson so all sibling MP3s live in
 *   the same Supabase Storage prefix. Newer lessons created in this
 *   module (`reading-first-text`) adopt the accent-aware layout.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking / Membre
 * Pro logic in this file. Pure data.
 */

import {
  buildAudioSlug,
  buildLegacyStoragePath,
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("latin_american_neutral");
const NEUTRAL_SPANISH_PRONUNCIATION_HINT =
  "Read in natural Latin American Spanish. Do not use English pronunciation. Spanish words that look like English must be pronounced as Spanish.";

// ─────────────────────────────────────────────────────────────────────
// Helpers — encapsulate id and path conventions for this module so the
// data table below stays compact.
// ─────────────────────────────────────────────────────────────────────

function legacyUniversalItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase">;
  text: string;
  slug?: string;
}): YoAudioItem {
  const slug = input.slug ?? buildAudioSlug(input.text);
  return {
    id: `es-intro-a1-${input.type}-${slug}`,
    targetLanguage: "es",
    moduleId: "intro-a1",
    lessonId: "universal-words",
    type: input.type,
    text: input.text,
    storagePath: buildLegacyStoragePath({
      targetLanguage: "es",
      moduleId: "intro-a1",
      lessonId: "universal-words",
      type: input.type,
      slug,
    }),
    accentProfile: ACCENT.id,
  };
}

function readingItem(input: {
  type: Extract<YoAudioItemType, "word" | "sentence">;
  text: string;
  slug: string;
  spokenText?: string;
  pronunciationHint?: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `es-intro-a1-reading-${input.type}-${input.slug}`,
    targetLanguage: "es",
    moduleId: "intro-a1",
    lessonId: "reading-first-text",
    type: input.type,
    text: input.text,
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: "intro-a1",
      lessonId: "reading-first-text",
      type: input.type,
      slug: input.slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    notes: input.notes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Universal first words & short phrases
//
// The first 5 words and 2 phrases below MUST keep their existing
// storage paths — those MP3s were uploaded in Phase 1. Any path change
// is treated as a regression by the test suite.
// ─────────────────────────────────────────────────────────────────────

export const spanishIntroAudio: readonly YoAudioItem[] = [
  legacyUniversalItem({ type: "word", text: "Hola" }),
  legacyUniversalItem({ type: "word", text: "Gracias" }),
  legacyUniversalItem({ type: "word", text: "Por favor" }),
  legacyUniversalItem({
    type: "word",
    text: "Buenos días",
    slug: "buenos-dias",
  }),
  legacyUniversalItem({ type: "word", text: "Mucho gusto" }),

  legacyUniversalItem({ type: "phrase", text: "¿Cómo estás?", slug: "como-estas" }),
  legacyUniversalItem({ type: "phrase", text: "Me llamo", slug: "me-llamo" }),

  // ── Phase 2 additions to the universal-words lesson ──────────────
  // Same lesson path → kept in the legacy (no-accent) layout so all
  // intro vocabulary MP3s stay grouped at the same prefix.

  legacyUniversalItem({ type: "word", text: "Sí", slug: "si" }),
  legacyUniversalItem({ type: "word", text: "No" }),
  legacyUniversalItem({
    type: "word",
    text: "Buenas tardes",
    slug: "buenas-tardes",
  }),
  legacyUniversalItem({
    type: "word",
    text: "Buenas noches",
    slug: "buenas-noches",
  }),
  legacyUniversalItem({ type: "word", text: "Adiós", slug: "adios" }),
  legacyUniversalItem({
    type: "phrase",
    text: "Hasta luego",
    slug: "hasta-luego",
  }),

  // ── Reading lesson — "Mi primer texto en español" ────────────────
  // Brand-new lesson → adopts the accent-aware path layout.

  readingItem({
    type: "word",
    text: "vivo",
    slug: "vivo",
    notes: "Reading vocab gloss · I live",
  }),
  readingItem({
    type: "word",
    text: "quiero",
    slug: "quiero",
    notes: "Reading vocab gloss · I want",
  }),
  readingItem({
    type: "word",
    text: "viajar",
    slug: "viajar",
    notes: "Reading vocab gloss · to travel",
  }),
  readingItem({
    type: "word",
    text: "palabras útiles",
    slug: "palabras-utiles",
    notes: "Reading vocab gloss · useful words",
  }),
  readingItem({
    type: "word",
    text: "no entiendo",
    slug: "no-entiendo",
    notes: "Reading vocab gloss · I don't understand",
  }),

  readingItem({
    type: "sentence",
    text: "Hola. Me llamo Ana. Hablo español. Vivo en Canadá, pero quiero viajar a la República Dominicana.",
    slug: "first-paragraph",
    notes: "Reading paragraph 1 · short sentences, A1 register",
  }),
  readingItem({
    type: "sentence",
    text: "Quiero aprender palabras útiles para el hotel, el restaurante y la playa. Me gusta practicar con frases simples. No hablo perfecto, pero puedo decir: hola, gracias, por favor y no entiendo. Para viajar, quiero hablar un poco más cada día.",
    slug: "second-paragraph",
    pronunciationHint: NEUTRAL_SPANISH_PRONUNCIATION_HINT,
    notes: "Reading paragraph 2 · longer, still A1",
  }),
] as const;
