// Admin → Founder promotion lifecycle API
//
//   POST   /api/admin/users/:id/founder-promo  → activate (default 6 months, 5 %)
//   DELETE /api/admin/users/:id/founder-promo  → end the active promotion early
//
// What this endpoint does NOT do (intentional):
//   - It never reads, writes, or imports Stripe SDKs / Stripe state.
//   - It never updates `profiles.plan`, `profiles.subscription_status`,
//     or any Stripe-billing column. Paid Membre Pro status remains
//     owned by the Stripe webhook (migration 039).
//   - It does not "fake" a paid Pro subscription. The founder promo
//     applies through the commission layer only
//     (`getEffectivePlatformFeeBasisPoints`).
//
// Audit trail:
//   The `admin_founder_promotions` table (migration 080) is itself the
//   audit log: every grant inserts a row with `created_by` /
//   `created_at`; every early termination updates the row's
//   `ended_early_at` / `ended_early_by`. Both actions are reachable
//   only through this admin-only route handler.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  activateFounderPromo,
  endFounderPromoEarly,
  loadActiveFounderPromo,
} from "@/lib/admin/founderPromo";
import {
  FOUNDER_PROMO_DEFAULT_DURATION_MONTHS,
  FOUNDER_PROMO_DEFAULT_RATE_BPS,
} from "@/lib/payments/founderPromo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PostBody = {
  durationMonths?: number;
  commissionRateBps?: number;
  notes?: string;
};

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: teacherId } = await ctx.params;
  if (!teacherId?.trim()) {
    return NextResponse.json({ error: "Identifiant enseignant requis." }, { status: 400 });
  }

  let body: PostBody = {};
  try {
    const parsed = (await req.json().catch(() => ({}))) as PostBody;
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = {};
  }

  // Verify target exists AND is a teacher. We do not auto-promote
  // students; the admin must change the role first via the existing
  // PATCH /api/admin/users endpoint.
  const { data: target, error: readErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", teacherId)
    .maybeSingle();
  if (readErr) {
    console.error("[admin/founder-promo] target read failed", readErr.message);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
  const targetRow = target as { id: string; role: string | null };
  if (targetRow.role !== "teacher") {
    return NextResponse.json(
      { error: "La promotion fondateur ne s'applique qu'aux enseignants." },
      { status: 400 },
    );
  }

  // Refuse to stack: if there's already an active promo, surface it.
  const existing = await loadActiveFounderPromo(admin, teacherId);
  if (existing) {
    return NextResponse.json(
      {
        error: "Une promotion fondateur est déjà active pour cet enseignant.",
        active_promo_id: existing.id,
        ends_at: existing.ends_at,
      },
      { status: 409 },
    );
  }

  const inserted = await activateFounderPromo(admin, {
    teacherId,
    actorId: actor.id,
    actorEmail: actor.email,
    durationMonths: body.durationMonths,
    commissionRateBps: body.commissionRateBps,
    notes: body.notes ?? null,
    source: "admin/users",
  });

  if (!inserted) {
    return NextResponse.json(
      { error: "Activation impossible. Réessaie." },
      { status: 500 },
    );
  }

  console.log(
    `[admin/founder-promo] activate actor=${actor.id} target=${teacherId} ends_at=${inserted.ends_at}`,
  );

  return NextResponse.json({
    ok: true,
    promo: {
      id: inserted.id,
      started_at: inserted.started_at,
      ends_at: inserted.ends_at,
      commission_rate_bps: inserted.commission_rate_bps,
    },
    defaults: {
      durationMonths: FOUNDER_PROMO_DEFAULT_DURATION_MONTHS,
      commissionRateBps: FOUNDER_PROMO_DEFAULT_RATE_BPS,
    },
  });
}

export async function DELETE(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: teacherId } = await ctx.params;
  if (!teacherId?.trim()) {
    return NextResponse.json({ error: "Identifiant enseignant requis." }, { status: 400 });
  }

  const active = await loadActiveFounderPromo(admin, teacherId);
  if (!active) {
    return NextResponse.json(
      { error: "Aucune promotion fondateur active pour cet enseignant." },
      { status: 404 },
    );
  }

  const updated = await endFounderPromoEarly(admin, {
    promoId: active.id,
    actorId: actor.id,
    actorEmail: actor.email,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Terminaison impossible. Réessaie." },
      { status: 500 },
    );
  }

  console.log(
    `[admin/founder-promo] end-early actor=${actor.id} target=${teacherId} promo_id=${active.id}`,
  );

  return NextResponse.json({
    ok: true,
    promo: {
      id: updated.id,
      ended_early_at: updated.ended_early_at,
    },
  });
}
