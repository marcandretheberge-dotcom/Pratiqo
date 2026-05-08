"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSupabaseClient } from "../../../../lib/supabase";

export default function UpgradeSuccessPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    // We rely on Stripe webhook to flip the plan; this page just prompts the user to refresh.
    const t = setTimeout(() => setStatus("ok"), 600);
    return () => clearTimeout(t);
  }, []);

  const refreshSession = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.refreshSession();
    window.location.href = "/dashboard";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-teal-700" />
          <h1 className="text-2xl font-bold text-slate-900">Paiement reçu</h1>
        </div>
        <p className="text-sm text-slate-600 font-medium">
          Merci! Ton plan Pro sera activé automatiquement dans quelques secondes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={refreshSession}
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-teal-600 text-white hover:brightness-[0.98]"
          >
            Continuer
          </button>
          <Link
            href="/upgrade"
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 flex items-center justify-center"
          >
            Retour
          </Link>
        </div>
        {status === "error" && <p className="text-sm text-rose-600">Une erreur est survenue.</p>}
      </div>
    </div>
  );
}

