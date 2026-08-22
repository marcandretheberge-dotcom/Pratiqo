import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ShieldAlert } from "lucide-react";
import {
  getPackageLaunchReadiness,
  PACKAGE_LAUNCH_FLAG_META,
  type PackageLaunchReadiness,
  type PackageLaunchReadinessStatus,
} from "@/lib/offers/packageLaunchReadiness";

export const dynamic = "force-dynamic";

function statusLabel(status: PackageLaunchReadinessStatus): string {
  switch (status) {
    case "blocked":
      return "Bloqué";
    case "preview_ready":
      return "Prêt pour aperçu contrôlé";
    case "production_review_required":
      return "Revue de production requise";
    default:
      return "Statut inconnu";
  }
}

function statusClass(status: PackageLaunchReadinessStatus): string {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "preview_ready") return "border-teal-200 bg-teal-50 text-teal-900";
  return "border-amber-200 bg-amber-50 text-amber-950";
}

function BoolPill({ ok, labelYes = "Oui", labelNo = "Non" }: { ok: boolean; labelYes?: string; labelNo?: string }) {
  return (
    <span
      className={
        ok
          ? "inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800"
          : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-600"
      }
    >
      {ok ? labelYes : labelNo}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ChecklistRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <p className="text-slate-700">{label}</p>
      <BoolPill ok={ok} labelYes="OK" labelNo="À vérifier" />
    </div>
  );
}

