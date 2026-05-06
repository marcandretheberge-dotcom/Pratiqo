"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ArrowRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { useLocale } from "@/lib/locale-context";
import { VerificationBadge } from "@/components/VerificationBadge";
import type { VerificationLevel } from "@/lib/verification";

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

export function RelatedTeachersWidget({ category }: { category: string }) {
  const { t, formatPrice } = useLocale();
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
          href="/student/search"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1D9E75] hover:underline"
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
            className="group rounded-2xl border border-[#E8E6DF] bg-white p-4 flex flex-col gap-3 hover:border-[#1D9E75]/40 hover:shadow-sm transition-all"
          >
            {/* Avatar + badge */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {teacher.image_url ? (
                  <Image
                    src={teacher.image_url}
                    alt={teacher.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover border-2 border-[rgba(29,158,117,0.3)]"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#1D9E75,#0f6e56)" }}
                  >
                    {teacher.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
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
                <span className="font-bold text-[#1D9E75] text-xs">
                  {formatPrice(teacher.price_per_lesson)}/h
                </span>
              )}
            </div>

            {/* CTA */}
            <Link
              href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
              className="mt-auto inline-flex h-8 w-full items-center justify-center rounded-xl bg-[#1D9E75] text-xs font-bold text-white hover:brightness-105 transition-all"
            >
              {t("blogViewProfile")}
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/student/search"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D9E75] hover:underline"
        >
          {t("blogSeeAllTeachers")} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
