/**
 * Create Stripe Checkout Session for a planned package pending order.
 * Platform charge — transfer_group only. No destination charge / transfer.
 */

import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/seo/site";
import { teacherPaymentReadinessFailureReasons } from "@/lib/teachers/readinessContracts";
import { runPlannedPackageCheckoutPreflight } from "./runPlannedPackageCheckoutPreflight";
import {
  canCreatePlannedPackageCheckoutInCurrentEnvironment,
  canUsePlannedPackageStripeCheckout,
  getPlannedPackageCheckoutEnvironmentBlockers,
  plannedPackageTransferGroup,
  PLANNED_PACKAGE_STRIPE_METADATA_TYPE,
} from "./plannedPackageStripeCheckout";
import { isActiveHold } from "./plannedPackageTemporaryHolds";
import { expireStalePlannedPackageHolds } from "./plannedPackageHoldQueries";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function checkoutPublicBase(): string {
  const raw = process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || SITE_URL;
  return raw.replace(/\/+$/, "");
}

export type CreatePlannedPackageCheckoutResult =
  | { ok: true; url: string; sessionId: string; reused: boolean }
  | { ok: false; status: number; error: string };

type OrderRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  teacher_offer_id: string;
  draft_id: string;
  status: string;
  session_count: number;
  duration_minutes: number;
  price_cents_snapshot: number;
  currency_snapshot: string;
  title_snapshot: string;
  hold_expires_at: string;
  updated_at: string;
  stripe_checkout_session_id: string | null;
};

async function loadOwnedPendingOrder(
  admin: ReturnType<typeof adminClient>,
  orderId: string,
  studentId: string,
): Promise<OrderRow | null> {
  const { data } = await admin
    .from("planned_package_pending_orders")
    .select(
      "id, student_id, teacher_id, teacher_offer_id, draft_id, status, session_count, duration_minutes, price_cents_snapshot, currency_snapshot, title_snapshot, hold_expires_at, updated_at, stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

async function verifyActiveHolds(
  admin: ReturnType<typeof adminClient>,
  orderId: string,
  sessionCount: number,
): Promise<boolean> {
  const { data: holds } = await admin
    .from("planned_package_session_holds")
    .select("id, status, expires_at")
    .eq("pending_order_id", orderId);
  const active = ((holds ?? []) as { status: string; expires_at: string }[]).filter((h) =>
    isActiveHold({ status: h.status, expires_at: h.expires_at }),
  );
  return active.length === sessionCount;
}

async function reuseOpenCheckoutSession(
  sessionId: string,
  order: OrderRow,
): Promise<CreatePlannedPackageCheckoutResult | null> {
  let existing: Stripe.Checkout.Session;
  try {
    existing = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
  if (existing.status === "open" && existing.url) {
    return { ok: true, url: existing.url, sessionId: existing.id, reused: true };
  }
  if (existing.status === "complete") {
    return { ok: false, status: 409, error: "order_not_active" };
  }
  return null;
}

export async function createPlannedPackageStripeCheckoutSession(args: {
  orderId: string;
  studentId: string;
}): Promise<CreatePlannedPackageCheckoutResult> {
  if (!canUsePlannedPackageStripeCheckout()) {
    return { ok: false, status: 403, error: "planned_package_checkout_disabled" };
  }
  const envBlockers = getPlannedPackageCheckoutEnvironmentBlockers();
  if (envBlockers.length > 0 || !canCreatePlannedPackageCheckoutInCurrentEnvironment()) {
    if (envBlockers.includes("package_legal_review_required")) {
      return { ok: false, status: 403, error: "package_legal_review_required" };
    }
    if (envBlockers.includes("checkout_test_mode_required")) {
      return { ok: false, status: 403, error: "checkout_test_mode_required" };
    }
    return { ok: false, status: 403, error: "planned_package_checkout_disabled" };
  }

  const admin = adminClient();
  await expireStalePlannedPackageHolds(admin);

  const order = await loadOwnedPendingOrder(admin, args.orderId, args.studentId);
  if (!order) {
    return { ok: false, status: 404, error: "order_not_found" };
  }
  if (order.status !== "pending_payment") {
    return { ok: false, status: 409, error: "order_not_active" };
  }

  const holdExpires = new Date(order.hold_expires_at).getTime();
  if (!Number.isFinite(holdExpires) || holdExpires <= Date.now()) {
    return { ok: false, status: 409, error: "order_hold_expired" };
  }

  const holdsOk = await verifyActiveHolds(admin, order.id, order.session_count);
  if (!holdsOk) {
    return { ok: false, status: 409, error: "order_hold_expired" };
  }

  const preflight = await runPlannedPackageCheckoutPreflight({
    studentId: args.studentId,
    draftId: order.draft_id,
  });
  if (!preflight.ok || !preflight.result.sessions.every((s) => s.valid)) {
    return { ok: false, status: 409, error: "order_preflight_failed" };
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select(
      "id, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason",
    )
    .eq("id", order.teacher_id)
    .maybeSingle();

  if (
    !teacher ||
    teacherPaymentReadinessFailureReasons(
      teacher as Parameters<typeof teacherPaymentReadinessFailureReasons>[0],
    ).length > 0
  ) {
    return { ok: false, status: 409, error: "teacher_payment_not_ready" };
  }

  if (order.stripe_checkout_session_id) {
    const reused = await reuseOpenCheckoutSession(order.stripe_checkout_session_id, order);
    if (reused) return reused;
  }

  const baseUrl = checkoutPublicBase();
  const transferGroup = plannedPackageTransferGroup(order.id);
  const currency = order.currency_snapshot.toLowerCase();
  const unitAmount = order.price_cents_snapshot;

  const metadata: Record<string, string> = {
    planned_package_order_id: order.id,
    teacher_id: order.teacher_id,
    teacher_offer_id: order.teacher_offer_id,
    student_id: order.student_id,
    package_type: PLANNED_PACKAGE_STRIPE_METADATA_TYPE,
    transfer_group: transferGroup,
    price_cents_snapshot: String(unitAmount),
    currency_snapshot: order.currency_snapshot,
  };

  const idempotencyKey = `planned-package-checkout-${order.id}-${order.updated_at}`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: `${baseUrl}/packages/planned/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/packages/planned/cancel?order_id=${encodeURIComponent(order.id)}`,
        client_reference_id: order.id,
        metadata,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmount,
              product_data: {
                name: order.title_snapshot,
                description: `${order.session_count} séances · forfait proposé par le professeur`,
              },
            },
          },
        ],
        payment_intent_data: {
          metadata,
          transfer_group: transferGroup,
        },
      },
      { idempotencyKey },
    );
  } catch {
    return { ok: false, status: 500, error: "stripe_checkout_failed" };
  }

  if (!session.url) {
    return { ok: false, status: 500, error: "stripe_checkout_failed" };
  }

  const checkoutExpiresAt =
    typeof session.expires_at === "number"
      ? new Date(session.expires_at * 1000).toISOString()
      : null;

  await admin
    .from("planned_package_pending_orders")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_checkout_status: session.status ?? "open",
      checkout_expires_at: checkoutExpiresAt,
      payment_reference: session.id,
    })
    .eq("id", order.id)
    .eq("status", "pending_payment");

  return { ok: true, url: session.url, sessionId: session.id, reused: false };
}
