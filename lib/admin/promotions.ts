/**
 * Server-side helpers for admin promo codes (migration 087).
 *
 * Promo codes are an internal registry only in this PR. They are NOT
 * applied at Stripe checkout and do NOT create Stripe coupons.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { insertAdminAuditLog } from "@/lib/admin/auditLog";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type PromoDiscountType = "fixed_amount" | "percent";
export type PromoStatus = "active" | "paused" | "expired" | "archived";

export type AdminPromoCodeRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: PromoDiscountType;
  amount_cents: number | null;
  percent_off: number | null;
  currency: string;
  status: PromoStatus;
  starts_at: string | null;
  expires_at: string | null;
  max_total_redemptions: number | null;
  max_redemptions_per_user: number | null;
  new_students_only: boolean;
  market_code: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const PROMO_CODE_SELECT =
  "id, code, description, discount_type, amount_cents, percent_off, currency, status, starts_at, expires_at, max_total_redemptions, max_redemptions_per_user, new_students_only, market_code, created_by, created_at, updated_at";

/** Normalize a promo code: trim, uppercase, reject spaces/empty. */
export function normalizePromoCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!code) return null;
  if (/\s/.test(code)) return null;
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return null;
  return code;
}

export type CreatePromoCodeInput = {
  code: unknown;
  description?: unknown;
  discountType: unknown;
  amountCents?: unknown;
  percentOff?: unknown;
  currency?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxTotalRedemptions?: unknown;
  maxRedemptionsPerUser?: unknown;
  newStudentsOnly?: unknown;
  marketCode?: unknown;
};

export type CreatePromoCodeResult =
  | { ok: true; promo: AdminPromoCodeRow }
  | { ok: false; error: string; status: 400 | 409 | 500 };

function optionalPositiveInt(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return undefined;
  return n;
}

function optionalIso(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function optionalText(value: unknown, max = 500): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return undefined;
  return trimmed;
}

/**
 * Validate and create an admin promo code. Pure validation is exported
 * via this function so tests can pin the rules without a live DB —
 * callers with a stubbed admin client exercise the happy path shape.
 */
export async function createAdminPromoCode(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  raw: CreatePromoCodeInput,
): Promise<CreatePromoCodeResult> {
  const code = normalizePromoCode(raw.code);
  if (!code) {
    return {
      ok: false,
      status: 400,
      error: "Code invalide. Utilise 2–40 caractères A–Z, 0–9, _ ou - (sans espaces).",
    };
  }

  const discountType = raw.discountType;
  if (discountType !== "fixed_amount" && discountType !== "percent") {
    return { ok: false, status: 400, error: "Type de rabais invalide (montant fixe ou pourcentage)." };
  }

  let amountCents: number | null = null;
  let percentOff: number | null = null;

  if (discountType === "fixed_amount") {
    const parsed = optionalPositiveInt(raw.amountCents);
    if (parsed === undefined || parsed === null) {
      return { ok: false, status: 400, error: "Montant fixe requis (centimes > 0)." };
    }
    amountCents = parsed;
  } else {
    const n =
      typeof raw.percentOff === "number"
        ? raw.percentOff
        : raw.percentOff === undefined || raw.percentOff === null || raw.percentOff === ""
          ? NaN
          : Number(raw.percentOff);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      return { ok: false, status: 400, error: "Pourcentage invalide (doit être > 0 et ≤ 100)." };
    }
    percentOff = n;
  }

  const description = optionalText(raw.description, 500);
  if (description === undefined) {
    return { ok: false, status: 400, error: "Description trop longue (max 500 caractères)." };
  }

  const currencyRaw = optionalText(raw.currency, 8);
  if (currencyRaw === undefined) {
    return { ok: false, status: 400, error: "Devise invalide." };
  }
  const currency = (currencyRaw ?? "CAD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, status: 400, error: "Devise invalide (code ISO à 3 lettres, ex. CAD)." };
  }

  const startsAt = optionalIso(raw.startsAt);
  if (startsAt === undefined) {
    return { ok: false, status: 400, error: "Date de début invalide." };
  }
  const expiresAt = optionalIso(raw.expiresAt);
  if (expiresAt === undefined) {
    return { ok: false, status: 400, error: "Date d'expiration invalide." };
  }
  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    return { ok: false, status: 400, error: "La date d'expiration doit être après la date de début." };
  }

  const maxTotal = optionalPositiveInt(raw.maxTotalRedemptions);
  if (maxTotal === undefined) {
    return { ok: false, status: 400, error: "Limite totale invalide (entier > 0)." };
  }
  const maxPerUser = optionalPositiveInt(raw.maxRedemptionsPerUser);
  if (maxPerUser === undefined) {
    return { ok: false, status: 400, error: "Limite par utilisateur invalide (entier > 0)." };
  }

  const newStudentsOnly = Boolean(raw.newStudentsOnly);
  const marketCodeRaw = optionalText(raw.marketCode, 8);
  if (marketCodeRaw === undefined) {
    return { ok: false, status: 400, error: "Marché invalide." };
  }
  const marketCode = marketCodeRaw ? marketCodeRaw.toUpperCase() : null;
  if (marketCode && !/^[A-Z]{2}$/.test(marketCode)) {
    return { ok: false, status: 400, error: "Marché invalide (code à 2 lettres, ex. CA)." };
  }

  const nowIso = new Date().toISOString();
  const insertRow = {
    code,
    description,
    discount_type: discountType,
    amount_cents: amountCents,
    percent_off: percentOff,
    currency,
    status: "active" as const,
    starts_at: startsAt,
    expires_at: expiresAt,
    max_total_redemptions: maxTotal,
    max_redemptions_per_user: maxPerUser,
    new_students_only: newStudentsOnly,
    market_code: marketCode,
    created_by: actor.id,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await admin
    .from("admin_promo_codes")
    .insert(insertRow)
    .select(PROMO_CODE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, error: "Un code promo actif avec ce nom existe déjà." };
    }
    console.error("[admin/promotions] create failed", error.message);
    return { ok: false, status: 500, error: "Création impossible. Réessaie." };
  }
  if (!data) {
    return { ok: false, status: 500, error: "Création impossible. Réessaie." };
  }

  const promo = data as AdminPromoCodeRow;
  await insertAdminAuditLog(admin, {
    actorProfileId: actor.id,
    action: "promo_code.created",
    targetType: "promo_code",
    targetId: promo.id,
    metadata: {
      code: promo.code,
      discount_type: promo.discount_type,
      amount_cents: promo.amount_cents,
      percent_off: promo.percent_off,
      currency: promo.currency,
      actor_email: actor.email,
    },
  });

  return { ok: true, promo };
}

