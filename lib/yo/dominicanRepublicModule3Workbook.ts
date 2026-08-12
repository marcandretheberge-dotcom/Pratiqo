/**
 * Original YoPratiqo instructional content.
 *
 * Module 3 workbook: eating, ordering, and paying in the Dominican
 * Republic. This is a print-first companion to the digital Module 3
 * flow, not a PDF download and not a copy of Module 2.
 *
 * Architecture:
 * - answer references are generated from objective/model items;
 * - response counts are derived from writable items;
 * - answer pages are isolated at the end;
 * - cultural material is recognition-first and source-review tracked.
 */

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type RdM3WorkbookPriority =
  | "CORE PERFORMANCE"
  | "SUPPORTING LANGUAGE"
  | "CULTURAL RECOGNITION"
  | "ENRICHMENT";

export type RdM3WorkbookMechanic =
  | "baseline-retrieval"
  | "menu-literacy"
  | "food-recognition"
  | "culture-recognition"
  | "language-detective"
  | "controlled-form"
  | "fill-blank"
  | "retrieval-ladder"
  | "matching"
  | "choice"
  | "constraint-solving"
  | "order-building"
  | "dialogue-build"
  | "repair-strategy"
  | "digital-listening"
  | "gist"
  | "detail"
  | "dictation"
  | "shadowing"
  | "payment-lab"
  | "guided-writing"
  | "speaking-prep"
  | "transfer-task"
  | "cumulative-retrieval"
  | "performance-check"
  | "self-assessment"
  | "answer-key";

export type RdM3WorkbookPageKind =
  | "cover"
  | "diagnostic"
  | "menu-scan"
  | "menu-literacy"
  | "food-recognition"
  | "culture-recognition"
  | "language-detective"
  | "controlled-practice"
  | "retrieval"
  | "order-building"
  | "constraint-lab"
  | "repair-lab"
  | "listening-bridge"
  | "payment-lab"
  | "writing"
  | "speaking"
  | "cumulative"
  | "performance-check"
  | "answer-key"
  | "model-responses";

export type RdM3WorkbookActivityKind =
  | "mission"
  | "can-do"
  | "diagnostic"
  | "menu"
  | "scan"
  | "notice"
  | "match"
  | "fill-blank"
  | "choice"
  | "language-detective"
  | "dialogue-build"
  | "constraint"
  | "repair"
  | "listening"
  | "bill"
  | "writing"
  | "speaking"
  | "assessment"
  | "reflection"
  | "answer-key"
  | "model-response";

export type RdM3WorkbookChoice = string | YoLocalizedString;
export type RdM3WorkbookAnswerKind = "objective" | "model" | "self";

export interface RdM3WorkbookItem {
  id: string;
  prompt: YoLocalizedString;
  target?: string;
  choices?: readonly RdM3WorkbookChoice[];
  responseLines?: number;
  answerRef?: string;
  answerKind?: RdM3WorkbookAnswerKind;
  answer?: string;
  answerNote?: YoLocalizedString;
}

export interface RdM3WorkbookActivity {
  id: string;
  kind: RdM3WorkbookActivityKind;
  title: YoLocalizedString;
  instructions: YoLocalizedString;
  targetLanguage?: "es";
  inputTitle?: YoLocalizedString;
  inputLines?: readonly string[];
  steps?: readonly YoLocalizedString[];
  digitalPath?: string;
  notes?: readonly YoLocalizedString[];
  items?: readonly RdM3WorkbookItem[];
  answerKeySection?: "objective" | "model";
}

export interface RdM3WorkbookPage {
  id: string;
  pageNumber: number;
  kind: RdM3WorkbookPageKind;
  title: YoLocalizedString;
  purpose: YoLocalizedString;
  mechanics: readonly RdM3WorkbookMechanic[];
  supportLevel: "guided" | "reduced" | "independent" | "assessment" | "solutions";
  activities: readonly RdM3WorkbookActivity[];
}

export interface RdM3Workbook {
  id: string;
  moduleId: "dominican-republic-module-3";
  resourceId: "rd-m3-practice-sheets";
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
  targetLanguage: "es";
  learnerLocales: readonly ["fr", "en", "es"];
  pages: readonly RdM3WorkbookPage[];
}

export interface RdM3CurriculumInventoryEntry {
  target: string;
  existingSource: string;
  priority: RdM3WorkbookPriority;
  workbookEvidence: string;
}

type AuthoredItem = Omit<RdM3WorkbookItem, "answerRef">;
type AuthoredPage = Omit<RdM3WorkbookPage, "activities"> & {
  activities: readonly (Omit<RdM3WorkbookActivity, "items"> & {
    items?: readonly AuthoredItem[];
  })[];
};

const MODULE_3_DIGITAL_PATH =
  "/yo/langues/espagnol/pays/republique-dominicaine/module-3";

const CAPABILITY_SCALE = lstr(
  "Échelle : 0 = aucune idée · 1 = je reconnais · 2 = je peux produire avec mes notes · 3 = je peux produire sans aide.",
  "Scale: 0 = no idea · 1 = I recognize it · 2 = I can produce it with notes · 3 = I can produce it without help.",
  "Escala: 0 = ninguna idea · 1 = lo reconozco · 2 = lo produzco con notas · 3 = lo produzco sin ayuda.",
);

const PRICE_DISCLAIMER = lstr(
  "Tous les menus, montants et reçus de ce cahier sont fictifs et servent seulement à pratiquer la langue.",
  "All menus, amounts, and receipts in this workbook are fictional and only support language practice.",
  "Todos los menús, montos y recibos de este cuaderno son ficticios y solo sirven para practicar el idioma.",
);

const ALLERGY_SAFETY_NOTE = lstr(
  "Si une allergie est possible, vérifie toujours avec le personnel et ne te fie jamais seulement à une fiche d'exercice.",
  "If an allergy is possible, always confirm with staff and never rely only on a worksheet.",
  "Si hay una posible alergia, confirma siempre con el personal y no dependas solo de una hoja de práctica.",
);

const ask = (
  id: string,
  prompt: YoLocalizedString,
  answer: string,
  responseLines = 1,
  choices?: readonly RdM3WorkbookChoice[],
  target?: string,
): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "objective",
  answer,
  ...(choices ? { choices } : {}),
  ...(target ? { target } : {}),
});

const askMeaning = (
  id: string,
  prompt: YoLocalizedString,
  answerNote: YoLocalizedString,
  choices?: readonly RdM3WorkbookChoice[],
  responseLines = 1,
  target?: string,
): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "objective",
  answerNote,
  ...(choices ? { choices } : {}),
  ...(target ? { target } : {}),
});

const open = (
  id: string,
  prompt: YoLocalizedString,
  answer: string,
  responseLines = 2,
  target?: string,
): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "model",
  answer,
  ...(target ? { target } : {}),
});

const own = (id: string, prompt: YoLocalizedString, responseLines = 2): AuthoredItem => ({
  id,
  prompt,
  responseLines,
  answerKind: "self",
});

const tick = (id: string, prompt: YoLocalizedString): AuthoredItem => ({
  id,
  prompt,
  responseLines: 0,
});

const CAN_DO_OUTCOMES = [
  ["recommend", "ask for a recommendation", "¿Qué me recomienda?"],
  ["typical", "say you want to try something typical", "Quiero probar algo típico."],
  ["contents", "ask what comes with a dish", "¿Qué viene con...?"],
  ["spice", "state spice preferences", "Sin picante / un poco picante"],
  ["drink", "order a natural juice or coffee", "Quiero un jugo de chinola."],
  ["place", "choose eat-in or takeaway", "Para comer aquí / para llevar"],
  ["pay", "ask for the bill and payment method", "¿Me trae la cuenta?"],
  ["repair", "repair fast restaurant Spanish", "Más despacio, por favor."],
] as const;

const CORE_PHRASES = [
  ["recommend", "¿Qué me recomienda?", "demander conseil"],
  ["typical", "Quiero probar algo típico.", "commander avec curiosité"],
  ["mangu", "¿Tiene mangú?", "vérifier un plat"],
  ["comes", "¿Qué viene con la bandera?", "demander les accompagnements"],
  ["contains", "¿Qué trae este plato?", "demander le contenu"],
  ["spicy", "¿Es picante?", "vérifier le piquant"],
  ["no-spice", "Sin picante, por favor.", "préférence alimentaire"],
  ["little-spice", "Un poco picante está bien.", "préférence nuancée"],
  ["juice", "¿Tiene jugo natural?", "boisson"],
  ["flavors", "¿Qué sabores tiene?", "choisir une saveur"],
  ["chinola", "Quiero un jugo de chinola.", "commander une boisson"],
  ["coffee", "Un café, por favor.", "commander simplement"],
  ["sugar", "Sin azúcar, por favor.", "préférence boisson"],
  ["ice", "Con hielo, por favor.", "préférence boisson"],
  ["here", "Para comer aquí.", "sur place"],
  ["takeaway", "Para llevar, por favor.", "à emporter"],
  ["bill", "¿Me trae la cuenta, por favor?", "demander l'addition"],
  ["cost", "¿Cuánto cuesta?", "demander le prix"],
  ["card", "¿Acepta tarjeta?", "paiement carte"],
  ["cash", "¿Puedo pagar en efectivo?", "paiement comptant"],
  ["service", "¿Está incluido el servicio?", "clarifier la facture"],
  ["receipt", "¿Me puede dar un recibo?", "demander un reçu"],
  ["thanks", "Gracias, muy amable.", "remercier"],
  ["repeat", "¿Me puede repetir, por favor?", "réparer l'écoute"],
  ["slow", "Más despacio, por favor.", "ralentir"],
  ["last-part", "No entendí la última parte.", "réparer une partie"],
  ["say", "¿Cómo se dice eso?", "apprendre sur place"],
  ["allergy", "Soy alérgico/alérgica a...", "alerte allergie"],
  ["no-meat", "No como carne.", "préférence alimentaire"],
  ["vegetarian", "¿Tiene una opción vegetariana?", "option végétarienne"],
] as const;

