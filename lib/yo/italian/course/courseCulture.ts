import { phrase, t } from "./courseAuthoring";
import type { CourseAssessment, CourseCultureStop, CoursePhoto, CourseQuestion, LocaleText } from "./courseTypes";

const commons = "https://commons.wikimedia.org/wiki/File:";
export const italianCulturePhotos: Record<string, CoursePhoto> = {
  bologna: {
    src: "/images/yo/italian/culture/bologna-porticoes.webp", width: 960, height: 643,
    alt: t("Une allée couverte, bordée de colonnes et d’arches, longe des bâtiments.", "A covered walkway with columns and arches runs alongside buildings.", "Un paseo cubierto con columnas y arcos bordea unos edificios."),
    caption: t("Les portiques de Bologne", "Bologna’s porticoes", "Los pórticos de Bolonia"),
    author: "Girolamus", sourceUrl: `${commons}Bologna_,_i_portici.jpg`,
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  florence: {
    src: "/images/yo/italian/culture/florence-bridge.webp", width: 960, height: 576,
    alt: t("Un pont de pierre portant des boutiques traverse une rivière.", "A stone bridge with shops built on it crosses a river.", "Un puente de piedra con tiendas construidas encima cruza un río."),
    caption: t("Le Ponte Vecchio à Florence", "The Ponte Vecchio in Florence", "El Ponte Vecchio en Florencia"),
    author: "Krstina96", sourceUrl: `${commons}Ponte_Vecchio_2.jpg`,
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  venice: {
    src: "/images/yo/italian/culture/venice-canal.webp", width: 960, height: 640,
    alt: t("Des bateaux circulent sur un large canal, devant des palais et une église à coupole.", "Boats travel on a wide canal past palaces and a domed church.", "Unos barcos recorren un gran canal frente a palacios y una iglesia con cúpula."),
    caption: t("Le Grand Canal à Venise", "The Grand Canal in Venice", "El Gran Canal en Venecia"),
    author: "Vyacheslav Argenberg / vascoplanet.com", sourceUrl: `${commons}Venice_view,_Grand_Canal,_Venice,_Italy.jpg`,
    license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  rome: {
    src: "/images/yo/italian/culture/rome-amphitheatre.webp", width: 960, height: 640,
    alt: t("Un immense monument antique présente plusieurs étages d’arcades autour d’une enceinte ovale.", "A huge ancient monument has several tiers of arches around an oval enclosure.", "Un enorme monumento antiguo presenta varios pisos de arcos alrededor de un recinto ovalado."),
    caption: t("Le Colisée à Rome", "The Colosseum in Rome", "El Coliseo en Roma"),
    author: "maiterozas", sourceUrl: `${commons}Colosseum_romanum.jpg`,
    license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
};

// Photo stops belong to taught units, not just the final quiz. No timed travel advice.
export const italianCultureStops: Record<string, CourseCultureStop> = {
  u01: {
    title: t("Bologna · Marcher sous les portiques", "Bologna · Walk beneath the porticoes", "Bologna · Caminar bajo los pórticos"),
    body: t("À Bologne, les portici sont des passages couverts le long des bâtiments. Observe leurs colonnes et leurs arches : ils font partie de l’identité de la ville. Une sélection de ces portiques figure au patrimoine mondial de l’UNESCO.", "In Bologna, portici are covered walkways alongside buildings. Notice their columns and arches: they are part of the city’s identity. A selection of these porticoes is on UNESCO’s World Heritage List.", "En Bolonia, los portici son paseos cubiertos junto a los edificios. Observa sus columnas y arcos: forman parte de la identidad de la ciudad. Una selección de estos pórticos figura en la Lista del Patrimonio Mundial de la UNESCO."),
    observation: t("Repère les arches. Comment saluerais-tu quelqu’un rencontré ici le matin ?", "Find the arches. How would you greet someone you met here in the morning?", "Busca los arcos. ¿Cómo saludarías a alguien aquí por la mañana?"),
    phrase: phrase("Buongiorno!", "Bonjour !", "Good morning!", "¡Buenos días!"),
    photo: italianCulturePhotos.bologna,
    source: { id: "bologna-porticoes", title: "The Porticoes of Bologna", publisher: "UNESCO", url: "https://whc.unesco.org/en/list/1650/", supports: t("Les portiques, passages couverts de Bologne.", "Bologna’s covered portico walkways.", "Los paseos cubiertos de Bolonia.") },
  },
  u06: {
    title: t("Firenze · Un pont habité par les boutiques", "Firenze · A bridge lined with shops", "Firenze · Un puente con tiendas"),
    body: t("À Florence, le Ponte Vecchio traverse l’Arno. Ses boutiques sont construites sur le pont lui-même. Firenze est le nom italien de Florence ; ponte signifie pont. Pour retrouver un lieu, commence par demander où il se trouve.", "In Florence, the Ponte Vecchio crosses the Arno. Its shops are built on the bridge itself. Firenze is the Italian name for Florence; ponte means bridge. To find a place, start by asking where it is.", "En Florencia, el Ponte Vecchio cruza el Arno. Sus tiendas están construidas sobre el propio puente. Firenze es el nombre italiano de Florencia; ponte significa puente. Para encontrar un lugar, empieza por preguntar dónde está."),
    observation: t("Repère les boutiques au-dessus de l’eau. Demande où se trouve le pont.", "Find the shops above the water. Ask where the bridge is.", "Busca las tiendas sobre el agua. Pregunta dónde está el puente."),
    phrase: phrase("Dov’è il ponte?", "Où est le pont ?", "Where is the bridge?", "¿Dónde está el puente?"),
    photo: italianCulturePhotos.florence,
    source: { id: "florence-bridge", title: "Ponte Vecchio", publisher: "Comune di Firenze · FeelFlorence", url: "https://www.feelflorence.it/it/punti-di-interesse/ponte-vecchio-0", supports: t("Le pont, ses boutiques et l’Arno à Florence.", "The bridge, its shops and the Arno in Florence.", "El puente, sus tiendas y el Arno en Florencia.") },
  },
  u08: {
    title: t("Venezia · La ville depuis l’eau", "Venezia · The city from the water", "Venezia · La ciudad desde el agua"),
    body: t("Le Grand Canal se trouve à Venise, Venezia en italien. Pour les transports publics sur l’eau, on peut prendre un vaporetto : c’est un bateau-bus, pas une gondole privée. Vérifie toujours la destination et les horaires du service utilisé.", "The Grand Canal is in Venice, Venezia in Italian. For public transport on the water, you can take a vaporetto: a waterbus, not a private gondola. Always check the destination and timetable of your service.", "El Gran Canal está en Venecia, Venezia en italiano. Para el transporte público por el agua se puede tomar un vaporetto: un autobús acuático, no una góndola privada. Confirma siempre el destino y el horario del servicio."),
    observation: t("Observe les bateaux. Quelle question poserais-tu avant de monter ?", "Look at the boats. What would you ask before boarding?", "Observa los barcos. ¿Qué preguntarías antes de subir?"),
    phrase: phrase("A che ora parte?", "À quelle heure part-il ?", "What time does it leave?", "¿A qué hora sale?"),
    photo: italianCulturePhotos.venice,
    source: { id: "venice-transport", title: "Public transport", publisher: "Venezia Unica", url: "https://www.veneziaunica.it/en/getting-around-venice/public-transport?language=en", supports: t("Les transports publics sur l’eau à Venise.", "Public water transport in Venice.", "El transporte público acuático de Venecia.") },
  },
  u11: {
    title: t("Roma · Raconter une visite", "Roma · Tell someone about a visit", "Roma · Contar una visita"),
    body: t("Le Colisée, Colosseo en italien, se trouve à Rome. Cet amphithéâtre antique possède une arène entourée de gradins. Ce n’est pas un temple. Regarde ses étages d’arcades, puis imagine comment raconter une visite au passé.", "The Colosseum, Colosseo in Italian, is in Rome. This ancient amphitheatre has an arena surrounded by seating. It is not a temple. Look at its tiers of arches, then imagine describing a visit in the past tense.", "El Coliseo, Colosseo en italiano, está en Roma. Este anfiteatro antiguo tiene una arena rodeada de gradas. No es un templo. Observa sus pisos de arcos e imagina cómo contar una visita en pasado."),
    observation: t("Repère les arcades. Imagine une visite hier et raconte-la en une phrase.", "Find the arches. Imagine a visit yesterday and describe it in one sentence.", "Busca los arcos. Imagina una visita ayer y cuéntala en una frase."),
    phrase: phrase("Ieri ho visitato il Colosseo.", "Hier, j’ai visité le Colisée.", "Yesterday I visited the Colosseum.", "Ayer visité el Coliseo."),
    photo: italianCulturePhotos.rome,
    source: { id: "rome-colosseum", title: "The Colosseum", publisher: "Parco archeologico del Colosseo", url: "https://colosseo.it/en/area/colosseo/", supports: t("Le Colisée, amphithéâtre antique à Rome.", "The Colosseum, an ancient amphitheatre in Rome.", "El Coliseo, anfiteatro antiguo en Roma.") },
  },
};

function culturalQuestion(id: string, unitId: string, prompt: LocaleText, labels: LocaleText[], correct: number, explanation: LocaleText, photo?: CoursePhoto): CourseQuestion {
  return {
    id: `it1-culture-${id}`, kind: "choice", category: "final", title: photo ? t("Où sommes-nous ?", "Where are we?", "¿Dónde estamos?") : t("Un souvenir du voyage", "A memory from the journey", "Un recuerdo del viaje"),
    prompt, hint: t(`Retrouve l’escale de l’unité ${Number(unitId.slice(1))}.`, `Recall the stop in unit ${Number(unitId.slice(1))}.`, `Recuerda la parada de la unidad ${Number(unitId.slice(1))}.`),
    hint2: photo ? photo.alt : t("Relis le repère culturel avant de réessayer.", "Revisit the cultural note before trying again.", "Vuelve a leer la nota cultural antes de intentarlo de nuevo."),
    explanation, options: labels.map((label, i) => ({ id: `${id}-${i}`, label, feedback: explanation })),
    correctId: `${id}-${correct}`, photo, taughtInUnitId: unitId,
  };
}
const cities = [t("Bologne", "Bologna", "Bolonia"), t("Florence", "Florence", "Florencia"), t("Venise", "Venice", "Venecia"), t("Rome", "Rome", "Roma")];

export const italianCultureFinal: CourseAssessment = {
  id: "it1-culture-finale", theme: "culture", passPercent: 80,
  title: t("Dernière escale · L’Italie en images", "Last stop · Italy in pictures", "Última parada · Italia en imágenes"),
  description: t("Retrouve quatre lieux et six repères culturels rencontrés pendant le parcours. Observe, choisis, puis découvre l’explication avec Yoppo. Sans chronomètre. Ce défi culturel ne remplace pas le bilan de langue.", "Recognise four places and six cultural details encountered along the course. Look, choose, then explore the explanation with Yoppo. No timer. This cultural challenge does not replace the language assessment.", "Reconoce cuatro lugares y seis detalles culturales del recorrido. Observa, elige y descubre la explicación con Yoppo. Sin cronómetro. Este reto cultural no sustituye la evaluación del idioma."),
  unitIds: Array.from({ length: 12 }, (_, i) => `u${String(i + 1).padStart(2, "0")}`),
  questions: [
    culturalQuestion("porticoes", "u01", t("Dans quelle ville avons-nous découvert ces passages couverts appelés portici ?", "In which city did we discover these covered walkways called portici?", "¿En qué ciudad descubrimos estos paseos cubiertos llamados portici?"), cities, 0, italianCultureStops.u01.body, italianCulturePhotos.bologna),
    culturalQuestion("bridge", "u06", t("Dans quelle ville se trouve ce pont portant des boutiques, le Ponte Vecchio ?", "Which city is home to this bridge with shops built on it, the Ponte Vecchio?", "¿En qué ciudad está este puente con tiendas, el Ponte Vecchio?"), cities, 1, italianCultureStops.u06.body, italianCulturePhotos.florence),
    culturalQuestion("canal", "u08", t("Dans quelle ville avons-nous rencontré ce Grand Canal et les bateaux-bus ?", "In which city did we encounter this Grand Canal and waterbuses?", "¿En qué ciudad encontramos este Gran Canal y los autobuses acuáticos?"), cities, 2, italianCultureStops.u08.body, italianCulturePhotos.venice),
    culturalQuestion("arena", "u11", t("Dans quelle ville se trouve cet amphithéâtre, le Colosseo ?", "Which city is home to this amphitheatre, the Colosseo?", "¿En qué ciudad está este anfiteatro, el Colosseo?"), cities, 3, italianCultureStops.u11.body, italianCulturePhotos.rome),
    culturalQuestion("portico-word", "u01", t("Tu proposes de marcher sotto i portici. Où veux-tu marcher ?", "You suggest walking sotto i portici. Where do you want to walk?", "Propones caminar sotto i portici. ¿Por dónde quieres caminar?"), [t("Sur un bateau", "On a boat", "En un barco"), t("Dans une arène", "In an arena", "En una arena"), t("Sous des passages couverts", "Under covered walkways", "Bajo paseos cubiertos")], 2, italianCultureStops.u01.body),
    culturalQuestion("arno", "u06", t("Quel fleuve passe sous le Ponte Vecchio ?", "Which river flows beneath the Ponte Vecchio?", "¿Qué río pasa bajo el Ponte Vecchio?"), [t("L’Arno", "The Arno", "El Arno"), t("Le Tibre", "The Tiber", "El Tíber"), t("Le Pô", "The Po", "El Po")], 0, italianCultureStops.u06.body),
    culturalQuestion("vaporetto", "u08", t("À Venise, qu’est-ce qu’un vaporetto ?", "In Venice, what is a vaporetto?", "En Venecia, ¿qué es un vaporetto?"), [t("Une gondole privée", "A private gondola", "Una góndola privada"), t("Un bateau-bus public", "A public waterbus", "Un autobús acuático público"), t("Un train", "A train", "Un tren")], 1, italianCultureStops.u08.body),
    culturalQuestion("amphitheatre", "u11", t("Quel type de monument est le Colisée ?", "What kind of monument is the Colosseum?", "¿Qué tipo de monumento es el Coliseo?"), [t("Un temple", "A temple", "Un templo"), t("Un pont", "A bridge", "Un puente"), t("Un amphithéâtre", "An amphitheatre", "Un anfiteatro")], 2, italianCultureStops.u11.body),
    culturalQuestion("bar", "u05", t("Au bar italien, al banco et al tavolo distinguent quoi ?", "At an Italian bar, what do al banco and al tavolo distinguish?", "En un bar italiano, ¿qué distinguen al banco y al tavolo?"), [t("Le comptoir et la table", "The counter and the table", "La barra y la mesa"), t("Le matin et le soir", "Morning and evening", "La mañana y la noche"), t("Le chaud et le froid", "Hot and cold", "Caliente y frío")], 0, t("Al banco signifie au comptoir ; al tavolo, à table. Comme dans l’unité 5, vérifie les conditions et les prix sur place.", "Al banco means at the counter; al tavolo means at a table. As in unit 5, check the conditions and prices on the spot.", "Al banco significa en la barra; al tavolo, en la mesa. Como en la unidad 5, confirma las condiciones y los precios allí.")),
    culturalQuestion("market", "u07", t("À Bologne, qu’avons-nous découvert dans le Quadrilatero ?", "In Bologna, what did we discover in the Quadrilatero?", "En Bolonia, ¿qué descubrimos en el Quadrilatero?"), [t("Une gare souterraine", "An underground station", "Una estación subterránea"), t("Un quartier historique de commerces et de marché", "A historic shopping and market district", "Un barrio histórico de tiendas y mercado"), t("Une île", "An island", "Una isla")], 1, t("Le Quadrilatero est un quartier historique de commerces et de marché à Bologne, rencontré dans l’unité 7. Nos prix d’exercice ne sont pas des tarifs réels.", "The Quadrilatero is Bologna’s historic shopping and market district, introduced in unit 7. Our practice prices are not real prices.", "El Quadrilatero es el barrio histórico de tiendas y mercado de Bolonia, presentado en la unidad 7. Los precios de los ejercicios no son precios reales.")),
  ],
};
