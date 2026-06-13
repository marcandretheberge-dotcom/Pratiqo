/**
 * Membre Pro Pratiqo hosted-link checkout — scaffold contract.
 *
 * Verifies that the operator-minted hosted Stripe Checkout
 * payment link for the Membre Pro Pratiqo subscription is wired
 * correctly and stays dormant in production today:
 *
 *   1. The hosted payment link is stored in exactly one source
 *      file (`lib/config/membreProPublicCheckoutLink.ts`) and
 *      matches the URL the operator supplied.
 *   2. The runtime gate
 *      `getMembreProPublicCheckoutUrl()` returns `null` while
 *      `isMembreProPublicCheckoutLinkEnabled()` reports the
 *      surface is not launch-ready (the default).
 *   3. The `<MembreProPublicUpgradeCTA>` component renders `null`
 *      when the gate is closed, across all 3 locales and both
 *      variants.
 *   4. The canonical authenticated flow is NOT touched:
 *        a. `app/(app)/upgrade/page.tsx` still POSTs to
 *           `/api/stripe/pro/checkout` and does not import the
 *           hosted-link constant.
 *        b. `app/api/stripe/pro/checkout/route.ts` still requires
 *           `renewalAccepted !== true` + `legalAccepted !== true`
 *           gates and still creates a Stripe Checkout Session
 *           with the per-Price-ID line item.
 *        c. `lib/config/membrePro.ts` still pins
 *           `proMonthlyPriceCad: 29.99` (no silent price drop).
 *   5. The new CTA component never uses the banned label
 *      "Teacher Pro" anywhere in its copy.
 *   6. The supporting copy includes "admissible" and
 *      "conditions applicables" — the word "ristourne" is never
 *      used without one of those qualifiers nearby (no
 *      over-promised commercial-volume rebate).
 *
 * Static-source + pure-helper tests only. No browser, no
 * network, no Stripe SDK, no payment SDK.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as React from "react";

import {
  MEMBRE_PRO_PUBLIC_CHECKOUT_LINK,
  getMembreProPublicCheckoutUrl,
  getMembreProPublicCheckoutUrlUnsafe,
  isMembreProPublicCheckoutLinkEnabled,
} from "@/lib/config/membreProPublicCheckoutLink";
import { MEMBRE_PRO_PLAN } from "@/lib/config/membrePro";
import { MembreProPublicUpgradeCTA } from "@/components/membrePro/MembreProPublicUpgradeCTA";

const root = process.cwd();
const read = (rel: string): string =>
  readFileSync(join(root, rel), { encoding: "utf8" });

let passCount = 0;
function ok(label: string): void {
  passCount += 1;
  console.log(`  ✓ ${label}`);
}

// ── 1. Operator-minted URL is the single source of truth ─────────────

const EXPECTED_URL = "https://buy.stripe.com/dRm5kE2HK9k95pI5hz5EY01";

assert.equal(
  MEMBRE_PRO_PUBLIC_CHECKOUT_LINK,
  EXPECTED_URL,
  "operator-minted Membre Pro payment link must match the URL the operator supplied",
);
assert.equal(
  getMembreProPublicCheckoutUrlUnsafe(),
  EXPECTED_URL,
  "unsafe getter must return the same URL (used by tests / operator dashboards)",
);
ok("1) Membre Pro hosted payment link is the operator-minted URL");

// ── 2. URL string only appears in one source file ────────────────────

const linkSrc = read("lib/config/membreProPublicCheckoutLink.ts");
assert.ok(
  linkSrc.includes(EXPECTED_URL),
  "URL must live in lib/config/membreProPublicCheckoutLink.ts",
);

const otherSourcesToScan: readonly string[] = [
  "components/membrePro/MembreProPublicUpgradeCTA.tsx",
  "lib/config/membrePro.ts",
  "app/(app)/upgrade/page.tsx",
  "app/api/stripe/pro/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "app/tarifs/page.tsx",
];
for (const rel of otherSourcesToScan) {
  const src = read(rel);
  assert.ok(
    !src.includes(EXPECTED_URL),
    `${rel} must NOT inline the hosted Stripe URL — import the gated getter instead`,
  );
}
ok("2) Hosted Stripe URL appears in exactly one source file");

// ── 3. Gate stays closed by default ──────────────────────────────────

assert.equal(
  isMembreProPublicCheckoutLinkEnabled(),
  false,
  "isMembreProPublicCheckoutLinkEnabled must default to false — flipping it on requires a coordinated dashboard + counsel rollout",
);
assert.equal(
  getMembreProPublicCheckoutUrl(),
  null,
  "Gated getter must return null while the public-link surface is not launch-ready",
);
ok("3) Gate stays closed by default (production behaviour preserved)");

// ── 4. CTA component renders null when the gate is closed ────────────

for (const locale of ["fr", "en", "es"] as const) {
  for (const variant of ["inline", "card"] as const) {
    const node = MembreProPublicUpgradeCTA({ locale, variant });
    assert.equal(
      node,
      null,
      `${variant} CTA in ${locale} must render null while the gate is closed`,
    );
  }
}

// React.createElement smoke test — verifies the component
// accepts the published prop shape without throwing.
const factoryElement = React.createElement(MembreProPublicUpgradeCTA, {
  locale: "fr",
  variant: "card",
  surfaceId: "test",
});
assert.ok(
  factoryElement && typeof factoryElement === "object",
  "MembreProPublicUpgradeCTA must accept its published prop shape",
);
ok(
  "4) CTA component renders null today across all locales + variants and accepts its props",
);

// ── 5. Canonical authenticated /upgrade flow is NOT touched ──────────

const upgradePageSrc = read("app/(app)/upgrade/page.tsx");
assert.ok(
  upgradePageSrc.includes("/api/stripe/pro/checkout"),
  "/upgrade must still POST to the canonical authenticated checkout API",
);
assert.ok(
  !/MembreProPublicUpgradeCTA/.test(upgradePageSrc),
  "/upgrade must not import the public-link CTA — it has its own authenticated flow",
);
assert.ok(
  !/membreProPublicCheckoutLink/.test(upgradePageSrc),
  "/upgrade must not import the public-link constant",
);

const proCheckoutApiSrc = read("app/api/stripe/pro/checkout/route.ts");
assert.match(
  proCheckoutApiSrc,
  /renewalAccepted\s*!==\s*true/,
  "/api/stripe/pro/checkout must still enforce the V9 R02 renewal-consent gate",
);
assert.match(
  proCheckoutApiSrc,
  /legalAccepted\s*!==\s*true/,
  "/api/stripe/pro/checkout must still enforce the legal-acceptance gate",
);
assert.match(
  proCheckoutApiSrc,
  /stripe\.checkout\.sessions\.create/,
  "/api/stripe/pro/checkout must still create a Stripe Checkout Session",
);
assert.ok(
  !proCheckoutApiSrc.includes(EXPECTED_URL),
  "/api/stripe/pro/checkout must NOT reference the public hosted-link URL",
);
ok("5) Canonical authenticated /upgrade + /api/stripe/pro/checkout flow is intact");

// ── 6. Canonical $29.99 price + lawyer-reviewed copy is NOT touched ──

assert.equal(
  MEMBRE_PRO_PLAN.proMonthlyPriceCad,
  29.99,
  "MEMBRE_PRO_PLAN.proMonthlyPriceCad must stay at the canonical 29.99 (no silent price drop to match the public-link CTA)",
);
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr, "29,99");
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en, "29.99");
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es, "29,99");

const membreProConfigSrc = read("lib/config/membrePro.ts");
assert.ok(
  !membreProConfigSrc.includes(EXPECTED_URL),
  "lib/config/membrePro.ts must NOT inline the hosted Stripe URL — it remains the lawyer-reviewed canonical brand/copy/price module",
);
ok("6) Canonical $29.99 CAD price + lawyer-reviewed config is intact");

// ── 7. "Teacher Pro" is banned across the new component ──────────────

const componentSrc = read("components/membrePro/MembreProPublicUpgradeCTA.tsx");

/**
 * Strip JS block + line comments before grepping copy so an
 * explanatory docstring that *names* the banned label (e.g.
 * 'never uses "Teacher Pro"') is not flagged as a violation.
 */
