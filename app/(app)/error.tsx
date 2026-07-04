"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

type AppErrorPageProps = {
  error: Error;
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function AppErrorPage({ reset, unstable_retry }: AppErrorPageProps) {
  const { t } = useLocale();
  const retry = unstable_retry ?? reset;

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--p-border-light)] bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,110,86,0.08)] sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Oops</p>
        <h1 className="mt-3 text-2xl font-bold text-[var(--p-text)] sm:text-3xl">{t("anErrorOccurred")}</h1>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {retry ? (
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white transition hover:brightness-[0.98]"
            >
              {t("companionProfileSyncRetry")}
            </button>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
          >
            {t("loginContinueDashboard")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
          >
            {t("loginReturnHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
