import geometry from "@/public/kanjivg/70a0b7ae/strokes.json";
import type { JapaneseKanjiCard, JapaneseLocalized } from "@/lib/yo/japaneseCourseTypes";

/**
 * Original learning copy with contextual readings, not a list of every reading.
 * Memory prompts are visual learning aids, not historical etymologies.
 * Stroke geometry: KanjiVG, copyright Ulrich Apel, CC BY-SA 3.0.
 * https://kanjivg.tagaini.net/ — see the retained source/attribution in public/kanjivg.
 */
const L = (fr: string, en: string, es: string): JapaneseLocalized => ({ fr, en, es });
const paths: Record<string, { sourceFile: string; strokes: string[] }> = geometry.characters;

function card(
  character: string,
  meaning: JapaneseLocalized,
  word: [string, string, string],
  wordMeaning: JapaneseLocalized,
  mnemonic: JapaneseLocalized,
): JapaneseKanjiCard {
  const source = paths[character];
  if (!source) throw new Error(`Missing verified KanjiVG source: ${character}`);
  return {
    character, meaning,
    word: { ja: word[0], kana: word[1], romaji: word[2], meaning: wordMeaning },
    mnemonic, strokes: source.strokes, sourceFile: source.sourceFile,
  };
}

export const japaneseKanjiCards: JapaneseKanjiCard[] = [
  card("人", L("personne", "person", "persona"), ["人", "ひと", "hito"], L("une personne", "a person", "una persona"),
    L("Imagine deux jambes qui se rejoignent en haut.", "Imagine two legs meeting at the top.", "Imagina dos piernas que se unen arriba.")),
  card("名", L("nom", "name", "nombre"), ["名前", "なまえ", "namae"], L("le nom", "name", "el nombre"),
    L("Imagine une petite bouche en bas qui annonce ton nom.", "Imagine a small mouth below announcing your name.", "Imagina una pequeña boca abajo que dice tu nombre.")),
  card("日", L("jour, soleil", "day, sun", "día, sol"), ["日曜日", "にちようび", "nichiyōbi"], L("dimanche", "Sunday", "domingo"),
    L("Imagine une fenêtre avec une barre au milieu : la lumière du jour y entre.", "Imagine a window with a bar through the middle: daylight comes in.", "Imagina una ventana con una barra en medio: entra la luz del día.")),
  card("本", L("livre, origine", "book, origin", "libro, origen"), ["本", "ほん", "hon"], L("un livre", "a book", "un libro"),
    L("Repère la forme de 木, puis la petite barre près du bas : c'est ton marque-page.", "Notice the shape of 木, then the small bar near the bottom: your bookmark.", "Observa la forma de 木 y la pequeña barra de abajo: tu marcapáginas.")),
  card("語", L("langue, mot", "language, word", "lengua, palabra"), ["日本語", "にほんご", "nihongo"], L("la langue japonaise", "the Japanese language", "el idioma japonés"),
    L("Découpe la forme en deux blocs : les petits traits à gauche, la conversation à droite.", "Split the shape into two blocks: small strokes on the left, a conversation on the right.", "Divide la forma en dos bloques: trazos pequeños a la izquierda y una conversación a la derecha.")),
  card("一", L("un", "one", "uno"), ["一時", "いちじ", "ichiji"], L("une heure", "one o'clock", "la una"),
    L("Une seule ligne : un seul point de départ.", "One line: one starting point.", "Una línea: un punto de partida.")),
  card("二", L("deux", "two", "dos"), ["二時", "にじ", "niji"], L("deux heures", "two o'clock", "las dos"),
    L("Deux étages : la ligne du bas est plus longue.", "Two levels: the lower line is longer.", "Dos niveles: la línea de abajo es más larga.")),
  card("三", L("trois", "three", "tres"), ["三時", "さんじ", "sanji"], L("trois heures", "three o'clock", "las tres"),
    L("Trois étages; garde de l'espace entre les lignes.", "Three levels; leave space between the lines.", "Tres niveles; deja espacio entre las líneas.")),
  card("四", L("quatre", "four", "cuatro"), ["四時", "よじ", "yoji"], L("quatre heures", "four o'clock", "las cuatro"),
    L("Imagine quatre coins autour de deux petits éléments. Ferme le cadre en dernier.", "Imagine four corners around two small shapes. Close the frame last.", "Imagina cuatro esquinas alrededor de dos formas pequeñas. Cierra el marco al final.")),
  card("五", L("cinq", "five", "cinco"), ["五時", "ごじ", "goji"], L("cinq heures", "five o'clock", "las cinco"),
    L("Imagine une petite étagère entre une ligne en haut et une en bas.", "Imagine a small shelf between a top and a bottom line.", "Imagina una pequeña estantería entre una línea arriba y otra abajo.")),
  card("上", L("en haut, dessus", "up, above", "arriba, encima"), ["上", "うえ", "ue"], L("au-dessus", "above", "encima"),
    L("Le petit trait reste au-dessus de la longue ligne du sol.", "The small stroke stays above the long ground line.", "El trazo pequeño queda encima de la línea larga del suelo.")),
  card("下", L("en bas, dessous", "down, below", "abajo, debajo"), ["下", "した", "shita"], L("en dessous", "below", "debajo"),
    L("Le petit trait descend sous la grande ligne du plafond.", "The small stroke sits below the long ceiling line.", "El trazo pequeño queda debajo de la línea larga del techo.")),
  card("中", L("milieu, intérieur", "middle, inside", "medio, interior"), ["中", "なか", "naka"], L("à l'intérieur", "inside", "dentro"),
    L("Une ligne traverse le milieu d'une boîte.", "A line passes through the middle of a box.", "Una línea cruza el centro de una caja.")),
  card("右", L("droite", "right", "derecha"), ["右", "みぎ", "migi"], L("à droite", "on the right", "a la derecha"),
    L("Pour distinguer droite et gauche, repère le carré fermé de 右.", "To tell right from left, notice the closed square in 右.", "Para distinguir derecha e izquierda, observa el cuadrado cerrado de 右.")),
  card("左", L("gauche", "left", "izquierda"), ["左", "ひだり", "hidari"], L("à gauche", "on the left", "a la izquierda"),
    L("À gauche, le bas ressemble à une petite poutre en I, pas à un carré.", "For left, the lower part looks like a small I-beam, not a square.", "En izquierda, la parte inferior parece una pequeña viga en I, no un cuadrado.")),
  card("食", L("manger, nourriture", "eat, food", "comer, comida"), ["食べます", "たべます", "tabemasu"], L("manger (forme polie)", "eat (polite form)", "comer (forma cortés)"),
    L("Imagine un toit au-dessus de ton repas; construis la forme du haut vers le bas.", "Imagine a roof above your meal; build the shape from top to bottom.", "Imagina un techo encima de tu comida; construye la forma de arriba abajo.")),
  card("飲", L("boire", "drink", "beber"), ["飲みます", "のみます", "nomimasu"], L("boire (forme polie)", "drink (polite form)", "beber (forma cortés)"),
    L("Repère à gauche la famille visuelle de 食, puis imagine quelqu'un qui boit à droite.", "Notice the visual family of 食 on the left, then imagine someone drinking on the right.", "Reconoce la familia visual de 食 a la izquierda e imagina a alguien bebiendo a la derecha.")),
  card("米", L("riz (grain)", "rice (grain)", "arroz (grano)"), ["米", "こめ", "kome"], L("riz non cuit", "uncooked rice", "arroz crudo"),
    L("Imagine des grains autour d'une tige au centre.", "Imagine grains around a stem in the centre.", "Imagina granos alrededor de un tallo central.")),
  card("茶", L("thé", "tea", "té"), ["お茶", "おちゃ", "ocha"], L("du thé", "tea", "té"),
    L("Imagine des feuilles tout en haut et une tasse en dessous.", "Imagine leaves at the top and a cup underneath.", "Imagina hojas arriba y una taza debajo.")),
  card("円", L("yen, cercle", "yen, circle", "yen, círculo"), ["円", "えん", "en"], L("yen (monnaie)", "yen (currency)", "yen (moneda)"),
    L("Imagine une pièce rangée dans un petit étui ouvert vers le bas.", "Imagine a coin in a small case open at the bottom.", "Imagina una moneda en un pequeño estuche abierto por abajo.")),
  card("月", L("lune, mois", "moon, month", "luna, mes"), ["月曜日", "げつようび", "getsuyōbi"], L("lundi", "Monday", "lunes"),
    L("Imagine une lune étirée avec deux petites lignes de lumière dedans.", "Imagine a tall moon with two small lines of light inside.", "Imagina una luna alargada con dos pequeñas líneas de luz dentro.")),
  card("火", L("feu", "fire", "fuego"), ["火曜日", "かようび", "kayōbi"], L("mardi", "Tuesday", "martes"),
    L("Imagine deux petites étincelles autour d'une grande flamme.", "Imagine two small sparks around a large flame.", "Imagina dos pequeñas chispas alrededor de una gran llama.")),
  card("水", L("eau", "water", "agua"), ["水", "みず", "mizu"], L("de l'eau", "water", "agua"),
    L("Imagine un courant central avec de l'eau qui part de chaque côté.", "Imagine a central stream with water spreading to either side.", "Imagina una corriente central con agua que se extiende a ambos lados.")),
  card("木", L("arbre, bois", "tree, wood", "árbol, madera"), ["木", "き", "ki"], L("un arbre", "a tree", "un árbol"),
    L("Imagine un tronc au milieu et deux branches qui descendent.", "Imagine a trunk in the middle and two branches reaching down.", "Imagina un tronco central y dos ramas que bajan.")),
  card("金", L("or, métal, argent", "gold, metal, money", "oro, metal, dinero"), ["金曜日", "きんようび", "kin'yōbi"], L("vendredi", "Friday", "viernes"),
    L("Imagine un petit trésor sous un toit; les deux points sont des pièces.", "Imagine a small treasure under a roof; the two dots are coins.", "Imagina un pequeño tesoro bajo un techo; los dos puntos son monedas.")),
  card("家", L("maison, foyer", "house, home", "casa, hogar"), ["家", "いえ", "ie"], L("la maison", "home", "la casa"),
    L("Commence par le toit, puis imagine la vie qui remplit la maison.", "Start with the roof, then imagine life filling the house.", "Empieza por el techo e imagina la vida que llena la casa.")),
  card("友", L("ami", "friend", "amigo"), ["友だち", "ともだち", "tomodachi"], L("un ami, une amie", "a friend", "un amigo, una amiga"),
    L("Imagine deux bras qui se croisent pour se saluer.", "Imagine two arms crossing to greet each other.", "Imagina dos brazos que se cruzan para saludarse.")),
  card("学", L("étudier, apprendre", "study, learn", "estudiar, aprender"), ["学校", "がっこう", "gakkō"], L("l'école", "school", "la escuela"),
    L("Imagine trois idées qui arrivent en haut, au-dessus d'une petite salle de classe.", "Imagine three ideas arriving at the top, above a small classroom.", "Imagina tres ideas que llegan arriba, sobre una pequeña aula.")),
  card("生", L("vie, naissance", "life, birth", "vida, nacimiento"), ["学生", "がくせい", "gakusei"], L("une personne qui étudie", "a student", "un estudiante"),
    L("Imagine une jeune pousse qui monte à travers plusieurs lignes de terre.", "Imagine a young shoot growing through several layers of soil.", "Imagina un brote que crece a través de varias capas de tierra.")),
  card("先", L("avant, devant", "before, ahead", "antes, delante"), ["先生", "せんせい", "sensei"], L("professeur (titre)", "teacher (title)", "profesor (título)"),
    L("Imagine quelqu'un qui avance devant toi sur deux jambes.", "Imagine someone walking ahead of you on two legs.", "Imagina a alguien que camina delante de ti sobre dos piernas.")),
  card("出", L("sortir", "go out", "salir"), ["出口", "でぐち", "deguchi"], L("la sortie", "exit", "la salida"),
    L("Imagine deux rebords traversés par une ligne qui sort vers le haut.", "Imagine two ledges crossed by a line emerging upwards.", "Imagina dos bordes atravesados por una línea que sale hacia arriba.")),
  card("入", L("entrer", "enter", "entrar"), ["入口", "いりぐち", "iriguchi"], L("l'entrée", "entrance", "la entrada"),
    L("Compare avec 人 : ici, le long trait de droite commence plus haut.", "Compare with 人: here the long right stroke begins higher.", "Compara con 人: aquí el trazo largo de la derecha empieza más arriba.")),
  card("口", L("bouche, ouverture", "mouth, opening", "boca, abertura"), ["口", "くち", "kuchi"], L("la bouche", "mouth", "la boca"),
    L("Imagine une petite bouche carrée. Trois traits suffisent à fermer la forme.", "Imagine a small square mouth. Three strokes close the shape.", "Imagina una pequeña boca cuadrada. Tres trazos cierran la forma.")),
  card("電", L("électricité", "electricity", "electricidad"), ["電車", "でんしゃ", "densha"], L("le train électrique", "electric train", "el tren eléctrico"),
    L("Imagine un nuage au-dessus et un fil électrique qui ressort en bas.", "Imagine a cloud above and an electric wire emerging below.", "Imagina una nube arriba y un cable eléctrico que sale abajo.")),
  card("車", L("voiture, véhicule", "car, vehicle", "coche, vehículo"), ["車", "くるま", "kuruma"], L("une voiture", "a car", "un coche"),
    L("Imagine un véhicule vu de dessus : un axe traverse son centre.", "Imagine a vehicle seen from above: an axle crosses its centre.", "Imagina un vehículo visto desde arriba: un eje cruza su centro.")),
  card("読", L("lire", "read", "leer"), ["読みます", "よみます", "yomimasu"], L("lire (forme polie)", "read (polite form)", "leer (forma cortés)"),
    L("Retrouve le bloc de petits traits à gauche, comme dans 語 : pense à des mots à lire.", "Find the small-stroke block on the left, as in 語: think of words to read.", "Busca el bloque de trazos pequeños a la izquierda, como en 語: piensa en palabras para leer.")),
  card("書", L("écrire", "write", "escribir"), ["書きます", "かきます", "kakimasu"], L("écrire (forme polie)", "write (polite form)", "escribir (forma cortés)"),
    L("Imagine un stylo au-dessus d'une page carrée; garde les lignes horizontales espacées.", "Imagine a pen above a square page; keep the horizontal lines apart.", "Imagina un bolígrafo encima de una página cuadrada; separa las líneas horizontales.")),
  card("行", L("aller", "go", "ir"), ["行きます", "いきます", "ikimasu"], L("aller (forme polie)", "go (polite form)", "ir (forma cortés)"),
    L("Imagine une petite rue à gauche et un panneau à droite : tu peux y aller.", "Imagine a small street on the left and a sign on the right: you can go there.", "Imagina una calle a la izquierda y un letrero a la derecha: puedes ir allí.")),
  card("来", L("venir", "come", "venir"), ["来ます", "きます", "kimasu"], L("venir (forme polie)", "come (polite form)", "venir (forma cortés)"),
    L("Imagine des bras de chaque côté qui font signe de venir.", "Imagine arms on either side signalling someone to come.", "Imagina brazos a ambos lados que hacen una señal para venir.")),
  card("見", L("voir, regarder", "see, look", "ver, mirar"), ["見ます", "みます", "mimasu"], L("voir, regarder (forme polie)", "see, watch (polite form)", "ver, mirar (forma cortés)"),
    L("Imagine un œil haut sur deux jambes : il part regarder le monde.", "Imagine a tall eye on two legs: it goes to look at the world.", "Imagina un ojo alto sobre dos piernas: sale a observar el mundo.")),
];

const byCharacter = new Map(japaneseKanjiCards.map((item) => [item.character, item]));

export function getJapaneseKanji(character: string): JapaneseKanjiCard | undefined {
  return byCharacter.get(character);
}