const MENU_ITEMS = [
  ["mangu", "Mangú con los tres golpes", "desayuno", "plátano, queso, huevo, salami", "RD$ 320"],
  ["bandera", "La bandera de hoy", "almuerzo", "arroz, habichuelas, pollo, ensalada", "RD$ 410"],
  ["sancocho", "Sancocho del día", "plato fuerte", "caldo espeso, carnes, víveres", "RD$ 520"],
  ["pescado", "Pescado frito", "plato fuerte", "pescado, tostones, ensalada", "RD$ 650"],
  ["mofongo", "Mofongo sencillo", "plato fuerte", "plátano majado, ajo, caldo", "RD$ 480"],
  ["tostones", "Tostones", "acompañamiento", "plátano verde frito", "RD$ 160"],
  ["jugo", "Jugo natural", "bebida", "chinola, piña o mango", "RD$ 130"],
  ["cafe", "Café dominicano", "bebida", "café; azúcar aparte", "RD$ 80"],
] as const;

const FOOD_TERMS = [
  ["el mangú", "purée de plantain vert"],
  ["la bandera", "riz, haricots, viande et salade"],
  ["el sancocho", "ragoût consistant"],
  ["los tostones", "plantain vert frit"],
  ["el pescado frito", "poisson frit"],
  ["las habichuelas", "haricots"],
  ["el arroz", "riz"],
  ["el pollo guisado", "poulet mijoté"],
  ["la ensalada", "salade"],
  ["el jugo natural", "jus naturel"],
  ["la chinola", "fruit de la passion"],
  ["el morir soñando", "boisson orange et lait"],
  ["el café", "café"],
  ["la cuenta", "addition"],
  ["el recibo", "reçu"],
] as const;

const CULTURE_RECOGNITION = [
  ["mangu", "Le mangú est présenté comme un déjeuner dominicain à reconnaître.", "mangú"],
  ["bandera", "La bandera apparaît comme plat typique du midi à reconnaître.", "la bandera"],
  ["chinola", "Chinola est un mot dominicain utile pour fruit de la passion.", "chinola"],
  ["merengue", "Le merengue est une expression culturelle dominicaine reconnue par l'UNESCO.", "merengue"],
  ["bachata", "La bachata est liée au patrimoine culturel dominicain.", "bachata"],
  ["zona", "La Ciudad Colonial de Santo Domingo est un repère patrimonial reconnu par l'UNESCO.", "Zona Colonial"],
] as const;

const GRAMMAR_PATTERNS = [
  ["quiero-noun", "Quiero + nom", "Quiero un jugo de chinola."],
  ["tiene", "¿Tiene...?", "¿Tiene mangú?"],
  ["viene-con", "¿Qué viene con...?", "¿Qué viene con la bandera?"],
  ["trae", "¿Qué trae...?", "¿Qué trae este plato?"],
  ["cuanto", "¿Cuánto cuesta...?", "¿Cuánto cuesta?"],
  ["acepta", "¿Acepta...?", "¿Acepta tarjeta?"],
  ["para", "Para comer aquí / para llevar", "Para llevar, por favor."],
  ["sin-con", "Sin / con", "Sin azúcar. Con hielo."],
  ["me-trae", "¿Me trae...?", "¿Me trae la cuenta?"],
  ["me-puede", "¿Me puede...?", "¿Me puede repetir?"],
] as const;

const M2_REVIEW = [
  ["¿Dónde está la salida?", "sortie"],
  ["Voy a este hotel.", "taxi"],
  ["Tengo una reservación.", "hôtel"],
  ["¿Cuál es la contraseña del wifi?", "hôtel"],
  ["¿Me puede ayudar?", "aide"],
  ["Más despacio, por favor.", "réparer"],
] as const;

const BASICS_REVIEW = [
  ["Hola.", "saluer"],
  ["Buenos días.", "saluer"],
  ["Por favor.", "politesse"],
  ["Gracias.", "politesse"],
] as const;

export const rdM3CurriculumInventory: readonly RdM3CurriculumInventoryEntry[] = [
  ...CORE_PHRASES.map(([id, target]) => ({
    target,
    existingSource: `dominicanRepublicFoodCulture.phraseBank.${id}`,
    priority: "CORE PERFORMANCE" as const,
    workbookEvidence: "Pages 2, 8-14, 16-20",
  })),
  ...GRAMMAR_PATTERNS.map(([id, target]) => ({
    target,
    existingSource: `dominicanRepublicFoodCulture.grammarCards.${id}`,
    priority: "SUPPORTING LANGUAGE" as const,
    workbookEvidence: "Pages 8-11",
  })),
  ...CULTURE_RECOGNITION.map(([id, target]) => ({
    target,
    existingSource: `dominicanRepublicFoodCulture.cultureCards.${id}`,
    priority: "CULTURAL RECOGNITION" as const,
    workbookEvidence: "Pages 6-7 and 20",
  })),
  ...FOOD_TERMS.slice(0, 11).map(([target]) => ({
    target,
    existingSource: "dominicanRepublicFoodCulture.foodCards / flashcards",
    priority: "ENRICHMENT" as const,
    workbookEvidence: "Pages 4-7",
  })),
];

const page1: AuthoredPage = {
  id: "mission-and-baseline",
  pageNumber: 1,
  kind: "cover",
  title: lstr(
    "Mission : commander sans bloquer",
    "Mission: order without freezing",
    "Misión: pedir sin bloquearte",
  ),
  purpose: lstr(
    "Tu prépares une commande simple, une demande de clarification et un paiement calme.",
    "You prepare a simple order, a clarification request, and a calm payment.",
    "Preparas un pedido sencillo, una aclaración y un pago tranquilo.",
  ),
  mechanics: ["baseline-retrieval", "self-assessment"],
  supportLevel: "guided",
  activities: [
    {
      id: "mission-contract",
      kind: "mission",
      title: lstr("Ce cahier travaille quatre gestes", "This workbook trains four moves", "Este cuaderno entrena cuatro gestos"),
      instructions: lstr(
        "Lis les objectifs, coche ceux que tu reconnais, puis donne une note de départ.",
        "Read the goals, tick what you recognize, then give yourself a starting score.",
        "Lee los objetivos, marca lo que reconoces y ponte una nota inicial.",
      ),
      notes: [CAPABILITY_SCALE, PRICE_DISCLAIMER],
      items: [
        ...CAN_DO_OUTCOMES.map(([id, label, phrase]) =>
          tick(
            `can-do-${id}`,
            lstr(`${label} — ${phrase}`, `${label} — ${phrase}`, `${label} — ${phrase}`),
          ),
        ),
        own("baseline-confidence", lstr("Ma note de départ pour commander au restaurant :", "My starting score for ordering in a restaurant:", "Mi punto de partida para pedir en un restaurante:"), 1),
      ],
    },
  ],
};

const page2: AuthoredPage = {
  id: "diagnostic-without-notes",
  pageNumber: 2,
  kind: "diagnostic",
  title: lstr("Diagnostic : sans regarder", "Diagnostic: without looking", "Diagnóstico: sin mirar"),
  purpose: lstr(
    "Mesure ce qui sort déjà avant la pratique guidée.",
    "Measure what already comes out before guided practice.",
    "Mide lo que ya sale antes de la práctica guiada.",
  ),
  mechanics: ["baseline-retrieval", "choice", "fill-blank"],
  supportLevel: "guided",
  activities: [
    {
      id: "diagnostic-core",
      kind: "diagnostic",
      title: lstr("Dix phrases essentielles", "Ten essential phrases", "Diez frases esenciales"),
      instructions: lstr(
        "Écris une phrase espagnole courte pour chaque besoin. Réponses fermées à la fin.",
        "Write one short Spanish phrase for each need. Closed answers are at the end.",
        "Escribe una frase corta en español para cada necesidad. Respuestas cerradas al final.",
      ),
      targetLanguage: "es",
      items: [
        ask("diag-recommend", lstr("Demander une recommandation.", "Ask for a recommendation.", "Pedir una recomendación."), "¿Qué me recomienda?"),
        ask("diag-typical", lstr("Dire que tu veux essayer quelque chose de typique.", "Say you want to try something typical.", "Decir que quieres probar algo típico."), "Quiero probar algo típico."),
        ask("diag-contains", lstr("Demander ce que contient le plat.", "Ask what the dish includes.", "Preguntar qué trae el plato."), "¿Qué trae este plato?"),
        ask("diag-spicy", lstr("Demander si c'est piquant.", "Ask if it is spicy.", "Preguntar si es picante."), "¿Es picante?"),
        ask("diag-no-spice", lstr("Demander sans piquant.", "Ask for no spice.", "Pedir sin picante."), "Sin picante, por favor."),
        ask("diag-juice", lstr("Commander un jus de chinola.", "Order passion fruit juice.", "Pedir jugo de chinola."), "Quiero un jugo de chinola."),
        ask("diag-takeaway", lstr("Dire que c'est à emporter.", "Say it is to go.", "Decir que es para llevar."), "Para llevar, por favor."),
        ask("diag-bill", lstr("Demander l'addition.", "Ask for the bill.", "Pedir la cuenta."), "¿Me trae la cuenta, por favor?"),
        ask("diag-card", lstr("Demander s'ils acceptent la carte.", "Ask if they accept card.", "Preguntar si aceptan tarjeta."), "¿Acepta tarjeta?"),
        ask("diag-repeat", lstr("Demander de répéter.", "Ask them to repeat.", "Pedir que repitan."), "¿Me puede repetir, por favor?"),
      ],
    },
    {
      id: "diagnostic-choice",
      kind: "choice",
      title: lstr("Reconnaissance rapide", "Fast recognition", "Reconocimiento rápido"),
      instructions: lstr("Entoure la meilleure option.", "Circle the best option.", "Marca la mejor opción."),
      targetLanguage: "es",
      items: [
        ask("diag-choice-card", lstr("Payer par carte.", "Pay by card.", "Pagar con tarjeta."), "¿Acepta tarjeta?", 1, ["¿Acepta tarjeta?", "¿Tiene leche?", "Para comer aquí."]),
        ask("diag-choice-slow", lstr("L'espagnol est trop rapide.", "Spanish is too fast.", "El español va demasiado rápido."), "Más despacio, por favor.", 1, ["Un café, por favor.", "Más despacio, por favor.", "¿Cuánto cuesta?"]),
        ask("diag-choice-allergy", lstr("Tu dois signaler une allergie.", "You need to signal an allergy.", "Necesitas avisar de una alergia."), "Soy alérgico/alérgica a...", 1, ["Soy alérgico/alérgica a...", "Está muy bueno.", "Gracias, muy amable."]),
      ],
    },
  ],
};

