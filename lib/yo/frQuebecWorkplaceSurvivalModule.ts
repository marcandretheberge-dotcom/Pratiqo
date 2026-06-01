/**
 * YoPratiqo — Quebec French / Francisation
 * Module shell: workplace and daily-life survival.
 *
 * STATUS: planned / coming soon. This file is a future-ready content
 * shell, NOT a live paid product. The corresponding route at
 * `app/yo/langues/francais-quebec/module-1/page.tsx` is rendered as a
 * "Bientôt disponible" / "Coming soon" preview — the page itself
 * carries no checkout, no payment hook, no fake price, no fake
 * discount, no fake countdown, and stays out of the sitemap behind
 * `yopratiqoProductConfig.premiumModulesEnabled = false`.
 *
 * Honesty contract — read carefully before editing copy:
 *   - We do NOT promise fluency, employment outcomes, immigration
 *     results, or any government-recognised certification. The
 *     content is educational preparation only.
 *   - We do NOT impersonate the OQLF, the MIFI, Francisation Québec,
 *     IRCC, or any official body. Mention them only as factual
 *     references when strictly relevant; never frame YoPratiqo as a
 *     substitute, partner, or accredited provider.
 *   - We do NOT promise success on TEF, TEFAQ, TCF, TCFQ, or any
 *     other language-evaluation test. The closest we go is "preparing
 *     to practise with a real teacher".
 *   - The module is a bridge to live teacher practice on Pratiqo,
 *     not a substitute for it.
 *
 * Tone: premium, useful, warm, beginner-friendly. Not government-like,
 * not fear-based, not exaggerated.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoLocalizedString } from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

/** Bilingual sample phrase used inside a module-shell lesson. */
export interface FrQuebecModuleSamplePhrase {
  /** Phrasing as a Quebec speaker would say it. Rendered with `lang="fr-CA"`. */
  frQuebec: string;
  /**
   * Optional standard French phrasing (France/international neutral).
   * Useful when the Quebec form would surprise a learner who arrived
   * already familiar with hexagonal French. Omitted when the two
   * variants are identical.
   */
  standardFrench?: string;
  /** English gloss. */
  english: string;
  /** Localized contextual note explaining tone, register, or culture. */
  noteFr?: string;
  noteEn?: string;
}

/** A single safe preview question rendered alongside the lesson card. */
export interface FrQuebecModuleQuizPreview {
  promptFr: string;
  promptEn: string;
  /** Sample answer hint — never auto-graded, never exam-style. */
  hintFr: string;
  hintEn: string;
}

/** A single lesson card inside the future Quebec French module. */
export interface FrQuebecModuleLesson {
  /** Stable id, used as React key + future Supabase column. */
  id: string;
  titleFr: string;
  titleEn: string;
  /** Estimated minutes a learner would spend on the lesson. 8–15. */
  estimatedMinutes: number;
  scenarioFr: string;
  scenarioEn: string;
  learningGoalsFr: readonly [string, string, string];
  learningGoalsEn: readonly [string, string, string];
  /** 3–5 sample phrases. */
  samplePhrases: readonly FrQuebecModuleSamplePhrase[];
  /** Single safe preview question. */
  quizPreview: FrQuebecModuleQuizPreview;
  teacherBridgePromptFr: string;
  teacherBridgePromptEn: string;
}

/** Top-level module shell. */
export interface FrQuebecWorkplaceSurvivalModuleShell {
  id: "fr-quebec-workplace-survival-1";
  /** Lifecycle status — pinned to "planned" while the shell is dormant. */
  status: "planned";
  titleFr: string;
  titleEn: string;
  /** One-line marketing tagline rendered under the hero title. */
  taglineFr: string;
  taglineEn: string;
  /** "Coming soon" eyebrow shown in the hero. */
  comingSoonLabel: YoLocalizedString;
  /** Audience description rendered above the lesson outline. */
  audienceFr: string;
  audienceEn: string;
  /** Honest disclaimer surfaced near the audience section. */
  honestPromiseFr: string;
  honestPromiseEn: string;
  /** Teacher-bridge section copy (above the /trouver-un-prof CTA). */
  teacherBridgeTitleFr: string;
  teacherBridgeTitleEn: string;
  teacherBridgeBodyFr: string;
  teacherBridgeBodyEn: string;
  /** Coming-soon notice rendered near the bottom of the page. */
  comingSoonBodyFr: string;
  comingSoonBodyEn: string;
  /** 7 lessons in display order. */
  lessons: readonly [
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
    FrQuebecModuleLesson,
  ];
}

