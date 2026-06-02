/**
 * Membre Pro / Pro Member / Miembro Pro — display config.
 *
 * Centralizes the locale-aware product brand, the canonical legal route slugs
 * and the plan figures rendered on the paid upgrade page so that future tweaks
 * (renaming, copy edits, percentage changes) flow from a single source.
 *
 * Important boundaries:
 * - This module is purely display config. It does not contain Stripe price
 *   IDs, Stripe behaviour, or any payment business rules — Stripe remains the
 *   authoritative source at checkout.
 * - The numeric figures (commission percentages, free-plan student limit,
 *   subscription price) are values that the user has approved to display in
 *   the upgrade UI; the audit explicitly allows hardcoded display values that
 *   are already shown to the teacher at the checkout/dashboard.
 * - No legal promises live here. Every cautious legal hedge (no income
 *   guarantee, ranking caveats, refund rules, …) lives in the canonical
 *   /legal/* markdown documents, not in this config.
 */
import type { Locale } from "@/lib/i18n/types";

/** Canonical legal routes referenced from the upgrade and booking flows. */
export const LEGAL_ROUTES = {
  cgu: "/legal/cgu",
  confidentialite: "/legal/confidentialite",
  annulation: "/legal/annulation",
  paiements: "/legal/paiements-remboursements",
  conditionsProfesseurs: "/legal/conditions-professeurs",
  membrePro: "/legal/membre-pro",
  codeDeConduite: "/legal/code-de-conduite",
} as const;

export type LegalRouteKey = keyof typeof LEGAL_ROUTES;

/**
 * Plan economic figures rendered in the upgrade UI.
 *
 * Pratiqo's canonical commission model is *régressive / declining*:
 *   - Free plan: 15 % at the entry tier, decreasing toward 12 %.
 *   - Membre Pro: 5 % at the entry tier, decreasing toward 3.5 %,
 *     with annual ristourne/profit-sharing eligibility on higher tiers.
 *
 * Stripe still authoritatively quotes the subscription price at checkout;
 * the figures below are only used for the at-a-glance comparison cards
 * and the marketing one-liner above them. The actual tier breakpoints,
 * eligibility rules, and applicable conditions are documented on /tarifs
 * and in the /legal/membre-pro terms.
 *
 * `freeCommissionPercent` / `proCommissionPercent` are kept for backward
 * compatibility — they correspond to the *entry* (start) percentage and
 * are equivalent to `*CommissionRange.startPercent` below.
 */
export const MEMBRE_PRO_PLAN = {
  /** Free plan entry-tier commission (= startPercent of freeCommissionRange). */
  freeCommissionPercent: 15,
  /** Free plan: max active concurrent students before requiring Membre Pro. */
  freeActiveStudentLimit: 5,
  /** Membre Pro entry-tier commission (= startPercent of proCommissionRange). */
  proCommissionPercent: 5,
  /** Membre Pro: monthly subscription price in CAD displayed at checkout. */
  proMonthlyPriceCad: 29,
} as const;

/**
 * Canonical declining-commission model for the marketplace.
 *
 * Single source of truth consumed by `/upgrade`, `/tarifs` and any test
 * that asserts the two surfaces stay aligned. We intentionally keep
 * tier breakpoints out of this constant — they live in the i18n
 * dictionary so marketing can iterate without code changes — but the
 * start/best percent pair is fixed here so tests can assert it.
 */
export const MEMBRE_PRO_COMMISSION_MODEL = {
  /** Free plan commission range (entry → best tier). */
  freeCommissionRange: { startPercent: 15, bestPercent: 12 },
  /** Membre Pro commission range (entry → best tier). */
  proCommissionRange: { startPercent: 5, bestPercent: 3.5 },
  /** Annual Pro Member ristourne / profit-sharing bonus by marketplace tier. */
  proRistourneRange: { goldPercent: 0.5, platinumPercent: 1 },
  /** Annual profit-sharing pool percentage of Pratiqo net profits. */
  annualProfitSharingPoolPercent: 5,
  /** Annual profit-sharing pool cap in CAD. */
  annualProfitSharingPoolCapCad: 150_000,
  /** Minimum eligible Pro teachers required to activate the annual pool. */
  annualProfitSharingMinimumEligibleTeachers: 10,
  /** Maximum annual profit-sharing amount per eligible teacher in CAD. */
  annualProfitSharingMaxPerTeacherCad: 10_000,
  /**
   * Whether the marketplace exposes a tiered (declining) commission
   * model on /tarifs. When true, `/upgrade` must use cautious "starting
   * at X %, with tiers that may reduce the commission" wording rather
   * than implying a flat percentage. Tests guard against regressions.
   */
  hasTieredCommission: true,
} as const;

