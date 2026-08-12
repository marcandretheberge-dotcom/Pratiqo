/**
 * Original YoPratiqo instructional content.
 *
 * Pedagogical architecture informed by general CEFR/ACTFL-style
 * communicative and action-oriented principles, retrieval practice,
 * scaffolded exercise progression, and multi-source language-teaching
 * methodology research.
 *
 * No commercial textbook text, exercises, layouts, dialogues, or
 * distinctive exercise sequences are reproduced.
 *
 * ── V1.1 architecture notes ────────────────────────────────────────
 *
 * 1. Choices are a discriminated union. A plain `string` choice is a
 *    Spanish target alternative and renders with `lang="es"`. A
 *    `YoLocalizedString` choice is learner-interface scaffolding
 *    (a meaning, a function label) and renders in the learner's own
 *    locale. This removes the V1 bug where French-only option strings
 *    were shown to EN/ES learners.
 *
 * 2. Answers live on the item that asks the question, and pages 19-20
 *    are *derived* from those items. Dangling or duplicated answer
 *    references are therefore structurally impossible rather than
 *    merely tested for. `answerRef` labels are generated per page so
 *    a paper learner can look up "6.3" without hunting.
 *
 * 3. Response counts are derived from real items, never declared by
 *    hand. An item only counts as a learner action when it reserves
 *    writing space (`responseLines >= 1`). Can-Do lists and
 *    self-check checklists use `responseLines: 0` and count as zero.
 */

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type RdM2WorkbookMechanic =
  | "diagnostic-retrieval"
  | "contextual-input"
  | "noticing"
  | "controlled-form"
  | "fill-blank"
  | "retrieval-ladder"
  | "conversation-building"
  | "sequence"
  | "translation"
  | "matching"
  | "choice"
  | "listening-simulation"
  | "digital-listening"
  | "dictation"
  | "shadowing"
  | "sociolinguistic-awareness"
  | "error-correction"
  | "register-choice"
  | "reading"
  | "writing"
  | "guided-writing"
  | "speaking-prep"
  | "transfer-task"
  | "cumulative-retrieval"
  | "performance-check"
  | "self-assessment"
  | "answer-key";

export type RdM2WorkbookPageKind =
  | "cover"
  | "diagnostic"
  | "scenario"
  | "language-detective"
  | "controlled-practice"
  | "retrieval"
  | "conversation"
  | "taxi-lab"
  | "hotel-checkin"
  | "hotel-problems"
  | "listening-lab"
  | "dominican-awareness"
  | "reading"
  | "writing"
  | "speaking"
  | "cumulative"
  | "performance-check"
  | "answer-key"
  | "model-responses";

export type RdM2WorkbookActivityKind =
  | "mission"
  | "can-do"
  | "diagnostic"
  | "scenario"
  | "notice"
  | "awareness"
  | "match"
  | "fill-blank"
  | "choice"
  | "sequence"
  | "dialogue-build"
  | "translation"
  | "error-correction"
  | "listening"
  | "reading"
  | "writing"
  | "checklist"
  | "speaking"
  | "assessment"
  | "reflection"
  | "answer-key"
  | "model-response";

/**
 * A single selectable option.
 *
 *   - `string`            → Spanish target alternative. Rendered `lang="es"`.
 *   - `YoLocalizedString` → learner-interface scaffolding (a meaning or a
 *                           function label). Rendered in the learner locale.
 */
export type RdM2WorkbookChoice = string | YoLocalizedString;

/**
 * How the learner finds out whether they succeeded.
 *
 *   - `objective` → one correct answer, printed on page 19.
 *   - `model`     → open production, a possible response on page 20.
 *   - `self`      → no correct answer; the activity carries the
 *                   self-assessment guidance the learner uses instead.
 */
export type RdM2WorkbookAnswerKind = "objective" | "model" | "self";

export interface RdM2WorkbookItem {
  id: string;
  prompt: YoLocalizedString;
  /** Spanish reference line shown above the response space. */
  target?: string;
  choices?: readonly RdM2WorkbookChoice[];
  /** 0 = recognition/checklist row with no writing space and no response count. */
  responseLines?: number;
  /** Generated per page — never authored by hand. */
  answerRef?: string;
  answerKind?: RdM2WorkbookAnswerKind;
  /** Spanish answer (objective) or possible response (model). */
  answer?: string;
  /** Localized answer for meaning/gist questions, or an acceptance note. */
  answerNote?: YoLocalizedString;
}

export interface RdM2WorkbookActivity {
  id: string;
  kind: RdM2WorkbookActivityKind;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  targetLanguage?: "es";
  inputTitle?: YoLocalizedString;
  inputLines?: readonly string[];
  /** Ordered procedure the learner follows before answering. */
  steps?: readonly YoLocalizedString[];
  /** In-app path printed so a paper learner can reach the digital screen. */
  digitalPath?: string;
  notes?: readonly YoLocalizedString[];
  items?: readonly RdM2WorkbookItem[];
  /** Pages 19-20 render derived answer material instead of authored items. */
  answerKeySection?: "objective" | "model";
}

export interface RdM2WorkbookPage {
  id: string;
  pageNumber: number;
  kind: RdM2WorkbookPageKind;
  title: YoLocalizedString;
  purpose: YoLocalizedString;
  mechanics: readonly RdM2WorkbookMechanic[];
  supportLevel: "guided" | "reduced" | "independent" | "solutions";
  activities: readonly RdM2WorkbookActivity[];
}

export interface RdM2Workbook {
  id: string;
  moduleId: "dominican-republic-module-2";
  resourceId: "rd-m2-arrival-kit";
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
  targetLanguage: "es";
  learnerLocales: readonly ["fr", "en", "es"];
  pages: readonly RdM2WorkbookPage[];
}

// ─── Authoring helpers ─────────────────────────────────────────────
//
// Every helper forces an explicit `answerKind`, which is what makes the
// answer-key integrity guarantee mechanical instead of aspirational.

type AuthoredItem = Omit<RdM2WorkbookItem, "answerRef">;

/** Objective item with one Spanish answer. */
const ask = (
  id: string,
  prompt: YoLocalizedString,
  answer: string,
  responseLines = 1,
  choices?: readonly RdM2WorkbookChoice[],
): AuthoredItem => ({ id, prompt, responseLines, answerKind: "objective", answer, ...(choices ? { choices } : {}) });

/** Objective item whose answer is a meaning, expressed in the learner's locale. */
const askMeaning = (
  id: string,
  prompt: YoLocalizedString,
  answerNote: YoLocalizedString,
  choices?: readonly RdM2WorkbookChoice[],
  responseLines = 1,
): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "objective",
  answerNote,
  ...(choices ? { choices } : {}),
});

/** Sequencing item: the learner writes the position of a Spanish line. */
const ordered = (id: string, spanish: string, position: number): AuthoredItem => ({
  id,
  prompt: lstr("Numéro :", "Number:", "Número:"),
  target: spanish,
  responseLines: 1,
  answerKind: "objective",
  answerNote: lstr(`Ordre ${position}`, `Order ${position}`, `Orden ${position}`),
});

/** Open production with a possible response on page 20. */
const open = (
  id: string,
  prompt: YoLocalizedString,
  answer: string,
  responseLines = 2,
): AuthoredItem => ({ id, prompt, responseLines, answerKind: "model", answer });

/** Personal / self-rated item. The parent activity must carry guidance notes. */
const own = (id: string, prompt: YoLocalizedString, responseLines = 2): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "self",
});

/** Recognition or checklist row: no writing space, no response count. */
const tick = (id: string, prompt: YoLocalizedString): AuthoredItem => ({
  id,
  prompt,
  responseLines: 0,
});

// ─── Shared scaffolding ────────────────────────────────────────────

/**
 * Capability descriptors, not raw confidence numbers. A learner who
 * writes "2" on page 2 and "3" on page 20 has measured something
 * concrete; "3 out of 5" measures mood.
 */
const CAPABILITY_SCALE = lstr(
  "Échelle : 0 = aucune idée · 1 = je reconnais quand je l'entends ou le lis · 2 = je peux le produire avec mes notes · 3 = je peux le produire sans aide.",
  "Scale: 0 = no idea · 1 = I recognize it when I hear or read it · 2 = I can produce it with my notes · 3 = I can produce it without help.",
  "Escala: 0 = ninguna idea · 1 = lo reconozco cuando lo oigo o lo leo · 2 = puedo producirlo con mis notas · 3 = puedo producirlo sin ayuda.",
);

const MODULE_2_DIGITAL_PATH =
  "/yo/langues/espagnol/pays/republique-dominicaine/module-2";

/** The eight Module 2 outcomes. Page 1 states them, pages 2 and 20 measure them. */
const CAN_DO_OUTCOMES: readonly { id: string; label: YoLocalizedString }[] = [
  {
    id: "where",
    label: lstr(
      "Je peux demander où se trouve quelque chose.",
      "I can ask where something is.",
      "Puedo preguntar dónde está algo.",
    ),
  },
  {
    id: "transport",
    label: lstr(
      "Je peux trouver un transport en sortant de l'aéroport.",
      "I can find transportation on the way out of the airport.",
      "Puedo encontrar transporte al salir del aeropuerto.",
    ),
  },
  {
    id: "destination",
    label: lstr(
      "Je peux donner ma destination au chauffeur.",
      "I can give my destination to the driver.",
      "Puedo dar mi destino al conductor.",
    ),
  },
  {
    id: "price",
    label: lstr(
      "Je peux demander un prix simple.",
      "I can ask a simple price.",
      "Puedo preguntar un precio simple.",
    ),
  },
  {
    id: "checkin",
    label: lstr(
      "Je peux faire le check-in à l'hôtel.",
      "I can check in at the hotel.",
      "Puedo hacer el check-in en el hotel.",
    ),
  },
  {
    id: "info",
    label: lstr(
      "Je peux demander les informations clés : wifi, déjeuner, heure de départ.",
      "I can ask the key information: Wi-Fi, breakfast, checkout time.",
      "Puedo pedir la información clave: wifi, desayuno, hora de salida.",
    ),
  },
  {
    id: "problem",
    label: lstr(
      "Je peux signaler un petit problème avec calme.",
      "I can report a small problem calmly.",
      "Puedo reportar un problema pequeño con calma.",
    ),
  },
  {
    id: "repair",
    label: lstr(
      "Je peux demander qu'on répète ou qu'on parle plus lentement.",
      "I can ask someone to repeat or to speak more slowly.",
      "Puedo pedir que repitan o que hablen más despacio.",
    ),
  },
];

// ─── Pages ─────────────────────────────────────────────────────────

type AuthoredActivity = Omit<RdM2WorkbookActivity, "items"> & {
  items?: readonly AuthoredItem[];
};

type AuthoredPage = Omit<RdM2WorkbookPage, "activities"> & {
  activities: readonly AuthoredActivity[];
};

