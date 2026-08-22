import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ShieldAlert } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import {
  getPlannedPackageLaunchMonitoringSnapshot,
  type LaunchMonitorSeverity,
  type PlannedPackageLaunchMonitoringSnapshot,
  type PlannedPackageStuckState,
} from "@/lib/offers/plannedPackageLaunchMonitoring";
import {
  PLANNED_PACKAGE_ADMIN_ORDERS_HREF,
  PLANNED_PACKAGE_ADMIN_READINESS_HREF,
} from "@/lib/offers/plannedPackageDashboardLinks";
import { t as translate } from "@/lib/translations";
import type { TranslationKey } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

/** Admin command center copy is French-first. */
const t = (key: TranslationKey) => translate(key, "fr");

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function severityClass(severity: LaunchMonitorSeverity): string {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-900";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StuckList({ items }: { items: PlannedPackageStuckState[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-teal-800">Aucun état bloqué détecté.</p>;
  }
  return (
    <ul className="space-y-2" data-testid="planned-package-stuck-states">
      {items.map((item, idx) => (
        <li
          key={`${item.code}-${item.orderId ?? "env"}-${idx}`}
          className={`rounded-xl border px-3 py-2 text-sm ${severityClass(item.severity)}`}
        >
          <div className="flex items-start gap-2">
            {item.severity === "critical" ? (
              <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {item.shortId ? `${item.shortId} · ` : ""}
                {item.message}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {t("plannedPackageLaunchMonitorAdminActionRequired")} : {item.recommendedAction}
              </p>
              {item.detailHref ? (
                <Link href={item.detailHref} className="mt-1 inline-block text-xs font-semibold underline">
                  Ouvrir
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency || "CAD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function MonitorBody({ snapshot }: { snapshot: PlannedPackageLaunchMonitoringSnapshot }) {
  return (
    <div className="space-y-6" data-testid="planned-package-launch-monitor">
      <section
        className={`rounded-2xl border px-5 py-4 ${
          snapshot.launchGate.publicPurchaseBlocked
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-teal-200 bg-teal-50 text-teal-900"
        }`}
        data-testid="launch-monitor-gate-banner"
      >
        <p className="text-xs font-bold uppercase tracking-wide">
          {t("plannedPackageLaunchMonitorLaunchStatus")}
        </p>
        <p className="mt-1 text-lg font-bold">
          {snapshot.launchGate.publicPurchaseBlocked
            ? t("plannedPackageLaunchMonitorPublicPurchaseBlocked")
            : t("plannedPackageLaunchMonitorPublicPurchaseEnabled")}
        </p>
        <p className="mt-2 text-sm">
          Mode {snapshot.launchGate.launchMode} · statut {snapshot.launchGate.activationStatus}
        </p>
        <p className="mt-2 text-xs opacity-80">
          {t("plannedPackageLaunchMonitorNoSecrets")} · {t("plannedPackageLaunchMonitorNoAutoFix")}
        </p>
      </section>

      <Section title={`1. ${t("plannedPackageLaunchMonitorLaunchStatus")}`}>
        <ChecklistRow
          label={t("plannedPackageLaunchMonitorPublicPurchaseEnabled")}
          ok={snapshot.flags.publicPurchase}
        />
        <ChecklistRow label="Revue légale complétée" ok={snapshot.legalReview.completed} />
        <ChecklistRow label="Tableau élève ON" ok={snapshot.flags.studentDashboard} />
        <ChecklistRow label="Tableau professeur ON" ok={snapshot.flags.teacherDashboard} />
        <ChecklistRow label="Admin ops ON" ok={snapshot.flags.adminOps} />
        <ChecklistRow label="Conditions apprenant requises" ok={snapshot.launchGate.learnerTermsRequired} />
        <ChecklistRow label="Conditions professeur requises" ok={snapshot.launchGate.teacherTermsRequired} />
        <ChecklistRow label="Stripe readiness requise" ok={snapshot.launchGate.stripeReadinessRequired} />
        <ChecklistRow label={t("plannedPackageRollbackAvailable")} ok={true} />
        <p className="text-xs text-slate-500">Version conditions : {snapshot.launchGate.termsVersion}</p>
      </Section>

      <Section title={`2. ${t("plannedPackageLaunchMonitorRecentOrders")}`}>
        {snapshot.recentOrders.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune commande récente.</p>
        ) : (
          <div className="overflow-x-auto" data-testid="launch-monitor-recent-orders">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Commande</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Montant</th>
                  <th className="py-2 pr-3">Checkout</th>
                  <th className="py-2 pr-3">Fulfillment</th>
                  <th className="py-2">Attention</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <Link
                        href={order.detailHref}
                        className="font-semibold text-teal-800 underline-offset-2 hover:underline"
                      >
                        {order.shortId}
                      </Link>
                      <p className="text-xs text-slate-500">{order.offerTitle}</p>
                    </td>
                    <td className="py-2 pr-3">{order.status}</td>
                    <td className="py-2 pr-3">{formatCents(order.totalPriceCents, order.currency)}</td>
                    <td className="py-2 pr-3">{order.checkoutStatus ?? "—"}</td>
                    <td className="py-2 pr-3">{order.fulfillmentStatus}</td>
                    <td className="py-2">
                      {order.needsAttention ? (
                        <span className="text-xs font-bold text-amber-800">Oui</span>
                      ) : (
                        <span className="text-xs text-slate-500">Non</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href={PLANNED_PACKAGE_ADMIN_ORDERS_HREF} className="text-sm font-semibold text-teal-800 underline">
          Voir toutes les commandes
        </Link>
      </Section>

      <Section title={`3. ${t("plannedPackageLaunchMonitorCheckoutWebhookHealth")}`}>
        <ChecklistRow label="Clé Stripe configurée" ok={snapshot.stripeConfig.secretKeyConfigured} />
        <ChecklistRow label="Webhook Stripe configuré" ok={snapshot.webhookHealth.webhookSecretConfigured} />
        <p className="text-sm text-slate-700">
          Mode checkout : <span className="font-semibold">{snapshot.stripeConfig.checkoutMode}</span>
        </p>
        <p className="text-sm text-slate-700">
          Webhooks ~24h (proxy paid) : {snapshot.webhookHealth.ordersWithWebhookInLast24h} · 7j :{" "}
          {snapshot.webhookHealth.ordersWithWebhookInLast7d}
        </p>
        <p className="text-sm text-slate-700">
          Checkout complété sans payment_confirmed :{" "}
          {snapshot.webhookHealth.checkoutCompletedMissingPaymentConfirm}
        </p>
        <p className="text-sm text-slate-700">
          Checkout sans webhook : {snapshot.webhookHealth.checkoutStartedMissingWebhook}
        </p>
      </Section>

      <Section title={`4. ${t("plannedPackageLaunchMonitorFulfillmentHealth")}`}>
        <p className="text-sm text-slate-700">
          Payé en attente : {snapshot.fulfillmentHealth.paidAwaitingFulfillment}
        </p>
        <p className="text-sm text-slate-700">Échoués : {snapshot.fulfillmentHealth.fulfillmentFailed}</p>
        <p className="text-sm text-slate-700">Fulfillés : {snapshot.fulfillmentHealth.fulfilled}</p>
        <p className="text-sm text-slate-700">
          Payé non fulfillé (attention) : {snapshot.fulfillmentHealth.needsAttentionPaidNotFulfilled}
        </p>
        <p className="text-sm text-slate-700">
          {t("plannedPackageLaunchMonitorMissingSessions")} :{" "}
          {snapshot.fulfillmentHealth.needsAttentionMissingBookings}
        </p>
      </Section>

      <Section title={`5. ${t("plannedPackageLaunchMonitorDashboardVisibility")}`}>
        <ChecklistRow label="Dashboard élève ON" ok={snapshot.dashboardHealth.studentDashboardEnabled} />
        <ChecklistRow label="Dashboard professeur ON" ok={snapshot.dashboardHealth.teacherDashboardEnabled} />
        <ChecklistRow
          label="Pas d’achat public sans dashboard élève"
          ok={!snapshot.dashboardHealth.publicPurchaseWithoutStudentDashboard}
        />
        <ChecklistRow
          label="Pas d’achat public sans dashboard professeur"
          ok={!snapshot.dashboardHealth.publicPurchaseWithoutTeacherDashboard}
        />
      </Section>

      <Section title={`6. ${t("plannedPackageLaunchMonitorRefundHealth")}`}>
        <p className="text-sm text-slate-700">
          Quotes approuvées non exécutées : {snapshot.financialOpsHealth.refunds.attentionApprovedNotExecuted}
        </p>
        <p className="text-sm text-slate-700">
          Exécutions échouées : {snapshot.financialOpsHealth.refunds.attentionExecutionFailed}
        </p>
        <p className="text-sm text-slate-700">
          En attente de reversal : {snapshot.financialOpsHealth.refunds.attentionWaitingOnReversal}
        </p>
      </Section>

      <Section
        title={`7. ${t("plannedPackageLaunchMonitorTransferHealth")} / ${t("plannedPackageLaunchMonitorReversalHealth")}`}
      >
        <p className="text-sm text-slate-700">
          Transfers admissibles non exécutés :{" "}
          {snapshot.financialOpsHealth.transfers.attentionEligibleNotExecuted}
        </p>
        <p className="text-sm text-slate-700">
          Transfers échoués : {snapshot.financialOpsHealth.transfers.attentionExecutionFailed}
        </p>
        <p className="text-sm text-slate-700">
          {t("plannedPackageLaunchMonitorMissingTransferEligibility")} :{" "}
          {snapshot.financialOpsHealth.transfers.attentionMissingEligibility}
        </p>
        <p className="text-sm text-slate-700">
          Reversals requis : {snapshot.financialOpsHealth.reversals.attentionRequired}
        </p>
        <p className="text-sm text-slate-700">
          Reversals échoués : {snapshot.financialOpsHealth.reversals.attentionFailed}
        </p>
      </Section>

      <Section title={`8. ${t("plannedPackageLaunchMonitorStuckStates")}`}>
        <StuckList items={snapshot.stuckStates} />
      </Section>

      <Section title={`9. ${t("plannedPackageLaunchMonitorRollback")}`}>
        <div data-testid="launch-monitor-rollback" className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold">Arrêt d’urgence des nouveaux achats</p>
            {snapshot.rollback.emergencyStopPublicPurchase.map((line) => (
              <code key={line} className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs">
                {line}
              </code>
            ))}
          </div>
          <div>
            <p className="font-semibold">Masquer l’UI forfait publique</p>
            {snapshot.rollback.hidePublicPackageUi.map((line) => (
              <code key={line} className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs">
                {line}
              </code>
            ))}
          </div>
          <div>
            <p className="font-semibold">Garder ops admin ON</p>
            {snapshot.rollback.keepAdminOpsOn.map((line) => (
              <code key={line} className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs">
                {line}
              </code>
            ))}
          </div>
          <div>
            <p className="font-semibold">Garder dashboards ON (clients existants)</p>
            {snapshot.rollback.keepDashboardsOnForExistingCustomers.map((line) => (
              <code key={line} className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs">
                {line}
              </code>
            ))}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            {snapshot.rollback.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </Section>

      {(snapshot.blockers.length > 0 || snapshot.warnings.length > 0) && (
        <Section title="Bloqueurs / alertes">
          <ul className="space-y-2">
            {snapshot.blockers.map((b) => (
              <li key={b.code} className={`rounded-xl border px-3 py-2 text-sm ${severityClass(b.severity)}`}>
                <span className="font-bold uppercase">{b.severity}</span> — {b.message}
              </li>
            ))}
            {snapshot.warnings.map((w) => (
              <li
                key={w.code}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              >
                WARNING — {w.message}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 size={14} aria-hidden />
        Généré à {new Date(snapshot.generatedAt).toLocaleString("fr-CA")} · lecture seule
      </p>
    </div>
  );
}

export default async function AdminPlannedPackageLaunchMonitorPage() {
  if (!canUsePlannedPackageAdminOps()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="text-xl font-bold text-slate-900">{t("plannedPackageLaunchMonitorTitle")}</h1>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Ops admin forfait non disponibles (ENABLE_PLANNED_PACKAGE_ADMIN_OPS + chaîne fulfillment).
        </p>
        <Link href={PLANNED_PACKAGE_ADMIN_READINESS_HREF} className="mt-4 inline-block text-sm font-semibold text-teal-800 underline">
          Voir la préparation au lancement
        </Link>
      </div>
    );
  }

  const snapshot = await getPlannedPackageLaunchMonitoringSnapshot({
    admin: getSupabaseAdmin(),
    recentLimit: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
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
            {t("plannedPackageLaunchMonitorTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Observabilité post-lancement · lecture seule · sans mouvement d’argent
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href={PLANNED_PACKAGE_ADMIN_READINESS_HREF} className="font-semibold text-teal-800 underline">
              Préparation
            </Link>
            <Link href={PLANNED_PACKAGE_ADMIN_ORDERS_HREF} className="font-semibold text-teal-800 underline">
              Commandes
            </Link>
          </div>
        </div>
      </div>
      <MonitorBody snapshot={snapshot} />
    </div>
  );
}
