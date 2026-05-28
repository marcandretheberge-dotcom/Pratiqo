/**
 * YoPratiqo — bilingual UI chrome strings.
 *
 * Anything that is rendered by the Yo components themselves (button
 * labels, status copy, completion messages, accessibility text, …) and
 * that is NOT part of the lesson data lives here.
 *
 * Per-component subtree (`hero`, `path`, `card`, …) keeps related strings
 * grouped so each component imports only what it needs. Every key holds a
 * `YoLocalizedString` so consumers can pass the value straight to `t()`.
 *
 * Spanish strings are NEVER stored here — they live in the lesson data
 * as plain strings and are rendered with `lang="es"`.
 */

import type { YoLocalizedString } from "@/lib/yo/types";
import { lstr } from "@/lib/yo/localize";

export const YO_COPY = {
  // ── Hero (above the fold) ─────────────────────────────────────────────
  hero: {
    levelBadge: lstr("Niveau A1 · Débutant", "Level A1 · Beginner"),
    travelReady: lstr("Travel-ready en 1h", "Travel-ready in 1h"),
    nativeAudio: lstr("Audio natif", "Native audio"),
  },

  // ── Lesson path (numbered roadmap) ────────────────────────────────────
  path: {
    title: lstr("Ton parcours", "Your path"),
    intro: lstr(
      "Commence par l’Intro · déblocage des autres étapes en payant une fois",
      "Start with the Intro — the other steps unlock with a single payment",
    ),
    cmdStart: lstr("Commencer", "Start"),
    cmdLocked: lstr("Verrouillé", "Locked"),
    lessonAria: lstr("Leçon", "Lesson"),
  },

  // ── Intro progress strip ──────────────────────────────────────────────
  progress: {
    badge: lstr("Intro gratuite", "Free intro"),
  },

  // ── Intro cards section ───────────────────────────────────────────────
  intro: {
    sectionTitlePrefix: lstr("Intro · ", "Intro · "),
    metaLine: lstr("4 mini-modules · ~12 min", "4 mini-modules · ~12 min"),
    nudge: lstr(
      "Choisis une section au-dessus pour explorer la leçon.",
      "Pick a section above to dive into the lesson.",
    ),
  },

  // ── Detailed section panel ────────────────────────────────────────────
  panel: {
    sectionLabel: lstr("Section · niveau A1", "Section · level A1"),
    closeAria: lstr("Fermer la section", "Close section"),
    highlightLabel: lstr("À retenir", "Worth remembering"),
    learningNotePrefix: lstr("À noter — ", "Note — "),
    vocabularyHeading: lstr("Vocabulaire", "Vocabulary"),
    miniMissionFallbackTitle: lstr("Mini mission", "Mini mission"),
    miniMissionFootnote: lstr(
      "Phase 1 : choix libre, sans correction.",
      "Phase 1: free choice, no scoring.",
    ),
  },

  // ── Dominican dictionary ──────────────────────────────────────────────
  dictionary: {
    title: lstr(
      "Dictionnaire dominicain de poche",
      "Pocket Dominican dictionary",
    ),
    subtitle: lstr(
      "Des expressions locales utiles, filtrées pour le niveau A1.",
      "Useful local expressions, filtered for level A1.",
    ),
    safetyChip: lstr("Niveau A1 · sans vulgarité", "Level A1 · no profanity"),
    expressionAriaConnector: lstr("signifie", "means"),
  },

  // ── Flashcards ────────────────────────────────────────────────────────
  flash: {
    title: lstr("Flashcards intelligentes", "Smart flashcards"),
    subtitle: lstr(
      "Démo · révision SM-2 dans le programme complet",
      "Demo · SM-2 review in the full program",
    ),
    progressLabel: lstr("Carte", "Card"),
    of: lstr("/", "/"),
    cardFaceFront: lstr("Carte", "Card"),
    cardFaceBack: lstr("Traduction", "Translation"),
    flipHint: lstr("Retourner", "Flip"),
    flipCta: lstr(
      "Touche la carte pour voir la traduction.",
      "Tap the card to reveal the translation.",
    ),
    ratingPrompt: lstr("Comment c’était ?", "How did it go?"),
    ratingHard: lstr("Difficile", "Hard"),
    ratingGood: lstr("Correct", "Good"),
    ratingEasy: lstr("Facile", "Easy"),
    feedbackHard: lstr(
      "Cette carte reviendra bientôt.",
      "This card will come back soon.",
    ),
    feedbackGood: lstr("Bon effort.", "Nice effort."),
    feedbackEasy: lstr(
      "Maîtrisé pour aujourd’hui.",
      "Mastered for today.",
    ),
    idleHint: lstr(
      "Pas de pression : retourne la carte d’abord si tu as besoin de voir la réponse.",
      "No pressure — flip the card first if you need to see the answer.",
    ),
    next: lstr("Carte suivante", "Next card"),
    finish: lstr("Terminer", "Finish"),
    retryCard: lstr("Réessayer cette carte", "Retry this card"),
    restart: lstr("Recommencer", "Restart"),
    completionTitle: lstr(
      "Tu as terminé cette mini-révision.",
      "You finished this mini review.",
    ),
    completionBody: lstr(
      "Dans le programme complet, l’algorithme SM-2 te ramène les cartes difficiles plus souvent et espace les cartes faciles. Tu peux recommencer cette démo autant de fois que tu veux.",
      "In the full program, the SM-2 algorithm brings hard cards back more often and spaces out easy ones. You can run this demo as many times as you like.",
    ),
    completionChip: lstr("cartes vues", "cards seen"),
    flipPressedAriaToFront: lstr("Cacher la traduction de", "Hide translation of"),
    flipPressedAriaToBack: lstr("Voir la traduction de", "See translation of"),
    progressAria: lstr(
      "Progression flashcards",
      "Flashcards progress",
    ),
  },

  // ── Quiz ──────────────────────────────────────────────────────────────
  quiz: {
    title: lstr("Quiz éclair", "Quick quiz"),
    progressPrefix: lstr("Question", "Question"),
    scorePrefix: lstr("Score ·", "Score ·"),
    correct: lstr("Exact !", "Correct!"),
    incorrect: lstr(
      "Pas tout à fait, mais l’erreur est instructive.",
      "Not quite, but the mistake is instructive.",
    ),
    next: lstr("Question suivante", "Next question"),
    seeScore: lstr("Voir mon score", "See my score"),
    completionChip: lstr("Quiz terminé", "Quiz complete"),
    scoreSuffix: lstr(
      "% de bonnes réponses",
      "% correct",
    ),
    readyMessage: lstr(
      "Tu es prêt pour la prochaine étape.",
      "You’re ready for the next step.",
    ),
    completionBody: lstr(
      "Le programme complet contient des quiz beaucoup plus longs, par lesson, avec rappel des questions où tu as buté.",
      "The full program ships much longer quizzes per lesson, with smart recall on the questions you stumbled on.",
    ),
    restart: lstr("Recommencer le quiz", "Restart the quiz"),
    progressAria: lstr("Progression quiz", "Quiz progress"),
  },

  // ── Unlock card ───────────────────────────────────────────────────────
  unlock: {
    eyebrow: lstr("Programme complet", "Full program"),
    title: lstr(
      "Débloquer le programme complet",
      "Unlock the full program",
    ),
    body: lstr(
      "L’Intro est offerte pour t’aider à goûter au format. Le reste du parcours République dominicaine se débloque en un seul paiement.",
      "The Intro is free so you can taste the format. The rest of the Dominican Republic path unlocks with a single payment.",
    ),
    priceEyebrow: lstr("Prix de lancement", "Launch price"),
    subPrice: lstr(
      "Paiement unique",
      "One-time payment",
    ),
    cta: lstr("Continuer", "Continue"),
    trustNote: lstr(
      "Garantie satisfait ou remboursé 30 jours",
      "30-day money-back guarantee",
    ),
  },

  // ── Feature strip (bottom of page) ────────────────────────────────────
  features: {
    defaultTitle: lstr(
      "Ce que YoPratiqo te donne dans la section Voyage",
      "What YoPratiqo gives you in the Travel section",
    ),
  },

  // ── Final CTA (bottom of page) ────────────────────────────────────────
  finalCta: {
    eyebrow: lstr("Prêt pour le terrain ?", "Ready for the real world?"),
    title: lstr(
      "Prêt pour ta première vraie conversation ?",
      "Ready for your first real conversation?",
    ),
    body: lstr(
      "Commence gratuitement l’intro, puis débloque le parcours complet pour arriver en République dominicaine avec confiance.",
      "Start the free intro, then unlock the full path to land in the Dominican Republic with confidence.",
    ),
    cta: lstr("Commencer l’intro", "Start the intro"),
    footnote: lstr(
      "L’intro est offerte · paiement unique pour le reste",
      "Intro is free · single payment for the rest",
    ),
  },

  // ── Language toggle (renders the OPPOSITE locale's label) ─────────────
  locale: {
    toEnglish: lstr("View in English", "View in English"),
    toFrench: lstr("Voir en français", "Voir en français"),
    selectorLabel: lstr("Langue", "Language"),
  },

  // ── Dialogue scenario ────────────────────────────────────────────────
  dialogue: {
    selfFallback: lstr("Toi", "You"),
    hostFallback: lstr("Hôte", "Host"),
  },

  // ── Visuals (rendered inside YoVisuals SVG / chip overlays) ──────────
  visuals: {
    audioComingSoon: lstr("Audio bientôt disponible", "Audio coming soon"),
    visaReady: lstr("Visa-ready", "Visa-ready"),
  },

  // ── Pronunciation (browser SpeechSynthesis MVP) ──────────────────────
  pronunciation: {
    listenLabel: lstr(
      "Écouter la prononciation",
      "Listen to pronunciation",
    ),
    stopLabel: lstr("Arrêter la lecture", "Stop playback"),
    unsupportedLabel: lstr(
      "Audio non supporté par ce navigateur",
      "Audio not supported by this browser",
    ),
  },

  // ── Flashcard autoplay controls ───────────────────────────────────────
  flashAutoplay: {
    play: lstr("Lecture auto", "Autoplay"),
    pause: lstr("Mettre en pause", "Pause"),
    playAria: lstr(
      "Démarrer la lecture automatique des cartes",
      "Start autoplay of the cards",
    ),
    pauseAria: lstr(
      "Mettre en pause la lecture automatique",
      "Pause autoplay",
    ),
    previous: lstr("Carte précédente", "Previous card"),
    nextNeutral: lstr("Carte suivante", "Next card"),
    reducedMotionNote: lstr(
      "Lecture auto désactivée (mouvement réduit détecté).",
      "Autoplay off (reduced motion detected).",
    ),
  },

  // ── Guided reading ────────────────────────────────────────────────────
  reading: {
    eyebrow: lstr("Lecture guidée", "Guided reading"),
    bodyHint: lstr(
      "Lis lentement. Chaque mot souligné est expliqué juste en dessous.",
      "Read slowly. Each highlighted word is explained right below.",
    ),
    vocabHeading: lstr("Mots utiles", "Useful words"),
    quizHeading: lstr("Quiz de compréhension", "Reading quiz"),
    quizIntro: lstr(
      "Trois petites questions pour vérifier ce que tu viens de lire.",
      "Three short questions to check what you just read.",
    ),
    correctChip: lstr("Bonne réponse", "Correct"),
    incorrectChip: lstr("Pas tout à fait", "Not quite"),
    quizProgressAria: lstr(
      "Progression du quiz de lecture",
      "Reading quiz progress",
    ),
    nextQuestion: lstr("Question suivante", "Next question"),
    finishQuiz: lstr("Terminer le quiz", "Finish the quiz"),
    restartQuiz: lstr("Recommencer le quiz", "Restart the quiz"),
    completionTitle: lstr(
      "Tu as terminé la lecture guidée.",
      "You finished the guided reading.",
    ),
    completionBody: lstr(
      "Tu peux relire le texte à voix haute, ou écouter chaque mot avec le bouton audio.",
      "Read the text out loud again, or replay any word using the audio button.",
    ),
  },

  // ── YoPratiqo Coach (deterministic next-step recommendation MVP) ─────
  coach: {
    eyebrow: lstr("YoPratiqo Coach", "YoPratiqo Coach"),
    title: lstr(
      "YoPratiqo Coach — ton prochain pas",
      "YoPratiqo Coach — your next step",
    ),
    body: lstr(
      "Réponds à une courte question et YoPratiqo Coach te suggère quoi pratiquer ensuite.",
      "Answer a short question and YoPratiqo Coach will suggest what to practice next.",
    ),
    question: lstr(
      "Quelle partie était la plus difficile pour toi ?",
      "Which part felt hardest for you?",
    ),
    recommendationHeading: lstr(
      "YoPratiqo Coach te suggère",
      "YoPratiqo Coach suggests",
    ),
    changeAnswer: lstr("Changer ma réponse", "Change my answer"),
    bridgeText: lstr(
      "YoPratiqo Coach t’aide à pratiquer à ton rythme. Un vrai professeur Pratiqo t’aide à parler pour vrai.",
      "YoPratiqo Coach helps you practice at your own pace. A real Pratiqo teacher helps you truly speak.",
    ),
    bridgeCta: lstr(
      "Trouver un professeur",
      "Find a teacher",
    ),
    disclaimer: lstr(
      "Recommandations locales, sans envoi de données.",
      "Local recommendations, no data sent anywhere.",
    ),
  },
} as const satisfies Record<string, Record<string, YoLocalizedString>>;
