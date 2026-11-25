import type { CourseUnit, LocaleText } from "../italian/course/courseTypes";
import { lessons09to10 } from "./lessons09to10";
import { lessons11to12 } from "./lessons11to12";
import { germanDepthUnitQuestions } from "./depthAssessments";
import { t } from "./depthAuthoring";

type Plan = { title: LocaleText; subtitle: LocaleText; prompt: LocaleText; model: string; rubric: LocaleText[]; context: LocaleText; sources: string[] };
const plans: Plan[] = [
  {
    title: t("Au marché et au magasin", "At the market and the shop", "En el mercado y la tienda"),
    subtitle: t("Quantités, taille et demande d’échange", "Amounts, fit and an exchange request", "Cantidades, talla y petición de cambio"),
    prompt: t("Prépare une scène de quatre à cinq phrases : commande deux produits avec leurs quantités, corrige l’une des quantités, puis demande à essayer une veste. Change au moins un produit ou une quantité du modèle. Dans une seconde version, demande si un échange est possible sans supposer qu’il est déjà accepté.", "Build a four-to-five-sentence scene: order two products with amounts, correct one amount, then ask to try on a jacket. Change at least one product or amount from the model. In a second version, ask whether an exchange is possible without assuming it has been accepted.", "Crea una escena de cuatro o cinco frases: pide dos productos con cantidades, corrige una cantidad y pide probarte una chaqueta. Cambia un producto o una cantidad del modelo. En una segunda versión, pregunta si el cambio es posible sin suponer que ya lo aceptaron."),
    model: "Ich hätte gern ein Kilo Äpfel und zwei Flaschen Wasser. Nur eine Flasche, bitte. Was kostet alles zusammen? Diese Jacke ist zu klein. Haben Sie eine Nummer größer?",
    rubric: [t("Je garde le bon produit et la bonne quantité.", "I keep the correct product and amount.", "Mantengo el producto y la cantidad correctos."), t("Je distingue prix, taille et défaut.", "I distinguish price, fit and damage.", "Distingo precio, talla y defecto."), t("Je demande et vérifie au lieu d’inventer une garantie d’échange.", "I ask and check rather than invent an exchange guarantee.", "Pregunto y compruebo sin inventar una garantía de cambio.")],
    context: t("Les achats, prix et décisions d’échange sont inventés pour ces scènes. Une formule polie permet d’expliquer le besoin et de demander une réponse; elle ne prouve pas qu’un commerce accepte un échange. Tu peux aussi dire que tu souhaites réfléchir.", "Purchases, prices and exchange decisions are invented for these scenes. A polite phrase helps explain a need and ask for a reply; it does not prove that a shop accepts an exchange. You can also say you want to think.", "Compras, precios y decisiones de cambio son ficticios. Una fórmula cortés permite explicar la necesidad y pedir respuesta; no demuestra que una tienda acepte un cambio. También puedes decir que quieres pensarlo."),
    sources: ["de-depth-measures", "de-depth-comparison"],
  },
  {
    title: t("Habiter et s’organiser", "Share a space and organize", "Compartir un espacio y organizarse"),
    subtitle: t("Possession, destination et tâches", "Ownership, destination and tasks", "Posesión, destino y tareas"),
    prompt: t("Imagine une salle que tu partages avec une autre personne. En quatre à six phrases, identifie ton sac, demande la permission d’utiliser un objet, indique où tu poses un livre et propose une tâche avant une heure limite. Change un objet ou l’heure du modèle; ne confonds pas permission et obligation.", "Imagine sharing a room with another person. In four to six sentences, identify your bag, ask permission to use an item, say where you put a book and offer a task before a deadline. Change an item or the model’s time; keep permission distinct from obligation.", "Imagina una sala compartida. En cuatro a seis frases, identifica tu bolsa, pide permiso para usar un objeto, indica dónde pones un libro y ofrece una tarea antes de una hora límite. Cambia un objeto o la hora del modelo; distingue permiso y obligación."),
    model: "Meine Tasche ist blau. Darf ich deinen Becher benutzen? Ich lege das Buch in die Tasche. Ich kann die Stühle holen. Wir müssen bis zehn Uhr fertig sein. Du musst nicht alles allein machen.",
    rubric: [t("Je demande l’accord pour l’objet d’autrui.", "I ask permission for someone else’s item.", "Pido permiso para usar un objeto ajeno."), t("Je sépare où l’objet est et où je le mets.", "I separate where the item is from where I put it.", "Distingo dónde está el objeto y dónde lo pongo."), t("Ma tâche et mon heure limite sont compréhensibles.", "My task and deadline are clear.", "Mi tarea y hora límite son claras.")],
    context: t("Les objets et les prénoms des scènes sont fictifs. Demander l’accord, préciser le lieu et répartir une tâche sont des actions de communication; elles ne décrivent pas une règle de comportement commune à toutes les personnes germanophones.", "The objects and names are fictional. Asking permission, specifying a location and sharing a task are communication actions; they are not claims about a rule shared by every German speaker.", "Los objetos y nombres son ficticios. Pedir permiso, precisar un lugar y repartir una tarea son acciones comunicativas; no describen una norma común a todas las personas germanohablantes."),
    sources: ["de-depth-location", "de-depth-modals"],
  },
  {
    title: t("Raconter hier", "Tell about yesterday", "Contar lo de ayer"),
    subtitle: t("Situation passée, actions et trajet", "Past situation, actions and a journey", "Situación pasada, acciones y trayecto"),
    prompt: t("Raconte une demi-journée fictive en quatre à six phrases. Situe-toi dans le passé, raconte deux actions terminées et un déplacement, puis marque leur ordre. Change le lieu, la boisson ou l’heure du modèle. Ne transforme pas un projet futur en action déjà faite.", "Tell a fictional half-day in four to six sentences. Give a past situation, two completed actions and a journey, marking their order. Change the model’s place, drink or time. Do not turn a future plan into a completed action.", "Cuenta media jornada ficticia en cuatro a seis frases. Sitúate en el pasado, narra dos acciones terminadas y un desplazamiento y marca su orden. Cambia el lugar, la bebida o la hora del modelo. No conviertas un plan futuro en una acción ya hecha."),
    model: "Gestern war ich in Köln. Zuerst habe ich Brot gekauft. Danach haben wir Kaffee gemacht. Wir sind ins Museum gegangen. Am Abend sind wir zurückgefahren. Wir hatten nur einen Tag.",
    rubric: [t("Je distingue ce qui a eu lieu de ce qui est seulement prévu.", "I distinguish what happened from what is only planned.", "Distingo lo ocurrido de lo que solo está previsto."), t("Je garde l’auxiliaire et le participe ensemble.", "I keep the auxiliary and participle together.", "Conservo el auxiliar y el participio."), t("Mon ordre des étapes reste clair.", "My sequence of stages stays clear.", "El orden de las etapas queda claro.")],
    context: t("Les trajets et les horaires sont des supports d’apprentissage fictifs. L’auxiliaire du Perfekt se vérifie avec le verbe et son emploi; le raccourci « tout mouvement prend sein » ne suffit pas. Les formes apprises permettent quelques récits utiles sans prétendre couvrir tout le passé allemand.", "Journeys and times are fictional learning material. A Perfekt auxiliary depends on the verb and its use; 'all movement takes sein' is not a sufficient rule. The learned forms support useful short accounts without claiming to cover all German past usage.", "Trayectos y horarios son materiales ficticios. El auxiliar del Perfekt depende del verbo y su uso; «todo movimiento lleva sein» no basta. Las formas aprendidas permiten relatos útiles sin pretender cubrir todo el pasado alemán."),
    sources: ["de-depth-perfect", "de-depth-participle"],
  },
  {
    title: t("Expliquer et confirmer", "Explain and confirm", "Explicar y confirmar"),
    subtitle: t("Raison, créneau et message complet", "Reason, time slot and a complete message", "Razón, horario y mensaje completo"),
    prompt: t("Rédige un message de quatre à six phrases à une personne que tu connais : indique une vérification déjà faite, propose un jour et une heure, explique une contrainte avec une raison, puis demande confirmation. Change au moins deux détails du modèle. Contrôle que l’horaire proposé respecte ta limite.", "Write a four-to-six-sentence message to someone you know: give a completed check, propose a day and time, explain a constraint with a reason, then request confirmation. Change at least two model details. Check that the proposed time respects your limit.", "Escribe un mensaje de cuatro a seis frases a alguien conocido: indica una comprobación terminada, propone día y hora, explica una limitación con su razón y pide confirmación. Cambia al menos dos datos del modelo. Comprueba que el horario respeta tu límite."),
    model: "Ich habe den Plan geprüft. Am Mittwoch kann ich nicht, weil ich arbeiten muss. Donnerstag passt mir. Wir treffen uns um zehn Uhr vor der Bibliothek. Ich muss vor zwölf Uhr zurück sein. Bitte bestätige kurz.",
    rubric: [t("Le jour, l’heure et la limite sont compatibles.", "The day, time and limit are compatible.", "El día, la hora y el límite son compatibles."), t("Ma raison correspond à la bonne personne et garde sa négation.", "My reason belongs to the right person and keeps its negation.", "La razón corresponde a la persona correcta y conserva su negación."), t("Je demande une confirmation sans la supposer acquise.", "I ask for confirmation rather than assume it.", "Pido confirmación sin darla por hecha.")],
    context: t("Le nouveau bilan porte sur douze étapes écrites. Une bonne réponse ne prouve pas que la même situation est maîtrisée à l’oral. Le bilan historique des huit premières unités et ses résultats restent séparés. Pour weil, le parcours pratique le verbe final à l’écrit sans nier les autres constructions de l’oral.", "The new review covers twelve written stages. A correct answer does not prove the same situation is mastered orally. The original eight-unit review and its results remain separate. The course practises verb-final written weil without denying other spoken patterns.", "El nuevo balance cubre doce etapas escritas. Una respuesta correcta no demuestra dominio oral de la misma situación. El balance histórico de ocho unidades y sus resultados siguen separados. Se practica weil escrito con verbo final sin negar otras construcciones orales."),
    sources: ["de-depth-because", "de-depth-pronunciation"],
  },
];

