import { interestIds, interestPreferenceKey, parseInterests, type InterestId } from "../../interests/preferences";
import type { CourseProgress } from "../course/courseProgress";
import type { CourseCatalog, CourseLesson, CourseUnit, CourseUnitSummary } from "../course/courseTypes";

export const ITALIAN_INTEREST_SELECTION_KEY = "yo.italian.interest-selection.v1.u01";
export const ITALIAN_INTEREST_DRAFT_KEY = "yo.italian.guided.interests.v1.u01";
const SLOT_COUNT = 3;

export type ItalianInterestBank = {
  units: readonly CourseUnit[];
  legacyUnits: readonly CourseUnit[];
};
type ItalianInterestIdentityBank = {
  units: readonly { lessons: readonly { id: string }[] }[];
  legacyUnits: readonly { lessons: readonly { id: string }[] }[];
};
type PinnedLesson = { lessonId: string; beganAt: number };
export type ItalianInterestSelection = {
  version: 1;
  resetAt: number;
  mode: "interests" | "legacy";
  /** The first immutable lesson ID identifies an entire legacy unit version. */
  legacyUnitKey: string | null;
  pinned: (PinnedLesson | null)[];
};

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const stamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const unitKey = (unit: { lessons: readonly { id: string }[] }) => unit.lessons[0]?.id ?? "";
const emptyPins = (): (PinnedLesson | null)[] => Array.from({ length: SLOT_COUNT }, () => null);

export function italianLessonInterest(lesson: { id: string }): InterestId | null {
  return interestIds.find(interest => lesson.id.includes("-u01-" + interest + "-l")) ?? null;
}

function lessonAt(bank: ItalianInterestBank, lessonId: string) {
  for (const unit of bank.units) {
    const slot = unit.lessons.findIndex(lesson => lesson.id === lessonId);
    if (slot >= 0 && slot < SLOT_COUNT) return { unit, slot, lesson: unit.lessons[slot] };
  }
  return null;
}

/** Preferences and this local plan never count as completed learning or an XP award. */
export function parseItalianInterestSelection(
  raw: string | null, bank: ItalianInterestIdentityBank, resetAt: number,
): ItalianInterestSelection | null {
  if (!raw || raw.length > 4000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || value.resetAt !== resetAt ||
      !["interests", "legacy"].includes(String(value.mode)) || !Array.isArray(value.pinned) ||
      value.pinned.length !== SLOT_COUNT) return null;
    if (value.mode === "legacy" && !bank.legacyUnits.some(unit => unitKey(unit) === value.legacyUnitKey)) return null;
    if (value.mode === "interests" && value.legacyUnitKey !== null) return null;
    const pinned: (PinnedLesson | null)[] = [];
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const pin = value.pinned[slot];
      if (pin === null) { pinned.push(null); continue; }
      if (!object(pin) || typeof pin.lessonId !== "string" || !stamp(pin.beganAt) ||
        pin.beganAt < resetAt || pin.beganAt > Date.now() + 300000 ||
        !bank.units.some(unit => unit.lessons[slot]?.id === pin.lessonId)) return null;
      pinned.push({ lessonId: pin.lessonId, beganAt: pin.beganAt });
    }
    return {
      version: 1, resetAt, mode: value.mode as ItalianInterestSelection["mode"],
      legacyUnitKey: value.mode === "legacy" ? String(value.legacyUnitKey) : null,
      pinned,
    };
  } catch { return null; }
}

function earlierPin(left: PinnedLesson | null, right: PinnedLesson | null): PinnedLesson | null {
  if (!left || !right) return left ?? right;
  if (left.beganAt !== right.beganAt) return left.beganAt < right.beganAt ? left : right;
  return left.lessonId <= right.lessonId ? left : right;
}

/** Concurrent tabs retain the earliest begun variant, rather than the latest preference write. */
export function mergeItalianInterestSelection(
  left: ItalianInterestSelection | null, right: ItalianInterestSelection | null,
): ItalianInterestSelection | null {
  if (!left || !right) return left ?? right;
  if (left.resetAt !== right.resetAt) return left.resetAt > right.resetAt ? left : right;
  if (left.mode === "legacy" || right.mode === "legacy") {
    if (left.mode !== right.mode) return left.mode === "legacy" ? left : right;
    return (left.legacyUnitKey ?? "") <= (right.legacyUnitKey ?? "") ? left : right;
  }
  return { ...left, pinned: left.pinned.map((pin, slot) => earlierPin(pin, right.pinned[slot])) };
}

