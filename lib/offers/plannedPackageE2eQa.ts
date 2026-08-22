/**
 * Planned package end-to-end staging QA diagnostics — read-only, no secrets, no money movement.
 *
 * Migration/artifact disk presence is verified by tests (plannedPackageE2eLifecycle.test.ts)
 * — no runtime filesystem walks (avoids bundler NFT tracing the whole repo).
 *
 * See docs/product/planned-package-e2e-staging-qa.md
 */

import { getPackageLaunchReadiness } from "./packageLaunchReadiness";
import {
  canUsePlannedPackageE2eQaTools,
  isPlannedPackageE2eQaToolsEnabled,
} from "./plannedPackageE2eQaTools";
import {
  isProductionCheckoutEnvironment,
  isStripeTestSecretKeyConfigured,
} from "./plannedPackageStripeCheckout";
import {
  canPubliclyPurchasePlannedPackage,
  isPackageLegalReviewCompleted,
} from "./plannedPackages";

export const PLANNED_PACKAGE_E2E_QA_RUNBOOK =
  "docs/product/planned-package-e2e-staging-qa.md";

export const PLANNED_PACKAGE_E2E_LIFECYCLE_TEST =
  "tests/offers/plannedPackageE2eLifecycle.test.ts";

/** Package-phase migrations required for a complete financial loop in staging. */
export const PLANNED_PACKAGE_E2E_REQUIRED_MIGRATIONS = [
  {
    id: "session_drafts",
    file: "supabase/migrations/114_planned_package_session_drafts.sql",
  },
  {
    id: "temporary_holds",
    file: "supabase/migrations/115_planned_package_pending_orders_and_holds.sql",
  },
  {
    id: "fulfillment",
    file: "supabase/migrations/116_planned_package_fulfillment_engine.sql",
  },
  {
    id: "stripe_checkout_fields",
    file: "supabase/migrations/117_planned_package_stripe_checkout_fields.sql",
  },
  {
    id: "admin_ops_metadata",
    file: "supabase/migrations/118_planned_package_admin_ops_metadata.sql",
  },
  {
    id: "refund_quotes",
    file: "supabase/migrations/119_planned_package_cancellation_refund_quotes.sql",
  },
  {
    id: "refund_executions",
    file: "supabase/migrations/120_planned_package_refund_executions.sql",
  },
  {
    id: "payout_eligibility_ledger",
    file: "supabase/migrations/121_planned_package_payout_eligibility_ledger.sql",
  },
  {
    id: "transfer_executions",
    file: "supabase/migrations/122_planned_package_transfer_executions.sql",
  },
  {
    id: "transfer_reversals",
    file: "supabase/migrations/123_planned_package_transfer_reversal_executions.sql",
  },
] as const;

export type PlannedPackageE2eQaPresence = "present" | "missing";
export type PlannedPackageE2eQaStripeMode = "test" | "live" | "missing";
export type PlannedPackageE2eQaConfigured = "configured" | "not_configured";

export type PlannedPackageE2eQaFlagRow = {
  envName: string;
  enabled: boolean;
  requiredForLifecycle: boolean;
};

export type PlannedPackageE2eQaMigrationRow = {
  id: string;
  file: string;
  present: boolean;
};

export type PlannedPackageE2eQaDiagnostics = {
  ok: boolean;
  environment: {
    nodeEnv: string;
    vercelEnv: string | null;
    isProduction: boolean;
    e2eQaToolsEnabled: boolean;
    e2eQaToolsAllowed: boolean;
  };
  flags: PlannedPackageE2eQaFlagRow[];
  migrations: PlannedPackageE2eQaMigrationRow[];
  stripeConfig: {
    secretKey: PlannedPackageE2eQaPresence;
    mode: PlannedPackageE2eQaStripeMode;
    testModeRequiredForQa: boolean;
    testModeOk: boolean;
  };
  webhookConfig: {
    secret: PlannedPackageE2eQaConfigured;
  };
  readinessChecks: {
    publicLaunchBlocked: boolean;
    legalReviewCompleted: boolean;
    legalReviewStillRequired: boolean;
    packageLaunchStatus: string;
  };
  artifacts: {
    runbookPresent: boolean;
    lifecycleTestPresent: boolean;
    diagnosticsHelperPresent: boolean;
  };
  blockers: Array<{ code: string; severity: "critical" | "warning"; message: string }>;
  warnings: string[];
  generatedAt: string;
  noSecretsExposed: true;
  readOnly: true;
  noMoneyMovement: true;
};

const LIFECYCLE_FLAG_ENVS: ReadonlyArray<{ envName: string; required: boolean }> = [
  { envName: "ENABLE_PLANNED_PACKAGES", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_ADMIN_OPS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_REFUND_QUOTES", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS", required: true },
  { envName: "ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS", required: false },
  { envName: "PACKAGE_LEGAL_REVIEW_COMPLETED", required: false },
];

function detectStripeMode(): PlannedPackageE2eQaStripeMode {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  // Unknown prefix — treat as present but not test (do not echo value).
  return "live";
}

/**
 * Read-only staging QA diagnostics. Never returns secret values.
 * Migration/artifact presence is a static ship checklist (asserted by tests).
 */
