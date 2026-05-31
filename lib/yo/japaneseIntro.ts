/**
 * YoPratiqo — Japonais · Intro module data
 *
 * Hardcoded content for `/yo/langues/japonais/intro`. A free,
 * launch-safe orientation module designed for Quebec / Canada
 * audiences who are curious about Japanese — for travel, culture,
 * food, or a future of "I might want to study seriously."
 *
 * Tone contract:
 *   - Premium, warm, reassuring, culturally respectful.
 *   - Never panic the learner about kanji.
 *   - Never overpromise JLPT timelines or "I'll be fluent in N
 *     months" hooks.
 *   - JLPT N1 is described as "advanced literacy / professional-level
 *     comprehension", NEVER as casual "native level".
 *   - Study-duration figures stay as orders of magnitude, never as
 *     "exactly N hours = fluency."
 *   - The learner does NOT need N1 to start travelling or speaking.
 *
 * Bilingual contract:
 *   - French is the DEFAULT locale (Quebec / Canada audience).
 *   - English variants ship through `lstr(fr, en)` so the EN view
 *     (`?lang=en`) is shipped i18n-ready.
 *   - Japanese target words/phrases stay plain strings so they keep
 *     `lang="ja"` for accessibility, TTS, and copy-paste behaviour.
 *   - Romaji is documented next to each Japanese item — explicitly
 *     framed as a TEMPORARY phonetic bridge, NOT the final goal.
 *
 * Audio:
 *   - Single source of truth for pronunciation audio is
 *     `lib/yo/audio/japaneseIntroAudio.ts`. The page wires
 *     `<YoJapaneseAudioButton>` next to each Japanese phrase.
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
  "Le japonais est une langue magnifique, riche et lointaine pour un francophone — et pourtant des millions de gens dans le monde l'apprennent chaque année. Tu n'as pas besoin de viser le JLPT N1 pour commander un ramen à Tokyo, lire un menu à Kyoto ou discuter cinéma avec un professeur sur Pratiqo.",
  "Japanese is a beautiful, rich, and culturally distant language for a French speaker — and yet millions of people learn it every year. You don't need to aim for JLPT N1 to order a ramen in Tokyo, read a menu in Kyoto, or discuss cinema with a Pratiqo teacher.",
);

const welcomeContract: YoLocalizedString = lstr(
  "Promesse de cette intro : on te donne une vision claire de la langue (chiffres, origines, écriture, grammaire), un kit minimal de politesse pour survivre aux premières interactions, et quelques codes culturels qui évitent les faux pas. Pas de panique sur les kanji. Pas de fausse promesse de fluidité en 30 jours.",
  "This intro's promise: you get a clear picture of the language (numbers, origins, writing, grammar), a minimal politeness kit to survive your first interactions, and a few cultural codes that prevent missteps. No kanji panic. No fake fluency-in-30-days promise.",
);

// ─────────────────────────────────────────────────────────────────────
// 2) Le japonais en chiffres
// ─────────────────────────────────────────────────────────────────────

interface JapaneseStat {
  id: string;
  label: YoLocalizedString;
  value: YoLocalizedString;
  description: YoLocalizedString;
}

const numbersLeadIn: YoLocalizedString = lstr(
  "Quelques repères pour situer la langue. Les chiffres bougent — ce sont des ordres de grandeur, pas des promesses gravées dans la pierre.",
  "A few landmarks to situate the language. Numbers shift over time — these are orders of magnitude, not promises set in stone.",
);

const japaneseStats: JapaneseStat[] = [
  {
    id: "stat_speakers",
    label: lstr("Locuteurs natifs", "Native speakers"),
    value: lstr("~ 125 millions", "~ 125 million"),
    description: lstr(
      "Le japonais est parlé essentiellement au Japon. Très peu d'autres pays l'utilisent comme langue principale — c'est une langue concentrée géographiquement, pas une langue mondiale comme l'anglais ou l'espagnol.",
      "Japanese is spoken essentially in Japan. Very few other countries use it as a main language — it's a geographically concentrated language, not a global one like English or Spanish.",
    ),
  },
  {
    id: "stat_learners",
    label: lstr("Apprenants dans le monde", "Learners worldwide"),
    value: lstr("Plusieurs millions", "Several million"),
    description: lstr(
      "Mangas, animes, jeux vidéo, gastronomie, voyages : la langue est apprise par des millions de personnes hors du Japon, surtout en Asie de l'Est et du Sud-Est, et aussi de plus en plus en Amérique du Nord.",
      "Manga, anime, video games, cuisine, travel: the language is learned by millions outside Japan, especially in East and Southeast Asia, and increasingly in North America.",
    ),
  },
  {
    id: "stat_difficulty",
    label: lstr("Pour un francophone", "For a French speaker"),
    value: lstr("Famille linguistique éloignée", "Distant language family"),
    description: lstr(
      "Le japonais n'est pas une langue indo-européenne. La grammaire, l'écriture et la sonorité sont très différentes du français. Cela ne le rend pas « impossible » — juste différent. La courbe d'apprentissage est progressive : les premières phrases viennent vite, l'écriture demande plus de patience.",
      "Japanese is not an Indo-European language. Its grammar, writing, and sound system are very different from French. That doesn't make it \"impossible\" — just different. The learning curve is progressive: first sentences come fast, writing takes more patience.",
    ),
  },
];

const numbersTakeaway: YoLocalizedString = lstr(
  "À retenir : viser la communication réelle d'abord. Le voyage, les politesses, comprendre une carte de restaurant, échanger 30 secondes avec un commerçant. Le reste vient avec le temps.",
  "Key takeaway: aim for real communication first. Travel, politeness, reading a restaurant menu, chatting for 30 seconds with a shopkeeper. The rest comes with time.",
);

// ─────────────────────────────────────────────────────────────────────
// 3) D'où vient le japonais?
// ─────────────────────────────────────────────────────────────────────

const originIntro: YoLocalizedString = lstr(
  "Le japonais est une langue ancienne, parlée depuis plus de 1 500 ans dans l'archipel. Sa famille linguistique est encore débattue par les chercheurs — certains la rapprochent du coréen, d'autres la considèrent comme largement isolée. Le vocabulaire, lui, a énormément emprunté au chinois (les fameux 漢字 / kanji), puis à l'anglais à l'époque moderne.",
  "Japanese is an ancient language, spoken in the archipelago for over 1,500 years. Its language family is still debated by scholars — some link it to Korean, others treat it as largely isolated. The vocabulary, however, has borrowed massively from Chinese (the famous 漢字 / kanji), then from English in the modern era.",
);

interface OriginPoint {
  id: string;
  title: YoLocalizedString;
  body: YoLocalizedString;
}

const originPoints: OriginPoint[] = [
  {
    id: "origin_chinese_borrowing",
    title: lstr(
      "Vague chinoise (~ Ve–IXe siècle)",
      "Chinese wave (~ 5th–9th century)",
    ),
    body: lstr(
      "Le Japon adopte les caractères chinois pour transcrire sa langue. Cela donne naissance aux kanji. Beaucoup de mots savants viennent encore de cette époque.",
      "Japan adopts Chinese characters to transcribe its own language. That gives rise to kanji. Many learned words still trace back to that era.",
    ),
  },
  {
    id: "origin_kana",
    title: lstr(
      "Naissance des kana (~ IXe–Xe siècle)",
      "Birth of the kana (~ 9th–10th century)",
    ),
    body: lstr(
      "Hiragana et katakana sont créés à partir de versions simplifiées de kanji, pour écrire les sons que les caractères chinois ne capturaient pas naturellement.",
      "Hiragana and katakana are created from simplified kanji forms, to write the sounds that Chinese characters didn't naturally capture.",
    ),
  },
  {
    id: "origin_modern",
    title: lstr(
      "Modernisation (XIXe–XXe siècle)",
      "Modernisation (19th–20th century)",
    ),
    body: lstr(
      "Le Japon s'ouvre au monde. Une grande quantité de mots techniques et quotidiens arrivent de l'anglais et s'écrivent en katakana (テレビ, コーヒー, スマホ).",
      "Japan opens to the world. A large quantity of technical and everyday words arrive from English and get written in katakana (テレビ, コーヒー, スマホ).",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4) Les trois systèmes d'écriture
// ─────────────────────────────────────────────────────────────────────

interface WritingSystem {
  id: string;
  /** Native script title rendered with `lang="ja"`. */
  nativeName: string;
  /** Romanised label, helpful for the FR/EN UI. */
  romaji: string;
  label: YoLocalizedString;
  description: YoLocalizedString;
  example: { native: string; romaji: string };
  size: YoLocalizedString;
}

