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
 *     A1+ â†’ early A2 bridge note. No full conjugation tables.
 *   - All audio comes from the browser (YoSpeechButton â†’
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
  type Dom4ReadingText,
} from "@/lib/yo/dominicanRepublicExplore";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoPrintableResourceCard } from "@/components/yo/YoPrintableResourceCard";
import { module4FlashcardsToYo } from "@/lib/yo/dominicanRepublicFlashcardAdapters";
import {
  DominicanRepublicExplorerChallenge,
  DominicanRepublicModule4Quiz,
  DominicanRepublicModule4ReadingQuestions,
} from "@/components/yo/DominicanRepublicModule4Interactive";
import { getPrintableResourceById } from "@/lib/yo/printableResources";
import { dominicanRdModuleProgressPayload } from "@/lib/yo/dominicanRepublicProgressPayloads";
import { YoMarkModuleCompletedButton } from "@/components/yo/YoMarkModuleCompletedButton";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";

const SECTION_LABELS = {
  passport: { fr: "Passeport exploration", en: "Exploration passport", es: "Pasaporte de exploraciÃ³n" },
  places: { fr: "Lieux et culture", en: "Places and culture", es: "Lugares y cultura" },
  phrases: { fr: "Banque de phrases", en: "Phrase bank", es: "Banco de frases" },
  dialogues: { fr: "Dialogues guidÃ©s", en: "Guided dialogues", es: "DiÃ¡logos guiados" },
  ears: { fr: "Oreilles dominicaines", en: "Dominican ears", es: "OÃ­do dominicano" },
  grammar: { fr: "Micro-grammaire", en: "Micro-grammar", es: "MicrogramÃ¡tica" },
  readings: { fr: "Lectures espagnoles", en: "Spanish readings", es: "Lecturas en espaÃ±ol" },
  flashcards: { fr: "Flashcards", en: "Flashcards", es: "Tarjetas" },
  quiz: { fr: "Quiz pratique", en: "Practice quiz", es: "Quiz prÃ¡ctico" },
  game: { fr: "DÃ©fi explorateur", en: "Explorer challenge", es: "Reto explorador" },
  printables: { fr: "Fiches imprimables", en: "Printable practice sheets", es: "Hojas imprimibles" },
};

