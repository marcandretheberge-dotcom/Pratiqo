/**
 * YoPratiqo - Dominican Republic Spanish - Module 5 (A2 Capstone).
 *
 * "Imprévus, conversations rapides et mission finale A2".
 *
 * Pedagogical contract:
 *   - Level: full A2 capstone for travel Spanish.
 *   - Tests the four CEFR/DELE A2 skill components: reading
 *     comprehension, listening/oral comprehension, written
 *     expression/interaction, and oral expression/interaction.
 *   - Travel-practical: unexpected situations, fast-speech survival,
 *     past-tense storytelling, polite written messages, planning
 *     changes, asking for help.
 *   - Cultural anchors: Zona Colonial, Los Haitises / Taíno, merengue,
 *     bachata, Dominican fast/abbreviated casual speech, weather and
 *     transport realities. Family-friendly only.
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

/** A stop on the A2 mission map. */
export interface Dom5MissionStop {
  id: string;
  position: number;
  title: YoLocalizedString;
  description: YoLocalizedString;
}

/** One of the four DELE/CEFR A2 skill cards in the dashboard. */
export interface Dom5SkillCard {
  id: string;
  /** Skill key — used by tests + dashboard ordering. */
  skill: "reading" | "listening" | "writing" | "oral";
  title: YoLocalizedString;
  description: YoLocalizedString;
  /** One concrete A2-style task the learner will perform. */
  exampleTask: YoLocalizedString;
  /** A self-check question to confirm the learner can do it. */
  selfCheck: YoLocalizedString;
}

/** A Spanish travel phrase with bilingual gloss + usage hint. */
export interface Dom5Phrase {
  id: string;
  /** Spanish target — plain string, rendered with lang="es". */
  target: string;
  category: YoLocalizedString;
  /** Stable category id used by tests / filters. */
  categoryKey:
    | "help"
    | "lost"
    | "transport"
    | "hotel"
    | "health"
    | "weather"
    | "fastSpeech"
    | "past"
    | "planning"
    | "polite";
  translation: YoLocalizedString;
  usage: YoLocalizedString;
}

/** Awareness card about Dominican fast / abbreviated speech. */
export interface Dom5FastSpeechCard {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
}

/** A practice pair: how it sounds → repair phrase. */
export interface Dom5FastSpeechPair {
  id: string;
  heard: string;
  asked: string;
  note: YoLocalizedString;
}

/** A single spoken line in a dialogue. */
export interface Dom5DialogueLine {
  speaker: YoLocalizedString;
  /** True when the learner is the speaker (right-aligned bubble). */
  isLearner?: boolean;
  /** Spanish target line — rendered with lang="es". */
  target: string;
  translation: YoLocalizedString;
}

/** A practical problem dialogue. */
export interface Dom5Dialogue {
  id: string;
  title: YoLocalizedString;
  scenario: YoLocalizedString;
  lines: Dom5DialogueLine[];
}

/** A short Spanish reading text with FR/EN/ES comprehension support. */
export interface Dom5ReadingText {
  id: string;
  title: YoLocalizedString;
  /** Spanish paragraphs; each is rendered with a per-paragraph audio button. */
  paragraphs: string[];
  /** Approximate Spanish word count (used for badges + tests). */
  wordCount: number;
  /** Vocabulary anchors highlighted alongside the text. */
  vocabulary: Array<{ target: string; gloss: YoLocalizedString }>;
  /** Comprehension questions with their model answers. */
  questions: Array<{
    id: string;
    prompt: YoLocalizedString;
    answer: YoLocalizedString;
  }>;
  /** Short written-response prompt for the learner. */
  writtenPrompt: YoLocalizedString;
}

/** A guided A2 writing task. */
export interface Dom5WritingTask {
  id: string;
  title: YoLocalizedString;
  prompt: YoLocalizedString;
  /** A few Spanish phrases the learner can reuse. */
  usefulPhrases: string[];
  /** Bullet structure scaffold (FR/EN/ES). */
  scaffold: YoLocalizedString[];
  /** Sample answer the learner can reveal. */
  sampleAnswer: string;
  /** Word target as a localized label (e.g. "40-70 mots"). */
  wordTarget: YoLocalizedString;
}

/** An oral interaction roleplay card. */
export interface Dom5RoleplayCard {
  id: string;
  title: YoLocalizedString;
  scene: YoLocalizedString;
  roleA: YoLocalizedString;
  roleB: YoLocalizedString;
  targetPhrases: string[];
  successChecklist: YoLocalizedString[];
  modelSentence: string;
}

/** An A2 grammar / language toolbox card. */
export interface Dom5GrammarCard {
  id: string;
  pattern: string;
  meaning: YoLocalizedString;
  examples: Array<{ target: string; translation: YoLocalizedString }>;
  prompt: YoLocalizedString;
}

/** Module 5 flashcard. */
export interface Dom5Flashcard {
  id: string;
  category: YoLocalizedString;
  /** Spanish target — rendered with lang="es". */
  front: string;
  back: YoLocalizedString;
}

/** A multiple-choice quiz question. */
export interface Dom5QuizQuestion {
  id: string;
  type: YoLocalizedString;
  prompt: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  explanation: YoLocalizedString;
}

/** A round in the final capstone game. */
export interface Dom5GameRound {
  id: string;
  stop: number;
  scenario: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  feedback: YoLocalizedString;
}

/** Printable worksheet kinds covered by Module 5. */
export type Dom5PrintableKind =
  | "vocabulary"
  | "fill_blank"
  | "past_tense"
  | "connectors"
  | "reading"
  | "writing"
  | "final_workbook";

export interface Dom5PrintableSheet {
  id: string;
  kind: Dom5PrintableKind;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  items: Array<{
    id: string;
    target?: string;
    prompt: YoLocalizedString;
    answer: YoLocalizedString;
  }>;
}

/** A single self-assessment "I can…" item. */
export interface Dom5SelfAssessmentItem {
  id: string;
  statement: YoLocalizedString;
}

/** Top-level Module 5 data aggregate. */
export interface DominicanRepublicA2CapstoneData {
  moduleId: string;
  moduleLabel: YoLocalizedString;
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  productLabel: YoLocalizedString;
  audioBrowserNoteShort: YoLocalizedString;
  audioBrowserNoteLong: YoLocalizedString;
  printButtonLabel: YoLocalizedString;
  capstoneCompletionMessage: YoLocalizedString;
  seriesCompletionTitle: YoLocalizedString;
  seriesCompletionBody: YoLocalizedString;
  missionStops: Dom5MissionStop[];
  skillDashboard: Dom5SkillCard[];
  phraseBank: Dom5Phrase[];
  fastSpeechSection: {
    title: YoLocalizedString;
    intro: YoLocalizedString;
    cards: Dom5FastSpeechCard[];
    pairs: Dom5FastSpeechPair[];
  };
  dialogues: Dom5Dialogue[];
  readingTexts: Dom5ReadingText[];
  writingTasks: Dom5WritingTask[];
  roleplayCards: Dom5RoleplayCard[];
  grammarCards: Dom5GrammarCard[];
  flashcards: Dom5Flashcard[];
  quizQuestions: Dom5QuizQuestion[];
  finalGame: {
    title: YoLocalizedString;
    subtitle: YoLocalizedString;
    successMessage: YoLocalizedString;
    rounds: Dom5GameRound[];
  };
  printableSheets: Dom5PrintableSheet[];
  selfAssessment: Dom5SelfAssessmentItem[];
}

// ─── Mission map · 7 A2 stops ───────────────────────────────────────────

const missionStops: Dom5MissionStop[] = [
  {
    id: "understand-message",
    position: 1,
    title: lstr(
      "Comprendre une annonce ou un message",
      "Understand a notice or message",
      "Entender un aviso o mensaje",
    ),
    description: lstr(
      "Lire un court message du hôtel, du guide ou d'un service local et repérer l'information clé.",
      "Read a short message from the hotel, guide, or a local service and spot the key information.",
      "Lee un mensaje corto del hotel, del guía o de un servicio local y localiza la información clave.",
    ),
  },
  {
    id: "explain-problem",
    position: 2,
    title: lstr(
      "Expliquer un problème",
      "Explain a problem",
      "Explicar un problema",
    ),
    description: lstr(
      "Dire calmement ce qui ne va pas : objet perdu, réservation, transport, météo.",
      "Calmly say what's wrong: lost item, reservation, transport, or weather.",
      "Cuenta con calma lo que pasa: objeto perdido, reservación, transporte o clima.",
    ),
  },
  {
    id: "ask-for-help",
    position: 3,
    title: lstr(
      "Demander de l'aide",
      "Ask for help",
      "Pedir ayuda",
    ),
    description: lstr(
      "Formuler une demande polie, donner du contexte, accepter ou refuser une option.",
      "Make a polite request, give context, accept or decline an option.",
      "Formula una solicitud amable, da contexto, acepta o rechaza una opción.",
    ),
  },
  {
    id: "tell-what-happened",
    position: 4,
    title: lstr(
      "Raconter ce qui s'est passé",
      "Talk about what happened",
      "Contar lo que pasó",
    ),
    description: lstr(
      "Utiliser les formes utiles au passé : fui, perdí, llegué, cambié, me gustó, fue.",
      "Use useful past-tense forms: fui, perdí, llegué, cambié, me gustó, fue.",
      "Usa las formas útiles en pasado: fui, perdí, llegué, cambié, me gustó, fue.",
    ),
  },
  {
    id: "change-plan",
    position: 5,
    title: lstr(
      "Changer un plan",
      "Change a plan",
      "Cambiar un plan",
    ),
    description: lstr(
      "Comparer des options, choisir une solution et confirmer l'heure et le lieu.",
      "Compare options, pick a solution, and confirm the time and place.",
      "Compara opciones, elige una solución y confirma la hora y el lugar.",
    ),
  },
  {
    id: "react-to-fast-speech",
    position: 6,
    title: lstr(
      "Réagir à l'espagnol rapide",
      "React to fast Spanish",
      "Reaccionar al español rápido",
    ),
    description: lstr(
      "Demander de répéter, parler plus lentement, écrire ou utiliser le contexte pour deviner.",
      "Ask for a repeat, slower speech, a written backup, or use context to guess.",
      "Pide que repitan, hablen más despacio, escriban o usa el contexto para deducir.",
    ),
  },
  {
    id: "final-mission",
    position: 7,
    title: lstr(
      "Mission finale A2",
      "Final A2 mission",
      "Misión final A2",
    ),
    description: lstr(
      "Sauve ton dernier jour : un imprévu, un changement, un message poli et une vraie histoire à raconter.",
      "Save your last day: an unexpected event, a change, a polite message, and a real story to tell.",
      "Salva tu último día: un imprevisto, un cambio, un mensaje amable y una historia real que contar.",
    ),
  },
];

// ─── Four-skill A2 dashboard ────────────────────────────────────────────

const skillDashboard: Dom5SkillCard[] = [
  {
    id: "skill-reading",
    skill: "reading",
    title: lstr(
      "Compréhension écrite",
      "Reading comprehension",
      "Comprensión escrita",
    ),
    description: lstr(
      "Lire et comprendre un court message d'hôtel, un panneau ou une note de guide.",
      "Read and understand a short hotel message, a sign, or a guide's note.",
      "Lee y entiende un mensaje corto del hotel, un cartel o una nota del guía.",
    ),
    exampleTask: lstr(
      "Lis le message du hôtel et repère l'heure du check-in.",
      "Read the hotel message and find the check-in time.",
      "Lee el mensaje del hotel y localiza la hora del check-in.",
    ),
    selfCheck: lstr(
      "Peux-tu retrouver une heure, un lieu ou un changement dans un texte court ?",
      "Can you find a time, a place, or a change in a short text?",
      "¿Puedes encontrar una hora, un lugar o un cambio en un texto corto?",
    ),
  },
  {
    id: "skill-listening",
    skill: "listening",
    title: lstr(
      "Compréhension orale",
      "Listening comprehension",
      "Comprensión oral",
    ),
    description: lstr(
      "Comprendre une réponse pratique, même quand l'espagnol va vite, en demandant de répéter si besoin.",
      "Understand a practical answer, even when Spanish is fast, by asking for a repeat if needed.",
      "Entiende una respuesta práctica, aun cuando el español va rápido, pidiendo que repitan si hace falta.",
    ),
    exampleTask: lstr(
      "Écoute le guide expliquer le changement de météo et reformule en une phrase.",
      "Listen to the guide explain the weather change and reformulate it in one sentence.",
      "Escucha al guía explicar el cambio del clima y resúmelo en una frase.",
    ),
    selfCheck: lstr(
      "Sais-tu demander de parler plus lentement ou d'écrire ?",
      "Can you ask someone to speak more slowly or to write it down?",
      "¿Sabes pedir que hablen más despacio o que lo escriban?",
    ),
  },
  {
    id: "skill-writing",
    skill: "writing",
    title: lstr(
      "Expression écrite",
      "Written expression",
      "Expresión escrita",
    ),
    description: lstr(
      "Écrire un court message poli (40 à 70 mots) pour expliquer un problème ou demander de l'aide.",
      "Write a short polite message (40-70 words) to explain a problem or ask for help.",
      "Escribe un mensaje corto y amable (40 a 70 palabras) para explicar un problema o pedir ayuda.",
    ),
    exampleTask: lstr(
      "Écris un message au hôtel parce que ta réservation n'apparaît pas.",
      "Write a message to the hotel because your reservation does not appear.",
      "Escribe un mensaje al hotel porque tu reservación no aparece.",
    ),
    selfCheck: lstr(
      "Peux-tu commencer poliment, expliquer le problème et terminer par une formule de politesse ?",
      "Can you start politely, explain the problem, and close with a polite phrase?",
      "¿Puedes empezar con cortesía, explicar el problema y cerrar con una frase amable?",
    ),
  },
  {
    id: "skill-oral",
    skill: "oral",
    title: lstr(
      "Interaction orale",
      "Oral interaction",
      "Interacción oral",
    ),
    description: lstr(
      "Tenir un échange court : saluer, expliquer, demander une option, remercier.",
      "Hold a short exchange: greet, explain, ask for an option, thank.",
      "Mantén un intercambio corto: saluda, explica, pide una opción y agradece.",
    ),
    exampleTask: lstr(
      "Joue le rôle du voyageur et explique au réceptionniste pourquoi tu arrives en retard.",
      "Play the traveler and explain to the receptionist why you are arriving late.",
      "Haz el papel del viajero y explica al recepcionista por qué llegas tarde.",
    ),
    selfCheck: lstr(
      "Sais-tu demander une autre option et confirmer ton choix ?",
      "Can you ask for another option and confirm your choice?",
      "¿Sabes pedir otra opción y confirmar tu elección?",
    ),
  },
];

// ─── Core phrase bank · 60 Spanish A2 travel phrases ────────────────────

const CAT_HELP = lstr(
  "Aide et problèmes",
  "Help and problems",
  "Ayuda y problemas",
);
const CAT_LOST = lstr(
  "Objets perdus",
  "Lost items",
  "Objetos perdidos",
);
const CAT_TRANSPORT = lstr(
  "Transport et trajets",
  "Transport changes",
  "Transporte y trayectos",
);
const CAT_HOTEL = lstr(
  "Hôtel et réservations",
  "Hotel & reservations",
  "Hotel y reservaciones",
);
const CAT_HEALTH = lstr(
  "Santé pratique",
  "Practical health",
  "Salud práctica",
);
const CAT_WEATHER = lstr(
  "Météo et retards",
  "Weather and delays",
  "Clima y retrasos",
);
const CAT_FAST = lstr(
  "Réparer la communication",
  "Fast-speech repair",
  "Reparar la comunicación",
);
const CAT_PAST = lstr(
  "Raconter au passé",
  "Past-tense storytelling",
  "Contar en pasado",
);
const CAT_PLAN = lstr(
  "Planifier la suite",
  "Planning next steps",
  "Planificar lo que sigue",
);
const CAT_POLITE = lstr(
  "Demandes polies",
  "Polite requests",
  "Solicitudes amables",
);

