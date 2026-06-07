import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";

const actions = [
  { href: "/", label: "Retour a l'accueil", primary: true },
  { href: "/trouver-un-prof", label: "Trouver un cours" },
  { href: "/yo", label: "Explorer YoPratiqo" },
  { href: "/contact", label: "Contacter Pratiqo" },
];

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-[#F7FBF8] px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col items-center justify-center">
        <div className="w-full rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.12)] sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Pratiqo - accueil">
              <PratiqoLogo variant="full" size="sm" priority={false} fetchPriority="low" loading="lazy" />
            </Link>
            <span className="rounded-full border border-[#1D9E75]/20 bg-[#DDF4F1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0F6E56]">
              404
            </span>
          </div>

          <div className="mt-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1D9E75]">Page introuvable</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0F6E56] sm:text-5xl">
              Cette page n'existe pas ou a ete deplacee.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Le lien a peut-etre change. Vous pouvez retourner a l'accueil, trouver un professeur ou continuer avec
              YoPratiqo.
            </p>
            <p className="mt-3 text-sm text-slate-500" lang="en">
              Page not found. This page may have moved.
            </p>
          </div>

          <nav className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap" aria-label="Actions utiles">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.primary
                    ? "inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
                    : "inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-5 py-3 text-sm font-semibold text-[#0F6E56] transition hover:border-[#1D9E75] hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
                }
              >
                {action.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
