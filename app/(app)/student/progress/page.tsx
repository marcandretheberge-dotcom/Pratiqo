"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { CompanionType } from "@/lib/companions";
import { useAuth } from "@/components/AuthProvider";
import { CreditsWidget, type CreditsTeacherOption } from "@/components/CreditsWidget";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { YoStudentCompanionCard } from "@/components/yo/YoStudentCompanionCard";
import { YoStepNavigator } from "@/components/yo/YoStepNavigator";
import { cn } from "@/lib/utils";
import { COMPLETED_LESSON_FOR_COMPANION_FILTER } from "@/lib/companion/rewards";

/**
 * Localized copy for the YoPratiqo bridge section on /student/progress.
 * Kept inline so /student/progress does not import anything from the
 * YoPratiqo product config — it just renders a small heading + CTA
 * back to the YoPratiqo hub at `/student/yopratiqo`.
 *
 * The YoStudentCompanionCard itself remains unchanged; this wrapper
 * only adds visible "this is the YoPratiqo zone" framing so a learner
 * who arrived from a YoPratiqo deck immediately recognizes their
 * companion + can jump back into the YoPratiqo hub in one click.
 */
const YOPRATIQO_SECTION_COPY = {
  fr: {
    heading: "Yoppo · mon compagnon YoPratiqo",
    body: "Yoppo, ton compagnon YoPratiqo, suit ton parcours. Pour voir l’ensemble du parcours YoPratiqo (Intro → Module 5), ouvre ton YoPratiqo.",
    cta: "Ouvrir YoPratiqo",
  },
  en: {
    heading: "Yoppo · my YoPratiqo companion",
    body: "Yoppo, your YoPratiqo companion, tracks your path. To see the full YoPratiqo route (Intro → Module 5), open your YoPratiqo.",
    cta: "Open YoPratiqo",
  },
  es: {
    heading: "Yoppo · mi compañero YoPratiqo",
    body: "Yoppo, tu compañero YoPratiqo, sigue tu recorrido. Para ver todo el recorrido (Intro → Módulo 5), abre tu YoPratiqo.",
    cta: "Abrir YoPratiqo",
  },
} as const;

type HomeworkItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "pending" | "submitted" | "reviewed";
};

