"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";

interface VerifiedBadgeProps {
  /** Whether to render the badge at all. Pass `teacher.isVerified || teacher.identityVerified`. */
  verified: boolean;
  /** "sm" = icon-only pill, "md" (default) = icon + "Vérifié" label */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Minimal emerald "Vérifié" badge.
 *
 * Complements the multi-level `VerificationBadge` component. Use this one
 * for compact spaces (teacher cards in search results, profile headers) when
 * you only need a binary "has been verified" signal rather than the full tier.
 *
 * Renders `null` when `verified` is false so callers can use it unconditionally.
 */
export function VerifiedBadge({ verified, size = "md", className }: VerifiedBadgeProps) {
  if (!verified) return null;

  if (size === "sm") {
    return (
      <span
        title="Identité vérifiée"
        aria-label="Identité vérifiée"
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-50 border border-teal-500/30",
          className,
        )}
      >
        <ShieldCheck size={11} className="text-teal-700" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return (
    <span
      title="Identité vérifiée par Pratiqo"
      aria-label="Identité vérifiée"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700 shrink-0",
        className,
      )}
    >
      <ShieldCheck size={11} strokeWidth={2.5} aria-hidden />
      Vérifié
    </span>
  );
}
