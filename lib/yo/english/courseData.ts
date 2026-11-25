import type { CourseCatalog, CourseSource, CourseUnit, LocaleText } from "../italian/course/courseTypes";
import { t } from "./authoring";
import { questions01to06 } from "./assessments01to06";
import { questions07to12 } from "./assessments07to12";
import { englishFinal } from "./finalAssessment";
import { lessons01to02 } from "./lessons01to02";
import { lessons03to04 } from "./lessons03to04";
import { lessons05to06 } from "./lessons05to06";
import { lessons07to08 } from "./lessons07to08";
import { lessons09to10 } from "./lessons09to10";
import { lessons11to12 } from "./lessons11to12";

export { englishFinal };

/** These references support language notes and scope statements, not copied course exercises. */
export const englishSources: CourseSource[] = [
  {
    id: "enf-canadian-spelling", title: "Spelling: international variations", publisher: "Language Portal of Canada — Translation Bureau",
    url: "https://our-languages.canada.ca/en/writing-tips-plus/spelling-international-variations",
    supports: t("Variantes orthographiques et cohérence éditoriale en anglais canadien; les modèles ne rendent pas les variantes américaines incorrectes par principe.", "Spelling variation and editorial consistency in Canadian English; model spellings do not make American variants inherently incorrect.", "Variación ortográfica y coherencia editorial en inglés canadiense; los modelos no convierten las variantes estadounidenses en errores por principio."),
  },
  {
    id: "enf-present-simple", title: "Present simple", publisher: "British Council — LearnEnglish",
    url: "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple",
    supports: t("Présent des habitudes, troisième personne, questions avec do/does et négations.", "Habits in the present, third-person forms, do/does questions and negatives.", "Hábitos en presente, formas de tercera persona, preguntas con do/does y negaciones."),
  },
  {
    id: "enf-questions", title: "Question forms", publisher: "British Council — LearnEnglish",
    url: "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/question-forms",
    supports: t("Formation des questions avec be, les modaux et do/does/did; les dialogues sont des créations originales.", "Question formation with be, modals and do/does/did; the dialogues are original creations.", "Formación de preguntas con be, modales y do/does/did; los diálogos son creaciones originales."),
  },
  {
    id: "enf-past-simple", title: "Past simple", publisher: "British Council — LearnEnglish",
    url: "https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/past-simple",
    supports: t("Passé régulier et formes irrégulières utilisées; questions et négations avec did.", "Regular past and the irregular forms used; questions and negatives with did.", "Pasado regular y formas irregulares utilizadas; preguntas y negaciones con did."),
  },
  {
    id: "enf-future-plans", title: "Future forms: will, be going to and present continuous", publisher: "British Council — LearnEnglish",
    url: "https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/future-forms-will-be-going-present-continuous",
    supports: t("Distinction entre intention, décision et arrangement. La référence ne confère pas son étiquette de niveau à ce parcours.", "Distinction between intention, decision and arrangement. The reference's level label does not certify this course.", "Distinción entre intención, decisión y acuerdo. La etiqueta de nivel de la referencia no certifica este curso."),
  },
  {
    id: "enf-clb-scope", title: "Understanding the Canadian Language Benchmarks", publisher: "Immigration, Refugees and Citizenship Canada",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/video/canadian-language-benchmarks.html",
    supports: t("Les compétences de lecture, d’écriture, d’écoute et d’expression orale sont distinctes. Les 12 unités de YoPratiqo ne correspondent pas aux 12 niveaux CLB et ne constituent pas une certification.", "Reading, writing, listening and speaking abilities are distinct. YoPratiqo's 12 units do not map to the 12 CLB levels and are not a certification.", "Las competencias de lectura, escritura, escucha y expresión oral son distintas. Las 12 unidades de YoPratiqo no corresponden a los 12 niveles CLB ni constituyen una certificación."),
  },
];

type UnitPlan = {
  title: LocaleText;
  subtitle: LocaleText;
  production: { prompt: LocaleText; model: string; checks: [LocaleText, LocaleText, LocaleText] };
  culture: CourseUnit["culture"];
};

