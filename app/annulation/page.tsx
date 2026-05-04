import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique d'annulation | Pratiqo",
  description: "Politique d'annulation et de remboursement Pratiqo.",
};

const TOC = [
  { id: "eleve", label: "Annulation par l'élève" },
  { id: "professeur", label: "Annulation par le professeur" },
  { id: "reprogrammer", label: "Reprogrammer un cours (reschedule)" },
  { id: "domicile", label: "Cours à domicile" },
  { id: "delais", label: "Délais de remboursement" },
  { id: "litiges", label: "Litiges" },
  { id: "contact", label: "Contact" },
] as const;

export default function AnnulationPublicPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(var(--p-page-bg), var(--p-page-bg)), #fff" }}
    >
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-[var(--p-text-muted)] hover:text-[#1D9E75] flex items-center gap-1.5 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
          <span className="text-[var(--p-border-light)]">·</span>
          <span className="text-sm font-medium text-[var(--p-text)]">Annulation</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:flex lg:gap-12">
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <nav
            aria-label="Sommaire"
            className="sticky top-28 rounded-2xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">
              Sommaire
            </p>
            <ol className="space-y-1.5 text-[13px]">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-[var(--p-text-muted)] hover:text-[#1D9E75] hover:underline transition-colors leading-snug block"
                  >
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div
            className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 mb-8"
            role="note"
          >
            ⚠️ Ce document est un modèle préliminaire préparé à titre informatif. Pratiqo inc. recommande de le
            faire réviser par un avocat qualifié au Québec avant tout lancement commercial.
          </div>

          <header className="mb-10">
            <p className="ds-label text-[var(--p-text-subtle)] mb-2">Pratiqo</p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-[var(--p-text)] leading-tight border-l-4 border-[#1D9E75] pl-4">
              Politique d&apos;annulation et de remboursement
            </h1>
            <p className="mt-3 text-sm text-[var(--p-text-muted)]">
              Dernière mise à jour : avril 2026 · Documents connexes :{" "}
              <Link href="/cgu" className="text-[#1D9E75] underline font-medium">
                CGU
              </Link>
              {" · "}
              <Link href="/confidentialite" className="text-[#1D9E75] underline font-medium">
                Confidentialité
              </Link>
              {" · "}
              <Link href="/support" className="text-[#1D9E75] underline font-medium">
                Support
              </Link>
              {" · "}
              <Link href="/code-de-conduite" className="text-[#1D9E75] underline font-medium">
                Code de conduite
              </Link>
            </p>
          </header>

          <details className="lg:hidden mb-8 rounded-2xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm">
            <summary className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] cursor-pointer select-none">
              Sommaire
            </summary>
            <ol className="mt-3 space-y-2 text-[13px]">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-[#1D9E75] hover:underline">
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <article className="space-y-12 text-[15px] leading-relaxed text-[var(--p-text-muted)]">
            <section id="eleve" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                1. Annulation par l&apos;élève
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--p-border-light)] bg-white shadow-sm my-4">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-800">Délai avant le cours</th>
                      <th className="px-4 py-3 font-semibold text-slate-800">Remboursement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">Plus de 24 heures</td>
                      <td className="px-4 py-3 text-slate-700">
                        100&nbsp;% — remboursement complet ou crédit Pratiqo complet
                      </td>
                    </tr>
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">Moins de 24 heures</td>
                      <td className="px-4 py-3 text-slate-700">
                        Crédit Pratiqo possible&nbsp;; remboursement examiné selon la situation
                      </td>
                    </tr>
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">No-show (absent sans annulation)</td>
                      <td className="px-4 py-3 text-slate-700">
                        Aucun remboursement, sauf force majeure ou décision du support
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                Cette politique s&apos;applique sous réserve des lois applicables en matière de protection du
                consommateur.
              </p>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">1.1 Comment annuler</h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#1D9E75]">
                <li>Via l&apos;application Pratiqo : Mon compte → Mes réservations → Annuler</li>
                <li>
                  Par courriel :{" "}
                  <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
                    support@pratiqo.ca
                  </a>{" "}
                  (inclure le numéro de réservation)
                </li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">
                1.2 Circonstances exceptionnelles
              </h3>
              <p>
                En cas d&apos;urgence médicale ou de force majeure (maladie grave, décès familial, catastrophe
                naturelle), Pratiqo peut accorder un remboursement à sa discrétion. Une preuve peut être
                demandée.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section id="professeur" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                2. Annulation par le professeur
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--p-border-light)] bg-white shadow-sm my-4">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-800">Situation</th>
                      <th className="px-4 py-3 font-semibold text-slate-800">Conséquence pour le professeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">Annulation plus de 24h avant</td>
                      <td className="px-4 py-3 text-slate-700">Aucune pénalité</td>
                    </tr>
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">Annulation moins de 24h avant</td>
                      <td className="px-4 py-3 text-slate-700">Avertissement — 3 avertissements = suspension</td>
                    </tr>
                    <tr className="hover:bg-[rgba(29,158,117,0.06)]">
                      <td className="px-4 py-3 text-slate-700">No-show sans annulation</td>
                      <td className="px-4 py-3 text-slate-700">Suspension immédiate possible</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4">
                Si le professeur annule,{" "}
                <strong className="text-[var(--p-text)]">
                  l&apos;élève reçoit un remboursement complet ou un crédit Pratiqo complet
                </strong>
                .
              </p>
            </section>

            <hr className="border-slate-200" />

            <section id="reprogrammer" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                3. Reprogrammer un cours (reschedule)
              </h2>
              <p>
                Reprogrammer un cours est différent de l&apos;annuler. Dans le cadre d&apos;un reschedule, l&apos;élève
                et le professeur s&apos;entendent ensemble sur un nouveau créneau.
              </p>
              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.1 Plus de 24h avant le cours</h3>
              <p>Vous avez deux options :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-[#1D9E75]">
                <li>Annuler ce cours (remboursement 100%) puis réserver un nouveau créneau directement.</li>
                <li>
                  Discuter avec votre professeur (ou votre élève) via la messagerie pour convenir d&apos;un nouveau
                  créneau, sans frais supplémentaire.
                </li>
              </ul>
              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.2 Moins de 24h avant le cours</h3>
              <p>Reprogrammer reste possible, mais uniquement si les deux parties sont d&apos;accord.</p>
              <p className="mt-3 font-medium text-[var(--p-text)]">Procédure :</p>
              <ol className="list-decimal pl-5 space-y-2 mt-2 marker:text-[#1D9E75]">
                <li>Envoyez un message via la messagerie Pratiqo pour proposer un nouveau créneau.</li>
                <li>
                  Si votre professeur (ou votre élève) accepte, contactez{" "}
                  <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
                    support@pratiqo.ca
                  </a>{" "}
                  avec :
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>votre numéro de réservation</li>
                    <li>la nouvelle date sur laquelle vous vous êtes entendus</li>
                  </ul>
                </li>
                <li>Notre équipe mettra votre réservation à jour sous 24h.</li>
              </ol>
              <p className="mt-4">
                Si aucun accord mutuel n&apos;est trouvé, la politique d&apos;annulation ci-dessus (section 1 ou 2)
                prend effet.
              </p>
              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.3 Cas particuliers</h3>
              <p>
                Pour les urgences ou cas de force majeure (voir section 1.2), contactez directement{" "}
                <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
                  support@pratiqo.ca
                </a>
                , peu importe le délai.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section id="domicile" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                4. Cours à domicile
              </h2>
              <p>Pour les cours à domicile, les mêmes règles s&apos;appliquent avec une condition supplémentaire :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-[#1D9E75]">
                <li>
                  Si le professeur refuse le déplacement après avoir accepté la demande : remboursement complet
                  à l&apos;élève + avertissement au professeur
                </li>
                <li>Si l&apos;élève fournit une adresse incorrecte ou inaccessible : aucun remboursement</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            <section id="delais" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                5. Délais de remboursement
              </h2>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#1D9E75]">
                <li>
                  Les remboursements sont traités dans les <strong className="text-[var(--p-text)]">5 à 10 jours ouvrables</strong>
                </li>
                <li>Le remboursement apparaît sur le relevé de la carte de crédit originale</li>
                <li>Les frais de service Pratiqo (10%) sont également remboursés en cas d&apos;annulation éligible</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            <section id="litiges" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                6. Litiges
              </h2>
              <p>
                Tout litige concernant un remboursement doit être signalé dans les{" "}
                <strong className="text-[var(--p-text)]">7 jours</strong> suivant le cours via :
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-[#1D9E75]">
                <li>
                  Courriel :{" "}
                  <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
                    support@pratiqo.ca
                  </a>
                </li>
                <li>
                  Page support :{" "}
                  <Link href="/support" className="text-[#1D9E75] underline font-medium">
                    /support
                  </Link>
                </li>
              </ul>
              <p className="mt-4">Pratiqo agit comme arbitre de bonne foi et sa décision est finale.</p>
            </section>

            <hr className="border-slate-200" />

            <section id="contact" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-[#1D9E75] pl-4 mb-4">
                7. Contact
              </h2>
              <p>
                <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
                  support@pratiqo.ca
                </a>
              </p>
              <p className="mt-2">
                <Link href="/support" className="text-[#1D9E75] underline font-medium">
                  Centre d&apos;aide / support
                </Link>
              </p>
            </section>
          </article>

          <footer className="mt-14 pt-8 border-t border-[var(--p-border-light)]">
            <p className="text-[12px] text-[var(--p-text-muted)] mb-2">Autres documents légaux</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <Link href="/cgu" className="text-[var(--p-text-muted)] hover:text-[#1D9E75] hover:underline">
                CGU
              </Link>
              <Link href="/confidentialite" className="text-[var(--p-text-muted)] hover:text-[#1D9E75] hover:underline">
                Confidentialité
              </Link>
              <span className="text-[#1D9E75] font-medium">Annulation</span>
              <Link
                href="/code-de-conduite"
                className="text-[var(--p-text-muted)] hover:text-[#1D9E75] hover:underline"
              >
                Code de conduite
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
