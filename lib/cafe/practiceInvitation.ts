import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";
import {
  buildCafeReservationLoginHref,
  buildCafeSessionPath,
  isCafeReservationPathAvailable,
} from "@/lib/cafe/reservationClient";

/**
 * Café ↔ YoPratiqo invitation contract.
 *
 * Codex can call `resolveCafePracticeInvitation` after a mission completes.
 * Café owns matching, eligibility, and reservation deep-links. Yo owns course
 * progress, stamps, and mastery — Café never mutates those.
 */

export type CafeInvitationLanguage = "fr" | "es";

export type CafeMissionThemeId = "introductions";

export type CafeMissionContext = {
  language: CafeInvitationLanguage;
  themeId: CafeMissionThemeId;
  level: string;
  /** Same-origin path back into the learner's saved course position. */
  courseReturnPath: string;
  /** One short expression the learner can review before speaking. */
  reviewExpression: string;
};

/**
 * Public session plus an explicit theme tag.
 * Theme matching is never inferred from title/slug wording alone.
 */
export type CafeInvitationCandidate = CafePublicSession & {
  themeId?: CafeMissionThemeId | null;
};

export type CafeInvitationSession = {
  slug: string;
  title: string;
  primaryLanguage: string;
  practiceLanguage: string | null;
  level: string | null;
  startsAt: string;
  durationMinutes: number;
  remainingSpots: number;
  maxParticipants: number;
  themeId: CafeMissionThemeId;
};

export type CafePracticeInvitation =
  | {
      kind: "invite";
      headline: "Pratiquer au Café";
      session: CafeInvitationSession;
      mission: CafeMissionContext;
      participation: {
        listenFirst: true;
        speakWhenReady: true;
        groupTable: true;
        /** Contract only — not shown in learner UI; see invitation docs. */
        masteryUnchanged: true;
      };
      /** Existing Café auth + reservation entry. */
      reserveHref: string;
      /** Resume path after Café (sanitized). */
      courseReturnPath: string;
    }
  | {
      kind: "continue";
      reason: "no_match" | "full" | "ineligible" | "reservation_unavailable";
      mission: CafeMissionContext;
      courseReturnPath: string;
    };

const LANGUAGE_ALIASES: Record<CafeInvitationLanguage, RegExp> = {
  fr: /^(fr|fran[cç]ais|french)$/i,
  es: /^(es|espa[nñ]ol|spanish)$/i,
};

/** Explicit all-level tokens only — blank/null level stays unknown and does not match. */
const ALL_LEVEL_TOKENS = new Set([
  "ALL",
  "ANY",
  "ALL-LEVELS",
  "ALL LEVELS",
  "TOUS",
  "TOUS-NIVEAUX",
  "TOUS NIVEAUX",
]);

