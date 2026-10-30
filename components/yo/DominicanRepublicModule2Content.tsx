/**
 * DominicanRepublicModule2Content — premium server-only renderer for
 * the Dominican Republic Spanish Module 2 (À l'hôtel et à l'aéroport).
 *
 * Design contract:
 *   - No "use client". Pure server render — no hooks, no browser APIs.
 *   - Arrival dialogues use an asset-gated listening lesson. Other practice
 *     surfaces retain their browser-speech controls.
 *   - No checkout, no payment gating, no Stripe, no Supabase.
 *   - Static reveal sections (quiz, mini-mission) use <details>/<summary>.
 *     The arrival listening lesson is an interactive client component.
 *   - All UI labels use YoLocalizedString + t() for FR/EN/ES support.
 *   - Spanish phrases rendered with lang="es" for accessibility.
 *
 * Quality template: this file serves as the reference for future premium
 * YoPratiqo modules. Follow this structure and naming for new modules.
 */

import {
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Lightbulb,
  MapPin,
  MessageCircle,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";
import { arrivalListeningScenes } from "@/lib/yo/dominicanArrivalListening";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";
import { YoArrivalListeningLesson } from "@/components/yo/YoArrivalListeningLesson";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoPrintableResourceCard } from "@/components/yo/YoPrintableResourceCard";
import { module2FlashcardsToYo } from "@/lib/yo/dominicanRepublicFlashcardAdapters";
import { getPrintableResourceById } from "@/lib/yo/printableResources";
import type {
  Dom2Dialogue,
  Dom2GrammarCard,
} from "@/lib/yo/dominicanRepublicHotelAirport";
import { dominicanRdModuleProgressPayload } from "@/lib/yo/dominicanRepublicProgressPayloads";
import { YoMarkModuleCompletedButton } from "@/components/yo/YoMarkModuleCompletedButton";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";

// ─── Section labels ────────────────────────────────────────────────────────

const LABEL_MODULE = lstr("Module 2", "Module 2");
const LABEL_MISSION_MAP = lstr("Carte de la mission", "Mission map");
const LABEL_MISSION_TITLE = lstr(
  "6 étapes pour maîtriser l'aéroport et l'hôtel",
  "6 steps to master the airport and hotel",
);
const LABEL_PHRASES = lstr("Phrases essentielles", "Essential phrases");
const LABEL_PHRASES_TITLE = lstr(
  "15 phrases de survie pour ton séjour",
  "15 survival phrases for your stay",
);
const LABEL_USAGE = lstr("Quand l'utiliser", "When to use it");
const LABEL_NOTE = lstr("Note", "Note");
const LABEL_DIALOGUE_AIRPORT_EYEBROW = lstr(
  "Dialogue · Aéroport",
  "Dialogue · Airport",
  "Diálogo · Aeropuerto",
);
const LABEL_DIALOGUE_HOTEL_EYEBROW = lstr(
  "Dialogue · Hôtel",
  "Dialogue · Hotel",
  "Diálogo · Hotel",
);
const LABEL_SPANISH = lstr("En espagnol", "In Spanish");
const LABEL_GLOSS = lstr("Traduction", "Translation");
const LABEL_GRAMMAR = lstr("Grammaire express", "Quick grammar");
const LABEL_GRAMMAR_TITLE = lstr(
  "5 formules qui couvrent 80 % des situations",
  "5 formulas that cover 80% of situations",
);
const LABEL_PATTERN = lstr("La formule", "The formula");
const LABEL_EXAMPLES = lstr("Exemples", "Examples");
const LABEL_FLASHCARDS = lstr("Vocabulaire · Fiches mémo", "Vocabulary · Flashcards");
const LABEL_FLASHCARDS_TITLE = lstr(
  "13 mots indispensables — mémorise-les avant de partir",
  "13 essential words — memorize them before you go",
);
const LABEL_FRONT = lstr("Espagnol", "Spanish");
const LABEL_BACK = lstr("Voir la traduction", "See translation");
const LABEL_HINT = lstr("Astuce", "Hint");
const LABEL_PRACTICE = lstr("Pratique · Quiz", "Practice · Quiz");
const LABEL_PRACTICE_TITLE = lstr(
  "5 questions pour tester tes réflexes",
  "5 questions to test your reflexes",
);
const LABEL_PRACTICE_TAGLINE = lstr(
  "Cinq questions courtes — pas de note. Pour toi, à ton rythme.",
  "Five short questions — no score. For you, at your own pace.",
);
const LABEL_QUESTION = lstr("Question", "Question");
const LABEL_ANSWER = lstr("Voir la réponse", "See answer");
const LABEL_WHY = lstr("Pourquoi", "Why");
const LABEL_MISSION = lstr("Mini-mission finale", "Final mini-mission");
const LABEL_MISSION_STEP = lstr("Étape", "Step");
const LABEL_MISSION_PHRASE = lstr("Voir la phrase à dire", "See the phrase to say");
const LABEL_MISSION_CONFIRM = lstr("Confirmation", "Confirmation");
const LABEL_COMPLETION = lstr("Mission accomplie", "Mission complete");
const LABEL_CAN_DO_TITLE = lstr("Tu sais maintenant...", "You can now...");
const LABEL_NEXT_MODULE = lstr("Prochain module", "Next module");
const LABEL_OPEN_MODULE_3 = lstr(
  "Ouvrir le module 3",
  "Open Module 3",
  "Abrir el módulo 3",
);
const LABEL_TEACHER_BRIDGE = lstr(
  "Envie de pratiquer avec un vrai professeur ?",
  "Want to practice with a real teacher?",
);
const LABEL_TEACHER_CTA = lstr("Trouver un professeur", "Find a teacher");
const LABEL_BACK_INTRO = lstr(
  "Retour à l'intro gratuite",
  "Back to the free intro",
);
const LABEL_DOMINICA_NOTE_EYEBROW = lstr(
  "Note culturelle",
  "Cultural note",
);
const LABEL_AUDIO_COMING = lstr(
  "Audio de pratique",
  "Practice audio",
  "Audio de práctica",
);
const LABEL_AUDIO_NOTE = lstr(
  "Audio de pratique intégré au navigateur. La voix peut varier selon l'appareil.",
  "Practice audio uses your browser voice. Voice quality may vary by device.",
  "El audio de práctica usa la voz del navegador. La calidad puede variar según el dispositivo.",
);
const LABEL_WORKSHEETS = lstr(
  "Cahier imprimable",
  "Printable workbook",
  "Cuaderno imprimible",
);
const LABEL_WORKSHEETS_TITLE = lstr(
  "Ouvre ton cahier Module 2",
  "Open your Module 2 workbook",
  "Abre tu cuaderno del Módulo 2",
);
const LABEL_PROBLEMS = lstr(
  "Imprévus à l'hôtel",
  "Hotel key-card moments",
  "Imprevistos en el hotel",
);
const LABEL_PROBLEMS_TITLE = lstr(
  "Dire la bonne phrase avant que le petit problème devienne gros",
  "Say the useful phrase before the small problem gets big",
  "Di la frase útil antes de que el problema crezca",
);

