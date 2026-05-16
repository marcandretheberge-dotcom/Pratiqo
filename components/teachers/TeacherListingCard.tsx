"use client";

import Image from "next/image";
import { ChevronRight, Clock, Home, MapPin, ShieldCheck, Star, Users, Video } from "lucide-react";
import type { Teacher } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TeacherPriceTag } from "@/components/TeacherPriceTag";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { useLocale } from "@/lib/locale-context";
import { getTeacherImageUrl, shouldUseUnoptimizedImage } from "@/lib/images";
import type { Currency } from "@/lib/geoLocale";
import { cn } from "@/lib/utils";
import {
  resolveTeacherListingCardModel,
  type TeacherListingCardModel,
  type TeacherListingCardVariant,
} from "@/components/teachers/teacherListingCardUtils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

export function TeacherListingCard({
  teacher,
  variant,
  distanceKm,
  geo,
  onOpen,
  isHighlighted,
  onHoverChange,
}: {
  teacher: Teacher;
  variant: TeacherListingCardVariant;
  distanceKm?: number | null;
  geo?: { lat: number; lng: number } | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const { t } = useLocale();
  const model = resolveTeacherListingCardModel({ teacher, variant, t, distanceKm, geo });

  const commonButtonProps = {
    type: "button" as const,
    onClick: onOpen,
    onMouseEnter: () => onHoverChange?.(teacher.id),
    onMouseLeave: () => onHoverChange?.(null),
  };

  if (variant === "search") {
    return (
      <button
        {...commonButtonProps}
        className={cn(
          "group block min-h-[168px] w-full rounded-3xl border border-[#E8E6DF] bg-white p-3.5 text-left shadow-[0_12px_40px_rgba(44,44,42,0.06)]",
          "cursor-pointer transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-teal-500/35 hover:shadow-[0_18px_46px_rgba(44,44,42,0.10)]",
          "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
          isHighlighted && "border-teal-500 shadow-[0_18px_48px_rgba(15,110,86,0.12)] ring-1 ring-teal-500/20",
        )}
      >
        <SearchCardBody teacher={teacher} model={model} t={t} />
      </button>
    );
  }

  const photoUrl = getTeacherImageUrl(teacher.imageUrl, {
    width: 112,
    height: 112,
    quality: 72,
    format: "webp",
  });

  return (
    <button
      {...commonButtonProps}
      className={cn(
        "group block w-full min-h-[200px] sm:min-h-[212px] rounded-3xl border border-[#E8E6DF] bg-white text-left shadow-[0_10px_40px_rgba(44,44,42,0.06)] ring-1 ring-black/[0.02]",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-teal-500/30 hover:shadow-xl",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
        isHighlighted
          ? "border-teal-500 shadow-[0_14px_48px_rgb(45_123_114/0.15)] ring-teal-500/15"
          : "",
      )}
    >
      <div className="relative p-3 sm:p-3.5">
        <LandingCardBody teacher={teacher} model={model} t={t} photoUrl={photoUrl} />
      </div>
    </button>
  );
}

function LandingCardBody({
  teacher,
  model,
  t,
  photoUrl,
}: {
  teacher: Teacher;
  model: TeacherListingCardModel;
  t: ReturnType<typeof useLocale>["t"];
  photoUrl: string | null;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-3.5">
      {photoUrl ? (
        <div className="shrink-0">
          <Image
            src={photoUrl}
            alt={t("imageAltTeacherProfile").replace("{name}", teacher.name)}
            width={80}
            height={80}
            sizes="(max-width: 640px) 64px, 72px"
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            unoptimized={shouldUseUnoptimizedImage(photoUrl)}
            className="h-20 w-20 rounded-2xl border border-black/[0.04] object-cover shadow-md sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        </div>
      ) : (
        <div className="shrink-0">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl border border-black/[0.04] text-xl font-bold text-white shadow-inner sm:h-[4.5rem] sm:w-[4.5rem] sm:text-2xl"
            style={{ background: "linear-gradient(135deg,var(--palette-teal-500),var(--palette-teal-700))" }}
          >
            {initials(teacher.name)}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate text-base font-bold leading-tight tracking-tight text-[#2C2C2A]">
                {model.cardShortName}
              </p>
              <VerificationBadge level={model.verificationLevel} size="sm" showLabel={false} className="shrink-0 scale-95" />
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-neutral-600">{teacher.discipline}</p>
            <p
              className={cn(
                "mt-1.5 flex min-h-[1.25rem] items-center gap-1.5 text-sm tabular-nums",
                model.distanceLineIsGeoHint ? "font-semibold text-neutral-600" : "font-bold text-teal-800",
              )}
            >
              <MapPin
                size={15}
                className={cn("shrink-0", model.distanceLineIsGeoHint ? "text-neutral-500" : "text-teal-700")}
                aria-hidden
              />
              <span className="min-w-0 truncate">{model.distancePrimary}</span>
            </p>
            <div className="mt-1 flex min-h-[1.625rem] flex-wrap items-center gap-2">
              {model.showVerifiedTag ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                  <ShieldCheck size={12} className="shrink-0 text-teal-600" aria-hidden />
                  {t("landingCardVerifiedTeacher")}
                </span>
              ) : null}
              {model.showIntroBadge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-[#F3FAF6] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                  <Clock size={12} className="shrink-0 text-teal-700" aria-hidden />
                  {t("introSessionBadge").replace("{n}", String(model.introDuration))}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 min-h-[2.5rem] space-y-1">
              <p
                className={cn(
                  "line-clamp-1 text-xs leading-snug text-neutral-700",
                  !model.bioOneLine && "text-transparent select-none",
                )}
                aria-hidden={!model.bioOneLine}
              >
                {model.bioOneLine || "—"}
              </p>
              <p
                className={cn(
                  "flex min-h-[1.125rem] items-center gap-1 truncate text-[11px] font-medium text-neutral-700",
                  !model.showNeighborhoodSubline && "invisible",
                )}
              >
                <MapPin size={11} className="shrink-0 text-teal-700" aria-hidden />
                {model.neighborhoodHint || "—"}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-0.5 rounded-xl border border-[#F1EFE8] bg-[#FAFCFB] px-2 py-1.5 text-[12px] font-bold tabular-nums sm:flex-row sm:items-center sm:gap-1">
            <span className="flex items-center gap-0.5 text-[#CA9A06]">
              <Star size={14} fill="#F4B400" className="text-[#F4B400]" strokeWidth={2} aria-hidden />
              <span>{teacher.rating}</span>
            </span>
            <span className="text-[10px] font-normal text-neutral-700 sm:text-[11px]">({teacher.reviews})</span>
          </span>
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-3 border-t border-[#EFECE6] pt-2.5">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <p className="max-w-[min(100%,12rem)] text-left text-[13px] font-semibold leading-snug tracking-tight text-[#374038] sm:max-w-[70%]">
              {model.formatSummary}
            </p>
            {model.showLandingAvailableChip ? (
              <span className="inline-flex shrink-0 rounded-full bg-[#E8F8F2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#065a46] sm:text-[11px]">
                {t("landingAvailableThisWeek")}
              </span>
            ) : null}
          </div>
          <span className="shrink-0 text-right">
            <TeacherPriceTag
              amount={Number(teacher.pricePerLesson)}
              teacherCurrency={(teacher.currency as Currency | undefined) ?? null}
              perHour
              primaryClassName="text-[15px] font-bold tracking-tight text-teal-700"
            />
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-[11px] leading-relaxed text-neutral-700 sm:text-xs">
          {model.availabilityHint}
        </p>
      </div>
    </div>
  );
}

function SearchCardBody({
  teacher,
  model,
  t,
}: {
  teacher: Teacher;
  model: TeacherListingCardModel;
  t: ReturnType<typeof useLocale>["t"];
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={48} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[15px] font-bold text-[#2C2C2A]">{model.cardShortName}</p>
              <VerificationBadge level={model.verificationLevel} size="sm" showLabel={false} className="shrink-0 scale-90" />
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-[#6B6A65]">{teacher.discipline}</p>
            <p
              className={cn(
                "mt-1 flex min-h-[1.125rem] items-center gap-1.5 text-[13px] tabular-nums",
                model.distanceLineIsGeoHint ? "font-semibold text-[#6B6A65]" : "font-bold text-teal-800",
              )}
            >
              <MapPin
                size={14}
                className={cn("shrink-0", model.distanceLineIsGeoHint ? "text-neutral-500" : "text-teal-700")}
                aria-hidden
              />
              <span className="min-w-0 truncate">{model.distancePrimary}</span>
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <Star size={12} fill="currentColor" aria-hidden />
          {teacher.rating}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B6A65]">
        {model.formatLabels.slice(0, 3).map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[#F3FAF6] px-2.5 py-1 font-semibold text-[#2C2C2A]">
            {label === t("bookingOnline") ? (
              <Video size={12} aria-hidden />
            ) : label === t("modeHome") ? (
              <Home size={12} aria-hidden />
            ) : (
              <Users size={12} aria-hidden />
            )}
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
        {model.showIntroBadge ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
            <Clock size={11} aria-hidden />
            {t("introSessionBadge").replace("{n}", String(model.introDuration))}
          </span>
        ) : null}
        {model.firstAvailabilitySlot ? (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {model.firstAvailabilitySlot}
          </span>
        ) : null}
        {model.showEnterpriseTrusted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-[#6B6A65]">
            <ShieldCheck size={11} className="text-teal-700" aria-hidden /> {t("sortTrusted")}
          </span>
        ) : null}
      </div>
    </>
  );
}