const writingIntro: YoLocalizedString = lstr(
  "Le japonais utilise trois systèmes d'écriture en parallèle, mélangés dans la même phrase. C'est ce qui surprend le plus les débutants — et c'est aussi ce qui rend la langue visuellement reconnaissable entre toutes. On commence par hiragana et katakana, puis on apprend les kanji petit à petit. Personne n'apprend tous les kanji d'un coup. Personne.",
  "Japanese uses three writing systems in parallel, mixed within the same sentence. That's what surprises beginners the most — and it's also what makes the language so visually distinct. You start with hiragana and katakana, then learn kanji little by little. Nobody learns all the kanji at once. Nobody.",
);

const writingSystems: WritingSystem[] = [
  {
    id: "ws_hiragana",
    nativeName: "ひらがな",
    romaji: "hiragana",
    label: lstr("Hiragana", "Hiragana"),
    description: lstr(
      "L'alphabet phonétique japonais. Sert pour les mots japonais d'origine, les terminaisons grammaticales et les particules. C'est l'écriture qu'un débutant apprend en premier — c'est aussi celle qu'on utilise le plus souvent dans la grammaire au quotidien.",
      "The Japanese phonetic syllabary. Used for native Japanese words, grammatical endings, and particles. It's the script a beginner learns first — and it's also what shows up most often in everyday grammar.",
    ),
    example: { native: "あ・い・う・え・お", romaji: "a · i · u · e · o" },
    size: lstr("~ 46 caractères de base", "~ 46 base characters"),
  },
  {
    id: "ws_katakana",
    nativeName: "カタカナ",
    romaji: "katakana",
    label: lstr("Katakana", "Katakana"),
    description: lstr(
      "Même rôle phonétique que les hiragana, mais réservé aux mots étrangers (« coffee » → コーヒー), aux noms d'animaux et plantes scientifiques, à l'emphase et aux onomatopées. Visuellement plus angulaire.",
      "Same phonetic role as hiragana, but reserved for foreign words (\"coffee\" → コーヒー), scientific names of animals/plants, emphasis, and onomatopoeia. Visually more angular.",
    ),
    example: { native: "ア・イ・ウ・エ・オ", romaji: "a · i · u · e · o" },
    size: lstr("~ 46 caractères de base", "~ 46 base characters"),
  },
  {
    id: "ws_kanji",
    nativeName: "漢字",
    romaji: "kanji",
    label: lstr("Kanji", "Kanji"),
    description: lstr(
      "Les caractères d'origine chinoise. Chaque kanji porte un sens (parfois plusieurs) et plusieurs lectures selon le contexte. Pas de panique : un Japonais adulte connaît environ 2 000 kanji « courants », et tu peux déjà voyager avec quelques dizaines bien choisis.",
      "The Chinese-origin characters. Each kanji carries a meaning (sometimes several) and multiple readings depending on context. Don't panic: an adult native knows around 2,000 \"common\" kanji, and you can already travel with a few dozen well-chosen ones.",
    ),
    example: { native: "山・川・人・水", romaji: "yama · kawa · hito · mizu" },
    size: lstr(
      "~ 2 000 « kanji courants » (jōyō)",
      "~ 2,000 \"common-use\" kanji (jōyō)",
    ),
  },
];

const romajiNote: YoLocalizedString = lstr(
  "Et le romaji ? C'est simplement la transcription du japonais en lettres latines (« arigatō »). C'est un pont temporaire pour t'aider à lire au tout début. Ce n'est pas l'objectif final — les Japonais n'écrivent pas en romaji entre eux.",
  "And romaji? It's simply the transcription of Japanese in Latin letters (\"arigatō\"). It's a temporary bridge to help you read at the very start. It's not the final goal — Japanese people don't write to each other in romaji.",
);

