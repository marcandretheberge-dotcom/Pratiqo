/**
 * PR 16A — Teacher-configurable cancellation / rescheduling preferences.
 * Capture + display + booking snapshot foundation only (no refund/credit enforcement).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_TEACHER_OFFER_POLICY_PREFERENCE,
  noticeHoursForTeacherOfferPolicyPreference,
  parseTeacherOfferPolicyPreference,
  TEACHER_OFFER_POLICY_PREFERENCES,
} from "../../lib/offers/cancellationPreferences";
import {
  formatTeacherOfferCancellationPreferenceChip,
  formatTeacherOfferReschedulePreferenceChip,
} from "../../lib/offers/display";
import {
  BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION,
  mapTeacherOfferRowToBookingSnapshot,
} from "../../lib/offers/bookingOfferSnapshot";
import {
  parseTeacherOfferCreateInput,
  parseTeacherOfferUpdateInput,
  teacherOfferCreateToInsertRow,
  teacherOfferUpdateToPatchRow,
} from "../../lib/offers/validation";
import { CLIENT_BOOKING_OFFER_SNAPSHOT_KEYS } from "../../lib/bookings/parseCreateBookingRequest";
import type { TranslationKey } from "../../lib/i18n/types";
import { t as translate } from "../../lib/translations";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATION = "supabase/migrations/105_offer_cancellation_reschedule_preferences.sql";
const t = (key: TranslationKey) => translate(key, "fr");

test("migration 105 adds offer prefs and booking snapshot columns", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /cancellation_preference/);
  assert.match(sql, /reschedule_preference/);
  assert.match(sql, /flexible[\s\S]*standard[\s\S]*strict[\s\S]*manual_review/);
  assert.match(sql, /teacher_offer_cancellation_preference_snapshot/);
  assert.match(sql, /teacher_offer_reschedule_preference_snapshot/);
  assert.match(sql, /bookings_preserve_offer_snapshot_fields/);
  assert.match(sql, /PR 16B/);
  assert.doesNotMatch(sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n"), /createRefund|application_fee/i);
});

test("preference helpers map notice hours", () => {
  assert.equal(DEFAULT_TEACHER_OFFER_POLICY_PREFERENCE, "standard");
  assert.deepEqual([...TEACHER_OFFER_POLICY_PREFERENCES], [
    "flexible",
    "standard",
    "strict",
    "manual_review",
  ]);
  assert.equal(noticeHoursForTeacherOfferPolicyPreference("flexible"), 12);
  assert.equal(noticeHoursForTeacherOfferPolicyPreference("standard"), 24);
  assert.equal(noticeHoursForTeacherOfferPolicyPreference("strict"), 48);
  assert.equal(noticeHoursForTeacherOfferPolicyPreference("manual_review"), null);
  assert.equal(parseTeacherOfferPolicyPreference("strict"), "strict");
  assert.equal(parseTeacherOfferPolicyPreference("nope"), "standard");
});

test("create defaults prefs to standard; update can change them", () => {
  const created = parseTeacherOfferCreateInput({
    title: "Piano",
    offer_type: "private_lesson",
    format: "online",
    price_cents: 4000,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.data.cancellationPreference, "standard");
  assert.equal(created.data.reschedulePreference, "standard");
  const insert = teacherOfferCreateToInsertRow(
    "teacher-1",
    "user-1",
    created.data,
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(insert.cancellation_preference, "standard");
  assert.equal(insert.reschedule_preference, "standard");

  const updated = parseTeacherOfferUpdateInput({
    cancellation_preference: "flexible",
    reschedule_preference: "strict",
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  const patch = teacherOfferUpdateToPatchRow(updated.data);
  assert.equal(patch.cancellation_preference, "flexible");
  assert.equal(patch.reschedule_preference, "strict");
});

test("create rejects invalid preference values", () => {
  const bad = parseTeacherOfferCreateInput({
    title: "Piano",
    offer_type: "private_lesson",
    format: "online",
    price_cents: 4000,
    cancellation_preference: "employer_policy",
  });
  assert.equal(bad.ok, false);
});

test("booking snapshot copies prefs and bumps version to 2", () => {
  assert.equal(BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION, 2);
  const mapped = mapTeacherOfferRowToBookingSnapshot(
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      teacher_id: "11111111-1111-4111-8111-111111111111",
      title: "Piano",
      offer_type: "private_lesson",
      format: "online",
      status: "published",
      price_cents: 5000,
      currency: "CAD",
      cancellation_preference: "strict",
      reschedule_preference: "flexible",
      published_at: "2026-08-19T12:00:00.000Z",
    },
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.snapshot.teacher_offer_cancellation_preference_snapshot, "strict");
  assert.equal(mapped.snapshot.teacher_offer_reschedule_preference_snapshot, "flexible");
  assert.equal(mapped.snapshot.teacher_offer_snapshot_version, 2);
  assert.ok(
    CLIENT_BOOKING_OFFER_SNAPSHOT_KEYS.includes(
      "teacher_offer_cancellation_preference_snapshot",
    ),
  );
});

test("builder and cards show teacher-owned preference copy", () => {
  const form = read("components/teacher/TeacherOfferForm.tsx");
  assert.match(form, /teacherOffersSectionPolicy/);
  assert.match(form, /cancellationPreference/);
  assert.match(form, /reschedulePreference/);
  assert.doesNotMatch(form, /Politique Pratiqo|Nos professeurs|Salaire|Employé/i);

  const publicCard = read("components/teacher/PublicTeacherOfferCard.tsx");
  assert.match(publicCard, /formatTeacherOfferCancellationPreferenceChip/);
  assert.match(publicCard, /formatTeacherOfferReschedulePreferenceChip/);

  assert.match(
    formatTeacherOfferCancellationPreferenceChip("standard", t) ?? "",
    /Annulation jusqu’à 24 h avant/,
  );
  assert.match(
    formatTeacherOfferReschedulePreferenceChip("manual_review", t) ?? "",
    /entente avec le professeur/,
  );
});

test("i18n preference keys avoid employer wording", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const catalog = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    for (const key of [
      "teacherOffersSectionPolicy",
      "teacherOffersPolicyHelper",
      "teacherOffersCancellationHoursChip",
      "teacherOffersCancellationManualChip",
    ]) {
      assert.equal(typeof catalog[key], "string", `${locale}:${key}`);
      assert.doesNotMatch(
        catalog[key],
        /Nos professeurs|Politique Pratiqo imposée|Salaire|Employé|Mes formules/i,
      );
    }
  }
});

test("PR 16A does not change Stripe refund or package mutation enforcement", () => {
  const helpers = read("lib/offers/cancellationPreferences.ts");
  const migration = read(MIGRATION);
  for (const src of [helpers, migration]) {
    assert.doesNotMatch(src, /createRefund|application_fee|transfer\.create/i);
    assert.doesNotMatch(src, /reverse_package_redemption|redeem_package_session/);
  }
  assert.match(helpers, /Future PR 16B/);
  assert.doesNotMatch(read("lib/bookingCancellation.ts"), /cancellationPreference|reschedulePreference/);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`fail - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  console.error(`[offers:cancellation-preferences] ${failed} failed`);
  process.exit(1);
}
console.log("[offers:cancellation-preferences] tests passed");
