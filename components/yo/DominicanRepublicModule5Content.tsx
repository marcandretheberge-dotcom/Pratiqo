/**
 * DominicanRepublicModule5Content - premium A2 capstone module renderer.
 *
 * "Imprévus, conversations rapides et mission finale A2".
 *
 * Server component. The only client behaviour is delegated to
 * DominicanRepublicModule5Interactive (print button + reveal-only quiz +
 * reading comprehension reveal + final capstone game + writing reveal
 * + roleplay reveal).
 *
 * Pedagogical contract:
 *   - Pre-reveal, the practice quiz and final game show ONLY Spanish
 *     answer choices. Translations / explanations appear after the
 *     learner commits to a pick.
 *   - Tests the four CEFR/DELE A2 skill components (reading, listening,
 *     writing, oral interaction).
 *   - All audio comes from the browser (YoSpeechButton →
 *     SpeechSynthesis). No MP3 file is referenced anywhere.
 */

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  Gauge,
  Headphones,
  Map as MapIcon,
  MapPinned,
  MessageSquare,
  PenLine,
  Sparkles,
  Sprout,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  dominicanRepublicA2Capstone,
  type Dom5Dialogue,
  type Dom5PrintableSheet,
  type Dom5ReadingText,
} from "@/lib/yo/dominicanRepublicA2Capstone";
import { module5FlashcardsToYo } from "@/lib/yo/dominicanRepublicFlashcardAdapters";
import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import {
  DominicanRepublicCapstoneGame,
  DominicanRepublicModule5PrintButton,
  DominicanRepublicModule5Quiz,
  DominicanRepublicModule5ReadingQuestions,
  DominicanRepublicModule5RoleplayReveal,
  DominicanRepublicModule5WritingReveal,
} from "@/components/yo/DominicanRepublicModule5Interactive";
import { YoMarkModuleCompletedButton } from "@/components/yo/YoMarkModuleCompletedButton";

const SECTION_LABELS = {
  passport: { fr: "Carte de mission A2", en: "A2 mission map", es: "Mapa de misión A2" },
  skills: { fr: "Tableau de compétences A2", en: "A2 skill dashboard", es: "Tablero de competencias A2" },
  phrases: { fr: "Banque de phrases", en: "Phrase bank", es: "Banco de frases" },
  fastSpeech: { fr: "Comprendre quand ça va vite", en: "Fast-speech survival", es: "Entender cuando hablan rápido" },
  dialogues: { fr: "Dialogues d'imprévus", en: "Problem dialogues", es: "Diálogos de imprevistos" },
  readings: { fr: "Lectures A2", en: "A2 readings", es: "Lecturas A2" },
  writing: { fr: "Écriture guidée", en: "Guided writing", es: "Escritura guiada" },
  roleplay: { fr: "Interaction orale", en: "Oral interaction", es: "Interacción oral" },
  grammar: { fr: "Boîte à outils A2", en: "A2 toolbox", es: "Caja de herramientas A2" },
  flashcards: { fr: "Flashcards", en: "Flashcards", es: "Tarjetas" },
  quiz: { fr: "Quiz pratique A2", en: "A2 practice quiz", es: "Quiz práctico A2" },
  game: { fr: "Mission finale A2", en: "Final A2 mission", es: "Misión final A2" },
  printables: { fr: "Cahier A2 imprimable", en: "Printable A2 workbook", es: "Cuaderno A2 imprimible" },
  selfAssessment: { fr: "Auto-évaluation A2", en: "A2 self-assessment", es: "Autoevaluación A2" },
  seriesEnd: { fr: "Fin de la série RD", en: "End of the RD series", es: "Fin de la serie RD" },
};