const phraseBank: Dom5Phrase[] = [
  // Help & problems (1-6)
  {
    id: "p-need-help",
    target: "Necesito ayuda, por favor.",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr(
      "J'ai besoin d'aide, s'il vous plaît.",
      "I need help, please.",
      "Necesito ayuda, por favor.",
    ),
    usage: lstr(
      "Phrase claire et polie pour ouvrir une demande d'aide.",
      "A clear, polite opener when asking for help.",
      "Frase clara y amable para abrir una solicitud de ayuda.",
    ),
  },
  {
    id: "p-have-problem",
    target: "Tengo un problema.",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr("J'ai un problème.", "I have a problem.", "Tengo un problema."),
    usage: lstr(
      "Idéal au début d'un message ou face à un employé.",
      "Great at the start of a message or with a desk agent.",
      "Ideal al inicio de un mensaje o ante un empleado.",
    ),
  },
  {
    id: "p-can-you-help",
    target: "¿Puede ayudarme?",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr(
      "Pouvez-vous m'aider ?",
      "Can you help me?",
      "¿Puede ayudarme?",
    ),
    usage: lstr(
      "Demande directe et courtoise (vouvoiement).",
      "Direct, courteous request (formal you).",
      "Solicitud directa y cortés (forma de usted).",
    ),
  },
  {
    id: "p-where-help",
    target: "¿Dónde puedo pedir ayuda?",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr(
      "Où puis-je demander de l'aide ?",
      "Where can I ask for help?",
      "¿Dónde puedo pedir ayuda?",
    ),
    usage: lstr(
      "Quand tu ne sais pas vers qui te tourner.",
      "When you don't know who to turn to.",
      "Cuando no sabes a quién acudir.",
    ),
  },
  {
    id: "p-write-because-problem",
    target: "Le escribo porque tengo un problema.",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr(
      "Je vous écris parce que j'ai un problème.",
      "I'm writing because I have a problem.",
      "Le escribo porque tengo un problema.",
    ),
    usage: lstr(
      "Ouverture polie idéale pour un email ou un message.",
      "Polite opener perfect for an email or message.",
      "Apertura amable perfecta para un correo o mensaje.",
    ),
  },
  {
    id: "p-thanks-help",
    target: "Muchas gracias por su ayuda.",
    category: CAT_HELP,
    categoryKey: "help",
    translation: lstr(
      "Merci beaucoup pour votre aide.",
      "Thank you so much for your help.",
      "Muchas gracias por su ayuda.",
    ),
    usage: lstr(
      "Pour clore un échange ou un message poli.",
      "To close an exchange or polite message.",
      "Para cerrar un intercambio o mensaje amable.",
    ),
  },
  // Lost items (7-12)
  {
    id: "p-lost-phone",
    target: "Perdí mi teléfono.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "J'ai perdu mon téléphone.",
      "I lost my phone.",
      "Perdí mi teléfono.",
    ),
    usage: lstr(
      "Forme au passé claire et utile en voyage.",
      "A clear, travel-useful past-tense form.",
      "Forma en pasado clara y útil en viaje.",
    ),
  },
  {
    id: "p-lost-passport",
    target: "Perdí mi pasaporte.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "J'ai perdu mon passeport.",
      "I lost my passport.",
      "Perdí mi pasaporte.",
    ),
    usage: lstr(
      "À utiliser à l'hôtel, à l'ambassade ou avec la police touristique.",
      "Use at the hotel, embassy, or with tourist police.",
      "Úsalo en el hotel, en la embajada o con la policía turística.",
    ),
  },
  {
    id: "p-cant-find-luggage",
    target: "No encuentro mi maleta.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "Je ne trouve pas ma valise.",
      "I can't find my luggage.",
      "No encuentro mi maleta.",
    ),
    usage: lstr(
      "À l'aéroport ou à la réception après un transfert.",
      "At the airport or reception after a transfer.",
      "En el aeropuerto o en recepción tras un traslado.",
    ),
  },
  {
    id: "p-key-room",
    target: "Se me quedó la llave en la habitación.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "J'ai laissé la clé dans la chambre.",
      "I left the key in the room.",
      "Se me quedó la llave en la habitación.",
    ),
    usage: lstr(
      "Phrase typique « il m'est arrivé que » — très utile en hôtel.",
      "A typical \"it happened to me\" structure — very useful at hotels.",
      "Estructura típica «se me…» — muy útil en hoteles.",
    ),
  },
  {
    id: "p-wrong-address",
    target: "Me equivoqué de dirección.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "Je me suis trompé(e) d'adresse.",
      "I got the address wrong.",
      "Me equivoqué de dirección.",
    ),
    usage: lstr(
      "Pour expliquer une arrivée au mauvais endroit.",
      "To explain you arrived at the wrong place.",
      "Para explicar que llegaste al lugar equivocado.",
    ),
  },
  {
    id: "p-arrived-late",
    target: "Llegué tarde.",
    category: CAT_LOST,
    categoryKey: "lost",
    translation: lstr(
      "Je suis arrivé(e) en retard.",
      "I arrived late.",
      "Llegué tarde.",
    ),
    usage: lstr(
      "Phrase courte au passé pour s'excuser.",
      "Short past-tense phrase to apologise.",
      "Frase corta en pasado para disculparse.",
    ),
  },
  // Transport changes (13-18)
  {
    id: "p-transport-no-show",
    target: "El transporte no llegó.",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "Le transport n'est pas arrivé.",
      "The transport didn't arrive.",
      "El transporte no llegó.",
    ),
    usage: lstr(
      "Tu signales un transfert manqué.",
      "You report a missed transfer.",
      "Reporta un traslado que no apareció.",
    ),
  },
  {
    id: "p-guagua-left",
    target: "La guagua se fue.",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "La guagua est partie.",
      "The guagua left.",
      "La guagua se fue.",
    ),
    usage: lstr(
      "Vocabulaire dominicain : « guagua » = bus/minibus.",
      "Dominican vocabulary: \"guagua\" = bus/minibus.",
      "Vocabulario dominicano: «guagua» = autobús/microbús.",
    ),
  },
  {
    id: "p-taxi-no-show",
    target: "El taxi no apareció.",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "Le taxi ne s'est pas présenté.",
      "The taxi didn't show up.",
      "El taxi no apareció.",
    ),
    usage: lstr(
      "Pour un taxi commandé qui n'arrive pas.",
      "For a booked taxi that never came.",
      "Para un taxi reservado que no apareció.",
    ),
  },
  {
    id: "p-prefer-taxi",
    target: "Prefiero tomar un taxi.",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "Je préfère prendre un taxi.",
      "I'd rather take a taxi.",
      "Prefiero tomar un taxi.",
    ),
    usage: lstr(
      "Pour confirmer ton choix de transport.",
      "To confirm your transport choice.",
      "Para confirmar tu elección de transporte.",
    ),
  },
  {
    id: "p-prefer-wait",
    target: "Prefiero esperar.",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "Je préfère attendre.",
      "I'd rather wait.",
      "Prefiero esperar.",
    ),
    usage: lstr(
      "Quand l'option B te convient mieux.",
      "When option B suits you better.",
      "Cuando la opción B te conviene más.",
    ),
  },
  {
    id: "p-how-long",
    target: "¿Cuánto tiempo va a tardar?",
    category: CAT_TRANSPORT,
    categoryKey: "transport",
    translation: lstr(
      "Combien de temps cela va-t-il prendre ?",
      "How long will it take?",
      "¿Cuánto tiempo va a tardar?",
    ),
    usage: lstr(
      "Pour estimer un délai d'attente.",
      "To estimate a waiting time.",
      "Para estimar un tiempo de espera.",
    ),
  },
  // Hotel & reservations (19-23)
  {
    id: "p-reservation-not-found",
    target: "Mi reservación no aparece.",
    category: CAT_HOTEL,
    categoryKey: "hotel",
    translation: lstr(
      "Ma réservation n'apparaît pas.",
      "My reservation doesn't appear.",
      "Mi reservación no aparece.",
    ),
    usage: lstr(
      "Phrase clé à la réception en cas de problème.",
      "Key phrase at the front desk when something is off.",
      "Frase clave en recepción cuando algo no aparece.",
    ),
  },
  {
    id: "p-change-reservation",
    target: "Necesito cambiar la reservación.",
    category: CAT_HOTEL,
    categoryKey: "hotel",
    translation: lstr(
      "Je dois modifier la réservation.",
      "I need to change the reservation.",
      "Necesito cambiar la reservación.",
    ),
    usage: lstr(
      "Pour demander un changement de date ou de chambre.",
      "To request a change of date or room.",
      "Para pedir un cambio de fecha o de habitación.",
    ),
  },
  {
    id: "p-cancel-excursion",
    target: "Necesito cancelar la excursión.",
    category: CAT_HOTEL,
    categoryKey: "hotel",
    translation: lstr(
      "Je dois annuler l'excursion.",
      "I need to cancel the excursion.",
      "Necesito cancelar la excursión.",
    ),
    usage: lstr(
      "Pour reporter ou annuler une activité.",
      "To postpone or cancel an activity.",
      "Para posponer o cancelar una actividad.",
    ),
  },
  {
    id: "p-call-hotel",
    target: "Necesito llamar al hotel.",
    category: CAT_HOTEL,
    categoryKey: "hotel",
    translation: lstr(
      "J'ai besoin d'appeler l'hôtel.",
      "I need to call the hotel.",
      "Necesito llamar al hotel.",
    ),
    usage: lstr(
      "Pour confirmer ou modifier ton arrivée.",
      "To confirm or change your arrival.",
      "Para confirmar o cambiar tu llegada.",
    ),
  },
  {
    id: "p-call-family",
    target: "Necesito llamar a mi familia.",
    category: CAT_HOTEL,
    categoryKey: "hotel",
    translation: lstr(
      "J'ai besoin d'appeler ma famille.",
      "I need to call my family.",
      "Necesito llamar a mi familia.",
    ),
    usage: lstr(
      "Phrase rassurante quand quelque chose change.",
      "A reassuring phrase when something changes.",
      "Frase tranquilizadora cuando algo cambia.",
    ),
  },
  // Health / pharmacy (24-29)
  {
    id: "p-where-pharmacy",
    target: "¿Dónde hay una farmacia?",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "Où y a-t-il une pharmacie ?",
      "Where is there a pharmacy?",
      "¿Dónde hay una farmacia?",
    ),
    usage: lstr(
      "Question simple et directe.",
      "Simple, direct question.",
      "Pregunta sencilla y directa.",
    ),
  },
  {
    id: "p-need-pharmacy",
    target: "Necesito ir a una farmacia.",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "J'ai besoin d'aller à une pharmacie.",
      "I need to go to a pharmacy.",
      "Necesito ir a una farmacia.",
    ),
    usage: lstr(
      "Quand tu as un petit besoin pratique.",
      "When you have a small practical need.",
      "Cuando tienes una necesidad práctica.",
    ),
  },
  {
    id: "p-not-feeling-well",
    target: "No me siento bien.",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "Je ne me sens pas bien.",
      "I don't feel well.",
      "No me siento bien.",
    ),
    usage: lstr(
      "Phrase générale et sûre, sans diagnostic.",
      "General, safe phrase — no medical detail.",
      "Frase general y segura, sin diagnóstico.",
    ),
  },
  {
    id: "p-headache",
    target: "Me duele la cabeza.",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "J'ai mal à la tête.",
      "I have a headache.",
      "Me duele la cabeza.",
    ),
    usage: lstr(
      "Modèle « me duele + partie du corps ».",
      "Pattern: \"me duele + body part\".",
      "Patrón: «me duele + parte del cuerpo».",
    ),
  },
  {
    id: "p-use-wifi",
    target: "¿Puedo usar el wifi?",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "Puis-je utiliser le wifi ?",
      "Can I use the wifi?",
      "¿Puedo usar el wifi?",
    ),
    usage: lstr(
      "Pour rester connecté pendant une situation imprévue.",
      "To stay connected during an unexpected situation.",
      "Para mantenerte en línea ante un imprevisto.",
    ),
  },
  {
    id: "p-charge-phone",
    target: "¿Puedo cargar mi teléfono?",
    category: CAT_HEALTH,
    categoryKey: "health",
    translation: lstr(
      "Puis-je recharger mon téléphone ?",
      "Can I charge my phone?",
      "¿Puedo cargar mi teléfono?",
    ),
    usage: lstr(
      "Très utile dans un café ou à la réception.",
      "Very useful at a café or front desk.",
      "Muy útil en un café o en recepción.",
    ),
  },
  // Weather & delays (30-35)
  {
    id: "p-weather-changed",
    target: "El clima cambió.",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "Le temps a changé.",
      "The weather changed.",
      "El clima cambió.",
    ),
    usage: lstr(
      "Phrase au passé pour signaler un changement.",
      "Past-tense phrase to flag a change.",
      "Frase en pasado para señalar un cambio.",
    ),
  },
  {
    id: "p-its-raining",
    target: "Está lloviendo.",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "Il pleut.",
      "It's raining.",
      "Está lloviendo.",
    ),
    usage: lstr(
      "Présent continu, très utile en RD.",
      "Present continuous — very common in DR.",
      "Presente continuo, muy útil en RD.",
    ),
  },
  {
    id: "p-windy",
    target: "Hay mucho viento.",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "Il y a beaucoup de vent.",
      "It's very windy.",
      "Hay mucho viento.",
    ),
    usage: lstr(
      "Avec « hay » pour décrire la météo.",
      "Use \"hay\" to describe weather.",
      "Con «hay» para describir el clima.",
    ),
  },
  {
    id: "p-road-closed",
    target: "El camino está cerrado.",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "La route est fermée.",
      "The road is closed.",
      "El camino está cerrado.",
    ),
    usage: lstr(
      "Pour expliquer un détour ou un retard.",
      "To explain a detour or delay.",
      "Para explicar un desvío o un retraso.",
    ),
  },
  {
    id: "p-excursion-still-on",
    target: "¿La excursión sigue en pie?",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "L'excursion est-elle maintenue ?",
      "Is the excursion still on?",
      "¿La excursión sigue en pie?",
    ),
    usage: lstr(
      "Pour vérifier qu'une activité a toujours lieu.",
      "To check if an activity is still happening.",
      "Para confirmar si la actividad sigue.",
    ),
  },
  {
    id: "p-when-leave",
    target: "¿A qué hora salimos?",
    category: CAT_WEATHER,
    categoryKey: "weather",
    translation: lstr(
      "À quelle heure partons-nous ?",
      "What time do we leave?",
      "¿A qué hora salimos?",
    ),
    usage: lstr(
      "Pour confirmer l'horaire après un changement.",
      "To confirm the schedule after a change.",
      "Para confirmar el horario tras un cambio.",
    ),
  },
  // Fast-speech repair (36-41)
  {
    id: "p-explain-again",
    target: "¿Me puede explicar otra vez?",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Pouvez-vous m'expliquer encore une fois ?",
      "Can you explain again?",
      "¿Me puede explicar otra vez?",
    ),
    usage: lstr(
      "Demande polie de répétition complète.",
      "Polite request for a full repeat.",
      "Solicitud amable para repetir todo.",
    ),
  },
  {
    id: "p-slower",
    target: "¿Me puede hablar más despacio?",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Pouvez-vous parler plus lentement ?",
      "Can you speak more slowly?",
      "¿Me puede hablar más despacio?",
    ),
    usage: lstr(
      "La phrase la plus utile face à l'espagnol rapide.",
      "The single most useful phrase against fast Spanish.",
      "La frase más útil ante el español rápido.",
    ),
  },
  {
    id: "p-didnt-understand-last",
    target: "No entendí la última parte.",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Je n'ai pas compris la dernière partie.",
      "I didn't catch the last part.",
      "No entendí la última parte.",
    ),
    usage: lstr(
      "Précis : tu identifies exactement ce que tu n'as pas saisi.",
      "Precise: you point to exactly what you missed.",
      "Preciso: indicas exactamente lo que no captaste.",
    ),
  },
  {
    id: "p-write-it",
    target: "¿Puede escribirlo, por favor?",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Pouvez-vous l'écrire, s'il vous plaît ?",
      "Could you write it, please?",
      "¿Puede escribirlo, por favor?",
    ),
    usage: lstr(
      "Plan B très efficace : passe à l'écrit.",
      "An effective plan B — switch to writing.",
      "Plan B muy efectivo: pasa al escrito.",
    ),
  },
  {
    id: "p-repeat-slower",
    target: "Disculpe, ¿puede repetirlo más despacio?",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Excusez-moi, pouvez-vous répéter plus lentement ?",
      "Excuse me, can you repeat that more slowly?",
      "Disculpe, ¿puede repetirlo más despacio?",
    ),
    usage: lstr(
      "Combine excuse polie + demande de débit plus lent.",
      "Combines a polite apology with a slow-down request.",
      "Combina disculpa amable y petición de hablar despacio.",
    ),
  },
  {
    id: "p-best-option",
    target: "¿Cuál es la mejor opción?",
    category: CAT_FAST,
    categoryKey: "fastSpeech",
    translation: lstr(
      "Quelle est la meilleure option ?",
      "Which is the best option?",
      "¿Cuál es la mejor opción?",
    ),
    usage: lstr(
      "Pour faire reformuler en plus simple.",
      "To get a clearer reformulation.",
      "Para que reformulen de manera más clara.",
    ),
  },
  // Past-tense storytelling (42-49)
  {
    id: "p-went-yesterday",
    target: "Fuimos ayer.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "Nous y sommes allés hier.",
      "We went yesterday.",
      "Fuimos ayer.",
    ),
    usage: lstr(
      "Forme au passé « nous » très utile.",
      "Useful \"we\" past form.",
      "Forma en pasado «nosotros» muy útil.",
    ),
  },
  {
    id: "p-visited-zona-colonial",
    target: "Visité la Zona Colonial.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "J'ai visité la Zona Colonial.",
      "I visited the Zona Colonial.",
      "Visité la Zona Colonial.",
    ),
    usage: lstr(
      "Forme régulière du passé : visit-é.",
      "Regular past form: visit-é.",
      "Forma regular en pasado: visit-é.",
    ),
  },
  {
    id: "p-went-haitises",
    target: "Fui a Los Haitises.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "Je suis allé(e) à Los Haitises.",
      "I went to Los Haitises.",
      "Fui a Los Haitises.",
    ),
    usage: lstr(
      "« Fui » est la forme irrégulière de « ir » (aller).",
      "\"Fui\" is the irregular past of \"ir\" (to go).",
      "«Fui» es el irregular de «ir» en pasado.",
    ),
  },
  {
    id: "p-took-guagua",
    target: "Tomé una guagua.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "J'ai pris une guagua.",
      "I took a guagua.",
      "Tomé una guagua.",
    ),
    usage: lstr(
      "Pour raconter ton transport sur place.",
      "To recount your transport on site.",
      "Para contar tu transporte en el lugar.",
    ),
  },
  {
    id: "p-bought-souvenir",
    target: "Compré un recuerdo.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "J'ai acheté un souvenir.",
      "I bought a souvenir.",
      "Compré un recuerdo.",
    ),
    usage: lstr(
      "Forme régulière au passé : compr-é.",
      "Regular past form: compr-é.",
      "Forma regular en pasado: compr-é.",
    ),
  },
  {
    id: "p-took-photos",
    target: "Saqué muchas fotos.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "J'ai pris beaucoup de photos.",
      "I took lots of photos.",
      "Saqué muchas fotos.",
    ),
    usage: lstr(
      "« Sacar fotos » est l'usage le plus courant en Amérique latine.",
      "\"Sacar fotos\" is the most common form in Latin America.",
      "«Sacar fotos» es el uso más común en Latinoamérica.",
    ),
  },
  {
    id: "p-liked-it-a-lot",
    target: "Me gustó mucho.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "Ça m'a beaucoup plu.",
      "I liked it a lot.",
      "Me gustó mucho.",
    ),
    usage: lstr(
      "Phrase clé pour exprimer une impression positive.",
      "Key phrase to share a positive impression.",
      "Frase clave para expresar una impresión positiva.",
    ),
  },
  {
    id: "p-amazing-experience",
    target: "Fue una experiencia increíble.",
    category: CAT_PAST,
    categoryKey: "past",
    translation: lstr(
      "Ce fut une expérience incroyable.",
      "It was an amazing experience.",
      "Fue una experiencia increíble.",
    ),
    usage: lstr(
      "« Fue » est l'irrégulier de « ser/ir » au passé.",
      "\"Fue\" is the irregular past of \"ser/ir\".",
      "«Fue» es el irregular de «ser/ir» en pasado.",
    ),
  },
  // Planning next steps (50-55)
  {
    id: "p-other-option",
    target: "¿Hay otra opción?",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "Y a-t-il une autre option ?",
      "Is there another option?",
      "¿Hay otra opción?",
    ),
    usage: lstr(
      "Question d'or face à un changement.",
      "Gold-standard question when something changes.",
      "Pregunta clave ante un cambio.",
    ),
  },
  {
    id: "p-change-plan",
    target: "Quiero cambiar el plan.",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "Je veux changer le plan.",
      "I want to change the plan.",
      "Quiero cambiar el plan.",
    ),
    usage: lstr(
      "Phrase claire et neutre.",
      "Clear, neutral phrase.",
      "Frase clara y neutra.",
    ),
  },
  {
    id: "p-go-tomorrow",
    target: "Vamos mañana.",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "On y va demain.",
      "We're going tomorrow.",
      "Vamos mañana.",
    ),
    usage: lstr(
      "Présent à valeur de futur proche.",
      "Present tense used as near future.",
      "Presente con valor de futuro cercano.",
    ),
  },
  {
    id: "p-where-meet",
    target: "¿Dónde nos encontramos?",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "Où nous retrouvons-nous ?",
      "Where do we meet?",
      "¿Dónde nos encontramos?",
    ),
    usage: lstr(
      "Pour confirmer le point de rendez-vous.",
      "To confirm the meeting point.",
      "Para confirmar el punto de encuentro.",
    ),
  },
  {
    id: "p-buy-sim",
    target: "¿Dónde puedo comprar una tarjeta SIM?",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "Où puis-je acheter une carte SIM ?",
      "Where can I buy a SIM card?",
      "¿Dónde puedo comprar una tarjeta SIM?",
    ),
    usage: lstr(
      "Étape pratique pour rester en ligne.",
      "Practical step to stay connected.",
      "Paso práctico para seguir conectado.",
    ),
  },
  {
    id: "p-want-return",
    target: "Quiero volver a la República Dominicana.",
    category: CAT_PLAN,
    categoryKey: "planning",
    translation: lstr(
      "Je veux revenir en République dominicaine.",
      "I want to come back to the Dominican Republic.",
      "Quiero volver a la República Dominicana.",
    ),
    usage: lstr(
      "Belle phrase de clôture du voyage.",
      "A lovely trip-closing phrase.",
      "Una frase preciosa para cerrar el viaje.",
    ),
  },
  // Polite requests & closings (56-60)
  {
    id: "p-sorry-bother",
    target: "Disculpe la molestia.",
    category: CAT_POLITE,
    categoryKey: "polite",
    translation: lstr(
      "Désolé(e) pour le dérangement.",
      "Sorry for the trouble.",
      "Disculpe la molestia.",
    ),
    usage: lstr(
      "Formule très polie pour ouvrir ou clore.",
      "Very polite opener or closer.",
      "Fórmula muy amable para abrir o cerrar.",
    ),
  },
  {
    id: "p-pending",
    target: "Quedo pendiente.",
    category: CAT_POLITE,
    categoryKey: "polite",
    translation: lstr(
      "Je reste à votre disposition / dans l'attente de votre réponse.",
      "I remain at your disposal / awaiting your reply.",
      "Quedo pendiente.",
    ),
    usage: lstr(
      "Clôture professionnelle et naturelle en RD.",
      "Professional, natural Dominican sign-off.",
      "Cierre profesional y natural en RD.",
    ),
  },
  {
    id: "p-see-soon",
    target: "Nos vemos pronto.",
    category: CAT_POLITE,
    categoryKey: "polite",
    translation: lstr(
      "À bientôt.",
      "See you soon.",
      "Nos vemos pronto.",
    ),
    usage: lstr(
      "Clôture chaleureuse et simple.",
      "Warm, simple sign-off.",
      "Cierre cálido y sencillo.",
    ),
  },
  {
    id: "p-what-experience",
    target: "¡Qué experiencia!",
    category: CAT_POLITE,
    categoryKey: "polite",
    translation: lstr(
      "Quelle expérience !",
      "What an experience!",
      "¡Qué experiencia!",
    ),
    usage: lstr(
      "Exclamation A2 très utile pour résumer.",
      "Useful A2 exclamation to wrap things up.",
      "Exclamación A2 útil para resumir.",
    ),
  },
  {
    id: "p-learned-a-lot",
    target: "Aprendí mucho.",
    category: CAT_POLITE,
    categoryKey: "polite",
    translation: lstr(
      "J'ai beaucoup appris.",
      "I learned a lot.",
      "Aprendí mucho.",
    ),
    usage: lstr(
      "Phrase A2 idéale pour conclure le module.",
      "An ideal A2 phrase to close the module.",
      "Frase A2 ideal para cerrar el módulo.",
    ),
  },
];

// ─── Dominican fast-speech survival ─────────────────────────────────────

const fastSpeechCards: Dom5FastSpeechCard[] = [
  {
    id: "fs-final-s",
    title: lstr(
      "Le « s » final s'efface parfois",
      "Final \"s\" can fade",
      "La «s» final puede caer",
    ),
    description: lstr(
      "À l'oral familier, on peut entendre « má o meno » au lieu de « más o menos ». Tu comprends grâce au contexte.",
      "In casual speech you may hear \"má o meno\" instead of \"más o menos\". Context tells you what's meant.",
      "En el habla informal puedes oír «má o meno» en vez de «más o menos». El contexto te ayuda.",
    ),
  },
  {
    id: "fs-shortened-words",
    title: lstr(
      "Les mots peuvent être raccourcis",
      "Words can get shortened",
      "Las palabras pueden acortarse",
    ),
    description: lstr(
      "« Para » devient « pa » : « voy pa la playa » = « voy para la playa ». Reste à l'écoute du contexte.",
      "\"Para\" can become \"pa\": \"voy pa la playa\" = \"voy para la playa\". Listen for context.",
      "«Para» puede volverse «pa»: «voy pa la playa» = «voy para la playa». Apoyate en el contexto.",
    ),
  },
  {
    id: "fs-fast-rhythm",
    title: lstr(
      "Le rythme peut paraître très rapide",
      "The rhythm can feel very fast",
      "El ritmo puede sonar muy rápido",
    ),
    description: lstr(
      "Le débit, la prononciation et certaines expressions varient selon la personne et la situation. Repère les mots-clés et demande de répéter quand tu en as besoin.",
      "Speaking speed, pronunciation, and some expressions vary by speaker and situation. Listen for key words and ask for repetition when you need it.",
      "La velocidad, la pronunciación y algunas expresiones varían según la persona y la situación. Escucha las palabras clave y pide que repitan cuando lo necesites.",
    ),
  },
  {
    id: "fs-ask-repeat",
    title: lstr(
      "Demande qu'on répète, sans gêne",
      "Confidently ask for a repeat",
      "Pide que repitan, con confianza",
    ),
    description: lstr(
      "« ¿Me puede repetir, por favor? » est poli, attendu et toujours bien reçu.",
      "\"¿Me puede repetir, por favor?\" is polite, expected, and always welcomed.",
      "«¿Me puede repetir, por favor?» es amable, esperado y siempre bien recibido.",
    ),
  },
  {
    id: "fs-ask-write",
    title: lstr(
      "Demande qu'on écrive si besoin",
      "Ask for it in writing if needed",
      "Pide que lo escriban si hace falta",
    ),
    description: lstr(
      "« ¿Puede escribirlo, por favor? » fonctionne très bien pour les adresses, prix et horaires.",
      "\"¿Puede escribirlo, por favor?\" works great for addresses, prices, and schedules.",
      "«¿Puede escribirlo, por favor?» funciona muy bien para direcciones, precios y horarios.",
    ),
  },
  {
    id: "fs-context",
    title: lstr(
      "Utilise le contexte",
      "Use context clues",
      "Apóyate en el contexto",
    ),
    description: lstr(
      "Geste, lieu, ton de la voix : tu comprends souvent l'idée principale même sans tous les mots.",
      "Gesture, location, tone of voice: you often grasp the main idea even without every word.",
      "Gesto, lugar, tono de voz: muchas veces captas la idea sin entender todas las palabras.",
    ),
  },
  {
    id: "fs-confirm",
    title: lstr(
      "Confirme ce que tu as compris",
      "Confirm what you understood",
      "Confirma lo que entendiste",
    ),
    description: lstr(
      "« Entonces, salimos a las nueve, ¿verdad? » montre que tu suis et invite à corriger.",
      "\"Entonces, salimos a las nueve, ¿verdad?\" shows you're following and invites a correction.",
      "«Entonces, salimos a las nueve, ¿verdad?» muestra que sigues e invita a corregir.",
    ),
  },
];

