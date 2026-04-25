"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, MapPin, Search, Star, Users, Video } from "lucide-react";
import type { Teacher } from "../types";
import { TEACHERS } from "../constants";
import { cn } from "../lib/utils";
import { getEnabledDisciplines } from "../lib/disciplines";
import { isEnabled } from "../lib/features";
import Logo from "../components/ui/Logo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { getSupabaseClient } from "../lib/supabase";
import {
  fetchTeacherDisciplinesMap,
  mergeTeachersWithDisciplines,
  teacherMatchesExploreCategory,
  teacherMatchesExploreSearch,
} from "../lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { getVerificationLevel } from "../lib/verification";
import { VerificationBadge } from "../components/VerificationBadge";
import { useLocale } from "../lib/locale-context";
import { useAuth } from "../components/AuthProvider";

type HeroMode = "student" | "teacher";

const TEACHERS_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, verification_level, identity_verified, diploma_verified, phone_verified";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, formatPrice } = useLocale();
  const [mode, setMode] = useState<HeroMode>("student");
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("All");
  const [geoLoading, setGeoLoading] = useState(false);

  const enabledHeroLabels = useMemo(() => getEnabledDisciplines().map((d) => d.label).join(" · "), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const checkRole = async () => {
      const supabase = getSupabaseClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) {
        router.push("/dashboard");
        return;
      }

      const row = profile as {
        role?: string | null;
        teacher_onboarding_complete?: boolean | null;
        companion_chosen?: boolean | null;
      };

      if (row.role === "teacher") {
        if (!row.teacher_onboarding_complete) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      if (!row.companion_chosen) {
        router.push("/student/choose-companion");
      } else {
        router.push("/dashboard");
      }
    };

    void checkRole();
  }, [user, authLoading, router]);

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
      const { data, error } = await supabase
        .from("teachers")
        .select(TEACHERS_SELECT)
        .order("verification_level", { ascending: false })
        .order("rating", { ascending: false });
      if (error || !data?.length) {
        await mergePlans(TEACHERS);
        setLoadingTeachers(false);
        return;
      }
      const mapped = data.map((r) => teacherRowToTeacher(r as TeacherRow));
      const discMap = await fetchTeacherDisciplinesMap(
        supabase,
        mapped.map((t) => t.id),
      );
      await mergePlans(mergeTeachersWithDisciplines(mapped, discMap));
      setLoadingTeachers(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers.filter((t) => {
      const catOk = teacherMatchesExploreCategory(t, activeCat);
      const qOk = !q || teacherMatchesExploreSearch(t, query) || "montréal".includes(q);
      return catOk && qOk;
    });
  }, [teachers, query, activeCat]);

  if (authLoading) return null;

  if (user) return null;

  const runSearch = () => {
    const q = query.trim();
    router.push(q ? `/student/search?q=${encodeURIComponent(q)}` : "/student/search");
  };

  const nearMe = () => {
    if (!("geolocation" in navigator)) {
      alert(t("nearMe"));
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
        alert(t("nearMe"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
      <header
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          zIndex: 50,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          borderBottom: "0.5px solid #D3D1C7",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Logo variant="dark" size="md" />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LocaleSwitcher />
          <Link
            href="/login"
            style={{
              fontSize: 13,
              color: "#1D9E75",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t("signIn")}
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
                    {t("iAmStudent")}
                  </TogglePill>
                  <TogglePill active={false} onClick={() => setMode("teacher")}>
                    {t("iAmTeacher")}
                  </TogglePill>
                </div>

                <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t("heroStudentTitle")}</h1>
                <p className="mt-3 text-center text-sm text-white/85 sm:text-base">{t("heroStudentSubtitle")}</p>

                <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[#2C2C2A] shadow-sm">
                    <Search size={18} className="shrink-0 text-slate-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder={t("searchPlaceholder")}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => runSearch()}
                    className="h-12 shrink-0 rounded-2xl bg-white px-6 text-sm font-bold text-[#0F6E56] hover:bg-white/95"
                  >
                    {t("search")}
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
                    {geoLoading ? "…" : t("nearMe")}
                  </button>
                </div>

                <div className="mx-auto mt-6 max-w-3xl">
                  <div className="flex flex-wrap justify-center gap-2">
                    {getEnabledDisciplines().map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveCat(d.label)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                          activeCat === d.label
                            ? "border-white bg-white text-[#0F6E56]"
                            : "border-white/30 bg-white/15 text-white hover:bg-white/20",
                        )}
                      >
                        {d.emoji} {d.label}
                      </button>
                    ))}
                    {isEnabled("group_sessions") ? (
                      <Link
                        href="/group-sessions"
                        className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        Cours groupe
                      </Link>
                    ) : null}
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
                  <p
                    className="mt-3 text-center"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}
                  >
                    D&apos;autres disciplines arrivent bientôt 🚀
                  </p>
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
                    {t("iAmStudent")}
                  </TogglePill>
                  <TogglePill active onClick={() => setMode("teacher")} darkMode>
                    {t("iAmTeacher")}
                  </TogglePill>
                </div>

                <h1 className="text-center text-2xl font-bold leading-tight sm:text-4xl">
                  {t("heroTeacherTitle")}
                </h1>

                <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label={t("avgMonthlyRevenue")} value="2 400 $" />
                  <StatCard label={t("annualCashback")} value="576 $" />
                  <StatCard label={t("estimatedRebate")} value="~350 $" />
                  <StatCard label={t("annualTotal")} value="29 726 $" />
                </div>

                <ul className="mx-auto mt-10 max-w-xl space-y-3 text-sm text-white/90">
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    {t("benefitLoyalty")}
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    {t("benefitPayments")}
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                    {t("benefitLessons")}
                  </li>
                </ul>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <Link
                    href="/login?role=teacher"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1D9E75] px-8 text-sm font-bold text-white hover:brightness-105"
                  >
                    {t("joinFree")}
                  </Link>
                  <Link href="/login" className="text-sm font-medium text-white/80 underline underline-offset-2 hover:text-white">
                    {t("alreadyMember")} {t("signIn")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="border-y border-[#E8E6DF] bg-[#F1EFE8] py-4 text-center text-xs font-bold uppercase tracking-widest text-[#2C2C2A] sm:text-sm">
        <span className="text-[#1D9E75]">{t("statProfCount").split(" ")[0]}</span> {t("statProfCount").split(" ").slice(1).join(" ")}
        <span className="mx-3 text-[#D3D1C7]">·</span>
        {t("statWorldwide")}
        <span className="mx-3 text-[#D3D1C7]">·</span>
        <span className="text-[#1D9E75]">{t("statCashback").split(" ")[0]}</span> {t("statCashback").split(" ").slice(1).join(" ")}
        <span className="mx-3 text-[#D3D1C7]">·</span>
        {t("statRistourne")}
      </div>

      <footer className="bg-white border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-center">
          <Link href="/become-teacher" className="text-sm font-semibold text-[#888780] hover:text-[#2C2C2A] hover:underline">
            {t("areYouTeacher")} <span className="text-[#1D9E75]">{t("becomeTeacher")}</span>
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
  const { formatPrice } = useLocale();
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
            <div className="flex items-center gap-2 min-w-0">
              <p className="truncate font-semibold text-[#2C2C2A]">{teacher.name}</p>
              <VerificationBadge
                level={getVerificationLevel({
                  plan: teacher.profilePlan,
                  identity_verified: teacher.identityVerified,
                  diploma_verified: teacher.diplomaVerified,
                  is_verified: teacher.isVerified,
                  verification_level: teacher.verificationLevel ?? null,
                })}
                size="sm"
                showLabel={false}
                className="shrink-0 scale-90"
              />
            </div>
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
        <span className="font-bold text-[#1D9E75]">{formatPrice(Number(teacher.pricePerLesson))}/h</span>
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
