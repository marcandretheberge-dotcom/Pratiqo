import { z } from "zod";
import { PRATIQO_DISCIPLINES } from "@/lib/taxonomy/disciplines";
import {
  sanitizeTeacherOfferDescription,
  sanitizeTeacherOfferShortText,
  sanitizeTeacherOfferTitle,
} from "./sanitizeTeacherOfferInput";
import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_DISCIPLINE_ID_PATTERN,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_SLUG_PATTERN,
  TEACHER_OFFER_STATUSES,
  TEACHER_OFFER_TYPES,
  type TeacherOfferCreateInput,
  type TeacherOfferDto,
  type TeacherOfferUpdateInput,
} from "./types";

const CANONICAL_DISCIPLINE_IDS = new Set(PRATIQO_DISCIPLINES.map((item) => item.id));

export function isCanonicalTeacherOfferDisciplineId(value: string): boolean {
  return TEACHER_OFFER_DISCIPLINE_ID_PATTERN.test(value) && CANONICAL_DISCIPLINE_IDS.has(value);
}

export function isSafeTeacherOfferImageUrl(value: string): boolean {
  if (value.length < 1 || value.length > 2000) return false;
  const lower = value.toLowerCase();
  if (
    lower.includes("<") ||
    lower.includes(">") ||
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return false;
  }
  if (value.startsWith("https://") || value.startsWith("http://")) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  if (value.startsWith("//") || value.includes("..")) return false;
  return /^\/?[A-Za-z0-9._~/-]+$/.test(value);
}

const optionalNullableString = z.union([z.string(), z.null()]).optional();

function sanitizedOptional(
  raw: string | null | undefined,
  sanitize: (value: string) => string,
  max: number,
  field: string,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const value = sanitize(raw);
  if (value === "") return { ok: true, value: null };
  if (value.length > max) {
    return { ok: false, message: `${field} must be at most ${max} characters` };
  }
  return { ok: true, value };
}

function parseOptionalInt(
  raw: unknown,
  field: string,
  min: number,
  max?: number,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { ok: false, message: `${field} must be an integer` };
  }
  if (raw < min || (max != null && raw > max)) {
    const bound = max == null ? `>= ${min}` : `${min}–${max}`;
    return { ok: false, message: `${field} must be ${bound}` };
  }
  return { ok: true, value: raw };
}

function parseOptionalBoolean(
  raw: unknown,
  field: string,
  fallback?: boolean,
): { ok: true; value: boolean | undefined } | { ok: false; message: string } {
  if (raw === undefined) return { ok: true, value: fallback };
  if (typeof raw !== "boolean") {
    return { ok: false, message: `${field} must be a boolean` };
  }
  return { ok: true, value: raw };
}

const createBodySchema = z
  .object({
    title: z.string(),
    slug: optionalNullableString,
    short_description: optionalNullableString,
    shortDescription: optionalNullableString,
    description: optionalNullableString,
    discipline_id: optionalNullableString,
    disciplineId: optionalNullableString,
    specialite: optionalNullableString,
    offer_type: z.enum(TEACHER_OFFER_TYPES).optional(),
    offerType: z.enum(TEACHER_OFFER_TYPES).optional(),
    format: z.enum(TEACHER_OFFER_FORMATS).optional(),
    status: z.enum(["draft", "published"]).optional(),
    image_url: optionalNullableString,
    imageUrl: optionalNullableString,
    price_cents: z.number().int().gte(0).optional(),
    priceCents: z.number().int().gte(0).optional(),
    currency: z.enum(TEACHER_OFFER_CURRENCIES).optional(),
    duration_minutes: z.union([z.number().int(), z.null()]).optional(),
    durationMinutes: z.union([z.number().int(), z.null()]).optional(),
    session_count: z.union([z.number().int(), z.null()]).optional(),
    sessionCount: z.union([z.number().int(), z.null()]).optional(),
    capacity_min: z.union([z.number().int(), z.null()]).optional(),
    capacityMin: z.union([z.number().int(), z.null()]).optional(),
    capacity_max: z.union([z.number().int(), z.null()]).optional(),
    capacityMax: z.union([z.number().int(), z.null()]).optional(),
    level: optionalNullableString,
    age_min: z.union([z.number().int(), z.null()]).optional(),
    ageMin: z.union([z.number().int(), z.null()]).optional(),
    age_max: z.union([z.number().int(), z.null()]).optional(),
    ageMax: z.union([z.number().int(), z.null()]).optional(),
    requires_identity: z.boolean().optional(),
    requiresIdentity: z.boolean().optional(),
    requires_manual_confirmation: z.boolean().optional(),
    requiresManualConfirmation: z.boolean().optional(),
  })
  .passthrough();

