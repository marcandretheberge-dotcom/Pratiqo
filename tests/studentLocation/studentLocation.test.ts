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
const teacherProfileSrc = readFileSync(join(root, "components", "TeacherProfile.tsx"), "utf8");
const searchMapViewSrc = readFileSync(join(root, "components", "SearchMapView.tsx"), "utf8");

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
  // On load with saved coordinates the page seeds `geo` so teacher cards and
  // the map can render distance immediately, without waiting for a browser
  // geolocation prompt.
  assert.match(
    searchSrc,
    /studentLocationHasCoordinates\(parsedLocation\)[\s\S]{0,400}setGeo\(\{\s*lat:\s*parsedLocation\.lat/,
  );
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

// ── New tests for autocomplete, distance display, and map centering ──────────

test("student search uses Google Places autocomplete, not plain text-only input", () => {
  // Must import the Places library
  assert.match(searchSrc, /importLibrary\("places"\)/);
  // Must wire up Autocomplete on the address input
  assert.match(searchSrc, /google\.maps\.places\.Autocomplete/);
  // Must use parseGooglePlace to extract structured fields
  assert.match(searchSrc, /parseGooglePlace/);
  // Must attach a ref to the address input element
  assert.match(searchSrc, /studentAddressRef/);
});

test("selecting a Google Place saves lat/lng/place_id via /api/student/location", () => {
  // place_changed listener must call saveStudentLocation with lat/lng/place_id
  assert.match(searchSrc, /parsed\.latitude/);
  assert.match(searchSrc, /parsed\.longitude/);
  assert.match(searchSrc, /place_id/);
  // saveStudentLocation must be called with the full structured result
  assert.match(searchSrc, /void saveStudentLocation\(\{/);
});

test("search page shows suggestion hint so student knows to select from autocomplete", () => {
  // Must display a message key that guides the user to select from suggestions
  assert.match(searchSrc, /studentLocationSelectFromSuggestions/);
});

test("teacher detail modal renders approximate distance using translation key", () => {
  // TeacherProfile must use the shared translation key (not raw toFixed)
  assert.match(teacherProfileSrc, /studentApproxDistanceFromYou/);
  assert.match(teacherProfileSrc, /formatApproxDistanceKm/);
  // Must not fall back to raw toFixed-only distance without the translation phrase
  assert.doesNotMatch(teacherProfileSrc, /displayDistanceKm\.toFixed\(1\) km/);
});

test("SearchMapView receives saved student location as initial center via userLat/userLng props", () => {
  // The map component accepts userLat/userLng props for initial centering
  assert.match(searchMapViewSrc, /userLat.*userLng|userLng.*userLat/);
  // When userLat/userLng are available at init time, centeredOnUserRef is set
  assert.match(searchMapViewSrc, /centeredOnUserRef\.current = true/);
});

test("map does not default to Montréal when saved student coordinates are available", () => {
  // The page sets geo from saved location before passing to SearchMapView
  assert.match(
    searchSrc,
    /studentLocationHasCoordinates\(parsedLocation\)[\s\S]{0,400}setGeo\(\{\s*lat:\s*parsedLocation\.lat/,
  );
  // userLat and userLng are sourced from geo state
  assert.match(searchSrc, /userLat=\{geo\?\.lat \?\? null\}/);
  assert.match(searchSrc, /userLng=\{geo\?\.lng \?\? null\}/);
  // FALLBACK_CENTER must stay as a last-resort only (present but conditioned on absence of coords)
  assert.match(searchMapViewSrc, /FALLBACK_CENTER/);
  // When the parent passes user coordinates at init time the map must use
  // them as the initial centre instead of falling back to Montréal.
  assert.match(
    searchMapViewSrc,
    /if \(userLatRef\.current != null && userLngRef\.current != null\)[\s\S]{0,200}centeredOnUserRef\.current = true/,
  );
});

test("map recenters when the saved learner origin actually changes (not on every render)", () => {
  // The recenter effect must compare against the last-applied tuple so manual
  // panning between updates is preserved, but a fresh saved address pans once.
  assert.match(searchMapViewSrc, /lastAppliedUserLatLng/);
  assert.match(
    searchMapViewSrc,
    /const changed = !last \|\| last\.lat !== userLat \|\| last\.lng !== userLng/,
  );
  assert.match(
    searchMapViewSrc,
    /if \(changed\) \{[\s\S]{0,200}map\.panTo\(\{ lat: userLat, lng: userLng \}\)/,
  );
});

test("teacher profile opened from search page receives distanceKm from search results", () => {
  // A helper must look up distanceKm from results before opening the profile
  assert.match(searchSrc, /openTeacherProfile/);
  assert.match(searchSrc, /distanceKm=\{selectedProfileDistanceKm\}/);
});

test("text-only address (no coords) does not claim distance on cards", () => {
  // The card's distance label is gated on distanceKm != null, so a stored
  // address without lat/lng produces no fake distance.
  const cardSrc = searchSrc.slice(searchSrc.indexOf("function TeacherCard"));
  assert.match(cardSrc, /distanceKm != null \? \(/);
  // The card must read distanceKm from the row, not recompute from address.
  assert.doesNotMatch(cardSrc, /haversineDistance/);
});

test("Places-unavailable hint is shown when the script cannot load", () => {
  assert.match(searchSrc, /placesUnavailable/);
  assert.match(searchSrc, /studentLocationPlacesUnavailable/);
});

console.log("[studentLocation] tests passed");
