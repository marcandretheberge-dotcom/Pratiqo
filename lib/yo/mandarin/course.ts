import {
  L,
  P,
  type Exercise,
  type Localized,
  type Phrase,
  type Unit,
} from "./types";
import {
  finalMission,
  mapExercise,
  menuExercise,
  pictureListening,
  toneExercise,
} from "./activities";

export const MANDARIN_LANGUAGE_SOURCE =
  "https://ocw.mit.edu/courses/21g-101-chinese-i-regular-fall-2014/";
interface Seed extends Omit<Unit, "id" | "exercises" | "canDos"> {
  build: string[];
  reply: {
    prompt: Localized;
    correct: Phrase;
    other: Phrase;
    why: Localized;
  }[];
}
const greet = P("你好！", "Nǐ hǎo!", "Bonjour !", "Hello!", "¡Hola!");
const thanks = P("谢谢！", "Xièxie!", "Merci !", "Thank you!", "¡Gracias!");
const name = P(
  "我叫安娜。",
  "Wǒ jiào Ānnà.",
  "Je m’appelle Anna.",
  "My name is Anna.",
  "Me llamo Ana.",
);
const tea = P("茶", "chá", "thé", "tea", "té");
const water = P("水", "shuǐ", "eau", "water", "agua");
const park = P("公园", "gōngyuán", "parc", "park", "parque");
const station = P(
  "车站",
  "chēzhàn",
  "gare / arrêt",
  "station / stop",
  "estación / parada",
);
const line = (speaker: string, phrase: Phrase) => ({ ...phrase, speaker });
const seeds: Seed[] = [
  {
    number: 1,
    title: L(
      "Une première rencontre",
      "A first encounter",
      "Un primer encuentro",
    ),
    scene: "park",
    setting: L(
      "Dans un parc, Anna rencontre Lin. Écoute les noms, puis présente-toi.",
      "In a park, Anna meets Lin. Listen for the names, then introduce yourself.",
      "En un parque, Ana conoce a Lin. Escucha los nombres y preséntate.",
    ),
    goals: [
      L(
        "Saluer et donner son nom.",
        "Greet someone and give your name.",
        "Saludar y decir tu nombre.",
      ),
      L(
        "Poser une question avec 吗.",
        "Ask a question with 吗.",
        "Hacer una pregunta con 吗.",
      ),
      L(
        "Repérer quatre tons et une syllabe légère.",
        "Notice four tones and a light syllable.",
        "Reconocer cuatro tonos y una sílaba ligera.",
      ),
    ],
    dialogue: [
      line("Lin", greet),
      line("Anna", name),
      line(
        "Lin",
        P(
          "我叫林。你是学生吗？",
          "Wǒ jiào Lín. Nǐ shì xuésheng ma?",
          "Je m’appelle Lin. Es-tu étudiante ?",
          "My name is Lin. Are you a student?",
          "Me llamo Lin. ¿Eres estudiante?",
        ),
      ),
      line(
        "Anna",
        P(
          "是，我是学生。你呢？",
          "Shì, wǒ shì xuésheng. Nǐ ne?",
          "Oui, je suis étudiante. Et toi ?",
          "Yes, I’m a student. And you?",
          "Sí, soy estudiante. ¿Y tú?",
        ),
      ),
      line(
        "Lin",
        P(
          "我是老师。很高兴认识你。",
          "Wǒ shì lǎoshī. Hěn gāoxìng rènshi nǐ.",
          "Je suis professeur. Ravi de te rencontrer.",
          "I’m a teacher. Nice to meet you.",
          "Soy profesor. Encantado de conocerte.",
        ),
      ),
      line(
        "Anna",
        P(
          "我也很高兴。",
          "Wǒ yě hěn gāoxìng.",
          "Moi aussi.",
          "I’m glad too.",
          "Yo también.",
        ),
      ),
    ],
    vocabulary: [
      greet,
      name,
      P("我", "wǒ", "je / moi", "I / me", "yo"),
      P("你", "nǐ", "tu / toi", "you", "tú"),
      P("学生", "xuésheng", "élève", "student", "estudiante"),
      P("老师", "lǎoshī", "professeur", "teacher", "profesor"),
      thanks,
      P("再见", "zàijiàn", "au revoir", "goodbye", "adiós"),
    ],
    grammar: [
      {
        title: L("Dire qui l’on est", "Say who you are", "Decir quién eres"),
        text: L(
          "我 + 是 + 学生 : sujet, verbe, identité. 叫 introduit le nom. Le verbe ne change pas avec la personne.",
          "我 + 是 + 学生: subject, verb, identity. 叫 introduces a name. The verb does not change with the person.",
          "我 + 是 + 学生: sujeto, verbo, identidad. 叫 introduce un nombre. El verbo no cambia según la persona.",
        ),
        example: name,
      },
      {
        title: L(
          "Une question oui/non",
          "A yes/no question",
          "Una pregunta de sí o no",
        ),
        text: L(
          "Ajoute 吗 à la fin d’une affirmation. Pour répondre à 你是学生吗, répète 是 ou dis 不是. 吗 est léger, sans ton lexical marqué.",
          "Add 吗 to a statement. Reply to 你是学生吗 with 是 or 不是. 吗 is light, with no marked lexical tone.",
          "Añade 吗 a una afirmación. Responde a 你是学生吗 con 是 o 不是. 吗 es ligero, sin tono léxico marcado.",
        ),
        example: P(
          "你是学生吗？",
          "Nǐ shì xuésheng ma?",
          "Es-tu élève ?",
          "Are you a student?",
          "¿Eres estudiante?",
        ),
      },
    ],
    pronunciation: L(
      "mā : haut et stable ; má : montant ; mǎ : bas, remontant en isolation ; mà : descendant. Le ton neutre est bref et dépend du contexte. Dans 你好, le premier troisième ton se prononce montant ; on conserve nǐ hǎo à l’écrit. Ce parcours ne mesure pas ta prononciation.",
      "mā: high and level; má: rising; mǎ: low, rising in isolation; mà: falling. Neutral tone is short and context-dependent. In 你好, the first third tone rises; written pinyin stays nǐ hǎo. This course does not score your pronunciation.",
      "mā: alto y estable; má: ascendente; mǎ: bajo, ascendente en aislamiento; mà: descendente. El tono neutro es breve y depende del contexto. En 你好, el primer tercer tono asciende; se escribe nǐ hǎo. Este curso no puntúa tu pronunciación.",
    ),
    culture: {
      title: L("Les noms", "Names", "Los nombres"),
      text: L(
        "Dans les noms chinois, le nom de famille précède habituellement le prénom. Demande comment la personne souhaite être appelée, sans déduire son nom de famille d’une traduction.",
        "In Chinese names, the family name usually precedes the given name. Ask how someone wants to be addressed rather than guessing from a translation.",
        "En los nombres chinos, el apellido suele preceder al nombre. Pregunta cómo quiere llamarse la persona, sin deducirlo de una traducción.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "人",
    build: ["我", "叫", "安娜"],
    reply: [
      {
        prompt: L(
          "Lin te demande ton nom. Présente-toi.",
          "Lin asks your name. Introduce yourself.",
          "Lin pregunta tu nombre. Preséntate.",
        ),
        correct: name,
        other: thanks,
        why: L(
          "叫 introduit le nom ; 谢谢 remercie.",
          "叫 introduces a name; 谢谢 gives thanks.",
          "叫 introduce un nombre; 谢谢 agradece.",
        ),
      },
      {
        prompt: L(
          "Tu es élève. Réponds à 你是学生吗？",
          "You are a student. Answer 你是学生吗？",
          "Eres estudiante. Responde a 你是学生吗？",
        ),
        correct: P(
          "是，我是学生。",
          "Shì, wǒ shì xuésheng.",
          "Oui, je suis élève.",
          "Yes, I’m a student.",
          "Sí, soy estudiante.",
        ),
        other: P(
          "我是老师。",
          "Wǒ shì lǎoshī.",
          "Je suis professeur.",
          "I’m a teacher.",
          "Soy profesor.",
        ),
        why: L(
          "La réponse reprend 是 et confirme 学生.",
          "The answer repeats 是 and confirms 学生.",
          "La respuesta repite 是 y confirma 学生.",
        ),
      },
    ],
  },
  {
    number: 2,
    title: L("Au petit marché", "At the small market", "En el mercado"),
    scene: "market",
    setting: L(
      "Un étal de fruits. Lis une étiquette et confirme le prix avant d’acheter.",
      "A fruit stall. Read a label and confirm the price before buying.",
      "Un puesto de fruta. Lee una etiqueta y confirma el precio antes de comprar.",
    ),
    goals: [
      L(
        "Compter de un à dix.",
        "Count from one to ten.",
        "Contar del uno al diez.",
      ),
      L(
        "Demander et comprendre un prix.",
        "Ask and understand a price.",
        "Preguntar y entender un precio.",
      ),
      L(
        "Commander une quantité avec 个.",
        "Order a quantity with 个.",
        "Pedir una cantidad con 个.",
      ),
    ],
    dialogue: [
      line(
        "Anna",
        P(
          "你好！苹果多少钱？",
          "Nǐ hǎo! Píngguǒ duōshao qián?",
          "Bonjour ! Combien coûtent les pommes ?",
          "Hello! How much are the apples?",
          "¡Hola! ¿Cuánto cuestan las manzanas?",
        ),
      ),
      line(
        "Lin",
        P(
          "一个三块。",
          "Yī ge sān kuài.",
          "Trois yuans l’unité.",
          "Three yuan each.",
          "Tres yuanes cada una.",
        ),
      ),
      line(
        "Anna",
        P(
          "我要两个。",
          "Wǒ yào liǎng ge.",
          "J’en voudrais deux.",
          "I’d like two.",
          "Quisiera dos.",
        ),
      ),
      line(
        "Lin",
        P(
          "一共六块。",
          "Yīgòng liù kuài.",
          "Six yuans en tout.",
          "Six yuan altogether.",
          "Seis yuanes en total.",
        ),
      ),
      line("Anna", thanks),
      line(
        "Lin",
        P("不客气。", "Bù kèqi.", "De rien.", "You’re welcome.", "De nada."),
      ),
    ],
    vocabulary: [
      P("苹果", "píngguǒ", "pomme", "apple", "manzana"),
      P(
        "一个",
        "yī ge",
        "un / une (objet)",
        "one (item)",
        "uno / una (objeto)",
      ),
      P("两个", "liǎng ge", "deux (objets)", "two (items)", "dos (objetos)"),
      P(
        "多少钱",
        "duōshao qián",
        "combien d’argent",
        "how much money",
        "cuánto dinero",
      ),
      P(
        "一二三四五",
        "yī èr sān sì wǔ",
        "un, deux, trois, quatre, cinq",
        "one, two, three, four, five",
        "uno, dos, tres, cuatro, cinco",
      ),
      P(
        "六七八九十",
        "liù qī bā jiǔ shí",
        "six, sept, huit, neuf, dix",
        "six, seven, eight, nine, ten",
        "seis, siete, ocho, nueve, diez",
      ),
      P("块", "kuài", "yuan, à l’oral", "yuan, in speech", "yuan, en el habla"),
      P("买", "mǎi", "acheter", "buy", "comprar"),
    ],
    grammar: [
      {
        title: L("Compter des objets", "Count objects", "Contar objetos"),
        text: L(
          "Nombre + classificateur + nom : 两个苹果. Pour deux objets avec 个, on utilise 两 ; 二 sert à compter ou à lire un chiffre.",
          "Number + measure word + noun: 两个苹果. Use 两 for two items with 个; 二 is used in counting or reading a digit.",
          "Número + clasificador + nombre: 两个苹果. Usa 两 para dos objetos con 个; 二 se usa al contar o leer una cifra.",
        ),
        example: P(
          "两个苹果",
          "liǎng ge píngguǒ",
          "deux pommes",
          "two apples",
          "dos manzanas",
        ),
      },
      {
        title: L("Combien ?", "How much?", "¿Cuánto?"),
        text: L(
          "多少钱 occupe la place du prix dans la phrase. N’ajoute pas 吗 à cette question.",
          "多少钱 takes the place of the price. Do not add 吗 to this question.",
          "多少钱 ocupa el lugar del precio. No añadas 吗 a esta pregunta.",
        ),
        example: P(
          "这个多少钱？",
          "Zhège duōshao qián?",
          "Combien coûte ceci ?",
          "How much is this?",
          "¿Cuánto cuesta esto?",
        ),
      },
    ],
    pronunciation: L(
      "一 garde yī quand on compte. Devant un quatrième ton, il devient yí à l’oral ; devant les autres tons pleins, yì. Dans 一个, on entend généralement yí ge. Le pinyin du cours conserve la forme de dictionnaire yī.",
      "一 stays yī when counting. Before a fourth tone it becomes yí in speech; before other full tones, yì. 一个 is generally heard as yí ge. Course pinyin retains dictionary yī.",
      "一 conserva yī al contar. Ante un cuarto tono se pronuncia yí; ante los otros tonos plenos, yì. 一个 suele sonar yí ge. El pinyin conserva la forma de diccionario yī.",
    ),
    culture: {
      title: L("Lire un prix", "Read a price", "Leer un precio"),
      text: L(
        "元 est l’unité monétaire écrite ; 块 est courant à l’oral. Les prix de cette scène sont fictifs pour pratiquer, pas des prix actuels du marché.",
        "元 is the written currency unit; 块 is common in speech. Scene prices are fictional practice values, not current market prices.",
        "元 es la unidad monetaria escrita; 块 es habitual al hablar. Los precios de la escena son ficticios, no precios actuales del mercado.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "三",
    build: ["我", "要", "两个", "苹果"],
    reply: [
      {
        prompt: L(
          "Deux pommes à trois yuans l’unité : confirme le total.",
          "Two apples at three yuan each: confirm the total.",
          "Dos manzanas a tres yuanes cada una: confirma el total.",
        ),
        correct: P(
          "六块。",
          "Liù kuài.",
          "Six yuans.",
          "Six yuan.",
          "Seis yuanes.",
        ),
        other: P(
          "三块。",
          "Sān kuài.",
          "Trois yuans.",
          "Three yuan.",
          "Tres yuanes.",
        ),
        why: L(
          "Deux fois trois font six : 六.",
          "Two times three is six: 六.",
          "Dos por tres son seis: 六.",
        ),
      },
      {
        prompt: L(
          "Demande le prix, sans encore acheter.",
          "Ask the price without buying yet.",
          "Pregunta el precio sin comprar todavía.",
        ),
        correct: P(
          "多少钱？",
          "Duōshao qián?",
          "Combien ?",
          "How much?",
          "¿Cuánto?",
        ),
        other: thanks,
        why: L(
          "多少钱 demande le prix. 谢谢 ne pose pas de question.",
          "多少钱 asks the price. 谢谢 is not a question.",
          "多少钱 pregunta el precio. 谢谢 no es una pregunta.",
        ),
      },
    ],
  },
  {
    number: 3,
    title: L("Une pause au café", "A café break", "Una pausa en el café"),
    scene: "cafe",
    setting: L(
      "Tu choisis une boisson et précises ce que tu ne veux pas.",
      "Choose a drink and say what you do not want.",
      "Elige una bebida y di lo que no quieres.",
    ),
    goals: [
      L("Commander poliment.", "Order politely.", "Pedir con cortesía."),
      L("Utiliser 杯 et 碗.", "Use 杯 and 碗.", "Usar 杯 y 碗."),
      L(
        "Exprimer une préférence sans sucre.",
        "Express a preference for no sugar.",
        "Expresar una preferencia sin azúcar.",
      ),
    ],
    dialogue: [
      line(
        "Lin",
        P(
          "你想喝什么？",
          "Nǐ xiǎng hē shénme?",
          "Que voudrais-tu boire ?",
          "What would you like to drink?",
          "¿Qué te gustaría beber?",
        ),
      ),
      line(
        "Anna",
        P(
          "请给我一杯茶。",
          "Qǐng gěi wǒ yī bēi chá.",
          "Un thé, s’il vous plaît.",
          "A cup of tea, please.",
          "Una taza de té, por favor.",
        ),
      ),
      line(
        "Lin",
        P(
          "要糖吗？",
          "Yào táng ma?",
          "Avec du sucre ?",
          "Would you like sugar?",
          "¿Quieres azúcar?",
        ),
      ),
      line(
        "Anna",
        P(
          "不要糖，谢谢。",
          "Bù yào táng, xièxie.",
          "Sans sucre, merci.",
          "No sugar, thank you.",
          "Sin azúcar, gracias.",
        ),
      ),
      line(
        "Lin",
        P(
          "还要什么？",
          "Hái yào shénme?",
          "Autre chose ?",
          "Anything else?",
          "¿Algo más?",
        ),
      ),
      line(
        "Anna",
        P(
          "一碗面条。",
          "Yī wǎn miàntiáo.",
          "Un bol de nouilles.",
          "A bowl of noodles.",
          "Un cuenco de fideos.",
        ),
      ),
    ],
    vocabulary: [
      tea,
      water,
      P("咖啡", "kāfēi", "café", "coffee", "café"),
      P("面条", "miàntiáo", "nouilles", "noodles", "fideos"),
      P(
        "杯",
        "bēi",
        "tasse / verre (mesure)",
        "cup / glass (measure)",
        "taza / vaso (medida)",
      ),
      P("碗", "wǎn", "bol (mesure)", "bowl (measure)", "cuenco (medida)"),
      P("糖", "táng", "sucre", "sugar", "azúcar"),
      P("喝", "hē", "boire", "drink", "beber"),
    ],
    grammar: [
      {
        title: L(
          "Une demande polie",
          "A polite request",
          "Una petición cortés",
        ),
        text: L(
          "请给我 + quantité + aliment : 请 marque la politesse, 给我 signifie « donnez-moi ». 杯 compte les tasses, 碗 les bols.",
          "请给我 + quantity + food: 请 makes the request polite; 给我 means ‘give me’. 杯 counts cups, 碗 bowls.",
          "请给我 + cantidad + alimento: 请 aporta cortesía; 给我 significa «dame». 杯 cuenta tazas; 碗, cuencos.",
        ),
        example: P(
          "请给我一杯水。",
          "Qǐng gěi wǒ yī bēi shuǐ.",
          "Un verre d’eau, s’il vous plaît.",
          "A glass of water, please.",
          "Un vaso de agua, por favor.",
        ),
      },
      {
        title: L("Dire non", "Say no", "Decir que no"),
        text: L(
          "不 précède le verbe : 不要糖, « je ne veux pas de sucre ». 什么 remplace l’objet demandé et reste à sa place.",
          "不 precedes the verb: 不要糖, ‘I don’t want sugar’. 什么 replaces the object being asked about and stays in that position.",
          "不 precede al verbo: 不要糖, «no quiero azúcar». 什么 sustituye al objeto preguntado y permanece en esa posición.",
        ),
        example: P(
          "你喝什么？",
          "Nǐ hē shénme?",
          "Que bois-tu ?",
          "What do you drink?",
          "¿Qué bebes?",
        ),
      },
    ],
    pronunciation: L(
      "不 est bù seul. Devant un autre quatrième ton, il se prononce bú : 不要, bú yào. Dans le pinyin affiché, on garde bù pour reconnaître le mot. Écoute la phrase entière.",
      "不 is bù alone. Before another fourth tone it is pronounced bú: 不要, bú yào. Written pinyin keeps bù to identify the word. Listen to the whole phrase.",
      "不 es bù aislado. Ante otro cuarto tono se pronuncia bú: 不要, bú yào. El pinyin conserva bù para identificar la palabra. Escucha la frase entera.",
    ),
    culture: {
      title: L(
        "Le thé, des pratiques multiples",
        "Tea, many practices",
        "El té, muchas prácticas",
      ),
      text: L(
        "Les techniques de transformation du thé et les pratiques sociales associées en Chine sont inscrites par l’UNESCO. Une boisson peut ouvrir une conversation ; les préférences varient selon les personnes.",
        "UNESCO lists China’s traditional tea processing and associated social practices. A drink can start a conversation; individual preferences vary.",
        "La UNESCO inscribe las técnicas tradicionales chinas de elaboración del té y sus prácticas sociales. Una bebida puede iniciar una conversación; las preferencias varían.",
      ),
      source: "https://ich.unesco.org/en/RL/01884",
    },
    character: "口",
    build: ["请", "给", "我", "一杯", "茶"],
    reply: [
      {
        prompt: L(
          "Au serveur qui demande 要糖吗？, refuse le sucre.",
          "The server asks 要糖吗？ Decline sugar.",
          "El camarero pregunta 要糖吗？ Rechaza el azúcar.",
        ),
        correct: P(
          "不要糖，谢谢。",
          "Bù yào táng, xièxie.",
          "Sans sucre, merci.",
          "No sugar, thank you.",
          "Sin azúcar, gracias.",
        ),
        other: P(
          "我要糖。",
          "Wǒ yào táng.",
          "Je veux du sucre.",
          "I want sugar.",
          "Quiero azúcar.",
        ),
        why: L(
          "不 nie 要 : cela change réellement la commande.",
          "不 negates 要: it changes the order.",
          "不 niega 要: cambia el pedido.",
        ),
      },
      {
        prompt: L(
          "Demande un bol, et non une tasse, de nouilles.",
          "Ask for a bowl, not a cup, of noodles.",
          "Pide un cuenco, no una taza, de fideos.",
        ),
        correct: P(
          "一碗面条。",
          "Yī wǎn miàntiáo.",
          "Un bol de nouilles.",
          "A bowl of noodles.",
          "Un cuenco de fideos.",
        ),
        other: P(
          "一杯茶。",
          "Yī bēi chá.",
          "Une tasse de thé.",
          "A cup of tea.",
          "Una taza de té.",
        ),
        why: L(
          "碗 convient au bol de cette scène.",
          "碗 fits the bowl in this scene.",
          "碗 corresponde al cuenco de esta escena.",
        ),
      },
    ],
  },
  {
    number: 4,
    title: L(
      "Les personnes qui comptent",
      "People who matter",
      "Las personas importantes",
    ),
    scene: "park",
    setting: L(
      "Lin présente sa famille à Anna au parc.",
      "Lin introduces his family to Anna in the park.",
      "Lin presenta su familia a Ana en el parque.",
    ),
    goals: [
      L(
        "Présenter une personne.",
        "Introduce someone.",
        "Presentar a alguien.",
      ),
      L(
        "Exprimer la possession avec 的.",
        "Express possession with 的.",
        "Expresar posesión con 的.",
      ),
      L(
        "Dire avoir et ne pas avoir.",
        "Say have and do not have.",
        "Decir tener y no tener.",
      ),
    ],
    dialogue: [
      line(
        "Lin",
        P(
          "这是我妈妈。",
          "Zhè shì wǒ māma.",
          "Voici ma mère.",
          "This is my mother.",
          "Esta es mi madre.",
        ),
      ),
      line(
        "Anna",
        P(
          "您好！",
          "Nín hǎo!",
          "Bonjour ! (respectueux)",
          "Hello! (respectful)",
          "¡Hola! (respetuoso)",
        ),
      ),
      line(
        "Lin",
        P(
          "那是我哥哥。",
          "Nà shì wǒ gēge.",
          "Là-bas, c’est mon grand frère.",
          "That is my older brother.",
          "Aquel es mi hermano mayor.",
        ),
      ),
      line(
        "Anna",
        P(
          "你有妹妹吗？",
          "Nǐ yǒu mèimei ma?",
          "As-tu une petite sœur ?",
          "Do you have a younger sister?",
          "¿Tienes una hermana menor?",
        ),
      ),
      line(
        "Lin",
        P(
          "没有。你呢？",
          "Méiyǒu. Nǐ ne?",
          "Non. Et toi ?",
          "No. And you?",
          "No. ¿Y tú?",
        ),
      ),
      line(
        "Anna",
        P(
          "我有一个弟弟。",
          "Wǒ yǒu yī ge dìdi.",
          "J’ai un petit frère.",
          "I have a younger brother.",
          "Tengo un hermano menor.",
        ),
      ),
    ],
    vocabulary: [
      P("妈妈", "māma", "mère", "mother", "madre"),
      P("爸爸", "bàba", "père", "father", "padre"),
      P("哥哥", "gēge", "frère aîné", "older brother", "hermano mayor"),
      P("妹妹", "mèimei", "sœur cadette", "younger sister", "hermana menor"),
      P("弟弟", "dìdi", "frère cadet", "younger brother", "hermano menor"),
      P("朋友", "péngyou", "ami", "friend", "amigo"),
      P("有", "yǒu", "avoir", "have", "tener"),
      P("没有", "méiyǒu", "ne pas avoir", "do not have", "no tener"),
    ],
    grammar: [
      {
        title: L("De qui ?", "Whose?", "¿De quién?"),
        text: L(
          "的 relie le possesseur au nom : 我的朋友. Avec un lien familial proche, on peut dire 我妈妈 sans 的.",
          "的 connects the owner to the noun: 我的朋友. With close family, 我妈妈 can omit 的.",
          "的 une al poseedor y el nombre: 我的朋友. Con familiares cercanos, 我妈妈 puede omitir 的.",
        ),
        example: P(
          "她是我的朋友。",
          "Tā shì wǒ de péngyou.",
          "C’est mon amie.",
          "She is my friend.",
          "Es mi amiga.",
        ),
      },
      {
        title: L("Ne pas avoir", "Not having", "No tener"),
        text: L(
          "Pour nier 有, utilise 没有, pas 不有. 他 et 她 se prononcent tous deux tā, mais s’écrivent différemment.",
          "Negate 有 with 没有, not 不有. 他 and 她 are both pronounced tā but written differently.",
          "Niega 有 con 没有, no 不有. 他 y 她 se pronuncian tā, pero se escriben de forma distinta.",
        ),
        example: P(
          "我没有妹妹。",
          "Wǒ méiyǒu mèimei.",
          "Je n’ai pas de petite sœur.",
          "I don’t have a younger sister.",
          "No tengo hermana menor.",
        ),
      },
    ],
    pronunciation: L(
      "Dans 妈妈、爸爸、哥哥, la deuxième syllabe est légère. Ne lui donne pas systématiquement la même hauteur que la première. Compare 妈 mā et 马 mǎ : le ton change le mot.",
      "In 妈妈、爸爸、哥哥, the second syllable is light. Do not automatically give it the same pitch as the first. Compare 妈 mā and 马 mǎ: tone changes the word.",
      "En 妈妈、爸爸、哥哥, la segunda sílaba es ligera. No le des siempre la misma altura que a la primera. Compara 妈 mā y 马 mǎ: el tono cambia la palabra.",
    ),
    culture: {
      title: L(
        "Les mots de famille",
        "Family words",
        "Las palabras de familia",
      ),
      text: L(
        "哥哥 et 弟弟 distinguent frère aîné et cadet. Le français ou l’anglais peuvent ne pas préciser cet âge relatif. Une famille ne ressemble pas forcément à celle de cette scène fictive.",
        "哥哥 and 弟弟 distinguish older and younger brothers. French or English may leave that relative age unstated. Families need not resemble this fictional scene.",
        "哥哥 y 弟弟 distinguen hermano mayor y menor. Otros idiomas pueden omitir esa edad relativa. Las familias no tienen por qué parecerse a esta escena ficticia.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "女",
    build: ["她", "是", "我的", "朋友"],
    reply: [
      {
        prompt: L(
          "Tu n’as pas de petite sœur. Réponds.",
          "You have no younger sister. Answer.",
          "No tienes hermana menor. Responde.",
        ),
        correct: P(
          "我没有妹妹。",
          "Wǒ méiyǒu mèimei.",
          "Je n’ai pas de petite sœur.",
          "I have no younger sister.",
          "No tengo hermana menor.",
        ),
        other: P(
          "我有妹妹。",
          "Wǒ yǒu mèimei.",
          "J’ai une petite sœur.",
          "I have a younger sister.",
          "Tengo hermana menor.",
        ),
        why: L(
          "没有 nie la possession.",
          "没有 negates possession.",
          "没有 niega la posesión.",
        ),
      },
      {
        prompt: L(
          "Présente ta mère, pas ton amie.",
          "Introduce your mother, not your friend.",
          "Presenta a tu madre, no a tu amiga.",
        ),
        correct: P(
          "这是我妈妈。",
          "Zhè shì wǒ māma.",
          "Voici ma mère.",
          "This is my mother.",
          "Esta es mi madre.",
        ),
        other: P(
          "这是我的朋友。",
          "Zhè shì wǒ de péngyou.",
          "Voici mon amie.",
          "This is my friend.",
          "Esta es mi amiga.",
        ),
        why: L(
          "妈妈 nomme la mère ; 朋友 un ami.",
          "妈妈 means mother; 朋友 means friend.",
          "妈妈 significa madre; 朋友, amigo.",
        ),
      },
    ],
  },
  {
    number: 5,
    title: L("Trouver son chemin", "Find your way", "Encontrar el camino"),
    scene: "station",
    setting: L(
      "À la sortie d’une gare, tu cherches le parc et un moyen d’y aller.",
      "Outside a station, find the park and a way to get there.",
      "A la salida de una estación, busca el parque y cómo llegar.",
    ),
    goals: [
      L(
        "Demander où se trouve un lieu.",
        "Ask where a place is.",
        "Preguntar dónde está un lugar.",
      ),
      L(
        "Comprendre gauche, droite, tout droit.",
        "Understand left, right and straight ahead.",
        "Entender izquierda, derecha y recto.",
      ),
      L(
        "Nommer un moyen de transport.",
        "Name a means of transport.",
        "Nombrar un medio de transporte.",
      ),
    ],
    dialogue: [
      line(
        "Anna",
        P(
          "请问，公园在哪里？",
          "Qǐngwèn, gōngyuán zài nǎlǐ?",
          "Excusez-moi, où est le parc ?",
          "Excuse me, where is the park?",
          "Disculpe, ¿dónde está el parque?",
        ),
      ),
      line(
        "Lin",
        P(
          "一直走，然后向左转。",
          "Yīzhí zǒu, ránhòu xiàng zuǒ zhuǎn.",
          "Allez tout droit, puis tournez à gauche.",
          "Go straight, then turn left.",
          "Siga recto y gire a la izquierda.",
        ),
      ),
      line(
        "Anna",
        P("远吗？", "Yuǎn ma?", "Est-ce loin ?", "Is it far?", "¿Está lejos?"),
      ),
      line(
        "Lin",
        P(
          "不远。可以走路。",
          "Bù yuǎn. Kěyǐ zǒulù.",
          "Non. On peut y aller à pied.",
          "No. You can walk.",
          "No. Se puede ir andando.",
        ),
      ),
      line(
        "Anna",
        P(
          "地铁站在哪里？",
          "Dìtiězhàn zài nǎlǐ?",
          "Où est la station de métro ?",
          "Where is the metro station?",
          "¿Dónde está el metro?",
        ),
      ),
      line(
        "Lin",
        P(
          "在右边。",
          "Zài yòubian.",
          "À droite.",
          "On the right.",
          "A la derecha.",
        ),
      ),
    ],
    vocabulary: [
      park,
      station,
      P("左边", "zuǒbian", "à gauche", "on the left", "a la izquierda"),
      P("右边", "yòubian", "à droite", "on the right", "a la derecha"),
      P("地铁", "dìtiě", "métro", "metro", "metro"),
      P("走路", "zǒulù", "marcher", "walk", "andar"),
      P("在哪里", "zài nǎlǐ", "où se trouve", "where is", "dónde está"),
      P(
        "一直走",
        "yīzhí zǒu",
        "aller tout droit",
        "go straight",
        "seguir recto",
      ),
    ],
    grammar: [
      {
        title: L("Situer", "Locate", "Ubicar"),
        text: L(
          "Lieu + 在 + position : 公园在左边. Pour demander cette position, remplace-la par 哪里. 请问 introduit poliment une question.",
          "Place + 在 + position: 公园在左边. Replace the position with 哪里 to ask where. 请问 introduces a polite question.",
          "Lugar + 在 + posición: 公园在左边. Sustituye la posición por 哪里 para preguntar dónde. 请问 introduce una pregunta cortés.",
        ),
        example: P(
          "公园在左边。",
          "Gōngyuán zài zuǒbian.",
          "Le parc est à gauche.",
          "The park is on the left.",
          "El parque está a la izquierda.",
        ),
      },
      {
        title: L("Pouvoir", "Can", "Poder"),
        text: L(
          "可以 + verbe exprime ici une possibilité : 可以走路. Cela ne décrit pas une durée ou une distance précise.",
          "可以 + verb expresses a possibility here: 可以走路. It does not specify a distance or duration.",
          "可以 + verbo expresa aquí una posibilidad: 可以走路. No especifica distancia ni duración.",
        ),
        example: P(
          "可以坐地铁。",
          "Kěyǐ zuò dìtiě.",
          "On peut prendre le métro.",
          "You can take the metro.",
          "Se puede tomar el metro.",
        ),
      },
    ],
    pronunciation: L(
      "Dans nǎlǐ, deux troisièmes tons se suivent : le premier devient montant à l’oral. Distingue zǒu (marcher) et zuò (s’asseoir, prendre un transport).",
      "In nǎlǐ, two third tones meet: the first rises in speech. Distinguish zǒu (walk) and zuò (sit, take transport).",
      "En nǎlǐ se juntan dos terceros tonos: el primero asciende al hablar. Distingue zǒu (andar) y zuò (sentarse, tomar transporte).",
    ),
    culture: {
      title: L(
        "Une carte pour apprendre",
        "A learning map",
        "Un mapa para aprender",
      ),
      text: L(
        "La carte de la leçon est fictive. Elle sert à comprendre les indications, pas à naviguer dans une vraie ville. Confirme toujours le lieu et le sens d’une ligne de transport.",
        "The lesson map is fictional. It teaches directions, not navigation in a real city. Always confirm the place and direction of a transport line.",
        "El mapa es ficticio. Sirve para aprender indicaciones, no para orientarse en una ciudad real. Confirma siempre el lugar y el sentido de la línea.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "上",
    build: ["公园", "在", "左边"],
    reply: [
      {
        prompt: L(
          "On te demande où est le parc. Il est à gauche.",
          "Someone asks where the park is. It is on the left.",
          "Preguntan dónde está el parque. Está a la izquierda.",
        ),
        correct: P(
          "在左边。",
          "Zài zuǒbian.",
          "À gauche.",
          "On the left.",
          "A la izquierda.",
        ),
        other: P(
          "在右边。",
          "Zài yòubian.",
          "À droite.",
          "On the right.",
          "A la derecha.",
        ),
        why: L(
          "左 = gauche ; 右 = droite.",
          "左 = left; 右 = right.",
          "左 = izquierda; 右 = derecha.",
        ),
      },
      {
        prompt: L(
          "Demande où est la station.",
          "Ask where the station is.",
          "Pregunta dónde está la estación.",
        ),
        correct: P(
          "车站在哪里？",
          "Chēzhàn zài nǎlǐ?",
          "Où est la station ?",
          "Where is the station?",
          "¿Dónde está la estación?",
        ),
        other: P(
          "车站多少钱？",
          "Chēzhàn duōshao qián?",
          "Combien coûte la station ?",
          "How much is the station?",
          "¿Cuánto cuesta la estación?",
        ),
        why: L(
          "哪里 demande un lieu, pas un prix.",
          "哪里 asks for a place, not a price.",
          "哪里 pregunta por un lugar, no un precio.",
        ),
      },
    ],
  },
  {
    number: 6,
    title: L(
      "On se retrouve quand ?",
      "When shall we meet?",
      "¿Cuándo nos vemos?",
    ),
    scene: "street",
    setting: L(
      "Tu fixes un rendez-vous avec Lin et confirmes le jour et l’heure.",
      "Arrange to meet Lin and confirm the day and time.",
      "Queda con Lin y confirma el día y la hora.",
    ),
    goals: [
      L("Dire l’heure.", "Tell the time.", "Decir la hora."),
      L(
        "Placer le temps avant le verbe.",
        "Place time before the verb.",
        "Colocar el tiempo antes del verbo.",
      ),
      L(
        "Lire une date simple.",
        "Read a simple date.",
        "Leer una fecha sencilla.",
      ),
    ],
    dialogue: [
      line(
        "Anna",
        P(
          "明天你有时间吗？",
          "Míngtiān nǐ yǒu shíjiān ma?",
          "As-tu du temps demain ?",
          "Do you have time tomorrow?",
          "¿Tienes tiempo mañana?",
        ),
      ),
      line(
        "Lin",
        P(
          "有。几点见？",
          "Yǒu. Jǐ diǎn jiàn?",
          "Oui. À quelle heure ?",
          "Yes. What time shall we meet?",
          "Sí. ¿A qué hora nos vemos?",
        ),
      ),
      line(
        "Anna",
        P(
          "下午三点半，可以吗？",
          "Xiàwǔ sān diǎn bàn, kěyǐ ma?",
          "À quinze heures trente, ça va ?",
          "Is three thirty in the afternoon okay?",
          "¿A las tres y media de la tarde está bien?",
        ),
      ),
      line(
        "Lin",
        P(
          "可以。在哪里见？",
          "Kěyǐ. Zài nǎlǐ jiàn?",
          "Oui. Où se retrouve-t-on ?",
          "Yes. Where shall we meet?",
          "Sí. ¿Dónde nos vemos?",
        ),
      ),
      line(
        "Anna",
        P(
          "在公园见。",
          "Zài gōngyuán jiàn.",
          "Au parc.",
          "At the park.",
          "En el parque.",
        ),
      ),
      line(
        "Lin",
        P(
          "好，明天见！",
          "Hǎo, míngtiān jiàn!",
          "Bien, à demain !",
          "Okay, see you tomorrow!",
          "Bien, ¡hasta mañana!",
        ),
      ),
    ],
    vocabulary: [
      P("明天", "míngtiān", "demain", "tomorrow", "mañana"),
      P("今天", "jīntiān", "aujourd’hui", "today", "hoy"),
      P("上午", "shàngwǔ", "matin", "morning", "mañana (parte del día)"),
      P("下午", "xiàwǔ", "après-midi", "afternoon", "tarde"),
      P(
        "三点半",
        "sān diǎn bàn",
        "trois heures et demie",
        "half past three",
        "tres y media",
      ),
      P("星期一", "xīngqīyī", "lundi", "Monday", "lunes"),
      P("月", "yuè", "mois", "month", "mes"),
      P(
        "号",
        "hào",
        "jour du mois (oral)",
        "day of month (spoken)",
        "día del mes (oral)",
      ),
    ],
    grammar: [
      {
        title: L("Quand, puis quoi", "When, then what", "Cuándo, luego qué"),
        text: L(
          "Le temps se place avant le verbe : 我明天去公园. Il peut aussi ouvrir la phrase : 明天我去公园.",
          "Time comes before the verb: 我明天去公园. It can also open the sentence: 明天我去公园.",
          "El tiempo va antes del verbo: 我明天去公园. También puede abrir la frase: 明天我去公园.",
        ),
        example: P(
          "我明天去公园。",
          "Wǒ míngtiān qù gōngyuán.",
          "Je vais au parc demain.",
          "I’m going to the park tomorrow.",
          "Voy al parque mañana.",
        ),
      },
      {
        title: L("Heure et date", "Time and date", "Hora y fecha"),
        text: L(
          "点 marque l’heure ; 半 ajoute une demi-heure. Pour une date : mois + 月 + jour + 号, comme 五月三号. On précise 上午 ou 下午 au besoin.",
          "点 marks the hour; 半 adds half an hour. A date uses month + 月 + day + 号, as in 五月三号. Specify 上午 or 下午 when needed.",
          "点 marca la hora; 半 añade media hora. La fecha usa mes + 月 + día + 号, como 五月三号. Precisa 上午 o 下午 cuando haga falta.",
        ),
        example: P(
          "五月三号",
          "wǔ yuè sān hào",
          "le 3 mai",
          "May 3",
          "3 de mayo",
        ),
      },
    ],
    pronunciation: L(
      "Dans 三点半, garde sān stable, diǎn bas et bàn descendant. Les tons des mots comptent même dans les nombres. Le rythme ne remplace pas les tons.",
      "In 三点半 keep sān level, diǎn low and bàn falling. Word tones still matter in numbers. Rhythm does not replace tones.",
      "En 三点半 mantén sān estable, diǎn bajo y bàn descendente. Los tonos importan también en los números. El ritmo no sustituye a los tonos.",
    ),
    culture: {
      title: L(
        "Confirmer un rendez-vous",
        "Confirm a meeting",
        "Confirmar una cita",
      ),
      text: L(
        "Répéter le jour, l’heure et le lieu évite une ambiguïté. Ici, 三点半 est précisé par 下午 : quinze heures trente, pas trois heures trente du matin.",
        "Repeating the day, time and place avoids ambiguity. Here 下午 makes 三点半 15:30, not 03:30.",
        "Repetir día, hora y lugar evita ambigüedades. Aquí 下午 convierte 三点半 en las 15:30, no las 03:30.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "日",
    build: ["我", "明天", "去", "公园"],
    reply: [
      {
        prompt: L(
          "Confirme 15 h 30.",
          "Confirm 3:30 p.m.",
          "Confirma las 15:30.",
        ),
        correct: P(
          "下午三点半。",
          "Xiàwǔ sān diǎn bàn.",
          "15 h 30.",
          "3:30 p.m.",
          "15:30.",
        ),
        other: P(
          "上午三点半。",
          "Shàngwǔ sān diǎn bàn.",
          "3 h 30 du matin.",
          "3:30 a.m.",
          "03:30.",
        ),
        why: L(
          "下午 distingue l’après-midi.",
          "下午 specifies the afternoon.",
          "下午 especifica la tarde.",
        ),
      },
      {
        prompt: L(
          "Votre rendez-vous est demain. Prends congé.",
          "Your meeting is tomorrow. Say goodbye.",
          "La cita es mañana. Despídete.",
        ),
        correct: P(
          "明天见！",
          "Míngtiān jiàn!",
          "À demain !",
          "See you tomorrow!",
          "¡Hasta mañana!",
        ),
        other: P(
          "今天见！",
          "Jīntiān jiàn!",
          "À tout à l’heure !",
          "See you today!",
          "¡Hasta luego, hoy!",
        ),
        why: L(
          "明天 = demain ; 今天 = aujourd’hui.",
          "明天 = tomorrow; 今天 = today.",
          "明天 = mañana; 今天 = hoy.",
        ),
      },
    ],
  },
  {
    number: 7,
    title: L("Choisir et demander", "Choose and ask", "Elegir y pedir"),
    scene: "market",
    setting: L(
      "Dans une boutique, tu choisis un livre et demandes à le regarder.",
      "In a shop, choose a book and ask to look at it.",
      "En una tienda, elige un libro y pide verlo.",
    ),
    goals: [
      L("Dire ce qu’on aime.", "Say what you like.", "Decir lo que te gusta."),
      L(
        "Distinguer ce livre et celui-là.",
        "Distinguish this book and that one.",
        "Distinguir este libro y aquel.",
      ),
      L("Demander la permission.", "Ask permission.", "Pedir permiso."),
    ],
    dialogue: [
      line(
        "Lin",
        P(
          "你喜欢这本书吗？",
          "Nǐ xǐhuan zhè běn shū ma?",
          "Aimes-tu ce livre ?",
          "Do you like this book?",
          "¿Te gusta este libro?",
        ),
      ),
      line(
        "Anna",
        P(
          "喜欢。我可以看看吗？",
          "Xǐhuan. Wǒ kěyǐ kànkan ma?",
          "Oui. Puis-je le regarder ?",
          "Yes. May I have a look?",
          "Sí. ¿Puedo echarle un vistazo?",
        ),
      ),
      line("Lin", P("可以。", "Kěyǐ.", "Oui.", "Yes, you may.", "Sí, puedes.")),
      line(
        "Anna",
        P(
          "那本书多少钱？",
          "Nà běn shū duōshao qián?",
          "Combien coûte ce livre-là ?",
          "How much is that book?",
          "¿Cuánto cuesta aquel libro?",
        ),
      ),
      line(
        "Lin",
        P(
          "二十块。",
          "Èrshí kuài.",
          "Vingt yuans.",
          "Twenty yuan.",
          "Veinte yuanes.",
        ),
      ),
      line(
        "Anna",
        P(
          "我要那本，谢谢。",
          "Wǒ yào nà běn, xièxie.",
          "Je prends celui-là, merci.",
          "I’ll take that one, thanks.",
          "Me llevo aquel, gracias.",
        ),
      ),
    ],
    vocabulary: [
      P("书", "shū", "livre", "book", "libro"),
      P(
        "本",
        "běn",
        "classificateur des livres",
        "measure word for books",
        "clasificador de libros",
      ),
      P("这", "zhè", "ceci", "this", "esto"),
      P("那", "nà", "cela", "that", "eso"),
      P("喜欢", "xǐhuan", "aimer", "like", "gustar"),
      P(
        "看看",
        "kànkan",
        "jeter un coup d’œil",
        "have a look",
        "echar un vistazo",
      ),
      P("二十", "èrshí", "vingt", "twenty", "veinte"),
      P(
        "可以",
        "kěyǐ",
        "pouvoir / avoir la permission",
        "can / may",
        "poder / tener permiso",
      ),
    ],
    grammar: [
      {
        title: L(
          "Le bon classificateur",
          "The right measure word",
          "El clasificador adecuado",
        ),
        text: L(
          "Pour un livre : 一本书. Avec ceci/cela : 这本书 / 那本书. Ne remplace pas systématiquement chaque classificateur par 个.",
          "For a book: 一本书. With this/that: 这本书 / 那本书. Do not replace every measure word with 个.",
          "Para un libro: 一本书. Con este/aquel: 这本书 / 那本书. No sustituyas todos los clasificadores por 个.",
        ),
        example: P(
          "我喜欢这本书。",
          "Wǒ xǐhuan zhè běn shū.",
          "J’aime ce livre.",
          "I like this book.",
          "Me gusta este libro.",
        ),
      },
      {
        title: L("Une permission", "Permission", "Permiso"),
        text: L(
          "我可以…吗？ demande une permission. 看看 est une forme légère : regarder un peu. 不喜欢 exprime une préférence négative, pas une interdiction.",
          "我可以…吗？ asks permission. 看看 is a lighter form: have a look. 不喜欢 expresses dislike, not a prohibition.",
          "我可以…吗？ pide permiso. 看看 es una forma ligera: echar un vistazo. 不喜欢 expresa desagrado, no una prohibición.",
        ),
        example: P(
          "我可以看看吗？",
          "Wǒ kěyǐ kànkan ma?",
          "Puis-je regarder ?",
          "May I have a look?",
          "¿Puedo verlo?",
        ),
      },
    ],
    pronunciation: L(
      "Dans 喜欢 xǐhuan, huan est léger. Dans 这本书, écoute trois contours distincts : zhè descend, běn est bas, shū reste haut.",
      "In 喜欢 xǐhuan, huan is light. In 这本书 hear three distinct contours: zhè falls, běn is low, shū stays high.",
      "En 喜欢 xǐhuan, huan es ligero. En 这本书 escucha tres contornos: zhè desciende, běn es bajo y shū permanece alto.",
    ),
    culture: {
      title: L(
        "Demander plutôt que supposer",
        "Ask rather than assume",
        "Preguntar en vez de suponer",
      ),
      text: L(
        "Demander 可以看看吗 évite de supposer qu’on peut manipuler un objet. Il n’existe pas une seule façon de se comporter dans toutes les boutiques : observe et demande.",
        "Asking 可以看看吗 avoids assuming you may handle an object. There is no single rule for every shop: observe and ask.",
        "Preguntar 可以看看吗 evita dar por hecho que puedes tocar un objeto. No existe una única regla para todas las tiendas: observa y pregunta.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "本",
    build: ["我", "喜欢", "这本", "书"],
    reply: [
      {
        prompt: L(
          "Demande la permission de regarder le livre.",
          "Ask permission to look at the book.",
          "Pide permiso para ver el libro.",
        ),
        correct: P(
          "我可以看看吗？",
          "Wǒ kěyǐ kànkan ma?",
          "Puis-je regarder ?",
          "May I have a look?",
          "¿Puedo verlo?",
        ),
        other: P(
          "我不喜欢。",
          "Wǒ bù xǐhuan.",
          "Je n’aime pas.",
          "I don’t like it.",
          "No me gusta.",
        ),
        why: L(
          "可以…吗 demande une permission.",
          "可以…吗 asks permission.",
          "可以…吗 pide permiso.",
        ),
      },
      {
        prompt: L(
          "Choisis le livre éloigné, pas celui près de toi.",
          "Choose the farther book, not the one near you.",
          "Elige el libro lejano, no el que está cerca.",
        ),
        correct: P(
          "我要那本。",
          "Wǒ yào nà běn.",
          "Je veux celui-là.",
          "I want that one.",
          "Quiero aquel.",
        ),
        other: P(
          "我要这本。",
          "Wǒ yào zhè běn.",
          "Je veux celui-ci.",
          "I want this one.",
          "Quiero este.",
        ),
        why: L(
          "那 désigne celui-là ; 这 celui-ci.",
          "那 indicates that one; 这 this one.",
          "那 indica aquel; 这 este.",
        ),
      },
    ],
  },
  {
    number: 8,
    title: L("Une journée ensemble", "A day together", "Un día juntos"),
    scene: "street",
    setting: L(
      "Retrouve Lin, organise le trajet, commande et prépare demain.",
      "Meet Lin, plan the journey, order and arrange tomorrow.",
      "Encuentra a Lin, organiza el trayecto, pide y prepara mañana.",
    ),
    goals: [
      L(
        "Combiner lieu, temps et action.",
        "Combine place, time and action.",
        "Combinar lugar, tiempo y acción.",
      ),
      L(
        "Réagir sans suivre un seul dialogue appris.",
        "Respond beyond one memorized dialogue.",
        "Responder más allá de un diálogo memorizado.",
      ),
      L(
        "Demander de répéter quand nécessaire.",
        "Ask for repetition when needed.",
        "Pedir que repitan cuando haga falta.",
      ),
    ],
    dialogue: [
      line(
        "Anna",
        P(
          "我们今天去哪里？",
          "Wǒmen jīntiān qù nǎlǐ?",
          "Où allons-nous aujourd’hui ?",
          "Where are we going today?",
          "¿Adónde vamos hoy?",
        ),
      ),
      line(
        "Lin",
        P(
          "先去公园，再去吃饭。",
          "Xiān qù gōngyuán, zài qù chīfàn.",
          "D’abord au parc, puis manger.",
          "First to the park, then to eat.",
          "Primero al parque, luego a comer.",
        ),
      ),
      line(
        "Anna",
        P(
          "请再说一遍。",
          "Qǐng zài shuō yī biàn.",
          "Répète, s’il te plaît.",
          "Please say it again.",
          "Repítelo, por favor.",
        ),
      ),
      line(
        "Lin",
        P(
          "先去公园。",
          "Xiān qù gōngyuán.",
          "D’abord au parc.",
          "First to the park.",
          "Primero al parque.",
        ),
      ),
      line(
        "Anna",
        P(
          "好。我想喝茶。",
          "Hǎo. Wǒ xiǎng hē chá.",
          "Bien. Je voudrais boire du thé.",
          "Okay. I’d like tea.",
          "Bien. Quisiera té.",
        ),
      ),
      line(
        "Lin",
        P(
          "我们下午三点在咖啡馆见。",
          "Wǒmen xiàwǔ sān diǎn zài kāfēiguǎn jiàn.",
          "On se retrouve au café à quinze heures.",
          "Let’s meet at the café at three p.m.",
          "Nos vemos en el café a las tres de la tarde.",
        ),
      ),
    ],
    vocabulary: [
      P("我们", "wǒmen", "nous", "we / us", "nosotros"),
      P("先", "xiān", "d’abord", "first", "primero"),
      P("再", "zài", "ensuite / encore", "then / again", "luego / otra vez"),
      P("吃饭", "chīfàn", "manger un repas", "eat a meal", "comer"),
      P("咖啡馆", "kāfēiguǎn", "café (lieu)", "café (place)", "cafetería"),
      P("说", "shuō", "parler / dire", "speak / say", "hablar / decir"),
      P(
        "一遍",
        "yī biàn",
        "une fois (répétition complète)",
        "once (a complete repetition)",
        "una vez (repetición completa)",
      ),
      P(
        "慢一点",
        "màn yīdiǎn",
        "un peu plus lentement",
        "a little slower",
        "un poco más despacio",
      ),
    ],
    grammar: [
      {
        title: L(
          "Organiser les actions",
          "Sequence actions",
          "Ordenar acciones",
        ),
        text: L(
          "先…再… relie deux actions : d’abord, puis. Le sujet peut être partagé par les deux actions.",
          "先…再… links two actions: first, then. Both actions can share the subject.",
          "先…再… enlaza dos acciones: primero, luego. Pueden compartir el sujeto.",
        ),
        example: P(
          "我们先喝茶，再去公园。",
          "Wǒmen xiān hē chá, zài qù gōngyuán.",
          "On boit d’abord du thé, puis on va au parc.",
          "We’ll have tea first, then go to the park.",
          "Primero tomamos té y luego vamos al parque.",
        ),
      },
      {
        title: L("Temps et lieu", "Time and place", "Tiempo y lugar"),
        text: L(
          "Sujet + temps + 在 lieu + action : 我们下午三点在公园见. 去 prend directement sa destination : 去公园.",
          "Subject + time + 在 place + action: 我们下午三点在公园见. 去 takes its destination directly: 去公园.",
          "Sujeto + tiempo + 在 lugar + acción: 我们下午三点在公园见. 去 lleva directamente el destino: 去公园.",
        ),
        example: P(
          "我们下午三点在公园见。",
          "Wǒmen xiàwǔ sān diǎn zài gōngyuán jiàn.",
          "On se retrouve au parc à quinze heures.",
          "We’ll meet at the park at three p.m.",
          "Nos vemos en el parque a las tres de la tarde.",
        ),
      },
    ],
    pronunciation: L(
      "Écoute par groupes de sens : 我们 / 下午三点 / 在公园 / 见. Conserve les tons en ralentissant. Demander de répéter fait partie de la conversation, ce n’est pas un échec.",
      "Listen in meaning groups: 我们 / 下午三点 / 在公园 / 见. Keep tones when slowing down. Asking for repetition is part of conversation, not a failure.",
      "Escucha por grupos de sentido: 我们 / 下午三点 / 在公园 / 见. Mantén los tonos al ralentizar. Pedir que repitan es parte de conversar, no un fracaso.",
    ),
    culture: {
      title: L(
        "Pratiquer avec une personne",
        "Practise with a person",
        "Practicar con una persona",
      ),
      text: L(
        "Ces scènes sont des points de départ. Avec un professeur, change les lieux, les besoins et les réponses. Ce bilan interne n’est pas une certification HSK et ne mesure pas la conversation libre.",
        "These scenes are starting points. With a teacher, change places, needs and replies. This internal review is not HSK certification and does not assess free conversation.",
        "Estas escenas son puntos de partida. Con un profesor, cambia lugares, necesidades y respuestas. Este balance interno no certifica HSK ni evalúa conversación libre.",
      ),
      source: MANDARIN_LANGUAGE_SOURCE,
    },
    character: "中",
    build: ["我们", "先", "喝茶", "再", "去公园"],
    reply: [
      {
        prompt: L(
          "Tu n’as pas compris. Demande de répéter.",
          "You didn’t understand. Ask for repetition.",
          "No has entendido. Pide que repitan.",
        ),
        correct: P(
          "请再说一遍。",
          "Qǐng zài shuō yī biàn.",
          "Répète, s’il te plaît.",
          "Please say it again.",
          "Repítelo, por favor.",
        ),
        other: thanks,
        why: L(
          "再说一遍 demande une nouvelle répétition.",
          "再说一遍 asks for a repetition.",
          "再说一遍 pide una repetición.",
        ),
      },
      {
        prompt: L(
          "Rendez-vous au parc à 15 heures : confirme le lieu.",
          "Meet at the park at 3 p.m.: confirm the place.",
          "Cita en el parque a las 15:00: confirma el lugar.",
        ),
        correct: P(
          "在公园见。",
          "Zài gōngyuán jiàn.",
          "Au parc.",
          "At the park.",
          "En el parque.",
        ),
        other: P(
          "在车站见。",
          "Zài chēzhàn jiàn.",
          "À la gare.",
          "At the station.",
          "En la estación.",
        ),
        why: L(
          "公园 est le parc ; 车站 la gare ou l’arrêt.",
          "公园 is the park; 车站 the station or stop.",
          "公园 es el parque; 车站 la estación o parada.",
        ),
      },
    ],
  },
];

function exercises(seed: Seed, earlier?: Seed): Exercise[] {
  const prefix = `zh-u${String(seed.number).padStart(2, "0")}`;
  const first = seed.vocabulary[0];
  const common = {
    hint: seed.grammar[0].text,
    explanation: seed.grammar[0].text,
    model: seed.grammar[0].example,
  };
  const options = seed.vocabulary.slice(0, 4).map((phrase, index) => ({
    id: String(index),
    phrase,
    feedback: phrase.meaning,
  }));
  const rows: Exercise[] = [
    {
      ...common,
      id: `${prefix}-listen`,
      kind: "listen",
      prompt: L(
        "Écoute. Quel sens reconnais-tu ?",
        "Listen. Which meaning do you recognize?",
        "Escucha. ¿Qué significado reconoces?",
      ),
      audio: first,
      model: first,
      answer: "0",
      choices: options.map((choice) => ({
        id: choice.id,
        label: choice.phrase.meaning,
        feedback: choice.feedback,
      })),
    },
    {
      ...common,
      id: `${prefix}-match`,
      kind: "match",
      prompt: L(
        "Associe chaque expression à son sens.",
        "Match each expression to its meaning.",
        "Relaciona cada expresión con su significado.",
      ),
      pairs: seed.vocabulary.slice(0, 4),
    },
    {
      ...common,
      id: `${prefix}-build`,
      kind: "build",
      model:
        seed.number === 2
          ? P(
              "我要两个苹果。",
              "Wǒ yào liǎng ge píngguǒ.",
              "Je veux deux pommes.",
              "I want two apples.",
              "Quiero dos manzanas.",
            )
          : seed.number === 3
            ? seed.dialogue[1]
            : common.model,
      prompt: L(
        "Remets les mots en ordre.",
        "Put the words in order.",
        "Ordena las palabras.",
      ),
      tokens: [...seed.build].reverse(),
      answer: seed.build,
    },
    {
      ...common,
      id: `${prefix}-write`,
      kind: "write",
      prompt: L(
        `Écris « ${first.meaning.fr} » en caractères ou en pinyin avec les tons.`,
        `Write “${first.meaning.en}” in characters or tone-marked pinyin.`,
        `Escribe «${first.meaning.es}» en caracteres o pinyin con tonos.`,
      ),
      model: first,
      accepted: [first.hanzi, first.pinyin],
      explanation: first.meaning,
      hint: L(
        "Retrouve le premier mot de ton carnet. Le modèle compte comme une aide.",
        "Find the first word in your notebook. Viewing the model counts as help.",
        "Busca la primera palabra del cuaderno. Ver el modelo cuenta como ayuda.",
      ),
    },
    ...seed.reply.map(
      (turn, index): Exercise => ({
        id: `${prefix}-role-${index + 1}`,
        kind: "roleplay",
        scene: seed.scene,
        prompt: turn.prompt,
        model: turn.correct,
        hint: turn.why,
        explanation: turn.why,
        answer: "yes",
        choices: [
          { id: "yes", phrase: turn.correct, feedback: turn.why },
          { id: "no", phrase: turn.other, feedback: turn.why },
        ],
      }),
    ),
    toneExercise(`${prefix}-tone`, (seed.number - 1) % 4),
  ];
  if (seed.number >= 3)
    rows.push(pictureListening(`${prefix}-picture`, (seed.number - 3) % 3));
  if (seed.number === 3 || seed.number === 8)
    rows.push({ ...menuExercise, id: `${prefix}-menu` });
  if (seed.number === 5) rows.push(mapExercise);
  // Comprehension is based on taught dialogue, not isolated translation alone.
  for (const index of [1, 3]) {
    const phrase = seed.dialogue[index];
    rows.push({
      ...common,
      id: `${prefix}-dialogue-listen-${index}`,
      kind: "listen",
      audio: phrase,
      model: phrase,
      prompt: L(
        "Écoute cette réplique. Que dit la personne ?",
        "Listen to this reply. What does the speaker say?",
        "Escucha esta respuesta. ¿Qué dice la persona?",
      ),
      explanation: phrase.meaning,
      answer: String(index),
      choices: seed.dialogue
        .filter((_, i) => [1, 3, 5].includes(i))
        .map((item) => ({
          id: String(seed.dialogue.indexOf(item)),
          label: item.meaning,
          feedback: item.meaning,
        })),
    });
  }
  for (const index of [1, 2]) {
    const phrase = seed.vocabulary[index];
    rows.push({
      ...common,
      id: `${prefix}-recall-${index}`,
      kind: "write",
      model: phrase,
      accepted: [phrase.hanzi, phrase.pinyin],
      prompt: L(
        `Retrouve de mémoire : « ${phrase.meaning.fr} ».`,
        `Recall from memory: “${phrase.meaning.en}”.`,
        `Recuerda de memoria: «${phrase.meaning.es}».`,
      ),
      hint: L(
        "Utilise les caractères ou le pinyin avec les tons.",
        "Use characters or tone-marked pinyin.",
        "Usa caracteres o pinyin con tonos.",
      ),
      explanation: phrase.meaning,
    });
  }
  if (earlier) {
    const old = earlier.vocabulary[0];
    rows.push({
      ...common,
      id: `${prefix}-retrieval`,
      kind: "choice",
      prompt: L(
        `Sans ton carnet : comment dire « ${old.meaning.fr} » ?`,
        `Without your notebook: how do you say “${old.meaning.en}”?`,
        `Sin cuaderno: ¿cómo dices «${old.meaning.es}»?`,
      ),
      model: old,
      hint: L(
        "Repense à la scène du module précédent.",
        "Think back to the previous scene.",
        "Recuerda la escena anterior.",
      ),
      explanation: old.meaning,
      answer: "old",
      choices: [
        { id: "old", phrase: old, feedback: old.meaning },
        { id: "new", phrase: first, feedback: first.meaning },
      ],
    });
  }
  return rows;
}
export const mandarinUnits: Unit[] = seeds.map((seed, index) => ({
  ...seed,
  id: `u${String(seed.number).padStart(2, "0")}`,
  exercises: exercises(seed, seeds[index - 1]),
  canDos: seed.goals,
}));

export const mandarinFinal: Unit = {
  ...mandarinUnits[7],
  id: "bilan",
  number: 9,
  title: L(
    "Ta journée en mandarin",
    "Your day in Mandarin",
    "Tu día en mandarín",
  ),
  setting: L(
    "Huit situations : présente-toi, choisis, demande et confirme. Reprends ensuite les points à travailler.",
    "Eight situations: introduce, choose, ask and confirm. Then revisit what needs practice.",
    "Ocho situaciones: preséntate, elige, pregunta y confirma. Después repasa lo que falte practicar.",
  ),
  exercises: finalMission,
};
export function getMandarinUnit(id: string) {
  return id === "bilan"
    ? mandarinFinal
    : mandarinUnits.find((unit) => unit.id === id);
}
