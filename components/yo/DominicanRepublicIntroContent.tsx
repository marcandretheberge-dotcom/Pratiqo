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
  dominicanRepublicA1PanoramaMiniQuizzes,
} from "@/lib/yo/dominicanRepublicA1";
import { lstr, t } from "@/lib/yo/localize";
import type {
  YoBulletGroup,
  YoDialogueScenarioData,
  YoDominicanExpression,
  YoIntroDetailedSection,
  YoLocale,
  YoLocalizedString,
  YoQuizQuestion,
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
  "Intro · Republique dominicaine · A1",
  "Intro · Dominican Republic · A1",
  "Intro · Republica Dominicana · A1",
);

const READY_NEXT_HEADLINE = lstr(
  "Module 2 - Hotel et aeroport",
  "Module 2 - Hotel & airport",
  "Modulo 2 - Hotel y aeropuerto",
);
const READY_NEXT_BLURB = lstr(
  "Tu enchaines avec les phrases concretes pour passer la douane, prendre un taxi et faire ton check-in.",
  "Next up: the real phrases for clearing customs, grabbing a taxi, and checking into your hotel.",
  "Sigue con las frases reales para pasar la aduana, tomar un taxi y hacer tu check-in.",
);
const READY_NEXT_CTA = lstr("Ouvrir le Module 2", "Open Module 2", "Abrir el Modulo 2");
const READY_BACK_TO_COURSE_HOME = lstr(
  "Retour a l'accueil du parcours",
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
      "La musique fait partie des fetes, de la rue, des familles et de la memoire du pays.",
      "Music is part of celebrations, streets, families, and the country's memory.",
    ),
  },
  {
    title: lstr("Baseball partout", "Baseball everywhere"),
    body: lstr(
      "Le baseball est un langage social: on en parle au colmado, a la maison et avec fierte.",
      "Baseball is a social language: people talk about it at the colmado, at home, and with pride.",
    ),
  },
  {
    title: lstr("Colmados et guaguas", "Colmados and guaguas"),
    body: lstr(
      "Les petits commerces et transports partages montrent la vie quotidienne au-dela des zones touristiques.",
      "Small shops and shared transport show everyday life beyond tourist zones.",
    ),
  },
  {
    title: lstr("Famille et hospitalite", "Family and hospitality"),
    body: lstr(
      "Les repas, les reunions et l'accueil chaleureux donnent du sens aux mots que tu apprends.",
      "Meals, gatherings, and warm hospitality give meaning to the words you learn.",
    ),
  },
];

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
    screen("welcome", "mission", "Mission", "Bienvenue dans le voyage", "Un parcours plein ecran, une action a la fois.", "map", (
      <HeroPage
        locale={locale}
        tagline={WELCOME_TAGLINE}
        title={data.module.heroTitle}
        subtitle={data.module.heroSubtitle}
      />
    )),
    screen("objectives", "mission", "Objectif", "Ce que tu vas valider", "Le compteur augmente parce que chaque page tient dans le viewport.", "map", (
      <StatsPage locale={locale} />
    )),
    screen("essential-questions", "mission", "Questions", "Avant de memoriser", "On comprend le contexte avant les mots.", "map", (
      <ChecklistPage
        locale={locale}
        items={[
          lstr("Qu'est-ce qui rend la RD differente d'un simple resort ?", "What makes the DR more than just a resort?"),
          lstr("Pourquoi Santo Domingo compte dans l'histoire des Ameriques ?", "Why does Santo Domingo matter in the Americas?"),
          lstr("Que faut-il comprendre pour parler avec respect ?", "What should you understand to speak with respect?"),
        ]}
      />
    )),
    screen("can-do", "mission", "Je peux", "A la fin de cette intro", "Des objectifs simples et observables.", "map", (
      <ChecklistPage
        locale={locale}
        items={[
          lstr("situer la Republique dominicaine", "locate the Dominican Republic"),
          lstr("reconnaitre quelques elements culturels", "recognize key cultural elements"),
          lstr("saluer et me presenter simplement", "greet and introduce myself simply"),
          lstr("expliquer a mon professeur quoi pratiquer", "tell my teacher what I want to practice"),
        ]}
      />
    )),
    screen("first-mission", "mission", "Mission", "Premier scenario", "Une phrase passerelle, sans exercice note.", "map", (
      <PhraseFocusPage
        locale={locale}
        label={lstr("Premiere mission", "First mission")}
        phrase="Buenas tardes. Me llamo Marc. Quiero practicar la conversación."
        translation={lstr(
          "Tu salues, tu te presentes et tu dis quoi pratiquer.",
          "You greet, introduce yourself, and say what you want to practice.",
        )}
      />
    )),
  ];

  appendSectionScreens(screens, locale, {
    section: geography,
    quiz: dominicanRepublicA1PanoramaMiniQuizzes.geography,
    baseId: "geography",
    label: "Pays",
    title: "Panorama du pays",
    imageFit: "contain",
    chunks: [
      <BulletPage key="geo-1" locale={locale} section={geography} bullets={geography.bullets?.slice(0, 4) ?? []} />,
      <BulletPage key="geo-2" locale={locale} section={geography} bullets={geography.bullets?.slice(4) ?? []} phrases />,
    ],
  });

  appendSectionScreens(screens, locale, {
    section: history,
    quiz: dominicanRepublicA1PanoramaMiniQuizzes.history,
    baseId: "history",
    label: "Histoire",
    title: "Panorama historique",
    chunks: [
      <TimelinePage key="history-1" locale={locale} entries={history.timeline?.slice(0, 4) ?? []} />,
      <TimelinePage key="history-2" locale={locale} entries={history.timeline?.slice(4) ?? []} note={history.learningNote} />,
    ],
  });

  appendSectionScreens(screens, locale, {
    section: food,
    quiz: dominicanRepublicA1PanoramaMiniQuizzes.food,
    baseId: "food",
    label: "Gastro",
    title: "Panorama gastronomie",
    chunks: [
      <GroupsPage key="food-1" locale={locale} groups={food.bulletGroups?.slice(0, 1) ?? []} icon="food" />,
      <GroupsPage
        key="food-2"
        locale={locale}
        groups={food.bulletGroups?.slice(1) ?? []}
        phrases={food.practicalPhrases}
        phraseIntro={food.practicalPhrasesIntro}
        icon="food"
      />,
    ],
  });

  appendSectionScreens(screens, locale, {
    section: phrases,
    quiz: dominicanRepublicA1PanoramaMiniQuizzes.phrases,
    baseId: "phrases",
    label: "Phrases",
    title: "Premieres phrases",
    chunks: [
      <GroupsPage key="phrases-1" locale={locale} groups={phrases.bulletGroups?.slice(0, 2) ?? []} icon="phrase" />,
      <GroupsPage key="phrases-2" locale={locale} groups={phrases.bulletGroups?.slice(2) ?? []} icon="phrase" />,
      <DialoguePage key="phrases-3" locale={locale} dialogue={phrases.dialogue} />,
    ],
  });

  screens.push(
    screen("culture-image", "culture", "Culture", "Panorama culturel", "Une image, une idee centrale.", "map", (
      <ImageIntroPage
        locale={locale}
        imagePath={data.module.cultureImagePath}
        imageAlt={
          data.module.cultureImageAlt ??
          lstr("Musique et culture dominicaine", "Dominican music and culture")
        }
        visualHint="hero-tropical"
        title={lstr("Ce qui rend la RD unique", "What makes the DR unique")}
        body={lstr(
          "YoPratiqo enseigne la langue dans la culture: rythme, lieux, gestes et situations.",
          "YoPratiqo teaches language inside culture: rhythm, places, gestures, and situations.",
        )}
      />
    )),
    screen("culture-points-1", "culture", "Culture", "Musique et sport", "Deux reperes, puis on verifie.", "map", (
      <CulturePointPage locale={locale} points={CULTURE_POINTS.slice(0, 2)} />
    )),
    screen("culture-points-2", "culture", "Culture", "Vie quotidienne", "Deux reperes, puis mini-quiz.", "map", (
      <CulturePointPage locale={locale} points={CULTURE_POINTS.slice(2)} />
    )),
    quizScreen("culture-quiz", "Culture", "Mini-quiz culture", dominicanRepublicA1PanoramaMiniQuizzes.culture, locale),
    screen("listening-demo", "practice", "Ecoute", "Valide le format audio", "Demo technique seulement: le vrai contenu sera redige ensuite.", "confused", (
      <div className="h-full min-h-0 overflow-hidden">
        <YoListeningExercisePreview data={dominicanRepublicA1ListeningDemo} locale={locale} />
      </div>
    )),
    ...dictionaryScreens(data.dominicanDictionary, locale),
    screen("flashcards", "practice", "Flashcards", "Memorise les essentiels", "Carte, note SM-2 et navigation interne tiennent dans l'ecran.", "map", (
      <YoFlashcardPreview
        cards={data.flashcardDeck}
        locale={locale}
        speechLang="es-DO"
        enableAudioFeedback
        compactDeck
        viewportDeck
        audioContext={AUDIO_CONTEXT}
      />
    )),
    screen("quiz", "quiz", "Quiz final", "Verifie ton intro", "Cinq questions courtes. Feedback immediat.", "confused", (
      <YoQuizPreview questions={data.quizQuestions} locale={locale} enableAudioFeedback compactDeck viewportDeck />
    )),
    screen("ready", "completion", "Pret", "Direction le Module 2", "Ton compagnon t'attend dans la suite.", "celebrating", (
      <ReadyPage
        locale={locale}
        module2Href={module2Href}
        courseHomeHref={courseHomeHref}
      />
    )),
  );

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
  eyebrowFr: string,
  titleFr: string,
  helperFr: string,
  companionState: YoLessonDeckScreen["companionState"],
  content: React.ReactNode,
): YoLessonDeckScreen {
  return {
    id,
    kind,
    eyebrow: eyebrowFr,
    title: titleFr,
    helperText: helperFr,
    companionState,
    content,
  };
}

