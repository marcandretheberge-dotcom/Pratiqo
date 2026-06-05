/**
 * YoPratiqo — Dominican Republic Spanish · Module 2
 * À l'hôtel et à l'aéroport / At the Hotel and Airport
 *
 * Hardcoded MVP content for Phase 1. First full premium module for the
 * Dominican Republic Spanish path. Quality template for future modules.
 *
 * Bilingual contract: every UI string carries FR + EN via lstr(fr, en).
 * Spanish target phrases stay as plain strings rendered with lang="es".
 * No Supabase, no Stripe, no payment math, no audio files.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

// ─── Local content types ───────────────────────────────────────────────────

/** A Spanish survival phrase with bilingual pedagogy. */
export interface Dom2Phrase {
  id: string;
  /** Spanish phrase — plain string, rendered with lang="es". */
  target: string;
  translationFr: string;
  translationEn: string;
  usageFr: string;
  usageEn: string;
  noteFr?: string;
  noteEn?: string;
}

/** A single spoken line in a dialogue. */
export interface Dom2DialogueLine {
  speaker: YoLocalizedString;
  /** True when the learner is the speaker (right-aligned bubble). */
  isLearner?: boolean;
  target: string;
  glossFr: string;
  glossEn: string;
  noteFr?: string;
  noteEn?: string;
}

/** A full dialogue scenario. */
export interface Dom2Dialogue {
  id: string;
  title: YoLocalizedString;
  scenario: YoLocalizedString;
  lines: Dom2DialogueLine[];
}

/** A grammar pattern card. */
export interface Dom2GrammarCard {
  id: string;
  pattern: string;
  patternExplainFr: string;
  patternExplainEn: string;
  examples: Array<{ spanish: string; glossFr: string; glossEn: string }>;
}

/** A flashcard — Spanish front, bilingual back. */
export interface Dom2Flashcard {
  id: string;
  front: string;
  backFr: string;
  backEn: string;
  hintFr?: string;
  hintEn?: string;
  tag?: YoLocalizedString;
}

/** A multiple-choice practice question. */
export interface Dom2PracticeQuestion {
  id: string;
  promptFr: string;
  promptEn: string;
  options: Array<{
    id: string;
    target: string;
    glossFr: string;
    glossEn: string;
  }>;
  correctOptionId: string;
  explanationFr: string;
  explanationEn: string;
}

/** One step in the final mini-mission. */
export interface Dom2MiniMissionStep {
  id: string;
  taskFr: string;
  taskEn: string;
  targetPhrase: string;
  confirmFr: string;
  confirmEn: string;
}

/** A card in the mission map. */
export interface Dom2MissionStep {
  id: string;
  position: number;
  title: YoLocalizedString;
  description: YoLocalizedString;
}

/** A "you can now do this" bullet in the completion card. */
export interface Dom2CanDo {
  id: string;
  descriptionFr: string;
  descriptionEn: string;
}

/** Full module 2 data aggregate. */
export interface DominicanRepublicHotelAirportData {
  moduleId: string;
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  productLabel: YoLocalizedString;
  dominicaNote: YoLocalizedString;
  missionMap: Dom2MissionStep[];
  corePhrases: Dom2Phrase[];
  airportDialogue: Dom2Dialogue;
  hotelDialogue: Dom2Dialogue;
  grammarCards: Dom2GrammarCard[];
  flashcards: Dom2Flashcard[];
  practiceQuestions: Dom2PracticeQuestion[];
  miniMission: {
    title: YoLocalizedString;
    scenario: YoLocalizedString;
    steps: Dom2MiniMissionStep[];
  };
  completion: {
    title: YoLocalizedString;
    canDo: Dom2CanDo[];
    nextModuleTitle: YoLocalizedString;
    nextModuleTeaser: YoLocalizedString;
  };
}

// ─── Content ───────────────────────────────────────────────────────────────

