import { choice, option, phrase, recall, t } from "./courseAuthoring";
import type { CourseAssessment, CourseMission } from "./courseTypes";

/** Story presentation for the existing five-question quiz; no answer or scoring changes. */
export const italianFirstMission: CourseMission = {
  title: t(
    "Première soirée à Bologne",
    "Your first evening in Bologna",
    "Tu primera noche en Bolonia",
  ),
  briefing: t(
    "Accompagne Yoppo pendant une soirée fictive à Bologne, du café au coucher. Cinq scènes reprennent les outils de l’unité : prendre congé, reconnaître une consigne, relier des lettres à des sons et demander une répétition. Une correction t’accompagne après chaque réponse.",
    "Join Yoppo for a fictional evening in Bologna, from leaving the café to bedtime. Five scenes revisit this unit’s tools: taking leave, recognising an instruction, connecting letters with sounds and asking for repetition. You will see feedback after each answer.",
    "Acompaña a Yoppo en una noche ficticia en Bolonia, desde la salida del café hasta la hora de dormir. Cinco escenas retoman las herramientas de la unidad: despedirse, reconocer una instrucción, relacionar letras y sonidos y pedir una repetición. Verás una corrección después de cada respuesta.",
  ),
  success: t(
    "Tu as atteint l’objectif de cette mission sans aide affichée. La prochaine étape du parcours, « Qui es-tu ? », t’invite à apprendre comment te présenter.",
    "You reached this mission’s target without displayed help. The next stage of your journey, “Who are you?”, introduces ways to present yourself.",
    "Has alcanzado el objetivo de esta misión sin ayuda mostrada. La siguiente etapa del recorrido, «¿Quién eres?», te invita a aprender a presentarte.",
  ),
  retry: t(
    "Cette tentative t’indique les points à revoir. Reprends les corrections et les leçons concernées, puis rejoue la mission à ton rythme.",
    "This attempt shows you what to review. Revisit the feedback and the relevant lessons, then replay the mission at your own pace.",
    "Este intento te muestra qué repasar. Revisa las correcciones y las lecciones correspondientes y vuelve a jugar la misión a tu ritmo.",
  ),
  assisted: t(
    "Tu as terminé la mission avec de l’aide. Reprends les formulations qui t’ont servi, puis essaie une nouvelle fois sans aide affichée.",
    "You finished the mission with help. Revisit the expressions that helped you, then try again without displayed help.",
    "Has terminado la misión con ayuda. Repasa las expresiones que te han servido e inténtalo otra vez sin ayuda mostrada.",
  ),
  scenes: {
    "it1-u01-q1": {
      title: t("Au seuil du café", "Leaving the café", "Al salir del café"),
      character: t("Le serveur", "The server", "El camarero"),
      setting: t(
        "Ton arrêt au café se termine. Yoppo t’attend sous les portiques ; tu quittes une personne que tu connais peu.",
        "Your café stop is ending. Yoppo is waiting beneath the porticoes; you are leaving someone you do not know well.",
        "Tu parada en el café termina. Yoppo te espera bajo los pórticos; te despides de una persona que conoces poco.",
      ),
      success: t(
        "Tu termines l’échange avec une formule adaptée au départ. Tu rejoins Yoppo sous les portiques.",
        "You end the exchange with a fitting farewell. You join Yoppo beneath the porticoes.",
        "Terminas el intercambio con una despedida adecuada. Te reúnes con Yoppo bajo los pórticos.",
      ),
      recovery: t(
        "Pour ce départ, revois la formule proposée dans la correction. Yoppo reste avec toi pour la suite de la promenade.",
        "For this farewell, review the expression shown in the feedback. Yoppo stays with you for the rest of the walk.",
        "Para esta despedida, repasa la expresión de la corrección. Yoppo sigue contigo durante el paseo.",
      ),
    },
    "it1-u01-q2": {
      title: t("Une consigne de Yoppo", "Yoppo’s instruction", "La indicación de Yoppo"),
      character: t("Yoppo", "Yoppo", "Yoppo"),
      setting: t(
        "Sur une petite place, Yoppo te propose un jeu. Écoute ce qu’il te demande avant de choisir.",
        "In a small square, Yoppo suggests a game. Listen to what he asks before choosing.",
        "En una pequeña plaza, Yoppo te propone un juego. Escucha lo que te pide antes de elegir.",
      ),
      success: t(
        "Tu as reconnu la consigne. Le petit jeu de mots de Yoppo peut commencer.",
        "You recognised the instruction. Yoppo’s little word game can begin.",
        "Has reconocido la instrucción. El pequeño juego de palabras de Yoppo puede empezar.",
      ),
      recovery: t(
        "La correction indique l’action demandée. Garde ce repère avant de poursuivre le jeu avec Yoppo.",
        "The feedback identifies the requested action. Keep that in mind as you continue the game with Yoppo.",
        "La corrección indica la acción solicitada. Tenla en cuenta al continuar el juego con Yoppo.",
      ),
    },
    "it1-u01-q3": {
      title: t("Le jeu des mots", "A word puzzle", "El juego de palabras"),
      character: t("Yoppo", "Yoppo", "Yoppo"),
      setting: t(
        "Sous une arche, Yoppo aligne trois mots de la leçon. Cherche le groupe de lettres demandé pour poursuivre le jeu.",
        "Beneath an arch, Yoppo lays out three words from the lesson. Find the requested letter group to continue the game.",
        "Bajo un arco, Yoppo coloca tres palabras de la lección. Busca el grupo de letras indicado para continuar el juego.",
      ),
      success: t(
        "Tu as reconnu le groupe de lettres étudié. Le petit jeu est résolu ; vous reprenez la promenade vers votre lieu de séjour.",
        "You recognised the letter group you studied. The puzzle is solved; you resume the walk towards the place where you are staying.",
        "Has reconocido el grupo de letras estudiado. El juego está resuelto; continuáis el paseo hacia vuestro alojamiento.",
      ),
      recovery: t(
        "Compare les trois mots à la correction. Yoppo t’aide à repérer le groupe de lettres avant de reprendre la promenade.",
        "Compare the three words with the feedback. Yoppo helps you notice the letter group before you resume the walk.",
        "Compara las tres palabras con la corrección. Yoppo te ayuda a reconocer el grupo de letras antes de continuar el paseo.",
      ),
    },
    "it1-u01-q4": {
      title: t("À l’accueil", "At reception", "En recepción"),
      character: t("La personne qui vous accueille", "Your host", "La persona que os recibe"),
      setting: t(
        "À votre lieu de séjour, une personne que tu ne connais pas encore te parle. Tu n’as pas compris son message. Écris une demande polie pour poursuivre l’échange.",
        "At the place where you are staying, someone you have not met before speaks to you. You did not understand the message. Write a polite request to continue the exchange.",
        "En vuestro alojamiento, una persona que aún no conoces te habla. No has entendido su mensaje. Escribe una petición cortés para continuar el intercambio.",
      ),
      success: t(
        "La personne comprend ta demande et reprend son message. Demander une répétition permet de continuer l’échange.",
        "Your host understands your request and repeats the message. Asking for repetition keeps the exchange going.",
        "La persona entiende tu petición y repite su mensaje. Pedir una repetición permite continuar el intercambio.",
      ),
      recovery: t(
        "La correction montre une façon de demander une répétition à une personne vouvoyée. Relis-la ; la scène continue avec Yoppo.",
        "The feedback shows a way to ask for repetition when addressing someone formally. Read it through; the scene continues with Yoppo.",
        "La corrección muestra una forma de pedir una repetición al dirigirte a alguien de usted. Repásala; la escena continúa con Yoppo.",
      ),
    },
    "it1-u01-q5": {
      title: t("L’heure du repos", "Time to rest", "Hora de descansar"),
      character: t("Yoppo", "Yoppo", "Yoppo"),
      setting: t(
        "La promenade est finie. Tu vas te coucher et tu échanges une dernière formule avec Yoppo.",
        "The walk is over. You are going to bed and exchange one last phrase with Yoppo.",
        "El paseo ha terminado. Te vas a dormir e intercambias una última fórmula con Yoppo.",
      ),
      success: t(
        "Tu termines la soirée avec une formule adaptée au coucher. La mission arrive à son terme.",
        "You end the evening with a phrase suited to bedtime. The mission draws to a close.",
        "Terminas la noche con una fórmula adecuada para la hora de dormir. La misión llega a su fin.",
      ),
      recovery: t(
        "Cette scène se situe au coucher. Observe la correction pour retrouver la formule adaptée, puis découvre le bilan de ta mission.",
        "This scene takes place at bedtime. Look at the feedback to recall the fitting phrase, then see your mission result.",
        "Esta escena ocurre a la hora de dormir. Mira la corrección para recordar la fórmula adecuada y consulta el resultado de tu misión.",
      ),
    },
  },
};

