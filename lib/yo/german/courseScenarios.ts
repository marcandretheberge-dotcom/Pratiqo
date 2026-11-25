import { base, dialogue, option, t } from "../italian/course/courseAuthoring";
import type { ItalianActivity } from "../italian/italianModuleTypes";

export const germanScenarios: Record<string, ItalianActivity> = {
  "de1-u01-l3": dialogue(
    "de1-first-dialogue",
    t("Une rencontre avec Nora", "Meet Nora", "Conoce a Nora"),
    t(
      "Présente-toi, puis demande de parler plus lentement.",
      "Introduce yourself, then ask to speak more slowly.",
      "Preséntate y pide hablar más despacio.",
    ),
    [
      {
        speaker: "Nora",
        line: "Hallo! Wie heißt du?",
        prompt: t(
          "Tu t’appelles Sami.",
          "Your name is Sami.",
          "Te llamas Sami.",
        ),
        correctId: "name",
        options: [
          option(
            "place",
            "Ich wohne in Berlin.",
            t(
              "Cela indique où tu habites.",
              "That says where you live.",
              "Eso indica dónde vives.",
            ),
          ),
          option(
            "name",
            "Ich heiße Sami.",
            t("Tu donnes ton nom.", "You give your name.", "Dices tu nombre."),
          ),
        ],
      },
      {
        speaker: "Nora",
        line: "Ich komme aus Deutschland und wohne in Berlin.",
        prompt: t(
          "Tu veux qu’elle ralentisse.",
          "You want her to slow down.",
          "Quieres que hable más despacio.",
        ),
        correctId: "slow",
        options: [
          option(
            "slow",
            "Langsamer, bitte.",
            t(
              "Tu demandes un rythme plus lent.",
              "You ask for a slower pace.",
              "Pides un ritmo más lento.",
            ),
          ),
          option(
            "coffee",
            "Einen Kaffee, bitte.",
            t(
              "C’est une commande de café.",
              "That orders coffee.",
              "Eso pide un café.",
            ),
          ),
        ],
      },
    ],
    t(
      "Tu peux demander de ralentir sans abandonner la conversation.",
      "You can ask someone to slow down without giving up the conversation.",
      "Puedes pedir que hablen despacio sin abandonar la conversación.",
    ),
  ),
  "de1-u02-l2": {
    ...base(
      "de1-bakery-budget",
      t("La commande de Yoppo", "Yoppo’s order", "El pedido de Yoppo"),
      t(
        "Prépare exactement la commande sans dépasser le budget fictif.",
        "Prepare the exact order within the fictional budget.",
        "Prepara el pedido exacto sin superar el presupuesto ficticio.",
      ),
      t(
        "Deux petits pains et un café coûtent sept euros dans ce jeu.",
        "Two bread rolls and a coffee cost seven euros in this game.",
        "Dos panecillos y un café cuestan siete euros en este juego.",
      ),
    ),
    kind: "cafe",
    orderText: "Zwei Brötchen und einen Kaffee, bitte.",
    menu: [
      { id: "roll", it: "das Brötchen", priceCents: 200 },
      { id: "coffee", it: "der Kaffee", priceCents: 300 },
      { id: "pretzel", it: "die Brezel", priceCents: 250 },
    ],
    order: [
      { itemId: "roll", quantity: 2 },
      { itemId: "coffee", quantity: 1 },
    ],
    budgetCents: 700,
  },
  "de1-u03-l1": {
    ...base(
      "de1-directions",
      t("Guide Yoppo", "Guide Yoppo", "Guía a Yoppo"),
      t(
        "Suis ces deux déplacements sur le plan fictif.",
        "Follow these two moves on the fictional map.",
        "Sigue estos dos movimientos en el plano ficticio.",
      ),
      t(
        "Avance d’une case, puis tourne à droite d’une case.",
        "Move one square up, then one square right.",
        "Avanza una casilla y luego una a la derecha.",
      ),
    ),
    kind: "map",
    gridSize: 3,
    start: { row: 2, col: 0 },
    goal: { row: 1, col: 1 },
    path: ["up", "right"],
    instructions: ["Gehen Sie geradeaus.", "Dann nach rechts."],
  },
  "de1-u05-l3": dialogue(
    "de1-hotel-dialogue",
    t("À la réception", "At reception", "En recepción"),
    t(
      "Signale le problème, puis remercie.",
      "Report the problem, then say thank you.",
      "Comunica el problema y agradece.",
    ),
    [
      {
        speaker: "Rezeption",
        line: "Guten Tag! Kann ich Ihnen helfen?",
        prompt: t(
          "Le Wi-Fi ne fonctionne pas.",
          "The Wi-Fi does not work.",
          "El wifi no funciona.",
        ),
        correctId: "wifi",
        options: [
          option(
            "wifi",
            "Das WLAN funktioniert nicht.",
            t(
              "Le problème est clair.",
              "The problem is clear.",
              "El problema está claro.",
            ),
          ),
          option(
            "room",
            "Ein Zimmer für zwei Nächte.",
            t(
              "Cela demande une chambre.",
              "That asks for a room.",
              "Eso pide una habitación.",
            ),
          ),
        ],
      },
      {
        speaker: "Rezeption",
        line: "Ja, ich helfe Ihnen.",
        prompt: t(
          "Remercie pour l’aide.",
          "Thank them for their help.",
          "Agradece la ayuda.",
        ),
        correctId: "thanks",
        options: [
          option(
            "where",
            "Wo ist der Bahnhof?",
            t(
              "C’est une question sur la gare.",
              "That asks about the station.",
              "Eso pregunta por la estación.",
            ),
          ),
          option(
            "thanks",
            "Danke für Ihre Hilfe.",
            t(
              "Tu remercies poliment.",
              "You thank them politely.",
              "Agradeces con cortesía.",
            ),
          ),
        ],
      },
    ],
    t(
      "Un problème précis, une demande polie et un remerciement.",
      "A specific problem, a polite request and thanks.",
      "Un problema concreto, una petición cortés y un agradecimiento.",
    ),
  ),
};
