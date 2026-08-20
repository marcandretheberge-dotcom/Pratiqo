import type {
  TeacherOfferCurrency,
  TeacherOfferDto,
  TeacherOfferFormat,
  TeacherOfferStatus,
  TeacherOfferType,
} from "./types";
import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_STATUSES,
  TEACHER_OFFER_TYPES,
  parseTeacherOfferPolicyPreference,
} from "./types";

export const TEACHER_OFFER_SELECT_COLUMNS = [
  "id",
  "teacher_id",
  "title",
  "slug",
  "short_description",
  "description",
  "discipline_id",
  "specialite",
  "offer_type",
  "format",
  "status",
  "image_url",
  "price_cents",
  "currency",
  "duration_minutes",
  "session_count",
  "capacity_min",
  "capacity_max",
  "level",
  "age_min",
  "age_max",
  "requires_identity",
  "requires_manual_confirmation",
  "cancellation_preference",
  "reschedule_preference",
  "published_at",
  "paused_at",
  "archived_at",
  "created_at",
  "updated_at",
].join(", ");

export type TeacherOfferRow = {
  id: string;
  teacher_id: string;
  title: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  discipline_id: string | null;
  specialite: string | null;
  offer_type: TeacherOfferType;
  format: TeacherOfferFormat;
  status: TeacherOfferStatus;
  image_url: string | null;
  price_cents: number;
  currency: TeacherOfferCurrency;
  duration_minutes: number | null;
  session_count: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  level: string | null;
  age_min: number | null;
  age_max: number | null;
  requires_identity: boolean;
  requires_manual_confirmation: boolean;
  cancellation_preference: string;
  reschedule_preference: string;
  published_at: string | null;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : null;
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function isOfferType(value: unknown): value is TeacherOfferType {
  return typeof value === "string" && (TEACHER_OFFER_TYPES as readonly string[]).includes(value);
}

function isFormat(value: unknown): value is TeacherOfferFormat {
  return typeof value === "string" && (TEACHER_OFFER_FORMATS as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is TeacherOfferStatus {
  return typeof value === "string" && (TEACHER_OFFER_STATUSES as readonly string[]).includes(value);
}

function isCurrency(value: unknown): value is TeacherOfferCurrency {
  return typeof value === "string" && (TEACHER_OFFER_CURRENCIES as readonly string[]).includes(value);
}

export function mapTeacherOfferRow(row: unknown): TeacherOfferDto | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as Record<string, unknown>;
  const id = asString(raw.id);
  const teacherId = asString(raw.teacher_id);
  const title = asString(raw.title);
  const offerType = raw.offer_type;
  const format = raw.format;
  const status = raw.status;
  const currency = raw.currency;
  const priceCents = asInt(raw.price_cents);
  const createdAt = asString(raw.created_at);
  const updatedAt = asString(raw.updated_at);
  if (
    !id ||
    !teacherId ||
    !title ||
    !isOfferType(offerType) ||
    !isFormat(format) ||
    !isStatus(status) ||
    !isCurrency(currency) ||
    priceCents == null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    teacherId,
    title,
    slug: asNullableString(raw.slug),
    shortDescription: asNullableString(raw.short_description),
    description: asNullableString(raw.description),
    disciplineId: asNullableString(raw.discipline_id),
    specialite: asNullableString(raw.specialite),
    offerType,
    format,
    status,
    imageUrl: asNullableString(raw.image_url),
    priceCents,
    currency,
    durationMinutes: asInt(raw.duration_minutes),
    sessionCount: asInt(raw.session_count),
    capacityMin: asInt(raw.capacity_min),
    capacityMax: asInt(raw.capacity_max),
    level: asNullableString(raw.level),
    ageMin: asInt(raw.age_min),
    ageMax: asInt(raw.age_max),
    requiresIdentity: asBool(raw.requires_identity),
    requiresManualConfirmation: asBool(raw.requires_manual_confirmation),
    cancellationPreference: parseTeacherOfferPolicyPreference(raw.cancellation_preference),
    reschedulePreference: parseTeacherOfferPolicyPreference(raw.reschedule_preference),
    publishedAt: asNullableString(raw.published_at),
    pausedAt: asNullableString(raw.paused_at),
    archivedAt: asNullableString(raw.archived_at),
    createdAt,
    updatedAt,
  };
}

export const OFFER_NOT_FOUND_BODY = { error: "offer_not_found" } as const;
export const TEACHER_NOT_FOUND_BODY = { error: "teacher_not_found" } as const;

export const TEACHER_OFFER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTeacherOfferId(value: string): boolean {
  return TEACHER_OFFER_ID_PATTERN.test(value);
}

export function isPostgresUniqueViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "23505";
}
