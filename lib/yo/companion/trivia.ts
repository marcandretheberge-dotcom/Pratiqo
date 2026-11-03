import { L, type Localized } from "../mandarin/types";

export type TriviaCategory =
  | "culture"
  | "geography"
  | "nature"
  | "science"
  | "everyday";
export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  difficulty: 1 | 2;
  question: Localized;
  choices: { id: string; label: Localized }[];
  answer: string;
  explanation: Localized;
  source: string;
  verifiedAt: string;
}
export const triviaCategories: Record<TriviaCategory, Localized> = {
  culture: L(
    "Langues et cultures",
    "Languages and cultures",
    "Lenguas y culturas",
  ),
  geography: L("Lieux et voyages", "Places and travel", "Lugares y viajes"),
  nature: L("Le monde vivant", "The living world", "El mundo vivo"),
  science: L(
    "Sciences et inventions",
    "Science and inventions",
    "Ciencia e inventos",
  ),
  everyday: L(
    "Arts et vie quotidienne",
    "Arts and everyday life",
    "Arte y vida cotidiana",
  ),
};
type Triple = [string, string, string];
const tr = (value: Triple) => L(...value);
function Q(
  id: string,
  category: TriviaCategory,
  question: Triple,
  correct: Triple,
  other: Triple,
  last: Triple,
  explanation: Triple,
  source: string,
  difficulty: 1 | 2 = 1,
): TriviaQuestion {
  const choices = [
    { id: "a", label: tr(correct) },
    { id: "b", label: tr(other) },
    { id: "c", label: tr(last) },
  ];
  // Stable but varied positions; answer identity never depends on the display order.
  const offset =
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  return {
    id: `yoppo-${id}`,
    category,
    difficulty,
    question: tr(question),
    choices: [...choices.slice(offset), ...choices.slice(0, offset)],
    answer: "a",
    explanation: tr(explanation),
    source,
    verifiedAt: "2026-11-02",
  };
}
const panda = "https://nationalzoo.si.edu/animals/giant-panda";
const mercury = "https://science.nasa.gov/mercury/facts/";
const venus = "https://science.nasa.gov/venus/venus-facts/";
const mars = "https://science.nasa.gov/mars/facts/";
const suzhou = "https://whc.unesco.org/en/list/813/";
const canal = "https://whc.unesco.org/en/list/1443/";
const calligraphy = "https://ich.unesco.org/en/RL/chinese-calligraphy-00216";
const shadow = "https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421";
const otter = "https://nationalzoo.si.edu/animals/asian-small-clawed-otter";
const coral = "https://oceanexplorer.noaa.gov/ocean-fact/coral-animal/";
const octopus =
  "https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives";
const lake = "https://whc.unesco.org/en/list/1334/";
const mountain = "https://whc.unesco.org/en/list/547/";
const wall = "https://whc.unesco.org/en/list/438/";
const warriors = "https://whc.unesco.org/en/list/441/";
const print =
  "https://ich.unesco.org/en/RL/china-engraved-block-printing-technique-00229";
const silk =
  "https://ich.unesco.org/en/RL/sericulture-and-silk-craftsmanship-in-china-00197";
const paper = "https://ich.unesco.org/en/RL/chinese-paper-cut-00219";
const tea = "https://www.iso.org/obp/ui#iso:std:iso:20715:ed-1:v1:en";
const writing =
  "https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/5d7516aefe6bf45dfb045687830fe27f_MITRES_21G_003S11_char01.pdf";
