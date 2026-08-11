import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, ShieldCheck } from "lucide-react";

import { PRATIQO_MARKETS } from "@/lib/config/markets";
import { SITE_URL } from "@/lib/seo/site";

const URUGUAY_WAITLIST_MAILTO =
  "mailto:info@pratiqo.ca?subject=Liste%20d%27attente%20Pratiqo%20Uruguay";

export const metadata: Metadata = {
  title: "Pratiqo arrive en Uruguay | Lista de espera",
  description:
    "Pratiqo prépare son lancement en Uruguay. Rejoignez la liste d'attente pendant que les réservations payées, les versements et Membre Pro restent désactivés.",
  alternates: {
    canonical: `${SITE_URL}/uy`,
  },
  robots: {
    index: PRATIQO_MARKETS.UY.capabilities.seoEnabled,
    follow: PRATIQO_MARKETS.UY.capabilities.seoEnabled,
  },
  openGraph: {
    title: "Pratiqo arrive en Uruguay",
    description:
      "Le marché Uruguay est en préparation. Rejoignez la liste d'attente sans fausse promesse de réservations ou paiements actifs.",
    url: `${SITE_URL}/uy`,
    siteName: "Pratiqo",
    locale: "es_UY",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pratiqo arrive en Uruguay",
    description:
      "Pratiqo prépare son lancement en Uruguay. Réservations payées, versements et Membre Pro ne sont pas encore actifs.",
    images: ["/og-image.png"],
  },
};

export default function UruguayNextMarketPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF7] text-[#22312D]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-14 sm:px-8 lg:py-20">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#B8D8CD] bg-white px-4 py-2 text-sm font-semibold text-[#0F6E56] shadow-sm">
          <MapPin aria-hidden="true" size={16} />
          Uruguay · prochain marché
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#173B33] sm:text-5xl">
              Pratiqo arrive en Uruguay.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#4F5E59]">
              Pratiqo prépare son lancement en Uruguay pour aider les élèves,
              familles et professeurs à se trouver plus facilement.
            </p>
            <p className="max-w-2xl text-base leading-7 text-[#4F5E59]">
              Le marché Uruguay est en préparation. Les réservations payées,
              les versements aux professeurs et Membre Pro ne sont pas encore
              activés pour l'Uruguay.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={URUGUAY_WAITLIST_MAILTO}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0B5E49]"
              >
                Rejoindre la liste d'attente
                <ArrowRight aria-hidden="true" size={17} />
              </a>
              <Link
                href="/trouver-un-prof"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#B8D8CD] bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:border-[#0F6E56]"
              >
                Explorer Pratiqo au Canada
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[#DDE8E3] bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E5F6EF] text-[#0F6E56]">
                <ShieldCheck aria-hidden="true" size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F6E56]">
                  État du marché
                </p>
                <p className="text-lg font-black text-[#173B33]">
                  Préparation active
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              {[
                ["SEO et présence publique", "Actifs pour cette page d'information"],
                ["Réservations payées", "Pas encore activées"],
                ["Versements professeurs", "Pas encore actifs"],
                ["Membre Pro", "Pas encore actif"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#F7FAF7] p-4">
                  <dt className="font-semibold text-[#173B33]">{label}</dt>
                  <dd className="mt-1 text-[#5C6763]">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <section lang="es" className="rounded-[28px] border border-[#DDE8E3] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 text-[#0F6E56]">
            <Mail aria-hidden="true" size={20} />
            <p className="text-sm font-bold uppercase tracking-[0.18em]">
              Uruguay
            </p>
          </div>
          <h2 className="mt-4 text-2xl font-black text-[#173B33]">
            Pratiqo llega pronto a Uruguay.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4F5E59]">
            Pratiqo está preparando su lanzamiento en Uruguay para ayudar a
            estudiantes, familias y profesores a encontrarse más fácilmente.
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4F5E59]">
            El mercado de Uruguay está en preparación. Las reservas pagas, los
            pagos a profesores y Membre Pro todavía no están activados para
            Uruguay.
          </p>
          <a
            href={URUGUAY_WAITLIST_MAILTO}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#B8D8CD] px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:border-[#0F6E56]"
          >
            Unirse a la lista de espera
          </a>
        </section>
      </section>
    </main>
  );
}
