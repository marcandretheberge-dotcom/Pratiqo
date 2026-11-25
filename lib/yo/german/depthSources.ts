import type { CourseSource } from "../italian/course/courseTypes";
import { t } from "./depthAuthoring";

/** Primary references validate the language notes; all scenes and exercises are original. */
export const germanDepthSources: CourseSource[] = [
  {
    id: "de-depth-measures", title: "Messangaben und Pluralbildung", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/fragen/14",
    supports: t("Quantités avec Kilo et noms de récipients au pluriel, dans les groupes présentés en unité 9.", "Amounts with Kilo and plural container nouns in the unit 9 examples.", "Cantidades con Kilo y recipientes en plural en los ejemplos de la unidad 9."),
  },
  {
    id: "de-depth-comparison", title: "Größer als oder größer wie? — als und wie bei Komparation", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/fragen/134",
    supports: t("Comparaison avec als dans le modèle écrit; prise en compte de la variation sans imposer une caricature régionale.", "Comparison with als in the written pattern, acknowledging variation without imposing a regional stereotype.", "Comparación con als en el modelo escrito, reconociendo variación sin imponer un estereotipo regional."),
  },
  {
    id: "de-depth-location", title: "Wechselpräpositionen", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/progr@mm/6858",
    supports: t("Datif pour la position ou le lieu d’un mouvement, accusatif pour une destination avec les prépositions étudiées.", "Dative for location or movement within a place, accusative for a destination with the studied prepositions.", "Dativo para ubicación o movimiento dentro de un lugar y acusativo para destino con las preposiciones estudiadas."),
  },
  {
    id: "de-depth-modals", title: "Modalverben im Verbalkomplex", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/kontrastive-grammatik/3363",
    supports: t("Modal et infinitif, permission et nécessité; distinction entre absence d’obligation et interdiction.", "Modal plus infinitive, permission and necessity; the distinction between no obligation and prohibition.", "Modal e infinitivo, permiso y necesidad; distinción entre ausencia de obligación y prohibición."),
  },
  {
    id: "de-depth-perfect", title: "haben oder sein?", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/kontrastive-grammatik/4147",
    supports: t("Choix de l’auxiliaire du Perfekt, limité aux emplois et déplacements réellement enseignés; existence de variations et d’exceptions.", "Perfekt auxiliary choice, limited to the uses and journeys actually taught; variation and exceptions exist.", "Elección del auxiliar del Perfekt limitada a los usos y desplazamientos enseñados; existen variaciones y excepciones."),
  },
  {
    id: "de-depth-participle", title: "Partizip II", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/systematische-grammatik/1283",
    supports: t("Participes réguliers et irréguliers et position de ge- avec les verbes séparables; la liste étudiée n’est pas une règle universelle.", "Regular and irregular participles and ge- placement in separable verbs; the studied list is not a universal rule.", "Participios regulares e irregulares y posición de ge- con verbos separables; la lista estudiada no es una regla universal."),
  },
  {
    id: "de-depth-because", title: "Verbstellung nach weil, obwohl, wobei und anderen subordinierenden Konnektoren", publisher: "Leibniz-Institut für Deutsche Sprache — grammis",
    url: "https://grammis.ids-mannheim.de/fragen/133",
    supports: t("Modèle de weil avec verbe final pour l’écrit enseigné; les autres constructions attestées à l’oral ne sont pas effacées.", "Verb-final weil pattern for the taught written form; other attested spoken constructions are acknowledged.", "Modelo de weil con verbo final para la forma escrita enseñada, reconociendo otras construcciones orales documentadas."),
  },
  {
    id: "de-depth-pronunciation", title: "Aussprachetutorials", publisher: "Goethe-Institut — Deutschstunde",
    url: "https://www.goethe.de/prj/dlp/de/unterrichtsmaterial/aussprachetutorials",
    supports: t("Repères d’écoute sur voyelles, trémas, rythme et accent; aucune imitation audio ni évaluation automatique de prononciation n’est tirée de cette source.", "Listening guidance on vowels, umlauts, rhythm and stress; this source supplies neither copied audio nor an automatic pronunciation assessment.", "Orientaciones de escucha sobre vocales, diéresis, ritmo y acento; no se copia audio ni se deriva una evaluación automática de pronunciación."),
  },
];
