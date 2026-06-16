"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, BadgeCheck, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

// Mirror of the server-side ALLOWED_BADGES set in
// app/api/admin/users/[id]/teacher-badge/route.ts. Kept in lock-step so a
// new admin-toggled badge can be added in one PR by extending both sides.
export type AdminTeacherBadgeKey = "verified_experience";

export type TeacherBadgeStatusRow = {
  key: AdminTeacherBadgeKey;
  active: boolean;
  /** ISO timestamp of the last admin toggle (admin-only). */
  setAt: string | null;
  /** profiles.id of the admin who last toggled it (admin-only). */
  setBy: string | null;
};

type Props = {
  teacherUserId: string;
  initialBadges: TeacherBadgeStatusRow[];
};

const BADGE_LABELS: Record<
  AdminTeacherBadgeKey,
  { title: string; description: string; subtle: string }
> = {
  verified_experience: {
    title: "Expérience vérifiée",
    description:
      "Indique publiquement que l'administration a confirmé l'expérience d'enseignement de ce professeur.",
    subtle:
      "Ne signifie pas certification gouvernementale, vérification de diplôme officiel ou enquête de crédit.",
  },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TeacherBadgesCard({ teacherUserId, initialBadges }: Props) {
  const router = useRouter();
  const [badges, setBadges] = useState<TeacherBadgeStatusRow[]>(initialBadges);
  const [busyKey, setBusyKey] = useState<AdminTeacherBadgeKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callBadgeApi = async (
    key: AdminTeacherBadgeKey,
    method: "POST" | "DELETE",
  ): Promise<{ ok: true; active: boolean; setAt: string | null } | { ok: false; error: string }> => {
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch(`/api/admin/users/${teacherUserId}/teacher-badge`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ badge: key }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        active?: boolean;
        set_at?: string | null;
      };
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Action impossible." };
      }
      return {
        ok: true,
        active: Boolean(data.active),
        setAt: data.set_at ?? null,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Action impossible.",
      };
    }
  };

  const toggle = async (key: AdminTeacherBadgeKey, nextActive: boolean) => {
    const label = BADGE_LABELS[key]?.title ?? key;
    const confirmMessage = nextActive
      ? `Activer le badge « ${label} » pour ce professeur ?\n\nCe badge sera visible publiquement sur sa fiche et ses cartes.`
      : `Désactiver le badge « ${label} » pour ce professeur ?\n\nIl ne sera plus visible publiquement.`;
    if (!window.confirm(confirmMessage)) return;

    setBusyKey(key);
    setError(null);

    const result = await callBadgeApi(key, nextActive ? "POST" : "DELETE");
    if (!result.ok) {
      setError(result.error);
      setBusyKey(null);
      return;
    }

    setBadges((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              active: result.active,
              setAt: result.setAt,
            }
          : row,
      ),
    );
    setBusyKey(null);
    // Refresh the server component so any sibling card that reads
    // verified_experience_active reflects the new state immediately.
    router.refresh();
  };

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="teacher-badges-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <BadgeCheck size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#2C2C2A]">Badges professeur</h2>
          <p className="mt-1 text-xs text-slate-600">
            Ce badge est contrôlé par l&apos;administration. Il ne s&apos;active{" "}
            <strong>pas automatiquement</strong> lorsqu&apos;un professeur téléverse un
            diplôme ou une preuve. L&apos;activation et la désactivation sont
            journalisées.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Cette fiche ne modifie ni le rôle, ni l&apos;abonnement Stripe, ni la
            commission, ni la promotion fondateur, ni l&apos;onboarding professeur.
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-3" data-testid="teacher-badges-list">
        {badges.map((row) => {
          const meta = BADGE_LABELS[row.key];
          const isBusy = busyKey === row.key;
          return (
            <li
              key={row.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              data-testid={`teacher-badge-row-${row.key}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                    <Award size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#2C2C2A]">{meta?.title ?? row.key}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {meta?.description}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{meta?.subtle}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={
                      row.active
                        ? "rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800"
                        : "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
                    }
                    data-testid={`teacher-badge-status-${row.key}`}
                  >
                    {row.active ? "Actif" : "Inactif"}
                  </span>
                  {row.active ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.key, false)}
                      disabled={busyKey !== null}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-50 disabled:opacity-60"
                      data-testid={`teacher-badge-deactivate-${row.key}`}
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
                      Désactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(row.key, true)}
                      disabled={busyKey !== null}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                      data-testid={`teacher-badge-activate-${row.key}`}
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
                      Activer
                    </button>
                  )}
                </div>
              </div>
              {row.active && row.setAt ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  Activé le {formatDateTime(row.setAt)}.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <div
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
          role="alert"
          data-testid="teacher-badges-error"
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}