export async function listAdminPromoCodes(
  admin: AdminClient,
  limit = 100,
): Promise<AdminPromoCodeRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const { data, error } = await admin
    .from("admin_promo_codes")
    .select(PROMO_CODE_SELECT)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    console.error("[admin/promotions] list failed", error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as AdminPromoCodeRow[];
}

export async function setAdminPromoCodeStatus(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  promoId: string,
  nextStatus: "paused" | "archived",
): Promise<CreatePromoCodeResult> {
  if (!promoId?.trim()) {
    return { ok: false, status: 400, error: "Identifiant du code promo requis." };
  }

  const { data: existing, error: readErr } = await admin
    .from("admin_promo_codes")
    .select(PROMO_CODE_SELECT)
    .eq("id", promoId)
    .maybeSingle();
  if (readErr) {
    console.error("[admin/promotions] read failed", readErr.message);
    return { ok: false, status: 500, error: "Mise à jour impossible. Réessaie." };
  }
  if (!existing) {
    return { ok: false, status: 400, error: "Code promo introuvable." };
  }

  const row = existing as AdminPromoCodeRow;
  if (row.status === "archived") {
    return { ok: false, status: 400, error: "Ce code promo est déjà archivé." };
  }
  if (row.status === nextStatus) {
    return { ok: true, promo: row };
  }

  const { data, error } = await admin
    .from("admin_promo_codes")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", promoId)
    .select(PROMO_CODE_SELECT)
    .maybeSingle();
  if (error || !data) {
    console.error("[admin/promotions] status update failed", error?.message);
    return { ok: false, status: 500, error: "Mise à jour impossible. Réessaie." };
  }

  const promo = data as AdminPromoCodeRow;
  await insertAdminAuditLog(admin, {
    actorProfileId: actor.id,
    action: nextStatus === "paused" ? "promo_code.paused" : "promo_code.archived",
    targetType: "promo_code",
    targetId: promo.id,
    metadata: {
      code: promo.code,
      previous_status: row.status,
      new_status: nextStatus,
      actor_email: actor.email,
    },
  });

  return { ok: true, promo };
}