const missionMap: Dom2MissionStep[] = [
  {
    id: "step_arrival",
    position: 1,
    title: lstr("Arrivée à l'aéroport", "Arrival at the airport"),
    description: lstr(
      "Tu atterris à Las Américas. Tu dois sortir et trouver ton chemin.",
      "You land at Las Américas. You need to get out and find your way.",
    ),
  },
  {
    id: "step_direction",
    position: 2,
    title: lstr("Direction et transport", "Directions and transport"),
    description: lstr(
      "Où prendre un taxi ? Comment indiquer ton hôtel au chauffeur ?",
      "Where to get a taxi? How to tell the driver your hotel?",
    ),
  },
  {
    id: "step_checkin",
    position: 3,
    title: lstr("Check-in à l'hôtel", "Hotel check-in"),
    description: lstr(
      "Tu arrives à la réception. Tu as une réservation. Parle comme un pro.",
      "You arrive at the front desk. You have a reservation. Speak like a pro.",
    ),
  },
  {
    id: "step_questions",
    position: 4,
    title: lstr("Questions utiles", "Useful questions"),
    description: lstr(
      "Wifi, heure de départ, petit-déjeuner — les infos clés de tout séjour.",
      "Wi-Fi, checkout time, breakfast — the key info for every stay.",
    ),
  },
  {
    id: "step_problem",
    position: 5,
    title: lstr("Petit problème à régler", "Handling a small problem"),
    description: lstr(
      "La clé ne fonctionne pas. Pas d'eau chaude. Demander de l'aide calmement.",
      "The key doesn't work. No hot water. Ask for help calmly.",
    ),
  },
  {
    id: "step_mission",
    position: 6,
    title: lstr("Mini-mission finale", "Final mini-mission"),
    description: lstr(
      "Mets tout en pratique : aéroport → taxi → hôtel → wifi. C'est parti !",
      "Put it all together: airport → taxi → hotel → Wi-Fi. Let's go!",
    ),
  },
];

