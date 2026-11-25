import { englishCatalog, englishCourseUnits, englishFinal, englishSources } from "../english/courseData";
import { spanishCatalog, spanishCourseUnits, spanishFinal, spanishSources } from "../spanish/courseData";
import { frenchQuebecCatalog, frenchQuebecCourseUnits, frenchQuebecFinal, frenchQuebecSources } from "../frenchQuebec/courseData";
import type { NewFoundationLanguage } from "./experience";

/** Server routes pass one authored course/unit to the shared client player. */
export function foundationContent(language: NewFoundationLanguage) {
  if (language === "en") return { catalog: englishCatalog, units: englishCourseUnits, final: englishFinal, sources: englishSources };
  if (language === "es") return { catalog: spanishCatalog, units: spanishCourseUnits, final: spanishFinal, sources: spanishSources };
  return { catalog: frenchQuebecCatalog, units: frenchQuebecCourseUnits, final: frenchQuebecFinal, sources: frenchQuebecSources };
}
