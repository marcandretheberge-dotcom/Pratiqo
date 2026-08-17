// Admin -> Stripe Connect diagnostics
//
// Read-only endpoint for diagnosing teacher payment activation state.
// It reads normalized database fields only; it never calls Stripe and never
// creates account links, verification sessions, refunds, payouts, or transfers.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  listAdminStripeDiagnostics,
  type AdminStripeDiagnosticsDbClient,
} from "@/lib/admin/stripeDiagnostics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  try {
    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit"));
    const diagnostics = await listAdminStripeDiagnostics(
      auth.admin as unknown as AdminStripeDiagnosticsDbClient,
      {
        filter: url.searchParams.get("filter"),
        q: url.searchParams.get("q"),
        limit: Number.isFinite(limitRaw) ? limitRaw : null,
      },
    );

    return NextResponse.json({
      readOnly: true,
      diagnostics,
    });
  } catch (error) {
    console.error("[admin/stripe-diagnostics] GET failed", error);
    return NextResponse.json(
      { error: "Impossible de charger les diagnostics Stripe Connect." },
      { status: 500 },
    );
  }
}
