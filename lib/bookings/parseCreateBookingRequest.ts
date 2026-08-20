export const CLIENT_BOOKING_OFFER_SNAPSHOT_KEYS = [
  "teacher_offer_title_snapshot",
  "teacher_offer_type_snapshot",
  "teacher_offer_format_snapshot",
  "teacher_offer_price_cents_snapshot",
  "teacher_offer_currency_snapshot",
  "teacher_offer_duration_minutes_snapshot",
  "teacher_offer_session_count_snapshot",
  "teacher_offer_discipline_id_snapshot",
  "teacher_offer_specialite_snapshot",
  "teacher_offer_short_description_snapshot",
  "teacher_offer_cancellation_preference_snapshot",
  "teacher_offer_reschedule_preference_snapshot",
  "teacher_offer_snapshot_version",
] as const;

export type CreateBookingLessonType = "regular" | "intro";
export type CreateBookingTeachingMode = "person" | "online" | "domicile";

export type ParsedCreateBookingRequest = {
  teacherId: string;
  date: string;
  time: string;
  slotDate: string;
  timeSlot: string;
  studentLevel: string | null;
  teachingMode: CreateBookingTeachingMode;
  lessonType: CreateBookingLessonType;
  price: number;
  durationMinutes: number;
  studentAddress: string | null;
  learnerProfileId: string | null;
  teacherOfferId: string | null;
};

export type ParseCreateBookingRequestResult =
  | { ok: true; data: ParsedCreateBookingRequest }
  | { ok: false; error: "invalid_payload" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asUuid(value: unknown): string | null {
  const text = asTrimmedString(value);
  return text && UUID_RE.test(text) ? text : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function clientSentOfferSnapshotFields(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  return CLIENT_BOOKING_OFFER_SNAPSHOT_KEYS.some((key) => key in record);
}

function optionalTeacherOfferId(body: Record<string, unknown>): string | null | "invalid" {
  const snake = body.teacher_offer_id;
  const camel = body.teacherOfferId;
  const snakePresent = snake !== undefined && snake !== null && snake !== "";
  const camelPresent = camel !== undefined && camel !== null && camel !== "";
  if (!snakePresent && !camelPresent) return null;
  const snakeId = snakePresent ? asUuid(snake) : null;
  const camelId = camelPresent ? asUuid(camel) : null;
  if (snakePresent && !snakeId) return "invalid";
  if (camelPresent && !camelId) return "invalid";
  if (snakeId && camelId && snakeId !== camelId) return "invalid";
  return snakeId ?? camelId;
}

export function parseCreateBookingRequest(body: unknown): ParseCreateBookingRequestResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_payload" };
  }
  if (clientSentOfferSnapshotFields(body)) {
    return { ok: false, error: "invalid_payload" };
  }

  const record = body as Record<string, unknown>;
  const teacherId = asUuid(record.teacher_id);
  const date = asTrimmedString(record.date);
  const time = asTrimmedString(record.time);
  const slotDate = asTrimmedString(record.slot_date) ?? date;
  const timeSlot = asTrimmedString(record.time_slot) ?? time;
  const teachingMode = asTrimmedString(record.teaching_mode);
  const lessonType = asTrimmedString(record.lesson_type) ?? "regular";
  const price = asFiniteNumber(record.price);
  const durationMinutes = asFiniteNumber(record.duration_minutes);
  const studentLevel = asTrimmedString(record.student_level);
  const studentAddress = asTrimmedString(record.student_address);
  const learnerRaw = record.learner_profile_id;
  const learnerProfileId =
    learnerRaw === undefined || learnerRaw === null || learnerRaw === ""
      ? null
      : asUuid(learnerRaw);
  const teacherOfferId = optionalTeacherOfferId(record);

  if (
    !teacherId ||
    !date ||
    !time ||
    !slotDate ||
    !timeSlot ||
    !ISO_DATE_RE.test(slotDate) ||
    timeSlot.length > 32 ||
    time.length > 32 ||
    (teachingMode !== "person" && teachingMode !== "online" && teachingMode !== "domicile") ||
    (lessonType !== "regular" && lessonType !== "intro") ||
    price == null ||
    price < 0 ||
    durationMinutes == null ||
    durationMinutes < 15 ||
    durationMinutes > 480 ||
    teacherOfferId === "invalid" ||
    (learnerRaw !== undefined && learnerRaw !== null && learnerRaw !== "" && learnerProfileId == null)
  ) {
    return { ok: false, error: "invalid_payload" };
  }

  return {
    ok: true,
    data: {
      teacherId,
      date,
      time,
      slotDate,
      timeSlot,
      studentLevel,
      teachingMode,
      lessonType,
      price,
      durationMinutes,
      studentAddress: teachingMode === "domicile" ? studentAddress : null,
      learnerProfileId,
      teacherOfferId,
    },
  };
}
