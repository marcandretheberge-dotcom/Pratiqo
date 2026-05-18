"use client";

import { cn } from "@/lib/utils";

export function CompanionProgressBar({
  value,
  label,
  tone = "teal",
}: {
  value: number;
  label: string;
  tone?: "teal" | "light";
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className={cn("h-3 overflow-hidden rounded-full", tone === "light" ? "bg-white/20" : "bg-emerald-50")}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out will-change-[width]",
          tone === "light" ? "bg-white shadow-[0_0_24px_rgba(255,255,255,0.5)]" : "bg-[#1D9E75]",
        )}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
