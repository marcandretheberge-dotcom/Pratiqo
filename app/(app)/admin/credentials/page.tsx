"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ── Types returned by GET /api/admin/review ───────────────────────────────────

type PendingDiploma = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  diplomaPath: string;
  signedUrl: string | null;
  verificationLevel: number | null;
  identityVerified: boolean;
  stripeIdentityStatus: string | null;
};

type PendingCredential = {
  credentialId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  type: string;
  title: string;
  institutionName: string | null;
  country: string | null;
  issuedYear: number | null;
  verificationMethod: string | null;
  publicLabel: string | null;
  createdAt: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function credentialTypeLabel(type: string): string {
  const map: Record<string, string> = {
    degree: "Diplôme",
    certificate: "Certificat",
    license: "Licence",
    experience: "Expérience",
    portfolio: "Portfolio",
  };
  return map[type] ?? type;
}

function credentialMethodLabel(method: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    mycreds: "MyCreds",
    document_review: "Révision document",
    institution_direct: "Institution directe",
    official_registry: "Registre officiel",
    reference_check: "Références",
    manual: "Manuel",
  };
  return map[method] ?? method;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCredentialsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [diplomas, setDiplomas] = useState<PendingDiploma[]>([]);
  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Role guard — middleware already checks for auth cookie; this checks for admin role.
  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const showFlash = (kind: "ok" | "err", text: string) => {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 5000);
  };

  const load = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch("/api/admin/review", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        diplomas?: PendingDiploma[];
        credentials?: PendingCredential[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setDiplomas(data.diplomas ?? []);
      setCredentials(data.credentials ?? []);
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (params: {
    kind: "diploma" | "credential";
    action: "approve" | "reject";
    teacherId?: string;
    credentialId?: string;
    publicLabel?: string;
    confidenceLevel?: string;
    reviewerNotes?: string;
  }) => {
    const busyKey = params.kind === "diploma" ? params.teacherId : params.credentialId;
    if (!busyKey) return;
    setBusy(`${params.action}:${busyKey}`);
    setFlash(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action échouée.");
      showFlash(
        "ok",
        params.action === "approve" ? "Approuvé avec succès." : "Refusé avec succès.",
      );
      await load();
    } catch (e) {
      showFlash("err", e instanceof Error ? e.message : "Erreur lors de l'action.");
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;
  if (!isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8 pb-12">

        {/* Header */}
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldCheck size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Espace admin
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">
                Vérifications enseignants
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Approuvez ou refusez les diplômes uploadés et les qualifications soumises par les enseignants.
              </p>
            </div>
          </div>
        </section>

        {/* Flash message */}
        {flash ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-medium",
              flash.kind === "ok"
                ? "border-teal-500/25 bg-teal-50 text-teal-800"
                : "border-rose-200 bg-rose-50 text-rose-800",
            )}
          >
            {flash.kind === "ok" ? (
              <CheckCircle2 size={16} className="mr-2 inline-block" />
            ) : (
              <AlertTriangle size={16} className="mr-2 inline-block" />
            )}
            {flash.text}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm font-semibold text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            Chargement...
          </div>
        ) : (
          <>
            {/* ── Section A: Diplômes à vérifier ────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2C2C2A]">
                  Diplômes à vérifier
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {diplomas.length}
                </span>
              </div>

              {diplomas.length === 0 ? (
                <div className="rounded-2xl border border-[#DCEAE3] bg-white p-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-teal-300" />
                  <p className="text-sm font-semibold text-slate-500">
                    Aucun diplôme en attente de vérification.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {diplomas.map((d) => {
                    const isApproveBusy = busy === `approve:${d.teacherId}`;
                    const isRejectBusy = busy === `reject:${d.teacherId}`;
                    const isBusy = isApproveBusy || isRejectBusy;
                    return (
                      <li
                        key={d.teacherId}
                        className="rounded-2xl border border-[#DCEAE3] bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-bold text-[#2C2C2A]">{d.teacherName}</p>
                            {d.teacherEmail ? (
                              <p className="text-sm text-slate-500">{d.teacherEmail}</p>
                            ) : null}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                Niveau {d.verificationLevel ?? "—"}
                              </span>
                              {d.identityVerified ? (
                                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                                  Identité ✓
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                  Identité non vérifiée
                                </span>
                              )}
                            </div>
                            <p className="pt-1 text-[11px] text-slate-400 break-all">
                              Fichier : {d.diplomaPath}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            {d.signedUrl ? (
                              <a
                                href={d.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <ExternalLink size={13} />
                                Voir le fichier
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">URL indisponible</span>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void review({
                                  kind: "diploma",
                                  action: "approve",
                                  teacherId: d.teacherId,
                                })
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-teal-700 px-4 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                            >
                              {isApproveBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}
                              Approuver
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void review({
                                  kind: "diploma",
                                  action: "reject",
                                  teacherId: d.teacherId,
                                })
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-rose-600 bg-white px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {isRejectBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <XCircle size={13} />
                              )}
                              Refuser
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Section B: Qualifications à vérifier ──────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#2C2C2A]">
                  Qualifications à vérifier
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {credentials.length}
                </span>
              </div>

              {credentials.length === 0 ? (
                <div className="rounded-2xl border border-[#DCEAE3] bg-white p-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-teal-300" />
                  <p className="text-sm font-semibold text-slate-500">
                    Aucune qualification en attente de vérification.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {credentials.map((c) => {
                    const isApproveBusy = busy === `approve:${c.credentialId}`;
                    const isRejectBusy = busy === `reject:${c.credentialId}`;
                    const isBusy = isApproveBusy || isRejectBusy;
                    return (
                      <li
                        key={c.credentialId}
                        className="rounded-2xl border border-[#DCEAE3] bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-[#2C2C2A]">{c.teacherName}</p>
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                {credentialTypeLabel(c.type)}
                              </span>
                            </div>
                            {c.teacherEmail ? (
                              <p className="text-sm text-slate-500">{c.teacherEmail}</p>
                            ) : null}
                            <p className="text-sm font-semibold text-[#2C2C2A]">{c.title}</p>
                            <p className="text-xs text-slate-500">
                              {[c.institutionName, c.country, c.issuedYear ? String(c.issuedYear) : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            {c.verificationMethod ? (
                              <p className="text-xs text-slate-400">
                                Méthode : {credentialMethodLabel(c.verificationMethod)}
                              </p>
                            ) : null}
                            {c.createdAt ? (
                              <p className="text-[11px] text-slate-400">
                                Soumis le{" "}
                                {new Date(c.createdAt).toLocaleDateString("fr-CA", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void review({
                                  kind: "credential",
                                  action: "approve",
                                  credentialId: c.credentialId,
                                  publicLabel: c.publicLabel ?? c.title,
                                  confidenceLevel: "medium",
                                })
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-teal-700 px-4 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                            >
                              {isApproveBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}
                              Approuver
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void review({
                                  kind: "credential",
                                  action: "reject",
                                  credentialId: c.credentialId,
                                })
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-rose-600 bg-white px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {isRejectBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <XCircle size={13} />
                              )}
                              Refuser
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="text-center">
              <Link
                href="/admin"
                className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
              >
                ← Tableau de bord
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
