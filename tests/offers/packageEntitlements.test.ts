import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  bookingSnapshotIsPackage,
  createPackageEntitlementFromPaidBooking,
  isPackageEntitlementsEnabled,
  maybeCreatePackageEntitlementAfterPaidBooking,
  parsePackageOfferSnapshotFromBooking,
} from "../../lib/offers/packageEntitlements";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];

const BOOKING_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STUDENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OFFER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PAYMENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function completePackageBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    teacher_offer_id: OFFER_ID,
    teacher_offer_title_snapshot: "Forfait 5 cours",
    teacher_offer_type_snapshot: "package",
    teacher_offer_format_snapshot: "online",
    teacher_offer_price_cents_snapshot: 25000,
    teacher_offer_currency_snapshot: "CAD",
    teacher_offer_duration_minutes_snapshot: 60,
    teacher_offer_session_count_snapshot: 5,
    teacher_offer_snapshot_version: 1,
    ...overrides,
  };
}

function entitlementFromInsert(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    ...row,
  };
}

function createFakeAdmin(state: {
  existing?: Record<string, unknown> | null;
  insertError?: { message: string; code?: string } | null;
  paymentId?: string | null;
  bookingRow?: Record<string, unknown> | null;
}) {
  let existing = state.existing ?? null;
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  if (table === "package_entitlements") {
                    return { data: existing, error: null };
                  }
                  if (table === "booking_payments") {
                    return {
                      data: state.paymentId ? { id: state.paymentId } : null,
                      error: null,
                    };
                  }
                  if (table === "bookings") {
                    return { data: state.bookingRow ?? null, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        insert(row: Record<string, unknown>) {
          return {
            select() {
              return {
                async single() {
                  if (state.insertError) {
                    return { data: null, error: state.insertError };
                  }
                  existing = entitlementFromInsert(row);
                  return { data: existing, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

const prevFlag = process.env.ENABLE_PACKAGE_ENTITLEMENTS;

test("package entitlements flag defaults OFF", () => {
  delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
  assert.equal(isPackageEntitlementsEnabled(), false);
});

test("parsePackageOfferSnapshotFromBooking requires package snapshot fields", () => {
  const parsed = parsePackageOfferSnapshotFromBooking(completePackageBooking());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.snapshot.sessionCount, 5);
  assert.equal(parsed.snapshot.priceCents, 25000);
  assert.equal(bookingSnapshotIsPackage({ teacher_offer_type_snapshot: "private_lesson" }), false);
});

test("incomplete package snapshot is rejected", () => {
  const parsed = parsePackageOfferSnapshotFromBooking(
    completePackageBooking({ teacher_offer_session_count_snapshot: null }),
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "incomplete_offer_snapshot");
});

test("createPackageEntitlementFromPaidBooking skips when flag is OFF", async () => {
  delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
  const result = await createPackageEntitlementFromPaidBooking({
    admin: createFakeAdmin({}),
    booking: completePackageBooking(),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.skipped, true);
  if (result.skipped) assert.equal(result.reason, "disabled");
});

test("createPackageEntitlementFromPaidBooking skips non-package bookings", async () => {
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  const result = await createPackageEntitlementFromPaidBooking({
    admin: createFakeAdmin({}),
    booking: completePackageBooking({ teacher_offer_type_snapshot: "private_lesson" }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.skipped, true);
  if (result.skipped) assert.equal(result.reason, "not_a_package_snapshot");
});

test("createPackageEntitlementFromPaidBooking copies snapshot sessions and does not redeem", async () => {
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  const result = await createPackageEntitlementFromPaidBooking({
    admin: createFakeAdmin({ paymentId: PAYMENT_ID }),
    booking: completePackageBooking(),
    paymentId: PAYMENT_ID,
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.skipped) return;
  assert.equal(result.created, true);
  assert.equal(result.entitlement.total_sessions, 5);
  assert.equal(result.entitlement.used_sessions, 0);
  assert.equal(result.entitlement.remaining_sessions, 5);
  assert.equal(result.entitlement.offer_price_cents_snapshot, 25000);
  assert.equal(result.entitlement.offer_title_snapshot, "Forfait 5 cours");
  assert.equal(result.entitlement.status, "active");
});

test("createPackageEntitlementFromPaidBooking is idempotent for the same booking", async () => {
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  const existing = entitlementFromInsert({
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    booking_id: BOOKING_ID,
    payment_id: PAYMENT_ID,
    teacher_offer_id: OFFER_ID,
    offer_title_snapshot: "Forfait 5 cours",
    offer_type_snapshot: "package",
    offer_format_snapshot: "online",
    offer_price_cents_snapshot: 25000,
    offer_currency_snapshot: "CAD",
    offer_duration_minutes_snapshot: 60,
    offer_session_count_snapshot: 5,
    offer_discipline_id_snapshot: null,
    offer_specialite_snapshot: null,
    offer_short_description_snapshot: null,
    offer_snapshot_version: 1,
    total_sessions: 5,
    used_sessions: 0,
    remaining_sessions: 5,
    status: "active",
    activated_at: "2026-08-20T00:00:00.000Z",
  });
  const result = await createPackageEntitlementFromPaidBooking({
    admin: createFakeAdmin({ existing }),
    booking: completePackageBooking(),
    paymentId: PAYMENT_ID,
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.skipped) return;
  assert.equal(result.created, false);
  assert.equal(result.entitlement.booking_id, BOOKING_ID);
});

test("unique violation on insert returns the existing entitlement", async () => {
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  const existing = entitlementFromInsert({
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    booking_id: BOOKING_ID,
    payment_id: PAYMENT_ID,
    teacher_offer_id: OFFER_ID,
    offer_title_snapshot: "Forfait 5 cours",
    offer_type_snapshot: "package",
    offer_format_snapshot: "online",
    offer_price_cents_snapshot: 25000,
    offer_currency_snapshot: "CAD",
    offer_duration_minutes_snapshot: 60,
    offer_session_count_snapshot: 5,
    offer_discipline_id_snapshot: null,
    offer_specialite_snapshot: null,
    offer_short_description_snapshot: null,
    offer_snapshot_version: 1,
    total_sessions: 5,
    used_sessions: 0,
    remaining_sessions: 5,
    status: "active",
    activated_at: "2026-08-20T00:00:00.000Z",
  });
  let calls = 0;
  const admin = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  calls += 1;
                  return { data: calls === 1 ? null : existing, error: null };
                },
              };
            },
          };
        },
        insert() {
          return {
            select() {
              return {
                async single() {
                  return { data: null, error: { message: "duplicate", code: "23505" } };
                },
              };
            },
          };
        },
      };
    },
  };
  const result = await createPackageEntitlementFromPaidBooking({
    admin,
    booking: completePackageBooking(),
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.skipped) return;
  assert.equal(result.created, false);
});

test("maybeCreatePackageEntitlementAfterPaidBooking never reads live teacher_offers", async () => {
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  const tables: string[] = [];
  const admin = createFakeAdmin({
    paymentId: PAYMENT_ID,
    bookingRow: completePackageBooking(),
  });
  const wrapped = {
    from(table: string) {
      tables.push(table);
      return admin.from(table);
    },
  };
  await maybeCreatePackageEntitlementAfterPaidBooking({
    admin: wrapped,
    bookingId: BOOKING_ID,
    booking: completePackageBooking(),
  });
  assert.equal(tables.includes("teacher_offers"), false);
  assert.ok(tables.includes("package_entitlements"));
  assert.ok(tables.includes("booking_payments"));
});

test("migration creates package_entitlements with RLS and no client writes", () => {
  const sql = read("supabase/migrations/100_create_package_entitlements.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.package_entitlements/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /package_entitlements_select_student/);
  assert.match(sql, /package_entitlements_select_teacher/);
  assert.match(sql, /package_entitlements_no_client_insert/);
  assert.match(sql, /package_entitlements_no_client_update/);
  assert.match(sql, /WITH CHECK \(false\)/);
  assert.match(sql, /UNIQUE \(booking_id\)/);
  assert.match(sql, /offer_type_snapshot = 'package'/);
  assert.match(sql, /used_sessions \+ remaining_sessions = total_sessions/);
  assert.match(sql, /GRANT ALL ON TABLE public\.package_entitlements TO service_role/);
  assert.doesNotMatch(sql, /Mes formules/);
  assert.doesNotMatch(sql, /\bformules\b/);
});

test("webhook and success paths create entitlements after paid ledger only", () => {
  const webhook = read("app/api/stripe/webhook/route.ts");
  const success = read("app/(app)/booking/success/page.tsx");
  assert.match(webhook, /maybeCreatePackageEntitlementAfterPaidBooking/);
  assert.match(success, /maybeCreatePackageEntitlementAfterPaidBooking/);
  assert.doesNotMatch(webhook, /from\(["']teacher_offers["']\)/);
  assert.doesNotMatch(success, /from\(["']teacher_offers["']\)/);
  const helper = read("lib/offers/packageEntitlements.ts");
  assert.doesNotMatch(helper, /used_sessions:\s*[1-9]/);
  assert.match(helper, /used_sessions: 0/);
  assert.doesNotMatch(helper, /remaining_sessions:\s*[^.]*-\s*1/);
});

test("checkout allows package only through the dual-flag resolver", () => {
  const checkout = read("lib/offers/offerSnapshotCheckout.ts");
  assert.match(checkout, /isPackageEntitlementsEnabled/);
  assert.match(checkout, /value === "package"/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /package_entitlements/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /ENABLE_PACKAGE_ENTITLEMENTS/);
});

test("no package redemption UI or catalog added", () => {
  assert.equal(read("components/BookingModal.tsx").includes("package_entitlements"), false);
  assert.doesNotMatch(read("components/TeacherProfile.tsx"), /package_entitlements/);
  assert.doesNotMatch(read("app/(app)/teacher/offers/page.tsx"), /package_entitlements/);
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  if (prevFlag === undefined) {
    delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
  } else {
    process.env.ENABLE_PACKAGE_ENTITLEMENTS = prevFlag;
  }
  console.log("[offers:package-entitlements] tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
