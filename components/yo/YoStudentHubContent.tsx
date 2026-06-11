"use client";

/**
 * YoStudentHubContent
 *
 * Client body of the `/student/yopratiqo` route. Kept as a small
 * composition layer so the route file stays a thin server shell with
 * metadata only.
 *
 * Layout strategy
 * ---------------
 *   • Mobile: single stacked column. Mirrors the "phone app" rhythm
 *     used by the YoPratiqo decks and `/yo` onboarding so a learner
 *     coming back from a Module deck doesn't feel a layout jump.
 *   • Desktop (≥ lg): two-column grid — companion + course on the
 *     left, lesson path + bridges on the right. The desktop layout
 *     is NOT just the mobile layout stretched: the two columns share
 *     the same `max-w-6xl` shell but the lesson path uses the right
 *     column so the companion stays above-the-fold while the path
 *     reads as a "what to do next" rail.
 *
 * Why a separate client file
 * --------------------------
 * `YoStudentCompanionCard` is a "use client" component that reads the
 * Supabase session on mount. Embedding it inside a server page would
 * still work, but co-locating the locale read (`useLocale`) and the
 * companion card in one client file keeps the data flow legible and
 * lets the locale switcher in the AppShell header react instantly
 * without a full page round-trip.
 */

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Compass,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { YoStudentCompanionCard } from "@/components/yo/YoStudentCompanionCard";
import type { StudentCompanionLocale } from "@/lib/yopratiqo/studentCompanionState";

// ---------------------------------------------------------------------------
// Localized copy
// ---------------------------------------------------------------------------

type HubLocale = "fr" | "en" | "es";

function safeLocale(input: string): HubLocale {
  return input === "en" || input === "es" ? input : "fr";
}

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  companionHeading: string;
  courseHeading: string;
  courseTitle: string;
  courseSubtitle: string;
  continueLabel: string;
  pathHeading: string;
  pathHelp: string;
  stepIntro: string;
  stepIntroHelp: string;
  stepModule2: string;
  stepModule3: string;
  stepModule4: string;
  stepModule5: string;
  bridgeHeading: string;
  fullProgress: string;
  fullProgressHelp: string;
  courseHome: string;
  findTeacher: string;
  privacy: string;
};

