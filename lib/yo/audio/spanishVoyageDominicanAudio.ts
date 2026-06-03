/**
 * YoPratiqo — Voyage · República Dominicana audio manifest
 * (`dominican_republic` accent).
 *
 * Powers the audio buttons on
 * `/yo/langues/espagnol/pays/republique-dominicaine` (and its legacy
 * twin under `/yo/voyage/republique-dominicaine` rendered through
 * `RepubliqueDominicaineContent`).
 *
 * Pedagogical scope:
 *   - Local Dominican expressions (dictionary entries) — recordings
 *     where the country accent is part of the lesson.
 *   - The hotel check-in dialogue — Caribbean rhythm and politeness
 *     register matter here.
 *   - Pan-Hispanic vocabulary that ALSO appears in this module
 *     (e.g. "Buenos días", "Mucho gusto") is intentionally NOT
 *     duplicated under a Dominican accent: those items resolve to the
 *     `latin_american_neutral` recordings declared in
 *     `spanishIntroAudio.ts` via the contextual lookup in
 *     `audioManifest.ts → findAudioItemForContext()`.
 *
 * Backward compatibility:
 *   The single Phase 1 entry — `¿Qué lo qué?` — keeps its LEGACY
 *   storage path so the already-uploaded MP3 is not orphaned. Its
 *   `type` stays `"dialogue"` for the same reason (renaming the type
 *   would shift the path segment).
 *   Every other entry in this file uses the accent-aware layout:
 *   `voyage/republique-dominicaine-a1-lesson-01/dominican-republic/...`.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking / Membre
 * Pro logic in this file. Pure data.
 */

import {
  buildLegacyStoragePath,
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("dominican_republic");
const NEUTRAL_ACCENT = getYoAudioAccentProfile("latin_american_neutral");

const MODULE_ID = "voyage";
const LESSON_ID = "republique-dominicaine-a1-lesson-01";

const RD_SPANISH_PRONUNCIATION_HINT =
  "Read in natural Latin American Spanish with a Dominican/Caribbean-friendly accent. Do not use English pronunciation. Spanish words that look like English must be pronounced as Spanish. If a Dominican-specific accent is unavailable, use neutral Latin American Spanish, never English.";
const NEUTRAL_SPANISH_PRONUNCIATION_HINT =
  "Read in natural Latin American Spanish. Do not use English pronunciation. Spanish words that look like English must be pronounced as Spanish.";

// ─────────────────────────────────────────────────────────────────────
// Helpers — keep the data table below compact and consistent.
// ─────────────────────────────────────────────────────────────────────

function dictionaryItem(input: {
  text: string;
  slug: string;
  spokenText?: string;
  pronunciationHint?: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `es-voyage-rd-phrase-${input.slug}`,
    targetLanguage: "es",
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: "phrase",
    text: input.text,
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint ?? RD_SPANISH_PRONUNCIATION_HINT,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: "phrase",
      slug: input.slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    voiceHint: ACCENT.bcp47Hint,
    notes: input.notes ?? "Dictionary expression · Dominican accent matters",
  };
}

/**
 * Helper for pan-Hispanic A1 vocabulary that appears INSIDE the RD
 * module (geography vocab, food vocab, generic phrases, flashcards).
 * Pronunciation is identical across Latin American countries, so we
 * record once with the neutral accent and let
 * `findAudioItemForContext` route the RD module's lookup to it via
 * the standard fallback chain.
 */
function rdNeutralItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase" | "sentence">;
  text: string;
  slug: string;
  spokenText?: string;
  pronunciationHint?: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `es-voyage-rd-${input.type}-${input.slug}`,
    targetLanguage: "es",
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: input.type,
    text: input.text,
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: input.type,
      slug: input.slug,
      accentSegment: NEUTRAL_ACCENT.pathSlug,
    }),
    accentProfile: NEUTRAL_ACCENT.id,
    voiceHint: NEUTRAL_ACCENT.bcp47Hint,
    notes: input.notes ?? "RD module · pan-Hispanic vocabulary (neutral accent)",
  };
}

/**
 * Helper for Dominican-flavoured food / cultural items where the
 * pronunciation IS the lesson (mangú, sancocho, …). Distinct slug
 * namespace from `dictionaryItem` so the dictionary keeps its
 * dedicated bucket prefix.
 */
function dominicanFoodItem(input: {
  text: string;
  slug: string;
  spokenText?: string;
  pronunciationHint?: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `es-voyage-rd-food-${input.slug}`,
    targetLanguage: "es",
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: "word",
    text: input.text,
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint ?? RD_SPANISH_PRONUNCIATION_HINT,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: "word",
      slug: `food-${input.slug}`,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    voiceHint: ACCENT.bcp47Hint,
    notes: input.notes ?? "Dominican food vocabulary · regional pronunciation",
  };
}

