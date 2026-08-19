import { TEACHER_OFFER_FORMATS, TEACHER_OFFER_MVP_TYPES } from "./types";
import type { TeacherOfferDto, TeacherOfferFormat, TeacherOfferType } from "./types";

export const TEACHER_OFFER_CLIENT_FORBIDDEN_KEYS = [
  "teacher_id",
  "created_by",
  "created_at",
  "updated_at",
  "published_at",
  "paused_at",
  "archived_at",
  "teacherId",
  "createdBy",
  "publishedAt",
  "pausedAt",
  "archivedAt",
] as const;

export type TeacherOfferFormValues = {
  title: string;
  offerType: TeacherOfferType | "";
  format: TeacherOfferFormat | "";
  priceDollars: string;
  durationMinutes: string;
  disciplineId: string;
  shortDescription: string;
  description: string;
  sessionCount: string;
  capacityMin: string;
  capacityMax: string;
  level: string;
  ageMin: string;
  ageMax: string;
  specialite: string;
  requiresIdentity: boolean;
  requiresManualConfirmation: boolean;
};

export type TeacherOfferFormFieldError =
  | "title"
  | "titleLong"
  | "offerType"
  | "format"
  | "price"
  | "priceInvalid"
  | "duration"
  | "session"
  | "capacity"
  | "age"
  | "description";

/** Convert a teacher-entered CAD dollar string to integer cents without float drift. */
export function dollarsInputToPriceCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [dollarsPart, centsPart = ""] = trimmed.split(".");
  const dollars = Number.parseInt(dollarsPart, 10);
  const cents = Number.parseInt(centsPart.padEnd(2, "0") || "0", 10);
  if (!Number.isFinite(dollars) || !Number.isFinite(cents) || dollars < 0 || cents < 0 || cents > 99) {
    return null;
  }
  return dollars * 100 + cents;
}

export function priceCentsToDollarsInput(priceCents: number): string {
  if (!Number.isInteger(priceCents) || priceCents < 0) return "0.00";
  const dollars = Math.trunc(priceCents / 100);
  const cents = priceCents % 100;
  return `${dollars}.${String(cents).padStart(2, "0")}`;
}

export function emptyTeacherOfferFormValues(): TeacherOfferFormValues {
  return {
    title: "",
    offerType: "private_lesson",
    format: "online",
    priceDollars: "",
    durationMinutes: "60",
    disciplineId: "",
    shortDescription: "",
    description: "",
    sessionCount: "",
    capacityMin: "",
    capacityMax: "",
    level: "",
    ageMin: "",
    ageMax: "",
    specialite: "",
    requiresIdentity: false,
    requiresManualConfirmation: false,
  };
}

export function teacherOfferToFormValues(offer: TeacherOfferDto): TeacherOfferFormValues {
  return {
    title: offer.title,
    offerType: offer.offerType,
    format: offer.format,
    priceDollars: priceCentsToDollarsInput(offer.priceCents),
    durationMinutes: offer.durationMinutes == null ? "" : String(offer.durationMinutes),
    disciplineId: offer.disciplineId ?? "",
    shortDescription: offer.shortDescription ?? "",
    description: offer.description ?? "",
    sessionCount: offer.sessionCount == null ? "" : String(offer.sessionCount),
    capacityMin: offer.capacityMin == null ? "" : String(offer.capacityMin),
    capacityMax: offer.capacityMax == null ? "" : String(offer.capacityMax),
    level: offer.level ?? "",
    ageMin: offer.ageMin == null ? "" : String(offer.ageMin),
    ageMax: offer.ageMax == null ? "" : String(offer.ageMax),
    specialite: offer.specialite ?? "",
    requiresIdentity: offer.requiresIdentity,
    requiresManualConfirmation: offer.requiresManualConfirmation,
  };
}

function optionalInt(raw: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  return { ok: true, value: Number.parseInt(trimmed, 10) };
}

function optionalText(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export type TeacherOfferWritePayloadResult =
  | { ok: true; body: Record<string, unknown>; errors: TeacherOfferFormFieldError[] }
  | { ok: false; body: null; errors: TeacherOfferFormFieldError[] };

export function buildTeacherOfferWritePayload(values: TeacherOfferFormValues): TeacherOfferWritePayloadResult {
  const errors: TeacherOfferFormFieldError[] = [];
  const title = values.title.trim();
  if (!title) errors.push("title");
  else if (title.length > 120) errors.push("titleLong");

  const offerType = values.offerType;
  if (!offerType || !(TEACHER_OFFER_MVP_TYPES as readonly string[]).includes(offerType)) {
    errors.push("offerType");
  }

  const format = values.format;
  if (!format || !(TEACHER_OFFER_FORMATS as readonly string[]).includes(format)) {
    errors.push("format");
  }

  const priceCents = dollarsInputToPriceCents(values.priceDollars);
  if (values.priceDollars.trim() === "") errors.push("price");
  else if (priceCents == null) errors.push("priceInvalid");

  const duration = optionalInt(values.durationMinutes);
  if (!duration.ok) errors.push("duration");
  else if (duration.value != null && (duration.value < 15 || duration.value > 480)) {
    errors.push("duration");
  }

  const sessionCount = optionalInt(values.sessionCount);
  if (!sessionCount.ok) errors.push("session");
  else if (sessionCount.value != null && (sessionCount.value < 1 || sessionCount.value > 52)) {
    errors.push("session");
  }

  const capacityMin = optionalInt(values.capacityMin);
  const capacityMax = optionalInt(values.capacityMax);
  if (!capacityMin.ok || !capacityMax.ok) errors.push("capacity");
  else if (
    capacityMin.value != null &&
    capacityMax.value != null &&
    capacityMax.value < capacityMin.value
  ) {
    errors.push("capacity");
  }

  const ageMin = optionalInt(values.ageMin);
  const ageMax = optionalInt(values.ageMax);
  if (!ageMin.ok || !ageMax.ok) errors.push("age");
  else if (ageMin.value != null && ageMax.value != null && ageMax.value < ageMin.value) {
    errors.push("age");
  }

  const description = optionalText(values.description);
  if (description && description.length > 5000) errors.push("description");

  const shortDescription = optionalText(values.shortDescription);
  if (shortDescription && shortDescription.length > 220) errors.push("description");

  if (errors.length > 0) {
    return { ok: false, body: null, errors };
  }

  if (
    !duration.ok ||
    !sessionCount.ok ||
    !capacityMin.ok ||
    !capacityMax.ok ||
    !ageMin.ok ||
    !ageMax.ok ||
    priceCents == null ||
    !offerType ||
    !format
  ) {
    return { ok: false, body: null, errors: ["title"] };
  }

  const body: Record<string, unknown> = {
    title,
    offer_type: offerType,
    format,
    price_cents: priceCents,
    currency: "CAD",
    duration_minutes: duration.value,
    discipline_id: optionalText(values.disciplineId),
    short_description: shortDescription,
    description,
    session_count: sessionCount.value,
    capacity_min: capacityMin.value,
    capacity_max: capacityMax.value,
    level: optionalText(values.level),
    age_min: ageMin.value,
    age_max: ageMax.value,
    specialite: optionalText(values.specialite),
    requires_identity: values.requiresIdentity,
    requires_manual_confirmation: values.requiresManualConfirmation,
  };

  for (const key of TEACHER_OFFER_CLIENT_FORBIDDEN_KEYS) {
    delete body[key];
  }

  return { ok: true, body, errors: [] };
}

export function teacherOfferPayloadHasForbiddenKeys(body: Record<string, unknown>): boolean {
  return TEACHER_OFFER_CLIENT_FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(body, key));
}
