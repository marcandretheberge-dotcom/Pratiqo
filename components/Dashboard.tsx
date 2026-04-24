"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Flame, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { authDisplayName } from "../lib/authDisplay";
import type { StudentProfile } from "../types";
import { AssignmentHub } from "./AssignmentHub";
import { TeacherAgenda } from "./TeacherAgenda";
import { useRouter } from "next/navigation";

interface BookingWithTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  status: string;
  studentLevel?: string;
  teachingMode?: string;
}

export function Dashboard() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const role = authProfile?.role as string | undefined;
  const isTeacherRole = role === "teacher";
  const isStudentRole = role === "student";

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([]);
  const [teacherBookings, setTeacherBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;
    if (!isTeacherRole && !isStudentRole) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    const loadProfile = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (cancelled || error) return;
      if (data) {
        const dash =
          typeof data.dashboard === "object" && data.dashboard !== null
            ? (data.dashboard as Record<string, unknown>)
            : {};
        if (dash.streak !== undefined) {
          setProfile({
            id: data.id,
            name: data.name || authDisplayName(user),
            email: data.email || user.email || "",
            activeSubscriptions: (dash.activeSubscriptions as StudentProfile["activeSubscriptions"]) || [],
            progress: (dash.progress as StudentProfile["progress"]) || {},
            badges: (dash.badges as StudentProfile["badges"]) || [],
            streak: Number(dash.streak) || 1,
            milestones: (dash.milestones as StudentProfile["milestones"]) || [],
          });
        } else {
          const newProfile: StudentProfile = {
            id: user.id,
            name: authDisplayName(user),
            email: user.email || "",
            activeSubscriptions: [],
            progress: {},
            badges: [{ id: "1", icon: "🔥", name: "Première Pratique", date: new Date().toISOString() }],
            streak: 1,
            milestones: [
              { id: "1", title: "Première session", completed: true },
              { id: "2", title: "5 leçons complétées", completed: false },
              { id: "3", title: "Maître de discipline", completed: false },
              { id: "4", title: "Série de 30 jours", completed: false },
            ],
          };
          await supabase
            .from("profiles")
            .update({
              dashboard: {
                activeSubscriptions: newProfile.activeSubscriptions,
                progress: newProfile.progress,
                badges: newProfile.badges,
                streak: newProfile.streak,
                milestones: newProfile.milestones,
              },
            })
            .eq("id", user.id);
          setProfile(newProfile);
        }
      }
    };

    const loadStudentBookings = async () => {
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      const list: BookingWithTeacher[] = [];
      for (const row of rows || []) {
        const tid = row.teacher_id as string;
        const { data: trow } = await supabase.from("teachers").select("name").eq("id", tid).maybeSingle();
        list.push({
          id: row.id as string,
          teacherId: tid,
          teacherName: (trow?.name as string) || "Professeur",
          date: (row.date as string) || "",
          time: (row.time as string) || "",
          status: row.status as string,
          studentLevel: row.student_level as string | undefined,
          teachingMode: row.teaching_mode as string | undefined,
        });
      }
      setBookings(list);
    };

    const loadTeacherBookings = async () => {
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t?.id) {
        setTeacherBookings([]);
        return;
      }
      const teacherSlug = t.id as string;
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("teacher_id", teacherSlug)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      const list: any[] = [];
      for (const row of rows || []) {
        const sid = row.student_id as string;
        const { data: prow } = await supabase.from("profiles").select("name").eq("id", sid).maybeSingle();
        list.push({
          id: row.id,
          ...row,
          studentName: (prow?.name as string) || "Élève",
        });
      }
      setTeacherBookings(list);
    };

    const refreshAll = async () => {
      try {
        if (isStudentRole) {
          await loadProfile();
          await loadStudentBookings();
        } else if (isTeacherRole) {
          await loadTeacherBookings();
        }
      } catch (e) {
        console.error("Dashboard refresh", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refreshAll();

    const ch = supabase
      .channel(`dashboard:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          if (isStudentRole) void loadProfile();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        if (isStudentRole) void loadStudentBookings();
        if (isTeacherRole) void loadTeacherBookings();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user, authLoading, isTeacherRole, isStudentRole]);

  if (!user || authLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center">
        <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Chargement du compte…</h2>
      </div>
    );
  }

  if (!isTeacherRole && !isStudentRole) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <p className="text-slate-600 font-medium">Configuration du profil en cours…</p>
        <p className="text-sm text-slate-500">Tu seras redirigé pour finaliser ton inscription.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center">
        <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Initialisation…</h2>
      </div>
    );
  }

  if (isTeacherRole) {
    return (
      <div className="space-y-6 pb-12">
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="ds-label text-[var(--p-text-subtle)]">Espace professeur</p>
            <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">Tableau de bord</h2>
            <p className="text-[14px] text-[var(--p-text-muted)] mt-1">Agenda, élèves et revenus</p>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="rounded-[14px] bg-[var(--p-dark-teal)] p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TeacherStat label="Revenus" value="$1,240" sub="+12% vs mois dernier" />
                <TeacherStat label="Élèves" value="—" sub="données démo" />
                <TeacherStat label="Réservations" value={teacherBookings.length.toString()} sub="côté prof" />
              </div>
            </div>

            <TeacherAgenda bookings={teacherBookings} />
            <AssignmentHub mode="teacher" />
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="rounded-[14px] bg-[var(--p-dark-teal)] p-8 text-white">
              <p className="ds-label text-[var(--p-mint-accent)]">Vue prof</p>
              <h3 className="text-2xl leading-tight mt-2">Gère ton activité</h3>
              <p className="text-[13px] text-[var(--p-mint-accent)]/90 mt-3 leading-relaxed">
                Agenda, réservations, devoirs et suivi élève depuis une seule plateforme.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="ds-label text-[var(--p-text-subtle)]">Espace élève</p>
          <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">Tableau de bord</h2>
          <p className="text-[14px] text-[var(--p-text-muted)] mt-1">Prochains cours, profs et pratique</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-6 rounded-3xl text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame size={24} className="animate-pulse" />
                  <span className="text-3xl font-bold">{profile?.streak || 1}</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">Série de jours</h4>
                  <p className="text-xs opacity-80 font-medium">Continue comme ça !</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Réservations</h4>
                  <p className="text-3xl font-bold text-brand-primary">{bookings.length}</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-brand-primary">
                  <Calendar size={24} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push("/student/search")}
                  className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
                >
                  Trouver un prof
                </button>
              </div>
            </div>
          </div>

          <AssignmentHub mode="student" />
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Ma semaine</h3>
              <Calendar size={14} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              {bookings.length > 0 ? (
                bookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-primary transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-900">{b.teacherName}</span>
                      <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter">{b.time}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{b.date}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Aucune leçon prévue</p>
                  <button
                    type="button"
                    onClick={() => router.push("/student/search")}
                    className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
                  >
                    Trouver un mentor
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-teal-900 rounded-3xl p-6 text-white space-y-4">
            <ShieldCheck size={32} className="text-teal-400" />
            <h4 className="font-bold text-lg leading-tight">Ta sécurité, notre priorité</h4>
            <p className="text-xs opacity-80 leading-relaxed">Profils vérifiés, notifications et paiements sécurisés.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[14px] bg-[#085041] p-5 border border-[rgba(159,225,203,0.15)]">
      <p className="ds-label text-[var(--p-mint-accent)]">{label}</p>
      <p className="text-[28px] leading-none text-white mt-3">{value}</p>
      <p className="text-[12px] text-[#5DCAA5] mt-2">{sub}</p>
    </div>
  );
}
