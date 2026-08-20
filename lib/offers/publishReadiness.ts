/**
 * Publish quality gate for teacher_offers.
 *
 * Drafts may be incomplete. Published offers must meet a minimum public-quality bar.
 * Never reads live booking/checkout state — validation is offer-field only.
 */

import { dollarsInputToPriceCents, type TeacherOfferFormValues } from "./clientPayload";
import { isCanonicalTeacherOfferDisciplineId } from "./validation";
import {
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_MVP_TYPES,
  TEACHER_OFFER_TYPES,
  type TeacherOfferCreateInput,
  type TeacherOfferDto,
  type TeacherOfferFormat,
  type TeacherOfferType,
  type TeacherOfferUpdateInput,
} from "./types";

export const TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MIN = 20;
export const TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MAX = 220;
export const TEACHER_OFFER_PUBLISH_DURATION_MIN = 15;
export const TEACHER_OFFER_PUBLISH_DURATION_MAX = 480;

export type TeacherOfferPublishIssuePath =
  | "title"
  | "offer_type"
  | "discipline_id"
  | "format"
  | "price_cents"
  | "duration_minutes"
  | "short_description"
  | "session_count";

export type TeacherOfferPublishIssue = {
  path: TeacherOfferPublishIssuePath;
  message: string;
};

export type TeacherOfferPublishCandidate = {
  title: string | null | undefined;
  offerType: TeacherOfferType | null | undefined;
  disciplineId: string | null | undefined;
  format: TeacherOfferFormat | null | undefined;
  priceCents: number | null | undefined;
  durationMinutes: number | null | undefined;
  shortDescription: string | null | undefined;
  sessionCount: number | null | undefined;
};

export type TeacherOfferPublishChecklistItemId =
  | "title"
  | "disciplineId"
  | "format"
  | "priceCents"
  | "durationMinutes"
  | "shortDescription"
  | "sessionCount";

export type TeacherOfferPublishChecklistItem = {
  id: TeacherOfferPublishChecklistItemId;
  path: TeacherOfferPublishIssuePath;
  ok: boolean;
};

