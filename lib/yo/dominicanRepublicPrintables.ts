/**
 * YoPratiqo — Dominican Republic premium printable exercises.
 *
 * Real reinforcement worksheets (vocabulary match, fill-in-the-blank,
 * scenario multiple-choice, production prompts, simple verb practice)
 * for Modules 1, 2 and 3.
 *
 * Pedagogical contract:
 *   - Spanish stays the target language. Prompts can be FR/EN/ES.
 *   - Worksheets are self-contained: a learner can answer them with
 *     the module content alone (no external resources).
 *   - Each module exposes at minimum:
 *       1) a vocabulary practice exercise
 *       2) a fill-in-the-blank exercise
 *       3) a production / scenario reinforcement exercise
 *   - Module 3 also adds a simple singular-verb practice exercise
 *     (yo / usted forms, travel-oriented).
 *
 * Strict non-goals:
 *   - No Stripe, Supabase, payment math, or audio asset generation.
 *   - No live legal copy, sitemap, or Course schema mutation.
 *   - No print-the-page list dumps. Every item is an actionable
 *     exercise — answers live in `<details>` answer keys.
 *
 * Bilingual support: every UI string carries FR + EN + ES via
 * `lstr(fr, en, es)` so the trilingual UI contract holds.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

// ─── Exercise primitives ────────────────────────────────────────────────

/**
 * A single match-the-pair item. The Spanish target is the prompt; the
 * learner must produce/recall the FR/EN meaning. The component renders
 * the meanings shuffled, scrambled, or as a numbered list — that's
 * a presentation detail and stays out of the data layer.
 */
export interface PrintableMatchPair {
  id: string;
  /** Plain Spanish target — rendered with `lang="es"`. */
  spanish: string;
  /** Localized meaning shown as the answer-key match. */
  meaning: YoLocalizedString;
}

export interface PrintableMatchExercise {
  kind: "match";
  id: string;
  /** Eyebrow / sub-label, e.g. "Vocabulary practice". */
  eyebrow: YoLocalizedString;
  /** Section heading, e.g. "Match each Spanish phrase…". */
  title: YoLocalizedString;
  /** Short instruction shown right under the title. */
  instructions: YoLocalizedString;
  pairs: PrintableMatchPair[];
}

/**
 * A fill-in-the-blank prompt. The Spanish sentence has one or more
 * blanks (rendered as `____`). The learner writes the missing words
 * directly on the printout. The answer key reveals the canonical
 * complete sentence.
 */
export interface PrintableFillBlankItem {
  id: string;
  /** Localized scene-setting context shown above the blank. */
  scenario: YoLocalizedString;
  /** Spanish sentence with `____` placeholders. */
  prompt: string;
  /** Canonical Spanish answer (the complete sentence). */
  answer: string;
  /** Optional FR/EN/ES gloss of the complete sentence. */
  gloss?: YoLocalizedString;
}

export interface PrintableFillBlankExercise {
  kind: "fill_blank";
  id: string;
  eyebrow: YoLocalizedString;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  items: PrintableFillBlankItem[];
}

/**
 * A scenario-based multiple-choice item. The prompt describes a
 * concrete travel situation in FR/EN/ES; the options are full
 * Spanish phrases. Only one option is the natural fit — the others
 * are plausible distractors drawn from the module vocabulary.
 */
export interface PrintableMultipleChoiceItem {
  id: string;
  scenario: YoLocalizedString;
  options: Array<{ id: string; spanish: string }>;
  correctOptionId: string;
  /** Why that option is correct (used in the answer key). */
  rationale: YoLocalizedString;
}

export interface PrintableMultipleChoiceExercise {
  kind: "multiple_choice";
  id: string;
  eyebrow: YoLocalizedString;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  items: PrintableMultipleChoiceItem[];
}

/**
 * A production prompt: the learner writes a short Spanish response
 * (1–2 sentences). The answer key shows a model answer learners can
 * compare against — it's not the only acceptable answer, just an
 * exemplar that uses module vocabulary correctly.
 */
export interface PrintableProductionItem {
  id: string;
  situation: YoLocalizedString;
  modelAnswer: string;
  /** FR/EN/ES gloss of the model answer for the answer key. */
  modelGloss: YoLocalizedString;
}

export interface PrintableProductionExercise {
  kind: "production";
  id: string;
  eyebrow: YoLocalizedString;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  items: PrintableProductionItem[];
}

/**
 * Simple singular-verb conjugation/form practice. Each item gives a
 * verb + a target person (yo / usted), the learner writes the form,
 * and the answer key reveals the canonical form. Module 3 only.
 */
export interface PrintableVerbFormItem {
  id: string;
  /** Spanish infinitive — rendered with `lang="es"`. */
  infinitive: string;
  /** "yo" or "usted" (only forms practised). */
  person: "yo" | "usted";
  /** Short FR/EN/ES gloss, e.g. "to want / vouloir / querer". */
  meaning: YoLocalizedString;
  /** Canonical conjugated form — the answer-key value. */
  answer: string;
  /** Practical scenario sentence using the form (also in answer key). */
  exampleSentence: YoLocalizedString;
}

export interface PrintableVerbFormExercise {
  kind: "verb_form";
  id: string;
  eyebrow: YoLocalizedString;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  items: PrintableVerbFormItem[];
}

export type PrintableExercise =
  | PrintableMatchExercise
  | PrintableFillBlankExercise
  | PrintableMultipleChoiceExercise
  | PrintableProductionExercise
  | PrintableVerbFormExercise;

/**
 * One module's full printable worksheet pack — a section title,
 * an introductory blurb, and the ordered list of exercises that
 * appear on the printout.
 */
