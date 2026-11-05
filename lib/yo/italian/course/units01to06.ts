import type { CourseAssessment, CourseUnit } from "./courseTypes";
import { base, choice, dialogue, lesson, option, phrase, recall, t } from "./courseAuthoring";

// Original teaching material: the sources establish scope, not these authored texts.
const a1 = [
  phrase("Buongiorno!", "Bonjour !", "Good morning!", "¡Buenos días!"),
  phrase("Buonasera!", "Bonsoir !", "Good evening!", "¡Buenas tardes/noches!"),
  phrase("Ciao!", "Salut !", "Hi! / Bye!", "¡Hola! / ¡Chao!"),
  phrase("Arrivederci!", "Au revoir !", "Goodbye!", "¡Hasta luego!"),
  phrase("Grazie!", "Merci !", "Thank you!", "¡Gracias!"),
  phrase("Prego!", "De rien !", "You're welcome!", "¡De nada!"),
  phrase("Buonanotte!", "Bonne nuit !", "Good night!", "¡Buenas noches, que descanses!"),
  phrase("Sì, grazie.", "Oui, merci.", "Yes, thank you.", "Sí, gracias."),
];
const u01l1 = lesson({
  id: "it1-u01-l1", title: t("Entrer dans la conversation", "Start a conversation", "Entrar en la conversación"),
  goal: t("Choisir une salutation et répondre à un remerciement.", "Choose a greeting and reply to thanks.", "Elegir un saludo y responder a un agradecimiento."),
  vocabulary: a1,
  grammar: { title: t("Une formule, une intention", "One phrase, one intention", "Una fórmula, una intención"), body: t(
    "Une interaction peut commencer par une formule entière, sans phrase longue. Buongiorno convient à notre scène du matin ; buonasera à celle du soir. Ciao est familier et sert à l’arrivée comme au départ. Arrivederci prend congé. Buonanotte souhaite une bonne nuit, notamment au coucher. Après grazie, prego signifie ici « de rien » ; ce mot a d’autres sens dans d’autres situations. Sì signifie oui ; no signifie non. Non sert à nier une phrase, comme dans non capisco. L’intonation rend ces petites formules accueillantes.",
    "An interaction can begin with a whole formula rather than a long sentence. Buongiorno fits our morning scene; buonasera fits the evening scene. Ciao is informal and works for hello and goodbye. Arrivederci takes leave. Buonanotte wishes someone a good night, especially before bed. After grazie, prego means you're welcome here; it has other meanings elsewhere. Sì means yes and no means no. Non negates a sentence, as in non capisco. Intonation helps these short phrases sound welcoming.",
    "Una interacción puede empezar con una fórmula completa, sin una oración larga. Buongiorno encaja en nuestra escena matinal; buonasera en la de la tarde o noche. Ciao es informal y sirve al llegar y al despedirse. Arrivederci se usa para despedirse. Buonanotte desea una buena noche, especialmente al acostarse. Después de grazie, prego significa aquí «de nada»; tiene otros sentidos en otras situaciones. Sì significa sí y no significa no. Non niega una oración, como en non capisco. La entonación ayuda a sonar acogedor."
  ), examples: [a1[0], a1[5], a1[7], phrase("Buongiorno, Yoppo!", "Bonjour, Yoppo !", "Good morning, Yoppo!", "¡Buenos días, Yoppo!")] },
  pronunciation: { body: t("Fais entendre les voyelles de ciao et grazie. Dans buongiorno, gi forme le son initial de l’anglais job ; le i n’est pas une syllabe séparée. Imite le rythme sans accélérer.", "Let the vowels in ciao and grazie be heard. In buongiorno, gi makes the initial sound of English job; i is not a separate syllable. Copy the rhythm without rushing.", "Deja oír las vocales de ciao y grazie. En buongiorno, gi tiene el sonido inicial del inglés job; la i no es una sílaba separada. Imita el ritmo sin apresurarte."), practice: ["Ciao", "Grazie", "Buongiorno"] },
  reading: phrase("È mattina. Lina entra nel bar: «Buongiorno, Yoppo!». «Ciao, Lina!». Yoppo porta il caffè. «Grazie!» dice Lina. «Prego!». Dopo il caffè, Lina si alza: «Arrivederci!».", "C’est le matin. Lina entre dans le café : « Bonjour, Yoppo ! » « Salut, Lina ! » Yoppo apporte le café. « Merci ! » dit Lina. « De rien ! » Après son café, Lina se lève : « Au revoir ! »", "It is morning. Lina enters the café: ‘Good morning, Yoppo!’ ‘Hi, Lina!’ Yoppo brings the coffee. ‘Thank you!’ says Lina. ‘You’re welcome!’ After her coffee, Lina gets up: ‘Goodbye!’", "Es de mañana. Lina entra en el café: «¡Buenos días, Yoppo!». «¡Hola, Lina!». Yoppo trae el café. «¡Gracias!», dice Lina. «¡De nada!». Después del café, Lina se levanta: «¡Hasta luego!»."),
  order: phrase("Buongiorno, Yoppo!", "Bonjour, Yoppo !", "Good morning, Yoppo!", "¡Buenos días, Yoppo!"), recall: a1[7],
  comprehension: choice("it1-u01-l1-read", t("Que répond Yoppo à Grazie ?", "How does Yoppo reply to Grazie?", "¿Qué responde Yoppo a Grazie?"), [
    option("a", "Prego!", t("C’est la réponse au remerciement.", "That replies to thanks.", "Es la respuesta al agradecimiento.")),
    option("b", "Buonanotte!", t("Personne ne va se coucher ici.", "Nobody is going to bed here.", "Aquí nadie se va a dormir.")),
    option("c", "Arrivederci!", t("Ce serait une formule de départ.", "That would be a farewell.", "Sería una despedida.")),
  ], "a", t("Grazie appelle ici prego.", "Grazie is answered with prego here.", "Aquí se responde a grazie con prego.")),
  listening: choice("it1-u01-l1-listen", t("Quelle formule entends-tu ?", "Which phrase do you hear?", "¿Qué fórmula oyes?"), [
    option("a", "Buongiorno!", t("La fin entendue n’est pas giorno.", "The ending is not giorno.", "El final no es giorno.")),
    option("b", "Buonasera!", t("Tu as reconnu sera.", "You recognised sera.", "Has reconocido sera.")),
    option("c", "Buonanotte!", t("Notte est une autre fin de mot.", "Notte is a different ending.", "Notte es otro final.")),
  ], "b", t("Buonasera est la formule entendue.", "Buonasera is the phrase heard.", "La fórmula escuchada es buonasera."), "listen", "Buonasera, Yoppo!"),
  speaking: { prompt: t("Joue une rencontre matinale puis un départ avec Yoppo.", "Act out a morning meeting and a farewell with Yoppo.", "Representa un encuentro matinal y una despedida con Yoppo."), checklist: [
    t("Je salue au début.", "I greet at the start.", "Saludo al empezar."),
    t("Je dis grazie et réponds prego.", "I say grazie and reply prego.", "Digo grazie y respondo prego."),
    t("Je choisis une formule de départ.", "I choose a farewell.", "Elijo una despedida."),
  ] },
});
const a2 = [
  phrase("Un caffè.", "Un café.", "A coffee.", "Un café."),
  phrase("Un gelato.", "Une glace.", "An ice cream.", "Un helado."),
  phrase("Una chiave.", "Une clé.", "A key.", "Una llave."),
  phrase("Gli spaghetti.", "Les spaghettis.", "Spaghetti.", "Los espaguetis."),
  phrase("Il bagno.", "La salle de bain.", "The bathroom.", "El baño."),
  phrase("Una pizza.", "Une pizza.", "A pizza.", "Una pizza."),
  phrase("Per favore.", "S’il vous plaît.", "Please.", "Por favor."),
];
const u01l2 = lesson({
  id: "it1-u01-l2", title: t("Les sons font sens", "Sounds make meaning", "Los sonidos tienen sentido"),
  goal: t("Repérer des correspondances entre lettres et sons.", "Notice spelling–sound patterns.", "Reconocer relaciones entre letras y sonidos."), vocabulary: a2,
  grammar: { title: t("Lire des groupes de lettres", "Read letter groups", "Leer grupos de letras"), body: t(
    "Devant e ou i, c se prononce comme le début de ciao ; g comme le début de gelato. Le h de che, chi, ghe, ghi maintient un son dur : chiave, spaghetti. Gn forme un seul son, proche du gn de montagne : bagno. Les consonnes doubles sont plus longues : retiens brièvement celles de caffè et pizza. Apprends un caffè et una chiave comme des groupes ; les articles seront expliqués dans l’unité 3. Un gelato, per favore est une demande complète.",
    "Before e or i, c has the sound at the start of ciao, and g the sound at the start of gelato. The h in che, chi, ghe and ghi keeps a hard sound: chiave, spaghetti. Gn is one sound, similar to Spanish ñ: bagno. Double consonants are longer: hold them briefly in caffè and pizza. Learn un caffè and una chiave as chunks; articles will be explained in Unit 3. Un gelato, per favore is a complete request.",
    "Delante de e o i, c tiene el sonido inicial de ciao y g el de gelato. La h de che, chi, ghe, ghi mantiene un sonido fuerte: chiave, spaghetti. Gn representa un sonido parecido a ñ: bagno. Las consonantes dobles duran más: retén brevemente las de caffè y pizza. Aprende un caffè y una chiave como grupos; los artículos se explicarán en la unidad 3. Un gelato, per favore es una petición completa."
  ), examples: [a2[0], a2[2], a2[6], phrase("Un gelato, per favore.", "Une glace, s’il vous plaît.", "An ice cream, please.", "Un helado, por favor.")] },
  pronunciation: { body: t("Compare ciao/chiave et gelato/spaghetti. Dans caffè, l’accent grave écrit marque la dernière syllabe. Tape doucement le rythme caf-FÈ.", "Compare ciao/chiave and gelato/spaghetti. In caffè, the written grave accent marks the last syllable. Tap the rhythm caf-FÈ gently.", "Compara ciao/chiave y gelato/spaghetti. En caffè, el acento grave escrito marca la última sílaba. Marca suavemente el ritmo caf-FÈ."), practice: ["Ciao", "Chiave", "Gelato", "Spaghetti", "Bagno", "Caffè"] },
  reading: phrase("Al bar, Lina legge il menu: «Un caffè?». Yoppo guarda il gelato: «Un gelato, per favore». Lina ripete: «Un gelato?». «Sì, grazie!». Il caffè è per Lina; il gelato è per Yoppo.", "Au café, Lina lit le menu : « Un café ? » Yoppo regarde la glace : « Une glace, s’il vous plaît. » Lina répète : « Une glace ? » « Oui, merci ! » Le café est pour Lina ; la glace est pour Yoppo.", "At the café, Lina reads the menu: ‘A coffee?’ Yoppo looks at the ice cream: ‘An ice cream, please.’ Lina repeats: ‘An ice cream?’ ‘Yes, thank you!’ The coffee is for Lina; the ice cream is for Yoppo.", "En el café, Lina lee el menú: «¿Un café?». Yoppo mira el helado: «Un helado, por favor». Lina repite: «¿Un helado?». «¡Sí, gracias!». El café es para Lina; el helado es para Yoppo."),
  order: phrase("Un gelato, per favore.", "Une glace, s’il vous plaît.", "An ice cream, please.", "Un helado, por favor."), recall: a2[6],
  comprehension: choice("it1-u01-l2-read", t("Que demande Yoppo ?", "What does Yoppo request?", "¿Qué pide Yoppo?"), [
    option("a", "Una chiave.", t("Yoppo ne demande pas de clé.", "Yoppo does not ask for a key.", "Yoppo no pide una llave.")),
    option("b", "Un gelato.", t("Sa demande contient gelato.", "His request contains gelato.", "Su petición contiene gelato.")),
    option("c", "Un caffè.", t("Le café est pour Lina ; écoute la demande de Yoppo.", "The coffee is for Lina; listen to Yoppo’s request.", "El café es para Lina; escucha lo que pide Yoppo.")),
  ], "b", t("Il demande une glace avec per favore.", "He asks for an ice cream with per favore.", "Pide un helado con per favore.")),
  listening: choice("it1-u01-l2-listen", t("Retrouve le mot entendu.", "Find the word you hear.", "Encuentra la palabra que oyes."), [
    option("a", "Il bagno.", t("Bagno contient gn, absent ici.", "Bagno has gn, absent here.", "Bagno tiene gn, que aquí no aparece.")),
    option("b", "Un gelato.", t("Gelato commence par un autre son.", "Gelato begins with a different sound.", "Gelato empieza con otro sonido.")),
    option("c", "Una chiave.", t("Tu as reconnu chi, au son dur.", "You recognised the hard sound chi.", "Has reconocido el sonido fuerte de chi.")),
  ], "c", t("Dans chiave, le h conserve le son dur.", "In chiave, h keeps the hard sound.", "En chiave, la h mantiene el sonido fuerte."), "listen", "Una chiave."),
  speaking: { prompt: t("Lis les six noms, puis fais une demande polie.", "Read the six nouns, then make a polite request.", "Lee los seis nombres y haz una petición cortés."), checklist: [
    t("Je distingue ciao et chiave.", "I distinguish ciao and chiave.", "Distingo ciao y chiave."),
    t("Je prolonge les doubles consonnes.", "I lengthen double consonants.", "Alargo las consonantes dobles."),
    t("Je termine par per favore.", "I finish with per favore.", "Termino con per favore."),
  ] },
});
const a3 = [
  phrase("Ascolta.", "Écoute.", "Listen.", "Escucha."),
  phrase("Leggi.", "Lis.", "Read.", "Lee."),
  phrase("Scrivi.", "Écris.", "Write.", "Escribe."),
  phrase("Ripeti.", "Répète.", "Repeat.", "Repite."),
  phrase("Non capisco.", "Je ne comprends pas.", "I don't understand.", "No entiendo."),
  phrase("Può ripetere, per favore?", "Pouvez-vous répéter, s’il vous plaît ?", "Could you repeat that, please?", "¿Puede repetir, por favor?"),
  phrase("Scusi.", "Excusez-moi.", "Excuse me.", "Disculpe."),
];
const u01l3 = lesson({
  id: "it1-u01-l3", title: t("Demander de l’aide", "Ask for help", "Pedir ayuda"),
  goal: t("Comprendre quatre consignes et demander une répétition.", "Understand four instructions and ask for repetition.", "Entender cuatro instrucciones y pedir una repetición."), vocabulary: a3,
  grammar: { title: t("Consigne, négation, demande polie", "Instruction, negative, polite request", "Instrucción, negación y petición cortés"), body: t(
    "Ascolta, leggi, scrivi et ripeti s’adressent ici à une personne tutoyée : nos jeux emploient ces formes. Apprends-les d’abord comme des actions. Non se place avant le verbe dans non capisco. Pour une personne vouvoyée, utilise Può ripetere, per favore? Scusi attire poliment l’attention. Nous n’apprenons pas encore toute la conjugaison de potere : retiens cette demande comme un outil complet. À l’écrit, le point d’interrogation marque la question ; à l’oral, l’intonation la rend reconnaissable.",
    "Ascolta, leggi, scrivi and ripeti address one person informally here; our games use these forms. First learn them as actions. Non goes before the verb in non capisco. To address someone formally, use Può ripetere, per favore? Scusi politely gets attention. We are not learning the full conjugation of potere yet: learn this request as a complete tool. A question mark identifies the written question; intonation makes it recognisable in speech.",
    "Ascolta, leggi, scrivi y ripeti se dirigen aquí a una persona de tú; los juegos usan estas formas. Apréndelas primero como acciones. Non va antes del verbo en non capisco. Para dirigirte a alguien de usted, usa Può ripetere, per favore? Scusi llama la atención con cortesía. Aún no aprendemos toda la conjugación de potere: aprende esta petición como una herramienta completa. El signo de interrogación marca la pregunta escrita; la entonación permite reconocerla al hablar."
  ), examples: [a3[4], a3[5], phrase("Scusi, non capisco.", "Excusez-moi, je ne comprends pas.", "Excuse me, I don't understand.", "Disculpe, no entiendo.")] },
  pronunciation: { body: t("Può est une syllabe accentuée, écrite avec ò. Dans ripetere, l’accent porte sur pe : ri-PE-te-re. Une demande polie n’a pas besoin d’être murmurée.", "Può is one stressed syllable, written with ò. In ripetere, stress pe: ri-PE-te-re. A polite request need not be whispered.", "Può es una sílaba tónica, escrita con ò. En ripetere, acentúa pe: ri-PE-te-re. Una petición cortés no necesita susurrarse."), practice: ["Può", "Ripetere", "Scusi", "Non capisco"] },
  reading: phrase("Yoppo dice: «Ascolta». Poi dice: «Ripeti». Lina ascolta, ma non capisce una parola. Chiede: «Può ripetere, per favore?». Yoppo ripete lentamente.", "Yoppo dit : « Écoute. » Puis : « Répète. » Lina écoute, mais ne comprend pas un mot. Elle demande : « Pouvez-vous répéter, s’il vous plaît ? » Yoppo répète lentement.", "Yoppo says, ‘Listen.’ Then, ‘Repeat.’ Lina listens but doesn't understand one word. She asks, ‘Could you repeat that, please?’ Yoppo repeats slowly.", "Yoppo dice: «Escucha». Luego: «Repite». Lina escucha, pero no entiende una palabra. Pregunta: «¿Puede repetir, por favor?». Yoppo repite despacio."),
  order: phrase("Scusi, non capisco.", "Excusez-moi, je ne comprends pas.", "Excuse me, I don't understand.", "Disculpe, no entiendo."), recall: a3[5],
  comprehension: choice("it1-u01-l3-read", t("Pourquoi Lina demande-t-elle de répéter ?", "Why does Lina ask for repetition?", "¿Por qué pide Lina una repetición?"), [
    option("a", "Non capisce una parola.", t("C’est le problème décrit.", "That is the problem described.", "Es el problema descrito.")),
    option("b", "Vuole un gelato.", t("Il n’y a pas de commande ici.", "There is no order here.", "Aquí no hay un pedido.")),
    option("c", "Vuole dire arrivederci.", t("Elle poursuit l’échange.", "She continues the exchange.", "Continúa el intercambio.")),
  ], "a", t("La répétition permet de continuer à comprendre.", "Repetition helps understanding continue.", "La repetición permite seguir entendiendo.")),
  listening: choice("it1-u01-l3-listen", t("Quelle consigne entends-tu ?", "Which instruction do you hear?", "¿Qué instrucción oyes?"), [
    option("a", "Ascolta.", t("Ascolta demanderait d’écouter.", "Ascolta would ask you to listen.", "Ascolta pediría escuchar.")),
    option("b", "Scrivi.", t("Scrivi demanderait d’écrire.", "Scrivi would ask you to write.", "Scrivi pediría escribir.")),
    option("c", "Ripeti.", t("Ripeti demande de redire.", "Ripeti asks you to say it again.", "Ripeti pide volver a decirlo.")),
  ], "c", t("Tu entends Ripeti : répète.", "You hear Ripeti: repeat.", "Oyes Ripeti: repite."), "listen", "Ripeti, per favore."),
  speaking: { prompt: t("Donne deux consignes à Yoppo, puis demande une répétition.", "Give Yoppo two instructions, then ask for repetition.", "Da dos instrucciones a Yoppo y pide una repetición."), checklist: [
    t("J’emploie deux consignes différentes.", "I use two different instructions.", "Uso dos instrucciones diferentes."),
    t("Je peux dire non capisco.", "I can say non capisco.", "Puedo decir non capisco."),
    t("Ma demande inclut ripetere et per favore.", "My request includes ripetere and per favore.", "Mi petición incluye ripetere y per favore."),
  ] },
  extra: [dialogue("it1-u01-help-dialogue", t("Yoppo, on recommence ?", "Yoppo, shall we try again?", "Yoppo, ¿lo intentamos otra vez?"), t("Salue, demande de répéter, puis remercie.", "Greet, ask for repetition, then give thanks.", "Saluda, pide una repetición y da las gracias."), [
    { speaker: "Yoppo", line: "Buongiorno!", prompt: t("Réponds à la salutation matinale.", "Reply to the morning greeting.", "Responde al saludo de la mañana."), correctId: "a", options: [
      option("a", "Buongiorno!", t("L’échange commence.", "The exchange begins.", "Empieza el intercambio.")),
      option("b", "Buonanotte!", t("Ce serait pour le coucher.", "That would be for bedtime.", "Sería para acostarse.")),
      option("c", "Non capisco.", t("La consigne demande de saluer.", "The task asks for a greeting.", "La tarea pide saludar.")),
    ] },
    { speaker: "Yoppo", line: "Ascolta: caffè.", prompt: t("Imagine que tu n’as pas compris ; demande de répéter.", "Imagine you did not understand; ask for repetition.", "Imagina que no has entendido; pide una repetición."), correctId: "b", options: [
      option("a", "Arrivederci!", t("Cela terminerait l’échange.", "That would end the exchange.", "Eso terminaría el intercambio.")),
      option("b", "Può ripetere, per favore?", t("Tu demandes une nouvelle écoute.", "You ask to hear it again.", "Pides escucharlo de nuevo.")),
      option("c", "Prego!", t("Prego ne demande pas une répétition.", "Prego does not request repetition.", "Prego no pide una repetición.")),
    ] },
    { speaker: "Yoppo", line: "Caffè. Un caffè.", prompt: t("Tu as compris. Remercie.", "You understood. Give thanks.", "Has entendido. Da las gracias."), correctId: "c", options: [
      option("a", "Scrivi.", t("C’est une consigne d’écriture.", "That is a writing instruction.", "Es una instrucción de escribir.")),
      option("b", "Buonasera!", t("Ce serait une nouvelle salutation.", "That would be another greeting.", "Sería otro saludo.")),
      option("c", "Grazie!", t("Tu remercies pour l’aide.", "You give thanks for the help.", "Agradeces la ayuda.")),
    ] },
  ], t("Tu as salué, réparé une incompréhension et remercié.", "You greeted, repaired a misunderstanding and gave thanks.", "Has saludado, resuelto una incomprensión y agradecido."))],
});
const q01: CourseAssessment = {
  id: "it1-u01-quiz", title: t("Bilan 1 · entrer en italien", "Review 1 · starting in Italian", "Repaso 1 · empezar en italiano"), description: t("Cinq situations nouvelles avec les outils de l’unité.", "Five new situations using this unit's tools.", "Cinco situaciones nuevas con las herramientas de la unidad."), unitIds: ["u01"], passPercent: 80,
  questions: [
    choice("it1-u01-q1", t("Tu quittes une personne peu connue. Quelle formule convient ?", "You are leaving someone you do not know well. Which phrase fits?", "Te despides de alguien poco conocido. ¿Qué fórmula encaja?"), [
      option("a", "Arrivederci!", t("C’est une formule de départ.", "That is a farewell.", "Es una despedida.")),
      option("b", "Buongiorno!", t("La rencontre se termine ici.", "The meeting is ending here.", "Aquí termina el encuentro.")),
      option("c", "Scrivi.", t("C’est une consigne, pas un départ.", "It is an instruction, not a farewell.", "Es una instrucción, no una despedida.")),
    ], "a", t("Arrivederci termine poliment la rencontre.", "Arrivederci politely ends the meeting.", "Arrivederci termina el encuentro cortésmente.")),
    choice("it1-u01-q2", t("Quelle consigne entends-tu ?", "Which instruction do you hear?", "¿Qué instrucción oyes?"), [
      option("a", "Ripeti.", t("Ripeti serait répète.", "Ripeti would mean repeat.", "Ripeti sería repite.")),
      option("b", "Leggi.", t("Leggi demande de lire.", "Leggi asks you to read.", "Leggi pide leer.")),
      option("c", "Scrivi.", t("Scrivi demanderait d’écrire.", "Scrivi would ask you to write.", "Scrivi pediría escribir.")),
    ], "b", t("Leggi : lis. Per favore rend la demande polie.", "Leggi means read. Per favore makes the request polite.", "Leggi significa lee. Per favore hace cortés la petición."), "listen", "Leggi, per favore."),
    choice("it1-u01-q3", t("Dans quel mot ch conserve-t-il un son dur ?", "In which word does ch keep a hard sound?", "¿En qué palabra ch mantiene un sonido fuerte?"), [
      option("a", "Ciao", t("Ciao ne contient pas ch.", "Ciao does not contain ch.", "Ciao no contiene ch.")),
      option("b", "Gelato", t("Gelato commence par g.", "Gelato begins with g.", "Gelato empieza con g.")),
      option("c", "Chiave", t("Le groupe chi donne ce son dur.", "The group chi gives that hard sound.", "El grupo chi produce ese sonido fuerte.")),
    ], "c", t("Le h change la lecture du c devant i.", "The h changes how c is read before i.", "La h cambia la lectura de c ante i.")),
    recall("it1-u01-q4", phrase("Scusi, può ripetere?", "Excusez-moi, pouvez-vous répéter ?", "Excuse me, could you repeat that?", "Disculpe, ¿puede repetir?"), ["Scusi, può ripetere?", "Può ripetere, scusi?", "Scusi, può ripetere, per favore?"]),
    choice("it1-u01-q5", t("Tu vas te coucher. Quelle formule correspond à ton intention ?", "You are going to bed. Which phrase matches your intention?", "Te vas a dormir. ¿Qué fórmula expresa tu intención?"), [
      option("a", "Buonanotte!", t("Tu souhaites une bonne nuit.", "You wish someone a good night.", "Deseas una buena noche.")),
      option("b", "Prego!", t("Prego ne souhaite pas bonne nuit.", "Prego does not wish good night.", "Prego no desea buenas noches.")),
      option("c", "Buongiorno!", t("Ce serait une autre scène.", "That would fit a different scene.", "Correspondería a otra escena.")),
    ], "a", t("Buonanotte accompagne ici le coucher.", "Buonanotte accompanies bedtime here.", "Buonanotte acompaña aquí el momento de dormir.")),
  ],
};
const u01: CourseUnit = {
  id: "u01", number: 1, title: t("Premiers sons, premiers échanges", "First sounds, first exchanges", "Primeros sonidos, primeros intercambios"), subtitle: t("Saluer, écouter et oser demander de l’aide.", "Greet, listen and dare to ask for help.", "Saludar, escuchar y atreverse a pedir ayuda."),
  objectives: [
    t("Adapter une salutation à une scène simple.", "Adapt a greeting to a simple scene.", "Adaptar un saludo a una escena sencilla."),
    t("Lire des groupes de lettres fréquents.", "Read common letter groups.", "Leer grupos de letras frecuentes."),
    t("Utiliser une demande de répétition.", "Use a request for repetition.", "Usar una petición de repetición."),
  ], lessons: [u01l1, u01l2, u01l3], quiz: q01,
  production: { id: "it1-u01-project", title: t("Ton premier mini-échange", "Your first mini-exchange", "Tu primer miniintercambio"), prompt: t("Écris puis joue quatre répliques : une salutation adaptée au moment, une demande polie, un remerciement et un départ. Choisis une boisson ou une glace connue ; invente ton interlocuteur si tu veux.", "Write and act out four lines: a greeting suited to the time, a polite request, thanks and a farewell. Choose a familiar drink or ice cream; invent your partner if you wish.", "Escribe y representa cuatro intervenciones: un saludo adecuado al momento, una petición cortés, un agradecimiento y una despedida. Elige una bebida o un helado conocido; inventa a tu interlocutor si quieres."), model: "Buongiorno! Un gelato, per favore. Grazie! Arrivederci!", rubric: [
    t("Mes quatre intentions sont reconnaissables.", "My four intentions are recognisable.", "Mis cuatro intenciones se reconocen."),
    t("J’utilise per favore et grazie.", "I use per favore and grazie.", "Uso per favore y grazie."),
    t("Je fais entendre les voyelles des mots.", "I make the words' vowels audible.", "Dejo oír las vocales de las palabras."),
  ] },
  culture: { title: t("Choisir comment s’adresser à quelqu’un", "Choose how to address someone", "Elegir cómo dirigirse a alguien"), body: t("Le cours distingue les consignes familières adressées à Yoppo et des formules polies comme scusi et può ripetere. Le choix dépend de la relation et du contexte ; une formule n’est pas une règle sur toutes les rencontres en Italie. Observe ton interlocuteur et garde une formulation respectueuse si tu hésites.", "The course distinguishes informal instructions addressed to Yoppo from polite formulas such as scusi and può ripetere. The choice depends on relationship and context; one formula is not a rule for every encounter in Italy. Notice your partner's language and keep a respectful formula when uncertain.", "El curso distingue instrucciones informales dirigidas a Yoppo y fórmulas corteses como scusi y può ripetere. La elección depende de la relación y del contexto; una fórmula no es una regla para todos los encuentros en Italia. Observa a tu interlocutor y conserva una fórmula respetuosa si dudas."), sourceIds: ["udine-a1"] },
};


