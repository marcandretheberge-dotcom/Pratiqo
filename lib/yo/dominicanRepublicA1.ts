/**
 * Yo Pratiqo Voyage — Espagnol République dominicaine A1
 *
 * Hardcoded MVP content for Phase 1. Shaped exactly like the future Supabase
 * rows in yo_modules / yo_lessons / yo_lesson_sections / yo_quiz_questions /
 * yo_flashcards / yo_dictionary_expressions so the same `YoIntroPageData`
 * object can later be returned by a server route powered by the database.
 * No Supabase imports here on purpose.
 *
 * Locked product decisions baked into this file:
 *   - price_cents = 2499  ($24.99 CAD)
 *   - currency    = "CAD"
 *   - cefr_level  = "A1"  (kid/family-friendly content only)
 *   - product_line = "voyage"
 *
 * A1 content rule: NO slang/vulgar/ambiguous expressions. B1+ may later add
 * "à reconnaître mais ne pas utiliser" content (e.g. coño, singar, cuero),
 * but the data exported here must stay travel-, food-, and politeness-
 * focused.
 */

import type {
  YoDialogueScenarioData,
  YoDominicanExpression,
  YoFlashcard,
  YoFeature,
  YoIntroDetailedSection,
  YoIntroPageData,
  YoIntroProgressStats,
  YoLesson,
  YoLessonCard,
  YoLessonPathStep,
  YoModule,
  YoQuizQuestion,
} from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────────
// Intro lesson — cards (the surface trigger for each detailed section)
// ─────────────────────────────────────────────────────────────────────────

