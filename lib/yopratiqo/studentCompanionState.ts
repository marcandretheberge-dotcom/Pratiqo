/**
 * Student dashboard YoPratiqo companion state derivation.
 *
 * Inputs
 * ------
 *   • `snapshots` — the authenticated student's own snapshot rows from
 *     `public.yopratiqo_progress_snapshots` (returned by GET /api/yo/progress).
 *     The function never accepts another user's rows.
 *
 * Outputs
 * -------
 *   • `state` — one of the CompanionVisualState values that the
 *     CompanionAvatar renders. Used to pick the right travel-companion
 *     PNG for the YoPratiqo student card.
 *   • `completedModulesCount`, `currentLevelLabel`, `courseLabel`,
 *     `lastActivityAt`, `primaryCtaLabel`, `primaryCtaHref` — small,
 *     safe display metadata.
 *
 * Privacy contract
 * ----------------
 *   • No raw quiz answers, attempt logs, scores, or per-question data
 *     are produced. The function only reads the narrow allow-listed
 *     columns from `ProgressSnapshotRow` (module ids, progress lifecycle
 *     state, opaque score band, and the public level label).
 *   • The output never includes a numeric score — only an opaque visual
 *     state and a CEFR-style level label that already lives on each
 *     snapshot row.
 *   • The function does NOT call AI, network APIs, or any payment /
 *     legal / Membre Pro / SEO surface.
 *
 * State mapping precedence (highest first)
 * ----------------------------------------
 *   1. No snapshots                                   → "idle"
 *   2. Last activity older than INACTIVITY_DAYS       → "inactive"
 *   3. Module "module-5" snapshot is completed/reviewed → "badge_unlocked"
 *   4. Any module completed within RECENT_DAYS        → "celebrating"
 *   5. Any module ever completed/reviewed             → "teacher_ready"
 *   6. Any module started (but none completed)        → "map"
 *   7. Fallback                                       → "idle"
 *
 * Stages 4 and 5 both apply when a student has just completed a module:
 * the most-recent completion wins the visual ("celebrating"), and once
 * RECENT_DAYS elapses we settle into the persistent "teacher_ready"
 * state to remind the student their progress is shareable.
 */

import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { ProgressSnapshotRow } from "@/lib/yopratiqo/progressSnapshotPersistence";

/** Days since `last_activity_at` after which the companion looks inactive. */
export const INACTIVITY_DAYS = 30;

/** Days after a completion within which the companion still celebrates. */
export const RECENT_DAYS = 7;

/** Module ID that unlocks the "badge_unlocked" capstone visual. */
export const CAPSTONE_MODULE_ID = "module-5";

/** Locales the student-facing card supports. */
export type StudentCompanionLocale = "fr" | "en" | "es";

/**
 * Localized CTA labels for the YoPratiqo companion card. Kept in this
 * file so the helper can return a complete UI-ready object.
 */
const CTA_COPY: Record<StudentCompanionLocale, { idle: string; active: string }> = {
  fr: {
    idle: "Commencer YoPratiqo",
    active: "Continuer YoPratiqo",
  },
  en: {
    idle: "Start YoPratiqo",
    active: "Continue YoPratiqo",
  },
  es: {
    idle: "Comenzar YoPratiqo",
    active: "Continuar YoPratiqo",
  },
};

const COMPLETED_STATES: ReadonlySet<string> = new Set(["completed", "reviewed"]);

/**
 * Subset of `ProgressSnapshotRow` we actually read. Defined here so the
 * helper has no implicit dependency on the full DB row shape (handy for
 * unit tests).
 */
export type StudentCompanionSnapshotInput = Pick<
  ProgressSnapshotRow,
  | "course_id"
  | "module_id"
  | "module_title"
  | "discipline"
  | "level_label"
  | "progress_state"
  | "last_activity_at"
  | "completed_at"
>;

export type StudentCompanionState = {
  /** Visual state to render via CompanionAvatar. */
  state: CompanionVisualState;
  /** Distinct completed/reviewed modules. */
  completedModulesCount: number;
  /** Highest-ranked CEFR-style level label across completed snapshots. */
  currentLevelLabel: string | null;
  /** Localized course label (or null when no snapshots). */
  courseLabel: string | null;
  /** ISO timestamp of the most recent snapshot, if any. */
  lastActivityAt: string | null;
  /** Whether the student has any persisted progress. */
  hasAnyProgress: boolean;
  /** Whether the student has at least one completed/reviewed module. */
  hasShareableProgress: boolean;
  /** Primary CTA label, locale-aware. */
  primaryCtaLabel: string;
  /** Where the CTA should link. Always the YoPratiqo landing. */
  primaryCtaHref: string;
};

function safeLocale(locale: StudentCompanionLocale | undefined): StudentCompanionLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

/**
 * Coarse CEFR ordering used to pick the "current" level when the student
 * has completed modules at multiple levels. Anything not in this table
 * sorts after the known ones, in lexicographic order.
 */
const LEVEL_RANK: Record<string, number> = {
  A1: 1,
  "A1+": 2,
  A2: 3,
  "A2+": 4,
  B1: 5,
  "B1+": 6,
  B2: 7,
  C1: 8,
  C2: 9,
};

function rankLevel(label: string | null | undefined): number {
  if (typeof label !== "string") return 0;
  const trimmed = label.trim();
  if (!trimmed) return 0;
  return LEVEL_RANK[trimmed] ?? 0;
}