function quizScreen(
  id: string,
  eyebrow: string,
  title: string,
  questions: YoQuizQuestion[],
  locale: YoLocale,
): YoLessonDeckScreen {
  return screen(id, "quiz", eyebrow, title, "Questions bidon a remplacer par le contenu revise.", "confused", (
    <YoQuizPreview questions={questions} locale={locale} enableAudioFeedback compactDeck viewportDeck />
  ));
}

function appendSectionScreens(
  screens: YoLessonDeckScreen[],
  locale: YoLocale,
  config: {
    section: YoIntroDetailedSection;
    quiz: YoQuizQuestion[];
    baseId: string;
    label: string;
    title: string;
    chunks: React.ReactNode[];
    imageFit?: "cover" | "contain";
  },
) {
  screens.push(
    screen(`${config.baseId}-image`, "culture", config.label, config.title, "Image et idee principale deja ouvertes.", "map", (
      <ImageIntroPage
        locale={locale}
        imagePath={config.section.imagePath}
        imageAlt={config.section.imageAlt ?? config.section.title}
        visualHint={config.section.visualHint}
        imageFit={config.imageFit}
        title={config.section.title}
        body={config.section.intro}
        highlightTitle={config.section.highlightTitle}
        highlightBody={config.section.highlightBody}
      />
    )),
    ...config.chunks.map((content, index) =>
      screen(
        `${config.baseId}-content-${index + 1}`,
        "culture",
        config.label,
        index === 0 ? "A retenir" : "Suite",
        "Une page courte, sans scroll.",
        "map",
        content,
      ),
    ),
    quizScreen(`${config.baseId}-quiz`, config.label, `Mini-quiz ${config.label.toLowerCase()}`, config.quiz, locale),
  );
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
    <FitPage>
      <div className="flex h-full flex-col justify-center gap-4">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-teal-300/40 bg-white/80 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em] text-teal-800">
          <MapPin className="size-3.5" aria-hidden />
          {t(tagline, locale)}
        </p>
        <h1 className="text-[clamp(1.35rem,5vw,2.35rem)] font-semibold leading-tight tracking-tight text-[#1a3a32]">
          {t(title, locale)}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[#1a3a32]/75 sm:text-base">
          {t(subtitle, locale)}
        </p>
      </div>
    </FitPage>
  );
}

