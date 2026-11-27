import type { ItalianActivity } from "../italian/italianModuleTypes";
import { interestIds } from "../interests/preferences";
import { courseReviewId } from "../review/courseRegistry";
import type { RankingLanguage } from "./contract";

/** Equivalent positions in the new authored U1 curriculum, never legacy U1 IDs.
 * These identities must stay stable if the learner changes interests or replays.
 */
const unitOneSlots = [
  ["pairs", "match"], ["build", "order"], ["read", "choice"],
  ["listen", "listen"], ["write", "type"], ["dialogue", "dialogue"], ["dictation", "type"],
] as const satisfies readonly (readonly [string, ItalianActivity["kind"]])[];
let unitOneRewards: Promise<ReadonlyMap<string, string>> | undefined;

async function loadUnitOneRewards(): Promise<ReadonlyMap<string, string>> {
  const { italianInterestAllUnits } = await import("../italian/interests/unitOne");
  const rewards = new Map<string, string>();
  const lessons = new Set<string>();
  const expectedLessons = new Map<string, number>(interestIds.flatMap(interest => [1, 2, 3].map(slot =>
    [`it-interest-v1-u01-${interest}-l${slot}`, slot] as const)));
  for (const unit of italianInterestAllUnits) {
    if (unit.id !== "u01" || unit.lessons.length !== 3) throw new Error("Invalid interest reward curriculum.");
    for (const lesson of unit.lessons) {
      const lessonSlot = expectedLessons.get(lesson.id);
      if (!lessonSlot || lessons.has(lesson.id) || lesson.activities.length !== unitOneSlots.length) throw new Error("Invalid interest reward lesson.");
      lessons.add(lesson.id);
      for (const [slot, kind] of unitOneSlots) {
        const activity = lesson.activities.find(item => item.id === `${lesson.id}-${slot}` && item.kind === kind);
        if (!activity) throw new Error("Missing authored interest reward position.");
        const contentId = courseReviewId(unit.id, lesson.id, activity.id);
        // Reward identity is server-only. Review/progress keep contentId unchanged.
        rewards.set(contentId, `course:it-interest-v1-u01:l${lessonSlot}:${slot}`);
      }
    }
  }
  if (lessons.size !== expectedLessons.size || rewards.size !== expectedLessons.size * unitOneSlots.length) throw new Error("Incomplete interest reward curriculum.");
  return rewards;
}

/** Call only after the exact authored answer has passed server grading.
 * A client cannot name a reward slot, substitute a theme, or redefine equivalence.
 * Unknown new-version content fails closed; every existing award ID is preserved.
 */
export async function rankingRewardItemId(language: RankingLanguage, contentId: string): Promise<string | null> {
  if (language !== "it" || !contentId.startsWith("course:u01:it-interest-")) return contentId;
  unitOneRewards ??= loadUnitOneRewards().catch(error => { unitOneRewards = undefined; throw error; });
  return (await unitOneRewards).get(contentId) ?? null;
}
