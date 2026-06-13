import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MEMBRE_PRO_CONSENT_VERSION,
  MEMBRE_PRO_PLAN,
  UPGRADE_PAGE_COPY,
} from "@/lib/config/membrePro";
import { buildProCancellationEmail, buildProUpgradeEmail } from "@/lib/email/templates/billing";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function changedFiles(): string[] {
  const files = new Set<string>();
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    for (const args of [
      ["diff", "--name-only", mergeBase, "HEAD"],
      ["diff", "--name-only"],
      ["diff", "--cached", "--name-only"],
    ]) {
      execFileSync("git", args, { cwd: root, encoding: "utf8" })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }
  } catch {
    return [];
  }
  return [...files].sort();
}

const upgradePageSrc = read("app/(app)/upgrade/page.tsx");
const proCheckoutSrc = read("app/api/stripe/pro/checkout/route.ts");
const portalSrc = read("app/api/stripe/portal/route.ts");
const webhookSrc = read("app/api/stripe/webhook/route.ts");
const accountSrc = read("components/teacher/TeacherAccountView.tsx");
const billingTemplateSrc = read("lib/email/templates/billing.ts");
const notificationCopySrc = read("lib/email/messages/notifications.ts");

test("/upgrade renders a visible Membre Pro checkout summary before consent and CTA", () => {
  assert.match(upgradePageSrc, /data-testid="upgrade-checkout-summary"/);
  assert.match(upgradePageSrc, /checkoutSummaryTitle/);
  assert.match(upgradePageSrc, /checkoutSummaryPriceLabel/);
  assert.match(upgradePageSrc, /checkoutSummaryRenewalValue/);
  assert.match(upgradePageSrc, /LEGAL_ROUTES\.membrePro/);

  const summaryIndex = upgradePageSrc.indexOf('data-testid="upgrade-checkout-summary"');
  const consentIndex = upgradePageSrc.indexOf('data-testid="upgrade-renewal-acceptance"');
  const ctaIndex = upgradePageSrc.indexOf('data-testid="upgrade-primary-cta"');
  assert.ok(summaryIndex >= 0);
  assert.ok(consentIndex > summaryIndex, "summary must appear before renewal consent");
  assert.ok(ctaIndex > summaryIndex, "summary must appear before checkout CTA");
});

test("/upgrade uses canonical 29.99 CAD/month price and has no stale 29.00 copy", () => {
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29.99);
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr, "29,99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en, "29.99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es, "29,99");

  for (const locale of ["fr", "en", "es"] as const) {
    const copy = UPGRADE_PAGE_COPY[locale];
    assert.match(copy.proPlanPrice, /29[,.]99/);
    assert.match(copy.proPlanPrice, /CAD|\$CA/i);
    assert.match(copy.proPlanPrice, /month|mois|mes/i);
    assert.doesNotMatch(copy.proPlanPrice, /29[,.]00/);
  }
});

test("Membre Pro checkout still requires renewalAccepted and legalAccepted", () => {
  assert.match(proCheckoutSrc, /renewalAccepted\s*!==\s*true/);
  assert.match(proCheckoutSrc, /legalAccepted\s*!==\s*true/);
  assert.match(proCheckoutSrc, /renewal_consent_required/);
  assert.match(proCheckoutSrc, /legal_acceptance_required/);
});

test("checkout session metadata stores stable consent proof fields", () => {
  assert.match(proCheckoutSrc, /MEMBRE_PRO_CONSENT_VERSION/);
  assert.match(proCheckoutSrc, /getMembreProRenewalConsentText\(locale\)/);
  assert.match(proCheckoutSrc, /renewal_consent_text:\s*renewalConsentText/);
  assert.match(proCheckoutSrc, /renewal_accepted:\s*"true"/);
  assert.match(proCheckoutSrc, /legal_accepted:\s*"true"/);
  assert.match(proCheckoutSrc, /consent_accepted_at:\s*consentAcceptedAt/);
  assert.match(proCheckoutSrc, /checkoutSessionId:\s*session\.id/);
  assert.match(proCheckoutSrc, /metadata:\s*consentMetadata/);
  assert.equal(MEMBRE_PRO_CONSENT_VERSION, "membre-pro-renewal-v1-2026-06");
});

