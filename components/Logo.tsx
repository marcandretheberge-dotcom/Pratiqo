"use client";

import React from "react";
import Image from "next/image";
import { cn } from "../lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({
  variant = "dark",
  showTagline = true,
  className = "",
  size = "md",
}: LogoProps) {
  const isLight = variant === "light";

  const iconSizes = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-12 h-12 rounded-[14px]",
    lg: "w-16 h-16 rounded-[20px]",
  };

  const textSizes = {
    sm: { main: "text-xl", tagline: "text-[6px]", gap: "gap-2" },
    md: { main: "text-3xl", tagline: "text-[8px]", gap: "gap-4" },
    lg: { main: "text-4xl", tagline: "text-[10px]", gap: "gap-5" },
  };

  const currentText = textSizes[size];
  const taglineMaxWidth =
    size === "sm" ? "max-w-[140px]" : size === "md" ? "max-w-[220px]" : "max-w-[260px]";

  return (
    <div className={cn("flex items-center", currentText.gap, className)}>
      <div
        className={cn(
          "bg-transparent flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/10 overflow-hidden",
          iconSizes[size],
        )}
      >
        <Image
          src="/logo-pratiqo.png"
          alt="Pratiqo"
          width={256}
          height={256}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline leading-none">
          <span
            className={cn(
              "font-bold tracking-tight",
              currentText.main,
              isLight ? "text-white" : "text-[#0F172A]",
            )}
          >
            P
          </span>
          <span
            className={cn(
              "font-medium tracking-tight -ml-0.5",
              currentText.main,
              isLight ? "text-white" : "text-[#0F172A]",
            )}
          >
            ratiqo
          </span>
        </div>
        {showTagline && (
          <div className={cn("mt-2 relative overflow-hidden", taglineMaxWidth)}>
            <p
              className={cn(
                "font-bold uppercase tracking-[0.22em] leading-tight break-words",
                currentText.tagline,
                isLight ? "text-teal-400" : "text-slate-600",
              )}
            >
              APPRENDRE. PRATIQUER. PROGRESSER.
            </p>
            <div
              className={cn(
                "absolute -bottom-1.5 left-0 right-0 h-[1.5px] rounded-full",
                isLight ? "bg-teal-500/30" : "bg-[#1D9E75]/30",
              )}
            />
            <div
              className={cn(
                "absolute -bottom-1.5 left-0 w-1/3 h-[1.5px] rounded-full",
                isLight ? "bg-teal-400" : "bg-[#1D9E75]",
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

