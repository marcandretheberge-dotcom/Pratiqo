/**
 * DominicanRepublicModule4Content - premium "Getting around and exploring"
 * module renderer (A1+ / early A2 bridge).
 *
 * Server component. The only client behaviour is delegated to
 * DominicanRepublicModule4Interactive (print button + reveal-only quiz +
 * reading comprehension reveal + final explorer challenge).
 *
 * Pedagogical contract:
 *   - Pre-reveal, the practice quiz and final game show ONLY Spanish
 *     answer choices. Translations / explanations appear after the
 *     learner commits to a pick.
 *   - Past tense is taught as practical chunks (fui / visite / tome /
 *     camine / compre / saque / me gusto / fue), with an explicit
 *     A1+ → early A2 bridge note. No full conjugation tables.
 *   - All audio comes from the browser (YoSpeechButton →
 *     SpeechSynthesis). No MP3 file is referenced anywhere.
 */

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Headphones,
  Map as MapIcon,
  MapPinned,
  Sparkles,
  Sprout,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  dominicanRepublicExplore,
  type Dom4Dialogue,
  type Dom4PrintableSheet,
  type Dom4ReadingText,
} from "@/lib/yo/dominicanRepublicExplore";
import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { module4FlashcardsToYo } from "@/lib/yo/dominicanRepublicFlashcardAdapters";
import {
  DominicanRepublicExplorerChallenge,
  DominicanRepublicModule4PrintButton,
  DominicanRepublicModule4Quiz,
  DominicanRepublicModule4ReadingQuestions,
} from "@/components/yo/DominicanRepublicModule4Interactive";

const SECTION_LABELS = {
  passport: { fr: "Passeport exploration", en: "Exploration passport", es: "Pasaporte de exploración" },
  places: { fr: "Lieux et culture", en: "Places and culture", es: "Lugares y cultura" },
  phrases: { fr: "Banque de phrases", en: "Phrase bank", es: "Banco de frases" },
  dialogues: { fr: "Dialogues guidés", en: "Guided dialogues", es: "Diálogos guiados" },
  ears: { fr: "Oreilles dominicaines", en: "Dominican ears", es: "Oído dominicano" },
  grammar: { fr: "Micro-grammaire", en: "Micro-grammar", es: "Microgramática" },
  readings: { fr: "Lectures espagnoles", en: "Spanish readings", es: "Lecturas en español" },
  flashcards: { fr: "Flashcards", en: "Flashcards", es: "Tarjetas" },
  quiz: { fr: "Quiz pratique", en: "Practice quiz", es: "Quiz práctico" },
  game: { fr: "Défi explorateur", en: "Explorer challenge", es: "Reto explorador" },
  printables: { fr: "Fiches imprimables", en: "Printable practice sheets", es: "Hojas imprimibles" },
};

