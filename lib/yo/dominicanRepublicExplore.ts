/**
 * YoPratiqo - Dominican Republic Spanish - Module 4
 * Getting around and exploring (A1+ / early A2 bridge).
 *
 * Pedagogical contract:
 *   - Level: A1+ moving toward A2. NOT full academic A2 yet.
 *   - Past tense is taught as practical chunks (fui / visite / tome /
 *     camine / compre / saque / me gusto / fue) — not as a full
 *     conjugation chapter.
 *   - More Spanish reading than earlier modules: 3 short texts
 *     (~80-120 Spanish words) with FR + EN comprehension support.
 *   - Workbook-style reinforcement: vocabulary match, fill-in-blank,
 *     verb-chunk practice, reading comprehension, day-trip roleplay.
 *   - Travel-practical: directions, transport, exploration, mini
 *     travel-journal style stories.
 *
 * Strict non-goals:
 *   - No Stripe, payments, Supabase, RLS, migrations, legal copy,
 *     teacher marketplace, Membre Pro, commission logic.
 *   - No MP3 generation, no OpenAI calls, no audio asset imports.
 *   - No PDF generation (the print button uses window.print()).
 *   - Bilingual+: every UI label ships FR + EN + ES via lstr().
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

// ─── Local content types ────────────────────────────────────────────────

/** A stop in the exploration passport (mission map). */
export interface Dom4MissionStop {
  id: string;
  position: number;
  title: YoLocalizedString;
  description: YoLocalizedString;
}

/**
 * A Dominican place / culture card. The `name` is the Spanish-as-rendered
 * label (often a proper noun like "Zona Colonial"); `phrase` is a
 * useful Spanish target sentence connected to the place.
 */
export interface Dom4PlaceCard {
  id: string;
  name: string;
  region: YoLocalizedString;
  description: YoLocalizedString;
  culturalNote: YoLocalizedString;
  /** Useful Spanish target phrase — rendered with lang="es". */
  phrase: string;
}

/** A Spanish travel phrase with bilingual gloss + usage hint. */
export interface Dom4Phrase {
  id: string;
  /** Spanish target — plain string, rendered with lang="es". */
  target: string;
  category: YoLocalizedString;
  translation: YoLocalizedString;
  usage: YoLocalizedString;
}

/** A single spoken line in a dialogue. */
export interface Dom4DialogueLine {
  speaker: YoLocalizedString;
  /** True when the learner is the speaker (right-aligned bubble). */
  isLearner?: boolean;
  /** Spanish target line — rendered with lang="es". */
  target: string;
  translation: YoLocalizedString;
}

/** A guided dialogue (transport / directions / day-trip). */
export interface Dom4Dialogue {
  id: string;
  title: YoLocalizedString;
  scenario: YoLocalizedString;
  lines: Dom4DialogueLine[];
}

/** A short awareness card about Dominican Spanish in transit. */
export interface Dom4EarCard {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
  practicePhrase: string;
}

/**
 * A micro-grammar card. `pattern` is the Spanish formula; `examples`
 * are short Spanish target sentences with bilingual gloss.
 */
export interface Dom4GrammarCard {
  id: string;
  pattern: string;
  meaning: YoLocalizedString;
  examples: Array<{ target: string; translation: YoLocalizedString }>;
  prompt: YoLocalizedString;
}

/** A short Spanish reading text with FR/EN comprehension support. */
export interface Dom4ReadingText {
  id: string;
  title: YoLocalizedString;
  /**
   * Body paragraphs — the learner reads them in Spanish. Each paragraph
   * is a plain Spanish string. We split on paragraphs so the renderer
   * can drop a per-paragraph audio button without re-deriving.
   */
  paragraphs: string[];
  /** Approximate Spanish word count (used for badges / tests). */
  wordCount: number;
  /** Vocabulary anchors highlighted alongside the text. */
  vocabulary: Array<{ target: string; gloss: YoLocalizedString }>;
  /** Comprehension questions with their answers. */
  questions: Array<{
    id: string;
    prompt: YoLocalizedString;
    answer: YoLocalizedString;
  }>;
}

/** Module 4 flashcard. Same target/back/category shape as Module 3. */
export interface Dom4Flashcard {
  id: string;
  category: YoLocalizedString;
  /** Spanish target — rendered with lang="es". */
  front: string;
  back: YoLocalizedString;
}

/** A multiple-choice quiz question. */
export interface Dom4QuizQuestion {
  id: string;
  type: YoLocalizedString;
  prompt: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  explanation: YoLocalizedString;
}

/** A round in the final explorer challenge. */
export interface Dom4GameRound {
  id: string;
  stop: number;
  scenario: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  feedback: YoLocalizedString;
}

/**
 * A printable practice sheet. `kind` lets the renderer dispatch on
 * worksheet type (vocabulary match, fill-in-blank, verb-chunk practice,
 * reading comprehension, roleplay journal).
 */
export type Dom4PrintableKind =
  | "vocabulary"
  | "fill_blank"
  | "verb_chunks"
  | "reading"
  | "roleplay";

export interface Dom4PrintableSheet {
  id: string;
  kind: Dom4PrintableKind;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  /**
   * Prompt items. Renderer interprets them per-kind:
   *  - vocabulary: list of Spanish target ↔ gloss pairs to match.
   *  - fill_blank: list of Spanish prompts containing `____` blanks.
   *  - verb_chunks: list of Spanish sentences targeting one of the 8
   *    practical singular past forms (fui / visite / tome / camine /
   *    compre / saque / me gusto / fue).
   *  - reading: Spanish text to re-read + 5 comprehension prompts.
   *  - roleplay: writing prompts for a planned day trip.
   */
  items: Array<{
    id: string;
    /** Spanish line if the prompt has Spanish target text. */
    target?: string;
    prompt: YoLocalizedString;
    answer: YoLocalizedString;
  }>;
}

/** Top-level Module 4 data aggregate. */
export interface DominicanRepublicExploreData {
  moduleId: string;
  moduleLabel: YoLocalizedString;
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  productLabel: YoLocalizedString;
  audioBrowserNoteShort: YoLocalizedString;
  audioBrowserNoteLong: YoLocalizedString;
  printButtonLabel: YoLocalizedString;
  pastTenseBridgeNote: YoLocalizedString;
  missionStops: Dom4MissionStop[];
  placeCards: Dom4PlaceCard[];
  phraseBank: Dom4Phrase[];
  transportDialogue: Dom4Dialogue;
  directionsDialogue: Dom4Dialogue;
  dayTripDialogue: Dom4Dialogue;
  earCards: Dom4EarCard[];
  grammarCards: Dom4GrammarCard[];
  readingTexts: Dom4ReadingText[];
  flashcards: Dom4Flashcard[];
  quizQuestions: Dom4QuizQuestion[];
  finalGame: {
    title: YoLocalizedString;
    subtitle: YoLocalizedString;
    successMessage: YoLocalizedString;
    rounds: Dom4GameRound[];
  };
  printableSheets: Dom4PrintableSheet[];
}

// ─── Mission map ────────────────────────────────────────────────────────

const missionStops: Dom4MissionStop[] = [
  {
    id: "ask-the-way",
    position: 1,
    title: lstr(
      "Demander son chemin",
      "Ask for directions",
      "Pedir direcciones",
    ),
    description: lstr(
      "Tu apprends à demander où aller, à comprendre la réponse et à confirmer poliment.",
      "You learn to ask where to go, understand the answer, and confirm politely.",
      "Aprendes a preguntar adónde ir, entender la respuesta y confirmar con cortesía.",
    ),
  },
  {
    id: "take-transport",
    position: 2,
    title: lstr(
      "Prendre un taxi ou une guagua",
      "Take a taxi or guagua",
      "Tomar un taxi o una guagua",
    ),
    description: lstr(
      "Monter, indiquer ta destination, demander le prix et la durée du trajet.",
      "Get on, give your destination, ask the fare and travel time.",
      "Subir, indicar tu destino y preguntar precio y duración del viaje.",
    ),
  },
  {
    id: "follow-directions",
    position: 3,
    title: lstr(
      "Comprendre les directions",
      "Understand the directions",
      "Entender las direcciones",
    ),
    description: lstr(
      "Tout droit, à droite, à gauche, près, loin, à côté de…",
      "Straight ahead, right, left, near, far, next to…",
      "Recto, a la derecha, a la izquierda, cerca, lejos, al lado de…",
    ),
  },
  {
    id: "explore-place",
    position: 4,
    title: lstr(
      "Explorer un lieu culturel",
      "Explore a cultural place",
      "Explorar un lugar cultural",
    ),
    description: lstr(
      "Visite la Zona Colonial, Samaná ou Los Haitises et apprends quelques phrases-clés.",
      "Visit the Zona Colonial, Samaná, or Los Haitises and pick up key phrases.",
      "Visita la Zona Colonial, Samaná o Los Haitises y aprende frases clave.",
    ),
  },
  {
    id: "tell-the-trip",
    position: 5,
    title: lstr(
      "Raconter ce que tu as fait",
      "Talk about what you did",
      "Contar lo que hiciste",
    ),
    description: lstr(
      "Quelques chunks pratiques au passé : fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
      "A few useful past-tense chunks: fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
      "Unos cuantos chunks útiles en pasado: fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
    ),
  },
  {
    id: "explorer-challenge",
    position: 6,
    title: lstr(
      "Défi explorateur dominicain",
      "Dominican explorer challenge",
      "Reto explorador dominicano",
    ),
    description: lstr(
      "Une mini-aventure : tu pars en sortie, tu reviens, tu racontes.",
      "A mini-adventure: you head out, come back, and tell the story.",
      "Una mini aventura: sales, regresas y cuentas la historia.",
    ),
  },
];

// ─── Place / culture cards ──────────────────────────────────────────────

