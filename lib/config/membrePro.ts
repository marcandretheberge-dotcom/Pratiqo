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
 * The MVP launch offer is a single Membre Pro tier with reduced commission.
 * Stripe still authoritatively quotes the price at checkout; the values below
 * are only used for the at-a-glance comparison cards and the marketing
 * one-liner above them.
 */
export const MEMBRE_PRO_PLAN = {
  /** Free plan: % commission Pratiqo retains on each transaction. */
  freeCommissionPercent: 10,
  /** Free plan: max active concurrent students before requiring Membre Pro. */
  freeActiveStudentLimit: 5,
  /** Membre Pro: % commission Pratiqo retains on each transaction. */
  proCommissionPercent: 5,
  /** Membre Pro: monthly subscription price in CAD displayed at checkout. */
  proMonthlyPriceCad: 29,
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
  /** Free plan feature bullet about the commission. */
  freePlanCommission: string;
  /** Membre Pro feature bullet: unlimited students. */
  proPlanUnlimitedStudents: string;
  /** Membre Pro feature bullet: reduced commission. */
  proPlanCommission: string;
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
    summary: `Membre Pro : élèves illimités, ${MEMBRE_PRO_PLAN.proCommissionPercent} % de commission, ${MEMBRE_PRO_PLAN.proMonthlyPriceCad} $/mois.`,
    badge: "Membre Pro",
    freePlanTitle: "Gratuit",
    proPlanTitle: "Membre Pro",
    freePlanPrice: "0 $",
    proPlanPrice: `${MEMBRE_PRO_PLAN.proMonthlyPriceCad} $/mois`,
    freePlanActiveStudentLimit: `Jusqu’à ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} élèves actifs`,
    freePlanCommission: `${MEMBRE_PRO_PLAN.freeCommissionPercent} % de commission`,
    proPlanUnlimitedStudents: "Élèves illimités",
    proPlanCommission: `${MEMBRE_PRO_PLAN.proCommissionPercent} % de commission`,
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
    summary: `Pro Member: unlimited students, ${MEMBRE_PRO_PLAN.proCommissionPercent}% commission, $${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/month.`,
    badge: "Pro Member",
    freePlanTitle: "Free",
    proPlanTitle: "Pro Member",
    freePlanPrice: "$0",
    proPlanPrice: `$${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/month`,
    freePlanActiveStudentLimit: `Up to ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} active students`,
    freePlanCommission: `${MEMBRE_PRO_PLAN.freeCommissionPercent}% commission`,
    proPlanUnlimitedStudents: "Unlimited students",
    proPlanCommission: `${MEMBRE_PRO_PLAN.proCommissionPercent}% commission`,
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
    summary: `Miembro Pro: estudiantes ilimitados, ${MEMBRE_PRO_PLAN.proCommissionPercent}% de comisión, $${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/mes.`,
    badge: "Miembro Pro",
    freePlanTitle: "Gratis",
    proPlanTitle: "Miembro Pro",
    freePlanPrice: "$0",
    proPlanPrice: `$${MEMBRE_PRO_PLAN.proMonthlyPriceCad}/mes`,
    freePlanActiveStudentLimit: `Hasta ${MEMBRE_PRO_PLAN.freeActiveStudentLimit} estudiantes activos`,
    freePlanCommission: `${MEMBRE_PRO_PLAN.freeCommissionPercent}% de comisión`,
    proPlanUnlimitedStudents: "Estudiantes ilimitados",
    proPlanCommission: `${MEMBRE_PRO_PLAN.proCommissionPercent}% de comisión`,
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
