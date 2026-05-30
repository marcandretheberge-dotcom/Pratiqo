/**
 * YoPratiqo — Français · Intro: Moving to Quebec (pre-arrival)
 *
 * Hardcoded content for `/yo/langues/francais-quebec/intro`. A
 * launch-safe, English-first orientation module for international
 * learners considering moving to Quebec.
 *
 * Tone contract:
 *   - Welcoming, premium, practical, honest.
 *   - NOT "French from France" — Quebec French / francisation.
 *   - No fear language ("second-class citizen"), no health-myth
 *     pseudo-advice ("vitamin D supplements not optional"), no
 *     immigration-law promises.
 *   - Bill 96 / French language reality kept factual and practical.
 *   - Immigration-level guidance carries an explicit
 *     verify-official-sources disclaimer.
 *
 * Bilingual contract (mirrors lib/yo/spanishIntroA1.ts):
 *   - every learner-language string carries both EN and FR via
 *     `lstr(fr, en)` — EN is the default surface for this module
 *     because the audience is international (pre-arrival).
 *   - Quebec-French target words/phrases are plain strings so they
 *     keep `lang="fr-CA"` for accessibility and TTS.
 *
 * Audio metadata: every vocabulary item carries `audioUrl: null`,
 * matching the existing `YoVocabularyItem` shape, so a future PR
 * that wires a `quebec_french` accent profile into the audio
 * pipeline can populate it without changing this file's structure.
 *
 * No Supabase, no Stripe, no payment math, no migrations. This
 * file is the single source of truth consumed by the intro page.
 */

import { lstr } from "@/lib/yo/localize";
import type {
  YoFlashcard,
  YoLocalizedString,
  YoQuizQuestion,
  YoVocabularyItem,
} from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────
// 1) Welcome to Quebec French
// ─────────────────────────────────────────────────────────────────────

const welcomeIntro: YoLocalizedString = lstr(
  "Bienvenue. Tu envisages de vivre, étudier ou travailler au Québec ? Ce mini-cours gratuit te donne les premiers réflexes du français québécois — la version du français qu’on entend vraiment dans la rue, au travail et à l’épicerie.",
  "Welcome. Thinking about living, studying, or working in Quebec? This free mini-course gives you the first reflexes of Quebec French — the version of French you'll actually hear in the street, at work, and at the grocery store.",
);

const welcomePromise: YoLocalizedString = lstr(
  "Ce n’est pas le « français de Paris ». C’est le français du Québec : un français nord-américain, vivant, avec ses propres mots et son propre rythme. Tu n’as pas besoin d’être parfait pour commencer — quelques mots bien choisis font une vraie différence dès la première semaine.",
  "This isn't \"French from Paris.\" It's Quebec French: a North-American French, alive, with its own words and rhythm. You don't need to be perfect to begin — a handful of well-chosen words make a real difference in your first week.",
);

const officialLanguageNote: YoLocalizedString = lstr(
  "Le français est la langue officielle et commune du Québec. En pratique, ça veut dire que les services publics, le travail, l’école et la paperasse se passent souvent d’abord en français. Tu n’as pas besoin d’un français parfait pour commencer — apprendre le français québécois tôt rend la vie quotidienne beaucoup plus facile.",
  "French is the official and common language of Quebec. In practice, this means public services, work, school, and paperwork often happen primarily in French. You don't need perfect French to begin, but learning Quebec French early makes daily life much easier.",
);

// ─────────────────────────────────────────────────────────────────────
// 2) Quebec French vs France French
// ─────────────────────────────────────────────────────────────────────

interface QcVsFrRow {
  id: string;
  concept: YoLocalizedString;
  quebec: string;
  france: string;
  note?: YoLocalizedString;
}

const qcVsFrIntro: YoLocalizedString = lstr(
  "Les deux variétés sont compréhensibles entre elles, mais quelques mots du quotidien diffèrent. Voici les plus utiles à reconnaître dès le départ.",
  "Both varieties understand each other, but a few everyday words differ. Here are the most useful ones to recognise from day one.",
);