const placeCards: Dom4PlaceCard[] = [
  {
    id: "zona-colonial",
    name: "la Zona Colonial",
    region: lstr("Saint-Domingue", "Santo Domingo", "Santo Domingo"),
    description: lstr(
      "Quartier historique de Saint-Domingue, classé UNESCO. Rues pavées, cathédrale, forteresse.",
      "Santo Domingo's UNESCO-listed historic quarter. Cobblestone streets, cathedral, fortress.",
      "Barrio histórico de Santo Domingo, declarado patrimonio. Calles empedradas, catedral, fortaleza.",
    ),
    culturalNote: lstr(
      "C'est la première ville coloniale d'Amérique. Idéal à pied le matin.",
      "It's the first colonial city of the Americas. Best on foot in the morning.",
      "Es la primera ciudad colonial de América. Ideal a pie por la mañana.",
    ),
    phrase: "Voy para la Zona Colonial.",
  },
  {
    id: "los-haitises",
    name: "Los Haitises",
    region: lstr(
      "Côte nord-est, Samaná",
      "North-eastern coast, Samaná",
      "Costa nordeste, Samaná",
    ),
    description: lstr(
      "Parc national : mangroves, grottes taïnos, îlots de calcaire dans la mer.",
      "National park: mangroves, Taíno caves, limestone islets rising from the sea.",
      "Parque nacional: manglares, cuevas taínas, cayos de piedra caliza en el mar.",
    ),
    culturalNote: lstr(
      "On y va surtout en bateau depuis Sabana de la Mar ou Samaná.",
      "Mostly accessed by boat from Sabana de la Mar or Samaná.",
      "Se llega sobre todo en barco desde Sabana de la Mar o Samaná.",
    ),
    phrase: "Quiero visitar Los Haitises.",
  },
  {
    id: "samana",
    name: "Samaná",
    region: lstr("Péninsule de Samaná", "Samaná Peninsula", "Península de Samaná"),
    description: lstr(
      "Plages, cocotiers, cascade El Limón, observation des baleines en hiver.",
      "Beaches, coconut trees, El Limón waterfall, whale watching in winter.",
      "Playas, cocoteros, cascada El Limón, avistamiento de ballenas en invierno.",
    ),
    culturalNote: lstr(
      "De janvier à mars, on peut voir les baleines à bosse.",
      "From January to March, you can see humpback whales.",
      "De enero a marzo se pueden ver las ballenas jorobadas.",
    ),
    phrase: "Ayer fui a Samaná.",
  },
  {
    id: "pico-duarte",
    name: "el Pico Duarte / Jarabacoa",
    region: lstr("Cordillère centrale", "Central highlands", "Cordillera Central"),
    description: lstr(
      "Le plus haut sommet des Antilles (3 098 m). Jarabacoa est la ville-base.",
      "The highest peak in the Caribbean (3,098 m). Jarabacoa is the base town.",
      "La cumbre más alta del Caribe (3 098 m). Jarabacoa es el pueblo base.",
    ),
    culturalNote: lstr(
      "Climat frais en montagne. On peut faire l'ascension en 2 ou 3 jours.",
      "Cool mountain climate. The hike takes 2 or 3 days.",
      "Clima fresco en la montaña. La subida toma 2 o 3 días.",
    ),
    phrase: "Quiero subir al Pico Duarte.",
  },
  {
    id: "bahia-aguilas",
    name: "Bahía de las Águilas",
    region: lstr("Sud-ouest, Pedernales", "South-west, Pedernales", "Suroeste, Pedernales"),
    description: lstr(
      "Plage sauvage protégée, sable blanc, eau turquoise, presque déserte.",
      "Wild protected beach, white sand, turquoise water, almost untouched.",
      "Playa virgen protegida, arena blanca, agua turquesa, casi desierta.",
    ),
    culturalNote: lstr(
      "On y arrive en bateau depuis Cabo Rojo. Pas de service sur place.",
      "Reached by boat from Cabo Rojo. No services on-site.",
      "Se llega en barco desde Cabo Rojo. No hay servicios en la playa.",
    ),
    phrase: "Tomé un bote hasta Bahía de las Águilas.",
  },
  {
    id: "isla-saona",
    name: "Isla Saona",
    region: lstr("Sud-est, Bayahibe", "South-east, Bayahibe", "Sureste, Bayahibe"),
    description: lstr(
      "Île carte-postale : palmiers, étoiles de mer, lagons peu profonds.",
      "Postcard island: palm trees, starfish, shallow lagoons.",
      "Isla de postal: palmeras, estrellas de mar, lagunas poco profundas.",
    ),
    culturalNote: lstr(
      "Excursion classique en catamaran depuis Bayahibe.",
      "Classic catamaran day-trip from Bayahibe.",
      "Excursión clásica en catamarán desde Bayahibe.",
    ),
    phrase: "Saqué fotos en Isla Saona.",
  },
  {
    id: "las-terrenas",
    name: "Las Terrenas",
    region: lstr("Samaná", "Samaná", "Samaná"),
    description: lstr(
      "Village de pêcheurs devenu station balnéaire mixte, ambiance internationale.",
      "Fishing village turned international beach town, mixed crowd.",
      "Pueblo de pescadores hoy convertido en pueblo playero internacional.",
    ),
    culturalNote: lstr(
      "Plages : Playa Bonita, Playa Cosón, Playa El Portillo.",
      "Beaches: Playa Bonita, Playa Cosón, Playa El Portillo.",
      "Playas: Playa Bonita, Playa Cosón, Playa El Portillo.",
    ),
    phrase: "Caminé por Playa Bonita.",
  },
  {
    id: "puerto-plata",
    name: "Puerto Plata",
    region: lstr("Côte nord", "North coast", "Costa norte"),
    description: lstr(
      "Téléphérique du Mont Isabel, vieille ville, malecón en bord de mer.",
      "Mount Isabel cable car, old town, seafront malecón.",
      "Teleférico del monte Isabel, casco viejo, malecón frente al mar.",
    ),
    culturalNote: lstr(
      "Port d'entrée historique vers la côte nord.",
      "Historic entry port to the north coast.",
      "Puerto histórico de entrada a la costa norte.",
    ),
    phrase: "Visité el malecón de Puerto Plata.",
  },
  {
    id: "cabarete",
    name: "Cabarete",
    region: lstr("Côte nord, Puerto Plata", "North coast, Puerto Plata", "Costa norte, Puerto Plata"),
    description: lstr(
      "Capitale dominicaine du kitesurf et de la planche à voile.",
      "Dominican capital of kitesurfing and windsurfing.",
      "Capital dominicana del kitesurf y el windsurf.",
    ),
    culturalNote: lstr(
      "Vent constant l'après-midi, ambiance jeune et sportive.",
      "Steady afternoon wind, young and active vibe.",
      "Viento constante por la tarde, ambiente joven y deportivo.",
    ),
    phrase: "Fui a Cabarete a aprender kitesurf.",
  },
  {
    id: "santiago",
    name: "Santiago",
    region: lstr("Cibao (centre nord)", "Cibao (north-central)", "Cibao (centro-norte)"),
    description: lstr(
      "Deuxième ville du pays, capitale culturelle, monument du héros, carnaval.",
      "Second-largest city, cultural capital, hero monument, carnival.",
      "Segunda ciudad del país, capital cultural, monumento del héroe, carnaval.",
    ),
    culturalNote: lstr(
      "Le carnaval de Santiago en février est célèbre pour ses lechones.",
      "Santiago's February carnival is famous for its lechones masks.",
      "El carnaval de Santiago en febrero es famoso por sus lechones.",
    ),
    phrase: "Visité el Monumento de Santiago.",
  },
  {
    id: "lago-enriquillo",
    name: "Lago Enriquillo",
    region: lstr("Sud-ouest", "South-west", "Suroeste"),
    description: lstr(
      "Lac salé, plus bas point des Antilles. Crocodiles, iguanes, île Cabritos.",
      "Saltwater lake, lowest point in the Caribbean. Crocodiles, iguanas, Cabritos island.",
      "Lago salado, el punto más bajo del Caribe. Cocodrilos, iguanas, isla Cabritos.",
    ),
    culturalNote: lstr(
      "Excursion en bateau autour de l'île Cabritos.",
      "Boat tour around Cabritos island.",
      "Paseo en bote alrededor de la isla Cabritos.",
    ),
    phrase: "Tomé un bote en Lago Enriquillo.",
  },
  {
    id: "larimar-barahona",
    name: "Larimar / Barahona",
    region: lstr("Sud-ouest, Barahona", "South-west, Barahona", "Suroeste, Barahona"),
    description: lstr(
      "Le larimar est une pierre bleue unique au monde, extraite près de Barahona.",
      "Larimar is a blue stone unique to the world, mined near Barahona.",
      "El larimar es una piedra azul única en el mundo, extraída cerca de Barahona.",
    ),
    culturalNote: lstr(
      "Souvenir typique : un petit pendentif en larimar local.",
      "Typical souvenir: a small local larimar pendant.",
      "Recuerdo típico: un pequeño colgante de larimar local.",
    ),
    phrase: "Compré un recuerdo de larimar.",
  },
];

// ─── Phrase bank (40 Spanish travel phrases) ────────────────────────────

const CAT_ASK = lstr("Demander", "Asking", "Preguntar");
const CAT_TRANSPORT = lstr("Transport", "Transport", "Transporte");
const CAT_DIRECTIONS = lstr("Directions", "Directions", "Direcciones");
const CAT_LOCATION = lstr("Localiser", "Locating", "Ubicar");
const CAT_HELP = lstr("Aide", "Help", "Ayuda");
const CAT_PAST = lstr("Passé · raconter", "Past · tell", "Pasado · contar");
const CAT_REACT = lstr("Réagir", "React", "Reaccionar");

