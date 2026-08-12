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
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

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
  | "reading"
  | "writing"
  | "speaking-prep"
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
  | "diagnostic"
  | "scenario"
  | "notice"
  | "match"
  | "fill-blank"
  | "choice"
  | "sequence"
  | "dialogue-build"
  | "translation"
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "reflection"
  | "answer-key"
  | "model-response";

export interface RdM2WorkbookItem {
  id: string;
  prompt: YoLocalizedString;
  target?: string;
  choices?: readonly string[];
  responseLines?: number;
  answerRef?: string;
}

export interface RdM2WorkbookActivity {
  id: string;
  kind: RdM2WorkbookActivityKind;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  targetLanguage?: "es";
  inputTitle?: YoLocalizedString;
  inputLines?: readonly string[];
  notes?: readonly YoLocalizedString[];
  items?: readonly RdM2WorkbookItem[];
}

export interface RdM2WorkbookPage {
  id: string;
  pageNumber: number;
  kind: RdM2WorkbookPageKind;
  title: YoLocalizedString;
  purpose: YoLocalizedString;
  mechanics: readonly RdM2WorkbookMechanic[];
  responseCount: number;
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

const target = (id: string, text: string, answerRef?: string): RdM2WorkbookItem => ({
  id,
  prompt: lstr("Écris ou répète la phrase.", "Write or repeat the phrase.", "Escribe o repite la frase."),
  target: text,
  responseLines: 1,
  answerRef,
});

export const dominicanRepublicModule2Workbook: RdM2Workbook = {
  id: "dominican-republic-module-2-workbook-v1",
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
  pages: [
    {
      id: "cover-mission",
      pageNumber: 1,
      kind: "cover",
      title: lstr("Mission du cahier", "Workbook mission", "Misión del cuaderno"),
      purpose: lstr(
        "Transformer les phrases du module en gestes de voyage utilisables.",
        "Turn the module phrases into usable travel actions.",
        "Convertir las frases del módulo en acciones útiles de viaje.",
      ),
      mechanics: ["contextual-input"],
      responseCount: 1,
      supportLevel: "guided",
      activities: [
        {
          id: "cover-goal",
          kind: "mission",
          title: lstr("Ce que tu dois pouvoir faire", "What you should be able to do", "Lo que deberías poder hacer"),
          instructions: lstr(
            "Coche l'objectif qui te semble le plus important avant de commencer.",
            "Tick the goal that feels most important before you begin.",
            "Marca el objetivo que te parece más importante antes de empezar.",
          ),
          items: [
            {
              id: "goal-airport",
              prompt: lstr("Sortir de l'aéroport et trouver le bon transport.", "Leave the airport and find the right transportation.", "Salir del aeropuerto y encontrar el transporte correcto."),
              responseLines: 1,
            },
            {
              id: "goal-hotel",
              prompt: lstr("Faire le check-in sans rester bloqué.", "Check in without freezing up.", "Hacer el check-in sin bloquearte."),
              responseLines: 1,
            },
            {
              id: "goal-problem",
              prompt: lstr("Expliquer un petit problème avec calme.", "Explain a small problem calmly.", "Explicar un problema pequeño con calma."),
              responseLines: 1,
            },
          ],
        },
      ],
    },
    {
      id: "diagnostic-retrieval",
      pageNumber: 2,
      kind: "diagnostic",
      title: lstr("Avant de commencer : récupère ce que tu sais", "Before you start: retrieve what you know", "Antes de empezar: recupera lo que sabes"),
      purpose: lstr(
        "Mesurer ton point de départ sans regarder les réponses.",
        "Measure your starting point without looking at answers.",
        "Medir tu punto de partida sin mirar respuestas.",
      ),
      mechanics: ["diagnostic-retrieval", "cumulative-retrieval"],
      responseCount: 14,
      supportLevel: "guided",
      activities: [
        {
          id: "diagnostic-phrases",
          kind: "diagnostic",
          title: lstr("Écris ce que tu peux déjà produire", "Write what you can already produce", "Escribe lo que ya puedes producir"),
          instructions: lstr(
            "Donne une phrase espagnole possible pour chaque besoin. Une réponse courte suffit.",
            "Give one possible Spanish phrase for each need. A short answer is enough.",
            "Da una frase posible en español para cada necesidad. Una respuesta corta basta.",
          ),
          targetLanguage: "es",
          items: [
            { id: "diag-taxi", prompt: lstr("Demander où prendre un taxi.", "Ask where to take a taxi.", "Preguntar dónde tomar un taxi."), responseLines: 2, answerRef: "A1" },
            { id: "diag-hotel", prompt: lstr("Dire que tu vas à cet hôtel.", "Say you are going to this hotel.", "Decir que vas a este hotel."), responseLines: 2, answerRef: "A2" },
            { id: "diag-reservation", prompt: lstr("Dire que tu as une réservation.", "Say you have a reservation.", "Decir que tienes una reservación."), responseLines: 2, answerRef: "A3" },
            { id: "diag-wifi", prompt: lstr("Demander le mot de passe du wifi.", "Ask for the Wi-Fi password.", "Pedir la contraseña del wifi."), responseLines: 2, answerRef: "A4" },
            { id: "diag-repeat", prompt: lstr("Demander de répéter.", "Ask someone to repeat.", "Pedir que repitan."), responseLines: 2, answerRef: "A5" },
            { id: "diag-thanks", prompt: lstr("Remercier poliment.", "Thank someone politely.", "Agradecer de forma amable."), responseLines: 2, answerRef: "A6" },
          ],
        },
        {
          id: "confidence-check",
          kind: "reflection",
          title: lstr("Score de confiance", "Confidence score", "Puntaje de confianza"),
          instructions: lstr(
            "Note chaque geste de 1 à 5. Reviens à cette page après la mission finale.",
            "Rate each action from 1 to 5. Return here after the final mission.",
            "Califica cada acción de 1 a 5. Vuelve aquí después de la misión final.",
          ),
          items: [
            { id: "conf-airport", prompt: lstr("Aéroport", "Airport", "Aeropuerto"), responseLines: 1 },
            { id: "conf-taxi", prompt: lstr("Taxi", "Taxi", "Taxi"), responseLines: 1 },
            { id: "conf-hotel", prompt: lstr("Hôtel", "Hotel", "Hotel"), responseLines: 1 },
            { id: "conf-problem", prompt: lstr("Petit problème", "Small problem", "Problema pequeño"), responseLines: 1 },
          ],
        },
      ],
    },
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
      responseCount: 8,
      supportLevel: "guided",
      activities: [
        {
          id: "arrival-dialogue",
          kind: "scenario",
          title: lstr("Entrée de scène", "Scene input", "Entrada de escena"),
          instructions: lstr(
            "Lis le mini-dialogue. Souligne les mots qui aident à te déplacer.",
            "Read the mini-dialogue. Underline the words that help you move around.",
            "Lee el mini-diálogo. Subraya las palabras que ayudan a moverte.",
          ),
          targetLanguage: "es",
          inputTitle: lstr("À la sortie de l'aéroport", "At the airport exit", "A la salida del aeropuerto"),
          inputLines: [
            "Viajera: Buenas. Busco la salida para taxis.",
            "Empleado: Siga derecho y luego a la izquierda.",
            "Viajera: Gracias. Voy al Hotel Coral, en Santo Domingo.",
            "Empleado: Muestre la dirección al conductor.",
          ],
          items: [
            { id: "arrival-where", prompt: lstr("Écris le mot qui indique une sortie.", "Write the word that points to an exit.", "Escribe la palabra que indica una salida."), responseLines: 1, answerRef: "B1" },
            { id: "arrival-direction", prompt: lstr("Écris deux indications de direction.", "Write two direction cues.", "Escribe dos indicaciones de dirección."), responseLines: 2, answerRef: "B2" },
            { id: "arrival-hotel", prompt: lstr("Écris la phrase qui donne la destination.", "Write the phrase that gives the destination.", "Escribe la frase que da el destino."), responseLines: 2, answerRef: "B3" },
          ],
        },
      ],
    },
    {
      id: "arrival-sdq-practice",
      pageNumber: 4,
      kind: "scenario",
      title: lstr("Scénario 1 : produire sans modèle complet", "Scenario 1: produce without a full model", "Escenario 1: producir sin modelo completo"),
      purpose: lstr(
        "Réutiliser la scène avec moins de soutien.",
        "Reuse the scene with less support.",
        "Reutilizar la escena con menos apoyo.",
      ),
      mechanics: ["controlled-form", "conversation-building", "cumulative-retrieval"],
      responseCount: 10,
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
            { id: "arrive-1", prompt: lstr("Buenas. Busco la salida para ____.", "Buenas. Busco la salida para ____.", "Buenas. Busco la salida para ____."), responseLines: 1, answerRef: "B4" },
            { id: "arrive-2", prompt: lstr("Voy ____ Hotel Coral.", "Voy ____ Hotel Coral.", "Voy ____ Hotel Coral."), responseLines: 1, answerRef: "B5" },
            { id: "arrive-3", prompt: lstr("Muestre la dirección ____ conductor.", "Muestre la dirección ____ conductor.", "Muestre la dirección ____ conductor."), responseLines: 1, answerRef: "B6" },
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
            { id: "transfer-taxi", prompt: lstr("Tu cherches la zone des taxis.", "You are looking for the taxi area.", "Buscas la zona de taxis."), responseLines: 2, answerRef: "B7" },
            { id: "transfer-uber", prompt: lstr("Tu vas à cet hôtel.", "You are going to this hotel.", "Vas a este hotel."), responseLines: 2, answerRef: "B8" },
            { id: "transfer-politeness", prompt: lstr("Tu remercies la personne.", "You thank the person.", "Agradeces a la persona."), responseLines: 1, answerRef: "B9" },
          ],
        },
      ],
    },
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
      responseCount: 10,
      supportLevel: "guided",
      activities: [
        {
          id: "detective-patterns",
          kind: "notice",
          title: lstr("Observe les patrons", "Observe the patterns", "Observa los patrones"),
          instructions: lstr(
            "Associe le patron à son rôle.",
            "Match the pattern to its job.",
            "Relaciona el patrón con su función.",
          ),
          targetLanguage: "es",
          items: [
            { id: "patron-donde", prompt: lstr("¿Dónde puedo...? →", "¿Dónde puedo...? →", "¿Dónde puedo...? →"), choices: ["lieu", "heure", "prix"], responseLines: 1, answerRef: "C1" },
            { id: "patron-tengo", prompt: lstr("Tengo una... →", "Tengo una... →", "Tengo una... →"), choices: ["avoir quelque chose", "chercher un lieu", "dire merci"], responseLines: 1, answerRef: "C2" },
            { id: "patron-cual", prompt: lstr("¿Cuál es...? →", "¿Cuál es...? →", "¿Cuál es...? →"), choices: ["identifier une information précise", "commander un plat", "refuser"], responseLines: 1, answerRef: "C3" },
            { id: "patron-puede", prompt: lstr("¿Me puede...? →", "¿Me puede...? →", "¿Me puede...? →"), choices: ["demande polie", "ordre direct", "salutation"], responseLines: 1, answerRef: "C4" },
          ],
        },
        {
          id: "detective-rewrite",
          kind: "fill-blank",
          title: lstr("Change une pièce", "Change one piece", "Cambia una pieza"),
          instructions: lstr(
            "Garde le patron, remplace seulement l'information.",
            "Keep the pattern, replace only the information.",
            "Mantén el patrón, cambia solo la información.",
          ),
          targetLanguage: "es",
          items: [
            { id: "rewrite-hotel", prompt: lstr("Voy a este hotel. → Voy a este ____.", "Voy a este hotel. → Voy a este ____.", "Voy a este hotel. → Voy a este ____."), responseLines: 1, answerRef: "C5" },
            { id: "rewrite-res", prompt: lstr("Tengo una reservación. → Tengo mi ____.", "Tengo una reservación. → Tengo mi ____.", "Tengo una reservación. → Tengo mi ____."), responseLines: 1, answerRef: "C6" },
          ],
        },
      ],
    },
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
      responseCount: 18,
      supportLevel: "guided",
      activities: [
        {
          id: "controlled-tengo",
          kind: "fill-blank",
          title: lstr("Tengo + nom", "Tengo + noun", "Tengo + sustantivo"),
          instructions: lstr("Complète chaque phrase.", "Complete each sentence.", "Completa cada frase."),
          targetLanguage: "es",
          items: [
            { id: "tengo-1", prompt: lstr("____ una reservación.", "____ una reservación.", "____ una reservación."), responseLines: 1, answerRef: "D1" },
            { id: "tengo-2", prompt: lstr("Tengo mi ____.", "Tengo mi ____.", "Tengo mi ____."), responseLines: 1, answerRef: "D2" },
            { id: "tengo-3", prompt: lstr("No tengo agua ____.", "No tengo agua ____.", "No tengo agua ____."), responseLines: 1, answerRef: "D3" },
            { id: "tengo-4", prompt: lstr("Tengo una ____ para dos noches.", "Tengo una ____ para dos noches.", "Tengo una ____ para dos noches."), responseLines: 1, answerRef: "D4" },
          ],
        },
        {
          id: "controlled-questions",
          kind: "fill-blank",
          title: lstr("Questions de service", "Service questions", "Preguntas de servicio"),
          instructions: lstr(
            "Complète avec où, quelle, heure, mot ou déjeuner selon le sens.",
            "Complete with where, which, time, word, or breakfast according to meaning.",
            "Completa con dónde, cuál, hora, palabra o desayuno según el sentido.",
          ),
          targetLanguage: "es",
          items: [
            { id: "q-1", prompt: lstr("¿____ puedo tomar un taxi?", "¿____ puedo tomar un taxi?", "¿____ puedo tomar un taxi?"), responseLines: 1, answerRef: "D5" },
            { id: "q-2", prompt: lstr("¿A qué ____ es el check-out?", "¿A qué ____ es el check-out?", "¿A qué ____ es el check-out?"), responseLines: 1, answerRef: "D6" },
            { id: "q-3", prompt: lstr("¿____ es la contraseña del wifi?", "¿____ es la contraseña del wifi?", "¿____ es la contraseña del wifi?"), responseLines: 1, answerRef: "D7" },
            { id: "q-4", prompt: lstr("¿Hay ____ incluido?", "¿Hay ____ incluido?", "¿Hay ____ incluido?"), responseLines: 1, answerRef: "D8" },
          ],
        },
      ],
    },
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
      responseCount: 18,
      supportLevel: "reduced",
      activities: [
        {
          id: "ladder-match",
          kind: "match",
          title: lstr("Niveau 1 : associer", "Level 1: match", "Nivel 1: relacionar"),
          instructions: lstr("Relie chaque mot à son rôle.", "Connect each word to its role.", "Une cada palabra con su función."),
          targetLanguage: "es",
          items: [
            { id: "match-salida", prompt: lstr("salida", "salida", "salida"), choices: ["sortie", "clé", "passeport"], responseLines: 1, answerRef: "E1" },
            { id: "match-llave", prompt: lstr("llave", "llave", "llave"), choices: ["clé", "taxi", "prix"], responseLines: 1, answerRef: "E2" },
            { id: "match-contraseña", prompt: lstr("contraseña", "contraseña", "contraseña"), choices: ["mot de passe", "chambre", "déjeuner"], responseLines: 1, answerRef: "E3" },
            { id: "match-despacio", prompt: lstr("despacio", "despacio", "despacio"), choices: ["lentement", "vite", "dehors"], responseLines: 1, answerRef: "E4" },
          ],
        },
        {
          id: "ladder-recall",
          kind: "translation",
          title: lstr("Niveau 2 : produire", "Level 2: produce", "Nivel 2: producir"),
          instructions: lstr("Cache les choix ci-dessus et écris en espagnol.", "Cover the choices above and write in Spanish.", "Cubre las opciones de arriba y escribe en español."),
          targetLanguage: "es",
          items: [
            { id: "recall-exit", prompt: lstr("sortie", "exit", "salida"), responseLines: 1, answerRef: "E5" },
            { id: "recall-room", prompt: lstr("chambre", "room", "habitación"), responseLines: 1, answerRef: "E6" },
            { id: "recall-passport", prompt: lstr("passeport", "passport", "pasaporte"), responseLines: 1, answerRef: "E7" },
            { id: "recall-breakfast", prompt: lstr("petit-déjeuner", "breakfast", "desayuno"), responseLines: 1, answerRef: "E8" },
            { id: "recall-hotwater", prompt: lstr("eau chaude", "hot water", "agua caliente"), responseLines: 1, answerRef: "E9" },
          ],
        },
        {
          id: "ladder-personalize",
          kind: "writing",
          title: lstr("Niveau 3 : personnaliser", "Level 3: personalize", "Nivel 3: personalizar"),
          instructions: lstr(
            "Écris trois choses que tu dois vraiment demander dans un hôtel.",
            "Write three things you really need to ask at a hotel.",
            "Escribe tres cosas que de verdad necesitas pedir en un hotel.",
          ),
          targetLanguage: "es",
          items: [
            { id: "personal-1", prompt: lstr("Demande 1", "Request 1", "Pedido 1"), responseLines: 2 },
            { id: "personal-2", prompt: lstr("Demande 2", "Request 2", "Pedido 2"), responseLines: 2 },
            { id: "personal-3", prompt: lstr("Demande 3", "Request 3", "Pedido 3"), responseLines: 2 },
          ],
        },
      ],
    },
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
      responseCount: 14,
      supportLevel: "reduced",
      activities: [
        {
          id: "conversation-order",
          kind: "sequence",
          title: lstr("Ordre logique", "Logical order", "Orden lógico"),
          instructions: lstr(
            "Numérote les répliques de 1 à 6.",
            "Number the turns from 1 to 6.",
            "Numera las intervenciones del 1 al 6.",
          ),
          targetLanguage: "es",
          items: [
            target("conv-1", "Gracias, muy amable.", "F6"),
            target("conv-2", "¿A nombre de quién?", "F2"),
            target("conv-3", "Buenas. Tengo una reservación.", "F1"),
            target("conv-4", "¿Cuál es la contraseña del wifi?", "F5"),
            target("conv-5", "A nombre de Tremblay.", "F3"),
            target("conv-6", "Perfecto. ¿Tiene su pasaporte?", "F4"),
          ],
        },
        {
          id: "conversation-gap",
          kind: "dialogue-build",
          title: lstr("Répare les trous", "Repair the gaps", "Repara los espacios"),
          instructions: lstr(
            "Écris la réplique manquante.",
            "Write the missing turn.",
            "Escribe la intervención que falta.",
          ),
          targetLanguage: "es",
          items: [
            { id: "gap-reservation", prompt: lstr("Réception : Buenas. / Toi : ____", "Front desk: Buenas. / You: ____", "Recepción: Buenas. / Tú: ____"), responseLines: 2, answerRef: "F7" },
            { id: "gap-passport", prompt: lstr("Réception : ¿Tiene su pasaporte? / Toi : ____", "Front desk: ¿Tiene su pasaporte? / You: ____", "Recepción: ¿Tiene su pasaporte? / Tú: ____"), responseLines: 2, answerRef: "F8" },
            { id: "gap-wifi", prompt: lstr("Après la clé, tu demandes le wifi : ____", "After the key, you ask for Wi-Fi: ____", "Después de la llave, pides el wifi: ____"), responseLines: 2, answerRef: "F9" },
          ],
        },
      ],
    },
    {
      id: "taxi-lab",
      pageNumber: 9,
      kind: "taxi-lab",
      title: lstr("Laboratoire taxi", "Taxi lab", "Laboratorio taxi"),
      purpose: lstr(
        "Passer de destination à prix sans paniquer.",
        "Move from destination to price without panic.",
        "Pasar de destino a precio sin pánico.",
      ),
      mechanics: ["choice", "conversation-building", "speaking-prep"],
      responseCount: 10,
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
            { id: "taxi-start", prompt: lstr("Tu montres l'adresse au chauffeur.", "You show the address to the driver.", "Muestras la dirección al conductor."), choices: ["Voy a este hotel.", "No tengo agua caliente.", "¿Hay desayuno incluido?"], responseLines: 1, answerRef: "G1" },
            { id: "taxi-price", prompt: lstr("Tu veux connaître le prix avant de partir.", "You want to know the price before leaving.", "Quieres saber el precio antes de salir."), choices: ["¿Cuánto cuesta?", "¿Cuál es la contraseña?", "¿Tiene mi pasaporte?"], responseLines: 1, answerRef: "G2" },
            { id: "taxi-slow", prompt: lstr("Le chauffeur parle trop vite.", "The driver speaks too fast.", "El conductor habla demasiado rápido."), choices: ["¿Puede hablar más despacio?", "Estoy en la habitación.", "No gracias."], responseLines: 1, answerRef: "G3" },
          ],
        },
        {
          id: "taxi-role-card",
          kind: "speaking",
          title: lstr("Carte de rôle", "Role card", "Tarjeta de rol"),
          instructions: lstr(
            "Prépare quatre phrases pour une course courte.",
            "Prepare four lines for a short ride.",
            "Prepara cuatro frases para un viaje corto.",
          ),
          targetLanguage: "es",
          items: [
            { id: "taxi-role-1", prompt: lstr("Saluer", "Greet", "Saludar"), responseLines: 1, answerRef: "G4" },
            { id: "taxi-role-2", prompt: lstr("Donner la destination", "Give the destination", "Dar el destino"), responseLines: 1, answerRef: "G5" },
            { id: "taxi-role-3", prompt: lstr("Demander le prix", "Ask the price", "Preguntar el precio"), responseLines: 1, answerRef: "G6" },
            { id: "taxi-role-4", prompt: lstr("Remercier", "Thank", "Agradecer"), responseLines: 1, answerRef: "G7" },
          ],
        },
      ],
    },
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
      responseCount: 12,
      supportLevel: "reduced",
      activities: [
        {
          id: "hotel-card",
          kind: "scenario",
          title: lstr("Carte de réservation", "Reservation card", "Tarjeta de reservación"),
          instructions: lstr(
            "Utilise les informations de la carte pour répondre.",
            "Use the card information to answer.",
            "Usa la información de la tarjeta para responder.",
          ),
          inputLines: [
            "Reserva: 2 noches",
            "Nombre: Alex Tremblay",
            "Hotel: Coral Azul",
            "Necesitas: wifi, desayuno, hora de salida",
          ],
          items: [
            { id: "hotel-card-1", prompt: lstr("Dire que tu as une réservation.", "Say you have a reservation.", "Decir que tienes una reservación."), responseLines: 2, answerRef: "H1" },
            { id: "hotel-card-2", prompt: lstr("Dire à quel nom elle est.", "Say whose name it is under.", "Decir a nombre de quién está."), responseLines: 2, answerRef: "H2" },
            { id: "hotel-card-3", prompt: lstr("Dire que tu as ton passeport.", "Say you have your passport.", "Decir que tienes tu pasaporte."), responseLines: 1, answerRef: "H3" },
            { id: "hotel-card-4", prompt: lstr("Demander le wifi.", "Ask about Wi-Fi.", "Preguntar por el wifi."), responseLines: 2, answerRef: "H4" },
            { id: "hotel-card-5", prompt: lstr("Demander l'heure de départ.", "Ask the checkout time.", "Preguntar la hora de salida."), responseLines: 2, answerRef: "H5" },
          ],
        },
      ],
    },
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
      mechanics: ["choice", "writing", "speaking-prep"],
      responseCount: 12,
      supportLevel: "reduced",
      activities: [
        {
          id: "problem-polite",
          kind: "choice",
          title: lstr("Calme ou trop brusque ?", "Calm or too abrupt?", "¿Calmo o demasiado brusco?"),
          instructions: lstr(
            "Coche la phrase qui reste utile et polie.",
            "Tick the line that stays useful and polite.",
            "Marca la frase útil y amable.",
          ),
          targetLanguage: "es",
          items: [
            { id: "prob-key", prompt: lstr("La clé ne marche pas.", "The key does not work.", "La llave no funciona."), choices: ["La llave no funciona.", "¡Su hotel es malo!"], responseLines: 1, answerRef: "I1" },
            { id: "prob-water", prompt: lstr("Il n'y a pas d'eau chaude.", "There is no hot water.", "No hay agua caliente."), choices: ["No tengo agua caliente.", "Esto es terrible."], responseLines: 1, answerRef: "I2" },
            { id: "prob-help", prompt: lstr("Tu as besoin d'aide.", "You need help.", "Necesitas ayuda."), choices: ["Necesito ayuda, por favor.", "Ayuda ahora."], responseLines: 1, answerRef: "I3" },
          ],
        },
        {
          id: "problem-write",
          kind: "writing",
          title: lstr("Écris au comptoir", "Write at the desk", "Escribe en recepción"),
          instructions: lstr(
            "Écris deux demandes complètes : problème + politesse.",
            "Write two complete requests: problem + politeness.",
            "Escribe dos pedidos completos: problema + cortesía.",
          ),
          targetLanguage: "es",
          items: [
            { id: "problem-write-1", prompt: lstr("Clé de chambre", "Room key", "Llave de la habitación"), responseLines: 2, answerRef: "I4" },
            { id: "problem-write-2", prompt: lstr("Eau chaude", "Hot water", "Agua caliente"), responseLines: 2, answerRef: "I5" },
          ],
        },
      ],
    },
    {
      id: "listening-lab",
      pageNumber: 12,
      kind: "listening-lab",
      title: lstr("Laboratoire d'écoute", "Listening lab", "Laboratorio de escucha"),
      purpose: lstr(
        "Préparer l'oreille à une réception rapide.",
        "Prepare your ear for a quick front desk exchange.",
        "Preparar el oído para una recepción rápida.",
      ),
      mechanics: ["listening-simulation", "choice", "noticing"],
      responseCount: 12,
      supportLevel: "guided",
      activities: [
        {
          id: "listening-script",
          kind: "listening",
          title: lstr("Écoute simulée à lire à voix haute", "Listening script to read aloud", "Guion de escucha para leer en voz alta"),
          instructions: lstr(
            "Demande à quelqu'un de lire les lignes. Réponds ensuite aux questions.",
            "Ask someone to read the lines. Then answer the questions.",
            "Pide a alguien que lea las líneas. Luego responde las preguntas.",
          ),
          targetLanguage: "es",
          inputLines: [
            "Recepción: La habitación está lista. El desayuno es de siete a diez.",
            "Recepción: El wifi se llama Coral Azul. La contraseña está en la tarjeta.",
            "Recepción: El check-out es a las once.",
          ],
          items: [
            { id: "listen-breakfast", prompt: lstr("À quelle heure commence le déjeuner ?", "What time does breakfast start?", "¿A qué hora empieza el desayuno?"), responseLines: 1, answerRef: "J1" },
            { id: "listen-wifi", prompt: lstr("Où est le mot de passe ?", "Where is the password?", "¿Dónde está la contraseña?"), responseLines: 1, answerRef: "J2" },
            { id: "listen-checkout", prompt: lstr("À quelle heure est le départ ?", "What time is checkout?", "¿A qué hora es la salida?"), responseLines: 1, answerRef: "J3" },
          ],
        },
        {
          id: "listening-repair",
          kind: "speaking",
          title: lstr("Si tu n'as pas compris", "If you did not understand", "Si no entendiste"),
          instructions: lstr("Écris deux phrases de secours.", "Write two rescue phrases.", "Escribe dos frases de rescate."),
          targetLanguage: "es",
          items: [
            { id: "repair-repeat", prompt: lstr("Demander de répéter.", "Ask to repeat.", "Pedir que repitan."), responseLines: 1, answerRef: "J4" },
            { id: "repair-slow", prompt: lstr("Demander de parler plus lentement.", "Ask someone to speak more slowly.", "Pedir que hablen más despacio."), responseLines: 1, answerRef: "J5" },
          ],
        },
      ],
    },
    {
      id: "dominican-spanish",
      pageNumber: 13,
      kind: "dominican-awareness",
      title: lstr("Espagnol qu'on peut entendre en R.D.", "Spanish you may hear in the D.R.", "Español que puedes oír en R.D."),
      purpose: lstr(
        "Reconnaître des formes courantes sans devoir les utiliser tout de suite.",
        "Recognize common forms without needing to use them right away.",
        "Reconocer formas comunes sin tener que usarlas enseguida.",
      ),
      mechanics: ["noticing", "choice", "listening-simulation"],
      responseCount: 8,
      supportLevel: "guided",
      activities: [
        {
          id: "rd-awareness",
          kind: "notice",
          title: lstr("Reconnaissance seulement", "Recognition only", "Solo reconocimiento"),
          instructions: lstr(
            "Relie ce que tu peux entendre à une version plus transparente.",
            "Connect what you may hear to a clearer version.",
            "Relaciona lo que puedes oír con una versión más clara.",
          ),
          targetLanguage: "es",
          notes: [
            lstr(
              "Ces formes servent à reconnaître. Pour parler, garde les phrases simples du module.",
              "These forms are for recognition. For speaking, keep the simple module phrases.",
              "Estas formas sirven para reconocer. Para hablar, mantén las frases simples del módulo.",
            ),
          ],
          items: [
            { id: "rd-pa", prompt: lstr("pa' →", "pa' →", "pa' →"), choices: ["para", "pero", "piso"], responseLines: 1, answerRef: "K1" },
            { id: "rd-muy", prompt: lstr("muy rápido →", "muy rápido →", "muy rápido →"), choices: ["très vite", "très loin", "très cher"], responseLines: 1, answerRef: "K2" },
            { id: "rd-ahi", prompt: lstr("por ahí →", "por ahí →", "por ahí →"), choices: ["par là", "demain", "maintenant"], responseLines: 1, answerRef: "K3" },
          ],
        },
      ],
    },
    {
      id: "real-world-reading",
      pageNumber: 14,
      kind: "reading",
      title: lstr("Lecture du monde réel", "Real-world reading", "Lectura del mundo real"),
      purpose: lstr(
        "Extraire les informations utiles d'un message d'hôtel.",
        "Extract useful information from a hotel message.",
        "Extraer información útil de un mensaje de hotel.",
      ),
      mechanics: ["reading", "contextual-input", "choice"],
      responseCount: 8,
      supportLevel: "reduced",
      activities: [
        {
          id: "hotel-message",
          kind: "reading",
          title: lstr("Message de réception", "Front desk message", "Mensaje de recepción"),
          instructions: lstr("Lis puis réponds.", "Read, then answer.", "Lee y responde."),
          targetLanguage: "es",
          inputLines: [
            "Bienvenido al Hotel Coral Azul.",
            "El desayuno está incluido de 7:00 a 10:00.",
            "El check-out es a las 11:00.",
            "Para ayuda, marque 0 desde la habitación.",
          ],
          items: [
            { id: "read-breakfast", prompt: lstr("Le déjeuner est-il inclus ?", "Is breakfast included?", "¿El desayuno está incluido?"), responseLines: 1, answerRef: "L1" },
            { id: "read-checkout", prompt: lstr("À quelle heure est le départ ?", "What time is checkout?", "¿A qué hora es la salida?"), responseLines: 1, answerRef: "L2" },
            { id: "read-help", prompt: lstr("Que dois-tu composer pour de l'aide ?", "What should you dial for help?", "¿Qué debes marcar para pedir ayuda?"), responseLines: 1, answerRef: "L3" },
          ],
        },
      ],
    },
    {
      id: "writing-workshop",
      pageNumber: 15,
      kind: "writing",
      title: lstr("Atelier d'écriture", "Writing workshop", "Taller de escritura"),
      purpose: lstr(
        "Écrire une demande courte que le personnel peut comprendre.",
        "Write a short request staff can understand.",
        "Escribir un pedido corto que el personal pueda entender.",
      ),
      mechanics: ["writing", "controlled-form", "performance-check"],
      responseCount: 8,
      supportLevel: "independent",
      activities: [
        {
          id: "write-message",
          kind: "writing",
          title: lstr("Message à la réception", "Message to the front desk", "Mensaje a recepción"),
          instructions: lstr(
            "Écris quatre phrases : salutation, problème, demande, remerciement.",
            "Write four sentences: greeting, problem, request, thanks.",
            "Escribe cuatro frases: saludo, problema, pedido, agradecimiento.",
          ),
          targetLanguage: "es",
          items: [
            { id: "write-greeting", prompt: lstr("Salutation", "Greeting", "Saludo"), responseLines: 1, answerRef: "M1" },
            { id: "write-problem", prompt: lstr("Problème : la clé ne fonctionne pas.", "Problem: the key does not work.", "Problema: la llave no funciona."), responseLines: 2, answerRef: "M2" },
            { id: "write-request", prompt: lstr("Demande d'aide", "Request for help", "Pedido de ayuda"), responseLines: 2, answerRef: "M3" },
            { id: "write-thanks", prompt: lstr("Remerciement", "Thanks", "Agradecimiento"), responseLines: 1, answerRef: "M4" },
          ],
        },
      ],
    },
    {
      id: "speaking-mission-prep",
      pageNumber: 16,
      kind: "speaking",
      title: lstr("Préparation mission orale", "Speaking mission prep", "Preparación de misión oral"),
      purpose: lstr(
        "Préparer une interaction de 45 secondes avec un professeur.",
        "Prepare a 45-second interaction with a teacher.",
        "Preparar una interacción de 45 segundos con un profesor.",
      ),
      mechanics: ["speaking-prep", "conversation-building", "self-assessment"],
      responseCount: 7,
      supportLevel: "independent",
      activities: [
        {
          id: "speaking-map",
          kind: "speaking",
          title: lstr("Carte d'interaction", "Interaction map", "Mapa de interacción"),
          instructions: lstr(
            "Prépare tes répliques. Ne rédige pas un long texte.",
            "Prepare your turns. Do not write a long text.",
            "Prepara tus intervenciones. No escribas un texto largo.",
          ),
          targetLanguage: "es",
          items: [
            { id: "speak-1", prompt: lstr("1. Saluer au comptoir.", "1. Greet at the front desk.", "1. Saludar en recepción."), responseLines: 1, answerRef: "N1" },
            { id: "speak-2", prompt: lstr("2. Dire réservation + nom.", "2. Say reservation + name.", "2. Decir reservación + nombre."), responseLines: 2, answerRef: "N2" },
            { id: "speak-3", prompt: lstr("3. Demander wifi ou déjeuner.", "3. Ask about Wi-Fi or breakfast.", "3. Preguntar por wifi o desayuno."), responseLines: 2, answerRef: "N3" },
            { id: "speak-4", prompt: lstr("4. Demander de répéter si besoin.", "4. Ask to repeat if needed.", "4. Pedir que repitan si hace falta."), responseLines: 1, answerRef: "N4" },
          ],
        },
      ],
    },
    {
      id: "cumulative-retrieval",
      pageNumber: 17,
      kind: "cumulative",
      title: lstr("Récupération cumulative", "Cumulative retrieval", "Recuperación acumulativa"),
      purpose: lstr(
        "Mélanger tout le module comme dans la vraie vie.",
        "Mix the whole module like real life.",
        "Mezclar todo el módulo como en la vida real.",
      ),
      mechanics: ["cumulative-retrieval", "choice", "translation", "speaking-prep"],
      responseCount: 14,
      supportLevel: "independent",
      activities: [
        {
          id: "cumulative-map",
          kind: "translation",
          title: lstr("12 besoins, 12 réponses", "12 needs, 12 responses", "12 necesidades, 12 respuestas"),
          instructions: lstr(
            "Écris une phrase courte pour chaque besoin.",
            "Write a short phrase for each need.",
            "Escribe una frase corta para cada necesidad.",
          ),
          targetLanguage: "es",
          items: [
            { id: "cum-1", prompt: lstr("taxi", "taxi", "taxi"), responseLines: 1, answerRef: "O1" },
            { id: "cum-2", prompt: lstr("destination", "destination", "destino"), responseLines: 1, answerRef: "O2" },
            { id: "cum-3", prompt: lstr("prix", "price", "precio"), responseLines: 1, answerRef: "O3" },
            { id: "cum-4", prompt: lstr("réservation", "reservation", "reservación"), responseLines: 1, answerRef: "O4" },
            { id: "cum-5", prompt: lstr("nom", "name", "nombre"), responseLines: 1, answerRef: "O5" },
            { id: "cum-6", prompt: lstr("passeport", "passport", "pasaporte"), responseLines: 1, answerRef: "O6" },
            { id: "cum-7", prompt: lstr("wifi", "Wi-Fi", "wifi"), responseLines: 1, answerRef: "O7" },
            { id: "cum-8", prompt: lstr("déjeuner", "breakfast", "desayuno"), responseLines: 1, answerRef: "O8" },
            { id: "cum-9", prompt: lstr("départ", "checkout", "salida"), responseLines: 1, answerRef: "O9" },
            { id: "cum-10", prompt: lstr("clé", "key", "llave"), responseLines: 1, answerRef: "O10" },
            { id: "cum-11", prompt: lstr("eau chaude", "hot water", "agua caliente"), responseLines: 1, answerRef: "O11" },
            { id: "cum-12", prompt: lstr("répéter", "repeat", "repetir"), responseLines: 1, answerRef: "O12" },
          ],
        },
      ],
    },
    {
      id: "performance-check",
      pageNumber: 18,
      kind: "performance-check",
      title: lstr("Contrôle de performance", "Module 2 performance check", "Control de desempeño"),
      purpose: lstr(
        "Prouver que tu peux agir dans une séquence complète.",
        "Show that you can act in a complete sequence.",
        "Mostrar que puedes actuar en una secuencia completa.",
      ),
      mechanics: ["performance-check", "contextual-input", "writing", "speaking-prep"],
      responseCount: 8,
      supportLevel: "independent",
      activities: [
        {
          id: "performance-input",
          kind: "scenario",
          title: lstr("Mission complète", "Complete mission", "Misión completa"),
          instructions: lstr(
            "Tu arrives à SDQ, tu prends un taxi, tu fais le check-in et tu demandes deux informations. Écris les répliques clés.",
            "You arrive at SDQ, take a taxi, check in, and ask for two pieces of information. Write the key turns.",
            "Llegas a SDQ, tomas un taxi, haces el check-in y pides dos informaciones. Escribe las frases clave.",
          ),
          targetLanguage: "es",
          items: [
            { id: "perf-1", prompt: lstr("Aéroport : trouver le taxi", "Airport: find the taxi", "Aeropuerto: encontrar el taxi"), responseLines: 2, answerRef: "P1" },
            { id: "perf-2", prompt: lstr("Taxi : donner la destination", "Taxi: give the destination", "Taxi: dar el destino"), responseLines: 2, answerRef: "P2" },
            { id: "perf-3", prompt: lstr("Hôtel : annoncer la réservation", "Hotel: state the reservation", "Hotel: anunciar la reservación"), responseLines: 2, answerRef: "P3" },
            { id: "perf-4", prompt: lstr("Hôtel : demander une information", "Hotel: ask for one piece of information", "Hotel: pedir una información"), responseLines: 2, answerRef: "P4" },
            { id: "perf-5", prompt: lstr("Problème : expliquer calmement", "Problem: explain calmly", "Problema: explicar con calma"), responseLines: 2, answerRef: "P5" },
            { id: "perf-6", prompt: lstr("Secours : demander de répéter", "Rescue: ask to repeat", "Rescate: pedir que repitan"), responseLines: 1, answerRef: "P6" },
          ],
        },
      ],
    },
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
      responseCount: 0,
      supportLevel: "solutions",
      activities: [
        {
          id: "answer-key-closed",
          kind: "answer-key",
          title: lstr("Réponses possibles", "Possible answers", "Respuestas posibles"),
          instructions: lstr(
            "Certaines productions acceptent plusieurs variantes correctes. Garde une phrase courte et polie.",
            "Some production tasks accept several correct variants. Keep the phrase short and polite.",
            "Algunas tareas de producción aceptan varias variantes correctas. Mantén la frase corta y amable.",
          ),
          targetLanguage: "es",
          items: [
            target("ak-a1", "¿Dónde puedo tomar un taxi?", "A1"),
            target("ak-a2", "Voy a este hotel.", "A2"),
            target("ak-a3", "Tengo una reservación.", "A3"),
            target("ak-a4", "¿Cuál es la contraseña del wifi?", "A4"),
            target("ak-a5", "¿Me puede repetir, por favor?", "A5"),
            target("ak-a6", "Gracias, muy amable.", "A6"),
            target("ak-b1", "salida", "B1"),
            target("ak-b2", "derecho / a la izquierda", "B2"),
            target("ak-b3", "Voy al Hotel Coral.", "B3"),
            target("ak-d5", "Dónde", "D5"),
            target("ak-d6", "hora", "D6"),
            target("ak-d7", "Cuál", "D7"),
            target("ak-e1", "salida = sortie", "E1"),
            target("ak-e2", "llave = clé", "E2"),
            target("ak-e3", "contraseña = mot de passe", "E3"),
            target("ak-e4", "despacio = lentement", "E4"),
            target("ak-j1", "A las siete.", "J1"),
            target("ak-j2", "En la tarjeta.", "J2"),
            target("ak-j3", "A las once.", "J3"),
          ],
        },
      ],
    },
    {
      id: "model-responses-self-assessment",
      pageNumber: 20,
      kind: "model-responses",
      title: lstr("Réponses modèles et autoévaluation", "Model responses and self-assessment", "Respuestas modelo y autoevaluación"),
      purpose: lstr(
        "Comparer tes réponses ouvertes sans viser une seule phrase parfaite.",
        "Compare your open responses without aiming for one perfect sentence.",
        "Comparar tus respuestas abiertas sin buscar una única frase perfecta.",
      ),
      mechanics: ["answer-key", "self-assessment", "speaking-prep"],
      responseCount: 4,
      supportLevel: "solutions",
      activities: [
        {
          id: "model-response-set",
          kind: "model-response",
          title: lstr("Réponses ouvertes possibles", "Possible open responses", "Respuestas abiertas posibles"),
          instructions: lstr(
            "Utilise ces modèles pour corriger le sens, pas pour mémoriser mot à mot.",
            "Use these models to correct meaning, not to memorize word for word.",
            "Usa estos modelos para corregir el sentido, no para memorizar palabra por palabra.",
          ),
          targetLanguage: "es",
          items: [
            target("model-taxi", "Buenas. Voy a este hotel. ¿Cuánto cuesta?", "P2"),
            target("model-checkin", "Hola. Tengo una reservación a nombre de Tremblay.", "P3"),
            target("model-wifi", "¿Cuál es la contraseña del wifi, por favor?", "P4"),
            target("model-problem", "Necesito ayuda, por favor. La llave no funciona.", "P5"),
            target("model-repeat", "¿Me puede repetir más despacio, por favor?", "P6"),
          ],
        },
        {
          id: "self-assessment",
          kind: "reflection",
          title: lstr("Autoévaluation finale", "Final self-assessment", "Autoevaluación final"),
          instructions: lstr(
            "Note chaque point de 1 à 5, puis écris la prochaine action à pratiquer avec un professeur Pratiqo.",
            "Rate each point from 1 to 5, then write the next action to practice with a Pratiqo teacher.",
            "Califica cada punto de 1 a 5 y escribe la próxima acción para practicar con un profesor Pratiqo.",
          ),
          items: [
            { id: "self-airport", prompt: lstr("Je peux sortir de l'aéroport et trouver un taxi.", "I can leave the airport and find a taxi.", "Puedo salir del aeropuerto y encontrar un taxi."), responseLines: 1 },
            { id: "self-hotel", prompt: lstr("Je peux faire le check-in.", "I can check in.", "Puedo hacer el check-in."), responseLines: 1 },
            { id: "self-problem", prompt: lstr("Je peux expliquer un petit problème.", "I can explain a small problem.", "Puedo explicar un problema pequeño."), responseLines: 1 },
            { id: "self-practice", prompt: lstr("À pratiquer avec mon professeur Pratiqo :", "To practice with my Pratiqo teacher:", "Para practicar con mi profesor Pratiqo:"), responseLines: 2 },
          ],
        },
      ],
    },
  ],
};

export const RD_M2_WORKBOOK_PAGE_COUNT = dominicanRepublicModule2Workbook.pages.length;

export function countRdM2WorkbookResponseOpportunities(): number {
  return dominicanRepublicModule2Workbook.pages.reduce(
    (total, page) => total + page.responseCount,
    0,
  );
}

export function listRdM2WorkbookMechanics(): string[] {
  return Array.from(
    new Set(dominicanRepublicModule2Workbook.pages.flatMap((page) => page.mechanics)),
  ).sort();
}