const writingTakeaway: YoLocalizedString = lstr(
  "À retenir : hiragana et katakana s'apprennent en quelques semaines de pratique régulière. Les kanji se construisent dans la durée, par paquets de 10 ou 20 à la fois. Pas de raccourci, mais pas de panique non plus.",
  "Key takeaway: hiragana and katakana take a few weeks of regular practice. Kanji is built over time, in packs of 10 or 20 at a time. No shortcut — but no panic either.",
);

// ─────────────────────────────────────────────────────────────────────
// 5) Pourquoi le japonais sonne différent
// ─────────────────────────────────────────────────────────────────────

interface SoundOrGrammarPoint {
  id: string;
  title: YoLocalizedString;
  body: YoLocalizedString;
  /** Optional Japanese example surfaced in the UI with `lang="ja"`. */
  example?: { native: string; romaji: string; gloss: YoLocalizedString };
}

const soundIntro: YoLocalizedString = lstr(
  "Le japonais a un nombre limité de sons, ce qui le rend étonnamment clair à l'oreille. Il n'y a pas de « r » roulé difficile, pas de sons de gorge, pas de combinaisons consonantiques compliquées. Mais l'ordre des mots et la grammaire sont très différents du français — c'est là que se concentre l'effort.",
  "Japanese has a limited inventory of sounds, which makes it surprisingly clear on the ear. No difficult rolled \"r\", no throat sounds, no complicated consonant clusters. But word order and grammar are very different from English/French — that's where the effort sits.",
);

const soundPoints: SoundOrGrammarPoint[] = [
  {
    id: "sound_syllables",
    title: lstr(
      "Tout est syllabique",
      "Everything is syllabic",
    ),
    body: lstr(
      "Le japonais s'articule autour de syllabes simples (consonne + voyelle, ou voyelle seule). Il n'y a presque pas de combinaisons comme « str- » ou « -mpts ». C'est pour ça que les mots étrangers se transforment : « computer » devient コンピューター (kon-pyū-tā).",
      "Japanese is built around simple syllables (consonant + vowel, or a vowel alone). There are almost no clusters like \"str-\" or \"-mpts\". That's why foreign words transform: \"computer\" becomes コンピューター (kon-pyū-tā).",
    ),
  },
  {
    id: "sound_pitch",
    title: lstr(
      "Accent de hauteur, pas d'intensité",
      "Pitch accent, not stress accent",
    ),
    body: lstr(
      "Au lieu d'appuyer sur une syllabe (comme en anglais), le japonais module la hauteur. Les natifs sentent la différence, mais à ton niveau actuel, parler « à plat » est parfaitement acceptable et compris.",
      "Instead of stressing a syllable (like English), Japanese modulates pitch. Native speakers can feel the difference, but at your current level, speaking \"flat\" is perfectly acceptable and understood.",
    ),
  },
  {
    id: "grammar_sov",
    title: lstr(
      "Ordre des mots : Sujet–Objet–Verbe",
      "Word order: Subject–Object–Verb",
    ),
    body: lstr(
      "Là où le français place le verbe au milieu, le japonais le met à la fin. C'est l'ajustement mental le plus important au début : on attend le verbe.",
      "Where French/English put the verb in the middle, Japanese puts it at the end. That's the most important mental shift early on: you wait for the verb.",
    ),
    example: {
      native: "私は寿司を食べます。",
      romaji: "watashi wa sushi o tabemasu.",
      gloss: lstr(
        "Moi (sujet) — sushi (objet) — manger (poli) → Je mange du sushi.",
        "I (subject) — sushi (object) — eat (polite) → I eat sushi.",
      ),
    },
  },
  {
    id: "grammar_particles",
    title: lstr(
      "Les particules : un mode d'emploi minimaliste",
      "Particles: a minimalist user manual",
    ),
    body: lstr(
      "Les petits mots は (wa), を (o), に (ni) sont les balises grammaticales : ils marquent qui fait quoi. À ton stade, retiens-les comme un kit : は marque le sujet/thème, を marque l'objet, に marque la destination ou le moment. Tu raffineras avec un prof — ce n'est pas un piège que tu dois résoudre seul.",
      "Tiny words like は (wa), を (o), に (ni) are the grammar markers: they tag who does what. At your stage, treat them as a kit: は marks the subject/topic, を marks the object, に marks the destination or time. You'll refine with a teacher — this isn't a trap to solve alone.",
    ),
  },
];

const soundTakeaway: YoLocalizedString = lstr(
  "À retenir : la prononciation japonaise est plutôt indulgente pour un francophone. C'est l'ordre des mots et les particules qui demandent de l'entraînement.",
  "Key takeaway: Japanese pronunciation is fairly forgiving for a French speaker. Word order and particles are what need practice.",
);

// ─────────────────────────────────────────────────────────────────────
// 6) Tes premiers mots de politesse
// ─────────────────────────────────────────────────────────────────────

interface PolitenessPhrase {
  id: string;
  /** Original Japanese text (rendered with `lang="ja"`). */
  target: string;
  /** Romaji bridge — explicitly framed as temporary phonetic support. */
  romaji: string;
  translation: YoLocalizedString;
  /** Optional usage hint shown below the gloss. */
  hint?: YoLocalizedString;
  /** Bucket so the UI can group the list. */
  group: "greetings" | "core" | "introductions" | "leaving";
}

const politenessIntro: YoLocalizedString = lstr(
  "Voici un kit minimal de politesse — tout en forme polie, parce qu'au Japon on commence toujours en mode poli avec un inconnu, un commerçant ou un collègue. Tu pourras descendre vers des registres plus familiers une fois sur place, avec des amis. Appuie sur l'icône audio pour entendre la prononciation.",
  "Here's a minimal politeness kit — all in polite form, because in Japan you always start polite with strangers, shopkeepers, or coworkers. You can drop to more casual registers later, with friends. Tap the audio icon for the pronunciation.",
);