const corePhrases: Dom2Phrase[] = [
  {
    id: "phrase_hello",
    target: "Hola, buenos días.",
    translationFr: "Bonjour / Bonjour du matin.",
    translationEn: "Hello / Good morning.",
    usageFr: "Toujours commencer par une salutation — ça ouvre les portes.",
    usageEn: "Always start with a greeting — it opens doors.",
  },
  {
    id: "phrase_exit",
    target: "¿Dónde está la salida?",
    translationFr: "Où est la sortie ?",
    translationEn: "Where is the exit?",
    usageFr: "À l'aéroport, après la douane et la récupération des bagages.",
    usageEn: "At the airport, after customs and baggage claim.",
  },
  {
    id: "phrase_taxi",
    target: "¿Dónde puedo tomar un taxi?",
    translationFr: "Où puis-je prendre un taxi ?",
    translationEn: "Where can I take a taxi?",
    usageFr: "La phrase clé à l'aéroport. Simple, polie, efficace.",
    usageEn: "The key phrase at the airport. Simple, polite, effective.",
    noteFr:
      "En R.D., les taxis officiels sont généralement à la sortie principale. On dit aussi « motoconcho » pour les motos-taxis, mais c'est plus avancé.",
    noteEn:
      "In the D.R., official taxis are typically at the main exit. \"Motoconcho\" (motorcycle taxi) is also common but more advanced.",
  },
  {
    id: "phrase_hotel",
    target: "Voy a este hotel.",
    translationFr: "Je vais à cet hôtel.",
    translationEn: "I'm going to this hotel.",
    usageFr: "Montre le nom sur ton téléphone si tu n'arrives pas à le prononcer.",
    usageEn: "Show the name on your phone if you can't pronounce it.",
  },
  {
    id: "phrase_reservation",
    target: "Tengo una reservación.",
    translationFr: "J'ai une réservation.",
    translationEn: "I have a reservation.",
    usageFr: "La première phrase au comptoir de l'hôtel.",
    usageEn: "The first phrase at the hotel front desk.",
  },
  {
    id: "phrase_name",
    target: "La reservación está a nombre de...",
    translationFr: "La réservation est au nom de...",
    translationEn: "The reservation is under the name of...",
    usageFr: "Complète avec ton nom de famille. « A nombre de [nom]. »",
    usageEn: "Complete with your last name. \"A nombre de [name].\"",
  },
  {
    id: "phrase_checkin",
    target: "¿Puedo hacer el check-in?",
    translationFr: "Puis-je faire le check-in ?",
    translationEn: "Can I check in?",
    usageFr: "Quand tu arrives tôt et la chambre n'est peut-être pas prête.",
    usageEn: "When you arrive early and the room may not be ready yet.",
  },
  {
    id: "phrase_checkout",
    target: "¿A qué hora es el check-out?",
    translationFr: "À quelle heure est le check-out ?",
    translationEn: "What time is checkout?",
    usageFr: "Demande à l'arrivée pour planifier ta dernière journée.",
    usageEn: "Ask at check-in to plan your last day.",
  },
  {
    id: "phrase_wifi",
    target: "¿Cuál es la contraseña del wifi?",
    translationFr: "Quel est le mot de passe du wifi ?",
    translationEn: "What is the Wi-Fi password?",
    usageFr: "La question la plus posée dans tous les hôtels du monde.",
    usageEn: "The most asked question in every hotel worldwide.",
    noteFr:
      "« Contraseña » = mot de passe. Le wifi des hôtels dominicains est généralement gratuit.",
    noteEn:
      "\"Contraseña\" = password. Hotel Wi-Fi in the D.R. is usually included.",
  },
  {
    id: "phrase_breakfast",
    target: "¿Hay desayuno incluido?",
    translationFr: "Le petit-déjeuner est-il inclus ?",
    translationEn: "Is breakfast included?",
    usageFr: "Très pratique pour les forfaits tout-inclus ou les petits hôtels.",
    usageEn: "Very useful for all-inclusive packages or small hotels.",
  },
  {
    id: "phrase_help",
    target: "Necesito ayuda, por favor.",
    translationFr: "J'ai besoin d'aide, s'il vous plaît.",
    translationEn: "I need help, please.",
    usageFr: "À utiliser calmement. Le personnel est habitué aux touristes.",
    usageEn: "Use this calmly. Hotel staff are used to tourists.",
  },
  {
    id: "phrase_key",
    target: "La llave no funciona.",
    translationFr: "La clé ne fonctionne pas.",
    translationEn: "The key doesn't work.",
    usageFr: "Arrive souvent avec les clés magnétiques des hôtels modernes.",
    usageEn: "Happens often with magnetic key cards in modern hotels.",
  },
  {
    id: "phrase_water",
    target: "No tengo agua caliente.",
    translationFr: "Je n'ai pas d'eau chaude.",
    translationEn: "I don't have hot water.",
    usageFr: "Simple et direct. « No tengo » = je n'ai pas.",
    usageEn: "Simple and direct. \"No tengo\" = I don't have.",
  },
  {
    id: "phrase_repeat",
    target: "¿Me puede repetir, por favor?",
    translationFr: "Pouvez-vous répéter, s'il vous plaît ?",
    translationEn: "Can you repeat that, please?",
    usageFr:
      "L'espagnol dominicain peut être rapide et musical. N'hésite pas à demander.",
    usageEn:
      "Dominican Spanish can be fast and musical. Don't hesitate to ask.",
    noteFr:
      "Tu peux aussi dire « ¿Puede hablar más despacio? » (Pouvez-vous parler plus lentement ?).",
    noteEn:
      "You can also say \"¿Puede hablar más despacio?\" (Can you speak more slowly?).",
  },
  {
    id: "phrase_thanks",
    target: "Gracias, muy amable.",
    translationFr: "Merci, c'est très aimable.",
    translationEn: "Thank you, very kind of you.",
    usageFr: "Une des formules les plus appréciées en Amérique latine.",
    usageEn: "One of the most appreciated phrases in Latin America.",
  },
];

