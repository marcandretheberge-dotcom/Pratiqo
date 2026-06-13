/**
 * lib/config/membreProPublicCheckoutLink.ts
 *
 * Single source of truth for the operator-minted *hosted* Stripe
 * Checkout payment link for the Membre Pro Pratiqo monthly
 * subscription.
 *
 * Sibling, not replacement, of the canonical authenticated flow
 * ─────────────────────────────────────────────────────────────
 * The canonical, lawyer-reviewed Membre Pro purchase path is the
 * authenticated `/upgrade` page that POSTs to
 * `/api/stripe/pro/checkout`. That flow does, in order:
 *
 *   1. Supabase auth gate (bearer token validation)
 *   2. Role gate (`role === "teacher"`)
 *   3. Market gate (`isMembreProMarketSupported(country)`)
 *   4. V9 R02 consent gate (`renewalAccepted` + `legalAccepted`)
 *   5. Stripe Customer creation + `profiles.stripe_customer_id`
 *      back-link so the webhook can flip `subscription_status`
 *      on the right teacher
 *   6. Consent proof recording on the Checkout Session metadata
 *      (renewal_consent_version, consent_locale, IP, user-agent,
 *      consent_accepted_at — defended by
 *      `tests/payments/membreProSubscriptionManagement.test.ts`)
 *   7. `client_reference_id: user.id` so
 *      `/api/stripe/webhook` can promote the right teacher to Pro
 *
 * This file owns ONLY the URL of an alternative *hosted-link*
 * checkout entry — a separate Stripe Checkout Payment Link object
 * the operator has minted on the Stripe Dashboard. The hosted
 * link, by design, has none of the seven safeguards above:
 *
 *   • No Supabase auth — the link can be opened by anyone, signed
 *     in or not.
 *   • No role gate — a student or admin who somehow lands on the
 *     link can pay.
 *   • No market gate — country-of-residence is decided by Stripe
 *     at checkout, not by Pratiqo's market config.
 *   • No V9 R02 consent capture — the renewal-acceptance and
 *     legal-acceptance checkboxes are NOT rendered before the
 *     redirect.
 *   • No Pratiqo-side Stripe Customer linkage — without
 *     `client_reference_id` on the payment link (configured on the
 *     Stripe Dashboard side, NOT here), the webhook has no
 *     reliable way to map the resulting subscription back to a
 *     Pratiqo `profiles.id`.
 *   • No subscription metadata stamping — `renewal_consent_*`,
 *     `consent_locale`, `request_ip`, etc. cannot be written
 *     from a hosted payment link.
 *
 * Why this lives in its own file
 * ──────────────────────────────
 * `lib/config/membrePro.ts` is the lawyer-reviewed canonical
 * Membre Pro brand + copy + pricing module. Many test suites
 * pin its path with a `restrictedPathPatterns` regex; touching
 * it requires a dedicated PR. The hosted payment link is a
 * separate concern (it does not change pricing or copy), so we
 * keep it in a sibling file. The two never duplicate any data.
 *
 * Gating
 * ──────
 * `getMembreProPublicCheckoutUrl()` returns `null` whenever
 * `isMembreProPublicCheckoutLinkEnabled()` is `false`, which is
 * the default. A future PR that wants to enable the public link
 * must:
 *
 *   1. Decide where it gets mounted (probably a public,
 *      unauthenticated marketing landing page — NEVER on
 *      `/upgrade` or `/tarifs`, which have working authenticated
 *      paths).
 *   2. Confirm on the Stripe Dashboard that:
 *        a. The link's Price is configured at the price displayed
 *           on the CTA (today: 29 $ CAD / month — note this
 *           differs from the canonical `MEMBRE_PRO_PLAN
 *           .proMonthlyPriceCad` of 29.99 CAD; the divergence
 *           must be reconciled with the lawyer-reviewed
 *           pricing before launch).
 *        b. Stripe Tax is enabled so the user sees the QC / CA
 *           applicable taxes on the Stripe-hosted page (the CTA
 *           copy itself does not promise tax-included pricing).
 *        c. The Subscription is configured to attach a
 *           `client_reference_id` URL parameter to the success
 *           redirect so the webhook can reconcile the payment.
 *        d. The Stripe Customer Portal is exposed so users can
 *           cancel without contacting support.
 *   3. Re-confirm with counsel that the public link surface
 *      complies with V9 / R02 consent requirements (the hosted
 *      page can be configured to display consent text but does
 *      NOT capture the same per-checkbox proof the API flow does).
 *
 * Safety profile
 * ──────────────
 *   • Server-friendly (no React, no client hooks, no `use client`).
 *   • Returns `null` by default — UI consumers must treat `null`
 *     as "do not render the CTA".
 *   • Imports no payments / Stripe SDK. The URL is a constant
 *     string the operator minted on the Stripe Dashboard.
 */

/**
 * The operator-minted hosted Stripe Checkout payment link for
 * the Membre Pro Pratiqo monthly subscription. Frozen so it can
 * be safely exported.
 */
export const MEMBRE_PRO_PUBLIC_CHECKOUT_LINK: string =
  "https://buy.stripe.com/dRm5kE2HK9k95pI5hz5EY01";

/**
 * Master gate for any UI surface that wants to render a Membre
 * Pro CTA pointing at the hosted Stripe Checkout payment link.
 *
 * Stays `false` by default. Flipping this to `true` exposes the
 * link on every UI consumer that uses
 * `getMembreProPublicCheckoutUrl()` — so do not flip it without
 * the operational checklist documented above (Stripe Dashboard
 * configuration + counsel re-review).
 */
export function isMembreProPublicCheckoutLinkEnabled(): boolean {
  return false;
}

/**
 * Gated reader for the Membre Pro hosted-link checkout URL.
 *
 * Returns the URL only when
 * `isMembreProPublicCheckoutLinkEnabled()` reports the surface
 * is launch-ready; otherwise returns `null`. UI consumers MUST
 * treat `null` as "hide the CTA" and never fall back to the raw
 * constant — that defeats the gate.
 */
export function getMembreProPublicCheckoutUrl(): string | null {
  if (!isMembreProPublicCheckoutLinkEnabled()) return null;
  return MEMBRE_PRO_PUBLIC_CHECKOUT_LINK;
}

/**
 * Unsafe reader — returns the constant URL with no gate
 * consultation. Intended for contract tests / operator
 * dashboards that need to verify the constant matches the
 * payment link minted on the Stripe Dashboard. Never use at
 * runtime in any UI surface.
 */
export function getMembreProPublicCheckoutUrlUnsafe(): string {
  return MEMBRE_PRO_PUBLIC_CHECKOUT_LINK;
}