const COPY: Record<HubLocale, Copy> = {
  fr: {
    eyebrow: "YoPratiqo",
    title: "Mon YoPratiqo",
    intro:
      "Yoppo, ton compagnon YoPratiqo, suit tes progrès. Quand tu réserves un professeur, tu peux choisir de partager un résumé utile de ton parcours.",
    companionHeading: "Yoppo · mon compagnon YoPratiqo",
    courseHeading: "Mon parcours en cours",
    courseTitle: "Espagnol République dominicaine — A1",
    courseSubtitle: "Voyage, culture et conversations utiles.",
    continueLabel: "Continuer mon parcours",
    pathHeading: "Mon chemin d’apprentissage",
    pathHelp:
      "Cinq étapes, courtes et concentrées. Reprends là où tu t’es arrêté ou rejoue n’importe quelle étape.",
    stepIntro: "Intro — bienvenue",
    stepIntroHelp: "Phrases utiles, culture et premières flashcards.",
    stepModule2: "Module 2 — premiers échanges",
    stepModule3: "Module 3 — la vie au quotidien",
    stepModule4: "Module 4 — se déplacer et explorer",
    stepModule5: "Module 5 — mission finale",
    bridgeHeading: "Mon univers Pratiqo",
    fullProgress: "Voir toute ma progression Pratiqo",
    fullProgressHelp:
      "Cours, devoirs, professeurs et compagnon classique — toute ta vie Pratiqo au même endroit.",
    courseHome: "Voir la page du parcours",
    findTeacher: "Trouver un professeur",
    privacy:
      "Les professeurs voient seulement un résumé utile lorsque tu choisis de le partager lors d’une réservation. Les réponses brutes aux quiz ne sont pas partagées.",
  },
  en: {
    eyebrow: "YoPratiqo",
    title: "My YoPratiqo",
    intro:
      "Yoppo, your YoPratiqo companion, follows your progress. When you book a teacher, you can choose to share a useful summary of your path.",
    companionHeading: "Yoppo · my YoPratiqo companion",
    courseHeading: "My current course",
    courseTitle: "Dominican Republic Spanish — A1",
    courseSubtitle: "Travel, culture, and useful conversations.",
    continueLabel: "Continue learning",
    pathHeading: "My learning path",
    pathHelp:
      "Five short, focused steps. Pick up where you left off or replay any step.",
    stepIntro: "Intro — welcome",
    stepIntroHelp: "Useful phrases, culture, and your first flashcards.",
    stepModule2: "Module 2 — first conversations",
    stepModule3: "Module 3 — daily life",
    stepModule4: "Module 4 — getting around",
    stepModule5: "Module 5 — final mission",
    bridgeHeading: "My Pratiqo world",
    fullProgress: "View my full Pratiqo progress",
    fullProgressHelp:
      "Lessons, homework, teachers, and the classic Pratiqo companion — your whole Pratiqo life in one place.",
    courseHome: "Open the course page",
    findTeacher: "Find a teacher",
    privacy:
      "Teachers only see a useful summary when you choose to share it during a booking. Raw quiz answers are not shared.",
  },
  es: {
    eyebrow: "YoPratiqo",
    title: "Mi YoPratiqo",
    intro:
      "Yoppo, tu compañero YoPratiqo, sigue tu progreso. Cuando reservas un profesor, puedes elegir compartir un resumen útil de tu recorrido.",
    companionHeading: "Yoppo · mi compañero YoPratiqo",
    courseHeading: "Mi curso actual",
    courseTitle: "Español República Dominicana — A1",
    courseSubtitle: "Viaje, cultura y conversaciones útiles.",
    continueLabel: "Continuar mi aprendizaje",
    pathHeading: "Mi camino de aprendizaje",
    pathHelp:
      "Cinco pasos cortos y enfocados. Retoma donde lo dejaste o repite cualquier paso.",
    stepIntro: "Intro — bienvenida",
    stepIntroHelp: "Frases útiles, cultura y tus primeras flashcards.",
    stepModule2: "Módulo 2 — primeras conversaciones",
    stepModule3: "Módulo 3 — la vida diaria",
    stepModule4: "Módulo 4 — moverse y explorar",
    stepModule5: "Módulo 5 — misión final",
    bridgeHeading: "Mi mundo Pratiqo",
    fullProgress: "Ver todo mi progreso Pratiqo",
    fullProgressHelp:
      "Clases, tareas, profesores y el compañero clásico de Pratiqo — toda tu vida Pratiqo en un solo lugar.",
    courseHome: "Abrir la página del curso",
    findTeacher: "Encontrar un profesor",
    privacy:
      "Los profesores solo ven un resumen útil cuando eliges compartirlo durante una reserva. Las respuestas brutas de los cuestionarios no se comparten.",
  },
};

// ---------------------------------------------------------------------------
// Audited routes
// ---------------------------------------------------------------------------
//
// Every destination below already exists in the app — these are the
// same paths the public /yo hub, the Course Home and the bottom-tab
// nav use. We do not invent any new route.
const HREFS = {
  courseHome: "/yo/langues/espagnol/pays/republique-dominicaine",
  intro: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  module2: "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  module3: "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  module4: "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  module5: "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  fullPratiqoProgress: "/student/progress",
  findTeacher: "/trouver-un-prof",
} as const;

