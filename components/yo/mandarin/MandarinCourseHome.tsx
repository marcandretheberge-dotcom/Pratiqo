"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, RotateCcw } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { Unit } from "@/lib/yo/mandarin/types";
import { MANDARIN_PATH } from "@/lib/yo/mandarin/progress";
import { L } from "@/lib/yo/mandarin/types";
import images from "@/lib/yo/mandarin/imageAssets.json";
import { sceneDescriptions } from "@/lib/yo/mandarin/visuals";
import type { YoLocale } from "@/lib/yo/types";
import { useMandarinProgress } from "./useMandarinProgress";

export type MandarinCourseCard = Pick<
  Unit,
  "id" | "number" | "title" | "setting" | "scene"
> & { exerciseIds: string[] };
export function MandarinCourseHome({
  locale,
  units,
  languageSource,
}: {
  locale: YoLocale;
  units: MandarinCourseCard[];
  languageSource: string;
}) {
  const { progress, ready, stored } = useMandarinProgress();
  return (
    <main className="min-h-screen bg-[#f6f9f8] px-4 py-6 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href={buildYoLocaleHref("/yo/langues", locale)}
            className="min-h-11 py-3 text-teal-900 underline"
          >
            YoPratiqo
          </Link>
          <div className="flex gap-3">
            {(["fr", "en", "es"] as const).map((lang) => (
              <Link
                key={lang}
                href={buildYoLocaleHref(MANDARIN_PATH, lang)}
                aria-current={locale === lang ? "page" : undefined}
                className="p-3 text-sm underline"
              >
                {lang.toUpperCase()}
              </Link>
            ))}
          </div>
        </nav>
        <header className="mb-8 flex items-center gap-4">
          <CompanionAvatar
            visualId="travel"
            state="map"
            locale={locale}
            size="md"
            compact
          />
          <div className="min-w-0">
            <p className="text-sm text-teal-800">
              中文 · {L("Fondations", "Foundations", "Fundamentos")[locale]}
            </p>
            <h1 className="text-3xl font-bold">
              {
                L(
                  "Ta première journée en mandarin",
                  "Your first day in Mandarin",
                  "Tu primer día en mandarín",
                )[locale]
              }
            </h1>
            <p className="mt-2 text-gray-600">
              {
                L(
                  "Rencontrer. Choisir. Demander. Avec Yoppo à tes côtés.",
                  "Meet. Choose. Ask. With Yoppo by your side.",
                  "Conocer. Elegir. Preguntar. Con Yoppo a tu lado.",
                )[locale]
              }
            </p>
          </div>
        </header>
        {ready && (
          <Link
            href={buildYoLocaleHref(
              `${MANDARIN_PATH}/${progress.unit}`,
              locale,
            )}
            className="mb-8 inline-flex min-h-12 items-center gap-3 rounded-lg bg-teal-800 px-5 text-white"
          >
            <RotateCcw size={18} />
            {
              L(
                "Reprendre ma séance",
                "Resume my session",
                "Retomar mi sesión",
              )[locale]
            }
          </Link>
        )}
        {!stored && (
          <p role="status" className="mb-4 text-amber-900">
            {
              L(
                "Sauvegarde locale indisponible.",
                "Local storage unavailable.",
                "Guardado local no disponible.",
              )[locale]
            }
          </p>
        )}
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => {
            const photo = images[unit.scene as keyof typeof images];
            const done = unit.exerciseIds.filter(
              (id) => progress.results[id]?.passed,
            ).length;
            return (
              <li
                key={unit.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <Link
                  href={buildYoLocaleHref(
                    `${MANDARIN_PATH}/${unit.id}`,
                    locale,
                  )}
                  className="group block"
                >
                  <Image
                    src={photo.src}
                    alt={
                      sceneDescriptions[
                        unit.scene as keyof typeof sceneDescriptions
                      ][locale]
                    }
                    width={photo.width}
                    height={photo.height}
                    className="aspect-[2/1] w-full object-cover"
                  />
                  <div className="p-5">
                    <p className="text-xs font-semibold text-teal-800">
                      {String(unit.number).padStart(2, "0")}
                    </p>
                    <h2 className="mt-2 text-xl font-bold group-hover:text-teal-800">
                      {unit.title[locale]}
                    </h2>
                    <p className="mt-3 min-h-16 text-sm leading-relaxed text-gray-600">
                      {unit.setting[locale]}
                    </p>
                    <p className="mt-4 flex items-center justify-between text-sm text-teal-900">
                      <span>
                        {done} / {unit.exerciseIds.length}{" "}
                        {L("exercices", "exercises", "ejercicios")[locale]}
                      </span>
                      <ArrowRight size={18} />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
        <section className="mt-8 border-y border-teal-200 py-6">
          <Link
            href={buildYoLocaleHref(`${MANDARIN_PATH}/bilan`, locale)}
            className="inline-flex min-h-12 items-center gap-3 text-xl font-bold text-teal-900"
          >
            {
              L(
                "Mission finale : une journée ensemble",
                "Final mission: a day together",
                "Misión final: un día juntos",
              )[locale]
            }
            <ArrowRight size={20} />
          </Link>
          <p className="mt-3 text-sm text-gray-600">
            {
              L(
                "Un bilan interne, pas une certification HSK. Écriture et conversation libres à poursuivre avec un professeur.",
                "An internal review, not HSK certification. Continue free writing and conversation with a teacher.",
                "Un balance interno, no una certificación HSK. Continúa la escritura y conversación libres con un profesor.",
              )[locale]
            }
          </p>
        </section>
        <details className="mt-6 text-sm">
          <summary className="min-h-11 cursor-pointer py-3">
            {
              L(
                "Sources et crédits",
                "Sources and credits",
                "Fuentes y créditos",
              )[locale]
            }
          </summary>
          <ul className="space-y-2">
            <li>
              <a className="underline" href={languageSource}>
                MIT OpenCourseWare · Chinese I
              </a>
            </li>
            {Object.values(images).map((photo) => (
              <li key={photo.src}>
                <a className="underline" href={photo.source}>
                  {photo.credit} · {photo.license}
                </a>
              </li>
            ))}
            <li>
              <a className="underline" href="/yo/mandarin-strokes/LICENSE.txt">
                Make Me a Hanzi / Arphic
              </a>
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}
