"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Teacher } from "../../../../types";
import { getSupabaseClient } from "../../../../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../../../../lib/teacherMapper";
import { TEACHERS } from "../../../../constants";

export default function TeacherProfileIndexPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase.from("teachers").select("*").order("id");
      if (error || !data?.length) {
        setTeachers(TEACHERS);
        return;
      }
      setTeachers(data.map((r) => teacherRowToTeacher(r as TeacherRow)));
    };

    void load();

    const channel = supabase
      .channel("teacher-profile-index")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="ds-label text-[var(--p-text-subtle)]">Professeurs</p>
        <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">Profil professeur</h2>
        <p className="text-[14px] text-[var(--p-text-muted)]">
          Sélectionnez un professeur pour afficher sa page profil.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teachers.map((t) => (
          <Link
            key={t.id}
            href={`/teacher/profile/${t.id}`}
            className="ds-card p-5 hover:shadow-[0_22px_70px_rgba(15,110,86,0.12)] transition-all"
          >
            <div className="flex items-center gap-4">
              <img
                src={t.imageUrl}
                alt={t.name}
                className="w-14 h-14 rounded-[14px] object-cover border border-[var(--p-light-teal-bg)]"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="ds-pill">{t.category}</span>
                <p className="text-[16px] font-medium text-[var(--p-text)] truncate mt-2">{t.name}</p>
                <p className="text-[13px] text-[var(--p-text-muted)] truncate">{t.discipline}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
