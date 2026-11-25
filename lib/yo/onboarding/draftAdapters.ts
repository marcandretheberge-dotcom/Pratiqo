import type { CourseCatalog, CourseQuestion } from "../italian/course/courseTypes";
import { COURSE_PROGRESS_MAX_LENGTH, ITALIAN_COURSE_PROGRESS_KEY } from "../italian/course/courseProgress";
import { emptyGame, tokenPool, type GameDraft } from "../italian/course/guidedItalian";
import { experienceOptions, goalOptions, GUIDED_PROGRESS_KEY, profileKey, weeklyOptions, type LearningProfile, type PlacementAnswer } from "../personalized/profile";
import { interestLanguage, parseInterests, type InterestId } from "../interests/preferences";
import type { Answer, Draft, IntroCourse, IntroProfile } from "../shared/types";
import { emptyDraft, introKey } from "../shared/state";
import { INTRO_SYNC_LIMIT, introEpochKey, introRevision } from "../shared/introSync";
import { exerciseDraftRevision } from "../foundations/typedDraft";
import { createOnboardingDraftStore, draftInteger as integer, draftObject as object, ONBOARDING_DRAFT_PREFIX, type WelcomeStorage } from "./draftStore";

export type PlacementCheck = { unitId: string; activity: CourseQuestion };
export type ItalianWelcomeScreen = "experience" | "goal" | "interests" | "time" | "choice" | "check" | "result";
export type SharedWelcomeScreen = "experience" | "goal" | "interests" | "pace" | "choice" | "check" | "result";
type PaceDraft = { minutes: number | null; custom: boolean; customText: string; interests: InterestId[] };
export type ItalianWelcomeDraft = PaceDraft & {
  screen: ItalianWelcomeScreen; experience: LearningProfile["experience"]; goal: LearningProfile["goal"];
  answers: PlacementAnswer[]; game: GameDraft; start: string; mode: LearningProfile["placement"]; reviews: string[]; pickerOpen: boolean;
};
export type SharedWelcomeDraft = PaceDraft & {
  step: SharedWelcomeScreen; experience: IntroProfile["experience"]; goal: IntroProfile["goal"];
  entry: number; picker: boolean; answers: Answer[]; draft: Draft;
};

