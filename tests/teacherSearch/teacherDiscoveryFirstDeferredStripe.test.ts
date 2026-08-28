import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateTeacherDiscovery } from "@/lib/teachers/teacherDiscovery";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

test("minimal teacher profile with a discipline is discoverable and requestable", () => {
  const result = evaluateTeacherDiscovery({
    profile: { role: "teacher", is_active: true },
    teacher: {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: false,
      marketplace_discovery_opt_out: false,
      discipline: "piano",
      deactivated_at: null,
      deleted_at: null,
    },
    disciplineCount: 1,
  });

  assert.equal(result.discoverable, true);
  assert.equal(result.requestable, true);
  assert.equal(result.bookable, false);
  assert.equal(result.status, "profile_incomplete");
  assert.deepEqual(result.hiddenReasons, []);
});

test("teacher with marketplace opt-out is not discoverable", () => {
  const result = evaluateTeacherDiscovery({
    profile: { role: "teacher", is_active: true },
    teacher: {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: false,
      marketplace_discovery_opt_out: true,
      discipline: "piano",
      deactivated_at: null,
      deleted_at: null,
    },
    disciplineCount: 1,
  });

  assert.equal(result.discoverable, false);
  assert.equal(result.status, "hidden");
  assert.equal(result.hiddenReasons.includes("marketplace_opted_out"), true);
});

test("teacher without a discipline is not discoverable", () => {
  const result = evaluateTeacherDiscovery({
    profile: { role: "teacher", is_active: true },
    teacher: {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: true,
      discipline: "",
      category: "",
    },
    disciplineCount: 0,
  });

  assert.equal(result.discoverable, false);
  assert.equal(result.requestable, false);
  assert.equal(result.bookable, false);
  assert.equal(result.status, "hidden");
  assert.equal(result.hiddenReasons.includes("missing_discipline"), true);
});

test("payment readiness changes bookable status only, not discoverability", () => {
  const result = evaluateTeacherDiscovery({
    profile: { role: "teacher", is_active: true },
    teacher: {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      discipline: "espagnol",
      profile_complete: true,
      payment_ready: true,
    },
    disciplineCount: 1,
  });

  assert.equal(result.discoverable, true);
  assert.equal(result.requestable, true);
  assert.equal(result.bookable, true);
  assert.equal(result.status, "bookable");
});

test("migration creates no-payment teacher booking requests with RLS", () => {
  assert.equal(
    existsSync(join(ROOT, "supabase/migrations/125_teacher_discovery_first_visibility.sql")),
    true,
  );
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.teacher_booking_requests/i);
  assert.match(migration, /No-payment learner interest requests/i);
  assert.match(migration, /ALTER TABLE IF EXISTS public\.teacher_booking_requests ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /GRANT SELECT ON public\.teacher_booking_requests TO authenticated/i);
  assert.match(migration, /GRANT ALL ON public\.teacher_booking_requests TO service_role/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_booking_requests_open_unique/i);
  assert.match(migration, /COALESCE\(learner_profile_id/i);
});

test("public teacher view no longer requires profile completion or Stripe readiness", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));

  assert.doesNotMatch(migration, /WHERE[\s\S]*t\.is_public\s*=\s*true/i);
  assert.doesNotMatch(migration, /NULLIF\(BTRIM\(t\.bio\), ''\) IS NOT NULL/i);
  assert.doesNotMatch(migration, /t\.price_per_lesson\s*>\s*0/i);
  assert.doesNotMatch(migration, /UPPER\(BTRIM\(COALESCE\(t\.country_code, ''\)\)\)\s*=\s*'CA'/i);
  assert.doesNotMatch(migration, /stripe_account_id|stripe_connect_onboarding_complete|stripe_connect_charges_enabled|stripe_connect_payouts_enabled/i);
  assert.match(migration, /FROM public\.teacher_disciplines td/i);
});

test("public teacher projection still strips private payment and location details", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  const returnBlock = migration.match(/RETURNS TABLE \(([\s\S]*?)\)\s+LANGUAGE/i)?.[1] ?? "";
  const selectBlock = migration.match(/AS \$\$\s+SELECT([\s\S]*?)FROM public\.teachers t/i)?.[1] ?? "";

  assert.doesNotMatch(returnBlock, /stripe_/i);
  assert.doesNotMatch(returnBlock, /identity_verified_manually/i);
  assert.doesNotMatch(selectBlock, /stripe_account_id|stripe_connect_/i);
  assert.match(selectBlock, /COALESCE\(t\.location, '\{\}'::jsonb\) - 'private'::text AS location/i);
});

