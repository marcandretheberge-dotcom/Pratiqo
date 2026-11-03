import { L, P, type Exercise, type Phrase } from "./types";
import images from "./imageAssets.json";

export const toneLabels = [
  L("1 · haut et stable", "1 · high and level", "1 · alto y estable"),
  L("2 · montant", "2 · rising", "2 · ascendente"),
  L(
    "3 · bas, remontant seul",
    "3 · low, rising in isolation",
    "3 · bajo, ascendente aislado",
  ),
  L("4 · descendant", "4 · falling", "4 · descendente"),
];
const toneModels = [
  P("书", "shū", "livre", "book", "libro"),
  P("麻", "má", "chanvre", "hemp", "cáñamo"),
  P("马", "mǎ", "cheval", "horse", "caballo"),
  P("骂", "mà", "gronder", "scold", "regañar"),
];
export function toneExercise(id: string, index: number): Exercise {
  return {
    id,
    kind: "tone",
    tone: String(index + 1) as "1" | "2" | "3" | "4",
    audio: toneModels[index],
    model: toneModels[index],
    prompt: L(
      "Quel contour entends-tu ?",
      "Which contour do you hear?",
      "¿Qué contorno oyes?",
    ),
    hint: L(
      "Écoute la hauteur, pas le volume. Compare les quatre modèles.",
      "Listen to pitch, not volume. Compare the four models.",
      "Escucha la altura, no el volumen. Compara los cuatro modelos.",
    ),
    explanation: toneLabels[index],
    answer: String(index + 1),
    choices: toneLabels.map((label, i) => ({
      id: String(i + 1),
      label,
      feedback: label,
    })),
  };
}
const foods = [
  {
    id: "tea",
    phrase: P("茶", "chá", "thé", "tea", "té"),
    image: images.tea.src,
  },
  {
    id: "apple",
    phrase: P("苹果", "píngguǒ", "pomme", "apple", "manzana"),
    image: images.apple.src,
  },
  {
    id: "noodles",
    phrase: P("面条", "miàntiáo", "nouilles", "noodles", "fideos"),
    image: images.noodles.src,
  },
];
export function pictureListening(id: string, target = 0): Exercise {
  const phrase = foods[target].phrase;
  return {
    id,
    kind: "listen",
    audio: phrase,
    model: phrase,
    answer: foods[target].id,
    prompt: L(
      "Écoute et choisis l’image.",
      "Listen and choose the picture.",
      "Escucha y elige la imagen.",
    ),
    hint: L(
      "Retrouve le mot dans le carnet.",
      "Find the word in the notebook.",
      "Busca la palabra en el cuaderno.",
    ),
    explanation: phrase.meaning,
    choices: foods.map((food) => ({
      id: food.id,
      image: food.image,
      label: food.phrase.meaning,
      feedback: food.phrase.meaning,
    })),
  };
}
export const menuExercise: Exercise = {
  id: "zh-u03-menu",
  kind: "visual",
  answer: "tea",
  prompt: L(
    "Menu de pratique : tu as 6 yuans et tu veux une boisson. Que choisis-tu ?",
    "Practice menu: you have 6 yuan and want a drink. What do you choose?",
    "Menú de práctica: tienes 6 yuanes y quieres una bebida. ¿Qué eliges?",
  ),
  hint: L(
    "茶 est une boisson. Vérifie aussi le prix.",
    "茶 is a drink. Check the price too.",
    "茶 es una bebida. Comprueba también el precio.",
  ),
  model: P(
    "我要一杯茶。",
    "Wǒ yào yī bēi chá.",
    "Je voudrais une tasse de thé.",
    "I'd like a cup of tea.",
    "Quisiera una taza de té.",
  ),
  explanation: L(
    "Le thé à 3 yuans convient. Les nouilles à 8 dépassent le budget ; une pomme n’est pas une boisson. Prix fictifs.",
    "Tea at 3 yuan fits. Noodles at 8 exceed the budget; an apple is not a drink. Fictional prices.",
    "El té de 3 yuanes sirve. Los fideos de 8 superan el presupuesto; una manzana no es bebida. Precios ficticios.",
  ),
  choices: foods.map((food, i) => ({
    id: food.id,
    image: food.image,
    phrase: food.phrase,
    detail: L(
      `${[3, 2, 8][i]} yuans`,
      `${[3, 2, 8][i]} yuan`,
      `${[3, 2, 8][i]} yuanes`,
    ),
    feedback: food.phrase.meaning,
  })),
};
export const pictureMatching: Exercise = {
  id: "practice-picture-match",
  kind: "match",
  model: foods[0].phrase,
  prompt: L(
    "Associe les photos aux mots chinois.",
    "Match the pictures to the Chinese words.",
    "Relaciona las fotos con las palabras chinas.",
  ),
  hint: L(
    "Retrouve 茶, 苹果 et 面条.",
    "Look for 茶, 苹果 and 面条.",
    "Busca 茶, 苹果 y 面条.",
  ),
  explanation: L(
    "茶 : thé ; 苹果 : pomme ; 面条 : nouilles.",
    "茶: tea; 苹果: apple; 面条: noodles.",
    "茶: té; 苹果: manzana; 面条: fideos.",
  ),
  pairs: foods.map((food) => ({ ...food.phrase, image: food.image })),
};
export const practiceBuild: Exercise = {
  id: "practice-build",
  kind: "build",
  model: menuExercise.model,
  prompt: L(
    "Construis : je voudrais une tasse de thé.",
    "Build: I would like a cup of tea.",
    "Construye: quisiera una taza de té.",
  ),
  hint: L(
    "Sujet, verbe, quantité, boisson.",
    "Subject, verb, quantity, drink.",
    "Sujeto, verbo, cantidad, bebida.",
  ),
  explanation: menuExercise.model.meaning,
  tokens: ["茶", "一杯", "要", "我"],
  answer: ["我", "要", "一杯", "茶"],
};
export const mapExercise: Exercise = {
  id: "zh-u05-map",
  kind: "map",
  model: P(
    "公园在左边。",
    "Gōngyuán zài zuǒbian.",
    "Le parc est à gauche.",
    "The park is on the left.",
    "El parque está a la izquierda.",
  ),
  prompt: L(
    "Sur ce plan de pratique, choisis le lieu à gauche de la gare.",
    "On this practice map, choose the place to the left of the station.",
    "En este plano de práctica, elige el lugar a la izquierda de la estación.",
  ),
  hint: L(
    "左边 signifie à gauche. Regarde la position des lieux.",
    "左边 means on the left. Look at the positions.",
    "左边 significa a la izquierda. Mira las posiciones.",
  ),
  explanation: L(
    "公园 est placé à gauche de 车站. Ce plan est fictif.",
    "公园 is to the left of 车站. This is a fictional map.",
    "公园 está a la izquierda de 车站. El plano es ficticio.",
  ),
  answer: "park",
  choices: [
    {
      id: "park",
      phrase: P("公园", "gōngyuán", "parc", "park", "parque"),
      image: images.park.src,
      feedback: L("À gauche", "Left", "Izquierda"),
    },
    {
      id: "station",
      phrase: P("车站", "chēzhàn", "gare", "station", "estación"),
      image: images.station.src,
      feedback: L("Au centre", "Centre", "Centro"),
    },
    {
      id: "cafe",
      phrase: P("咖啡馆", "kāfēiguǎn", "café", "café", "cafetería"),
      image: images.cafe.src,
      feedback: L("À droite", "Right", "Derecha"),
    },
  ],
};
const reply = (
  id: string,
  prompt: ReturnType<typeof L>,
  correct: Phrase,
  wrong: Phrase,
  scene: string,
): Exercise => ({
  id,
  kind: "roleplay",
  scene,
  prompt,
  model: correct,
  answer: "correct",
  hint: L(
    "Repère le besoin avant de répondre.",
    "Notice the need before replying.",
    "Identifica la necesidad antes de responder.",
  ),
  explanation: correct.meaning,
  choices: [
    { id: "correct", phrase: correct, feedback: correct.meaning },
    { id: "other", phrase: wrong, feedback: wrong.meaning },
  ],
});
export const finalMission: Exercise[] = [
  reply(
    "zh-final-meet",
    L(
      "Tu arrives au parc pour la première fois. Salue Lin.",
      "You arrive at the park for the first time. Greet Lin.",
      "Llegas al parque por primera vez. Saluda a Lin.",
    ),
    P("你好！", "Nǐ hǎo!", "Bonjour !", "Hello!", "¡Hola!"),
    P("再见！", "Zàijiàn!", "Au revoir !", "Goodbye!", "¡Adiós!"),
    "park",
  ),
  { ...pictureListening("zh-final-market", 1), scene: "market" },
  reply(
    "zh-final-price",
    L(
      "L’étiquette indique 3 yuans par pomme. Tu en prends trois. Confirme le total.",
      "The label says 3 yuan per apple. You take three. Confirm the total.",
      "La etiqueta dice 3 yuanes por manzana. Tomas tres. Confirma el total.",
    ),
    P("九块。", "Jiǔ kuài.", "Neuf yuans.", "Nine yuan.", "Nueve yuanes."),
    P("六块。", "Liù kuài.", "Six yuans.", "Six yuan.", "Seis yuanes."),
    "market",
  ),
  reply(
    "zh-final-drink",
    L(
      "Au café, tu veux de l’eau plutôt que du thé.",
      "At the café, you want water rather than tea.",
      "En el café quieres agua en vez de té.",
    ),
    P(
      "请给我一杯水。",
      "Qǐng gěi wǒ yī bēi shuǐ.",
      "Un verre d’eau, s’il vous plaît.",
      "A glass of water, please.",
      "Un vaso de agua, por favor.",
    ),
    P(
      "请给我一杯茶。",
      "Qǐng gěi wǒ yī bēi chá.",
      "Un thé, s’il vous plaît.",
      "A tea, please.",
      "Un té, por favor.",
    ),
    "cafe",
  ),
  reply(
    "zh-final-family",
    L(
      "Ta mère vous rejoint. Présente-la à Lin.",
      "Your mother joins you. Introduce her to Lin.",
      "Tu madre llega. Preséntasela a Lin.",
    ),
    P(
      "这是我妈妈。",
      "Zhè shì wǒ māma.",
      "Voici ma mère.",
      "This is my mother.",
      "Esta es mi madre.",
    ),
    P(
      "这是我爸爸。",
      "Zhè shì wǒ bàba.",
      "Voici mon père.",
      "This is my father.",
      "Este es mi padre.",
    ),
    "park",
  ),
  { ...mapExercise, id: "zh-final-route" },
  reply(
    "zh-final-meeting",
    L(
      "Fixe le prochain rendez-vous demain à 15 heures au parc.",
      "Arrange the next meeting tomorrow at 3 p.m. in the park.",
      "Fija la próxima cita mañana a las 15:00 en el parque.",
    ),
    P(
      "明天下午三点在公园见。",
      "Míngtiān xiàwǔ sān diǎn zài gōngyuán jiàn.",
      "Demain à 15 heures au parc.",
      "Tomorrow at 3 p.m. at the park.",
      "Mañana a las 15:00 en el parque.",
    ),
    P(
      "今天上午三点在车站见。",
      "Jīntiān shàngwǔ sān diǎn zài chēzhàn jiàn.",
      "Aujourd’hui à 3 heures du matin à la gare.",
      "Today at 3 a.m. at the station.",
      "Hoy a las 03:00 en la estación.",
    ),
    "street",
  ),
  reply(
    "zh-final-repair",
    L(
      "Lin parle trop vite. Demande de ralentir.",
      "Lin speaks too fast. Ask him to slow down.",
      "Lin habla demasiado rápido. Pide que hable más despacio.",
    ),
    P(
      "请慢一点。",
      "Qǐng màn yīdiǎn.",
      "Plus lentement, s’il te plaît.",
      "A little slower, please.",
      "Más despacio, por favor.",
    ),
    P("多少钱？", "Duōshao qián?", "Combien ?", "How much?", "¿Cuánto?"),
    "street",
  ),
];
