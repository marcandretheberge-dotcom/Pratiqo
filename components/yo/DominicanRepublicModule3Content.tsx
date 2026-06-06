/**
 * DominicanRepublicModule3Content - premium food/culture module renderer.
 *
 * Server component. The only client behavior is delegated to
 * DominicanRepublicModule3Interactive for print and local challenge state.
 */

import {
  BookOpen,
  CheckCircle2,
  Coffee,
  FileText,
  Headphones,
  MapPinned,
  Music,
  Receipt,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  dominicanRepublicFoodCulture,
  type Dom3Dialogue,
} from "@/lib/yo/dominicanRepublicFoodCulture";
import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { YoSpeechButton } from "@/components/yo/YoSpeechButton";
import {
  DominicanRepublicCultureChallenge,
  DominicanRepublicModule3PrintButton,
} from "@/components/yo/DominicanRepublicModule3Interactive";

const SECTION_LABELS = {
  passport: {
    fr: "Passeport culture",
    en: "Culture passport",
    es: "Pasaporte cultural",
  },
  food: {
    fr: "Cartes identite des plats",
    en: "Food identity cards",
    es: "Tarjetas de identidad gastronómica",
  },
  culture: {
    fr: "Culture dominicaine",
    en: "Dominican culture",
    es: "Cultura dominicana",
  },
  phrases: {
    fr: "Banque de phrases",
    en: "Phrase bank",
    es: "Banco de frases",
  },
  dialogues: {
    fr: "Dialogues guides",
    en: "Guided dialogues",
    es: "Diálogos guiados",
  },
  ears: {
    fr: "Oreilles dominicaines",
    en: "Dominican ears",
    es: "Oído dominicano",
  },
  grammar: {
    fr: "Micro-grammaire",
    en: "Micro-grammar",
    es: "Microgramática",
  },
  flashcards: {
    fr: "Flashcards",
    en: "Flashcards",
    es: "Tarjetas",
  },
  quiz: {
    fr: "Quiz pratique",
    en: "Practice quiz",
    es: "Quiz práctico",
  },
  printables: {
    fr: "Fiches imprimables",
    en: "Printable practice sheets",
    es: "Hojas imprimibles",
  },
};

