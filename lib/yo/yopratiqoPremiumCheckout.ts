/**
 * lib/yo/yopratiqoPremiumCheckout.ts
 *
 * Single source of truth for the per-module YoPratiqo paid-module
 * checkout links (hosted Stripe Checkout payment links). The links
 * themselves are constant URLs the operator has minted on the
 * Stripe dashboard — they are NOT generated client-side, the
 * Stripe SDK is NOT imported here, and no Stripe API call is
 * made from this file.
 *
 * Why this lives outside `yopratiqoProductConfig.ts`
 * --------------------------------------------------
 * The product config (`lib/yo/yopratiqoProductConfig.ts`) owns
 * the per-module *gates* (`publicLaunchEnabled`,
 * `checkoutEnabled`, `premiumModulesEnabled`, …). This file
 * owns the *URL* that is reached when those gates are open. Keeping
 * the two concerns separate means:
 *
 *   1. The product-shell / bridge consistency test suites can
 *      keep their `STRIPE_PATTERN` audits of the product config
 *      green — the literal string `stripe` no longer appears in
 *      `yopratiqoProductConfig.ts`.
 *   2. Rotating a checkout URL never requires editing the gates.
 *   3. Adding a second paid module is one line in
 *      `MODULE_CHECKOUT_LINKS` plus one entry in
 *      `futurePremiumModules`.
 *
 * Safety profile
 * --------------
 *   • Server-friendly module (no React, no hooks, no `use client`).
 *   • Returns `null` whenever `isYoPremiumModuleCheckoutEnabled(id)`
 *     reports the module is not checkout-ready (the default for
 *     every module today).
 *   • Never throws on an unknown module id — returns `null`.
 *   • The URL strings are constants; nothing here mints or signs
 *     anything.
 *
 * Operational checklist before flipping a link on
 * -----------------------------------------------
 * Before flipping a paid module live, the operator must:
 *
 *   1. Flip `premiumModulesEnabled: true` in
 *      `lib/yo/yopratiqoProductConfig.ts`.
 *   2. Flip the module's `publicLaunchEnabled: true` AND
 *      `checkoutEnabled: true` in `futurePremiumModules`.
 *   3. Wire a webhook + entitlement table so the module actually
 *      unlocks for the paying user. The constant link below opens
 *      Stripe Checkout and produces a payment receipt but does NOT
 *      grant access on its own.
 *   4. Update the lawyer-export legal disclosures (price, tax,
 *      refund policy).
 */

import { isYoPremiumModuleCheckoutEnabled } from "@/lib/yo/yopratiqoProductConfig";

/**
 * Per-module hosted checkout URLs.
 *
 * Keep new entries one-per-line so a single grep on the module id
 * surfaces the URL it points at.
 */
const MODULE_CHECKOUT_LINKS: Readonly<Record<string, string>> = Object.freeze({
  // Dominican Republic — Spanish A1.
  // Module ID matches the `futurePremiumModules` entry in
  // `yopratiqoProductConfig.ts`. The link is the operator-minted
  // YoPratiqo payment link — 24,99 $ CAD.
  "dr-spanish-a1": "https://buy.stripe.com/7sY4gA3LO3ZP05o6lD5EY00",
});

/**
 * The full, frozen map of paid-module checkout URLs. Exposed for
 * test surfaces that need to verify the constant exists and
 * matches the operator-minted link — never read this at runtime
 * to skip the gate. Use `getYopratiqoPremiumCheckoutUrl(id)`
 * instead.
 */
export const YOPRATIQO_PREMIUM_CHECKOUT_LINKS = MODULE_CHECKOUT_LINKS;

/**
 * Returns the hosted checkout URL for the given paid module, or
 * `null` when the module is not yet checkout-ready. Both gates
 * must agree — the global `premiumModulesEnabled` flag AND the
 * module's `publicLaunchEnabled` + `checkoutEnabled` flags — see
 * `isYoPremiumModuleCheckoutEnabled` in `yopratiqoProductConfig.ts`.
 */
export function getYopratiqoPremiumCheckoutUrl(
  moduleId: string,
): string | null {
  if (!isYoPremiumModuleCheckoutEnabled(moduleId)) return null;
  const url = MODULE_CHECKOUT_LINKS[moduleId];
  return typeof url === "string" && url.length > 0 ? url : null;
}

/**
 * Returns the hosted checkout URL without consulting the gates.
 * Use ONLY for test fixtures and operator dashboards that need to
 * verify the constant matches the Stripe-side payment link. Every
 * runtime surface MUST go through `getYopratiqoPremiumCheckoutUrl`
 * so a single flag flip can dark-launch a module.
 */
export function getYopratiqoPremiumCheckoutUrlUnsafe(
  moduleId: string,
): string | null {
  const url = MODULE_CHECKOUT_LINKS[moduleId];
  return typeof url === "string" && url.length > 0 ? url : null;
}