type UpgradePageCopy = {
  /** Eyebrow above the H1 ("Monétisation"). */
  eyebrow: string;
  /** Page H1 ("Devenir Membre Pro"). */
  heading: string;
  /** One-liner under the H1 summarizing the offer. */
  summary: string;
  /** Status pill text shown next to the H1 ("Membre Pro"). */
  badge: string;
  /** Card title for the free tier. */
  freePlanTitle: string;
  /** Card title for Membre Pro. */
  proPlanTitle: string;
  /** Display price of the free plan ("0 $"). */
  freePlanPrice: string;
  /** Display price of Membre Pro per month, locale-formatted. */
  proPlanPrice: string;
  /** Free plan feature bullet about active student cap. */
  freePlanActiveStudentLimit: string;
  /** Free plan feature bullet about the commission (cautious, range-aware). */
  freePlanCommission: string;
  /**
   * Free plan secondary line under the commission bullet — explains that
   * tiers can lower the percentage based on eligible volume. Cautious
   * wording: "may", "starting at", "based on eligible volume".
   */
  freePlanCommissionBody: string;
  /** Membre Pro feature bullet: unlimited students. */
  proPlanUnlimitedStudents: string;
  /** Membre Pro feature bullet: reduced commission (cautious, range-aware). */
  proPlanCommission: string;
  /**
   * Membre Pro secondary line under the commission bullet — explains
   * that tiers can lower the percentage based on eligible volume.
   */
  proPlanCommissionBody: string;
  /** Compact label "Voir les paliers sur /tarifs" link visible on the cards. */
  seeTiersLinkLabel: string;
  /** Pre-CTA legal-safe disclaimer paragraph (commission/ranking caveats). */
  commissionDisclaimer: string;
  /** Membre Pro feature bullet: priority support (note: shown as "soon"). */
  proPlanPrioritySupport: string;
  /** Footnote under the comparison cards. */
  comingSoonNote: string;
  /** Pre-checkbox disclosure paragraph (taxes, renewal, cancel anytime). */
  disclosureLead: string;
  /**
   * Bold word inside the disclosure that should be visually emphasized
   * ("renouvelle automatiquement" / "renews automatically" / …).
   */
  disclosureRenewBold: string;
  /** Tail of the disclosure sentence after the bold word. */
  disclosureRenewTail: string;
  /** Sentence introducing the policy links inside the disclosure. */
  disclosureLinksLead: string;
  /** Visible label for the Membre Pro Terms link in the disclosure. */
  disclosureMembreProLinkLabel: string;
  /** Conjunction inserted between the two disclosure links ("et dans la "). */
  disclosureLinkConjunction: string;
  /** Visible label for the Payments policy link in the disclosure. */
  disclosurePaymentsLinkLabel: string;
  /** Acceptance checkbox prefix ("J'accepte les"). */
  acceptPrefix: string;
  /** Acceptance link label for /legal/cgu. */
  acceptCguLabel: string;
  /** Comma+space rendered between consecutive acceptance links. */
  acceptLinkSeparator: string;
  /** Acceptance link label for /legal/membre-pro. */
  acceptMembreProLabel: string;
  /** Acceptance link label for /legal/annulation. */
  acceptAnnulationLabel: string;
  /** Conjunction before the final acceptance link ("et la "). */
  acceptLinkFinalConjunction: string;
  /** Acceptance link label for /legal/confidentialite. */
  acceptConfidentialiteLabel: string;
  /** Primary CTA on the page ("Devenir Membre Pro"). */
  primaryCta: string;
  /** Primary CTA label while the redirect to Stripe is in flight. */
  primaryCtaLoading: string;
  /** Secondary CTA: sign out. */
  signOutCta: string;
  /** Alert shown when the user clicks CTA without checking the box. */
  alertMustAcceptLegal: string;
  /** Alert shown when the user is not signed in. */
  alertSignInRequired: string;
  /** Alert shown when the Supabase session has expired. */
  alertSessionExpired: string;
  /** Generic alert when the Stripe checkout fetch fails. */
  alertStripeError: string;
};

const COMMON_PRO_BADGE = "Membre Pro";

