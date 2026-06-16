/**
 * YoPratiqo Dominican Republic responsive layout guard.
 *
 * Keeps the intro page image-led without letting media crops or dense text
 * grids create mobile/tablet overflow. This is intentionally source-level:
 * it does not start a browser, call APIs, or touch payments/legal/data stores.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function runGit(args: string[]): string[] {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): string[] {
  return Array.from(
    new Set([
      ...runGit(["diff", "--name-only"]),
      ...runGit(["diff", "--cached", "--name-only"]),
      ...runGit(["diff", "--name-only", "origin/main...HEAD"]),
    ]),
  ).sort();
}

test("shared Yo image visual supports contain/cover without forcing all photos to crop", () => {
  const src = read("components/yo/YoImageVisual.tsx");

  assert.match(src, /type YoImageObjectFit = "cover" \| "contain"/);
  assert.match(src, /imageFit\?: YoImageObjectFit/);
  assert.match(src, /imagePosition\?: string/);
  assert.match(src, /object-contain/);
  assert.match(src, /object-cover/);
  assert.match(src, /objectPosition: imagePosition/);
});

test("Dominican map visuals are rendered with contain fit in cards and panels", () => {
  const card = read("components/yo/YoLessonCard.tsx");
  const panel = read("components/yo/YoIntroSectionPanel.tsx");

  assert.match(card, /card\.visualHint === "dominican-map"/);
  assert.match(card, /imageFit=\{shouldContainImage \? "contain" : "cover"\}/);
  assert.match(panel, /section\.visualHint === "dominican-map"/);
  assert.match(panel, /imageFit=\{shouldContainImage \? "contain" : "cover"\}/);
});

test("RD intro shell and culture panorama include overflow and wrapping safeguards", () => {
  const shell = read("components/yo/RepubliqueDominicaineContent.tsx");
  const culture = read("components/yo/YoIntroCultureFrame.tsx");
  const intro = read("components/yo/YoIntroExperience.tsx");
  const hero = read("components/yo/YoVoyageHero.tsx");

  assert.match(shell, /overflow-x-hidden/);
  assert.match(culture, /aria-labelledby="yo-culture-title"[\s\S]*?overflow-hidden/);
  assert.match(culture, /md:grid-cols-2/);
  assert.match(culture, /break-words/);
  assert.match(intro, /overflow-hidden/);
  assert.match(intro, /minmax\(0,1\.4fr\)_minmax\(0,1fr\)/);
  assert.match(hero, /order-first min-w-0/);
});

test("RD intro is the only surface opting flashcards into graded footer gating", () => {
  const flashcard = read("components/yo/YoFlashcardPreview.tsx");
  const deck = read("components/yo/YoLessonDeck.tsx");
  const intro = read("components/yo/DominicanRepublicIntroContent.tsx");
  const oldAutoplaySurfaces = [
    "components/yo/DominicanRepublicModule2Content.tsx",
    "components/yo/DominicanRepublicModule3Content.tsx",
    "components/yo/DominicanRepublicModule4Content.tsx",
    "components/yo/DominicanRepublicModule5Content.tsx",
    "app/yo/langues/espagnol/intro/page.tsx",
    "app/yo/langues/anglais/intro/page.tsx",
    "app/yo/langues/francais-quebec/intro/page.tsx",
    "app/yo/langues/italien/intro/page.tsx",
    "app/yo/langues/japonais/intro/page.tsx",
    "components/yo/YoIntroExperience.tsx",
  ];

  assert.match(flashcard, /export type YoFlashcardPreviewMode = "autoplay" \| "graded"/);
  assert.match(flashcard, /mode = "autoplay"/);
  assert.match(flashcard, /mode === "autoplay"[\s\S]{0,120}setIsAutoplay\(true\)/);
  assert.match(flashcard, /!isGradedMode \? \([\s\S]{0,240}Carousel controls/);
  assert.match(flashcard, /onCurrentCardRatedChange\?: \(rated: boolean\) => void/);
  assert.match(flashcard, /onCompleteChange\?: \(complete: boolean\) => void/);
  assert.match(flashcard, /onGradedStateChange\?: \(state: YoFlashcardGradedState\) => void/);

  assert.match(deck, /YoLessonDeckStepGateContext/);
  assert.match(deck, /variant === "reference" && referenceStepGate\.enabled && !referenceStepGate\.canAdvance/);
  assert.match(deck, /disabled=\{isLast \|\| isReferenceNextDisabled\}/);

  assert.match(intro, /id:\s*"flashcards"/);
  assert.match(intro, /<YoFlashcardPreview[\s\S]*?mode="graded"[\s\S]*?showHeader=\{false\}/);

  for (const file of oldAutoplaySurfaces) {
    assert.doesNotMatch(read(file), /mode="graded"/, `${file} must stay on the default autoplay mode`);
  }
});

test("responsive layout patch does not touch restricted systems", () => {
  // Exceptions are sibling PRs that legitimately touch a normally-forbidden
  // path. The RD responsive patch is not directly editing those files; we
  // skip them so the scope guard does not flag unrelated work that shares
  // the same merge window.
  const sharedMergeWindowExceptions = new Set([
    // V9 R02 — Membre Pro automatic-renewal consent gate.
    "app/api/stripe/pro/checkout/route.ts",
    // Membre Pro subscription-management proof PR webhook touch-up.
    "app/api/stripe/webhook/route.ts",
    // Booking-time YoPratiqo teacher-bridge consent PR. Adds a narrow API
    // route, a dedicated Supabase table with strict student-only-write RLS,
    // and the +1 line in 074's explicit ENABLE list. Defended by
    // tests/yo/yopratiqoTeacherBridgeBookingConsent.test.ts and
    // tests/security/bookingYopratiqoSummariesRls.test.ts.
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
    // promo into the live booking/payout amount calculation. The
    // change is purely additive: helpers gain an optional `founderPromo`
    // input that defaults to `null` (legacy plan-only behavior), and
    // the two server-side amount-creating call-sites (Stripe checkout
    // route + booking-success idempotent fallback) load the snapshot
    // through the existing service-role admin client. No Stripe API
    // surface change. Defended by
    // tests/payments/founderPromoLiveCommission.test.ts.
    "lib/payments/amounts.ts",
    "lib/payments/payoutPreview.ts",
    "lib/pricing/hourlyRatePreview.ts",
    "app/api/stripe/checkout/route.ts",
    "app/(app)/booking/success/page.tsx",
  ]);
  const forbidden = [
    /^app\/api\//,
    /^content\/legal\//,
    /^app\/\(app\)\/legal\//,
    /^lib\/payments\//,
    /^lib\/stripe/i,
    /^supabase\//,
    /^app\/sitemap\.ts$/,
    /^app\/robots\.ts$/,
    /^lib\/seo\//,
    /^scripts\/generate-yopratiqo-audio/i,
    /^public\/.*\.(mp3|wav|m4a)$/i,
  ];

  for (const file of changedFiles()) {
    const normalized = file.replace(/\\/g, "/");
    if (sharedMergeWindowExceptions.has(normalized)) continue;
    assert.ok(
      !forbidden.some((pattern) => pattern.test(normalized)),
      `restricted file changed by RD responsive patch: ${file}`,
    );
  }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error((error as Error).message);
    }
  }
  console.log(`\n${tests.length - failed} / ${tests.length} passed`);
  if (failed > 0) process.exitCode = 1;
})();
