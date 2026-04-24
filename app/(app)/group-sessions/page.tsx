"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, UsersRound } from "lucide-react";
import { getSupabaseClient } from "../../../lib/supabase";
import { CATEGORIES } from "../../../constants";
import type { Discipline } from "../../../types";
import { cn } from "../../../lib/utils";
import { isSessionBookable, spotsRemaining, type GroupSessionRow } from "../../../lib/groupSessions";

type RowWithTeacher = GroupSessionRow & { teachers?: { name: string; image_url: string } | null };

export default function GroupSessionsMarketplacePage() {
  const [rows, setRows] = useState<RowWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [discipline, setDiscipline] = useState<Discipline | "All">("All");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState(500);
  const [dateFrom, setDateFrom] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data, error } = await supabase
        .from("group_sessions")
        .select("*, teachers(name, image_url)")
        .in("status", ["open", "full"])
        .order("date", { ascending: true });
      if (error) {
        console.warn(error);
        setRows([]);
      } else {
        setRows((data as RowWithTeacher[]) ?? []);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (discipline !== "All" && r.discipline !== discipline) return false;
      if (Number(r.price_per_person) > priceMax) return false;
      if (dateFrom && r.date < dateFrom) return false;
      const q = search.toLowerCase();
      if (q) {
        const name = r.teachers?.name?.toLowerCase() ?? "";
        if (!r.title.toLowerCase().includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [rows, discipline, search, priceMax, dateFrom]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">Marketplace</p>
        <h1 className="text-3xl font-bold text-[var(--p-text)]">Cours de groupe</h1>
        <p className="text-sm text-[var(--p-text-muted)] mt-2">
          Réserve ta place pour une séance collective avec un professeur vérifié.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="text-xs font-bold uppercase text-[var(--p-text-subtle)] block">
          Recherche
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titre ou prof…"
            className="mt-1 w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold uppercase text-[var(--p-text-subtle)] block">
          Discipline
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline | "All")}
            className="mt-1 w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 text-sm font-normal bg-[var(--p-surface)]"
          >
            <option value="All">Toutes</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-[var(--p-text-subtle)] block">
          À partir du
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold uppercase text-[var(--p-text-subtle)] block">
          Prix max / pers. ({priceMax}$)
          <input
            type="range"
            min={10}
            max={500}
            step={5}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="mt-2 w-full accent-[#1D9E75]"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#1D9E75]" size={36} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-[var(--p-text-muted)] py-16">Aucune séance ne correspond à tes filtres.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <GroupMarketCard key={s.id} session={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupMarketCard({ session }: { session: RowWithTeacher }) {
  const rem = spotsRemaining(session);
  const max = Number(session.max_participants);
  const cur = Number(session.current_participants);
  const ratio = max ? rem / max : 0;
  const barColor = ratio > 0.5 ? "bg-[#1D9E75]" : ratio < 0.25 ? "bg-amber-500" : "bg-amber-400";
  const bookable = isSessionBookable(session);

  return (
    <li className="ds-card p-5 flex flex-col gap-4 border-2 border-[var(--p-light-teal-bg)] hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3">
        <img
          src={session.teachers?.image_url || "https://picsum.photos/seed/group/80/80"}
          alt=""
          className="w-12 h-12 rounded-xl object-cover border border-[var(--p-border-light)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
              <UsersRound size={12} /> Groupe
            </span>
            <span className="badge-teal">{session.discipline}</span>
          </div>
          <p className="text-xs text-[var(--p-text-muted)] mt-1 truncate">{session.teachers?.name ?? "Professeur"}</p>
          <h2 className="text-lg font-bold text-[var(--p-text)] leading-snug mt-1">{session.title}</h2>
        </div>
      </div>
      <p className="text-sm text-[var(--p-text-muted)]">
        {session.date} · {session.time} · {session.duration_minutes} min
      </p>
      <div>
        <div className="flex justify-between text-[11px] font-semibold text-[var(--p-text-muted)] mb-1">
          <span>Places restantes</span>
          <span>
            {rem}/{max}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-background-secondary)] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${max ? (rem / max) * 100 : 0}%` }} />
        </div>
      </div>
      <p className="text-xl font-bold text-[#1D9E75]">{Number(session.price_per_person).toFixed(0)} $ / pers.</p>
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href={`/group-sessions/${session.id}`}
          className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-[#1D9E75] text-white hover:brightness-[0.98]"
        >
          Détails
        </Link>
        {bookable ? (
          <Link
            href={`/group-sessions/${session.id}`}
            className="w-full text-center py-2.5 rounded-xl text-sm font-bold border-2 border-[#1D9E75] text-[#0f6e56] hover:bg-[#E1F5EE]"
          >
            Réserver ma place
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full text-center py-2.5 rounded-xl text-sm font-bold border border-amber-300 text-amber-900/80 bg-amber-50 cursor-not-allowed"
          >
            Complet — liste d&apos;attente bientôt
          </button>
        )}
      </div>
    </li>
  );
}
