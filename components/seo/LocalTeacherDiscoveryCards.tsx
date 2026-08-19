"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { LocalTeacherDiscoveryPageBundle } from "@/lib/seo/localTeacherDiscoveryPages";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { formatTeacherDisciplineLabel } from "@/lib/teacherMapper";
import { TeacherCardIdentityCheck } from "@/components/teachers/TeacherCardIdentityCheck";
import {
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS,
  PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS,
  PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
} from "@/lib/teachers/display";
import { cn } from "@/lib/utils";

function teachingModeLabel(mode: string): string {
  if (mode === "online") return "En ligne";
  if (mode === "person") return "En présentiel";
  if (mode === "home") return "À domicile";
  if (mode === "all") return "Plusieurs formats";
  if (mode === "both") return "En ligne & présentiel";
  return "Format à confirmer sur le profil";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  bundle: LocalTeacherDiscoveryPageBundle;
};

export function LocalTeacherDiscoveryCards({ bundle }: Props) {
  if (bundle.teachers.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#E8E6DF] p-10 text-center">
        <p className="text-base font-semibold text-[#2C2C2A]">
          {bundle.pageType === "subject_city"
            ? `Aucun professeur de ${bundle.discipline!.name.toLowerCase()} publié à ${bundle.city.name} pour l'instant.`
            : `Aucun professeur publié à ${bundle.city.name} pour l'instant.`}
        </p>
        <p className="mt-2 text-sm text-[#6B6760]">
          Revenez bientôt ou explorez d&apos;autres matières et villes sur Pratiqo.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/trouver-un-prof"
            className="inline-flex items-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
          >
            Voir les professeurs disponibles →
          </Link>
          <Link
            href="/devenir-professeur"
            className="inline-flex items-center rounded-xl border border-[#E8E6DF] px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            Devenir professeur sur Pratiqo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bundle.teachers.map((teacher) => {
          const hasReviews = Number(teacher.reviewCount) > 0 && Number(teacher.rating) > 0;
          return (
            <Link
              key={teacher.id}
              href={teacher.profilePath}
              className={cn(
                "flex h-full flex-col rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-[0_8px_32px_rgba(44,44,42,0.05)]",
                PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-500/15 text-sm font-bold text-teal-800 ring-1 ring-[#E8E6DF]",
                    PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS,
                  )}
                  aria-hidden
                >
                  {teacher.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={teacher.imageUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    initials(formatPublicTeacherDisplayName(teacher.displayName) || teacher.displayName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1 text-sm font-semibold text-[#2C2C2A]">
                    <span className="truncate">{formatPublicTeacherDisplayName(teacher.displayName)}</span>
                    <TeacherCardIdentityCheck verified={teacher.identityVerified} label="Identité vérifiée" />
                  </p>
                  <p className={PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS}>{formatTeacherDisciplineLabel(teacher.discipline)}</p>
                  {hasReviews ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2C2C2A]">
                      <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden />
                      {Number(teacher.rating).toFixed(1)}
                      <span className="font-medium text-slate-600">({Number(teacher.reviewCount)})</span>
                    </p>
                  ) : null}
                  {/* Future: show “Nouveau” only for teachers created within a defined recent window, not for every unrated teacher. */}
                </div>
              </div>

              {teacher.isOnlineFallback ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#92600A]">
                  Disponible en ligne
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6760]">
                <span>{teachingModeLabel(teacher.teachingMode)}</span>
                {teacher.pricePerLesson != null ? (
                  <span className="font-bold text-teal-700">
                    {Math.round(teacher.pricePerLesson)} CAD{" "}
                    <span className="text-sm font-normal text-slate-400">/h</span>
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/trouver-un-prof"
          className="inline-flex h-11 items-center rounded-2xl bg-teal-700 px-7 text-sm font-bold text-white hover:brightness-105 shadow-sm"
        >
          Voir les professeurs disponibles →
        </Link>
        <p className="mt-2 text-xs text-[#6B6760]">Consultez les profils publics · Options selon chaque professeur</p>
      </div>
    </>
  );
}