const updateBodySchema = z
  .object({
    title: z.string().optional(),
    slug: optionalNullableString,
    short_description: optionalNullableString,
    shortDescription: optionalNullableString,
    description: optionalNullableString,
    discipline_id: optionalNullableString,
    disciplineId: optionalNullableString,
    specialite: optionalNullableString,
    offer_type: z.enum(TEACHER_OFFER_TYPES).optional(),
    offerType: z.enum(TEACHER_OFFER_TYPES).optional(),
    format: z.enum(TEACHER_OFFER_FORMATS).optional(),
    status: z.enum(TEACHER_OFFER_STATUSES).optional(),
    image_url: optionalNullableString,
    imageUrl: optionalNullableString,
    price_cents: z.number().int().gte(0).optional(),
    priceCents: z.number().int().gte(0).optional(),
    currency: z.enum(TEACHER_OFFER_CURRENCIES).optional(),
    duration_minutes: z.union([z.number().int(), z.null()]).optional(),
    durationMinutes: z.union([z.number().int(), z.null()]).optional(),
    session_count: z.union([z.number().int(), z.null()]).optional(),
    sessionCount: z.union([z.number().int(), z.null()]).optional(),
    capacity_min: z.union([z.number().int(), z.null()]).optional(),
    capacityMin: z.union([z.number().int(), z.null()]).optional(),
    capacity_max: z.union([z.number().int(), z.null()]).optional(),
    capacityMax: z.union([z.number().int(), z.null()]).optional(),
    level: optionalNullableString,
    age_min: z.union([z.number().int(), z.null()]).optional(),
    ageMin: z.union([z.number().int(), z.null()]).optional(),
    age_max: z.union([z.number().int(), z.null()]).optional(),
    ageMax: z.union([z.number().int(), z.null()]).optional(),
    requires_identity: z.boolean().optional(),
    requiresIdentity: z.boolean().optional(),
    requires_manual_confirmation: z.boolean().optional(),
    requiresManualConfirmation: z.boolean().optional(),
  })
  .passthrough();

type RawOfferBody = z.infer<typeof updateBodySchema> & {
  offer_type?: (typeof TEACHER_OFFER_TYPES)[number];
  format?: (typeof TEACHER_OFFER_FORMATS)[number];
  price_cents?: number;
};

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseSlug(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const slug = raw.trim();
  if (slug === "") return { ok: true, value: null };
  if (slug.length > 160 || !TEACHER_OFFER_SLUG_PATTERN.test(slug)) {
    return { ok: false, message: "slug must be lowercase kebab-case" };
  }
  return { ok: true, value: slug };
}

function parseDisciplineId(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };
  if (!TEACHER_OFFER_DISCIPLINE_ID_PATTERN.test(value)) {
    return { ok: false, message: "discipline_id must be a taxonomy id, not a display label" };
  }
  if (!isCanonicalTeacherOfferDisciplineId(value)) {
    return { ok: false, message: "discipline_id must match a PRATIQO_DISCIPLINES id" };
  }
  return { ok: true, value };
}

function parseImageUrl(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };
  if (!isSafeTeacherOfferImageUrl(value)) {
    return { ok: false, message: "image_url must be a safe URL or path" };
  }
  return { ok: true, value };
}

export type OfferValidationFailure = {
  ok: false;
  error: "invalid_payload";
  issues: Array<{ path: string; message: string }>;
};

function fail(path: string, message: string): OfferValidationFailure {
  return { ok: false, error: "invalid_payload", issues: [{ path, message }] };
}

