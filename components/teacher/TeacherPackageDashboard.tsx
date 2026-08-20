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
import { TeacherPackageCard } from "@/components/teacher/TeacherPackageCard";
import { AppSectionListSkeleton } from "@/components/loading/AppSkeletons";

export function TeacherPackageDashboard() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const uiEnabled = isTeacherPackageVisibilityUiEnabled();
  const [packages, setPackages] = useState<TeacherPackageDto[]>([]);
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
        return;
      }
      const res = await fetch("/api/teacher/packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 400) {
        setPackages([]);
        setError(null);
        return;
      }
      if (!res.ok) {
        setError(t("teacherPackagesLoadError"));
        setPackages([]);
        return;
      }
      const payload = (await res.json()) as { packages?: TeacherPackageDto[] };
      setPackages(Array.isArray(payload.packages) ? payload.packages : []);
    } catch {
      setError(t("teacherPackagesLoadError"));
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [uiEnabled, user, t]);

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
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("teacherPackagesTitle")}</h1>
          <p className="mt-0.5 text-sm text-slate-600">{t("teacherPackagesHeading")}</p>
        </div>
      </div>

      {loading ? (
        <AppSectionListSkeleton />
      ) : error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : packages.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-[#DCEAE3] bg-[#F3FAF6]/60 px-5 py-10 text-center"
          data-testid="teacher-packages-empty"
        >
          <Package className="mx-auto text-teal-700/70" size={36} aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-800">{t("teacherPackagesEmptyTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("teacherPackagesEmptyBody")}</p>
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
          {active.length > 0 ? (
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

          {past.length > 0 ? (
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
