"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import type { TeacherRow } from "../../../../lib/teacherMapper";

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

function snapRadiusKm(value: number): number {
  return RADIUS_OPTIONS.reduce((best, cur) =>
    Math.abs(cur - value) < Math.abs(best - value) ? cur : best,
  );
}

export default function TeacherSettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState("");
  const [radius, setRadius] = useState(25);
  const [minDuration, setMinDuration] = useState(60);
  const [force2h, setForce2h] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [locationJson, setLocationJson] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user.id).maybeSingle();
      if (error || !data) {
        setTeacherId(null);
        setLoading(false);
        return;
      }
      const row = data as TeacherRow;
      setTeacherId(row.id);
      const loc = (row.location || {}) as Record<string, unknown>;
      setLocationJson(loc);
      setNeighborhood(typeof loc.neighborhood === "string" ? loc.neighborhood : "");
      setEnabled(Boolean(row.home_lesson_enabled));
      setPrice(row.home_lesson_price != null ? String(row.home_lesson_price) : "");
      setRadius(snapRadiusKm(row.home_lesson_radius_km ?? 25));
      setMinDuration(row.home_lesson_min_duration ?? 60);
      setForce2h(Boolean(row.home_lesson_force_2h_over_20km));
      setRequiresConfirmation(row.home_lesson_requires_confirmation ?? true);
      setLoading(false);
    };
    void load();
  }, [user]);

  const save = async () => {
    if (!user || !teacherId) return;
    setSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const priceNum = price.trim() === "" ? null : Number(price);
    if (enabled && (priceNum == null || !Number.isFinite(priceNum) || priceNum <= 0)) {
      setMessage("Indique un tarif valide pour les cours à domicile.");
      setSaving(false);
      return;
    }
    const nextLocation: Record<string, unknown> = { ...locationJson };
    if (neighborhood.trim()) nextLocation.neighborhood = neighborhood.trim();
    else delete nextLocation.neighborhood;
    const { error } = await supabase
      .from("teachers")
      .update({
        home_lesson_enabled: enabled,
        home_lesson_price: enabled ? priceNum : null,
        home_lesson_radius_km: radius,
        home_lesson_min_duration: minDuration,
        home_lesson_force_2h_over_20km: force2h,
        home_lesson_requires_confirmation: requiresConfirmation,
        location: nextLocation,
      })
      .eq("id", teacherId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setLocationJson(nextLocation);
    setMessage("Enregistré.");
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center">
        <p className="text-sm text-slate-600">Connecte-toi pour accéder aux paramètres.</p>
        <Link href="/" className="mt-4 inline-block text-[#1D9E75] font-medium underline">
          Accueil
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-amber-200 rounded-3xl p-8">
        <p className="text-sm font-semibold text-slate-800">Aucun profil professeur lié</p>
        <p className="mt-2 text-sm text-slate-600">
          Ce compte ({profile?.role ?? "élève"}) n&apos;est pas relié à une fiche dans{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">teachers.user_id</code>. Demande l&apos;attribution côté
          admin ou mets à jour ton rôle professeur.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">Professeur</p>
        <h1 className="text-2xl font-bold text-[var(--p-text)]">Paramètres — cours à domicile</h1>
        <p className="mt-2 text-sm text-[var(--p-text-muted)]">
          Tarif déplacement, zone et options de confirmation pour les réservations « À domicile ».
        </p>
      </div>

      <div className="bg-white border border-[var(--p-border-light)] rounded-3xl p-6 space-y-6 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
            Quartier affiché publiquement
          </label>
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            placeholder="ex: Plateau-Mont-Royal"
            autoComplete="address-level3"
          />
          <p className="mt-1.5 text-[11px] text-[var(--p-text-muted)] leading-snug">
            Ce quartier apparaît sur la carte (plan Entreprise) avant réservation. L&apos;adresse complète reste masquée
            jusqu&apos;à confirmation.
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm font-medium text-[var(--p-text)]">Activer les cours à domicile</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75]"
          />
        </label>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
            Tarif à domicile ($ / heure)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={!enabled}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-50"
            placeholder="ex. 55"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
            Rayon de déplacement : {radius} km
          </label>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={radius}
            onChange={(e) => setRadius(snapRadiusKm(Number(e.target.value)))}
            disabled={!enabled}
            className="w-full accent-[#1D9E75] disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mt-1">
            <span>5 km</span>
            <span>10</span>
            <span>25</span>
            <span>50 km</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                disabled={!enabled}
                onClick={() => setRadius(km)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 ${
                  radius === km
                    ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)] text-[#1D9E75]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
            Durée minimale par défaut (minutes)
          </label>
          <input
            type="number"
            min={30}
            step={15}
            value={minDuration}
            onChange={(e) => setMinDuration(Number(e.target.value))}
            disabled={!enabled}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-50"
          />
        </div>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm text-[var(--p-text)]">
            Minimum <strong>2 h</strong> de cours si la distance dépasse <strong>20 km</strong>
          </span>
          <input
            type="checkbox"
            checked={force2h}
            onChange={(e) => setForce2h(e.target.checked)}
            disabled={!enabled}
            className="h-5 w-5 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75] disabled:opacity-40"
          />
        </label>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm text-[var(--p-text)]">Confirmation manuelle requise pour les demandes à domicile</span>
          <input
            type="checkbox"
            checked={requiresConfirmation}
            onChange={(e) => setRequiresConfirmation(e.target.checked)}
            disabled={!enabled}
            className="h-5 w-5 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75] disabled:opacity-40"
          />
        </label>

        {message ? (
          <p className={`text-sm ${message === "Enregistré." ? "text-[#1D9E75]" : "text-rose-600"}`}>{message}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="w-full h-11 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 bg-[#1D9E75] hover:brightness-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
