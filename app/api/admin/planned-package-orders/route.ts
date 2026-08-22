// Admin → Planned package orders (read-only list)
//
//   GET /api/admin/planned-package-orders
//
// Gated by ENABLE_PLANNED_PACKAGE_ADMIN_OPS (server-only).

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import {
  listAdminPlannedPackageOrders,
  type AdminPlannedPackageOrderFilter,
} from "@/lib/admin/plannedPackageOrderOperations";

export const runtime = "nodejs";

const FILTERS: AdminPlannedPackageOrderFilter[] = [
  "needs_attention",
  "pending_payment",
  "paid_not_fulfilled",
  "fulfillment_failed",
  "fulfilled",
  "expired_cancelled",
];

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "admin_ops_disabled" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const filterParam = url.searchParams.get("filter");
    const filter =
      filterParam && FILTERS.includes(filterParam as AdminPlannedPackageOrderFilter)
        ? (filterParam as AdminPlannedPackageOrderFilter)
        : null;

    const result = await listAdminPlannedPackageOrders(auth.admin, {
      filter,
      q: url.searchParams.get("q"),
      limit: Number(url.searchParams.get("limit") ?? 100) || 100,
    });

    return NextResponse.json({
      orders: result.orders,
      summary: result.summary,
      filters: FILTERS,
      readOnly: true,
      noTeacherTransferMade: true,
      noRefundMade: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les commandes de forfaits planifiés." },
      { status: 500 },
    );
  }
}