export interface PrintableWorksheetPack {
  /** Logical id, e.g. "module-1", "module-2". */
  moduleId: string;
  sectionEyebrow: YoLocalizedString;
  sectionTitle: YoLocalizedString;
  sectionBlurb: YoLocalizedString;
  /** Aria-labelledby anchor; must be unique on its host page. */
  headingId: string;
  /** Tag applied to the wrapping `<section>` for tests/analytics. */
  dataAttribute: string;
  exercises: PrintableExercise[];
}

// ─── Module 1 — RD intro / first words & culture ────────────────────────

const module1MatchExercise: PrintableMatchExercise = {
  kind: "match",
  id: "m1-match-greetings",
  eyebrow: lstr(
    "Vocabulaire · Salutations",
    "Vocabulary · Greetings",
    "Vocabulario · Saludos",
  ),
  title: lstr(
    "Associe chaque salutation à son sens",
    "Match each greeting to its meaning",
    "Relaciona cada saludo con su significado",
  ),
  instructions: lstr(
    "Écris la lettre du sens à droite à côté de la phrase espagnole correspondante.",
    "Write the letter of the meaning on the right next to the matching Spanish phrase.",
    "Escribe la letra del significado de la derecha al lado de la frase en español correspondiente.",
  ),
  pairs: [
    {
      id: "m1-pair-buenos-dias",
      spanish: "Buenos días",
      meaning: lstr("Bonjour (le matin)", "Good morning", "Buenos días (mañana)"),
    },
    {
      id: "m1-pair-buenas-tardes",
      spanish: "Buenas tardes",
      meaning: lstr("Bon après-midi", "Good afternoon", "Buenas tardes"),
    },
    {
      id: "m1-pair-buenas-noches",
      spanish: "Buenas noches",
      meaning: lstr("Bonsoir / Bonne nuit", "Good evening / Good night", "Buenas noches"),
    },
    {
      id: "m1-pair-que-lo-que",
      spanish: "¿Qué lo qué?",
      meaning: lstr(
        "Quoi de neuf ? (informel, dominicain)",
        "What's up? (informal, Dominican)",
        "¿Qué onda? (informal, dominicano)",
      ),
    },
    {
      id: "m1-pair-tato",
      spanish: "¡Tato!",
      meaning: lstr(
        "Parfait / OK (informel, dominicain)",
        "Perfect / OK (informal, Dominican)",
        "¡Listo! / Vale (informal, dominicano)",
      ),
    },
    {
      id: "m1-pair-gracias",
      spanish: "Muchas gracias",
      meaning: lstr("Merci beaucoup", "Thank you very much", "Muchas gracias"),
    },
    {
      id: "m1-pair-de-nada",
      spanish: "De nada",
      meaning: lstr("De rien / Je vous en prie", "You're welcome", "De nada"),
    },
    {
      id: "m1-pair-por-favor",
      spanish: "Por favor",
      meaning: lstr("S'il vous plaît", "Please", "Por favor"),
    },
  ],
};

const module1FillBlankExercise: PrintableFillBlankExercise = {
  kind: "fill_blank",
  id: "m1-fill-reception",
  eyebrow: lstr(
    "À compléter · Réception",
    "Fill in · Reception",
    "Completar · Recepción",
  ),
  title: lstr(
    "Complète chaque phrase avec le bon mot espagnol",
    "Complete each sentence with the right Spanish word",
    "Completa cada frase con la palabra en español correcta",
  ),
  instructions: lstr(
    "Écris le mot manquant directement sur la fiche. Mots utiles : reservación, gracias, días, baño, ayuda.",
    "Write the missing word directly on the worksheet. Useful words: reservación, gracias, días, baño, ayuda.",
    "Escribe la palabra que falta directamente en la hoja. Palabras útiles: reservación, gracias, días, baño, ayuda.",
  ),
  items: [
    {
      id: "m1-fb-reservacion",
      scenario: lstr(
        "Tu arrives à l'hôtel, tu te présentes à la réception.",
        "You arrive at the hotel and check in at the front desk.",
        "Llegas al hotel y te presentas en la recepción.",
      ),
      prompt: "Buenos ____ , tengo una ____ a nombre de Marie.",
      answer: "Buenos días, tengo una reservación a nombre de Marie.",
      gloss: lstr(
        "Bonjour, j'ai une réservation au nom de Marie.",
        "Good morning, I have a reservation under the name Marie.",
        "Buenos días, tengo una reservación a nombre de Marie.",
      ),
    },
    {
      id: "m1-fb-bano",
      scenario: lstr(
        "Tu cherches les toilettes dans le lobby.",
        "You are looking for the restroom in the lobby.",
        "Buscas el baño en el lobby.",
      ),
      prompt: "¿Dónde está el ____ , por favor?",
      answer: "¿Dónde está el baño, por favor?",
      gloss: lstr(
        "Où sont les toilettes, s'il vous plaît ?",
        "Where is the restroom, please?",
        "¿Dónde está el baño, por favor?",
      ),
    },
    {
      id: "m1-fb-ayuda",
      scenario: lstr(
        "Tu as besoin d'aide pour porter une valise.",
        "You need help carrying a suitcase.",
        "Necesitas ayuda para cargar una maleta.",
      ),
      prompt: "Necesito ____ con la maleta, por favor.",
      answer: "Necesito ayuda con la maleta, por favor.",
      gloss: lstr(
        "J'ai besoin d'aide avec la valise, s'il vous plaît.",
        "I need help with the suitcase, please.",
        "Necesito ayuda con la maleta, por favor.",
      ),
    },
    {
      id: "m1-fb-gracias",
      scenario: lstr(
        "On t'a aidé. Tu remercies poliment.",
        "Someone helped you. You thank them politely.",
        "Alguien te ayudó. Agradeces con cortesía.",
      ),
      prompt: "Muchas ____ por su ayuda.",
      answer: "Muchas gracias por su ayuda.",
      gloss: lstr(
        "Merci beaucoup pour votre aide.",
        "Thank you very much for your help.",
        "Muchas gracias por su ayuda.",
      ),
    },
  ],
};

