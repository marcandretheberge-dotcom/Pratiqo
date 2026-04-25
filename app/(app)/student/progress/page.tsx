"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage, getLessonsToNextStage, getProgressPercent } from "@/lib/companions";
import { useAuth } from "@/components/AuthProvider";

export default function StudentProgressPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();

  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState<boolean>(false);
  const [lessonCount, setLessonCount] = useState<number>(0);
  const [homework, setHomework] = useState<{ id: string; title: string; dueDate: string | null; completed: boolean }[]>([]);
  const [watchPoints, setWatchPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const [{ data: profile }, { count: confirmedCount }, { data: asg }, progRes] = await Promise.all([
        supabase.from("profiles").select("companion_type, companion_chosen").eq("id", user.id).maybeSingle(),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "confirmed"),
        supabase.from("assignments").select("id, title, due_date, status").eq("student_id", user.id).order("created_at", { ascending: false }),
        // `watch_points` may not exist in all DBs. We try and fall back to achievements.
        supabase.from("student_progress").select("watch_points, achievements").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]).catch((e) => {
        console.error(e);
        return [{ data: null }, { count: 0 }, { data: [] }, { data: [] }] as any;
      });

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
      // incomplete first
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
      {/* COMPANION */}
      <section
        className="w-full rounded-3xl p-6 text-white shadow-[0_24px_80px_rgba(15,110,86,0.22)]"
        style={{ background: "linear-gradient(135deg, #0F6E56, #1D9E75)" }}
      >
        {loading ? (
          <div className="h-20 rounded-2xl bg-white/10" />
        ) : hasCompanion && stage ? (
          <div className="text-center space-y-3">
            <div className="text-[40px] leading-none">{stage.emoji}</div>
            <div>
              <p className="text-[16px] font-bold">{stageName}</p>
              <p className="text-[12px] text-white/80">{companionName}</p>
            </div>
            <p className="text-[12px] text-white/90">
              {lessonCount} {lessonCount === 1 ? t("lesson") : t("lessons")}
            </p>
            <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[12px] text-white/85">
              {remaining > 0 ? `${remaining} ${t("companionMoreLessons")}` : t("companionMaxLevel")}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-white/90">{t("companionNoCompanion")}</p>
            <Link
              href="/student/choose-companion"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-[#0F6E56]"
            >
              {t("companionNoCompanion")} <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>
        )}
      </section>

      {/* HOMEWORK */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("homeworkTitle")}</h2>

        {loading ? (
          <div className="rounded-2xl border border-[var(--p-border-light)] bg-white p-6 text-sm text-[var(--p-text-muted)]">…</div>
        ) : homework.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--p-border-light)] bg-white p-6 text-sm text-[var(--p-text-muted)]">
            Aucun devoir en attente 🎉
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

      {/* WATCH POINTS */}
      {watchPoints.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">{t("watchPoints")}</h2>
          <ul className="space-y-2">
            {watchPoints.map((w, i) => (
              <li
                key={`${w}-${i}`}
                className="rounded-2xl border border-[var(--p-border-light)] bg-white p-4 shadow-sm"
                style={{ borderLeft: "4px solid #BA7517" }}
              >
                <p className="text-sm text-[var(--p-text)]">{w}</p>
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
    <li className="rounded-2xl border border-[var(--p-border-light)] bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(!item.completed)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span
          className={item.completed ? "h-6 w-6 rounded-lg bg-[#1D9E75] text-white flex items-center justify-center" : "h-6 w-6 rounded-lg border border-[var(--p-border-light)] bg-white"}
          aria-hidden
        >
          {item.completed ? <Check size={16} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className={item.completed ? "block text-sm text-[var(--p-text)] line-through opacity-70" : "block text-sm text-[var(--p-text)]"}>
            {item.title}
          </span>
          {item.dueDate ? (
            <span className={cn("block text-xs", dueSoon ? "text-[#BA7517] font-semibold" : "text-[var(--p-text-muted)]")}>
              {item.dueDate}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}