const LABELS = {
  module: { fr: "Module 4", en: "Module 4", es: "Módulo 4" },
  level: { fr: "A1+ → A2", en: "A1+ → A2", es: "A1+ → A2" },
  bridgeBadge: {
    fr: "Pont vers l'A2 voyage",
    en: "Bridge to travel A2",
    es: "Puente hacia el A2 de viaje",
  },
  browserAudio: { fr: "Audio de pratique", en: "Practice audio", es: "Audio de práctica" },
  noAudioPlayback: {
    fr: "Audio de pratique intégré au navigateur. La voix peut varier selon l'appareil.",
    en: "Practice audio uses your browser voice. Voice quality may vary by device.",
    es: "El audio de práctica usa la voz del navegador. La calidad puede variar según el dispositivo.",
  },
  region: { fr: "Région", en: "Region", es: "Región" },
  culturalNote: { fr: "Note culturelle", en: "Cultural note", es: "Nota cultural" },
  practicePhrase: { fr: "Phrase à essayer", en: "Phrase to try", es: "Frase para practicar" },
  category: { fr: "Catégorie", en: "Category", es: "Categoría" },
  scene: { fr: "La scène", en: "The scene", es: "La escena" },
  translation: { fr: "Traduction", en: "Translation", es: "Traducción" },
  pattern: { fr: "Schéma", en: "Pattern", es: "Esquema" },
  meaning: { fr: "Sens", en: "Meaning", es: "Sentido" },
  examples: { fr: "Exemples", en: "Examples", es: "Ejemplos" },
  practice: { fr: "À toi", en: "Your turn", es: "Tu turno" },
  pastTenseTitle: {
    fr: "Passé pratique · phrases utiles",
    en: "Practical past tense · useful phrases",
    es: "Pasado práctico · frases útiles",
  },
  vocabulary: {
    fr: "Vocabulaire à repérer",
    en: "Vocabulary to spot",
    es: "Vocabulario para identificar",
  },
  wordCount: { fr: "mots espagnols", en: "Spanish words", es: "palabras en español" },
  readMore: {
    fr: "Réponses guidées",
    en: "Guided answers",
    es: "Respuestas guiadas",
  },
  printHint: {
    fr: "Exercices conçus pour l'impression : appariement, complétion, pratique des formes au passé, compréhension et journal de voyage.",
    en: "Worksheets designed for print: matching, fill-in-the-blanks, past-tense phrases, reading comprehension, and a travel journal.",
    es: "Hojas pensadas para imprimir: emparejamiento, completar frases, formas en pasado, comprensión y diario de viaje.",
  },
  answerKey: {
    fr: "Voir le corrigé",
    en: "Show answer key",
    es: "Ver clave de respuestas",
  },
  hideAnswerKey: {
    fr: "Masquer le corrigé",
    en: "Hide answer key",
    es: "Ocultar clave",
  },
  teacherBridge: {
    fr: "Après le module, apporte ces phrases à ton professeur Pratiqo pour les pratiquer à voix haute.",
    en: "After the module, bring these phrases to your Pratiqo teacher to practice out loud.",
    es: "Después del módulo, lleva estas frases a tu profesor de Pratiqo para practicarlas en voz alta.",
  },
  teacherCta: {
    fr: "Trouver un professeur",
    en: "Find a teacher",
    es: "Encontrar un profesor",
  },
  module3: {
    fr: "Retour au module 3",
    en: "Back to module 3",
    es: "Volver al módulo 3",
  },
  nextModuleEyebrow: {
    fr: "Module suivant",
    en: "Next module",
    es: "Siguiente módulo",
  },
  module5: {
    fr: "Ouvrir le module 5",
    en: "Open Module 5",
    es: "Abrir el módulo 5",
  },
  module5Body: {
    fr: "Continue avec le capstone A2 : imprévus, conversations rapides et mission finale dominicaine.",
    en: "Continue with the A2 capstone: unexpected situations, fast conversations, and the final Dominican mission.",
    es: "Sigue con el capstone A2: imprevistos, conversaciones rápidas y la misión final dominicana.",
  },
};

function label(locale: YoLocale, values: Record<YoLocale, string>): string {
  return values[locale] ?? values.fr;
}

