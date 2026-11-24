import { yoppoTrivia } from "@/lib/yo/companion/trivia";
import { ITALIAN_CITY_IDENTITIES } from "@/lib/yo/italian/cityIdentity";
import { personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import type { DailyChallenge, DailyKind } from "./contract";

export const artifacts = ITALIAN_CITY_IDENTITIES.map(city => ({
  id: `artifact-it-${city.unitId}`, title: city.inspiration,
}));

// A practical phrase from each actual journey unit, playable even before
// unlocking that city. City progress and course attempts are not affected.
const phrases = personalizedItalianUnits.map(unit => unit.lessons[0].vocabulary[0]);
export const DAILY_REWARD = { mission: 30, trivia: 20 } as const;
const EPOCH = Date.UTC(2026, 10, 24);
const dayOffset = (day: string) => (Date.parse(`${day}T00:00:00Z`) - EPOCH) / 86_400_000;
const cycle = (n: number, size: number) => ((n % size) + size) % size;

export function dailyChallenge(day: string, kind: DailyKind) {
  const offset = dayOffset(day);
  if (!Number.isInteger(offset)) throw new Error("Invalid daily date");
  const index = cycle(offset, kind === "mission" ? artifacts.length : yoppoTrivia.length);
  const shift = cycle(offset + Math.floor(offset / 3), 3);
  if (kind === "mission") {
    const city = ITALIAN_CITY_IDENTITIES[index];
    const phrase = phrases[index];
    const choices = [phrase, phrases[cycle(index + 1, phrases.length)], phrases[cycle(index + 5, phrases.length)]]
      .map(option => option.it);
    // Distractors from different contexts must not duplicate the correct phrase.
    if (new Set(choices).size !== choices.length) throw new Error("Duplicate mission option");
    const challenge: DailyChallenge = {
      id: `daily-mission-it-${city.unitId}`,
      title: city.inspiration,
      prompt: phrase.meaning,
      choices: [...choices.slice(shift), ...choices.slice(0, shift)],
    };
    return { challenge, answer: cycle(-shift, choices.length), explanation: phrase.meaning, artifactId: artifacts[index].id };
  }
  const trivia = yoppoTrivia[index];
  const choices = [...trivia.choices.slice(shift), ...trivia.choices.slice(0, shift)];
  const challenge: DailyChallenge = {
    id: trivia.id, prompt: trivia.question, choices: choices.map(choice => choice.label),
  };
  return { challenge, answer: choices.findIndex(choice => choice.id === trivia.answer), explanation: trivia.explanation, artifactId: null };
}
