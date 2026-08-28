"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { useLocale } from "@/lib/locale-context";
import { getPwaCopy } from "@/lib/pwa/copy";

export function OfflineFallback() {
  const { locale } = useLocale();
  const copy = getPwaCopy(locale);

  return (
    <main className="min-h-[100dvh] bg-[#F7FBF8] px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col items-center justify-center">
        <div className="w-full rounded-[2rem] border border-emerald-100 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,110,86,0.12)] sm:p-10">
          <div className="flex justify-center">
            <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
          </div>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-[#1D9E75]">Pratiqo</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F6E56] sm:text-4xl">
            {copy.offlineTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">{copy.offlineBody}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{copy.offlineRetry}</p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
          >
            Pratiqo
          </Link>
        </div>
      </section>
    </main>
  );
}
