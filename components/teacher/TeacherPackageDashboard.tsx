"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import {
  isTeacherPackageVisibilityUiEnabled,
  type TeacherPackageDto,
} from "@/lib/offers/teacherPackages";
import { isTeacherPlannedPackageDashboardUiEnabled } from "@/lib/offers/plannedPackageTeacherDashboard";
import type { TeacherPlannedPackageDto } from "@/lib/offers/plannedPackageTeacherDto";
import { TeacherPackageCard } from "@/components/teacher/TeacherPackageCard";
import { TeacherPlannedPackageCard } from "@/components/teacher/TeacherPlannedPackageCard";
import { AppSectionListSkeleton } from "@/components/loading/AppSkeletons";

export function TeacherPackageDashboard() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const entitlementsUiEnabled = isTeacherPackageVisibilityUiEnabled();
  const plannedUiEnabled = isTeacherPlannedPackageDashboardUiEnabled();
  const uiEnabled = entitlementsUiEnabled || plannedUiEnabled;

  const [packages, setPackages] = useState<TeacherPackageDto[]>([]);
  const [plannedPackages, setPlannedPackages] = useState<TeacherPlannedPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [profile, router]);

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
        setError(t("teacherPackagesLoadError"));
        setPackages([]);
        setPlannedPackages([]);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [entRes, plannedRes] = await Promise.all([
        entitlementsUiEnabled
          ? fetch("/api/teacher/packages", { headers })
          : Promise.resolve(null),
        plannedUiEnabled
          ? fetch("/api/teacher/planned-packages", { headers })
          : Promise.resolve(null),
      ]);

      let nextEnt: TeacherPackageDto[] = [];
      let nextPlanned: TeacherPlannedPackageDto[] = [];
      let hadHardError = false;

      if (entRes) {
        if (entRes.status === 400) {
          nextEnt = [];
        } else if (!entRes.ok) {
          hadHardError = true;
        } else {
          const payload = (await entRes.json()) as { packages?: TeacherPackageDto[] };
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
            packages?: TeacherPlannedPackageDto[];
          };
          nextPlanned = Array.isArray(payload.packages) ? payload.packages : [];
        }
      }

      setPackages(nextEnt);
      setPlannedPackages(nextPlanned);
      setError(hadHardError ? t("teacherPackagesLoadError") : null);
    } catch {
      setError(t("teacherPackagesLoadError"));
      setPackages([]);
      setPlannedPackages([]);
    } finally {
      setLoading(false);
    }
  }, [uiEnabled, entitlementsUiEnabled, plannedUiEnabled, user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const { active, past } = useMemo(() => {
    const activeList: TeacherPackageDto[] = [];
    const pastList: TeacherPackageDto[] = [];
    for (const pkg of packages) {
      if (pkg.package.status === "active" && pkg.package.remainingSessions > 0) {
        activeList.push(pkg);
      } else {
        pastList.push(pkg);
      }
    }
    return { active: activeList, past: pastList };
  }, [packages]);

  const { plannedActive, plannedPast } = useMemo(() => {
    const activeList: TeacherPlannedPackageDto[] = [];
    const pastList: TeacherPlannedPackageDto[] = [];
    for (const pkg of plannedPackages) {
      if (
        pkg.status === "completed" ||
        pkg.status === "transfer_sent" ||
        pkg.status === "transfer_reversed" ||
        pkg.status === "refund_under_review"
      ) {
        if (pkg.remainingSessionCount === 0) pastList.push(pkg);
        else activeList.push(pkg);
      } else {
        activeList.push(pkg);
      }
    }
    return { plannedActive: activeList, plannedPast: pastList };
  }, [plannedPackages]);

  if (!uiEnabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
        {t("teacherPackagesDisabled")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
        {t("teacherPackagesSignIn")}
      </div>
    );
  }

  const isEmpty =
    packages.length === 0 && plannedPackages.length === 0 && !loading && !error;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8" data-testid="teacher-packages-dashboard">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label={t("back")}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {plannedUiEnabled ? t("teacherPlannedPackagesTitle") : t("teacherPackagesTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            {plannedUiEnabled
              ? t("teacherPlannedPackagesHeading")
              : t("teacherPackagesHeading")}
          </p>
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
          data-testid="teacher-packages-empty"
        >
          <Package className="mx-auto text-teal-700/70" size={36} aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-800">
            {plannedUiEnabled
              ? t("teacherPlannedPackagesEmptyTitle")
              : t("teacherPackagesEmptyTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("teacherPackagesEmptyBody")}
          </p>
          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/teacher/offers"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800"
            >
              {t("teacherPackagesViewOffers")}
            </Link>
            <Link
              href="/teacher/offers"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCEAE3] bg-white px-5 text-sm font-bold text-teal-800 hover:bg-teal-50"
            >
              {t("teacherPackagesCreateOffer")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {plannedUiEnabled && plannedActive.length > 0 ? (
            <section aria-labelledby="teacher-planned-packages-active-heading">
              <h2
                id="teacher-planned-packages-active-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("teacherPlannedPackagesSection")}
              </h2>
              <div className="grid gap-4">
                {plannedActive.map((pkg) => (
                  <TeacherPlannedPackageCard key={pkg.orderId} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {entitlementsUiEnabled && active.length > 0 ? (
            <section aria-labelledby="teacher-packages-active-heading">
              <h2
                id="teacher-packages-active-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("teacherPackagesActiveSection")}
              </h2>
              <div className="grid gap-4">
                {active.map((pkg) => (
                  <TeacherPackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {plannedUiEnabled && plannedPast.length > 0 ? (
            <section aria-labelledby="teacher-planned-packages-past-heading">
              <h2
                id="teacher-planned-packages-past-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("teacherPlannedPackagesPastSection")}
              </h2>
              <div className="grid gap-4">
                {plannedPast.map((pkg) => (
                  <TeacherPlannedPackageCard key={pkg.orderId} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}

          {entitlementsUiEnabled && past.length > 0 ? (
            <section aria-labelledby="teacher-packages-past-heading">
              <h2
                id="teacher-packages-past-heading"
                className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                {t("teacherPackagesPastSection")}
              </h2>
              <div className="grid gap-4">
                {past.map((pkg) => (
                  <TeacherPackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
