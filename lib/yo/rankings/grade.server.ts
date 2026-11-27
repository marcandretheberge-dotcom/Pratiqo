import { findCourseReviewContent } from "../review/courseContent.server";
import { findEasternReviewContent } from "../review/easternContent.server";
import { checkJapaneseAnswer } from "../japaneseCourseProgress";
import { checkAnswer as checkMandarinAnswer } from "../mandarin/progress";
import { checkItalianCafe, checkItalianMap, matchesItalianAnswer } from "../italian/italianModuleLogic";
import { matchesGermanAnswer } from "../german/courseLogic";
import { matchesPortugueseAnswer } from "../portuguese/courseLogic";
import { matchesEnglishAnswer } from "../english/courseLogic";
import { matchesSpanishAnswer } from "../spanish/courseLogic";
import { matchesFrenchQuebecAnswer } from "../frenchQuebec/courseLogic";
import type { ItalianActivity, ItalianMapDirection } from "../italian/italianModuleTypes";
import type { TextCourseLanguage } from "../foundations/experience";
import { RANKING_LANGUAGES, type RankingAnswer, type RankingAttempt } from "./contract";

const matchText = {
  it: matchesItalianAnswer, de: matchesGermanAnswer, "pt-BR": matchesPortugueseAnswer,
  en: matchesEnglishAnswer, es: matchesSpanishAnswer, "fr-CA": matchesFrenchQuebecAnswer,
};
const reserved = new Set(["__proto__", "constructor", "prototype"]);
const record = (value: unknown): value is Record<string, string> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** Request answers are used only for this check, never persisted or returned. */
function boundedAnswer(value: unknown): value is RankingAnswer {
  if (typeof value === "string") return value.length > 0 && value.length <= 500;
  if (Array.isArray(value)) return value.length > 0 && value.length <= 64
    && Array.from(value).every(part => typeof part === "string" && part.length > 0 && part.length <= 160);
  return record(value) && Object.keys(value).length > 0 && Object.keys(value).length <= 64
    && Object.entries(value).every(([key, part]) => /^[a-zA-Z0-9._:-]{1,160}$/.test(key)
      && !reserved.has(key) && typeof part === "string" && part.length > 0 && part.length <= 160);
}

function exactKeys(answer: Record<string, string>, keys: readonly string[]) {
  return keys.length > 0 && Object.keys(answer).length === keys.length
    && keys.every(key => Object.hasOwn(answer, key));
}

function textAnswer(activity: ItalianActivity, answer: RankingAnswer, language: TextCourseLanguage): boolean {
  switch (activity.kind) {
    case "choice": case "listen": case "culture":
      return typeof answer === "string" && answer === activity.correctId;
    case "type":
      return typeof answer === "string" && matchText[language](answer, activity.accepted);
    case "order": {
      if (!Array.isArray(answer)) return false;
      const available = [...activity.tokens, ...(activity.distractors ?? [])];
      for (const token of answer) {
        const index = available.indexOf(token);
        if (index < 0) return false;
        available.splice(index, 1);
      }
      return matchText[language](answer.join(" "), [activity.answer.join(" ")]);
    }
    case "match":
      return record(answer) && exactKeys(answer, activity.pairs.map(pair => pair.id))
        && activity.pairs.every(pair => answer[pair.id] === pair.id);
    case "dialogue":
      return Array.isArray(answer) && answer.length === activity.turns.length
        && activity.turns.length > 0 && activity.turns.every((turn, index) => answer[index] === turn.correctId);
    case "cafe":
      return record(answer) && Object.values(answer).every(quantity => /^[0-9]$/.test(quantity))
        && checkItalianCafe(activity, Object.fromEntries(Object.entries(answer).map(([id, quantity]) => [id, Number(quantity)])));
    case "map":
      return Array.isArray(answer) && answer.every(direction => ["up", "down", "left", "right"].includes(direction))
        && checkItalianMap(activity, answer as ItalianMapDirection[]);
  }
}

/** Canonical authored practice only. Finals, placement, demos and local receipts are not award sources. */
export async function gradeRankingAttempt(attempt: RankingAttempt): Promise<boolean> {
  if (!attempt || !RANKING_LANGUAGES.includes(attempt.language)
    || typeof attempt.itemId !== "string" || !/^course:[a-zA-Z0-9._:-]{1,480}$/.test(attempt.itemId)
    || !boundedAnswer(attempt.answer)) return false;
  try {
    const { language, itemId, answer } = attempt;
    if (language === "ja" || language === "zh") {
      const content = await findEasternReviewContent(language, itemId);
      if (content.language === "ja") {
        if (content.activity.kind === "build" && !Array.isArray(answer)) return false;
        if (content.activity.kind === "match" && (!record(answer)
          || !exactKeys(answer, content.activity.pairs.map(pair => pair.id)))) return false;
        if (content.activity.kind !== "build" && content.activity.kind !== "match" && typeof answer !== "string") return false;
        return checkJapaneseAnswer(content.activity, answer);
      }
      if (content.exercise.kind === "build" && !Array.isArray(answer)) return false;
      if (content.exercise.kind === "match" && (!record(answer)
        || !exactKeys(answer, content.exercise.pairs.map((_, index) => String(index))))) return false;
      if (content.exercise.kind !== "build" && content.exercise.kind !== "match" && typeof answer !== "string") return false;
      return checkMandarinAnswer(content.exercise, answer);
    }
    const { activity } = await findCourseReviewContent(language, itemId);
    return textAnswer(activity, answer, language);
  } catch {
    // Unknown/retired identifiers and unavailable content never award XP.
    return false;
  }
}
