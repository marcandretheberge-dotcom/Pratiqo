/**
 * YoPratiqo paid-checkout launch gate.
 *
 * V9 R03 — As of launch, YoPratiqo modules are intentionally NOT sold
 * through any paid checkout route. The legal copy in
 * `content/legal/yo-refund.{fr,en,es}.md` documents the EU 14-day
 * withdrawal-right framework, the dedicated checkbox wording, and an
 * explicit "Implementation note" stating the checkout-level checkbox UI
 * is **not yet implemented**. Until that UI ships AND lawyer validation
 * confirms the rest of the EU/international consumer-rights stack is
 * operationally enforced, no paid YoPratiqo international checkout is
 * activated.
 *
 * This module is the single source of truth that other surfaces import
 * to:
 *   - keep public copy honest ("international sales will be enabled
 *     progressively" — never "internationally available now"),
 *   - keep the marketplace promo flag flipped to `false`,
 *   - and let tests assert the absence of any active paid YoPratiqo
 *     checkout route.
 *
 * IMPORTANT — do NOT flip `YOPRATIQO_PAID_CHECKOUT_ENABLED` to `true`
 * without:
 *   1. Implementing a real EU withdrawal-right checkbox in the
 *      checkout UI.
 *   2. Server-side enforcement that the checkbox value was collected
 *      before any Stripe session is created from an EU IP.
 *   3. Lawyer (Me Jennifer Guay) sign-off on the new UI + flow.
 *
 * The flag below is a *display* flag only — there is no actual paid
 * YoPratiqo checkout route in `app/api/yopratiqo/*` today, so flipping
 * the constant alone would not enable sales. The constant is kept here
 * so that any future PR that adds a route can be guarded by a single
 * grep / test against this exact symbol.
 */

import type { Locale } from "@/lib/i18n/types";

/**
 * Hard launch gate. Must remain `false` until the EU withdrawal-right
 * checkbox UI exists, is server-enforced, and has been signed off by
 * counsel. See module-level docblock.
 */
export const YOPRATIQO_PAID_CHECKOUT_ENABLED = false as const;

/**
 * V9-mandated "soft launch" copy that other surfaces (waitlist banners,
 * marketing pages, future locked checkout buttons) MUST use when
 * disclosing that international YoPratiqo paid checkout is not yet
 * available. Wording mirrors what was approved for the V9 corrected
 * legal kit verbatim.
 */
export const YOPRATIQO_INTERNATIONAL_NOTICE_COPY: Record<Locale, string> = {
  fr: "Les ventes internationales de modules YoPratiqo payants seront activées progressivement après validation des exigences applicables en matière de contenu numérique et de droit de rétractation.",
  en: "International sales of paid YoPratiqo modules will be enabled progressively after validation of applicable digital-content and withdrawal-right requirements.",
  es: "Las ventas internacionales de módulos pagos de YoPratiqo se activarán progresivamente después de validar los requisitos aplicables sobre contenido digital y derecho de desistimiento.",
};

export function getYopratiqoInternationalNotice(locale: Locale): string {
  return (
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY[locale] ??
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.fr
  );
}