const b1 = [
  phrase("Mi chiamo Nina.", "Je m’appelle Nina.", "My name is Nina.", "Me llamo Nina."),
  phrase("Come ti chiami?", "Comment t’appelles-tu ?", "What is your name?", "¿Cómo te llamas?"),
  phrase("Sono canadese.", "Je suis canadien/canadienne.", "I am Canadian.", "Soy canadiense."),
  phrase("Sono di Montréal.", "Je suis de Montréal.", "I am from Montréal.", "Soy de Montreal."),
  phrase("Siamo studenti.", "Nous sommes étudiants.", "We are students.", "Somos estudiantes."),
  phrase("Di dove sei?", "D’où es-tu ?", "Where are you from?", "¿De dónde eres?"),
];
const u02l1 = lesson({
  id: "it1-u02-l1", title: t("Un nom et une origine", "A name and an origin", "Un nombre y un origen"),
  goal: t("Se présenter et demander l’origine avec essere.", "Introduce yourself and ask about origin with essere.", "Presentarse y preguntar el origen con essere."), vocabulary: b1,
  grammar: { title: t("Essere et les sujets", "Essere and subjects", "Essere y los sujetos"), body: t(
    "Essere signifie être : io sono, tu sei, lui/lei è, noi siamo, voi siete, loro sono. Le verbe indique souvent le sujet : Sono canadese suffit sans io. Pour une ville d’origine, emploie di + ville : Sono di Montréal. Une nationalité suit essere : Sono canadese. Mi chiamo et Come ti chiami? sont deux formules pour le nom. Le Lei de politesse utilise la troisième personne : Lei è…? Les identités des exemples sont fictives.",
    "Essere means be: io sono, tu sei, lui/lei è, noi siamo, voi siete, loro sono. The verb often identifies its subject: Sono canadese is enough without io. For a city of origin, use di + city: Sono di Montréal. A nationality follows essere: Sono canadese. Mi chiamo and Come ti chiami? are two formulas for names. Formal Lei uses the third person: Lei è…? The example identities are fictional.",
    "Essere significa ser o estar: io sono, tu sei, lui/lei è, noi siamo, voi siete, loro sono. El verbo suele identificar al sujeto: Sono canadese basta sin io. Para una ciudad de origen, usa di + ciudad: Sono di Montréal. La nacionalidad sigue a essere: Sono canadese. Mi chiamo y Come ti chiami? son dos fórmulas para el nombre. Lei de cortesía usa la tercera persona: Lei è…? Las identidades de los ejemplos son ficticias."
  ), examples: [b1[0], b1[3], b1[4], phrase("Tu sei italiano. Noi siamo canadesi.", "Tu es italien. Nous sommes canadiens.", "You are Italian. We are Canadian.", "Tú eres italiano. Somos canadienses.")] },
  pronunciation: { body: t("Distingue à l’écrit è, le verbe, de e, « et ». Dans chiamo, chi garde le son dur étudié. Nina a deux syllabes : NI-na.", "Distinguish written è, the verb, from e, meaning and. In chiamo, chi keeps the hard sound you studied. Nina has two syllables: NI-na.", "Distingue en la escritura è, el verbo, de e, «y». En chiamo, chi mantiene el sonido fuerte estudiado. Nina tiene dos sílabas: NI-na."), practice: ["Sono", "Sei", "È", "Siamo", "Mi chiamo"] },
  reading: phrase("Mi chiamo Nina. Sono canadese, di Montréal. Omar è italiano, di Bologna. Siamo studenti. Yoppo chiede: «Di dove sei, Nina?».", "Je m’appelle Nina. Je suis canadienne, de Montréal. Omar est italien, de Bologne. Nous sommes étudiants. Yoppo demande : « D’où es-tu, Nina ? »", "My name is Nina. I am Canadian, from Montréal. Omar is Italian, from Bologna. We are students. Yoppo asks, ‘Where are you from, Nina?’", "Me llamo Nina. Soy canadiense, de Montreal. Omar es italiano, de Bolonia. Somos estudiantes. Yoppo pregunta: «¿De dónde eres, Nina?»."),
  order: b1[3], recall: b1[4], accepted: ["Siamo studenti.", "Noi siamo studenti."],
  comprehension: choice("it1-u02-l1-read", t("D’où vient Omar ?", "Where is Omar from?", "¿De dónde es Omar?"), [
    option("a", "Di Montréal.", t("Montréal est l’origine de Nina.", "Montréal is Nina's origin.", "Montreal es el origen de Nina.")),
    option("b", "Di Bologna.", t("Le texte relie Omar à Bologne.", "The text connects Omar with Bologna.", "El texto vincula a Omar con Bolonia.")),
    option("c", "Di Roma.", t("Rome n’est pas mentionnée.", "Rome is not mentioned.", "Roma no se menciona.")),
  ], "b", t("Omar è italiano, di Bologna.", "Omar is Italian, from Bologna.", "Omar es italiano, de Bolonia.")),
  listening: choice("it1-u02-l1-listen", t("Quelle est la ville d’origine de Luca ?", "Which city is Luca from?", "¿De qué ciudad es Luca?"), [
    option("a", "Bologna", t("C’est la ville annoncée.", "That is the city named.", "Es la ciudad indicada.")),
    option("b", "Montréal", t("Ce nom n’est pas dans l’audio.", "That name is not in the recording.", "Ese nombre no aparece en el audio.")),
    option("c", "Torino", t("Écoute la ville après di.", "Listen for the city after di.", "Escucha la ciudad después de di.")),
  ], "a", t("Di introduit ici la ville d’origine.", "Di introduces the city of origin here.", "Di introduce aquí la ciudad de origen."), "listen", "Mi chiamo Luca. Sono italiano, di Bologna."),
  speaking: { prompt: t("Présente une identité réelle ou inventée et pose une question.", "Present a real or fictional identity and ask a question.", "Presenta una identidad real o inventada y haz una pregunta."), checklist: [
    t("Je donne un prénom avec mi chiamo.", "I give a first name with mi chiamo.", "Doy un nombre con mi chiamo."),
    t("Je donne une ville avec sono di.", "I give a city with sono di.", "Doy una ciudad con sono di."),
    t("Je demande di dove sei?", "I ask di dove sei?", "Pregunto di dove sei?"),
  ] },
});
const b2 = [
  phrase("Ho ventotto anni.", "J’ai vingt-huit ans.", "I am twenty-eight years old.", "Tengo veintiocho años."),
  phrase("Quanti anni hai?", "Quel âge as-tu ?", "How old are you?", "¿Cuántos años tienes?"),
  phrase("Ho un telefono.", "J’ai un téléphone.", "I have a phone.", "Tengo un teléfono."),
  phrase("Abbiamo due biglietti.", "Nous avons deux billets.", "We have two tickets.", "Tenemos dos billetes."),
  phrase("Non ho una mappa.", "Je n’ai pas de carte.", "I don't have a map.", "No tengo un mapa."),
  phrase("Hai una penna?", "As-tu un stylo ?", "Do you have a pen?", "¿Tienes un bolígrafo?"),
];
const u02l2 = lesson({
  id: "it1-u02-l2", title: t("L’âge et ce qu’on a", "Age and what we have", "La edad y lo que tenemos"),
  goal: t("Employer avere pour l’âge et la possession ; lire des nombres.", "Use avere for age and possession; read numbers.", "Usar avere para la edad y la posesión; leer números."), vocabulary: b2,
  grammar: { title: t("Avere et les nombres", "Avere and numbers", "Avere y los números"), body: t(
    "Avere : io ho, tu hai, lui/lei ha, noi abbiamo, voi avete, loro hanno. Pour l’âge, l’italien dit avoir : Ho ventotto anni. Non se place avant le verbe. De 0 à 10 : zero, uno, due, tre, quattro, cinque, sei, sette, otto, nove, dieci ; de 11 à 20 : undici, dodici, tredici, quattordici, quindici, sedici, diciassette, diciotto, diciannove, venti. Puis trenta, quaranta, cinquanta, sessanta, settanta, ottanta, novanta, cento. On combine trenta + due en trentadue. Venti perd sa dernière voyelle devant uno et otto : ventuno, ventotto.",
    "Avere: io ho, tu hai, lui/lei ha, noi abbiamo, voi avete, loro hanno. Italian uses have for age: Ho ventotto anni. Non goes before the verb. From 0 to 10: zero, uno, due, tre, quattro, cinque, sei, sette, otto, nove, dieci; from 11 to 20: undici, dodici, tredici, quattordici, quindici, sedici, diciassette, diciotto, diciannove, venti. Then trenta, quaranta, cinquanta, sessanta, settanta, ottanta, novanta, cento. Combine trenta + due as trentadue. Venti loses its last vowel before uno and otto: ventuno, ventotto.",
    "Avere: io ho, tu hai, lui/lei ha, noi abbiamo, voi avete, loro hanno. Para la edad, el italiano usa tener: Ho ventotto anni. Non va antes del verbo. Del 0 al 10: zero, uno, due, tre, quattro, cinque, sei, sette, otto, nove, dieci; del 11 al 20: undici, dodici, tredici, quattordici, quindici, sedici, diciassette, diciotto, diciannove, venti. Luego: trenta, quaranta, cinquanta, sessanta, settanta, ottanta, novanta, cento. Trenta + due forma trentadue. Venti pierde su última vocal ante uno y otto: ventuno, ventotto."
  ), examples: [b2[0], b2[4], b2[3], phrase("Lei ha trenta anni.", "Elle a trente ans.", "She is thirty years old.", "Ella tiene treinta años.")] },
  pronunciation: { body: t("Le h de ho, hai, ha et hanno ne se prononce pas. Dans anni, garde le n plus long. Écoute ventotto comme un seul mot.", "The h in ho, hai, ha and hanno is silent. In anni, hold n longer. Hear ventotto as one word.", "La h de ho, hai, ha y hanno es muda. En anni, mantén la n más tiempo. Escucha ventotto como una sola palabra."), practice: ["Ho", "Hai", "Hanno", "Anni", "Ventotto"] },
  reading: phrase("Lina ha ventotto anni. Ha un telefono e una penna, ma non ha una mappa. Omar ha trenta anni. Insieme hanno due biglietti.", "Lina a vingt-huit ans. Elle a un téléphone et un stylo, mais n’a pas de carte. Omar a trente ans. Ensemble, ils ont deux billets.", "Lina is twenty-eight. She has a phone and a pen, but no map. Omar is thirty. Together they have two tickets.", "Lina tiene veintiocho años. Tiene un teléfono y un bolígrafo, pero no tiene un mapa. Omar tiene treinta años. Juntos tienen dos billetes."),
  order: b2[4], recall: b2[3], accepted: ["Abbiamo due biglietti.", "Noi abbiamo due biglietti."],
  comprehension: choice("it1-u02-l2-read", t("Quel objet manque à Lina ?", "Which item does Lina lack?", "¿Qué objeto le falta a Lina?"), [
    option("a", "Una penna.", t("Elle a bien une penna.", "She does have a penna.", "Sí tiene una penna.")),
    option("b", "Un telefono.", t("Le téléphone est présent.", "The phone is present.", "El teléfono está presente.")),
    option("c", "Una mappa.", t("Non ha una mappa exprime le manque.", "Non ha una mappa expresses what is missing.", "Non ha una mappa expresa lo que falta.")),
  ], "c", t("Non avant ha nie la possession.", "Non before ha negates possession.", "Non delante de ha niega la posesión.")),
  listening: choice("it1-u02-l2-listen", t("Quel âge est annoncé ?", "What age is given?", "¿Qué edad se indica?"), [
    option("a", "18", t("Diciotto serait dix-huit.", "Diciotto would mean eighteen.", "Diciotto sería dieciocho.")),
    option("b", "21", t("Ventuno correspond à vingt et un.", "Ventuno means twenty-one.", "Ventuno corresponde a veintiuno.")),
    option("c", "28", t("Ventotto serait vingt-huit.", "Ventotto would mean twenty-eight.", "Ventotto sería veintiocho.")),
  ], "b", t("Ho ventuno anni : j’ai vingt et un ans.", "Ho ventuno anni: I am twenty-one.", "Ho ventuno anni: tengo veintiún años."), "listen", "Ho ventuno anni."),
  speaking: { prompt: t("Donne un âge fictif et deux possessions, puis pose une question.", "Give a fictional age and two possessions, then ask a question.", "Da una edad ficticia y dos posesiones y haz una pregunta."), checklist: [
    t("J’utilise ho avec l’âge.", "I use ho with age.", "Uso ho para la edad."),
    t("Je prononce le nombre choisi.", "I pronounce the number I chose.", "Pronuncio el número elegido."),
    t("Je pose une question avec hai.", "I ask a question with hai.", "Hago una pregunta con hai."),
  ] },
});
const b3 = [
  phrase("Sono insegnante.", "Je suis enseignant/enseignante.", "I am a teacher.", "Soy docente."),
  phrase("Sono studente.", "Je suis étudiant.", "I am a male student.", "Soy estudiante (masculino)."),
  phrase("Parlo francese.", "Je parle français.", "I speak French.", "Hablo francés."),
  phrase("Parlo italiano.", "Je parle italien.", "I speak Italian.", "Hablo italiano."),
  phrase("Che lavoro fai?", "Quel métier fais-tu ?", "What do you do for work?", "¿A qué te dedicas?"),
  phrase("Parli inglese?", "Parles-tu anglais ?", "Do you speak English?", "¿Hablas inglés?"),
  phrase("Sono studentessa.", "Je suis étudiante.", "I am a female student.", "Soy estudiante (femenino)."),
];
const u02l3 = lesson({
  id: "it1-u02-l3", title: t("Langues et occupations", "Languages and occupations", "Lenguas y ocupaciones"),
  goal: t("Dire une occupation et les langues parlées.", "State an occupation and the languages you speak.", "Decir una ocupación y las lenguas que hablas."), vocabulary: b3,
  grammar: { title: t("Relier deux informations", "Connect two facts", "Relacionar dos informaciones"), body: t(
    "Après essere, une profession simple peut apparaître sans article : Sono insegnante. Studente et studentessa donnent deux formes ; insegnante peut désigner différents genres selon le contexte. Pour les langues, retiens io parlo et tu parli ; la conjugaison complète viendra dans l’unité 4. E relie deux informations : Parlo francese e italiano. Non précède aussi parlo : Non parlo inglese. Che lavoro fai? est ici une formule complète. Ne confonds pas le e de liaison avec è, une forme de essere.",
    "After essere, a simple occupation may appear without an article: Sono insegnante. Studente and studentessa provide two forms; insegnante can refer to different genders depending on context. For languages, learn io parlo and tu parli; full conjugation comes in Unit 4. E connects two facts: Parlo francese e italiano. Non also precedes parlo: Non parlo inglese. Che lavoro fai? is a complete formula here. Do not confuse linking e with è, a form of essere.",
    "Después de essere, una profesión sencilla puede aparecer sin artículo: Sono insegnante. Studente y studentessa ofrecen dos formas; insegnante puede referirse a distintos géneros según el contexto. Para las lenguas, aprende io parlo y tu parli; la conjugación completa llegará en la unidad 4. E une dos informaciones: Parlo francese e italiano. Non también precede a parlo: Non parlo inglese. Che lavoro fai? es aquí una fórmula completa. No confundas e de enlace con è, del verbo essere."
  ), examples: [b3[0], phrase("Parlo francese e italiano.", "Je parle français et italien.", "I speak French and Italian.", "Hablo francés e italiano."), phrase("Non parlo inglese.", "Je ne parle pas anglais.", "I don't speak English.", "No hablo inglés.")] },
  pronunciation: { body: t("Dans insegnante, gn reprend le son de bagno. Dans inglese, g devant l garde un son dur. Fais entendre les finales différentes de parlo et parli.", "In insegnante, gn repeats the sound from bagno. In inglese, g before l keeps a hard sound. Make the endings of parlo and parli distinct.", "En insegnante, gn repite el sonido de bagno. En inglese, g delante de l mantiene un sonido fuerte. Distingue las terminaciones de parlo y parli."), practice: ["Insegnante", "Inglese", "Parlo", "Parli"] },
  reading: phrase("Mi chiamo Sara. Sono insegnante. Parlo italiano e inglese. Luca è studente e parla francese. Yoppo chiede a Sara: «Che lavoro fai?».", "Je m’appelle Sara. Je suis enseignante. Je parle italien et anglais. Luca est étudiant et parle français. Yoppo demande à Sara : « Quel métier fais-tu ? »", "My name is Sara. I am a teacher. I speak Italian and English. Luca is a student and speaks French. Yoppo asks Sara, ‘What do you do for work?’", "Me llamo Sara. Soy docente. Hablo italiano e inglés. Luca es estudiante y habla francés. Yoppo pregunta a Sara: «¿A qué te dedicas?»."),
  order: phrase("Parlo francese e italiano.", "Je parle français et italien.", "I speak French and Italian.", "Hablo francés e italiano."), recall: phrase("Non parlo inglese.", "Je ne parle pas anglais.", "I don't speak English.", "No hablo inglés."), accepted: ["Non parlo inglese.", "Io non parlo inglese.", "Non parlo l’inglese.", "Io non parlo l’inglese."],
  comprehension: choice("it1-u02-l3-read", t("Quelle est l’occupation de Sara ?", "What is Sara's occupation?", "¿Cuál es la ocupación de Sara?"), [
    option("a", "Insegnante.", t("Sara se présente ainsi.", "Sara introduces herself this way.", "Sara se presenta así.")),
    option("b", "Studentessa.", t("C’est Luca qui est étudiant.", "Luca is the student.", "Luca es quien estudia.")),
    option("c", "Barista.", t("Cette occupation n’est pas donnée.", "That occupation is not given.", "No se indica esa ocupación.")),
  ], "a", t("Sono insegnante donne une profession.", "Sono insegnante gives an occupation.", "Sono insegnante indica una profesión.")),
  listening: choice("it1-u02-l3-listen", t("Quelles langues sont annoncées ?", "Which languages are named?", "¿Qué lenguas se mencionan?"), [
    option("a", "Italiano e inglese.", t("Inglese n’est pas dans l’audio.", "Inglese is not in the recording.", "Inglese no aparece en el audio.")),
    option("b", "Francese e inglese.", t("Le deuxième nom n’est pas inglese.", "The second language is not inglese.", "La segunda lengua no es inglese.")),
    option("c", "Francese e italiano.", t("Ce sont les deux noms reliés par e.", "Those are the two names linked by e.", "Son los dos nombres unidos por e.")),
  ], "c", t("E relie francese et italiano.", "E links francese and italiano.", "E une francese e italiano."), "listen", "Parlo francese e italiano."),
  speaking: { prompt: t("Présente-toi avec une occupation et deux langues.", "Introduce yourself with an occupation and two languages.", "Preséntate con una ocupación y dos lenguas."), checklist: [
    t("Je donne un prénom réel ou fictif.", "I give a real or fictional name.", "Doy un nombre real o ficticio."),
    t("J’utilise sono pour une occupation.", "I use sono for an occupation.", "Uso sono para una ocupación."),
    t("Je relie deux langues avec e.", "I link two languages with e.", "Uno dos lenguas con e."),
  ] },
  extra: [dialogue("it1-u02-meeting", t("Un badge pour une rencontre", "A badge for a meeting", "Una identificación para un encuentro"), t("Joue Nina, étudiante canadienne de vingt-huit ans ; tu parles français.", "Play Nina, a twenty-eight-year-old Canadian student; you speak French.", "Interpreta a Nina, estudiante canadiense de veintiocho años; hablas francés."), [
    { speaker: "Yoppo", line: "Come ti chiami?", prompt: t("Donne le prénom du rôle.", "Give your character's name.", "Da el nombre del personaje."), correctId: "a", options: [
      option("a", "Mi chiamo Nina.", t("C’est le prénom demandé.", "That is the requested name.", "Es el nombre pedido.")),
      option("b", "Ho ventotto anni.", t("C’est l’âge, pas le nom.", "That is the age, not the name.", "Es la edad, no el nombre.")),
      option("c", "Parlo francese.", t("C’est une langue.", "That is a language.", "Es una lengua.")),
    ] },
    { speaker: "Yoppo", line: "Quanti anni hai?", prompt: t("Réponds pour ton personnage.", "Answer for your character.", "Responde por tu personaje."), correctId: "b", options: [
      option("a", "Sono ventotto anni.", t("Pour l’âge, utilise avere.", "Use avere for age.", "Para la edad, usa avere.")),
      option("b", "Ho ventotto anni.", t("Ho donne ici l’âge.", "Ho gives the age here.", "Ho da aquí la edad.")),
      option("c", "Ho diciotto anni.", t("Le rôle a vingt-huit ans, pas dix-huit.", "Your character is twenty-eight, not eighteen.", "El personaje tiene veintiocho años, no dieciocho.")),
    ] },
    { speaker: "Yoppo", line: "Che lavoro fai? Che lingua parli?", prompt: t("Tu étudies et tu parles français.", "You study and speak French.", "Estudias y hablas francés."), correctId: "c", options: [
      option("a", "Sono insegnante. Parlo inglese.", t("Ces deux détails ne correspondent pas au rôle.", "Those two facts do not fit your character.", "Esos dos datos no corresponden al personaje.")),
      option("b", "Sono canadese. Ho una penna.", t("Cela ne répond pas aux deux questions.", "That does not answer the two questions.", "Eso no responde a las dos preguntas.")),
      option("c", "Sono studentessa. Parlo francese.", t("Occupation et langue sont données.", "Occupation and language are given.", "Se dan la ocupación y la lengua.")),
    ] },
  ], t("Nom, âge, occupation et langue forment un petit portrait.", "Name, age, occupation and language form a short profile.", "Nombre, edad, ocupación y lengua forman una presentación."))],
});
const q02: CourseAssessment = {
  id: "it1-u02-quiz", title: t("Bilan 2 · une identité", "Review 2 · an identity", "Repaso 2 · una identidad"), description: t("Réutilise être, avoir et les présentations dans cinq nouveaux cas.", "Reuse essere, avere and introductions in five new cases.", "Reutiliza essere, avere y las presentaciones en cinco casos nuevos."), unitIds: ["u02"], passPercent: 80,
  questions: [
    choice("it1-u02-q1", t("Complète : Noi … canadesi.", "Complete: Noi … canadesi.", "Completa: Noi … canadesi."), [
      option("a", "sei", t("Sei correspond à tu.", "Sei goes with tu.", "Sei corresponde a tu.")),
      option("b", "siamo", t("Siamo correspond à noi.", "Siamo goes with noi.", "Siamo corresponde a noi.")),
      option("c", "è", t("È est au singulier.", "È is singular.", "È es singular.")),
    ], "b", t("Noi siamo canadesi.", "We are Canadian.", "Somos canadienses.")),
    choice("it1-u02-q2", t("Quel âge est annoncé ?", "What age is given?", "¿Qué edad se indica?"), [
      option("a", "30", t("Trenta serait trente.", "Trenta would mean thirty.", "Trenta sería treinta.")),
      option("b", "28", t("Ventotto serait vingt-huit.", "Ventotto would mean twenty-eight.", "Ventotto sería veintiocho.")),
      option("c", "32", t("Trentadue associe trente et deux.", "Trentadue combines thirty and two.", "Trentadue combina treinta y dos.")),
    ], "c", t("Trenta + due donne trentadue.", "Trenta + due gives trentadue.", "Trenta + due forma trentadue."), "listen", "Sono Paolo. Ho trentadue anni."),
    recall("it1-u02-q3", phrase("Abbiamo una mappa.", "Nous avons une carte.", "We have a map.", "Tenemos un mapa."), ["Abbiamo una mappa.", "Noi abbiamo una mappa."]),
    choice("it1-u02-q4", t("Marta dit : Sono insegnante e parlo inglese. À quelle question répond-elle ?", "Marta says: Sono insegnante e parlo inglese. Which question does she answer?", "Marta dice: Sono insegnante e parlo inglese. ¿A qué pregunta responde?"), [
      option("a", "Che lavoro fai?", t("Insegnante donne l’occupation.", "Insegnante gives the occupation.", "Insegnante indica la ocupación.")),
      option("b", "Quanti anni hai?", t("Aucun âge n’est donné.", "No age is given.", "No se da ninguna edad.")),
      option("c", "Di dove sei?", t("Aucune origine n’est donnée.", "No origin is given.", "No se indica ningún origen.")),
    ], "a", t("Une profession répond à Che lavoro fai?", "An occupation answers Che lavoro fai?", "Una profesión responde a Che lavoro fai?")),
    choice("it1-u02-q5", t("Tu n’as pas de téléphone. Quelle phrase l’exprime ?", "You do not have a phone. Which sentence expresses this?", "No tienes teléfono. ¿Qué frase lo expresa?"), [
      option("a", "Sono un telefono.", t("Sono exprime ici une identité.", "Sono expresses identity here.", "Sono expresa aquí identidad.")),
      option("b", "Non ho un telefono.", t("Non précède ho pour nier la possession.", "Non precedes ho to negate possession.", "Non precede a ho para negar la posesión.")),
      option("c", "Ho un telefono.", t("Cette phrase affirme la possession.", "That sentence affirms possession.", "Esa frase afirma la posesión.")),
    ], "b", t("Non ho est le négatif de ho.", "Non ho is the negative of ho.", "Non ho es la negación de ho.")),
  ],
};
const u02: CourseUnit = {
  id: "u02", number: 2, title: t("Qui es-tu ?", "Who are you?", "¿Quién eres?"), subtitle: t("Nom, origine, âge, langues et occupations.", "Name, origin, age, languages and occupations.", "Nombre, origen, edad, lenguas y ocupaciones."),
  objectives: [
    t("Conjuguer essere et avere au présent.", "Conjugate essere and avere in the present.", "Conjugar essere y avere en presente."),
    t("Présenter une identité réelle ou fictive.", "Present a real or fictional identity.", "Presentar una identidad real o inventada."),
    t("Poser des questions sur une personne.", "Ask questions about a person.", "Hacer preguntas sobre una persona."),
  ], lessons: [u02l1, u02l2, u02l3], quiz: q02,
  production: { id: "it1-u02-project", title: t("Ton badge de rencontre", "Your meeting badge", "Tu identificación para un encuentro"), prompt: t("Rédige cinq phrases pour un personnage : prénom, ville, nationalité, âge et occupation ou langues. Termine par une question. Tu peux inventer tous les renseignements.", "Write five sentences for a character: name, city, nationality, age, and occupation or languages. End with a question. You may invent every detail.", "Escribe cinco frases para un personaje: nombre, ciudad, nacionalidad, edad y ocupación o lenguas. Termina con una pregunta. Puedes inventar todos los datos."), model: "Mi chiamo Elisa. Sono italiana, di Bologna. Ho trenta anni. Sono insegnante. Parlo italiano e francese. E tu, di dove sei?", rubric: [
    t("J’inclus les cinq informations demandées.", "I include the five requested facts.", "Incluyo los cinco datos pedidos."),
    t("Je distingue sono et ho.", "I distinguish sono from ho.", "Distingo sono de ho."),
    t("J’écris au moins un nombre en lettres.", "I write at least one number in words.", "Escribo al menos un número con letras."),
    t("Je termine par une question compréhensible.", "I finish with an understandable question.", "Termino con una pregunta comprensible."),
  ] },
  culture: { title: t("Une identité n’est pas une case unique", "An identity is not one box", "Una identidad no es una sola casilla"), body: t("Tu peux évoquer plusieurs langues, plusieurs lieux importants ou une occupation actuelle sans résumer toute une personne. Les identités peuvent être inventées dans ce cours. L’objectif est linguistique : choisir essere, avere et une question adaptée, sans exiger de renseignements personnels réels.", "You can mention several languages, important places or a current occupation without reducing a person to those facts. Identities may be invented in this course. The aim is linguistic: choose essere, avere and an appropriate question without requiring real personal information.", "Puedes mencionar varias lenguas, lugares importantes o una ocupación actual sin reducir una persona a esos datos. Las identidades pueden inventarse en este curso. El objetivo es lingüístico: elegir essere, avere y una pregunta adecuada sin exigir datos personales reales."), sourceIds: ["udine-a1"] },
};