const module1ProductionExercise: PrintableProductionExercise = {
  kind: "production",
  id: "m1-production-arrival",
  eyebrow: lstr(
    "Mise en situation · Arrivée",
    "Scenario practice · Arrival",
    "Práctica situacional · Llegada",
  ),
  title: lstr(
    "Que dirais-tu dans chaque situation ?",
    "What would you say in each situation?",
    "¿Qué dirías en cada situación?",
  ),
  instructions: lstr(
    "Écris une réponse courte en espagnol (1 phrase). Utilise le vocabulaire de l'intro.",
    "Write a short answer in Spanish (one sentence). Use the intro vocabulary.",
    "Escribe una respuesta corta en español (una frase). Usa el vocabulario de la intro.",
  ),
  items: [
    {
      id: "m1-prod-greet-morning",
      situation: lstr(
        "Tu rencontres le concierge à 9 h. Comment le salues-tu ?",
        "You meet the concierge at 9 a.m. How do you greet them?",
        "Te encuentras con el conserje a las 9 a.m. ¿Cómo lo saludas?",
      ),
      modelAnswer: "Buenos días, ¿cómo está usted?",
      modelGloss: lstr(
        "Bonjour, comment allez-vous ?",
        "Good morning, how are you?",
        "Buenos días, ¿cómo está?",
      ),
    },
    {
      id: "m1-prod-thanks",
      situation: lstr(
        "Le concierge te donne un plan de la ville. Tu le remercies.",
        "The concierge gives you a city map. You thank them.",
        "El conserje te da un mapa de la ciudad. Le agradeces.",
      ),
      modelAnswer: "Muchas gracias, muy amable.",
      modelGloss: lstr(
        "Merci beaucoup, c'est très gentil.",
        "Thank you very much, that's very kind.",
        "Muchas gracias, muy amable.",
      ),
    },
    {
      id: "m1-prod-ask-help",
      situation: lstr(
        "Tu ne trouves pas ta chambre. Demande de l'aide poliment.",
        "You can't find your room. Ask for help politely.",
        "No encuentras tu habitación. Pide ayuda con cortesía.",
      ),
      modelAnswer: "Disculpe, ¿me puede ayudar a encontrar mi habitación?",
      modelGloss: lstr(
        "Excusez-moi, pouvez-vous m'aider à trouver ma chambre ?",
        "Excuse me, can you help me find my room?",
        "Disculpe, ¿me puede ayudar a encontrar mi habitación?",
      ),
    },
  ],
};

export const module1PrintablePack: PrintableWorksheetPack = {
  moduleId: "module-1",
  sectionEyebrow: lstr(
    "Fiches d'exercices · Module 1",
    "Practice worksheets · Module 1",
    "Hojas de ejercicios · Módulo 1",
  ),
  sectionTitle: lstr(
    "Mets en pratique tes premiers mots dominicains",
    "Put your first Dominican words into practice",
    "Pon en práctica tus primeras palabras dominicanas",
  ),
  sectionBlurb: lstr(
    "Trois exercices à imprimer ou à compléter à l'écran. Réponses dans la zone repliable « Solutions ».",
    "Three exercises you can print or fill in on screen. Answers live in the collapsible \"Answer key\".",
    "Tres ejercicios para imprimir o completar en pantalla. Las respuestas están en la sección plegable \"Soluciones\".",
  ),
  headingId: "yo-do-m1-printables-title",
  dataAttribute: "data-yo-module1-printables",
  exercises: [
    module1MatchExercise,
    module1FillBlankExercise,
    module1ProductionExercise,
  ],
};

// ─── Module 2 — Hotel & airport ─────────────────────────────────────────

const module2MatchExercise: PrintableMatchExercise = {
  kind: "match",
  id: "m2-match-travel-vocab",
  eyebrow: lstr(
    "Vocabulaire · Voyage et hôtel",
    "Vocabulary · Travel and hotel",
    "Vocabulario · Viaje y hotel",
  ),
  title: lstr(
    "Associe chaque mot espagnol à son sens",
    "Match each Spanish word to its meaning",
    "Relaciona cada palabra en español con su significado",
  ),
  instructions: lstr(
    "Écris la lettre du sens correspondant à côté de chaque mot espagnol.",
    "Write the letter of the matching meaning next to each Spanish word.",
    "Escribe la letra del significado correspondiente al lado de cada palabra en español.",
  ),
  pairs: [
    {
      id: "m2-pair-salida",
      spanish: "la salida",
      meaning: lstr("la sortie", "the exit", "la salida"),
    },
    {
      id: "m2-pair-taxi",
      spanish: "el taxi",
      meaning: lstr("le taxi", "the taxi", "el taxi"),
    },
    {
      id: "m2-pair-reservacion",
      spanish: "la reservación",
      meaning: lstr("la réservation", "the reservation", "la reservación"),
    },
    {
      id: "m2-pair-pasaporte",
      spanish: "el pasaporte",
      meaning: lstr("le passeport", "the passport", "el pasaporte"),
    },
    {
      id: "m2-pair-habitacion",
      spanish: "la habitación",
      meaning: lstr("la chambre", "the room", "la habitación"),
    },
    {
      id: "m2-pair-llave",
      spanish: "la llave",
      meaning: lstr("la clé", "the key", "la llave"),
    },
    {
      id: "m2-pair-contrasena",
      spanish: "la contraseña del wifi",
      meaning: lstr("le mot de passe du wifi", "the Wi-Fi password", "la contraseña del wifi"),
    },
    {
      id: "m2-pair-desayuno",
      spanish: "el desayuno",
      meaning: lstr("le petit-déjeuner", "breakfast", "el desayuno"),
    },
    {
      id: "m2-pair-maleta",
      spanish: "la maleta",
      meaning: lstr("la valise", "the suitcase", "la maleta"),
    },
    {
      id: "m2-pair-recepcion",
      spanish: "la recepción",
      meaning: lstr(
        "la réception (comptoir)",
        "the front desk",
        "la recepción",
      ),
    },
  ],
};

