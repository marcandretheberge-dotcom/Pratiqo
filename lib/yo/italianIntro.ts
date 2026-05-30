/**
 * YoPratiqo — Italiano · Intro module data
 *
 * Hardcoded content for `/yo/langues/italien/intro`. A premium,
 * launch-safe orientation module for learners curious about Italian.
 *
 * Tone contract:
 *   - Premium, warm, cultural, practical.
 *   - Not a Wikipedia article: short paragraphs, scannable lists,
 *     a single strategic idea per section.
 *   - Standard Italian is what we teach; regional variation is
 *     acknowledged with respect, not turned into folklore.
 *
 * Bilingual contract:
 *   - French is the DEFAULT locale (Quebec / Canada audience).
 *   - English variants ship through `lstr(fr, en)` so the EN view
 *     (`?lang=en`) is shipped i18n-ready.
 *   - Italian target words/phrases stay plain strings so they keep
 *     `lang="it"` for accessibility and TTS.
 *
 * Audio:
 *   - Single source of truth for pronunciation audio is
 *     `lib/yo/audio/italianIntroAudio.ts`. The page wires
 *     `<YoItalianAudioButton>` next to each Italian phrase, which
 *     plays the manifest MP3 from Supabase Storage and falls back
 *     to on-device Web Speech (BCP-47 `it-IT`) only when an item
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
// 1) Welcome / Avant de commencer
// ─────────────────────────────────────────────────────────────────────

const welcomeIntro: YoLocalizedString = lstr(
  "L’italien, ce n’est pas juste « la langue de la pizza ». C’est la langue de Dante, de l’opéra, de la cuisine, du design, et de mille collines qui ont chacune leur accent. Cette intro te donne les premiers repères — sans dictionnaire et sans pression.",
  "Italian isn't just \"the language of pizza.\" It's the language of Dante, of opera, of cooking, of design, and of a thousand hills that each have their own accent. This intro gives you the first landmarks — no dictionary, no pressure.",
);

const welcomePromise: YoLocalizedString = lstr(
  "Tu vas comprendre, en 6 à 8 minutes, ce qu’est l’italien standard, d’où il vient, et pourquoi un Milanais et un Sicilien peuvent parler la même langue tout en se sonnant complètement différents. À la fin, tu auras des mots utiles pour voyager, manger, demander, remercier — avec l’audio pour la prononciation.",
  "In 6 to 8 minutes you'll understand what standard Italian is, where it comes from, and why someone from Milan and someone from Sicily can speak the same language while sounding completely different. By the end, you'll have useful words for travel, food, asking, and thanking — with audio for pronunciation.",
);

// Cultural lead-in — kept welcoming, not romanticised in the
// problematic sense (no "perfect language" claims).
const welcomeCulturalNote: YoLocalizedString = lstr(
  "Petite promesse : ce mini-cours respecte ton temps. Pas de listes interminables, pas de slang régional sans contexte, pas de fausses statistiques. Juste l’essentiel pour partir d’un bon pied.",
  "A small promise: this mini-course respects your time. No endless lists, no regional slang without context, no fake statistics. Just the essentials to start on the right foot.",
);

// ─────────────────────────────────────────────────────────────────────
// 2) L'italien en chiffres
// ─────────────────────────────────────────────────────────────────────

interface ItalianStat {
  id: string;
  label: YoLocalizedString;
  value: YoLocalizedString;
  description: YoLocalizedString;
}

const italianStatsLeadIn: YoLocalizedString = lstr(
  "Quelques repères, pour situer la langue dans le monde. Les chiffres bougent d’une année à l’autre — ce sont des ordres de grandeur, pas des promesses.",
  "A few landmarks, to situate the language in the world. Numbers shift year to year — these are orders of magnitude, not promises.",
);

const italianStats: ItalianStat[] = [
  {
    id: "stat_speakers",
    label: lstr("Locuteurs dans le monde", "Speakers worldwide"),
    value: lstr("~ 65–85 millions", "~ 65–85 million"),
    description: lstr(
      "Italien comme langue maternelle ou seconde langue principale. Estimation large : recensements et études donnent des fourchettes différentes.",
      "Italian as mother tongue or main second language. Wide range: censuses and studies give different brackets.",
    ),
  },
  {
    id: "stat_official",
    label: lstr("Pays officiels", "Official countries"),
    value: lstr("4", "4"),
    description: lstr(
      "Italie, Saint-Marin, Cité du Vatican, Suisse (cantons italophones). Une des langues officielles de l’Union européenne.",
      "Italy, San Marino, Vatican City, Switzerland (Italian-speaking cantons). One of the official languages of the European Union.",
    ),
  },
  {
    id: "stat_diaspora",
    label: lstr("Diaspora notable", "Notable diaspora"),
    value: lstr("Argentine, Brésil, USA, Canada, Australie", "Argentina, Brazil, USA, Canada, Australia"),
    description: lstr(
      "L’émigration italienne du XIXe et du XXe siècle a laissé des communautés italophones importantes hors d’Europe — au Québec aussi.",
      "Italian emigration in the 19th and 20th centuries left significant Italian-speaking communities outside Europe — including in Quebec.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 3) D'où vient l'italien?
// ─────────────────────────────────────────────────────────────────────

const originIntro: YoLocalizedString = lstr(
  "L’italien moderne descend du latin — comme le français, l’espagnol, le portugais, le roumain. Mais il y a une différence importante : la version « standard » qu’on enseigne aujourd’hui n’est pas une langue parisienne ou madrilène équivalente. Elle vient d’une région particulière, à une époque particulière.",
  "Modern Italian descends from Latin — like French, Spanish, Portuguese, and Romanian. But here's a key difference: the \"standard\" version taught today isn't a Parisian or Madrilenian equivalent. It comes from a specific region, at a specific moment.",
);

interface OriginBeat {
  id: string;
  era: YoLocalizedString;
  body: YoLocalizedString;
}

const originBeats: OriginBeat[] = [
  {
    id: "origin_latin",
    era: lstr("Latin tardif", "Late Latin"),
    body: lstr(
      "Du latin parlé dans la péninsule italienne, divers dialectes émergent au Moyen Âge — souvent très différents les uns des autres.",
      "From the Latin spoken across the Italian peninsula, various dialects emerge in the Middle Ages — often very different from one another.",
    ),
  },
  {
    id: "origin_dante",
    era: lstr("XIVe siècle · Dante", "14th century · Dante"),
    body: lstr(
      "Dante écrit la Divine Comédie en toscan, plus précisément en florentin. Ce choix littéraire pèse pendant des siècles : la langue de Dante devient la référence prestigieuse.",
      "Dante writes the Divine Comedy in Tuscan, specifically Florentine. That literary choice carries weight for centuries: Dante's language becomes the prestigious reference.",
    ),
  },
  {
    id: "origin_unification",
    era: lstr("1861 · Unification italienne", "1861 · Italian unification"),
    body: lstr(
      "L’Italie devient un pays unifié. Mais à cette époque, une grande partie de la population parle son dialecte régional, pas l’italien littéraire. L’italien standard se diffuse vraiment au XXe siècle, surtout grâce à l’école, à la radio et plus tard à la télévision.",
      "Italy becomes a unified country. But at the time, a large share of the population speaks its regional dialect, not literary Italian. Standard Italian really spreads in the 20th century — through schooling, radio, and later television.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4) Les régions italiennes
// ─────────────────────────────────────────────────────────────────────

interface ItalianRegionGroup {
  id: string;
  name: YoLocalizedString;
  description: YoLocalizedString;
  examples: YoLocalizedString;
}

const regionsLeadIn: YoLocalizedString = lstr(
  "L’Italie compte 20 régions administratives, mais culturellement on parle souvent de trois grandes zones. Chacune a sa cuisine, son histoire et — c’est le point qui nous intéresse — son accent.",
  "Italy has 20 administrative regions, but culturally we often speak of three big zones. Each has its cuisine, history, and — the point that matters here — its accent.",
);

const regionGroups: ItalianRegionGroup[] = [
  {
    id: "region_north",
    name: lstr("Nord", "North"),
    description: lstr(
      "Régions industrielles, plus proches culturellement de la France et de la Suisse. L’accent est généralement perçu comme plus rapide et plus fermé sur certaines voyelles.",
      "Industrial regions, culturally closer to France and Switzerland. The accent is generally perceived as faster, with certain vowels more closed.",
    ),
    examples: lstr(
      "Lombardia, Piemonte, Veneto, Emilia-Romagna",
      "Lombardia, Piemonte, Veneto, Emilia-Romagna",
    ),
  },
  {
    id: "region_centre",
    name: lstr("Centre", "Centre"),
    description: lstr(
      "Berceau de l’italien standard. Toscane (Florence) reste la référence linguistique historique ; Rome impose son accent dans les médias.",
      "Heart of standard Italian. Tuscany (Florence) remains the historical linguistic reference; Rome's accent dominates the media.",
    ),
    examples: lstr(
      "Toscana, Lazio, Marche, Umbria",
      "Toscana, Lazio, Marche, Umbria",
    ),
  },
  {
    id: "region_south",
    name: lstr("Sud", "South"),
    description: lstr(
      "Région solaire, riche en dialectes très différents de l’italien standard. Naples, Bari, Palerme, Catane — chaque ville a sa musique. La cuisine du Sud (et la diaspora qui l’a exportée) est une porte d’entrée culturelle énorme.",
      "Sunny region, rich in dialects very different from standard Italian. Naples, Bari, Palermo, Catania — each city has its own music. Southern cuisine (and the diaspora that carried it abroad) is a huge cultural entry point.",
    ),
    examples: lstr(
      "Campania, Puglia, Sicilia, Calabria",
      "Campania, Puglia, Sicilia, Calabria",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 5) Un italien, mille Italiens
// ─────────────────────────────────────────────────────────────────────

const dialectIntro: YoLocalizedString = lstr(
  "Une chose à savoir avant de mettre les pieds en Italie : un Milanais et un Napolitain qui parlent leurs dialectes respectifs ne se comprennent pas toujours. Le napolitain, le sicilien, le vénitien, le sarde — ce ne sont pas de simples accents, ce sont des langues régionales avec leur propre histoire.",
  "One thing to know before setting foot in Italy: someone from Milan and someone from Naples speaking their respective dialects don't always understand each other. Neapolitan, Sicilian, Venetian, Sardinian — these aren't just accents, they're regional languages with their own histories.",
);

const dialectStrategicNote: YoLocalizedString = lstr(
  "Bonne nouvelle : presque tout le monde comprend et parle aussi l’italien standard. C’est ce que tu vas apprendre. Tu pourras ensuite, plus tard, choisir une région et plonger dans son accent et sa culture spécifiques — quand tu seras prêt et qu’on aura un cours validé par un natif pour cette région.",
  "Good news: almost everyone understands and also speaks standard Italian. That's what you'll learn here. Later on, you can pick a region and dive into its specific accent and culture — once you're ready, and once we have a course validated by a native speaker for that region.",
);

const dialectExamplesIntro: YoLocalizedString = lstr(
  "Quelques exemples concrets pour visualiser la différence :",
  "A few concrete examples so you can picture the difference:",
);

interface DialectExample {
  id: string;
  meaning: YoLocalizedString;
  standard: string;
  regional: YoLocalizedString;
}

const dialectExamples: DialectExample[] = [
  {
    id: "dial_yes",
    meaning: lstr("« Oui »", "\"Yes\""),
    standard: "sì",
    regional: lstr(
      "« scì » en sicilien, « ouì » dans certains dialectes du Nord",
      "\"scì\" in Sicilian, \"ouì\" in some northern dialects",
    ),
  },
  {
    id: "dial_friend",
    meaning: lstr("« Comment ça va ? »", "\"How are you?\""),
    standard: "Come stai?",
    regional: lstr(
      "« Comm’ stai? » à Naples, « Cumi sì? » en sicilien",
      "\"Comm' stai?\" in Naples, \"Cumi sì?\" in Sicilian",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 6) Tes premiers mots
// ─────────────────────────────────────────────────────────────────────

interface FirstWord {
  id: string;
  /** Italian target — rendered with `lang="it"`. */
  target: string;
  translation: YoLocalizedString;
  /** Optional usage hint shown below the gloss. */
  hint?: YoLocalizedString;
  /** Group label so the UI can break the list into themed buckets. */
  group: "greetings" | "courtesy" | "useful";
}

