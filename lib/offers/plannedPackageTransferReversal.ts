/**
 * Admin-only manual Stripe Connect transfer reversal for succeeded planned package transfers.
 *
 * Reverses funds from teacher connected account toward platform balance — no customer refund.
 * No new transfers, payouts, or automatic reversals.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { isPackageLegalReviewCompleted } from "./plannedPackages";
import { isProductionCheckoutEnvironment } from "./plannedPackageStripeCheckout";
import {
  canUsePlannedPackageManualTransferReversals,
  isPlannedPackageManualTransferReversalsEnabled,
} from "./plannedPackageManualTransferReversals";

export const PLANNED_PACKAGE_TRANSFER_REVERSAL_REASONS = [
  "refund_required",
  "cancellation_after_transfer",
  "dispute",
  "admin_correction",
  "teacher_no_show",
  "duplicate_transfer",
  "other",
] as const;

export type PlannedPackageTransferReversalReason =
  (typeof PLANNED_PACKAGE_TRANSFER_REVERSAL_REASONS)[number];

export type StripeTransferReversalsClient = {
  transfers: {
    createReversal: (
      transferId: string,
      params: Stripe.TransferCreateReversalParams,
      options?: Stripe.RequestOptions,
    ) => Promise<Stripe.TransferReversal>;
  };
};

export type PlannedPackageTransferReversalExecutionRow = {
  id: string;
  planned_package_order_id: string;
  transfer_execution_id: string;
  payout_eligibility_entry_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  teacher_offer_id: string | null;
  executed_by: string;
  status: string;
  amount_cents: number;
  currency: string;
  stripe_transfer_id: string;
  stripe_transfer_reversal_id: string | null;
  stripe_balance_transaction_id: string | null;
  idempotency_key: string;
  reversal_reason: string;
  admin_note: string | null;
  failure_code: string | null;
  failure_message: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedPackageTransferExecutionWithReversalRow = {
  id: string;
  planned_package_order_id: string;
  payout_eligibility_entry_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  teacher_offer_id: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  stripe_transfer_id: string | null;
  reversed_cents: number;
  reversal_status: string | null;
};

export type CalculateRemainingReversibleTransferAmountInput = {
  transferAmountCents: number;
  reversedCents: number;
};

export type ExecutePlannedPackageTransferReversalInput = {
  admin: SupabaseClient;
  transferExecutionId: string;
  amountCents?: number;
  reversalReason: string;
  adminNote?: string;
  adminUserId: string;
  idempotencyKey?: string;
  now?: Date;
  stripeClient?: StripeTransferReversalsClient;
};

export type ExecutePlannedPackageTransferReversalSuccess = {
  ok: true;
  reversalExecution: PlannedPackageTransferReversalExecutionRow;
  transferExecution: PlannedPackageTransferExecutionWithReversalRow;
  payoutEligibilityEntry: {
    id: string;
    transferReversalStatus: string | null;
    reversedCents: number;
  };
  reusedExisting: boolean;
};

export type ExecutePlannedPackageTransferReversalFailure = {
  ok: false;
  status: number;
  error: string;
  blockers?: string[];
};

export type ExecutePlannedPackageTransferReversalResult =
  | ExecutePlannedPackageTransferReversalSuccess
  | ExecutePlannedPackageTransferReversalFailure;

export function isPlannedPackageTransferReversalReason(
  value: string,
): value is PlannedPackageTransferReversalReason {
  return (PLANNED_PACKAGE_TRANSFER_REVERSAL_REASONS as readonly string[]).includes(value);
}

export function calculateRemainingReversibleTransferAmount(
  input: CalculateRemainingReversibleTransferAmountInput,
): number {
  const original = Number(input.transferAmountCents ?? 0);
  const reversed = Number(input.reversedCents ?? 0);
  return Math.max(0, original - reversed);
}

export function buildPlannedPackageTransferReversalIdempotencyKey(args: {
  transferExecutionId: string;
  amountCents: number;
  reversalReason: string;
}): string {
  return `planned-package-transfer-reversal-${args.transferExecutionId}-${args.amountCents}-${args.reversalReason}`;
}

export function canExecutePlannedPackageTransferReversalInCurrentEnvironment(): boolean {
  if (!canUsePlannedPackageManualTransferReversals()) return false;
  if (isPackageLegalReviewCompleted()) return true;
  if (isProductionCheckoutEnvironment()) return false;
  return true;
}

function mapReversalRow(row: Record<string, unknown>): PlannedPackageTransferReversalExecutionRow {
  return {
    id: String(row.id ?? ""),
    planned_package_order_id: String(row.planned_package_order_id ?? ""),
    transfer_execution_id: String(row.transfer_execution_id ?? ""),
    payout_eligibility_entry_id: String(row.payout_eligibility_entry_id ?? ""),
    booking_id: String(row.booking_id ?? ""),
    teacher_id: String(row.teacher_id ?? ""),
    student_id: String(row.student_id ?? ""),
    teacher_offer_id: (row.teacher_offer_id as string | null) ?? null,
    executed_by: String(row.executed_by ?? ""),
    status: String(row.status ?? ""),
    amount_cents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    stripe_transfer_id: String(row.stripe_transfer_id ?? ""),
    stripe_transfer_reversal_id: (row.stripe_transfer_reversal_id as string | null) ?? null,
    stripe_balance_transaction_id: (row.stripe_balance_transaction_id as string | null) ?? null,
    idempotency_key: String(row.idempotency_key ?? ""),
    reversal_reason: String(row.reversal_reason ?? ""),
    admin_note: (row.admin_note as string | null) ?? null,
    failure_code: (row.failure_code as string | null) ?? null,
    failure_message: (row.failure_message as string | null) ?? null,
    executed_at: (row.executed_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function mapTransferRow(row: Record<string, unknown>): PlannedPackageTransferExecutionWithReversalRow {
  return {
    id: String(row.id ?? ""),
    planned_package_order_id: String(row.planned_package_order_id ?? ""),
    payout_eligibility_entry_id: String(row.payout_eligibility_entry_id ?? ""),
    booking_id: String(row.booking_id ?? ""),
    teacher_id: String(row.teacher_id ?? ""),
    student_id: String(row.student_id ?? ""),
    teacher_offer_id: (row.teacher_offer_id as string | null) ?? null,
    status: String(row.status ?? ""),
    amount_cents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    stripe_transfer_id: (row.stripe_transfer_id as string | null) ?? null,
    reversed_cents: Number(row.reversed_cents ?? 0),
    reversal_status: (row.reversal_status as string | null) ?? null,
  };
}

function stripeErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

async function loadTransferExecution(admin: SupabaseClient, transferExecutionId: string) {
  const { data, error } = await admin
    .from("planned_package_transfer_executions")
    .select("*")
    .eq("id", transferExecutionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function sumSucceededReversalCents(admin: SupabaseClient, transferExecutionId: string) {
  const { data, error } = await admin
    .from("planned_package_transfer_reversal_executions")
    .select("amount_cents")
    .eq("transfer_execution_id", transferExecutionId)
    .eq("status", "succeeded");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { amount_cents: number }[]).reduce(
    (sum, row) => sum + Number(row.amount_cents ?? 0),
    0,
  );
}

export async function packageOrderHasUnreversedPlannedPackageTransfer(
  admin: SupabaseClient,
  orderId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("planned_package_transfer_executions")
    .select("amount_cents, reversed_cents, status")
    .eq("planned_package_order_id", orderId)
    .eq("status", "succeeded");

  if (error) throw new Error(error.message);

  return ((data ?? []) as { amount_cents: number; reversed_cents: number | null }[]).some(
    (row) =>
      calculateRemainingReversibleTransferAmount({
        transferAmountCents: Number(row.amount_cents ?? 0),
        reversedCents: Number(row.reversed_cents ?? 0),
      }) > 0,
  );
}

export async function executePlannedPackageTransferReversal(
  input: ExecutePlannedPackageTransferReversalInput,
): Promise<ExecutePlannedPackageTransferReversalResult> {
  if (!isPlannedPackageManualTransferReversalsEnabled()) {
    return { ok: false, status: 403, error: "manual_transfer_reversals_disabled" };
  }
  if (!canUsePlannedPackageManualTransferReversals()) {
    return { ok: false, status: 403, error: "manual_transfer_reversals_disabled" };
  }
  if (!canExecutePlannedPackageTransferReversalInCurrentEnvironment()) {
    return { ok: false, status: 403, error: "legal_review_required" };
  }

  const reversalReason = String(input.reversalReason ?? "").trim();
  if (!reversalReason) {
    return { ok: false, status: 400, error: "reversal_reason_required" };
  }
  if (!isPlannedPackageTransferReversalReason(reversalReason)) {
    return { ok: false, status: 400, error: "reversal_reason_required" };
  }

  const transferRow = await loadTransferExecution(input.admin, input.transferExecutionId);
  if (!transferRow) {
    return { ok: false, status: 404, error: "transfer_execution_not_found" };
  }

  const transferStatus = String(transferRow.status ?? "");
  if (transferStatus !== "succeeded") {
    return { ok: false, status: 409, error: "transfer_not_succeeded" };
  }

  const stripeTransferId = (transferRow.stripe_transfer_id as string | null)?.trim() ?? "";
  if (!stripeTransferId) {
    return { ok: false, status: 409, error: "stripe_transfer_missing" };
  }

  const transferAmountCents = Number(transferRow.amount_cents ?? 0);
  const storedReversedCents = Number(transferRow.reversed_cents ?? 0);
  const succeededReversalSum = await sumSucceededReversalCents(
    input.admin,
    input.transferExecutionId,
  );
  const alreadyReversedCents = Math.max(storedReversedCents, succeededReversalSum);
  const remainingReversibleCents = calculateRemainingReversibleTransferAmount({
    transferAmountCents,
    reversedCents: alreadyReversedCents,
  });

  if (remainingReversibleCents <= 0) {
    return { ok: false, status: 409, error: "transfer_already_fully_reversed" };
  }

  const amountCents =
    input.amountCents === undefined || input.amountCents === null
      ? remainingReversibleCents
      : Number(input.amountCents);

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, status: 400, error: "reversal_amount_invalid" };
  }
  if (amountCents > remainingReversibleCents) {
    return { ok: false, status: 409, error: "reversal_amount_exceeds_remaining" };
  }

  const currency = String(transferRow.currency ?? "CAD").toUpperCase();
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    buildPlannedPackageTransferReversalIdempotencyKey({
      transferExecutionId: input.transferExecutionId,
      amountCents,
      reversalReason,
    });

  const { data: existingSucceeded } = await input.admin
    .from("planned_package_transfer_reversal_executions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "succeeded")
    .maybeSingle();

  if (existingSucceeded) {
    return {
      ok: true,
      reversalExecution: mapReversalRow(existingSucceeded as Record<string, unknown>),
      transferExecution: mapTransferRow(transferRow),
      payoutEligibilityEntry: {
        id: String(transferRow.payout_eligibility_entry_id ?? ""),
        transferReversalStatus:
          remainingReversibleCents - amountCents <= 0 ? "fully_reversed" : "partially_reversed",
        reversedCents: alreadyReversedCents + amountCents,
      },
      reusedExisting: true,
    };
  }

  const orderId = String(transferRow.planned_package_order_id ?? "");
  const entryId = String(transferRow.payout_eligibility_entry_id ?? "");
  const bookingId = String(transferRow.booking_id ?? "");
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const { data: pendingExisting } = await input.admin
    .from("planned_package_transfer_reversal_executions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  let reversalExecutionId: string;
  if (pendingExisting) {
    const pendingStatus = String((pendingExisting as Record<string, unknown>).status ?? "");
    if (pendingStatus === "succeeded") {
      return {
        ok: true,
        reversalExecution: mapReversalRow(pendingExisting as Record<string, unknown>),
        transferExecution: mapTransferRow(transferRow),
        payoutEligibilityEntry: {
          id: entryId,
          transferReversalStatus:
            remainingReversibleCents - amountCents <= 0 ? "fully_reversed" : "partially_reversed",
          reversedCents: alreadyReversedCents + amountCents,
        },
        reusedExisting: true,
      };
    }
    reversalExecutionId = String((pendingExisting as Record<string, unknown>).id ?? "");
  } else {
    const { data: inserted, error: insertErr } = await input.admin
      .from("planned_package_transfer_reversal_executions")
      .insert({
        planned_package_order_id: orderId,
        transfer_execution_id: input.transferExecutionId,
        payout_eligibility_entry_id: entryId,
        booking_id: bookingId,
        teacher_id: String(transferRow.teacher_id ?? ""),
        student_id: String(transferRow.student_id ?? ""),
        teacher_offer_id: (transferRow.teacher_offer_id as string | null) ?? null,
        executed_by: input.adminUserId,
        status: "pending",
        amount_cents: amountCents,
        currency,
        stripe_transfer_id: stripeTransferId,
        idempotency_key: idempotencyKey,
        reversal_reason: reversalReason,
        admin_note: input.adminNote?.trim() || null,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return { ok: false, status: 500, error: "transfer_reversal_execution_failed" };
    }
    reversalExecutionId = String((inserted as Record<string, unknown>).id ?? "");
  }

  await input.admin
    .from("planned_package_transfer_executions")
    .update({ reversal_status: "pending", updated_at: nowIso })
    .eq("id", input.transferExecutionId);

  const { data: entryRow } = await input.admin
    .from("planned_package_payout_eligibility_entries")
    .select("package_session_index")
    .eq("id", entryId)
    .maybeSingle();

  const sessionIndex = Number((entryRow as { package_session_index?: number } | null)?.package_session_index ?? 0);

  const stripeClient =
    input.stripeClient ?? (stripe as unknown as StripeTransferReversalsClient);

  let stripeReversal: Stripe.TransferReversal;
  try {
    stripeReversal = await stripeClient.transfers.createReversal(
      stripeTransferId,
      {
        amount: amountCents,
        metadata: {
          planned_package_order_id: orderId,
          transfer_execution_id: input.transferExecutionId,
          payout_eligibility_entry_id: entryId,
          booking_id: bookingId,
          teacher_id: String(transferRow.teacher_id ?? ""),
          teacher_offer_id: String(transferRow.teacher_offer_id ?? ""),
          student_id: String(transferRow.student_id ?? ""),
          package_session_index: String(sessionIndex),
          package_type: "planned_package",
          reversal_reason: reversalReason,
          executed_by_admin_id: input.adminUserId,
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    const code = stripeErrorCode(err);
    const message = err instanceof Error ? err.message : "stripe_transfer_reversal_failed";
    const failureCode =
      code === "balance_insufficient"
        ? "insufficient_connected_account_balance"
        : "stripe_transfer_reversal_failed";

    await input.admin
      .from("planned_package_transfer_reversal_executions")
      .update({
        status: "failed",
        failure_code: failureCode,
        failure_message: message.slice(0, 500),
        updated_at: nowIso,
      })
      .eq("id", reversalExecutionId);

    await input.admin
      .from("planned_package_transfer_executions")
      .update({ reversal_status: "failed", updated_at: nowIso })
      .eq("id", input.transferExecutionId);

    return {
      ok: false,
      status: code === "balance_insufficient" ? 409 : 502,
      error:
        failureCode === "insufficient_connected_account_balance"
          ? "insufficient_connected_account_balance"
          : "stripe_transfer_reversal_failed",
    };
  }

  const newReversedCents = alreadyReversedCents + amountCents;
  const fullyReversed = newReversedCents >= transferAmountCents;
  const reversalStatus = fullyReversed ? "fully_reversed" : "partially_reversed";

  const { data: succeededReversal, error: successErr } = await input.admin
    .from("planned_package_transfer_reversal_executions")
    .update({
      status: "succeeded",
      stripe_transfer_reversal_id: stripeReversal.id,
      stripe_balance_transaction_id:
        typeof stripeReversal.balance_transaction === "string"
          ? stripeReversal.balance_transaction
          : ((stripeReversal.balance_transaction as { id?: string } | null)?.id ?? null),
      executed_at: nowIso,
      failure_code: null,
      failure_message: null,
      updated_at: nowIso,
    })
    .eq("id", reversalExecutionId)
    .select("*")
    .single();

  if (successErr || !succeededReversal) {
    return { ok: false, status: 500, error: "transfer_reversal_execution_failed" };
  }

  const { data: updatedTransfer } = await input.admin
    .from("planned_package_transfer_executions")
    .update({
      reversed_cents: newReversedCents,
      reversal_status: reversalStatus,
      last_reversal_execution_id: reversalExecutionId,
      reversed_at: fullyReversed ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("id", input.transferExecutionId)
    .select("*")
    .single();

  await input.admin
    .from("planned_package_payout_eligibility_entries")
    .update({
      transfer_reversal_status: reversalStatus,
      reversed_cents: newReversedCents,
      last_transfer_reversal_execution_id: reversalExecutionId,
      updated_at: nowIso,
    })
    .eq("id", entryId);

  return {
    ok: true,
    reversalExecution: mapReversalRow(succeededReversal as Record<string, unknown>),
    transferExecution: mapTransferRow(
      (updatedTransfer as Record<string, unknown> | null) ?? transferRow,
    ),
    payoutEligibilityEntry: {
      id: entryId,
      transferReversalStatus: reversalStatus,
      reversedCents: newReversedCents,
    },
    reusedExisting: false,
  };
}
