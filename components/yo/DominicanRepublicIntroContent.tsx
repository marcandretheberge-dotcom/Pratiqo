import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Music2,
  Utensils,
} from "lucide-react";

import {
  dominicanRepublicA1,
  dominicanRepublicA1ListeningDemo,
} from "@/lib/yo/dominicanRepublicA1";
import { lstr, t } from "@/lib/yo/localize";
import type {
  YoBulletGroup,
  YoDialogueScenarioData,
  YoDominicanExpression,
  YoFlashcard,
  YoIntroDetailedSection,
  YoLocale,
  YoLocalizedString,
  YoTimelineEntry,
  YoVocabularyItem,
  YoVisualHint,
} from "@/lib/yo/types";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { YoImageVisual } from "@/components/yo/YoImageVisual";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoAudioFeedbackProvider } from "@/components/yo/YoAudioFeedbackProvider";
import { YoListeningExercisePreview } from "@/components/yo/YoListeningExercisePreview";
import { YoYoppoReward } from "@/components/yo/YoYoppoReward";
import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";

const DECK_MODULE_LABEL = lstr("Intro · RD A1", "Intro · DR A1", "Intro · RD A1");
const WELCOME_TAGLINE = lstr(
  "Intro · République dominicaine · A1",
  "Intro · Dominican Republic · A1",
  "Intro · República Dominicana · A1",
);

const READY_NEXT_HEADLINE = lstr(
  "Module 2 - Hôtel et aéroport",
  "Module 2 - Hotel & airport",
  "Módulo 2 - Hotel y aeropuerto",
);
const READY_NEXT_BLURB = lstr(
  "Tu enchaînes avec les phrases concrètes pour passer la douane, prendre un taxi et faire ton check-in.",
  "Next up: the real phrases for clearing customs, grabbing a taxi, and checking into your hotel.",
  "Sigue con las frases reales para pasar la aduana, tomar un taxi y hacer tu check-in.",
);
const READY_NEXT_CTA = lstr("Ouvrir le Module 2", "Open Module 2", "Abrir el Módulo 2");
const READY_BACK_TO_COURSE_HOME = lstr(
  "Retour à l'accueil du parcours",
  "Back to course home",
  "Volver al inicio del curso",
);

const AUDIO_CONTEXT = {
  moduleId: "voyage",
  lessonId: "republique-dominicaine-a1-lesson-01",
  accentProfile: "dominican_republic" as const,
  speechLang: "es-DO",
};

const CULTURE_POINTS: Array<{
  title: YoLocalizedString;
  body: YoLocalizedString;
}> = [
  {
    title: lstr("Merengue et bachata", "Merengue and bachata"),
    body: lstr(
      "La musique fait partie des fêtes, de la rue, des familles et de la mémoire du pays.",
      "Music is part of celebrations, streets, families, and the country's memory.",
    ),
  },
  {
    title: lstr("Baseball partout", "Baseball everywhere"),
    body: lstr(
      "Le baseball est un langage social: on en parle au colmado, à la maison et avec fierté.",
      "Baseball is a social language: people talk about it at the colmado, at home, and with pride.",
    ),
  },
  {
    title: lstr("Colmados et guaguas", "Colmados and guaguas"),
    body: lstr(
      "Les petits commerces et transports partagés montrent la vie quotidienne au-delà des zones touristiques.",
      "Small shops and shared transport show everyday life beyond tourist zones.",
    ),
  },
  {
    title: lstr("Famille et hospitalité", "Family and hospitality"),
    body: lstr(
      "Les repas, les réunions et l'accueil chaleureux donnent du sens aux mots que tu apprends.",
      "Meals, gatherings, and warm hospitality give meaning to the words you learn.",
    ),
  },
];

const INTRO_COMPANION_AUDIT = [
  { id: "scene", companionState: "map" },
  { id: "mission", companionState: "map" },
  { id: "country", companionState: "map" },
  { id: "history", companionState: "map" },
  { id: "food", companionState: "map" },
  { id: "phrases", companionState: "confused" },
  { id: "practice", companionState: "confused" },
  { id: "review", companionState: "map" },
  { id: "flashcards", companionState: "map" },
  { id: "ready", companionState: "celebrating" },
] as const satisfies ReadonlyArray<{
  id: string;
  companionState: YoLessonDeckScreen["companionState"];
}>;