const firstWordsIntro: YoLocalizedString = lstr(
  "Voici les mots qu’on entend dans toutes les boulangeries, hôtels et stations de train d’Italie. Appuie sur l’icône audio pour entendre la prononciation standard.",
  "Here are the words you'll hear in every bakery, hotel, and train station in Italy. Tap the audio icon to hear the standard pronunciation.",
);

const firstWords: FirstWord[] = [
  // Greetings
  {
    id: "fw_ciao",
    target: "Ciao",
    translation: lstr("Salut (informel, bonjour ET au revoir)", "Hi / Bye (informal, both hello and goodbye)"),
    group: "greetings",
  },
  {
    id: "fw_buongiorno",
    target: "Buongiorno",
    translation: lstr("Bonjour (matin / journée)", "Good morning / Hello (morning / daytime)"),
    group: "greetings",
  },
  {
    id: "fw_buonasera",
    target: "Buonasera",
    translation: lstr("Bonsoir", "Good evening"),
    hint: lstr(
      "Se dit dès le milieu de l’après-midi dans plusieurs régions.",
      "Used from mid-afternoon onward in several regions.",
    ),
    group: "greetings",
  },
  {
    id: "fw_buonanotte",
    target: "Buonanotte",
    translation: lstr("Bonne nuit", "Good night"),
    hint: lstr(
      "Réservé au moment de se coucher — pas pour saluer en soirée.",
      "Reserved for when going to bed — not used to greet someone in the evening.",
    ),
    group: "greetings",
  },
  // Courtesy
  {
    id: "fw_grazie",
    target: "Grazie",
    translation: lstr("Merci", "Thank you"),
    group: "courtesy",
  },
  {
    id: "fw_prego",
    target: "Prego",
    translation: lstr(
      "« Je t’en prie » / « De rien » / « Allez-y »",
      "\"You're welcome\" / \"Please go ahead\" / \"How can I help?\"",
    ),
    hint: lstr(
      "Mot multifonction. Réponse à « Grazie », mais aussi : « entrez », « prenez place », ou « je vous écoute ». Si tu n’apprends qu’un mot italien aujourd’hui, prends celui-là.",
      "Multipurpose word. A reply to \"Grazie,\" but also: \"come in,\" \"take a seat,\" or \"I'm listening.\" If you only learn one Italian word today, make it this one.",
    ),
    group: "courtesy",
  },
  {
    id: "fw_perfavore",
    target: "Per favore",
    translation: lstr("S’il te plaît / S’il vous plaît", "Please"),
    group: "courtesy",
  },
  {
    id: "fw_scusi",
    target: "Scusi",
    translation: lstr("Excusez-moi (formel, vouvoiement)", "Excuse me (formal, polite Lei form)"),
    group: "courtesy",
  },
  {
    id: "fw_scusa",
    target: "Scusa",
    translation: lstr("Excuse-moi (informel, tutoiement)", "Excuse me (informal, tu form)"),
    group: "courtesy",
  },
  // Useful
  {
    id: "fw_dove",
    target: "Dove?",
    translation: lstr("Où ?", "Where?"),
    group: "useful",
  },
  {
    id: "fw_quanto",
    target: "Quanto costa?",
    translation: lstr("Combien ça coûte ?", "How much does it cost?"),
    group: "useful",
  },
  {
    id: "fw_vorrei",
    target: "Vorrei",
    translation: lstr("Je voudrais (poli)", "I would like (polite)"),
    hint: lstr(
      "Se combine avec un nom : Vorrei un caffè, Vorrei un biglietto…",
      "Pairs with any noun: Vorrei un caffè, Vorrei un biglietto…",
    ),
    group: "useful",
  },
  {
    id: "fw_noncapisco",
    target: "Non capisco",
    translation: lstr("Je ne comprends pas", "I don't understand"),
    group: "useful",
  },
  {
    id: "fw_parlafr",
    target: "Parla francese?",
    translation: lstr("Parlez-vous français ?", "Do you speak French?"),
    group: "useful",
  },
  {
    id: "fw_parlaen",
    target: "Parla inglese?",
    translation: lstr("Parlez-vous anglais ?", "Do you speak English?"),
    group: "useful",
  },
];