// ─────────────────────────────────────────────────────────────────────
// Module data
// ─────────────────────────────────────────────────────────────────────

export const frQuebecWorkplaceSurvivalModule: FrQuebecWorkplaceSurvivalModuleShell =
  {
    id: "fr-quebec-workplace-survival-1",
    status: "planned",
    titleFr: "Français québécois au travail — Survie quotidienne",
    titleEn: "Quebec French at Work — Daily-Life Survival",
    taglineFr:
      "Sept courtes leçons pour mieux comprendre le français québécois au travail et dans la vie de tous les jours.",
    taglineEn:
      "Seven short lessons to better understand Quebec French at work and in everyday life.",
    comingSoonLabel: lstr("Bientôt disponible", "Coming soon"),
    audienceFr:
      "Pour les nouveaux arrivants au Québec, les apprenants canadiens et les travailleurs qui veulent comprendre le français québécois quotidien — particulièrement après avoir terminé l’intro gratuite de YoPratiqo.",
    audienceEn:
      "For newcomers to Quebec, Canadian learners, and workers who want to understand everyday Quebec French — especially after completing the free YoPratiqo intro.",
    honestPromiseFr:
      "Préparation éducative seulement. Aucune garantie de fluidité, d’emploi, de résultat d’immigration, de réussite au TEF/TEFAQ ni de certification de francisation officielle.",
    honestPromiseEn:
      "Educational preparation only. No guarantee of fluency, employment, immigration outcomes, TEF/TEFAQ success, or official francization certification.",
    teacherBridgeTitleFr: "Pont vers un vrai professeur",
    teacherBridgeTitleEn: "Bridge to a real teacher",
    teacherBridgeBodyFr:
      "Quand ce module sera prêt, il servira à mieux préparer votre pratique avec un vrai professeur sur Pratiqo.",
    teacherBridgeBodyEn:
      "When this module is ready, it will help you better prepare for practice with a real teacher on Pratiqo.",
    comingSoonBodyFr:
      "Ceci est un futur module YoPratiqo. L’achat n’est pas disponible pour le moment et l’accès payant n’est pas activé. Aucun prix de paiement n’est en vigueur ; les visuels actuels servent uniquement à présenter le plan pédagogique.",
    comingSoonBodyEn:
      "This is a future YoPratiqo module. Purchase is not available yet and paid access is not active. No live pricing is in effect; the current visuals only outline the planned learning path.",
    lessons: [
      {
        id: "fr-qc-mod1-l1",
        titleFr: "Arriver au travail et saluer naturellement",
        titleEn: "Arriving at work and greeting naturally",
        estimatedMinutes: 10,
        scenarioFr:
          "Premier matin sur le plancher. Vous croisez vos collègues, l’équipe en place et votre superviseur. Comment dire bonjour sans paraître trop formel ni trop hésitant ?",
        scenarioEn:
          "Your first morning on the floor. You cross paths with coworkers, the team on duty, and your supervisor. How do you say hello without sounding too formal or too hesitant?",
        learningGoalsFr: [
          "saluer plusieurs personnes en quelques secondes",
          "reconnaître les expressions québécoises courantes",
          "ajuster le ton entre collègues et supérieurs",
        ],
        learningGoalsEn: [
          "greet several people within a few seconds",
          "recognise common Quebec expressions",
          "adjust your tone between coworkers and supervisors",
        ],
        samplePhrases: [
          {
            frQuebec: "Bonjour, comment ça va ?",
            english: "Hello, how’s it going?",
            noteFr:
              "Salutation universelle au Québec. « Bonjour » seul est très acceptable.",
            noteEn:
              "A universal greeting in Quebec. A simple « Bonjour » alone is perfectly fine.",
          },
          {
            frQuebec: "Allô, ça va bien ?",
            standardFrench: "Salut, ça va ?",
            english: "Hi, you doing okay?",
            noteFr:
              "« Allô » est très courant entre collègues qui se connaissent.",
            noteEn:
              "« Allô » is very common between coworkers who already know each other.",
          },
          {
            frQuebec: "C’est mon premier jour, je m’appelle …",
            english: "It’s my first day, my name is …",
          },
          {
            frQuebec: "Enchanté, on se reverra sûrement aujourd’hui.",
            english: "Nice to meet you, we’ll likely cross paths again today.",
            noteFr: "Marque la fin polie d’une courte rencontre.",
            noteEn: "A polite way to wrap up a quick first interaction.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle salutation passe le mieux avec un nouveau collègue le matin ?",
          promptEn:
            "Which greeting works best with a new coworker in the morning?",
          hintFr:
            "Pense « simple, chaleureux, pas trop formel ». « Bonjour » ouvre presque toujours bien la conversation.",
          hintEn:
            "Think « simple, warm, not too formal ». « Bonjour » almost always opens the conversation well.",
        },
        teacherBridgePromptFr:
          "Demande à un prof Pratiqo de t’aider à varier tes salutations selon le contexte.",
        teacherBridgePromptEn:
          "Ask a Pratiqo teacher to help you vary your greetings by context.",
      },
      {
        id: "fr-qc-mod1-l2",
        titleFr: "Comprendre les consignes simples",
        titleEn: "Understanding simple instructions",
        estimatedMinutes: 12,
        scenarioFr:
          "On vous donne quelques consignes rapides : où ranger une boîte, à quelle heure prendre votre pause, quel formulaire signer. Vous voulez confirmer sans bloquer la chaîne de conversation.",
        scenarioEn:
          "Someone hands you a few quick instructions: where to put a box, what time your break is, which form to sign. You want to confirm without breaking the flow of the conversation.",
        learningGoalsFr: [
          "repérer les verbes-clés des consignes",
          "confirmer une consigne en une phrase courte",
          "demander une reformulation sans embarras",
        ],
        learningGoalsEn: [
          "spot the key verbs in instructions",
          "confirm an instruction in one short sentence",
          "ask for a rephrasing without feeling embarrassed",
        ],
        samplePhrases: [
          {
            frQuebec: "Tu peux me montrer où c’est ?",
            english: "Can you show me where it is?",
            noteFr:
              "« Tu » entre collègues est la norme courante au Québec, même au travail.",
            noteEn:
              "Using « tu » between coworkers is the everyday norm in Quebec, even at work.",
          },
          {
            frQuebec: "Donc, je dois faire ça avant midi ?",
            english: "So I need to do this before noon?",
            noteFr: "Reformule pour confirmer — geste très bien vu au Québec.",
            noteEn: "Restate to confirm — very well received in Quebec.",
          },
          {
            frQuebec: "Pas de problème, je m’en occupe.",
            english: "No problem, I’ll take care of it.",
          },
          {
            frQuebec: "Excuse, je n’ai pas tout saisi. Tu peux répéter ?",
            standardFrench: "Désolé, je n’ai pas bien compris. Vous pouvez répéter ?",
            english: "Sorry, I didn’t fully catch that. Could you repeat?",
            noteFr:
              "Très naturel et honnête — beaucoup mieux qu’une fausse compréhension.",
            noteEn:
              "Very natural and honest — much better than pretending to understand.",
          },
        ],
        quizPreview: {
          promptFr: "Quelle phrase confirme une consigne sans la répéter mot à mot ?",
          promptEn:
            "Which sentence confirms an instruction without repeating it word for word?",
          hintFr:
            "Cherche celle qui commence souvent par « Donc » ou « Si je comprends bien ».",
          hintEn:
            "Look for the one that often starts with « Donc » or « Si je comprends bien ».",
        },
        teacherBridgePromptFr:
          "Pratique avec un prof : demande-lui de te donner cinq mini-consignes à reformuler.",
        teacherBridgePromptEn:
          "Practise with a teacher: ask for five short instructions to restate back.",
      },
      {
        id: "fr-qc-mod1-l3",
        titleFr: "Poser une question sans bloquer",
        titleEn: "Asking a question without freezing up",
        estimatedMinutes: 11,
        scenarioFr:
          "Vous avez une question, mais vous ne voulez pas paraître perdu. Vous cherchez une formule qui ouvre la conversation, surtout avec quelqu’un que vous connaissez peu.",
        scenarioEn:
          "You have a question but don’t want to look lost. You’re after a phrasing that opens the conversation, especially with someone you don’t know well.",
        learningGoalsFr: [
          "amorcer une question avec un cadre rassurant",
          "reformuler quand l’autre n’a pas compris la première fois",
          "garder le rythme naturel d’une conversation québécoise",
        ],
        learningGoalsEn: [
          "open a question with a reassuring frame",
          "rephrase when the other person didn’t catch it the first time",
          "keep the natural rhythm of a Quebec conversation",
        ],
        samplePhrases: [
          {
            frQuebec: "Désolé, j’aurais une petite question.",
            english: "Sorry, I have a quick question.",
            noteFr:
              "Très utile pour interrompre poliment sans paraître impatient.",
            noteEn:
              "Very useful to interrupt politely without sounding impatient.",
          },
          {
            frQuebec: "Comment on dit ça, déjà ?",
            standardFrench: "Comment dit-on cela, déjà ?",
            english: "How do you say that again?",
            noteFr: "« Déjà » à la fin signale que vous cherchez le mot exact.",
            noteEn:
              "Adding « déjà » at the end signals you’re searching for the exact word.",
          },
          {
            frQuebec: "Je veux juste être sûr que j’ai bien compris.",
            english: "I just want to make sure I understood correctly.",
          },
          {
            frQuebec: "Si jamais c’est pas clair, dis-moi.",
            standardFrench: "Si ce n’est pas clair, n’hésitez pas à me le dire.",
            english: "If it’s not clear, just let me know.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase ouvre poliment une question sans interrompre brusquement ?",
          promptEn:
            "Which sentence opens a question politely without abruptly interrupting?",
          hintFr:
            "Pense à un mot d’ouverture doux comme « Désolé » ou « Excuse-moi » suivi d’un cadre court.",
          hintEn:
            "Think of a gentle opener like « Désolé » or « Excuse-moi » followed by a short frame.",
        },
        teacherBridgePromptFr:
          "Avec un prof, simulez 3 mini-questions courantes (heure de réunion, formulaire, lieu).",
        teacherBridgePromptEn:
          "With a teacher, role-play 3 short, common questions (meeting time, form, location).",
      },
      {
        id: "fr-qc-mod1-l4",
        titleFr: "Parler de son horaire et de ses disponibilités",
        titleEn: "Talking about your schedule and availability",
        estimatedMinutes: 13,
        scenarioFr:
          "Votre superviseur veut savoir quand vous êtes disponible cette semaine et quelles sont vos contraintes. L’objectif est de répondre avec clarté et flexibilité, sans confusion sur les heures.",
        scenarioEn:
          "Your supervisor wants to know when you’re available this week and what your constraints are. The goal is to answer clearly and flexibly, without confusion about hours.",
        learningGoalsFr: [
          "exprimer une plage horaire de façon naturelle",
          "indiquer une contrainte sans paraître rigide",
          "proposer une alternative respectueuse",
        ],
        learningGoalsEn: [
          "express a time window naturally",
          "state a constraint without sounding rigid",
          "offer a respectful alternative",
        ],
        samplePhrases: [
          {
            frQuebec: "Je suis disponible du lundi au mercredi.",
            english: "I’m available from Monday to Wednesday.",
          },
          {
            frQuebec: "Le matin, ça me va. Après-midi, c’est plus serré.",
            english: "Mornings work for me. Afternoons are tighter.",
            noteFr:
              "« C’est plus serré » est une façon souple de dire « j’ai moins de marge ».",
            noteEn:
              "« C’est plus serré » is a flexible way to say « I have less room to move ».",
          },
          {
            frQuebec: "Est-ce qu’on pourrait plutôt regarder jeudi ?",
            standardFrench: "Pourrions-nous plutôt envisager jeudi ?",
            english: "Could we look at Thursday instead?",
          },
          {
            frQuebec: "Je te confirme ça d’ici demain.",
            english: "I’ll confirm with you by tomorrow.",
            noteFr: "Bonne pratique : ne jamais s’engager sans vérifier.",
            noteEn: "Best practice: never commit without checking first.",
          },
        ],
        quizPreview: {
          promptFr: "Quelle phrase exprime une disponibilité partielle sans fermer la porte ?",
          promptEn:
            "Which sentence shows partial availability without shutting the door?",
          hintFr:
            "Cherche une phrase qui combine « ça me va » et une nuance comme « plus serré ».",
          hintEn:
            "Look for a sentence that combines « ça me va » with a soft caveat like « plus serré ».",
        },
        teacherBridgePromptFr:
          "Demande à un prof de te faire répéter ton horaire-type avec différentes contraintes.",
        teacherBridgePromptEn:
          "Ask a teacher to help you rehearse your typical schedule with various constraints.",
      },
      {
        id: "fr-qc-mod1-l5",
        titleFr: "Gérer une petite incompréhension",
        titleEn: "Handling a small misunderstanding",
        estimatedMinutes: 11,
        scenarioFr:
          "Quelqu’un comprend autre chose que ce que vous vouliez dire. Vous voulez clarifier sans faire perdre la face à votre interlocuteur ni à vous-même.",
        scenarioEn:
          "Someone hears something different from what you meant. You want to clarify without making your conversation partner — or yourself — lose face.",
        learningGoalsFr: [
          "réparer une mauvaise interprétation avec calme",
          "vérifier la compréhension de l’autre",
          "garder un ton chaleureux malgré la friction",
        ],
        learningGoalsEn: [
          "repair a misinterpretation calmly",
          "check the other person’s understanding",
          "keep a warm tone despite friction",
        ],
        samplePhrases: [
          {
            frQuebec: "Désolé, je me suis mal expliqué.",
            english: "Sorry, I didn’t explain that well.",
            noteFr:
              "Reprendre la responsabilité désamorce vite la situation au Québec.",
            noteEn:
              "Taking responsibility quickly defuses the situation in Quebec culture.",
          },
          {
            frQuebec: "Ce que je voulais dire, c’est plutôt …",
            english: "What I meant to say is more like …",
          },
          {
            frQuebec: "Est-ce que ça fait du sens, là ?",
            standardFrench: "Est-ce que cela vous semble cohérent ?",
            english: "Does that make sense now?",
            noteFr:
              "« Ça fait du sens » est une formule québécoise très répandue (calque de l’anglais accepté à l’oral).",
            noteEn:
              "« Ça fait du sens » is a very common Quebec phrasing (an Anglicism that is fully accepted in spoken use).",
          },
          {
            frQuebec: "Pas de souci, on prend le temps qu’il faut.",
            english: "No worries, we’ll take the time we need.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase corrige une incompréhension sans blâmer l’autre personne ?",
          promptEn:
            "Which sentence fixes a misunderstanding without blaming the other person?",
          hintFr:
            "Cherche une phrase qui commence par « Désolé » ou « Ce que je voulais dire ».",
          hintEn:
            "Look for one that starts with « Désolé » or « Ce que je voulais dire ».",
        },
        teacherBridgePromptFr:
          "Pratique avec un prof : reproduisez 2 mini-incompréhensions et reformulez ensemble.",
        teacherBridgePromptEn:
          "Practise with a teacher: re-enact 2 small misunderstandings and rephrase together.",
      },
      {
        id: "fr-qc-mod1-l6",
        titleFr: "Prendre un rendez-vous ou confirmer une information",
        titleEn: "Booking an appointment or confirming information",
        estimatedMinutes: 14,
        scenarioFr:
          "Vous appelez ou écrivez pour fixer un rendez-vous, ou pour confirmer une information importante (un horaire, une adresse, un document à apporter). Vous voulez sortir de l’échange avec une confirmation claire.",
        scenarioEn:
          "You’re calling or writing to set up an appointment, or to confirm important information (a time, an address, a document to bring). You want to leave the exchange with a clear confirmation.",
        learningGoalsFr: [
          "ouvrir une demande de rendez-vous avec naturel",
          "lire et redire une heure ou une adresse en français",
          "obtenir une confirmation explicite avant de raccrocher",
        ],
        learningGoalsEn: [
          "open an appointment request naturally",
          "read back a time or address in French",
          "get an explicit confirmation before hanging up",
        ],
        samplePhrases: [
          {
            frQuebec: "Bonjour, j’aimerais prendre rendez-vous, s’il vous plaît.",
            english: "Hello, I’d like to book an appointment, please.",
          },
          {
            frQuebec: "Est-ce que vous avez une plage libre cette semaine ?",
            english: "Do you have an open slot this week?",
            noteFr:
              "« Plage » au sens d’horaire est très courant en français québécois.",
            noteEn:
              "« Plage » meaning time slot is very common in Quebec French.",
          },
          {
            frQuebec: "Donc, mardi 14 h, au 1234 rue Sainte-Catherine, c’est ça ?",
            english: "So, Tuesday at 2:00 p.m., at 1234 rue Sainte-Catherine, correct?",
            noteFr: "Toujours redire l’heure, l’adresse et la date — minimise les erreurs.",
            noteEn:
              "Always read back the time, the address, and the date — it minimises mistakes.",
          },
          {
            frQuebec: "Je vais vous envoyer un courriel de confirmation.",
            standardFrench: "Je vais vous envoyer un email de confirmation.",
            english: "I’ll send you a confirmation email.",
            noteFr: "Au Québec on dit « courriel », pas « email ».",
            noteEn: "In Quebec the word is « courriel », not « email ».",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase confirme une heure ET une adresse en une seule réplique ?",
          promptEn:
            "Which sentence confirms BOTH a time AND an address in a single line?",
          hintFr:
            "Repère celle qui commence par « Donc » et liste plusieurs détails côte à côte.",
          hintEn:
            "Find the one that starts with « Donc » and lists several details side by side.",
        },
        teacherBridgePromptFr:
          "Avec un prof, simule un appel pour fixer un rendez-vous médical ou administratif.",
        teacherBridgePromptEn:
          "With a teacher, role-play a call to book a medical or administrative appointment.",
      },
      {
        id: "fr-qc-mod1-l7",
        titleFr: "Préparer une première pratique avec un professeur",
        titleEn: "Preparing your first practice with a teacher",
        estimatedMinutes: 12,
        scenarioFr:
          "Vous savez maintenant gérer plusieurs situations courantes au travail. Cette dernière leçon vous aide à préparer votre première vraie séance de pratique avec un professeur Pratiqo : objectifs, sujets, et trois questions à amener.",
        scenarioEn:
          "You can now navigate several common situations at work. This last lesson helps you prepare your first real practice session with a Pratiqo teacher: goals, topics, and three questions to bring along.",
        learningGoalsFr: [
          "formuler un objectif clair pour la prochaine séance",
          "identifier 3 situations à pratiquer en priorité",
          "préparer 3 questions concrètes à poser au prof",
        ],
        learningGoalsEn: [
          "phrase a clear goal for your next session",
          "identify 3 priority situations to rehearse",
          "prepare 3 concrete questions to ask the teacher",
        ],
        samplePhrases: [
          {
            frQuebec: "Mon objectif, c’est de mieux comprendre quand on me parle vite.",
            english: "My goal is to better understand when people speak fast.",
          },
          {
            frQuebec: "J’aimerais qu’on pratique surtout les rendez-vous au téléphone.",
            english: "I’d like us to practise phone appointments in particular.",
          },
          {
            frQuebec: "Est-ce que tu peux me corriger quand je me trompe ?",
            standardFrench: "Pouvez-vous me corriger lorsque je me trompe ?",
            english: "Can you correct me when I make a mistake?",
            noteFr: "Demander explicitement la correction est très bien vu.",
            noteEn:
              "Asking for corrections explicitly is very well received by teachers.",
          },
          {
            frQuebec: "Comment je peux pratiquer entre nos séances ?",
            english: "How can I practise between our sessions?",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase exprime un objectif personnel clair pour une séance ?",
          promptEn:
            "Which sentence expresses a clear personal goal for a session?",
          hintFr:
            "Cherche une phrase qui commence par « Mon objectif » et nomme une situation précise.",
          hintEn:
            "Look for one that starts with « Mon objectif » and names a specific situation.",
        },
        teacherBridgePromptFr:
          "Réservez une première séance Pratiqo pour passer ces 7 mini-scénarios à voix haute.",
        teacherBridgePromptEn:
          "Book a first Pratiqo session to run these 7 mini-scenarios out loud.",
      },
    ],
  };
