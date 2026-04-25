"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";

type BookingRow = {
  id: string;
  student_id: string;
  student_level?: string | null;
  status: string;
  studentName?: string;
};

type StudentAgg = {
  studentId: string;
  name: string;
  discipline: string;
  levelLabel: string;
  progressBadge: string;
};

const BADGE_FROM_LEVEL = (lvl: string | null | undefined): string => {
  const s = (lvl || "").toLowerCase();
  if (s.includes("avanc") || s.includes("advanced")) return "Avancé";
  if (s.includes("inter") || s.includes("mid")) return "Intermédiaire";
  return "Débutant";
};

export default function TeacherProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentAgg[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesByStudent, setNotesByStudent] = useState<Record<string, string>>({});
  const [homeworkByStudent, setHomeworkByStudent] = useState<Record<string, { id: string; title: string; status: string }[]>>({});
  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      const { data: t } = await supabase.from("teachers").select("id, discipline").eq("user_id", user.id).maybeSingle();
      if (!t?.id) {
        if (!cancelled) {
          setStudents([]);
          setLoading(false);
        }
        return;
      }
      const tid = t.id as string;
      const disc = String((t as { discipline?: string }).discipline || "—");

      const { data: rows } = await supabase
        .from("bookings")
        .select("id, student_id, student_level, status")
        .eq("teacher_id", tid)
        .in("status", ["confirmed", "booked", "pending_payment"]);

      const list = (rows || []) as BookingRow[];
      const map = new Map<string, { name: string; level: string | null }>();
      for (const row of list) {
        const sid = row.student_id;
        if (!sid || map.has(sid)) continue;
        const { data: prow } = await supabase.from("profiles").select("name").eq("id", sid).maybeSingle();
        map.set(sid, { name: (prow?.name as string) || "Élève", level: row.student_level ?? null });
      }

      const agg: StudentAgg[] = Array.from(map.entries()).map(([studentId, v]) => ({
        studentId,
        name: v.name,
        discipline: disc,
        levelLabel: v.level || "—",
        progressBadge: BADGE_FROM_LEVEL(v.level),
      }));

      const notes: Record<string, string> = {};
      const hw: Record<string, { id: string; title: string; status: string }[]> = {};
      for (const sid of map.keys()) {
        const { data: prog } = await supabase
          .from("student_progress")
          .select("notes")
          .eq("student_id", sid)
          .eq("teacher_id", tid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prog?.notes) notes[sid] = String(prog.notes);

        const { data: asg } = await supabase
          .from("assignments")
          .select("id, title, status")
          .eq("teacher_id", tid)
          .eq("student_id", sid)
          .order("created_at", { ascending: false })
          .limit(8);
        hw[sid] = ((asg || []) as { id: string; title: string; status: string }[]).map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status,
        }));
      }

      if (!cancelled) {
        setStudents(agg);
        setNotesByStudent(notes);
        setHomeworkByStudent(hw);
        setLoading(false);
      }
    };

    void load();
    const ch = supabase
      .channel("teacher-students")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">Espace professeur</p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">Mes élèves</h1>
        <p className="mt-2 text-sm text-slate-600">Suivi, notes et devoirs par élève.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white p-6">Aucun élève pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((s) => {
            const open = expanded === s.studentId;
            return (
              <li key={s.studentId} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : s.studentId)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#0f6e56] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#2C2C2A] truncate">{s.name}</p>
                    <p className="text-xs text-slate-600 truncate">{s.discipline}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041]">
                        {s.progressBadge}
                      </span>
                      <span className="text-xs text-slate-500">{s.levelLabel}</span>
                    </div>
                  </div>
                  {open ? <ChevronUp className="text-slate-400 shrink-0" size={20} /> : <ChevronDown className="text-slate-400 shrink-0" size={20} />}
                </button>
                {open ? (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notes de progression</p>
                      <p className="text-sm text-[#2C2C2A] whitespace-pre-wrap">{notesByStudent[s.studentId] || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Devoirs</p>
                      {(homeworkByStudent[s.studentId] || []).length === 0 ? (
                        <p className="text-xs text-slate-500">Aucun devoir enregistré.</p>
                      ) : (
                        <ul className="space-y-1">
                          {homeworkByStudent[s.studentId].map((a) => (
                            <li key={a.id} className="text-sm flex justify-between gap-2">
                              <span className="truncate">{a.title}</span>
                              <span className="text-xs text-slate-500 shrink-0">{a.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mise à jour détaillée de la progression : prochainement depuis cette fiche.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
