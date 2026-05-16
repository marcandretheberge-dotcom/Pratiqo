"use client";

import { ChevronRight, Clock, Home, MapPin, ShieldCheck, Star, Users, Video } from "lucide-react";
import type { Teacher } from "@/types";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { TeacherPriceTag } from "@/components/TeacherPriceTag";
import { VerificationBadge } from "@/components/VerificationBadge";
import type { Currency } from "@/lib/geoLocale";
import { useLocale } from "@/lib/locale-context";
import { formatTeacherCardShortName, teacherCardLocationPlace } from "@/lib/teacherDisplayName";
import { cn } from "@/lib/utils";
import { getVerificationLevel } from "@/lib/verification";

export function TeacherResultCard({
  teacher,
  distanceKm,
  onOpen,
  isHighlighted = false,
  onHoverChange,
}: {
  teacher: Teacher;
  distanceKm: number | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const { t } = useLocale();
  const availability = teacher.availability?.[0] ? String(teacher.availability[0]) : null;
  const supportsOnline = ["online", "both", "all"].includes(teacher.teachingMode);
  const supportsInPerson = ["person", "both", "all"].includes(teacher.teachingMode);
  const supportsHome = Boolean(teacher.homeLessonEnabled);
  const formatLabels = [
    supportsOnline ? t("bookingOnline") : null,
    supportsInPerson ? t("inPerson") : null,
    supportsHome ? t("modeHome") : null,
  ].filter(Boolean) as string[];
  const introDuration = teacher.introSessionDurationMinutes ?? 45;

  const verificationLevel = getVerificationLevel({
    plan: teacher.profilePlan,
    identity_verified: teacher.identityVerified,
    diploma_verified: teacher.diplomaVerified,
    is_verified: teacher.isVerified,
    verification_level: teacher.verificationLevel ?? null,
  });

  const neighborhoodHint = teacher.location?.neighborhood?.trim();
  const placeFallback = teacherCardLocationPlace(teacher);
  const cardShortName = formatTeacherCardShortName(teacher.name);
  const distancePrimary =
    distanceKm != null
      ? t("distanceFromYouEmphasis").replace("{{n}}", String(Math.round(distanceKm)))
      : placeFallback
        ? t("teacherCardBasedInPlace").replace("{{place}}", placeFallback)
        : neighborhoodHint
          ? t("teacherCardNearPlace").replace("{{place}}", neighborhoodHint)
          : t("teacherCardDistanceNeedGeo");
  const distanceLineIsGeoHint = distanceKm == null && !placeFallback && !neighborhoodHint;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHoverChange?.(teacher.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        "group block min-h-[168px] w-full rounded-3xl border border-[#E8E6DF] bg-white p-3.5 text-left shadow-[0_12px_40px_rgba(44,44,42,0.06)]",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-teal-500/35 hover:shadow-[0_18px_46px_rgba(44,44,42,0.10)]",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
        isHighlighted && "border-teal-500 shadow-[0_18px_48px_rgba(15,110,86,0.12)] ring-1 ring-teal-500/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={48} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[15px] font-bold text-[#2C2C2A]">{cardShortName}</p>
              <VerificationBadge level={verificationLevel} size="sm" showLabel={false} className="shrink-0 scale-90" />
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-[#6B6A65]">{teacher.discipline}</p>
            <p
              className={cn(
                "mt-1 flex min-h-[1.125rem] items-center gap-1.5 text-[13px] tabular-nums",
                distanceLineIsGeoHint ? "font-semibold text-[#6B6A65]" : "font-bold text-teal-800",
              )}
            >
              <MapPin size={14} className={cn("shrink-0", distanceLineIsGeoHint ? "text-neutral-500" : "text-teal-700")} aria-hidden />
              <span className="min-w-0 truncate">{distancePrimary}</span>
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <Star size={12} fill="currentColor" aria-hidden />
          {teacher.rating}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B6A65]">
        {formatLabels.slice(0, 3).map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[#F3FAF6] px-2.5 py-1 font-semibold text-[#2C2C2A]">
            {label === t("bookingOnline") ? <Video size={12} aria-hidden /> : label === t("modeHome") ? <Home size={12} aria-hidden /> : <Users size={12} aria-hidden />}
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#E8E6DF] pt-2.5">
        <div className="min-w-0">
          <TeacherPriceTag
            amount={Number(teacher.pricePerLesson)}
            teacherCurrency={(teacher.currency as Currency | undefined) ?? null}
            perHour
            primaryClassName="text-base font-extrabold text-teal-700"
          />
          <p className="mt-1 text-[11px] font-medium text-[#6B6A65]">
            {teacher.reviews > 0
              ? t("teacherCardReviews").replace("{count}", String(teacher.reviews))
              : t("teacherCardNoReviewsYet")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-700 transition-transform group-hover:translate-x-0.5">
          {t("teacherCardViewProfile")}
          <ChevronRight size={14} aria-hidden />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {teacher.introSessionEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
            <Clock size={11} aria-hidden />
            {t("introSessionBadge").replace("{n}", String(introDuration))}
          </span>
        ) : null}
        {availability ? (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {availability}
          </span>
        ) : null}
        {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-[#6B6A65]">
            <ShieldCheck size={11} className="text-teal-700" aria-hidden /> {t("sortTrusted")}
          </span>
        ) : null}
      </div>
    </button>
  );
}
