/**
 * Subject buckets for the Pratiqo "Quoi / What / Qué" search field.
 *
 * Each bucket is a *learning subject* the student can search for (an
 * instrument, a language, a school subject, an art/skill). Buckets are
 * grouped into four categories so the autocomplete can show short, scannable
 * results sectioned by category.
 *
 * Strict scope: this file holds *only* subject metadata — labels, aliases,
 * canonical IDs, optional emojis. It does NOT carry pricing, payment logic,
 * Stripe IDs, RLS policy, or legal copy.
 *
 * Aliases are critical for UX: typing "spagnol" or "mathematiques" or
 * "homework" should surface the right bucket regardless of locale or
 * accents. The search helper below is accent/case-insensitive and matches
 * any alias for any locale, so a student writing in English can still find
 * a French-named subject.
 */

export type SubjectCategoryId = "music" | "languages" | "academic" | "arts_skills";

export type SubjectBucket = {
  /** Stable ID — safe for analytics, URL params, persistence. */
  canonicalId: string;
  /** Top-level grouping used to section the dropdown. */
  category: SubjectCategoryId;
  /** Optional emoji rendered before the label in the dropdown. */
  emoji?: string;
  /** Display labels per locale. The user-facing label in the active locale wins. */
  labels: { fr: string; en: string; es: string };
  /**
   * Alternate spellings/synonyms used when matching the user's query.
   * Always include the diacritic-stripped form here for accent-insensitive
   * matching ("espagnol" for "espagnol", "mathematiques" for "mathématiques").
   */
  aliases: { fr?: string[]; en?: string[]; es?: string[] };
};

export const SUBJECT_CATEGORY_LABELS: Record<
  SubjectCategoryId,
  { fr: string; en: string; es: string }
> = {
  music: { fr: "Musique", en: "Music", es: "Música" },
  languages: { fr: "Langues", en: "Languages", es: "Idiomas" },
  academic: { fr: "Tuteurs académiques", en: "Academic tutors", es: "Tutores académicos" },
  arts_skills: { fr: "Arts et compétences", en: "Arts & skills", es: "Artes y habilidades" },
};

/**
 * Strip diacritics + lower-case so a user typing "matematiques" matches
 * "mathématiques", "espagnol" matches "español", "francais" matches
 * "français", etc.
 */
