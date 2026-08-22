"use client";

import React from "react";
import Link from "next/link";
import {
  PLANNED_PACKAGE_RESOLUTION_HREF,
  PLANNED_PACKAGE_SUPPORT_EMAIL,
  PLANNED_PACKAGE_SUPPORT_MAILTO,
} from "@/lib/offers/plannedPackageDashboardLinks";

export function PlannedPackageSupportCta({
  message,
  noFinancialAction,
}: {
  message: string;
  noFinancialAction: string;
}) {
  return (
    <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-500" data-testid="planned-package-support-cta">
      <p>{message}</p>
      <p>
        <a
          href={PLANNED_PACKAGE_SUPPORT_MAILTO}
          className="font-semibold text-teal-800 hover:underline"
        >
          {PLANNED_PACKAGE_SUPPORT_EMAIL}
        </a>
        {" · "}
        <Link href={PLANNED_PACKAGE_RESOLUTION_HREF} className="font-semibold text-teal-800 hover:underline">
          /resolution
        </Link>
      </p>
      <p>{noFinancialAction}</p>
    </div>
  );
}
