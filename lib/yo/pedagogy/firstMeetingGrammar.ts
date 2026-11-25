import type { YoLocale } from "../types";

export type StudyText = Record<YoLocale, string>;
export type StudyExample = { text: string; meaning: StudyText };
export type StudySection = { title: StudyText; explanation: StudyText; examples: StudyExample[] };
export type LanguageGuide = { title: StudyText; introduction: StudyText; sections: StudySection[]; remember: StudyText; more: StudySection[] };
const text = (fr: string, en: string, es: string): StudyText => ({ fr, en, es });
const example = (it: string, fr: string, en: string, es: string): StudyExample => ({ text: it, meaning: text(fr, en, es) });

/** Authored teaching copy, not a live AI conversation. Exercise IDs and scoring are untouched. */
export const firstMeetingGrammar: Readonly<Record<string, LanguageGuide>> = {
  "it2-u01-l1": {
    title: text("Se présenter et prendre des nouvelles", "Introduce yourself and ask how someone is", "Presentarte y preguntar cómo está alguien"),
    introduction: text("Tu rencontres quelqu’un. Voici comment donner ton prénom, puis demander comment ça va.", "You meet someone new. Here is how to give your name, then ask how they are.", "Conoces a alguien. Así puedes decir tu nombre y preguntar cómo está."),
    sections: [
      {
        title: text("Pour dire ton prénom", "Give your name", "Di tu nombre"),
        explanation: text("Utilise « Mi chiamo », puis ton prénom. Pour demander le prénom de l’autre personne, utilise « Come ti chiami? ».", "Use “Mi chiamo”, followed by your name. Ask the other person’s name with “Come ti chiami?”.", "Usa «Mi chiamo» seguido de tu nombre. Para preguntar el nombre de la otra persona, usa «Come ti chiami?»."),
        examples: [example("Mi chiamo Nina.", "Je m’appelle Nina.", "My name is Nina.", "Me llamo Nina."), example("Come ti chiami?", "Comment t’appelles-tu?", "What is your name?", "¿Cómo te llamas?")],
      },
      {
        title: text("Pour demander comment ça va", "Ask how someone is", "Pregunta cómo está"),
        explanation: text("« Come stai? » sert à prendre des nouvelles. Pour répondre, on utilise « sto », puis on dit comment on va.", "“Come stai?” asks how someone is doing. Reply with “sto”, followed by how you feel.", "«Come stai?» pregunta cómo se encuentra alguien. Responde con «sto» seguido de cómo estás."),
        examples: [example("Come stai?", "Comment vas-tu?", "How are you?", "¿Cómo estás?"), example("Sto bene, grazie.", "Je vais bien, merci.", "I’m well, thank you.", "Estoy bien, gracias."), example("Sto così così.", "Je vais comme ci, comme ça.", "I’m so-so.", "Estoy más o menos."), example("Sto male.", "Je vais mal.", "I’m not well.", "Estoy mal.")],
      },
      {
        title: text("Pour faire continuer l’échange", "Keep the conversation going", "Sigue la conversación"),
        explanation: text("Ajoute « E tu? » après ta réponse pour poser la même question à l’autre personne.", "Add “E tu?” after your answer to ask the other person the same question.", "Añade «E tu?» después de tu respuesta para hacer la misma pregunta a la otra persona."),
        examples: [example("Sto bene, grazie. E tu?", "Je vais bien, merci. Et toi?", "I’m well, thank you. And you?", "Estoy bien, gracias. ¿Y tú?")],
      },
    ],
    remember: text("« Mi chiamo » donne ton prénom. « Sto » permet de dire comment tu vas.", "“Mi chiamo” gives your name. “Sto” tells someone how you are doing.", "«Mi chiamo» presenta tu nombre. «Sto» permite decir cómo estás."),
    more: [
      {
        title: text("Pourquoi les mots changent-ils?", "Why do the words change?", "¿Por qué cambian las palabras?"),
        explanation: text("La forme change selon la personne dont tu parles. En italien, on n’a souvent pas besoin d’ajouter « io » (je) ou « tu » : le verbe donne déjà cette information.", "The form changes with the person you are talking about. Italian often leaves out “io” (I) or “tu” (you): the verb already tells you who it is.", "La forma cambia según la persona. En italiano, a menudo no hace falta añadir «io» (yo) o «tu» (tú): el verbo ya indica de quién se habla."),
        examples: [example("mi chiamo / ti chiami / si chiama", "je m’appelle / tu t’appelles / il ou elle s’appelle", "my name is / your name is / his or her name is", "me llamo / te llamas / se llama"), example("sto / stai / sta", "je vais / tu vas / il ou elle va, pour dire comment ça va", "I am / you are / he or she is, when saying how someone is", "estoy / estás / está, para decir cómo se encuentra alguien")],
      },
      {
        title: text("Tutoyer ou vouvoyer", "Informal or polite address", "Hablar de tú o de usted"),
        explanation: text("Dans cette mission, tu tutoies la personne. « Ciao » est familier; « buongiorno » est plus neutre. Pour vouvoyer une personne, les questions changent ainsi :", "In this mission, you use informal address. “Ciao” is informal; “buongiorno” is more neutral. When addressing one person formally, the questions become:", "En esta misión, tratas a la persona de tú. «Ciao» es informal; «buongiorno» es más neutro. Para tratar a una persona de usted, las preguntas cambian así:"),
        examples: [example("Come si chiama?", "Comment vous appelez-vous?", "What is your name? (formal)", "¿Cómo se llama usted?"), example("Come sta?", "Comment allez-vous?", "How are you? (formal)", "¿Cómo está usted?")],
      },
    ],
  },
  "it2-u01-l2": {
    title: text("Dire d’où tu viens", "Say where you are from", "Di de dónde eres"),
    introduction: text("Une ville d’origine et une nationalité sont deux informations différentes. Voici comment exprimer chacune.", "Your city of origin and your nationality are different pieces of information. Here is how to express each one.", "Tu ciudad de origen y tu nacionalidad son datos diferentes. Así puedes expresar cada uno."),
    sections: [
      {
        title: text("Pour parler d’une ville", "Talk about a city", "Habla de una ciudad"),
        explanation: text("Pour demander l’origine, utilise « Di dove sei? ». Pour répondre avec une ville, garde « di » devant son nom.", "Ask about someone’s origin with “Di dove sei?”. When you answer with a city, keep “di” before its name.", "Pregunta el origen con «Di dove sei?». Para responder con una ciudad, conserva «di» delante de su nombre."),
        examples: [example("Di dove sei?", "D’où viens-tu?", "Where are you from?", "¿De dónde eres?"), example("Sono di Montréal.", "Je viens de Montréal.", "I’m from Montréal.", "Soy de Montréal.")],
      },
      {
        title: text("Pour donner ta nationalité", "Give your nationality", "Di tu nacionalidad"),
        explanation: text("Utilise « sono », puis la nationalité, sans « di ». On ne déduit pas la nationalité de quelqu’un à partir de sa ville : il faut qu’elle soit précisée.", "Use “sono”, then the nationality, without “di”. A city does not establish someone’s nationality: the person needs to state it.", "Usa «sono» seguido de la nacionalidad, sin «di». La ciudad de origen no determina la nacionalidad: la persona debe indicarla."),
        examples: [example("Sono canadese.", "Je suis canadien ou canadienne.", "I’m Canadian.", "Soy canadiense."), example("Sono italiana.", "Je suis italienne.", "I’m Italian. (feminine)", "Soy italiana.")],
      },
      {
        title: text("« Je suis », « tu es », « il ou elle est »", "“I am”, “you are”, “he or she is”", "«Soy», «eres», «es»"),
        explanation: text("Ce sont trois formes du verbe « essere », qui signifie « être ». Choisis la forme selon la personne.", "These are three forms of “essere”, meaning “to be”. Choose the form that matches the person.", "Son tres formas de «essere», que significa «ser» en estos ejemplos. Elige la forma según la persona."),
        examples: [example("sono", "je suis", "I am", "soy"), example("sei", "tu es", "you are", "eres"), example("è", "il ou elle est", "he or she is", "es")],
      },
    ],
    remember: text("Ville : « Sono di Montréal. » Nationalité : « Sono canadese. » Le petit mot « di » fait la différence.", "City: “Sono di Montréal.” Nationality: “Sono canadese.” Notice where “di” belongs.", "Ciudad: «Sono di Montréal». Nacionalidad: «Sono canadese». Fíjate en dónde se usa «di»."),
    more: [
      {
        title: text("Italien ou italienne?", "Masculine or feminine?", "¿Masculino o femenino?"),
        explanation: text("« Italiano » devient « italiana » au féminin. Mais « canadese » et « francese » gardent la même forme au masculin et au féminin, au singulier.", "“Italiano” becomes “italiana” in the feminine. But “canadese” and “francese” have the same masculine and feminine form in the singular.", "«Italiano» cambia a «italiana» en femenino. En cambio, «canadese» y «francese» tienen la misma forma masculina y femenina en singular."),
        examples: [example("Sono italiano. / Sono italiana.", "Je suis italien. / Je suis italienne.", "I’m Italian. (masculine / feminine)", "Soy italiano. / Soy italiana."), example("Sono francese.", "Je suis français ou française.", "I’m French.", "Soy francés o francesa.")],
      },
      {
        title: text("Transformer une phrase en question", "Turn a statement into a question", "Transforma una frase en pregunta"),
        explanation: text("L’ordre des mots peut rester le même. À l’oral, l’intonation indique que tu poses une question; à l’écrit, on ajoute un point d’interrogation.", "The word order can stay the same. Your voice signals a question when speaking; a question mark signals it in writing.", "El orden de las palabras puede mantenerse. Al hablar, la entonación señala la pregunta; por escrito, se añade un signo de interrogación final."),
        examples: [example("Sei italiana?", "Es-tu italienne?", "Are you Italian? (feminine)", "¿Eres italiana?")],
      },
    ],
  },
  "it2-u01-l3": {
    title: text("Donner un âge avec « avere »", "Give an age with “avere”", "Di una edad con «avere»"),
    introduction: text("Bonne nouvelle : comme en français, on utilise le verbe « avoir » pour donner l’âge.", "Italian uses “have” for age, not “be”. It is a different pattern from English, but a simple one to use.", "Como en español, se usa el verbo «tener» para dar la edad. En italiano, ese verbo es «avere»."),
    sections: [
      {
        title: text("Pour demander l’âge", "Ask someone’s age", "Pregunta la edad"),
        explanation: text("Retiens d’abord la question entière. « Anni » veut dire « ans ».", "Start by learning the whole question. “Anni” means “years”.", "Aprende primero la pregunta completa. «Anni» significa «años»."),
        examples: [example("Quanti anni hai?", "Quel âge as-tu?", "How old are you?", "¿Cuántos años tienes?")],
      },
      {
        title: text("Pour répondre", "Answer the question", "Responde a la pregunta"),
        explanation: text("Construis ta réponse avec « Ho », puis le nombre, puis « anni ». Dans les exercices, tu peux utiliser l’âge du personnage.", "Build your answer with “Ho”, then the number, then “anni”. In the exercises, you can use the character’s age.", "Construye la respuesta con «Ho», luego el número y al final «anni». En los ejercicios, puedes usar la edad del personaje."),
        examples: [example("Ho ventotto anni.", "J’ai vingt-huit ans.", "I’m twenty-eight years old. Literally: I have twenty-eight years.", "Tengo veintiocho años.")],
      },
      {
        title: text("Changer la personne", "Change who you are talking about", "Cambia la persona"),
        explanation: text("Le verbe change selon la personne; le reste de la construction reste le même.", "The verb changes with the person; the rest of the pattern stays the same.", "El verbo cambia según la persona; el resto de la estructura se mantiene."),
        examples: [example("ho", "j’ai", "I have", "tengo"), example("hai", "tu as", "you have", "tienes"), example("ha", "il ou elle a", "he or she has", "tiene")],
      },
    ],
    remember: text("Pour donner un âge : « Ho » + un nombre + « anni ». Le h de « ho », « hai » et « ha » ne se prononce pas.", "For age: “Ho” + a number + “anni”. The h in “ho”, “hai” and “ha” is silent.", "Para la edad: «Ho» + un número + «anni». La h de «ho», «hai» y «ha» no se pronuncia."),
    more: [
      {
        title: text("Reconnaître les nombres de la mission", "Recognize this mission’s numbers", "Reconoce los números de la misión"),
        explanation: text("« Venti » signifie vingt. Devant « uno » et « otto », son i final disparaît. Tu obtiens ainsi « ventuno » et « ventotto ».", "“Venti” means twenty. Before “uno” and “otto”, it loses its final i. This gives you “ventuno” and “ventotto”.", "«Venti» significa veinte. Delante de «uno» y «otto», pierde la i final. Así se forman «ventuno» y «ventotto»."),
        examples: [example("venti / ventuno / ventotto / trenta", "20 / 21 / 28 / 30", "20 / 21 / 28 / 30", "20 / 21 / 28 / 30")],
      },
      {
        title: text("Deux façons de dire trente ans", "Two ways to say thirty years old", "Dos formas de decir treinta años"),
        explanation: text("Tu peux rencontrer les deux phrases ci-dessous. Elles ont le même sens : dans « trent’anni », l’apostrophe remplace le a final de « trenta ».", "You may see either sentence below. They mean the same thing: in “trent’anni”, the apostrophe replaces the final a of “trenta”.", "Puedes encontrar las dos frases de abajo. Significan lo mismo: en «trent’anni», el apóstrofo sustituye la a final de «trenta»."),
        examples: [example("Ho trenta anni. / Ho trent’anni.", "J’ai trente ans.", "I’m thirty years old.", "Tengo treinta años.")],
      },
    ],
  },
};
