"use client";

import React, { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { getEnabledDisciplines, getDisciplineById } from "@/lib/disciplines";

export type DisciplineCardDraft = {
  disciplineId: string;
  specialties: string[];
};

const PRESET_SPECIALTIES: Record<string, string[]> = {
  langues: ["Français", "Anglais", "Espagnol", "Allemand", "Japonais", "Coréen", "Italien", "Portugais", "Mandarin", "Arabe", "Autre"],
  musique: ["Piano", "Guitare", "Chant", "Violon", "Batterie", "Basse", "Ukulélé", "Théorie musicale", "Autre"],
  tuteurs: ["Mathématiques", "Français", "Anglais", "Sciences", "Physique", "Chimie", "Histoire", "Aide aux devoirs", "Préparation aux examens", "Autre"],
};

function normalizeSpec(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function uniqSpecs(specs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of specs) {
    const s = normalizeSpec(raw);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function TeacherDisciplinesEditor({
  open,
  mode,
  initial,
  maxReached,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "add" | "edit";
  initial: DisciplineCardDraft;
  maxReached: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (next: DisciplineCardDraft) => Promise<void> | void;
}) {
  const { t } = useLocale();
  const enabledDomains = useMemo(() => getEnabledDisciplines(), []);

  const [disciplineId, setDisciplineId] = useState(initial.disciplineId);
  const [specialties, setSpecialties] = useState<string[]>(() => uniqSpecs(initial.specialties));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preset = PRESET_SPECIALTIES[disciplineId] ?? [];
  const domainLabel = getDisciplineById(disciplineId)?.label ?? disciplineId;

  if (!open) return null;

  const addCustom = () => {
    const next = uniqSpecs([...specialties, custom]);
    setSpecialties(next);
    setCustom("");
  };

  const togglePreset = (label: string) => {
    const x = normalizeSpec(label);
    if (!x) return;
    const key = x.toLowerCase();
    const has = specialties.some((s) => s.toLowerCase() === key);
    setSpecialties(has ? specialties.filter((s) => s.toLowerCase() !== key) : uniqSpecs([...specialties, x]));
  };

  const removeSpec = (label: string) => {
    const key = normalizeSpec(label).toLowerCase();
    setSpecialties(specialties.filter((s) => s.toLowerCase() !== key));
  };

  const canSave = !busy && Boolean(disciplineId) && specialties.length > 0 && (!maxReached || mode === "edit");

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {mode === "add" ? t("addDiscipline") : t("editDiscipline")}
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#2C2C2A]">
              {mode === "add" ? t("addDiscipline") : `${t("editDiscipline")} · ${domainLabel}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label={t("cancel")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{t("disciplineCategory")}</span>
            <select
              value={disciplineId}
              onChange={(e) => {
                setDisciplineId(e.target.value);
                setSpecialties([]);
                setError(null);
              }}
              disabled={busy || (mode === "add" && maxReached)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-800 disabled:opacity-60"
            >
              {enabledDomains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.label}
                </option>
              ))}
            </select>
            {mode === "add" && maxReached ? <p className="text-xs font-semibold text-rose-700">{t("maxDisciplinesReached")}</p> : null}
          </label>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{t("disciplineSpecialties")}</span>

            {preset.length ? (
              <div className="flex flex-wrap gap-2">
                {preset.map((lab) => {
                  const key = normalizeSpec(lab).toLowerCase();
                  const on = specialties.some((s) => s.toLowerCase() === key);
                  return (
                    <button
                      key={lab}
                      type="button"
                      disabled={busy}
                      onClick={() => togglePreset(lab)}
                      className={cn(
                        "h-9 px-3 rounded-full text-xs font-bold border transition-colors",
                        on ? "border-[#00694c] bg-[rgba(0,105,76,0.12)] text-teal-700" : "border-slate-200 bg-slate-100 text-slate-700",
                      )}
                    >
                      {lab}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t("customSpecialty")}</p>
            )}

            {specialties.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,105,76,0.35)] bg-[rgba(0,105,76,0.08)] px-3 py-1.5 text-xs font-semibold text-[#0f6d52]"
                  >
                    {s}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeSpec(s)}
                      className="rounded-full p-0.5 hover:bg-[rgba(0,105,76,0.2)] disabled:opacity-40"
                      aria-label={t("removeAria")}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={t("addSpecialty")}
                disabled={busy}
                className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={busy || !normalizeSpec(custom)}
                onClick={addCustom}
                className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
              >
                {t("addSpecialty")}
              </button>
            </div>
          </div>

          {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              const nextSpecs = uniqSpecs(specialties);
              if (!nextSpecs.length) {
                setError(t("specialtyValidationRequired"));
                return;
              }
              setError(null);
              await onSave({ disciplineId, specialties: nextSpecs });
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#00694c] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("saveDiscipline")}
          </button>
        </div>
      </div>
    </div>
  );
}