const qcVsFrTable: QcVsFrRow[] = [
  {
    id: "qcvfr_car",
    concept: lstr("Voiture", "Car"),
    quebec: "un char / une auto",
    france: "une voiture",
    note: lstr(
      "« Un char » est très informel mais omniprésent au Québec.",
      "“Un char” is very informal but heard everywhere in Quebec.",
    ),
  },
  {
    id: "qcvfr_job",
    concept: lstr("Travail / emploi", "Job"),
    quebec: "la job / un emploi",
    france: "le boulot / le travail",
  },
  {
    id: "qcvfr_cold",
    concept: lstr("Froid", "Cold"),
    quebec: "frette",
    france: "froid",
    note: lstr(
      "« Frette » = vraiment froid, façon hiver québécois.",
      "“Frette” = really cold, Quebec-winter style.",
    ),
  },
  {
    id: "qcvfr_weekend",
    concept: lstr("Week-end", "Weekend"),
    quebec: "la fin de semaine",
    france: "le week-end",
  },
  {
    id: "qcvfr_breakfast",
    concept: lstr("Petit-déjeuner", "Breakfast"),
    quebec: "le déjeuner",
    france: "le petit-déjeuner",
  },
  {
    id: "qcvfr_lunch",
    concept: lstr("Déjeuner (midi)", "Lunch (midday)"),
    quebec: "le dîner",
    france: "le déjeuner",
  },
  {
    id: "qcvfr_dinner",
    concept: lstr("Dîner / souper du soir", "Dinner (evening)"),
    quebec: "le souper",
    france: "le dîner",
  },
  {
    id: "qcvfr_partner_m",
    concept: lstr("Petit ami", "Boyfriend"),
    quebec: "mon chum",
    france: "mon copain",
  },
  {
    id: "qcvfr_partner_f",
    concept: lstr("Petite amie", "Girlfriend"),
    quebec: "ma blonde",
    france: "ma copine",
  },
  {
    id: "qcvfr_youwelcome",
    concept: lstr("« De rien »", "“You're welcome”"),
    quebec: "Bienvenue",
    france: "De rien",
    note: lstr(
      "« Bienvenue » sert AUSSI à répondre à un « merci » au Québec.",
      "In Quebec, “Bienvenue” is ALSO used to reply to “thank you.”",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 3) First survival words
// ─────────────────────────────────────────────────────────────────────

interface SurvivalWord extends YoVocabularyItem {
  /** Optional usage hint shown below the gloss. */
  hint?: YoLocalizedString;
  /** BCP-47 voice hint for the pronunciation button. */
  speechLang?: string;
  /** Stable id for keying. */
  id: string;
}

const survivalWords: SurvivalWord[] = [
  {
    id: "sw_quebec",
    target: "le Québec",
    translation: lstr("le Québec", "Quebec (the province)"),
    hint: lstr(
      "Toujours masculin. « Au Québec » pour la province, « à Québec » pour la ville.",
      "Always masculine. “Au Québec” = the province, “à Québec” = Quebec City.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_francophone",
    target: "francophone",
    translation: lstr("francophone", "French-speaking person"),
    hint: lstr(
      "Quelqu’un dont la première langue est le français.",
      "Someone whose first language is French.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_bienvenue",
    target: "Bienvenue",
    translation: lstr("Bienvenue / De rien", "Welcome / You're welcome"),
    hint: lstr(
      "Au Québec, « Bienvenue » répond aussi à un « Merci ».",
      "In Quebec, “Bienvenue” also replies to “Thank you.”",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_salut",
    target: "Salut",
    translation: lstr("Salut", "Hi / Bye (informal)"),
    hint: lstr(
      "Sert à dire bonjour ET au revoir, en contexte décontracté.",
      "Used for both hello AND goodbye, in casual settings.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_cavatu",
    target: "Ça va-tu ?",
    translation: lstr(
      "Ça va ? (forme interrogative québécoise)",
      "How's it going? (Quebec interrogative form)",
    ),
    hint: lstr(
      "Le « -tu » est une particule interrogative typique du parler québécois — pas un « tu ».",
      "The “-tu” is a Quebec interrogative particle — it's not the pronoun “you.”",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_paspire",
    target: "Pas pire",
    translation: lstr("Pas mal / Plutôt bien", "Not bad / Pretty good"),
    hint: lstr(
      "Réponse classique à « Ça va-tu ? ».",
      "Classic reply to “Ça va-tu?”",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_unchar",
    target: "un char",
    translation: lstr("une voiture (informel)", "a car (informal)"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_lajob",
    target: "la job",
    translation: lstr("le travail (informel)", "the job (informal)"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_frette",
    target: "frette",
    translation: lstr(
      "très froid (registre familier)",
      "very cold (familiar register)",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_findesemaine",
    target: "la fin de semaine",
    translation: lstr("le week-end", "the weekend"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_dejeuner",
    target: "le déjeuner",
    translation: lstr("le petit-déjeuner", "breakfast"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_diner",
    target: "le dîner",
    translation: lstr("le repas du midi", "midday meal (lunch)"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_souper",
    target: "le souper",
    translation: lstr("le repas du soir", "evening meal (dinner)"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_chum",
    target: "mon chum",
    translation: lstr("mon copain / mon ami proche", "my boyfriend / close male friend"),
    hint: lstr(
      "Selon le contexte : partenaire amoureux OU bon ami.",
      "Depending on context: romantic partner OR close friend.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_blonde",
    target: "ma blonde",
    translation: lstr("ma copine", "my girlfriend"),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_tuque",
    target: "la tuque",
    translation: lstr(
      "le bonnet d’hiver (en laine ou tricoté)",
      "winter knit hat",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_mitaines",
    target: "les mitaines",
    translation: lstr(
      "les moufles (mais sans pouce séparé pour les autres doigts)",
      "mittens (warmer than gloves)",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_ramq",
    target: "la RAMQ",
    translation: lstr(
      "Régie de l’assurance maladie du Québec",
      "Quebec Health Insurance Board",
    ),
    hint: lstr(
      "L’organisme public qui gère l’assurance maladie québécoise.",
      "The public agency that runs Quebec health insurance.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
  {
    id: "sw_cartesoleil",
    target: "la carte soleil",
    translation: lstr(
      "la carte d’assurance maladie du Québec",
      "your Quebec health insurance card",
    ),
    hint: lstr(
      "Surnommée « carte soleil » à cause du soleil stylisé sur la carte.",
      "Nicknamed the “sun card” after the stylised sun on it.",
    ),
    audioUrl: null,
    speechLang: "fr-CA",
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4) Quebec in 3 minutes
// ─────────────────────────────────────────────────────────────────────

interface QuebecQuickStat {
  id: string;
  value: YoLocalizedString;
  label: YoLocalizedString;
}

const quebecQuickStats: QuebecQuickStat[] = [
  {
    id: "qstat_population",
    value: lstr("8,7 M+", "8.7 M+"),
    label: lstr("habitants au Québec", "people live in Quebec"),
  },
  {
    id: "qstat_french",
    value: lstr("~80 %", "~80%"),
    label: lstr(
      "ont le français comme langue d’usage",
      "use French as their everyday language",
    ),
  },
  {
    id: "qstat_official",
    value: lstr("1", "1"),
    label: lstr(
      "langue officielle et commune : le français",
      "official and common language: French",
    ),
  },
  {
    id: "qstat_capitals",
    value: lstr("2", "2"),
    label: lstr(
      "métropoles : Montréal et Québec",
      "main cities: Montréal and Quebec City",
    ),
  },
];

interface QuebecFact {
  id: string;
  title: YoLocalizedString;
  body: YoLocalizedString;
}

const quebecFacts: QuebecFact[] = [
  {
    id: "qfact_geography",
    title: lstr("Une province, deux ambiances", "One province, two vibes"),
    body: lstr(
      "Montréal est la métropole multilingue, créative et la plus diverse. Québec, la capitale, garde un coeur historique francophone et un rythme plus calme. Entre les deux, des régions, des forêts et un fleuve immense — le Saint-Laurent.",
      "Montréal is the multilingual, creative metropolis — the most diverse city. Quebec City, the capital, keeps a historic French-speaking heart and a calmer pace. Between them: regions, forests, and a huge river — the Saint Lawrence.",
    ),
  },
  {
    id: "qfact_seasons",
    title: lstr("Quatre saisons franches", "Four sharp seasons"),
    body: lstr(
      "Étés chauds, hivers froids et neigeux, automnes spectaculaires, printemps boueux. Le climat fait partie du quotidien : des bottes d’hiver et un manteau chaud sont des outils, pas un détail.",
      "Hot summers, cold snowy winters, spectacular autumns, muddy springs. Weather is part of daily life: winter boots and a warm coat are tools, not a detail.",
    ),
  },
  {
    id: "qfact_culture",
    title: lstr("Une identité culturelle distincte", "A distinct cultural identity"),
    body: lstr(
      "Une scène musicale, télévisuelle et littéraire propre, qu’on ne trouve nulle part ailleurs. La fête nationale (24 juin) célèbre la Saint-Jean-Baptiste — c’est le « 4 juillet » québécois.",
      "A music, TV, and literary scene found nowhere else. The national holiday (June 24) celebrates Saint-Jean-Baptiste — it's Quebec's “4th of July.”",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 5) Language levels (CEFR · CLB/NCLC · Échelle québécoise)
// ─────────────────────────────────────────────────────────────────────

interface LanguageScale {
  id: string;
  scaleName: YoLocalizedString;
  scope: YoLocalizedString;
  levels: YoLocalizedString;
  usedFor: YoLocalizedString;
}

const languageScales: LanguageScale[] = [
  {
    id: "scale_cefr",
    scaleName: lstr("CECR", "CEFR"),
    scope: lstr(
      "Cadre européen commun de référence",
      "Common European Framework of Reference",
    ),
    levels: lstr(
      "A1 · A2 · B1 · B2 · C1 · C2",
      "A1 · A2 · B1 · B2 · C1 · C2",
    ),
    usedFor: lstr(
      "Référence internationale pour la majorité des cours et examens de langue (DELF, DALF, IELTS, etc.).",
      "International reference for most language courses and exams (DELF, DALF, IELTS, etc.).",
    ),
  },
  {
    id: "scale_clb",
    scaleName: lstr("NCLC / CLB", "CLB / NCLC"),
    scope: lstr(
      "Niveaux de compétence linguistique canadiens (NCLC en français, CLB en anglais)",
      "Canadian Language Benchmarks (CLB in English, NCLC in French)",
    ),
    levels: lstr(
      "1 à 12 · 4 habiletés (écouter, parler, lire, écrire)",
      "1 to 12 · 4 skills (listening, speaking, reading, writing)",
    ),
    usedFor: lstr(
      "Souvent utilisé par les programmes d’immigration fédéraux. Les exigences varient selon le programme et peuvent changer.",
      "Often used by federal immigration programs. Requirements vary by program and can change.",
    ),
  },
  {
    id: "scale_eq",
    scaleName: lstr("Échelle québécoise", "Échelle québécoise"),
    scope: lstr(
      "Échelle québécoise des niveaux de compétence en français des personnes immigrantes adultes",
      "Quebec scale of French proficiency levels for adult immigrants",
    ),
    levels: lstr(
      "1 à 12 · regroupés en niveaux débutant, intermédiaire, avancé",
      "1 to 12 · grouped into beginner, intermediate, and advanced bands",
    ),
    usedFor: lstr(
      "Utilisée pour les cours de francisation et les programmes québécois. Les exigences peuvent varier selon le programme et changer.",
      "Used for francisation classes and Quebec-specific programs. Requirements can vary by program and change.",
    ),
  },
];

const languageLevelsLeadIn: YoLocalizedString = lstr(
  "Trois échelles cohabitent. Tu n’as pas à toutes les maîtriser — tu as juste à savoir laquelle s’applique à ton programme.",
  "Three scales coexist. You don't need to master all three — you just need to know which one applies to your program.",
);

const officialSourcesDisclaimer: YoLocalizedString = lstr(
  "Avis : les exigences linguistiques pour l’immigration, l’admission scolaire et la résidence varient selon le programme et peuvent changer. Vérifie toujours les sources officielles (Canada.ca, Québec.ca, Ministère de l’Immigration, de la Francisation et de l’Intégration, IRCC) avant de prendre une décision.",
  "Heads-up: language requirements for immigration, school admission, and residency vary by program and can change. Always verify with official sources (Canada.ca, Québec.ca, Ministère de l'Immigration, de la Francisation et de l'Intégration, IRCC) before making a decision.",
);

// ─────────────────────────────────────────────────────────────────────
// 6) Culture survival kit
// ─────────────────────────────────────────────────────────────────────

interface SurvivalTip {
  id: string;
  iconHint:
    | "greeting"
    | "money"
    | "food"
    | "transit"
    | "winter"
    | "language"
    | "calendar"
    | "health";
  title: YoLocalizedString;
  body: YoLocalizedString;
}

const survivalKit: SurvivalTip[] = [
  {
    id: "kit_greetings",
    iconHint: "greeting",
    title: lstr("Bonjour, merci, s’il vous plaît", "Bonjour, merci, s'il vous plaît"),
    body: lstr(
      "Saluer en français à l’entrée d’un commerce est attendu. « Bonjour ! » suivi d’un sourire ouvre presque toutes les portes, même si tu enchaînes en anglais après.",
      "Greeting in French when you walk into a shop is expected. “Bonjour!” + a smile opens almost every door, even if you switch to English after.",
    ),
  },
  {
    id: "kit_tu_vous",
    iconHint: "language",
    title: lstr("Tutoyer ou vouvoyer ?", "“Tu” or “vous”?"),
    body: lstr(
      "Au Québec, le « tu » est plus courant entre adultes que dans plusieurs autres régions francophones. En contexte professionnel formel, le « vous » reste poli et bienvenu.",
      "In Quebec, “tu” is more common between adults than in many other French-speaking regions. In formal professional settings, “vous” still reads as polite and welcome.",
    ),
  },
  {
    id: "kit_health",
    iconHint: "health",
    title: lstr("La carte soleil et la RAMQ", "La carte soleil and RAMQ"),
    body: lstr(
      "Une fois résident, tu t’inscris à la RAMQ et tu reçois ta carte soleil. C’est elle qu’on demande à l’hôpital, à la clinique et chez le pharmacien.",
      "Once you're a resident, you register with RAMQ and receive your carte soleil. That's the card you'll show at hospitals, clinics, and pharmacies.",
    ),
  },
  {
    id: "kit_winter",
    iconHint: "winter",
    title: lstr("L’hiver est un sport", "Winter is a sport"),
    body: lstr(
      "Tuque, mitaines, manteau chaud, bottes d’hiver : ce sont des outils de tous les jours, pas des accessoires de mode. Habille-toi en couches.",
      "Tuque, mittens, warm coat, winter boots: these are everyday tools, not fashion accessories. Dress in layers.",
    ),
  },
  {
    id: "kit_money",
    iconHint: "money",
    title: lstr("Pourboires et taxes", "Tipping and taxes"),
    body: lstr(
      "Les prix affichés ne contiennent souvent pas les taxes (~15 %). Au restaurant, on laisse environ 15–20 % de pourboire sur le montant avant taxes.",
      "Posted prices often don't include taxes (~15%). In restaurants, you tip about 15–20% on the pre-tax total.",
    ),
  },
  {
    id: "kit_transit",
    iconHint: "transit",
    title: lstr("Transports publics", "Public transit"),
    body: lstr(
      "Métro et autobus à Montréal (STM), réseau d’autobus à Québec (RTC). La carte OPUS sert pour la plupart des titres de transport en commun.",
      "Metro and buses in Montréal (STM), buses in Quebec City (RTC). The OPUS card works for most transit passes.",
    ),
  },
  {
    id: "kit_meals",
    iconHint: "food",
    title: lstr("L’ordre des repas", "The order of meals"),
    body: lstr(
      "Au Québec, on déjeune le matin, on dîne le midi et on soupe le soir. Si on t’invite à « souper », c’est pour le repas du soir.",
      "In Quebec, you “déjeune” in the morning, “dîne” at midday, and “soupe” in the evening. If someone invites you to “souper,” that's the evening meal.",
    ),
  },
  {
    id: "kit_holiday",
    iconHint: "calendar",
    title: lstr("Saint-Jean-Baptiste — 24 juin", "Saint-Jean-Baptiste — June 24"),
    body: lstr(
      "Fête nationale du Québec. Concerts, drapeaux et un sentiment d’appartenance fort. Le 1er juillet est, lui, la fête du Canada.",
      "Quebec's national holiday. Concerts, flags, and a strong sense of belonging. July 1 is Canada Day, separately.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 7) Mini quiz
// ─────────────────────────────────────────────────────────────────────

const quizQuestions: YoQuizQuestion[] = [
  {
    id: "q_dejeuner",
    prompt: lstr(
      "Au Québec, « le déjeuner », c’est…",
      "In Quebec, “le déjeuner” means…",
    ),
    options: [
      {
        id: "q_dejeuner_a",
        label: lstr("le repas du matin", "the morning meal"),
      },
      {
        id: "q_dejeuner_b",
        label: lstr("le repas du midi", "the midday meal"),
      },
      {
        id: "q_dejeuner_c",
        label: lstr("le repas du soir", "the evening meal"),
      },
    ],
    correctOptionId: "q_dejeuner_a",
    explanation: lstr(
      "Au Québec : déjeuner (matin), dîner (midi), souper (soir). C’est l’inverse de la France pour le midi et le soir.",
      "In Quebec: déjeuner (morning), dîner (midday), souper (evening). It's flipped vs France for the midday and evening meals.",
    ),
  },
  {
    id: "q_char",
    prompt: lstr(
      "« Un char » dans un contexte québécois courant, c’est…",
      "“Un char” in everyday Quebec usage means…",
    ),
    options: [
      {
        id: "q_char_a",
        label: lstr("un char d’assaut", "a tank (military)"),
      },
      {
        id: "q_char_b",
        label: lstr("une voiture", "a car"),
      },
      {
        id: "q_char_c",
        label: lstr("un chariot d’épicerie", "a shopping cart"),
      },
    ],
    correctOptionId: "q_char_b",
    explanation: lstr(
      "« Un char » est un mot informel très répandu au Québec pour dire « voiture ». À utiliser à l’oral, pas à l’écrit formel.",
      "“Un char” is a very common informal Quebec word for “car.” Use it in speech, not in formal writing.",
    ),
  },
  {
    id: "q_weekend",
    prompt: lstr(
      "Quel mot est typiquement québécois pour « week-end » ?",
      "Which word is typically Quebec for “weekend”?",
    ),
    options: [
      {
        id: "q_weekend_a",
        label: lstr("le week-end", "le week-end"),
      },
      {
        id: "q_weekend_b",
        label: lstr("la fin de semaine", "la fin de semaine"),
      },
      {
        id: "q_weekend_c",
        label: lstr("le congé", "le congé"),
      },
    ],
    correctOptionId: "q_weekend_b",
    explanation: lstr(
      "« La fin de semaine » est l’expression québécoise standard ; « le week-end » se dit aussi mais sonne plus européen.",
      "“La fin de semaine” is the standard Quebec phrase; “le week-end” is heard too but sounds more European.",
    ),
  },
  {
    id: "q_paspire",
    prompt: lstr(
      "« Pas pire » veut dire…",
      "“Pas pire” means…",
    ),
    options: [
      {
        id: "q_paspire_a",
        label: lstr("très mal", "really bad"),
      },
      {
        id: "q_paspire_b",
        label: lstr("pas mal / plutôt bien", "not bad / pretty good"),
      },
      {
        id: "q_paspire_c",
        label: lstr("pire que jamais", "worse than ever"),
      },
    ],
    correctOptionId: "q_paspire_b",
    explanation: lstr(
      "Réponse classique à « Ça va-tu ? ». Littéralement « pas pire », mais ça veut dire « ça va bien ».",
      "A classic reply to “Ça va-tu?” Literally “not worse,” but it means “I'm doing well.”",
    ),
  },
  {
    id: "q_cartesoleil",
    prompt: lstr(
      "« La carte soleil » désigne…",
      "“La carte soleil” refers to…",
    ),
    options: [
      {
        id: "q_cartesoleil_a",
        label: lstr(
          "ta carte de fidélité d’épicerie",
          "your grocery loyalty card",
        ),
      },
      {
        id: "q_cartesoleil_b",
        label: lstr(
          "ta carte d’assurance maladie au Québec",
          "your Quebec health insurance card",
        ),
      },
      {
        id: "q_cartesoleil_c",
        label: lstr(
          "une carte d’embarquement",
          "a boarding pass",
        ),
      },
    ],
    correctOptionId: "q_cartesoleil_b",
    explanation: lstr(
      "Surnommée « carte soleil » à cause du soleil stylisé. Délivrée par la RAMQ (Régie de l’assurance maladie du Québec).",
      "Nicknamed “carte soleil” for the stylised sun on it. Issued by RAMQ (Régie de l'assurance maladie du Québec).",
    ),
  },
  {
    id: "q_frette",
    prompt: lstr(
      "« Il fait frette » signifie…",
      "“Il fait frette” means…",
    ),
    options: [
      {
        id: "q_frette_a",
        label: lstr("il fait chaud", "it's hot"),
      },
      {
        id: "q_frette_b",
        label: lstr("il fait très froid", "it's really cold"),
      },
      {
        id: "q_frette_c",
        label: lstr("il fait gris", "it's overcast"),
      },
    ],
    correctOptionId: "q_frette_b",
    explanation: lstr(
      "« Frette » est une variante familière de « froid », souvent réservée à un froid intense d’hiver québécois.",
      "“Frette” is an informal variant of “froid,” usually saved for the deep cold of a Quebec winter.",
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────
// 8) Flashcards (grouped)
// ─────────────────────────────────────────────────────────────────────

interface FlashcardGroup {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
  cards: YoFlashcard[];
}

const flashcardGroups: FlashcardGroup[] = [
  {
    id: "deck_quebec_identity",
    title: lstr("Identité québécoise", "Quebec identity"),
    description: lstr(
      "Les mots qui ancrent le Québec.",
      "Words that anchor Quebec.",
    ),
    cards: [
      {
        id: "fc_quebec",
        front: "le Québec",
        back: lstr("le Québec", "Quebec (the province)"),
        hint: lstr(
          "« Au Québec » pour la province, « à Québec » pour la ville.",
          "“Au Québec” = the province, “à Québec” = the city.",
        ),
      },
      {
        id: "fc_francophone",
        front: "francophone",
        back: lstr("francophone", "French-speaking person"),
      },
      {
        id: "fc_bienvenue",
        front: "Bienvenue",
        back: lstr("Bienvenue / De rien", "Welcome / You're welcome"),
        hint: lstr(
          "Au Québec, répond aussi à un « merci ».",
          "In Quebec, also replies to “thank you.”",
        ),
        isLocalExpression: true,
      },
    ],
  },
  {
    id: "deck_meals",
    title: lstr("Repas", "Meals"),
    description: lstr(
      "Décalage classique avec la France.",
      "Classic flip from France usage.",
    ),
    cards: [
      {
        id: "fc_dejeuner",
        front: "le déjeuner",
        back: lstr("le petit-déjeuner", "breakfast"),
      },
      {
        id: "fc_diner",
        front: "le dîner",
        back: lstr("le repas du midi", "lunch"),
      },
      {
        id: "fc_souper",
        front: "le souper",
        back: lstr("le repas du soir", "dinner"),
      },
    ],
  },
  {
    id: "deck_daily",
    title: lstr("Mots du quotidien", "Daily Quebec words"),
    description: lstr(
      "Tu vas les entendre chaque semaine.",
      "You'll hear these every week.",
    ),
    cards: [
      {
        id: "fc_unchar",
        front: "un char",
        back: lstr("une voiture (informel)", "a car (informal)"),
        isLocalExpression: true,
      },
      {
        id: "fc_lajob",
        front: "la job",
        back: lstr("le travail", "the job"),
      },
      {
        id: "fc_findesemaine",
        front: "la fin de semaine",
        back: lstr("le week-end", "the weekend"),
      },
    ],
  },
  {
    id: "deck_winter",
    title: lstr("Hiver", "Winter"),
    description: lstr(
      "L’hiver québécois a son propre vocabulaire.",
      "Quebec winter has its own vocabulary.",
    ),
    cards: [
      {
        id: "fc_tuque",
        front: "la tuque",
        back: lstr("le bonnet d’hiver", "winter knit hat"),
        isLocalExpression: true,
      },
      {
        id: "fc_mitaines",
        front: "les mitaines",
        back: lstr("les moufles", "mittens"),
      },
      {
        id: "fc_frette",
        front: "frette",
        back: lstr("très froid (familier)", "very cold (informal)"),
        isLocalExpression: true,
      },
    ],
  },
  {
    id: "deck_bureaucracy",
    title: lstr("Démarches administratives", "Bureaucracy"),
    description: lstr(
      "Tu vas les croiser dès l’arrivée.",
      "You'll meet these on arrival.",
    ),
    cards: [
      {
        id: "fc_ramq",
        front: "la RAMQ",
        back: lstr(
          "Régie de l’assurance maladie du Québec",
          "Quebec Health Insurance Board",
        ),
      },
      {
        id: "fc_cartesoleil",
        front: "la carte soleil",
        back: lstr(
          "carte d’assurance maladie",
          "Quebec health insurance card",
        ),
        hint: lstr(
          "Soleil stylisé sur la carte → le surnom est resté.",
          "Stylised sun on the card → the nickname stuck.",
        ),
        isLocalExpression: true,
      },
    ],
  },
  {
    id: "deck_greetings",
    title: lstr("Salutations & relations", "Greetings & relationships"),
    description: lstr(
      "Le ton informel du quotidien.",
      "The informal tone of daily life.",
    ),
    cards: [
      {
        id: "fc_salut",
        front: "Salut",
        back: lstr("Salut (bonjour / au revoir)", "Hi / Bye (informal)"),
      },
      {
        id: "fc_cavatu",
        front: "Ça va-tu ?",
        back: lstr("Ça va ?", "How's it going?"),
        hint: lstr(
          "Le « -tu » est une particule, pas un pronom.",
          "The “-tu” is a particle, not a pronoun.",
        ),
        isLocalExpression: true,
      },
      {
        id: "fc_paspire",
        front: "Pas pire",
        back: lstr("Pas mal / Bien", "Not bad / Pretty good"),
        isLocalExpression: true,
      },
      {
        id: "fc_chum",
        front: "mon chum",
        back: lstr("mon copain / ami proche", "my boyfriend / close friend"),
      },
      {
        id: "fc_blonde",
        front: "ma blonde",
        back: lstr("ma copine", "my girlfriend"),
      },
    ],
  },
];

// Flat deck for the YoFlashcardPreview component (which expects a
// single YoFlashcard[] array). The grouped structure above drives
// the on-page section labels; the flat array drives the
// interactive deck.
const allFlashcards: YoFlashcard[] = flashcardGroups.flatMap((g) => g.cards);

// ─────────────────────────────────────────────────────────────────────
// Aggregate export
// ─────────────────────────────────────────────────────────────────────

export interface FrenchQuebecIntroData {
  welcomeIntro: YoLocalizedString;
  welcomePromise: YoLocalizedString;
  officialLanguageNote: YoLocalizedString;
  qcVsFrIntro: YoLocalizedString;
  qcVsFrTable: QcVsFrRow[];
  survivalWords: SurvivalWord[];
  quebecQuickStats: QuebecQuickStat[];
  quebecFacts: QuebecFact[];
  languageScales: LanguageScale[];
  languageLevelsLeadIn: YoLocalizedString;
  officialSourcesDisclaimer: YoLocalizedString;
  survivalKit: SurvivalTip[];
  quizQuestions: YoQuizQuestion[];
  flashcardGroups: FlashcardGroup[];
  flashcards: YoFlashcard[];
}

export const frenchQuebecIntro: FrenchQuebecIntroData = {
  welcomeIntro,
  welcomePromise,
  officialLanguageNote,
  qcVsFrIntro,
  qcVsFrTable,
  survivalWords,
  quebecQuickStats,
  quebecFacts,
  languageScales,
  languageLevelsLeadIn,
  officialSourcesDisclaimer,
  survivalKit,
  quizQuestions,
  flashcardGroups,
  flashcards: allFlashcards,
};
