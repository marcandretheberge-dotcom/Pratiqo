export const LEARNER_AVAILABILITY = ["any", "weekday_day", "weekday_evening", "weekend"] as const;
export type LearnerAvailability = typeof LEARNER_AVAILABILITY[number];
export function parseLearnerAvailability(value: unknown): LearnerAvailability {
  return LEARNER_AVAILABILITY.includes(value as LearnerAvailability) ? value as LearnerAvailability : "any";
}

export function matchesLearnerAvailability(preference: LearnerAvailability, date: string, startMinutes: number, durationMinutes: number): boolean {
  if (preference === "any") return true;
  // date is already the teacher's calendar day, not a process-local instant.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const weekend = day === 0 || day === 6;
  if (preference === "weekend") return weekend;
  if (weekend) return false;
  return preference === "weekday_evening" ? startMinutes >= 18 * 60 : startMinutes + durationMinutes <= 18 * 60;
}
