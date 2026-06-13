/**
 * MembreProPublicUpgradeCTA
 *
 * Public-facing Membre Pro Pratiqo upgrade card that opens the
 * operator-minted hosted Stripe Checkout payment link.
 *
 * IMPORTANT — read before mounting anywhere
 * -----------------------------------------
 * This component is the *public* / *unauthenticated* sibling of
 * the canonical authenticated `/upgrade` page. The hosted
 * payment link bypasses Pratiqo's seven Membre Pro safeguards
 * (auth, role gate, market gate, V9 R02 renewal + legal consent,
 * Stripe customer linkage, consent proof, webhook role flip).
 * See `lib/config/membreProPublicCheckoutLink.ts` for the full
 * trade-off list.
 *
 * Default behaviour
 * -----------------
 * `getMembreProPublicCheckoutUrl()` returns `null` while
 * `isMembreProPublicCheckoutLinkEnabled()` reports the surface is
 * not launch-ready (the default). When the gate is closed this
 * component renders `null` — mounting it anywhere is a no-op.
 *
 * Where to mount it once the gate flips
 * -------------------------------------
 *   ✓  Public, UNauthenticated marketing landing pages where the
 *      visitor is a *prospect* who has not yet created a Pratiqo
 *      teacher account (e.g. a future `/devenir-membre-pro`
 *      landing page).
 *   ✓  Email-campaign destination pages targeting cold leads.
 *   ✗  `/upgrade` — has a fully wired authenticated flow.
 *   ✗  `/tarifs` — CTA already routes through
 *      `/login?next=/upgrade` and into the canonical flow.
 *   ✗  Anywhere a signed-in teacher might click it — the link
 *      bypasses the role gate, market gate, and consent capture
 *      they would otherwise go through.
 *
 * Copy rules (per operator brief)
 * -------------------------------
 *   • Always uses "Membre Pro Pratiqo" as the product name.
 *   • Never uses "Teacher Pro".
 *   • Button copy is the literal operator-supplied string —
 *     do not edit without a counsel re-review.
 *   • "ristourne" is always qualified with "admissible" or
 *     "selon les conditions applicables" — never overpromised.
 *   • Includes a small tax / billing disclaimer that points at
 *     Stripe as the authoritative source so the CTA itself
 *     cannot misstate the price (a missing tax disclosure on a
 *     CAD subscription CTA would be a QC consumer-protection
 *     regression vs. the canonical `/upgrade` flow).
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server-renderable component. No hooks, no useState,
 *     no useEffect.
 *   • Does not import the Stripe SDK.
 *   • Does not read any user data — the hosted link is
 *     unauthenticated by design.
 *   • Renders nothing when the gate is closed.
 */

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import { getMembreProPublicCheckoutUrl } from "@/lib/config/membreProPublicCheckoutLink";

// ── Copy table ────────────────────────────────────────────────────────

type Copy = {
  /** Small uppercase eyebrow naming the product. */
  eyebrow: string;
  /** Card title (locale-aware). */
  title: string;
  /** One-line value proposition under the title (card variant only). */
  body: string;
  /** Button label including the price. */
  cta: string;
  /**
   * Supporting reassurance line — names the benefits *and* the
   * conditional nature of the ristourne. Never advertises a
   * guaranteed ristourne or rebate.
   */
  supporting: string;
  /**
   * Small print under the button — names Stripe as the
   * authoritative price + tax source. Prevents the operator-
   * supplied "29 $/mois" button from silently implying a tax-
   * inclusive flat price on a Canadian subscription.
   */
  finePrint: string;
  /** Aria label for the button (screen readers). */
  ariaCta: string;
};

const COPY: Record<Locale, Copy> = {
  fr: {
    eyebrow: "Membre Pro Pratiqo",
    title: "Devenir Membre Pro Pratiqo",
    body: "Élèves illimités, commission réduite et accès au programme de ristourne admissible, selon les conditions applicables.",
    cta: "Devenir Membre Pro — 29 $/mois",
    supporting:
      "Commission réduite, avantages Pro et accès au programme de ristourne admissible, selon les conditions applicables.",
    finePrint:
      "Tarif et taxes applicables présentés au moment du paiement sécurisé sur Stripe.",
    ariaCta:
      "Devenir Membre Pro Pratiqo à 29 dollars canadiens par mois. Paiement sécurisé sur Stripe.",
  },
  en: {
    eyebrow: "Membre Pro Pratiqo",
    title: "Become a Membre Pro Pratiqo",
    body: "Unlimited students, reduced commission, and access to the eligible commercial volume rebate program, subject to applicable terms.",
    cta: "Become Membre Pro — $29/month",
    supporting:
      "Reduced commission, Pro benefits, and access to the eligible commercial volume rebate program, subject to applicable terms.",
    finePrint:
      "Price and applicable taxes are shown on the secure Stripe checkout page.",
    ariaCta:
      "Become a Membre Pro Pratiqo at 29 Canadian dollars per month. Secure payment on Stripe.",
  },
  es: {
    eyebrow: "Membre Pro Pratiqo",
    title: "Hacerse Membre Pro Pratiqo",
    body: "Estudiantes ilimitados, comisión reducida y acceso al programa de reembolso admisible, sujeto a las condiciones aplicables.",
    cta: "Hacerse Membre Pro — 29 $/mes",
    supporting:
      "Comisión reducida, ventajas Pro y acceso al programa de reembolso admisible, sujeto a las condiciones aplicables.",
    finePrint:
      "El precio y los impuestos aplicables se muestran en la página de pago segura de Stripe.",
    ariaCta:
      "Hacerse Membre Pro Pratiqo por 29 dólares canadienses al mes. Pago seguro en Stripe.",
  },
};

