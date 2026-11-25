/** Local learning preferences only. Never an entitlement, certification, credit or reward. */
export const experienceOptions = ["new", "words", "conversation", "rusty", "unsure"] as const;
export const goalOptions = ["travel", "family", "work", "conversation", "thorough"] as const;
export const weeklyOptions = [30, 60, 120, 180, 0] as const;
export type LearningProfile = {
  version: 1; language: string; experience: typeof experienceOptions[number]; goal: typeof goalOptions[number];
  weeklyMinutes: number; startUnitId: string; placement: "beginner" | "manual" | "check";
  reviewUnitIds: string[]; updatedAt: number;
};
export const profileKey = (language: string) => `yo.learning-profile.v1.${language}`;
export function parseProfile(raw: string | null, language: string, units: readonly string[]): LearningProfile | null {
  if (!raw || raw.length > 4000) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || p.version !== 1 || p.language !== language || !experienceOptions.includes(p.experience) || !goalOptions.includes(p.goal) ||
      !Number.isInteger(p.weeklyMinutes) || p.weeklyMinutes < 0 || p.weeklyMinutes > 1200 || !units.includes(p.startUnitId) ||
      !["beginner", "manual", "check"].includes(p.placement) || !Array.isArray(p.reviewUnitIds) || p.reviewUnitIds.length > units.length ||
      !p.reviewUnitIds.every((id: unknown) => typeof id === "string" && units.includes(id)) || !Number.isFinite(p.updatedAt) || p.updatedAt < 0 || p.updatedAt > Date.now() + 300000) return null;
    return { version: 1, language, experience: p.experience, goal: p.goal, weeklyMinutes: p.weeklyMinutes,
      startUnitId: p.startUnitId, placement: p.placement, reviewUnitIds: [...new Set(p.reviewUnitIds)] as string[], updatedAt: p.updatedAt };
  } catch { return null; }
}
export function weeklyRhythm(minutes: number): { sessions: number; minutes: number } | null {
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1200) return null;
  const sessions = Math.min(7, Math.max(1, Math.ceil(minutes / 30)));
  return { sessions, minutes: Math.round(minutes / sessions) };
}
export type PlacementAnswer = { unitId: string; correct: boolean; assisted: boolean };
/** Three prerequisite groups. Stop at a weak group; only the checked sample supports the suggestion. */
export function placementRecommendation(answers: readonly PlacementAnswer[]) {
  const groups = [["u01", "u02"], ["u03", "u04"], ["u05", "u06"]];
  let startUnitId = "u01";
  const reviewUnitIds: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = answers.filter(a => groups[i].includes(a.unitId));
    if (group.length !== 3) break;
    const independent = group.filter(a => a.correct && !a.assisted).length;
    reviewUnitIds.push(...group.filter(a => !a.correct || a.assisted).map(a => a.unitId));
    if (independent < 2) break;
    startUnitId = ["u03", "u05", "u07"][i];
  }
  return { startUnitId, reviewUnitIds: [...new Set(reviewUnitIds)] };
}
export function placementAllowsReview(profile: LearningProfile | null, unitId: string, units: readonly string[]) {
  const current = units.indexOf(unitId), entry = profile ? units.indexOf(profile.startUnitId) : -1;
  return current >= 0 && entry >= 0 && current <= entry;
}
export const GUIDED_PROGRESS_KEY = "yo.italian.course.first-meeting.v2";