const page3: AuthoredPage = {
  id: "fictional-menu-scan",
  pageNumber: 3,
  kind: "menu-scan",
  title: lstr("Menu fictif : scanner avant de commander", "Fictional menu: scan before ordering", "Menú ficticio: leer antes de pedir"),
  purpose: lstr(
    "Trouve les catégories, les prix fictifs et les informations manquantes.",
    "Find categories, fictional prices, and missing information.",
    "Encuentra categorías, precios ficticios e información faltante.",
  ),
  mechanics: ["menu-literacy", "choice", "matching"],
  supportLevel: "guided",
  activities: [
    {
      id: "menu-input",
      kind: "menu",
      title: lstr("Comedor Brisa Clara — menu de pratique", "Comedor Brisa Clara — practice menu", "Comedor Brisa Clara — menú de práctica"),
      instructions: lstr("Menu fictif : ne l'utilise pas comme référence de prix réelle.", "Fictional menu: do not use it as a real price reference.", "Menú ficticio: no lo uses como referencia de precios reales."),
      inputTitle: lstr("Menu", "Menu", "Menú"),
      inputLines: MENU_ITEMS.map(([, name, category, contents, price]) => `${name} · ${category} · ${contents} · ${price}`),
      notes: [PRICE_DISCLAIMER],
      items: MENU_ITEMS.slice(0, 4).map(([id, name, category]) =>
        askMeaning(
          `menu-category-${id}`,
          lstr(`Catégorie de : ${name}`, `Category for: ${name}`, `Categoría de: ${name}`),
          lstr(category, category, category),
        ),
      ),
    },
    {
      id: "menu-find-details",
      kind: "scan",
      title: lstr("Extraction", "Extraction", "Extracción"),
      instructions: lstr("Réponds à partir du menu fictif.", "Answer from the fictional menu.", "Responde a partir del menú ficticio."),
      targetLanguage: "es",
      items: [
        ask("menu-price-jugo", lstr("Prix fictif du jugo natural.", "Fictional price of the jugo natural.", "Precio ficticio del jugo natural."), "RD$ 130"),
        ask("menu-contains-bandera", lstr("Deux éléments dans la bandera.", "Two items in la bandera.", "Dos elementos de la bandera."), "arroz y habichuelas"),
        ask("menu-ask-missing", lstr("Quelle phrase demandes-tu si une information manque ?", "What phrase do you ask if information is missing?", "¿Qué frase usas si falta información?"), "¿Qué trae este plato?"),
        open("menu-personal-choice", lstr("Choisis un plat et écris une commande courte.", "Choose one dish and write a short order.", "Elige un plato y escribe un pedido corto."), "Quiero la bandera, por favor."),
      ],
    },
  ],
};

const page4: AuthoredPage = {
  id: "menu-literacy-food-terms",
  pageNumber: 4,
  kind: "menu-literacy",
  title: lstr("Lire les mots du menu", "Read menu words", "Leer palabras del menú"),
  purpose: lstr("Associe mots, catégories et fonctions avant de produire.", "Match words, categories, and functions before producing.", "Relaciona palabras, categorías y funciones antes de producir."),
  mechanics: ["menu-literacy", "food-recognition", "matching"],
  supportLevel: "guided",
  activities: [
    {
      id: "food-match",
      kind: "match",
      title: lstr("Mots de nourriture", "Food words", "Palabras de comida"),
      instructions: lstr("Écris le sens court en français, anglais ou espagnol.", "Write the short meaning in French, English, or Spanish.", "Escribe el significado corto en francés, inglés o español."),
      targetLanguage: "es",
      items: FOOD_TERMS.slice(0, 10).map(([term, meaning]) =>
        askMeaning(`food-${term.replace(/\W+/g, "-")}`, lstr("Sens :", "Meaning:", "Significado:"), lstr(meaning, meaning, meaning), undefined, 1, term),
      ),
    },
    {
      id: "menu-function-match",
      kind: "match",
      title: lstr("Fonction dans le repas", "Meal function", "Función en la comida"),
      instructions: lstr("Relie au bon rôle : plat, accompagnement, boisson ou paiement.", "Match the role: dish, side, drink, or payment.", "Relaciona el papel: plato, acompañamiento, bebida o pago."),
      targetLanguage: "es",
      items: [
        askMeaning("function-tostones", lstr("los tostones", "los tostones", "los tostones"), lstr("accompagnement", "side", "acompañamiento")),
        askMeaning("function-chinola", lstr("la chinola", "la chinola", "la chinola"), lstr("boisson / fruit", "drink / fruit", "bebida / fruta")),
        askMeaning("function-cuenta", lstr("la cuenta", "la cuenta", "la cuenta"), lstr("paiement", "payment", "pago")),
        askMeaning("function-mangu", lstr("el mangú", "el mangú", "el mangú"), lstr("plat", "dish", "plato")),
      ],
    },
  ],
};

const page5: AuthoredPage = {
  id: "food-recognition-retrieval",
  pageNumber: 5,
  kind: "food-recognition",
  title: lstr("Reconnaître, puis récupérer", "Recognize, then retrieve", "Reconocer y luego recordar"),
  purpose: lstr("Passe du menu à la phrase utile.", "Move from menu to useful phrase.", "Pasa del menú a la frase útil."),
  mechanics: ["food-recognition", "retrieval-ladder", "choice"],
  supportLevel: "guided",
  activities: [
    {
      id: "food-to-order-phrase",
      kind: "choice",
      title: lstr("Quel plat, quelle phrase ?", "Which dish, which phrase?", "¿Qué plato, qué frase?"),
      instructions: lstr("Entoure la phrase qui correspond au besoin.", "Circle the phrase that fits the need.", "Marca la frase que corresponde a la necesidad."),
      targetLanguage: "es",
      items: [
        ask("phrase-mangu", lstr("Tu veux savoir s'il y a du mangú.", "You want to know if there is mangú.", "Quieres saber si hay mangú."), "¿Tiene mangú?", 1, ["¿Tiene mangú?", "¿Acepta tarjeta?", "Con hielo, por favor."]),
        ask("phrase-bandera", lstr("Tu veux essayer un plat typique.", "You want to try a typical dish.", "Quieres probar un plato típico."), "Quiero probar algo típico.", 1, ["Quiero probar algo típico.", "No entendí la última parte.", "¿Me puede dar un recibo?"]),
        ask("phrase-contents", lstr("Tu ne sais pas ce que le plat contient.", "You do not know what the dish includes.", "No sabes qué trae el plato."), "¿Qué trae este plato?", 1, ["¿Qué trae este plato?", "Para comer aquí.", "Un café, por favor."]),
        ask("phrase-juice", lstr("Tu veux demander les saveurs de jus.", "You want to ask juice flavors.", "Quieres preguntar por sabores de jugos."), "¿Qué sabores tiene?", 1, ["¿Qué sabores tiene?", "¿Dónde pasa la guagua?", "Está muy bueno."]),
      ],
    },
    {
      id: "food-recall",
      kind: "diagnostic",
      title: lstr("Récupération courte", "Short retrieval", "Recuperación corta"),
      instructions: lstr("Cache les choix ci-dessus et écris les phrases.", "Cover the choices above and write the phrases.", "Tapa las opciones de arriba y escribe las frases."),
      targetLanguage: "es",
      items: [
        ask("recall-typical", lstr("Essayer quelque chose de typique.", "Try something typical.", "Probar algo típico."), "Quiero probar algo típico."),
        ask("recall-flavors", lstr("Demander les saveurs.", "Ask the flavors.", "Preguntar los sabores."), "¿Qué sabores tiene?"),
        ask("recall-dish-contents", lstr("Demander le contenu du plat.", "Ask what the dish includes.", "Preguntar qué trae el plato."), "¿Qué trae este plato?"),
        ask("recall-service", lstr("Demander si le service est inclus.", "Ask if service is included.", "Preguntar si el servicio está incluido."), "¿Está incluido el servicio?"),
      ],
    },
  ],
};