const politenessPhrases: PolitenessPhrase[] = [
  // Greetings — first thing out of your mouth.
  {
    id: "po_youkoso",
    target: "ようこそ",
    romaji: "yōkoso",
    translation: lstr("Bienvenue.", "Welcome."),
    group: "greetings",
  },
  {
    id: "po_ohayou",
    target: "おはようございます",
    romaji: "ohayō gozaimasu",
    translation: lstr("Bonjour (matin).", "Good morning."),
    hint: lstr(
      "Le « ございます » (gozaimasu) ajoute la politesse. Avec des amis, on dit juste « おはよう » (ohayō).",
      "The \"ございます\" (gozaimasu) adds politeness. With friends, just say \"おはよう\" (ohayō).",
    ),
    group: "greetings",
  },
  {
    id: "po_konnichiwa",
    target: "こんにちは",
    romaji: "konnichiwa",
    translation: lstr("Bonjour (journée).", "Hello / good day."),
    group: "greetings",
  },
  {
    id: "po_konbanwa",
    target: "こんばんは",
    romaji: "konbanwa",
    translation: lstr("Bonsoir.", "Good evening."),
    group: "greetings",
  },
  {
    id: "po_oyasumi",
    target: "おやすみなさい",
    romaji: "oyasumi nasai",
    translation: lstr("Bonne nuit.", "Good night."),
    group: "greetings",
  },
  // Core politeness — thanks, sorry, please, yes/no.
  {
    id: "po_arigatou",
    target: "ありがとうございます",
    romaji: "arigatō gozaimasu",
    translation: lstr("Merci (poli).", "Thank you (polite)."),
    hint: lstr(
      "Avec des amis : juste « ありがとう » (arigatō). Au travail / commerce : la version longue.",
      "With friends: just \"ありがとう\" (arigatō). At work / shops: use the long version.",
    ),
    group: "core",
  },
  {
    id: "po_sumimasen",
    target: "すみません",
    romaji: "sumimasen",
    translation: lstr("Excusez-moi / pardon.", "Excuse me / sorry."),
    hint: lstr(
      "Mot magique : sert à attirer l'attention d'un serveur, à s'excuser légèrement, ou même à dire « merci » dans le sens de « je vous ai dérangé ».",
      "Magic word: get a waiter's attention, lightly apologise, or even thank in the sense of \"sorry to bother you.\"",
    ),
    group: "core",
  },
  {
    id: "po_onegai",
    target: "お願いします",
    romaji: "onegai shimasu",
    translation: lstr("S'il vous plaît.", "Please."),
    hint: lstr(
      "Se met à la fin d'une demande. « Coffee, onegai shimasu. » fonctionne déjà parfaitement.",
      "Goes at the end of a request. \"Coffee, onegai shimasu.\" already works perfectly.",
    ),
    group: "core",
  },
  {
    id: "po_dou_itashi",
    target: "どういたしまして",
    romaji: "dō itashimashite",
    translation: lstr("De rien.", "You're welcome."),
    group: "core",
  },
  {
    id: "po_hai",
    target: "はい",
    romaji: "hai",
    translation: lstr("Oui.", "Yes."),
    group: "core",
  },
  {
    id: "po_iie",
    target: "いいえ",
    romaji: "iie",
    translation: lstr("Non.", "No."),
    hint: lstr(
      "Au Japon, on dit rarement « non » de manière directe. Voir la section « Codes culturels ».",
      "In Japan, people rarely say \"no\" directly. See the \"Cultural codes\" section.",
    ),
    group: "core",
  },
  // Introductions.
  {
    id: "po_hajimemashite",
    target: "はじめまして",
    romaji: "hajimemashite",
    translation: lstr(
      "Enchanté(e). (la première fois qu'on rencontre quelqu'un)",
      "Nice to meet you. (used the first time you meet someone)",
    ),
    group: "introductions",
  },
  {
    id: "po_desu",
    target: "です",
    romaji: "desu",
    translation: lstr(
      "« être » poli (copule). Sert à finir une phrase de présentation.",
      "Polite \"to be\" (copula). Used to end an introduction sentence.",
    ),
    hint: lstr(
      "Exemple : « Marie desu. » = « Je suis Marie. »",
      "Example: \"Marie desu.\" = \"I'm Marie.\"",
    ),
    group: "introductions",
  },
  {
    id: "po_yoroshiku",
    target: "よろしくお願いします",
    romaji: "yoroshiku onegai shimasu",
    translation: lstr(
      "Je compte sur votre bienveillance. (ferme une présentation)",
      "Please treat me kindly. (closes an introduction)",
    ),
    hint: lstr(
      "Phrase rituelle. Se dit après s'être présenté, en s'inclinant légèrement.",
      "A ritual phrase. Said after introducing yourself, with a slight bow.",
    ),
    group: "introductions",
  },
  // Leaving.
  {
    id: "po_sayounara",
    target: "さようなら",
    romaji: "sayōnara",
    translation: lstr("Au revoir.", "Goodbye."),
    hint: lstr(
      "Plus formel et plus définitif qu'on ne le pense. Pour un « à plus tard » entre amis, on préfère « じゃあね » (jaa ne).",
      "More formal and more final than people think. For \"see you later\" with friends, prefer \"じゃあね\" (jaa ne).",
    ),
    group: "leaving",
  },
  {
    id: "po_mata_ashita",
    target: "また明日",
    romaji: "mata ashita",
    translation: lstr("À demain.", "See you tomorrow."),
    group: "leaving",
  },
  {
    id: "po_jaa_ne",
    target: "じゃあね",
    romaji: "jaa ne",
    translation: lstr("Salut ! (familier)", "See ya! (casual)"),
    group: "leaving",
  },
  {
    id: "po_shitsurei",
    target: "失礼します",
    romaji: "shitsurei shimasu",
    translation: lstr(
      "Je vous prie de m'excuser. (formel, en quittant un lieu)",
      "Please excuse me. (formal, when leaving a place)",
    ),
    hint: lstr(
      "Très utile pour quitter une salle de réunion ou raccrocher poliment au téléphone.",
      "Very useful when leaving a meeting room or politely ending a phone call.",
    ),
    group: "leaving",
  },
  {
    id: "po_omedetou",
    target: "おめでとう",
    romaji: "omedetō",
    translation: lstr("Félicitations.", "Congratulations."),
    hint: lstr(
      "En version polie : « おめでとうございます » (omedetō gozaimasu).",
      "Polite version: \"おめでとうございます\" (omedetō gozaimasu).",
    ),
    group: "leaving",
  },
];