function companionStateFor(id: (typeof INTRO_COMPANION_AUDIT)[number]["id"]) {
  return INTRO_COMPANION_AUDIT.find((screen) => screen.id === id)?.companionState ?? "map";
}

function buildIntroDeckScreens(locale: YoLocale): YoLessonDeckScreen[] {
  const data = dominicanRepublicA1;
  const geography = getSection("intro_card_geography");
  const history = getSection("intro_card_history");
  const food = getSection("intro_card_food");
  const phrases = getSection("intro_card_first_phrases");
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const module2Href = `/yo/langues/espagnol/pays/republique-dominicaine/module-2${langSuffix}`;
  const courseHomeHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;

  const screens: YoLessonDeckScreen[] = [
    screen("scene", "mission", t(lstr("Scène", "Scene", "Escena"), locale), t(lstr("Bienvenue dans le voyage", "Welcome to the journey", "Bienvenido al viaje"), locale), companionStateFor("scene"), (
      <HeroPage
        locale={locale}
        tagline={WELCOME_TAGLINE}
        title={data.module.heroTitle}
        subtitle={data.module.heroSubtitle}
      />
    )),
    screen("mission", "mission", t(lstr("Mission", "Mission", "Misión"), locale), t(lstr("Ce que tu vas valider", "What you will validate", "Lo que vas a validar"), locale), companionStateFor("mission"), (
      <MissionOverviewPage
        locale={locale}
        questions={[
          lstr("Qu'est-ce qui rend la RD différente d'un simple resort ?", "What makes the DR more than just a resort?"),
          lstr("Pourquoi Santo Domingo compte dans l'histoire des Amériques ?", "Why does Santo Domingo matter in the Americas?"),
          lstr("Que faut-il comprendre pour parler avec respect ?", "What should you understand to speak with respect?"),
        ]}
        outcomes={[
          lstr("situer la République dominicaine", "locate the Dominican Republic"),
          lstr("reconnaître quelques éléments culturels", "recognize key cultural elements"),
          lstr("saluer et me présenter simplement", "greet and introduce myself simply"),
          lstr("expliquer à mon professeur quoi pratiquer", "tell my teacher what I want to practice"),
        ]}
      />
    )),
    screen("country", "culture", t(lstr("Explorer", "Explore", "Explorar"), locale), t(lstr("Panorama du pays", "Country panorama", "Panorama del país"), locale), companionStateFor("country"), (
      <RichSectionPage
        locale={locale}
        section={geography}
        imageFit="contain"
        bullets={geography.bullets}
        phraseIntro={geography.practicalPhrasesIntro}
        phrases={geography.practicalPhrases}
      />
    )),
    screen("history", "culture", t(lstr("Explorer", "Explore", "Explorar"), locale), t(lstr("Panorama historique", "Historical panorama", "Panorama histórico"), locale), companionStateFor("history"), (
      <HistoryPage
        locale={locale}
        section={history}
        culturePoints={CULTURE_POINTS}
      />
    )),
    screen("food", "culture", t(lstr("Explorer", "Explore", "Explorar"), locale), t(lstr("Gastronomie dominicaine", "Dominican food", "Gastronomía dominicana"), locale), companionStateFor("food"), (
      <RichSectionPage
        locale={locale}
        section={food}
        groups={food.bulletGroups}
        phraseIntro={food.practicalPhrasesIntro}
        phrases={food.practicalPhrases}
        icon="food"
      />
    )),
    screen("phrases", "phrase", t(lstr("Écoute", "Listen", "Escucha"), locale), t(lstr("Premières phrases utiles", "First useful phrases", "Primeras frases útiles"), locale), companionStateFor("phrases"), (
      <PhrasesPracticePage
        locale={locale}
        section={phrases}
      />
    )),
    screen("practice", "quiz", t(lstr("À toi", "Your turn", "Tu turno"), locale), t(lstr("Vérifie ton intro", "Check your intro", "Verifica tu intro"), locale), companionStateFor("practice"), (
      <YoQuizPreview questions={data.quizQuestions} locale={locale} enableAudioFeedback compactDeck />
    )),
    screen("review", "practice", t(lstr("Révision", "Review", "Repaso"), locale), t(lstr("Expressions dominicaines", "Dominican expressions", "Expresiones dominicanas"), locale), companionStateFor("review"), (
      <ReviewPage
        locale={locale}
        expressions={data.dominicanDictionary}
      />
    )),
    screen("flashcards", "practice", t(lstr("Révision", "Review", "Repaso"), locale), t(lstr("Flashcards essentielles", "Essential flashcards", "Flashcards esenciales"), locale), companionStateFor("flashcards"), (
      <FlashcardsStepPage
        locale={locale}
        cards={data.flashcardDeck}
      />
    )),
    screen("ready", "completion", t(lstr("Récompense", "Reward", "Recompensa"), locale), t(lstr("Direction le Module 2", "On to Module 2", "Rumbo al Módulo 2"), locale), companionStateFor("ready"), (
      <ReadyPage
        locale={locale}
        module2Href={module2Href}
        courseHomeHref={courseHomeHref}
      />
    )),
  ];

  return screens;

  function getSection(id: string): YoIntroDetailedSection {
    const section = data.detailedSections.find((item) => item.id === id);
    if (!section) throw new Error(`Missing Dominican intro section: ${id}`);
    return section;
  }
}