export const yoppoTrivia: TriviaQuestion[] = [
  Q(
    "otter-size",
    "nature",
    [
      "La loutre cendrée est la plus…",
      "The Asian small-clawed otter is the…",
      "La nutria asiática de uñas pequeñas es la más…",
    ],
    ["Petite des loutres", "Smallest otter", "Pequeña de las nutrias"],
    ["Grande des loutres", "Largest otter", "Grande de las nutrias"],
    ["Lente des baleines", "Slowest whale", "Lenta de las ballenas"],
    [
      "Sa petite taille la distingue parmi les loutres.",
      "Its small size distinguishes it among otters.",
      "Su tamaño la distingue entre las nutrias.",
    ],
    otter,
  ),
  Q(
    "otter-feet",
    "nature",
    [
      "Les pattes de la loutre cendrée sont…",
      "The Asian small-clawed otter's feet are…",
      "Las patas de la nutria asiática de uñas pequeñas son…",
    ],
    ["Partiellement palmées", "Partly webbed", "Parcialmente palmeadas"],
    ["Des sabots", "Hooves", "Pezuñas"],
    ["Des ailes", "Wings", "Alas"],
    [
      "Les doigts restent très mobiles.",
      "The digits remain very dexterous.",
      "Los dedos conservan gran destreza.",
    ],
    otter,
    2,
  ),
  Q(
    "otter-food",
    "nature",
    [
      "Avec quoi la loutre cendrée cherche-t-elle sa nourriture ?",
      "What does the Asian small-clawed otter use to find food?",
      "¿Con qué busca alimento la nutria asiática de uñas pequeñas?",
    ],
    ["Ses pattes avant", "Its forepaws", "Sus patas delanteras"],
    ["Ses plumes", "Its feathers", "Sus plumas"],
    ["Ses antennes", "Its antennae", "Sus antenas"],
    [
      "Elle explore les fonds avec ses coussinets sensibles.",
      "Sensitive pads explore the bottom.",
      "Explora el fondo con almohadillas sensibles.",
    ],
    otter,
  ),
  Q(
    "coral-animal",
    "nature",
    ["Un corail est…", "A coral is…", "Un coral es…"],
    ["Un animal", "An animal", "Un animal"],
    ["Une plante", "A plant", "Una planta"],
    ["Une roche inerte", "A lifeless rock", "Una roca inerte"],
    [
      "Les coraux appartiennent aux invertébrés.",
      "Corals are invertebrates.",
      "Los corales son invertebrados.",
    ],
    coral,
  ),
  Q(
    "coral-polyp",
    "nature",
    [
      "Les individus d’une colonie de coraux sont des…",
      "Individuals in a coral colony are…",
      "Los individuos de una colonia de coral son…",
    ],
    ["Polypes", "Polyps", "Pólipos"],
    ["Graines", "Seeds", "Semillas"],
    ["Cristaux", "Crystals", "Cristales"],
    [
      "Une colonie rassemble de nombreux petits animaux.",
      "A colony contains many small animals.",
      "Una colonia reúne muchos animales pequeños.",
    ],
    coral,
    2,
  ),
  Q(
    "coral-tentacles",
    "nature",
    [
      "Le polype capture sa nourriture avec des…",
      "A polyp catches food with…",
      "El pólipo captura alimento con…",
    ],
    ["Tentacules", "Tentacles", "Tentáculos"],
    ["Racines", "Roots", "Raíces"],
    ["Branches", "Branches", "Ramas"],
    [
      "Ils entourent l’ouverture de son estomac.",
      "They surround its stomach opening.",
      "Rodean la abertura de su estómago.",
    ],
    coral,
  ),
  Q(
    "octopus-arms",
    "nature",
    [
      "Combien de bras a une pieuvre ?",
      "How many arms does an octopus have?",
      "¿Cuántos brazos tiene un pulpo?",
    ],
    ["Huit", "Eight", "Ocho"],
    ["Six", "Six", "Seis"],
    ["Dix", "Ten", "Diez"],
    [
      "Le calmar, lui, possède aussi deux longs tentacules.",
      "Squid also have two long tentacles.",
      "El calamar tiene además dos tentáculos largos.",
    ],
    octopus,
  ),
  Q(
    "octopus-hearts",
    "nature",
    [
      "Combien de cœurs a une pieuvre ?",
      "How many hearts does an octopus have?",
      "¿Cuántos corazones tiene un pulpo?",
    ],
    ["Trois", "Three", "Tres"],
    ["Un", "One", "Uno"],
    ["Cinq", "Five", "Cinco"],
    [
      "Deux servent les branchies, un le reste du corps.",
      "Two serve the gills, one the rest of the body.",
      "Dos sirven a las branquias y uno al cuerpo.",
    ],
    octopus,
  ),
  Q(
    "octopus-blood",
    "nature",
    [
      "Le sang oxygéné d’une pieuvre est…",
      "An octopus's oxygenated blood is…",
      "La sangre oxigenada de un pulpo es…",
    ],
    ["Bleu", "Blue", "Azul"],
    ["Vert", "Green", "Verde"],
    ["Orange", "Orange", "Naranja"],
    [
      "Le cuivre de l’hémocyanine explique cette couleur.",
      "Copper in hemocyanin explains the colour.",
      "El cobre de la hemocianina explica el color.",
    ],
    octopus,
    2,
  ),
  Q(
    "lake-city",
    "geography",
    [
      "Le lac de l’Ouest se trouve à…",
      "West Lake is in…",
      "El Lago del Oeste está en…",
    ],
    ["Hangzhou", "Hangzhou", "Hangzhou"],
    ["Oslo", "Oslo", "Oslo"],
    ["Montréal", "Montreal", "Montreal"],
    [
      "Il fait partie du paysage culturel de Hangzhou.",
      "It forms part of Hangzhou's cultural landscape.",
      "Forma parte del paisaje cultural de Hangzhou.",
    ],
    lake,
  ),
  Q(
    "lake-islands",
    "geography",
    [
      "Quel élément aménagé trouve-t-on au lac de l’Ouest ?",
      "What built feature is found at West Lake?",
      "¿Qué elemento construido hay en el Lago del Oeste?",
    ],
    ["Des îles artificielles", "Artificial islands", "Islas artificiales"],
    ["Une calotte glaciaire", "An ice cap", "Un casquete polar"],
    ["Un volcan actif", "An active volcano", "Un volcán activo"],
    [
      "Îles et chaussées participent au paysage.",
      "Islands and causeways shape the landscape.",
      "Islas y calzadas forman el paisaje.",
    ],
    lake,
  ),
  Q(
    "lake-inspiration",
    "geography",
    [
      "Le lac de l’Ouest, à Hangzhou, a notamment inspiré…",
      "West Lake in Hangzhou notably inspired…",
      "El Lago del Oeste de Hangzhou inspiró especialmente…",
    ],
    [
      "Poètes et paysagistes",
      "Poets and garden designers",
      "Poetas y paisajistas",
    ],
    ["Des pistes lunaires", "Lunar tracks", "Pistas lunares"],
    ["La glace polaire", "Polar ice", "El hielo polar"],
    [
      "Son influence dépasse la Chine.",
      "Its influence extends beyond China.",
      "Su influencia va más allá de China.",
    ],
    lake,
  ),
  Q(
    "huangshan-rock",
    "geography",
    [
      "Les pics de Huangshan sont surtout en…",
      "Huangshan's peaks are mainly…",
      "Los picos de Huangshan son principalmente de…",
    ],
    ["Granit", "Granite", "Granito"],
    ["Glace", "Ice", "Hielo"],
    ["Bois", "Wood", "Madera"],
    [
      "Ces roches forment un paysage montagneux spectaculaire.",
      "The rocks form a dramatic mountain landscape.",
      "Estas rocas forman un paisaje montañoso espectacular.",
    ],
    mountain,
    2,
  ),
  Q(
    "huangshan-cloud",
    "geography",
    [
      "Les pics de Huangshan émergent souvent d’une mer de…",
      "Huangshan's peaks often rise above a sea of…",
      "Los picos de Huangshan suelen sobresalir de un mar de…",
    ],
    ["Nuages", "Clouds", "Nubes"],
    ["Lave", "Lava", "Lava"],
    ["Sel", "Salt", "Sal"],
    [
      "L’expression décrit les nuages entre les montagnes.",
      "The phrase describes clouds between mountains.",
      "La expresión describe nubes entre montañas.",
    ],
    mountain,
  ),
  Q(
    "huangshan-art",
    "geography",
    [
      "Huangshan a inspiré quel art ?",
      "Which art has Huangshan inspired?",
      "¿Qué arte ha inspirado Huangshan?",
    ],
    ["La peinture de paysage", "Landscape painting", "La pintura de paisajes"],
    [
      "La sculpture sur glace seulement",
      "Only ice sculpture",
      "Solo escultura de hielo",
    ],
    ["La pâtisserie seulement", "Only baking", "Solo repostería"],
    [
      "Le paysage apparaît dans la tradition shanshui.",
      "The landscape appears in shanshui tradition.",
      "El paisaje aparece en la tradición shanshui.",
    ],
    mountain,
  ),
  Q(
    "wall-purpose",
    "culture",
    [
      "La Grande Muraille formait un système de…",
      "The Great Wall formed a system of…",
      "La Gran Muralla formaba un sistema de…",
    ],
    ["Défense", "Defence", "Defensa"],
    ["Canaux d’eau", "Water canals", "Canales"],
    ["Serres agricoles", "Greenhouses", "Invernaderos"],
    [
      "Elle comprend aussi des tours et des fortifications.",
      "It also includes towers and fortifications.",
      "También incluye torres y fortificaciones.",
    ],
    wall,
  ),
  Q(
    "wall-time",
    "culture",
    [
      "La construction de la Grande Muraille s’est étalée sur…",
      "Construction of the Great Wall spanned…",
      "La construcción de la Gran Muralla abarcó…",
    ],
    ["De nombreux siècles", "Many centuries", "Muchos siglos"],
    ["Une seule journée", "One day", "Un solo día"],
    ["Un seul été", "One summer", "Un solo verano"],
    [
      "Plusieurs dynasties ont construit ou renforcé des sections.",
      "Several dynasties built or strengthened sections.",
      "Varias dinastías construyeron o reforzaron tramos.",
    ],
    wall,
  ),
  Q(
    "wall-towers",
    "culture",
    [
      "Quel élément fait partie de la Grande Muraille ?",
      "Which feature forms part of the Great Wall?",
      "¿Qué elemento forma parte de la Gran Muralla?",
    ],
    ["Des tours de guet", "Watchtowers", "Torres de vigilancia"],
    ["Des pistes d’aéroport", "Runways", "Pistas de aeropuerto"],
    ["Des dômes sous-marins", "Underwater domes", "Cúpulas submarinas"],
    [
      "La muraille n’est pas uniquement un mur continu.",
      "The Wall is more than a continuous wall.",
      "La Muralla no es solo un muro continuo.",
    ],
    wall,
  ),
  Q(
    "warriors-material",
    "culture",
    [
      "Les célèbres guerriers de Qin sont en…",
      "The famous Qin warriors are made of…",
      "Los famosos guerreros Qin están hechos de…",
    ],
    ["Terre cuite", "Terracotta", "Terracota"],
    ["Glace", "Ice", "Hielo"],
    ["Papier", "Paper", "Papel"],
    [
      "Ce matériau est une argile cuite.",
      "The material is fired clay.",
      "El material es arcilla cocida.",
    ],
    warriors,
  ),
  Q(
    "warriors-discovery",
    "culture",
    [
      "La découverte moderne de l’armée en terre cuite de Qin date de…",
      "The modern discovery of Qin's terracotta army dates to…",
      "El descubrimiento moderno del ejército de terracota de Qin data de…",
    ],
    ["1974", "1974", "1974"],
    ["1492", "1492", "1492"],
    ["2020", "2020", "2020"],
    [
      "Les fouilles ont révélé un vaste ensemble funéraire.",
      "Excavations revealed a large funerary complex.",
      "Las excavaciones revelaron un gran conjunto funerario.",
    ],
    warriors,
    2,
  ),
  Q(
    "warriors-same",
    "culture",
    [
      "Les guerriers en terre cuite de Qin sont-ils tous identiques ?",
      "Are Qin's terracotta warriors all identical?",
      "¿Son todos idénticos los guerreros de terracota de Qin?",
    ],
    ["Non, elles diffèrent", "No, they differ", "No, son distintas"],
    ["Oui, sans exception", "Yes, without exception", "Sí, sin excepción"],
    ["Ce sont des photographies", "They are photographs", "Son fotografías"],
    [
      "Les figures présentent des détails variés.",
      "The figures have varied details.",
      "Las figuras presentan detalles variados.",
    ],
    warriors,
  ),
  Q(
    "writing-spacing",
    "culture",
    [
      "En chinois écrit, les caractères sont généralement…",
      "In written Chinese, characters are generally…",
      "En chino escrito, los caracteres suelen estar…",
    ],
    ["Espacés régulièrement", "Evenly spaced", "Espaciados uniformemente"],
    [
      "Séparés par mots comme en français",
      "Separated by words as in English",
      "Separados por palabras como en español",
    ],
    ["Toujours en cercle", "Always circular", "Siempre en círculo"],
    [
      "Les espaces ne marquent pas chaque mot.",
      "Spaces do not mark every word.",
      "Los espacios no marcan cada palabra.",
    ],
    writing,
  ),
  Q(
    "writing-fullstop",
    "culture",
    [
      "Quel signe peut terminer une phrase chinoise ?",
      "Which sign can end a Chinese sentence?",
      "¿Qué signo puede cerrar una frase china?",
    ],
    ["。", "。", "。"],
    ["＋", "＋", "＋"],
    ["＝", "＝", "＝"],
    [
      "Ce petit cercle est un point final.",
      "This small circle is a full stop.",
      "Este círculo pequeño es un punto final.",
    ],
    writing,
  ),
  Q(
    "writing-systems",
    "culture",
    [
      "Simplifié et traditionnel désignent des…",
      "Simplified and traditional refer to…",
      "Simplificado y tradicional designan…",
    ],
    ["Formes de caractères", "Character forms", "Formas de caracteres"],
    ["Vitesses de parole", "Speaking speeds", "Velocidades del habla"],
    ["Genres musicaux", "Music genres", "Géneros musicales"],
    [
      "Ce ne sont pas deux vitesses de prononciation.",
      "They are not two pronunciation speeds.",
      "No son dos velocidades de pronunciación.",
    ],
    writing,
  ),
  Q(
    "print-block",
    "science",
    [
      "La xylographie utilise un bloc de…",
      "Woodblock printing uses a block of…",
      "La xilografía utiliza un bloque de…",
    ],
    ["Bois gravé", "Carved wood", "Madera tallada"],
    ["Neige", "Snow", "Nieve"],
    ["Savon liquide", "Liquid soap", "Jabón líquido"],
    [
      "La partie en relief transmet l’encre au papier.",
      "Raised areas transfer ink to paper.",
      "El relieve transfiere tinta al papel.",
    ],
    print,
  ),
  Q(
    "print-trees",
    "science",
    [
      "Quel arbre fournit du bois pour la xylographie traditionnelle chinoise ?",
      "Which tree supplies wood for traditional Chinese woodblock printing?",
      "¿Qué árbol proporciona madera para la xilografía tradicional china?",
    ],
    ["Poirier", "Pear", "Peral"],
    ["Banane pelée", "Peeled banana", "Plátano pelado"],
    ["Algue", "Seaweed", "Alga"],
    [
      "L’UNESCO cite le poirier et le jujubier.",
      "UNESCO mentions pear and jujube wood.",
      "La UNESCO menciona peral y azufaifo.",
    ],
    print,
    2,
  ),
  Q(
    "print-proof",
    "science",
    [
      "En xylographie, avant l’impression finale, on…",
      "In woodblock printing, before the final print, craftspeople…",
      "En xilografía, antes de imprimir definitivamente se…",
    ],
    [
      "Teste et corrige le bloc",
      "Test and correct the block",
      "Prueba y corrige el bloque",
    ],
    [
      "Brûle toujours le bloc",
      "Always burn the block",
      "Quema siempre el bloque",
    ],
    ["Supprime toute encre", "Remove all ink", "Elimina toda la tinta"],
    [
      "Des essais permettent de corriger la gravure.",
      "Proofs allow the carving to be corrected.",
      "Las pruebas permiten corregir el grabado.",
    ],
    print,
  ),
  Q(
    "silk-animal",
    "everyday",
    [
      "La sériciculture élève des…",
      "Sericulture raises…",
      "La sericicultura cría…",
    ],
    ["Vers à soie", "Silkworms", "Gusanos de seda"],
    ["Huîtres", "Oysters", "Ostras"],
    ["Abeilles", "Bees", "Abejas"],
    [
      "Leur soie devient du fil puis du tissu.",
      "Their silk becomes thread and fabric.",
      "Su seda se convierte en hilo y tela.",
    ],
    silk,
  ),
  Q(
    "silk-leaf",
    "everyday",
    [
      "Quelle feuille nourrit les vers à soie de la sériciculture chinoise ?",
      "Which leaves feed silkworms in Chinese sericulture?",
      "¿Qué hojas alimentan a los gusanos de seda en la sericicultura china?",
    ],
    ["Mûrier", "Mulberry", "Morera"],
    ["Cactus", "Cactus", "Cactus"],
    ["Palmier", "Palm", "Palmera"],
    [
      "La culture du mûrier fait partie du savoir-faire.",
      "Mulberry growing is part of the craft.",
      "Cultivar moreras forma parte del oficio.",
    ],
    silk,
  ),
  Q(
    "silk-learning",
    "everyday",
    [
      "Comment le travail traditionnel de la soie se transmet-il notamment ?",
      "How is traditional silk craftsmanship notably passed on?",
      "¿Cómo se transmite el trabajo tradicional de la seda?",
    ],
    [
      "Famille et apprentissage",
      "Family and apprenticeship",
      "Familia y aprendizaje",
    ],
    ["Par hasard uniquement", "Only by chance", "Solo por azar"],
    ["Sans aucune pratique", "Without any practice", "Sin ninguna práctica"],
    [
      "On apprend les gestes auprès d’autres personnes.",
      "People learn techniques from others.",
      "Las técnicas se aprenden de otras personas.",
    ],
    silk,
  ),
  Q(
    "paper-decor",
    "everyday",
    [
      "Le papier découpé peut décorer des…",
      "Paper-cut art can decorate…",
      "El papel recortado puede decorar…",
    ],
    ["Fenêtres", "Windows", "Ventanas"],
    ["Orbites planétaires", "Planetary orbits", "Órbitas planetarias"],
    ["Nuages", "Clouds", "Nubes"],
    [
      "Il accompagne aussi fêtes et cérémonies.",
      "It also accompanies festivals and ceremonies.",
      "También acompaña fiestas y ceremonias.",
    ],
    paper,
  ),
  Q(
    "paper-colour",
    "everyday",
    [
      "L’art chinois du papier découpé utilise-t-il toujours du papier coloré ?",
      "Must Chinese paper-cut art always use coloured paper?",
      "¿Debe el arte chino del papel recortado usar siempre papel coloreado?",
    ],
    ["Non", "No", "No"],
    ["Oui, uniquement bleu", "Yes, only blue", "Sí, solo azul"],
    ["Oui, uniquement vert", "Yes, only green", "Sí, solo verde"],
    [
      "Il peut être coloré ou laissé sans couleur.",
      "It may be coloured or left uncoloured.",
      "Puede colorearse o dejarse sin color.",
    ],
    paper,
  ),
  Q(
    "paper-pattern",
    "everyday",
    [
      "Les motifs de l’art chinois du papier découpé sont…",
      "Patterns in Chinese paper-cut art are…",
      "Los motivos del arte chino del papel recortado son…",
    ],
    [
      "Variés selon l’artiste et le lieu",
      "Varied by artist and place",
      "Variados según artista y lugar",
    ],
    ["Tous identiques", "All identical", "Todos idénticos"],
    [
      "Obligatoirement des lettres latines",
      "Always Latin letters",
      "Siempre letras latinas",
    ],
    [
      "Il n’existe pas un motif unique pour toute la Chine.",
      "There is no single pattern for all of China.",
      "No existe un único motivo para toda China.",
    ],
    paper,
  ),
  Q(
    "tea-plant",
    "everyday",
    [
      "Le thé vert et le thé noir proviennent de…",
      "Green and black tea come from…",
      "El té verde y el negro proceden de…",
    ],
    ["Camellia sinensis", "Camellia sinensis", "Camellia sinensis"],
    ["Cacaoyer", "Cacao", "Cacao"],
    ["Vigne", "Grapevine", "Vid"],
    [
      "Le traitement des feuilles différencie les types.",
      "Leaf processing distinguishes the types.",
      "El tratamiento de las hojas distingue los tipos.",
    ],
    tea,
    2,
  ),
  Q(
    "tea-herbal",
    "everyday",
    [
      "Une infusion de menthe seule est-elle du Camellia sinensis ?",
      "Is a pure mint infusion Camellia sinensis?",
      "¿Una infusión de menta pura es Camellia sinensis?",
    ],
    ["Non", "No", "No"],
    ["Toujours", "Always", "Siempre"],
    ["Seulement froide", "Only cold", "Solo fría"],
    [
      "Les infusions d’autres plantes sont distinctes.",
      "Infusions of other plants are distinct.",
      "Las infusiones de otras plantas son distintas.",
    ],
    tea,
  ),
  Q(
    "tea-oolong",
    "everyday",
    [
      "L’oolong subit notamment une oxydation…",
      "Oolong notably undergoes…",
      "El oolong pasa por una oxidación…",
    ],
    ["Partielle", "Partial oxidation", "Parcial"],
    ["Sans feuilles", "Leaf-free oxidation", "Sin hojas"],
    ["Du verre", "Glass oxidation", "Del vidrio"],
    [
      "L’oxydation fait partie de son traitement.",
      "Oxidation is part of its processing.",
      "La oxidación es parte de su elaboración.",
    ],
    tea,
    2,
  ),
  Q(
    "panda-food",
    "nature",
    [
      "Le panda géant mange surtout…",
      "A giant panda mainly eats…",
      "El panda gigante come sobre todo…",
    ],
    ["Du bambou", "Bamboo", "Bambú"],
    ["Des poissons", "Fish", "Peces"],
    ["Des algues", "Seaweed", "Algas"],
    [
      "Ses mâchoires broient les tiges de bambou.",
      "Its jaws crush bamboo stems.",
      "Sus mandíbulas trituran tallos de bambú.",
    ],
    panda,
  ),
  Q(
    "panda-thumb",
    "nature",
    [
      "Le faux pouce du panda géant est un…",
      "A giant panda's pseudo-thumb is a…",
      "El falso pulgar del panda gigante es un…",
    ],
    ["Os du poignet", "Wrist bone", "Hueso de la muñeca"],
    ["Doigt humain", "Human finger", "Dedo humano"],
    ["Morceau de corne", "Piece of horn", "Trozo de cuerno"],
    [
      "Un os agrandi aide à saisir le bambou.",
      "An enlarged bone helps grasp bamboo.",
      "Un hueso ampliado ayuda a sujetar bambú.",
    ],
    panda,
    2,
  ),
  Q(
    "panda-home",
    "nature",
    [
      "L’habitat naturel actuel du panda géant est surtout…",
      "The giant panda's current wild habitat is mainly…",
      "El hábitat natural actual del panda gigante es sobre todo…",
    ],
    ["Des montagnes chinoises", "Chinese mountains", "Montañas chinas"],
    ["Le désert du Sahara", "The Sahara Desert", "El desierto del Sahara"],
    ["L’Antarctique", "Antarctica", "La Antártida"],
    [
      "Il vit dans des forêts montagneuses de Chine centrale.",
      "It lives in central China's mountain forests.",
      "Vive en bosques montañosos de China central.",
    ],
    panda,
  ),
  Q(
    "mercury-year",
    "science",
    [
      "Une année sur Mercure dure environ…",
      "A Mercury year lasts about…",
      "Un año en Mercurio dura unos…",
    ],
    ["88 jours terrestres", "88 Earth days", "88 días terrestres"],
    ["365 jours terrestres", "365 Earth days", "365 días terrestres"],
    ["10 jours terrestres", "10 Earth days", "10 días terrestres"],
    [
      "C’est la durée de son tour du Soleil.",
      "That is one orbit around the Sun.",
      "Es lo que tarda en orbitar el Sol.",
    ],
    mercury,
  ),
  Q(
    "mercury-moons",
    "science",
    [
      "Mercure possède combien de lunes ?",
      "How many moons does Mercury have?",
      "¿Cuántas lunas tiene Mercurio?",
    ],
    ["Aucune", "None", "Ninguna"],
    ["Une", "One", "Una"],
    ["Deux", "Two", "Dos"],
    [
      "Mercure n’a pas de satellite naturel.",
      "Mercury has no natural satellite.",
      "Mercurio no tiene satélite natural.",
    ],
    mercury,
  ),
  Q(
    "mercury-rings",
    "science",
    [
      "Quel accessoire manque à Mercure ?",
      "What does Mercury lack?",
      "¿Qué le falta a Mercurio?",
    ],
    ["Des anneaux", "Rings", "Anillos"],
    ["Une surface rocheuse", "A rocky surface", "Una superficie rocosa"],
    ["Une orbite", "An orbit", "Una órbita"],
    [
      "Mercure est rocheuse, mais sans anneaux.",
      "Mercury is rocky but has no rings.",
      "Mercurio es rocoso, pero no tiene anillos.",
    ],
    mercury,
  ),
  Q(
    "venus-heat",
    "science",
    [
      "La planète la plus chaude du système solaire est…",
      "The hottest planet in the Solar System is…",
      "El planeta más caliente del sistema solar es…",
    ],
    ["Vénus", "Venus", "Venus"],
    ["Mercure", "Mercury", "Mercurio"],
    ["Mars", "Mars", "Marte"],
    [
      "Son atmosphère retient fortement la chaleur.",
      "Its atmosphere traps heat intensely.",
      "Su atmósfera retiene mucho calor.",
    ],
    venus,
  ),
  Q(
    "venus-order",
    "science",
    [
      "Depuis le Soleil, Vénus est la…",
      "From the Sun, Venus is the…",
      "Desde el Sol, Venus es el…",
    ],
    ["Deuxième planète", "Second planet", "Segundo planeta"],
    ["Sixième planète", "Sixth planet", "Sexto planeta"],
    ["Huitième planète", "Eighth planet", "Octavo planeta"],
    [
      "Elle vient après Mercure.",
      "It comes after Mercury.",
      "Viene después de Mercurio.",
    ],
    venus,
  ),
  Q(
    "venus-air",
    "science",
    [
      "L’atmosphère de Vénus contient surtout…",
      "Venus's atmosphere is mainly…",
      "La atmósfera de Venus contiene sobre todo…",
    ],
    ["Du dioxyde de carbone", "Carbon dioxide", "Dióxido de carbono"],
    ["De l’oxygène", "Oxygen", "Oxígeno"],
    ["De l’hélium", "Helium", "Helio"],
    [
      "Elle est très différente de l’air terrestre.",
      "It is very different from Earth's air.",
      "Es muy distinta al aire terrestre.",
    ],
    venus,
    2,
  ),
  Q(
    "mars-moons",
    "science",
    [
      "Combien de lunes possède Mars ?",
      "How many moons does Mars have?",
      "¿Cuántas lunas tiene Marte?",
    ],
    ["Deux", "Two", "Dos"],
    ["Aucune", "None", "Ninguna"],
    ["Cinq", "Five", "Cinco"],
    [
      "Elles s’appellent Phobos et Deimos.",
      "They are called Phobos and Deimos.",
      "Se llaman Fobos y Deimos.",
    ],
    mars,
  ),
  Q(
    "mars-order",
    "science",
    [
      "Quelle place Mars occupe-t-elle dans l’ordre des planètes depuis le Soleil ?",
      "Which planet from the Sun is Mars?",
      "¿Qué lugar ocupa Marte desde el Sol?",
    ],
    ["Quatrième", "Fourth", "Cuarto"],
    ["Première", "First", "Primero"],
    ["Septième", "Seventh", "Séptimo"],
    [
      "C’est une planète rocheuse, après la Terre.",
      "It is a rocky planet beyond Earth.",
      "Es rocoso y está después de la Tierra.",
    ],
    mars,
  ),
  Q(
    "mars-larger",
    "science",
    [
      "La plus grande lune de Mars est…",
      "Mars's larger moon is…",
      "La luna mayor de Marte es…",
    ],
    ["Phobos", "Phobos", "Fobos"],
    ["Deimos", "Deimos", "Deimos"],
    ["Titan", "Titan", "Titán"],
    [
      "Phobos est aussi la plus proche de Mars.",
      "Phobos is also closer to Mars.",
      "Fobos también está más cerca de Marte.",
    ],
    mars,
    2,
  ),
  Q(
    "suzhou-city",
    "geography",
    [
      "Dans quelle ville chinoise se trouvent neuf jardins classiques inscrits ensemble à l’UNESCO ?",
      "Which Chinese city has nine classical gardens jointly listed by UNESCO?",
      "¿Qué ciudad china tiene nueve jardines clásicos inscritos juntos por la UNESCO?",
    ],
    ["Suzhou", "Suzhou", "Suzhou"],
    ["Lima", "Lima", "Lima"],
    ["Oslo", "Oslo", "Oslo"],
    [
      "L’UNESCO protège les jardins classiques de Suzhou.",
      "UNESCO lists Suzhou's classical gardens.",
      "La UNESCO reconoce los jardines clásicos de Suzhou.",
    ],
    suzhou,
  ),
  Q(
    "suzhou-landscape",
    "geography",
    [
      "Les jardins classiques de Suzhou recréent en miniature…",
      "Suzhou's classical gardens recreate in miniature…",
      "Los jardines clásicos de Suzhou recrean en miniatura…",
    ],
    ["Des paysages naturels", "Natural landscapes", "Paisajes naturales"],
    ["Des usines", "Factories", "Fábricas"],
    ["Des aéroports", "Airports", "Aeropuertos"],
    [
      "Leur composition évoque la nature à petite échelle.",
      "Their composition evokes nature on a small scale.",
      "Su composición evoca la naturaleza a pequeña escala.",
    ],
    suzhou,
  ),
  Q(
    "suzhou-nine",
    "geography",
    [
      "Combien de jardins composent le bien UNESCO de Suzhou ?",
      "How many gardens form Suzhou's UNESCO property?",
      "¿Cuántos jardines forman el bien UNESCO de Suzhou?",
    ],
    ["Neuf", "Nine", "Nueve"],
    ["Deux", "Two", "Dos"],
    ["Cent", "One hundred", "Cien"],
    [
      "Il s’agit de neuf jardins, pas de tous ceux de la ville.",
      "The listing covers nine gardens, not every city garden.",
      "La inscripción cubre nueve, no todos los de la ciudad.",
    ],
    suzhou,
    2,
  ),
  Q(
    "canal-kind",
    "geography",
    [
      "Le Grand Canal chinois est surtout un réseau de…",
      "China's Grand Canal is a network of…",
      "El Gran Canal chino es una red de…",
    ],
    ["Voies navigables", "Waterways", "Vías navegables"],
    ["Tunnels routiers", "Road tunnels", "Túneles de carretera"],
    ["Pistes de ski", "Ski slopes", "Pistas de esquí"],
    [
      "Il relie plusieurs bassins fluviaux.",
      "It connects several river basins.",
      "Conecta varias cuencas fluviales.",
    ],
    canal,
  ),
  Q(
    "canal-north",
    "geography",
    [
      "Quelle ville marque l’extrémité nord du Grand Canal chinois ?",
      "Which city marks the northern end of China's Grand Canal?",
      "¿Qué ciudad marca el extremo norte del Gran Canal chino?",
    ],
    ["Pékin", "Beijing", "Pekín"],
    ["Lisbonne", "Lisbon", "Lisboa"],
    ["Tokyo", "Tokyo", "Tokio"],
    [
      "Le réseau s’étend vers le Zhejiang au sud.",
      "The network extends south toward Zhejiang.",
      "La red se extiende al sur hacia Zhejiang.",
    ],
    canal,
  ),
  Q(
    "canal-cargo",
    "geography",
    [
      "Quel produit transportait notamment le Grand Canal ?",
      "What was notably transported on the Grand Canal?",
      "¿Qué se transportaba por el Gran Canal?",
    ],
    ["Des céréales", "Grain", "Cereales"],
    ["Des icebergs", "Icebergs", "Icebergs"],
    ["Des avions entiers", "Whole aircraft", "Aviones enteros"],
    [
      "Le transport de grains aidait à nourrir les populations.",
      "Grain transport helped feed populations.",
      "Transportar cereales ayudaba a alimentar a la población.",
    ],
    canal,
  ),
  Q(
    "calligraphy-tool",
    "everyday",
    [
      "L’outil classique de la calligraphie chinoise est…",
      "A traditional Chinese calligraphy tool is…",
      "Una herramienta tradicional de caligrafía china es…",
    ],
    ["Le pinceau", "A brush", "El pincel"],
    ["La fourchette", "A fork", "El tenedor"],
    ["La clé anglaise", "A wrench", "La llave inglesa"],
    [
      "L’encre est appliquée au pinceau.",
      "Ink is applied with a brush.",
      "La tinta se aplica con pincel.",
    ],
    calligraphy,
  ),
  Q(
    "calligraphy-styles",
    "everyday",
    [
      "Quel mot désigne un style de calligraphie ?",
      "Which word names a calligraphy style?",
      "¿Qué palabra nombra un estilo caligráfico?",
    ],
    ["Cursif", "Cursive", "Cursivo"],
    ["Gazéifié", "Carbonated", "Carbonatado"],
    ["Sous-marin", "Underwater", "Submarino"],
    [
      "Le cursif fait partie des styles décrits par l’UNESCO.",
      "Cursive is among the styles described by UNESCO.",
      "El cursivo figura entre los estilos descritos por la UNESCO.",
    ],
    calligraphy,
  ),
  Q(
    "calligraphy-purpose",
    "everyday",
    [
      "La calligraphie associe écriture et…",
      "Calligraphy combines writing and…",
      "La caligrafía combina escritura y…",
    ],
    ["Expression artistique", "Artistic expression", "Expresión artística"],
    ["Prévision météo", "Weather forecasting", "Pronóstico del tiempo"],
    ["Mesure du poids", "Weight measurement", "Medición del peso"],
    [
      "La forme des caractères a une valeur esthétique.",
      "Character forms have aesthetic value.",
      "La forma de los caracteres tiene valor estético.",
    ],
    calligraphy,
  ),
  Q(
    "shadow-material",
    "culture",
    [
      "Les silhouettes du théâtre d’ombres chinois sont notamment en…",
      "Chinese shadow puppets may be made of…",
      "Las figuras del teatro de sombras chino pueden ser de…",
    ],
    ["Cuir ou papier", "Leather or paper", "Cuero o papel"],
    ["Glace vive", "Solid ice", "Hielo"],
    ["Béton armé", "Reinforced concrete", "Hormigón armado"],
    [
      "Ces figures plates produisent des silhouettes.",
      "The flat figures produce silhouettes.",
      "Las figuras planas producen siluetas.",
    ],
    shadow,
  ),
  Q(
    "shadow-sound",
    "culture",
    [
      "Qu’est-ce qui accompagne le théâtre d’ombres traditionnel ?",
      "What accompanies traditional shadow theatre?",
      "¿Qué acompaña al teatro de sombras tradicional?",
    ],
    ["Musique et chant", "Music and singing", "Música y canto"],
    ["Toujours le silence", "Always silence", "Siempre silencio"],
    ["Un moteur d’avion", "An aircraft engine", "Un motor de avión"],
    [
      "Les voix et la musique participent au récit.",
      "Voices and music help tell the story.",
      "Las voces y la música ayudan a contar la historia.",
    ],
    shadow,
  ),
  Q(
    "shadow-art",
    "culture",
    [
      "Le théâtre d’ombres est d’abord un art…",
      "Shadow puppetry is primarily a…",
      "El teatro de sombras es ante todo un arte…",
    ],
    ["De la scène", "Performing art", "Escénico"],
    ["De navigation", "Navigation technique", "De navegación"],
    ["De cuisson", "Cooking technique", "De cocina"],
    [
      "Des personnages jouent une histoire pour un public.",
      "Characters perform a story for an audience.",
      "Los personajes representan una historia ante un público.",
    ],
    shadow,
  ),
];
