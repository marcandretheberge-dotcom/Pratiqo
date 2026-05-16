"use client";

import Image from "next/image";
import { Clock, MapPin, ShieldCheck, Star } from "lucide-react";
import type { Teacher } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TeacherPriceTag } from "@/components/TeacherPriceTag";
import { getVerificationLevel } from "@/lib/verification";
import { haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { getTeacherImageUrl, shouldUseUnoptimizedImage } from "@/lib/images";
import type { Currency } from "@/lib/geoLocale";
import { formatTeacherCardShortName, teacherCardLocationPlace } from "@/lib/teacherDisplayName";

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
  geo,
  onOpen,
  isHighlighted,
  onHoverChange,
}: {
  teacher: Teacher;
  /** @deprecated Price formatting now happens inside the card via `TeacherPriceTag`. Kept optional for backward compat. */
  formatPrice?: (n: number) => string;
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

  const photoUrl = getTeacherImageUrl(teacher.imageUrl, { width: 112, height: 112, quality: 72, format: "webp" });
  const showVerifiedTag = lvl > 0;
  const introDuration = teacher.introSessionDurationMinutes ?? 45;
  const neighborhoodHint = teacher.location?.neighborhood?.trim();
  const placeFallback = teacherCardLocationPlace(teacher);
  const cardShortName = formatTeacherCardShortName(teacher.name);
  const distancePrimary =
    distKm != null
      ? t("distanceFromYouEmphasis").replace("{{n}}", String(distKm))
      : placeFallback
        ? t("teacherCardBasedInPlace").replace("{{place}}", placeFallback)
        : neighborhoodHint
          ? t("teacherCardNearPlace").replace("{{place}}", neighborhoodHint)
          : t("teacherCardDistanceNeedGeo");
  const distanceLineIsGeoHint = distKm == null && !placeFallback && !neighborhoodHint;

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
                    {cardShortName}
                  </p>
                  <VerificationBadge level={lvl} size="sm" showLabel={false} className="shrink-0 scale-95" />
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-neutral-600">{teacher.discipline}</p>
                <p
                  className={cn(
                    "mt-1.5 flex min-h-[1.25rem] items-center gap-1.5 text-sm tabular-nums",
                    distanceLineIsGeoHint
                      ? "font-semibold text-neutral-600"
                      : "font-bold text-teal-800",
                  )}
                >
                  <MapPin
                    size={15}
                    className={cn("shrink-0", distanceLineIsGeoHint ? "text-neutral-500" : "text-teal-700")}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{distancePrimary}</span>
                </p>
                <div className="mt-1 flex min-h-[1.625rem] flex-wrap items-center gap-2">
                  {showVerifiedTag ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                      <ShieldCheck size={12} className="shrink-0 text-teal-600" aria-hidden />
                      {t("landingCardVerifiedTeacher")}
                    </span>
                  ) : null}
                  {teacher.introSessionEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-[#F3FAF6] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                      <Clock size={12} className="shrink-0 text-teal-700" aria-hidden />
                      {t("introSessionBadge").replace("{n}", String(introDuration))}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 min-h-[2.5rem] space-y-1">
                  <p
                    className={cn(
                      "line-clamp-1 text-xs leading-snug text-neutral-700",
                      !bioOneLine && "text-transparent select-none",
                    )}
                    aria-hidden={!bioOneLine}
                  >
                    {bioOneLine || "—"}
                  </p>
                  <p
                    className={cn(
                      "flex min-h-[1.125rem] items-center gap-1 truncate text-[11px] font-medium text-neutral-700",
                      !(distKm != null && neighborhoodHint) && "invisible",
                    )}
                  >
                    <MapPin size={11} className="shrink-0 text-teal-700" aria-hidden />
                    {neighborhoodHint || "—"}
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
                  {formatSummary}
                </p>
                {hasAvailabilitySlots ? (
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
              {availabilityHint}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