function screen(
  id: string,
  kind: YoLessonDeckScreen["kind"],
  eyebrow: string,
  title: string,
  companionState: YoLessonDeckScreen["companionState"],
  content: React.ReactNode,
  hint?: string,
): YoLessonDeckScreen {
  const safeHint = hint?.trim();
  return {
    id,
    kind,
    eyebrow,
    title,
    helperText: safeHint ? safeHint : undefined,
    companionState,
    content,
  };
}

function HeroPage({
  locale,
  tagline,
  title,
  subtitle,
}: {
  locale: YoLocale;
  tagline: YoLocalizedString;
  title: YoLocalizedString;
  subtitle: YoLocalizedString;
}) {
  return (
    <LessonStack>
      <div className="overflow-hidden rounded-[24px] border border-[var(--pq-line)] bg-[var(--pq-surface)] shadow-[0_18px_45px_rgba(23,38,66,0.08)]">
        <YoImageVisual
          imagePath={dominicanRepublicA1.module.heroImagePath}
          alt={dominicanRepublicA1.module.heroImageAlt ?? title}
          locale={locale}
          fallbackKind="hero-tropical"
          variant="panel"
          className="h-[clamp(220px,42vh,360px)] !min-h-0 rounded-none shadow-none"
        />
      </div>
      <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--pq-line)] bg-[var(--pq-surface)] px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--pq-primary)]">
        <MapPin className="size-3.5" aria-hidden />
        {t(tagline, locale)}
      </p>
      <p
        className="text-[clamp(1.32rem,4.6vw,2rem)] font-semibold leading-[1.08] text-[var(--pq-ink)]"
        style={{ fontFamily: "var(--yo-app-display), Newsreader, Georgia, serif" }}
      >
        {t(title, locale)}
      </p>
      <p className="max-w-[64ch] text-[clamp(0.98rem,2.3vw,1.08rem)] leading-7 text-[var(--pq-ink-soft)]">
        {t(subtitle, locale)}
      </p>
    </LessonStack>
  );
}

function MissionOverviewPage({
  locale,
  questions,
  outcomes,
}: {
  locale: YoLocale;
  questions: YoLocalizedString[];
  outcomes: YoLocalizedString[];
}) {
  return (
    <LessonStack>
      <StatsPanel locale={locale} />
      <CardBlock
        label={lstr("Questions essentielles", "Essential questions", "Preguntas esenciales")}
        locale={locale}
      >
        <Checklist locale={locale} items={questions} />
      </CardBlock>
      <CardBlock
        label={lstr("À la fin de l'intro", "By the end of the intro", "Al final de la intro")}
        locale={locale}
        tint
      >
        <Checklist locale={locale} items={outcomes} />
      </CardBlock>
    </LessonStack>
  );
}

