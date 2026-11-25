import type { CourseCatalog, CourseUnit, LocaleText } from "../italian/course/courseTypes";
import { t } from "./courseAuthoring";
import { lessons01to04 } from "./lessons01to04";
import { lessons05to08 } from "./lessons05to08";
import { lessons09to12 } from "./lessons09to12";
import { checks01to06 } from "./assessments01to06";
import { checks07to12 } from "./assessments07to12";
import { spanishFinal } from "./finalAssessment";
export { spanishFinal } from "./finalAssessment";
export { spanishSources } from "./courseSources";

interface UnitBrief {
  title: LocaleText;
  subtitle: LocaleText;
  production: LocaleText;
  model: string;
  culture: CourseUnit["culture"];
}

const briefs: UnitBrief[] = [
  {
    title: t("Entrer dans la conversation", "Join the conversation", "Entrar en la conversación"),
    subtitle: t("Identité, contact et réparation", "Identity, contact and clarification", "Identidad, contacto y aclaración"),
    production: t("Présente un personnage inventé avec son nom, son origine et sa ville actuelle. Ajoute une demande pour faire répéter ou écrire un mot. N’inscris pas de coordonnées personnelles réelles.", "Introduce a fictional person with their name, origin and current city. Add a request to repeat or write a word. Do not enter real personal contact details.", "Presenta a un personaje inventado con nombre, origen y ciudad actual. Añade una petición para repetir o escribir una palabra. No introduzcas datos de contacto reales."),
    model: "Me llamo Nora. Soy de Chile, pero vivo en Montevideo. ¿Puede repetir la última palabra, por favor?",
    culture: { title: t("Reconnaître une autre façon de tutoyer", "Recognize another familiar form", "Reconocer otra forma de trato cercano"), body: t("Dans une rencontre rioplatense, tu peux lire « ¿Cómo te llamás? » avec vos. Le parcours de base utilise « ¿Cómo te llamas? » avec tú. Les deux questions cherchent le prénom ; la forme voseante est une rencontre régionale, pas une faute à corriger.", "In a River Plate encounter, you may read “¿Cómo te llamás?” with vos. The base course uses “¿Cómo te llamas?” with tú. Both ask a name; the voseo form is a regional encounter, not a mistake to correct.", "En un encuentro rioplatense puedes leer «¿Cómo te llamás?» con vos. El recorrido base usa «¿Cómo te llamas?» con tú. Ambas preguntas buscan el nombre; la forma voseante es una variante regional, no un error que corregir."), sourceIds: ["esf-rae-voseo"] },
  },
  {
    title: t("Partager une pause", "Share a break", "Compartir una pausa"),
    subtitle: t("Commande, préférences et paiement", "Ordering, preferences and payment", "Pedido, preferencias y pago"),
    production: t("Écris une commande pour deux personnes, une préférence d’ingrédient et une demande de paiement. Change au moins une boisson du modèle.", "Write an order for two people, an ingredient preference and a payment request. Change at least one drink from the model.", "Escribe un pedido para dos personas, una preferencia de ingrediente y una petición de pago. Cambia al menos una bebida del modelo."),
    model: "Para mí, un té sin azúcar. Para ella, un café pequeño. La cuenta, por favor. ¿Puedo pagar con tarjeta?",
    culture: { title: t("Demander avant de supposer", "Ask before assuming", "Preguntar antes de suponer"), body: t("Dans ces scènes, tu demandes les ingrédients et le moyen de paiement. Les réponses appartiennent au dialogue : réutilise la question auprès du lieu réel pour connaître ses options, sans supposer qu’un exemple vaut partout.", "In these scenes, you ask about ingredients and payment. The replies belong to the dialogue: reuse the question at a real venue to find its options, without assuming an example applies everywhere.", "En estas escenas preguntas por ingredientes y pago. Las respuestas pertenecen al diálogo: reutiliza la pregunta en el lugar real para conocer sus opciones, sin suponer que un ejemplo vale en todas partes."), sourceIds: [] },
  },
  {
    title: t("Se repérer et vérifier", "Find your way and check", "Orientarse y comprobar"),
    subtitle: t("Lieux, directions et trajets", "Places, directions and routes", "Lugares, direcciones y trayectos"),
    production: t("Imagine un trajet entre la banque et une bibliothèque. Donne deux indications, situe l’entrée et ajoute une question pour vérifier la direction.", "Imagine a route between a bank and a library. Give two directions, locate the entrance and add a question to check the direction.", "Imagina un recorrido entre un banco y una biblioteca. Da dos indicaciones, sitúa la entrada y añade una pregunta para confirmar el sentido."),
    model: "Sigue derecho hasta el banco. Después gira a la izquierda. La biblioteca está frente al parque. ¿Es esta la entrada?",
    culture: { title: t("Des sons à reconnaître", "Sounds to recognize", "Sonidos que reconocer"), body: t("Avec le seseo, centro commence avec le son de s, et le z de plaza a aussi ce son. Ce repère aide à reconnaître des mots sans changer leur orthographe. Il ne signifie pas que tous les accents d’Amérique sont identiques.", "With seseo, centro begins with the sound of s, and the z in plaza also has that sound. This helps recognize words without changing their spelling. It does not mean every accent in the Americas is identical.", "Con seseo, centro empieza con el sonido de s y la z de plaza también tiene ese sonido. La pauta ayuda a reconocer palabras sin cambiar su escritura. No significa que todos los acentos de América sean iguales."), sourceIds: ["esf-rae-seseo"] },
  },
  {
    title: t("Faire tenir un rendez-vous", "Make a meeting work", "Concretar un encuentro"),
    subtitle: t("Horaires, accord et changement", "Schedules, agreement and changes", "Horarios, acuerdo y cambios"),
    production: t("Propose un rendez-vous avec un jour, une heure et un lieu. Annonce ensuite un changement et confirme les détails conservés.", "Propose a meeting with a day, time and place. Then announce a change and confirm the details that remain.", "Propón un encuentro con día, hora y lugar. Después anuncia un cambio y confirma los datos que se mantienen."),
    model: "¿Nos vemos el jueves a las seis en la biblioteca? No puedo llegar a las seis porque tengo trabajo. ¿Qué tal a las siete? En la misma biblioteca.",
    culture: { title: t("La précision aide l’autre personne", "Precision helps the other person", "La precisión ayuda a la otra persona"), body: t("Un rendez-vous utile conserve trois repères : jour, heure et lieu. Les horaires du parcours sont inventés pour l’exercice ; dans ton propre message, précise aussi matin ou après-midi si le contexte laisse un doute.", "A useful arrangement keeps three reference points: day, time and place. Course schedules are invented for practice; in your own message, also specify morning or afternoon when context leaves doubt.", "Un acuerdo útil conserva tres referencias: día, hora y lugar. Los horarios del recorrido son inventados; en tu propio mensaje, aclara también mañana o tarde si el contexto deja dudas."), sourceIds: [] },
  },
  {
    title: t("Choisir au marché", "Choose at the market", "Elegir en el mercado"),
    subtitle: t("Prix, quantités et comparaisons", "Prices, amounts and comparisons", "Precios, cantidades y comparaciones"),
    production: t("Prépare un achat fictif : demande un prix et son unité, choisis une quantité, puis compare deux options et justifie ta préférence.", "Prepare a fictional purchase: ask a price and its unit, choose an amount, then compare two options and justify your preference.", "Prepara una compra ficticia: pregunta precio y unidad, elige cantidad, compara dos opciones y justifica tu preferencia."),
    model: "¿El precio es por kilo? Quisiera medio kilo de tomates. También busco una bolsa. Prefiero esta porque es más barata.",
    culture: { title: t("L’unité fait partie du prix", "The unit is part of the price", "La unidad forma parte del precio"), body: t("Par unité, par kilo et total ne répondent pas à la même question. Les montants du cours servent à comparer et à calculer dans une scène ; ils ne décrivent ni des tarifs actuels ni un taux de change.", "Per item, per kilo and total answer different questions. Course amounts support comparison and calculation in a scene; they do not describe current prices or exchange rates.", "Por unidad, por kilo y total responden a preguntas distintas. Los importes del curso permiten comparar y calcular en una escena; no describen precios actuales ni tipos de cambio."), sourceIds: [] },
  },
  {
    title: t("S’installer et demander de l’aide", "Settle in and ask for help", "Instalarse y pedir ayuda"),
    subtitle: t("Réservation, services et solution", "Bookings, services and solutions", "Reservas, servicios y soluciones"),
    production: t("À la réception, annonce une réservation inventée, vérifie un service et signale un problème en demandant une solution précise.", "At reception, give a fictional booking, check one service and report a problem while asking for a specific solution.", "En recepción, anuncia una reserva ficticia, consulta un servicio y comunica un problema pidiendo una solución concreta."),
    model: "Tengo una reserva a nombre de Sol, para dos personas. ¿Está incluido el desayuno? El ascensor no funciona. ¿Hay acceso sin escaleras?",
    culture: { title: t("Usted et une demande précise", "Usted and a precise request", "Usted y una petición concreta"), body: t("Le cours propose usted pour ces échanges avec la réception : ¿puede…? Le verbe utilise la troisième personne. Pour un groupe, ustedes s’accorde au pluriel : ¿pueden…? Le choix du registre s’adapte à l’échange réel.", "The course uses usted for these reception exchanges: ¿puede…? The verb uses third-person agreement. For a group, ustedes takes the plural: ¿pueden…? Adapt the register to the actual exchange.", "El curso propone usted en estos intercambios con recepción: ¿puede…? El verbo usa tercera persona. Para un grupo, ustedes concuerda en plural: ¿pueden…? Adapta el registro al intercambio real."), sourceIds: ["esf-rae-usted"] },
  },
  {
    title: t("Créer des liens", "Build connections", "Crear vínculos"),
    subtitle: t("Proches, description et invitation", "People, descriptions and invitations", "Personas, descripción e invitación"),
    production: t("Présente deux personnes inventées et donne un repère pour en reconnaître une. Invite ensuite l’une d’elles et propose une autre date si nécessaire.", "Introduce two fictional people and give a clue to recognize one. Then invite one person and offer another date if needed.", "Presenta a dos personas inventadas y da una referencia para reconocer a una. Invita a una de ellas y propone otra fecha si hace falta."),
    model: "Este es mi amigo Diego. Mi hermana está junto a la puerta y lleva una camisa azul. ¿Quieres venir a cenar? Si hoy no puedes, ¿qué tal mañana?",
    culture: { title: t("Une rencontre avec vos", "An encounter with vos", "Un encuentro con vos"), body: t("Dans la scène régionale, un ami demande « ¿Vos tenés hermanos? ». Cela correspond ici à « ¿Tú tienes hermanos? ». Reconnais la même intention et choisis un registre cohérent ; le voseo possède plusieurs formes selon les régions.", "In the regional scene, a friend asks “¿Vos tenés hermanos?” This corresponds here to “¿Tú tienes hermanos?” Recognize the same intention and choose a consistent register; voseo has several regional forms.", "En la escena regional, un amigo pregunta «¿Vos tenés hermanos?». Aquí corresponde a «¿Tú tienes hermanos?». Reconoce la misma intención y elige un registro coherente; el voseo tiene distintas formas regionales."), sourceIds: ["esf-rae-voseo"] },
  },
  {
    title: t("Continuer son trajet", "Keep the journey moving", "Continuar el trayecto"),
    subtitle: t("Billet, embarquement et imprévu", "Tickets, boarding and disruption", "Boleto, embarque e imprevisto"),
    production: t("Demande un billet, confirme le quai et le trajet, puis explique comment tu chercherais une autre sortie après une annulation. Ne suppose pas que le billet reste valable sans le demander.", "Request a ticket, confirm platform and destination, then show how you would seek another departure after a cancellation. Ask whether the ticket is still valid.", "Pide un boleto, confirma andén y destino y muestra cómo buscarías otra salida tras una cancelación. Pregunta si el boleto sigue siendo válido."),
    model: "Quisiera un boleto de ida y vuelta. ¿De qué andén sale? El viaje está cancelado: ¿hay otra salida hoy? ¿Puedo usar este boleto?",
    culture: { title: t("Boleto, billete, pasaje", "Boleto, billete, pasaje", "Boleto, billete, pasaje"), body: t("Boleto est le mot utilisé dans les tâches. Tu peux aussi rencontrer billete ou pasaje pour un titre de transport. Regarde le contexte : pasaje peut avoir d’autres sens. Demander le trajet reste utile quel que soit le mot choisi.", "Tasks use boleto. You may also encounter billete or pasaje for a travel ticket. Check context: pasaje can have other meanings. Asking about the route remains useful whichever word is used.", "Las tareas usan boleto. También puedes encontrar billete o pasaje para un título de transporte. Mira el contexto: pasaje tiene otros sentidos. Preguntar por el trayecto sigue siendo útil cualquiera que sea el término."), sourceIds: ["esf-rae-boleto", "esf-rae-pasaje"] },
  },
  {
    title: t("Collaborer au quotidien", "Work together day to day", "Colaborar en lo cotidiano"),
    subtitle: t("Activité, consignes et clarification", "Activities, instructions and clarification", "Actividad, instrucciones y aclaración"),
    production: t("Écris à un partenaire inventé : décris ton activité, donne deux étapes d’un travail et demande une clarification sur un fichier ou une date limite.", "Write to a fictional partner: describe your activity, give two task steps and ask for clarification about a file or deadline.", "Escribe a un compañero inventado: describe tu actividad, da dos pasos de una tarea y pide aclarar un archivo o un plazo."),
    model: "Trabajo desde casa hoy. Primero escribe tu nombre y después guarda los cambios. No veo el archivo adjunto. ¿Puedes enviarlo otra vez antes del jueves?",
    culture: { title: t("Confirmer la tâche", "Confirm the task", "Confirmar la tarea"), body: t("Pour rendre un échange utile, vérifie l’objet demandé, l’action et la date. Une formule polie ne remplace pas ces détails. Le mini-scénario permet de s’entraîner à demander une clarification précise.", "To make an exchange useful, check the requested item, action and date. Polite wording does not replace those details. The short scene lets you practise a precise clarification request.", "Para que el intercambio sea útil, comprueba objeto, acción y fecha. Una fórmula cortés no sustituye esos datos. La escena breve permite practicar una aclaración concreta."), sourceIds: [] },
  },
  {
    title: t("Construire une journée commune", "Plan a shared day", "Organizar un día compartido"),
    subtitle: t("Routine, goûts et météo", "Routines, interests and weather", "Rutina, gustos y tiempo"),
    production: t("Décris une habitude et une exception aujourd’hui. Choisis une sortie qui tient compte de deux goûts et d’une condition météo fictive.", "Describe a habit and today’s exception. Choose an outing that considers two people’s interests and fictional weather.", "Describe un hábito y una excepción de hoy. Elige una salida que considere los gustos de dos personas y un tiempo ficticio."),
    model: "Normalmente camino por el parque, pero hoy está lloviendo. A mí me gustan los museos y a Nora también. Si llueve, vamos a una exposición.",
    culture: { title: t("Si n’est pas sí", "Si is not sí", "Si no es sí"), body: t("Si sans accent introduit une condition : si llueve. Sí avec accent est une réponse affirmative. Les deux mots peuvent se prononcer pareil mais ne remplissent pas le même rôle à l’écrit.", "Unaccented si introduces a condition: si llueve. Accented sí is an affirmative answer. The words may sound the same but have different roles in writing.", "Si sin tilde introduce una condición: si llueve. Sí con tilde es una respuesta afirmativa. Pueden sonar igual, pero cumplen funciones diferentes al escribir."), sourceIds: ["esf-rae-tilde"] },
  },
  {
    title: t("Raconter ce qui s’est passé", "Tell what happened", "Contar lo que pasó"),
    subtitle: t("Actions passées, problème et récit", "Past actions, problems and stories", "Acciones pasadas, problemas y relato"),
    production: t("Raconte une journée inventée en trois ou quatre étapes. Ajoute un problème résolu et ton moment préféré. Utilise au moins deux formes du passé étudiées.", "Tell a fictional day in three or four steps. Include a resolved problem and your favourite moment. Use at least two past forms from the unit.", "Cuenta un día inventado en tres o cuatro pasos. Añade un problema resuelto y tu mejor momento. Usa al menos dos formas pasadas de la unidad."),
    model: "Ayer fui al centro. Primero visité el mercado y luego comí cerca del parque. Tuve un problema con el boleto, pero pedí ayuda. Lo mejor fue hablar con una vecina.",
    culture: { title: t("Relire les accents du récit", "Check the story’s accents", "Revisar las tildes del relato"), body: t("Relis les formes visité, compré, llegó et gustó sans retirer leurs accents. Vérifie aussi les mots monosyllabiques étudiés : fui s’écrit sans tilde. La correction écrite conserve ces différences.", "Review visité, compré, llegó and gustó without dropping their accents. Also check the one-syllable forms studied: fui has no accent. Written checking preserves these distinctions.", "Revisa visité, compré, llegó y gustó sin quitar sus tildes. Comprueba también los monosílabos estudiados: fui se escribe sin tilde. La corrección escrita conserva estas diferencias."), sourceIds: ["esf-rae-tilde"] },
  },
  {
    title: t("Garder le cap quand le plan change", "Keep a plan working through change", "Mantener el plan ante un cambio"),
    subtitle: t("Projet, contraintes et échange complet", "Plans, constraints and a full exchange", "Proyecto, condiciones e intercambio completo"),
    production: t("Prépare un voyage fictif avec un budget et une durée. Compare deux options, annonce un changement puis confirme jour, heure et lieu. Reprends une formulation d’une unité antérieure.", "Plan a fictional trip with a budget and duration. Compare two options, announce a change, then confirm day, time and place. Reuse wording from an earlier unit.", "Prepara un viaje ficticio con presupuesto y duración. Compara dos opciones, anuncia un cambio y confirma día, hora y lugar. Reutiliza una formulación de una unidad anterior."),
    model: "Vamos a viajar mañana y tenemos un presupuesto limitado. Es mejor ir en autobús porque cuesta menos. Necesito cambiar la reserva porque vamos a llegar tarde. Entonces, mañana a las diez, en el mismo lugar. ¿Puede confirmarlo por escrito?",
    culture: { title: t("Ce que ce parcours permet de pratiquer", "What this course lets you practise", "Lo que permite practicar este recorrido"), body: t("Le bilan réunit des tâches écrites de compréhension et d’application. Les dialogues et l’oral optionnel servent aussi à s’entraîner. Réussir ces exercices ne certifie pas un niveau du CECR et ne mesure pas à lui seul une conversation spontanée.", "The final combines written understanding and application tasks. Dialogues and optional speaking add practice. Passing these exercises does not certify a CEFR level or by itself measure spontaneous conversation.", "El balance reúne comprensión y aplicación escritas. Los diálogos y la práctica oral opcional también permiten entrenarse. Superar estos ejercicios no certifica un nivel del MCER ni mide por sí solo una conversación espontánea."), sourceIds: ["esf-cervantes-reference"] },
  },
];

