import type { LearningJourney } from "../learningJourney";
import type { YoLocale } from "../types";

type Localized = Record<YoLocale, string>;
export type ItalianWorldCity = { unitId: string; name: string };
export type ItalianWorldDefinition = {
  id: string;
  title: Localized;
  description: Localized;
  cities: readonly ItalianWorldCity[];
};

/**
 * A city is one existing, scored course unit; its lessons are missions.
 * World geography is a narrative layer, never a new course or entitlement ledger.
 * Preserve u01-u12 IDs so returning learners keep their assessed progress.
 */
export const ITALIAN_WORLDS: readonly ItalianWorldDefinition[] = [
  {
    id: "discover",
    title: { fr: "Les premiers pas", en: "First steps", es: "Los primeros pasos" },
    description: { fr: "Rencontrer, se présenter et vivre ses premières journées.", en: "Meet people, introduce yourself and navigate your first days.", es: "Conocer gente, presentarse y vivir los primeros días." },
    cities: [
      { unitId: "u01", name: "Bologna" },
      { unitId: "u02", name: "Parma" },
      { unitId: "u03", name: "Modena" },
      { unitId: "u04", name: "Verona" },
    ],
  },
  {
    id: "daily-life",
    title: { fr: "La vie italienne", en: "Everyday Italy", es: "La vida italiana" },
    description: { fr: "Cafés, marchés, quartiers et déplacements.", en: "Cafés, markets, neighbourhoods and travel.", es: "Cafés, mercados, barrios y desplazamientos." },
    cities: [
      { unitId: "u05", name: "Napoli" },
      { unitId: "u06", name: "Firenze" },
      { unitId: "u07", name: "Siena" },
      { unitId: "u08", name: "Venezia" },
    ],
  },
  {
    id: "independence",
    title: { fr: "À toi l'aventure", en: "Your own adventure", es: "Tu propia aventura" },
    description: { fr: "Faire des projets, résoudre des situations et raconter.", en: "Make plans, solve situations and tell stories.", es: "Hacer planes, resolver situaciones y contar historias." },
    cities: [
      { unitId: "u09", name: "Genova" },
      { unitId: "u10", name: "Torino" },
      { unitId: "u11", name: "Roma" },
      { unitId: "u12", name: "Palermo" },
    ],
  },
] as const;

export function italianWorldForUnit(unitId: string) {
  return ITALIAN_WORLDS.find(world => world.cities.some(city => city.unitId === unitId));
}

export type ItalianWorldView = ItalianWorldDefinition & {
  number: number;
  complete: boolean;
  open: boolean;
  /** Display-only reward derived from independently passed unit assessments. */
  passEarned: boolean;
  citiesWithProgress: Array<ItalianWorldCity & {
    step: LearningJourney["steps"][number] | undefined;
    mastered: boolean;
    unlocked: boolean;
  }>;
};

/** No payment, credit, Pass balance, storage or schema mutations. */
export function projectItalianWorlds(journey: LearningJourney): ItalianWorldView[] {
  return ITALIAN_WORLDS.map((world, index) => {
    const citiesWithProgress = world.cities.map(city => {
      const step = journey.steps.find(entry => entry.unit.id === city.unitId);
      return { ...city, step, mastered: Boolean(step?.passed), unlocked: Boolean(step?.unlocked) };
    });
    const complete = citiesWithProgress.length > 0 && citiesWithProgress.every(city => city.mastered);
    return { ...world, number: index + 1, citiesWithProgress, complete,
      open: citiesWithProgress.some(city => city.unlocked), passEarned: complete };
  });
}
