"use client";

import React, { useMemo, useState } from "react";
import { Check, Star } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";

export default function UpgradePage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => session?.access_token ?? null, [session?.access_token]);

  const startUpgrade = async () => {
    if (!token) {
      alert("Veuillez vous connecter.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Stripe error");
      window.location.href = json.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="ds-label text-[var(--p-text-subtle)]">Monétisation</p>
            <h1 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">Passez à Pro</h1>
            <p className="mt-2 text-[14px] text-[var(--p-text-muted)]">
              Pro: étudiants illimités, 5% de commission, 29$/mois.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-[16px] bg-[rgba(29,158,117,0.12)] text-[#1D9E75] font-medium">
            <Star size={16} /> Pro
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlanCard
            title="Gratuit"
            price="0$"
            items={["Jusqu’à 5 élèves actifs", "10% de commission"]}
            accent="bg-slate-100 text-slate-700"
          />
          <PlanCard
            title="Pro"
            price="29$/mois"
            items={["Élèves illimités", "5% de commission", "Support prioritaire (bientôt)"]}
            accent="bg-[rgba(29,158,117,0.12)] text-[#1D9E75]"
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={startUpgrade}
            disabled={loading}
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-[#1D9E75] text-white hover:brightness-[0.98] disabled:opacity-60"
          >
            {loading ? "Redirection…" : "Passer à Pro"}
          </button>
          <button
            onClick={signOut}
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-white border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  items,
  accent,
}: {
  title: string;
  price: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <span className={`px-3 py-1 rounded-[12px] text-[12px] font-medium ${accent}`}>{title}</span>
        <span className="text-[18px] font-medium text-[var(--p-text)]">{price}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((x) => (
          <div key={x} className="flex items-center gap-2 text-[13px] text-[var(--p-text-muted)]">
            <Check size={16} className="text-[#1D9E75]" />
            <span>{x}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

