"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, CheckCircle2, FileText, Loader2, Plus, Send, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { getSupabaseClient } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import type { Assignment } from "../types";
import { cn } from "../lib/utils";
import { notificationService } from "../services/notificationService";
import { useLocale } from "../lib/locale-context";

interface AssignmentHubProps {
  mode: "student" | "teacher";
}

type HubTab = "homework" | "practice" | "assign";

function mapAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    dueDate: (row.due_date as string) || undefined,
    status: row.status as Assignment["status"],
    createdAt: row.created_at as string,
    feedback: (row.feedback as string) || undefined,
  };
}

export function AssignmentHub({ mode }: AssignmentHubProps) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubTab, setHubTab] = useState<HubTab>("homework");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);

  const [newAssignment, setNewAssignment] = useState({
    studentId: "",
    title: "",
    description: "",
    dueDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const loadAssignments = async () => {
      if (mode === "student") {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });
        if (!cancelled && !error) setAssignments((data || []).map((r) => mapAssignment(r as Record<string, unknown>)));
      } else {
        const { data: teacherRow } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
        const slug = teacherRow?.id as string | undefined;
        if (!slug) {
          setAssignments([]);
        } else {
          const { data, error } = await supabase
            .from("assignments")
            .select("*")
            .eq("teacher_id", slug)
            .order("created_at", { ascending: false });
          if (!cancelled && !error) setAssignments((data || []).map((r) => mapAssignment(r as Record<string, unknown>)));
        }
      }
      if (!cancelled) setLoading(false);
    };

    const loadStudentsForTeacher = async () => {
      if (mode !== "teacher") return;
      const { data: teacherRow } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      const slug = teacherRow?.id as string | undefined;
      if (!slug) {
        setStudents([]);
        return;
      }
      const { data: bookings } = await supabase.from("bookings").select("student_id").eq("teacher_id", slug);
      const ids = Array.from(new Set((bookings || []).map((b) => b.student_id as string)));
      const list: { id: string; name: string }[] = [];
      for (const sid of ids) {
        const { data: pr } = await supabase.from("profiles").select("name").eq("id", sid).maybeSingle();
        list.push({ id: sid, name: (pr?.name as string) || `${t("studentDefaultName")} ${sid.slice(0, 4)}` });
      }
      if (!cancelled) setStudents(list);
    };

    void loadAssignments();
    void loadStudentsForTeacher();

    const channel = supabase
      .channel(`assignments:${user.id}:${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => {
        void loadAssignments();
        void loadStudentsForTeacher();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, mode, t]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAssignment.studentId || !newAssignment.title) return;

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data: trow } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      const slug = trow?.id as string | undefined;
      if (!slug) return;

      const { error } = await supabase.from("assignments").insert({
        teacher_id: slug,
        student_id: newAssignment.studentId,
        title: newAssignment.title,
        description: newAssignment.description || null,
        due_date: newAssignment.dueDate || null,
        status: "pending",
      });
      if (error) throw error;

      await notificationService.sendNotification({
        userId: newAssignment.studentId,
        title: t("notificationNewHomeworkTitle"),
        message: t("notificationNewHomeworkBody").replace("{title}", newAssignment.title),
        type: "assignment",
      });

      setHubTab("homework");
      setNewAssignment({ studentId: "", title: "", description: "", dueDate: "" });
    } catch (error) {
      console.error("Error creating assignment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Assignment["status"]) => {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
      if (error) throw error;

      const assignment = assignments.find((a) => a.id === id);
      if (assignment) {
        const { data: trow } = await supabase.from("teachers").select("user_id").eq("id", assignment.teacherId).maybeSingle();
        const teacherUserId = trow?.user_id as string | undefined;

        if (mode === "student" && teacherUserId) {
          await notificationService.sendNotification({
            userId: teacherUserId,
            title: t("notificationHomeworkSubmittedTitle"),
            message: t("notificationHomeworkSubmittedBody").replace("{title}", assignment.title),
            type: "assignment",
          });
        }
        if (mode === "teacher") {
          await notificationService.sendNotification({
            userId: assignment.studentId,
            title: t("notificationHomeworkReviewedTitle"),
            message: t("notificationHomeworkReviewedBody").replace("{title}", assignment.title),
            type: "assignment",
          });
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const tabs: HubTab[] = mode === "teacher" ? ["homework", "practice", "assign"] : ["homework", "practice"];

  const tabLabel = (tab: HubTab) => {
    if (tab === "homework") return t("homeworkTitle");
    if (tab === "practice") return t("practiceTitle");
    return t("assignTitle");
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary mb-4" />
        <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">{t("assignmentHubLoading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{t("assignmentHubDeckTitle")}</h3>
          <p className="text-xs text-slate-600">{t("assignmentHubDeckSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setHubTab(tab)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                hubTab === tab ? "bg-white text-brand-primary shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {tab === "assign" && mode === "teacher" ? (
                <span className="inline-flex items-center gap-1">
                  <Plus size={14} /> {tabLabel(tab)}
                </span>
              ) : (
                tabLabel(tab)
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hubTab === "assign" && mode === "teacher" && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreateAssignment}
            className="bg-white border border-brand-primary/20 rounded-3xl p-6 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">{t("assignmentHubStudentLabel")}</label>
                <select
                  required
                  value={newAssignment.studentId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, studentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
                >
                  <option value="">{t("assignmentHubSelectStudent")}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">{t("assignmentHubDueShort")}</label>
                <input
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">{t("assignmentHomeworkTitleLabel")}</label>
              <input
                required
                placeholder={t("assignmentHomeworkTitlePlaceholder")}
                value={newAssignment.title}
                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">{t("assignmentHomeworkDescLabel")}</label>
              <textarea
                rows={3}
                placeholder={t("assignmentHomeworkDescPlaceholder")}
                value={newAssignment.description}
                onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setHubTab("homework");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all"
              >
                {t("cancel")}
              </button>
              <button
                disabled={isSubmitting}
                className="bg-brand-primary text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {t("assignmentCreate")}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {hubTab === "practice" ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800">{t("practiceTitle")}</p>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">{t("assignmentHubPracticeBlurb")}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 pt-2">{t("watchPoints")}</p>
          <p className="text-xs text-slate-600">{t("addWatchPoint")}</p>
        </div>
      ) : hubTab === "homework" ? (
        <div className="grid grid-cols-1 gap-4">
          {assignments.length > 0 ? (
            assignments.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-slate-200 rounded-3xl p-5 flex items-start gap-4 hover:shadow-lg transition-all group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    a.status === "pending"
                      ? "bg-amber-50 text-amber-500"
                      : a.status === "submitted"
                        ? "bg-indigo-50 text-indigo-500"
                        : "bg-emerald-50 text-emerald-500",
                  )}
                >
                  {a.status === "reviewed" ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{a.title}</h4>
                    <div
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        a.status === "pending"
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : a.status === "submitted"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100",
                      )}
                    >
                      {a.status === "pending"
                        ? t("assignmentStatusTodo")
                        : a.status === "submitted"
                          ? t("assignmentStatusSubmitted")
                          : t("completed")}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{a.description || t("assignmentNoInstructions")}</p>

                  <div className="flex items-center gap-4 pt-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                      <Calendar size={12} />{" "}
                      {a.dueDate ? t("assignmentDuePrefix").replace("{date}", a.dueDate) : t("assignmentNoDue")}
                    </div>
                    {a.status === "pending" && mode === "student" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(a.id, "submitted")}
                        className="ml-auto text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                      >
                        {t("markComplete")} <ChevronRight size={10} />
                      </button>
                    )}
                    {a.status === "submitted" && mode === "teacher" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(a.id, "reviewed")}
                        className="ml-auto text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                      >
                        {t("validateHomework")} <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                  {mode === "teacher" ? (
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest pt-1">{t("teacherNotes")}</p>
                  ) : null}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl space-y-3">
              <FileText size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-600 font-medium">{t("noHomework")}</p>
              {mode === "teacher" ? (
                <button
                  type="button"
                  onClick={() => setHubTab("assign")}
                  className="text-sm font-bold text-brand-primary hover:underline"
                >
                  {t("addHomework")}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
