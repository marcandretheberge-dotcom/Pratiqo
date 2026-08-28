"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { useLocale } from "@/lib/locale-context";
import { getPwaCopy } from "@/lib/pwa/copy";

export function AppInstallHelpContent() {
  const { locale } = useLocale();
  const copy = getPwaCopy(locale);
  const benefits = [copy.benefitQuickAccess, copy.benefitFullscreen, copy.benefitNotificationsLater];

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#F7FBF8] px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Pratiqo">
            <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-4 text-sm font-semibold text-[#0F6E56] shadow-sm transition hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
          >
            Pratiqo
          </Link>
        </div>

        <div className="mt-10 rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.12)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D9E75]">{copy.installTitle}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[#0F6E56] sm:text-5xl">
            {copy.installHeading}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{copy.installBody}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-[#1D9E75]/15 bg-[#F7FBF8] p-4 text-sm font-semibold text-[#0F6E56]">
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#0F6E56]">iPhone</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">{copy.installIos}</p>
          </article>
          <article className="rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#0F6E56]">Android</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">{copy.installAndroid}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