const c1 = [
  phrase("Il libro.", "Le livre.", "The book.", "El libro."),
  phrase("I libri.", "Les livres.", "The books.", "Los libros."),
  phrase("La casa.", "La maison.", "The house.", "La casa."),
  phrase("Le case.", "Les maisons.", "The houses.", "Las casas."),
  phrase("Lo studente.", "L’étudiant.", "The male student.", "El estudiante."),
  phrase("Gli studenti.", "Les étudiants.", "The students.", "Los estudiantes."),
  phrase("Un’amica.", "Une amie.", "A female friend.", "Una amiga."),
  phrase("Un amico.", "Un ami.", "A male friend.", "Un amigo."),
];
const u03l1 = lesson({
  id: "it1-u03-l1", title: t("Un objet, plusieurs objets", "One object, several objects", "Un objeto, varios objetos"),
  goal: t("Associer un article au genre et au nombre du nom.", "Match an article to the noun's gender and number.", "Relacionar el artículo con el género y número del nombre."), vocabulary: c1,
  grammar: { title: t("Articles et pluriels", "Articles and plurals", "Artículos y plurales"), body: t(
    "Les articles définis indiquent un nom identifié : il libro devient i libri ; la casa devient le case. Devant s + consonne, le masculin utilise lo et gli : lo studente, gli studenti. Devant une voyelle : l’amico, gli amici ; l’amica, le amiche. Au singulier indéfini : un libro, uno studente, una casa, un’amica. Un amico n’a pas d’apostrophe. Beaucoup de noms en -o font leur pluriel en -i, ceux en -a en -e, ceux en -e en -i. Apprends les exceptions avec leur article.",
    "Definite articles identify a noun: il libro becomes i libri; la casa becomes le case. Before s + consonant, masculine nouns use lo and gli: lo studente, gli studenti. Before a vowel: l’amico, gli amici; l’amica, le amiche. Indefinite singular forms include un libro, uno studente, una casa and un’amica. Un amico has no apostrophe. Many nouns in -o form a plural in -i, those in -a in -e, and those in -e in -i. Learn exceptions with their articles.",
    "Los artículos definidos identifican un nombre: il libro pasa a i libri; la casa pasa a le case. Ante s + consonante, el masculino usa lo y gli: lo studente, gli studenti. Ante vocal: l’amico, gli amici; l’amica, le amiche. En singular indefinido: un libro, uno studente, una casa, un’amica. Un amico no lleva apóstrofo. Muchos nombres en -o hacen el plural en -i, los de -a en -e y los de -e en -i. Aprende las excepciones con su artículo."
  ), examples: [
    phrase("Ho un libro e una penna.", "J’ai un livre et un stylo.", "I have a book and a pen.", "Tengo un libro y un bolígrafo."),
    phrase("I libri sono qui.", "Les livres sont ici.", "The books are here.", "Los libros están aquí."),
    c1[4], c1[5],
  ] },
  pronunciation: { body: t("Écoute les petites finales : libro/libri, casa/case. L’apostrophe de un’amica ne crée pas de pause ; les mots s’enchaînent. Dans amiche, ch garde le son dur.", "Listen for the small endings: libro/libri, casa/case. The apostrophe in un’amica does not create a pause; the words flow together. In amiche, ch keeps the hard sound.", "Escucha las terminaciones: libro/libri, casa/case. El apóstrofo de un’amica no crea una pausa; las palabras se enlazan. En amiche, ch mantiene el sonido fuerte."), practice: ["Libro", "Libri", "Casa", "Case", "Un’amica", "Amiche"] },
  reading: phrase("Nina ha un libro e una penna. Omar ha due libri. I libri sono qui. Una studentessa arriva con un’amica. Gli studenti salutano: «Buongiorno!».", "Nina a un livre et un stylo. Omar a deux livres. Les livres sont ici. Une étudiante arrive avec une amie. Les étudiants saluent : « Bonjour ! »", "Nina has a book and a pen. Omar has two books. The books are here. A female student arrives with a friend. The students greet them: ‘Good morning!’", "Nina tiene un libro y un bolígrafo. Omar tiene dos libros. Los libros están aquí. Una estudiante llega con una amiga. Los estudiantes saludan: «¡Buenos días!»."),
  order: phrase("Ho un libro e una penna.", "J’ai un livre et un stylo.", "I have a book and a pen.", "Tengo un libro y un bolígrafo."), recall: phrase("I libri sono qui.", "Les livres sont ici.", "The books are here.", "Los libros están aquí."),
  comprehension: choice("it1-u03-l1-read", t("Qui a deux livres ?", "Who has two books?", "¿Quién tiene dos libros?"), [
    option("a", "Nina.", t("Nina a un livre.", "Nina has one book.", "Nina tiene un libro.")),
    option("b", "Omar.", t("Omar a deux livres.", "Omar has two books.", "Omar tiene dos libros.")),
    option("c", "L’amica.", t("Le texte ne lui attribue pas de livres.", "The text gives her no books.", "El texto no le atribuye libros.")),
  ], "b", t("Due appelle le pluriel libri.", "Due requires the plural libri.", "Due requiere el plural libri.")),
  listening: choice("it1-u03-l1-listen", t("Le groupe entendu est-il singulier ou pluriel ?", "Is the phrase you hear singular or plural?", "¿El grupo que oyes es singular o plural?"), [
    option("a", "Una casa.", t("Una casa serait singulier.", "Una casa would be singular.", "Una casa sería singular.")),
    option("b", "Il libro.", t("Libro est un autre nom.", "Libro is a different noun.", "Libro es otro nombre.")),
    option("c", "Le case.", t("Le et -e indiquent ici le pluriel féminin.", "Le and -e mark the feminine plural here.", "Le y -e indican aquí el plural femenino.")),
  ], "c", t("Le case : plusieurs maisons.", "Le case: several houses.", "Le case: varias casas."), "listen", "Le case."),
  speaking: { prompt: t("Montre ou imagine trois objets et passe du singulier au pluriel.", "Show or imagine three objects and change singular to plural.", "Muestra o imagina tres objetos y pasa del singular al plural."), checklist: [
    t("Je change l’article et la fin du nom.", "I change the article and noun ending.", "Cambio el artículo y la terminación."),
    t("J’utilise lo/gli avec studente/studenti.", "I use lo/gli with studente/studenti.", "Uso lo/gli con studente/studenti."),
    t("Je prononce les finales sans les avaler.", "I make the endings audible.", "Pronuncio claramente las terminaciones."),
  ] },
});
const c2 = [
  phrase("Il ragazzo è alto.", "Le garçon est grand.", "The boy is tall.", "El chico es alto."),
  phrase("La ragazza è alta.", "La fille est grande.", "The girl is tall.", "La chica es alta."),
  phrase("I ragazzi sono alti.", "Les garçons sont grands.", "The boys are tall.", "Los chicos son altos."),
  phrase("Le ragazze sono alte.", "Les filles sont grandes.", "The girls are tall.", "Las chicas son altas."),
  phrase("Il libro è interessante.", "Le livre est intéressant.", "The book is interesting.", "El libro es interesante."),
  phrase("Le case sono grandi.", "Les maisons sont grandes.", "The houses are big.", "Las casas son grandes."),
];
const u03l2 = lesson({
  id: "it1-u03-l2", title: t("Décrire avec précision", "Describe precisely", "Describir con precisión"),
  goal: t("Accorder des adjectifs avec les personnes et les objets.", "Make adjectives agree with people and objects.", "Concordar adjetivos con personas y objetos."), vocabulary: c2,
  grammar: { title: t("Quatre formes ou deux", "Four forms or two", "Cuatro formas o dos"), body: t(
    "Un adjectif en -o varie souvent en -o, -a, -i, -e : alto, alta, alti, alte. Il suit le genre et le nombre du nom, pas ceux de la personne qui parle. Un adjectif en -e a généralement une forme singulière commune et un pluriel en -i : interessante/interessanti, grande/grandi. Le verbe suit aussi le sujet : è au singulier, sono au pluriel. Pour montrer : questo libro, questa casa, questi libri, queste case. Apprends ces accords comme des groupes complets.",
    "An adjective in -o often has four forms: alto, alta, alti, alte. It follows the noun's gender and number, not the speaker's. An adjective in -e generally has one shared singular form and a plural in -i: interessante/interessanti, grande/grandi. The verb also follows the subject: è for singular, sono for plural. To point things out: questo libro, questa casa, questi libri, queste case. Learn these agreements as complete groups.",
    "Un adjetivo en -o suele tener cuatro formas: alto, alta, alti, alte. Sigue el género y número del nombre, no los de quien habla. Un adjetivo en -e suele tener una forma singular común y un plural en -i: interessante/interessanti, grande/grandi. El verbo también sigue al sujeto: è en singular, sono en plural. Para señalar: questo libro, questa casa, questi libri, queste case. Aprende estas concordancias como grupos completos."
  ), examples: [c2[1], c2[2], c2[5], phrase("Questi libri sono interessanti.", "Ces livres sont intéressants.", "These books are interesting.", "Estos libros son interesantes.")] },
  pronunciation: { body: t("La différence entre alta et alte tient à la dernière voyelle. Dans interessante, l’accent tombe sur san : in-te-res-SAN-te. Les finales doivent rester audibles même dans une phrase.", "The difference between alta and alte is the final vowel. In interessante, stress san: in-te-res-SAN-te. Keep endings audible within sentences.", "La diferencia entre alta y alte está en la última vocal. En interessante, acentúa san: in-te-res-SAN-te. Mantén audibles las terminaciones dentro de una frase."), practice: ["Alto", "Alta", "Alti", "Alte", "Interessante", "Interessanti"] },
  reading: phrase("Le case sono grandi. I libri sono interessanti. La ragazza è alta e il ragazzo è alto. Yoppo guarda i libri: «Questi libri sono interessanti!»", "Les maisons sont grandes. Les livres sont intéressants. La fille est grande et le garçon est grand. Yoppo regarde les livres : « Ces livres sont intéressants ! »", "The houses are big. The books are interesting. The girl is tall and the boy is tall. Yoppo looks at the books: ‘These books are interesting!’", "Las casas son grandes. Los libros son interesantes. La chica es alta y el chico es alto. Yoppo mira los libros: «¡Estos libros son interesantes!»"),
  order: c2[5], recall: c2[1],
  comprehension: choice("it1-u03-l2-read", t("Quelle description correspond aux livres ?", "Which description matches the books?", "¿Qué descripción corresponde a los libros?"), [
    option("a", "Sono interessanti.", t("C’est l’adjectif du texte.", "That is the adjective in the text.", "Es el adjetivo del texto.")),
    option("b", "Sono alte.", t("Alte décrirait ici un nom féminin pluriel.", "Alte would describe a feminine plural noun.", "Alte describiría un nombre femenino plural.")),
    option("c", "È interessante.", t("È serait singulier, mais il y a plusieurs livres.", "È would be singular, but there are several books.", "È sería singular, pero hay varios libros.")),
  ], "a", t("Libri est pluriel : sono interessanti.", "Libri is plural: sono interessanti.", "Libri es plural: sono interessanti.")),
  listening: choice("it1-u03-l2-listen", t("Quel groupe est décrit ?", "Which group is described?", "¿Qué grupo se describe?"), [
    option("a", "Il ragazzo.", t("Un seul garçon demanderait è alto.", "One boy would require è alto.", "Un chico requeriría è alto.")),
    option("b", "Le ragazze.", t("Tu entends le pluriel féminin alte.", "You hear the feminine plural alte.", "Oyes el plural femenino alte.")),
    option("c", "I libri.", t("Le mot entendu est ragazze.", "The word heard is ragazze.", "La palabra escuchada es ragazze.")),
  ], "b", t("Le ragazze sono alte : les trois formes vont ensemble.", "Le ragazze sono alte: the three forms fit together.", "Le ragazze sono alte: las tres formas concuerdan."), "listen", "Le ragazze sono alte."),
  speaking: { prompt: t("Décris une personne et deux objets, réels ou imaginaires.", "Describe one person and two real or imaginary objects.", "Describe una persona y dos objetos reales o imaginarios."), checklist: [
    t("J’accorde au moins un adjectif en -o.", "I make one -o adjective agree.", "Concuerdo al menos un adjetivo en -o."),
    t("J’utilise un adjectif en -e au pluriel.", "I use an -e adjective in the plural.", "Uso un adjetivo en -e en plural."),
    t("Je distingue è et sono.", "I distinguish è from sono.", "Distingo è de sono."),
  ] },
});
const c3 = [
  phrase("Mia madre.", "Ma mère.", "My mother.", "Mi madre."),
  phrase("Mio padre.", "Mon père.", "My father.", "Mi padre."),
  phrase("Mia sorella.", "Ma sœur.", "My sister.", "Mi hermana."),
  phrase("I miei fratelli.", "Mes frères.", "My brothers.", "Mis hermanos."),
  phrase("La mia famiglia.", "Ma famille.", "My family.", "Mi familia."),
  phrase("I nostri amici.", "Nos amis.", "Our friends.", "Nuestros amigos."),
  phrase("Sua sorella.", "Sa sœur.", "His/her sister.", "Su hermana."),
];
const u03l3 = lesson({
  id: "it1-u03-l3", title: t("Les personnes importantes", "Important people", "Las personas importantes"),
  goal: t("Présenter quelques relations avec les possessifs.", "Describe some relationships with possessives.", "Presentar algunas relaciones con posesivos."), vocabulary: c3,
  grammar: { title: t("Le possessif s’accorde avec le nom", "The possessive agrees with the noun", "El posesivo concuerda con el nombre"), body: t(
    "Mio, mia, miei, mie s’accordent avec ce qui est nommé : mio padre, mia sorella, i miei fratelli. Même logique pour tuo/tua/tuoi/tue, suo/sua/suoi/sue, nostro/nostra/nostri/nostre et vostro/vostra/vostri/vostre. Loro ne change pas. L’article accompagne généralement le possessif : la mia famiglia, i nostri amici. Avec un nom de parenté singulier non modifié, on l’omet souvent : mia madre, tuo padre ; au pluriel, on le retrouve. Sua peut signifier « sa » à lui ou à elle : le contexte précise la personne.",
    "Mio, mia, miei and mie agree with what is named: mio padre, mia sorella, i miei fratelli. The same pattern applies to tuo/tua/tuoi/tue, suo/sua/suoi/sue, nostro/nostra/nostri/nostre and vostro/vostra/vostri/vostre. Loro does not change. The article generally accompanies a possessive: la mia famiglia, i nostri amici. With an unmodified singular family noun, it is often omitted: mia madre, tuo padre; it returns in the plural. Sua may mean his or her: context identifies the person.",
    "Mio, mia, miei y mie concuerdan con lo nombrado: mio padre, mia sorella, i miei fratelli. El mismo patrón vale para tuo/tua/tuoi/tue, suo/sua/suoi/sue, nostro/nostra/nostri/nostre y vostro/vostra/vostri/vostre. Loro no cambia. El artículo suele acompañar al posesivo: la mia famiglia, i nostri amici. Con un nombre de parentesco singular sin modificar, suele omitirse: mia madre, tuo padre; en plural reaparece. Sua puede significar su de él o de ella: el contexto identifica a la persona."
  ), examples: [
    phrase("Mia sorella è studentessa.", "Ma sœur est étudiante.", "My sister is a student.", "Mi hermana es estudiante."),
    phrase("I nostri amici sono qui.", "Nos amis sont ici.", "Our friends are here.", "Nuestros amigos están aquí."),
    phrase("La mia famiglia è grande.", "Ma famille est grande.", "My family is big.", "Mi familia es grande."),
  ] },
  pronunciation: { body: t("Sépare les voyelles de mia sans avaler la dernière. Dans famiglia, gli forme un son proche de ll dans certaines prononciations espagnoles ; écoute le modèle et garde tout le groupe ensemble.", "Keep the vowels in mia audible. In famiglia, gli forms a palatal sound, rather than separate g and l sounds. Listen to the model and keep the group together.", "Deja oír las vocales de mia. En famiglia, gli forma un sonido palatal próximo a ll en algunas variedades del español; escucha el modelo y mantén unido el grupo."), practice: ["Mia", "Miei", "Famiglia", "Fratelli", "Nostri"] },
  reading: phrase("Mi chiamo Ada. Mia sorella è studentessa. Mio padre è insegnante. I nostri amici sono qui. La mia famiglia è piccola, ma il gruppo oggi è grande.", "Je m’appelle Ada. Ma sœur est étudiante. Mon père est enseignant. Nos amis sont ici. Ma famille est petite, mais le groupe est grand aujourd’hui.", "My name is Ada. My sister is a student. My father is a teacher. Our friends are here. My family is small, but today's group is big.", "Me llamo Ada. Mi hermana es estudiante. Mi padre es docente. Nuestros amigos están aquí. Mi familia es pequeña, pero hoy el grupo es grande."),
  order: phrase("Mia sorella è studentessa.", "Ma sœur est étudiante.", "My sister is a student.", "Mi hermana es estudiante."), recall: phrase("I nostri amici sono qui.", "Nos amis sont ici.", "Our friends are here.", "Nuestros amigos están aquí."),
  comprehension: choice("it1-u03-l3-read", t("Qui est enseignant ?", "Who is a teacher?", "¿Quién es docente?"), [
    option("a", "La sorella di Ada.", t("Sa sœur est étudiante.", "Her sister is a student.", "Su hermana es estudiante.")),
    option("b", "Gli amici di Ada.", t("Leur occupation n’est pas donnée.", "Their occupation is not given.", "No se indica su ocupación.")),
    option("c", "Il padre di Ada.", t("Mio padre è insegnante le précise.", "Mio padre è insegnante gives that fact.", "Mio padre è insegnante lo indica.")),
  ], "c", t("Mio padre désigne le père de la personne qui parle.", "Mio padre means the speaker's father.", "Mio padre designa al padre de quien habla.")),
  listening: choice("it1-u03-l3-listen", t("De quelles personnes parle-t-on ?", "Which people are mentioned?", "¿De qué personas se habla?"), [
    option("a", "I fratelli.", t("Fratelli serait les frères.", "Fratelli would mean brothers.", "Fratelli serían los hermanos.")),
    option("b", "Gli amici.", t("Tu entends nostri amici.", "You hear nostri amici.", "Oyes nostri amici.")),
    option("c", "La madre.", t("Une mère serait au singulier.", "A mother would be singular.", "Una madre sería singular.")),
  ], "b", t("I nostri amici : nos amis.", "I nostri amici: our friends.", "I nostri amici: nuestros amigos."), "listen", "I nostri amici sono qui."),
  speaking: { prompt: t("Présente trois personnes importantes, réelles ou fictives.", "Introduce three important real or fictional people.", "Presenta a tres personas importantes, reales o inventadas."), checklist: [
    t("Je choisis mio ou mia selon le nom.", "I choose mio or mia for the noun.", "Elijo mio o mia según el nombre."),
    t("J’emploie un groupe pluriel avec article.", "I use a plural group with an article.", "Uso un grupo plural con artículo."),
    t("J’ajoute une occupation ou une description.", "I add an occupation or description.", "Añado una ocupación o descripción."),
  ] },
  extra: [dialogue("it1-u03-people", t("La photo inventée", "The invented photograph", "La foto inventada"), t("Tu joues Ada. Sa sœur est étudiante ; son père est enseignant ; ses amis sont ici.", "You play Ada. Her sister is a student, her father is a teacher, and her friends are here.", "Interpretas a Ada. Su hermana es estudiante; su padre es docente; sus amigos están aquí."), [
    { speaker: "Yoppo", line: "Tua sorella è insegnante?", prompt: t("Corrige l’occupation de ta sœur.", "Correct your sister's occupation.", "Corrige la ocupación de tu hermana."), correctId: "a", options: [
      option("a", "No, mia sorella è studentessa.", t("Tu corriges tout en gardant mia sorella.", "You correct while keeping mia sorella.", "Corriges manteniendo mia sorella.")),
      option("b", "Sì, mio padre è insegnante.", t("Tu changes de personne au lieu de répondre.", "You change the person instead of answering.", "Cambias de persona en vez de responder.")),
      option("c", "No, mio sorella è studente.", t("Sorella demande mia ; le rôle est studentessa.", "Sorella needs mia; the role uses studentessa.", "Sorella requiere mia; el papel usa studentessa.")),
    ] },
    { speaker: "Yoppo", line: "E tuo padre?", prompt: t("Donne son occupation.", "Give his occupation.", "Indica su ocupación."), correctId: "b", options: [
      option("a", "Mia padre è studente.", t("Padre demande mio et le rôle est enseignant.", "Padre needs mio and the role is teacher.", "Padre requiere mio y el papel es docente.")),
      option("b", "Mio padre è insegnante.", t("Possessif et occupation correspondent.", "Possessive and occupation fit.", "Coinciden el posesivo y la ocupación.")),
      option("c", "I miei fratelli sono qui.", t("Tu réponds à propos des frères.", "You answer about brothers.", "Respondes sobre los hermanos.")),
    ] },
    { speaker: "Yoppo", line: "Dove sono i vostri amici?", prompt: t("Dis qu’ils sont ici.", "Say they are here.", "Di que están aquí."), correctId: "c", options: [
      option("a", "Il nostro amici è qui.", t("Amici est pluriel : i nostri et sono.", "Amici is plural: i nostri and sono.", "Amici es plural: i nostri y sono.")),
      option("b", "La mia famiglia è piccola.", t("Cette phrase ne donne pas le lieu des amis.", "This does not locate the friends.", "Esto no sitúa a los amigos.")),
      option("c", "I nostri amici sono qui.", t("Le groupe pluriel est cohérent.", "The plural group is consistent.", "El grupo plural concuerda.")),
    ] },
  ], t("Le possessif suit le nom : mia sorella, mio padre, i nostri amici.", "The possessive agrees with the noun: mia sorella, mio padre, i nostri amici.", "El posesivo concuerda con el nombre: mia sorella, mio padre, i nostri amici."))],
});
const q03: CourseAssessment = {
  id: "it1-u03-quiz", title: t("Bilan 3 · les accords", "Review 3 · agreement", "Repaso 3 · las concordancias"), description: t("Transfère les articles, les pluriels et les possessifs.", "Transfer articles, plurals and possessives.", "Aplica los artículos, plurales y posesivos."), unitIds: ["u03"], passPercent: 80,
  questions: [
    choice("it1-u03-q1", t("Complète : Ho due …", "Complete: Ho due …", "Completa: Ho due …"), [
      option("a", "libro.", t("Libro est singulier.", "Libro is singular.", "Libro es singular.")),
      option("b", "libri.", t("Due demande le pluriel libri.", "Due requires plural libri.", "Due requiere el plural libri.")),
      option("c", "libra.", t("Ce n’est pas le pluriel de libro.", "That is not the plural of libro.", "No es el plural de libro.")),
    ], "b", t("Ho due libri.", "I have two books.", "Tengo dos libros.")),
    choice("it1-u03-q2", t("Complète : Queste case sono …", "Complete: Queste case sono …", "Completa: Queste case sono …"), [
      option("a", "grande.", t("Grande est singulier.", "Grande is singular.", "Grande es singular.")),
      option("b", "granda.", t("Grande n’a pas cette forme féminine.", "Grande does not have that feminine form.", "Grande no tiene esa forma femenina.")),
      option("c", "grandi.", t("L’adjectif en -e fait ici son pluriel en -i.", "This -e adjective forms its plural in -i.", "El adjetivo en -e forma aquí el plural en -i.")),
    ], "c", t("Queste case sono grandi.", "These houses are big.", "Estas casas son grandes.")),
    choice("it1-u03-q3", t("Combien de frères la personne a-t-elle ?", "How many brothers does the person have?", "¿Cuántos hermanos varones tiene la persona?"), [
      option("a", "Due.", t("Due fratelli est annoncé.", "Due fratelli is stated.", "Se dice due fratelli.")),
      option("b", "Uno.", t("Una décrit la sœur, pas les frères.", "Una describes the sister, not the brothers.", "Una describe a la hermana, no a los hermanos.")),
      option("c", "Tre.", t("Trois est le total des frères et sœur.", "Three is the total number of siblings.", "Tres es el total de hermanos y hermana.")),
    ], "a", t("Una sorella e due fratelli : une sœur et deux frères.", "Una sorella e due fratelli: one sister and two brothers.", "Una sorella e due fratelli: una hermana y dos hermanos."), "listen", "Ho una sorella e due fratelli."),
    recall("it1-u03-q4", phrase("Mia madre è insegnante.", "Ma mère est enseignante.", "My mother is a teacher.", "Mi madre es docente."), ["Mia madre è insegnante.", "Mia madre è un’insegnante."]),
    choice("it1-u03-q5", t("Tu parles de la mère de Marta. Quel groupe signifie « sa mère » ?", "You refer to Marta’s mother. Which phrase means her mother?", "Te refieres a la madre de Marta. ¿Qué grupo significa su madre?"), [
      option("a", "Suo madre.", t("Madre est féminin : sua.", "Madre is feminine: sua.", "Madre es femenino: sua.")),
      option("b", "Sua madre.", t("Sua s’accorde avec madre.", "Sua agrees with madre.", "Sua concuerda con madre.")),
      option("c", "I suoi madre.", t("L’article et le possessif sont pluriels ici.", "The article and possessive are plural here.", "Aquí el artículo y el posesivo son plurales.")),
    ], "b", t("Sua madre fonctionne quel que soit le genre du possesseur.", "Sua madre works regardless of the possessor's gender.", "Sua madre funciona con independencia del género de quien posee.")),
  ],
};
const u03: CourseUnit = {
  id: "u03", number: 3, title: t("Décrire son entourage", "Describe your circle", "Describir tu entorno"), subtitle: t("Famille, objets, articles et accords.", "Family, objects, articles and agreement.", "Familia, objetos, artículos y concordancias."),
  objectives: [
    t("Passer des groupes nominaux au pluriel.", "Change noun groups into the plural.", "Pasar grupos nominales al plural."),
    t("Accorder des adjectifs simples.", "Make simple adjectives agree.", "Concordar adjetivos sencillos."),
    t("Parler de relations avec les possessifs.", "Talk about relationships with possessives.", "Hablar de relaciones con posesivos."),
  ], lessons: [u03l1, u03l2, u03l3], quiz: q03,
  production: { id: "it1-u03-project", title: t("Un petit portrait de groupe", "A short group portrait", "Una pequeña descripción de grupo"), prompt: t("Décris en cinq phrases une famille, un groupe d’amis ou des personnages inventés. Donne deux relations, une occupation et deux descriptions. Inclus un groupe singulier et un groupe pluriel.", "Describe a family, a group of friends or fictional characters in five sentences. Give two relationships, an occupation and two descriptions. Include a singular group and a plural group.", "Describe en cinco frases una familia, un grupo de amigos o personajes inventados. Da dos relaciones, una ocupación y dos descripciones. Incluye un grupo singular y uno plural."), model: "Mia sorella è studentessa. Mio padre è insegnante. I nostri amici sono qui. Le ragazze sono alte. La mia famiglia è piccola.", rubric: [
    t("Mes relations utilisent des possessifs adaptés.", "My relationships use suitable possessives.", "Mis relaciones usan posesivos adecuados."),
    t("Un nom et un adjectif sont au pluriel.", "A noun and an adjective are plural.", "Un nombre y un adjetivo están en plural."),
    t("J’accorde è/sono avec le sujet.", "I match è/sono to the subject.", "Concuerdo è/sono con el sujeto."),
    t("Mes cinq phrases décrivent un groupe cohérent.", "My five sentences describe a coherent group.", "Mis cinco frases describen un grupo coherente."),
  ] },
  culture: { title: t("Parler des liens avec tact", "Talk about relationships thoughtfully", "Hablar de vínculos con cuidado"), body: t("Les noms de famille de la leçon servent à décrire des liens, sans supposer une seule organisation familiale. Tu peux présenter des amis ou des personnages fictifs. Une observation utile de langue : mia madre n’a généralement pas d’article dans cet emploi, mais i miei fratelli en a un. Le genre du possessif suit le nom décrit.", "The lesson's family nouns describe relationships without assuming one family structure. You may introduce friends or fictional characters. A useful language observation: mia madre generally has no article in this use, but i miei fratelli does. The possessive's gender follows the noun described.", "Los nombres de familia de la lección describen vínculos sin suponer una sola organización familiar. Puedes presentar amigos o personajes ficticios. Una observación lingüística útil: mia madre suele ir sin artículo en este uso, pero i miei fratelli lleva uno. El género del posesivo sigue al nombre descrito."), sourceIds: ["udine-a1"] },
};