const LABELS = {
  module: { fr: "Module 5", en: "Module 5", es: "Módulo 5" },
  level: { fr: "A2 capstone", en: "A2 capstone", es: "Capstone A2" },
  capstoneBadge: {
    fr: "Capstone voyage A2",
    en: "Travel A2 capstone",
    es: "Capstone A2 de viaje",
  },
  browserAudio: { fr: "Audio de pratique", en: "Practice audio", es: "Audio de práctica" },
  noAudioPlayback: {
    fr: "Audio de pratique intégré au navigateur. La voix peut varier selon l'appareil.",
    en: "Practice audio uses your browser voice. Voice quality may vary by device.",
    es: "El audio de práctica usa la voz del navegador. La calidad puede variar según el dispositivo.",
  },
  category: { fr: "Catégorie", en: "Category", es: "Categoría" },
  scene: { fr: "La scène", en: "The scene", es: "La escena" },
  pattern: { fr: "Schéma", en: "Pattern", es: "Esquema" },
  meaning: { fr: "Sens", en: "Meaning", es: "Sentido" },
  examples: { fr: "Exemples", en: "Examples", es: "Ejemplos" },
  practice: { fr: "À toi", en: "Your turn", es: "Tu turno" },
  exampleTask: { fr: "Tâche modèle", en: "Example task", es: "Tarea de ejemplo" },
  selfCheck: { fr: "Vérifie-toi", en: "Self-check", es: "Autocomprueba" },
  vocabulary: { fr: "Vocabulaire", en: "Vocabulary", es: "Vocabulario" },
  wordCount: { fr: "mots espagnols", en: "Spanish words", es: "palabras en español" },
  writtenPrompt: { fr: "À écrire", en: "To write", es: "Para escribir" },
  questions: { fr: "Questions", en: "Questions", es: "Preguntas" },
  printHint: {
    fr: "Imprime le cahier A2 final pour le travailler hors ligne. Les réponses sont incluses.",
    en: "Print the final A2 workbook to work offline. Answer keys are included.",
    es: "Imprime el cuaderno A2 final para practicar sin conexión. Las respuestas están incluidas.",
  },
  answerKey: { fr: "Voir le corrigé", en: "Show answer key", es: "Ver respuestas" },
  scaffold: { fr: "Structure conseillée", en: "Suggested scaffold", es: "Estructura sugerida" },
  usefulPhrases: { fr: "Phrases utiles", en: "Useful phrases", es: "Frases útiles" },
  successChecklist: { fr: "Réussite à cocher", en: "Success checklist", es: "Lista de logros" },
  modelSentence: { fr: "Phrase modèle", en: "Model sentence", es: "Frase modelo" },
  partnerA: { fr: "Toi (A)", en: "You (A)", es: "Tú (A)" },
  partnerB: { fr: "Partenaire (B)", en: "Partner (B)", es: "Pareja (B)" },
  fastIntro: { fr: "Survival fast-speech", en: "Fast-speech survival", es: "Supervivencia ante el habla rápida" },
  fastPractice: { fr: "Paires de pratique", en: "Practice pairs", es: "Pares de práctica" },
  heard: { fr: "Tu entends", en: "You hear", es: "Oyes" },
  asked: { fr: "Tu réponds", en: "You reply", es: "Respondes" },
  series: {
    fr: "Belle aventure ! Tu as terminé les 5 modules dominicains. Continue avec un prof YoPratiqo pour viser un voyage B1.",
    en: "Beautiful journey! You completed all 5 Dominican modules. Continue with a YoPratiqo teacher to aim for a B1 trip.",
    es: "¡Hermosa aventura! Terminaste los 5 módulos dominicanos. Continúa con un profe YoPratiqo para apuntar a un viaje B1.",
  },
  teacherCta: {
    fr: "Continuer avec un prof YoPratiqo",
    en: "Continue with a YoPratiqo teacher",
    es: "Continuar con un profe YoPratiqo",
  },
  recap: {
    fr: "Récapitulatif des 5 modules",
    en: "Recap of all 5 modules",
    es: "Resumen de los 5 módulos",
  },
};

function label(locale: YoLocale, dict: Record<YoLocale, string>): string {
  return dict[locale] ?? dict.fr;
}

function L({
  value,
  locale,
}: {
  value: YoLocalizedString;
  locale: YoLocale;
}): ReactNode {
  return <>{t(value, locale)}</>;
}

