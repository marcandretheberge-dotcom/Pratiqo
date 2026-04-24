"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { isEnabled } from "../../../lib/features";

export default function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const startUpgrade = async () => {
    if (!legalAccepted) {
      alert("Tu dois accepter les CGU et la politique de confidentialité.");
      return;
    }
    if (!user) {
      alert("Veuillez vous connecter.");
      return;
    }
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    if (!token) {
      alert("Session expirée. Reconnecte-toi.");
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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          {!isEnabled("enterprise_plan") ? <LockedEnterprisePlanCard /> : null}
        </div>

        <label className="mt-8 flex items-start gap-3 text-[13px] text-[var(--p-text-muted)] cursor-pointer max-w-xl">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75]"
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/legal/cgu" className="text-[#1D9E75] underline font-medium">
              CGU
            </Link>{" "}
            et la{" "}
            <Link href="/legal/confidentialite" className="text-[#1D9E75] underline font-medium">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={startUpgrade}
            disabled={loading || !legalAccepted}
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

function LockedEnterprisePlanCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), feature: "enterprise_plan" }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Envoi impossible");
      setMsg("Merci ! On te préviendra au lancement.");
      setEmail("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-slate-300 bg-slate-50/60 p-6 opacity-95">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-[12px] bg-slate-200/90 px-3 py-1 text-[12px] font-medium text-slate-700">Entreprise</span>
        <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
          Phase 2
        </span>
      </div>
      <p className="mt-4 text-[13px] text-slate-600 leading-relaxed">
        Carte studio, visibilité renforcée et outils dédiés aux structures — réservé au plan Entreprise.
      </p>
      <ul className="mt-4 space-y-2">
        {["Page profil avancée", "Cours de groupe prioritaires", "Support dédié"].map((x) => (
          <div key={x} className="flex items-center gap-2 text-[13px] text-slate-500">
            <Check size={16} className="text-slate-400" />
            <span>{x}</span>
          </div>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className="mt-6 h-11 w-full rounded-[22px] border border-slate-300 bg-white text-sm font-semibold text-slate-500 cursor-not-allowed"
      >
        Bientôt disponible
      </button>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">Être notifié du lancement</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@courriel.com"
          className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void submit()}
          className="h-11 shrink-0 rounded-xl border border-slate-400 bg-slate-700 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "…" : "Me notifier"}
        </button>
      </div>
      {msg ? (
        <p className={`mt-3 text-sm ${msg.startsWith("Merci") ? "text-[#085041]" : "text-rose-700"}`}>{msg}</p>
      ) : null}
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

