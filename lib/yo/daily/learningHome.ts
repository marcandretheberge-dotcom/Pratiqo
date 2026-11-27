import type { YoLocale } from "../types";
import type { CourseCatalog } from "../italian/course/courseTypes";
import type { JourneyUnit } from "../learningJourney";
import type { TextCourseLanguage } from "../foundations/experience";
import { foundationSettings } from "../foundations/experience";
import { learningLanguageId, learningLanguages } from "../config/languages";
import { RANKING_LANGUAGES, type RankingLanguage } from "../rankings/contract";
import { parseCourseProgress, ITALIAN_COURSE_PROGRESS_KEY } from "../italian/course/courseProgress";
import { GUIDED_PROGRESS_KEY, parseProfile, profileKey } from "../personalized/profile";
import { italianMissionHref } from "../italian/course/courseLinks";
import { GERMAN_PROGRESS_KEY } from "../german/courseLogic";
import { PORTUGUESE_PROGRESS_KEY } from "../portuguese/courseLogic";
import { buildCourseJourney } from "../courseJourney";
import { japaneseJourney, mandarinJourney, canEnterFoundationStep } from "../foundationJourney";
import { JAPANESE_PROGRESS_KEY, parseJapaneseProgress, japanesePublicUnitSlug } from "../japaneseCourseProgress";
import { MANDARIN_PROGRESS_KEY, parseProgress } from "../mandarin/progress";
import { introKey } from "../shared/state";
import { introReadyToContinue, type IntroContinuationOutline } from "../shared/continuation";
import { projectStoredItalianInterestCatalog } from "../italian/interests/selection";

export type DailyCourse = {
  kind: "text"; language: TextCourseLanguage; catalog: CourseCatalog; reviewIds: string[];
  introduction?: IntroContinuationOutline;
} | {
  kind: "eastern"; language: "ja" | "zh"; units: JourneyUnit[];
  finalIds: string[]; legacyFinalIds: string[]; reviewIds: string[];
  introduction?: IntroContinuationOutline;
};
export type DailyNavigation = {
  href: string; kind: "introduction" | "start" | "unit" | "final" | "complete";
  unit?: JourneyUnit; passed: number; total: number;
};
export const DAILY_LANGUAGES = RANKING_LANGUAGES;
export const DAILY_LANGUAGE_KEY = "yo.learning-home.language.v1";
export function dailyLanguage(input?: string | string[]): RankingLanguage {
  const id = learningLanguageId(Array.isArray(input) ? input[0] : input);
  return id === "fr" ? "fr-CA" : id === "pt" ? "pt-BR" : id ?? "it";
}
export function dailyLanguageInfo(language: RankingLanguage) {
  return learningLanguages[learningLanguageId(language)!];
}
export function dailyHref(locale: YoLocale, language?: RankingLanguage) {
  const params = new URLSearchParams();
  if (locale !== "fr") params.set("lang", locale);
  if (language) params.set("language", language);
  const query = params.toString();
  return `/yo/aujourdhui${query ? `?${query}` : ""}`;
}
export function dailyCourseHref(language: RankingLanguage, locale: YoLocale, unit = "") {
  return `/yo/langues/${dailyLanguageInfo(language).slug}/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale}`;
}
function textProgressKey(language: TextCourseLanguage) {
  return language === "it" ? GUIDED_PROGRESS_KEY : language === "de" ? GERMAN_PROGRESS_KEY
    : language === "pt-BR" ? PORTUGUESE_PROGRESS_KEY : foundationSettings[language].progressKey;
}

/** Read-only navigation from the same parsers and journey rules as each course.
 * The destination keeps its own onboarding, draft restoration and access checks.
 * Local evidence is never submitted to the account XP service.
 */
