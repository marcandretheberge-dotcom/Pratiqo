import { L, type Concept, type Draft, type Exercise, type IntroCourse, type Phrase, type Text } from "./types";

export type IntroAnswerExplanation = {
  target: Phrase;
  chosen?: Phrase;
  concept?: Concept;
  guidance: Text;
  orderCorrection?: { position: number; expected: string; chosen: string };
};

const guidance: Record<Exercise["kind"], Text> = {
  listen: L(
    "Réécoute la phrase, puis compare son sens avec celui de ton choix.",
    "Listen to the phrase again, then compare its meaning with your choice.",
    "Escucha la frase otra vez y compara su significado con el de tu elección.",
  ),
  meaning: L(
    "La réponse doit donner le sens de la phrase. Compare les deux traductions.",
    "The answer should give the meaning of the phrase. Compare the two translations.",
    "La respuesta debe expresar el significado de la frase. Compara las dos traducciones.",
  ),
  number: L(
    "Repère l’âge annoncé dans la phrase. Réécoute le nombre, puis choisis l’âge correspondant.",
    "Notice the age stated in the phrase. Listen to the number again, then choose the matching age.",
    "Identifica la edad que dice la frase. Escucha el número otra vez y elige la edad correspondiente.",
  ),
  order: L(
    "Compare l’ordre de tes pièces avec le modèle. Touche une pièce de ta phrase pour la déplacer.",
    "Compare the order of your tiles with the model. Tap a tile in your sentence to move it.",
    "Compara el orden de tus piezas con el modelo. Toca una pieza de tu frase para moverla.",
  ),
  reply: L(
    "Relis la situation, puis compare ce que disent les réponses. Choisis celle qui répond à la demande.",
    "Read the situation again and compare what the replies mean. Choose the one that answers the request.",
    "Lee la situación otra vez y compara lo que dicen las respuestas. Elige la que responda a lo pedido.",
  ),
};

const cueGuidance: Record<string, Text> = {
  "ask-name": L("La personne demande un prénom. Réponds avec le prénom du personnage.", "The person asks for a first name. Answer with the character’s first name.", "La persona pregunta un nombre. Responde con el nombre del personaje."),
  how: L("La personne demande comment tu vas. Réponds avec une expression qui décrit ton état.", "The person asks how you are. Answer with an expression describing how you feel.", "La persona pregunta cómo estás. Responde con una expresión que describa cómo te sientes."),
  "ask-origin": L("La question porte sur le pays d’origine. La réponse indique d’où vient le personnage.", "The question asks about the country of origin. The reply says where the character is from.", "La pregunta trata del país de origen. La respuesta indica de dónde es el personaje."),
  "ask-age": L("La personne demande un âge. Utilise l’âge du personnage donné dans la situation.", "The person asks for an age. Use the character’s age given in the situation.", "La persona pregunta una edad. Usa la edad del personaje que aparece en la situación."),
};

/** Use the actual authored phrase/concept. This does not infer grammar from a wrong answer. */
export function introAnswerExplanation(course: IntroCourse, exercise: Exercise, draft: Pick<Draft, "selected" | "tiles">): IntroAnswerExplanation | null {
  const target = course.phrases.find(phrase => phrase.id === exercise.answer);
  if (!target) return null;
  const chosen = draft.selected && exercise.options.includes(draft.selected)
    ? course.phrases.find(phrase => phrase.id === draft.selected && phrase.id !== target.id)
    : undefined;
  const concept = course.missions.flatMap(mission => mission.concepts).find(item => item.examples.includes(target.id));
  const parts = target.parts ?? [];
  const wrongPosition = exercise.kind === "order" && draft.tiles.length === parts.length
    ? draft.tiles.findIndex((part, index) => part !== index)
    : -1;
  const orderCorrection = wrongPosition >= 0 && typeof parts[draft.tiles[wrongPosition]] === "string"
    ? { position: wrongPosition + 1, expected: parts[wrongPosition], chosen: parts[draft.tiles[wrongPosition]] }
    : undefined;
  return {
    target, ...(chosen ? { chosen } : {}), ...(concept ? { concept } : {}),
    guidance: exercise.kind === "reply" && exercise.cue && cueGuidance[exercise.cue]
      ? cueGuidance[exercise.cue] : guidance[exercise.kind],
    ...(orderCorrection ? { orderCorrection } : {}),
  };
}
