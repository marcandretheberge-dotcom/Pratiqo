export const goal = "Francisation au Québec";
export const purpose = "Pratiquer le français pour vivre, travailler ou étudier au Québec.";
export const notice = "Parcours indépendant de YoPratiqo, non affilié à Francisation Québec. Les activités servent à pratiquer le français. Elles ne donnent ni attestation officielle ni preuve de niveau pour une démarche d’immigration.";
export const missionTitle = "Vérifier un nom et des coordonnées";
export const freeCourses = "https://www.quebec.ca/education/apprendre-le-francais";

/** Optional preparation, using only the mission's fictional contact details. */
export const primer = {
  title: "Quelques mots utiles",
  intro: "Avant de commencer, tu peux revoir les mots de la fiche.",
  items: [
    { term: "Prénom", meaning: "Camille est le prénom." },
    { term: "Nom de famille", meaning: "Leduc est le nom de famille." },
    { term: "Téléphone", meaning: "418 555-0161 est le numéro de téléphone de Camille." },
    { term: "Courriel", meaning: "sam.roy@example.org est l’adresse courriel de Sam." },
    { term: "Épeler", meaning: "Dire les lettres une à une : L-E-D-U-C." },
    { term: "Répéter", meaning: "Dire encore une fois : « Vous pouvez me le répéter ? »" },
  ],
  numberOrder: "Six, un → 61. Un, six → 16. L’ordre des chiffres change le numéro.",
} as const;

export const dialogue = [
  ["À l’accueil", "Bonjour ! Vous venez pour l’atelier de cuisine ? À quel nom est la réservation ?"],
  ["Camille", "Bonjour ! C’est au nom de Camille Leduc."],
  ["À l’accueil", "Merci. Pour vous joindre, j’ai le 418 555-0116. C’est bien ça ?"],
  ["Camille", "Presque ! C’est le 418 555-0161. Les deux derniers chiffres sont six, un."],
  ["À l’accueil", "Six, un. Voilà, c’est corrigé !"],
];

export const questions = [
  {
    title: "Repérer le numéro corrigé",
    prompt: "Quel numéro l’accueil doit-il garder pour Camille ?",
    options: ["418 555-0116", "418 555-0161", "418 555-0106"],
    correct: 1,
    hint: "Relis la dernière réponse de Camille. Dans quel ordre dit-elle les deux derniers chiffres ?",
    explanation: "Camille termine par « six, un ». Sa fiche doit finir par 61.",
    feedback: [
      "Ce numéro finit par 16. C’est celui que l’accueil avait noté avant la correction de Camille.",
      "Camille termine par « six, un ». Sa fiche doit finir par 61.",
      "Ce numéro finit par 06. Camille dit « six, un », dans cet ordre.",
    ],
  },
  {
    title: "Vérifier le nom",
    prompt: "Tu joues Camille. La personne à l’accueil a écrit « Camille Ledoux ». Que lui dis-tu ?",
    options: ["C’est Ledoux, L-E-D-O-U-X. Vous pouvez me le répéter ?", "C’est Leduc, L-E-D-U-X. Vous pouvez me le répéter ?", "C’est Leduc, L-E-D-U-C. Vous pouvez me le répéter ?"],
    correct: 2,
    hint: "Compare les deux noms. Choisis la réponse qui corrige le nom et demande une confirmation.",
    explanation: "Camille épelle Leduc, puis demande à l’accueil de confirmer la correction.",
    feedback: [
      "Cette réponse garde Ledoux. Dans le dialogue, Camille donne le nom Leduc.",
      "Le nom Leduc est juste, mais la dernière lettre épelée doit être C, pas X.",
      "Camille épelle Leduc, puis demande à l’accueil de confirmer la correction.",
    ],
  },
  {
    title: "Essayer dans une nouvelle situation",
    prompt: "À la bibliothèque, tu joues Sam Roy. Quelle réponse donne le nom de ta fiche et corrige le courriel que la personne vient de lire ?",
    options: ["Sam Roy. Mon courriel est sam.roy@example.org. On vérifie ensemble ?", "Sam Roy. Mon courriel est sam.ray@example.org. On vérifie ensemble ?", "Sam Roy. Mon courriel est sam.roi@example.org. On vérifie ensemble ?"],
    correct: 0,
    hint: "Regarde les trois lettres entre « sam. » et « @ ». Elles doivent correspondre au nom Roy.",
    explanation: "La fiche indique Roy avec un o, dans le nom comme dans le courriel.",
    feedback: [
      "La fiche indique Roy avec un o, dans le nom comme dans le courriel.",
      "Cette adresse garde ray avec un a. La fiche indique roy avec un o.",
      "Cette adresse écrit roi avec un i. Sur la fiche, Roy se termine par un y.",
    ],
  },
] as const;

