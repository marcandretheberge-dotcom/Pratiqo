"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, MapPin, Search, Star, Users, Video } from "lucide-react";
import type { Discipline, Teacher } from "../types";
import { TEACHERS } from "../constants";
import { cn } from "../lib/utils";
import Logo from "../components/ui/Logo";
import { getSupabaseClient } from "../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";

type HeroMode = "student" | "teacher";

const TEACHERS_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km";

const QUICK: { label: string; cat?: Discipline; href?: string }[] = [
  { label: "Musique", cat: "Musique" },
  { label: "Danse", cat: "Danse" },
  { label: "Arts martiaux", cat: "Arts Martiaux" },
  { label: "Langues", cat: "Langues" },
  { label: "Cours groupe", href: "/group-sessions" },
];

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<HeroMode>("student");
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [activeCat, setActiveCat] = useState<Discipline | "All">("All");
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((t) => t.id).join(",");
        if (!ids) {
          setTeachers(list);
          return;
        }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          const body = (await pr.json()) as { plans?: Record<string, string> };
          const plans = body.plans ?? {};
          setTeachers(list.map((t) => ({ ...t, profilePlan: plans[t.id] ?? "free" })));
        } catch {
          setTeachers(list.map((t) => ({ ...t, profilePlan: "free" })));
        }
      };
      const { data, error } = await supabase.from("teachers").select(TEACHERS_SELECT).order("id");
      if (error || !data?.length) {
        await mergePlans(TEACHERS);
        setLoadingTeachers(false);
        return;
      }
      await mergePlans(data.map((r) => teacherRowToTeacher(r as TeacherRow)));
      setLoadingTeachers(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers.filter((t) => {
      const catOk = activeCat === "All" || t.category === activeCat;
      const qOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.discipline.toLowerCase().includes(q) ||
        "montréal".includes(q);
      return catOk && qOk;
    });
  }, [teachers, query, activeCat]);

  const runSearch = () => {
    const q = query.trim();
    router.push(q ? `/student/search?q=${encodeURIComponent(q)}` : "/student/search");
  };

  const nearMe = () => {
    if (!("geolocation" in navigator)) {
      alert("La géolocalisation n'est pas disponible.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoLoading(false);
        router.push("/student/search?near=1");
      },
      () => {
        setGeoLoading(false);
        alert("Active la localisation pour « Près de moi ».");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
      <header className="border-b border-[var(--p-border-light)] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" variant="dark" />
          </Link>
          <Link href="/login" className="text-sm font-semibold text-[#1D9E75] hover:underline">
            Se connecter
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "student" ? (
            <motion.div
              key="student"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#0F6E56] text-white"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8 sm:pb-10">
                <div className="mb-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-[rgba(0,0,0,0.2)] p-1 sm:inline-flex">
                  <TogglePill active onClick={() => setMode("student")}>
                    Je cherche un prof
                  </TogglePill>
                  <TogglePill active={false} onClick={() => setMode("teacher")}>
                    Je suis professeur
                  </TogglePill>
                </div>

                <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Trouve ton prof idéal</h1>
                <p className="mt-3 text-center text-sm text-white/85 sm:text-base">
                  Musique · Danse · Arts martiaux · Langues
                </p>

                <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[#2C2C2A] shadow-sm">
                    <Search size={18} className="shrink-0 text-slate-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="Discipline, ville…"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => runSearch()}
                    className="h-12 shrink-0 rounded-2xl bg-white px-6 text-sm font-bold text-[#0F6E56] hover:bg-white/95"
                  >
                    Rechercher
                  </button>
                </div>

                <div className="mx-auto mt-4 flex max-w-xl flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={() => void nearMe()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60"
                  >
                    <MapPin size={14} />
                    {geoLoading ? "…" : "Près de moi"}
                  </button>
                </div>

                <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
                  {QUICK.map((x) =>
                    x.href ? (
                      <Link
                        key={x.label}
                        href={x.href}
                        className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        {x.label}
                      </Link>
                    ) : (
                      <button
                        key={x.label}
                        type="button"
                        onClick={() => setActiveCat(x.cat!)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                          activeCat === x.cat
                            ? "border-white bg-white text-[#0F6E56]"
                            : "border-white/30 bg-white/15 text-white hover:bg-white/20",
                        )}
                      >
                        {x.label}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveCat("All")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-semibold",
                      activeCat === "All"
                        ? "border-white bg-white text-[#0F6E56]"
                        : "border-white/30 bg-white/15 text-white hover:bg-white/20",
                    )}
                  >
                    Tous
                  </button>
                </div>
              </div>

              <div className="bg-[#F1EFE8]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
                  <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-widest text-[#888780]">
                    Profils populaires
                  </p>
                  {loadingTeachers ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[#888780]" />
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered.slice(0, 6).map((t) => (
                        <LandingTeacherCard key={t.id} teacher={t} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="teacher"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#2C2C2A] text-white"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
                <div className="mb-6 flex flex-wrap justify-center gap-2 rounded-2xl bg-[rgba(0,0,0,0.2)] p-1 sm:inline-flex">
                  <TogglePill active={false} onClick={() => setMode("student")} darkMode>
                    Je cherche un prof
                  </TogglePill>
                  <TogglePill active onClick={() => setMode("teacher")} darkMode>
                    Je suis professeur
                  </TogglePill>
                </div>

                <h1 className="text-center text-2xl font-bold leading-tight sm:text-4xl">
                  La seule plateforme qui partage ses profits
                </h1>

                <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Revenu moyen / mois" value="2 400 $" />
                  <StatCard label="Cashback annuel" value="576 $" />
                  <StatCard label="Ristourne estimée" value="~350 $" />
                  <StatCard label="Total annuel" value="29 726 $" />
                </div>

                <ul className="mx-auto mt-10 max-w-xl space-y-3 text-sm text-white/90">
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    Programme Fidélité Bronze → Platine
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    Agenda et paiements automatiques
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    Cours individuels + cours de groupe
                  </li>
                </ul>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <Link
                    href="/login?role=teacher"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1D9E75] px-8 text-sm font-bold text-white hover:brightness-105"
                  >
                    Rejoindre gratuitement →
                  </Link>
                  <Link href="/login" className="text-sm font-medium text-white/80 underline underline-offset-2 hover:text-white">
                    Déjà inscrit ? Se connecter
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="border-y border-[#E8E6DF] bg-[#F1EFE8] py-4 text-center text-xs font-bold uppercase tracking-widest text-[#2C2C2A] sm:text-sm">
        <span className="text-[#1D9E75]">2 400+</span> Profs
        <span className="mx-3 text-[#D3D1C7]">·</span>
        #1 Mondial
        <span className="mx-3 text-[#D3D1C7]">·</span>
        <span className="text-[#1D9E75]">5%</span> Cashback
        <span className="mx-3 text-[#D3D1C7]">·</span>
        Ristourne
      </div>

      <footer className="bg-white border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-center">
          <Link href="/become-teacher" className="text-sm font-semibold text-[#888780] hover:text-[#2C2C2A] hover:underline">
            Tu es professeur ? <span className="text-[#1D9E75]">Devenir professeur</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

function TogglePill({
  children,
  active,
  onClick,
  darkMode,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  darkMode?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[140px] rounded-xl px-4 py-2.5 text-xs font-bold transition-colors sm:text-sm",
        active
          ? darkMode
            ? "bg-white text-[#2C2C2A] shadow-sm"
            : "bg-white text-[#0F6E56] shadow-sm"
          : "bg-transparent text-white/90 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#7FE0C3]">{value}</p>
    </div>
  );
}

function LandingTeacherCard({ teacher }: { teacher: Teacher }) {
  const initials = teacher.name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const avatarBg =
    teacher.category === "Musique"
      ? "bg-[rgba(29,158,117,0.14)] text-[#085041]"
      : teacher.category === "Arts Martiaux"
        ? "bg-[rgba(255,153,102,0.18)] text-[#C2462E]"
        : teacher.category === "Langues"
          ? "bg-[rgba(146,106,255,0.16)] text-[#5B3EC8]"
          : "bg-[rgba(29,158,117,0.14)] text-[#085041]";

  const availability = teacher.availability?.[0] ? String(teacher.availability[0]) : null;

  return (
    <Link
      href={`/login?next=${encodeURIComponent("/student/search")}`}
      className={cn(
        "block rounded-2xl bg-white p-4 text-left transition",
        "border border-[#E8E6DF] shadow-[0_12px_40px_rgba(44,44,42,0.06)] hover:shadow-[0_16px_55px_rgba(44,44,42,0.08)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarBg)}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#2C2C2A]">{teacher.name}</p>
            <p className="truncate text-xs text-[#888780]">{teacher.discipline}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A] border border-[#E8E6DF]">
          ★ {teacher.rating}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#888780]">
        <span className="inline-flex items-center gap-1">
          {teacher.teachingMode === "online" ? <Video size={12} /> : <Users size={12} />}
          {teacher.teachingMode === "online" ? "En ligne" : "Présentiel / mixte"}
        </span>
        <span className="font-bold text-[#1D9E75]">${teacher.pricePerLesson}/h</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {availability ? (
          <span className="inline-flex items-center rounded-full bg-[#E1F5EE] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#085041]">
            {availability}
          </span>
        ) : null}
        {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#888780]">
            <Star size={12} className="text-[#1D9E75]" /> Studio vérifié
          </span>
        ) : null}
      </div>
    </Link>
  );
}