function safeLocale(locale: Locale | undefined): Locale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

// ── Variants ──────────────────────────────────────────────────────────

/**
 * `inline` — compact block (eyebrow + button + supporting +
 * fine-print). Designed to live at the bottom of a marketing
 * paragraph or alongside a feature comparison table.
 *
 * `card` — full premium card with title + body paragraph + the
 * inline block. Designed to live as a standalone hero CTA on a
 * marketing landing page.
 */
export type MembreProPublicUpgradeCTAVariant = "inline" | "card";

export type MembreProPublicUpgradeCTAProps = {
  locale: Locale;
  variant?: MembreProPublicUpgradeCTAVariant;
  /**
   * Optional surface id stamped onto data-attributes so the
   * static contract tests can assert the CTA is mounted where
   * the operator expects.
   */
  surfaceId?: string;
  className?: string;
};

// ── Component ─────────────────────────────────────────────────────────

export function MembreProPublicUpgradeCTA({
  locale,
  variant = "card",
  surfaceId,
  className,
}: MembreProPublicUpgradeCTAProps): React.JSX.Element | null {
  const checkoutUrl = getMembreProPublicCheckoutUrl();
  if (!checkoutUrl) return null;

  const l = safeLocale(locale);
  const copy = COPY[l];

  const eyebrow = (
    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F8973] sm:text-[11.5px]">
      <Sparkles aria-hidden className="h-3.5 w-3.5" />
      {copy.eyebrow}
    </p>
  );

  const ctaButton = (
    <Link
      href={checkoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.ariaCta}
      data-testid="membre-pro-public-upgrade-cta-button"
      data-membre-pro-public-upgrade-cta-button="true"
      className={cn(
        "group inline-flex w-full items-center justify-between gap-3 rounded-full px-5 py-3 text-center text-[15px] font-extrabold tracking-tight text-white shadow-[0_10px_24px_rgba(19,160,133,0.28)] transition-transform",
        "bg-[#13A085] hover:bg-[#0F8973] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8973] focus-visible:ring-offset-2",
        "active:scale-[0.99] sm:text-base",
      )}
    >
      <span className="flex-1 text-left">{copy.cta}</span>
      <ArrowRight
        aria-hidden
        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );

  const supportingLine = (
    <p
      data-testid="membre-pro-public-upgrade-cta-supporting"
      className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-[#5B5240] sm:text-[13px]"
    >
      <ShieldCheck
        aria-hidden
        className="mt-[1px] h-4 w-4 shrink-0 text-[#13A085]"
      />
      <span>{copy.supporting}</span>
    </p>
  );

  const finePrintLine = (
    <p
      data-testid="membre-pro-public-upgrade-cta-fineprint"
      className="mt-2 text-[11.5px] leading-snug text-[#7A7060]"
    >
      {copy.finePrint}
    </p>
  );

  // ── Inline variant ────────────────────────────────────────────────
  if (variant === "inline") {
    return (
      <aside
        data-testid="membre-pro-public-upgrade-cta"
        data-membre-pro-public-upgrade-cta="true"
        data-membre-pro-public-upgrade-cta-variant="inline"
        data-membre-pro-public-upgrade-cta-surface={surfaceId ?? "default"}
        className={cn(
          "flex w-full flex-col items-stretch rounded-[1.5rem] border border-[#E7DFCF] bg-gradient-to-br from-[#FBF7EE] to-[#F4EFE6] p-5 shadow-[0_14px_32px_rgba(23,38,66,0.06)] sm:p-6",
          className,
        )}
      >
        {eyebrow}
        <div className="mt-4">{ctaButton}</div>
        {supportingLine}
        {finePrintLine}
      </aside>
    );
  }

  // ── Card variant ──────────────────────────────────────────────────
  return (
    <aside
      data-testid="membre-pro-public-upgrade-cta"
      data-membre-pro-public-upgrade-cta="true"
      data-membre-pro-public-upgrade-cta-variant="card"
      data-membre-pro-public-upgrade-cta-surface={surfaceId ?? "default"}
      className={cn(
        "relative flex w-full flex-col items-stretch overflow-hidden rounded-[1.75rem] border border-[#E7DFCF] bg-white p-5 shadow-[0_18px_42px_rgba(23,38,66,0.07)] sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FBF7EE]/70 via-transparent to-[#E3F1EB]/40"
      />
      <div className="relative flex flex-col items-stretch">
        {eyebrow}
        <h3
          data-testid="membre-pro-public-upgrade-cta-title"
          className="mt-3 font-[var(--yo-app-display)] text-[20px] font-semibold leading-tight text-[#172642] sm:text-[22px]"
        >
          {copy.title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#3A3A3A] sm:text-[15px]">
          {copy.body}
        </p>
        <div className="mt-5">{ctaButton}</div>
        {supportingLine}
        {finePrintLine}
      </div>
    </aside>
  );
}