const italianScreens = ["experience", "goal", "interests", "time", "choice", "check", "result"];
const sharedScreens = ["experience", "goal", "interests", "pace", "choice", "check", "result"];
const bool = (value: unknown): value is boolean => typeof value === "boolean";
function common(value: Record<string, unknown>): PaceDraft | null {
  if (!(value.minutes === null || integer(value.minutes, 0, 1200)) || !bool(value.custom) || typeof value.customText !== "string" ||
      value.customText.length > 16 || !Array.isArray(value.interests) || value.interests.length > 3) return null;
  return { minutes: value.minutes, custom: value.custom, customText: value.customText, interests: parseInterests(value.interests) };
}
function savedInterests(target: WelcomeStorage | null, language: string, initial?: InterestId[]) {
  if (target) { const raw = target.getItem("yo.interests.v1." + language); if (raw && raw.length <= 1000) try { return parseInterests(JSON.parse(raw)); } catch { /* Keep the profile selection. */ } }
  return parseInterests(initial);
}
function json(raw: string | null, max: number): unknown {
  if (!raw) return null;
  if (raw.length > max) return "oversized";
  try { return JSON.parse(raw); } catch { return "invalid"; }
}
function resetScope(raw: string | null) {
  const value = json(raw, COURSE_PROGRESS_MAX_LENGTH);
  return object(value) ? { present: true, version: value.version, resetAt: value.resetAt } : value;
}
function italianGame(value: unknown, activity?: CourseQuestion): GameDraft | null {
  if (!object(value) || !["assisted", "heard", "transcript", "complete"].every(key => bool(value[key])) ||
      !(value.feedback === null || bool(value.feedback)) || value.turn !== 0 || value.left !== null ||
      !Array.isArray(value.pairs) || value.pairs.length || !Array.isArray(value.tiles) || value.tiles.length > 40 ||
      new Set(value.tiles).size !== value.tiles.length || !(value.selected === null || typeof value.selected === "string")) return null;
  const pool = activity ? tokenPool(activity) : [];
  if (!value.tiles.every(index => integer(index, 0, pool.length - 1)) || value.selected !== null && (!activity || activity.kind === "type" || !activity.options.some(option => option.id === value.selected))) return null;
  if (value.complete !== (value.feedback !== null) || value.complete && !(value.selected !== null || value.tiles.length)) return null;
  return { selected: value.selected as string | null, tiles: [...value.tiles] as number[], pairs: [], left: null, turn: 0,
    feedback: value.feedback as boolean | null, complete: value.complete as boolean, heard: value.heard as boolean,
    transcript: value.transcript as boolean, assisted: Boolean(value.assisted || value.transcript) };
}
export function createItalianWelcomeStore(catalog: CourseCatalog, checks: PlacementCheck[], initial?: LearningProfile | null, storage?: () => WelcomeStorage | null) {
  const units = catalog.units.map(unit => unit.id);
  if (!units.length || !checks.length || checks.length > 30) throw new Error("Invalid placement scope");
  const revision = exerciseDraftRevision([units, checks, initial ?? null]);
  const key = ONBOARDING_DRAFT_PREFIX + "it";
  const fresh = (target: WelcomeStorage | null): ItalianWelcomeDraft => ({ screen: "experience", experience: initial?.experience ?? "new", goal: initial?.goal ?? "thorough",
    interests: savedInterests(target, "it", initial?.interests), minutes: initial?.weeklyMinutes ?? null,
    custom: Boolean(initial && !weeklyOptions.some(n => n === initial.weeklyMinutes)), customText: initial ? String(initial.weeklyMinutes) : "",
    answers: [], game: emptyGame(), start: initial?.startUnitId ?? units[0], mode: initial?.placement ?? "manual", reviews: initial?.reviewUnitIds ?? [], pickerOpen: false });
  function parse(value: unknown): ItalianWelcomeDraft | null {
    if (!object(value)) return null;
    const base = common(value);
    if (!base || !italianScreens.includes(String(value.screen)) || !experienceOptions.includes(value.experience as LearningProfile["experience"]) ||
        !goalOptions.includes(value.goal as LearningProfile["goal"]) || typeof value.start !== "string" || !units.includes(value.start) ||
        !["beginner", "manual", "check"].includes(String(value.mode)) || !bool(value.pickerOpen) || !Array.isArray(value.reviews) ||
        value.reviews.length > units.length || !value.reviews.every(id => typeof id === "string" && units.includes(id)) ||
        !Array.isArray(value.answers) || value.answers.length > checks.length ||
        !value.answers.every((answer, index) => object(answer) && answer.unitId === checks[index].unitId && bool(answer.correct) && bool(answer.assisted)) ||
        value.screen === "check" && value.answers.length >= checks.length) return null;
    const game = italianGame(value.game, checks[value.answers.length]?.activity); if (!game) return null;
    return { ...base, screen: value.screen as ItalianWelcomeScreen, experience: value.experience as LearningProfile["experience"], goal: value.goal as LearningProfile["goal"],
      start: value.start, mode: value.mode as LearningProfile["placement"], reviews: [...new Set(value.reviews)] as string[], pickerOpen: value.pickerOpen,
      answers: value.answers.map(answer => ({ unitId: answer.unitId, correct: answer.correct, assisted: answer.assisted })), game };
  }
  return createOnboardingDraftStore({ key, revision, fresh, parse, storage,
    restore: state => ({ ...state, game: { ...state.game, heard: false } }),
    watchKeys: [profileKey("it"), GUIDED_PROGRESS_KEY, ITALIAN_COURSE_PROGRESS_KEY],
    context: target => exerciseDraftRevision([json(target.getItem(profileKey("it")), 4000), resetScope(target.getItem(GUIDED_PROGRESS_KEY)), resetScope(target.getItem(ITALIAN_COURSE_PROGRESS_KEY))]),
  });
}

