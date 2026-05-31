/**
 * YoPratiqo — English · Intro module data
 *
 * Hardcoded content for `/yo/langues/anglais/intro`. A free,
 * launch-safe orientation module designed for Quebec francophone
 * false beginners — learners who already studied English at school
 * but freeze when they need to speak.
 *
 * Tone contract:
 *   - Confidence-building, warm, slightly therapeutic, practical.
 *   - "This is not your fault." kept verbatim.
 *   - NEVER anti-teacher / anti-school. School trained the learner
 *     to pass exams; this module helps them speak. Both are real.
 *   - Never shame the learner. They didn't "fail" English. They are
 *     a false beginner — they already have a base, and we help
 *     them reactivate it.
 *
 * Bilingual contract:
 *   - French is the DEFAULT locale (Quebec / Canada audience).
 *   - English variants ship through `lstr(fr, en)` so the EN view
 *     (`?lang=en`) is shipped i18n-ready.
 *   - English target words/phrases stay plain strings so they keep
 *     `lang="en"` for accessibility and TTS.
 *   - Short English snippets ("Let's check!", "You did it!") are
 *     deliberately interspersed in narrative copy so the learner
 *     reads English without translation crutches.
 *
 * Audio:
 *   - Single source of truth for pronunciation audio is
 *     `lib/yo/audio/englishIntroAudio.ts`. The page wires
 *     `<YoEnglishAudioButton>` next to each English phrase, which
 *     plays the manifest MP3 from Supabase Storage and falls back
 *     to on-device Web Speech (BCP-47 `en-CA`) only when an item
 *     is missing.
 *
 * Out-of-scope guarantees (no code in this file may import or
 * reference them): Stripe, Supabase RLS, payment math, migrations,
 * booking, search, Membre Pro, teacher dashboard, legal pages.
 */

import { lstr } from "@/lib/yo/localize";
import type {
  YoFlashcard,
  YoLocalizedString,
  YoQuizQuestion,
} from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────
// 1) Avant de commencer
// ─────────────────────────────────────────────────────────────────────

const welcomeIntro: YoLocalizedString = lstr(
  "Tu sais déjà plus d'anglais que tu penses. Tu as étudié l'anglais à l'école. Tu en entends tous les jours. Tu en lis sur Internet, dans la musique, dans les films. Le problème n'est pas que tu ne sais rien — le problème est que ton cerveau a appris à se taire pour ne pas faire de fautes.",
  "You already know more English than you think. You studied English at school. You hear it every day. You read it on the internet, in music, in movies. The problem isn't that you don't know anything — the problem is that your brain learned to stay quiet to avoid mistakes.",
);

const welcomeNotYourFault: YoLocalizedString = lstr(
  "This is not your fault. L'école t'a préparé à réussir des exercices ; ici, on va te préparer à parler. Ce sont deux compétences différentes. La bonne nouvelle : les bases sont déjà là, dormantes. On va juste les réveiller.",
  "This is not your fault. School prepared you to pass exercises; here, we'll prepare you to speak. These are two different skills. The good news: the foundations are already there, dormant. We're just going to wake them up.",
);

const welcomeContract: YoLocalizedString = lstr(
  "Promesse de ce mini-cours : aucune liste interminable de verbes irréguliers, aucune correction qui te coupe au milieu d'une phrase. On part de ce que tu sais déjà, on remet en marche le réflexe « je peux essayer », et on te donne une trousse de phrases à dégainer quand ça va trop vite.",
  "This mini-course's promise: no endless list of irregular verbs, no correction that cuts you off mid-sentence. We start from what you already know, restart the \"I can try\" reflex, and hand you a pocket toolkit of phrases to pull out when things go too fast.",
);

// ─────────────────────────────────────────────────────────────────────
// 2) The numbers — L'anglais en chiffres
// ─────────────────────────────────────────────────────────────────────

interface EnglishStat {
  id: string;
  label: YoLocalizedString;
  value: YoLocalizedString;
  description: YoLocalizedString;
}

const numbersLeadIn: YoLocalizedString = lstr(
  "Quelques repères pour situer la langue. Les chiffres bougent d'une année à l'autre — ce sont des ordres de grandeur, pas des promesses. Ce qui compte, c'est le portrait global.",
  "A few landmarks to situate the language. Numbers shift from year to year — these are orders of magnitude, not promises. What matters is the big picture.",
);

const englishStats: EnglishStat[] = [
  {
    id: "stat_speakers",
    label: lstr("Locuteurs dans le monde", "Speakers worldwide"),
    value: lstr("~ 1,5 milliard", "~ 1.5 billion"),
    description: lstr(
      "Langue maternelle ou seconde langue. La majorité de ces personnes ont, comme toi, appris l'anglais à l'école — pas dans le berceau.",
      "Mother tongue or second language. Most of those people, like you, learned English at school — not in the cradle.",
    ),
  },
  {
    id: "stat_non_native",
    label: lstr("Non-natifs", "Non-native speakers"),
    value: lstr("La majorité", "The majority"),
    description: lstr(
      "Plus de la moitié des conversations en anglais dans le monde se font entre deux personnes non-natives. Ton accent et le leur partent du même endroit : un autre cerveau, une autre première langue.",
      "More than half of English conversations worldwide happen between two non-native speakers. Your accent and theirs start from the same place: another brain, another first language.",
    ),
  },
  {
    id: "stat_official",
    label: lstr("Pays officiels", "Official countries"),
    value: lstr("~ 60", "~ 60"),
    description: lstr(
      "L'anglais est langue officielle ou de travail dans une soixantaine de pays — Canada inclus, en partage avec le français.",
      "English is an official or working language in around 60 countries — Canada included, sharing the floor with French.",
    ),
  },
];

