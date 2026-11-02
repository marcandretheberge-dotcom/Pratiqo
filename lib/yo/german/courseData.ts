import type {
  CourseAssessment,
  CourseCatalog,
  CourseUnit,
} from "../italian/course/courseTypes";
import { lessons01to04 } from "./lessons01to04";
import { lessons05to08 } from "./lessons05to08";
import { germanCultureFinal, germanCultureStops } from "./courseCulture";
import { germanScenarios } from "./courseScenarios";
import { t } from "./courseAuthoring";

const titles = [
  t("Hallo, Berlin!", "Hallo, Berlin!", "Hallo, Berlin!"),
  t(
    "Un café et une conversation",
    "Coffee and conversation",
    "Un café y una conversación",
  ),
  t(
    "La ville à hauteur de pas",
    "Explore the city on foot",
    "La ciudad paso a paso",
  ),
  t("L’heure de partir", "Time to leave", "Hora de salir"),
  t("Poser ses valises", "Settle in", "Dejar las maletas"),
  t("Une journée à inventer", "A day to plan", "Un día por planear"),
  t("Apprendre et travailler", "Learn and work", "Aprender y trabajar"),
  t("À toi de voyager", "Your turn to travel", "Te toca viajar"),
];
const lessons = [...lessons01to04, ...lessons05to08].map((lesson) => ({
  ...lesson,
  activities: [
    ...lesson.activities,
    ...(germanScenarios[lesson.id] ? [germanScenarios[lesson.id]] : []),
  ],
}));
export const germanCourseUnits: CourseUnit[] = titles.map((title, i) => {
  const id = `u${String(i + 1).padStart(2, "0")}`,
    group = lessons.slice(i * 3, i * 3 + 3),
    stop = germanCultureStops[id];
  const quiz: CourseAssessment = {
    id: `de1-${id}-quiz`,
    title: t("Le point d’étape", "Checkpoint", "Punto de control"),
    description: t(
      "Retrouve les expressions sans consulter le carnet. Toute aide reste possible et sera indiquée.",
      "Recall the phrases without opening your notes. Help remains available and will be recorded.",
      "Recuerda las expresiones sin consultar tus notas. Puedes pedir ayuda; quedará indicada.",
    ),
    unitIds: [id],
    passPercent: 80,
    questions: group.flatMap((lesson) =>
      lesson.activities
        .filter((a) => a.kind === "type")
        .map((a) => ({ ...a, id: a.id + "-quiz" })),
    ),
  };
  return {
    id,
    number: i + 1,
    title,
    subtitle: group[0].title,
    objectives: group.map((lesson) => lesson.title),
    lessons: group,
    quiz,
    production: {
      id: `de1-${id}-production`,
      title: t("Une scène à toi", "Make the scene yours", "Una escena tuya"),
      prompt: t(
        "Écris trois à cinq phrases pour jouer ces situations. Change un nom, un lieu ou une préférence. Relis-les à voix haute.",
        "Write three to five sentences for these situations. Change a name, a place or a preference. Read them aloud.",
        "Escribe de tres a cinco frases para estas situaciones. Cambia un nombre, lugar o preferencia. Léelas en voz alta.",
      ),
      model: group.map((lesson) => lesson.vocabulary[0].it).join("\n"),
      rubric: [
        t(
          "Mon message est compréhensible.",
          "My message is understandable.",
          "Mi mensaje se entiende.",
        ),
        t(
          "J’ai vérifié le verbe et sa place.",
          "I checked the verb and its position.",
          "Revisé el verbo y su posición.",
        ),
        t(
          "J’ai comparé les majuscules et les trémas.",
          "I checked capitals and umlauts.",
          "Revisé las mayúsculas y las diéresis.",
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
export const germanFinal: CourseAssessment = {
  id: "de1-final",
  title: t("Le grand voyage", "The full journey", "El gran viaje"),
  description: t(
    "Un bilan cumulatif de tes expressions et de ton écoute. Ce n’est pas une certification.",
    "A cumulative check of your expressions and listening. Not a certification.",
    "Un repaso acumulativo de expresiones y comprensión auditiva. No es una certificación.",
  ),
  unitIds: germanCourseUnits.map((u) => u.id),
  passPercent: 80,
  questions: germanCourseUnits.flatMap((unit) =>
    unit.lessons.slice(0, 2).map((lesson, i) => {
      const activity = lesson.activities.find((a) =>
        i === 0 ? a.kind === "listen" : a.kind === "type" && !a.listeningText,
      )!;
      if (activity.kind !== "listen" && activity.kind !== "type")
        throw new Error("Invalid German final activity");
      return {
        ...activity,
        id: activity.id + "-final",
        taughtInUnitId: unit.id,
      };
    }),
  ),
};
export { germanCultureFinal };
export const germanCatalog: CourseCatalog = {
  units: germanCourseUnits.map((unit) => ({
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
    ...germanCourseUnits.map((u) => u.quiz),
    germanFinal,
    germanCultureFinal,
  ].map((a) => ({
    id: a.id,
    title: a.title,
    unitIds: a.unitIds,
    questionCount: a.questions.length,
    passPercent: a.passPercent,
    theme: a.theme,
  })),
};
export const getGermanUnit = (id: string) =>
  germanCourseUnits.find((unit) => unit.id === id);
