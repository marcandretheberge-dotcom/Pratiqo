"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import {
  getAcademicProgramHelperKey,
  getAcademicSystemConfig,
  getProgramTrackLabelKey,
} from "@/lib/academicSystems";
import type { TranslationKey } from "@/lib/translations";

export type LearnerProfileInput = {
  display_name: string;
  relationship: "self" | "child" | "other";
  birth_year: number | null;
  context_type: "academic" | "language" | "music" | "general" | null;
  school_level: string | null;
  grade_level: string | null;
  academic_program: string | null;
  academic_program_label: string | null;
  academic_program_unsure: boolean;
  primary_language: string | null;
  target_language: string | null;
  current_level: string | null;
  instrument: string | null;
  practice_frequency: string | null;
  learning_goals: string[];
  subject_struggles: string[];
  current_grade_percent: number | null;
  exam_date: string | null;
  notes_for_teacher: string | null;
  explanation_preference: string | null;
  is_default: boolean;
};

export type LearnerProfileRow = LearnerProfileInput & {
  id: string;
  owner_user_id: string;
  archived_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const emptyProfile: LearnerProfileInput = {
  display_name: "",
  relationship: "self",
  birth_year: null,
  context_type: "general",
  school_level: null,
  grade_level: null,
  academic_program: null,
  academic_program_label: null,
  academic_program_unsure: false,
  primary_language: null,
  target_language: null,
  current_level: null,
  instrument: null,
  practice_frequency: null,
  learning_goals: [],
  subject_struggles: [],
  current_grade_percent: null,
  exam_date: null,
  notes_for_teacher: null,
  explanation_preference: null,
  is_default: false,
};

const struggleSeeds = [
  "Factorisation",
  "Fractions",
  "Fonctions",
  "Compréhension de lecture",
  "Grammaire",
  "Conversation",
  "Prononciation",
  "Solfège",
  "Rythme",
];

const goalSeeds = [
  "Améliorer la note",
  "Préparer un examen",
  "Reprendre confiance",
  "Devoirs",
  "Conversation",
  "Progresser par plaisir",
];

const currentLevelSeeds = ["Debutant", "Intermediaire", "Avance", "A1-A2", "B1-B2", "C1-C2"];
const practiceFrequencySeeds = ["Quelques fois par mois", "1 fois par semaine", "2-3 fois par semaine", "Chaque jour"];

function academicProgramLabel(value: string | null, labelKey: string | null, t: (key: TranslationKey) => string) {
  if (!value) return null;
  if (labelKey) return t(labelKey as TranslationKey);
  if (value === "ib") return "IB";
  return value;
}

function toggleTag(items: string[], tag: string) {
  return items.includes(tag) ? items.filter((x) => x !== tag) : [...items, tag];
}

function normalizeInitial(initial?: Partial<LearnerProfileInput> | null): LearnerProfileInput {
  return {
    ...emptyProfile,
    ...initial,
    relationship:
      initial?.relationship === "child" || initial?.relationship === "other" || initial?.relationship === "self"
        ? initial.relationship
        : "self",
    learning_goals: Array.isArray(initial?.learning_goals) ? initial.learning_goals : [],
    subject_struggles: Array.isArray(initial?.subject_struggles) ? initial.subject_struggles : [],
    context_type:
      initial?.context_type === "academic" ||
      initial?.context_type === "language" ||
      initial?.context_type === "music" ||
      initial?.context_type === "general"
        ? initial.context_type
        : "general",
    academic_program_unsure: Boolean(initial?.academic_program_unsure),
  };
}

export function LearnerProfileForm({
  initial,
  saving,
  onCancel,
  onSubmit,
  countryCode,
  regionCode,
}: {
  initial?: Partial<LearnerProfileInput> | null;
  saving?: boolean;
  onCancel?: () => void;
  countryCode?: string | null;
  regionCode?: string | null;
  onSubmit: (value: LearnerProfileInput) => Promise<void> | void;
}) {
  const { t, locale } = useLocale();
  const [form, setForm] = useState<LearnerProfileInput>(() => normalizeInitial(initial));
  const [customStruggle, setCustomStruggle] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const academicConfig = useMemo(
    () => getAcademicSystemConfig({ countryCode, regionCode, locale }),
    [countryCode, regionCode, locale],
  );
  const academicProgramHelperKey = getAcademicProgramHelperKey(academicConfig);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 80 }, (_, i) => y - i);
  }, []);

  const submit = async () => {
    const display = form.display_name.trim();
    if (!display) return;
    await onSubmit({
      ...form,
      display_name: display,
      context_type: form.context_type || "general",
      grade_level: form.grade_level?.trim() || null,
      academic_program_label:
        form.academic_program_label?.trim() ||
        academicProgramLabel(form.academic_program, getProgramTrackLabelKey(academicConfig, form.academic_program), t) ||
        null,
      academic_program_unsure: form.academic_program === "unsure" || Boolean(form.academic_program_unsure),
      primary_language: form.primary_language?.trim() || null,
      target_language: form.target_language?.trim() || null,
      current_level: form.current_level?.trim() || null,
      instrument: form.instrument?.trim() || null,
      practice_frequency: form.practice_frequency?.trim() || null,
      notes_for_teacher: form.notes_for_teacher?.trim() || null,
    });
  };

  const addCustomTag = (kind: "struggle" | "goal") => {
    const value = (kind === "struggle" ? customStruggle : customGoal).trim();
    if (!value) return;
    if (kind === "struggle") {
      setForm((f) => ({ ...f, subject_struggles: Array.from(new Set([...f.subject_struggles, value])) }));
      setCustomStruggle("");
    } else {
      setForm((f) => ({ ...f, learning_goals: Array.from(new Set([...f.learning_goals, value])) }));
      setCustomGoal("");
    }
  };

  return (
    <div className="space-y-5 rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-slate-600">{t("learnerDisplayName")}</span>
          <input
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-slate-600">{t("learnerRelationship")}</span>
          <select
            value={form.relationship}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as LearnerProfileInput["relationship"] }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="self">{t("learnerRelationshipSelf")}</option>
            <option value="child">{t("learnerRelationshipChild")}</option>
            <option value="other">{t("learnerRelationshipOther")}</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-slate-600">{t("contextType")}</span>
          <select
            value={form.context_type ?? "general"}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                context_type: e.target.value as LearnerProfileInput["context_type"],
              }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="academic">{t("contextTypeAcademic")}</option>
            <option value="language">{t("contextTypeLanguage")}</option>
            <option value="music">{t("contextTypeMusic")}</option>
            <option value="general">{t("contextTypeGeneral")}</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-slate-600">{t("learnerBirthYear")}</span>
          <select
            value={form.birth_year ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value ? Number(e.target.value) : null }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">-</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      {form.context_type === "academic" ? (
        <div className="space-y-4 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
          <p className="text-xs font-bold uppercase text-teal-700">{t("learnerAcademicContext")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("schoolLevel")}</span>
              <select
                value={form.school_level ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, school_level: e.target.value || null }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">-</option>
                {academicConfig.schoolLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {t(level.labelKey as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("gradeLevel")}</span>
              <input
                value={form.grade_level ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
                placeholder="Secondaire 4"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-600">{t("academicProgram")}</span>
              <select
                value={form.academic_program ?? ""}
                onChange={(e) => {
                  const value = e.target.value || null;
                  setForm((f) => ({
                    ...f,
                    academic_program: value,
                    academic_program_label: academicProgramLabel(value, getProgramTrackLabelKey(academicConfig, value), t),
                    academic_program_unsure: value === "unsure",
                  }));
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">-</option>
                {academicConfig.programTracks.map((track) => (
                  <option key={track.value} value={track.value}>
                    {t((track.parentFriendlyLabelKey || track.labelKey) as TranslationKey)}
                  </option>
                ))}
              </select>
              {academicProgramHelperKey ? (
                <p className="text-[11px] leading-relaxed text-slate-500">{t(academicProgramHelperKey as TranslationKey)}</p>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("currentGradePercent")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.current_grade_percent ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, current_grade_percent: e.target.value ? Number(e.target.value) : null }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase text-slate-600">{t("examDate")}</span>
              <input
                type="date"
                value={form.exam_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value || null }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
          </div>
          <ChipEditor
            title={t("subjectStruggles")}
            seeds={struggleSeeds}
            selected={form.subject_struggles}
            custom={customStruggle}
            setCustom={setCustomStruggle}
            onToggle={(tag) => setForm((f) => ({ ...f, subject_struggles: toggleTag(f.subject_struggles, tag) }))}
            onAdd={() => addCustomTag("struggle")}
          />
          <ExplanationPreferenceSelect value={form.explanation_preference} onChange={(value) => setForm((f) => ({ ...f, explanation_preference: value }))} />
        </div>
      ) : null}

      {form.context_type === "language" ? (
        <div className="space-y-4 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
          <p className="text-xs font-bold uppercase text-teal-700">{t("learnerLanguageContext")}</p>
          <ContextInput label={t("targetLanguage")} value={form.target_language ?? ""} onChange={(value) => setForm((f) => ({ ...f, target_language: value }))} />
          <ContextInput label={t("currentLevel")} value={form.current_level ?? ""} onChange={(value) => setForm((f) => ({ ...f, current_level: value }))} suggestions={currentLevelSeeds} />
          <ChipEditor title={t("learningGoals")} seeds={goalSeeds} selected={form.learning_goals} custom={customGoal} setCustom={setCustomGoal} onToggle={(tag) => setForm((f) => ({ ...f, learning_goals: toggleTag(f.learning_goals, tag) }))} onAdd={() => addCustomTag("goal")} />
          <ExplanationPreferenceSelect value={form.explanation_preference} onChange={(value) => setForm((f) => ({ ...f, explanation_preference: value }))} />
        </div>
      ) : null}

      {form.context_type === "music" ? (
        <div className="space-y-4 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
          <p className="text-xs font-bold uppercase text-teal-700">{t("learnerMusicContext")}</p>
          <ContextInput label={t("instrument")} value={form.instrument ?? ""} onChange={(value) => setForm((f) => ({ ...f, instrument: value }))} />
          <ContextInput label={t("currentLevel")} value={form.current_level ?? ""} onChange={(value) => setForm((f) => ({ ...f, current_level: value }))} suggestions={currentLevelSeeds} />
          <ContextInput label={t("practiceFrequency")} value={form.practice_frequency ?? ""} onChange={(value) => setForm((f) => ({ ...f, practice_frequency: value }))} suggestions={practiceFrequencySeeds} />
          <ChipEditor title={t("learningGoals")} seeds={goalSeeds} selected={form.learning_goals} custom={customGoal} setCustom={setCustomGoal} onToggle={(tag) => setForm((f) => ({ ...f, learning_goals: toggleTag(f.learning_goals, tag) }))} onAdd={() => addCustomTag("goal")} />
        </div>
      ) : null}

      {form.context_type === "general" || !form.context_type ? (
        <div className="space-y-4 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
          <p className="text-xs font-bold uppercase text-teal-700">{t("learnerGeneralContext")}</p>
          <ContextInput label={t("currentLevel")} value={form.current_level ?? ""} onChange={(value) => setForm((f) => ({ ...f, current_level: value }))} suggestions={currentLevelSeeds} />
          <ChipEditor title={t("learningGoals")} seeds={goalSeeds} selected={form.learning_goals} custom={customGoal} setCustom={setCustomGoal} onToggle={(tag) => setForm((f) => ({ ...f, learning_goals: toggleTag(f.learning_goals, tag) }))} onAdd={() => addCustomTag("goal")} />
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-bold uppercase text-slate-600">{t("notesForTeacher")}</span>
        <textarea
          value={form.notes_for_teacher ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes_for_teacher: e.target.value }))}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
          className="mt-1 h-4 w-4"
        />
        <span>{t("setDefaultLearnerProfile")}</span>
      </label>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="h-11 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-700">
            {t("cancel")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving || !form.display_name.trim()}
          onClick={() => void submit()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("saveLearnerProfile")}
        </button>
      </div>
    </div>
  );
}

function ContextInput({
  label,
  value,
  onChange,
  suggestions = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
      />
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                value === item ? "border-teal-700 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

function ExplanationPreferenceSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t } = useLocale();
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase text-slate-600">{t("explanationPreference")}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
      >
        <option value="">-</option>
        <option value="examples_first">{t("explanationExamplesFirst")}</option>
        <option value="theory_first">{t("explanationTheoryFirst")}</option>
        <option value="step_by_step">{t("explanationStepByStep")}</option>
        <option value="visual_schema">{t("explanationVisualSchema")}</option>
        <option value="practice_first">{t("explanationPracticeFirst")}</option>
      </select>
    </label>
  );
}

function ChipEditor({
  title,
  seeds,
  selected,
  custom,
  setCustom,
  onToggle,
  onAdd,
}: {
  title: string;
  seeds: string[];
  selected: string[];
  custom: string;
  setCustom: (value: string) => void;
  onToggle: (tag: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase text-slate-600">{title}</p>
      <div className="flex flex-wrap gap-2">
        {seeds.map((tag) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                on ? "border-teal-700 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600",
              )}
            >
              {tag}
            </button>
          );
        })}
        {selected.filter((tag) => !seeds.includes(tag)).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className="inline-flex items-center gap-1 rounded-full border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700"
          >
            {tag}
            <X size={12} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
        />
        <button type="button" onClick={onAdd} aria-label={`Ajouter ${title}`} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700">
          +
        </button>
      </div>
    </div>
  );
}