const numbersTakeaway: YoLocalizedString = lstr(
  "À retenir : parler anglais avec un accent francophone, ce n'est pas être « pas bon en anglais ». C'est être normal.",
  "Key takeaway: speaking English with a French accent isn't \"being bad at English.\" It's being normal.",
);

// ─────────────────────────────────────────────────────────────────────
// 3) Why school didn't work — Pourquoi l'école n'a pas marché
// ─────────────────────────────────────────────────────────────────────

const schoolIntro: YoLocalizedString = lstr(
  "Si tu as étudié l'anglais pendant des années et que tu te sens encore bloqué quand un client anglophone arrive au comptoir, ce n'est pas un échec personnel. C'est la conséquence d'un système qui devait évaluer 30 élèves en même temps, par écrit, avec une grille de correction.",
  "If you studied English for years and still feel stuck when an English-speaking customer walks up to the counter, that isn't a personal failure. It's the consequence of a system that had to evaluate 30 students at once, in writing, with a marking grid.",
);

interface SchoolPattern {
  id: string;
  schoolDid: YoLocalizedString;
  realLifeNeeds: YoLocalizedString;
}

const schoolPatterns: SchoolPattern[] = [
  {
    id: "pattern_grammar",
    schoolDid: lstr(
      "L'école t'a fait conjuguer des verbes au tableau.",
      "School had you conjugate verbs on the board.",
    ),
    realLifeNeeds: lstr(
      "La vraie vie te demande de commander un café avant ton premier shift.",
      "Real life asks you to order a coffee before your first shift.",
    ),
  },
  {
    id: "pattern_writing",
    schoolDid: lstr(
      "L'école t'a noté sur des dictées et des compréhensions de texte.",
      "School graded you on dictations and reading comprehension.",
    ),
    realLifeNeeds: lstr(
      "La vraie vie te demande de comprendre ton interlocuteur même quand il parle vite.",
      "Real life asks you to follow someone even when they speak fast.",
    ),
  },
  {
    id: "pattern_correction",
    schoolDid: lstr(
      "L'école t'a corrigé chaque faute, parfois devant la classe.",
      "School corrected every mistake, sometimes in front of the class.",
    ),
    realLifeNeeds: lstr(
      "La vraie vie récompense le réflexe « j'essaie », pas la perfection.",
      "Real life rewards the \"I'll try\" reflex, not perfection.",
    ),
  },
];

const schoolReframe: YoLocalizedString = lstr(
  "Donc oui, l'école t'a appris des choses utiles — la grammaire, le vocabulaire, l'écrit. Mais elle n'avait pas le temps de t'apprendre à parler avec un humain en face. Ce mini-cours, c'est cette deuxième moitié.",
  "So yes, school taught you useful things — grammar, vocabulary, writing. But it didn't have the time to teach you how to speak with a human in front of you. This mini-course is that second half.",
);

const schoolPermissionToTry: YoLocalizedString = lstr(
  "Permission officielle : tu as le droit de faire des fautes ici. Tu as le droit de chercher ton mot. Tu as le droit de dire « Sorry, my English isn't great. » C'est exactement comme ça que les gens apprennent.",
  "Official permission: you're allowed to make mistakes here. You're allowed to search for the word. You're allowed to say \"Sorry, my English isn't great.\" That's exactly how people actually learn.",
);

// ─────────────────────────────────────────────────────────────────────
// 4) American, British, Canadian — Les vraies différences
// ─────────────────────────────────────────────────────────────────────

const variantsIntro: YoLocalizedString = lstr(
  "Tu vas entendre plusieurs anglais dans ta vie. La bonne nouvelle : tu n'as pas à choisir un camp. Tu vas comprendre les trois principales variantes — et tu vas surtout te rappeler qu'à Montréal, l'anglais le plus utile au quotidien est… l'anglais canadien.",
  "You'll hear several Englishes in your life. Good news: you don't have to pick a side. You'll understand the three main varieties — and most importantly remember that in Montreal, the most useful day-to-day English is… Canadian English.",
);

interface VariantCard {
  id: string;
  name: YoLocalizedString;
  description: YoLocalizedString;
  example: YoLocalizedString;
}

