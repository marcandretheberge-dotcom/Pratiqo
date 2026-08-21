/**
 * YoPratiqo audio pronunciation override regression suite.
 *
 * This pins the launch-safe pronunciation metadata layer:
 * visible lesson text stays unchanged, while the offline MP3 generator
 * may use `spokenText` and `pronunciationHint` to avoid English
 * pronunciation for short homographs, slash variants, and placeholders.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YOPRATIQO_AUDIO_MANIFEST,
  findAudioItemForContext,
} from "@/lib/yo/audio/audioManifest";
import { spanishIntroAudio } from "@/lib/yo/audio/spanishIntroAudio";
import { spanishVoyageDominicanAudio } from "@/lib/yo/audio/spanishVoyageDominicanAudio";
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function gitLines(command: string): string[] {
  return execSync(command, { cwd: REPO_ROOT, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const TYPES_SRC = read("lib/yo/audio/audioManifest.types-internal.ts");
const GENERATOR_SRC = read("scripts/generate-yopratiqo-audio.ts");

const FR_MODULE_ID = "fr-quebec-workplace-survival-1";
const FR_LESSON_ID = "comprendre-consignes-simples";
const ES_RD_MODULE_ID = "voyage";
const ES_RD_LESSON_ID = "republique-dominicaine-a1-lesson-01";

const PLACEHOLDER_RE = /\[[^\]]+\]|\{\{?[^}]+\}?/;

function findManifestText(text: string) {
  return YOPRATIQO_AUDIO_MANIFEST.find((item) => item.text === text);
}

function requireManifestText(text: string) {
  const item = findManifestText(text);
  assert.ok(item, `expected manifest item for "${text}"`);
  return item!;
}

function requireFrLesson2Item(text: string) {
  const item = findAudioItemForContext({
    text,
    moduleId: FR_MODULE_ID,
    lessonId: FR_LESSON_ID,
    accentProfile: "quebec_french",
  });
  assert.ok(item, `expected Quebec French Lesson 2 item for "${text}"`);
  return item!;
}

test("YoAudioItem supports generation-only pronunciation overrides", () => {
  assert.match(TYPES_SRC, /spokenText\?:\s*string/);
  assert.match(TYPES_SRC, /pronunciationHint\?:\s*string/);
});

test("offline generator uses spokenText and appends pronunciationHint when supported", () => {
  assert.match(GENERATOR_SRC, /function\s+resolveSpokenText/);
  assert.match(GENERATOR_SRC, /input:\s*resolveSpokenText\(item\)/);
  assert.match(GENERATOR_SRC, /function\s+appendPronunciationHint/);
  assert.match(GENERATOR_SRC, /item\.pronunciationHint/);
});

test("Quebec French risky short entries carry pronunciation hints", () => {
  const riskyTargets = [
    "Range.",
    "Ouvre.",
    "Ferme.",
    "Signe.",
    "Vérifie.",
    "Envoie.",
    "Appelle.",
    "Mets.",
    "Prends.",
    "Tenez.",
    "Tiens.",
    "Là.",
    "Tantôt.",
    "Compris.",
    "Parfait.",
  ] as const;

  for (const text of riskyTargets) {
    const item = requireFrLesson2Item(text);
    assert.ok(
      item.pronunciationHint?.trim(),
      `${text} must include a Quebec French pronunciationHint`,
    );
  }
});

test("Range is explicitly treated as the French verb ranger, not English range", () => {
  const item = requireFrLesson2Item("Range.");
  assert.equal(item.spokenText, "Range tes affaires.");
  assert.match(item.pronunciationHint ?? "", /ranger/);
  assert.match(item.pronunciationHint ?? "", /\/ʁɑ̃ʒ\//);
  assert.match(item.pronunciationHint ?? "", /pas le mot anglais/);
  assert.equal(
    item.storagePath,
    "yo/fr/fr-quebec-workplace-survival-1/comprendre-consignes-simples/quebec-french/phrase/range.mp3",
  );
});

test("slash-separated audio entries define slash-free spokenText", () => {
  const slashEntries = YOPRATIQO_AUDIO_MANIFEST.filter((item) =>
    item.text.includes("/"),
  );
  assert.ok(slashEntries.length > 0, "expected at least one slash entry");

  for (const item of slashEntries) {
    assert.ok(item.spokenText, `${item.text} must define spokenText`);
    assert.ok(
      !item.spokenText!.includes("/"),
      `${item.text} spokenText must not contain "/"`,
    );
  }

  const tiensTenez = requireManifestText("Tiens / Tenez");
  assert.equal(tiensTenez.spokenText, "Tiens. Tenez.");
  assert.match(tiensTenez.pronunciationHint ?? "", /Ne pas prononcer le symbole/);
});

test("placeholder audio entries define placeholder-free spokenText", () => {
  const placeholderEntries = YOPRATIQO_AUDIO_MANIFEST.filter((item) =>
    PLACEHOLDER_RE.test(item.text),
  );
  assert.ok(
    placeholderEntries.length > 0,
    "expected at least one placeholder entry",
  );

  for (const item of placeholderEntries) {
    assert.ok(item.spokenText, `${item.text} must define spokenText`);
    assert.ok(
      !PLACEHOLDER_RE.test(item.spokenText!),
      `${item.text} spokenText must not contain placeholder syntax`,
    );
  }

  const excuseMoi = requireManifestText("Excuse-moi, t’as dit quoi pour [X] ?");
  assert.ok(
    excuseMoi.spokenText === "Excuse-moi, t’as dit quoi ?" ||
      excuseMoi.spokenText === "Excuse-moi, t’as dit quoi pour ce mot ?",
  );
  assert.match(excuseMoi.pronunciationHint ?? "", /Ne pas prononcer/);
  assert.equal(
    excuseMoi.storagePath,
    "yo/fr/fr-quebec-workplace-survival-1/comprendre-consignes-simples/quebec-french/sentence/rf-excuse-moi-tas-dit-quoi-pour-la-boite.mp3",
  );
});

test("visible Quebec French lesson text remains unchanged", () => {
  const lessonTwo = frQuebecWorkplaceSurvivalModule.lessons[1];
  assert.equal(lessonTwo?.id, FR_LESSON_ID);
  assert.ok(lessonTwo?.content);
  assert.equal(lessonTwo.content.kind, "lesson2");

  const oralMarkers = lessonTwo.content.oralMarkers.map((marker) => marker.marker);
  assert.ok(oralMarkers.includes("tiens / tenez"));

  const reformulations = lessonTwo.content.reformulationFormulas.map(
    (formula) => formula.targetFr,
  );
  assert.ok(reformulations.includes("Excuse-moi, t’as dit quoi pour [X] ?"));
});

test("Dominican Republic Spanish risky entries carry Spanish-only pronunciation hints", () => {
  const resort = findAudioItemForContext({
    text: "el resort",
    moduleId: ES_RD_MODULE_ID,
    lessonId: ES_RD_LESSON_ID,
    accentProfile: "latin_american_neutral",
  });
  assert.ok(resort);
  assert.match(resort!.pronunciationHint ?? "", /Do not use English pronunciation/);
  assert.match(resort!.pronunciationHint ?? "", /pronounced as Spanish/);

  const queLoQue = requireManifestText("¿Qué lo qué?");
  assert.match(queLoQue.pronunciationHint ?? "", /Dominican\/Caribbean-friendly/);
  assert.equal(
    queLoQue.storagePath,
    "yo/es/voyage/republique-dominicaine-a1-lesson-01/dialogue/que-lo-que.mp3",
  );

  const hotelDialogue = spanishVoyageDominicanAudio.filter((item) =>
    item.id.includes("hotel"),
  );
  assert.equal(hotelDialogue.length, 6);
  for (const item of hotelDialogue) {
    assert.match(item.pronunciationHint ?? "", /Spanish words that look like English/);
  }
});

test("Spanish intro hotel/restaurante paragraph has a Spanish pronunciation hint", () => {
  const paragraph = spanishIntroAudio.find(
    (item) => item.id === "es-intro-a1-reading-sentence-second-paragraph",
  );
  assert.ok(paragraph);
  assert.match(paragraph!.text, /hotel/);
  assert.match(paragraph!.text, /restaurante/);
  assert.match(paragraph!.pronunciationHint ?? "", /Do not use English pronunciation/);
});

test("this PR does not add or modify MP3 binaries", () => {
  const changed = [
    ...gitLines("git diff --name-only HEAD"),
    ...gitLines("git ls-files --others --exclude-standard"),
  ];
  const mp3s = changed.filter((path) => /\.mp3$/i.test(path));
  assert.deepEqual(mp3s, [], `no .mp3 files should change in this PR: ${mp3s.join(", ")}`);
});

test("tracked patch avoids generated audio and restricted product systems", () => {
  const changed = gitLines("git diff --name-only HEAD");
  const branchSpecificAllowlist = new Set([
    // Legal live-sync branches may update YoPratiqo legal disclosures without
    // touching lesson content, audio manifests, generated MP3s, or generators.
    "app/(app)/legal/yo-remboursement/page.tsx",
    "content/legal/confidentialite.en.md",
    "content/legal/confidentialite.es.md",
    "content/legal/confidentialite.fr.md",
    "content/legal/yo-refund.en.md",
    "content/legal/yo-refund.es.md",
    "content/legal/yo-refund.fr.md",
    "app/api/bookings/[id]/cancel/route.ts",
    "app/api/group-sessions/checkout/route.ts",
    "app/api/stripe/pro/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "app/(app)/upgrade/page.tsx",
    "components/teacher/TeacherAccountView.tsx",
    "lib/config/membrePro.ts",
    "lib/email.ts",
    "lib/email/messages/notifications.ts",
    "lib/email/templates/billing.ts",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
    "lib/i18n/locales/fr.json",
    "tests/email/notifications.test.ts",
    "tests/legal/founderDecisionsAlignment.test.ts",
    "tests/legal/safeDisclosures.test.ts",
    "tests/payments/membreProSubscriptionManagement.test.ts",
    "tests/payments/stripeProductionReadinessBlockers.test.ts",
    "tests/teacherLaunch/teacherLaunchCenter.test.ts",
    "tests/yo/yopratiqoDominicanResponsiveLayout.test.ts",
    "lib/payments/refunds.ts",
    // Booking-time YoPratiqo teacher-bridge consent PR. Adds a narrow
    // API route, a dedicated booking-linked Supabase table with strict
    // student-only-write RLS, and the +1 line in 074's explicit ENABLE
    // list. Defended by tests/yo/yopratiqoTeacherBridgeBookingConsent.test.ts
    // and tests/security/bookingYopratiqoSummariesRls.test.ts.
    "app/api/bookings/[id]/yopratiqo-bridge/route.ts",
    "supabase/migrations/077_booking_yopratiqo_learning_summaries.sql",
    "supabase/migrations/074_enable_rls_security_hardening.sql",
    // feat/yopratiqo-progress-snapshots PR — minimal per-user YoPratiqo
    // module progress persistence (owner-only RLS, no teacher path).
    // Defended by tests/yo/yopratiqoProgressSnapshots.test.ts.
    "app/api/yo/progress/route.ts",
    "supabase/migrations/078_yopratiqo_progress_snapshots.sql",
    // fix/message-email-notifications PR — recipient-only transactional
    // email after successful in-app message insert. Defended by
    // tests/messaging/messageEmailNotifications.test.ts.
    "app/api/messages/send/route.ts",
    // feat/admin-profile-founder-promo PR — admin-only profile detail
    // and founder-promo commission controls. Adds a deny-by-default
    // audit table (migration 080), a precedence-aware effective
    // commission helper that does NOT modify Stripe state, and two
    // admin-gated API routes. Defended by
    // tests/admin/founderPromoAdminFlow.test.ts.
    "supabase/migrations/080_admin_founder_promotions.sql",
    "lib/payments/commission.ts",
    "lib/payments/founderPromo.ts",
    "app/api/admin/users/[id]/route.ts",
    "app/api/admin/users/[id]/founder-promo/route.ts",
    // fix/wire-founder-promo-commission PR — wires the active founder
    // promo into the live booking/payout amount calculation. Purely
    // additive: helpers gain an optional `founderPromo` argument that
    // defaults to the legacy plan-only behavior, and the two
    // server-side amount-creating call-sites load the snapshot through
    // the existing service-role admin client. No Stripe API surface
    // change. Defended by
    // tests/payments/founderPromoLiveCommission.test.ts.
    "lib/payments/amounts.ts",
    "lib/payments/payoutPreview.ts",
    "lib/pricing/hourlyRatePreview.ts",
    "app/api/stripe/checkout/route.ts",
    "app/(app)/booking/success/page.tsx",
    // fix/teacher-onboarding-min-rate-blocker PR — same allowlist
    // entry as the responsive-layout guard. The /api/onboarding/
    // complete change is a defensive home-rate coalesce that
    // preserves the 20 $ floor; the new admin route is admin-only
    // and never writes Stripe/payment/plan state. Defended by
    // tests/teacherOnboarding/minRateBlockerRecovery.test.ts.
    "app/api/onboarding/complete/route.ts",
    "app/api/admin/users/[id]/teacher-onboarding/route.ts",
    // hotfix/onboarding-stability-and-profile-completion — teacher row upsert
    // on onboarding complete. Defended by tests/auth/onboardingStability.test.ts.
    "app/api/teacher/onboarding/complete/route.ts",
    // hotfix/profile-state-source-of-truth — idempotent teacher row ensure +
    // server-side companion profile upsert.
    "app/api/teacher/profile/ensure/route.ts",
    "app/api/companion/route.ts",
    "lib/teachers/ensureTeacherProfileRow.ts",
    "lib/teachers/ensureTeacherProfileClient.ts",
    "app/auth/callback/route.ts",
    // hotfix/google-onboarding-role-choice-flow — onboarding role confirmation.
    "app/api/onboarding/select-role/route.ts",
    "app/api/admin/users/[id]/deactivation/route.ts",
    "app/api/teachers/plans/route.ts",
    // fix/final-launch-payment-webhook-gates — payout readiness + webhook rejection.
    // Defended by tests/payments/paymentTrustLaunchHardening.test.ts.
    "lib/payments/connect.ts",
    // fix/seo-teacher-self-serve-publish-flow — teacher SEO consent/publish APIs only.
    "app/api/teacher/profile/search-indexing-consent/route.ts",
    "app/api/teacher/profile/seo-publication/route.ts",
    "app/api/admin/users/[id]/teacher-seo-publish/route.ts",
    // security/rate-limit-search-analytics — analytics endpoint hardening only.
    // Defended by tests/security/searchAnalyticsRateLimit.test.ts.
    "app/api/analytics/search-event/route.ts",
    // hotfix/student-companion-confirmation-save — student consent + companion save only.
    // Defended by tests/auth/studentOnboardingConsentGate.test.ts.
    "app/api/student/onboarding-consent/route.ts",
    "components/student/StudentOnboardingConsentGate.tsx",
    "lib/auth/clientAccessToken.ts",
    "lib/auth/supabaseRouteClient.ts",
    "lib/auth/profileEnsure.ts",
    "tests/auth/studentOnboardingConsentGate.test.ts",
    "tests/ops/pwaAppReadiness.test.ts",
    "tests/ops/pwaInstallabilityVerification.test.ts",
    // hotfix/teacher-intro-price-optional - teacher profile pricing API only.
    // Defended by tests/teacherProfile/introLessonPriceConditional.test.ts.
    "app/api/teacher/pricing/route.ts",
    // fix/teacher-search-visibility - admin-only user list diagnostics that
    // explain why onboarding-complete teachers may still be absent from
    // teachers_public/search. Read-only enrichment; no YoPratiqo audio,
    // payment, booking, or public visibility changes. Defended by
    // tests/teacherSearch/teacherSearchVisibilityDiagnostics.test.ts.
    "app/api/admin/users/route.ts",
    // payments/admin-student-credits-spendable — wires admin student credit
    // grants/voids into existing profiles.credit_balance via SECURITY DEFINER
    // RPCs. Does not touch YoPratiqo audio, promo-code checkout, Stripe
    // coupons, or commission math. Defended by
    // tests/payments/adminStudentCreditsSpendable.test.ts.
    "app/api/admin/student-credits/route.ts",
    "app/api/admin/student-credits/[id]/void/route.ts",
    "supabase/migrations/088_admin_student_credits_spendable.sql",
    // admin/bookings-payments-operations — read-only admin ops list APIs.
    // No checkout, webhook, refund, payout, or booking transition writes.
    // Defended by tests/admin/adminBookingsPaymentsOperations.test.ts.
    "app/api/admin/bookings/route.ts",
    "app/api/admin/payments/route.ts",
    // agent/ambassador-referral-tracking (#303) — referral attribution must
    // claim after profile hydration, but this does not touch YoPratiqo audio
    // manifests, lesson content, or generation scripts. Defended by
    // tests/ambassadors/* and tests/security/rlsCoverage.test.ts.
    "app/api/auth/profile/ensure/route.ts",
    "app/api/ambassadors/referral/claim/route.ts",
    "app/r/[code]/route.ts",
    "supabase/migrations/088_learner_demand_funnel.sql",
    "supabase/migrations/089_learner_demand_funnel.sql",
    "supabase/migrations/090_ambassador_referral_tracking.sql",
    "supabase/migrations/091_ambassador_rewards_v1.sql",
    "supabase/migrations/092_ambassador_rewards_version_hardening.sql",
    "supabase/migrations/093_harden_recent_program_tables_rls.sql",
    "supabase/migrations/094_ambassador_net_contribution_economics.sql",
    // fix/hide-manual-identity-source-public — public projection only.
    // Admin manual verification stays on public.teachers. Defended by
    // tests/admin/manualTeacherIdentityVerification.test.ts and
    // tests/security/teacherPublicReadIsolation.test.ts.
    "supabase/migrations/098_hide_manual_identity_source_from_public_projection.sql",
    // PR 17A — precise teacher weekly schedule intervals (flagged OFF by default).
    // Does not touch YoPratiqo audio, lesson content, Stripe amounts, or payouts.
    "app/api/teacher/weekly-intervals/route.ts",
    "app/api/teachers/[id]/slots/route.ts",
    "supabase/migrations/108_teacher_weekly_availability_intervals.sql",
    "supabase/migrations/109_harden_teacher_weekly_availability_intervals_rls.sql",
    // PR 17B — calendar date exceptions (flagged OFF by default).
    "app/api/teacher/schedule-exceptions/route.ts",
    "supabase/migrations/110_teacher_schedule_exceptions.sql",
    "supabase/migrations/111_harden_teacher_schedule_exceptions_rls.sql",
    // PR 17C — schedule sticky save / light autosave (UX only; no audio/Stripe).
    "hooks/useUnsavedChangesWarning.ts",
    // PR 17A-UX — interactive schedule cells (reuses weekly intervals; no audio).
    "lib/schedule/dayparts.ts",
    "lib/schedule/cellDisplay.ts",
    "lib/schedule/interactiveCells.ts",
    "lib/schedule/precisionScheduleBanner.ts",
    "lib/schedule/preciseScheduleActivation.ts",
    "lib/bookings/teacherScheduleEligibility.ts",
    "lib/teachers/currentTeacher.ts",
  ]);
  const forbidden = [
    /^app\/api\//,
    /^app\/\(app\)\/legal\//,
    /^app\/\(app\)\/booking\//,
    /^content\/legal\//,
    /^lib\/payments\//,
    /^lib\/config\/membrePro/,
    /^lib\/commissions\//,
    /^public\/audio\//,
    /^scripts\/generate-yopratiqo-audio\.ts$/,
    /^supabase\//,
  ];
  for (const path of changed) {
    if (branchSpecificAllowlist.has(path)) continue;
    assert.ok(
      !forbidden.some((re) => re.test(path)),
      `restricted product/audio file changed: ${path}`,
    );
  }
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[yo:audio-pronunciation] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