// Keep historical wrong-answer wording: a stored index must not become a choice
// that the learner never made when distractors are revised.
const previousOptions = [
  ["418 555-0116", "418 555-0161", "418 555-0106"],
  ["Oui, c’est bien mon numéro.", "Oui, Ledoux, c’est ça.", "C’est Leduc, L-E-D-U-C. Vous pouvez me le répéter ?"],
  ["Sam Roy. Mon courriel est sam.roy@example.org. On vérifie ensemble ?", "Sam Roy. Oui, sam.ray@example.org, c’est bien ça.", "Camille Leduc. Je vous redonne mon téléphone."],
] as const;

// Fixed exercise choices only. Correct indexes and completed steps retain their
// meaning; the first mistake keeps its original option revision for review.
export const storageKey = "yo.francisation-quebec.coordonnees.v1";
export type Progress = {
  active: boolean;
  started: boolean;
  step: number;
  mistakes: (number | null)[];
  mistakeVersions: (1 | 2 | null)[];
  hints: boolean[];
  checked: boolean;
};
export function fresh(): Progress {
  return { active: false, started: false, step: 0, mistakes: [null, null, null], mistakeVersions: [null, null, null], hints: [false, false, false], checked: false };
}

export function mistakeLabel(progress: Progress, questionIndex: number): string | null {
  const answer = progress.mistakes[questionIndex];
  if (answer === null || answer === undefined || !questions[questionIndex]) return null;
  const options = progress.mistakeVersions[questionIndex] === 1 ? previousOptions[questionIndex] : questions[questionIndex].options;
  return options[answer] ?? null;
}

export function recordAnswer(progress: Progress, questionIndex: number, answer: number): Progress {
  const question = questions[questionIndex];
  if (!question || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) return progress;
  const firstMistake = answer !== question.correct && progress.mistakes[questionIndex] === null;
  return {
    ...progress,
    checked: answer === question.correct,
    mistakes: progress.mistakes.map((value, index) => firstMistake && index === questionIndex ? answer : value),
    mistakeVersions: progress.mistakeVersions.map((value, index) => firstMistake && index === questionIndex ? 2 : value),
  };
}

export function restore(raw: string | null): Progress {
  if (!raw || raw.length > 500) return fresh();
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.active === "boolean" && typeof p.started === "boolean"
      && Number.isInteger(p.step) && p.step >= 0 && p.step <= questions.length + 1
      && typeof p.checked === "boolean" && Array.isArray(p.mistakes) && p.mistakes.length === questions.length
      && p.mistakes.every((v: unknown, i: number) => v === null || (typeof v === "number" && Number.isInteger(v)
        && v >= 0 && v < questions[i].options.length && v !== questions[i].correct))
      && (p.mistakeVersions === undefined || (Array.isArray(p.mistakeVersions) && p.mistakeVersions.length === questions.length
        && p.mistakeVersions.every((v: unknown, i: number) => p.mistakes[i] === null ? v === null : v === 1 || v === 2)))
      && Array.isArray(p.hints) && p.hints.length === questions.length && p.hints.every((v: unknown) => typeof v === "boolean")) {
      return { active: p.active, started: p.started, step: p.step, mistakes: p.mistakes,
        mistakeVersions: p.mistakeVersions ?? p.mistakes.map((value: number | null) => value === null ? null : 1),
        hints: p.hints, checked: p.checked };
    }
  } catch { /* Ignore an unreadable draft. */ }
  return fresh();
}