function RichSectionPage({
  locale,
  section,
  imageFit = "cover",
  bullets,
  groups,
  phraseIntro,
  phrases,
  icon = "phrase",
}: {
  locale: YoLocale;
  section: YoIntroDetailedSection;
  imageFit?: "cover" | "contain";
  bullets?: NonNullable<YoIntroDetailedSection["bullets"]>;
  groups?: YoBulletGroup[];
  phraseIntro?: YoLocalizedString;
  phrases?: YoVocabularyItem[];
  icon?: "food" | "phrase";
}) {
  return (
    <LessonStack>
      <ImageCard
        locale={locale}
        imagePath={section.imagePath}
        imageAlt={section.imageAlt ?? section.title}
        visualHint={section.visualHint}
        imageFit={imageFit}
      />
      <CardBlock label={section.title} locale={locale}>
        {section.intro ? <Paragraph>{t(section.intro, locale)}</Paragraph> : null}
        {section.highlightTitle ? (
          <Notice title={section.highlightTitle} body={section.highlightBody} locale={locale} />
        ) : null}
      </CardBlock>
      {bullets?.length ? <BulletList locale={locale} bullets={bullets} /> : null}
      {groups?.length ? <GroupsPage locale={locale} groups={groups} icon={icon} /> : null}
      {phrases?.length ? <PhraseList locale={locale} intro={phraseIntro} phrases={phrases} /> : null}
    </LessonStack>
  );
}

function HistoryPage({
  locale,
  section,
  culturePoints,
}: {
  locale: YoLocale;
  section: YoIntroDetailedSection;
  culturePoints: typeof CULTURE_POINTS;
}) {
  return (
    <LessonStack>
      <ImageCard
        locale={locale}
        imagePath={section.imagePath}
        imageAlt={section.imageAlt ?? section.title}
        visualHint={section.visualHint}
      />
      <CardBlock label={section.title} locale={locale}>
        {section.intro ? <Paragraph>{t(section.intro, locale)}</Paragraph> : null}
        {section.highlightTitle ? (
          <Notice title={section.highlightTitle} body={section.highlightBody} locale={locale} />
        ) : null}
      </CardBlock>
      {section.timeline?.length ? (
        <TimelinePage locale={locale} entries={section.timeline} note={section.learningNote} />
      ) : null}
      <CulturePointPage locale={locale} points={culturePoints} />
    </LessonStack>
  );
}

function PhrasesPracticePage({
  locale,
  section,
}: {
  locale: YoLocale;
  section: YoIntroDetailedSection;
}) {
  return (
    <LessonStack>
      <PhraseFocusPage
        locale={locale}
        label={lstr("Première mission", "First mission")}
        phrase="Buenas tardes. Me llamo Marc. Quiero practicar la conversación."
        translation={lstr(
          "Tu salues, tu te présentes et tu dis quoi pratiquer.",
          "You greet, introduce yourself, and say what you want to practice.",
        )}
      />
      <RichSectionPage
        locale={locale}
        section={section}
        groups={section.bulletGroups}
        icon="phrase"
      />
      {section.dialogue ? <DialoguePage locale={locale} dialogue={section.dialogue} /> : null}
      <CardBlock label={lstr("Exercice d'écoute", "Listening practice", "Práctica de escucha")} locale={locale}>
        <YoListeningExercisePreview data={dominicanRepublicA1ListeningDemo} locale={locale} />
      </CardBlock>
    </LessonStack>
  );
}

function ReviewPage({
  locale,
  expressions,
}: {
  locale: YoLocale;
  expressions: YoDominicanExpression[];
}) {
  return (
    <LessonStack>
      <DictionaryPage locale={locale} items={expressions} />
    </LessonStack>
  );
}

function FlashcardsStepPage({
  locale,
  cards,
}: {
  locale: YoLocale;
  cards: YoFlashcard[];
}) {
  return (
    <section className="pb-2">
      <YoFlashcardPreview
        cards={cards}
        locale={locale}
        speechLang="es-DO"
        enableAudioFeedback
        compactDeck
        mode="graded"
        showHeader={false}
        audioContext={AUDIO_CONTEXT}
      />
    </section>
  );
}

