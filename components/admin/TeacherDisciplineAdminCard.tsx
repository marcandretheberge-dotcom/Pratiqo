"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ADMIN_TEACHER_DISCIPLINE_OPTIONS,
  type AdminTeacherDisciplineId,
} from "@/lib/teachers/adminDiscipline";

type Props = {
  targetUserId: string;
  initialDiscipline: string | null;
  initialCategory: string | null;
};

export function TeacherDisciplineAdminCard({
  targetUserId,
  initialDiscipline,
  initialCategory,
}: Props) {
  const [disciplineId, setDisciplineId] = useState<AdminTeacherDisciplineId | "">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [currentDiscipline, setCurrentDiscipline] = useState(initialDiscipline ?? "—");
  const [currentCategory, setCurrentCategory] = useState(initialCategory ?? "—");

  const save = async () => {
    if (!disciplineId) {
      setMessage({ kind: "err", text: "Choisis une discipline." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setMessage({ kind: "err", text: "Session expirée. Reconnecte-toi." });
        return;
      }
      const res = await fetch(`/api/admin/users/${targetUserId}/teacher-discipline`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disciplineId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        discipline?: string;
        category?: string;
      };
      if (!res.ok) {
        setMessage({ kind: "err", text: json.error || "Impossible d’enregistrer la discipline." });
        return;
      }
      setCurrentDiscipline(json.discipline ?? currentDiscipline);
      setCurrentCategory(json.category ?? currentCategory);
      setMessage({ kind: "ok", text: "Discipline mise à jour." });
    } catch {
      setMessage({ kind: "err", text: "Impossible d’enregistrer la discipline." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="admin-teacher-discipline-card"
    >
      <h2 className="text-sm font-bold text-slate-900">Discipline publique</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Corrige la matière affichée en recherche et sur la fiche. Cette valeur est la source de vérité
        publique (pas un libellé admin seul).
      </p>
      <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-500">Discipline actuelle</dt>
          <dd className="mt-0.5" data-testid="admin-teacher-discipline-current">
            {currentDiscipline || "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Catégorie actuelle</dt>
          <dd className="mt-0.5" data-testid="admin-teacher-category-current">
            {currentCategory || "—"}
          </dd>
        </div>
      </dl>
      <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="admin-teacher-discipline">
        Nouvelle discipline
      </label>
      <select
        id="admin-teacher-discipline"
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        value={disciplineId}
        onChange={(e) => setDisciplineId(e.target.value as AdminTeacherDisciplineId | "")}
        data-testid="admin-teacher-discipline-select"
      >
        <option value="">Choisir…</option>
        {ADMIN_TEACHER_DISCIPLINE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.labelFr}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !disciplineId}
        className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        data-testid="admin-teacher-discipline-save"
      >
        {saving ? "Enregistrement…" : "Enregistrer la discipline"}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs font-medium ${message.kind === "ok" ? "text-teal-800" : "text-rose-700"}`}
          data-testid="admin-teacher-discipline-message"
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