export function YoStudentHubContent(): React.JSX.Element {
  const { locale } = useLocale();
  const l = safeLocale(locale);
  const copy = COPY[l];
  const companionLocale = l as StudentCompanionLocale;

  const pathSteps = [
    { href: HREFS.intro, label: copy.stepIntro, help: copy.stepIntroHelp },
    { href: HREFS.module2, label: copy.stepModule2 },
    { href: HREFS.module3, label: copy.stepModule3 },
    { href: HREFS.module4, label: copy.stepModule4 },
    { href: HREFS.module5, label: copy.stepModule5 },
  ] as const;

  return (
    <div
      data-testid="yo-student-hub"
      data-yo-student-hub-locale={l}
      className="mx-auto w-full max-w-6xl space-y-6 px-1 pb-12 sm:px-2"
    >
      {/* Top branded header — YoPratiqo logo + localized title +
          one-paragraph intro that explains how the companion + teacher
          bridge cooperate. */}
      <header className="space-y-3 rounded-3xl border border-[#E7DFCF] bg-white p-5 shadow-[0_12px_30px_rgba(15,58,52,0.06)] sm:p-6">
        <YoPratiqoLogo size="md" priority={false} />
        <div>
          <p
            data-testid="yo-student-hub-eyebrow"
            className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F6E56]/70"
          >
            {copy.eyebrow}
          </p>
          <h1
            data-testid="yo-student-hub-title"
            className="mt-1 text-2xl font-bold tracking-tight text-[#0F6E56] sm:text-3xl"
          >
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/75 sm:text-base">
            {copy.intro}
          </p>
        </div>
      </header>

      {/* Two-column grid on desktop. Companion + current course sit on
          the left so the most personal surfaces are above the fold;
          the lesson path + cross-product bridges sit on the right. */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        {/* ─── Left column ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Companion card. Reuses the exact same component that
              lives on /student/progress so both surfaces share one
              source of truth for the companion's visual state. */}
          <section className="space-y-2">
            <h2
              data-testid="yo-student-hub-companion-heading"
              className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F6E56]/70"
            >
              {copy.companionHeading}
            </h2>
            <YoStudentCompanionCard locale={companionLocale} />
          </section>

          {/* Current course card. Single, focused — no fake catalog
              of locked future courses. */}
          <section
            data-testid="yo-student-hub-course-card"
            className="rounded-3xl border border-[#E7DFCF] bg-white p-5 shadow-[0_10px_28px_rgba(23,38,66,0.06)] sm:p-6"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#13A085]">
              {copy.courseHeading}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#172642]">
              {copy.courseTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#566073]">
              {copy.courseSubtitle}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                data-testid="yo-student-hub-continue-cta"
                href={HREFS.intro}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#13A085] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(19,160,133,0.24)] transition hover:bg-[#16B597]"
              >
                <Compass className="size-4" aria-hidden />
                {copy.continueLabel}
              </Link>
              <Link
                data-testid="yo-student-hub-course-home-link"
                href={HREFS.courseHome}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#0F6E56]/20 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#FFF4D6]"
              >
                <MapPin className="size-4 text-[#1D9E75]" aria-hidden />
                {copy.courseHome}
              </Link>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#0F6E56]/72">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#1D9E75]" aria-hidden />
              <span>{copy.privacy}</span>
            </p>
          </section>
        </div>

        {/* ─── Right column ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Lesson path. Five visible steps mirror the Course Home
              roadmap so a learner can pick up at any module without
              digging through the course tree. */}
          <section
            data-testid="yo-student-hub-path"
            className="rounded-3xl border border-[#E7DFCF] bg-white p-5 shadow-[0_10px_28px_rgba(23,38,66,0.06)] sm:p-6"
          >
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F6E56]/70">
                {copy.pathHeading}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                <Sparkles className="size-3" aria-hidden />
                {copy.eyebrow}
              </span>
            </header>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/72">
              {copy.pathHelp}
            </p>
            <ol className="mt-4 space-y-2">
              {pathSteps.map((step, idx) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    data-testid={`yo-student-hub-path-step-${idx + 1}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border border-[#DDF4F1] bg-[#FAFCFB] px-3 py-3 transition hover:border-[#1D9E75]/40 hover:bg-white",
                    )}
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF4F1] text-xs font-bold text-[#0F6E56]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#0F6E56]">
                        {step.label}
                      </span>
                      {"help" in step && step.help ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-[#0F6E56]/70">
                          {step.help}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      className="size-4 text-[#0F6E56]/55 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {/* Cross-product bridge — sends the learner back to the
              full Pratiqo platform (progress / teachers) without
              hiding YoPratiqo. This is the explicit
              YoPratiqo → Pratiqo direction of the bridge. */}
          <section
            data-testid="yo-student-hub-bridge"
            className="rounded-3xl border border-[#E7DFCF] bg-gradient-to-br from-[#FAFCFB] via-white to-[#FFF4D6] p-5 shadow-[0_10px_28px_rgba(23,38,66,0.06)] sm:p-6"
          >
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {copy.bridgeHeading}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/72">
              {copy.fullProgressHelp}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                data-testid="yo-student-hub-full-progress-link"
                href={HREFS.fullPratiqoProgress}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#172642] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f1c33]"
              >
                <BookOpenCheck className="size-4" aria-hidden />
                {copy.fullProgress}
              </Link>
              <Link
                data-testid="yo-student-hub-find-teacher-link"
                href={HREFS.findTeacher}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#172642]/15 bg-white px-5 py-3 text-sm font-bold text-[#172642] transition hover:bg-[#FFF4D6]"
              >
                <GraduationCap className="size-4 text-[#13A085]" aria-hidden />
                {copy.findTeacher}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default YoStudentHubContent;
