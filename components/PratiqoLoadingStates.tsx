"use client";

import React from "react";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-[#E7E3DA]", className)} aria-hidden />;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[#E5E0D6] bg-white p-4 shadow-sm", className)} aria-hidden>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-[#EAF5F1]" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="h-3 w-full bg-[#F0EDE6]" />
          <SkeletonLine className="h-3 w-1/2 bg-[#F0EDE6]" />
        </div>
      </div>
    </div>
  );
}

export function MarketplacePageSkeleton({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] bg-[#FAF8F3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6">
        <div className="rounded-[2rem] border border-[#E2DED4] bg-white p-5 shadow-[0_24px_80px_rgba(31,90,84,0.08)] sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <SkeletonLine className="h-3 w-28 bg-[#D7EEE8]" />
              <SkeletonLine className="h-8 w-64" />
              <SkeletonLine className="h-4 w-80 max-w-full bg-[#F0EDE6]" />
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#E9E3D8] bg-[#FBFAF7] p-2">
              <SkeletonLine className="h-10 w-20 bg-[#EAF5F1]" />
              <SkeletonLine className="h-10 w-20 bg-[#F0EDE6]" />
              <SkeletonLine className="h-10 w-20 bg-[#F0EDE6]" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard className="sm:col-span-2" />
          </div>
          <div className="hidden rounded-[2rem] border border-[#E2DED4] bg-[#EAF5F1] p-4 shadow-sm lg:block">
            <div className="h-full min-h-64 rounded-[1.5rem] bg-white/75" />
          </div>
        </div>
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}

export function AuthShellLoading() {
  return (
    <div className="min-h-[70vh] bg-[#FAF8F3] px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CFE9E3] bg-white text-teal-700 shadow-sm">
          <Sparkles size={24} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">Pratiqo</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2C2C2A]">Préparation de ton espace</h1>
        <div className="mt-8 w-full animate-pulse space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function RedirectingToLogin() {
  return (
    <div className="min-h-[50vh] bg-[#FAF8F3] px-6 py-12">
      <div className="mx-auto max-w-md rounded-[2rem] border border-[#E2DED4] bg-white p-6 text-center shadow-[0_24px_80px_rgba(31,90,84,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F1] text-teal-700">
          <ShieldCheck size={22} />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#2C2C2A]">Redirection sécurisée</p>
        <p className="mt-1 text-sm text-[#6B6A65]">On te ramène vers la connexion.</p>
      </div>
    </div>
  );
}

export function LoginPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#FAF8F3] px-5 py-10">
      <div className="mx-auto grid max-w-5xl animate-pulse gap-6 lg:grid-cols-[1fr_26rem] lg:items-center">
        <div className="space-y-4">
          <SkeletonLine className="h-3 w-28 bg-[#D7EEE8]" />
          <SkeletonLine className="h-10 w-72" />
          <SkeletonLine className="h-4 w-full max-w-lg bg-[#F0EDE6]" />
          <SkeletonLine className="h-4 w-80 max-w-full bg-[#F0EDE6]" />
        </div>
        <div className="rounded-[2rem] border border-[#E2DED4] bg-white p-6 shadow-sm">
          <SkeletonLine className="h-8 w-40" />
          <div className="mt-6 space-y-3">
            <SkeletonLine className="h-12 w-full bg-[#F0EDE6]" />
            <SkeletonLine className="h-12 w-full bg-[#D7EEE8]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardGateSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-[2rem] border border-[#E2DED4] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF5F1] text-teal-700">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2C2C2A]">Vérification du profil</p>
            <p className="text-sm text-[#6B6A65]">On prépare le bon tableau de bord.</p>
          </div>
        </div>
        <div className="mt-5 grid animate-pulse gap-3 sm:grid-cols-3">
          <SkeletonLine className="h-16 rounded-2xl bg-[#F0EDE6]" />
          <SkeletonLine className="h-16 rounded-2xl bg-[#F0EDE6]" />
          <SkeletonLine className="h-16 rounded-2xl bg-[#F0EDE6]" />
        </div>
      </div>
    </div>
  );
}
