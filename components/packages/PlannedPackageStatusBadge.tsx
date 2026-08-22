"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  plannedPackageBadgeTone,
  type PlannedPackageBadgeTone,
} from "@/lib/offers/plannedPackageDashboardUi";

const TONE_CLASS: Record<PlannedPackageBadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-teal-200 bg-teal-50 text-teal-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  review: "border-orange-200 bg-orange-50 text-orange-950",
};

export function PlannedPackageStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const tone = plannedPackageBadgeTone(status);
  return (
    <span
      className={cn(
        "inline-flex max-w-full break-words rounded-full border px-2.5 py-0.5 text-xs font-bold",
        TONE_CLASS[tone],
        className,
      )}
      data-testid="planned-package-status-badge"
      data-status={status}
    >
      {label}
    </span>
  );
}
