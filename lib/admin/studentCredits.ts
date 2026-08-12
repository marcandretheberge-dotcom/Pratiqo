/**
 * Server-side helpers for admin-granted student credits.
 *
 * Since migration 088, grant/void go through SECURITY DEFINER RPCs that
 * atomically update:
 *   student_credits + student_credit_ledger + credit_transactions
 *   + profiles.credit_balance + admin_audit_log
 *
 * Checkout continues to consume profiles.credit_balance only — this module
 * does not change Stripe amount math or wire promo codes.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isStudentCreditReasonCode,
  STUDENT_CREDIT_REASON_CODES,
  type StudentCreditReasonCode,
} from "@/lib/admin/studentCreditConstants";

export {
  isStudentCreditReasonCode,
  STUDENT_CREDIT_REASON_CODES,
  type StudentCreditReasonCode,
} from "@/lib/admin/studentCreditConstants";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type StudentCreditStatus = "active" | "used" | "expired" | "voided";

export type StudentCreditRow = {
  id: string;
  student_profile_id: string;
  amount_cents: number;
  currency: string;
  remaining_cents: number;
  status: StudentCreditStatus;
  reason_code: string;
  reason_note: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  /** Present on grant/void RPC responses; list rows may omit it. */
  spendable?: boolean;
  new_credit_balance?: number;
};

export type StudentCreditLedgerRow = {
  id: string;
  student_credit_id: string;
  student_profile_id: string;
  entry_type: "grant" | "use" | "void" | "expire" | "adjustment";
  amount_cents: number;
  balance_after_cents: number;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
  note: string | null;
};

export const STUDENT_CREDIT_SELECT =
  "id, student_profile_id, amount_cents, currency, remaining_cents, status, reason_code, reason_note, expires_at, created_by, created_at, voided_by, voided_at, void_reason";

/** Dollars (numeric) ↔ cents helper used by tests and UI formatting. */
export function centsToCreditBalanceDollars(amountCents: number): number {
  return Math.round(amountCents) / 100;
}

export function isCreditUnusedForVoid(credit: Pick<StudentCreditRow, "status" | "amount_cents" | "remaining_cents">): boolean {
  return (
    credit.status === "active" &&
    credit.remaining_cents === credit.amount_cents &&
    credit.amount_cents > 0
  );
}

export const VOID_UNSAFE_MESSAGE =
  "Ce crédit semble déjà utilisé en partie ou le solde disponible est insuffisant. Crée un ajustement manuel séparé si nécessaire.";

export type GrantStudentCreditInput = {
  studentProfileId: unknown;
  amountCents: unknown;
  currency?: unknown;
  reasonCode: unknown;
  reasonNote: unknown;
  expiresAt?: unknown;
};

export type GrantStudentCreditResult =
  | { ok: true; credit: StudentCreditRow }
  | { ok: false; error: string; status: 400 | 404 | 500 };

export type VoidStudentCreditResult =
  | { ok: true; credit: StudentCreditRow }
  | { ok: false; error: string; status: 400 | 404 | 500 };

function parsePositiveIntCents(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  if (n > 5_000_000) return null;
  return n;
}

function mapRpcError(message: string | undefined, fallback: string): { error: string; status: 400 | 404 | 500 } {
  const code = (message ?? "").toUpperCase();
  if (code.includes("STUDENT_NOT_FOUND") || code.includes("CREDIT_NOT_FOUND")) {
    return { error: code.includes("CREDIT") ? "Crédit introuvable." : "Apprenant introuvable.", status: 404 };
  }
  if (code.includes("NOT_A_STUDENT")) {
    return {
      error: "Les crédits admin ne s'appliquent qu'aux comptes apprenants.",
      status: 400,
    };
  }
  if (code.includes("REASON_NOTE_REQUIRED") || code.includes("REASON_CODE_REQUIRED")) {
    return { error: "Une note de raison est obligatoire.", status: 400 };
  }
  if (code.includes("VOID_REASON_REQUIRED")) {
    return { error: "Une raison d'annulation est obligatoire.", status: 400 };
  }
  if (code.includes("AMOUNT_INVALID")) {
    return { error: "Montant invalide (centimes entiers > 0).", status: 400 };
  }
  if (code.includes("CURRENCY_INVALID")) {
    return { error: "Devise invalide (code ISO à 3 lettres).", status: 400 };
  }
  if (
    code.includes("ALREADY_USED") ||
    code.includes("BALANCE_INSUFFICIENT") ||
    code.includes("NOT_ACTIVE")
  ) {
    return { error: VOID_UNSAFE_MESSAGE, status: 400 };
  }
  if (code.includes("ALREADY_VOIDED")) {
    return { error: "Ce crédit est déjà annulé.", status: 400 };
  }
  if (code.includes("REASON_NOTE_TOO_LONG") || code.includes("VOID_REASON_TOO_LONG")) {
    return { error: "Raison trop longue (max 1000 caractères).", status: 400 };
  }
  console.error("[admin/studentCredits] rpc error", message);
  return { error: fallback, status: 500 };
}