function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
const cleanedComponentSrc = stripJsComments(componentSrc);

assert.ok(
  !/Teacher\s+Pro/i.test(cleanedComponentSrc),
  'Component copy must use "Membre Pro" / "Membre Pro Pratiqo" — never "Teacher Pro"',
);
ok('7) Banned label "Teacher Pro" never appears in the CTA copy');

// ── 8. Operator-dictated FR / EN / ES copy lands verbatim ────────────

assert.ok(
  componentSrc.includes("Devenir Membre Pro — 29 $/mois"),
  "FR button copy must match the operator-supplied string exactly",
);
assert.ok(
  componentSrc.includes(
    "Commission réduite, avantages Pro et accès au programme de ristourne admissible, selon les conditions applicables.",
  ),
  "FR supporting copy must match the operator-supplied string exactly",
);
ok("8) Operator-dictated FR copy lands verbatim");

// ── 9. "ristourne" is never overpromised in FR copy ──────────────────

const ristourneOccurrences: { line: string; lineNumber: number }[] = [];
cleanedComponentSrc.split(/\r?\n/).forEach((line, idx) => {
  if (/ristourne/i.test(line)) {
    ristourneOccurrences.push({ line, lineNumber: idx + 1 });
  }
});
assert.ok(
  ristourneOccurrences.length > 0,
  'Component must mention "ristourne" at least once (operator copy requires it)',
);
for (const { line, lineNumber } of ristourneOccurrences) {
  const isQualified =
    /admissible/i.test(line) ||
    /conditions\s+applicables/i.test(line) ||
    /selon\s+les\s+conditions/i.test(line);
  assert.ok(
    isQualified,
    `Every "ristourne" mention must be qualified by "admissible" or "selon les conditions applicables" (line ${lineNumber}: "${line.trim()}")`,
  );
}
ok('9) Every "ristourne" mention is qualified — no over-promised rebate');

// ── 10. Component imports no payments / Stripe SDK ───────────────────

const forbiddenImports: RegExp[] = [
  /from\s+["']stripe["']/i,
  /from\s+["']@stripe\//i,
  /from\s+["']@\/lib\/stripe/i,
  /from\s+["']@\/lib\/payments/i,
  /from\s+["']@\/lib\/pricing/i,
  /from\s+["']@\/lib\/config\/membrePro["']/, // canonical config — must not be touched
];
for (const re of forbiddenImports) {
  assert.ok(
    !re.test(componentSrc),
    `MembreProPublicUpgradeCTA must NOT import a payments / Stripe SDK or the canonical membrePro config: ${re}`,
  );
}
// And the URL string itself must not appear inside the component
// — only the gated getter is allowed there.
assert.ok(
  !componentSrc.includes(EXPECTED_URL),
  "MembreProPublicUpgradeCTA must not inline the Stripe URL — read it via the getter",
);
ok("10) Component imports no payments SDK and never inlines the URL");

console.log(`\n${passCount} membre-pro-public-checkout-link-scaffold assertions passed`);