const page6: AuthoredPage = {
  id: "culture-source-reviewed",
  pageNumber: 6,
  kind: "culture-recognition",
  title: lstr("Culture : reconnaître sans généraliser", "Culture: recognize without generalizing", "Cultura: reconocer sin generalizar"),
  purpose: lstr("Utilise la culture comme repère, pas comme stéréotype.", "Use culture as a reference point, not a stereotype.", "Usa la cultura como referencia, no como estereotipo."),
  mechanics: ["culture-recognition", "choice"],
  supportLevel: "guided",
  activities: [
    {
      id: "culture-recognition",
      kind: "notice",
      title: lstr("Repères à reconnaître", "Reference points to recognize", "Referencias para reconocer"),
      instructions: lstr("Associe le repère à une phrase prudente.", "Match the reference with a cautious phrase.", "Relaciona la referencia con una frase cuidadosa."),
      notes: [
        lstr(
          "Ce cahier dit « tu peux voir/entendre » plutôt que « tout le monde fait ».",
          "This workbook says “you may see/hear” instead of “everyone does.”",
          "Este cuaderno dice «puedes ver/escuchar» en vez de «todo el mundo hace».",
        ),
      ],
      targetLanguage: "es",
      items: [
        askMeaning("culture-mangu", lstr("mangú", "mangú", "mangú"), lstr("déjeuner dominicain à reconnaître", "Dominican breakfast item to recognize", "desayuno dominicano para reconocer")),
        askMeaning("culture-bandera", lstr("la bandera", "la bandera", "la bandera"), lstr("plat typique du midi à reconnaître", "typical midday plate to recognize", "plato típico del mediodía para reconocer")),
        askMeaning("culture-chinola", lstr("chinola", "chinola", "chinola"), lstr("mot dominicain pour fruit de la passion", "Dominican word for passion fruit", "palabra dominicana para maracuyá")),
        askMeaning("culture-merengue", lstr("merengue", "merengue", "merengue"), lstr("musique et danse associées à la RD", "music and dance associated with the DR", "música y baile asociados con RD")),
        askMeaning("culture-bachata", lstr("bachata", "bachata", "bachata"), lstr("référence culturelle dominicaine", "Dominican cultural reference", "referencia cultural dominicana")),
        askMeaning("culture-zona", lstr("Zona Colonial", "Zona Colonial", "Zona Colonial"), lstr("repère historique à Santo Domingo", "historic reference in Santo Domingo", "referencia histórica en Santo Domingo")),
      ],
    },
  ],
};

const page7: AuthoredPage = {
  id: "culture-to-conversation",
  pageNumber: 7,
  kind: "culture-recognition",
  title: lstr("Transformer un repère en question", "Turn a reference into a question", "Convertir una referencia en pregunta"),
  purpose: lstr("Tu reconnais un mot culturel et tu poses une question simple.", "You recognize a cultural word and ask a simple question.", "Reconoces una palabra cultural y haces una pregunta sencilla."),
  mechanics: ["culture-recognition", "order-building", "speaking-prep"],
  supportLevel: "reduced",
  activities: [
    {
      id: "culture-question-builder",
      kind: "dialogue-build",
      title: lstr("Questions sûres", "Safe questions", "Preguntas seguras"),
      instructions: lstr("Écris une question courte. Évite les phrases qui généralisent.", "Write one short question. Avoid sentences that generalize.", "Escribe una pregunta corta. Evita frases que generalizan."),
      targetLanguage: "es",
      items: [
        open("culture-q-music", lstr("Tu entends de la musique et tu veux identifier le style.", "You hear music and want to identify the style.", "Escuchas música y quieres identificar el estilo."), "¿Es bachata o merengue?"),
        open("culture-q-colmado", lstr("Tu cherches un commerce de quartier.", "You are looking for a neighborhood shop.", "Buscas un negocio de barrio."), "¿Dónde hay un colmado cerca?"),
        open("culture-q-cacao", lstr("Tu vois un produit au cacao et tu veux en savoir plus.", "You see a cacao product and want to know more.", "Ves un producto de cacao y quieres saber más."), "¿Es de cacao dominicano?"),
        open("culture-q-place", lstr("Tu parles d'un lieu historique.", "You talk about a historic place.", "Hablas de un lugar histórico."), "Quiero visitar la Zona Colonial."),
        own("culture-own-note", lstr("Un repère culturel que je veux seulement reconnaître, pas produire :", "One cultural reference I only want to recognize, not produce:", "Una referencia cultural que solo quiero reconocer, no producir:"), 1),
      ],
      notes: [
        lstr("Objectif : reconnaître et demander avec respect, pas faire des affirmations absolues.", "Goal: recognize and ask respectfully, not make absolute claims.", "Objetivo: reconocer y preguntar con respeto, no hacer afirmaciones absolutas."),
      ],
    },
  ],
};

const page8: AuthoredPage = {
  id: "language-detective-patterns",
  pageNumber: 8,
  kind: "language-detective",
  title: lstr("Détective de langue : les patrons utiles", "Language detective: useful patterns", "Detective de lengua: patrones útiles"),
  purpose: lstr("Tu vois la mécanique avant de la pratiquer.", "You see the mechanics before practicing.", "Ves la mecánica antes de practicar."),
  mechanics: ["language-detective", "matching", "controlled-form"],
  supportLevel: "guided",
  activities: [
    {
      id: "pattern-match",
      kind: "language-detective",
      title: lstr("Patron → fonction", "Pattern → function", "Patrón → función"),
      instructions: lstr("Associe chaque patron à sa fonction.", "Match each pattern with its function.", "Relaciona cada patrón con su función."),
      targetLanguage: "es",
      items: GRAMMAR_PATTERNS.map(([id, label, example]) =>
        askMeaning(`pattern-${id}`, lstr(label, label, label), lstr(example, example, example), undefined, 1, example),
      ),
    },
    {
      id: "pattern-noticing",
      kind: "notice",
      title: lstr("Remarque", "Notice", "Observa"),
      instructions: lstr("Entoure le morceau qui change dans chaque phrase.", "Circle the part that changes in each phrase.", "Marca la parte que cambia en cada frase."),
      targetLanguage: "es",
      items: [
        ask("notice-tiene", lstr("¿Tiene mangú? / ¿Tiene jugo natural?", "¿Tiene mangú? / ¿Tiene jugo natural?", "¿Tiene mangú? / ¿Tiene jugo natural?"), "mangú / jugo natural"),
        ask("notice-con", lstr("Con hielo. / Sin azúcar.", "Con hielo. / Sin azúcar.", "Con hielo. / Sin azúcar."), "con / sin"),
        ask("notice-me-puede", lstr("¿Me puede repetir? / ¿Me puede dar un recibo?", "¿Me puede repetir? / ¿Me puede dar un recibo?", "¿Me puede repetir? / ¿Me puede dar un recibo?"), "repetir / dar un recibo"),
      ],
    },
  ],
};

const page9: AuthoredPage = {
  id: "controlled-practice-food",
  pageNumber: 9,
  kind: "controlled-practice",
  title: lstr("Pratique contrôlée : commander", "Controlled practice: ordering", "Práctica controlada: pedir"),
  purpose: lstr("Tu modifies une phrase avec un seul choix.", "You modify one phrase with one choice.", "Modificas una frase con una sola decisión."),
  mechanics: ["controlled-form", "fill-blank"],
  supportLevel: "guided",
  activities: [
    {
      id: "fill-ordering",
      kind: "fill-blank",
      title: lstr("Complète", "Complete", "Completa"),
      instructions: lstr("Utilise : recomienda, típico, trae, picante, natural, sabores, chinola, café, hielo, azúcar.", "Use: recomienda, típico, trae, picante, natural, sabores, chinola, café, hielo, azúcar.", "Usa: recomienda, típico, trae, picante, natural, sabores, chinola, café, hielo, azúcar."),
      targetLanguage: "es",
      items: [
        ask("fill-recommend", lstr("¿Qué me ____?", "¿Qué me ____?", "¿Qué me ____?"), "recomienda"),
        ask("fill-typical", lstr("Quiero probar algo ____.", "Quiero probar algo ____.", "Quiero probar algo ____."), "típico"),
        ask("fill-trae", lstr("¿Qué ____ este plato?", "¿Qué ____ este plato?", "¿Qué ____ este plato?"), "trae"),
        ask("fill-picante", lstr("¿Es ____?", "¿Es ____?", "¿Es ____?"), "picante"),
        ask("fill-natural", lstr("¿Tiene jugo ____?", "¿Tiene jugo ____?", "¿Tiene jugo ____?"), "natural"),
        ask("fill-sabores", lstr("¿Qué ____ tiene?", "¿Qué ____ tiene?", "¿Qué ____ tiene?"), "sabores"),
        ask("fill-chinola", lstr("Quiero un jugo de ____.", "Quiero un jugo de ____.", "Quiero un jugo de ____."), "chinola"),
        ask("fill-cafe", lstr("Un ____, por favor.", "Un ____, por favor.", "Un ____, por favor."), "café"),
        ask("fill-hielo", lstr("Con ____, por favor.", "Con ____, por favor.", "Con ____, por favor."), "hielo"),
        ask("fill-azucar", lstr("Sin ____, por favor.", "Sin ____, por favor.", "Sin ____, por favor."), "azúcar"),
      ],
    },
  ],
};