function legacyEvidence(unit: CourseUnit, progress: CourseProgress): number {
  if (progress.resume?.unitId === unit.id && unit.lessons.some(lesson => lesson.id === progress.resume?.lessonId)) {
    return Number.MAX_SAFE_INTEGER;
  }
  const activityTimes = unit.lessons.flatMap(lesson => lesson.activities)
    .map(activity => progress.activities[activity.id]?.lastAt ?? -1);
  return Math.max(-1, ...activityTimes, progress.assessments[unit.quiz.id]?.last.completedAt ?? -1,
    unit.midpoint ? progress.assessments[unit.midpoint.id]?.last.completedAt ?? -1 : -1,
    progress.productionsUpdatedAt[unit.production.id] ?? -1);
}

/**
 * An existing learner keeps the complete legacy unit, including its own assessment.
 * Recovery only retains exact existing IDs; it never marks a replacement lesson complete.
 */
export function reconcileItalianInterestSelection(
  selection: ItalianInterestSelection | null,
  bank: ItalianInterestBank,
  progress: CourseProgress,
  begunLegacyUnitKeys: readonly string[] = [],
): ItalianInterestSelection {
  const storedPlan = selection?.resetAt === progress.resetAt ? selection : null;
  let current = storedPlan;
  if (!current) {
    const legacy = bank.legacyUnits
      .map(unit => ({ unit, evidence: legacyEvidence(unit, progress) }))
      .filter(item => item.evidence >= 0 || begunLegacyUnitKeys.includes(unitKey(item.unit)))
      .sort((left, right) => right.evidence - left.evidence)[0]?.unit;
    current = {
      version: 1, resetAt: progress.resetAt, mode: legacy ? "legacy" : "interests",
      legacyUnitKey: legacy ? unitKey(legacy) : null, pinned: emptyPins(),
    };
  }
  // Null pins in an existing plan mean "not started in this plan". A historical
  // review may write progress for a different variant without choosing it here.
  // Actual lesson openings pin explicitly; history is only a missing-plan fallback.
  if (current.mode === "legacy" || storedPlan) return current;
  const pinned = [...current.pinned];
  for (const unit of bank.units) for (const [slot, lesson] of unit.lessons.entries()) {
    if (slot >= SLOT_COUNT || current.pinned[slot]) continue;
    const attempts = lesson.activities.map(activity => progress.activities[activity.id]?.lastAt)
      .filter((value): value is number => value !== undefined);
    if (progress.resume?.lessonId === lesson.id && progress.resume.unitId === unit.id) attempts.push(progress.resumeUpdatedAt);
    if (attempts.length) pinned[slot] = earlierPin(pinned[slot], { lessonId: lesson.id, beganAt: Math.min(...attempts) });
  }
  return { ...current, pinned };
}

/** Called when the lesson opens, before its first exercise or explanatory screen. */
export function beginItalianInterestLesson(
  selection: ItalianInterestSelection, bank: ItalianInterestBank, lessonId: string, now = Date.now(),
): ItalianInterestSelection {
  if (selection.mode !== "interests" || !stamp(now)) return selection;
  const entry = lessonAt(bank, lessonId);
  if (!entry || selection.pinned[entry.slot]) return selection;
  const pinned = [...selection.pinned];
  pinned[entry.slot] = { lessonId, beganAt: Math.max(selection.resetAt, now) };
  return { ...selection, pinned };
}