function sharedQuestion(value: unknown, course: IntroCourse, index: number): Draft | null {
  if (!object(value) || !["checked", "correct", "assisted", "heard", "transcript"].every(key => bool(value[key])) ||
      !(value.selected === null || typeof value.selected === "string") || !Array.isArray(value.tiles) || value.tiles.length > 20 || new Set(value.tiles).size !== value.tiles.length) return null;
  const question = course.final[index], parts = question?.kind === "order" ? course.phrases.find(phrase => phrase.id === question.answer)?.parts ?? [] : [];
  if (value.selected !== null && !question?.options.includes(String(value.selected)) || !value.tiles.every(n => integer(n, 0, parts.length - 1)) ||
      value.checked && !(value.selected !== null || value.tiles.length) || !value.checked && value.correct) return null;
  return { selected: value.selected as string | null, tiles: [...value.tiles] as number[], checked: value.checked as boolean, correct: value.correct as boolean,
    assisted: Boolean(value.assisted || value.transcript), heard: value.heard as boolean, transcript: value.transcript as boolean };
}
export function createSharedWelcomeStore(course: IntroCourse, initial?: IntroProfile | null, storage?: () => WelcomeStorage | null) {
  const language = interestLanguage(course.language) ?? course.language, key = ONBOARDING_DRAFT_PREFIX + language;
  const revision = exerciseDraftRevision([introRevision(course), initial ?? null]);
  const fresh = (target: WelcomeStorage | null): SharedWelcomeDraft => ({ step: "experience", experience: initial?.experience ?? "new", goal: initial?.goal ?? "conversation",
    interests: savedInterests(target, language, initial?.interests), minutes: initial?.minutes ?? null,
    custom: Boolean(initial && ![30, 60, 120, 180, 0].includes(initial.minutes)), customText: initial ? String(initial.minutes) : "",
    entry: initial?.entry ?? 0, picker: false, answers: [], draft: emptyDraft() });
  function parse(value: unknown): SharedWelcomeDraft | null {
    if (!object(value)) return null;
    const base = common(value);
    if (!base || !sharedScreens.includes(String(value.step)) || !["new", "some", "confident"].includes(String(value.experience)) ||
        !goalOptions.includes(value.goal as IntroProfile["goal"]) || !integer(value.entry, 0, course.missions.length - 1) || !bool(value.picker) ||
        !Array.isArray(value.answers) || value.answers.length > course.final.length ||
        !value.answers.every(answer => object(answer) && bool(answer.correct) && bool(answer.assisted)) ||
        value.step === "check" && value.answers.length >= course.final.length) return null;
    const draft = sharedQuestion(value.draft, course, value.answers.length); if (!draft) return null;
    return { ...base, step: value.step as SharedWelcomeScreen, experience: value.experience as IntroProfile["experience"], goal: value.goal as IntroProfile["goal"], entry: value.entry, picker: value.picker,
      answers: value.answers.map(answer => ({ correct: answer.correct, assisted: answer.assisted })), draft };
  }
  return createOnboardingDraftStore({ key, revision, fresh, parse, storage,
    restore: state => ({ ...state, draft: { ...state.draft, heard: false } }),
    watchKeys: [introKey(course.language), introEpochKey(course.language)],
    context: target => {
      const value = json(target.getItem(introKey(course.language)), INTRO_SYNC_LIMIT);
      return exerciseDraftRevision([object(value) ? { profile: value.profile, reset: object(value.sync) ? value.sync.reset : null } : value,
        json(target.getItem(introEpochKey(course.language)), 1000)]);
    },
  });
}