export function normalizeSubjectQuery(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Strict separation: each bucket lists every locale label + alias used for matching. */
export const SUBJECT_BUCKETS: SubjectBucket[] = [
  // ── Music ──────────────────────────────────────────────────────────────
  {
    canonicalId: "piano",
    category: "music",
    emoji: "🎹",
    labels: { fr: "Piano", en: "Piano", es: "Piano" },
    aliases: { fr: ["clavier"], en: ["keyboard"], es: ["teclado"] },
  },
  {
    canonicalId: "guitar",
    category: "music",
    emoji: "🎸",
    labels: { fr: "Guitare", en: "Guitar", es: "Guitarra" },
    aliases: {
      fr: ["guitare classique", "guitare électrique", "guitare acoustique"],
      en: ["acoustic guitar", "electric guitar"],
      es: ["guitarra clásica", "guitarra eléctrica"],
    },
  },
  {
    canonicalId: "singing",
    category: "music",
    emoji: "🎤",
    labels: { fr: "Chant", en: "Singing", es: "Canto" },
    aliases: { fr: ["voix", "vocal"], en: ["voice", "vocal lessons"], es: ["voz"] },
  },
  {
    canonicalId: "violin",
    category: "music",
    emoji: "🎻",
    labels: { fr: "Violon", en: "Violin", es: "Violín" },
    aliases: { fr: [], en: [], es: ["violin"] },
  },
  {
    canonicalId: "drums",
    category: "music",
    emoji: "🥁",
    labels: { fr: "Batterie", en: "Drums", es: "Batería" },
    aliases: { fr: ["percussion"], en: ["drumming", "percussion"], es: ["percusión", "bateria"] },
  },
  {
    canonicalId: "music_general",
    category: "music",
    emoji: "🎵",
    labels: { fr: "Musique", en: "Music", es: "Música" },
    aliases: { fr: [], en: [], es: ["musica"] },
  },
  {
    canonicalId: "music_theory",
    category: "music",
    emoji: "🎼",
    labels: { fr: "Solfège", en: "Music theory", es: "Teoría musical" },
    aliases: {
      fr: ["theorie musicale"],
      en: ["theory", "sight reading"],
      es: ["teoria musical", "solfeo"],
    },
  },

  // ── Languages ─────────────────────────────────────────────────────────
  {
    canonicalId: "spanish",
    category: "languages",
    emoji: "🇪🇸",
    labels: { fr: "Espagnol", en: "Spanish", es: "Español" },
    aliases: { fr: [], en: [], es: ["espanol", "castellano"] },
  },
  {
    canonicalId: "english",
    category: "languages",
    emoji: "🇨🇦",
    labels: { fr: "Anglais", en: "English", es: "Inglés" },
    aliases: { fr: [], en: ["esl"], es: ["ingles"] },
  },
  {
    canonicalId: "french",
    category: "languages",
    emoji: "🇫🇷",
    labels: { fr: "Français", en: "French", es: "Francés" },
    aliases: { fr: ["francais", "fle"], en: ["french as second language"], es: ["frances"] },
  },
  {
    canonicalId: "japanese",
    category: "languages",
    emoji: "🇯🇵",
    labels: { fr: "Japonais", en: "Japanese", es: "Japonés" },
    aliases: { fr: [], en: ["nihongo"], es: ["japones"] },
  },
  {
    canonicalId: "german",
    category: "languages",
    emoji: "🇩🇪",
    labels: { fr: "Allemand", en: "German", es: "Alemán" },
    aliases: { fr: [], en: ["deutsch"], es: ["aleman"] },
  },
  {
    canonicalId: "portuguese",
    category: "languages",
    emoji: "🇵🇹",
    labels: { fr: "Portugais", en: "Portuguese", es: "Portugués" },
    aliases: { fr: [], en: ["brazilian portuguese"], es: ["portugues"] },
  },
  {
    canonicalId: "italian",
    category: "languages",
    emoji: "🇮🇹",
    labels: { fr: "Italien", en: "Italian", es: "Italiano" },
    aliases: {},
  },
  {
    canonicalId: "languages_general",
    category: "languages",
    emoji: "🌍",
    labels: { fr: "Langues", en: "Languages", es: "Idiomas" },
    aliases: { fr: ["apprentissage des langues"], en: ["language learning"], es: ["aprender idiomas"] },
  },

  // ── Academic ──────────────────────────────────────────────────────────
  {
    canonicalId: "math",
    category: "academic",
    emoji: "➗",
    labels: { fr: "Mathématiques", en: "Math", es: "Matemáticas" },
    aliases: {
      fr: ["maths", "mathematiques", "math"],
      en: ["mathematics", "maths", "algebra", "calculus", "geometry"],
      es: ["matematicas", "calculo", "algebra"],
    },
  },
  {
    canonicalId: "science_general",
    category: "academic",
    emoji: "🔬",
    labels: { fr: "Sciences", en: "Science", es: "Ciencias" },
    aliases: { fr: [], en: ["sciences"], es: ["ciencia"] },
  },
  {
    canonicalId: "physics",
    category: "academic",
    emoji: "⚛️",
    labels: { fr: "Physique", en: "Physics", es: "Física" },
    aliases: { fr: [], en: [], es: ["fisica"] },
  },
  {
    canonicalId: "chemistry",
    category: "academic",
    emoji: "🧪",
    labels: { fr: "Chimie", en: "Chemistry", es: "Química" },
    aliases: { fr: [], en: [], es: ["quimica"] },
  },
  {
    canonicalId: "biology",
    category: "academic",
    emoji: "🧬",
    labels: { fr: "Biologie", en: "Biology", es: "Biología" },
    aliases: { fr: [], en: ["bio"], es: ["biologia"] },
  },
  {
    canonicalId: "french_tutoring",
    category: "academic",
    emoji: "📘",
    labels: { fr: "Français scolaire", en: "French tutoring", es: "Francés académico" },
    aliases: {
      fr: ["francais scolaire", "rattrapage francais"],
      en: ["french tutor", "french help"],
      es: ["frances academico", "tutoria de frances"],
    },
  },
  {
    canonicalId: "english_tutoring",
    category: "academic",
    emoji: "📗",
    labels: { fr: "Anglais scolaire", en: "English tutoring", es: "Inglés académico" },
    aliases: {
      fr: ["anglais scolaire", "rattrapage anglais"],
      en: ["english tutor", "english help"],
      es: ["ingles academico", "tutoria de ingles"],
    },
  },
  {
    canonicalId: "homework_help",
    category: "academic",
    emoji: "📚",
    labels: { fr: "Aide aux devoirs", en: "Homework help", es: "Ayuda con tareas" },
    aliases: {
      fr: ["devoirs", "aide devoirs"],
      en: ["homework", "after school help", "tutoring"],
      es: ["tareas", "deberes"],
    },
  },

  // ── Arts & skills ─────────────────────────────────────────────────────
  {
    canonicalId: "drawing",
    category: "arts_skills",
    emoji: "✏️",
    labels: { fr: "Dessin", en: "Drawing", es: "Dibujo" },
    aliases: { fr: [], en: ["sketching"], es: [] },
  },
  {
    canonicalId: "photography",
    category: "arts_skills",
    emoji: "📷",
    labels: { fr: "Photographie", en: "Photography", es: "Fotografía" },
    aliases: { fr: ["photo"], en: ["photo"], es: ["fotografia", "foto"] },
  },
  {
    canonicalId: "cooking",
    category: "arts_skills",
    emoji: "🍳",
    labels: { fr: "Cuisine", en: "Cooking", es: "Cocina" },
    aliases: { fr: [], en: ["culinary"], es: [] },
  },
  {
    canonicalId: "coding",
    category: "arts_skills",
    emoji: "💻",
    labels: { fr: "Programmation", en: "Coding", es: "Programación" },
    aliases: {
      fr: ["informatique", "code", "developpement"],
      en: ["programming", "software development"],
      es: ["programacion", "desarrollo de software"],
    },
  },
  {
    canonicalId: "computer_skills",
    category: "arts_skills",
    emoji: "🖥️",
    labels: { fr: "Informatique", en: "Computer skills", es: "Informática" },
    aliases: { fr: [], en: ["computer", "office", "digital skills"], es: ["informatica", "computacion"] },
  },
];

/** Internal: searchable haystack joining every label + alias for a bucket. */
function bucketHaystack(bucket: SubjectBucket): string {
  const parts: string[] = [
    bucket.labels.fr,
    bucket.labels.en,
    bucket.labels.es,
    ...(bucket.aliases.fr ?? []),
    ...(bucket.aliases.en ?? []),
    ...(bucket.aliases.es ?? []),
  ];
  return parts.map(normalizeSubjectQuery).join(" | ");
}

/** Pre-compute haystacks once at module load so search is fast on every keystroke. */
const SUBJECT_INDEX = SUBJECT_BUCKETS.map((bucket) => ({
  bucket,
  haystack: bucketHaystack(bucket),
}));

export type LocalizedSubjectMatch = {
  bucket: SubjectBucket;
  /** Pre-localized label in the active UI locale, ready to render. */
  displayLabel: string;
  /** Score used by the dropdown sort. Higher = better. */
  score: number;
};

/**
 * Search the subject buckets dataset.
 *
 * Returns up to `limit` matches sorted by relevance. Matching is
 * accent/case-insensitive and tries (in order):
 *  1. Prefix match on the active-locale label.
 *  2. Word-start match on any label/alias.
 *  3. Substring match on any label/alias.
 *
 * If you pass `categoryWhitelist`, only those categories are returned —
 * useful when the surrounding chips already restrict to e.g. "Music".
 *
 * NB pure & sync: no fetches, no side effects.
 */
export function searchSubjectBuckets(
  query: string,
  options: {
    locale: "fr" | "en" | "es";
    limit?: number;
    categoryWhitelist?: SubjectCategoryId[];
  },
): LocalizedSubjectMatch[] {
  const limit = options.limit ?? 8;
  const needle = normalizeSubjectQuery(query);
  if (needle.length < 1) return [];

  const categoryFilter = options.categoryWhitelist
    ? new Set(options.categoryWhitelist)
    : null;

  const matches: LocalizedSubjectMatch[] = [];

  for (const { bucket, haystack } of SUBJECT_INDEX) {
    if (categoryFilter && !categoryFilter.has(bucket.category)) continue;
    if (!haystack.includes(needle)) continue;

    const localizedLabel = bucket.labels[options.locale];
    const labelNormalized = normalizeSubjectQuery(localizedLabel);

    let score = 0;
    if (labelNormalized.startsWith(needle)) score += 100;
    else if (labelNormalized.includes(` ${needle}`)) score += 60;
    else if (labelNormalized.includes(needle)) score += 40;
    else score += 20;

    matches.push({
      bucket,
      displayLabel: localizedLabel,
      score,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

/**
 * Group matches by their category, in the canonical category order. Useful for
 * rendering sectioned dropdowns.
 */
export function groupSubjectMatchesByCategory(
  matches: LocalizedSubjectMatch[],
): Array<{ category: SubjectCategoryId; items: LocalizedSubjectMatch[] }> {
  const order: SubjectCategoryId[] = ["music", "languages", "academic", "arts_skills"];
  const buckets = new Map<SubjectCategoryId, LocalizedSubjectMatch[]>();
  for (const match of matches) {
    const list = buckets.get(match.bucket.category) ?? [];
    list.push(match);
    buckets.set(match.bucket.category, list);
  }
  return order
    .map((category) => ({ category, items: buckets.get(category) ?? [] }))
    .filter((section) => section.items.length > 0);
}
