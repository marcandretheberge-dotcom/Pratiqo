import {
  base,
  choice,
  option,
  phrase,
  t,
} from "../italian/course/courseAuthoring";
import type { CourseLesson, CoursePhrase } from "../italian/course/courseTypes";
import type {
  ItalianActivity,
  LocaleText,
} from "../italian/italianModuleTypes";
export { t, phrase, base, choice, option };
export type FoundationLanguage = "en" | "es" | "fr-CA" | "de" | "pt-BR";

export interface FoundationLessonSpec {
  goal: LocaleText;
  orderPrompt: LocaleText;
  recallPrompt: LocaleText;
  recallAccepted?: string[];
  recallModel?: string;
  id: string;
  title: LocaleText;
  grammar: LocaleText;
  sound: LocaleText;
  words: CoursePhrase[];
  reading: CoursePhrase;
  question: LocaleText;
  answers: [string, string, string];
  listen: string;
  heard: [LocaleText, LocaleText, LocaleText];
  extra?: ItalianActivity[];
}
/** 'it' is the existing exercise engine's text slot, not a language identifier.
 * Rendering, audio and answer checking are selected by the course provider. */
export function foundationLesson(spec: FoundationLessonSpec, language: FoundationLanguage): CourseLesson {
  if (spec.words.length < 4 || !spec.recallPrompt || !spec.orderPrompt) throw new Error(`Incomplete ${language} foundation lesson: ${spec.id}`);
  const { id, words } = spec;
  const explanation = t(
    `Le texte indique : ${spec.answers[0]}.`,
    `The text says: ${spec.answers[0]}.`,
    `El texto indica: ${spec.answers[0]}.`,
  );
  const reading = choice(
    `${id}-read`,
    spec.question,
    spec.answers.map((text, i) =>
      option(
        String(i),
        text,
        i === 0
          ? explanation
          : t(
              `Tu as choisi « ${text} ». Dans cette scène, l’information demandée est « ${spec.answers[0]} ». Relis le passage pour retrouver ce détail.`,
              `You chose “${text}”. In this scene, the requested information is “${spec.answers[0]}”. Read the passage again to locate that detail.`,
              `Elegiste «${text}». En esta escena, la información solicitada es «${spec.answers[0]}». Vuelve al texto para localizar ese detalle.`,
            ),
      ),
    ),
    "0",
    explanation,
  );
  const listening = choice(
    `${id}-listen`,
    t(
      "Quel est le message essentiel ?",
      "What is the key message?",
      "¿Cuál es el mensaje principal?",
    ),
    spec.heard.map((label, i) => ({
      id: String(i),
      label,
      feedback:
        i === 0
          ? spec.heard[0]
          : t(
              `Ton choix : ${label.fr} Le message signifie : ${spec.heard[0].fr} Réécoute « ${spec.listen} » pour repérer les mots qui portent ce sens.`,
              `Your choice: ${label.en} The message means: ${spec.heard[0].en} Listen again to “${spec.listen}” and notice the words that carry that meaning.`,
              `Tu elección: ${label.es} El mensaje significa: ${spec.heard[0].es} Escucha de nuevo «${spec.listen}» y reconoce las palabras que expresan ese sentido.`,
            ),
    })),
    "0",
    spec.heard[0],
    "listen",
    spec.listen,
  );
  const target = words[0],
    tokens = target.it.split(/\s+/);
  const recall = words[1];
  const activities: ItalianActivity[] = [
    {
      ...base(
        `${id}-pairs`,
        t("Les paires de Yoppo", "Yoppo’s pairs", "Las parejas de Yoppo"),
        t(
          "Associe les expressions et leur sens.",
          "Match each phrase to its meaning.",
          "Relaciona las expresiones con su significado.",
        ),
        spec.grammar,
      ),
      kind: "match",
      pairs: words.map((word, i) => ({ id: String(i), ...word })),
    },
    {
      ...base(
        `${id}-order`,
        t("Construis la phrase", "Build the sentence", "Construye la frase"),
        spec.orderPrompt,
        spec.grammar,
      ),
      kind: "order",
      tokens,
      answer: tokens,
      it: target.it,
    },
    reading,
    listening,
    {
      ...base(
        `${id}-write`,
        t("Retrouve les mots", "Recall the words", "Recuerda las palabras"),
        spec.recallPrompt,
        spec.grammar,
      ),
      kind: "type",
      accepted: spec.recallAccepted ?? [spec.recallModel ?? recall.it],
      model: spec.recallModel ?? spec.recallAccepted?.[0] ?? recall.it,
    },
    {
      ...base(
        `${id}-dictation`,
        t("Écoute et écris", "Listen and write", "Escucha y escribe"),
        t(
          "Écris le message entendu. Tu peux ralentir ou réécouter.",
          "Write the message you hear. Slow down or replay as needed.",
          "Escribe el mensaje. Puedes ralentizarlo o repetirlo.",
        ),
        spec.sound,
      ),
      kind: "type",
      listeningText: spec.listen,
      model: spec.listen,
      accepted: [spec.listen],
    },
    ...(spec.extra ?? []),
  ];
  // Rotate authored choices deterministically: correct answers must not always occupy slot one.
  for (const activity of activities)
    if ("options" in activity) {
      const offset =
        Array.from(activity.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) %
        activity.options.length;
      activity.options = [
        ...activity.options.slice(offset),
        ...activity.options.slice(0, offset),
      ];
    }
  return {
    id,
    title: spec.title,
    goal: spec.goal,
    vocabulary: words,
    grammar: {
      title: t("Le repère utile", "A useful pattern", "Una pauta útil"),
      body: spec.grammar,
      examples: [target, recall],
    },
    pronunciation: { body: spec.sound, practice: [target.it, recall.it] },
    reading: spec.reading,
    readingActivityId: reading.id,
    activities,
    speaking: {
      prompt: t(
        "Cache le modèle. Joue la scène à voix haute avec Yoppo, puis change un détail.",
        "Hide the model. Act out the scene aloud with Yoppo, then change one detail.",
        "Oculta el modelo. Representa la escena en voz alta con Yoppo y cambia un detalle.",
      ),
      checklist: [
        t(
          "Je transmets le message essentiel.",
          "I communicate the key message.",
          "Comunico el mensaje principal.",
        ),
        t(
          "Je compare ma formulation au modèle sans prétendre faire évaluer ma prononciation.",
          "I compare my wording with the model; my pronunciation is not automatically assessed.",
          "Comparo mi frase con el modelo; mi pronunciación no se evalúa automáticamente.",
        ),
      ],
    },
  };
}
