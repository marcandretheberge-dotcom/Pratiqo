import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";
import type { YoPratiqoModuleSlug } from "@/lib/yo/yopratiqoProductConfig";

export type YoPratiqoLandingContent = {
  heroTitle: YoLocalizedString;
  heroSubtitle: YoLocalizedString;
  learnBullets: readonly YoLocalizedString[];
  whyBullets: readonly YoLocalizedString[];
  introCardTitle: YoLocalizedString;
  introCardBody: YoLocalizedString;
  teacherCardTitle: YoLocalizedString;
  teacherCardBody: YoLocalizedString;
  schemaName: string;
  schemaDescription: string;
  teaches: readonly string[];
  about: readonly string[];
};

export const yopratiqoLandingContent = {
  anglais: {
    heroTitle: lstr(
      "Anglais pratique pour débloquer ta confiance.",
      "Practical English to unlock your confidence.",
    ),
    heroSubtitle: lstr(
      "Une intro pensée pour les francophones du Québec et les apprenants canadiens qui veulent mieux parler au travail, en voyage et dans la vraie vie.",
      "An intro for Quebec francophones and Canadian learners who want more confidence at work, while travelling, and in real conversations.",
    ),
    learnBullets: [
      lstr("reprendre confiance dans des phrases simples", "regain confidence with simple phrases"),
      lstr("repérer les faux amis utiles", "spot useful false friends"),
      lstr("comprendre quelques nuances d’anglais canadien", "understand a few Canadian English nuances"),
      lstr("préparer une pratique orale avec un professeur", "prepare for speaking practice with a teacher"),
    ],
    whyBullets: [
      lstr("un parcours autonome avant la pratique réelle", "a self-paced path before real practice"),
      lstr("des situations concrètes au lieu de listes abstraites", "concrete situations instead of abstract lists"),
      lstr("un pont clair vers un professeur Pratiqo", "a clear bridge to a Pratiqo teacher"),
    ],
    introCardTitle: lstr("Commencer l’intro gratuite", "Start the free intro"),
    introCardBody: lstr(
      "Travaille les premiers repères, les phrases utiles et la confiance avant une vraie conversation.",
      "Work on first landmarks, useful phrases, and confidence before a real conversation.",
    ),
    teacherCardTitle: lstr("Pratiquer avec un professeur d’anglais", "Practice with an English teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo English Intro",
    schemaDescription: "A free self-paced English intro connected to teacher practice.",
    teaches: ["English first phrases", "Canadian English context", "speaking confidence"],
    about: ["English learning", "self-paced language preparation"],
  },
  "francais-quebec": {
    heroTitle: lstr(
      "Français québécois et francisation, sans promesses irréalistes.",
      "Quebec French and francization basics, without unrealistic promises.",
    ),
    heroSubtitle: lstr(
      "Comprends les mots du quotidien, les repères culturels, le français local et les bases utiles avant de pratiquer avec un professeur.",
      "Understand daily words, cultural landmarks, local French, and useful basics before practicing with a teacher.",
    ),
    learnBullets: [
      lstr("situer le français québécois dans la vie quotidienne", "place Quebec French in daily life"),
      lstr("reconnaître des mots de travail et de services", "recognize workplace and service words"),
      lstr("comprendre des repères culturels locaux", "understand local cultural landmarks"),
      lstr("préparer des questions pour un professeur", "prepare questions for a teacher"),
    ],
    whyBullets: [
      lstr("une intro culturelle, pas un raccourci administratif", "a cultural intro, not an administrative shortcut"),
      lstr("des exemples pour vivre, étudier ou travailler au Canada", "examples for living, studying, or working in Canada"),
      lstr("un pont vers un vrai professeur de français", "a bridge to a real French teacher"),
    ],
    introCardTitle: lstr("Découvrir l’intro gratuite", "Open the free intro"),
    introCardBody: lstr(
      "Explore les mots essentiels, la culture locale et les premiers repères de francisation.",
      "Explore essential words, local culture, and first francization landmarks.",
    ),
    teacherCardTitle: lstr("Trouver un professeur de français", "Find a French teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Quebec French Intro",
    schemaDescription: "A free self-paced Quebec French intro connected to teacher practice.",
    teaches: ["Quebec French basics", "francization landmarks", "local culture"],
    about: ["Quebec French", "francization preparation"],
  },
  espagnol: {
    heroTitle: lstr(
      "Espagnol pour voyager, comprendre la culture et oser parler.",
      "Spanish for travel, culture, and first real conversations.",
    ),
    heroSubtitle: lstr(
      "Commence par les mots utiles, les sons, les gestes culturels et les situations qui reviennent vraiment en voyage.",
      "Start with useful words, sounds, cultural cues, and situations that actually come up while travelling.",
    ),
    learnBullets: [
      lstr("saluer et te présenter simplement", "greet people and introduce yourself simply"),
      lstr("utiliser des phrases de voyage utiles", "use useful travel phrases"),
      lstr("comprendre la culture derrière la langue", "understand the culture behind the language"),
      lstr("préparer une première conversation guidée", "prepare for a first guided conversation"),
    ],
    whyBullets: [
      lstr("la langue dans son contexte culturel", "language inside its cultural context"),
      lstr("des modules par pays quand ils sont prêts", "country modules when they are ready"),
      lstr("un passage naturel vers la pratique avec professeur", "a natural path toward teacher practice"),
    ],
    introCardTitle: lstr("Commencer l’intro espagnol", "Start the Spanish intro"),
    introCardBody: lstr(
      "Apprends les premiers mots, les sons, les différences régionales et les phrases essentielles.",
      "Learn first words, sounds, regional differences, and essential phrases.",
    ),
    teacherCardTitle: lstr("Trouver un professeur d’espagnol", "Find a Spanish teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Spanish Intro",
    schemaDescription: "A free self-paced Spanish intro connected to teacher practice.",
    teaches: ["Spanish first words", "travel phrases", "cultural context"],
    about: ["Spanish learning", "travel Spanish"],
  },
  japonais: {
    heroTitle: lstr(
      "Japonais sans panique : sons, écritures, politesse et culture.",
      "Japanese without panic: sounds, scripts, politeness, and culture.",
    ),
    heroSubtitle: lstr(
      "Une intro rassurante pour découvrir hiragana, katakana, kanji, les salutations et les codes culturels de base.",
      "A reassuring intro to hiragana, katakana, kanji, greetings, and essential cultural codes.",
    ),
    learnBullets: [
      lstr("distinguer hiragana, katakana et kanji", "tell hiragana, katakana, and kanji apart"),
      lstr("utiliser des salutations polies", "use polite greetings"),
      lstr("comprendre les premiers codes culturels", "understand first cultural codes"),
      lstr("choisir quoi pratiquer avec un professeur", "choose what to practice with a teacher"),
    ],
    whyBullets: [
      lstr("une progression calme pour une langue complexe", "a calm progression for a complex language"),
      lstr("des repères culturels avant la mémorisation", "cultural landmarks before memorization"),
      lstr("un pont vers une pratique orale guidée", "a bridge to guided speaking practice"),
    ],
    introCardTitle: lstr("Entrer dans l’intro japonais", "Enter the Japanese intro"),
    introCardBody: lstr(
      "Découvre les écritures, les salutations, la politesse et les premières phrases utiles.",
      "Discover scripts, greetings, politeness, and first useful phrases.",
    ),
    teacherCardTitle: lstr("Trouver un professeur de japonais", "Find a Japanese teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Japanese Intro",
    schemaDescription: "A free self-paced Japanese intro connected to teacher practice.",
    teaches: ["Japanese first words", "writing systems", "politeness"],
    about: ["Japanese learning", "Japanese culture"],
  },
  italien: {
    heroTitle: lstr(
      "Italien pour voyager, comprendre les régions et parler avec confiance.",
      "Italian for travel, regions, and confident first phrases.",
    ),
    heroSubtitle: lstr(
      "Découvre les premiers mots, la culture, les régions, les gestes utiles et les phrases qui ouvrent une conversation.",
      "Discover first words, culture, regions, useful cues, and phrases that open a conversation.",
    ),
    learnBullets: [
      lstr("saluer et commander simplement", "greet people and order simply"),
      lstr("comprendre quelques repères culturels italiens", "understand a few Italian cultural landmarks"),
      lstr("situer les régions et les accents avec nuance", "situate regions and accents with nuance"),
      lstr("préparer une pratique orale guidée", "prepare for guided speaking practice"),
    ],
    whyBullets: [
      lstr("une approche voyage et culture", "a travel-and-culture approach"),
      lstr("des phrases utiles avant la grammaire lourde", "useful phrases before heavy grammar"),
      lstr("un pont vers un vrai professeur d’italien", "a bridge to a real Italian teacher"),
    ],
    introCardTitle: lstr("Commencer l’intro italien", "Start the Italian intro"),
    introCardBody: lstr(
      "Travaille les premiers mots, les situations de voyage et les repères culturels.",
      "Work on first words, travel situations, and cultural landmarks.",
    ),
    teacherCardTitle: lstr("Trouver un professeur d’italien", "Find an Italian teacher"),
    teacherCardBody: lstr(
      "Après l’intro, pratique avec un vrai professeur sur Pratiqo.",
      "After the intro, practice with a real teacher on Pratiqo.",
    ),
    schemaName: "YoPratiqo Italian Intro",
    schemaDescription: "A free self-paced Italian intro connected to teacher practice.",
    teaches: ["Italian first phrases", "travel Italian", "cultural context"],
    about: ["Italian learning", "Italian culture"],
  },
} as const satisfies Record<YoPratiqoModuleSlug, YoPratiqoLandingContent>;