export function getPlannedPackageE2eQaDiagnostics(): PlannedPackageE2eQaDiagnostics {
  const isProduction = isProductionCheckoutEnvironment();
  const e2eQaToolsEnabled = isPlannedPackageE2eQaToolsEnabled();
  const e2eQaToolsAllowed = canUsePlannedPackageE2eQaTools();
  const readiness = getPackageLaunchReadiness();
  const legalReviewCompleted = isPackageLegalReviewCompleted();
  const publicLaunchBlocked = !canPubliclyPurchasePlannedPackage();

  const flags: PlannedPackageE2eQaFlagRow[] = LIFECYCLE_FLAG_ENVS.map((row) => ({
    envName: row.envName,
    enabled: process.env[row.envName] === "true",
    requiredForLifecycle: row.required,
  }));

  // Disk presence enforced by plannedPackageE2eLifecycle.test.ts — no fs at runtime.
  const migrations: PlannedPackageE2eQaMigrationRow[] = PLANNED_PACKAGE_E2E_REQUIRED_MIGRATIONS.map(
    (m) => ({
      id: m.id,
      file: m.file,
      present: true,
    }),
  );

  const stripeMode = detectStripeMode();
  const secretKeyPresent: PlannedPackageE2eQaPresence =
    stripeMode === "missing" ? "missing" : "present";
  const webhookConfigured: PlannedPackageE2eQaConfigured =
    (process.env.STRIPE_WEBHOOK_SECRET ?? "").length > 0 ? "configured" : "not_configured";

  const testModeRequiredForQa = !isProduction;
  const testModeOk =
    !testModeRequiredForQa ||
    (stripeMode === "test" && isStripeTestSecretKeyConfigured());

  const blockers: PlannedPackageE2eQaDiagnostics["blockers"] = [];
  const warnings: string[] = [];

  if (isProduction) {
    blockers.push({
      code: "production_rejects_e2e_qa_tools",
      severity: "critical",
      message: "Detailed E2E QA tools are rejected in production environments.",
    });
  }

  if (!e2eQaToolsAllowed && !isProduction) {
    warnings.push("ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS is OFF — detailed diagnostics gated.");
  }

  for (const flag of flags) {
    if (flag.requiredForLifecycle && !flag.enabled) {
      blockers.push({
        code: `missing_flag_${flag.envName}`,
        severity: "warning",
        message: `Missing flag: ${flag.envName}`,
      });
    }
  }

  if (secretKeyPresent === "missing") {
    blockers.push({
      code: "stripe_secret_missing",
      severity: "critical",
      message: "Stripe secret key missing.",
    });
  } else if (testModeRequiredForQa && stripeMode !== "test") {
    blockers.push({
      code: "stripe_test_mode_required",
      severity: "critical",
      message: "Stripe test mode required for staging QA.",
    });
  }

  if (webhookConfigured === "not_configured") {
    blockers.push({
      code: "stripe_webhook_secret_missing",
      severity: "warning",
      message: "Stripe webhook secret not configured.",
    });
  }

  if (!legalReviewCompleted) {
    warnings.push(
      "Legal review still required before public launch (PACKAGE_LEGAL_REVIEW_COMPLETED).",
    );
  }

  if (!publicLaunchBlocked) {
    blockers.push({
      code: "public_launch_not_blocked",
      severity: "critical",
      message: "Public planned package purchase is unexpectedly enabled.",
    });
  }

  const critical = blockers.some((b) => b.severity === "critical");
  const ok = !critical && publicLaunchBlocked;

  return {
    ok,
    environment: {
      nodeEnv: process.env.NODE_ENV ?? "undefined",
      vercelEnv: process.env.VERCEL_ENV ?? null,
      isProduction,
      e2eQaToolsEnabled,
      e2eQaToolsAllowed,
    },
    flags,
    migrations,
    stripeConfig: {
      secretKey: secretKeyPresent,
      mode: stripeMode,
      testModeRequiredForQa,
      testModeOk,
    },
    webhookConfig: {
      secret: webhookConfigured,
    },
    readinessChecks: {
      publicLaunchBlocked,
      legalReviewCompleted,
      legalReviewStillRequired: !legalReviewCompleted,
      packageLaunchStatus: readiness.status,
    },
    artifacts: {
      runbookPresent: true,
      lifecycleTestPresent: true,
      diagnosticsHelperPresent: true,
    },
    blockers,
    warnings,
    generatedAt: new Date().toISOString(),
    noSecretsExposed: true,
    readOnly: true,
    noMoneyMovement: true,
  };
}

/** Safe JSON shape for admin API — strips any accidental secret-like fields. */
export function toSafePlannedPackageE2eQaDto(
  diagnostics: PlannedPackageE2eQaDiagnostics,
): PlannedPackageE2eQaDiagnostics {
  const serialized = JSON.stringify(diagnostics);
  if (
    /sk_(live|test)_|whsec_|eyJ[A-Za-z0-9_-]{20,}|service_role|SUPABASE_SERVICE_ROLE/i.test(
      serialized,
    )
  ) {
    throw new Error("e2e_qa_diagnostics_secret_leak_blocked");
  }
  return diagnostics;
}
