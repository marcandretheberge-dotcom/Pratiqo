"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Save, X } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { disciplineLabelToTeacherCategory, getDisciplineById, getEnabledDisciplines } from "../../../../lib/disciplines";
import type { TeacherRow } from "../../../../lib/teacherMapper";

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

type TeacherDisciplineDbRow = {
  id: string;
  discipline_id: string;
  specialite: string | null;
  sort_order: number;
};

async function syncTeacherPrimaryFromDisciplines(
  supabase: ReturnType<typeof getSupabaseClient>,
  teacherId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("teacher_disciplines")
    .select("discipline_id, specialite, sort_order")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true });
  if (!rows?.length) return;
  const first = rows[0] as { discipline_id: string; specialite: string | null };
  const meta = getDisciplineById(first.discipline_id);
  const label = meta?.label ?? "Musique";
  const category = disciplineLabelToTeacherCategory(label);
  const discipline = String(first.specialite || "").trim() || "—";
  await supabase.from("teachers").update({ discipline, category }).eq("id", teacherId);
}

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
  const [discRows, setDiscRows] = useState<TeacherDisciplineDbRow[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [showAddDisc, setShowAddDisc] = useState(false);
  const [addDiscId, setAddDiscId] = useState("");
  const [addSpec, setAddSpec] = useState("");
  const [discSaving, setDiscSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setDiscLoading(false);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user.id).maybeSingle();
      if (error || !data) {
        setTeacherId(null);
        setDiscLoading(false);
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
      const enabledList = getEnabledDisciplines();
      setAddDiscId(enabledList[0]?.id ?? "musique");
      const { data: drows, error: dErr } = await supabase
        .from("teacher_disciplines")
        .select("id, discipline_id, specialite, sort_order")
        .eq("teacher_id", row.id)
        .order("sort_order", { ascending: true });
      if (!dErr && drows) setDiscRows(drows as TeacherDisciplineDbRow[]);
      else setDiscRows([]);
      setDiscLoading(false);
      setLoading(false);
    };
    void load();
  }, [user]);

  const reloadDisciplines = async (tid: string) => {
    const supabase = getSupabaseClient();
    const { data: drows } = await supabase
      .from("teacher_disciplines")
      .select("id, discipline_id, specialite, sort_order")
      .eq("teacher_id", tid)
      .order("sort_order", { ascending: true });
    setDiscRows((drows as TeacherDisciplineDbRow[]) ?? []);
  };

  const removeDiscipline = async (rowId: string) => {
    if (!teacherId || discRows.length <= 1) return;
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teacher_disciplines").delete().eq("id", rowId);
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setDiscSaving(false);
    setMessage("Enregistré.");
  };

  const addDiscipline = async () => {
    if (!teacherId || discRows.length >= 3) return;
    const spec = addSpec.trim();
    if (!spec) {
      setMessage("Indique une spécialité.");
      return;
    }
    if (discRows.some((r) => r.discipline_id === addDiscId)) {
      setMessage("Cette discipline est déjà ajoutée.");
      return;
    }
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const nextOrder = discRows.length ? Math.max(...discRows.map((r) => r.sort_order)) + 1 : 0;
    const { error } = await supabase.from("teacher_disciplines").insert({
      teacher_id: teacherId,
      discipline_id: addDiscId,
      specialite: spec,
      sort_order: nextOrder,
    });
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setAddSpec("");
    setShowAddDisc(false);
    setDiscSaving(false);
    setMessage("Enregistré.");
  };

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

  const addableDisciplines = getEnabledDisciplines().filter((d) => !discRows.some((r) => r.discipline_id === d.id));

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">Professeur</p>
        <h1 className="text-2xl font-bold text-[var(--p-text)]">Paramètres — cours à domicile</h1>
        <p className="mt-2 text-sm text-[var(--p-text-muted)]">
          Tarif déplacement, zone et options de confirmation pour les réservations « À domicile ».
        </p>
      </div>

      <div className="bg-white border border-[var(--p-border-light)] rounded-3xl p-6 space-y-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[var(--p-text)]">Mes disciplines</h2>
          <p className="mt-1 text-sm text-[var(--p-text-muted)]">Jusqu&apos;à 3 disciplines. La première est ton affichage principal.</p>
        </div>
        {discLoading ? (
          <Loader2 className="animate-spin text-[#1D9E75]" size={24} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {discRows.map((r) => {
                const meta = getDisciplineById(r.discipline_id);
                const label = `${meta?.emoji ?? "✨"} ${meta?.label ?? r.discipline_id}${r.specialite ? ` — ${r.specialite}` : ""}`;
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(29,158,117,0.35)] bg-[rgba(29,158,117,0.08)] px-3 py-1.5 text-xs font-semibold text-[#0f6d52]"
                  >
                    {label}
                    <button
                      type="button"
                      disabled={discRows.length <= 1 || discSaving}
                      onClick={() => void removeDiscipline(r.id)}
                      className="rounded-full p-0.5 hover:bg-[rgba(29,158,117,0.2)] disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Retirer"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
            {discRows.length < 3 ? (
              <div className="space-y-3">
                {!showAddDisc ? (
                  <button
                    type="button"
                    disabled={discSaving || addableDisciplines.length === 0}
                    onClick={() => setShowAddDisc(true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[#1D9E75] text-[#0f6d56] text-sm font-semibold hover:bg-[#e1f5ee] disabled:opacity-50"
                  >
                    <Plus size={18} /> Ajouter une discipline
                  </button>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <select
                      value={addDiscId}
                      onChange={(e) => setAddDiscId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    >
                      {addableDisciplines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.emoji} {d.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={addSpec}
                      onChange={(e) => setAddSpec(e.target.value)}
                      placeholder="Spécialité"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={discSaving}
                        onClick={() => void addDiscipline()}
                        className="h-10 px-4 rounded-full bg-[#1D9E75] text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDisc(false);
                          setAddSpec("");
                        }}
                        className="h-10 px-4 rounded-full border border-slate-200 text-sm font-semibold text-slate-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
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