const variantCards: VariantCard[] = [
  {
    id: "variant_american",
    name: lstr("American", "American"),
    description: lstr(
      "L'anglais que tu entends dans Netflix, dans les films Marvel, et dans la majorité de la pop musicale. Direct, plus relâché, beaucoup d'expressions familières.",
      "The English you hear on Netflix, in Marvel movies, in most pop music. Direct, more casual, lots of informal expressions.",
    ),
    example: lstr(
      "Trottoir → sidewalk · Camion → truck · Bonbons → candy",
      "Trottoir → sidewalk · Camion → truck · Bonbons → candy",
    ),
  },
  {
    id: "variant_british",
    name: lstr("British", "British"),
    description: lstr(
      "L'anglais des séries BBC, de Harry Potter en VO, et d'une bonne partie de l'enseignement scolaire. Vocabulaire et tournures parfois différents, mais on se comprend très bien.",
      "The English of BBC shows, of Harry Potter in the original, and of a fair share of formal schooling. The vocabulary and turns of phrase sometimes differ, but mutual understanding is high.",
    ),
    example: lstr(
      "Trottoir → pavement · Camion → lorry · Bonbons → sweets",
      "Trottoir → pavement · Camion → lorry · Bonbons → sweets",
    ),
  },
  {
    id: "variant_canadian",
    name: lstr("Canadian", "Canadian"),
    description: lstr(
      "L'anglais que tu entends à Tim Hortons, à l'aéroport de Toronto, dans les services fédéraux. Mélange pratique d'américain et de britannique. C'est l'anglais le plus pertinent au quotidien quand tu vis au Québec.",
      "The English you hear at Tim Hortons, at Toronto's airport, in federal services. A practical mix of American and British. It's the most relevant English day-to-day when you live in Quebec.",
    ),
    example: lstr(
      "Trottoir → sidewalk · Toilettes → washroom · Tuque → toque",
      "Trottoir → sidewalk · Bathroom → washroom · Beanie → toque",
    ),
  },
];

const variantsTakeaway: YoLocalizedString = lstr(
  "À retenir : tu n'as pas à parler « comme un Américain » ou « comme un Anglais ». Tu peux parler clair, simple, avec ton accent, et te faire comprendre partout dans le monde.",
  "Key takeaway: you don't have to sound \"American\" or \"British.\" You can speak clearly, simply, with your accent, and be understood everywhere in the world.",
);

// ─────────────────────────────────────────────────────────────────────
// 5) Your dormant vocabulary — Le vocabulaire qui dort déjà
// ─────────────────────────────────────────────────────────────────────

const cognatesIntro: YoLocalizedString = lstr(
  "Voici la révélation que personne ne t'a vendue à l'école : le français et l'anglais partagent des milliers de mots. Pour un francophone, l'anglais a un raccourci magique — les cognates, ces mots qui se ressemblent dans les deux langues.",
  "Here's the reveal nobody sold you in school: French and English share thousands of words. For a French speaker, English has a magic shortcut — cognates, the words that look similar in both languages.",
);

interface CognateExample {
  id: string;
  english: string;
  french: YoLocalizedString;
}

const cognateExamples: CognateExample[] = [
  {
    id: "cog_information",
    english: "information",
    french: lstr("information", "information"),
  },
  {
    id: "cog_restaurant",
    english: "restaurant",
    french: lstr("restaurant", "restaurant"),
  },
  {
    id: "cog_important",
    english: "important",
    french: lstr("important", "important"),
  },
  {
    id: "cog_animal",
    english: "animal",
    french: lstr("animal", "animal"),
  },
  {
    id: "cog_university",
    english: "university",
    french: lstr("université", "université"),
  },
  {
    id: "cog_decision",
    english: "decision",
    french: lstr("décision", "décision"),
  },
];

const cognatesPower: YoLocalizedString = lstr(
  "Estime conservatrice : un francophone reconnaît facilement plusieurs milliers de mots anglais grâce aux cognates. C'est ta superpuissance. À l'école, on ne t'a pas dit ça parce que c'était « trop facile ». La vraie vie, elle, s'en sert tous les jours.",
  "Conservative estimate: a French speaker easily recognises several thousand English words thanks to cognates. That's your superpower. School didn't tell you because it was \"too easy.\" Real life uses it every day.",
);

interface FalseFriend {
  id: string;
  english: string;
  looksLike: YoLocalizedString;
  reallyMeans: YoLocalizedString;
}

const falseFriendsIntro: YoLocalizedString = lstr(
  "Le revers de la médaille : les faux amis. Des mots anglais qui ressemblent à des mots français mais qui veulent dire autre chose. Connais-les, et tu évites les pièges classiques au travail comme en voyage.",
  "The flip side: false friends. English words that look like French words but mean something else. Know them, and you'll dodge the classic traps at work or while travelling.",
);

