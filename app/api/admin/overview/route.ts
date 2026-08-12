// Admin → Marketplace command-center overview
//
//   GET /api/admin/overview → count-only operational KPIs for /admin
//
// Security:
//   1. Bearer JWT required
//   2. requireAdminApi() verifies profiles.role === "admin" via service-role
//   3. Response is counts only — no addresses, emails, or payment secrets

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { loadAdminOverview } from "@/lib/admin/overview";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  try {
    const overview = await loadAdminOverview(auth.admin);
    return NextResponse.json({ overview });
  } catch (e) {
    console.error("[admin/overview] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger le centre de contrôle." },
      { status: 500 },
    );
  }
}
