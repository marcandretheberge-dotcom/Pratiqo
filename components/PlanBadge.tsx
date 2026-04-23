"use client";

import React from "react";
import { Star } from "lucide-react";
import { cn } from "../lib/utils";

export function PlanBadge({ plan }: { plan: "free" | "pro" | string | null | undefined }) {
  const normalized = plan === "pro" ? "pro" : "free";
  if (normalized === "pro") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1 rounded-[10px] text-[11px] font-medium",
          "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]",
        )}
        title="Plan Pro"
      >
        <Star size={12} />
        Pro
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-[10px] text-[11px] font-medium bg-slate-100 text-slate-600"
      title="Plan Gratuit"
    >
      Gratuit
    </span>
  );
}

