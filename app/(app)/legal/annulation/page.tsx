import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "../../../../components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique d'annulation | Pratiqo",
  description: "Politique d'annulation et de remboursement Pratiqo.",
};

const TOC = [
  { id: "eleve", label: "1. Annulation par l'élève" },
  { id: "professeur", label: "2. Annulation par le professeur" },
  { id: "domicile", label: "3. Cours à domicile" },
  { id: "delais", label: "4. Délais de remboursement" },
  { id: "litiges", label: "5. Litiges" },
  { id: "contact", label: "6. Contact" },
] as const;

export default function AnnulationPage() {
  return (
    <LegalLayout
      title="Politique d'annulation et de remboursement — Pratiqo"
      lastUpdated="avril 2026"
      toc={[...TOC]}
      currentPath="/legal/annulation"
    >
      <LegalSection id="eleve" title="1. Annulation par l'élève">
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
          Cette politique s&apos;applique sous réserve des lois applicables en matière de protection du consommateur.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">1.1 Comment annuler</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Via l&apos;application Pratiqo : Mon compte → Mes réservations → Annuler</li>
          <li>
            Par courriel :{" "}
            <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
              support@pratiqo.ca
            </a>{" "}
            (inclure le numéro de réservation)
          </li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">1.2 Circonstances exceptionnelles</h3>
        <p>
          En cas d&apos;urgence médicale ou de force majeure (maladie grave, décès familial, catastrophe naturelle),
          Pratiqo peut accorder un remboursement à sa discrétion. Une preuve peut être demandée.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="professeur" title="2. Annulation par le professeur">
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
          Si le professeur annule, <strong>l&apos;élève reçoit un remboursement complet ou un crédit Pratiqo
          complet</strong>.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="domicile" title="3. Cours à domicile">
        <p>Pour les cours à domicile, les mêmes règles s&apos;appliquent avec une condition supplémentaire :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            Si le professeur refuse le déplacement après avoir accepté la demande : remboursement complet à
            l&apos;élève + avertissement au professeur
          </li>
          <li>Si l&apos;élève fournit une adresse incorrecte ou inaccessible : aucun remboursement</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="delais" title="4. Délais de remboursement">
        <ul className="list-disc pl-5 space-y-2">
          <li>Les remboursements sont traités dans les <strong>5 à 10 jours ouvrables</strong></li>
          <li>Le remboursement apparaît sur le relevé de la carte de crédit originale</li>
          <li>Les frais de service Pratiqo (10%) sont également remboursés en cas d&apos;annulation éligible</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="litiges" title="5. Litiges">
        <p>Tout litige concernant un remboursement doit être signalé dans les <strong>7 jours</strong> suivant le cours via :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            Email :{" "}
            <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
              support@pratiqo.ca
            </a>
          </li>
          <li>
            Formulaire :{" "}
            <a href="https://pratiqo.ca/support" className="text-[#1D9E75] underline font-medium" rel="noopener noreferrer">
              pratiqo.ca/support
            </a>
          </li>
        </ul>
        <p className="mt-4">Pratiqo agit comme arbitre de bonne foi et sa décision est finale.</p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="contact" title="6. Contact">
        <p>
          <a href="mailto:support@pratiqo.ca" className="text-[#1D9E75] underline font-medium">
            support@pratiqo.ca
          </a>
        </p>
        <p>
          <a href="https://pratiqo.ca/support" className="text-[#1D9E75] underline font-medium" rel="noopener noreferrer">
            pratiqo.ca/support
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
