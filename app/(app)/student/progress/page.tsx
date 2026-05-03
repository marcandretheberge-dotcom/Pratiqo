"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage, getLessonsToNextStage, getProgressPercent } from "@/lib/companions";
import { useAuth } from "@/components/AuthProvider";
import { CreditsWidget, type CreditsTeacherOption } from "@/components/CreditsWidget";
import { cn } from "@/lib/utils";

export default function StudentProgressPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();

  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState<boolean>(false);
  const [lessonCount, setLessonCount] = useState<number>(0);
  const [creditTeachers, setCreditTeachers] = useState<CreditsTeacherOption[]>([]);
  const [homework, setHomework] = useState<{ id: string; title: string; dueDate: string | null; completed: boolean }[]>([]);
  const [watchPoints, setWatchPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const [profRes, countRes, asgRes, progRes, bookingsRes] = await Promise.all([
        supabase.from("profiles").select("companion_type, companion_chosen").eq("id", user.id).maybeSingle(),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "confirmed"),
        supabase.from("assignments").select("id, title, due_date, status").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("student_progress").select("watch_points, achievements").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("bookings").select("teacher_id").eq("student_id", user.id),
      ]);
      const profile = profRes.data;
      const confirmedCount = countRes.count;
      const asg = asgRes.data;
      const bRows = bookingsRes.data;

      if (cancelled) return;
      const p = profile as { companion_type?: string | null; companion_chosen?: boolean | null } | null;
      const type = p?.companion_type;
      setCompanionType(type === "phoenix" || type === "forest" || type === "dragon" || type === "star" ? (type as CompanionType) : null);
      setCompanionChosen(Boolean(p?.companion_chosen));
      setLessonCount(typeof confirmedCount === "number" ? confirmedCount : 0);

      const hwRows = (asg || []) as unknown as { id: string; title: string; due_date: string | null; status: string | null }[];
      const mapped = hwRows.map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.due_date || null,
        completed: String(r.status || "").toLowerCase() === "reviewed",
      }));
      mapped.sort((a, b) => Number(a.completed) - Number(b.completed));
      setHomework(mapped);

      const progRows = ((progRes as any)?.data || []) as { watch_points?: unknown; achievements?: unknown }[];
      const points: string[] = [];
      for (const r of progRows) {
        const wp = r.watch_points;
        if (Array.isArray(wp)) {
          for (const x of wp) if (typeof x === "string") points.push(x);
        }
        const ach = r.achievements;
        if (Array.isArray(ach)) {
          for (const x of ach) if (typeof x === "string") points.push(x);
        }
      }
      setWatchPoints(Array.from(new Set(points)).slice(0, 8));

      const bookingTeachers = (bRows || []) as { teacher_id: string | null }[];
      const distinctTeacherIds = Array.from(
        new Set(bookingTeachers.map((r) => r.teacher_id).filter((x): x is string => Boolean(x))),
      );
      const teacherList: CreditsTeacherOption[] = [];
      await Promise.all(
        distinctTeacherIds.map(async (tid) => {
          const { data: tr } = await supabase
            .from("teachers")
            .select("id, name, discipline, image_url")
            .eq("id", tid)
            .maybeSingle();
          if (tr) {
            const row = tr as { id: string; name: string | null; discipline: string | null; image_url: string | null };
            teacherList.push({
              teacherId: row.id,
              name: row.name ?? tid,
              discipline: row.discipline,
              imageUrl: row.image_url,
            });
          }
        }),
      );
      setCreditTeachers(teacherList);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasCompanion = companionChosen && companionType;

  const stage = useMemo(() => {
    if (!companionType) return null;
    return getCompanionStage(companionType, lessonCount);
  }, [companionType, lessonCount]);

  const stageName = useMemo(() => {
    if (!stage) return "";
    if (locale === "en") return stage.nameEn;
    if (locale === "es") return stage.nameEs;
    return stage.name;
  }, [stage, locale]);

  const companionName = useMemo(() => {
    if (!companionType) return "";
    const c = COMPANIONS[companionType];
    if (locale === "en") return c.nameEn;
    if (locale === "es") return c.nameEs;
    return c.name;
  }, [companionType, locale]);

  const percent = useMemo(() => (companionType ? getProgressPercent(companionType, lessonCount) : 0), [companionType, lessonCount]);
  const remaining = useMemo(() => (companionType ? getLessonsToNextStage(companionType, lessonCount) : 0), [companionType, lessonCount]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 bg-[#F3FAF6] pb-16 px-4 sm:px-6 lg:rounded-3xl lg:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("progressionTitle")}</h1>
        <p className="text-sm text-slate-600">{t("progressionSubtitle")}</p>
      </header>

      {!loading && user ? (
        <CreditsWidget
          layout="progress"
          teachers={creditTeachers}
          lessonCount={lessonCount}
          companionType={companionType}
        />
      ) : (
        <div className="h-40 animate-pulse rounded-2xl bg-white/60" />
      )}

      {/* Companion — compact */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t("progressionYourCompanion")}</h2>
        <p className="mt-0.5 text-xs text-slate-600">{t("companionSubtitle")}</p>
        {loading ? (
          <div className="mt-3 h-14 rounded-xl bg-slate-100" />
        ) : hasCompanion && stage ? (
          <Link href="/student/choose-companion" className="mt-3 flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
            <span className="text-2xl leading-none">{stage.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{stageName}</p>
              <p className="text-xs text-slate-600">{companionName}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">
                {remaining > 0 ? `${remaining} ${t("companionMoreLessons")}` : t("companionMaxLevel")}
              </p>
            </div>
            <ChevronRight className="shrink-0 text-slate-400" size={18} />
          </Link>
        ) : (
          <Link
            href="/student/choose-companion"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm font-medium text-[#0F6E56] hover:bg-slate-50"
          >
            {t("companionNoCompanion")}
            <ChevronRight size={18} />
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{t("homeworkTitle")}</h2>
        {loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-600">…</div>
        ) : homework.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white p-6 text-sm text-slate-700 shadow-sm">
            {t("progressNoHomework")}
          </div>
        ) : (
          <ul className="space-y-2">
            {homework.map((h) => (
              <HomeworkRow
                key={h.id}
                item={h}
                onToggle={async (next) => {
                  setHomework((prev) => prev.map((x) => (x.id === h.id ? { ...x, completed: next } : x)));
                  const res = await fetch("/api/homework", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: h.id, completed: next }),
                  });
                  if (!res.ok) {
                    setHomework((prev) => prev.map((x) => (x.id === h.id ? { ...x, completed: !next } : x)));
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {watchPoints.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{t("watchPoints")}</h2>
          <ul className="space-y-2">
            {watchPoints.map((w, i) => (
              <li
                key={`${w}-${i}`}
                className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm"
              >
                {w}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HomeworkRow({
  item,
  onToggle,
}: {
  item: { id: string; title: string; dueDate: string | null; completed: boolean };
  onToggle: (next: boolean) => void;
}) {
  const dueSoon = Boolean(item.dueDate);
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <button type="button" onClick={() => onToggle(!item.completed)} className="flex w-full items-center gap-3 text-left">
        <span
          className={
            item.completed
              ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1D9E75] text-white"
              : "h-6 w-6 shrink-0 rounded-lg border border-slate-200 bg-white"
          }
          aria-hidden
        >
          {item.completed ? <Check size={16} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={
              item.completed ? "block text-sm text-slate-600 line-through" : "block text-sm font-medium text-slate-900"
            }
          >
            {item.title}
          </span>
          {item.dueDate ? (
            <span
              className={cn(
                "mt-0.5 block text-xs font-medium",
                dueSoon ? "font-semibold text-amber-700" : "text-slate-600",
              )}
            >
              {item.dueDate}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