function StatsPanel({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA1;
  return (
    <CardBlock label={data.introProgress.title} locale={locale}>
      <Paragraph>{t(data.introProgress.description, locale)}</Paragraph>
      <ul role="list" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.introProgress.stats.map((stat) => (
          <li key={stat.id} className="rounded-[18px] border border-[var(--pq-line)] bg-[var(--pq-surface2)] px-3 py-3">
            <span className="block text-[clamp(1.35rem,4vw,1.75rem)] font-bold text-[var(--pq-ink)]">
              {stat.value}
            </span>
            <span className="block text-xs leading-snug text-[var(--pq-ink-soft)]">{t(stat.label, locale)}</span>
          </li>
        ))}
      </ul>
    </CardBlock>
  );
}

function ImageCard({
  locale,
  imagePath,
  imageAlt,
  visualHint,
  imageFit = "cover",
}: {
  locale: YoLocale;
  imagePath?: string | null;
  imageAlt: YoLocalizedString;
  visualHint?: YoVisualHint;
  imageFit?: "cover" | "contain";
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--pq-line)] bg-[var(--pq-surface)] shadow-[0_14px_34px_rgba(23,38,66,0.07)]">
      <YoImageVisual
        imagePath={imagePath}
        alt={imageAlt}
        locale={locale}
        fallbackKind={visualHint}
        variant="panel"
        imageFit={imageFit}
        className="h-[clamp(190px,35vh,315px)] !min-h-0 rounded-none shadow-none"
      />
    </div>
  );
}

function BulletList({
  locale,
  bullets,
}: {
  locale: YoLocale;
  bullets: NonNullable<YoIntroDetailedSection["bullets"]>;
}) {
  return (
    <div className="grid gap-3">
      {bullets.map((bullet) => (
        <InfoRow key={t(bullet.label, locale)} title={bullet.label} body={bullet.description} locale={locale} />
      ))}
    </div>
  );
}

function TimelinePage({
  locale,
  entries,
  note,
}: {
  locale: YoLocale;
  entries: YoTimelineEntry[];
  note?: YoLocalizedString;
}) {
  return (
    <CardBlock label={lstr("Ligne du temps", "Timeline", "Línea del tiempo")} locale={locale}>
      <ol role="list" className="grid gap-3">
        {entries.map((entry) => (
          <li key={`${entry.year.fr}-${entry.description.fr}`} className="rounded-[18px] border border-[var(--pq-line)] bg-[var(--pq-surface2)] p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pq-primary)]">{t(entry.year, locale)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pq-ink)]">{t(entry.description, locale)}</p>
          </li>
        ))}
      </ol>
      {note ? <Notice title={lstr("Pourquoi ça compte", "Why it matters")} body={note} locale={locale} /> : null}
    </CardBlock>
  );
}

function GroupsPage({
  locale,
  groups,
  icon,
}: {
  locale: YoLocale;
  groups: YoBulletGroup[];
  icon: "food" | "phrase";
}) {
  const Icon = icon === "food" ? Utensils : MessageCircle;
  return (
    <div className="grid gap-3">
      {groups.map((group, index) => (
        <CardBlock
          key={`${group.heading?.fr ?? "group"}-${index}`}
          label={group.heading ?? lstr("À retenir", "Key ideas", "Ideas clave")}
          locale={locale}
          icon={<Icon className="size-4" aria-hidden />}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <VocabChip key={`${item.target}-${item.translation.fr}`} item={item} locale={locale} />
            ))}
          </div>
        </CardBlock>
      ))}
    </div>
  );
}

function DialoguePage({
  locale,
  dialogue,
}: {
  locale: YoLocale;
  dialogue?: YoDialogueScenarioData;
}) {
  if (!dialogue) return null;
  return (
    <CardBlock label={dialogue.title} locale={locale}>
      <div className="grid gap-2.5">
        {dialogue.lines.map((line, index) => (
          <div
            key={`${line.target}-${index}`}
            className={`rounded-[18px] px-4 py-3 text-sm leading-6 ${
              line.speakerKind === "self"
                ? "ml-7 bg-[var(--pq-tint)] text-[var(--pq-ink)]"
                : "mr-7 border border-[var(--pq-line)] bg-[var(--pq-surface2)] text-[var(--pq-ink)]"
            }`}
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--pq-ink-soft)]">
              {t(line.speakerLabel, locale)}
            </span>
            <span lang="es">{line.target}</span>
          </div>
        ))}
      </div>
    </CardBlock>
  );
}

