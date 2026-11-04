import { buildLearningJourney, type JourneyUnit } from "./learningJourney";
import type { JapaneseCourseProgress } from "./japaneseCourseProgress";
import type { Progress as MandarinProgress } from "./mandarin/types";

export function japaneseJourney(units: JourneyUnit[], progress: JapaneseCourseProgress) {
  return checkedJourney(units, progress.results, progress.lastUnit, unit =>
    Boolean(progress.lastSteps[unit.id]) || progress.lastUnit === unit.id);
}

export function mandarinJourney(units: JourneyUnit[], progress: MandarinProgress) {
  return checkedJourney(units, progress.results, progress.unit, unit =>
    progress.steps[unit.id] !== undefined || progress.unit === unit.id ||
    unit.activityIds.some(id => Boolean(progress.drafts[id])));
}

export function canEnterFoundationStep(journey: ReturnType<typeof checkedJourney>, id: string, finalStarted: boolean) {
  if (id === "bilan") return finalStarted || (journey.steps.length > 0 && journey.steps.every(step => step.passed));
  return journey.steps.some(step => step.unit.id === id && step.unlocked);
}

function checkedJourney(
  units: JourneyUnit[],
  results: Record<string, { passed: boolean; independent: boolean }>,
  resume: string,
  started: (unit: JourneyUnit) => boolean,
) {
  return buildLearningJourney(units, unit => {
    const independent = unit.activityIds.filter(id => results[id]?.independent && results[id]?.passed).length;
    return {
      passed: unit.activityIds.length > 0 && independent === unit.activityIds.length,
      started: started(unit) || unit.activityIds.some(id => Boolean(results[id])),
      practiced: unit.activityIds.filter(id => results[id]?.passed).length,
      independent,
    };
  }, resume);
}

export const foundationJourneyCopy = {
  fr: {
    rule: "Réussis les défis vérifiés de l’étape sans aide affichée pour ouvrir la suivante. Tu peux aller directement aux exercices si tu connais déjà ces bases.",
    passed: "Défis réussis sans aide", checkpoints: "Étapes réussies sans aide",
    proof: "Ces réussites portent sur les exercices proposés, pas sur la conversation libre ni la mémoire à long terme.",
    pending: "Reprends les défis sans aide affichée pour ouvrir la suite.",
  },
  en: {
    rule: "Complete this step’s checked challenges without displayed help to open the next. Go straight to the exercises if you already know these basics.",
    passed: "Challenges passed without help", checkpoints: "Steps passed without help",
    proof: "These results cover the exercises offered, not free conversation or long-term retention.",
    pending: "Revisit the challenges without displayed help to open the next step.",
  },
  es: {
    rule: "Supera los retos verificados de la etapa sin ayuda mostrada para abrir la siguiente. Puedes ir directamente a los ejercicios si ya conoces estas bases.",
    passed: "Retos superados sin ayuda", checkpoints: "Etapas superadas sin ayuda",
    proof: "Estos resultados corresponden a los ejercicios propuestos, no a la conversación libre ni a la memoria a largo plazo.",
    pending: "Retoma los retos sin ayuda mostrada para abrir la siguiente etapa.",
  },
};
