import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPublicLayout } from "@/components/marketing/MarketingPublicLayout";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Pratiqo",
  description:
    "Conditions générales d'utilisation de la plateforme Pratiqo — mise en relation élèves et professeurs indépendants au Québec.",
};

const TOC = [
  { id: "presentation", label: "Présentation de Pratiqo" },
  { id: "definitions", label: "Définitions" },
  { id: "inscription", label: "Inscription et compte" },
  { id: "services", label: "Services offerts" },
  { id: "statut", label: "Statut des professeurs" },
  { id: "garantie", label: "Garantie d'emploi" },
  { id: "fiscalite", label: "Obligations fiscales" },
  { id: "frais", label: "Frais et commissions" },
  { id: "credits", label: "Crédits élève" },
  { id: "ristourne", label: "Reconnaissance ponctuelle" },
  { id: "paiements", label: "Paiements et remboursements" },
  { id: "domicile", label: "Cours à domicile" },
  { id: "conduite", label: "Conduite des utilisateurs" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Limitation de responsabilité" },
  { id: "donnees", label: "Données personnelles" },
  { id: "droit", label: "Droit applicable" },
  { id: "modifications", label: "Modifications des CGU" },
  { id: "contact", label: "Contact" },
] as const;

export default function CguPage() {
  return (
    <MarketingPublicLayout className="min-h-screen bg-white">
      <div
        className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:flex lg:gap-12"
        style={{ background: "linear-gradient(var(--p-page-bg), var(--p-page-bg)), #fff" }}
      >
        {/* Sidebar TOC — desktop */}
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
                    className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline transition-colors leading-snug block"
                  >
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Avertissement préliminaire */}
          <div
            className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 mb-8"
            role="note"
          >
            ⚠️ Ce document est un modèle préliminaire préparé à titre informatif. Il ne constitue pas un avis
            juridique. Pratiqo inc. recommande de le faire réviser par un avocat qualifié au Québec avant tout
            lancement commercial.
          </div>

          <header className="mb-10">
            <p className="ds-label text-[var(--p-text-subtle)] mb-2">Pratiqo</p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-[var(--p-text)] leading-tight border-l-4 border-teal-500 pl-4">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="mt-3 text-sm text-[var(--p-text-muted)]">
              Version 1.1 · En vigueur à compter du 1er mai 2026
            </p>
          </header>

          {/* TOC mobile (collapsible) */}
          <details className="lg:hidden mb-8 rounded-2xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm">
            <summary className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] cursor-pointer select-none">
              Sommaire
            </summary>
            <ol className="mt-3 space-y-2 text-[13px]">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-teal-700 hover:underline">
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <article className="space-y-12 text-[15px] leading-relaxed text-[var(--p-text-muted)]">
            {/* 1. Présentation */}
            <section id="presentation" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                1. Présentation de Pratiqo
              </h2>
              <p>
                Pratiqo est une plateforme de mise en relation entre professeurs indépendants et élèves dans les
                domaines de la musique, de la danse, des arts martiaux, des langues secondes et d&apos;autres
                disciplines d&apos;apprentissage. La plateforme est exploitée par{" "}
                <strong className="text-[var(--p-text)]">Pratiqo inc.</strong>, société constituée selon les
                lois du Québec, Canada.
              </p>
              <p className="mt-3">
                En accédant à la plateforme Pratiqo (site web et application mobile), vous acceptez d&apos;être
                lié par les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU »).
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 2. Définitions */}
            <section id="definitions" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                2. Définitions
              </h2>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>
                  <strong className="text-[var(--p-text)]">Plateforme</strong> : le site web pratiqo.ca et
                  l&apos;application mobile Pratiqo
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Utilisateur</strong> : toute personne qui accède à
                  la plateforme
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Élève</strong> : utilisateur qui recherche et
                  réserve des cours
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Professeur</strong> : utilisateur qui offre des cours
                  via la plateforme
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Cours</strong> : prestation d&apos;enseignement
                  réservée via la plateforme
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Transaction</strong> : paiement effectué via la
                  plateforme pour un cours
                </li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 3. Inscription */}
            <section id="inscription" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                3. Inscription et compte utilisateur
              </h2>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                3.1 Conditions d&apos;admissibilité
              </h3>
              <p>Pour utiliser Pratiqo, vous devez :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  Avoir au moins 18 ans, ou être mineur avec le consentement d&apos;un parent ou tuteur légal
                </li>
                <li>Fournir des informations exactes et complètes lors de l&apos;inscription</li>
                <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                3.2 Responsabilité du compte
              </h3>
              <p>
                Vous êtes responsable de toutes les activités effectuées sous votre compte. Pratiqo ne peut être
                tenu responsable de tout accès non autorisé résultant de votre négligence.
              </p>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                3.3 Résiliation du compte
              </h3>
              <p>
                Pratiqo se réserve le droit de suspendre ou de résilier tout compte qui viole les présentes CGU,
                sans préavis.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 4. Services */}
            <section id="services" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                4. Services offerts
              </h2>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">4.1 Pour les élèves</h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Recherche de professeurs par discipline, localisation et disponibilité</li>
                <li>Réservation et paiement de cours en ligne, en personne ou à domicile</li>
                <li>Accès aux devoirs et notes de progression partagés par le professeur</li>
                <li>Évaluation des professeurs après chaque cours</li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                4.2 Pour les professeurs
              </h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Création d&apos;un profil public géolocalisé</li>
                <li>Gestion des disponibilités et de l&apos;agenda</li>
                <li>Réception des paiements via la plateforme</li>
                <li>Partage de devoirs et suivi de progression des élèves</li>
                <li>Options de cours en ligne, en studio ou à domicile (dans un rayon défini)</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 5. Statut professeurs */}
            <section id="statut" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                5. Statut des professeurs — Travailleur autonome
              </h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 mb-4">
                ⚠️ Les professeurs inscrits sur Pratiqo sont des{" "}
                <strong>TRAVAILLEURS AUTONOMES</strong> et NON des employés de Pratiqo.
              </div>
              <p>À ce titre :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  Pratiqo agit{" "}
                  <strong className="text-[var(--p-text)]">
                    uniquement comme intermédiaire technologique
                  </strong>{" "}
                  mettant en relation élèves et professeurs
                </li>
                <li>
                  Chaque professeur est{" "}
                  <strong className="text-[var(--p-text)]">seul responsable</strong> de déclarer ses revenus et
                  de respecter ses obligations fiscales (TPS, TVQ, impôts personnels)
                </li>
                <li>
                  Il n&apos;existe{" "}
                  <strong className="text-[var(--p-text)]">aucune relation d&apos;emploi</strong> entre Pratiqo
                  et les professeurs
                </li>
                <li>
                  Aucune exclusivité n&apos;est exigée — les professeurs peuvent enseigner sur d&apos;autres
                  plateformes
                </li>
                <li>Les professeurs fixent leurs propres tarifs, horaires et méthodes pédagogiques</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 6. Garantie */}
            <section id="garantie" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                6. Aucune garantie d&apos;emploi ou de revenu
              </h2>
              <p>
                Pratiqo <strong className="text-[var(--p-text)]">NE PROMET PAS</strong> et{" "}
                <strong className="text-[var(--p-text)]">NE GARANTIT PAS</strong> :
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>Un revenu minimum</li>
                <li>Un nombre minimum d&apos;élèves ou de cours</li>
                <li>Une fréquence de réservations</li>
                <li>Un emploi ou une relation d&apos;employeur</li>
              </ul>
              <p className="mt-3">
                Les revenus dépendent uniquement de l&apos;activité du professeur, de la qualité de son profil,
                de la satisfaction de ses élèves et de la demande dans sa région.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 7. Fiscalité */}
            <section id="fiscalite" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                7. Obligations fiscales du professeur
              </h2>
              <p>En s&apos;inscrivant sur Pratiqo, le professeur s&apos;engage à :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  Déclarer ses revenus aux autorités fiscales (
                  <strong className="text-[var(--p-text)]">Revenu Québec</strong> et{" "}
                  <strong className="text-[var(--p-text)]">Agence du Revenu du Canada</strong>)
                </li>
                <li>
                  Facturer la TPS/TVQ si applicable selon son chiffre d&apos;affaires (seuil 30 000 $/an)
                </li>
                <li>Respecter les lois sur le travail autonome applicables dans sa juridiction</li>
                <li>Souscrire ses propres assurances responsabilité civile professionnelle</li>
                <li>Maintenir son équipement et son lieu d&apos;enseignement</li>
                <li>
                  Respecter le{" "}
                  <Link href="/code-de-conduite" className="text-teal-700 underline font-medium">
                    code de conduite Pratiqo
                  </Link>
                </li>
              </ul>
              <p className="mt-3 text-[13px] text-[var(--p-text-subtle)] italic">
                Pratiqo ne fournit aucun conseil fiscal. Nous recommandons de consulter un comptable ou un
                conseiller fiscal qualifié.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 8. Frais */}
            <section id="frais" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                8. Frais et commissions
              </h2>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">8.1 Pour les élèves</h3>
              <p>L&apos;inscription et l&apos;utilisation de la plateforme sont gratuites pour les Élèves.</p>
              <p className="mt-3">
                Le prix affiché sur le profil du Professeur est le prix horaire fixé par celui-ci.{" "}
                <strong className="text-[var(--p-text)]">Aucun frais caché</strong> n&apos;est ajouté au moment
                du paiement : l&apos;Élève paie le montant indiqué lors de la confirmation de la réservation.
              </p>
              <p className="mt-3">
                Pratiqo se rémunère exclusivement par la commission prélevée sur la rémunération versée au
                Professeur, telle que décrite ci-dessous.
              </p>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                8.2 Pour les professeurs — Plan Gratuit
              </h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Accès gratuit à la plateforme, sans abonnement</li>
                <li>Jusqu&apos;à cinq (5) élèves actifs simultanément</li>
                <li>
                  Commission de <strong className="text-[var(--p-text)]">10 %</strong> prélevée sur chaque
                  transaction
                </li>
                <li>
                  Fonctionnalités de base : profil public, calendrier, messagerie, réception des paiements, reçus
                  automatiques, suivi des élèves
                </li>
                <li>
                  Si un professeur dépasse cinq (5) élèves actifs, il peut continuer à utiliser la plateforme dans
                  le Plan Gratuit, mais les fonctionnalités Pro demeurent réservées au Plan Pro.
                </li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">8.3 Pour les professeurs — Plan Pro</h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>29,99 $ CAD par mois, taxes en sus, facturé mensuellement via Stripe</li>
                <li>Élèves illimités</li>
                <li>
                  Commission réduite à <strong className="text-[var(--p-text)]">5 %</strong> par transaction
                </li>
                <li>Badge Pro affiché sur le profil</li>
                <li>Priorité d&apos;affichage dans les résultats de recherche à pertinence égale</li>
                <li>Accès aux statistiques avancées : revenus, taux de rétention, heures travaillées</li>
                <li>Possibilité d&apos;offrir des cours de groupe lorsque cette fonctionnalité sera lancée en Phase 2</li>
                <li>Annulable en tout temps via le tableau de bord</li>
                <li>Annulation effective à la fin de la période mensuelle en cours</li>
                <li>Aucun remboursement au prorata</li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-3">
                8.4 Programme fidélité — Commission dégressive
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--p-border-light)] bg-white shadow-sm my-4">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-800">Palier</th>
                      <th className="px-4 py-3 font-semibold text-slate-800">Volume annuel cumulé</th>
                      <th className="px-4 py-3 font-semibold text-slate-800">Plan Gratuit</th>
                      <th className="px-4 py-3 font-semibold text-slate-800">Plan Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-teal-500/10">
                      <td className="px-4 py-3 text-slate-700">🥉 Bronze</td>
                      <td className="px-4 py-3 text-slate-700">0 – 5 000 $</td>
                      <td className="px-4 py-3 text-slate-700">10 %</td>
                      <td className="px-4 py-3 text-slate-700">5 %</td>
                    </tr>
                    <tr className="hover:bg-teal-500/10">
                      <td className="px-4 py-3 text-slate-700">🥈 Argent</td>
                      <td className="px-4 py-3 text-slate-700">5 000 – 15 000 $</td>
                      <td className="px-4 py-3 text-slate-700">9 %</td>
                      <td className="px-4 py-3 text-slate-700">4,5 %</td>
                    </tr>
                    <tr className="hover:bg-teal-500/10">
                      <td className="px-4 py-3 text-slate-700">🥇 Or</td>
                      <td className="px-4 py-3 text-slate-700">15 000 – 30 000 $</td>
                      <td className="px-4 py-3 text-slate-700">8 %</td>
                      <td className="px-4 py-3 text-slate-700">4 %</td>
                    </tr>
                    <tr className="hover:bg-teal-500/10">
                      <td className="px-4 py-3 text-slate-700">💎 Platine</td>
                      <td className="px-4 py-3 text-slate-700">30 000 $ +</td>
                      <td className="px-4 py-3 text-slate-700">7 %</td>
                      <td className="px-4 py-3 text-slate-700">3,5 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-[var(--p-text-subtle)]">
                Le programme de fidélité ne verse pas de cashback ni de ristourne. Il réduit uniquement la
                commission applicable.
              </p>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                8.5 Modifications tarifaires
              </h3>
              <p>
                Pratiqo se réserve le droit de modifier ses tarifs et commissions avec un préavis de{" "}
                <strong className="text-[var(--p-text)]">30 jours</strong> par courriel aux utilisateurs
                concernés.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 9. Crédits */}
            <section id="credits" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                9. Programme de crédits élève
              </h2>
              <p>Les élèves peuvent gagner des crédits Pratiqo via :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  <strong className="text-[var(--p-text)]">Évolution du compagnon</strong> : 5 $ / 10 $ / 15 $
                  / 25 $ aux paliers 5 / 15 / 30 / 50 cours
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Évaluation d&apos;un professeur</strong> : +1 $ par
                  cours évalué (une fois par professeur)
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Parrainage d&apos;un ami</strong> : +1 $ par
                  parrainage validé, plafonné à 20 $/an
                </li>
              </ul>
              <p className="mt-3">
                Les crédits sont utilisables{" "}
                <strong className="text-[var(--p-text)]">uniquement sur Pratiqo</strong>, ne sont{" "}
                <strong className="text-[var(--p-text)]">PAS convertibles</strong> en argent, expirent après 12
                mois d&apos;inactivité et sont plafonnés à 50 % du prix d&apos;un cours.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 10. Reconnaissance ponctuelle */}
            <section id="ristourne" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                10. Reconnaissance ponctuelle des Professeurs
              </h2>
              <p>
                Pratiqo peut, à sa seule discrétion, reconnaître ponctuellement certains Professeurs particulièrement
                actifs, engagés ou appréciés sur la plateforme.
              </p>
              <p className="mt-3">
                Cette reconnaissance peut prendre différentes formes, notamment une mise en avant promotionnelle,
                une visibilité accrue dans certaines campagnes, une invitation à participer à des événements, ou tout
                autre avantage non monétaire déterminé par Pratiqo.
              </p>
              <p className="mt-3">
                Ces reconnaissances sont discrétionnaires, non automatiques et ne constituent pas un droit acquis,
                une ristourne, un cashback, un partage de bénéfices, une participation au capital, ni une obligation
                contractuelle de Pratiqo.
              </p>
              <p className="mt-3">
                Pratiqo se réserve le droit de modifier, suspendre ou mettre fin à tout programme de reconnaissance
                ponctuelle, en tout temps, sans préavis, sous réserve des lois applicables.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 11. Paiements */}
            <section id="paiements" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                11. Paiements et remboursements
              </h2>
              <p>
                Tous les paiements sont traités de façon sécurisée via{" "}
                <strong className="text-[var(--p-text)]">Stripe</strong>. Pratiqo ne stocke aucune information
                de carte de crédit.
              </p>
              <p className="mt-3">
                Les paiements sont versés aux professeurs dans les{" "}
                <strong className="text-[var(--p-text)]">7 jours ouvrables</strong> suivant la complétion du
                cours, déduction faite de la commission applicable.
              </p>
              <p className="mt-4 font-medium text-[var(--p-text)]">Politique d&apos;annulation :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  Annulation{" "}
                  <strong className="text-[var(--p-text)]">plus de 24 heures</strong> avant le cours :
                  remboursement complet
                </li>
                <li>
                  Annulation{" "}
                  <strong className="text-[var(--p-text)]">moins de 24 heures</strong> : aucun remboursement,
                  sauf circonstances exceptionnelles
                </li>
                <li>Annulation par le professeur : remboursement complet à l&apos;élève</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 12. Domicile */}
            <section id="domicile" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                12. Cours à domicile
              </h2>
              <p>
                Pratiqo agit uniquement comme intermédiaire pour la mise en relation. La sécurité lors des cours
                à domicile relève de la responsabilité exclusive du professeur et de l&apos;élève.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 13. Conduite */}
            <section id="conduite" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                13. Contenu et conduite des utilisateurs
              </h2>
              <p>
                Il est interdit de publier sur Pratiqo tout contenu faux, trompeur, discriminatoire, harcelant,
                portant atteinte aux droits d&apos;auteur, ou contenant des logiciels malveillants.
              </p>
              <p className="mt-3">
                Il est strictement interdit d&apos;inciter les élèves à effectuer des paiements en dehors de la
                plateforme. Toute violation peut entraîner la suspension définitive du compte.
              </p>
              <p className="mt-3">
                Consultez notre{" "}
                <Link href="/code-de-conduite" className="text-teal-700 underline font-medium">
                  Code de conduite
                </Link>{" "}
                pour plus de détails.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 14. Propriété intellectuelle */}
            <section id="propriete" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                14. Propriété intellectuelle
              </h2>
              <p>
                Tous les éléments de la plateforme sont la propriété exclusive de Pratiqo inc. et sont protégés
                par les lois sur le droit d&apos;auteur.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 15. Limitation de responsabilité */}
            <section id="responsabilite" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                15. Limitation de responsabilité
              </h2>
              <p>
                Pratiqo ne peut être tenu responsable de la qualité des cours, des incidents survenant lors des
                cours, des pertes de données ou des dommages indirects.
              </p>
              <p className="mt-3">
                La responsabilité totale cumulée de Pratiqo envers tout Utilisateur est limitée au montant des frais
                et commissions effectivement perçus par Pratiqo de cet Utilisateur au cours des trois (3) mois
                précédant le fait générateur du litige.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 16. Données personnelles */}
            <section id="donnees" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                16. Protection des données personnelles (LPRPDE / Loi 25)
              </h2>
              <p>
                Pratiqo collecte et traite vos données conformément à la{" "}
                <strong className="text-[var(--p-text)]">LPRPDE</strong> et à la{" "}
                <strong className="text-[var(--p-text)]">Loi 25</strong> du Québec. Pour plus
                d&apos;informations, consultez notre{" "}
                <Link href="/confidentialite" className="text-teal-700 underline font-medium">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 17. Droit applicable */}
            <section id="droit" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                17. Droit applicable et juridiction
              </h2>
              <p>
                Les présentes CGU sont régies par les lois de la{" "}
                <strong className="text-[var(--p-text)]">province de Québec</strong> et les lois fédérales du{" "}
                <strong className="text-[var(--p-text)]">Canada</strong>. Tout litige sera soumis à la
                compétence exclusive des tribunaux du district judiciaire de{" "}
                <strong className="text-[var(--p-text)]">Beauce, Québec</strong>.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 18. Modifications */}
            <section id="modifications" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                18. Modifications des CGU
              </h2>
              <p>
                Pratiqo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
                informés de toute modification substantielle par courriel avec un préavis de{" "}
                <strong className="text-[var(--p-text)]">30 jours</strong>.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 19. Contact */}
            <section id="contact" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                19. Contact
              </h2>
              <p>
                <strong className="text-[var(--p-text)]">Pratiqo inc.</strong> — Saint-Georges, Québec, Canada
              </p>
              <p className="mt-2">
                Courriel :{" "}
                <a href="mailto:marc-andre.theberge@pratiqo.ca" className="text-teal-700 underline font-medium">
                  marc-andre.theberge@pratiqo.ca
                </a>
              </p>
              <p className="mt-1">
                Site web :{" "}
                <Link href="/" className="text-teal-700 underline font-medium">
                  pratiqo.ca
                </Link>
              </p>
              <p className="mt-4 text-[12px] text-[var(--p-text-subtle)] italic">
                Ce document a été rédigé en français conformément à la Charte de la langue française du Québec.
              </p>
            </section>
          </article>

          {/* Footer navigation */}
          <footer className="mt-14 pt-8 border-t border-[var(--p-border-light)]">
            <p className="text-[12px] text-[var(--p-text-muted)] mb-2">Autres documents légaux</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <span className="text-teal-700 font-medium">CGU</span>
              <Link
                href="/confidentialite"
                className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline"
              >
                Confidentialité
              </Link>
              <Link
                href="/code-de-conduite"
                className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline"
              >
                Code de conduite
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </MarketingPublicLayout>
  );
}
