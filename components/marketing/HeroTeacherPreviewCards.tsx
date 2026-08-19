"use client";

import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import type { Teacher } from "@/types";
import { haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { getTeacherImageUrl, shouldUseUnoptimizedImage } from "@/lib/images";
import { PriceDisplay } from "@/components/PriceDisplay";
import { TeacherBadgePill } from "@/components/TeacherBadgePill";
import { getCompactTeacherBadges } from "@/lib/teachers/badges";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";

function formatTeaching(teacher: Teacher, t: (k: TranslationKey) => string) {
  switch (teacher.teachingMode) {
    case "online":
      return t("teachingFormatOnline");
    case "person":
      return t("teachingFormatInPerson");
    case "home":
      return t("teachingFormatHome");
    case "both":
    case "all":
      return t("teachingFormatHybrid");
    default:
      return t("teachingFormatHybrid");
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

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
          const badges = getCompactTeacherBadges({
            teacherId: teacher.id,
            identityVerified: teacher.identityVerified,
            identityStatus: teacher.identityStatus,
            stripeIdentityStatus: teacher.stripeIdentityStatus,
            identityVerifiedManually: teacher.identityVerifiedManually,
            diplomaVerified: teacher.diplomaVerified,
            verifiedExperience: teacher.verifiedExperience,
            profilePlan: teacher.profilePlan,
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

          const rawPhoto = typeof teacher.imageUrl === "string" ? teacher.imageUrl.trim() : "";
          const photoUrl = rawPhoto
            ? getTeacherImageUrl(rawPhoto, { width: 96, height: 96, quality: 72, format: "webp" })
            : "";
          const rotations = ["-rotate-1", "rotate-1", "-rotate-[0.4deg]"] as const;

          return (
            <button
              key={teacher.id}
              type="button"
              onClick={() => onOpen(teacher)}
              className={cn(
                "group absolute left-0 right-0 px-1 text-left transition-all duration-200 ease-out hover:z-40",
                "cursor-pointer hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
                "hover:[&_article]:border-teal-500/30 hover:[&_article]:shadow-xl",
                rotations[idx % 3],
              )}
              style={{
                top: idx * 88,
                zIndex: 11 + idx,
              }}
            >
              <article className="rounded-3xl border border-[#E8E6DF] bg-white p-4 shadow-[0_14px_48px_rgba(44,44,42,0.1)] ring-1 ring-black/[0.02] transition-all duration-200">
                {isExampleFallback ? (
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-700">
                    {t("heroTeacherPreviewSampleLabel")}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      width={52}
                      height={52}
                      sizes="52px"
                      loading="lazy"
                      fetchPriority="low"
                      unoptimized={shouldUseUnoptimizedImage(photoUrl)}
                      className="h-[52px] w-[52px] shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-inner"
                      style={{ background: "linear-gradient(135deg,var(--palette-teal-500),var(--palette-teal-700))" }}
                    >
                      {initials(teacher.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-[#2C2C2A]">{publicFirstNameWithInitial(teacher.name)}</span>
                      {badges.slice(0, 1).map((badge) => (
                        <TeacherBadgePill key={badge.id} badge={badge} compact />
                      ))}
                    </div>
                    <p className="truncate text-xs text-neutral-700">{teacher.discipline}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {Number(teacher.reviews ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#FAFCFB] px-2 py-0.5 text-[11px] font-bold text-amber-600">
                          <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden /> {Number(teacher.rating).toFixed(1)}
                          <span className="font-medium text-neutral-700">({teacher.reviews})</span>
                        </span>
                      ) : null}
                      <span className="text-[11px] font-bold text-teal-700">
                        <PriceDisplay
                          amount={Number(teacher.pricePerLesson)}
                          sourceCurrency={teacher.currency ?? "CAD"}
                          perHour
                          primaryClassName="font-bold text-teal-700"
                          secondaryClassName="block w-full text-[9px] font-semibold text-slate-500"
                        />
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-neutral-700">
                      <span className="rounded-full bg-[#F1EFE8] px-2 py-0.5 font-medium text-[#2C2C2A]">
                        {formatTeaching(teacher, t)}
                      </span>
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