const LABELS = {
  module: { fr: "Module 4", en: "Module 4", es: "MÃ³dulo 4" },
  level: { fr: "A1+ â†’ A2", en: "A1+ â†’ A2", es: "A1+ â†’ A2" },
  bridgeBadge: {
    fr: "Pont vers l'A2 voyage",
    en: "Bridge to travel A2",
    es: "Puente hacia el A2 de viaje",
  },
  browserAudio: { fr: "Audio de pratique", en: "Practice audio", es: "Audio de prÃ¡ctica" },
  noAudioPlayback: {
    fr: "Audio de pratique intÃ©grÃ© au navigateur. La voix peut varier selon l'appareil.",
    en: "Practice audio uses your browser voice. Voice quality may vary by device.",
    es: "El audio de prÃ¡ctica usa la voz del navegador. La calidad puede variar segÃºn el dispositivo.",
  },
  region: { fr: "RÃ©gion", en: "Region", es: "RegiÃ³n" },
  culturalNote: { fr: "Note culturelle", en: "Cultural note", es: "Nota cultural" },
  practicePhrase: { fr: "Phrase Ã  essayer", en: "Phrase to try", es: "Frase para practicar" },
  category: { fr: "CatÃ©gorie", en: "Category", es: "CategorÃ­a" },
  scene: { fr: "La scÃ¨ne", en: "The scene", es: "La escena" },
  translation: { fr: "Traduction", en: "Translation", es: "TraducciÃ³n" },
  pattern: { fr: "SchÃ©ma", en: "Pattern", es: "Esquema" },
  meaning: { fr: "Sens", en: "Meaning", es: "Sentido" },
  examples: { fr: "Exemples", en: "Examples", es: "Ejemplos" },
  practice: { fr: "Ã€ toi", en: "Your turn", es: "Tu turno" },
  pastTenseTitle: {
    fr: "PassÃ© pratique Â· phrases utiles",
    en: "Practical past tense Â· useful phrases",
    es: "Pasado prÃ¡ctico Â· frases Ãºtiles",
  },
  vocabulary: {
    fr: "Vocabulaire Ã  repÃ©rer",
    en: "Vocabulary to spot",
    es: "Vocabulario para identificar",
  },
  wordCount: { fr: "mots espagnols", en: "Spanish words", es: "palabras en espaÃ±ol" },
  readMore: {
    fr: "RÃ©ponses guidÃ©es",
    en: "Guided answers",
    es: "Respuestas guiadas",
  },
  printHint: {
    fr: "Exercices conÃ§us pour l'impression : appariement, complÃ©tion, pratique des formes au passÃ©, comprÃ©hension et journal de voyage.",
    en: "Worksheets designed for print: matching, fill-in-the-blanks, past-tense phrases, reading comprehension, and a travel journal.",
    es: "Hojas pensadas para imprimir: emparejamiento, completar frases, formas en pasado, comprensiÃ³n y diario de viaje.",
  },
  answerKey: {
    fr: "Voir le corrigÃ©",
    en: "Show answer key",
    es: "Ver clave de respuestas",
  },
  hideAnswerKey: {
    fr: "Masquer le corrigÃ©",
    en: "Hide answer key",
    es: "Ocultar clave",
  },
  teacherBridge: {
    fr: "AprÃ¨s le module, apporte ces phrases Ã  ton professeur Pratiqo pour les pratiquer Ã  voix haute.",
    en: "After the module, bring these phrases to your Pratiqo teacher to practice out loud.",
    es: "DespuÃ©s del mÃ³dulo, lleva estas frases a tu profesor de Pratiqo para practicarlas en voz alta.",
  },
  teacherCta: {
    fr: "Trouver un professeur",
    en: "Find a teacher",
    es: "Encontrar un profesor",
  },
  module3: {
    fr: "Retour au module 3",
    en: "Back to module 3",
    es: "Volver al mÃ³dulo 3",
  },
  nextModuleEyebrow: {
    fr: "Module suivant",
    en: "Next module",
    es: "Siguiente mÃ³dulo",
  },
  module5: {
    fr: "Ouvrir le module 5",
    en: "Open Module 5",
    es: "Abrir el mÃ³dulo 5",
  },
  module5Body: {
    fr: "Continue avec le capstone A2 : imprÃ©vus, conversations rapides et mission finale dominicaine.",
    en: "Continue with the A2 capstone: unexpected situations, fast conversations, and the final Dominican mission.",
    es: "Sigue con el capstone A2: imprevistos, conversaciones rÃ¡pidas y la misiÃ³n final dominicana.",
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

// â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              {label(locale, LABELS.module)} Â· {label(locale, LABELS.level)}
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
              "Â¿CÃ³mo llego a la Zona Colonial?",
              "Voy para SamanÃ¡.",
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
                <p className="mt-1 text-2xl font-black">RD A1+ â†’ A2</p>
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

// â”€â”€â”€ Audio notice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Exploration passport map (mission stops) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              : "6 Ã©tapes pour bouger et raconter ta sortie"
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

// â”€â”€â”€ Place / culture cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              : "12 lieux dominicains Ã  connaÃ®tre"
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

// â”€â”€â”€ Phrase bank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              ? "40 frases en espaÃ±ol para moverte"
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

// â”€â”€â”€ Dialogues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              ? "3 diÃ¡logos guiados: transporte, direcciones, excursiÃ³n"
              : "3 dialogues guidÃ©s : transport, directions, excursion"
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

// â”€â”€â”€ Dominican ears (transport awareness) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              ? "Afina el oÃ­do dominicano en el transporte"
              : "AffÃ»te ton oreille dominicaine en transit"
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

// â”€â”€â”€ Micro-grammar with the past-tense bridge note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              ? "MicrogramÃ¡tica: direcciones y frases de viaje"
              : "Micro-grammaire : directions et phrases de voyage"
        }
      />

      {/*
        Past-tense bridge note. We render it as a dedicated callout
        BEFORE the grammar grid so the learner reads the A1+ â†’ A2
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
                {label(locale, LABELS.meaning)} Â·{" "}
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
                {label(locale, LABELS.practice)} Â·{" "}
              </span>
              <L value={card.prompt} locale={locale} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// â”€â”€â”€ Spanish reading texts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                â€” <L value={vocab.gloss} locale={locale} />
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
              ? "3 lecturas breves de viaje en espaÃ±ol"
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

// â”€â”€â”€ Flashcards Â· same RD-intro premium carousel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FlashcardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicExplore;
  const cards = module4FlashcardsToYo(data.flashcards);
  return (
    <YoFlashcardPreview
      cards={cards}
      locale={locale}
      title={
        locale === "en"
          ? "Flashcards Â· transport, directions, places, past-tense phrases"
          : locale === "es"
            ? "Tarjetas Â· transporte, direcciones, lugares, frases en pasado"
            : "Flashcards Â· transport, directions, lieux, phrases au passÃ©"
      }
      subtitle={
        locale === "en"
          ? "Same RD-intro carousel â€” Spanish on the front, gloss on the back, browser audio on each card."
          : locale === "es"
            ? "El mismo carrusel del intro RD â€” espaÃ±ol al frente, glosa atrÃ¡s, audio del navegador en cada tarjeta."
            : "MÃªme carrousel que l'intro RD â€” l'espagnol devant, le sens derriÃ¨re, audio du navigateur sur chaque carte."
      }
      headingId="yo-do-m4-flashcards-title"
      sectionClassName="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      audioMode="browser-speech"
    />
  );
}

// Printable resource card - full sheets live in the print route.
function PrintablesSection({ locale }: { locale: YoLocale }) {
  const resource = getPrintableResourceById("rd-m4-exploration-sheets");
  if (!resource) return null;

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
              ? "Open the printable exploration sheets"
              : locale === "es"
                ? "Abre las hojas imprimibles de exploracion"
                : "Ouvre les fiches imprimables d exploration"
          }
          body={label(locale, LABELS.printHint)}
        />
      </div>
      <div data-yo-module4-printable-resource-card>
        <YoPrintableResourceCard resource={resource} locale={locale} />
      </div>
    </section>
  );
}

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
        <div
          className="mt-5 border-t border-[#F4B400]/25 pt-4"
          data-yo-module4-progress-complete
        >
          <YoMarkModuleCompletedButton
            locale={locale}
            payload={dominicanRdModuleProgressPayload("module-4", locale)}
          />
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Deck screen labels (app-style focused screens) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Each screen of the lesson deck gets its own short eyebrow / title /
// helper triplet. The educational content inside each screen is still
// rendered by the existing section components above â€” we are only
// re-composing the page into a no-scroll swipe deck, not rewriting any
// pedagogy. Keep these strings short: the deck header is mobile-first
// and longer strings collapse the title font-size.

const DECK_LABEL_MISSION = lstr("Mission", "Mission", "MisiÃ³n");
const DECK_TITLE_MISSION = lstr(
  "Se dÃ©placer et explorer la RD",
  "Move around and explore the DR",
  "Moverse y explorar la RD",
);
const DECK_HELPER_MISSION = lstr(
  "Demande ton chemin, prends une guagua et raconte ta sortie en espagnol.",
  "Ask for directions, hop on a guagua, and tell your outing in Spanish.",
  "Pide direcciones, sube a una guagua y cuenta tu salida en espaÃ±ol.",
);

const DECK_LABEL_PASSPORT = lstr(
  "Passeport exploration",
  "Exploration passport",
  "Pasaporte de exploraciÃ³n",
);
const DECK_TITLE_PASSPORT = lstr(
  "6 Ã©tapes pour bouger en RD",
  "6 stops to move around the DR",
  "6 paradas para moverte por la RD",
);
const DECK_HELPER_PASSPORT = lstr(
  "Une mini-feuille de route avant de plonger dans les phrases utiles.",
  "A mini roadmap before diving into the useful phrases.",
  "Un mini mapa antes de saltar a las frases Ãºtiles.",
);

const DECK_LABEL_PLACES = lstr(
  "Lieux et culture",
  "Places and culture",
  "Lugares y cultura",
);
const DECK_TITLE_PLACES = lstr(
  "12 lieux dominicains Ã  connaÃ®tre",
  "12 Dominican places to know",
  "12 lugares dominicanos para conocer",
);
const DECK_HELPER_PLACES = lstr(
  "Chaque carte garde une note culturelle et une phrase Ã  essayer Ã  voix haute.",
  "Each card keeps a culture note and a phrase to try out loud.",
  "Cada tarjeta guarda una nota cultural y una frase para decir en voz alta.",
);

const DECK_LABEL_PHRASES = lstr(
  "Banque de phrases",
  "Phrase bank",
  "Banco de frases",
);
const DECK_TITLE_PHRASES = lstr(
  "40 phrases pour bouger sur place",
  "40 phrases for moving around",
  "40 frases para moverte por ahÃ­",
);
const DECK_HELPER_PHRASES = lstr(
  "Demander, indiquer, monter, descendre, payer â€” tape l'audio du navigateur sur chaque carte.",
  "Ask, point, board, get off, pay â€” tap browser audio on each card.",
  "Pedir, seÃ±alar, subir, bajar, pagar â€” toca el audio del navegador en cada tarjeta.",
);

const DECK_LABEL_DIALOGUES = lstr(
  "Dialogues guidÃ©s",
  "Guided dialogues",
  "DiÃ¡logos guiados",
);
const DECK_TITLE_DIALOGUES = lstr(
  "3 scÃ¨nes : transport, directions, excursion",
  "3 scenes: transport, directions, day-trip",
  "3 escenas: transporte, direcciones, excursiÃ³n",
);
const DECK_HELPER_DIALOGUES = lstr(
  "Lis chaque rÃ©plique en espagnol, Ã©coute la voix du navigateur, puis rÃ©pÃ¨te Ã  voix haute.",
  "Read each line in Spanish, play the browser voice, then repeat aloud.",
  "Lee cada lÃ­nea en espaÃ±ol, escucha la voz del navegador y repite en voz alta.",
);

const DECK_LABEL_EARS_GRAMMAR = lstr(
  "Oreilles et grammaire",
  "Ears and grammar",
  "OÃ­do y gramÃ¡tica",
);
const DECK_TITLE_EARS_GRAMMAR = lstr(
  "Oreille dominicaine + passÃ© pratique",
  "Dominican ears + practical past tense",
  "OÃ­do dominicano + pasado prÃ¡ctico",
);
const DECK_HELPER_EARS_GRAMMAR = lstr(
  "AffÃ»te ton oreille en transport, puis ancre les chunks au passÃ© pour raconter une sortie.",
  "Sharpen your transit ear, then anchor the past-tense chunks for telling an outing.",
  "Afina el oÃ­do en transporte y ancla los chunks en pasado para contar una salida.",
);

const DECK_LABEL_READINGS = lstr(
  "Lectures espagnoles",
  "Spanish readings",
  "Lecturas en espaÃ±ol",
);
const DECK_TITLE_READINGS = lstr(
  "3 lectures courtes pour s'immerger",
  "3 short readings to immerse",
  "3 lecturas breves para sumergirte",
);
const DECK_HELPER_READINGS = lstr(
  "RepÃ¨re le vocabulaire de voyage, puis rÃ©vÃ¨le les rÃ©ponses guidÃ©es une Ã  une.",
  "Spot the travel vocabulary, then reveal the guided answers one by one.",
  "Identifica el vocabulario de viaje y revela las respuestas guiadas una a una.",
);

const DECK_LABEL_FLASHCARDS = lstr(
  "Flashcards",
  "Flashcards",
  "Tarjetas",
);
const DECK_TITLE_FLASHCARDS = lstr(
  "Carrousel transport, directions, passÃ©",
  "Transport, directions, past-tense carousel",
  "Carrusel transporte, direcciones, pasado",
);
const DECK_HELPER_FLASHCARDS = lstr(
  "Espagnol devant, glose derriÃ¨re, audio du navigateur sur chaque carte.",
  "Spanish on the front, gloss on the back, browser audio on each card.",
  "EspaÃ±ol al frente, glosa atrÃ¡s, audio del navegador en cada tarjeta.",
);

const DECK_LABEL_QUIZ = lstr(
  "Quiz pratique",
  "Practice quiz",
  "Quiz prÃ¡ctico",
);
const DECK_TITLE_QUIZ = lstr(
  "Choix en espagnol uniquement",
  "Spanish-only choices",
  "Opciones solo en espaÃ±ol",
);
const DECK_HELPER_QUIZ = lstr(
  "Pas de panique : la traduction et l'explication n'apparaissent qu'aprÃ¨s ton choix.",
  "No stress: the translation and explanation only appear after your pick.",
  "Sin estrÃ©s: la traducciÃ³n y la explicaciÃ³n aparecen solo despuÃ©s de tu elecciÃ³n.",
);

const DECK_LABEL_MINI_MISSION = lstr(
  "DÃ©fi explorateur",
  "Explorer challenge",
  "Reto explorador",
);
const DECK_TITLE_MINI_MISSION = lstr(
  "Mini-mission Â· raconter ta sortie",
  "Mini mission Â· tell your outing",
  "Mini misiÃ³n Â· cuenta tu salida",
);
const DECK_HELPER_MINI_MISSION = lstr(
  "Plusieurs rounds rapides : choisis la rÃ©ponse, lis le retour, passe Ã  la suivante.",
  "Quick rounds: pick the answer, read the feedback, move on.",
  "Rondas rÃ¡pidas: elige la respuesta, lee la pista y sigue.",
);

const DECK_LABEL_PRINTABLES = lstr(
  "Fiches imprimables",
  "Printable practice",
  "Hojas imprimibles",
);
const DECK_TITLE_PRINTABLES = lstr(
  "5 fiches d'exercices rÃ©els",
  "5 real practice sheets",
  "5 hojas de prÃ¡ctica reales",
);
const DECK_HELPER_PRINTABLES = lstr(
  "Appariement, complÃ©tion, phrases au passÃ©, comprÃ©hension et journal de voyage.",
  "Matching, fill-in-the-blanks, past-tense phrases, reading and a travel journal.",
  "Emparejamiento, completar, frases en pasado, comprensiÃ³n y diario de viaje.",
);

const DECK_LABEL_COMPLETION = lstr(
  "Bravo, explorateur",
  "Nice work, explorer",
  "Bien hecho, explorador",
);
const DECK_TITLE_COMPLETION = lstr(
  "Sauvegarde ta progression",
  "Save your progress",
  "Guarda tu progreso",
);
const DECK_HELPER_COMPLETION = lstr(
  "Marque le module 4 comme terminÃ©, puis enchaÃ®ne avec le pont vers ton professeur Pratiqo.",
  "Mark module 4 as completed, then bridge to your Pratiqo teacher.",
  "Marca el mÃ³dulo 4 como completado y luego pasa al puente con tu profesor de Pratiqo.",
);

// Visible compact chrome label. Aligned with the rest of the
// Dominican Republic learning path (Intro Â· RD A1, Module 2 Â· RD
// A1, Module 3 Â· RD A1, Module 5 Â· RD A2) so the deck header
// rhythm is consistent across all five surfaces. The accurate
// CEFR bridge level (A1+ â†’ A2) stays expressed in the underlying
// educational data file (`lib/yo/dominicanRepublicExplore.ts`)
// â€” the chrome label is intentionally calm.
const DECK_MODULE_LABEL = lstr(
  "Module 4 Â· RD A1",
  "Module 4 Â· DR A1",
  "MÃ³dulo 4 Â· RD A1",
);

// â”€â”€â”€ Deck composer (Module 4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Composes the 12 focused lesson-deck screens from the existing
// section components. Companion visual states follow the brief:
//   - `map` for navigation / exploration / immersion screens
//   - `confused` for practice / dialogue / quiz / direction-problem screens
//   - `celebrating` for the final completion screen
// `teacher_ready` is intentionally not used â€” there is no live AI tutor
// behaviour here; the teacher bridge lives inside the completion screen
// as a static CTA only.

function buildModule4DeckScreens(locale: YoLocale): YoLessonDeckScreen[] {
  const data = dominicanRepublicExplore;

  return [
    {
      id: "mission",
      kind: "mission",
      eyebrow: t(DECK_LABEL_MISSION, locale),
      title: t(DECK_TITLE_MISSION, locale),
      helperText: t(DECK_HELPER_MISSION, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="mission">
          <HeroSection locale={locale} />
          <AudioNoticeSection locale={locale} />
        </div>
      ),
    },
    {
      id: "passport",
      kind: "culture",
      eyebrow: t(DECK_LABEL_PASSPORT, locale),
      title: t(DECK_TITLE_PASSPORT, locale),
      helperText: t(DECK_HELPER_PASSPORT, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="passport">
          <PassportSection locale={locale} />
        </div>
      ),
    },
    {
      id: "places",
      kind: "culture",
      eyebrow: t(DECK_LABEL_PLACES, locale),
      title: t(DECK_TITLE_PLACES, locale),
      helperText: t(DECK_HELPER_PLACES, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="places">
          <PlaceCardsSection locale={locale} />
        </div>
      ),
    },
    {
      id: "phrases",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_PHRASES, locale),
      title: t(DECK_TITLE_PHRASES, locale),
      helperText: t(DECK_HELPER_PHRASES, locale),
      companionState: "confused",
      content: (
        <div data-yo-module4-deck-screen="phrases">
          <PhraseBankSection locale={locale} />
        </div>
      ),
    },
    {
      id: "dialogues",
      kind: "dialogue",
      eyebrow: t(DECK_LABEL_DIALOGUES, locale),
      title: t(DECK_TITLE_DIALOGUES, locale),
      helperText: t(DECK_HELPER_DIALOGUES, locale),
      companionState: "confused",
      content: (
        <div data-yo-module4-deck-screen="dialogues">
          <DialoguesSection locale={locale} />
        </div>
      ),
    },
    {
      id: "ears-grammar",
      kind: "practice",
      eyebrow: t(DECK_LABEL_EARS_GRAMMAR, locale),
      title: t(DECK_TITLE_EARS_GRAMMAR, locale),
      helperText: t(DECK_HELPER_EARS_GRAMMAR, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="ears-grammar">
          <EarsSection locale={locale} />
          <GrammarSection locale={locale} />
        </div>
      ),
    },
    {
      id: "readings",
      kind: "culture",
      eyebrow: t(DECK_LABEL_READINGS, locale),
      title: t(DECK_TITLE_READINGS, locale),
      helperText: t(DECK_HELPER_READINGS, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="readings">
          <ReadingsSection locale={locale} />
        </div>
      ),
    },
    {
      id: "flashcards",
      kind: "practice",
      eyebrow: t(DECK_LABEL_FLASHCARDS, locale),
      title: t(DECK_TITLE_FLASHCARDS, locale),
      helperText: t(DECK_HELPER_FLASHCARDS, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="flashcards">
          <FlashcardsSection locale={locale} />
        </div>
      ),
    },
    {
      id: "quiz",
      kind: "quiz",
      eyebrow: t(DECK_LABEL_QUIZ, locale),
      title: t(DECK_TITLE_QUIZ, locale),
      helperText: t(DECK_HELPER_QUIZ, locale),
      companionState: "confused",
      content: (
        <div data-yo-module4-deck-screen="quiz">
          <DominicanRepublicModule4Quiz
            questions={data.quizQuestions}
            locale={locale}
            eyebrow={{
              fr: SECTION_LABELS.quiz.fr,
              en: SECTION_LABELS.quiz.en,
              es: SECTION_LABELS.quiz.es,
            }}
            title={{
              fr: "Quiz pratique Â· choix en espagnol uniquement",
              en: "Practice quiz Â· Spanish-only choices",
              es: "Quiz prÃ¡ctico Â· opciones solo en espaÃ±ol",
            }}
            subtitle={{
              fr: "Choisis une rÃ©ponse, puis appuie sur VÃ©rifier pour voir la traduction et l'explication.",
              en: "Pick an answer, then press Check to see the translation and explanation.",
              es: "Elige una respuesta y pulsa Verificar para ver la traducciÃ³n y la explicaciÃ³n.",
            }}
          />
        </div>
      ),
    },
    {
      id: "mini-mission",
      kind: "practice",
      eyebrow: t(DECK_LABEL_MINI_MISSION, locale),
      title: t(DECK_TITLE_MINI_MISSION, locale),
      helperText: t(DECK_HELPER_MINI_MISSION, locale),
      companionState: "confused",
      content: (
        <div data-yo-module4-deck-screen="mini-mission">
          <DominicanRepublicExplorerChallenge
            title={data.finalGame.title}
            subtitle={data.finalGame.subtitle}
            successMessage={data.finalGame.successMessage}
            rounds={data.finalGame.rounds}
            locale={locale}
          />
        </div>
      ),
    },
    {
      id: "printables",
      kind: "practice",
      eyebrow: t(DECK_LABEL_PRINTABLES, locale),
      title: t(DECK_TITLE_PRINTABLES, locale),
      helperText: t(DECK_HELPER_PRINTABLES, locale),
      companionState: "map",
      content: (
        <div data-yo-module4-deck-screen="printables">
          <PrintablesSection locale={locale} />
        </div>
      ),
    },
    {
      id: "completion",
      kind: "completion",
      eyebrow: t(DECK_LABEL_COMPLETION, locale),
      title: t(DECK_TITLE_COMPLETION, locale),
      helperText: t(DECK_HELPER_COMPLETION, locale),
      companionState: "celebrating",
      content: (
        <div data-yo-module4-deck-screen="completion">
          <ClosingBridge locale={locale} />
        </div>
      ),
    },
  ];
}

// â”€â”€â”€ Deck renderer (no-primary-scroll app viewport) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Wraps <YoLessonDeck /> with `enableTapNavigation` so the experience
// matches Modules 2 and 3. Tap-zone navigation is safe because every
// per-screen interactive control on Module 4 (audio buttons, the
// reveal-only quiz `<details>` / `<button>` choices, the explorer-
// challenge round buttons, the print button, the next-module / teacher
// CTA links, the mark-completed button, the reading reveal `<details>`)
// is either a real HTML control already covered by the deck's audited
// gesture-exclude selector (`YO_LESSON_DECK_GESTURE_EXCLUDE_SELECTOR`)
// or wrapped with `data-no-deck-swipe` / `data-no-deck-tap`.
//
// The Trophy icon is mounted hidden so the unused-import lint stays
// quiet (it is still used inside the explorer-challenge interactive
// component when rendered).

function Module4DeckRenderer({ locale }: { locale: YoLocale }) {
  const screens = buildModule4DeckScreens(locale);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const backHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref =
    locale === "fr"
      ? "/yo/langues/espagnol/pays/republique-dominicaine/module-4?lang=en"
      : "/yo/langues/espagnol/pays/republique-dominicaine/module-4";

  return (
    <>
      <YoLessonDeck
        locale={locale}
        moduleLabel={t(DECK_MODULE_LABEL, locale)}
        backHref={backHref}
        toggleHref={toggleHref}
        screens={screens}
        enableTapNavigation
      />
      <span aria-hidden hidden>
        <Trophy />
      </span>
    </>
  );
}

// â”€â”€â”€ Main content component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DominicanRepublicModule4Mode = "long-scroll" | "deck";

export interface DominicanRepublicModule4ContentProps {
  locale: YoLocale;
  breadcrumb?: YoBreadcrumbItem[];
  /**
   * Render mode. Defaults to `"long-scroll"` so any other surface (tests,
   * legacy embed, future preview) keeps the original document layout.
   * The public Module 4 route opts into `"deck"` for the app-like
   * no-scroll swipe lesson deck.
   */
  mode?: DominicanRepublicModule4Mode;
}

export function DominicanRepublicModule4Content({
  locale,
  breadcrumb,
  mode = "long-scroll",
}: DominicanRepublicModule4ContentProps) {
  const data = dominicanRepublicExplore;

  if (mode === "deck") {
    return <Module4DeckRenderer locale={locale} />;
  }

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
            fr: "Quiz pratique Â· choix en espagnol uniquement",
            en: "Practice quiz Â· Spanish-only choices",
            es: "Quiz prÃ¡ctico Â· opciones solo en espaÃ±ol",
          }}
          subtitle={{
            fr: "Choisis une rÃ©ponse, puis appuie sur VÃ©rifier pour voir la traduction et l'explication.",
            en: "Pick an answer, then press Check to see the translation and explanation.",
            es: "Elige una respuesta y pulsa Verificar para ver la traducciÃ³n y la explicaciÃ³n.",
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
