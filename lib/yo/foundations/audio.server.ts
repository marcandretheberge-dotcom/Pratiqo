import { publishedPremiumAudioPath } from "../audio/premiumPublished";
import { learningLanguageId, learningLanguages } from "../config/languages";
import { introCourses } from "../shared/course";
import { introAudioPaths } from "../shared/audio.server";
import { distinctSpeech } from "../italian/course/courseSpeech";
import type { CourseAssessment, CourseUnit } from "../italian/course/courseTypes";
import type { ItalianActivity } from "../italian/italianModuleTypes";
import type { NewFoundationLanguage } from "./experience";

export function foundationAudioPaths(language: NewFoundationLanguage, content: CourseUnit | CourseAssessment): Record<string, string> {
  return foundationPhrasePaths(language, foundationPlaybackTexts(content));
}

/** Mirror actual audio controls in GermanCourseUnit and ItalianGames. Written
 * choices, their distractors, and written production models have no audio button. */
function activityPlaybackTexts(activity: ItalianActivity): string[] {
  switch (activity.kind) {
    case "listen": return activity.stimulus ? [activity.stimulus] : [];
    case "type": return activity.listeningText ? [activity.listeningText] : [];
    case "dialogue": return activity.turns.map(turn => turn.line);
    case "cafe": return [activity.orderText];
    case "map": return activity.instructions;
    default: return [];
  }
}

export function foundationPlaybackTexts(content: CourseUnit | CourseAssessment): string[] {
  if (!("lessons" in content)) return distinctSpeech(content.questions.flatMap(activityPlaybackTexts));
  return distinctSpeech([
    ...content.lessons.flatMap(lesson => [
      ...lesson.vocabulary.map(item => item.it),
      ...lesson.grammar.examples.map(item => item.it),
      ...lesson.pronunciation.practice,
      lesson.reading.it,
      ...lesson.activities.flatMap(activityPlaybackTexts),
    ]),
    ...content.quiz.questions.flatMap(activityPlaybackTexts),
    ...(content.midpoint?.questions.flatMap(activityPlaybackTexts) ?? []),
    ...(content.cultureStop ? [content.cultureStop.phrase.it] : []),
  ]);
}

/** Count the exact texts the course players can resolve, including existing intro recordings. */
export function foundationAudioCoverage(language: NewFoundationLanguage, contents: readonly (CourseUnit | CourseAssessment)[]): { total: number; recorded: number; missing: number } {
  const texts = distinctSpeech(contents.flatMap(foundationPlaybackTexts));
  const recorded = Object.keys(foundationPhrasePaths(language, texts)).length;
  return { total: texts.length, recorded, missing: texts.length - recorded };
}

export function foundationPhrasePaths(language: NewFoundationLanguage, texts: readonly string[]): Record<string, string> {
  const id = learningLanguageId(language)!;
  const intro = introCourses.find(course => learningLanguageId(course.language) === id);
  const existing = intro ? introAudioPaths(intro) : {};
  return Object.fromEntries(distinctSpeech(texts).flatMap(text => {
    const path = publishedPremiumAudioPath(intro?.speechLocale ?? learningLanguages[id].speechLocale, text) ?? existing[text];
    return path ? [[text, path]] : [];
  }));
}