const airportDialogue: Dom2Dialogue = {
  id: "dialogue_airport",
  title: lstr("À l'aéroport Las Américas", "At Las Américas Airport"),
  scenario: lstr(
    "Tu viens d'atterrir à Santo Domingo. Tu cherches un taxi pour rejoindre ton hôtel.",
    "You just landed in Santo Domingo. You're looking for a taxi to get to your hotel.",
  ),
  lines: [
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Hola, buenos días. ¿Dónde puedo tomar un taxi?",
      glossFr: "Bonjour. Où puis-je prendre un taxi ?",
      glossEn: "Hello. Where can I take a taxi?",
    },
    {
      speaker: lstr("Employé", "Employee"),
      target: "Los taxis están afuera, a la derecha.",
      glossFr: "Les taxis sont à l'extérieur, à droite.",
      glossEn: "Taxis are outside, to the right.",
      noteFr: "« afuera » = à l'extérieur · « a la derecha » = à droite",
      noteEn: "\"afuera\" = outside · \"a la derecha\" = to the right",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Perfecto, gracias. Voy a este hotel.",
      glossFr: "Parfait, merci. Je vais à cet hôtel.",
      glossEn: "Perfect, thank you. I'm going to this hotel.",
      noteFr: "Montre le nom de l'hôtel sur ton téléphone en disant « este hotel ».",
      noteEn: "Show the hotel name on your phone while saying \"este hotel.\"",
    },
    {
      speaker: lstr("Employé", "Employee"),
      target: "Muy bien. Puede salir por esa puerta.",
      glossFr: "Très bien. Vous pouvez sortir par cette porte.",
      glossEn: "Very well. You can exit through that door.",
      noteFr: "« esa puerta » = cette porte-là",
      noteEn: "\"esa puerta\" = that door over there",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Gracias, muy amable.",
      glossFr: "Merci, c'est très aimable.",
      glossEn: "Thank you, very kind of you.",
    },
  ],
};

const hotelDialogue: Dom2Dialogue = {
  id: "dialogue_hotel",
  title: lstr("Check-in à l'hôtel", "Hotel Check-in"),
  scenario: lstr(
    "Tu arrives à la réception de ton hôtel à Santo Domingo ou Punta Cana.",
    "You arrive at the front desk of your hotel in Santo Domingo or Punta Cana.",
  ),
  lines: [
    {
      speaker: lstr("Réceptionniste", "Receptionist"),
      target: "Buenas tardes. Bienvenido.",
      glossFr: "Bonsoir. Bienvenue.",
      glossEn: "Good afternoon. Welcome.",
      noteFr: "« Bienvenido » pour un homme, « Bienvenida » pour une femme.",
      noteEn: "\"Bienvenido\" for a man, \"Bienvenida\" for a woman.",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Buenas tardes. Tengo una reservación.",
      glossFr: "Bonsoir. J'ai une réservation.",
      glossEn: "Good afternoon. I have a reservation.",
    },
    {
      speaker: lstr("Réceptionniste", "Receptionist"),
      target: "¿A nombre de quién?",
      glossFr: "À quel nom ?",
      glossEn: "Under what name?",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "A nombre de [votre nom].",
      glossFr: "Au nom de [ton nom].",
      glossEn: "Under the name [your name].",
      noteFr: "Remplace [votre nom] par ton nom de famille.",
      noteEn: "Replace [votre nom] with your last name.",
    },
    {
      speaker: lstr("Réceptionniste", "Receptionist"),
      target: "Perfecto. ¿Tiene su pasaporte?",
      glossFr: "Parfait. Avez-vous votre passeport ?",
      glossEn: "Perfect. Do you have your passport?",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Sí, aquí está.",
      glossFr: "Oui, le voici.",
      glossEn: "Yes, here it is.",
    },
    {
      speaker: lstr("Réceptionniste", "Receptionist"),
      target: "Su habitación es la 204.",
      glossFr: "Votre chambre est la 204.",
      glossEn: "Your room is 204.",
    },
    {
      speaker: lstr("Toi — Viajero", "You — Traveler"),
      isLearner: true,
      target: "Gracias. ¿Cuál es la contraseña del wifi?",
      glossFr: "Merci. Quel est le mot de passe du wifi ?",
      glossEn: "Thank you. What is the Wi-Fi password?",
    },
  ],
};

