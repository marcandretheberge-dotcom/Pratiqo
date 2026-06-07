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
 *     with conditional retroactive commercial volume rebate eligibility
 *     on higher tiers.
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
  /**
   * Membre Pro: monthly subscription price in CAD displayed at checkout.
   *
   * This is the *numeric* value used for math (annualization, break-even
   * formula). The authoritative cents amount lives in the Stripe Dashboard
   * on the Price referenced by `STRIPE_PRO_MONTHLY_PRICE_ID`
   * (`unit_amount = 2999`); this constant must match it.
   *
   * For locale-aware *display* (FR/ES use a comma decimal mark while EN
   * uses a dot), use `proMonthlyPriceCadDisplay` below — never interpolate
   * `proMonthlyPriceCad` directly into FR/ES user-facing copy.
   */
  proMonthlyPriceCad: 29.99,
  /**
   * Locale-aware display string for the monthly price (digits only, no
   * currency mark). Keeps FR/ES "29,99" and EN "29.99" consistent across
   * every user-facing surface.
   */
  proMonthlyPriceCadDisplay: {
    fr: "29,99",
    en: "29.99",
    es: "29,99",
  },
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
  /** Annual Pro Member commercial volume rebate add-on by marketplace tier. */
  proRistourneRange: { goldPercent: 0.5, platinumPercent: 1 },
  /**
   * Legacy internal field names are retained for compatibility. Public
   * copy must describe this as a conditional retroactive commercial volume
   * rebate, not profit participation or investment return. YoPratiqo and
   * other separate self-paced products are excluded.
   */
  annualProfitSharingPoolPercent: 5,
  /** Annual commercial volume rebate global cap in CAD. */
  annualProfitSharingPoolCapCad: 150_000,
  /** Minimum eligible Pro teachers required to activate the annual pool. */
  annualProfitSharingMinimumEligibleTeachers: 10,
  /** Maximum annual commercial volume rebate amount per eligible teacher in CAD. */
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
  /**
   * Dedicated automatic-renewal disclosure label rendered next to the
   * V9-mandated checkbox. This is the literal wording the teacher must
   * tick before the Stripe Pro checkout can be started.
   */
  renewalAcceptanceLabel: string;
  /** Alert shown when the renewal-acceptance checkbox is not ticked. */
  alertMustAcceptRenewal: string;
};

const COMMON_PRO_BADGE = "Membre Pro";

