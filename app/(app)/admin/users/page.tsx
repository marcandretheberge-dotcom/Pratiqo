"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  TeacherSearchVisibilityBlockerCode,
  TeacherSearchVisibilityWarningCode,
} from "@/lib/teachers/searchVisibilityDiagnostics";
import {
  trackAdminRoleChangeCompleted,
  trackAdminRoleChangeFailed,
  trackAdminRoleChangeStarted,
  trackAdminUsersViewed,
} from "@/lib/analytics/events";

type AdminRole = "student" | "teacher" | "admin";

type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: AdminRole;
  created_at: string | null;
  updated_at: string | null;
  teacher_onboarding_complete: boolean | null;
  teacher_id: string | null;
  teacher_is_public: boolean | null;
  teacher_search_visible: boolean | null;
  teacher_search_visibility_reasons: string[];
  teacher_search_visibility_blockers: TeacherSearchVisibilityBlockerCode[];
  teacher_search_visibility_warnings: TeacherSearchVisibilityWarningCode[];
  teacher_payment_ready: boolean | null;
  teacher_payout_ready: boolean | null;
  companion_chosen: boolean | null;
  deletion_requested_at: string | null;
  is_self: boolean;
};

const ROLE_OPTIONS: Array<{ value: AdminRole; label: string }> = [
  { value: "student", label: "Élève" },
  { value: "teacher", label: "Enseignant" },
  { value: "admin", label: "Admin" },
];