function normalizeSharedFields(
  raw: RawOfferBody,
  mode: "create" | "update",
):
  | OfferValidationFailure
  | {
      ok: true;
      shared: Omit<TeacherOfferUpdateInput, "title" | "offerType" | "format" | "status" | "priceCents"> & {
        title?: string;
        offerType?: TeacherOfferCreateInput["offerType"];
        format?: TeacherOfferCreateInput["format"];
        status?: TeacherOfferUpdateInput["status"];
        priceCents?: number;
      };
    } {
  const titleRaw = raw.title;
  let title: string | undefined;
  if (titleRaw !== undefined) {
    const cleaned = sanitizeTeacherOfferTitle(titleRaw);
    if (cleaned.length < 1 || cleaned.length > 120) {
      return fail("title", "title must be 1–120 characters");
    }
    title = cleaned;
  } else if (mode === "create") {
    return fail("title", "title is required");
  }

  const slug = parseSlug(firstDefined(raw.slug));
  if (!slug.ok) return fail("slug", slug.message);

  const shortDescription = sanitizedOptional(
    firstDefined(raw.short_description, raw.shortDescription),
    sanitizeTeacherOfferShortText,
    220,
    "short_description",
  );
  if (!shortDescription.ok) return fail("short_description", shortDescription.message);

  const description = sanitizedOptional(
    firstDefined(raw.description),
    sanitizeTeacherOfferDescription,
    5000,
    "description",
  );
  if (!description.ok) return fail("description", description.message);

  const specialite = sanitizedOptional(
    firstDefined(raw.specialite),
    sanitizeTeacherOfferShortText,
    120,
    "specialite",
  );
  if (!specialite.ok) return fail("specialite", specialite.message);

  const level = sanitizedOptional(
    firstDefined(raw.level),
    sanitizeTeacherOfferShortText,
    80,
    "level",
  );
  if (!level.ok) return fail("level", level.message);

  const disciplineId = parseDisciplineId(firstDefined(raw.discipline_id, raw.disciplineId));
  if (!disciplineId.ok) return fail("discipline_id", disciplineId.message);

  // Cover images are set only via POST/DELETE /api/teacher/offers/[id]/cover.
  // Reject unsafe client-supplied image_url values, then ignore them for persistence.
  const imageUrlCheck = parseImageUrl(firstDefined(raw.image_url, raw.imageUrl));
  if (!imageUrlCheck.ok) return fail("image_url", imageUrlCheck.message);

  const durationMinutes = parseOptionalInt(
    firstDefined(raw.duration_minutes, raw.durationMinutes),
    "duration_minutes",
    15,
    480,
  );
  if (!durationMinutes.ok) return fail("duration_minutes", durationMinutes.message);

  const sessionCount = parseOptionalInt(
    firstDefined(raw.session_count, raw.sessionCount),
    "session_count",
    1,
    52,
  );
  if (!sessionCount.ok) return fail("session_count", sessionCount.message);

  const capacityMin = parseOptionalInt(
    firstDefined(raw.capacity_min, raw.capacityMin),
    "capacity_min",
    1,
  );
  if (!capacityMin.ok) return fail("capacity_min", capacityMin.message);

  const capacityMax = parseOptionalInt(
    firstDefined(raw.capacity_max, raw.capacityMax),
    "capacity_max",
    1,
  );
  if (!capacityMax.ok) return fail("capacity_max", capacityMax.message);

  if (
    capacityMin.value != null &&
    capacityMax.value != null &&
    capacityMax.value < capacityMin.value
  ) {
    return fail("capacity_max", "capacity_max must be >= capacity_min");
  }

  const ageMin = parseOptionalInt(firstDefined(raw.age_min, raw.ageMin), "age_min", 0, 120);
  if (!ageMin.ok) return fail("age_min", ageMin.message);

  const ageMax = parseOptionalInt(firstDefined(raw.age_max, raw.ageMax), "age_max", 0, 120);
  if (!ageMax.ok) return fail("age_max", ageMax.message);

  if (ageMin.value != null && ageMax.value != null && ageMax.value < ageMin.value) {
    return fail("age_max", "age_max must be >= age_min");
  }

  const requiresIdentity = parseOptionalBoolean(
    firstDefined(raw.requires_identity, raw.requiresIdentity),
    "requires_identity",
    mode === "create" ? false : undefined,
  );
  if (!requiresIdentity.ok) return fail("requires_identity", requiresIdentity.message);

  const requiresManualConfirmation = parseOptionalBoolean(
    firstDefined(raw.requires_manual_confirmation, raw.requiresManualConfirmation),
    "requires_manual_confirmation",
    mode === "create" ? false : undefined,
  );
  if (!requiresManualConfirmation.ok) {
    return fail("requires_manual_confirmation", requiresManualConfirmation.message);
  }

  const offerType = firstDefined(raw.offer_type, raw.offerType);
  const format = raw.format;
  const status = raw.status;
  const priceCents = firstDefined(raw.price_cents, raw.priceCents);
  const currency = raw.currency;

  return {
    ok: true,
    shared: {
      ...(title !== undefined ? { title } : {}),
      slug: slug.value,
      shortDescription: shortDescription.value,
      description: description.value,
      disciplineId: disciplineId.value,
      specialite: specialite.value,
      ...(offerType !== undefined ? { offerType } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(priceCents !== undefined ? { priceCents } : {}),
      ...(currency !== undefined ? { currency } : {}),
      durationMinutes: durationMinutes.value,
      sessionCount: sessionCount.value,
      capacityMin: capacityMin.value,
      capacityMax: capacityMax.value,
      level: level.value,
      ageMin: ageMin.value,
      ageMax: ageMax.value,
      ...(requiresIdentity.value !== undefined ? { requiresIdentity: requiresIdentity.value } : {}),
      ...(requiresManualConfirmation.value !== undefined
        ? { requiresManualConfirmation: requiresManualConfirmation.value }
        : {}),
    },
  };
}

export type ParseCreateResult =
  | { ok: true; data: TeacherOfferCreateInput }
  | OfferValidationFailure;

export type ParseUpdateResult =
  | { ok: true; data: TeacherOfferUpdateInput }
  | OfferValidationFailure;

export function parseTeacherOfferCreateInput(body: unknown): ParseCreateResult {
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first?.path.join(".") || "body", first?.message || "Invalid payload");
  }

  const normalized = normalizeSharedFields(parsed.data, "create");
  if (!normalized.ok) return normalized;

  const { shared } = normalized;
  if (!shared.title || !shared.offerType || !shared.format || shared.priceCents == null) {
    return fail("body", "title, offer_type, format, and price_cents are required");
  }

  return {
    ok: true,
    data: {
      title: shared.title,
      slug: shared.slug ?? null,
      shortDescription: shared.shortDescription ?? null,
      description: shared.description ?? null,
      disciplineId: shared.disciplineId ?? null,
      specialite: shared.specialite ?? null,
      offerType: shared.offerType,
      format: shared.format,
      status: shared.status === "published" ? "published" : "draft",
      imageUrl: shared.imageUrl ?? null,
      priceCents: shared.priceCents,
      currency: shared.currency ?? "CAD",
      durationMinutes: shared.durationMinutes ?? null,
      sessionCount: shared.sessionCount ?? null,
      capacityMin: shared.capacityMin ?? null,
      capacityMax: shared.capacityMax ?? null,
      level: shared.level ?? null,
      ageMin: shared.ageMin ?? null,
      ageMax: shared.ageMax ?? null,
      requiresIdentity: shared.requiresIdentity ?? false,
      requiresManualConfirmation: shared.requiresManualConfirmation ?? false,
    },
  };
}