export default function StudentProgressPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const yoLocale: "fr" | "en" | "es" =
    locale === "en" || locale === "es" ? locale : "fr";

  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState<boolean>(false);
  const [completedLessonCount, setCompletedLessonCount] = useState<number>(0);
  const [creditTeachers, setCreditTeachers] = useState<CreditsTeacherOption[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [completedHomeworkCount, setCompletedHomeworkCount] = useState(0);
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
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
          .or(COMPLETED_LESSON_FOR_COMPANION_FILTER),
        supabase.from("assignments").select("id, title, due_date, status").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("student_progress").select("watch_points, achievements").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("bookings").select("teacher_id").eq("student_id", user.id),
      ]);
      const profile = profRes.data;
      const completedLessons = countRes.count;
      const asg = asgRes.data;
      const bRows = bookingsRes.data;

      if (cancelled) return;
      const p = profile as { companion_type?: string | null; companion_chosen?: boolean | null } | null;
      const type = p?.companion_type;
      setCompanionType(type === "phoenix" || type === "forest" || type === "dragon" || type === "star" ? (type as CompanionType) : null);
      setCompanionChosen(Boolean(p?.companion_chosen));
      setCompletedLessonCount(typeof completedLessons === "number" ? completedLessons : 0);

      const hwRows = (asg || []) as unknown as { id: string; title: string; due_date: string | null; status: string | null }[];
      const mapped = hwRows.map((r): HomeworkItem => ({
        id: r.id,
        title: r.title,
        dueDate: r.due_date || null,
        status: r.status === "submitted" || r.status === "reviewed" ? r.status : "pending",
      }));
      const active = mapped.filter((item) => item.status !== "reviewed");
      active.sort((a, b) => {
        const statusDelta = (a.status === "submitted" ? 1 : 0) - (b.status === "submitted" ? 1 : 0);
        if (statusDelta !== 0) return statusDelta;
        return String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
      });
      setHomework(active);
      setCompletedHomeworkCount(mapped.length - active.length);

      const progRows = (progRes.data || []) as { watch_points?: unknown; achievements?: unknown }[];
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

  // ─── Section blocks ─────────────────────────────────────────
  // Each block is rendered exactly once and reused across the
  // mobile step list (button-driven step navigator) and the
  // desktop single-column layout, so a learner switching
  // viewports sees the same content. Auth state + Supabase data
  // flow are unchanged — this is purely a layout reshape.

  const creditsBlock =
    !loading && user ? (
      <CreditsWidget
        layout="progress"
        teachers={creditTeachers}
        lessonCount={completedLessonCount}
        companionType={companionType}
      />
    ) : (
      <div className="h-40 animate-pulse rounded-2xl bg-white/60" />
    );

  /*
   * YoPratiqo bridge section.
   *
   * Promoted ABOVE the legacy Pratiqo companion so a learner who
   * came in through the YoPratiqo product immediately sees their
   * companion + has a one-click path back to the dedicated
   * YoPratiqo hub (`/student/yopratiqo`). The legacy Pratiqo
   * companion card stays mounted right below — both are visible
   * on the same page so the cross-product story
   * (Pratiqo progress ↔ YoPratiqo path) is unambiguous.
   *
   * No new persistence, no AI surface, no raw quiz fields. This
   * is purely a visual + navigational reshape.
   */
  const yoBridgeBlock = (
    <section
      data-testid="yo-progress-bridge-section"
      data-yo-progress-bridge="section"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          data-testid="yo-progress-bridge-heading"
          className="text-[11px] font-bold uppercase tracking-widest text-[#0F6E56]"
        >
          {YOPRATIQO_SECTION_COPY[yoLocale].heading}
        </h2>
        <Link
          data-testid="yo-progress-bridge-cta"
          href="/student/yopratiqo"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-[#FFF4D6]"
        >
          {YOPRATIQO_SECTION_COPY[yoLocale].cta}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <p className="text-xs leading-relaxed text-[#0F6E56]/75">
        {YOPRATIQO_SECTION_COPY[yoLocale].body}
      </p>
      <YoStudentCompanionCard locale={yoLocale} />
    </section>
  );

  // Legacy Pratiqo companion. Untouched.
  const legacyCompanionBlock = (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        {t("progressionYourCompanion")}
      </h2>
      <p className="mt-0.5 text-xs text-slate-600">{t("companionSubtitle")}</p>
      <CompanionCard
        companionType={companionType}
        companionChosen={companionChosen}
        lessonCount={completedLessonCount}
        loading={loading}
        variant="progress"
      />
    </section>
  );

  const homeworkBlock = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
          {t("progressHomeworkActiveTitle")}
        </h2>
        {completedHomeworkCount > 0 ? (
          <p className="text-[11px] font-semibold text-slate-500">
            {t("progressHomeworkCompletedCount").replace(
              "{count}",
              String(completedHomeworkCount),
            )}
          </p>
        ) : null}
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-600">
          …
        </div>
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
                const previousStatus = h.status;
                const nextStatus = next ? "submitted" : "pending";
                setHomework((prev) =>
                  prev.map((x) =>
                    x.id === h.id ? { ...x, status: nextStatus } : x,
                  ),
                );
                const res = await fetch("/api/homework", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: h.id, completed: next }),
                });
                if (!res.ok) {
                  setHomework((prev) =>
                    prev.map((x) =>
                      x.id === h.id ? { ...x, status: previousStatus } : x,
                    ),
                  );
                }
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );

  const watchPointsBlock = (
    <section className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
        {t("watchPoints")}
      </h2>
      {watchPoints.length > 0 ? (
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
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200/90 bg-white px-4 py-3 text-xs italic text-slate-500">
          —
        </p>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 bg-[#F3FAF6] pb-16 px-4 sm:px-6 lg:rounded-3xl lg:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("progressionTitle")}
        </h1>
        <p className="text-sm text-slate-600">{t("progressionSubtitle")}</p>
      </header>

      {/* Mobile (<lg): 3 focused steps the learner advances with
          explicit Back / Next chrome. Embedded variant so the
          chrome flows inline above the global (app) AppShell's
          bottom tab bar instead of competing for the same
          pinned-bottom real estate. */}
      <div className="lg:hidden">
        <YoStepNavigator
          surfaceId="student-progress"
          locale={yoLocale}
          variant="embedded"
          ariaLabel={t("progressionTitle")}
          steps={[
            {
              id: "credits-and-yo",
              label: t("progressionTitle"),
              content: (
                <div className="space-y-6">
                  {creditsBlock}
                  {yoBridgeBlock}
                  {legacyCompanionBlock}
                </div>
              ),
            },
            {
              id: "homework",
              label: t("progressHomeworkActiveTitle"),
              content: homeworkBlock,
            },
            {
              id: "watch-points",
              label: t("watchPoints"),
              content: watchPointsBlock,
            },
          ]}
        />
      </div>

      {/* Desktop (lg+): single column inside the (app) AppShell
          — the (app) shell is the workspace, so no nested
          workspace grid here. Layout is unchanged from the
          previous version of this page so existing desktop
          users see the same vertical stack. */}
      <div className="hidden space-y-6 lg:block">
        {creditsBlock}
        {yoBridgeBlock}
        {legacyCompanionBlock}
        {homeworkBlock}
        {watchPoints.length > 0 ? watchPointsBlock : null}
      </div>
    </div>
  );
}

function HomeworkRow({
  item,
  onToggle,
}: {
  item: HomeworkItem;
  onToggle: (next: boolean) => void;
}) {
  const { t } = useLocale();
  const dueSoon = Boolean(item.dueDate);
  const submitted = item.status === "submitted";
  const secondary = [submitted ? t("assignmentStatusSubmitted") : null, item.dueDate].filter(Boolean).join(" - ");
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <button type="button" onClick={() => onToggle(!submitted)} className="flex w-full items-center gap-3 text-left">
        <span
          className={
            submitted
              ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white"
              : "h-6 w-6 shrink-0 rounded-lg border border-slate-200 bg-white"
          }
          aria-hidden
        >
          {submitted ? <Check size={16} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={
              submitted ? "block text-sm font-medium text-slate-700" : "block text-sm font-medium text-slate-900"
            }
          >
            {item.title}
          </span>
          {secondary ? (
            <span
              className={cn(
                "mt-0.5 block text-xs font-medium",
                submitted ? "text-teal-700" : dueSoon ? "font-semibold text-amber-700" : "text-slate-600",
              )}
            >
              {secondary}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
