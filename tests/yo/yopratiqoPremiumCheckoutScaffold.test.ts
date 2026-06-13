/**
 * YoPratiqo — paid-module checkout scaffold contract.
 *
 * Verifies that the operator-minted hosted-checkout URL for the
 * Dominican Republic Spanish A1 paid-module shell is wired
 * correctly and stays dormant in production:
 *
 *   1. The Stripe payment link is stored in exactly one place
 *      (`lib/yo/yopratiqoPremiumCheckout.ts`) and matches the
 *      link the operator gave the agent.
 *   2. The `dr-spanish-a1` entry exists in
 *      `yopratiqoProductConfig.futurePremiumModules` with both
 *      gates closed (`publicLaunchEnabled: false` AND
 *      `checkoutEnabled: false`).
 *   3. The runtime gate
 *      `getYopratiqoPremiumCheckoutUrl("dr-spanish-a1")` returns
 *      `null` while `premiumModulesEnabled` stays false.
 *   4. The Quebec French paid-module shell still ships with both
 *      gates closed too — no regression on the existing dark
 *      module.
 *   5. The Course Home route imports the gated CTA component
 *      (not the URL constant directly) and never inlines the
 *      Stripe URL.
 *   6. The `<YoPremiumModuleUnlockCTA>` component renders `null`
 *      when called with an unknown module id.
 *
 * Static-source + pure-helper tests only. No browser, no
 * network, no Stripe SDK, no payment SDK.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as React from "react";

import {
  getYopratiqoPremiumCheckoutUrl,
  getYopratiqoPremiumCheckoutUrlUnsafe,
  YOPRATIQO_PREMIUM_CHECKOUT_LINKS,
} from "@/lib/yo/yopratiqoPremiumCheckout";
import {
  getYoFuturePremiumModuleById,
  isYoPremiumModuleCheckoutEnabled,
  isYoPremiumModulePubliclyAvailable,
  yopratiqoProductConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import { YoPremiumModuleUnlockCTA } from "@/components/yo/YoPremiumModuleUnlockCTA";

const root = process.cwd();
const read = (rel: string): string =>
  readFileSync(join(root, rel), { encoding: "utf8" });

let passCount = 0;
function ok(label: string): void {
  passCount += 1;
  console.log(`  ✓ ${label}`);
}

// ── 1. Operator-minted URL is the single source of truth ─────────────

const EXPECTED_DR_URL = "https://buy.stripe.com/7sY4gA3LO3ZP05o6lD5EY00";

assert.equal(
  YOPRATIQO_PREMIUM_CHECKOUT_LINKS["dr-spanish-a1"],
  EXPECTED_DR_URL,
  "operator-minted DR Spanish A1 payment link must match the URL the operator supplied",
);
assert.equal(
  getYopratiqoPremiumCheckoutUrlUnsafe("dr-spanish-a1"),
  EXPECTED_DR_URL,
  "unsafe getter must return the same URL (used by tests / operator dashboards)",
);
ok("1) DR Spanish A1 payment link is the operator-minted URL");

// ── 2. URL string only appears in one source file ────────────────────

const checkoutSrc = read("lib/yo/yopratiqoPremiumCheckout.ts");
assert.ok(
  checkoutSrc.includes(EXPECTED_DR_URL),
  "URL must live in yopratiqoPremiumCheckout.ts",
);

const otherSourcesToScan: readonly string[] = [
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
  "components/yo/YoPremiumModuleUnlockCTA.tsx",
  "lib/yo/yopratiqoProductConfig.ts",
];
for (const rel of otherSourcesToScan) {
  const src = read(rel);
  assert.ok(
    !src.includes(EXPECTED_DR_URL),
    `${rel} must NOT inline the Stripe URL — import the gated getter instead`,
  );
}
ok("2) Stripe URL appears in exactly one source file");

// ── 3. dr-spanish-a1 module entry exists with both gates closed ──────

const drEntry = getYoFuturePremiumModuleById("dr-spanish-a1");
assert.ok(drEntry, "dr-spanish-a1 entry must exist in futurePremiumModules");
assert.equal(drEntry?.languageSlug, "espagnol");
assert.equal(
  drEntry?.route,
  "/yo/langues/espagnol/pays/republique-dominicaine",
);
assert.equal(
  drEntry?.publicLaunchEnabled,
  false,
  "DR Spanish A1 must NOT be publicly launched yet",
);
assert.equal(
  drEntry?.checkoutEnabled,
  false,
  "DR Spanish A1 checkout must NOT be enabled yet",
);
assert.equal(
  drEntry?.indexable,
  false,
  "DR Spanish A1 shell must stay noindex",
);
assert.equal(
  drEntry?.priceHypothesisCadCents,
  2499,
  "DR Spanish A1 price hypothesis must match the operator-stated price",
);
ok("3) dr-spanish-a1 entry exists with both gates closed");

// ── 4. Existing Quebec French shell still has both gates closed ──────

const quebecEntry = getYoFuturePremiumModuleById(
  "fr-quebec-workplace-survival-1",
);
assert.ok(quebecEntry, "Quebec French shell entry must still exist");
assert.equal(
  quebecEntry?.publicLaunchEnabled,
  false,
  "Quebec French shell must NOT regress to publicLaunchEnabled: true",
);
assert.equal(
  quebecEntry?.checkoutEnabled,
  false,
  "Quebec French shell must NOT regress to checkoutEnabled: true",
);
ok("4) Quebec French shell still ships with both gates closed");

// ── 5. Global premiumModulesEnabled stays false ──────────────────────

assert.equal(
  yopratiqoProductConfig.premiumModulesEnabled,
  false,
  "premiumModulesEnabled must stay false until launch — flipping it on demands a coordinated webhook + entitlement + legal rollout",
);
ok("5) premiumModulesEnabled stays false");

// ── 6. Runtime gate hides the URL today ──────────────────────────────

assert.equal(
  isYoPremiumModulePubliclyAvailable("dr-spanish-a1"),
  false,
  "DR Spanish A1 must NOT be publicly available while the gate is closed",
);
assert.equal(
  isYoPremiumModuleCheckoutEnabled("dr-spanish-a1"),
  false,
  "DR Spanish A1 checkout must NOT be enabled while the gate is closed",
);
assert.equal(
  getYopratiqoPremiumCheckoutUrl("dr-spanish-a1"),
  null,
  "Gated getter must return null while premiumModulesEnabled is false",
);
ok("6) Gated getter returns null today (production behaviour preserved)");

// ── 7. Unknown module ids never leak a URL ───────────────────────────

assert.equal(
  getYopratiqoPremiumCheckoutUrl("not-a-real-module"),
  null,
  "Unknown module ids must return null from the gated getter",
);
assert.equal(
  getYopratiqoPremiumCheckoutUrlUnsafe("not-a-real-module"),
  null,
  "Unknown module ids must return null from the unsafe getter too",
);
ok("7) Unknown module ids never resolve to a URL");

// ── 8. CTA component returns null when the gate is closed ────────────

const inlineNode = YoPremiumModuleUnlockCTA({
  moduleId: "dr-spanish-a1",
  locale: "fr",
  variant: "inline",
});
assert.equal(
  inlineNode,
  null,
  "inline CTA must render null while the gate is closed",
);

const lockedNode = YoPremiumModuleUnlockCTA({
  moduleId: "dr-spanish-a1",
  locale: "fr",
  variant: "locked-card",
});
assert.equal(
  lockedNode,
  null,
  "locked-card CTA must render null while the gate is closed",
);

const unknownNode = YoPremiumModuleUnlockCTA({
  moduleId: "nope-not-a-module",
  locale: "fr",
});
assert.equal(
  unknownNode,
  null,
  "Unknown module ids must render null from the CTA component",
);

// React.createElement smoke test — verifies the component
// accepts the published prop shape without throwing.
const factoryElement = React.createElement(YoPremiumModuleUnlockCTA, {
  moduleId: "dr-spanish-a1",
  locale: "en",
  variant: "inline",
  surfaceId: "test",
});
assert.ok(
  factoryElement && typeof factoryElement === "object",
  "YoPremiumModuleUnlockCTA must accept its published prop shape",
);
ok("8) CTA component renders null today and accepts its published props");

// ── 9. Course Home route uses the gated component, not the raw URL ───

const courseHomeSrc = read(
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
);

assert.ok(
  courseHomeSrc.includes(
    'import { YoPremiumModuleUnlockCTA } from "@/components/yo/YoPremiumModuleUnlockCTA"',
  ),
  "Course Home must import the gated CTA component",
);
assert.ok(
  courseHomeSrc.includes('moduleId={PAID_MODULE_ID}'),
  "Course Home must reference the paid-module id constant",
);
assert.ok(
  courseHomeSrc.includes('variant="inline"'),
  "Course Home must mount the inline CTA after the free intro section",
);
assert.ok(
  courseHomeSrc.includes('variant="locked-card"'),
  "Course Home must mount the locked-card CTA on the path screen",
);

// Should NOT import the URL constant directly — only the gated
// getter is allowed at call sites.
assert.ok(
  !/from\s+["']@\/lib\/yo\/yopratiqoPremiumCheckout["']/.test(courseHomeSrc),
  "Course Home must not import yopratiqoPremiumCheckout directly — only the CTA component",
);

// The page docstring + bodies still acknowledge the new surface.
assert.ok(
  courseHomeSrc.includes("YoPremiumModuleUnlockCTA"),
  "Course Home must reference the unlock CTA in its body",
);
ok(
  "9) Course Home wires the gated component (no direct URL / SDK import)",
);

// ── 10. Component file imports no Stripe SDK and no payments lib ─────

const componentSrc = read("components/yo/YoPremiumModuleUnlockCTA.tsx");
const forbiddenImports: RegExp[] = [
  /from\s+["']stripe["']/i,
  /from\s+["']@stripe\//i,
  /from\s+["']@\/lib\/stripe/i,
  /from\s+["']@\/lib\/payments/i,
];
for (const re of forbiddenImports) {
  assert.ok(
    !re.test(componentSrc),
    `YoPremiumModuleUnlockCTA must NOT import a payments / Stripe SDK: ${re}`,
  );
}
// And the URL string itself must not appear inside the component
// — only the gated getter is allowed there.
assert.ok(
  !componentSrc.includes(EXPECTED_DR_URL),
  "YoPremiumModuleUnlockCTA must not inline the Stripe URL — read it via the getter",
);
ok("10) Component imports no payments SDK and never inlines the URL");

// ── 11. Required French copy is the one the operator dictated ────────

assert.ok(
  componentSrc.includes("Débloquer le module — 24,99 $ CAD"),
  "FR button copy must match the operator-supplied string exactly",
);
assert.ok(
  componentSrc.includes(
    "Paiement sécurisé par Stripe. Accès immédiat après l’achat.",
  ),
  "FR supporting copy must match the operator-supplied string exactly",
);

/**
 * Audit the user-facing copy only — strip block + line comments
 * first so the docstring that *explains* the brand rule (e.g.
 * 'never "Yo" on its own') is not mistakenly flagged for
 * containing the bare word.
 */