const plans: UnitPlan[] = [
  {
    title: t("Premières rencontres", "First meetings", "Primeros encuentros"),
    subtitle: t("Un nom, une origine et le droit de faire répéter", "A name, an origin and a request to repeat", "Un nombre, un origen y pedir que repitan"),
    production: {
      prompt: t("Au club de conversation, présente un personnage fictif en trois phrases : son nom, son origine et son lieu de vie. Ajoute une demande de répétition si nécessaire.", "At the conversation club, introduce a fictional character in three sentences: name, origin and current home. Add a request to repeat when needed.", "En el club de conversación, presenta a un personaje ficticio en tres frases: nombre, origen y residencia actual. Añade una petición de repetición si hace falta."),
      model: "My name is Sam. I'm from Ottawa. I live in Toronto. Could you say that again, please?",
      checks: [t("Je donne un nom sans donnée personnelle obligatoire.", "I give a name without requiring personal information.", "Doy un nombre sin exigir datos personales."), t("Je distingue l’origine et le lieu de vie.", "I distinguish origin from current home.", "Distingo el origen de la residencia actual."), t("Je peux demander une clarification.", "I can request clarification.", "Puedo pedir una aclaración.")],
    },
    culture: { title: t("Des personnes, pas des portraits types", "People, not stereotypes", "Personas, no estereotipos"), body: t("Alex, Maya et Sam sont des personnages fictifs situés à Toronto, Ottawa ou Montréal. Leurs origines et leurs langues ne décrivent pas tous les habitants. Tu peux inventer les détails de ton propre personnage.", "Alex, Maya and Sam are fictional characters in Toronto, Ottawa or Montreal. Their origins and languages do not describe every resident. You can invent your own character's details.", "Alex, Maya y Sam son personajes ficticios en Toronto, Ottawa o Montreal. Sus orígenes e idiomas no describen a todos los habitantes. Puedes inventar los datos de tu propio personaje."), sourceIds: [] },
  },
  {
    title: t("Une pause au café", "A café break", "Una pausa en el café"),
    subtitle: t("Commander, préciser et vérifier", "Order, specify and check", "Pedir, precisar y comprobar"),
    production: {
      prompt: t("Commande une boisson, précise sur place ou à emporter et demande un moyen de paiement. Ajoute une préférence claire, sans inventer la réponse du serveur.", "Order a drink, specify on site or takeaway and ask about a payment method. Add a clear preference without inventing the server's reply.", "Pide una bebida, indica si es para tomar allí o llevar y pregunta por un medio de pago. Añade una preferencia clara sin inventar la respuesta del camarero."),
      model: "I'd like a small tea, please. To go, please. No milk, please. Can I pay by card?",
      checks: [t("Ma commande précise la boisson et le lieu de consommation.", "My order identifies the drink and where I will consume it.", "Mi pedido precisa la bebida y dónde la tomaré."), t("Ma préférence conserve la négation ou without si nécessaire.", "My preference keeps the negative or without where needed.", "Mi preferencia conserva la negación o without cuando hace falta."), t("Je distingue une question d’une information confirmée.", "I distinguish a question from confirmed information.", "Distingo una pregunta de un dato confirmado.")],
    },
    culture: { title: t("Une commande à confirmer", "An order to confirm", "Un pedido por confirmar"), body: t("Les cafés et les prix de ces scènes sont fictifs. Let me check laisse une information en attente de vérification. Dans la scène, demander le contenu d’une boisson n’en confirme pas les ingrédients.", "The cafés and prices in these scenes are fictional. Let me check leaves information awaiting verification. In the scene, asking about a drink's contents does not confirm its ingredients.", "Los cafés y precios de estas escenas son ficticios. Let me check deja un dato pendiente de comprobación. En la escena, preguntar por el contenido de una bebida no confirma sus ingredientes."), sourceIds: [] },
  },
  {
    title: t("Se repérer en ville", "Finding your way in town", "Orientarse en la ciudad"),
    subtitle: t("Repères, itinéraire et horaires", "Landmarks, a route and opening times", "Referencias, ruta y horarios"),
    production: {
      prompt: t("Sur un plan inventé, indique le lieu recherché et donne deux étapes pour y arriver. Termine par une question sur l’heure d’ouverture.", "On an invented map, identify the destination and give two steps to reach it. Finish with a question about opening time.", "En un mapa inventado, identifica el destino y da dos pasos para llegar. Termina con una pregunta sobre la hora de apertura."),
      model: "The library is next to the park. Go straight. Turn left at the lights. What time does it open?",
      checks: [t("Le lieu et le repère sont identifiables.", "The destination and landmark can be identified.", "Se identifican el destino y la referencia."), t("L’ordre des directions est clair.", "The order of directions is clear.", "El orden de las indicaciones es claro."), t("Je n’invente pas un horaire réel.", "I do not invent an actual opening time.", "No invento un horario real.")],
    },
    culture: { title: t("Lire une relation spatiale", "Reading a spatial relationship", "Leer una relación espacial"), body: t("Les rues et les plans servent à pratiquer next to, across from et at. Ils ne donnent pas d’itinéraire réel dans les villes nommées. Montrer un plan et demander une confirmation font partie de la mission.", "Streets and maps provide practice with next to, across from and at. They do not give real routes in the named cities. Showing a map and asking for confirmation are part of the task.", "Las calles y mapas sirven para practicar next to, across from y at. No dan rutas reales en las ciudades citadas. Mostrar un mapa y pedir confirmación forman parte de la tarea."), sourceIds: [] },
  },
  {
    title: t("L’heure et le trajet", "Time and travel", "La hora y el trayecto"),
    subtitle: t("Choisir, attendre et revoir son programme", "Choose, wait and revise your plans", "Elegir, esperar y cambiar el plan"),
    production: {
      prompt: t("Prépare un trajet fictif : demande un billet pour une ville, précise aller simple, vérifie le quai et demande quand arrive le prochain bus si ton programme change.", "Prepare a fictional journey: request a ticket to a city, specify one-way, check the platform and ask when the next bus arrives if your plan changes.", "Prepara un trayecto ficticio: pide un billete a una ciudad, precisa que es de ida, comprueba el andén y pregunta cuándo llega el próximo autobús si cambia tu plan."),
      model: "I'd like a ticket to Ottawa. One-way, please. Which platform? When is the next bus?",
      checks: [t("Je donne une destination.", "I give a destination.", "Doy un destino."), t("Je distingue l’heure précise et le temps d’attente.", "I distinguish a clock time from a waiting interval.", "Distingo una hora concreta de un tiempo de espera."), t("Je peux redemander une information de trajet.", "I can ask again for travel information.", "Puedo volver a pedir información del trayecto.")],
    },
    culture: { title: t("Des horaires d’exercice", "Exercise timetables", "Horarios de práctica"), body: t("Les billets, quais et retards sont inventés. At ten indique une heure; in ten minutes indique une durée avant un événement. Les confondre changerait le rendez-vous, même avec les mêmes nombres.", "Tickets, platforms and delays are invented. At ten gives a clock time; in ten minutes gives an interval before an event. Confusing them changes the arrangement even when the numbers match.", "Los billetes, andenes y retrasos son inventados. At ten indica una hora e in ten minutes un intervalo antes de un suceso. Confundirlos cambia el acuerdo aunque coincidan los números."), sourceIds: [] },
  },
  {
    title: t("Poser ses valises", "Settling in", "Instalarse"),
    subtitle: t("Réservation, chambre et demande d’aide", "Booking, room and a request for help", "Reserva, habitación y petición de ayuda"),
    production: {
      prompt: t("À une réception fictive, annonce le nom de réservation et la durée. Puis signale un problème simple dans la chambre et formule une demande utile.", "At a fictional reception desk, give a booking name and duration. Then report a simple room problem and make a useful request.", "En una recepción ficticia, da el nombre de la reserva y la duración. Después informa de un problema sencillo en la habitación y formula una petición útil."),
      model: "I have a reservation for two nights. It's under the name Alex Martin. The room is too cold. Could you help me with the heater?",
      checks: [t("Le nom de réservation peut être inventé.", "The booking name can be fictional.", "El nombre de la reserva puede ser ficticio."), t("Je sépare durée, étage et heure.", "I separate duration, floor and time.", "Separo duración, piso y hora."), t("Ma demande répond au problème décrit.", "My request addresses the problem described.", "Mi petición responde al problema descrito.")],
    },
    culture: { title: t("Une demande concrète", "A specific request", "Una petición concreta"), body: t("La mission consiste à expliquer un besoin sans supposer la politique d’un hébergement. Les noms, inclusions et conditions des scènes sont inventés. Une question sur breakfast ou check-out attend une réponse.", "The task is to explain a need without assuming an accommodation policy. Names, inclusions and conditions in the scenes are invented. A question about breakfast or check-out still needs a reply.", "La tarea consiste en explicar una necesidad sin suponer la política de un alojamiento. Los nombres, inclusiones y condiciones son inventados. Una pregunta sobre breakfast o check-out todavía necesita respuesta."), sourceIds: [] },
  },
  {
    title: t("Une journée habituelle", "An ordinary day", "Un día habitual"),
    subtitle: t("Routines, questions et fréquence", "Routines, questions and frequency", "Rutinas, preguntas y frecuencia"),
    production: {
      prompt: t("Décris une journée de ton personnage avec deux heures et une fréquence. Pose ensuite une question à un partenaire sur son habitude.", "Describe your character's day with two times and one frequency. Then ask a partner about a habit.", "Describe el día de tu personaje con dos horas y una frecuencia. Luego pregunta a un compañero por una costumbre."),
      model: "I start work at nine. I have lunch at noon. I practise twice a week. Do you study in the evening?",
      checks: [t("Je distingue les habitudes et l’exception d’aujourd’hui.", "I distinguish habits from today's exception.", "Distingo las costumbres de la excepción de hoy."), t("J’utilise do ou does selon le sujet.", "I use do or does according to the subject.", "Uso do o does según el sujeto."), t("La fréquence correspond à ce que je veux dire.", "The frequency matches my intended meaning.", "La frecuencia coincide con lo que quiero decir.")],
    },
    culture: { title: t("Des rythmes différents", "Different routines", "Ritmos distintos"), body: t("Les horaires de Maya et de Sam sont propres aux personnages; ils ne décrivent pas une journée canadienne unique. La pratique peut se planifier à son rythme. Ce parcours ne demande pas de série quotidienne.", "Maya's and Sam's schedules belong to their characters; they do not define one Canadian routine. Practice can fit your own pace. This course does not require a daily streak.", "Los horarios de Maya y Sam pertenecen a sus personajes; no definen una única rutina canadiense. Puedes practicar a tu ritmo. Este curso no exige una racha diaria."), sourceIds: ["enf-present-simple"] },
  },
  {
    title: t("Des liens et des intérêts", "Connections and interests", "Vínculos e intereses"),
    subtitle: t("Présenter, préférer et inviter", "Introduce, prefer and invite", "Presentar, preferir e invitar"),
    production: {
      prompt: t("Présente un ami fictif, donne un intérêt et invite quelqu’un à une activité. Prépare aussi une réponse polie si le jour proposé ne convient pas.", "Introduce a fictional friend, give an interest and invite someone to an activity. Also prepare a polite reply if the suggested day is unsuitable.", "Presenta a un amigo ficticio, menciona un interés e invita a alguien a una actividad. Prepara también una respuesta cortés si el día propuesto no conviene."),
      model: "This is my friend Maya. I like reading in the park. Would you like to join us? Sorry, I can't. How about Saturday?",
      checks: [t("Les personnes et les possessions sont claires.", "People and ownership are clear.", "Las personas y la posesión quedan claras."), t("La préférence est personnelle, sans généralisation.", "The preference is personal, without generalisation.", "La preferencia es personal, sin generalización."), t("Le refus ne devient pas une acceptation par erreur.", "The refusal does not accidentally become an acceptance.", "El rechazo no se convierte por error en aceptación.")],
    },
    culture: { title: t("Inviter laisse un choix", "An invitation leaves a choice", "Una invitación deja elegir"), body: t("Dans ces dialogues, une personne peut accepter, refuser ou proposer une autre date. Maybe another time ne confirme aucune nouvelle date. Les relations et loisirs décrits restent des choix de personnages.", "In these dialogues, a person can accept, decline or suggest another date. Maybe another time does not confirm a new date. The relationships and hobbies described remain character choices.", "En estos diálogos, una persona puede aceptar, rechazar o proponer otra fecha. Maybe another time no confirma una nueva fecha. Las relaciones y aficiones siguen siendo elecciones de los personajes."), sourceIds: [] },
  },
  {
    title: t("Choisir au marché et en boutique", "Choosing at a market or shop", "Elegir en el mercado y la tienda"),
    subtitle: t("Quantité, taille et comparaison", "Quantity, size and comparison", "Cantidad, talla y comparación"),
    production: {
      prompt: t("Choisis une scène : au marché, demande deux produits avec des quantités; en boutique, demande une taille puis compare deux options. Explique le détail qui décide ton choix.", "Choose a scene: at a market, request two products with quantities; in a shop, ask for a size and compare two options. Explain the detail that decides your choice.", "Elige una escena: en el mercado, pide dos productos con cantidades; en una tienda, pide una talla y compara dos opciones. Explica qué detalle decide tu elección."),
      model: "Can I see the other one? This bag is cheaper than that one. I prefer it because it's lighter. I'll take this one.",
      checks: [t("La quantité ou la taille est précise.", "The quantity or size is specific.", "La cantidad o talla es concreta."), t("La comparaison garde les deux objets dans le bon ordre.", "The comparison keeps both items in the correct order.", "La comparación mantiene los dos objetos en el orden correcto."), t("Je donne une raison, ou je garde le choix ouvert.", "I give a reason or leave the choice open.", "Doy una razón o dejo abierta la elección.")],
    },
    culture: { title: t("Des variantes d’orthographe", "Spelling variants", "Variantes ortográficas"), body: t("Les modèles emploient notamment colour et neighbours. Les graphies varient dans les usages anglophones; elles ne changent pas à elles seules le sens d’une couleur ou d’une relation. Les questions de rappel acceptent les variantes indiquées dans leur correction.", "Models include spellings such as colour and neighbours. Spellings vary across English usage; that alone does not change the meaning of a colour or relationship. Recall questions accept the variants identified in their correction.", "Los modelos incluyen grafías como colour y neighbours. La ortografía varía en los usos del inglés; eso por sí solo no cambia el significado de un color o una relación. Las preguntas de recuerdo aceptan las variantes indicadas en su corrección."), sourceIds: ["enf-canadian-spelling"] },
  },
  {
    title: t("Apprendre et travailler ensemble", "Learning and working together", "Aprender y trabajar juntos"),
    subtitle: t("Capacités, consignes et messages", "Abilities, instructions and messages", "Capacidades, instrucciones y mensajes"),
    production: {
      prompt: t("Dans une équipe fictive, précise une capacité et une tâche à apprendre. Demande une clarification sur un fichier et son échéance. Tu peux écrire un court message pour une personne absente.", "In a fictional team, state an ability and a task you need to learn. Ask for clarification about a file and its deadline. You can write a short message for an absent person.", "En un equipo ficticio, indica una capacidad y una tarea que debes aprender. Pide aclarar un archivo y su plazo. Puedes escribir un mensaje breve para una persona ausente."),
      model: "I can help with the schedule. I can't use this program yet. Which file do you mean? When do you need it?",
      checks: [t("Can et can't conservent le sens voulu.", "Can and can't preserve the intended meaning.", "Can y can't conservan el sentido deseado."), t("Je vérifie l’ordre ou l’échéance plutôt que de les deviner.", "I check the order or deadline instead of guessing.", "Compruebo el orden o el plazo en vez de adivinar."), t("Je distingue une activité actuelle d’une habitude.", "I distinguish a current activity from a habit.", "Distingo una actividad actual de una costumbre.")],
    },
    culture: { title: t("Clarifier avant d’agir", "Clarify before acting", "Aclarar antes de actuar"), body: t("Les tâches de bureau sont fictives et sans procédure technique réelle. Répéter une consigne ou demander une version écrite permet, dans la scène, de vérifier l’ordre, le fichier et le délai. Ces échanges ne prétendent pas décrire tous les milieux de travail.", "Office tasks are fictional and contain no actual technical procedure. Repeating an instruction or requesting it in writing checks the order, file and deadline in the scene. These exchanges do not claim to describe every workplace.", "Las tareas de oficina son ficticias y no contienen un procedimiento técnico real. Repetir una instrucción o pedirla por escrito permite comprobar el orden, el archivo y el plazo. Los intercambios no pretenden describir todos los lugares de trabajo."), sourceIds: ["enf-questions"] },
  },
  {
    title: t("Raconter hier", "Talking about yesterday", "Contar lo de ayer"),
    subtitle: t("Lieux, actions et chronologie", "Places, actions and sequence", "Lugares, acciones y secuencia"),
    production: {
      prompt: t("Raconte une sortie fictive en trois étapes passées. Ajoute une action qui n’a pas eu lieu, puis demande à un partenaire ce qu’il a fait.", "Describe a fictional outing in three past steps. Add an action that did not happen, then ask a partner what they did.", "Cuenta una salida ficticia en tres pasos pasados. Añade una acción que no ocurrió y pregunta a un compañero qué hizo."),
      model: "First, we went to the station. Then, we had lunch. We came home at six. I didn't visit the gallery. Did you enjoy the visit?",
      checks: [t("Je distingue was/were des verbes d’action.", "I distinguish was/were from action verbs.", "Distingo was/were de los verbos de acción."), t("Le verbe reste à la base après did ou didn't.", "The verb stays in its base form after did or didn't.", "El verbo queda en la forma base después de did o didn't."), t("Les marqueurs rendent la chronologie compréhensible.", "Sequence markers make the order understandable.", "Los marcadores permiten comprender la secuencia.")],
    },
    culture: { title: t("Raconter sans ajouter de faits", "Retell without adding facts", "Relatar sin añadir hechos"), body: t("Un récit de sortie distingue ce qui s’est produit et ce qui ne s’est pas produit. Les personnages peuvent raconter la même journée depuis leur propre point de vue. Le bilan vérifie les faits du texte, sans demander de connaître un musée réel.", "An account distinguishes what happened from what did not happen. Characters can describe the same day from their own perspective. The review checks the text's facts without requiring knowledge of an actual museum.", "Un relato distingue lo que ocurrió de lo que no ocurrió. Los personajes pueden contar el mismo día desde su perspectiva. El balance comprueba los hechos del texto sin exigir conocer un museo real."), sourceIds: ["enf-past-simple"] },
  },
  {
    title: t("Prévoir et s’adapter", "Planning and adapting", "Planear y adaptarse"),
    subtitle: t("Intention, météo et rendez-vous", "Intention, weather and appointments", "Intención, tiempo y citas"),
    production: {
      prompt: t("Propose une sortie future, un moyen de transport et une option en cas de pluie. Demande ensuite de confirmer le jour ou l’heure, sans annoncer une réservation inexistante.", "Propose a future outing, a way to travel and an option for rain. Then ask to confirm the day or time without claiming a nonexistent booking.", "Propón una salida futura, un transporte y una opción por si llueve. Después pide confirmar el día o la hora sin afirmar una reserva inexistente."),
      model: "We're going to take the train. If it rains, we can visit the museum. Would Friday work for you? Could you confirm the time?",
      checks: [t("Le projet et la condition sont identifiables.", "The plan and condition can be identified.", "Se identifican el plan y la condición."), t("Je distingue une suggestion et un accord.", "I distinguish a suggestion from an agreement.", "Distingo una sugerencia de un acuerdo."), t("Je vérifie le jour et l’heure après un changement.", "I check the day and time after a change.", "Compruebo el día y la hora después de un cambio.")],
    },
    culture: { title: t("Un plan peut encore changer", "A plan can still change", "Un plan aún puede cambiar"), body: t("Les prévisions et voyages de la mission sont inventés. Going to présente ici une intention; un lieu, une heure et une réponse explicite donnent davantage de précision à un arrangement. Le contexte compte autant que la forme du verbe.", "The mission's forecasts and journeys are invented. Going to expresses an intention here; a place, a time and an explicit reply give an arrangement more detail. Context matters as well as the verb form.", "Los pronósticos y viajes de la misión son inventados. Going to expresa aquí una intención; un lugar, una hora y una respuesta explícita dan más detalle a un acuerdo. El contexto importa además de la forma verbal."), sourceIds: ["enf-future-plans"] },
  },
  {
    title: t("Relier les situations", "Connecting the situations", "Conectar las situaciones"),
    subtitle: t("Arrivée, changement et message de suivi", "Arrival, change and a follow-up message", "Llegada, cambio y mensaje de seguimiento"),
    production: {
      prompt: t("Écris un message de quatre ou cinq phrases : rappelle un voyage passé, confirme un détail d’arrivée, explique un changement et remercie. Termine par une question dont tu attends réellement la réponse.", "Write a four- or five-sentence message: recall a past trip, confirm an arrival detail, explain a change and give thanks. End with a question whose answer is still needed.", "Escribe un mensaje de cuatro o cinco frases: recuerda un viaje pasado, confirma un detalle de llegada, explica un cambio y agradece. Termina con una pregunta cuya respuesta aún falta."),
      model: "I visited Ottawa and met a friend. We're arriving at six this evening. I'm late because the train is delayed. Thanks again for your help. Could you confirm the reservation?",
      checks: [t("Je sépare passé, situation actuelle et prochaine étape.", "I separate the past, current situation and next step.", "Separo el pasado, la situación actual y el paso siguiente."), t("Les nombres conservent leur rôle : personnes, nuits ou heure.", "Numbers keep their roles: people, nights or time.", "Los números conservan su función: personas, noches u hora."), t("Je peux nommer ce qui reste à pratiquer sans inventer un niveau.", "I can name what still needs practice without claiming a level.", "Puedo nombrar lo que falta practicar sin atribuirme un nivel."),],
    },
    culture: { title: t("Un bilan délimité", "A review with a defined scope", "Un balance de alcance definido"), body: t("Les 12 unités sont une organisation pédagogique, pas les 12 niveaux CLB. Le bilan final vérifie la lecture et des formulations écrites dans ces situations. Il ne valide pas à lui seul l’écoute, la prononciation ou une interaction spontanée.", "The 12 units organise the learning material; they are not the 12 CLB levels. The final review checks reading and written wording in these situations. It does not independently validate listening, pronunciation or spontaneous interaction.", "Las 12 unidades organizan el material; no son los 12 niveles CLB. El balance final comprueba la lectura y la formulación escrita en estas situaciones. No valida por sí solo la escucha, la pronunciación ni la interacción espontánea."), sourceIds: ["enf-clb-scope"] },
  },
];