function roleBadge(role: AdminRole) {
  if (role === "admin") {
    return { Icon: ShieldCheck, className: "bg-violet-50 text-violet-800 border-violet-200" };
  }
  if (role === "teacher") {
    return { Icon: GraduationCap, className: "bg-teal-50 text-teal-800 border-teal-200" };
  }
  return { Icon: UserIcon, className: "bg-slate-100 text-slate-700 border-slate-200" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const SEARCH_VISIBILITY_BLOCKER_LABELS: Record<TeacherSearchVisibilityBlockerCode, string> = {
  BLOCKER_TEACHER_ROW_MISSING: "Ligne enseignant manquante",
  BLOCKER_PROFILE_INACTIVE: "Compte masqué ou désactivé",
  BLOCKER_TEACHER_INACTIVE: "Profil enseignant désactivé",
  BLOCKER_DEMO_PROFILE: "Profil démo exclu",
  BLOCKER_INVALID_PUBLIC_IDS: "Identifiants publics invalides",
  BLOCKER_MISSING_SUBJECT: "Discipline manquante",
  BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING: "Identité refusée",
  BLOCKER_BY_RLS_OR_PUBLIC_VIEW: "Absent de la projection publique",
  BLOCKER_MARKETPLACE_OPTED_OUT: "Masqué volontairement du marketplace",
};

const SEARCH_VISIBILITY_WARNING_LABELS: Record<TeacherSearchVisibilityWarningCode, string> = {
  WARNING_PROFILE_NOT_PUBLISHED: "Profil non publié",
  WARNING_MISSING_PUBLIC_DATA: "Données publiques manquantes",
  WARNING_MISSING_BASE_RATE: "Tarif de base manquant",
  WARNING_MISSING_TEACHING_FORMAT: "Format d'enseignement manquant",
  WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE: "Zone publique ou option en ligne manquante",
  WARNING_UNSUPPORTED_COUNTRY: "Pays non ouvert aux professeurs",
  WARNING_IDENTITY_NOT_VERIFIED: "Identité non vérifiée",
  WARNING_NO_AVAILABILITY: "Aucune disponibilité configurée",
  WARNING_NO_INTRO_LESSON: "Aucune leçon intro configurée",
  WARNING_PROFILE_LOW_COMPLETION: "Profil incomplet",
};

function searchVisibilityBlockerLabel(code: TeacherSearchVisibilityBlockerCode): string {
  return SEARCH_VISIBILITY_BLOCKER_LABELS[code] ?? code;
}

function searchVisibilityWarningLabel(code: TeacherSearchVisibilityWarningCode): string {
  return SEARCH_VISIBILITY_WARNING_LABELS[code] ?? code;
}

export default function AdminUsersPage() {
  // The /admin layout already runs requireAdminPage() server-side, so by the
  // time this component renders, the visitor is either an admin or has been
  // redirected. The client-side guard below is a defense-in-depth UX
  // shortcut, not the security boundary.
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const showFlash = useCallback((kind: "ok" | "err", text: string) => {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 5000);
  }, []);

  const load = useCallback(
    async (q?: string) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: sess } = await getSupabaseClient().auth.getSession();
        const token = sess.session?.access_token ?? "";
        const url = q ? `/api/admin/users?q=${encodeURIComponent(q)}` : "/api/admin/users";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = (await res.json().catch(() => ({}))) as {
          users?: AdminUserRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
        setUsers(data.users ?? []);
        // PostHog: precise cohort emit with the rendered row count. We
        // do NOT send emails or names — only the count, mirroring the
        // privacy floor the property sanitizer enforces anyway.
        trackAdminUsersViewed({ rendered_count: (data.users ?? []).length });
      } catch (e) {
        showFlash("err", e instanceof Error ? e.message : "Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, showFlash],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void load(query.trim());
  };

  const changeRole = async (target: AdminUserRow, nextRole: AdminRole) => {
    if (target.role === nextRole) return;
    if (target.is_self) {
      showFlash("err", "Un admin ne peut pas modifier son propre rôle ici.");
      return;
    }

    const previousLabel = ROLE_OPTIONS.find((r) => r.value === target.role)?.label ?? target.role;
    const nextLabel = ROLE_OPTIONS.find((r) => r.value === nextRole)?.label ?? nextRole;
    const confirmed = window.confirm(
      `Changer le rôle de ${target.email ?? target.id} ?\n\n${previousLabel} → ${nextLabel}\n\nCette action est journalisée.`,
    );
    if (!confirmed) return;

    setBusyId(target.id);
    setFlash(null);
    // PostHog: intent emit. Properties carry the role transition only,
    // never the target email or display name. The role-change endpoint
    // already records full forensics in `admin_role_change_audit` server-side.
    trackAdminRoleChangeStarted({
      previous_role: target.role,
      new_role: nextRole,
    });
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId: target.id, role: nextRole }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Mise à jour impossible.");
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: nextRole } : u)),
      );
      showFlash("ok", `Rôle mis à jour pour ${target.email ?? target.id}.`);
      trackAdminRoleChangeCompleted({
        previous_role: target.role,
        new_role: nextRole,
        target_id: target.id,
      });
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : "Mise à jour impossible.");
      // We map exceptions to a small product-shaped reason_code instead
      // of forwarding raw error messages (which could contain server
      // diagnostics, db error text, etc.).
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      let reasonCode = "unknown_error";
      if (message.includes("propre rôle") || message.includes("son propre")) reasonCode = "self_mutation";
      else if (message.includes("rôle invalide") || message.includes("invalid role")) reasonCode = "invalid_role";
      else if (message.includes("introuvable")) reasonCode = "target_not_found";
      else if (message.includes("non authentifié") || message.includes("session invalide")) reasonCode = "auth";
      else if (message.includes("accès refusé") || message.includes("refusé")) reasonCode = "forbidden";
      trackAdminRoleChangeFailed({
        previous_role: target.role,
        new_role: nextRole,
        reason_code: reasonCode,
      });
    } finally {
      setBusyId(null);
    }
  };

  const totals = useMemo(() => {
    const t = { student: 0, teacher: 0, admin: 0 };
    for (const u of users) t[u.role] += 1;
    return t;
  }, [users]);

  if (!user) return null;
  if (!isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          Retour au tableau de bord
        </Link>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Shield size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Espace admin
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">
                Utilisateurs &amp; rôles
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Liste des comptes Pratiqo et modification de rôle. Chaque changement est
                journalisé dans <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">admin_role_change_audit</code>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
                  {users.length} affichés
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                  Élèves: {totals.student}
                </span>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-teal-800">
                  Enseignants: {totals.teacher}
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-800">
                  Admins: {totals.admin}
                </span>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={onSearchSubmit}
          className="flex items-center gap-2 rounded-2xl border border-[#DCEAE3] bg-white p-3 shadow-sm"
        >
          <Search size={18} className="ml-2 shrink-0 text-slate-500" aria-hidden />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par email ou nom…"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            data-testid="admin-users-search-input"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Rechercher
          </button>
        </form>

        {flash ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-medium",
              flash.kind === "ok"
                ? "border-teal-500/25 bg-teal-50 text-teal-800"
                : "border-rose-200 bg-rose-50 text-rose-800",
            )}
            role={flash.kind === "err" ? "alert" : "status"}
          >
            {flash.text}
          </div>
        ) : null}

        <section
          className="overflow-hidden rounded-3xl border border-[#DCEAE3] bg-white shadow-sm"
          data-testid="admin-users-table"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              Chargement…
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Aucun utilisateur correspondant.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Compte</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Profil enseignant</th>
                    <th className="px-4 py-3">Créé</th>
                    <th className="px-4 py-3">Changer le rôle</th>
                    <th className="px-4 py-3">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const { Icon, className } = roleBadge(u.role);
                    const teacherOnboardingDone = u.teacher_onboarding_complete === true;
                    const isBusy = busyId === u.id;
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-slate-100 align-top"
                        data-testid="admin-users-row"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {u.name ?? "—"}
                            {u.is_self ? (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                Toi
                              </span>
                            ) : null}
                            {u.deletion_requested_at ? (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                                <ShieldAlert size={10} aria-hidden /> Suppression demandée
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">{u.email ?? "(sans email)"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
                              className,
                            )}
                          >
                            <Icon size={12} aria-hidden />
                            {ROLE_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {u.role === "teacher" ? (
                            teacherOnboardingDone ? (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 text-teal-700">
                                  <CheckCircle2 size={12} aria-hidden /> Onboarding complet
                                </span>
                                {u.teacher_search_visible ? (
                                  <div className="space-y-1" data-testid="admin-users-teacher-search-visible">
                                    <span className="block rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800">
                                      Visible en recherche
                                    </span>
                                    {u.teacher_search_visibility_warnings.length ? (
                                      <div className="max-w-[280px] space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                          À surveiller
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {u.teacher_search_visibility_warnings.slice(0, 4).map((code) => (
                                            <span
                                              key={code}
                                              title={code}
                                              className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                                            >
                                              {searchVisibilityWarningLabel(code)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div
                                    className="space-y-1"
                                    data-testid="admin-users-teacher-search-hidden"
                                  >
                                    <span className="block rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                                      Non visible en recherche
                                    </span>
                                    {u.teacher_search_visibility_blockers.length ? (
                                      <div className="max-w-[280px] space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                          Blocages
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {u.teacher_search_visibility_blockers.slice(0, 4).map((code) => (
                                            <span
                                              key={code}
                                              title={code}
                                              className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800"
                                            >
                                              {searchVisibilityBlockerLabel(code)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {u.teacher_search_visibility_warnings.length ? (
                                      <div className="max-w-[280px] space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                          À surveiller
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {u.teacher_search_visibility_warnings.slice(0, 4).map((code) => (
                                            <span
                                              key={code}
                                              title={code}
                                              className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                                            >
                                              {searchVisibilityWarningLabel(code)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                                <div className="max-w-[280px] space-y-1" data-testid="admin-users-teacher-payment-statuses">
                                  <span className="block rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700">
                                    Paiements activés: {u.teacher_payment_ready ? "Oui" : "Non"}
                                  </span>
                                  <span className="block rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700">
                                    Versements activés: {u.teacher_payout_ready ? "Oui" : "Non"}
                                  </span>
                                  {u.teacher_search_visible && (!u.teacher_payment_ready || !u.teacher_payout_ready) ? (
                                    <span className="block rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                                      À surveiller: Paiements non configurés
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700">Onboarding en cours</span>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_self ? (
                            <span className="text-xs italic text-slate-400">
                              Action interdite sur ton propre compte.
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={u.role}
                                disabled={isBusy}
                                onChange={(e) =>
                                  void changeRole(u, e.target.value as AdminRole)
                                }
                                aria-label={`Changer le rôle de ${u.email ?? u.id}`}
                                data-testid="admin-users-role-select"
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-wait disabled:opacity-60"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isBusy ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin text-slate-500"
                                  aria-label="Mise à jour…"
                                />
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="text-xs font-semibold text-teal-700 hover:underline"
                            data-testid="admin-users-detail-link"
                          >
                            Voir le profil
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-500">
          Les statistiques de visiteurs et l&apos;analyse produit doivent venir de PostHog/Sentry,
          pas de cette page d&apos;administration.
        </p>
      </div>
    </main>
  );
}