const politenessGroupLabels: Record<
  PolitenessPhrase["group"],
  YoLocalizedString
> = {
  greetings: lstr("Salutations", "Greetings"),
  core: lstr("Politesse essentielle", "Core politeness"),
  introductions: lstr("Se présenter", "Introductions"),
  leaving: lstr("Partir / clore", "Leaving / closing"),
};

// ─────────────────────────────────────────────────────────────────────
// 7) Codes culturels qui surprennent
// ─────────────────────────────────────────────────────────────────────

interface CulturalCode {
  id: string;
  title: YoLocalizedString;
  body: YoLocalizedString;
}

const cultureIntro: YoLocalizedString = lstr(
  "Le japonais ne se résume pas à des mots — c'est aussi un mode d'emploi social. Voici les codes les plus utiles à connaître AVANT ton premier voyage. Pas pour t'écraser, mais pour éviter les malentendus de bonne foi.",
  "Japanese isn't just words — it's also a social user manual. Here are the most useful codes to know BEFORE your first trip. Not to overwhelm you, just to avoid well-meaning misunderstandings.",
);

const culturalCodes: CulturalCode[] = [
  {
    id: "culture_shoes",
    title: lstr(
      "On enlève ses chaussures",
      "Shoes come off",
    ),
    body: lstr(
      "À la maison, dans certains restaurants traditionnels, dans les vestiaires d'écoles ou de temples, on retire ses chaussures et on porte parfois des chaussons fournis. Repère la marche surélevée à l'entrée — c'est le signal.",
      "At home, in some traditional restaurants, in school changing rooms or temples, you remove your shoes and sometimes wear provided slippers. Watch for the raised step at the entrance — that's the signal.",
    ),
  },
  {
    id: "culture_no_tipping",
    title: lstr(
      "On ne donne pas de pourboire",
      "No tipping",
    ),
    body: lstr(
      "Dans la quasi-totalité des restaurants et taxis, le pourboire n'est pas attendu et peut même mettre la personne mal à l'aise. Le service est inclus. Si tu veux remercier, dis « ごちそうさまでした » (gochisōsama deshita) en sortant.",
      "In nearly every restaurant and taxi, tipping isn't expected and can even make the staff uncomfortable. Service is included. If you want to thank them, say \"ごちそうさまでした\" (gochisōsama deshita) on your way out.",
    ),
  },
  {
    id: "culture_quiet_train",
    title: lstr(
      "Trains et métros silencieux",
      "Trains and subways are silent",
    ),
    body: lstr(
      "On ne parle pas fort, on met son téléphone en mode silencieux, et on ne prend pas d'appels. Les Japonais voient le transport en commun comme un espace partagé qui se respecte par défaut.",
      "People don't talk loudly, phones go on silent, and you don't take calls. Japanese passengers treat public transport as a shared space that is respected by default.",
    ),
  },
  {
    id: "culture_two_hand",
    title: lstr(
      "Donner et recevoir à deux mains",
      "Two-hand exchange",
    ),
    body: lstr(
      "Carte de crédit, carte de visite, cadeau, monnaie : tu donnes et tu reçois avec les deux mains, ou avec un léger soutien de la deuxième. Petit geste, gros effet de respect.",
      "Credit card, business card, gift, change: you give and receive with two hands, or with a light support from the second. Small gesture, big respect signal.",
    ),
  },
  {
    id: "culture_indirect_no",
    title: lstr(
      "Le « non » est rarement direct",
      "\"No\" is rarely direct",
    ),
    body: lstr(
      "« ちょっと… » (chotto…), « 難しいですね » (muzukashii desu ne, « c'est difficile »), un long silence ou un petit rire gêné — voilà comment se formulent souvent les refus polis. Apprends à lire ces signaux : insister après un « chotto… » est mal vu.",
      "\"ちょっと…\" (chotto…), \"難しいですね\" (muzukashii desu ne, \"that's difficult\"), a long silence, or a small embarrassed laugh — that's how polite refusals often sound. Learn to read these signals: insisting after a \"chotto…\" is rude.",
    ),
  },
  {
    id: "culture_bowing",
    title: lstr(
      "L'inclinaison vaut un mot",
      "A bow is worth a word",
    ),
    body: lstr(
      "Une légère inclinaison du buste accompagne la plupart des « merci » et « excusez-moi ». Pas besoin de la version cérémonielle à 90° : 15° suffit pour un débutant respectueux.",
      "A slight bow accompanies most \"thank you\" and \"excuse me\" moments. No need for the ceremonial 90° version: 15° is plenty for a respectful beginner.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 8) Quiz — 7 questions max
// ─────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "q_writing_systems",
    prompt: lstr(
      "Combien de systèmes d'écriture le japonais utilise-t-il en parallèle?",
      "How many writing systems does Japanese use in parallel?",
    ),
    options: [
      { id: "q_writing_a", label: lstr("Un seul (les kanji)", "Only one (kanji)") },
      {
        id: "q_writing_b",
        label: lstr("Deux (hiragana et katakana)", "Two (hiragana and katakana)"),
      },
      {
        id: "q_writing_c",
        label: lstr(
          "Trois (hiragana, katakana, kanji)",
          "Three (hiragana, katakana, kanji)",
        ),
      },
      {
        id: "q_writing_d",
        label: lstr("Aucun, c'est seulement parlé", "None, it's only spoken"),
      },
    ],
    correctOptionId: "q_writing_c",
    explanation: lstr(
      "Trois systèmes coexistent dans la même phrase. C'est ce qui rend la langue visuellement unique.",
      "Three systems coexist within the same sentence. That's what makes the language visually unique.",
    ),
  },
  {
    id: "q_hiragana_role",
    prompt: lstr(
      "À quoi servent principalement les hiragana?",
      "What are hiragana primarily used for?",
    ),
    options: [
      {
        id: "q_hiragana_a",
        label: lstr(
          "Aux mots étrangers comme « computer »",
          "Foreign words like \"computer\"",
        ),
      },
      {
        id: "q_hiragana_b",
        label: lstr(
          "Aux mots japonais d'origine et à la grammaire",
          "Native Japanese words and grammar",
        ),
      },
      {
        id: "q_hiragana_c",
        label: lstr("Aux noms scientifiques d'animaux", "Scientific names of animals") },
      {
        id: "q_hiragana_d",
        label: lstr(
          "À remplacer les kanji compliqués dans les journaux",
          "Replacing complicated kanji in newspapers",
        ),
      },
    ],
    correctOptionId: "q_hiragana_b",
    explanation: lstr(
      "Hiragana = mots japonais d'origine + terminaisons grammaticales + particules. Le katakana s'occupe des mots étrangers.",
      "Hiragana = native Japanese words + grammatical endings + particles. Katakana handles foreign words.",
    ),
  },
  {
    id: "q_sov_order",
    prompt: lstr(
      "« 私は寿司を食べます。 » (watashi wa sushi o tabemasu) place le verbe…",
      "\"私は寿司を食べます。\" (watashi wa sushi o tabemasu) places the verb…",
    ),
    options: [
      { id: "q_sov_a", label: lstr("Au début de la phrase", "At the start of the sentence") },
      { id: "q_sov_b", label: lstr("Au milieu, comme en français", "In the middle, like English/French") },
      { id: "q_sov_c", label: lstr("À la fin de la phrase", "At the end of the sentence") },
      { id: "q_sov_d", label: lstr("Nulle part — c'est implicite", "Nowhere — it's implicit") },
    ],
    correctOptionId: "q_sov_c",
    explanation: lstr(
      "Le japonais est SOV : Sujet–Objet–Verbe. Le verbe « 食べます » (tabemasu, manger) ferme la phrase.",
      "Japanese is SOV: Subject–Object–Verb. The verb \"食べます\" (tabemasu, to eat) closes the sentence.",
    ),
  },
  {
    id: "q_thank_you",
    prompt: lstr(
      "Comment dire « merci » poliment à un commerçant à Tokyo?",
      "How do you say \"thank you\" politely to a shopkeeper in Tokyo?",
    ),
    options: [
      { id: "q_thanks_a", label: lstr("« arigatō »", "\"arigatō\"") },
      {
        id: "q_thanks_b",
        label: lstr(
          "« arigatō gozaimasu » (ありがとうございます)",
          "\"arigatō gozaimasu\" (ありがとうございます)",
        ),
      },
      { id: "q_thanks_c", label: lstr("« sumimasen ne »", "\"sumimasen ne\"") },
      { id: "q_thanks_d", label: lstr("« domo domo »", "\"domo domo\"") },
    ],
    correctOptionId: "q_thanks_b",
    explanation: lstr(
      "Avec un inconnu / un commerçant, on utilise la version polie complète. « arigatō » seul est plus familier.",
      "With strangers / shopkeepers, use the full polite version. Plain \"arigatō\" is more casual.",
    ),
  },
  {
    id: "q_tipping",
    prompt: lstr(
      "Au restaurant à Kyoto, le serveur dépose l'addition. Tu fais quoi?",
      "At a restaurant in Kyoto, the waiter brings the bill. What do you do?",
    ),
    options: [
      {
        id: "q_tip_a",
        label: lstr(
          "Tu laisses 15 % de pourboire comme au Québec",
          "You leave a 15% tip like in Quebec",
        ),
      },
      {
        id: "q_tip_b",
        label: lstr(
          "Tu paies le montant exact, sans pourboire",
          "You pay the exact amount, no tip",
        ),
      },
      {
        id: "q_tip_c",
        label: lstr("Tu glisses un billet sur la table", "You slip a bill on the table"),
      },
      { id: "q_tip_d", label: lstr("Tu marchandes", "You haggle") },
    ],
    correctOptionId: "q_tip_b",
    explanation: lstr(
      "Pas de pourboire au Japon. Le service est inclus. Un pourboire peut même mettre la personne mal à l'aise.",
      "No tipping in Japan. Service is included. A tip can even make the staff uncomfortable.",
    ),
  },
  {
    id: "q_indirect_no",
    prompt: lstr(
      "Un collègue te répond « ちょっと… » (chotto…) avec un sourire gêné. Cela veut probablement dire…",
      "A coworker answers \"ちょっと…\" (chotto…) with an awkward smile. That probably means…",
    ),
    options: [
      { id: "q_chotto_a", label: lstr("« Oui, sans problème. »", "\"Yes, no problem.\"") },
      {
        id: "q_chotto_b",
        label: lstr(
          "« C'est délicat / non, mais poliment. »",
          "\"It's delicate / no, but politely.\"",
        ),
      },
      { id: "q_chotto_c", label: lstr("« Je n'ai pas entendu. »", "\"I didn't hear you.\"") },
      { id: "q_chotto_d", label: lstr("« Tais-toi. »", "\"Be quiet.\"") },
    ],
    correctOptionId: "q_chotto_b",
    explanation: lstr(
      "Au Japon, le « non » est rarement direct. « Chotto… » + silence + sourire gêné = refus poli. Insister est mal vu.",
      "In Japan, \"no\" is rarely direct. \"Chotto…\" + silence + awkward smile = polite refusal. Insisting is rude.",
    ),
  },
  {
    id: "q_jlpt",
    prompt: lstr(
      "Le JLPT N1, c'est…",
      "What is JLPT N1?",
    ),
    options: [
      {
        id: "q_jlpt_a",
        label: lstr(
          "Le niveau « parfait natif »",
          "\"Perfect native\" level",
        ),
      },
      {
        id: "q_jlpt_b",
        label: lstr(
          "Une littératie avancée / compréhension de niveau professionnel",
          "Advanced literacy / professional-level comprehension",
        ),
      },
      {
        id: "q_jlpt_c",
        label: lstr(
          "Le niveau requis pour commander un café",
          "The level needed to order a coffee",
        ),
      },
      {
        id: "q_jlpt_d",
        label: lstr(
          "Le premier examen, le plus facile",
          "The first exam, the easiest one",
        ),
      },
    ],
    correctOptionId: "q_jlpt_b",
    explanation: lstr(
      "Le N1 atteste d'une littératie avancée et d'une compréhension professionnelle. Ce n'est pas la même chose que « parler comme un natif ». Pour voyager ou tenir une conversation simple, on n'a pas besoin du N1.",
      "N1 attests to advanced literacy and professional-level comprehension. That's not the same as \"sounding native.\" You don't need N1 to travel or hold a simple conversation.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 9) Flashcards — 6 grouped decks
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
    title: lstr("La langue dans le monde", "Language in the world"),
    description: lstr(
      "Le vocabulaire pour parler du japonais et des langues en général.",
      "Vocabulary to talk about Japanese and languages in general.",
    ),
    cards: [
      {
        id: "card_sekai",
        front: "世界",
        back: lstr("le monde (sekai)", "the world (sekai)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_gengo",
        front: "言語",
        back: lstr("la langue / le langage (gengo)", "language (gengo)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_hanasu",
        front: "話す",
        back: lstr("parler (hanasu)", "to speak (hanasu)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_kuni",
        front: "国",
        back: lstr("le pays (kuni)", "the country (kuni)"),
        tag: lstr("Monde", "World"),
      },
      {
        id: "card_nihon",
        front: "日本",
        back: lstr("le Japon (Nihon / Nippon)", "Japan (Nihon / Nippon)"),
        tag: lstr("Monde", "World"),
      },
    ],
  },
  {
    id: "deck_writing",
    title: lstr("Systèmes d'écriture", "Writing systems"),
    description: lstr(
      "Le vocabulaire pour parler de l'écriture japonaise.",
      "Vocabulary to talk about Japanese writing.",
    ),
    cards: [
      {
        id: "card_hiragana",
        front: "ひらがな",
        back: lstr(
          "syllabaire phonétique japonais (hiragana)",
          "Japanese phonetic syllabary (hiragana)",
        ),
        hint: lstr(
          "Premier système à apprendre. ~46 caractères de base.",
          "First system to learn. ~46 base characters.",
        ),
        tag: lstr("Écriture", "Writing"),
      },
      {
        id: "card_katakana",
        front: "カタカナ",
        back: lstr(
          "syllabaire pour mots étrangers (katakana)",
          "syllabary for foreign words (katakana)",
        ),
        tag: lstr("Écriture", "Writing"),
      },
      {
        id: "card_kanji",
        front: "漢字",
        back: lstr(
          "caractères d'origine chinoise (kanji)",
          "Chinese-origin characters (kanji)",
        ),
        tag: lstr("Écriture", "Writing"),
      },
      {
        id: "card_moji",
        front: "文字",
        back: lstr("caractère / lettre (moji)", "character / letter (moji)"),
        tag: lstr("Écriture", "Writing"),
      },
      {
        id: "card_kaku",
        front: "書く",
        back: lstr("écrire (kaku)", "to write (kaku)"),
        tag: lstr("Écriture", "Writing"),
      },
      {
        id: "card_yomu",
        front: "読む",
        back: lstr("lire (yomu)", "to read (yomu)"),
        tag: lstr("Écriture", "Writing"),
      },
    ],
  },
  {
    id: "deck_politeness",
    title: lstr("Politesse essentielle", "Core politeness"),
    description: lstr(
      "Le kit de survie pour les premiers échanges polis.",
      "The survival kit for first polite exchanges.",
    ),
    cards: [
      {
        id: "card_arigatou",
        front: "ありがとうございます",
        back: lstr(
          "Merci. (poli — arigatō gozaimasu)",
          "Thank you. (polite — arigatō gozaimasu)",
        ),
        tag: lstr("Politesse", "Politeness"),
      },
      {
        id: "card_sumimasen",
        front: "すみません",
        back: lstr(
          "Excusez-moi / pardon. (sumimasen)",
          "Excuse me / sorry. (sumimasen)",
        ),
        hint: lstr(
          "Sert aussi à attirer l'attention d'un serveur.",
          "Also used to get a waiter's attention.",
        ),
        tag: lstr("Politesse", "Politeness"),
      },
      {
        id: "card_onegai",
        front: "お願いします",
        back: lstr(
          "S'il vous plaît. (onegai shimasu)",
          "Please. (onegai shimasu)",
        ),
        tag: lstr("Politesse", "Politeness"),
      },
      {
        id: "card_dou_itashimashite",
        front: "どういたしまして",
        back: lstr(
          "De rien. (dō itashimashite)",
          "You're welcome. (dō itashimashite)",
        ),
        tag: lstr("Politesse", "Politeness"),
      },
      {
        id: "card_hai",
        front: "はい",
        back: lstr("Oui. (hai)", "Yes. (hai)"),
        tag: lstr("Politesse", "Politeness"),
      },
      {
        id: "card_iie",
        front: "いいえ",
        back: lstr("Non. (iie)", "No. (iie)"),
        tag: lstr("Politesse", "Politeness"),
      },
    ],
  },
  {
    id: "deck_introductions",
    title: lstr("Se présenter", "Introductions"),
    description: lstr(
      "Les phrases pour ouvrir une rencontre.",
      "Phrases to open a meeting.",
    ),
    cards: [
      {
        id: "card_youkoso",
        front: "ようこそ",
        back: lstr("Bienvenue. (yōkoso)", "Welcome. (yōkoso)"),
        tag: lstr("Présentations", "Introductions"),
      },
      {
        id: "card_konnichiwa",
        front: "こんにちは",
        back: lstr(
          "Bonjour. (konnichiwa)",
          "Hello. (konnichiwa)",
        ),
        tag: lstr("Présentations", "Introductions"),
      },
      {
        id: "card_konbanwa",
        front: "こんばんは",
        back: lstr("Bonsoir. (konbanwa)", "Good evening. (konbanwa)"),
        tag: lstr("Présentations", "Introductions"),
      },
      {
        id: "card_hajimemashite",
        front: "はじめまして",
        back: lstr(
          "Enchanté(e). (hajimemashite)",
          "Nice to meet you. (hajimemashite)",
        ),
        tag: lstr("Présentations", "Introductions"),
      },
      {
        id: "card_desu",
        front: "です",
        back: lstr(
          "« être » poli (copule — desu)",
          "polite \"to be\" (copula — desu)",
        ),
        tag: lstr("Présentations", "Introductions"),
      },
      {
        id: "card_yoroshiku",
        front: "よろしくお願いします",
        back: lstr(
          "Je compte sur votre bienveillance. (yoroshiku onegai shimasu)",
          "Please treat me kindly. (yoroshiku onegai shimasu)",
        ),
        tag: lstr("Présentations", "Introductions"),
      },
    ],
  },
  {
    id: "deck_leaving",
    title: lstr("Partir", "Leaving"),
    description: lstr(
      "Les phrases pour clore poliment une rencontre.",
      "Phrases to close an exchange politely.",
    ),
    cards: [
      {
        id: "card_sayounara",
        front: "さようなら",
        back: lstr("Au revoir. (sayōnara)", "Goodbye. (sayōnara)"),
        tag: lstr("Partir", "Leaving"),
      },
      {
        id: "card_mata_ashita",
        front: "また明日",
        back: lstr(
          "À demain. (mata ashita)",
          "See you tomorrow. (mata ashita)",
        ),
        tag: lstr("Partir", "Leaving"),
      },
      {
        id: "card_jaa_ne",
        front: "じゃあね",
        back: lstr(
          "Salut ! (familier — jaa ne)",
          "See ya! (casual — jaa ne)",
        ),
        tag: lstr("Partir", "Leaving"),
      },
      {
        id: "card_shitsurei",
        front: "失礼します",
        back: lstr(
          "Je vous prie de m'excuser. (formel — shitsurei shimasu)",
          "Please excuse me. (formal — shitsurei shimasu)",
        ),
        tag: lstr("Partir", "Leaving"),
      },
      {
        id: "card_oyasumi",
        front: "おやすみなさい",
        back: lstr(
          "Bonne nuit. (oyasumi nasai)",
          "Good night. (oyasumi nasai)",
        ),
        tag: lstr("Partir", "Leaving"),
      },
      {
        id: "card_omedetou",
        front: "おめでとう",
        back: lstr(
          "Félicitations. (omedetō)",
          "Congratulations. (omedetō)",
        ),
        tag: lstr("Partir", "Leaving"),
      },
    ],
  },
  {
    id: "deck_grammar",
    title: lstr("Concepts grammaticaux", "Grammar concepts"),
    description: lstr(
      "Les mots pour parler de la structure de la langue.",
      "The words to talk about the structure of the language.",
    ),
    cards: [
      {
        id: "card_kotoba",
        front: "言葉",
        back: lstr("le mot / la parole (kotoba)", "word / speech (kotoba)"),
        tag: lstr("Grammaire", "Grammar"),
      },
      {
        id: "card_bunpou",
        front: "文法",
        back: lstr("la grammaire (bunpō)", "grammar (bunpō)"),
        tag: lstr("Grammaire", "Grammar"),
      },
      {
        id: "card_doushi",
        front: "動詞",
        back: lstr("le verbe (dōshi)", "verb (dōshi)"),
        tag: lstr("Grammaire", "Grammar"),
      },
      {
        id: "card_meishi",
        front: "名詞",
        back: lstr("le nom / substantif (meishi)", "noun (meishi)"),
        tag: lstr("Grammaire", "Grammar"),
      },
      {
        id: "card_rekishi",
        front: "歴史",
        back: lstr("l'histoire (rekishi)", "history (rekishi)"),
        tag: lstr("Grammaire", "Grammar"),
      },
    ],
  },
];

const allFlashcards: YoFlashcard[] = flashcardGroups.flatMap(
  (group) => group.cards,
);

// ─────────────────────────────────────────────────────────────────────
// 10) Teacher CTA copy
// ─────────────────────────────────────────────────────────────────────

const teacherBody: YoLocalizedString = lstr(
  "Tu viens de poser des bases solides. La prochaine étape, c'est de PARLER avec quelqu'un — répéter une phrase, se faire reprendre doucement, comprendre une réaction. Les profs Pratiqo de japonais peuvent t'accompagner à ton rythme, du voyage à l'objectif sérieux. Pas de panique sur les kanji, pas de fausse promesse de fluidité express — juste de la pratique réelle, dans la durée.",
  "You just laid down solid foundations. The next step is to SPEAK with someone — repeat a sentence, be gently corrected, understand a reaction. Pratiqo Japanese teachers can support you at your pace, from travel to serious goals. No kanji panic, no fake \"fluent fast\" promise — just real practice, sustained over time.",
);

const teacherCta: YoLocalizedString = lstr(
  "Trouver un prof de japonais",
  "Find a Japanese teacher",
);

// ─────────────────────────────────────────────────────────────────────
// Module-level export
// ─────────────────────────────────────────────────────────────────────

export interface JapaneseIntroData {
  welcomeIntro: YoLocalizedString;
  welcomeContract: YoLocalizedString;
  numbersLeadIn: YoLocalizedString;
  japaneseStats: JapaneseStat[];
  numbersTakeaway: YoLocalizedString;
  originIntro: YoLocalizedString;
  originPoints: OriginPoint[];
  writingIntro: YoLocalizedString;
  writingSystems: WritingSystem[];
  romajiNote: YoLocalizedString;
  writingTakeaway: YoLocalizedString;
  soundIntro: YoLocalizedString;
  soundPoints: SoundOrGrammarPoint[];
  soundTakeaway: YoLocalizedString;
  politenessIntro: YoLocalizedString;
  politenessPhrases: PolitenessPhrase[];
  politenessGroupLabels: Record<PolitenessPhrase["group"], YoLocalizedString>;
  cultureIntro: YoLocalizedString;
  culturalCodes: CulturalCode[];
  quizQuestions: YoQuizQuestion[];
  flashcardGroups: FlashcardGroup[];
  flashcards: YoFlashcard[];
  teacherBody: YoLocalizedString;
  teacherCta: YoLocalizedString;
}

export const japaneseIntro: JapaneseIntroData = {
  welcomeIntro,
  welcomeContract,
  numbersLeadIn,
  japaneseStats,
  numbersTakeaway,
  originIntro,
  originPoints,
  writingIntro,
  writingSystems,
  romajiNote,
  writingTakeaway,
  soundIntro,
  soundPoints,
  soundTakeaway,
  politenessIntro,
  politenessPhrases,
  politenessGroupLabels,
  cultureIntro,
  culturalCodes,
  quizQuestions,
  flashcardGroups,
  flashcards: allFlashcards,
  teacherBody,
  teacherCta,
};
