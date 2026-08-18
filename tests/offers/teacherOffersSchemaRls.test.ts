/**
 * Static guards for migration 096: public.teacher_offers schema + RLS.
 * No live database. No Stripe/booking/UI coverage in this PR.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PRATIQO_DISCIPLINES } from "../../lib/taxonomy/disciplines";
import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_MVP_TYPES,
  TEACHER_OFFER_STATUSES,
  TEACHER_OFFER_TYPES,
  isTeacherOfferDisciplineId,
} from "../../lib/offers/types";

const ROOT = process.cwd();
const MIGRATION_REL = "supabase/migrations/096_teacher_offers_schema_rls.sql";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATION = read(MIGRATION_REL);
const CODE = stripSqlComments(MIGRATION);

test("migration creates public.teacher_offers", () => {
  assert.match(CODE, /CREATE TABLE IF NOT EXISTS public\.teacher_offers/i);
});

test("RLS is enabled", () => {
  assert.match(
    CODE,
    /ALTER TABLE(?: IF EXISTS)? public\.teacher_offers ENABLE ROW LEVEL SECURITY/i,
  );
  assert.match(
    CODE,
    /ALTER TABLE IF EXISTS public\.teacher_offers ENABLE ROW LEVEL SECURITY/i,
  );
});

test("teacher owner policies exist", () => {
  assert.match(CODE, /CREATE POLICY "teacher_offers_select_own"/);
  assert.match(CODE, /CREATE POLICY "teacher_offers_insert_own"/);
  assert.match(CODE, /CREATE POLICY "teacher_offers_update_own"/);
  assert.match(CODE, /CREATE POLICY "teacher_offers_delete_own"/);
});

test("teacher owner access is based on teachers.user_id = auth.uid()", () => {
  for (const name of [
    "teacher_offers_select_own",
    "teacher_offers_insert_own",
    "teacher_offers_update_own",
    "teacher_offers_delete_own",
  ]) {
    const block =
      CODE.match(new RegExp(`CREATE POLICY "${name}"[\\s\\S]*?;`))?.[0] ?? "";
    assert.notEqual(block, "", `${name} policy block must exist`);
    assert.match(block, /FROM public\.teachers t/);
    assert.match(block, /t\.user_id = auth\.uid\(\)/);
    assert.doesNotMatch(block, /USING\s*\(\s*created_by\s*=\s*auth\.uid\(\)\s*\)/);
  }
});

test("public read policy does not expose draft/paused/archived offers", () => {
  const block =
    CODE.match(/CREATE POLICY "teacher_offers_select_published_public"[\s\S]*?;/)?.[0] ?? "";
  assert.notEqual(block, "");
  assert.match(block, /status = 'published'/);
  assert.match(block, /published_at IS NOT NULL/);
  assert.doesNotMatch(block, /status = 'draft'/);
  assert.doesNotMatch(block, /status = 'paused'/);
  assert.doesNotMatch(block, /status = 'archived'/);
  assert.doesNotMatch(block, /USING\s*\(\s*true\s*\)/i);
});

test("public read policy requires status = published and published_at is not null", () => {
  const block =
    CODE.match(/CREATE POLICY "teacher_offers_select_published_public"[\s\S]*?;/)?.[0] ?? "";
  assert.match(block, /status = 'published'/);
  assert.match(block, /published_at IS NOT NULL/);
});

test("public read policy links to public/search-visible teacher eligibility", () => {
  const block =
    CODE.match(/CREATE POLICY "teacher_offers_select_published_public"[\s\S]*?;/)?.[0] ?? "";
  assert.match(block, /FROM public\.teachers_public tp/);
  assert.match(block, /tp\.id = teacher_offers\.teacher_id/);
});

test("no Stripe/payment/checkout/booking files changed by this PR surface", () => {
  assert.doesNotMatch(CODE, /booking_payments|stripe_|checkout|commission|refund/i);
  assert.doesNotMatch(CODE, /ALTER TABLE public\.(bookings|teachers|booking_payments)/i);
  const forbidden = [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/payments/ledger.ts",
    "lib/pricing/bookingCharge.ts",
    "components/BookingModal.tsx",
  ];
  for (const rel of forbidden) {
    const src = read(rel);
    assert.doesNotMatch(src, /teacher_offers/);
  }
});

test("no teacher_offers backfill/update of existing teacher data", () => {
  assert.doesNotMatch(CODE, /UPDATE\s+public\.teachers/i);
  assert.doesNotMatch(CODE, /INSERT\s+INTO\s+public\.teacher_offers/i);
  assert.doesNotMatch(CODE, /price_per_lesson/i);
});

test("offer_type constraint includes private_lesson, intro_session, package, assessment", () => {
  const block =
    CODE.match(/CONSTRAINT teacher_offers_offer_type_chk[\s\S]*?\)/)?.[0] ?? "";
  for (const value of TEACHER_OFFER_TYPES) {
    assert.match(block, new RegExp(`'${value}'`));
  }
  for (const value of TEACHER_OFFER_MVP_TYPES) {
    assert.match(block, new RegExp(`'${value}'`));
  }
});

test("status constraint includes draft, published, paused, archived", () => {
  const block = CODE.match(/CONSTRAINT teacher_offers_status_chk[\s\S]*?\)/)?.[0] ?? "";
  for (const value of TEACHER_OFFER_STATUSES) {
    assert.match(block, new RegExp(`'${value}'`));
  }
});

test("format constraint includes online, in_person, home, hybrid", () => {
  const block = CODE.match(/CONSTRAINT teacher_offers_format_chk[\s\S]*?\)/)?.[0] ?? "";
  for (const value of TEACHER_OFFER_FORMATS) {
    assert.match(block, new RegExp(`'${value}'`));
  }
});

test("currency constraint matches the current project-supported charge currency list", () => {
  assert.deepEqual([...TEACHER_OFFER_CURRENCIES], ["CAD"]);
  assert.match(CODE, /CONSTRAINT teacher_offers_currency_chk[\s\S]*currency = 'CAD'/);
  assert.doesNotMatch(CODE, /currency IN \('CAD',\s*'USD'/);
  assert.doesNotMatch(CODE, /'UYU'/);
});

test("price_cents constraint exists", () => {
  assert.match(CODE, /CONSTRAINT teacher_offers_price_cents_chk[\s\S]*price_cents >= 0/);
});

test("updated_at trigger exists", () => {
  assert.match(CODE, /CREATE OR REPLACE FUNCTION public\.teacher_offers_set_updated_at\(\)/i);
  assert.match(CODE, /NEW\.updated_at := now\(\)/);
  assert.match(CODE, /CREATE TRIGGER trg_teacher_offers_set_updated_at/);
  assert.match(CODE, /BEFORE UPDATE ON public\.teacher_offers/);
});

test("slug format constraint rejects spaces, uppercase, accents, underscores, and symbols", () => {
  const block =
    CODE.match(/CONSTRAINT teacher_offers_slug_format_chk[\s\S]*?;/)?.[0] ?? "";
  assert.match(block, /slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/);
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  assert.equal(pattern.test("piano-debutant"), true);
  assert.equal(pattern.test("piano debutant"), false);
  assert.equal(pattern.test("Piano"), false);
  assert.equal(pattern.test("pianó"), false);
  assert.equal(pattern.test("piano_debutant"), false);
  assert.equal(pattern.test("piano!"), false);
  assert.equal(pattern.test("-piano"), false);
  assert.equal(pattern.test("piano-"), false);
  assert.equal(pattern.test("piano--debutant"), false);
});

test("unique teacher_id+slug constraint or index exists if slug is used", () => {
  assert.match(
    CODE,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_offers_teacher_slug[\s\S]*\(teacher_id, slug\)[\s\S]*WHERE slug IS NOT NULL/i,
  );
});

test("discipline_id is constrained to taxonomy-id format", () => {
  const block =
    CODE.match(/CONSTRAINT teacher_offers_discipline_id_format_chk[\s\S]*?;/)?.[0] ?? "";
  assert.match(block, /discipline_id ~ '\^\[a-z0-9_\]\+\$'/);
  assert.match(block, /char_length\(discipline_id\) BETWEEN 1 AND 80/);
  assert.doesNotMatch(CODE, /REFERENCES public\.learning_disciplines/);
});

test("discipline_id does not store translated display labels", () => {
  assert.match(MIGRATION, /PRATIQO_DISCIPLINES/);
  assert.match(MIGRATION, /Do not store FR\/EN\/ES display labels/);
  for (const item of PRATIQO_DISCIPLINES) {
    assert.equal(
      isTeacherOfferDisciplineId(item.id),
      true,
      `taxonomy id ${item.id} must be a valid offer discipline_id`,
    );
  }
  assert.equal(isTeacherOfferDisciplineId("Français"), false);
  assert.equal(isTeacherOfferDisciplineId("Aide aux devoirs"), false);
  assert.equal(isTeacherOfferDisciplineId("Photography"), false);
  assert.equal(isTeacherOfferDisciplineId("francais"), true);
});

test("no Mes formules / formules product label introduced in new files", () => {
  const types = read("lib/offers/types.ts");
  assert.doesNotMatch(MIGRATION, /Mes formules|formules|annonces|\bads\b|classifieds/i);
  assert.doesNotMatch(types, /Mes formules|formules|annonces|\bads\b|classifieds/i);
  assert.match(MIGRATION, /Offres de cours/);
  assert.match(MIGRATION, /Mes offres de cours/);
});

test("no i18n files changed because this PR has no UI", () => {
  assert.equal(existsSync(join(ROOT, "lib/i18n/locales/fr.json")), true);
  const i18nFiles = ["lib/i18n/locales/fr.json", "lib/i18n/locales/en.json", "lib/i18n/locales/es.json"];
  for (const rel of i18nFiles) {
    const src = read(rel);
    assert.doesNotMatch(src, /teacher_offers/);
    assert.doesNotMatch(src, /mesOffresDeCours|inBriefSectionOffers/);
  }
});

test("teacher_id references public.teachers(id) as text, matching existing PK", () => {
  assert.match(
    CODE,
    /teacher_id text NOT NULL REFERENCES public\.teachers \(id\) ON DELETE CASCADE/,
  );
});

test("group class sections table is not created in this PR", () => {
  assert.doesNotMatch(
    CODE,
    /CREATE TABLE(?: IF NOT EXISTS)? public\.teacher_offer_sections/i,
  );
  assert.match(MIGRATION, /teacher_offer_sections/i);
  assert.match(MIGRATION, /Phase 11/);
});

test("rlsCoverage hardening list includes this migration", () => {
  const coverage = read("tests/security/rlsCoverage.test.ts");
  assert.match(coverage, /096_teacher_offers_schema_rls\.sql/);
});

test("new files do not sit under Stripe or search UI paths", () => {
  const files = readdirSync(join(ROOT, "supabase", "migrations")).filter((f) =>
    f.includes("teacher_offers"),
  );
  assert.deepEqual(files, ["096_teacher_offers_schema_rls.sql"]);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:teacher-offers-schema-rls] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
