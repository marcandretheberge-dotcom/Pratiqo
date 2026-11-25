import { L, type Exercise, type Localized, type Phrase, type Unit } from "./types";
export { L, P } from "./types";
export const spokenLine = (speaker: string, phrase: Phrase) => ({ ...phrase, speaker });
export const MANDARIN_DEPTH_SOURCES = {
  grammar: "https://www.ctcfl.ox.ac.uk/materials_chinese_grammarlist/",
  comparison: "https://www.ctcfl.ox.ac.uk/materials_grammar-exercises_comparatives/",
  aspect: "https://www.ctcfl.ox.ac.uk/materials_grammar-exercises_summary-on-le/",
  conjunctions: "https://www.ctcfl.ox.ac.uk/materials_lang-work_grammar-database_grammar-database1/",
  sounds: "https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/pages/online-textbook/part-i-introduction-units-1-4-character-lessons-1-3/",
  tea: "https://ich.unesco.org/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884",
  library: "https://www.library.sh.cn/en/service/rules-and-regulations",
};
const hint = L("Repère la personne, le moment et le besoin. Afficher le modèle compte comme une aide.", "Identify the person, time and need. Showing the model counts as help.", "Identifica persona, momento y necesidad. Mostrar el modelo cuenta como ayuda.");
const feedback = (selected: string, expected: string, why: Localized) => L(
  `Tu as choisi « ${selected} ». Le contexte demande « ${expected} ». ${why.fr}`,
  `You chose “${selected}”. The context calls for “${expected}”. ${why.en}`,
  `Elegiste «${selected}». El contexto pide «${expected}». ${why.es}`,
);
export function depthExercises(prefix: string) {
  return {
    choice(suffix: string, prompt: Localized, answers: [Phrase, Phrase, Phrase], explanation: Localized, options: { stimulus?: Phrase; roleplay?: boolean } = {}): Exercise {
      return { id: `${prefix}-${suffix}`, kind: options.roleplay ? "roleplay" : "choice", prompt, hint, explanation, model: answers[0], answer: "a", ...(options.stimulus ? { stimulus: options.stimulus } : {}),
        choices: answers.map((phrase, i) => ({ id: ["a", "b", "c"][i], phrase, feedback: i === 0 ? explanation : feedback(phrase.hanzi, answers[0].hanzi, explanation) })) };
    },
    meaning(suffix: string, prompt: Localized, model: Phrase, answers: [Localized, Localized, Localized], explanation: Localized, stimulus?: Phrase): Exercise {
      return { id: `${prefix}-${suffix}`, kind: "choice", prompt, hint, explanation, model, answer: "a", ...(stimulus ? { stimulus } : {}),
        choices: answers.map((label, i) => ({ id: ["a", "b", "c"][i], label, feedback: i === 0 ? explanation : L(`« ${label.fr} » ne conserve pas le contexte : ${explanation.fr}`, `“${label.en}” does not preserve the context: ${explanation.en}`, `«${label.es}» no conserva el contexto: ${explanation.es}`) })) };
    },
    write(suffix: string, prompt: Localized, model: Phrase, explanation: Localized, alternatives: string[] = [], hanziOnly = false): Exercise {
      const authored = [model.hanzi, ...(hanziOnly ? [] : [model.pinyin]), ...alternatives];
      // Commas separate clauses; omitting them does not change the practised words or tones.
      // Limit this tolerance to the newly authored extension, preserving legacy matchers.
      const accepted = [...new Set(authored.flatMap(text => [text, text.replace(/[,，]/g, "")]))];
      return { id: `${prefix}-${suffix}`, kind: "write", prompt, hint, explanation, model, accepted };
    },
    build(suffix: string, prompt: Localized, model: Phrase, tokens: string[], explanation: Localized): Exercise {
      return { id: `${prefix}-${suffix}`, kind: "build", prompt, hint, explanation, model, tokens: [...tokens].reverse(), answer: tokens };
    },
    match(suffix: string, pairs: Phrase[]): Exercise {
      return { id: `${prefix}-${suffix}`, kind: "match", prompt: L("Relie chaque expression au sens qui lui correspond.", "Match each expression to its meaning.", "Relaciona cada expresión con su significado."), hint, explanation: L("Vérifie la fréquence, l’action ou la relation exprimée par chaque groupe.", "Check the frequency, action or relationship expressed by each group.", "Comprueba la frecuencia, acción o relación de cada grupo."), model: pairs[0], pairs };
    },
  };
}
export function depthUnit(spec: Omit<Unit, "id" | "canDos">): Unit {
  return { ...spec, id: `u${String(spec.number).padStart(2, "0")}`, canDos: spec.goals };
}
export const isMandarinAssessment = (id: string) => id === "bilan" || id === "bilan-fondations";
export const mandarinRouteId = (id: string) => id === "bilan" ? "bilan-initial" : id === "bilan-fondations" ? "bilan" : id;
