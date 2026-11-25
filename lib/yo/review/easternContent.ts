import type { JapaneseActivity } from "../japaneseCourseTypes";
import type { Exercise } from "../mandarin/types";

export type EasternReviewContent = { language: "ja"; activity: JapaneseActivity } | { language: "zh"; exercise: Exercise };

/** Fetch one authored exercise only when the learner opens their due practice. */
export async function loadEasternReviewContent(language: "ja" | "zh", id: string): Promise<EasternReviewContent> {
  const query = new URLSearchParams({ language, item: id });
  const response = await fetch(`/api/yo/review/exercise?${query}`, { credentials: "omit" });
  if (!response.ok) throw new Error("This review exercise could not be loaded.");
  const content = await response.json() as EasternReviewContent;
  const exerciseId = content?.language === "ja" ? content.activity?.id : content?.language === "zh" ? content.exercise?.id : null;
  if (content?.language !== language || !exerciseId || !id.endsWith(`:${exerciseId}`)) {
    throw new Error("Invalid review exercise response.");
  }
  return content;
}
