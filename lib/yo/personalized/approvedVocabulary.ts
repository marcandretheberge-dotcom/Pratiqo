import type { VocabularyPicture, VisualWord } from "./types";
import { t } from "../italian/course/courseAuthoring";

/** Individual artwork regions from the founder-approved mockups, never whole UI screenshots. */
export const vocabularyArtwork = {
  meeting: { subject: "scene", file: "meeting", width: 343, height: 246, sha: "112031b8724c462ae9eb7557d6e3f63f344e88b6" },
  traveller: { subject: "person", file: "traveller", width: 343, height: 236, sha: "f4125efa669115b22827d046d493f683b9e304d3" },
  well: { subject: "person", file: "feeling-well", width: 343, height: 246, sha: "f1c5f98713a32908af60c5b8f1fdaa541ddce73d" },
  tired: { subject: "person", file: "feeling-tired", width: 339, height: 246, sha: "5f759472dada6bf1112bbf670613dbff38835918" },
  unsure: { subject: "person", file: "feeling-unsure", width: 343, height: 236, sha: "f459addf7d918d2c203b7493b3d36b80ac1f4314" },
  coffee: { subject: "object", file: "coffee", width: 343, height: 246, sha: "2f2030977d572ef5f0a3d3dc4b094940db8e781a" },
} as const;
export type VocabularyArtworkId = keyof typeof vocabularyArtwork;
export const artworkPath = (key: VocabularyArtworkId) => `/images/yo/vocabulary/v1/${vocabularyArtwork[key].file}.avif`;

/** Illustrations supply context; written fictional facts, not appearance, supply identity/age/origin. */
export function approvedPicture(p: VocabularyPicture): VocabularyPicture {
  if (p.kind === "object") return { ...p, label: "", detail: undefined, caption: undefined };
  if (p.kind === "feeling") {
    if (p.mood === "happy") return { ...p, artwork: "well", alt: t("Une personne souriante et détendue, qui se sent bien", "A smiling, relaxed person who feels well", "Una persona sonriente y relajada que se siente bien") };
    if (p.mood === "neutral") return { ...p, artwork: "unsure", alt: t("Une personne hésitante : ni très bien ni très mal", "An uncertain person: neither very well nor very unwell", "Una persona indecisa: ni muy bien ni muy mal") };
    return { ...p, artwork: "tired", alt: t("Une personne abattue, la tête appuyée sur la main", "A downcast person with their head resting on one hand", "Una persona decaída con la cabeza apoyada en una mano") };
  }
  // This was an ungraded distractor called 'asleep'. Preserve its stored option ID.
  // Coffee is an unambiguous non-feeling alternative; the smiling traveller was not.
  if (p.kind === "greeting" && p.time === "night") return { ...p, artwork: "coffee", label: "", alt: t("Une tasse de café sur une table", "A cup of coffee on a table", "Una taza de café sobre una mesa") };
  if (p.kind === "age") return { ...p, artwork: "unsure", caption: t("Âge du personnage", "Character’s age", "Edad del personaje") };
  if (p.kind === "profile") {
    const caption = p.detail === "NATIONALITY" ? t("Nationalité déclarée", "Stated nationality", "Nacionalidad declarada") : p.detail === "CITY" ? t("Ville d’origine", "City of origin", "Ciudad de origen") : t("Prénom", "First name", "Nombre");
    // Nationality and city alternatives share artwork: the stated fact is the evidence.
    const portraits = { nina: "well", luca: "tired", omar: "unsure", sara: "traveller" } as const;
    return { ...p, artwork: p.detail ? "traveller" : portraits[p.id as keyof typeof portraits] ?? "meeting", caption };
  }
  if (p.kind === "question") {
    const captions = {
      NOME: t("Prénom ?", "First name?", "¿Nombre?"),
      MAP: t("Origine ?", "Origin?", "¿Origen?"),
      AGE: t("Âge ?", "Age?", "¿Edad?"),
      FEELING: t("Comment ça va ?", "How are you?", "¿Cómo estás?"),
    };
    const caption = captions[p.detail as keyof typeof captions] ?? captions.NOME;
    const scenes = { NOME: "meeting", MAP: "traveller", AGE: "unsure", FEELING: "well" } as const;
    return { ...p, artwork: scenes[p.detail as keyof typeof scenes] ?? "meeting", caption, alt: t(`Une rencontre : on demande ${caption.fr.toLowerCase()}`, `A meeting: asking about ${caption.en.toLowerCase()}`, `Un encuentro: se pregunta ${caption.es.toLowerCase()}`) };
  }
  return { ...p, artwork: "meeting" };
}

/** Presentation-only projection: IDs, word order, audio text and correct targets are untouched. */
export function withApprovedArtwork(bank: Record<string, VisualWord[]>): Record<string, VisualWord[]> {
  return Object.fromEntries(Object.entries(bank).map(([lesson, words]) => [lesson, words.map(word => ({ ...word, choices: word.choices.map(approvedPicture) }))]));
}