export function parseTeacherOfferUpdateInput(body: unknown): ParseUpdateResult {
  const parsed = updateBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first?.path.join(".") || "body", first?.message || "Invalid payload");
  }

  const keys = Object.keys(parsed.data as Record<string, unknown>);
  if (keys.length === 0) {
    return fail("body", "at least one field is required");
  }

  const normalized = normalizeSharedFields(parsed.data, "update");
  if (!normalized.ok) return normalized;

  const data: TeacherOfferUpdateInput = {};
  const shared = normalized.shared;
  const source = parsed.data;

  if (source.title !== undefined && shared.title !== undefined) data.title = shared.title;
  if (source.slug !== undefined) data.slug = shared.slug ?? null;
  if (source.short_description !== undefined || source.shortDescription !== undefined) {
    data.shortDescription = shared.shortDescription ?? null;
  }
  if (source.description !== undefined) data.description = shared.description ?? null;
  if (source.discipline_id !== undefined || source.disciplineId !== undefined) {
    data.disciplineId = shared.disciplineId ?? null;
  }
  if (source.specialite !== undefined) data.specialite = shared.specialite ?? null;
  if (source.offer_type !== undefined || source.offerType !== undefined) {
    data.offerType = shared.offerType;
  }
  if (source.format !== undefined) data.format = shared.format;
  if (source.status !== undefined) data.status = shared.status;
  if (source.price_cents !== undefined || source.priceCents !== undefined) {
    data.priceCents = shared.priceCents;
  }
  if (source.currency !== undefined) data.currency = shared.currency;
  if (source.duration_minutes !== undefined || source.durationMinutes !== undefined) {
    data.durationMinutes = shared.durationMinutes ?? null;
  }
  if (source.session_count !== undefined || source.sessionCount !== undefined) {
    data.sessionCount = shared.sessionCount ?? null;
  }
  if (source.capacity_min !== undefined || source.capacityMin !== undefined) {
    data.capacityMin = shared.capacityMin ?? null;
  }
  if (source.capacity_max !== undefined || source.capacityMax !== undefined) {
    data.capacityMax = shared.capacityMax ?? null;
  }
  if (source.level !== undefined) data.level = shared.level ?? null;
  if (source.age_min !== undefined || source.ageMin !== undefined) {
    data.ageMin = shared.ageMin ?? null;
  }
  if (source.age_max !== undefined || source.ageMax !== undefined) {
    data.ageMax = shared.ageMax ?? null;
  }
  if (source.requires_identity !== undefined || source.requiresIdentity !== undefined) {
    data.requiresIdentity = shared.requiresIdentity;
  }
  if (
    source.requires_manual_confirmation !== undefined ||
    source.requiresManualConfirmation !== undefined
  ) {
    data.requiresManualConfirmation = shared.requiresManualConfirmation;
  }

  if (Object.keys(data).length === 0) {
    return fail("body", "no mutable fields provided");
  }

  if (
    data.capacityMin != null &&
    data.capacityMax != null &&
    data.capacityMax < data.capacityMin
  ) {
    return fail("capacity_max", "capacity_max must be >= capacity_min");
  }
  if (data.ageMin != null && data.ageMax != null && data.ageMax < data.ageMin) {
    return fail("age_max", "age_max must be >= age_min");
  }

  return { ok: true, data };
}