function parseCreditRow(data: unknown): StudentCreditRow | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    student_profile_id: String(row.student_profile_id ?? ""),
    amount_cents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    remaining_cents: Number(row.remaining_cents ?? 0),
    status: row.status as StudentCreditStatus,
    reason_code: String(row.reason_code ?? ""),
    reason_note: String(row.reason_note ?? ""),
    expires_at: (row.expires_at as string | null) ?? null,
    created_by: String(row.created_by ?? ""),
    created_at: String(row.created_at ?? ""),
    voided_by: (row.voided_by as string | null) ?? null,
    voided_at: (row.voided_at as string | null) ?? null,
    void_reason: (row.void_reason as string | null) ?? null,
    spendable: typeof row.spendable === "boolean" ? row.spendable : row.status === "active",
    new_credit_balance:
      typeof row.new_credit_balance === "number" ? row.new_credit_balance : undefined,
  };
}

export async function grantStudentCredit(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  raw: GrantStudentCreditInput,
): Promise<GrantStudentCreditResult> {
  const studentProfileId =
    typeof raw.studentProfileId === "string" ? raw.studentProfileId.trim() : "";
  if (!studentProfileId) {
    return { ok: false, status: 400, error: "Identifiant apprenant requis." };
  }

  const amountCents = parsePositiveIntCents(raw.amountCents);
  if (amountCents === null) {
    return { ok: false, status: 400, error: "Montant invalide (centimes entiers > 0)." };
  }

  if (!isStudentCreditReasonCode(raw.reasonCode)) {
    return { ok: false, status: 400, error: "Code de raison invalide." };
  }

  const reasonNote = typeof raw.reasonNote === "string" ? raw.reasonNote.trim() : "";
  if (!reasonNote) {
    return { ok: false, status: 400, error: "Une note de raison est obligatoire." };
  }
  if (reasonNote.length > 1000) {
    return { ok: false, status: 400, error: "Note trop longue (max 1000 caractères)." };
  }

  let currency = "CAD";
  if (raw.currency !== undefined && raw.currency !== null && raw.currency !== "") {
    if (typeof raw.currency !== "string" || !/^[A-Za-z]{3}$/.test(raw.currency.trim())) {
      return { ok: false, status: 400, error: "Devise invalide (code ISO à 3 lettres)." };
    }
    currency = raw.currency.trim().toUpperCase();
  }

  let expiresAt: string | null = null;
  if (raw.expiresAt !== undefined && raw.expiresAt !== null && raw.expiresAt !== "") {
    if (typeof raw.expiresAt !== "string") {
      return { ok: false, status: 400, error: "Date d'expiration invalide." };
    }
    const d = new Date(raw.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, status: 400, error: "Date d'expiration invalide." };
    }
    expiresAt = d.toISOString();
  }

  const { data, error } = await admin.rpc("admin_grant_student_credit", {
    p_student_profile_id: studentProfileId,
    p_amount_cents: amountCents,
    p_currency: currency,
    p_reason_code: raw.reasonCode,
    p_reason_note: reasonNote,
    p_expires_at: expiresAt,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });

  if (error) {
    return { ok: false, ...mapRpcError(error.message, "Attribution impossible. Réessaie.") };
  }

  const credit = parseCreditRow(data);
  if (!credit) {
    return { ok: false, status: 500, error: "Attribution impossible. Réessaie." };
  }
  return { ok: true, credit };
}

export async function listStudentCredits(
  admin: AdminClient,
  studentProfileId?: string | null,
  limit = 100,
): Promise<StudentCreditRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 200);
  let query = admin
    .from("student_credits")
    .select(STUDENT_CREDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (studentProfileId?.trim()) {
    query = query.eq("student_profile_id", studentProfileId.trim());
  }
  const { data, error } = await query;
  if (error) {
    console.error("[admin/studentCredits] list failed", error.message);
    throw new Error(error.message);
  }
  return ((data ?? []) as StudentCreditRow[]).map((row) => ({
    ...row,
    spendable: row.status === "active" && row.remaining_cents > 0,
  }));
}

export async function voidStudentCredit(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  creditId: string,
  voidReasonRaw: unknown,
): Promise<VoidStudentCreditResult> {
  if (!creditId?.trim()) {
    return { ok: false, status: 400, error: "Identifiant du crédit requis." };
  }

  const voidReason = typeof voidReasonRaw === "string" ? voidReasonRaw.trim() : "";
  if (!voidReason) {
    return { ok: false, status: 400, error: "Une raison d'annulation est obligatoire." };
  }
  if (voidReason.length > 1000) {
    return { ok: false, status: 400, error: "Raison trop longue (max 1000 caractères)." };
  }

  const { data, error } = await admin.rpc("admin_void_student_credit", {
    p_credit_id: creditId,
    p_void_reason: voidReason,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });

  if (error) {
    return { ok: false, ...mapRpcError(error.message, "Annulation impossible. Réessaie.") };
  }

  const credit = parseCreditRow(data);
  if (!credit) {
    return { ok: false, status: 500, error: "Annulation impossible. Réessaie." };
  }
  return { ok: true, credit };
}