const lessons = [...lessons01to02, ...lessons03to04, ...lessons05to06, ...lessons07to08, ...lessons09to10, ...lessons11to12];
const unitQuestions = { ...questions01to06, ...questions07to12 };

export const englishCourseUnits: CourseUnit[] = plans.map((plan, index) => {
  const id = `u${String(index + 1).padStart(2, "0")}` as keyof typeof unitQuestions;
  const group = lessons.slice(index * 3, index * 3 + 3);
  return {
    id, number: index + 1, title: plan.title, subtitle: plan.subtitle,
    objectives: group.map(lesson => lesson.goal),
    lessons: group,
    quiz: {
      id: `enf-${id}-quiz`, title: t("Le point d’étape écrit", "Written checkpoint", "Punto de control escrito"),
      description: t("Six nouvelles situations écrites réutilisent les expressions de cette unité. Le premier essai indépendant compte pour le bilan. L’aide reste accessible et sera indiquée. Ce bilan ne mesure pas l’écoute.", "Six new written situations reuse this unit's expressions. The first independent attempt counts toward the review. Help remains available and is identified. This checkpoint does not measure listening.", "Seis situaciones escritas nuevas reutilizan las expresiones de la unidad. El primer intento independiente cuenta para el balance. La ayuda sigue disponible y se indica. Este balance no mide la escucha."),
      unitIds: [id], passPercent: 80,
      questions: unitQuestions[id].map(question => ({ ...question, taughtInUnitId: id })),
    },
    production: {
      id: `enf-${id}-production`, title: t("Une scène à toi", "Make the scene yours", "Una escena tuya"),
      prompt: plan.production.prompt, model: plan.production.model, rubric: plan.production.checks,
    },
    culture: plan.culture,
  };
});

export const englishCatalog: CourseCatalog = {
  units: englishCourseUnits.map(unit => ({
    id: unit.id, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.objectives,
    lessons: unit.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, activityIds: lesson.activities.map(activity => activity.id) })),
    activityIds: unit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id)),
    quizId: unit.quiz.id, productionId: unit.production.id,
    phraseCount: unit.lessons.reduce((count, lesson) => count + lesson.vocabulary.length, 0),
  })),
  assessments: [...englishCourseUnits.map(unit => unit.quiz), englishFinal].map(assessment => ({
    id: assessment.id, title: assessment.title, unitIds: assessment.unitIds,
    questionCount: assessment.questions.length, passPercent: assessment.passPercent,
  })),
};

export const getEnglishUnit = (id: string) => englishCourseUnits.find(unit => unit.id === id);
