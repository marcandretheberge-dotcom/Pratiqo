"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function AdminDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldCheck size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Espace admin</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">Tableau de bord</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Outils internes pour la modération et la vérification des enseignants.
              </p>
            </div>
          </div>
        </section>

        <Link
          href="/admin/credentials"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#DCEAE3] bg-white px-5 py-4 text-sm font-semibold text-[#2C2C2A] shadow-sm transition hover:border-teal-500/40 hover:bg-teal-50/30"
        >
          <span>Vérifications enseignants (diplômes et qualifications)</span>
          <ChevronRight size={18} className="shrink-0 text-teal-700" />
        </Link>
      </div>
    </main>
  );
}
