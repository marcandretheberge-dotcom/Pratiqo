import type { CourseAssessment, CourseUnit, LocaleText } from "../italian/course/courseTypes";
import { lessons09to10 } from "./lessons09to10";
import { lessons11to12 } from "./lessons11to12";
import { portugueseDepthQuestions, portugueseExtendedFinalQuestions } from "./depthAssessments";
import { t } from "./depthAuthoring";

const lessons = [...lessons09to10, ...lessons11to12];
type Plan = { title: LocaleText; subtitle: LocaleText; prompt: LocaleText; model: string; rubric: LocaleText[]; cultureTitle: LocaleText; note: LocaleText; sourceIds: string[] };
const plans: Plan[] = [
  {
    title: t("Le quotidien et les proches", "Everyday life and people close to you", "La vida diaria y las personas cercanas"),
    subtitle: t("Relations, habitudes et tâches partagées", "Relationships, routines and shared tasks", "Relaciones, hábitos y tareas compartidas"),
    prompt: t("Invente une colocation. En quatre à six phrases, présente deux personnes, situe une habitude et une exception, puis propose une répartition de deux tâches. Demande si elle convient ; aucune information personnelle réelle n’est nécessaire.", "Invent a shared home. In four to six sentences, introduce two people, describe a habit and an exception, then propose dividing two tasks. Ask whether the arrangement works; no real personal information is needed.", "Inventa una vivienda compartida. En cuatro a seis frases, presenta a dos personas, describe un hábito y una excepción y propone repartir dos tareas. Pregunta si funciona; no hacen falta datos personales reales."),
    model: "Estes são meus amigos. Geralmente estudamos de manhã, mas hoje é uma exceção. Eu posso preparar o jantar. Você pode lavar a louça? Essa divisão funciona para você?",
    rubric: [t("Les liens entre les personnes sont clairs.", "The relationships are clear.", "Las relaciones están claras."), t("Je distingue l’habitude de l’exception.", "I distinguish the habit from the exception.", "Distingo el hábito de la excepción."), t("Je propose des tâches et vérifie l’accord.", "I propose tasks and check agreement.", "Propongo tareas y compruebo el acuerdo.")],
    cultureTitle: t("Des vies différentes, des mots précis", "Different lives, precise words", "Vidas distintas, palabras precisas"),
    note: t("Les personnages et leurs liens sont fictifs. Les mots família, amigos et vizinhos permettent de raconter différents entourages ; ils n’imposent aucun modèle familial. Pour t’exercer, choisis les liens que tu souhaites décrire et demande plutôt que de supposer.", "The characters and relationships are fictional. Família, amigos and vizinhos can describe different social circles without imposing a family structure. For practice, choose the relationships you want to describe and ask rather than assume.", "Los personajes y vínculos son ficticios. Família, amigos y vizinhos describen distintos entornos sin imponer un modelo familiar. Elige qué relaciones practicar y pregunta en lugar de suponer."),
    sourceIds: ["ptbr-depth-pode-entrar"],
  },
  {
    title: t("Acheter et résoudre", "Shop and resolve a problem", "Comprar y resolver"),
    subtitle: t("Quantités, comparaisons et demandes précises", "Amounts, comparisons and clear requests", "Cantidades, comparaciones y peticiones claras"),
    prompt: t("Rédige une scène de cinq ou six phrases dans une boutique fictive. Demande une quantité ou une taille, compare deux options, puis explique un problème différent du modèle. Demande les solutions possibles et une confirmation ; n’invente pas de droit au remboursement.", "Write five or six sentences in a fictional shop. Request an amount or size, compare two options, then explain a problem different from the model. Ask about possible solutions and confirmation; do not invent a refund entitlement.", "Escribe cinco o seis frases en una tienda ficticia. Pide una cantidad o talla, compara dos opciones y explica un problema distinto del modelo. Pregunta por soluciones y confirmación; no inventes un derecho al reembolso."),
    model: "Comprei esta camisa ontem, mas ela ficou apertada. Você tem um tamanho maior? A camisa azul é mais barata que a verde. Posso trocar por esta? Quais são as opções? Pode anotar o combinado?",
    rubric: [t("La quantité ou la taille demandée est précise.", "The amount or size is specific.", "La cantidad o talla es precisa."), t("Ma comparaison indique le critère.", "My comparison names the criterion.", "Mi comparación nombra el criterio."), t("Je demande une solution possible sans présumer la réponse.", "I ask about a possible solution without assuming the response.", "Pregunto por una solución posible sin suponer la respuesta.")],
    cultureTitle: t("La scène ne fixe pas les règles d’un commerce", "The scene does not set a shop’s rules", "La escena no fija las normas de una tienda"),
    note: t("Tous les montants, produits disponibles et réponses de commerçants de ces scènes sont inventés. Le but est de nommer le besoin, vérifier la quantité ou la monnaie et demander les options. Une proposition dans un dialogue n’est pas une règle générale d’échange ou de remboursement.", "All amounts, stock and shop responses in these scenes are fictional. The goal is to state a need, check the quantity or change and ask about options. An offer in a dialogue is not a general exchange or refund rule.", "Todos los importes, existencias y respuestas comerciales son ficticios. Se practica expresar una necesidad, comprobar cantidad o cambio y preguntar por opciones. Una oferta del diálogo no es una norma general de cambio o reembolso."),
    sourceIds: ["ptbr-depth-portas"],
  },
  {
    title: t("Raconter et expliquer", "Tell and explain what happened", "Contar y explicar"),
    subtitle: t("Événements, contexte et causes", "Events, background and causes", "Sucesos, contexto y causas"),
    prompt: t("Invente une journée avec un petit contretemps. En cinq ou six phrases, raconte deux actions terminées, donne le contexte d’un événement, explique une cause et corrige un détail que l’autre personne a mal compris. Utilise des lieux ou prénoms différents des modèles.", "Invent a day with a small setback. In five or six sentences, tell two completed actions, give an event some background, explain a cause and correct a misunderstood detail. Use places or names different from the models.", "Inventa un día con un pequeño contratiempo. En cinco o seis frases, cuenta dos acciones terminadas, da contexto a un suceso, explica una causa y corrige un detalle mal entendido. Usa lugares o nombres distintos de los modelos."),
    model: "Ontem fui à biblioteca. A rua estava tranquila quando meu amigo chegou. Depois fiz o almoço. Cheguei tarde à reunião porque perdi o ônibus. Por isso, mandei uma mensagem. Não foi de manhã, foi à tarde.",
    rubric: [t("Mon récit a un ordre compréhensible.", "My account has a clear sequence.", "Mi relato tiene un orden comprensible."), t("Je distingue le contexte d’un événement terminé.", "I distinguish background from a completed event.", "Distingo contexto y hecho terminado."), t("La cause et la correction sont explicites.", "The cause and correction are explicit.", "La causa y la corrección son explícitas.")],
    cultureTitle: t("Une langue, plusieurs façons de la faire entendre", "One language, different ways of sounding it", "Una lengua, distintas maneras de hacerla sonar"),
    note: t("Le Museu da Língua Portuguesa présente la diversité des accents, du vocabulaire et des façons de parler. Les indications de prononciation de ce parcours aident à garder les mots distincts ; elles ne font pas d’un accent régional une faute et n’attribuent aucun score automatique à ta voix.", "The Museu da Língua Portuguesa presents diversity in accents, vocabulary and ways of speaking. The course pronunciation notes help keep words distinct; they do not treat a regional accent as an error or assign an automatic score to your voice.", "El Museu da Língua Portuguesa presenta diversidad de acentos, vocabulario y formas de hablar. Las notas ayudan a distinguir palabras; no convierten un acento regional en error ni asignan una puntuación automática a tu voz."),
    sourceIds: ["ptbr-depth-museu", "ptbr-depth-portas"],
  },
  {
    title: t("Organiser un projet ensemble", "Organise a project together", "Organizar un proyecto juntos"),
    subtitle: t("Contraintes, responsabilités et nouveau plan", "Limits, responsibilities and a revised plan", "Límites, responsabilidades y un plan nuevo"),
    prompt: t("Prépare un projet fictif de groupe en cinq à sept phrases. Donne une durée et un budget, compare deux options, répartis deux tâches, puis change un lieu ou une heure après un imprévu. Termine par une confirmation complète. Ce texte sert à t’entraîner, pas à certifier un niveau.", "Plan a fictional group project in five to seven sentences. Give a time limit and budget, compare two options, divide two tasks, then change a place or time after a setback. End with a full confirmation. This text is practice, not level certification.", "Prepara un proyecto ficticio en cinco a siete frases. Da tiempo y presupuesto, compara dos opciones, reparte dos tareas y cambia lugar u hora tras un imprevisto. Termina con una confirmación completa. Es práctica, no certificación de nivel."),
    model: "Temos duas horas e sessenta reais. Prefiro a visita curta porque cabe no orçamento. A gente prepara o encontro. Eu fico responsável pela lista e você reserva a sala. Não vamos conseguir chegar às três. Podemos começar meia hora depois? Para confirmar, nos encontramos às três e meia na entrada da biblioteca.",
    rubric: [t("Le choix respecte les contraintes annoncées.", "The choice fits the stated limits.", "La elección respeta los límites indicados."), t("Chaque responsabilité a une personne identifiée.", "Each responsibility has an identified person.", "Cada responsabilidad tiene una persona identificada."), t("La confirmation reprend le plan modifié, pas l’ancien.", "The confirmation restates the revised plan, not the old one.", "La confirmación recoge el plan modificado, no el anterior.")],
    cultureTitle: t("A gente et nós : choisir et garder l’accord", "A gente and nós: choose and keep agreement", "A gente y nós: elegir y mantener la concordancia"),
    note: t("A gente est fréquent dans les échanges courants au Brésil et peut exprimer nous avec un verbe au singulier ; nós prend le pluriel dans les modèles travaillés ici. Repérer les deux aide à comprendre sans réduire le pays à un seul registre. Le bilan du parcours vérifie ces tâches écrites, sans certification Celpe-Bras ni niveau CECR attribué.", "A gente is common in everyday Brazilian exchanges and can mean we with a singular verb; nós takes plural agreement in the patterns practised here. Recognising both supports understanding without reducing the country to one register. The checkpoint checks these written tasks without awarding Celpe-Bras certification or a CEFR level.", "A gente es frecuente en intercambios cotidianos de Brasil y puede expresar nosotros con verbo singular; nós lleva plural en los modelos practicados. Reconocer ambos ayuda sin reducir el país a un registro. El balance verifica estas tareas escritas sin otorgar Celpe-Bras ni un nivel MCER."),
    sourceIds: ["ptbr-depth-pode-entrar", "ptbr-depth-inep"],
  },
];