test("teacher settings exposes subscription management and uses Stripe portal for cancellation", () => {
  assert.match(accountSrc, /data-testid="teacher-pro-subscription-card"/);
  assert.match(accountSrc, /proSubscriptionSectionTitle/);
  assert.match(accountSrc, /proPlanPriceLabel/);
  assert.match(accountSrc, /openBillingPortal/);
  assert.match(accountSrc, /\/api\/stripe\/portal/);
  assert.match(accountSrc, /manageProSubscription/);
  assert.match(accountSrc, /href="\/upgrade"/);
  assert.doesNotMatch(
    accountSrc,
    /fetch\("\/api\/stripe\/pro\/checkout"[\s\S]{0,220}body:\s*undefined/,
    "settings page must not start Pro checkout without consent body",
  );
  assert.match(portalSrc, /stripe\.billingPortal\.sessions\.create/);
});

test("webhook logs subscription cancellation/update state with Stripe event context", () => {
  assert.match(webhookSrc, /customer\.subscription\.updated/);
  assert.match(webhookSrc, /customer\.subscription\.deleted/);
  assert.match(webhookSrc, /membre pro subscription synced/);
  assert.match(webhookSrc, /previousStatus/);
  assert.match(webhookSrc, /newStatus:\s*status/);
  assert.match(webhookSrc, /cancelAtPeriodEnd/);
  assert.match(webhookSrc, /currentPeriodEnd:\s*periodEnd/);
  assert.match(webhookSrc, /eventId:\s*event\.id/);
  assert.match(webhookSrc, /source:\s*"stripe_webhook"/);
});

test("confirmation and cancellation emails are subscription-aware and do not promise outcomes", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const confirmation = buildProUpgradeEmail({ name: "Marc", locale });
    const cancellation = buildProCancellationEmail({
      name: "Marc",
      effectiveDate: "2026-07-01",
      locale,
    });
    const combined = `${confirmation.subject}\n${confirmation.html}\n${cancellation.subject}\n${cancellation.html}`;

    assert.match(combined, /29[,.]99/);
    assert.match(combined, /renouvelle automatiquement|renews automatically|renueva autom.ticamente/i);
    assert.match(combined, /Stripe/);
    assert.match(combined, /annul|cancel/i);
    assert.match(combined, /ne garantit pas|does not guarantee|no garantiza/i);
    assert.doesNotMatch(
      combined,
      /guaranteed bookings|guaranteed income|revenu garanti|r.servations garanties|ingreso garantizado|reservas garantizadas/i,
    );
  }
  assert.match(billingTemplateSrc, /sendProCancellation/);
  assert.match(notificationCopySrc, /proCancellation/);
});

test("Stripe ids, payment math, tax logic, RLS, migrations, legal pages, YoPratiqo, audio, and SEO are untouched", () => {
  assert.doesNotMatch(proCheckoutSrc, /\bprice_[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(proCheckoutSrc, /\bprod_[A-Za-z0-9]{8,}/);
  assert.match(proCheckoutSrc, /process\.env\.STRIPE_PRO_MONTHLY_PRICE_ID/);
  assert.match(proCheckoutSrc, /line_items:\s*\[\{\s*price:\s*priceId,\s*quantity:\s*1\s*\}\]/);

  const allowed = new Set([
    "app/(app)/upgrade/page.tsx",
    "app/api/stripe/pro/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
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
    "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
    "tests/yo/yopratiqoDominicanResponsiveLayout.test.ts",
    // feat/membre-pro-public-checkout-link — scaffolds the
    // operator-minted hosted Stripe Checkout payment link for
    // public, UNauthenticated Membre Pro Pratiqo marketing
    // surfaces (sibling to, NOT replacement of, the canonical
    // authenticated /upgrade → /api/stripe/pro/checkout flow).
    // The CTA renders null while
    // isMembreProPublicCheckoutLinkEnabled() is false (today's
    // default), so this PR adds zero user-visible behaviour.
    // Verified by
    // tests/membrePro/membreProPublicCheckoutLinkScaffold.test.ts.
    "lib/config/membreProPublicCheckoutLink.ts",
    "components/membrePro/MembreProPublicUpgradeCTA.tsx",
    "tests/membrePro/membreProPublicCheckoutLinkScaffold.test.ts",
  ]);

  const forbidden: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe product/price config", re: /^lib\/stripe/ },
    { label: "payment math/tax internals", re: /^lib\/payments\/(?!.*$)|^lib\/payments\/tax\.ts/ },
    { label: "Supabase RLS/migrations", re: /^supabase\/|^lib\/rls\/|^lib\/security\// },
    { label: "live legal pages/content", re: /^content\/legal\/|^app\/\(app\)\/legal\// },
    { label: "YoPratiqo content", re: /^app\/yo\/|^components\/yo\/|^lib\/yo\// },
    { label: "generated audio", re: /^public\/.*\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "SEO/indexation", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  for (const file of changedFiles()) {
    assert.ok(allowed.has(file), `unexpected file touched: ${file}`);
    for (const rule of forbidden) {
      assert.ok(!rule.re.test(file), `restricted ${rule.label} file touched: ${file}`);
    }
  }
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[payments:membreProSubscriptionManagement] ${passed} tests passed`);
}
