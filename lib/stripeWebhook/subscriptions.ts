import Stripe from "stripe";
import { sendProUpgrade } from "@/lib/email";
import { syncTeacherConnectStatus } from "@/lib/payments/connect";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value.id === "string") return value.id;
  return null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (typeof itemEnd === "number") return new Date(itemEnd * 1000).toISOString();
  const rootEnd = (subscription as unknown as { current_period_end?: number | null }).current_period_end;
  return typeof rootEnd === "number" ? new Date(rootEnd * 1000).toISOString() : null;
}

async function resolveSubscriptionUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = subscription.metadata?.user_id;
  if (metadataUserId) return metadataUserId;

  const admin = getSupabaseAdmin();
  const subscriptionId = subscription.id;
  const customerId = stripeId(subscription.customer);
  const query = admin.from("profiles").select("id").limit(1);
  const { data } = subscriptionId
    ? await query.eq("stripe_subscription_id", subscriptionId).maybeSingle()
    : customerId
      ? await query.eq("stripe_customer_id", customerId).maybeSingle()
      : { data: null };
  return (data as { id?: string } | null)?.id ?? null;
}

export async function setUserPlanFromSubscription(
  subscription: Stripe.Subscription,
  fallback?: { userId?: string | null; customerId?: string | null },
) {
  const userId = fallback?.userId ?? (await resolveSubscriptionUserId(subscription));
  if (!userId) {
    console.warn("[stripe/webhook] subscription missing user id", subscription.id);
    return;
  }

  const admin = getSupabaseAdmin();
  const customerId = fallback?.customerId ?? stripeId(subscription.customer);
  const status = String(subscription.status);
  const plan = status === "active" || status === "trialing" ? "pro" : "free";
  const periodEnd = subscriptionPeriodEnd(subscription);
  const startedAt = plan === "pro" ? new Date().toISOString() : null;

  const { data: previous } = await admin
    .from("profiles")
    .select("plan, pro_started_at")
    .eq("id", userId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    plan,
    subscription_status: status,
    stripe_subscription_id: subscription.id,
    pro_current_period_end: periodEnd,
    pro_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    plan_expires_at: subscription.cancel_at_period_end ? periodEnd : null,
  };
  if (customerId) patch.stripe_customer_id = customerId;
  if (plan === "pro" && !(previous as { pro_started_at?: string | null } | null)?.pro_started_at) {
    patch.pro_started_at = startedAt;
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("[stripe/webhook] plan update failed", error);

  const wasPro = String((previous as { plan?: string | null } | null)?.plan ?? "free").toLowerCase() === "pro";
  if (!wasPro && plan === "pro") {
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle();
      const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
      const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
      if (profEmail) await sendProUpgrade(profEmail, profName);
    } catch (e) {
      console.error("[stripe/webhook] pro upgrade email failed", e);
    }
  }
}

export async function syncSubscriptionFromInvoice(invoice: Stripe.Invoice) {
  const parent =
    (invoice as unknown as {
      subscription?: string | Stripe.Subscription | null;
      parent?: { subscription_details?: { subscription?: string | null } | null } | null;
    }).subscription ??
    (invoice as unknown as {
      parent?: { subscription_details?: { subscription?: string | null } | null } | null;
    }).parent?.subscription_details?.subscription;
  const subscriptionId = stripeId(parent);
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await setUserPlanFromSubscription(subscription);
}

export async function handleConnectAccountUpdated(account: Stripe.Account) {
  const admin = getSupabaseAdmin();
  try {
    await syncTeacherConnectStatus(admin, account);
  } catch (e) {
    console.error("[stripe/webhook] connect account sync failed", e);
  }
}
