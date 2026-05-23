"use client";

import React from "react";
import { BadgeCheck, GraduationCap, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { TeacherBadge } from "@/lib/teachers/badges";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

const ICONS = {
  shield: ShieldCheck,
  diploma: GraduationCap,
  sparkles: Sparkles,
  star: Star,
  pro: BadgeCheck,
} as const;

export function TeacherBadgePill({
  badge,
  compact = false,
  className,
}: {
  badge: TeacherBadge;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const Icon = ICONS[badge.icon];
  const label = t(badge.labelKey);
  const description = badge.descriptionKey ? t(badge.descriptionKey) : undefined;

  return (
    <span
      title={description ? `${label} - ${description}` : label}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-semibold leading-none",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        badge.type === "trust" && "border-teal-200 bg-teal-50 text-teal-800",
        badge.type === "marketplace" && "border-amber-200 bg-amber-50 text-amber-800",
        badge.type === "product" && "border-slate-200 bg-slate-100 text-slate-700",
        className,
      )}
    >
      <Icon size={compact ? 11 : 12} className="shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
