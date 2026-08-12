/**
 * Server-side helpers for admin-granted student credits (migration 087).
 *
 * This module records grants/voids with mandatory reasons and an append-only
 * ledger. It intentionally does NOT mutate profiles.credit_balance and does
 * NOT change Stripe checkout math — applying these grants to the spendable
 * balance is a later controlled payment PR.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { insertAdminAuditLog } from "@/lib/admin/auditLog";
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
  if (n > 5_000_000) return null; // hard cap $50,000
  return n;
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
    return {
      ok: false,
      status: 400,
      error: "Code de raison invalide.",
    };
  }

  const reasonNote =
    typeof raw.reasonNote === "string" ? raw.reasonNote.trim() : "";
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

  const { data: student, error: studentErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", studentProfileId)
    .maybeSingle();
  if (studentErr) {
    console.error("[admin/studentCredits] student read failed", studentErr.message);
    return { ok: false, status: 500, error: "Attribution impossible. Réessaie." };
  }
  if (!student) {
    return { ok: false, status: 404, error: "Apprenant introuvable." };
  }
  const studentRow = student as { id: string; role: string | null };
  if (studentRow.role !== "student") {
    return {
      ok: false,
      status: 400,
      error: "Les crédits admin ne s'appliquent qu'aux comptes apprenants.",
    };
  }

  const nowIso = new Date().toISOString();
  const { data: credit, error: insertErr } = await admin
    .from("student_credits")
    .insert({
      student_profile_id: studentProfileId,
      amount_cents: amountCents,
      currency,
      remaining_cents: amountCents,
      status: "active",
      reason_code: raw.reasonCode,
      reason_note: reasonNote,
      expires_at: expiresAt,
      created_by: actor.id,
      created_at: nowIso,
    })
    .select(STUDENT_CREDIT_SELECT)
    .maybeSingle();

  if (insertErr || !credit) {
    console.error("[admin/studentCredits] grant insert failed", insertErr?.message);
    return { ok: false, status: 500, error: "Attribution impossible. Réessaie." };
  }

  const creditRow = credit as StudentCreditRow;

  const { error: ledgerErr } = await admin.from("student_credit_ledger").insert({
    student_credit_id: creditRow.id,
    student_profile_id: studentProfileId,
    entry_type: "grant",
    amount_cents: amountCents,
    balance_after_cents: amountCents,
    reference_type: "admin",
    reference_id: null,
    created_by: actor.id,
    created_at: nowIso,
    note: reasonNote,
  });
  if (ledgerErr) {
    console.error("[admin/studentCredits] ledger grant failed", ledgerErr.message);
    // Soft-fail ledger: credit row exists; surface as 500 so admin retries/investigates.
    return { ok: false, status: 500, error: "Crédit créé mais journalisation incomplète. Vérifie l'audit." };
  }

  await insertAdminAuditLog(admin, {
    actorProfileId: actor.id,
    action: "student_credit.granted",
    targetType: "student_credit",
    targetId: creditRow.id,
    metadata: {
      student_profile_id: studentProfileId,
      amount_cents: amountCents,
      currency,
      reason_code: raw.reasonCode,
      actor_email: actor.email,
    },
  });

  return { ok: true, credit: creditRow };
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
  return (data ?? []) as StudentCreditRow[];
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

  const { data: existing, error: readErr } = await admin
    .from("student_credits")
    .select(STUDENT_CREDIT_SELECT)
    .eq("id", creditId)
    .maybeSingle();
  if (readErr) {
    console.error("[admin/studentCredits] void read failed", readErr.message);
    return { ok: false, status: 500, error: "Annulation impossible. Réessaie." };
  }
  if (!existing) {
    return { ok: false, status: 404, error: "Crédit introuvable." };
  }

  const row = existing as StudentCreditRow;
  if (row.status === "voided") {
    return { ok: false, status: 400, error: "Ce crédit est déjà annulé." };
  }
  if (row.status !== "active") {
    return {
      ok: false,
      status: 400,
      error: "Seuls les crédits actifs peuvent être annulés.",
    };
  }

  const nowIso = new Date().toISOString();
  const remaining = row.remaining_cents;

  const { data: updated, error: updateErr } = await admin
    .from("student_credits")
    .update({
      status: "voided",
      remaining_cents: 0,
      voided_by: actor.id,
      voided_at: nowIso,
      void_reason: voidReason,
    })
    .eq("id", creditId)
    .eq("status", "active")
    .select(STUDENT_CREDIT_SELECT)
    .maybeSingle();

  if (updateErr || !updated) {
    console.error("[admin/studentCredits] void update failed", updateErr?.message);
    return { ok: false, status: 500, error: "Annulation impossible. Réessaie." };
  }

  const credit = updated as StudentCreditRow;

  const { error: ledgerErr } = await admin.from("student_credit_ledger").insert({
    student_credit_id: credit.id,
    student_profile_id: credit.student_profile_id,
    entry_type: "void",
    amount_cents: -remaining,
    balance_after_cents: 0,
    reference_type: "admin",
    reference_id: null,
    created_by: actor.id,
    created_at: nowIso,
    note: voidReason,
  });
  if (ledgerErr) {
    console.error("[admin/studentCredits] ledger void failed", ledgerErr.message);
  }

  await insertAdminAuditLog(admin, {
    actorProfileId: actor.id,
    action: "student_credit.voided",
    targetType: "student_credit",
    targetId: credit.id,
    metadata: {
      student_profile_id: credit.student_profile_id,
      voided_remaining_cents: remaining,
      void_reason: voidReason,
      actor_email: actor.email,
    },
  });

  return { ok: true, credit };
}