function StatsPage({ locale }: { locale: YoLocale }) {
  const data = dominicanRepublicA1;
  return (
    <FitPage>
      <div className="grid h-full min-h-0 content-center gap-3">
        <h3 className="text-xl font-semibold tracking-tight text-[#1a3a32]">
          {t(data.introProgress.title, locale)}
        </h3>
        <p className="text-sm leading-relaxed text-[#566073]">
          {t(data.introProgress.description, locale)}
        </p>
        <ul role="list" className="grid grid-cols-2 gap-2">
          {data.introProgress.stats.map((stat) => (
            <li key={stat.id} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-teal-100">
              <span className="block text-xl font-semibold text-[#1a3a32]">{stat.value}</span>
              <span className="block text-[11px] leading-snug text-[#566073]">{t(stat.label, locale)}</span>
            </li>
          ))}
        </ul>
      </div>
    </FitPage>
  );
}

function ChecklistPage({ locale, items }: { locale: YoLocale; items: YoLocalizedString[] }) {
  return (
    <FitPage>
      <ul role="list" className="grid h-full content-center gap-2.5">
        {items.map((item) => (
          <li key={item.fr} className="flex items-start gap-3 rounded-2xl bg-[#DDF4F1]/55 p-3 ring-1 ring-teal-100/70">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#0F6E56]" aria-hidden />
            <span className="text-sm font-medium leading-relaxed text-[#1a3a32]">{t(item, locale)}</span>
          </li>
        ))}
      </ul>
    </FitPage>
  );
}