const firstWordsGroupLabels: Record<FirstWord["group"], YoLocalizedString> = {
  greetings: lstr("Salutations", "Greetings"),
  courtesy: lstr("Politesse essentielle", "Essential courtesy"),
  useful: lstr("Mots-outils", "Useful expressions"),
};

// ─────────────────────────────────────────────────────────────────────
// 7) Quiz (max 7 questions)
// ─────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "q_origin",
    prompt: lstr(
      "Quelle ville historique a façonné l’italien standard tel qu’on l’enseigne aujourd’hui ?",
      "Which historical city shaped standard Italian as it's taught today?",
    ),
    options: [
      { id: "q_origin_a", label: lstr("Rome", "Rome") },
      { id: "q_origin_b", label: lstr("Florence", "Florence") },
      { id: "q_origin_c", label: lstr("Milan", "Milan") },
      { id: "q_origin_d", label: lstr("Naples", "Naples") },
    ],
    correctOptionId: "q_origin_b",
    explanation: lstr(
      "Dante écrit la Divine Comédie en florentin au XIVe siècle. Cette langue littéraire devient la base de l’italien standard.",
      "Dante writes the Divine Comedy in Florentine in the 14th century. That literary language becomes the basis of standard Italian.",
    ),
  },
  {
    id: "q_prego",
    prompt: lstr(
      "Tu dis « Grazie » à un serveur. Il répond « Prego ». Que veut-il dire ?",
      "You say \"Grazie\" to a waiter. He answers \"Prego.\" What does he mean?",
    ),
    options: [
      { id: "q_prego_a", label: lstr("« Désolé »", "\"Sorry\"") },
      { id: "q_prego_b", label: lstr("« De rien / je vous en prie »", "\"You're welcome\"") },
      { id: "q_prego_c", label: lstr("« Au revoir »", "\"Goodbye\"") },
      { id: "q_prego_d", label: lstr("« S’il vous plaît »", "\"Please\"") },
    ],
    correctOptionId: "q_prego_b",
    explanation: lstr(
      "« Prego » est multifonction, mais en réponse à « Grazie » il signifie « de rien ».",
      "\"Prego\" is multipurpose, but as a reply to \"Grazie\" it means \"you're welcome.\"",
    ),
  },
  {
    id: "q_official",
    prompt: lstr(
      "L’italien est langue officielle dans combien de pays ?",
      "In how many countries is Italian an official language?",
    ),
    options: [
      { id: "q_official_a", label: lstr("1", "1") },
      { id: "q_official_b", label: lstr("4", "4") },
      { id: "q_official_c", label: lstr("8", "8") },
      { id: "q_official_d", label: lstr("12", "12") },
    ],
    correctOptionId: "q_official_b",
    explanation: lstr(
      "Italie, Saint-Marin, Cité du Vatican, Suisse (cantons italophones).",
      "Italy, San Marino, Vatican City, Switzerland (Italian-speaking cantons).",
    ),
  },
  {
    id: "q_dialect",
    prompt: lstr(
      "Le napolitain ou le sicilien, par rapport à l’italien standard, sont surtout…",
      "Compared to standard Italian, Neapolitan or Sicilian are mainly…",
    ),
    options: [
      {
        id: "q_dialect_a",
        label: lstr("De simples accents", "Just accents"),
      },
      {
        id: "q_dialect_b",
        label: lstr(
          "Des langues régionales avec leur propre histoire",
          "Regional languages with their own history",
        ),
      },
      {
        id: "q_dialect_c",
        label: lstr("Une mode récente", "A recent trend"),
      },
      {
        id: "q_dialect_d",
        label: lstr("Identiques à l’italien standard", "Identical to standard Italian"),
      },
    ],
    correctOptionId: "q_dialect_b",
    explanation: lstr(
      "Ce sont des langues régionales distinctes. La plupart des locuteurs maîtrisent aussi l’italien standard — c’est ce qu’on enseigne ici.",
      "These are distinct regional languages. Most speakers also master standard Italian — that's what we teach here.",
    ),
  },
  {
    id: "q_scusi",
    prompt: lstr(
      "Tu veux dire « excusez-moi » poliment à une personne âgée que tu ne connais pas. Tu utilises…",
      "You want to say \"excuse me\" politely to an older stranger. You use…",
    ),
    options: [
      { id: "q_scusi_a", label: lstr("Ciao", "Ciao") },
      { id: "q_scusi_b", label: lstr("Scusa", "Scusa") },
      { id: "q_scusi_c", label: lstr("Scusi", "Scusi") },
      { id: "q_scusi_d", label: lstr("Prego", "Prego") },
    ],
    correctOptionId: "q_scusi_c",
    explanation: lstr(
      "« Scusi » est la forme polie (Lei). « Scusa » est familière (tu).",
      "\"Scusi\" is the polite form (Lei). \"Scusa\" is informal (tu).",
    ),
  },
  {
    id: "q_evening",
    prompt: lstr(
      "Tu rentres dans un restaurant à 19 h 30. Quelle salutation est la plus naturelle ?",
      "You walk into a restaurant at 7:30 pm. Which greeting is most natural?",
    ),
    options: [
      { id: "q_evening_a", label: lstr("Buongiorno", "Buongiorno") },
      { id: "q_evening_b", label: lstr("Buonanotte", "Buonanotte") },
      { id: "q_evening_c", label: lstr("Buonasera", "Buonasera") },
      { id: "q_evening_d", label: lstr("Arrivederci", "Arrivederci") },
    ],
    correctOptionId: "q_evening_c",
    explanation: lstr(
      "« Buonasera » s’utilise dès l’après-midi. « Buonanotte » est réservé au moment de se coucher.",
      "\"Buonasera\" works from the afternoon onward. \"Buonanotte\" is reserved for going to bed.",
    ),
  },
  {
    id: "q_vorrei",
    prompt: lstr(
      "Au comptoir d’un café, comment commander poliment un café ?",
      "At a café counter, how do you politely order a coffee?",
    ),
    options: [
      { id: "q_vorrei_a", label: lstr("Voglio un caffè", "Voglio un caffè") },
      { id: "q_vorrei_b", label: lstr("Vorrei un caffè, per favore", "Vorrei un caffè, per favore") },
      { id: "q_vorrei_c", label: lstr("Caffè!", "Caffè!") },
      { id: "q_vorrei_d", label: lstr("Dove caffè?", "Dove caffè?") },
    ],
    correctOptionId: "q_vorrei_b",
    explanation: lstr(
      "« Vorrei » + nom + « per favore » = formule polie standard. « Voglio » est correct mais plus direct.",
      "\"Vorrei\" + noun + \"per favore\" = standard polite formula. \"Voglio\" is correct but more direct.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 8) Flashcards — grouped decks
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
    title: lstr("La langue dans le monde", "The language in the world"),
    description: lstr(
      "Les mots qu’on a utilisés pour parler de l’italien comme phénomène mondial.",
      "The words we used to talk about Italian as a worldwide phenomenon.",
    ),
    cards: [
      {
        id: "card_il_mondo",
        front: "il mondo",
        back: lstr("le monde", "the world"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_la_lingua",
        front: "la lingua",
        back: lstr("la langue", "the language"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_parlare",
        front: "parlare",
        back: lstr("parler (verbe à l’infinitif)", "to speak (infinitive verb)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_il_paese",
        front: "il paese",
        back: lstr("le pays / le village", "the country / the village"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_milioni",
        front: "milioni",
        back: lstr("millions", "millions"),
        tag: lstr("Monde", "World"),
      },
    ],
  },
  {
    id: "deck_origin",
    title: lstr("Origine et histoire", "Origin and history"),
    description: lstr(
      "Le vocabulaire de la section sur Dante, le latin et l’unification.",
      "The vocabulary from the section on Dante, Latin, and unification.",
    ),
    cards: [
      {
        id: "card_la_storia",
        front: "la storia",
        back: lstr("l’histoire", "history"),
        tag: lstr("Histoire", "History"),
      },
      {
        id: "card_il_latino",
        front: "il latino",
        back: lstr("le latin", "Latin"),
        tag: lstr("Histoire", "History"),
      },
      {
        id: "card_la_parola",
        front: "la parola",
        back: lstr("le mot / la parole", "the word"),
        tag: lstr("Histoire", "History"),
      },
    ],
  },
  {
    id: "deck_regions",
    title: lstr("Régions", "Regions"),
    description: lstr(
      "Les mots qui décrivent la géographie linguistique italienne.",
      "The words that describe Italy's linguistic geography.",
    ),
    cards: [
      {
        id: "card_il_dialetto",
        front: "il dialetto",
        back: lstr("le dialecte / la langue régionale", "dialect / regional language"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_la_regione",
        front: "la regione",
        back: lstr("la région", "the region"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_la_citta",
        front: "la città",
        back: lstr("la ville", "the city"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_il_nord",
        front: "il nord",
        back: lstr("le nord", "the north"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_il_centro",
        front: "il centro",
        back: lstr("le centre", "the centre"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_il_sud",
        front: "il sud",
        back: lstr("le sud", "the south"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_diverso",
        front: "diverso",
        back: lstr("différent", "different"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_uguale",
        front: "uguale",
        back: lstr("pareil / égal", "same / equal"),
        tag: lstr("Régions", "Regions"),
      },
      {
        id: "card_l_accento",
        front: "l’accento",
        back: lstr("l’accent", "the accent"),
        tag: lstr("Régions", "Regions"),
      },
    ],
  },
  {
    id: "deck_courtesy",
    title: lstr("Politesse essentielle", "Essential courtesy"),
    description: lstr(
      "Les mots qui font la différence dans toutes les interactions quotidiennes.",
      "The words that make a difference in every daily interaction.",
    ),
    cards: [
      {
        id: "card_grazie",
        front: "Grazie",
        back: lstr("Merci", "Thank you"),
        tag: lstr("Politesse", "Courtesy"),
      },
      {
        id: "card_prego",
        front: "Prego",
        back: lstr("De rien / Je t’en prie / Allez-y", "You're welcome / Go ahead / How can I help"),
        hint: lstr(
          "Mot multifonction — un seul mot, beaucoup d’usages.",
          "Multipurpose word — one word, many uses.",
        ),
        tag: lstr("Politesse", "Courtesy"),
        isLocalExpression: true,
      },
      {
        id: "card_perfavore",
        front: "Per favore",
        back: lstr("S’il te plaît / S’il vous plaît", "Please"),
        tag: lstr("Politesse", "Courtesy"),
      },
      {
        id: "card_scusi",
        front: "Scusi",
        back: lstr("Excusez-moi (formel)", "Excuse me (formal)"),
        tag: lstr("Politesse", "Courtesy"),
      },
      {
        id: "card_scusa",
        front: "Scusa",
        back: lstr("Excuse-moi (informel)", "Excuse me (informal)"),
        tag: lstr("Politesse", "Courtesy"),
      },
    ],
  },
  {
    id: "deck_tools",
    title: lstr("Mots-outils", "Useful expressions"),
    description: lstr(
      "Les mots et phrases qui débloquent toutes les autres conversations.",
      "The words and phrases that unlock every other conversation.",
    ),
    cards: [
      {
        id: "card_vorrei",
        front: "Vorrei",
        back: lstr("Je voudrais (poli)", "I would like (polite)"),
        tag: lstr("Outils", "Tools"),
      },
      {
        id: "card_noncapisco",
        front: "Non capisco",
        back: lstr("Je ne comprends pas", "I don't understand"),
        tag: lstr("Outils", "Tools"),
      },
      {
        id: "card_dove",
        front: "Dove?",
        back: lstr("Où ?", "Where?"),
        tag: lstr("Outils", "Tools"),
      },
    ],
  },
  {
    id: "deck_travel",
    title: lstr("Voyage", "Travel"),
    description: lstr(
      "Pour voyager, demander, choisir, payer.",
      "For traveling, asking, choosing, paying.",
    ),
    cards: [
      {
        id: "card_quantocosta",
        front: "Quanto costa?",
        back: lstr("Combien ça coûte ?", "How much does it cost?"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_parlafr",
        front: "Parla francese?",
        back: lstr("Parlez-vous français ?", "Do you speak French?"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_parlaen",
        front: "Parla inglese?",
        back: lstr("Parlez-vous anglais ?", "Do you speak English?"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_buongiorno",
        front: "Buongiorno",
        back: lstr("Bonjour (matin / journée)", "Good morning"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_buonasera",
        front: "Buonasera",
        back: lstr("Bonsoir", "Good evening"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_buonanotte",
        front: "Buonanotte",
        back: lstr("Bonne nuit", "Good night"),
        tag: lstr("Voyage", "Travel"),
      },
      {
        id: "card_ciao",
        front: "Ciao",
        back: lstr("Salut (informel)", "Hi / Bye (informal)"),
        tag: lstr("Voyage", "Travel"),
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
  "Une fois que tu connais ces mots, parler avec une vraie personne accélère tout. Les profs Pratiqo d’italien te corrigent, t’expliquent les nuances entre l’italien standard et leur région, et t’aident à arriver en confiance.",
  "Once you know these words, speaking with a real person accelerates everything. Pratiqo Italian teachers correct you, explain the nuances between standard Italian and their region, and help you arrive with confidence.",
);

const teacherCta: YoLocalizedString = lstr(
  "Trouver un prof d’italien",
  "Find an Italian teacher",
);

// ─────────────────────────────────────────────────────────────────────
// Module-level export
// ─────────────────────────────────────────────────────────────────────

export interface ItalianIntroData {
  welcomeIntro: YoLocalizedString;
  welcomePromise: YoLocalizedString;
  welcomeCulturalNote: YoLocalizedString;
  italianStatsLeadIn: YoLocalizedString;
  italianStats: ItalianStat[];
  originIntro: YoLocalizedString;
  originBeats: OriginBeat[];
  regionsLeadIn: YoLocalizedString;
  regionGroups: ItalianRegionGroup[];
  dialectIntro: YoLocalizedString;
  dialectStrategicNote: YoLocalizedString;
  dialectExamplesIntro: YoLocalizedString;
  dialectExamples: DialectExample[];
  firstWordsIntro: YoLocalizedString;
  firstWords: FirstWord[];
  firstWordsGroupLabels: Record<FirstWord["group"], YoLocalizedString>;
  quizQuestions: YoQuizQuestion[];
  flashcardGroups: FlashcardGroup[];
  flashcards: YoFlashcard[];
  teacherBody: YoLocalizedString;
  teacherCta: YoLocalizedString;
}

export const italianIntro: ItalianIntroData = {
  welcomeIntro,
  welcomePromise,
  welcomeCulturalNote,
  italianStatsLeadIn,
  italianStats,
  originIntro,
  originBeats,
  regionsLeadIn,
  regionGroups,
  dialectIntro,
  dialectStrategicNote,
  dialectExamplesIntro,
  dialectExamples,
  firstWordsIntro,
  firstWords,
  firstWordsGroupLabels,
  quizQuestions,
  flashcardGroups,
  flashcards: allFlashcards,
  teacherBody,
  teacherCta,
};
