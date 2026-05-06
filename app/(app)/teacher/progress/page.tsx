"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { useLocale } from "../../../../lib/locale-context";
import type { TranslationKey } from "../../../../lib/translations";
import type { CompanionType } from "../../../../lib/companions";
import { getCompanionStage, getLessonsToNextStage, getProgressPercent } from "../../../../lib/companions";

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
  companionType: CompanionType | null;
  companionChosen: boolean;
  lessonCount: number;
};

type HomeworkStatus = "pending" | "submitted" | "reviewed";
type HomeworkSummary = { id: string; title: string; status: HomeworkStatus };
type StudentProfileRow = { name?: string | null; companion_type?: string | null; companion_chosen?: boolean | null };

function badgeFromLevel(lvl: string | null | undefined, t: (key: TranslationKey) => string): string {
  const s = (lvl || "").toLowerCase();
  if (s.includes("avanc") || s.includes("advanced")) return t("levelAdvanced");
  if (s.includes("inter") || s.includes("mid")) return t("levelIntermediate");
  return t("levelBeginner");
}

function normalizeHomeworkStatus(status: string | null | undefined): HomeworkStatus {
  return status === "submitted" || status === "reviewed" ? status : "pending";
}

function homeworkStatusLabel(status: HomeworkStatus, t: (key: TranslationKey) => string): string {
  if (status === "submitted") return t("assignmentStatusSubmitted");
  if (status === "reviewed") return t("assignmentStatusDone");
  return t("assignmentStatusTodo");
}

export default function TeacherProgressPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentAgg[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesByStudent, setNotesByStudent] = useState<Record<string, string>>({});
  const [homeworkByStudent, setHomeworkByStudent] = useState<Record<string, HomeworkSummary[]>>({});
  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      const { data: teacherRow } = await supabase.from("teachers").select("id, discipline").eq("user_id", user.id).maybeSingle();
      if (!teacherRow?.id) {
        if (!cancelled) {
          setStudents([]);
          setLoading(false);
        }
        return;
      }
      const tid = teacherRow.id as string;
      const disc = String((teacherRow as { discipline?: string }).discipline || "—");

      const { data: rows } = await supabase
        .from("bookings")
        .select("id, student_id, student_level, status")
        .eq("teacher_id", tid)
        .in("status", ["confirmed", "pending_payment"]);

      const list = (rows || []) as BookingRow[];
      const lessonCounts = new Map<string, number>();
      for (const r of list) {
        if (!r.student_id) continue;
        if (r.status === "confirmed") {
          lessonCounts.set(r.student_id, (lessonCounts.get(r.student_id) ?? 0) + 1);
        }
      }
      const map = new Map<string, { name: string; level: string | null }>();
      const companionByStudent = new Map<string, { type: CompanionType | null; chosen: boolean }>();
      for (const row of list) {
        const sid = row.student_id;
        if (!sid || map.has(sid)) continue;
        const { data: prow } = await supabase
          .from("profiles")
          .select("name, companion_type, companion_chosen")
          .eq("id", sid)
          .maybeSingle();
        const profileRow = prow as StudentProfileRow | null;
        map.set(sid, { name: profileRow?.name || t("studentDefaultName"), level: row.student_level ?? null });
        const ct = profileRow?.companion_type;
        const chosen = Boolean(profileRow?.companion_chosen);
        const type =
          ct === "phoenix" || ct === "forest" || ct === "dragon" || ct === "star" ? (ct as CompanionType) : null;
        companionByStudent.set(sid, { type, chosen });
      }

      const agg: StudentAgg[] = Array.from(map.entries()).map(([studentId, v]) => ({
        studentId,
        name: v.name,
        discipline: disc,
        levelLabel: v.level || "—",
        companionType: companionByStudent.get(studentId)?.type ?? null,
        companionChosen: companionByStudent.get(studentId)?.chosen ?? false,
        lessonCount: lessonCounts.get(studentId) ?? 0,
      }));

      const notes: Record<string, string> = {};
      const hw: Record<string, HomeworkSummary[]> = {};
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
          .is("archived_at", null)
          .in("status", ["pending", "submitted"])
          .order("created_at", { ascending: false })
          .limit(8);
        hw[sid] = ((asg || []) as { id: string; title: string; status: string | null }[])
          .map((a) => ({
            id: a.id,
            title: a.title,
            status: normalizeHomeworkStatus(a.status),
          }))
          .sort((a, b) => {
            const statusDelta = (a.status === "submitted" ? 0 : 1) - (b.status === "submitted" ? 0 : 1);
            if (statusDelta !== 0) return statusDelta;
            return a.title.localeCompare(b.title);
          });
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
  }, [user?.id, t]);

  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">{t("teacherSpaceLabel")}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">{t("myStudents")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("studentsSubtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white p-6">{t("noStudents")}</p>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p className="font-bold text-[#2C2C2A] truncate">{s.name}</p>
                      {s.companionChosen && s.companionType ? (
                        <span
                          title={`${(() => {
                            const st = getCompanionStage(s.companionType, s.lessonCount);
                            const next = getLessonsToNextStage(s.companionType, s.lessonCount);
                            return `${st.name} · ${next} cours pour évoluer`;
                          })()}`}
                          className="shrink-0"
                        >
                          {getCompanionStage(s.companionType, s.lessonCount).emoji}
                        </span>
                      ) : null}
                    </div>
                    {s.companionChosen && s.companionType ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-[11px] text-slate-500">
                          {getCompanionStage(s.companionType, s.lessonCount).name} · {s.lessonCount} cours
                        </p>
                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1D9E75]"
                            style={{ width: `${getProgressPercent(s.companionType, s.lessonCount)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 truncate">{s.discipline}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041]">
                        {badgeFromLevel(s.levelLabel, t)}
                      </span>
                      <span className="text-xs text-slate-500">{s.levelLabel}</span>
                    </div>
                  </div>
                  {open ? <ChevronUp className="text-slate-600 shrink-0" size={20} /> : <ChevronDown className="text-slate-600 shrink-0" size={20} />}
                </button>
                {open ? (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Notes de progression</p>
                      <p className="text-sm text-[#2C2C2A] whitespace-pre-wrap">{notesByStudent[s.studentId] || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">{t("progressHomeworkTitle")}</p>
                      {(homeworkByStudent[s.studentId] || []).length === 0 ? (
                        <p className="text-xs text-slate-500">{t("progressNoHomework")}</p>
                      ) : (
                        <ul className="space-y-1">
                          {homeworkByStudent[s.studentId].map((a) => (
                            <li key={a.id} className="text-sm flex justify-between gap-2">
                              <span className="truncate">{a.title}</span>
                              <span className="text-xs text-slate-500 shrink-0">{homeworkStatusLabel(a.status, t)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{t("progressUpdateSoon")}</p>
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