const introCards: YoLessonCard[] = [
  {
    id: "intro_card_geography",
    kind: "text",
    title: "Où on s’en va ?",
    description:
      "Découvre la République dominicaine : ses régions, ses villes et ses trésors.",
    ctaLabel: "Explorer la carte",
    ctaHref: "#geography",
    iconHint: "map",
    visualHint: "dominican-map",
    // Phase 2 swap: imagePath = "/images/yo/voyage/do/map-dominican-republic.svg"
    imagePath: null,
  },
  {
    id: "intro_card_history",
    kind: "text",
    title: "Petite histoire en 3 minutes",
    description: "Un peu d’histoire, de culture et de fierté dominicaine.",
    // Audio is intentionally absent — the visual placeholder shows
    // "Audio bientôt disponible" until a real recording is uploaded.
    ctaLabel: "Lire la mini-histoire",
    ctaHref: "#history",
    iconHint: "book",
    visualHint: "history-colonial",
    // Phase 2 swap: imagePath = "/images/yo/voyage/do/history-zona-colonial.webp"
    imagePath: null,
  },
  {
    id: "intro_card_food",
    kind: "text",
    title: "Bouffer comme un local",
    description: "Saveurs, plats typiques et expressions de la table.",
    ctaLabel: "Voir et apprendre",
    ctaHref: "#food",
    iconHint: "utensils",
    visualHint: "food-bandera",
    // Phase 2 swap: imagePath = "/images/yo/voyage/do/food-bandera-dominicana.webp"
    imagePath: null,
  },
  {
    id: "intro_card_first_phrases",
    kind: "phrases",
    title: "Tes premières phrases utiles",
    description:
      "Salutations, politesse, présentation et au revoir, avec un mini-dialogue à l’hôtel.",
    ctaLabel: "Pratiquer",
    ctaHref: "#first-phrases",
    iconHint: "message-circle",
    visualHint: "conversation-bubbles",
    // Phase 2 swap: imagePath = "/images/yo/voyage/do/conversation-hotel-checkin.webp"
    imagePath: null,
    phrases: [
      { target: "Buenos días", translation: "Bonjour" },
      { target: "Buenas tardes", translation: "Bon après-midi" },
      { target: "Buenas noches", translation: "Bonsoir / Bonne nuit" },
      { target: "Mucho gusto", translation: "Ravi de vous rencontrer" },
      { target: "Hasta luego", translation: "À plus tard" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Detailed Intro sections (revealed by progressive disclosure).
// Each section's id matches one of the four cards above.
// ─────────────────────────────────────────────────────────────────────────

const geographySection: YoIntroDetailedSection = {
  id: "intro_card_geography",
  emoji: "📍",
  title: "Où on s’en va ?",
  intro:
    "La République dominicaine se trouve dans les Caraïbes, sur l’île d’Hispaniola, qu’elle partage avec Haïti.",
  sectionLeadIn: "Trois zones utiles à connaître :",
  bullets: [
    {
      label: "Punta Cana / Bávaro",
      description:
        "resorts, plages, première destination de nombreux Québécois.",
    },
    {
      label: "Puerto Plata / Sosúa",
      description: "côte nord, plages, montagnes, ambiance plus locale.",
    },
    {
      label: "Santo Domingo",
      description: "capitale, histoire, ville coloniale, culture urbaine.",
    },
  ],
  practicalPhrasesIntro:
    "Si quelqu’un te demande d’où tu viens, tu peux répondre :",
  practicalPhrases: [
    { target: "Soy de Quebec.", translation: "Je viens du Québec." },
    { target: "Soy de Canadá.", translation: "Je viens du Canada." },
  ],
  vocabulary: [
    { target: "el país", translation: "le pays" },
    { target: "la isla", translation: "l’île" },
    { target: "la playa", translation: "la plage" },
    { target: "la capital", translation: "la capitale" },
    { target: "la ciudad", translation: "la ville" },
  ],
  visualHint: "dominican-map",
};

const historySection: YoIntroDetailedSection = {
  id: "intro_card_history",
  emoji: "⏳",
  title: "Petite histoire en 3 minutes",
  timeline: [
    { year: "1492", description: "Christophe Colomb arrive sur l’île." },
    { year: "1496", description: "Santo Domingo est fondée." },
    { year: "1844", description: "Indépendance dominicaine." },
    {
      year: "Aujourd’hui",
      description:
        "tourisme, musique, baseball, cacao, rhum et cigares font partie de l’identité du pays.",
    },
  ],
  learningNote:
    "L’objectif n’est pas de mémoriser des dates. L’objectif est de comprendre pourquoi le pays est fier de son histoire.",
  vocabulary: [
    { target: "la historia", translation: "l’histoire" },
    { target: "la independencia", translation: "l’indépendance" },
    { target: "la ciudad", translation: "la ville" },
    { target: "hoy", translation: "aujourd’hui" },
    { target: "el país", translation: "le pays" },
  ],
  visualHint: "history-colonial",
  audioComingSoonLabel: "Audio bientôt disponible",
};

const foodSection: YoIntroDetailedSection = {
  id: "intro_card_food",
  emoji: "🍽️",
  title: "Bouffer comme un local",
  intro:
    "La cuisine dominicaine est généreuse, simple et généralement moins piquante que la cuisine mexicaine.",
  highlightTitle: "La Bandera Dominicana",
  highlightBody:
    "On l’appelle « la bandera » parce que c’est le plat national du quotidien.",
  bulletGroups: [
    {
      heading: "Assiette typique",
      items: [
        { target: "arroz blanco", translation: "riz blanc" },
        { target: "habichuelas rojas", translation: "haricots rouges" },
        { target: "pollo ou carne", translation: "poulet ou viande" },
        { target: "plátano frito", translation: "banane plantain frite" },
      ],
    },
    {
      heading: "Autres plats",
      items: [
        { target: "mangú", translation: "purée de plantain vert" },
        { target: "sancocho", translation: "soupe-ragoût familiale" },
        { target: "tres golpes", translation: "mangú, œuf, salami frit" },
      ],
    },
    {
      heading: "Boissons",
      items: [
        {
          target: "café dominicano",
          translation: "petit café fort et sucré",
        },
        {
          target: "jugo de chinola",
          translation: "jus de fruit de la passion",
        },
        { target: "cerveza fría", translation: "bière froide" },
      ],
    },
  ],
  practicalPhrasesIntro: "Phrase utile à connaître :",
  practicalPhrases: [
    {
      target: "La cuenta, por favor.",
      translation: "L’addition, s’il vous plaît.",
    },
  ],
  vocabulary: [
    { target: "el arroz", translation: "le riz" },
    { target: "el pollo", translation: "le poulet" },
    { target: "el plátano", translation: "la banane plantain" },
    { target: "el café", translation: "le café" },
    { target: "la cerveza fría", translation: "la bière froide" },
    {
      target: "la cuenta, por favor",
      translation: "l’addition, s’il vous plaît",
    },
  ],
  miniMission: {
    title: "Mini mission au restaurant",
    intro:
      "Tu es au restaurant. Choisis une phrase simple pour commander :",
    options: [
      "Quiero café, por favor.",
      "Quiero agua, por favor.",
      "La cuenta, por favor.",
    ],
  },
  visualHint: "food-bandera",
};

const hotelCheckinDialogue: YoDialogueScenarioData = {
  title: "Ta première interaction au resort",
  lines: [
    {
      speakerLabel: "Réceptionniste",
      speakerKind: "host",
      target: "¡Buenas tardes! ¿Cómo está?",
    },
    {
      speakerLabel: "Toi",
      speakerKind: "self",
      target: "Buenas tardes. Muy bien, gracias. ¿Y usted?",
    },
    {
      speakerLabel: "Réceptionniste",
      speakerKind: "host",
      target: "Todo bien. ¿Su nombre, por favor?",
    },
    {
      speakerLabel: "Toi",
      speakerKind: "self",
      target: "Me llamo Marc. Soy de Quebec.",
    },
    {
      speakerLabel: "Réceptionniste",
      speakerKind: "host",
      target: "Mucho gusto. Bienvenido.",
    },
    {
      speakerLabel: "Toi",
      speakerKind: "self",
      target: "Mucho gusto. Gracias.",
    },
  ],
};

const firstPhrasesSection: YoIntroDetailedSection = {
  id: "intro_card_first_phrases",
  emoji: "👋",
  title: "Tes premières phrases utiles",
  bulletGroups: [
    {
      heading: "Salutations",
      items: [
        { target: "Hola", translation: "Salut / Bonjour" },
        { target: "Buenos días", translation: "Bonjour le matin" },
        { target: "Buenas tardes", translation: "Bon après-midi" },
        { target: "Buenas noches", translation: "Bonsoir / Bonne nuit" },
      ],
    },
    {
      heading: "Comment ça va",
      items: [
        { target: "¿Cómo estás?", translation: "Comment vas-tu ?" },
        { target: "¿Cómo está?", translation: "Comment allez-vous ?" },
        { target: "Bien, gracias", translation: "Bien, merci" },
        { target: "Todo bien", translation: "Tout va bien" },
      ],
    },
    {
      heading: "Se présenter",
      items: [
        {
          target: "Me llamo [ton prénom]",
          translation: "Je m’appelle...",
        },
        { target: "Soy de Quebec", translation: "Je viens du Québec" },
        { target: "Soy de Canadá", translation: "Je viens du Canada" },
        { target: "Mucho gusto", translation: "Enchanté" },
      ],
    },
    {
      heading: "Au revoir",
      items: [
        { target: "Adiós", translation: "Au revoir" },
        { target: "Hasta luego", translation: "À plus tard" },
        { target: "Hasta mañana", translation: "À demain" },
        { target: "Hasta la próxima", translation: "À la prochaine" },
        { target: "Nos vemos", translation: "On se revoit" },
      ],
    },
  ],
  dialogue: hotelCheckinDialogue,
  visualHint: "conversation-bubbles",
};

const detailedSections: YoIntroDetailedSection[] = [
  geographySection,
  historySection,
  foodSection,
  firstPhrasesSection,
];

// ─────────────────────────────────────────────────────────────────────────
// Dominican Republic pocket dictionary (A1-safe).
// Strictly kid/family-friendly: NO coño, NO singar, NO cuero, NO mature
// slang. Those land in a future "à reconnaître mais ne pas utiliser"
// B1+ list, never here.
// ─────────────────────────────────────────────────────────────────────────

const dominicanDictionary: YoDominicanExpression[] = [
  { id: "dict_que_lo_que", target: "¿Qué lo qué?", translation: "Quoi de neuf ?" },
  { id: "dict_tato", target: "¡Tato!", translation: "Parfait / OK" },
  { id: "dict_vaina", target: "una vaina", translation: "un truc / une affaire" },
  { id: "dict_chin", target: "un chin", translation: "un peu" },
  { id: "dict_chevere", target: "¡Qué chévere!", translation: "C’est cool" },
  { id: "dict_guagua", target: "la guagua", translation: "l’autobus / minibus" },
  { id: "dict_napa", target: "la ñapa", translation: "le petit extra gratuit" },
  { id: "dict_chinola", target: "chinola", translation: "fruit de la passion" },
  { id: "dict_lechosa", target: "lechosa", translation: "papaye" },
  {
    id: "dict_colmado",
    target: "el colmado",
    translation: "petite épicerie de quartier",
  },
  { id: "dict_provecho", target: "¡Provecho!", translation: "Bon appétit" },
  { id: "dict_salud", target: "¡Salud!", translation: "Santé" },
  { id: "dict_diache", target: "¡Diache!", translation: "Sapristi / wow" },
];

// ─────────────────────────────────────────────────────────────────────────
// Lessons (only the Intro is "free_preview"; the rest are locked teasers)
// ─────────────────────────────────────────────────────────────────────────

const lessons: YoLesson[] = [
  {
    id: "voyage_es_do_intro",
    position: 1,
    title: "Intro",
    subtitle:
      "Géographie, culture, premières phrases et expressions du quotidien.",
    status: "free_preview",
    estimatedMinutes: 12,
    cards: introCards,
  },
  {
    id: "voyage_es_do_arrival",
    position: 2,
    title: "Arrivée et hôtel",
    subtitle: "Passer la douane, prendre un taxi, parler à la réception.",
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_food",
    position: 3,
    title: "Manger et commander",
    subtitle: "Lire un menu, commander, payer, demander l’addition.",
    status: "locked",
    estimatedMinutes: 20,
    cards: [],
  },
  {
    id: "voyage_es_do_navigation",
    position: 4,
    title: "Bouger et demander de l’aide",
    subtitle: "Demander son chemin, prendre le bus, gérer un imprévu.",
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_conversation",
    position: 5,
    title: "Conversations naturelles",
    subtitle:
      "Petits échanges du quotidien, politesse et accent dominicain.",
    status: "locked",
    estimatedMinutes: 22,
    cards: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Lesson path (compact view used on the page above the Intro cards)
// ─────────────────────────────────────────────────────────────────────────

const lessonPath: YoLessonPathStep[] = lessons.map((lesson) => ({
  id: lesson.id,
  position: lesson.position,
  title: lesson.title,
  ctaLabel: lesson.status === "free_preview" ? "Commencer" : "Verrouillé",
  status: lesson.status,
}));

// ─────────────────────────────────────────────────────────────────────────
// Flashcard deck (12 cards). A1 = friendly Dominican expressions only.
// ─────────────────────────────────────────────────────────────────────────

const flashcardDeck: YoFlashcard[] = [
  {
    id: "deck_que_lo_que",
    front: "¿Qué lo qué?",
    back: "Quoi de neuf ?",
    hint: "Salutation informelle typique en République dominicaine, entre amis ou en famille.",
    tag: "salutations",
    isLocalExpression: true,
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_tato",
    front: "¡Tato!",
    back: "Parfait / OK",
    hint: "Expression dominicaine très courante pour confirmer que tout est correct.",
    tag: "expressions",
    isLocalExpression: true,
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_buenos_dias",
    front: "Buenos días",
    back: "Bonjour le matin",
    hint: "Salutation à utiliser jusqu’à midi environ.",
    tag: "salutations",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_buenas_tardes",
    front: "Buenas tardes",
    back: "Bon après-midi",
    hint: "Salutation utilisée de l’après-midi jusqu’en début de soirée.",
    tag: "salutations",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_buenas_noches",
    front: "Buenas noches",
    back: "Bonsoir / Bonne nuit",
    hint: "Sert aussi bien à dire bonsoir qu’à souhaiter bonne nuit.",
    tag: "salutations",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_mucho_gusto",
    front: "Mucho gusto",
    back: "Enchanté",
    hint: "À dire quand on rencontre quelqu’un pour la première fois.",
    tag: "présentation",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_hasta_luego",
    front: "Hasta luego",
    back: "À plus tard",
    hint: "Au revoir poli et neutre, à utiliser presque partout.",
    tag: "au revoir",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_el_pais",
    front: "el país",
    back: "le pays",
    tag: "vocabulaire",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_la_playa",
    front: "la playa",
    back: "la plage",
    tag: "vocabulaire",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_el_arroz",
    front: "el arroz",
    back: "le riz",
    tag: "table",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_el_pollo",
    front: "el pollo",
    back: "le poulet",
    tag: "table",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
  {
    id: "deck_la_cuenta",
    front: "la cuenta, por favor",
    back: "l’addition, s’il vous plaît",
    hint: "Phrase universellement comprise au restaurant.",
    tag: "table",
    visualHint: "tropical-flashcard",
    imagePath: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Quiz questions (5 questions, single-answer multiple choice)
// ─────────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "quiz_capital",
    prompt: "La capitale de la République dominicaine s’appelle…",
    options: [
      { id: "a", label: "Santiago" },
      { id: "b", label: "Punta Cana" },
      { id: "c", label: "Saint-Domingue" },
    ],
    correctOptionId: "c",
    explanation:
      "La capitale est Saint-Domingue (Santo Domingo). Santiago est la 2e ville et Punta Cana est une zone touristique de l’Est.",
  },
  {
    id: "quiz_morning_greeting",
    prompt: "Pour saluer quelqu’un le matin, on dit…",
    options: [
      { id: "a", label: "Buenas noches" },
      { id: "b", label: "Buenos días" },
      { id: "c", label: "Hasta luego" },
    ],
    correctOptionId: "b",
    explanation:
      "« Buenos días » se dit le matin. « Buenas noches » = bonsoir/bonne nuit. « Hasta luego » = à plus tard.",
  },
  {
    id: "quiz_mucho_gusto",
    prompt: "« Mucho gusto » veut dire…",
    options: [
      { id: "a", label: "Enchanté" },
      { id: "b", label: "À demain" },
      { id: "c", label: "Je veux du café" },
    ],
    correctOptionId: "a",
    explanation:
      "« Mucho gusto » se dit lorsqu’on rencontre quelqu’un pour la première fois. Littéralement : « beaucoup de plaisir ».",
  },
  {
    id: "quiz_bandera",
    prompt: "Le plat « La Bandera Dominicana » contient souvent…",
    options: [
      { id: "a", label: "Riz, haricots et viande" },
      { id: "b", label: "Pâtes, fromage et tomate" },
      { id: "c", label: "Sushi et sauce soya" },
    ],
    correctOptionId: "a",
    explanation:
      "C’est le plat national du quotidien : arroz blanco, habichuelas rojas, pollo ou carne, souvent avec du plátano frito.",
  },
  {
    id: "quiz_que_lo_que",
    prompt: "« ¿Qué lo qué? » est une expression dominicaine qui veut dire…",
    options: [
      { id: "a", label: "Combien ça coûte ?" },
      { id: "b", label: "Quoi de neuf ?" },
      { id: "c", label: "Où est la plage ?" },
    ],
    correctOptionId: "b",
    explanation:
      "Salutation informelle typique en République dominicaine, à utiliser entre amis ou en famille.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Intro progress strip
// ─────────────────────────────────────────────────────────────────────────

const introProgress: YoIntroProgressStats = {
  title: "Commence ton intro gratuite",
  description:
    "Cette intro te donne les bases pour comprendre le pays, saluer, te présenter, reconnaître quelques expressions dominicaines et tester ta mémoire avec quiz + flashcards.",
  stats: [
    { id: "stat_sections", value: 4, label: "sections à explorer" },
    { id: "stat_questions", value: 5, label: "questions de quiz" },
    { id: "stat_flashcards", value: 12, label: "cartes flash" },
    { id: "stat_dialogue", value: 1, label: "mini-dialogue" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Marketing features
// ─────────────────────────────────────────────────────────────────────────

const unlockFeatures: YoFeature[] = [
  { id: "unlock_modules", label: "5 modules complets", icon: "layers" },
  { id: "unlock_missions", label: "Missions réelles", icon: "compass" },
  {
    id: "unlock_quiz_audio",
    label: "Quiz + Flashcards + Audio",
    icon: "headphones",
  },
  {
    id: "unlock_expressions",
    label: "Expressions locales dominicaines",
    icon: "sparkles",
  },
  {
    id: "unlock_smart_review",
    label: "Révision intelligente",
    icon: "shield-check",
  },
  { id: "unlock_lifetime", label: "Accès à vie", icon: "infinity" },
];

const bottomFeatures: YoFeature[] = [
  { id: "feat_native_audio", label: "Audio par des natifs", icon: "headphones" },
  {
    id: "feat_smart_flashcards",
    label: "Flashcards intelligentes",
    icon: "layers",
  },
  { id: "feat_daily_missions", label: "Missions du quotidien", icon: "compass" },
  {
    id: "feat_real_teachers",
    label: "Professeurs réels sur Pratiqo",
    icon: "graduation-cap",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Module
// ─────────────────────────────────────────────────────────────────────────

const module_: YoModule = {
  id: "voyage_es_do",
  productLine: "voyage",
  targetLanguage: "es",
  destinationCountry: "DO",
  destinationLabelFr: "République dominicaine",
  cefrLevel: "A1",
  priceCents: 2499,
  currency: "CAD",
  freeLessonsCount: 1,
  productLabel: "Yo Pratiqo Voyage",
  heroTitle: "Espagnol pratique — République dominicaine",
  heroSubtitle:
    "Apprends à vraiment parler sur place, avec culture, expressions locales et missions réelles.",
  heroVisualHint: "hero-tropical",
  // Phase 2 swap: heroImagePath = "/images/yo/voyage/do/hero-dominican-republic.webp"
  heroImagePath: null,
  lessons,
};

// ─────────────────────────────────────────────────────────────────────────
// Public export consumed by the page
// ─────────────────────────────────────────────────────────────────────────

export const dominicanRepublicA1: YoIntroPageData = {
  module: module_,
  lessonPath,
  detailedSections,
  dominicanDictionary,
  flashcardDeck,
  quizQuestions,
  introProgress,
  unlockFeatures,
  bottomFeatures,
  // Legacy aliases — first item of each new array
  flashcardSample: flashcardDeck[0]!,
  quizSample: quizQuestions[0]!,
};

/**
 * Formatted price string used directly in UI. Hardcoded to the locked
 * MVP price decision: $24,99 CAD (Quebec French formatting — comma decimal).
 */
export const dominicanRepublicA1PriceLabel = "$24,99 CAD";
