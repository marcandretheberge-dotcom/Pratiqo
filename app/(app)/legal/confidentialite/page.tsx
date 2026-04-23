import type { Metadata } from "next";
import { LegalLayout, LegalNotice, LegalSection } from "../../../../components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Pratiqo",
  description: "Politique de confidentialité de Pratiqo.",
};

const TOC = [
  { id: "introduction", label: "1. Introduction" },
  { id: "donnees-collectees", label: "2. Données collectées" },
  { id: "utilisation", label: "3. Utilisation des données" },
  { id: "partage", label: "4. Partage des données" },
  { id: "geolocalisation", label: "5. Géolocalisation" },
  { id: "cookies", label: "6. Cookies" },
  { id: "conservation", label: "7. Conservation des données" },
  { id: "droits", label: "8. Vos droits (Loi 25 — Québec)" },
  { id: "securite", label: "9. Sécurité" },
  { id: "mineurs", label: "10. Mineurs" },
  { id: "modifications", label: "11. Modifications" },
  { id: "contact", label: "12. Contact" },
] as const;

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité — Pratiqo"
      lastUpdated="avril 2026"
      toc={[...TOC]}
      currentPath="/legal/confidentialite"
    >
      <p className="text-sm text-[var(--p-text-muted)] -mt-4 mb-8">
        <strong className="text-[var(--p-text)]">Version : 1.0</strong>
      </p>

      <LegalNotice>
        <p className="font-medium text-amber-950">
          ⚠️ <strong>Important</strong> : Ce document est un modèle préliminaire. Faire réviser par un avocat spécialisé
          en protection des données au Québec avant le lancement.
        </p>
      </LegalNotice>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="introduction" title="1. Introduction">
        <p>
          Pratiqo inc. (« Pratiqo », « nous ») s&apos;engage à protéger la vie privée de ses utilisateurs. La présente
          politique explique quelles données nous collectons, comment nous les utilisons et quels sont vos droits.
        </p>
        <p className="mt-4">
          Cette politique est conforme à la{" "}
          <strong>Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)</strong> et
          à la <strong>Loi 25</strong> du Québec (Loi modernisant des dispositions législatives en matière de protection
          des renseignements personnels).
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="donnees-collectees" title="2. Données collectées">
        <h3 className="text-base font-semibold text-[var(--p-text)] mt-2 mb-2">2.1 Données fournies par l&apos;utilisateur</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Nom, prénom, adresse courriel</li>
          <li>Photo de profil (optionnel)</li>
          <li>Adresse (pour les cours à domicile)</li>
          <li>Informations de paiement (traitées par Stripe — non stockées par Pratiqo)</li>
          <li>Description du profil professeur, disciplines enseignées, tarifs</li>
          <li>Notes de progression et devoirs (professeurs)</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">2.2 Données collectées automatiquement</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Adresse IP et données de navigation</li>
          <li>Type d&apos;appareil et système d&apos;exploitation</li>
          <li>Géolocalisation (avec votre consentement explicite)</li>
          <li>Données d&apos;utilisation de la plateforme</li>
        </ul>

        <h3 className="text-base font-semibold text-[var(--p-text)] mt-6 mb-2">2.3 Données de tiers</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Informations de connexion via Google (nom, courriel, photo de profil)</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="utilisation" title="3. Utilisation des données">
        <p>Nous utilisons vos données pour :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Créer et gérer votre compte</li>
          <li>Faciliter la mise en relation professeurs-élèves</li>
          <li>Traiter les paiements et versements</li>
          <li>Envoyer des notifications de réservation et rappels de cours</li>
          <li>Améliorer la plateforme et personnaliser l&apos;expérience</li>
          <li>Respecter nos obligations légales</li>
        </ul>
        <p className="mt-4">
          Nous <strong>ne vendons jamais</strong> vos données personnelles à des tiers.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="partage" title="4. Partage des données">
        <p>Nous partageons vos données uniquement avec :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <strong>Stripe</strong> : traitement des paiements
          </li>
          <li>
            <strong>Supabase</strong> : hébergement de la base de données (serveurs au Canada/USA)
          </li>
          <li>
            <strong>Google</strong> : authentification (si vous utilisez la connexion Google)
          </li>
          <li>
            <strong>Vercel</strong> : hébergement de la plateforme
          </li>
          <li>Les autorités compétentes si requis par la loi</li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="geolocalisation" title="5. Géolocalisation">
        <p>
          La fonctionnalité de géolocalisation est utilisée pour afficher les professeurs à proximité. Votre position
          n&apos;est collectée qu&apos;avec votre <strong>consentement explicite</strong> et n&apos;est pas stockée de
          façon permanente.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="cookies" title="6. Cookies">
        <p>Pratiqo utilise des cookies pour :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Maintenir votre session connectée</li>
          <li>Mémoriser vos préférences</li>
          <li>Analyser l&apos;utilisation de la plateforme (Google Analytics)</li>
        </ul>
        <p className="mt-4">
          Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, ce qui peut affecter certaines
          fonctionnalités.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="conservation" title="7. Conservation des données">
        <p>Vos données sont conservées :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Tant que votre compte est actif</li>
          <li>
            Pendant <strong>3 ans</strong> après la fermeture du compte (obligations légales et fiscales)
          </li>
          <li>
            Les données de transactions sont conservées <strong>7 ans</strong> (obligation fiscale canadienne)
          </li>
        </ul>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="droits" title="8. Vos droits (Loi 25 — Québec)">
        <p>Conformément à la Loi 25, vous avez le droit de :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <strong>Accéder</strong> à vos données personnelles
          </li>
          <li>
            <strong>Rectifier</strong> toute information inexacte
          </li>
          <li>
            <strong>Supprimer</strong> vos données (droit à l&apos;oubli)
          </li>
          <li>
            <strong>Portabilité</strong> de vos données dans un format structuré
          </li>
          <li>
            <strong>Retirer votre consentement</strong> à tout moment
          </li>
          <li>
            <strong>Déposer une plainte</strong> auprès de la Commission d&apos;accès à l&apos;information (CAI) du
            Québec
          </li>
        </ul>
        <p className="mt-4">
          Pour exercer ces droits, contactez-nous à :{" "}
          <a href="mailto:privacy@pratiqo.com" className="text-[#1D9E75] underline font-medium">
            privacy@pratiqo.com
          </a>
        </p>
        <p className="mt-2">Nous répondrons dans un délai de <strong>30 jours</strong>.</p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="securite" title="9. Sécurité">
        <p>Nous appliquons des mesures de sécurité incluant :</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Chiffrement SSL/TLS pour toutes les transmissions de données</li>
          <li>Authentification sécurisée via Supabase Auth</li>
          <li>Accès restreint aux données par rôle (RLS — Row Level Security)</li>
          <li>Surveillance continue des accès</li>
        </ul>
        <p className="mt-4">
          En cas de violation de données, nous notifierons les utilisateurs affectés dans les <strong>72 heures</strong>{" "}
          conformément à la Loi 25.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="mineurs" title="10. Mineurs">
        <p>
          Pratiqo n&apos;est pas destiné aux enfants de moins de 13 ans. Si un mineur utilise la plateforme, le
          consentement parental est requis. Si vous pensez qu&apos;un mineur a créé un compte sans consentement
          parental, contactez-nous immédiatement.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="modifications" title="11. Modifications">
        <p>
          Nous vous informerons de toute modification substantielle par courriel avec un préavis de{" "}
          <strong>30 jours</strong>.
        </p>
      </LegalSection>

      <hr className="my-8 border-slate-200" />

      <LegalSection id="contact" title="12. Contact">
        <p className="font-semibold text-[var(--p-text)]">Responsable de la protection des données (RPD)</p>
        <p className="mt-2">Pratiqo inc.</p>
        <p>
          <a href="mailto:privacy@pratiqo.com" className="text-[#1D9E75] underline font-medium">
            privacy@pratiqo.com
          </a>
        </p>
        <p>
          <a href="https://pratiqo.com/confidentialite" className="text-[#1D9E75] underline font-medium" rel="noopener noreferrer">
            pratiqo.com/confidentialite
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