const grammarCards: Dom2GrammarCard[] = [
  {
    id: "grammar_tengo",
    pattern: "Tengo + [nom]",
    patternExplainFr: "J'ai + [quelque chose] — pour affirmer ce que tu possèdes ou as sur toi.",
    patternExplainEn: "I have + [something] — to state what you have or are carrying.",
    examples: [
      { spanish: "Tengo una reservación.", glossFr: "J'ai une réservation.", glossEn: "I have a reservation." },
      { spanish: "Tengo mi pasaporte.", glossFr: "J'ai mon passeport.", glossEn: "I have my passport." },
      { spanish: "Tengo hambre.", glossFr: "J'ai faim.", glossEn: "I'm hungry." },
    ],
  },
  {
    id: "grammar_necesito",
    pattern: "Necesito + [nom / infinitif]",
    patternExplainFr: "J'ai besoin de + [quelque chose ou faire quelque chose].",
    patternExplainEn: "I need + [something or to do something].",
    examples: [
      { spanish: "Necesito ayuda.", glossFr: "J'ai besoin d'aide.", glossEn: "I need help." },
      { spanish: "Necesito una llave.", glossFr: "J'ai besoin d'une clé.", glossEn: "I need a key." },
      { spanish: "Necesito llamar a alguien.", glossFr: "Je dois appeler quelqu'un.", glossEn: "I need to call someone." },
    ],
  },
  {
    id: "grammar_donde",
    pattern: "¿Dónde está...?",
    patternExplainFr: "Où est... ? — pour demander la localisation de quelque chose.",
    patternExplainEn: "Where is...? — to ask where something is located.",
    examples: [
      { spanish: "¿Dónde está la salida?", glossFr: "Où est la sortie ?", glossEn: "Where is the exit?" },
      { spanish: "¿Dónde está el ascensor?", glossFr: "Où est l'ascenseur ?", glossEn: "Where is the elevator?" },
      { spanish: "¿Dónde está la recepción?", glossFr: "Où est la réception ?", glossEn: "Where is the front desk?" },
    ],
  },
  {
    id: "grammar_hora",
    pattern: "¿A qué hora...?",
    patternExplainFr: "À quelle heure... ? — pour demander un horaire.",
    patternExplainEn: "At what time...? — to ask about a schedule or time.",
    examples: [
      { spanish: "¿A qué hora es el check-out?", glossFr: "À quelle heure est le check-out ?", glossEn: "What time is checkout?" },
      { spanish: "¿A qué hora sirven el desayuno?", glossFr: "À quelle heure servez-vous le petit-déjeuner ?", glossEn: "What time is breakfast served?" },
    ],
  },
  {
    id: "grammar_repetir",
    pattern: "¿Me puede repetir...?",
    patternExplainFr: "Pouvez-vous me répéter... ? — pour demander poliment de répéter ou ralentir.",
    patternExplainEn: "Can you repeat...? — to politely ask for repetition or slower speech.",
    examples: [
      { spanish: "¿Me puede repetir, por favor?", glossFr: "Pouvez-vous répéter, s'il vous plaît ?", glossEn: "Can you repeat that, please?" },
      { spanish: "¿Me puede hablar más despacio?", glossFr: "Pouvez-vous parler plus lentement ?", glossEn: "Can you speak more slowly?" },
    ],
  },
];

