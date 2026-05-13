import { getSupabaseAdmin } from "./supabaseAdmin";

/** +$1 per referral, cap $20 per year */
export const REFERRAL_YEARLY_CAP = 20;

/** Dollar amounts awarded at each companion stage index (0-indexed; index 0 = no bonus) */
export const COMPANION_MILESTONE_AMOUNTS: Record<number, number> = {
  1: 5,   // Stage 2 (Poussin / Sprout / Lizard / Star)
  2: 10,  // Stage 3
  3: 15,  // Stage 4
  4: 25,  // Stage 5 (max — Phoenix / Forest / Legendary / Supernova)
};

export type CreditType =
  | "companion_evolution"
  | "referral"
  | "referee_bonus"
  | "review"
  | "credit_used"
  | "booking_refund";

async function currentBalance(userId: string): Promise<number> {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("credit_balance")
    .eq("id", userId)
    .maybeSingle();
  return Number((data as { credit_balance?: number | null } | null)?.credit_balance ?? 0);
}

/** Sum of referral credits awarded this calendar year for `userId`. */
export async function getReferralYearlyTotal(userId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data } = await admin
    .from("credit_transactions")
    .select("amount")
    .eq("user_id", userId)
    .in("type", ["referral", "referee_bonus"])
    .gte("created_at", yearStart);
  return (data ?? []).reduce((s: number, t: { amount: number | string }) => s + Number(t.amount), 0);
}

/**
 * Award credits to a user.
 * `referenceId` enforces idempotency via DB unique constraint (user_id, type, reference_id).
 * For referral credits the yearly cap of $20 is enforced automatically.
 */
export async function awardCredit(
  userId: string,
  type: CreditType,
  description: string,
  referenceId: string,
  amount = 1,
): Promise<{ awarded: boolean; newBalance: number }> {
  const admin = getSupabaseAdmin();

  // Enforce yearly referral cap
  if (type === "referral" || type === "referee_bonus") {
    const yearTotal = await getReferralYearlyTotal(userId);
    if (yearTotal >= REFERRAL_YEARLY_CAP) {
      return { awarded: false, newBalance: await currentBalance(userId) };
    }
    amount = Math.min(amount, REFERRAL_YEARLY_CAP - yearTotal);
    if (amount <= 0) return { awarded: false, newBalance: await currentBalance(userId) };
  }

  const bal = await currentBalance(userId);

  const { error: txnErr } = await admin.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    reference_id: referenceId,
    status: "active",
  });

  if (txnErr) {
    if (txnErr.code === "23505") return { awarded: false, newBalance: bal };
    console.error("[credits] insert failed", txnErr);
    return { awarded: false, newBalance: bal };
  }

  const newBalance = bal + amount;
  await admin.from("profiles").update({ credit_balance: newBalance }).eq("id", userId);
  return { awarded: true, newBalance };
}

/**
 * Deduct credits from a user's balance after a successful payment.
 * Idempotent: safe to call twice for the same bookingId.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  bookingId: string,
): Promise<{ ok: boolean }> {
  if (amount <= 0) return { ok: true };
  const admin = getSupabaseAdmin();

  const bal = await currentBalance(userId);
  if (bal < amount) return { ok: false };

  const { error: txnErr } = await admin.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type: "credit_used",
    description: "Crédits utilisés lors d'une réservation",
    reference_id: `used:${bookingId}`,
    status: "used",
  });

  if (txnErr) {
    if (txnErr.code === "23505") return { ok: true }; // already deducted
    console.error("[credits] deduct failed", txnErr);
    return { ok: false };
  }

  await admin
    .from("profiles")
    .update({ credit_balance: Math.max(0, bal - amount) })
    .eq("id", userId);

  return { ok: true };
}
