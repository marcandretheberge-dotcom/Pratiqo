/**
 * Listening and traveller roleplay for the existing Module 2 dialogues.
 * Canonical dialogue text remains in dominicanRepublicHotelAirport.ts.
 * The separate practice line is never included in the scene transcript.
 */
import {
  dominicanRepublicHotelAirport,
  type Dom2Dialogue,
} from "@/lib/yo/dominicanRepublicHotelAirport";
import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

export type ArrivalSceneId = "airport" | "hotel";

export interface ArrivalListeningLine {
  id: string;
  target: string;
  speechText: string;
  speaker: YoLocalizedString;
  isLearner: boolean;
  translation: YoLocalizedString;
  audioSrc: string;
}

export interface ArrivalListeningQuestion {
  id: string;
  prompt: YoLocalizedString;
  options: Array<{ id: string; target: string }>;
  correctOptionId: string;
  feedback: YoLocalizedString;
  replayLineId: string;
}

export interface ArrivalListeningRoleplay {
  id: string;
  promptLineIds: string[];
  instruction: YoLocalizedString;
  modelLineIds: string[];
}

export interface ArrivalListeningPhrase {
  id: string;
  target: string;
  translation: YoLocalizedString;
  audioSrc: string;
}

export interface ArrivalListeningScene {
  id: ArrivalSceneId;
  /** Enable only after every referenced recording is present and reviewed. */
  audioReady: boolean;
  title: YoLocalizedString;
  scenario: YoLocalizedString;
  goal: YoLocalizedString;
  lines: ArrivalListeningLine[];
  practiceLines: ArrivalListeningLine[];
  questions: ArrivalListeningQuestion[];
  roleplay: ArrivalListeningRoleplay[];
  phrases: ArrivalListeningPhrase[];
}

const AUDIO_ROOT = "/audio/yo/es/do/module-2/arrival-v1";

function dialogueLines(
  sceneId: ArrivalSceneId,
  dialogue: Dom2Dialogue,
): ArrivalListeningLine[] {
  return dialogue.lines.map((line, index) => {
    const id = `${sceneId}-${String(index + 1).padStart(2, "0")}`;
    return {
      id,
      target: line.target,
      speechText: id === "hotel-07"
        ? "Su habitación es la doscientos cuatro."
        : line.target,
      speaker: line.isLearner
        ? lstr("Voyageur", "Traveller", "Persona que viaja")
        : sceneId === "airport"
          ? lstr("Employé", "Employee", "Personal del aeropuerto")
          : lstr("Réception", "Receptionist", "Recepción"),
      isLearner: Boolean(line.isLearner),
      // Spanish learners already read the target language; the UI may omit
      // this identical gloss instead of falling back to a French translation.
      translation: lstr(line.glossFr, line.glossEn, line.target),
      audioSrc: `${AUDIO_ROOT}/${id}.mp3`,
    };
  });
}

const airportLines = dialogueLines(
  "airport", dominicanRepublicHotelAirport.airportDialogue,
);
const hotelLines = dialogueLines(
  "hotel", dominicanRepublicHotelAirport.hotelDialogue,
);
const repeatLine: ArrivalListeningLine = {
  id: "hotel-repeat",
  target: "¿Me puede repetir, por favor?",
  speechText: "¿Me puede repetir, por favor?",
  speaker: lstr("Voyageur", "Traveller", "Persona que viaja"),
  isLearner: true,
  translation: lstr(
    "Pouvez-vous répéter, s'il vous plaît ?",
    "Can you repeat that, please?",
    "¿Me puede repetir, por favor?",
  ),
  audioSrc: `${AUDIO_ROOT}/hotel-repeat.mp3`,
};

function phrase(line: ArrivalListeningLine): ArrivalListeningPhrase {
  return {
    id: `phrase-${line.id}`,
    target: line.target,
    translation: line.translation,
    audioSrc: line.audioSrc,
  };
}

