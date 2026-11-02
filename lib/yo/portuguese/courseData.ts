import type {
  CourseAssessment,
  CourseCatalog,
  CourseUnit,
} from "../italian/course/courseTypes";
import { lessons01to04 } from "./lessons01to04";
import { lessons05to08 } from "./lessons05to08";
import {
  portugueseCultureFinal,
  portugueseCultureStops,
} from "./courseCulture";
import { portugueseScenarios } from "./courseScenarios";
import { t } from "./courseAuthoring";
const titles = [
  t("Olá, Brasil!", "Olá, Brasil!", "Olá, Brasil!"),
  t(
    "Un café, un vrai échange",
    "Coffee and conversation",
    "Un café y una conversación",
  ),
  t("À travers la ville", "Across the city", "Por la ciudad"),
  t("L’heure et les projets", "Time and plans", "La hora y los planes"),
  t("Poser ses valises", "Settle in", "Dejar las maletas"),
  t("Choisir sa journée", "Plan your day", "Elegir tu día"),
  t("Apprendre et travailler", "Learn and work", "Aprender y trabajar"),
  t("Ta prochaine aventure", "Your next adventure", "Tu próxima aventura"),
];
const lessons = [...lessons01to04, ...lessons05to08].map((lesson) => ({
  ...lesson,
  activities: [
    ...lesson.activities,
    ...(portugueseScenarios[lesson.id] ? [portugueseScenarios[lesson.id]] : []),
  ],
}));
export const portugueseCourseUnits: CourseUnit[] = titles.map((title, i) => {
  const id = `u${String(i + 1).padStart(2, "0")}`,
    group = lessons.slice(i * 3, i * 3 + 3),
    stop = portugueseCultureStops[id];
  return {
    id,
    number: i + 1,
    title,
    subtitle: group[0].title,
    objectives: group.map((l) => l.title),
    lessons: group,
    quiz: {
      id: `ptbr1-${id}-quiz`,
      title: t("Le point d’étape", "Checkpoint", "Punto de control"),
      description: t(
        "Retrouve les formulations sans consulter le modèle. Toute aide sera indiquée.",
        "Recall the wording without a model. Any help will be recorded.",
        "Recuerda las expresiones sin modelo. Se registrará cualquier ayuda.",
      ),
      unitIds: [id],
      passPercent: 80,
      questions: group.flatMap((l) =>
        l.activities
          .filter((a) => a.kind === "type")
          .map((a) => ({ ...a, id: a.id + "-quiz" })),
      ),
    },
    production: {
      id: `ptbr1-${id}-production`,
      title: t(
        "Ta scène au Brésil",
        "Your scene in Brazil",
        "Tu escena en Brasil",
      ),
      prompt: t(
        "Écris trois à cinq phrases pour jouer ces situations. Change un lieu, une préférence ou un horaire. Relis à voix haute.",
        "Write three to five sentences for these situations. Change a place, preference or time. Read them aloud.",
        "Escribe de tres a cinco frases para estas situaciones. Cambia un lugar, preferencia u horario. Léelas en voz alta.",
      ),
      model: group.map((l) => l.vocabulary[0].it).join("\n"),
      rubric: [
        t(
          "Mon intention est compréhensible.",
          "My intention is understandable.",
          "Se entiende mi intención.",
        ),
        t(
          "J’ai vérifié le verbe et les petits mots.",
          "I checked the verb and the connecting words.",
          "Revisé el verbo y las palabras de enlace.",
        ),
        t(
          "J’ai comparé les accents, notamment ã, õ et ç.",
          "I checked accents, including ã, õ and ç.",
          "Comparé los acentos, incluidos ã, õ y ç.",
        ),
      ],
    },
    culture: stop
      ? { title: stop.title, body: stop.body, sourceIds: [stop.source.id] }
      : {
          title: t(
            "Parler avec attention",
            "Speak thoughtfully",
            "Hablar con atención",
          ),
          body: group[0].grammar.body,
          sourceIds: [],
        },
    ...(stop ? { cultureStop: stop } : {}),
  };
});
export const portugueseFinal: CourseAssessment = {
  id: "ptbr1-final",
  title: t("Le grand voyage", "The full journey", "El gran viaje"),
  description: t(
    "Réutilise les mots de tout le parcours. Ce bilan n’est pas une certification.",
    "Use phrases from the whole course. This assessment is not a certification.",
    "Reutiliza las expresiones de todo el recorrido. Este repaso no es una certificación.",
  ),
  unitIds: portugueseCourseUnits.map((u) => u.id),
  passPercent: 80,
  questions: portugueseCourseUnits.flatMap((unit) =>
    unit.lessons.slice(0, 2).map((lesson, i) => {
      const activity = lesson.activities.find((a) =>
        i === 0 ? a.kind === "listen" : a.kind === "type" && !a.listeningText,
      )!;
      if (activity.kind !== "listen" && activity.kind !== "type")
        throw new Error("Invalid Portuguese final activity");
      return {
        ...activity,
        id: activity.id + "-final",
        taughtInUnitId: unit.id,
      };
    }),
  ),
};
export { portugueseCultureFinal };
export const portugueseCatalog: CourseCatalog = {
  units: portugueseCourseUnits.map((unit) => ({
    id: unit.id,
    number: unit.number,
    title: unit.title,
    subtitle: unit.subtitle,
    objectives: unit.objectives,
    lessons: unit.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      activityIds: l.activities.map((a) => a.id),
    })),
    activityIds: unit.lessons.flatMap((l) => l.activities.map((a) => a.id)),
    quizId: unit.quiz.id,
    productionId: unit.production.id,
    phraseCount: unit.lessons.reduce((n, l) => n + l.vocabulary.length, 0),
    photo: unit.cultureStop?.photo,
  })),
  assessments: [
    ...portugueseCourseUnits.map((u) => u.quiz),
    portugueseFinal,
    portugueseCultureFinal,
  ].map((a) => ({
    id: a.id,
    title: a.title,
    unitIds: a.unitIds,
    questionCount: a.questions.length,
    passPercent: a.passPercent,
    theme: a.theme,
  })),
};
export const getPortugueseUnit = (id: string) =>
  portugueseCourseUnits.find((unit) => unit.id === id);