const authoredPages: readonly AuthoredPage[] = [
  // ── 1 ─────────────────────────────────────────────────────────────
  {
    id: "cover-mission",
    pageNumber: 1,
    kind: "cover",
    title: lstr("Mission du cahier", "Workbook mission", "Misión del cuaderno"),
    purpose: lstr(
      "Savoir exactement ce que tu dois pouvoir faire à la fin du module 2.",
      "Know exactly what you should be able to do by the end of Module 2.",
      "Saber exactamente qué deberías poder hacer al final del módulo 2.",
    ),
    mechanics: ["contextual-input"],
    supportLevel: "guided",
    activities: [
      {
        id: "cover-can-do",
        kind: "can-do",
        title: lstr("Les huit résultats du module 2", "The eight Module 2 outcomes", "Los ocho resultados del módulo 2"),
        instructions: lstr(
          "Lis la liste complète. Tu reviendras la mesurer à la page 2, puis à la page 20.",
          "Read the full list. You will measure it on page 2, then again on page 20.",
          "Lee la lista completa. La medirás en la página 2 y otra vez en la página 20.",
        ),
        items: CAN_DO_OUTCOMES.map((outcome) => tick(`can-do-${outcome.id}`, outcome.label)),
      },
      {
        id: "cover-priority",
        kind: "reflection",
        title: lstr("Ta priorité personnelle", "Your personal priority", "Tu prioridad personal"),
        instructions: lstr(
          "Choisis le résultat le plus urgent pour ton prochain voyage, puis dis où tu l'utiliseras.",
          "Choose the most urgent outcome for your next trip, then say where you will use it.",
          "Elige el resultado más urgente para tu próximo viaje y di dónde lo usarás.",
        ),
        notes: [
          lstr(
            "Il n'y a pas de bonne réponse ici. C'est ton contrat de travail avec toi-même.",
            "There is no right answer here. This is your working contract with yourself.",
            "Aquí no hay respuesta correcta. Es tu contrato de trabajo contigo.",
          ),
        ],
        items: [
          own(
            "priority-outcome",
            lstr("Le résultat le plus urgent pour moi :", "The most urgent outcome for me:", "El resultado más urgente para mí:"),
          ),
          own(
            "priority-situation",
            lstr(
              "La situation exacte où j'en aurai besoin :",
              "The exact situation where I will need it:",
              "La situación exacta donde lo necesitaré:",
            ),
          ),
        ],
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────
  {
    id: "diagnostic-retrieval",
    pageNumber: 2,
    kind: "diagnostic",
    title: lstr(
      "Avant de commencer : récupère ce que tu sais",
      "Before you start: retrieve what you know",
      "Antes de empezar: recupera lo que sabes",
    ),
    purpose: lstr(
      "Mesurer ton point de départ sans regarder les réponses.",
      "Measure your starting point without looking at answers.",
      "Medir tu punto de partida sin mirar respuestas.",
    ),
    mechanics: ["diagnostic-retrieval", "cumulative-retrieval", "self-assessment"],
    supportLevel: "guided",
    activities: [
      {
        id: "diagnostic-phrases",
        kind: "diagnostic",
        title: lstr("Écris ce que tu peux déjà produire", "Write what you can already produce", "Escribe lo que ya puedes producir"),
        instructions: lstr(
          "Donne une phrase espagnole possible pour chaque besoin. Une réponse courte suffit. Ne regarde pas les pages 19-20.",
          "Give one possible Spanish phrase for each need. A short answer is enough. Do not look at pages 19-20.",
          "Da una frase posible en español para cada necesidad. Una respuesta corta basta. No mires las páginas 19-20.",
        ),
        targetLanguage: "es",
        items: [
          open("diag-taxi", lstr("Demander où prendre un taxi.", "Ask where to take a taxi.", "Preguntar dónde tomar un taxi."), "¿Dónde puedo tomar un taxi?"),
          open("diag-hotel", lstr("Dire que tu vas à cet hôtel.", "Say you are going to this hotel.", "Decir que vas a este hotel."), "Voy a este hotel."),
          open("diag-reservation", lstr("Dire que tu as une réservation.", "Say you have a reservation.", "Decir que tienes una reservación."), "Tengo una reservación."),
          open("diag-wifi", lstr("Demander le mot de passe du wifi.", "Ask for the Wi-Fi password.", "Pedir la contraseña del wifi."), "¿Cuál es la contraseña del wifi?"),
          open("diag-repeat", lstr("Demander de répéter.", "Ask someone to repeat.", "Pedir que repitan."), "¿Me puede repetir, por favor?"),
          open("diag-thanks", lstr("Remercier poliment.", "Thank someone politely.", "Agradecer de forma amable."), "Gracias, muy amable."),
        ],
      },
      {
        id: "capability-check-before",
        kind: "reflection",
        title: lstr("Où tu en es maintenant", "Where you are right now", "Dónde estás ahora"),
        instructions: lstr(
          "Écris 0, 1, 2 ou 3 devant chaque résultat. Sois honnête : c'est ta mesure de départ.",
          "Write 0, 1, 2, or 3 next to each outcome. Be honest: this is your baseline.",
          "Escribe 0, 1, 2 o 3 junto a cada resultado. Sé honesto: es tu punto de partida.",
        ),
        notes: [CAPABILITY_SCALE],
        items: CAN_DO_OUTCOMES.map((outcome) => own(`before-${outcome.id}`, outcome.label, 1)),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────
  {
    id: "arrival-sdq-input",
    pageNumber: 3,
    kind: "scenario",
    title: lstr("Scénario 1 : arrivée à SDQ", "Scenario 1: arrival at SDQ", "Escenario 1: llegada a SDQ"),
    purpose: lstr(
      "Lire une scène courte, puis repérer les gestes utiles.",
      "Read a short scene, then spot the useful actions.",
      "Leer una escena breve y detectar las acciones útiles.",
    ),
    mechanics: ["contextual-input", "reading", "noticing"],
    supportLevel: "guided",
    activities: [
      {
        id: "arrival-dialogue",
        kind: "scenario",
        title: lstr("Entrée de scène", "Scene input", "Entrada de escena"),
        instructions: lstr(
          "Lis le mini-dialogue. Souligne les mots qui aident à te déplacer, puis réponds.",
          "Read the mini-dialogue. Underline the words that help you move around, then answer.",
          "Lee el mini-diálogo. Subraya las palabras que ayudan a moverte y responde.",
        ),
        targetLanguage: "es",
        inputTitle: lstr("À la sortie de l'aéroport", "At the airport exit", "A la salida del aeropuerto"),
        inputLines: [
          "Viajera: Buenas. Busco la salida para los taxis.",
          "Empleado: Siga derecho y luego a la izquierda.",
          "Viajera: Gracias. Voy al Hotel Coral, en Santo Domingo.",
          "Empleado: Muestre la dirección al conductor.",
        ],
        items: [
          ask("arrival-where", lstr("Écris le mot qui indique une sortie.", "Write the word that points to an exit.", "Escribe la palabra que indica una salida."), "la salida"),
          ask("arrival-direction", lstr("Écris les deux indications de direction.", "Write the two direction cues.", "Escribe las dos indicaciones de dirección."), "derecho · a la izquierda", 2),
          ask("arrival-hotel", lstr("Écris la phrase qui donne la destination.", "Write the phrase that gives the destination.", "Escribe la frase que da el destino."), "Voy al Hotel Coral, en Santo Domingo.", 2),
          ask("arrival-show", lstr("Que doit montrer la voyageuse au chauffeur ?", "What should the traveler show the driver?", "¿Qué debe mostrar la viajera al conductor?"), "la dirección"),
          ask("arrival-polite", lstr("Écris le mot de politesse utilisé dans la scène.", "Write the polite word used in the scene.", "Escribe la palabra de cortesía usada en la escena."), "Gracias"),
        ],
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────
  {
    id: "arrival-sdq-practice",
    pageNumber: 4,
    kind: "scenario",
    title: lstr(
      "Scénario 1 : produire sans modèle complet",
      "Scenario 1: produce without a full model",
      "Escenario 1: producir sin modelo completo",
    ),
    purpose: lstr(
      "Réutiliser la scène avec moins de soutien.",
      "Reuse the scene with less support.",
      "Reutilizar la escena con menos apoyo.",
    ),
    mechanics: ["controlled-form", "conversation-building", "cumulative-retrieval"],
    supportLevel: "reduced",
    activities: [
      {
        id: "arrival-rebuild",
        kind: "fill-blank",
        title: lstr("Complète les gestes", "Complete the actions", "Completa las acciones"),
        instructions: lstr(
          "Complète sans regarder la page précédente.",
          "Complete without looking at the previous page.",
          "Completa sin mirar la página anterior.",
        ),
        targetLanguage: "es",
        items: [
          ask("arrive-1", lstr("Buenas. Busco la salida para los ____.", "Buenas. Busco la salida para los ____.", "Buenas. Busco la salida para los ____."), "taxis"),
          ask("arrive-2", lstr("Voy ____ Hotel Coral.", "Voy ____ Hotel Coral.", "Voy ____ Hotel Coral."), "al"),
          ask("arrive-3", lstr("Muestre la dirección ____ conductor.", "Muestre la dirección ____ conductor.", "Muestre la dirección ____ conductor."), "al"),
        ],
      },
      {
        id: "arrival-transfer",
        kind: "translation",
        title: lstr("Transfert rapide", "Quick transfer", "Transferencia rápida"),
        instructions: lstr(
          "Écris une phrase espagnole pour chaque nouvelle situation.",
          "Write one Spanish phrase for each new situation.",
          "Escribe una frase en español para cada nueva situación.",
        ),
        targetLanguage: "es",
        items: [
          open("transfer-taxi", lstr("Tu cherches la zone des taxis.", "You are looking for the taxi area.", "Buscas la zona de taxis."), "¿Dónde está la salida para los taxis?"),
          open("transfer-hotel", lstr("Tu montes et tu donnes ta destination.", "You get in and give your destination.", "Subes y das tu destino."), "Buenas. Voy a este hotel."),
          open("transfer-politeness", lstr("Tu remercies la personne qui t'a aidé.", "You thank the person who helped you.", "Agradeces a la persona que te ayudó."), "Gracias, muy amable.", 1),
        ],
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────
  {
    id: "language-detective",
    pageNumber: 5,
    kind: "language-detective",
    title: lstr("Détective de langue", "Language detective", "Detective de lengua"),
    purpose: lstr(
      "Voir les petites pièces qui font fonctionner les phrases.",
      "Notice the small pieces that make the phrases work.",
      "Ver las piezas pequeñas que hacen funcionar las frases.",
    ),
    mechanics: ["noticing", "choice", "controlled-form"],
    supportLevel: "guided",
    activities: [
      {
        id: "detective-patterns",
        kind: "notice",
        title: lstr("Observe les patrons", "Observe the patterns", "Observa los patrones"),
        instructions: lstr(
          "Chaque patron sert à une chose précise. Entoure la bonne fonction.",
          "Each pattern does one precise job. Circle the right function.",
          "Cada patrón sirve para algo preciso. Encierra la función correcta.",
        ),
        targetLanguage: "es",
        items: [
          askMeaning(
            "patron-donde",
            lstr("¿Dónde puedo...?", "¿Dónde puedo...?", "¿Dónde puedo...?"),
            lstr("un lieu", "a place", "un lugar"),
            [
              lstr("un lieu", "a place", "un lugar"),
              lstr("une heure", "a time", "una hora"),
              lstr("un prix", "a price", "un precio"),
            ],
          ),
          askMeaning(
            "patron-tengo",
            lstr("Tengo una...", "Tengo una...", "Tengo una..."),
            lstr("posséder quelque chose", "having something", "tener algo"),
            [
              lstr("posséder quelque chose", "having something", "tener algo"),
              lstr("chercher un lieu", "looking for a place", "buscar un lugar"),
              lstr("remercier", "thanking", "agradecer"),
            ],
          ),
          askMeaning(
            "patron-cual",
            lstr("¿Cuál es...?", "¿Cuál es...?", "¿Cuál es...?"),
            lstr("identifier une information précise", "identifying one precise piece of information", "identificar una información precisa"),
            [
              lstr("identifier une information précise", "identifying one precise piece of information", "identificar una información precisa"),
              lstr("commander un plat", "ordering food", "pedir un plato"),
              lstr("refuser", "refusing", "rechazar"),
            ],
          ),
          askMeaning(
            "patron-puede",
            lstr("¿Me puede...?", "¿Me puede...?", "¿Me puede...?"),
            lstr("une demande polie", "a polite request", "un pedido amable"),
            [
              lstr("une demande polie", "a polite request", "un pedido amable"),
              lstr("un ordre direct", "a direct order", "una orden directa"),
              lstr("une salutation", "a greeting", "un saludo"),
            ],
          ),
        ],
      },
      {
        id: "detective-rewrite",
        kind: "fill-blank",
        title: lstr("Change une pièce", "Change one piece", "Cambia una pieza"),
        instructions: lstr(
          "Garde le patron, remplace seulement l'information demandée entre parenthèses.",
          "Keep the pattern, replace only the information asked for in brackets.",
          "Mantén el patrón, cambia solo la información entre paréntesis.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "rewrite-hotel",
            lstr(
              "Voy a este hotel. → Voy a este ____. (le restaurant)",
              "Voy a este hotel. → Voy a este ____. (the restaurant)",
              "Voy a este hotel. → Voy a este ____. (el restaurante)",
            ),
            "restaurante",
          ),
          ask(
            "rewrite-res",
            lstr(
              "Tengo una reservación. → ____ (dis que tu as ton passeport)",
              "Tengo una reservación. → ____ (say you have your passport)",
              "Tengo una reservación. → ____ (di que tienes tu pasaporte)",
            ),
            "Tengo mi pasaporte.",
          ),
        ],
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────
  {
    id: "controlled-forms",
    pageNumber: 6,
    kind: "controlled-practice",
    title: lstr("Pratique contrôlée", "Controlled form practice", "Práctica controlada"),
    purpose: lstr(
      "Automatiser les formes utiles avant de parler.",
      "Automate useful forms before speaking.",
      "Automatizar formas útiles antes de hablar.",
    ),
    mechanics: ["controlled-form", "fill-blank", "choice"],
    supportLevel: "guided",
    activities: [
      {
        id: "controlled-tengo",
        kind: "fill-blank",
        title: lstr("Tengo + nom", "Tengo + noun", "Tengo + sustantivo"),
        instructions: lstr("Complète chaque phrase.", "Complete each sentence.", "Completa cada frase."),
        targetLanguage: "es",
        notes: [
          lstr(
            "« reservación » est courant en République dominicaine. « reserva » se dit aussi et se comprend partout : les deux fonctionnent.",
            "\"reservación\" is common in the Dominican Republic. \"reserva\" is also used and understood everywhere: both work.",
            "«reservación» es común en República Dominicana. «reserva» también se usa y se entiende en todas partes: las dos sirven.",
          ),
        ],
        items: [
          ask("tengo-1", lstr("____ una reservación.", "____ una reservación.", "____ una reservación."), "Tengo"),
          ask("tengo-2", lstr("Tengo mi ____. (le document de voyage)", "Tengo mi ____. (the travel document)", "Tengo mi ____. (el documento de viaje)"), "pasaporte"),
          ask("tengo-3", lstr("No tengo agua ____.", "No tengo agua ____.", "No tengo agua ____."), "caliente"),
          ask("tengo-4", lstr("Tengo una ____ para dos noches.", "Tengo una ____ para dos noches.", "Tengo una ____ para dos noches."), "reservación"),
        ],
      },
      {
        id: "controlled-questions",
        kind: "fill-blank",
        title: lstr("Questions de service", "Service questions", "Preguntas de servicio"),
        instructions: lstr(
          "Complète avec un mot de la banque : dónde · cuál · hora · desayuno.",
          "Complete with one word from the bank: dónde · cuál · hora · desayuno.",
          "Completa con una palabra del banco: dónde · cuál · hora · desayuno.",
        ),
        targetLanguage: "es",
        items: [
          ask("q-1", lstr("¿____ puedo tomar un taxi?", "¿____ puedo tomar un taxi?", "¿____ puedo tomar un taxi?"), "Dónde"),
          ask("q-2", lstr("¿A qué ____ es el check-out?", "¿A qué ____ es el check-out?", "¿A qué ____ es el check-out?"), "hora"),
          ask("q-3", lstr("¿____ es la contraseña del wifi?", "¿____ es la contraseña del wifi?", "¿____ es la contraseña del wifi?"), "Cuál"),
          ask("q-4", lstr("¿Hay ____ incluido?", "¿Hay ____ incluido?", "¿Hay ____ incluido?"), "desayuno"),
        ],
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────
  {
    id: "vocabulary-ladder",
    pageNumber: 7,
    kind: "retrieval",
    title: lstr("Échelle de vocabulaire", "Vocabulary retrieval ladder", "Escalera de vocabulario"),
    purpose: lstr(
      "Passer de reconnaissance à production.",
      "Move from recognition to production.",
      "Pasar de reconocimiento a producción.",
    ),
    mechanics: ["retrieval-ladder", "matching", "cumulative-retrieval"],
    supportLevel: "reduced",
    activities: [
      {
        id: "ladder-match",
        kind: "match",
        title: lstr("Niveau 1 : associer", "Level 1: match", "Nivel 1: relacionar"),
        instructions: lstr("Entoure le sens correct de chaque mot espagnol.", "Circle the correct meaning of each Spanish word.", "Encierra el sentido correcto de cada palabra en español."),
        targetLanguage: "es",
        items: [
          askMeaning(
            "match-salida",
            lstr("salida", "salida", "salida"),
            lstr("la sortie", "the exit", "por donde sales"),
            [
              lstr("la sortie", "the exit", "por donde sales"),
              lstr("la clé", "the key", "lo que abre la puerta"),
              lstr("le passeport", "the passport", "el documento de viaje"),
            ],
          ),
          askMeaning(
            "match-llave",
            lstr("llave", "llave", "llave"),
            lstr("la clé", "the key", "lo que abre la puerta"),
            [
              lstr("la clé", "the key", "lo que abre la puerta"),
              lstr("le taxi", "the taxi", "el carro que te lleva"),
              lstr("le prix", "the price", "lo que cuesta"),
            ],
          ),
          askMeaning(
            "match-contrasena",
            lstr("contraseña", "contraseña", "contraseña"),
            lstr("le mot de passe", "the password", "la clave para conectarte"),
            [
              lstr("le mot de passe", "the password", "la clave para conectarte"),
              lstr("la chambre", "the room", "donde duermes"),
              lstr("le petit-déjeuner", "breakfast", "la comida de la mañana"),
            ],
          ),
          askMeaning(
            "match-despacio",
            lstr("despacio", "despacio", "despacio"),
            lstr("lentement", "slowly", "sin prisa"),
            [
              lstr("lentement", "slowly", "sin prisa"),
              lstr("vite", "fast", "con prisa"),
              lstr("dehors", "outside", "fuera del edificio"),
            ],
          ),
        ],
      },
      {
        id: "ladder-recall",
        kind: "translation",
        title: lstr("Niveau 2 : produire", "Level 2: produce", "Nivel 2: producir"),
        instructions: lstr(
          "Cache les choix ci-dessus et écris le mot espagnol de mémoire.",
          "Cover the choices above and write the Spanish word from memory.",
          "Cubre las opciones de arriba y escribe la palabra en español de memoria.",
        ),
        targetLanguage: "es",
        items: [
          ask("recall-exit", lstr("la sortie", "the exit", "por donde sales"), "la salida"),
          ask("recall-room", lstr("la chambre", "the room", "donde duermes"), "la habitación"),
          ask("recall-passport", lstr("le passeport", "the passport", "el documento de viaje"), "el pasaporte"),
          ask("recall-breakfast", lstr("le petit-déjeuner", "breakfast", "la comida de la mañana"), "el desayuno"),
          ask("recall-hotwater", lstr("l'eau chaude", "hot water", "el agua que sale caliente"), "el agua caliente"),
        ],
      },
      {
        id: "ladder-personalize",
        kind: "writing",
        title: lstr("Niveau 3 : personnaliser", "Level 3: personalize", "Nivel 3: personalizar"),
        instructions: lstr(
          "Écris trois choses que toi, tu devras vraiment demander dans un hôtel.",
          "Write three things you personally will really need to ask at a hotel.",
          "Escribe tres cosas que tú de verdad necesitarás pedir en un hotel.",
        ),
        targetLanguage: "es",
        notes: [
          lstr(
            "Aucune correction possible : ce sont tes besoins. Vérifie seulement que chaque phrase commence par ¿ et se termine par ?, ou qu'elle contient « por favor ».",
            "No answer key possible: these are your needs. Just check that each question opens with ¿ and closes with ?, or that it includes \"por favor\".",
            "No hay clave posible: son tus necesidades. Revisa solo que cada pregunta abra con ¿ y cierre con ?, o que incluya «por favor».",
          ),
        ],
        items: [
          own("personal-1", lstr("Demande 1", "Request 1", "Pedido 1")),
          own("personal-2", lstr("Demande 2", "Request 2", "Pedido 2")),
          own("personal-3", lstr("Demande 3", "Request 3", "Pedido 3")),
        ],
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────
  {
    id: "build-conversation",
    pageNumber: 8,
    kind: "conversation",
    title: lstr("Construire la conversation", "Build the conversation", "Construir la conversación"),
    purpose: lstr(
      "Assembler les répliques dans un ordre réaliste.",
      "Put the turns in a realistic order.",
      "Ordenar las intervenciones de forma realista.",
    ),
    mechanics: ["conversation-building", "sequence", "contextual-input"],
    supportLevel: "reduced",
    activities: [
      {
        id: "conversation-order",
        kind: "sequence",
        title: lstr("Ordre logique", "Logical order", "Orden lógico"),
        instructions: lstr(
          "Numérote les répliques de 1 à 6 pour reconstruire un check-in complet.",
          "Number the turns from 1 to 6 to rebuild a complete check-in.",
          "Numera las intervenciones del 1 al 6 para reconstruir un check-in completo.",
        ),
        targetLanguage: "es",
        items: [
          ordered("conv-1", "Gracias, muy amable.", 6),
          ordered("conv-2", "¿A nombre de quién?", 2),
          ordered("conv-3", "Buenas. Tengo una reservación.", 1),
          ordered("conv-4", "¿Cuál es la contraseña del wifi?", 5),
          ordered("conv-5", "A nombre de Tremblay.", 3),
          ordered("conv-6", "Perfecto. ¿Tiene su pasaporte?", 4),
        ],
      },
      {
        id: "conversation-gap",
        kind: "dialogue-build",
        title: lstr("Répare les trous", "Repair the gaps", "Repara los espacios"),
        instructions: lstr(
          "Écris la réplique manquante du voyageur.",
          "Write the traveler's missing turn.",
          "Escribe la intervención que falta del viajero.",
        ),
        targetLanguage: "es",
        items: [
          open("gap-reservation", lstr("Réception : Buenas. / Toi : ____", "Front desk: Buenas. / You: ____", "Recepción: Buenas. / Tú: ____"), "Buenas. Tengo una reservación."),
          open("gap-passport", lstr("Réception : ¿Tiene su pasaporte? / Toi : ____", "Front desk: ¿Tiene su pasaporte? / You: ____", "Recepción: ¿Tiene su pasaporte? / Tú: ____"), "Sí, aquí está."),
          open("gap-wifi", lstr("Tu as la clé. Tu demandes une dernière information : ____", "You have the key. You ask one last piece of information: ____", "Ya tienes la llave. Pides una última información: ____"), "¿Cuál es la contraseña del wifi?"),
        ],
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────
  {
    id: "taxi-lab",
    pageNumber: 9,
    kind: "taxi-lab",
    title: lstr("Laboratoire taxi", "Taxi lab", "Laboratorio taxi"),
    purpose: lstr(
      "Passer de destination à prix sans hésiter.",
      "Move from destination to price without hesitating.",
      "Pasar de destino a precio sin dudar.",
    ),
    mechanics: ["choice", "conversation-building", "speaking-prep"],
    supportLevel: "reduced",
    activities: [
      {
        id: "taxi-best-line",
        kind: "choice",
        title: lstr("Choisis la meilleure réplique", "Choose the best line", "Elige la mejor frase"),
        instructions: lstr(
          "Pour chaque moment, entoure la phrase la plus utile.",
          "For each moment, circle the most useful phrase.",
          "Para cada momento, encierra la frase más útil.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "taxi-start",
            lstr("Tu montres l'adresse au chauffeur.", "You show the address to the driver.", "Muestras la dirección al conductor."),
            "Voy a este hotel.",
            1,
            ["Voy a este hotel.", "No tengo agua caliente.", "¿Hay desayuno incluido?"],
          ),
          ask(
            "taxi-price",
            lstr("Tu veux connaître le prix avant de partir.", "You want to know the price before leaving.", "Quieres saber el precio antes de salir."),
            "¿Cuánto cuesta?",
            1,
            ["¿Cuánto cuesta?", "¿Cuál es la contraseña?", "¿Tiene mi pasaporte?"],
          ),
          ask(
            "taxi-slow",
            lstr("Le chauffeur parle trop vite.", "The driver speaks too fast.", "El conductor habla demasiado rápido."),
            "¿Puede hablar más despacio?",
            1,
            ["¿Puede hablar más despacio?", "Estoy en la habitación.", "No gracias."],
          ),
        ],
      },
      {
        id: "taxi-role-card",
        kind: "speaking",
        title: lstr("Carte de rôle", "Role card", "Tarjeta de rol"),
        instructions: lstr(
          "Prépare quatre phrases pour une course courte, puis dis-les à voix haute.",
          "Prepare four lines for a short ride, then say them out loud.",
          "Prepara cuatro frases para un viaje corto y dilas en voz alta.",
        ),
        targetLanguage: "es",
        items: [
          open("taxi-role-1", lstr("Saluer", "Greet", "Saludar"), "Buenas.", 1),
          open("taxi-role-2", lstr("Donner la destination", "Give the destination", "Dar el destino"), "Voy a este hotel.", 1),
          open("taxi-role-3", lstr("Demander le prix", "Ask the price", "Preguntar el precio"), "¿Cuánto cuesta?", 1),
          open("taxi-role-4", lstr("Remercier en descendant", "Thank the driver as you get out", "Agradecer al bajar"), "Gracias, muy amable.", 1),
        ],
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────
  {
    id: "hotel-checkin",
    pageNumber: 10,
    kind: "hotel-checkin",
    title: lstr("Check-in hôtel", "Hotel check-in", "Check-in en el hotel"),
    purpose: lstr(
      "Utiliser réservation, nom, passeport, chambre et wifi.",
      "Use reservation, name, passport, room, and Wi-Fi.",
      "Usar reservación, nombre, pasaporte, habitación y wifi.",
    ),
    mechanics: ["contextual-input", "controlled-form", "conversation-building"],
    supportLevel: "reduced",
    activities: [
      {
        id: "hotel-card",
        kind: "scenario",
        title: lstr("Carte de réservation", "Reservation card", "Tarjeta de reservación"),
        instructions: lstr(
          "Utilise seulement les informations de la carte pour écrire tes répliques.",
          "Use only the information on the card to write your turns.",
          "Usa solo la información de la tarjeta para escribir tus intervenciones.",
        ),
        inputLines: [
          "Reserva: 2 noches",
          "Nombre: Alex Tremblay",
          "Hotel: Coral Azul",
          "Necesitas: wifi, desayuno, hora de salida",
        ],
        items: [
          open("hotel-card-1", lstr("Dire que tu as une réservation.", "Say you have a reservation.", "Decir que tienes una reservación."), "Buenas. Tengo una reservación."),
          open("hotel-card-2", lstr("Dire à quel nom elle est.", "Say whose name it is under.", "Decir a nombre de quién está."), "A nombre de Tremblay."),
          open("hotel-card-3", lstr("Dire que tu as ton passeport.", "Say you have your passport.", "Decir que tienes tu pasaporte."), "Sí, aquí está mi pasaporte.", 1),
          open("hotel-card-4", lstr("Demander le wifi.", "Ask about Wi-Fi.", "Preguntar por el wifi."), "¿Cuál es la contraseña del wifi?"),
          open("hotel-card-5", lstr("Demander l'heure de départ.", "Ask the checkout time.", "Preguntar la hora de salida."), "¿A qué hora es el check-out?"),
        ],
      },
    ],
  },

  // ── 11 ────────────────────────────────────────────────────────────
  {
    id: "hotel-problems",
    pageNumber: 11,
    kind: "hotel-problems",
    title: lstr("Petits problèmes à l'hôtel", "Small hotel problems", "Problemas pequeños en el hotel"),
    purpose: lstr(
      "Expliquer un problème sans accusation.",
      "Explain a problem without accusation.",
      "Explicar un problema sin acusar.",
    ),
    mechanics: ["choice", "register-choice", "writing", "speaking-prep"],
    supportLevel: "reduced",
    activities: [
      {
        id: "problem-polite",
        kind: "choice",
        title: lstr("Calme ou trop brusque ?", "Calm or too abrupt?", "¿Calmado o demasiado brusco?"),
        instructions: lstr(
          "Entoure la phrase qui reste utile et polie au comptoir.",
          "Circle the line that stays useful and polite at the desk.",
          "Encierra la frase que se mantiene útil y amable en recepción.",
        ),
        targetLanguage: "es",
        items: [
          ask("prob-key", lstr("La clé ne marche pas.", "The key does not work.", "La llave no funciona."), "La llave no funciona.", 1, ["La llave no funciona.", "¡Su hotel es malo!"]),
          ask("prob-water", lstr("Il n'y a pas d'eau chaude.", "There is no hot water.", "No hay agua caliente."), "No tengo agua caliente.", 1, ["No tengo agua caliente.", "Esto es terrible."]),
          ask("prob-help", lstr("Tu as besoin d'aide.", "You need help.", "Necesitas ayuda."), "Necesito ayuda, por favor.", 1, ["Necesito ayuda, por favor.", "Ayuda ahora."]),
        ],
      },
      {
        id: "problem-write",
        kind: "writing",
        title: lstr("Écris au comptoir", "Write at the desk", "Escribe en recepción"),
        instructions: lstr(
          "Écris deux demandes complètes : problème + formule polie.",
          "Write two complete requests: problem + polite formula.",
          "Escribe dos pedidos completos: problema + fórmula amable.",
        ),
        targetLanguage: "es",
        items: [
          open("problem-write-1", lstr("Clé de chambre", "Room key", "Llave de la habitación"), "La llave no funciona. ¿Me puede ayudar, por favor?"),
          open("problem-write-2", lstr("Eau chaude", "Hot water", "Agua caliente"), "No tengo agua caliente. Necesito ayuda, por favor."),
        ],
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────
  {
    id: "listening-lab",
    pageNumber: 12,
    kind: "listening-lab",
    title: lstr("Laboratoire d'écoute", "Listening lab", "Laboratorio de escucha"),
    purpose: lstr(
      "Travailler l'oreille avec l'audio du module 2, seul et sans partenaire.",
      "Train your ear with the Module 2 audio, alone and without a partner.",
      "Entrenar el oído con el audio del módulo 2, solo y sin pareja.",
    ),
    mechanics: ["digital-listening", "listening-simulation", "dictation", "shadowing", "noticing"],
    supportLevel: "reduced",
    activities: [
      {
        id: "listening-bridge",
        kind: "listening",
        title: lstr("Ouvre l'audio du module 2", "Open the Module 2 audio", "Abre el audio del módulo 2"),
        instructions: lstr(
          "Cette page se fait avec l'audio du module 2 en ligne. Suis les étapes, puis reviens ici pour répondre de mémoire.",
          "This page works with the online Module 2 audio. Follow the steps, then come back here and answer from memory.",
          "Esta página funciona con el audio del módulo 2 en línea. Sigue los pasos y vuelve aquí a responder de memoria.",
        ),
        digitalPath: MODULE_2_DIGITAL_PATH,
        steps: [
          lstr(
            "Ouvre le module 2 sur ton téléphone ou ton ordinateur, à l'adresse imprimée ci-dessus.",
            "Open Module 2 on your phone or computer, at the address printed above.",
            "Abre el módulo 2 en tu teléfono o computadora, en la dirección impresa arriba.",
          ),
          lstr(
            "Avance jusqu'à l'écran « À l'aéroport », puis jusqu'à l'écran « Check-in à l'hôtel ».",
            "Move forward to the \"At the airport\" screen, then to the \"Hotel check-in\" screen.",
            "Avanza hasta la pantalla «En el aeropuerto» y luego a «Check-in en el hotel».",
          ),
          lstr(
            "Touche le bouton audio de chaque réplique. Écoute deux fois en cachant la traduction avec ta main.",
            "Tap the audio button on each line. Listen twice while covering the translation with your hand.",
            "Toca el botón de audio de cada frase. Escucha dos veces cubriendo la traducción con la mano.",
          ),
          lstr(
            "Reviens à cette page et réponds sans regarder l'écran.",
            "Come back to this page and answer without looking at the screen.",
            "Vuelve a esta página y responde sin mirar la pantalla.",
          ),
        ],
        notes: [
          lstr(
            "Sans accès à l'écran ? Solution de repli seulement : demande à quelqu'un de lire les répliques du module à voix haute, lentement, deux fois.",
            "No screen access? Fallback only: ask someone to read the module lines out loud, slowly, twice.",
            "¿Sin acceso a la pantalla? Solo como respaldo: pide a alguien que lea las frases del módulo en voz alta, despacio, dos veces.",
          ),
        ],
        items: [
          askMeaning(
            "listen-gist-place",
            lstr("Écoute 1 — où se passe la première scène ?", "Listening 1 — where does the first scene take place?", "Escucha 1 — ¿dónde ocurre la primera escena?"),
            lstr("À l'aéroport, à la sortie.", "At the airport, near the exit.", "En el aeropuerto, cerca de la salida."),
            [
              lstr("à l'aéroport", "at the airport", "en el aeropuerto"),
              lstr("au restaurant", "at a restaurant", "en un restaurante"),
              lstr("à la plage", "at the beach", "en la playa"),
            ],
          ),
          askMeaning(
            "listen-gist-goal",
            lstr("Écoute 1 — que veut la personne qui voyage ?", "Listening 1 — what does the traveler want?", "Escucha 1 — ¿qué quiere la persona que viaja?"),
            lstr("Trouver un taxi pour aller à son hôtel.", "To find a taxi to get to the hotel.", "Encontrar un taxi para ir al hotel."),
          ),
          askMeaning(
            "listen-gist-hotel",
            lstr("Écoute 2 — que fait la personne dans la deuxième scène ?", "Listening 2 — what is the person doing in the second scene?", "Escucha 2 — ¿qué hace la persona en la segunda escena?"),
            lstr("Elle fait le check-in avec une réservation.", "Checking in with a reservation.", "Hace el check-in con una reservación."),
          ),
          ask(
            "listen-detail-taxis",
            lstr("Où sont les taxis ? Écris les deux informations en espagnol.", "Where are the taxis? Write both pieces of information in Spanish.", "¿Dónde están los taxis? Escribe las dos informaciones en español."),
            "afuera · a la derecha",
            2,
          ),
          ask(
            "listen-detail-door",
            lstr("Par où la personne peut-elle sortir ?", "Which way can the person go out?", "¿Por dónde puede salir la persona?"),
            "por esa puerta",
          ),
          ask(
            "listen-detail-name",
            lstr("Quelle question la réception pose-t-elle après la réservation ?", "What does the front desk ask after the reservation?", "¿Qué pregunta la recepción después de la reservación?"),
            "¿A nombre de quién?",
          ),
          ask(
            "listen-detail-room",
            lstr("Quel numéro de chambre entends-tu ?", "Which room number do you hear?", "¿Qué número de habitación oyes?"),
            "la 204",
          ),
        ],
      },
      {
        id: "listening-dictation",
        kind: "listening",
        title: lstr("Dictée courte", "Short dictation", "Dictado corto"),
        instructions: lstr(
          "Rejoue une seule réplique, mets en pause, puis écris-la. Rejoue autant de fois que nécessaire.",
          "Replay one single line, pause, then write it. Replay as many times as you need.",
          "Reproduce una sola frase, pausa y escríbela. Repite tantas veces como necesites.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "dictation-checkin",
            lstr("La première réplique de la personne qui voyage, au comptoir.", "The traveler's first line at the front desk.", "La primera frase de la persona que viaja, en recepción."),
            "Buenas tardes. Tengo una reservación.",
            2,
          ),
          ask(
            "dictation-taxis",
            lstr("La réponse de l'employé au sujet des taxis.", "The employee's answer about the taxis.", "La respuesta del empleado sobre los taxis."),
            "Los taxis están afuera, a la derecha.",
            2,
          ),
        ],
      },
      {
        id: "listening-shadow",
        kind: "speaking",
        title: lstr("Répète par-dessus la voix", "Shadow the voice", "Repite sobre la voz"),
        instructions: lstr(
          "Rejoue trois répliques et parle en même temps que la voix, à la même vitesse. Note ce qui résiste.",
          "Replay three lines and speak at the same time as the voice, at the same speed. Note what resists.",
          "Reproduce tres frases y habla al mismo tiempo que la voz, a la misma velocidad. Anota lo que te cuesta.",
        ),
        notes: [
          lstr(
            "Rien à corriger ici : c'est une trace de ta prononciation, utile à montrer à un professeur.",
            "Nothing to correct here: it is a record of your pronunciation, useful to show a teacher.",
            "Nada que corregir aquí: es un registro de tu pronunciación, útil para mostrar a un profesor.",
          ),
        ],
        items: [
          own("shadow-hard", lstr("Le son ou le mot le plus difficile à suivre :", "The hardest sound or word to follow:", "El sonido o la palabra más difícil de seguir:")),
          own("shadow-speed", lstr("Vitesse atteinte : lente, moyenne ou normale ?", "Speed reached: slow, medium, or normal?", "Velocidad alcanzada: lenta, media o normal?"), 1),
        ],
      },
      {
        id: "listening-repair",
        kind: "writing",
        title: lstr("Si tu n'as pas compris", "If you did not understand", "Si no entendiste"),
        instructions: lstr("Écris tes deux phrases de secours, sans regarder les pages précédentes.", "Write your two rescue phrases, without looking at earlier pages.", "Escribe tus dos frases de rescate, sin mirar las páginas anteriores."),
        targetLanguage: "es",
        items: [
          open("repair-repeat", lstr("Demander de répéter.", "Ask someone to repeat.", "Pedir que repitan."), "¿Me puede repetir, por favor?", 1),
          open("repair-slow", lstr("Demander de parler plus lentement.", "Ask someone to speak more slowly.", "Pedir que hablen más despacio."), "¿Puede hablar más despacio, por favor?", 1),
        ],
      },
    ],
  },

  // ── 13 ────────────────────────────────────────────────────────────
  {
    id: "dominican-spanish",
    pageNumber: 13,
    kind: "dominican-awareness",
    title: lstr(
      "Espagnol qu'on peut entendre en R.D.",
      "Spanish you may hear in the D.R.",
      "Español que puedes oír en R.D.",
    ),
    purpose: lstr(
      "Comprendre plus, sans changer ta façon de parler.",
      "Understand more, without changing the way you speak.",
      "Entender más, sin cambiar tu forma de hablar.",
    ),
    mechanics: ["sociolinguistic-awareness", "noticing", "choice"],
    supportLevel: "reduced",
    activities: [
      {
        id: "rd-general",
        kind: "awareness",
        title: lstr("A. Español general", "A. Español general", "A. Español general"),
        instructions: lstr(
          "Ces phrases fonctionnent partout dans le monde hispanophone, y compris en République dominicaine. Ce sont celles que tu produis.",
          "These phrases work everywhere in the Spanish-speaking world, the Dominican Republic included. These are the ones you produce.",
          "Estas frases funcionan en todo el mundo hispanohablante, también en República Dominicana. Son las que tú produces.",
        ),
        targetLanguage: "es",
        items: [
          tick("rd-general-taxi", lstr("¿Dónde puedo tomar un taxi?", "¿Dónde puedo tomar un taxi?", "¿Dónde puedo tomar un taxi?")),
          tick("rd-general-hotel", lstr("Voy a este hotel.", "Voy a este hotel.", "Voy a este hotel.")),
          tick("rd-general-repeat", lstr("¿Me puede repetir, por favor?", "¿Me puede repetir, por favor?", "¿Me puede repetir, por favor?")),
        ],
      },
      {
        id: "rd-may-hear",
        kind: "notice",
        title: lstr(
          "B. En République dominicaine, tu peux entendre...",
          "B. In the Dominican Republic you may hear...",
          "B. En República Dominicana puedes oír...",
        ),
        instructions: lstr(
          "Reconnaissance seulement. Entoure ce que la forme veut dire, puis passe à la section C.",
          "Recognition only. Circle what the form means, then move on to section C.",
          "Solo reconocimiento. Encierra lo que significa la forma y pasa a la sección C.",
        ),
        targetLanguage: "es",
        notes: [
          lstr(
            "Ces formes servent à comprendre, pas à imiter. Pour parler, garde les phrases de la section A.",
            "These forms are for understanding, not for imitating. To speak, keep the section A phrases.",
            "Estas formas sirven para entender, no para imitar. Para hablar, quédate con las frases de la sección A.",
          ),
          lstr(
            "Personne ne parle « le dominicain » de façon uniforme : cela change selon la personne, la région et la situation.",
            "Nobody speaks \"Dominican\" uniformly: it changes with the person, the region, and the situation.",
            "Nadie habla «dominicano» de forma uniforme: cambia según la persona, la región y la situación.",
          ),
        ],
        items: [
          askMeaning(
            "rd-pa",
            lstr("pa' — comme dans « pa' allá »", "pa' — as in \"pa' allá\"", "pa' — como en «pa' allá»"),
            lstr(
              "Version familière raccourcie de « para », pas réservée à la République dominicaine.",
              "A colloquial shortened form of \"para\", not exclusive to the Dominican Republic.",
              "Forma coloquial abreviada de «para», no exclusiva de la República Dominicana.",
            ),
            ["para", "pero", "piso"],
          ),
          askMeaning(
            "rd-final-s",
            lstr(
              "dos cafés — le s final peut devenir très léger à l'oral; on garde l'orthographe normale",
              "dos cafés — final s may become very light in speech; keep the normal spelling",
              "dos cafés — la s final puede sonar muy suave al hablar; se mantiene la escritura normal",
            ),
            lstr("On comprend « dos cafés »; on écrit « dos cafés ».", "You understand \"dos cafés\"; you write \"dos cafés\".", "Se entiende «dos cafés»; se escribe «dos cafés»."),
            ["dos cafés", "doce cafés", "dos cafeterías"],
          ),
          askMeaning(
            "rd-guagua",
            lstr("la guagua", "la guagua", "la guagua"),
            lstr("le bus ou le minibus public", "the bus or public minibus", "el autobús o minibús público"),
            [
              lstr("le bus ou le minibus public", "the bus or public minibus", "el autobús o minibús público"),
              lstr("un taxi privé", "a private taxi", "un taxi privado"),
              lstr("l'aéroport", "the airport", "el aeropuerto"),
            ],
          ),
          askMeaning(
            "rd-colmado",
            lstr("el colmado", "el colmado", "el colmado"),
            lstr("la petite épicerie de quartier", "the neighborhood corner shop", "la tienda del barrio"),
            [
              lstr("la petite épicerie de quartier", "the neighborhood corner shop", "la tienda del barrio"),
              lstr("un grand hôtel", "a large hotel", "un hotel grande"),
              lstr("la gare routière", "the bus terminal", "la terminal de autobuses"),
            ],
          ),
          askMeaning(
            "rd-motoconcho",
            lstr("el motoconcho", "el motoconcho", "el motoconcho"),
            lstr("la moto-taxi", "the motorcycle taxi", "la moto que funciona como taxi"),
            [
              lstr("la moto-taxi", "the motorcycle taxi", "la moto que funciona como taxi"),
              lstr("un autobus climatisé", "an air-conditioned coach", "un autobús con aire"),
              lstr("une voiture de location", "a rental car", "un carro de alquiler"),
            ],
          ),
          askMeaning(
            "rd-ahorita",
            lstr("ahorita", "ahorita", "ahorita"),
            lstr(
              "Temps proche selon le contexte; si l'heure précise compte, demande : ¿A qué hora?",
              "Nearby time, depending on context; if the precise time matters, ask: ¿A qué hora?",
              "Tiempo cercano según el contexto; si la hora precisa importa, pregunta: ¿A qué hora?",
            ),
            [
              lstr("un moment proche, selon le contexte", "a nearby time, depending on context", "un tiempo cercano, según el contexto"),
              lstr("hier", "yesterday", "ayer"),
              lstr("jamais", "never", "nunca"),
            ],
          ),
        ],
      },
      {
        id: "rd-safe-production",
        kind: "choice",
        title: lstr(
          "C. Pour commencer, tu peux dire...",
          "C. To start, you can say...",
          "C. Para empezar, puedes decir...",
        ),
        instructions: lstr(
          "Dans chaque situation, entoure ce qu'un débutant peut dire sans risque. Tu n'as pas besoin d'utiliser les formes de la section B.",
          "In each situation, circle what a beginner can safely say. You do not need to use the section B forms.",
          "En cada situación, encierra lo que un principiante puede decir sin riesgo. No necesitas usar las formas de la sección B.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "safe-pa",
            lstr("On te dit « pa' allá » en pointant du doigt et tu n'es pas sûr.", "Someone says \"pa' allá\" while pointing and you are not sure.", "Alguien dice «pa' allá» señalando y no estás seguro."),
            "¿Me puede repetir más despacio, por favor?",
            1,
            ["¿Me puede repetir más despacio, por favor?", "Pa' allá también.", "No entiendo nada."],
          ),
          ask(
            "safe-ahorita",
            lstr("À la réception on te répond « ahorita », mais tu as besoin d'une heure précise.", "The front desk answers \"ahorita\", but you need a precise time.", "En recepción te responden «ahorita», pero necesitas una hora precisa."),
            "¿A qué hora, por favor?",
            1,
            ["¿A qué hora, por favor?", "Ahorita está bien.", "¿Por qué ahorita?"],
          ),
          ask(
            "safe-transport",
            lstr("Tu ne connais pas encore le mot local pour le transport.", "You do not know the local transport word yet.", "Todavía no conoces la palabra local para el transporte."),
            "¿Dónde puedo tomar un taxi?",
            1,
            ["¿Dónde puedo tomar un taxi?", "Quiero un transporte.", "¿Dónde está el motoconcho de guagua?"],
          ),
          ask(
            "safe-fast",
            lstr("La personne parle vite et tu perds le fil. Choisis la version la plus polie.", "The person speaks fast and you lose track. Choose the most polite version.", "La persona habla rápido y te pierdes. Elige la versión más amable."),
            "¿Puede hablar más despacio, por favor?",
            1,
            ["¿Puede hablar más despacio, por favor?", "Hable despacio.", "Más despacio."],
          ),
        ],
      },
    ],
  },

  // ── 14 ────────────────────────────────────────────────────────────
  {
    id: "real-world-reading",
    pageNumber: 14,
    kind: "reading",
    title: lstr("Lecture du monde réel", "Real-world reading", "Lectura del mundo real"),
    purpose: lstr(
      "Traiter un vrai message d'arrivée : comprendre, retrouver, réutiliser.",
      "Handle a real arrival message: understand it, find things in it, reuse it.",
      "Trabajar un mensaje de llegada real: entender, localizar, reutilizar.",
    ),
    mechanics: ["reading", "contextual-input", "sequence", "choice", "writing"],
    supportLevel: "reduced",
    activities: [
      {
        id: "arrival-message",
        kind: "reading",
        title: lstr("Message reçu la veille du départ", "Message received the day before you fly", "Mensaje recibido el día antes del viaje"),
        instructions: lstr(
          "Lis le message une fois en entier avant de répondre. Ne traduis pas mot à mot.",
          "Read the whole message once before answering. Do not translate word by word.",
          "Lee todo el mensaje una vez antes de responder. No traduzcas palabra por palabra.",
        ),
        targetLanguage: "es",
        inputTitle: lstr("Villa Mango · Recepción · 14:20", "Villa Mango · Recepción · 14:20", "Villa Mango · Recepción · 14:20"),
        inputLines: [
          "Buenas tardes, señora Tremblay. Bienvenida a Puerto Plata.",
          "Su habitación está lista a las tres de la tarde.",
          "Nuestro conductor se llama Elvis. La espera en la salida principal del aeropuerto, con un cartel con su nombre.",
          "El viaje hasta el hotel dura veinte minutos. Estamos cerca del parque central.",
          "La recepción está abierta toda la noche.",
          "Si no ve al conductor, escriba a este número.",
          "Buen viaje y hasta pronto.",
        ],
        items: [
          askMeaning(
            "read-gist",
            lstr("À quoi sert surtout ce message ?", "What is this message mainly for?", "¿Para qué sirve sobre todo este mensaje?"),
            lstr("Organiser l'arrivée et le transport.", "Organizing the arrival and the transportation.", "Organizar la llegada y el transporte."),
            [
              lstr("organiser l'arrivée et le transport", "organizing the arrival and the transport", "organizar la llegada y el transporte"),
              lstr("vendre une excursion", "selling an excursion", "vender una excursión"),
              lstr("annoncer un problème de chambre", "reporting a room problem", "avisar de un problema de habitación"),
            ],
          ),
        ],
      },
      {
        id: "arrival-details",
        kind: "reading",
        title: lstr("Informations précises", "Precise information", "Información precisa"),
        instructions: lstr(
          "Réponds en espagnol, avec le moins de mots possible.",
          "Answer in Spanish, with as few words as possible.",
          "Responde en español, con las menos palabras posibles.",
        ),
        targetLanguage: "es",
        items: [
          ask("read-driver", lstr("Comment s'appelle le chauffeur ?", "What is the driver's name?", "¿Cómo se llama el conductor?"), "Elvis"),
          ask("read-room-time", lstr("À quelle heure la chambre est-elle prête ?", "What time is the room ready?", "¿A qué hora está lista la habitación?"), "a las tres de la tarde"),
          ask("read-duration", lstr("Combien de temps dure le trajet ?", "How long is the ride?", "¿Cuánto dura el viaje?"), "veinte minutos"),
        ],
      },
      {
        id: "arrival-sequence",
        kind: "sequence",
        title: lstr("Remets l'arrivée en ordre", "Put the arrival in order", "Ordena la llegada"),
        instructions: lstr(
          "Numérote de 1 à 4 selon l'ordre du message.",
          "Number from 1 to 4 following the order of the message.",
          "Numera del 1 al 4 según el orden del mensaje.",
        ),
        targetLanguage: "es",
        items: [
          ordered("seq-ride", "El viaje hasta el hotel dura veinte minutos.", 3),
          ordered("seq-welcome", "Bienvenida a Puerto Plata.", 1),
          ordered("seq-room", "Su habitación está lista a las tres de la tarde.", 4),
          ordered("seq-driver", "Nuestro conductor la espera en la salida principal.", 2),
        ],
      },
      {
        id: "arrival-mining",
        kind: "notice",
        title: lstr("Récolte et devine", "Harvest and infer", "Recoge y deduce"),
        instructions: lstr(
          "Recopie une phrase utile, puis devine deux mots grâce au contexte.",
          "Copy one useful phrase, then infer two words from context.",
          "Copia una frase útil y deduce dos palabras por el contexto.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "read-locate",
            lstr("Recopie la phrase qui dit où attendre le chauffeur.", "Copy the phrase that says where to wait for the driver.", "Copia la frase que dice dónde esperar al conductor."),
            "La espera en la salida principal del aeropuerto.",
            2,
          ),
          askMeaning(
            "read-cartel",
            lstr("« un cartel con su nombre » — que porte le chauffeur ?", "\"un cartel con su nombre\" — what is the driver holding?", "«un cartel con su nombre» — ¿qué lleva el conductor?"),
            lstr("Une pancarte avec ton nom écrit dessus.", "A sign with your name written on it.", "Un letrero con tu nombre escrito."),
          ),
          askMeaning(
            "read-recepcion",
            lstr("« La recepción está abierta toda la noche. » — pourquoi c'est rassurant ?", "\"La recepción está abierta toda la noche.\" — why is that reassuring?", "«La recepción está abierta toda la noche.» — ¿por qué tranquiliza?"),
            lstr("Quelqu'un peut t'accueillir même si tu arrives tard.", "Someone can receive you even if you arrive late.", "Alguien puede recibirte aunque llegues tarde."),
          ),
        ],
      },
      {
        id: "arrival-rewrite",
        kind: "writing",
        title: lstr("Change un détail, puis réponds", "Change one detail, then reply", "Cambia un detalle y responde"),
        instructions: lstr(
          "Réutilise les phrases du message pour ces deux tâches.",
          "Reuse the message's phrases for these two tasks.",
          "Reutiliza las frases del mensaje para estas dos tareas.",
        ),
        targetLanguage: "es",
        items: [
          open(
            "read-change",
            lstr(
              "Réécris la phrase du chauffeur pour un voyageur qui s'appelle Diallo et qui arrive à onze heures du soir.",
              "Rewrite the driver sentence for a traveler named Diallo arriving at eleven at night.",
              "Reescribe la frase del conductor para un viajero que se llama Diallo y llega a las once de la noche.",
            ),
            "Nuestro conductor lo espera en la salida principal a las once de la noche.",
          ),
          open(
            "read-reply",
            lstr(
              "Réponds au message : confirme ton heure d'arrivée et pose une question.",
              "Reply to the message: confirm your arrival time and ask one question.",
              "Responde al mensaje: confirma tu hora de llegada y haz una pregunta.",
            ),
            "Buenas tardes. Llego a las dos de la tarde. ¿Hay desayuno incluido?",
            4,
          ),
        ],
      },
    ],
  },

  // ── 15 ────────────────────────────────────────────────────────────
  {
    id: "writing-workshop",
    pageNumber: 15,
    kind: "writing",
    title: lstr("Atelier d'écriture", "Writing workshop", "Taller de escritura"),
    purpose: lstr(
      "Passer d'un message soutenu à un message entièrement de toi.",
      "Move from a supported message to a message entirely your own.",
      "Pasar de un mensaje con apoyo a un mensaje totalmente tuyo.",
    ),
    mechanics: ["guided-writing", "writing", "controlled-form"],
    supportLevel: "independent",
    activities: [
      {
        id: "write-stage-1",
        kind: "writing",
        title: lstr("Étape 1 — compléter", "Stage 1 — complete", "Etapa 1 — completar"),
        instructions: lstr(
          "Complète le message de la chambre 204. Un mot par espace.",
          "Complete the room 204 message. One word per blank.",
          "Completa el mensaje de la habitación 204. Una palabra por espacio.",
        ),
        targetLanguage: "es",
        inputTitle: lstr("Message à la réception", "Message to the front desk", "Mensaje a recepción"),
        inputLines: [
          "Buenas ____ (1). Estoy en la habitación 204.",
          "La ____ (2) de mi habitación no funciona.",
          "____ (3) ayuda, por favor.",
          "¿____ (4) venir alguien esta tarde?",
          "Muchas ____ (5).",
        ],
        items: [
          ask("stage1-1", lstr("Espace 1", "Blank 1", "Espacio 1"), "tardes"),
          ask("stage1-2", lstr("Espace 2", "Blank 2", "Espacio 2"), "llave"),
          ask("stage1-3", lstr("Espace 3", "Blank 3", "Espacio 3"), "Necesito"),
          ask("stage1-4", lstr("Espace 4", "Blank 4", "Espacio 4"), "Puede"),
          ask("stage1-5", lstr("Espace 5", "Blank 5", "Espacio 5"), "gracias"),
        ],
      },
      {
        id: "write-stage-2",
        kind: "writing",
        title: lstr("Étape 2 — modifier", "Stage 2 — modify", "Etapa 2 — modificar"),
        instructions: lstr(
          "Garde la structure de l'étape 1 et change une seule chose à la fois.",
          "Keep the structure from stage 1 and change one single thing at a time.",
          "Mantén la estructura de la etapa 1 y cambia una sola cosa cada vez.",
        ),
        targetLanguage: "es",
        items: [
          open(
            "stage2-room",
            lstr("Change la chambre : tu es en 512.", "Change the room: you are in 512.", "Cambia la habitación: estás en la 512."),
            "Buenas tardes. Estoy en la habitación 512.",
          ),
          open(
            "stage2-problem",
            lstr("Change le problème : il n'y a pas d'eau chaude.", "Change the problem: there is no hot water.", "Cambia el problema: no hay agua caliente."),
            "No tengo agua caliente en la habitación.",
          ),
          open(
            "stage2-action",
            lstr(
              "Change l'action demandée : tu veux que quelqu'un vienne demain matin.",
              "Change the requested action: you want someone to come tomorrow morning.",
              "Cambia la acción pedida: quieres que alguien venga mañana por la mañana.",
            ),
            "¿Puede venir alguien mañana por la mañana, por favor?",
          ),
        ],
      },
      {
        id: "write-stage-3",
        kind: "writing",
        title: lstr("Étape 3 — écrire seul", "Stage 3 — write on your own", "Etapa 3 — escribir solo"),
        instructions: lstr(
          "Écris ton propre message à la réception, sans regarder les étapes 1 et 2. Cinq phrases maximum.",
          "Write your own message to the front desk, without looking at stages 1 and 2. Five sentences maximum.",
          "Escribe tu propio mensaje a recepción, sin mirar las etapas 1 y 2. Cinco frases como máximo.",
        ),
        targetLanguage: "es",
        items: [
          open(
            "stage3-message",
            lstr("Ton message complet :", "Your complete message:", "Tu mensaje completo:"),
            "Buenas tardes. Estoy en la habitación 204. No tengo agua caliente. ¿Puede venir alguien esta tarde, por favor? Muchas gracias.",
            6,
          ),
        ],
      },
      {
        id: "write-checklist",
        kind: "checklist",
        title: lstr("Vérifie ton message", "Check your message", "Revisa tu mensaje"),
        instructions: lstr(
          "Coche seulement ce que ton message de l'étape 3 contient vraiment. Ne regarde la page 20 qu'après.",
          "Tick only what your stage 3 message really contains. Only look at page 20 afterwards.",
          "Marca solo lo que tu mensaje de la etapa 3 contiene de verdad. Mira la página 20 solo después.",
        ),
        items: [
          tick("check-greeting", lstr("Une salutation", "A greeting", "Un saludo")),
          tick("check-info", lstr("L'information essentielle : qui je suis ou où je suis", "The essential information: who I am or where I am", "La información esencial: quién soy o dónde estoy")),
          tick("check-problem", lstr("Le problème ou le besoin, sans accusation", "The problem or need, without accusation", "El problema o la necesidad, sin acusar")),
          tick("check-request", lstr("Une demande ou une question claire", "A clear request or question", "Un pedido o una pregunta clara")),
          tick("check-close", lstr("Une formule de politesse pour finir", "A polite closing formula", "Una fórmula de cortesía al final")),
        ],
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────
  {
    id: "speaking-mission-prep",
    pageNumber: 16,
    kind: "speaking",
    title: lstr("Mission orale : le chauffeur ne te trouve pas", "Speaking mission: the driver cannot find you", "Misión oral: el conductor no te encuentra"),
    purpose: lstr(
      "Combiner seul, dans une situation nouvelle, la langue déjà apprise.",
      "Combine what you already know, on your own, in a brand new situation.",
      "Combinar solo, en una situación nueva, la lengua ya aprendida.",
    ),
    mechanics: ["transfer-task", "speaking-prep", "self-assessment"],
    supportLevel: "independent",
    activities: [
      {
        id: "mission-brief",
        kind: "speaking",
        title: lstr("La situation", "The situation", "La situación"),
        instructions: lstr(
          "Tu es dehors, à la sortie principale de l'aéroport. La batterie de ton téléphone est presque vide et le chauffeur envoyé par l'hôtel ne te trouve pas. Tu l'appelles. Tu as environ une minute.",
          "You are outside, at the main airport exit. Your phone battery is nearly dead and the driver sent by the hotel cannot find you. You call. You have about one minute.",
          "Estás afuera, en la salida principal del aeropuerto. La batería de tu teléfono está casi vacía y el conductor del hotel no te encuentra. Lo llamas. Tienes cerca de un minuto.",
        ),
        steps: [
          lstr("Saluer.", "Greet.", "Saludar."),
          lstr("Dire qui tu es.", "Say who you are.", "Decir quién eres."),
          lstr("Dire où tu es.", "Say where you are.", "Decir dónde estás."),
          lstr("Demander où il est, lui.", "Ask where he is.", "Preguntar dónde está él."),
          lstr("Demander de répéter ou de parler plus lentement, si nécessaire.", "Ask him to repeat or speak more slowly, if needed.", "Pedir que repita o hable más despacio, si hace falta."),
          lstr("Confirmer la destination.", "Confirm the destination.", "Confirmar el destino."),
          lstr("Clore poliment.", "Close politely.", "Cerrar con cortesía."),
        ],
        notes: [
          lstr(
            "Aucune nouvelle phrase n'est nécessaire : tout ce qu'il faut est déjà dans les pages 3 à 14.",
            "No new phrase is needed: everything required is already in pages 3 to 14.",
            "No hace falta ninguna frase nueva: todo lo necesario ya está en las páginas 3 a 14.",
          ),
        ],
      },
      {
        id: "mission-plan",
        kind: "speaking",
        title: lstr("Notes de préparation", "Preparation notes", "Notas de preparación"),
        instructions: lstr(
          "Une ligne maximum par case. Ce sont des notes, pas un texte à lire.",
          "One line maximum per field. These are notes, not a text to read out.",
          "Una línea como máximo por casilla. Son notas, no un texto para leer.",
        ),
        targetLanguage: "es",
        notes: [
          lstr(
            "La case « mots-clés » n'a pas de corrigé : elle sert seulement à toi.",
            "The \"keywords\" field has no answer key: it is only for you.",
            "La casilla de «palabras clave» no tiene clave: es solo para ti.",
          ),
        ],
        items: [
          own("plan-keywords", lstr("Mots-clés (5 maximum)", "Keywords (5 maximum)", "Palabras clave (5 como máximo)"), 1),
          open("plan-opening", lstr("Ouverture", "Opening", "Apertura"), "Buenas. Soy Alex Tremblay.", 1),
          open("plan-location", lstr("Où tu es", "Where you are", "Dónde estás"), "Estoy afuera, en la salida principal del aeropuerto.", 1),
          open("plan-question", lstr("Ta question au chauffeur", "Your question to the driver", "Tu pregunta al conductor"), "¿Dónde está?", 1),
          open("plan-clarify", lstr("Demande de clarification", "Clarification request", "Pedido de aclaración"), "¿Me puede repetir más despacio, por favor?", 1),
          open("plan-confirm", lstr("Confirmation de la destination", "Destination confirmation", "Confirmación del destino"), "Voy al Hotel Villa Mango, ¿correcto?", 1),
          open("plan-close", lstr("Clôture", "Closing", "Cierre"), "Perfecto. Gracias. Nos vemos.", 1),
        ],
      },
      {
        id: "mission-perform",
        kind: "reflection",
        title: lstr("Fais-le à voix haute", "Do it out loud", "Hazlo en voz alta"),
        instructions: lstr(
          "Cache la page précédente et joue la scène à voix haute, du début à la fin, sans lire. Puis note-toi.",
          "Cover the previous page and act out the scene aloud, start to finish, without reading. Then rate yourself.",
          "Cubre la página anterior y actúa la escena en voz alta, de principio a fin, sin leer. Luego evalúate.",
        ),
        notes: [
          lstr(
            "Note : 1 = j'ai eu besoin de toutes mes notes · 2 = j'ai eu besoin de mots-clés seulement · 3 = j'ai réussi sans notes.",
            "Rating: 1 = I needed all my notes · 2 = I needed keywords only · 3 = I completed it without notes.",
            "Nota: 1 = necesité todas mis notas · 2 = necesité solo palabras clave · 3 = lo logré sin notas.",
          ),
        ],
        items: [
          own("mission-rating", lstr("Ma note (1, 2 ou 3) :", "My rating (1, 2, or 3):", "Mi nota (1, 2 o 3):"), 1),
          own("mission-blocked", lstr("Le moment où j'ai bloqué :", "The moment where I got stuck:", "El momento en que me bloqueé:")),
        ],
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────
  {
    id: "cumulative-retrieval",
    pageNumber: 17,
    kind: "cumulative",
    title: lstr("Récupération cumulative", "Cumulative retrieval", "Recuperación acumulativa"),
    purpose: lstr(
      "Décider toi-même quelle langue la situation demande.",
      "Decide for yourself which language the situation needs.",
      "Decidir tú mismo qué lengua pide la situación.",
    ),
    mechanics: [
      "cumulative-retrieval",
      "translation",
      "matching",
      "error-correction",
      "register-choice",
      "reading",
      "writing",
      "sociolinguistic-awareness",
    ],
    supportLevel: "independent",
    activities: [
      {
        id: "cum-produce",
        kind: "translation",
        title: lstr("Produire de mémoire", "Produce from memory", "Producir de memoria"),
        instructions: lstr(
          "Sans banque de mots. Une phrase ou un mot, selon la consigne.",
          "No word bank. One sentence or one word, depending on the prompt.",
          "Sin banco de palabras. Una frase o una palabra, según la consigna.",
        ),
        targetLanguage: "es",
        items: [
          ask("cum-exit", lstr("Demande où se trouve la sortie.", "Ask where the exit is.", "Pregunta dónde está la salida."), "¿Dónde está la salida?", 2),
          ask("cum-destination", lstr("Dis que tu vas à cet hôtel.", "Say you are going to this hotel.", "Di que vas a este hotel."), "Voy a este hotel."),
          ask("cum-price", lstr("Demande le prix de la course.", "Ask the price of the ride.", "Pregunta el precio del viaje."), "¿Cuánto cuesta?"),
          ask("cum-nowater", lstr("Dis que tu n'as pas d'eau chaude.", "Say you have no hot water.", "Di que no tienes agua caliente."), "No tengo agua caliente."),
          ask("cum-word-key", lstr("Le mot : la clé", "The word: the key", "La palabra: lo que abre la puerta"), "la llave"),
          ask("cum-word-breakfast", lstr("Le mot : le petit-déjeuner", "The word: breakfast", "La palabra: la comida de la mañana"), "el desayuno"),
        ],
      },
      {
        id: "cum-understand",
        kind: "match",
        title: lstr("Comprendre ce qu'on te dit", "Understand what you are told", "Entender lo que te dicen"),
        instructions: lstr(
          "Écris ce que la phrase signifie pour toi, dans ta langue.",
          "Write what the sentence means for you, in your own language.",
          "Escribe qué significa la frase para ti, en tu lengua.",
        ),
        targetLanguage: "es",
        items: [
          askMeaning(
            "cum-door",
            lstr("Puede salir por esa puerta.", "Puede salir por esa puerta.", "Puede salir por esa puerta."),
            lstr("Tu peux sortir par cette porte-là.", "You can go out through that door.", "Puedes salir por esa puerta."),
          ),
          askMeaning(
            "cum-included",
            lstr("El desayuno está incluido.", "El desayuno está incluido.", "El desayuno está incluido."),
            lstr("Le petit-déjeuner est compris dans le prix.", "Breakfast is included in the price.", "El desayuno va incluido en el precio."),
          ),
          askMeaning(
            "cum-ready",
            lstr("Su habitación está lista.", "Su habitación está lista.", "Su habitación está lista."),
            lstr("Ta chambre est prête.", "Your room is ready.", "Tu habitación está lista."),
          ),
        ],
      },
      {
        id: "cum-repair",
        kind: "error-correction",
        title: lstr("Corrige et questionne", "Correct and question", "Corrige y pregunta"),
        instructions: lstr(
          "Deux phrases à corriger, deux réponses dont il faut retrouver la question.",
          "Two sentences to correct, two answers whose question you must recover.",
          "Dos frases para corregir, dos respuestas cuya pregunta debes recuperar.",
        ),
        targetLanguage: "es",
        items: [
          ask("cum-fix-1", lstr("Corrige : Yo tengo un reservación.", "Correct: Yo tengo un reservación.", "Corrige: Yo tengo un reservación."), "Tengo una reservación.", 2),
          ask("cum-fix-2", lstr("Corrige : ¿Dónde yo puedo tomar taxi?", "Correct: ¿Dónde yo puedo tomar taxi?", "Corrige: ¿Dónde yo puedo tomar taxi?"), "¿Dónde puedo tomar un taxi?", 2),
          ask("cum-q-1", lstr("Réponse : « A las once. » Écris la question.", "Answer: \"A las once.\" Write the question.", "Respuesta: «A las once.» Escribe la pregunta."), "¿A qué hora es el check-out?", 2),
          ask("cum-q-2", lstr("Réponse : « Está en la tarjeta. » Écris la question.", "Answer: \"Está en la tarjeta.\" Write the question.", "Respuesta: «Está en la tarjeta.» Escribe la pregunta."), "¿Dónde está la contraseña?", 2),
        ],
      },
      {
        id: "cum-decide",
        kind: "choice",
        title: lstr("Choisis le bon registre", "Choose the right register", "Elige el registro correcto"),
        instructions: lstr(
          "Même sens, effet différent. Entoure ce que tu dirais au comptoir.",
          "Same meaning, different effect. Circle what you would say at the desk.",
          "Mismo sentido, efecto distinto. Encierra lo que dirías en recepción.",
        ),
        targetLanguage: "es",
        items: [
          ask(
            "cum-register",
            lstr("Tu veux la clé d'une autre chambre.", "You want the key to another room.", "Quieres la llave de otra habitación."),
            "¿Me puede dar otra llave, por favor?",
            1,
            ["¿Me puede dar otra llave, por favor?", "Deme otra llave.", "Otra llave, rápido."],
          ),
          ask(
            "cum-clarify",
            lstr("On te donne trois informations d'un coup et tu n'as retenu que la première.", "You are given three pieces of information at once and you only caught the first.", "Te dan tres informaciones de golpe y solo captaste la primera."),
            "¿Me puede repetir la segunda parte, por favor?",
            1,
            ["¿Me puede repetir la segunda parte, por favor?", "Sí, sí, gracias.", "No importa."],
          ),
        ],
      },
      {
        id: "cum-read",
        kind: "reading",
        title: lstr("Micro-lecture", "Micro-reading", "Microlectura"),
        instructions: lstr("Deux lignes affichées dans l'ascenseur. Réponds dans ta langue.", "Two lines posted in the elevator. Answer in your own language.", "Dos líneas puestas en el ascensor. Responde en tu lengua."),
        targetLanguage: "es",
        inputLines: [
          "Aviso: el agua caliente no funciona en el segundo piso.",
          "Vuelve a las cinco de la tarde.",
        ],
        items: [
          askMeaning(
            "cum-read-problem",
            lstr("Quel est le problème et où ?", "What is the problem and where?", "¿Cuál es el problema y dónde?"),
            lstr("Pas d'eau chaude au deuxième étage.", "No hot water on the second floor.", "No hay agua caliente en el segundo piso."),
          ),
          askMeaning(
            "cum-read-when",
            lstr("Quand est-ce réglé ?", "When is it fixed?", "¿Cuándo se soluciona?"),
            lstr("À cinq heures de l'après-midi.", "At five in the afternoon.", "A las cinco de la tarde."),
          ),
        ],
      },
      {
        id: "cum-respond",
        kind: "writing",
        title: lstr("Réagis à la situation", "React to the situation", "Reacciona a la situación"),
        instructions: lstr(
          "Rien n'est donné. À toi de décider quelle phrase la situation demande.",
          "Nothing is given. You decide which phrase the situation needs.",
          "No se da nada. Tú decides qué frase pide la situación.",
        ),
        targetLanguage: "es",
        items: [
          open("cum-sit-lost", lstr("Le chauffeur ne trouve pas ton hôtel.", "The driver cannot find your hotel.", "El conductor no encuentra tu hotel."), "El hotel está cerca del parque central. ¿Me puede ayudar?"),
          open("cum-sit-passport", lstr("La réception te demande ton passeport.", "The front desk asks for your passport.", "La recepción te pide tu pasaporte."), "Sí, aquí está mi pasaporte.", 1),
          open("cum-sit-early", lstr("Tu arrives à sept heures du matin et la chambre n'est pas prête.", "You arrive at seven in the morning and the room is not ready.", "Llegas a las siete de la mañana y la habitación no está lista."), "¿A qué hora está lista la habitación?"),
          open("cum-line-1", lstr("Réception : ¿A nombre de quién? / Toi : ____", "Front desk: ¿A nombre de quién? / You: ____", "Recepción: ¿A nombre de quién? / Tú: ____"), "A nombre de Tremblay.", 1),
          open("cum-line-2", lstr("Chauffeur : ¿Adónde va? / Toi : ____", "Driver: ¿Adónde va? / You: ____", "Conductor: ¿Adónde va? / Tú: ____"), "Voy al Hotel Villa Mango.", 1),
        ],
      },
      {
        id: "cum-ear",
        kind: "notice",
        title: lstr("Une chose entendue sur place", "One thing heard on location", "Algo oído allá"),
        instructions: lstr("Reconnaissance seulement, comme à la page 13.", "Recognition only, as on page 13.", "Solo reconocimiento, como en la página 13."),
        targetLanguage: "es",
        items: [
          askMeaning(
            "cum-rd-guagua",
            lstr("« Eso queda cerca, coge la guagua. » — quel transport te propose-t-on ?", "\"Eso queda cerca, coge la guagua.\" — which transport is being suggested?", "«Eso queda cerca, coge la guagua.» — ¿qué transporte te proponen?"),
            lstr("Le bus ou minibus public.", "The bus or public minibus.", "El autobús o minibús público."),
            [
              lstr("le bus public", "the public bus", "el autobús público"),
              lstr("l'avion", "the plane", "el avión"),
              lstr("le bateau", "the boat", "el barco"),
            ],
          ),
        ],
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────
  {
    id: "performance-check",
    pageNumber: 18,
    kind: "performance-check",
    title: lstr("Contrôle de performance", "Module 2 performance check", "Control de desempeño"),
    purpose: lstr(
      "Vérifier séparément ce que tu comprends, ce que tu retiens, ce que tu produis et ce que tu résous.",
      "Check separately what you understand, what you retain, what you produce, and what you resolve.",
      "Verificar por separado lo que entiendes, lo que retienes, lo que produces y lo que resuelves.",
    ),
    mechanics: ["performance-check", "contextual-input", "reading", "writing", "speaking-prep", "self-assessment"],
    supportLevel: "independent",
    activities: [
      {
        id: "assess-comprendo",
        kind: "reading",
        title: lstr("A · COMPRENDO", "A · COMPRENDO", "A · COMPRENDO"),
        instructions: lstr(
          "Texte nouveau, jamais vu dans ce cahier. Lis une fois, puis réponds dans ta langue.",
          "New text, never seen in this workbook. Read once, then answer in your own language.",
          "Texto nuevo, nunca visto en este cuaderno. Lee una vez y responde en tu lengua.",
        ),
        targetLanguage: "es",
        inputTitle: lstr("Note laissée sous la porte", "Note left under the door", "Nota dejada bajo la puerta"),
        inputLines: [
          "Recepción · Nota para la habitación 204",
          "Buenas tardes. El agua caliente vuelve a las cinco.",
          "El desayuno de mañana empieza a las seis y media.",
          "Su taxi al aeropuerto está reservado para las nueve.",
          "Si necesita algo, marque el 100.",
        ],
        items: [
          askMeaning("assess-c1", lstr("Quel est le problème actuel ?", "What is the current problem?", "¿Cuál es el problema actual?"), lstr("L'eau chaude ne fonctionne pas pour le moment.", "The hot water is not working for now.", "El agua caliente no funciona por ahora.")),
          askMeaning("assess-c2", lstr("À quelle heure l'eau chaude revient-elle ?", "What time does the hot water come back?", "¿A qué hora vuelve el agua caliente?"), lstr("À cinq heures.", "At five o'clock.", "A las cinco.")),
          askMeaning("assess-c3", lstr("À quelle heure commence le déjeuner demain ?", "What time does breakfast start tomorrow?", "¿A qué hora empieza el desayuno mañana?"), lstr("À six heures et demie.", "At half past six.", "A las seis y media.")),
          askMeaning("assess-c4", lstr("Qu'est-ce qui est réservé pour neuf heures ?", "What is reserved for nine o'clock?", "¿Qué está reservado para las nueve?"), lstr("Le taxi pour l'aéroport.", "The taxi to the airport.", "El taxi al aeropuerto.")),
          askMeaning("assess-c5", lstr("Que dois-tu faire si tu as besoin de quelque chose ?", "What should you do if you need something?", "¿Qué debes hacer si necesitas algo?"), lstr("Composer le 100.", "Dial 100.", "Marcar el 100.")),
        ],
      },
      {
        id: "assess-recuerdo",
        kind: "translation",
        title: lstr("B · RECUERDO", "B · RECUERDO", "B · RECUERDO"),
        instructions: lstr(
          "Aucune banque de mots, aucune page ouverte. Écris en espagnol de mémoire.",
          "No word bank, no open pages. Write in Spanish from memory.",
          "Sin banco de palabras, sin páginas abiertas. Escribe en español de memoria.",
        ),
        targetLanguage: "es",
        items: [
          ask("assess-r1", lstr("Demander où se trouve la sortie.", "Ask where the exit is.", "Preguntar dónde está la salida."), "¿Dónde está la salida?", 2),
          ask("assess-r2", lstr("Dire que tu vas à cet hôtel.", "Say you are going to this hotel.", "Decir que vas a este hotel."), "Voy a este hotel.", 2),
          ask("assess-r3", lstr("Demander le prix de la course.", "Ask the price of the ride.", "Preguntar el precio del viaje."), "¿Cuánto cuesta?", 2),
          ask("assess-r4", lstr("Donner le nom de la réservation.", "Give the name on the reservation.", "Dar el nombre de la reservación."), "A nombre de Tremblay.", 2),
          ask("assess-r5", lstr("Demander à quelle heure tu dois quitter la chambre.", "Ask what time you must leave the room.", "Preguntar a qué hora debes dejar la habitación."), "¿A qué hora es el check-out?", 2),
          ask("assess-r6", lstr("Dire que tu n'as pas d'eau chaude.", "Say you have no hot water.", "Decir que no tienes agua caliente."), "No tengo agua caliente.", 2),
          ask("assess-r7", lstr("Demander de répéter plus lentement.", "Ask someone to repeat more slowly.", "Pedir que repitan más despacio."), "¿Me puede repetir más despacio, por favor?", 2),
        ],
      },
      {
        id: "assess-produzco",
        kind: "writing",
        title: lstr("C · PRODUZCO", "C · PRODUZCO", "C · PRODUZCO"),
        instructions: lstr(
          "Trois productions courtes et indépendantes. Deux ou trois phrases chacune.",
          "Three short independent productions. Two or three sentences each.",
          "Tres producciones cortas e independientes. Dos o tres frases cada una.",
        ),
        targetLanguage: "es",
        items: [
          open("assess-p1", lstr("Ce que tu dis au chauffeur en montant dans le taxi.", "What you say to the driver as you get into the taxi.", "Lo que dices al conductor al subir al taxi."), "Buenas. Voy a este hotel. ¿Cuánto cuesta?", 3),
          open("assess-p2", lstr("Ton arrivée au comptoir : salutation, réservation, une question.", "Your arrival at the desk: greeting, reservation, one question.", "Tu llegada a recepción: saludo, reservación, una pregunta."), "Buenas tardes. Tengo una reservación a nombre de Tremblay. ¿Cuál es la contraseña del wifi?", 3),
          open("assess-p3", lstr("Un problème signalé poliment, en deux phrases.", "A problem reported politely, in two sentences.", "Un problema reportado con cortesía, en dos frases."), "La llave no funciona. ¿Me puede ayudar, por favor?", 3),
        ],
      },
      {
        id: "assess-resuelvo",
        kind: "assessment",
        title: lstr("D · RESUELVO", "D · RESUELVO", "D · RESUELVO"),
        instructions: lstr(
          "Une seule séquence, de l'aéroport jusqu'à la chambre. À toi de choisir la langue de chaque étape.",
          "One single sequence, from the airport to the room. You choose the language for each step.",
          "Una sola secuencia, desde el aeropuerto hasta la habitación. Tú eliges la lengua de cada paso.",
        ),
        targetLanguage: "es",
        items: [
          open("assess-d1", lstr("1. Aéroport : tu cherches ton transport.", "1. Airport: you look for your transportation.", "1. Aeropuerto: buscas tu transporte."), "Buenas. ¿Dónde puedo tomar un taxi?"),
          open("assess-d2", lstr("2. Transport : destination et prix.", "2. Transportation: destination and price.", "2. Transporte: destino y precio."), "Voy a este hotel. ¿Cuánto cuesta?"),
          open("assess-d3", lstr("3. Hôtel : tu te présentes et tu t'installes.", "3. Hotel: you introduce yourself and settle in.", "3. Hotel: te presentas y te instalas."), "Buenas tardes. Tengo una reservación a nombre de Tremblay."),
          open("assess-d4", lstr("4. Un problème arrive. Règle-le.", "4. A problem comes up. Deal with it.", "4. Aparece un problema. Resuélvelo."), "No tengo agua caliente. Necesito ayuda, por favor."),
          open("assess-d5", lstr("5. Tu clos l'échange.", "5. You close the exchange.", "5. Cierras el intercambio."), "Muchas gracias, muy amable.", 1),
        ],
      },
      {
        id: "assess-review",
        kind: "reflection",
        title: lstr("Auto-révision", "Self-review", "Autorrevisión"),
        instructions: lstr(
          "Corrige A et B avec la page 19, puis compare C et D avec la page 20. Compte seulement A et B, qui ont des réponses fermées.",
          "Correct A and B with page 19, then compare C and D with page 20. Only score A and B, which have closed answers.",
          "Corrige A y B con la página 19 y compara C y D con la página 20. Cuenta solo A y B, que tienen respuestas cerradas.",
        ),
        notes: [
          lstr(
            "Sur 12 : 10 à 12 = solide, continue et revois tes erreurs plus tard · 7 à 9 = en progrès, continue mais reprends les sections identifiées · 6 ou moins = à renforcer, refais les pages 17 et 6 avant d'avancer.",
            "Out of 12: 10-12 = solid, continue and revisit your errors later · 7-9 = developing, continue but review the sections you identified · 6 or fewer = needs reinforcement, redo pages 17 and 6 before moving on.",
            "Sobre 12: 10 a 12 = sólido, sigue y revisa tus errores más tarde · 7 a 9 = en progreso, sigue pero repasa las secciones identificadas · 6 o menos = a reforzar, repite las páginas 17 y 6 antes de avanzar.",
          ),
          lstr(
            "Ce contrôle mesure ta performance sur les objectifs du module 2. Il ne délivre aucune certification officielle de niveau.",
            "This check measures your performance against the Module 2 outcomes. It does not issue any official level certification.",
            "Este control mide tu desempeño frente a los objetivos del módulo 2. No entrega ninguna certificación oficial de nivel.",
          ),
        ],
        items: [
          own("assess-score", lstr("Mon score A + B, sur 12 :", "My A + B score, out of 12:", "Mi puntaje A + B, sobre 12:"), 1),
          own("assess-band", lstr("Mon interprétation : solide, en progrès ou à renforcer ?", "My reading of it: solid, developing, or needs reinforcement?", "Mi lectura: sólido, en progreso o a reforzar?"), 1),
          own("assess-next", lstr("La section que je reprends d'abord :", "The section I redo first:", "La sección que repito primero:")),
        ],
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────
  {
    id: "objective-answer-key",
    pageNumber: 19,
    kind: "answer-key",
    title: lstr("Corrigé — pratique objective", "Answer key — objective practice", "Clave — práctica objetiva"),
    purpose: lstr(
      "Vérifier les éléments fermés après avoir terminé les pages 2 à 18.",
      "Check closed-answer items after completing pages 2 to 18.",
      "Verificar los ítems cerrados después de terminar las páginas 2 a 18.",
    ),
    mechanics: ["answer-key"],
    supportLevel: "solutions",
    activities: [
      {
        id: "answer-key-objective",
        kind: "answer-key",
        title: lstr("Réponses fermées, par page", "Closed answers, page by page", "Respuestas cerradas, por página"),
        instructions: lstr(
          "Chaque référence renvoie à la page et au numéro de l'exercice. Une variante correcte qui n'est pas listée reste correcte si le sens et la politesse tiennent.",
          "Each reference points to the page and the exercise number. A correct variant that is not listed is still correct if the meaning and the politeness hold.",
          "Cada referencia indica la página y el número del ejercicio. Una variante correcta que no aparece sigue siendo correcta si el sentido y la cortesía se mantienen.",
        ),
        answerKeySection: "objective",
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────
  {
    id: "model-responses-self-assessment",
    pageNumber: 20,
    kind: "model-responses",
    title: lstr("Réponses modèles et autoévaluation", "Model responses and self-assessment", "Respuestas modelo y autoevaluación"),
    purpose: lstr(
      "Comparer tes réponses ouvertes, puis mesurer ta progression depuis la page 2.",
      "Compare your open responses, then measure your progress since page 2.",
      "Comparar tus respuestas abiertas y medir tu progreso desde la página 2.",
    ),
    mechanics: ["answer-key", "self-assessment", "speaking-prep"],
    supportLevel: "solutions",
    activities: [
      {
        id: "model-response-set",
        kind: "model-response",
        title: lstr("Réponses ouvertes possibles", "Possible open responses", "Respuestas abiertas posibles"),
        instructions: lstr(
          "Ce sont des réponses possibles, pas les seules bonnes. Compare le sens, la politesse et la longueur — pas les mots exacts.",
          "These are possible responses, not the only right ones. Compare meaning, politeness, and length — not exact words.",
          "Son respuestas posibles, no las únicas correctas. Compara sentido, cortesía y longitud, no palabras exactas.",
        ),
        answerKeySection: "model",
      },
      {
        id: "capability-check-after",
        kind: "reflection",
        title: lstr("Où tu en es maintenant", "Where you are now", "Dónde estás ahora"),
        instructions: lstr(
          "Reprends la même échelle qu'à la page 2 et compare les deux colonnes. L'écart est ton vrai résultat.",
          "Use the same scale as page 2 and compare the two columns. The gap is your real result.",
          "Usa la misma escala de la página 2 y compara las dos columnas. La diferencia es tu resultado real.",
        ),
        notes: [CAPABILITY_SCALE],
        items: CAN_DO_OUTCOMES.map((outcome) => own(`after-${outcome.id}`, outcome.label, 1)),
      },
      {
        id: "next-step",
        kind: "reflection",
        title: lstr("La suite", "What comes next", "Lo que sigue"),
        instructions: lstr(
          "Choisis un seul geste à travailler à voix haute avec un professeur Pratiqo.",
          "Choose one single action to work on out loud with a Pratiqo teacher.",
          "Elige una sola acción para trabajar en voz alta con un profesor Pratiqo.",
        ),
        notes: [
          lstr(
            "Un geste précis vaut mieux qu'une longue liste : « le check-in sans notes » se travaille en dix minutes.",
            "One precise action beats a long list: \"check-in without notes\" can be worked on in ten minutes.",
            "Una acción precisa vale más que una lista larga: «el check-in sin notas» se trabaja en diez minutos.",
          ),
        ],
        items: [
          own("next-action", lstr("À pratiquer avec mon professeur Pratiqo :", "To practice with my Pratiqo teacher:", "Para practicar con mi profesor Pratiqo:")),
        ],
      },
    ],
  },
];

// ─── Answer reference generation ───────────────────────────────────

/**
 * Assign `answerRef` labels of the form `page.index`. Generating them
 * here rather than authoring them by hand is what makes dangling and
 * duplicate references impossible: a reference exists only because an
 * answer exists on the same item.
 */
function withGeneratedAnswerRefs(pages: readonly AuthoredPage[]): readonly RdM2WorkbookPage[] {
  return pages.map((page) => {
    let counter = 0;
    return {
      ...page,
      activities: page.activities.map((activity) => ({
        ...activity,
        ...(activity.items
          ? {
              items: activity.items.map((item) => {
                if (item.answerKind !== "objective" && item.answerKind !== "model") {
                  return item as RdM2WorkbookItem;
                }
                counter += 1;
                return { ...item, answerRef: `${page.pageNumber}.${counter}` } as RdM2WorkbookItem;
              }),
            }
          : {}),
      })),
    };
  });
}

export const dominicanRepublicModule2Workbook: RdM2Workbook = {
  id: "dominican-republic-module-2-workbook-v1-1",
  moduleId: "dominican-republic-module-2",
  resourceId: "rd-m2-arrival-kit",
  title: lstr(
    "Cahier YoPratiqo 02 — Arriver et se débrouiller en République dominicaine",
    "YoPratiqo Workbook 02 — Arrive and get around in the Dominican Republic",
    "Cuaderno YoPratiqo 02 — Llegar y desenvolverte en República Dominicana",
  ),
  subtitle: lstr(
    "Aéroport, taxi, hôtel, imprévus simples et demandes de clarification.",
    "Airport, taxi, hotel, simple problems, and clarification requests.",
    "Aeropuerto, taxi, hotel, imprevistos simples y pedidos de aclaración.",
  ),
  targetLanguage: "es",
  learnerLocales: ["fr", "en", "es"],
  pages: withGeneratedAnswerRefs(authoredPages),
};

// ─── Choice resolution ────────────────────────────────────────────

/** A localized choice is scaffolding; a bare string is Spanish. */
export function isRdM2LocalizedChoice(
  choice: RdM2WorkbookChoice,
): choice is YoLocalizedString {
  return typeof choice !== "string";
}

/**
 * Resolve a choice for display. Used by the renderer and by the
 * localization tests, so a French-only option can never reach an EN or
 * ES learner without a test noticing.
 */
export function resolveRdM2WorkbookChoice(
  choice: RdM2WorkbookChoice,
  locale: YoLocale,
): { text: string; isSpanishTarget: boolean } {
  return isRdM2LocalizedChoice(choice)
    ? { text: t(choice, locale), isSpanishTarget: false }
    : { text: choice, isSpanishTarget: true };
}

// ─── Derived answer key ───────────────────────────────────────────

export interface RdM2WorkbookAnswerEntry {
  ref: string;
  kind: RdM2WorkbookAnswerKind;
  pageNumber: number;
  itemId: string;
  answer?: string;
  answerNote?: YoLocalizedString;
}

export interface RdM2WorkbookAnswerGroup {
  pageNumber: number;
  pageTitle: YoLocalizedString;
  entries: readonly RdM2WorkbookAnswerEntry[];
}

function collectAnswerEntries(
  kind: "objective" | "model",
): readonly RdM2WorkbookAnswerGroup[] {
  const groups: RdM2WorkbookAnswerGroup[] = [];
  for (const page of dominicanRepublicModule2Workbook.pages) {
    const entries: RdM2WorkbookAnswerEntry[] = [];
    for (const activity of page.activities) {
      for (const item of activity.items ?? []) {
        if (item.answerKind !== kind || !item.answerRef) continue;
        entries.push({
          ref: item.answerRef,
          kind,
          pageNumber: page.pageNumber,
          itemId: item.id,
          answer: item.answer,
          answerNote: item.answerNote,
        });
      }
    }
    if (entries.length > 0) {
      groups.push({ pageNumber: page.pageNumber, pageTitle: page.title, entries });
    }
  }
  return groups;
}

/** Objective answers, grouped by the page that asked them (page 19). */
export function buildRdM2WorkbookObjectiveKey(): readonly RdM2WorkbookAnswerGroup[] {
  return collectAnswerEntries("objective");
}

/** Possible responses for open production, grouped by page (page 20). */
export function buildRdM2WorkbookModelKey(): readonly RdM2WorkbookAnswerGroup[] {
  return collectAnswerEntries("model");
}

export function buildRdM2WorkbookAnswerGroups(
  section: "objective" | "model",
): readonly RdM2WorkbookAnswerGroup[] {
  return section === "objective"
    ? buildRdM2WorkbookObjectiveKey()
    : buildRdM2WorkbookModelKey();
}

// ─── Counting and validation ──────────────────────────────────────

/** Items the learner actually has to fill in. Zero-line rows do not count. */
export function countRdM2WorkbookPageResponses(page: RdM2WorkbookPage): number {
  return page.activities.reduce(
    (total, activity) =>
      total +
      (activity.items ?? []).filter((item) => (item.responseLines ?? 1) >= 1).length,
    0,
  );
}

export function countRdM2WorkbookResponseOpportunities(): number {
  return dominicanRepublicModule2Workbook.pages.reduce(
    (total, page) => total + countRdM2WorkbookPageResponses(page),
    0,
  );
}

/** Open production: model-answer items plus personal/self-rated items. */
export function countRdM2WorkbookOpenProductionTasks(): number {
  return dominicanRepublicModule2Workbook.pages.reduce(
    (total, page) =>
      total +
      page.activities.reduce(
        (pageTotal, activity) =>
          pageTotal +
          (activity.items ?? []).filter(
            (item) =>
              (item.responseLines ?? 1) >= 1 &&
              (item.answerKind === "model" || item.answerKind === "self"),
          ).length,
        0,
      ),
    0,
  );
}

export function countRdM2WorkbookObjectiveItems(): number {
  return dominicanRepublicModule2Workbook.pages.reduce(
    (total, page) =>
      total +
      page.activities.reduce(
        (pageTotal, activity) =>
          pageTotal +
          (activity.items ?? []).filter((item) => item.answerKind === "objective").length,
        0,
      ),
    0,
  );
}

export function listRdM2WorkbookMechanics(): string[] {
  return Array.from(
    new Set(dominicanRepublicModule2Workbook.pages.flatMap((page) => page.mechanics)),
  ).sort();
}

/**
 * Mechanical integrity check. Returns a list of human-readable problems;
 * an empty list means every answer reference resolves exactly once and
 * every item that asks for work declares how it is corrected.
 */
export function validateRdM2Workbook(): string[] {
  const problems: string[] = [];
  const refSeen = new Map<string, string>();
  const itemIds = new Set<string>();

  const resolvedRefs = new Set<string>();
  for (const section of ["objective", "model"] as const) {
    for (const group of buildRdM2WorkbookAnswerGroups(section)) {
      for (const entry of group.entries) {
        if (resolvedRefs.has(entry.ref)) {
          problems.push(`answer ref ${entry.ref} is printed more than once in the key`);
        }
        resolvedRefs.add(entry.ref);
        if (section === "model" && !entry.answer) {
          problems.push(`${entry.itemId}: model answer ref ${entry.ref} has no possible response`);
        }
        if (section === "objective" && !entry.answer && !entry.answerNote) {
          problems.push(`${entry.itemId}: objective answer ref ${entry.ref} has no answer`);
        }
      }
    }
  }

  for (const page of dominicanRepublicModule2Workbook.pages) {
    for (const activity of page.activities) {
      const activityHasGuidance = (activity.notes?.length ?? 0) > 0;
      for (const item of activity.items ?? []) {
        if (itemIds.has(item.id)) problems.push(`duplicate item id: ${item.id}`);
        itemIds.add(item.id);

        const lines = item.responseLines ?? 1;

        if (item.answerRef) {
          const previous = refSeen.get(item.answerRef);
          if (previous) {
            problems.push(`duplicate answer ref ${item.answerRef} on ${previous} and ${item.id}`);
          }
          refSeen.set(item.answerRef, item.id);
          if (!resolvedRefs.has(item.answerRef)) {
            problems.push(`dangling answer ref ${item.answerRef} on ${item.id}`);
          }
          if (!item.answerKind) {
            problems.push(`${item.id} carries an answer ref without an answerKind`);
          }
        }

        if (lines >= 1 && !item.answerKind) {
          problems.push(`${item.id} asks for work but declares no answerKind`);
        }
        if (lines === 0 && item.answerKind) {
          problems.push(`${item.id} has no writing space but declares an answerKind`);
        }
        if (item.answerKind === "self") {
          if (item.answer || item.answerNote) {
            problems.push(`${item.id} is self-assessed and must not carry a fixed answer`);
          }
          if (!activityHasGuidance) {
            problems.push(`${item.id} is self-assessed but ${activity.id} carries no guidance note`);
          }
        }
        if (item.answerKind === "model" && !item.answer) {
          problems.push(`${item.id} is open production without a possible response`);
        }
        if (item.answerKind === "objective" && !item.answer && !item.answerNote) {
          problems.push(`${item.id} is objective without an answer`);
        }
      }
    }
  }

  return problems;
}

export const RD_M2_WORKBOOK_PAGE_COUNT = dominicanRepublicModule2Workbook.pages.length;
