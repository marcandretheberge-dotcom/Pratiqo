/**
 * Planned package launch monitoring — read-only admin safety snapshot.
 *
 * Reuses launch gate / readiness / order reconciliation. No mutations,
 * no money movement, no secrets.
 *
 * See docs/product/planned-package-launch-monitoring.md
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  listAdminPlannedPackageOrders,
  type AdminPlannedPackageOrderListRow,
  type AdminPlannedPackageOrdersSummary,
} from "@/lib/admin/plannedPackageOrderOperations";
import { canUsePlannedPackageAdminOps } from "./plannedPackageAdminOps";
import {
  getPlannedPackageActivationStatus,
  getPlannedPackageLaunchFlagProfile,
} from "./plannedPackageLaunchProfile";
import {
  evaluatePlannedPackagePublicLaunchGate,
  getPlannedPackageLaunchMode,
  isPlannedPackagePublicPurchaseEnabled,
  PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
} from "./plannedPackagePublicLaunchGate";
import { isPackageLegalReviewCompleted } from "./plannedPackages";
import { isStudentPlannedPackageDashboardEnabled } from "./plannedPackageStudentDashboard";
import { isTeacherPlannedPackageDashboardEnabled } from "./plannedPackageTeacherDashboard";
import type { PlannedPackageAttentionReason } from "./plannedPackageReconciliation";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type LaunchMonitorSeverity = "info" | "warning" | "critical";

export type PlannedPackageStuckStateCode =
  | "pending_order_hold_expired_but_not_cancelled"
  | "checkout_started_no_webhook"
  | "checkout_completed_order_not_payment_confirmed"
  | "payment_confirmed_not_fulfilled"
  | "fulfilled_order_missing_bookings"
  | "bookings_created_missing_student_dashboard_visibility"
  | "bookings_created_missing_teacher_dashboard_visibility"
  | "completed_booking_missing_payout_eligibility"
  | "refund_quote_approved_but_not_executed"
  | "transfer_required_but_not_executed"
  | "transfer_reversal_required_before_refund"
  | "transfer_reversal_failed"
  | "refund_execution_failed"
  | "teacher_terms_missing_for_public_offer"
  | "learner_terms_missing_for_pending_order"
  | "teacher_stripe_readiness_missing"
  | "public_purchase_enabled_but_legal_review_missing"
  | "student_dashboard_disabled_while_public_purchase_enabled"
  | "teacher_dashboard_disabled_while_public_purchase_enabled";

export type PlannedPackageStuckState = {
  code: PlannedPackageStuckStateCode;
  severity: LaunchMonitorSeverity;
  orderId: string | null;
  shortId: string | null;
  message: string;
  recommendedAction: string;
  detailHref: string | null;
};

export type PlannedPackageLaunchMonitorRecentOrder = {
  id: string;
  shortId: string;
  createdAt: string | null;
  status: string;
  teacherLabel: string | null;
  teacherId: string | null;
  learnerLabel: string | null;
  offerTitle: string;
  totalPriceCents: number;
  currency: string;
  sessionCount: number;
  checkoutStatus: string | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  bookingCountHint: string;
  dashboardVisibility: {
    studentDashboardEnabled: boolean;
    teacherDashboardEnabled: boolean;
  };
  needsAttention: boolean;
  attentionReasons: PlannedPackageAttentionReason[];
  detailHref: string;
};

export type PlannedPackageLaunchMonitoringSnapshot = {
  generatedAt: string;
  readOnly: true;
  mutatesData: false;
  secretsExposed: false;
  automaticFixesExecuted: false;
  launchGate: {
    launchMode: string;
    publicPurchaseEnabled: boolean;
    publicPurchaseBlocked: boolean;
    activationStatus: string;
    legalReviewCompleted: boolean;
    legalReviewRequired: true;
    learnerTermsRequired: true;
    teacherTermsRequired: true;
    stripeReadinessRequired: true;
    termsVersion: string;
    blockers: string[];
    warnings: string[];
  };
  flags: {
    publicPurchase: boolean;
    studentDashboard: boolean;
    teacherDashboard: boolean;
    adminOps: boolean;
    missingActivationFlags: string[];
  };
  legalReview: {
    completed: boolean;
    required: true;
  };
  stripeConfig: {
    secretKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    checkoutMode: "test" | "live" | "unknown" | "missing";
  };
  webhookHealth: {
    webhookSecretConfigured: boolean;
    lastWebhookReceivedAt: string | null;
    ordersWithWebhookInLast24h: number;
    ordersWithWebhookInLast7d: number;
    checkoutCompletedMissingPaymentConfirm: number;
    checkoutStartedMissingWebhook: number;
  };
  orderStats: AdminPlannedPackageOrdersSummary | null;
  recentOrders: PlannedPackageLaunchMonitorRecentOrder[];
  stuckStates: PlannedPackageStuckState[];
  financialOpsHealth: {
    refunds: {
      attentionApprovedNotExecuted: number;
      attentionExecutionFailed: number;
      attentionWaitingOnReversal: number;
    };
    transfers: {
      attentionEligibleNotExecuted: number;
      attentionExecutionFailed: number;
      attentionMissingEligibility: number;
    };
    reversals: {
      attentionRequired: number;
      attentionFailed: number;
      attentionPartiallyReversed: number;
    };
  };
  dashboardHealth: {
    studentDashboardEnabled: boolean;
    teacherDashboardEnabled: boolean;
    publicPurchaseWithoutStudentDashboard: boolean;
    publicPurchaseWithoutTeacherDashboard: boolean;
    ownerGatingDocumented: true;
  };
  fulfillmentHealth: {
    paidAwaitingFulfillment: number;
    fulfillmentFailed: number;
    fulfilled: number;
    needsAttentionPaidNotFulfilled: number;
    needsAttentionMissingBookings: number;
  };
  rollback: {
    emergencyStopPublicPurchase: string[];
    hidePublicPackageUi: string[];
    keepAdminOpsOn: string[];
    keepDashboardsOnForExistingCustomers: string[];
    notes: string[];
  };
  blockers: Array<{ code: string; severity: LaunchMonitorSeverity; message: string }>;
  warnings: Array<{ code: string; message: string }>;
};

const ATTENTION_TO_STUCK: Partial<
  Record<
    PlannedPackageAttentionReason,
    { code: PlannedPackageStuckStateCode; severity: LaunchMonitorSeverity; message: string; action: string }
  >
> = {
  webhook_missing: {
    code: "checkout_started_no_webhook",
    severity: "warning",
    message: "Checkout démarré sans webhook reçu.",
    action: "Vérifier STRIPE_WEBHOOK_SECRET et les événements checkout.session.*",
  },
  paid_not_fulfilled: {
    code: "payment_confirmed_not_fulfilled",
    severity: "critical",
    message: "Commande payée non fulfillée.",
    action: "Ouvrir la commande et utiliser le retry fulfillment admin si éligible.",
  },
  fulfillment_failed: {
    code: "payment_confirmed_not_fulfilled",
    severity: "critical",
    message: "Fulfillment échoué.",
    action: "Consulter fulfillment_error puis retry admin.",
  },
  fulfilled_missing_bookings: {
    code: "fulfilled_order_missing_bookings",
    severity: "critical",
    message: "Séances manquantes après fulfillment.",
    action: "Inspecter les bookings liés et réconcilier manuellement.",
  },
  booking_count_mismatch: {
    code: "fulfilled_order_missing_bookings",
    severity: "critical",
    message: "Nombre de séances incohérent.",
    action: "Comparer session_count et bookings sur la fiche commande.",
  },
  hold_expired_before_payment: {
    code: "pending_order_hold_expired_but_not_cancelled",
    severity: "warning",
    message: "Hold expiré avant paiement.",
    action: "Confirmer l’expiration/annulation de la commande pending.",
  },
  checkout_expired_but_order_pending: {
    code: "pending_order_hold_expired_but_not_cancelled",
    severity: "warning",
    message: "Checkout expiré mais commande encore pending.",
    action: "Vérifier le statut de la commande et les holds.",
  },
  completed_session_missing_payout_eligibility: {
    code: "completed_booking_missing_payout_eligibility",
    severity: "warning",
    message: "Admissibilité versement manquante.",
    action: "Synchroniser le ledger d’admissibilité depuis la fiche commande.",
  },
  approved_refund_not_executed: {
    code: "refund_quote_approved_but_not_executed",
    severity: "critical",
    message: "Quote de remboursement approuvée non exécutée.",
    action: "Exécuter le remboursement manuel depuis la fiche commande.",
  },
  refund_execution_failed: {
    code: "refund_execution_failed",
    severity: "critical",
    message: "Exécution de remboursement échouée.",
    action: "Relire l’audit refund puis réessayer manuellement.",
  },
  eligible_transfer_not_executed: {
    code: "transfer_required_but_not_executed",
    severity: "warning",
    message: "Transfer admissible non exécuté.",
    action: "Exécuter le transfer manuel depuis la fiche commande.",
  },
  transfer_execution_failed: {
    code: "transfer_required_but_not_executed",
    severity: "critical",
    message: "Exécution de transfer échouée.",
    action: "Inspecter l’audit transfer puis réessayer.",
  },
  transfer_reversal_required: {
    code: "transfer_reversal_required_before_refund",
    severity: "critical",
    message: "Transfer reversal requis avant remboursement.",
    action: "Exécuter le reversal manuel puis le refund.",
  },
  refund_waiting_on_transfer_reversal: {
    code: "transfer_reversal_required_before_refund",
    severity: "critical",
    message: "Remboursement en attente de transfer reversal.",
    action: "Compléter le reversal avant le refund client.",
  },
  transfer_reversal_failed: {
    code: "transfer_reversal_failed",
    severity: "critical",
    message: "Transfer reversal échoué.",
    action: "Inspecter l’audit reversal puis réessayer.",
  },
  teacher_payment_not_ready_for_transfer: {
    code: "teacher_stripe_readiness_missing",
    severity: "warning",
    message: "Stripe professeur non prêt pour transfer.",
    action: "Demander au professeur de terminer Connect / payout readiness.",
  },
};

function personLabel(row: AdminPlannedPackageOrderListRow, who: "student" | "teacher"): string | null {
  const p = who === "student" ? row.student : row.teacher;
  if (!p) return null;
  return p.name || p.email || p.id || null;
}

function paymentStatusFromOrder(row: AdminPlannedPackageOrderListRow): string {
  if (row.paymentConfirmedAt || ["paid", "payment_confirmed", "fulfilling", "fulfillment_failed", "fulfilled"].includes(row.orderStatus)) {
    return "paid_or_confirmed";
  }
  if (row.orderStatus === "pending_payment") return "pending_payment";
  if (row.orderStatus === "expired" || row.orderStatus === "cancelled") return row.orderStatus;
  return row.orderStatus;
}

function classifyStripeMode(): PlannedPackageLaunchMonitoringSnapshot["stripeConfig"]["checkoutMode"] {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}

function countAttention(
  orders: AdminPlannedPackageOrderListRow[],
  reason: PlannedPackageAttentionReason,
): number {
  return orders.filter((o) => o.attentionReasons.includes(reason)).length;
}

function hoursAgo(iso: string | null, hours: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= hours * 3600_000;
}

function buildRollbackPanel(): PlannedPackageLaunchMonitoringSnapshot["rollback"] {
  return {
    emergencyStopPublicPurchase: [
      "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false",
      "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false",
    ],
    hidePublicPackageUi: ["ENABLE_PLANNED_PACKAGES=false", "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES=false"],
    keepAdminOpsOn: ["ENABLE_PLANNED_PACKAGE_ADMIN_OPS=true"],
    keepDashboardsOnForExistingCustomers: [
      "ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=true",
      "ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=true",
    ],
    notes: [
      "Les réservations de forfaits confirmées restent en base.",
      "Les nouveaux achats s’arrêtent.",
      "Les ops admin restent disponibles si le flag admin reste ON.",
      "Les holds expirent normalement.",
      "Aucun rollback destructif.",
    ],
  };
}

function envStuckStates(): PlannedPackageStuckState[] {
  const out: PlannedPackageStuckState[] = [];
  const publicOn = isPlannedPackagePublicPurchaseEnabled();
  const legal = isPackageLegalReviewCompleted();
  const student = isStudentPlannedPackageDashboardEnabled();
  const teacher = isTeacherPlannedPackageDashboardEnabled();

  if (publicOn && !legal) {
    out.push({
      code: "public_purchase_enabled_but_legal_review_missing",
      severity: "critical",
      orderId: null,
      shortId: null,
      message: "Achat public activé mais revue légale manquante.",
      recommendedAction: "Ne pas activer PACKAGE_LEGAL_REVIEW_COMPLETED sans sign-off conseil; sinon désactiver l’achat public.",
      detailHref: "/admin/package-launch-readiness",
    });
  }
  if (publicOn && !student) {
    out.push({
      code: "student_dashboard_disabled_while_public_purchase_enabled",
      severity: "warning",
      orderId: null,
      shortId: null,
      message: "Tableau élève désactivé alors que l’achat public est ON.",
      recommendedAction: "Activer ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD.",
      detailHref: "/admin/package-launch-readiness",
    });
  }
  if (publicOn && !teacher) {
    out.push({
      code: "teacher_dashboard_disabled_while_public_purchase_enabled",
      severity: "warning",
      orderId: null,
      shortId: null,
      message: "Tableau professeur désactivé alors que l’achat public est ON.",
      recommendedAction: "Activer ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD.",
      detailHref: "/admin/package-launch-readiness",
    });
  }
  return out;
}

function stuckFromOrders(orders: AdminPlannedPackageOrderListRow[]): PlannedPackageStuckState[] {
  const out: PlannedPackageStuckState[] = [];
  const studentDash = isStudentPlannedPackageDashboardEnabled();
  const teacherDash = isTeacherPlannedPackageDashboardEnabled();

  for (const order of orders) {
    for (const reason of order.attentionReasons) {
      const mapped = ATTENTION_TO_STUCK[reason];
      if (!mapped) continue;
      out.push({
        code: mapped.code,
        severity: mapped.severity,
        orderId: order.id,
        shortId: order.shortId,
        message: mapped.message,
        recommendedAction: mapped.action,
        detailHref: `/admin/planned-package-orders/${order.id}`,
      });
    }

    const checkoutComplete =
      order.stripeCheckoutStatus === "complete" || order.stripeCheckoutStatus === "completed";
    if (checkoutComplete && order.orderStatus === "pending_payment") {
      out.push({
        code: "checkout_completed_order_not_payment_confirmed",
        severity: "critical",
        orderId: order.id,
        shortId: order.shortId,
        message: "Checkout Stripe complété mais commande non payment_confirmed.",
        recommendedAction: "Vérifier le webhook checkout.session.completed et la confirmation serveur.",
        detailHref: `/admin/planned-package-orders/${order.id}`,
      });
    }

    if (order.orderStatus === "fulfilled") {
      if (!studentDash) {
        out.push({
          code: "bookings_created_missing_student_dashboard_visibility",
          severity: "warning",
          orderId: order.id,
          shortId: order.shortId,
          message: "Commande fulfillée mais tableau élève désactivé.",
          recommendedAction: "Activer le dashboard élève pour la visibilité post-achat.",
          detailHref: `/admin/planned-package-orders/${order.id}`,
        });
      }
      if (!teacherDash) {
        out.push({
          code: "bookings_created_missing_teacher_dashboard_visibility",
          severity: "warning",
          orderId: order.id,
          shortId: order.shortId,
          message: "Commande fulfillée mais tableau professeur désactivé.",
          recommendedAction: "Activer le dashboard professeur pour la visibilité post-vente.",
          detailHref: `/admin/planned-package-orders/${order.id}`,
        });
      }
    }
  }

  return out;
}

async function loadTermsAndStripeStuck(admin: AdminClient): Promise<PlannedPackageStuckState[]> {
  const out: PlannedPackageStuckState[] = [];
  const termsVersion = PLANNED_PACKAGE_PUBLIC_TERMS_VERSION;

  const { count: pendingMissingLearnerTerms } = await admin
    .from("planned_package_pending_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_payment")
    .is("learner_package_terms_accepted_at", null);

  if ((pendingMissingLearnerTerms ?? 0) > 0) {
    out.push({
      code: "learner_terms_missing_for_pending_order",
      severity: "info",
      orderId: null,
      shortId: null,
      message: `${pendingMissingLearnerTerms} commande(s) pending sans consentement élève (attendu avant checkout).`,
      recommendedAction: "Normal tant que le checkout n’est pas lancé; bloquer si checkout sans consentement.",
      detailHref: "/admin/planned-package-orders?filter=pending_payment",
    });
  }

  const { data: publishedPackages } = await admin
    .from("teacher_offers")
    .select("id, teacher_id")
    .eq("offer_type", "package")
    .eq("status", "published")
    .limit(200);

  const teacherIds = [
    ...new Set(
      ((publishedPackages ?? []) as { teacher_id?: string }[])
        .map((r) => r.teacher_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (teacherIds.length > 0) {
    const { data: teachers } = await admin
      .from("teachers")
      .select(
        "id, teacher_package_terms_accepted_at, teacher_package_terms_policy_version, stripe_connect_onboarding_complete, stripe_connect_charges_enabled",
      )
      .in("id", teacherIds);

    for (const t of (teachers ?? []) as Array<Record<string, unknown>>) {
      const id = typeof t.id === "string" ? t.id : null;
      if (!id) continue;
      const acceptedAt = typeof t.teacher_package_terms_accepted_at === "string" ? t.teacher_package_terms_accepted_at : null;
      const version =
        typeof t.teacher_package_terms_policy_version === "string"
          ? t.teacher_package_terms_policy_version
          : null;
      if (!acceptedAt || version !== termsVersion) {
        out.push({
          code: "teacher_terms_missing_for_public_offer",
          severity: "warning",
          orderId: null,
          shortId: null,
          message: `Professeur ${id.slice(0, 8)}… : conditions forfait manquantes/obsolètes pour offre publiée.`,
          recommendedAction: "Demander l’accusé de réception des conditions forfait avant vente publique.",
          detailHref: "/admin/package-launch-readiness",
        });
      }
      const onboarded = t.stripe_connect_onboarding_complete === true;
      const charges = t.stripe_connect_charges_enabled === true;
      if (!onboarded || !charges) {
        out.push({
          code: "teacher_stripe_readiness_missing",
          severity: "warning",
          orderId: null,
          shortId: null,
          message: `Professeur ${id.slice(0, 8)}… : Stripe readiness incomplète.`,
          recommendedAction: "Bloquer l’achat jusqu’à Connect prêt; suivre diagnostics Stripe.",
          detailHref: "/admin/stripe-diagnostics",
        });
      }
    }
  }

  return out;
}

function mapRecentOrders(
  orders: AdminPlannedPackageOrderListRow[],
): PlannedPackageLaunchMonitorRecentOrder[] {
  const studentDash = isStudentPlannedPackageDashboardEnabled();
  const teacherDash = isTeacherPlannedPackageDashboardEnabled();
  return orders.slice(0, 25).map((row) => ({
    id: row.id,
    shortId: row.shortId,
    createdAt: row.createdAt,
    status: row.orderStatus,
    teacherLabel: personLabel(row, "teacher"),
    teacherId: row.teacherRowId,
    learnerLabel: personLabel(row, "student"),
    offerTitle: row.offerTitleSnapshot,
    totalPriceCents: row.totalPriceCents,
    currency: row.currency,
    sessionCount: row.sessionCount,
    checkoutStatus: row.stripeCheckoutStatus,
    paymentStatus: paymentStatusFromOrder(row),
    fulfillmentStatus: row.fulfillmentStatus,
    bookingCountHint: row.orderStatus === "fulfilled" ? "voir détail" : "n/a",
    dashboardVisibility: {
      studentDashboardEnabled: studentDash,
      teacherDashboardEnabled: teacherDash,
    },
    needsAttention: row.needsAttention,
    attentionReasons: row.attentionReasons,
    detailHref: `/admin/planned-package-orders/${row.id}`,
  }));
}

/**
 * Build a safe admin monitoring snapshot.
 * Pass admin client for order/DB health; omit for env/gate-only snapshot (tests).
 */