const d1 = [
  phrase("Parlo italiano.", "Je parle italien.", "I speak Italian.", "Hablo italiano."),
  phrase("Prendo un tè.", "Je prends un thé.", "I have a tea.", "Tomo un té."),
  phrase("Dormo otto ore.", "Je dors huit heures.", "I sleep eight hours.", "Duermo ocho horas."),
  phrase("Studiamo insieme.", "Nous étudions ensemble.", "We study together.", "Estudiamos juntos."),
  phrase("Tu leggi un libro.", "Tu lis un livre.", "You read a book.", "Tú lees un libro."),
  phrase("Capisco la domanda.", "Je comprends la question.", "I understand the question.", "Entiendo la pregunta."),
];
const u04l1 = lesson({
  id: "it1-u04-l1", title: t("Ce qu’on fait", "What we do", "Lo que hacemos"),
  goal: t("Employer le présent des trois groupes de verbes.", "Use the present tense of the three verb groups.", "Usar el presente de los tres grupos verbales."), vocabulary: d1,
  grammar: { title: t("Trois terminaisons d’infinitif", "Three infinitive endings", "Tres terminaciones de infinitivo"), body: t(
    "Pour un verbe régulier, retire -are, -ere ou -ire et ajoute la terminaison du sujet. Parlare : parlo, parli, parla, parliamo, parlate, parlano. Prendere : prendo, prendi, prende, prendiamo, prendete, prendono. Dormire : dormo, dormi, dorme, dormiamo, dormite, dormono. Ces séries suivent io, tu, lui/lei, noi, voi, loro. Certains verbes en -ire ajoutent -isc- : capisco, capisci, capisce, capiamo, capite, capiscono. Le présent peut décrire une habitude. Non précède le verbe : non dormo.",
    "For a regular verb, remove -are, -ere or -ire and add the subject ending. Parlare: parlo, parli, parla, parliamo, parlate, parlano. Prendere: prendo, prendi, prende, prendiamo, prendete, prendono. Dormire: dormo, dormi, dorme, dormiamo, dormite, dormono. These series follow io, tu, lui/lei, noi, voi, loro. Some -ire verbs add -isc-: capisco, capisci, capisce, capiamo, capite, capiscono. The present may describe a habit. Non precedes the verb: non dormo.",
    "Para un verbo regular, quita -are, -ere o -ire y añade la terminación del sujeto. Parlare: parlo, parli, parla, parliamo, parlate, parlano. Prendere: prendo, prendi, prende, prendiamo, prendete, prendono. Dormire: dormo, dormi, dorme, dormiamo, dormite, dormono. Las series siguen io, tu, lui/lei, noi, voi, loro. Algunos verbos en -ire añaden -isc-: capisco, capisci, capisce, capiamo, capite, capiscono. El presente puede describir un hábito. Non precede al verbo: non dormo."
  ), examples: [d1[0], d1[2], d1[3], d1[5]] },
  pronunciation: { body: t("Fais entendre la fin qui distingue parlo de parli. Pour les formes de nous : par-LIA-mo, pren-DIA-mo, dor-MIA-mo. Compare capisco et capiamo : le groupe isc n’apparaît pas dans les deux.", "Make the ending that distinguishes parlo from parli audible. In the we forms: par-LIA-mo, pren-DIA-mo, dor-MIA-mo. Compare capisco and capiamo: isc is not present in both.", "Deja oír la terminación que distingue parlo de parli. En nosotros: par-LIA-mo, pren-DIA-mo, dor-MIA-mo. Compara capisco y capiamo: isc no aparece en ambas."), practice: ["Parlo", "Parli", "Parliamo", "Prendiamo", "Capisco", "Capiamo"] },
  reading: phrase("La mattina Nina studia italiano. Omar legge un libro. Noi studiamo insieme e prendiamo un tè. La notte Nina dorme otto ore. Yoppo ripete le parole nuove.", "Le matin, Nina étudie l’italien. Omar lit un livre. Nous étudions ensemble et prenons un thé. La nuit, Nina dort huit heures. Yoppo répète les mots nouveaux.", "In the morning, Nina studies Italian. Omar reads a book. We study together and have tea. At night, Nina sleeps eight hours. Yoppo repeats the new words.", "Por la mañana Nina estudia italiano. Omar lee un libro. Estudiamos juntos y tomamos un té. Por la noche Nina duerme ocho horas. Yoppo repite las palabras nuevas."),
  order: d1[2], recall: d1[3], accepted: ["Studiamo insieme.", "Noi studiamo insieme."],
  comprehension: choice("it1-u04-l1-read", t("Que font les personnes ensemble ?", "What do the people do together?", "¿Qué hacen las personas juntas?"), [
    option("a", "Dormono.", t("Le sommeil concerne Nina dans une autre phrase.", "Sleeping refers to Nina in another sentence.", "Dormir se refiere a Nina en otra frase.")),
    option("b", "Studiano e prendono un tè.", t("Ce sont les deux actions du groupe.", "Those are the group's two actions.", "Son las dos acciones del grupo.")),
    option("c", "Scrivono una mappa.", t("Le texte ne mentionne pas cette action.", "The text does not mention this action.", "El texto no menciona esa acción.")),
  ], "b", t("Studiamo et prendiamo sont les formes de noi.", "Studiamo and prendiamo are noi forms.", "Studiamo y prendiamo son formas de noi.")),
  listening: choice("it1-u04-l1-listen", t("Quel sujet correspond au verbe entendu ?", "Which subject matches the verb you hear?", "¿Qué sujeto corresponde al verbo escuchado?"), [
    option("a", "Io.", t("Io donnerait dormo.", "Io would give dormo.", "Io daría dormo.")),
    option("b", "Tu.", t("Tu donnerait dormi.", "Tu would give dormi.", "Tu daría dormi.")),
    option("c", "Noi.", t("La finale -iamo correspond à noi.", "The ending -iamo corresponds to noi.", "La terminación -iamo corresponde a noi.")),
  ], "c", t("Dormiamo otto ore : nous dormons huit heures.", "Dormiamo otto ore: we sleep eight hours.", "Dormiamo otto ore: dormimos ocho horas."), "listen", "Dormiamo otto ore."),
  speaking: { prompt: t("Dis trois actions personnelles, puis une action avec noi.", "Say three personal actions, then one action with noi.", "Di tres acciones personales y una acción con noi."), checklist: [
    t("J’utilise un verbe de chaque groupe.", "I use a verb from each group.", "Uso un verbo de cada grupo."),
    t("Je change la terminaison pour noi.", "I change the ending for noi.", "Cambio la terminación para noi."),
    t("Je produis une phrase négative.", "I produce a negative sentence.", "Produzco una frase negativa."),
  ] },
});
const d2 = [
  phrase("Lavoro alle nove.", "Je travaille à neuf heures.", "I work at nine.", "Trabajo a las nueve."),
  phrase("Studio il lunedì.", "J’étudie le lundi.", "I study on Mondays.", "Estudio los lunes."),
  phrase("Leggo sempre.", "Je lis toujours.", "I always read.", "Leo siempre."),
  phrase("Non lavoro mai la domenica.", "Je ne travaille jamais le dimanche.", "I never work on Sundays.", "No trabajo nunca los domingos."),
  phrase("Studio due volte alla settimana.", "J’étudie deux fois par semaine.", "I study twice a week.", "Estudio dos veces por semana."),
  phrase("È l’una.", "Il est une heure.", "It is one o'clock.", "Es la una."),
  phrase("Sono le otto e mezza.", "Il est huit heures et demie.", "It is half past eight.", "Son las ocho y media."),
  phrase("A che ora?", "À quelle heure ?", "At what time?", "¿A qué hora?"),
];
const u04l2 = lesson({
  id: "it1-u04-l2", title: t("Une semaine et une horloge", "A week and a clock", "Una semana y un reloj"),
  goal: t("Situer une routine dans le temps et exprimer sa fréquence.", "Locate a routine in time and express frequency.", "Situar una rutina en el tiempo y expresar su frecuencia."), vocabulary: d2,
  grammar: { title: t("Heure et fréquence", "Time and frequency", "Hora y frecuencia"), body: t(
    "Pour l’heure : È l’una, mais Sono le due/le otto. Pour le moment d’une action : all’una, alle nove. E mezza ajoute trente minutes ; e un quarto, quinze. Les jours sont lunedì, martedì, mercoledì, giovedì, venerdì, sabato, domenica. Il lunedì et la domenica expriment ici une habitude ; lundi prochain se repère par le contexte et lunedì sans article. Sempre signifie toujours, spesso souvent, qualche volta parfois. Avec mai dans notre phrase négative, garde non avant le verbe : Non lavoro mai la domenica.",
    "To tell the time: È l’una, but Sono le due/le otto. To give an action's time: all’una, alle nove. E mezza adds thirty minutes; e un quarto adds fifteen. The days are lunedì, martedì, mercoledì, giovedì, venerdì, sabato, domenica. Il lunedì and la domenica express a habit here; a particular coming Monday is identified by context and lunedì without an article. Sempre means always, spesso often, qualche volta sometimes. With mai in our negative sentence, keep non before the verb: Non lavoro mai la domenica.",
    "Para decir la hora: È l’una, pero Sono le due/le otto. Para situar una acción: all’una, alle nove. E mezza añade treinta minutos; e un quarto, quince. Los días son lunedì, martedì, mercoledì, giovedì, venerdì, sabato, domenica. Il lunedì y la domenica expresan aquí un hábito; un lunes concreto próximo se reconoce por el contexto y lunedì sin artículo. Sempre significa siempre, spesso a menudo, qualche volta a veces. Con mai en nuestra frase negativa, conserva non antes del verbo: Non lavoro mai la domenica."
  ), examples: [d2[0], d2[3], d2[6], phrase("Sono le nove e un quarto.", "Il est neuf heures et quart.", "It is quarter past nine.", "Son las nueve y cuarto.")] },
  pronunciation: { body: t("L’accent écrit tombe à la fin de lunedì à venerdì. Sabato et domenica ont un autre rythme : SA-ba-to, do-ME-ni-ca. Enchaîne alle nove sans pause artificielle.", "The written accent falls at the end of lunedì through venerdì. Sabato and domenica have a different rhythm: SA-ba-to, do-ME-ni-ca. Link alle nove without an artificial pause.", "El acento escrito cae al final de lunedì a venerdì. Sabato y domenica tienen otro ritmo: SA-ba-to, do-ME-ni-ca. Enlaza alle nove sin una pausa artificial."), practice: ["Lunedì", "Venerdì", "Sabato", "Domenica", "Alle nove"] },
  reading: phrase("Paolo lavora alle nove. Studia italiano il lunedì e il giovedì: due volte alla settimana. Legge spesso. Non lavora mai la domenica. Oggi sono le otto e mezza.", "Paolo travaille à neuf heures. Il étudie l’italien le lundi et le jeudi : deux fois par semaine. Il lit souvent. Il ne travaille jamais le dimanche. Aujourd’hui, il est huit heures et demie.", "Paolo works at nine. He studies Italian on Mondays and Thursdays: twice a week. He often reads. He never works on Sundays. Today it is half past eight.", "Paolo trabaja a las nueve. Estudia italiano los lunes y jueves: dos veces por semana. Lee a menudo. Nunca trabaja los domingos. Hoy son las ocho y media."),
  order: d2[3], recall: d2[0], accepted: ["Lavoro alle nove.", "Io lavoro alle nove.", "Alle nove lavoro."],
  comprehension: choice("it1-u04-l2-read", t("Combien de fois par semaine Paolo étudie-t-il l’italien ?", "How often does Paolo study Italian each week?", "¿Cuántas veces por semana estudia italiano Paolo?"), [
    option("a", "Due volte.", t("Il étudie le lundi et le jeudi.", "He studies on Mondays and Thursdays.", "Estudia los lunes y jueves.")),
    option("b", "Una volta.", t("Deux jours sont mentionnés.", "Two days are mentioned.", "Se mencionan dos días.")),
    option("c", "Ogni giorno.", t("Le texte n’annonce pas tous les jours.", "The text does not say every day.", "El texto no dice todos los días.")),
  ], "a", t("Lunedì + giovedì donne deux séances.", "Monday + Thursday gives two sessions.", "Lunes + jueves da dos sesiones.")),
  listening: choice("it1-u04-l2-listen", t("Quelle heure entends-tu ?", "What time do you hear?", "¿Qué hora oyes?"), [
    option("a", "8:00", t("Mezza ajoute trente minutes.", "Mezza adds thirty minutes.", "Mezza añade treinta minutos.")),
    option("b", "8:30", t("Otto e mezza correspond à huit heures trente.", "Otto e mezza means eight thirty.", "Otto e mezza corresponde a las ocho y media.")),
    option("c", "9:30", t("L’heure annoncée commence par otto.", "The hour begins with otto.", "La hora empieza por otto.")),
  ], "b", t("Sono le otto e mezza.", "It is half past eight.", "Son las ocho y media."), "listen", "Sono le otto e mezza."),
  speaking: { prompt: t("Présente deux moments d’une semaine inventée et leur fréquence.", "Describe two moments in an invented week and their frequency.", "Describe dos momentos de una semana inventada y su frecuencia."), checklist: [
    t("Je donne une heure avec alle ou all’una.", "I give a time with alle or all’una.", "Doy una hora con alle o all’una."),
    t("Je nomme deux jours.", "I name two days.", "Nombro dos días."),
    t("J’emploie sempre, spesso ou non… mai.", "I use sempre, spesso or non… mai.", "Uso sempre, spesso o non… mai."),
  ] },
});
const d3 = [
  phrase("Mi sveglio alle sette.", "Je me réveille à sept heures.", "I wake up at seven.", "Me despierto a las siete."),
  phrase("Mi alzo presto.", "Je me lève tôt.", "I get up early.", "Me levanto temprano."),
  phrase("Mi lavo.", "Je me lave.", "I wash myself.", "Me lavo."),
  phrase("Mi preparo.", "Je me prépare.", "I get ready.", "Me preparo."),
  phrase("Noi ci alziamo alle otto.", "Nous nous levons à huit heures.", "We get up at eight.", "Nos levantamos a las ocho."),
  phrase("A che ora ti alzi?", "À quelle heure te lèves-tu ?", "What time do you get up?", "¿A qué hora te levantas?"),
  phrase("Vado al lavoro.", "Je vais au travail.", "I go to work.", "Voy al trabajo."),
  phrase("Faccio colazione.", "Je prends le petit-déjeuner.", "I have breakfast.", "Desayuno."),
];
const u04l3 = lesson({
  id: "it1-u04-l3", title: t("Du réveil au départ", "From waking up to leaving", "Del despertar a la salida"),
  goal: t("Raconter une courte routine avec des verbes pronominaux.", "Describe a short routine with reflexive verbs.", "Contar una rutina breve con verbos pronominales."), vocabulary: d3,
  grammar: { title: t("Mi, ti, si : l’action revient au sujet", "Mi, ti, si: the action returns to the subject", "Mi, ti, si: la acción vuelve al sujeto"), body: t(
    "Alzarsi se conjugue avec un pronom avant le verbe : mi alzo, ti alzi, si alza, ci alziamo, vi alzate, si alzano. Le pronom change avec le sujet. Svegliarsi, lavarsi et prepararsi suivent ici le même principe. Avec non : Non mi alzo presto. Deux verbes utiles sont irréguliers : andare donne vado, vai, va, andiamo, andate, vanno ; fare donne faccio, fai, fa, facciamo, fate, fanno. Apprends aussi les groupes al lavoro, « au travail », et fare colazione, « prendre le petit-déjeuner ».",
    "Alzarsi uses a pronoun before the verb: mi alzo, ti alzi, si alza, ci alziamo, vi alzate, si alzano. The pronoun changes with the subject. Svegliarsi, lavarsi and prepararsi follow the same principle here. With non: Non mi alzo presto. Two useful verbs are irregular: andare gives vado, vai, va, andiamo, andate, vanno; fare gives faccio, fai, fa, facciamo, fate, fanno. Also learn the chunks al lavoro, meaning to work, and fare colazione, meaning have breakfast.",
    "Alzarsi usa un pronombre antes del verbo: mi alzo, ti alzi, si alza, ci alziamo, vi alzate, si alzano. El pronombre cambia con el sujeto. Svegliarsi, lavarsi y prepararsi siguen aquí el mismo principio. Con non: Non mi alzo presto. Dos verbos útiles son irregulares: andare da vado, vai, va, andiamo, andate, vanno; fare da faccio, fai, fa, facciamo, fate, fanno. Aprende también al lavoro, «al trabajo», y fare colazione, «desayunar»."
  ), examples: [d3[0], d3[4], phrase("Non mi alzo presto.", "Je ne me lève pas tôt.", "I do not get up early.", "No me levanto temprano."), d3[7]] },
  pronunciation: { body: t("Mi et ti se lient au verbe sans accent fort séparé. Écoute la différence mi alzo / ci alziamo. Dans faccio, cc prolonge le son consonantique.", "Mi and ti link to the verb without a separate strong stress. Listen to mi alzo versus ci alziamo. In faccio, cc lengthens the consonant sound.", "Mi y ti se unen al verbo sin un acento fuerte separado. Escucha mi alzo frente a ci alziamo. En faccio, cc alarga el sonido consonántico."), practice: ["Mi alzo", "Ti alzi", "Ci alziamo", "Mi sveglio", "Faccio"] },
  reading: phrase("Rosa si sveglia alle sette. Si alza, si lava e fa colazione. Alle nove va al lavoro. La domenica non lavora e si alza alle otto. Yoppo si prepara lentamente.", "Rosa se réveille à sept heures. Elle se lève, se lave et prend le petit-déjeuner. À neuf heures, elle va au travail. Le dimanche, elle ne travaille pas et se lève à huit heures. Yoppo se prépare lentement.", "Rosa wakes at seven. She gets up, washes and has breakfast. At nine she goes to work. On Sundays she does not work and gets up at eight. Yoppo gets ready slowly.", "Rosa se despierta a las siete. Se levanta, se lava y desayuna. A las nueve va al trabajo. Los domingos no trabaja y se levanta a las ocho. Yoppo se prepara despacio."),
  order: d3[0], recall: d3[4], accepted: ["Noi ci alziamo alle otto.", "Ci alziamo alle otto.", "Alle otto ci alziamo."],
  comprehension: choice("it1-u04-l3-read", t("Quand Rosa se lève-t-elle le dimanche ?", "When does Rosa get up on Sundays?", "¿Cuándo se levanta Rosa los domingos?"), [
    option("a", "Alle sette.", t("Sept heures est son réveil de travail dans le texte.", "Seven is her workday waking time in the text.", "Las siete es la hora de despertarse para trabajar en el texto.")),
    option("b", "Alle nove.", t("Neuf heures correspond au départ au travail.", "Nine corresponds to leaving for work.", "Las nueve corresponde a salir al trabajo.")),
    option("c", "Alle otto.", t("C’est son lever du dimanche.", "That is her Sunday getting-up time.", "Es su hora de levantarse el domingo.")),
  ], "c", t("La domenica change la routine de Rosa.", "Sundays change Rosa's routine.", "El domingo cambia la rutina de Rosa.")),
  listening: choice("it1-u04-l3-listen", t("Qui se lève à huit heures ?", "Who gets up at eight?", "¿Quién se levanta a las ocho?"), [
    option("a", "Noi.", t("Ci alziamo correspond à noi.", "Ci alziamo corresponds to noi.", "Ci alziamo corresponde a noi.")),
    option("b", "Tu.", t("Tu donnerait ti alzi.", "Tu would give ti alzi.", "Tu daría ti alzi.")),
    option("c", "Lei.", t("Lei donnerait si alza.", "Lei would give si alza.", "Lei daría si alza.")),
  ], "a", t("Pronom et verbe donnent ensemble la personne.", "Pronoun and verb identify the person together.", "Pronombre y verbo identifican juntos la persona."), "listen", "Ci alziamo alle otto."),
  speaking: { prompt: t("Raconte ton matin réel ou inventé en quatre actions.", "Describe a real or invented morning in four actions.", "Cuenta una mañana real o inventada en cuatro acciones."), checklist: [
    t("J’utilise deux verbes avec mi.", "I use two verbs with mi.", "Uso dos verbos con mi."),
    t("Je situe une action avec une heure.", "I give a time for one action.", "Sitúo una acción con una hora."),
    t("J’ajoute faccio colazione ou vado al lavoro.", "I add faccio colazione or vado al lavoro.", "Añado faccio colazione o vado al lavoro."),
  ] },
  extra: [dialogue("it1-u04-routine-dialogue", t("Une matinée avec Rosa", "A morning with Rosa", "Una mañana con Rosa"), t("Joue Rosa : réveil à sept heures, petit-déjeuner, travail à neuf heures.", "Play Rosa: wake at seven, have breakfast, work at nine.", "Interpreta a Rosa: despertar a las siete, desayunar y trabajar a las nueve."), [
    { speaker: "Yoppo", line: "A che ora ti svegli?", prompt: t("Donne l’heure du réveil de Rosa.", "Give Rosa's waking time.", "Da la hora de despertar de Rosa."), correctId: "b", options: [
      option("a", "Ti svegli alle sette.", t("Tu parles de l’autre personne ; emploie mi.", "You are referring to the other person; use mi.", "Hablas de la otra persona; usa mi.")),
      option("b", "Mi sveglio alle sette.", t("Tu réponds à la première personne.", "You answer in the first person.", "Respondes en primera persona.")),
      option("c", "Mi sveglio alle nove.", t("Neuf heures est le travail dans le rôle.", "Nine is work time in the role.", "Las nueve es la hora de trabajar en el papel.")),
    ] },
    { speaker: "Yoppo", line: "E poi?", prompt: t("Dis que tu prends le petit-déjeuner.", "Say you have breakfast.", "Di que desayunas."), correctId: "a", options: [
      option("a", "Faccio colazione.", t("Fare colazione est le groupe appris.", "Fare colazione is the chunk you learned.", "Fare colazione es el grupo aprendido.")),
      option("b", "Sono colazione.", t("Il faut fare, pas essere.", "Use fare, not essere.", "Usa fare, no essere.")),
      option("c", "Ho ventotto anni.", t("C’est un âge, pas une action du matin.", "That is an age, not a morning action.", "Es una edad, no una acción matinal.")),
    ] },
    { speaker: "Yoppo", line: "A che ora vai al lavoro?", prompt: t("Donne le moment prévu par le rôle.", "Give the time specified in the role.", "Da la hora indicada en el papel."), correctId: "c", options: [
      option("a", "Vado al lavoro alle sette.", t("Sept heures est le réveil.", "Seven is waking time.", "Las siete es la hora de despertar.")),
      option("b", "Vai al lavoro alle nove.", t("Tu réponds pour toi : vado.", "You answer for yourself: vado.", "Respondes por ti: vado.")),
      option("c", "Vado al lavoro alle nove.", t("Vado et alle nove correspondent.", "Vado and alle nove fit.", "Vado y alle nove corresponden.")),
    ] },
  ], t("Une routine combine personne, action et moment.", "A routine combines person, action and time.", "Una rutina combina persona, acción y momento."))],
});
const q04: CourseAssessment = {
  id: "it1-u04-quiz", title: t("Bilan 4 · une journée", "Review 4 · a day", "Repaso 4 · un día"), description: t("Conjugue et repère les habitudes dans de nouvelles situations.", "Conjugate and identify habits in new situations.", "Conjuga e identifica hábitos en situaciones nuevas."), unitIds: ["u04"], passPercent: 80,
  questions: [
    choice("it1-u04-q1", t("Complète : Noi … un caffè.", "Complete: Noi … un caffè.", "Completa: Noi … un caffè."), [
      option("a", "prendo", t("Prendo correspond à io.", "Prendo goes with io.", "Prendo corresponde a io.")),
      option("b", "prendete", t("Prendete correspond à voi.", "Prendete goes with voi.", "Prendete corresponde a voi.")),
      option("c", "prendiamo", t("Prendiamo correspond à noi.", "Prendiamo goes with noi.", "Prendiamo corresponde a noi.")),
    ], "c", t("Noi prendiamo un caffè.", "We have a coffee.", "Tomamos un café.")),
    choice("it1-u04-q2", t("Quelle heure est annoncée ?", "What time is announced?", "¿Qué hora se anuncia?"), [
      option("a", "9:15", t("Un quarto ajoute quinze minutes.", "Un quarto adds fifteen minutes.", "Un quarto añade quince minutos.")),
      option("b", "9:30", t("Trente minutes se dirait e mezza.", "Thirty minutes would be e mezza.", "Treinta minutos sería e mezza.")),
      option("c", "1:09", t("Nove est ici l’heure, pas les minutes.", "Nove is the hour, not the minutes.", "Nove es aquí la hora, no los minutos.")),
    ], "a", t("Nove e un quarto correspond à 9 h 15.", "Nove e un quarto means 9:15.", "Nove e un quarto corresponde a las 9:15."), "listen", "Sono le nove e un quarto."),
    recall("it1-u04-q3", phrase("Mi alzo alle otto.", "Je me lève à huit heures.", "I get up at eight.", "Me levanto a las ocho."), ["Mi alzo alle otto.", "Io mi alzo alle otto.", "Alle otto mi alzo."]),
    choice("it1-u04-q4", t("Tu veux dire que tu comprends la question. Quelle forme convient ?", "You want to say you understand the question. Which form fits?", "Quieres decir que entiendes la pregunta. ¿Qué forma encaja?"), [
      option("a", "Io capisci la domanda.", t("Capisci correspond à tu.", "Capisci goes with tu.", "Capisci corresponde a tu.")),
      option("b", "Io capisco la domanda.", t("Capisco est la forme de io.", "Capisco is the io form.", "Capisco es la forma de io.")),
      option("c", "Io capiscono la domanda.", t("Capiscono correspond à loro.", "Capiscono goes with loro.", "Capiscono corresponde a loro.")),
    ], "b", t("Capire ajoute -isc- dans capisco.", "Capire adds -isc- in capisco.", "Capire añade -isc- en capisco.")),
    choice("it1-u04-q5", t("Quelle phrase signifie « Je ne lis jamais le dimanche » ?", "Which sentence means ‘I never read on Sundays’?", "¿Qué frase significa «Nunca leo los domingos»?"), [
      option("a", "Leggo sempre la domenica.", t("Sempre veut dire toujours.", "Sempre means always.", "Sempre significa siempre.")),
      option("b", "Leggo spesso la domenica.", t("Spesso veut dire souvent.", "Spesso means often.", "Spesso significa a menudo.")),
      option("c", "Non leggo mai la domenica.", t("Non… mai exprime jamais.", "Non… mai expresses never.", "Non… mai expresa nunca.")),
    ], "c", t("Non précède le verbe et mai exprime la fréquence nulle.", "Non precedes the verb and mai gives zero frequency.", "Non precede al verbo y mai expresa frecuencia nula.")),
  ],
};
const u04: CourseUnit = {
  id: "u04", number: 4, title: t("Organiser sa journée", "Organise your day", "Organizar tu día"), subtitle: t("Présent, heures, fréquence et routines.", "Present tense, times, frequency and routines.", "Presente, horas, frecuencia y rutinas."),
  objectives: [
    t("Conjuguer des verbes réguliers au présent.", "Conjugate regular verbs in the present.", "Conjugar verbos regulares en presente."),
    t("Dire une heure et une fréquence.", "Give a time and a frequency.", "Decir una hora y una frecuencia."),
    t("Raconter une routine avec des verbes pronominaux.", "Describe a routine with reflexive verbs.", "Contar una rutina con verbos pronominales."),
  ], lessons: [u04l1, u04l2, u04l3], quiz: q04,
  production: { id: "it1-u04-project", title: t("Une journée sur mesure", "A day of your own", "Un día a tu medida"), prompt: t("Écris six phrases sur une journée réelle ou inventée. Donne deux heures, deux actions pronominales, une activité avec noi et une habitude négative. Lis ensuite le texte à Yoppo.", "Write six sentences about a real or invented day. Include two times, two reflexive actions, an activity with noi and a negative habit. Then read it to Yoppo.", "Escribe seis frases sobre un día real o inventado. Incluye dos horas, dos acciones pronominales, una actividad con noi y un hábito negativo. Después léelo a Yoppo."), model: "Mi sveglio alle sette. Mi preparo. Faccio colazione alle otto. Lavoro alle nove. Noi studiamo insieme. Non lavoro mai la domenica.", rubric: [
    t("J’indique deux heures avec la bonne formule.", "I give two times using the correct phrase.", "Indico dos horas con la fórmula adecuada."),
    t("Mes pronoms mi/ci correspondent aux verbes.", "My mi/ci pronouns match their verbs.", "Mis pronombres mi/ci corresponden a los verbos."),
    t("Je distingue une action personnelle et une action de groupe.", "I distinguish personal and group actions.", "Distingo una acción personal y otra de grupo."),
    t("J’utilise non… mai dans une phrase complète.", "I use non… mai in a complete sentence.", "Uso non… mai en una frase completa."),
  ] },
  culture: { title: t("Demander avant de supposer", "Ask before assuming", "Preguntar antes de suponer"), body: t("Les horaires de nos personnages sont inventés. Ils servent à comparer des routines, sans affirmer que toutes les personnes d’un pays mangent, travaillent ou se lèvent à la même heure. A che ora? permet de demander l’information réelle ; il lunedì et la domenica permettent de préciser une habitude.", "Our characters' schedules are invented. They compare routines without claiming that everyone in a country eats, works or gets up at the same time. A che ora? asks for real information; il lunedì and la domenica specify a habit.", "Los horarios de nuestros personajes son inventados. Permiten comparar rutinas sin afirmar que todas las personas de un país comen, trabajan o se levantan a la misma hora. A che ora? permite pedir información real; il lunedì y la domenica precisan un hábito."), sourceIds: ["udine-a1"] },
};