test("booking API creates deferred requests before pending paid bookings", () => {
  const route = read("app/api/bookings/route.ts");
  const deferIdx = route.indexOf("teacher_booking_requests");
  const bookingIdx = route.indexOf("const created = await createPendingPaymentBooking");
  const stripeIdx = route.indexOf("/api/stripe/checkout");

  assert.ok(deferIdx > -1, "expected teacher_booking_requests path");
  assert.ok(bookingIdx > -1, "expected existing paid booking path");
  assert.ok(deferIdx < bookingIdx, "deferred request must happen before paid booking creation");
  assert.equal(stripeIdx, -1, "booking API must not call Stripe checkout directly");
  assert.match(route, /teacher_payment_setup_required/);
  assert.match(route, /teacher_profile_setup_required/);
  assert.match(route, /validateMinimumLessonPriceDollars/);
  assert.match(route, /status: 202/);
});

test("booking modal handles deferred request without continuing to Stripe checkout", () => {
  const modal = read("components/BookingModal.tsx");
  const deferredIdx = modal.indexOf("createRes.status === 202");
  const stripeIdx = modal.indexOf('fetch("/api/stripe/checkout"');

  assert.ok(deferredIdx > -1, "expected deferred response handling");
  assert.ok(stripeIdx > -1, "expected existing Stripe checkout path to remain");
  assert.ok(deferredIdx < stripeIdx, "deferred response must return before checkout fetch");
  assert.match(modal, /deferredRequestSent/);
  assert.match(modal, /bookingSendRequest/);
  assert.match(modal, /bookingDeferredRequestNoPaymentNote/);
});

test("teacher request email uses existing email infrastructure", () => {
  const email = read("lib/email/templates/teacherDiscovery.ts");
  const profileEmail = read("lib/email/templates/teacherProfileImprovement.ts");
  const exportsFile = read("lib/email.ts");

  assert.match(email, /buildEmail/);
  assert.match(email, /send\(/);
  assert.match(email, /payment setup/i);
  assert.match(email, /dashboard/);
  assert.match(email, /Un apprenant veut réserver un cours avec vous/);
  assert.match(email, /This request is not a paid booking/);
  assert.match(profileEmail, /Your profile is now visible/);
  assert.match(profileEmail, /Stripe[\s\S]*paid booking/);
  assert.match(exportsFile, /sendTeacherProfileImprovementEmail/);
  assert.match(exportsFile, /sendTeacherBookingRequestEmail/);
});

test("search cards do not display zero-dollar placeholder pricing", () => {
  const searchPage = read("app/(app)/student/search/page.tsx");
  const mapper = read("lib/teacherMapper.ts");

  assert.match(searchPage, /teacherDiscoveryPricePending/);
  assert.match(mapper, /pricePerLesson: Number\.isFinite\(pricePerLesson\) && pricePerLesson > 0 \? pricePerLesson : 0/);
});

test("restricted payment systems are not modified by this branch", () => {
  const statusFixture = read("app/api/bookings/route.ts");
  assert.doesNotMatch(statusFixture, /STRIPE_SECRET_KEY|stripe\.checkout|payment_intent|transfer_group|commission/i);
});

function extractDiscoveryWhereClause(sql: string): string {
  const normalized = stripSqlComments(sql);
  const match = normalized.match(
    /FROM public\.teachers t\s+INNER JOIN public\.profiles p ON p\.id = t\.user_id\s+WHERE([\s\S]*?)\)\s+AS discovered;/i,
  );
  return match?.[1]?.trim() ?? "";
}

test("migration 126 restores list_public_teachers and teachers_public", () => {
  assert.equal(
    existsSync(join(ROOT, "supabase/migrations/126_restore_list_public_teachers.sql")),
    true,
  );
  const migration = stripSqlComments(read("supabase/migrations/126_restore_list_public_teachers.sql"));

  assert.match(migration, /DROP VIEW IF EXISTS public\.teachers_public/i);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.list_public_teachers\(\)/i);
  assert.match(migration, /CREATE FUNCTION public\.list_public_teachers\(\)/i);
  assert.match(migration, /CREATE VIEW public\.teachers_public[\s\S]*security_invoker\s*=\s*true/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.list_public_teachers\(\) TO anon/i);
  assert.match(migration, /GRANT SELECT ON public\.teachers_public TO anon/i);
  assert.match(migration, /CREATE POLICY "teacher_offers_select_published_public"/i);
});