/** Optional L1/L2 retrieval practice; kept outside the nineteen scored unit activities. */
export const italianFirstMidpoint: CourseAssessment = {
  id: "it1-u01-midpoint",
  purpose: "midpoint",
  title: t("Mi-parcours · Au café", "Halfway recap · At the café", "Repaso intermedio · En el café"),
  description: t(
    "Cinq questions pour retrouver les salutations, les mots et les demandes des leçons 1 et 2. Cette révision facultative ne remplace pas la mission de fin d’unité. Reviens aux leçons si tu veux revoir une expression.",
    "Five questions revisit the greetings, words and requests from lessons 1 and 2. This optional recap does not replace the end-of-unit mission. Return to the lessons whenever you want to review an expression.",
    "Cinco preguntas repasan los saludos, las palabras y las peticiones de las lecciones 1 y 2. Este repaso opcional no sustituye la misión final de la unidad. Vuelve a las lecciones si quieres repasar una expresión.",
  ),
  unitIds: ["u01"],
  passPercent: 80,
  questions: [
    {
      ...choice("it1-u01-midpoint-q1", t(
        "Tu arrives au café le matin. Quelle formule convient pour saluer ?",
        "You arrive at the café in the morning. Which phrase fits this greeting?",
        "Llegas al café por la mañana. ¿Qué fórmula sirve para saludar?",
      ), [
        option("a", "Buonasera!", t("Cette formule convient à une scène du soir ; ici, c’est le matin.", "This phrase fits an evening scene; here, it is morning.", "Esta fórmula encaja en una escena de tarde o noche; aquí es por la mañana.")),
        option("b", "Buongiorno!", t("Cette formule convient à la rencontre matinale.", "This phrase fits the morning encounter.", "Esta fórmula encaja en el encuentro matinal.")),
        option("c", "Buonanotte!", t("Cette formule accompagne ici le coucher, pas l’arrivée au café le matin.", "This phrase goes with bedtime here, not arriving at the café in the morning.", "Esta fórmula acompaña aquí la hora de dormir, no la llegada al café por la mañana.")),
      ], "b", t("Buongiorno convient à cette scène du matin.", "Buongiorno fits this morning scene.", "Buongiorno encaja en esta escena matinal.")),
      title: t("Une arrivée matinale", "A morning arrival", "Una llegada por la mañana"),
      taughtInUnitId: "u01",
    },
    {
      ...choice("it1-u01-midpoint-q2", t(
        "Yoppo te dit « Grazie! » pour ton aide. Quelle réponse signifie ici « De rien ! » ?",
        "Yoppo says “Grazie!” for your help. Which reply means “You’re welcome!” here?",
        "Yoppo te dice «Grazie!» por tu ayuda. ¿Qué respuesta significa aquí «¡De nada!»?",
      ), [
        option("a", "Arrivederci!", t("Ce serait une formule de départ.", "That would be a farewell.", "Sería una despedida.")),
        option("b", "Buongiorno!", t("Ce serait une salutation, pas la réponse recherchée au remerciement.", "That would be a greeting, not the requested reply to thanks.", "Sería un saludo, no la respuesta buscada al agradecimiento.")),
        option("c", "Prego!", t("Après ce remerciement, prego signifie « de rien ».", "After this expression of thanks, prego means you’re welcome.", "Después de este agradecimiento, prego significa de nada.")),
      ], "c", t("Après grazie, prego répond ici au remerciement. Ce mot peut avoir d’autres sens dans d’autres situations.", "After grazie, prego answers the thanks here. The word can have other meanings in other situations.", "Después de grazie, prego responde aquí al agradecimiento. La palabra puede tener otros sentidos en otras situaciones.")),
      title: t("Répondre à un merci", "Reply to thanks", "Responder a un agradecimiento"),
      taughtInUnitId: "u01",
    },
    {
      ...choice("it1-u01-midpoint-q3", t(
        "Yoppo veut une glace. Quelle demande reprend la formule polie de la leçon ?",
        "Yoppo wants an ice cream. Which request uses the polite phrase from the lesson?",
        "Yoppo quiere un helado. ¿Qué petición utiliza la fórmula cortés de la lección?",
      ), [
        option("a", "Un gelato, per favore.", t("Gelato désigne la glace ; per favore rend la demande polie.", "Gelato is the ice cream; per favore makes the request polite.", "Gelato es el helado; per favore hace cortés la petición.")),
        option("b", "Un caffè.", t("Cette expression désigne un café ; Yoppo veut une glace.", "This expression names a coffee; Yoppo wants an ice cream.", "Esta expresión nombra un café; Yoppo quiere un helado.")),
        option("c", "Una pizza.", t("Cette expression désigne une pizza, pas la glace demandée.", "This expression names a pizza, not the requested ice cream.", "Esta expresión nombra una pizza, no el helado que se pide.")),
      ], "a", t("Un gelato, per favore est la demande complète étudiée dans la scène du café.", "Un gelato, per favore is the complete request studied in the café scene.", "Un gelato, per favore es la petición completa estudiada en la escena del café.")),
      title: t("Une demande au café", "A café request", "Una petición en el café"),
      taughtInUnitId: "u01",
    },
    {
      ...choice("it1-u01-midpoint-q4", t(
        "Écoute Yoppo. Quelle expression reconnais-tu ?",
        "Listen to Yoppo. Which expression do you recognise?",
        "Escucha a Yoppo. ¿Qué expresión reconoces?",
      ), [
        option("a", "Un gelato.", t("Le début de gelato ne correspond pas à celui du mot entendu.", "The start of gelato does not match the word you heard.", "El comienzo de gelato no coincide con la palabra que has oído.")),
        option("b", "Una chiave.", t("Tu as reconnu chiave et son groupe chi au son dur.", "You recognised chiave and its hard chi sound.", "Has reconocido chiave y el sonido fuerte del grupo chi.")),
        option("c", "Il bagno.", t("Bagno contient le groupe gn ; ce n’est pas l’expression entendue.", "Bagno contains gn; it is not the expression you heard.", "Bagno contiene el grupo gn; no es la expresión que has oído.")),
      ], "b", t("Le message est Una chiave. Dans chiave, le h conserve le son dur travaillé dans la leçon 2.", "The message is Una chiave. In chiave, h keeps the hard sound studied in lesson 2.", "El mensaje es Una chiave. En chiave, la h mantiene el sonido fuerte estudiado en la lección 2."), "listen", "Una chiave."),
      title: t("Retrouver une expression à l’oreille", "Recognise an expression by ear", "Reconocer una expresión al escucharla"),
      taughtInUnitId: "u01",
    },
    {
      ...recall("it1-u01-midpoint-q5", phrase("Sì, grazie.", "Oui, merci.", "Yes, thank you.", "Sí, gracias.")),
      title: t("Accepter et remercier", "Accept and give thanks", "Aceptar y dar las gracias"),
      prompt: t(
        "Au café, tu acceptes ce qu’on te propose. Écris la formule étudiée : « Oui, merci. »",
        "At the café, you accept what is offered. Write the phrase you studied: “Yes, thank you.”",
        "En el café, aceptas lo que te ofrecen. Escribe la fórmula estudiada: «Sí, gracias».",
      ),
      taughtInUnitId: "u01",
    },
  ],
};
