"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
export default function StudentProgressPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#888780]">Élève</p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">Ma progression</h1>
        <p className="mt-2 text-sm text-[#888780] max-w-xl">
          Suis ta pratique entre les cours : série, badges et devoirs arrivent ici progressivement.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E1F5EE] text-[#1D9E75]">
          <BookOpen size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#2C2C2A]">Tableau de bord détaillé</h2>
          <p className="mt-1 text-sm text-[#888780]">
            Les statistiques complètes (série, badges, devoirs) sont sur ton accueil. On centralise ici la vue « progression ».
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:underline"
          >
            <CalendarDays size={18} />
            Voir mes cours et ma série
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
