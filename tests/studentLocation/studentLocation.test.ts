import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  approximateDistanceKm,
  formatApproxDistanceKm,
  normalizeStudentLocation,
  parseStoredStudentLocation,
  studentLocationToBookingAddress,
} from "../../lib/studentLocation";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const root = process.cwd();
const routeSrc = readFileSync(join(root, "app", "api", "student", "location", "route.ts"), "utf8");
const searchSrc = readFileSync(join(root, "app", "(app)", "student", "search", "page.tsx"), "utf8");
const bookingModalSrc = readFileSync(join(root, "components", "BookingModal.tsx"), "utf8");
const authProviderSrc = readFileSync(join(root, "components", "AuthProvider.tsx"), "utf8");
const migrationSrc = readFileSync(join(root, "supabase", "migrations", "073_student_saved_location.sql"), "utf8");

test("student location normalizes safe address and coordinates", () => {
  const location = normalizeStudentLocation({
    address: "  123 Rue Principale  ",
    city: "Saint-Georges",
    region: "QC",
    country: "CA",
    lat: 46.12,
    lng: -70.67,
    place_id: "abc",
  });
  assert.equal(location.address, "123 Rue Principale");
  assert.equal(location.city, "Saint-Georges");
  assert.equal(location.lat, 46.12);
  assert.equal(location.lng, -70.67);
});

test("student location rejects invalid latitude/longitude", () => {
  assert.throws(() => normalizeStudentLocation({ address: "x", lat: 91, lng: -70 }), /latitude/i);
  assert.throws(() => normalizeStudentLocation({ address: "x", lat: 45, lng: -181 }), /longitude/i);
  assert.throws(() => normalizeStudentLocation({ address: "x", lat: 45 }), /together/i);
});

test("student location can clear and parse stored null safely", () => {
  assert.equal(parseStoredStudentLocation(null), null);
  assert.equal(parseStoredStudentLocation({ lat: "bad", lng: 1 }), null);
});

test("booking address prefill uses full saved address or safe summary", () => {
  assert.equal(
    studentLocationToBookingAddress({ address: "123 Rue A", city: null, region: null, country: null, lat: null, lng: null, place_id: null }),
    "123 Rue A",
  );
  assert.equal(
    studentLocationToBookingAddress({ address: null, city: "Québec", region: "QC", country: "CA", lat: null, lng: null, place_id: null }),
    "Québec, QC, CA",
  );
});

test("approximate distance only appears when both sides have coordinates", () => {
  assert.equal(approximateDistanceKm({ lat: null, lng: null }, { lat: 46, lng: -71 }), null);
  assert.equal(approximateDistanceKm({ lat: 46, lng: -71 }, { lat: null, lng: -71 }), null);
  const km = approximateDistanceKm({ lat: 46, lng: -71 }, { lat: 46.01, lng: -71 });
  assert.equal(typeof km, "number");
  assert.match(formatApproxDistanceKm(km!), /km$/);
});

test("student location route requires auth and never trusts client userId", () => {
  assert.match(routeSrc, /authorization/i);
  assert.match(routeSrc, /auth\.getUser\(\)/);
  assert.match(routeSrc, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(routeSrc, /body\.userId|body\.user_id|userId\)\s*\)/);
});

test("student location route writes only to the owner-only private table", () => {
  // Defense-in-depth: must use the JWT-scoped supabase client so RLS enforces
  // ownership even if the .eq(user_id) predicate is ever weakened.
  assert.match(routeSrc, /supabaseUser\s*\n?\s*\.from\("student_private_locations"\)/);
  assert.match(routeSrc, /\.upsert\(\s*\{\s*user_id: user\.id/);
  assert.match(routeSrc, /\.delete\(\)/);
  // Must not write to profiles or any teacher-readable surface.
  assert.doesNotMatch(routeSrc, /\.from\("profiles"\)/);
  assert.doesNotMatch(routeSrc, /teachers_public|teachers\)/);
  // Must not pull in the service-role admin client for this mutation; doing
  // so would bypass RLS and defeat the dedicated table's protection.
  assert.doesNotMatch(routeSrc, /getSupabaseAdmin/);
});

test("/student/search reads the saved location from the owner-only table, not profiles", () => {
  assert.match(searchSrc, /\.from\("student_private_locations"\)/);
  assert.match(searchSrc, /parseStoredStudentLocation/);
  assert.match(searchSrc, /setGeo\(\(current\) => current \?\?/);
  assert.match(searchSrc, /studentApproxDistanceFromYou/);
  // The prefs select on profiles must NOT pull the private location column,
  // because that column no longer exists and would otherwise hint that the
  // private value is reachable through teacher-peer RLS.
  const profilesSelect = searchSrc.match(/\.from\("profiles"\)[\s\S]*?\.maybeSingle\(\)/);
  assert.ok(profilesSelect, "expected a profiles select on the search page");
  assert.doesNotMatch(profilesSelect![0], /student_location/);
});

test("student search teacher cards do not render full learner address", () => {
  const cardSrc = searchSrc.slice(searchSrc.indexOf("function TeacherCard"));
  assert.doesNotMatch(cardSrc, /studentLocation|student_location|studentAddress|address:/);
  assert.match(cardSrc, /formatApproxDistanceKm/);
});

test("BookingModal fetches saved location from the private table and still requires home address", () => {
  assert.match(bookingModalSrc, /\.from\("student_private_locations"\)[\s\S]*\.select\("location"\)/);
  assert.match(bookingModalSrc, /studentLocationToBookingAddress/);
  assert.match(bookingModalSrc, /bookingAddressRequired/);
  assert.match(bookingModalSrc, /student_address:\s*modeForDb === "domicile" \? addressTrim/);
  // The modal must not try to pull student_location from profiles anymore.
  assert.doesNotMatch(bookingModalSrc, /select\("student_location"\)/);
});

test("AuthProvider sources the saved location from the private table only", () => {
  assert.match(authProviderSrc, /\.from\("student_private_locations"\)/);
  // No more `ext.student_location` shortcut on the merged profile row.
  assert.doesNotMatch(authProviderSrc, /ext\.student_location/);
});

test("migration creates an owner-only private table and drops the public profiles column", () => {
  assert.match(migrationSrc, /DROP COLUMN IF EXISTS student_location/);
  assert.match(migrationSrc, /CREATE TABLE IF NOT EXISTS public\.student_private_locations/);
  assert.match(migrationSrc, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSrc, /student_private_locations_select_own[\s\S]*USING \(auth\.uid\(\) = user_id\)/);
  assert.match(migrationSrc, /student_private_locations_insert_own/);
  assert.match(migrationSrc, /student_private_locations_update_own/);
  assert.match(migrationSrc, /student_private_locations_delete_own/);
  // Must not weaken or extend teachers_public or expose to anon.
  assert.doesNotMatch(migrationSrc, /teachers_public/);
  assert.doesNotMatch(migrationSrc, /GRANT[^;]*TO anon/);
  // Must not re-create the leaky profiles column.
  assert.doesNotMatch(migrationSrc, /ADD COLUMN[^;]*student_location/);
});

test("student location patch does not touch Stripe/payment/guarantee/cron files", () => {
  const forbidden = [
    "lib/payments/commission.ts",
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "app/api/cron/bookings/complete/route.ts",
    "app/api/support/cases/first-lesson-guarantee/route.ts",
  ];
  for (const file of forbidden) {
    const src = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(src, /student_location|student_private_locations|studentApproxDistanceFromYou|studentLocationToBookingAddress/);
  }
});

console.log("[studentLocation] tests passed");
