"use client";

import React, { useState } from "react";

export function ComingSoonBanner({
  phase,
  featureName,
  description,
  showEmailCapture,
  feature,
}: {
  phase: 2 | 3;
  featureName: string;
  description: string;
  showEmailCapture?: boolean;
  /** Waitlist key sent to `/api/waitlist` (e.g. `group_sessions`). */
  feature: string;
}) {
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
        body: JSON.stringify({ email: email.trim(), feature }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Envoi impossible");
      setMsg("Merci ! Tu seras informé(e) en priorité.");
      setEmail("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const accent =
    phase === 2 ? "from-teal-500/20 to-amber-100/90 border-teal-500/35" : "from-amber-100/90 to-[#534AB7]/15 border-amber-300/60";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-6 sm:p-8 shadow-sm ${accent}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <span className="text-3xl shrink-0" aria-hidden>
          🚀
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-800">Phase {phase}</p>
          <h2 className="text-xl font-bold text-[#2C2C2A]">{featureName}</h2>
          <p className="text-sm text-[#2C2C2A]/85 leading-relaxed">{description}</p>
        </div>
      </div>

      {showEmailCapture ? (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@courriel.com"
            className="flex-1 rounded-xl border border-[#D3D1C7] bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
          />
          <button
            type="button"
            disabled={busy || !email.trim()}
            onClick={() => void submit()}
            className="h-11 shrink-0 rounded-xl bg-teal-700 px-6 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
          >
            {busy ? "…" : "Me notifier"}
          </button>
        </div>
      ) : null}
      {msg ? <p className={`mt-3 text-sm ${msg.includes("Merci") ? "text-teal-800" : "text-rose-700"}`}>{msg}</p> : null}
    </div>
  );
}
