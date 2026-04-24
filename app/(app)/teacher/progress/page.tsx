"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { TeacherAgenda } from "../../../../components/TeacherAgenda";
import { AssignmentHub } from "../../../../components/AssignmentHub";

export default function TeacherProgressPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t?.id) {
        if (!cancelled) {
          setBookings([]);
          setLoading(false);
        }
        return;
      }
      const teacherSlug = t.id as string;
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("teacher_id", teacherSlug)
        .order("created_at", { ascending: false });
      if (cancelled || error) {
        setLoading(false);
        return;
      }
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
      setBookings(list);
      setLoading(false);
    };

    void load();
    const ch = supabase
      .channel("teacher-progress-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">Espace professeur</p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">Agenda &amp; élèves</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--p-text-muted)]">
          Vue calendrier, réservations et devoirs — même contenu que sur ton tableau de bord, en accès direct.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
        </div>
      ) : (
        <>
          <TeacherAgenda bookings={bookings} />
          <AssignmentHub mode="teacher" />
        </>
      )}
    </div>
  );
}
