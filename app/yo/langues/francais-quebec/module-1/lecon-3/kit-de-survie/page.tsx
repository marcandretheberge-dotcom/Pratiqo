import type { Metadata } from "next";
import Link from "next/link";

import { YoPrintButton } from "@/components/yo/YoInteractiveLessonPrimitives";
import { getYoLocale } from "@/lib/yo/localize";

export const metadata: Metadata = {
  title: "Kit de survie Pratiqo — Poser une question sans bloquer",
  description:
    "Kit imprimable YoPratiqo pour pratiquer les amorces, mots-questions, reformulations et rythme au travail.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

function printLabel(locale: "fr" | "en" | "es"): string {
  if (locale === "en") return "Print kit";
  if (locale === "es") return "Imprimir kit";
  return "Imprimer le kit";
}

export default async function FrenchQuebecLesson3SurvivalKitPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;

  return (
    <main className="min-h-[100dvh] bg-[#F7F3EA] px-4 py-6 text-[#12372f] print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          article { box-shadow: none !important; border-color: #b8cfc6 !important; }
          h1, h2, h3, p, li { color: #12372f !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl">
        <nav className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Link
            href={`/yo/langues/francais-quebec/module-1/lecon-3${suffix}`}
            className="rounded-full border border-[#D8ECE6] bg-white px-4 py-2 text-sm font-bold text-[#0F6E56]"
          >
            Retour à la leçon
          </Link>
          <YoPrintButton label={printLabel(locale)} />
        </nav>

        <article className="rounded-[28px] border border-[#D8ECE6] bg-white p-6 shadow-[0_18px_48px_rgba(15,58,52,0.10)] print:rounded-none print:border-0 print:p-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
            Kit de survie Pratiqo
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#0F6E56]">
            Poser une question sans bloquer
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#0F6E56]/75">
            Une fiche imprimable pour pratiquer avant une vraie conversation au travail.
          </p>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">3 amorces sûres</h2>
            <ul className="mt-2 grid gap-2 text-sm font-semibold">
              <li>Excuse-moi, j’aurais une petite question.</li>
              <li>Aurais-tu deux minutes?</li>
              <li>Je veux pas te déranger, mais…</li>
            </ul>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">4 mots-questions essentiels</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-black">
              <p>Où?</p>
              <p>À quelle heure?</p>
              <p>Qui?</p>
              <p>Comment?</p>
            </div>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">3 façons de reformuler</h2>
            <ul className="mt-2 grid gap-2 text-sm font-semibold">
              <li>La réunion, c’est quand?</li>
              <li>Je veux scanner. Comment je fais?</li>
              <li>La salle de pause, je la cherche. C’est où?</li>
            </ul>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">Mini-script de travail</h2>
            <p className="mt-2 rounded-2xl bg-[#F4FBF9] p-4 text-sm font-semibold leading-relaxed print:border print:border-[#D8ECE6]">
              Excuse-moi… j’aurais une petite question. C’est où, la salle de pause?
              <br />
              Si la personne répond « Hein? » : La salle de pause, je la cherche. C’est où?
            </p>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">Rythme</h2>
            <p className="mt-2 text-sm font-semibold">amorce + pause + question courte</p>
          </section>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-lg font-black text-[#0F6E56]">Pratique avec un prof</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              Demandez à votre prof Pratiqo de simuler une question simple, une reformulation après « hein? », puis un ajustement de rythme et d’intonation.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