export const arrivalListeningScenes: Record<ArrivalSceneId, ArrivalListeningScene> = {
  airport: {
    id: "airport",
    audioReady: false,
    title: lstr("Trouver un taxi", "Find a taxi", "Encontrar un taxi"),
    scenario: lstr(
      "Scène fictive à l'aéroport : tu cherches un taxi pour rejoindre ton hôtel.",
      "Fictional airport scene: you are looking for a taxi to reach your hotel.",
      "Escena ficticia en el aeropuerto: buscas un taxi para llegar al hotel.",
    ),
    goal: lstr(
      "Repérer une indication et demander où prendre un taxi.",
      "Catch a direction and ask where to find a taxi.",
      "Entender una indicación y preguntar dónde tomar un taxi.",
    ),
    lines: airportLines,
    practiceLines: [],
    questions: [
      {
        id: "arrival-taxi-direction",
        prompt: lstr(
          "Dans le dialogue, où sont les taxis ?",
          "In the dialogue, where are the taxis?",
          "En el diálogo, ¿dónde están los taxis?",
        ),
        options: [
          { id: "outside-right", target: "Afuera, a la derecha." },
          { id: "outside-left", target: "Afuera, a la izquierda." },
          { id: "inside-right", target: "Adentro, a la derecha." },
        ],
        correctOptionId: "outside-right",
        feedback: lstr(
          "L'employé dit : « Los taxis están afuera, a la derecha. » « Afuera » signifie « à l'extérieur » et « a la derecha », « à droite ».",
          "The employee says: “Los taxis están afuera, a la derecha.” “Afuera” means “outside” and “a la derecha” means “to the right”.",
          "La persona dice: « Los taxis están afuera, a la derecha. » Las dos pistas son « afuera » y « a la derecha ».",
        ),
        replayLineId: "airport-02",
      },
    ],
    roleplay: [
      {
        id: "roleplay-airport-taxi",
        promptLineIds: [],
        instruction: lstr(
          "Tu arrives au comptoir d'information le matin. Salue l'employé et demande où prendre un taxi.",
          "You reach the information desk in the morning. Greet the employee and ask where to find a taxi.",
          "Llegas al mostrador de información por la mañana. Saluda y pregunta dónde tomar un taxi.",
        ),
        modelLineIds: ["airport-01"],
      },
      {
        id: "roleplay-airport-hotel",
        promptLineIds: ["airport-02"],
        instruction: lstr(
          "Remercie l'employé et indique que tu vas à cet hôtel en montrant son nom.",
          "Thank the employee and say you are going to this hotel while showing its name.",
          "Da las gracias y di que vas a este hotel mientras muestras su nombre.",
        ),
        modelLineIds: ["airport-03"],
      },
      {
        id: "roleplay-airport-thanks",
        promptLineIds: ["airport-04"],
        instruction: lstr(
          "Remercie l'employé avant de partir.",
          "Thank the employee before you leave.",
          "Da las gracias antes de irte.",
        ),
        modelLineIds: ["airport-05"],
      },
    ],
    phrases: airportLines.filter((line) => line.isLearner).map(phrase),
  },
  hotel: {
    id: "hotel",
    audioReady: false,
    title: lstr("À la réception", "At the front desk", "En recepción"),
    scenario: lstr(
      "Scène fictive : tu arrives à l'hôtel dans l'après-midi. La réservation est au nom d'Alex Martín.",
      "Fictional scene: you arrive at the hotel in the afternoon. The reservation is under Alex Martín.",
      "Escena ficticia: llegas al hotel por la tarde. La reservación está a nombre de Alex Martín.",
    ),
    goal: lstr(
      "Confirmer une réservation, comprendre le numéro de chambre et demander de répéter.",
      "Confirm a reservation, catch the room number, and ask for repetition.",
      "Confirmar una reservación, entender el número de habitación y pedir que repitan.",
    ),
    lines: hotelLines,
    practiceLines: [repeatLine],
    questions: [
      {
        id: "arrival-requested-document",
        prompt: lstr(
          "Quel document demande-t-on à la réception ?",
          "Which document does the receptionist ask for?",
          "¿Qué documento piden en recepción?",
        ),
        options: [
          { id: "key", target: "La llave." },
          { id: "passport", target: "El pasaporte." },
          { id: "suitcase", target: "La maleta." },
        ],
        correctOptionId: "passport",
        feedback: lstr(
          "La question est : « ¿Tiene su pasaporte? » Le mot à repérer est « pasaporte » : le passeport.",
          "The question is: “¿Tiene su pasaporte?” Listen for “pasaporte”: passport.",
          "La pregunta es: « ¿Tiene su pasaporte? » La palabra clave es « pasaporte ».",
        ),
        replayLineId: "hotel-05",
      },
      {
        id: "arrival-room-number",
        prompt: lstr(
          "Quel est le numéro de la chambre dans le dialogue ?",
          "What is the room number in the dialogue?",
          "¿Cuál es el número de la habitación en el diálogo?",
        ),
        options: [
          { id: "room-240", target: "240" },
          { id: "room-204", target: "204" },
          { id: "room-214", target: "214" },
        ],
        correctOptionId: "room-204",
        feedback: lstr(
          "Tu entends « doscientos cuatro » : 204. Réécoute le numéro, puis répète-le à voix haute.",
          "You hear “doscientos cuatro”: 204. Listen to the number again, then say it aloud.",
          "Escuchas « doscientos cuatro »: 204. Vuelve a escuchar el número y repítelo en voz alta.",
        ),
        replayLineId: "hotel-07",
      },
    ],
    roleplay: [
      {
        id: "roleplay-hotel-reservation",
        promptLineIds: ["hotel-01"],
        instruction: lstr(
          "Salue la réception et annonce ta réservation.",
          "Greet the receptionist and say you have a reservation.",
          "Saluda y di que tienes una reservación.",
        ),
        modelLineIds: ["hotel-02"],
      },
      {
        id: "roleplay-hotel-name",
        promptLineIds: ["hotel-03"],
        instruction: lstr(
          "Donne le nom de la réservation. Pour pratiquer, tu peux remplacer Alex Martín par le nom de ton choix.",
          "Give the name on the reservation. When practising, you can replace Alex Martín with a name of your choice.",
          "Di el nombre de la reservación. Para practicar, puedes sustituir Alex Martín por el nombre que prefieras.",
        ),
        modelLineIds: ["hotel-04"],
      },
      {
        id: "roleplay-hotel-passport",
        promptLineIds: ["hotel-05"],
        instruction: lstr(
          "Réponds oui et présente ton passeport.",
          "Say yes and hand over your passport.",
          "Responde que sí y presenta tu pasaporte.",
        ),
        modelLineIds: ["hotel-06"],
      },
      {
        id: "roleplay-hotel-repeat",
        promptLineIds: ["hotel-07"],
        instruction: lstr(
          "Tu n'as pas compris le numéro. Demande de répéter.",
          "You missed the number. Ask the receptionist to repeat it.",
          "No entendiste el número. Pide que lo repitan.",
        ),
        modelLineIds: ["hotel-repeat"],
      },
      {
        id: "roleplay-hotel-wifi",
        promptLineIds: ["hotel-07"],
        instruction: lstr(
          "Cette fois, tu as compris le numéro. Remercie la réception et demande le mot de passe du wifi.",
          "This time you caught the number. Thank the receptionist and ask for the Wi-Fi password.",
          "Esta vez entendiste el número. Da las gracias y pregunta por la contraseña del wifi.",
        ),
        modelLineIds: ["hotel-08"],
      },
    ],
    phrases: [...hotelLines.filter((line) => line.isLearner), repeatLine].map(phrase),
  },
};