const e1 = [
  phrase("Vorrei un caffè.", "Je voudrais un café.", "I would like a coffee.", "Quisiera un café."),
  phrase("Un tè e un panino, per favore.", "Un thé et un sandwich, s’il vous plaît.", "A tea and a sandwich, please.", "Un té y un bocadillo, por favor."),
  phrase("Per me un gelato.", "Pour moi, une glace.", "An ice cream for me.", "Para mí, un helado."),
  phrase("Un bicchiere d’acqua.", "Un verre d’eau.", "A glass of water.", "Un vaso de agua."),
  phrase("Al banco.", "Au comptoir.", "At the counter.", "En la barra."),
  phrase("Al tavolo.", "À table.", "At a table.", "En una mesa."),
  phrase("Il conto, per favore.", "L’addition, s’il vous plaît.", "The bill, please.", "La cuenta, por favor."),
  phrase("Una bottiglia d’acqua.", "Une bouteille d’eau.", "A bottle of water.", "Una botella de agua."),
];
const u05l1 = lesson({
  id: "it1-u05-l1", title: t("Une pause avec Yoppo", "A break with Yoppo", "Una pausa con Yoppo"),
  goal: t("Commander deux produits et choisir une quantité dans un menu fictif.", "Order two items and select quantities from a fictional menu.", "Pedir dos productos y elegir cantidades en un menú ficticio."), vocabulary: e1,
  grammar: { title: t("Demander avec vorrei", "Request with vorrei", "Pedir con vorrei"), body: t(
    "Vorrei signifie « je voudrais » : retiens cette forme polie comme un outil, sans apprendre maintenant tout le conditionnel. Après vorrei, place le produit avec son article ou sa quantité : vorrei un caffè, vorrei due panini. Une demande courte peut aussi être un nom suivi de per favore. Per me indique à qui la commande est destinée ; e relie deux produits. Le singulier panino devient panini ; caffè garde la même forme au pluriel : un caffè, due caffè. Al banco et al tavolo sont des groupes utiles ; nous analyserons al dans l’unité suivante. Les montants de notre jeu sont inventés.",
    "Vorrei means I would like: learn this polite form as a tool without learning the whole conditional yet. Put the item with its article or quantity after it: vorrei un caffè, vorrei due panini. A short request can also be a noun followed by per favore. Per me identifies who an order is for; e joins two items. Singular panino becomes panini; caffè keeps the same plural form: un caffè, due caffè. Al banco and al tavolo are useful chunks; we will analyse al in the next unit. Our game prices are invented.",
    "Vorrei significa «quisiera»: aprende esta forma cortés como una herramienta sin estudiar aún todo el condicional. Después va el producto con su artículo o cantidad: vorrei un caffè, vorrei due panini. Una petición breve también puede ser un nombre seguido de per favore. Per me indica para quién es el pedido; e une dos productos. El singular panino pasa a panini; caffè no cambia en plural: un caffè, due caffè. Al banco y al tavolo son grupos útiles; analizaremos al en la siguiente unidad. Los precios del juego son inventados."
  ), examples: [e1[0], e1[1], e1[6], phrase("Vorrei due panini.", "Je voudrais deux sandwichs.", "I would like two sandwiches.", "Quisiera dos bocadillos.")] },
  pronunciation: { body: t("Dans vorrei, prolonge le r double et fais porter l’accent sur rei. Dans tè et caffè, les accents écrits restent nécessaires. Enchaîne per favore sans avaler les voyelles.", "In vorrei, lengthen the double r and stress rei. The written accents in tè and caffè remain necessary. Link per favore without swallowing the vowels.", "En vorrei, alarga la r doble y acentúa rei. Los acentos escritos de tè y caffè son necesarios. Enlaza per favore sin comerte las vocales."), practice: ["Vorrei", "Un tè", "Un panino", "Per favore"] },
  reading: phrase("Livia entra al bar con Yoppo. Dice: «Buongiorno. Un tè e un panino, per favore». Yoppo prende una bottiglia d’acqua. Livia e Yoppo sono al tavolo. Alla fine, Livia chiede: «Il conto, per favore».", "Livia entre au café avec Yoppo. Elle dit : « Bonjour. Un thé et un sandwich, s’il vous plaît. » Yoppo prend une bouteille d’eau. Livia et Yoppo sont à table. À la fin, Livia demande : « L’addition, s’il vous plaît. »", "Livia enters the café with Yoppo. She says, ‘Good morning. A tea and a sandwich, please.’ Yoppo has a bottle of water. Livia and Yoppo are at a table. At the end, Livia asks, ‘The bill, please.’", "Livia entra en el bar con Yoppo. Dice: «Buenos días. Un té y un bocadillo, por favor». Yoppo toma una botella de agua. Livia y Yoppo están en una mesa. Al final, Livia pide: «La cuenta, por favor»."),
  order: e1[1], recall: e1[6],
  accepted: ["Il conto, per favore.", "Per favore, il conto."],
  comprehension: choice("it1-u05-l1-read", t("Que prend Yoppo ?", "What does Yoppo have?", "¿Qué toma Yoppo?"), [
    option("a", "Un tè.", t("Le thé est la commande de Livia.", "The tea is Livia's order.", "El té es el pedido de Livia.")),
    option("b", "Una bottiglia d’acqua.", t("C’est la boisson de Yoppo.", "That is Yoppo's drink.", "Es la bebida de Yoppo.")),
    option("c", "Un caffè.", t("Personne ne commande de café dans ce texte.", "Nobody orders coffee in this text.", "Nadie pide café en este texto.")),
  ], "b", t("Yoppo prend une bouteille d’eau ; Livia commande le thé et le sandwich.", "Yoppo has a bottle of water; Livia orders the tea and sandwich.", "Yoppo toma una botella de agua; Livia pide el té y el bocadillo.")),
  listening: choice("it1-u05-l1-listen", t("Où la personne souhaite-t-elle s’installer ?", "Where does the person want to sit or stand?", "¿Dónde desea tomar su pedido esta persona?"), [
    option("a", "Al tavolo.", t("Tu entends tavolo : une table.", "You hear tavolo: a table.", "Oyes tavolo: una mesa.")),
    option("b", "Al banco.", t("Banco désigne le comptoir, absent de la demande.", "Banco is the counter, absent from the request.", "Banco es la barra, que no aparece en la petición.")),
    option("c", "A casa.", t("Casa est le domicile ; ce n’est pas ce qui est dit.", "Casa is home; that is not what was said.", "Casa es el domicilio; no es lo que se dice.")),
  ], "a", t("Al tavolo exprime le choix d’une table.", "Al tavolo chooses a table.", "Al tavolo expresa la elección de una mesa."), "listen", "Al tavolo, per favore."),
  speaking: { prompt: t("Commande deux produits pour toi et Yoppo, puis demande l’addition.", "Order two items for you and Yoppo, then ask for the bill.", "Pide dos productos para ti y Yoppo y solicita la cuenta."), checklist: [
    t("J’utilise vorrei ou per favore.", "I use vorrei or per favore.", "Uso vorrei o per favore."),
    t("Je donne un produit et une quantité pour chacun.", "I give an item and quantity for each person.", "Indico un producto y una cantidad para cada persona."),
    t("Je demande il conto.", "I ask for il conto.", "Pido il conto."),
  ] },
  extra: [{
    ...base("it1-u05-cafe", t("Le petit budget du café", "The café budget", "El presupuesto del café"),
      t("Prépare exactement la commande de Livia. Tu as 10 €. Les prix sont fictifs ; vérifie les quantités et le total.", "Prepare Livia's exact order. You have €10. Prices are fictional; check quantities and the total.", "Prepara exactamente el pedido de Livia. Tienes 10 €. Los precios son ficticios; comprueba las cantidades y el total."),
      t("Un thé à 2 € et un sandwich à 4 € font 6 €. Sur 10 €, il reste 4 €.", "One €2 tea and one €4 sandwich total €6. From €10, €4 remains.", "Un té de 2 € y un bocadillo de 4 € suman 6 €. De 10 €, quedan 4 €."),
      t("La commande contient deux produits différents, une unité de chaque.", "The order contains two different items, one of each.", "El pedido contiene dos productos diferentes, uno de cada."),
      t("Sélectionne un tè et un panino. Additionne 2 + 4.", "Select one tè and one panino. Add 2 + 4.", "Selecciona un tè y un panino. Suma 2 + 4.")),
    kind: "cafe", category: "cafe", orderText: "Un tè e un panino, per favore.",
    menu: [{ id: "coffee", it: "Un caffè", priceCents: 150 }, { id: "tea", it: "Un tè", priceCents: 200 }, { id: "water", it: "Una bottiglia d’acqua", priceCents: 150 }, { id: "sandwich", it: "Un panino", priceCents: 400 }],
    order: [{ itemId: "tea", quantity: 1 }, { itemId: "sandwich", quantity: 1 }], budgetCents: 1000,
  }],
});
const e2 = [
  phrase("Vorrei mezzo chilo di mele.", "Je voudrais un demi-kilo de pommes.", "I would like half a kilo of apples.", "Quisiera medio kilo de manzanas."),
  phrase("Un chilo di pomodori.", "Un kilo de tomates.", "A kilo of tomatoes.", "Un kilo de tomates."),
  phrase("Due etti di formaggio.", "Deux cents grammes de fromage.", "Two hundred grams of cheese.", "Doscientos gramos de queso."),
  phrase("Un po’ di pane.", "Un peu de pain.", "A little bread.", "Un poco de pan."),
  phrase("Una bottiglia d’acqua.", "Une bouteille d’eau.", "A bottle of water.", "Una botella de agua."),
  phrase("Due panini.", "Deux sandwichs.", "Two sandwiches.", "Dos bocadillos."),
  phrase("Tre mele.", "Trois pommes.", "Three apples.", "Tres manzanas."),
];
const u05l2 = lesson({
  id: "it1-u05-l2", title: t("Le panier des quantités", "A basket of quantities", "La cesta de las cantidades"),
  goal: t("Distinguer nombre d’objets, poids et contenant.", "Distinguish item count, weight and container.", "Distinguir número de objetos, peso y recipiente."), vocabulary: e2,
  grammar: { title: t("Combien, et de quoi ?", "How much, and of what?", "¿Cuánto y de qué?"), body: t(
    "Un nombre précède directement un objet comptable : due panini, tre mele. Pour préciser un poids ou un contenant, on utilise di : un chilo di pomodori, un bicchiere di acqua. Di s’élide souvent devant une voyelle : d’acqua. Un etto vaut cent grammes ; due etti, deux cents grammes. Mezzo chilo vaut un demi-kilo. Un po’ di exprime une petite quantité non précise ; po’ s’écrit avec une apostrophe. La question quanto pane? porte sur une quantité ; quante mele? sur un nombre de pommes. Ne confonds pas due mele et due chili di mele : le chiffre ne mesure pas la même chose.",
    "A number directly precedes a countable item: due panini, tre mele. To specify weight or a container, use di: un chilo di pomodori, un bicchiere di acqua. Di often elides before a vowel: d’acqua. One etto is one hundred grams; due etti is two hundred grams. Mezzo chilo is half a kilo. Un po’ di expresses a small, unspecified amount; po’ has an apostrophe. Quanto pane? asks about an amount; quante mele? asks for a number of apples. Do not confuse due mele with due chili di mele: the number measures different things.",
    "Un número precede directamente a un objeto contable: due panini, tre mele. Para indicar un peso o recipiente, se usa di: un chilo di pomodori, un bicchiere di acqua. Di suele perder la i delante de una vocal: d’acqua. Un etto son cien gramos; due etti, doscientos gramos. Mezzo chilo es medio kilo. Un po’ di expresa una cantidad pequeña imprecisa; po’ lleva apóstrofo. Quanto pane? pregunta por una cantidad; quante mele? por un número de manzanas. No confundas due mele con due chili di mele: el número mide cosas diferentes."
  ), examples: [e2[0], e2[2], e2[3], phrase("Vorrei due panini.", "Je voudrais deux sandwichs.", "I would like two sandwiches.", "Quisiera dos bocadillos.")] },
  pronunciation: { body: t("Dans chilo, chi a le son dur de chiave. Distingue l’accent de ME-le et po-mo-DO-ri. Dans etti, conserve la durée du t double.", "In chilo, chi has the hard sound of chiave. Contrast the stress in ME-le and po-mo-DO-ri. In etti, keep the double t long.", "En chilo, chi tiene el sonido fuerte de chiave. Distingue el acento de ME-le y po-mo-DO-ri. En etti, conserva la duración de la t doble."), practice: ["Un chilo", "Mezzo chilo", "Due etti", "Pomodori"] },
  reading: phrase("Omar prepara una lista: un chilo di pomodori, mezzo chilo di mele e due etti di formaggio. Yoppo legge la lista. Poi Omar aggiunge due panini. Non compra tre mele: compra mezzo chilo di mele.", "Omar prépare une liste : un kilo de tomates, un demi-kilo de pommes et deux cents grammes de fromage. Yoppo lit la liste. Puis Omar ajoute deux sandwichs. Il n’achète pas trois pommes : il achète un demi-kilo de pommes.", "Omar prepares a list: a kilo of tomatoes, half a kilo of apples and two hundred grams of cheese. Yoppo reads the list. Then Omar adds two sandwiches. He does not buy three apples: he buys half a kilo of apples.", "Omar prepara una lista: un kilo de tomates, medio kilo de manzanas y doscientos gramos de queso. Yoppo lee la lista. Luego Omar añade dos bocadillos. No compra tres manzanas: compra medio kilo de manzanas."),
  order: e2[0], recall: phrase("Vorrei due panini.", "Je voudrais deux sandwichs.", "I would like two sandwiches.", "Quisiera dos bocadillos."),
  accepted: ["Vorrei due panini.", "Io vorrei due panini.", "Vorrei due panini, per favore."],
  comprehension: choice("it1-u05-l2-read", t("Quelle quantité de pommes Omar prévoit-il ?", "How many or how much apples does Omar plan to buy?", "¿Qué cantidad de manzanas prevé comprar Omar?"), [
    option("a", "Tre mele.", t("Le texte précise qu’il ne choisit pas ce nombre.", "The text explicitly says he does not choose this count.", "El texto especifica que no elige este número.")),
    option("b", "Un chilo.", t("Un kilo correspond aux tomates.", "A kilo is the quantity of tomatoes.", "Un kilo corresponde a los tomates.")),
    option("c", "Mezzo chilo.", t("C’est le poids des pommes sur la liste.", "That is the weight of apples on the list.", "Es el peso de las manzanas de la lista.")),
  ], "c", t("Mezzo chilo di mele indique un poids, pas un nombre de pommes.", "Mezzo chilo di mele gives a weight, not an apple count.", "Mezzo chilo di mele indica un peso, no un número de manzanas.")),
  listening: choice("it1-u05-l2-listen", t("Quelle quantité de fromage est demandée ?", "How much cheese is requested?", "¿Qué cantidad de queso se pide?"), [
    option("a", "100 g", t("Un etto vaut 100 g, mais tu entends due.", "One etto is 100 g, but you hear due.", "Un etto son 100 g, pero oyes due.")),
    option("b", "200 g", t("Due etti équivaut à 200 g.", "Due etti equals 200 g.", "Due etti equivale a 200 g.")),
    option("c", "1 kg", t("Un chilo vaudrait 1 kg.", "Un chilo would be 1 kg.", "Un chilo sería 1 kg.")),
  ], "b", t("La commande est de deux cents grammes de fromage.", "The order is for two hundred grams of cheese.", "El pedido es de doscientos gramos de queso."), "listen", "Due etti di formaggio, per favore."),
  speaking: { prompt: t("Fais une liste de trois achats : un nombre, un poids et un contenant.", "Make a three-item shopping list: a count, a weight and a container.", "Haz una lista de tres compras: un número, un peso y un recipiente."), checklist: [
    t("J’utilise un nombre directement devant un aliment comptable.", "I use a number directly before a countable food.", "Uso un número directamente delante de un alimento contable."),
    t("Je relie poids et aliment avec di.", "I link weight and food with di.", "Uno peso y alimento con di."),
    t("Je distingue chilo et etto.", "I distinguish chilo and etto.", "Distingo chilo y etto."),
  ] },
});
const e3 = [
  phrase("Quanto costa questo panino?", "Combien coûte ce sandwich ?", "How much does this sandwich cost?", "¿Cuánto cuesta este bocadillo?"),
  phrase("Quanto costano due caffè?", "Combien coûtent deux cafés ?", "How much do two coffees cost?", "¿Cuánto cuestan dos cafés?"),
  phrase("Sono sei euro e cinquanta.", "Cela fait six euros cinquante.", "That is six euros fifty.", "Son seis euros con cincuenta."),
  phrase("Pago con la carta.", "Je paie par carte.", "I pay by card.", "Pago con tarjeta."),
  phrase("Pago in contanti.", "Je paie en espèces.", "I pay in cash.", "Pago en efectivo."),
  phrase("Ecco dieci euro.", "Voici dix euros.", "Here are ten euros.", "Aquí tiene diez euros."),
  phrase("Il resto è quattro euro.", "La monnaie à rendre est de quatre euros.", "The change is four euros.", "El cambio es de cuatro euros."),
];
const u05l3 = lesson({
  id: "it1-u05-l3", title: t("L’enquête des prix", "The price investigation", "La investigación de los precios"),
  goal: t("Demander un prix, comprendre un total et annoncer un mode de paiement.", "Ask a price, understand a total and state a payment method.", "Preguntar un precio, entender un total e indicar un medio de pago."), vocabulary: e3,
  grammar: { title: t("Costa, costano et les euros", "Costa, costano and euros", "Costa, costano y los euros"), body: t(
    "Le verbe costare suit le présent en -are. Un produit singulier costa ; plusieurs produits costano. La question utilise quanto : quanto costa questo panino? Quanto costano due caffè? Euro ne change pas au pluriel : un euro, sei euro. Un prix écrit 6,50 € se lit sei euro e cinquanta, avec centesimi compris ; on peut dire sei euro e cinquanta centesimi. Pour un total, sono sei euro est une formule utile. Pago vient de pagare : le g reste dur. Con la carta et in contanti décrivent deux moyens de paiement, sans garantir leur disponibilité dans un commerce réel. Ecco présente ce qu’on donne.",
    "Costare follows the regular -are present. One singular item costa; several items costano. The question uses quanto: quanto costa questo panino? Quanto costano due caffè? Euro does not change in the plural: un euro, sei euro. A written price of €6.50 is sei euro e cinquanta, with centesimi understood; you can say sei euro e cinquanta centesimi. Sono sei euro is a useful total-price formula. Pago comes from pagare: g stays hard. Con la carta and in contanti describe two payment methods without guaranteeing their availability in a real shop. Ecco presents something you hand over.",
    "Costare sigue el presente regular en -are. Un producto singular costa; varios productos costano. La pregunta usa quanto: quanto costa questo panino? Quanto costano due caffè? Euro no cambia en plural: un euro, sei euro. Un precio escrito de 6,50 € se lee sei euro e cinquanta, con centesimi implícito; también se puede decir sei euro e cinquanta centesimi. Sono sei euro es una fórmula útil para el total. Pago viene de pagare: la g sigue siendo fuerte. Con la carta e in contanti describen dos medios de pago sin garantizar su disponibilidad en un comercio real. Ecco presenta lo que se entrega."
  ), examples: [e3[0], e3[1], e3[2], e3[3], phrase("Il panino costa quattro euro.", "Le sandwich coûte quatre euros.", "The sandwich costs four euros.", "El bocadillo cuesta cuatro euros.")] },
  pronunciation: { body: t("Dans costa, l’accent est sur co ; dans costano aussi. Cinquanta contient le son de ciao au début, puis qu comme dans acqua. Garde e audible dans sei euro e cinquanta.", "Stress co in both costa and costano. Cinquanta begins with the sound of ciao, then qu as in acqua. Keep e audible in sei euro e cinquanta.", "Acentúa co tanto en costa como en costano. Cinquanta empieza con el sonido de ciao y sigue con qu como en acqua. Haz audible la e de sei euro e cinquanta."), practice: ["Costa", "Costano", "Cinquanta", "Sei euro e cinquanta"] },
  reading: phrase("Nel nostro menu inventato, un panino costa quattro euro e un tè costa due euro. Livia prende un panino e un tè. Il conto è sei euro. Livia paga in contanti: «Ecco dieci euro». Il resto è quattro euro.", "Dans notre menu inventé, un sandwich coûte quatre euros et un thé deux euros. Livia prend un sandwich et un thé. L’addition est de six euros. Livia paie en espèces : « Voici dix euros. » La monnaie à rendre est de quatre euros.", "In our invented menu, a sandwich costs four euros and a tea costs two euros. Livia has a sandwich and a tea. The bill is six euros. Livia pays cash: ‘Here are ten euros.’ The change is four euros.", "En nuestro menú inventado, un bocadillo cuesta cuatro euros y un té dos euros. Livia toma un bocadillo y un té. La cuenta es de seis euros. Livia paga en efectivo: «Aquí tiene diez euros». El cambio es de cuatro euros."),
  order: phrase("Il panino costa quattro euro.", "Le sandwich coûte quatre euros.", "The sandwich costs four euros.", "El bocadillo cuesta cuatro euros."),
  recall: e3[3], accepted: ["Pago con la carta.", "Io pago con la carta.", "Pago con carta."],
  comprehension: choice("it1-u05-l3-read", t("Combien Livia doit-elle recevoir de monnaie ?", "How much change should Livia receive?", "¿Cuánto cambio debe recibir Livia?"), [
    option("a", "Quattro euro.", t("Dix moins six font quatre.", "Ten minus six is four.", "Diez menos seis son cuatro.")),
    option("b", "Sei euro.", t("Six euros est le total payé, pas la monnaie.", "Six euros is the bill, not the change.", "Seis euros es la cuenta, no el cambio.")),
    option("c", "Dieci euro.", t("Dix euros est la somme remise au départ.", "Ten euros is the amount handed over.", "Diez euros es la cantidad entregada.")),
  ], "a", t("Le texte distingue conto, somme remise et resto.", "The text distinguishes the bill, money handed over and change.", "El texto distingue la cuenta, la cantidad entregada y el cambio.")),
  listening: choice("it1-u05-l3-listen", t("Quel prix entends-tu ?", "Which price do you hear?", "¿Qué precio oyes?"), [
    option("a", "6,15 €", t("Quinze serait quindici.", "Fifteen would be quindici.", "Quince sería quindici.")),
    option("b", "5,60 €", t("Le premier nombre entendu est sei.", "The first number heard is sei.", "El primer número que oyes es sei.")),
    option("c", "6,50 €", t("Sei euro e cinquanta indique 6,50 €.", "Sei euro e cinquanta means €6.50.", "Sei euro e cinquanta indica 6,50 €.")),
  ], "c", t("Cinquanta correspond à cinquante centimes dans ce prix.", "Cinquanta means fifty cents in this price.", "Cinquanta corresponde a cincuenta céntimos en este precio."), "listen", "Sono sei euro e cinquanta."),
  speaking: { prompt: t("Joue une vente avec des prix inventés : question, total, paiement.", "Role-play a sale with invented prices: question, total, payment.", "Representa una compra con precios inventados: pregunta, total y pago."), checklist: [
    t("Je choisis costa pour un produit ou costano pour plusieurs.", "I choose costa for one item or costano for several.", "Elijo costa para un producto o costano para varios."),
    t("Je prononce un prix avec euros et centimes.", "I pronounce a price with euros and cents.", "Pronuncio un precio con euros y céntimos."),
    t("Je précise carte ou espèces.", "I state card or cash.", "Indico tarjeta o efectivo."),
  ] },
});
const q05: CourseAssessment = {
  id: "it1-u05-quiz", title: t("Bilan 5 · Une commande précise", "Review 5 · A precise order", "Repaso 5 · Un pedido preciso"),
  description: t("Transfère les expressions à de nouvelles commandes.", "Transfer the phrases to new orders.", "Aplica las expresiones a nuevos pedidos."), unitIds: ["u05"], passPercent: 80, questions: [
    choice("it1-u05-q1", t("Complète : Quanto ___ questi due panini?", "Complete: Quanto ___ questi due panini?", "Completa: Quanto ___ questi due panini?"), [
      option("a", "costano", t("Due panini est pluriel : costano.", "Due panini is plural: costano.", "Due panini es plural: costano.")),
      option("b", "costa", t("Costa convient à un seul panino.", "Costa fits one panino.", "Costa corresponde a un solo panino.")),
      option("c", "costi", t("Costi est la forme pour tu.", "Costi is the form for tu.", "Costi es la forma de tu.")),
    ], "a", t("Accorde le verbe avec les deux produits.", "Match the verb to the two items.", "Concuerda el verbo con los dos productos.")),
    choice("it1-u05-q2", t("Quel total est annoncé ?", "Which total is announced?", "¿Qué total se anuncia?"), [
      option("a", "4,12 €", t("Douze serait dodici.", "Twelve would be dodici.", "Doce sería dodici.")),
      option("b", "4,20 €", t("Venti indique vingt centimes.", "Venti means twenty cents.", "Venti indica veinte céntimos.")),
      option("c", "14,20 €", t("Le nombre d’euros est quattro, pas quattordici.", "The euros are quattro, not quattordici.", "Los euros son quattro, no quattordici.")),
    ], "b", t("Quattro euro e venti se note 4,20 €.", "Quattro euro e venti is written €4.20.", "Quattro euro e venti se escribe 4,20 €."), "listen", "Sono quattro euro e venti."),
    recall("it1-u05-q3", phrase("Vorrei un chilo di mele.", "Je voudrais un kilo de pommes.", "I would like a kilo of apples.", "Quisiera un kilo de manzanas."), ["Vorrei un chilo di mele.", "Io vorrei un chilo di mele.", "Vorrei un chilo di mele, per favore."]),
    choice("it1-u05-q4", t("Une liste indique 300 g de fromage. Quelle demande correspond ?", "A list says 300 g of cheese. Which request matches?", "Una lista indica 300 g de queso. ¿Qué petición corresponde?"), [
      option("a", "Tre chili di formaggio.", t("Trois kilos seraient 3 000 g.", "Three kilos would be 3,000 g.", "Tres kilos serían 3000 g.")),
      option("b", "Mezzo chilo di formaggio.", t("Un demi-kilo vaut 500 g.", "Half a kilo is 500 g.", "Medio kilo son 500 g.")),
      option("c", "Tre etti di formaggio.", t("Trois fois cent grammes font 300 g.", "Three times one hundred grams is 300 g.", "Tres veces cien gramos son 300 g.")),
    ], "c", t("Un etto vaut 100 g ; tre etti vaut 300 g.", "An etto is 100 g; tre etti is 300 g.", "Un etto son 100 g; tre etti son 300 g.")),
    choice("it1-u05-q5", t("Tu remets des billets et des pièces. Que dis-tu ?", "You hand over notes and coins. What do you say?", "Entregas billetes y monedas. ¿Qué dices?"), [
      option("a", "Pago in contanti.", t("Contanti désigne l’argent liquide.", "Contanti means cash.", "Contanti significa efectivo.")),
      option("b", "Pago con la carta.", t("Aucune carte n’est utilisée dans cette scène.", "No card is used in this scene.", "En esta escena no se usa tarjeta.")),
      option("c", "Il conto, per favore.", t("Cette phrase demande l’addition, sans préciser le paiement.", "This asks for the bill without naming the payment method.", "Esta frase pide la cuenta sin indicar el medio de pago.")),
    ], "a", t("La situation décrit un paiement in contanti.", "The situation describes payment in contanti.", "La situación describe un pago in contanti.")),
  ],
};
const u05: CourseUnit = {
  id: "u05", number: 5, title: t("Au café et au marché", "At the café and market", "En el café y el mercado"),
  subtitle: t("Une commande claire dans un décor de Bologne", "A clear order in a Bologna setting", "Un pedido claro en un escenario de Bolonia"),
  objectives: [
    t("Commander poliment et préciser des quantités.", "Order politely and specify quantities.", "Pedir con cortesía y precisar cantidades."),
    t("Demander des prix et comprendre euros et centimes.", "Ask prices and understand euros and cents.", "Preguntar precios y entender euros y céntimos."),
    t("Distinguer commande, total et monnaie.", "Distinguish an order, total and change.", "Distinguir pedido, total y cambio."),
  ],
  lessons: [u05l1, u05l2, u05l3], quiz: q05,
  production: { id: "it1-u05-project", title: t("Ta pause à Bologne", "Your Bologna break", "Tu pausa en Bolonia"),
    prompt: t("Écris un mini-dialogue de cinq à sept répliques. Choisis deux produits étudiés, donne les quantités, invente un prix total et précise ton paiement. Ajoute une salutation et une formule polie. Tu peux jouer les deux rôles avec Yoppo.", "Write a five-to-seven-turn mini-dialogue. Choose two studied items, give quantities, invent a total price and state your payment method. Include a greeting and a polite phrase. You can act both roles with Yoppo.", "Escribe un minidiálogo de cinco a siete intervenciones. Elige dos productos estudiados, indica cantidades, inventa un precio total y precisa el pago. Añade un saludo y una fórmula cortés. Puedes representar ambos papeles con Yoppo."),
    model: "— Buongiorno!\n— Buongiorno. Vorrei un tè e due panini, per favore.\n— Ecco. Sono dieci euro.\n— Pago con la carta.\n— Grazie!\n— Arrivederci!",
    rubric: [
      t("Les deux produits et leurs quantités sont compréhensibles.", "Both items and their quantities are understandable.", "Se entienden los dos productos y sus cantidades."),
      t("La commande contient vorrei ou per favore.", "The order contains vorrei or per favore.", "El pedido contiene vorrei o per favore."),
      t("Le total et le mode de paiement sont formulés en italien.", "The total and payment method are expressed in Italian.", "El total y el medio de pago están expresados en italiano."),
      t("L’échange comporte une ouverture et une fin.", "The exchange has an opening and an ending.", "El intercambio tiene una apertura y un cierre."),
    ] },
  culture: { title: t("Le bar, et un marché réel", "The bar, and a real market", "El bar y un mercado real"), body: t(
    "Un bar italien peut proposer café, autres boissons et nourriture sucrée ou salée ; certains ont un comptoir, d’autres aussi des tables. Le mot ne désigne donc pas uniquement un lieu pour boire de l’alcool. À Bologne, le Quadrilatero est un ancien quartier de commerces près de Piazza Maggiore, présenté par l’office de tourisme pour son histoire marchande. Notre café, ses prix et nos commandes sont fictifs. Demander le menu et le prix permet de comprendre l’offre réelle sans supposer que tous les établissements fonctionnent de la même façon.",
    "An Italian bar may offer coffee, other drinks and sweet or savoury food; some have a counter, others also have tables. The word therefore does not mean only a place for alcoholic drinks. In Bologna, the Quadrilatero is an old trading district near Piazza Maggiore, described by the tourist office for its commercial history. Our café, prices and orders are fictional. Asking for the menu and price helps you understand the real offering without assuming every establishment operates alike.",
    "Un bar italiano puede ofrecer café, otras bebidas y comida dulce o salada; algunos tienen barra y otros también mesas. La palabra no designa solo un lugar para beber alcohol. En Bolonia, el Quadrilatero es un antiguo barrio comercial cerca de Piazza Maggiore, presentado por la oficina de turismo por su historia comercial. Nuestro café, sus precios y los pedidos son ficticios. Pedir el menú y el precio permite entender la oferta real sin suponer que todos los establecimientos funcionan igual."
  ), sourceIds: ["rai-bar", "bologna-market"] },
};