test("migration 126 keeps discovery-first gates and fixes the broken 125 UUID regex", () => {
  const migration = stripSqlComments(read("supabase/migrations/126_restore_list_public_teachers.sql"));
  const whereClause = extractDiscoveryWhereClause(migration);

  assert.match(
    migration,
    /t\.id\s+~\* '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$'/i,
  );
  assert.doesNotMatch(
    migration,
    /t\.id\s+~\* '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$'/i,
  );
  assert.doesNotMatch(whereClause, /t\.is_public\s*=\s*true/i);
  assert.doesNotMatch(whereClause, /t\.price_per_lesson\s*>\s*0/i);
  assert.doesNotMatch(whereClause, /NULLIF\(BTRIM\(t\.bio\), ''\) IS NOT NULL/i);
  assert.doesNotMatch(whereClause, /stripe_account_id|stripe_connect_/i);
  assert.match(whereClause, /p\.role\s*=\s*'teacher'/i);
  assert.match(whereClause, /FROM public\.teacher_disciplines td/i);
  assert.match(whereClause, /COALESCE\(t\.identity_status, 'none'\) <> 'failed'/i);
});

test("migration 126 public projection still strips private payment and location details", () => {
  const migration = stripSqlComments(read("supabase/migrations/126_restore_list_public_teachers.sql"));
  const returnBlock = migration.match(/RETURNS TABLE \(([\s\S]*?)\)\s+LANGUAGE/i)?.[1] ?? "";
  const selectBlock =
    migration.match(/FROM \(\s+SELECT([\s\S]*?)FROM public\.teachers t/i)?.[1] ?? "";

  assert.doesNotMatch(returnBlock, /stripe_/i);
  assert.doesNotMatch(returnBlock, /identity_verified_manually/i);
  assert.doesNotMatch(selectBlock, /stripe_account_id|stripe_connect_/i);
  assert.match(selectBlock, /COALESCE\(t\.location, '\{\}'::jsonb\) - 'private'::text AS location/i);
});

test("migration 126 inline discovery WHERE mirrors the function body filters", () => {
  const migration126 = stripSqlComments(read("supabase/migrations/126_restore_list_public_teachers.sql"));
  const migration125 = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  const where126 = extractDiscoveryWhereClause(migration126);
  const where125 =
    migration125
      .match(/FROM public\.teachers t\s+INNER JOIN public\.profiles p ON p\.id = t\.user_id\s+WHERE([\s\S]*?);/i)?.[1]
      ?.trim() ?? "";

  assert.notEqual(where126, "");
  assert.notEqual(where125, "");
  assert.notEqual(where126, where125);
  assert.match(where126, /\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/i);
  assert.doesNotMatch(where125, /\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/i);

  for (const predicate of [
    "t.deactivated_at IS NULL",
    "p.role = 'teacher'",
    "COALESCE(t.is_demo, false) = false",
    "FROM public.teacher_disciplines td",
    "COALESCE(t.identity_status, 'none') <> 'failed'",
  ]) {
    assert.match(where126, new RegExp(predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(where125, new RegExp(predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("migration 127 adds marketplace opt-out columns and gate without reintroducing publication gates", () => {
  assert.equal(
    existsSync(join(ROOT, "supabase/migrations/127_teacher_marketplace_discovery_opt_out.sql")),
    true,
  );
  const migration = stripSqlComments(read("supabase/migrations/127_teacher_marketplace_discovery_opt_out.sql"));
  const whereClause = extractDiscoveryWhereClause(migration);

  assert.match(migration, /marketplace_discovery_opt_out boolean NOT NULL DEFAULT false/i);
  assert.match(migration, /marketplace_discovery_opt_out_at timestamptz NULL/i);
  assert.match(migration, /admin_role_change_audit/i);
  assert.match(migration, /teacher_seo_hide_marketplace%/i);
  assert.match(migration, /profile-remove-public-teacher%/i);
  assert.match(whereClause, /COALESCE\(t\.marketplace_discovery_opt_out, false\) = false/i);
  assert.doesNotMatch(whereClause, /t\.is_public\s*=\s*true/i);
  assert.doesNotMatch(whereClause, /t\.price_per_lesson/i);
  assert.match(
    migration,
    /t\.id\s+~\* '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$'/i,
  );
});

test("dashboard and docs document discovery-first lifecycle without exposing secrets", () => {
  const dashboardCard = read("components/dashboard/teacher/TeacherProfileStatusCard.tsx");
  const adminOverview = read("lib/admin/overview.ts");
  const adminPage = read("app/(app)/admin/page.tsx");
  const docs = read("docs/product/teacher-discovery-first.md");

  assert.match(dashboardCard, /teacherDashDiscoveryFirstVisibleBody/);
  assert.match(dashboardCard, /teacherDashDiscoveryFirstStripeBody/);
  assert.match(adminOverview, /teachersHiddenNoDiscipline/);
  assert.match(adminOverview, /teachersVisiblePaymentSetupRequired/);
  assert.match(adminOverview, /teachersBookable/);
  assert.match(adminPage, /Visibles mais paiement à configurer/);
  assert.match(docs, /must not charge the learner before the teacher can receive money/i);
  assert.doesNotMatch(docs, /stripe_account_id|service_role/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherSearch:teacherDiscoveryFirstDeferredStripe] ${tests.length} tests passed`);