export function teacherOfferCreateToInsertRow(
  teacherId: string,
  createdBy: string,
  input: TeacherOfferCreateInput,
  nowIso: string,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    teacher_id: teacherId,
    created_by: createdBy,
    title: input.title,
    slug: input.slug,
    short_description: input.shortDescription,
    description: input.description,
    discipline_id: input.disciplineId,
    specialite: input.specialite,
    offer_type: input.offerType,
    format: input.format,
    status: input.status,
    image_url: null,
    price_cents: input.priceCents,
    currency: input.currency,
    duration_minutes: input.durationMinutes,
    session_count: input.sessionCount,
    capacity_min: input.capacityMin,
    capacity_max: input.capacityMax,
    level: input.level,
    age_min: input.ageMin,
    age_max: input.ageMax,
    requires_identity: input.requiresIdentity,
    requires_manual_confirmation: input.requiresManualConfirmation,
  };
  if (input.status === "published") {
    row.published_at = nowIso;
  }
  return row;
}

export function teacherOfferUpdateToPatchRow(input: TeacherOfferUpdateInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.shortDescription !== undefined) row.short_description = input.shortDescription;
  if (input.description !== undefined) row.description = input.description;
  if (input.disciplineId !== undefined) row.discipline_id = input.disciplineId;
  if (input.specialite !== undefined) row.specialite = input.specialite;
  if (input.offerType !== undefined) row.offer_type = input.offerType;
  if (input.format !== undefined) row.format = input.format;
  if (input.priceCents !== undefined) row.price_cents = input.priceCents;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.durationMinutes !== undefined) row.duration_minutes = input.durationMinutes;
  if (input.sessionCount !== undefined) row.session_count = input.sessionCount;
  if (input.capacityMin !== undefined) row.capacity_min = input.capacityMin;
  if (input.capacityMax !== undefined) row.capacity_max = input.capacityMax;
  if (input.level !== undefined) row.level = input.level;
  if (input.ageMin !== undefined) row.age_min = input.ageMin;
  if (input.ageMax !== undefined) row.age_max = input.ageMax;
  if (input.requiresIdentity !== undefined) row.requires_identity = input.requiresIdentity;
  if (input.requiresManualConfirmation !== undefined) {
    row.requires_manual_confirmation = input.requiresManualConfirmation;
  }
  return row;
}

export function mergedOfferRangeError(
  current: TeacherOfferDto,
  patch: TeacherOfferUpdateInput,
): OfferValidationFailure | null {
  const capacityMin = patch.capacityMin !== undefined ? patch.capacityMin : current.capacityMin;
  const capacityMax = patch.capacityMax !== undefined ? patch.capacityMax : current.capacityMax;
  if (capacityMin != null && capacityMax != null && capacityMax < capacityMin) {
    return fail("capacity_max", "capacity_max must be >= capacity_min");
  }
  const ageMin = patch.ageMin !== undefined ? patch.ageMin : current.ageMin;
  const ageMax = patch.ageMax !== undefined ? patch.ageMax : current.ageMax;
  if (ageMin != null && ageMax != null && ageMax < ageMin) {
    return fail("age_max", "age_max must be >= age_min");
  }
  return null;
}
