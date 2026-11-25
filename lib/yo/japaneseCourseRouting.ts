import { japaneseCourseUnits, japaneseLegacyCourseUnits, japaneseFinalAssessment, japaneseExtendedFinalAssessment } from "./japaneseCourse";
import type { JapaneseCourseUnit } from "./japaneseCourseTypes";
import { l } from "./japaneseDepthAuthoring";

/** Public slugs resolve to separate, stable stored assessment identities. */
export function resolveJapaneseCourseUnit(publicSlug: string): JapaneseCourseUnit | undefined {
  if (publicSlug !== "bilan" && publicSlug !== "bilan-initial") {
    return japaneseCourseUnits.find(unit => unit.slug === publicSlug);
  }
  const legacy = publicSlug === "bilan-initial";
  const last = legacy ? japaneseLegacyCourseUnits[7] : japaneseCourseUnits[11];
  return {
    ...last,
    id: legacy ? "jp-foundation-final" : "jp-foundations-extended-final",
    slug: legacy ? "bilan" : "bilan-fondations", number: legacy ? 9 : 13,
    title: legacy ? l("Une journée au Japon", "A day in Japan", "Un día en Japón") :
      l("Douze étapes, une mission écrite", "Twelve steps, one written mission", "Doce etapas, una misión escrita"),
    subtitle: legacy ? l("Ta mission de synthèse : combine les acquis des huit modules dans de nouvelles situations.", "Your synthesis mission: combine practice from the eight modules in new situations.", "Tu misión de síntesis: combina lo practicado en los ocho módulos en situaciones nuevas.") :
      l("Vingt-quatre défis nouveaux : lire précisément et formuler une réponse écrite à partir des douze modules.", "Twenty-four new challenges: read precisely and produce a written response using the twelve modules.", "Veinticuatro retos nuevos: leer con precisión y producir una respuesta escrita a partir de los doce módulos."),
    setting: legacy ? l("Présentation, rendez-vous, déplacement, commande et récit : un bilan interne pour identifier tes prochains objectifs.", "Introductions, meetings, directions, ordering and recounting: an internal review to identify your next goals.", "Presentaciones, citas, trayectos, pedidos y relatos: un balance interno para identificar tus próximos objetivos.") :
      l("Ce bilan vérifie seulement les lectures et les réponses écrites proposées. Il ne certifie ni écoute, ni prononciation, ni conversation libre. Les variantes kana/kanji prévues sont acceptées; les signes de ponctuation ne sont pas notés.", "This review checks only the reading and written responses offered. It does not certify listening, pronunciation or free conversation. Authored kana/kanji variants are accepted; punctuation is not graded.", "Este balance verifica solo las lecturas y respuestas escritas propuestas. No certifica escucha, pronunciación ni conversación libre. Se aceptan las variantes kana/kanji previstas; no se puntúa la puntuación."),
    goals: [
      l("Réutiliser les formes étudiées sans regarder les modèles.", "Reuse practised forms without looking at the models.", "Reutilizar las formas estudiadas sin mirar los modelos."),
      l("Repérer les situations qui demandent encore de la pratique.", "Identify situations that still need practice.", "Identificar situaciones que necesitan más práctica."),
      l("Préparer un échange et une production libre avec un professeur.", "Prepare for a conversation and free production with a teacher.", "Preparar una conversación y producción libre con un profesor."),
    ],
    activities: legacy ? japaneseFinalAssessment : japaneseExtendedFinalAssessment,
    roleplay: { title: last.roleplay.title, context: last.roleplay.context, turns: [] },
    kanji: [], kana: [],
  };
}
