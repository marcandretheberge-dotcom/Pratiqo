/**
 * Yo Pratiqo Voyage — Spanish Dominican Republic A1
 *
 * Hardcoded MVP content for Phase 1. Shaped exactly like the future Supabase
 * rows in yo_modules / yo_lessons / yo_lesson_sections / yo_quiz_questions /
 * yo_flashcards / yo_dictionary_expressions so the same `YoIntroPageData`
 * object can later be returned by a server route powered by the database.
 * No Supabase imports here on purpose.
 *
 * Bilingual contract: every learner-language string carries both French
 * and English values via `lstr(fr, en)`. Spanish phrases — the language
 * being taught — stay as plain strings so they keep `lang="es"`.
 *
 * Locked product decisions baked into this file:
 *   - price_cents = 2499   ($24,99 CAD in FR / $24.99 CAD in EN)
 *   - currency    = "CAD"
 *   - cefr_level  = "A1"   (kid/family-friendly content only)
 *   - product_line = "voyage"
 *
 * A1 content rule: NO slang/vulgar/ambiguous expressions. B1+ may later add
 * "à reconnaître mais ne pas utiliser" content (e.g. coño, singar, cuero),
 * but the data exported here must stay travel-, food-, and politeness-
 * focused.
 */

import { lstr } from "@/lib/yo/localize";
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

const YO_DO_IMAGES = {
  hero: "/images/yo/voyage/do/hero-dominican-republic.webp",
  map: "/images/yo/voyage/do/map-dominican-republic.webp",
  food: "/images/yo/voyage/do/food-bandera-dominicana.webp",
  history: "/images/yo/voyage/do/history-zona-colonial.webp",
  conversation: "/images/yo/voyage/do/conversation-hotel-checkin.webp",
  flashcard: "/images/yo/voyage/do/flashcard-tropical-bg.webp",
  culture: "/images/yo/voyage/do/dominican-culture-music.webp",
} as const;

const YO_DO_IMAGE_ALT = {
  hero: lstr(
    "Plage tropicale et ambiance caribéenne en République dominicaine",
    "Tropical beach and Caribbean atmosphere in the Dominican Republic",
  ),
  map: lstr(
    "Carte de voyage illustrant les régions clés de la République dominicaine",
    "Travel map showing key regions of the Dominican Republic",
  ),
  history: lstr(
    "Rues coloniales colorées de la Zona Colonial à Saint-Domingue",
    "Colorful colonial streets in Santo Domingo's Zona Colonial",
  ),
  food: lstr(
    "Assiette dominicaine traditionnelle avec riz, haricots et plantain",
    "Traditional Dominican plate with rice, beans, and plantain",
  ),
  conversation: lstr(
    "Accueil à la réception d'un hôtel en République dominicaine",
    "Hotel reception check-in in the Dominican Republic",
  ),
  flashcard: lstr(
    "Fond tropical dominicain pour pratiquer le vocabulaire espagnol",
    "Dominican tropical background for practicing Spanish vocabulary",
  ),
  culture: lstr(
    "Musique, culture et voyage en République dominicaine",
    "Music, culture, and travel in the Dominican Republic",
  ),
} as const;

