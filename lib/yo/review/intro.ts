import { learningLanguageId } from "@/lib/yo/config/languages";
import type { ItemRef } from "@/lib/yo/config/languageConfig";
import type { Exercise, IntroCourse } from "@/lib/yo/shared/types";
import { recordReviewAttempt, type ReviewWriteResult } from "./store";

export interface IntroReviewItem extends ItemRef { exercise: Exercise }

/** Stable authored activities only. Placement and final assessment are deliberately absent. */
export function introReviewItems(course: IntroCourse): IntroReviewItem[] {
  const language = learningLanguageId(course.language);
  if (!language) return [];
  return course.missions.flatMap((mission) => [
    ...mission.preparation.map((exercise) => ({ exercise, lessonId: "preparation" })),
    ...mission.practice.map((exercise) => ({ exercise, lessonId: "practice" })),
  ].flatMap(({ exercise, lessonId }): IntroReviewItem[] => {
    const phrase = course.phrases.find((candidate) => candidate.id === exercise.answer);
    if (!phrase) return [];
    return [{
      id: `intro:${mission.id}:${exercise.id}`, language, courseId: `intro-${course.slug}`,
      unitId: mission.id, lessonId, activityId: exercise.id, kind: exercise.kind,
      prompt: exercise.prompt, correctForm: { fr: phrase.text, en: phrase.text, es: phrase.text },
      feedback: phrase.meaning, skillTags: [exercise.kind === "order" ? "word-order" : ["listen", "meaning", "number"].includes(exercise.kind) ? "listening" : "vocabulary"],
      difficultyTags: ["first-meetings"], exercise,
    }];
  }));
}

export function recordIntroReviewAttempt(
  course: IntroCourse,
  exercise: Exercise,
  result: { correct: boolean; assisted: boolean },
): ReviewWriteResult {
  const item = introReviewItems(course).find((candidate) => candidate.activityId === exercise.id);
  if (!item) return { recorded: false, saved: false };
  return recordReviewAttempt({ language: item.language, itemId: item.id, ...result });
}
