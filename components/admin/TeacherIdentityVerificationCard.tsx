"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  describeStripeIdentityStatus,
  getTeacherIdentityVerificationSource,
  isTeacherIdentityVerified,
  MANUAL_IDENTITY_NOTE_MAX_LENGTH,
} from "@/lib/teachers/identity";

type Props = {
  teacherId: string;
  identityVerified?: boolean | null;
  identityStatus?: string | null;
  stripeIdentityStatus?: string | null;
  identityVerifiedManually?: boolean | null;
  identityVerifiedManuallyAt?: string | null;
  identityManualVerificationNote?: string | null;
};

const STRIPE_LABELS = {
  verified: "vérifiée",
  pending: "en attente",
  requires_input: "action requise",
  failed: "échec",
  not_started: "non commencée",
} as const;

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TeacherIdentityVerificationCard({
  teacherId,
  identityVerified,
  identityStatus,
  stripeIdentityStatus,
  identityVerifiedManually,
  identityVerifiedManuallyAt,
  identityManualVerificationNote,
}: Props) {
  const router = useRouter();
  const [manualVerified, setManualVerified] = useState(Boolean(identityVerifiedManually));
  const [manualAt, setManualAt] = useState(identityVerifiedManuallyAt ?? null);
  const [note, setNote] = useState(identityManualVerificationNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeLabel = STRIPE_LABELS[describeStripeIdentityStatus(stripeIdentityStatus)];
  const effective = isTeacherIdentityVerified({
    identityVerified,
    identityStatus,
    stripeIdentityStatus,
    identityVerifiedManually: manualVerified,
  });
  const source = getTeacherIdentityVerificationSource({
    identityVerified,
    identityStatus,
    stripeIdentityStatus,
    identityVerifiedManually: manualVerified,
  });

  const callApi = async (action: "verify_manually" | "clear_manual_verification") => {
    const confirmMessage = action === "verify_manually"
      ? "Marquer l’identité comme vérifiée manuellement ?\n\nUtilise cette action seulement si l’identité du professeur a été confirmée par Pratiqo hors Stripe. Cette action ne modifie pas Stripe Identity."
      : "Retirer la vérification manuelle d’identité ?\n\nLe statut public reviendra à l’état Stripe Identity. Cette action ne modifie pas Stripe Identity.";
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    setError(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch(`/api/admin/teachers/${teacherId}/identity-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, note }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        identity_verified_manually?: boolean;
        identity_verified_manually_at?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Action impossible.");
        setBusy(false);
        return;
      }
      setManualVerified(Boolean(data.identity_verified_manually));
      setManualAt(data.identity_verified_manually_at ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    }
    setBusy(false);
  };

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="admin-teacher-identity-verification"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-bold text-[#2C2C2A]">Vérification d’identité</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Utilise cette action seulement si l’identité du professeur a été confirmée par Pratiqo hors Stripe. Cette action ne modifie pas Stripe Identity.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="admin-teacher-identity-status">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stripe Identity</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800" data-testid="admin-identity-stripe-status">
            {stripeLabel}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vérification manuelle</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800" data-testid="admin-identity-manual-status">
            {manualVerified ? "vérifiée" : "non vérifiée"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Statut public effectif</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800" data-testid="admin-identity-effective-status">
            {effective ? "vérifiée" : "non vérifiée"}
            {source !== "none" ? (
              <span className="mt-1 block text-xs font-medium text-slate-500">
                Source publique: {source === "stripe_identity" ? "Stripe Identity" : "admin"}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {manualVerified ? (
        <p className="mt-3 text-xs text-slate-500">Dernière vérification manuelle: {formatDateTime(manualAt)}</p>
      ) : null}

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note interne</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, MANUAL_IDENTITY_NOTE_MAX_LENGTH))}
          maxLength={MANUAL_IDENTITY_NOTE_MAX_LENGTH}
          rows={3}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
          placeholder="Visible uniquement par les admins"
          data-testid="admin-identity-manual-note"
        />
      </label>

      {error ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || manualVerified}
          onClick={() => void callApi("verify_manually")}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white hover:bg-[#0B5845] disabled:opacity-50"
          data-testid="admin-identity-verify-manually"
        >
          {busy ? <Loader2 size={16} className="mr-2 animate-spin" aria-hidden /> : null}
          Marquer l’identité comme vérifiée manuellement
        </button>
        <button
          type="button"
          disabled={busy || !manualVerified}
          onClick={() => void callApi("clear_manual_verification")}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          data-testid="admin-identity-clear-manual"
        >
          Retirer la vérification manuelle
        </button>
      </div>
    </section>
  );
}
