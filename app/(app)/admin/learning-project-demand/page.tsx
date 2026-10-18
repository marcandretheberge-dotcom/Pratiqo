"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { StudentLearningDirectory } from "@/components/admin/StudentLearningDirectory";
import type {
  DemandSupply,
  LearningProjectOverview,
} from "@/lib/admin/learningProjectDemand";

const supplyLabels: Record<DemandSupply, string> = {
  local: "Offre locale correspondante",
  online: "Offre en ligne correspondante",
  none: "Aucune offre correspondante trouvée",
  unclassified: "Matière ou ville à préciser",
  unavailable: "Offre impossible à vérifier actuellement",
};
const formats = {
  in_person: "Sur place",
  online: "En ligne",
  both: "Sur place ou en ligne",
};

export default function LearningProjectDemandPage() {
  const [overview, setOverview] = useState<LearningProjectOverview | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setOverview(null);
    void (async () => {
      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error("unauthorized");
      const response = await fetch("/api/admin/learning-project-demand", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("overview_unavailable");
      const data = await response.json();
      if (!controller.signal.aborted) setOverview(data.overview);
    })().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700"
      >
        Retour au centre de contrôle
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Élèves et besoins d’apprentissage</h1>
        <p className="mt-2 text-sm text-slate-600">
          Projets actuels déclarés par les comptes élèves. Un compte correspond
          à un seul projet principal ; ces chiffres ne mesurent ni les visites
          ni le nombre d’enfants.
        </p>
      </header>
      <StudentLearningDirectory />
      <details className="rounded-2xl border border-slate-200 p-4">
      <summary className="min-h-11 cursor-pointer font-bold">Synthèse de la demande et offre de professeurs</summary>
      {failed ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
        >
          <p>
            Le suivi est indisponible. Aucune conclusion sur la demande ne peut
            être tirée.
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-teal-800"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      ) : !overview ? (
        <p role="status">Chargement des besoins…</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Comptes élèves inscrits", overview.totalAccounts],
                ["Besoin enregistré", overview.declaredAccounts],
                ["Réponse reportée", overview.deferredAccounts],
                ["Sans réponse enregistrée", overview.unansweredAccounts],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-slate-600">
            L’offre correspondante inclut les profs acceptant une demande ou une
            réservation. Elle est vérifiée au chargement ; un paiement ou un
            créneau précis reste à confirmer dans le parcours habituel.
          </p>
          <h2 className="text-lg font-bold">
            Demande par matière, ville et format
          </h2>
          {overview.groups.length === 0 ? (
            <p className="rounded-2xl bg-white p-4">
              Aucun projet n’a encore été enregistré. Cela ne signifie pas qu’il
              n’existe aucune demande.
            </p>
          ) : (
            <ul className="space-y-3">
              {overview.groups.map((group, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words font-bold">{group.subject}</h3>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {group.city || "Ville non requise"} ·{" "}
                        {formats[group.format]} ·{" "}
                        {group.audience === "child"
                          ? "Pour un enfant"
                          : "Pour soi"}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {group.account_count} compte
                      {group.account_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <p
                    className={`mt-3 text-sm ${group.supply === "none" ? "font-semibold text-amber-800" : "text-slate-600"}`}
                  >
                    {supplyLabels[group.supply]}
                    {group.matchingTeachers !== null &&
                    group.matchingTeachers > 0
                      ? ` · ${group.matchingTeachers} prof(s)`
                      : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Dernière déclaration :{" "}
                    {new Date(group.updated_at).toLocaleDateString("fr-CA", {
                      timeZone: "America/Toronto",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      </details>
    </main>
  );
}
