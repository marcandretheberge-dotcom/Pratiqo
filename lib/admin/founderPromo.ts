/**
 * Server-side helpers for the admin founder-promotion surface.
 *
 * Reads the `admin_founder_promotions` table (migration 080) through a
 * Supabase service-role client. Designed to live exclusively on the
 * server — DO NOT import from client components. The price for that
 * boundary is paid by the route handlers and server pages that call
 * these helpers behind `requireAdminApi` / `requireAdminPage`.
 *
 * This module never imports Stripe SDKs and never touches
 * `profiles.plan` / `profiles.subscription_status` — paid Membre Pro
 * status remains owned by the Stripe webhook by design.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  computeFounderPromoEndDate,
  FOUNDER_PROMO_DEFAULT_DURATION_MONTHS,
  FOUNDER_PROMO_DEFAULT_RATE_BPS,
  type FounderPromoSnapshot,
} from "@/lib/payments/founderPromo";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type FounderPromoRow = {
  id: string;
  teacher_id: string;
  started_at: string;
  ends_at: string;
  commission_rate_bps: number;
  created_at: string;
  created_by: string;
  created_by_email: string | null;
  ended_early_at: string | null;
  ended_early_by: string | null;
  ended_early_by_email: string | null;
  notes: string | null;
  source: string;
};

/**
 * Returns the most relevant founder-promo row for a teacher: the
 * latest currently-active row if any, else the most recent row
 * regardless of state. Callers that want a strict "active or null"
 * answer should use `loadActiveFounderPromo` instead.
 */
export async function loadFounderPromoLatest(
  admin: AdminClient,
  teacherId: string,
): Promise<FounderPromoRow | null> {
  const { data, error } = await admin
    .from("admin_founder_promotions")
    .select(
      "id, teacher_id, started_at, ends_at, commission_rate_bps, created_at, created_by, created_by_email, ended_early_at, ended_early_by, ended_early_by_email, notes, source",
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[admin/founderPromo] loadLatest failed", error.message);
    return null;
  }
  return ((data ?? [])[0] as FounderPromoRow | undefined) ?? null;
}

/**
 * Loads the currently-active founder promotion for a teacher (if any).
 * "Active" means: not terminated early AND `ends_at` is still in the
 * future.
 */
export async function loadActiveFounderPromo(
  admin: AdminClient,
  teacherId: string,
  now: Date = new Date(),
): Promise<FounderPromoRow | null> {
  const { data, error } = await admin
    .from("admin_founder_promotions")
    .select(
      "id, teacher_id, started_at, ends_at, commission_rate_bps, created_at, created_by, created_by_email, ended_early_at, ended_early_by, ended_early_by_email, notes, source",
    )
    .eq("teacher_id", teacherId)
    .is("ended_early_at", null)
    .gt("ends_at", now.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[admin/founderPromo] loadActive failed", error.message);
    return null;
  }
  return ((data ?? [])[0] as FounderPromoRow | undefined) ?? null;
}

/** Recent history rows (most recent first). */
export async function loadFounderPromoHistory(
  admin: AdminClient,
  teacherId: string,
  limit = 10,
): Promise<FounderPromoRow[]> {
  const { data, error } = await admin
    .from("admin_founder_promotions")
    .select(
      "id, teacher_id, started_at, ends_at, commission_rate_bps, created_at, created_by, created_by_email, ended_early_at, ended_early_by, ended_early_by_email, notes, source",
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  if (error) {
    console.error("[admin/founderPromo] loadHistory failed", error.message);
    return [];
  }
  return (data ?? []) as FounderPromoRow[];
}

/** Convert a DB row into the shape the commission helpers consume. */
export function rowToSnapshot(row: FounderPromoRow | null): FounderPromoSnapshot {
  if (!row) return null;
  return {
    startedAt: row.started_at,
    endsAt: row.ends_at,
    commissionRateBps: row.commission_rate_bps,
    endedEarlyAt: row.ended_early_at,
  };
}

export type ActivateFounderPromoInput = {
  teacherId: string;
  actorId: string;
  actorEmail: string | null;
  durationMonths?: number;
  commissionRateBps?: number;
  notes?: string | null;
  source?: string;
  now?: Date;
};

/**
 * Inserts a new founder-promotion row. Defaults: 6 months, 500 bps.
 * Returns the inserted row on success, or `null` on failure (errors
 * are logged to stderr — the caller should surface a generic error
 * to the admin and inspect logs).
 *
 * IMPORTANT: callers MUST verify the target is a teacher BEFORE
 * calling this function. Activating a promo for a non-teacher is a
 * data-integrity bug, not a security issue, but we still avoid it
 * by gating at the route level.
 */
export async function activateFounderPromo(
  admin: AdminClient,
  input: ActivateFounderPromoInput,
): Promise<FounderPromoRow | null> {
  const startedAt = input.now ?? new Date();
  const months = Number.isFinite(input.durationMonths)
    ? Math.max(1, Math.min(60, Math.floor(input.durationMonths as number)))
    : FOUNDER_PROMO_DEFAULT_DURATION_MONTHS;
  const rate = Number.isFinite(input.commissionRateBps)
    ? Math.max(0, Math.min(10_000, Math.round(input.commissionRateBps as number)))
    : FOUNDER_PROMO_DEFAULT_RATE_BPS;
  const endsAt = computeFounderPromoEndDate(startedAt, months);

  const { data, error } = await admin
    .from("admin_founder_promotions")
    .insert({
      teacher_id: input.teacherId,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
      commission_rate_bps: rate,
      created_by: input.actorId,
      created_by_email: input.actorEmail,
      notes: input.notes?.trim() || null,
      source: input.source ?? "admin/users",
    })
    .select(
      "id, teacher_id, started_at, ends_at, commission_rate_bps, created_at, created_by, created_by_email, ended_early_at, ended_early_by, ended_early_by_email, notes, source",
    )
    .single();

  if (error) {
    console.error("[admin/founderPromo] activate failed", error.message);
    return null;
  }
  return data as FounderPromoRow;
}

export type EndFounderPromoEarlyInput = {
  promoId: string;
  actorId: string;
  actorEmail: string | null;
  now?: Date;
};

export async function endFounderPromoEarly(
  admin: AdminClient,
  input: EndFounderPromoEarlyInput,
): Promise<FounderPromoRow | null> {
  const endedAt = (input.now ?? new Date()).toISOString();
  const { data, error } = await admin
    .from("admin_founder_promotions")
    .update({
      ended_early_at: endedAt,
      ended_early_by: input.actorId,
      ended_early_by_email: input.actorEmail,
    })
    .eq("id", input.promoId)
    .is("ended_early_at", null)
    .select(
      "id, teacher_id, started_at, ends_at, commission_rate_bps, created_at, created_by, created_by_email, ended_early_at, ended_early_by, ended_early_by_email, notes, source",
    )
    .single();

  if (error) {
    console.error("[admin/founderPromo] endEarly failed", error.message);
    return null;
  }
  return data as FounderPromoRow;
}
