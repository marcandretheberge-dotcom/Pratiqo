import type { JapaneseActivity } from "../japaneseCourseTypes";
import type { Exercise } from "../mandarin/types";
import { japaneseReviewItems, mandarinReviewItems } from "./adapters";

export type EasternReviewContent = { language: "ja"; activity: JapaneseActivity } | { language: "zh"; exercise: Exercise };

/** Import the authored exercises only after this learner has review evidence. */
export async function loadEasternReviews(language: "ja" | "zh"): Promise<Record<string, EasternReviewContent>> {
  const result: Record<string, EasternReviewContent> = {};
  if (language === "ja") {
    const units = (await import("../japaneseCourse")).japaneseCourseUnits;
    const refs = japaneseReviewItems(units);
    for (const unit of units) {
      for (const activity of unit.activities) {
        const ref = refs.find(item => item.unitId === unit.id && item.activityId === activity.id && item.lessonId === "practice");
        if (ref) result[ref.id] = { language, activity };
      }
      for (const turn of unit.roleplay.turns) {
        const ref = refs.find(item => item.unitId === unit.id && item.activityId === turn.id && item.lessonId === "roleplay");
        if (ref) result[ref.id] = { language, activity: {
          id: turn.id, kind: "choice", title: unit.roleplay.title, prompt: turn.goal, hint: turn.hint,
          explanation: turn.choices.find(choice => choice.id === turn.answerId)!.feedback,
          skill: "reading", stimulus: turn.line, choices: turn.choices, answerId: turn.answerId,
        } };
      }
    }
  } else {
    const units = (await import("../mandarin/course")).mandarinUnits;
    const refs = mandarinReviewItems(units);
    for (const unit of units) for (const exercise of unit.exercises) {
      const ref = refs.find(item => item.unitId === unit.id && item.activityId === exercise.id);
      if (ref) result[ref.id] = { language, exercise };
    }
  }
  return result;
}
