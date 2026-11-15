/**
 * Curated entrance sequence: shared practice-family vocabulary, then brand lines.
 * One item visible at a time; durations are ms for opacity-held display.
 */
export type PraktikosCue =
  | { kind: "word"; text: string; language: string; lang: string; holdMs: number }
  | { kind: "line"; text: string; holdMs: number };

/** Rotating vocabulary subset — not every cognate each loop. */
export const PRAKTIKOS_WORD_POOL: ReadonlyArray<{ text: string; language: string; lang: string }> = [
  { text: "Pratiquer", language: "Français", lang: "fr" },
  { text: "Practice", language: "English", lang: "en" },
  { text: "Practicar", language: "Español", lang: "es" },
  { text: "Praticare", language: "Italiano", lang: "it" },
  { text: "Praticar", language: "Português", lang: "pt" },
  { text: "Praktizieren", language: "Deutsch", lang: "de" },
  { text: "Praktykować", language: "Polski", lang: "pl" },
  { text: "Практикувати", language: "Українська", lang: "uk" },
  { text: "Практиковать", language: "Русский", lang: "ru" },
  { text: "Praktisera", language: "Svenska", lang: "sv" },
  { text: "Praktikoj", language: "Shqip", lang: "sq" },
  { text: "Praktikuoti", language: "Lietuvių", lang: "lt" },
  { text: "Practica", language: "Română", lang: "ro" },
  { text: "Practicar", language: "Català", lang: "ca" },
  { text: "Praktiseren", language: "Nederlands", lang: "nl" },
  { text: "Praktisere", language: "Norsk", lang: "nb" },
  { text: "Praktisere", language: "Dansk", lang: "da" },
  { text: "Praktizēt", language: "Latviešu", lang: "lv" },
];

export const PRAKTIKOS_BRAND_LINES: ReadonlyArray<{ text: string; holdMs: number }> = [
  { text: "Une racine. Mille langues.", holdMs: 3500 },
  { text: "Le plaisir de pratiquer.", holdMs: 3200 },
  { text: "Pas besoin de parler parfaitement.", holdMs: 3800 },
  { text: "Viens pratiquer.", holdMs: 3200 },
];

const WORD_HOLD_MS = 1500;
export const PRAKTIKOS_WORDS_PER_LOOP = 6;

/** Deterministic curated slice so layout tests stay stable across mounts. */
export function buildPraktikosLoop(seed = 0): PraktikosCue[] {
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const start = ((safeSeed % PRAKTIKOS_WORD_POOL.length) + PRAKTIKOS_WORD_POOL.length) % PRAKTIKOS_WORD_POOL.length;
  const words: PraktikosCue[] = [];
  for (let i = 0; i < PRAKTIKOS_WORDS_PER_LOOP; i++) {
    const item = PRAKTIKOS_WORD_POOL[(start + i) % PRAKTIKOS_WORD_POOL.length]!;
    words.push({ kind: "word", text: item.text, language: item.language, lang: item.lang, holdMs: WORD_HOLD_MS });
  }
  return [...words, ...PRAKTIKOS_BRAND_LINES.map((line) => ({ kind: "line" as const, text: line.text, holdMs: line.holdMs }))];
}

export const PRAKTIKOS_STATIC_LINE = "Viens pratiquer.";