const page10: AuthoredPage = {
  id: "controlled-practice-payment",
  pageNumber: 10,
  kind: "controlled-practice",
  title: lstr("Pratique contrôlée : payer", "Controlled practice: paying", "Práctica controlada: pagar"),
  purpose: lstr("Tu termines le repas sans pression.", "You end the meal without pressure.", "Terminas la comida sin presión."),
  mechanics: ["controlled-form", "fill-blank", "choice"],
  supportLevel: "guided",
  activities: [
    {
      id: "fill-payment",
      kind: "fill-blank",
      title: lstr("Paiement", "Payment", "Pago"),
      instructions: lstr("Complète avec : aquí, llevar, cuenta, cuesta, tarjeta, efectivo, servicio, recibo.", "Complete with: aquí, llevar, cuenta, cuesta, tarjeta, efectivo, servicio, recibo.", "Completa con: aquí, llevar, cuenta, cuesta, tarjeta, efectivo, servicio, recibo."),
      targetLanguage: "es",
      items: [
        ask("fill-aqui", lstr("Para comer ____.", "Para comer ____.", "Para comer ____."), "aquí"),
        ask("fill-llevar", lstr("Para ____, por favor.", "Para ____, por favor.", "Para ____, por favor."), "llevar"),
        ask("fill-cuenta", lstr("¿Me trae la ____, por favor?", "¿Me trae la ____, por favor?", "¿Me trae la ____, por favor?"), "cuenta"),
        ask("fill-cuesta", lstr("¿Cuánto ____?", "¿Cuánto ____?", "¿Cuánto ____?"), "cuesta"),
        ask("fill-tarjeta", lstr("¿Acepta ____?", "¿Acepta ____?", "¿Acepta ____?"), "tarjeta"),
        ask("fill-efectivo", lstr("¿Puedo pagar en ____?", "¿Puedo pagar en ____?", "¿Puedo pagar en ____?"), "efectivo"),
        ask("fill-servicio", lstr("¿Está incluido el ____?", "¿Está incluido el ____?", "¿Está incluido el ____?"), "servicio"),
        ask("fill-recibo", lstr("¿Me puede dar un ____?", "¿Me puede dar un ____?", "¿Me puede dar un ____?"), "recibo"),
      ],
    },
    {
      id: "payment-choice",
      kind: "choice",
      title: lstr("Choix rapide", "Quick choice", "Elección rápida"),
      instructions: lstr("Entoure la phrase qui respecte le contexte.", "Circle the phrase that fits the context.", "Marca la frase que corresponde al contexto."),
      targetLanguage: "es",
      items: [
        ask("choice-receipt", lstr("Tu as besoin d'un reçu.", "You need a receipt.", "Necesitas un recibo."), "¿Me puede dar un recibo?", 1, ["¿Me puede dar un recibo?", "¿Es picante?", "Quiero probar algo típico."]),
        ask("choice-service", lstr("Tu ne sais pas si le service est inclus.", "You do not know if service is included.", "No sabes si el servicio está incluido."), "¿Está incluido el servicio?", 1, ["¿Está incluido el servicio?", "Con hielo, por favor.", "No como carne."]),
      ],
    },
  ],
};

const page11: AuthoredPage = {
  id: "retrieval-ladder-one",
  pageNumber: 11,
  kind: "retrieval",
  title: lstr("Échelle de récupération", "Retrieval ladder", "Escalera de recuperación"),
  purpose: lstr("Tu passes de l'indice à la phrase complète.", "You move from cue to full phrase.", "Pasas de la pista a la frase completa."),
  mechanics: ["retrieval-ladder", "controlled-form"],
  supportLevel: "reduced",
  activities: [
    {
      id: "ladder-food",
      kind: "diagnostic",
      title: lstr("Sans choix", "No choices", "Sin opciones"),
      instructions: lstr("Écris la phrase espagnole complète.", "Write the complete Spanish phrase.", "Escribe la frase completa en español."),
      targetLanguage: "es",
      items: [
        ask("ladder-recommend", lstr("recommandation", "recommendation", "recomendación"), "¿Qué me recomienda?"),
        ask("ladder-mangu", lstr("mangú disponible", "mangú available", "mangú disponible"), "¿Tiene mangú?"),
        ask("ladder-comes", lstr("ce qui vient avec", "what comes with it", "lo que viene con"), "¿Qué viene con la bandera?"),
        ask("ladder-picante", lstr("sans piquant", "no spice", "sin picante"), "Sin picante, por favor."),
        ask("ladder-little-spice", lstr("un peu piquant accepté", "a little spice is fine", "un poco picante está bien"), "Un poco picante está bien."),
        ask("ladder-juice", lstr("jus naturel", "natural juice", "jugo natural"), "¿Tiene jugo natural?"),
        ask("ladder-chinola", lstr("jus de chinola", "passion fruit juice", "jugo de chinola"), "Quiero un jugo de chinola."),
        ask("ladder-coffee", lstr("un café", "a coffee", "un café"), "Un café, por favor."),
      ],
    },
  ],
};

const page12: AuthoredPage = {
  id: "build-an-order",
  pageNumber: 12,
  kind: "order-building",
  title: lstr("Construire une commande", "Build an order", "Construir un pedido"),
  purpose: lstr("Tu assembles une commande courte et polie.", "You assemble a short, polite order.", "Construyes un pedido corto y cortés."),
  mechanics: ["order-building", "dialogue-build", "speaking-prep"],
  supportLevel: "reduced",
  activities: [
    {
      id: "order-sequence",
      kind: "dialogue-build",
      title: lstr("Ordre logique", "Logical order", "Orden lógico"),
      instructions: lstr("Mets les morceaux en ordre : ouvrir, choisir, préciser, remercier.", "Put the parts in order: open, choose, specify, thank.", "Ordena las partes: abrir, elegir, precisar, agradecer."),
      targetLanguage: "es",
      items: [
        askMeaning("seq-open", lstr("¿Qué me recomienda?", "¿Qué me recomienda?", "¿Qué me recomienda?"), lstr("1", "1", "1")),
        askMeaning("seq-choose", lstr("Quiero probar algo típico.", "Quiero probar algo típico.", "Quiero probar algo típico."), lstr("2", "2", "2")),
        askMeaning("seq-specify", lstr("Sin picante, por favor.", "Sin picante, por favor.", "Sin picante, por favor."), lstr("3", "3", "3")),
        askMeaning("seq-thanks", lstr("Gracias, muy amable.", "Gracias, muy amable.", "Gracias, muy amable."), lstr("4", "4", "4")),
      ],
    },
    {
      id: "order-production",
      kind: "writing",
      title: lstr("Ta commande", "Your order", "Tu pedido"),
      instructions: lstr("Écris trois versions : très guidée, réduite, puis indépendante.", "Write three versions: guided, reduced, then independent.", "Escribe tres versiones: guiada, reducida e independiente."),
      targetLanguage: "es",
      items: [
        open("order-guided", lstr("Version guidée avec recommandation et choix.", "Guided version with recommendation and choice.", "Versión guiada con recomendación y elección."), "¿Qué me recomienda? Quiero probar algo típico."),
        open("order-reduced", lstr("Version réduite avec plat et préférence.", "Reduced version with dish and preference.", "Versión reducida con plato y preferencia."), "Quiero la bandera, sin picante, por favor."),
        own("order-independent", lstr("Version indépendante selon ton goût.", "Independent version based on your taste.", "Versión independiente según tu gusto."), 3),
      ],
      notes: [
        lstr("Score personnel : est-ce court, clair et poli ?", "Personal score: is it short, clear, and polite?", "Autoevaluación: ¿es corto, claro y cortés?"),
      ],
    },
  ],
};

const page13: AuthoredPage = {
  id: "constraint-information-gap",
  pageNumber: 13,
  kind: "constraint-lab",
  title: lstr("Contraintes : demander avant de décider", "Constraints: ask before deciding", "Restricciones: preguntar antes de decidir"),
  purpose: lstr("Tu protèges tes besoins alimentaires sans dramatiser.", "You protect food needs without overdramatizing.", "Proteges necesidades alimentarias sin dramatizar."),
  mechanics: ["constraint-solving", "choice", "guided-writing"],
  supportLevel: "reduced",
  activities: [
    {
      id: "constraint-choice",
      kind: "constraint",
      title: lstr("Besoin → phrase", "Need → phrase", "Necesidad → frase"),
      instructions: lstr("Choisis ou produis la phrase qui réduit le risque.", "Choose or produce the phrase that lowers risk.", "Elige o produce la frase que reduce el riesgo."),
      targetLanguage: "es",
      items: [
        ask("constraint-allergy", lstr("Allergie à un aliment.", "Allergy to a food.", "Alergia a un alimento."), "Soy alérgico/alérgica a...", 1, ["Soy alérgico/alérgica a...", "Está muy bueno.", "Para comer aquí."]),
        ask("constraint-no-meat", lstr("Tu ne manges pas de viande.", "You do not eat meat.", "No comes carne."), "No como carne."),
        ask("constraint-vegetarian", lstr("Tu cherches une option végétarienne.", "You are looking for a vegetarian option.", "Buscas una opción vegetariana."), "¿Tiene una opción vegetariana?"),
        open("constraint-sauce", lstr("Tu veux savoir si la sauce est piquante.", "You want to know if the sauce is spicy.", "Quieres saber si la salsa es picante."), "¿Es picante la salsa?"),
      ],
      notes: [ALLERGY_SAFETY_NOTE],
    },
    {
      id: "information-gap",
      kind: "scan",
      title: lstr("Information manquante", "Missing information", "Información faltante"),
      instructions: lstr("Le menu ne dit pas tout. Écris la question qui manque.", "The menu does not say everything. Write the missing question.", "El menú no dice todo. Escribe la pregunta que falta."),
      targetLanguage: "es",
      items: [
        open("gap-side", lstr("Tu ne sais pas l'accompagnement.", "You do not know the side dish.", "No sabes el acompañamiento."), "¿Qué viene con el plato?"),
        open("gap-price", lstr("Le prix n'est pas clair.", "The price is not clear.", "El precio no está claro."), "¿Cuánto cuesta?"),
        open("gap-flavors", lstr("Les saveurs de jus ne sont pas affichées.", "Juice flavors are not displayed.", "No aparecen los sabores de jugos."), "¿Qué sabores tiene?"),
      ],
    },
  ],
};

