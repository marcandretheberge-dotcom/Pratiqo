/**
 * Safe, deterministic summary builder for the YoPratiqo teacher bridge.
 *
 * What this is
 * ------------
 * A pure helper that turns existing YoPratiqo module/challenge metadata
 * into a `YoPratiqoProgressSummary` we can confidently render on a teacher
 * surface. The output schema is intentionally narrow — it contains only
 * the fields a teacher needs to prepare a lesson:
 *
 *   • course title
 *   • completed module titles
 *   • CEFR / current-level label
 *   • strengths (skill tags only)
 *   • difficulty/practice areas (difficulty tags only)
 *   • suggested teacher focus (free text strings, deterministic)
 *   • last activity date
 *   • companion bridge summary (id, name, stage, progress percent)
 *
 * What this is NOT
 * ----------------
 * NOT a production persistence layer. The builder transforms inputs that
 * are already public (module titles, CEFR levels, companion stage names)
 * into a UI-ready shape. It NEVER touches a real event ledger or a real
 * Supabase row — those wires are still being designed.
 *
 * Anything coming out of this file is guaranteed to be free of the
 * forbidden raw-quiz fields. `assertSafeTeacherBridgeSummary` enforces
 * the privacy contract at runtime, and `tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts`
 * proves the same statically by source-scan.
 */

import type {
  CompanionBridgeSummary,
  LearningDifficultyTag,
  LearningShareConsentState,
  LearningSkillTag,
  YoPratiqoProgressSummary,
} from "@/lib/yopratiqo/teacherBridge";

// ─────────────────────────────────────────────────────────────────────────
// Forbidden-field guardrail
// ─────────────────────────────────────────────────────────────────────────

/**
 * Keys that MUST NOT appear in any object surfaced to a teacher. They
 * mirror the regex used in `tests/yo/yopratiqoTeacherBridgeFoundation.test.ts`
 * and `tests/yo/yopratiqoLearningEventLedger.test.ts`.
 *
 * Keep this list in sync with both tests so the privacy contract has a
 * single source of truth.
 */
export const FORBIDDEN_TEACHER_BRIDGE_FIELDS: readonly string[] = [
  "rawQuiz",
  "rawQuizAnswers",
  "quizAnswers",
  "quiz_answers",
  "selectedOption",
  "pickedOption",
  "picked",
  "correctOptionId",
  "answerLog",
  "attemptLog",
  "incorrectAnswers",
  "keystrokeHistory",
  "audioAttempts",
];

/**
 * Throws if `value` (or any nested object) contains a forbidden key.
 * Intentionally simple — the summary builder produces a known-shape object
 * so a shallow-walk recursive scan is enough.
 */
