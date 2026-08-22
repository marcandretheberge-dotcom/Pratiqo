"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import {
  isStudentPackageDashboardUiEnabled,
  type StudentPackageDto,
} from "@/lib/offers/studentPackages";
import { isStudentPlannedPackageDashboardUiEnabled } from "@/lib/offers/plannedPackageStudentDashboard";
import type { StudentPlannedPackageDto } from "@/lib/offers/plannedPackageStudentDto";
import { StudentPackageCard } from "@/components/student/StudentPackageCard";
import { StudentPlannedPackageCard } from "@/components/student/StudentPlannedPackageCard";
import { AppSectionListSkeleton } from "@/components/loading/AppSkeletons";

export function StudentPackageDashboard() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const entitlementsUiEnabled = isStudentPackageDashboardUiEnabled();
  const plannedUiEnabled = isStudentPlannedPackageDashboardUiEnabled();
  const uiEnabled = entitlementsUiEnabled || plannedUiEnabled;

  const [packages, setPackages] = useState<StudentPackageDto[]>([]);
  const [plannedPackages, setPlannedPackages] = useState<StudentPlannedPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === "teacher") {
      router.replace("/dashboard");
    }
  }, [profile?.role, router]);

  const load = useCallback(async () => {
    if (!uiEnabled || !user) {
      setLoading(false);
      setPackages([]);
      setPlannedPackages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError(t("studentPackagesLoadError"));
        setPackages([]);
        setPlannedPackages([]);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [entRes, plannedRes] = await Promise.all([
        entitlementsUiEnabled
          ? fetch("/api/student/packages", { headers })
          : Promise.resolve(null),
        plannedUiEnabled
          ? fetch("/api/student/planned-packages", { headers })
          : Promise.resolve(null),
      ]);

      let nextEnt: StudentPackageDto[] = [];
      let nextPlanned: StudentPlannedPackageDto[] = [];
      let hadHardError = false;

      if (entRes) {
        if (entRes.status === 400) {
          nextEnt = [];
        } else if (!entRes.ok) {
          hadHardError = true;
        } else {
          const payload = (await entRes.json()) as { packages?: StudentPackageDto[] };
          nextEnt = Array.isArray(payload.packages) ? payload.packages : [];
        }
      }

      if (plannedRes) {
        if (plannedRes.status === 400) {
          nextPlanned = [];
        } else if (!plannedRes.ok) {
          hadHardError = true;
        } else {
          const payload = (await plannedRes.json()) as {
            packages?: StudentPlannedPackageDto[];
          };
          nextPlanned = Array.isArray(payload.packages) ? payload.packages : [];
        }
      }

      setPackages(nextEnt);
      setPlannedPackages(nextPlanned);
      setError(hadHardError ? t("studentPackagesLoadError") : null);
    } catch {
      setError(t("studentPackagesLoadError"));
      setPackages([]);
      setPlannedPackages([]);
    } finally {
      setLoading(false);
    }
  }, [uiEnabled, entitlementsUiEnabled, plannedUiEnabled, user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const { active, completed } = useMemo(() => {
    const activeList: StudentPackageDto[] = [];
    const completedList: StudentPackageDto[] = [];
    for (const pkg of packages) {
      if (pkg.package.status === "active" && pkg.package.remainingSessions > 0) {
        activeList.push(pkg);
      } else {
        completedList.push(pkg);
      }
    }
    return { active: activeList, completed: completedList };
  }, [packages]);

  const plannedActive = useMemo(
    () =>
      plannedPackages.filter(
        (p) =>
          p.status !== "completed" &&
          p.status !== "refunded" &&
          p.status !== "payment_pending",
      ),
    [plannedPackages],
  );
  const plannedPending = useMemo(
    () => plannedPackages.filter((p) => p.status === "payment_pending"),
    [plannedPackages],
  );
  const plannedPast = useMemo(
    () => plannedPackages.filter((p) => p.status === "completed" || p.status === "refunded"),
    [plannedPackages],
  );

  const isEmpty =
    packages.length === 0 && plannedPackages.length === 0;

  if (!uiEnabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
        {t("studentPackagesDisabled")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
        {t("studentPackagesSignIn")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8" data-testid="student-packages-dashboard">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label={t("back")}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("studentPackagesTitle")}</h1>
          <p className="mt-0.5 text-sm text-slate-600">{t("studentPackagesSubtitle")}</p>
        </div>
      </div>

      {loading ? (
        <AppSectionListSkeleton />
      ) : error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : isEmpty ? (
        <div
          className="rounded-2xl border border-dashed border-[#DCEAE3] bg-[#F3FAF6]/60 px-5 py-10 text-center"
          data-testid="student-packages-empty"
        >
          <Package className="mx-auto text-teal-700/70" size={36} aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-800">
            {t("studentPlannedPackagesEmptyTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("studentPackagesEmptyBody")}
          </p>
          <Link
            href="/student/search"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800"
          >
            {t("studentPackagesFindTeacher")}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {plannedUiEnabled && plannedActive.length > 0 ? (
            <section
              aria-labelledby="student-planned-packages-heading"
              data-testid="student-planned-packages-section"
            >
              <h2
                id="student-planned-packages-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("studentPlannedPackagesSection")}
              </h2>
              <div className="grid gap-4">
                {plannedActive.map((pkg) => (
                  <StudentPlannedPackageCard key={pkg.orderId} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {plannedUiEnabled && plannedPending.length > 0 ? (
            <section aria-labelledby="student-planned-packages-pending-heading">
              <h2
                id="student-planned-packages-pending-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("studentPlannedPackagesPendingSection")}
              </h2>
              <div className="grid gap-4">
                {plannedPending.map((pkg) => (
                  <StudentPlannedPackageCard key={pkg.orderId} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {entitlementsUiEnabled && active.length > 0 ? (
            <section aria-labelledby="student-packages-active-heading">
              <h2
                id="student-packages-active-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("studentPackagesActiveSection")}
              </h2>
              <div className="grid gap-4">
                {active.map((pkg) => (
                  <StudentPackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {entitlementsUiEnabled && completed.length > 0 ? (
            <section aria-labelledby="student-packages-past-heading">
              <h2
                id="student-packages-past-heading"
                className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("studentPackagesPastSection")}
              </h2>
              <p className="mb-3 text-sm text-slate-600">{t("studentPackagesPastBody")}</p>
              <div className="grid gap-4">
                {completed.map((pkg) => (
                  <StudentPackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {plannedUiEnabled && plannedPast.length > 0 ? (
            <section aria-labelledby="student-planned-packages-past-heading">
              <h2
                id="student-planned-packages-past-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("studentPlannedPackagesPastSection")}
              </h2>
              <div className="grid gap-4">
                {plannedPast.map((pkg) => (
                  <StudentPlannedPackageCard key={pkg.orderId} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
