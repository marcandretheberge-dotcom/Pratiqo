/**
 * Planned package session drafts — scheduling draft only (no payment / bookings).
 *
 * Requires ENABLE_PLANNED_PACKAGES + ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS.
 * Does not create Stripe checkout, entitlements, redemptions, or permanent holds.
 */

import { isPlannedPackagesEnabled } from "./plannedPackages";

export const ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS_FLAG = "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS_FLAG =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS";

export const PLANNED_PACKAGE_SESSION_DRAFT_STATUSES = [
  "draft",
  "expired",
  "cancelled",
  "converted",
] as const;

export type PlannedPackageSessionDraftStatus =
  (typeof PLANNED_PACKAGE_SESSION_DRAFT_STATUSES)[number];

export type PlannedPackageSessionDraftItemDto = {
  id: string;
  sessionIndex: number;
  startsAt: string;
  endsAt: string;
  availabilitySource: string | null;
};

export type PlannedPackageSessionDraftDto = {
  id: string;
  studentId: string;
  teacherId: string;
  teacherOfferId: string;
  status: PlannedPackageSessionDraftStatus;
  sessionCount: number;
  durationMinutes: number;
  priceCentsSnapshot: number;
  currencySnapshot: string;
  titleSnapshot: string;
  offerTypeSnapshot: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  sessions: PlannedPackageSessionDraftItemDto[];
};

/** Server flag (preferred) or public twin for controlled/dev UI. */
export function isPlannedPackageSessionDraftsEnabled(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true"
  );
}

/** Client UI visibility — NEXT_PUBLIC twins only. */
export function isPlannedPackageSessionDraftsUiEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true"
  );
}

/** Both planned packages + session drafts must be ON for the learner flow. */
export function canUsePlannedPackageSessionDrafts(): boolean {
  return isPlannedPackagesEnabled() && isPlannedPackageSessionDraftsEnabled();
}

export function parseDraftSessionStarts(payload: unknown):
  | { ok: true; startsAt: string[] }
  | { ok: false; error: "invalid_payload" } {
  if (!payload || typeof payload !== "object") return { ok: false, error: "invalid_payload" };
  const sessions = (payload as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { ok: false, error: "invalid_payload" };
  }
  const startsAt: string[] = [];
  for (const row of sessions) {
    if (!row || typeof row !== "object") return { ok: false, error: "invalid_payload" };
    const starts = (row as { startsAt?: unknown }).startsAt;
    if (typeof starts !== "string" || starts.trim() === "") {
      return { ok: false, error: "invalid_payload" };
    }
    const parsed = new Date(starts);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "invalid_payload" };
    startsAt.push(parsed.toISOString());
  }
  return { ok: true, startsAt };
}

export function hasDuplicateSessionStarts(startsAt: string[]): boolean {
  const seen = new Set<string>();
  for (const value of startsAt) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

export function sessionsOverlap(startsAt: string[], durationMinutes: number): boolean {
  const durationMs = durationMinutes * 60_000;
  const ranges = startsAt
    .map((iso) => {
      const start = new Date(iso).getTime();
      return { start, end: start + durationMs };
    })
    .sort((a, b) => a.start - b.start);
  for (let i = 1; i < ranges.length; i += 1) {
    if (ranges[i]!.start < ranges[i - 1]!.end) return true;
  }
  return false;
}
