import type { ItalianActivity } from "../italian/italianModuleTypes";
import type { TextCourseLanguage } from "../foundations/experience";

export interface CourseReviewContent { activity: ItalianActivity; audioPaths: Record<string, string> }

/** Fetch one public exercise after review starts; complete catalogs stay on the server. */
export async function loadCourseReviewContent(language: TextCourseLanguage, id: string): Promise<CourseReviewContent> {
  const query = new URLSearchParams({ language, item: id });
  const response = await fetch(`/api/yo/review/exercise?${query}`, { credentials: "omit" });
  if (!response.ok) throw new Error("This review exercise could not be loaded.");
  const content = await response.json() as CourseReviewContent;
  if (!content.activity?.id || !id.endsWith(`:${content.activity.id}`) || !content.audioPaths || typeof content.audioPaths !== "object") {
    throw new Error("Invalid review exercise response.");
  }
  return content;
}