function mixedUnit(template: CourseUnit, lessons: CourseLesson[], bank: ItalianInterestBank): CourseUnit {
  const themes = new Set(lessons.map(italianLessonInterest));
  const usedUnits = bank.units.filter(unit => unit.lessons.some(lesson => lessons.some(chosen => chosen.id === lesson.id)));
  return {
    ...template, lessons, objectives: lessons.map(lesson => lesson.goal),
    ...(themes.size > 1 ? {
      title: { fr: "Premières découvertes en italien", en: "First discoveries in Italian", es: "Primeros descubrimientos en italiano" },
      subtitle: {
        fr: "Trois premières rencontres avec l’Italie, selon tes centres d’intérêt.",
        en: "Three first encounters with Italy, shaped by your interests.",
        es: "Tres primeros encuentros con Italia, según tus intereses.",
      },
      culture: {
        title: { fr: "Tes découvertes de l’Italie", en: "Your discoveries of Italy", es: "Tus descubrimientos de Italia" },
        body: {
          fr: "Chaque leçon explore un sujet choisi et s’appuie sur les sources présentées avec sa découverte.",
          en: "Each lesson explores a selected subject, with sources shown alongside its discovery.",
          es: "Cada lección explora un tema elegido, con las fuentes junto a su descubrimiento.",
        },
        sourceIds: [...new Set(usedUnits.flatMap(unit => unit.culture.sourceIds))],
      },
    } : {}),
  };
}

export function selectedItalianUnitOne(
  bank: ItalianInterestBank, selection: ItalianInterestSelection, preferences: readonly InterestId[],
): CourseUnit {
  if (selection.mode === "legacy") {
    const legacy = bank.legacyUnits.find(unit => unitKey(unit) === selection.legacyUnitKey);
    if (legacy) return legacy;
  }
  const accepted = parseInterests(preferences);
  // Choices have no ranking. A stable order is just a tie-breaker for equally represented subjects.
  const available = interestIds.filter(interest =>
    (!accepted.length || accepted.includes(interest)) && bank.units.some(unit => italianLessonInterest(unit.lessons[0]) === interest));
  const choices = available.length ? available : interestIds.filter(interest =>
    bank.units.some(unit => italianLessonInterest(unit.lessons[0]) === interest));
  const lessons = selection.pinned.map(pin => pin ? lessonAt(bank, pin.lessonId)?.lesson ?? null : null);
  const counts = new Map(choices.map(interest => [interest, lessons.filter(lesson => lesson && italianLessonInterest(lesson) === interest).length]));
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    if (lessons[slot]) continue;
    const interest = [...choices].sort((left, right) => (counts.get(left) ?? 0) - (counts.get(right) ?? 0))[0];
    const unit = [...bank.units].reverse().find(candidate => italianLessonInterest(candidate.lessons[0]) === interest);
    lessons[slot] = unit?.lessons[slot] ?? bank.units[0]?.lessons[slot] ?? null;
    if (interest) counts.set(interest, (counts.get(interest) ?? 0) + 1);
  }
  const template = bank.units.find(unit => unit.lessons.some(lesson => lesson.id === lessons[0]?.id)) ?? bank.units[0];
  if (!template || lessons.some(lesson => !lesson)) return bank.legacyUnits[0];
  return mixedUnit(template, lessons as CourseLesson[], bank);
}

/** Review URLs may open an older exact variant without rewriting the current learning plan. */
export function italianUnitOneForReview(
  activeUnit: CourseUnit, bank: ItalianInterestBank, requestedLessonId?: string,
): { unit: CourseUnit; overridden: boolean; draftKey?: string } {
  if (!requestedLessonId || activeUnit.lessons.some(lesson => lesson.id === requestedLessonId)) {
    return { unit: activeUnit, overridden: false };
  }
  const source = [...bank.units, ...bank.legacyUnits].find(unit => unit.lessons.some(lesson => lesson.id === requestedLessonId));
  if (!source) return { unit: activeUnit, overridden: false };
  const target = lessonAt(bank, requestedLessonId);
  const activeIsNew = activeUnit.lessons.every(lesson => lessonAt(bank, lesson.id));
  const lessons = target && activeIsNew ? activeUnit.lessons.map((lesson, slot) => slot === target.slot ? target.lesson : lesson) : null;
  return {
    unit: lessons ? mixedUnit(source, lessons, bank) : source,
    overridden: true,
    draftKey: "yo.italian.guided.exact-review.v1." + requestedLessonId,
  };
}

