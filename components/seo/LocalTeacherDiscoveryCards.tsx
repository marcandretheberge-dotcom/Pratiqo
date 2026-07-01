"use client";

import Link from "next/link";
import type { LocalTeacherDiscoveryPageBundle } from "@/lib/seo/localTeacherDiscoveryPages";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";

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
        {bundle.teachers.map((teacher) => (
          <Link
            key={teacher.id}
            href={teacher.profilePath}
            className="block rounded-2xl bg-white border border-[#E8E6DF] p-4 shadow-[0_8px_32px_rgba(44,44,42,0.05)] hover:shadow-[0_12px_40px_rgba(44,44,42,0.10)] transition-shadow"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="h-11 w-11 shrink-0 rounded-full bg-teal-500/15 text-teal-800 flex items-center justify-center text-sm font-bold overflow-hidden"
                aria-hidden
              >
                {teacher.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-full w-full object-cover rounded-full"
                    loading="lazy"
                  />
                ) : (
                  initials(teacher.displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm text-[#2C2C2A]">
                  {publicFirstNameWithInitial(teacher.displayName)}
                </p>
                <p className="truncate text-xs text-[#6B6760]">{teacher.discipline}</p>
                {teacher.isOnlineFallback ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#92600A]">
                    Disponible en ligne
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6760]">
              <span>{teachingModeLabel(teacher.teachingMode)}</span>
              {teacher.pricePerLesson != null ? (
                <span className="font-bold text-teal-700">{Math.round(teacher.pricePerLesson)}$/h</span>
              ) : (
                <span className="text-[#6B6760]">Tarif sur le profil</span>
              )}
            </div>
          </Link>
        ))}
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