const lessons = [...lessons09to10, ...lessons11to12];
export const germanDepthUnits: CourseUnit[] = plans.map((plan, index) => {
  const number = index + 9, id = `u${String(number).padStart(2, "0")}`;
  const group = lessons.filter(item => item.id.startsWith(`de1-${id}-`));
  const questions = germanDepthUnitQuestions[id];
  if (group.length !== 3 || questions?.length !== 6) throw new Error(`Incomplete German extension ${id}`);
  return {
    id, number, title: plan.title, subtitle: plan.subtitle, objectives: group.map(item => item.goal), lessons: group,
    quiz: {
      id: `de1-${id}-quiz`, title: t("Le point d’étape écrit", "Written checkpoint", "Punto de control escrito"),
      description: t("Six situations nouvelles à lire ou à formuler. Aucune écoute n’est nécessaire pour ce bilan écrit; l’aide reste disponible et sera indiquée.", "Six new situations to read or formulate. No listening is needed for this written checkpoint; help remains available and will be marked.", "Seis situaciones nuevas para leer o formular. Esta evaluación escrita no requiere escucha; la ayuda sigue disponible y se indicará."),
      unitIds: [id], passPercent: 80, questions: questions.map(question => ({ ...question, taughtInUnitId: id })),
    },
    production: { id: `de1-${id}-production`, title: t("Ta scène à construire", "Build your own scene", "Construye tu escena"), prompt: plan.prompt, model: plan.model, rubric: plan.rubric },
    culture: { title: t("Le contexte compte", "Context matters", "El contexto importa"), body: plan.context, sourceIds: plan.sources },
  };
});