export function italianUnitSummary(unit: CourseUnit): CourseUnitSummary {
  return {
    id: unit.id, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.objectives,
    lessons: unit.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, activityIds: lesson.activities.map(activity => activity.id), phraseCount: lesson.vocabulary.length })),
    activityIds: unit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id)),
    quizId: unit.quiz.id, productionId: unit.production.id,
    phraseCount: unit.lessons.reduce((total, lesson) => total + lesson.vocabulary.length, 0),
    ...(unit.midpoint ? { midpointId: unit.midpoint.id } : {}), ...(unit.cultureStop ? { photo: unit.cultureStop.photo } : {}),
  };
}

const assessmentSummary = (assessment: CourseUnit["quiz"]): CourseCatalog["assessments"][number] => ({
  id: assessment.id, title: assessment.title, unitIds: assessment.unitIds, questionCount: assessment.questions.length,
  passPercent: assessment.passPercent, ...(assessment.theme ? { theme: assessment.theme } : {}),
  ...(assessment.purpose ? { purpose: assessment.purpose } : {}),
});

/** Retention is for identity validation/reviews only; the visible journey stays twelve units. */
export function retainItalianInterestHistory(catalog: CourseCatalog, units: readonly CourseUnit[]): CourseCatalog {
  const retainedUnits = [...(catalog.retainedUnits ?? []), ...units.map(italianUnitSummary)];
  const retainedAssessments = [...(catalog.retainedAssessments ?? []),
    ...units.flatMap(unit => [assessmentSummary(unit.quiz), ...(unit.midpoint ? [assessmentSummary(unit.midpoint)] : [])])];
  return {
    ...catalog,
    retainedUnits: [...new Map(retainedUnits.map(unit => [unit.id + ":" + unit.lessons.map(lesson => lesson.id).join(","), unit])).values()],
    retainedAssessments: [...new Map(retainedAssessments.map(assessment => [assessment.id, assessment])).values()],
  };
}

export function projectItalianUnitOne(catalog: CourseCatalog, unit: CourseUnit): CourseCatalog {
  const previous = catalog.units.find(item => item.id === unit.id);
  return {
    ...catalog,
    units: catalog.units.map(item => item.id === unit.id ? italianUnitSummary(unit) : item),
    assessments: [...catalog.assessments.filter(item => item.id !== previous?.quizId && item.id !== unit.quiz.id), assessmentSummary(unit.quiz)],
  };
}

/**
 * The daily home only receives compact summaries. Resolve the same active identities
 * without importing lesson content into that bundle or aliasing old assessment results.
 */
