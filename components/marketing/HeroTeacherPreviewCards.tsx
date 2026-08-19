"use client";

import { MapPin, Star } from "lucide-react";
import type { Teacher } from "@/types";
import { haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { PriceDisplay } from "@/components/PriceDisplay";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { TeacherCardIdentityCheck } from "@/components/teachers/TeacherCardIdentityCheck";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { formatTeacherCardDisciplines } from "@/lib/teacherMapper";
import { hasPublicTeacherReviews, isPublicTeacherIdentityVerified } from "@/lib/teachers/badges";
import { getTeacherCompactFormatLabel, PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS } from "@/lib/teachers/display";

export function HeroTeacherPreviewCards({
  teachers,
  isExampleFallback,
  geo,
  onOpen,
}: {
  teachers: Teacher[];
  isExampleFallback: boolean;
  geo: { lat: number; lng: number } | null;
  onOpen: (t: Teacher) => void;
}) {
  const { t } = useLocale();
  const stack = teachers.slice(0, 3);
  if (stack.length === 0) return null;

  return (
    <div
      className="relative mx-auto w-full max-w-[360px] pb-4 pl-1 pr-2 pt-2 sm:max-w-sm"
      aria-label={t("heroTeacherPreviewStackHint")}
    >
      <div className="relative min-h-[300px] sm:min-h-[320px]">
        {stack.map((teacher, idx) => {
          const identityVerified = isPublicTeacherIdentityVerified({
            identityVerified: teacher.identityVerified,
          });
          const hasReviews = hasPublicTeacherReviews({
            rating: teacher.rating,
            reviewCount: teacher.reviews,
          });
          const distKm =
            geo && teacher.location?.lat != null && teacher.location?.lng != null
              ? Math.round(
                  haversineDistance(
                    geo.lat,
                    geo.lng,
                    teacher.location.lat as number,
                    teacher.location.lng as number,
                  ),
                )
              : null;
          const formatLabel = getTeacherCompactFormatLabel(teacher, {
            online: t("filterOnline"),
            inPerson: t("filterInPerson"),
            home: t("modeHome"),
            hybrid: t("modeHybrid"),
          });
          const rotations = ["-rotate-1", "rotate-1", "-rotate-[0.4deg]"] as const;

          return (
            <button
              key={teacher.id}
              type="button"
              onClick={() => onOpen(teacher)}
              className={cn(
                "group absolute left-0 right-0 px-1 text-left",
                PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
                "hover:z-40",
                rotations[idx % 3],
              )}
              style={{
                top: idx * 88,
                zIndex: 11 + idx,
              }}
            >
              <article className="rounded-3xl border border-[#E8E6DF] bg-white p-4 shadow-[0_14px_48px_rgba(44,44,42,0.1)]">
                {isExampleFallback ? (
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-700">
                    {t("heroTeacherPreviewSampleLabel")}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1 font-semibold text-[#2C2C2A]">
                      <span className="truncate">{formatPublicTeacherDisplayName(teacher.name)}</span>
                      <TeacherCardIdentityCheck verified={identityVerified} label={t("teacherBadgeIdentityVerified")} />
                    </p>
                    <p className="truncate text-xs text-neutral-700">{formatTeacherCardDisciplines(teacher)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {hasReviews ? (
                        <span className="inline-flex items-center gap-0.5 rounded-lg border border-[#E8E6DF] bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#2C2C2A]">
                          <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden />
                          {Number(teacher.rating).toFixed(1)}
                          <span className="font-medium text-neutral-700">({teacher.reviews})</span>
                        </span>
                      ) : (
                        <span className="rounded-lg border border-[#E8E6DF] bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {t("teacherCardNew")}
                        </span>
                      )}
                      {Number(teacher.pricePerLesson) > 0 ? (
                        <span className="text-[11px] font-bold text-teal-700">
                          {/* When teacher_offers launches, this card should display the minimum active published offer price with “À partir de” copy. */}
                          <PriceDisplay
                            amount={Number(teacher.pricePerLesson)}
                            sourceCurrency={teacher.currency ?? "CAD"}
                            perHour
                            primaryClassName="font-bold text-teal-700"
                            secondaryClassName="block w-full text-[9px] font-semibold text-slate-500"
                          />
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-neutral-700">
                      {formatLabel ? (
                        <span className="rounded-full bg-[#F1EFE8] px-2 py-0.5 font-medium text-[#2C2C2A]">
                          {formatLabel}
                        </span>
                      ) : null}
                      {distKm != null ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F1EFE8] px-2 py-0.5 font-medium text-[#2C2C2A]">
                          <MapPin size={10} aria-hidden /> {t("distanceFromYouKm").replace("{{n}}", String(distKm))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            </button>
          );
        })}
      </div>
    </div>
  );
}