const flashcards: Dom2Flashcard[] = [
  {
    id: "fc_salida",
    front: "la salida",
    backFr: "la sortie",
    backEn: "the exit",
    hintFr: "Cherche les panneaux verts à l'aéroport.",
    hintEn: "Look for the green signs at the airport.",
    tag: lstr("Aéroport", "Airport"),
  },
  {
    id: "fc_taxi",
    front: "el taxi",
    backFr: "le taxi",
    backEn: "the taxi",
    hintFr: "Prononciation similaire au français : tak-si.",
    hintEn: "Pronunciation similar: tak-see.",
    tag: lstr("Transport", "Transport"),
  },
  {
    id: "fc_reservacion",
    front: "la reservación",
    backFr: "la réservation",
    backEn: "the reservation",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_pasaporte",
    front: "el pasaporte",
    backFr: "le passeport",
    backEn: "the passport",
    hintFr: "Toujours l'avoir sur soi à l'hôtel.",
    hintEn: "Always have it with you at the hotel.",
    tag: lstr("Documents", "Documents"),
  },
  {
    id: "fc_habitacion",
    front: "la habitación",
    backFr: "la chambre",
    backEn: "the room",
    hintFr: "Racine latine : lieu d'habitation.",
    hintEn: "Root: place of habitation.",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_llave",
    front: "la llave",
    backFr: "la clé",
    backEn: "the key",
    hintFr: "Aussi utilisé pour « clé USB » (la llave USB).",
    hintEn: "Also used for \"USB key\" (la llave USB).",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_wifi",
    front: "la contraseña del wifi",
    backFr: "le mot de passe du wifi",
    backEn: "the Wi-Fi password",
    hintFr: "« Contraseña » = mot de passe.",
    hintEn: "\"Contraseña\" = password.",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_desayuno",
    front: "el desayuno",
    backFr: "le petit-déjeuner",
    backEn: "breakfast",
    hintFr: "Le desayuno dominicain inclut souvent mangú, œufs et fromage frit.",
    hintEn: "A Dominican breakfast often includes mangú, eggs, and fried cheese.",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_maleta",
    front: "la maleta",
    backFr: "la valise",
    backEn: "the suitcase",
    tag: lstr("Voyage", "Travel"),
  },
  {
    id: "fc_ascensor",
    front: "el ascensor",
    backFr: "l'ascenseur",
    backEn: "the elevator",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_recepcion",
    front: "la recepción",
    backFr: "la réception / le comptoir d'accueil",
    backEn: "the front desk / reception",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_agua",
    front: "agua caliente",
    backFr: "eau chaude",
    backEn: "hot water",
    hintFr: "« No tengo agua caliente. » = Je n'ai pas d'eau chaude.",
    hintEn: "\"No tengo agua caliente.\" = I don't have hot water.",
    tag: lstr("Hôtel", "Hotel"),
  },
  {
    id: "fc_ayuda",
    front: "ayuda",
    backFr: "aide / de l'aide",
    backEn: "help",
    hintFr: "Phrase : « Necesito ayuda. » = J'ai besoin d'aide.",
    hintEn: "Phrase: \"Necesito ayuda.\" = I need help.",
    tag: lstr("Utile", "Useful"),
  },
];

