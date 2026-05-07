"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import {
  LearnerProfileForm,
  type LearnerProfileInput,
  type LearnerProfileRow,
} from "@/components/student/LearnerProfileForm";

function compactContext(row: LearnerProfileRow) {
  return [
    row.grade_level,
    row.academic_program?.toUpperCase(),
    row.learning_goals?.slice(0, 2).join(", "),
  ].filter(Boolean).join(" · ");
}

export default function StudentLearnersPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [rows, setRows] = useState<LearnerProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LearnerProfileRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("learner_profiles")
      .select("*")
      .eq("owner_user_id", user.id)
      .is("archived_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setRows((data ?? []) as LearnerProfileRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const save = async (input: LearnerProfileInput) => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    try {
      if (input.is_default) {
        await supabase.from("learner_profiles").update({ is_default: false }).eq("owner_user_id", user.id);
      }
      if (editing) {
        const { error } = await supabase
          .from("learner_profiles")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
          .eq("owner_user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learner_profiles").insert({
          ...input,
          owner_user_id: user.id,
        });
        if (error) throw error;
      }
      setCreating(false);
      setEditing(null);
      setMessage(t("savedOk"));
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  const archive = async (row: LearnerProfileRow) => {
    if (!user?.id) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("learner_profiles")
      .update({ archived_at: new Date().toISOString(), is_default: false })
      .eq("id", row.id)
      .eq("owner_user_id", user.id);
    if (error) setMessage(error.message);
    else await load();
    setSaving(false);
  };

  const setDefault = async (row: LearnerProfileRow) => {
    if (!user?.id) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    await supabase.from("learner_profiles").update({ is_default: false }).eq("owner_user_id", user.id);
    const { error } = await supabase
      .from("learner_profiles")
      .update({ is_default: true })
      .eq("id", row.id)
      .eq("owner_user_id", user.id);
    if (error) setMessage(error.message);
    else await load();
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="rounded-3xl bg-[#0F6E56] p-6 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]">
        <Link href="/profile" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white">
          <ArrowLeft size={16} />
          {t("studentTabProfile")}
        </Link>
        <h1 className="text-2xl font-bold">{t("learnerProfilesTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/82">{t("learnerProfilesSubtitle")}</p>
      </header>

      {message ? (
        <p className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          {message}
        </p>
      ) : null}

      {creating || editing ? (
        <LearnerProfileForm
          initial={editing ?? undefined}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={save}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0F6E56] px-5 text-sm font-bold text-white"
        >
          <Plus size={17} />
          {t("addLearnerProfile")}
        </button>
      )}

      <section className="rounded-3xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#1D9E75]" />
            {t("loading")}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#DCEAE3] bg-white p-8 text-center text-sm text-slate-600">
            {t("bookingLearnerContextHint")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{row.display_name}</p>
                      {row.is_default ? (
                        <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-bold text-[#0F6E56]">
                          {t("setDefaultLearnerProfile")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{compactContext(row) || t("teacherLearnerContextEmpty")}</p>
                    {row.subject_struggles?.length ? (
                      <p className="mt-2 text-xs text-slate-500">{row.subject_struggles.slice(0, 4).join(", ")}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700"
                  >
                    <Pencil size={13} />
                    {t("editLearnerProfile")}
                  </button>
                  {!row.is_default ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void setDefault(row)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-[#0F6E56]"
                    >
                      <Star size={13} />
                      {t("setDefaultLearnerProfile")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void archive(row)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-200 px-3 text-xs font-bold text-rose-700"
                  >
                    <Trash2 size={13} />
                    {t("archiveLearnerProfile")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