const module2FillBlankExercise: PrintableFillBlankExercise = {
  kind: "fill_blank",
  id: "m2-fill-arrival",
  eyebrow: lstr(
    "À compléter · Aéroport et taxi",
    "Fill in · Airport and taxi",
    "Completar · Aeropuerto y taxi",
  ),
  title: lstr(
    "Complète chaque dialogue d'arrivée",
    "Complete each arrival dialogue",
    "Completa cada diálogo de llegada",
  ),
  instructions: lstr(
    "Mots utiles : taxi, salida, reservación, pasaporte, habitación.",
    "Useful words: taxi, salida, reservación, pasaporte, habitación.",
    "Palabras útiles: taxi, salida, reservación, pasaporte, habitación.",
  ),
  items: [
    {
      id: "m2-fb-airport-exit",
      scenario: lstr(
        "Tu cherches la sortie après la douane.",
        "You are looking for the exit after customs.",
        "Buscas la salida después de la aduana.",
      ),
      prompt: "Disculpe, ¿dónde está la ____ ?",
      answer: "Disculpe, ¿dónde está la salida?",
      gloss: lstr(
        "Excusez-moi, où est la sortie ?",
        "Excuse me, where is the exit?",
        "Disculpe, ¿dónde está la salida?",
      ),
    },
    {
      id: "m2-fb-taxi",
      scenario: lstr(
        "Tu donnes ton adresse au chauffeur de taxi.",
        "You give your address to the taxi driver.",
        "Le das tu dirección al taxista.",
      ),
      prompt: "Al hotel Mar Caribe, por ____ .",
      answer: "Al hotel Mar Caribe, por favor.",
      gloss: lstr(
        "À l'hôtel Mar Caribe, s'il vous plaît.",
        "To the Mar Caribe hotel, please.",
        "Al hotel Mar Caribe, por favor.",
      ),
    },
    {
      id: "m2-fb-checkin",
      scenario: lstr(
        "Tu te présentes à la réception de l'hôtel.",
        "You check in at the hotel front desk.",
        "Te presentas en la recepción del hotel.",
      ),
      prompt: "Buenas tardes, tengo una ____ a nombre de Camille.",
      answer: "Buenas tardes, tengo una reservación a nombre de Camille.",
      gloss: lstr(
        "Bon après-midi, j'ai une réservation au nom de Camille.",
        "Good afternoon, I have a reservation under the name Camille.",
        "Buenas tardes, tengo una reservación a nombre de Camille.",
      ),
    },
    {
      id: "m2-fb-passport",
      scenario: lstr(
        "La réceptionniste te demande un document.",
        "The receptionist asks for a document.",
        "La recepcionista te pide un documento.",
      ),
      prompt: "Aquí tiene mi ____ .",
      answer: "Aquí tiene mi pasaporte.",
      gloss: lstr(
        "Voici mon passeport.",
        "Here is my passport.",
        "Aquí tiene mi pasaporte.",
      ),
    },
    {
      id: "m2-fb-room-number",
      scenario: lstr(
        "On te confirme ta chambre.",
        "Your room is confirmed.",
        "Te confirman tu habitación.",
      ),
      prompt: "Su ____ es la número 204, en el segundo piso.",
      answer: "Su habitación es la número 204, en el segundo piso.",
      gloss: lstr(
        "Votre chambre est la 204, au deuxième étage.",
        "Your room is number 204, on the second floor.",
        "Su habitación es la 204, en el segundo piso.",
      ),
    },
  ],
};

