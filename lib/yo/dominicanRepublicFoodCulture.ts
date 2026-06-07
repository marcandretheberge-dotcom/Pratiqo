/**
 * YoPratiqo - Dominican Republic Spanish - Module 3
 * Food, ordering, payment, rhythm, places, and daily-life culture.
 *
 * Content-only module data. No audio files, no generated MP3s, no payment
 * gating, no Supabase, no Stripe, no legal logic.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

export interface Dom3MissionStop {
  id: string;
  position: number;
  title: YoLocalizedString;
  description: YoLocalizedString;
}

export interface Dom3FoodCard {
  id: string;
  name: string;
  explanation: YoLocalizedString;
  culturalNote: YoLocalizedString;
  orderPhrase: string;
}

export interface Dom3CultureCard {
  id: string;
  name: string;
  category: YoLocalizedString;
  description: YoLocalizedString;
  phrase: string;
}

export interface Dom3Phrase {
  id: string;
  target: string;
  translation: YoLocalizedString;
  situation: YoLocalizedString;
}

export interface Dom3DialogueLine {
  speaker: YoLocalizedString;
  isLearner?: boolean;
  target: string;
  translation: YoLocalizedString;
  note?: YoLocalizedString;
}

export interface Dom3Dialogue {
  id: string;
  title: YoLocalizedString;
  setting: YoLocalizedString;
  lines: Dom3DialogueLine[];
  chunks: Array<{
    id: string;
    title: YoLocalizedString;
    explanation: YoLocalizedString;
  }>;
}

export interface Dom3EarCard {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
  practicePhrase: string;
}

export interface Dom3GrammarCard {
  id: string;
  pattern: string;
  meaning: YoLocalizedString;
  examples: Array<{ target: string; translation: YoLocalizedString }>;
  prompt: YoLocalizedString;
}

export interface Dom3Flashcard {
  id: string;
  category: YoLocalizedString;
  front: string;
  back: YoLocalizedString;
}

export interface Dom3QuizQuestion {
  id: string;
  type: YoLocalizedString;
  prompt: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  explanation: YoLocalizedString;
}

export interface Dom3GameRound {
  id: string;
  stop: number;
  scenario: YoLocalizedString;
  options: Array<{ id: string; target: string; translation: YoLocalizedString }>;
  correctOptionId: string;
  feedback: YoLocalizedString;
}

export interface Dom3PrintableSheet {
  id: string;
  title: YoLocalizedString;
  keyPhrases: string[];
  miniExercise: YoLocalizedString;
  roleplayOrChecklist: YoLocalizedString;
}

export interface DominicanRepublicFoodCultureData {
  moduleId: string;
  moduleLabel: YoLocalizedString;
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  productLabel: YoLocalizedString;
  audioComingSoonLabel: YoLocalizedString;
  printButtonLabel: YoLocalizedString;
  missionStops: Dom3MissionStop[];
  foodCards: Dom3FoodCard[];
  cultureCards: Dom3CultureCard[];
  phraseBank: Dom3Phrase[];
  dialogues: Dom3Dialogue[];
  earCards: Dom3EarCard[];
  grammarCards: Dom3GrammarCard[];
  flashcards: Dom3Flashcard[];
  quizQuestions: Dom3QuizQuestion[];
  finalGame: {
    title: YoLocalizedString;
    subtitle: YoLocalizedString;
    successMessage: YoLocalizedString;
    rounds: Dom3GameRound[];
  };
  printableSheets: Dom3PrintableSheet[];
}

const missionStops: Dom3MissionStop[] = [
  {
    id: "breakfast",
    position: 1,
    title: lstr("Petit-dejeuner dominicain", "Dominican breakfast", "Desayuno dominicano"),
    description: lstr(
      "Mangú, salami, fromage et oeufs: tu entres dans la journee par l'assiette.",
      "Mangú, salami, cheese, and eggs: you enter the day through the plate.",
      "Mangú, salami, queso y huevos: empiezas el día desde el plato.",
    ),
  },
  {
    id: "typical-plate",
    position: 2,
    title: lstr("Commander un plat typique", "Order a typical dish", "Pedir un plato típico"),
    description: lstr(
      "Tu demandes une recommandation et tu comprends ce qui vient avec le plat.",
      "You ask for a recommendation and understand what comes with the dish.",
      "Pides una recomendación y entiendes qué trae el plato.",
    ),
  },
  {
    id: "drinks-coffee",
    position: 3,
    title: lstr("Boissons et cafe", "Drinks and coffee", "Bebidas y café"),
    description: lstr(
      "Chinola, morir sonando, cafe et cacao: des reperes culturels et des mots utiles pour commander.",
      "Chinola, morir sonando, coffee, and cacao: culture notes plus useful ordering words.",
      "Chinola, morir soñando, café y cacao: referencias culturales y palabras útiles para pedir.",
    ),
  },
  {
    id: "pay",
    position: 4,
    title: lstr("Payer simplement", "Pay simply", "Pagar fácilmente"),
    description: lstr(
      "La cuenta, tarjeta, efectivo, recibo: les phrases calmes de fin de repas.",
      "The bill, card, cash, receipt: calm phrases for the end of a meal.",
      "La cuenta, tarjeta, efectivo, recibo: frases tranquilas para pagar.",
    ),
  },
  {
    id: "music",
    position: 5,
    title: lstr("Musique et ambiance", "Music and atmosphere", "Música y ambiente"),
    description: lstr(
      "Merengue, bachata et colmado: la langue dans la vie de tous les jours.",
      "Merengue, bachata, and the colmado: language in everyday life.",
      "Merengue, bachata y colmado: la lengua en la vida diaria.",
    ),
  },
  {
    id: "challenge",
    position: 6,
    title: lstr("Defi culture dominicaine", "Dominican culture challenge", "Reto de cultura dominicana"),
    description: lstr(
      "Tu remplis ton passeport culture avec 8 decisions utiles et respectueuses.",
      "You fill your culture passport with 8 useful, respectful decisions.",
      "Completas tu pasaporte cultural con 8 decisiones útiles y respetuosas.",
    ),
  },
];

const foodCards: Dom3FoodCard[] = [
  {
    id: "mangu",
    name: "Mangú con los tres golpes",
    explanation: lstr(
      "Purée de bananes plantains vertes, souvent servie avec salami, fromage frit et oeufs.",
      "Mashed green plantains, often served with salami, fried cheese, and eggs.",
      "Puré de plátano verde, a menudo servido con salami, queso frito y huevos.",
    ),
    culturalNote: lstr(
      "Un classique du petit-dejeuner dominicain: simple, nourrissant et tres local.",
      "A classic Dominican breakfast: simple, filling, and deeply local.",
      "Un clásico del desayuno dominicano: sencillo, abundante y muy local.",
    ),
    orderPhrase: "¿Tiene mangú?",
  },
  {
    id: "bandera",
    name: "La Bandera Dominicana",
    explanation: lstr(
      "Le plat du midi le plus symbolique: riz, haricots, viande et salade.",
      "The most symbolic lunch plate: rice, beans, meat, and salad.",
      "El plato del mediodía más simbólico: arroz, habichuelas, carne y ensalada.",
    ),
    culturalNote: lstr(
      "On l'appelle la bandera parce que ces elements reviennent dans la cuisine quotidienne.",
      "It is called the flag because these elements return again and again in everyday cooking.",
      "Se llama la bandera porque estos elementos vuelven una y otra vez en la comida diaria.",
    ),
    orderPhrase: "Quiero una bandera, por favor.",
  },
  {
    id: "sancocho",
    name: "Sancocho",
    explanation: lstr(
      "Ragout familial riche, souvent partage lors de reunions et grandes occasions.",
      "A rich family stew, often shared at gatherings and special occasions.",
      "Un guiso familiar sustancioso, compartido en reuniones y ocasiones especiales.",
    ),
    culturalNote: lstr(
      "C'est un plat de patience: on prend le temps, on partage, on parle.",
      "It is a patience dish: people take time, share, and talk.",
      "Es un plato de paciencia: se toma tiempo, se comparte y se conversa.",
    ),
    orderPhrase: "¿Tiene sancocho hoy?",
  },
  {
    id: "mofongo",
    name: "Mofongo",
    explanation: lstr(
      "Plantain pilé, souvent avec ail et garniture; on le retrouve dans plusieurs cuisines caribeennes.",
      "Mashed plantain, often with garlic and a filling; it appears across Caribbean cuisines.",
      "Plátano majado, a menudo con ajo y relleno; aparece en varias cocinas caribeñas.",
    ),
    culturalNote: lstr(
      "Parfait pour apprendre a demander ce que le plat contient.",
      "Perfect for learning how to ask what a dish contains.",
      "Perfecto para aprender a preguntar qué trae un plato.",
    ),
    orderPhrase: "¿Qué trae el mofongo?",
  },
  {
    id: "tostones",
    name: "Tostones",
    explanation: lstr(
      "Rondelles de plantain vert frites deux fois, croustillantes et faciles a partager.",
      "Green plantain slices fried twice, crispy and easy to share.",
      "Rodajas de plátano verde fritas dos veces, crujientes y fáciles de compartir.",
    ),
    culturalNote: lstr(
      "Un accompagnement pratique pour parler de texture: crujiente.",
      "A useful side dish for talking about texture: crujiente.",
      "Un acompañamiento útil para hablar de textura: crujiente.",
    ),
    orderPhrase: "Quiero tostones, por favor.",
  },
  {
    id: "pescado-frito",
    name: "Pescado frito",
    explanation: lstr(
      "Poisson frit, souvent associe aux plages, aux villages cotiers et aux repas simples.",
      "Fried fish, often tied to beaches, coastal towns, and simple meals.",
      "Pescado frito, asociado con playas, pueblos costeros y comidas sencillas.",
    ),
    culturalNote: lstr(
      "Demande toujours ce qui vient avec: riz, tostones, salade ou autre.",
      "Always ask what comes with it: rice, tostones, salad, or something else.",
      "Pregunta siempre qué viene con el plato: arroz, tostones, ensalada u otra cosa.",
    ),
    orderPhrase: "¿Qué viene con el pescado frito?",
  },
  {
    id: "habichuelas-dulce",
    name: "Habichuelas con dulce",
    explanation: lstr(
      "Dessert dominicain sucre a base de haricots, epices et lait.",
      "A sweet Dominican dessert made with beans, spices, and milk.",
      "Postre dominicano dulce hecho con habichuelas, especias y leche.",
    ),
    culturalNote: lstr(
      "Un bon rappel: un aliment peut surprendre quand on le decouvre dans une autre culture.",
      "A good reminder: food can surprise you when you meet it in another culture.",
      "Un buen recordatorio: la comida puede sorprenderte en otra cultura.",
    ),
    orderPhrase: "¿Tiene habichuelas con dulce?",
  },
  {
    id: "morir-sonando",
    name: "Morir soñando",
    explanation: lstr(
      "Boisson douce et cremeuse a base d'orange et de lait.",
      "A sweet, creamy drink made with orange and milk.",
      "Bebida dulce y cremosa hecha con naranja y leche.",
    ),
    culturalNote: lstr(
      "Son nom marque les memoires: mourir en revant, mais dans un contexte leger et gourmand.",
      "Its name is memorable: to die dreaming, in a light and delicious sense.",
      "Su nombre se recuerda: morir soñando, en un sentido ligero y sabroso.",
    ),
    orderPhrase: "Quiero un morir soñando.",
  },
  {
    id: "jugos-batidas",
    name: "Jugos naturales / batidas",
    explanation: lstr(
      "Jus naturels et boissons fouettees aux fruits comme chinola, mango ou piña.",
      "Natural juices and fruit shakes such as chinola, mango, or piña.",
      "Jugos naturales y batidas de frutas como chinola, mango o piña.",
    ),
    culturalNote: lstr(
      "Chinola est un mot tres utile pour le fruit de la passion.",
      "Chinola is a very useful local word for passion fruit.",
      "Chinola es una palabra local muy útil para la fruta de la pasión.",
    ),
    orderPhrase: "Quiero un jugo de chinola.",
  },
  {
    id: "cafe",
    name: "Café dominicano",
    explanation: lstr(
      "Cafe fort, social, souvent offert avec chaleur et conversation.",
      "Strong, social coffee, often offered with warmth and conversation.",
      "Café fuerte y social, a menudo ofrecido con calidez y conversación.",
    ),
    culturalNote: lstr(
      "Apprends a preciser: con azúcar, sin azúcar, con leche.",
      "Learn to specify: con azúcar, sin azúcar, con leche.",
      "Aprende a especificar: con azúcar, sin azúcar, con leche.",
    ),
    orderPhrase: "Un café, por favor.",
  },
  {
    id: "cacao",
    name: "Cacao / chocolate",
    explanation: lstr(
      "Produit agricole important, lie aux paysages, au travail local et aux desserts.",
      "An important agricultural product connected to landscapes, local work, and desserts.",
      "Producto agrícola importante, ligado al paisaje, al trabajo local y a los postres.",
    ),
    culturalNote: lstr(
      "Le cacao donne une porte d'entree vers l'economie locale, pas seulement le gout.",
      "Cacao opens a door into the local economy, not only flavor.",
      "El cacao abre una puerta a la economía local, no solo al sabor.",
    ),
    orderPhrase: "¿Tiene chocolate caliente?",
  },
];

const cultureCards: Dom3CultureCard[] = [
  {
    id: "merengue",
    name: "Merengue",
    category: lstr("Musique", "Music", "Música"),
    description: lstr(
      "Rythme dominicain majeur, danse, fête et fierte nationale.",
      "A major Dominican rhythm: dance, celebration, and national pride.",
      "Ritmo dominicano clave: baile, celebración y orgullo nacional.",
    ),
    phrase: "Me gusta el merengue.",
  },
  {
    id: "bachata",
    name: "Bachata",
    category: lstr("Musique", "Music", "Música"),
    description: lstr(
      "Expression musicale dominicaine connue mondialement pour son emotion.",
      "A Dominican musical expression known worldwide for its emotion.",
      "Expresión musical dominicana conocida mundialmente por su emoción.",
    ),
    phrase: "¿Es bachata o merengue?",
  },
  {
    id: "colmado",
    name: "Colmado",
    category: lstr("Vie quotidienne", "Daily life", "Vida diaria"),
    description: lstr(
      "Petit commerce de quartier: on achete, on discute, on entend la langue locale.",
      "A neighborhood shop: people buy, talk, and hear local speech.",
      "Tienda de barrio: se compra, se conversa y se escucha el habla local.",
    ),
    phrase: "¿Dónde hay un colmado cerca?",
  },
  {
    id: "guagua",
    name: "Guagua",
    category: lstr("Transport", "Transport", "Transporte"),
    description: lstr(
      "Dans plusieurs pays caribeens, ce mot peut designer un autobus ou minibus.",
      "In several Caribbean countries, this word can mean a bus or minibus.",
      "En varios países caribeños, esta palabra puede significar bus o minibús.",
    ),
    phrase: "¿Dónde pasa la guagua?",
  },
  {
    id: "zona-colonial",
    name: "Zona Colonial",
    category: lstr("Lieu", "Place", "Lugar"),
    description: lstr(
      "Quartier historique de Santo Domingo, important pour comprendre les Ameriques.",
      "Santo Domingo's historic district, important for understanding the Americas.",
      "Zona histórica de Santo Domingo, importante para entender las Américas.",
    ),
    phrase: "Quiero visitar la Zona Colonial.",
  },
  {
    id: "los-haitises",
    name: "Los Haitises",
    category: lstr("Nature", "Nature", "Naturaleza"),
    description: lstr(
      "Parc national de mangroves, grottes et paysages spectaculaires.",
      "A national park with mangroves, caves, and spectacular landscapes.",
      "Parque nacional con manglares, cuevas y paisajes espectaculares.",
    ),
    phrase: "Quiero conocer Los Haitises.",
  },
  {
    id: "samana",
    name: "Samaná",
    category: lstr("Lieu", "Place", "Lugar"),
    description: lstr(
      "Region cotiere connue pour ses paysages, sa culture et ses excursions nature.",
      "A coastal region known for landscapes, culture, and nature outings.",
      "Región costera conocida por paisajes, cultura y excursiones de naturaleza.",
    ),
    phrase: "Voy a Samaná.",
  },
  {
    id: "pico-duarte",
    name: "Pico Duarte / Jarabacoa",
    category: lstr("Montagne", "Mountain", "Montaña"),
    description: lstr(
      "Le cote montagneux du pays: rivières, air frais et aventure.",
      "The mountain side of the country: rivers, cool air, and adventure.",
      "El lado montañoso del país: ríos, aire fresco y aventura.",
    ),
    phrase: "Me gusta la montaña.",
  },
  {
    id: "bahia-aguilas",
    name: "Bahía de las Águilas",
    category: lstr("Nature", "Nature", "Naturaleza"),
    description: lstr(
      "Plage protegee et paysage naturel a aborder avec respect.",
      "A protected beach and natural landscape to approach with respect.",
      "Playa protegida y paisaje natural que se visita con respeto.",
    ),
    phrase: "Es un lugar hermoso.",
  },
  {
    id: "larimar",
    name: "Larimar",
    category: lstr("Produit local", "Local product", "Producto local"),
    description: lstr(
      "Pierre bleue associee a la Republique dominicaine.",
      "A blue stone associated with the Dominican Republic.",
      "Piedra azul asociada con la República Dominicana.",
    ),
    phrase: "¿Es larimar?",
  },
  {
    id: "ambar",
    name: "Ámbar dominicano",
    category: lstr("Produit local", "Local product", "Producto local"),
    description: lstr(
      "Ambre local, souvent presente dans l'artisanat et les musees.",
      "Local amber, often seen in crafts and museums.",
      "Ámbar local, presente en artesanía y museos.",
    ),
    phrase: "Quiero ver el ámbar dominicano.",
  },
  {
    id: "cacao-culture",
    name: "Cacao",
    category: lstr("Culture agricole", "Agricultural culture", "Cultura agrícola"),
    description: lstr(
      "Produit agricole lie au chocolat, aux campagnes et au savoir-faire local.",
      "An agricultural product tied to chocolate, rural life, and local know-how.",
      "Producto agrícola ligado al chocolate, el campo y el saber local.",
    ),
    phrase: "Me interesa el cacao.",
  },
  {
    id: "cafe-culture",
    name: "Café",
    category: lstr("Culture agricole", "Agricultural culture", "Cultura agrícola"),
    description: lstr(
      "Boisson, produit local et moment social.",
      "A drink, a local product, and a social moment.",
      "Bebida, producto local y momento social.",
    ),
    phrase: "Un café dominicano, por favor.",
  },
  {
    id: "munecas",
    name: "Muñecas sin rostro",
    category: lstr("Artisanat", "Craft", "Artesanía"),
    description: lstr(
      "Poupees artisanales sans visage, symbole d'identite metissee et collective.",
      "Faceless craft dolls, a symbol of mixed and collective identity.",
      "Muñecas artesanales sin rostro, símbolo de identidad mixta y colectiva.",
    ),
    phrase: "Quiero una muñeca sin rostro.",
  },
  {
    id: "arte-taino",
    name: "Arte taíno",
    category: lstr("Memoire culturelle", "Cultural memory", "Memoria cultural"),
    description: lstr(
      "Motifs et references inspires de la presence taïno dans l'île.",
      "Motifs and references inspired by Taíno presence on the island.",
      "Motivos y referencias inspirados en la presencia taína en la isla.",
    ),
    phrase: "¿Esto es arte taíno?",
  },
];

const phraseBank: Dom3Phrase[] = [
  ["recommend", "¿Qué me recomienda?", "Que me recommandez-vous ?", "What do you recommend?", "¿Qué me recomienda?", "Demander conseil", "Ask for advice", "Pedir consejo"],
  ["typical", "Quiero probar algo típico.", "Je veux essayer quelque chose de typique.", "I want to try something typical.", "Quiero probar algo típico.", "Commander avec curiosite", "Order with curiosity", "Pedir con curiosidad"],
  ["mangu", "¿Tiene mangú?", "Avez-vous du mangú ?", "Do you have mangú?", "¿Tiene mangú?", "Petit-dejeuner", "Breakfast", "Desayuno"],
  ["bandera-comes", "¿Qué viene con la bandera?", "Qu'est-ce qui vient avec la bandera ?", "What comes with la bandera?", "¿Qué viene con la bandera?", "Comprendre le plat", "Understand the dish", "Entender el plato"],
  ["sancocho", "¿Tiene sancocho hoy?", "Avez-vous du sancocho aujourd'hui ?", "Do you have sancocho today?", "¿Tiene sancocho hoy?", "Plat du jour", "Daily dish", "Plato del día"],
  ["plato", "¿Qué trae este plato?", "Qu'est-ce que ce plat contient ?", "What does this dish include?", "¿Qué trae este plato?", "Avant de commander", "Before ordering", "Antes de pedir"],
  ["picante", "¿Es picante?", "Est-ce piquant ?", "Is it spicy?", "¿Es picante?", "Verifier le piquant", "Check spiciness", "Verificar el picante"],
  ["sin-picante", "Sin picante, por favor.", "Sans piquant, s'il vous plaît.", "No spice, please.", "Sin picante, por favor.", "Preference alimentaire", "Food preference", "Preferencia"],
  ["poco-picante", "Un poco picante está bien.", "Un peu piquant, ça va.", "A little spicy is fine.", "Un poco picante está bien.", "Preference alimentaire", "Food preference", "Preferencia"],
  ["jugo", "¿Tiene jugo natural?", "Avez-vous du jus naturel ?", "Do you have natural juice?", "¿Tiene jugo natural?", "Boisson", "Drink", "Bebida"],
  ["sabores", "¿Qué sabores tiene?", "Quelles saveurs avez-vous ?", "What flavors do you have?", "¿Qué sabores tiene?", "Choisir un jus", "Choose a juice", "Elegir un jugo"],
  ["chinola", "Quiero un jugo de chinola.", "Je veux un jus de fruit de la passion.", "I want passion fruit juice.", "Quiero un jugo de chinola.", "Mot local utile", "Useful local word", "Palabra local útil"],
  ["morir", "Quiero un morir soñando.", "Je veux un morir soñando.", "I want a morir soñando.", "Quiero un morir soñando.", "Boisson typique", "Typical drink", "Bebida típica"],
  ["cafe", "Un café, por favor.", "Un café, s'il vous plaît.", "A coffee, please.", "Un café, por favor.", "Cafe", "Coffee", "Café"],
  ["leche", "¿Tiene leche?", "Avez-vous du lait ?", "Do you have milk?", "¿Tiene leche?", "Cafe ou boisson", "Coffee or drink", "Café o bebida"],
  ["azucar", "Sin azúcar, por favor.", "Sans sucre, s'il vous plaît.", "No sugar, please.", "Sin azúcar, por favor.", "Preference", "Preference", "Preferencia"],
  ["hielo", "Con hielo, por favor.", "Avec glace, s'il vous plaît.", "With ice, please.", "Con hielo, por favor.", "Boisson froide", "Cold drink", "Bebida fría"],
  ["aqui", "Para comer aquí.", "Pour manger ici.", "For eating here.", "Para comer aquí.", "Sur place", "Eat in", "Comer aquí"],
  ["llevar", "Para llevar, por favor.", "Pour emporter, s'il vous plaît.", "To go, please.", "Para llevar, por favor.", "A emporter", "To go", "Para llevar"],
  ["cuenta", "¿Me trae la cuenta, por favor?", "Pouvez-vous m'apporter l'addition ?", "Can you bring me the bill, please?", "¿Me trae la cuenta, por favor?", "Payer", "Paying", "Pagar"],
  ["cuanto", "¿Cuánto cuesta?", "Combien ça coûte ?", "How much does it cost?", "¿Cuánto cuesta?", "Prix", "Price", "Precio"],
  ["tarjeta", "¿Acepta tarjeta?", "Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?", "Payer par carte", "Pay by card", "Pagar con tarjeta"],
  ["efectivo", "¿Puedo pagar en efectivo?", "Puis-je payer en argent comptant ?", "Can I pay in cash?", "¿Puedo pagar en efectivo?", "Payer comptant", "Pay cash", "Pagar en efectivo"],
  ["servicio", "¿Está incluido el servicio?", "Le service est-il inclus ?", "Is service included?", "¿Está incluido el servicio?", "Clarifier la note", "Clarify the bill", "Aclarar la cuenta"],
  ["recibo", "¿Me puede dar un recibo?", "Pouvez-vous me donner un reçu ?", "Can you give me a receipt?", "¿Me puede dar un recibo?", "Recu", "Receipt", "Recibo"],
  ["bueno", "Está muy bueno.", "C'est très bon.", "It is very good.", "Está muy bueno.", "Compliment", "Compliment", "Cumplido"],
  ["amable", "Gracias, muy amable.", "Merci, c'est très gentil.", "Thank you, very kind.", "Gracias, muy amable.", "Politesse", "Politeness", "Cortesía"],
  ["repetir", "¿Me puede repetir, por favor?", "Pouvez-vous répéter, s'il vous plaît ?", "Can you repeat, please?", "¿Me puede repetir, por favor?", "Quand c'est rapide", "When it is fast", "Cuando va rápido"],
  ["despacio", "Más despacio, por favor.", "Plus lentement, s'il vous plaît.", "More slowly, please.", "Más despacio, por favor.", "Demander de ralentir", "Ask them to slow down", "Pedir que hablen más lento"],
  ["ultima", "No entendí la última parte.", "Je n'ai pas compris la dernière partie.", "I did not understand the last part.", "No entendí la última parte.", "Reparer la conversation", "Repair the conversation", "Reparar la conversación"],
  ["decir", "¿Cómo se dice eso?", "Comment dit-on ça ?", "How do you say that?", "¿Cómo se dice eso?", "Apprendre sur place", "Learn on the spot", "Aprender en el momento"],
  ["alergia", "Soy alérgico/alérgica a...", "Je suis allergique à...", "I am allergic to...", "Soy alérgico/alérgica a...", "Securite alimentaire", "Food safety", "Seguridad alimentaria"],
  ["no-carne", "No como carne.", "Je ne mange pas de viande.", "I do not eat meat.", "No como carne.", "Preference alimentaire", "Food preference", "Preferencia"],
  ["vegetariana", "¿Tiene una opción vegetariana?", "Avez-vous une option végétarienne ?", "Do you have a vegetarian option?", "¿Tiene una opción vegetariana?", "Option", "Option", "Opción"],
  ["colmado", "¿Dónde hay un colmado cerca?", "Où y a-t-il un colmado près d'ici ?", "Where is there a colmado nearby?", "¿Dónde hay un colmado cerca?", "Vie quotidienne", "Daily life", "Vida diaria"],
].map(([id, target, fr, en, es, situationFr, situationEn, situationEs]) => ({
  id,
  target,
  translation: lstr(fr, en, es),
  situation: lstr(situationFr, situationEn, situationEs),
}));

const dialogues: Dom3Dialogue[] = [
  {
    id: "comedor",
    title: lstr("Dialogue - Comedor local", "Dialogue - Local comedor", "Diálogo - Comedor local"),
    setting: lstr(
      "Tu entres dans un petit restaurant local et tu veux un plat typique.",
      "You walk into a small local restaurant and want a typical dish.",
      "Entras en un pequeño comedor local y quieres un plato típico.",
    ),
    lines: [
      ["Viajero", "Hola, buenos días. ¿Qué me recomienda?", "Bonjour. Que me recommandez-vous ?", "Hello, good morning. What do you recommend?", "Hola, buenos días. ¿Qué me recomienda?", true],
      ["Empleado", "Hoy tenemos la bandera, pollo guisado y sancocho.", "Aujourd'hui nous avons la bandera, du poulet mijoté et du sancocho.", "Today we have la bandera, stewed chicken, and sancocho.", "Hoy tenemos la bandera, pollo guisado y sancocho."],
      ["Viajero", "Quiero probar algo típico. ¿Qué viene con la bandera?", "Je veux essayer quelque chose de typique. Qu'est-ce qui vient avec la bandera ?", "I want to try something typical. What comes with la bandera?", "Quiero probar algo típico. ¿Qué viene con la bandera?", true],
      ["Empleado", "Arroz, habichuelas, carne y ensalada.", "Riz, haricots, viande et salade.", "Rice, beans, meat, and salad.", "Arroz, habichuelas, carne y ensalada."],
      ["Viajero", "Perfecto. Una bandera, por favor.", "Parfait. Une bandera, s'il vous plaît.", "Perfect. One bandera, please.", "Perfecto. Una bandera, por favor.", true],
      ["Empleado", "¿Para comer aquí o para llevar?", "Pour manger ici ou pour emporter ?", "For here or to go?", "¿Para comer aquí o para llevar?"],
      ["Viajero", "Para comer aquí.", "Pour manger ici.", "For here.", "Para comer aquí.", true],
      ["Empleado", "Muy bien.", "Très bien.", "Very good.", "Muy bien."],
    ].map(([speaker, target, fr, en, es, isLearner]) => ({
      speaker: lstr(String(speaker), String(speaker), String(speaker)),
      target: String(target),
      translation: lstr(String(fr), String(en), String(es)),
      isLearner: Boolean(isLearner),
    })),
    chunks: [
      {
        id: "ask",
        title: lstr("Demander conseil", "Ask for advice", "Pedir consejo"),
        explanation: lstr(
          "¿Qué me recomienda? est poli, naturel et ouvre la porte a une vraie conversation.",
          "¿Qué me recomienda? is polite, natural, and opens the door to a real conversation.",
          "¿Qué me recomienda? es cortés, natural y abre la puerta a una conversación real.",
        ),
      },
      {
        id: "comes-with",
        title: lstr("Comprendre le plat", "Understand the dish", "Entender el plato"),
        explanation: lstr(
          "¿Qué viene con...? t'aide a savoir si le plat inclut riz, haricots, salade ou accompagnements.",
          "¿Qué viene con...? helps you know whether the dish includes rice, beans, salad, or sides.",
          "¿Qué viene con...? te ayuda a saber si el plato incluye arroz, habichuelas, ensalada o acompañamientos.",
        ),
      },
    ],
  },
  {
    id: "beach-kiosk",
    title: lstr("Dialogue - Kiosque de plage", "Dialogue - Beach kiosk", "Diálogo - Kiosco de playa"),
    setting: lstr(
      "Tu veux un jus naturel et tu dois choisir une saveur.",
      "You want a natural juice and need to choose a flavor.",
      "Quieres un jugo natural y necesitas elegir un sabor.",
    ),
    lines: [
      ["Viajero", "Hola. ¿Tiene jugo natural?", "Bonjour. Avez-vous du jus naturel ?", "Hello. Do you have natural juice?", "Hola. ¿Tiene jugo natural?", true],
      ["Vendedor", "Sí. Tenemos chinola, mango y piña.", "Oui. Nous avons chinola, mangue et ananas.", "Yes. We have passion fruit, mango, and pineapple.", "Sí. Tenemos chinola, mango y piña."],
      ["Viajero", "Quiero un jugo de chinola, por favor.", "Je veux un jus de chinola, s'il vous plaît.", "I want a passion fruit juice, please.", "Quiero un jugo de chinola, por favor.", true],
      ["Vendedor", "¿Con hielo?", "Avec glace ?", "With ice?", "¿Con hielo?"],
      ["Viajero", "Sí, con hielo.", "Oui, avec glace.", "Yes, with ice.", "Sí, con hielo.", true],
      ["Vendedor", "Perfecto.", "Parfait.", "Perfect.", "Perfecto."],
      ["Viajero", "Gracias, muy amable.", "Merci, c'est très gentil.", "Thank you, very kind.", "Gracias, muy amable.", true],
    ].map(([speaker, target, fr, en, es, isLearner]) => ({
      speaker: lstr(String(speaker), String(speaker), String(speaker)),
      target: String(target),
      translation: lstr(String(fr), String(en), String(es)),
      isLearner: Boolean(isLearner),
    })),
    chunks: [
      {
        id: "flavors",
        title: lstr("Choisir une saveur", "Choose a flavor", "Elegir un sabor"),
        explanation: lstr(
          "¿Qué sabores tiene? et Quiero un jugo de... forment une mini-strategie complete.",
          "¿Qué sabores tiene? and Quiero un jugo de... form a complete mini-strategy.",
          "¿Qué sabores tiene? y Quiero un jugo de... forman una mini estrategia completa.",
        ),
      },
    ],
  },
  {
    id: "payment",
    title: lstr("Dialogue - Payer calmement", "Dialogue - Paying calmly", "Diálogo - Pagar con calma"),
    setting: lstr(
      "Le repas est fini. Tu demandes la note, tu paies par carte et tu demandes un reçu.",
      "The meal is over. You ask for the bill, pay by card, and ask for a receipt.",
      "La comida terminó. Pides la cuenta, pagas con tarjeta y pides un recibo.",
    ),
    lines: [
      ["Viajero", "¿Me trae la cuenta, por favor?", "Pouvez-vous m'apporter l'addition ?", "Can you bring me the bill, please?", "¿Me trae la cuenta, por favor?", true],
      ["Empleado", "Claro. Son quinientos pesos.", "Bien sûr. Ça fait cinq cents pesos.", "Of course. It is five hundred pesos.", "Claro. Son quinientos pesos."],
      ["Viajero", "¿Acepta tarjeta?", "Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?", true],
      ["Empleado", "Sí, aceptamos tarjeta.", "Oui, nous acceptons la carte.", "Yes, we accept card.", "Sí, aceptamos tarjeta."],
      ["Viajero", "Perfecto. ¿Me puede dar un recibo?", "Parfait. Pouvez-vous me donner un reçu ?", "Perfect. Can you give me a receipt?", "Perfecto. ¿Me puede dar un recibo?", true],
      ["Empleado", "Sí, claro.", "Oui, bien sûr.", "Yes, of course.", "Sí, claro."],
      ["Viajero", "Gracias.", "Merci.", "Thank you.", "Gracias.", true],
    ].map(([speaker, target, fr, en, es, isLearner]) => ({
      speaker: lstr(String(speaker), String(speaker), String(speaker)),
      target: String(target),
      translation: lstr(String(fr), String(en), String(es)),
      isLearner: Boolean(isLearner),
    })),
    chunks: [
      {
        id: "receipt",
        title: lstr("Finir avec clarte", "Finish clearly", "Terminar con claridad"),
        explanation: lstr(
          "La cuenta, tarjeta et recibo couvrent la plupart des fins de repas sans stress.",
          "La cuenta, tarjeta, and recibo cover most end-of-meal moments without stress.",
          "La cuenta, tarjeta y recibo cubren la mayoría de los cierres de comida sin estrés.",
        ),
      },
    ],
  },
];

const earCards: Dom3EarCard[] = [
  {
    id: "fast",
    title: lstr("L'espagnol dominicain peut etre rapide", "Dominican Spanish can be fast", "El español dominicano puede ser rápido"),
    description: lstr(
      "Ce n'est pas toi le probleme: le debit naturel peut etre tres vif.",
      "You are not the problem: natural speed can be very lively.",
      "El problema no eres tú: el ritmo natural puede ser muy vivo.",
    ),
    practicePhrase: "Más despacio, por favor.",
  },
  {
    id: "shortened",
    title: lstr("Des mots peuvent etre raccourcis", "Words may be shortened", "Las palabras pueden acortarse"),
    description: lstr(
      "Dans la conversation informelle, certaines syllabes peuvent disparaître.",
      "In casual conversation, some syllables may disappear.",
      "En conversación informal, algunas sílabas pueden desaparecer.",
    ),
    practicePhrase: "¿Me puede repetir, por favor?",
  },
  {
    id: "final-s",
    title: lstr("Le s final peut s'effacer", "The final s can disappear", "La s final puede desaparecer"),
    description: lstr(
      "Tu peux entendre une phrase plus courte que celle que tu as apprise sur papier.",
      "You may hear a shorter phrase than the one you learned on paper.",
      "Puedes oír una frase más corta que la que aprendiste escrita.",
    ),
    practicePhrase: "No entendí la última parte.",
  },
  {
    id: "repetition",
    title: lstr("Demander de repeter est normal", "Asking for repetition is normal", "Pedir repetición es normal"),
    description: lstr(
      "Les voyageurs polis demandent de repeter. C'est une strategie, pas un echec.",
      "Polite travelers ask for repetition. It is a strategy, not a failure.",
      "Los viajeros corteses piden repetición. Es una estrategia, no un fracaso.",
    ),
    practicePhrase: "¿Me puede repetir, por favor?",
  },
  {
    id: "slow",
    title: lstr("Utilise sans gene: mas despacio", "Use más despacio without embarrassment", "Usa más despacio sin pena"),
    description: lstr(
      "Cette phrase garde la conversation ouverte et respectueuse.",
      "This phrase keeps the conversation open and respectful.",
      "Esta frase mantiene la conversación abierta y respetuosa.",
    ),
    practicePhrase: "Más despacio, por favor.",
  },
];

const grammarCards: Dom3GrammarCard[] = [
  {
    id: "quiero",
    pattern: "Quiero + noun",
    meaning: lstr("Je veux + nom", "I want + noun", "Quiero + sustantivo"),
    examples: [
      { target: "Quiero un jugo de chinola.", translation: lstr("Je veux un jus de chinola.", "I want passion fruit juice.", "Quiero un jugo de chinola.") },
      { target: "Quiero probar algo típico.", translation: lstr("Je veux essayer quelque chose de typique.", "I want to try something typical.", "Quiero probar algo típico.") },
    ],
    prompt: lstr("Dis ce que tu veux commander.", "Say what you want to order.", "Di qué quieres pedir."),
  },
  {
    id: "tiene",
    pattern: "¿Tiene...?",
    meaning: lstr("Avez-vous... ?", "Do you have...?", "¿Tiene...?"),
    examples: [
      { target: "¿Tiene mangú?", translation: lstr("Avez-vous du mangú ?", "Do you have mangú?", "¿Tiene mangú?") },
      { target: "¿Tiene jugo natural?", translation: lstr("Avez-vous du jus naturel ?", "Do you have natural juice?", "¿Tiene jugo natural?") },
    ],
    prompt: lstr("Demande si un plat est disponible.", "Ask if a dish is available.", "Pregunta si hay un plato."),
  },
  {
    id: "viene-con",
    pattern: "¿Qué viene con...?",
    meaning: lstr("Qu'est-ce qui vient avec... ?", "What comes with...?", "¿Qué viene con...?"),
    examples: [
      { target: "¿Qué viene con la bandera?", translation: lstr("Qu'est-ce qui vient avec la bandera ?", "What comes with la bandera?", "¿Qué viene con la bandera?") },
      { target: "¿Qué viene con el pescado frito?", translation: lstr("Qu'est-ce qui vient avec le poisson frit ?", "What comes with the fried fish?", "¿Qué viene con el pescado frito?") },
    ],
    prompt: lstr("Demande les accompagnements.", "Ask about side dishes.", "Pregunta por los acompañamientos."),
  },
  {
    id: "cuanto",
    pattern: "¿Cuánto cuesta...?",
    meaning: lstr("Combien coûte... ?", "How much does... cost?", "¿Cuánto cuesta...?"),
    examples: [
      { target: "¿Cuánto cuesta?", translation: lstr("Combien ça coûte ?", "How much does it cost?", "¿Cuánto cuesta?") },
      { target: "¿Cuánto cuesta el jugo?", translation: lstr("Combien coûte le jus ?", "How much is the juice?", "¿Cuánto cuesta el jugo?") },
    ],
    prompt: lstr("Demande le prix avant de payer.", "Ask the price before paying.", "Pregunta el precio antes de pagar."),
  },
  {
    id: "acepta",
    pattern: "¿Acepta...?",
    meaning: lstr("Acceptez-vous... ?", "Do you accept...?", "¿Acepta...?"),
    examples: [
      { target: "¿Acepta tarjeta?", translation: lstr("Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?") },
      { target: "¿Acepta efectivo?", translation: lstr("Acceptez-vous l'argent comptant ?", "Do you accept cash?", "¿Acepta efectivo?") },
    ],
    prompt: lstr("Demande le mode de paiement.", "Ask about the payment method.", "Pregunta por el método de pago."),
  },
  {
    id: "aqui-llevar",
    pattern: "Para comer aquí / para llevar",
    meaning: lstr("Pour manger ici / pour emporter", "For here / to go", "Para comer aquí / para llevar"),
    examples: [
      { target: "Para comer aquí.", translation: lstr("Pour manger ici.", "For here.", "Para comer aquí.") },
      { target: "Para llevar, por favor.", translation: lstr("Pour emporter, s'il vous plaît.", "To go, please.", "Para llevar, por favor.") },
    ],
    prompt: lstr("Choisis sur place ou a emporter.", "Choose for here or to go.", "Elige aquí o para llevar."),
  },
  {
    id: "sin-con",
    pattern: "Sin / con",
    meaning: lstr("Sans / avec", "Without / with", "Sin / con"),
    examples: [
      { target: "Sin azúcar, por favor.", translation: lstr("Sans sucre, s'il vous plaît.", "No sugar, please.", "Sin azúcar, por favor.") },
      { target: "Con hielo, por favor.", translation: lstr("Avec glace, s'il vous plaît.", "With ice, please.", "Con hielo, por favor.") },
    ],
    prompt: lstr("Precise une preference simple.", "State a simple preference.", "Indica una preferencia simple."),
  },
  {
    id: "me-trae",
    pattern: "¿Me trae...?",
    meaning: lstr("Pouvez-vous m'apporter... ?", "Can you bring me...?", "¿Me trae...?"),
    examples: [
      { target: "¿Me trae la cuenta, por favor?", translation: lstr("Pouvez-vous m'apporter l'addition ?", "Can you bring me the bill?", "¿Me trae la cuenta?") },
      { target: "¿Me trae agua, por favor?", translation: lstr("Pouvez-vous m'apporter de l'eau ?", "Can you bring me water?", "¿Me trae agua?") },
    ],
    prompt: lstr("Demande quelque chose poliment.", "Ask for something politely.", "Pide algo con cortesía."),
  },
  {
    id: "me-puede",
    pattern: "¿Me puede...?",
    meaning: lstr("Pouvez-vous me... ?", "Can you... for me?", "¿Me puede...?"),
    examples: [
      { target: "¿Me puede dar un recibo?", translation: lstr("Pouvez-vous me donner un reçu ?", "Can you give me a receipt?", "¿Me puede dar un recibo?") },
      { target: "¿Me puede repetir, por favor?", translation: lstr("Pouvez-vous répéter ?", "Can you repeat, please?", "¿Me puede repetir?") },
    ],
    prompt: lstr("Transforme une demande en phrase polie.", "Turn a request into a polite phrase.", "Convierte una petición en frase cortés."),
  },
];

const flashcards: Dom3Flashcard[] = [
  ["food-mangu", "food", "el mangú", "Purée de plantains, classique du petit-déjeuner dominicain.", "Mashed plantains, a Dominican breakfast staple.", "Puré de plátano, clásico del desayuno dominicano."],
  ["food-bandera", "food", "la bandera", "Repas dominicain typique du midi : riz, haricots, viande et salade.", "Typical Dominican lunch plate: rice, beans, meat, and salad.", "Plato típico dominicano del mediodía: arroz, habichuelas, carne y ensalada."],
  ["food-sancocho", "food", "el sancocho", "Ragoût dominicain souvent servi lors de repas familiaux.", "Dominican stew often served at family gatherings.", "Guiso dominicano que suele servirse en reuniones familiares."],
  ["food-tostones", "food", "los tostones", "Plantains verts frits, croustillants, souvent servis en accompagnement.", "Crispy fried green plantains, often served as a side.", "Plátanos verdes fritos y crujientes, servidos como acompañamiento."],
  ["food-mofongo", "food", "el mofongo", "Plat de plantains pilés, utile à reconnaître dans un menu dominicain.", "Mashed-plantain dish to recognize on a Dominican menu.", "Plato de plátano majado, útil para reconocer en un menú dominicano."],
  ["food-pescado", "food", "el pescado frito", "le poisson frit", "fried fish", "el pescado frito"],
  ["food-habichuelas", "food", "las habichuelas", "les haricots", "beans", "las habichuelas"],
  ["food-arroz", "food", "el arroz", "le riz", "rice", "el arroz"],
  ["food-pollo", "food", "el pollo guisado", "le poulet mijoté", "stewed chicken", "el pollo guisado"],
  ["food-ensalada", "food", "la ensalada", "la salade", "salad", "la ensalada"],
  ["drink-jugo", "drinks", "el jugo natural", "le jus naturel", "natural juice", "el jugo natural"],
  ["drink-chinola", "drinks", "la chinola", "le fruit de la passion", "passion fruit", "la chinola"],
  ["drink-morir", "drinks", "el morir soñando", "Boisson dominicaine au lait et jus d'orange.", "Dominican drink made with milk and orange juice.", "Bebida dominicana con leche y jugo de naranja."],
  ["drink-cafe", "drinks", "el café", "le café", "coffee", "el café"],
  ["drink-cacao", "drinks", "el cacao", "Produit agricole important en RD; à reconnaître en contexte culturel.", "Important Dominican agricultural product to recognize in culture context.", "Producto agrícola importante en RD; reconócelo en contexto cultural."],
  ["drink-chocolate", "drinks", "el chocolate", "le chocolat", "chocolate", "el chocolate"],
  ["pay-cuenta", "payment", "la cuenta", "l'addition", "the bill", "la cuenta"],
  ["pay-recibo", "payment", "el recibo", "le reçu", "the receipt", "el recibo"],
  ["pay-tarjeta", "payment", "la tarjeta", "la carte", "card", "la tarjeta"],
  ["pay-efectivo", "payment", "el efectivo", "l'argent comptant", "cash", "el efectivo"],
  ["pay-servicio", "payment", "el servicio", "le service", "service charge", "el servicio"],
  ["place-colmado", "places", "el colmado", "le commerce de quartier", "neighborhood shop", "el colmado"],
  ["place-guagua", "places", "la guagua", "le bus / minibus", "bus / minibus", "la guagua"],
  ["music-merengue", "music", "el merengue", "Musique et danse fortement associées à la RD.", "Music and dance strongly associated with the DR.", "Música y baile muy asociados con RD."],
  ["music-bachata", "music", "la bachata", "Genre musical dominicain, souvent romantique.", "Dominican music genre, often romantic.", "Género musical dominicano, a menudo romántico."],
  ["culture-larimar", "local culture", "el larimar", "Pierre bleue dominicaine, souvent vendue comme souvenir.", "Dominican blue stone, often sold as a souvenir.", "Piedra azul dominicana, común como recuerdo."],
  ["culture-ambar", "local culture", "el ámbar", "Résine fossile utilisée en bijoux et artisanat dominicains.", "Fossil resin used in Dominican jewelry and crafts.", "Resina fósil usada en joyería y artesanía dominicana."],
  ["culture-muneca", "local culture", "la muñeca sin rostro", "la poupée sans visage", "faceless doll", "la muñeca sin rostro"],
  ["culture-taino", "local culture", "el arte taíno", "Références artistiques liées aux premiers peuples de l'île.", "Art references connected to the island's first peoples.", "Referencias artísticas vinculadas a los primeros pueblos de la isla."],
  ["place-zona", "places", "la Zona Colonial", "Quartier historique de Saint-Domingue, important pour comprendre les Amériques.", "Historic district in Santo Domingo, important for understanding the Americas.", "Barrio histórico de Santo Domingo, importante para comprender las Américas."],
  ["place-haitises", "places", "Los Haitises", "Parc national de mangroves, grottes et traces taïnos.", "National park with mangroves, caves, and Taíno traces.", "Parque nacional con manglares, cuevas y huellas taínas."],
  ["place-samana", "places", "Samaná", "Région côtière associée aux plages, baleines et excursions nature.", "Coastal region known for beaches, whales, and nature excursions.", "Región costera asociada con playas, ballenas y excursiones naturales."],
].map(([id, category, front, fr, en, es]) => ({
  id,
  category: lstr(String(category), String(category), String(category)),
  front,
  back: lstr(fr, en, es),
}));

const quizQuestions: Dom3QuizQuestion[] = [
  {
    id: "ask-recommendation",
    type: lstr("Choisir la bonne phrase", "Choose the right phrase", "Elegir la frase correcta"),
    prompt: lstr("Que dis-tu pour demander une recommandation ?", "What do you say to ask for a recommendation?", "¿Qué dices para pedir una recomendación?"),
    options: [
      { id: "a", target: "¿Qué me recomienda?", translation: lstr("Que me recommandez-vous ?", "What do you recommend?", "¿Qué me recomienda?") },
      { id: "b", target: "¿Dónde está la salida?", translation: lstr("Où est la sortie ?", "Where is the exit?", "¿Dónde está la salida?") },
      { id: "c", target: "Tengo una reservación.", translation: lstr("J'ai une réservation.", "I have a reservation.", "Tengo una reservación.") },
    ],
    correctOptionId: "a",
    explanation: lstr("C'est la formule polie et naturelle pour ouvrir le menu.", "This is the polite, natural way to open the menu conversation.", "Es una forma natural y cortés de empezar con el menú."),
  },
  {
    id: "accept-card",
    type: lstr("Paiement", "Payment", "Pago"),
    prompt: lstr("Comment demandes-tu s'ils acceptent la carte ?", "How do you ask if they accept card?", "¿Cómo preguntas si aceptan tarjeta?"),
    options: [
      { id: "a", target: "¿Acepta tarjeta?", translation: lstr("Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?") },
      { id: "b", target: "¿Tiene leche?", translation: lstr("Avez-vous du lait ?", "Do you have milk?", "¿Tiene leche?") },
      { id: "c", target: "Para comer aquí.", translation: lstr("Pour manger ici.", "For here.", "Para comer aquí.") },
    ],
    correctOptionId: "a",
    explanation: lstr("Tarjeta est le mot pratique pour payer par carte.", "Tarjeta is the practical word for paying by card.", "Tarjeta es la palabra útil para pagar con tarjeta."),
  },
  {
    id: "bill",
    type: lstr("Situation", "Situation", "Situación"),
    prompt: lstr("Comment demandes-tu l'addition ?", "How do you ask for the bill?", "¿Cómo pides la cuenta?"),
    options: [
      { id: "a", target: "¿Me trae la cuenta, por favor?", translation: lstr("Pouvez-vous m'apporter l'addition ?", "Can you bring me the bill?", "¿Me trae la cuenta?") },
      { id: "b", target: "Quiero un jugo de chinola.", translation: lstr("Je veux un jus de chinola.", "I want passion fruit juice.", "Quiero un jugo de chinola.") },
      { id: "c", target: "Está muy bueno.", translation: lstr("C'est très bon.", "It is very good.", "Está muy bueno.") },
    ],
    correctOptionId: "a",
    explanation: lstr("La cuenta est l'addition.", "La cuenta is the bill.", "La cuenta es la cuenta del restaurante."),
  },
  {
    id: "to-go",
    type: lstr("Sens", "Meaning", "Significado"),
    prompt: lstr("Quelle phrase veut dire « a emporter » ?", "Which phrase means “to go”?", "¿Qué frase significa “para llevar”?"),
    options: [
      { id: "a", target: "Para llevar, por favor.", translation: lstr("Pour emporter.", "To go.", "Para llevar.") },
      { id: "b", target: "Con hielo, por favor.", translation: lstr("Avec glace.", "With ice.", "Con hielo.") },
      { id: "c", target: "Sin azúcar, por favor.", translation: lstr("Sans sucre.", "No sugar.", "Sin azúcar.") },
    ],
    correctOptionId: "a",
    explanation: lstr("Para llevar est la formule simple pour emporter.", "Para llevar is the simple to-go phrase.", "Para llevar es la frase para pedir comida para llevar."),
  },
  {
    id: "bandera",
    type: lstr("Culture alimentaire", "Food culture", "Cultura gastronómica"),
    prompt: lstr("Quel plat est le classique riz/haricots/viande ?", "Which dish is the classic rice/beans/meat plate?", "¿Qué plato clásico trae arroz, habichuelas y carne?"),
    options: [
      { id: "a", target: "La Bandera Dominicana", translation: lstr("Le plat symbolique du midi.", "The symbolic lunch plate.", "El plato simbólico del mediodía.") },
      { id: "b", target: "Morir soñando", translation: lstr("Une boisson.", "A drink.", "Una bebida.") },
      { id: "c", target: "Larimar", translation: lstr("Une pierre bleue.", "A blue stone.", "Una piedra azul.") },
    ],
    correctOptionId: "a",
    explanation: lstr("La bandera rassemble riz, haricots, viande et souvent salade.", "La bandera brings together rice, beans, meat, and often salad.", "La bandera reúne arroz, habichuelas, carne y a menudo ensalada."),
  },
  {
    id: "guagua",
    type: lstr("Espagnol caribeen", "Caribbean Spanish", "Español caribeño"),
    prompt: lstr("Que peut vouloir dire guagua en espagnol caribeen ?", "What can guagua mean in Caribbean Spanish?", "¿Qué puede significar guagua en español caribeño?"),
    options: [
      { id: "a", target: "un bus ou minibus", translation: lstr("Transport collectif.", "Public transport.", "Transporte colectivo.") },
      { id: "b", target: "un reçu", translation: lstr("Papier de paiement.", "Payment paper.", "Recibo.") },
      { id: "c", target: "un café", translation: lstr("Boisson chaude.", "Hot drink.", "Bebida caliente.") },
    ],
    correctOptionId: "a",
    explanation: lstr("Dans plusieurs pays caribeens, guagua peut designer un bus.", "In several Caribbean countries, guagua can mean a bus.", "En varios países caribeños, guagua puede significar bus."),
  },
  {
    id: "slower",
    type: lstr("Reparer l'ecoute", "Listening repair", "Reparar la escucha"),
    prompt: lstr("Comment demandes-tu de parler plus lentement ?", "How do you ask them to speak more slowly?", "¿Cómo pides que hablen más despacio?"),
    options: [
      { id: "a", target: "Más despacio, por favor.", translation: lstr("Plus lentement, s'il vous plaît.", "More slowly, please.", "Más despacio, por favor.") },
      { id: "b", target: "Está muy bueno.", translation: lstr("C'est très bon.", "It is very good.", "Está muy bueno.") },
      { id: "c", target: "¿Tiene sancocho hoy?", translation: lstr("Avez-vous du sancocho aujourd'hui ?", "Do you have sancocho today?", "¿Tiene sancocho hoy?") },
    ],
    correctOptionId: "a",
    explanation: lstr("C'est poli, clair et tres utile si le debit est rapide.", "It is polite, clear, and very useful when speech is fast.", "Es cortés, claro y muy útil si hablan rápido."),
  },
  {
    id: "drink",
    type: lstr("Boisson", "Drink", "Bebida"),
    prompt: lstr("Quelle phrase commande un jus de chinola ?", "Which phrase orders passion fruit juice?", "¿Qué frase pide jugo de chinola?"),
    options: [
      { id: "a", target: "Quiero un jugo de chinola.", translation: lstr("Je veux un jus de chinola.", "I want passion fruit juice.", "Quiero un jugo de chinola.") },
      { id: "b", target: "¿Acepta tarjeta?", translation: lstr("Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?") },
      { id: "c", target: "No como carne.", translation: lstr("Je ne mange pas de viande.", "I do not eat meat.", "No como carne.") },
    ],
    correctOptionId: "a",
    explanation: lstr("Chinola est un mot dominicain tres utile pour le fruit de la passion.", "Chinola is a very useful Dominican word for passion fruit.", "Chinola es una palabra dominicana muy útil para la fruta de la pasión."),
  },
  {
    id: "allergy",
    type: lstr("Securite", "Safety", "Seguridad"),
    prompt: lstr("Quelle phrase commence une alerte allergie ?", "Which phrase starts an allergy warning?", "¿Qué frase empieza una advertencia de alergia?"),
    options: [
      { id: "a", target: "Soy alérgico/alérgica a...", translation: lstr("Je suis allergique a...", "I am allergic to...", "Soy alérgico/alérgica a...") },
      { id: "b", target: "Me gusta el merengue.", translation: lstr("J'aime le merengue.", "I like merengue.", "Me gusta el merengue.") },
      { id: "c", target: "Quiero visitar la Zona Colonial.", translation: lstr("Je veux visiter la Zona Colonial.", "I want to visit the Colonial Zone.", "Quiero visitar la Zona Colonial.") },
    ],
    correctOptionId: "a",
    explanation: lstr("La phrase est incomplete volontairement: ajoute l'aliment.", "The phrase is intentionally incomplete: add the food.", "La frase está incompleta a propósito: agrega el alimento."),
  },
  {
    id: "cash",
    type: lstr("Paiement", "Payment", "Pago"),
    prompt: lstr("Quelle phrase demande si tu peux payer comptant ?", "Which phrase asks if you can pay cash?", "¿Qué frase pregunta si puedes pagar en efectivo?"),
    options: [
      { id: "a", target: "¿Puedo pagar en efectivo?", translation: lstr("Puis-je payer comptant ?", "Can I pay in cash?", "¿Puedo pagar en efectivo?") },
      { id: "b", target: "¿Qué sabores tiene?", translation: lstr("Quelles saveurs avez-vous ?", "What flavors do you have?", "¿Qué sabores tiene?") },
      { id: "c", target: "¿Es picante?", translation: lstr("Est-ce piquant ?", "Is it spicy?", "¿Es picante?") },
    ],
    correctOptionId: "a",
    explanation: lstr("Efectivo = argent comptant.", "Efectivo = cash.", "Efectivo = dinero en efectivo."),
  },
  {
    id: "music",
    type: lstr("Culture", "Culture", "Cultura"),
    prompt: lstr("Quels rythmes sont fortement associes a la Republique dominicaine ?", "Which rhythms are strongly associated with the Dominican Republic?", "¿Qué ritmos se asocian fuertemente con República Dominicana?"),
    options: [
      { id: "a", target: "merengue y bachata", translation: lstr("merengue et bachata", "merengue and bachata", "merengue y bachata") },
      { id: "b", target: "tango y flamenco", translation: lstr("tango et flamenco", "tango and flamenco", "tango y flamenco") },
      { id: "c", target: "ópera y vals", translation: lstr("opera et valse", "opera and waltz", "ópera y vals") },
    ],
    correctOptionId: "a",
    explanation: lstr("Merengue et bachata sont des expressions culturelles dominicaines majeures.", "Merengue and bachata are major Dominican cultural expressions.", "Merengue y bachata son expresiones culturales dominicanas importantes."),
  },
  {
    id: "vegetarian",
    type: lstr("Preference", "Preference", "Preferencia"),
    prompt: lstr("Comment demandes-tu une option vegetarienne ?", "How do you ask for a vegetarian option?", "¿Cómo pides una opción vegetariana?"),
    options: [
      { id: "a", target: "¿Tiene una opción vegetariana?", translation: lstr("Avez-vous une option vegetarienne ?", "Do you have a vegetarian option?", "¿Tiene una opción vegetariana?") },
      { id: "b", target: "¿Está incluido el servicio?", translation: lstr("Le service est-il inclus ?", "Is service included?", "¿Está incluido el servicio?") },
      { id: "c", target: "¿Dónde pasa la guagua?", translation: lstr("Où passe le bus ?", "Where does the bus pass?", "¿Dónde pasa la guagua?") },
    ],
    correctOptionId: "a",
    explanation: lstr("Option vegetariana est transparente et polie.", "Opción vegetariana is transparent and polite.", "Opción vegetariana es transparente y cortés."),
  },
];

const finalGameRounds: Dom3GameRound[] = [
  ["breakfast", 1, "Tu veux commander du mangú au petit-déjeuner.", "You want to order mangú for breakfast.", "Quieres pedir mangú para el desayuno.", "¿Tiene mangú?", "Avez-vous du mangú ?", "Do you have mangú?", "¿Tiene mangú?"],
  ["lunch", 2, "Tu choisis le plat classique du midi.", "You choose the classic lunch plate.", "Eliges el plato clásico del mediodía.", "Quiero una bandera, por favor.", "Je veux une bandera.", "I want a bandera.", "Quiero una bandera."],
  ["juice", 3, "Tu veux un jus naturel.", "You want a natural juice.", "Quieres un jugo natural.", "¿Tiene jugo natural?", "Avez-vous du jus naturel ?", "Do you have natural juice?", "¿Tiene jugo natural?"],
  ["card", 4, "Tu veux payer par carte.", "You want to pay by card.", "Quieres pagar con tarjeta.", "¿Acepta tarjeta?", "Acceptez-vous la carte ?", "Do you accept card?", "¿Acepta tarjeta?"],
  ["repeat", 5, "L'espagnol est trop rapide.", "The Spanish is too fast.", "El español va demasiado rápido.", "¿Me puede repetir, por favor?", "Pouvez-vous répéter ?", "Can you repeat, please?", "¿Me puede repetir?"],
  ["music", 6, "Tu entends deux styles dominicains.", "You hear two Dominican styles.", "Escuchas dos estilos dominicanos.", "¿Es bachata o merengue?", "Est-ce bachata ou merengue ?", "Is it bachata or merengue?", "¿Es bachata o merengue?"],
  ["place", 7, "Tu choisis un lieu culturel a visiter.", "You choose a cultural place to visit.", "Eliges un lugar cultural para visitar.", "Quiero visitar la Zona Colonial.", "Je veux visiter la Zona Colonial.", "I want to visit the Colonial Zone.", "Quiero visitar la Zona Colonial."],
  ["thanks", 8, "Tu termines avec une formule polie.", "You finish with a polite local thank-you.", "Terminas con una frase cortés.", "Gracias, muy amable.", "Merci, c'est très gentil.", "Thank you, very kind.", "Gracias, muy amable."],
].map(([id, stop, scenarioFr, scenarioEn, scenarioEs, correct, correctFr, correctEn, correctEs]) => ({
  id: String(id),
  stop: Number(stop),
  scenario: lstr(String(scenarioFr), String(scenarioEn), String(scenarioEs)),
  options: [
    { id: "correct", target: String(correct), translation: lstr(String(correctFr), String(correctEn), String(correctEs)) },
    { id: "distractor-1", target: "¿Dónde está la salida?", translation: lstr("Où est la sortie ?", "Where is the exit?", "¿Dónde está la salida?") },
    { id: "distractor-2", target: "Tengo una reservación.", translation: lstr("J'ai une reservation.", "I have a reservation.", "Tengo una reservación.") },
  ],
  correctOptionId: "correct",
  feedback: lstr(
    "Bon choix: cette phrase resout la situation avec politesse.",
    "Good choice: this phrase solves the situation politely.",
    "Buena elección: esta frase resuelve la situación con cortesía.",
  ),
}));

const printableSheets: Dom3PrintableSheet[] = [
  {
    id: "menu-survival",
    title: lstr("Fiche survie menu", "Menu survival sheet", "Hoja de supervivencia del menú"),
    keyPhrases: ["¿Qué me recomienda?", "¿Qué trae este plato?", "¿Es picante?", "Sin picante, por favor."],
    miniExercise: lstr(
      "Choisis un plat et ecris deux questions avant de commander.",
      "Choose one dish and write two questions before ordering.",
      "Elige un plato y escribe dos preguntas antes de pedir.",
    ),
    roleplayOrChecklist: lstr(
      "Roleplay: client curieux + employe patient.",
      "Roleplay: curious customer + patient employee.",
      "Roleplay: cliente curioso + empleado paciente.",
    ),
  },
  {
    id: "food-vocab",
    title: lstr("Vocabulaire des plats dominicains", "Dominican food vocabulary sheet", "Hoja de vocabulario gastronómico dominicano"),
    keyPhrases: ["el mangú", "la bandera", "el sancocho", "los tostones", "el morir soñando"],
    miniExercise: lstr(
      "Associe chaque mot a une categorie: plat, boisson, accompagnement ou dessert.",
      "Match each word to a category: dish, drink, side, or dessert.",
      "Relaciona cada palabra con una categoría: plato, bebida, acompañamiento o postre.",
    ),
    roleplayOrChecklist: lstr(
      "Checklist: un plat pour le matin, un pour le midi, une boisson.",
      "Checklist: one breakfast item, one lunch item, one drink.",
      "Lista: un plato de desayuno, uno de almuerzo y una bebida.",
    ),
  },
  {
    id: "restaurant-roleplay",
    title: lstr("Roleplay restaurant", "Restaurant roleplay sheet", "Hoja de roleplay restaurante"),
    keyPhrases: ["Para comer aquí.", "Para llevar, por favor.", "¿Me trae la cuenta?", "¿Acepta tarjeta?"],
    miniExercise: lstr(
      "Complete le dialogue avec trois phrases de paiement.",
      "Complete the dialogue with three payment phrases.",
      "Completa el diálogo con tres frases de pago.",
    ),
    roleplayOrChecklist: lstr(
      "Roleplay: entree, commande, clarification, paiement.",
      "Roleplay: greeting, order, clarification, payment.",
      "Roleplay: saludo, pedido, aclaración, pago.",
    ),
  },
  {
    id: "culture-passport",
    title: lstr("Checklist passeport culture", "Culture passport checklist", "Checklist pasaporte cultural"),
    keyPhrases: ["Me gusta el merengue.", "¿Es bachata o merengue?", "Quiero visitar la Zona Colonial.", "¿Dónde hay un colmado cerca?"],
    miniExercise: lstr(
      "Coche trois lieux ou produits que tu veux demander a ton professeur.",
      "Check three places or products you want to ask your teacher about.",
      "Marca tres lugares o productos sobre los que quieres preguntar.",
    ),
    roleplayOrChecklist: lstr(
      "Checklist: musique, lieu, produit local, phrase de politesse.",
      "Checklist: music, place, local product, polite phrase.",
      "Lista: música, lugar, producto local, frase cortés.",
    ),
  },
];

export const dominicanRepublicFoodCulture: DominicanRepublicFoodCultureData = {
  moduleId: "dominican-republic-food-culture",
  moduleLabel: lstr(
    "Module 3 — Manger, commander et payer comme un local",
    "Module 3 — Eat, order, and pay like a local",
    "Módulo 3 — Comer, pedir y pagar como un local",
  ),
  heroTitle: lstr(
    "Manger, commander et payer comme un local",
    "Eat, order, and pay like a local",
    "Comer, pedir y pagar como un local",
  ),
  heroSubtitle: lstr(
    "Découvre les plats, les boissons et les phrases qui transforment un repas en vraie expérience dominicaine.",
    "Discover the dishes, drinks, and phrases that turn a meal into a real Dominican experience.",
    "Descubre los platos, bebidas y frases que convierten una comida en una experiencia dominicana.",
  ),
  productLabel: lstr("YoPratiqo · Voyage", "YoPratiqo · Travel", "YoPratiqo · Viaje"),
  audioComingSoonLabel: lstr("Audio bientôt disponible", "Audio coming soon", "Audio próximamente"),
  printButtonLabel: lstr("Imprimer les fiches", "Print practice sheets", "Imprimir hojas de práctica"),
  missionStops,
  foodCards,
  cultureCards,
  phraseBank,
  dialogues,
  earCards,
  grammarCards,
  flashcards,
  quizQuestions,
  finalGame: {
    title: lstr("Défi culture dominicaine", "Dominican culture challenge", "Reto de cultura dominicana"),
    subtitle: lstr(
      "Complete 8 etapes pour prouver que tu peux manger, payer et explorer avec respect.",
      "Complete 8 stops to prove you can eat, pay, and explore respectfully.",
      "Completa 8 paradas para demostrar que puedes comer, pagar y explorar con respeto.",
    ),
    successMessage: lstr(
      "Mission reussie: ton passeport culture est pret pour la prochaine conversation.",
      "Mission complete: your culture passport is ready for the next conversation.",
      "Misión cumplida: tu pasaporte cultural está listo para la próxima conversación.",
    ),
    rounds: finalGameRounds,
  },
  printableSheets,
};
