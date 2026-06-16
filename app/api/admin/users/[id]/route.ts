// Admin → User detail API
//
//   GET   /api/admin/users/:id  → full profile detail + founder-promo state
//   PATCH /api/admin/users/:id  → update SAFE profile fields only
//
// Security model (defense in depth):
//   1. Caller must present a valid Supabase JWT (Authorization: Bearer …).
//   2. requireAdminApi() reads profiles.role with the service-role client
//      and rejects anyone whose role is not "admin".
//   3. PATCH validates against an explicit ALLOWLIST of field names
//      (`name` only today). Sensitive fields — Stripe IDs, payout/bank
//      data, plan/subscription state, role, payment status, raw auth
//      provider data — are NOT editable through this surface.
//   4. Role changes still go through PATCH /api/admin/users (the
//      PR #189 endpoint) — keeping role audit trails on a single
//      well-understood path.
//
// The detail GET response intentionally omits Stripe-internal IDs and
// any field this code base treats as a secret.

import { NextResponse } from "next/server";
import { requireAdminApi, type ProfileRole } from "@/lib/auth/admin";
import { isFounderPromoCurrentlyActive } from "@/lib/payments/founderPromo";
import {
  resolveEffectiveCommissionSource,
  getEffectivePlatformFeeBasisPoints,
} from "@/lib/payments/commission";
import {
  loadActiveFounderPromo,
  loadFounderPromoHistory,
  rowToSnapshot,
  type FounderPromoRow,
} from "@/lib/admin/founderPromo";

export const runtime = "nodejs";

/**
 * Fields surfaced to the admin detail page. Stripe IDs, raw auth
 * provider data and any "is this user paying?" Stripe-side fields
 * are deliberately excluded.
 */
const PROFILE_DETAIL_COLUMNS =
  "id, email, name, role, plan, subscription_status, pro_current_period_end, teacher_onboarding_complete, companion_chosen, deletion_requested_at, created_at, updated_at";

const SAFE_PATCH_FIELDS = new Set<string>(["name"]);

const NAME_MAX_LENGTH = 120;

type Params = { params: Promise<{ id: string }> };

function sanitizeName(value: unknown): string | null | "__INVALID__" {
  if (value === null) return null;
  if (typeof value !== "string") return "__INVALID__";
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > NAME_MAX_LENGTH) return "__INVALID__";
  return trimmed;
}

function publicPromoView(row: FounderPromoRow | null) {
  if (!row) return null;
  const active = isFounderPromoCurrentlyActive({
    startedAt: row.started_at,
    endsAt: row.ends_at,
    commissionRateBps: row.commission_rate_bps,
    endedEarlyAt: row.ended_early_at,
  });
  return {
    id: row.id,
    started_at: row.started_at,
    ends_at: row.ends_at,
    commission_rate_bps: row.commission_rate_bps,
    ended_early_at: row.ended_early_at,
    is_active: active,
    created_at: row.created_at,
    notes: row.notes,
  };
}

export async function GET(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select(PROFILE_DETAIL_COLUMNS)
    .eq("id", targetId)
    .maybeSingle();
  if (error) {
    console.error("[admin/users/:id] GET profile failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const profileRow = profile as {
    id: string;
    email: string | null;
    name: string | null;
    role: ProfileRole;
    plan: string | null;
    subscription_status: string | null;
    pro_current_period_end: string | null;
    teacher_onboarding_complete: boolean | null;
    companion_chosen: boolean | null;
    deletion_requested_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const activePromo = profileRow.role === "teacher"
    ? await loadActiveFounderPromo(admin, profileRow.id)
    : null;
  const promoHistory = profileRow.role === "teacher"
    ? await loadFounderPromoHistory(admin, profileRow.id, 10)
    : [];

  // Effective commission summary — purely informational. Uses the
  // same precedence helper as the runtime payment paths so the
  // admin sees what would actually apply right now. Loyalty tier
  // is read from the profile if available; we conservatively pass
  // `null` (=> bronze) when not stored on the profile so the
  // displayed entry-tier rate matches the commission audit.
  const founderSnapshot = rowToSnapshot(activePromo);
  const effectiveBps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: profileRow.plan,
    founderPromo: founderSnapshot,
  });
  const effectiveSource = resolveEffectiveCommissionSource({
    teacherPlan: profileRow.plan,
    founderPromo: founderSnapshot,
  });

  return NextResponse.json({
    profile: {
      id: profileRow.id,
      email: profileRow.email,
      name: profileRow.name,
      role: profileRow.role,
      plan: profileRow.plan,
      subscription_status: profileRow.subscription_status,
      pro_current_period_end: profileRow.pro_current_period_end,
      teacher_onboarding_complete: profileRow.teacher_onboarding_complete,
      companion_chosen: profileRow.companion_chosen,
      deletion_requested_at: profileRow.deletion_requested_at,
      created_at: profileRow.created_at,
      updated_at: profileRow.updated_at,
    },
    founderPromo: publicPromoView(activePromo),
    founderPromoHistory: promoHistory.map(publicPromoView),
    effectiveCommission: {
      basis_points: effectiveBps,
      percent: effectiveBps / 100,
      source: effectiveSource,
    },
  });
}

type PatchBody = Record<string, unknown> | null;

export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const key of Object.keys(body)) {
    if (!SAFE_PATCH_FIELDS.has(key)) {
      rejected.push(key);
      continue;
    }
    if (key === "name") {
      const sanitized = sanitizeName((body as Record<string, unknown>)[key]);
      if (sanitized === "__INVALID__") {
        return NextResponse.json(
          { error: "Nom invalide (max 120 caractères)." },
          { status: 400 },
        );
      }
      updates.name = sanitized;
    }
  }

  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: `Champs non éditables ici: ${rejected.join(", ")}.`,
        allowedFields: Array.from(SAFE_PATCH_FIELDS),
      },
      { status: 400 },
    );
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", targetId)
    .select("id, name")
    .single();
  if (error) {
    console.error("[admin/users/:id] PATCH update failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
