"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { RankingNavLink } from "@/components/yo/rankings/RankingNavLink";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { JourneyUnit } from "@/lib/yo/learningJourney";
import { LearningJourney } from "../journey/CourseJourney";
import { AdventureProgress } from "../journey/AdventureProgress";
import { mandarinJourney, canEnterFoundationStep, foundationJourneyCopy } from "@/lib/yo/foundationJourney";
import { MANDARIN_PATH } from "@/lib/yo/mandarin/progress";
import { L } from "@/lib/yo/mandarin/types";
import { isMandarinAssessment, mandarinRouteId, MANDARIN_DEPTH_SOURCES } from "@/lib/yo/mandarin/depthAuthoring";
import { stopMandarinAudio } from "./MandarinAudio";
import images from "@/lib/yo/mandarin/imageAssets.json";
import type { YoLocale } from "@/lib/yo/types";
import { useMandarinProgress } from "./useMandarinProgress";
import { InterestPracticeCard } from "../interests/InterestPracticeCard";
import { EasternDueReview } from "../review/EasternDueReview";

export function MandarinCourseHome({
  locale,
  units,
  languageSource,
  finalIds,
  legacyFinalIds = [],
  reviewIds = [],
}: {
  locale: YoLocale;
  units: JourneyUnit[];
  finalIds: string[];
  legacyFinalIds?: string[];
  reviewIds?: string[];
  languageSource: string;
}) {
  const { progress, ready, stored, reset } = useMandarinProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const journey = mandarinJourney(units, progress);
  const finalOpen = canEnterFoundationStep(journey, "bilan-fondations", progress.unit === "bilan-fondations" ||
    progress.steps["bilan-fondations"] !== undefined || finalIds.some(id => Boolean(progress.results[id] || progress.drafts[id])));
  const legacyJourney = mandarinJourney(units.slice(0, 8), progress);
  const legacyFinalOpen = canEnterFoundationStep(legacyJourney, "bilan", progress.unit === "bilan" ||
    progress.steps.bilan !== undefined || legacyFinalIds.some(id => Boolean(progress.results[id] || progress.drafts[id])));
  const resumeFinal = isMandarinAssessment(progress.unit) && (progress.unit === "bilan" ? legacyFinalOpen : finalOpen);
  const href = (id?: string) => buildYoLocaleHref(MANDARIN_PATH + (id ? "/" + mandarinRouteId(id) : ""), locale);
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-5 text-[#302f27] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href={buildYoLocaleHref("/yo/langues", locale)}
            className="min-h-11 py-3 text-sm font-bold text-[#245a46]"
          >
            YoPratiqo
          </Link>
          <RankingNavLink locale={locale} compact />
          <div className="flex rounded-full border border-[#e4dbcb] bg-[#fffdf8] p-1">
            {(["fr", "en", "es"] as const).map((lang) => (
              <Link
                key={lang}
                href={buildYoLocaleHref(MANDARIN_PATH, lang)}
                aria-current={locale === lang ? "page" : undefined}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245a46] ${locale === lang ? "bg-[#245a46] text-white" : "text-[#776a55] hover:bg-white"}`}
              >
                {lang.toUpperCase()}
              </Link>
            ))}
          </div>
        </nav>
        <header className="mb-7 flex items-center gap-4 rounded-3xl border border-[#e4dbcb] bg-[#fffdf8] p-4 shadow-sm sm:gap-6 sm:p-7">
          <CompanionAvatar
            visualId="travel"
            state="map"
            locale={locale}
            size="md"
            compact
          />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a66040]">
              中文 · {L("Fondations", "Foundations", "Fundamentos")[locale]}
            </p>
            <h1 className="mt-2 font-serif text-2xl leading-tight text-[#245a46] sm:text-4xl">
              {
                L(
                  "Tes premiers échanges en mandarin",
                  "Your first exchanges in Mandarin",
                  "Tus primeros intercambios en mandarín",
                )[locale]
              }
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#776a55]">
              {
                L(
                  "Douze unités pour rencontrer, choisir, raconter et préparer un projet avec Yoppo.",
                  "Twelve units to meet, choose, retell and make a plan with Yoppo.",
                  "Doce unidades para conocer, elegir, contar y preparar un plan con Yoppo.",
                )[locale]
              }
            </p>
          </div>
        </header>
        {ready && resumeFinal && (
          <Link
            href={href(progress.unit)}
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
        <InterestPracticeCard language="zh" locale={locale} />
        <EasternDueReview language="zh" locale={locale} itemIds={reviewIds}/>
        <section className="mt-8 rounded-2xl border border-[#c9d8bd] bg-[#edf2e6] p-5 sm:p-6">
          {ready && finalOpen ? <Link
            href={href("bilan-fondations")}
            className="inline-flex min-h-12 items-center gap-3 text-xl font-bold text-teal-900"
          >
            {
              L(
                "Bilan des douze unités : lire et répondre",
                "Twelve-unit review: read and respond",
                "Balance de doce unidades: leer y responder",
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
          {ready && legacyFinalOpen && <Link href={href("bilan")} className="mt-4 inline-flex min-h-11 items-center text-sm text-teal-900 underline">{L("Revenir au bilan initial des huit premières unités", "Return to the original eight-unit review", "Volver al balance inicial de las ocho primeras unidades")[locale]}</Link>}
        </section>
        <details className="mt-6 text-sm">
          <summary className="min-h-11 cursor-pointer py-3">{L("Recommencer le parcours sur cet appareil", "Restart the course on this device", "Reiniciar el recorrido en este dispositivo")[locale]}</summary>
          <p>{L("Cette action efface les réponses, les notes et la position de ce parcours mandarin dans ce navigateur.", "This clears this Mandarin course’s answers, results and position in this browser.", "Esta acción borra las respuestas, resultados y posición de este recorrido de mandarín en este navegador.")[locale]}</p>
          {confirmReset ? <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-lg bg-red-800 px-4 text-white" onClick={() => { stopMandarinAudio(); reset(); setConfirmReset(false); }}>{L("Effacer et recommencer le mandarin", "Clear and restart Mandarin", "Borrar y reiniciar mandarín")[locale]}</button><button type="button" className="min-h-11 px-4 underline" onClick={() => setConfirmReset(false)}>{L("Annuler", "Cancel", "Cancelar")[locale]}</button></div> : <button type="button" disabled={!ready} className="mt-3 min-h-11 underline" onClick={() => setConfirmReset(true)}>{L("Réinitialiser ce parcours", "Reset this course", "Reiniciar este recorrido")[locale]}</button>}
        </details>
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
            {Object.entries(MANDARIN_DEPTH_SOURCES).map(([id, source]) => <li key={id}><a className="underline" href={source}>{new URL(source).hostname} · {id}</a></li>)}
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
