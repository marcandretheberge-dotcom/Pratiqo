"use client";

import React from "react";
import { AppSectionListSkeleton } from "@/components/loading/AppSkeletons";
import {
  PLANNED_PACKAGE_SUPPORT_EMAIL,
  PLANNED_PACKAGE_SUPPORT_MAILTO,
} from "@/lib/offers/plannedPackageDashboardLinks";

export function PlannedPackageLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" data-testid="planned-package-loading">
      <p className="mb-3 text-sm text-slate-600">{label}</p>
      <AppSectionListSkeleton />
    </div>
  );
}

export function PlannedPackageLoadError({
  message,
  hint,
}: {
  message: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      data-testid="planned-package-load-error"
    >
      <p>{message}</p>
      <p className="mt-1 text-xs leading-relaxed">{hint}</p>
      <p className="mt-2 text-xs">
        <a href={PLANNED_PACKAGE_SUPPORT_MAILTO} className="font-semibold underline">
          {PLANNED_PACKAGE_SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}
