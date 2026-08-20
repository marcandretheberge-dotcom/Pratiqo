import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_STATUSES,
  TEACHER_OFFER_TYPES,
  parseTeacherOfferPolicyPreference,
  type TeacherOfferCurrency,
  type TeacherOfferDto,
  type TeacherOfferFormat,
  type TeacherOfferStatus,
  type TeacherOfferType,
} from "./types";

/**
 * Learner-facing offer payload. Omits created_by, createdAt, pausedAt,
 * archivedAt, address, and Stripe fields.
 */
export type PublicTeacherOfferDto = Omit<TeacherOfferDto, "createdAt" | "pausedAt" | "archivedAt">;

export const TEACHER_OFFER_PUBLIC_SELECT_COLUMNS = [
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
  "updated_at",
].join(", ");

export const PUBLIC_TEACHER_OFFER_FORBIDDEN_KEYS = [
  "created_by",
  "createdBy",
  "created_at",
  "createdAt",
  "paused_at",
  "pausedAt",
  "archived_at",
  "archivedAt",
  "address",
  "stripe",
  "stripe_account_id",
  "stripeAccountId",
] as const;

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

export function isPublishedPublicTeacherOffer(
  offer: Pick<PublicTeacherOfferDto, "status" | "publishedAt">,
): boolean {
  return offer.status === "published" && offer.publishedAt != null && offer.publishedAt !== "";
}

export function publicTeacherOfferHasForbiddenKeys(value: object): boolean {
  return PUBLIC_TEACHER_OFFER_FORBIDDEN_KEYS.some((key) => key in value);
}

function toPublicDto(fields: PublicTeacherOfferDto): PublicTeacherOfferDto | null {
  if (!isPublishedPublicTeacherOffer(fields)) return null;
  if (publicTeacherOfferHasForbiddenKeys(fields)) return null;
  return fields;
}

/** Map a teacher_offers row to a public DTO. Draft/paused/archived rows return null. */
export function mapPublicTeacherOfferRow(row: unknown): PublicTeacherOfferDto | null {
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
  const publishedAt = asNullableString(raw.published_at);
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
    !updatedAt
  ) {
    return null;
  }

  return toPublicDto({
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
    publishedAt,
    updatedAt,
  });
}

export function filterPublishedPublicTeacherOffers(
  rows: unknown[],
  teacherId: string,
): PublicTeacherOfferDto[] {
  const offers: PublicTeacherOfferDto[] = [];
  for (const row of rows) {
    const offer = mapPublicTeacherOfferRow(row);
    if (!offer) continue;
    if (offer.teacherId !== teacherId) continue;
    offers.push(offer);
  }
  return offers.sort((a, b) => {
    const timeDelta = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    if (timeDelta !== 0) return timeDelta;
    return b.id.localeCompare(a.id);
  });
}
