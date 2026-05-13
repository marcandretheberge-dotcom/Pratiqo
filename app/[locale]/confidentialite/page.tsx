import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Pratiqo",
  description:
    "Politique de confidentialité de Pratiqo — collecte, utilisation et protection de vos données personnelles, conformément à la LPRPDE et à la Loi 25 du Québec.",
};

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "donnees-collectees", label: "Données collectées" },
  { id: "utilisation", label: "Utilisation des données" },
  { id: "partage", label: "Partage des données" },
  { id: "geolocalisation", label: "Géolocalisation" },
  { id: "cookies", label: "Cookies" },
  { id: "conservation", label: "Conservation des données" },
  { id: "droits", label: "Vos droits (Loi 25)" },
  { id: "securite", label: "Sécurité" },
  { id: "mineurs", label: "Mineurs" },
  { id: "modifications", label: "Modifications" },
  { id: "contact", label: "Contact" },
] as const;

export default function ConfidentialitePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(var(--p-page-bg), var(--p-page-bg)), #fff" }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-[var(--p-text-muted)] hover:text-teal-700 flex items-center gap-1.5 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
          <span className="text-[var(--p-border-light)]">·</span>
          <span className="text-sm font-medium text-[var(--p-text)]">Confidentialité</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:flex lg:gap-12">
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
        <main className="flex-1 min-w-0">
          {/* Avertissement préliminaire */}
          <div
            className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 mb-8"
            role="note"
          >
            ⚠️ Ce document est un modèle préliminaire. Pratiqo inc. recommande de le faire réviser par un
            avocat spécialisé en protection des données au Québec avant tout lancement commercial.
          </div>

          <header className="mb-10">
            <p className="ds-label text-[var(--p-text-subtle)] mb-2">Pratiqo</p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-[var(--p-text)] leading-tight border-l-4 border-teal-500 pl-4">
              Politique de confidentialité
            </h1>
            <p className="mt-3 text-sm text-[var(--p-text-muted)]">
              Version : 1.0 · Dernière mise à jour : avril 2026
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
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                1. Introduction
              </h2>
              <p>
                Pratiqo inc. (« Pratiqo », « nous ») s&apos;engage à protéger la vie privée de ses
                utilisateurs. La présente politique explique quelles données nous collectons, comment nous les
                utilisons et quels sont vos droits.
              </p>
              <p className="mt-3">
                Cette politique est conforme à la{" "}
                <strong className="text-[var(--p-text)]">
                  Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)
                </strong>{" "}
                et à la{" "}
                <strong className="text-[var(--p-text)]">Loi 25</strong> du Québec (Loi modernisant des
                dispositions législatives en matière de protection des renseignements personnels).
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 2. Données collectées */}
            <section id="donnees-collectees" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                2. Données collectées
              </h2>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                2.1 Données fournies par l&apos;utilisateur
              </h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Nom, prénom, adresse courriel</li>
                <li>Photo de profil (optionnel)</li>
                <li>Adresse (pour les cours à domicile)</li>
                <li>
                  Informations de paiement (traitées par{" "}
                  <strong className="text-[var(--p-text)]">Stripe</strong> — non stockées par Pratiqo)
                </li>
                <li>Description du profil professeur, disciplines enseignées, tarifs</li>
                <li>Notes de progression et devoirs (professeurs)</li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                2.2 Données collectées automatiquement
              </h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Adresse IP et données de navigation</li>
                <li>Type d&apos;appareil et système d&apos;exploitation</li>
                <li>Géolocalisation (avec votre consentement explicite)</li>
                <li>Données d&apos;utilisation de la plateforme</li>
              </ul>

              <h3 className="text-base font-semibold text-[var(--p-text)] mt-5 mb-2">
                2.3 Données de tiers
              </h3>
              <ul className="list-disc pl-5 space-y-2 marker:text-teal-700">
                <li>Informations de connexion via Google (nom, courriel, photo de profil)</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 3. Utilisation */}
            <section id="utilisation" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                3. Utilisation des données
              </h2>
              <p>Nous utilisons vos données pour :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>Créer et gérer votre compte</li>
                <li>Faciliter la mise en relation professeurs-élèves</li>
                <li>Traiter les paiements et versements</li>
                <li>Envoyer des notifications de réservation et rappels de cours</li>
                <li>Améliorer la plateforme et personnaliser l&apos;expérience</li>
                <li>Respecter nos obligations légales</li>
              </ul>
              <p className="mt-4 rounded-xl border border-teal-500/20 bg-teal-600/5 px-4 py-3 text-[14px] text-[var(--p-text)]">
                Nous <strong>ne vendons jamais</strong> vos données personnelles à des tiers.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 4. Partage */}
            <section id="partage" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                4. Partage des données
              </h2>
              <p>Nous partageons vos données uniquement avec :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  <strong className="text-[var(--p-text)]">Stripe</strong> : traitement des paiements
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Supabase</strong> : hébergement de la base de
                  données (serveurs au Canada/USA)
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Google</strong> : authentification (si vous
                  utilisez la connexion Google)
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Vercel</strong> : hébergement de la plateforme
                </li>
                <li>Les autorités compétentes si requis par la loi</li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 5. Géolocalisation */}
            <section id="geolocalisation" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                5. Géolocalisation
              </h2>
              <p>
                La fonctionnalité de géolocalisation est utilisée pour afficher les professeurs à proximité.
                Votre position n&apos;est collectée qu&apos;avec votre{" "}
                <strong className="text-[var(--p-text)]">consentement explicite</strong> et n&apos;est pas
                stockée de façon permanente.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 6. Cookies */}
            <section id="cookies" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                6. Cookies
              </h2>
              <p>Pratiqo utilise des cookies pour :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>Maintenir votre session connectée</li>
                <li>Mémoriser vos préférences</li>
                <li>Analyser l&apos;utilisation de la plateforme (Google Analytics)</li>
              </ul>
              <p className="mt-3">
                Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, ce qui peut
                affecter certaines fonctionnalités.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 7. Conservation */}
            <section id="conservation" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                7. Conservation des données
              </h2>
              <p>Vos données sont conservées :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>Tant que votre compte est actif</li>
                <li>
                  Pendant <strong className="text-[var(--p-text)]">3 ans</strong> après la fermeture du compte
                  (obligations légales et fiscales)
                </li>
                <li>
                  Les données de transactions sont conservées{" "}
                  <strong className="text-[var(--p-text)]">7 ans</strong> (obligation fiscale canadienne)
                </li>
              </ul>
            </section>

            <hr className="border-slate-200" />

            {/* 8. Droits */}
            <section id="droits" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                8. Vos droits (Loi 25 — Québec)
              </h2>
              <p>Conformément à la Loi 25, vous avez le droit de :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>
                  <strong className="text-[var(--p-text)]">Accéder</strong> à vos données personnelles
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Rectifier</strong> toute information inexacte
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Supprimer</strong> vos données (droit à
                  l&apos;oubli)
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Portabilité</strong> de vos données dans un format
                  structuré
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Retirer votre consentement</strong> à tout moment
                </li>
                <li>
                  <strong className="text-[var(--p-text)]">Déposer une plainte</strong> auprès de la
                  Commission d&apos;accès à l&apos;information (CAI) du Québec
                </li>
              </ul>
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                Pour exercer ces droits, contactez-nous à{" "}
                <a href="mailto:marc-andre.theberge@pratiqo.ca" className="text-teal-700 underline font-medium">
                  marc-andre.theberge@pratiqo.ca
                </a>
                . Nous répondrons dans un délai de <strong>30 jours</strong>.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 9. Sécurité */}
            <section id="securite" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                9. Sécurité
              </h2>
              <p>Nous appliquons des mesures de sécurité incluant :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2 marker:text-teal-700">
                <li>Chiffrement SSL/TLS pour toutes les transmissions de données</li>
                <li>Authentification sécurisée via Supabase Auth</li>
                <li>Accès restreint aux données par rôle (RLS — Row Level Security)</li>
                <li>Surveillance continue des accès</li>
              </ul>
              <p className="mt-3">
                En cas de violation de données, nous notifierons les utilisateurs affectés dans les{" "}
                <strong className="text-[var(--p-text)]">72 heures</strong> conformément à la Loi 25.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 10. Mineurs */}
            <section id="mineurs" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                10. Mineurs
              </h2>
              <p>
                Pratiqo n&apos;est pas destiné aux enfants de moins de 13 ans. Si un mineur utilise la
                plateforme, le consentement parental est requis. Si vous pensez qu&apos;un mineur a créé un
                compte sans consentement parental, contactez-nous immédiatement.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 11. Modifications */}
            <section id="modifications" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                11. Modifications
              </h2>
              <p>
                Nous vous informerons de toute modification substantielle par courriel avec un préavis de{" "}
                <strong className="text-[var(--p-text)]">30 jours</strong>.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* 12. Contact */}
            <section id="contact" className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
                12. Contact
              </h2>
              <p className="font-medium text-[var(--p-text)]">Responsable de la protection des données (RPD)</p>
              <p className="mt-1">
                <strong className="text-[var(--p-text)]">Pratiqo inc.</strong>
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
                  pratiqo.com
                </Link>
              </p>
            </section>
          </article>

          {/* Footer navigation */}
          <footer className="mt-14 pt-8 border-t border-[var(--p-border-light)]">
            <p className="text-[12px] text-[var(--p-text-muted)] mb-2">Autres documents légaux</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <Link href="/cgu" className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline">
                CGU
              </Link>
              <span className="text-teal-700 font-medium">Confidentialité</span>
              <Link
                href="/code-de-conduite"
                className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline"
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