const practiceQuestions: Dom2PracticeQuestion[] = [
  {
    id: "pq_reservation",
    promptFr: "Comment dit-on « J'ai une réservation » en espagnol ?",
    promptEn: "How do you say \"I have a reservation\" in Spanish?",
    options: [
      { id: "pq1_a", target: "Necesito una reservación.", glossFr: "J'ai besoin d'une réservation.", glossEn: "I need a reservation." },
      { id: "pq1_b", target: "Tengo una reservación.", glossFr: "J'ai une réservation.", glossEn: "I have a reservation." },
      { id: "pq1_c", target: "¿Dónde está la reservación?", glossFr: "Où est la réservation ?", glossEn: "Where is the reservation?" },
    ],
    correctOptionId: "pq1_b",
    explanationFr: "« Tengo » vient du verbe « tener » (avoir). « Tengo una reservación » = J'ai une réservation.",
    explanationEn: "\"Tengo\" comes from the verb \"tener\" (to have). \"Tengo una reservación\" = I have a reservation.",
  },
  {
    id: "pq_wifi",
    promptFr: "Tu veux le mot de passe du wifi. Quelle phrase choisis-tu ?",
    promptEn: "You want the Wi-Fi password. Which phrase do you choose?",
    options: [
      { id: "pq2_a", target: "¿Hay desayuno incluido?", glossFr: "Le petit-déjeuner est-il inclus ?", glossEn: "Is breakfast included?" },
      { id: "pq2_b", target: "¿Cuál es la contraseña del wifi?", glossFr: "Quel est le mot de passe du wifi ?", glossEn: "What is the Wi-Fi password?" },
      { id: "pq2_c", target: "¿A qué hora es el check-out?", glossFr: "À quelle heure est le check-out ?", glossEn: "What time is checkout?" },
    ],
    correctOptionId: "pq2_b",
    explanationFr: "« Contraseña » = mot de passe. La phrase complète : ¿Cuál es la contraseña del wifi?",
    explanationEn: "\"Contraseña\" = password. The full phrase: ¿Cuál es la contraseña del wifi?",
  },
  {
    id: "pq_key",
    promptFr: "La clé de ta chambre ne fonctionne pas. Que dis-tu à la réception ?",
    promptEn: "Your room key doesn't work. What do you say at the front desk?",
    options: [
      { id: "pq3_a", target: "La llave no funciona.", glossFr: "La clé ne fonctionne pas.", glossEn: "The key doesn't work." },
      { id: "pq3_b", target: "No tengo agua caliente.", glossFr: "Je n'ai pas d'eau chaude.", glossEn: "I don't have hot water." },
      { id: "pq3_c", target: "Necesito un taxi.", glossFr: "J'ai besoin d'un taxi.", glossEn: "I need a taxi." },
    ],
    correctOptionId: "pq3_a",
    explanationFr: "« llave » = clé · « no funciona » = ne fonctionne pas. Phrase exacte : La llave no funciona.",
    explanationEn: "\"llave\" = key · \"no funciona\" = doesn't work. Exact phrase: La llave no funciona.",
  },
  {
    id: "pq_taxi",
    promptFr: "Tu arrives à l'aéroport et veux un taxi. Que demandes-tu ?",
    promptEn: "You arrive at the airport and want a taxi. What do you ask?",
    options: [
      { id: "pq4_a", target: "¿Dónde está la habitación?", glossFr: "Où est la chambre ?", glossEn: "Where is the room?" },
      { id: "pq4_b", target: "Tengo mi maleta.", glossFr: "J'ai ma valise.", glossEn: "I have my suitcase." },
      { id: "pq4_c", target: "¿Dónde puedo tomar un taxi?", glossFr: "Où puis-je prendre un taxi ?", glossEn: "Where can I take a taxi?" },
    ],
    correctOptionId: "pq4_c",
    explanationFr: "Question standard à l'aéroport : ¿Dónde puedo tomar un taxi?",
    explanationEn: "Standard airport question: ¿Dónde puedo tomar un taxi?",
  },
  {
    id: "pq_repeat",
    promptFr: "L'employé parle très vite et tu n'as pas compris. Que dis-tu ?",
    promptEn: "The employee speaks very fast and you didn't understand. What do you say?",
    options: [
      { id: "pq5_a", target: "Gracias, muy amable.", glossFr: "Merci, c'est très aimable.", glossEn: "Thank you, very kind." },
      { id: "pq5_b", target: "¿Me puede repetir, por favor?", glossFr: "Pouvez-vous répéter, s'il vous plaît ?", glossEn: "Can you repeat that, please?" },
      { id: "pq5_c", target: "Voy a este hotel.", glossFr: "Je vais à cet hôtel.", glossEn: "I'm going to this hotel." },
    ],
    correctOptionId: "pq5_b",
    explanationFr: "L'espagnol dominicain peut être rapide. « ¿Me puede repetir, por favor? » est essentiel.",
    explanationEn: "Dominican Spanish can be fast. \"¿Me puede repetir, por favor?\" is essential.",
  },
];

