export const goal = "Francisation au Québec";
export const purpose = "Pratiquer le français pour vivre, travailler ou étudier au Québec.";
export const notice = "Parcours indépendant de YoPratiqo, non affilié à Francisation Québec. Les activités servent à pratiquer le français. Elles ne donnent ni attestation officielle ni preuve de niveau pour une démarche d’immigration.";
export const missionTitle = "Donner mon nom et mes coordonnées";
export const freeCourses = "https://www.quebec.ca/education/apprendre-le-francais";

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
  },
  {
    title: "Vérifier le nom",
    prompt: "Tu joues Camille. La personne à l’accueil a écrit « Camille Ledoux ». Que lui dis-tu ?",
    options: ["Oui, c’est bien mon numéro.", "Oui, Ledoux, c’est ça.", "C’est Leduc, L-E-D-U-C. Vous pouvez me le répéter ?"],
    correct: 2,
    hint: "Compare les deux noms. Choisis la réponse qui corrige le nom et demande une confirmation.",
    explanation: "Camille épelle Leduc, puis demande à l’accueil de confirmer la correction.",
  },
  {
    title: "Essayer dans une nouvelle situation",
    prompt: "À la bibliothèque, tu joues Sam Roy. Quelle réponse donne le nom de ta fiche et corrige le courriel que la personne vient de lire ?",
    options: ["Sam Roy. Mon courriel est sam.roy@example.org. On vérifie ensemble ?", "Sam Roy. Oui, sam.ray@example.org, c’est bien ça.", "Camille Leduc. Je vous redonne mon téléphone."],
    correct: 0,
    hint: "Regarde la lettre après le r dans l’adresse de Sam. Dis le nom et l’adresse de sa fiche.",
    explanation: "La fiche indique Roy avec un o, dans le nom comme dans le courriel.",
  },
] as const;

// Fixed exercise choices only. The first mistake remains available for targeted review.
export const storageKey = "yo.francisation-quebec.coordonnees.v1";
export type Progress = {
  active: boolean;
  started: boolean;
  step: number;
  mistakes: (number | null)[];
  hints: boolean[];
  checked: boolean;
};
export function fresh(): Progress {
  return { active: false, started: false, step: 0, mistakes: [null, null, null], hints: [false, false, false], checked: false };
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
      && Array.isArray(p.hints) && p.hints.length === questions.length && p.hints.every((v: unknown) => typeof v === "boolean")) {
      return { active: p.active, started: p.started, step: p.step, mistakes: p.mistakes, hints: p.hints, checked: p.checked };
    }
  } catch { /* Ignore an unreadable draft. */ }
  return fresh();
}
