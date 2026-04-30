"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import type { GroupSessionRow } from "../../../../lib/groupSessions";

type RegRow = {
  id: string;
  status: string;
  session_id: string;
  /** PostgREST may return object or array for `group_sessions(*)` depending on relationship inference. */
  group_sessions: GroupSessionRow | GroupSessionRow[] | null;
};

function sessionFromReg(r: RegRow): GroupSessionRow | null {
  const g = r.group_sessions;
  if (!g) return null;
  return Array.isArray(g) ? (g[0] ?? null) : g;
}

export default function StudentGroupSessionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data, error } = await supabase
        .from("group_registrations")
        .select("id, status, session_id, group_sessions(*)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn(error);
        setRows([]);
      } else {
        setRows((data as unknown as RegRow[]) ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [user?.id]);

  const cancel = async (registrationId: string) => {
    if (!confirm("Annuler cette inscription ?")) return;
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/group-sessions/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ registration_id: registrationId }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error || "Annulation impossible.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== registrationId));
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 text-sm text-slate-600">
        Connecte-toi pour voir tes inscriptions.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#1D9E75]" size={36} />
      </div>
    );
  }

  const upcoming: RegRow[] = [];
  const past: RegRow[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    const s = sessionFromReg(r);
    const d = s?.date;
    if (r.status !== "confirmed") continue;
    if (d && d >= today) upcoming.push(r);
    else past.push(r);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mes cours de groupe</h1>
        <p className="text-sm text-slate-600 mt-2">Inscriptions confirmées et historique.</p>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 mb-4">À venir</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-700">Aucune séance à venir.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((r) => {
              const s = sessionFromReg(r);
              if (!s) return null;
              return (
                <li
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--p-border-light)] bg-white p-4 shadow-sm"
                >
                  <div>
                    <Link href={`/group-sessions/${s.id}`} className="font-bold text-[#0f6d52] hover:underline">
                      {s.title}
                    </Link>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      {s.date} · {s.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancel(r.id)}
                    className="text-xs font-bold text-rose-600 hover:underline shrink-0"
                  >
                    Annuler (&gt;24 h)
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 mb-4">Passées</h2>
        {past.length === 0 ? (
          <p className="text-sm text-slate-700">Aucun historique.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-800">
            {past.map((r) => {
              const s = sessionFromReg(r);
              if (!s) return null;
              return (
                <li key={r.id}>
                  {s.title} — {s.date}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