function pickLocale(locale: YoLocale, fr: string, en: string): string {
  if (locale === "en" && en.length > 0) return en;
  return fr;
}

// ─── Sub-sections ──────────────────────────────────────────────────────────

function HeroSection({ locale }: { locale: YoLocale }) {
  const { heroTitle, heroSubtitle, productLabel } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-hero-title"
      className="relative overflow-hidden bg-[#F8EBCB]"
      data-yo-module2-premium-hero
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(244,180,0,0.32),transparent_31%),radial-gradient(circle_at_82%_10%,rgba(221,244,241,0.8),transparent_30%),linear-gradient(135deg,#FFF8E7_0%,#F8EBCB_48%,#DDF4F1_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-8 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(15,110,86,0.22),transparent)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center lg:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0B3040] shadow-sm">
              <Sparkles className="size-3.5" aria-hidden />
              {t(productLabel, locale)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/15 bg-[#0B3040] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#FFF4D6]">
              {t(LABEL_MODULE, locale)} · A1
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/15 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold text-[#0F6E56]/80">
              {t(LABEL_AUDIO_COMING, locale)}
            </span>
          </div>

          <h1
            id="yo-do-m2-hero-title"
            className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0B3040] sm:text-4xl lg:text-5xl"
          >
            {t(heroTitle, locale)}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#0B3040]/74 sm:text-lg">
            {t(heroSubtitle, locale)}
          </p>

          <div className="mt-7 flex flex-wrap gap-2" aria-label={locale === "en" ? "Module outcomes" : "Résultats du module"}>
            {[
              lstr("Aéroport", "Airport"),
              lstr("Taxi", "Taxi"),
              lstr("Check-in", "Check-in"),
              lstr("Wifi", "Wi-Fi"),
              lstr("Problèmes", "Issues"),
            ].map((item) => (
              <span
                key={item.fr}
                className="inline-flex items-center gap-1 rounded-full border border-[#0F6E56]/12 bg-white/75 px-3 py-1 text-xs font-medium text-[#0B3040] shadow-[0_8px_18px_rgba(15,58,52,0.06)]"
              >
                <CheckCircle2 className="size-3 text-[#1D9E75]" aria-hidden />
                {t(item, locale)}
              </span>
            ))}
          </div>
        </div>

        <div
          className="relative rounded-[2rem] border border-[#0B3040]/10 bg-white/55 p-4 shadow-[0_24px_70px_rgba(15,58,52,0.14)] backdrop-blur"
          data-yo-module2-boarding-pass-visual
        >
          <div
            aria-hidden
            className="absolute -right-5 top-8 rotate-12 rounded-full border-2 border-dashed border-[#F26B5E]/55 px-5 py-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#F26B5E]/80"
          >
            arrival stamp
          </div>
          <div className="rounded-[1.5rem] border border-[#F4B400]/35 bg-[#FFF4D6] p-5 text-[#0F6E56]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
              Boarding pass visual
            </p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  SDQ
                </p>
                <p className="text-xl font-black text-[#0B3040]">Aeropuerto</p>
              </div>
              <div className="h-px w-14 bg-[linear-gradient(90deg,#0F6E56_0_45%,transparent_45%_55%,#0F6E56_55%_100%)]" />
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  Hotel
                </p>
                <p className="text-xl font-black text-[#0B3040]">Check-in</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-[#0F6E56]/10 bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                  Key card
                </span>
                <span className="rounded-full bg-[#0B3040] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#F4B400]">
                  RD A1
                </span>
              </div>
              <p className="mt-3 text-sm font-black text-[#0F6E56]" lang="es">
                Tengo una reservación.
              </p>
              <p className="mt-1 text-sm font-black text-[#0F6E56]" lang="es">
                ¿Cuál es la contraseña del wifi?
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DominicanNoteSection({ locale }: { locale: YoLocale }) {
  const { dominicaNote } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-label={t(LABEL_DOMINICA_NOTE_EYEBROW, locale)}
      className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8 sm:pt-10"
    >
      <div className="rounded-2xl border border-[#F4B400]/35 bg-[#FFF8E1]/70 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          <Lightbulb className="size-4 text-[#8a5a17]" aria-hidden />
          {t(LABEL_DOMINICA_NOTE_EYEBROW, locale)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#5a3f0f] sm:text-[0.95rem]">
          {t(dominicaNote, locale)}
        </p>
      </div>
    </section>
  );
}

function AudioPracticeNote({ locale }: { locale: YoLocale }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8">
      <div
        className="rounded-2xl border border-[#1D9E75]/25 bg-white/75 p-4 text-[#0F6E56] shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
        data-yo-browser-audio-note
      >
        <p className="text-sm font-semibold leading-relaxed">
          {t(LABEL_AUDIO_NOTE, locale)}
        </p>
      </div>
    </section>
  );
}

function MissionMapSection({ locale }: { locale: YoLocale }) {
  const { missionMap } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-mission-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module2-itinerary-map
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <Compass className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_MISSION_MAP, locale)}
      </p>
      <h2
        id="yo-do-m2-mission-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_MISSION_TITLE, locale)}
      </h2>
      <ol
        role="list"
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {missionMap.map((step) => (
          <li
            key={step.id}
            className="relative overflow-hidden rounded-3xl border border-[#F4B400]/25 bg-white/85 p-4 shadow-[0_12px_32px_rgba(15,58,52,0.07)]"
          >
            <span
              aria-hidden
              className="absolute right-4 top-4 rounded-full border border-dashed border-[#F26B5E]/45 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#F26B5E]/70"
            >
              route
            </span>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0B3040] text-sm font-black text-[#F4B400]"
              >
                {step.position}
              </span>
              <p className="text-sm font-semibold leading-snug text-[#0F6E56]">
                {t(step.title, locale)}
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/65">
              {t(step.description, locale)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CorePhrasesSection({ locale }: { locale: YoLocale }) {
  const { corePhrases } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-phrases-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <BookOpen className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_PHRASES, locale)}
      </p>
      <h2
        id="yo-do-m2-phrases-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_PHRASES_TITLE, locale)}
      </h2>
      <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
        {corePhrases.map((phrase) => {
          const note = pickLocale(locale, phrase.noteFr ?? "", phrase.noteEn ?? "");
          return (
            <li
              key={phrase.id}
              className="rounded-3xl border border-[#0F6E56]/10 bg-white/88 p-4 shadow-[0_10px_26px_rgba(15,58,52,0.05)]"
              data-yo-module2-phrase-audio-card
            >
              {/* Spanish target */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p
                  className="text-base font-semibold leading-snug text-[#0F6E56]"
                  lang="es"
                >
                  {phrase.target}
                </p>
                <YoSpeechButton text={phrase.target} locale={locale} compact />
              </div>
              {/* FR/EN translation */}
              <p className="mt-1 text-sm italic text-[#0F6E56]/70">
                {pickLocale(locale, phrase.translationFr, phrase.translationEn)}
              </p>
              {/* Usage */}
              <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/60">
                <span className="font-semibold text-[#0F6E56]/75">
                  {t(LABEL_USAGE, locale)} :{" "}
                </span>
                {pickLocale(locale, phrase.usageFr, phrase.usageEn)}
              </p>
              {/* Optional note */}
              {note ? (
                <p className="mt-2 rounded-xl bg-[#FFF8E1]/80 px-3 py-2 text-xs leading-relaxed text-[#5a3f0f]">
                  <span className="font-semibold text-[#8a5a17]">
                    {t(LABEL_NOTE, locale)} :{" "}
                  </span>
                  {note}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DialogueSection({
  dialogue,
  locale,
  eyebrowLabel,
  sectionId,
}: {
  dialogue: Dom2Dialogue;
  locale: YoLocale;
  eyebrowLabel: ReturnType<typeof lstr>;
  sectionId: "airport" | "hotel";
}) {
  const titleId = `yo-do-m2-${sectionId}-title`;
  return (
    <section
      aria-labelledby={titleId}
      data-yo-dialogue-id={dialogue.id}
      className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0F6E56]/70">
        <Users className="size-4 text-[#1D9E75]" aria-hidden />
        {t(eyebrowLabel, locale)}
      </p>
      <h2 id={titleId} className="mt-2 text-xl font-semibold text-[#0F6E56]">
        {t(arrivalListeningScenes[sectionId].title, locale)}
      </h2>
      <YoArrivalListeningLesson sceneId={sectionId} locale={locale} />
    </section>
  );
}

function GrammarSection({ locale }: { locale: YoLocale }) {
  const { grammarCards } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-grammar-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <Target className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_GRAMMAR, locale)}
      </p>
      <h2
        id="yo-do-m2-grammar-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_GRAMMAR_TITLE, locale)}
      </h2>
      <ul role="list" className="mt-5 grid gap-4 sm:grid-cols-2">
        {grammarCards.map((card: Dom2GrammarCard) => (
          <li
            key={card.id}
            className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
          >
            {/* Pattern */}
            <div className="rounded-xl bg-[#0F6E56] px-3 py-2 text-center">
              <p
                className="text-base font-black tracking-tight text-white sm:text-lg"
                lang="es"
              >
                {card.pattern}
              </p>
            </div>
            {/* Explanation */}
            <p className="mt-3 text-xs leading-relaxed text-[#0F6E56]/70">
              <span className="font-semibold text-[#0F6E56]/80">
                {t(LABEL_PATTERN, locale)} :{" "}
              </span>
              {pickLocale(locale, card.patternExplainFr, card.patternExplainEn)}
            </p>
            {/* Examples */}
            <p className="mt-3 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
              {t(LABEL_EXAMPLES, locale)}
            </p>
            <ul role="list" className="mt-1.5 space-y-1.5">
              {card.examples.map((ex, i) => (
                <li
                  key={`${card.id}-ex-${i}`}
                  className="rounded-xl bg-[#F4FBF9]/80 px-3 py-2"
                >
                  <p
                    className="text-sm font-semibold text-[#0F6E56]"
                    lang="es"
                  >
                    {ex.spanish}
                  </p>
                  <p className="mt-0.5 text-xs italic text-[#0F6E56]/60">
                    {pickLocale(locale, ex.glossFr, ex.glossEn)}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HotelProblemCardsSection({ locale }: { locale: YoLocale }) {
  const problemPhraseIds = new Set([
    "phrase_help",
    "phrase_key",
    "phrase_water",
    "phrase_repeat",
  ]);
  const problemPhrases = dominicanRepublicHotelAirport.corePhrases.filter(
    (phrase) => problemPhraseIds.has(phrase.id),
  );

  return (
    <section
      aria-labelledby="yo-do-m2-problems-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module2-hotel-problem-audio
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <Lightbulb className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_PROBLEMS, locale)}
      </p>
      <h2
        id="yo-do-m2-problems-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_PROBLEMS_TITLE, locale)}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {problemPhrases.map((phrase) => (
          <article
            key={phrase.id}
            className="rounded-3xl border border-[#F4B400]/30 bg-[#FFF4D6] p-4 shadow-[0_12px_30px_rgba(15,58,52,0.07)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-base font-black text-[#0F6E56]" lang="es">
                {phrase.target}
              </p>
              <YoSpeechButton text={phrase.target} locale={locale} compact />
            </div>
            <p className="mt-2 text-sm text-[#5a3f0f]">
              {pickLocale(locale, phrase.translationFr, phrase.translationEn)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#5a3f0f]/76">
              {pickLocale(locale, phrase.usageFr, phrase.usageEn)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FlashcardsSection({ locale }: { locale: YoLocale }) {
  const { flashcards } = dominicanRepublicHotelAirport;
  const yoCards = module2FlashcardsToYo(flashcards);
  return (
    <div
      data-yo-module2-flashcard-count={yoCards.length}
      className="mx-auto w-full max-w-5xl"
    >
      {/* Eyebrow + module-specific title kept in the module file so the
          flashcard surface still feels like part of Module 2 — the body
          below is the canonical RD-intro carousel via YoFlashcardPreview. */}
      <div className="px-5 pt-10 sm:px-8 sm:pt-14">
        <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          <Sparkles className="size-4 text-[#1D9E75]" aria-hidden />
          {t(LABEL_FLASHCARDS, locale)}
        </p>
      </div>
      <YoFlashcardPreview
        cards={yoCards}
        locale={locale}
        speechLang="es-DO"
        headingId="yo-do-m2-flashcards-title"
        title={t(LABEL_FLASHCARDS_TITLE, locale)}
        subtitle={t(LABEL_HINT, locale)}
        sectionClassName="pt-3 sm:pt-4"
        // The browser-only audio button used across Module 2 — keeps
        // the same speech/no-MP3 implementation that all other Module
        // 2 surfaces rely on. Uses a serializable string discriminator
        // because YoFlashcardPreview is a client component mounted from
        // this server component (RSC boundary forbids function props).
        audioMode="browser-speech"
      />
    </div>
  );
}

function PracticeSection({ locale }: { locale: YoLocale }) {
  const { practiceQuestions } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-practice-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <Sparkles className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_PRACTICE, locale)}
      </p>
      <h2
        id="yo-do-m2-practice-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_PRACTICE_TITLE, locale)}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/60">
        {t(LABEL_PRACTICE_TAGLINE, locale)}
      </p>
      <ol role="list" className="mt-5 space-y-4">
        {practiceQuestions.map((q, qi) => {
          const correct = q.options.find((o) => o.id === q.correctOptionId);
          return (
            <li
              key={q.id}
              className="rounded-3xl border border-[#F4B400]/25 bg-white/88 p-4 shadow-[0_12px_32px_rgba(15,58,52,0.06)] sm:p-5"
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/50">
                {t(LABEL_QUESTION, locale)} {qi + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0F6E56] sm:text-base">
                {pickLocale(locale, q.promptFr, q.promptEn)}
              </p>
              {/* Options */}
              <ul
                role="list"
                className="mt-3 space-y-1.5"
                data-yo-module2-quiz-options-no-pretranslation
              >
                {q.options.map((opt) => (
                  <li
                    key={opt.id}
                    className="flex items-start gap-2 rounded-xl border border-[#0F6E56]/10 bg-[#F7FBF8] px-3 py-2.5"
                  >
                    <span
                      aria-hidden
                      className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                    />
                    <div>
                      <p
                        className="text-sm font-medium text-[#0F6E56]"
                        lang="es"
                        data-yo-module2-quiz-choice-label
                      >
                        {opt.target}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Answer reveal */}
              {correct ? (
                <details
                  className="mt-3 rounded-xl border border-[#F4B400]/35 bg-[#FFF4D6] px-3 py-2 text-xs leading-relaxed"
                  data-yo-module2-quiz-reveal-translations
                >
                  <summary className="cursor-pointer font-bold text-[#0F6E56] focus-visible:outline-none">
                    {t(LABEL_ANSWER, locale)}
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p
                      className="font-semibold text-[#0F6E56]"
                      lang="es"
                    >
                      {correct.target}
                    </p>
                    <YoSpeechButton text={correct.target} locale={locale} compact />
                  </div>
                  <p className="mt-1 italic text-[#0F6E56]/70">
                    {pickLocale(locale, correct.glossFr, correct.glossEn)}
                  </p>
                  <p className="mt-2 text-[#0F6E56]/80">
                    <span className="font-semibold text-[#0F6E56]">
                      {t(LABEL_WHY, locale)} :{" "}
                    </span>
                    {pickLocale(locale, q.explanationFr, q.explanationEn)}
                  </p>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function MiniMissionSection({ locale }: { locale: YoLocale }) {
  const { miniMission } = dominicanRepublicHotelAirport;
  return (
    <section
      aria-labelledby="yo-do-m2-mission-final-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <MapPin className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_MISSION, locale)}
      </p>
      <h2
        id="yo-do-m2-mission-final-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(miniMission.title, locale)}
      </h2>

      {/* Scenario */}
      <div className="mt-3 rounded-2xl border border-[#DDF4F1] bg-[#F4FBF9] p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#0F6E56]/80">
          {t(miniMission.scenario, locale)}
        </p>
      </div>

      {/* Steps */}
      <ol role="list" className="mt-4 space-y-3">
        {miniMission.steps.map((step, si) => (
          <li
            key={step.id}
            className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0F6E56] text-xs font-black text-white"
              >
                {si + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-[#0F6E56]/85">
                  <span className="font-semibold text-[#0F6E56]/60 text-[0.65rem] uppercase tracking-[0.14em] mr-1">
                    {t(LABEL_MISSION_STEP, locale)} {si + 1} ·
                  </span>
                  {pickLocale(locale, step.taskFr, step.taskEn)}
                </p>
                {/* Phrase reveal */}
                <details className="mt-2.5 rounded-xl bg-[#F4FBF9]/80 px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-bold text-[#1D9E75] focus-visible:outline-none">
                    {t(LABEL_MISSION_PHRASE, locale)}
                  </summary>
                  <div
                    className="mt-2 flex flex-wrap items-center gap-3"
                    data-yo-module2-final-reveal-audio
                  >
                    <p
                      className="text-base font-black text-[#0F6E56]"
                      lang="es"
                    >
                      {step.targetPhrase}
                    </p>
                    <YoSpeechButton text={step.targetPhrase} locale={locale} compact />
                  </div>
                  <div className="mt-2 rounded-lg bg-[#DDF4F1]/60 px-2.5 py-1.5">
                    <p className="text-[0.7rem] font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                      {t(LABEL_MISSION_CONFIRM, locale)}
                    </p>
                    <p className="mt-0.5 leading-relaxed text-[#0F6E56]/80">
                      {pickLocale(locale, step.confirmFr, step.confirmEn)}
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PrintableWorksheetsSection({ locale }: { locale: YoLocale }) {
  const resource = getPrintableResourceById("rd-m2-arrival-kit");
  if (!resource) return null;

  return (
    <section
      aria-labelledby="yo-do-m2-worksheets-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module2-printable-worksheets
    >
      <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        <BookOpen className="size-4 text-[#1D9E75]" aria-hidden />
        {t(LABEL_WORKSHEETS, locale)}
      </p>
      <h2
        id="yo-do-m2-worksheets-title"
        className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl"
      >
        {t(LABEL_WORKSHEETS_TITLE, locale)}
      </h2>

      <div
        className="mt-5 print:break-inside-avoid"
        data-yo-module2-printable-resource-card
      >
        <YoPrintableResourceCard resource={resource} locale={locale} />
      </div>
    </section>
  );
}

function CompletionSection({ locale }: { locale: YoLocale }) {
  const { completion } = dominicanRepublicHotelAirport;
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  return (
    <section
      aria-labelledby="yo-do-m2-completion-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      {/* Completion card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-[linear-gradient(135deg,#0B3040_0%,#123D4E_48%,#0F6E56_100%)] p-6 text-white shadow-[0_18px_44px_rgba(15,58,52,0.18)] sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative">
          {/* Eyebrow */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-white">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t(LABEL_COMPLETION, locale)}
          </span>

          {/* Title */}
          <h2
            id="yo-do-m2-completion-title"
            className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
          >
            {t(completion.title, locale)}
          </h2>

          {/* Can-do list */}
          <p className="mt-4 text-sm font-semibold text-white/80 uppercase tracking-[0.1em]">
            {t(LABEL_CAN_DO_TITLE, locale)}
          </p>
          <ul role="list" className="mt-2 space-y-1.5">
            {completion.canDo.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm text-white/90">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                {pickLocale(locale, item.descriptionFr, item.descriptionEn)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Next module teaser */}
      <div className="mt-5 rounded-2xl border border-[#F4B400]/40 bg-[#FFF8E1]/80 p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          <Sparkles className="size-4 text-[#8a5a17]" aria-hidden />
          {t(LABEL_NEXT_MODULE, locale)}
        </p>
        <p className="mt-2 text-base font-semibold text-[#5a3f0f]">
          {t(completion.nextModuleTitle, locale)}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#5a3f0f]/80">
          {t(completion.nextModuleTeaser, locale)}
        </p>
        <a
          href={`/yo/langues/espagnol/pays/republique-dominicaine/module-3${langSuffix}`}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
        >
          {t(LABEL_OPEN_MODULE_3, locale)}
          <span aria-hidden className="ml-2">→</span>
        </a>
      </div>

      {/* Teacher bridge */}
      <div className="mt-5 rounded-2xl border border-[#0F6E56]/15 bg-white p-5 shadow-[0_1px_4px_rgba(15,58,52,0.06)] sm:p-6">
        <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          <GraduationCap className="size-4 text-[#1D9E75]" aria-hidden />
          {t(LABEL_TEACHER_BRIDGE, locale)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
          {locale === "en"
            ? "Practice these scenarios out loud with a Pratiqo teacher when you're ready — you choose when and with whom."
            : "Pratique ces scénarios à voix haute avec un professeur Pratiqo quand tu es prêt — tu choisis quand et avec qui."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/trouver-un-prof?q=espagnol"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(15,110,86,0.2)] transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            <MessageCircle className="size-4" aria-hidden />
            {t(LABEL_TEACHER_CTA, locale)}
          </a>
          <a
            href="/yo/langues/espagnol/pays/republique-dominicaine"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-2.5 text-sm font-medium text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {t(LABEL_BACK_INTRO, locale)}
          </a>
        </div>
        <div
          className="mt-5 border-t border-[#0F6E56]/10 pt-4"
          data-yo-module2-progress-complete
        >
          <YoMarkModuleCompletedButton
            locale={locale}
            payload={dominicanRdModuleProgressPayload("module-2", locale)}
          />
        </div>
      </div>
    </section>
  );
}

// ─── App-like deck composition ─────────────────────────────────────────────
//
// `mode="deck"` reuses every section sub-component above to build a 9-screen
// app-like lesson flow. Each screen reuses the same JSX surfaces — so all
// `data-yo-module2-*` markers, audio buttons, flashcards, printables and the
// completion button are preserved exactly as in the long-scroll mode. The
// deck client component (`<YoLessonDeck />`) only toggles which screen is
// visible; no educational text is rewritten and no quiz state is stored.

const DECK_LABEL_MISSION = lstr(
  "Mission · Hôtel & aéroport",
  "Mission · Hotel & airport",
  "Misión · Hotel y aeropuerto",
);
const DECK_LABEL_PHRASES = lstr(
  "Phrases · Survie",
  "Phrases · Survival",
  "Frases · Supervivencia",
);
const DECK_LABEL_AIRPORT = lstr(
  "Dialogue · Aéroport",
  "Dialogue · Airport",
  "Diálogo · Aeropuerto",
);
const DECK_LABEL_HOTEL = lstr(
  "Dialogue · Hôtel",
  "Dialogue · Hotel",
  "Diálogo · Hotel",
);
const DECK_LABEL_PROBLEMS = lstr(
  "Imprévus · Hôtel",
  "Issues · Hotel",
  "Imprevistos · Hotel",
);
const DECK_LABEL_CULTURE = lstr(
  "Note culturelle",
  "Cultural note",
  "Nota cultural",
);
const DECK_LABEL_GRAMMAR = lstr(
  "Grammaire express",
  "Quick grammar",
  "Gramática rápida",
);
const DECK_LABEL_FLASHCARDS = lstr(
  "Pratique · Vocabulaire",
  "Practice · Vocabulary",
  "Práctica · Vocabulario",
);
const DECK_LABEL_QUIZ = lstr(
  "Pratique · Quiz",
  "Practice · Quiz",
  "Práctica · Quiz",
);
const DECK_LABEL_MINI_MISSION = lstr(
  "Mini-mission finale",
  "Final mini-mission",
  "Misión final",
);
const DECK_LABEL_COMPLETION = lstr(
  "Mission accomplie",
  "Mission complete",
  "Misión cumplida",
);

const DECK_TITLE_MISSION = lstr(
  "Ta mission · Hôtel & aéroport",
  "Your mission · Hotel & airport",
  "Tu misión · Hotel y aeropuerto",
);
const DECK_TITLE_PHRASES = lstr(
  "15 phrases qui te sauvent à l'arrivée",
  "15 phrases that save you on arrival",
  "15 frases que te salvan al llegar",
);
const DECK_TITLE_AIRPORT = lstr(
  "Tu arrives à l'aéroport",
  "You arrive at the airport",
  "Llegas al aeropuerto",
);
const DECK_TITLE_HOTEL = lstr(
  "Le check-in à l'hôtel",
  "The hotel check-in",
  "El check-in del hotel",
);
const DECK_TITLE_PROBLEMS = lstr(
  "Petits soucis · Grandes phrases",
  "Small issues · Big phrases",
  "Pequeños problemas · Grandes frases",
);
const DECK_TITLE_CULTURE = lstr(
  "Le ton dominicain",
  "The Dominican vibe",
  "El estilo dominicano",
);
const DECK_TITLE_GRAMMAR = lstr(
  "5 formules qui couvrent presque tout",
  "5 formulas that cover almost everything",
  "5 fórmulas que cubren casi todo",
);
const DECK_TITLE_FLASHCARDS = lstr(
  "Mémorise et révise",
  "Memorize and review",
  "Memoriza y repasa",
);
const DECK_TITLE_QUIZ = lstr(
  "Teste tes réflexes",
  "Test your reflexes",
  "Prueba tus reflejos",
);
const DECK_TITLE_MINI_MISSION = lstr(
  "Joue la scène d'arrivée",
  "Play out the arrival scene",
  "Actúa la escena de llegada",
);
const DECK_TITLE_COMPLETION = lstr(
  "Tu es prêt(e) à voyager",
  "You're ready to travel",
  "Estás listo(a) para viajar",
);

const DECK_HELPER_MISSION = lstr(
  "Petite carte du module : 6 étapes, 1 mini-mission. Avance à ton rythme.",
  "Quick map of the module: 6 steps, 1 mini-mission. Go at your own pace.",
  "Mapa del módulo: 6 pasos, 1 misión. Ve a tu ritmo.",
);
const DECK_HELPER_PHRASES = lstr(
  "Tu n'as pas à tout retenir maintenant — survole et reviens-y.",
  "You don't need to memorize everything now — skim and come back.",
  "No tienes que memorizar todo ahora — léelas y vuelve.",
);
const DECK_HELPER_AIRPORT = lstr(
  "Écoute, vérifie ce que tu as compris, puis prends la parole.",
  "Listen, check what you understood, then take your turn speaking.",
  "Escucha, comprueba lo que entendiste y toma tu turno para hablar.",
);
const DECK_HELPER_HOTEL = lstr(
  "Annonce ta réservation calmement — c'est le moment clé.",
  "Announce your booking calmly — this is the key moment.",
  "Anuncia tu reserva con calma — es el momento clave.",
);
const DECK_HELPER_PROBLEMS = lstr(
  "Une phrase juste avant que le petit souci grossisse.",
  "One useful phrase before the small issue gets bigger.",
  "Una frase útil antes de que el pequeño problema crezca.",
);
const DECK_HELPER_CULTURE = lstr(
  "Comprendre la culture, c'est éviter le quiproquo.",
  "Reading the culture saves you from misreads.",
  "Entender la cultura evita malentendidos.",
);
const DECK_HELPER_GRAMMAR = lstr(
  "Quelques patrons à recycler partout. Pas par cÅ“ur, par usage.",
  "A few patterns to recycle everywhere. Not by heart — by use.",
  "Algunos patrones para reciclar en todas partes.",
);
const DECK_HELPER_FLASHCARDS = lstr(
  "Vocabulaire essentiel : ta boîte à outils.",
  "Essential vocabulary: your toolbox.",
  "Vocabulario esencial: tu caja de herramientas.",
);
const DECK_HELPER_QUIZ = lstr(
  "Cinq questions — pas de note. Pour toi.",
  "Five questions — no score. For you.",
  "Cinco preguntas — sin nota. Para ti.",
);
const DECK_HELPER_MINI_MISSION = lstr(
  "Une vraie scène, étape par étape. Voix haute conseillée.",
  "A real scene, step by step. Reading out loud helps.",
  "Una escena real, paso a paso. Léelo en voz alta.",
);
const DECK_HELPER_COMPLETION = lstr(
  "Imprime tes fiches, sauvegarde ta progression, ouvre la suite.",
  "Print your sheets, save your progress, open what's next.",
  "Imprime tus hojas, guarda tu progreso, abre lo que sigue.",
);

const DECK_MODULE_LABEL = lstr(
  "Module 2 · RD A1",
  "Module 2 · DR A1",
  "Módulo 2 · RD A1",
);

function buildModule2DeckScreens(locale: YoLocale): YoLessonDeckScreen[] {
  return [
    {
      id: "mission",
      kind: "mission",
      eyebrow: t(DECK_LABEL_MISSION, locale),
      title: t(DECK_TITLE_MISSION, locale),
      helperText: t(DECK_HELPER_MISSION, locale),
      companionState: "map",
      content: (
        <div data-yo-module2-deck-screen="mission">
          <HeroSection locale={locale} />
          <MissionMapSection locale={locale} />
        </div>
      ),
    },
    {
      id: "phrases",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_PHRASES, locale),
      title: t(DECK_TITLE_PHRASES, locale),
      helperText: t(DECK_HELPER_PHRASES, locale),
      companionState: "map",
      content: (
        <div data-yo-module2-deck-screen="phrases">
          <CorePhrasesSection locale={locale} />
        </div>
      ),
    },
    {
      id: "airport",
      kind: "dialogue",
      eyebrow: t(DECK_LABEL_AIRPORT, locale),
      title: t(DECK_TITLE_AIRPORT, locale),
      helperText: t(DECK_HELPER_AIRPORT, locale),
      companionState: "confused",
      content: (
        <div data-yo-module2-deck-screen="airport">
          <DialogueSection
            dialogue={dominicanRepublicHotelAirport.airportDialogue}
            locale={locale}
            eyebrowLabel={LABEL_DIALOGUE_AIRPORT_EYEBROW}
            sectionId="airport"
          />
        </div>
      ),
    },
    {
      id: "hotel",
      kind: "dialogue",
      eyebrow: t(DECK_LABEL_HOTEL, locale),
      title: t(DECK_TITLE_HOTEL, locale),
      helperText: t(DECK_HELPER_HOTEL, locale),
      companionState: "confused",
      content: (
        <div data-yo-module2-deck-screen="hotel">
          <DialogueSection
            dialogue={dominicanRepublicHotelAirport.hotelDialogue}
            locale={locale}
            eyebrowLabel={LABEL_DIALOGUE_HOTEL_EYEBROW}
            sectionId="hotel"
          />
        </div>
      ),
    },
    {
      id: "problems",
      kind: "practice",
      eyebrow: t(DECK_LABEL_PROBLEMS, locale),
      title: t(DECK_TITLE_PROBLEMS, locale),
      helperText: t(DECK_HELPER_PROBLEMS, locale),
      companionState: "confused",
      content: (
        <div data-yo-module2-deck-screen="problems">
          <HotelProblemCardsSection locale={locale} />
        </div>
      ),
    },
    {
      id: "culture",
      kind: "culture",
      eyebrow: t(DECK_LABEL_CULTURE, locale),
      title: t(DECK_TITLE_CULTURE, locale),
      helperText: t(DECK_HELPER_CULTURE, locale),
      companionState: "map",
      content: (
        <div data-yo-module2-deck-screen="culture">
          <DominicanNoteSection locale={locale} />
          <AudioPracticeNote locale={locale} />
        </div>
      ),
    },
    {
      id: "grammar",
      kind: "practice",
      eyebrow: t(DECK_LABEL_GRAMMAR, locale),
      title: t(DECK_TITLE_GRAMMAR, locale),
      helperText: t(DECK_HELPER_GRAMMAR, locale),
      companionState: "map",
      content: (
        <div data-yo-module2-deck-screen="grammar">
          <GrammarSection locale={locale} />
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
        <div data-yo-module2-deck-screen="flashcards">
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
        <div data-yo-module2-deck-screen="quiz">
          <PracticeSection locale={locale} />
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
        <div data-yo-module2-deck-screen="mini-mission">
          <MiniMissionSection locale={locale} />
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
        <div data-yo-module2-deck-screen="completion">
          <PrintableWorksheetsSection locale={locale} />
          <CompletionSection locale={locale} />
        </div>
      ),
    },
  ];
}

function Module2DeckRenderer({ locale }: { locale: YoLocale }) {
  const screens = buildModule2DeckScreens(locale);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const backHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref =
    locale === "fr"
      ? "/yo/langues/espagnol/pays/republique-dominicaine/module-2?lang=en"
      : "/yo/langues/espagnol/pays/republique-dominicaine/module-2";
  // Tap-zone navigation is enabled for Module 2 because every
  // per-screen interactive control (audio buttons, quiz
  // `<details>` reveals, flashcard carousel buttons, the
  // mark-completed button, printable links) is either a real
  // HTML control or already marked with the deck's audited
  // gesture-exclude selector, so the tap-zone code path never
  // hijacks them.
  return (
    <YoLessonDeck
      locale={locale}
      moduleLabel={t(DECK_MODULE_LABEL, locale)}
      backHref={backHref}
      toggleHref={toggleHref}
      screens={screens}
      enableTapNavigation
    />
  );
}

// ─── Main export ───────────────────────────────────────────────────────────

export type DominicanRepublicModule2ContentMode = "long-scroll" | "deck";

export interface DominicanRepublicModule2ContentProps {
  locale: YoLocale;
  breadcrumb?: YoBreadcrumbItem[];
  /**
   * Render mode. Defaults to `"long-scroll"` so any consumer that
   * does not opt in keeps the legacy behaviour byte-for-byte.
   * `"deck"` switches to the app-like one-screen-at-a-time flow
   * via `<YoLessonDeck />`.
   */
  mode?: DominicanRepublicModule2ContentMode;
}

export function DominicanRepublicModule2Content({
  locale,
  breadcrumb,
  mode = "long-scroll",
}: DominicanRepublicModule2ContentProps) {
  if (mode === "deck") {
    return <Module2DeckRenderer locale={locale} />;
  }

  return (
    <div className="bg-[linear-gradient(180deg,#FFF8E7_0%,#F7FBF8_34%,#F8EBCB_100%)]">
      <main id="main-content" className="flex flex-col pb-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <YoBreadcrumb items={breadcrumb} locale={locale} />
        ) : null}

        <HeroSection locale={locale} />
        <AudioPracticeNote locale={locale} />
        <DominicanNoteSection locale={locale} />
        <MissionMapSection locale={locale} />
        <CorePhrasesSection locale={locale} />

        <DialogueSection
          dialogue={dominicanRepublicHotelAirport.airportDialogue}
          locale={locale}
          eyebrowLabel={LABEL_DIALOGUE_AIRPORT_EYEBROW}
          sectionId="airport"
        />

        <DialogueSection
          dialogue={dominicanRepublicHotelAirport.hotelDialogue}
          locale={locale}
          eyebrowLabel={LABEL_DIALOGUE_HOTEL_EYEBROW}
          sectionId="hotel"
        />

        <HotelProblemCardsSection locale={locale} />
        <GrammarSection locale={locale} />
        <FlashcardsSection locale={locale} />
        <PracticeSection locale={locale} />
        <MiniMissionSection locale={locale} />
        <PrintableWorksheetsSection locale={locale} />
        <CompletionSection locale={locale} />
      </main>
    </div>
  );
}
