"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import type { Discipline } from "@/types";
import { PriceDisplay } from "@/components/PriceDisplay";
import { TeacherCardIdentityCheck } from "@/components/teachers/TeacherCardIdentityCheck";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { formatTeacherDisciplineLabel } from "@/lib/teacherMapper";
import { hasPublicTeacherReviews, isPublicTeacherIdentityVerified } from "@/lib/teachers/badges";
import { PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS } from "@/lib/teachers/display";

type TeacherSnippet = {
  id: string;
  name: string;
  discipline: string;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
  price_per_lesson: number | null;
  currency?: string | null;
  location: string | null;
  verification_level: number | null;
  identity_verified?: boolean | null;
  identity_verified_manually?: boolean | null;
  diploma_verified?: boolean | null;
  verified_experience_active?: boolean | null;
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
  const { t } = useLocale();
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
        .select("id, name, discipline, image_url, rating, reviews, price_per_lesson, currency, location, verification_level, identity_verified, identity_verified_manually, diploma_verified, verified_experience_active")
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
        .select("id, name, discipline, image_url, rating, reviews, price_per_lesson, currency, location, verification_level, identity_verified, identity_verified_manually, diploma_verified, verified_experience_active")
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
        {teachers.map((teacher) => {
          const identityVerified = isPublicTeacherIdentityVerified({
            identityVerified: teacher.identity_verified,
            identityVerifiedManually: teacher.identity_verified_manually,
          });
          const hasReviews = hasPublicTeacherReviews({
            rating: teacher.rating,
            reviewCount: teacher.reviews,
          });

          return (
          <div
            key={teacher.id}
            className={cn(
              "group flex h-full flex-col gap-3 rounded-2xl border border-[#E8E6DF] bg-white p-4",
              PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
            )}
          >
            <div className="flex items-start gap-3">
              <TeacherAvatar
                name={teacher.name}
                category={inferDiscipline(teacher.discipline, category)}
                imageUrl={teacher.image_url}
                size={52}
              />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1 text-sm font-bold text-[#2C2C2A]">
                  <span className="truncate">{formatPublicTeacherDisplayName(teacher.name)}</span>
                  <TeacherCardIdentityCheck verified={identityVerified} label={t("teacherBadgeIdentityVerified")} />
                </p>
                <p className="truncate text-[11px] text-[#6B6760]">{formatTeacherDisciplineLabel(teacher.discipline)}</p>
              </div>
              {hasReviews ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#6B6760]">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {Number(teacher.rating).toFixed(1)}
                  {teacher.reviews != null && teacher.reviews > 0 ? (
                    <span className="text-[10px] text-[#6B6760]/70">({teacher.reviews})</span>
                  ) : null}
                </span>
              ) : (
                <span className="shrink-0 rounded-lg border border-[#E8E6DF] px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {t("teacherCardNew")}
                </span>
              )}
            </div>

            {teacher.price_per_lesson != null && teacher.price_per_lesson > 0 ? (
              <div className="mt-auto flex items-center justify-end text-xs text-[#6B6760]">
                <span className="font-bold text-teal-700">
                  {/* When teacher_offers launches, this card should display the minimum active published offer price with “À partir de” copy. */}
                  <PriceDisplay
                    amount={teacher.price_per_lesson}
                    sourceCurrency={teacher.currency ?? "CAD"}
                    perHour
                    primaryClassName="font-bold text-teal-700"
                    secondaryClassName="block text-[9px] font-semibold text-slate-500"
                  />
                </span>
              </div>
            ) : null}

            {/* CTA */}
            <Link
              href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
              className="mt-auto inline-flex h-8 w-full items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white hover:brightness-105 transition-all"
            >
              {t("blogViewProfile")}
            </Link>
          </div>
          );
        })}
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
