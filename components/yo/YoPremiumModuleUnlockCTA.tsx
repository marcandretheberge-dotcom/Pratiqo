/**
 * YoPremiumModuleUnlockCTA
 *
 * Premium "unlock this paid module" card surface for YoPratiqo.
 *
 * The card opens the operator-minted hosted YoPratiqo checkout URL
 * (Stripe Checkout payment link). The URL itself is owned by
 * `lib/yo/yopratiqoPremiumCheckout.ts` so this file never imports
 * the Stripe SDK and never knows the literal URL string.
 *
 * Gating behaviour
 * ----------------
 * The component renders `null` whenever
 * `getYopratiqoPremiumCheckoutUrl(moduleId)` returns `null`.
 * That helper consults `isYoPremiumModuleCheckoutEnabled`, which
 * in turn requires both:
 *
 *   • `yopratiqoProductConfig.premiumModulesEnabled === true` AND
 *   • the per-module `publicLaunchEnabled` AND `checkoutEnabled`
 *     flags on the matching entry of `futurePremiumModules`.
 *
 * Today, every paid-module shell ships with those flags off, so
 * mounting this component anywhere is a no-op until ops flips the
 * gate. That makes it safe to scaffold the surface and review the
 * design without taking payment.
 *
 * Web vs. React Native
 * --------------------
 * This codebase is the Pratiqo web app (Next.js). For web we use a
 * plain anchor tag pointing at the hosted checkout URL — Stripe's
 * recommended pattern for payment links and the lowest-coupling
 * way to launch checkout from a server-rendered page. A future
 * React Native / Expo client should re-use
 * `getYopratiqoPremiumCheckoutUrl()` from
 * `lib/yo/yopratiqoPremiumCheckout.ts` and call
 * `Linking.openURL(url)` from its own button component. The URL
 * constant deliberately lives outside any UI tree so both clients
 * can share it.
 *
 * Copy rules
 * ----------
 *   • Always uses "YoPratiqo" — never "Yo" on its own.
 *   • Never advertises lifetime access.
 *   • Says the price (24,99 $ CAD) on the button itself so it is
 *     unambiguous before the user reaches Stripe.
 *   • Names Stripe as the payment processor in the supporting
 *     line so users know who is collecting the payment before
 *     they leave the page.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server-renderable component. No client hooks, no
 *     useEffect, no useState.
 *   • Does not call any API.
 *   • Does not read any user data.
 *   • Renders nothing when the gate is closed.
 */

import * as React from "react";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";
import { getYopratiqoPremiumCheckoutUrl } from "@/lib/yo/yopratiqoPremiumCheckout";

// ── Copy table ────────────────────────────────────────────────────────

