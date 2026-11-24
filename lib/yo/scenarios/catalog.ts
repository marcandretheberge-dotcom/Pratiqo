import type { YoLocale } from "../types";

type Scenario = {
  id: string;
  language: string;
  unit: string;
  entry: string;
  label: Record<YoLocale, string>;
};

// Only playable scenarios belong here. Course access and mastery are independent.
export const scenarios: readonly Scenario[] = [{
  id: "it.bologna.train", language: "it", unit: "u01",
  entry: "/practice/it/bologna/index.html",
  label: { fr: "Prendre le train avec Yoppo", en: "Catch a train with Yoppo", es: "Tomar el tren con Yoppo" },
}, {
  id: "es.do.hotel", language: "es", unit: "do.module-2",
  entry: "/practice/es/hotel/index.html",
  label: { fr: "À la réception avec Yoppo", en: "Check in with Yoppo", es: "En recepción con Yoppo" },
}];

export function scenariosAt(language: string, unit: string) {
  return scenarios.filter(s => s.language === language && s.unit === unit);
}
