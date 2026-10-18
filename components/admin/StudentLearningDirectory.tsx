"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  StudentDirectory, StudentDirectoryFilter, StudentProjectStatus,
} from "@/lib/admin/studentLearningDirectory";

const statuses: Record<StudentProjectStatus, string> = {
  declared: "Besoin enregistré", deferred: "Réponse reportée", unanswered: "Sans réponse",
};
const formats = { in_person: "Sur place", online: "En ligne", both: "Sur place ou en ligne" };
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base";

export function StudentLearningDirectory() {
  const id = useId();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState({ q: "", status: "all" as StudentDirectoryFilter, page: 1 });
  const [directory, setDirectory] = useState<StudentDirectory | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDirectory(null);
    setFailed(false);
    void (async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error("unauthorized");
      const params = new URLSearchParams({ q: query.q, status: query.status, page: String(query.page) });
      const response = await fetch(`/api/admin/learning-project-students?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("directory_unavailable");
      const data = await response.json();
      if (!data.directory || !Array.isArray(data.directory.students)) throw new Error("invalid_response");
      if (!controller.signal.aborted) setDirectory(data.directory);
    })().catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [query, attempt]);

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-xl font-bold">Élèves et projets d’apprentissage</h2>
        <button type="button" onClick={() => setAttempt(value => value + 1)}
          className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-teal-800">Actualiser la liste</button>
      </div>
      <p className="text-sm text-slate-600">
        Tous les comptes élèves, même sans projet. La ville du profil et la ville souhaitée
        pour les cours sont indiquées séparément ; aucune adresse n’est affichée.
      </p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault(); setQuery(current => ({ ...current, q: input.trim(), page: 1 }));
      }}>
        <div className="min-w-0 flex-[2_1_16rem]">
          <label htmlFor={`${id}-search`} className="mb-1 block text-sm font-semibold">Nom, courriel, ville ou matière</label>
          <input id={`${id}-search`} className={field} type="search" maxLength={120}
            value={input} onChange={event => setInput(event.target.value)} placeholder="Ex. : Saint-Georges, piano…" />
        </div>
        <div className="min-w-0 flex-[1_1_12rem]">
          <label htmlFor={`${id}-status`} className="mb-1 block text-sm font-semibold">Réponse au projet</label>
          <select id={`${id}-status`} className={field} value={query.status}
            onChange={event => setQuery(current => ({ ...current, status: event.target.value as StudentDirectoryFilter, page: 1 }))}>
            <option value="all">Tous les élèves</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white" type="submit">Rechercher</button>
        {(query.q || query.status !== "all") && <button type="button" className="min-h-11 px-3 text-sm text-teal-800"
          onClick={() => { setInput(""); setQuery({ q: "", status: "all", page: 1 }); }}>Effacer les filtres</button>}
      </form>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p>La liste des élèves est indisponible. Cela ne signifie pas qu’elle est vide.</p>
          <button type="button" className="mt-2 min-h-11 font-semibold text-teal-800"
            onClick={() => setAttempt(value => value + 1)}>Réessayer la liste</button>
        </div>
      ) : !directory ? <p role="status">Chargement des élèves…</p> : (
        <>
          <p role="status" className="text-sm text-slate-600">
            {directory.total} compte{directory.total !== 1 ? "s" : ""} élève{directory.total !== 1 ? "s" : ""}
            {query.q || query.status !== "all" ? " correspondant aux filtres" : " au total"}
          </p>
          {directory.students.length === 0 ? <p className="rounded-2xl bg-white p-4">Aucun élève sur cette page.</p> : (
            <ul className="space-y-3" aria-label="Liste des élèves">
              {directory.students.map(student => (
                <li key={student.id} className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1.1fr_1fr_1.5fr]">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${encodeURIComponent(student.id)}`} className="flex min-h-11 min-w-0 items-center font-semibold text-teal-800 underline underline-offset-4">
                      <span className="min-w-0 break-words">{student.name || student.email || "Compte élève sans nom"}</span>
                    </Link>
                    {student.email && student.name && <p className="break-words text-sm text-slate-600">{student.email}</p>}
                    {student.inactive && <p className="mt-1 text-xs text-slate-500">Compte inactif ou supprimé</p>}
                  </div>
                  <dl className="min-w-0 text-sm">
                    <dt className="font-semibold">Ville du profil</dt>
                    <dd className="mt-1 break-words text-slate-600">{student.profile_city || "Non renseignée"}</dd>
                    {student.project_city && <>
                      <dt className="mt-2 font-semibold">Ville souhaitée pour les cours</dt>
                      <dd className="mt-1 break-words text-slate-600">{student.project_city}</dd>
                    </>}
                  </dl>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{statuses[student.status]}</p>
                    <p className="mt-1 break-words font-semibold">{student.subject || "Besoin non renseigné"}</p>
                    {student.format && <p className="mt-1 text-sm text-slate-600">
                      {formats[student.format]} · {student.audience === "child" ? "Pour un enfant" : "Pour soi"}
                    </p>}
                    {student.project_updated_at && <p className="mt-2 text-xs text-slate-500">
                      Mis à jour le {new Date(student.project_updated_at).toLocaleDateString("fr-CA", { timeZone: "America/Toronto" })}
                    </p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Pages des élèves" className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" disabled={directory.page <= 1} className="min-h-11 rounded-xl border px-3 py-2 disabled:opacity-40"
              onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))}>Précédente</button>
            <p className="text-sm">Page {directory.page} / {Math.max(1, Math.ceil(directory.total / directory.pageSize))}</p>
            <button type="button" disabled={directory.page * directory.pageSize >= directory.total}
              className="min-h-11 rounded-xl border px-3 py-2 disabled:opacity-40"
              onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))}>Suivante</button>
          </nav>
        </>
      )}
    </section>
  );
}
