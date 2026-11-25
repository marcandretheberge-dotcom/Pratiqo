import { germanLesson as lesson, phrase as p, t } from "./courseAuthoring";

export const lessons05to08 = [
  lesson({
    id: "de1-u05-l1",
    title: t("Arriver à l’hôtel", "Arrive at the hotel", "Llegar al hotel"),
    grammar: t(
      "Ich habe = j’ai; Sie haben = vous avez (politesse). Eine Reservierung est féminin, ein Zimmer est neutre. Apprends leur article avec le nom.",
      "Ich habe = I have; Sie haben = you have (polite). Eine Reservierung is feminine, ein Zimmer is neuter. Learn each noun with its article.",
      "Ich habe = tengo; Sie haben = tiene (formal). Eine Reservierung es femenino; ein Zimmer es neutro. Aprende el artículo con el sustantivo.",
    ),
    sound: t(
      "Zimmer commence par ts. Dans Schlüssel, sch est le ch français; ü est arrondi, différent de u.",
      "Zimmer starts with ts. In Schlüssel, sch sounds like sh; ü is rounded and distinct from u.",
      "Zimmer empieza por ts. En Schlüssel, sch suena sh; ü es redondeada y distinta de u.",
    ),
    words: [
      p(
        "Ich habe eine Reservierung.",
        "J’ai une réservation.",
        "I have a reservation.",
        "Tengo una reserva.",
      ),
      p(
        "Ein Zimmer für zwei Nächte.",
        "Une chambre pour deux nuits.",
        "A room for two nights.",
        "Una habitación para dos noches.",
      ),
      p(
        "Auf den Namen Nora.",
        "Au nom de Nora.",
        "In the name of Nora.",
        "A nombre de Nora.",
      ),
      p(
        "Hier ist Ihr Schlüssel.",
        "Voici votre clé.",
        "Here is your key.",
        "Aquí tiene su llave.",
      ),
    ],
    reading: p(
      "Nora hat eine Reservierung. Sie bleibt zwei Nächte.",
      "Nora a une réservation. Elle reste deux nuits.",
      "Nora has a reservation. She is staying two nights.",
      "Nora tiene una reserva. Se queda dos noches.",
    ),
    question: t(
      "Combien de nuits reste Nora ?",
      "How many nights is Nora staying?",
      "¿Cuántas noches se queda Nora?",
    ),
    answers: ["Zwei Nächte", "Eine Nacht", "Drei Nächte"],
    listen: "Ich habe eine Reservierung.",
    heard: [
      t(
        "Une réservation existe déjà.",
        "There is already a reservation.",
        "Ya hay una reserva.",
      ),
      t("Il faut annuler.", "A cancellation is needed.", "Hay que cancelar."),
      t(
        "La chambre est fermée.",
        "The room is closed.",
        "La habitación está cerrada.",
      ),
    ],
  }),
  lesson({
    id: "de1-u05-l2",
    title: t(
      "Poser une question pratique",
      "Ask a practical question",
      "Hacer una pregunta práctica",
    ),
    grammar: t(
      "Wann = quand, wo = où. Gibt es…? signifie y a-t-il…? : Gibt es WLAN? La question directe place le verbe conjugué avant le sujet.",
      "Wann = when, wo = where. Gibt es…? means is there…?: Gibt es WLAN? In direct questions the conjugated verb precedes the subject.",
      "Wann = cuándo, wo = dónde. Gibt es…? significa ¿hay…?: Gibt es WLAN? En preguntas directas el verbo conjugado precede al sujeto.",
    ),
    sound: t(
      "Frühstück réunit deux voyelles arrondies : ü puis ü. Ü peut être long ou bref; imite le rythme de l’enregistrement.",
      "Frühstück has two rounded ü vowels. Ü can be long or short; imitate the recording’s rhythm.",
      "Frühstück tiene dos vocales ü redondeadas. Ü puede ser larga o breve; imita el ritmo de la grabación.",
    ),
    words: [
      p(
        "Wann gibt es Frühstück?",
        "Quand sert-on le petit déjeuner ?",
        "When is breakfast served?",
        "¿Cuándo se sirve el desayuno?",
      ),
      p(
        "Gibt es WLAN?",
        "Y a-t-il du Wi-Fi ?",
        "Is there Wi-Fi?",
        "¿Hay wifi?",
      ),
      p(
        "Wo ist der Aufzug?",
        "Où est l’ascenseur ?",
        "Where is the lift?",
        "¿Dónde está el ascensor?",
      ),
      p(
        "Von sieben bis zehn Uhr.",
        "De sept à dix heures.",
        "From seven until ten.",
        "De siete a diez.",
      ),
    ],
    reading: p(
      "Frühstück gibt es von sieben bis zehn Uhr. Der Aufzug ist rechts.",
      "Le petit déjeuner est de sept à dix heures. L’ascenseur est à droite.",
      "Breakfast is from seven until ten. The lift is on the right.",
      "El desayuno es de siete a diez. El ascensor está a la derecha.",
    ),
    question: t(
      "Quand commence le petit déjeuner dans cette scène ?",
      "When does breakfast start in this scene?",
      "¿Cuándo empieza el desayuno en esta escena?",
    ),
    answers: ["Um sieben Uhr", "Um zehn Uhr", "Um zwei Uhr"],
    listen: "Der Aufzug ist rechts.",
    heard: [
      t(
        "L’ascenseur est à droite.",
        "The lift is on the right.",
        "El ascensor está a la derecha.",
      ),
      t(
        "Le petit déjeuner est prêt.",
        "Breakfast is ready.",
        "El desayuno está listo.",
      ),
      t(
        "L’ascenseur est à gauche.",
        "The lift is on the left.",
        "El ascensor está a la izquierda.",
      ),
    ],
  }),
  lesson({
    id: "de1-u05-l3",
    title: t(
      "Signaler un problème",
      "Report a problem",
      "Comunicar un problema",
    ),
    grammar: t(
      "Nicht nie une action : Das WLAN funktioniert nicht. Kein nie un nom : kein heißes Wasser. Können Sie mir helfen? est une demande polie; mir = à moi.",
      "Nicht negates an action: Das WLAN funktioniert nicht. Kein negates a noun: kein heißes Wasser. Können Sie mir helfen? is a polite request; mir = to me.",
      "Nicht niega una acción: Das WLAN funktioniert nicht. Kein niega un sustantivo: kein heißes Wasser. Können Sie mir helfen? es una petición cortés; mir = a mí.",
    ),
    sound: t(
      "Le f de helfen reste net; dans funktioniert, le t devant ion s’entend ts. Découpe funk-tio-niert puis réunis.",
      "Keep f in helfen clear; t before ion in funktioniert sounds like ts. Break funk-tio-niert into parts, then join them.",
      "Pronuncia claramente la f de helfen; la t antes de ion en funktioniert suena ts. Divide funk-tio-niert y luego únelo.",
    ),
    words: [
      p(
        "Das WLAN funktioniert nicht.",
        "Le Wi-Fi ne fonctionne pas.",
        "The Wi-Fi does not work.",
        "El wifi no funciona.",
      ),
      p(
        "Können Sie mir helfen?",
        "Pouvez-vous m’aider ?",
        "Can you help me?",
        "¿Puede ayudarme?",
      ),
      p(
        "Es gibt kein heißes Wasser.",
        "Il n’y a pas d’eau chaude.",
        "There is no hot water.",
        "No hay agua caliente.",
      ),
      p(
        "Vielen Dank.",
        "Merci beaucoup.",
        "Thank you very much.",
        "Muchas gracias.",
      ),
    ],
    reading: p(
      "Das WLAN funktioniert nicht. Nora bittet an der Rezeption um Hilfe.",
      "Le Wi-Fi ne fonctionne pas. Nora demande de l’aide à la réception.",
      "The Wi-Fi does not work. Nora asks for help at reception.",
      "El wifi no funciona. Nora pide ayuda en recepción.",
    ),
    question: t(
      "Qu’est-ce qui ne fonctionne pas ?",
      "What does not work?",
      "¿Qué no funciona?",
    ),
    answers: ["Das WLAN", "Der Aufzug", "Der Zug"],
    listen: "Es gibt kein heißes Wasser.",
    heard: [
      t(
        "Il n’y a pas d’eau chaude.",
        "There is no hot water.",
        "No hay agua caliente.",
      ),
      t("Il n’y a pas de café.", "There is no coffee.", "No hay café."),
      t(
        "L’eau est trop chaude.",
        "The water is too hot.",
        "El agua está demasiado caliente.",
      ),
    ],
  }),
  lesson({
    id: "de1-u06-l1",
    title: t("Organiser une journée", "Plan a day", "Organizar un día"),
    grammar: t(
      "Möchten est un souhait; können une possibilité. Le second verbe va à la fin : Wir können das Museum besuchen. Ne conjugue pas besuchen après können.",
      "Möchten expresses a wish; können a possibility. The second verb comes last: Wir können das Museum besuchen. Do not conjugate besuchen after können.",
      "Möchten expresa un deseo; können una posibilidad. El segundo verbo va al final: Wir können das Museum besuchen. No conjugues besuchen después de können.",
    ),
    sound: t(
      "Dans besuchen, le s entre voyelles est sonore, comme z. Dans Museum, détache les syllabes Mu-se-um.",
      "In besuchen, s between vowels is voiced, like z. Separate the syllables Mu-se-um in Museum.",
      "En besuchen, s entre vocales es sonora, con vibración de las cuerdas vocales. Separa las sílabas Mu-se-um de Museum.",
    ),
    words: [
      p(
        "Wir möchten das Museum besuchen.",
        "Nous voudrions visiter le musée.",
        "We would like to visit the museum.",
        "Quisiéramos visitar el museo.",
      ),
      p(
        "Ist das Museum heute geöffnet?",
        "Le musée est-il ouvert aujourd’hui ?",
        "Is the museum open today?",
        "¿Está abierto hoy el museo?",
      ),
      p(
        "Heute ist es geschlossen.",
        "Aujourd’hui, il est fermé.",
        "It is closed today.",
        "Hoy está cerrado.",
      ),
      p(
        "Wir können morgen kommen.",
        "Nous pouvons venir demain.",
        "We can come tomorrow.",
        "Podemos venir mañana.",
      ),
    ],
    reading: p(
      "Das Museum ist heute geschlossen. Nora und Sami können morgen kommen.",
      "Le musée est fermé aujourd’hui. Nora et Sami peuvent venir demain.",
      "The museum is closed today. Nora and Sami can come tomorrow.",
      "El museo está cerrado hoy. Nora y Sami pueden venir mañana.",
    ),
    question: t(
      "Quand peuvent-ils venir ?",
      "When can they come?",
      "¿Cuándo pueden venir?",
    ),
    answers: ["Morgen", "Heute", "Gestern"],
    listen: "Heute ist es geschlossen.",
    heard: [
      t("C’est fermé aujourd’hui.", "It is closed today.", "Está cerrado hoy."),
      t(
        "C’est ouvert demain matin.",
        "It opens tomorrow morning.",
        "Abre mañana por la mañana.",
      ),
      t("C’est gratuit.", "It is free.", "Es gratis."),
    ],
  }),
  lesson({
    id: "de1-u06-l2",
    title: t(
      "S’adapter à la météo",
      "Adapt to the weather",
      "Adaptarse al tiempo",
    ),
    grammar: t(
      "Es regnet = il pleut. Es est un sujet grammatical, pas une personne. Lieber indique ici une préférence : Ich bleibe lieber hier.",
      "Es regnet = it is raining. Es is a grammatical subject, not a person. Lieber here indicates preference: Ich bleibe lieber hier.",
      "Es regnet = llueve. Es es un sujeto gramatical, no una persona. Lieber indica aquí preferencia: Ich bleibe lieber hier.",
    ),
    sound: t(
      "Le ie de lieber est un i long; le ei de bleiben est « aï ». Compare lieber et bleiben sans inverser les voyelles.",
      "The ie of lieber is a long ee; the ei of bleiben sounds like ‘eye’. Compare them without reversing the vowels.",
      "La ie de lieber es una i larga; la ei de bleiben suena «ai». Compáralas sin invertir las vocales.",
    ),
    words: [
      p(
        "Heute regnet es.",
        "Aujourd’hui, il pleut.",
        "It is raining today.",
        "Hoy llueve.",
      ),
      p(
        "Ich bleibe lieber hier.",
        "Je préfère rester ici.",
        "I would rather stay here.",
        "Prefiero quedarme aquí.",
      ),
      p(
        "Die Sonne scheint.",
        "Le soleil brille.",
        "The sun is shining.",
        "Brilla el sol.",
      ),
      p(
        "Gehen wir ins Café?",
        "On va au café ?",
        "Shall we go to the café?",
        "¿Vamos al café?",
      ),
    ],
    reading: p(
      "Heute regnet es. Sami bleibt lieber im Café. Morgen möchte er spazieren gehen.",
      "Il pleut aujourd’hui. Sami préfère rester au café. Demain, il veut se promener.",
      "It is raining today. Sami would rather stay in the café. Tomorrow he wants to go for a walk.",
      "Hoy llueve. Sami prefiere quedarse en el café. Mañana quiere pasear.",
    ),
    question: t(
      "Où Sami préfère-t-il rester aujourd’hui ?",
      "Where would Sami rather stay today?",
      "¿Dónde prefiere quedarse Sami hoy?",
    ),
    answers: ["Im Café", "Im Zug", "Im Museum"],
    listen: "Die Sonne scheint.",
    heard: [
      t("Le soleil brille.", "The sun is shining.", "Brilla el sol."),
      t("Il pleut.", "It is raining.", "Llueve."),
      t("Il neige.", "It is snowing.", "Nieva."),
    ],
  }),
  lesson({
    id: "de1-u06-l3",
    title: t(
      "Proposer et répondre",
      "Suggest and respond",
      "Proponer y responder",
    ),
    grammar: t(
      "Hast du…? place le verbe avant le sujet. Am Samstag = samedi. Gern exprime le plaisir de faire : Ich komme gern. Une invitation n’exige pas de dire oui.",
      "Hast du…? places the verb before the subject. Am Samstag = on Saturday. Gern expresses willingness: Ich komme gern. You can decline an invitation politely.",
      "Hast du…? coloca el verbo antes del sujeto. Am Samstag = el sábado. Gern expresa gusto o disposición: Ich komme gern. Puedes rechazar una invitación con cortesía.",
    ),
    sound: t(
      "Dans Samstag, s au début est sonore. Dans Zeit, z reste ts. Écoute les deux débuts.",
      "The initial s of Samstag is voiced. The z of Zeit is ts. Listen to the two beginnings.",
      "La s inicial de Samstag es sonora. La z de Zeit suena ts. Escucha ambos comienzos.",
    ),
    words: [
      p(
        "Hast du am Samstag Zeit?",
        "As-tu du temps samedi ?",
        "Are you free on Saturday?",
        "¿Tienes tiempo el sábado?",
      ),
      p("Ja, gern.", "Oui, avec plaisir.", "Yes, gladly.", "Sí, con gusto."),
      p(
        "Leider habe ich keine Zeit.",
        "Malheureusement, je n’ai pas le temps.",
        "Unfortunately, I have no time.",
        "Por desgracia, no tengo tiempo.",
      ),
      p(
        "Vielleicht am Sonntag?",
        "Peut-être dimanche ?",
        "Perhaps on Sunday?",
        "¿Quizá el domingo?",
      ),
    ],
    reading: p(
      "Nora hat am Samstag keine Zeit. Am Sonntag hat sie Zeit.",
      "Nora n’a pas le temps samedi. Elle est libre dimanche.",
      "Nora has no time on Saturday. She is free on Sunday.",
      "Nora no tiene tiempo el sábado. El domingo sí tiene tiempo.",
    ),
    question: t(
      "Quel jour convient à Nora ?",
      "Which day works for Nora?",
      "¿Qué día le viene bien a Nora?",
    ),
    answers: ["Am Sonntag", "Am Samstag", "Am Montag"],
    listen: "Leider habe ich keine Zeit.",
    heard: [
      t(
        "La personne décline : elle n’a pas le temps.",
        "The person declines: no time.",
        "La persona rechaza: no tiene tiempo.",
      ),
      t(
        "Elle accepte avec plaisir.",
        "The person gladly accepts.",
        "Acepta con gusto.",
      ),
      t(
        "Elle demande l’heure.",
        "The person asks the time.",
        "Pregunta la hora.",
      ),
    ],
  }),
  lesson({
    id: "de1-u07-l1",
    title: t(
      "Se présenter au travail",
      "Introduce yourself at work",
      "Presentarse en el trabajo",
    ),
    grammar: t(
      "Après als, le métier n’a souvent pas d’article : als Lehrerin. In einem Büro est une position au datif. Les personnes du cours sont fictives.",
      "After als, a profession often has no article: als Lehrerin. In einem Büro is a dative location. Course characters are fictional.",
      "Después de als, la profesión suele ir sin artículo: als Lehrerin. In einem Büro expresa ubicación en dativo. Los personajes del curso son ficticios.",
    ),
    sound: t(
      "Dans Lehrer, h allonge le e; le r final est souvent atténué. Dans Büro, ü et o restent deux voyelles distinctes.",
      "In Lehrer, h lengthens e; final r is often softened. In Büro, ü and o remain separate vowels.",
      "En Lehrer, h alarga la e; la r final suele atenuarse. En Büro, ü y o son vocales distintas.",
    ),
    words: [
      p(
        "Ich arbeite als Lehrerin.",
        "Je travaille comme enseignante.",
        "I work as a teacher.",
        "Trabajo como profesora.",
      ),
      p(
        "Ich arbeite in einem Büro.",
        "Je travaille dans un bureau.",
        "I work in an office.",
        "Trabajo en una oficina.",
      ),
      p(
        "Was machen Sie beruflich?",
        "Quel métier exercez-vous ?",
        "What do you do for work?",
        "¿A qué se dedica?",
      ),
      p(
        "Ich lerne Deutsch.",
        "J’apprends l’allemand.",
        "I am learning German.",
        "Aprendo alemán.",
      ),
    ],
    reading: p(
      "Nora arbeitet als Lehrerin. Sami arbeitet in einem Büro. Beide lernen Deutsch.",
      "Nora travaille comme enseignante. Sami travaille dans un bureau. Tous deux apprennent l’allemand.",
      "Nora works as a teacher. Sami works in an office. Both learn German.",
      "Nora trabaja como profesora. Sami trabaja en una oficina. Ambos aprenden alemán.",
    ),
    question: t(
      "Qui travaille comme enseignante ?",
      "Who works as a teacher?",
      "¿Quién trabaja como profesora?",
    ),
    answers: ["Nora", "Sami", "Niemand"],
    listen: "Ich lerne Deutsch.",
    heard: [
      t(
        "La personne apprend l’allemand.",
        "The person is learning German.",
        "La persona aprende alemán.",
      ),
      t(
        "Elle enseigne le français.",
        "The person teaches French.",
        "Enseña francés.",
      ),
      t(
        "Elle cherche la gare.",
        "The person looks for the station.",
        "Busca la estación.",
      ),
    ],
  }),
  lesson({
    id: "de1-u07-l2",
    title: t(
      "Comprendre une consigne",
      "Understand an instruction",
      "Entender una instrucción",
    ),
    grammar: t(
      "L’impératif poli garde Sie après le verbe : Schreiben Sie… Bitte adoucit la demande. Une instruction à la fois suffit pour commencer.",
      "The polite imperative keeps Sie after the verb: Schreiben Sie… Bitte softens the request. Start with one instruction at a time.",
      "El imperativo formal mantiene Sie después del verbo: Schreiben Sie… Bitte suaviza la petición. Empieza con una instrucción cada vez.",
    ),
    sound: t(
      "Le sch de schreiben est ch; le ei est « aï ». Dans sprechen, sp au début se prononce chp.",
      "The sch of schreiben is sh; ei sounds like ‘eye’. Initial sp in sprechen is pronounced shp.",
      "La sch de schreiben suena sh; ei suena «ai». La sp inicial de sprechen se pronuncia shp.",
    ),
    words: [
      p(
        "Schreiben Sie bitte Ihren Namen.",
        "Écrivez votre nom, s’il vous plaît.",
        "Please write your name.",
        "Escriba su nombre, por favor.",
      ),
      p(
        "Öffnen Sie das Buch.",
        "Ouvrez le livre.",
        "Open the book.",
        "Abra el libro.",
      ),
      p(
        "Arbeiten Sie zu zweit.",
        "Travaillez à deux.",
        "Work in pairs.",
        "Trabajen en parejas.",
      ),
      p(
        "Ich habe eine Frage.",
        "J’ai une question.",
        "I have a question.",
        "Tengo una pregunta.",
      ),
    ],
    reading: p(
      "Öffnen Sie das Buch. Arbeiten Sie zu zweit. Schreiben Sie drei Sätze.",
      "Ouvrez le livre. Travaillez à deux. Écrivez trois phrases.",
      "Open the book. Work in pairs. Write three sentences.",
      "Abra el libro. Trabajen en parejas. Escriban tres frases.",
    ),
    question: t(
      "Combien de phrases faut-il écrire ?",
      "How many sentences should you write?",
      "¿Cuántas frases hay que escribir?",
    ),
    answers: ["Drei Sätze", "Zwei Sätze", "Zehn Sätze"],
    listen: "Arbeiten Sie zu zweit.",
    heard: [
      t("Travailler à deux.", "Work in pairs.", "Trabajar en parejas."),
      t("Écrire deux mots.", "Write two words.", "Escribir dos palabras."),
      t("Ouvrir deux livres.", "Open two books.", "Abrir dos libros."),
    ],
  }),
  lesson({
    id: "de1-u07-l3",
    title: t(
      "Écrire un petit message",
      "Write a short message",
      "Escribir un mensaje breve",
    ),
    grammar: t(
      "Pour prévenir d’un retard : Ich komme später. Leider signale un regret. Une salutation, l’information principale et une formule de fin rendent le message clair.",
      "To report a delay: Ich komme später. Leider signals regret. A greeting, key information and closing make a clear message.",
      "Para avisar de un retraso: Ich komme später. Leider expresa pesar. Un saludo, la información principal y una despedida hacen el mensaje claro.",
    ),
    sound: t(
      "Dans später, sp initial se prononce chp et ä est long. N’efface pas les trémas : schon et schön ne sont pas interchangeables.",
      "In später, initial sp is shp and ä is long. Do not drop umlauts: schon and schön are not interchangeable.",
      "En später, sp inicial suena shp y ä es larga. No omitas las diéresis: schon y schön no son intercambiables.",
    ),
    words: [
      p(
        "Ich komme zehn Minuten später.",
        "J’arrive dix minutes plus tard.",
        "I’ll arrive ten minutes later.",
        "Llego diez minutos más tarde.",
      ),
      p("Es tut mir leid.", "Je suis désolé.", "I’m sorry.", "Lo siento."),
      p(
        "Bis gleich!",
        "À tout de suite !",
        "See you shortly!",
        "¡Hasta ahora!",
      ),
      p("Viele Grüße", "Bien cordialement", "Best wishes", "Un saludo"),
    ],
    reading: p(
      "Hallo Nora, ich komme zehn Minuten später. Es tut mir leid. Bis gleich! Sami",
      "Salut Nora, j’arrive dix minutes plus tard. Désolé. À tout de suite ! Sami",
      "Hi Nora, I’ll arrive ten minutes later. I’m sorry. See you shortly! Sami",
      "Hola Nora, llego diez minutos más tarde. Lo siento. ¡Hasta ahora! Sami",
    ),
    question: t(
      "Que signale Sami ?",
      "What does Sami report?",
      "¿Qué comunica Sami?",
    ),
    answers: ["Zehn Minuten später", "Zehn Euro", "Zehn Nächte"],
    listen: "Es tut mir leid.",
    heard: [
      t("Des excuses.", "An apology.", "Una disculpa."),
      t("Une invitation.", "An invitation.", "Una invitación."),
      t("Une commande.", "An order.", "Un pedido."),
    ],
  }),
  lesson({
    id: "de1-u08-l1",
    title: t(
      "Une journée à Hambourg",
      "A day in Hamburg",
      "Un día en Hamburgo",
    ),
    grammar: t(
      "Heute besuchen wir… : le verbe reste en deuxième position. On réunit heure, lieu et souhait sans ajouter de nouvelle conjugaison. Le récit décrit une scène fictive, pas un horaire réel.",
      "Heute besuchen wir…: the verb stays second. Combine time, place and wishes without a new conjugation. This is a fictional scene, not a real timetable.",
      "Heute besuchen wir…: el verbo sigue segundo. Une hora, lugar y deseo sin una conjugación nueva. Es una escena ficticia, no un horario real.",
    ),
    sound: t(
      "Le h de Hamburg s’aspire; le g final devient k. Le ch de Speicher est doux comme dans ich.",
      "The h in Hamburg is audible; final g sounds like k. The ch of Speicher is soft, as in ich.",
      "La h de Hamburg se aspira; la g final suena k. La ch de Speicher es suave, como en ich.",
    ),
    words: [
      p(
        "Heute besuchen wir Hamburg.",
        "Aujourd’hui, nous visitons Hambourg.",
        "Today we visit Hamburg.",
        "Hoy visitamos Hamburgo.",
      ),
      p(
        "Wir treffen uns um zehn Uhr.",
        "On se retrouve à dix heures.",
        "We meet at ten.",
        "Nos vemos a las diez.",
      ),
      p(
        "Ich möchte die Speicherstadt sehen.",
        "Je voudrais voir la Speicherstadt.",
        "I would like to see the Speicherstadt.",
        "Quisiera ver la Speicherstadt.",
      ),
      p(
        "Danach gehen wir ins Café.",
        "Ensuite, on va au café.",
        "Afterwards we go to the café.",
        "Después vamos al café.",
      ),
    ],
    reading: p(
      "Wir treffen uns um zehn Uhr. Wir besuchen die Speicherstadt. Danach gehen wir ins Café.",
      "On se retrouve à dix heures. On visite la Speicherstadt. Ensuite, on va au café.",
      "We meet at ten. We visit the Speicherstadt. Afterwards we go to the café.",
      "Nos vemos a las diez. Visitamos la Speicherstadt. Después vamos al café.",
    ),
    question: t(
      "Que fait-on après la visite ?",
      "What happens after the visit?",
      "¿Qué hacemos después de la visita?",
    ),
    answers: ["Ins Café gehen", "Zum Bahnhof gehen", "Nach Köln fahren"],
    listen: "Wir treffen uns um zehn Uhr.",
    heard: [
      t("Rendez-vous à dix heures.", "Meeting at ten.", "Cita a las diez."),
      t("Départ à neuf heures.", "Departure at nine.", "Salida a las nueve."),
      t(
        "Retour dans dix jours.",
        "Return in ten days.",
        "Regreso en diez días.",
      ),
    ],
  }),
  lesson({
    id: "de1-u08-l2",
    title: t("Changer son plan", "Change your plan", "Cambiar el plan"),
    grammar: t(
      "Aber relie deux idées opposées sans changer leur ordre : Ich möchte kommen, aber ich habe keine Zeit. Oder présente un choix.",
      "Aber connects contrasting ideas without changing their word order: Ich möchte kommen, aber ich habe keine Zeit. Oder offers a choice.",
      "Aber une ideas opuestas sin cambiar su orden: Ich möchte kommen, aber ich habe keine Zeit. Oder presenta una alternativa.",
    ),
    sound: t(
      "Dans können et kommen, ne confonds pas ö et o. Écoute plusieurs fois, puis alterne les mots lentement.",
      "Do not confuse ö and o in können and kommen. Listen several times, then alternate the words slowly.",
      "No confundas ö y o en können y kommen. Escucha varias veces y alterna las palabras despacio.",
    ),
    words: [
      p(
        "Ich möchte kommen, aber ich habe keine Zeit.",
        "Je voudrais venir, mais je n’ai pas le temps.",
        "I would like to come, but I have no time.",
        "Quisiera ir, pero no tengo tiempo.",
      ),
      p(
        "Heute oder morgen?",
        "Aujourd’hui ou demain ?",
        "Today or tomorrow?",
        "¿Hoy o mañana?",
      ),
      p(
        "Wir können den Bus nehmen.",
        "Nous pouvons prendre le bus.",
        "We can take the bus.",
        "Podemos tomar el autobús.",
      ),
      p(
        "Das ist eine gute Idee.",
        "C’est une bonne idée.",
        "That is a good idea.",
        "Es una buena idea.",
      ),
    ],
    reading: p(
      "Der Zug hat Verspätung. Wir können den Bus nehmen oder im Café warten.",
      "Le train est en retard. On peut prendre le bus ou attendre au café.",
      "The train is delayed. We can take the bus or wait in the café.",
      "El tren tiene retraso. Podemos tomar el autobús o esperar en el café.",
    ),
    question: t(
      "Quel autre moyen de transport est proposé ?",
      "Which other transport is suggested?",
      "¿Qué otro transporte se propone?",
    ),
    answers: ["Den Bus", "Das Fahrrad", "Das Flugzeug"],
    listen: "Heute oder morgen?",
    heard: [
      t(
        "Un choix entre deux jours.",
        "A choice between two days.",
        "Una elección entre dos días.",
      ),
      t(
        "Un choix entre deux lieux.",
        "A choice between two places.",
        "Una elección entre dos lugares.",
      ),
      t("Un prix.", "A price.", "Un precio."),
    ],
  }),
  lesson({
    id: "de1-u08-l3",
    title: t(
      "Ta prochaine conversation",
      "Your next conversation",
      "Tu próxima conversación",
    ),
    grammar: t(
      "Pratique le cycle : saluer, dire ce dont tu as besoin, demander une précision, remercier. Les formulations étudiées sont un point de départ, pas une certification de niveau.",
      "Practise the cycle: greet, state your need, ask for clarification, thank the person. These patterns are a starting point, not a level certificate.",
      "Practica el ciclo: saludar, decir lo que necesitas, pedir una aclaración y agradecer. Las frases son un punto de partida, no un certificado de nivel.",
    ),
    sound: t(
      "Garde une pause entre les groupes de sens. Compare ta phrase au modèle; une réussite écrite ne mesure pas automatiquement la prononciation.",
      "Pause between meaningful chunks. Compare your phrase with the model; written success does not automatically measure pronunciation.",
      "Haz pausas entre grupos de sentido. Compara tu frase con el modelo; acertar por escrito no evalúa automáticamente la pronunciación.",
    ),
    words: [
      p(
        "Ich möchte Deutsch üben.",
        "Je voudrais pratiquer l’allemand.",
        "I would like to practise German.",
        "Quisiera practicar alemán.",
      ),
      p(
        "Können wir langsam sprechen?",
        "Pouvons-nous parler lentement ?",
        "Can we speak slowly?",
        "¿Podemos hablar despacio?",
      ),
      p(
        "Wie sagt man das auf Deutsch?",
        "Comment dit-on cela en allemand ?",
        "How do you say that in German?",
        "¿Cómo se dice eso en alemán?",
      ),
      p(
        "Danke für das Gespräch.",
        "Merci pour la conversation.",
        "Thank you for the conversation.",
        "Gracias por la conversación.",
      ),
    ],
    reading: p(
      "Nora möchte Deutsch üben. Sie fragt: Können wir langsam sprechen?",
      "Nora veut pratiquer l’allemand. Elle demande : pouvons-nous parler lentement ?",
      "Nora wants to practise German. She asks: can we speak slowly?",
      "Nora quiere practicar alemán. Pregunta: ¿podemos hablar despacio?",
    ),
    question: t(
      "Qu’est-ce que Nora souhaite pratiquer ?",
      "What does Nora want to practise?",
      "¿Qué quiere practicar Nora?",
    ),
    answers: ["Deutsch", "Französisch", "Italienisch"],
    listen: "Danke für das Gespräch.",
    heard: [
      t(
        "Remercier pour la conversation.",
        "Thank someone for the conversation.",
        "Agradecer la conversación.",
      ),
      t("Demander l’addition.", "Ask for the bill.", "Pedir la cuenta."),
      t("Demander un billet.", "Ask for a ticket.", "Pedir un billete."),
    ],
  }),
];
