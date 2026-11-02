"use client";
import { useCourseExperience } from "./CourseExperience";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/german/courseAuthoring";
export const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-950 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800";
export const outline =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-emerald-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800";
export const copy = {
  fr: {
    course: "Le parcours",
    learn: "Découvrir",
    practice: "Pratiquer",
    quiz: "Bilan",
    write: "À toi de créer",
    next: "Continuer",
    previous: "Précédent",
    replay: "Rejouer",
    hint: "Un indice",
    model: "Voir le modèle",
    local: "Progression sur cet appareil",
    blocked:
      "Stockage indisponible : progression conservée seulement pendant cette visite.",
    assisted: "Avec aide",
    independent: "Sans aide",
    review: "À revoir",
    resume: "Reprendre",
    start: "Commencer",
    reset: "Effacer ma progression",
    confirm: "Effacer la progression de ce parcours sur cet appareil ?",
    language: "Langue de l’interface",
    source: "Source",
    done: "Activités réussies",
    self: "Autoévaluation, pas une note de prononciation.",
    audio:
      "Les enregistrements de ce parcours sont en préparation. La version écrite reste accessible et les exercices d’écoute sont signalés avec aide.",
  },
  en: {
    course: "The course",
    learn: "Discover",
    practice: "Practise",
    quiz: "Checkpoint",
    write: "Make it yours",
    next: "Continue",
    previous: "Previous",
    replay: "Try again",
    hint: "A hint",
    model: "Show the model",
    local: "Progress on this device",
    blocked: "Storage unavailable: progress lasts only for this visit.",
    assisted: "With help",
    independent: "Without help",
    review: "Due for review",
    resume: "Resume",
    start: "Start",
    reset: "Clear my progress",
    confirm: "Clear this course’s progress on this device?",
    language: "Interface language",
    source: "Source",
    done: "Activities completed",
    self: "Self-assessment, not a pronunciation score.",
    audio:
      "Recordings for this course are being prepared. Written practice remains available; listening tasks completed with a transcript are marked assisted.",
  },
  es: {
    course: "El recorrido",
    learn: "Descubrir",
    practice: "Practicar",
    quiz: "Repaso",
    write: "Crea tu escena",
    next: "Continuar",
    previous: "Anterior",
    replay: "Reintentar",
    hint: "Una pista",
    model: "Ver el modelo",
    local: "Progreso en este dispositivo",
    blocked: "Almacenamiento no disponible: el progreso solo dura esta visita.",
    assisted: "Con ayuda",
    independent: "Sin ayuda",
    review: "Por repasar",
    resume: "Retomar",
    start: "Empezar",
    reset: "Borrar mi progreso",
    confirm: "¿Borrar el progreso de este recorrido en este dispositivo?",
    language: "Idioma de la interfaz",
    source: "Fuente",
    done: "Actividades superadas",
    self: "Autoevaluación, no una nota de pronunciación.",
    audio:
      "Las grabaciones de este recorrido están en preparación. La práctica escrita sigue disponible; la escucha con transcripción se registra con ayuda.",
  },
};
export function GermanCourseShell({
  locale,
  unit = "",
  children,
}: {
  locale: YoLocale;
  unit?: string;
  children: ReactNode;
}) {
  const experience = useCourseExperience();
  return (
    <div
      lang={locale}
      className="min-h-screen bg-[#f5f8f7] pb-36 text-gray-900"
    >
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link
            href={
              unit ? experience.href(locale) : `/yo/langues?lang=${locale}`
            }
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-900"
          >
            <ArrowLeft size={17} aria-hidden />
            YoPratiqo · {experience.name}
          </Link>
          <nav aria-label={copy[locale].language} className="flex gap-1">
            {(["fr", "en", "es"] as const).map((lang) => (
              <Link
                key={lang}
                href={experience.href(lang, unit)}
                hrefLang={lang}
                aria-current={locale === lang ? "page" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xs font-bold ${locale === lang ? "bg-emerald-800 text-white" : "text-gray-700 hover:bg-emerald-50"}`}
              >
                {lang.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">{children}</main>
      <footer className="mx-auto mt-12 max-w-6xl border-t border-gray-200 px-4 pt-5 text-xs leading-relaxed text-gray-600 sm:px-8">
        {
          t(
            "Parcours débutant, sans certification de niveau. Les scènes, tarifs et horaires d’exercice sont fictifs. Aucun achat ni réservation.",
            "Beginner practice, not a level certification. Exercise scenes, prices and timetables are fictional. No purchases or bookings.",
            "Práctica inicial, sin certificación de nivel. Las escenas, precios y horarios de ejercicios son ficticios. Sin compras ni reservas.",
          )[locale]
        }
        <Link
          href={`/yo/langues?lang=${locale}`}
          className="ml-2 inline-flex min-h-11 items-center underline"
        >
          {
            t("Toutes les langues", "All languages", "Todos los idiomas")[
              locale
            ]
          }
        </Link>
      </footer>
    </div>
  );
}