const LABELS = {
  module: { fr: "Module 3", en: "Module 3", es: "Módulo 3" },
  a1: { fr: "A1 voyage", en: "A1 travel", es: "Viaje A1" },
  orderPhrase: {
    fr: "Phrase pour commander",
    en: "Phrase to order it",
    es: "Frase para pedirlo",
  },
  culturalNote: {
    fr: "Note culturelle",
    en: "Cultural note",
    es: "Nota cultural",
  },
  situation: { fr: "Situation", en: "Situation", es: "Situación" },
  translation: { fr: "Traduction", en: "Translation", es: "Traducción" },
  scene: { fr: "La scene", en: "The scene", es: "La escena" },
  chunks: { fr: "Pourquoi ca marche", en: "Why it works", es: "Por qué funciona" },
  examples: { fr: "Exemples", en: "Examples", es: "Ejemplos" },
  practice: { fr: "A toi", en: "Your turn", es: "Tu turno" },
  answer: { fr: "Voir la reponse", en: "See answer", es: "Ver respuesta" },
  printHint: {
    fr: "Ces fiches sont pensees pour l'impression: phrases courtes, roleplay et checklist.",
    en: "These sheets are designed for print: short phrases, roleplay, and checklists.",
    es: "Estas hojas están pensadas para imprimir: frases cortas, roleplay y listas.",
  },
  noAudioPlayback: {
    fr: "Audio de pratique intégré au navigateur. La voix peut varier selon l'appareil.",
    en: "Practice audio uses your browser voice. Voice quality may vary by device.",
    es: "El audio de práctica usa la voz del navegador. La calidad puede variar según el dispositivo.",
  },
  browserAudio: {
    fr: "Audio de pratique",
    en: "Practice audio",
    es: "Audio de práctica",
  },
  teacherBridge: {
    fr: "Apres le module, apporte ces phrases a ton professeur Pratiqo pour les pratiquer a voix haute.",
    en: "After the module, bring these phrases to your Pratiqo teacher to practice out loud.",
    es: "Después del módulo, lleva estas frases a tu profesor de Pratiqo para practicarlas en voz alta.",
  },
  teacherCta: {
    fr: "Trouver un professeur",
    en: "Find a teacher",
    es: "Encontrar un profesor",
  },
  module2: {
    fr: "Retour au module 2",
    en: "Back to module 2",
    es: "Volver al módulo 2",
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
}: {
  icon: ReactNode;
  labelText: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mb-5">
      <p className="flex items-center gap-2 text-[0.74rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
        {icon}
        {labelText}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl">
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

function HeroSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section
      aria-labelledby="yo-do-m3-hero-title"
      className="relative overflow-hidden bg-[#F8EBCB]"
      data-yo-module3-premium-hero
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
              {label(locale, LABELS.module)} · {label(locale, LABELS.a1)}
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
            id="yo-do-m3-hero-title"
            className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0B3040] sm:text-4xl lg:text-5xl"
          >
            {t(data.heroTitle, locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#0B3040]/74 sm:text-lg">
            {t(data.heroSubtitle, locale)}
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {[
              "¿Qué me recomienda?",
              "Quiero probar algo típico.",
              "¿Me trae la cuenta?",
              "Más despacio, por favor.",
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
          data-yo-module3-passport-visual
        >
          <div
            aria-hidden
            className="absolute -right-5 top-8 rotate-12 rounded-full border-2 border-dashed border-[#F26B5E]/55 px-5 py-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#F26B5E]/80"
          >
            RD stamp
          </div>
          <div className="rounded-[1.5rem] border border-[#F4B400]/35 bg-[#FFF4D6] p-5 text-[#0F6E56]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                  Culture passport visual
                </p>
                <p className="mt-1 text-2xl font-black">RD A1</p>
              </div>
              <div className="grid size-16 place-items-center rounded-full bg-[#0F6E56] text-[#F4B400]">
                <Utensils className="size-8" aria-hidden />
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

function PassportSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module3-culture-passport
    >
      <SectionHeader
        icon={<MapPinned className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.passport)}
        title={
          locale === "en"
            ? "6 stops before you order like a confident traveler"
            : locale === "es"
              ? "6 paradas antes de pedir con confianza"
              : "6 etapes avant de commander avec confiance"
        }
      />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.missionStops.map((stop) => (
          <li
            key={stop.id}
            className="relative overflow-hidden rounded-3xl border border-[#F4B400]/25 bg-white/85 p-4 shadow-[0_12px_32px_rgba(15,58,52,0.07)]"
          >
            <span
              aria-hidden
              className="absolute right-4 top-4 rounded-full border border-dashed border-[#F26B5E]/45 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#F26B5E]/70"
            >
              stamp
            </span>
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0B3040] text-sm font-black text-[#F4B400]">
                {stop.position}
              </span>
              <p className="text-sm font-black text-[#0F6E56]">
                <L value={stop.title} locale={locale} />
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/65">
              <L value={stop.description} locale={locale} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FoodCardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <SectionHeader
        icon={<Utensils className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.food)}
        title={
          locale === "en"
            ? "Dishes that carry the culture"
            : locale === "es"
              ? "Platos que llevan cultura"
              : "Des plats qui portent la culture"
        }
        body={
          locale === "en"
            ? "Each card gives you the name, the cultural cue, and a phrase you can actually say."
            : locale === "es"
              ? "Cada tarjeta te da el nombre, una clave cultural y una frase que puedes usar."
              : "Chaque carte te donne le nom, le repere culturel et une phrase utilisable."
        }
      />
      <div
        className="grid gap-4 md:grid-cols-2"
        data-yo-module3-food-cards-count={
          dominicanRepublicFoodCulture.foodCards.length
        }
      >
        {data.foodCards.map((food) => (
          <article
            key={food.id}
            className="overflow-hidden rounded-3xl border border-[#F4B400]/40 bg-[#FFF4D6] shadow-[0_18px_42px_rgba(15,58,52,0.09)]"
            data-yo-module3-menu-card
          >
            <div className="flex items-center justify-between border-b border-[#F4B400]/25 bg-white/58 px-5 py-3">
              <span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8a5a17]">
                menu card
              </span>
              <span className="rounded-full border border-dashed border-[#F26B5E]/45 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#F26B5E]/75">
                sabor RD
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-black text-[#0F6E56]" lang="es">
                {food.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78">
                {t(food.explanation, locale)}
              </p>
              <div className="mt-4 rounded-2xl bg-white/70 p-3">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8a5a17]">
                  {label(locale, LABELS.culturalNote)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5a3f0f]">
                  {t(food.culturalNote, locale)}
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-[#0B3040]/10 bg-[#0B3040] p-3 text-white shadow-inner">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#F4B400]/85">
                  {label(locale, LABELS.orderPhrase)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <p className="text-base font-black" lang="es">
                    {food.orderPhrase}
                  </p>
                  <YoSpeechButton text={food.orderPhrase} locale={locale} compact />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CultureCardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <SectionHeader
        icon={<Music className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.culture)}
        title={
          locale === "en"
            ? "What makes the Dominican Republic feel alive"
            : locale === "es"
              ? "Lo que hace viva a la República Dominicana"
              : "Ce qui rend la Republique dominicaine vivante"
        }
      />
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        data-yo-module3-culture-cards-count={
          dominicanRepublicFoodCulture.cultureCards.length
        }
      >
        {data.cultureCards.map((card) => (
          <article
            key={card.id}
            className="relative overflow-hidden rounded-3xl border border-[#0F6E56]/10 bg-white/88 p-4 shadow-[0_12px_28px_rgba(15,58,52,0.06)]"
            data-yo-module3-culture-stamp-card
          >
            <span
              aria-hidden
              className="absolute right-3 top-3 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]"
            >
              stamp
            </span>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#1D9E75]">
              {t(card.category, locale)}
            </p>
            <h3 className="mt-1 text-base font-black text-[#0F6E56]" lang="es">
              {card.name}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/68">
              {t(card.description, locale)}
            </p>
            <div className="mt-3 rounded-xl border border-[#1D9E75]/10 bg-[#DDF4F1]/70 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-[#0F6E56]" lang="es">
                  {card.phrase}
                </p>
                <YoSpeechButton text={card.phrase} locale={locale} compact />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhraseBankSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <SectionHeader
        icon={<BookOpen className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.phrases)}
        title={
          locale === "en"
            ? "35 phrases for menus, drinks, payment, and repair"
            : locale === "es"
              ? "35 frases para menú, bebidas, pago y reparación"
              : "35 phrases pour menu, boissons, paiement et rattrapage"
        }
      />
      <div
        className="grid gap-3 md:grid-cols-2"
        data-yo-module3-phrase-count={data.phraseBank.length}
      >
        {data.phraseBank.map((phrase) => (
          <article
            key={phrase.id}
            className="rounded-2xl border border-teal-100 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                {t(phrase.situation, locale)}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <p className="text-lg font-black text-[#0F6E56]" lang="es">
                {phrase.target}
              </p>
              <YoSpeechButton text={phrase.target} locale={locale} compact />
            </div>
            <p className="mt-1 text-sm text-[#0F6E56]/70">
              {t(phrase.translation, locale)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DialogueSection({
  dialogue,
  locale,
}: {
  dialogue: Dom3Dialogue;
  locale: YoLocale;
}) {
  return (
    <article className="rounded-3xl border border-teal-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0F6E56]">
            {t(dialogue.title, locale)}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/68">
            {t(dialogue.setting, locale)}
          </p>
        </div>
        <span className="rounded-full bg-[#DDF4F1] px-3 py-1 text-xs font-bold text-[#0F6E56]">
          {label(locale, LABELS.scene)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {dialogue.lines.map((line, index) => (
          <div
            key={`${dialogue.id}-${index}`}
            className={[
              "flex",
              line.isLearner ? "justify-end" : "justify-start",
            ].join(" ")}
          >
            <div
              className={[
                "max-w-[90%] rounded-2xl p-3 sm:max-w-[78%]",
                line.isLearner
                  ? "bg-[#0F6E56] text-white"
                  : "bg-[#FFF4D6] text-[#0F6E56]",
              ].join(" ")}
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] opacity-70">
                {t(line.speaker, locale)}
              </p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <p className="text-base font-black" lang="es">
                  {line.target}
                </p>
                <YoSpeechButton text={line.target} locale={locale} compact />
              </div>
              <p className="mt-1 text-xs leading-relaxed opacity-75">
                {t(line.translation, locale)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {dialogue.chunks.map((chunk) => (
          <div key={chunk.id} className="rounded-2xl bg-[#F4FBF9] p-3">
            <p className="text-xs font-black text-[#0F6E56]">
              {t(chunk.title, locale)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/70">
              {t(chunk.explanation, locale)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function DialoguesSection({ locale }: { locale: YoLocale }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <SectionHeader
        icon={<Receipt className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.dialogues)}
        title={
          locale === "en"
            ? "Three real-world scenes: comedor, kiosk, payment"
            : locale === "es"
              ? "Tres escenas reales: comedor, kiosco y pago"
              : "Trois scenes utiles: comedor, kiosque et paiement"
        }
      />
      <div className="grid gap-5">
        {dominicanRepublicFoodCulture.dialogues.map((dialogue) => (
          <DialogueSection key={dialogue.id} dialogue={dialogue} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function EarsAndGrammarSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeader
          icon={<Headphones className="size-4 text-[#1D9E75]" aria-hidden />}
          labelText={label(locale, SECTION_LABELS.ears)}
          title={
            locale === "en"
              ? "When Dominican Spanish sounds fast"
              : locale === "es"
                ? "Cuando el español dominicano suena rápido"
                : "Quand l'espagnol dominicain sonne vite"
          }
        />
        <div className="space-y-3" data-yo-module3-ears-section>
          {data.earCards.map((card) => (
            <article key={card.id} className="rounded-2xl border border-teal-100 bg-white p-4">
              <h3 className="text-sm font-black text-[#0F6E56]">
                {t(card.title, locale)}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/68">
                {t(card.description, locale)}
              </p>
              <div className="mt-2 rounded-xl bg-[#DDF4F1]/70 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#0F6E56]" lang="es">
                    {card.practicePhrase}
                  </p>
                  <YoSpeechButton text={card.practicePhrase} locale={locale} compact />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          icon={<Sparkles className="size-4 text-[#1D9E75]" aria-hidden />}
          labelText={label(locale, SECTION_LABELS.grammar)}
          title={
            locale === "en"
              ? "9 tiny patterns that unlock the meal"
              : locale === "es"
                ? "9 patrones pequeños para la comida"
                : "9 petites formules pour debloquer le repas"
          }
        />
        <div className="grid gap-3" data-yo-module3-grammar-count={data.grammarCards.length}>
          {data.grammarCards.map((card) => (
            <article key={card.id} className="rounded-2xl border border-teal-100 bg-white p-4">
              <h3 className="text-base font-black text-[#0F6E56]" lang="es">
                {card.pattern}
              </h3>
              <p className="mt-1 text-sm text-[#0F6E56]/70">
                {t(card.meaning, locale)}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {card.examples.map((example) => (
                  <div key={example.target} className="rounded-xl bg-[#F4FBF9] p-3">
                    <p className="text-sm font-black text-[#0F6E56]" lang="es">
                      {example.target}
                    </p>
                    <p className="mt-1 text-xs text-[#0F6E56]/65">
                      {t(example.translation, locale)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-[#8a5a17]">
                {label(locale, LABELS.practice)}: {t(card.prompt, locale)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlashcardsSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <SectionHeader
        icon={<Coffee className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.flashcards)}
        title={
          locale === "en"
            ? "32 quick cards for food, drinks, payment, places, and music"
            : locale === "es"
              ? "32 tarjetas para comida, bebidas, pago, lugares y música"
              : "32 cartes rapides: plats, boissons, paiement, lieux et musique"
        }
      />
      <ul
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-yo-module3-flashcard-count={data.flashcards.length}
      >
        {data.flashcards.map((card) => (
          <li key={card.id}>
            <details className="group rounded-2xl border border-teal-100 bg-white shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              <summary className="cursor-pointer list-none rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2">
                <span className="mb-2 inline-flex rounded-full bg-[#DDF4F1]/70 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#0F6E56]">
                  {t(card.category, locale)}
                </span>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-lg font-black text-[#0F6E56]" lang="es">
                    {card.front}
                  </p>
                  <YoSpeechButton text={card.front} locale={locale} compact />
                </div>
                <p className="mt-2 text-xs font-bold text-[#1D9E75]">
                  {label(locale, LABELS.answer)} →
                </p>
              </summary>
              <div className="border-t border-teal-100 px-4 pb-4 pt-3">
                <p className="text-sm font-semibold text-[#0F6E56]/85">
                  {t(card.back, locale)}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuizSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      data-yo-module3-quiz-shell
    >
      <SectionHeader
        icon={<CheckCircle2 className="size-4 text-[#1D9E75]" aria-hidden />}
        labelText={label(locale, SECTION_LABELS.quiz)}
        title={
          locale === "en"
            ? "12 questions to check your travel reflexes"
            : locale === "es"
              ? "12 preguntas para verificar tus reflejos de viaje"
              : "12 questions pour verifier tes reflexes de voyage"
        }
      />
      <ol className="grid gap-4" data-yo-module3-quiz-count={data.quizQuestions.length}>
        {data.quizQuestions.map((q, index) => {
          const correct = q.options.find((option) => option.id === q.correctOptionId);
          return (
            <li
              key={q.id}
              className="rounded-3xl border border-[#F4B400]/25 bg-white/88 p-4 shadow-[0_12px_32px_rgba(15,58,52,0.06)] sm:p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                {index + 1}. {t(q.type, locale)}
              </p>
              <p className="mt-2 text-base font-black text-[#0F6E56]">
                {t(q.prompt, locale)}
              </p>
              <div
                className="mt-3 grid gap-2"
                data-yo-module3-quiz-options-no-pretranslation
              >
                {q.options.map((option) => (
                  <div
                    key={option.id}
                    className="rounded-2xl border border-[#0F6E56]/10 bg-[#F7FBF8] p-3"
                  >
                    <p
                      className="text-sm font-black text-[#0F6E56]"
                      lang="es"
                      data-yo-module3-quiz-choice-label
                    >
                      {option.target}
                    </p>
                  </div>
                ))}
              </div>
              {correct ? (
                <details
                  className="mt-3 rounded-2xl border border-[#F4B400]/35 bg-[#FFF4D6] p-3"
                  data-yo-module3-quiz-reveal-translations
                >
                  <summary className="cursor-pointer text-sm font-black text-[#8a5a17]">
                    {label(locale, LABELS.answer)}
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-base font-black text-[#0F6E56]" lang="es">
                      {correct.target}
                    </p>
                    <YoSpeechButton text={correct.target} locale={locale} compact />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#5a3f0f]">
                    {t(correct.translation, locale)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5a3f0f]/82">
                    {t(q.explanation, locale)}
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

function PrintablesSection({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicFoodCulture;
  return (
    <section
      id="yo-do-m3-printables"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          icon={<FileText className="size-4 text-[#1D9E75]" aria-hidden />}
          labelText={label(locale, SECTION_LABELS.printables)}
          title={
            locale === "en"
              ? "Print the practice sheets"
              : locale === "es"
                ? "Imprime las hojas de práctica"
                : "Imprime les fiches de pratique"
          }
          body={label(locale, LABELS.printHint)}
        />
        <DominicanRepublicModule3PrintButton
          label={data.printButtonLabel}
          locale={locale}
        />
      </div>
      <div
        className="grid gap-4 md:grid-cols-2 print:grid-cols-1"
        data-yo-module3-printable-count={data.printableSheets.length}
      >
        {data.printableSheets.map((sheet) => (
          <article
            key={sheet.id}
            className="rounded-3xl border border-[#0F6E56]/12 bg-white p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)] print:break-inside-avoid"
            data-yo-module3-printable-worksheet
          >
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-[#0F6E56]/20 pb-3">
              <h3 className="text-lg font-black text-[#0F6E56]">
                {t(sheet.title, locale)}
              </h3>
              <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                worksheet
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {sheet.keyPhrases.map((phrase) => (
                <li key={phrase} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                  <span className="font-black text-[#0F6E56]" lang="es">
                    {phrase}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-[#F4FBF9] p-3 text-sm leading-relaxed text-[#0F6E56]/75">
              <p>{t(sheet.miniExercise, locale)}</p>
              <p className="mt-2 font-semibold">{t(sheet.roleplayOrChecklist, locale)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

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

function ClosingBridge({ locale }: { locale: YoLocale }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-7">
        <div
          aria-hidden
          className="absolute right-5 top-5 rounded-full border border-dashed border-[#F26B5E]/45 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#F26B5E]/75"
        >
          next stamp
        </div>
        <p className="text-sm font-semibold leading-relaxed text-[#5a3f0f]">
          {label(locale, LABELS.teacherBridge)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/trouver-un-prof?q=espagnol"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.teacherCta)}
          </a>
          <a
            href="/yo/langues/espagnol/pays/republique-dominicaine/module-2"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-2.5 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
          >
            {label(locale, LABELS.module2)}
          </a>
        </div>
      </div>
    </section>
  );
}

export interface DominicanRepublicModule3ContentProps {
  locale: YoLocale;
  breadcrumb?: YoBreadcrumbItem[];
}

export function DominicanRepublicModule3Content({
  locale,
  breadcrumb,
}: DominicanRepublicModule3ContentProps) {
  const data = dominicanRepublicFoodCulture;

  return (
    <div className="bg-[linear-gradient(180deg,#FFF8E7_0%,#F7FBF8_34%,#F8EBCB_100%)]">
      <main id="main-content" className="flex flex-col pb-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <YoBreadcrumb items={breadcrumb} locale={locale} />
        ) : null}

        <HeroSection locale={locale} />
        <AudioNoticeSection locale={locale} />
        <PassportSection locale={locale} />
        <FoodCardsSection locale={locale} />
        <CultureCardsSection locale={locale} />
        <PhraseBankSection locale={locale} />
        <DialoguesSection locale={locale} />
        <EarsAndGrammarSection locale={locale} />
        <FlashcardsSection locale={locale} />
        <QuizSection locale={locale} />
        <DominicanRepublicCultureChallenge
          title={data.finalGame.title}
          subtitle={data.finalGame.subtitle}
          successMessage={data.finalGame.successMessage}
          rounds={data.finalGame.rounds}
          locale={locale}
        />
        <PrintablesSection locale={locale} />
        <ClosingBridge locale={locale} />
      </main>
    </div>
  );
}