function CulturePointPage({
  locale,
  points,
}: {
  locale: YoLocale;
  points: typeof CULTURE_POINTS;
}) {
  return (
    <CardBlock
      label={lstr("Ce qui rend la RD unique", "What makes the DR unique", "Lo que hace única a RD")}
      locale={locale}
      icon={<Music2 className="size-4" aria-hidden />}
      tint
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {points.map((point) => (
          <div key={point.title.fr} className="rounded-[18px] border border-[var(--pq-line)] bg-[var(--pq-surface)] p-4">
            <p className="text-sm font-bold text-[var(--pq-ink)]">{t(point.title, locale)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pq-ink-soft)]">{t(point.body, locale)}</p>
          </div>
        ))}
      </div>
    </CardBlock>
  );
}

function DictionaryPage({ locale, items }: { locale: YoLocale; items: YoDominicanExpression[] }) {
  return (
    <CardBlock label={lstr("Dictionnaire dominicain", "Dominican dictionary", "Diccionario dominicano")} locale={locale}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--pq-line)] bg-[var(--pq-surface2)] p-3">
            <div className="min-w-0">
              <p className="break-words text-base font-bold text-[var(--pq-ink)]" lang="es">{item.target}</p>
              <p className="text-sm leading-5 text-[var(--pq-ink-soft)]">{t(item.translation, locale)}</p>
            </div>
            <YoSpanishAudioButton
              text={item.target}
              locale={locale}
              moduleId={AUDIO_CONTEXT.moduleId}
              lessonId={AUDIO_CONTEXT.lessonId}
              type="phrase"
              accentProfile={AUDIO_CONTEXT.accentProfile}
              speechLang={AUDIO_CONTEXT.speechLang}
              size="xs"
            />
          </div>
        ))}
      </div>
    </CardBlock>
  );
}

function PhraseFocusPage({
  locale,
  label,
  phrase,
  translation,
}: {
  locale: YoLocale;
  label: YoLocalizedString;
  phrase: string;
  translation: YoLocalizedString;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--pq-line)] bg-[var(--pq-tint)] p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--pq-primary)]">{t(label, locale)}</p>
      <p
        className="mt-3 text-[clamp(1.7rem,6vw,2.45rem)] font-semibold leading-[1.05] text-[var(--pq-ink)]"
        lang="es"
        style={{ fontFamily: "var(--yo-app-display), Newsreader, Georgia, serif" }}
      >
        {phrase}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--pq-ink-soft)]">{t(translation, locale)}</p>
    </div>
  );
}

function PhraseList({
  locale,
  intro,
  phrases,
}: {
  locale: YoLocale;
  intro?: YoLocalizedString;
  phrases: YoVocabularyItem[];
}) {
  return (
    <CardBlock label={intro ?? lstr("Phrases utiles", "Useful phrases", "Frases útiles")} locale={locale} tint>
      <div className="grid gap-2 sm:grid-cols-2">
        {phrases.map((phrase) => (
          <VocabChip key={`${phrase.target}-${phrase.translation.fr}`} item={phrase} locale={locale} />
        ))}
      </div>
    </CardBlock>
  );
}

function VocabChip({ item, locale }: { item: YoVocabularyItem; locale: YoLocale }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[var(--pq-line)] bg-[var(--pq-surface)] px-3 py-3">
      <p className="break-words text-sm font-bold text-[var(--pq-ink)]" lang="es">{item.target}</p>
      <p className="break-words text-xs leading-5 text-[var(--pq-ink-soft)]">{t(item.translation, locale)}</p>
    </div>
  );
}

function InfoRow({
  title,
  body,
  locale,
}: {
  title: YoLocalizedString;
  body?: YoLocalizedString;
  locale: YoLocale;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--pq-line)] bg-[var(--pq-surface)] p-4">
      <p className="text-sm font-bold text-[var(--pq-ink)]">{t(title, locale)}</p>
      {body ? <p className="mt-1 text-sm leading-6 text-[var(--pq-ink-soft)]">{t(body, locale)}</p> : null}
    </div>
  );
}

