import type { CourseUnit } from "../italian/course/courseTypes";
import type { CourseReviewContent } from "./courseContent";
import type { TextCourseLanguage } from "../foundations/experience";
import { courseReviewId } from "./courseRegistry";

/** Server data boundary: return a single authored exercise, never a full course. */
export async function findCourseReviewContent(language: TextCourseLanguage, id: string): Promise<CourseReviewContent> {
  let units: readonly CourseUnit[], audioPaths: Record<string, string> = {};
  if (language === "it") units = (await import("../personalized/courseData")).personalizedItalianUnits;
  else if (language === "de") units = (await import("../german/courseData")).germanCourseUnits;
  else if (language === "pt-BR") units = (await import("../portuguese/courseData")).portugueseCourseUnits;
  else if (language === "en") units = (await import("../english/courseData")).englishCourseUnits;
  else if (language === "es") units = (await import("../spanish/courseData")).spanishCourseUnits;
  else units = (await import("../frenchQuebec/courseData")).frenchQuebecCourseUnits;
  for (const unit of units) for (const lesson of unit.lessons) for (const activity of lesson.activities) {
    if (courseReviewId(unit.id, lesson.id, activity.id) !== id) continue;
    if (language === "it") {
      const { activitySpeech } = await import("../italian/course/courseSpeech");
      const { courseAudioPaths } = await import("../italian/course/courseAudio.server");
      audioPaths = courseAudioPaths(activitySpeech(activity));
    } else if (language === "de") audioPaths = (await import("../german/courseAudio.server")).germanAudioPaths(unit);
    else if (language === "pt-BR") audioPaths = (await import("../portuguese/courseAudio.server")).portugueseAudioPaths(unit);
    else audioPaths = (await import("../foundations/audio.server")).foundationAudioPaths(language, unit);
    const contextual = activity.kind === "choice" && activity.id === lesson.readingActivityId && !activity.stimulus
      ? { ...activity, stimulus: lesson.reading.it } : activity;
    const { activitySpeech } = await import("../italian/course/courseSpeech");
    const spoken = new Set(activitySpeech(contextual));
    return { activity: contextual, audioPaths: Object.fromEntries(Object.entries(audioPaths).filter(([text]) => spoken.has(text))) };
  }
  throw new Error("This review exercise is no longer in the course.");
}