const lessons = [...lessons01to04, ...lessons05to08, ...lessons09to12];
const checks = { ...checks01to06, ...checks07to12 };

export const spanishCourseUnits: CourseUnit[] = briefs.map((brief, index) => {
  const id = `u${String(index + 1).padStart(2, "0")}`;
  const group = lessons.slice(index * 3, index * 3 + 3);
  return {
    id, number: index + 1, title: brief.title, subtitle: brief.subtitle,
    objectives: group.map((item) => item.goal),
    lessons: group,
    quiz: {
      id: `esf-${id}-quiz`, title: t("Une autre situation à résoudre", "Solve another situation", "Resolver otra situación"),
      description: t("Six situations écrites nouvelles. Réutilise les repères de l’unité ; toute aide reste signalée. Aucun enregistrement n’est nécessaire pour ce bilan.", "Six new written situations. Apply the unit’s patterns; any assistance remains marked. No recording is needed for this assessment.", "Seis situaciones escritas nuevas. Aplica las pautas de la unidad; la ayuda sigue indicada. No necesitas una grabación para este balance."),
      unitIds: [id], questions: checks[id as keyof typeof checks], passPercent: 80,
    },
    production: {
      id: `esf-${id}-production`, title: t("Ton message, tes détails", "Your message, your details", "Tu mensaje, tus detalles"),
      prompt: brief.production, model: brief.model,
      rubric: [
        t("Mon message remplit les intentions demandées et reste compréhensible.", "My message fulfils the requested intentions and is understandable.", "Mi mensaje cumple las intenciones pedidas y se entiende."),
        t("J’ai changé des détails et vérifié les verbes, les petits mots et les accents.", "I changed details and checked verbs, connecting words and accents.", "Cambié detalles y revisé verbos, palabras de enlace y tildes."),
        t("Je compare au modèle pour m’entraîner ; cette production n’est pas une évaluation automatique de mon niveau.", "I compare with the model to practise; this production is not an automatic assessment of my level.", "Comparo con el modelo para practicar; esta producción no evalúa automáticamente mi nivel."),
      ],
    },
    culture: brief.culture,
  };
});

export const spanishCatalog: CourseCatalog = {
  units: spanishCourseUnits.map((unit) => ({
    id: unit.id, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.objectives,
    lessons: unit.lessons.map((item) => ({ id: item.id, title: item.title, activityIds: item.activities.map((activity) => activity.id) })),
    activityIds: unit.lessons.flatMap((item) => item.activities.map((activity) => activity.id)),
    quizId: unit.quiz.id, productionId: unit.production.id,
    phraseCount: unit.lessons.reduce((sum, item) => sum + item.vocabulary.length, 0),
  })),
  assessments: [...spanishCourseUnits.map((unit) => unit.quiz), spanishFinal].map((assessment) => ({
    id: assessment.id, title: assessment.title, unitIds: assessment.unitIds,
    questionCount: assessment.questions.length, passPercent: assessment.passPercent,
  })),
};

export const getSpanishUnit = (id: string) => spanishCourseUnits.find((unit) => unit.id === id);
