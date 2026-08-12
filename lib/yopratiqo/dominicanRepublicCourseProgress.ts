/**
 * Dominican Republic YoPratiqo course progress — canonical resume resolver.
 *
 * Converts the authenticated student's own progress snapshot rows (Modules 2–5
 * only; Intro is not persisted yet) into:
 *   • completed module ids
 *   • the next incomplete step
 *   • a Continue-learning href
 *   • per-roadmap-step statuses for `<YoCoursePath />`
 *
 * Pure and deterministic. Safe to call from server or client code with rows
 * returned only for the authenticated user (never another user's data).
 */

import { DOMINICAN_RD_COURSE_ID } from "@/lib/yo/dominicanRepublicProgressPayloads";
import type { YoCoursePathStatus } from "@/components/yo/YoCoursePath";
import type { ProgressSnapshotRow } from "@/lib/yopratiqo/progressSnapshotPersistence";

/** Persisted DR module ids in canonical progression order. Intro excluded. */
export const DOMINICAN_RD_ORDERED_MODULES = [
  "module-2",
  "module-3",
  "module-4",
  "module-5",
] as const;

export type DominicanRdPersistedModuleId =
  (typeof DOMINICAN_RD_ORDERED_MODULES)[number];

/** Full Course Home / hub roadmap step ids (Intro + Modules 2–5). */
export type DominicanRdRoadmapStepId =
  | "intro"
  | DominicanRdPersistedModuleId;

export type DominicanRdProgressSnapshotInput = Pick<
  ProgressSnapshotRow,
  "course_id" | "module_id" | "progress_state"
>;

export const DOMINICAN_RD_ROUTES = {
  courseHome: "/yo/langues/espagnol/pays/republique-dominicaine",
  intro: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  "module-2": "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  "module-3": "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  "module-4": "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  "module-5": "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
} as const;

const COMPLETED_STATES: ReadonlySet<string> = new Set(["completed", "reviewed"]);

const PERSISTED_MODULE_SET: ReadonlySet<string> = new Set(DOMINICAN_RD_ORDERED_MODULES);

function isPersistedModuleId(value: string): value is DominicanRdPersistedModuleId {
  return PERSISTED_MODULE_SET.has(value);
}

/** Default Intro-first roadmap when no authenticated progress is available. */
export const DOMINICAN_RD_ANONYMOUS_ROADMAP_STATUSES: Record<
  DominicanRdRoadmapStepId,
  YoCoursePathStatus
> = {
  intro: "next",
  "module-2": "available",
  "module-3": "available",
  "module-4": "available",
  "module-5": "available",
};

export type DominicanRdCourseProgress = {
  /** Distinct completed Modules 2–5 for the DR course. */
  completedModuleIds: readonly DominicanRdPersistedModuleId[];
  /** Next resume target. Intro when no module completions exist yet. */
  nextStepId: DominicanRdRoadmapStepId | "course-complete";
  /** Locale-agnostic path; append `?lang=` when needed. */
  continueHref: string;
  /** True when Modules 2–5 are all completed/reviewed. */
  courseComplete: boolean;
  /** Status per roadmap step for `<YoCoursePath />`. */
  roadmapStatuses: Record<DominicanRdRoadmapStepId, YoCoursePathStatus>;
};

export type DeriveDominicanRdCourseProgressOptions = {
  /**
   * Optional locale query suffix (`""` or `"?lang=en"`). Applied to
   * `continueHref` only.
   */
  langSuffix?: string;
};

type ContinueLocale = "fr" | "en" | "es";

const CONTINUE_LABELS: Record<
  ContinueLocale,
  { intro: string; resume: string; complete: string }
> = {
  fr: {
    intro: "Commencer gratuitement",
    resume: "Continuer mon parcours",
    complete: "Parcours terminé",
  },
  en: {
    intro: "Start for free",
    resume: "Continue learning",
    complete: "Course complete",
  },
  es: {
    intro: "Empezar gratis",
    resume: "Continuar mi aprendizaje",
    complete: "Curso completado",
  },
};

