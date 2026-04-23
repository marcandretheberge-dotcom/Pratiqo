import type { Metadata } from "next";
import { LegalLayout, LegalNotice, LegalSection } from "../../../../components/LegalLayout";

export const metadata: Metadata = {
  title: "CGU | Pratiqo",
  description: "Conditions générales d'utilisation de Pratiqo.",
};

const TOC = [
  { id: "presentation", label: "1. Présentation de Pratiqo" },
  { id: "definitions", label: "2. Définitions" },
  { id: "inscription", label: "3. Inscription et compte utilisateur" },
  { id: "services", label: "4. Services offerts" },
  { id: "frais", label: "5. Frais et commissions" },
  { id: "paiements", label: "6. Paiements et remboursements" },
  { id: "domicile", label: "7. Cours à domicile" },
  { id: "conduite", label: "8. Contenu et conduite des utilisateurs" },
  { id: "propriete", label: "9. Propriété intellectuelle" },
  { id: "limitation", label: "10. Limitation de responsabilité" },
  { id: "protection-donnees", label: "11. Protection des données personnelles (LPRPDE / Loi 25)" },
  { id: "droit", label: "12. Droit applicable et juridiction" },
  { id: "modifications", label: "13. Modifications des CGU" },
  { id: "contact", label: "14. Contact" },
] as const;

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation — Pratiqo"
      lastUpdated="avril 2026"
      toc={[...TOC]}
      currentPath="/legal/cgu"
    >
      <p className="text-sm text-[var(--p-text-muted)] -mt-4 mb-8">
        <strong className="text-[var(--p-text)]">Version : 1.0</strong>
      </p>

      <LegalNotice>
        <p className="font-medium text-amber-950">
          ⚠️ <strong>Important</strong> : Ce document est un modèle préliminaire préparé à titre informatif. Il ne
          constitue pas un avis juridique. Pratiqo inc. recommande de faire réviser ce document par un avocat qualifié
          au Québec avant tout lancement commercial.
        </p>
      </LegalNotice>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="presentation" title="1. Présentation de Pratiqo">
        <p>
          Pratiqo est une plateforme de mise en relation entre professeurs indépendants et élèves dans les domaines de
          la musique, de la danse, des arts martiaux, des langues secondes et d&apos;autres disciplines
          d&apos;apprentissage. La plateforme est exploitée par <strong>Pratiqo inc.</strong>, société constituée selon
          les lois du Québec, Canada.
        </p>
        <p className="mt-4">
          En accédant à la plateforme Pratiqo (site web et application mobile), vous acceptez d&apos;être lié par les
          présentes Conditions Générales d&apos;Utilisation (ci-après « CGU »).
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="definitions" title="2. Définitions">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Plateforme</strong> : le site web pratiqo.com et l&apos;application mobile Pratiqo
          </li>
          <li>
            <strong>Utilisateur</strong> : toute personne qui accède à la plateforme
          </li>
          <li>
            <strong>Élève</strong> : utilisateur qui recherche et réserve des cours
          </li>
          <li>
            <strong>Professeur</strong> : utilisateur qui offre des cours via la plateforme
          </li>
          <li>
            <strong>Cours</strong> : prestation d&apos;enseignement réservée via la plateforme
          </li>
          <li>
            <strong>Transaction</strong> : paiement effectué via la plateforme pour un cours
          </li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="inscription" title="3. Inscription et compte utilisateur">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">3.1 Conditions d&apos;admissibilité</h3>
        <p>Pour utiliser Pratiqo, vous devez :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Avoir au moins 18 ans, ou être mineur avec le consentement d&apos;un parent ou tuteur légal</li>
          <li>Fournir des informations exactes et complètes lors de l&apos;inscription</li>
          <li>Maintenir la confidentialité de vos identifiants de connexion</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.2 Responsabilité du compte</h3>
        <p>
          Vous êtes responsable de toutes les activités effectuées sous votre compte. Pratiqo ne peut être tenu
          responsable de tout accès non autorisé résultant de votre négligence.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">3.3 Résiliation du compte</h3>
        <p>
          Pratiqo se réserve le droit de suspendre ou de résilier tout compte qui viole les présentes CGU, sans préavis.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="services" title="4. Services offerts">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">4.1 Pour les élèves</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Recherche de professeurs par discipline, localisation et disponibilité</li>
          <li>Réservation et paiement de cours en ligne, en personne ou à domicile</li>
          <li>Accès aux devoirs et notes de progression partagés par le professeur</li>
          <li>Évaluation des professeurs après chaque cours</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">4.2 Pour les professeurs</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Création d&apos;un profil public géolocalisé</li>
          <li>Gestion des disponibilités et de l&apos;agenda</li>
          <li>Réception des paiements via la plateforme</li>
          <li>Partage de devoirs et suivi de progression des élèves</li>
          <li>Options de cours en ligne, en studio ou à domicile (dans un rayon défini)</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="frais" title="5. Frais et commissions">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">5.1 Pour les élèves</h3>
        <p>
          L&apos;accès à la plateforme Pratiqo est <strong>gratuit</strong> pour les élèves. Des frais de service de{" "}
          <strong>10 %</strong> du montant du cours sont ajoutés au moment du paiement et clairement affichés avant la
          confirmation de la réservation.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.2 Pour les professeurs — Plan Gratuit</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Accès gratuit jusqu&apos;à 5 élèves actifs simultanément</li>
          <li>
            Commission de <strong>10 %</strong> prélevée sur chaque transaction
          </li>
          <li>Fonctionnalités de base incluses</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">
          5.3 Pour les professeurs — Plan Pro (29,99 $/mois)
        </h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Élèves illimités</li>
          <li>
            Commission réduite à <strong>5 %</strong> par transaction
          </li>
          <li>Fonctionnalités avancées (analytics, priorité dans la recherche, badge Pro)</li>
          <li>Facturation mensuelle via Stripe</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.4 Cours à domicile</h3>
        <p>
          Les professeurs peuvent fixer un tarif distinct pour les cours à domicile. Ce tarif majoré est affiché
          clairement à l&apos;élève avant toute réservation.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">5.5 Modifications tarifaires</h3>
        <p>
          Pratiqo se réserve le droit de modifier ses tarifs et commissions avec un préavis de <strong>30 jours</strong>{" "}
          par courriel aux utilisateurs concernés.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="paiements" title="6. Paiements et remboursements">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">6.1 Traitement des paiements</h3>
        <p>
          Tous les paiements sont traités de façon sécurisée via <strong>Stripe</strong>. Pratiqo ne stocke aucune
          information de carte de crédit.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">6.2 Versements aux professeurs</h3>
        <p>
          Les paiements sont versés aux professeurs dans les <strong>7 jours ouvrables</strong> suivant la complétion
          du cours, déduction faite de la commission applicable.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">6.3 Politique d&apos;annulation</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Annulation <strong>plus de 24 heures</strong> avant le cours : remboursement complet
          </li>
          <li>
            Annulation <strong>moins de 24 heures</strong> avant le cours : aucun remboursement, sauf circonstances
            exceptionnelles à la discrétion de Pratiqo
          </li>
          <li>Annulation par le professeur : remboursement complet à l&apos;élève</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">6.4 Litiges</h3>
        <p>
          Tout litige concernant un paiement doit être signalé à Pratiqo dans les <strong>7 jours</strong> suivant la
          transaction via support@pratiqo.com.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="domicile" title="7. Cours à domicile">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">7.1 Responsabilité</h3>
        <p>
          Pratiqo agit uniquement comme intermédiaire pour la mise en relation. La sécurité lors des cours à domicile
          relève de la responsabilité exclusive du professeur et de l&apos;élève.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">7.2 Vérification</h3>
        <p>
          Pratiqo encourage fortement les professeurs à s&apos;assurer de la légitimité des demandes avant de se
          déplacer. Pratiqo ne peut être tenu responsable des incidents survenant lors de cours à domicile.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">7.3 Confirmation</h3>
        <p>
          Les demandes de cours à domicile peuvent nécessiter une confirmation manuelle du professeur. L&apos;élève
          sera notifié dans les <strong>24 heures</strong> de l&apos;acceptation ou du refus.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="conduite" title="8. Contenu et conduite des utilisateurs">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">8.1 Contenu interdit</h3>
        <p>Il est interdit de publier sur Pratiqo tout contenu :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Faux, trompeur ou frauduleux</li>
          <li>Discriminatoire, harcelant ou offensant</li>
          <li>Portant atteinte aux droits d&apos;auteur d&apos;un tiers</li>
          <li>Contenant des logiciels malveillants</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">8.2 Avis et évaluations</h3>
        <p>
          Les avis laissés sur la plateforme doivent être honnêtes et basés sur une expérience réelle. Les faux avis
          entraîneront la suspension du compte.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">8.3 Transactions hors plateforme</h3>
        <p>
          Il est strictement interdit d&apos;inciter les élèves à effectuer des paiements en dehors de la plateforme.
          Toute violation peut entraîner la suspension définitive du compte.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="propriete" title="9. Propriété intellectuelle">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">9.1 Contenu de Pratiqo</h3>
        <p>
          Tous les éléments de la plateforme (logo, interface, textes, code) sont la propriété exclusive de Pratiqo inc.
          et sont protégés par les lois sur le droit d&apos;auteur.
        </p>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">9.2 Contenu des utilisateurs</h3>
        <p>
          En publiant du contenu sur Pratiqo (profil, photos, descriptions), vous accordez à Pratiqo une licence non
          exclusive, mondiale et gratuite d&apos;utiliser ce contenu à des fins de promotion de la plateforme.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="limitation" title="10. Limitation de responsabilité">
        <p>Pratiqo est une plateforme de mise en relation. Pratiqo ne peut être tenu responsable :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>De la qualité des cours dispensés par les professeurs</li>
          <li>Des incidents survenant lors des cours (en personne, en ligne ou à domicile)</li>
          <li>Des pertes de données ou interruptions de service</li>
          <li>Des dommages indirects ou consécutifs</li>
        </ul>
        <p className="mt-4">
          Dans tous les cas, la responsabilité de Pratiqo est limitée au montant des frais de service perçus au cours
          des 3 derniers mois.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="protection-donnees" title="11. Protection des données personnelles (LPRPDE / Loi 25)">
        <p>
          Pratiqo collecte et traite vos données personnelles conformément à la{" "}
          <strong>Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)</strong> et
          à la <strong>Loi 25</strong> du Québec.
        </p>
        <p className="mt-4">
          Pour plus d&apos;informations, consultez notre <strong>Politique de confidentialité</strong> disponible sur
          la plateforme.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="droit" title="12. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont régies par les lois de la <strong>province de Québec</strong> et les lois fédérales du{" "}
          <strong>Canada</strong> applicables. Tout litige sera soumis à la compétence exclusive des tribunaux du
          district judiciaire de <strong>Montréal, Québec</strong>.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="modifications" title="13. Modifications des CGU">
        <p>
          Pratiqo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de
          toute modification substantielle par courriel avec un préavis de <strong>30 jours</strong>. L&apos;utilisation
          continue de la plateforme après cette période constitue une acceptation des nouvelles conditions.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="contact" title="14. Contact">
        <p>Pour toute question relative aux présentes CGU :</p>
        <p className="mt-4 font-semibold text-[var(--p-text)]">Pratiqo inc.</p>
        <p>Montréal, Québec, Canada</p>
        <p>
          courriel : <a href="mailto:legal@pratiqo.com" className="text-[#1D9E75] underline font-medium">legal@pratiqo.com</a>
        </p>
        <p>
          site web :{" "}
          <a href="https://pratiqo.com" className="text-[#1D9E75] underline font-medium" rel="noopener noreferrer">
            pratiqo.com
          </a>
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <p className="text-sm italic text-[var(--p-text-muted)]">
        Ce document a été rédigé en français conformément à la Charte de la langue française du Québec.
      </p>
    </LegalLayout>
  );
}