const introCards: YoLessonCard[] = [
  {
    id: "intro_card_geography",
    kind: "text",
    title: lstr("Où on s’en va ?", "Where are we going?"),
    description: lstr(
      "Découvre la République dominicaine : ses régions, ses villes et ses trésors.",
      "Discover the Dominican Republic — its regions, its cities, and its hidden gems.",
    ),
    ctaLabel: lstr("Explorer la carte", "Explore the map"),
    ctaHref: "#geography",
    iconHint: "map",
    visualHint: "dominican-map",
    imagePath: YO_DO_IMAGES.map,
    imageAlt: YO_DO_IMAGE_ALT.map,
  },
  {
    id: "intro_card_history",
    kind: "text",
    title: lstr(
      "Petite histoire en 3 minutes",
      "A 3-minute history snapshot",
    ),
    description: lstr(
      "Un peu d’histoire, de culture et de fierté dominicaine.",
      "A short dose of history, culture, and Dominican pride.",
    ),
    // Audio is intentionally absent — the visual placeholder shows
    // "Audio bientôt disponible" / "Audio coming soon" until a real
    // recording is uploaded.
    ctaLabel: lstr("Lire la mini-histoire", "Read the mini history"),
    ctaHref: "#history",
    iconHint: "book",
    visualHint: "history-colonial",
    imagePath: YO_DO_IMAGES.history,
    imageAlt: YO_DO_IMAGE_ALT.history,
  },
  {
    id: "intro_card_food",
    kind: "text",
    title: lstr("Bouffer comme un local", "Eat like a local"),
    description: lstr(
      "Saveurs, plats typiques et expressions de la table.",
      "Flavours, classic dishes, and table-side expressions.",
    ),
    ctaLabel: lstr("Voir et apprendre", "See and learn"),
    ctaHref: "#food",
    iconHint: "utensils",
    visualHint: "food-bandera",
    imagePath: YO_DO_IMAGES.food,
    imageAlt: YO_DO_IMAGE_ALT.food,
  },
  {
    id: "intro_card_first_phrases",
    kind: "phrases",
    title: lstr(
      "Tes premières phrases utiles",
      "Your first useful phrases",
    ),
    description: lstr(
      "Salutations, politesse, présentation et au revoir, avec un mini-dialogue à l’hôtel.",
      "Greetings, politeness, introductions, and goodbyes — plus a hotel mini-dialogue.",
    ),
    ctaLabel: lstr("Pratiquer", "Practice"),
    ctaHref: "#first-phrases",
    iconHint: "message-circle",
    visualHint: "conversation-bubbles",
    imagePath: YO_DO_IMAGES.conversation,
    imageAlt: YO_DO_IMAGE_ALT.conversation,
    phrases: [
      { target: "Buenos días", translation: lstr("Bonjour", "Good morning") },
      {
        target: "Buenas tardes",
        translation: lstr("Bon après-midi", "Good afternoon"),
      },
      {
        target: "Buenas noches",
        translation: lstr("Bonsoir / Bonne nuit", "Good evening / Good night"),
      },
      {
        target: "Mucho gusto",
        translation: lstr("Ravi de vous rencontrer", "Nice to meet you"),
      },
      {
        target: "Hasta luego",
        translation: lstr("À plus tard", "See you later"),
      },
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
  title: lstr("Où on s’en va ?", "Where are we going?"),
  intro: lstr(
    "La République dominicaine se trouve dans les Caraïbes, sur l’île d’Hispaniola, qu’elle partage avec Haïti.",
    "The Dominican Republic sits in the Caribbean, on the island of Hispaniola, which it shares with Haiti.",
  ),
  sectionLeadIn: lstr(
    "Trois zones utiles à connaître :",
    "Three useful zones to know:",
  ),
  bullets: [
    {
      label: lstr("Punta Cana / Bávaro", "Punta Cana / Bávaro"),
      description: lstr(
        "resorts, plages, première destination de nombreux Québécois.",
        "resorts, beaches — the most popular spot for travellers from Quebec.",
      ),
    },
    {
      label: lstr("Puerto Plata / Sosúa", "Puerto Plata / Sosúa"),
      description: lstr(
        "côte nord, plages, montagnes, ambiance plus locale.",
        "north coast, beaches, mountains, a more local vibe.",
      ),
    },
    {
      label: lstr("Santo Domingo", "Santo Domingo"),
      description: lstr(
        "capitale, histoire, ville coloniale, culture urbaine.",
        "capital city, history, colonial old town, urban culture.",
      ),
    },
  ],
  practicalPhrasesIntro: lstr(
    "Si quelqu’un te demande d’où tu viens, tu peux répondre :",
    "If someone asks where you're from, you can answer:",
  ),
  practicalPhrases: [
    {
      target: "Soy de Quebec.",
      translation: lstr("Je viens du Québec.", "I’m from Quebec."),
    },
    {
      target: "Soy de Canadá.",
      translation: lstr("Je viens du Canada.", "I’m from Canada."),
    },
  ],
  vocabulary: [
    { target: "el país", translation: lstr("le pays", "the country") },
    { target: "la isla", translation: lstr("l’île", "the island") },
    { target: "la playa", translation: lstr("la plage", "the beach") },
    { target: "la capital", translation: lstr("la capitale", "the capital") },
    { target: "la ciudad", translation: lstr("la ville", "the city") },
  ],
  visualHint: "dominican-map",
  imagePath: YO_DO_IMAGES.map,
  imageAlt: YO_DO_IMAGE_ALT.map,
};

const historySection: YoIntroDetailedSection = {
  id: "intro_card_history",
  emoji: "⏳",
  title: lstr(
    "Petite histoire en 3 minutes",
    "A 3-minute history snapshot",
  ),
  timeline: [
    {
      year: lstr("1492", "1492"),
      description: lstr(
        "Christophe Colomb arrive sur l’île.",
        "Christopher Columbus reaches the island.",
      ),
    },
    {
      year: lstr("1496", "1496"),
      description: lstr(
        "Santo Domingo est fondée.",
        "Santo Domingo is founded.",
      ),
    },
    {
      year: lstr("1844", "1844"),
      description: lstr(
        "Indépendance dominicaine.",
        "Dominican independence.",
      ),
    },
    {
      year: lstr("Aujourd’hui", "Today"),
      description: lstr(
        "tourisme, musique, baseball, cacao, rhum et cigares font partie de l’identité du pays.",
        "tourism, music, baseball, cocoa, rum, and cigars are all part of the country's identity.",
      ),
    },
  ],
  learningNote: lstr(
    "L’objectif n’est pas de mémoriser des dates. L’objectif est de comprendre pourquoi le pays est fier de son histoire.",
    "The goal isn't to memorize dates. The goal is to understand why the country is proud of its history.",
  ),
  vocabulary: [
    { target: "la historia", translation: lstr("l’histoire", "history") },
    {
      target: "la independencia",
      translation: lstr("l’indépendance", "independence"),
    },
    { target: "la ciudad", translation: lstr("la ville", "the city") },
    { target: "hoy", translation: lstr("aujourd’hui", "today") },
    { target: "el país", translation: lstr("le pays", "the country") },
  ],
  visualHint: "history-colonial",
  imagePath: YO_DO_IMAGES.history,
  imageAlt: YO_DO_IMAGE_ALT.history,
  audioComingSoonLabel: lstr(
    "Audio bientôt disponible",
    "Audio coming soon",
  ),
};

const foodSection: YoIntroDetailedSection = {
  id: "intro_card_food",
  emoji: "🍽️",
  title: lstr("Bouffer comme un local", "Eat like a local"),
  intro: lstr(
    "La cuisine dominicaine est généreuse, simple et généralement moins piquante que la cuisine mexicaine.",
    "Dominican food is generous, simple, and generally less spicy than Mexican cooking.",
  ),
  highlightTitle: lstr("La Bandera Dominicana", "La Bandera Dominicana"),
  highlightBody: lstr(
    "On l’appelle « la bandera » parce que c’est le plat national du quotidien.",
    "It’s called “la bandera” because it’s the everyday national dish.",
  ),
  bulletGroups: [
    {
      heading: lstr("Assiette typique", "Typical plate"),
      items: [
        { target: "arroz blanco", translation: lstr("riz blanc", "white rice") },
        {
          target: "habichuelas rojas",
          translation: lstr("haricots rouges", "red beans"),
        },
        {
          target: "pollo ou carne",
          translation: lstr("poulet ou viande", "chicken or meat"),
        },
        {
          target: "plátano frito",
          translation: lstr(
            "banane plantain frite",
            "fried plantain",
          ),
        },
      ],
    },
    {
      heading: lstr("Autres plats", "Other dishes"),
      items: [
        {
          target: "mangú",
          translation: lstr(
            "purée de plantain vert",
            "green plantain mash",
          ),
        },
        {
          target: "sancocho",
          translation: lstr(
            "soupe-ragoût familiale",
            "hearty family stew",
          ),
        },
        {
          target: "tres golpes",
          translation: lstr(
            "mangú, œuf, salami frit",
            "mangú, fried egg, and fried salami",
          ),
        },
      ],
    },
    {
      heading: lstr("Boissons", "Drinks"),
      items: [
        {
          target: "café dominicano",
          translation: lstr(
            "petit café fort et sucré",
            "small, strong, sweet coffee",
          ),
        },
        {
          target: "jugo de chinola",
          translation: lstr(
            "jus de fruit de la passion",
            "passion fruit juice",
          ),
        },
        {
          target: "cerveza fría",
          translation: lstr("bière froide", "cold beer"),
        },
      ],
    },
  ],
  practicalPhrasesIntro: lstr(
    "Phrase utile à connaître :",
    "A useful phrase to know:",
  ),
  practicalPhrases: [
    {
      target: "La cuenta, por favor.",
      translation: lstr(
        "L’addition, s’il vous plaît.",
        "The bill, please.",
      ),
    },
  ],
  vocabulary: [
    { target: "el arroz", translation: lstr("le riz", "rice") },
    { target: "el pollo", translation: lstr("le poulet", "chicken") },
    {
      target: "el plátano",
      translation: lstr("la banane plantain", "plantain"),
    },
    { target: "el café", translation: lstr("le café", "coffee") },
    {
      target: "la cerveza fría",
      translation: lstr("la bière froide", "cold beer"),
    },
    {
      target: "la cuenta, por favor",
      translation: lstr(
        "l’addition, s’il vous plaît",
        "the bill, please",
      ),
    },
  ],
  miniMission: {
    title: lstr("Mini mission au restaurant", "Mini mission at the restaurant"),
    intro: lstr(
      "Tu es au restaurant. Choisis une phrase simple pour commander :",
      "You're at a restaurant. Pick one simple phrase to order:",
    ),
    options: [
      "Quiero café, por favor.",
      "Quiero agua, por favor.",
      "La cuenta, por favor.",
    ],
  },
  visualHint: "food-bandera",
  imagePath: YO_DO_IMAGES.food,
  imageAlt: YO_DO_IMAGE_ALT.food,
};

const hotelCheckinDialogue: YoDialogueScenarioData = {
  title: lstr(
    "Ta première interaction au resort",
    "Your first interaction at the resort",
  ),
  lines: [
    {
      speakerLabel: lstr("Réceptionniste", "Receptionist"),
      speakerKind: "host",
      target: "¡Buenas tardes! ¿Cómo está?",
    },
    {
      speakerLabel: lstr("Toi", "You"),
      speakerKind: "self",
      target: "Buenas tardes. Muy bien, gracias. ¿Y usted?",
    },
    {
      speakerLabel: lstr("Réceptionniste", "Receptionist"),
      speakerKind: "host",
      target: "Todo bien. ¿Su nombre, por favor?",
    },
    {
      speakerLabel: lstr("Toi", "You"),
      speakerKind: "self",
      target: "Me llamo Marc. Soy de Quebec.",
    },
    {
      speakerLabel: lstr("Réceptionniste", "Receptionist"),
      speakerKind: "host",
      target: "Mucho gusto. Bienvenido.",
    },
    {
      speakerLabel: lstr("Toi", "You"),
      speakerKind: "self",
      target: "Mucho gusto. Gracias.",
    },
  ],
};

const firstPhrasesSection: YoIntroDetailedSection = {
  id: "intro_card_first_phrases",
  emoji: "👋",
  title: lstr(
    "Tes premières phrases utiles",
    "Your first useful phrases",
  ),
  bulletGroups: [
    {
      heading: lstr("Salutations", "Greetings"),
      items: [
        {
          target: "Hola",
          translation: lstr("Salut / Bonjour", "Hi / Hello"),
        },
        {
          target: "Buenos días",
          translation: lstr("Bonjour le matin", "Good morning"),
        },
        {
          target: "Buenas tardes",
          translation: lstr("Bon après-midi", "Good afternoon"),
        },
        {
          target: "Buenas noches",
          translation: lstr(
            "Bonsoir / Bonne nuit",
            "Good evening / Good night",
          ),
        },
      ],
    },
    {
      heading: lstr("Comment ça va", "How are you"),
      items: [
        {
          target: "¿Cómo estás?",
          translation: lstr("Comment vas-tu ?", "How are you? (informal)"),
        },
        {
          target: "¿Cómo está?",
          translation: lstr("Comment allez-vous ?", "How are you? (formal)"),
        },
        {
          target: "Bien, gracias",
          translation: lstr("Bien, merci", "Good, thanks"),
        },
        {
          target: "Todo bien",
          translation: lstr("Tout va bien", "All good"),
        },
      ],
    },
    {
      heading: lstr("Se présenter", "Introduce yourself"),
      items: [
        {
          target: "Me llamo [ton prénom]",
          translation: lstr(
            "Je m’appelle...",
            "My name is...",
          ),
        },
        {
          target: "Soy de Quebec",
          translation: lstr("Je viens du Québec", "I’m from Quebec"),
        },
        {
          target: "Soy de Canadá",
          translation: lstr("Je viens du Canada", "I’m from Canada"),
        },
        {
          target: "Mucho gusto",
          translation: lstr("Enchanté", "Nice to meet you"),
        },
      ],
    },
    {
      heading: lstr("Au revoir", "Goodbye"),
      items: [
        { target: "Adiós", translation: lstr("Au revoir", "Goodbye") },
        {
          target: "Hasta luego",
          translation: lstr("À plus tard", "See you later"),
        },
        {
          target: "Hasta mañana",
          translation: lstr("À demain", "See you tomorrow"),
        },
        {
          target: "Hasta la próxima",
          translation: lstr("À la prochaine", "Until next time"),
        },
        {
          target: "Nos vemos",
          translation: lstr("On se revoit", "We’ll see each other"),
        },
      ],
    },
  ],
  dialogue: hotelCheckinDialogue,
  visualHint: "conversation-bubbles",
  imagePath: YO_DO_IMAGES.conversation,
  imageAlt: YO_DO_IMAGE_ALT.conversation,
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
  {
    id: "dict_que_lo_que",
    target: "¿Qué lo qué?",
    translation: lstr("Quoi de neuf ?", "What’s up?"),
  },
  {
    id: "dict_tato",
    target: "¡Tato!",
    translation: lstr("Parfait / OK", "Perfect / OK"),
  },
  {
    id: "dict_vaina",
    target: "una vaina",
    translation: lstr("un truc / une affaire", "a thing / a deal"),
  },
  {
    id: "dict_chin",
    target: "un chin",
    translation: lstr("un peu", "a little bit"),
  },
  {
    id: "dict_chevere",
    target: "¡Qué chévere!",
    translation: lstr("C’est cool", "How cool!"),
  },
  {
    id: "dict_guagua",
    target: "la guagua",
    translation: lstr("l’autobus / minibus", "the bus / minibus"),
  },
  {
    id: "dict_napa",
    target: "la ñapa",
    translation: lstr(
      "le petit extra gratuit",
      "the small free extra",
    ),
  },
  {
    id: "dict_chinola",
    target: "chinola",
    translation: lstr("fruit de la passion", "passion fruit"),
  },
  {
    id: "dict_lechosa",
    target: "lechosa",
    translation: lstr("papaye", "papaya"),
  },
  {
    id: "dict_colmado",
    target: "el colmado",
    translation: lstr(
      "petite épicerie de quartier",
      "neighborhood corner store",
    ),
  },
  {
    id: "dict_provecho",
    target: "¡Provecho!",
    translation: lstr("Bon appétit", "Enjoy your meal"),
  },
  {
    id: "dict_salud",
    target: "¡Salud!",
    translation: lstr("Santé", "Cheers"),
  },
  {
    id: "dict_diache",
    target: "¡Diache!",
    translation: lstr("Sapristi / wow", "Goodness / wow"),
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Lessons (only the Intro is "free_preview"; the rest are locked teasers)
// ─────────────────────────────────────────────────────────────────────────

const lessons: YoLesson[] = [
  {
    id: "voyage_es_do_intro",
    position: 1,
    title: lstr("Intro", "Intro"),
    subtitle: lstr(
      "Géographie, culture, premières phrases et expressions du quotidien.",
      "Geography, culture, first phrases, and everyday expressions.",
    ),
    status: "free_preview",
    estimatedMinutes: 12,
    cards: introCards,
  },
  {
    id: "voyage_es_do_arrival",
    position: 2,
    title: lstr("Arrivée et hôtel", "Arrival and hotel"),
    subtitle: lstr(
      "Passer la douane, prendre un taxi, parler à la réception.",
      "Going through customs, catching a taxi, speaking with reception.",
    ),
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_food",
    position: 3,
    title: lstr("Manger et commander", "Eating and ordering"),
    subtitle: lstr(
      "Lire un menu, commander, payer, demander l’addition.",
      "Reading a menu, ordering, paying, asking for the bill.",
    ),
    status: "locked",
    estimatedMinutes: 20,
    cards: [],
  },
  {
    id: "voyage_es_do_navigation",
    position: 4,
    title: lstr(
      "Bouger et demander de l’aide",
      "Getting around and asking for help",
    ),
    subtitle: lstr(
      "Demander son chemin, prendre le bus, gérer un imprévu.",
      "Asking for directions, taking the bus, handling a snag.",
    ),
    status: "locked",
    estimatedMinutes: 18,
    cards: [],
  },
  {
    id: "voyage_es_do_conversation",
    position: 5,
    title: lstr("Conversations naturelles", "Natural conversations"),
    subtitle: lstr(
      "Petits échanges du quotidien, politesse et accent dominicain.",
      "Everyday small talk, politeness, and the Dominican accent.",
    ),
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
  ctaLabel:
    lesson.status === "free_preview"
      ? lstr("Commencer", "Start")
      : lstr("Verrouillé", "Locked"),
  status: lesson.status,
}));

// ─────────────────────────────────────────────────────────────────────────
// Flashcard deck (12 cards). A1 = friendly Dominican expressions only.
// ─────────────────────────────────────────────────────────────────────────

const flashcardDeck: YoFlashcard[] = ([
  {
    id: "deck_que_lo_que",
    front: "¿Qué lo qué?",
    back: lstr("Quoi de neuf ?", "What’s up?"),
    hint: lstr(
      "Salutation informelle typique en République dominicaine, entre amis ou en famille.",
      "Informal greeting that's typical in the Dominican Republic — used with friends or family.",
    ),
    tag: lstr("salutations", "greetings"),
    isLocalExpression: true,
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_tato",
    front: "¡Tato!",
    back: lstr("Parfait / OK", "Perfect / OK"),
    hint: lstr(
      "Expression dominicaine très courante pour confirmer que tout est correct.",
      "Very common Dominican expression to confirm everything is alright.",
    ),
    tag: lstr("expressions", "expressions"),
    isLocalExpression: true,
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_buenos_dias",
    front: "Buenos días",
    back: lstr("Bonjour le matin", "Good morning"),
    hint: lstr(
      "Salutation à utiliser jusqu’à midi environ.",
      "Greeting to use until about noon.",
    ),
    tag: lstr("salutations", "greetings"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_buenas_tardes",
    front: "Buenas tardes",
    back: lstr("Bon après-midi", "Good afternoon"),
    hint: lstr(
      "Salutation utilisée de l’après-midi jusqu’en début de soirée.",
      "Greeting used from the afternoon until early evening.",
    ),
    tag: lstr("salutations", "greetings"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_buenas_noches",
    front: "Buenas noches",
    back: lstr(
      "Bonsoir / Bonne nuit",
      "Good evening / Good night",
    ),
    hint: lstr(
      "Sert aussi bien à dire bonsoir qu’à souhaiter bonne nuit.",
      "Works for both saying good evening and wishing good night.",
    ),
    tag: lstr("salutations", "greetings"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_mucho_gusto",
    front: "Mucho gusto",
    back: lstr("Enchanté", "Nice to meet you"),
    hint: lstr(
      "À dire quand on rencontre quelqu’un pour la première fois.",
      "To say when you meet someone for the first time.",
    ),
    tag: lstr("présentation", "introductions"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_hasta_luego",
    front: "Hasta luego",
    back: lstr("À plus tard", "See you later"),
    hint: lstr(
      "Au revoir poli et neutre, à utiliser presque partout.",
      "Polite, neutral goodbye — works almost everywhere.",
    ),
    tag: lstr("au revoir", "goodbyes"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_el_pais",
    front: "el país",
    back: lstr("le pays", "the country"),
    tag: lstr("vocabulaire", "vocabulary"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_la_playa",
    front: "la playa",
    back: lstr("la plage", "the beach"),
    tag: lstr("vocabulaire", "vocabulary"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_el_arroz",
    front: "el arroz",
    back: lstr("le riz", "rice"),
    tag: lstr("table", "table"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_el_pollo",
    front: "el pollo",
    back: lstr("le poulet", "chicken"),
    tag: lstr("table", "table"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
  {
    id: "deck_la_cuenta",
    front: "la cuenta, por favor",
    back: lstr(
      "l’addition, s’il vous plaît",
      "the bill, please",
    ),
    hint: lstr(
      "Phrase universellement comprise au restaurant.",
      "Universally understood phrase at restaurants.",
    ),
    tag: lstr("table", "table"),
    visualHint: "tropical-flashcard",
    imagePath: YO_DO_IMAGES.flashcard,
  },
] satisfies YoFlashcard[]).map((card) => ({
  ...card,
  imagePath: YO_DO_IMAGES.flashcard,
  imageAlt: YO_DO_IMAGE_ALT.flashcard,
}));

// ─────────────────────────────────────────────────────────────────────────
// Quiz questions (5 questions, single-answer multiple choice).
// Notable EN difference: option C of the capital question is rendered as
// "Santo Domingo" in EN (vs. "Saint-Domingue" in FR), matching the
// product spec.
// ─────────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "quiz_capital",
    prompt: lstr(
      "La capitale de la République dominicaine s’appelle…",
      "The capital of the Dominican Republic is…",
    ),
    options: [
      { id: "a", label: lstr("Santiago", "Santiago") },
      { id: "b", label: lstr("Punta Cana", "Punta Cana") },
      { id: "c", label: lstr("Saint-Domingue", "Santo Domingo") },
    ],
    correctOptionId: "c",
    explanation: lstr(
      "La capitale est Saint-Domingue (Santo Domingo). Santiago est la 2e ville et Punta Cana est une zone touristique de l’Est.",
      "The capital is Santo Domingo. Santiago is the second-largest city and Punta Cana is a tourist area on the east coast.",
    ),
  },
  {
    id: "quiz_morning_greeting",
    prompt: lstr(
      "Pour saluer quelqu’un le matin, on dit…",
      "To greet someone in the morning, you say…",
    ),
    options: [
      { id: "a", label: lstr("Buenas noches", "Buenas noches") },
      { id: "b", label: lstr("Buenos días", "Buenos días") },
      { id: "c", label: lstr("Hasta luego", "Hasta luego") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Buenos días » se dit le matin. « Buenas noches » = bonsoir/bonne nuit. « Hasta luego » = à plus tard.",
      "“Buenos días” is for the morning. “Buenas noches” = good evening/good night. “Hasta luego” = see you later.",
    ),
  },
  {
    id: "quiz_mucho_gusto",
    prompt: lstr(
      "« Mucho gusto » veut dire…",
      "“Mucho gusto” means…",
    ),
    options: [
      { id: "a", label: lstr("Enchanté", "Nice to meet you") },
      { id: "b", label: lstr("À demain", "See you tomorrow") },
      { id: "c", label: lstr("Je veux du café", "I want coffee") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Mucho gusto » se dit lorsqu’on rencontre quelqu’un pour la première fois. Littéralement : « beaucoup de plaisir ».",
      "“Mucho gusto” is said when meeting someone for the first time. Literally: “much pleasure.”",
    ),
  },
  {
    id: "quiz_bandera",
    prompt: lstr(
      "Le plat « La Bandera Dominicana » contient souvent…",
      "“La Bandera Dominicana” usually contains…",
    ),
    options: [
      {
        id: "a",
        label: lstr(
          "Riz, haricots et viande",
          "Rice, beans, and meat",
        ),
      },
      {
        id: "b",
        label: lstr(
          "Pâtes, fromage et tomate",
          "Pasta, cheese, and tomato",
        ),
      },
      {
        id: "c",
        label: lstr("Sushi et sauce soya", "Sushi and soy sauce"),
      },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "C’est le plat national du quotidien : arroz blanco, habichuelas rojas, pollo ou carne, souvent avec du plátano frito.",
      "It’s the everyday national dish: arroz blanco, habichuelas rojas, pollo or carne, often with plátano frito.",
    ),
  },
  {
    id: "quiz_que_lo_que",
    prompt: lstr(
      "« ¿Qué lo qué? » est une expression dominicaine qui veut dire…",
      "“¿Qué lo qué?” is a Dominican expression that means…",
    ),
    options: [
      {
        id: "a",
        label: lstr("Combien ça coûte ?", "How much does it cost?"),
      },
      { id: "b", label: lstr("Quoi de neuf ?", "What’s up?") },
      { id: "c", label: lstr("Où est la plage ?", "Where is the beach?") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "Salutation informelle typique en République dominicaine, à utiliser entre amis ou en famille.",
      "Informal greeting that's typical in the Dominican Republic — use it with friends or family.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Intro progress strip
// ─────────────────────────────────────────────────────────────────────────

const introProgress: YoIntroProgressStats = {
  title: lstr(
    "Commence ton intro gratuite",
    "Start your free intro",
  ),
  description: lstr(
    "Cette intro te donne les bases pour comprendre le pays, saluer, te présenter, reconnaître quelques expressions dominicaines et tester ta mémoire avec quiz + flashcards.",
    "This intro gives you the basics to understand the country, greet people, introduce yourself, recognize a few Dominican expressions, and test your memory with the quiz and flashcards.",
  ),
  stats: [
    {
      id: "stat_sections",
      value: 4,
      label: lstr("sections à explorer", "sections to explore"),
    },
    {
      id: "stat_questions",
      value: 5,
      label: lstr("questions de quiz", "quiz questions"),
    },
    {
      id: "stat_flashcards",
      value: 12,
      label: lstr("cartes flash", "flashcards"),
    },
    {
      id: "stat_dialogue",
      value: 1,
      label: lstr("mini-dialogue", "mini-dialogue"),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Marketing features
// ─────────────────────────────────────────────────────────────────────────

const unlockFeatures: YoFeature[] = [
  {
    id: "unlock_modules",
    label: lstr("5 modules complets", "5 full modules"),
    icon: "layers",
  },
  {
    id: "unlock_missions",
    label: lstr("Missions réelles", "Real-world missions"),
    icon: "compass",
  },
  {
    id: "unlock_quiz_audio",
    label: lstr(
      "Quiz + Flashcards + Audio",
      "Quiz + Flashcards + Audio",
    ),
    icon: "headphones",
  },
  {
    id: "unlock_expressions",
    label: lstr(
      "Expressions locales dominicaines",
      "Local Dominican expressions",
    ),
    icon: "sparkles",
  },
  {
    id: "unlock_smart_review",
    label: lstr("Révision intelligente", "Smart review"),
    icon: "shield-check",
  },
  {
    id: "unlock_lifetime",
    label: lstr("Accès à vie", "Lifetime access"),
    icon: "infinity",
  },
];

const bottomFeatures: YoFeature[] = [
  {
    id: "feat_native_audio",
    label: lstr("Audio par des natifs", "Audio by native speakers"),
    icon: "headphones",
  },
  {
    id: "feat_smart_flashcards",
    label: lstr("Flashcards intelligentes", "Smart flashcards"),
    icon: "layers",
  },
  {
    id: "feat_daily_missions",
    label: lstr("Missions du quotidien", "Everyday missions"),
    icon: "compass",
  },
  {
    id: "feat_real_teachers",
    label: lstr(
      "Professeurs réels sur Pratiqo",
      "Real teachers on Pratiqo",
    ),
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
  destinationLabel: lstr("République dominicaine", "Dominican Republic"),
  cefrLevel: "A1",
  priceCents: 2499,
  currency: "CAD",
  freeLessonsCount: 1,
  productLabel: lstr("Yo Pratiqo Voyage", "Yo Pratiqo Voyage"),
  heroTitle: lstr(
    "Espagnol pratique — République dominicaine",
    "Practical Spanish — Dominican Republic",
  ),
  heroSubtitle: lstr(
    "Apprends à vraiment parler sur place, avec culture, expressions locales et missions réelles.",
    "Learn how to actually speak on-site, with culture, local expressions, and real-life missions.",
  ),
  heroVisualHint: "hero-tropical",
  heroImagePath: YO_DO_IMAGES.hero,
  heroImageAlt: YO_DO_IMAGE_ALT.hero,
  cultureImagePath: YO_DO_IMAGES.culture,
  cultureImageAlt: YO_DO_IMAGE_ALT.culture,
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
