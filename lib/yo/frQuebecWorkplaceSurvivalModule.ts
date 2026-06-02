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

/** Trilingual sample phrase used inside a module-shell lesson. */
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
  /** Spanish gloss for Spanish-speaking learners. */
  spanish?: string;
  /** Localized contextual note explaining tone, register, or culture. */
  noteFr?: string;
  noteEn?: string;
  noteEs?: string;
}

/** A single safe preview question rendered alongside the lesson card. */
export interface FrQuebecModuleQuizPreview {
  promptFr: string;
  promptEn: string;
  promptEs: string;
  /** Sample answer hint — never auto-graded, never exam-style. */
  hintFr: string;
  hintEn: string;
  hintEs: string;
}

/**
 * Per-lesson lifecycle.
 *
 *   - "planned": outline-only card (the default for the 6 future
 *                lessons). Renders as a locked future preview with no
 *                rich body content.
 *   - "preview": this lesson has a richer free preview body wired
 *                through `content`. The shell renders the dedicated
 *                preview section before the locked grid. The lesson
 *                is still NOT a paid product — `accessStatus` stays
 *                `"coming_soon"` and the route stays noindex.
 */
export type FrQuebecModuleLessonStatus = "planned" | "preview";

/**
 * Public access posture for a lesson. Pinned to `"coming_soon"`
 * across the entire shell — no lesson is on a paid surface today.
 * The literal type guarantees a future expansion (e.g. `"free"` or
 * `"paid"`) is a deliberate code change reviewable in `git log`.
 */
export type FrQuebecModuleAccessStatus = "coming_soon";

/**
 * A single core phrase inside Lesson 1's free preview. Adds a
 * `register` axis (informal / neutral / formal) plus longer
 * `usageFr`/`usageEn` context lines so the learner understands WHEN
 * to use the phrase, not just what it means.
 */
export interface FrQuebecLessonOneCorePhrase {
  /** Stable id used as React key. */
  id: string;
  frQuebec: string;
  /** Optional standard-French alternative when it differs noticeably. */
  standardFrench?: string;
  /** English gloss for Anglo-Canadian learners. */
  english: string;
  /** Spanish gloss for Spanish-speaking newcomers. */
  spanish: string;
  /** Tone / formality axis. */
  register: "informal" | "neutral" | "formal";
  /** When + with whom to use it (FR). */
  usageFr: string;
  /** When + with whom to use it (EN). */
  usageEn: string;
  /** When + with whom to use it (ES). */
  usageEs: string;
  /** Optional cultural / pronunciation note (FR). */
  noteFr?: string;
  /** Optional cultural / pronunciation note (EN). */
  noteEn?: string;
  /** Optional cultural / pronunciation note (ES). */
  noteEs?: string;
}

/** A single line of dialogue inside a Lesson 1 mini-scenario. */
export interface FrQuebecLessonOneDialogueLine {
  /** Localized speaker label (FR / EN / ES). */
  speakerFr: string;
  speakerEn: string;
  speakerEs: string;
  /** What the speaker actually says, Quebec phrasing. */
  frQuebec: string;
  /** English gloss. */
  english: string;
  /** Spanish gloss. */
  spanish: string;
  /** Optional localized note about tone, register, or culture (FR / EN / ES). */
  noteFr?: string;
  noteEn?: string;
  noteEs?: string;
}

/** A short workplace dialogue rendered inside Lesson 1's preview. */
export interface FrQuebecLessonOneDialogue {
  id: string;
  titleFr: string;
  titleEn: string;
  titleEs: string;
  /** One-sentence localized context above the lines (FR / EN / ES). */
  contextFr: string;
  contextEn: string;
  contextEs: string;
  lines: readonly FrQuebecLessonOneDialogueLine[];
}

/**
 * A single tu/vous decision drill. `safestChoice` keeps the answer
 * deterministic and reviewable: `"follow"` means "mirror what the
 * other person uses" — the right answer when neither tu nor vous is
 * obviously safer.
 */
export interface FrQuebecLessonOneTuVousSituation {
  id: string;
  situationFr: string;
  situationEn: string;
  situationEs: string;
  safestChoice: "tu" | "vous" | "follow";
  explanationFr: string;
  explanationEn: string;
  explanationEs: string;
}

/**
 * A single multiple-choice option for the Lesson 1 quiz.
 *
 * Trilingual contract:
 *   - UI text (eyebrows, headings, scenarios, prompts, explanations,
 *     cultural notes, reflection prompts, teacher-bridge prompts,
 *     CTAs, register labels) is localized FR / EN / ES.
 *   - The French TARGET phrases the learner is practicing remain in
 *     Quebec French in every locale: corePhrases[*].frQuebec,
 *     miniDialogues[*].lines[*].frQuebec, and quizQuestions[*].options[*].targetFr.
 *     EN/ES glosses (option.glossEn / option.glossEs) are HELPERS only
 *     — they never replace the French target.
 *
 * That's why a quiz option carries `targetFr` (always rendered) plus
 * optional `glossEn` / `glossEs` (rendered only as a small helper line
 * underneath, when the active locale matches).
 */
export interface FrQuebecLessonOneQuizOption {
  id: string;
  /** The Quebec French phrase being evaluated. Always rendered prominently in every locale. */
  targetFr: string;
  /** Optional EN gloss shown as a small helper line below targetFr when locale === "en". */
  glossEn?: string;
  /** Optional ES gloss shown as a small helper line below targetFr when locale === "es". */
  glossEs?: string;
}

/** A single Lesson 1 quiz question. */
export interface FrQuebecLessonOneQuizQuestion {
  id: string;
  promptFr: string;
  promptEn: string;
  promptEs: string;
  options: readonly FrQuebecLessonOneQuizOption[];
  correctOptionId: string;
  /** Gentle-correction copy shown after answering (FR). */
  explanationFr: string;
  /** Gentle-correction copy shown after answering (EN). */
  explanationEn: string;
  /** Gentle-correction copy shown after answering (ES). */
  explanationEs: string;
}

/**
 * Rich free-preview body for a lesson tagged `status: "preview"`.
 * Lesson 1 is the first (and currently only) lesson with a populated
 * `content` block. The shape is intentionally serialisable JSON —
 * no React, no client hooks, no audio URLs, no upload paths. A
 * future migration can persist it 1-for-1 to `yo_lessons.content`.
 */
export interface FrQuebecLessonOneContent {
  /** Localized learning objective rendered at the top of the preview. */
  objectiveFr: string;
  objectiveEn: string;
  objectiveEs: string;
  /** Longer mini-scenario than the outline card scenario. */
  scenarioFr: string;
  scenarioEn: string;
  scenarioEs: string;
  /** Quebec workplace cultural note (warm + nuanced + non-absolute). */
  culturalNoteFr: string;
  culturalNoteEn: string;
  culturalNoteEs: string;
  /** 12–16 core phrases with register + usage notes. */
  corePhrases: readonly FrQuebecLessonOneCorePhrase[];
  /** Exactly 3 short dialogues (reception / colleague / team lead). */
  miniDialogues: readonly [
    FrQuebecLessonOneDialogue,
    FrQuebecLessonOneDialogue,
    FrQuebecLessonOneDialogue,
  ];
  /** Exactly 5 tu/vous practice situations. */
  tuVousPractice: readonly [
    FrQuebecLessonOneTuVousSituation,
    FrQuebecLessonOneTuVousSituation,
    FrQuebecLessonOneTuVousSituation,
    FrQuebecLessonOneTuVousSituation,
    FrQuebecLessonOneTuVousSituation,
  ];
  /** Exactly 5 quick quiz questions. */
  quizQuestions: readonly [
    FrQuebecLessonOneQuizQuestion,
    FrQuebecLessonOneQuizQuestion,
    FrQuebecLessonOneQuizQuestion,
    FrQuebecLessonOneQuizQuestion,
    FrQuebecLessonOneQuizQuestion,
  ];
  /** Open-ended self-reflection prompt (FR / EN / ES). */
  reflectionPromptFr: string;
  reflectionPromptEn: string;
  reflectionPromptEs: string;
  /**
   * Generic, consent-safe teacher-bridge prompt. Must NEVER mention
   * automatic teacher routing, voice recording, or forwarding learner
   * data / quiz logs to teachers — those are out of scope for this
   * shell.
   */
  teacherBridgePromptFr: string;
  teacherBridgePromptEn: string;
  teacherBridgePromptEs: string;
}

/** A single lesson card inside the future Quebec French module. */
export interface FrQuebecModuleLesson {
  /** Stable id, used as React key + future Supabase column. */
  id: string;
  /** "planned" by default; "preview" when the rich body below is wired. */
  status: FrQuebecModuleLessonStatus;
  /** Always `"coming_soon"` while the shell is dormant. */
  accessStatus: FrQuebecModuleAccessStatus;
  titleFr: string;
  titleEn: string;
  titleEs: string;
  /** Estimated minutes a learner would spend on the lesson. 8–15. */
  estimatedMinutes: number;
  scenarioFr: string;
  scenarioEn: string;
  scenarioEs: string;
  learningGoalsFr: readonly [string, string, string];
  learningGoalsEn: readonly [string, string, string];
  learningGoalsEs: readonly [string, string, string];
  /** 3–5 outline-card sample phrases (rendered on the locked grid). */
  samplePhrases: readonly FrQuebecModuleSamplePhrase[];
  /** Single safe preview question shown on the outline card. */
  quizPreview: FrQuebecModuleQuizPreview;
  teacherBridgePromptFr: string;
  teacherBridgePromptEn: string;
  teacherBridgePromptEs: string;
  /**
   * Rich free-preview body. Populated only when `status === "preview"`.
   * Other lessons stay outline-only (`undefined`) until they land in
   * a future PR.
   */
  content?: FrQuebecLessonOneContent;
}