/**
 * Translate a course_id like "yopratiqo:es:republique-dominicaine" into a
 * short, locale-aware human label. Unknown ids fall back to the snapshot's
 * `discipline` so we never display a raw slug to the student.
 */
function deriveCourseLabel(
  snapshot: StudentCompanionSnapshotInput,
  locale: StudentCompanionLocale,
): string {
  const id = snapshot.course_id;
  if (id === "yopratiqo:es:republique-dominicaine") {
    if (locale === "en") return "Spanish · Dominican Republic";
    if (locale === "es") return "Español · República Dominicana";
    return "Espagnol · République dominicaine";
  }
  // Fallback to the snapshot's own discipline (e.g. "Languages") rather
  // than exposing the raw slug.
  return snapshot.discipline ?? "YoPratiqo";
}

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function parseDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export type DeriveStudentCompanionStateOptions = {
  /** UI locale. Defaults to "fr". */
  locale?: StudentCompanionLocale;
  /**
   * Reference "now". Tests pass a fixed date so the inactivity / recency
   * thresholds are deterministic.
   */
  now?: Date;
};

/**
 * Pure derivation of the YoPratiqo student companion state.
 * Safe to call from server or client components.
 */
export function deriveStudentCompanionState(
  snapshots: readonly StudentCompanionSnapshotInput[] | null | undefined,
  options: DeriveStudentCompanionStateOptions = {},
): StudentCompanionState {
  const locale = safeLocale(options.locale);
  const now = options.now ?? new Date();
  const ctaCopy = CTA_COPY[locale];

  const rows = Array.isArray(snapshots) ? snapshots : [];
  if (rows.length === 0) {
    return {
      state: "idle",
      completedModulesCount: 0,
      currentLevelLabel: null,
      courseLabel: null,
      lastActivityAt: null,
      hasAnyProgress: false,
      hasShareableProgress: false,
      primaryCtaLabel: ctaCopy.idle,
      primaryCtaHref: "/yo",
    };
  }

  // Distinct completed module keys = unique (course_id, module_id) pairs
  // whose lifecycle state is `completed` or `reviewed`.
  const completedKeys = new Set<string>();
  const completedRows: StudentCompanionSnapshotInput[] = [];
  let capstoneCompleted = false;
  let mostRecentDate: Date | null = null;
  let mostRecentRow: StudentCompanionSnapshotInput | null = null;
  let mostRecentCompletionDate: Date | null = null;

  for (const row of rows) {
    const lastActivity = parseDate(row.last_activity_at);
    if (lastActivity && (!mostRecentDate || lastActivity > mostRecentDate)) {
      mostRecentDate = lastActivity;
      mostRecentRow = row;
    }

    const isCompleted = COMPLETED_STATES.has(row.progress_state);
    if (isCompleted) {
      completedKeys.add(`${row.course_id}::${row.module_id}`);
      completedRows.push(row);
      if (row.module_id === CAPSTONE_MODULE_ID) capstoneCompleted = true;
      const completionDate = parseDate(row.completed_at) ?? lastActivity;
      if (completionDate && (!mostRecentCompletionDate || completionDate > mostRecentCompletionDate)) {
        mostRecentCompletionDate = completionDate;
      }
    }
  }

  const completedModulesCount = completedKeys.size;
  const hasShareableProgress = completedModulesCount > 0;
  const courseLabel = mostRecentRow ? deriveCourseLabel(mostRecentRow, locale) : null;
  const lastActivityAt = mostRecentDate ? mostRecentDate.toISOString() : null;

  // Highest-ranked CEFR level across completed snapshots (so a student
  // who finished an A2 module sees "A2" even if they later replayed an
  // A1 one). If no completions, fall back to the most recent snapshot.
  let currentLevelLabel: string | null = null;
  let bestRank = -1;
  for (const row of completedRows) {
    const r = rankLevel(row.level_label);
    if (r > bestRank) {
      bestRank = r;
      currentLevelLabel = row.level_label ?? null;
    }
  }
  if (!currentLevelLabel && mostRecentRow) {
    currentLevelLabel = mostRecentRow.level_label ?? null;
  }

  // Stage selection — apply precedence top to bottom.
  let state: CompanionVisualState = "idle";

  const daysSinceActivity = mostRecentDate ? daysBetween(now, mostRecentDate) : null;
  if (daysSinceActivity !== null && daysSinceActivity >= INACTIVITY_DAYS) {
    state = "inactive";
  } else if (capstoneCompleted) {
    state = "badge_unlocked";
  } else if (
    mostRecentCompletionDate
    && daysBetween(now, mostRecentCompletionDate) <= RECENT_DAYS
  ) {
    state = "celebrating";
  } else if (hasShareableProgress) {
    state = "teacher_ready";
  } else {
    // At least one row exists but none completed — student has only
    // "started" snapshots. Show the map (exploration) state.
    const hasAnyStarted = rows.some((row) => row.progress_state === "started");
    state = hasAnyStarted ? "map" : "idle";
  }

  return {
    state,
    completedModulesCount,
    currentLevelLabel,
    courseLabel,
    lastActivityAt,
    hasAnyProgress: true,
    hasShareableProgress,
    primaryCtaLabel: hasShareableProgress ? ctaCopy.active : ctaCopy.idle,
    primaryCtaHref: "/yo",
  };
}
