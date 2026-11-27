"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { YoppoWelcomeLoading } from "../onboarding/YoppoJournal";
import { GuidedItalianCourse } from "../italian/guided/GuidedItalianCourse";
import { ItalianOnboarding, type PlacementCheck } from "./ItalianOnboarding";
import { GUIDED_PROGRESS_KEY, parseProfile, profileKey, type LearningProfile } from "@/lib/yo/personalized/profile";
import { ITALIAN_COURSE_PROGRESS_KEY, emptyCourseProgress, mergeCourseProgress, parseCourseProgress, serializeCourseProgress, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { GUIDED_KEY, parseGuided } from "@/lib/yo/italian/course/guidedItalian";
import type { CourseCatalog, CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import { italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import {
  INTEREST_PREFERENCES_CHANGED_EVENT, interestPreferenceKey, parseInterests, readInterestPreferences,
  writeInterestPreferences, type InterestId,
} from "@/lib/yo/interests/preferences";
import {
  ITALIAN_INTEREST_DRAFT_KEY, ITALIAN_INTEREST_SELECTION_KEY, beginItalianInterestLesson,
  italianUnitOneForReview, mergeItalianInterestSelection, parseItalianInterestSelection,
  projectItalianUnitOne, reconcileItalianInterestSelection, retainItalianInterestHistory,
  selectedItalianUnitOne, type ItalianInterestBank, type ItalianInterestSelection,
} from "@/lib/yo/italian/interests/selection";
import { InterestChoices } from "../interests/InterestChoices";
import { ItalianToday } from "../daily/ItalianToday";
import { LearningFeedbackProvider } from "../feedback/LearningFeedback";

type Props = ComponentProps<typeof GuidedItalianCourse> & {
  checks: PlacementCheck[];
  placementAudio: Record<string, string>;
  entryHome?: boolean;
  todayEnabled?: boolean;
  interestUnits?: CourseUnit[];
  legacyUnits?: CourseUnit[];
};
const EMPTY_UNITS: CourseUnit[] = [];
type FrozenMission = { route: string; resetAt: number; unit: CourseUnit; catalog: CourseCatalog; draftKey?: string; overridden: boolean };

export function ItalianLearningEntry(props: Props) {
  return <LearningFeedbackProvider><ItalianLearningEntryBody {...props}/></LearningFeedbackProvider>;
}

function begunLegacyDrafts(bank: ItalianInterestBank, resetAt: number): string[] {
  return bank.legacyUnits.filter(unit => {
    const firstMeeting = unit.lessons[0]?.id.startsWith("it2-u01-");
    const raw = localStorage.getItem(firstMeeting ? "yo.italian.guided.v2.u01" : GUIDED_KEY);
    const state = parseGuided(raw, unit, resetAt, firstMeeting ? unit.lessons.map(lesson => lesson.id) : []);
    return state.view !== "map" || state.resumeView !== null || state.seen.length > 0 ||
      state.answers.length > 0 || state.submitted || state.runStartedAt > 0;
  }).map(unit => unit.lessons[0].id);
}

function ItalianLearningEntryBody({
  checks, placementAudio, entryHome = false, todayEnabled = false,
  interestUnits = EMPTY_UNITS, legacyUnits = EMPTY_UNITS, ...course
}: Props) {
  const unitId = course.unit.id;
  const parentLessonStart = course.onLessonStart;
  const parentMapReturn = course.onMapReturn;
  const parentProgressSnapshot = course.onProgressSnapshot;
  const parentDraftSnapshot = course.onDraftSnapshot;
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [selection, setSelection] = useState<ItalianInterestSelection | null>(null);
  const [todayProgress, setTodayProgress] = useState(emptyCourseProgress);
  const [draftSnapshots, setDraftSnapshots] = useState<Record<string, string>>({});
  const [frozenMission, setFrozenMission] = useState<FrozenMission | null>(null);
  const currentFrozenMission = useRef<FrozenMission | null>(null);
  const currentProfile = useRef(profile);
  const currentSelection = useRef(selection);
  const currentProgress = useRef<CourseProgress>(emptyCourseProgress());
  const currentInterests = useRef<InterestId[]>([]);
  const bank = useMemo<ItalianInterestBank>(() => ({
    units: interestUnits.filter(unit => unit.id === "u01" && unit.lessons.length === 3),
    legacyUnits: legacyUnits.length ? legacyUnits.filter(unit => unit.id === "u01") : course.unit.id === "u01" ? [course.unit] : [],
  }), [interestUnits, legacyUnits, course.unit]);
  const hasVariants = bank.units.length > 0 && bank.legacyUnits.length > 0;
  const historyCatalog = useMemo(() => hasVariants
    ? retainItalianInterestHistory(course.catalog, [...bank.legacyUnits, ...bank.units])
    : course.catalog, [hasVariants, course.catalog, bank]);

  const rememberProfile = useCallback((next: LearningProfile | null) => {
    currentProfile.current = next;
    setProfile(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const rememberInterests = useCallback((next: InterestId[]) => {
    currentInterests.current = next;
    setInterests(previous => previous.join(",") === next.join(",") ? previous : next);
  }, []);
  const rememberProgress = useCallback((next: CourseProgress) => {
    const merged = mergeCourseProgress(currentProgress.current, next);
    if (serializeCourseProgress(merged) !== serializeCourseProgress(currentProgress.current)) {
      currentProgress.current = merged;
      setTodayProgress(merged);
    }
    parentProgressSnapshot?.(merged);
  }, [parentProgressSnapshot]);
  const rememberDraft = useCallback((key: string, raw: string) => {
    setDraftSnapshots(previous => previous[key] === raw ? previous : { ...previous, [key]: raw });
    parentDraftSnapshot?.(key, raw);
  }, [parentDraftSnapshot]);
  const persistSelection = useCallback((next: ItalianInterestSelection) => {
    const serialized = JSON.stringify(next);
    if (JSON.stringify(currentSelection.current) !== serialized) {
      currentSelection.current = next;
      setSelection(next);
    }
    try {
      if (localStorage.getItem(ITALIAN_INTEREST_SELECTION_KEY) !== serialized) {
        localStorage.setItem(ITALIAN_INTEREST_SELECTION_KEY, serialized);
      }
    } catch { setSaved(false); }
  }, []);

  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      let nextProfile = currentProfile.current;
      let progress = currentProgress.current;
      try {
        nextProfile = parseProfile(localStorage.getItem(profileKey("it")), "it", historyCatalog.units.map(unit => unit.id));
        // Preserve exact legacy IDs; no outcome is copied to a replacement activity.
        if (!localStorage.getItem(GUIDED_PROGRESS_KEY)) {
          const legacy = localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);
          if (legacy) localStorage.setItem(GUIDED_PROGRESS_KEY, serializeCourseProgress(parseCourseProgress(legacy, historyCatalog)));
        }
        progress = mergeCourseProgress(progress, parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY), historyCatalog));
      } catch { setSaved(false); }
      currentProgress.current = progress;
      setTodayProgress(progress);
      const nextInterests = readInterestPreferences("it") ?? nextProfile?.interests ?? currentInterests.current;
      rememberInterests(nextInterests);
      if (nextProfile) nextProfile = { ...nextProfile, interests: nextInterests };
      rememberProfile(nextProfile);
      if (hasVariants) {
        let stored: ItalianInterestSelection | null = null;
        let begun: string[] = [];
        try {
          stored = parseItalianInterestSelection(localStorage.getItem(ITALIAN_INTEREST_SELECTION_KEY), bank, progress.resetAt);
          begun = begunLegacyDrafts(bank, progress.resetAt);
        } catch { setSaved(false); }
        const memory = currentSelection.current?.resetAt === progress.resetAt ? currentSelection.current : null;
        persistSelection(reconcileItalianInterestSelection(mergeItalianInterestSelection(memory, stored), bank, progress, begun));
      }
      if (entryHome && nextProfile && !todayEnabled) {
        const id = progress.resume?.unitId ?? nextProfile.startUnitId;
        if (id !== course.unit.id) { window.location.replace(italianCourseHref(course.locale, id)); return; }
      }
      setReady(true);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || [GUIDED_PROGRESS_KEY, ITALIAN_INTEREST_SELECTION_KEY, profileKey("it"), interestPreferenceKey("it")].includes(event.key)) schedule();
    };
    const onPreferences = (event: Event) => {
      if ((event as CustomEvent<{ language?: string }>).detail?.language === "it") schedule();
    };
    schedule();
    window.addEventListener("pageshow", schedule);
    window.addEventListener("storage", onStorage);
    window.addEventListener(INTEREST_PREFERENCES_CHANGED_EVENT, onPreferences);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", schedule);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(INTEREST_PREFERENCES_CHANGED_EVENT, onPreferences);
    };
  }, [bank, hasVariants, historyCatalog, course.unit.id, course.locale, entryHome, todayEnabled, persistSelection, rememberProfile, rememberInterests]);

  const activeFirstUnit = useMemo(() => hasVariants && selection
    ? selectedItalianUnitOne(bank, selection, interests) : bank.legacyUnits[0],
  [hasVariants, selection, bank, interests]);
  const review = useMemo(() => course.unit.id === "u01" && hasVariants && activeFirstUnit
    ? italianUnitOneForReview(activeFirstUnit, bank, course.initialLessonId)
    : { unit: course.unit, overridden: false },
  [course.unit, course.initialLessonId, hasVariants, activeFirstUnit, bank]);
  const activeCatalog = useMemo(() => activeFirstUnit && hasVariants
    ? projectItalianUnitOne(historyCatalog, activeFirstUnit) : historyCatalog,
  [historyCatalog, activeFirstUnit, hasVariants]);
  const displayCatalog = useMemo(() => review.overridden
    ? projectItalianUnitOne(activeCatalog, review.unit) : activeCatalog,
  [review, activeCatalog]);
  const plannedDraftKey = review.overridden ? review.draftKey
    : course.unit.id === "u01" && hasVariants && selection?.mode === "interests" ? ITALIAN_INTEREST_DRAFT_KEY
    : course.unit.id === "u01" && activeFirstUnit?.lessons[0]?.id !== course.unit.lessons[0]?.id ? GUIDED_KEY
    : course.draftKey;
  const route = course.unit.id + "/" + (course.initialLessonId ?? "") + "/" + (course.initialActivityId ?? "");
  const frozen = frozenMission?.route === route && frozenMission.resetAt === (selection?.resetAt ?? 0) ? frozenMission : null;
  const displayedUnit = frozen?.unit ?? review.unit;
  const displayedCatalog = frozen?.catalog ?? displayCatalog;
  const draftKey = frozen ? frozen.draftKey : plannedDraftKey;
  const playerDraftKey = draftKey ?? (course.storageNamespace
    ? course.storageNamespace + ".guided." + displayedUnit.id : "yo.italian.guided.v2." + displayedUnit.id);
  const reviewOverridden = frozen ? frozen.overridden : review.overridden;
  const visualWords = useMemo(() => Object.fromEntries(Object.entries(course.visualWords ?? {})
    .filter(([lessonId]) => displayedUnit.lessons.some(lesson => lesson.id === lessonId))),
  [course.visualWords, displayedUnit]);
  const wordBank = useMemo(() => {
    if (displayedUnit.lessons[0]?.id === course.unit.lessons[0]?.id && !displayedUnit.lessons.some(lesson => lesson.discovery)) return course.wordBank;
    const phrases = displayedUnit.lessons.flatMap(lesson => [...lesson.vocabulary, ...lesson.grammar.examples]);
    return [...new Map(phrases.map(phrase => [phrase.it, phrase])).values()].map(phrase => ({ ...phrase, group: "expressions" as const }));
  }, [displayedUnit, course.unit, course.wordBank]);
  const returnToMap = useCallback(() => {
    currentFrozenMission.current = null;
    setFrozenMission(null);
    parentMapReturn?.();
  }, [parentMapReturn]);

  const onLessonStart = useCallback((lessonId: string) => {
    parentLessonStart?.(lessonId);
    if (!hasVariants || unitId !== "u01") return;
    // A preference or pin arriving from another tab cannot replace a running game's content.
    const previousFrozen = currentFrozenMission.current;
    if (!previousFrozen || previousFrozen.route !== route || previousFrozen.resetAt !== (currentSelection.current?.resetAt ?? 0)) {
      const snapshot = { route, resetAt: currentSelection.current?.resetAt ?? 0, unit: displayedUnit, catalog: displayedCatalog, draftKey, overridden: reviewOverridden };
      currentFrozenMission.current = snapshot;
      setFrozenMission(snapshot);
    }
    if (reviewOverridden || !currentSelection.current) return;
    let progress = currentProgress.current;
    let stored: ItalianInterestSelection | null = null;
    try {
      progress = mergeCourseProgress(progress, parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY), historyCatalog));
      stored = parseItalianInterestSelection(localStorage.getItem(ITALIAN_INTEREST_SELECTION_KEY), bank, progress.resetAt);
    } catch { setSaved(false); }
    currentProgress.current = progress;
    const reconciled = reconcileItalianInterestSelection(mergeItalianInterestSelection(currentSelection.current, stored), bank, progress);
    persistSelection(beginItalianInterestLesson(reconciled, bank, lessonId));
  }, [parentLessonStart, unitId, hasVariants, route, displayedUnit, displayedCatalog, draftKey, reviewOverridden, historyCatalog, bank, persistSelection]);

  function configure() {
    returnToMap();
    setEditing(true);
  }

  function complete(next: LearningProfile) {
    try { localStorage.setItem(profileKey("it"), JSON.stringify(next)); setSaved(true); }
    catch { setSaved(false); }
    rememberProfile(next);
    rememberInterests(parseInterests(next.interests));
    setEditing(false);
    if ((!entryHome || !todayEnabled) && next.startUnitId !== course.unit.id) {
      window.location.assign(italianCourseHref(course.locale, next.startUnitId));
    }
  }
  function changeInterests(next: InterestId[]) {
    rememberInterests(next);
    const nextProfile = currentProfile.current ? { ...currentProfile.current, interests: next, updatedAt: Date.now() } : null;
    rememberProfile(nextProfile);
    const preferencesSaved = writeInterestPreferences("it", next);
    try {
      if (nextProfile) localStorage.setItem(profileKey("it"), JSON.stringify(nextProfile));
      setSaved(preferencesSaved);
    } catch { setSaved(false); }
  }
  const words = (fr: string, en: string, es: string) => t(fr, en, es)[course.locale];
  const interestControls = course.unit.id === "u01" && hasVariants ? <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-5 text-stone-800" data-italian-course-interests>
    <details>
      <summary className="cursor-pointer font-bold">{words("Les sujets de mes leçons", "My lesson subjects", "Los temas de mis lecciones")}</summary>
      <div className="mt-4"><InterestChoices locale={course.locale} value={interests} onChange={changeInterests}/></div>
      <p className="mt-4 text-sm leading-6 text-stone-600">{selection?.mode === "legacy"
        ? words("Cette première unité déjà commencée garde ses leçons et tes progrès.", "This first unit was already started, so its lessons and your progress stay together.", "Esta primera unidad ya estaba empezada, así que conserva sus lecciones y tu progreso.")
        : words("Dans cette première unité, tes choix changent les leçons qui ne sont pas encore commencées. Une leçon commencée garde son sujet.", "In this first unit, your choices shape lessons you have not started yet. A started lesson keeps its subject.", "En esta primera unidad, tus elecciones cambian las lecciones que aún no has empezado. Una lección empezada conserva su tema.")}</p>
    </details>
    {reviewOverridden ? <p className="mt-3 text-sm leading-6">{words("Tu révises la leçon originale. ", "You are reviewing the original lesson. ", "Estás repasando la lección original. ")}<Link className="font-semibold text-emerald-800 underline" href={italianCourseHref(course.locale, "u01")}>{words("Revenir à mon parcours", "Return to my journey", "Volver a mi recorrido")}</Link></p> : null}
  </section> : course.interestControls;

  if (!ready) return <YoppoWelcomeLoading locale={course.locale}/>;
  if (!profile || editing) return <ItalianOnboarding locale={course.locale} catalog={activeCatalog} checks={checks} audioPaths={placementAudio} initial={profile} onComplete={complete} onCancel={profile ? () => setEditing(false) : undefined}/>;
  if (entryHome && todayEnabled) return <ItalianToday catalog={activeCatalog} progress={todayProgress} locale={course.locale} startUnitId={profile.startUnitId} onConfigure={configure}/>;
  return <>
    {!saved ? <p role="status" className="bg-amber-50 p-3 text-sm text-amber-900">{words("Tes préférences restent dans cette session seulement.", "Your preferences last for this session only.", "Tus preferencias duran solo esta sesión.")}</p> : null}
    <GuidedItalianCourse key={course.unit.id + ":" + playerDraftKey + ":" + displayedUnit.lessons.map(lesson => lesson.id).join(",")}
      {...course} unit={displayedUnit} catalog={displayedCatalog}
      wordBank={wordBank} visualWords={visualWords} profile={profile} onConfigure={configure}
      onLessonStart={onLessonStart} onMapReturn={returnToMap} draftKey={playerDraftKey} interestControls={interestControls} progressKey={GUIDED_PROGRESS_KEY}
      progressSeed={todayProgress} onProgressSnapshot={rememberProgress}
      draftSeed={draftSnapshots[playerDraftKey] ?? course.draftSeed} onDraftSnapshot={rememberDraft}/>
  </>;
}
