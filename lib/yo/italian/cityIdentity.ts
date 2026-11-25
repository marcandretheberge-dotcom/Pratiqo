import type { YoLocale } from "../types";

type Localized = Record<YoLocale, string>;
export type ItalianCityMotif =
  | "porticoes" | "baptistery" | "tower" | "arena"
  | "volcano" | "dome" | "piazza" | "canal"
  | "lighthouse" | "spire" | "amphitheatre" | "palace";

export type ItalianCityIdentity = {
  unitId: string;
  city: string;
  motif: ItalianCityMotif;
  /** A cultural visual motif, not a claim that the course has taught a fact. */
  inspiration: Localized;
  palette: { sky: string; earth: string; building: string; roof: string; accent: string; water: string };
};

/** Twelve distinct, original silhouettes linked to existing course IDs.
 * These are illustrated themes, not licensed landmark reproductions or exercises. */
export const ITALIAN_CITY_IDENTITIES: readonly ItalianCityIdentity[] = [
  { unitId: "u01", city: "Bologna", motif: "porticoes", inspiration: { fr: "Les portiques de Bologne", en: "Bologna's porticoes", es: "Los pórticos de Bolonia" },
    palette: { sky: "#DDECE4", earth: "#C9DBB8", building: "#C2775B", roof: "#985448", accent: "#EDCB83", water: "#9ABFB8" } },
  { unitId: "u02", city: "Parma", motif: "baptistery", inspiration: { fr: "Le baptistère de Parme", en: "Parma's baptistery", es: "El baptisterio de Parma" },
    palette: { sky: "#F4DFD4", earth: "#C5D2B0", building: "#CC9B84", roof: "#A76661", accent: "#F6D89C", water: "#B5C7BA" } },
  { unitId: "u03", city: "Modena", motif: "tower", inspiration: { fr: "Le clocher de Modène", en: "Modena's bell tower", es: "El campanario de Módena" },
    palette: { sky: "#DCE6EE", earth: "#B8D0C1", building: "#BDA58A", roof: "#7C6770", accent: "#EAC583", water: "#AACDD1" } },
  { unitId: "u04", city: "Verona", motif: "arena", inspiration: { fr: "Les arènes de Vérone", en: "Verona's arena", es: "La arena de Verona" },
    palette: { sky: "#F8E5D3", earth: "#C8D3AE", building: "#C9907A", roof: "#9D6358", accent: "#F2C987", water: "#A9C6B8" } },
  { unitId: "u05", city: "Napoli", motif: "volcano", inspiration: { fr: "Le Vésuve et la baie de Naples", en: "Vesuvius and the Bay of Naples", es: "El Vesubio y la bahía de Nápoles" },
    palette: { sky: "#D0E5EE", earth: "#CAD3B0", building: "#D29B76", roof: "#945B4E", accent: "#F6C77F", water: "#78B4C0" } },
  { unitId: "u06", city: "Firenze", motif: "dome", inspiration: { fr: "Le dôme de Florence", en: "Florence's cathedral dome", es: "La cúpula de Florencia" },
    palette: { sky: "#EBDDD1", earth: "#C5D0AD", building: "#D5B28E", roof: "#B76550", accent: "#EFC58A", water: "#9DBD9F" } },
  { unitId: "u07", city: "Siena", motif: "piazza", inspiration: { fr: "La Piazza del Campo à Sienne", en: "Siena's Piazza del Campo", es: "La Piazza del Campo de Siena" },
    palette: { sky: "#E9DFC8", earth: "#D4CFAF", building: "#BF8870", roof: "#91584D", accent: "#F6D58C", water: "#A1BDA9" } },
  { unitId: "u08", city: "Venezia", motif: "canal", inspiration: { fr: "Les canaux de Venise", en: "Venice's canals", es: "Los canales de Venecia" },
    palette: { sky: "#DBE9EE", earth: "#DBCFAD", building: "#B6A089", roof: "#8E726A", accent: "#EED5A4", water: "#77ACBC" } },
  { unitId: "u09", city: "Genova", motif: "lighthouse", inspiration: { fr: "La lanterne de Gênes", en: "Genoa's lighthouse", es: "El faro de Génova" },
    palette: { sky: "#D3E1E9", earth: "#BED4BC", building: "#BFA791", roof: "#766E73", accent: "#ECD38B", water: "#7AA9BC" } },
  { unitId: "u10", city: "Torino", motif: "spire", inspiration: { fr: "La Mole Antonelliana de Turin", en: "Turin's Mole Antonelliana", es: "La Mole Antonelliana de Turín" },
    palette: { sky: "#DDE1F0", earth: "#C0CFD2", building: "#C7B59B", roof: "#6D708E", accent: "#E8D7A3", water: "#A3C4CE" } },
  { unitId: "u11", city: "Roma", motif: "amphitheatre", inspiration: { fr: "Le Colisée de Rome", en: "Rome's Colosseum", es: "El Coliseo de Roma" },
    palette: { sky: "#F3E2D6", earth: "#D5C5AC", building: "#CBB095", roof: "#976C5A", accent: "#F2D292", water: "#ABC3B2" } },
  { unitId: "u12", city: "Palermo", motif: "palace", inspiration: { fr: "Les palais arabo-normands de Palerme", en: "Palermo's Arab-Norman palaces", es: "Los palacios árabe-normandos de Palermo" },
    palette: { sky: "#EBD8DE", earth: "#C9D0AB", building: "#C69B76", roof: "#986A72", accent: "#EACD82", water: "#8DC3BF" } },
] as const;

const identities = new Map(ITALIAN_CITY_IDENTITIES.map(item => [item.unitId, item]));
export function italianCityIdentity(unitId: string): ItalianCityIdentity | undefined {
  return identities.get(unitId);
}
