"use client";

// Admin-only support card for unblocking a teacher who got stuck in
// onboarding because of the 20 $ effective-hourly-rate floor.
//
// This component:
//   - Receives the initial snapshot (price / home rate / duration /
//     effective rates / pass-or-fail) from the server-rendered
//     /admin/users/[id] page so first render is server-side.
//   - Lets an admin PATCH only three safe fields:
//       * price_per_lesson
//       * home_lesson_price (nullable)
//       * default_lesson_duration_minutes
//   - Calls /api/admin/users/:id/teacher-onboarding which re-validates
//     server-side against the 20 $ minimum, so the admin path can
//     never persist a sub-minimum configuration.
//
// Explicit guardrails surfaced in the UI:
//   - Cannot change role / paid Membre Pro status / Stripe IDs.
//   - Does NOT auto-complete onboarding or make the profile public.
//   - Action is logged to the existing admin_role_change_audit table.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

export type TeacherOnboardingDiagnosis = {
  minimumPassed: boolean;
  minimumDollars: number;
  effective: {
    standardHourly: number | null;
    standardCents: number;
    homeHourly: number | null;
    homeCents: number;
    defaultDurationMinutes: number;
  };
  missingFields: string[];
};

export type TeacherOnboardingSnapshot = {
  id: string;
  price_per_lesson: number | string | null;
  home_lesson_enabled: boolean | null;
  home_lesson_price: number | string | null;
  home_lesson_min_duration: number | null;
  default_lesson_duration_minutes: number | null;
};

type Props = {
  teacherUserId: string;
  initialTeacher: TeacherOnboardingSnapshot;
  initialDiagnosis: TeacherOnboardingDiagnosis;
  durationOptions: readonly number[];
  minimumHourlyRate: number;
};

function dollars(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} $`;
}

export function TeacherOnboardingSupportCard({
  teacherUserId,
  initialTeacher,
  initialDiagnosis,
  durationOptions,
  minimumHourlyRate,
}: Props) {
  const router = useRouter();
  const [teacher, setTeacher] = useState(initialTeacher);
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);

  const [price, setPrice] = useState<string>(
    teacher.price_per_lesson != null ? String(teacher.price_per_lesson) : "",
  );
  const [homePrice, setHomePrice] = useState<string>(
    teacher.home_lesson_price != null ? String(teacher.home_lesson_price) : "",
  );
  const [duration, setDuration] = useState<number>(
    teacher.default_lesson_duration_minutes ?? 60,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée. Reconnecte-toi.");

      const body: Record<string, unknown> = {};
      const priceNum = Number(price);
      if (Number.isFinite(priceNum) && priceNum > 0) body.price_per_lesson = priceNum;

      if (homePrice.trim() === "") {
        body.home_lesson_price = null;
      } else {
        const hp = Number(homePrice);
        if (!Number.isFinite(hp) || hp <= 0) {
          throw new Error("Tarif à domicile invalide.");
        }
        body.home_lesson_price = hp;
      }
      body.default_lesson_duration_minutes = duration;

      const res = await fetch(`/api/admin/users/${teacherUserId}/teacher-onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        teacher?: TeacherOnboardingSnapshot;
        diagnosis?: TeacherOnboardingDiagnosis;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Erreur ${res.status}`);
      }
      if (json.teacher) setTeacher(json.teacher);
      if (json.diagnosis) setDiagnosis(json.diagnosis);
      setSuccess(
        "Champs corrigés. Le minimum de 20 $ est respecté. L'onboarding du professeur reste celui qu'il/elle a déjà déclaré — aucun rôle ni statut payé n'a été modifié.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  };

  const StatusBadge = diagnosis.minimumPassed ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
      <CheckCircle2 size={14} aria-hidden />
      Minimum {diagnosis.minimumDollars} $ respecté
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900">
      <AlertTriangle size={14} aria-hidden />
      Bloqué sous {diagnosis.minimumDollars} $
    </span>
  );

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="teacher-onboarding-support-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2C2C2A]">
            Support onboarding enseignant
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Corrige uniquement les champs de tarif et de durée nécessaires pour
            débloquer la règle de minimum {diagnosis.minimumDollars} $.{" "}
            <strong>Aucun rôle, statut payé Membre Pro, ID Stripe ou statut
            d&apos;onboarding</strong>{" "}
            n&apos;est modifié ici.
          </p>
        </div>
        {StatusBadge}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tarif horaire standard
          </dt>
          <dd className="mt-1 text-slate-800">
            {dollars(diagnosis.effective.standardHourly)} / h ·{" "}
            {(diagnosis.effective.standardCents / 100).toFixed(2)} $ pour 60 min
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Cours à domicile
          </dt>
          <dd className="mt-1 text-slate-800">
            {teacher.home_lesson_enabled ? (
              <>
                Activé · {dollars(diagnosis.effective.homeHourly)} / h ·{" "}
                {(diagnosis.effective.homeCents / 100).toFixed(2)} $ pour la
                session minimum
              </>
            ) : (
              <>Non activé</>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Durée par défaut
          </dt>
          <dd className="mt-1 text-slate-800">
            {diagnosis.effective.defaultDurationMinutes} min
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Champs bloquants
          </dt>
          <dd className="mt-1 text-slate-800">
            {diagnosis.missingFields.length === 0 ? (
              <span className="text-emerald-800">Aucun</span>
            ) : (
              <ul className="list-disc pl-5">
                {diagnosis.missingFields.map((f) => (
                  <li key={f} className="font-mono text-xs">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Tarif horaire ($/h)
          </span>
          <input
            type="number"
            min={minimumHourlyRate}
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm"
            data-testid="teacher-onboarding-support-price"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Tarif à domicile ($/h, laisser vide pour effacer)
          </span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={homePrice}
            onChange={(e) => setHomePrice(e.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm"
            data-testid="teacher-onboarding-support-home-price"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Durée par défaut (min)
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm"
            data-testid="teacher-onboarding-support-duration"
          >
            {durationOptions.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
            data-testid="teacher-onboarding-support-submit"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
            Appliquer la correction
          </button>
          {error ? (
            <span className="text-sm font-semibold text-rose-700" role="alert">
              {error}
            </span>
          ) : null}
          {success ? (
            <span
              className="text-sm font-semibold text-emerald-800"
              role="status"
              data-testid="teacher-onboarding-support-success"
            >
              {success}
            </span>
          ) : null}
        </div>
      </form>

      <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
        Cette action <strong>n&apos;active PAS</strong> le statut payé Membre
        Pro, ne complète pas l&apos;onboarding automatiquement, ne rend pas le
        profil public et ne modifie aucune information Stripe. Elle ajuste
        uniquement les champs de tarif/durée bloquant la règle de minimum
        {" "}{minimumHourlyRate} $/h, et l&apos;action est journalisée dans
        l&apos;audit admin.
      </p>
    </section>
  );
}
