"use client";

import React, { useEffect, useState } from "react";
import type { Teacher } from "../../../../../types";
import { getSupabaseClient } from "../../../../../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../../../../../lib/teacherMapper";
import { TeacherProfile } from "../../../../../components/TeacherProfile";
import { BookingModal } from "../../../../../components/BookingModal";
import { useRouter } from "next/navigation";

export default function TeacherProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("id", params.id).maybeSingle();
      if (error || !data) {
        setTeacher(null);
        return;
      }
      setTeacher(teacherRowToTeacher(data as TeacherRow));
    };

    void load();

    const channel = supabase
      .channel(`teacher-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teachers",
          filter: `id=eq.${params.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [params.id]);

  if (!teacher) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8">
        <p className="text-sm font-semibold text-slate-600">Professeur introuvable.</p>
      </div>
    );
  }

  return (
    <>
      <TeacherProfile
        teacher={teacher}
        onClose={() => router.push("/teacher/profile")}
        onBook={() => setBooking(true)}
      />
      {booking && <BookingModal teacher={teacher} onClose={() => setBooking(false)} />}
    </>
  );
}
