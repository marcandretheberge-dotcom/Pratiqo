import { choice, option } from "../italian/course/courseAuthoring";
import type {
  CourseAssessment,
  CourseCultureStop,
  CoursePhoto,
} from "../italian/course/courseTypes";
import { phrase as p, t } from "./courseAuthoring";
const photo = (
  name: string,
  height: number,
  file: string,
  author: string,
  caption: CoursePhoto["caption"],
  alt: CoursePhoto["alt"],
  version = "4.0",
): CoursePhoto => ({
  src: `/images/yo/portuguese-br/${name}.webp`,
  width: 1200,
  height,
  author,
  caption,
  alt,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
  license: `CC BY-SA ${version}`,
  licenseUrl: `https://creativecommons.org/licenses/by-sa/${version}/`,
});
export const portugueseCultureStops: Record<string, CourseCultureStop> = {
  u01: {
    title: t(
      "Rio · entre mer et montagnes",
      "Rio · between sea and mountains",
      "Río · entre mar y montañas",
    ),
    body: t(
      "Le Pão de Açúcar est un sommet rocheux de Rio de Janeiro, près de l’entrée de la baie de Guanabara. Le paysage culturel de Rio associe montagnes, mer et espaces façonnés par les habitants. Rio n’est pas la capitale actuelle du Brésil.",
      "Pão de Açúcar is a rocky summit in Rio de Janeiro, near the entrance to Guanabara Bay. Rio’s cultural landscape brings together mountains, sea and spaces shaped by people. Rio is not Brazil’s current capital.",
      "El Pão de Açúcar es una cumbre rocosa de Río de Janeiro, cerca de la entrada de la bahía de Guanabara. Su paisaje cultural une montañas, mar y espacios modelados por las personas. Río no es la capital actual de Brasil.",
    ),
    observation: t(
      "Repère le relief rocheux et l’eau. Retiens le nom Pão de Açúcar.",
      "Find the rocky peak and water. Remember the name Pão de Açúcar.",
      "Localiza la cumbre rocosa y el agua. Recuerda el nombre Pão de Açúcar.",
    ),
    phrase: p(
      "Estou no Rio de Janeiro.",
      "Je suis à Rio de Janeiro.",
      "I am in Rio de Janeiro.",
      "Estoy en Río de Janeiro.",
    ),
    photo: photo(
      "rio",
      652,
      "Sugarloaf Mountain - Rio de Janeiro.jpg",
      "Tlrmedia",
      t(
        "Pão de Açúcar, Rio de Janeiro",
        "Pão de Açúcar, Rio de Janeiro",
        "Pão de Açúcar, Río de Janeiro",
      ),
      t(
        "Un sommet rocheux arrondi près de la mer.",
        "A rounded rocky peak beside the sea.",
        "Una cumbre rocosa redondeada junto al mar.",
      ),
    ),
    source: {
      id: "br-rio",
      publisher: "UNESCO",
      title:
        "Rio de Janeiro: Carioca Landscapes between the Mountain and the Sea",
      url: "https://whc.unesco.org/en/list/1100/",
      supports: t(
        "Le paysage culturel de Rio.",
        "Rio’s cultural landscape.",
        "El paisaje cultural de Río.",
      ),
    },
  },
  u03: {
    title: t(
      "Salvador · regarder au-delà des couleurs",
      "Salvador · look beyond the colours",
      "Salvador · mirar más allá de los colores",
    ),
    body: t(
      "Le Pelourinho appartient au centre historique de Salvador, dans l’État de Bahia. Salvador fut la première capitale du Brésil colonial. Son histoire mêle influences africaines, européennes et autochtones; les façades colorées ne doivent pas faire oublier l’histoire de l’esclavage.",
      "Pelourinho belongs to Salvador’s historic centre, in the state of Bahia. Salvador was colonial Brazil’s first capital. Its history brings together African, European and Indigenous influences; colourful façades should not obscure the history of slavery.",
      "El Pelourinho forma parte del centro histórico de Salvador, en Bahía. Salvador fue la primera capital del Brasil colonial. Su historia reúne influencias africanas, europeas e indígenas; las fachadas de colores no deben ocultar la historia de la esclavitud.",
    ),
    observation: t(
      "Observe la place et les façades. Dans quel État se trouve Salvador ? Bahia.",
      "Notice the square and façades. In which state is Salvador? Bahia.",
      "Observa la plaza y las fachadas. ¿En qué estado está Salvador? Bahía.",
    ),
    phrase: p(
      "Onde fica o Pelourinho?",
      "Où se trouve le Pelourinho ?",
      "Where is Pelourinho?",
      "¿Dónde queda el Pelourinho?",
    ),
    photo: photo(
      "salvador",
      675,
      "Pelourinho-Salvador.jpg",
      "Geotrieb",
      t(
        "Pelourinho, Salvador de Bahia",
        "Pelourinho, Salvador da Bahia",
        "Pelourinho, Salvador de Bahía",
      ),
      t(
        "Une place bordée de bâtiments historiques et d’une église.",
        "A square lined with historic buildings and a church.",
        "Una plaza rodeada de edificios históricos y una iglesia.",
      ),
    ),
    source: {
      id: "br-salvador",
      publisher: "UNESCO",
      title: "Historic Centre of Salvador de Bahia",
      url: "https://whc.unesco.org/en/list/309/",
      supports: t(
        "Capitale historique et influences culturelles.",
        "Historic capital and cultural influences.",
        "Capital histórica e influencias culturales.",
      ),
    },
  },
  u06: {
    title: t(
      "Brasília · reconnaître la capitale",
      "Brasília · recognise the capital",
      "Brasília · reconocer la capital",
    ),
    body: t(
      "Brasília est la capitale du Brésil depuis 1960. L’urbaniste Lucio Costa a conçu le plan de la ville, et Oscar Niemeyer plusieurs bâtiments publics. Les deux tours et les volumes arrondis du Congrès national sont des repères de cette architecture moderne.",
      "Brasília has been Brazil’s capital since 1960. Urban planner Lucio Costa designed the city plan, and Oscar Niemeyer several public buildings. The National Congress’s twin towers and rounded forms are landmarks of this modern architecture.",
      "Brasília es la capital de Brasil desde 1960. El urbanista Lucio Costa diseñó el plan de la ciudad y Oscar Niemeyer varios edificios públicos. Las torres gemelas y formas redondeadas del Congreso Nacional son referentes de esta arquitectura moderna.",
    ),
    observation: t(
      "Compare les tours droites et les volumes courbes. La capitale est Brasília, pas Rio.",
      "Compare the straight towers and curved forms. The capital is Brasília, not Rio.",
      "Compara las torres rectas y las formas curvas. La capital es Brasília, no Río.",
    ),
    phrase: p(
      "Brasília é a capital do Brasil.",
      "Brasília est la capitale du Brésil.",
      "Brasília is Brazil’s capital.",
      "Brasília es la capital de Brasil.",
    ),
    photo: photo(
      "brasilia",
      900,
      "Congresso Nacional, Brasilia.jpg",
      "Hikaru Barata",
      t(
        "Congrès national, Brasília",
        "National Congress, Brasília",
        "Congreso Nacional, Brasília",
      ),
      t(
        "Deux tours et des volumes arrondis derrière une pelouse.",
        "Twin towers and rounded forms behind a lawn.",
        "Dos torres y formas redondeadas detrás de un césped.",
      ),
    ),
    source: {
      id: "br-brasilia",
      publisher: "UNESCO",
      title: "Brasilia",
      url: "https://whc.unesco.org/en/list/445/",
      supports: t(
        "Plan urbain et architecture moderne.",
        "Urban plan and modern architecture.",
        "Plan urbano y arquitectura moderna.",
      ),
    },
  },
  u08: {
    title: t(
      "Iguaçu · un paysage partagé",
      "Iguaçu · a shared landscape",
      "Iguaçu · un paisaje compartido",
    ),
    body: t(
      "Les chutes d’Iguaçu sont situées sur la frontière entre le Brésil et l’Argentine. Le parc national brésilien protège une partie de la forêt atlantique. La photographie montre l’ensemble des chutes, pas un itinéraire : sur place, on suit les sentiers autorisés.",
      "Iguaçu Falls lie on the border between Brazil and Argentina. The Brazilian national park protects part of the Atlantic Forest. The photograph shows the falls, not a route: visitors should follow designated trails.",
      "Las cataratas de Iguaçu están en la frontera entre Brasil y Argentina. El parque nacional brasileño protege parte de la Mata Atlántica. La foto muestra las cataratas, no una ruta: se deben seguir los senderos autorizados.",
    ),
    observation: t(
      "Repère les chutes et la forêt. Ce paysage est partagé avec l’Argentine.",
      "Notice the falls and forest. This landscape is shared with Argentina.",
      "Observa las cataratas y el bosque. Este paisaje se comparte con Argentina.",
    ),
    phrase: p(
      "Vamos seguir a trilha.",
      "Suivons le sentier.",
      "Let us follow the trail.",
      "Sigamos el sendero.",
    ),
    photo: photo(
      "iguacu",
      801,
      "Iguazu Cataratas2.jpg",
      "Enaldo Valadares",
      t(
        "Vue aérienne des chutes d’Iguaçu",
        "Aerial view of Iguaçu Falls",
        "Vista aérea de las cataratas de Iguaçu",
      ),
      t(
        "De grandes chutes d’eau entourées de forêt.",
        "Large waterfalls surrounded by forest.",
        "Grandes cataratas rodeadas de bosque.",
      ),
      "3.0",
    ),
    source: {
      id: "br-iguacu",
      publisher: "UNESCO",
      title: "Iguaçu National Park",
      url: "https://whc.unesco.org/en/list/355/",
      supports: t(
        "Frontière, chutes et forêt atlantique.",
        "Border, waterfalls and Atlantic Forest.",
        "Frontera, cataratas y Mata Atlántica.",
      ),
    },
  },
};
const facts = [
  [
    "u01",
    t(
      "Quelle ville reconnais-tu ?",
      "Which city do you recognise?",
      "¿Qué ciudad reconoces?",
    ),
    ["Rio de Janeiro", "Brasília", "Salvador"],
  ],
  [
    "u01",
    t(
      "Quel relief est représenté ?",
      "Which landmark is pictured?",
      "¿Qué relieve aparece?",
    ),
    ["Pão de Açúcar", "Congresso Nacional", "Pelourinho"],
  ],
  [
    "u03",
    t(
      "Dans quelle ville est cette place ?",
      "In which city is this square?",
      "¿En qué ciudad está esta plaza?",
    ),
    ["Salvador", "Rio de Janeiro", "Brasília"],
  ],
  [
    "u03",
    t(
      "Dans quel État se trouve Salvador ?",
      "In which state is Salvador?",
      "¿En qué estado está Salvador?",
    ),
    ["Bahia", "Paraná", "São Paulo"],
  ],
  [
    "u06",
    t(
      "Quelle est la capitale actuelle du Brésil ?",
      "What is Brazil’s current capital?",
      "¿Cuál es la capital actual de Brasil?",
    ),
    ["Brasília", "Rio de Janeiro", "Salvador"],
  ],
  [
    "u06",
    t(
      "Quel bâtiment reconnais-tu ?",
      "Which building do you recognise?",
      "¿Qué edificio reconoces?",
    ),
    ["Congresso Nacional", "Pelourinho", "Pão de Açúcar"],
  ],
  [
    "u08",
    t(
      "Quel paysage reconnais-tu ?",
      "Which landscape do you recognise?",
      "¿Qué paisaje reconoces?",
    ),
    ["Cataratas do Iguaçu", "Pão de Açúcar", "Pelourinho"],
  ],
  [
    "u08",
    t(
      "Avec quel pays ce paysage est-il partagé ?",
      "With which country is this landscape shared?",
      "¿Con qué país se comparte este paisaje?",
    ),
    ["Argentina", "Portugal", "Canadá"],
  ],
] as const;
export const portugueseCultureFinal: CourseAssessment = {
  id: "ptbr1-culture-final",
  theme: "culture",
  title: t("Le Brésil en images", "Brazil in pictures", "Brasil en imágenes"),
  description: t(
    "Retrouve les lieux et les repères rencontrés pendant le parcours. Sans chrono; chaque réponse renvoie à sa leçon.",
    "Recall the places and clues encountered along the course. No timer; each answer links back to its lesson.",
    "Recuerda los lugares y las pistas del recorrido. Sin cronómetro; cada respuesta enlaza con su lección.",
  ),
  unitIds: Object.keys(portugueseCultureStops),
  passPercent: 80,
  questions: facts.map(([unitId, prompt, answers], i) => {
    const stop = portugueseCultureStops[unitId];
    const options = answers.map((answer, j) =>
      option(String(j), answer, stop.body),
    );
    const rotated = [...options.slice(i % 3), ...options.slice(0, i % 3)];
    return {
      ...choice(`ptbr1-culture-${i + 1}`, prompt, rotated, "0", stop.body),
      photo: stop.photo,
      taughtInUnitId: unitId,
    };
  }),
};