function SectionHeader({
  icon,
  labelText,
  title,
  body,
  id,
}: {
  icon: ReactNode;
  labelText: string;
  title: string;
  body?: string;
  id?: string;
}) {
  return (
    <div className="mb-5">
      <p className="flex items-center gap-2 text-[0.74rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        {icon}
        {labelText}
      </p>
      <h2
        id={id}
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {title}
      </h2>
      {body ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/70">
          {body}
        </p>
      ) : null}
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────

function HeroSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#0F6E56]/10 bg-[radial-gradient(120%_120%_at_0%_0%,#FFF4D6_0%,transparent_55%),radial-gradient(120%_120%_at_100%_0%,#DDF4F1_0%,transparent_50%),linear-gradient(180deg,#FFFFFF_0%,#F8FBF9_60%,#FFF4D6_100%)]"
      aria-labelledby="yo-do-m5-hero-title"
      data-yo-module5-hero
    >
      <div
        aria-hidden
        className="absolute -left-32 -top-24 size-[28rem] rounded-full bg-[#1D9E75]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute left-0 top-8 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(15,110,86,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="absolute bottom-0 right-0 h-64 w-64 translate-x-16 translate-y-10 rounded-full bg-[#F26B5E]/18 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-center lg:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0B3040] shadow-sm">
              <Sparkles className="size-3.5" aria-hidden />
              {t(data.productLabel, locale)}
            </span>
            <span className="inline-flex rounded-full border border-[#0F6E56]/15 bg-[#0B3040] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#FFF4D6]">
              {label(locale, LABELS.module)} · {label(locale, LABELS.level)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1D9E75]/35 bg-[#DDF4F1] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
              <Trophy className="size-3.5" aria-hidden />
              {label(locale, LABELS.capstoneBadge)}
            </span>
            <span
              data-yo-audio-state="browser-speech"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/15 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold text-[#0F6E56]/80"
            >
              <Headphones className="size-3.5" aria-hidden />
              {label(locale, LABELS.browserAudio)}
            </span>
          </div>

          <h1
            id="yo-do-m5-hero-title"
            className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0B3040] sm:text-4xl lg:text-5xl"
          >
            {t(data.heroTitle, locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#0B3040]/74 sm:text-lg">
            {t(data.heroSubtitle, locale)}
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {[
              "Necesito ayuda, por favor.",
              "¿Hay otra opción?",
              "Perdí mi teléfono.",
              "Fue una experiencia increíble.",
            ].map((phrase) => (
              <span
                key={phrase}
                className="rounded-2xl border border-[#0F6E56]/12 bg-white/75 px-4 py-3 text-sm font-black text-[#0B3040] shadow-[0_10px_28px_rgba(15,58,52,0.08)]"
                lang="es"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>

        <div
          className="relative rounded-[2rem] border border-[#0B3040]/10 bg-white/55 p-4 shadow-[0_24px_70px_rgba(15,58,52,0.15)] backdrop-blur"
          data-yo-module5-final-passport-stamp
        >
          <div
            aria-hidden
            className="absolute -right-5 top-8 rotate-12 rounded-full border-2 border-dashed border-[#F26B5E]/55 px-5 py-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#F26B5E]/80"
          >
            RD final stamp
          </div>
          <div className="rounded-[1.5rem] border border-[#F4B400]/35 bg-[#FFF4D6] p-5 text-[#0F6E56]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                  Final mission dossier
                </p>
                <p className="mt-1 text-2xl font-black">RD A2 capstone</p>
              </div>
              <div className="grid size-16 place-items-center rounded-full bg-[#0F6E56] text-[#F4B400]">
                <Compass className="size-8" aria-hidden />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {data.missionStops.slice(0, 4).map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#0F6E56]/10 bg-white/78 p-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F4B400] text-sm font-black text-[#0F6E56]">
                    {stop.position}
                  </span>
                  <span className="text-sm font-bold">
                    {t(stop.title, locale)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#0F6E56]/70">
              {t(data.capstoneCompletionMessage, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Audio notice ───────────────────────────────────────────────────────

function AudioNoticeSection({ locale }: { locale: YoLocale }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8">
      <div
        data-yo-browser-audio-note
        className="rounded-2xl border border-[#1D9E75]/25 bg-white/75 p-4 text-[#0F6E56] shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
      >
        <div className="flex items-start gap-3">
          <Headphones className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-black">
              {label(locale, LABELS.browserAudio)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/70">
              {label(locale, LABELS.noAudioPlayback)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── A2 mission map (7 stops) ───────────────────────────────────────────

function PassportSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-mission-map
    >
      <SectionHeader
        icon={<MapPinned className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.passport)}
        title={
          locale === "en"
            ? "7 A2 stops to handle anything on your last days"
            : locale === "es"
              ? "7 paradas A2 para resolver tus últimos días"
              : "7 étapes A2 pour gérer tes derniers jours"
        }
        id="yo-do-m5-mission-title"
      />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.missionStops.map((stop) => (
          <li
            key={stop.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/85 p-4 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module5-mission-stop
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-sm font-black text-[#F4B400]">
                {stop.position}
              </span>
              <p className="text-base font-black text-[#0F6E56]">
                <L value={stop.title} locale={locale} />
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/75">
              <L value={stop.description} locale={locale} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Four-skill A2 dashboard ────────────────────────────────────────────

const SKILL_ICONS: Record<string, ReactNode> = {
  reading: <BookOpen className="size-5" aria-hidden />,
  listening: <Headphones className="size-5" aria-hidden />,
  writing: <PenLine className="size-5" aria-hidden />,
  oral: <Users className="size-5" aria-hidden />,
};

function SkillDashboardSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-skill-dashboard
      data-yo-module5-skill-count={data.skillDashboard.length}
    >
      <SectionHeader
        icon={<Gauge className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.skills)}
        title={
          locale === "en"
            ? "Four A2 skills · reading, listening, writing, oral"
            : locale === "es"
              ? "Cuatro competencias A2 · escrita, oral, escritura, interacción"
              : "Quatre compétences A2 · écrite, orale, écriture, interaction"
        }
        body={
          locale === "en"
            ? "Built on CEFR/DELE A2: reading comprehension, listening comprehension, written expression, oral interaction."
            : locale === "es"
              ? "Construido sobre CECR/DELE A2: comprensión escrita, comprensión oral, expresión escrita, interacción oral."
              : "Aligné CECRL/DELE A2 : compréhension écrite, compréhension orale, expression écrite, interaction orale."
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.skillDashboard.map((skill) => (
          <article
            key={skill.id}
            className="rounded-3xl border border-[#0F6E56]/12 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module5-skill-card
            data-yo-module5-skill={skill.skill}
          >
            <div className="flex items-center gap-3 text-[#0F6E56]">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#DDF4F1] text-[#0F6E56]">
                {SKILL_ICONS[skill.skill]}
              </span>
              <h3 className="text-lg font-black">
                <L value={skill.title} locale={locale} />
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={skill.description} locale={locale} />
            </p>
            <div className="mt-3 rounded-2xl bg-[#F4FBF9] p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                {label(locale, LABELS.exampleTask)}
              </p>
              <p className="mt-1 text-sm text-[#0F6E56]/85">
                <L value={skill.exampleTask} locale={locale} />
              </p>
            </div>
            <div className="mt-3 rounded-2xl border border-[#F4B400]/30 bg-[#FFF8E7] p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
                {label(locale, LABELS.selfCheck)}
              </p>
              <p className="mt-1 text-sm text-[#5a3f0f]">
                <L value={skill.selfCheck} locale={locale} />
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Phrase bank ────────────────────────────────────────────────────────

function PhraseBankSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-phrase-count={data.phraseBank.length}
    >
      <SectionHeader
        icon={<MessageSquare className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.phrases)}
        title={
          locale === "en"
            ? "60 A2 Spanish phrases for any travel situation"
            : locale === "es"
              ? "60 frases A2 en español para cualquier situación"
              : "60 phrases espagnoles A2 pour toute situation"
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.phraseBank.map((phrase) => (
          <article
            key={phrase.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module5-phrase
            data-yo-module5-phrase-category={phrase.categoryKey}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#DDF4F1] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <L value={phrase.category} locale={locale} />
              </span>
              <YoSpeechButton text={phrase.target} locale={locale} compact />
            </div>
            <p className="mt-2 text-base font-black text-[#0B3040]" lang="es">
              {phrase.target}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#0F6E56]/85">
              <L value={phrase.translation} locale={locale} />
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
              <L value={phrase.usage} locale={locale} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Dominican fast-speech survival ─────────────────────────────────────

function FastSpeechSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-fast-speech
    >
      <SectionHeader
        icon={<Headphones className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.fastSpeech)}
        title={
          locale === "en"
            ? "Survive Dominican fast speech with confidence"
            : locale === "es"
              ? "Sobrevivir al español dominicano rápido con confianza"
              : "Survivre à l'espagnol dominicain rapide avec assurance"
        }
        body={t(data.fastSpeechSection.intro, locale)}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.fastSpeechSection.cards.map((card) => (
          <article
            key={card.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module5-fast-speech-card
          >
            <h3 className="text-base font-black text-[#0F6E56]">
              <L value={card.title} locale={locale} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={card.description} locale={locale} />
            </p>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-3xl border border-[#F4B400]/35 bg-[#FFF8E7] p-4 sm:p-5">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          {label(locale, LABELS.fastPractice)}
        </p>
        <ul className="mt-3 space-y-2">
          {data.fastSpeechSection.pairs.map((pair) => (
            <li
              key={pair.id}
              className="flex flex-col gap-2 rounded-2xl bg-white/85 p-3 sm:flex-row sm:items-center sm:gap-4"
              data-yo-module5-fast-speech-pair
            >
              <div className="flex-1">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                  {label(locale, LABELS.heard)}
                </p>
                <p className="mt-0.5 text-sm font-black text-[#0B3040]" lang="es">
                  {pair.heard}
                </p>
              </div>
              <ArrowRight
                className="hidden size-4 text-[#0F6E56] sm:block"
                aria-hidden
              />
              <div className="flex-1">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                  {label(locale, LABELS.asked)}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-black text-[#0B3040]" lang="es">
                    {pair.asked}
                  </p>
                  <YoSpeechButton text={pair.asked} locale={locale} compact />
                </div>
                <p className="mt-1 text-xs text-[#0F6E56]/75">
                  <L value={pair.note} locale={locale} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Practical problem dialogues ────────────────────────────────────────

function DialogueBlock({
  dialogue,
  locale,
}: {
  dialogue: Dom5Dialogue;
  locale: YoLocale;
}) {
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/15 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
      data-yo-module5-dialogue
    >
      <h3 className="text-lg font-black text-[#0F6E56]">
        <L value={dialogue.title} locale={locale} />
      </h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/70">
        {label(locale, LABELS.scene)}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#0B3040]/80">
        <L value={dialogue.scenario} locale={locale} />
      </p>
      <ol className="mt-4 space-y-3">
        {dialogue.lines.map((line, i) => (
          <li
            key={`${dialogue.id}-${i}`}
            className={[
              "rounded-2xl border p-3",
              line.isLearner
                ? "border-[#F4B400]/35 bg-[#FFF8E7]"
                : "border-[#0F6E56]/12 bg-[#F4FBF9]",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
                <L value={line.speaker} locale={locale} />
              </span>
              <YoSpeechButton text={line.target} locale={locale} compact />
            </div>
            <p className="mt-1 text-base font-black text-[#0B3040]" lang="es">
              {line.target}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#0F6E56]/80">
              <L value={line.translation} locale={locale} />
            </p>
          </li>
        ))}
      </ol>
    </article>
  );
}

function DialoguesSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-dialogues-count={data.dialogues.length}
    >
      <SectionHeader
        icon={<MessageSquare className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.dialogues)}
        title={
          locale === "en"
            ? "5 problem dialogues from real travel days"
            : locale === "es"
              ? "5 diálogos de imprevistos en días reales de viaje"
              : "5 dialogues d'imprévus tirés de vraies journées de voyage"
        }
      />
      <div className="grid gap-4">
        {data.dialogues.map((dialogue) => (
          <DialogueBlock
            key={dialogue.id}
            dialogue={dialogue}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

// ─── A2 reading texts ───────────────────────────────────────────────────

function ReadingBlock({
  reading,
  locale,
}: {
  reading: Dom5ReadingText;
  locale: YoLocale;
}) {
  const fullText = reading.paragraphs.join("\n\n");
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/15 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
      data-yo-module5-reading
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0F6E56]" lang="es">
            <L value={reading.title} locale={locale} />
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/70">
            {reading.wordCount} {label(locale, LABELS.wordCount)}
          </p>
        </div>
        <YoSpeechButton text={fullText} locale={locale} compact />
      </div>
      <div className="mt-4 space-y-3" lang="es">
        {reading.paragraphs.map((paragraph, i) => (
          <div
            key={i}
            className="rounded-2xl bg-[#F4FBF9] p-3"
            data-yo-module5-reading-paragraph
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex-1 text-sm leading-relaxed text-[#0B3040]">
                {paragraph}
              </p>
              <YoSpeechButton text={paragraph} locale={locale} compact />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-[#F4B400]/30 bg-[#FFF8E7] p-3">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
          {label(locale, LABELS.vocabulary)}
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {reading.vocabulary.map((vocab, i) => (
            <li key={i} className="text-sm">
              <span className="font-black text-[#0B3040]" lang="es">
                {vocab.target}
              </span>{" "}
              <span className="text-[#0F6E56]/75">
                — <L value={vocab.gloss} locale={locale} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
          {label(locale, LABELS.questions)}
        </p>
        <DominicanRepublicModule5ReadingQuestions
          reading={reading}
          locale={locale}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-[#1D9E75]/30 bg-[#DDF4F1] p-3">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]">
          {label(locale, LABELS.writtenPrompt)}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
          <L value={reading.writtenPrompt} locale={locale} />
        </p>
      </div>
    </article>
  );
}

function ReadingsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-readings-count={data.readingTexts.length}
    >
      <SectionHeader
        icon={<BookOpen className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.readings)}
        title={
          locale === "en"
            ? "5 A2 Spanish readings · 130-180 words each"
            : locale === "es"
              ? "5 lecturas A2 · 130-180 palabras cada una"
              : "5 lectures A2 · 130-180 mots chacune"
        }
      />
      <div className="grid gap-4">
        {data.readingTexts.map((reading) => (
          <ReadingBlock key={reading.id} reading={reading} locale={locale} />
        ))}
      </div>
    </section>
  );
}

// ─── A2 guided writing tasks ────────────────────────────────────────────

function WritingTasksSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-writing-count={data.writingTasks.length}
    >
      <SectionHeader
        icon={<PenLine className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.writing)}
        title={
          locale === "en"
            ? "4 guided A2 writing tasks · 40-70 words"
            : locale === "es"
              ? "4 tareas A2 de escritura guiada · 40-70 palabras"
              : "4 tâches d'écriture A2 guidées · 40-70 mots"
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.writingTasks.map((task) => (
          <article
            key={task.id}
            className="rounded-3xl border border-[#0F6E56]/12 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module5-writing-task
          >
            <h3 className="text-base font-black text-[#0F6E56]">
              <L value={task.title} locale={locale} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={task.prompt} locale={locale} />
            </p>
            <div className="mt-3 rounded-2xl bg-[#F4FBF9] p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                {label(locale, LABELS.usefulPhrases)}
              </p>
              <ul className="mt-1.5 space-y-1.5" lang="es">
                {task.usefulPhrases.map((phrase, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-2 text-sm font-black text-[#0B3040]"
                  >
                    <span>{phrase}</span>
                    <YoSpeechButton text={phrase} locale={locale} compact />
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-2xl border border-[#F4B400]/30 bg-[#FFF8E7] p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
                {label(locale, LABELS.scaffold)}
              </p>
              <ol className="mt-1.5 space-y-1 text-sm text-[#5a3f0f]">
                {task.scaffold.map((step, i) => (
                  <li key={i}>
                    <span className="mr-1 font-black">{i + 1}.</span>
                    <L value={step} locale={locale} />
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-2 text-xs font-semibold text-[#0F6E56]/70">
              <L value={task.wordTarget} locale={locale} />
            </p>
            <DominicanRepublicModule5WritingReveal
              task={task}
              locale={locale}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Oral interaction roleplay cards ────────────────────────────────────

function RoleplaysSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-roleplays-count={data.roleplayCards.length}
    >
      <SectionHeader
        icon={<Users className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.roleplay)}
        title={
          locale === "en"
            ? "4 oral interaction roleplays for travel duos"
            : locale === "es"
              ? "4 roleplays de interacción oral para parejas de viaje"
              : "4 roleplays d'interaction orale en duo voyage"
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.roleplayCards.map((card) => (
          <article
            key={card.id}
            className="rounded-3xl border border-[#0F6E56]/12 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module5-roleplay
          >
            <h3 className="text-base font-black text-[#0F6E56]">
              <L value={card.title} locale={locale} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={card.scene} locale={locale} />
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#F4FBF9] p-3 text-sm">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                  {label(locale, LABELS.partnerA)}
                </p>
                <p className="mt-1 text-[#0B3040]/80">
                  <L value={card.roleA} locale={locale} />
                </p>
              </div>
              <div className="rounded-2xl bg-[#FFF4D6] p-3 text-sm">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
                  {label(locale, LABELS.partnerB)}
                </p>
                <p className="mt-1 text-[#5a3f0f]">
                  <L value={card.roleB} locale={locale} />
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-[#0F6E56]/15 bg-white/80 p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                {label(locale, LABELS.usefulPhrases)}
              </p>
              <ul className="mt-1.5 space-y-1" lang="es">
                {card.targetPhrases.map((phrase, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm font-black text-[#0B3040]">
                    <span>{phrase}</span>
                    <YoSpeechButton text={phrase} locale={locale} compact />
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-2xl border border-[#1D9E75]/30 bg-[#DDF4F1] p-3">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]">
                {label(locale, LABELS.successChecklist)}
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-[#0F6E56]/85">
                {card.successChecklist.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                    <span>
                      <L value={step} locale={locale} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <DominicanRepublicModule5RoleplayReveal
              card={card}
              locale={locale}
              modelLabel={LABELS.modelSentence}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── A2 grammar / language toolbox ──────────────────────────────────────

function GrammarSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-grammar-count={data.grammarCards.length}
    >
      <SectionHeader
        icon={<Sprout className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.grammar)}
        title={
          locale === "en"
            ? "12 A2 patterns · past tense, polite requests, plans, connectors"
            : locale === "es"
              ? "12 patrones A2 · pasado, solicitudes amables, planes, conectores"
              : "12 schémas A2 · passé, demandes polies, projets, connecteurs"
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.grammarCards.map((card) => (
          <article
            key={card.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module5-grammar-card
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {label(locale, LABELS.pattern)}
            </p>
            <p className="mt-1 text-base font-black text-[#0B3040]" lang="es">
              {card.pattern}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85">
              <span className="font-black">
                {label(locale, LABELS.meaning)} ·{" "}
              </span>
              <L value={card.meaning} locale={locale} />
            </p>
            <div className="mt-3 rounded-2xl bg-[#F4FBF9] p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
                {label(locale, LABELS.examples)}
              </p>
              <ul className="mt-1 space-y-2">
                {card.examples.map((ex, i) => (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-black text-[#0B3040]" lang="es">
                        {ex.target}
                      </p>
                      <YoSpeechButton text={ex.target} locale={locale} compact />
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[#0F6E56]/75">
                      <L value={ex.translation} locale={locale} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#0B3040]/80">
              <span className="font-black uppercase tracking-[0.12em] text-[0.65rem] text-[#0F6E56]/70">
                {label(locale, LABELS.practice)} ·{" "}
              </span>
              <L value={card.prompt} locale={locale} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Flashcards · same RD-intro premium carousel ────────────────────────

function FlashcardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  const cards = module5FlashcardsToYo(data.flashcards);
  return (
    <YoFlashcardPreview
      cards={cards}
      locale={locale}
      title={
        locale === "en"
          ? "Flashcards · A2 capstone vocabulary"
          : locale === "es"
            ? "Tarjetas · vocabulario A2 capstone"
            : "Flashcards · vocabulaire A2 capstone"
      }
      subtitle={
        locale === "en"
          ? "Same RD-intro carousel — Spanish on the front, gloss on the back, browser audio on each card."
          : locale === "es"
            ? "El mismo carrusel del intro RD — español al frente, glosa atrás, audio del navegador en cada tarjeta."
            : "Même carrousel que l'intro RD — l'espagnol devant, le sens derrière, audio du navigateur sur chaque carte."
      }
      headingId="yo-do-m5-flashcards-title"
      sectionClassName="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      audioMode="browser-speech"
    />
  );
}

// ─── Printable worksheets ────────────────────────────────────────────────

const PRINT_KIND_LABELS: Record<
  Dom5PrintableSheet["kind"],
  Record<YoLocale, string>
> = {
  vocabulary: { fr: "Vocabulaire", en: "Vocabulary", es: "Vocabulario" },
  fill_blank: {
    fr: "Phrases à compléter",
    en: "Fill in the blanks",
    es: "Completar frases",
  },
  past_tense: {
    fr: "Pratique du passé",
    en: "Past-tense practice",
    es: "Práctica del pasado",
  },
  connectors: {
    fr: "Connecteurs et séquence",
    en: "Connectors and sequencing",
    es: "Conectores y secuencia",
  },
  reading: { fr: "Compréhension", en: "Reading", es: "Comprensión" },
  writing: { fr: "Tâche d'écriture", en: "Writing task", es: "Tarea escrita" },
  final_workbook: {
    fr: "Cahier final A2",
    en: "Final A2 workbook",
    es: "Cuaderno final A2",
  },
};

function PrintableSheet({
  sheet,
  locale,
}: {
  sheet: Dom5PrintableSheet;
  locale: YoLocale;
}) {
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/12 bg-white p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)] print:break-inside-avoid"
      data-yo-module5-printable-worksheet
      data-yo-module5-printable-kind={sheet.kind}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-[#0F6E56]/20 pb-3">
        <h3 className="text-lg font-black text-[#0F6E56]">
          <L value={sheet.title} locale={locale} />
        </h3>
        <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          {label(locale, PRINT_KIND_LABELS[sheet.kind])}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/80">
        <L value={sheet.instructions} locale={locale} />
      </p>
      <ol className="mt-4 space-y-2.5">
        {sheet.items.map((item, i) => (
          <li
            key={item.id}
            className="rounded-2xl border border-[#0F6E56]/10 bg-[#F8FBF9] p-3"
          >
            <div className="flex flex-wrap items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-[0.65rem] font-black text-white">
                {i + 1}
              </span>
              <div className="flex-1 space-y-1">
                {item.target ? (
                  <p className="text-sm font-black text-[#0B3040]" lang="es">
                    {item.target}
                  </p>
                ) : null}
                <p className="text-sm leading-relaxed text-[#0F6E56]/85">
                  <L value={item.prompt} locale={locale} />
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <details className="mt-4 rounded-2xl border border-[#1D9E75]/30 bg-[#DDF4F1] p-3 text-sm leading-relaxed text-[#0F6E56]/85 print:open">
        <summary className="cursor-pointer text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
          {label(locale, LABELS.answerKey)}
        </summary>
        <ol className="mt-2 space-y-1.5">
          {sheet.items.map((item, i) => (
            <li key={`ans-${item.id}`}>
              <span className="font-black text-[#0F6E56]/80">
                {i + 1}.{" "}
              </span>
              <L value={item.answer} locale={locale} />
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

function PrintablesSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      id="yo-do-m5-printables"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          icon={<FileText className="size-4 text-[#1D9E75]" aria-hidden />}
          labelText={label(locale, SECTION_LABELS.printables)}
          title={
            locale === "en"
              ? "Print 7 real A2 practice sheets"
              : locale === "es"
                ? "Imprime 7 hojas de práctica A2 reales"
                : "Imprime 7 fiches d'exercices A2 réels"
          }
          body={label(locale, LABELS.printHint)}
        />
        <DominicanRepublicModule5PrintButton
          label={data.printButtonLabel}
          locale={locale}
        />
      </div>
      <div
        className="grid gap-4 md:grid-cols-2 print:grid-cols-1"
        data-yo-module5-printable-count={data.printableSheets.length}
      >
        {data.printableSheets.map((sheet) => (
          <PrintableSheet key={sheet.id} sheet={sheet} locale={locale} />
        ))}
      </div>
    </section>
  );
}

// ─── A2 self-assessment ─────────────────────────────────────────────────

function SelfAssessmentSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-self-assessment-count={data.selfAssessment.length}
    >
      <SectionHeader
        icon={<ClipboardList className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.selfAssessment)}
        title={
          locale === "en"
            ? "Tick what you can already do (A2 self-assessment)"
            : locale === "es"
              ? "Marca lo que ya puedes hacer (autoevaluación A2)"
              : "Coche ce que tu sais déjà faire (auto-évaluation A2)"
        }
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {data.selfAssessment.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4"
            data-yo-module5-self-assessment-item
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-[#0F6E56]/35 bg-white"
            >
              <CheckCircle2 className="size-4 text-[#1D9E75]/0" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-[#0B3040]/85">
              <L value={item.statement} locale={locale} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Series completion · final closing card ─────────────────────────────

function SeriesCompletionSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA2Capstone;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module5-series-completion
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-7">
        <div
          aria-hidden
          className="absolute right-5 top-5 rounded-full border border-dashed border-[#F26B5E]/45 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#F26B5E]/75"
        >
          A2 capstone stamp
        </div>
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#8a5a17]">
          {label(locale, SECTION_LABELS.seriesEnd)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#5a3f0f] sm:text-3xl">
          <L value={data.seriesCompletionTitle} locale={locale} />
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#5a3f0f]/85">
          <L value={data.seriesCompletionBody} locale={locale} />
        </p>
        <div className="mt-4 rounded-2xl bg-white/80 p-3 text-sm text-[#5a3f0f]">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
            {label(locale, LABELS.recap)}
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>
              1 ·{" "}
              {locale === "en"
                ? "Intro: greetings & Dominican vibe."
                : locale === "es"
                  ? "Intro: saludos y sabor dominicano."
                  : "Intro : salutations et ambiance dominicaine."}
            </li>
            <li>
              2 ·{" "}
              {locale === "en"
                ? "Arrival: airport, hotel, first problems."
                : locale === "es"
                  ? "Llegada: aeropuerto, hotel, primeros problemas."
                  : "Arrivée : aéroport, hôtel, premiers problèmes."}
            </li>
            <li>
              3 ·{" "}
              {locale === "en"
                ? "Eat & order: menu, paying, asking for the bill."
                : locale === "es"
                  ? "Comer y pedir: menú, pagar, la cuenta."
                  : "Manger et commander : menu, payer, l'addition."}
            </li>
            <li>
              4 ·{" "}
              {locale === "en"
                ? "Get around: directions, transport, day trips."
                : locale === "es"
                  ? "Moverte: direcciones, transporte, salidas."
                  : "Se déplacer : directions, transport, sorties."}
            </li>
            <li>
              5 ·{" "}
              {locale === "en"
                ? "A2 capstone: surprises, fast speech, final mission."
                : locale === "es"
                  ? "Capstone A2: imprevistos, español rápido, misión final."
                  : "Capstone A2 : imprévus, espagnol rapide, mission finale."}
            </li>
          </ul>
        </div>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-[#5a3f0f]">
          {label(locale, LABELS.series)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/trouver-un-prof?q=espagnol"
            data-yo-module5-teacher-cta
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.teacherCta)}
          </a>
          <a
            href="/yo/langues/espagnol/pays/republique-dominicaine"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-2.5 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {locale === "en"
              ? "Back to the Dominican country page"
              : locale === "es"
                ? "Volver a la página de República Dominicana"
                : "Retour à la page République dominicaine"}
          </a>
        </div>
        <div className="mt-5 border-t border-[#F4B400]/25 pt-4">
          <YoMarkModuleCompletedButton
            locale={locale}
            payload={{
              course_id: "yopratiqo:es:republique-dominicaine",
              module_id: "module-5",
              module_title:
                locale === "en"
                  ? "Module 5 — A2 capstone"
                  : locale === "es"
                    ? "Módulo 5 — Capstone A2"
                    : "Module 5 — Capstone A2",
              discipline: "Languages",
              level_label: "A2",
              skill_tags: ["vocabulary", "listening", "conversation", "culture"],
              difficulty_tags: ["needs_listening_repetition", "needs_pronunciation_support"],
              score_band: "developing",
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Main content component ─────────────────────────────────────────────

export interface DominicanRepublicModule5ContentProps {
  locale: YoLocale;
  breadcrumb?: YoBreadcrumbItem[];
}

export function DominicanRepublicModule5Content({
  locale,
  breadcrumb,
}: DominicanRepublicModule5ContentProps) {
  const data = dominicanRepublicA2Capstone;

  return (
    <div className="bg-[linear-gradient(180deg,#FFF8E7_0%,#F7FBF8_30%,#FCEEDC_70%,#FFF4D6_100%)]">
      <main id="main-content" className="flex flex-col pb-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <YoBreadcrumb items={breadcrumb} locale={locale} />
        ) : null}

        <HeroSection locale={locale} />
        <AudioNoticeSection locale={locale} />
        <PassportSection locale={locale} />
        <SkillDashboardSection locale={locale} />
        <PhraseBankSection locale={locale} />
        <FastSpeechSection locale={locale} />
        <DialoguesSection locale={locale} />
        <ReadingsSection locale={locale} />
        <WritingTasksSection locale={locale} />
        <RoleplaysSection locale={locale} />
        <GrammarSection locale={locale} />
        <FlashcardsSection locale={locale} />

        <DominicanRepublicModule5Quiz
          questions={data.quizQuestions}
          locale={locale}
          eyebrow={{
            fr: SECTION_LABELS.quiz.fr,
            en: SECTION_LABELS.quiz.en,
            es: SECTION_LABELS.quiz.es,
          }}
          title={{
            fr: "Quiz pratique A2 · choix en espagnol uniquement",
            en: "A2 practice quiz · Spanish-only choices",
            es: "Quiz práctico A2 · opciones solo en español",
          }}
          subtitle={{
            fr: "Choisis une réponse, puis appuie sur Vérifier pour voir la traduction et l'explication.",
            en: "Pick an answer, then press Check to see the translation and explanation.",
            es: "Elige una respuesta y pulsa Verificar para ver la traducción y la explicación.",
          }}
        />

        <DominicanRepublicCapstoneGame
          title={data.finalGame.title}
          subtitle={data.finalGame.subtitle}
          successMessage={data.finalGame.successMessage}
          rounds={data.finalGame.rounds}
          locale={locale}
        />

        <PrintablesSection locale={locale} />
        <SelfAssessmentSection locale={locale} />
        <SeriesCompletionSection locale={locale} />

        <span aria-hidden hidden>
          <MapIcon />
        </span>
      </main>
    </div>
  );
}

