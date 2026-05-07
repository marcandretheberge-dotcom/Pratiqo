import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StripeConnectStatusPayload = {
  stripe_account_id: string;
  stripe_connect_onboarding_complete: boolean;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_requirements_due: string[];
  stripe_connect_disabled_reason: string | null;
  stripe_connect_last_synced_at: string;
};

export type StripeConnectStatusSummary = StripeConnectStatusPayload & {
  canReceivePayments: boolean;
};

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function connectStatusFromStripeAccount(account: Stripe.Account): StripeConnectStatusPayload {
  const requirements = account.requirements;
  const futureRequirements = account.future_requirements;
  const requirementsDue = unique([
    ...(requirements?.currently_due ?? []),
    ...(requirements?.eventually_due ?? []),
    ...(requirements?.past_due ?? []),
    ...(futureRequirements?.currently_due ?? []),
    ...(futureRequirements?.eventually_due ?? []),
    ...(futureRequirements?.past_due ?? []),
  ]);

  return {
    stripe_account_id: account.id,
    stripe_connect_onboarding_complete: Boolean(account.details_submitted),
    stripe_connect_charges_enabled: Boolean(account.charges_enabled),
    stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
    stripe_connect_requirements_due: requirementsDue,
    stripe_connect_disabled_reason: requirements?.disabled_reason ?? null,
    stripe_connect_last_synced_at: new Date().toISOString(),
  };
}

export function summarizeConnectStatus(payload: StripeConnectStatusPayload): StripeConnectStatusSummary {
  return {
    ...payload,
    canReceivePayments:
      payload.stripe_connect_onboarding_complete &&
      payload.stripe_connect_charges_enabled &&
      payload.stripe_connect_payouts_enabled &&
      payload.stripe_connect_requirements_due.length === 0 &&
      !payload.stripe_connect_disabled_reason,
  };
}

export async function syncTeacherConnectStatus(
  admin: SupabaseClient,
  account: Stripe.Account,
  opts: { teacherId?: string | null; userId?: string | null } = {},
): Promise<StripeConnectStatusSummary> {
  const payload = connectStatusFromStripeAccount(account);

  let query = admin.from("teachers").update(payload);
  if (opts.teacherId) {
    query = query.eq("id", opts.teacherId);
  } else if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  } else {
    query = query.eq("stripe_account_id", account.id);
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Failed to sync Stripe Connect status: ${error.message}`);
  }

  return summarizeConnectStatus(payload);
}