export const portugueseDepthUnits: CourseUnit[] = plans.map((plan, index) => {
  const number = index + 9, id = "u" + String(number).padStart(2, "0"), group = lessons.slice(index * 3, index * 3 + 3);
  return {
    id, number, title: plan.title, subtitle: plan.subtitle, objectives: group.map(item => item.goal), lessons: group,
    quiz: {
      id: "ptbr1-" + id + "-quiz", title: t("Mets tes acquis en situation", "Apply what you learned", "Aplica lo aprendido"),
      description: t("Six situations écrites nouvelles. Les modèles consultés restent indiqués comme aide ; aucun enregistrement n’est requis pour ce bilan.", "Six new written situations. Viewed models stay marked as help; this checkpoint requires no recording.", "Seis situaciones escritas nuevas. Consultar modelos se registra como ayuda; este balance no requiere grabación."),
      unitIds: [id], passPercent: 80, questions: portugueseDepthQuestions[id],
    },
    production: { id: "ptbr1-" + id + "-production", title: t("À toi de construire l’échange", "Build your own exchange", "Construye tu intercambio"),
      prompt: plan.prompt, model: plan.model, rubric: plan.rubric },
    culture: { title: plan.cultureTitle, body: plan.note, sourceIds: plan.sourceIds },
  };
});

export const portugueseExtendedFinal: CourseAssessment = {
  id: "ptbr1-foundations-final",
  title: t("Le portugais dans douze situations", "Portuguese across twelve situations", "Portugués en doce situaciones"),
  description: t("Vingt-quatre questions écrites inédites mobilisent les douze unités. Elles vérifient compréhension, choix et formulation ; elles n’évaluent pas automatiquement la voix et ne certifient aucun niveau.", "Twenty-four new written questions draw on all twelve units. They check comprehension, decisions and wording; they do not automatically assess voice or certify a level.", "Veinticuatro preguntas escritas nuevas abarcan las doce unidades. Verifican comprensión, elección y formulación; no evalúan automáticamente la voz ni certifican un nivel."),
  unitIds: Array.from({ length: 12 }, (_, index) => "u" + String(index + 1).padStart(2, "0")),
  passPercent: 80, questions: portugueseExtendedFinalQuestions,
};
