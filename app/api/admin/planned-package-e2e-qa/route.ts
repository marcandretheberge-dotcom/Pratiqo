// Admin → Planned package E2E staging QA diagnostics (read-only)

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  getPlannedPackageE2eQaDiagnostics,
  toSafePlannedPackageE2eQaDto,
} from "@/lib/offers/plannedPackageE2eQa";
import { canUsePlannedPackageE2eQaTools } from "@/lib/offers/plannedPackageE2eQaTools";
import { isProductionCheckoutEnvironment } from "@/lib/offers/plannedPackageStripeCheckout";

export const runtime = "nodejs";

/**
 * GET /api/admin/planned-package-e2e-qa
 *
 * Read-only diagnostics. No Stripe money APIs, no DB mutations, no flag toggles.
 * Requires ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS in non-production.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (isProductionCheckoutEnvironment()) {
    return NextResponse.json(
      {
        error: "e2e_qa_tools_rejected_in_production",
        readOnly: true,
        noMoneyMovement: true,
      },
      { status: 403 },
    );
  }

  if (!canUsePlannedPackageE2eQaTools()) {
    return NextResponse.json(
      {
        error: "e2e_qa_tools_disabled",
        readOnly: true,
        noMoneyMovement: true,
        hint: "Set ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS=true in staging/dev only.",
      },
      { status: 403 },
    );
  }

  try {
    const diagnostics = toSafePlannedPackageE2eQaDto(getPlannedPackageE2eQaDiagnostics());
    return NextResponse.json({
      readOnly: true,
      noMoneyMovement: true,
      noSecretsExposed: true,
      diagnostics,
    });
  } catch {
    return NextResponse.json({ error: "e2e_qa_diagnostics_failed" }, { status: 500 });
  }
}