export function projectStoredItalianInterestCatalog(
  catalog: CourseCatalog, progress: CourseProgress, read: (key: string) => string | null,
  fallbackInterests: readonly InterestId[] = [],
): CourseCatalog {
  const firstUnits = [...(catalog.retainedUnits ?? []), ...catalog.units].filter(unit => unit.id === "u01");
  const units = firstUnits.filter(unit => unit.lessons.length === SLOT_COUNT &&
    unit.lessons.every(lesson => italianLessonInterest(lesson) !== null &&
      italianLessonInterest(lesson) === italianLessonInterest(unit.lessons[0])));
  const legacyUnits = firstUnits.filter(unit => unit.lessons.every(lesson => italianLessonInterest(lesson) === null));
  if (!units.length || !legacyUnits.length) return catalog;
  const selection = parseItalianInterestSelection(read(ITALIAN_INTEREST_SELECTION_KEY), { units, legacyUnits }, progress.resetAt);
  let legacy = selection?.mode === "legacy" ? legacyUnits.find(unit => unitKey(unit) === selection.legacyUnitKey) : undefined;
  if (!selection) {
    legacy = legacyUnits.map(unit => ({
      unit,
      evidence: progress.resume?.unitId === "u01" && unit.lessons.some(lesson => lesson.id === progress.resume?.lessonId)
        ? Number.MAX_SAFE_INTEGER
        : Math.max(-1, ...unit.activityIds.map(id => progress.activities[id]?.lastAt ?? -1),
          progress.assessments[unit.quizId]?.last.completedAt ?? -1,
          unit.midpointId ? progress.assessments[unit.midpointId]?.last.completedAt ?? -1 : -1,
          progress.productionsUpdatedAt[unit.productionId] ?? -1),
    })).filter(item => item.evidence >= 0).sort((left, right) => right.evidence - left.evidence)[0]?.unit;
    if (!legacy) {
      legacy = legacyUnits.find(unit => {
        const firstMeeting = unit.lessons[0]?.id.startsWith("it2-u01-");
        const raw = read(firstMeeting ? "yo.italian.guided.v2.u01" : "yo.italian.guided.v1.u01");
        if (!raw || raw.length > 50000) return false;
        try {
          const draft: unknown = JSON.parse(raw);
          return object(draft) && draft.version === 1 && draft.resetAt === progress.resetAt &&
            ((draft.view === "mission" || draft.view === "challenge" || draft.view === "result") ||
              draft.resumeView === "mission" || draft.resumeView === "challenge" ||
              (Array.isArray(draft.seen) && draft.seen.some(id => typeof id === "string" && unit.lessons.some(lesson => id.startsWith(lesson.id + ":")))));
        } catch { return false; }
      });
    }
  }
  let summary = legacy;
  if (!summary) {
    let preferences = parseInterests(fallbackInterests);
    const raw = read(interestPreferenceKey("it"));
    try { if (raw !== null && raw.length <= 500) preferences = parseInterests(JSON.parse(raw)); } catch { /* Use the saved learning profile. */ }
    const chosen = interestIds.filter(interest => (!preferences.length || preferences.includes(interest)) &&
      units.some(unit => italianLessonInterest(unit.lessons[0]) === interest));
    const choices = chosen.length ? chosen : interestIds.filter(interest => units.some(unit => italianLessonInterest(unit.lessons[0]) === interest));
    const pins = selection?.pinned.map(pin => pin ? { ...pin } : null) ?? emptyPins();
    if (!selection) for (const unit of units) for (const [slot, lesson] of unit.lessons.entries()) {
      const attempted = lesson.activityIds.map(id => progress.activities[id]?.lastAt).filter((value): value is number => value !== undefined);
      if (progress.resume?.lessonId === lesson.id && progress.resume.unitId === "u01") attempted.push(progress.resumeUpdatedAt);
      if (attempted.length) pins[slot] = earlierPin(pins[slot], { lessonId: lesson.id, beganAt: Math.min(...attempted) });
    }
    const lessons = pins.map(pin => pin ? units.flatMap(unit => unit.lessons).find(lesson => lesson.id === pin.lessonId) ?? null : null);
    const counts = new Map(choices.map(interest => [interest, lessons.filter(lesson => lesson && italianLessonInterest(lesson) === interest).length]));
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      if (lessons[slot]) continue;
      const interest = [...choices].sort((left, right) => (counts.get(left) ?? 0) - (counts.get(right) ?? 0))[0];
      lessons[slot] = [...units].reverse().find(unit => italianLessonInterest(unit.lessons[0]) === interest)?.lessons[slot] ?? null;
      if (interest) counts.set(interest, (counts.get(interest) ?? 0) + 1);
    }
    const template = units.find(unit => unit.lessons.some(lesson => lesson.id === lessons[0]?.id));
    if (!template || lessons.some(lesson => !lesson)) return catalog;
    const selectedLessons = lessons as CourseUnitSummary["lessons"];
    summary = {
      ...template, lessons: selectedLessons, activityIds: selectedLessons.flatMap(lesson => lesson.activityIds),
      phraseCount: selectedLessons.reduce((total, lesson) => total + (lesson.phraseCount ?? 0), 0),
      ...(new Set(selectedLessons.map(italianLessonInterest)).size > 1 ? {
        title: { fr: "Premières découvertes en italien", en: "First discoveries in Italian", es: "Primeros descubrimientos en italiano" },
      } : {}),
    };
  }
  const activeSummary = summary;
  const previous = catalog.units.find(unit => unit.id === "u01");
  const assessment = [...catalog.assessments, ...(catalog.retainedAssessments ?? [])].find(item => item.id === activeSummary.quizId);
  if (!assessment) return catalog;
  return {
    ...catalog, units: catalog.units.map(unit => unit.id === "u01" ? activeSummary : unit),
    assessments: [...catalog.assessments.filter(item => item.id !== previous?.quizId && item.id !== assessment.id), assessment],
  };
}