/** Localized Continue / primary CTA label for Course Home and student hub. */
export function dominicanRdContinueLabel(
  locale: ContinueLocale,
  progress: DominicanRdCourseProgress,
): string {
  const l = locale === "en" || locale === "es" ? locale : "fr";
  const copy = CONTINUE_LABELS[l];
  if (progress.courseComplete) return copy.complete;
  if (progress.nextStepId === "intro") return copy.intro;
  return copy.resume;
}

function withLangSuffix(href: string, langSuffix: string | undefined): string {
  if (!langSuffix) return href;
  return `${href}${langSuffix}`;
}

/**
 * Collect completed Modules 2–5 for the Dominican Republic course.
 * Unknown module ids and other courses are ignored. Duplicates collapse
 * to a single completion when any row is completed/reviewed.
 */
export function collectDominicanRdCompletedModules(
  snapshots: readonly DominicanRdProgressSnapshotInput[] | null | undefined,
): DominicanRdPersistedModuleId[] {
  const rows = Array.isArray(snapshots) ? snapshots : [];
  const completed = new Set<DominicanRdPersistedModuleId>();

  for (const row of rows) {
    if (row.course_id !== DOMINICAN_RD_COURSE_ID) continue;
    const moduleId = row.module_id;
    if (!isPersistedModuleId(moduleId)) continue;
    if (!COMPLETED_STATES.has(row.progress_state)) continue;
    completed.add(moduleId);
  }

  return DOMINICAN_RD_ORDERED_MODULES.filter((id) => completed.has(id));
}

/**
 * Resolve DR course progress for Continue Learning and roadmap statuses.
 *
 * When `snapshots` is null/undefined (anonymous, fetch error, or signed out),
 * returns the Intro-first anonymous default — never fabricated completions.
 */
export function deriveDominicanRdCourseProgress(
  snapshots: readonly DominicanRdProgressSnapshotInput[] | null | undefined,
  options: DeriveDominicanRdCourseProgressOptions = {},
): DominicanRdCourseProgress {
  const langSuffix = options.langSuffix ?? "";
  const completedModuleIds = collectDominicanRdCompletedModules(snapshots);
  const completedSet = new Set(completedModuleIds);
  const hasAnyModuleCompletion = completedModuleIds.length > 0;
  const courseComplete =
    DOMINICAN_RD_ORDERED_MODULES.every((id) => completedSet.has(id));

  let nextStepId: DominicanRdCourseProgress["nextStepId"];
  let continueHref: string;

  if (courseComplete) {
    nextStepId = "course-complete";
    continueHref = withLangSuffix(DOMINICAN_RD_ROUTES.courseHome, langSuffix);
  } else if (!hasAnyModuleCompletion) {
    nextStepId = "intro";
    continueHref = withLangSuffix(DOMINICAN_RD_ROUTES.intro, langSuffix);
  } else {
    const nextModule = DOMINICAN_RD_ORDERED_MODULES.find((id) => !completedSet.has(id));
    if (nextModule) {
      nextStepId = nextModule;
      continueHref = withLangSuffix(DOMINICAN_RD_ROUTES[nextModule], langSuffix);
    } else {
      nextStepId = "intro";
      continueHref = withLangSuffix(DOMINICAN_RD_ROUTES.intro, langSuffix);
    }
  }

  const roadmapStatuses: Record<DominicanRdRoadmapStepId, YoCoursePathStatus> = {
    ...DOMINICAN_RD_ANONYMOUS_ROADMAP_STATUSES,
  };

  if (courseComplete) {
    roadmapStatuses.intro = "available";
    for (const moduleId of DOMINICAN_RD_ORDERED_MODULES) {
      roadmapStatuses[moduleId] = "completed";
    }
  } else if (hasAnyModuleCompletion) {
    roadmapStatuses.intro = "available";
    for (const moduleId of DOMINICAN_RD_ORDERED_MODULES) {
      if (completedSet.has(moduleId)) {
        roadmapStatuses[moduleId] = "completed";
      } else if (moduleId === nextStepId) {
        roadmapStatuses[moduleId] = "next";
      } else {
        roadmapStatuses[moduleId] = "available";
      }
    }
  } else {
    roadmapStatuses.intro = "next";
  }

  return {
    completedModuleIds,
    nextStepId,
    continueHref,
    courseComplete,
    roadmapStatuses,
  };
}
