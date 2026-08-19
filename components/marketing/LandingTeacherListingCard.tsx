"use client";

import { MapPin, Star, Users, Video } from "lucide-react";
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
import { TeacherCardBioSnippet } from "@/components/teachers/TeacherCardBioSnippet";
import {
  getTeacherCompactFormatLabel,
  getTeacherPublicAreaLabel,
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS,
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP,
  PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS,
  PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
  PUBLIC_TEACHER_CARD_LOCATION_CLASS,
  PUBLIC_TEACHER_CARD_LOCATION_ICON_CLASS,
} from "@/lib/teachers/display";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import { formatTeacherCardBioSnippet } from "@/lib/teacherProfile/formatPublicBio";

export function LandingTeacherListingCard({
  teacher,
  geo,
  onOpen,
  isHighlighted,
  onHoverChange,
}: {
  teacher: Teacher;
  geo: { lat: number; lng: number } | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const { t, locale } = useLocale();
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
  const hasAvailability =
    Array.isArray(teacher.availability) &&
    teacher.availability.some((slot) => String(slot ?? "").trim().length > 0);
  const formatLabel = getTeacherCompactFormatLabel(teacher, {
    online: t("filterOnline"),
    inPerson: t("filterInPerson"),
    home: t("modeHome"),
    hybrid: t("modeHybrid"),
  });
  const sanitizedBio = sanitizePublicTeacherBio(teacher.bio, locale);
  const bioSnippet = formatTeacherCardBioSnippet(sanitizedBio.content);
  const areaLabel = getTeacherPublicAreaLabel(teacher);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHoverChange?.(teacher.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#E8E6DF] bg-white p-4 text-left shadow-[0_10px_32px_rgba(44,44,42,0.055)]",
        PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
        isHighlighted ? "border-teal-500 ring-1 ring-teal-500/20" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <TeacherAvatar
            name={teacher.name}
            category={teacher.category}
            imageUrl={teacher.imageUrl}
            size={PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP}
            className={PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS}
          />
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1 text-[15px] font-bold leading-tight tracking-tight text-[#2C2C2A]">
              <span className="truncate">{formatPublicTeacherDisplayName(teacher.name)}</span>
              <TeacherCardIdentityCheck verified={identityVerified} label={t("teacherBadgeIdentityVerified")} />
            </p>
          </div>
        </div>
        {hasReviews ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-[#2C2C2A]">
            <Star size={12} className="text-amber-500" fill="currentColor" aria-hidden />
            {Number(teacher.rating).toFixed(1)}
            <span className="font-medium text-slate-600">({Number(teacher.reviews)})</span>
          </span>
        ) : null}
        {/* Future: show “Nouveau” only for teachers created within a defined recent window, not for every unrated teacher. */}
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <p className={PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS}>{formatTeacherCardDisciplines(teacher)}</p>
        <TeacherCardBioSnippet text={bioSnippet} />
        {areaLabel || distKm != null ? (
          <p className={PUBLIC_TEACHER_CARD_LOCATION_CLASS}>
            {areaLabel ? <MapPin className={PUBLIC_TEACHER_CARD_LOCATION_ICON_CLASS} aria-hidden /> : null}
            <span className="min-w-0 truncate">
              {areaLabel}
              {areaLabel && distKm != null ? " · " : null}
              {distKm != null ? t("distanceFromYouKm").replace("{{n}}", String(distKm)) : null}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#E8E6DF] pt-3 text-xs text-slate-600 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {formatLabel ? (
            <span className="inline-flex items-center gap-1">
              {teacher.teachingMode === "online" ? <Video size={12} aria-hidden /> : <Users size={12} aria-hidden />}
              {formatLabel}
            </span>
          ) : null}
          {hasAvailability ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
              {t("availableThisWeekMatch")}
            </span>
          ) : null}
        </span>
        {Number(teacher.pricePerLesson) > 0 ? (
          <span className="font-bold text-[#0F766E] min-[420px]:text-right">
            {/* When teacher_offers launches, this card should display the minimum active published offer price with “À partir de” copy. */}
            <PriceDisplay
              amount={Number(teacher.pricePerLesson)}
              sourceCurrency={teacher.currency ?? "CAD"}
              perHour
              primaryClassName="font-bold tabular-nums text-[#0F766E]"
              secondaryClassName="block w-full text-[9px] font-semibold text-slate-500"
              className="justify-end"
            />
          </span>
        ) : null}
      </div>
    </button>
  );
}