export const dominicanRepublicHotelAirport: DominicanRepublicHotelAirportData = {
  moduleId: "do_es_hotel_airport_m2",
  heroTitle: lstr(
    "À l'hôtel et à l'aéroport",
    "At the Hotel and Airport",
  ),
  heroSubtitle: lstr(
    "Arriver, s'orienter, s'enregistrer et régler les premiers détails sans paniquer.",
    "Arrive, find your way, check in, and handle the first travel moments with confidence.",
  ),
  productLabel: lstr(
    "YoPratiqo · Voyage · Module 2",
    "YoPratiqo · Travel · Module 2",
  ),
  dominicaNote: lstr(
    "L'espagnol dominicain peut être rapide et musical. Les Dominicains sont généralement chaleureux avec les voyageurs qui font l'effort de parler espagnol.",
    "Dominican Spanish can be fast and musical. Dominicans are generally warm toward travelers who make the effort to speak Spanish.",
  ),
  missionMap,
  corePhrases,
  airportDialogue,
  hotelDialogue,
  grammarCards,
  flashcards,
  practiceQuestions,
  miniMission: {
    title: lstr("Mission finale : Arrivée en R.D.", "Final Mission: Arriving in the D.R."),
    scenario: lstr(
      "Tu arrives en République dominicaine. Complète chaque étape en espagnol pour réussir ta mission.",
      "You're arriving in the Dominican Republic. Complete each step in Spanish to complete your mission.",
    ),
    steps: [
      {
        id: "mm_step1",
        taskFr: "Tu arrives à l'aéroport. Salue l'employé à l'information.",
        taskEn: "You arrive at the airport. Greet the information employee.",
        targetPhrase: "Hola, buenos días.",
        confirmFr: "Une salutation simple et chaleureuse — ça commence bien.",
        confirmEn: "A simple, warm greeting — great start.",
      },
      {
        id: "mm_step2",
        taskFr: "Demande à l'employé où prendre un taxi.",
        taskEn: "Ask the employee where to take a taxi.",
        targetPhrase: "¿Dónde puedo tomar un taxi?",
        confirmFr: "Tu trouves maintenant le taxi sans problème.",
        confirmEn: "You'll find the taxi with no trouble.",
      },
      {
        id: "mm_step3",
        taskFr: "Dans le taxi, indique ton hôtel au chauffeur.",
        taskEn: "In the taxi, tell the driver your hotel.",
        targetPhrase: "Voy a este hotel.",
        confirmFr: "Le chauffeur sait maintenant où t'amener.",
        confirmEn: "The driver knows where to take you.",
      },
      {
        id: "mm_step4",
        taskFr: "À la réception de l'hôtel, annonce que tu as une réservation.",
        taskEn: "At the hotel front desk, announce that you have a reservation.",
        targetPhrase: "Tengo una reservación.",
        confirmFr: "Le check-in commence. Tu gères parfaitement.",
        confirmEn: "Check-in is underway. You're handling it perfectly.",
      },
      {
        id: "mm_step5",
        taskFr: "Après le check-in, demande le mot de passe du wifi.",
        taskEn: "After check-in, ask for the Wi-Fi password.",
        targetPhrase: "¿Cuál es la contraseña del wifi?",
        confirmFr: "Tu es connecté. Mission en bonne voie.",
        confirmEn: "You're connected. Mission going well.",
      },
      {
        id: "mm_step6",
        taskFr: "Le soir, la clé magnétique ne fonctionne plus. Que dis-tu à la réception ?",
        taskEn: "In the evening, the key card stops working. What do you say at the front desk?",
        targetPhrase: "La llave no funciona.",
        confirmFr: "Mission accomplie ! Tu gères les imprévus comme un voyageur expérimenté.",
        confirmEn: "Mission complete! You're handling the unexpected like an experienced traveler.",
      },
    ],
  },
  completion: {
    title: lstr("Mission accomplie !", "Mission complete!"),
    canDo: [
      { id: "cd1", descriptionFr: "Arriver à l'aéroport et trouver un taxi", descriptionEn: "Arrive at the airport and find a taxi" },
      { id: "cd2", descriptionFr: "Indiquer ta destination au chauffeur de taxi", descriptionEn: "Tell the taxi driver your destination" },
      { id: "cd3", descriptionFr: "Faire le check-in à l'hôtel avec une réservation", descriptionEn: "Check in at the hotel with a reservation" },
      { id: "cd4", descriptionFr: "Demander le wifi, le check-out et le petit-déjeuner", descriptionEn: "Ask about Wi-Fi, checkout time, and breakfast" },
      { id: "cd5", descriptionFr: "Signaler un problème à la réception calmement", descriptionEn: "Report a problem at the front desk calmly" },
      { id: "cd6", descriptionFr: "Demander à quelqu'un de répéter quand l'espagnol va vite", descriptionEn: "Ask for repetition when Spanish goes too fast" },
    ],
    nextModuleTitle: lstr("Manger, commander et payer", "Eating, ordering, and paying"),
    nextModuleTeaser: lstr(
      "Module 3 — Apprends à commander au restaurant, lire un menu dominicain et payer comme un local.",
      "Module 3 — Learn to order at a restaurant, read a Dominican menu, and pay like a local.",
    ),
  },
};
