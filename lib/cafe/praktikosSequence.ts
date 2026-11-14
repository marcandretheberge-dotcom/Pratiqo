/**
 * Curated entrance sequence: shared practice-family vocabulary, then brand lines.
 * One item visible at a time; durations are ms for opacity-held display.
 */
export type PraktikosCue =
  | { kind: "word"; text: string; language: string; holdMs: number }
  | { kind: "line"; text: string; holdMs: number };

/** Rotating vocabulary subset — not every cognate each loop. */
const WORD_POOL: ReadonlyArray<{ text: string; language: string }> = [
  { text: "Pratiquer", language: "Français" },
  { text: "Practice", language: "English" },
  { text: "Practicar", language: "Español" },
  { text: "Praticare", language: "Italiano" },
  { text: "Praticar", language: "Português" },
  { text: "Praktizieren", language: "Deutsch" },
  { text: "Praktykować", language: "Polski" },
  { text: "Практикувати", language: "Українська" },
  { text: "Практиковать", language: "Русский" },
  { text: "Praktisera", language: "Svenska" },
  { text: "Praktikoj", language: "Esperanto" },
  { text: "Praktikuoti", language: "Lietuvių" },
  { text: "Practica", language: "Română" },
  { text: "Practicar", language: "Català" },
  { text: "Praktiseren", language: "Nederlands" },
  { text: "Øve", language: "Norsk" },
];

const BRAND_LINES: ReadonlyArray<{ text: string; holdMs: number }> = [
  { text: "Une racine. Mille langues.", holdMs: 3500 },
  { text: "Le plaisir de pratiquer.", holdMs: 3200 },
  { text: "Pas besoin de parler parfaitement.", holdMs: 3800 },
  { text: "Viens pratiquer.", holdMs: 3200 },
];

const WORD_HOLD_MS = 1500;
const WORDS_PER_LOOP = 6;

/** Deterministic curated slice so layout tests stay stable across mounts. */
export function buildPraktikosLoop(seed = 0): PraktikosCue[] {
  const start = ((seed % WORD_POOL.length) + WORD_POOL.length) % WORD_POOL.length;
  const words: PraktikosCue[] = [];
  for (let i = 0; i < WORDS_PER_LOOP; i++) {
    const item = WORD_POOL[(start + i) % WORD_POOL.length]!;
    words.push({ kind: "word", text: item.text, language: item.language, holdMs: WORD_HOLD_MS });
  }
  return [...words, ...BRAND_LINES.map((line) => ({ kind: "line" as const, text: line.text, holdMs: line.holdMs }))];
}

export const PRAKTIKOS_STATIC_LINE = "Viens pratiquer.";