const page14: AuthoredPage = {
  id: "unavailable-repair",
  pageNumber: 14,
  kind: "repair-lab",
  title: lstr("Quand le plat n'est pas disponible", "When the dish is unavailable", "Cuando no hay el plato"),
  purpose: lstr("Tu répares la commande sans perdre le rythme.", "You repair the order without losing rhythm.", "Reparas el pedido sin perder el ritmo."),
  mechanics: ["repair-strategy", "choice", "dialogue-build"],
  supportLevel: "reduced",
  activities: [
    {
      id: "repair-choice",
      kind: "choice",
      title: lstr("Choisis la réparation", "Choose the repair", "Elige la reparación"),
      instructions: lstr("Entoure la réponse naturelle.", "Circle the natural response.", "Marca la respuesta natural."),
      targetLanguage: "es",
      inputTitle: lstr("Situation", "Situation", "Situación"),
      inputLines: [
        "Cliente: ¿Tiene mangú?",
        "Empleado: No, hoy no tenemos mangú.",
      ],
      items: [
        ask("repair-recommendation", lstr("Réponse naturelle.", "Natural response.", "Respuesta natural."), "¿Qué me recomienda?", 1, ["¿Qué me recomienda?", "¿Acepta tarjeta?", "Con hielo, por favor."]),
        ask("repair-typical", lstr("Tu veux rester sur un plat local.", "You want to stay with a local dish.", "Quieres quedarte con un plato local."), "Quiero probar algo típico."),
        open("repair-full", lstr("Écris une réparation en deux phrases.", "Write a two-sentence repair.", "Escribe una reparación en dos frases."), "No hay problema. ¿Qué me recomienda?"),
      ],
    },
    {
      id: "repeat-repair",
      kind: "repair",
      title: lstr("Quand tu n'as pas compris", "When you did not understand", "Cuando no entendiste"),
      instructions: lstr("Choisis la phrase qui garde la conversation ouverte.", "Choose the phrase that keeps the conversation open.", "Elige la frase que mantiene la conversación abierta."),
      targetLanguage: "es",
      items: [
        ask("repair-repeat", lstr("Répéter.", "Repeat.", "Repetir."), "¿Me puede repetir, por favor?"),
        ask("repair-slow", lstr("Plus lentement.", "More slowly.", "Más despacio."), "Más despacio, por favor."),
        ask("repair-last", lstr("Dernière partie non comprise.", "Last part not understood.", "Última parte no entendida."), "No entendí la última parte."),
        ask("repair-how-say", lstr("Demander comment dire.", "Ask how to say it.", "Preguntar cómo se dice."), "¿Cómo se dice eso?"),
      ],
    },
  ],
};

const page15: AuthoredPage = {
  id: "digital-listening-bridge",
  pageNumber: 15,
  kind: "listening-bridge",
  title: lstr("Pont d'écoute vers le module numérique", "Listening bridge to the digital module", "Puente de escucha al módulo digital"),
  purpose: lstr("Tu utilises l'audio existant du module 3, sans nouvelle infrastructure.", "You use existing Module 3 audio, with no new infrastructure.", "Usas el audio existente del módulo 3, sin nueva infraestructura."),
  mechanics: ["digital-listening", "gist", "detail", "dictation", "shadowing"],
  supportLevel: "independent",
  activities: [
    {
      id: "listening-path",
      kind: "listening",
      title: lstr("Ouvre l'écran d'écoute du Module 3", "Open the Module 3 listening screen", "Abre la pantalla de escucha del Módulo 3"),
      instructions: lstr("Écoute une fois pour le sens, une fois pour les détails, puis reviens ici.", "Listen once for gist, once for details, then return here.", "Escucha una vez por la idea general, otra por detalles y vuelve aquí."),
      digitalPath: MODULE_3_DIGITAL_PATH,
      steps: [
        lstr("Écoute sans écrire.", "Listen without writing.", "Escucha sin escribir."),
        lstr("Réécoute et note trois mots.", "Listen again and note three words.", "Escucha otra vez y anota tres palabras."),
        lstr("Lis à voix basse une phrase courte.", "Read one short phrase quietly.", "Lee una frase corta en voz baja."),
      ],
      notes: [
        lstr("Chemin principal : tu peux faire l'activité seul. Un prof peut ensuite corriger rythme et intonation.", "Primary path: you can do it alone. A teacher can later correct rhythm and intonation.", "Camino principal: puedes hacerlo solo. Un profesor puede corregir ritmo e entonación después."),
      ],
      targetLanguage: "es",
      items: [
        askMeaning("listen-gist", lstr("Gist : le sujet général est...", "Gist: the general topic is...", "Idea general: el tema es..."), lstr("commander / manger / payer", "ordering / eating / paying", "pedir / comer / pagar")),
        ask("listen-detail-1", lstr("Détail entendu : un mot de nourriture.", "Detail heard: one food word.", "Detalle escuchado: una palabra de comida."), "mangú"),
        ask("listen-detail-2", lstr("Détail entendu : une phrase de réparation.", "Detail heard: one repair phrase.", "Detalle escuchado: una frase de reparación."), "¿Me puede repetir, por favor?"),
        open("listen-dictation", lstr("Dictée courte : écris une phrase entendue.", "Short dictation: write one phrase you heard.", "Dictado corto: escribe una frase que escuchaste."), "¿Qué me recomienda?"),
        own("listen-shadowing", lstr("Shadowing : note une phrase que tu peux répéter en 6 secondes.", "Shadowing: note one phrase you can repeat in 6 seconds.", "Shadowing: anota una frase que puedes repetir en 6 segundos."), 1),
      ],
    },
  ],
};

const page16: AuthoredPage = {
  id: "fictional-payment-lab",
  pageNumber: 16,
  kind: "payment-lab",
  title: lstr("Laboratoire de paiement fictif", "Fictional payment lab", "Laboratorio de pago ficticio"),
  purpose: lstr("Tu lis une facture pédagogique et tu poses les bonnes questions.", "You read a pedagogical bill and ask the right questions.", "Lees una cuenta pedagógica y haces las preguntas correctas."),
  mechanics: ["payment-lab", "menu-literacy", "choice"],
  supportLevel: "independent",
  activities: [
    {
      id: "fictional-bill",
      kind: "bill",
      title: lstr("Cuenta de práctica", "Practice bill", "Cuenta de práctica"),
      instructions: lstr("Montants fictifs. Réponds seulement pour pratiquer la langue.", "Fictional amounts. Answer only to practice language.", "Montos ficticios. Responde solo para practicar el idioma."),
      inputTitle: lstr("Cuenta ficticia", "Fictional bill", "Cuenta ficticia"),
      inputLines: [
        "La bandera de hoy · RD$ 410",
        "Jugo de chinola · RD$ 130",
        "Café dominicano · RD$ 80",
        "Total de práctica · RD$ 620",
        "Servicio: preguntar al personal.",
      ],
      notes: [PRICE_DISCLAIMER],
      targetLanguage: "es",
      items: [
        ask("bill-total", lstr("Total de pratique.", "Practice total.", "Total de práctica."), "RD$ 620"),
        ask("bill-ask-service", lstr("Question pour clarifier le service.", "Question to clarify service.", "Pregunta para aclarar el servicio."), "¿Está incluido el servicio?"),
        ask("bill-pay-card", lstr("Question pour payer par carte.", "Question to pay by card.", "Pregunta para pagar con tarjeta."), "¿Acepta tarjeta?"),
        ask("bill-cash", lstr("Question pour payer comptant.", "Question to pay cash.", "Pregunta para pagar en efectivo."), "¿Puedo pagar en efectivo?"),
        ask("bill-receipt", lstr("Question pour demander un reçu.", "Question to ask for a receipt.", "Pregunta para pedir un recibo."), "¿Me puede dar un recibo?"),
        open("bill-end-politely", lstr("Termine avec une phrase polie.", "End with a polite phrase.", "Termina con una frase cortés."), "Gracias, muy amable."),
      ],
    },
  ],
};