function ReadinessBody({ readiness }: { readiness: PackageLaunchReadiness }) {
  return (
    <div className="space-y-6" data-testid="package-launch-readiness">
      <section
        className={`rounded-2xl border px-5 py-4 ${statusClass(readiness.status)}`}
        data-testid="package-launch-status"
        data-status={readiness.status}
      >
        <p className="text-xs font-bold uppercase tracking-wide">Statut de lancement</p>
        <p className="mt-1 text-lg font-bold">{statusLabel(readiness.status)}</p>
        <p className="mt-2 text-sm leading-relaxed">
          Cette page aide à vérifier si les forfaits payants sont prêts pour un test contrôlé. Elle ne
          lance rien et ne modifie aucun réglage.
        </p>
        <p className="mt-2 text-sm font-semibold">
          Vérification légale requise avant activation publique.
        </p>
      </section>

      <Section title="1. Feature flags">
        <p className="text-sm text-slate-600">
          Aucun bouton de bascule ici — changez les variables d’environnement hors de cette page.
        </p>
        <ul className="space-y-3">
          {PACKAGE_LAUNCH_FLAG_META.map((meta) => {
            const detail = readiness.flagDetails.find((f) => f.id === meta.id);
            const enabled = detail?.enabled ?? false;
            return (
              <li
                key={meta.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                data-testid={`package-flag-${meta.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <code className="text-xs font-bold text-slate-800">{meta.envName}</code>
                  <BoolPill
                    ok={enabled}
                    labelYes="Activé"
                    labelNo="Désactivé"
                  />
                </div>
                <p className="mt-2 text-sm text-slate-700">{meta.explanationFr}</p>
                <p className="mt-1 text-xs text-slate-500">{meta.launchMeaningFr}</p>
                {detail?.uiEnvName && detail.uiEnvName !== meta.envName ? (
                  <p className="mt-1 text-xs text-slate-500">
                    UI: <code>{detail.uiEnvName}</code>{" "}
                    {detail.uiEnabled ? "(ON)" : "(OFF)"}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="1b. Phase 1 — Forfaits planifiés">
        <p className="text-sm text-slate-600" data-testid="package-launch-phase1">
          Squelette technique pour les forfaits planifiés proposés par les professeurs. L’achat public
          reste bloqué.
        </p>
        <ChecklistRow label="Décision produit Phase 1 documentée" ok={true} />
        <ChecklistRow
          label="Helper / schéma forfait planifié présent"
          ok={readiness.checks.plannedPackageSkeletonPresent}
        />
        <ChecklistRow
          label={`Brouillon professeur (ENABLE_PLANNED_PACKAGES) : ${
            readiness.flags.plannedPackages ? "ON" : "OFF"
          }`}
          ok={true}
        />
        <ChecklistRow
          label="Achat public de forfait bloqué"
          ok={readiness.checks.plannedPackagePublicPurchaseBlocked}
        />
        <ChecklistRow
          label="Schéma brouillon de séances présent"
          ok={readiness.checks.plannedPackageSessionDraftSchemaPresent}
        />
        <ChecklistRow
          label={`Sélection de séances gated (ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS) : ${
            readiness.flags.plannedPackageSessionDrafts ? "ON" : "OFF"
          }`}
          ok={readiness.checks.plannedPackageSessionDraftsGated}
        />
        <ChecklistRow
          label="Brouillon de séances sans paiement"
          ok={readiness.checks.plannedPackageSessionDraftNoPayment}
        />
        <ChecklistRow
          label="Brouillon de séances sans réservations"
          ok={readiness.checks.plannedPackageSessionDraftNoBookings}
        />
        <ChecklistRow
          label="Brouillon de séances sans entitlements"
          ok={readiness.checks.plannedPackageSessionDraftNoEntitlements}
        />
        <ChecklistRow
          label="Endpoint préflight checkout présent"
          ok={readiness.checks.plannedPackageCheckoutPreflightPresent}
        />
        <ChecklistRow
          label={`Préflight gated (ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT) : ${
            readiness.flags.plannedPackageCheckoutPreflight ? "ON" : "OFF"
          }`}
          ok={readiness.checks.plannedPackageCheckoutPreflightGated}
        />
        <ChecklistRow
          label="Préflight sans paiement / Stripe"
          ok={readiness.checks.plannedPackageCheckoutPreflightNoPayment}
        />
        <ChecklistRow
          label="Schéma commandes / holds temporaire présent"
          ok={readiness.checks.plannedPackageTemporaryHoldsSchemaPresent}
        />
        <ChecklistRow
          label={`Holds temporaires gated (ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS) : ${
            readiness.flags.plannedPackageTemporaryHolds ? "ON" : "OFF"
          }`}
          ok={readiness.checks.plannedPackageTemporaryHoldsGated}
        />
        <ChecklistRow
          label="Holds sans paiement / sans réservation confirmée"
          ok={readiness.checks.plannedPackageTemporaryHoldsNoPayment}
        />
        <ChecklistRow
          label="Checkout forfait toujours bloqué"
          ok={readiness.checks.plannedPackagePublicPurchaseBlocked}
        />
        <ChecklistRow
          label="Revue légale toujours requise"
          ok={readiness.checks.legalReviewMarkedRequired}
        />
        <ChecklistRow
          label="Versement progressif pas encore implémenté"
          ok={readiness.checks.progressivePayoutNotImplemented}
        />
        <ChecklistRow
          label="Politique de remboursement encore en brouillon"
          ok={readiness.checks.refundPolicyStillDraft}
        />
      </Section>

      <Section title="2. Paiements et forfaits">
        <ChecklistRow
          label="Checkout forfait gated (snapshot + entitlements cohérents)"
          ok={readiness.checks.packageCheckoutGated}
        />
        <ChecklistRow
          label="Création d’entitlement après paiement gated"
          ok={!readiness.flags.packageEntitlements || readiness.flags.offerSnapshotCheckout}
        />
        <ChecklistRow
          label="Prix forfait via snapshot de réservation (pas live teacher_offers)"
          ok={true}
        />
        <p className="text-xs text-slate-500">
          Paiement facilité par Pratiqo · frais de plateforme / commission · forfaits proposés par les
          professeurs.
        </p>
      </Section>

      <Section title="3. Crédits et annulations">
        <ChecklistRow
          label="Réservation par crédit de forfait gated"
          ok={readiness.checks.redemptionGated}
        />
        <ChecklistRow label="Rédemption attendue atomique (RPC serveur)" ok={true} />
        <ChecklistRow label="Annulation / refus remettent le crédit" ok={true} />
        <ChecklistRow label="Tableaux de bord ne mutent pas les soldes" ok={true} />
      </Section>

      <Section title="4. Tableaux de bord">
        <ChecklistRow
          label="Élève — Mes forfaits (flag serveur)"
          ok={readiness.flags.studentPackageDashboard}
        />
        <ChecklistRow
          label="Professeur — Forfaits achetés avec vous (flag serveur)"
          ok={readiness.flags.teacherPackageVisibility}
        />
        <ChecklistRow
          label="Visibilité admin / support (snapshots & source de paiement)"
          ok={readiness.checks.adminSupportVisibilityPresent}
        />
      </Section>

      <Section title="5. Marketplace / légal">
        <ChecklistRow
          label="Doc marketplace-independent-teacher-guardrails"
          ok={readiness.docs.marketplaceGuardrailsDocExists}
        />
        <ChecklistRow
          label="Checklist légale paid-packages-legal-launch-checklist"
          ok={readiness.docs.paidPackagesLegalChecklistExists}
        />
        <ChecklistRow
          label="Doc paid-packages-launch-readiness"
          ok={readiness.docs.launchReadinessDocExists}
        />
        <ChecklistRow
          label="Doc package-feature-flags"
          ok={readiness.docs.packageFeatureFlagsDocExists}
        />
        <ChecklistRow
          label="Tests garde-fous de wording marketplace"
          ok={readiness.checks.marketplaceCopyGuardsPresent}
        />
        <ChecklistRow
          label="Revue légale encore requise (pas de signal d’approbation)"
          ok={readiness.checks.legalReviewMarkedRequired && !readiness.checks.legalReviewCompletedSignal}
        />
        <p className="text-xs leading-relaxed text-slate-500">
          Intermédiaire technologique · forfaits proposés par les professeurs · pas de « Forfaits
          Pratiqo ».
        </p>
      </Section>

      <Section title="6. Bloqueurs / alertes">
        {readiness.blockers.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-teal-800">
            <CheckCircle2 size={16} aria-hidden /> Aucun bloqueur listé.
          </p>
        ) : (
          <ul className="space-y-2">
            {readiness.blockers.map((b) => (
              <li
                key={b.code}
                className={
                  b.severity === "critical"
                    ? "flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                    : "flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                }
              >
                {b.severity === "critical" ? (
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                ) : (
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                )}
                <span>
                  <span className="font-bold uppercase">{b.severity}</span> — {b.message}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-slate-400">
          Généré à {new Date(readiness.generatedAt).toLocaleString("fr-CA")} · lecture seule
        </p>
      </Section>
    </div>
  );
}

export default function AdminPackageLaunchReadinessPage() {
  const readiness = getPackageLaunchReadiness();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Retour admin"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Forfaits — préparation au lancement
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Diagnostic interne · intermédiaire technologique · forfaits proposés par les professeurs
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Les offres de cours standards peuvent fonctionner séparément. Les forfaits payants
            restent bloqués jusqu’à la revue légale et la validation du modèle de remboursement.
          </p>
          <div
            className="mt-3 max-w-2xl space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            data-testid="package-launch-offers-separation"
          >
            <p>
              <span className="font-semibold">Offres de cours standards :</span> peuvent être
              fonctionnelles indépendamment.
            </p>
            <p>
              <span className="font-semibold">Forfaits payants :</span> restent bloqués jusqu’à la
              revue légale et l’approbation de l’architecture de remboursement / versement
              progressif.
            </p>
          </div>
        </div>
      </div>
      <ReadinessBody readiness={readiness} />
    </div>
  );
}