const falseFriends: FalseFriend[] = [
  {
    id: "ff_actually",
    english: "actually",
    looksLike: lstr("« actuellement »", "\"currently\""),
    reallyMeans: lstr("en fait, vraiment", "in fact, really"),
  },
  {
    id: "ff_eventually",
    english: "eventually",
    looksLike: lstr("« éventuellement »", "\"possibly\""),
    reallyMeans: lstr("finalement, à la fin", "in the end, finally"),
  },
  {
    id: "ff_library",
    english: "library",
    looksLike: lstr("« librairie »", "\"bookstore\""),
    reallyMeans: lstr("bibliothèque", "library (book lending place)"),
  },
  {
    id: "ff_sensible",
    english: "sensible",
    looksLike: lstr("« sensible »", "\"emotionally sensitive\""),
    reallyMeans: lstr("sensé, raisonnable", "reasonable, sensible"),
  },
  {
    id: "ff_chair",
    english: "chair",
    looksLike: lstr("« chair »", "\"flesh\""),
    reallyMeans: lstr("chaise", "chair (the furniture)"),
  },
  {
    id: "ff_assist",
    english: "to assist",
    looksLike: lstr("« assister à »", "\"to attend\""),
    reallyMeans: lstr("aider", "to help"),
  },
  {
    id: "ff_rest",
    english: "rest",
    looksLike: lstr("« rester »", "\"to remain (verb)\""),
    reallyMeans: lstr("repos, pause ; aussi : le reste de", "rest / break; also: the rest of"),
  },
  {
    id: "ff_demand",
    english: "to demand",
    looksLike: lstr("« demander »", "\"to ask\""),
    reallyMeans: lstr("exiger fermement", "to require firmly"),
  },
  {
    id: "ff_engaged",
    english: "engaged",
    looksLike: lstr("« engagé » (politiquement)", "\"politically engaged\""),
    reallyMeans: lstr("fiancé(e), ou : occupé", "engaged to be married, or: busy"),
  },
  {
    id: "ff_pretend",
    english: "to pretend",
    looksLike: lstr("« prétendre »", "\"to claim\""),
    reallyMeans: lstr("faire semblant", "to fake / to act as if"),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 6) Your survival kit — Phrases pour reprendre confiance
// ─────────────────────────────────────────────────────────────────────

interface SurvivalPhrase {
  id: string;
  /** English target — rendered with `lang="en"`. */
  target: string;
  translation: YoLocalizedString;
  /** Optional usage hint shown below the gloss. */
  hint?: YoLocalizedString;
  /** Group label so the UI can break the list into themed buckets. */
  group: "rescue" | "daily" | "travel";
}

const survivalIntro: YoLocalizedString = lstr(
  "Voici la trousse à dégainer quand tu es bloqué. Ces phrases sont courtes, polies, naturelles — et elles te sortent à peu près de toutes les situations gênantes. Appuie sur l'icône audio pour entendre la prononciation.",
  "Here's the toolkit to pull out when you're stuck. These phrases are short, polite, natural — and they get you out of pretty much any awkward moment. Tap the audio icon to hear the pronunciation.",
);

const survivalPhrases: SurvivalPhrase[] = [
  // Rescue phrases — for when the conversation moves too fast.
  {
    id: "sp_repeat",
    target: "Sorry, can you repeat that?",
    translation: lstr(
      "Désolé, peux-tu répéter ça ?",
      "Sorry, could you repeat that?",
    ),
    hint: lstr(
      "Le « bouton pause » universel. Tout le monde l'utilise, même les natifs.",
      "The universal pause button. Everyone uses it, including native speakers.",
    ),
    group: "rescue",
  },
  {
    id: "sp_slowly",
    target: "Could you speak more slowly, please?",
    translation: lstr(
      "Pourriez-vous parler plus lentement, s'il vous plaît ?",
      "Could you speak more slowly, please?",
    ),
    group: "rescue",
  },
  {
    id: "sp_dontunderstand",
    target: "I don't understand.",
    translation: lstr("Je ne comprends pas.", "I don't understand."),
    group: "rescue",
  },
  {
    id: "sp_meaning",
    target: "What does that mean?",
    translation: lstr("Qu'est-ce que ça veut dire ?", "What does that mean?"),
    group: "rescue",
  },
  {
    id: "sp_howtosay",
    target: "How do you say… in English?",
    translation: lstr(
      "Comment dit-on… en anglais ?",
      "How do you say… in English?",
    ),
    hint: lstr(
      "Pour demander un mot que tu cherches en plein milieu d'une phrase.",
      "For asking a word you're searching for mid-sentence.",
    ),
    group: "rescue",
  },
  {
    id: "sp_notgreat",
    target: "Sorry, my English isn't great.",
    translation: lstr(
      "Désolé, mon anglais n'est pas génial.",
      "Sorry, my English isn't great.",
    ),
    hint: lstr(
      "Phrase magique : 9 fois sur 10, l'autre personne ralentit et devient plus patient.",
      "Magic phrase: 9 times out of 10, the other person slows down and becomes more patient.",
    ),
    group: "rescue",
  },
  {
    id: "sp_bearwithme",
    target: "Bear with me, please.",
    translation: lstr(
      "Soyez patient avec moi, s'il vous plaît.",
      "Bear with me, please.",
    ),
    hint: lstr(
      "Très utile au téléphone, en ligne, quand tu cherches une info.",
      "Very useful on the phone, in line, when you're looking something up.",
    ),
    group: "rescue",
  },
  {
    id: "sp_thinksecond",
    target: "Let me think for a second.",
    translation: lstr(
      "Laisse-moi réfléchir une seconde.",
      "Let me think for a second.",
    ),
    group: "rescue",
  },
  // Daily basics — first interaction of the day.
  {
    id: "sp_hi",
    target: "Hi! How are you?",
    translation: lstr("Salut ! Comment ça va ?", "Hi! How are you?"),
    group: "daily",
  },
  {
    id: "sp_thankyou",
    target: "Thank you.",
    translation: lstr("Merci.", "Thank you."),
    group: "daily",
  },
  {
    id: "sp_youre_welcome",
    target: "You're welcome.",
    translation: lstr("Bienvenue / De rien.", "You're welcome."),
    group: "daily",
  },
  {
    id: "sp_excuseme",
    target: "Excuse me.",
    translation: lstr("Excusez-moi.", "Excuse me."),
    group: "daily",
  },
  {
    id: "sp_sorry",
    target: "Sorry.",
    translation: lstr("Désolé.", "Sorry."),
    group: "daily",
  },
  {
    id: "sp_niceday",
    target: "Have a nice day!",
    translation: lstr("Bonne journée !", "Have a nice day!"),
    group: "daily",
  },
  // Travel — the "I survived Toronto" set.
  {
    id: "sp_illhave",
    target: "I'll have a…, please.",
    translation: lstr("Je vais prendre…, s'il vous plaît.", "I'll have a…, please."),
    hint: lstr(
      "Pour commander un café, un sandwich, un billet — n'importe quoi.",
      "For ordering a coffee, a sandwich, a ticket — anything.",
    ),
    group: "travel",
  },
  {
    id: "sp_howmuch",
    target: "How much is it?",
    translation: lstr("Combien ça coûte ?", "How much is it?"),
    group: "travel",
  },
  {
    id: "sp_paycard",
    target: "Can I pay by card?",
    translation: lstr("Est-ce que je peux payer par carte ?", "Can I pay by card?"),
    group: "travel",
  },
  {
    id: "sp_bathroom",
    target: "Where is the bathroom?",
    translation: lstr("Où sont les toilettes ?", "Where is the bathroom?"),
    hint: lstr(
      "Au Canada, on dit aussi « washroom » — encore plus poli.",
      "In Canada, people also say \"washroom\" — even more polite.",
    ),
    group: "travel",
  },
];

const survivalGroupLabels: Record<SurvivalPhrase["group"], YoLocalizedString> = {
  rescue: lstr("Phrases de secours", "Rescue phrases"),
  daily: lstr("Bases du quotidien", "Daily basics"),
  travel: lstr("Voyage", "Travel"),
};

// ─────────────────────────────────────────────────────────────────────
// 7) Quiz — 7 questions max, all confidence-building
// ─────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "q_blocked",
    prompt: lstr(
      "Tu connais beaucoup de mots en anglais mais tu te sens bloqué quand tu dois parler. C'est…",
      "You know a lot of English words but you freeze when you have to speak. That's…",
    ),
    options: [
      {
        id: "q_blocked_a",
        label: lstr(
          "Un signe que tu n'es pas fait pour les langues",
          "A sign you're not cut out for languages",
        ),
      },
      {
        id: "q_blocked_b",
        label: lstr(
          "Un classique du faux débutant : la base est là, le réflexe ne l'est pas encore",
          "A classic false-beginner pattern: the foundation is there, the reflex isn't yet",
        ),
      },
      {
        id: "q_blocked_c",
        label: lstr(
          "La preuve qu'il faut tout recommencer à zéro",
          "Proof you need to restart from scratch",
        ),
      },
      {
        id: "q_blocked_d",
        label: lstr("Anormal", "Abnormal"),
      },
    ],
    correctOptionId: "q_blocked_b",
    explanation: lstr(
      "Tu n'as pas à tout recommencer. Tu as juste à réveiller le réflexe « j'essaie » à côté du réflexe « j'analyse ».",
      "You don't have to start over. You just have to wake up the \"I'll try\" reflex next to the \"I'm analysing\" one.",
    ),
  },
  {
    id: "q_actually",
    prompt: lstr(
      "Un collègue dit : « Actually, the meeting is at 3. » Ça veut dire…",
      "A coworker says: \"Actually, the meeting is at 3.\" That means…",
    ),
    options: [
      {
        id: "q_actually_a",
        label: lstr(
          "« En ce moment, la réunion est à 3 h. »",
          "\"Currently, the meeting is at 3.\"",
        ),
      },
      {
        id: "q_actually_b",
        label: lstr(
          "« En fait, la réunion est à 3 h. »",
          "\"In fact, the meeting is at 3.\"",
        ),
      },
      {
        id: "q_actually_c",
        label: lstr(
          "« Idéalement, la réunion serait à 3 h. »",
          "\"Ideally, the meeting would be at 3.\"",
        ),
      },
      {
        id: "q_actually_d",
        label: lstr(
          "« La réunion va commencer. »",
          "\"The meeting is about to start.\"",
        ),
      },
    ],
    correctOptionId: "q_actually_b",
    explanation: lstr(
      "« Actually » = en fait / vraiment. Faux ami classique avec « actuellement ».",
      "\"Actually\" = in fact / really. Classic false friend with French \"actuellement.\"",
    ),
  },
  {
    id: "q_canadian",
    prompt: lstr(
      "Tu vis à Montréal et tu veux choisir un anglais utile au quotidien. Lequel ?",
      "You live in Montreal and want to pick a useful day-to-day English. Which one?",
    ),
    options: [
      { id: "q_canadian_a", label: lstr("Britannique", "British") },
      { id: "q_canadian_b", label: lstr("Australien", "Australian") },
      { id: "q_canadian_c", label: lstr("Canadien", "Canadian") },
      { id: "q_canadian_d", label: lstr("Aucun, les variantes c'est pareil", "None, the varieties are all the same") },
    ],
    correctOptionId: "q_canadian_c",
    explanation: lstr(
      "L'anglais canadien est celui que tu entends le plus souvent au Canada. Tu comprendras très bien les autres variantes ; pas besoin de choisir un camp.",
      "Canadian English is what you hear most often in Canada. You'll understand the other varieties just fine; no need to pick a side.",
    ),
  },
  {
    id: "q_repeat",
    prompt: lstr(
      "Quelqu'un te parle vite, tu n'as pas tout saisi. La phrase la plus utile à dire est…",
      "Someone speaks fast and you didn't catch everything. The most useful phrase to say is…",
    ),
    options: [
      { id: "q_repeat_a", label: lstr("« What? »", "\"What?\"") },
      {
        id: "q_repeat_b",
        label: lstr("« Sorry, can you repeat that? »", "\"Sorry, can you repeat that?\""),
      },
      {
        id: "q_repeat_c",
        label: lstr("« I am leaving. »", "\"I am leaving.\""),
      },
      { id: "q_repeat_d", label: lstr("Tu te tais", "Stay silent") },
    ],
    correctOptionId: "q_repeat_b",
    explanation: lstr(
      "Polie, courte, naturelle. Tout le monde l'utilise — y compris les natifs entre eux.",
      "Polite, short, natural. Everyone uses it — including native speakers among themselves.",
    ),
  },
  {
    id: "q_library",
    prompt: lstr(
      "Tu cherches une bibliothèque pour étudier. Tu demandes…",
      "You're looking for a library to study. You ask for…",
    ),
    options: [
      { id: "q_library_a", label: lstr("« A librairie? »", "\"A librairie?\"") },
      { id: "q_library_b", label: lstr("« A bookstore? »", "\"A bookstore?\"") },
      { id: "q_library_c", label: lstr("« A library? »", "\"A library?\"") },
      { id: "q_library_d", label: lstr("« A liberty? »", "\"A liberty?\"") },
    ],
    correctOptionId: "q_library_c",
    explanation: lstr(
      "« Library » = bibliothèque. « Bookstore » = librairie. Faux ami classique.",
      "\"Library\" = bibliothèque (book-lending place). \"Bookstore\" = librairie (where books are sold). Classic false friend.",
    ),
  },
  {
    id: "q_accent",
    prompt: lstr(
      "Tu parles anglais avec un accent francophone. Tes interlocuteurs vont…",
      "You speak English with a French accent. The people you talk to will…",
    ),
    options: [
      {
        id: "q_accent_a",
        label: lstr("Penser que tu es nul", "Think you're bad at it"),
      },
      {
        id: "q_accent_b",
        label: lstr(
          "Te comprendre la plupart du temps, comme tout le monde",
          "Understand you most of the time, like everyone else",
        ),
      },
      {
        id: "q_accent_c",
        label: lstr("Refuser de te répondre", "Refuse to answer you"),
      },
      {
        id: "q_accent_d",
        label: lstr("Te demander un test officiel", "Ask you for an official test"),
      },
    ],
    correctOptionId: "q_accent_b",
    explanation: lstr(
      "La majorité des conversations en anglais dans le monde se font entre non-natifs. Ton accent est normal.",
      "The majority of English conversations worldwide happen between non-native speakers. Your accent is normal.",
    ),
  },
  {
    id: "q_pay",
    prompt: lstr(
      "Au comptoir d'un café à Toronto, tu veux payer par carte. Tu dis…",
      "At a coffee counter in Toronto, you want to pay by card. You say…",
    ),
    options: [
      { id: "q_pay_a", label: lstr("« Money please. »", "\"Money please.\"") },
      {
        id: "q_pay_b",
        label: lstr("« Can I pay by card? »", "\"Can I pay by card?\""),
      },
      { id: "q_pay_c", label: lstr("« I demand a card. »", "\"I demand a card.\"") },
      { id: "q_pay_d", label: lstr("« Card now. »", "\"Card now.\"") },
    ],
    correctOptionId: "q_pay_b",
    explanation: lstr(
      "Polie, courte, claire. « Demand » serait trop fort en anglais — c'est un faux ami avec « demander ».",
      "Polite, short, clear. \"Demand\" would sound too strong in English — it's a false friend with French \"demander.\"",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 8) Flashcards — 6 grouped decks
// ─────────────────────────────────────────────────────────────────────

interface FlashcardGroup {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
  cards: YoFlashcard[];
}

const flashcardGroups: FlashcardGroup[] = [
  {
    id: "deck_world",
    title: lstr("L'anglais dans le monde", "English in the world"),
    description: lstr(
      "Le vocabulaire de la section sur les chiffres.",
      "The vocabulary from the numbers section.",
    ),
    cards: [
      {
        id: "card_the_world",
        front: "the world",
        back: lstr("le monde", "the world"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_the_language",
        front: "the language",
        back: lstr("la langue", "the language"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_to_speak",
        front: "to speak",
        back: lstr("parler (verbe à l'infinitif)", "to speak (infinitive)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_the_country",
        front: "the country",
        back: lstr("le pays", "the country"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_million",
        front: "million",
        back: lstr("million", "million"),
        tag: lstr("Monde", "World"),
      },
    ],
  },
  {
    id: "deck_learning",
    title: lstr("Apprentissage", "Learning"),
    description: lstr(
      "Les mots qui décrivent ce que tu fais quand tu apprends.",
      "The words that describe what you do when you learn.",
    ),
    cards: [
      {
        id: "card_to_learn",
        front: "to learn",
        back: lstr("apprendre", "to learn"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_to_understand",
        front: "to understand",
        back: lstr("comprendre", "to understand"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_a_mistake",
        front: "a mistake",
        back: lstr("une erreur", "a mistake"),
        hint: lstr(
          "Mot-clé du module — les fautes ne sont pas un problème, elles sont la preuve que tu essaies.",
          "Key module word — mistakes aren't the problem, they're proof you're trying.",
        ),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_confidence",
        front: "confidence",
        back: lstr("la confiance", "confidence"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_a_word",
        front: "a word",
        back: lstr("un mot", "a word"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_a_sentence",
        front: "a sentence",
        back: lstr("une phrase", "a sentence"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_vocabulary",
        front: "vocabulary",
        back: lstr("le vocabulaire", "vocabulary"),
        tag: lstr("Apprentissage", "Learning"),
      },
      {
        id: "card_to_recognize",
        front: "to recognize",
        back: lstr("reconnaître", "to recognize"),
        tag: lstr("Apprentissage", "Learning"),
      },
    ],
  },
  {
    id: "deck_variants",
    title: lstr("Variantes et accents", "Varieties and accents"),
    description: lstr(
      "Les mots qui décrivent les différentes versions de l'anglais.",
      "The words that describe the different versions of English.",
    ),
    cards: [
      {
        id: "card_american",
        front: "American",
        back: lstr("américain", "American"),
        tag: lstr("Variantes", "Varieties"),
      },
      {
        id: "card_british",
        front: "British",
        back: lstr("britannique", "British"),
        tag: lstr("Variantes", "Varieties"),
      },
      {
        id: "card_canadian",
        front: "Canadian",
        back: lstr("canadien", "Canadian"),
        tag: lstr("Variantes", "Varieties"),
      },
      {
        id: "card_the_accent",
        front: "the accent",
        back: lstr("l'accent", "the accent"),
        tag: lstr("Variantes", "Varieties"),
      },
      {
        id: "card_different",
        front: "different",
        back: lstr("différent", "different"),
        tag: lstr("Variantes", "Varieties"),
      },
    ],
  },
  {
    id: "deck_false_friends",
    title: lstr("Faux amis", "False friends"),
    description: lstr(
      "Les pièges classiques pour francophones — connais-les, et tu les évites.",
      "The classic traps for French speakers — know them, dodge them.",
    ),
    cards: [
      {
        id: "card_actually",
        front: "actually",
        back: lstr("en fait, vraiment", "in fact, really"),
        hint: lstr(
          "Faux ami : ne pas confondre avec « actuellement ».",
          "False friend: don't confuse with French \"actuellement\" (currently).",
        ),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_eventually",
        front: "eventually",
        back: lstr("finalement, à la fin", "in the end, eventually"),
        hint: lstr(
          "Faux ami : ne veut pas dire « éventuellement / peut-être ».",
          "False friend: not the same as French \"éventuellement\" (possibly).",
        ),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_library",
        front: "library",
        back: lstr("bibliothèque (pas librairie)", "library (book lending place)"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_sensible",
        front: "sensible",
        back: lstr("sensé, raisonnable", "reasonable"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_chair",
        front: "chair",
        back: lstr("chaise", "chair (the furniture)"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_assist",
        front: "to assist",
        back: lstr("aider (pas assister à)", "to help"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_rest",
        front: "rest",
        back: lstr("repos / pause ; aussi : le reste de", "rest, break; also: the remainder of"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_demand",
        front: "to demand",
        back: lstr("exiger (pas simplement demander)", "to require firmly"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_engaged",
        front: "engaged",
        back: lstr("fiancé(e), ou occupé", "engaged to be married, or busy"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
      {
        id: "card_pretend",
        front: "to pretend",
        back: lstr("faire semblant", "to fake / act as if"),
        tag: lstr("Faux amis", "False friends"),
        isLocalExpression: true,
      },
    ],
  },
  {
    id: "deck_survival",
    title: lstr("Phrases de survie", "Survival phrases"),
    description: lstr(
      "Le kit à dégainer quand tu es bloqué — toutes en anglais courant.",
      "The toolkit to pull out when you're stuck — all everyday English.",
    ),
    cards: [
      {
        id: "card_repeat",
        front: "Sorry, can you repeat that?",
        back: lstr(
          "Désolé, peux-tu répéter ça ?",
          "Sorry, could you repeat that?",
        ),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_slowly",
        front: "Could you speak more slowly, please?",
        back: lstr(
          "Pourriez-vous parler plus lentement ?",
          "Could you speak more slowly, please?",
        ),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_dontunderstand",
        front: "I don't understand.",
        back: lstr("Je ne comprends pas.", "I don't understand."),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_meaning",
        front: "What does that mean?",
        back: lstr(
          "Qu'est-ce que ça veut dire ?",
          "What does that mean?",
        ),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_howtosay",
        front: "How do you say… in English?",
        back: lstr(
          "Comment dit-on… en anglais ?",
          "How do you say… in English?",
        ),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_notgreat",
        front: "Sorry, my English isn't great.",
        back: lstr(
          "Désolé, mon anglais n'est pas génial.",
          "Sorry, my English isn't great.",
        ),
        hint: lstr(
          "Phrase magique : 9 fois sur 10 ça calme la conversation.",
          "Magic phrase: 9 times out of 10 it calms the conversation down.",
        ),
        tag: lstr("Survie", "Survival"),
        isLocalExpression: true,
      },
      {
        id: "card_bearwithme",
        front: "Bear with me, please.",
        back: lstr(
          "Soyez patient avec moi, s'il vous plaît.",
          "Bear with me, please.",
        ),
        tag: lstr("Survie", "Survival"),
      },
      {
        id: "card_thinksecond",
        front: "Let me think for a second.",
        back: lstr(
          "Laisse-moi réfléchir une seconde.",
          "Let me think for a second.",
        ),
        tag: lstr("Survie", "Survival"),
      },
    ],
  },
  {
    id: "deck_daily",
    title: lstr("Bases du quotidien", "Daily basics"),
    description: lstr(
      "Les phrases de tous les jours — politesse, voyage, achats.",
      "Everyday phrases — courtesy, travel, shopping.",
    ),
    cards: [
      {
        id: "card_hi",
        front: "Hi! How are you?",
        back: lstr("Salut ! Comment ça va ?", "Hi! How are you?"),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_thankyou",
        front: "Thank you.",
        back: lstr("Merci.", "Thank you."),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_youre_welcome",
        front: "You're welcome.",
        back: lstr("Bienvenue / De rien.", "You're welcome."),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_excuseme",
        front: "Excuse me.",
        back: lstr("Excusez-moi.", "Excuse me."),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_sorry",
        front: "Sorry.",
        back: lstr("Désolé.", "Sorry."),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_niceday",
        front: "Have a nice day!",
        back: lstr("Bonne journée !", "Have a nice day!"),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_illhave",
        front: "I'll have a…, please.",
        back: lstr(
          "Je vais prendre…, s'il vous plaît.",
          "I'll have a…, please.",
        ),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_howmuch",
        front: "How much is it?",
        back: lstr("Combien ça coûte ?", "How much is it?"),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_paycard",
        front: "Can I pay by card?",
        back: lstr(
          "Est-ce que je peux payer par carte ?",
          "Can I pay by card?",
        ),
        tag: lstr("Quotidien", "Daily"),
      },
      {
        id: "card_bathroom",
        front: "Where is the bathroom?",
        back: lstr("Où sont les toilettes ?", "Where is the bathroom?"),
        tag: lstr("Quotidien", "Daily"),
      },
    ],
  },
];

const allFlashcards: YoFlashcard[] = flashcardGroups.flatMap(
  (group) => group.cards,
);

// ─────────────────────────────────────────────────────────────────────
// 9) Teacher CTA copy
// ─────────────────────────────────────────────────────────────────────

const teacherBody: YoLocalizedString = lstr(
  "You did it! Tu viens de relire ton anglais sans t'évanouir. La prochaine étape, c'est parler avec une vraie personne. Les profs Pratiqo d'anglais sont habitués aux faux débutants québécois — ils corrigent doucement, expliquent les nuances et te laissent essayer.",
  "You did it! You just walked through your English without freezing. The next step is speaking with a real person. Pratiqo English teachers are used to Quebec false beginners — they correct gently, explain nuances, and let you try.",
);

const teacherCta: YoLocalizedString = lstr(
  "Trouver un prof d'anglais",
  "Find an English teacher",
);

// ─────────────────────────────────────────────────────────────────────
// Module-level export
// ─────────────────────────────────────────────────────────────────────

export interface EnglishIntroData {
  welcomeIntro: YoLocalizedString;
  welcomeNotYourFault: YoLocalizedString;
  welcomeContract: YoLocalizedString;
  numbersLeadIn: YoLocalizedString;
  englishStats: EnglishStat[];
  numbersTakeaway: YoLocalizedString;
  schoolIntro: YoLocalizedString;
  schoolPatterns: SchoolPattern[];
  schoolReframe: YoLocalizedString;
  schoolPermissionToTry: YoLocalizedString;
  variantsIntro: YoLocalizedString;
  variantCards: VariantCard[];
  variantsTakeaway: YoLocalizedString;
  cognatesIntro: YoLocalizedString;
  cognateExamples: CognateExample[];
  cognatesPower: YoLocalizedString;
  falseFriendsIntro: YoLocalizedString;
  falseFriends: FalseFriend[];
  survivalIntro: YoLocalizedString;
  survivalPhrases: SurvivalPhrase[];
  survivalGroupLabels: Record<SurvivalPhrase["group"], YoLocalizedString>;
  quizQuestions: YoQuizQuestion[];
  flashcardGroups: FlashcardGroup[];
  flashcards: YoFlashcard[];
  teacherBody: YoLocalizedString;
  teacherCta: YoLocalizedString;
}

export const englishIntro: EnglishIntroData = {
  welcomeIntro,
  welcomeNotYourFault,
  welcomeContract,
  numbersLeadIn,
  englishStats,
  numbersTakeaway,
  schoolIntro,
  schoolPatterns,
  schoolReframe,
  schoolPermissionToTry,
  variantsIntro,
  variantCards,
  variantsTakeaway,
  cognatesIntro,
  cognateExamples,
  cognatesPower,
  falseFriendsIntro,
  falseFriends,
  survivalIntro,
  survivalPhrases,
  survivalGroupLabels,
  quizQuestions,
  flashcardGroups,
  flashcards: allFlashcards,
  teacherBody,
  teacherCta,
};
