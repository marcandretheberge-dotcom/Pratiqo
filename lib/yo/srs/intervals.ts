/**
 * Shared SRS review intervals (spec §2.3).
 *
 * One default for every language: Leitner [1, 3, 7, 14] days — the exact
 * schedule the Italian course already ships (`COURSE_REVIEW_INTERVAL_DAYS`
 * in lib/yo/italian/course/courseProgress.ts). A per-language override is
 * only allowed via `YoLanguageConfig.reviewIntervalsDays` and only with
 * measured evidence (spec §9, open choice 4); at launch every language
 * uses this default.
 */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;

export const SRS_DAY_MS = 86400000;
export const SRS_MAX_STREAK = 4;
export const SRS_MAX_ATTEMPTS = 100000;
