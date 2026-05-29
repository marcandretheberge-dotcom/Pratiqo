"use client";

import React from "react";
import { Building2, Star } from "lucide-react";
import { cn } from "../lib/utils";
import { useLocale } from "@/lib/locale-context";
import { MEMBRE_PRO_BRAND_BY_LOCALE } from "@/lib/config/membrePro";

export function PlanBadge({ plan }: { plan: "free" | "pro" | "enterprise" | string | null | undefined }) {
  const { locale, t } = useLocale();
  const p = String(plan || "free").toLowerCase();
  const normalized = p === "enterprise" ? "enterprise" : p === "pro" ? "pro" : "free";

  if (normalized === "enterprise") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1 rounded-[10px] text-[11px] font-medium",
          "bg-slate-900 text-white",
        )}
        title={t("planBadgeEnterprise")}
      >
        <Building2 size={12} />
        {t("planBadgeEnterprise")}
      </span>
    );
  }
  if (normalized === "pro") {
    const proLabel = MEMBRE_PRO_BRAND_BY_LOCALE[locale];
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1 rounded-[10px] text-[11px] font-medium",
          "bg-teal-500/15 text-teal-700",
        )}
        title={proLabel}
      >
        <Star size={12} />
        {proLabel}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-[10px] text-[11px] font-medium bg-slate-100 text-slate-600"
      title={t("planBadgeFree")}
    >
      {t("planBadgeFree")}
    </span>
  );
}