export function readDailyNavigation(course: DailyCourse, locale: YoLocale, read: (key: string) => string | null): DailyNavigation {
  const language = course.language;
  const introComplete = course.introduction ? introReadyToContinue(read(introKey(course.introduction.language)), course.introduction) : false;
  const introduction = (total: number): DailyNavigation => ({
    href: language === "it" ? dailyCourseHref(language, locale)
      : `/yo/langues/${dailyLanguageInfo(language).slug}/demarrer?lang=${locale}`,
    kind: language === "it" ? "start" : "introduction", passed: 0, total,
  });
  if (course.kind === "text") {
    let { catalog } = course;
    const raw = read(textProgressKey(course.language));
    // Match the Italian entry page's read-compatible legacy fallback without migrating it here.
    const progress = parseCourseProgress(raw ?? (language === "it" ? read(ITALIAN_COURSE_PROGRESS_KEY) : null), catalog);
    const profile = language === "it" ? parseProfile(read(profileKey("it")), "it", catalog.units.map(unit => unit.id)) : null;
    if (language === "it") catalog = projectStoredItalianInterestCatalog(catalog, progress, read, profile?.interests);
    const started = progress.resume || Object.keys(progress.activities).length || Object.keys(progress.assessments).length || Object.keys(progress.productionsUpdatedAt).length;
    if (!started && !profile && !introComplete) return introduction(catalog.units.length);
    const journey = buildCourseJourney(catalog, progress);
    const total = journey.steps.length, passed = journey.passedCount;
    if (total && passed === total) {
      const final = catalog.assessments.find(item => item.theme !== "culture" && item.unitIds.length === total && catalog.units.every(unit => item.unitIds.includes(unit.id)));
      const finalPassed = final && (progress.assessments[final.id]?.bestIndependent ?? -1) >= final.passPercent;
      return final && !finalPassed
        ? { href: dailyCourseHref(language, locale, "final"), kind: "final", passed, total }
        : { href: dailyCourseHref(language, locale), kind: "complete", passed, total };
    }
    const placed = !progress.resume && profile ? journey.steps.find(step => step.unit.id === profile.startUnitId && !step.passed) : undefined;
    const unit = (placed ?? journey.current)?.unit;
    if (!unit) return introduction(total);
    let href = language === "it" ? italianMissionHref(locale, unit.id) : dailyCourseHref(language, locale, unit.id);
    if (language !== "it" && progress.resume?.unitId === unit.id) {
      const params = new URLSearchParams({ lesson: progress.resume.lessonId });
      if (progress.resume.activityId) params.set("activity", progress.resume.activityId);
      href += `&${params}`;
    }
    return { href, kind: "unit", unit, passed, total };
  }
  if (course.language === "ja") {
    const progress = parseJapaneseProgress(read(JAPANESE_PROGRESS_KEY));
    if (!introComplete && !Object.keys(progress.results).length && !Object.keys(progress.lastSteps).length && !progress.practicedKanji.length) return introduction(course.units.length);
    const journey = japaneseJourney(course.units, progress);
    const finalStarted = progress.lastUnit === "bilan-fondations" || Boolean(progress.lastSteps["bilan-fondations"]) || course.finalIds.some(id => Boolean(progress.results[id]));
    const legacyStarted = progress.lastUnit === "bilan" || Boolean(progress.lastSteps.bilan) || course.legacyFinalIds.some(id => Boolean(progress.results[id]));
    // Cumulative results alone do not settle an unfinished retry; the saved player
    // must also be on its summary before Continue can move beyond the assessment.
    const finalSettled = progress.lastSteps["bilan-fondations"] === "summary" && course.finalIds.length > 0
      && course.finalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent);
    const legacySettled = progress.lastSteps.bilan === "summary" && course.legacyFinalIds.length > 0
      && course.legacyFinalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent);
    const resumedFinal = progress.lastUnit === "bilan" && !legacySettled && canEnterFoundationStep(japaneseJourney(course.units.slice(0, 8), progress), "bilan", legacyStarted) ? "bilan"
      : progress.lastUnit === "bilan-fondations" && !finalSettled && canEnterFoundationStep(journey, "bilan-fondations", finalStarted) ? "bilan-fondations" : null;
    const allUnitsPassed = journey.steps.length > 0 && journey.steps.every(step => step.passed);
    if (!resumedFinal && allUnitsPassed && finalSettled) return { href: dailyCourseHref(language, locale), kind: "complete", passed: journey.passedCount, total: course.units.length };
    const final = resumedFinal ?? (allUnitsPassed ? "bilan-fondations" : null);
    return { href: dailyCourseHref(language, locale, final ? japanesePublicUnitSlug(final) : journey.current?.unit.id), kind: final ? "final" : "unit", unit: final ? undefined : journey.current?.unit, passed: journey.passedCount, total: course.units.length };
  }
  const progress = parseProgress(read(MANDARIN_PROGRESS_KEY));
  if (!introComplete && !Object.keys(progress.results).length && !Object.keys(progress.steps).length && !Object.keys(progress.drafts).length) return introduction(course.units.length);
  const journey = mandarinJourney(course.units, progress);
  const finalStarted = progress.unit === "bilan-fondations" || progress.steps["bilan-fondations"] !== undefined || course.finalIds.some(id => Boolean(progress.results[id] || progress.drafts[id]));
  const legacyStarted = progress.unit === "bilan" || progress.steps.bilan !== undefined || course.legacyFinalIds.some(id => Boolean(progress.results[id] || progress.drafts[id]));
  // Assessment stages contain each exercise followed by the summary at this index.
  const finalSettled = progress.steps["bilan-fondations"] === course.finalIds.length && course.finalIds.length > 0
    && course.finalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent);
  const legacySettled = progress.steps.bilan === course.legacyFinalIds.length && course.legacyFinalIds.length > 0
    && course.legacyFinalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent);
  const resumedFinal = progress.unit === "bilan" && !legacySettled && canEnterFoundationStep(mandarinJourney(course.units.slice(0, 8), progress), "bilan", legacyStarted) ? "bilan"
    : progress.unit === "bilan-fondations" && !finalSettled && canEnterFoundationStep(journey, "bilan-fondations", finalStarted) ? "bilan-fondations" : null;
  const allUnitsPassed = journey.steps.length > 0 && journey.steps.every(step => step.passed);
  if (!resumedFinal && allUnitsPassed && finalSettled) return { href: dailyCourseHref(language, locale), kind: "complete", passed: journey.passedCount, total: course.units.length };
  const final = resumedFinal ?? (allUnitsPassed ? "bilan-fondations" : null);
  const route = final === "bilan" ? "bilan-initial" : final === "bilan-fondations" ? "bilan" : journey.current?.unit.id;
  return { href: dailyCourseHref(language, locale, route), kind: final ? "final" : "unit", unit: final ? undefined : journey.current?.unit, passed: journey.passedCount, total: course.units.length };
}
