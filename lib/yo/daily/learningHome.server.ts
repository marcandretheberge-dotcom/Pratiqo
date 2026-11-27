import "server-only";
import type { RankingLanguage } from "../rankings/contract";
import type { CourseCatalog } from "../italian/course/courseTypes";
import { courseReviewIds } from "../review/courseRegistry";
import { dailyLanguageInfo, type DailyCourse } from "./learningHome";

/** Only compact outlines and canonical review IDs cross the client boundary. */
export async function loadDailyCourse(language: RankingLanguage): Promise<DailyCourse> {
  const intro = language === "it" ? undefined : (await import("../shared/course")).findIntroCourse(dailyLanguageInfo(language).slug);
  const introduction = intro ? { language: intro.language, finalCount: intro.final.length } : undefined;
  if (language === "ja" || language === "zh") {
    const data = await import("../foundationJourneyCatalogs");
    return language === "ja" ? {
      kind: "eastern", language, introduction, units: data.japaneseJourneyUnits,
      finalIds: data.japaneseFinalIds, legacyFinalIds: data.japaneseLegacyFinalIds, reviewIds: data.japaneseCourseReviewIds,
    } : {
      kind: "eastern", language, introduction, units: data.mandarinJourneyUnits,
      finalIds: data.mandarinFinalIds, legacyFinalIds: data.mandarinLegacyFinalIds, reviewIds: data.mandarinCourseReviewIds,
    };
  }
  let catalog: CourseCatalog;
  switch (language) {
    case "it": catalog = (await import("../personalized/courseData")).personalizedItalianCatalog; break;
    case "de": catalog = (await import("../german/courseData")).germanCatalog; break;
    case "pt-BR": catalog = (await import("../portuguese/courseData")).portugueseCatalog; break;
    case "en": catalog = (await import("../english/courseData")).englishCatalog; break;
    case "es": catalog = (await import("../spanish/courseData")).spanishCatalog; break;
    case "fr-CA": catalog = (await import("../frenchQuebec/courseData")).frenchQuebecCatalog; break;
  }
  return { kind: "text", language, introduction, catalog, reviewIds: courseReviewIds(catalog) };
}
