// Admin → Planned package launch monitor (read-only)
//
//   GET /api/admin/planned-package-launch-monitor
//
// No mutations. No secrets. No money movement.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import { getPlannedPackageLaunchMonitoringSnapshot } from "@/lib/offers/plannedPackageLaunchMonitoring";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "launch_monitor_unavailable" }, { status: 403 });
  }

  try {
    const snapshot = await getPlannedPackageLaunchMonitoringSnapshot({
      admin: auth.admin,
      recentLimit: 50,
    });
    return NextResponse.json(snapshot);
  } catch (e) {
    console.error("[admin/planned-package-launch-monitor] GET failed", e);
    return NextResponse.json({ error: "launch_monitor_unavailable" }, { status: 500 });
  }
}
