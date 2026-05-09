"use client";

import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import type { Teacher } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { getVerificationLevel } from "@/lib/verification";
import { haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { getTeacherImageUrl, shouldUseUnoptimizedImage } from "@/lib/images";

function landingCardFormatSummary(teacher: Teacher, t: (k: TranslationKey) => string) {
  const m = teacher.teachingMode;
  const homeOn = teacher.homeLessonEnabled === true;
  const home = t("marketplaceTeachingAtHomeShort");
  const inPerson = t("teachingFormatInPerson");
  const online = t("teachingFormatOnline");
  const mixte = t("marketplaceTeachingMixteShort");

  if (m === "online") return online;
  if (m === "home") return home;
  if (m === "person") return homeOn ? `${home} / ${inPerson}` : inPerson;
  if (m === "both") return homeOn ? `${home} / ${mixte}` : mixte;
  if (m === "all") return homeOn ? `${home} / ${mixte}` : mixte;
  return mixte;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

function trimBio(bio: string) {
  const s = bio.replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 100) return s;
  return `${s.slice(0, 100).trim()}…`;
}

export function LandingTeacherListingCard({
  teacher,
  formatPrice,
  geo,
  onOpen,
  isHighlighted,
  onHoverChange,
}: {
  teacher: Teacher;
  formatPrice: (n: number) => string;
  geo: { lat: number; lng: number } | null;
  onOpen: () => void;
  isHighlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
}) {
  const { t } = useLocale();
  const lvl = getVerificationLevel({
    plan: teacher.profilePlan,
    identity_verified: teacher.identityVerified,
    diploma_verified: teacher.diplomaVerified,
    is_verified: teacher.isVerified,
    verification_level: teacher.verificationLevel ?? null,
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

  const hasAvailabilitySlots = Array.isArray(teacher.availability) && teacher.availability.length > 0;
  const availabilityHint = hasAvailabilitySlots
    ? teacher.availability!.slice(0, 2).join(" · ")
    : t("availabilityHintGeneric");

  const photoUrl = getTeacherImageUrl(teacher.imageUrl, { width: 128, height: 128, quality: 72, format: "webp" });
  const showVerifiedTag = lvl > 0;
  const neighborhoodHint = teacher.location?.neighborhood?.trim();

  const formatSummary = landingCardFormatSummary(teacher, t);

  const bioOneLine =
    typeof teacher.bio === "string" && teacher.bio.trim()
      ? trimBio(teacher.bio)
      : "";

  const commonButtonProps = {
    type: "button" as const,
    onClick: onOpen,
    onMouseEnter: () => onHoverChange?.(teacher.id),
    onMouseLeave: () => onHoverChange?.(null),
  };

  /** Marketplace grid cards: horizontal layout, circular photo (~80px). */
  return (
    <button
      {...commonButtonProps}
      className={cn(
        "group block w-full rounded-3xl border border-[#E8E6DF] bg-white text-left shadow-[0_10px_40px_rgba(44,44,42,0.06)] ring-1 ring-black/[0.02]",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:scale-[1.015] hover:border-teal-500/30 hover:shadow-xl",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
        isHighlighted
          ? "border-teal-500 shadow-[0_14px_48px_rgb(45_123_114/0.15)] ring-teal-500/15"
          : "",
      )}
    >
      <div className="relative p-4 sm:p-[1.125rem]">
        <div className="flex items-start gap-3.5 sm:gap-4">
          {photoUrl ? (
            <div className="relative shrink-0">
              <Image
                src={photoUrl}
                alt={t("imageAltTeacherProfile").replace("{name}", teacher.name)}
                width={88}
                height={88}
                sizes="(max-width: 640px) 72px, 84px"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                unoptimized={shouldUseUnoptimizedImage(photoUrl)}
                className="h-[4.5rem] w-[4.5rem] rounded-full border border-black/[0.04] object-cover shadow-sm sm:h-[5.25rem] sm:w-[5.25rem]"
              />
              {teacher.introSessionEnabled ? (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-700 shadow-sm ring-1 ring-white">
                  {t("introSessionBadge").replace("{n}", String(teacher.introSessionDurationMinutes ?? 45))}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="relative shrink-0">
              <div
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-black/[0.04] text-lg font-bold text-white shadow-inner sm:h-[5.25rem] sm:w-[5.25rem] sm:text-xl"
                style={{ background: "linear-gradient(135deg,var(--palette-teal-500),var(--palette-teal-700))" }}
              >
                {initials(teacher.name)}
              </div>
              {teacher.introSessionEnabled ? (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-700 shadow-sm ring-1 ring-white">
                  {t("introSessionBadge").replace("{n}", String(teacher.introSessionDurationMinutes ?? 45))}
                </span>
              ) : null}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#2C2C2A]">
                    {teacher.name}
                  </p>
                  <VerificationBadge level={lvl} size="sm" showLabel={false} className="shrink-0 scale-95" />
                </div>
                <p className="mt-0.5 truncate text-sm text-neutral-700">{teacher.discipline}</p>
                {showVerifiedTag ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
                    {t("landingCardVerifiedTeacher")}
                  </p>
                ) : null}
                {bioOneLine ? (
                  <p className="mt-1.5 line-clamp-1 text-xs leading-snug text-neutral-700">{bioOneLine}</p>
                ) : null}
                {neighborhoodHint ? (
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-neutral-700">
                    <MapPin size={11} className="shrink-0 text-teal-700" aria-hidden /> {neighborhoodHint}
                  </p>
                ) : null}
                {distKm != null ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-700">
                    <MapPin size={11} className="text-teal-800" aria-hidden />
                    {t("distanceFromYouKm").replace("{{n}}", String(distKm))}
                  </p>
                ) : null}
              </div>
              <span className="flex shrink-0 flex-col items-end gap-0.5 rounded-xl border border-[#F1EFE8] bg-[#FAFCFB] px-2 py-1.5 text-[12px] font-bold tabular-nums sm:flex-row sm:items-center sm:gap-1">
                <span className="flex items-center gap-0.5 text-[#CA9A06]">
                  <Star size={14} fill="#F4B400" className="text-[#F4B400]" strokeWidth={2} aria-hidden />
                  <span>{teacher.rating}</span>
                </span>
                <span className="text-[10px] font-normal text-neutral-700 sm:text-[11px]">({teacher.reviews})</span>
              </span>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3 border-t border-[#EFECE6] pt-3">
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <p className="max-w-[min(100%,12rem)] text-left text-[13px] font-semibold leading-snug tracking-tight text-[#374038] sm:max-w-[70%]">
                  {formatSummary}
                </p>
                {hasAvailabilitySlots ? (
                  <span className="inline-flex shrink-0 rounded-full bg-[#E8F8F2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#065a46] sm:text-[11px]">
                    {t("landingAvailableThisWeek")}
                  </span>
                ) : null}
              </div>
              <p className="shrink-0 text-right text-[15px] font-bold tracking-tight text-teal-700">
                {formatPrice(Number(teacher.pricePerLesson))}
                /h
              </p>
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-neutral-700 sm:text-xs">{availabilityHint}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
