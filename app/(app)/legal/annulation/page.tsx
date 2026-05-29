import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "../../../../components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique d'annulation | Pratiqo",
  description: "Politique d'annulation et de remboursement Pratiqo.",
  alternates: {
    canonical: "/legal/annulation",
  },
};

const TOC = [
  { id: "eleve", label: "1. Annulation par l'élève" },
  { id: "professeur", label: "2. Annulation par le professeur" },
  { id: "reprogrammer", label: "3. Reprogrammer un cours (reschedule)" },
  { id: "domicile", label: "4. Cours à domicile" },
  { id: "garantie-premier-cours", label: "5. Garantie satisfaction du premier cours" },
  { id: "delais", label: "6. Délais de remboursement" },
  { id: "litiges", label: "7. Litiges" },
  { id: "contact", label: "8. Contact" },
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
              <tr className="hover:bg-teal-500/10">
                <td className="px-4 py-3 text-slate-700">Plus de 24 heures</td>
                <td className="px-4 py-3 text-slate-700">
                  100&nbsp;% — remboursement complet ou crédit Pratiqo complet
                </td>
              </tr>
              <tr className="hover:bg-teal-500/10">
                <td className="px-4 py-3 text-slate-700">Moins de 24 heures</td>
                <td className="px-4 py-3 text-slate-700">
                  Crédit Pratiqo possible&nbsp;; remboursement examiné selon la situation
                </td>
              </tr>
              <tr className="hover:bg-teal-500/10">
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
            <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
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
              <tr className="hover:bg-teal-500/10">
                <td className="px-4 py-3 text-slate-700">Annulation plus de 24h avant</td>
                <td className="px-4 py-3 text-slate-700">Aucune pénalité</td>
              </tr>
              <tr className="hover:bg-teal-500/10">
                <td className="px-4 py-3 text-slate-700">Annulation moins de 24h avant</td>
                <td className="px-4 py-3 text-slate-700">Avertissement — 3 avertissements = suspension</td>
              </tr>
              <tr className="hover:bg-teal-500/10">
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

      <LegalSection id="reprogrammer" title="3. Reprogrammer un cours (reschedule)">
        <p>
          Reprogrammer un cours est différent de l&apos;annuler. Dans le cadre d&apos;un reschedule, l&apos;élève et
          le professeur s&apos;entendent ensemble sur un nouveau créneau.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.1 Plus de 24h avant le cours</h3>
        <p>Vous avez deux options :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            Annuler ce cours (remboursement 100%) puis réserver un nouveau créneau directement.
          </li>
          <li>
            Discuter avec votre professeur (ou votre élève) via la messagerie pour convenir d&apos;un nouveau créneau,
            sans frais supplémentaire.
          </li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.2 Moins de 24h avant le cours</h3>
        <p>Reprogrammer reste possible, mais uniquement si les deux parties sont d&apos;accord.</p>
        <p className="mt-3 font-medium text-[var(--p-text)]">Procédure :</p>
        <ol className="list-decimal pl-5 space-y-2 mt-2">
          <li>Envoyez un message via la messagerie Pratiqo pour proposer un nouveau créneau.</li>
          <li>
            Si votre professeur (ou votre élève) accepte, contactez{" "}
            <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
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
          Si aucun accord mutuel n&apos;est trouvé, la politique d&apos;annulation ci-dessus (section 1 ou 2) prend
          effet.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.3 Cas particuliers</h3>
        <p>
          Pour les urgences ou cas de force majeure (voir section 1.2), contactez directement{" "}
          <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
            support@pratiqo.ca
          </a>
          , peu importe le délai.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="domicile" title="4. Cours à domicile">
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

      <LegalSection id="garantie-premier-cours" title="5. Garantie satisfaction du premier cours">
        <p>
          Pratiqo offre une garantie satisfaction sur le tout premier cours terminé d&apos;un élève sur la plateforme.
          Cette garantie a pour objectif de faciliter le premier contact avec un professeur sans risque perçu.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.1 Comment ça fonctionne</h3>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            La garantie s&apos;applique uniquement au premier cours terminé sur le compte de l&apos;élève.
          </li>
          <li>
            La demande doit être déposée dans les <strong>24 heures</strong> qui suivent la fin du cours.
          </li>
          <li>
            La demande se fait depuis <strong>Mes paiements et reçus</strong>, ou par courriel à
            {" "}
            <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
              support@pratiqo.ca
            </a>.
          </li>
          <li>
            Une seule demande de garantie premier cours est possible par compte.
          </li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.2 Examen de la demande</h3>
        <p>
          La demande ouvre automatiquement un dossier de résolution traité <strong>manuellement par l&apos;équipe
          Pratiqo</strong>. Le versement au professeur peut être mis en attente le temps de l&apos;examen.
          L&apos;équipe peut contacter l&apos;élève et le professeur pour comprendre la situation avant toute décision.
        </p>
        <p className="mt-4">
          Cette garantie ne remplace pas les recours existants&nbsp;: au-delà des 24 heures, la procédure standard
          de litige (section 7) s&apos;applique. Aucune décision n&apos;est prise de manière automatique&nbsp;:
          chaque dossier est examiné individuellement selon les faits.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.3 Limites</h3>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            La garantie ne s&apos;applique pas si le cours a été marqué comme absence côté élève.
          </li>
          <li>
            Pratiqo se réserve le droit de refuser une demande manifestement abusive (par exemple
            usage répété par plusieurs comptes liés à la même personne).
          </li>
          <li>
            La garantie porte sur la satisfaction de l&apos;élève vis-à-vis de la prestation. Elle ne constitue
            pas une garantie de résultat pédagogique ni une évaluation de la qualité du professeur.
          </li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="delais" title="6. Délais de remboursement">
        <ul className="list-disc pl-5 space-y-2">
          <li>Les remboursements sont traités dans les <strong>5 à 10 jours ouvrables</strong></li>
          <li>Le remboursement apparaît sur le relevé de la carte de crédit originale</li>
          <li>Les frais de service Pratiqo (10%) sont également remboursés en cas d&apos;annulation éligible</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="litiges" title="7. Litiges">
        <p>Tout litige concernant un remboursement doit être signalé dans les <strong>7 jours</strong> suivant le cours via :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            Email :{" "}
            <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
              support@pratiqo.ca
            </a>
          </li>
          <li>
            Formulaire :{" "}
            <a href="https://www.pratiqo.ca/contact" className="text-teal-700 underline font-medium" rel="noopener noreferrer">
              pratiqo.ca/contact
            </a>
          </li>
        </ul>
        <p className="mt-4">Pratiqo agit comme arbitre de bonne foi et sa décision est finale.</p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="contact" title="8. Contact">
        <p>
          <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
            support@pratiqo.ca
          </a>
        </p>
        <p>
          <a href="https://www.pratiqo.ca/contact" className="text-teal-700 underline font-medium" rel="noopener noreferrer">
            pratiqo.ca/contact
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

