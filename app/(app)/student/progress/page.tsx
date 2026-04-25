"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { CompanionType } from "@/lib/companions";
import { CompanionWidget } from "@/components/CompanionWidget";
import { useAuth } from "@/components/AuthProvider";

export default function StudentProgressPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();

  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState<boolean>(false);
  const [lessonCount, setLessonCount] = useState<number>(0);
  const [loadingCompanion, setLoadingCompanion] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      setLoadingCompanion(true);
      const [{ data: profile }, { count: confirmedCount }] = await Promise.all([
        supabase.from("profiles").select("companion_type, companion_chosen").eq("id", user.id).maybeSingle(),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "confirmed"),
      ]);

      if (cancelled) return;
      const p = profile as { companion_type?: string | null; companion_chosen?: boolean | null } | null;
      const type = p?.companion_type;
      setCompanionType(
        type === "phoenix" || type === "forest" || type === "dragon" || type === "star" ? (type as CompanionType) : null,
      );
      setCompanionChosen(Boolean(p?.companion_chosen));
      setLessonCount(typeof confirmedCount === "number" ? confirmedCount : 0);
      setLoadingCompanion(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const showChooseLink = useMemo(() => !loadingCompanion && (!companionChosen || !companionType), [
    loadingCompanion,
    companionChosen,
    companionType,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#888780]">{t("studentProgressPageLabel")}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">{t("myProgress")}</h1>
        <p className="mt-2 text-sm text-[#888780] max-w-xl">{t("studentProgressIntro")}</p>
      </div>

      {companionType ? (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <CompanionWidget companionType={companionType} lessonCount={lessonCount} locale={locale} />
          <div className="min-w-[220px] flex-1 text-sm text-[#888780] pt-2">
            {showChooseLink ? (
              <Link href="/student/choose-companion" className="font-semibold text-[#1D9E75] hover:underline">
                {t("companionTitle")}
              </Link>
            ) : (
              <div className="text-[11px] uppercase tracking-widest font-bold text-[#6B6A64]">
                {lessonCount} {lessonCount === 1 ? t("lesson") : t("lessons")}
              </div>
            )}
          </div>
        </div>
      ) : showChooseLink ? (
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 text-sm text-[#6B6A64]">
          <Link href="/student/choose-companion" className="font-semibold text-[#1D9E75] hover:underline">
            {t("companionTitle")}
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E1F5EE] text-[#1D9E75]">
          <BookOpen size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#2C2C2A]">{t("studentProgressCardTitle")}</h2>
          <p className="mt-1 text-sm text-[#888780]">{t("studentProgressCardBody")}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:underline"
          >
            <CalendarDays size={18} />
            {t("studentProgressDashboardLink")}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
