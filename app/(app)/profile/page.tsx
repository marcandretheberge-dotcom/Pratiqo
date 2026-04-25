"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { authDisplayName } from "../../../lib/authDisplay";
import { useLocale } from "../../../lib/locale-context";
import type { CompanionType } from "../../../lib/companions";
import { COMPANIONS, getCompanionStage, getLessonsToNextStage, getProgressPercent } from "../../../lib/companions";
import { LocaleSwitcher } from "../../../components/LocaleSwitcher";
import { cn } from "../../../lib/utils";

export default function StudentProfilePage() {
  const { user, profile } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessonCount, setLessonCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [points] = useState(0);
  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState(false);
  const [memberYear, setMemberYear] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
      setLoading(true);

      const [{ data: prof }, { data: bRows }, { count: confirmedCount }] = await Promise.all([
        supabase.from("profiles").select("companion_type, companion_chosen, created_at, dashboard").eq("id", user.id).maybeSingle(),
        supabase.from("bookings").select("teacher_id, status").eq("student_id", user.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "confirmed"),
      ]);

      if (cancelled) return;

      const p = prof as
        | { companion_type?: string | null; companion_chosen?: boolean | null; created_at?: string | null; dashboard?: any | null }
        | null;
      const ctype = p?.companion_type;
      setCompanionType(ctype === "phoenix" || ctype === "forest" || ctype === "dragon" || ctype === "star" ? (ctype as CompanionType) : null);
      setCompanionChosen(Boolean(p?.companion_chosen));
      const createdAt = p?.created_at || (user as any)?.created_at || null;
      setMemberYear(createdAt ? new Date(String(createdAt)).getFullYear() : null);

      const dash = p?.dashboard && typeof p.dashboard === "object" ? (p.dashboard as Record<string, unknown>) : {};
      setNotificationsEnabled(dash.notificationsEnabled !== false);

      const bookings = (bRows || []) as unknown as { teacher_id: string; status: string }[];
      const distinctTeachers = new Set<string>();
      for (const r of bookings) {
        if (r.teacher_id) distinctTeachers.add(r.teacher_id);
      }
      setTeacherCount(distinctTeachers.size);
      setLessonCount(typeof confirmedCount === "number" ? confirmedCount : 0);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) return null;

  const initials = authDisplayName(user)
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const stage = useMemo(() => (companionType ? getCompanionStage(companionType, lessonCount) : null), [companionType, lessonCount]);
  const stageName = useMemo(() => {
    if (!stage) return "";
    if (locale === "en-CA") return stage.nameEn;
    if (locale === "es") return stage.nameEs;
    return stage.name;
  }, [stage, locale]);
  const companionName = useMemo(() => {
    if (!companionType) return "";
    const c = COMPANIONS[companionType];
    if (locale === "en-CA") return c.nameEn;
    if (locale === "es") return c.nameEs;
    return c.name;
  }, [companionType, locale]);
  const percent = useMemo(() => (companionType ? getProgressPercent(companionType, lessonCount) : 0), [companionType, lessonCount]);
  const remaining = useMemo(() => (companionType ? getLessonsToNextStage(companionType, lessonCount) : 0), [companionType, lessonCount]);

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <section className="text-center space-y-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-lg font-bold">
          {initials || "?"}
        </div>
        <p className="text-[16px] font-bold text-[var(--p-text)]">{authDisplayName(user)}</p>
        <p className="text-[12px] text-[var(--p-text-muted)]">
          Élève · {t("studentMember")} {memberYear ?? "—"}
        </p>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-2">
        <StatCard label="Cours" value={loading ? "…" : String(lessonCount)} />
        <StatCard label={t("studentMyTeachers")} value={loading ? "…" : String(teacherCount)} />
        <StatCard label={t("studentPoints")} value={String(points)} />
      </section>

      {/* COMPANION */}
      <section
        className="rounded-3xl p-4 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]"
        style={{ background: "linear-gradient(135deg, #0F6E56, #1D9E75)" }}
      >
        {companionChosen && companionType && stage ? (
          <div className="flex items-center gap-4">
            <div className="text-[34px] leading-none">{stage.emoji}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{stageName}</p>
              <p className="text-[12px] text-white/80 truncate">{companionName}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-white/85">
                {remaining > 0 ? `${remaining} ${t("companionMoreLessons")}` : t("companionMaxLevel")}
              </p>
            </div>
            <ChevronRight className="text-white/80" size={18} />
          </div>
        ) : (
          <Link href="/student/choose-companion" className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t("companionNoCompanion")}</p>
            <ChevronRight className="text-white/80" size={18} />
          </Link>
        )}
      </section>

      {/* SETTINGS */}
      <section className="rounded-3xl border border-[var(--p-border-light)] bg-white p-4 shadow-sm space-y-3">
        <Row label="Langue">
          <div className="scale-90 origin-right">
            <LocaleSwitcher />
          </div>
        </Row>

        <Row label="Notifications">
          <button
            type="button"
            onClick={async () => {
              const next = !notificationsEnabled;
              setNotificationsEnabled(next);
              const supabase = getSupabaseClient();
              const { data: prof } = await supabase.from("profiles").select("dashboard").eq("id", user.id).maybeSingle();
              const dash = prof && typeof (prof as any).dashboard === "object" ? ((prof as any).dashboard as Record<string, unknown>) : {};
              await supabase.from("profiles").update({ dashboard: { ...dash, notificationsEnabled: next } }).eq("id", user.id);
            }}
            className={cn(
              "h-8 w-14 rounded-full border transition-colors relative",
              notificationsEnabled ? "bg-[#1D9E75] border-[#1D9E75]" : "bg-slate-100 border-[var(--p-border-light)]",
            )}
            aria-label="Notifications"
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all",
                notificationsEnabled ? "left-7" : "left-1",
              )}
            />
          </button>
        </Row>

        <Link
          href="/api/stripe/portal"
          className="flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center">
              <CreditCard size={18} />
            </span>
            <span className="text-sm font-semibold text-[var(--p-text)]">Mes paiements</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </Link>

        <button
          type="button"
          onClick={async () => {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
            router.replace("/");
          }}
          className="w-full rounded-2xl px-3 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
        >
          {t("signOut")}
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--p-border-light)] bg-white p-3 shadow-sm text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-muted)]">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-[#1D9E75]">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-[#F1EFE8] text-[#2C2C2A] flex items-center justify-center">
          <Bell size={18} />
        </span>
        <span className="text-sm font-semibold text-[var(--p-text)]">{label}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