const page17: AuthoredPage = {
  id: "writing-workshop",
  pageNumber: 17,
  kind: "writing",
  title: lstr("Atelier d'écriture : mini-script", "Writing workshop: mini-script", "Taller de escritura: mini-guion"),
  purpose: lstr("Tu passes du canevas à ton propre script.", "You move from scaffold to your own script.", "Pasas del esquema a tu propio guion."),
  mechanics: ["guided-writing", "order-building"],
  supportLevel: "independent",
  activities: [
    {
      id: "script-scaffold",
      kind: "writing",
      title: lstr("Manipule le canevas", "Manipulate the scaffold", "Manipula el esquema"),
      instructions: lstr("Écris chaque version en espagnol.", "Write each version in Spanish.", "Escribe cada versión en español."),
      targetLanguage: "es",
      items: [
        open("script-recommend", lstr("Ouvre avec une recommandation.", "Open with a recommendation.", "Abre con una recomendación."), "Hola. ¿Qué me recomienda?"),
        open("script-order", lstr("Commande un plat et une boisson.", "Order one dish and one drink.", "Pide un plato y una bebida."), "Quiero la bandera y un jugo de chinola, por favor."),
        open("script-constraint", lstr("Ajoute une préférence.", "Add one preference.", "Agrega una preferencia."), "Sin picante, por favor."),
        open("script-payment", lstr("Demande l'addition et le reçu.", "Ask for the bill and receipt.", "Pide la cuenta y el recibo."), "¿Me trae la cuenta, por favor? ¿Me puede dar un recibo?"),
        own("script-own", lstr("Écris ton mini-script complet en 5 lignes.", "Write your full mini-script in 5 lines.", "Escribe tu mini-guion completo en 5 líneas."), 5),
      ],
      notes: [
        lstr("Les réponses modèles sont des exemples; ton script peut varier.", "Model responses are examples; your script may vary.", "Las respuestas modelo son ejemplos; tu guion puede variar."),
      ],
    },
  ],
};

const page18: AuthoredPage = {
  id: "speaking-transfer-mission",
  pageNumber: 18,
  kind: "speaking",
  title: lstr("Mission orale : 6 à 8 secondes", "Speaking mission: 6 to 8 seconds", "Misión oral: 6 a 8 segundos"),
  purpose: lstr("Tu t'entraînes à dire court, clair et naturel.", "You practice saying it short, clear, and natural.", "Practicas decirlo corto, claro y natural."),
  mechanics: ["speaking-prep", "transfer-task", "self-assessment"],
  supportLevel: "independent",
  activities: [
    {
      id: "speaking-rounds",
      kind: "speaking",
      title: lstr("Trois répétitions utiles", "Three useful repetitions", "Tres repeticiones útiles"),
      instructions: lstr("Écris, dis, puis coche. Aucun enregistrement requis.", "Write, say, then tick. No recording required.", "Escribe, di y marca. No se requiere grabación."),
      targetLanguage: "es",
      items: [
        own("speak-round-1", lstr("Ronde 1 : demander recommandation + plat.", "Round 1: ask recommendation + dish.", "Ronda 1: pedir recomendación + plato."), 2),
        own("speak-round-2", lstr("Ronde 2 : ajouter préférence ou contrainte.", "Round 2: add preference or constraint.", "Ronda 2: agregar preferencia o restricción."), 2),
        own("speak-round-3", lstr("Ronde 3 : payer et remercier.", "Round 3: pay and thank.", "Ronda 3: pagar y agradecer."), 2),
        tick("speak-check-short", lstr("Je garde une phrase courte.", "I keep the phrase short.", "Mantengo una frase corta.")),
        tick("speak-check-repair", lstr("Je sais demander de répéter.", "I know how to ask for repetition.", "Sé pedir que repitan.")),
      ],
      notes: [
        lstr("YoPratiqo prépare; un vrai prof Pratiqo aide à rendre rythme et intonation naturels.", "YoPratiqo prepares; a real Pratiqo teacher helps make rhythm and intonation natural.", "YoPratiqo prepara; un profesor real de Pratiqo ayuda a hacer naturales el ritmo y la entonación."),
      ],
    },
  ],
};

const page19: AuthoredPage = {
  id: "cumulative-retrieval",
  pageNumber: 19,
  kind: "cumulative",
  title: lstr("Récupération cumulative", "Cumulative retrieval", "Recuperación acumulativa"),
  purpose: lstr("Environ 70 % Module 3, 20 % Module 2, 10 % bases.", "About 70% Module 3, 20% Module 2, 10% basics.", "Aprox. 70 % Módulo 3, 20 % Módulo 2, 10 % bases."),
  mechanics: ["cumulative-retrieval", "baseline-retrieval"],
  supportLevel: "independent",
  activities: [
    {
      id: "cumulative-m3",
      kind: "diagnostic",
      title: lstr("Module 3", "Module 3", "Módulo 3"),
      instructions: lstr("Écris sans regarder.", "Write without looking.", "Escribe sin mirar."),
      targetLanguage: "es",
      items: [
        ...CORE_PHRASES.slice(0, 14).map(([id, target, clue]) =>
          ask(`cum-m3-${id}`, lstr(clue, clue, clue), target),
        ),
      ],
    },
    {
      id: "cumulative-m2-basics",
      kind: "diagnostic",
      title: lstr("Révisions M2 et bases", "Module 2 and basics review", "Repaso M2 y bases"),
      instructions: lstr("Récupère les anciens acquis utiles au restaurant.", "Retrieve older skills useful in a restaurant.", "Recupera habilidades anteriores útiles en el restaurante."),
      targetLanguage: "es",
      items: [
        ...M2_REVIEW.map(([target, clue]) => ask(`cum-m2-${target.replace(/\W+/g, "-")}`, lstr(clue, clue, clue), target)),
        ...BASICS_REVIEW.map(([target, clue]) => ask(`cum-basic-${target.replace(/\W+/g, "-")}`, lstr(clue, clue, clue), target)),
      ],
    },
  ],
};

const page20: AuthoredPage = {
  id: "four-domain-performance-check",
  pageNumber: 20,
  kind: "performance-check",
  title: lstr("Défi final : comprendre, retenir, produire, résoudre", "Final challenge: understand, remember, produce, solve", "Reto final: comprender, recordar, producir, resolver"),
  purpose: lstr("Tu vérifies si tu peux agir avec le Module 3.", "You check whether you can act with Module 3.", "Verificas si puedes actuar con el Módulo 3."),
  mechanics: ["performance-check", "choice", "guided-writing", "constraint-solving"],
  supportLevel: "assessment",
  activities: [
    {
      id: "assessment-comprendo",
      kind: "assessment",
      title: lstr("COMPRENDO", "I UNDERSTAND", "COMPRENDO"),
      instructions: lstr("Lis le mini-menu et réponds.", "Read the mini-menu and answer.", "Lee el mini-menú y responde."),
      inputLines: [
        "Plato del día: la bandera · arroz, habichuelas, pollo, ensalada",
        "Bebida: jugo de chinola",
        "Pago: tarjeta o efectivo",
      ],
      targetLanguage: "es",
      items: [
        askMeaning("assess-understand-dish", lstr("Quel plat est proposé ?", "Which dish is offered?", "¿Qué plato se ofrece?"), lstr("la bandera", "la bandera", "la bandera")),
        askMeaning("assess-understand-drink", lstr("Quelle boisson est proposée ?", "Which drink is offered?", "¿Qué bebida se ofrece?"), lstr("jugo de chinola", "jugo de chinola", "jugo de chinola")),
        askMeaning("assess-understand-pay", lstr("Quels moyens de paiement sont indiqués ?", "Which payment methods are shown?", "¿Qué medios de pago aparecen?"), lstr("tarjeta o efectivo", "card or cash", "tarjeta o efectivo")),
      ],
    },
    {
      id: "assessment-recuerdo",
      kind: "assessment",
      title: lstr("RECUERDO", "I REMEMBER", "RECUERDO"),
      instructions: lstr("Écris les phrases sans aide.", "Write the phrases without help.", "Escribe las frases sin ayuda."),
      targetLanguage: "es",
      items: [
        ask("assess-recommend", lstr("Demander une recommandation.", "Ask for a recommendation.", "Pedir una recomendación."), "¿Qué me recomienda?"),
        ask("assess-bill", lstr("Demander l'addition.", "Ask for the bill.", "Pedir la cuenta."), "¿Me trae la cuenta, por favor?"),
        ask("assess-slow", lstr("Demander de parler plus lentement.", "Ask them to speak more slowly.", "Pedir que hablen más despacio."), "Más despacio, por favor."),
        ask("assess-receipt", lstr("Demander un reçu.", "Ask for a receipt.", "Pedir un recibo."), "¿Me puede dar un recibo?"),
      ],
    },
    {
      id: "assessment-produzco",
      kind: "assessment",
      title: lstr("PRODUZCO", "I PRODUCE", "PRODUZCO"),
      instructions: lstr("Crée une commande courte.", "Create a short order.", "Crea un pedido corto."),
      targetLanguage: "es",
      items: [
        open("assess-order", lstr("Commande un plat, une boisson et une préférence.", "Order a dish, a drink, and one preference.", "Pide un plato, una bebida y una preferencia."), "Quiero la bandera y un jugo de chinola, sin picante, por favor.", 3),
        open("assess-pay", lstr("Termine avec paiement + merci.", "End with payment + thanks.", "Termina con pago + gracias."), "¿Acepta tarjeta? Gracias, muy amable.", 2),
      ],
    },
    {
      id: "assessment-resuelvo",
      kind: "assessment",
      title: lstr("RESUELVO", "I SOLVE", "RESUELVO"),
      instructions: lstr("Répare une situation.", "Repair a situation.", "Resuelve una situación."),
      targetLanguage: "es",
      items: [
        open("assess-unavailable", lstr("Le plat n'est pas disponible.", "The dish is unavailable.", "No hay el plato."), "No hay problema. ¿Qué me recomienda?"),
        open("assess-fast", lstr("Tu ne comprends pas la dernière partie.", "You do not understand the last part.", "No entiendes la última parte."), "No entendí la última parte. ¿Me puede repetir, por favor?"),
        own("assess-score", lstr("Ma note finale avec la même échelle que page 1 :", "My final score with the same scale as page 1:", "Mi nota final con la misma escala que página 1:"), 1),
      ],
      notes: [CAPABILITY_SCALE],
    },
  ],
};