export function assertSafeTeacherBridgeSummary(value: unknown, path = "summary"): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, idx) => assertSafeTeacherBridgeSummary(item, `${path}[${idx}]`));
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_TEACHER_BRIDGE_FIELDS.includes(key)) {
      throw new Error(
        `[teacherBridgeSummary] forbidden raw-data key "${key}" at ${path}. The teacher bridge surface must never expose ${key}.`,
      );
    }
    assertSafeTeacherBridgeSummary(record[key], `${path}.${key}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Builder input + output
// ─────────────────────────────────────────────────────────────────────────

export type TeacherBridgeSummaryInput = {
  /** Visible course title (e.g. "Spanish — Dominican Republic A1"). */
  courseTitle: string;
  /** Discipline group (e.g. "Languages"). */
  discipline: string;
  /** Ordered list of completed module titles. */
  completedModules: string[];
  /** CEFR label or other current-level token. */
  currentLevel: string;
  /** Skill strengths derived from completed modules. */
  strengths: LearningSkillTag[];
  /** Practice areas derived from challenge difficulty signals. */
  difficultyTags: LearningDifficultyTag[];
  /** Deterministic strings; the builder caps + sanitizes them. */
  suggestedTeacherFocus: string[];
  /** ISO-8601 date string or null. */
  lastActivityDate?: string | null;
  /** Companion bridge sub-summary, if any. */
  companion?: CompanionBridgeSummary | null;
  /** Consent state. Defaults to `not_requested` for the demo builder. */
  consentState?: LearningShareConsentState;
};

const MAX_FOCUS_ITEMS = 5;
const MAX_FOCUS_LENGTH = 160;
const MAX_MODULE_TITLE_LENGTH = 120;

function dedupe<T>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function trimString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/**
 * Build a SAFE `YoPratiqoProgressSummary` from already-public module
 * metadata. The function is deterministic, total, and never touches IO.
 *
 * The function is named `Demo` on purpose: it powers the consent-card
 * preview and component tests today, and it documents the future-prod
 * contract. When real persistence lands, replace the call site with a
 * server-side reader that emits the same shape — the schema below stays.
 */
export function buildDemoTeacherBridgeSummary(
  input: TeacherBridgeSummaryInput,
): YoPratiqoProgressSummary {
  const summary: YoPratiqoProgressSummary = {
    product: "YoPratiqo",
    discipline: trimString(input.discipline ?? "", 80) || "Languages",
    courseTitle: trimString(input.courseTitle ?? "", 120) || "YoPratiqo course",
    completedModules: dedupe(
      (input.completedModules ?? []).filter(Boolean).map((m) => trimString(m, MAX_MODULE_TITLE_LENGTH)),
    ),
    currentLevel: trimString(input.currentLevel ?? "", 32) || "A1",
    strengths: dedupe(input.strengths ?? []),
    difficultyTags: dedupe(input.difficultyTags ?? []),
    suggestedTeacherFocus: dedupe(
      (input.suggestedTeacherFocus ?? [])
        .filter(Boolean)
        .map((f) => trimString(f, MAX_FOCUS_LENGTH))
        .filter((f) => f.length > 0),
    ).slice(0, MAX_FOCUS_ITEMS),
    lastActivityDate: input.lastActivityDate ?? null,
    companion: input.companion ?? null,
    consentState: input.consentState ?? { status: "not_requested" },
  };

  // Defensive: assert the privacy contract before returning. The builder's
  // own input shape rules this out, but a future caller could spread an
  // untyped object — this catches it loudly.
  assertSafeTeacherBridgeSummary(summary);
  return summary;
}

// ─────────────────────────────────────────────────────────────────────────
// Foundation/demo fixture used by the consent-card preview on /yo
// ─────────────────────────────────────────────────────────────────────────

/**
 * A deterministic preview summary that mirrors what a learner who has
 * finished the existing Dominican Republic A1 path would share. This is
 * for UI preview ONLY — it explicitly carries the `not_requested` consent
 * state so a teacher would see the locked card, not the unlocked variant.
 *
 * Use this from the `/yo` consent-card section to render a believable
 * preview without inventing fake learner data.
 */
export function buildDominicanA1FoundationDemoSummary(): YoPratiqoProgressSummary {
  return buildDemoTeacherBridgeSummary({
    courseTitle: "Spanish — Dominican Republic A1",
    discipline: "Languages",
    completedModules: ["Intro", "Arrival & hotel", "Food & flavors", "Directions", "Cultural conversation"],
    currentLevel: "A1",
    strengths: ["greetings", "vocabulary", "culture"],
    difficultyTags: ["needs_listening_repetition", "needs_pronunciation_support"],
    suggestedTeacherFocus: [
      "Hotel check-in roleplay (A1 → A2 transition)",
      "Restaurant ordering with cultural cues",
      "Open conversation about travel plans",
    ],
    lastActivityDate: null,
    companion: {
      companionId: "companion-forest",
      companionName: "Yuca",
      stageName: "teacher-ready",
      stageIndex: 3,
      progressPercent: 62,
    },
    consentState: { status: "not_requested" },
  });
}