export type OfferNotPublishableFailure = {
  ok: false;
  error: "offer_not_publishable";
  issues: TeacherOfferPublishIssue[];
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function issue(path: TeacherOfferPublishIssuePath, message: string): TeacherOfferPublishIssue {
  return { path, message };
}

export function evaluateTeacherOfferPublishReadiness(
  candidate: TeacherOfferPublishCandidate,
): { ready: true; issues: [] } | { ready: false; issues: TeacherOfferPublishIssue[] } {
  const issues: TeacherOfferPublishIssue[] = [];

  const title = trimOrNull(candidate.title);
  if (!title || title.length > 120) {
    issues.push(issue("title", "title is required to publish (1–120 characters)"));
  }

  const offerType = candidate.offerType;
  if (
    offerType == null ||
    !(TEACHER_OFFER_TYPES as readonly string[]).includes(offerType)
  ) {
    issues.push(issue("offer_type", "offer_type is required to publish"));
  }

  const disciplineId = trimOrNull(candidate.disciplineId);
  if (!disciplineId || !isCanonicalTeacherOfferDisciplineId(disciplineId)) {
    issues.push(issue("discipline_id", "discipline_id is required to publish"));
  }

  const format = candidate.format;
  if (format == null || !(TEACHER_OFFER_FORMATS as readonly string[]).includes(format)) {
    issues.push(issue("format", "format is required to publish"));
  }

  const priceCents = candidate.priceCents;
  if (priceCents == null || !Number.isInteger(priceCents) || priceCents < 0) {
    issues.push(issue("price_cents", "price_cents is required to publish"));
  }

  const durationMinutes = candidate.durationMinutes;
  if (
    durationMinutes == null ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < TEACHER_OFFER_PUBLISH_DURATION_MIN ||
    durationMinutes > TEACHER_OFFER_PUBLISH_DURATION_MAX
  ) {
    issues.push(
      issue(
        "duration_minutes",
        `duration_minutes is required to publish (${TEACHER_OFFER_PUBLISH_DURATION_MIN}–${TEACHER_OFFER_PUBLISH_DURATION_MAX})`,
      ),
    );
  }

  const shortDescription = trimOrNull(candidate.shortDescription);
  if (
    !shortDescription ||
    shortDescription.length < TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MIN ||
    shortDescription.length > TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MAX
  ) {
    issues.push(
      issue(
        "short_description",
        `short_description is required to publish (${TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MIN}–${TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MAX} characters)`,
      ),
    );
  }

  if (offerType === "package") {
    const sessionCount = candidate.sessionCount;
    if (
      sessionCount == null ||
      !Number.isInteger(sessionCount) ||
      sessionCount < 1 ||
      sessionCount > 52
    ) {
      issues.push(issue("session_count", "session_count is required to publish a package"));
    }
  }

  if (issues.length > 0) {
    return { ready: false, issues };
  }
  return { ready: true, issues: [] };
}

export function assertTeacherOfferPublishable(
  candidate: TeacherOfferPublishCandidate,
): { ok: true } | OfferNotPublishableFailure {
  const result = evaluateTeacherOfferPublishReadiness(candidate);
  if (result.ready) return { ok: true };
  return { ok: false, error: "offer_not_publishable", issues: result.issues };
}

export function mergeTeacherOfferForPublishCheck(
  current: TeacherOfferDto,
  patch: TeacherOfferUpdateInput,
): TeacherOfferPublishCandidate {
  return {
    title: patch.title !== undefined ? patch.title : current.title,
    offerType: patch.offerType !== undefined ? patch.offerType : current.offerType,
    disciplineId: patch.disciplineId !== undefined ? patch.disciplineId : current.disciplineId,
    format: patch.format !== undefined ? patch.format : current.format,
    priceCents: patch.priceCents !== undefined ? patch.priceCents : current.priceCents,
    durationMinutes:
      patch.durationMinutes !== undefined ? patch.durationMinutes : current.durationMinutes,
    shortDescription:
      patch.shortDescription !== undefined ? patch.shortDescription : current.shortDescription,
    sessionCount: patch.sessionCount !== undefined ? patch.sessionCount : current.sessionCount,
  };
}

export function createInputToPublishCandidate(
  input: TeacherOfferCreateInput,
): TeacherOfferPublishCandidate {
  return {
    title: input.title,
    offerType: input.offerType,
    disciplineId: input.disciplineId,
    format: input.format,
    priceCents: input.priceCents,
    durationMinutes: input.durationMinutes,
    shortDescription: input.shortDescription,
    sessionCount: input.sessionCount,
  };
}

function optionalIntFromForm(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

export function formValuesToPublishCandidate(
  values: TeacherOfferFormValues,
): TeacherOfferPublishCandidate {
  const offerType =
    values.offerType && (TEACHER_OFFER_MVP_TYPES as readonly string[]).includes(values.offerType)
      ? values.offerType
      : null;
  const format =
    values.format && (TEACHER_OFFER_FORMATS as readonly string[]).includes(values.format)
      ? values.format
      : null;

  return {
    title: values.title,
    offerType,
    disciplineId: values.disciplineId,
    format,
    priceCents: dollarsInputToPriceCents(values.priceDollars),
    durationMinutes: optionalIntFromForm(values.durationMinutes),
    shortDescription: values.shortDescription,
    sessionCount: optionalIntFromForm(values.sessionCount),
  };
}

export function getTeacherOfferPublishChecklist(
  values: TeacherOfferFormValues,
): TeacherOfferPublishChecklistItem[] {
  const candidate = formValuesToPublishCandidate(values);
  const result = evaluateTeacherOfferPublishReadiness(candidate);
  const issuePaths = new Set(result.issues.map((row) => row.path));

  const items: TeacherOfferPublishChecklistItem[] = [
    { id: "title", path: "title", ok: !issuePaths.has("title") },
    { id: "disciplineId", path: "discipline_id", ok: !issuePaths.has("discipline_id") },
    { id: "format", path: "format", ok: !issuePaths.has("format") },
    { id: "priceCents", path: "price_cents", ok: !issuePaths.has("price_cents") },
    { id: "durationMinutes", path: "duration_minutes", ok: !issuePaths.has("duration_minutes") },
    { id: "shortDescription", path: "short_description", ok: !issuePaths.has("short_description") },
  ];

  if (candidate.offerType === "package") {
    items.push({
      id: "sessionCount",
      path: "session_count",
      ok: !issuePaths.has("session_count"),
    });
  }

  return items;
}

export function isTeacherOfferFormPublishReady(values: TeacherOfferFormValues): boolean {
  return evaluateTeacherOfferPublishReadiness(formValuesToPublishCandidate(values)).ready;
}