const module2MultipleChoiceExercise: PrintableMultipleChoiceExercise = {
  kind: "multiple_choice",
  id: "m2-mc-dialogue-repair",
  eyebrow: lstr(
    "Choix de phrase · Dialogue à réparer",
    "Phrase choice · Dialogue repair",
    "Elección de frase · Reparar el diálogo",
  ),
  title: lstr(
    "Choisis la bonne phrase pour chaque situation",
    "Pick the right phrase for each situation",
    "Elige la frase correcta para cada situación",
  ),
  instructions: lstr(
    "Une seule option est naturelle dans le contexte. Coche-la.",
    "Only one option is natural in context. Check it.",
    "Solo una opción es natural en el contexto. Márcala.",
  ),
  items: [
    {
      id: "m2-mc-no-water",
      scenario: lstr(
        "Il n'y a pas d'eau chaude dans ta chambre. Tu appelles la réception.",
        "There is no hot water in your room. You call the front desk.",
        "No hay agua caliente en tu habitación. Llamas a la recepción.",
      ),
      options: [
        { id: "a", spanish: "No tengo agua caliente en la habitación." },
        { id: "b", spanish: "Quiero un taxi para el aeropuerto." },
        { id: "c", spanish: "El desayuno es a las ocho." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "On signale clairement le problème avec « No tengo… ».",
        "You state the problem clearly with \"No tengo…\".",
        "Indicas el problema claramente con \"No tengo…\".",
      ),
    },
    {
      id: "m2-mc-wifi",
      scenario: lstr(
        "Tu veux le mot de passe du wifi.",
        "You want the Wi-Fi password.",
        "Quieres la contraseña del wifi.",
      ),
      options: [
        { id: "a", spanish: "¿Me trae más toallas, por favor?" },
        { id: "b", spanish: "¿Cuál es la contraseña del wifi?" },
        { id: "c", spanish: "¿Dónde está la salida?" },
      ],
      correctOptionId: "b",
      rationale: lstr(
        "« ¿Cuál es la contraseña… ? » = quelle est le mot de passe.",
        "\"¿Cuál es la contraseña… ?\" = what is the password.",
        "\"¿Cuál es la contraseña… ?\" se usa para preguntar la contraseña.",
      ),
    },
    {
      id: "m2-mc-taxi-price",
      scenario: lstr(
        "Tu demandes le prix de la course au chauffeur.",
        "You ask the driver the fare.",
        "Le preguntas al taxista cuánto cuesta el viaje.",
      ),
      options: [
        { id: "a", spanish: "¿Cuánto cuesta hasta el hotel?" },
        { id: "b", spanish: "¿Acepta tarjeta de crédito?" },
        { id: "c", spanish: "Necesito un pasaporte." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« ¿Cuánto cuesta… ? » est la formule pour demander un prix.",
        "\"¿Cuánto cuesta… ?\" is how you ask a price.",
        "\"¿Cuánto cuesta… ?\" es la forma natural de preguntar el precio.",
      ),
    },
    {
      id: "m2-mc-key",
      scenario: lstr(
        "Tu sors de l'hôtel et tu veux laisser ta clé.",
        "You leave the hotel and want to drop off your key.",
        "Sales del hotel y quieres dejar tu llave.",
      ),
      options: [
        { id: "a", spanish: "Aquí tiene la llave, gracias." },
        { id: "b", spanish: "Quiero el desayuno mañana." },
        { id: "c", spanish: "No hablo español." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« Aquí tiene la llave » = Voici la clé. C'est la formule polie.",
        "\"Aquí tiene la llave\" = Here is the key — the polite form.",
        "\"Aquí tiene la llave\" es la forma cortés de entregar la llave.",
      ),
    },
  ],
};

const module2ProductionExercise: PrintableProductionExercise = {
  kind: "production",
  id: "m2-production-mini-roleplay",
  eyebrow: lstr(
    "Production · Mini-jeu de rôle",
    "Production · Mini roleplay",
    "Producción · Mini-roleplay",
  ),
  title: lstr(
    "Que dirais-tu en arrivant ?",
    "What would you say on arrival?",
    "¿Qué dirías al llegar?",
  ),
  instructions: lstr(
    "Écris ta phrase en espagnol pour chaque étape. Une seule phrase suffit.",
    "Write your Spanish phrase for each step. One sentence is enough.",
    "Escribe tu frase en español para cada paso. Una frase es suficiente.",
  ),
  items: [
    {
      id: "m2-prod-taxi-arrival",
      situation: lstr(
        "Tu sors de l'aéroport et tu hèles un taxi pour ton hôtel.",
        "You leave the airport and hail a taxi to your hotel.",
        "Sales del aeropuerto y tomas un taxi a tu hotel.",
      ),
      modelAnswer: "Hola, al hotel Mar Caribe, por favor. ¿Cuánto cuesta?",
      modelGloss: lstr(
        "Bonjour, à l'hôtel Mar Caribe, s'il vous plaît. C'est combien ?",
        "Hello, to the Mar Caribe hotel, please. How much is it?",
        "Hola, al hotel Mar Caribe, por favor. ¿Cuánto cuesta?",
      ),
    },
    {
      id: "m2-prod-checkin",
      situation: lstr(
        "À la réception de l'hôtel, tu fais ton check-in.",
        "At the front desk, you check in.",
        "En la recepción, haces el check-in.",
      ),
      modelAnswer:
        "Buenas tardes, tengo una reservación a nombre de Camille. Aquí tiene mi pasaporte.",
      modelGloss: lstr(
        "Bon après-midi, j'ai une réservation au nom de Camille. Voici mon passeport.",
        "Good afternoon, I have a reservation under the name Camille. Here is my passport.",
        "Buenas tardes, tengo una reservación a nombre de Camille. Aquí tiene mi pasaporte.",
      ),
    },
    {
      id: "m2-prod-problem",
      situation: lstr(
        "Tu remarques qu'il n'y a pas de mot de passe wifi sur la carte.",
        "You notice the Wi-Fi password isn't on the keycard.",
        "Notas que la contraseña del wifi no está en la tarjeta.",
      ),
      modelAnswer: "Disculpe, ¿cuál es la contraseña del wifi?",
      modelGloss: lstr(
        "Excusez-moi, quel est le mot de passe du wifi ?",
        "Excuse me, what is the Wi-Fi password?",
        "Disculpe, ¿cuál es la contraseña del wifi?",
      ),
    },
  ],
};

export const module2PrintablePack: PrintableWorksheetPack = {
  moduleId: "module-2",
  sectionEyebrow: lstr(
    "Fiches d'exercices · Module 2",
    "Practice worksheets · Module 2",
    "Hojas de ejercicios · Módulo 2",
  ),
  sectionTitle: lstr(
    "Pratique l'arrivée, le taxi et le check-in",
    "Practise arrival, taxi rides, and check-in",
    "Practica la llegada, el taxi y el check-in",
  ),
  sectionBlurb: lstr(
    "Quatre exercices ciblés sur les situations réelles d'arrivée. Solutions en bas de chaque fiche.",
    "Four exercises focused on real arrival situations. Answer keys at the bottom of each sheet.",
    "Cuatro ejercicios centrados en situaciones reales de llegada. Soluciones al final de cada hoja.",
  ),
  headingId: "yo-do-m2-printables-title",
  dataAttribute: "data-yo-module2-printables",
  exercises: [
    module2MatchExercise,
    module2FillBlankExercise,
    module2MultipleChoiceExercise,
    module2ProductionExercise,
  ],
};

// ─── Module 3 — Food, ordering & culture ────────────────────────────────

const module3MatchExercise: PrintableMatchExercise = {
  kind: "match",
  id: "m3-match-food-vocab",
  eyebrow: lstr(
    "Vocabulaire · Plats et boissons",
    "Vocabulary · Food and drinks",
    "Vocabulario · Comida y bebidas",
  ),
  title: lstr(
    "Associe chaque plat ou boisson à sa description",
    "Match each dish or drink to its description",
    "Relaciona cada plato o bebida con su descripción",
  ),
  instructions: lstr(
    "Lis la description et écris la lettre du mot espagnol correspondant.",
    "Read the description and write the letter of the matching Spanish word.",
    "Lee la descripción y escribe la letra de la palabra en español correspondiente.",
  ),
  pairs: [
    {
      id: "m3-pair-mangu",
      spanish: "el mangú",
      meaning: lstr(
        "Purée de bananes plantains, classique du petit-déjeuner.",
        "Mashed plantains — a Dominican breakfast staple.",
        "Puré de plátano, clásico del desayuno.",
      ),
    },
    {
      id: "m3-pair-bandera",
      spanish: "la bandera",
      meaning: lstr(
        "Le plat midi typique : riz, haricots et viande.",
        "The classic lunch plate: rice, beans, and meat.",
        "El plato típico del mediodía: arroz, habichuelas y carne.",
      ),
    },
    {
      id: "m3-pair-tostones",
      spanish: "los tostones",
      meaning: lstr(
        "Bananes plantains vertes frites, croustillantes.",
        "Crispy fried green plantains.",
        "Plátanos verdes fritos y crujientes.",
      ),
    },
    {
      id: "m3-pair-morir",
      spanish: "el morir soñando",
      meaning: lstr(
        "Boisson dominicaine au lait et jus d'orange.",
        "Dominican drink mixing milk and orange juice.",
        "Bebida dominicana con leche y jugo de naranja.",
      ),
    },
    {
      id: "m3-pair-chinola",
      spanish: "la chinola",
      meaning: lstr(
        "Le fruit de la passion, souvent en jus.",
        "Passion fruit, often served as juice.",
        "El fruto de la pasión, casi siempre en jugo.",
      ),
    },
    {
      id: "m3-pair-cuenta",
      spanish: "la cuenta",
      meaning: lstr(
        "L'addition que tu demandes à la fin du repas.",
        "The bill you ask for at the end of a meal.",
        "La cuenta que pides al final de la comida.",
      ),
    },
    {
      id: "m3-pair-colmado",
      spanish: "el colmado",
      meaning: lstr(
        "Petit commerce de quartier, central dans la vie locale.",
        "Neighborhood corner shop, central to local life.",
        "Tienda de barrio, central en la vida local.",
      ),
    },
    {
      id: "m3-pair-bachata",
      spanish: "la bachata",
      meaning: lstr(
        "Genre musical romantique né en RD.",
        "A romantic music genre born in the DR.",
        "Género musical romántico nacido en RD.",
      ),
    },
  ],
};

const module3FillBlankExercise: PrintableFillBlankExercise = {
  kind: "fill_blank",
  id: "m3-fill-menu",
  eyebrow: lstr(
    "À compléter · Au restaurant",
    "Fill in · At the restaurant",
    "Completar · En el restaurante",
  ),
  title: lstr(
    "Complète la commande et le paiement",
    "Complete the order and payment lines",
    "Completa el pedido y el pago",
  ),
  instructions: lstr(
    "Mots utiles : recomienda, picante, llevar, cuenta, tarjeta, agua.",
    "Useful words: recomienda, picante, llevar, cuenta, tarjeta, agua.",
    "Palabras útiles: recomienda, picante, llevar, cuenta, tarjeta, agua.",
  ),
  items: [
    {
      id: "m3-fb-recommend",
      scenario: lstr(
        "Tu ne sais pas quoi commander.",
        "You don't know what to order.",
        "No sabes qué pedir.",
      ),
      prompt: "¿Qué me ____ , por favor?",
      answer: "¿Qué me recomienda, por favor?",
      gloss: lstr(
        "Que me recommandez-vous, s'il vous plaît ?",
        "What do you recommend, please?",
        "¿Qué me recomienda, por favor?",
      ),
    },
    {
      id: "m3-fb-spicy",
      scenario: lstr(
        "Tu veux savoir si un plat est épicé.",
        "You want to know if a dish is spicy.",
        "Quieres saber si un plato es picante.",
      ),
      prompt: "¿Es ____ este plato?",
      answer: "¿Es picante este plato?",
      gloss: lstr(
        "Ce plat est-il épicé ?",
        "Is this dish spicy?",
        "¿Es picante este plato?",
      ),
    },
    {
      id: "m3-fb-takeaway",
      scenario: lstr(
        "Tu veux ta commande à emporter.",
        "You want your order to go.",
        "Quieres tu pedido para llevar.",
      ),
      prompt: "Para ____ , por favor.",
      answer: "Para llevar, por favor.",
      gloss: lstr(
        "À emporter, s'il vous plaît.",
        "To go, please.",
        "Para llevar, por favor.",
      ),
    },
    {
      id: "m3-fb-bill",
      scenario: lstr(
        "Tu termines de manger et tu demandes l'addition.",
        "You finish your meal and ask for the bill.",
        "Terminas de comer y pides la cuenta.",
      ),
      prompt: "¿Me trae la ____ , por favor?",
      answer: "¿Me trae la cuenta, por favor?",
      gloss: lstr(
        "Pouvez-vous m'apporter l'addition, s'il vous plaît ?",
        "Could you bring me the bill, please?",
        "¿Me trae la cuenta, por favor?",
      ),
    },
    {
      id: "m3-fb-card",
      scenario: lstr(
        "Tu veux payer par carte.",
        "You want to pay by card.",
        "Quieres pagar con tarjeta.",
      ),
      prompt: "¿Acepta ____ de crédito?",
      answer: "¿Acepta tarjeta de crédito?",
      gloss: lstr(
        "Acceptez-vous la carte de crédit ?",
        "Do you accept credit card?",
        "¿Acepta tarjeta de crédito?",
      ),
    },
    {
      id: "m3-fb-water",
      scenario: lstr(
        "Tu commandes une boisson simple.",
        "You order a simple drink.",
        "Pides una bebida sencilla.",
      ),
      prompt: "Una ____ sin gas, por favor.",
      answer: "Una agua sin gas, por favor.",
      gloss: lstr(
        "Une eau plate, s'il vous plaît.",
        "A still water, please.",
        "Un agua sin gas, por favor.",
      ),
    },
  ],
};

const module3MultipleChoiceExercise: PrintableMultipleChoiceExercise = {
  kind: "multiple_choice",
  id: "m3-mc-restaurant-scenarios",
  eyebrow: lstr(
    "Choix de phrase · Au restaurant",
    "Phrase choice · At the restaurant",
    "Elección de frase · En el restaurante",
  ),
  title: lstr(
    "Choisis la phrase la plus naturelle dans chaque situation",
    "Pick the most natural phrase for each situation",
    "Elige la frase más natural en cada situación",
  ),
  instructions: lstr(
    "Une seule réponse est juste. Coche-la et compare avec la solution.",
    "Only one answer is correct. Tick it and compare with the answer key.",
    "Solo una respuesta es correcta. Márcala y compara con la solución.",
  ),
  items: [
    {
      id: "m3-mc-no-spicy",
      scenario: lstr(
        "Tu ne supportes pas le piquant. Que dis-tu en commandant ?",
        "You can't handle spicy food. What do you say when ordering?",
        "No toleras el picante. ¿Qué dices al pedir?",
      ),
      options: [
        { id: "a", spanish: "Sin picante, por favor." },
        { id: "b", spanish: "Con mucha sal, por favor." },
        { id: "c", spanish: "Para llevar, por favor." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« Sin picante » = sans piquant. C'est la formule directe et polie.",
        "\"Sin picante\" = no spicy. Direct and polite.",
        "\"Sin picante\" significa sin picante; es la forma directa y cortés.",
      ),
    },
    {
      id: "m3-mc-eat-here",
      scenario: lstr(
        "Tu manges sur place, pas à emporter.",
        "You're eating in, not taking away.",
        "Comes en el sitio, no para llevar.",
      ),
      options: [
        { id: "a", spanish: "Para comer aquí." },
        { id: "b", spanish: "Para llevar." },
        { id: "c", spanish: "Tengo una reservación." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« Para comer aquí » = pour manger ici (vs. para llevar = à emporter).",
        "\"Para comer aquí\" = for here (vs. para llevar = to go).",
        "\"Para comer aquí\" se opone a \"para llevar\".",
      ),
    },
    {
      id: "m3-mc-drink",
      scenario: lstr(
        "Tu veux une boisson typiquement dominicaine au lait et jus d'orange.",
        "You want the Dominican milk-and-orange-juice drink.",
        "Quieres la bebida dominicana de leche y jugo de naranja.",
      ),
      options: [
        { id: "a", spanish: "Un morir soñando, por favor." },
        { id: "b", spanish: "Un café con leche, por favor." },
        { id: "c", spanish: "Una bandera, por favor." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« Morir soñando » est exactement cette boisson dominicaine.",
        "\"Morir soñando\" is exactly that Dominican drink.",
        "\"Morir soñando\" es justamente esa bebida dominicana.",
      ),
    },
    {
      id: "m3-mc-formal",
      scenario: lstr(
        "Tu parles à un serveur que tu ne connais pas. Quelle forme polie utilises-tu ?",
        "You're speaking to a waiter you don't know. Which polite form do you use?",
        "Hablas con un mesero que no conoces. ¿Qué forma cortés usas?",
      ),
      options: [
        { id: "a", spanish: "¿Me trae la cuenta, por favor?" },
        { id: "b", spanish: "Tráeme la cuenta, ¡rápido!" },
        { id: "c", spanish: "Dame la cuenta ya." },
      ],
      correctOptionId: "a",
      rationale: lstr(
        "« ¿Me trae… ? » est la forme polie au « usted », adaptée à un inconnu.",
        "\"¿Me trae… ?\" is the polite \"usted\" form for someone you don't know.",
        "\"¿Me trae… ?\" es la forma cortés con \"usted\".",
      ),
    },
  ],
};

const module3VerbFormExercise: PrintableVerbFormExercise = {
  kind: "verb_form",
  id: "m3-verb-yo-usted",
  eyebrow: lstr(
    "Formes utiles · Yo / usted",
    "Useful forms · Yo / usted",
    "Formas útiles · Yo / usted",
  ),
  title: lstr(
    "Écris la forme conjuguée pour commander et demander",
    "Write the conjugated form you need to order and ask",
    "Escribe la forma conjugada para pedir y preguntar",
  ),
  instructions: lstr(
    "Conjugue chaque verbe à la personne demandée. Reste sur les formes du module : yo (je) ou usted (vous poli).",
    "Conjugate each verb in the requested person. Stay with the module forms: yo (I) or usted (formal you).",
    "Conjuga cada verbo en la persona pedida. Solo formas del módulo: yo / usted.",
  ),
  items: [
    {
      id: "m3-verb-querer-yo",
      infinitive: "querer",
      person: "yo",
      meaning: lstr("vouloir", "to want", "querer"),
      answer: "quiero",
      exampleSentence: lstr(
        "Quiero un morir soñando, por favor.",
        "Quiero un morir soñando, por favor.",
        "Quiero un morir soñando, por favor.",
      ),
    },
    {
      id: "m3-verb-necesitar-yo",
      infinitive: "necesitar",
      person: "yo",
      meaning: lstr("avoir besoin de", "to need", "necesitar"),
      answer: "necesito",
      exampleSentence: lstr(
        "Necesito la cuenta, por favor.",
        "Necesito la cuenta, por favor.",
        "Necesito la cuenta, por favor.",
      ),
    },
    {
      id: "m3-verb-tener-yo",
      infinitive: "tener",
      person: "yo",
      meaning: lstr("avoir", "to have", "tener"),
      answer: "tengo",
      exampleSentence: lstr(
        "Tengo una reservación a las ocho.",
        "Tengo una reservación a las ocho.",
        "Tengo una reservación a las ocho.",
      ),
    },
    {
      id: "m3-verb-poder-usted",
      infinitive: "poder",
      person: "usted",
      meaning: lstr("pouvoir", "to be able to", "poder"),
      answer: "puede",
      exampleSentence: lstr(
        "¿Me puede traer agua sin gas?",
        "¿Me puede traer agua sin gas?",
        "¿Me puede traer agua sin gas?",
      ),
    },
    {
      id: "m3-verb-traer-usted",
      infinitive: "traer",
      person: "usted",
      meaning: lstr("apporter", "to bring", "traer"),
      answer: "trae",
      exampleSentence: lstr(
        "¿Me trae la cuenta, por favor?",
        "¿Me trae la cuenta, por favor?",
        "¿Me trae la cuenta, por favor?",
      ),
    },
    {
      id: "m3-verb-recomendar-usted",
      infinitive: "recomendar",
      person: "usted",
      meaning: lstr("recommander", "to recommend", "recomendar"),
      answer: "recomienda",
      exampleSentence: lstr(
        "¿Qué me recomienda hoy?",
        "¿Qué me recomienda hoy?",
        "¿Qué me recomienda hoy?",
      ),
    },
  ],
};

const module3ProductionExercise: PrintableProductionExercise = {
  kind: "production",
  id: "m3-production-restaurant",
  eyebrow: lstr(
    "Production · Au restaurant",
    "Production · At the restaurant",
    "Producción · En el restaurante",
  ),
  title: lstr(
    "Que dirais-tu à chaque étape du repas ?",
    "What would you say at each step of the meal?",
    "¿Qué dirías en cada paso de la comida?",
  ),
  instructions: lstr(
    "Écris une réponse en espagnol (1 phrase). Utilise le vocabulaire du module 3.",
    "Write one Spanish sentence per item. Use Module 3 vocabulary.",
    "Escribe una frase en español por situación. Usa el vocabulario del módulo 3.",
  ),
  items: [
    {
      id: "m3-prod-table",
      situation: lstr(
        "Tu arrives au restaurant. Demande une table pour deux.",
        "You arrive at the restaurant. Ask for a table for two.",
        "Llegas al restaurante. Pide una mesa para dos.",
      ),
      modelAnswer: "Buenas tardes, una mesa para dos, por favor.",
      modelGloss: lstr(
        "Bon après-midi, une table pour deux, s'il vous plaît.",
        "Good afternoon, a table for two, please.",
        "Buenas tardes, una mesa para dos, por favor.",
      ),
    },
    {
      id: "m3-prod-ask-dish",
      situation: lstr(
        "Tu demandes ce qu'il y a dans le sancocho.",
        "You ask what's in the sancocho.",
        "Preguntas qué trae el sancocho.",
      ),
      modelAnswer: "¿Qué trae el sancocho?",
      modelGloss: lstr(
        "Qu'y a-t-il dans le sancocho ?",
        "What's in the sancocho?",
        "¿Qué trae el sancocho?",
      ),
    },
    {
      id: "m3-prod-bill-card",
      situation: lstr(
        "Tu demandes l'addition et tu vérifies si la carte est acceptée.",
        "You ask for the bill and check if card is accepted.",
        "Pides la cuenta y preguntas si aceptan tarjeta.",
      ),
      modelAnswer: "¿Me trae la cuenta? ¿Acepta tarjeta?",
      modelGloss: lstr(
        "Pouvez-vous m'apporter l'addition ? Acceptez-vous la carte ?",
        "Could you bring me the bill? Do you accept card?",
        "¿Me trae la cuenta? ¿Acepta tarjeta?",
      ),
    },
  ],
};

export const module3PrintablePack: PrintableWorksheetPack = {
  moduleId: "module-3",
  sectionEyebrow: lstr(
    "Fiches d'exercices · Module 3",
    "Practice worksheets · Module 3",
    "Hojas de ejercicios · Módulo 3",
  ),
  sectionTitle: lstr(
    "Pratique la commande, le paiement et la culture",
    "Practise ordering, paying, and culture phrases",
    "Practica el pedido, el pago y la cultura",
  ),
  sectionBlurb: lstr(
    "Cinq exercices ciblés sur la table dominicaine. Solutions en bas de chaque fiche.",
    "Five exercises focused on the Dominican table. Answer keys at the bottom of each sheet.",
    "Cinco ejercicios centrados en la mesa dominicana. Soluciones al final de cada hoja.",
  ),
  headingId: "yo-do-m3-printables-title",
  dataAttribute: "data-yo-module3-printables",
  exercises: [
    module3MatchExercise,
    module3FillBlankExercise,
    module3MultipleChoiceExercise,
    module3VerbFormExercise,
    module3ProductionExercise,
  ],
};
