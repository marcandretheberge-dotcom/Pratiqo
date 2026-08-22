import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { PLANNED_PACKAGE_STRIPE_METADATA_TYPE } from "@/lib/offers/plannedPackageStripeCheckout";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function PlannedPackageSuccessPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id.trim() : "";

  let state: "missing" | "pending" | "confirmed" | "failed" = "missing";
  let titleSnapshot = "";

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const md = session.metadata as Record<string, string> | undefined;
      if (md?.package_type === PLANNED_PACKAGE_STRIPE_METADATA_TYPE && md.planned_package_order_id) {
        const admin = getSupabaseAdmin();
        const { data: order } = await admin
          .from("planned_package_pending_orders")
          .select("id, status, title_snapshot, student_id, stripe_checkout_session_id")
          .eq("id", md.planned_package_order_id)
          .maybeSingle();

        if (order && order.stripe_checkout_session_id === sessionId) {
          titleSnapshot = String(order.title_snapshot ?? "");
          const status = String(order.status ?? "");
          if (status === "fulfilled") {
            state = "confirmed";
          } else if (status === "fulfillment_failed") {
            state = "failed";
          } else if (session.payment_status === "paid") {
            state = "pending";
          } else {
            state = "failed";
          }
        }
      }
    } catch {
      state = "failed";
    }
  }

  const headline =
    state === "confirmed"
      ? t.plannedPackageSessionsConfirmed
      : state === "pending"
        ? t.plannedPackageCheckoutPaymentReceived
        : state === "failed"
          ? t.plannedPackageCheckoutVerifySupport
          : t.plannedPackageCheckoutVerifySupport;

  return (
    <main className="mx-auto max-w-lg px-4 py-16" data-testid="planned-package-success">
      <h1 className="text-2xl font-bold text-slate-900">{headline}</h1>
      {titleSnapshot ? (
        <p className="mt-2 text-sm text-slate-700">{titleSnapshot}</p>
      ) : null}
      {state === "pending" ? (
        <p className="mt-4 text-sm text-slate-600">{t.plannedPackageCheckoutFacilitatedByPratiqo}</p>
      ) : null}
      {state === "confirmed" ? (
        <p className="mt-4 text-sm text-slate-600">{t.plannedPackageTeacherTransferAfterSessions}</p>
      ) : null}
      <Link
        href="/student/bookings"
        className="mt-8 inline-flex min-h-10 items-center justify-center rounded-full bg-teal-600 px-6 text-sm font-semibold text-white"
      >
        {t.bookingSuccessBackToBooking}
      </Link>
    </main>
  );
}
