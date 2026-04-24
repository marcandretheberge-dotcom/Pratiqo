"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Settings, UserRound } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { authAvatarUrl, authDisplayName } from "../../../lib/authDisplay";

type BookingRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  status: string;
};

export default function StudentProfilePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === "teacher") {
      router.replace("/dashboard");
    }
  }, [profile?.role, router]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled || error) {
        setLoading(false);
        return;
      }
      const list: BookingRow[] = [];
      for (const row of rows || []) {
        const tid = row.teacher_id as string;
        const { data: trow } = await supabase.from("teachers").select("name").eq("id", tid).maybeSingle();
        list.push({
          id: row.id as string,
          teacherId: tid,
          teacherName: (trow?.name as string) || "Professeur",
          date: (row.date as string) || "",
          time: (row.time as string) || "",
          status: (row.status as string) || "",
        });
      }
      setBookings(list);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) return null;

  const teachersMap = new Map<string, string>();
  for (const b of bookings) {
    if (!teachersMap.has(b.teacherId)) teachersMap.set(b.teacherId, b.teacherName);
  }
  const myTeachers = [...teachersMap.entries()];
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "booked");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={authAvatarUrl(user) || `https://ui-avatars.com/api/?name=${encodeURIComponent(authDisplayName(user))}`}
            alt=""
            className="h-20 w-20 rounded-2xl border border-[var(--p-border-light)] object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">Profil élève</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--p-text)]">
              <UserRound size={26} className="text-[#1D9E75]" />
              {authDisplayName(user)}
            </h1>
            <p className="mt-1 text-sm text-[var(--p-text-muted)] capitalize">{profile?.role || "Élève"}</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 self-start rounded-full border border-[var(--p-border-light)] px-4 text-sm font-semibold text-[var(--p-text)] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]"
          >
            <Settings size={18} />
            Tableau de bord
          </Link>
        </div>
        <p className="mt-4 text-xs text-[var(--p-text-muted)]">
          Les paramètres de compte Google sont gérés depuis ton fournisseur. Pour les cours, utilise{" "}
          <Link href="/dashboard" className="font-semibold text-[#1D9E75] underline">
            Mes cours
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
          <Calendar size={16} className="text-[#1D9E75]" />
          Prochains cours
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
          </div>
        ) : upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--p-border-light)] bg-white p-6 text-sm text-[var(--p-text-muted)]">
            Aucune réservation à venir.{" "}
            <Link href="/student/search" className="font-semibold text-[#1D9E75] underline">
              Trouver un prof
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 8).map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-1 rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--p-text)]">{b.teacherName}</p>
                  <p className="text-xs text-[var(--p-text-muted)]">
                    {b.date} · {b.time}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase text-[#1D9E75]">{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">Mes professeurs</h2>
        {myTeachers.length === 0 ? (
          <p className="text-sm text-[var(--p-text-muted)]">Tu n&apos;as pas encore réservé avec un prof.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {myTeachers.map(([id, name]) => (
              <li key={id}>
                <Link
                  href={`/teacher/profile/${id}`}
                  className="inline-flex items-center rounded-full border border-[var(--p-border-light)] bg-white px-4 py-2 text-sm font-medium text-[var(--p-text)] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
