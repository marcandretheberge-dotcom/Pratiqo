import { L, type Exercise, type Phrase } from "./types";
import { scrambleItalianItems } from "../italian/italianModuleLogic";
/** Audio-to-meaning replaces abstract picture guessing. Study comes first. Stable step counts
 * preserve old lesson positions, but this sequence is not four once-only image answers. */
export function preparationExercises(mission: number, phrases: Phrase[], language: string): Exercise[] {
  const plans = [
    ["hello", "name", "well", "tired", "how", "name", "thanks"],
    ["canada", "nationality", "local"],
    ["age28", "ask-age", "age20", "age28", "age21", "bye", "age30"],
  ];
  const pools = [
    ["hello", "name", "ask-name", "pleased", "how", "well", "soso", "tired", "thanks"],
    ["ask-origin", "canada", "local", "nationality", "name", "how"],
    ["ask-age", "bye", "ask-name", "ask-origin", "well"],
  ];
  return plans[mission].map((answer, i) => {
    const number = /^age\d+$/.test(answer), seed = `${language}:m${mission + 1}:recall:${i}`;
    const pool = number ? ["age20", "age21", "age28", "age30"] : pools[mission];
    const options = [answer, ...scrambleItalianItems(pool.filter(p => p !== answer && phrases.some(w => w.id === p)), seed).slice(0, 2)];
    return { id: `m${mission + 1}:recall:${i}`, kind: number ? "number" : "meaning", answer, options,
      prompt: number ? L("Quel âge entends-tu ?", "Which age do you hear?", "¿Qué edad escuchas?") : L("Écoute. Quel est le sens ?", "Listen. What does it mean?", "Escucha. ¿Qué significa?") };
  });
}