const phraseBank: Dom4Phrase[] = [
  {
    id: "ph-como-llego",
    target: "¿Cómo llego a...?",
    category: CAT_ASK,
    translation: lstr("Comment j'arrive à... ?", "How do I get to...?", "¿Cómo llego a...?"),
    usage: lstr(
      "Formule passe-partout pour demander un itinéraire.",
      "All-purpose phrase to ask how to get somewhere.",
      "Frase universal para preguntar cómo llegar.",
    ),
  },
  {
    id: "ph-donde-queda",
    target: "¿Dónde queda...?",
    category: CAT_LOCATION,
    translation: lstr("Où se trouve... ?", "Where is...?", "¿Dónde queda...?"),
    usage: lstr(
      "« Quedar » = être situé, plus naturel que « está » en RD.",
      "\"Quedar\" = to be located — more natural than \"está\" in DR.",
      "\"Quedar\" significa estar situado; muy usado en RD.",
    ),
  },
  {
    id: "ph-esta-lejos",
    target: "¿Está lejos?",
    category: CAT_LOCATION,
    translation: lstr("C'est loin ?", "Is it far?", "¿Está lejos?"),
    usage: lstr(
      "Pour évaluer la distance avant de partir à pied.",
      "To check the distance before walking.",
      "Para evaluar la distancia antes de ir caminando.",
    ),
  },
  {
    id: "ph-cuanto-tiempo",
    target: "¿Cuánto tiempo se tarda?",
    category: CAT_ASK,
    translation: lstr("Combien de temps ça prend ?", "How long does it take?", "¿Cuánto se tarda?"),
    usage: lstr(
      "Idéal pour estimer le trajet en taxi ou en guagua.",
      "Great for estimating taxi or guagua time.",
      "Ideal para estimar el tiempo en taxi o guagua.",
    ),
  },
  {
    id: "ph-cuanto-cuesta",
    target: "¿Cuánto cuesta llegar hasta...?",
    category: CAT_ASK,
    translation: lstr("Combien ça coûte pour aller à... ?", "How much to get to...?", "¿Cuánto cuesta hasta...?"),
    usage: lstr(
      "Demande le prix de la course avant de monter.",
      "Ask the fare before getting in.",
      "Pregunta el precio antes de subir.",
    ),
  },
  {
    id: "ph-donde-pasa",
    target: "¿Dónde pasa la guagua?",
    category: CAT_TRANSPORT,
    translation: lstr("Où passe la guagua ?", "Where does the guagua pass?", "¿Por dónde pasa la guagua?"),
    usage: lstr(
      "« Guagua » = bus / minibus public en RD.",
      "\"Guagua\" = public bus or minibus in the DR.",
      "\"Guagua\" es el bus o minibús público en RD.",
    ),
  },
  {
    id: "ph-donde-taxi",
    target: "¿Dónde puedo tomar un taxi?",
    category: CAT_TRANSPORT,
    translation: lstr("Où puis-je prendre un taxi ?", "Where can I take a taxi?", "¿Dónde tomo un taxi?"),
    usage: lstr(
      "Demande à la réception ou à un local de confiance.",
      "Ask at reception or a trusted local.",
      "Pregunta en la recepción o a un local de confianza.",
    ),
  },
  {
    id: "ph-este-va-a",
    target: "¿Este transporte va a...?",
    category: CAT_TRANSPORT,
    translation: lstr("Ce transport va à... ?", "Does this transport go to...?", "¿Este transporte va a...?"),
    usage: lstr(
      "Confirme la destination avant de monter.",
      "Confirm the destination before boarding.",
      "Confirma el destino antes de subir.",
    ),
  },
  {
    id: "ph-voy-zona",
    target: "Voy para la Zona Colonial.",
    category: CAT_TRANSPORT,
    translation: lstr(
      "Je vais vers la Zona Colonial.",
      "I'm going to the Zona Colonial.",
      "Voy para la Zona Colonial.",
    ),
    usage: lstr(
      "« Voy para... » est très naturel en parler caribéen.",
      "\"Voy para...\" sounds very natural in Caribbean speech.",
      "\"Voy para...\" suena muy natural en el habla caribeña.",
    ),
  },
  {
    id: "ph-voy-samana",
    target: "Voy para Samaná.",
    category: CAT_TRANSPORT,
    translation: lstr("Je vais à Samaná.", "I'm going to Samaná.", "Voy para Samaná."),
    usage: lstr(
      "Indique ta destination au chauffeur dès le départ.",
      "Tell the driver your destination right away.",
      "Indica tu destino al chofer al subir.",
    ),
  },
  {
    id: "ph-quiero-haitises",
    target: "Quiero visitar Los Haitises.",
    category: CAT_PAST,
    translation: lstr(
      "Je veux visiter Los Haitises.",
      "I want to visit Los Haitises.",
      "Quiero visitar Los Haitises.",
    ),
    usage: lstr(
      "« Quiero visitar... » sert pour parler d'une excursion à venir.",
      "\"Quiero visitar...\" lets you talk about an upcoming trip.",
      "\"Quiero visitar...\" sirve para mencionar una excursión próxima.",
    ),
  },
  {
    id: "ph-dejar-aqui",
    target: "¿Me puede dejar aquí?",
    category: CAT_TRANSPORT,
    translation: lstr(
      "Pouvez-vous me déposer ici ?",
      "Can you drop me here?",
      "¿Me puede dejar aquí?",
    ),
    usage: lstr(
      "À utiliser quand tu reconnais la destination.",
      "Use this when you spot your stop.",
      "Úsalo cuando reconoces tu parada.",
    ),
  },
  {
    id: "ph-avisame",
    target: "¿Me avisa cuando lleguemos?",
    category: CAT_TRANSPORT,
    translation: lstr(
      "Pouvez-vous me prévenir quand on arrive ?",
      "Can you tell me when we arrive?",
      "¿Me avisa cuando lleguemos?",
    ),
    usage: lstr(
      "Très utile en guagua ou en taxi en territoire inconnu.",
      "Super useful on a guagua or taxi in unfamiliar areas.",
      "Muy útil en guagua o taxi en zonas que no conoces.",
    ),
  },
  {
    id: "ph-mas-despacio",
    target: "¿Puede ir más despacio?",
    category: CAT_HELP,
    translation: lstr(
      "Pouvez-vous aller plus lentement ?",
      "Can you go more slowly?",
      "¿Puede ir más despacio?",
    ),
    usage: lstr(
      "Pour la conduite ou pour la parole.",
      "Use it for driving or for speech.",
      "Sirve para conducir o para hablar.",
    ),
  },
  {
    id: "ph-parar-aqui",
    target: "¿Puede parar aquí, por favor?",
    category: CAT_TRANSPORT,
    translation: lstr(
      "Pouvez-vous arrêter ici, s'il vous plaît ?",
      "Can you stop here, please?",
      "¿Puede parar aquí, por favor?",
    ),
    usage: lstr(
      "Très utile dans une guagua qui ne s'arrête pas automatiquement.",
      "Useful in a guagua that doesn't stop automatically.",
      "Útil en una guagua que no para sola.",
    ),
  },
  {
    id: "ph-siga-derecho",
    target: "Siga derecho.",
    category: CAT_DIRECTIONS,
    translation: lstr("Continuez tout droit.", "Go straight ahead.", "Siga derecho."),
    usage: lstr(
      "Réponse fréquente quand tu demandes ton chemin.",
      "Common reply when you ask for directions.",
      "Respuesta común cuando preguntas el camino.",
    ),
  },
  {
    id: "ph-doble-derecha",
    target: "Doble a la derecha.",
    category: CAT_DIRECTIONS,
    translation: lstr("Tournez à droite.", "Turn right.", "Doble a la derecha."),
    usage: lstr(
      "« Doble » = tournez (forme polie).",
      "\"Doble\" = turn (polite form).",
      "\"Doble\" es la forma cortés de \"gira\".",
    ),
  },
  {
    id: "ph-doble-izquierda",
    target: "Doble a la izquierda.",
    category: CAT_DIRECTIONS,
    translation: lstr("Tournez à gauche.", "Turn left.", "Doble a la izquierda."),
    usage: lstr(
      "Souvent suivi de « en la próxima esquina ».",
      "Often followed by \"en la próxima esquina\".",
      "Suele ir con \"en la próxima esquina\".",
    ),
  },
  {
    id: "ph-esta-cerca",
    target: "Está cerca.",
    category: CAT_LOCATION,
    translation: lstr("C'est près.", "It's nearby.", "Está cerca."),
    usage: lstr(
      "Réponse rassurante : tu peux y aller à pied.",
      "Reassuring reply — you can walk.",
      "Respuesta tranquila: puedes ir a pie.",
    ),
  },
  {
    id: "ph-esta-lejos-stmt",
    target: "Está lejos.",
    category: CAT_LOCATION,
    translation: lstr("C'est loin.", "It's far.", "Está lejos."),
    usage: lstr(
      "Indique qu'il faudra un transport.",
      "Means you'll need a ride.",
      "Indica que necesitarás transporte.",
    ),
  },
  {
    id: "ph-al-lado-de",
    target: "Está al lado de...",
    category: CAT_LOCATION,
    translation: lstr("C'est à côté de...", "It's next to...", "Está al lado de..."),
    usage: lstr(
      "Pour situer un endroit par rapport à un repère.",
      "Position a place by reference to a landmark.",
      "Sirve para situar un lugar usando una referencia.",
    ),
  },
  {
    id: "ph-frente-a",
    target: "Está frente a...",
    category: CAT_LOCATION,
    translation: lstr("C'est en face de...", "It's across from...", "Está frente a..."),
    usage: lstr(
      "Très précis pour repérer une boutique ou un restaurant.",
      "Very precise to spot a shop or a restaurant.",
      "Muy preciso para ubicar una tienda o un restaurante.",
    ),
  },
  {
    id: "ph-detras-de",
    target: "Está detrás de...",
    category: CAT_LOCATION,
    translation: lstr("C'est derrière...", "It's behind...", "Está detrás de..."),
    usage: lstr(
      "Utile dans les vieilles villes avec des cours.",
      "Helpful in old cities with inner courtyards.",
      "Útil en ciudades viejas con patios interiores.",
    ),
  },
  {
    id: "ph-entre",
    target: "Está entre...",
    category: CAT_LOCATION,
    translation: lstr("C'est entre...", "It's between...", "Está entre..."),
    usage: lstr(
      "Souvent utilisé avec deux noms de rues.",
      "Often used with two street names.",
      "Suele ir con dos nombres de calles.",
    ),
  },
  {
    id: "ph-me-perdi",
    target: "Me perdí.",
    category: CAT_HELP,
    translation: lstr("Je me suis perdu(e).", "I got lost.", "Me perdí."),
    usage: lstr(
      "Phrase courte et claire à utiliser sans gêne.",
      "Short, clear phrase — use it without hesitation.",
      "Frase breve y clara para usar sin vergüenza.",
    ),
  },
  {
    id: "ph-necesito-ayuda",
    target: "Necesito ayuda.",
    category: CAT_HELP,
    translation: lstr("J'ai besoin d'aide.", "I need help.", "Necesito ayuda."),
    usage: lstr(
      "Universelle, polie, comprise partout.",
      "Universal, polite, understood everywhere.",
      "Universal, cortés, entendida en todas partes.",
    ),
  },
  {
    id: "ph-busco-direccion",
    target: "Busco esta dirección.",
    category: CAT_HELP,
    translation: lstr(
      "Je cherche cette adresse.",
      "I'm looking for this address.",
      "Busco esta dirección.",
    ),
    usage: lstr(
      "Montre l'adresse écrite ou sur ton téléphone.",
      "Show the written address or your phone.",
      "Enseña la dirección escrita o el teléfono.",
    ),
  },
  {
    id: "ph-puede-repetir",
    target: "¿Puede repetir, por favor?",
    category: CAT_HELP,
    translation: lstr(
      "Pouvez-vous répéter, s'il vous plaît ?",
      "Can you repeat, please?",
      "¿Puede repetir, por favor?",
    ),
    usage: lstr(
      "À utiliser sans hésiter quand tu n'as pas saisi.",
      "Use it without hesitation when you missed the answer.",
      "Úsalo sin dudar cuando no entiendas.",
    ),
  },
  {
    id: "ph-mas-despacio-please",
    target: "Más despacio, por favor.",
    category: CAT_HELP,
    translation: lstr(
      "Plus lentement, s'il vous plaît.",
      "More slowly, please.",
      "Más despacio, por favor.",
    ),
    usage: lstr(
      "Phrase courte qui débloque presque toutes les conversations.",
      "Short phrase that unblocks almost any conversation.",
      "Frase breve que destraba casi cualquier conversación.",
    ),
  },
  {
    id: "ph-hoy-fui",
    target: "Hoy fui a...",
    category: CAT_PAST,
    translation: lstr("Aujourd'hui je suis allé(e) à...", "Today I went to...", "Hoy fui a..."),
    usage: lstr(
      "« Fui » est un chunk pratique du passé. À mémoriser tel quel.",
      "\"Fui\" is a useful past-tense chunk. Memorize it as is.",
      "\"Fui\" es un chunk práctico del pasado. Apréndelo así.",
    ),
  },
  {
    id: "ph-ayer-fui",
    target: "Ayer fui a...",
    category: CAT_PAST,
    translation: lstr("Hier je suis allé(e) à...", "Yesterday I went to...", "Ayer fui a..."),
    usage: lstr(
      "« Ayer » + « fui » = formule de base pour raconter une sortie.",
      "\"Ayer\" + \"fui\" = the simplest way to tell a past outing.",
      "\"Ayer\" + \"fui\" es la fórmula básica para contar una salida.",
    ),
  },
  {
    id: "ph-visite",
    target: "Visité...",
    category: CAT_PAST,
    translation: lstr("J'ai visité...", "I visited...", "Visité..."),
    usage: lstr(
      "Très utile pour parler des lieux que tu as vus.",
      "Great for places you've seen.",
      "Muy útil para hablar de lugares visitados.",
    ),
  },
  {
    id: "ph-tome-guagua",
    target: "Tomé una guagua.",
    category: CAT_PAST,
    translation: lstr("J'ai pris une guagua.", "I took a guagua.", "Tomé una guagua."),
    usage: lstr(
      "« Tomé » fonctionne avec presque n'importe quel transport.",
      "\"Tomé\" works for almost any kind of transport.",
      "\"Tomé\" sirve con casi cualquier transporte.",
    ),
  },
  {
    id: "ph-tome-taxi",
    target: "Tomé un taxi.",
    category: CAT_PAST,
    translation: lstr("J'ai pris un taxi.", "I took a taxi.", "Tomé un taxi."),
    usage: lstr(
      "Même formule, autre transport.",
      "Same formula, different transport.",
      "Misma fórmula, otro transporte.",
    ),
  },
  {
    id: "ph-camine-zona",
    target: "Caminé por la Zona Colonial.",
    category: CAT_PAST,
    translation: lstr(
      "J'ai marché dans la Zona Colonial.",
      "I walked around the Zona Colonial.",
      "Caminé por la Zona Colonial.",
    ),
    usage: lstr(
      "« Caminé por... » = j'ai marché dans / le long de...",
      "\"Caminé por...\" = I walked around / along...",
      "\"Caminé por...\" = caminé en / a lo largo de...",
    ),
  },
  {
    id: "ph-compre-recuerdo",
    target: "Compré un recuerdo.",
    category: CAT_PAST,
    translation: lstr("J'ai acheté un souvenir.", "I bought a souvenir.", "Compré un recuerdo."),
    usage: lstr(
      "Pratique pour parler des achats locaux.",
      "Handy for local purchases.",
      "Útil para hablar de compras locales.",
    ),
  },
  {
    id: "ph-saque-fotos",
    target: "Saqué fotos.",
    category: CAT_PAST,
    translation: lstr("J'ai pris des photos.", "I took pictures.", "Saqué fotos."),
    usage: lstr(
      "« Saqué fotos » est plus naturel que « tomé fotos » en RD.",
      "\"Saqué fotos\" sounds more natural than \"tomé fotos\" in DR.",
      "\"Saqué fotos\" suena más natural que \"tomé fotos\" en RD.",
    ),
  },
  {
    id: "ph-me-gusto",
    target: "Me gustó mucho.",
    category: CAT_REACT,
    translation: lstr("Ça m'a beaucoup plu.", "I liked it a lot.", "Me gustó mucho."),
    usage: lstr(
      "Réaction simple et passe-partout après une visite.",
      "Simple all-purpose reaction after a visit.",
      "Reacción simple y útil después de una visita.",
    ),
  },
  {
    id: "ph-fue-bonito",
    target: "Fue muy bonito.",
    category: CAT_REACT,
    translation: lstr("C'était très joli.", "It was very nice.", "Fue muy bonito."),
    usage: lstr(
      "« Fue » est un autre chunk pratique du passé.",
      "\"Fue\" is another useful past-tense chunk.",
      "\"Fue\" es otro chunk práctico del pasado.",
    ),
  },
  {
    id: "ph-quiero-volver",
    target: "Quiero volver.",
    category: CAT_REACT,
    translation: lstr("Je veux revenir.", "I want to come back.", "Quiero volver."),
    usage: lstr(
      "Manière naturelle de clore le récit d'une excursion.",
      "Natural way to close a trip story.",
      "Manera natural de cerrar el relato de una excursión.",
    ),
  },
];

// ─── Dialogues ──────────────────────────────────────────────────────────

const SPK_TRAVELER = lstr("Voyageur", "Traveler", "Viajero");
const SPK_LOCAL = lstr("Locale", "Local", "Local");
const SPK_FRIEND = lstr("Ami", "Friend", "Amigo");

