import { choice } from "../italian/course/courseAuthoring";
import type {
  CourseAssessment,
  CourseCultureStop,
  CoursePhoto,
} from "../italian/course/courseTypes";
import { phrase as p, t } from "./courseAuthoring";

const photo = (
  name: string,
  height: number,
  author: string,
  file: string,
  caption: CoursePhoto["caption"],
  alt: CoursePhoto["alt"],
  shareAlike = true,
): CoursePhoto => ({
  src: `/images/yo/german/${name}.webp`,
  width: 1200,
  height,
  author,
  caption,
  alt,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
  license: shareAlike ? "CC BY-SA 4.0" : "CC BY 4.0",
  licenseUrl: `https://creativecommons.org/licenses/${shareAlike ? "by-sa" : "by"}/4.0/`,
});
export const germanCultureStops: Record<string, CourseCultureStop> = {
  u01: {
    title: t(
      "Berlin · une porte et quatre chevaux",
      "Berlin · a gate and four horses",
      "Berlín · una puerta y cuatro caballos",
    ),
    body: t(
      "Sur la Pariser Platz à Berlin, la porte de Brandebourg porte un quadrige : un char tiré par quatre chevaux. Ce monument est devenu un symbole de la réunification allemande. Observe d’abord les colonnes, puis le groupe sculpté au sommet.",
      "On Berlin’s Pariser Platz, the Brandenburg Gate carries a quadriga: a chariot drawn by four horses. The monument became a symbol of German reunification. First notice the columns, then the sculpture above.",
      "En la Pariser Platz de Berlín, la Puerta de Brandeburgo tiene una cuadriga: un carro tirado por cuatro caballos. El monumento se convirtió en símbolo de la reunificación alemana. Mira las columnas y luego la escultura superior.",
    ),
    observation: t(
      "Combien de chevaux composent un quadrige ? Dis le nombre : vier.",
      "How many horses make a quadriga? Say the number: vier.",
      "¿Cuántos caballos forman una cuadriga? Di el número: vier.",
    ),
    phrase: p(
      "Das ist das Brandenburger Tor.",
      "C’est la porte de Brandebourg.",
      "That is the Brandenburg Gate.",
      "Es la Puerta de Brandeburgo.",
    ),
    photo: photo(
      "berlin",
      800,
      "Pierre-Selim Huard",
      "Berlin - 0266 - 16052015 - Brandenburger Tor.jpg",
      t(
        "Porte de Brandebourg, Berlin",
        "Brandenburg Gate, Berlin",
        "Puerta de Brandeburgo, Berlín",
      ),
      t(
        "Une porte à colonnes surmontée d’un char et de chevaux.",
        "A columned gate topped with a chariot and horses.",
        "Una puerta con columnas coronada por un carro y caballos.",
      ),
      false,
    ),
    source: {
      id: "de-berlin",
      publisher: "Berlin.de",
      title: "Brandenburger Tor",
      url: "https://www.berlin.de/sehenswuerdigkeiten/3560266-3558930-brandenburger-tor.html",
      supports: t(
        "Lieu, quadrige et réunification.",
        "Location, quadriga and reunification.",
        "Lugar, cuadriga y reunificación.",
      ),
    },
  },
  u03: {
    title: t(
      "Köln · reconnaître la cathédrale",
      "Köln · recognise the cathedral",
      "Köln · reconocer la catedral",
    ),
    body: t(
      "Köln est le nom allemand de Cologne. Sa cathédrale gothique, le Kölner Dom, a deux grandes flèches. Sa construction a commencé en 1248 et s’est achevée en 1880. Pour reconnaître le lieu, retiens surtout la silhouette et le nom de la ville.",
      "Köln is the German name for Cologne. Its Gothic cathedral, the Kölner Dom, has two tall spires. Construction began in 1248 and finished in 1880. To recognise the place, focus on its outline and city name.",
      "Köln es el nombre alemán de Colonia. Su catedral gótica, el Kölner Dom, tiene dos grandes agujas. La construcción empezó en 1248 y terminó en 1880. Para reconocer el lugar, recuerda sobre todo la silueta y la ciudad.",
    ),
    observation: t(
      "Observe la silhouette gothique. Comment dit-on Cologne en allemand ?",
      "Notice the Gothic outline. What is Cologne called in German?",
      "Observa la silueta gótica. ¿Cómo se llama Colonia en alemán?",
    ),
    phrase: p(
      "Wo ist der Kölner Dom?",
      "Où est la cathédrale de Cologne ?",
      "Where is Cologne Cathedral?",
      "¿Dónde está la catedral de Colonia?",
    ),
    photo: photo(
      "cologne",
      1229,
      "Velvet",
      "Cologne cathedrale vue sud.jpg",
      t(
        "Cathédrale de Cologne, vue du sud",
        "Cologne Cathedral, southern view",
        "Catedral de Colonia, vista sur",
      ),
      t(
        "Une cathédrale gothique vue de côté, avec une haute flèche ajourée.",
        "A side view of a Gothic cathedral with a tall openwork spire.",
        "Una catedral gótica vista de lado, con una alta aguja calada.",
      ),
    ),
    source: {
      id: "de-cologne",
      publisher: "UNESCO",
      title: "Cologne Cathedral",
      url: "https://whc.unesco.org/en/list/292/",
      supports: t(
        "Architecture et histoire de la cathédrale.",
        "Cathedral architecture and history.",
        "Arquitectura e historia de la catedral.",
      ),
    },
  },
  u06: {
    title: t(
      "Le Rhin · lire un paysage",
      "The Rhine · read a landscape",
      "El Rin · leer un paisaje",
    ),
    body: t(
      "La vallée du Haut-Rhin moyen associe un fleuve, des villes historiques, des châteaux et des vignobles. La photo montre Bacharach au bord du Rhin. Ce paysage façonné par les habitants ne se résume pas à un château isolé.",
      "The Upper Middle Rhine Valley brings together a river, historic towns, castles and vineyards. The photo shows Bacharach beside the Rhine. This landscape shaped by people is more than an isolated castle.",
      "El valle del curso medio del Alto Rin reúne un río, ciudades históricas, castillos y viñedos. La foto muestra Bacharach junto al Rin. Este paisaje modelado por sus habitantes es más que un castillo aislado.",
    ),
    observation: t(
      "Repère le fleuve et les coteaux. Dis : der Rhein.",
      "Find the river and hillsides. Say: der Rhein.",
      "Localiza el río y las laderas. Di: der Rhein.",
    ),
    phrase: p(
      "Wir sind am Rhein.",
      "Nous sommes au bord du Rhin.",
      "We are beside the Rhine.",
      "Estamos junto al Rin.",
    ),
    photo: photo(
      "rhine",
      504,
      "Jörg Braukmann",
      "Bacharach 2025.jpg",
      t(
        "Bacharach, vallée du Rhin",
        "Bacharach, Rhine Valley",
        "Bacharach, valle del Rin",
      ),
      t(
        "Une ville et des coteaux le long d’un fleuve.",
        "A town and hillsides beside a river.",
        "Una ciudad y laderas junto a un río.",
      ),
    ),
    source: {
      id: "de-rhine",
      publisher: "UNESCO",
      title: "Upper Middle Rhine Valley",
      url: "https://whc.unesco.org/en/list/1066/",
      supports: t(
        "Fleuve, villes, châteaux et vignobles.",
        "River, towns, castles and vineyards.",
        "Río, ciudades, castillos y viñedos.",
      ),
    },
  },
  u08: {
    title: t(
      "Hambourg · les entrepôts sur les canaux",
      "Hamburg · warehouses on canals",
      "Hamburgo · almacenes sobre canales",
    ),
    body: t(
      "La Speicherstadt est un quartier d’entrepôts historiques de la ville portuaire de Hambourg. Les bâtiments sont reliés par un réseau de petits canaux. Observe la brique et l’eau : ces repères racontent le commerce portuaire.",
      "The Speicherstadt is a historic warehouse district in the port city of Hamburg. Its buildings are linked by a network of short canals. Notice the brick and water: they tell a story of port trade.",
      "La Speicherstadt es un barrio de almacenes históricos de la ciudad portuaria de Hamburgo. Sus edificios están unidos por una red de canales cortos. Observa el ladrillo y el agua: hablan del comercio del puerto.",
    ),
    observation: t(
      "À quoi servaient ces bâtiments : entreposer des marchandises ou accueillir des trains ?",
      "What were these buildings for: storing goods or receiving trains?",
      "¿Para qué servían estos edificios: almacenar mercancías o recibir trenes?",
    ),
    phrase: p(
      "Das ist die Speicherstadt in Hamburg.",
      "C’est la Speicherstadt à Hambourg.",
      "That is the Speicherstadt in Hamburg.",
      "Es la Speicherstadt de Hamburgo.",
    ),
    photo: photo(
      "hamburg",
      800,
      "Dietmar Rabich",
      "Hamburg, Speicherstadt, Block P -- 2016 -- 3330-6.jpg",
      t(
        "Speicherstadt, Hambourg",
        "Speicherstadt, Hamburg",
        "Speicherstadt, Hamburgo",
      ),
      t(
        "Des entrepôts de brique le long d’un canal.",
        "Brick warehouses beside a canal.",
        "Almacenes de ladrillo junto a un canal.",
      ),
    ),
    source: {
      id: "de-hamburg",
      publisher: "UNESCO",
      title: "Speicherstadt and Kontorhaus District with Chilehaus",
      url: "https://whc.unesco.org/en/list/1467/",
      supports: t(
        "Ville portuaire, entrepôts et canaux.",
        "Port city, warehouses and canals.",
        "Ciudad portuaria, almacenes y canales.",
      ),
    },
  },
};
const facts = [
  {
    unit: "u01",
    question: t(
      "Combien de chevaux tirent le quadrige ?",
      "How many horses draw the quadriga?",
      "¿Cuántos caballos tiran de la cuadriga?",
    ),
    answers: [
      t("Quatre", "Four", "Cuatro"),
      t("Deux", "Two", "Dos"),
      t("Six", "Six", "Seis"),
    ],
  },
  {
    unit: "u03",
    question: t(
      "Quel est le nom allemand de Cologne ?",
      "What is Cologne called in German?",
      "¿Cómo se llama Colonia en alemán?",
    ),
    answers: [
      t("Köln", "Köln", "Köln"),
      t("Berlin", "Berlin", "Berlín"),
      t("Hamburg", "Hamburg", "Hamburgo"),
    ],
  },
  {
    unit: "u06",
    question: t(
      "Quel fleuve accompagne Bacharach ?",
      "Which river runs beside Bacharach?",
      "¿Qué río pasa junto a Bacharach?",
    ),
    answers: [
      t("Le Rhin", "The Rhine", "El Rin"),
      t("L’Elbe", "The Elbe", "El Elba"),
      t("Le Danube", "The Danube", "El Danubio"),
    ],
  },
  {
    unit: "u08",
    question: t(
      "Quelle était la fonction des bâtiments de la Speicherstadt ?",
      "What were the Speicherstadt buildings used for?",
      "¿Para qué se usaban los edificios de la Speicherstadt?",
    ),
    answers: [
      t("Entreposer des marchandises", "Storing goods", "Almacenar mercancías"),
      t("Accueillir les trains", "Receiving trains", "Recibir trenes"),
      t(
        "Loger la cour royale",
        "Housing a royal court",
        "Alojar a la corte real",
      ),
    ],
  },
];
const cityLabels = [
  t("Berlin", "Berlin", "Berlín"),
  t("Cologne", "Cologne", "Colonia"),
  t(
    "Bacharach, sur le Rhin",
    "Bacharach, on the Rhine",
    "Bacharach, junto al Rin",
  ),
  t("Hambourg", "Hamburg", "Hamburgo"),
];
export const germanCultureFinal: CourseAssessment = {
  id: "de1-culture-final",
  title: t(
    "Le voyage en images",
    "The journey in pictures",
    "El viaje en imágenes",
  ),
  description: t(
    "Retrouve les lieux et les repères rencontrés avec Yoppo. Sans chronomètre, sans vies à perdre.",
    "Recognise the places and clues you explored with Yoppo. No timer, no lives to lose.",
    "Reconoce los lugares y detalles descubiertos con Yoppo. Sin cronómetro ni vidas que perder.",
  ),
  theme: "culture",
  passPercent: 80,
  unitIds: Object.keys(germanCultureStops),
  questions: Object.entries(germanCultureStops).flatMap(([unit, stop], i) => {
    const identify = choice(
      `de1-culture-${unit}-place`,
      t("Où sommes-nous ?", "Where are we?", "¿Dónde estamos?"),
      cityLabels.map((label, j) => ({
        id: String(j),
        label,
        feedback: stop.body,
      })),
      String(i),
      stop.body,
      "culture",
    );
    const fact = facts[i];
    const detail = choice(
      `de1-culture-${unit}-detail`,
      fact.question,
      fact.answers.map((label, j) => ({
        id: String(j),
        label,
        feedback: stop.body,
      })),
      "0",
      stop.body,
      "culture",
    );
    const offset = (i + 1) % 3;
    detail.options = [
      ...detail.options.slice(offset),
      ...detail.options.slice(0, offset),
    ];
    return [
      { ...identify, photo: stop.photo, taughtInUnitId: unit },
      { ...detail, taughtInUnitId: unit },
    ];
  }),
};
