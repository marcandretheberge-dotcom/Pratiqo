import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ order_id?: string }>;
};

export default async function PlannedPackageCancelPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const orderId = typeof params.order_id === "string" ? params.order_id.trim() : "";

  return (
    <main className="mx-auto max-w-lg px-4 py-16" data-testid="planned-package-cancel">
      <h1 className="text-2xl font-bold text-slate-900">{t.plannedPackageCheckoutPaymentNotCompleted}</h1>
      <p className="mt-4 text-sm text-slate-700">{t.plannedPackageCheckoutReleasedIfUnpaid}</p>
      {orderId ? (
        <p className="mt-2 font-mono text-xs text-slate-500">{orderId}</p>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800"
      >
        {t.plannedPackagePreflightBackToProfile}
      </Link>
    </main>
  );
}
