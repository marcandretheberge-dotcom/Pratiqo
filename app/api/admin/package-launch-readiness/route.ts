import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";

export const runtime = "nodejs";

/**
 * GET /api/admin/package-launch-readiness
 *
 * Read-only admin diagnostics. No Stripe calls, no DB mutations, no flag toggles.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const readiness = getPackageLaunchReadiness();
  return NextResponse.json({ readOnly: true, readiness });
}