/** Top-level module shell. */
export interface FrQuebecWorkplaceSurvivalModuleShell {
  id: "fr-quebec-workplace-survival-1";
  /** Lifecycle status — pinned to "planned" while the shell is dormant. */
  status: "planned";
  titleFr: string;
  titleEn: string;
  titleEs: string;
  /** One-line marketing tagline rendered under the hero title (FR / EN / ES). */
  taglineFr: string;
  taglineEn: string;
  taglineEs: string;
  /** "Coming soon" eyebrow shown in the hero (already trilingual via lstr). */
  comingSoonLabel: YoLocalizedString;
  /** Audience description rendered above the lesson outline (FR / EN / ES). */
  audienceFr: string;
  audienceEn: string;
  audienceEs: string;
  /** Honest disclaimer surfaced near the audience section (FR / EN / ES). */
  honestPromiseFr: string;
  honestPromiseEn: string;
  honestPromiseEs: string;
  /** Teacher-bridge section copy (FR / EN / ES, above /trouver-un-prof). */
  teacherBridgeTitleFr: string;
  teacherBridgeTitleEn: string;
  teacherBridgeTitleEs: string;
  teacherBridgeBodyFr: string;
  teacherBridgeBodyEn: string;
  teacherBridgeBodyEs: string;
  /** Coming-soon notice rendered near the bottom of the page (FR / EN / ES). */
  comingSoonBodyFr: string;
  comingSoonBodyEn: string;
  comingSoonBodyEs: string;
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
    titleEs:
      "Francés de Quebec en el trabajo — Supervivencia cotidiana",
    taglineFr:
      "Sept courtes leçons pour mieux comprendre le français québécois au travail et dans la vie de tous les jours.",
    taglineEn:
      "Seven short lessons to better understand Quebec French at work and in everyday life.",
    taglineEs:
      "Siete lecciones breves para entender mejor el francés de Quebec en el trabajo y en la vida diaria.",
    comingSoonLabel: lstr(
      "Bientôt disponible",
      "Coming soon",
      "Próximamente",
    ),
    audienceFr:
      "Pour les nouveaux arrivants au Québec, les apprenants canadiens et les travailleurs qui veulent comprendre le français québécois quotidien — particulièrement après avoir terminé l’intro gratuite de YoPratiqo.",
    audienceEn:
      "For newcomers to Quebec, Canadian learners, and workers who want to understand everyday Quebec French — especially after completing the free YoPratiqo intro.",
    audienceEs:
      "Para personas recién llegadas a Quebec, estudiantes en Canadá y trabajadores que quieren entender el francés de Quebec del día a día — sobre todo después de terminar la intro gratuita de YoPratiqo.",
    honestPromiseFr:
      "Préparation éducative seulement. Aucune garantie de fluidité, d’emploi, de résultat d’immigration, de réussite au TEF/TEFAQ ni de certification de francisation officielle.",
    honestPromiseEn:
      "Educational preparation only. No guarantee of fluency, employment, immigration outcomes, TEF/TEFAQ success, or official francization certification.",
    honestPromiseEs:
      "Preparación educativa únicamente. Sin promesa de fluidez, empleo, resultado migratorio, aprobación del TEF/TEFAQ ni certificación oficial de francización.",
    teacherBridgeTitleFr: "Pont vers un vrai professeur",
    teacherBridgeTitleEn: "Bridge to a real teacher",
    teacherBridgeTitleEs: "Puente hacia un profesor real",
    teacherBridgeBodyFr:
      "Quand ce module sera prêt, il servira à mieux préparer votre pratique avec un vrai professeur sur Pratiqo.",
    teacherBridgeBodyEn:
      "When this module is ready, it will help you better prepare for practice with a real teacher on Pratiqo.",
    teacherBridgeBodyEs:
      "Cuando este módulo esté listo, le ayudará a preparar mejor su práctica con un profesor real en Pratiqo.",
    comingSoonBodyFr:
      "Ceci est un futur module YoPratiqo. L’achat n’est pas disponible pour le moment et l’accès payant n’est pas activé. Aucun prix de paiement n’est en vigueur ; les visuels actuels servent uniquement à présenter le plan pédagogique.",
    comingSoonBodyEn:
      "This is a future YoPratiqo module. Purchase is not available yet and paid access is not active. No live pricing is in effect; the current visuals only outline the planned learning path.",
    comingSoonBodyEs:
      "Este es un módulo futuro de YoPratiqo. La compra todavía no está disponible y el acceso de pago no está activo. No hay precio vigente; las pantallas actuales solo presentan el plan pedagógico previsto.",
    lessons: [
      {
        id: "arriver-saluer",
        status: "preview",
        accessStatus: "coming_soon",
        titleFr: "Arriver au travail et saluer naturellement",
        titleEn: "Arriving at work and greeting naturally",
        titleEs: "Llegar al trabajo y saludar con naturalidad",
        estimatedMinutes: 10,
        scenarioFr:
          "Premier matin sur le plancher. Vous croisez vos collègues, l’équipe en place et votre superviseur. Comment dire bonjour sans paraître trop formel ni trop hésitant ?",
        scenarioEn:
          "Your first morning on the floor. You cross paths with coworkers, the team on duty, and your supervisor. How do you say hello without sounding too formal or too hesitant?",
        scenarioEs:
          "Primera mañana en el lugar de trabajo. Se cruza con compañeros, con el equipo de turno y con su responsable. ¿Cómo saludar sin sonar demasiado formal ni demasiado dudoso?",
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
        learningGoalsEs: [
          "saludar a varias personas en pocos segundos",
          "reconocer expresiones quebequenses habituales",
          "ajustar el tono entre compañeros y superiores",
        ],
        samplePhrases: [
          {
            frQuebec: "Bonjour, comment ça va ?",
            english: "Hello, how’s it going?",
            spanish: "Hola, ¿cómo estás?",
            noteFr:
              "Salutation universelle au Québec. « Bonjour » seul est très acceptable.",
            noteEn:
              "A universal greeting in Quebec. A simple « Bonjour » alone is perfectly fine.",
            noteEs:
              "Saludo universal en Quebec. Decir solo « Bonjour » también es perfectamente correcto.",
          },
          {
            frQuebec: "Allô, ça va bien ?",
            standardFrench: "Salut, ça va ?",
            english: "Hi, you doing okay?",
            spanish: "Hola, ¿estás bien?",
            noteFr:
              "« Allô » est très courant entre collègues qui se connaissent.",
            noteEn:
              "« Allô » is very common between coworkers who already know each other.",
            noteEs:
              "« Allô » es muy común entre compañeros que ya se conocen.",
          },
          {
            frQuebec: "C’est mon premier jour, je m’appelle …",
            english: "It’s my first day, my name is …",
            spanish: "Es mi primer día, me llamo …",
          },
          {
            frQuebec: "Enchanté, on se reverra sûrement aujourd’hui.",
            english: "Nice to meet you, we’ll likely cross paths again today.",
            spanish:
              "Encantado/a, seguramente nos volveremos a ver durante el día.",
            noteFr: "Marque la fin polie d’une courte rencontre.",
            noteEn: "A polite way to wrap up a quick first interaction.",
            noteEs: "Forma cortés de cerrar un primer encuentro breve.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle salutation passe le mieux avec un nouveau collègue le matin ?",
          promptEn:
            "Which greeting works best with a new coworker in the morning?",
          promptEs:
            "¿Qué saludo funciona mejor por la mañana con un nuevo compañero?",
          hintFr:
            "Pense « simple, chaleureux, pas trop formel ». « Bonjour » ouvre presque toujours bien la conversation.",
          hintEn:
            "Think « simple, warm, not too formal ». « Bonjour » almost always opens the conversation well.",
          hintEs:
            "Piense « sencillo, cálido, no demasiado formal ». « Bonjour » casi siempre abre bien la conversación.",
        },
        teacherBridgePromptFr:
          "Demande à un prof Pratiqo de t’aider à varier tes salutations selon le contexte.",
        teacherBridgePromptEn:
          "Ask a Pratiqo teacher to help you vary your greetings by context.",
        teacherBridgePromptEs:
          "Pídale a un profesor de Pratiqo que le ayude a variar sus saludos según el contexto.",
        content: {
          objectiveFr:
            "Apprendre à saluer naturellement au travail au Québec, comprendre quand utiliser « tu » ou « vous », et répondre simplement aux premières questions d’une journée de travail.",
          objectiveEn:
            "Learn how to greet people naturally at work in Quebec, understand when to use « tu » or « vous », and answer simple first-day workplace questions.",
          objectiveEs:
            "Aprender a saludar con naturalidad en el trabajo en Quebec, entender cuándo usar « tu » o « vous » y responder de forma sencilla a las primeras preguntas de un día laboral.",
          scenarioFr:
            "Vous arrivez à votre nouveau lieu de travail au Québec. À l’accueil, une personne vous reçoit. Plus loin, un collègue vient se présenter près de votre poste. Quelques minutes après, votre responsable d’équipe passe vous saluer et propose un court point en fin de journée. Le ton autour de vous est chaleureux et un peu informel — l’objectif est de répondre simplement, sans surjouer la formalité.",
          scenarioEn:
            "You arrive at your new workplace in Quebec. At reception, someone greets you. A bit later, a coworker comes by your desk to introduce themselves. A few minutes after that, your team lead drops in to say hello and suggests a quick check-in at the end of the day. The tone around you is warm and a little informal — the goal is to reply simply, without over-playing formality.",
          scenarioEs:
            "Llega a su nuevo lugar de trabajo en Quebec. En la recepción, alguien le da la bienvenida. Un poco más adelante, un compañero pasa por su puesto para presentarse. Unos minutos después, su responsable de equipo viene a saludarle y propone una breve reunión al final del día. El ambiente es cálido y algo informal — el objetivo es responder de forma sencilla, sin forzar la formalidad.",
          culturalNoteFr:
            "Le ton au travail au Québec est souvent chaleureux et direct. « Tu » est très répandu dans plusieurs milieux, mais « vous » reste un choix sûr quand vous n’êtes pas certain·e — par exemple lors d’un premier contact, à l’accueil, ou avec une personne plus expérimentée que vous ne connaissez pas encore. La règle la plus utile : suivez la personne en face de vous. Être poli ne veut pas dire sonner formel ou distant. Et toutes les équipes ne fonctionnent pas pareil : certaines sont très informelles, d’autres plus réservées. Observez d’abord, mirez-vous sur le ton ambiant, ajustez ensuite.",
          culturalNoteEn:
            "Workplace tone in Quebec is often warm and direct. « Tu » is widespread in many environments, but « vous » remains a safe choice when you’re unsure — for example, on first contact, at reception, or with a more senior person you don’t know yet. The most useful rule: follow the person in front of you. Being polite doesn’t mean sounding formal or distant. And teams don’t all behave the same: some are very informal, others more reserved. Observe first, mirror the surrounding tone, adjust afterwards.",
          culturalNoteEs:
            "El ambiente laboral en Quebec suele ser cálido y directo. « Tu » se usa muchísimo en varios entornos: para una persona hispanohablante puede sonar parecido al « tú » que usaríamos con un compañero cercano, sin ser una falta de respeto — es más bien un tono profesional cercano. Aun así, « vous » sigue siendo una opción segura cuando no esté seguro, por ejemplo en un primer contacto, en recepción o con alguien con más experiencia. La regla más útil: imite el trato que la otra persona usa con usted. Ser cortés no significa sonar frío ni distante. Y no todos los equipos funcionan igual: algunos son muy informales, otros más reservados. Observe primero, ajuste después — sin caer en estereotipos.",
          corePhrases: [
            {
              id: "p1",
              frQuebec: "Salut, ça va ?",
              english: "Hi, how’s it going?",
              spanish: "Hola, ¿qué tal?",
              register: "informal",
              usageFr:
                "Avec des collègues que vous connaissez déjà, ou quand quelqu’un vous adresse un « Salut » en premier.",
              usageEn:
                "With coworkers you already know, or when someone greets you with « Salut » first.",
              usageEs:
                "Con compañeros que ya conoce, o cuando alguien le dice « Salut » primero.",
              noteFr:
                "Trop décontracté pour un premier contact à l’accueil ; mirez-vous sur la personne en face.",
              noteEn:
                "Too casual for a first reception desk contact; mirror the person in front of you.",
              noteEs:
                "Demasiado informal para un primer contacto en recepción; siga el tono que use la otra persona.",
            },
            {
              id: "p2",
              frQuebec: "Bonjour, enchanté.",
              standardFrench: "Bonjour, enchanté de faire votre connaissance.",
              english: "Hello, nice to meet you.",
              spanish: "Hola, mucho gusto.",
              register: "neutral",
              usageFr:
                "À l’accueil, à un nouveau collègue ou à votre responsable lors du premier contact.",
              usageEn:
                "At reception, with a new coworker, or with your team lead on first contact.",
              usageEs:
                "En recepción, con un nuevo compañero o con su responsable, en el primer contacto.",
              noteFr:
                "Au féminin écrit : « enchantée ». À l’oral, la prononciation est identique.",
              noteEn:
                "In feminine written form: « enchantée ». Pronunciation is identical.",
              noteEs:
                "En femenino se escribe « enchantée »; la pronunciación es la misma.",
            },
            {
              id: "p3",
              frQuebec: "Je suis nouveau dans l’équipe.",
              english: "I’m new on the team.",
              spanish: "Soy nuevo en el equipo.",
              register: "neutral",
              usageFr:
                "Pour vous présenter rapidement, surtout si la personne ne semble pas savoir qui vous êtes.",
              usageEn:
                "To introduce yourself quickly, especially if the person doesn’t seem to know who you are.",
              usageEs:
                "Para presentarse rápidamente, sobre todo si la otra persona no sabe quién es usted.",
              noteFr:
                "Forme féminine : « Je suis nouvelle dans l’équipe ».",
              noteEn:
                "Feminine form: « Je suis nouvelle dans l’équipe ».",
              noteEs:
                "Forma femenina: « Je suis nouvelle dans l’équipe » (« Soy nueva en el equipo »).",
            },
            {
              id: "p4",
              frQuebec: "Je commence aujourd’hui.",
              english: "I’m starting today.",
              spanish: "Empiezo hoy.",
              register: "neutral",
              usageFr:
                "Phrase courte et claire à l’accueil ou au premier contact.",
              usageEn:
                "A short, clear sentence at reception or for a first contact.",
              usageEs:
                "Frase corta y clara para recepción o un primer contacto.",
            },
            {
              id: "p5",
              frQuebec: "Tu peux me tutoyer.",
              english: "You can call me « tu ».",
              spanish: "Puedes tutearme (en francés).",
              register: "informal",
              usageFr:
                "Pour inviter quelqu’un à passer au « tu » avec vous.",
              usageEn:
                "To invite someone to switch to « tu » with you.",
              usageEs:
                "Para invitar a la otra persona a cambiar al « tu » con usted.",
              noteFr:
                "Au Québec, beaucoup de collègues le font dès la première rencontre.",
              noteEn:
                "In Quebec, many coworkers do this at the very first meeting.",
              noteEs:
                "En Quebec, muchos compañeros lo proponen ya en el primer encuentro; no es una falta de respeto, es un tono profesional cercano.",
            },
            {
              id: "p6",
              frQuebec: "Est-ce que je peux vous tutoyer ?",
              english: "Is it okay if I use « tu » with you?",
              spanish: "¿Puedo tutearle? (pasar al « tu » en francés)",
              register: "formal",
              usageFr:
                "Manière polie de demander la permission, surtout avec une personne plus senior que vous ne connaissez pas encore.",
              usageEn:
                "A polite way to ask permission, especially with a more senior person you don’t know yet.",
              usageEs:
                "Forma cortés de pedir permiso, sobre todo con una persona con más experiencia que aún no conoce.",
              noteFr:
                "Reste très bien vu — montre du respect sans être rigide.",
              noteEn:
                "Still very well received — it shows respect without being rigid.",
              noteEs:
                "Sigue cayendo muy bien: muestra respeto sin sonar rígido.",
            },
            {
              id: "p7",
              frQuebec: "Je vais m’installer ici.",
              english: "I’ll set myself up here.",
              spanish: "Voy a instalarme aquí.",
              register: "neutral",
              usageFr:
                "Quand on vous indique votre poste de travail ou un bureau libre.",
              usageEn:
                "When someone shows you your desk or an open workstation.",
              usageEs:
                "Cuando le indican su puesto de trabajo o un escritorio libre.",
            },
            {
              id: "p8",
              frQuebec: "Je cherche la salle de réunion.",
              english: "I’m looking for the meeting room.",
              spanish: "Estoy buscando la sala de reuniones.",
              register: "neutral",
              usageFr:
                "Demande directe et utile dès la première matinée.",
              usageEn:
                "A direct, useful question for your very first morning.",
              usageEs:
                "Pregunta directa y útil ya desde la primera mañana.",
            },
            {
              id: "p9",
              frQuebec: "Je ne suis pas encore habitué au système.",
              english: "I’m not used to the system yet.",
              spanish: "Todavía no estoy acostumbrado al sistema.",
              register: "neutral",
              usageFr:
                "Pour expliquer poliment que vous découvrez l’environnement.",
              usageEn:
                "A polite way to explain that you’re still getting your bearings.",
              usageEs:
                "Forma cortés de explicar que aún se está familiarizando con el entorno.",
              noteFr:
                "Forme féminine : « Je ne suis pas encore habituée ».",
              noteEn:
                "Feminine form: « Je ne suis pas encore habituée ».",
              noteEs:
                "Forma femenina: « Je ne suis pas encore habituée » (« Todavía no estoy acostumbrada »).",
            },
            {
              id: "p10",
              frQuebec: "Peux-tu me montrer rapidement ?",
              english: "Can you show me quickly?",
              spanish: "¿Puedes mostrármelo rápido?",
              register: "informal",
              usageFr:
                "Avec un collègue avec qui vous êtes déjà au « tu ».",
              usageEn:
                "With a coworker you’re already on « tu » terms with.",
              usageEs:
                "Con un compañero con el que ya se trata de « tu ».",
              noteFr:
                "Si vous êtes encore au « vous » : « Pouvez-vous me montrer rapidement ? ».",
              noteEn:
                "If you’re still on « vous »: « Pouvez-vous me montrer rapidement ? ».",
              noteEs:
                "Si todavía se tratan de « vous »: « Pouvez-vous me montrer rapidement ? » (forma cortés).",
            },
            {
              id: "p11",
              frQuebec: "Je te remercie.",
              english: "Thank you (« tu » form).",
              spanish: "Te lo agradezco. (forma « tu »)",
              register: "informal",
              usageFr:
                "Léger et chaleureux, avec un collègue que vous tutoyez.",
              usageEn:
                "Light and warm, with a coworker you’re using « tu » with.",
              usageEs:
                "Suave y cálido, con un compañero al que ya tutea en francés.",
              noteFr:
                "Forme « vous » : « Je vous remercie ».",
              noteEn:
                "« Vous » form: « Je vous remercie ».",
              noteEs:
                "Forma « vous »: « Je vous remercie » (« Se lo agradezco »).",
            },
            {
              id: "p12",
              frQuebec: "Merci, c’est apprécié.",
              english: "Thanks, that’s appreciated.",
              spanish: "Gracias, lo agradezco.",
              register: "neutral",
              usageFr:
                "Quand quelqu’un vous rend service — discret et sincère.",
              usageEn:
                "When someone helps you out — understated and sincere.",
              usageEs:
                "Cuando alguien le hace un favor — discreto y sincero.",
              noteFr:
                "Très québécois ; sonne naturel à l’oral comme à l’écrit.",
              noteEn:
                "Very Quebec-flavoured; sounds natural in both speech and writing.",
              noteEs:
                "Muy quebequense; suena natural tanto al hablar como al escribir.",
            },
            {
              id: "p13",
              frQuebec: "À tantôt.",
              english: "See you later (today).",
              spanish: "Hasta luego (hoy mismo).",
              register: "informal",
              usageFr:
                "Pour dire « à plus tard dans la même journée » entre collègues.",
              usageEn:
                "To say « see you later today » between coworkers.",
              usageEs:
                "Para decir « hasta más tarde, en el mismo día » entre compañeros.",
              noteFr:
                "Très québécois. Veut dire « plus tard aujourd’hui », pas « bientôt ».",
              noteEn:
                "Very Quebec-flavoured. Means « later today », not « soon ».",
              noteEs:
                "Muy quebequense. En Quebec « À tantôt » significa « más tarde hoy », no « pronto » ni « hasta pronto ».",
            },
            {
              id: "p14",
              frQuebec: "Bonne journée.",
              english: "Have a good day.",
              spanish: "Que tengas un buen día. / Que tenga buen día.",
              register: "neutral",
              usageFr:
                "Sortie polie et chaleureuse, à toute heure de la journée.",
              usageEn:
                "A polite and warm goodbye, at any time of day.",
              usageEs:
                "Despedida cortés y cálida, a cualquier hora del día.",
              noteFr:
                "Universel et toujours bien reçu, peu importe le « tu » ou le « vous ».",
              noteEn:
                "Universal and always well received, whatever the « tu » / « vous » choice.",
              noteEs:
                "Universal y siempre bien recibido, sea cual sea la opción « tu » o « vous ».",
            },
          ],
          miniDialogues: [
            {
              id: "d-reception",
              titleFr: "À l’accueil",
              titleEn: "At reception",
              titleEs: "En la recepción",
              contextFr:
                "Vous arrivez à l’accueil le matin de votre première journée. Une personne à la réception vous accueille.",
              contextEn:
                "You arrive at reception on the morning of your first day. Someone at the front desk greets you.",
              contextEs:
                "Llega a la recepción la mañana de su primer día. La persona de recepción le da la bienvenida.",
              lines: [
                {
                  speakerFr: "Réceptionniste",
                  speakerEn: "Receptionist",
                  speakerEs: "Recepcionista",
                  frQuebec: "Bonjour ! Bienvenue. Je peux vous aider ?",
                  english: "Hello! Welcome. Can I help you?",
                  spanish: "¡Hola! Bienvenido/a. ¿Le puedo ayudar?",
                  noteFr:
                    "« Vous » est la norme à l’accueil — registre poli et neutre.",
                  noteEn:
                    "« Vous » is the norm at reception — polite, neutral register.",
                  noteEs:
                    "« Vous » es la norma en recepción — registro cortés y neutro.",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec:
                    "Bonjour. Je commence aujourd’hui dans l’équipe. C’est mon premier jour.",
                  english:
                    "Hello. I’m starting today on the team. It’s my first day.",
                  spanish:
                    "Hola. Empiezo hoy en el equipo. Es mi primer día.",
                },
                {
                  speakerFr: "Réceptionniste",
                  speakerEn: "Receptionist",
                  speakerEs: "Recepcionista",
                  frQuebec:
                    "Parfait. Je préviens votre responsable. Vous pouvez vous installer en attendant.",
                  english:
                    "Perfect. I’ll let your team lead know. You can have a seat in the meantime.",
                  spanish:
                    "Perfecto. Aviso a su responsable. Puede sentarse mientras tanto.",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec: "Merci, c’est apprécié.",
                  english: "Thank you, that’s appreciated.",
                  spanish: "Gracias, lo agradezco.",
                },
              ],
            },
            {
              id: "d-collegue",
              titleFr: "Premier collègue",
              titleEn: "First coworker",
              titleEs: "Primer compañero",
              contextFr:
                "Un collègue passe près de votre poste et engage la conversation pour vous accueillir.",
              contextEn:
                "A coworker walks by your desk and starts a conversation to welcome you.",
              contextEs:
                "Un compañero pasa cerca de su puesto y le da la bienvenida.",
              lines: [
                {
                  speakerFr: "Collègue",
                  speakerEn: "Coworker",
                  speakerEs: "Compañero",
                  frQuebec: "Allô ! Tu dois être la nouvelle personne, non ?",
                  english: "Hey! You must be the new person, right?",
                  spanish: "¡Hola! Tú debes de ser la nueva persona, ¿no?",
                  noteFr:
                    "« Allô » + tutoiement direct — très typique entre collègues au Québec.",
                  noteEn:
                    "« Allô » + immediate « tu » — very typical between coworkers in Quebec.",
                  noteEs:
                    "« Allô » + tuteo directo — muy típico entre compañeros en Quebec.",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec:
                    "Oui, je commence aujourd’hui. Enchanté, je suis nouveau dans l’équipe.",
                  english:
                    "Yes, I’m starting today. Nice to meet you, I’m new on the team.",
                  spanish:
                    "Sí, empiezo hoy. Mucho gusto, soy nuevo en el equipo.",
                },
                {
                  speakerFr: "Collègue",
                  speakerEn: "Coworker",
                  speakerEs: "Compañero",
                  frQuebec:
                    "Bienvenue ! Tu peux me tutoyer, on est pas mal informels ici.",
                  english:
                    "Welcome! You can call me « tu », we’re pretty informal here.",
                  spanish:
                    "¡Bienvenido! Puedes tutearme en francés, aquí somos bastante informales.",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec:
                    "Avec plaisir. Peux-tu me montrer rapidement où est la salle de réunion ?",
                  english:
                    "Gladly. Can you show me quickly where the meeting room is?",
                  spanish:
                    "Con mucho gusto. ¿Puedes mostrarme rápido dónde está la sala de reuniones?",
                },
              ],
            },
            {
              id: "d-responsable",
              titleFr: "Responsable d’équipe",
              titleEn: "Team lead",
              titleEs: "Responsable del equipo",
              contextFr:
                "Votre responsable d’équipe vient se présenter quelques minutes plus tard.",
              contextEn:
                "Your team lead comes by a few minutes later to introduce themselves.",
              contextEs:
                "Su responsable del equipo se acerca unos minutos más tarde para presentarse.",
              lines: [
                {
                  speakerFr: "Responsable",
                  speakerEn: "Team lead",
                  speakerEs: "Responsable",
                  frQuebec:
                    "Bonjour, je suis Marie, la responsable de l’équipe. Bienvenue !",
                  english:
                    "Hello, I’m Marie, the team lead. Welcome!",
                  spanish:
                    "Hola, soy Marie, la responsable del equipo. ¡Bienvenido/a!",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec:
                    "Bonjour Marie, enchanté. Je suis content d’être ici.",
                  english:
                    "Hello Marie, nice to meet you. I’m glad to be here.",
                  spanish:
                    "Hola Marie, mucho gusto. Me alegra estar aquí.",
                  noteFr:
                    "Présentation par le prénom — beaucoup de gestionnaires québécois fonctionnent comme ça.",
                  noteEn:
                    "First-name introduction — many Quebec managers operate this way.",
                  noteEs:
                    "Presentación con el nombre de pila — muchas personas que dirigen equipos en Quebec lo hacen así.",
                },
                {
                  speakerFr: "Responsable",
                  speakerEn: "Team lead",
                  speakerEs: "Responsable",
                  frQuebec:
                    "Si tu as des questions aujourd’hui, n’hésite pas. On prendra cinq minutes en fin de journée pour faire le point.",
                  english:
                    "If you have any questions today, don’t hesitate. We’ll take five minutes at the end of the day to check in.",
                  spanish:
                    "Si tienes preguntas hoy, no dudes en decírmelo. Al final del día tomaremos cinco minutos para hacer un balance.",
                },
                {
                  speakerFr: "Vous",
                  speakerEn: "You",
                  speakerEs: "Usted",
                  frQuebec:
                    "Parfait. Je ne suis pas encore habitué au système, j’aurai sûrement quelques questions de base.",
                  english:
                    "Perfect. I’m not yet used to the system, I’ll likely have a few basic questions.",
                  spanish:
                    "Perfecto. Todavía no estoy acostumbrado al sistema, seguramente tendré algunas preguntas básicas.",
                  noteFr:
                    "Vous miroitez le « tu » qu’elle utilise — choix le plus naturel ici.",
                  noteEn:
                    "You mirror the « tu » she’s using — the most natural choice here.",
                  noteEs:
                    "Aquí imita el « tu » que ella usa con usted — la opción más natural en este contexto.",
                },
              ],
            },
          ],
          tuVousPractice: [
            {
              id: "tv1",
              situationFr:
                "Vous écrivez votre premier courriel aux ressources humaines pour confirmer votre date de début.",
              situationEn:
                "You’re writing your first email to HR to confirm your start date.",
              situationEs:
                "Escribe su primer correo a recursos humanos para confirmar la fecha de inicio.",
              safestChoice: "vous",
              explanationFr:
                "Premier contact écrit avec un service que vous ne connaissez pas — « vous » est le choix le plus sûr et le plus respectueux.",
              explanationEn:
                "First written contact with a service you don’t know yet — « vous » is the safest and most respectful choice.",
              explanationEs:
                "Primer contacto escrito con un servicio que aún no conoce — « vous » es la opción más segura y respetuosa, parecida al « usted » en español.",
            },
            {
              id: "tv2",
              situationFr:
                "Un collègue de votre âge vous croise dans la cuisine et lance un « Salut ! » détendu.",
              situationEn:
                "A coworker your age passes you in the kitchen and lets out a relaxed « Salut! ».",
              situationEs:
                "Un compañero de su edad le cruza en la cocina y suelta un « Salut! » relajado.",
              safestChoice: "tu",
              explanationFr:
                "Le ton est déjà fixé — répondre au « tu » garde le rythme naturel et chaleureux.",
              explanationEn:
                "The tone is already set — replying with « tu » keeps the natural, warm rhythm.",
              explanationEs:
                "El tono ya está fijado — responder con « tu » mantiene el ritmo natural y cálido. En Quebec este « tu » se siente como un trato profesional cercano, no irrespetuoso.",
            },
            {
              id: "tv3",
              situationFr:
                "Votre nouvelle gestionnaire se présente avec son prénom seulement.",
              situationEn:
                "Your new manager introduces themselves with their first name only.",
              situationEs:
                "Su nueva responsable se presenta solo con su nombre de pila.",
              safestChoice: "follow",
              explanationFr:
                "Présentation par le prénom signale souvent une ouverture — laissez-la fixer le « tu » ou le « vous » dans la phrase suivante, puis mirez-vous.",
              explanationEn:
                "A first-name introduction often signals openness — let them set « tu » or « vous » in the next sentence, then mirror them.",
              explanationEs:
                "Presentarse con el nombre de pila suele indicar apertura — deje que ella elija « tu » o « vous » en la siguiente frase, luego imite ese trato. En la duda, « vous » sigue siendo seguro.",
            },
            {
              id: "tv4",
              situationFr:
                "Vous accueillez un client externe ou parlez à un parent d’élève (selon votre milieu).",
              situationEn:
                "You greet an external client or speak with a parent (depending on your workplace).",
              situationEs:
                "Atiende a un cliente externo o habla con un padre o madre de un estudiante (según el sector).",
              safestChoice: "vous",
              explanationFr:
                "Contexte externe — « vous » par défaut, même si la personne décide ensuite de basculer.",
              explanationEn:
                "External context — « vous » by default, even if the person later decides to switch.",
              explanationEs:
                "Contexto externo — « vous » por defecto, aunque luego la persona decida cambiar a « tu ».",
            },
            {
              id: "tv5",
              situationFr:
                "Pendant un dîner d’équipe détendu, tout le monde se tutoie autour de la table.",
              situationEn:
                "During a relaxed team lunch, everyone is using « tu » around the table.",
              situationEs:
                "Durante un almuerzo de equipo relajado, todos se tutean alrededor de la mesa.",
              safestChoice: "tu",
              explanationFr:
                "Contexte social informel et collectif — « tu » est aligné avec le reste du groupe.",
              explanationEn:
                "Informal, collective social setting — « tu » aligns with the rest of the group.",
              explanationEs:
                "Contexto social informal y colectivo — « tu » se alinea con el resto del grupo y mantiene el ambiente cordial.",
            },
          ],
          quizQuestions: [
            {
              id: "q1",
              promptFr:
                "Vous arrivez à l’accueil pour votre première matinée. Quelle salutation passe le mieux ?",
              promptEn:
                "You arrive at reception on your first morning. Which greeting works best?",
              promptEs:
                "Llega a recepción en su primera mañana. ¿Qué saludo funciona mejor?",
              options: [
                {
                  id: "q1a",
                  targetFr: "Salut, ça roule ?",
                  glossEn: "Very informal: « Hi, how’s it rolling? »",
                  glossEs: "Muy informal: « Hola, ¿cómo va? »",
                },
                {
                  id: "q1b",
                  targetFr:
                    "Bonjour. Je commence aujourd’hui, c’est ma première journée.",
                  glossEn:
                    "Polite and direct: « Hello. I’m starting today, it’s my first day. »",
                  glossEs:
                    "Cortés y directo: « Hola. Empiezo hoy, es mi primer día. »",
                },
                {
                  id: "q1c",
                  targetFr: "Comme vous êtes aimable de vous adresser à moi.",
                  glossEn: "Stilted / over-formal.",
                  glossEs: "Forzado / demasiado formal.",
                },
                {
                  id: "q1d",
                  targetFr: "Au revoir.",
                  glossEn: "Goodbye — wrong moment.",
                  glossEs: "Adiós — momento equivocado.",
                },
              ],
              correctOptionId: "q1b",
              explanationFr:
                "« Bonjour » + une phrase courte qui explique pourquoi vous êtes là — clair, poli, et facile à comprendre pour la personne à l’accueil.",
              explanationEn:
                "« Bonjour » + a short sentence explaining why you’re there — clear, polite, and easy for the receptionist to act on.",
              explanationEs:
                "« Bonjour » + una frase corta que explica por qué está allí — claro, cortés y fácil de procesar para la persona de recepción.",
            },
            {
              id: "q2",
              promptFr:
                "Votre responsable se présente avec son prénom seulement. Quelle approche est la plus sûre ?",
              promptEn:
                "Your team lead introduces themselves with their first name only. Which approach is safest?",
              promptEs:
                "Su responsable se presenta solo con su nombre de pila. ¿Qué opción es la más segura?",
              options: [
                {
                  id: "q2a",
                  targetFr: "Je passe tout de suite au « tu » sans vérifier.",
                  glossEn: "Switch to « tu » immediately without checking.",
                  glossEs: "Pasar enseguida al « tu » sin comprobarlo.",
                },
                {
                  id: "q2b",
                  targetFr:
                    "Je reste au « vous » jusqu’à ce qu’on me propose le « tu », ou je suis le ton de l’autre personne.",
                  glossEn:
                    "Stay on « vous » until they suggest « tu », or follow their tone.",
                  glossEs:
                    "Mantener el « vous » hasta que ella proponga el « tu », o imitar su tono.",
                },
                {
                  id: "q2c",
                  targetFr:
                    "J’insiste pour dire « Madame » ou « Monsieur » toute la journée.",
                  glossEn: "Insist on « Madame » / « Monsieur » all day.",
                  glossEs:
                    "Insistir en « Madame » / « Monsieur » todo el día.",
                },
                {
                  id: "q2d",
                  targetFr:
                    "J’évite de parler jusqu’à être absolument certain.",
                  glossEn: "Avoid speaking until you’re absolutely sure.",
                  glossEs: "Evitar hablar hasta tener total certeza.",
                },
              ],
              correctOptionId: "q2b",
              explanationFr:
                "Suivre la personne en face de vous est presque toujours la bonne stratégie au Québec. Si elle vous tutoie, vous pouvez mirer ; sinon, restez sur « vous » sans drame.",
              explanationEn:
                "Following the person in front of you is almost always the right Quebec strategy. If they use « tu » with you, you can mirror; if not, stay on « vous » without making a fuss.",
              explanationEs:
                "Imitar el trato que usa la otra persona es casi siempre la mejor estrategia en Quebec. Si ella le tutea, puede tutearla también; si no, mantenga « vous » sin hacer un drama.",
            },
            {
              id: "q3",
              promptFr:
                "Vous ne savez pas où se trouve la salle de réunion. Comment demander à un collègue déjà au « tu » avec vous ?",
              promptEn:
                "You don’t know where the meeting room is. How do you ask a coworker who’s already on « tu » terms with you?",
              promptEs:
                "No sabe dónde está la sala de reuniones. ¿Cómo preguntárselo a un compañero con el que ya se trata de « tu »?",
              options: [
                {
                  id: "q3a",
                  targetFr: "Vous voudrez bien m’indiquer la salle de réunion.",
                  glossEn: "Stilted / over-formal.",
                  glossEs: "Forzado / demasiado formal.",
                },
                {
                  id: "q3b",
                  targetFr:
                    "Je cherche la salle de réunion, peux-tu me montrer rapidement ?",
                  glossEn: "Natural, already in « tu ».",
                  glossEs: "Natural, ya en « tu ».",
                },
                {
                  id: "q3c",
                  targetFr: "Salle réunion où ?",
                  glossEn: "Too telegraphic.",
                  glossEs: "Demasiado telegráfico.",
                },
                {
                  id: "q3d",
                  targetFr: "Je suis perdu, je vais partir.",
                  glossEn: "Avoidant — wrong reaction.",
                  glossEs: "Evasivo — reacción equivocada.",
                },
              ],
              correctOptionId: "q3b",
              explanationFr:
                "Phrase complète, naturelle, et déjà au « tu » — c’est exactement le ton attendu entre collègues qui se tutoient.",
              explanationEn:
                "A full, natural sentence, already in « tu » — exactly the tone expected between coworkers using « tu ».",
              explanationEs:
                "Frase completa, natural y ya en « tu » — es justo el tono esperado entre compañeros que se tutean en francés de Quebec.",
            },
            {
              id: "q4",
              promptFr:
                "Un collègue vous dit : « Tu peux me tutoyer. » Que veut-il dire ?",
              promptEn:
                "A coworker says to you: « Tu peux me tutoyer. » What do they mean?",
              promptEs:
                "Un compañero le dice: « Tu peux me tutoyer. » ¿Qué quiere decir?",
              options: [
                {
                  id: "q4a",
                  targetFr: "Ça veut dire : « Appelle-moi au téléphone. »",
                  glossEn: "Means: « Call me on the phone. »",
                  glossEs: "Significa: « Llámame por teléfono. »",
                },
                {
                  id: "q4b",
                  targetFr:
                    "Ça veut dire : « Tu peux utiliser tu avec moi. »",
                  glossEn: "Means: « You can use tu with me. »",
                  glossEs:
                    "Significa: « Puedes usar tu conmigo en francés. »",
                },
                {
                  id: "q4c",
                  targetFr: "Ça veut dire : « Parle plus doucement. »",
                  glossEn: "Means: « Speak more softly. »",
                  glossEs: "Significa: « Habla más bajo. »",
                },
                {
                  id: "q4d",
                  targetFr: "Ça veut dire : « Je suis fâché. »",
                  glossEn: "Means: « I’m upset. »",
                  glossEs: "Significa: « Estoy molesto. »",
                },
              ],
              correctOptionId: "q4b",
              explanationFr:
                "« Tutoyer » = utiliser « tu ». L’invitation est explicite et chaleureuse — vous pouvez répondre par un naturel « Avec plaisir. ».",
              explanationEn:
                "« Tutoyer » = to use « tu ». The invitation is explicit and warm — you can simply reply « Avec plaisir. ».",
              explanationEs:
                "« Tutoyer » significa « tutear, usar tu » en francés. La invitación es explícita y cálida — puede responder de forma natural con « Avec plaisir. » (« Con mucho gusto. »).",
            },
            {
              id: "q5",
              promptFr:
                "Une collègue quitte le bureau l’après-midi en disant : « À tantôt ! » Que pouvez-vous comprendre ?",
              promptEn:
                "A coworker leaves the office in the afternoon saying « À tantôt! ». What does that suggest?",
              promptEs:
                "Una compañera sale de la oficina por la tarde diciendo « À tantôt! ». ¿Qué entiende usted?",
              options: [
                {
                  id: "q5a",
                  targetFr: "On se voit demain.",
                  glossEn: "We’ll see each other tomorrow.",
                  glossEs: "Nos vemos mañana.",
                },
                {
                  id: "q5b",
                  targetFr: "On se revoit plus tard aujourd’hui.",
                  glossEn: "We’ll see each other again later today.",
                  glossEs:
                    "Nos volvemos a ver más tarde, hoy mismo.",
                },
                {
                  id: "q5c",
                  targetFr: "Je quitte l’entreprise pour de bon.",
                  glossEn: "I’m leaving the company for good.",
                  glossEs: "Me marcho de la empresa para siempre.",
                },
                {
                  id: "q5d",
                  targetFr: "Suis-moi immédiatement.",
                  glossEn: "Follow me immediately.",
                  glossEs: "Sígueme de inmediato.",
                },
              ],
              correctOptionId: "q5b",
              explanationFr:
                "« À tantôt » au Québec veut dire « à plus tard dans la même journée » — c’est un signal informel de retour prochain.",
              explanationEn:
                "« À tantôt » in Quebec means « later today » — an informal signal of a near-future return.",
              explanationEs:
                "En Quebec, « À tantôt » significa « hasta más tarde, en el mismo día », no « hasta pronto » en general — es una señal informal de que volverán a verse durante el día.",
            },
          ],
          reflectionPromptFr:
            "La prochaine fois que vous entrez dans un nouveau milieu de travail, quelle phrase simple pourriez-vous utiliser pour vous présenter sans trop réfléchir ?",
          reflectionPromptEn:
            "Next time you walk into a new workplace, what simple sentence could you use to introduce yourself without overthinking?",
          reflectionPromptEs:
            "La próxima vez que entre en un nuevo lugar de trabajo, ¿qué frase sencilla podría usar para presentarse sin pensarlo demasiado?",
          teacherBridgePromptFr:
            "Quand vous serez prêt, pratiquez ce scénario avec un professeur. Vous pourrez jouer votre première arrivée au travail, recevoir des corrections naturelles et ajuster votre niveau de formalité.",
          teacherBridgePromptEn:
            "When you are ready, practice this scenario with a teacher. You can role-play your first arrival at work, receive natural corrections, and adjust your level of formality.",
          teacherBridgePromptEs:
            "Cuando se sienta listo, practique este escenario con un profesor. Podrá representar su primera llegada al trabajo, recibir correcciones naturales y ajustar su nivel de formalidad.",
        },
      },
      {
        id: "fr-qc-mod1-l2",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Comprendre les consignes simples",
        titleEn: "Understanding simple instructions",
        titleEs: "Entender instrucciones sencillas",
        estimatedMinutes: 12,
        scenarioFr:
          "On vous donne quelques consignes rapides : où ranger une boîte, à quelle heure prendre votre pause, quel formulaire signer. Vous voulez confirmer sans bloquer la chaîne de conversation.",
        scenarioEn:
          "Someone hands you a few quick instructions: where to put a box, what time your break is, which form to sign. You want to confirm without breaking the flow of the conversation.",
        scenarioEs:
          "Le dan algunas instrucciones rápidas: dónde guardar una caja, a qué hora tomar la pausa, qué formulario firmar. Quiere confirmar sin frenar el ritmo de la conversación.",
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
        learningGoalsEs: [
          "identificar los verbos clave de una instrucción",
          "confirmar una instrucción en una frase corta",
          "pedir que la repitan sin sentir vergüenza",
        ],
        samplePhrases: [
          {
            frQuebec: "Tu peux me montrer où c’est ?",
            english: "Can you show me where it is?",
            spanish: "¿Puedes mostrarme dónde está?",
            noteFr:
              "« Tu » entre collègues est la norme courante au Québec, même au travail.",
            noteEn:
              "Using « tu » between coworkers is the everyday norm in Quebec, even at work.",
            noteEs:
              "El « tu » entre compañeros es la norma habitual en Quebec, incluso en el trabajo.",
          },
          {
            frQuebec: "Donc, je dois faire ça avant midi ?",
            english: "So I need to do this before noon?",
            spanish: "Entonces, ¿debo hacer esto antes del mediodía?",
            noteFr: "Reformule pour confirmer — geste très bien vu au Québec.",
            noteEn: "Restate to confirm — very well received in Quebec.",
            noteEs: "Reformular para confirmar es muy bien visto en Quebec.",
          },
          {
            frQuebec: "Pas de problème, je m’en occupe.",
            english: "No problem, I’ll take care of it.",
            spanish: "Sin problema, yo me encargo.",
          },
          {
            frQuebec: "Excuse, je n’ai pas tout saisi. Tu peux répéter ?",
            standardFrench: "Désolé, je n’ai pas bien compris. Vous pouvez répéter ?",
            english: "Sorry, I didn’t fully catch that. Could you repeat?",
            spanish:
              "Perdona, no lo capté del todo. ¿Puedes repetirlo?",
            noteFr:
              "Très naturel et honnête — beaucoup mieux qu’une fausse compréhension.",
            noteEn:
              "Very natural and honest — much better than pretending to understand.",
            noteEs:
              "Muy natural y honesto — mucho mejor que fingir que se entendió.",
          },
        ],
        quizPreview: {
          promptFr: "Quelle phrase confirme une consigne sans la répéter mot à mot ?",
          promptEn:
            "Which sentence confirms an instruction without repeating it word for word?",
          promptEs:
            "¿Qué frase confirma una instrucción sin repetirla palabra por palabra?",
          hintFr:
            "Cherche celle qui commence souvent par « Donc » ou « Si je comprends bien ».",
          hintEn:
            "Look for the one that often starts with « Donc » or « Si je comprends bien ».",
          hintEs:
            "Busque la que suele empezar por « Donc » o « Si je comprends bien ».",
        },
        teacherBridgePromptFr:
          "Pratique avec un prof : demande-lui de te donner cinq mini-consignes à reformuler.",
        teacherBridgePromptEn:
          "Practise with a teacher: ask for five short instructions to restate back.",
        teacherBridgePromptEs:
          "Practique con un profesor: pídale cinco mini-instrucciones para reformular.",
      },
      {
        id: "fr-qc-mod1-l3",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Poser une question sans bloquer",
        titleEn: "Asking a question without freezing up",
        titleEs: "Hacer una pregunta sin bloquearse",
        estimatedMinutes: 11,
        scenarioFr:
          "Vous avez une question, mais vous ne voulez pas paraître perdu. Vous cherchez une formule qui ouvre la conversation, surtout avec quelqu’un que vous connaissez peu.",
        scenarioEn:
          "You have a question but don’t want to look lost. You’re after a phrasing that opens the conversation, especially with someone you don’t know well.",
        scenarioEs:
          "Tiene una pregunta, pero no quiere parecer perdido. Busca una fórmula que abra la conversación, sobre todo con alguien a quien apenas conoce.",
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
        learningGoalsEs: [
          "iniciar una pregunta con un marco que tranquilice",
          "reformular cuando la otra persona no entendió a la primera",
          "mantener el ritmo natural de una conversación quebequense",
        ],
        samplePhrases: [
          {
            frQuebec: "Désolé, j’aurais une petite question.",
            english: "Sorry, I have a quick question.",
            spanish: "Disculpa, tengo una pregunta rápida.",
            noteFr:
              "Très utile pour interrompre poliment sans paraître impatient.",
            noteEn:
              "Very useful to interrupt politely without sounding impatient.",
            noteEs:
              "Muy útil para interrumpir con cortesía sin sonar impaciente.",
          },
          {
            frQuebec: "Comment on dit ça, déjà ?",
            standardFrench: "Comment dit-on cela, déjà ?",
            english: "How do you say that again?",
            spanish: "¿Cómo se dice eso, otra vez?",
            noteFr: "« Déjà » à la fin signale que vous cherchez le mot exact.",
            noteEn:
              "Adding « déjà » at the end signals you’re searching for the exact word.",
            noteEs:
              "Añadir « déjà » al final indica que está buscando la palabra exacta.",
          },
          {
            frQuebec: "Je veux juste être sûr que j’ai bien compris.",
            english: "I just want to make sure I understood correctly.",
            spanish: "Solo quiero asegurarme de que entendí bien.",
          },
          {
            frQuebec: "Si jamais c’est pas clair, dis-moi.",
            standardFrench: "Si ce n’est pas clair, n’hésitez pas à me le dire.",
            english: "If it’s not clear, just let me know.",
            spanish: "Si no queda claro, avísame.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase ouvre poliment une question sans interrompre brusquement ?",
          promptEn:
            "Which sentence opens a question politely without abruptly interrupting?",
          promptEs:
            "¿Qué frase abre una pregunta con cortesía, sin interrumpir bruscamente?",
          hintFr:
            "Pense à un mot d’ouverture doux comme « Désolé » ou « Excuse-moi » suivi d’un cadre court.",
          hintEn:
            "Think of a gentle opener like « Désolé » or « Excuse-moi » followed by a short frame.",
          hintEs:
            "Piense en una apertura suave como « Désolé » o « Excuse-moi » seguida de una frase corta.",
        },
        teacherBridgePromptFr:
          "Avec un prof, simulez 3 mini-questions courantes (heure de réunion, formulaire, lieu).",
        teacherBridgePromptEn:
          "With a teacher, role-play 3 short, common questions (meeting time, form, location).",
        teacherBridgePromptEs:
          "Con un profesor, simule 3 mini-preguntas habituales (hora de reunión, formulario, ubicación).",
      },
      {
        id: "fr-qc-mod1-l4",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Parler de son horaire et de ses disponibilités",
        titleEn: "Talking about your schedule and availability",
        titleEs: "Hablar de su horario y disponibilidad",
        estimatedMinutes: 13,
        scenarioFr:
          "Votre superviseur veut savoir quand vous êtes disponible cette semaine et quelles sont vos contraintes. L’objectif est de répondre avec clarté et flexibilité, sans confusion sur les heures.",
        scenarioEn:
          "Your supervisor wants to know when you’re available this week and what your constraints are. The goal is to answer clearly and flexibly, without confusion about hours.",
        scenarioEs:
          "Su responsable quiere saber cuándo está disponible esta semana y qué limitaciones tiene. El objetivo es responder con claridad y flexibilidad, sin confusiones sobre las horas.",
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
        learningGoalsEs: [
          "expresar una franja horaria de forma natural",
          "indicar una limitación sin sonar inflexible",
          "proponer una alternativa de manera respetuosa",
        ],
        samplePhrases: [
          {
            frQuebec: "Je suis disponible du lundi au mercredi.",
            english: "I’m available from Monday to Wednesday.",
            spanish: "Estoy disponible de lunes a miércoles.",
          },
          {
            frQuebec: "Le matin, ça me va. Après-midi, c’est plus serré.",
            english: "Mornings work for me. Afternoons are tighter.",
            spanish: "Por la mañana me va bien. Por la tarde está más justo.",
            noteFr:
              "« C’est plus serré » est une façon souple de dire « j’ai moins de marge ».",
            noteEn:
              "« C’est plus serré » is a flexible way to say « I have less room to move ».",
            noteEs:
              "« C’est plus serré » es una forma suave de decir « tengo menos margen ».",
          },
          {
            frQuebec: "Est-ce qu’on pourrait plutôt regarder jeudi ?",
            standardFrench: "Pourrions-nous plutôt envisager jeudi ?",
            english: "Could we look at Thursday instead?",
            spanish: "¿Podríamos mirar el jueves en su lugar?",
          },
          {
            frQuebec: "Je te confirme ça d’ici demain.",
            english: "I’ll confirm with you by tomorrow.",
            spanish: "Te lo confirmo antes de mañana.",
            noteFr: "Bonne pratique : ne jamais s’engager sans vérifier.",
            noteEn: "Best practice: never commit without checking first.",
            noteEs:
              "Buena práctica: nunca comprometerse sin verificar primero.",
          },
        ],
        quizPreview: {
          promptFr: "Quelle phrase exprime une disponibilité partielle sans fermer la porte ?",
          promptEn:
            "Which sentence shows partial availability without shutting the door?",
          promptEs:
            "¿Qué frase expresa una disponibilidad parcial sin cerrar la puerta?",
          hintFr:
            "Cherche une phrase qui combine « ça me va » et une nuance comme « plus serré ».",
          hintEn:
            "Look for a sentence that combines « ça me va » with a soft caveat like « plus serré ».",
          hintEs:
            "Busque una frase que combine « ça me va » con un matiz suave como « plus serré ».",
        },
        teacherBridgePromptFr:
          "Demande à un prof de te faire répéter ton horaire-type avec différentes contraintes.",
        teacherBridgePromptEn:
          "Ask a teacher to help you rehearse your typical schedule with various constraints.",
        teacherBridgePromptEs:
          "Pídale a un profesor que le ayude a practicar su horario típico con distintas limitaciones.",
      },
      {
        id: "fr-qc-mod1-l5",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Gérer une petite incompréhension",
        titleEn: "Handling a small misunderstanding",
        titleEs: "Gestionar un pequeño malentendido",
        estimatedMinutes: 11,
        scenarioFr:
          "Quelqu’un comprend autre chose que ce que vous vouliez dire. Vous voulez clarifier sans faire perdre la face à votre interlocuteur ni à vous-même.",
        scenarioEn:
          "Someone hears something different from what you meant. You want to clarify without making your conversation partner — or yourself — lose face.",
        scenarioEs:
          "Alguien entiende otra cosa de lo que usted quería decir. Quiere aclararlo sin hacer quedar mal a la otra persona ni a usted.",
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
        learningGoalsEs: [
          "corregir una mala interpretación con calma",
          "comprobar lo que la otra persona ha entendido",
          "mantener un tono cálido a pesar de la fricción",
        ],
        samplePhrases: [
          {
            frQuebec: "Désolé, je me suis mal expliqué.",
            english: "Sorry, I didn’t explain that well.",
            spanish: "Perdona, no me he explicado bien.",
            noteFr:
              "Reprendre la responsabilité désamorce vite la situation au Québec.",
            noteEn:
              "Taking responsibility quickly defuses the situation in Quebec culture.",
            noteEs:
              "Asumir la responsabilidad relaja rápidamente la situación en la cultura quebequense.",
          },
          {
            frQuebec: "Ce que je voulais dire, c’est plutôt …",
            english: "What I meant to say is more like …",
            spanish: "Lo que quería decir es más bien …",
          },
          {
            frQuebec: "Est-ce que ça fait du sens, là ?",
            standardFrench: "Est-ce que cela vous semble cohérent ?",
            english: "Does that make sense now?",
            spanish: "¿Tiene sentido ahora?",
            noteFr:
              "« Ça fait du sens » est une formule québécoise très répandue (calque de l’anglais accepté à l’oral).",
            noteEn:
              "« Ça fait du sens » is a very common Quebec phrasing (an Anglicism that is fully accepted in spoken use).",
            noteEs:
              "« Ça fait du sens » es una expresión muy habitual en Quebec (anglicismo plenamente aceptado en el habla).",
          },
          {
            frQuebec: "Pas de souci, on prend le temps qu’il faut.",
            english: "No worries, we’ll take the time we need.",
            spanish: "Sin problema, tomaremos el tiempo que haga falta.",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase corrige une incompréhension sans blâmer l’autre personne ?",
          promptEn:
            "Which sentence fixes a misunderstanding without blaming the other person?",
          promptEs:
            "¿Qué frase corrige un malentendido sin culpar a la otra persona?",
          hintFr:
            "Cherche une phrase qui commence par « Désolé » ou « Ce que je voulais dire ».",
          hintEn:
            "Look for one that starts with « Désolé » or « Ce que je voulais dire ».",
          hintEs:
            "Busque una que empiece por « Désolé » o « Ce que je voulais dire ».",
        },
        teacherBridgePromptFr:
          "Pratique avec un prof : reproduisez 2 mini-incompréhensions et reformulez ensemble.",
        teacherBridgePromptEn:
          "Practise with a teacher: re-enact 2 small misunderstandings and rephrase together.",
        teacherBridgePromptEs:
          "Practique con un profesor: reproduzcan 2 malentendidos breves y reformulen juntos.",
      },
      {
        id: "fr-qc-mod1-l6",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Prendre un rendez-vous ou confirmer une information",
        titleEn: "Booking an appointment or confirming information",
        titleEs: "Pedir una cita o confirmar una información",
        estimatedMinutes: 14,
        scenarioFr:
          "Vous appelez ou écrivez pour fixer un rendez-vous, ou pour confirmer une information importante (un horaire, une adresse, un document à apporter). Vous voulez sortir de l’échange avec une confirmation claire.",
        scenarioEn:
          "You’re calling or writing to set up an appointment, or to confirm important information (a time, an address, a document to bring). You want to leave the exchange with a clear confirmation.",
        scenarioEs:
          "Llama o escribe para concertar una cita, o para confirmar una información importante (una hora, una dirección, un documento que traer). Quiere salir de la conversación con una confirmación clara.",
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
        learningGoalsEs: [
          "abrir una solicitud de cita con naturalidad",
          "leer y repetir una hora o una dirección en francés",
          "obtener una confirmación explícita antes de colgar",
        ],
        samplePhrases: [
          {
            frQuebec: "Bonjour, j’aimerais prendre rendez-vous, s’il vous plaît.",
            english: "Hello, I’d like to book an appointment, please.",
            spanish: "Hola, me gustaría pedir una cita, por favor.",
          },
          {
            frQuebec: "Est-ce que vous avez une plage libre cette semaine ?",
            english: "Do you have an open slot this week?",
            spanish: "¿Tienen una franja libre esta semana?",
            noteFr:
              "« Plage » au sens d’horaire est très courant en français québécois.",
            noteEn:
              "« Plage » meaning time slot is very common in Quebec French.",
            noteEs:
              "« Plage » con el sentido de « franja horaria » es muy habitual en francés de Quebec.",
          },
          {
            frQuebec: "Donc, mardi 14 h, au 1234 rue Sainte-Catherine, c’est ça ?",
            english: "So, Tuesday at 2:00 p.m., at 1234 rue Sainte-Catherine, correct?",
            spanish:
              "Entonces, martes a las 14 h, en 1234 rue Sainte-Catherine, ¿correcto?",
            noteFr: "Toujours redire l’heure, l’adresse et la date — minimise les erreurs.",
            noteEn:
              "Always read back the time, the address, and the date — it minimises mistakes.",
            noteEs:
              "Repita siempre la hora, la dirección y la fecha — minimiza los errores.",
          },
          {
            frQuebec: "Je vais vous envoyer un courriel de confirmation.",
            standardFrench: "Je vais vous envoyer un email de confirmation.",
            english: "I’ll send you a confirmation email.",
            spanish: "Le enviaré un correo de confirmación.",
            noteFr: "Au Québec on dit « courriel », pas « email ».",
            noteEn: "In Quebec the word is « courriel », not « email ».",
            noteEs:
              "En Quebec se dice « courriel », no « email ».",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase confirme une heure ET une adresse en une seule réplique ?",
          promptEn:
            "Which sentence confirms BOTH a time AND an address in a single line?",
          promptEs:
            "¿Qué frase confirma a la vez una hora Y una dirección en una sola intervención?",
          hintFr:
            "Repère celle qui commence par « Donc » et liste plusieurs détails côte à côte.",
          hintEn:
            "Find the one that starts with « Donc » and lists several details side by side.",
          hintEs:
            "Identifique la que empieza por « Donc » y enumera varios detalles seguidos.",
        },
        teacherBridgePromptFr:
          "Avec un prof, simule un appel pour fixer un rendez-vous médical ou administratif.",
        teacherBridgePromptEn:
          "With a teacher, role-play a call to book a medical or administrative appointment.",
        teacherBridgePromptEs:
          "Con un profesor, simule una llamada para concertar una cita médica o administrativa.",
      },
      {
        id: "fr-qc-mod1-l7",
        status: "planned",
        accessStatus: "coming_soon",
        titleFr: "Préparer une première pratique avec un professeur",
        titleEn: "Preparing your first practice with a teacher",
        titleEs: "Preparar la primera práctica con un profesor",
        estimatedMinutes: 12,
        scenarioFr:
          "Vous savez maintenant gérer plusieurs situations courantes au travail. Cette dernière leçon vous aide à préparer votre première vraie séance de pratique avec un professeur Pratiqo : objectifs, sujets, et trois questions à amener.",
        scenarioEn:
          "You can now navigate several common situations at work. This last lesson helps you prepare your first real practice session with a Pratiqo teacher: goals, topics, and three questions to bring along.",
        scenarioEs:
          "Ya sabe manejar varias situaciones comunes en el trabajo. Esta última lección le ayuda a preparar su primera sesión real de práctica con un profesor de Pratiqo: objetivos, temas y tres preguntas para llevar.",
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
        learningGoalsEs: [
          "formular un objetivo claro para la próxima sesión",
          "identificar 3 situaciones prioritarias para practicar",
          "preparar 3 preguntas concretas para el profesor",
        ],
        samplePhrases: [
          {
            frQuebec: "Mon objectif, c’est de mieux comprendre quand on me parle vite.",
            english: "My goal is to better understand when people speak fast.",
            spanish: "Mi objetivo es entender mejor cuando me hablan rápido.",
          },
          {
            frQuebec: "J’aimerais qu’on pratique surtout les rendez-vous au téléphone.",
            english: "I’d like us to practise phone appointments in particular.",
            spanish:
              "Me gustaría que practiquemos sobre todo las citas por teléfono.",
          },
          {
            frQuebec: "Est-ce que tu peux me corriger quand je me trompe ?",
            standardFrench: "Pouvez-vous me corriger lorsque je me trompe ?",
            english: "Can you correct me when I make a mistake?",
            spanish: "¿Puedes corregirme cuando me equivoco?",
            noteFr: "Demander explicitement la correction est très bien vu.",
            noteEn:
              "Asking for corrections explicitly is very well received by teachers.",
            noteEs:
              "Pedir las correcciones de forma explícita es muy bien recibido por los profesores.",
          },
          {
            frQuebec: "Comment je peux pratiquer entre nos séances ?",
            english: "How can I practise between our sessions?",
            spanish: "¿Cómo puedo practicar entre nuestras sesiones?",
          },
        ],
        quizPreview: {
          promptFr:
            "Quelle phrase exprime un objectif personnel clair pour une séance ?",
          promptEn:
            "Which sentence expresses a clear personal goal for a session?",
          promptEs:
            "¿Qué frase expresa un objetivo personal claro para una sesión?",
          hintFr:
            "Cherche une phrase qui commence par « Mon objectif » et nomme une situation précise.",
          hintEn:
            "Look for one that starts with « Mon objectif » and names a specific situation.",
          hintEs:
            "Busque una que empiece por « Mon objectif » y mencione una situación concreta.",
        },
        teacherBridgePromptFr:
          "Réservez une première séance Pratiqo pour passer ces 7 mini-scénarios à voix haute.",
        teacherBridgePromptEn:
          "Book a first Pratiqo session to run these 7 mini-scenarios out loud.",
        teacherBridgePromptEs:
          "Reserve una primera sesión en Pratiqo para repasar estos 7 miniescenarios en voz alta.",
      },
    ],
  };