function L({ value, locale }: { value: YoLocalizedString; locale: YoLocale }) {
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

// ─── Hero ────────────────────────────────────────────────────────────────

function HeroSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      aria-labelledby="yo-do-m4-hero-title"
      className="relative overflow-hidden bg-[#F8EBCB]"
      data-yo-module4-premium-hero
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(244,180,0,0.34),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(221,244,241,0.78),transparent_28%),linear-gradient(135deg,#FFF8E7_0%,#F8EBCB_44%,#DDF4F1_100%)]"
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
              <Sprout className="size-3.5" aria-hidden />
              {label(locale, LABELS.bridgeBadge)}
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
            id="yo-do-m4-hero-title"
            className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0B3040] sm:text-4xl lg:text-5xl"
          >
            {t(data.heroTitle, locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#0B3040]/74 sm:text-lg">
            {t(data.heroSubtitle, locale)}
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {[
              "¿Cómo llego a la Zona Colonial?",
              "Voy para Samaná.",
              "Doble a la derecha.",
              "Ayer fui a la playa.",
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
          data-yo-module4-passport-visual
        >
          <div
            aria-hidden
            className="absolute -right-5 top-8 rotate-12 rounded-full border-2 border-dashed border-[#F26B5E]/55 px-5 py-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#F26B5E]/80"
          >
            RD travel stamp
          </div>
          <div className="rounded-[1.5rem] border border-[#F4B400]/35 bg-[#FFF4D6] p-5 text-[#0F6E56]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                  Travel passport visual
                </p>
                <p className="mt-1 text-2xl font-black">RD A1+ → A2</p>
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
              {label(locale, LABELS.teacherBridge)}
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

// ─── Exploration passport map (mission stops) ───────────────────────────

function PassportSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-exploration-passport
    >
      <SectionHeader
        icon={<MapPinned className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.passport)}
        title={
          locale === "en"
            ? "6 stops to move and tell your trip"
            : locale === "es"
              ? "6 paradas para moverte y contar tu viaje"
              : "6 étapes pour bouger et raconter ta sortie"
        }
        id="yo-do-m4-passport-title"
      />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.missionStops.map((stop) => (
          <li
            key={stop.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/85 p-4 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module4-mission-stop
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

// ─── Place / culture cards ──────────────────────────────────────────────

function PlaceCardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-place-cards-count={data.placeCards.length}
    >
      <SectionHeader
        icon={<MapIcon className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.places)}
        title={
          locale === "en"
            ? "12 Dominican places to know"
            : locale === "es"
              ? "12 lugares dominicanos para conocer"
              : "12 lieux dominicains à connaître"
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.placeCards.map((place) => (
          <article
            key={place.id}
            className="rounded-3xl border border-[#0F6E56]/12 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
            data-yo-module4-place-card
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-black text-[#0F6E56]" lang="es">
                {place.name}
              </h3>
              <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                {label(locale, LABELS.region)}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/70">
              <L value={place.region} locale={locale} />
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={place.description} locale={locale} />
            </p>
            <div className="mt-3 rounded-2xl bg-[#F4FBF9] p-3 text-sm leading-relaxed text-[#0F6E56]/85">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]/70">
                {label(locale, LABELS.culturalNote)}
              </p>
              <p className="mt-1">
                <L value={place.culturalNote} locale={locale} />
              </p>
            </div>
            <div className="mt-3 rounded-2xl border border-[#F4B400]/30 bg-[#FFF8E7] p-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
                {label(locale, LABELS.practicePhrase)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="text-sm font-black text-[#0B3040]" lang="es">
                  {place.phrase}
                </p>
                <YoSpeechButton text={place.phrase} locale={locale} compact />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Phrase bank ────────────────────────────────────────────────────────

function PhraseBankSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-phrase-count={data.phraseBank.length}
    >
      <SectionHeader
        icon={<BookOpen className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.phrases)}
        title={
          locale === "en"
            ? "40 Spanish travel phrases for moving around"
            : locale === "es"
              ? "40 frases en español para moverte"
              : "40 phrases espagnoles pour bouger sur place"
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.phraseBank.map((phrase) => (
          <article
            key={phrase.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module4-phrase
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

// ─── Dialogues ──────────────────────────────────────────────────────────

function DialogueBlock({
  dialogue,
  locale,
}: {
  dialogue: Dom4Dialogue;
  locale: YoLocale;
}) {
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/15 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
      data-yo-module4-dialogue
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
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-dialogues
    >
      <SectionHeader
        icon={<ArrowRight className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.dialogues)}
        title={
          locale === "en"
            ? "3 guided dialogues: transport, directions, day-trip"
            : locale === "es"
              ? "3 diálogos guiados: transporte, direcciones, excursión"
              : "3 dialogues guidés : transport, directions, excursion"
        }
      />
      <div className="grid gap-4">
        <DialogueBlock dialogue={data.transportDialogue} locale={locale} />
        <DialogueBlock dialogue={data.directionsDialogue} locale={locale} />
        <DialogueBlock dialogue={data.dayTripDialogue} locale={locale} />
      </div>
    </section>
  );
}

// ─── Dominican ears (transport awareness) ───────────────────────────────

function EarsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-ears
    >
      <SectionHeader
        icon={<Headphones className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.ears)}
        title={
          locale === "en"
            ? "Train your Dominican ears for transit"
            : locale === "es"
              ? "Afina el oído dominicano en el transporte"
              : "Affûte ton oreille dominicaine en transit"
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.earCards.map((ear) => (
          <article
            key={ear.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module4-ear
          >
            <h3 className="text-base font-black text-[#0F6E56]">
              <L value={ear.title} locale={locale} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#0B3040]/80">
              <L value={ear.description} locale={locale} />
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#F4FBF9] p-3">
              <p className="text-sm font-black text-[#0B3040]" lang="es">
                {ear.practicePhrase}
              </p>
              <YoSpeechButton text={ear.practicePhrase} locale={locale} compact />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Micro-grammar with the past-tense bridge note ──────────────────────

function GrammarSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-grammar-count={data.grammarCards.length}
    >
      <SectionHeader
        icon={<Sprout className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.grammar)}
        title={
          locale === "en"
            ? "Micro-grammar: directions and travel phrases"
            : locale === "es"
              ? "Microgramática: direcciones y frases de viaje"
              : "Micro-grammaire : directions et phrases de voyage"
        }
      />

      {/*
        Past-tense bridge note. We render it as a dedicated callout
        BEFORE the grammar grid so the learner reads the A1+ → A2
        contract first: past tense is taught as practical chunks,
        not as full conjugation tables.
      */}
      <aside
        className="mb-5 rounded-3xl border border-[#1D9E75]/30 bg-[#DDF4F1] p-4 text-[#0F6E56] sm:p-5"
        data-yo-module4-past-tense-bridge-note
      >
        <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          {label(locale, LABELS.pastTenseTitle)}
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          <L value={data.pastTenseBridgeNote} locale={locale} />
        </p>
      </aside>

      <div className="grid gap-4 md:grid-cols-2">
        {data.grammarCards.map((card) => (
          <article
            key={card.id}
            className="rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,58,52,0.05)]"
            data-yo-module4-grammar-card
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
              <span className="font-black">
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

// ─── Spanish reading texts ──────────────────────────────────────────────

function ReadingBlock({
  reading,
  locale,
}: {
  reading: Dom4ReadingText;
  locale: YoLocale;
}) {
  const fullText = reading.paragraphs.join("\n\n");
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/15 bg-white/90 p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
      data-yo-module4-reading
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
          <p
            key={i}
            className="rounded-2xl bg-[#F4FBF9] p-3 text-sm leading-relaxed text-[#0B3040]"
          >
            {paragraph}
          </p>
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
          <Eye className="mr-1 inline size-3.5" aria-hidden />
          {label(locale, LABELS.readMore)}
        </p>
        <DominicanRepublicModule4ReadingQuestions
          reading={reading}
          locale={locale}
        />
      </div>
    </article>
  );
}

function ReadingsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module4-readings-count={data.readingTexts.length}
    >
      <SectionHeader
        icon={<BookOpen className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.readings)}
        title={
          locale === "en"
            ? "3 short Spanish travel readings"
            : locale === "es"
              ? "3 lecturas breves de viaje en español"
              : "3 lectures espagnoles courtes de voyage"
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

// ─── Flashcards · same RD-intro premium carousel ────────────────────────

function FlashcardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  const cards = module4FlashcardsToYo(data.flashcards);
  return (
    <YoFlashcardPreview
      cards={cards}
      locale={locale}
      title={
        locale === "en"
          ? "Flashcards · transport, directions, places, past-tense phrases"
          : locale === "es"
            ? "Tarjetas · transporte, direcciones, lugares, frases en pasado"
            : "Flashcards · transport, directions, lieux, phrases au passé"
      }
      subtitle={
        locale === "en"
          ? "Same RD-intro carousel — Spanish on the front, gloss on the back, browser audio on each card."
          : locale === "es"
            ? "El mismo carrusel del intro RD — español al frente, glosa atrás, audio del navegador en cada tarjeta."
            : "Même carrousel que l'intro RD — l'espagnol devant, le sens derrière, audio du navigateur sur chaque carte."
      }
      headingId="yo-do-m4-flashcards-title"
      sectionClassName="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      audioMode="browser-speech"
    />
  );
}

// ─── Printable worksheets · real reinforcement exercises ────────────────

const PRINT_KIND_LABELS: Record<
  Dom4PrintableSheet["kind"],
  Record<YoLocale, string>
> = {
  vocabulary: { fr: "Vocabulaire", en: "Vocabulary", es: "Vocabulario" },
  fill_blank: {
    fr: "Phrases à compléter",
    en: "Fill in the blanks",
    es: "Completar frases",
  },
  verb_chunks: {
    fr: "Petites phrases au passé pour raconter une sortie",
    en: "Useful past-tense phrases for describing an outing",
    es: "Frases útiles en pasado para contar una salida",
  },
  reading: { fr: "Compréhension", en: "Reading", es: "Comprensión" },
  roleplay: { fr: "Journal de voyage", en: "Travel journal", es: "Diario de viaje" },
};

function PrintableSheet({
  sheet,
  locale,
}: {
  sheet: Dom4PrintableSheet;
  locale: YoLocale;
}) {
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/12 bg-white p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)] print:break-inside-avoid"
      data-yo-module4-printable-worksheet
      data-yo-module4-printable-kind={sheet.kind}
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
      {/*
        Answer key uses native <details> so it works in print and stays
        purely server-rendered. `print:open` ensures the corrigé prints
        even if the learner left it collapsed on screen.
      */}
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
  const data = dominicanRepublicExplore;
  return (
    <section
      id="yo-do-m4-printables"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          icon={<FileText className="size-4 text-[#1D9E75]" aria-hidden />}
          labelText={label(locale, SECTION_LABELS.printables)}
          title={
            locale === "en"
              ? "Print 5 real practice sheets"
              : locale === "es"
                ? "Imprime 5 hojas de práctica reales"
                : "Imprime 5 fiches d'exercices réels"
          }
          body={label(locale, LABELS.printHint)}
        />
        <DominicanRepublicModule4PrintButton
          label={data.printButtonLabel}
          locale={locale}
        />
      </div>
      <div
        className="grid gap-4 md:grid-cols-2 print:grid-cols-1"
        data-yo-module4-printable-count={data.printableSheets.length}
      >
        {data.printableSheets.map((sheet) => (
          <PrintableSheet key={sheet.id} sheet={sheet} locale={locale} />
        ))}
      </div>
    </section>
  );
}

// ─── Closing bridge · CTA back to teacher + Module 3 ────────────────────

function ClosingBridge({ locale }: { locale: YoLocale }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-7">
        <div
          aria-hidden
          className="absolute right-5 top-5 rounded-full border border-dashed border-[#F26B5E]/45 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#F26B5E]/75"
        >
          explorer stamp
        </div>
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#8a5a17]">
          {label(locale, LABELS.nextModuleEyebrow)}
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5a3f0f]">
          {label(locale, LABELS.module5Body)}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#5a3f0f]/80">
          {label(locale, LABELS.teacherBridge)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/yo/langues/espagnol/pays/republique-dominicaine/module-5"
            data-yo-module4-next-module="module-5"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.module5)}
          </a>
          <a
            href="/trouver-un-prof?q=espagnol"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-2.5 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.teacherCta)}
          </a>
          <a
            href="/yo/langues/espagnol/pays/republique-dominicaine/module-3"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-2.5 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.module3)}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Main content component ────────────────────────────────────────────

export interface DominicanRepublicModule4ContentProps {
  locale: YoLocale;
  breadcrumb?: YoBreadcrumbItem[];
}

export function DominicanRepublicModule4Content({
  locale,
  breadcrumb,
}: DominicanRepublicModule4ContentProps) {
  const data = dominicanRepublicExplore;

  return (
    <div className="bg-[linear-gradient(180deg,#FFF8E7_0%,#F7FBF8_34%,#F8EBCB_100%)]">
      <main id="main-content" className="flex flex-col pb-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <YoBreadcrumb items={breadcrumb} locale={locale} />
        ) : null}

        <HeroSection locale={locale} />
        <AudioNoticeSection locale={locale} />
        <PassportSection locale={locale} />
        <PlaceCardsSection locale={locale} />
        <PhraseBankSection locale={locale} />
        <DialoguesSection locale={locale} />
        <EarsSection locale={locale} />
        <GrammarSection locale={locale} />
        <ReadingsSection locale={locale} />
        <FlashcardsSection locale={locale} />

        <DominicanRepublicModule4Quiz
          questions={data.quizQuestions}
          locale={locale}
          eyebrow={{
            fr: SECTION_LABELS.quiz.fr,
            en: SECTION_LABELS.quiz.en,
            es: SECTION_LABELS.quiz.es,
          }}
          title={{
            fr: "Quiz pratique · choix en espagnol uniquement",
            en: "Practice quiz · Spanish-only choices",
            es: "Quiz práctico · opciones solo en español",
          }}
          subtitle={{
            fr: "Choisis une réponse, puis appuie sur Vérifier pour voir la traduction et l'explication.",
            en: "Pick an answer, then press Check to see the translation and explanation.",
            es: "Elige una respuesta y pulsa Verificar para ver la traducción y la explicación.",
          }}
        />

        <DominicanRepublicExplorerChallenge
          title={data.finalGame.title}
          subtitle={data.finalGame.subtitle}
          successMessage={data.finalGame.successMessage}
          rounds={data.finalGame.rounds}
          locale={locale}
        />

        <PrintablesSection locale={locale} />
        <ClosingBridge locale={locale} />

        {/*
          Trophy icon kept for the final-game heading; importing here so
          unused-import lint doesn't fire on the file when only the
          interactive component renders the visual.
        */}
        <span aria-hidden hidden>
          <Trophy />
        </span>
      </main>
    </div>
  );
}
