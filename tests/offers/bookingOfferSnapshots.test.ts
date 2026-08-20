/**
 * PR 7: booking offer snapshots server foundation.
 * Static + unit tests (no live Supabase). Stripe/checkout/payment math unchanged.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCreateBookingInsertRow,
  resolveOfferSnapshotForBookingCreate,
} from "../../lib/bookings/createPendingPaymentBooking";
import {
  clientSentOfferSnapshotFields,
  parseCreateBookingRequest,
} from "../../lib/bookings/parseCreateBookingRequest";
import { buildBookingCreateOfferFields } from "../../lib/offers/bookingOfferSelection";
import {
  BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION,
  loadPublishedTeacherOfferSnapshotForBooking,
  mapTeacherOfferRowToBookingSnapshot,
} from "../../lib/offers/bookingOfferSnapshot";
import type { TranslationKey } from "../../lib/i18n/types";
import { t as translate } from "../../lib/translations";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATION = "supabase/migrations/099_add_teacher_offer_snapshots_to_bookings.sql";
const ROUTE = "app/api/bookings/route.ts";
const BOOKING_MODAL = "components/BookingModal.tsx";
const CHECKOUT = "app/api/stripe/checkout/route.ts";
const SEARCH = "app/(app)/student/search/page.tsx";
const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OFFER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_TEACHER = "22222222-2222-4222-8222-222222222222";
const t = (key: TranslationKey) => translate(key, "fr");

const publishedRow = {
  id: OFFER_ID,
  teacher_id: TEACHER_ID,
  title: "Cours de piano",
  short_description: "En ligne",
  discipline_id: "piano",
  specialite: null,
  offer_type: "private_lesson",
  format: "online",
  status: "published",
  price_cents: 7000,
  currency: "CAD",
  duration_minutes: 60,
  session_count: null,
  published_at: "2026-08-19T12:00:00.000Z",
};

function mockOfferClient(row: typeof publishedRow | null, error: { message?: string } | null = null) {
  return {
    from(table: string) {
      assert.equal(table, "teacher_offers");
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: row, error }),
              };
            },
          };
        },
      };
    },
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    teacher_id: TEACHER_ID,
    date: "2026-09-01",
    time: "10:00",
    slot_date: "2026-09-01",
    time_slot: "10:00",
    teaching_mode: "online",
    lesson_type: "regular",
    price: 70,
    duration_minutes: 60,
    ...overrides,
  };
}

test("booking snapshot migration adds nullable columns", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /ALTER TABLE public\.bookings/);
  assert.match(sql, /teacher_offer_id uuid/);
  assert.match(sql, /REFERENCES public\.teacher_offers \(id\) ON DELETE SET NULL/);
  assert.match(sql, /teacher_offer_title_snapshot text/);
  assert.match(sql, /teacher_offer_type_snapshot text/);
  assert.match(sql, /teacher_offer_format_snapshot text/);
  assert.match(sql, /teacher_offer_price_cents_snapshot integer/);
  assert.match(sql, /teacher_offer_currency_snapshot text/);
  assert.match(sql, /teacher_offer_duration_minutes_snapshot integer/);
  assert.match(sql, /teacher_offer_session_count_snapshot integer/);
  assert.match(sql, /teacher_offer_discipline_id_snapshot text/);
  assert.match(sql, /teacher_offer_specialite_snapshot text/);
  assert.match(sql, /teacher_offer_short_description_snapshot text/);
  assert.match(sql, /teacher_offer_snapshot_version integer NOT NULL DEFAULT 1/);
  assert.match(sql, /teacher_offer_price_cents_snapshot IS NULL\s+OR teacher_offer_price_cents_snapshot >= 0/);
  assert.match(sql, /teacher_offer_currency_snapshot = 'CAD'/);
  assert.match(sql, /immutable booking-time copies/i);
});

test("legacy bookings without teacher_offer_id remain valid", () => {
  const sql = read(MIGRATION);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS teacher_offer_id uuid/);
  assert.doesNotMatch(sql, /teacher_offer_id uuid NOT NULL/);
  assert.doesNotMatch(sql, /UPDATE public\.bookings SET teacher_offer/);
  assert.doesNotMatch(sql, /UPDATE public\.bookings SET teacher_offer/);
});

test("booking creation without teacher_offer_id parses as before", () => {
  const parsed = parseCreateBookingRequest(validBody());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.data.teacherOfferId, null);
  assert.equal(parsed.data.teacherId, TEACHER_ID);
  assert.equal(parsed.data.price, 70);
});

test("feature flag OFF excludes teacher_offer_id from client builder and rejects on server helper", async () => {
  assert.deepEqual(buildBookingCreateOfferFields(OFFER_ID), {});
  const resolved = await resolveOfferSnapshotForBookingCreate({
    admin: mockOfferClient(publishedRow),
    teacherId: TEACHER_ID,
    teacherOfferId: OFFER_ID,
  });
  assert.equal(resolved.ok, false);
  if (resolved.ok) return;
  assert.equal(resolved.status, 400);
  assert.equal(resolved.error, "offer_selection_disabled");
});

test("feature flag ON accepts teacher_offer_id in the client builder", () => {
  const prev = process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION;
  process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = "true";
  try {
    assert.deepEqual(buildBookingCreateOfferFields(OFFER_ID), { teacher_offer_id: OFFER_ID });
    assert.deepEqual(buildBookingCreateOfferFields(null), {});
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION;
    else process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = prev;
  }
});

test("server fetches offer from DB to create snapshot", async () => {
  const prev = process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION;
  process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = "true";
  try {
    const loaded = await loadPublishedTeacherOfferSnapshotForBooking({
      supabase: mockOfferClient(publishedRow),
      teacherId: TEACHER_ID,
      teacherOfferId: OFFER_ID,
    });
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.snapshot.teacher_offer_title_snapshot, "Cours de piano");
    assert.equal(loaded.snapshot.teacher_offer_price_cents_snapshot, 7000);
    assert.equal(loaded.snapshot.teacher_offer_snapshot_version, BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION;
    else process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = prev;
  }
});

test("client cannot send snapshot fields", () => {
  assert.equal(clientSentOfferSnapshotFields(validBody({ teacher_offer_title_snapshot: "hack" })), true);
  const parsed = parseCreateBookingRequest(validBody({ teacher_offer_price_cents_snapshot: 1 }));
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "invalid_payload");
});

test("snapshot uses DB offer title/type/format/price not client values", () => {
  const mapped = mapTeacherOfferRowToBookingSnapshot(
    { ...publishedRow, title: "DB title", price_cents: 8800 },
    TEACHER_ID,
  );
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.snapshot.teacher_offer_title_snapshot, "DB title");
  assert.equal(mapped.snapshot.teacher_offer_price_cents_snapshot, 8800);
  const row = buildCreateBookingInsertRow({
    studentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    request: {
      teacherId: TEACHER_ID,
      date: "2026-09-01",
      time: "10:00",
      slotDate: "2026-09-01",
      timeSlot: "10:00",
      studentLevel: null,
      teachingMode: "online",
      lessonType: "regular",
      price: 70,
      durationMinutes: 60,
      studentAddress: null,
      learnerProfileId: null,
      teacherOfferId: OFFER_ID,
    },
    snapshot: mapped.snapshot,
  });
  assert.equal(row.price, 70);
  assert.equal(row.teacher_offer_price_cents_snapshot, 8800);
  assert.equal(row.student_id, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
});

test("draft paused and archived offers cannot be snapshotted", () => {
  for (const status of ["draft", "paused", "archived"] as const) {
    const mapped = mapTeacherOfferRowToBookingSnapshot(
      { ...publishedRow, status, published_at: status === "published" ? publishedRow.published_at : null },
      TEACHER_ID,
    );
    assert.equal(mapped.ok, false);
    if (mapped.ok) continue;
    assert.equal(mapped.error, "offer_not_bookable");
  }
});

test("another teacher offer and nonexistent offer share offer_not_found", async () => {
  const other = mapTeacherOfferRowToBookingSnapshot({ ...publishedRow, teacher_id: OTHER_TEACHER }, TEACHER_ID);
  assert.equal(other.ok, false);
  if (!other.ok) assert.equal(other.error, "offer_not_found");
  const missing = await loadPublishedTeacherOfferSnapshotForBooking({
    supabase: mockOfferClient(null),
    teacherId: TEACHER_ID,
    teacherOfferId: OFFER_ID,
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error, "offer_not_found");
});

test("published offer owned by teacher creates snapshot fields", () => {
  const mapped = mapTeacherOfferRowToBookingSnapshot(publishedRow, TEACHER_ID);
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.snapshot.teacher_offer_id, OFFER_ID);
  assert.equal(mapped.snapshot.teacher_offer_type_snapshot, "private_lesson");
  assert.equal(mapped.snapshot.teacher_offer_format_snapshot, "online");
  assert.equal(mapped.snapshot.teacher_offer_currency_snapshot, "CAD");
});

test("insert row without selected offer keeps snapshot fields absent", () => {
  const parsed = parseCreateBookingRequest(validBody());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const row = buildCreateBookingInsertRow({
    studentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    request: parsed.data,
    snapshot: null,
  });
  assert.equal("teacher_offer_id" in row, false);
  assert.equal("teacher_offer_price_cents_snapshot" in row, false);
  assert.equal(row.status, "pending_payment");
});

test("POST /api/bookings exists and does not trust client student_id or snapshot fields", () => {
  const src = read(ROUTE);
  assert.match(src, /export async function POST/);
  assert.match(src, /parseCreateBookingRequest/);
  assert.match(src, /createPendingPaymentBooking/);
  assert.match(src, /studentId: user\.id/);
  assert.doesNotMatch(src, /student_id:\s*parsed/);
  assert.match(src, /legacy booking pricing remains the live payment source/);
  assert.doesNotMatch(src, /computeBookingChargeCents|calculateBookingAmounts|from ["']stripe["']/);
});

test("BookingModal uses POST /api/bookings and does not client-insert bookings", () => {
  const src = read(BOOKING_MODAL);
  assert.match(src, /fetch\("\/api\/bookings"/);
  assert.doesNotMatch(src, /from\("bookings"\)\.insert/);
  assert.match(src, /buildBookingCreateOfferFields/);
  assert.doesNotMatch(src, /teacher_offer_title_snapshot/);
  const checkout = src.slice(src.indexOf('fetch("/api/stripe/checkout"'));
  assert.doesNotMatch(checkout.slice(0, 1200), /teacher_offer_id/);
});

test("booking update endpoints cannot modify snapshot fields from client payload", () => {
  for (const rel of [
    "app/api/bookings/[id]/cancel/route.ts",
    "app/api/bookings/[id]/complete/route.ts",
    "app/api/bookings/[id]/decline/route.ts",
    "app/api/bookings/[id]/meeting-link/route.ts",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /teacher_offer_title_snapshot/);
    assert.doesNotMatch(src, /teacher_offer_price_cents_snapshot/);
    assert.doesNotMatch(src, /\.update\(\s*body/);
  }
  assert.match(read(MIGRATION), /bookings_preserve_offer_snapshot_fields/);
});

test("checkout and payment math files are unchanged", () => {
  for (const rel of [
    CHECKOUT,
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/pricing/bookingCharge.ts",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /teacher_offer/);
    assert.doesNotMatch(src, /bookingOfferSnapshot/);
    assert.doesNotMatch(src, /from ["']@\/lib\/offers/);
  }
  assert.doesNotMatch(read("lib/bookings/createPendingPaymentBooking.ts"), /computeBookingChargeCents/);
});

test("public search cards unchanged and no catalog added", () => {
  assert.doesNotMatch(read(SEARCH), /BookingOfferPicker|teacher_offer_id/);
  assert.equal(existsSync(join(ROOT, "app/offres/page.tsx")), false);
  assert.equal(existsSync(join(ROOT, "app/offers/page.tsx")), false);
});

test("no Mes formules / formules product label introduced", () => {
  for (const rel of [
    MIGRATION,
    ROUTE,
    BOOKING_MODAL,
    "lib/offers/bookingOfferSnapshot.ts",
    "lib/bookings/parseCreateBookingRequest.ts",
    "lib/i18n/locales/fr.json",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
  }
  assert.equal(t("bookingOfferNotFound"), "Cette offre n’est plus disponible pour la réservation.");
  assert.equal(t("bookingOfferSelectionDisabled"), "La sélection d’offre n’est pas encore activée.");
  assert.equal(t("bookingOfferNotBookable"), "Cette offre ne peut pas être réservée.");
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:booking-offer-snapshots] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
