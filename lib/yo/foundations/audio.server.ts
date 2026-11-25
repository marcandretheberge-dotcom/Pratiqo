import { publishedPremiumAudioPath } from "../audio/premiumPublished";
import { learningLanguageId, learningLanguages } from "../config/languages";
import { introCourses } from "../shared/course";
import { introAudioPaths } from "../shared/audio.server";
import { assessmentSpeech, distinctSpeech, unitSpeech } from "../italian/course/courseSpeech";
import type { CourseAssessment, CourseUnit } from "../italian/course/courseTypes";
import type { NewFoundationLanguage } from "./experience";

export function foundationAudioPaths(language: NewFoundationLanguage, content: CourseUnit | CourseAssessment): Record<string, string> {
  return foundationPhrasePaths(language, "lessons" in content ? unitSpeech(content) : assessmentSpeech(content));
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
