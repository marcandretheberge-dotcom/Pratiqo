"use client";

import { useState } from "react";
import { Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Status = "not_started" | "requires_input" | "processing" | "verified" | "failed" | "canceled";

interface Props {
  status: Status;
  failedReason?: string | null;
}

export function IdentityVerificationCard({ status, failedReason }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expirée. Reconnecte-toi.");

      const res = await fetch("/api/stripe/identity/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 503) {
        setError("Stripe Identity n'est pas encore activé. Contacte le support.");
      } else {
        setError(data.error || "Une erreur est survenue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (status === "verified") {
    return (
      <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-green-900">Identité vérifiée ✓</h3>
            <p className="text-sm text-green-800 mt-1">
              Ton identité a été confirmée par Stripe. Le badge « Identité vérifiée » est visible sur ton profil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="rounded-2xl border-2 border-blue-400 bg-blue-50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <div>
            <h3 className="font-bold text-blue-900">Vérification en cours...</h3>
            <p className="text-sm text-blue-800 mt-1">
              On analyse ton document. Ça prend quelques secondes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-900">Vérification échouée</h3>
            <p className="text-sm text-red-800 mt-1">
              {failedReason || "Le document n'a pas pu être vérifié."}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleVerify()}
          disabled={loading}
          className="w-full rounded-xl bg-red-600 px-4 py-3 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Réessayer"}
        </button>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    );
  }

  // not_started, canceled, requires_input, or default
  return (
    <div className="rounded-2xl border-2 border-teal-500 bg-[#F1EFE8] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Shield className="text-teal-700 mt-0.5 shrink-0" size={24} />
        <div>
          <h3 className="font-bold text-lg text-[#2C2C2A]">Vérifie ton identité</h3>
          <p className="text-sm text-[#555550] mt-1">
            Renforce la confiance des élèves. Prend 2 minutes.{" "}
            <strong>Gratuit</strong> — Pratiqo absorbe les frais.
          </p>
        </div>
      </div>

      <ul className="text-sm text-[#555550] space-y-1.5 ml-9">
        <li>✓ Permis de conduire, passeport ou carte d&apos;identité</li>
        <li>✓ Photo en direct (selfie) requise</li>
        <li>✓ Résultat en quelques secondes</li>
        <li>✓ Badge « Identité vérifiée » sur ton profil</li>
      </ul>

      <button
        onClick={() => void handleVerify()}
        disabled={loading}
        className="w-full rounded-xl bg-teal-600 px-4 py-3 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <Loader2 className="animate-spin mx-auto" size={20} />
        ) : (
          "Vérifier mon identité maintenant"
        )}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