const fastSpeechPairs: Dom5FastSpeechPair[] = [
  {
    id: "fs-pair-las-terrenas",
    heard: "La Terrena",
    asked: "Las Terrenas",
    note: lstr(
      "Le « s » final est avalé : « La Terrena » = Las Terrenas. À retenir comme habitude d'écoute.",
      "The final \"s\" is swallowed: \"La Terrena\" = Las Terrenas. Just listening awareness.",
      "La «s» final se traga: «La Terrena» = Las Terrenas. Es solo conciencia auditiva.",
    ),
  },
  {
    id: "fs-pair-mas-despacio",
    heard: "Habla rápido",
    asked: "¿Me puede hablar más despacio?",
    note: lstr(
      "Réplique de réparation universelle quand le débit est trop rapide.",
      "Universal repair reply when the speech is too fast.",
      "Réplica universal cuando hablan demasiado rápido.",
    ),
  },
  {
    id: "fs-pair-repetir",
    heard: "No entendí",
    asked: "¿Me puede repetir?",
    note: lstr(
      "Demande de répétition courte, polie et claire.",
      "Short, polite, clear request to repeat.",
      "Solicitud breve, amable y clara para repetir.",
    ),
  },
  {
    id: "fs-pair-escribir",
    heard: "Direcciones largas",
    asked: "¿Puede escribirlo, por favor?",
    note: lstr(
      "Plan B parfait pour les adresses, les prix et les horaires.",
      "Perfect plan B for addresses, prices, and schedules.",
      "Plan B perfecto para direcciones, precios y horarios.",
    ),
  },
];

// ─── Practical problem dialogues ────────────────────────────────────────

