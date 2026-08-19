import type { TeacherOfferStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<TeacherOfferStatus, readonly TeacherOfferStatus[]> = {
  draft: ["draft", "published", "archived"],
  published: ["published", "paused", "archived"],
  paused: ["paused", "published", "archived"],
  archived: ["archived"],
};

export function isAllowedTeacherOfferStatusTransition(
  from: TeacherOfferStatus,
  to: TeacherOfferStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export type TeacherOfferStatusTimestamps = {
  publishedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
};

export type TeacherOfferStatusPatch = {
  status: TeacherOfferStatus;
  published_at?: string | null;
  paused_at?: string | null;
  archived_at?: string | null;
};

/**
 * Server-owned status timestamps.
 * Re-publishing a paused offer keeps paused_at as historical last-paused-at.
 * Archived offers cannot leave archived in this PR, so archived_at stays set.
 */
export function buildTeacherOfferStatusPatch(
  from: TeacherOfferStatus,
  to: TeacherOfferStatus,
  nowIso: string,
  current: TeacherOfferStatusTimestamps,
): TeacherOfferStatusPatch | { error: "invalid_status_transition" } {
  if (!isAllowedTeacherOfferStatusTransition(from, to)) {
    return { error: "invalid_status_transition" };
  }

  const patch: TeacherOfferStatusPatch = { status: to };
  if (from === to) {
    return patch;
  }

  if (to === "published" && current.publishedAt == null) {
    patch.published_at = nowIso;
  }
  if (to === "paused") {
    patch.paused_at = nowIso;
  }
  if (to === "archived") {
    patch.archived_at = nowIso;
  }

  return patch;
}
