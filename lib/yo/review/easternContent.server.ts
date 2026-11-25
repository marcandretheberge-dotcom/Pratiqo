import type { EasternReviewContent } from "./easternContent";

/** Complete source courses stay on the server; final questions are never selected. */
export async function findEasternReviewContent(language: "ja" | "zh", id: string): Promise<EasternReviewContent> {
  if (language === "ja") {
    const units = (await import("../japaneseCourse")).japaneseCourseUnits;
    for (const unit of units) {
      const activity = unit.activities.find(item => id === `course:${unit.id}:practice:${item.id}`);
      if (activity) return { language, activity };
      const turn = unit.roleplay.turns.find(item => id === `course:${unit.id}:roleplay:${item.id}`);
      if (turn) return { language, activity: {
        id: turn.id, kind: "choice", title: unit.roleplay.title, prompt: turn.goal, hint: turn.hint,
        explanation: turn.choices.find(choice => choice.id === turn.answerId)!.feedback,
        skill: "reading", stimulus: turn.line, choices: turn.choices, answerId: turn.answerId,
      } };
    }
  } else {
    const units = (await import("../mandarin/course")).mandarinUnits;
    for (const unit of units) {
      const exercise = unit.exercises.find(item => id === `course:${unit.id}:practice:${item.id}`);
      if (exercise) return { language, exercise };
    }
  }
  throw new Error("This review exercise is no longer in the course.");
}
