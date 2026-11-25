import { base, dialogue, option, t } from "../italian/course/courseAuthoring";
import type { ItalianActivity } from "../italian/italianModuleTypes";
export const portugueseScenarios: Record<string, ItalianActivity> = {
  "ptbr1-u01-l3": dialogue(
    "ptbr1-meeting",
    t("Avec Ana", "With Ana", "Con Ana"),
    t(
      "Présente-toi puis demande de ralentir.",
      "Introduce yourself, then ask for a slower pace.",
      "Preséntate y pide que hable más despacio.",
    ),
    [
      {
        speaker: "Ana",
        line: "Olá! Como você se chama?",
        prompt: t(
          "Tu t’appelles Alex.",
          "Your name is Alex.",
          "Te llamas Alex.",
        ),
        correctId: "name",
        options: [
          option(
            "place",
            "Estou no Brasil.",
            t(
              "Cela indique un lieu.",
              "That gives a location.",
              "Eso indica un lugar.",
            ),
          ),
          option(
            "name",
            "Meu nome é Alex.",
            t("Tu donnes ton nom.", "You give your name.", "Dices tu nombre."),
          ),
        ],
      },
      {
        speaker: "Ana",
        line: "Prazer! Eu sou de Salvador e moro no Rio de Janeiro.",
        prompt: t(
          "Tu souhaites qu’elle ralentisse.",
          "You want her to slow down.",
          "Quieres que hable más despacio.",
        ),
        correctId: "slow",
        options: [
          option(
            "slow",
            "Mais devagar, por favor.",
            t(
              "Tu demandes de ralentir.",
              "You ask for a slower pace.",
              "Pides que hable más despacio.",
            ),
          ),
          option(
            "coffee",
            "Queria um café.",
            t(
              "Cela commande un café.",
              "That orders coffee.",
              "Eso pide un café.",
            ),
          ),
        ],
      },
    ],
    t(
      "Demander de répéter permet de continuer l’échange.",
      "Asking for repetition keeps the exchange going.",
      "Pedir que repitan permite continuar el intercambio.",
    ),
  ),
  "ptbr1-u02-l2": {
    ...base(
      "ptbr1-cafe-budget",
      t("La commande de Yoppo", "Yoppo’s order", "El pedido de Yoppo"),
      t(
        "Prépare la commande exacte dans le budget fictif.",
        "Prepare the exact order within the fictional budget.",
        "Prepara el pedido exacto con el presupuesto ficticio.",
      ),
      t(
        "Un café à six reais et deux eaux à quatre reais font quatorze reais dans ce jeu.",
        "A six-real coffee and two four-real waters total fourteen reais in this game.",
        "Un café de seis reais y dos aguas de cuatro reais suman catorce reais en este juego.",
      ),
    ),
    kind: "cafe",
    orderText: "Um café e duas águas, por favor.",
    menu: [
      { id: "coffee", it: "café", priceCents: 600 },
      { id: "water", it: "água", priceCents: 400 },
      { id: "juice", it: "suco", priceCents: 800 },
    ],
    order: [
      { itemId: "coffee", quantity: 1 },
      { itemId: "water", quantity: 2 },
    ],
    budgetCents: 1400,
  },
  "ptbr1-u03-l1": {
    ...base(
      "ptbr1-directions",
      t("Guide Yoppo", "Guide Yoppo", "Guía a Yoppo"),
      t(
        "Suis les consignes sur le plan fictif.",
        "Follow the instructions on the fictional map.",
        "Sigue las indicaciones del plano ficticio.",
      ),
      t(
        "Monte d’une case, puis va d’une case à gauche.",
        "Move one square up, then one square left.",
        "Sube una casilla y ve una casilla a la izquierda.",
      ),
    ),
    kind: "map",
    gridSize: 3,
    start: { row: 2, col: 2 },
    goal: { row: 1, col: 1 },
    path: ["up", "left"],
    instructions: ["Siga em frente.", "Vire à esquerda."],
  },
  "ptbr1-u05-l3": dialogue(
    "ptbr1-guesthouse",
    t("À la réception", "At reception", "En recepción"),
    t(
      "Décris le problème, puis remercie.",
      "Describe the problem, then give thanks.",
      "Describe el problema y agradece.",
    ),
    [
      {
        speaker: "Recepção",
        line: "Boa tarde! Como posso ajudar?",
        prompt: t(
          "La douche ne fonctionne pas.",
          "The shower does not work.",
          "La ducha no funciona.",
        ),
        correctId: "shower",
        options: [
          option(
            "reservation",
            "Tenho uma reserva.",
            t(
              "Tu annonces une réservation.",
              "You mention a reservation.",
              "Anuncias una reserva.",
            ),
          ),
          option(
            "shower",
            "O chuveiro não funciona.",
            t(
              "Le problème est précis.",
              "The problem is specific.",
              "El problema es concreto.",
            ),
          ),
        ],
      },
      {
        speaker: "Recepção",
        line: "Vou verificar agora.",
        prompt: t(
          "Tu es Ana. Remercie.",
          "You are Ana. Say thank you.",
          "Eres Ana. Da las gracias.",
        ),
        correctId: "thanks",
        options: [
          option(
            "thanks",
            "Obrigada!",
            t("Tu remercies.", "You give thanks.", "Das las gracias."),
          ),
          option(
            "time",
            "Que horas são?",
            t(
              "Tu demandes l’heure.",
              "You ask the time.",
              "Preguntas la hora.",
            ),
          ),
        ],
      },
    ],
    t(
      "Une demande précise facilite l’aide.",
      "A specific request makes help easier.",
      "Una petición precisa facilita la ayuda.",
    ),
  ),
};