type Copy = {
  eyebrow: string;
  /** Headline above the button. Locked-card variant only. */
  title: string;
  /** Single paragraph under the title. Locked-card variant only. */
  body: string;
  /** Button label including the price. */
  cta: string;
  /** Reassurance line beneath the button. */
  supporting: string;
  /** Aria label for the button (screen readers). */
  ariaCta: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    eyebrow: "Module premium · YoPratiqo",
    title: "Continue avec le module complet",
    body: "Tu as terminé l’intro gratuite. Le module complet de YoPratiqo te donne accès à toutes les leçons, les flashcards et les exercices de prononciation.",
    cta: "Débloquer le module — 24,99 $ CAD",
    supporting: "Paiement sécurisé par Stripe. Accès immédiat après l’achat.",
    ariaCta:
      "Débloquer le module complet de YoPratiqo pour 24,99 dollars canadiens. Paiement sécurisé sur Stripe.",
  },
  en: {
    eyebrow: "Premium module · YoPratiqo",
    title: "Continue with the full module",
    body: "You finished the free intro. The full YoPratiqo module unlocks every lesson, the flashcards, and the pronunciation drills.",
    cta: "Unlock the module — $24.99 CAD",
    supporting: "Secure payment via Stripe. Immediate access after purchase.",
    ariaCta:
      "Unlock the full YoPratiqo module for 24.99 Canadian dollars. Secure payment on Stripe.",
  },
  es: {
    eyebrow: "Módulo premium · YoPratiqo",
    title: "Continúa con el módulo completo",
    body: "Terminaste la intro gratuita. El módulo completo de YoPratiqo desbloquea todas las lecciones, las flashcards y los ejercicios de pronunciación.",
    cta: "Desbloquear el módulo — 24,99 $ CAD",
    supporting: "Pago seguro con Stripe. Acceso inmediato tras la compra.",
    ariaCta:
      "Desbloquear el módulo completo de YoPratiqo por 24,99 dólares canadienses. Pago seguro en Stripe.",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

// ── Variants ──────────────────────────────────────────────────────────

/**
 * `inline` — compact card meant to live directly after the free intro
 * section. One single column. Only the eyebrow + button + supporting
 * line; no extra "title" / "body" prose so it does not duplicate the
 * intro copy directly above it.
 *
 * `locked-card` — full "locked content" tile meant to live where the
 * paid lessons would normally appear. Includes the title, the body
 * paragraph, the button, and the supporting line, all wrapped in a
 * single visually-locked frame with a small padlock icon.
 */
export type YoPremiumModuleUnlockCTAVariant = "inline" | "locked-card";

export type YoPremiumModuleUnlockCTAProps = {
  /**
   * Id of the paid module — matches the corresponding entry in
   * `yopratiqoProductConfig.futurePremiumModules`. Today only
   * `"dr-spanish-a1"` and `"fr-quebec-workplace-survival-1"` are
   * known ids; unknown ids cause the card to render `null`.
   */
  moduleId: string;
  locale: YoLocale;
  variant?: YoPremiumModuleUnlockCTAVariant;
  /**
   * Optional surface id used for analytics-style data attributes
   * — never sent to Stripe; only used by the contract tests to
   * verify the CTA is mounted in the expected spots.
   */
  surfaceId?: string;
  className?: string;
};

// ── Component ─────────────────────────────────────────────────────────

export function YoPremiumModuleUnlockCTA({
  moduleId,
  locale,
  variant = "inline",
  surfaceId,
  className,
}: YoPremiumModuleUnlockCTAProps): React.JSX.Element | null {
  const checkoutUrl = getYopratiqoPremiumCheckoutUrl(moduleId);
  if (!checkoutUrl) return null;

  const l = safeLocale(locale);
  const copy = COPY[l];

  const ctaButton = (
    <Link
      href={checkoutUrl}
      // External (Stripe) — open in a new tab so the user does
      // not lose their place on the YoPratiqo course home, and
      // strip referrer + opener for safety.
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.ariaCta}
      data-testid="yo-premium-unlock-cta-button"
      data-yo-premium-unlock-cta-button={moduleId}
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
      data-testid="yo-premium-unlock-cta-supporting"
      className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-[#5B5240] sm:text-[13px]"
    >
      <ShieldCheck
        aria-hidden
        className="mt-[1px] h-4 w-4 shrink-0 text-[#13A085]"
      />
      <span>{copy.supporting}</span>
    </p>
  );

  const eyebrow = (
    <p
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F8973] sm:text-[11.5px]",
      )}
    >
      {copy.eyebrow}
    </p>
  );

  // ── Inline variant ────────────────────────────────────────────────
  if (variant === "inline") {
    return (
      <aside
        data-testid="yo-premium-unlock-cta"
        data-yo-premium-unlock-cta={moduleId}
        data-yo-premium-unlock-cta-variant="inline"
        data-yo-premium-unlock-cta-surface={surfaceId ?? "default"}
        className={cn(
          "flex w-full flex-col items-stretch rounded-[1.5rem] border border-[#E7DFCF] bg-gradient-to-br from-[#FBF7EE] to-[#F4EFE6] p-5 shadow-[0_14px_32px_rgba(23,38,66,0.06)] sm:p-6",
          className,
        )}
      >
        {eyebrow}
        <div className="mt-4">{ctaButton}</div>
        {supportingLine}
      </aside>
    );
  }

  // ── Locked-card variant ───────────────────────────────────────────
  return (
    <aside
      data-testid="yo-premium-unlock-cta"
      data-yo-premium-unlock-cta={moduleId}
      data-yo-premium-unlock-cta-variant="locked-card"
      data-yo-premium-unlock-cta-surface={surfaceId ?? "default"}
      className={cn(
        "relative flex w-full flex-col items-stretch overflow-hidden rounded-[1.75rem] border border-[#E7DFCF] bg-white p-5 shadow-[0_18px_42px_rgba(23,38,66,0.07)] sm:p-6",
        className,
      )}
    >
      {/* Subtle warm-cream overlay so the card reads as "locked
       *  premium content" without going grey or sad. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FBF7EE]/70 via-transparent to-[#E3F1EB]/40"
      />
      <div className="relative flex flex-col items-stretch">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#13A085]/30 bg-[#E3F1EB] text-[#0F8973]"
          >
            <Lock className="h-4 w-4" />
          </span>
          {eyebrow}
        </div>
        <h3
          data-testid="yo-premium-unlock-cta-title"
          className="mt-3 font-yo-app-display text-[20px] font-semibold leading-tight text-[#172642] sm:text-[22px]"
        >
          {copy.title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#3A3A3A] sm:text-[15px]">
          {copy.body}
        </p>
        <div className="mt-5">{ctaButton}</div>
        {supportingLine}
      </div>
    </aside>
  );
}