function CardBlock({
  label,
  locale,
  children,
  icon,
  tint = false,
}: {
  label: YoLocalizedString;
  locale: YoLocale;
  children: React.ReactNode;
  icon?: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <section className={`rounded-[22px] border border-[var(--pq-line)] p-4 ${tint ? "bg-[var(--pq-surface2)]" : "bg-[var(--pq-surface)]"}`}>
      <p className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--pq-primary)]">
        {icon}
        {t(label, locale)}
      </p>
      {children}
    </section>
  );
}

function Notice({
  title,
  body,
  locale,
}: {
  title: YoLocalizedString;
  body?: YoLocalizedString;
  locale: YoLocale;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-[#F4B400]/35 bg-[#FFF4D6] px-4 py-3 text-[#5a3f0f]">
      <p className="text-sm font-bold">{t(title, locale)}</p>
      {body ? <p className="mt-1 text-sm leading-6">{t(body, locale)}</p> : null}
    </div>
  );
}

function Checklist({ locale, items }: { locale: YoLocale; items: YoLocalizedString[] }) {
  return (
    <ul role="list" className="grid gap-2.5">
      {items.map((item) => (
        <li key={item.fr} className="flex items-start gap-3 rounded-[16px] bg-[var(--pq-surface)] px-3 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--pq-primary)]" aria-hidden />
          <span className="text-sm font-semibold leading-6 text-[var(--pq-ink)]">{t(item, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[clamp(0.98rem,2.3vw,1.06rem)] leading-7 text-[var(--pq-ink-soft)]">
      {children}
    </p>
  );
}

function LessonStack({ children }: { children: React.ReactNode }) {
  return <section className="space-y-5 pb-5">{children}</section>;
}

function ReadyPage({
  locale,
  module2Href,
  courseHomeHref,
}: {
  locale: YoLocale;
  module2Href: string;
  courseHomeHref: string;
}) {
  return (
    <LessonStack>
      <div className="flex justify-center">
        <YoYoppoReward show locale={locale} variant="intro-complete" />
      </div>
      <div className="rounded-[24px] border border-[#F4B400]/35 bg-[#FFF4D6] p-5 text-[#5a3f0f] shadow-[0_18px_44px_rgba(15,58,52,0.08)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5a17]">
          {locale === "fr" ? "Prêt" : "Ready"}
        </p>
        <h2
          className="mt-2 text-[clamp(1.65rem,5vw,2.35rem)] font-semibold leading-[1.08]"
          style={{ fontFamily: "var(--yo-app-display), Newsreader, Georgia, serif" }}
        >
          {t(READY_NEXT_HEADLINE, locale)}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#5a3f0f]/85">
          {t(READY_NEXT_BLURB, locale)}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            data-yo-intro-deck-next-module="module-2"
            href={module2Href}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--pq-primary)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pq-primary-hi)]"
          >
            {t(READY_NEXT_CTA, locale)}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={courseHomeHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9]"
          >
            {t(READY_BACK_TO_COURSE_HOME, locale)}
          </Link>
        </div>
      </div>
    </LessonStack>
  );
}

export interface DominicanRepublicIntroContentProps {
  locale: YoLocale;
}

export function DominicanRepublicIntroContent({
  locale,
}: DominicanRepublicIntroContentProps) {
  const screens = buildIntroDeckScreens(locale);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const backHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref =
    locale === "fr"
      ? "/yo/langues/espagnol/pays/republique-dominicaine/intro?lang=en"
      : "/yo/langues/espagnol/pays/republique-dominicaine/intro";

  return (
    <YoAudioFeedbackProvider locale={locale}>
      <YoLessonDeck
        locale={locale}
        moduleLabel={t(DECK_MODULE_LABEL, locale)}
        backHref={backHref}
        toggleHref={toggleHref}
        screens={screens}
        enableTapNavigation
        variant="reference"
      />
    </YoAudioFeedbackProvider>
  );
}