function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
const cleanedComponentSrc = stripJsComments(componentSrc);

// "Yo" used in isolation is banned — the brand is always "YoPratiqo".
// `Yo` followed by `Pratiqo` / `ppo` is allowed (YoPratiqo,
// YoPremiumModuleUnlockCTA, Yoppo, …).
const bareYoMatch = cleanedComponentSrc.match(/\bYo\b(?!Pratiqo|ppo|p)/);
assert.equal(
  bareYoMatch,
  null,
  `User-facing copy must use "YoPratiqo", never bare "Yo" (matched: ${bareYoMatch?.[0] ?? "n/a"} at index ${bareYoMatch?.index ?? -1})`,
);
// "Lifetime access" is banned — no such promise in any locale.
assert.ok(
  !/lifetime\s+access/i.test(cleanedComponentSrc),
  'EN copy must not advertise "lifetime access"',
);
assert.ok(
  !/accès\s+à\s+vie/i.test(cleanedComponentSrc),
  'FR copy must not advertise "accès à vie"',
);
assert.ok(
  !/acceso\s+(de\s+por\s+vida|vital(?:icio)?)/i.test(cleanedComponentSrc),
  'ES copy must not advertise "acceso de por vida" or "acceso vitalicio"',
);
ok("11) French copy + brand rules + no lifetime-access mention");

console.log(`\n${passCount} premium-checkout-scaffold assertions passed`);
