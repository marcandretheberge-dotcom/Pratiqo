"use client";

import React from "react";
import { cn } from "../lib/utils";
import type { VerificationLevel } from "../lib/verification";
import { VERIFICATION_LEVELS } from "../lib/verification";

export function VerificationBadge({
  level,
  size = "md",
  showLabel = true,
  className,
}: {
  level: VerificationLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const info = VERIFICATION_LEVELS[level];
  const tooltip = `${info.label} — ${info.description}`;

  if (size === "lg") {
    const dark = level === 4;
    return (
      <div
        className={cn(
          "rounded-2xl border p-5 shadow-sm",
          dark ? "border-white/20" : "border-[#E8E6DF]",
          className,
        )}
        style={{ backgroundColor: info.bgColor }}
        title={tooltip}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl px-2 text-lg font-bold shadow-sm"
            style={{
              backgroundColor: dark ? "rgba(255,255,255,0.12)" : info.bgColor,
              color: info.color,
              border: `1px solid ${dark ? "rgba(255,255,255,0.35)" : `${info.color}33`}`,
            }}
          >
            {info.badge}
          </span>
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-wide", dark ? "text-white/80" : "")} style={dark ? undefined : { color: info.color }}>
              Vérification Pratiqo
            </p>
            <p className={cn("text-lg font-bold", dark ? "text-white" : "text-[#2C2C2A]")}>{info.label}</p>
            <p className={cn("text-sm", dark ? "text-white/85" : "text-[#2C2C2A]/80")}>{info.description}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {info.perks.map((p) => (
            <li
              key={p}
              className={cn("flex items-start gap-2 text-sm font-medium", dark ? "text-white/95" : "text-[#2C2C2A]")}
            >
              <span className={cn("mt-0.5", dark ? "text-[#B8F5DC]" : "text-[#1D9E75]")}>✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span
        title={tooltip}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 border",
          showLabel ? "gap-1 px-2 py-0.5 text-[10px]" : "h-6 w-6 p-0 text-[11px]",
          className,
        )}
        style={{
          backgroundColor: info.bgColor,
          color: info.color,
          borderColor: `${info.color}40`,
        }}
      >
        <span aria-hidden>{info.badge}</span>
        {showLabel ? <span className="max-w-[140px] truncate">{info.label}</span> : null}
      </span>
    );
  }

  // md
  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border shrink-0",
        className,
      )}
      style={{
        backgroundColor: info.bgColor,
        color: info.color,
        borderColor: `${info.color}40`,
      }}
    >
      <span aria-hidden>{info.badge}</span>
      {showLabel ? info.label : null}
    </span>
  );
}