const dialogues: Dom5Dialogue[] = [
  {
    id: "dlg-lost-phone",
    title: lstr(
      "Téléphone perdu dans un taxi",
      "Lost phone in a taxi",
      "Teléfono perdido en un taxi",
    ),
    scenario: lstr(
      "Le voyageur réalise qu'il a oublié son téléphone dans le taxi et explique la situation à la réception.",
      "The traveler realizes they left their phone in the taxi and explains it at the front desk.",
      "El viajero se da cuenta de que dejó su teléfono en el taxi y lo explica en recepción.",
    ),
    lines: [
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Disculpe, perdí mi teléfono.",
        translation: lstr(
          "Excusez-moi, j'ai perdu mon téléphone.",
          "Excuse me, I lost my phone.",
          "Disculpe, perdí mi teléfono.",
        ),
      },
      {
        speaker: lstr("Employé", "Staff", "Empleado"),
        target: "¿Dónde lo vio por última vez?",
        translation: lstr(
          "Où l'avez-vous vu pour la dernière fois ?",
          "Where did you last see it?",
          "¿Dónde lo vio por última vez?",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Creo que lo dejé en el taxi.",
        translation: lstr(
          "Je crois que je l'ai laissé dans le taxi.",
          "I think I left it in the taxi.",
          "Creo que lo dejé en el taxi.",
        ),
      },
      {
        speaker: lstr("Employé", "Staff", "Empleado"),
        target: "¿Tiene el número del conductor?",
        translation: lstr(
          "Avez-vous le numéro du chauffeur ?",
          "Do you have the driver's number?",
          "¿Tiene el número del conductor?",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "No, pero tengo el recibo.",
        translation: lstr(
          "Non, mais j'ai le reçu.",
          "No, but I have the receipt.",
          "No, pero tengo el recibo.",
        ),
      },
      {
        speaker: lstr("Employé", "Staff", "Empleado"),
        target: "Vamos a llamar.",
        translation: lstr(
          "Nous allons appeler.",
          "We'll call.",
          "Vamos a llamar.",
        ),
      },
    ],
  },
  {
    id: "dlg-missing-reservation",
    title: lstr(
      "Réservation introuvable",
      "Missing reservation",
      "Reservación que no aparece",
    ),
    scenario: lstr(
      "À l'arrivée, la réservation n'apparaît pas dans le système. Le voyageur garde son calme et présente sa confirmation.",
      "On arrival, the reservation doesn't show up. The traveler stays calm and shows their confirmation.",
      "Al llegar, la reservación no aparece. El viajero mantiene la calma y muestra su confirmación.",
    ),
    lines: [
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Buenas tardes. Tengo una reservación, pero no aparece.",
        translation: lstr(
          "Bon après-midi. J'ai une réservation, mais elle n'apparaît pas.",
          "Good afternoon. I have a reservation, but it doesn't appear.",
          "Buenas tardes. Tengo una reservación, pero no aparece.",
        ),
      },
      {
        speaker: lstr("Réception", "Front desk", "Recepción"),
        target: "¿A nombre de quién está?",
        translation: lstr(
          "À quel nom est-elle ?",
          "Whose name is it under?",
          "¿A nombre de quién está?",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "A nombre del viajero principal.",
        translation: lstr(
          "Au nom du voyageur principal.",
          "Under the main traveler's name.",
          "A nombre del viajero principal.",
        ),
      },
      {
        speaker: lstr("Réception", "Front desk", "Recepción"),
        target: "Un momento, por favor. Voy a revisar.",
        translation: lstr(
          "Un instant, s'il vous plaît. Je vais vérifier.",
          "One moment, please. I'll check.",
          "Un momento, por favor. Voy a revisar.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Gracias. Aquí tengo la confirmación.",
        translation: lstr(
          "Merci. J'ai la confirmation ici.",
          "Thank you. I have the confirmation here.",
          "Gracias. Aquí tengo la confirmación.",
        ),
      },
      {
        speaker: lstr("Réception", "Front desk", "Recepción"),
        target: "Perfecto, ya la encontré.",
        translation: lstr(
          "Parfait, je l'ai trouvée.",
          "Perfect, I found it.",
          "Perfecto, ya la encontré.",
        ),
      },
    ],
  },
  {
    id: "dlg-weather-change",
    title: lstr(
      "Excursion menacée par la météo",
      "Excursion threatened by weather",
      "Excursión en duda por el clima",
    ),
    scenario: lstr(
      "Avant l'excursion vers Los Haitises, le ciel se couvre. Le voyageur appelle le guide pour confirmer.",
      "Before the Los Haitises excursion, the sky darkens. The traveler calls the guide to confirm.",
      "Antes de la excursión a Los Haitises, el cielo se oscurece. El viajero llama al guía.",
    ),
    lines: [
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Hola. ¿La excursión sigue en pie?",
        translation: lstr(
          "Bonjour. L'excursion est-elle maintenue ?",
          "Hi. Is the excursion still on?",
          "Hola. ¿La excursión sigue en pie?",
        ),
      },
      {
        speaker: lstr("Guide", "Guide", "Guía"),
        target: "Por ahora sí, pero puede cambiar por la lluvia.",
        translation: lstr(
          "Pour l'instant oui, mais cela peut changer à cause de la pluie.",
          "For now yes, but it could change because of the rain.",
          "Por ahora sí, pero puede cambiar por la lluvia.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Entiendo. ¿Hay otra opción?",
        translation: lstr(
          "Je comprends. Y a-t-il une autre option ?",
          "I see. Is there another option?",
          "Entiendo. ¿Hay otra opción?",
        ),
      },
      {
        speaker: lstr("Guide", "Guide", "Guía"),
        target: "Podemos salir más tarde o cambiar para mañana.",
        translation: lstr(
          "Nous pouvons partir plus tard ou changer pour demain.",
          "We can leave later or move it to tomorrow.",
          "Podemos salir más tarde o cambiar para mañana.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Prefiero mañana, por favor.",
        translation: lstr(
          "Je préfère demain, s'il vous plaît.",
          "I'd rather do tomorrow, please.",
          "Prefiero mañana, por favor.",
        ),
      },
    ],
  },
  {
    id: "dlg-pharmacy",
    title: lstr(
      "Petite santé · trouver la pharmacie",
      "Light health · finding the pharmacy",
      "Salud ligera · llegar a la farmacia",
    ),
    scenario: lstr(
      "Le voyageur ne se sent pas très bien et demande à un local où se trouve la pharmacie. Aucun conseil médical, juste une orientation.",
      "The traveler isn't feeling great and asks a local where the pharmacy is. No medical advice — just directions.",
      "El viajero no se siente del todo bien y pregunta a un local dónde queda la farmacia. Sin consejo médico, solo direcciones.",
    ),
    lines: [
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Disculpe. ¿Dónde hay una farmacia?",
        translation: lstr(
          "Excusez-moi. Où y a-t-il une pharmacie ?",
          "Excuse me. Where is there a pharmacy?",
          "Disculpe. ¿Dónde hay una farmacia?",
        ),
      },
      {
        speaker: lstr("Local", "Local", "Local"),
        target: "Hay una farmacia cerca del parque.",
        translation: lstr(
          "Il y a une pharmacie près du parc.",
          "There's a pharmacy near the park.",
          "Hay una farmacia cerca del parque.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Gracias. No me siento bien.",
        translation: lstr(
          "Merci. Je ne me sens pas bien.",
          "Thanks. I don't feel well.",
          "Gracias. No me siento bien.",
        ),
      },
      {
        speaker: lstr("Local", "Local", "Local"),
        target: "Siga derecho y doble a la izquierda.",
        translation: lstr(
          "Continuez tout droit et tournez à gauche.",
          "Go straight and turn left.",
          "Siga derecho y doble a la izquierda.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Muchas gracias.",
        translation: lstr(
          "Merci beaucoup.",
          "Thank you very much.",
          "Muchas gracias.",
        ),
      },
    ],
  },
  {
    id: "dlg-fast-speech-repair",
    title: lstr(
      "Réparer une explication trop rapide",
      "Repair a too-fast explanation",
      "Reparar una explicación demasiado rápida",
    ),
    scenario: lstr(
      "Un local explique l'option transport en parlant vite. Le voyageur ne saisit pas la dernière partie et demande poliment à reformuler.",
      "A local explains the transport option quickly. The traveler misses the last part and politely asks for a reformulation.",
      "Un local explica la opción de transporte hablando rápido. El viajero pierde la última parte y pide reformular con cortesía.",
    ),
    lines: [
      {
        speaker: lstr("Local", "Local", "Local"),
        target: "La guagua pasa por allá, pero si llueve, mejor toma un taxi.",
        translation: lstr(
          "La guagua passe par là, mais s'il pleut, mieux vaut prendre un taxi.",
          "The guagua goes that way, but if it rains, better take a taxi.",
          "La guagua pasa por allá, pero si llueve, mejor toma un taxi.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Disculpe, no entendí la última parte.",
        translation: lstr(
          "Excusez-moi, je n'ai pas compris la dernière partie.",
          "Excuse me, I didn't catch the last part.",
          "Disculpe, no entendí la última parte.",
        ),
      },
      {
        speaker: lstr("Local", "Local", "Local"),
        target: "Claro. Si llueve, es mejor tomar un taxi.",
        translation: lstr(
          "Bien sûr. S'il pleut, il vaut mieux prendre un taxi.",
          "Sure. If it rains, it's better to take a taxi.",
          "Claro. Si llueve, es mejor tomar un taxi.",
        ),
      },
      {
        speaker: lstr("Voyageur", "Traveler", "Viajero"),
        isLearner: true,
        target: "Gracias. ¿Puede hablar más despacio?",
        translation: lstr(
          "Merci. Pouvez-vous parler plus lentement ?",
          "Thanks. Can you speak more slowly?",
          "Gracias. ¿Puede hablar más despacio?",
        ),
      },
      {
        speaker: lstr("Local", "Local", "Local"),
        target: "Sí, claro.",
        translation: lstr("Oui, bien sûr.", "Yes, of course.", "Sí, claro."),
      },
    ],
  },
];

// ─── Spanish A2 reading texts (5 texts, 130-180 words each) ─────────────

const readingTexts: Dom5ReadingText[] = [
  {
    id: "read-zona-colonial",
    title: lstr(
      "Un día con cambios en Santo Domingo",
      "A day with changes in Santo Domingo",
      "Un día con cambios en Santo Domingo",
    ),
    paragraphs: [
      "Ayer fui a la Zona Colonial. Caminé por las calles de piedra y visité la catedral más antigua de América. Saqué muchas fotos en la plaza principal y compré un pequeño recuerdo de larimar.",
      "A las once empezó a llover. El cielo cambió muy rápido y la lluvia fue fuerte. Pensé en regresar al hotel, pero un señor amable me dijo: «Hay un café muy bueno cerca, espera ahí». Tomé un café con leche y un pan dulce mientras esperaba.",
      "Cuando paró la lluvia, fui al museo de las casas reales. Aprendí mucho sobre la historia de la ciudad. La guía hablaba rápido y le pedí que hablara más despacio. Al final del día, me gustó mucho la experiencia. Fue un día con cambios, pero también con descubrimientos.",
    ],
    wordCount: 145,
    vocabulary: [
      {
        target: "calles de piedra",
        gloss: lstr("rues pavées", "cobblestone streets", "calles empedradas"),
      },
      {
        target: "empezó a llover",
        gloss: lstr("il a commencé à pleuvoir", "it started to rain", "empezó a llover"),
      },
      {
        target: "regresar",
        gloss: lstr("rentrer / retourner", "to return / go back", "regresar"),
      },
      {
        target: "amable",
        gloss: lstr("aimable / gentil", "kind / friendly", "amable"),
      },
      {
        target: "casas reales",
        gloss: lstr("maisons royales", "royal houses (museum)", "casas reales"),
      },
      {
        target: "más despacio",
        gloss: lstr("plus lentement", "more slowly", "más despacio"),
      },
      {
        target: "descubrimientos",
        gloss: lstr("découvertes", "discoveries", "descubrimientos"),
      },
    ],
    questions: [
      {
        id: "q-zc-1",
        prompt: lstr(
          "Où est allé le voyageur en premier ?",
          "Where did the traveler go first?",
          "¿Adónde fue primero el viajero?",
        ),
        answer: lstr(
          "À la Zona Colonial.",
          "To the Zona Colonial.",
          "A la Zona Colonial.",
        ),
      },
      {
        id: "q-zc-2",
        prompt: lstr(
          "Que s'est-il passé à onze heures ?",
          "What happened at eleven?",
          "¿Qué pasó a las once?",
        ),
        answer: lstr(
          "Il a commencé à pleuvoir fort.",
          "It started to rain heavily.",
          "Empezó a llover fuerte.",
        ),
      },
      {
        id: "q-zc-3",
        prompt: lstr(
          "Qu'a-t-il acheté comme souvenir ?",
          "What souvenir did he buy?",
          "¿Qué recuerdo compró?",
        ),
        answer: lstr(
          "Un petit objet en larimar.",
          "A small larimar souvenir.",
          "Un pequeño recuerdo de larimar.",
        ),
      },
      {
        id: "q-zc-4",
        prompt: lstr(
          "Pourquoi a-t-il demandé au guide de parler plus lentement ?",
          "Why did he ask the guide to speak more slowly?",
          "¿Por qué le pidió al guía hablar más despacio?",
        ),
        answer: lstr(
          "Parce que la guide parlait trop vite.",
          "Because the guide spoke too fast.",
          "Porque la guía hablaba muy rápido.",
        ),
      },
      {
        id: "q-zc-5",
        prompt: lstr(
          "Quelle phrase résume la fin du texte ?",
          "Which sentence sums up the ending?",
          "¿Qué frase resume el final?",
        ),
        answer: lstr(
          "Un jour avec des changements, mais aussi avec des découvertes.",
          "A day with changes, but also with discoveries.",
          "Un día con cambios, pero también con descubrimientos.",
        ),
      },
    ],
    writtenPrompt: lstr(
      "Écris 2 phrases au passé sur ce que tu ferais d'autre dans la Zona Colonial.",
      "Write 2 past-tense sentences about what else you would do in the Zona Colonial.",
      "Escribe 2 frases en pasado sobre qué más harías en la Zona Colonial.",
    ),
  },
  {
    id: "read-hotel-message",
    title: lstr(
      "Mensaje del hotel",
      "Hotel message",
      "Mensaje del hotel",
    ),
    paragraphs: [
      "Buenas tardes. Le escribimos del hotel Brisas del Mar. Recibimos su confirmación de reserva, pero hay un pequeño cambio para su llegada.",
      "El check-in será a las cuatro de la tarde, no a las dos. Su habitación está lista, pero el equipo necesita más tiempo para limpiar la zona de la piscina. Si necesita guardar las maletas antes, puede dejarlas en recepción sin problema.",
      "Recuerde traer su pasaporte para registrarse. También necesitamos una tarjeta de crédito o un depósito pequeño para los gastos extras. Si tiene cualquier duda, puede escribirnos por WhatsApp o llamar al hotel.",
      "Muchas gracias por su comprensión. Quedamos pendientes de su llegada. Buen viaje.",
    ],
    wordCount: 138,
    vocabulary: [
      {
        target: "le escribimos",
        gloss: lstr("nous vous écrivons", "we are writing to you", "le escribimos"),
      },
      {
        target: "confirmación",
        gloss: lstr("confirmation", "confirmation", "confirmación"),
      },
      {
        target: "check-in",
        gloss: lstr("enregistrement à l'arrivée", "check-in", "check-in / registro"),
      },
      {
        target: "guardar las maletas",
        gloss: lstr("garder les valises", "store the luggage", "guardar las maletas"),
      },
      {
        target: "registrarse",
        gloss: lstr("s'enregistrer", "to register / check in", "registrarse"),
      },
      {
        target: "depósito",
        gloss: lstr("dépôt / caution", "deposit", "depósito"),
      },
      {
        target: "comprensión",
        gloss: lstr("compréhension", "understanding", "comprensión"),
      },
      {
        target: "quedamos pendientes",
        gloss: lstr("nous restons à votre disposition", "we remain at your disposal", "quedamos pendientes"),
      },
    ],
    questions: [
      {
        id: "q-hm-1",
        prompt: lstr(
          "À quelle heure est le check-in ?",
          "What time is check-in?",
          "¿A qué hora es el check-in?",
        ),
        answer: lstr(
          "À quatre heures de l'après-midi.",
          "At four in the afternoon.",
          "A las cuatro de la tarde.",
        ),
      },
      {
        id: "q-hm-2",
        prompt: lstr(
          "Pourquoi le check-in est-il plus tard ?",
          "Why is check-in later?",
          "¿Por qué el check-in es más tarde?",
        ),
        answer: lstr(
          "Le personnel a besoin de plus de temps pour nettoyer la zone de la piscine.",
          "The staff needs more time to clean the pool area.",
          "El equipo necesita más tiempo para limpiar la zona de la piscina.",
        ),
      },
      {
        id: "q-hm-3",
        prompt: lstr(
          "Que peut faire le voyageur s'il arrive avant ?",
          "What can the traveler do if they arrive earlier?",
          "¿Qué puede hacer el viajero si llega antes?",
        ),
        answer: lstr(
          "Laisser ses valises à la réception.",
          "Leave their luggage at the front desk.",
          "Dejar las maletas en recepción.",
        ),
      },
      {
        id: "q-hm-4",
        prompt: lstr(
          "Que doit-il apporter pour s'enregistrer ?",
          "What must they bring to register?",
          "¿Qué debe traer para registrarse?",
        ),
        answer: lstr(
          "Son passeport et une carte de crédit ou un petit dépôt.",
          "Their passport and a credit card or small deposit.",
          "Su pasaporte y una tarjeta de crédito o un depósito pequeño.",
        ),
      },
      {
        id: "q-hm-5",
        prompt: lstr(
          "Comment peut-il poser des questions ?",
          "How can they ask questions?",
          "¿Cómo puede hacer preguntas?",
        ),
        answer: lstr(
          "Par WhatsApp ou par téléphone.",
          "Via WhatsApp or by phone.",
          "Por WhatsApp o por teléfono.",
        ),
      },
    ],
    writtenPrompt: lstr(
      "Réponds en 2 phrases pour confirmer l'heure et demander une question pratique.",
      "Reply in 2 sentences to confirm the time and ask one practical question.",
      "Responde en 2 frases para confirmar la hora y hacer una pregunta práctica.",
    ),
  },
  {
    id: "read-haitises",
    title: lstr(
      "Excursión a Los Haitises",
      "Excursion to Los Haitises",
      "Excursión a Los Haitises",
    ),
    paragraphs: [
      "Hoy fuimos a Los Haitises. El nombre viene de los taínos, los primeros habitantes de la isla, y significa «tierra de montañas». Es un parque nacional protegido en la costa nordeste, cerca de Samaná.",
      "Salimos del muelle a las nueve. El viaje en bote duró casi una hora. Vimos manglares verdes y muchos pájaros. El guía explicó la historia taína mientras el barco entraba en una bahía con cayos de piedra caliza.",
      "Después visitamos dos cuevas con dibujos antiguos. La luz era poca y caminamos despacio. Tomé varias fotos, pero el guía nos pidió no usar el flash para proteger los dibujos.",
      "Al final, almorzamos en una pequeña isla y volvimos al hotel por la tarde. Fue una excursión tranquila, natural y educativa. Aprendí mucho sobre la palabra «taíno» y sobre la naturaleza dominicana.",
    ],
    wordCount: 158,
    vocabulary: [
      {
        target: "taínos",
        gloss: lstr(
          "Taïnos (premier peuple de l'île)",
          "Taínos (first people of the island)",
          "taínos (primeros habitantes de la isla)",
        ),
      },
      {
        target: "manglares",
        gloss: lstr("mangroves", "mangroves", "manglares"),
      },
      {
        target: "cayos",
        gloss: lstr("îlots", "small islets / cays", "cayos"),
      },
      {
        target: "piedra caliza",
        gloss: lstr("calcaire", "limestone", "piedra caliza"),
      },
      {
        target: "cuevas",
        gloss: lstr("grottes", "caves", "cuevas"),
      },
      {
        target: "dibujos antiguos",
        gloss: lstr("dessins anciens", "ancient drawings", "dibujos antiguos"),
      },
      {
        target: "proteger",
        gloss: lstr("protéger", "to protect", "proteger"),
      },
      {
        target: "tranquila",
        gloss: lstr("tranquille", "quiet / peaceful", "tranquila"),
      },
    ],
    questions: [
      {
        id: "q-lh-1",
        prompt: lstr(
          "D'où vient le nom Los Haitises ?",
          "Where does the name Los Haitises come from?",
          "¿De dónde viene el nombre Los Haitises?",
        ),
        answer: lstr(
          "Des Taïnos, premier peuple de l'île.",
          "From the Taínos, the first people of the island.",
          "De los taínos, los primeros habitantes de la isla.",
        ),
      },
      {
        id: "q-lh-2",
        prompt: lstr(
          "Combien de temps dure le trajet en bateau ?",
          "How long is the boat trip?",
          "¿Cuánto dura el viaje en bote?",
        ),
        answer: lstr(
          "Presque une heure.",
          "Almost one hour.",
          "Casi una hora.",
        ),
      },
      {
        id: "q-lh-3",
        prompt: lstr(
          "Que voient les visiteurs depuis le bateau ?",
          "What do visitors see from the boat?",
          "¿Qué ven los visitantes desde el bote?",
        ),
        answer: lstr(
          "Des mangroves, beaucoup d'oiseaux et des îlots de calcaire.",
          "Mangroves, many birds, and limestone islets.",
          "Manglares, muchos pájaros y cayos de piedra caliza.",
        ),
      },
      {
        id: "q-lh-4",
        prompt: lstr(
          "Pourquoi est-il interdit d'utiliser le flash ?",
          "Why is the flash not allowed?",
          "¿Por qué no se puede usar el flash?",
        ),
        answer: lstr(
          "Pour protéger les dessins anciens.",
          "To protect the ancient drawings.",
          "Para proteger los dibujos antiguos.",
        ),
      },
      {
        id: "q-lh-5",
        prompt: lstr(
          "Quel mot a marqué le voyageur ?",
          "Which word stayed with the traveler?",
          "¿Qué palabra marcó al viajero?",
        ),
        answer: lstr(
          "« taíno ».",
          "\"taíno\".",
          "«taíno».",
        ),
      },
    ],
    writtenPrompt: lstr(
      "Écris 3 phrases au passé sur ta journée à Los Haitises (utilise fui, vimos, aprendí).",
      "Write 3 past-tense sentences about your day at Los Haitises (use fui, vimos, aprendí).",
      "Escribe 3 frases en pasado sobre tu día en Los Haitises (usa fui, vimos, aprendí).",
    ),
  },
  {
    id: "read-music-plaza",
    title: lstr(
      "Música en la plaza",
      "Music in the plaza",
      "Música en la plaza",
    ),
    paragraphs: [
      "Anoche caminé por la plaza del pueblo. Había un grupo tocando merengue y bachata. La música era alegre y la gente bailaba en círculo. Todos parecían contentos.",
      "Una señora amable me invitó a bailar. Le dije que no sabía bailar bien, pero ella sonrió: «Tranquilo, primero un pie y después el otro». Aprendí dos pasos básicos en pocos minutos.",
      "Un joven hablaba muy rápido y casi no entendí lo que dijo. Le pedí que hablara más despacio. Repitió con calma: «¿Le gusta el merengue o la bachata?». Le respondí que me gusta más la bachata, porque es más lenta para principiantes.",
      "Al final, tomé agua, descansé y volví al hotel feliz. Fue una noche corta, pero muy dominicana. Aprendí que la música es una manera fantástica de practicar español.",
    ],
    wordCount: 152,
    vocabulary: [
      {
        target: "anoche",
        gloss: lstr("hier soir / la nuit dernière", "last night", "anoche"),
      },
      {
        target: "grupo",
        gloss: lstr("groupe (de musique)", "(music) group", "grupo musical"),
      },
      {
        target: "alegre",
        gloss: lstr("joyeuse / gaie", "cheerful", "alegre"),
      },
      {
        target: "en círculo",
        gloss: lstr("en cercle", "in a circle", "en círculo"),
      },
      {
        target: "pasos básicos",
        gloss: lstr("pas de base", "basic steps", "pasos básicos"),
      },
      {
        target: "principiantes",
        gloss: lstr("débutants", "beginners", "principiantes"),
      },
      {
        target: "descansé",
        gloss: lstr("je me suis reposé(e)", "I rested", "descansé"),
      },
    ],
    questions: [
      {
        id: "q-mp-1",
        prompt: lstr(
          "Où était le voyageur ?",
          "Where was the traveler?",
          "¿Dónde estaba el viajero?",
        ),
        answer: lstr(
          "Sur la place du village.",
          "In the village plaza.",
          "En la plaza del pueblo.",
        ),
      },
      {
        id: "q-mp-2",
        prompt: lstr(
          "Quelle musique jouait le groupe ?",
          "What music did the band play?",
          "¿Qué música tocaba el grupo?",
        ),
        answer: lstr(
          "Du merengue et de la bachata.",
          "Merengue and bachata.",
          "Merengue y bachata.",
        ),
      },
      {
        id: "q-mp-3",
        prompt: lstr(
          "Qu'a appris le voyageur en quelques minutes ?",
          "What did the traveler learn in a few minutes?",
          "¿Qué aprendió el viajero en pocos minutos?",
        ),
        answer: lstr(
          "Deux pas de base.",
          "Two basic dance steps.",
          "Dos pasos básicos.",
        ),
      },
      {
        id: "q-mp-4",
        prompt: lstr(
          "Pourquoi a-t-il demandé de parler plus lentement ?",
          "Why did he ask the man to speak more slowly?",
          "¿Por qué pidió hablar más despacio?",
        ),
        answer: lstr(
          "Parce que le jeune parlait très vite et il n'a pas compris.",
          "Because the young man spoke very fast and he didn't understand.",
          "Porque el joven hablaba muy rápido y no entendió.",
        ),
      },
      {
        id: "q-mp-5",
        prompt: lstr(
          "Quelle conclusion tire-t-il à la fin ?",
          "What conclusion does he reach at the end?",
          "¿Qué conclusión saca al final?",
        ),
        answer: lstr(
          "La musique est une excellente manière de pratiquer l'espagnol.",
          "Music is a great way to practice Spanish.",
          "La música es una manera fantástica de practicar español.",
        ),
      },
    ],
    writtenPrompt: lstr(
      "Écris 2 phrases : qu'as-tu aimé et que demanderais-tu à un musicien dominicain ?",
      "Write 2 sentences: what did you enjoy, and what would you ask a Dominican musician?",
      "Escribe 2 frases: ¿qué te gustó y qué le preguntarías a un músico dominicano?",
    ),
  },
  {
    id: "read-last-day",
    title: lstr(
      "Último día en República Dominicana",
      "Last day in the Dominican Republic",
      "Último día en República Dominicana",
    ),
    paragraphs: [
      "Hoy fue mi último día. Empecé temprano: hice mi maleta, organicé los regalos y tomé un café fuerte. Después caminé por la calle principal y compré tres pequeños recuerdos: un poco de café, dos onzas de cacao y un collar de larimar para mi familia.",
      "Al mediodía, almorcé en un restaurante cerca del hotel. Pedí pollo guisado con arroz y le dejé propina al mesero. Le agradecí por su ayuda durante toda la semana.",
      "Por la tarde, llamé un taxi y fui al aeropuerto. El taxi llegó puntual y el conductor me explicó la ruta. En el camino, pensé en todo lo que hice: visité la Zona Colonial, fui a Los Haitises, escuché merengue y bachata, y aprendí muchas frases nuevas.",
      "Antes de subir al avión, escribí en mi cuaderno: «Fue una experiencia increíble. Quiero volver a la República Dominicana». Llegué al avión con una sonrisa.",
    ],
    wordCount: 167,
    vocabulary: [
      {
        target: "hice mi maleta",
        gloss: lstr("j'ai fait ma valise", "I packed my luggage", "hice mi maleta"),
      },
      {
        target: "regalos",
        gloss: lstr("cadeaux", "gifts", "regalos"),
      },
      {
        target: "cacao",
        gloss: lstr("cacao", "cocoa / cacao", "cacao"),
      },
      {
        target: "collar de larimar",
        gloss: lstr("collier de larimar", "larimar necklace", "collar de larimar"),
      },
      {
        target: "propina",
        gloss: lstr("pourboire", "tip", "propina"),
      },
      {
        target: "puntual",
        gloss: lstr("ponctuel", "on time", "puntual"),
      },
      {
        target: "subir al avión",
        gloss: lstr("monter dans l'avion", "to board the plane", "subir al avión"),
      },
      {
        target: "sonrisa",
        gloss: lstr("sourire", "smile", "sonrisa"),
      },
    ],
    questions: [
      {
        id: "q-ld-1",
        prompt: lstr(
          "Qu'a-t-il acheté comme souvenirs ?",
          "What souvenirs did he buy?",
          "¿Qué recuerdos compró?",
        ),
        answer: lstr(
          "Du café, du cacao et un collier de larimar.",
          "Coffee, cocoa, and a larimar necklace.",
          "Café, cacao y un collar de larimar.",
        ),
      },
      {
        id: "q-ld-2",
        prompt: lstr(
          "Qu'a-t-il commandé pour le déjeuner ?",
          "What did he order for lunch?",
          "¿Qué pidió para almorzar?",
        ),
        answer: lstr(
          "Du poulet en sauce avec du riz.",
          "Chicken stew with rice.",
          "Pollo guisado con arroz.",
        ),
      },
      {
        id: "q-ld-3",
        prompt: lstr(
          "Quels endroits a-t-il visités pendant son voyage ?",
          "Which places did he visit during the trip?",
          "¿Qué lugares visitó durante el viaje?",
        ),
        answer: lstr(
          "La Zona Colonial et Los Haitises.",
          "The Zona Colonial and Los Haitises.",
          "La Zona Colonial y Los Haitises.",
        ),
      },
      {
        id: "q-ld-4",
        prompt: lstr(
          "Qu'a-t-il écrit dans son cahier ?",
          "What did he write in his notebook?",
          "¿Qué escribió en su cuaderno?",
        ),
        answer: lstr(
          "« Ce fut une expérience incroyable. Je veux revenir en République dominicaine. »",
          "\"It was an amazing experience. I want to come back to the Dominican Republic.\"",
          "«Fue una experiencia increíble. Quiero volver a la República Dominicana.»",
        ),
      },
      {
        id: "q-ld-5",
        prompt: lstr(
          "Comment se sentait-il en montant dans l'avion ?",
          "How did he feel boarding the plane?",
          "¿Cómo se sentía al subir al avión?",
        ),
        answer: lstr(
          "Il avait le sourire / il était heureux.",
          "He was smiling / happy.",
          "Con una sonrisa / feliz.",
        ),
      },
    ],
    writtenPrompt: lstr(
      "Écris 3 phrases pour résumer ton dernier jour idéal : ce que tu as fait, acheté, et ce que tu retiens.",
      "Write 3 sentences to sum up your ideal last day: what you did, what you bought, what you'll remember.",
      "Escribe 3 frases para resumir tu último día ideal: qué hiciste, qué compraste, qué te llevas.",
    ),
  },
];

// ─── A2 writing practice (4 guided tasks, 40-70 words) ──────────────────

const WORD_TARGET_LABEL = lstr(
  "Cible : 40 à 70 mots en espagnol.",
  "Target: 40-70 Spanish words.",
  "Objetivo: 40 a 70 palabras en español.",
);

const writingTasks: Dom5WritingTask[] = [
  {
    id: "write-hotel-reservation",
    title: lstr(
      "Message au hôtel · réservation introuvable",
      "Message to the hotel · missing reservation",
      "Mensaje al hotel · reservación que no aparece",
    ),
    prompt: lstr(
      "Écris un court message à l'hôtel pour expliquer que ta réservation n'apparaît pas et demander de l'aide poliment.",
      "Write a short message to the hotel to explain that your reservation does not appear and politely ask for help.",
      "Escribe un mensaje corto al hotel para explicar que tu reservación no aparece y pedir ayuda con cortesía.",
    ),
    usefulPhrases: [
      "Buenas tardes.",
      "Le escribo porque tengo un problema.",
      "Mi reservación no aparece.",
      "Tengo la confirmación.",
      "¿Pueden revisarla, por favor?",
      "Muchas gracias por su ayuda.",
    ],
    scaffold: [
      lstr(
        "Salutation polie (Buenas tardes / Estimado equipo).",
        "Polite greeting (Buenas tardes / Estimado equipo).",
        "Saludo amable (Buenas tardes / Estimado equipo).",
      ),
      lstr(
        "Problème : Mi reservación no aparece.",
        "Problem: Mi reservación no aparece.",
        "Problema: Mi reservación no aparece.",
      ),
      lstr(
        "Preuve : Tengo la confirmación.",
        "Proof: Tengo la confirmación.",
        "Prueba: Tengo la confirmación.",
      ),
      lstr(
        "Demande : ¿Pueden revisarla, por favor?",
        "Request: ¿Pueden revisarla, por favor?",
        "Solicitud: ¿Pueden revisarla, por favor?",
      ),
      lstr(
        "Clôture : Muchas gracias por su ayuda. Quedo pendiente.",
        "Closing: Muchas gracias por su ayuda. Quedo pendiente.",
        "Cierre: Muchas gracias por su ayuda. Quedo pendiente.",
      ),
    ],
    sampleAnswer:
      "Buenas tardes. Le escribo porque tengo un problema. Mi reservación no aparece en el sistema, pero tengo la confirmación por correo. ¿Pueden revisarla, por favor? Llego esta tarde a las cuatro y necesito el cuarto para descansar. Muchas gracias por su ayuda. Quedo pendiente de su respuesta.",
    wordTarget: WORD_TARGET_LABEL,
  },
  {
    id: "write-guide-weather",
    title: lstr(
      "WhatsApp au guide · changement de météo",
      "WhatsApp to the guide · weather change",
      "WhatsApp al guía · cambio del clima",
    ),
    prompt: lstr(
      "Écris un message WhatsApp au guide parce que la météo a changé. Demande s'il y a une autre option et propose une heure.",
      "Write a WhatsApp message to the guide because the weather changed. Ask if there is another option and suggest a time.",
      "Escribe un mensaje de WhatsApp al guía porque el clima cambió. Pregunta si hay otra opción y propón una hora.",
    ),
    usefulPhrases: [
      "Hola, ¿cómo estás?",
      "El clima cambió.",
      "¿La excursión sigue en pie?",
      "¿Hay otra opción?",
      "Prefiero salir más tarde.",
      "Gracias y nos vemos pronto.",
    ],
    scaffold: [
      lstr(
        "Salutation courte et amicale.",
        "Short, friendly greeting.",
        "Saludo corto y amable.",
      ),
      lstr(
        "Information : El clima cambió.",
        "Information: El clima cambió.",
        "Información: El clima cambió.",
      ),
      lstr(
        "Question clé : ¿La excursión sigue en pie?",
        "Key question: ¿La excursión sigue en pie?",
        "Pregunta clave: ¿La excursión sigue en pie?",
      ),
      lstr(
        "Option : ¿Hay otra opción? Prefiero salir más tarde.",
        "Option: ¿Hay otra opción? Prefiero salir más tarde.",
        "Opción: ¿Hay otra opción? Prefiero salir más tarde.",
      ),
      lstr(
        "Clôture chaleureuse.",
        "Warm sign-off.",
        "Cierre cálido.",
      ),
    ],
    sampleAnswer:
      "Hola, ¿cómo estás? El clima cambió y está lloviendo mucho aquí. ¿La excursión sigue en pie esta mañana? Si no, ¿hay otra opción? Prefiero salir un poco más tarde, cuando pare la lluvia, o cambiar para mañana si es posible. Gracias por avisar. Nos vemos pronto.",
    wordTarget: WORD_TARGET_LABEL,
  },
  {
    id: "write-travel-journal",
    title: lstr(
      "Journal de voyage · ce que j'ai fait hier",
      "Travel journal · what I did yesterday",
      "Diario de viaje · lo que hice ayer",
    ),
    prompt: lstr(
      "Écris un court paragraphe de journal de voyage : raconte ce que tu as fait hier en utilisant le passé.",
      "Write a short travel-journal paragraph: tell what you did yesterday using past forms.",
      "Escribe un párrafo corto de diario de viaje: cuenta lo que hiciste ayer con formas en pasado.",
    ),
    usefulPhrases: [
      "Ayer fui a…",
      "Visité la Zona Colonial.",
      "Caminé mucho.",
      "Compré un recuerdo.",
      "Me gustó mucho.",
      "Fue una experiencia increíble.",
    ],
    scaffold: [
      lstr(
        "Phrase d'ouverture avec « Ayer ».",
        "Opening sentence with \"Ayer\".",
        "Frase de apertura con «Ayer».",
      ),
      lstr(
        "2-3 actions au passé : fui, visité, caminé, compré.",
        "2-3 past actions: fui, visité, caminé, compré.",
        "2-3 acciones en pasado: fui, visité, caminé, compré.",
      ),
      lstr(
        "Une impression : Me gustó mucho. / Fue increíble.",
        "One impression: Me gustó mucho. / Fue increíble.",
        "Una impresión: Me gustó mucho. / Fue increíble.",
      ),
      lstr(
        "Une phrase finale courte.",
        "A short closing sentence.",
        "Una frase final corta.",
      ),
    ],
    sampleAnswer:
      "Ayer fui a la Zona Colonial. Caminé por las calles de piedra y visité la catedral. Después tomé un café cerca de la plaza y compré un recuerdo de larimar. Saqué muchas fotos para mi familia. Me gustó mucho la tranquilidad del barrio. Fue una experiencia increíble y aprendí mucho.",
    wordTarget: WORD_TARGET_LABEL,
  },
  {
    id: "write-help-lost-item",
    title: lstr(
      "Demande d'aide · objet perdu",
      "Help request · lost item",
      "Solicitud de ayuda · objeto perdido",
    ),
    prompt: lstr(
      "Écris un message poli pour demander de l'aide parce que tu as perdu un objet important.",
      "Write a polite message asking for help because you lost an important item.",
      "Escribe un mensaje amable para pedir ayuda porque perdiste un objeto importante.",
    ),
    usefulPhrases: [
      "Buenas tardes.",
      "Disculpe la molestia.",
      "Perdí mi teléfono.",
      "Creo que lo dejé en el taxi.",
      "¿Puede ayudarme?",
      "Muchas gracias por su ayuda.",
    ],
    scaffold: [
      lstr(
        "Salutation et formule polie.",
        "Greeting and polite phrase.",
        "Saludo y fórmula amable.",
      ),
      lstr(
        "Problème au passé : Perdí mi…",
        "Past-tense problem: Perdí mi…",
        "Problema en pasado: Perdí mi…",
      ),
      lstr(
        "Contexte court : Creo que lo dejé en…",
        "Short context: Creo que lo dejé en…",
        "Contexto breve: Creo que lo dejé en…",
      ),
      lstr(
        "Demande directe : ¿Puede ayudarme?",
        "Direct request: ¿Puede ayudarme?",
        "Solicitud directa: ¿Puede ayudarme?",
      ),
      lstr(
        "Clôture polie.",
        "Polite sign-off.",
        "Cierre amable.",
      ),
    ],
    sampleAnswer:
      "Buenas tardes. Disculpe la molestia. Le escribo porque perdí mi teléfono ayer por la tarde. Creo que lo dejé en el taxi cuando regresé al hotel. Tengo el recibo del taxi y puedo enviarle una foto. ¿Puede ayudarme a contactar al conductor, por favor? Muchas gracias por su ayuda. Quedo pendiente.",
    wordTarget: WORD_TARGET_LABEL,
  },
];

// ─── Oral interaction roleplay cards (4 cards) ──────────────────────────

const roleplayCards: Dom5RoleplayCard[] = [
  {
    id: "rp-receptionist-help",
    title: lstr(
      "Demander de l'aide à la réception",
      "Ask the receptionist for help",
      "Pedir ayuda al recepcionista",
    ),
    scene: lstr(
      "Tu arrives au hôtel. Ta réservation n'apparaît pas et tu dois rester calme et clair.",
      "You arrive at the hotel. Your reservation doesn't appear and you must stay calm and clear.",
      "Llegas al hotel. Tu reservación no aparece y debes mantener la calma y ser claro.",
    ),
    roleA: lstr(
      "Tu joues le voyageur. Salue, explique le problème et présente ta confirmation.",
      "Play the traveler. Greet, explain the problem, and show your confirmation.",
      "Haces el papel del viajero. Saluda, explica el problema y muestra la confirmación.",
    ),
    roleB: lstr(
      "Ton partenaire joue la réception. Il/elle vérifie et propose une solution.",
      "Your partner plays the front desk. They check and propose a solution.",
      "Tu pareja hace de recepción. Verifica y propone una solución.",
    ),
    targetPhrases: [
      "Buenas tardes.",
      "Tengo una reservación, pero no aparece.",
      "Aquí tengo la confirmación.",
      "¿Puede revisarla, por favor?",
      "Muchas gracias por su ayuda.",
    ],
    successChecklist: [
      lstr(
        "J'ai salué poliment.",
        "I greeted politely.",
        "Saludé con cortesía.",
      ),
      lstr(
        "J'ai expliqué le problème en une phrase.",
        "I explained the problem in one sentence.",
        "Expliqué el problema en una frase.",
      ),
      lstr(
        "J'ai proposé une preuve (la confirmation).",
        "I offered proof (the confirmation).",
        "Mostré una prueba (la confirmación).",
      ),
      lstr(
        "J'ai remercié à la fin.",
        "I thanked at the end.",
        "Agradecí al final.",
      ),
    ],
    modelSentence: "Buenas tardes, tengo una reservación, pero no aparece. Aquí tengo la confirmación. ¿Puede revisarla, por favor?",
  },
  {
    id: "rp-guide-changed-plan",
    title: lstr(
      "Appeler le guide pour un plan changé",
      "Call the guide about a changed plan",
      "Llamar al guía por un plan que cambió",
    ),
    scene: lstr(
      "La météo a changé. Tu appelles ou écris au guide pour confirmer ce qui se passe.",
      "The weather changed. You call or message the guide to confirm what's happening.",
      "El clima cambió. Llamas o escribes al guía para confirmar qué pasa.",
    ),
    roleA: lstr(
      "Tu joues le voyageur. Pose la question, écoute et choisis une option.",
      "Play the traveler. Ask the question, listen, and pick an option.",
      "Haces el papel del viajero. Pregunta, escucha y elige una opción.",
    ),
    roleB: lstr(
      "Ton partenaire joue le guide. Il/elle propose deux options.",
      "Your partner plays the guide. They suggest two options.",
      "Tu pareja hace de guía. Propone dos opciones.",
    ),
    targetPhrases: [
      "Hola, ¿cómo está?",
      "El clima cambió.",
      "¿La excursión sigue en pie?",
      "¿Hay otra opción?",
      "Prefiero mañana, por favor.",
    ],
    successChecklist: [
      lstr(
        "J'ai salué et donné le contexte.",
        "I greeted and gave context.",
        "Saludé y di el contexto.",
      ),
      lstr(
        "J'ai posé la question principale.",
        "I asked the main question.",
        "Hice la pregunta principal.",
      ),
      lstr(
        "J'ai demandé une autre option.",
        "I asked for another option.",
        "Pedí otra opción.",
      ),
      lstr(
        "J'ai exprimé une préférence claire.",
        "I expressed a clear preference.",
        "Expresé una preferencia clara.",
      ),
    ],
    modelSentence: "Hola, ¿cómo está? El clima cambió. ¿La excursión sigue en pie? ¿Hay otra opción? Prefiero mañana, por favor.",
  },
  {
    id: "rp-taxi-driver",
    title: lstr(
      "Expliquer ta destination au chauffeur",
      "Explain your destination to a taxi driver",
      "Explicar tu destino al chofer",
    ),
    scene: lstr(
      "Tu montes dans un taxi. Tu donnes une destination claire et tu confirmes le prix et la durée.",
      "You get into a taxi. You give a clear destination and confirm the price and travel time.",
      "Subes a un taxi. Das un destino claro y confirmas precio y tiempo.",
    ),
    roleA: lstr(
      "Tu joues le voyageur. Salue, donne la destination, confirme le prix et la durée.",
      "Play the traveler. Greet, give the destination, confirm price and time.",
      "Haces el papel del viajero. Saluda, da el destino y confirma precio y tiempo.",
    ),
    roleB: lstr(
      "Ton partenaire joue le conducteur. Il/elle confirme la route et le prix.",
      "Your partner plays the driver. They confirm the route and price.",
      "Tu pareja hace de chofer. Confirma la ruta y el precio.",
    ),
    targetPhrases: [
      "Buenas, ¿cómo está?",
      "Voy para la Zona Colonial, por favor.",
      "¿Cuánto cuesta?",
      "¿Cuánto tiempo va a tardar?",
      "Muchas gracias.",
    ],
    successChecklist: [
      lstr(
        "J'ai donné la destination en espagnol.",
        "I gave the destination in Spanish.",
        "Di el destino en español.",
      ),
      lstr(
        "J'ai demandé le prix.",
        "I asked the price.",
        "Pregunté el precio.",
      ),
      lstr(
        "J'ai demandé la durée.",
        "I asked how long it takes.",
        "Pregunté cuánto tarda.",
      ),
      lstr(
        "J'ai remercié à l'arrivée.",
        "I thanked on arrival.",
        "Agradecí al llegar.",
      ),
    ],
    modelSentence: "Buenas, ¿cómo está? Voy para la Zona Colonial, por favor. ¿Cuánto cuesta y cuánto tiempo va a tardar?",
  },
  {
    id: "rp-local-directions",
    title: lstr(
      "Demander à un local de répéter ou d'écrire",
      "Ask a local to repeat or write directions",
      "Pedir al local que repita o escriba",
    ),
    scene: lstr(
      "Un local te donne des indications très vite. Tu demandes poliment de répéter, plus lentement, ou d'écrire.",
      "A local gives you directions very fast. You politely ask for a repeat, slower, or in writing.",
      "Un local te da indicaciones muy rápido. Pides con cortesía que repita, hable más despacio o lo escriba.",
    ),
    roleA: lstr(
      "Tu joues le voyageur. Demande de l'aide pour comprendre.",
      "Play the traveler. Ask for help to understand.",
      "Haces el papel del viajero. Pide ayuda para entender.",
    ),
    roleB: lstr(
      "Ton partenaire joue le local. D'abord il/elle parle vite, puis ralentit.",
      "Your partner plays the local. First they speak fast, then they slow down.",
      "Tu pareja hace de local. Primero habla rápido y luego despacio.",
    ),
    targetPhrases: [
      "Disculpe, no entendí.",
      "¿Me puede repetir, por favor?",
      "¿Me puede hablar más despacio?",
      "¿Puede escribirlo, por favor?",
      "Muchas gracias.",
    ],
    successChecklist: [
      lstr(
        "J'ai dit poliment que je n'avais pas compris.",
        "I politely said I didn't understand.",
        "Dije con cortesía que no entendí.",
      ),
      lstr(
        "J'ai demandé de répéter ou de ralentir.",
        "I asked them to repeat or slow down.",
        "Pedí repetir o hablar despacio.",
      ),
      lstr(
        "J'ai proposé l'écrit comme plan B.",
        "I suggested writing as a plan B.",
        "Sugerí escribir como plan B.",
      ),
      lstr(
        "J'ai remercié.",
        "I thanked them.",
        "Agradecí.",
      ),
    ],
    modelSentence: "Disculpe, no entendí. ¿Me puede repetir más despacio o escribirlo, por favor? Muchas gracias.",
  },
];

// ─── A2 grammar / language toolbox (12 cards) ───────────────────────────

const grammarCards: Dom5GrammarCard[] = [
  {
    id: "g-regular-past",
    pattern: "verbo + -é / -í (yo)",
    meaning: lstr(
      "Passé régulier en -ar et -ir à la 1re personne.",
      "Regular past tense for -ar and -ir verbs (I form).",
      "Pasado regular de verbos -ar e -ir en primera persona.",
    ),
    examples: [
      {
        target: "Visité la Zona Colonial.",
        translation: lstr(
          "J'ai visité la Zona Colonial.",
          "I visited the Zona Colonial.",
          "Visité la Zona Colonial.",
        ),
      },
      {
        target: "Compré un recuerdo.",
        translation: lstr(
          "J'ai acheté un souvenir.",
          "I bought a souvenir.",
          "Compré un recuerdo.",
        ),
      },
    ],
    prompt: lstr(
      "Dis ce que tu as caminé, visité ou compré hier.",
      "Say what you walked, visited, or bought yesterday.",
      "Di qué caminaste, visitaste o compraste ayer.",
    ),
  },
  {
    id: "g-irregular-past",
    pattern: "fui · tuve · hice · pude · estuve",
    meaning: lstr(
      "Formes irrégulières utiles au passé : aller/être, avoir, faire, pouvoir, rester.",
      "Useful irregular past forms: to go/be, to have, to do, can, to stay.",
      "Irregulares útiles en pasado: ir/ser, tener, hacer, poder, estar.",
    ),
    examples: [
      {
        target: "Fui a Los Haitises.",
        translation: lstr(
          "Je suis allé(e) à Los Haitises.",
          "I went to Los Haitises.",
          "Fui a Los Haitises.",
        ),
      },
      {
        target: "Estuve en Samaná tres días.",
        translation: lstr(
          "Je suis resté(e) à Samaná trois jours.",
          "I stayed in Samaná for three days.",
          "Estuve en Samaná tres días.",
        ),
      },
    ],
    prompt: lstr(
      "Choisis 2 verbes irréguliers et raconte une mini-aventure.",
      "Pick 2 irregular verbs and tell a mini-adventure.",
      "Elige 2 verbos irregulares y cuenta una mini aventura.",
    ),
  },
  {
    id: "g-what-happened",
    pattern: "perdí · llegué · cambié · encontré",
    meaning: lstr(
      "Décrire ce qui est arrivé : perdre, arriver, changer, trouver.",
      "Describe what happened: lose, arrive, change, find.",
      "Describir lo que pasó: perder, llegar, cambiar, encontrar.",
    ),
    examples: [
      {
        target: "Perdí mi teléfono en el taxi.",
        translation: lstr(
          "J'ai perdu mon téléphone dans le taxi.",
          "I lost my phone in the taxi.",
          "Perdí mi teléfono en el taxi.",
        ),
      },
      {
        target: "Llegué tarde al hotel.",
        translation: lstr(
          "Je suis arrivé(e) tard à l'hôtel.",
          "I arrived late at the hotel.",
          "Llegué tarde al hotel.",
        ),
      },
    ],
    prompt: lstr(
      "Raconte un imprévu en utilisant 1 de ces verbes.",
      "Tell an unexpected event using one of these verbs.",
      "Cuenta un imprevisto usando uno de estos verbos.",
    ),
  },
  {
    id: "g-me-gusto",
    pattern: "Me gustó · me encantó",
    meaning: lstr(
      "Exprimer une impression positive au passé.",
      "Express a positive impression in the past.",
      "Expresar una impresión positiva en pasado.",
    ),
    examples: [
      {
        target: "Me gustó mucho la música.",
        translation: lstr(
          "La musique m'a beaucoup plu.",
          "I really liked the music.",
          "Me gustó mucho la música.",
        ),
      },
      {
        target: "Me encantó la Zona Colonial.",
        translation: lstr(
          "J'ai adoré la Zona Colonial.",
          "I loved the Zona Colonial.",
          "Me encantó la Zona Colonial.",
        ),
      },
    ],
    prompt: lstr(
      "Dis ce qui t'a plu et ce que tu as adoré.",
      "Say what you liked and what you loved.",
      "Di qué te gustó y qué te encantó.",
    ),
  },
  {
    id: "g-fue-estuvo",
    pattern: "Fue · estuvo",
    meaning: lstr(
      "Décrire une expérience : « ce fut » / « il/elle a été ».",
      "Describe an experience: \"it was\" / \"he/she/it was\".",
      "Describir una experiencia: «fue» / «estuvo».",
    ),
    examples: [
      {
        target: "Fue una experiencia increíble.",
        translation: lstr(
          "Ce fut une expérience incroyable.",
          "It was an amazing experience.",
          "Fue una experiencia increíble.",
        ),
      },
      {
        target: "El guía estuvo muy amable.",
        translation: lstr(
          "Le guide a été très aimable.",
          "The guide was very kind.",
          "El guía estuvo muy amable.",
        ),
      },
    ],
    prompt: lstr(
      "Décris en 1 phrase ce qu'a été ta journée.",
      "Describe your day in one sentence.",
      "Describe en 1 frase cómo fue tu día.",
    ),
  },
  {
    id: "g-tener-que",
    pattern: "tener que + infinitivo",
    meaning: lstr(
      "Exprimer une obligation personnelle (« je dois… »).",
      "Express a personal obligation (\"I have to…\").",
      "Expresar una obligación personal («tengo que…»).",
    ),
    examples: [
      {
        target: "Tengo que cambiar la reservación.",
        translation: lstr(
          "Je dois changer la réservation.",
          "I have to change the reservation.",
          "Tengo que cambiar la reservación.",
        ),
      },
      {
        target: "Tenemos que salir más tarde.",
        translation: lstr(
          "Nous devons partir plus tard.",
          "We have to leave later.",
          "Tenemos que salir más tarde.",
        ),
      },
    ],
    prompt: lstr(
      "Dis 2 choses que tu dois faire avant de rentrer.",
      "Say 2 things you have to do before going home.",
      "Di 2 cosas que tienes que hacer antes de volver.",
    ),
  },
  {
    id: "g-hay-que",
    pattern: "hay que + infinitivo",
    meaning: lstr(
      "Exprimer une obligation générale (« il faut… »).",
      "Express a general obligation (\"one must…\").",
      "Expresar una obligación general («hay que…»).",
    ),
    examples: [
      {
        target: "Hay que llegar temprano al aeropuerto.",
        translation: lstr(
          "Il faut arriver tôt à l'aéroport.",
          "You have to arrive early at the airport.",
          "Hay que llegar temprano al aeropuerto.",
        ),
      },
      {
        target: "Hay que confirmar por WhatsApp.",
        translation: lstr(
          "Il faut confirmer par WhatsApp.",
          "You need to confirm via WhatsApp.",
          "Hay que confirmar por WhatsApp.",
        ),
      },
    ],
    prompt: lstr(
      "Donne un conseil général à un autre voyageur.",
      "Give a general tip to another traveler.",
      "Da un consejo general a otro viajero.",
    ),
  },
  {
    id: "g-ir-a",
    pattern: "ir a + infinitivo",
    meaning: lstr(
      "Exprimer un projet ou un futur proche.",
      "Express a plan or near future.",
      "Expresar un plan o futuro cercano.",
    ),
    examples: [
      {
        target: "Voy a llamar al hotel.",
        translation: lstr(
          "Je vais appeler l'hôtel.",
          "I'm going to call the hotel.",
          "Voy a llamar al hotel.",
        ),
      },
      {
        target: "Vamos a salir a las nueve.",
        translation: lstr(
          "Nous allons partir à neuf heures.",
          "We're going to leave at nine.",
          "Vamos a salir a las nueve.",
        ),
      },
    ],
    prompt: lstr(
      "Dis 2 choses que tu vas faire ce soir.",
      "Say 2 things you're going to do tonight.",
      "Di 2 cosas que vas a hacer esta noche.",
    ),
  },
  {
    id: "g-poder-puede",
    pattern: "¿Puede + infinitivo?",
    meaning: lstr(
      "Demande polie au vouvoiement (« pouvez-vous… »).",
      "Polite formal request (\"can you…\").",
      "Solicitud amable de usted («¿puede…?»).",
    ),
    examples: [
      {
        target: "¿Puede ayudarme, por favor?",
        translation: lstr(
          "Pouvez-vous m'aider, s'il vous plaît ?",
          "Can you help me, please?",
          "¿Puede ayudarme, por favor?",
        ),
      },
      {
        target: "¿Puede repetirlo más despacio?",
        translation: lstr(
          "Pouvez-vous le répéter plus lentement ?",
          "Can you repeat it more slowly?",
          "¿Puede repetirlo más despacio?",
        ),
      },
    ],
    prompt: lstr(
      "Formule 2 demandes polies au vouvoiement.",
      "Make 2 polite formal requests.",
      "Haz 2 solicitudes amables de usted.",
    ),
  },
  {
    id: "g-lo-la",
    pattern: "lo · la (objeto directo)",
    meaning: lstr(
      "Reconnaître « lo / la » qui remplacent un nom déjà mentionné.",
      "Recognize \"lo / la\" replacing a noun already mentioned.",
      "Reconocer «lo / la» que sustituyen un nombre ya mencionado.",
    ),
    examples: [
      {
        target: "Tengo la confirmación. ¿Puede revisarla?",
        translation: lstr(
          "J'ai la confirmation. Pouvez-vous la vérifier ?",
          "I have the confirmation. Can you check it?",
          "Tengo la confirmación. ¿Puede revisarla?",
        ),
      },
      {
        target: "Perdí mi teléfono. Lo dejé en el taxi.",
        translation: lstr(
          "J'ai perdu mon téléphone. Je l'ai laissé dans le taxi.",
          "I lost my phone. I left it in the taxi.",
          "Perdí mi teléfono. Lo dejé en el taxi.",
        ),
      },
    ],
    prompt: lstr(
      "Reformule une phrase en remplaçant l'objet par lo ou la.",
      "Rewrite one sentence replacing the object with lo or la.",
      "Reescribe una frase usando lo o la.",
    ),
  },
  {
    id: "g-connectors",
    pattern: "primero · después · luego · al final",
    meaning: lstr(
      "Connecteurs de séquence pour raconter une journée.",
      "Sequence connectors to recount a day.",
      "Conectores de secuencia para contar un día.",
    ),
    examples: [
      {
        target: "Primero fui a la playa, después almorcé y al final tomé un taxi.",
        translation: lstr(
          "D'abord je suis allé à la plage, puis j'ai déjeuné et à la fin j'ai pris un taxi.",
          "First I went to the beach, then I had lunch, and at the end I took a taxi.",
          "Primero fui a la playa, después almorcé y al final tomé un taxi.",
        ),
      },
      {
        target: "Luego visité la catedral.",
        translation: lstr(
          "Ensuite j'ai visité la cathédrale.",
          "Then I visited the cathedral.",
          "Luego visité la catedral.",
        ),
      },
    ],
    prompt: lstr(
      "Raconte ta journée en 3 étapes : primero / después / al final.",
      "Tell your day in 3 steps: primero / después / al final.",
      "Cuenta tu día en 3 pasos: primero / después / al final.",
    ),
  },
  {
    id: "g-cause-solution",
    pattern: "porque · entonces · por eso",
    meaning: lstr(
      "Connecter cause et solution.",
      "Connect cause and solution.",
      "Conectar causa y solución.",
    ),
    examples: [
      {
        target: "Llovía mucho, por eso cambiamos la excursión.",
        translation: lstr(
          "Il pleuvait beaucoup, c'est pourquoi nous avons changé l'excursion.",
          "It was raining a lot, so we changed the excursion.",
          "Llovía mucho, por eso cambiamos la excursión.",
        ),
      },
      {
        target: "El taxi no llegó, entonces tomé una guagua.",
        translation: lstr(
          "Le taxi n'est pas arrivé, alors j'ai pris une guagua.",
          "The taxi didn't come, so I took a guagua.",
          "El taxi no llegó, entonces tomé una guagua.",
        ),
      },
    ],
    prompt: lstr(
      "Explique un imprévu avec porque + por eso.",
      "Explain an unexpected event with porque + por eso.",
      "Explica un imprevisto con porque + por eso.",
    ),
  },
];

// ─── Flashcards (50+ cards) ─────────────────────────────────────────────

const FC_PROBLEMS = lstr(
  "Problèmes et besoins",
  "Problems and needs",
  "Problemas y necesidades",
);
const FC_HELP = lstr(
  "Aide et politesse",
  "Help and politeness",
  "Ayuda y cortesía",
);
const FC_TRAVEL_CHANGES = lstr(
  "Changements de voyage",
  "Travel changes",
  "Cambios de viaje",
);
const FC_FAST_SPEECH = lstr(
  "Comprendre quand ça va vite",
  "Understanding fast Spanish",
  "Entender el español rápido",
);
const FC_PAST = lstr(
  "Raconter au passé",
  "Past-tense storytelling",
  "Contar en pasado",
);
const FC_WRITING = lstr(
  "Écrire un message",
  "Writing a message",
  "Escribir un mensaje",
);
const FC_CULTURE = lstr(
  "Culture, histoire, musique",
  "Culture, history, music",
  "Cultura, historia, música",
);
const FC_CONNECTORS = lstr(
  "Connecteurs utiles",
  "Useful connectors",
  "Conectores útiles",
);

const flashcards: Dom5Flashcard[] = [
  // Problems and needs (1-7)
  { id: "fc-problema", category: FC_PROBLEMS, front: "el problema", back: lstr("le problème", "the problem", "el problema") },
  { id: "fc-ayuda", category: FC_HELP, front: "la ayuda", back: lstr("l'aide", "the help", "la ayuda") },
  { id: "fc-telefono", category: FC_PROBLEMS, front: "el teléfono", back: lstr("le téléphone", "the phone", "el teléfono") },
  { id: "fc-pasaporte", category: FC_PROBLEMS, front: "el pasaporte", back: lstr("le passeport", "the passport", "el pasaporte") },
  { id: "fc-maleta", category: FC_PROBLEMS, front: "la maleta", back: lstr("la valise", "the suitcase", "la maleta") },
  { id: "fc-reservacion", category: FC_TRAVEL_CHANGES, front: "la reservación", back: lstr("la réservation", "the reservation", "la reservación") },
  { id: "fc-confirmacion", category: FC_TRAVEL_CHANGES, front: "la confirmación", back: lstr("la confirmation", "the confirmation", "la confirmación") },
  { id: "fc-recibo", category: FC_HELP, front: "el recibo", back: lstr("le reçu", "the receipt", "el recibo") },
  { id: "fc-farmacia", category: FC_PROBLEMS, front: "la farmacia", back: lstr("la pharmacie", "the pharmacy", "la farmacia") },
  // Travel & weather (10-15)
  { id: "fc-clima", category: FC_TRAVEL_CHANGES, front: "el clima", back: lstr("la météo", "the weather", "el clima") },
  { id: "fc-lluvia", category: FC_TRAVEL_CHANGES, front: "la lluvia", back: lstr("la pluie", "the rain", "la lluvia") },
  { id: "fc-viento", category: FC_TRAVEL_CHANGES, front: "el viento", back: lstr("le vent", "the wind", "el viento") },
  { id: "fc-excursion", category: FC_TRAVEL_CHANGES, front: "la excursión", back: lstr("l'excursion", "the excursion", "la excursión") },
  { id: "fc-guia", category: FC_HELP, front: "el guía", back: lstr("le guide", "the guide", "el guía") },
  { id: "fc-opcion", category: FC_TRAVEL_CHANGES, front: "la opción", back: lstr("l'option", "the option", "la opción") },
  // Action verbs (16-22)
  { id: "fc-esperar", category: FC_HELP, front: "esperar", back: lstr("attendre", "to wait", "esperar") },
  { id: "fc-cambiar", category: FC_TRAVEL_CHANGES, front: "cambiar", back: lstr("changer", "to change", "cambiar") },
  { id: "fc-cancelar", category: FC_TRAVEL_CHANGES, front: "cancelar", back: lstr("annuler", "to cancel", "cancelar") },
  { id: "fc-llamar", category: FC_HELP, front: "llamar", back: lstr("appeler", "to call", "llamar") },
  { id: "fc-escribir", category: FC_WRITING, front: "escribir", back: lstr("écrire", "to write", "escribir") },
  { id: "fc-repetir", category: FC_FAST_SPEECH, front: "repetir", back: lstr("répéter", "to repeat", "repetir") },
  { id: "fc-entender", category: FC_FAST_SPEECH, front: "entender", back: lstr("comprendre", "to understand", "entender") },
  // Past forms (23-33)
  { id: "fc-perdi", category: FC_PAST, front: "perdí", back: lstr("j'ai perdu", "I lost", "perdí") },
  { id: "fc-encontre", category: FC_PAST, front: "encontré", back: lstr("j'ai trouvé", "I found", "encontré") },
  { id: "fc-llegue", category: FC_PAST, front: "llegué", back: lstr("je suis arrivé(e)", "I arrived", "llegué") },
  { id: "fc-cambie", category: FC_PAST, front: "cambié", back: lstr("j'ai changé", "I changed", "cambié") },
  { id: "fc-fui", category: FC_PAST, front: "fui", back: lstr("je suis allé(e)", "I went", "fui") },
  { id: "fc-estuve", category: FC_PAST, front: "estuve", back: lstr("je suis resté(e) / j'ai été", "I was / I stayed", "estuve") },
  { id: "fc-tuve", category: FC_PAST, front: "tuve", back: lstr("j'ai eu", "I had", "tuve") },
  { id: "fc-hice", category: FC_PAST, front: "hice", back: lstr("j'ai fait", "I did / I made", "hice") },
  { id: "fc-pude", category: FC_PAST, front: "pude", back: lstr("j'ai pu", "I could / I was able", "pude") },
  { id: "fc-me-gusto", category: FC_PAST, front: "me gustó", back: lstr("ça m'a plu", "I liked it", "me gustó") },
  { id: "fc-fue", category: FC_PAST, front: "fue", back: lstr("ce fut / il/elle a été", "it was", "fue") },
  // Connectors (34-40)
  { id: "fc-primero", category: FC_CONNECTORS, front: "primero", back: lstr("d'abord", "first", "primero") },
  { id: "fc-despues", category: FC_CONNECTORS, front: "después", back: lstr("ensuite / après", "afterwards / then", "después") },
  { id: "fc-luego", category: FC_CONNECTORS, front: "luego", back: lstr("puis", "then", "luego") },
  { id: "fc-al-final", category: FC_CONNECTORS, front: "al final", back: lstr("à la fin", "at the end", "al final") },
  { id: "fc-porque", category: FC_CONNECTORS, front: "porque", back: lstr("parce que", "because", "porque") },
  { id: "fc-entonces", category: FC_CONNECTORS, front: "entonces", back: lstr("alors / donc", "so / then", "entonces") },
  { id: "fc-por-eso", category: FC_CONNECTORS, front: "por eso", back: lstr("c'est pourquoi", "that's why", "por eso") },
  // Culture / history / music (41-48)
  { id: "fc-merengue", category: FC_CULTURE, front: "merengue", back: lstr("merengue (musique dominicaine)", "merengue (Dominican music)", "merengue (música dominicana)") },
  { id: "fc-bachata", category: FC_CULTURE, front: "bachata", back: lstr("bachata (musique dominicaine)", "bachata (Dominican music)", "bachata (música dominicana)") },
  { id: "fc-zona-colonial", category: FC_CULTURE, front: "Zona Colonial", back: lstr("Zona Colonial (Saint-Domingue, UNESCO)", "Zona Colonial (Santo Domingo, UNESCO)", "Zona Colonial (Santo Domingo, UNESCO)") },
  { id: "fc-haitises", category: FC_CULTURE, front: "Los Haitises", back: lstr("Los Haitises (parc national)", "Los Haitises (national park)", "Los Haitises (parque nacional)") },
  { id: "fc-taino", category: FC_CULTURE, front: "Taíno", back: lstr("Taíno (premier peuple de l'île)", "Taíno (first people of the island)", "Taíno (primer pueblo de la isla)") },
  { id: "fc-larimar", category: FC_CULTURE, front: "larimar", back: lstr("pierre bleue dominicaine, souvent vendue comme souvenir", "Dominican blue stone, often sold as a souvenir", "piedra azul dominicana, común como recuerdo") },
  { id: "fc-cacao", category: FC_CULTURE, front: "cacao", back: lstr("produit agricole dominicain à reconnaître en contexte culturel", "Dominican agricultural product to recognize in culture context", "producto agrícola dominicano para reconocer en contexto cultural") },
  { id: "fc-cafe", category: FC_CULTURE, front: "café", back: lstr("produit local et pause sociale, pas seulement un mot à traduire", "local product and social pause, not just a word to translate", "producto local y pausa social, no solo una palabra para traducir") },
  // Closing words (49-51)
  { id: "fc-recuerdo", category: FC_CULTURE, front: "el recuerdo", back: lstr("le souvenir", "the souvenir / memory", "el recuerdo") },
  { id: "fc-experiencia", category: FC_PAST, front: "la experiencia", back: lstr("l'expérience", "the experience", "la experiencia") },
  { id: "fc-volver", category: FC_PAST, front: "volver", back: lstr("revenir / retourner", "to come back / return", "volver") },
];

// ─── Practice quiz (20 questions, Spanish-only choices) ─────────────────

const QT_REPEAT = lstr("Réparation oral", "Fast-speech repair", "Reparación oral");
const QT_LOST = lstr("Objets perdus", "Lost items", "Objetos perdidos");
const QT_HOTEL = lstr("Hôtel", "Hotel", "Hotel");
const QT_PLAN = lstr("Planification", "Planning", "Planificación");
const QT_CONNECTOR = lstr("Connecteur", "Connector", "Conector");
const QT_PAST = lstr("Passé", "Past tense", "Pasado");
const QT_CULTURE = lstr("Culture / histoire", "Culture / history", "Cultura / historia");
const QT_MUSIC = lstr("Musique", "Music", "Música");
const QT_WRITING = lstr("Écriture", "Writing", "Escritura");
const QT_PROBLEM = lstr("Résolution de problème", "Problem-solving", "Resolución de problemas");
const QT_WEATHER = lstr("Météo", "Weather", "Clima");
const QT_TRANSPORT = lstr("Transport", "Transport", "Transporte");
const QT_HEALTH = lstr("Santé pratique", "Practical health", "Salud práctica");
const QT_READING = lstr("Compréhension écrite", "Reading comprehension", "Comprensión escrita");

const quizQuestions: Dom5QuizQuestion[] = [
  {
    id: "qz-repeat-slower",
    type: QT_REPEAT,
    prompt: lstr(
      "Quelle phrase demande à quelqu'un de répéter plus lentement ?",
      "Which phrase asks someone to repeat more slowly?",
      "¿Qué frase pide a alguien repetir más despacio?",
    ),
    options: [
      { id: "a", target: "¿Me puede hablar más despacio?", translation: lstr("Pouvez-vous parler plus lentement ?", "Can you speak more slowly?", "¿Me puede hablar más despacio?") },
      { id: "b", target: "¿Cuánto cuesta?", translation: lstr("Combien ça coûte ?", "How much does it cost?", "¿Cuánto cuesta?") },
      { id: "c", target: "¡Qué experiencia!", translation: lstr("Quelle expérience !", "What an experience!", "¡Qué experiencia!") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Me puede hablar más despacio? » est la phrase A2 la plus utile pour ralentir une conversation.",
      "\"¿Me puede hablar más despacio?\" is the single most useful A2 phrase to slow down a conversation.",
      "«¿Me puede hablar más despacio?» es la frase A2 más útil para ralentizar la conversación.",
    ),
  },
  {
    id: "qz-lost-phone",
    type: QT_LOST,
    prompt: lstr(
      "Quelle phrase signifie « j'ai perdu mon téléphone » ?",
      "Which phrase says \"I lost my phone\"?",
      "¿Qué frase dice «perdí mi teléfono»?",
    ),
    options: [
      { id: "a", target: "Encontré mi teléfono.", translation: lstr("J'ai trouvé mon téléphone.", "I found my phone.", "Encontré mi teléfono.") },
      { id: "b", target: "Perdí mi teléfono.", translation: lstr("J'ai perdu mon téléphone.", "I lost my phone.", "Perdí mi teléfono.") },
      { id: "c", target: "Compré un teléfono.", translation: lstr("J'ai acheté un téléphone.", "I bought a phone.", "Compré un teléfono.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« perdí » est le passé de « perder » à la 1re personne.",
      "\"perdí\" is the first-person past form of \"perder\".",
      "«perdí» es el pasado de «perder» en primera persona.",
    ),
  },
  {
    id: "qz-reservation-not-found",
    type: QT_HOTEL,
    prompt: lstr(
      "Quelle phrase signifie « ma réservation n'apparaît pas » ?",
      "Which phrase says \"my reservation does not appear\"?",
      "¿Qué frase dice «mi reservación no aparece»?",
    ),
    options: [
      { id: "a", target: "Mi reservación está confirmada.", translation: lstr("Ma réservation est confirmée.", "My reservation is confirmed.", "Mi reservación está confirmada.") },
      { id: "b", target: "Mi reservación no aparece.", translation: lstr("Ma réservation n'apparaît pas.", "My reservation does not appear.", "Mi reservación no aparece.") },
      { id: "c", target: "Mi reservación es mañana.", translation: lstr("Ma réservation est pour demain.", "My reservation is tomorrow.", "Mi reservación es mañana.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« no aparece » est la formule clé à la réception quand quelque chose manque dans le système.",
      "\"no aparece\" is the key phrase at the front desk when something is missing in the system.",
      "«no aparece» es la frase clave en recepción cuando algo no está en el sistema.",
    ),
  },
  {
    id: "qz-prefer-tomorrow",
    type: QT_PLAN,
    prompt: lstr(
      "Quelle phrase signifie « je préfère demain » ?",
      "Which phrase says \"I prefer tomorrow\"?",
      "¿Qué frase dice «prefiero mañana»?",
    ),
    options: [
      { id: "a", target: "Prefiero mañana, por favor.", translation: lstr("Je préfère demain, s'il vous plaît.", "I prefer tomorrow, please.", "Prefiero mañana, por favor.") },
      { id: "b", target: "Vamos esta noche.", translation: lstr("On y va ce soir.", "Let's go tonight.", "Vamos esta noche.") },
      { id: "c", target: "No hay opción.", translation: lstr("Il n'y a pas d'option.", "There is no option.", "No hay opción.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Prefiero + temps » est l'A2 standard pour exprimer une préférence.",
      "\"Prefiero + time\" is the standard A2 way to express a preference.",
      "«Prefiero + tiempo» es la forma A2 estándar para expresar preferencia.",
    ),
  },
  {
    id: "qz-connector-after",
    type: QT_CONNECTOR,
    prompt: lstr(
      "Quel connecteur signifie « après / ensuite » ?",
      "Which connector means \"afterwards / then\"?",
      "¿Qué conector significa «después»?",
    ),
    options: [
      { id: "a", target: "primero", translation: lstr("d'abord", "first", "primero") },
      { id: "b", target: "después", translation: lstr("après / ensuite", "afterwards / then", "después") },
      { id: "c", target: "porque", translation: lstr("parce que", "because", "porque") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« después » sert à enchaîner une 2e action dans un récit.",
      "\"después\" links a second action in a story.",
      "«después» encadena una segunda acción en un relato.",
    ),
  },
  {
    id: "qz-past-i-went",
    type: QT_PAST,
    prompt: lstr(
      "Quelle forme au passé signifie « je suis allé(e) » ?",
      "Which past form means \"I went\"?",
      "¿Qué forma de pasado significa «I went»?",
    ),
    options: [
      { id: "a", target: "voy", translation: lstr("je vais", "I go", "voy") },
      { id: "b", target: "fui", translation: lstr("je suis allé(e)", "I went", "fui") },
      { id: "c", target: "iré", translation: lstr("j'irai", "I will go", "iré") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« fui » est l'irrégulier de « ir » au passé (1re personne).",
      "\"fui\" is the irregular past of \"ir\" (first person).",
      "«fui» es el irregular de «ir» en pasado (primera persona).",
    ),
  },
  {
    id: "qz-past-i-was",
    type: QT_PAST,
    prompt: lstr(
      "Quelle forme au passé signifie « je suis resté(e) / j'ai été » ?",
      "Which past form means \"I was / stayed\"?",
      "¿Qué forma de pasado significa «I was / stayed»?",
    ),
    options: [
      { id: "a", target: "estoy", translation: lstr("je suis", "I am", "estoy") },
      { id: "b", target: "estaré", translation: lstr("je serai", "I will be", "estaré") },
      { id: "c", target: "estuve", translation: lstr("je suis resté(e) / j'ai été", "I was / stayed", "estuve") },
    ],
    correctOptionId: "c",
    explanation: lstr(
      "« estuve » est le passé irrégulier de « estar » (1re personne).",
      "\"estuve\" is the irregular past of \"estar\" (first person).",
      "«estuve» es el irregular de «estar» en pasado (primera persona).",
    ),
  },
  {
    id: "qz-culture-taino",
    type: QT_CULTURE,
    prompt: lstr(
      "Quel lieu est lié à la langue et à la nature taïnos ?",
      "Which place is connected to Taíno language and nature?",
      "¿Qué lugar está conectado con la lengua y la naturaleza taína?",
    ),
    options: [
      { id: "a", target: "Los Haitises", translation: lstr("Los Haitises (parc national)", "Los Haitises (national park)", "Los Haitises (parque nacional)") },
      { id: "b", target: "Punta Cana", translation: lstr("Punta Cana (zone touristique)", "Punta Cana (tourist zone)", "Punta Cana (zona turística)") },
      { id: "c", target: "Santiago", translation: lstr("Santiago (centre-nord)", "Santiago (north-central city)", "Santiago (ciudad del centro-norte)") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Los Haitises » vient du taïno et signifie « terre de montagnes ». C'est un parc national protégé.",
      "\"Los Haitises\" comes from the Taíno language and means \"land of mountains\". It is a protected national park.",
      "«Los Haitises» viene del taíno y significa «tierra de montañas». Es un parque nacional protegido.",
    ),
  },
  {
    id: "qz-music-styles",
    type: QT_MUSIC,
    prompt: lstr(
      "Quels styles musicaux sont fortement dominicains ?",
      "Which music styles are strongly Dominican?",
      "¿Qué estilos musicales son fuertemente dominicanos?",
    ),
    options: [
      { id: "a", target: "tango y flamenco", translation: lstr("tango et flamenco", "tango and flamenco", "tango y flamenco") },
      { id: "b", target: "merengue y bachata", translation: lstr("merengue et bachata", "merengue and bachata", "merengue y bachata") },
      { id: "c", target: "samba y bossa nova", translation: lstr("samba et bossa-nova", "samba and bossa nova", "samba y bossa nova") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "Le merengue et la bachata sont les deux musiques les plus emblématiques du pays.",
      "Merengue and bachata are the two most emblematic Dominican musics.",
      "El merengue y la bachata son las dos músicas más emblemáticas del país.",
    ),
  },
  {
    id: "qz-polite-message-start",
    type: QT_WRITING,
    prompt: lstr(
      "Quelle phrase ouvre poliment un message écrit ?",
      "Which phrase politely starts a written message?",
      "¿Qué frase abre un mensaje escrito con cortesía?",
    ),
    options: [
      { id: "a", target: "Le escribo porque tengo un problema.", translation: lstr("Je vous écris parce que j'ai un problème.", "I'm writing because I have a problem.", "Le escribo porque tengo un problema.") },
      { id: "b", target: "¡Tato!", translation: lstr("Parfait / OK !", "Perfect / OK!", "¡Tato!") },
      { id: "c", target: "Vamos.", translation: lstr("Allons-y.", "Let's go.", "Vamos.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Le escribo porque… » ouvre un message poli en expliquant clairement le motif.",
      "\"Le escribo porque…\" politely opens a message and clearly states the reason.",
      "«Le escribo porque…» abre un mensaje con cortesía y explica el motivo.",
    ),
  },
  {
    id: "qz-problem-other-option",
    type: QT_PROBLEM,
    prompt: lstr(
      "Quelle phrase demande s'il y a une autre option ?",
      "Which phrase asks if there is another option?",
      "¿Qué frase pregunta si hay otra opción?",
    ),
    options: [
      { id: "a", target: "¿Hay otra opción?", translation: lstr("Y a-t-il une autre option ?", "Is there another option?", "¿Hay otra opción?") },
      { id: "b", target: "Está bien.", translation: lstr("D'accord.", "It's fine.", "Está bien.") },
      { id: "c", target: "Voy a ver.", translation: lstr("Je vais voir.", "I'll see.", "Voy a ver.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Hay otra opción? » est la question d'or face à un changement de plan.",
      "\"¿Hay otra opción?\" is the gold-standard question when a plan changes.",
      "«¿Hay otra opción?» es la pregunta clave ante un cambio de plan.",
    ),
  },
  {
    id: "qz-weather-its-raining",
    type: QT_WEATHER,
    prompt: lstr(
      "Quelle phrase signifie « il pleut » ?",
      "Which phrase says \"it's raining\"?",
      "¿Qué frase dice «está lloviendo»?",
    ),
    options: [
      { id: "a", target: "Hace sol.", translation: lstr("Il fait soleil.", "It's sunny.", "Hace sol.") },
      { id: "b", target: "Está lloviendo.", translation: lstr("Il pleut.", "It's raining.", "Está lloviendo.") },
      { id: "c", target: "Está nevando.", translation: lstr("Il neige.", "It's snowing.", "Está nevando.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Está lloviendo » est le présent continu pour décrire la pluie en cours.",
      "\"Está lloviendo\" is the present continuous describing rain in progress.",
      "«Está lloviendo» es el presente continuo para describir la lluvia.",
    ),
  },
  {
    id: "qz-transport-prefer-taxi",
    type: QT_TRANSPORT,
    prompt: lstr(
      "Quelle phrase exprime « je préfère prendre un taxi » ?",
      "Which phrase says \"I'd rather take a taxi\"?",
      "¿Qué frase dice «prefiero tomar un taxi»?",
    ),
    options: [
      { id: "a", target: "Prefiero tomar un taxi.", translation: lstr("Je préfère prendre un taxi.", "I'd rather take a taxi.", "Prefiero tomar un taxi.") },
      { id: "b", target: "Voy en bicicleta.", translation: lstr("J'y vais à vélo.", "I'm going by bike.", "Voy en bicicleta.") },
      { id: "c", target: "Estoy esperando.", translation: lstr("J'attends.", "I'm waiting.", "Estoy esperando.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Prefiero tomar… » est l'A2 standard pour confirmer ton choix de transport.",
      "\"Prefiero tomar…\" is the standard A2 way to confirm your transport choice.",
      "«Prefiero tomar…» es la forma A2 estándar para confirmar tu elección de transporte.",
    ),
  },
  {
    id: "qz-health-pharmacy",
    type: QT_HEALTH,
    prompt: lstr(
      "Quelle phrase demande où se trouve une pharmacie ?",
      "Which phrase asks where a pharmacy is?",
      "¿Qué frase pregunta dónde hay una farmacia?",
    ),
    options: [
      { id: "a", target: "¿Dónde hay una farmacia?", translation: lstr("Où y a-t-il une pharmacie ?", "Where is there a pharmacy?", "¿Dónde hay una farmacia?") },
      { id: "b", target: "¿Dónde está el banco?", translation: lstr("Où est la banque ?", "Where is the bank?", "¿Dónde está el banco?") },
      { id: "c", target: "¿Cómo se llama esto?", translation: lstr("Comment ça s'appelle ?", "What's this called?", "¿Cómo se llama esto?") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Dónde hay una farmacia? » est la formule directe et polie.",
      "\"¿Dónde hay una farmacia?\" is the direct, polite formulation.",
      "«¿Dónde hay una farmacia?» es la fórmula directa y amable.",
    ),
  },
  {
    id: "qz-fast-speech-write",
    type: QT_REPEAT,
    prompt: lstr(
      "Quelle phrase demande à l'autre d'écrire l'information ?",
      "Which phrase asks the other person to write the information down?",
      "¿Qué frase pide que escriban la información?",
    ),
    options: [
      { id: "a", target: "¿Puede escribirlo, por favor?", translation: lstr("Pouvez-vous l'écrire, s'il vous plaît ?", "Could you write it, please?", "¿Puede escribirlo, por favor?") },
      { id: "b", target: "Hable más alto, por favor.", translation: lstr("Parlez plus fort, s'il vous plaît.", "Speak louder, please.", "Hable más alto, por favor.") },
      { id: "c", target: "Más despacio, gracias.", translation: lstr("Plus lentement, merci.", "Slower, thanks.", "Más despacio, gracias.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« ¿Puede escribirlo, por favor? » est le plan B parfait quand l'oral va trop vite.",
      "\"¿Puede escribirlo, por favor?\" is the perfect plan B when speech is too fast.",
      "«¿Puede escribirlo, por favor?» es el plan B perfecto cuando hablan muy rápido.",
    ),
  },
  {
    id: "qz-reading-hotel-time",
    type: QT_READING,
    prompt: lstr(
      "Dans le message du hôtel, à quelle heure est le check-in ?",
      "In the hotel message, what time is check-in?",
      "En el mensaje del hotel, ¿a qué hora es el check-in?",
    ),
    options: [
      { id: "a", target: "A las dos.", translation: lstr("À deux heures.", "At two.", "A las dos.") },
      { id: "b", target: "A las cuatro.", translation: lstr("À quatre heures.", "At four.", "A las cuatro.") },
      { id: "c", target: "A las nueve.", translation: lstr("À neuf heures.", "At nine.", "A las nueve.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "Le hôtel a déplacé le check-in de 14 h à 16 h pour terminer le ménage.",
      "The hotel moved check-in from 2 PM to 4 PM to finish cleaning.",
      "El hotel movió el check-in de las dos a las cuatro para terminar la limpieza.",
    ),
  },
  {
    id: "qz-writing-structure",
    type: QT_WRITING,
    prompt: lstr(
      "Quelle structure A2 est correcte pour clore un message poli ?",
      "Which A2 structure correctly closes a polite message?",
      "¿Qué estructura A2 cierra correctamente un mensaje amable?",
    ),
    options: [
      { id: "a", target: "Muchas gracias por su ayuda. Quedo pendiente.", translation: lstr("Merci beaucoup pour votre aide. Je reste à votre disposition.", "Thank you so much for your help. I remain at your disposal.", "Muchas gracias por su ayuda. Quedo pendiente.") },
      { id: "b", target: "Ya está, hasta luego.", translation: lstr("C'est bon, à plus.", "All done, see you later.", "Ya está, hasta luego.") },
      { id: "c", target: "Necesito un taxi.", translation: lstr("J'ai besoin d'un taxi.", "I need a taxi.", "Necesito un taxi.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Muchas gracias por su ayuda. Quedo pendiente. » est le combo de clôture A2 idéal.",
      "\"Muchas gracias por su ayuda. Quedo pendiente.\" is the ideal A2 closing combo.",
      "«Muchas gracias por su ayuda. Quedo pendiente.» es el cierre A2 ideal.",
    ),
  },
  {
    id: "qz-connector-cause",
    type: QT_CONNECTOR,
    prompt: lstr(
      "Quel connecteur exprime une cause ?",
      "Which connector expresses a cause?",
      "¿Qué conector expresa causa?",
    ),
    options: [
      { id: "a", target: "porque", translation: lstr("parce que", "because", "porque") },
      { id: "b", target: "después", translation: lstr("après / ensuite", "afterwards / then", "después") },
      { id: "c", target: "primero", translation: lstr("d'abord", "first", "primero") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« porque » introduit une explication / cause.",
      "\"porque\" introduces an explanation / cause.",
      "«porque» introduce una explicación / causa.",
    ),
  },
  {
    id: "qz-past-i-liked",
    type: QT_PAST,
    prompt: lstr(
      "Quelle phrase exprime « ça m'a beaucoup plu » ?",
      "Which phrase says \"I liked it a lot\"?",
      "¿Qué frase dice «me gustó mucho»?",
    ),
    options: [
      { id: "a", target: "Me gustó mucho.", translation: lstr("Ça m'a beaucoup plu.", "I liked it a lot.", "Me gustó mucho.") },
      { id: "b", target: "Quiero ir.", translation: lstr("Je veux y aller.", "I want to go.", "Quiero ir.") },
      { id: "c", target: "No lo encuentro.", translation: lstr("Je ne le trouve pas.", "I can't find it.", "No lo encuentro.") },
    ],
    correctOptionId: "a",
    explanation: lstr(
      "« Me gustó mucho » est la phrase A2 clé pour exprimer une impression positive.",
      "\"Me gustó mucho\" is the key A2 phrase for a positive impression.",
      "«Me gustó mucho» es la frase A2 clave para una impresión positiva.",
    ),
  },
  {
    id: "qz-final-experience",
    type: QT_PAST,
    prompt: lstr(
      "Quelle phrase signifie « ce fut une expérience incroyable » ?",
      "Which phrase says \"it was an amazing experience\"?",
      "¿Qué frase dice «fue una experiencia increíble»?",
    ),
    options: [
      { id: "a", target: "Es una experiencia.", translation: lstr("C'est une expérience.", "It is an experience.", "Es una experiencia.") },
      { id: "b", target: "Fue una experiencia increíble.", translation: lstr("Ce fut une expérience incroyable.", "It was an amazing experience.", "Fue una experiencia increíble.") },
      { id: "c", target: "Será una experiencia.", translation: lstr("Ce sera une expérience.", "It will be an experience.", "Será una experiencia.") },
    ],
    correctOptionId: "b",
    explanation: lstr(
      "« Fue » est l'irrégulier de « ser » au passé. La phrase complète clôt magnifiquement le module.",
      "\"Fue\" is the irregular past of \"ser\". The full sentence beautifully closes the module.",
      "«Fue» es el irregular de «ser» en pasado. La frase cierra el módulo con belleza.",
    ),
  },
];

// ─── Final capstone game (11 rounds) ─────────────────────────────────────

const finalGameRounds: Dom5GameRound[] = [
  {
    id: "rd-1-hotel-msg",
    stop: 1,
    scenario: lstr(
      "Tu reçois un message de l'hôtel : « El check-in será a las cuatro, no a las dos. » Que comprends-tu ?",
      "You get a message from the hotel: \"El check-in será a las cuatro, no a las dos.\" What does it mean?",
      "Recibes un mensaje del hotel: «El check-in será a las cuatro, no a las dos.» ¿Qué significa?",
    ),
    options: [
      { id: "a", target: "El hotel está cerrado.", translation: lstr("L'hôtel est fermé.", "The hotel is closed.", "El hotel está cerrado.") },
      { id: "b", target: "El check-in cambió de hora.", translation: lstr("L'heure du check-in a changé.", "The check-in time changed.", "El check-in cambió de hora.") },
      { id: "c", target: "La habitación es gratuita.", translation: lstr("La chambre est gratuite.", "The room is free.", "La habitación es gratuita.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "Bien lu : l'hôtel décale simplement l'heure du check-in. Tu peux laisser tes valises en attendant.",
      "Well read: the hotel just shifted the check-in time. You can leave your luggage in the meantime.",
      "Bien leído: el hotel simplemente movió la hora del check-in. Puedes dejar las maletas mientras tanto.",
    ),
  },
  {
    id: "rd-2-missing-reservation",
    stop: 2,
    scenario: lstr(
      "Tu arrives au hôtel et la réservation n'apparaît pas. Que dis-tu d'abord ?",
      "You arrive at the hotel and the reservation doesn't appear. What do you say first?",
      "Llegas al hotel y la reservación no aparece. ¿Qué dices primero?",
    ),
    options: [
      { id: "a", target: "Mi reservación no aparece. Aquí tengo la confirmación.", translation: lstr("Ma réservation n'apparaît pas. J'ai la confirmation ici.", "My reservation doesn't appear. I have the confirmation here.", "Mi reservación no aparece. Aquí tengo la confirmación.") },
      { id: "b", target: "Quiero cancelar todo.", translation: lstr("Je veux tout annuler.", "I want to cancel everything.", "Quiero cancelar todo.") },
      { id: "c", target: "No me gusta este hotel.", translation: lstr("Je n'aime pas cet hôtel.", "I don't like this hotel.", "No me gusta este hotel.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Tu expliques le problème calmement et tu présentes ta preuve. Le réceptionniste peut chercher ta réservation rapidement.",
      "You explain the issue calmly and show your proof. The desk agent can find your reservation quickly.",
      "Explicas el problema con calma y muestras la prueba. El recepcionista encuentra tu reservación rápido.",
    ),
  },
  {
    id: "rd-3-repeat-slower",
    stop: 3,
    scenario: lstr(
      "Le guide parle vite et tu n'as pas tout compris. Quelle phrase utilises-tu ?",
      "The guide is talking fast and you missed part of it. Which phrase do you use?",
      "El guía habla rápido y perdiste una parte. ¿Qué frase usas?",
    ),
    options: [
      { id: "a", target: "Vamos.", translation: lstr("Allons-y.", "Let's go.", "Vamos.") },
      { id: "b", target: "¿Me puede hablar más despacio?", translation: lstr("Pouvez-vous parler plus lentement ?", "Can you speak more slowly?", "¿Me puede hablar más despacio?") },
      { id: "c", target: "Está bien.", translation: lstr("D'accord.", "It's fine.", "Está bien.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "C'est exactement la phrase A2 utile : tu protèges ta compréhension sans gêner ton interlocuteur.",
      "Exactly the right A2 phrase: you protect your understanding without offending the other person.",
      "Exactamente la frase A2 útil: proteges tu comprensión sin incomodar al otro.",
    ),
  },
  {
    id: "rd-4-lost-item",
    stop: 4,
    scenario: lstr(
      "Tu réalises que tu n'as plus ton téléphone. Que dis-tu à la réception ?",
      "You realize your phone is gone. What do you say at the front desk?",
      "Te das cuenta de que ya no tienes tu teléfono. ¿Qué dices en recepción?",
    ),
    options: [
      { id: "a", target: "Perdí mi teléfono. Creo que lo dejé en el taxi.", translation: lstr("J'ai perdu mon téléphone. Je crois que je l'ai laissé dans le taxi.", "I lost my phone. I think I left it in the taxi.", "Perdí mi teléfono. Creo que lo dejé en el taxi.") },
      { id: "b", target: "Necesito un mapa.", translation: lstr("J'ai besoin d'une carte.", "I need a map.", "Necesito un mapa.") },
      { id: "c", target: "Quiero un café.", translation: lstr("Je veux un café.", "I want a coffee.", "Quiero un café.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Forme au passé claire + contexte court. La réception peut t'aider à contacter le chauffeur.",
      "Clear past tense + short context. The front desk can help you contact the driver.",
      "Pasado claro + contexto breve. Recepción puede ayudarte a contactar al chofer.",
    ),
  },
  {
    id: "rd-5-weather-change",
    stop: 5,
    scenario: lstr(
      "La pluie est très forte et l'excursion est en doute. Que demandes-tu au guide ?",
      "It's raining hard and the excursion is in doubt. What do you ask the guide?",
      "Llueve mucho y la excursión está en duda. ¿Qué le preguntas al guía?",
    ),
    options: [
      { id: "a", target: "¿Cuánto cuesta?", translation: lstr("Combien ça coûte ?", "How much does it cost?", "¿Cuánto cuesta?") },
      { id: "b", target: "¿La excursión sigue en pie? ¿Hay otra opción?", translation: lstr("L'excursion est-elle maintenue ? Y a-t-il une autre option ?", "Is the excursion still on? Is there another option?", "¿La excursión sigue en pie? ¿Hay otra opción?") },
      { id: "c", target: "¿Dónde está el mar?", translation: lstr("Où est la mer ?", "Where is the sea?", "¿Dónde está el mar?") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "Tu confirmes le statut de l'activité ET tu ouvres une alternative. Combo A2 parfait.",
      "You confirm the status AND open an alternative. Perfect A2 combo.",
      "Confirmas el estado Y abres una alternativa. Combo A2 perfecto.",
    ),
  },
  {
    id: "rd-6-ask-option",
    stop: 6,
    scenario: lstr(
      "Le guide te propose deux options : « Salir más tarde o cambiar para mañana. » Comment confirmes-tu ?",
      "The guide offers two options: \"Salir más tarde o cambiar para mañana.\" How do you confirm?",
      "El guía propone dos opciones: «Salir más tarde o cambiar para mañana.» ¿Cómo confirmas?",
    ),
    options: [
      { id: "a", target: "Prefiero mañana, por favor.", translation: lstr("Je préfère demain, s'il vous plaît.", "I'd rather do tomorrow, please.", "Prefiero mañana, por favor.") },
      { id: "b", target: "No me importa.", translation: lstr("Ça m'est égal.", "I don't care.", "No me importa.") },
      { id: "c", target: "¡Tato!", translation: lstr("OK !", "OK!", "¡Tato!") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Tu choisis clairement et poliment. Le guide peut s'organiser sans malentendu.",
      "You pick clearly and politely. The guide can plan without confusion.",
      "Eliges claro y con cortesía. El guía organiza sin confusiones.",
    ),
  },
  {
    id: "rd-7-tell-yesterday",
    stop: 7,
    scenario: lstr(
      "Tu racontes ta journée d'hier en une phrase. Quelle option est correcte au passé ?",
      "You tell your day yesterday in one sentence. Which option is correct in the past?",
      "Cuentas tu día de ayer en una frase. ¿Qué opción es correcta en pasado?",
    ),
    options: [
      { id: "a", target: "Ayer voy a la Zona Colonial.", translation: lstr("Hier je vais à la Zona Colonial.", "Yesterday I go to the Zona Colonial.", "Ayer voy a la Zona Colonial.") },
      { id: "b", target: "Ayer fui a la Zona Colonial y me gustó mucho.", translation: lstr("Hier je suis allé à la Zona Colonial et ça m'a beaucoup plu.", "Yesterday I went to the Zona Colonial and I liked it a lot.", "Ayer fui a la Zona Colonial y me gustó mucho.") },
      { id: "c", target: "Mañana voy a la Zona Colonial.", translation: lstr("Demain je vais à la Zona Colonial.", "Tomorrow I'm going to the Zona Colonial.", "Mañana voy a la Zona Colonial.") },
    ],
    correctOptionId: "b",
    feedback: lstr(
      "« fui » + « me gustó » : deux passés A2 utiles dans une seule phrase.",
      "\"fui\" + \"me gustó\": two useful A2 past forms in one sentence.",
      "«fui» + «me gustó»: dos pasados A2 útiles en una sola frase.",
    ),
  },
  {
    id: "rd-8-best-connector",
    stop: 8,
    scenario: lstr(
      "Tu enchaînes deux actions dans ta journée. Quel connecteur choisis-tu ?",
      "You link two actions in your day. Which connector do you pick?",
      "Encadenas dos acciones en tu día. ¿Qué conector eliges?",
    ),
    options: [
      { id: "a", target: "Primero fui a la playa, después almorcé en el pueblo.", translation: lstr("D'abord je suis allé à la plage, ensuite j'ai déjeuné au village.", "First I went to the beach, then I had lunch in the town.", "Primero fui a la playa, después almorcé en el pueblo.") },
      { id: "b", target: "Pero fui pero almorcé.", translation: lstr("Mais je suis allé mais j'ai déjeuné.", "But I went but I had lunch.", "Pero fui pero almorcé.") },
      { id: "c", target: "Fui almorzar a la playa.", translation: lstr("Je suis allé déjeuner à la plage.", "I went lunch beach (incorrect).", "Fui almorzar a la playa.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "« Primero… después » est le combo A2 parfait pour raconter une journée.",
      "\"Primero… después\" is the perfect A2 combo to tell a day.",
      "«Primero… después» es el combo A2 perfecto para contar un día.",
    ),
  },
  {
    id: "rd-9-cultural-reference",
    stop: 9,
    scenario: lstr(
      "Tu écoutes les locaux parler de musique et de quartier historique. Que choisis-tu pour montrer que tu comprends la culture ?",
      "You hear locals talk about music and a historic quarter. What do you pick to show you get the culture?",
      "Escuchas a los locales hablar de música y barrio histórico. ¿Qué eliges para mostrar que entiendes la cultura?",
    ),
    options: [
      { id: "a", target: "Me gusta el merengue y la Zona Colonial.", translation: lstr("J'aime le merengue et la Zona Colonial.", "I like merengue and the Zona Colonial.", "Me gusta el merengue y la Zona Colonial.") },
      { id: "b", target: "Quiero ir al desierto.", translation: lstr("Je veux aller au désert.", "I want to go to the desert.", "Quiero ir al desierto.") },
      { id: "c", target: "No conozco nada.", translation: lstr("Je ne connais rien.", "I don't know anything.", "No conozco nada.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Tu cites une musique dominicaine clé (merengue) et un lieu historique majeur (Zona Colonial).",
      "You name a key Dominican music (merengue) and a major historic place (Zona Colonial).",
      "Mencionas una música dominicana clave (merengue) y un lugar histórico mayor (Zona Colonial).",
    ),
  },
  {
    id: "rd-10-polite-closing",
    stop: 10,
    scenario: lstr(
      "Tu termines un message à la réception. Quelle clôture choisis-tu ?",
      "You're finishing a message to the front desk. Which closing do you pick?",
      "Terminas un mensaje a recepción. ¿Qué cierre eliges?",
    ),
    options: [
      { id: "a", target: "Muchas gracias por su ayuda. Quedo pendiente.", translation: lstr("Merci beaucoup pour votre aide. Je reste à votre disposition.", "Thank you so much for your help. I remain at your disposal.", "Muchas gracias por su ayuda. Quedo pendiente.") },
      { id: "b", target: "Adiós y ya está.", translation: lstr("Au revoir et c'est tout.", "Bye, that's all.", "Adiós y ya está.") },
      { id: "c", target: "OK.", translation: lstr("OK.", "OK.", "OK.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Combo A2 idéal : remerciement + signal que tu attends la réponse.",
      "Ideal A2 combo: thanks + signal that you're waiting for the reply.",
      "Combo A2 ideal: agradecimiento + señal de que esperas respuesta.",
    ),
  },
  {
    id: "rd-11-final-reflection",
    stop: 11,
    scenario: lstr(
      "Bonus de fin de mission : quelle phrase clôt ton dernier jour avec style A2 ?",
      "Final mission bonus: which sentence closes your last day with A2 style?",
      "Bono final de la misión: ¿qué frase cierra tu último día con estilo A2?",
    ),
    options: [
      { id: "a", target: "Fue una experiencia increíble. Aprendí mucho y quiero volver.", translation: lstr("Ce fut une expérience incroyable. J'ai beaucoup appris et je veux revenir.", "It was an amazing experience. I learned a lot and I want to come back.", "Fue una experiencia increíble. Aprendí mucho y quiero volver.") },
      { id: "b", target: "Tengo hambre.", translation: lstr("J'ai faim.", "I'm hungry.", "Tengo hambre.") },
      { id: "c", target: "No sé.", translation: lstr("Je ne sais pas.", "I don't know.", "No sé.") },
    ],
    correctOptionId: "a",
    feedback: lstr(
      "Trois bijoux A2 dans une phrase : « fue », « aprendí » et « quiero volver ». Capstone bouclé !",
      "Three A2 gems in one sentence: \"fue\", \"aprendí\", and \"quiero volver\". Capstone complete!",
      "Tres joyas A2 en una frase: «fue», «aprendí» y «quiero volver». ¡Capstone completado!",
    ),
  },
];

// ─── Printable worksheets (7 sheets, real reinforcement exercises) ──────

const printableSheets: Dom5PrintableSheet[] = [
  {
    id: "ws-vocabulary",
    kind: "vocabulary",
    title: lstr(
      "Feuille 1 · Vocabulaire — problèmes et solutions",
      "Worksheet 1 · Vocabulary — problems and solutions",
      "Hoja 1 · Vocabulario — problemas y soluciones",
    ),
    instructions: lstr(
      "Traduis en français, puis écris la colonne : Problème | Aide | Changement | Preuve.",
      "Translate into English, then write the column: Problem | Help | Change | Proof.",
      "Traduce a tu idioma y escribe la columna: Problema | Ayuda | Cambio | Prueba.",
    ),
    items: [
      { id: "ws1-1", target: "el problema", prompt: lstr("Écris la colonne : Problème", "Write the column: Problem", "Escribe la columna: Problema"), answer: lstr("le problème", "the problem", "el problema") },
      { id: "ws1-2", target: "la ayuda", prompt: lstr("Écris la colonne : Aide", "Write the column: Help", "Escribe la columna: Ayuda"), answer: lstr("l'aide", "the help", "la ayuda") },
      { id: "ws1-3", target: "la reservación", prompt: lstr("Écris la colonne : Changement", "Write the column: Change", "Escribe la columna: Cambio"), answer: lstr("la réservation", "the reservation", "la reservación") },
      { id: "ws1-4", target: "la farmacia", prompt: lstr("Écris la colonne : Aide", "Write the column: Help", "Escribe la columna: Ayuda"), answer: lstr("la pharmacie", "the pharmacy", "la farmacia") },
      { id: "ws1-5", target: "la opción", prompt: lstr("Écris la colonne : Changement", "Write the column: Change", "Escribe la columna: Cambio"), answer: lstr("l'option", "the option", "la opción") },
      { id: "ws1-6", target: "la confirmación", prompt: lstr("Écris la colonne : Preuve", "Write the column: Proof", "Escribe la columna: Prueba"), answer: lstr("la confirmation", "the confirmation", "la confirmación") },
      { id: "ws1-7", target: "el clima", prompt: lstr("Écris la colonne : Changement", "Write the column: Change", "Escribe la columna: Cambio"), answer: lstr("la météo", "the weather", "el clima") },
      { id: "ws1-8", target: "el guía", prompt: lstr("Écris la colonne : Aide", "Write the column: Help", "Escribe la columna: Ayuda"), answer: lstr("le guide", "the guide", "el guía") },
    ],
  },
  {
    id: "ws-fill-blank",
    kind: "fill_blank",
    title: lstr(
      "Feuille 2 · Phrases à compléter — situations imprévues",
      "Worksheet 2 · Fill in the blanks — unexpected situations",
      "Hoja 2 · Completar frases — situaciones imprevistas",
    ),
    instructions: lstr(
      "Complète chaque phrase avec le mot espagnol qui manque.",
      "Complete each sentence with the missing Spanish word.",
      "Completa cada frase con la palabra que falta.",
    ),
    items: [
      { id: "ws2-1", target: "Perdí mi ____.", prompt: lstr("Téléphone, passeport, ou valise ?", "Phone, passport, or suitcase?", "¿Teléfono, pasaporte o maleta?"), answer: lstr("Perdí mi teléfono. (ou pasaporte / maleta)", "Perdí mi teléfono. (or pasaporte / maleta)", "Perdí mi teléfono. (o pasaporte / maleta)") },
      { id: "ws2-2", target: "No encuentro mi ____.", prompt: lstr("Je ne trouve pas ma valise.", "I can't find my suitcase.", "No encuentro mi maleta."), answer: lstr("No encuentro mi maleta.", "No encuentro mi maleta.", "No encuentro mi maleta.") },
      { id: "ws2-3", target: "Mi reservación no ____.", prompt: lstr("Verbe au présent (3e personne).", "Verb in present (3rd person).", "Verbo en presente (3ª persona)."), answer: lstr("Mi reservación no aparece.", "Mi reservación no aparece.", "Mi reservación no aparece.") },
      { id: "ws2-4", target: "¿Puede hablar más ____?", prompt: lstr("Pour ralentir l'autre.", "To slow the other person down.", "Para que el otro hable más lento."), answer: lstr("¿Puede hablar más despacio?", "¿Puede hablar más despacio?", "¿Puede hablar más despacio?") },
      { id: "ws2-5", target: "¿Hay otra ____?", prompt: lstr("Quand le plan change.", "When the plan changes.", "Cuando el plan cambia."), answer: lstr("¿Hay otra opción?", "¿Hay otra opción?", "¿Hay otra opción?") },
      { id: "ws2-6", target: "Le escribo porque tengo un ____.", prompt: lstr("Ouvre un message au hôtel.", "Opens a message to the hotel.", "Abre un mensaje al hotel."), answer: lstr("Le escribo porque tengo un problema.", "Le escribo porque tengo un problema.", "Le escribo porque tengo un problema.") },
      { id: "ws2-7", target: "¿Dónde hay una ____?", prompt: lstr("Pour acheter quelque chose en cas de petit besoin.", "To buy something for a small need.", "Para comprar algo en caso de una pequeña necesidad."), answer: lstr("¿Dónde hay una farmacia?", "¿Dónde hay una farmacia?", "¿Dónde hay una farmacia?") },
    ],
  },
  {
    id: "ws-past-tense",
    kind: "past_tense",
    title: lstr(
      "Feuille 3 · Pratique du passé — raconter ce qui s'est passé",
      "Worksheet 3 · Past-tense practice — tell what happened",
      "Hoja 3 · Práctica del pasado — contar lo que pasó",
    ),
    instructions: lstr(
      "Choisis la forme correcte au passé (régulier ou irrégulier de haute fréquence) pour compléter chaque phrase.",
      "Pick the correct past form (regular or high-frequency irregular) to complete each sentence.",
      "Elige la forma correcta en pasado (regular o irregular frecuente) para completar cada frase.",
    ),
    items: [
      { id: "ws3-1", target: "Ayer ____ a la Zona Colonial.", prompt: lstr("Verbe « ir » au passé, 1re personne.", "\"ir\" in past, first person.", "«ir» en pasado, primera persona."), answer: lstr("Ayer fui a la Zona Colonial.", "Ayer fui a la Zona Colonial.", "Ayer fui a la Zona Colonial.") },
      { id: "ws3-2", target: "____ una experiencia increíble.", prompt: lstr("Verbe « ser » au passé, 3e personne.", "\"ser\" in past, third person.", "«ser» en pasado, tercera persona."), answer: lstr("Fue una experiencia increíble.", "Fue una experiencia increíble.", "Fue una experiencia increíble.") },
      { id: "ws3-3", target: "____ mi teléfono en el taxi.", prompt: lstr("Verbe « perder » au passé, 1re personne.", "\"perder\" in past, first person.", "«perder» en pasado, primera persona."), answer: lstr("Perdí mi teléfono en el taxi.", "Perdí mi teléfono en el taxi.", "Perdí mi teléfono en el taxi.") },
      { id: "ws3-4", target: "____ tarde al hotel.", prompt: lstr("Verbe « llegar » au passé, 1re personne.", "\"llegar\" in past, first person.", "«llegar» en pasado, primera persona."), answer: lstr("Llegué tarde al hotel.", "Llegué tarde al hotel.", "Llegué tarde al hotel.") },
      { id: "ws3-5", target: "Me ____ mucho la música.", prompt: lstr("Verbe « gustar » au passé.", "\"gustar\" in past.", "«gustar» en pasado."), answer: lstr("Me gustó mucho la música.", "Me gustó mucho la música.", "Me gustó mucho la música.") },
      { id: "ws3-6", target: "Présent → passé : « visito el museo ». Réécris au passé.", prompt: lstr("Transformation présent → passé.", "Present → past transformation.", "Transformación presente → pasado."), answer: lstr("Visité el museo.", "Visité el museo.", "Visité el museo.") },
      { id: "ws3-7", target: "Présent → passé : « tomo una guagua ». Réécris au passé.", prompt: lstr("Transformation présent → passé.", "Present → past transformation.", "Transformación presente → pasado."), answer: lstr("Tomé una guagua.", "Tomé una guagua.", "Tomé una guagua.") },
      { id: "ws3-8", target: "Présent → passé : « compro un recuerdo ». Réécris au passé.", prompt: lstr("Transformation présent → passé.", "Present → past transformation.", "Transformación presente → pasado."), answer: lstr("Compré un recuerdo.", "Compré un recuerdo.", "Compré un recuerdo.") },
    ],
  },
  {
    id: "ws-connectors",
    kind: "connectors",
    title: lstr(
      "Feuille 4 · Connecteurs et séquence — raconter une journée",
      "Worksheet 4 · Connectors and sequencing — telling a day",
      "Hoja 4 · Conectores y secuencia — contar un día",
    ),
    instructions: lstr(
      "Remets l'histoire dans l'ordre, puis complète le paragraphe avec : primero, después, luego, al final, porque, entonces.",
      "Reorder the story, then complete the paragraph with: primero, después, luego, al final, porque, entonces.",
      "Reordena la historia y completa el párrafo con: primero, después, luego, al final, porque, entonces.",
    ),
    items: [
      { id: "ws4-1", target: "____ fui a la Zona Colonial.", prompt: lstr("Action initiale (early in the day).", "Initial action (early in the day).", "Acción inicial del día."), answer: lstr("Primero fui a la Zona Colonial.", "Primero fui a la Zona Colonial.", "Primero fui a la Zona Colonial.") },
      { id: "ws4-2", target: "____ visité la catedral.", prompt: lstr("Action suivante.", "Next action.", "Acción siguiente."), answer: lstr("Después visité la catedral.", "Después visité la catedral.", "Después visité la catedral.") },
      { id: "ws4-3", target: "____ caminé hasta el malecón.", prompt: lstr("Encore après.", "Even later.", "Más tarde."), answer: lstr("Luego caminé hasta el malecón.", "Luego caminé hasta el malecón.", "Luego caminé hasta el malecón.") },
      { id: "ws4-4", target: "____ tomé un taxi al hotel.", prompt: lstr("Pour conclure la journée.", "To wrap up the day.", "Para cerrar el día."), answer: lstr("Al final tomé un taxi al hotel.", "Al final tomé un taxi al hotel.", "Al final tomé un taxi al hotel.") },
      { id: "ws4-5", target: "Cambiamos la excursión ____ llovía mucho.", prompt: lstr("Connecteur de cause.", "Cause connector.", "Conector de causa."), answer: lstr("Cambiamos la excursión porque llovía mucho.", "Cambiamos la excursión porque llovía mucho.", "Cambiamos la excursión porque llovía mucho.") },
      { id: "ws4-6", target: "El taxi no llegó, ____ tomé una guagua.", prompt: lstr("Connecteur de conséquence.", "Consequence connector.", "Conector de consecuencia."), answer: lstr("El taxi no llegó, entonces tomé una guagua.", "El taxi no llegó, entonces tomé una guagua.", "El taxi no llegó, entonces tomé una guagua.") },
    ],
  },
  {
    id: "ws-reading",
    kind: "reading",
    title: lstr(
      "Feuille 5 · Compréhension écrite — un jour à Santo Domingo",
      "Worksheet 5 · Reading comprehension — a day in Santo Domingo",
      "Hoja 5 · Comprensión escrita — un día en Santo Domingo",
    ),
    instructions: lstr(
      "Relis « Un día con cambios en Santo Domingo » dans la section Lectures et réponds aux questions ci-dessous. Puis note 4 mots de vocabulaire que tu retiens.",
      "Reread \"Un día con cambios en Santo Domingo\" in the Readings section and answer the questions below. Then note 4 vocabulary words you remember.",
      "Relee «Un día con cambios en Santo Domingo» en la sección de Lecturas y responde las preguntas. Luego anota 4 palabras de vocabulario.",
    ),
    items: [
      { id: "ws5-1", prompt: lstr("Où est allé le voyageur en premier ?", "Where did the traveler go first?", "¿Adónde fue primero?"), answer: lstr("À la Zona Colonial.", "To the Zona Colonial.", "A la Zona Colonial.") },
      { id: "ws5-2", prompt: lstr("Que s'est-il passé à onze heures ?", "What happened at eleven?", "¿Qué pasó a las once?"), answer: lstr("Il a commencé à pleuvoir.", "It started to rain.", "Empezó a llover.") },
      { id: "ws5-3", prompt: lstr("Qu'a-t-il acheté comme souvenir ?", "What souvenir did he buy?", "¿Qué recuerdo compró?"), answer: lstr("Un petit objet en larimar.", "A small larimar souvenir.", "Un pequeño recuerdo de larimar.") },
      { id: "ws5-4", prompt: lstr("Pourquoi a-t-il demandé au guide de parler plus lentement ?", "Why did he ask the guide to speak more slowly?", "¿Por qué pidió al guía hablar más despacio?"), answer: lstr("Parce qu'elle parlait trop vite.", "Because she spoke too fast.", "Porque hablaba muy rápido.") },
      { id: "ws5-5", prompt: lstr("Quelle phrase résume la fin du texte ?", "Which sentence sums up the ending?", "¿Qué frase resume el final?"), answer: lstr("Un jour avec des changements et des découvertes.", "A day with changes and discoveries.", "Un día con cambios y descubrimientos.") },
      { id: "ws5-6", prompt: lstr("Note 4 mots de vocabulaire que tu retiens.", "Write down 4 vocabulary words you remember.", "Anota 4 palabras de vocabulario que recuerdas."), answer: lstr("Exemples : calles de piedra, regresar, amable, descubrimientos.", "Examples: calles de piedra, regresar, amable, descubrimientos.", "Ejemplos: calles de piedra, regresar, amable, descubrimientos.") },
    ],
  },
  {
    id: "ws-writing",
    kind: "writing",
    title: lstr(
      "Feuille 6 · Tâche d'écriture — message poli (40-70 mots)",
      "Worksheet 6 · Writing task — polite message (40-70 words)",
      "Hoja 6 · Tarea escrita — mensaje amable (40-70 palabras)",
    ),
    instructions: lstr(
      "Écris un message de 40 à 70 mots à l'hôtel, au guide ou à un service local. Utilise le scaffold (salutation → problème → preuve → demande → clôture). Compte tes mots à la fin.",
      "Write a 40-70 word message to the hotel, the guide, or a local service. Use the scaffold (greeting → problem → proof → request → closing). Count your words at the end.",
      "Escribe un mensaje de 40 a 70 palabras al hotel, al guía o a un servicio local. Usa la estructura (saludo → problema → prueba → solicitud → cierre). Cuenta tus palabras al final.",
    ),
    items: [
      { id: "ws6-1", prompt: lstr("Salutation polie.", "Polite greeting.", "Saludo amable."), answer: lstr("Buenas tardes. / Estimado equipo.", "Buenas tardes. / Estimado equipo.", "Buenas tardes. / Estimado equipo.") },
      { id: "ws6-2", prompt: lstr("Phrase d'ouverture.", "Opening sentence.", "Frase de apertura."), answer: lstr("Le escribo porque tengo un problema.", "Le escribo porque tengo un problema.", "Le escribo porque tengo un problema.") },
      { id: "ws6-3", prompt: lstr("Problème (1 phrase, au passé si possible).", "Problem (1 sentence, past tense if possible).", "Problema (1 frase, en pasado si es posible)."), answer: lstr("Mi reservación no aparece. / Perdí mi teléfono.", "Mi reservación no aparece. / Perdí mi teléfono.", "Mi reservación no aparece. / Perdí mi teléfono.") },
      { id: "ws6-4", prompt: lstr("Preuve / contexte court.", "Proof / short context.", "Prueba / contexto corto."), answer: lstr("Tengo la confirmación. / Creo que lo dejé en el taxi.", "Tengo la confirmación. / Creo que lo dejé en el taxi.", "Tengo la confirmación. / Creo que lo dejé en el taxi.") },
      { id: "ws6-5", prompt: lstr("Demande polie.", "Polite request.", "Solicitud amable."), answer: lstr("¿Puede ayudarme, por favor?", "¿Puede ayudarme, por favor?", "¿Puede ayudarme, por favor?") },
      { id: "ws6-6", prompt: lstr("Clôture.", "Closing.", "Cierre."), answer: lstr("Muchas gracias por su ayuda. Quedo pendiente.", "Muchas gracias por su ayuda. Quedo pendiente.", "Muchas gracias por su ayuda. Quedo pendiente.") },
      { id: "ws6-7", prompt: lstr("Compte des mots (40-70).", "Word count (40-70).", "Cuenta de palabras (40-70)."), answer: lstr("Vise entre 40 et 70 mots espagnols.", "Aim for 40 to 70 Spanish words.", "Apunta a entre 40 y 70 palabras en español.") },
    ],
  },
  {
    id: "ws-final-workbook",
    kind: "final_workbook",
    title: lstr(
      "Feuille 7 · Cahier final A2 — mission complète",
      "Worksheet 7 · Final A2 workbook — full mission",
      "Hoja 7 · Cuaderno final A2 — misión completa",
    ),
    instructions: lstr(
      "Cahier final : un roleplay, un mini-journal de voyage, une réflexion culturelle et la check-list d'auto-évaluation A2.",
      "Final workbook: a roleplay, a mini travel journal, a cultural reflection, and the A2 self-assessment checklist.",
      "Cuaderno final: un roleplay, un mini diario de viaje, una reflexión cultural y la lista de autoevaluación A2.",
    ),
    items: [
      { id: "ws7-1", prompt: lstr("Roleplay : tu joues le voyageur, un partenaire joue la réception. Réservation introuvable.", "Roleplay: you play the traveler, a partner plays reception. Missing reservation.", "Roleplay: tú haces de viajero, otra persona de recepción. Reservación que no aparece."), answer: lstr("Salue → expose le problème → présente la confirmation → propose une option → remercie.", "Greet → state the problem → show confirmation → propose an option → thank.", "Saluda → expón el problema → muestra la confirmación → propón una opción → agradece.") },
      { id: "ws7-2", prompt: lstr("Mini journal de voyage (3 à 5 phrases au passé).", "Mini travel journal (3-5 sentences in the past).", "Mini diario de viaje (3 a 5 frases en pasado)."), answer: lstr("Modèle : Ayer fui a… Caminé… Compré… Me gustó… Fue increíble.", "Model: Ayer fui a… Caminé… Compré… Me gustó… Fue increíble.", "Modelo: Ayer fui a… Caminé… Compré… Me gustó… Fue increíble.") },
      { id: "ws7-3", prompt: lstr("Réflexion culturelle : 2 choses dominicaines que tu retiens.", "Cultural reflection: 2 Dominican things you remember.", "Reflexión cultural: 2 cosas dominicanas que recuerdas."), answer: lstr("Exemples : merengue/bachata, Zona Colonial, Los Haitises, larimar, café, cacao, taïno.", "Examples: merengue/bachata, Zona Colonial, Los Haitises, larimar, coffee, cacao, Taíno.", "Ejemplos: merengue/bachata, Zona Colonial, Los Haitises, larimar, café, cacao, taíno.") },
      { id: "ws7-4", prompt: lstr("Auto-évaluation A2 (coche les compétences acquises).", "A2 self-assessment (tick the skills you have).", "Autoevaluación A2 (marca lo que ya puedes hacer)."), answer: lstr("Compréhension écrite, compréhension orale, expression écrite et interaction orale.", "Reading, listening, writing, oral interaction.", "Comprensión escrita, comprensión oral, expresión escrita e interacción oral.") },
      { id: "ws7-5", prompt: lstr("Phrase de clôture personnelle.", "Personal closing sentence.", "Frase personal de cierre."), answer: lstr("Modèle : Fue una experiencia increíble. Aprendí mucho y quiero volver.", "Model: Fue una experiencia increíble. Aprendí mucho y quiero volver.", "Modelo: Fue una experiencia increíble. Aprendí mucho y quiero volver.") },
    ],
  },
];

// ─── Final A2 self-assessment checklist (7 statements) ──────────────────

const selfAssessment: Dom5SelfAssessmentItem[] = [
  {
    id: "sa-read-msg",
    statement: lstr(
      "Je peux comprendre un court message pratique.",
      "I can understand a short practical message.",
      "Puedo entender un mensaje corto y práctico.",
    ),
  },
  {
    id: "sa-ask-help",
    statement: lstr(
      "Je peux demander de l'aide.",
      "I can ask for help.",
      "Puedo pedir ayuda.",
    ),
  },
  {
    id: "sa-explain-problem",
    statement: lstr(
      "Je peux expliquer un problème simple.",
      "I can explain a simple problem.",
      "Puedo explicar un problema sencillo.",
    ),
  },
  {
    id: "sa-tell-yesterday",
    statement: lstr(
      "Je peux raconter ce que j'ai fait hier.",
      "I can talk about what I did yesterday.",
      "Puedo contar lo que hice ayer.",
    ),
  },
  {
    id: "sa-write-message",
    statement: lstr(
      "Je peux écrire un court message poli.",
      "I can write a short polite message.",
      "Puedo escribir un mensaje corto y amable.",
    ),
  },
  {
    id: "sa-ask-repeat",
    statement: lstr(
      "Je peux demander de répéter ou d'écrire.",
      "I can ask someone to repeat or write it down.",
      "Puedo pedir que repitan o lo escriban.",
    ),
  },
  {
    id: "sa-recognize-culture",
    statement: lstr(
      "Je peux reconnaître quelques références culturelles dominicaines.",
      "I can recognize a few Dominican cultural references.",
      "Puedo reconocer algunas referencias culturales dominicanas.",
    ),
  },
];

// ─── Aggregate export ───────────────────────────────────────────────────

export const dominicanRepublicA2Capstone: DominicanRepublicA2CapstoneData = {
  moduleId: "yopratiqo-do-module-5",
  moduleLabel: lstr("Module 5", "Module 5", "Módulo 5"),
  heroTitle: lstr(
    "Imprévus, conversations rapides et mission finale A2",
    "Unexpected situations, fast conversations, and final A2 mission",
    "Imprevistos, conversaciones rápidas y misión final A2",
  ),
  heroSubtitle: lstr(
    "Résous les petits problèmes de voyage, comprends mieux l'espagnol dominicain et termine ton parcours avec une mission complète.",
    "Handle small travel problems, understand Dominican Spanish better, and complete your final mission.",
    "Resuelve pequeños problemas de viaje, entiende mejor el español dominicano y completa tu misión final.",
  ),
  productLabel: lstr(
    "YoPratiqo · capstone A2 voyage",
    "YoPratiqo · A2 travel capstone",
    "YoPratiqo · capstone A2 de viaje",
  ),
  audioBrowserNoteShort: lstr(
    "Audio de pratique",
    "Practice audio",
    "Audio de práctica",
  ),
  audioBrowserNoteLong: lstr(
    "Audio de pratique intégré au navigateur. La voix peut varier selon l'appareil.",
    "Practice audio uses your browser voice. Voice quality may vary by device.",
    "El audio de práctica usa la voz del navegador. La calidad puede variar según el dispositivo.",
  ),
  printButtonLabel: lstr(
    "Imprimer le cahier A2",
    "Print A2 workbook",
    "Imprimir cuaderno A2",
  ),
  capstoneCompletionMessage: lstr(
    "Entraîne-toi à expliquer un imprévu, demander des précisions et raconter une étape de ton voyage.",
    "Practise explaining an unexpected problem, asking for clarification, and telling someone about part of your trip.",
    "Practica cómo explicar un imprevisto, pedir aclaraciones y contar una parte de tu viaje.",
  ),
  seriesCompletionTitle: lstr(
    "Fais le point sur ton parcours",
    "Review your learning journey",
    "Repasa tu recorrido",
  ),
  seriesCompletionBody: lstr(
    "Le parcours couvre cinq étapes : premières phrases, arrivée, repas, sorties et imprévus. Repère ce que tu peux faire sans aide, revois ce qui reste difficile, puis pratique une conversation avec un professeur Pratiqo.",
    "The course covers five stages: first phrases, arrival, meals, outings, and unexpected problems. Identify what you can do without help, revisit what still feels difficult, then practise a conversation with a Pratiqo teacher.",
    "El curso recorre cinco etapas: primeras frases, llegada, comidas, salidas e imprevistos. Identifica lo que puedes hacer sin ayuda, repasa lo que todavía te cuesta y practica una conversación con un profesor de Pratiqo.",
  ),
  missionStops,
  skillDashboard,
  phraseBank,
  fastSpeechSection: {
    title: lstr(
      "Comprendre quand ça va vite",
      "Understand fast Spanish",
      "Entender cuando hablan rápido",
    ),
    intro: lstr(
      "Pas besoin de tout comprendre. Repère les mots-clés, demande qu'on répète, demande qu'on écrive et utilise le contexte pour deviner.",
      "You don't need to catch every word. Spot the keywords, ask for a repeat, ask for a written note, and use context to guess.",
      "No necesitas captar cada palabra. Identifica las palabras clave, pide que repitan, pide que lo escriban y apóyate en el contexto.",
    ),
    cards: fastSpeechCards,
    pairs: fastSpeechPairs,
  },
  dialogues,
  readingTexts,
  writingTasks,
  roleplayCards,
  grammarCards,
  flashcards,
  quizQuestions,
  finalGame: {
    title: lstr(
      "Mission finale A2 — Sauver ton dernier jour en République dominicaine",
      "Final A2 mission — Save your last day in the Dominican Republic",
      "Misión final A2 — Salva tu último día en República Dominicana",
    ),
    subtitle: lstr(
      "Onze épreuves A2 : imprévus, fast speech, écriture polie et culture dominicaine.",
      "Eleven A2 challenges: unexpected events, fast speech, polite writing, and Dominican culture.",
      "Once retos A2: imprevistos, español rápido, escritura amable y cultura dominicana.",
    ),
    successMessage: lstr(
      "Mission terminée ! Consulte ton score, revois les réponses difficiles, puis rejoue une situation à voix haute.",
      "Mission complete! Check your score, review difficult answers, then practise one situation aloud.",
      "¡Misión terminada! Consulta tu puntuación, repasa las respuestas difíciles y practica una situación en voz alta.",
    ),
    rounds: finalGameRounds,
  },
  printableSheets,
  selfAssessment,
};








