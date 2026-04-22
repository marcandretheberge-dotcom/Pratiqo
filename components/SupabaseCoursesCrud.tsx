"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseClient } from "../lib/supabase";
import { cn } from "../lib/utils";

const courseSchema = z.object({
  title: z.string().min(2, "Titre trop court"),
  description: z.string().optional(),
  price_cents: z.number().int().min(0),
});

type CourseForm = z.infer<typeof courseSchema>;

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  created_at: string;
};

export function SupabaseCoursesCrud() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CourseRow | null>(null);

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema) as Resolver<CourseForm>,
    defaultValues: { title: "", description: "", price_cents: 0 },
  });

  const isEditing = !!editing;

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    const { data, error: err } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    setRows((data as CourseRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    if (!editing) return;
    form.reset({
      title: editing.title,
      description: editing.description || "",
      price_cents: editing.price_cents,
    });
  }, [editing, form]);

  const onSubmit = async (values: CourseForm) => {
    setError(null);
    const supabase = getSupabaseClient();
    if (editing) {
      const { error: err } = await supabase
        .from("courses")
        .update({
          title: values.title,
          description: values.description || null,
          price_cents: values.price_cents,
        })
        .eq("id", editing.id);
      if (err) {
        setError(err.message);
        return;
      }
      setEditing(null);
      form.reset({ title: "", description: "", price_cents: 0 });
      await fetchRows();
      return;
    }

    const { error: err } = await supabase.from("courses").insert({
      title: values.title,
      description: values.description || null,
      price_cents: values.price_cents,
    });
    if (err) {
      setError(err.message);
      return;
    }
    form.reset({ title: "", description: "", price_cents: 0 });
    await fetchRows();
  };

  const onDelete = async (id: string) => {
    setError(null);
    const supabase = getSupabaseClient();
    const { error: err } = await supabase.from("courses").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    if (editing?.id === id) setEditing(null);
    await fetchRows();
  };

  const sql = useMemo(
    () => `create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price_cents integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

-- Demo policy: allow anonymous read/write.
-- For production, restrict by auth user id / roles.
create policy "anon read courses"
on public.courses for select
to anon
using (true);

create policy "anon write courses"
on public.courses for insert
to anon
with check (true);

create policy "anon update courses"
on public.courses for update
to anon
using (true)
with check (true);

create policy "anon delete courses"
on public.courses for delete
to anon
using (true);
`,
    [],
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2">
        <h3 className="text-lg font-bold text-slate-900">Supabase CRUD (table `courses`)</h3>
        <p className="text-xs text-slate-500 font-medium">
          1) Mets tes variables dans `.env.local` 2) crée la table dans Supabase SQL Editor 3) teste le CRUD.
        </p>
      </div>

      <details className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">
          SQL à coller dans Supabase (démo)
        </summary>
        <pre className="mt-4 text-[12px] overflow-x-auto whitespace-pre-wrap bg-white border border-slate-200 rounded-2xl p-4">
          {sql}
        </pre>
        <p className="mt-3 text-[11px] text-rose-600 font-semibold">
          Attention: ces policies anon sont uniquement pour démo.
        </p>
      </details>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 text-sm font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            {isEditing ? "Modifier" : "Créer"} un cours
          </h4>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                form.reset({ title: "", description: "", price_cents: 0 });
              }}
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:underline"
            >
              Annuler l’édition
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Titre" error={form.formState.errors.title?.message}>
            <input
              {...form.register("title")}
              className={inputClass(form.formState.errors.title)}
              placeholder="Ex: Piano débutant"
            />
          </Field>

          <Field label="Prix (cents)" error={form.formState.errors.price_cents?.message}>
            <input
              type="number"
              {...form.register("price_cents", { valueAsNumber: true })}
              className={inputClass(form.formState.errors.price_cents)}
              placeholder="4500"
            />
          </Field>
        </div>

        <Field label="Description" error={form.formState.errors.description?.message}>
          <textarea
            rows={3}
            {...form.register("description")}
            className={cn(
              "w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm outline-none transition-all resize-none",
              form.formState.errors.description ? "border-rose-300 focus:ring-2 focus:ring-rose-200" : "border-slate-200 focus:ring-2 focus:ring-teal-100 focus:border-brand-primary",
            )}
            placeholder="Optionnel"
          />
        </Field>

        <button
          disabled={form.formState.isSubmitting}
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-60"
        >
          {isEditing ? "Enregistrer" : "Créer"}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Liste</h4>
          <button
            onClick={fetchRows}
            className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
          >
            Rafraîchir
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-sm font-semibold text-slate-500">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm font-semibold text-slate-500">Aucun cours.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-900 truncate">{r.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary bg-teal-50 border border-teal-100 px-2 py-1 rounded-full">
                      {r.price_cents}c
                    </span>
                  </div>
                  {r.description ? (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{r.description}</p>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1 italic">Sans description</p>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold mt-2">id: {r.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(r)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:border-brand-primary hover:text-brand-primary transition-all"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        {error ? <span className="text-[10px] font-bold text-rose-600">{error}</span> : null}
      </div>
      {children}
    </div>
  );
}

function inputClass(hasError: unknown) {
  return cn(
    "w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
    hasError ? "border-rose-300 focus:ring-2 focus:ring-rose-200" : "border-slate-200 focus:ring-2 focus:ring-teal-100 focus:border-brand-primary",
  );
}