const transportDialogue: Dom4Dialogue = {
  id: "dlg-transport",
  title: lstr(
    "Prendre la guagua vers la Zona Colonial",
    "Taking the guagua to the Zona Colonial",
    "Tomar la guagua a la Zona Colonial",
  ),
  scenario: lstr(
    "Tu es à un coin de rue à Saint-Domingue et tu veux prendre la guagua.",
    "You're at a Santo Domingo street corner and you want to take the guagua.",
    "Estás en una esquina de Santo Domingo y quieres tomar la guagua.",
  ),
  lines: [
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Hola. ¿Dónde pasa la guagua para la Zona Colonial?",
      translation: lstr(
        "Bonjour. Où passe la guagua pour la Zona Colonial ?",
        "Hi. Where does the guagua to the Zona Colonial pass?",
        "Hola. ¿Dónde pasa la guagua para la Zona Colonial?",
      ),
    },
    {
      speaker: SPK_LOCAL,
      target: "Pasa por esa esquina.",
      translation: lstr(
        "Elle passe à ce coin de rue.",
        "It passes at that corner.",
        "Pasa por esa esquina.",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Gracias. ¿Cuánto tiempo se tarda?",
      translation: lstr(
        "Merci. Combien de temps ça prend ?",
        "Thanks. How long does it take?",
        "Gracias. ¿Cuánto se tarda?",
      ),
    },
    {
      speaker: SPK_LOCAL,
      target: "Más o menos veinte minutos.",
      translation: lstr(
        "À peu près vingt minutes.",
        "About twenty minutes.",
        "Más o menos veinte minutos.",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Perfecto. ¿Me avisa cuando lleguemos?",
      translation: lstr(
        "Parfait. Vous pouvez me prévenir quand on arrive ?",
        "Perfect. Can you let me know when we arrive?",
        "Perfecto. ¿Me avisa cuando lleguemos?",
      ),
    },
    {
      speaker: SPK_LOCAL,
      target: "Claro, no hay problema.",
      translation: lstr(
        "Bien sûr, pas de problème.",
        "Of course, no problem.",
        "Claro, no hay problema.",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Gracias, muy amable.",
      translation: lstr("Merci, très aimable.", "Thanks, very kind.", "Gracias, muy amable."),
    },
  ],
};

const directionsDialogue: Dom4Dialogue = {
  id: "dlg-directions",
  title: lstr(
    "Demander son chemin vers le musée",
    "Asking the way to the museum",
    "Pedir el camino al museo",
  ),
  scenario: lstr(
    "Tu cherches un musée dans la Zona Colonial et tu demandes ton chemin à un local.",
    "You're looking for a museum in the Zona Colonial and ask a local for directions.",
    "Buscas un museo en la Zona Colonial y le preguntas a un local.",
  ),
  lines: [
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Disculpe. ¿Cómo llego al museo?",
      translation: lstr(
        "Pardon. Comment je vais au musée ?",
        "Excuse me. How do I get to the museum?",
        "Disculpe. ¿Cómo llego al museo?",
      ),
    },
    {
      speaker: SPK_LOCAL,
      target: "Siga derecho y doble a la derecha.",
      translation: lstr(
        "Continuez tout droit et tournez à droite.",
        "Go straight and turn right.",
        "Siga derecho y doble a la derecha.",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "¿Está lejos?",
      translation: lstr("C'est loin ?", "Is it far?", "¿Está lejos?"),
    },
    {
      speaker: SPK_LOCAL,
      target: "No, está cerca. Está frente al parque.",
      translation: lstr(
        "Non, c'est près. C'est en face du parc.",
        "No, it's nearby. It's across from the park.",
        "No, está cerca. Está frente al parque.",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Perfecto, gracias.",
      translation: lstr("Parfait, merci.", "Perfect, thanks.", "Perfecto, gracias."),
    },
    {
      speaker: SPK_LOCAL,
      target: "De nada.",
      translation: lstr("De rien.", "You're welcome.", "De nada."),
    },
  ],
};

const dayTripDialogue: Dom4Dialogue = {
  id: "dlg-day-trip",
  title: lstr(
    "Raconter une excursion à Samaná",
    "Telling about a Samaná day-trip",
    "Contar una excursión a Samaná",
  ),
  scenario: lstr(
    "Tu rentres d'une excursion. Un ami te demande comment ça s'est passé.",
    "You're back from a day-trip. A friend asks how it went.",
    "Vuelves de una excursión y un amigo te pregunta qué tal.",
  ),
  lines: [
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Ayer fui a Samaná.",
      translation: lstr(
        "Hier je suis allé(e) à Samaná.",
        "Yesterday I went to Samaná.",
        "Ayer fui a Samaná.",
      ),
    },
    {
      speaker: SPK_FRIEND,
      target: "¿Y qué hiciste?",
      translation: lstr(
        "Et qu'est-ce que tu as fait ?",
        "And what did you do?",
        "¿Y qué hiciste?",
      ),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Tomé una guagua, saqué fotos y comí pescado frito.",
      translation: lstr(
        "J'ai pris une guagua, j'ai pris des photos et j'ai mangé du poisson frit.",
        "I took a guagua, took photos, and ate fried fish.",
        "Tomé una guagua, saqué fotos y comí pescado frito.",
      ),
    },
    {
      speaker: SPK_FRIEND,
      target: "¿Te gustó?",
      translation: lstr("Ça t'a plu ?", "Did you like it?", "¿Te gustó?"),
    },
    {
      speaker: SPK_TRAVELER,
      isLearner: true,
      target: "Sí, me gustó mucho. Fue muy bonito.",
      translation: lstr(
        "Oui, ça m'a beaucoup plu. C'était très joli.",
        "Yes, I liked it a lot. It was very nice.",
        "Sí, me gustó mucho. Fue muy bonito.",
      ),
    },
  ],
};

// ─── Dominican ears (transport awareness cards) ─────────────────────────

const earCards: Dom4EarCard[] = [
  {
    id: "ear-fast-transit",
    title: lstr(
      "L'espagnol dominicain est rapide en transit",
      "Dominican Spanish is fast in transit",
      "El español dominicano corre rápido en el transporte",
    ),
    description: lstr(
      "Les chauffeurs et passagers parlent vite. Demande sans gêne « Más despacio, por favor ».",
      "Drivers and passengers speak fast. Don't hesitate to say \"Más despacio, por favor\".",
      "Los choferes y pasajeros hablan rápido. Sin pena: \"Más despacio, por favor\".",
    ),
    practicePhrase: "Más despacio, por favor.",
  },
  {
    id: "ear-voy-para",
    title: lstr(
      "« Voy para... » sonne caribéen",
      "\"Voy para...\" sounds Caribbean",
      "\"Voy para...\" suena caribeño",
    ),
    description: lstr(
      "« Voy para la playa » plutôt que « voy a la playa » : c'est l'usage local pour parler de destination.",
      "\"Voy para la playa\" is more common than \"voy a la playa\" — it's the local way to mark destination.",
      "\"Voy para la playa\" es más común que \"voy a la playa\" en el habla local.",
    ),
    practicePhrase: "Voy para la Zona Colonial.",
  },
  {
    id: "ear-guagua",
    title: lstr(
      "« Guagua » = bus / minibus public",
      "\"Guagua\" = bus / public minibus",
      "\"Guagua\" = bus o minibús público",
    ),
    description: lstr(
      "C'est le mot dominicain pour un autobus public ou un minibus partagé.",
      "It's the Dominican word for a public bus or shared minibus.",
      "Es la palabra dominicana para el autobús o minibús compartido.",
    ),
    practicePhrase: "¿Dónde pasa la guagua?",
  },
  {
    id: "ear-avisame",
    title: lstr(
      "Demande au chauffeur de t'avertir",
      "Ask the driver to alert you",
      "Pídele al chofer que te avise",
    ),
    description: lstr(
      "Les arrêts ne sont pas toujours indiqués. « ¿Me avisa cuando lleguemos? » te sauve la mise.",
      "Stops aren't always announced. \"¿Me avisa cuando lleguemos?\" saves the day.",
      "Las paradas no se anuncian siempre. \"¿Me avisa cuando lleguemos?\" te ayuda muchísimo.",
    ),
    practicePhrase: "¿Me avisa cuando lleguemos?",
  },
  {
    id: "ear-mas-despacio-natural",
    title: lstr(
      "« Más despacio, por favor » : à utiliser partout",
      "\"Más despacio, por favor\" — use it everywhere",
      "\"Más despacio, por favor\" — úsala en todas partes",
    ),
    description: lstr(
      "Tu peux l'employer pour un chauffeur ou pour un local qui parle vite.",
      "Use it for a driver, or a fast-talking local.",
      "Úsala con un chofer o con un local que hable rápido.",
    ),
    practicePhrase: "Más despacio, por favor.",
  },
];

// ─── Micro-grammar cards ────────────────────────────────────────────────

const grammarCards: Dom4GrammarCard[] = [
  {
    id: "g-como-llego",
    pattern: "¿Cómo llego a + [lugar]?",
    meaning: lstr(
      "Demander comment se rendre quelque part.",
      "Ask how to get somewhere.",
      "Preguntar cómo llegar a un lugar.",
    ),
    examples: [
      {
        target: "¿Cómo llego a la Zona Colonial?",
        translation: lstr(
          "Comment j'arrive à la Zona Colonial ?",
          "How do I get to the Zona Colonial?",
          "¿Cómo llego a la Zona Colonial?",
        ),
      },
      {
        target: "¿Cómo llego al museo?",
        translation: lstr(
          "Comment j'arrive au musée ?",
          "How do I get to the museum?",
          "¿Cómo llego al museo?",
        ),
      },
    ],
    prompt: lstr(
      "Compose une question pour aller à Samaná.",
      "Form a question to go to Samaná.",
      "Forma una pregunta para ir a Samaná.",
    ),
  },
  {
    id: "g-donde-queda",
    pattern: "¿Dónde queda + [lugar]?",
    meaning: lstr(
      "Localiser un lieu (« quedar » = être situé en RD).",
      "Locate a place (\"quedar\" = to be located in DR Spanish).",
      "Ubicar un lugar (\"quedar\" en RD).",
    ),
    examples: [
      {
        target: "¿Dónde queda el parque?",
        translation: lstr("Où est le parc ?", "Where is the park?", "¿Dónde queda el parque?"),
      },
      {
        target: "¿Dónde queda Samaná?",
        translation: lstr("Où se trouve Samaná ?", "Where is Samaná?", "¿Dónde queda Samaná?"),
      },
    ],
    prompt: lstr(
      "Demande où se trouve la plage.",
      "Ask where the beach is.",
      "Pregunta dónde queda la playa.",
    ),
  },
  {
    id: "g-voy-para",
    pattern: "Voy para + [destino]",
    meaning: lstr(
      "Indiquer ta destination de manière naturelle dans les Caraïbes.",
      "Tell your destination the Caribbean way.",
      "Decir tu destino de manera natural en el Caribe.",
    ),
    examples: [
      {
        target: "Voy para Samaná.",
        translation: lstr("Je vais à Samaná.", "I'm going to Samaná.", "Voy para Samaná."),
      },
      {
        target: "Voy para la playa.",
        translation: lstr("Je vais à la plage.", "I'm going to the beach.", "Voy para la playa."),
      },
    ],
    prompt: lstr(
      "Dis que tu vas à Cabarete.",
      "Say you're going to Cabarete.",
      "Di que vas para Cabarete.",
    ),
  },
  {
    id: "g-cuanto-tiempo",
    pattern: "¿Cuánto tiempo se tarda + (en + verbo)?",
    meaning: lstr(
      "Demander la durée d'un trajet ou d'une activité.",
      "Ask how long something takes.",
      "Preguntar cuánto se tarda en algo.",
    ),
    examples: [
      {
        target: "¿Cuánto tiempo se tarda en llegar?",
        translation: lstr(
          "Combien de temps pour arriver ?",
          "How long to arrive?",
          "¿Cuánto se tarda en llegar?",
        ),
      },
      {
        target: "¿Cuánto tiempo se tarda en taxi?",
        translation: lstr(
          "Combien de temps en taxi ?",
          "How long by taxi?",
          "¿Cuánto se tarda en taxi?",
        ),
      },
    ],
    prompt: lstr(
      "Demande la durée du trajet.",
      "Ask how long the trip takes.",
      "Pregunta cuánto se tarda el viaje.",
    ),
  },
  {
    id: "g-cerca-lejos",
    pattern: "Está cerca / lejos / al lado de / frente a / detrás de / entre",
    meaning: lstr(
      "Situer un endroit par rapport à un repère.",
      "Place a location relative to a landmark.",
      "Ubicar un lugar respecto a una referencia.",
    ),
    examples: [
      {
        target: "Está al lado del parque.",
        translation: lstr(
          "C'est à côté du parc.",
          "It's next to the park.",
          "Está al lado del parque.",
        ),
      },
      {
        target: "Está frente al museo.",
        translation: lstr(
          "C'est en face du musée.",
          "It's across from the museum.",
          "Está frente al museo.",
        ),
      },
    ],
    prompt: lstr(
      "Dis qu'un café est entre deux rues.",
      "Say a café is between two streets.",
      "Di que un café está entre dos calles.",
    ),
  },
  {
    id: "g-siga-doble",
    pattern: "Siga / doble (forme polie « usted »)",
    meaning: lstr(
      "Comprendre les instructions polies pour les directions.",
      "Understand polite directions.",
      "Entender direcciones formales.",
    ),
    examples: [
      {
        target: "Siga derecho dos cuadras.",
        translation: lstr(
          "Continuez tout droit pendant deux pâtés de maisons.",
          "Go straight for two blocks.",
          "Siga derecho dos cuadras.",
        ),
      },
      {
        target: "Doble a la izquierda en la próxima esquina.",
        translation: lstr(
          "Tournez à gauche au prochain coin.",
          "Turn left at the next corner.",
          "Doble a la izquierda en la próxima esquina.",
        ),
      },
    ],
    prompt: lstr(
      "Comprends « siga derecho y doble a la derecha ».",
      "Understand \"siga derecho y doble a la derecha\".",
      "Entiende \"siga derecho y doble a la derecha\".",
    ),
  },
  {
    id: "g-me-perdi",
    pattern: "Me perdí.",
    meaning: lstr(
      "Annoncer qu'on est perdu (chunk passé · 1re personne).",
      "Say you're lost (1st-person past chunk).",
      "Decir que te perdiste (chunk de pasado · 1ª persona).",
    ),
    examples: [
      {
        target: "Disculpe, me perdí.",
        translation: lstr("Pardon, je me suis perdu(e).", "Sorry, I got lost.", "Disculpe, me perdí."),
      },
      {
        target: "Me perdí cerca del parque.",
        translation: lstr(
          "Je me suis perdu(e) près du parc.",
          "I got lost near the park.",
          "Me perdí cerca del parque.",
        ),
      },
    ],
    prompt: lstr(
      "Dis poliment que tu t'es perdu(e).",
      "Politely say you got lost.",
      "Di con cortesía que te perdiste.",
    ),
  },
  {
    id: "g-hoy-fui",
    pattern: "Hoy fui a + [lugar]",
    meaning: lstr(
      "Raconter une sortie d'aujourd'hui (chunk passé).",
      "Talk about today's outing (past chunk).",
      "Contar una salida de hoy (chunk de pasado).",
    ),
    examples: [
      {
        target: "Hoy fui a la playa.",
        translation: lstr(
          "Aujourd'hui je suis allé(e) à la plage.",
          "Today I went to the beach.",
          "Hoy fui a la playa.",
        ),
      },
      {
        target: "Hoy fui al colmado.",
        translation: lstr(
          "Aujourd'hui je suis allé(e) au colmado.",
          "Today I went to the colmado.",
          "Hoy fui al colmado.",
        ),
      },
    ],
    prompt: lstr(
      "Raconte que tu es allé(e) à la Zona Colonial aujourd'hui.",
      "Say you went to the Zona Colonial today.",
      "Di que hoy fuiste a la Zona Colonial.",
    ),
  },
  {
    id: "g-ayer-fui",
    pattern: "Ayer fui a + [lugar]",
    meaning: lstr(
      "Raconter une sortie d'hier (chunk passé).",
      "Talk about yesterday's outing (past chunk).",
      "Contar una salida de ayer (chunk de pasado).",
    ),
    examples: [
      {
        target: "Ayer fui a Samaná.",
        translation: lstr(
          "Hier je suis allé(e) à Samaná.",
          "Yesterday I went to Samaná.",
          "Ayer fui a Samaná.",
        ),
      },
      {
        target: "Ayer fui al parque.",
        translation: lstr(
          "Hier je suis allé(e) au parc.",
          "Yesterday I went to the park.",
          "Ayer fui al parque.",
        ),
      },
    ],
    prompt: lstr(
      "Raconte une excursion d'hier.",
      "Tell about yesterday's trip.",
      "Cuenta una excursión de ayer.",
    ),
  },
  {
    id: "g-action-chunks",
    pattern: "Tomé / visité / caminé / compré / saqué",
    meaning: lstr(
      "Cinq chunks d'action utiles au passé (1re personne du singulier).",
      "Five useful past-tense action chunks (1st-person singular).",
      "Cinco chunks útiles en pasado (1ª persona del singular).",
    ),
    examples: [
      {
        target: "Tomé una guagua y visité el museo.",
        translation: lstr(
          "J'ai pris une guagua et j'ai visité le musée.",
          "I took a guagua and visited the museum.",
          "Tomé una guagua y visité el museo.",
        ),
      },
      {
        target: "Caminé por la Zona Colonial y saqué fotos.",
        translation: lstr(
          "J'ai marché dans la Zona Colonial et j'ai pris des photos.",
          "I walked around the Zona Colonial and took pictures.",
          "Caminé por la Zona Colonial y saqué fotos.",
        ),
      },
      {
        target: "Compré un recuerdo de larimar.",
        translation: lstr(
          "J'ai acheté un souvenir en larimar.",
          "I bought a larimar souvenir.",
          "Compré un recuerdo de larimar.",
        ),
      },
    ],
    prompt: lstr(
      "Combine deux chunks pour raconter ta journée.",
      "Combine two chunks to tell your day.",
      "Combina dos chunks para contar tu día.",
    ),
  },
  {
    id: "g-me-gusto-fue",
    pattern: "Me gustó / Fue + [adjetivo]",
    meaning: lstr(
      "Réagir simplement après une visite.",
      "React simply after a visit.",
      "Reaccionar de manera simple tras una visita.",
    ),
    examples: [
      {
        target: "Me gustó mucho.",
        translation: lstr(
          "Ça m'a beaucoup plu.",
          "I liked it a lot.",
          "Me gustó mucho.",
        ),
      },
      {
        target: "Fue muy bonito.",
        translation: lstr(
          "C'était très joli.",
          "It was very nice.",
          "Fue muy bonito.",
        ),
      },
      {
        target: "Fue divertido.",
        translation: lstr("C'était amusant.", "It was fun.", "Fue divertido."),
      },
    ],
    prompt: lstr(
      "Réagis à une excursion réussie.",
      "React to a successful trip.",
      "Reacciona a una excursión que te gustó.",
    ),
  },
];

const pastTenseBridgeNote: YoLocalizedString = lstr(
  "On commence ici à reconnaître quelques formes utiles du passé. L'objectif n'est pas de tout conjuguer, mais de raconter une petite sortie.",
  "Here you start recognizing a few useful past-tense forms. The goal is not full conjugation yet, but describing a short outing.",
  "Aquí empiezas a reconocer algunas formas útiles del pasado. El objetivo no es conjugar todo todavía, sino contar una pequeña salida.",
);

// ─── Reading texts (Spanish-first, 80–120 words each) ───────────────────

const readingTexts: Dom4ReadingText[] = [
  {
    id: "reading-zona-colonial",
    title: lstr(
      "Un día en la Zona Colonial",
      "A day in the Zona Colonial",
      "Un día en la Zona Colonial",
    ),
    paragraphs: [
      "Hoy fui a la Zona Colonial de Santo Domingo. Tomé una guagua desde mi hotel hasta el Parque Colón. Caminé por la calle El Conde y visité la catedral. Después saqué fotos del fuerte Ozama frente al río.",
      "En una pequeña tienda compré un recuerdo de larimar. Una señora muy amable me dijo: «Doble a la derecha y siga derecho hasta el museo». Llegué bien y entré sin problema.",
      "Al final del día fui a un café cerca del parque. Me gustó mucho la tarde. Fue tranquilo y muy bonito. Mañana quiero volver para visitar otro museo.",
    ],
    wordCount: 102,
    vocabulary: [
      {
        target: "tomé una guagua",
        gloss: lstr(
          "j'ai pris une guagua",
          "I took a guagua",
          "tomé una guagua",
        ),
      },
      {
        target: "caminé por",
        gloss: lstr(
          "j'ai marché dans / le long de",
          "I walked along",
          "caminé por",
        ),
      },
      {
        target: "saqué fotos",
        gloss: lstr("j'ai pris des photos", "I took photos", "saqué fotos"),
      },
      {
        target: "compré un recuerdo",
        gloss: lstr(
          "j'ai acheté un souvenir",
          "I bought a souvenir",
          "compré un recuerdo",
        ),
      },
      {
        target: "doble a la derecha",
        gloss: lstr(
          "tournez à droite",
          "turn right",
          "doble a la derecha",
        ),
      },
      {
        target: "me gustó mucho",
        gloss: lstr(
          "ça m'a beaucoup plu",
          "I liked it a lot",
          "me gustó mucho",
        ),
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: lstr(
          "Comment le voyageur est-il arrivé au Parque Colón ?",
          "How did the traveler reach Parque Colón?",
          "¿Cómo llegó el viajero al Parque Colón?",
        ),
        answer: lstr(
          "Il a pris une guagua (« tomé una guagua »).",
          "He took a guagua (\"tomé una guagua\").",
          "Tomó una guagua.",
        ),
      },
      {
        id: "q2",
        prompt: lstr(
          "Quel souvenir a-t-il acheté ?",
          "Which souvenir did he buy?",
          "¿Qué recuerdo compró?",
        ),
        answer: lstr(
          "Un souvenir en larimar.",
          "A larimar souvenir.",
          "Un recuerdo de larimar.",
        ),
      },
      {
        id: "q3",
        prompt: lstr(
          "Quelle direction la dame lui a-t-elle indiquée ?",
          "Which direction did the lady give him?",
          "¿Qué dirección le indicó la señora?",
        ),
        answer: lstr(
          "Tourner à droite et continuer tout droit jusqu'au musée.",
          "Turn right, then go straight to the museum.",
          "Doblar a la derecha y seguir derecho hasta el museo.",
        ),
      },
      {
        id: "q4",
        prompt: lstr(
          "Comment a-t-il décrit sa journée ?",
          "How did he describe his day?",
          "¿Cómo describió su día?",
        ),
        answer: lstr(
          "Calme et très joli (« tranquilo y muy bonito »).",
          "Quiet and very nice (\"tranquilo y muy bonito\").",
          "Tranquilo y muy bonito.",
        ),
      },
    ],
  },
  {
    id: "reading-samana",
    title: lstr(
      "Una excursión a Samaná",
      "A trip to Samaná",
      "Una excursión a Samaná",
    ),
    paragraphs: [
      "Ayer fui a Samaná con dos amigos. Salimos temprano y tomamos una guagua hasta la terminal. Después tomé un taxi pequeño hasta la cascada El Limón. El camino fue largo, pero muy bonito.",
      "En la cascada caminé un poco y saqué muchas fotos. Una guía local me dijo: «Está cerca, doble a la izquierda en el sendero». Llegamos bien y nos bañamos un rato en el agua fresca.",
      "Más tarde comimos pescado frito frente al mar. Compré una pulsera de recuerdo. Me gustó mucho el día. Fue una excursión tranquila. Quiero volver pronto a Samaná en otra estación.",
    ],
    wordCount: 109,
    vocabulary: [
      {
        target: "ayer fui",
        gloss: lstr("hier je suis allé(e)", "yesterday I went", "ayer fui"),
      },
      {
        target: "tomé un taxi",
        gloss: lstr("j'ai pris un taxi", "I took a taxi", "tomé un taxi"),
      },
      {
        target: "está cerca",
        gloss: lstr("c'est près", "it's nearby", "está cerca"),
      },
      {
        target: "doble a la izquierda",
        gloss: lstr(
          "tournez à gauche",
          "turn left",
          "doble a la izquierda",
        ),
      },
      {
        target: "fue una excursión",
        gloss: lstr(
          "c'était une excursion",
          "it was a trip",
          "fue una excursión",
        ),
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: lstr(
          "Quand le voyageur est-il allé à Samaná ?",
          "When did the traveler go to Samaná?",
          "¿Cuándo fue el viajero a Samaná?",
        ),
        answer: lstr("Hier (« ayer »).", "Yesterday (\"ayer\").", "Ayer."),
      },
      {
        id: "q2",
        prompt: lstr(
          "Quels transports a-t-il utilisés ?",
          "Which transports did he use?",
          "¿Qué transportes usó?",
        ),
        answer: lstr(
          "Une guagua puis un taxi.",
          "A guagua and then a taxi.",
          "Una guagua y luego un taxi.",
        ),
      },
      {
        id: "q3",
        prompt: lstr(
          "Que lui a dit la guide locale ?",
          "What did the local guide tell him?",
          "¿Qué le dijo la guía local?",
        ),
        answer: lstr(
          "« Está cerca, doble a la izquierda en el sendero. »",
          "\"Está cerca, doble a la izquierda en el sendero.\"",
          "\"Está cerca, doble a la izquierda en el sendero.\"",
        ),
      },
      {
        id: "q4",
        prompt: lstr(
          "Qu'a-t-il acheté comme souvenir ?",
          "Which souvenir did he buy?",
          "¿Qué recuerdo compró?",
        ),
        answer: lstr(
          "Un bracelet (« una pulsera »).",
          "A bracelet (\"una pulsera\").",
          "Una pulsera.",
        ),
      },
    ],
  },
  {
    id: "reading-camino-hotel",
    title: lstr(
      "Camino al hotel en guagua",
      "Heading back to the hotel by guagua",
      "Camino al hotel en guagua",
    ),
    paragraphs: [
      "Hoy fui al malecón de Puerto Plata. Caminé un poco y saqué fotos del mar. Después tomé una guagua para volver al hotel. La guagua estaba llena, pero el chofer fue muy amable.",
      "Le dije al chofer: «Voy para el hotel cerca del parque. ¿Me avisa cuando lleguemos?» Él me dijo: «Claro, no hay problema. Está cerca, son cinco minutos».",
      "Cuando llegamos, doblé a la derecha y caminé dos cuadras. Compré una botella de agua en un colmado. Me gustó mucho el día. Fue tranquilo y muy bonito.",
    ],
    wordCount: 95,
    vocabulary: [
      {
        target: "voy para",
        gloss: lstr(
          "je vais (vers / pour)",
          "I'm heading to",
          "voy para",
        ),
      },
      {
        target: "¿me avisa cuando lleguemos?",
        gloss: lstr(
          "vous me prévenez quand on arrive ?",
          "can you let me know when we arrive?",
          "¿me avisa cuando lleguemos?",
        ),
      },
      {
        target: "doblé a la derecha",
        gloss: lstr(
          "j'ai tourné à droite",
          "I turned right",
          "doblé a la derecha",
        ),
      },
      {
        target: "compré agua",
        gloss: lstr(
          "j'ai acheté de l'eau",
          "I bought water",
          "compré agua",
        ),
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: lstr(
          "Où le voyageur est-il allé en début de journée ?",
          "Where did the traveler go at the start of the day?",
          "¿Adónde fue el viajero al inicio del día?",
        ),
        answer: lstr(
          "Au malecón de Puerto Plata.",
          "To the Puerto Plata malecón.",
          "Al malecón de Puerto Plata.",
        ),
      },
      {
        id: "q2",
        prompt: lstr(
          "Que demande-t-il au chauffeur ?",
          "What does he ask the driver?",
          "¿Qué le pide al chofer?",
        ),
        answer: lstr(
          "De le prévenir quand on arrive.",
          "To let him know when they arrive.",
          "Que le avise cuando lleguen.",
        ),
      },
      {
        id: "q3",
        prompt: lstr(
          "Qu'a-t-il acheté en chemin ?",
          "What did he buy on the way?",
          "¿Qué compró en el camino?",
        ),
        answer: lstr(
          "Une bouteille d'eau dans un colmado.",
          "A bottle of water at a colmado.",
          "Una botella de agua en un colmado.",
        ),
      },
      {
        id: "q4",
        prompt: lstr(
          "Comment décrit-il sa journée ?",
          "How does he describe his day?",
          "¿Cómo describe su día?",
        ),
        answer: lstr(
          "Calme et très joli (« tranquilo y muy bonito »).",
          "Quiet and very nice (\"tranquilo y muy bonito\").",
          "Tranquilo y muy bonito.",
        ),
      },
    ],
  },
];

// ─── Flashcards (40 cards, RD-intro visual style) ───────────────────────

const FC_TRANSPORT = lstr("Transport", "Transport", "Transporte");
const FC_DIRECTIONS = lstr("Directions", "Directions", "Direcciones");
const FC_PLACES = lstr("Lieux", "Places", "Lugares");
const FC_PAST = lstr("Passé · chunks", "Past · chunks", "Pasado · chunks");
const FC_VERBS = lstr("Verbes utiles", "Useful verbs", "Verbos útiles");
const FC_EXPLORE = lstr("Exploration", "Exploration", "Exploración");

const flashcards: Dom4Flashcard[] = [
  { id: "fc-guagua", category: FC_TRANSPORT, front: "la guagua", back: lstr("le bus / minibus public", "the bus / public minibus", "el autobús / minibús público") },
  { id: "fc-taxi", category: FC_TRANSPORT, front: "el taxi", back: lstr("le taxi", "the taxi", "el taxi") },
  { id: "fc-transporte", category: FC_TRANSPORT, front: "el transporte", back: lstr("le transport", "the transport", "el transporte") },
  { id: "fc-esquina", category: FC_DIRECTIONS, front: "la esquina", back: lstr("le coin de rue", "the street corner", "la esquina") },
  { id: "fc-direccion", category: FC_DIRECTIONS, front: "la dirección", back: lstr("l'adresse / la direction", "the address / direction", "la dirección") },
  { id: "fc-parque", category: FC_PLACES, front: "el parque", back: lstr("le parc", "the park", "el parque") },
  { id: "fc-museo", category: FC_PLACES, front: "el museo", back: lstr("le musée", "the museum", "el museo") },
  { id: "fc-playa", category: FC_PLACES, front: "la playa", back: lstr("la plage", "the beach", "la playa") },
  { id: "fc-montana", category: FC_PLACES, front: "la montaña", back: lstr("la montagne", "the mountain", "la montaña") },
  { id: "fc-recuerdo", category: FC_EXPLORE, front: "el recuerdo", back: lstr("le souvenir", "the souvenir", "el recuerdo") },
  { id: "fc-fotos", category: FC_EXPLORE, front: "las fotos", back: lstr("les photos", "the photos", "las fotos") },
  { id: "fc-lejos", category: FC_DIRECTIONS, front: "lejos", back: lstr("loin", "far", "lejos") },
  { id: "fc-cerca", category: FC_DIRECTIONS, front: "cerca", back: lstr("près", "near", "cerca") },
  { id: "fc-derecho", category: FC_DIRECTIONS, front: "derecho", back: lstr("tout droit", "straight ahead", "derecho") },
  { id: "fc-izquierda", category: FC_DIRECTIONS, front: "izquierda", back: lstr("gauche", "left", "izquierda") },
  { id: "fc-derecha", category: FC_DIRECTIONS, front: "derecha", back: lstr("droite", "right", "derecha") },
  { id: "fc-frente-a", category: FC_DIRECTIONS, front: "frente a", back: lstr("en face de", "across from", "frente a") },
  { id: "fc-al-lado-de", category: FC_DIRECTIONS, front: "al lado de", back: lstr("à côté de", "next to", "al lado de") },
  { id: "fc-detras-de", category: FC_DIRECTIONS, front: "detrás de", back: lstr("derrière", "behind", "detrás de") },
  { id: "fc-entre", category: FC_DIRECTIONS, front: "entre", back: lstr("entre", "between", "entre") },
  { id: "fc-fui", category: FC_PAST, front: "fui", back: lstr("je suis allé(e)", "I went", "fui") },
  { id: "fc-visite", category: FC_PAST, front: "visité", back: lstr("j'ai visité", "I visited", "visité") },
  { id: "fc-tome", category: FC_PAST, front: "tomé", back: lstr("j'ai pris", "I took", "tomé") },
  { id: "fc-camine", category: FC_PAST, front: "caminé", back: lstr("j'ai marché", "I walked", "caminé") },
  { id: "fc-compre", category: FC_PAST, front: "compré", back: lstr("j'ai acheté", "I bought", "compré") },
  { id: "fc-saque", category: FC_PAST, front: "saqué", back: lstr("j'ai sorti / pris (photos)", "I took out / took (photos)", "saqué") },
  { id: "fc-me-gusto", category: FC_PAST, front: "me gustó", back: lstr("ça m'a plu", "I liked it", "me gustó") },
  { id: "fc-fue", category: FC_PAST, front: "fue", back: lstr("c'était", "it was", "fue") },
  { id: "fc-volver", category: FC_VERBS, front: "volver", back: lstr("revenir / rentrer", "to come back", "volver") },
  { id: "fc-llegar", category: FC_VERBS, front: "llegar", back: lstr("arriver", "to arrive", "llegar") },
  { id: "fc-parar", category: FC_VERBS, front: "parar", back: lstr("s'arrêter", "to stop", "parar") },
  { id: "fc-avisar", category: FC_VERBS, front: "avisar", back: lstr("avertir / prévenir", "to alert / warn", "avisar") },
  { id: "fc-perderse", category: FC_VERBS, front: "perderse", back: lstr("se perdre", "to get lost", "perderse") },
  { id: "fc-samana", category: FC_PLACES, front: "Samaná", back: lstr("péninsule de Samaná, plages et baleines", "Samaná peninsula, beaches and whales", "Península de Samaná, playas y ballenas") },
  { id: "fc-haitises", category: FC_PLACES, front: "Los Haitises", back: lstr("parc national de mangroves et grottes", "national park of mangroves and caves", "parque nacional de manglares y cuevas") },
  { id: "fc-zona", category: FC_PLACES, front: "la Zona Colonial", back: lstr("quartier historique UNESCO de Saint-Domingue", "Santo Domingo's UNESCO historic quarter", "barrio histórico UNESCO de Santo Domingo") },
  { id: "fc-cabarete", category: FC_EXPLORE, front: "Cabarete", back: lstr("station de kitesurf de la côte nord", "north-coast kitesurf hub", "centro de kitesurf de la costa norte") },
  { id: "fc-larimar", category: FC_EXPLORE, front: "el larimar", back: lstr("pierre bleue dominicaine", "blue Dominican stone", "piedra azul dominicana") },
  { id: "fc-malecon", category: FC_PLACES, front: "el malecón", back: lstr("la promenade en bord de mer", "the seafront promenade", "el paseo costero") },
  { id: "fc-colmado", category: FC_PLACES, front: "el colmado", back: lstr("petite épicerie de quartier", "neighborhood corner shop", "tienda de barrio") },
];

// ─── Practice quiz (15 questions) ───────────────────────────────────────

const QT_PHRASE = lstr("Choisir la phrase", "Choose the phrase", "Elegir la frase");
const QT_DIRECTIONS = lstr("Directions", "Directions", "Direcciones");
const QT_TRANSPORT = lstr("Transport", "Transport", "Transporte");
const QT_PAST = lstr("Passé · chunk", "Past · chunk", "Pasado · chunk");
const QT_READING = lstr("Lecture", "Reading", "Lectura");
const QT_PLACE = lstr("Lieu culturel", "Cultural place", "Lugar cultural");

const quizQuestions: Dom4QuizQuestion[] = [
  {
    id: "qz-como-llego",
    type: QT_PHRASE,
    prompt: lstr(
      "How do you ask « How do I get to...? » in Spanish?",
      "How do you ask \"How do I get to...?\" in Spanish?",
      "¿Cómo se pregunta «How do I get to...?» en español?",
    ),
    options: [
      { id: "a", target: "¿Cómo llego a...?", translation: lstr("Comment j'arrive à... ?", "How do I get to...?", "¿Cómo llego a...?") },
      { id: "b", target: "¿Cuánto cuesta?", translation: lstr("Combien ça coûte ?", "How much?", "¿Cuánto cuesta?") },
      { id: "c", target: "¿Dónde está el baño?", translation: lstr("Où sont les toilettes ?", "Where's the bathroom?", "¿Dónde está el baño?") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Cómo llego a...? » est la formule passe-partout pour demander un itinéraire.",
      "\"¿Cómo llego a...?\" is the all-purpose phrase to ask for directions.",
      "\"¿Cómo llego a...?\" es la frase universal para pedir indicaciones.",
    ),
  },
  {
    id: "qz-turn-right",
    type: QT_DIRECTIONS,
    prompt: lstr(
      "Which phrase means « turn right » ?",
      "Which phrase means \"turn right\"?",
      "¿Qué frase significa «turn right»?",
    ),
    options: [
      { id: "a", target: "Doble a la izquierda.", translation: lstr("Tournez à gauche.", "Turn left.", "Doble a la izquierda.") },
      { id: "b", target: "Doble a la derecha.", translation: lstr("Tournez à droite.", "Turn right.", "Doble a la derecha.") },
      { id: "c", target: "Siga derecho.", translation: lstr("Continuez tout droit.", "Go straight.", "Siga derecho.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Doble a la derecha » est la forme polie de « tourne à droite ».",
      "\"Doble a la derecha\" is the polite form of \"turn right\".",
      "\"Doble a la derecha\" es la forma cortés de \"gira a la derecha\".",
    ),
  },
  {
    id: "qz-guagua",
    type: QT_TRANSPORT,
    prompt: lstr(
      "What does « guagua » mean in Dominican Republic?",
      "What does \"guagua\" mean in Dominican Republic?",
      "¿Qué significa «guagua» en República Dominicana?",
    ),
    options: [
      { id: "a", target: "el bus o minibús público", translation: lstr("le bus / minibus public", "public bus / minibus", "el bus o minibús público") },
      { id: "b", target: "el taxi privado", translation: lstr("le taxi privé", "the private taxi", "el taxi privado") },
      { id: "c", target: "la moto", translation: lstr("la moto", "the motorbike", "la moto") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "En RD, « guagua » désigne le bus ou minibus public partagé.",
      "In DR, \"guagua\" means a public bus or shared minibus.",
      "En RD, \"guagua\" es el bus o minibús público compartido.",
    ),
  },
  {
    id: "qz-is-it-far",
    type: QT_DIRECTIONS,
    prompt: lstr(
      "How do you ask « Is it far? »",
      "How do you ask \"Is it far?\"",
      "¿Cómo se pregunta «Is it far?»?",
    ),
    options: [
      { id: "a", target: "¿Está cerca?", translation: lstr("C'est près ?", "Is it nearby?", "¿Está cerca?") },
      { id: "b", target: "¿Está lejos?", translation: lstr("C'est loin ?", "Is it far?", "¿Está lejos?") },
      { id: "c", target: "¿Está aquí?", translation: lstr("C'est ici ?", "Is it here?", "¿Está aquí?") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« ¿Está lejos? » te dit si tu peux y aller à pied ou non.",
      "\"¿Está lejos?\" tells you whether you can walk or need a ride.",
      "\"¿Está lejos?\" te dice si puedes ir a pie o no.",
    ),
  },
  {
    id: "qz-yesterday-samana",
    type: QT_PAST,
    prompt: lstr(
      "Which phrase says « I went to Samaná yesterday »?",
      "Which phrase says \"I went to Samaná yesterday\"?",
      "¿Qué frase dice «I went to Samaná yesterday»?",
    ),
    options: [
      { id: "a", target: "Hoy voy a Samaná.", translation: lstr("Aujourd'hui je vais à Samaná.", "Today I'm going to Samaná.", "Hoy voy a Samaná.") },
      { id: "b", target: "Ayer fui a Samaná.", translation: lstr("Hier je suis allé(e) à Samaná.", "Yesterday I went to Samaná.", "Ayer fui a Samaná.") },
      { id: "c", target: "Mañana voy a Samaná.", translation: lstr("Demain je vais à Samaná.", "Tomorrow I'm going to Samaná.", "Mañana voy a Samaná.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Ayer fui a... » combine « ayer » (hier) et le chunk passé « fui ».",
      "\"Ayer fui a...\" combines \"ayer\" (yesterday) and the past chunk \"fui\".",
      "\"Ayer fui a...\" combina \"ayer\" y el chunk de pasado \"fui\".",
    ),
  },
  {
    id: "qz-took-taxi",
    type: QT_PAST,
    prompt: lstr(
      "Which phrase says « I took a taxi »?",
      "Which phrase says \"I took a taxi\"?",
      "¿Qué frase dice «I took a taxi»?",
    ),
    options: [
      { id: "a", target: "Tomo un taxi.", translation: lstr("Je prends un taxi.", "I take a taxi.", "Tomo un taxi.") },
      { id: "b", target: "Voy a tomar un taxi.", translation: lstr("Je vais prendre un taxi.", "I'm going to take a taxi.", "Voy a tomar un taxi.") },
      { id: "c", target: "Tomé un taxi.", translation: lstr("J'ai pris un taxi.", "I took a taxi.", "Tomé un taxi.") },
    ],
    correctOptionId: "c",
    explanation: lstr(
      "« Tomé » est le chunk passé pour « j'ai pris ».",
      "\"Tomé\" is the past-tense chunk for \"I took\".",
      "\"Tomé\" es el chunk de pasado para \"I took\".",
    ),
  },
  {
    id: "qz-liked-it",
    type: QT_PAST,
    prompt: lstr(
      "Which phrase says « I liked it a lot »?",
      "Which phrase says \"I liked it a lot\"?",
      "¿Qué frase dice «I liked it a lot»?",
    ),
    options: [
      { id: "a", target: "Me gusta mucho.", translation: lstr("Ça me plaît beaucoup.", "I like it a lot (now).", "Me gusta mucho.") },
      { id: "b", target: "Me gustó mucho.", translation: lstr("Ça m'a beaucoup plu.", "I liked it a lot.", "Me gustó mucho.") },
      { id: "c", target: "Me gustaría mucho.", translation: lstr("J'aimerais beaucoup.", "I would like it a lot.", "Me gustaría mucho.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Me gustó » est la forme passée. La différence avec « me gusta » (présent) est subtile mais importante.",
      "\"Me gustó\" is the past form — different from \"me gusta\" (present).",
      "\"Me gustó\" es la forma de pasado, distinta de \"me gusta\" (presente).",
    ),
  },
  {
    id: "qz-colonial-area",
    type: QT_PLACE,
    prompt: lstr(
      "Which place is the historic colonial area of Santo Domingo?",
      "Which place is the historic colonial area of Santo Domingo?",
      "¿Qué lugar es el área colonial histórica de Santo Domingo?",
    ),
    options: [
      { id: "a", target: "Bahía de las Águilas", translation: lstr("plage sauvage du sud-ouest", "wild south-west beach", "playa virgen del suroeste") },
      { id: "b", target: "la Zona Colonial", translation: lstr("quartier historique UNESCO", "UNESCO historic quarter", "barrio histórico UNESCO") },
      { id: "c", target: "Cabarete", translation: lstr("station de kitesurf", "kitesurf town", "pueblo de kitesurf") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "La Zona Colonial est inscrite à l'UNESCO. Premier centre colonial des Amériques.",
      "The Zona Colonial is UNESCO-listed — the first colonial center in the Americas.",
      "La Zona Colonial es Patrimonio UNESCO: primer centro colonial de América.",
    ),
  },
  {
    id: "qz-can-you-tell-me",
    type: QT_TRANSPORT,
    prompt: lstr(
      "How do you politely ask the driver to alert you when you arrive?",
      "How do you politely ask the driver to alert you when you arrive?",
      "¿Cómo le pides con cortesía al chofer que te avise al llegar?",
    ),
    options: [
      { id: "a", target: "¿Me avisa cuando lleguemos?", translation: lstr("Vous me prévenez quand on arrive ?", "Will you alert me when we arrive?", "¿Me avisa cuando lleguemos?") },
      { id: "b", target: "Bájate aquí.", translation: lstr("Descends ici. (informel)", "Get off here. (informal)", "Bájate aquí.") },
      { id: "c", target: "Vamos a la playa.", translation: lstr("On va à la plage.", "Let's go to the beach.", "Vamos a la playa.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Me avisa cuando lleguemos? » est l'expression polie pour demander qu'on te prévienne.",
      "\"¿Me avisa cuando lleguemos?\" politely asks to be alerted on arrival.",
      "\"¿Me avisa cuando lleguemos?\" es la forma cortés.",
    ),
  },
  {
    id: "qz-stop-here",
    type: QT_TRANSPORT,
    prompt: lstr(
      "How do you politely ask the driver to stop here?",
      "How do you politely ask the driver to stop here?",
      "¿Cómo le pides con cortesía al chofer que pare aquí?",
    ),
    options: [
      { id: "a", target: "Para.", translation: lstr("Stop. (sec, impoli)", "Stop. (curt)", "Para.") },
      { id: "b", target: "¿Puede parar aquí, por favor?", translation: lstr("Pouvez-vous arrêter ici, s'il vous plaît ?", "Can you stop here, please?", "¿Puede parar aquí, por favor?") },
      { id: "c", target: "Más rápido.", translation: lstr("Plus vite.", "Faster.", "Más rápido.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« ¿Puede parar aquí, por favor? » garde le ton aimable.",
      "\"¿Puede parar aquí, por favor?\" keeps things polite.",
      "\"¿Puede parar aquí, por favor?\" mantiene la cortesía.",
    ),
  },
  {
    id: "qz-i-got-lost",
    type: QT_DIRECTIONS,
    prompt: lstr(
      "Which phrase says « I got lost »?",
      "Which phrase says \"I got lost\"?",
      "¿Qué frase dice «I got lost»?",
    ),
    options: [
      { id: "a", target: "Me perdí.", translation: lstr("Je me suis perdu(e).", "I got lost.", "Me perdí.") },
      { id: "b", target: "Estoy aquí.", translation: lstr("Je suis ici.", "I'm here.", "Estoy aquí.") },
      { id: "c", target: "Voy contigo.", translation: lstr("Je viens avec toi.", "I'm going with you.", "Voy contigo.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Me perdí » est court, clair et compris partout.",
      "\"Me perdí\" is short, clear, and universally understood.",
      "\"Me perdí\" es corto, claro y universal.",
    ),
  },
  {
    id: "qz-reading-zona",
    type: QT_READING,
    prompt: lstr(
      "Reading « Un día en la Zona Colonial » : where did the traveler buy a souvenir?",
      "Reading \"Un día en la Zona Colonial\": where did the traveler buy a souvenir?",
      "Lectura «Un día en la Zona Colonial»: ¿dónde compró un recuerdo?",
    ),
    options: [
      { id: "a", target: "En una pequeña tienda.", translation: lstr("Dans une petite boutique.", "In a small shop.", "En una pequeña tienda.") },
      { id: "b", target: "En el mercado central.", translation: lstr("Au marché central.", "At the central market.", "En el mercado central.") },
      { id: "c", target: "En el aeropuerto.", translation: lstr("À l'aéroport.", "At the airport.", "En el aeropuerto.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "Le texte dit « En una pequeña tienda compré un recuerdo de larimar ».",
      "The text says \"En una pequeña tienda compré un recuerdo de larimar\".",
      "El texto dice \"En una pequeña tienda compré un recuerdo de larimar\".",
    ),
  },
  {
    id: "qz-reading-samana",
    type: QT_READING,
    prompt: lstr(
      "Reading « Una excursión a Samaná » : which transports did the traveler use?",
      "Reading \"Una excursión a Samaná\": which transports did the traveler use?",
      "Lectura «Una excursión a Samaná»: ¿qué transportes usó?",
    ),
    options: [
      { id: "a", target: "Una guagua y luego un taxi.", translation: lstr("Une guagua puis un taxi.", "A guagua and then a taxi.", "Una guagua y luego un taxi.") },
      { id: "b", target: "Un avión y un barco.", translation: lstr("Un avion et un bateau.", "A plane and a boat.", "Un avión y un barco.") },
      { id: "c", target: "Un caballo y una bicicleta.", translation: lstr("Un cheval et un vélo.", "A horse and a bike.", "Un caballo y una bicicleta.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "Le texte mentionne « Tomamos una guagua... Después tomé un taxi ».",
      "The text says \"Tomamos una guagua... Después tomé un taxi\".",
      "El texto dice \"Tomamos una guagua... Después tomé un taxi\".",
    ),
  },
  {
    id: "qz-mas-despacio",
    type: QT_PHRASE,
    prompt: lstr(
      "What is « Más despacio, por favor » useful for?",
      "What is \"Más despacio, por favor\" useful for?",
      "¿Para qué sirve «Más despacio, por favor»?",
    ),
    options: [
      { id: "a", target: "para pedir hablar o conducir más despacio", translation: lstr("demander à quelqu'un de parler ou de conduire plus lentement", "to ask someone to speak or drive more slowly", "para pedir hablar o conducir más despacio") },
      { id: "b", target: "para pedir la cuenta", translation: lstr("demander l'addition", "to ask for the bill", "para pedir la cuenta") },
      { id: "c", target: "para reservar una mesa", translation: lstr("réserver une table", "to book a table", "para reservar una mesa") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Más despacio, por favor » sert pour la parole comme pour la conduite.",
      "\"Más despacio, por favor\" works for speech and for driving.",
      "\"Más despacio, por favor\" sirve para hablar y para conducir.",
    ),
  },
];

// ─── Final game · Dominican explorer challenge ──────────────────────────

const finalGameRounds: Dom4GameRound[] = [
  {
    id: "fg-zona-direction",
    stop: 1,
    scenario: lstr(
      "Tu veux aller à la Zona Colonial. Que demandes-tu à un local ?",
      "You want to go to the Zona Colonial. What do you ask a local?",
      "Quieres ir a la Zona Colonial. ¿Qué le preguntas a un local?",
    ),
    options: [
      { id: "a", target: "¿Cómo llego a la Zona Colonial?", translation: lstr("Comment j'arrive à la Zona Colonial ?", "How do I get to the Zona Colonial?", "¿Cómo llego a la Zona Colonial?") },
      { id: "b", target: "¿Cuánto cuesta el café?", translation: lstr("Combien coûte le café ?", "How much is the coffee?", "¿Cuánto cuesta el café?") },
      { id: "c", target: "Buenas noches.", translation: lstr("Bonsoir.", "Good evening.", "Buenas noches.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "C'est la formule passe-partout pour demander un itinéraire.",
      "All-purpose phrase to ask for directions.",
      "Frase universal para pedir indicaciones.",
    ),
  },
  {
    id: "fg-where-guagua",
    stop: 2,
    scenario: lstr(
      "Tu cherches la guagua. Que demandes-tu ?",
      "You're looking for the guagua. What do you ask?",
      "Buscas la guagua. ¿Qué preguntas?",
    ),
    options: [
      { id: "a", target: "¿Dónde está el baño?", translation: lstr("Où sont les toilettes ?", "Where's the bathroom?", "¿Dónde está el baño?") },
      { id: "b", target: "¿Dónde pasa la guagua?", translation: lstr("Où passe la guagua ?", "Where does the guagua pass?", "¿Dónde pasa la guagua?") },
      { id: "c", target: "¿Tiene Wi-Fi?", translation: lstr("Vous avez le Wi-Fi ?", "Do you have Wi-Fi?", "¿Tiene Wi-Fi?") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "« ¿Dónde pasa la guagua? » est exactement la bonne question.",
      "\"¿Dónde pasa la guagua?\" is exactly the right question.",
      "\"¿Dónde pasa la guagua?\" es la pregunta correcta.",
    ),
  },
  {
    id: "fg-turn-right",
    stop: 3,
    scenario: lstr(
      "Tu entends « Doble a la derecha ». Tu dois...",
      "You hear \"Doble a la derecha\". You should...",
      "Escuchas «Doble a la derecha». Debes...",
    ),
    options: [
      { id: "a", target: "Doblar a la derecha.", translation: lstr("Tourner à droite.", "Turn right.", "Doblar a la derecha.") },
      { id: "b", target: "Seguir derecho.", translation: lstr("Continuer tout droit.", "Keep going straight.", "Seguir derecho.") },
      { id: "c", target: "Doblar a la izquierda.", translation: lstr("Tourner à gauche.", "Turn left.", "Doblar a la izquierda.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "« Doble a la derecha » = tournez à droite.",
      "\"Doble a la derecha\" = turn right.",
      "\"Doble a la derecha\" = gira a la derecha.",
    ),
  },
  {
    id: "fg-tell-driver",
    stop: 4,
    scenario: lstr(
      "Tu montes dans une guagua. Tu veux dire au chauffeur que tu vas à Samaná.",
      "You get on a guagua. Tell the driver you're going to Samaná.",
      "Subes a una guagua. Dile al chofer que vas a Samaná.",
    ),
    options: [
      { id: "a", target: "Voy para Samaná.", translation: lstr("Je vais à Samaná.", "I'm going to Samaná.", "Voy para Samaná.") },
      { id: "b", target: "Quiero un café.", translation: lstr("Je veux un café.", "I want a coffee.", "Quiero un café.") },
      { id: "c", target: "Hasta mañana.", translation: lstr("À demain.", "See you tomorrow.", "Hasta mañana.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "« Voy para... » est la formule caribéenne pour indiquer ta destination.",
      "\"Voy para...\" is the Caribbean way to state your destination.",
      "\"Voy para...\" es la forma caribeña de decir tu destino.",
    ),
  },
  {
    id: "fg-alert-arrival",
    stop: 5,
    scenario: lstr(
      "Tu veux que le chauffeur te prévienne à l'arrivée.",
      "You want the driver to alert you when you arrive.",
      "Quieres que el chofer te avise al llegar.",
    ),
    options: [
      { id: "a", target: "¿Me avisa cuando lleguemos?", translation: lstr("Vous me prévenez quand on arrive ?", "Will you alert me when we arrive?", "¿Me avisa cuando lleguemos?") },
      { id: "b", target: "Estoy bien, gracias.", translation: lstr("Je vais bien, merci.", "I'm fine, thanks.", "Estoy bien, gracias.") },
      { id: "c", target: "Salgo más tarde.", translation: lstr("Je sors plus tard.", "I'm leaving later.", "Salgo más tarde.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "« ¿Me avisa cuando lleguemos? » est sauvegarde pratique en territoire inconnu.",
      "\"¿Me avisa cuando lleguemos?\" is a practical safety net in unfamiliar territory.",
      "\"¿Me avisa cuando lleguemos?\" es muy útil en zonas que no conoces.",
    ),
  },
  {
    id: "fg-tell-visited",
    stop: 6,
    scenario: lstr(
      "Tu rentres et tu racontes : « J'ai visité le musée. »",
      "You're back and tell: \"I visited the museum.\"",
      "Vuelves y cuentas: «Visité el museo».",
    ),
    options: [
      { id: "a", target: "Visito el museo.", translation: lstr("Je visite le musée.", "I'm visiting the museum.", "Visito el museo.") },
      { id: "b", target: "Visité el museo.", translation: lstr("J'ai visité le musée.", "I visited the museum.", "Visité el museo.") },
      { id: "c", target: "Voy a visitar el museo.", translation: lstr("Je vais visiter le musée.", "I'm going to visit the museum.", "Voy a visitar el museo.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "« Visité » est le chunk passé pour « j'ai visité ».",
      "\"Visité\" is the past chunk for \"I visited\".",
      "\"Visité\" es el chunk de pasado para \"I visited\".",
    ),
  },
  {
    id: "fg-tell-took",
    stop: 7,
    scenario: lstr(
      "Tu veux dire : « J'ai pris une guagua. »",
      "You want to say: \"I took a guagua.\"",
      "Quieres decir: «Tomé una guagua».",
    ),
    options: [
      { id: "a", target: "Tomo una guagua.", translation: lstr("Je prends une guagua.", "I'm taking a guagua.", "Tomo una guagua.") },
      { id: "b", target: "Tomé una guagua.", translation: lstr("J'ai pris une guagua.", "I took a guagua.", "Tomé una guagua.") },
      { id: "c", target: "Voy en guagua.", translation: lstr("Je voyage en guagua.", "I'm going by guagua.", "Voy en guagua.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "« Tomé » est ton chunk passé pour parler du transport.",
      "\"Tomé\" is your past-tense chunk for transport.",
      "\"Tomé\" es tu chunk de pasado para el transporte.",
    ),
  },
  {
    id: "fg-tell-liked",
    stop: 8,
    scenario: lstr(
      "Pour terminer, tu réagis : « Ça m'a beaucoup plu. »",
      "To wrap up, you react: \"I liked it a lot.\"",
      "Para terminar, reaccionas: «Me gustó mucho».",
    ),
    options: [
      { id: "a", target: "Me gusta mucho.", translation: lstr("Ça me plaît beaucoup. (présent)", "I like it a lot. (present)", "Me gusta mucho.") },
      { id: "b", target: "Me gustó mucho.", translation: lstr("Ça m'a beaucoup plu. (passé)", "I liked it a lot. (past)", "Me gustó mucho.") },
      { id: "c", target: "Me gustaría mucho.", translation: lstr("J'aimerais beaucoup. (conditionnel)", "I would like it a lot.", "Me gustaría mucho.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "« Me gustó » garde la nuance « ça m'a plu » au passé.",
      "\"Me gustó\" keeps the past nuance.",
      "\"Me gustó\" mantiene el matiz de pasado.",
    ),
  },
  {
    id: "fg-bonus-next",
    stop: 9,
    scenario: lstr(
      "Bonus : tu choisis ta prochaine sortie.",
      "Bonus: choose your next trip.",
      "Bonus: elige tu próxima salida.",
    ),
    options: [
      { id: "a", target: "Quiero volver a Samaná.", translation: lstr("Je veux retourner à Samaná.", "I want to go back to Samaná.", "Quiero volver a Samaná.") },
      { id: "b", target: "No me gustó.", translation: lstr("Ça ne m'a pas plu.", "I didn't like it.", "No me gustó.") },
      { id: "c", target: "No tengo tiempo.", translation: lstr("Je n'ai pas le temps.", "I don't have time.", "No tengo tiempo.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "« Quiero volver a... » est la formule naturelle pour conclure ton récit.",
      "\"Quiero volver a...\" naturally wraps up your story.",
      "\"Quiero volver a...\" cierra tu relato con naturalidad.",
    ),
  },
];

// ─── Printable worksheets (5 sheets, real reinforcement) ────────────────

const printableSheets: Dom4PrintableSheet[] = [
  {
    id: "ws-vocab",
    kind: "vocabulary",
    title: lstr(
      "Feuille 1 · Vocabulaire — directions et transport",
      "Sheet 1 · Vocabulary — directions and transport",
      "Hoja 1 · Vocabulario — direcciones y transporte",
    ),
    instructions: lstr(
      "Associe chaque mot espagnol à sa traduction. Classe ensuite chaque mot dans la bonne catégorie : transport, directions ou lieux.",
      "Match each Spanish word to its translation. Then sort each word into transport, directions, or places.",
      "Empareja cada palabra en español con su traducción. Después clasifica cada palabra en transporte, direcciones o lugares.",
    ),
    items: [
      { id: "v1", target: "la guagua", prompt: lstr("Catégorie : transport", "Category: transport", "Categoría: transporte"), answer: lstr("le bus / minibus public", "the bus / public minibus", "el bus / minibús público") },
      { id: "v2", target: "el taxi", prompt: lstr("Catégorie : transport", "Category: transport", "Categoría: transporte"), answer: lstr("le taxi", "the taxi", "el taxi") },
      { id: "v3", target: "la esquina", prompt: lstr("Catégorie : directions", "Category: directions", "Categoría: direcciones"), answer: lstr("le coin de rue", "the street corner", "la esquina") },
      { id: "v4", target: "derecho", prompt: lstr("Catégorie : directions", "Category: directions", "Categoría: direcciones"), answer: lstr("tout droit", "straight ahead", "derecho") },
      { id: "v5", target: "la izquierda", prompt: lstr("Catégorie : directions", "Category: directions", "Categoría: direcciones"), answer: lstr("la gauche", "the left", "la izquierda") },
      { id: "v6", target: "la derecha", prompt: lstr("Catégorie : directions", "Category: directions", "Categoría: direcciones"), answer: lstr("la droite", "the right", "la derecha") },
      { id: "v7", target: "el museo", prompt: lstr("Catégorie : lieux", "Category: places", "Categoría: lugares"), answer: lstr("le musée", "the museum", "el museo") },
      { id: "v8", target: "la playa", prompt: lstr("Catégorie : lieux", "Category: places", "Categoría: lugares"), answer: lstr("la plage", "the beach", "la playa") },
      { id: "v9", target: "el parque", prompt: lstr("Catégorie : lieux", "Category: places", "Categoría: lugares"), answer: lstr("le parc", "the park", "el parque") },
      { id: "v10", target: "el malecón", prompt: lstr("Catégorie : lieux", "Category: places", "Categoría: lugares"), answer: lstr("la promenade en bord de mer", "the seafront promenade", "el paseo costero") },
    ],
  },
  {
    id: "ws-fill-blank",
    kind: "fill_blank",
    title: lstr(
      "Feuille 2 · Phrases à compléter — demander son chemin",
      "Sheet 2 · Fill in the blanks — asking for directions",
      "Hoja 2 · Frases para completar — pedir el camino",
    ),
    instructions: lstr(
      "Complète chaque phrase espagnole avec le mot manquant.",
      "Complete each Spanish phrase with the missing word.",
      "Completa cada frase con la palabra que falta.",
    ),
    items: [
      { id: "f1", target: "¿Cómo ____ a la Zona Colonial?", prompt: lstr("Verbe « arriver » au présent (1re personne).", "Verb \"to arrive\" in the present (1st person).", "Verbo \"llegar\" en presente (1ª persona)."), answer: lstr("llego", "llego", "llego") },
      { id: "f2", target: "Doble a la ____.", prompt: lstr("Direction (féminin).", "Direction (feminine).", "Dirección (femenino)."), answer: lstr("derecha (ou izquierda)", "derecha (or izquierda)", "derecha (o izquierda)") },
      { id: "f3", target: "¿Está ____?", prompt: lstr("Distance.", "Distance.", "Distancia."), answer: lstr("cerca / lejos", "cerca / lejos", "cerca / lejos") },
      { id: "f4", target: "Voy ____ Samaná.", prompt: lstr("Préposition de destination caribéenne.", "Caribbean preposition of destination.", "Preposición caribeña de destino."), answer: lstr("para", "para", "para") },
      { id: "f5", target: "Está ____ del parque.", prompt: lstr("« à côté de » en deux mots.", "\"next to\" — two words.", "\"al lado\" — al lado de."), answer: lstr("al lado", "al lado", "al lado") },
      { id: "f6", target: "¿Me ____ cuando lleguemos?", prompt: lstr("Verbe « avertir » à la 3e personne polie.", "Verb \"to alert\" in the polite 3rd person.", "Verbo \"avisar\" en 3ª persona cortés."), answer: lstr("avisa", "avisa", "avisa") },
      { id: "f7", target: "____ derecho.", prompt: lstr("Verbe « continuer » à la forme polie.", "Verb \"to keep going\" — polite form.", "Verbo \"seguir\" en forma cortés."), answer: lstr("Siga", "Siga", "Siga") },
      { id: "f8", target: "Más ____, por favor.", prompt: lstr("« lentement ».", "\"slowly\".", "\"despacio\"."), answer: lstr("despacio", "despacio", "despacio") },
    ],
  },
  {
    id: "ws-verb-chunks",
    kind: "verb_chunks",
    title: lstr(
      "Feuille 3 · Mini passé — chunks au singulier",
      "Sheet 3 · Mini past tense — singular chunks",
      "Hoja 3 · Mini pasado — chunks en singular",
    ),
    instructions: lstr(
      "Choisis le bon chunk au passé (1re personne du singulier) parmi : fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
      "Pick the right past-tense chunk (1st-person singular) among: fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
      "Elige el chunk correcto en pasado (1ª persona del singular) entre: fui, visité, tomé, caminé, compré, saqué, me gustó, fue.",
    ),
    items: [
      { id: "v1", target: "Ayer ____ a Samaná.", prompt: lstr("Aller — passé.", "To go — past.", "Ir — pasado."), answer: lstr("fui", "fui", "fui") },
      { id: "v2", target: "____ el museo.", prompt: lstr("Visiter — passé.", "To visit — past.", "Visitar — pasado."), answer: lstr("Visité", "Visité", "Visité") },
      { id: "v3", target: "____ una guagua.", prompt: lstr("Prendre — passé.", "To take — past.", "Tomar — pasado."), answer: lstr("Tomé", "Tomé", "Tomé") },
      { id: "v4", target: "____ por la Zona Colonial.", prompt: lstr("Marcher — passé.", "To walk — past.", "Caminar — pasado."), answer: lstr("Caminé", "Caminé", "Caminé") },
      { id: "v5", target: "____ un recuerdo.", prompt: lstr("Acheter — passé.", "To buy — past.", "Comprar — pasado."), answer: lstr("Compré", "Compré", "Compré") },
      { id: "v6", target: "____ fotos.", prompt: lstr("Prendre des photos — RD.", "To take photos — DR style.", "Sacar fotos — RD."), answer: lstr("Saqué", "Saqué", "Saqué") },
      { id: "v7", target: "____ mucho.", prompt: lstr("« ça m'a plu ».", "\"I liked it.\"", "\"me gustó\"."), answer: lstr("Me gustó", "Me gustó", "Me gustó") },
      { id: "v8", target: "____ muy bonito.", prompt: lstr("« c'était ».", "\"it was.\"", "\"fue\"."), answer: lstr("Fue", "Fue", "Fue") },
      { id: "v9", target: "Transforme : « Hoy voy a la playa » → « Ayer ____ a la playa ».", prompt: lstr("Aujourd'hui → hier.", "Today → yesterday.", "Hoy → ayer."), answer: lstr("fui", "fui", "fui") },
      { id: "v10", target: "Transforme : « Compro un recuerdo » → « ____ un recuerdo ».", prompt: lstr("Présent → passé.", "Present → past.", "Presente → pasado."), answer: lstr("Compré", "Compré", "Compré") },
    ],
  },
  {
    id: "ws-reading",
    kind: "reading",
    title: lstr(
      "Feuille 4 · Compréhension de lecture — Un día en la Zona Colonial",
      "Sheet 4 · Reading comprehension — Un día en la Zona Colonial",
      "Hoja 4 · Comprensión de lectura — Un día en la Zona Colonial",
    ),
    instructions: lstr(
      "Relis le texte « Un día en la Zona Colonial » puis réponds aux questions en espagnol ou en choisissant la bonne réponse.",
      "Re-read the text \"Un día en la Zona Colonial\" then answer the questions in Spanish or by choosing the correct answer.",
      "Vuelve a leer el texto «Un día en la Zona Colonial» y responde las preguntas en español o eligiendo la respuesta correcta.",
    ),
    items: [
      { id: "r1", prompt: lstr("¿Adónde fue el viajero?", "Where did the traveler go?", "¿Adónde fue el viajero?"), answer: lstr("Fue a la Zona Colonial.", "He went to the Zona Colonial.", "Fue a la Zona Colonial.") },
      { id: "r2", prompt: lstr("¿Qué transporte tomó?", "Which transport did he take?", "¿Qué transporte tomó?"), answer: lstr("Tomó una guagua.", "He took a guagua.", "Tomó una guagua.") },
      { id: "r3", prompt: lstr("¿Qué compró en la tienda?", "What did he buy in the shop?", "¿Qué compró en la tienda?"), answer: lstr("Compró un recuerdo de larimar.", "He bought a larimar souvenir.", "Compró un recuerdo de larimar.") },
      { id: "r4", prompt: lstr("¿Qué dirección le dieron?", "Which direction was he given?", "¿Qué dirección le dieron?"), answer: lstr("Doblar a la derecha y seguir derecho hasta el museo.", "Turn right and go straight to the museum.", "Doblar a la derecha y seguir derecho hasta el museo.") },
      { id: "r5", prompt: lstr("¿Cómo describe su día?", "How does he describe his day?", "¿Cómo describe su día?"), answer: lstr("Tranquilo y muy bonito.", "Quiet and very nice.", "Tranquilo y muy bonito.") },
    ],
  },
  {
    id: "ws-roleplay",
    kind: "roleplay",
    title: lstr(
      "Feuille 5 · Mini journal de voyage — planifie une excursion",
      "Sheet 5 · Mini travel journal — plan a day trip",
      "Hoja 5 · Mini diario de viaje — planea una excursión",
    ),
    instructions: lstr(
      "Choisis une destination dominicaine, prépare ton transport, demande ton chemin et raconte ce que tu as fait. Écris au moins une phrase par étape.",
      "Pick a Dominican destination, plan your transport, ask for directions, and describe what you did. Write at least one sentence per step.",
      "Elige un destino dominicano, planea el transporte, pide direcciones y cuenta lo que hiciste. Escribe al menos una frase por paso.",
    ),
    items: [
      { id: "p1", prompt: lstr("1) Choisis ta destination (Zona Colonial, Samaná, Cabarete, Las Terrenas, Bahía de las Águilas, etc.).", "1) Pick your destination (Zona Colonial, Samaná, Cabarete, Las Terrenas, Bahía de las Águilas, etc.).", "1) Elige tu destino (Zona Colonial, Samaná, Cabarete, Las Terrenas, Bahía de las Águilas, etc.)."), answer: lstr("Exemple : « Voy para Samaná. »", "Example: \"Voy para Samaná.\"", "Ejemplo: «Voy para Samaná».") },
      { id: "p2", prompt: lstr("2) Indique le transport choisi.", "2) State the transport you'll use.", "2) Indica el transporte que vas a usar."), answer: lstr("Exemple : « Tomo una guagua / un taxi. »", "Example: \"Tomo una guagua / un taxi.\"", "Ejemplo: «Tomo una guagua / un taxi».") },
      { id: "p3", prompt: lstr("3) Écris une question pour demander ton chemin.", "3) Write a question to ask for directions.", "3) Escribe una pregunta para pedir el camino."), answer: lstr("Exemple : « ¿Cómo llego al museo? »", "Example: \"¿Cómo llego al museo?\"", "Ejemplo: «¿Cómo llego al museo?»") },
      { id: "p4", prompt: lstr("4) Décris ce que tu fais sur place (au présent).", "4) Describe what you do there (present tense).", "4) Describe lo que haces ahí (presente)."), answer: lstr("Exemple : « Camino por la playa y saco fotos. »", "Example: \"Camino por la playa y saco fotos.\"", "Ejemplo: «Camino por la playa y saco fotos».") },
      { id: "p5", prompt: lstr("5) Le soir, raconte ta journée au passé en utilisant 3 chunks.", "5) In the evening, tell your day in the past using 3 chunks.", "5) Por la noche, cuenta tu día en pasado con 3 chunks."), answer: lstr("Exemple : « Hoy fui a la playa, tomé una guagua y saqué fotos. Me gustó mucho. »", "Example: \"Hoy fui a la playa, tomé una guagua y saqué fotos. Me gustó mucho.\"", "Ejemplo: «Hoy fui a la playa, tomé una guagua y saqué fotos. Me gustó mucho».") },
    ],
  },
];

// ─── Top-level data export ──────────────────────────────────────────────

export const dominicanRepublicExplore: DominicanRepublicExploreData = {
  moduleId: "voyage_es_do_explore",
  moduleLabel: lstr("Module 4 · A1+ → A2", "Module 4 · A1+ → A2", "Módulo 4 · A1+ → A2"),
  heroTitle: lstr(
    "Se déplacer et explorer",
    "Getting around and exploring",
    "Moverse y explorar",
  ),
  heroSubtitle: lstr(
    "Apprends à bouger, demander ton chemin et raconter une petite aventure en République dominicaine.",
    "Learn how to move around, ask for directions, and describe a small adventure in the Dominican Republic.",
    "Aprende a moverte, pedir direcciones y contar una pequeña aventura en República Dominicana.",
  ),
  productLabel: lstr("YoPratiqo · Aperçu", "YoPratiqo · Preview", "YoPratiqo · Vista previa"),
  audioBrowserNoteShort: lstr("Audio navigateur", "Browser audio", "Audio del navegador"),
  audioBrowserNoteLong: lstr(
    "L'audio est généré directement par ton navigateur (SpeechSynthesis). Aucun fichier MP3 n'est ajouté à l'application.",
    "Audio is generated directly by your browser (SpeechSynthesis). No MP3 file is added to the app.",
    "El audio se genera directamente en tu navegador (SpeechSynthesis). No se añade ningún archivo MP3.",
  ),
  printButtonLabel: lstr(
    "Imprimer les exercices",
    "Print exercises",
    "Imprimir ejercicios",
  ),
  pastTenseBridgeNote,
  missionStops,
  placeCards,
  phraseBank,
  transportDialogue,
  directionsDialogue,
  dayTripDialogue,
  earCards,
  grammarCards,
  readingTexts,
  flashcards,
  quizQuestions,
  finalGame: {
    title: lstr(
      "Défi explorateur dominicain",
      "Dominican explorer challenge",
      "Reto explorador dominicano",
    ),
    subtitle: lstr(
      "Ta mission : organiser ta sortie, te déplacer, demander ton chemin et raconter ta journée. Tu choisis l'itinéraire.",
      "Your mission: plan your outing, move around, ask the way, and tell your day. You set the route.",
      "Tu misión: planear tu salida, moverte, pedir el camino y contar tu día. Tú eliges la ruta.",
    ),
    successMessage: lstr(
      "Mission accomplie. Tu sais maintenant raconter une petite aventure dominicaine en espagnol.",
      "Mission accomplished. You can now tell a small Dominican adventure in Spanish.",
      "Misión cumplida. Ahora puedes contar una pequeña aventura dominicana en español.",
    ),
    rounds: finalGameRounds,
  },
  printableSheets,
};