function ImageIntroPage({
  locale,
  imagePath,
  imageAlt,
  visualHint,
  imageFit = "cover",
  title,
  body,
  highlightTitle,
  highlightBody,
}: {
  locale: YoLocale;
  imagePath?: string | null;
  imageAlt: YoLocalizedString;
  visualHint?: YoVisualHint;
  imageFit?: "cover" | "contain";
  title: YoLocalizedString;
  body?: YoLocalizedString;
  highlightTitle?: YoLocalizedString;
  highlightBody?: YoLocalizedString;
}) {
  return (
    <FitPage>
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
        <YoImageVisual
          imagePath={imagePath}
          alt={imageAlt}
          locale={locale}
          fallbackKind={visualHint}
          variant="panel"
          imageFit={imageFit}
          className="min-h-0 rounded-2xl shadow-none"
        />
        <div className="min-h-0 rounded-2xl bg-white/90 p-3 ring-1 ring-teal-100">
          <h3 className="text-base font-semibold text-[#1a3a32] sm:text-lg">{t(title, locale)}</h3>
          {body ? <p className="mt-1 text-xs leading-relaxed text-[#566073] sm:text-sm">{t(body, locale)}</p> : null}
          {highlightTitle ? (
            <p className="mt-2 rounded-xl bg-[#FFF4D6] px-3 py-2 text-xs leading-relaxed text-[#5a3f0f] ring-1 ring-[#F4B400]/30">
              <span className="font-semibold">{t(highlightTitle, locale)}</span>
              {highlightBody ? ` - ${t(highlightBody, locale)}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </FitPage>
  );
}

function BulletPage({
  locale,
  section,
  bullets,
  phrases = false,
}: {
  locale: YoLocale;
  section: YoIntroDetailedSection;
  bullets: NonNullable<YoIntroDetailedSection["bullets"]>;
  phrases?: boolean;
}) {
  return (
    <FitPage>
      <div className="grid h-full min-h-0 content-center gap-2.5">
        {bullets.map((bullet) => (
          <InfoRow key={t(bullet.label, locale)} title={bullet.label} body={bullet.description} locale={locale} />
        ))}
        {phrases && section.practicalPhrases ? (
          <PhraseList locale={locale} intro={section.practicalPhrasesIntro} phrases={section.practicalPhrases} />
        ) : null}
      </div>
    </FitPage>
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
    <FitPage>
      <ol role="list" className="grid h-full content-center gap-2">
        {entries.map((entry) => (
          <li key={`${entry.year.fr}-${entry.description.fr}`} className="rounded-2xl bg-white p-3 ring-1 ring-teal-100">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-teal-700">{t(entry.year, locale)}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#1a3a32]/88 sm:text-sm">{t(entry.description, locale)}</p>
          </li>
        ))}
        {note ? (
          <li className="rounded-2xl bg-[#FFF4D6] p-3 text-xs leading-relaxed text-[#5a3f0f] ring-1 ring-[#F4B400]/30 sm:text-sm">
            {t(note, locale)}
          </li>
        ) : null}
      </ol>
    </FitPage>
  );
}

function GroupsPage({
  locale,
  groups,
  phrases,
  phraseIntro,
  icon,
}: {
  locale: YoLocale;
  groups: YoBulletGroup[];
  phrases?: YoVocabularyItem[];
  phraseIntro?: YoLocalizedString;
  icon: "food" | "phrase";
}) {
  const Icon = icon === "food" ? Utensils : MessageCircle;
  return (
    <FitPage>
      <div className="grid h-full content-center gap-3">
        {groups.map((group, index) => (
          <div key={`${group.heading?.fr ?? "group"}-${index}`} className="rounded-2xl bg-white p-3 ring-1 ring-teal-100">
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-teal-700">
              <Icon className="size-3.5" aria-hidden />
              {group.heading ? t(group.heading, locale) : "A retenir"}
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.items.map((item) => (
                <VocabChip key={`${item.target}-${item.translation.fr}`} item={item} locale={locale} />
              ))}
            </div>
          </div>
        ))}
        {phrases ? <PhraseList locale={locale} intro={phraseIntro} phrases={phrases} /> : null}
      </div>
    </FitPage>
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
    <FitPage>
      <div className="grid h-full content-center gap-2">
        <p className="text-sm font-semibold text-[#1a3a32]">{t(dialogue.title, locale)}</p>
        {dialogue.lines.map((line, index) => (
          <div
            key={`${line.target}-${index}`}
            className={`rounded-2xl px-3 py-2 text-xs leading-snug ring-1 sm:text-sm ${
              line.speakerKind === "self"
                ? "ml-8 bg-[#DDF4F1] text-[#0F6E56] ring-teal-100"
                : "mr-8 bg-white text-[#1a3a32] ring-teal-100"
            }`}
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
              {t(line.speakerLabel, locale)}
            </span>
            <span lang="es">{line.target}</span>
          </div>
        ))}
      </div>
    </FitPage>
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
    <FitPage>
      <div className="grid h-full content-center gap-3">
        {points.map((point) => (
          <div key={point.title.fr} className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1a3a32]">
              <Music2 className="size-4 text-[#1D9E75]" aria-hidden />
              {t(point.title, locale)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#566073] sm:text-sm">{t(point.body, locale)}</p>
          </div>
        ))}
      </div>
    </FitPage>
  );
}

function dictionaryScreens(expressions: YoDominicanExpression[], locale: YoLocale): YoLessonDeckScreen[] {
  return chunk(expressions, 4).map((items, index) =>
    screen(
      `dictionary-${index + 1}`,
      "culture",
      "Dictionnaire",
      `Expressions ${index + 1}`,
      "Reference compacte, sans scroll.",
      "map",
      <DictionaryPage locale={locale} items={items} />,
    ),
  );
}

function DictionaryPage({ locale, items }: { locale: YoLocale; items: YoDominicanExpression[] }) {
  return (
    <FitPage>
      <div className="grid h-full content-center gap-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-teal-100">
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-[#1a3a32]" lang="es">{item.target}</p>
              <p className="text-xs text-[#566073] sm:text-sm">{t(item.translation, locale)}</p>
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
    </FitPage>
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
    <FitPage>
      <div className="flex h-full flex-col justify-center gap-4 rounded-3xl bg-[#DDF4F1]/55 p-5 ring-1 ring-teal-100">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">{t(label, locale)}</p>
        <p className="text-2xl font-semibold leading-tight text-[#1a3a32]" lang="es">{phrase}</p>
        <p className="text-sm leading-relaxed text-[#566073]">{t(translation, locale)}</p>
      </div>
    </FitPage>
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
    <div className="rounded-2xl bg-[#DDF4F1]/55 p-3 ring-1 ring-teal-100">
      {intro ? <p className="mb-2 text-xs font-semibold text-teal-800">{t(intro, locale)}</p> : null}
      <div className="grid gap-1.5">
        {phrases.map((phrase) => (
          <VocabChip key={`${phrase.target}-${phrase.translation.fr}`} item={phrase} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function VocabChip({ item, locale }: { item: YoVocabularyItem; locale: YoLocale }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#FAFCFB] px-3 py-2 ring-1 ring-teal-100/80">
      <p className="break-words text-sm font-semibold text-[#1a3a32]" lang="es">{item.target}</p>
      <p className="break-words text-[11px] leading-snug text-[#566073] sm:text-xs">{t(item.translation, locale)}</p>
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
    <div className="rounded-2xl bg-white p-3 ring-1 ring-teal-100">
      <p className="text-sm font-semibold text-[#1a3a32]">{t(title, locale)}</p>
      {body ? <p className="mt-0.5 text-xs leading-relaxed text-[#566073] sm:text-sm">{t(body, locale)}</p> : null}
    </div>
  );
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
    <FitPage>
      <div className="flex h-full flex-col justify-center gap-4">
        <YoYoppoReward show locale={locale} variant="intro-complete" />
        <div className="rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a5a17]">
            {locale === "fr" ? "Pret" : "Ready"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#5a3f0f]">
            {t(READY_NEXT_HEADLINE, locale)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5a3f0f]/85">
            {t(READY_NEXT_BLURB, locale)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              data-yo-intro-deck-next-module="module-2"
              href={module2Href}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0b5b47]"
            >
              {t(READY_NEXT_CTA, locale)}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={courseHomeHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9]"
            >
              {t(READY_BACK_TO_COURSE_HOME, locale)}
            </Link>
          </div>
        </div>
      </div>
    </FitPage>
  );
}

function FitPage({ children }: { children: React.ReactNode }) {
  return (
    <section className="h-full min-h-0 overflow-hidden px-1 py-1">
      {children}
    </section>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
        allowScreenScroll={false}
      />
    </YoAudioFeedbackProvider>
  );
}
