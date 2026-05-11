"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import type { VerificationLevel } from "@/lib/verification";
import type { Discipline } from "@/types";

type TeacherSnippet = {
  id: string;
  name: string;
  discipline: string;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
  price_per_lesson: number | null;
  location: string | null;
  verification_level: number | null;
};

function inferDiscipline(disciplineField: string | null, blogCategory: string): Discipline {
  const s = `${disciplineField ?? ""} ${blogCategory}`.toLowerCase();
  if (s.includes("musique") || s.includes("music") || s.includes("piano") || s.includes("guit")) return "Musique";
  if (
    s.includes("langue") ||
    s.includes("language") ||
    s.includes("espagnol") ||
    s.includes("spanish") ||
    s.includes("english") ||
    s.includes("français")
  ) {
    return "Langues";
  }
  return "Scolaire";
}

export function RelatedTeachersWidget({ category }: { category: string }) {
  const { t, formatPrice } = useLocale();
  const { user } = useAuth();
  const studentSearchHref = user ? "/student/search" : "/login?next=/student/search";
  const [teachers, setTeachers] = useState<TeacherSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();

      // First try: match by category
      const { data: exact } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select("id, name, discipline, image_url, rating, reviews, price_per_lesson, location, verification_level")
        .ilike("category", `%${category}%`)
        .order("rating", { ascending: false })
        .limit(3);

      if (exact && exact.length >= 2) {
        setTeachers(exact as TeacherSnippet[]);
        setLoading(false);
        return;
      }

      // Fallback: top verified teachers regardless of category
      const { data: fallback } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select("id, name, discipline, image_url, rating, reviews, price_per_lesson, location, verification_level")
        .order("verification_level", { ascending: false })
        .order("rating", { ascending: false })
        .limit(3);

      setTeachers((fallback ?? []) as TeacherSnippet[]);
      setLoading(false);
    };
    void load();
  }, [category]);

  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-[#F1EFE8] h-40" />
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[#6B6760]">{t("blogNoRelatedTeachers")}</p>
        <Link
          href={studentSearchHref}
          prefetch={false}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
        >
          {t("blogSeeAllTeachers")} <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="group rounded-2xl border border-[#E8E6DF] bg-white p-4 flex flex-col gap-3 hover:border-teal-500/40 hover:shadow-sm transition-all"
          >
            {/* Avatar + badge */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <TeacherAvatar
                  name={teacher.name}
                  category={inferDiscipline(teacher.discipline, category)}
                  imageUrl={teacher.image_url}
                  size={52}
                  ringClassName="ring-2 ring-teal-500/20"
                />
                {teacher.verification_level != null && teacher.verification_level > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <VerificationBadge level={teacher.verification_level as VerificationLevel} size="sm" showLabel={false} />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2C2C2A] text-sm truncate">{teacher.name}</p>
                <p className="text-[11px] text-[#6B6760] truncate">{teacher.discipline}</p>
              </div>
            </div>

            {/* Rating + price */}
            <div className="flex items-center justify-between text-xs text-[#6B6760]">
              {teacher.rating != null && teacher.rating > 0 ? (
                <span className="flex items-center gap-1 font-medium">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {teacher.rating.toFixed(1)}
                  {teacher.reviews != null && teacher.reviews > 0 && (
                    <span className="text-[10px] text-[#6B6760]/70">({teacher.reviews})</span>
                  )}
                </span>
              ) : (
                <span />
              )}
              {teacher.price_per_lesson != null && teacher.price_per_lesson > 0 && (
                <span className="font-bold text-teal-700 text-xs">
                  {formatPrice(teacher.price_per_lesson)}/h
                </span>
              )}
            </div>

            {/* CTA */}
            <Link
              href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
              className="mt-auto inline-flex h-8 w-full items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white hover:brightness-105 transition-all"
            >
              {t("blogViewProfile")}
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href={studentSearchHref}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline"
        >
          {t("blogSeeAllTeachers")} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