/** Locale-aware copy for `app/(app)/upgrade/page.tsx`. */
export const UPGRADE_PAGE_COPY: Record<Locale, UpgradePageCopy> = {
  fr: {
    eyebrow: "Monétisation",
    heading: "Devenir Membre Pro",
    summary: `Membre Pro : élèves illimités, commission à partir de ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent} % avec paliers, ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr} $CA / mois + taxes applicables.`,
    badge: "Membre Pro",
    freePlanTitle: "Gratuit",
    proPlanTitle: "Membre Pro",
    freePlanPrice: "0 $",
    proPlanPrice: `${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr} $CA / mois + taxes applicables`,
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
      "Les commissions, paliers et avantages affichés peuvent varier selon le plan applicable, les promotions, le volume admissible et les conditions indiquées sur la plateforme. Le statut Membre Pro peut améliorer certains signaux de visibilité, mais ne garantit ni positionnement, ni visibilité, ni réservations, ni élèves, ni revenus. Les professeurs demeurent des travailleurs autonomes.",
    proPlanPrioritySupport: "Support prioritaire (bientôt)",
    comingSoonNote: "Plan Entreprise et cours de groupe — bientôt disponibles.",
    disclosureLead:
      `L’abonnement Membre Pro coûte ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr} $CA / mois + taxes applicables, et est facturé mensuellement à l’avance. Il se `,
    disclosureRenewBold: "renouvelle automatiquement",
    disclosureRenewTail:
      " jusqu’à l’annulation. Tu peux annuler en tout temps depuis ton tableau de bord ou en écrivant à support@pratiqo.ca; l’annulation prend effet à la fin de la période payée en cours. ",
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
    renewalAcceptanceLabel: `Membre Pro est un abonnement mensuel renouvelé automatiquement au prix de ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr} $CA / mois + taxes applicables, jusqu’à annulation. Vous pouvez annuler le renouvellement futur à partir de votre compte, sous réserve des conditions applicables.`,
    alertMustAcceptRenewal:
      "Tu dois accepter le renouvellement automatique mensuel pour continuer.",
  },
  en: {
    eyebrow: "Monetization",
    heading: "Become a Pro Member",
    summary: `Pro Member: unlimited students, commission starting at ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}% with tiers, $${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en} CAD / month + applicable taxes.`,
    badge: "Pro Member",
    freePlanTitle: "Free",
    proPlanTitle: "Pro Member",
    freePlanPrice: "$0",
    proPlanPrice: `$${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en} CAD / month + applicable taxes`,
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
      "Displayed commissions, tiers, and benefits may vary depending on the applicable plan, promotions, eligible volume, and conditions shown on the platform. Pro Member status may improve certain visibility signals, but does not guarantee ranking, visibility, bookings, students, or income. Teachers remain independent contractors.",
    proPlanPrioritySupport: "Priority support (coming soon)",
    comingSoonNote: "Enterprise plan and group lessons — coming soon.",
    disclosureLead:
      `The Pro Member subscription costs $${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en} CAD per month, plus applicable taxes, and is billed monthly in advance. It `,
    disclosureRenewBold: "renews automatically",
    disclosureRenewTail:
      " until cancelled. You can cancel any time from your dashboard or by writing to support@pratiqo.ca; cancellation takes effect at the end of the current paid billing period. ",
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
    renewalAcceptanceLabel: `Pro Member is a monthly subscription that renews automatically at $${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en} CAD / month + applicable taxes until cancelled. You can cancel future renewal from your account, subject to applicable terms.`,
    alertMustAcceptRenewal:
      "You must accept the monthly automatic renewal to continue.",
  },
  es: {
    eyebrow: "Monetización",
    heading: "Hacerse Miembro Pro",
    summary: `Miembro Pro: estudiantes ilimitados, comisión desde ${MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent}% con niveles, ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es} $CA / mes + impuestos aplicables.`,
    badge: "Miembro Pro",
    freePlanTitle: "Gratis",
    proPlanTitle: "Miembro Pro",
    freePlanPrice: "$0",
    proPlanPrice: `${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es} $CA / mes + impuestos aplicables`,
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
      "Las comisiones, niveles y beneficios mostrados pueden variar según el plan aplicable, las promociones, el volumen admisible y las condiciones indicadas en la plataforma. El estado Miembro Pro puede mejorar ciertas señales de visibilidad, pero no garantiza posicionamiento, visibilidad, reservas, estudiantes ni ingresos. Los profesores siguen siendo trabajadores independientes.",
    proPlanPrioritySupport: "Soporte prioritario (pronto)",
    comingSoonNote: "Plan Empresa y clases grupales — próximamente.",
    disclosureLead:
      `La membresía Miembro Pro cuesta ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es} $CA al mes, más los impuestos aplicables, y se factura mensualmente por adelantado. Se `,
    disclosureRenewBold: "renueva automáticamente",
    disclosureRenewTail:
      " hasta su cancelación. Puedes cancelarla en cualquier momento desde tu panel o escribiendo a support@pratiqo.ca; la cancelación entra en vigor al final del período pagado en curso. ",
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
    renewalAcceptanceLabel: `Miembro Pro es una suscripción mensual que se renueva automáticamente a ${MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es} $CA / mes + impuestos aplicables hasta su cancelación. Puedes cancelar la renovación futura desde tu cuenta, sujeto a las condiciones aplicables.`,
    alertMustAcceptRenewal:
      "Debes aceptar la renovación automática mensual para continuar.",
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