function normalizeLevel(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

export function isExplicitAllLevels(level: string | null | undefined): boolean {
  return ALL_LEVEL_TOKENS.has(normalizeLevel(level));
}

function languageMatches(session: CafeInvitationCandidate, language: CafeInvitationLanguage): boolean {
  const needle = LANGUAGE_ALIASES[language];
  return needle.test(session.primary_language.trim())
    || (session.practice_language ? needle.test(session.practice_language.trim()) : false);
}

/** Explicit theme id only — fuzzy title/slug matching is intentionally rejected. */
export function themeMatches(
  session: CafeInvitationCandidate,
  themeId: CafeMissionThemeId,
): boolean {
  return session.themeId === themeId;
}

export function levelMatches(session: CafeInvitationCandidate, level: string): boolean {
  const wanted = normalizeLevel(level);
  if (!wanted) return false;
  if (isExplicitAllLevels(session.level)) return true;
  const sessionLevel = normalizeLevel(session.level);
  // Absent/blank level is unknown — not an open table.
  if (!sessionLevel) return false;
  return sessionLevel === wanted;
}

function toInvitationSession(
  session: CafeInvitationCandidate,
  themeId: CafeMissionThemeId,
): CafeInvitationSession {
  return {
    slug: session.slug,
    title: session.title,
    primaryLanguage: session.primary_language,
    practiceLanguage: session.practice_language,
    level: session.level,
    startsAt: session.starts_at,
    durationMinutes: session.duration_minutes,
    remainingSpots: Math.max(0, Number(session.remaining_spots) || 0),
    maxParticipants: session.max_participants,
    themeId,
  };
}

/**
 * Seat-hold readiness for invitation matching.
 * Spots + future start are necessary but not sufficient — callers must also
 * confirm `isCafeReservationPathAvailable()` (or pass reservationPathAvailable).
 */
export function isReservableCafeSession(
  session: CafeInvitationCandidate,
  now: Date = new Date(),
): boolean {
  if (!(Number(session.remaining_spots) > 0)) return false;
  const startsAt = new Date(session.starts_at);
  if (Number.isNaN(startsAt.getTime())) return false;
  return startsAt.getTime() > now.getTime();
}

/**
 * Build the existing Café session deep-link, carrying Yo return context.
 * Attendance never awards course mastery or stamps; those stay lesson-owned.
 */
export function buildCafeReserveHref(input: {
  slug: string;
  courseReturnPath: string;
  reviewExpression: string;
  themeId: CafeMissionThemeId;
}): string {
  const safeReturn = sanitizeRelativeRedirectPath(input.courseReturnPath) ?? "/student/yopratiqo";
  const cafePath = buildCafeSessionPath({
    slug: input.slug,
    fromYo: true,
    yoReturn: safeReturn,
    yoExpression: input.reviewExpression.slice(0, 80),
    yoMission: input.themeId,
  });
  return buildCafeReservationLoginHref(cafePath);
}

export function resolveCafePracticeInvitation(
  mission: CafeMissionContext,
  sessions: CafeInvitationCandidate[],
  options?: {
    now?: Date;
    /** Defaults to the Café reservation path gate (`CAFE_V1_ENABLED`). */
    reservationPathAvailable?: boolean;
  },
): CafePracticeInvitation {
  const now = options?.now ?? new Date();
  const reservationPathAvailable =
    options?.reservationPathAvailable ?? isCafeReservationPathAvailable();
  const courseReturnPath =
    sanitizeRelativeRedirectPath(mission.courseReturnPath) ?? "/student/yopratiqo";
  const normalizedMission: CafeMissionContext = {
    ...mission,
    level: mission.level.trim(),
    reviewExpression: mission.reviewExpression.trim().slice(0, 80),
    courseReturnPath,
  };

  if (
    (normalizedMission.language !== "fr" && normalizedMission.language !== "es")
    || !normalizedMission.level
    || !normalizedMission.reviewExpression
    || normalizedMission.themeId !== "introductions"
  ) {
    return {
      kind: "continue",
      reason: "ineligible",
      mission: normalizedMission,
      courseReturnPath,
    };
  }

  if (!reservationPathAvailable) {
    return {
      kind: "continue",
      reason: "reservation_unavailable",
      mission: normalizedMission,
      courseReturnPath,
    };
  }

  const themed = sessions.filter((session) =>
    languageMatches(session, normalizedMission.language)
    && themeMatches(session, normalizedMission.themeId)
    && levelMatches(session, normalizedMission.level)
  );

  if (themed.length === 0) {
    return {
      kind: "continue",
      reason: "no_match",
      mission: normalizedMission,
      courseReturnPath,
    };
  }

  const open = themed
    .filter((session) => isReservableCafeSession(session, now))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  if (open.length === 0) {
    return {
      kind: "continue",
      reason: "full",
      mission: normalizedMission,
      courseReturnPath,
    };
  }

  const session = toInvitationSession(open[0]!, normalizedMission.themeId);
  return {
    kind: "invite",
    headline: "Pratiquer au Café",
    session,
    mission: normalizedMission,
    participation: {
      listenFirst: true,
      speakWhenReady: true,
      groupTable: true,
      masteryUnchanged: true,
    },
    reserveHref: buildCafeReserveHref({
      slug: session.slug,
      courseReturnPath,
      reviewExpression: normalizedMission.reviewExpression,
      themeId: normalizedMission.themeId,
    }),
    courseReturnPath,
  };
}

/** Labeled demo fixtures for the private preview only. */
export const CAFE_INVITATION_DEMO = {
  mission: {
    language: "fr",
    themeId: "introductions",
    level: "A1",
    courseReturnPath: "/student/yopratiqo?demo=introductions-complete",
    reviewExpression: "Bonjour, je m’appelle…",
  } satisfies CafeMissionContext,
  matchingSession: {
    slug: "demo-fr-introductions-a1",
    title: "DEMO · Présentations et introductions",
    primary_language: "fr",
    practice_language: null,
    level: "A1",
    starts_at: "2099-03-15T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 2,
    remaining_spots: 6,
    themeId: "introductions",
  } satisfies CafeInvitationCandidate,
  fullSession: {
    slug: "demo-fr-introductions-a1-full",
    title: "DEMO · Présentations (complet)",
    primary_language: "fr",
    practice_language: null,
    level: "A1",
    starts_at: "2099-03-16T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 8,
    remaining_spots: 0,
    themeId: "introductions",
  } satisfies CafeInvitationCandidate,
  unrelatedSession: {
    slug: "demo-es-food-a2",
    title: "DEMO · Comida y mercado",
    primary_language: "es",
    practice_language: null,
    level: "A2",
    starts_at: "2099-03-17T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 1,
    remaining_spots: 7,
    themeId: null,
  } satisfies CafeInvitationCandidate,
  /** Fuzzy title only — must not match without explicit themeId. */
  fuzzyTitleOnlySession: {
    slug: "demo-fr-hello-table",
    title: "DEMO · Bonjour et présentations",
    primary_language: "fr",
    practice_language: null,
    level: "A1",
    starts_at: "2099-03-18T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 1,
    remaining_spots: 7,
  } satisfies CafeInvitationCandidate,
  unknownLevelSession: {
    slug: "demo-fr-introductions-unknown-level",
    title: "DEMO · Introductions (niveau inconnu)",
    primary_language: "fr",
    practice_language: null,
    level: null,
    starts_at: "2099-03-19T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 1,
    remaining_spots: 7,
    themeId: "introductions",
  } satisfies CafeInvitationCandidate,
  allLevelsSession: {
    slug: "demo-fr-introductions-all-levels",
    title: "DEMO · Introductions (tous niveaux)",
    primary_language: "fr",
    practice_language: null,
    level: "tous niveaux",
    starts_at: "2099-03-20T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 1,
    remaining_spots: 7,
    themeId: "introductions",
  } satisfies CafeInvitationCandidate,
} as const;
