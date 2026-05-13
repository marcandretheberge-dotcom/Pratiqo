"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { CATEGORIES } from "../../../../lib/disciplineCategories";
import type { Discipline } from "../../../../types";
import { cn } from "../../../../lib/utils";
import { isEnabled } from "../../../../lib/features";
import {
  GROUP_SESSION_STATUS_LABELS,
  planAllowsGroupSessions,
  spotsRemaining,
  type GroupSessionRow,
} from "../../../../lib/groupSessions";

const DURATIONS = [30, 45, 60, 90, 120] as const;
const RECURRENCE_OPTIONS = [
  { value: "", label: "Aucune" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "biweekly", label: "Bi-mensuel" },
  { value: "monthly", label: "Mensuel" },
] as const;

export default function TeacherGroupSessionsPage() {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GroupSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GroupSessionRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const [{ data: prof }, { data: trow }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    setPlan((prof as { plan?: string } | null)?.plan ?? null);
    const tid = (trow as { id?: string } | null)?.id ?? null;
    setTeacherId(tid);
    if (!tid) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("group_sessions")
      .select("*")
      .eq("teacher_id", tid)
      .order("date", { ascending: true });
    setSessions((data as GroupSessionRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const proOk = planAllowsGroupSessions(plan ?? profile?.plan);

  if (!isEnabled("group_sessions")) {
    return (
      <div className="max-w-4xl mx-auto">
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🚀</p>
          <p style={{ fontSize: "16px", margin: "0 0 8px", fontWeight: 600, color: "var(--p-text, #2C2C2A)" }}>
            Cours de groupe — bientôt disponibles
          </p>
          <p style={{ fontSize: "14px", margin: 0, color: "#6B6A65", lineHeight: 1.5, maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
            Tu pourras bientôt créer des séances collectives depuis cet espace. Merci de ta patience !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="ds-label text-[var(--p-text-subtle)]">Professeur</p>
          <h1 className="text-3xl font-bold text-[var(--p-text)]">Cours de groupe</h1>
          <p className="text-sm text-[var(--p-text-muted)] mt-2">
            Crée des séances collectives visibles sur la marketplace.
          </p>
        </div>
        {proOk && teacherId ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold text-white bg-teal-600 hover:brightness-[0.98] shadow-sm"
          >
            <Plus size={18} /> Nouvelle séance
          </button>
        ) : null}
      </div>

      {!proOk ? (
        <div
          className="rounded-2xl border-l-4 border-amber-500 px-5 py-4 text-sm"
          style={{ backgroundColor: "var(--p-watch-bg)", borderLeftColor: "var(--p-watch-border)" }}
        >
          <p className="font-bold text-[var(--p-text)]">Les cours de groupe sont disponibles avec le plan Pro ou Entreprise.</p>
          <p className="text-[var(--p-text-muted)] mt-2">
            Passe à un plan supérieur pour publier des séances et gérer les inscriptions.
          </p>
          <Link href="/upgrade" className="inline-block mt-3 text-sm font-semibold text-teal-700 hover:underline">
            Voir les offres →
          </Link>
        </div>
      ) : null}

      {!teacherId && !loading ? (
        <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6 text-sm text-[var(--p-text-muted)]">
          Aucune fiche professeur liée à ton compte. Les séances de groupe sont associées à{" "}
          <code className="text-xs bg-[var(--color-background-secondary)] px-1 rounded">teachers.user_id</code>.
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-700" size={36} />
        </div>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => {
            const rem = spotsRemaining(s);
            const pct = s.max_participants ? (Number(s.current_participants) / Number(s.max_participants)) * 100 : 0;
            const statusLabel = GROUP_SESSION_STATUS_LABELS[s.status] ?? s.status;
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--p-text)] truncate">{s.title}</h2>
                      <span className="badge-teal">{s.discipline}</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          s.status === "open" && "bg-teal-500/15 text-teal-700",
                          s.status === "full" && "bg-amber-100 text-amber-900",
                          s.status === "cancelled" && "bg-slate-200 text-slate-700",
                        )}
                      >
                        {statusLabel}
                      </span>
                      {s.is_recurring ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                          Récurrent
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--p-text-muted)] mt-1">
                      {s.date} · {s.time} · {s.duration_minutes} min ·{" "}
                      {s.teaching_mode === "online" ? "En ligne" : "En personne"}
                    </p>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-semibold text-[var(--p-text-muted)] mb-1">
                        <span>
                          Participants {Number(s.current_participants)}/{Number(s.max_participants)}
                        </span>
                        <span>{rem} place(s) restante(s)</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--color-background-secondary)] overflow-hidden border border-[var(--p-border-light)]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 100 ? "bg-amber-500" : "bg-teal-600",
                          )}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-teal-700 mt-3">
                      {Number(s.price_per_person).toFixed(0)} $ CAD / pers.
                    </p>
                  </div>
                  {proOk ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s);
                          setModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-[var(--p-border-light)] text-[var(--p-text-muted)] hover:text-teal-700 hover:border-teal-500/40"
                        title="Modifier"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Annuler cette séance ?")) return;
                          const supabase = getSupabaseClient();
                          await supabase.from("group_sessions").update({ status: "cancelled" }).eq("id", s.id);
                          void load();
                        }}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Annuler"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && sessions.length === 0 && teacherId && proOk ? (
        <p className="text-center text-sm text-[var(--p-text-muted)] py-8">Aucune séance pour l’instant.</p>
      ) : null}

      {modalOpen && teacherId && proOk ? (
        <SessionModal
          key={editing?.id ?? "new"}
          teacherId={teacherId}
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function SessionModal({
  teacherId,
  initial,
  onClose,
  onSaved,
}: {
  teacherId: string;
  initial: GroupSessionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [discipline, setDiscipline] = useState((initial?.discipline as Discipline) ?? "Musique");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [maxP, setMaxP] = useState(initial?.max_participants ?? 10);
  const [minP, setMinP] = useState(initial?.min_participants ?? 2);
  const [price, setPrice] = useState(Number(initial?.price_per_person ?? 25));
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "10:00");
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [mode, setMode] = useState<"person" | "online">(initial?.teaching_mode === "online" ? "online" : "person");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [onlineLink, setOnlineLink] = useState(initial?.online_link ?? "");
  const [recurring, setRecurring] = useState(Boolean(initial?.is_recurring));
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const supabase = getSupabaseClient();
    const row = {
      teacher_id: teacherId,
      title: title.trim() || "Séance de groupe",
      description: description.trim() || null,
      discipline,
      max_participants: Math.max(2, maxP),
      min_participants: Math.max(1, Math.min(minP, maxP)),
      price_per_person: Math.max(0, price),
      date,
      time,
      duration_minutes: duration,
      location: mode === "person" ? location.trim() || null : null,
      online_link: mode === "online" ? onlineLink.trim() || null : null,
      teaching_mode: mode,
      is_recurring: recurring,
      recurrence: recurring && recurrence ? recurrence : null,
      status: "open" as const,
    };

    if (initial?.id) {
      const { error } = await supabase
        .from("group_sessions")
        .update({
          ...row,
          current_participants: initial.current_participants,
        })
        .eq("id", initial.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from("group_sessions").insert({ ...row, current_participants: 0 });
      if (error) alert(error.message);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div className="relative bg-[var(--p-surface)] rounded-3xl border border-[var(--p-border-light)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[var(--p-border-light)] bg-[var(--p-surface)]">
          <h3 className="font-bold text-lg">{initial ? "Modifier la séance" : "Nouvelle séance"}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-background-secondary)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--p-text)]">Titre</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 bg-[var(--p-surface)]" />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--p-text)]">Discipline</span>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
              className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 bg-[var(--p-surface)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--p-text)]">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2 bg-[var(--p-surface)] resize-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-semibold">Places max</span>
              <input
                type="number"
                min={2}
                value={maxP}
                onChange={(e) => setMaxP(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold">Places min</span>
              <input
                type="number"
                min={1}
                value={minP}
                onChange={(e) => setMinP(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-semibold">Prix par personne ($)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--p-border-light)] px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-semibold">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="space-y-1">
              <span className="font-semibold">Heure</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-semibold">Durée (min)</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("person")}
              className={cn(
                "flex-1 py-2 rounded-xl border text-xs font-bold",
                mode === "person" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-[var(--p-border-light)]",
              )}
            >
              En personne
            </button>
            <button
              type="button"
              onClick={() => setMode("online")}
              className={cn(
                "flex-1 py-2 rounded-xl border text-xs font-bold",
                mode === "online" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-[var(--p-border-light)]",
              )}
            >
              En ligne
            </button>
          </div>
          {mode === "person" ? (
            <label className="block space-y-1">
              <span className="font-semibold">Lieu</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="font-semibold">Lien visio</span>
              <input value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </label>
          )}
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded accent-teal-500" />
            Séance récurrente
          </label>
          {recurring ? (
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="w-full h-11 rounded-2xl font-semibold text-white bg-teal-600 hover:brightness-[0.98] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
