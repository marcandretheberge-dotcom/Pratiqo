"use client";

import { CheckCircle2 } from "lucide-react";

/**
 * Compact public identity mark for teacher cards.
 * Never shows source (Stripe vs admin) or bulky “Identité vérifiée” pills.
 */
export function TeacherCardIdentityCheck({
  verified,
  label,
}: {
  verified: boolean;
  label: string;
}) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex shrink-0 text-teal-700"
      title={label}
      data-testid="teacher-card-identity-verified"
    >
      <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