function dialogueItem(input: {
  text: string;
  slug: string;
  spokenText?: string;
  pronunciationHint?: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `es-voyage-rd-dialogue-${input.slug}`,
    targetLanguage: "es",
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: "dialogue",
    text: input.text,
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint ?? RD_SPANISH_PRONUNCIATION_HINT,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: "dialogue",
      slug: input.slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    voiceHint: ACCENT.bcp47Hint,
    notes: input.notes ?? "Hotel check-in dialogue line",
    ttsInstructions:
      "Speak in clear Dominican Republic Spanish, dialogue pace — friendly hotel reception register. Slightly slower than dictionary entries so a beginner can follow each turn. Do not exaggerate slang.",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Manifest entries
// ─────────────────────────────────────────────────────────────────────

const queLoQueLegacy: YoAudioItem = {
  // ⚠️ LEGACY PATH PIN — do not change `id`, `type`, or `storagePath`:
  // a Phase 1 MP3 is already uploaded under this exact key.
  id: "es-voyage-dialogue-que-lo-que",
  targetLanguage: "es",
  moduleId: MODULE_ID,
  lessonId: LESSON_ID,
  type: "dialogue",
  text: "¿Qué lo qué?",
  pronunciationHint: RD_SPANISH_PRONUNCIATION_HINT,
  storagePath: buildLegacyStoragePath({
    targetLanguage: "es",
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: "dialogue",
    slug: "que-lo-que",
  }),
  accentProfile: ACCENT.id,
  voiceHint: ACCENT.bcp47Hint,
  notes:
    "Legacy Phase 1 entry — keeps the original storage path for backward compatibility (no accent path segment).",
};

export const spanishVoyageDominicanAudio: readonly YoAudioItem[] = [
  // Phase 1 entry first so dry-run logs flag the legacy layout up top.
  queLoQueLegacy,

  // ── Dominican Republic pocket dictionary (A1-safe) ───────────────
  // Source: `lib/yo/dominicanRepublicA1.ts → dominicanDictionary`.
  // ¿Qué lo qué? lives above as the pinned legacy entry.
  dictionaryItem({ text: "¡Tato!", slug: "tato" }),
  dictionaryItem({ text: "una vaina", slug: "una-vaina" }),
  dictionaryItem({ text: "un chin", slug: "un-chin" }),
  dictionaryItem({ text: "¡Qué chévere!", slug: "que-chevere" }),
  dictionaryItem({ text: "la guagua", slug: "la-guagua" }),
  dictionaryItem({ text: "la ñapa", slug: "la-napa" }),
  dictionaryItem({ text: "chinola", slug: "chinola" }),
  dictionaryItem({ text: "lechosa", slug: "lechosa" }),
  dictionaryItem({ text: "el colmado", slug: "el-colmado" }),
  dictionaryItem({ text: "¡Provecho!", slug: "provecho" }),
  dictionaryItem({ text: "¡Salud!", slug: "salud" }),
  dictionaryItem({ text: "¡Diache!", slug: "diache" }),

  // ── Hotel check-in dialogue (`hotelCheckinDialogue`) ─────────────
  // Slugs encode line order + speaker so a future regeneration can
  // walk the dialogue deterministically. Speaker convention:
  //   `host` = receptionist · `self` = learner.
  dialogueItem({
    text: "¡Buenas tardes! ¿Cómo está?",
    slug: "hotel-l1-host-buenas-tardes",
    notes: "Dialogue line 1 · receptionist · greeting + how are you",
  }),
  dialogueItem({
    text: "Buenas tardes. Muy bien, gracias. ¿Y usted?",
    slug: "hotel-l2-self-muy-bien",
    notes: "Dialogue line 2 · learner · echo greeting + reciprocate",
  }),
  dialogueItem({
    text: "Todo bien. ¿Su nombre, por favor?",
    slug: "hotel-l3-host-su-nombre",
    notes: "Dialogue line 3 · receptionist · ask for name",
  }),
  dialogueItem({
    text: "Me llamo Marc. Soy de Quebec.",
    slug: "hotel-l4-self-me-llamo-marc",
    notes: "Dialogue line 4 · learner · introduce self + origin",
  }),
  dialogueItem({
    text: "Mucho gusto. Bienvenido.",
    slug: "hotel-l5-host-bienvenido",
    notes: "Dialogue line 5 · receptionist · welcome",
  }),
  dialogueItem({
    text: "Mucho gusto. Gracias.",
    slug: "hotel-l6-self-gracias",
    notes: "Dialogue line 6 · learner · thank-you closer",
  }),

  // ── Geography vocabulary (pan-Hispanic A1, neutral accent) ───────
  // Source: dominicanRepublicA1.ts → geographySection.vocabulary
  rdNeutralItem({ type: "word", text: "el país", slug: "el-pais" }),
  rdNeutralItem({ type: "word", text: "la isla", slug: "la-isla" }),
  rdNeutralItem({ type: "word", text: "la playa", slug: "la-playa" }),
  rdNeutralItem({ type: "word", text: "la capital", slug: "la-capital" }),
  rdNeutralItem({ type: "word", text: "la ciudad", slug: "la-ciudad" }),
  rdNeutralItem({
    type: "word",
    text: "el resort",
    slug: "el-resort",
    pronunciationHint: NEUTRAL_SPANISH_PRONUNCIATION_HINT,
  }),
  rdNeutralItem({
    type: "word",
    text: "la vida diaria",
    slug: "la-vida-diaria",
  }),
  rdNeutralItem({ type: "word", text: "Santo Domingo", slug: "santo-domingo" }),

  // ── Geography practical phrases ──────────────────────────────────
  rdNeutralItem({
    type: "phrase",
    text: "Soy de Quebec.",
    slug: "soy-de-quebec",
    notes: "Quebec is read with English 'eh' here on purpose; pedagogically OK",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "Soy de Canadá.",
    slug: "soy-de-canada",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "Quiero conocer el país.",
    slug: "quiero-conocer-el-pais",
  }),

  // ── History vocabulary additions ─────────────────────────────────
  rdNeutralItem({ type: "word", text: "la historia", slug: "la-historia" }),
  rdNeutralItem({
    type: "word",
    text: "la independencia",
    slug: "la-independencia",
  }),
  rdNeutralItem({ type: "word", text: "hoy", slug: "hoy" }),

  // ── Food vocabulary (pan-Hispanic words inside the RD module) ────
  rdNeutralItem({ type: "word", text: "el arroz", slug: "el-arroz" }),
  rdNeutralItem({ type: "word", text: "el pollo", slug: "el-pollo" }),
  rdNeutralItem({ type: "word", text: "el plátano", slug: "el-platano" }),
  rdNeutralItem({ type: "word", text: "el café", slug: "el-cafe" }),
  rdNeutralItem({
    type: "word",
    text: "la cerveza fría",
    slug: "la-cerveza-fria",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "la cuenta, por favor",
    slug: "la-cuenta-por-favor",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "La cuenta, por favor.",
    slug: "la-cuenta-por-favor-sentence",
    notes:
      "Sentence-cased variant — same audio content, distinct slug avoids a path collision with the bullet form above",
  }),

  // ── Food bullet groups (typical plate / drinks / Dominican dishes) ─
  // Pan-Hispanic food terms in neutral accent…
  rdNeutralItem({
    type: "phrase",
    text: "arroz blanco",
    slug: "arroz-blanco",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "habichuelas rojas",
    slug: "habichuelas-rojas",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "pollo o carne",
    slug: "pollo-o-carne",
    notes: "Lesson copy uses 'pollo ou carne' (FR connector); spoken form keeps the Spanish 'o'",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "plátano frito",
    slug: "platano-frito",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "café dominicano",
    slug: "cafe-dominicano",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "jugo de chinola",
    slug: "jugo-de-chinola",
  }),
  rdNeutralItem({
    type: "phrase",
    text: "cerveza fría",
    slug: "cerveza-fria-bullet",
    notes: "Bullet-list variant of la cerveza fría",
  }),
  // …Dominican signature dishes in regional accent.
  dominicanFoodItem({ text: "mangú", slug: "mangu" }),
  dominicanFoodItem({ text: "sancocho", slug: "sancocho" }),
  dominicanFoodItem({ text: "tres golpes", slug: "tres-golpes" }),

  // ── First-phrases bullet groups ──────────────────────────────────
  // Phrases new to the RD module that are not in the intro module.
  rdNeutralItem({
    type: "phrase",
    text: "¿Cómo está?",
    slug: "como-esta-formal",
    notes: "Formal counterpart of ¿Cómo estás?",
  }),
  rdNeutralItem({ type: "phrase", text: "Bien, gracias", slug: "bien-gracias" }),
  rdNeutralItem({ type: "phrase", text: "Todo bien", slug: "todo-bien" }),
  rdNeutralItem({ type: "phrase", text: "Soy de Quebec", slug: "soy-de-quebec-no-period" }),
  rdNeutralItem({ type: "phrase", text: "Soy de Canadá", slug: "soy-de-canada-no-period" }),
  rdNeutralItem({ type: "phrase", text: "Hasta mañana", slug: "hasta-manana" }),
  rdNeutralItem({
    type: "phrase",
    text: "Hasta la próxima",
    slug: "hasta-la-proxima",
  }),
  rdNeutralItem({ type: "phrase", text: "Nos vemos", slug: "nos-vemos" }),

  // ── Flashcard-only sentences ─────────────────────────────────────
  rdNeutralItem({
    type: "phrase",
    text: "Quiero practicar la conversación.",
    slug: "quiero-practicar-la-conversacion",
  }),
] as const;