/** Locale-aware copy for `app/(app)/upgrade/page.tsx`. */
export const UPGRADE_PAGE_COPY: Record<Locale, UpgradePageCopy> = {
  fr: {
    eyebrow: "Monétisation",
    heading: "Devenir Membre Pro",
    summary: `Membre Pro : élèves illimités, commission à partir de ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent} % avec paliers, ${MEMBRE_PRO_PLAN.proMonthlyPriceCad} $/mois.`,
    badge: "Membre Pro",
    freePlanTitle: "Gratuit",
    proPlanTitle: "Membre Pro",
    freePlanPrice: "0 $",
    proPlanPrice: `${MEMBRE_PRO_PLAN.proMonthlyPriceCad} $/mois`,
    freePlanActiveStudentLimit: `Jusqu’à ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} élèves actifs`,
    freePlanCommission: `Commission standard à partir de ${MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent} %`,
    freePlanCommissionBody:
      "Avec paliers pouvant réduire la commission selon le volume admissible.",
    proPlanUnlimitedStudents: "Élèves illimités",
    proPlanCommission: `Commission réduite à partir de ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent} %`,
    proPlanCommissionBody:
      "Avec paliers pouvant aller plus bas selon le volume admissible. Les paliers et conditions applicables sont indiqués sur la plateforme.",
    seeTiersLinkLabel: "Voir les paliers sur /tarifs",
    commissionDisclaimer:
      "Les commissions, paliers et avantages affichés peuvent varier selon le plan applicable, les promotions, le volume admissible et les conditions indiquées sur la plateforme. Le statut Membre Pro peut améliorer certains signaux de visibilité, mais ne garantit ni positionnement, ni réservations, ni revenus.",
    proPlanPrioritySupport: "Support prioritaire (bientôt)",
    comingSoonNote: "Plan Entreprise et cours de groupe — bientôt disponibles.",
    disclosureLead:
      "Les taxes applicables peuvent s’ajouter au moment du paiement. L’abonnement Membre Pro est facturé selon le cycle indiqué et se ",
    disclosureRenewBold: "renouvelle automatiquement",
    disclosureRenewTail:
      " jusqu’à l’annulation. Tu peux annuler en tout temps depuis ton tableau de bord. ",
    disclosureLinksLead:
      "Les modalités complètes — facturation, renouvellement, annulation, remboursements et avantages — figurent dans les ",
    disclosureMembreProLinkLabel: "Conditions Membre Pro",
    disclosureLinkConjunction: " et dans la ",
    disclosurePaymentsLinkLabel: "Politique des paiements",
    acceptPrefix: "J’accepte les ",
    acceptCguLabel: "CGU",
    acceptLinkSeparator: ", ",
    acceptMembreProLabel: "Conditions Membre Pro",
    acceptAnnulationLabel: "politique d’annulation",
    acceptLinkFinalConjunction: " et la ",
    acceptConfidentialiteLabel: "politique de confidentialité",
    primaryCta: "Devenir Membre Pro",
    primaryCtaLoading: "Redirection…",
    signOutCta: "Déconnexion",
    alertMustAcceptLegal:
      "Tu dois accepter les CGU, les Conditions Membre Pro, la politique d’annulation et la politique de confidentialité.",
    alertSignInRequired: "Veuillez vous connecter.",
    alertSessionExpired: "Session expirée. Reconnecte-toi.",
    alertStripeError: "Erreur",
  },
  en: {
    eyebrow: "Monetization",
    heading: "Become a Pro Member",
    summary: `Pro Member: unlimited students, commission starting at ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}% with tiers, $${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/month.`,
    badge: "Pro Member",
    freePlanTitle: "Free",
    proPlanTitle: "Pro Member",
    freePlanPrice: "$0",
    proPlanPrice: `$${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/month`,
    freePlanActiveStudentLimit: `Up to ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} active students`,
    freePlanCommission: `Standard commission starting at ${MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent}%`,
    freePlanCommissionBody:
      "With tiers that may reduce the commission based on eligible volume.",
    proPlanUnlimitedStudents: "Unlimited students",
    proPlanCommission: `Reduced commission starting at ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}%`,
    proPlanCommissionBody:
      "With tiers that may go lower based on eligible volume. Applicable tiers and conditions are displayed on the platform.",
    seeTiersLinkLabel: "View tiers on /tarifs",
    commissionDisclaimer:
      "Displayed commissions, tiers, and benefits may vary depending on the applicable plan, promotions, eligible volume, and conditions shown on the platform. Pro Member status may improve certain visibility signals, but does not guarantee ranking, bookings, or income.",
    proPlanPrioritySupport: "Priority support (coming soon)",
    comingSoonNote: "Enterprise plan and group lessons — coming soon.",
    disclosureLead:
      "Applicable taxes may be added at checkout. The Pro Member subscription is billed on the displayed cycle and ",
    disclosureRenewBold: "renews automatically",
    disclosureRenewTail:
      " until cancelled. You can cancel any time from your dashboard. ",
    disclosureLinksLead:
      "Full terms — billing, renewal, cancellation, refunds and benefits — are set out in the ",
    disclosureMembreProLinkLabel: "Pro Member Terms",
    disclosureLinkConjunction: " and the ",
    disclosurePaymentsLinkLabel: "Payments Policy",
    acceptPrefix: "I accept the ",
    acceptCguLabel: "Terms of Use",
    acceptLinkSeparator: ", ",
    acceptMembreProLabel: "Pro Member Terms",
    acceptAnnulationLabel: "cancellation policy",
    acceptLinkFinalConjunction: " and the ",
    acceptConfidentialiteLabel: "privacy policy",
    primaryCta: "Become a Pro Member",
    primaryCtaLoading: "Redirecting…",
    signOutCta: "Sign out",
    alertMustAcceptLegal:
      "You must accept the Terms of Use, the Pro Member Terms, the cancellation policy and the privacy policy.",
    alertSignInRequired: "Please sign in.",
    alertSessionExpired: "Session expired. Please sign in again.",
    alertStripeError: "Error",
  },
  es: {
    eyebrow: "Monetización",
    heading: "Hacerse Miembro Pro",
    summary: `Miembro Pro: estudiantes ilimitados, comisión desde ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}% con niveles, $${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/mes.`,
    badge: "Miembro Pro",
    freePlanTitle: "Gratis",
    proPlanTitle: "Miembro Pro",
    freePlanPrice: "$0",
    proPlanPrice: `$${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/mes`,
    freePlanActiveStudentLimit: `Hasta ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} estudiantes activos`,
    freePlanCommission: `Comisión estándar desde el ${MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent}%`,
    freePlanCommissionBody:
      "Con niveles que pueden reducir la comisión según el volumen admisible.",
    proPlanUnlimitedStudents: "Estudiantes ilimitados",
    proPlanCommission: `Comisión reducida desde el ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}%`,
    proPlanCommissionBody:
      "Con niveles que pueden bajar según el volumen admisible. Los niveles y condiciones aplicables se muestran en la plataforma.",
    seeTiersLinkLabel: "Ver niveles en /tarifs",
    commissionDisclaimer:
      "Las comisiones, niveles y beneficios mostrados pueden variar según el plan aplicable, las promociones, el volumen admisible y las condiciones indicadas en la plataforma. El estado Miembro Pro puede mejorar ciertas señales de visibilidad, pero no garantiza posicionamiento, reservas ni ingresos.",
    proPlanPrioritySupport: "Soporte prioritario (pronto)",
    comingSoonNote: "Plan Empresa y clases grupales — próximamente.",
    disclosureLead:
      "Los impuestos aplicables pueden agregarse al momento del pago. La membresía Miembro Pro se factura según el ciclo indicado y se ",
    disclosureRenewBold: "renueva automáticamente",
    disclosureRenewTail:
      " hasta su cancelación. Puedes cancelarla en cualquier momento desde tu panel. ",
    disclosureLinksLead:
      "Los términos completos — facturación, renovación, cancelación, reembolsos y beneficios — figuran en las ",
    disclosureMembreProLinkLabel: "Condiciones de Miembro Pro",
    disclosureLinkConjunction: " y en la ",
    disclosurePaymentsLinkLabel: "Política de pagos",
    acceptPrefix: "Acepto las ",
    acceptCguLabel: "Condiciones de uso",
    acceptLinkSeparator: ", ",
    acceptMembreProLabel: "Condiciones de Miembro Pro",
    acceptAnnulationLabel: "política de cancelación",
    acceptLinkFinalConjunction: " y la ",
    acceptConfidentialiteLabel: "política de privacidad",
    primaryCta: "Hacerse Miembro Pro",
    primaryCtaLoading: "Redirigiendo…",
    signOutCta: "Cerrar sesión",
    alertMustAcceptLegal:
      "Debes aceptar las Condiciones de uso, las Condiciones de Miembro Pro, la política de cancelación y la política de privacidad.",
    alertSignInRequired: "Por favor, inicia sesión.",
    alertSessionExpired: "Sesión expirada. Vuelve a iniciar sesión.",
    alertStripeError: "Error",
  },
};

/** Convenience: resolve the upgrade-page copy for a given locale. */
export function getUpgradeCopy(locale: Locale): UpgradePageCopy {
  return UPGRADE_PAGE_COPY[locale] ?? UPGRADE_PAGE_COPY.fr;
}

/**
 * The locale-aware brand label for the Membre Pro product, useful in places
 * that need a one-line reference (badges, nav, footer fallback).
 */
export const MEMBRE_PRO_BRAND_BY_LOCALE: Record<Locale, string> = {
  fr: "Membre Pro",
  en: "Pro Member",
  es: "Miembro Pro",
};

export { COMMON_PRO_BADGE };
