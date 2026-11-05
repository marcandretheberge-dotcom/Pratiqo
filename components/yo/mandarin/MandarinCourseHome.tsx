"use client";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { JourneyUnit } from "@/lib/yo/learningJourney";
import { LearningJourney } from "../journey/CourseJourney";
import { AdventureProgress } from "../journey/AdventureProgress";
import { mandarinJourney, canEnterFoundationStep, foundationJourneyCopy } from "@/lib/yo/foundationJourney";
import { MANDARIN_PATH } from "@/lib/yo/mandarin/progress";
import { L } from "@/lib/yo/mandarin/types";
import images from "@/lib/yo/mandarin/imageAssets.json";
import type { YoLocale } from "@/lib/yo/types";
import { useMandarinProgress } from "./useMandarinProgress";

export function MandarinCourseHome({
  locale,
  units,
  languageSource,
  finalIds,
}: {
  locale: YoLocale;
  units: JourneyUnit[];
  finalIds: string[];
  languageSource: string;
}) {
  const { progress, ready, stored } = useMandarinProgress();
  const journey = mandarinJourney(units, progress);
  const finalOpen = canEnterFoundationStep(journey, "bilan", progress.unit === "bilan" ||
    progress.steps.bilan !== undefined || finalIds.some(id => Boolean(progress.results[id] || progress.drafts[id])));
  const href = (id?: string) => buildYoLocaleHref(MANDARIN_PATH + (id ? "/" + id : ""), locale);
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
              `${MANDARIN_PATH}/${progress.unit === "bilan" && finalOpen ? "bilan" : journey.current?.unit.id ?? "u01"}`,
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
        <AdventureProgress journey={journey} world="mandarin" locale={locale} ready={ready} finalPassed={finalIds.length > 0 && finalIds.every(id => progress.results[id]?.passed && progress.results[id]?.independent)} />
        <LearningJourney journey={journey} ready={ready} locale={locale} href={href} copy={foundationJourneyCopy[locale]} />
        <section className="mt-8 border-y border-teal-200 py-6">
          {ready && finalOpen ? <Link
            href={href("bilan")}
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
          </Link> : <p className="text-sm text-gray-700">{foundationJourneyCopy[locale].pending}</p>}
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
