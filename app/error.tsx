"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";

type ErrorPageProps = {
  error: Error;
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function ErrorPage({ reset, unstable_retry }: ErrorPageProps) {
  const retry = unstable_retry ?? reset;

  return (
    <main className="min-h-[100dvh] bg-[#F7FBF8] px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col items-center justify-center">
        <div className="w-full rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.12)] sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Pratiqo - accueil">
              <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
            </Link>
            <span className="rounded-full border border-[#F4B400]/30 bg-[#FFF4D6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0F6E56]">
              Besoin d'un instant
            </span>
          </div>

          <div className="mt-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D9E75]">
              Une erreur est survenue
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0F6E56] sm:text-5xl">
              Vous pouvez reessayer ou retourner a l'accueil.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Nous n'affichons pas les details techniques ici afin de proteger vos informations. Si le probleme
              persiste, contactez Pratiqo.
            </p>
            <p className="mt-3 text-sm text-slate-500" lang="en">
              Something went wrong. You can try again or return home.
            </p>
          </div>

          <nav className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap" aria-label="Actions utiles">
            {retry ? (
              <button
                type="button"
                onClick={() => retry()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
              >
                Reessayer
              </button>
            ) : null}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-5 py-3 text-sm font-semibold text-[#0F6E56] transition hover:border-[#1D9E75] hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
            >
              Retour a l'accueil
            </Link>
            <Link
              href="/trouver-un-prof"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-5 py-3 text-sm font-semibold text-[#0F6E56] transition hover:border-[#1D9E75] hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
            >
              Trouver un cours
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-5 py-3 text-sm font-semibold text-[#0F6E56] transition hover:border-[#1D9E75] hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
            >
              Contacter Pratiqo
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
