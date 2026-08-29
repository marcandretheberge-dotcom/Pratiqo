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
    canonicalId: "ukulele",
    category: "music",
    emoji: "🪕",
    labels: { fr: "Ukulélé", en: "Ukulele", es: "Ukelele" },
    aliases: { fr: ["ukulele"], en: ["uke"], es: ["ukulele"] },
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
    canonicalId: "cello",
    category: "music",
    emoji: "🎻",
    labels: { fr: "Violoncelle", en: "Cello", es: "Violonchelo" },
    aliases: { fr: [], en: [], es: ["cello", "violoncelo"] },
  },
  {
    canonicalId: "drums",
    category: "music",
    emoji: "🥁",
    labels: { fr: "Batterie", en: "Drums", es: "Batería" },
    aliases: { fr: ["percussion"], en: ["drumming", "percussion"], es: ["percusión", "bateria"] },
  },
  {
    canonicalId: "bass",
    category: "music",
    emoji: "🎸",
    labels: { fr: "Basse", en: "Bass", es: "Bajo" },
    aliases: {
      fr: ["basse électrique", "guitare basse", "contrebasse"],
      en: ["bass guitar", "electric bass", "double bass"],
      es: ["bajo eléctrico", "contrabajo"],
    },
  },
  {
    canonicalId: "saxophone",
    category: "music",
    emoji: "🎷",
    labels: { fr: "Saxophone", en: "Saxophone", es: "Saxofón" },
    aliases: { fr: ["sax"], en: ["sax"], es: ["saxofon", "sax"] },
  },
  {
    canonicalId: "flute",
    category: "music",
    emoji: "🎶",
    labels: { fr: "Flûte", en: "Flute", es: "Flauta" },
    aliases: {
      fr: ["flute", "flûte traversière", "flute traversiere", "flûte à bec", "flute a bec"],
      en: ["transverse flute", "recorder"],
      es: ["flauta travesera", "flauta dulce"],
    },
  },
  {
    canonicalId: "clarinet",
    category: "music",
    emoji: "🎶",
    labels: { fr: "Clarinette", en: "Clarinet", es: "Clarinete" },
    aliases: {},
  },
  {
    canonicalId: "accordion",
    category: "music",
    emoji: "🪗",
    labels: { fr: "Accordéon", en: "Accordion", es: "Acordeón" },
    aliases: { fr: ["accordeon"], en: [], es: ["acordeon"] },
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
      fr: ["solfege", "theorie musicale", "théorie musicale"],
      en: ["theory", "sight reading"],
      es: ["teoria musical", "solfeo"],
    },
  },
  {
    canonicalId: "composition",
    category: "music",
    emoji: "✒️",
    labels: { fr: "Composition", en: "Composition", es: "Composición" },
    aliases: {
      fr: ["composition musicale", "écriture musicale", "ecriture musicale"],
      en: ["songwriting", "music composition"],
      es: ["composicion", "composicion musical"],
    },
  },
  {
    canonicalId: "music_production",
    category: "music",
    emoji: "🎚️",
    labels: { fr: "Production musicale", en: "Music production", es: "Producción musical" },
    aliases: {
      fr: ["beatmaking", "mao", "musique assistée par ordinateur"],
      en: ["beat making", "audio production", "daw"],
      es: ["produccion musical", "produccion de audio"],
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
    canonicalId: "francisation",
    category: "languages",
    emoji: "🇨🇦",
    labels: {
      fr: "Francisation",
      en: "French integration (Francisation)",
      es: "Francización",
    },
    aliases: {
      fr: ["francais immigration", "francais quebec", "francais qc"],
      en: ["francization", "quebec french integration", "francisation"],
      es: ["francisacion", "francisation"],
    },
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
    // "Chinois" and "Mandarin" share one bucket: in 99% of student searches
    // they refer to Standard Chinese / Mandarin. Aliasing them avoids a
    // misleading split in the dropdown.
    canonicalId: "chinese_mandarin",
    category: "languages",
    emoji: "🇨🇳",
    labels: { fr: "Chinois (mandarin)", en: "Chinese (Mandarin)", es: "Chino (mandarín)" },
    aliases: {
      fr: ["chinois", "mandarin", "chinois mandarin"],
      en: ["chinese", "mandarin", "mandarin chinese", "putonghua"],
      es: ["chino", "mandarin", "chino mandarin"],
    },
  },
  {
    canonicalId: "korean",
    category: "languages",
    emoji: "🇰🇷",
    labels: { fr: "Coréen", en: "Korean", es: "Coreano" },
    aliases: { fr: ["coreen"], en: ["hangul"], es: ["coreano"] },
  },
  {
    canonicalId: "arabic",
    category: "languages",
    emoji: "🇸🇦",
    labels: { fr: "Arabe", en: "Arabic", es: "Árabe" },
    aliases: {
      fr: ["arabe classique", "arabe littéraire", "arabe litteraire"],
      en: ["modern standard arabic", "msa"],
      es: ["arabe"],
    },
  },
  {
    canonicalId: "russian",
    category: "languages",
    emoji: "🇷🇺",
    labels: { fr: "Russe", en: "Russian", es: "Ruso" },
    aliases: {},
  },
  {
    canonicalId: "dutch",
    category: "languages",
    emoji: "🇳🇱",
    labels: { fr: "Néerlandais", en: "Dutch", es: "Neerlandés" },
    aliases: {
      fr: ["neerlandais", "hollandais"],
      en: ["nederlands", "flemish"],
      es: ["neerlandes", "holandés", "holandes"],
    },
  },
  {
    canonicalId: "greek",
    category: "languages",
    emoji: "🇬🇷",
    labels: { fr: "Grec", en: "Greek", es: "Griego" },
    aliases: { fr: ["grec moderne"], en: ["modern greek"], es: [] },
  },
  {
    canonicalId: "latin",
    category: "languages",
    emoji: "🏛️",
    labels: { fr: "Latin", en: "Latin", es: "Latín" },
    aliases: { fr: [], en: [], es: ["latin"] },
  },
  {
    canonicalId: "hindi",
    category: "languages",
    emoji: "🇮🇳",
    labels: { fr: "Hindi", en: "Hindi", es: "Hindi" },
    aliases: {},
  },
  {
    canonicalId: "turkish",
    category: "languages",
    emoji: "🇹🇷",
    labels: { fr: "Turc", en: "Turkish", es: "Turco" },
    aliases: {},
  },
  {
    canonicalId: "polish",
    category: "languages",
    emoji: "🇵🇱",
    labels: { fr: "Polonais", en: "Polish", es: "Polaco" },
    aliases: {},
  },
  {
    canonicalId: "ukrainian",
    category: "languages",
    emoji: "🇺🇦",
    labels: { fr: "Ukrainien", en: "Ukrainian", es: "Ucraniano" },
    aliases: {},
  },
  {
    canonicalId: "swedish",
    category: "languages",
    emoji: "🇸🇪",
    labels: { fr: "Suédois", en: "Swedish", es: "Sueco" },
    aliases: { fr: ["suedois"], en: ["svenska"], es: [] },
  },
  {
    canonicalId: "norwegian",
    category: "languages",
    emoji: "🇳🇴",
    labels: { fr: "Norvégien", en: "Norwegian", es: "Noruego" },
    aliases: { fr: ["norvegien"], en: ["norsk"], es: [] },
  },
  {
    canonicalId: "danish",
    category: "languages",
    emoji: "🇩🇰",
    labels: { fr: "Danois", en: "Danish", es: "Danés" },
    aliases: { fr: [], en: ["dansk"], es: ["danes"] },
  },
  {
    canonicalId: "finnish",
    category: "languages",
    emoji: "🇫🇮",
    labels: { fr: "Finnois", en: "Finnish", es: "Finés" },
    aliases: { fr: ["finlandais"], en: ["suomi"], es: ["fines", "finlandes"] },
  },
  {
    canonicalId: "hebrew",
    category: "languages",
    emoji: "🇮🇱",
    labels: { fr: "Hébreu", en: "Hebrew", es: "Hebreo" },
    aliases: { fr: ["hebreu", "hébreu moderne"], en: ["ivrit", "modern hebrew"], es: [] },
  },
  {
    canonicalId: "vietnamese",
    category: "languages",
    emoji: "🇻🇳",
    labels: { fr: "Vietnamien", en: "Vietnamese", es: "Vietnamita" },
    aliases: { fr: [], en: ["tieng viet"], es: [] },
  },
  {
    canonicalId: "thai",
    category: "languages",
    emoji: "🇹🇭",
    labels: { fr: "Thaï", en: "Thai", es: "Tailandés" },
    aliases: { fr: ["thai"], en: [], es: ["tailandes"] },
  },
  {
    canonicalId: "indonesian",
    category: "languages",
    emoji: "🇮🇩",
    labels: { fr: "Indonésien", en: "Indonesian", es: "Indonesio" },
    aliases: { fr: ["indonesien"], en: ["bahasa indonesia"], es: [] },
  },
  {
    canonicalId: "persian",
    category: "languages",
    emoji: "🇮🇷",
    labels: { fr: "Persan", en: "Persian", es: "Persa" },
    aliases: { fr: ["farsi"], en: ["farsi"], es: ["farsi"] },
  },
  {
    canonicalId: "haitian_creole",
    category: "languages",
    emoji: "🇭🇹",
    labels: { fr: "Créole haïtien", en: "Haitian Creole", es: "Criollo haitiano" },
    aliases: {
      fr: ["creole haitien", "kreyòl ayisyen", "kreyol ayisyen", "créole", "creole"],
      en: ["kreyol", "kreyòl"],
      es: ["creole haitiano"],
    },
  },
  {
    // LSQ is the Quebec sign language; ASL is American Sign Language.
    // Bundle both into one bucket so a search for "signes" / "sign" surfaces it,
    // while preserving "LSQ" as the canonical Quebec alias.
    canonicalId: "sign_language_quebec",
    category: "languages",
    emoji: "🤟",
    labels: {
      fr: "Langue des signes québécoise (LSQ)",
      en: "Quebec Sign Language (LSQ)",
      es: "Lengua de señas quebequense (LSQ)",
    },
    aliases: {
      fr: [
        "lsq",
        "langue des signes",
        "langue signes",
        "langue des signes quebecoise",
        "langue des signes québécoise",
      ],
      en: ["lsq", "sign language", "quebec sign language"],
      es: ["lsq", "lengua de signos", "lengua de senas", "lenguaje de signos"],
    },
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
      en: ["mathematics", "maths"],
      es: ["matematicas"],
    },
  },
  {
    canonicalId: "algebra",
    category: "academic",
    emoji: "🧮",
    labels: { fr: "Algèbre", en: "Algebra", es: "Álgebra" },
    aliases: { fr: ["algebre"], en: [], es: ["algebra"] },
  },
  {
    canonicalId: "geometry",
    category: "academic",
    emoji: "📐",
    labels: { fr: "Géométrie", en: "Geometry", es: "Geometría" },
    aliases: { fr: ["geometrie"], en: [], es: ["geometria"] },
  },
  {
    canonicalId: "calculus_differential",
    category: "academic",
    emoji: "📈",
    labels: {
      fr: "Calcul différentiel",
      en: "Differential calculus",
      es: "Cálculo diferencial",
    },
    aliases: {
      fr: ["calcul differentiel", "calcul 1", "calcul i"],
      en: ["calculus i", "calculus 1", "derivatives"],
      es: ["calculo diferencial"],
    },
  },
  {
    canonicalId: "calculus_integral",
    category: "academic",
    emoji: "📉",
    labels: {
      fr: "Calcul intégral",
      en: "Integral calculus",
      es: "Cálculo integral",
    },
    aliases: {
      fr: ["calcul integral", "calcul 2", "calcul ii", "integrales", "intégrales"],
      en: ["calculus ii", "calculus 2", "integrals"],
      es: ["calculo integral", "integrales"],
    },
  },
  {
    canonicalId: "statistics",
    category: "academic",
    emoji: "📊",
    labels: { fr: "Statistiques", en: "Statistics", es: "Estadística" },
    aliases: {
      fr: ["stats", "statistique"],
      en: ["stats", "probability and statistics"],
      es: ["estadistica", "estadisticas"],
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
    canonicalId: "history",
    category: "academic",
    emoji: "📜",
    labels: { fr: "Histoire", en: "History", es: "Historia" },
    aliases: {},
  },
  {
    canonicalId: "geography",
    category: "academic",
    emoji: "🗺️",
    labels: { fr: "Géographie", en: "Geography", es: "Geografía" },
    aliases: { fr: ["geographie", "geo"], en: ["geo"], es: ["geografia", "geo"] },
  },
  {
    canonicalId: "economics",
    category: "academic",
    emoji: "💹",
    labels: { fr: "Économie", en: "Economics", es: "Economía" },
    aliases: { fr: ["economie"], en: ["econ"], es: ["economia", "econ"] },
  },
  {
    canonicalId: "philosophy",
    category: "academic",
    emoji: "🧠",
    labels: { fr: "Philosophie", en: "Philosophy", es: "Filosofía" },
    aliases: { fr: ["philo"], en: ["philo"], es: ["filosofia", "filo"] },
  },
  {
    canonicalId: "coding",
    category: "academic",
    emoji: "💻",
    labels: { fr: "Programmation", en: "Coding", es: "Programación" },
    aliases: {
      fr: ["informatique", "code", "developpement", "developpement web"],
      en: ["programming", "software development"],
      es: ["programacion", "desarrollo de software"],
    },
  },
  {
    canonicalId: "computer_skills",
    category: "academic",
    emoji: "🖥️",
    labels: { fr: "Informatique", en: "Computer skills", es: "Informática" },
    aliases: { fr: ["excel", "tableur"], en: ["computer", "office", "digital skills", "excel"], es: ["informatica", "computacion", "excel"] },
  },
  {
    canonicalId: "reading",
    category: "academic",
    emoji: "📖",
    labels: { fr: "Lecture", en: "Reading", es: "Lectura" },
    aliases: {
      fr: ["compréhension de lecture", "comprehension de lecture"],
      en: ["reading comprehension", "literacy"],
      es: ["comprension lectora"],
    },
  },
  {
    canonicalId: "writing",
    category: "academic",
    emoji: "✍️",
    labels: { fr: "Écriture", en: "Writing", es: "Escritura" },
    aliases: {
      fr: ["ecriture", "rédaction", "redaction"],
      en: ["composition", "essay writing"],
      es: ["redaccion"],
    },
  },
  {
    canonicalId: "exam_prep",
    category: "academic",
    emoji: "📝",
    labels: {
      fr: "Préparation aux examens",
      en: "Exam preparation",
      es: "Preparación de exámenes",
    },
    aliases: {
      fr: ["preparation aux examens", "préparation examens", "preparation examens", "prep examens"],
      en: ["test prep", "exam prep", "sat prep", "act prep"],
      es: ["preparacion de examenes", "prep examenes"],
    },
  },
  {
    canonicalId: "study_methodology",
    category: "academic",
    emoji: "🗂️",
    labels: { fr: "Méthodologie", en: "Study methodology", es: "Metodología de estudio" },
    aliases: {
      fr: ["methodologie", "méthodes de travail", "methodes de travail", "organisation"],
      en: ["study skills", "study methods", "organization"],
      es: ["metodologia", "tecnicas de estudio"],
    },
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
  {
    canonicalId: "orthopedagogue",
    category: "academic",
    emoji: "🧩",
    labels: { fr: "Orthopédagogue", en: "Orthopedagogue", es: "Psicopedagogo/a" },
    aliases: {
      fr: ["orthopedagogue", "ortho pedagogue"],
      en: ["orthopedagogue", "special education teacher"],
      es: ["psicopedagogo", "psicopedagoga"],
    },
  },
  {
    canonicalId: "orthopedagogie",
    category: "academic",
    emoji: "🧩",
    labels: { fr: "Orthopédagogie", en: "Orthopedagogy", es: "Psicopedagogía" },
    aliases: {
      fr: ["orthopedagogie"],
      en: ["orthopedagogy"],
      es: ["psicopedagogia"],
    },
  },
  {
    canonicalId: "academic_support",
    category: "academic",
    emoji: "📘",
    labels: { fr: "Soutien scolaire", en: "Academic support", es: "Apoyo escolar" },
    aliases: {
      fr: ["soutien scolaire primaire", "aide scolaire"],
      en: ["academic support", "school support"],
      es: ["apoyo escolar", "refuerzo escolar"],
    },
  },
  {
    canonicalId: "reading_writing",
    category: "academic",
    emoji: "✍️",
    labels: { fr: "Lecture et écriture", en: "Reading and writing", es: "Lectura y escritura" },
    aliases: {
      fr: ["lecture", "ecriture", "écriture"],
      en: ["reading", "writing", "reading and writing"],
      es: ["lectura", "escritura"],
    },
  },
  {
    canonicalId: "learning_difficulties",
    category: "academic",
    emoji: "🧠",
    labels: { fr: "Difficultés d’apprentissage", en: "Learning difficulties", es: "Dificultades de aprendizaje" },
    aliases: {
      fr: ["difficultes d apprentissage", "difficultes apprentissage"],
      en: ["learning difficulties", "learning disability"],
      es: ["dificultades de aprendizaje"],
    },
  },
  {
    // Broad "Tuteurs académiques" entry — its French label MUST exactly match
    // the discipline label in `lib/disciplines.ts` so picking it can activate
    // the existing parent-side category chip (see SmartSearchInput.select).
    canonicalId: "tutors_general",
    category: "academic",
    emoji: "📚",
    labels: {
      fr: "Tuteurs académiques",
      en: "Academic tutors",
      es: "Tutores académicos",
    },
    aliases: {
      fr: ["tuteurs academiques", "tutorat", "soutien scolaire", "scolaire"],
      en: ["academic tutor", "academic tutoring", "tutor"],
      es: ["tutoria academica", "apoyo escolar"],
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
    canonicalId: "coach_trainer",
    category: "arts_skills",
    emoji: "💪",
    labels: { fr: "Coach sportif", en: "Fitness coach", es: "Entrenador deportivo" },
    aliases: {
      fr: [
        "entraîneur",
        "entraineur",
        "coach",
        "coach sportif",
        "entraîneur privé",
        "entraineur prive",
        "entraînement",
        "entrainement",
        "mise en forme",
        "conditionnement physique",
        "fitness",
        "musculation",
        "perte de poids",
        "cardio",
      ],
      en: [
        "coach",
        "trainer",
        "fitness coach",
        "personal trainer",
        "private trainer",
        "workout",
        "fitness",
        "strength training",
        "conditioning",
        "cardio",
      ],
      es: [
        "entrenador",
        "coach",
        "entrenador personal",
        "preparador físico",
        "preparador fisico",
        "entrenamiento",
        "fitness",
        "acondicionamiento físico",
        "acondicionamiento fisico",
        "musculación",
        "musculacion",
        "cardio",
      ],
    },
  },
  {
    canonicalId: "cooking",
    category: "arts_skills",
    emoji: "🍳",
    labels: { fr: "Cuisine", en: "Cooking", es: "Cocina" },
    aliases: {
      fr: [
        "cours de cuisine",
        "cuisiner",
        "pâtisserie",
        "patisserie",
        "boulangerie",
        "chef",
        "cuisine maison",
      ],
      en: [
        "cooking class",
        "cook",
        "baking",
        "pastry",
        "chef",
        "home cooking",
        "culinary",
      ],
      es: [
        "clase de cocina",
        "cocinar",
        "repostería",
        "reposteria",
        "panadería",
        "panaderia",
        "chef",
        "cocina casera",
      ],
    },
  },
  {
    canonicalId: "yoga",
    category: "arts_skills",
    emoji: "🧘",
    labels: { fr: "Yoga", en: "Yoga", es: "Yoga" },
    aliases: { fr: ["hatha", "vinyasa"], en: ["hatha", "vinyasa"], es: ["hatha", "vinyasa"] },
  },
  {
    canonicalId: "pilates",
    category: "arts_skills",
    emoji: "🧘",
    labels: { fr: "Pilates", en: "Pilates", es: "Pilates" },
    aliases: { fr: ["cours de pilates"], en: ["pilates class"], es: ["clase de pilates"] },
  },
  {
    canonicalId: "swimming",
    category: "arts_skills",
    emoji: "🏊",
    labels: { fr: "Natation", en: "Swimming", es: "Natación" },
    aliases: {
      fr: ["nager", "cours de natation", "natation adulte"],
      en: ["swim", "swim lessons", "swimming lessons"],
      es: ["nadar", "clases de natacion", "clases de natación"],
    },
  },
  {
    canonicalId: "aquafitness",
    category: "arts_skills",
    emoji: "💦",
    labels: { fr: "Aquaforme", en: "Aquafitness", es: "Aqua fitness" },
    aliases: {
      fr: ["aquagym", "aqua gym", "aquafitness", "aqua fitness", "aquaforme"],
      en: ["aqua gym", "aquagym", "water aerobics", "aqua aerobics"],
      es: ["aquagym", "aqua gym", "aerobic acuatico", "aeróbic acuático"],
    },
  },
  {
    canonicalId: "zumba",
    category: "arts_skills",
    emoji: "🕺",
    labels: { fr: "Zumba", en: "Zumba", es: "Zumba" },
    aliases: {
      fr: ["cours de zumba", "zumba fitness"],
      en: ["zumba class", "zumba fitness"],
      es: ["clase de zumba", "zumba fitness"],
    },
  },
  {
    canonicalId: "excel",
    category: "arts_skills",
    emoji: "📊",
    labels: { fr: "Excel", en: "Excel", es: "Excel" },
    aliases: {
      fr: ["tableur", "microsoft excel"],
      en: ["spreadsheet", "microsoft excel"],
      es: ["hoja de calculo", "microsoft excel"],
    },
  },
  {
    canonicalId: "chess",
    category: "arts_skills",
    emoji: "♟️",
    labels: { fr: "Échecs", en: "Chess", es: "Ajedrez" },
    aliases: { fr: ["echecs", "jeu d echecs"], en: ["chess lessons"], es: ["ajedrez"] },
  },
  {
    canonicalId: "sewing",
    category: "arts_skills",
    emoji: "🧵",
    labels: { fr: "Couture", en: "Sewing", es: "Costura" },
    aliases: { fr: ["coudre", "couturier"], en: ["sewing class"], es: ["costura"] },
  },
  {
    canonicalId: "web_development",
    category: "arts_skills",
    emoji: "💻",
    labels: { fr: "Développement web", en: "Web development", es: "Desarrollo web" },
    aliases: {
      fr: ["dev web", "html", "css", "javascript"],
      en: ["web dev", "html", "css", "javascript"],
      es: ["desarrollo web", "html", "css"],
    },
  },
  {
    canonicalId: "martial_arts",
    category: "arts_skills",
    emoji: "🥋",
    labels: { fr: "Arts martiaux", en: "Martial arts", es: "Artes marciales" },
    aliases: {
      fr: [
        "art martial",
        "karaté",
        "karate",
        "judo",
        "taekwondo",
        "boxe",
        "kickboxing",
        "autodéfense",
        "autodefense",
        "self-defense",
        "jiu-jitsu",
        "jujitsu",
      ],
      en: [
        "martial art",
        "karate",
        "judo",
        "taekwondo",
        "boxing",
        "kickboxing",
        "self-defense",
        "self defence",
        "jiu-jitsu",
        "jujitsu",
      ],
      es: [
        "arte marcial",
        "karate",
        "kárate",
        "judo",
        "taekwondo",
        "boxeo",
        "kickboxing",
        "defensa personal",
        "jiu-jitsu",
        "jujitsu",
      ],
    },
  },
  {
    canonicalId: "dance",
    category: "arts_skills",
    emoji: "💃",
    labels: { fr: "Danse", en: "Dance", es: "Danza / baile" },
    aliases: {
      fr: [
        "cours de danse",
        "danser",
        "ballet",
        "salsa",
        "bachata",
        "hip-hop",
        "danse latine",
        "danse contemporaine",
        "zumba",
      ],
      en: [
        "dance class",
        "dancing",
        "ballet",
        "salsa",
        "bachata",
        "hip-hop",
        "latin dance",
        "contemporary dance",
        "zumba",
      ],
      es: [
        "danza",
        "baile",
        "clase de baile",
        "bailar",
        "ballet",
        "salsa",
        "bachata",
        "hip-hop",
        "baile latino",
        "danza contemporánea",
        "danza contemporanea",
        "zumba",
      ],
    },
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
 * Buckets whose French label MUST exactly match a discipline label in
 * `lib/disciplines.ts`. Selecting one of these in the autosuggest should
 * route through the parent's `onSelectDiscipline` callback so the existing
 * category-chip filter keeps working, instead of being treated as free-text
 * subject input.
 *
 * Keeping this list narrow and explicit (instead of inferring from a suffix)
 * means a future renamed canonicalId still surfaces as a regular subject,
 * which is the safer default for the dropdown.
 */
export const GENERAL_DISCIPLINE_BUCKET_IDS = new Set<string>([
  "music_general",
  "languages_general",
  "tutors_general",
]);

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