export async function getPlannedPackageLaunchMonitoringSnapshot(args?: {
  admin?: AdminClient;
  recentLimit?: number;
}): Promise<PlannedPackageLaunchMonitoringSnapshot> {
  const profile = getPlannedPackageLaunchFlagProfile();
  const activationStatus = getPlannedPackageActivationStatus(profile);
  const gate = evaluatePlannedPackagePublicLaunchGate();
  const publicPurchase = isPlannedPackagePublicPurchaseEnabled();
  const legalCompleted = isPackageLegalReviewCompleted();
  const studentDash = isStudentPlannedPackageDashboardEnabled();
  const teacherDash = isTeacherPlannedPackageDashboardEnabled();
  const adminOps = canUsePlannedPackageAdminOps();

  const blockers: PlannedPackageLaunchMonitoringSnapshot["blockers"] = [];
  const warnings: PlannedPackageLaunchMonitoringSnapshot["warnings"] = [];

  if (!legalCompleted) {
    blockers.push({
      code: "legal_review_missing",
      severity: "critical",
      message: "Revue légale manquante.",
    });
  }
  if (publicPurchase && !legalCompleted) {
    blockers.push({
      code: "public_purchase_blocked_legal",
      severity: "critical",
      message: "Achat public bloqué : revue légale requise.",
    });
  }
  if (!adminOps) {
    warnings.push({
      code: "admin_ops_unavailable",
      message: "Ops admin forfait non disponibles — timeline commandes limitée.",
    });
  }
  if (!(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim()) {
    blockers.push({
      code: "stripe_webhook_missing",
      severity: "critical",
      message: "Webhook Stripe manquant.",
    });
  }

  let orders: AdminPlannedPackageOrderListRow[] = [];
  let summary: AdminPlannedPackageOrdersSummary | null = null;
  let termsStuck: PlannedPackageStuckState[] = [];

  if (args?.admin && adminOps) {
    const listed = await listAdminPlannedPackageOrders(args.admin, {
      limit: Math.max(25, args.recentLimit ?? 50),
    });
    orders = listed.orders;
    summary = listed.summary;
    try {
      termsStuck = await loadTermsAndStripeStuck(args.admin);
    } catch {
      warnings.push({
        code: "terms_probe_failed",
        message: "Impossible de sonder conditions professeur / consentement élève.",
      });
    }
  }

  const stuckStates = [...envStuckStates(), ...stuckFromOrders(orders), ...termsStuck];

  const lastWebhookReceivedAt = orders.reduce<string | null>((latest, o) => {
    // last webhook is on detail only; approximate via paymentConfirmedAt / paid timestamps on list
    const candidate = o.paymentConfirmedAt ?? o.fulfilledAt ?? o.updatedAt;
    if (!candidate) return latest;
    if (!latest) return candidate;
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, null);

  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    mutatesData: false,
    secretsExposed: false,
    automaticFixesExecuted: false,
    launchGate: {
      launchMode: getPlannedPackageLaunchMode(),
      publicPurchaseEnabled: publicPurchase,
      publicPurchaseBlocked: !publicPurchase || !legalCompleted || gate.blockers.length > 0,
      activationStatus,
      legalReviewCompleted: legalCompleted,
      legalReviewRequired: true,
      learnerTermsRequired: true,
      teacherTermsRequired: true,
      stripeReadinessRequired: true,
      termsVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
      blockers: gate.blockers,
      warnings: gate.warnings,
    },
    flags: {
      publicPurchase,
      studentDashboard: studentDash,
      teacherDashboard: teacherDash,
      adminOps,
      missingActivationFlags: profile.missingFlags,
    },
    legalReview: {
      completed: legalCompleted,
      required: true,
    },
    stripeConfig: {
      secretKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean((process.env.STRIPE_WEBHOOK_SECRET ?? "").trim()),
      checkoutMode: classifyStripeMode(),
    },
    webhookHealth: {
      webhookSecretConfigured: Boolean((process.env.STRIPE_WEBHOOK_SECRET ?? "").trim()),
      lastWebhookReceivedAt,
      ordersWithWebhookInLast24h: orders.filter((o) => hoursAgo(o.paymentConfirmedAt, 24)).length,
      ordersWithWebhookInLast7d: orders.filter((o) => hoursAgo(o.paymentConfirmedAt, 24 * 7)).length,
      checkoutCompletedMissingPaymentConfirm: orders.filter(
        (o) =>
          (o.stripeCheckoutStatus === "complete" || o.stripeCheckoutStatus === "completed") &&
          o.orderStatus === "pending_payment",
      ).length,
      checkoutStartedMissingWebhook: countAttention(orders, "webhook_missing"),
    },
    orderStats: summary,
    recentOrders: mapRecentOrders(orders),
    stuckStates,
    financialOpsHealth: {
      refunds: {
        attentionApprovedNotExecuted: countAttention(orders, "approved_refund_not_executed"),
        attentionExecutionFailed: countAttention(orders, "refund_execution_failed"),
        attentionWaitingOnReversal: countAttention(orders, "refund_waiting_on_transfer_reversal"),
      },
      transfers: {
        attentionEligibleNotExecuted: countAttention(orders, "eligible_transfer_not_executed"),
        attentionExecutionFailed: countAttention(orders, "transfer_execution_failed"),
        attentionMissingEligibility: countAttention(
          orders,
          "completed_session_missing_payout_eligibility",
        ),
      },
      reversals: {
        attentionRequired: countAttention(orders, "transfer_reversal_required"),
        attentionFailed: countAttention(orders, "transfer_reversal_failed"),
        attentionPartiallyReversed: countAttention(orders, "transfer_partially_reversed"),
      },
    },
    dashboardHealth: {
      studentDashboardEnabled: studentDash,
      teacherDashboardEnabled: teacherDash,
      publicPurchaseWithoutStudentDashboard: publicPurchase && !studentDash,
      publicPurchaseWithoutTeacherDashboard: publicPurchase && !teacherDash,
      ownerGatingDocumented: true,
    },
    fulfillmentHealth: {
      paidAwaitingFulfillment: summary?.paidAwaitingFulfillment ?? 0,
      fulfillmentFailed: countAttention(orders, "fulfillment_failed"),
      fulfilled: summary?.fulfilled ?? 0,
      needsAttentionPaidNotFulfilled: countAttention(orders, "paid_not_fulfilled"),
      needsAttentionMissingBookings: countAttention(orders, "fulfilled_missing_bookings"),
    },
    rollback: buildRollbackPanel(),
    blockers,
    warnings,
  };
}

/** Pure helpers for unit tests (no DB). */
export function mapAttentionReasonToStuckCode(
  reason: PlannedPackageAttentionReason,
): PlannedPackageStuckStateCode | null {
  return ATTENTION_TO_STUCK[reason]?.code ?? null;
}

export function buildEnvStuckStatesForTests(): PlannedPackageStuckState[] {
  return envStuckStates();
}
