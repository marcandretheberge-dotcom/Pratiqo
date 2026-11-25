import { findCourseReviewContent } from "@/lib/yo/review/courseContent.server";
import { findEasternReviewContent } from "@/lib/yo/review/easternContent.server";
import type { TextCourseLanguage } from "@/lib/yo/foundations/experience";

const languages: readonly string[] = ["it", "de", "pt-BR", "en", "es", "fr-CA", "ja", "zh"];

/** Public original practice only: no learner records, assessment, account or provider call. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const language = params.get("language"), id = params.get("item");
  if (!language || !languages.includes(language) || !id || !/^course:[a-zA-Z0-9._:-]{1,480}$/.test(id)) {
    return Response.json({ error: "Invalid review request." }, { status: 400 });
  }
  try {
    const content = language === "ja" || language === "zh"
      ? await findEasternReviewContent(language, id)
      : await findCourseReviewContent(language as TextCourseLanguage, id);
    return Response.json(content, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "Review exercise unavailable." }, { status: 404 });
  }
}
