import { base, choice, dialogue, lesson, option, phrase, t } from "../italian/course/courseAuthoring";
import type { CourseUnit, CoursePhrase } from "../italian/course/courseTypes";
import type { LocaleText } from "../italian/italianModuleTypes";
import type { VisualWord, VocabularyPicture, WordBankEntry } from "./types";

// Original YoPratiqo material. University references guide sequencing, not copied exercises.
const greetings = [
  phrase("Ciao!", "Salut !", "Hi! / Bye!", "¡Hola! / ¡Chao!"),
  phrase("Buongiorno!", "Bonjour !", "Good morning!", "¡Buenos días!"),
  phrase("Mi chiamo Nina.", "Je m’appelle Nina.", "My name is Nina.", "Me llamo Nina."),
  phrase("Come ti chiami?", "Comment t’appelles-tu ?", "What is your name?", "¿Cómo te llamas?"),
  phrase("Piacere!", "Enchanté / enchantée !", "Nice to meet you!", "¡Mucho gusto!"),
  phrase("Come stai?", "Comment vas-tu ?", "How are you?", "¿Cómo estás?"),
  phrase("Sto bene, grazie.", "Je vais bien, merci.", "I’m well, thank you.", "Estoy bien, gracias."),
  phrase("Sto così così.", "Je vais comme ci, comme ça.", "I’m so-so.", "Estoy más o menos."),
  phrase("Sto male.", "Je vais mal.", "I’m not well.", "Estoy mal."),
  phrase("E tu?", "Et toi ?", "And you?", "¿Y tú?"),
  phrase("Grazie!", "Merci !", "Thank you!", "¡Gracias!"),
  phrase("Arrivederci!", "Au revoir !", "Goodbye!", "¡Hasta luego!"),
];
const origins = [
  phrase("Di dove sei?", "D’où viens-tu ?", "Where are you from?", "¿De dónde eres?"),
  phrase("Sono di Montréal.", "Je viens de Montréal.", "I’m from Montréal.", "Soy de Montréal."),
  phrase("Sono canadese.", "Je suis canadien / canadienne.", "I’m Canadian.", "Soy canadiense."),
  phrase("Sono italiano.", "Je suis italien.", "I’m Italian (masculine).", "Soy italiano."),
  phrase("Sono italiana.", "Je suis italienne.", "I’m Italian (feminine).", "Soy italiana."),
  phrase("Sono francese.", "Je suis français / française.", "I’m French.", "Soy francés / francesa."),
  phrase("Sono di Bologna.", "Je viens de Bologne.", "I’m from Bologna.", "Soy de Bolonia."),
  phrase("Sei italiana?", "Es-tu italienne ?", "Are you Italian? (feminine)", "¿Eres italiana?"),
  phrase("Sì, sono italiana.", "Oui, je suis italienne.", "Yes, I’m Italian (feminine).", "Sí, soy italiana."),
];
const ages = [
  phrase("Quanti anni hai?", "Quel âge as-tu ?", "How old are you?", "¿Cuántos años tienes?"),
  phrase("Ho venti anni.", "J’ai vingt ans.", "I’m twenty years old.", "Tengo veinte años."),
  phrase("Ho ventuno anni.", "J’ai vingt et un ans.", "I’m twenty-one years old.", "Tengo veintiún años."),
  phrase("Ho ventotto anni.", "J’ai vingt-huit ans.", "I’m twenty-eight years old.", "Tengo veintiocho años."),
  phrase("Ho trenta anni.", "J’ai trente ans.", "I’m thirty years old.", "Tengo treinta años."),
  phrase("Hai ventotto anni?", "As-tu vingt-huit ans ?", "Are you twenty-eight?", "¿Tienes veintiocho años?"),
  phrase("Sì.", "Oui.", "Yes.", "Sí."),
  phrase("No.", "Non.", "No.", "No."),
];
function options(rows: [string, LocaleText][]) { return rows.map(([text, feedback], i) => option(String(i), text, feedback)); }
const right = t("Cette réponse correspond à la situation.", "This response fits the situation.", "Esta respuesta corresponde a la situación.");
const nameFeedback = t("Mi chiamo donne un nom.", "Mi chiamo gives a name.", "Mi chiamo da un nombre.");
const originFeedback = t("Sono di introduit une ville d’origine.", "Sono di introduces a city of origin.", "Sono di introduce una ciudad de origen.");
const ageFeedback = t("Ho … anni donne un âge, avec avere.", "Ho … anni gives an age, using avere.", "Ho … anni indica la edad, con avere.");
const feelingFeedback = t("Sto décrit ici comment une personne va.", "Sto describes how someone is doing here.", "Sto describe aquí cómo se encuentra alguien.");
const m1 = lesson({
 id: "it2-u01-l1", title: t("Bonjour, enchanté !", "Hello, nice to meet you!", "¡Hola, mucho gusto!"),
 goal: t("Salue, échange les noms et demande comment l’autre personne va.", "Greet someone, exchange names and ask how they are.", "Saluda, intercambia nombres y pregunta cómo está la otra persona."), vocabulary: greetings,
 grammar: {title:t("Un nom et un état", "A name and a feeling", "Un nombre y un estado"), body:t(
  "Pour un nom : mi chiamo (je m’appelle), ti chiami (tu t’appelles), si chiama (il ou elle s’appelle). Pour demander comment ça va : Come stai? On répond Sto bene, Sto così così ou Sto male. Le sujet io ou tu peut rester implicite : la forme du verbe indique la personne. E tu? rend la parole à l’autre. Ciao est familier ; buongiorno est plus neutre. Avec une personne que l’on vouvoie : Come si chiama? et Come sta? Nous pratiquons d’abord le tutoiement.",
  "For a name: mi chiamo (my name is), ti chiami (your name is), si chiama (his or her name is). Ask how someone is with Come stai? Reply Sto bene, Sto così così or Sto male. The subject io or tu can be omitted: the verb form identifies the person. E tu? gives the other person a turn. Ciao is informal; buongiorno is more neutral. For formal address: Come si chiama? and Come sta? We practise informal exchanges first.",
  "Para el nombre: mi chiamo (me llamo), ti chiami (te llamas), si chiama (se llama). Pregunta cómo está alguien con Come stai? Responde Sto bene, Sto così così o Sto male. Se puede omitir io o tu: la forma verbal identifica la persona. E tu? devuelve la palabra. Ciao es informal; buongiorno es más neutro. Para tratar de usted: Come si chiama? y Come sta? Primero practicamos el trato informal."), examples:[greetings[2],greetings[5],greetings[6]]},
 pronunciation:{body:t("Écoute le rythme de chiamo : chi garde un son /k/. Dans piacere, ce a le son de « tch ». Réécoute une expression, puis répète-la sans devoir t’enregistrer.","Listen to chiamo: chi keeps a /k/ sound. In piacere, ce sounds like the start of English ‘check’. Replay a phrase, then repeat it; recording yourself is not required.","Escucha chiamo: chi mantiene el sonido /k/. En piacere, ce suena como la ch española. Repite una expresión; no necesitas grabarte."),practice:["Come ti chiami?","Mi chiamo Nina.","Piacere!"]},
 reading:phrase("— Ciao! Come ti chiami?\n— Mi chiamo Nina. E tu?\n— Mi chiamo Luca. Piacere!\n— Piacere! Come stai?\n— Sto bene, grazie.","— Salut ! Comment t’appelles-tu ?\n— Je m’appelle Nina. Et toi ?\n— Je m’appelle Luca. Enchanté !\n— Enchantée ! Comment vas-tu ?\n— Je vais bien, merci.","— Hi! What is your name?\n— My name is Nina. And you?\n— My name is Luca. Nice to meet you!\n— Nice to meet you! How are you?\n— I’m well, thank you.","— ¡Hola! ¿Cómo te llamas?\n— Me llamo Nina. ¿Y tú?\n— Me llamo Luca. ¡Mucho gusto!\n— ¡Mucho gusto! ¿Cómo estás?\n— Estoy bien, gracias."),
 order:greetings[6],recall:greetings[3],
 comprehension:choice("it2-u01-l1-read",t("Nina demande Come stai? Que répond Luca ?","Nina asks Come stai? What does Luca reply?","Nina pregunta Come stai? ¿Qué contesta Luca?"),options([["Sto bene, grazie.",feelingFeedback],["Mi chiamo Luca.",nameFeedback],["Sono di Bologna.",originFeedback]]),"0",feelingFeedback),
 listening:choice("it2-u01-l1-listen",t("Écoute la présentation. Quel est le prénom ?","Listen to the introduction. What is the first name?","Escucha la presentación. ¿Cuál es el nombre?"),options([["Nina",right],["Luca",nameFeedback],["Omar",nameFeedback]]),"1",t("La personne dit Mi chiamo Luca.","The person says Mi chiamo Luca.","La persona dice Mi chiamo Luca."),"listen","Mi chiamo Luca. Sono italiano, di Bologna."),
 speaking:{prompt:t("Salue Yoppo et dis ton prénom, ou un prénom imaginaire.","Greet Yoppo and use your name or an imaginary name.","Saluda a Yoppo y usa tu nombre o uno imaginario."),checklist:[]},
});
const m2 = lesson({
 id:"it2-u01-l2",title:t("D’où viens-tu ?","Where are you from?","¿De dónde eres?"),goal:t("Distingue une ville d’origine d’une nationalité.","Distinguish a city of origin from a nationality.","Distingue una ciudad de origen de una nacionalidad."),vocabulary:origins,
 grammar:{title:t("Essere : sono, sei, è","Essere: sono, sei, è","Essere: sono, sei, è"),body:t(
  "Sono = je suis ; sei = tu es ; è = il ou elle est. Di dove sei? demande l’origine. Sono di Montréal donne une ville ; Sono canadese donne une nationalité. Italiano / italiana s’accorde avec la personne ; canadese et francese gardent la même forme au singulier. Une ville de naissance ou d’origine ne prouve pas une nationalité : nos personnages fictifs la précisent eux-mêmes. Une question peut garder l’ordre des mots et changer d’intonation : Sei italiana?",
  "Sono = I am; sei = you are; è = he or she is. Di dove sei? asks about origin. Sono di Montréal gives a city; Sono canadese gives a nationality. Italiano / italiana agrees with the person; canadese and francese use the same singular form. A city of birth or origin does not prove nationality: our fictional characters state it explicitly. A question can keep the word order and change the intonation: Sei italiana?",
  "Sono = soy; sei = eres; è = es. Di dove sei? pregunta el origen. Sono di Montréal indica una ciudad; Sono canadese indica una nacionalidad. Italiano / italiana concuerda con la persona; canadese y francese mantienen la misma forma singular. Una ciudad de origen no demuestra una nacionalidad: nuestros personajes ficticios la declaran. Una pregunta puede mantener el orden y cambiar la entonación: Sei italiana?"),examples:[origins[0],origins[1],origins[2]]},
 pronunciation:{body:t("Écoute sono et sei. L’accent de è distingue le verbe être de e (et). Pratique la question Di dove sei? avec une intonation naturelle.","Listen to sono and sei. The accent in è distinguishes ‘is’ from e (‘and’). Practise Di dove sei? with natural question intonation.","Escucha sono y sei. El acento de è distingue ‘es’ de e (‘y’). Practica Di dove sei? con entonación natural."),practice:["Sono canadese.","Di dove sei?","Sono di Montréal."]},
 reading:phrase("— Di dove sei, Nina?\n— Sono di Montréal. Sono canadese. E tu?\n— Sono di Bologna. Sono italiano.","— D’où viens-tu, Nina ?\n— Je viens de Montréal. Je suis canadienne. Et toi ?\n— Je viens de Bologne. Je suis italien.","— Where are you from, Nina?\n— I’m from Montréal. I’m Canadian. And you?\n— I’m from Bologna. I’m Italian.","— ¿De dónde eres, Nina?\n— Soy de Montréal. Soy canadiense. ¿Y tú?\n— Soy de Bolonia. Soy italiano."),order:origins[1],recall:origins[0],
 comprehension:choice("it2-u01-l2-read",t("Quelle phrase indique la nationalité de Nina ?","Which sentence states Nina’s nationality?","¿Qué frase indica la nacionalidad de Nina?"),options([["Mi chiamo Nina.",nameFeedback],["Sono di Montréal.",originFeedback],["Sono canadese.",right]]),"2",t("Canadese est une nationalité ; Montréal est une ville.","Canadese is a nationality; Montréal is a city.","Canadese es una nacionalidad; Montréal es una ciudad.")),
 listening:choice("it2-u01-l2-listen",t("Quelle ville la personne mentionne-t-elle ?","Which city does the person mention?","¿Qué ciudad menciona la persona?"),options([["Bologna",originFeedback],["Montréal",right],["Roma",originFeedback]]),"1",originFeedback,"listen","Sono di Montréal."),
 speaking:{prompt:t("Demande l’origine de Yoppo.","Ask where Yoppo is from.","Pregunta de dónde es Yoppo."),checklist:[]},
});
const m3 = lesson({
 id:"it2-u01-l3",title:t("Quel âge as-tu ?","How old are you?","¿Cuántos años tienes?"),goal:t("Comprends un âge et réunis les éléments d’une première rencontre.","Understand an age and bring the first-meeting skills together.","Comprende una edad y combina lo aprendido para un primer encuentro."),vocabulary:ages,
 grammar:{title:t("L’âge avec avere","Age with avere","La edad con avere"),body:t(
  "On utilise avere pour l’âge : ho (j’ai), hai (tu as), ha (il ou elle a). La structure est ho + nombre + anni. Quanti anni hai? demande l’âge. Venti = 20, ventuno = 21, ventotto = 28, trenta = 30. Avant uno et otto, venti perd son i : ventuno, ventotto. Ho trenta anni et Ho trent’anni sont deux façons correctes de dire trente ans. Les personnages ont des âges fictifs : tu n’as jamais à donner ton âge réel.",
  "Italian uses avere for age: ho (I have), hai (you have), ha (he or she has). The pattern is ho + number + anni. Quanti anni hai? asks someone’s age. Venti = 20, ventuno = 21, ventotto = 28, trenta = 30. Before uno and otto, venti loses its i: ventuno, ventotto. Ho trenta anni and Ho trent’anni are both correct ways to say thirty years old. The characters have fictional ages: you never need to give your real age.",
  "Se usa avere para la edad: ho (tengo), hai (tienes), ha (tiene). La estructura es ho + número + anni. Quanti anni hai? pregunta la edad. Venti = 20, ventuno = 21, ventotto = 28, trenta = 30. Ante uno y otto, venti pierde la i: ventuno, ventotto. Ho trenta anni y Ho trent’anni son correctos. Las edades son ficticias: no tienes que dar tu edad real."),examples:[ages[0],ages[3],ages[4]]},
 pronunciation:{body:t("Le h de ho et hai ne se prononce pas. Dans anni, fais durer le n double. Réécoute ventuno et ventotto : les nombres se prononcent comme un seul mot.","The h in ho and hai is silent. Hold the double n in anni. Listen again to ventuno and ventotto: each number is pronounced as one word.","La h de ho y hai no se pronuncia. Mantén la n doble de anni. Escucha ventuno y ventotto: cada número se pronuncia como una sola palabra."),practice:["Ho ventotto anni.","Ho ventuno anni.","Quanti anni hai?"]},
 reading:phrase("— Ciao! Mi chiamo Nina. Sono canadese.\n— Piacere! Come stai?\n— Sto bene, grazie. E tu?\n— Sto bene. Quanti anni hai?\n— Ho ventotto anni.","— Salut ! Je m’appelle Nina. Je suis canadienne.\n— Enchanté ! Comment vas-tu ?\n— Je vais bien, merci. Et toi ?\n— Je vais bien. Quel âge as-tu ?\n— J’ai vingt-huit ans.","— Hi! My name is Nina. I’m Canadian.\n— Nice to meet you! How are you?\n— I’m well, thank you. And you?\n— I’m well. How old are you?\n— I’m twenty-eight years old.","— ¡Hola! Me llamo Nina. Soy canadiense.\n— ¡Mucho gusto! ¿Cómo estás?\n— Estoy bien, gracias. ¿Y tú?\n— Estoy bien. ¿Cuántos años tienes?\n— Tengo veintiocho años."),order:ages[3],recall:ages[0],
 comprehension:choice("it2-u01-l3-read",t("Choisis une réponse à Quanti anni hai?","Choose a reply to Quanti anni hai?","Elige una respuesta a Quanti anni hai?"),options([["Sono di Bologna.",originFeedback],["Ho trenta anni.",ageFeedback],["Sto bene.",feelingFeedback]]),"1",ageFeedback),
 listening:choice("it2-u01-l3-listen",t("Quel âge entends-tu ?","What age do you hear?","¿Qué edad oyes?"),options([["28",ageFeedback],["21",right],["30",ageFeedback]]),"1",t("Ventuno signifie 21.","Ventuno means 21.","Ventuno significa 21."),"listen","Ho ventuno anni."),
 extra:[dialogue("it2-u01-l3-conversation",t("Une nouvelle rencontre","A new meeting","Un nuevo encuentro"),t("Réponds à Luca, sans écrire.","Reply to Luca without typing.","Responde a Luca sin escribir."),[
  {speaker:"Luca",line:"Come ti chiami?",prompt:t("Présente-toi comme Nina.","Introduce yourself as Nina.","Preséntate como Nina."),options:options([["Mi chiamo Nina.",nameFeedback],["Ho ventotto anni.",ageFeedback],["Sono canadese.",originFeedback]]),correctId:"0"},
  {speaker:"Luca",line:"Di dove sei?",prompt:t("Tu viens de Montréal.","You are from Montréal.","Eres de Montréal."),options:options([["Sto bene.",feelingFeedback],["Sono di Montréal.",originFeedback],["Mi chiamo Nina.",nameFeedback]]),correctId:"1"},
  {speaker:"Luca",line:"Quanti anni hai?",prompt:t("Ton personnage a vingt-huit ans.","Your character is twenty-eight.","Tu personaje tiene veintiocho años."),options:options([["Ho ventuno anni.",ageFeedback],["Sono italiana.",originFeedback],["Ho ventotto anni.",right]]),correctId:"2"},
 ],t("Chaque réponse répond à la question posée : nom, origine, âge.","Each reply answers the question asked: name, origin, age.","Cada respuesta corresponde a la pregunta: nombre, origen, edad."))],
 speaking:{prompt:t("Joue une rencontre avec un personnage imaginaire.","Act out a meeting with an imaginary character.","Representa un encuentro con un personaje imaginario."),checklist:[]},
});
export const firstMeetingUnit: CourseUnit = {
 id:"u01",number:1,title:t("Piacere ! Première rencontre","Piacere! A first meeting","¡Piacere! Un primer encuentro"),
 subtitle:t("Salutations, prénom, état, origine, nationalité et âge.","Greetings, name, feelings, origin, nationality and age.","Saludos, nombre, estado, origen, nacionalidad y edad."),
 objectives:[m1.goal,m2.goal,m3.goal],lessons:[m1,m2,m3],
 quiz:{id:"it2-u01-final",title:t("Rencontre à Bologne","Meet someone in Bologna","Encuentro en Bolonia"),description:t("Réutilise ce que tu as appris dans une nouvelle conversation. Quatre bonnes réponses sur cinq sans aide donnent le tampon.","Use what you learned in a new conversation. Four correct answers out of five without help earn the stamp.","Usa lo aprendido en una nueva conversación. Cuatro aciertos de cinco sin ayuda dan el sello."),unitIds:["u01"],passPercent:80,questions:[
 choice("it2-u01-q1",t("Une personne demande ton prénom. Tu joues Nina : que réponds-tu ?","Someone asks your name. You play Nina: what do you reply?","Alguien pregunta tu nombre. Eres Nina: ¿qué respondes?"),options([["Mi chiamo Nina.",nameFeedback],["Sono canadese.",originFeedback],["Ho ventotto anni.",ageFeedback]]),"0",nameFeedback),
 choice("it2-u01-q2",t("Après Come stai?, choisis une réponse indiquant que tout va bien.","After Come stai?, choose a reply saying you are well.","Después de Come stai?, elige una respuesta que indique que estás bien."),options([["Sono di Montréal.",originFeedback],["Sto bene, grazie.",feelingFeedback],["Quanti anni hai?",ageFeedback]]),"1",feelingFeedback),
 {...base("it2-u01-q3",t("À toi","Your turn","Tu turno"),t("Construis : « D’où viens-tu ? »","Build: ‘Where are you from?’","Construye: «¿De dónde eres?»"),originFeedback),kind:"type",model:"Di dove sei?",accepted:["Di dove sei?"]},
 choice("it2-u01-q4",t("Écoute. Quel âge a la personne ?","Listen. How old is the person?","Escucha. ¿Cuántos años tiene la persona?"),options([["21",ageFeedback],["30",ageFeedback],["28",right]]),"2",ageFeedback,"listen","Ho ventotto anni."),
 choice("it2-u01-q5",t("Nina indique une nationalité canadienne. Quelle phrase utilise-t-elle ?","Nina states a Canadian nationality. Which phrase does she use?","Nina indica nacionalidad canadiense. ¿Qué frase usa?"),options([["Sono di Montréal.",originFeedback],["Sono canadese.",right],["Sto bene.",feelingFeedback]]),"1",t("La nationalité ne se déduit ni du visage ni de la ville : elle est explicitement donnée.","Nationality is not inferred from a face or city: it is stated explicitly.","La nacionalidad no se deduce del rostro ni de la ciudad: se indica explícitamente.")),
 ]},
 production:{id:"it2-u01-reference",title:t("Repère oral","Speaking reference","Referencia oral"),prompt:m3.speaking.prompt,model:"Mi chiamo Nina. Sono canadese. Ho ventotto anni.",rubric:[]},
 culture:{title:t("Rencontrer sans présumer","Meet without assuming","Conocer sin suponer"),body:t("Les personnages et leurs informations sont fictifs. Tu peux pratiquer sans communiquer d’informations personnelles.","Characters and their details are fictional. Practise without sharing personal information.","Los personajes y sus datos son ficticios. Practica sin compartir información personal."),sourceIds:[]},
};
const picture = (id:string,kind:VocabularyPicture["kind"],label:string,alt:LocaleText,extra:Partial<VocabularyPicture>={}):VocabularyPicture=>({id,kind,label,alt,...extra});
const people = [
 picture("nina","profile","Nina",t("Personnage portant le prénom Nina","Character wearing the name Nina","Personaje con el nombre Nina")),
 picture("luca","profile","Luca",t("Personnage portant le prénom Luca","Character wearing the name Luca","Personaje con el nombre Luca")),
 picture("omar","profile","Omar",t("Personnage portant le prénom Omar","Character wearing the name Omar","Personaje con el nombre Omar")),
 picture("sara","profile","Sara",t("Personnage portant le prénom Sara","Character wearing the name Sara","Personaje con el nombre Sara")),
];
const feelings = [
 picture("well","feeling","",t("Une personne sourit et lève le pouce","A person smiles and gives a thumbs-up","Una persona sonríe y levanta el pulgar"),{mood:"happy"}),
 picture("soso","feeling","",t("Une personne fait un geste hésitant","A person makes an uncertain gesture","Una persona hace un gesto de duda"),{mood:"neutral"}),
 picture("unwell","feeling","",t("Une personne se repose, l’air souffrant","A person rests, looking unwell","Una persona descansa y parece sentirse mal"),{mood:"sad"}),
 picture("asleep","greeting","22:00",t("Une personne dort sous la lune","A person sleeps under the moon","Una persona duerme bajo la luna"),{time:"night"}),
];
const intentions = [
 picture("name","question","?",t("Une personne demande le prénom sur un porte-nom","A person asks about a name badge","Una persona pregunta por el nombre de una etiqueta"),{detail:"NOME"}),
 picture("origin","question","?",t("Une personne montre une carte avec une épingle","A person points to a map pin","Una persona señala un mapa con un marcador"),{detail:"MAP"}),
 picture("age","question","?",t("Une personne montre un gâteau d’anniversaire et des nombres","A person points to a birthday cake and numbers","Una persona señala una torta de cumpleaños y números"),{detail:"AGE"}),
 picture("feeling","question","?",t("Une personne désigne un visage souriant et un visage triste","A person points to a happy and a sad face","Una persona señala una cara feliz y una triste"),{detail:"FEELING"}),
];
const nationalities = [
 picture("canadian","profile","Canada",t("Profil fictif : nationalité Canada","Fictional profile: nationality Canada","Perfil ficticio: nacionalidad Canadá"),{country:"CA",detail:"NATIONALITY"}),
 picture("italian","profile","Italia",t("Profil fictif : nationalité Italie","Fictional profile: nationality Italy","Perfil ficticio: nacionalidad Italia"),{country:"IT",detail:"NATIONALITY"}),
 picture("french","profile","France",t("Profil fictif : nationalité France","Fictional profile: nationality France","Perfil ficticio: nacionalidad Francia"),{country:"FR",detail:"NATIONALITY"}),
 picture("city","profile","Montréal",t("Carte de ville : Montréal, sans indication de nationalité","City card: Montréal, with no nationality given","Tarjeta de ciudad: Montréal, sin indicar nacionalidad"),{detail:"CITY"}),
];
const cities = ["Montréal","Bologna","Roma","Paris"].map(label=>picture(label,"profile",label,t(`Carte de ville : ${label}`,`City map: ${label}`,`Mapa de ciudad: ${label}`),{detail:"CITY"}));
const agesPictures = [20,21,28,30].map(n=>picture(String(n),"age",String(n),t(`Personnage fictif : ${n} ans`,`Fictional character: age ${n}`,`Personaje ficticio: ${n} años`)));
const word = (id:string,p:CoursePhrase,choices:VocabularyPicture[],correctId:string):VisualWord=>({id,it:p.it,meaning:p.meaning,choices,correctId});
export const firstMeetingVisuals: Record<string,VisualWord[]> = {
 "it2-u01-l1":[word("name",greetings[2],people,"nina"),word("ask-name",greetings[3],intentions,"name"),word("well",greetings[6],feelings,"well"),word("soso",greetings[7],feelings,"soso"),word("unwell",greetings[8],feelings,"unwell"),word("ask-feeling",greetings[5],intentions,"feeling")],
 "it2-u01-l2":[word("ask-origin",origins[0],intentions,"origin"),word("montreal",origins[1],cities,"Montréal"),word("bologna",origins[6],cities,"Bologna"),word("canadian",origins[2],nationalities,"canadian"),word("italian",origins[4],nationalities,"italian"),word("french",origins[5],nationalities,"french")],
 "it2-u01-l3":[word("ask-age",ages[0],intentions,"age"),word("age20",ages[1],agesPictures,"20"),word("age21",ages[2],agesPictures,"21"),word("age28",ages[3],agesPictures,"28"),word("age30",ages[4],agesPictures,"30")],
};
const entry = (it:string,fr:string,en:string,es:string,group:WordBankEntry["group"]="words"):WordBankEntry=>({it,meaning:t(fr,en,es),group});
export const firstMeetingBank:WordBankEntry[]=[
 ...[...greetings,...origins,...ages,phrase("Come si chiama?","Comment vous appelez-vous ?","What is your name? (formal)","¿Cómo se llama usted?"),phrase("Come sta?","Comment allez-vous ?","How are you? (formal)","¿Cómo está usted?")].map(p=>({...p,group:"expressions" as const})),
 entry("chiamarsi — mi chiamo / ti chiami / si chiama","s’appeler — je m’appelle / tu t’appelles / il ou elle s’appelle","to be called — my name is / your name is / his or her name is","llamarse — me llamo / te llamas / se llama","verbs"),
 entry("essere — sono / sei / è","être — je suis / tu es / il ou elle est","to be — I am / you are / he or she is","ser — soy / eres / es","verbs"),
 entry("stare — sto / stai / sta","aller — je vais / tu vas / il ou elle va (état)","to be — I am / you are / he or she is (feeling)","estar — estoy / estás / está","verbs"),
 entry("avere — ho / hai / ha","avoir — j’ai / tu as / il ou elle a","to have — I have / you have / he or she has","tener — tengo / tienes / tiene","verbs"),
 entry("io / tu / lui / lei","je / tu / il / elle","I / you / he / she","yo / tú / él / ella"),
 entry("Lei","vous (une personne, forme polie)","you (one person, formal)","usted"),
 entry("mi / ti / si","me / te / se (avec chiamarsi)","myself / yourself / himself or herself (with chiamarsi)","me / te / se (con chiamarsi)"),
 entry("come / dove / quanti","comment / où / combien (masculin pluriel)","how / where / how many (masculine plural)","cómo / dónde / cuántos"),
 entry("di / e","de / et","of, from / and","de / y"),
 entry("bene / male / così così","bien / mal / comme ci, comme ça","well / badly / so-so","bien / mal / más o menos"),
 entry("anno / anni","an / ans","year / years","año / años"),
 entry("italiano / italiana","italien / italienne","Italian (masculine / feminine)","italiano / italiana"),
 entry("canadese / francese","canadien ou canadienne / français ou française","Canadian / French (same singular form)","canadiense / francés o francesa"),
 entry("Canada / Italia / Francia","Canada / Italie / France","Canada / Italy / France","Canadá / Italia / Francia"),
 entry("Nina / Luca / Omar / Sara","prénoms fictifs","fictional first names","nombres ficticios"),
 entry("Montréal / Bologna / Roma / Paris","Montréal / Bologne / Rome / Paris","Montréal / Bologna / Rome / Paris","Montréal / Bolonia / Roma / París"),
 entry("Ho trent’anni.","J’ai trente ans (variante de Ho trenta anni).","I’m thirty (variant of Ho trenta anni).","Tengo treinta años (variante de Ho trenta anni).","expressions"),
 ...["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci","undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove","venti","ventuno","ventidue","ventitré","ventiquattro","venticinque","ventisei","ventisette","ventotto","ventinove","trenta"].map((n,i)=>entry(n,String(i),String(i),String(i),"numbers")),
];
