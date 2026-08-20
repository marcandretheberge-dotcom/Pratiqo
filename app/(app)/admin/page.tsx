"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CreditCard,
  Globe2,
  GraduationCap,
  Handshake,
  LifeBuoy,
  Loader2,
  LogOut,
  Package,
  ShieldCheck,
  TicketPercent,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { logout } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ADMIN_COMMAND_CENTER_MODULES,
  ADMIN_OVERVIEW_UNAVAILABLE_LABEL,
  buildAdminPriorityAlerts,
  emptyAdminOverview,
  formatAdminOverviewMetric,
  type AdminOverview,
  type AdminOverviewModule,
} from "@/lib/admin/overview";

const MODULE_ICONS: Record<AdminOverviewModule["id"], React.ReactNode> = {
  teachers: <GraduationCap size={20} aria-hidden />,
  students: <Users size={20} aria-hidden />,
  verifications: <BadgeCheck size={20} aria-hidden />,
  bookings: <BookOpen size={20} aria-hidden />,
  payments: <CreditCard size={20} aria-hidden />,
  stripe_diagnostics: <ShieldCheck size={20} aria-hidden />,
  package_launch_readiness: <Package size={20} aria-hidden />,
  promotions: <TicketPercent size={20} aria-hidden />,
  ambassadors: <Handshake size={20} aria-hidden />,
  seo: <Globe2 size={20} aria-hidden />,
  support: <LifeBuoy size={20} aria-hidden />,
};

type KpiCard = {
  id: string;
  label: string;
  value: number | null;
};

export default function AdminDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { t } = useLocale();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState<AdminOverview>(emptyAdminOverview());
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const isAdmin = (profile?.role as string | undefined) === "admin";

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const loadOverview = useCallback(async () => {
    if (!isAdmin) {
      setLoadingOverview(false);
      return;
    }
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch("/api/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        overview?: AdminOverview;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setOverview(data.overview ?? emptyAdminOverview());
    } catch (e) {
      setOverview(emptyAdminOverview());
      setOverviewError(e instanceof Error ? e.message : "Erreur lors du chargement.");
    } finally {
      setLoadingOverview(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  };

  const kpis: KpiCard[] = useMemo(
    () => [
      { id: "teachersTotal", label: "Professeurs inscrits", value: overview.teachersTotal },
      { id: "teachersVisible", label: "Profils visibles", value: overview.teachersVisible },
      { id: "teachersBlocked", label: "Profils bloqués", value: overview.teachersBlocked },
      { id: "studentsTotal", label: "Apprenants inscrits", value: overview.studentsTotal },
      { id: "bookings", label: "Réservations", value: overview.bookingsTotal },
      {
        id: "paymentsWatch",
        label: "Paiements à surveiller",
        value: overview.stripeIncompleteTeachers,
      },
    ],
    [overview],
  );

  const alerts = useMemo(() => buildAdminPriorityAlerts(overview), [overview]);

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <ShieldCheck size={26} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Espace admin
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">
                  Centre de contrôle Pratiqo
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Vue interne pour piloter les professeurs, les apprenants, les réservations, les
                  paiements et la croissance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              aria-label={t("signOut")}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <LogOut size={16} aria-hidden />
              )}
              {t("signOut")}
            </button>
          </div>
        </section>

        <section aria-labelledby="admin-kpi-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="admin-kpi-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              Indicateurs
            </h2>
            {loadingOverview ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Chargement…
              </span>
            ) : null}
          </div>
          {overviewError ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {overviewError} Les indicateurs affichés restent « {ADMIN_OVERVIEW_UNAVAILABLE_LABEL} ».
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.id}
                data-admin-kpi={kpi.id}
                className="rounded-2xl border border-[#DCEAE3] bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {kpi.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#0F6E56]">
                  {formatAdminOverviewMetric(kpi.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="admin-alerts-heading"
          className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" aria-hidden />
            <h2 id="admin-alerts-heading" className="text-base font-bold text-[#2C2C2A]">
              À traiter maintenant
            </h2>
          </div>
          {loadingOverview ? (
            <p className="mt-3 text-sm text-slate-500">Chargement des alertes…</p>
          ) : alerts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Aucune alerte prioritaire pour le moment. Les compteurs indisponibles restent masqués.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {alerts.map((alert) => {
                const body = (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="min-w-0 text-sm font-semibold text-[#2C2C2A]">{alert.label}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                        {alert.count}
                      </span>
                      {alert.href ? <ArrowRight size={16} className="text-teal-700" aria-hidden /> : null}
                    </span>
                  </span>
                );
                return (
                  <li key={alert.id}>
                    {alert.href ? (
                      <Link
                        href={alert.href}
                        data-admin-alert={alert.id}
                        className="flex rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 transition hover:border-amber-200 hover:bg-amber-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        data-admin-alert={alert.id}
                        className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3"
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="admin-modules-heading" className="space-y-3">
          <h2 id="admin-modules-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Modules admin
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ADMIN_COMMAND_CENTER_MODULES.map((module) => {
              const comingSoon = module.status === "coming_soon" || !module.href;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      {MODULE_ICONS[module.id]}
                    </span>
                    <span
                      className={
                        comingSoon
                          ? "rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600"
                          : "rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-800"
                      }
                    >
                      {comingSoon ? "À venir" : "Disponible"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#2C2C2A]">{module.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{module.description}</p>
                  <p
                    className={
                      comingSoon
                        ? "mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-400"
                        : "mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
                    }
                  >
                    {comingSoon ? "Bientôt disponible" : module.cta}
                    {!comingSoon ? <ArrowRight size={16} aria-hidden /> : null}
                  </p>
                </>
              );

              if (comingSoon) {
                return (
                  <div
                    key={module.id}
                    data-admin-module={module.id}
                    data-admin-module-status="coming_soon"
                    className="flex flex-col rounded-3xl border border-dashed border-[#DCEAE3] bg-white/80 p-5 opacity-90"
                    aria-disabled="true"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={module.id}
                  href={module.href!}
                  data-admin-module={module.id}
                  data-admin-module-status="ready"
                  className="flex flex-col rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm transition hover:border-teal-500/40 hover:bg-teal-50/20"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