const f1 = [
  phrase("C’è una cucina.", "Il y a une cuisine.", "There is a kitchen.", "Hay una cocina."),
  phrase("Ci sono due camere.", "Il y a deux chambres.", "There are two bedrooms.", "Hay dos dormitorios."),
  phrase("Il bagno è piccolo.", "La salle de bain est petite.", "The bathroom is small.", "El baño es pequeño."),
  phrase("Il soggiorno è grande.", "Le salon est grand.", "The living room is large.", "El salón es grande."),
  phrase("Non c’è un balcone.", "Il n’y a pas de balcon.", "There is no balcony.", "No hay balcón."),
  phrase("C’è anche uno studio.", "Il y a aussi un bureau, une pièce de travail.", "There is also a study.", "También hay un despacho."),
  phrase("Ci sono tre finestre.", "Il y a trois fenêtres.", "There are three windows.", "Hay tres ventanas."),
];
const u06l1 = lesson({
  id: "it1-u06-l1", title: t("La maison à explorer", "Explore the home", "Explorar la casa"),
  goal: t("Décrire les pièces présentes et celles qui manquent.", "Describe which rooms are present and which are missing.", "Describir qué habitaciones hay y cuáles faltan."), vocabulary: f1,
  grammar: { title: t("C’è ou ci sono ?", "C’è or ci sono?", "¿C’è o ci sono?"), body: t(
    "C’è présente un élément singulier : c’è una cucina. Ci sono présente plusieurs éléments : ci sono due camere. On emploie aussi c’è avec un nom non comptable singulier, comme c’è acqua. Non précède toute la construction : non c’è un balcone, non ci sono finestre. L’ordre peut rester le même dans une question : c’è un bagno? L’intonation et le point d’interrogation signalent la question. Compare il bagno è piccolo, qui décrit une pièce identifiée, et c’è un bagno piccolo, qui annonce son existence. Anche signifie aussi. Dans c’è, l’apostrophe et l’accent de è font partie de l’orthographe.",
    "C’è introduces one singular element: c’è una cucina. Ci sono introduces several: ci sono due camere. C’è is also used with a singular uncountable noun, such as c’è acqua. Non precedes the entire construction: non c’è un balcone, non ci sono finestre. Word order can stay the same in a question: c’è un bagno? Intonation and the question mark identify it as a question. Compare il bagno è piccolo, describing an identified room, and c’è un bagno piccolo, introducing its existence. Anche means also. In c’è, the apostrophe and the accent on è are part of its spelling.",
    "C’è presenta un elemento singular: c’è una cucina. Ci sono presenta varios: ci sono due camere. También se usa c’è con un nombre no contable singular, como c’è acqua. Non precede a toda la construcción: non c’è un balcone, non ci sono finestre. El orden puede mantenerse en una pregunta: c’è un bagno? La entonación y el signo de interrogación indican la pregunta. Compara il bagno è piccolo, que describe una habitación identificada, con c’è un bagno piccolo, que anuncia su existencia. Anche significa también. En c’è, el apóstrofo y el acento de è forman parte de la escritura."
  ), examples: [f1[0], f1[1], f1[4], f1[5], phrase("C’è un bagno piccolo.", "Il y a une petite salle de bain.", "There is a small bathroom.", "Hay un baño pequeño.")] },
  pronunciation: { body: t("C’è se prononce en une syllabe. Dans ci sono, laisse les trois syllabes distinctes : ci SO-no. Chambre se dit camera, avec l’accent sur ca : CA-me-ra.", "C’è is pronounced as one syllable. In ci sono, keep three distinct syllables: ci SO-no. Bedroom is camera, stressed on ca: CA-me-ra.", "C’è se pronuncia en una sílaba. En ci sono, distingue las tres sílabas: ci SO-no. Dormitorio se dice camera, con acento en ca: CA-me-ra."), practice: ["C’è", "Ci sono", "Una camera", "Il soggiorno"] },
  reading: phrase("Nella casa di Ada c’è una cucina grande. Ci sono due camere e un bagno piccolo. C’è anche uno studio. Non c’è un balcone. In cucina ci sono tre finestre. Yoppo guarda la casa e dice: «Lo studio è grande!»", "Dans la maison d’Ada, il y a une grande cuisine. Il y a deux chambres et une petite salle de bain. Il y a aussi un bureau. Il n’y a pas de balcon. Dans la cuisine, il y a trois fenêtres. Yoppo regarde la maison et dit : « Le bureau est grand ! »", "In Ada's home there is a large kitchen. There are two bedrooms and a small bathroom. There is also a study. There is no balcony. In the kitchen there are three windows. Yoppo looks at the home and says, ‘The study is large!’", "En casa de Ada hay una cocina grande. Hay dos dormitorios y un baño pequeño. También hay un despacho. No hay balcón. En la cocina hay tres ventanas. Yoppo mira la casa y dice: «¡El despacho es grande!»"),
  order: f1[1], recall: f1[4], accepted: ["Non c’è un balcone.", "Non c’è il balcone."],
  comprehension: choice("it1-u06-l1-read", t("Quel espace manque dans cette maison ?", "Which space is missing from this home?", "¿Qué espacio falta en esta casa?"), [
    option("a", "Lo studio.", t("Le texte dit c’è anche uno studio.", "The text says c’è anche uno studio.", "El texto dice c’è anche uno studio.")),
    option("b", "La cucina.", t("La cuisine est présente et grande.", "The kitchen is present and large.", "La cocina está presente y es grande.")),
    option("c", "Il balcone.", t("Non c’è indique l’absence du balcon.", "Non c’è indicates that the balcony is absent.", "Non c’è indica que no hay balcón.")),
  ], "c", t("Non c’è un balcone oppose une absence aux pièces présentes.", "Non c’è un balcone contrasts an absent feature with the rooms present.", "Non c’è un balcone contrasta una ausencia con las habitaciones presentes.")),
  listening: choice("it1-u06-l1-listen", t("Combien de chambres sont annoncées ?", "How many bedrooms are mentioned?", "¿Cuántos dormitorios se mencionan?"), [
    option("a", "Una camera.", t("Une seule chambre demanderait c’è una camera.", "One bedroom would be c’è una camera.", "Un dormitorio sería c’è una camera.")),
    option("b", "Due camere.", t("Tu entends due camere, au pluriel.", "You hear due camere, in the plural.", "Oyes due camere, en plural.")),
    option("c", "Tre camere.", t("Tre n’est pas le nombre prononcé.", "Tre is not the number spoken.", "Tre no es el número pronunciado.")),
  ], "b", t("Ci sono annonce ici deux chambres : due camere.", "There are two elements: due camere.", "Hay dos elementos: due camere."), "listen", "Ci sono due camere."),
  speaking: { prompt: t("Fais visiter un logement réel ou inventé à Yoppo.", "Show Yoppo a real or imaginary home.", "Enséñale a Yoppo una vivienda real o inventada."), checklist: [
    t("Je présente une pièce avec c’è.", "I introduce one room with c’è.", "Presento una habitación con c’è."),
    t("Je présente plusieurs éléments avec ci sono.", "I introduce several elements with ci sono.", "Presento varios elementos con ci sono."),
    t("Je précise une absence avec non.", "I state an absence with non.", "Indico una ausencia con non."),
  ] },
});
const f2 = [
  phrase("Il libro è sul tavolo.", "Le livre est sur la table.", "The book is on the table.", "El libro está en la mesa."),
  phrase("La chiave è nella borsa.", "La clé est dans le sac.", "The key is in the bag.", "La llave está en el bolso."),
  phrase("La sedia è davanti alla finestra.", "La chaise est devant la fenêtre.", "The chair is in front of the window.", "La silla está delante de la ventana."),
  phrase("Il gatto è sotto la sedia.", "Le chat est sous la chaise.", "The cat is under the chair.", "El gato está debajo de la silla."),
  phrase("La cucina è accanto al bagno.", "La cuisine est à côté de la salle de bain.", "The kitchen is next to the bathroom.", "La cocina está al lado del baño."),
  phrase("La farmacia è vicino alla banca.", "La pharmacie est près de la banque.", "The pharmacy is near the bank.", "La farmacia está cerca del banco."),
  phrase("Abito a Bologna.", "J’habite à Bologne.", "I live in Bologna.", "Vivo en Bolonia."),
];
const u06l2 = lesson({
  id: "it1-u06-l2", title: t("Où est la clé ?", "Where is the key?", "¿Dónde está la llave?"),
  goal: t("Situer un objet et un service dans leur environnement.", "Locate an object and a local service.", "Situar un objeto y un servicio en su entorno."), vocabulary: f2,
  grammar: { title: t("Les prépositions rencontrent les articles", "Prepositions meet articles", "Las preposiciones y los artículos"), body: t(
    "In signifie ici dans, su sur, sotto sous. Certaines prépositions fusionnent avec l’article : a + il = al, a + la = alla ; in + il = nel, in + la = nella ; su + il = sul, su + la = sulla. Devant une voyelle : all’, nell’, sull’. Avec i et le : ai/alle, nei/nelle, sui/sulle. Avec lo/gli : allo/agli, nello/negli, sullo/sugli. Di se combine aussi : del, della, dell’, dei, delle, dello, degli. Devant, à côté de et près de se construisent ici avec a : davanti a, accanto a, vicino a. En revanche, ici sotto prend directement l’article : sotto la sedia. Avec une ville, on emploie généralement a : abito a Bologna ; avec un pays, in : abito in Italia.",
    "In here means in, su on and sotto under. Some prepositions merge with the article: a + il = al, a + la = alla; in + il = nel, in + la = nella; su + il = sul, su + la = sulla. Before a vowel: all’, nell’, sull’. With i and le: ai/alle, nei/nelle, sui/sulle. With lo/gli: allo/agli, nello/negli, sullo/sugli. Di also combines: del, della, dell’, dei, delle, dello, degli. Learn in front of/next to/near with a: davanti a, accanto a, vicino a. In contrast, sotto here takes the article directly: sotto la sedia. A city generally uses a: abito a Bologna; a country uses in: abito in Italia.",
    "In significa aquí dentro de, su encima de y sotto debajo de. Algunas preposiciones se fusionan con el artículo: a + il = al, a + la = alla; in + il = nel, in + la = nella; su + il = sul, su + la = sulla. Ante vocal: all’, nell’, sull’. Con i y le: ai/alle, nei/nelle, sui/sulle. Con lo/gli: allo/agli, nello/negli, sullo/sugli. Di también se combina: del, della, dell’, dei, delle, dello, degli. Aprende delante de/al lado de/cerca de con a: davanti a, accanto a, vicino a. En cambio, aquí sotto lleva el artículo directamente: sotto la sedia. Con una ciudad se usa generalmente a: abito a Bologna; con un país, in: abito in Italia."
  ), examples: [f2[0], f2[1], f2[2], f2[3], f2[5], f2[6]] },
  pronunciation: { body: t("Dans nella et alla, garde le l double. L’accent de tavolo est sur ta : TA-vo-lo. Dans farmacia, il est sur ci : far-ma-CI-a ; fais entendre les deux voyelles finales.", "Keep the double l long in nella and alla. Tavolo is stressed on ta: TA-vo-lo. Farmacia is stressed on ci: far-ma-CI-a; pronounce both final vowels.", "Conserva la l doble de nella y alla. Tavolo lleva el acento en ta: TA-vo-lo. Farmacia lo lleva en ci: far-ma-CI-a; pronuncia las dos vocales finales."), practice: ["Nella borsa", "Sul tavolo", "Accanto alla finestra", "La farmacia"] },
  reading: phrase("Ada cerca la chiave. Il libro è sul tavolo, ma la chiave è nella borsa. La borsa è sotto la sedia. Yoppo è davanti alla finestra. Fuori, nel quartiere inventato, la farmacia è vicino alla banca.", "Ada cherche la clé. Le livre est sur la table, mais la clé est dans le sac. Le sac est sous la chaise. Yoppo est devant la fenêtre. Dehors, dans le quartier inventé, la pharmacie est près de la banque.", "Ada is looking for the key. The book is on the table, but the key is in the bag. The bag is under the chair. Yoppo is in front of the window. Outside, in the invented neighbourhood, the pharmacy is near the bank.", "Ada busca la llave. El libro está en la mesa, pero la llave está en el bolso. El bolso está debajo de la silla. Yoppo está delante de la ventana. Fuera, en el barrio inventado, la farmacia está cerca del banco."),
  order: f2[0], recall: f2[1], accepted: ["La chiave è nella borsa.", "Nella borsa c’è la chiave.", "La chiave si trova nella borsa."],
  comprehension: choice("it1-u06-l2-read", t("Où Ada trouve-t-elle sa clé ?", "Where does Ada find her key?", "¿Dónde encuentra Ada su llave?"), [
    option("a", "Nella borsa.", t("Le texte place bien la clé dans le sac.", "The text places the key in the bag.", "El texto sitúa la llave en el bolso.")),
    option("b", "Sul tavolo.", t("C’est le livre qui est sur la table.", "The book is on the table.", "Es el libro lo que está en la mesa.")),
    option("c", "Davanti alla finestra.", t("C’est Yoppo qui se trouve devant la fenêtre.", "Yoppo is in front of the window.", "Es Yoppo quien está delante de la ventana.")),
  ], "a", t("La clé est nella borsa ; le sac est sotto la sedia.", "The key is nella borsa; the bag is sotto la sedia.", "La llave está nella borsa; el bolso está sotto la sedia.")),
  listening: choice("it1-u06-l2-listen", t("Quelle relation spatiale entends-tu ?", "Which spatial relationship do you hear?", "¿Qué relación espacial oyes?"), [
    option("a", "Sotto il bagno.", t("Sotto voudrait dire en dessous de la salle de bain.", "Sotto would mean below the bathroom.", "Sotto significaría debajo del baño.")),
    option("b", "Davanti al bagno.", t("Davanti indiquerait devant, pas à côté.", "Davanti would mean in front, not next to.", "Davanti indicaría delante, no al lado.")),
    option("c", "Accanto al bagno.", t("Accanto a indique à côté de.", "Accanto a means next to.", "Accanto a significa al lado de.")),
  ], "c", t("La cuisine est à côté de la salle de bain.", "The kitchen is next to the bathroom.", "La cocina está al lado del baño."), "listen", "La cucina è accanto al bagno."),
  speaking: { prompt: t("Place mentalement un livre, une clé et une chaise, puis explique où ils sont.", "Imagine placing a book, a key and a chair, then explain where they are.", "Imagina dónde colocar un libro, una llave y una silla y explica dónde están."), checklist: [
    t("J’utilise trois relations spatiales différentes.", "I use three different spatial relationships.", "Uso tres relaciones espaciales diferentes."),
    t("Je combine in ou su avec l’article quand il le faut.", "I combine in or su with the article where needed.", "Combino in o su con el artículo cuando corresponde."),
    t("J’emploie è pour situer un objet identifié.", "I use è to locate an identified object.", "Uso è para situar un objeto identificado."),
  ] },
});
const f3 = [
  phrase("Scusi, dov’è la stazione?", "Excusez-moi, où est la gare ?", "Excuse me, where is the station?", "Disculpe, ¿dónde está la estación?"),
  phrase("Vai sempre dritto.", "Va toujours tout droit.", "Keep going straight.", "Sigue todo recto."),
  phrase("Gira a destra.", "Tourne à droite.", "Turn right.", "Gira a la derecha."),
  phrase("Gira a sinistra.", "Tourne à gauche.", "Turn left.", "Gira a la izquierda."),
  phrase("Attraversa la piazza.", "Traverse la place.", "Cross the square.", "Cruza la plaza."),
  phrase("Il mercato è davanti alla banca.", "Le marché est devant la banque.", "The market is in front of the bank.", "El mercado está delante del banco."),
  phrase("Due caselle.", "Deux cases.", "Two squares on the grid.", "Dos casillas."),
  phrase("Continua per due caselle.", "Continue pendant deux cases.", "Continue for two grid squares.", "Continúa durante dos casillas."),
];
const u06l3 = lesson({
  id: "it1-u06-l3", title: t("Guide Yoppo dans le quartier", "Guide Yoppo around the neighbourhood", "Guía a Yoppo por el barrio"),
  goal: t("Demander un lieu et suivre un petit trajet sur une grille fictive.", "Ask about a place and follow a short route on a fictional grid.", "Preguntar por un lugar y seguir un trayecto breve en una cuadrícula ficticia."), vocabulary: f3,
  grammar: { title: t("Donner une consigne à tu", "Give an instruction to tu", "Dar una instrucción a tu"), body: t(
    "Pour guider Yoppo, que nous tutoyons, l’impératif des verbes réguliers en -are se termine en -a : gira, attraversa, continua. Les verbes en -ere et beaucoup de verbes en -ire ont -i : prendi, dormi. Tu as déjà rencontré leggi et scrivi. Certains verbes sont irréguliers : andare donne va’ ou vai ; notre cours utilise vai. Pour interdire une action à tu, place non devant l’infinitif : non girare. Ce sont des consignes familières, pas les formes de politesse pour Lei. Pour demander poliment un lieu, retiens Scusi, dov’è…? Dov’è réunit dove et è. Sur notre grille, casella signifie case ; per due caselle indique une distance de deux cases.",
    "To guide Yoppo, whom we address informally, regular -are imperatives end in -a: gira, attraversa, continua. -ere verbs and many -ire verbs use -i: prendi, dormi. You have already met leggi and scrivi. Some verbs are irregular: andare has va’ or vai; our course uses vai. To tell tu not to do something, put non before the infinitive: non girare. These are informal instructions, not the polite Lei forms. To ask politely about a place, learn Scusi, dov’è…? Dov’è combines dove and è. On our grid, casella means square; per due caselle gives a distance of two squares.",
    "Para guiar a Yoppo, a quien tratamos de tú, el imperativo regular en -are termina en -a: gira, attraversa, continua. Los verbos en -ere y muchos en -ire usan -i: prendi, dormi. Ya has visto leggi y scrivi. Algunos verbos son irregulares: andare da va’ o vai; nuestro curso usa vai. Para indicar que tu no haga algo, pon non delante del infinitivo: non girare. Son instrucciones familiares, no las formas de cortesía de Lei. Para preguntar con cortesía por un lugar, aprende Scusi, dov’è…? Dov’è une dove y è. En nuestra cuadrícula, casella significa casilla; per due caselle indica una distancia de dos casillas."
  ), examples: [f3[0], f3[2], f3[3], f3[5], phrase("Vai dritto per due caselle.", "Va tout droit pendant deux cases.", "Go straight for two grid squares.", "Sigue recto durante dos casillas."), phrase("Poi gira a destra e continua per due caselle.", "Puis tourne à droite et continue pendant deux cases.", "Then turn right and continue for two grid squares.", "Luego gira a la derecha y continúa durante dos casillas.")] },
  pronunciation: { body: t("Distingue DE-stra et si-NI-stra par leur rythme, sans raccourcir les fins. Dans stazione, z correspond ici au groupe de sons ts. Dov’è se dit en deux syllabes, do-VÈ.", "Distinguish DE-stra and si-NI-stra by their rhythm without dropping endings. In stazione, z here represents the sound sequence ts. Dov’è has two syllables, do-VÈ.", "Distingue DE-stra y si-NI-stra por su ritmo sin cortar los finales. En stazione, z representa aquí la secuencia de sonidos ts. Dov’è tiene dos sílabas, do-VÈ."), practice: ["A destra", "A sinistra", "La stazione", "Dov’è"] },
  reading: phrase("Nel quartiere inventato, Yoppo chiede: «Scusi, dov’è il mercato?». Ada risponde: «Vai sempre dritto. Poi gira a sinistra. Il mercato è davanti alla banca». Yoppo ripete: «A sinistra, davanti alla banca. Grazie!»", "Dans le quartier inventé, Yoppo demande : « Excusez-moi, où est le marché ? » Ada répond : « Va toujours tout droit. Puis tourne à gauche. Le marché est devant la banque. » Yoppo répète : « À gauche, devant la banque. Merci ! »", "In the invented neighbourhood, Yoppo asks, ‘Excuse me, where is the market?’ Ada replies, ‘Keep going straight. Then turn left. The market is in front of the bank.’ Yoppo repeats, ‘Left, in front of the bank. Thank you!’", "En el barrio inventado, Yoppo pregunta: «Disculpe, ¿dónde está el mercado?». Ada responde: «Sigue todo recto. Luego gira a la izquierda. El mercado está delante del banco». Yoppo repite: «A la izquierda, delante del banco. ¡Gracias!»"),
  order: f3[5], recall: f3[0], accepted: ["Scusi, dov’è la stazione?", "Scusi, dove è la stazione?", "Dov’è la stazione, scusi?"],
  comprehension: choice("it1-u06-l3-read", t("Après être allé tout droit, où Yoppo doit-il tourner dans le texte ?", "After going straight, which way must Yoppo turn in the text?", "Después de seguir recto, ¿hacia dónde debe girar Yoppo en el texto?"), [
    option("a", "A destra.", t("La droite n’est pas le tournant indiqué dans ce texte.", "Right is not the turn given in this text.", "La derecha no es el giro indicado en este texto.")),
    option("b", "A sinistra.", t("Ada dit poi gira a sinistra.", "Ada says poi gira a sinistra.", "Ada dice poi gira a sinistra.")),
    option("c", "Sotto la banca.", t("Sous la banque n’est pas une instruction de tournant.", "Under the bank is not a turning instruction.", "Debajo del banco no es una instrucción para girar.")),
  ], "b", t("Le texte indique tout droit, puis à gauche. La grille suivante est un autre trajet.", "The text says straight, then left. The following grid is a different route.", "El texto indica recto y luego a la izquierda. La cuadrícula siguiente es otro trayecto.")),
  listening: choice("it1-u06-l3-listen", t("Quelle action est demandée ?", "Which action is requested?", "¿Qué acción se pide?"), [
    option("a", "Gira a destra.", t("Tu entends destra, la droite.", "You hear destra, right.", "Oyes destra, derecha.")),
    option("b", "Gira a sinistra.", t("Sinistra signifie gauche ; le mot entendu est différent.", "Sinistra means left; the word heard is different.", "Sinistra significa izquierda; la palabra escuchada es distinta.")),
    option("c", "Attraversa la piazza.", t("La place n’est pas mentionnée.", "The square is not mentioned.", "No se menciona la plaza.")),
  ], "a", t("Gira a destra est une consigne adressée à tu.", "Gira a destra is an instruction addressed to tu.", "Gira a destra es una instrucción dirigida a tu."), "listen", "Gira a destra."),
  speaking: { prompt: t("Demande où est un lieu, puis guide Yoppo avec deux consignes.", "Ask where a place is, then guide Yoppo with two instructions.", "Pregunta dónde está un lugar y guía a Yoppo con dos instrucciones."), checklist: [
    t("Ma question commence par Scusi, dov’è…?", "My question starts with Scusi, dov’è…?", "Mi pregunta empieza con Scusi, dov’è…?"),
    t("J’utilise vai ou gira dans mes indications.", "I use vai or gira in my directions.", "Uso vai o gira en las indicaciones."),
    t("Je distingue destra et sinistra.", "I distinguish destra and sinistra.", "Distingo destra y sinistra."),
  ] },
  extra: [{
    ...base("it1-u06-map", t("Le plan imaginaire de Yoppo", "Yoppo’s imaginary map", "El plano imaginario de Yoppo"),
      t("Nouveau trajet sur un plan fictif, sans lien avec les rues de Bologne. Yoppo commence en bas à gauche et regarde vers le haut. Une flèche le déplace d’une case dans la direction de l’écran. Suis les deux consignes.", "A new route on a fictional map, unrelated to Bologna's streets. Yoppo starts at the bottom left, facing up. Each arrow moves one square in its screen direction. Follow the two instructions.", "Nuevo trayecto en un plano ficticio, sin relación con las calles de Bolonia. Yoppo empieza abajo a la izquierda mirando hacia arriba. Cada flecha mueve una casilla en su dirección de pantalla. Sigue las dos instrucciones."),
      t("Monte de deux cases, puis avance de deux cases vers la droite. Tu arrives en haut à droite.", "Move up two squares, then two squares to the right. You arrive at the top right.", "Sube dos casillas y avanza dos hacia la derecha. Llegas arriba a la derecha."),
      t("Au départ, dritto correspond au haut de la grille.", "At the start, dritto points towards the top of the grid.", "Al empezar, dritto corresponde a la parte superior de la cuadrícula."),
      t("Les quatre déplacements sont ↑ ↑ → →.", "The four moves are ↑ ↑ → →.", "Los cuatro movimientos son ↑ ↑ → →.")),
    kind: "map", category: "city", gridSize: 3, start: { row: 2, col: 0 }, goal: { row: 0, col: 2 },
    path: ["up", "up", "right", "right"], instructions: ["Vai dritto per due caselle.", "Poi gira a destra e continua per due caselle."],
  }],
});
const q06: CourseAssessment = {
  id: "it1-u06-quiz", title: t("Bilan 6 · Trouver sa place", "Review 6 · Find your place", "Repaso 6 · Encontrar tu lugar"),
  description: t("Décris de nouveaux lieux et interprète de nouvelles positions.", "Describe new places and interpret new positions.", "Describe lugares nuevos e interpreta nuevas posiciones."), unitIds: ["u06"], passPercent: 80, questions: [
    choice("it1-u06-q1", t("Complète : In questa casa ___ tre camere.", "Complete: In questa casa ___ tre camere.", "Completa: In questa casa ___ tre camere."), [
      option("a", "c’è", t("Tre camere est pluriel ; c’è introduit un singulier.", "Tre camere is plural; c’è introduces a singular.", "Tre camere es plural; c’è introduce un singular.")),
      option("b", "è", t("Il faut ici annoncer l’existence des chambres.", "Here you need to introduce the bedrooms' existence.", "Aquí hay que anunciar la existencia de los dormitorios.")),
      option("c", "ci sono", t("Ci sono convient à trois chambres.", "Ci sono fits three bedrooms.", "Ci sono corresponde a tres dormitorios.")),
    ], "c", t("L’existence au pluriel se formule avec ci sono.", "Plural existence is expressed with ci sono.", "La existencia en plural se expresa con ci sono.")),
    choice("it1-u06-q2", t("Où est la pharmacie dans cette nouvelle scène ?", "Where is the pharmacy in this new scene?", "¿Dónde está la farmacia en esta nueva escena?"), [
      option("a", "Accanto alla stazione.", t("Accanto signifie à côté, pas devant.", "Accanto means next to, not in front.", "Accanto significa al lado, no delante.")),
      option("b", "Davanti alla stazione.", t("Tu reconnais davanti alla stazione.", "You recognise davanti alla stazione.", "Reconoces davanti alla stazione.")),
      option("c", "Sotto la stazione.", t("Sotto signifie sous ; ce n’est pas la position entendue.", "Sotto means under; it is not the position heard.", "Sotto significa debajo; no es la posición escuchada.")),
    ], "b", t("La pharmacie est devant la gare dans cette scène fictive.", "The pharmacy is in front of the station in this fictional scene.", "La farmacia está delante de la estación en esta escena ficticia."), "listen", "La farmacia è davanti alla stazione."),
    recall("it1-u06-q3", phrase("Il libro è nella borsa.", "Le livre est dans le sac.", "The book is in the bag.", "El libro está en el bolso."), ["Il libro è nella borsa.", "Nella borsa c’è il libro.", "Il libro si trova nella borsa."]),
    choice("it1-u06-q4", t("Tu guides Yoppo : dis-lui de ne pas tourner à droite.", "You guide Yoppo: tell him not to turn right.", "Guías a Yoppo: dile que no gire a la derecha."), [
      option("a", "Non girare a destra.", t("Non + infinitif forme cette consigne négative à tu.", "Non + infinitive forms this negative instruction to tu.", "Non + infinitivo forma esta instrucción negativa para tu.")),
      option("b", "Gira a destra.", t("Cette phrase demande précisément de tourner à droite.", "This specifically asks for a right turn.", "Esta frase pide precisamente girar a la derecha.")),
      option("c", "Vai sempre dritto.", t("C’est une autre consigne, qui ne formule pas l’interdiction demandée.", "That is another instruction, not the requested prohibition.", "Es otra instrucción, no la prohibición solicitada.")),
    ], "a", t("Le négatif de gira, adressé à tu, utilise non girare.", "The negative of gira addressed to tu uses non girare.", "El negativo de gira, dirigido a tu, usa non girare.")),
    choice("it1-u06-q5", t("Complète : Abito ___ Torino.", "Complete: Abito ___ Torino.", "Completa: Abito ___ Torino."), [
      option("a", "in", t("Avec cette ville, on utilise a ; in convient par exemple à in Italia.", "This city uses a; in fits in Italia, for example.", "Con esta ciudad se usa a; in corresponde, por ejemplo, a in Italia.")),
      option("b", "sul", t("Sul signifie sur le ; ce n’est pas la préposition de résidence dans une ville.", "Sul means on the; it is not the city-residence preposition.", "Sul significa sobre el; no es la preposición para residir en una ciudad.")),
      option("c", "a", t("A introduit ici le nom de la ville.", "A introduces the city's name here.", "A introduce aquí el nombre de la ciudad.")),
    ], "c", t("Abito a Torino suit le modèle abito a Bologna.", "Abito a Torino follows the model abito a Bologna.", "Abito a Torino sigue el modelo abito a Bologna.")),
  ],
};
const u06: CourseUnit = {
  id: "u06", number: 6, title: t("Chez soi et dans le quartier", "At home and in the neighbourhood", "En casa y en el barrio"),
  subtitle: t("Décrire, situer, demander et guider", "Describe, locate, ask and guide", "Describir, situar, preguntar y guiar"),
  objectives: [
    t("Présenter un lieu avec c’è et ci sono.", "Present a place with c’è and ci sono.", "Presentar un lugar con c’è y ci sono."),
    t("Situer un objet avec des prépositions et des articles.", "Locate an object using prepositions and articles.", "Situar un objeto con preposiciones y artículos."),
    t("Demander un lieu et donner un trajet court.", "Ask about a place and give a short route.", "Preguntar por un lugar y dar un trayecto breve."),
  ],
  lessons: [u06l1, u06l2, u06l3], quiz: q06,
  production: { id: "it1-u06-project", title: t("Le quartier que tu inventes", "The neighbourhood you invent", "El barrio que inventas"),
    prompt: t("Imagine un logement et son quartier. Écris six phrases : ce qu’il y a au singulier et au pluriel, deux positions d’objets ou de lieux, une question pour trouver un lieu et une consigne pour y aller. Utilise les mots étudiés ; aucune adresse personnelle n’est nécessaire.", "Imagine a home and its neighbourhood. Write six sentences: what exists in the singular and plural, two positions of objects or places, a question to find a place and one direction to reach it. Use the words studied; no personal address is needed.", "Imagina una vivienda y su barrio. Escribe seis frases: qué hay en singular y plural, dos posiciones de objetos o lugares, una pregunta para encontrar un lugar y una indicación para llegar. Usa las palabras estudiadas; no hace falta una dirección personal."),
    model: "C’è una cucina grande. Ci sono due camere. Il libro è sul tavolo. La farmacia è accanto alla banca. Scusi, dov’è la farmacia? Vai sempre dritto.",
    rubric: [
      t("J’emploie correctement c’è et ci sono.", "I use c’è and ci sono correctly.", "Uso correctamente c’è y ci sono."),
      t("Deux relations spatiales sont compréhensibles.", "Two spatial relationships are understandable.", "Se entienden dos relaciones espaciales."),
      t("Ma question contient dov’è et un lieu.", "My question contains dov’è and a place.", "Mi pregunta contiene dov’è y un lugar."),
      t("Ma consigne utilise une forme étudiée et une direction claire.", "My instruction uses a studied form and a clear direction.", "Mi indicación usa una forma estudiada y una dirección clara."),
    ] },
  culture: { title: t("Une question donne de la place à la réponse", "A question leaves room for an answer", "Una pregunta deja espacio para la respuesta"), body: t(
    "Dans ces échanges, Scusi, dov’è…? demande une information, tandis que vai et gira guident Yoppo, notre interlocuteur familier. Le choix des formes dépend donc de la personne et de la situation. Si une indication échappe, Può ripetere, per favore? permet de continuer. Les logements, services et trajets du cours sont inventés pour pratiquer ces actes de communication : la grille n’est pas un itinéraire utilisable à Bologne.",
    "In these exchanges, Scusi, dov’è…? requests information, while vai and gira guide Yoppo, our familiar partner. The choice of form therefore depends on the person and situation. If you miss a direction, Può ripetere, per favore? helps you continue. The homes, services and routes in the course are invented to practise these communicative actions: the grid is not a usable route in Bologna.",
    "En estos intercambios, Scusi, dov’è…? solicita información, mientras vai y gira guían a Yoppo, nuestro interlocutor familiar. La elección depende de la persona y la situación. Si no entiendes una indicación, Può ripetere, per favore? permite continuar. Las viviendas, servicios y trayectos del curso se inventan para practicar estos actos comunicativos: la cuadrícula no es un itinerario utilizable en Bolonia."
  ), sourceIds: ["udine-a1"] },
};

export const units01to06: CourseUnit[] = [u01, u02, u03, u04, u05, u06];


