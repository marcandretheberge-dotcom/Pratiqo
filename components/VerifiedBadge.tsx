"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";

interface VerifiedBadgeProps {
  /** Whether to render the badge at all. Intended for confirmed identity checks. */
  verified: boolean;
  /** "sm" = icon-only pill, "md" (default) = icon + precise identity label */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Minimal identity-verification badge.
 *
 * Complements the multi-level `VerificationBadge` component. Use this one
 * for compact spaces when the UI needs to say exactly that identity was
 * verified, without implying diploma, background, or payout verification.
 */
export function VerifiedBadge({ verified, size = "md", className }: VerifiedBadgeProps) {
  if (!verified) return null;

  if (size === "sm") {
    return (
      <span
        title="Identite verifiee"
        aria-label="Identite verifiee"
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border border-teal-500/30 bg-teal-50",
          className,
        )}
      >
        <ShieldCheck size={11} className="text-teal-700" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return (
    <span
      title="Identite verifiee par Pratiqo"
      aria-label="Identite verifiee"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-500/30 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700",
        className,
      )}
    >
      <ShieldCheck size={11} strokeWidth={2.5} aria-hidden />
      Identite verifiee
    </span>
  );
}