const page21: AuthoredPage = {
  id: "objective-answer-key",
  pageNumber: 21,
  kind: "answer-key",
  title: lstr("Corrigé objectif", "Objective answer key", "Clave objetiva"),
  purpose: lstr("Corrige seulement les réponses fermées.", "Correct only closed-answer items.", "Corrige solo respuestas cerradas."),
  mechanics: ["answer-key"],
  supportLevel: "solutions",
  activities: [
    {
      id: "answer-key-objective",
      kind: "answer-key",
      title: lstr("Réponses fermées", "Closed answers", "Respuestas cerradas"),
      instructions: lstr("Les références sont générées depuis les exercices.", "References are generated from exercises.", "Las referencias se generan desde los ejercicios."),
      answerKeySection: "objective",
    },
  ],
};

const page22: AuthoredPage = {
  id: "model-responses-and-teacher-extension",
  pageNumber: 22,
  kind: "model-responses",
  title: lstr("Réponses modèles et extension prof", "Model responses and teacher extension", "Respuestas modelo y extensión para profesor"),
  purpose: lstr("Compare les productions ouvertes, puis prépare une pratique avec un prof.", "Compare open production, then prepare teacher practice.", "Compara producción abierta y prepara práctica con profesor."),
  mechanics: ["answer-key", "self-assessment", "speaking-prep"],
  supportLevel: "solutions",
  activities: [
    {
      id: "model-response-set",
      kind: "model-response",
      title: lstr("Réponses ouvertes possibles", "Possible open responses", "Respuestas abiertas posibles"),
      instructions: lstr("Ce sont des modèles, pas les seules bonnes réponses.", "These are models, not the only correct responses.", "Son modelos, no las únicas respuestas correctas."),
      answerKeySection: "model",
    },
    {
      id: "teacher-extension",
      kind: "reflection",
      title: lstr("Avec un prof Pratiqo", "With a Pratiqo teacher", "Con un profesor de Pratiqo"),
      instructions: lstr(
        "Apporte ce cahier pour simuler : commander, réparer après une phrase rapide, payer et demander un reçu.",
        "Bring this workbook to simulate: ordering, repairing after fast speech, paying, and asking for a receipt.",
        "Lleva este cuaderno para simular: pedir, reparar después de una frase rápida, pagar y pedir un recibo.",
      ),
      items: [
        tick("teacher-practice-order", lstr("Commander court.", "Order briefly.", "Pedir de forma breve.")),
        tick("teacher-practice-repair", lstr("Réparer après une réponse rapide.", "Repair after a fast answer.", "Reparar después de una respuesta rápida.")),
        tick("teacher-practice-payment", lstr("Payer et demander un reçu.", "Pay and ask for a receipt.", "Pagar y pedir un recibo.")),
      ],
    },
  ],
};

const authoredPages: readonly AuthoredPage[] = [
  page1,
  page2,
  page3,
  page4,
  page5,
  page6,
  page7,
  page8,
  page9,
  page10,
  page11,
  page12,
  page13,
  page14,
  page15,
  page16,
  page17,
  page18,
  page19,
  page20,
  page21,
  page22,
];

function withGeneratedAnswerRefs(pages: readonly AuthoredPage[]): readonly RdM3WorkbookPage[] {
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
                  return item as RdM3WorkbookItem;
                }
                counter += 1;
                return { ...item, answerRef: `${page.pageNumber}.${counter}` } as RdM3WorkbookItem;
              }),
            }
          : {}),
      })),
    };
  });
}

export const dominicanRepublicModule3Workbook: RdM3Workbook = {
  id: "dominican-republic-module-3-workbook-v1",
  moduleId: "dominican-republic-module-3",
  resourceId: "rd-m3-practice-sheets",
  title: lstr(
    "Cahier YoPratiqo 03 — Manger, commander et payer en République dominicaine",
    "YoPratiqo Workbook 03 — Eat, order, and pay in the Dominican Republic",
    "Cuaderno YoPratiqo 03 — Comer, pedir y pagar en República Dominicana",
  ),
  subtitle: lstr(
    "Menu fictif, plats à reconnaître, phrases de commande, réparation d'écoute, paiement et mission orale.",
    "Fictional menu, dishes to recognize, ordering phrases, listening repair, payment, and speaking mission.",
    "Menú ficticio, platos para reconocer, frases para pedir, reparación de escucha, pago y misión oral.",
  ),
  targetLanguage: "es",
  learnerLocales: ["fr", "en", "es"],
  pages: withGeneratedAnswerRefs(authoredPages),
};

export function isRdM3LocalizedChoice(
  choice: RdM3WorkbookChoice,
): choice is YoLocalizedString {
  return typeof choice !== "string";
}

export function resolveRdM3WorkbookChoice(
  choice: RdM3WorkbookChoice,
  locale: YoLocale,
): { text: string; isSpanishTarget: boolean } {
  return isRdM3LocalizedChoice(choice)
    ? { text: t(choice, locale), isSpanishTarget: false }
    : { text: choice, isSpanishTarget: true };
}

export interface RdM3WorkbookAnswerEntry {
  ref: string;
  kind: RdM3WorkbookAnswerKind;
  pageNumber: number;
  itemId: string;
  answer?: string;
  answerNote?: YoLocalizedString;
}

export interface RdM3WorkbookAnswerGroup {
  pageNumber: number;
  pageTitle: YoLocalizedString;
  entries: readonly RdM3WorkbookAnswerEntry[];
}

function collectAnswerEntries(
  kind: "objective" | "model",
): readonly RdM3WorkbookAnswerGroup[] {
  const groups: RdM3WorkbookAnswerGroup[] = [];
  for (const page of dominicanRepublicModule3Workbook.pages) {
    const entries: RdM3WorkbookAnswerEntry[] = [];
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

export function buildRdM3WorkbookAnswerGroups(
  section: "objective" | "model",
): readonly RdM3WorkbookAnswerGroup[] {
  return collectAnswerEntries(section);
}

export function countRdM3WorkbookPageResponses(page: RdM3WorkbookPage): number {
  return page.activities.reduce(
    (total, activity) =>
      total +
      (activity.items ?? []).filter((item) => (item.responseLines ?? 1) >= 1).length,
    0,
  );
}

export function countRdM3WorkbookResponseOpportunities(): number {
  return dominicanRepublicModule3Workbook.pages.reduce(
    (total, page) => total + countRdM3WorkbookPageResponses(page),
    0,
  );
}

export function countRdM3WorkbookObjectiveItems(): number {
  return dominicanRepublicModule3Workbook.pages.reduce(
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

export function countRdM3WorkbookOpenProductionTasks(): number {
  return dominicanRepublicModule3Workbook.pages.reduce(
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

export function countRdM3WorkbookItemsByActivityKind(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const page of dominicanRepublicModule3Workbook.pages) {
    for (const activity of page.activities) {
      counts[activity.kind] ??= 0;
      counts[activity.kind] += (activity.items ?? []).filter(
        (item) => (item.responseLines ?? 1) >= 1,
      ).length;
    }
  }
  return counts;
}

export function listRdM3WorkbookMechanics(): string[] {
  return Array.from(
    new Set(dominicanRepublicModule3Workbook.pages.flatMap((page) => page.mechanics)),
  ).sort();
}

export function validateRdM3Workbook(): string[] {
  const problems: string[] = [];
  const itemIds = new Set<string>();
  const refSeen = new Map<string, string>();
  const resolvedRefs = new Set<string>();

  for (const section of ["objective", "model"] as const) {
    for (const group of buildRdM3WorkbookAnswerGroups(section)) {
      for (const entry of group.entries) {
        if (resolvedRefs.has(entry.ref)) {
          problems.push(`answer ref ${entry.ref} is printed more than once`);
        }
        resolvedRefs.add(entry.ref);
        if (section === "model" && !entry.answer) {
          problems.push(`${entry.itemId}: model item has no possible response`);
        }
        if (section === "objective" && !entry.answer && !entry.answerNote) {
          problems.push(`${entry.itemId}: objective item has no answer`);
        }
      }
    }
  }

  for (const page of dominicanRepublicModule3Workbook.pages) {
    for (const activity of page.activities) {
      const activityHasGuidance = (activity.notes?.length ?? 0) > 0;
      for (const item of activity.items ?? []) {
        if (itemIds.has(item.id)) problems.push(`duplicate item id: ${item.id}`);
        itemIds.add(item.id);

        const lines = item.responseLines ?? 1;
        if (lines >= 1 && !item.answerKind) {
          problems.push(`${item.id} asks for work but has no answerKind`);
        }
        if (lines === 0 && item.answerKind) {
          problems.push(`${item.id} has no writing space but has answerKind`);
        }
        if (item.answerRef) {
          const previous = refSeen.get(item.answerRef);
          if (previous) problems.push(`duplicate answer ref ${item.answerRef} on ${previous} and ${item.id}`);
          refSeen.set(item.answerRef, item.id);
          if (!resolvedRefs.has(item.answerRef)) {
            problems.push(`dangling answer ref ${item.answerRef} on ${item.id}`);
          }
        }
        if (item.answerKind === "self") {
          if (item.answer || item.answerNote || item.answerRef) {
            problems.push(`${item.id} self-assessed item must not carry a fixed answer`);
          }
          if (!activityHasGuidance) {
            problems.push(`${item.id} self-assessed item has no activity guidance`);
          }
        }
      }
    }
  }

  return problems;
}

export const RD_M3_WORKBOOK_PAGE_COUNT = dominicanRepublicModule3Workbook.pages.length;
